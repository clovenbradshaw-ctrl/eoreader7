// clause-spans.test.mjs — against the real module, no stubs. Pins both what
// clauseSpans gets right (the bug it was built to fix) and its disclosed
// known gaps (so a future pass has a red test to turn green, not a silent
// hole).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { clauseSpans, propositionSpans } from "./clause-spans.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const posPrior = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "priors", "pos-eng.json"), "utf8"));

test("the motivating bug: a colon-elaborated clause is split into parent + child, not bundled", () => {
  const spans = clauseSpans("Pierre Curie entered her life: it was their mutual interest in natural sciences that drew them together.");
  assert.equal(spans.length, 2);
  assert.equal(spans[0].relation, "root");
  assert.equal(spans[0].parentIndex, null);
  assert.match(spans[0].text, /entered her life:$/);
  assert.equal(spans[1].relation, "elaborates");
  assert.equal(spans[1].parentIndex, 0);
  assert.match(spans[1].text, /^it was their mutual interest/);
});

test("a trailing relative clause (where/who/which/…) nests under the root, not a flat sibling", () => {
  const spans = clauseSpans("Curie was born in Warsaw, Russian Empire, where she studied at the clandestine Flying University.");
  assert.equal(spans.length, 2);
  assert.equal(spans[1].relation, "relative");
  assert.equal(spans[1].parentIndex, 0);
  assert.match(spans[1].text, /^where she studied/);
});

test("a trailing subordinate clause (because/although/while/…) splits, relation 'subordinate'", () => {
  const spans = clauseSpans("The match was postponed because it rained.");
  assert.equal(spans.length, 2);
  assert.equal(spans[1].relation, "subordinate");
  assert.match(spans[1].text, /^because it rained/);
});

test("semicolons always split, relation 'coordinate'", () => {
  const spans = clauseSpans("She studied physics; he studied chemistry.");
  assert.equal(spans.length, 2);
  assert.equal(spans[1].relation, "coordinate");
  assert.equal(spans[1].parentIndex, 0);
});

test("a clause-coordinator followed by a subject pronoun splits (\"and it\", \"but he\")", () => {
  const spans = clauseSpans("Pierre proposed marriage, but she did not accept at first.");
  assert.equal(spans.length, 2);
  assert.equal(spans[1].relation, "coordinate");
  assert.match(spans[1].text, /^but she did not accept/);
});

test("NP-coordination (\"and\" joining two nouns, not two clauses) is NOT split", () => {
  const spans = clauseSpans("She discovered radium and polonium.");
  assert.equal(spans.length, 1, "no subject pronoun follows 'and' here, so this stays one clause");
});

test("a sentence with no boundary at all returns exactly one root span covering the whole text", () => {
  const text = "Pierre died in 1906 in a Paris street accident.";
  const spans = clauseSpans(text);
  assert.equal(spans.length, 1);
  assert.equal(spans[0].relation, "root");
  assert.equal(spans[0].parentIndex, null);
  assert.equal(spans[0].text, text);
});

test("empty or whitespace-only text returns no spans, never a guessed one", () => {
  assert.deepEqual(clauseSpans(""), []);
  assert.deepEqual(clauseSpans("   "), []);
});

test("DISCLOSED GAP: a FRONTED subordinate clause is not yet split (header's own limit #2)", () => {
  const spans = clauseSpans("Because it rained, the match was postponed.");
  assert.equal(spans.length, 1, "known miss: this module only splits TRAILING subordinate clauses today — flip this assertion when fronted-clause detection is built");
});

test("DISCLOSED GAP: 'that' never triggers a split (header's own limit #1, pos-eng.json ambiguity)", () => {
  const spans = clauseSpans("The theory that Curie discovered changed physics.");
  assert.equal(spans.length, 1, "'that' is excluded from SUBORDINATING_CONJUNCTIONS by design -- see priors.js");
});

test("propositionSpans: the real counterexample -- one clause, two propositions via a compound predicate", () => {
  const spans = propositionSpans("She was awarded a degree in physics and began work in an industrial laboratory of Gabriel Lippmann.", { posPrior });
  assert.equal(spans.length, 2);
  assert.match(spans[0].text, /^She was awarded a degree in physics$/);
  assert.equal(spans[0].sharesSubjectWith, null);
  assert.match(spans[1].text, /^and began work/);
  assert.equal(spans[1].relation, "coordinate-predicate");
  assert.equal(spans[1].sharesSubjectWith, 0, "the second predicate points back at the first rather than copying/guessing a subject string");
});

test("propositionSpans: NP-coordination is not mistaken for a compound predicate", () => {
  const spans = propositionSpans("She discovered radium and polonium.", { posPrior });
  assert.equal(spans.length, 1, "'polonium' is not VERB/AUX-dominant in the received prior, so this stays one proposition");
});

test("propositionSpans: a coordinator already handled at the CLAUSE level is not double-split", () => {
  const spans = propositionSpans("Pierre proposed marriage, but she did not accept at first.", { posPrior });
  assert.equal(spans.length, 2, "clauseSpans already split this at 'but she' (a new subject); propositionSpans must not re-split it again");
  assert.equal(spans[1].relation, "coordinate", "still the clause-level relation, not coordinate-predicate");
});

test("propositionSpans: without a posPrior, clause spans pass through unchanged rather than guessing", () => {
  const spans = propositionSpans("She was awarded a degree in physics and began work in an industrial laboratory.");
  assert.equal(spans.length, 1);
  assert.equal(spans[0].sharesSubjectWith, null);
});

test("propositionSpans: verbStart/verbEnd slice the exact verb out of the ORIGINAL text, not just clause.text", () => {
  const text = "She was awarded a degree in physics and began work in an industrial laboratory of Gabriel Lippmann.";
  const spans = propositionSpans(text, { posPrior });
  const pred = spans[1];
  assert.equal(pred.relation, "coordinate-predicate");
  assert.equal(text.slice(pred.verbStart, pred.verbEnd), "began");
  assert.equal(text.slice(pred.start, pred.end), pred.text, "start/end must exactly bound text, even for a predicate split inside a semicolon/colon-derived clause");
});

test("propositionSpans: offsets stay exact even when the parent clause came from a semicolon split (the trim-offset fix)", () => {
  // "she resigned from the position" is itself a clause born from a ";" cut
  // in clauseSpans (one leading space would drift start/end without the fix).
  const text = "Bronisława operated a school; she resigned from the position and moved to Kraków.";
  const clauses = clauseSpans(text);
  const second = clauses[1];
  assert.equal(text.slice(second.start, second.end), second.text, "clauseSpans' own start/end must exactly bound its trimmed text");
  const props = propositionSpans(text, { posPrior });
  const pred = props.find((p) => p.relation === "coordinate-predicate");
  assert.ok(pred, "expected a compound-predicate split inside the semicolon-derived clause");
  assert.equal(text.slice(pred.verbStart, pred.verbEnd), "moved");
});
