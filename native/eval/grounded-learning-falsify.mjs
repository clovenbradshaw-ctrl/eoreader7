// Bounded falsification assay: actual existing organs, no models, synthetic tasks.
// Run: node native/eval/grounded-learning-falsify.mjs > <report.json>
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { deposit, routeOrderFor, trailWeight } from '../kernel/stigmergy.js';
import { indexDocuments, ask } from '../organs/territory.js';
import { emptyForecast, observe, forecast, forecastKey } from '../the-fold/forecast.js';
import { createRecursiveReader } from '../kernel/reading.js';
import { createPriorConditionedReader } from '../kernel/experienced-reading.js';
import { deriveExperiencePrior } from '../kernel/experience-priors.js';
import { createCausalTextPerceiver, textEncounters } from '../adapters/text/recursive.js';
import { reviseTextFold } from '../adapters/text/revision.js';
const NOW = Date.parse('2026-10-03T19:10:00Z');
const hash = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const routes = ['catalog', 'archive'];
const head = 'record';
// Training and held-out queries have disjoint identifiers and literal documents.
function task(id, location, distractor = false) {
  const q = `record item${id}`;
  const answer = `record item${id} VERIFIED value${id}`;
  const make = r => indexDocuments([{ name: `${r}/${id}`, text:
    r === location ? answer : distractor ? `record item${id} UNVERIFIED bogus${id}` : `unrelated other${id}` }]);
  return { q, answer, indexes: Object.fromEntries(routes.map(r => [r, make(r)])) };
}
function run(t, memory, verify, learn) {
  let attempts = 0, correct = false, accepted = false;
  for (const route of routeOrderFor(memory, head, { routes, now: NOW, explore: 0 })) {
    attempts++;
    const index = t.indexes[route], result = ask(index, t.q, 1);
    const text = result.hits.length ? index.documents[result.hits[0].n].text : null;
    const right = text === t.answer;
    const ok = verify ? right : Boolean(text);
    if (learn) memory = deposit(memory, { head, route, ok, ms: 1, at: NOW });
    if (ok) { accepted = true; correct = right; break; }
  }
  return { attempts, correct, falseAdmission: accepted && !correct, memory };
}
let trained = {};
const train = Array.from({ length: 24 }, (_, i) => task(i, 'archive'));
for (const t of train) trained = run(t, trained, true, true).memory;
// Serialized memory, loaded by a genuinely separate process. This is harness
// persistence, not a claim that production persists trails automatically.
const serialized = JSON.stringify(trained);
const reloaded = spawnSync(process.execPath, ['--input-type=module', '-e',
  "let s='';for await(const c of process.stdin)s+=c;process.stdout.write(JSON.stringify(JSON.parse(s)))"],
  { input: serialized, encoding: 'utf8' });
assert.equal(reloaded.status, 0);
const restarted = JSON.parse(reloaded.stdout);
function batch(tasks, memory, verify = true) {
  const rows = tasks.map(t => run(t, memory, verify, false));
  return { tasks: rows.length, correct: rows.filter(r => r.correct).length,
    falseAdmissions: rows.filter(r => r.falseAdmission).length,
    meanAttempts: rows.reduce((s, r) => s + r.attempts, 0) / rows.length };
}
const stable = Array.from({ length: 40 }, (_, i) => task(i + 100, 'archive'));
const shifted = Array.from({ length: 40 }, (_, i) => task(i + 200, 'catalog'));
const poisoned = Array.from({ length: 40 }, (_, i) => task(i + 300, 'catalog', true));
const routeResults = {
  stable: { fresh: batch(stable, {}), experienced: batch(stable, trained),
    disabled: batch(stable, {}), restart: batch(stable, restarted),
    removedHead: batch(stable, { ...trained, [head]: [] }) },
  shift: { fresh: batch(shifted, {}), experienced: batch(shifted, trained) },
  misleadingHit: { fresh: batch(poisoned, {}, false), experienced: batch(poisoned, trained, false),
    independentlyVerified: batch(poisoned, trained, true) },
};
// Failure-directed recovery is measured online, without pretending that initial
// shift damage vanishes. Every observed failure remains in the measured sequence.
let adapting = trained; const adaptRows = [];
for (const t of shifted) { const r = run(t, adapting, true, true); adaptRows.push(r); adapting = r.memory; }
routeResults.onlineShift = { meanAttempts: adaptRows.reduce((s,r) => s+r.attempts,0)/adaptRows.length,
  firstAttemptCosts: adaptRows.slice(0,5).map(r=>r.attempts), finalOrder: routeOrderFor(adapting, head, {routes,now:NOW,explore:0}) };
routeResults.halfLife = { declaredDays: 7, measuredRemainingWeight: trailWeight(NOW-7*86400000,NOW), expectedHalf: .5 };
// Actual Python candidates/tests, no model. Same forecast key hides a material
// difficulty change. Score BEFORE observing each held-out result.
const key = forecastKey({ op: 'SYN', language: 'python', syntax: 'checked' });
function pythonTrial(i, passes) {
  const code = `def candidate(x):\n    return x ${passes ? '+' : '-'} 1\nassert candidate(${i}) == ${i+1}\n`;
  const p = spawnSync('python3', ['-c', code], { encoding: 'utf8', timeout: 5000 });
  if (p.error || p.status === null) throw p.error ?? new Error('Python did not finish');
  return { success: p.status === 0, codeHash: hash(code) };
}
const forecastTraining = Array.from({length:40},(_,i)=>pythonTrial(i,i%10!==0));
let learnedForecast = emptyForecast();
for(const r of forecastTraining) learnedForecast = observe(learnedForecast,key,r.success);
function scoreForecast(trials, prior) {
  const p = forecast(prior,key).p;
  return { trials: trials.length, probability: p, actualSuccessRate: trials.filter(r=>r.success).length/trials.length,
    brier: trials.reduce((s,r)=>s+(p-Number(r.success))**2,0)/trials.length };
}
const stableCode = Array.from({length:40},(_,i)=>pythonTrial(i+100,i%10!==0));
const shiftedCode = Array.from({length:40},(_,i)=>pythonTrial(i+200,i%10===0));
const forecasting = { training: {trials:40,greens:36}, stable: {
  fresh:scoreForecast(stableCode,emptyForecast()), experienced:scoreForecast(stableCode,learnedForecast)},
  shifted:{fresh:scoreForecast(shiftedCode,emptyForecast()),experienced:scoreForecast(shiftedCode,learnedForecast)},
  limits:'Prediction changes; candidate generation and test pass count are identical across arms.' };
