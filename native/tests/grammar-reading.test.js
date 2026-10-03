import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readMaterial} from '../reading/material.js';
import {reconstruct} from '../kernel/fold.js';
import {readingIndexFromLog,mentionBookFromLog} from '../the-fold/reading-log.js';
import {diaNorm,namesCorefer} from '../adapters/text/surfaces.js';
import {computeDocumentHolograph} from '../eval/the-fold/lib/document-holograph.mjs';
const organs={reconstruct,diaNorm,namesCorefer};
const read=(text,language,source='fixture')=>readMaterial({text,language,source,format:'raw'});
test('known languages meet the same witness/Fold contract; partial grammars disclose their limit',async()=>{
 for(const [language,text]of Object.entries({english:'The cat eats a fish.',python:'def solve(text):\n    return text.split()\n',javascript:'function solve(text) { return text.split(" "); }',math:'8 + 11 = 19',json:'{"hello":[1,2]}',c:'int hello(int x) { return x; }',go:'func hello(x int) int { return x }',typescript:'function hello(x: number): number {return x;}',tsx:'function hello() {return <b/>;}',jsx:'function hello() {return <b/>;}'})){
  const r=await read(text,language);assert.ok(r.referents.length,language);assert.ok(r.tuples.length,language);
  const fold=reconstruct(r.readingEntries);assert.equal(fold.graphEntries.filter(e=>e.schema==='EOReferent@1').length,r.referents.length);
  for(const t of r.tuples)for(const s of t.spans)assert.equal(text.slice(s.start,s.end),s.text);
  if(['c','go','typescript','tsx','jsx'].includes(language))assert.ok(r.gaps.some(g=>g.includes('partial_grammar')));
 }
});
test('grammatical identity is scoped and case-sensitive through holograph address projection',async()=>{
 const a=await read('function solve(Foo) {return Foo;}','javascript','a');
 const b=await read('function solve(foo) {return foo;}','javascript','b');
 const log=[...a.readingEntries,...b.readingEntries];const index=readingIndexFromLog(log,organs);
 assert.equal(index.referents.size,a.referents.length+b.referents.length);
 assert.equal(index.resolve('solve').size,4);
 assert.ok([...index.resolve('Foo')].every(id=>a.referents.some(r=>r.id===id)));
 assert.equal(index.resolve('FOO').size,0);
 const book=mentionBookFromLog(log,organs);for(const row of book.sentences)assert.ok([...row.ids].every(id=>(row.source==='a'?a:b).referents.some(r=>r.id===id)));
 const h=computeDocumentHolograph({question:'solve',readingEntries:log,notes:[...a.tuples,...b.tuples],sources:{a:'function solve(Foo) {return Foo;}',b:'function solve(foo) {return foo;}'},organs});
 assert.equal(h.basis,'constitutional_reading');assert.ok(h.addressChecks.groundingPassagesExact>0);
});
test('mixed model output keeps code, equations, and short outputs at original source coordinates',async()=>{
 const text='Model says yes.\n```python\ndef Διαβάζω(text):\n    return text.split()\n```\n-9 - 4 = 3\n';
 const r=await readMaterial({text,source:'model'});assert.deepEqual(r.grammarRecords.map(x=>x.grammar),['english','python','math']);
 for(const ref of r.referents)for(const p of ref.provenance)assert.equal(text.slice(p.start,p.end),p.text);
 assert.equal(r.grammarRecords.at(-1).verification.status,'contradicted');
 assert.ok(r.tuples.some(t=>t.label==='equals'&&t.verification.status==='contradicted'));
 assert.ok(r.tuples.filter(t=>t.frame.grammar==='math'&&t.label!=='equals').every(t=>t.verification.status==='not_checked'));
 assert.equal(mentionBookFromLog(r.readingEntries,organs).sentences.length,3);
 const short=await read('19','math');assert.equal(mentionBookFromLog(short.readingEntries,organs).sentences[0].text,'19');
});
test('source parsing never executes code, and unsupported or broken grammars remain gaps',async()=>{
 const sentinel='/tmp/eoreader-grammar-must-not-execute';fs.rmSync(sentinel,{force:true});
 const r=await read(`open(${JSON.stringify(sentinel)}, "w").write("bad")`,'python');assert.ok(r.tuples.length);assert.equal(fs.existsSync(sentinel),false);
 for(const [text,language,gap]of [['def (','python','grammar_syntax_error'],['function {','javascript','grammar_syntax_error'],['some words','klingon','grammar_unavailable']]){
  const x=await read(text,language);assert.equal(x.referents.length,0);assert.ok(x.gaps.some(g=>g.startsWith(gap)));
 }
 const unknown=await read('f(1) = 2','math');assert.equal(unknown.grammarRecords[0].verification.status,'not_checked');
 const exact=await read('0.1 + 0.2 = 0.3','math');assert.equal(exact.grammarRecords[0].verification.status,'verified');
});
test('wrong and right CPU proposals preserve their distinguishing call structure',async()=>{
 const wrong=await read('def solve(text):\n    return sum(int(char) for char in text if char.isalnum())','python');
 const right=await read('def solve(text):\n    return sum(int(x) for x in text.split())','python');
 assert.ok(wrong.referents.some(r=>r.surfaces.some(s=>s.includes('isalnum'))));assert.ok(right.referents.some(r=>r.surfaces.some(s=>s.includes('split'))));
 assert.ok(right.tuples.some(t=>t.label==='returns_expression'));assert.ok(right.tuples.every(t=>t.verification.status==='not_checked'));
});

test('every received natural-language prior shares the Fold while preserving lexical ambiguity',async()=>{
 for(const language of ['fra','tur','cmn','fin','heb','fas','lat','grc','arb','ell','spa','san','kor','rus','jpn']){
  const r=await read('α β γ',language);assert.equal(r.referents.length,4);assert.ok(r.gaps.some(g=>g.includes('partial_grammar')));
  assert.ok(r.referents.slice(1).every(ref=>ref.annotations.standing==='unattested'||ref.annotations.uposDistribution));
 }
 const french=await read('le chat mange','fra');assert.ok(french.referents.some(r=>r.annotations.uposDistribution?.DET));
 const incomplete=await readMaterial({text:'```python\ndef solve(x):\n    return x',source:'incomplete'});
 assert.ok(incomplete.gaps.includes('unclosed_code_fence'));assert.equal(incomplete.grammarRecords[0].grammar,'python');
});

test('Japanese received morphology retains its distinct giver and attested verb distribution',async()=>{
 const r=await read('会う','japanese');const word=r.referents.find(x=>x.kind==='TokenOccurrence');
 assert.equal(word.annotations.uposDistribution.VERB,1);assert.ok(word.provenance[0].giver.includes('UniMorph'));
});
