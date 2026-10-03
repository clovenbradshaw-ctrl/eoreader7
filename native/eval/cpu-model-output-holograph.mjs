// Read the ACTUAL CPU model output, then keep testimony and execution evidence
// separate. No extra generation, no handwritten replacement reading.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRecursiveReader} from '../kernel/reading.js';
import {reconstruct} from '../kernel/fold.js';
import {createCausalTextPerceiver,textEncounters,surfaceIndex,surfacesIn} from '../adapters/text/recursive.js';
import {reviseTextFold} from '../adapters/text/revision.js';
import {diaNorm,namesCorefer} from '../adapters/text/surfaces.js';
import {splitSentences} from '../adapters/text/spans.js';
import {computeDocumentHolograph} from './the-fold/lib/document-holograph.mjs';
import {createPropositionHolograph,captureProposition,settleAtoms,foldAtom} from '../the-fold/proposition-holograph.js';
import {holographType} from '../organs/output-holograph.js';
const input=new URL('./results/cpu-llm-learning-falsify.json',import.meta.url);
const bytes=fs.readFileSync(input),experiment=JSON.parse(bytes);
const sha=s=>createHash('sha256').update(s).digest('hex');
const posPrior=JSON.parse(fs.readFileSync(new URL('../../cli/priors/pos-prior-en.json',import.meta.url),'utf8'));
const h=createPropositionHolograph(), outputs=[], persisted=[];
for(const [i,g] of experiment.generations.entries()) {
 const source=`cpu-model:SmolLM2-135M/generation-${i}`,text=g.text;
 const reader=createRecursiveReader({perceivers:[createCausalTextPerceiver({minRelationSurfaces:2,posPrior})],
  adapters:{revise:a=>reviseTextFold({...a,canonicalizationFloor:2})}});
 for(const enc of textEncounters(text,{source}))await reader.step(enc);
 const log=reader.getLog(),entries=reader.getFold().graphEntries??[];
 persisted.push({source,sourceHash:sha(text),sourceText:text,readingEntries:log});
 const encounters=log.filter(e=>e.schema==='Encounter@1');
 const checks=encounters.map(e=>({start:e.anchor.start,end:e.anchor.end,
  utf8Start:Buffer.byteLength(text.slice(0,e.anchor.start)),utf8End:Buffer.byteLength(text.slice(0,e.anchor.end)),
  exact:text.slice(e.anchor.start,e.anchor.end)===e.material}));
 assert.ok(checks.length>0 && checks.every(c=>c.exact));
 const edges=entries.filter(e=>e.schema==='EOHyperedge@1');
 const notes=edges.map(e=>{
  const enc=encounters.find(c=>c.sequencePosition===e.scope?.sequencePosition);
  if(!enc)return null;
  const at=`${source}#${enc.anchor.start}-${enc.anchor.end}`;
  return {end1:e.participants?.[0]?.surface??'',label:e.relation,end2:e.participants?.[1]?.surface??'',
   witnesses:[at],spans:[{at,text:enc.material}],source,standing:'model_testimony_only',edgeId:e.id};
 }).filter(Boolean);
 const query='What does the model say about the function and the integer answer?';
 const document=computeDocumentHolograph({question:query,readingEntries:log,notes,sources:{[source]:text},
  organs:{reconstruct,diaNorm,namesCorefer,surfaceIndex,surfacesIn}});
 const sentenceRows=[];
 for(const sentence of splitSentences(text)) {
  const unit={...sentence,start:sentence.offset,end:sentence.offset+sentence.text.length};
  assert.equal(text.slice(unit.start,unit.end),unit.text);
  const at=`${source}#${unit.start}-${unit.end}`;
  const atom=captureProposition(h,unit.text,{activation:g.prompt,groundFacts:[],giver:source,
   frame:{source,model:experiment.model,scope:'model utterance; external truth not inferred'},placement:source});
  atom.receipt={source,start:unit.start,end:unit.end,utf8Start:Buffer.byteLength(text.slice(0,unit.start)),utf8End:Buffer.byteLength(text.slice(0,unit.end)),sha256:sha(unit.text),at};
  // Settling a code atom is explicitly bounded to the executable task. The
  // model's prose surrounding it does not inherit that acceptance.
  let adjudication={status:'unverified_model_testimony',gap:'external_claim_not_checked'};
  const proposal=experiment.proposals.find(p=>p.raw===text);
  if(proposal?.code && unit.text.includes(proposal.code.trim())) {
   const validated=[...(proposal.training??[]),...(proposal.validation??[])].every(r=>r.pass);
   const transfer=experiment.heldout.learnedProcedure??[];
   if(validated && transfer.length===8 && transfer.every(r=>r.pass)) {
    const context='executable-task:whitespace-separated-signed-integer-sum';
    settleAtoms(h,{accept:[atom.id],context,specimen:'independent Python tests: 2 training, 4 validation, 8 withheld'});
    adjudication={status:'accepted_in_executable_task_scope',context,evidence:`cpu-llm-learning-falsify.json#/proposals/${experiment.proposals.indexOf(proposal)}`,
     transferEvidence:'cpu-llm-learning-falsify.json#/heldout/learnedProcedure',evidenceHash:sha(bytes),tests:14,
     standing:foldAtom(atom,{context})};
   }
  }
  atom.adjudication=adjudication;
  sentenceRows.push({atomId:atom.id,text:unit.text,receipt:atom.receipt,typing:atom.typing,adjudication});
 }
 const facing=holographType({prose:text,ground:[],splitSentences,source});
 assert.equal(facing.verdict.material,0,'a model utterance must not corroborate itself');
 outputs.push({source,text,sourceHash:sha(text),prompt:g.prompt,encounters:encounters.length,
  byteChecks:checks,referents:entries.filter(e=>e.schema==='EOReferent@1').length,
  relationCount:edges.length,relations:notes,documentHolograph:document,propositions:sentenceRows,outputTyping:facing});
}
const report={schema:'EOCPUModelOutputHolograph@1',model:experiment.model,experimentHash:sha(bytes),
 assembly:'native causal recursive text reader -> reading-log projection -> computeDocumentHolograph; proposition-holograph + output-holograph',
 priorsInjected:['cli/priors/pos-prior-en.json'],corefPrior:null,modelCalls:0,truncated:false,
 stagesNotRun:['constitutional HOST stage-parity assay','proposition chase/equation to independently read record','general code-semantics verification','production Heimdall integration'],
 distinction:'Model output bytes witness what the model said. They cannot independently witness the truth of its claim. Code acceptance is separately scoped and tied to prior execution evidence.',
 summary:{outputs:outputs.length,encounters:outputs.reduce((s,o)=>s+o.encounters,0),
  exactAnchors:outputs.reduce((s,o)=>s+o.byteChecks.filter(c=>c.exact).length,0),atoms:h.atoms.length,
  extractedRelations:outputs.reduce((s,o)=>s+o.relationCount,0),
  unresolvedQueries:outputs.filter(o=>o.documentHolograph.gap==='question_unresolved').length,
  scopedAcceptedCodeAtoms:h.atoms.filter(a=>a.adjudication.status==='accepted_in_executable_task_scope').length},
 outputs,atoms:h.atoms};
assert.equal(outputs.length,experiment.generations.length);
assert.equal(report.summary.scopedAcceptedCodeAtoms,1);
fs.writeFileSync(new URL('./results/cpu-model-output-reading.jsonl',import.meta.url),persisted.map(x=>JSON.stringify(x)).join('\n')+'\n');
console.log(JSON.stringify(report,null,2));
