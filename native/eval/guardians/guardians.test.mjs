// native/eval/guardians/guardians.test.mjs — falsify the khora's guardians:
// every member must FAIL on a planted violation (the constitution II.10: a
// gate is verified against material it is supposed to reject). A guardian
// that cannot fail is decoration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { audit as maat } from "./maat.mjs";
import { audit as hephaestus } from "./hephaestus.mjs";
import { audit as norrin } from "./norrin.mjs";
import { audit as charon } from "./charon.mjs";
import { audit as aletheia } from "./aletheia.mjs";

test("the full pipeline is labelled — every guardian has a duty and holds a suitor", () => {
  for (const r of [maat(), hephaestus(), norrin(), charon(), aletheia()]) {
    assert.ok(r.duty, `${r.member} must have a duty`);
    assert.ok(r.suitor, `${r.member} must hold a suitor`);
    assert.ok(r.falsifying, `${r.member} must carry a falsifying control`);
  }
});

test("hephaestus: the gate must settle before the mouth — the forge computes", () => {
  const r = hephaestus();
  assert.equal(r.ok, true, "the reason-gate runs the organs first");
  assert.equal(r.wordLists, 0, "the gate carries no pre-set word-lists (kleenUp)");
});

test("charon: every draw must reach the model through a sanctioned door", () => {
  const r = charon();
  assert.equal(r.ok, true, "no private raft to the model");
  assert.equal(r.breaches.length, 0, "no direct-to-model draw outside the disclosed infra");
});

test("aletheia: the mouth is never handed an address", () => {
  const r = aletheia();
  assert.equal(r.ok, true, "addresses are struck before the mouth");
  assert.ok(r.addressesStruck, "the firewall strikes addresses at the mouth's door");
});

test("the khora round reports the whole state, sound only when all guardians hold", async () => {
  const { houseRound } = await import("../guardians.mjs");
  const r = await houseRound();
  assert.equal(r.ok, true, "the perceiver's house is sound today");
  assert.equal(r.members.length, 5, "all five guardians stand watch");
});