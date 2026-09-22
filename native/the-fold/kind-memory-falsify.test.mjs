// kind-memory-falsify — the second sonnet costs a lookup, and one witness
// is never enough (2026-09-22). Every paradigm here is learned by the real
// organ (learnParadigmEmergent) over real read units; what is under test is
// what MEMORY does with learnings that carry their sources.
import test from "node:test";
import assert from "node:assert/strict";
import { learnParadigmEmergent, evaluateParadigmEmergent } from "./paradigm.js";
import { emptyKindMemory, rememberParadigm, recallKind, recognizeKind, refuteByInstance, refuteFeature, kindSources, splitProposal } from "./kind-memory.js";

// two "editions" of the same five-line form: edition B indents every line,
// edition A does not. The form itself is five lines ending in a period.
const five = (indent, n) => ({ text: Array.from({ length: 5 }, (_, i) => `${indent}word${i} of verse ${n} here.`).join("\n") });
const four = (n) => ({ text: Array.from({ length: 4 }, (_, i) => `word${i} of other ${n} here,`).join("\n") });
const A = Array.from({ length: 8 }, (_, i) => five("", i));
const B = Array.from({ length: 8 }, (_, i) => five("   ", i + 100));
const OTHER = Array.from({ length: 8 }, (_, i) => four(i));
const learn = (instances) => learnParadigmEmergent({ name: "fivec", instances, population: OTHER });

test("SIG: one source is remembered, but recall says a single witness may be reporting its own habits", () => {
  const s = emptyKindMemory();
  const r = rememberParadigm(s, "fivec", learn(A), { source: "edition-A" });
  assert.equal(r.status, "provisional");
  const rec = recallKind(s, "fivec");
  assert.equal(rec.known, true);
  assert.equal(rec.singleSource, true);
  assert.match(rec.basis, /ONE source only/);
  assert.ok(rec.features.length >= 1);
  assert.ok(rec.falsifiableBy.length >= 1, "a definition states what would refute it");
});

test("CON: a second source confirms the kind, and the feature only one edition has — its margin — is dropped", () => {
  const s = emptyKindMemory();
  rememberParadigm(s, "fivec", learn(A), { source: "edition-A" });
  const r = rememberParadigm(s, "fivec", learn(B), { source: "edition-B" });
  assert.equal(r.status, "confirmed");
  assert.equal(kindSources(s, "fivec").length, 2);
  const rec = recallKind(s, "fivec");
  assert.equal(rec.singleSource, false);
  const keys = rec.features.map((f) => `${f.slot}=${f.value}`);
  assert.ok(keys.some((k) => /^count:/.test(k)), `the form's own count survives both editions: ${keys.join(" · ")}`);
  const indent = rec.dropped.filter((f) => /indent/.test(f.slot));
  assert.ok(indent.length >= 1, "a typesetting feature present in one edition only is dropped");
  for (const f of indent) assert.match(f.why, /minority/);
});

test("the lookup: a remembered kind recognizes a new instance, and refuses one of the other form", () => {
  const s = emptyKindMemory();
  rememberParadigm(s, "fivec", learn(A), { source: "edition-A" });
  rememberParadigm(s, "fivec", learn(B), { source: "edition-B" });
  const hit = recognizeKind(s, five("", 999));
  assert.equal(hit.best?.kind, "fivec");
  const miss = recognizeKind(s, four(999));
  assert.equal(miss.best, null, `a four-line unit must not satisfy: ${JSON.stringify(miss.scored)}`);
  assert.match(recognizeKind(emptyKindMemory(), five("", 1)).basis, /costs a hunt/);
});

test("DEF: a counter-instance refutes the features it lacks, and every later recall is rebuilt without them", () => {
  const s = emptyKindMemory();
  rememberParadigm(s, "fivec", learn(A), { source: "edition-A" });
  const before = recallKind(s, "fivec").features.length;
  const out = refuteByInstance(s, "fivec", four(7), { by: "test", reason: "agreed of the kind" });
  assert.ok(out.refuted >= 1);
  const after = recallKind(s, "fivec");
  assert.equal(after.features.length, before - out.refuted);
  for (const f of after.dropped.filter((d) => d.why === "refuted")) assert.ok(f.slot);
  // refuting twice is not counted twice
  assert.equal(refuteFeature(s, "fivec", after.dropped.find((d) => d.why === "refuted"), {}).refuted, 0);
});

test("REC: learning again from the SAME source supersedes, it does not double the witness count", () => {
  const s = emptyKindMemory();
  rememberParadigm(s, "fivec", learn(A.slice(0, 6)), { source: "edition-A" });
  rememberParadigm(s, "fivec", learn(A), { source: "edition-A" });
  assert.equal(kindSources(s, "fivec").length, 1);
  assert.equal(s.kinds.fivec.learnings.length, 2, "the superseded learning stays on file");
  assert.equal(s.kinds.fivec.learnings.filter((l) => l.superseded).length, 1);
  assert.equal(recallKind(s, "fivec").singleSource, true);
});

test("SEG: agreeing sources propose no split; two genuinely different kinds filed under one name do", () => {
  const s = emptyKindMemory();
  // four witnesses of the SAME form (control) — disagreement is noise only
  for (const [i, src] of ["a", "b", "c", "d"].entries()) rememberParadigm(s, "fivec", learn(A.map((u, j) => five("", j + i * 10))), { source: src });
  assert.equal(splitProposal(s, "fivec", { rnd: () => 0.5 }).propose, false);
  // two witnesses of an indented form, two of an unindented one, same name
  const t = emptyKindMemory();
  for (const src of ["a", "b"]) rememberParadigm(t, "fivec", learn(A), { source: src });
  for (const src of ["c", "d"]) rememberParadigm(t, "fivec", learn(B), { source: src });
  const sp = splitProposal(t, "fivec", { draws: 400 });
  assert.equal(sp.propose, true, sp.basis);
  assert.equal(sp.sides.flat().length, 4);
});

test("a remembered definition scores exactly as the organ that learned it would", () => {
  const s = emptyKindMemory();
  const p = learn(A);
  rememberParadigm(s, "fivec", p, { source: "edition-A" });
  const rec = recallKind(s, "fivec");
  const u = five("", 555);
  assert.equal(evaluateParadigmEmergent(rec, u).held, evaluateParadigmEmergent(p, u).held);
});
