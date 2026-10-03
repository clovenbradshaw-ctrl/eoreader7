// Real CPU output bytes, real shared reading pipeline, real holograph. No draws.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {nativeRegistry,GRAMMAR} from '../assemblies.js';
import {stampResult} from '../kernel/assembly.js';
import {readMaterial} from '../reading/material.js';
import {reconstruct} from '../kernel/fold.js';
import {diaNorm,namesCorefer} from '../adapters/text/surfaces.js';
import {computeDocumentHolograph} from './the-fold/lib/document-holograph.mjs';
const experiment=JSON.parse(fs.readFileSync(new URL('./results/cpu-llm-learning-falsify.json',import.meta.url),'utf8'));
const outputs=[];
for(const [i,g]of experiment.generations.entries()){
 const source=`cpu-model:SmolLM2/generation-${i}`,r=await readMaterial({text:g.text,source});
 for(const t of r.tuples)for(const s of t.spans)assert.equal(g.text.slice(s.start,s.end),s.text);
 const question=i<2?'solve':r.referents.find(n=>n.kind!=='Document')?.surfaces[0]??g.text;
 const holograph=computeDocumentHolograph({question,readingEntries:r.readingEntries,notes:r.tuples,sources:{[source]:g.text},organs:{reconstruct,diaNorm,namesCorefer}});
 assert.equal(holograph.basis,'constitutional_reading');
 outputs.push({source,text:g.text,referents:r.referents.length,tuples:r.tuples.length,grammars:r.grammarRecords.map(x=>x.grammar),verification:r.grammarRecords.map(x=>x.verification).filter(Boolean),gaps:r.gaps,holograph,readingEntries:r.readingEntries});
}
assert.equal(outputs[3].verification[0].status,'contradicted');
assert.equal(outputs[4].verification[0].status,'verified');
const report={schema:'EOGrammarModelOutput@1',modelCalls:0,assemblyDescription:'shared readMaterial -> native recursive kernel -> reading-log holograph; same reader as POST /v1/read',
 summary:{outputs:outputs.length,referents:outputs.reduce((n,o)=>n+o.referents,0),tuples:outputs.reduce((n,o)=>n+o.tuples,0),holographsResolved:outputs.filter(o=>o.holograph.basis==='constitutional_reading').length},
 limits:['syntax occurrence identity; full lexical binding not implemented','grammar parsing does not certify code behavior or model testimony','numeric verification only within bounded rational arithmetic','partial natural-language and code grammars disclosed'],outputs};
fs.writeFileSync(new URL('./results/grammar-model-output.json',import.meta.url),JSON.stringify(stampResult(nativeRegistry(),report,GRAMMAR.id),null,2)+'\n');console.log(JSON.stringify(report.summary));
