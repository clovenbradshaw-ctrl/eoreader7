// nesting.test.mjs — floor 4½'s walls, against the REAL ledger and the REAL
// independence counters. The decisive test is the leak: two sources agreeing
// that someone SAYS X must give X itself nothing.
import test from "node:test";
import assert from "node:assert/strict";
import * as H from "./hyperlexicon.js";
import * as TL from "../eoreader7/native/kernel/task-log.js";
import { distinctSources, distinctRecipes } from "./corroboration.js";
import { claimRef, isClaimRef, innerId, depthOf, attributionsOf, corroborationOf, leakCheck, disagreement } from "./nesting.js";

const INNER = H.assertionId("napoleon", "fought", "kutuzov");
const hl = H.makeHyperlexicon(TL);
// a ledger where the inner claim is stated by ONE source, and TWO sources
// agree that Tolstoy says it — the exact shape the wall exists for
function ledgerWithAttributions() {
  let log = hl.createHyperlexicon();
  log = hl.hear(log, { subject: "napoleon", verb: "fought", object: "kutuzov", witness: "borodino-article~read-v1" });
  log = hl.hear(log, { subject: "Tolstoy", verb: "states", object: claimRef(INNER), witness: "critic-a~read-v1" });
  log = hl.hear(log, { subject: "Tolstoy", verb: "states", object: claimRef(INNER), witness: "critic-b~read-v1" });
  return hl.foldHyperlexicon(log);
}

test("the namespace: a nested end is `claim:<id>` and nothing else is mistaken for one", () => {
  assert.equal(claimRef("a|b|c"), "claim:a|b|c");
  assert.ok(isClaimRef("claim:a|b|c"));
  assert.ok(!isClaimRef("Kutuzov"), "an ordinary surface is not a nested claim");
  assert.ok(!isClaimRef("testimony:page"), "a witness namespace is not a claim namespace");
  assert.equal(innerId("claim:a|b|c"), "a|b|c");
  assert.equal(innerId("Kutuzov"), null);
});

test("THE WALL: two sources agreeing on WHO SAYS IT give the claim itself nothing", () => {
  const led = ledgerWithAttributions();
  const c = corroborationOf(INNER, led, { distinctSources, distinctRecipes });
  // the two critics FOLD into one attribution note carrying two witnesses —
  // the hyperlexicon's own union rule, and the right shape: it is one claim
  // about Tolstoy, corroborated twice, not two claims
  assert.equal(c.attributed, 1, "one attribution note");
  assert.equal(c.attributions[0].sources, 2, "corroborated by two independent critics");
  assert.equal(c.direct, 1, "and the claim's OWN corroboration is untouched by them");
  assert.ok(c.direct < 2, "so a gate at >=2 sources still refuses this claim — which is the point");
});

test("LEAK ASSAY: an attribution's witness must never appear in the claim's own witness set", () => {
  const clean = ledgerWithAttributions();
  assert.equal(leakCheck(INNER, clean).leaked, false, "the honest ledger does not leak");
  // now plant the leak the wall exists to catch: the attribution's witness
  // credited to the inner claim, which is how "papers report he said it"
  // becomes "sources confirm it"
  const poisoned = clean.map((n) => (n.id === INNER ? { ...n, witnesses: [...n.witnesses, "critic-a~read-v1"] } : n));
  const check = leakCheck(INNER, poisoned);
  assert.equal(check.leaked, true, "the assay catches it");
  assert.equal(check.witnesses[0].witness, "critic-a~read-v1");
});

test("attributed-but-not-corroborated says so in words, so no consumer has to infer it", () => {
  let log = hl.createHyperlexicon();
  log = hl.hear(log, { subject: "Tolstoy", verb: "states", object: claimRef("x|y|z"), witness: "critic-a~read-v1" });
  const c = corroborationOf("x|y|z", hl.foldHyperlexicon(log), { distinctSources, distinctRecipes });
  assert.equal(c.onRecord, false, "the inner claim is not itself on the ledger at all");
  assert.equal(c.direct, 0);
  assert.equal(c.attributed, 1);
  assert.match(c.note, /nothing says it is so/);
});

