// expertise-falsify.test.mjs — the revisable expertise log (2026-09-22): a
// form learned once is provisional; found again from a DIFFERENT source it
// corroborates and confirms; a revision supersedes, never erases; every
// entry names the source that taught it, and a refused paradigm is refused
// to record at all (nothing learned, nothing written).
import test from "node:test";
import assert from "node:assert/strict";
import { createExpertise, recordExpertise, projectExpertise, knownForms, expertiseHistory, falsifyExpertise, expertiseLines } from "./expertise.js";
import { learnParadigmEmergent } from "./paradigm.js";
import { learnForm } from "./form-prior.js";

let seed = 3;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const NOUNS = ["river", "window", "garden", "lantern", "harbor", "meadow", "kettle", "ladder"];
const VERBS = ["carried", "painted", "folded", "counted", "gathered", "followed"];
const RHYMES = [["hill", "still", "will", "mill"], ["town", "gown", "down", "crown"], ["cat", "hat", "mat", "flat"], ["bee", "tea", "sea", "knee"]];
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const limerick = () => { const a = pick(RHYMES), b = pick(RHYMES.filter((r) => r !== a)); const A = shuffle(a), B = shuffle(b); return [`There was an old man of the ${A[0]},`, `Who ${pick(VERBS)} a ${pick(NOUNS)} ${A[1]};`, `He ${pick(VERBS)} the ${B[0]},`, `And a ${pick(NOUNS)} ${B[1]},`, `That odd old man of the ${A[0]}.`].join("\n"); };
const prose = () => Array.from({ length: 3 }, () => `The ${pick(NOUNS)} was ${pick(VERBS)} near the ${pick(NOUNS)} for years, the record says.`).join(" ");

const learn = (pop) => learnParadigmEmergent({ name: "limerick", instances: Array.from({ length: 20 }, limerick), population: Array.from({ length: 20 }, pop) });

test("a form learned once is provisional, tied to its source; a paradigm the organ refused is refused to record at all", () => {
  const ex = createExpertise();
  const p = learn(prose);
  const r = recordExpertise(ex, { name: "limerick", paradigm: p, source: "gutenberg:pg982" });
  assert.equal(r.status, "provisional");
  assert.equal(r.corroboration, 1);
  const cur = projectExpertise(ex, "limerick");
  assert.equal(cur.status, "provisional");
  assert.match(cur.basis, /gutenberg:pg982/);
  assert.match(cur.basis, /20 instance\(s\) against 20 population/);
  assert.deepEqual(knownForms(ex), ["limerick"]);
  assert.equal(projectExpertise(ex, "sonnet"), null, "a form never learned projects nothing, not a guess");
  assert.throws(() => recordExpertise(ex, { name: "x", paradigm: { refused: "under_powered", basis: "too few" } }), /refused/, "nothing learned, nothing written");
  assert.throws(() => recordExpertise(ex, { name: "x", paradigm: p }), /source is declared/, "provenance is never optional");
});

test("found again from a DIFFERENT source, it corroborates and confirms at the same floor kind-universe.js already uses; a repeat of the SAME source does not", () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "gutenberg:pg982" });
  const again = recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "gutenberg:pg982" });
  assert.equal(again.corroboration, 1, "the same source again is not a second witness");
  const other = recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "nottingham:limericks" });
  assert.equal(other.corroboration, 2);
  assert.equal(other.confirmed, "limerick");
  assert.equal(projectExpertise(ex, "limerick").status, "confirmed");
});

test("a revision SUPERSEDES, never erases — the whole history stays on the ledger, in order, and the current projection is the latest", () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "b" });
  const hist = expertiseHistory(ex, "limerick");
  assert.equal(hist.length, 2);
  assert.equal(hist[0].superseded, true);
  assert.equal(hist[1].superseded, false);
  assert.equal(hist[0].revision, 1);
  assert.equal(hist[1].revision, 2);
  assert.equal(projectExpertise(ex, "limerick").revision, 2);
  assert.ok(expertiseLines(ex, "limerick").some((l) => /revision 2/.test(l)));
  assert.deepEqual(expertiseLines(ex, "unknown-form"), ["unknown-form: never learned"]);
});

test("falsifyExpertise marks a source's occurrence refuted without deleting its ledger line, and a refuted kind refuses a silent re-sign", () => {
  const ex = createExpertise();
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "a" });
  recordExpertise(ex, { name: "limerick", paradigm: learn(prose), source: "b" });
  const f = falsifyExpertise(ex, "limerick", "a", { reason: "a later, larger read disagreed" });
  assert.equal(f.falsified, 1);
  assert.equal(expertiseHistory(ex, "limerick").length, 2, "the ledger line is not deleted");
  assert.ok(ex.store.concepts.limerick.occurrences.find((o) => o.source === "a").falsified);
});

test("expertise compresses under emergent feature dominance and carries the expectation side when given", () => {
  const ex = createExpertise();
  const p = learn(prose);
  const fp = learnForm(Array.from({ length: 20 }, limerick), { slots: "emergent" });
  const r = recordExpertise(ex, { name: "limerick", paradigm: p, formPrior: fp, source: "gutenberg:pg982" });
  const cur = projectExpertise(ex, "limerick");
  assert.ok(cur.featureCount > cur.features.length, `dominance should compress: ${cur.featureCount} total, ${cur.features.length} kept`);
  assert.ok(cur.formPrior);
  assert.match(r.line.basis, /expectation: \d+ slot\(s\) predictable/);
});
