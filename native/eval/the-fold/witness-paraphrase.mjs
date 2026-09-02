// eval/witness-paraphrase.mjs — how strict is the sentence witness on
// PARAPHRASE, measured before anyone decides what it should accept.
//
// The question (the-fold CLAUDE.md, "the sentence witness", 2026-09-02):
// live on gemma2:2b the witness said NO to "Kutuzov replaced Barclay de
// Tolly as commander" against the passage's own "the Tsar replaced the
// unpopular Barclay de Tolly with Mikhail Kutuzov" — a role-reversed
// paraphrase that IS entailed. Whether a witness should accept that
// entailment is a real question; this driver measures what the shipped
// protocol does across a battery of paraphrase SHAPES, with the truth of
// each item fixed here before the run, so the answer is a number and not
// an impression from one specimen.
//
// Material: the Borodino excerpt (the readable face of the committed
// Wikipedia fixture, first ~9KB), as the-fold's own live turn used it.
// Protocol: witness-sentences.js's own path — witnessNote, SELECT with the
// same-index arm, generate as the fallback — exactly the production
// wiring (app.js::witnessTestimony, morphology folded into the company
// wall). Ends are DECLARED per item, the two ends a bound claim would have
// carried; the crude longest-words fallback is measured as a second arm
// (ENDS=fallback) because in production most asked sentences reach the
// witness without a claim.
//
// Truth is one of: ENTAILED (the passage states it, in some arrangement)
// or FALSE (the passage states otherwise, or a filler is swapped). The
// shapes: verbatim, passive, role-reversed (agent demoted or promoted),
// synonym verb, rearranged adjunct — each with its FALSE twin where one
// exists, so the precision guard is not a separate list but the same
// shapes with a swapped end. The II.23 control is built in: a witness
// that says yes to everything scores 8/8 recall and 0/8 precision, one
// that says no to everything scores the reverse; only the JOINT reading
// says anything.
//
// PREDICTIONS, fixed before the first run (gemma2:2b, declared ends):
//   verbatim/near-verbatim (2, 15)       -> states
//   passive (3, 7)                       -> states
//   role-reversed (1, 11)                -> refused  (the live specimen)
//   synonym verb (10, 13)                -> mixed
//   every FALSE item                     -> refused or skipped, never states
// A FALSE item read `states` is a LIE and is the headline whatever else
// happens; a low ENTAILED rate is the strictness cost, priced not fixed.
//
// Two instruments (MODELS=gemma2:2b,llama3.2:latest): a strictness that
// one model shows and the other does not is a fact about that model, not
// about the protocol.
import { readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const T = await import(`${NATIVE}/organs/index.js`);
const { witnessSentences, endsFor } = await import(`${NATIVE}/organs/witness-sentences.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}/adapters/text/morphology.js`);

const OLLAMA = "http://localhost:11434";
const MODELS = (process.env.MODELS ?? "gemma2:2b").split(",");
const ENDS = process.env.ENDS ?? "declared"; // declared | fallback
const text = readFileSync(`${NATIVE}/eval/the-fold/fixtures/borodino-excerpt.txt`, "utf8");
const prior = morphologyFromPrior(JSON.parse(readFileSync(`${NATIVE}/eval/the-fold/fixtures/unimorph-morphology-prior.json`, "utf8")));
const sameForm = createLemmatizer(prior.forms, { language: prior.language }).sameAct;

// [id, sentence, truth, shape, end1, end2]
export const BATTERY = [
  [1, "Kutuzov replaced Barclay de Tolly as commander.", "ENTAILED", "role-reversed", "Kutuzov", "Barclay de Tolly"],
  [2, "The Tsar replaced Barclay de Tolly with Kutuzov.", "ENTAILED", "near-verbatim", "Tsar", "Kutuzov"],
  [3, "Barclay de Tolly was replaced by Kutuzov.", "ENTAILED", "passive", "Barclay de Tolly", "Kutuzov"],
  [4, "Barclay de Tolly replaced Kutuzov as commander.", "FALSE", "role-reversed-false", "Barclay de Tolly", "Kutuzov"],
  [5, "Kutuzov was replaced by Barclay de Tolly.", "FALSE", "passive-false", "Kutuzov", "Barclay de Tolly"],
  [6, "Napoleon crossed the Niemen river in June 1812.", "ENTAILED", "rearranged", "Napoleon", "Niemen"],
  [7, "The Niemen was crossed by Napoleon's army at the start of the invasion.", "ENTAILED", "passive", "Niemen", "Napoleon"],
  [8, "Napoleon crossed the Dnieper river in June 1812.", "FALSE", "swapped-object", "Napoleon", "Dnieper"],
  [9, "The Russians captured the Shevardino redoubt.", "FALSE", "swapped-agent", "Russians", "redoubt"],
  [10, "The French took the redoubt at Shevardino.", "ENTAILED", "synonym-verb", "French", "redoubt"],
  [11, "The Russian army retreated south after the battle.", "ENTAILED", "role-reversed", "Russian", "retreated"],
  [12, "The Russian army continued to fight after the battle.", "FALSE", "unheard-verb", "Russian", "fight"],
  [13, "Kutuzov built a defensive line at Borodino.", "ENTAILED", "synonym-verb", "Kutuzov", "Borodino"],
  [14, "Napoleon built a defensive line at Borodino.", "FALSE", "swapped-agent", "Napoleon", "Borodino"],
  [15, "Alexander I appointed Kutuzov on 29 August.", "ENTAILED", "rearranged", "Alexander", "Kutuzov"],
  [16, "Alexander I appointed Barclay de Tolly on 29 August.", "FALSE", "swapped-object", "Alexander", "Barclay de Tolly"],
];

let calls = 0;
function organsFor(model) {
  const chat = async (messages, schema) => {
    calls += 1;
    const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) });
    return (await res.json())?.message?.content ?? "";
  };
  const ask = async (s, slice) => T.readTestimony(await chat(T.buildWitnessMessages(s, slice), T.WITNESS_SCHEMA));
  const selectAsk = async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } };
  const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect, sameForm };
  return { ask, selectAsk, testimony, splitSentences };
}

