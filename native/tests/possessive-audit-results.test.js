// possessive-audit-results.test.js — the enclitic route's measured result, pinned.
//
// WHY A TEST READS A DRIVER'S NUMBER. `eval/the-fold/possessive-audit.mjs` is a re-runnable driver, and a committed result nothing reads is a report,
// not an enforcement (eo-constitution III.5; the-fold POLICIES.md "the stale stage", P94). This file makes the numbers the route stands on ENFORCED:
// the tables in possessive-audit-RESULTS.md are regenerated from the committed raw record and labels by the same pure function the driver prints with
// (`lib/possessive-audit-summary.mjs`), and the claims the route's law makes are asserted against that record.
//
// What the record can and cannot show. It is a committed measurement on seven English corpora with a single non-blind judge; the live corpus is not in
// this repo. So the test pins the RECORD (the document says what the raw says; the claims hold of the raw), not a re-run — the walls that run live,
// on toy text with controls built to fail, are organs/identity-routes.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarizeAudit, auditFigures } from "../eval/the-fold/lib/possessive-audit-summary.mjs";

const dir = new URL("../eval/the-fold/results/", import.meta.url);
const raw = JSON.parse(readFileSync(new URL("possessive-audit.raw.json", dir), "utf8"));
const labels = JSON.parse(readFileSync(new URL("possessive-audit-labels.json", dir), "utf8"));
const doc = readFileSync(new URL("possessive-audit-RESULTS.md", dir), "utf8");
const f = auditFigures(raw, labels);

test("the document's tables are exactly what the committed record says (no transcription to drift)", () => {
  const m = doc.match(/<!-- audit:begin -->\n([\s\S]*?)\n<!-- audit:end -->/);
  assert.ok(m, "the generated block is delimited by audit:begin / audit:end");
  assert.equal(m[1], summarizeAudit(raw, labels));
});

test("the recovery fold changes NO answer the index gave by an exact match", () => {
  assert.equal(f.exactChanged, 0, "monotone: a name the index answered exactly is answered the same");
  assert.equal(f.f3Lost, 0, "and no possessive query that resolved before resolves to nothing now");
  assert.ok(f.docs >= 50 && f.surfaces > 10000, "on a real sample, not a fixture");
  for (const x of raw.changed) assert.equal(x.kind, "spelling-guess-preempted", `${x.q}: the only answers the fold changed are the one-edit spelling guesses it is consulted before`);
});

test("it does what it is for: a possessive of an established name now resolves where the index was silent", () => {
  assert.ok(f.f3Gained / f.f3Asked >= 0.95, `gained ${f.f3Gained} of ${f.f3Asked}`);
  assert.ok(f.f2Recovered >= 40, "referents established only with the mark are reachable by the bare name");
});

test("the shipped route's joins are few, and wrong rarely; the always-on fold and the every-token control are worse — each a control that fails", () => {
  const R = f.byVariant.R, T = f.byVariant["T-only"], E = f.byVariant["E-only"];
  assert.equal(R.unlabelled, 0, "every pair the shipped route made was read");
  assert.ok(R.y + R.n >= 30, "enough decided pairs for a rate to mean something");
  assert.ok(R.falseRate <= 0.05, `shipped route false-join rate ${R.falseRate}`);
  assert.ok(R.pairs < T.pairs / 4, "recovery joins an order fewer pairs than folding always");
  assert.ok(T.falseRate > R.falseRate, "the always-on fold is wrong more often than recovery");
  assert.ok(E.falseRate >= 0.5, "the every-token fold does the thing the last-token fold exists to avoid: it joins a person to the titles that contain their possessive");
  assert.ok(E.n >= 20, "and it does it more than a handful of times");
});

test("the labels are the reader's, and say so", () => {
  assert.match(labels.judge, /one judge/);
  assert.match(labels.judge, /not blind|Not blind/);
  for (const [id, l] of Object.entries(labels.labels)) assert.ok(["y", "n", "u"].includes(l), `${id}: ${l}`);
});