test("DISAGREEMENT WITHOUT CONTRADICTION: both attributions stand, and the claim is contested", () => {
  let log = hl.createHyperlexicon();
  log = hl.hear(log, { subject: "Tolstoy", verb: "states", object: claimRef(INNER), witness: "critic-a~read-v1" });
  log = hl.hear(log, { subject: "Clausewitz", verb: "denies", object: claimRef(INNER), witness: "critic-b~read-v1" });
  const led = hl.foldHyperlexicon(log);
  assert.equal(attributionsOf(INNER, led).length, 2, "the ledger keeps BOTH — neither is dropped");
  const opposes = (a, b) => (a === "states" && b === "denies") || (a === "denies" && b === "states");
  const d = disagreement(INNER, led, { opposes });
  assert.equal(d.contested, true);
  // the ledger's own ordering decides which side is `a` (foldHyperlexicon
  // sorts), so the pair is asserted as a SET — a disagreement has no
  // privileged side, and a test that assumed one would pin ledger order
  // rather than the finding
  assert.deepEqual([d.pairs[0].aStance, d.pairs[0].bStance].sort(), ["denies", "states"]);
  assert.deepEqual([d.pairs[0].a, d.pairs[0].b].sort(), ["Clausewitz", "Tolstoy"]);
  assert.throws(() => disagreement(INNER, led), /the caller's declaration/, "this module holds no stance list of its own");
});

test("depth is declared, and a claim containing itself is refused at any depth", () => {
  const plain = { id: "a|b|c", subject: "a", verb: "b", object: "c" };
  assert.throws(() => depthOf(plain, [], {}), /maxDepth/);
  assert.equal(depthOf(plain, [], { maxDepth: 3 }).depth, 0);

  const outer = { id: "t|states|claim:a|b|c", subject: "Tolstoy", verb: "states", object: claimRef("a|b|c") };
  assert.equal(depthOf(outer, [plain], { maxDepth: 3 }).depth, 1);

  // self-reference: a note whose nested claim is itself
  const selfish = { id: "s|says|x", subject: "s", verb: "says", object: claimRef("s|says|x") };
  assert.equal(depthOf(selfish, [selfish], { maxDepth: 3 }).refused, "self_reference");

  // a cycle two steps long
  const p = { id: "p", subject: "p", verb: "says", object: claimRef("q") };
  const q = { id: "q", subject: "q", verb: "says", object: claimRef("p") };
  assert.equal(depthOf(p, [p, q], { maxDepth: 5 }).refused, "self_reference");
});

test("an unresolved inner id is NAMED, never silently treated as depth 0", () => {
  const outer = { id: "o", subject: "Tolstoy", verb: "states", object: claimRef("missing|claim|here") };
  const d = depthOf(outer, [outer], { maxDepth: 3 });
  assert.equal(d.depth, 1);
  assert.equal(d.unresolved, "missing|claim|here");
});

test("the budget bites: nesting past maxDepth is a typed refusal", () => {
  const a = { id: "a", subject: "a", verb: "says", object: claimRef("b") };
  const b = { id: "b", subject: "b", verb: "says", object: claimRef("c") };
  const c = { id: "c", subject: "c", verb: "says", object: claimRef("d") };
  const d = { id: "d", subject: "d", verb: "is", object: "so" };
  assert.equal(depthOf(a, [a, b, c, d], { maxDepth: 3 }).depth, 3);
  assert.equal(depthOf(a, [a, b, c, d], { maxDepth: 2 }).refused, "too_deep");
});

test("THE MODEL'S OWN VOICE is the ordinary shape, not a special case", () => {
  // P39's self:model witness, expressed as nesting: the model asserting X
  // is an outer note, and the wall then refuses to let it corroborate X —
  // which is exactly what mergeTestimony had to special-case before.
  let log = hl.createHyperlexicon();
  log = hl.hear(log, { subject: "self:model", verb: "asserts", object: claimRef(INNER), witness: "turn-14~chat-v1" });
  const led = hl.foldHyperlexicon(log);
  const c = corroborationOf(INNER, led, { distinctSources, distinctRecipes });
  assert.equal(c.direct, 0, "the model asserting it is not evidence for it");
  assert.equal(c.attributions[0].who, "self:model", "and who said so is on the record, verbatim");
});
