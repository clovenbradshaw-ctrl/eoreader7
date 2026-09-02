// eval/select-refusal-diagnosis.mjs — the next rung of F5, found by reading
// the select walk's own refusals: at full budget 39 of 103 asks came back
// `no-testimony` (the model said stated:no to every candidate). Nobody had
// looked at what was actually asked. This driver runs the SAME walk with the
// SAME budget and a selectAsk that records what it was shown, then buckets
// every no-testimony mechanically before any hand reading:
//   A. debris claim — the note's own ends have no content word, or the
//      rendered claim is a fragment (subject-span debris, P74 lever 3)
//   B. no candidate co-present — none of the sentences offered carries both
//      ends' words, so "no" was the only honest answer; the CANDIDATE SET is
//      the defect, not the witness
//   C. co-present and refused — a candidate carries both ends and the model
//      still said no: either the page genuinely does not state it
//      (paraphrase, the real wall) or the witness misread. Printed for hand
//      reading, which is the only judge of that split.
// Zero attests on planted fabrications remains the control on the walk.
import { buildLedger, splitSentences, distinctSources, corroborateLedger, T } from "./lib/borodino-ledger.mjs";
import { textFeatures } from "../../organs/index.js";
const OLLAMA = "http://localhost:11434", MODEL = "gemma2:2b", BUDGET = Number(process.env.BUDGET ?? 200);
const { log, hl, sources, planted } = await buildLedger();
const chat = async (messages, schema) => {
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) });
  return (await res.json())?.message?.content ?? "";
};
const ask = async (s, slice) => T.readTestimony(await chat(T.buildWitnessMessages(s, slice), T.WITNESS_SCHEMA));
const shown = []; // every select ask: {claim, candidates, raw}
const selectAsk = async (messages) => {
  const user = messages.find((m) => m.role === "user")?.content ?? "";
  const claim = (user.match(/^Claim: "([\s\S]*?)"\n\nSentences:/) ?? [])[1] ?? "";
  const candidates = [...user.matchAll(/^\d+\. (.*)$/gm)].map((m) => m[1]);
  const raw = await chat(messages, T.SELECT_SCHEMA);
  let parsed = {}; try { parsed = JSON.parse(raw); } catch {}
  shown.push({ claim, candidates, raw, parsed });
  return parsed;
};
const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect };
const r = await corroborateLedger(log, hl, sources, { ask, selectAsk, splitSentences, testimony, maxAsks: BUDGET });
const liedOn = r.attested.filter((a) => planted.includes(`${a.note?.subject}|${a.note?.verb}|${a.note?.object}`.toLowerCase())).length;
console.log(`walk: asks ${r.asks} · attested ${r.attested.length} · refusals ${JSON.stringify(r.refusals)} · planted attests ${liedOn} ${liedOn ? "✗" : "✓"}`);
// the no-testimony asks are the ones where the CLAIM ask (first of a pair) said no — the arm never ran
const noes = shown.filter((s) => s.parsed?.stated !== "yes");
const feat = (t) => [...textFeatures(t)];
const buckets = { A: [], B: [], C: [] };
for (const s of noes) {
  const words = feat(s.claim);
  const fragment = !/^[A-ZÀ-Ý"'«]/.test(s.claim.trim()) || words.length < 3;
  if (fragment) { buckets.A.push(s); continue; }
  // both ends: approximate as the claim's first and last content words' company
  const ends = [words[0], words[words.length - 1]];
  const copresent = s.candidates.filter((c) => { const f = new Set(feat(c)); return ends.every((w) => f.has(w)); });
  (copresent.length ? buckets.C : buckets.B).push({ ...s, copresent });
}
console.log(`\nselect asks that said no: ${noes.length} of ${shown.length} shown`);
console.log(`  A. debris/fragment claim:            ${buckets.A.length}`);
console.log(`  B. no candidate co-present:          ${buckets.B.length}`);
console.log(`  C. co-present, still refused:        ${buckets.C.length}  ← the hand-read bucket`);
for (const s of buckets.A.slice(0, 5)) console.log(`   A· "${s.claim.slice(0, 90)}"`);
for (const s of buckets.B.slice(0, 5)) console.log(`   B· "${s.claim.slice(0, 90)}"  (${s.candidates.length} candidates shown)`);
for (const s of buckets.C.slice(0, 12)) { console.log(`   C· "${s.claim.slice(0, 110)}"`); for (const c of s.copresent.slice(0, 2)) console.log(`        ↳ ${c.slice(0, 150)}`); }
