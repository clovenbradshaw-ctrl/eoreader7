// possessive-audit-learned-results.test.js — the learned enclitic route against the typed one it replaces, on the page's own index, pinned.
//
// `eval/the-fold/possessive-audit.mjs --learned eng` re-ran the S137 audit (55 documents of `live_priors`, 21,886 queries) with one more index: the
// learned route (priors/name-forms-eng.json, READING-SPEC S139) beside the typed route that ships. A committed result nothing reads is a report, not an
// enforcement (eo-constitution III.5; the-fold POLICIES.md P94): the tables in possessive-audit-learned-RESULTS.md are regenerated from the committed raw
// record by the same pure function the driver prints with, the record's typed arms are checked to BE the S137 record (the comparison is on the same
// ground), and the claims the replacement rests on are asserted against it. The wiring that uses the route is the-fold's, and it names this file.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarizeAudit, auditFigures } from "../eval/the-fold/lib/possessive-audit-summary.mjs";

const dir = new URL("../eval/the-fold/results/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8"));
const raw = read("possessive-audit-learned.raw.json");
const typed = read("possessive-audit.raw.json");
const labels = read("possessive-audit-labels.json");
const doc = readFileSync(new URL("possessive-audit-learned-RESULTS.md", dir), "utf8");
const prior = JSON.parse(readFileSync(new URL("../priors/name-forms-eng.json", import.meta.url), "utf8"));
const fig = auditFigures(raw, labels), figTyped = auditFigures(typed, labels), L = fig.learned;

test("the document's tables are exactly what the committed record says", () => {
  const m = doc.match(/<!-- audit:begin -->\n([\s\S]*?)\n<!-- audit:end -->/);
  assert.ok(m, "the generated block is delimited by audit:begin / audit:end");
  assert.equal(m[1], summarizeAudit(raw, labels));
});

test("the record's typed arms ARE the S137 record: adding the learned index disturbed no number the typed route stands on", () => {
  for (const [cat, a] of Object.entries(raw.perCorpus)) { const { L: learnedArm, ...rest } = a; assert.ok(learnedArm, `${cat} carries its learned arm`); assert.deepEqual(rest, typed.perCorpus[cat], cat); }
  assert.deepEqual(Object.keys(raw.perCorpus), Object.keys(typed.perCorpus));
  assert.deepEqual(raw.extras.filter((x) => x.variant !== "L"), typed.extras, "every pair a typed arm reached, in order, with its context");
  assert.deepEqual(raw.changed, typed.changed);
  const { variants: v1, learned, ...c1 } = raw.config, { variants: v2, ...c2 } = typed.config;
  assert.deepEqual(c1, c2, "the same corpus, files, seed, cap and language");
  assert.deepEqual(v1, [...v2, "L"]);
  assert.ok(learned);
});

test("the learned arm used THIS prior: its giver and operating point are the ones on disk", () => {
  assert.equal(raw.config.learned.prior, "priors/name-forms-eng.json");
  assert.deepEqual(raw.config.learned.giver, prior.provenance.giver);
  assert.deepEqual(raw.config.learned.source, prior.provenance.source);
  const { lineage: _a, ...op } = prior.operatingPoint;
  const { lineage: _b, ...recorded } = raw.config.learned.operatingPoint;
  assert.deepEqual(JSON.parse(JSON.stringify(recorded)), JSON.parse(JSON.stringify(op)));
});

test("the two routes answer 21,880 of 21,886 queries identically, and the learned route is monotone and gains exactly what the typed route gains", () => {
  assert.equal(L.queries, 21886);
  assert.equal(L.differsFromR, 6);
  assert.equal(L.changedExact, 0, "no answer the index had given by an exact match is changed");
  assert.equal(L.F3loss, 0);
  assert.equal(L.F3gain, figTyped.f3Gained, "the same possessive-form queries gain the bare name's referents");
  assert.equal(L.F3gain, 5165);
  assert.equal(L.preemptedGuess, figTyped.guessPreempted, "the same spelling guesses are pre-empted");
  assert.equal(L.preemptedGuess, 91);
});

test("the six that differ are one thing: a referent the typed route reaches by stripping a trailing apostrophe after a letter that is not s, which the learned prior has no rule for", () => {
  assert.equal(L.diffs.length, 6);
  for (const d of L.diffs) {
    const only = d.typed.filter((t) => !d.learned.includes(t));
    assert.ok(only.length >= 1, `${d.q}: the typed route reaches something the learned route does not`);
    assert.ok(d.learned.every((t) => d.typed.includes(t)), `${d.q}: the learned route reaches nothing the typed route does not`);
    for (const t of only) assert.match(t, /['’]$/, `${d.q}: ${t} wears a trailing apostrophe`);
    for (const t of only) assert.ok(!/s['’]$/i.test(t), `${d.q}: ${t} is not an s-apostrophe — the learned prior has the rule for those`);
  }
  assert.deepEqual(L.diffs.map((d) => d.fam).sort(), ["F2", "F2", "F2", "F2", "F2", "F3"]);
  // four of the six are one document, a Chatino text, to which the typed route applied an English rule; two are English extraction artifacts
  assert.equal(L.diffs.filter((d) => /udhr-chj\.txt$/.test(d.file)).length, 4);
  assert.deepEqual(L.diffs.filter((d) => !/udhr-chj\.txt$/.test(d.file)).map((d) => d.q).sort(), ["New Comedy", "Sub Julio"]);
});

test("the pairs: every pair the learned route reaches is one the typed route reaches and one a person has labelled, with the typed route's false-join rate", () => {
  assert.equal(L.onlyL.length, 0, "the learned route reaches no pair the typed route does not");
  assert.equal(L.onlyR.length, 1);
  assert.equal(labels.labels[L.onlyR[0].id], "u", "the one pair only the typed route reaches is a cannot-tell");
  assert.deepEqual([L.pairs.total, L.pairs.y, L.pairs.n, L.pairs.u, L.pairs.unlabelled], [41, 37, 1, 3, 0]);
  assert.equal(L.pairs.falseRate, figTyped.byVariant.R.falseRate, "1 of 38 decided: 2.6%");
  assert.ok(Math.abs(L.pairs.falseRate - 1 / 38) < 1e-12);
});

test("the document says what it measured and what it did not", () => {
  assert.match(doc, /21,880 of 21,886/);
  assert.match(doc, /Chatino/);
  assert.match(doc, /Equivalent, not better/);
  assert.match(doc, /byte for byte/);
});