const passages = [{ text }];
for (const model of MODELS) {
  calls = 0; const t0 = Date.now();
  const organs = organsFor(model);
  const rows = [];
  for (const [id, sentence, truth, shape, e1, e2] of BATTERY) {
    // declared ends ride as a pseudo-claim so witnessSentences takes them from endsFor; fallback = no claim
    const claims = ENDS === "declared" ? [{ sentence, end1: e1, end2: e2, verdict: "unbound" }] : [];
    const r = await witnessSentences([sentence], claims, passages, { ...organs, maxAsks: 1 });
    const row = r.rows[0];
    const ends = endsFor(sentence, claims);
    rows.push({ id, truth, shape, sentence, witness: row.witness, why: row.why ?? null, via: row.via ?? null, decider: row.decider ?? null, ends });
  }
  const ent = rows.filter((r) => r.truth === "ENTAILED"), fal = rows.filter((r) => r.truth === "FALSE");
  const lies = fal.filter((r) => r.witness === "states");
  console.log(`\n== ${model} · ends=${ENDS} · ${calls} calls · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const r of rows) {
    const mark = r.truth === "ENTAILED" ? (r.witness === "states" ? "✓" : "·") : (r.witness === "states" ? "✗ LIE" : "✓");
    console.log(`  ${String(r.id).padStart(2)} ${r.truth.padEnd(8)} ${r.shape.padEnd(20)} ${r.witness.padEnd(8)} ${mark}  ${r.sentence}`);
    if (r.witness === "states") console.log(`       ← ${String(r.decider).replace(/\s+/g, " ").slice(0, 110)}`);
    else if (r.why) console.log(`       (${r.why}${r.via ? ` · via ${r.via}` : ""})`);
  }
  const byShape = {};
  for (const r of ent) (byShape[r.shape] ??= []).push(r.witness === "states" ? 1 : 0);
  console.log(`  ENTAILED read states: ${ent.filter((r) => r.witness === "states").length}/${ent.length}` +
    `   FALSE read states (LIES): ${lies.length}/${fal.length}` +
    `   refused-by-model ${rows.filter((r) => r.witness === "refused").length} · skipped-by-protocol ${rows.filter((r) => r.witness === "skipped").length}`);
  console.log(`  by shape (entailed only): ${Object.entries(byShape).map(([k, v]) => `${k} ${v.reduce((a, b) => a + b, 0)}/${v.length}`).join(" · ")}`);
}