// Complete short English synthetic works, not sliced novels. The causal reader
// and its received POS prior are exactly the assembly used by experienced-new-book.
const posPrior = JSON.parse(fs.readFileSync(new URL('../../cli/priors/pos-prior-en.json',import.meta.url),'utf8'));
const adapters = { revise: args => reviseTextFold({...args,canonicalizationFloor:2}),
  retrieve: (_fold,evidence) => ({schema:'EORelevantFold@1',witnessed:[...evidence],provisional:[],expectations:[],obligations:[],exclusions:[],unresolvedAlternatives:[],activeFrames:[],receivedPriors:[]}) };
const options = () => ({perceivers:[createCausalTextPerceiver({minRelationSurfaces:2,posPrior,descriptorAnchoring:{minActivation:.05,minMargin:.2}})],adapters});
const story = (a,b,c) => `${a} visited ${b}. ${b} helped ${c}. ${c} visited ${a}. ${a} helped ${c}. ${b} visited ${c}. ${c} helped ${a}.`;
async function read(text,source,priors=[]) {
  const reader = priors.length ? createPriorConditionedReader({...options(),priors}) : createRecursiveReader(options());
  for(const enc of textEncounters(text,{source})) await reader.step(enc);
  return {fold:reader.getFold(),log:reader.getLog()};
}
const priorWorks=[];
for(const [i,names] of [['one',['Alice','Boris','Clara']],['two',['David','Elena','Frank']]]) {
  const source=`synthetic:${i}`;priorWorks.push({source,reading:await read(story(...names),source)});
}
const experience = deriveExperiencePrior(priorWorks,{giver:'assay:grounded-learning-falsify'});
const targetText=story('Grace','Henry','Irene'),targetSource='synthetic:held-out';
const cold = await read(targetText,targetSource), warm = await read(targetText,targetSource,[experience]);
const ablated = await read(targetText,targetSource);
function readingSignature(r) {
  const entries = r.fold.graphEntries??[];
  return {graphEntries:entries.length,relations:entries.filter(e=>e.schema==='EOHyperedge@1').length,graphHash:hash(entries)};
}
const reading = {assembly:'native causal text perceiver + recursive reader; experienced-new-book adapters',
  priorsInjected:['pos-prior-en', 'EOExperiencePrior@1 (experienced arm only)'],
  material:'three complete synthetic six-sentence English works; no novel claim',truncated:false,
  stagesNotRun:['constitutional HOST stage-parity assay','human semantic accuracy adjudication'],
  trainingSources:experience.sourceRefs,targetSource,targetHash:hash(targetText),
  learnedRelationForms:experience.relationVocabulary.length,
  fresh:readingSignature(cold),experienced:readingSignature(warm),disabled:readingSignature(ablated),
  memoryIsWitness:experience.witnessed, memoryAdmissible:experience.admissible};
assert.equal(routeResults.stable.experienced.correct,40);
assert.equal(routeResults.stable.experienced.meanAttempts,1);
assert.equal(routeResults.stable.fresh.meanAttempts,2);
assert.deepEqual(routeResults.stable.restart,routeResults.stable.experienced);
assert.equal(routeResults.misleadingHit.experienced.falseAdmissions,40);
assert.equal(routeResults.misleadingHit.independentlyVerified.falseAdmissions,0);
assert.equal(routeResults.shift.experienced.meanAttempts,2);
assert.equal(routeResults.shift.fresh.meanAttempts,1);
assert.ok(forecasting.stable.experienced.brier < forecasting.stable.fresh.brier);
assert.ok(forecasting.shifted.experienced.brier > forecasting.shifted.fresh.brier);
assert.ok(reading.learnedRelationForms > 0, 'reading treatment must carry actual learned forms');
assert.ok(reading.fresh.relations > 0, 'reading comparison must not be empty');
assert.equal(reading.memoryIsWitness,false);
assert.equal(reading.memoryAdmissible,false);
assert.deepEqual(reading.fresh,reading.disabled);
const report = {schema:'EOGroundedLearningFalsification@1',seed:'deterministic fixtures, exploration disabled',
  models:{frontierCalls:0,localCalls:0,weightsChanged:false},
  scope:'Mechanism-level synthetic assay, not an end-to-end intelligence benchmark. Route latency is not measured; attempts are measured. Forecast has no deployment decision gate.',
  evidence:{trainingTaskHashes:train.map(hash),heldOutTaskHashes:[...stable,...shifted,...poisoned].map(hash),
    pythonTraining:forecastTraining,pythonHeldOut:[...stableCode,...shiftedCode],trailHash:hash(trained)},
  routes:routeResults,forecasting,reading};
console.log(JSON.stringify(report,null,2));
