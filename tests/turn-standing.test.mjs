// turn-standing.test.mjs — the mechanical identity's contract.
// Measured live: gemma2:2b said "Bard" when asked its name, then looped the
// borrowed name instead of answering. turnStanding states the serving fact
// (this turn runs on `model`) outright, so no turn reaches for a name from
// weights. Pinned: names the serving model, forbids borrowing, and stays
// firewall-clean (no apparatus nouns for the mouth to parrot).
import { test } from "node:test";
import assert from "node:assert/strict";
import { turnStanding } from "../proxy-runner.mjs";
import { apparatusMentions } from "../native/the-fold/firewall.js";

test("turnStanding names the serving model and forbids borrowing", () => {
  const s = turnStanding("gemma2:2b");
  assert.ok(s.includes("gemma2:2b"), "the serving fact is stated");
  assert.ok(/never claim to be a different model/i.test(s), "borrowing refused");
  assert.ok(/answer.*latest message itself/i.test(s), "the message, not the instructions");
});

test("turnStanding is firewall-clean — no apparatus nouns", () => {
  assert.deepEqual(apparatusMentions(turnStanding("gemma2:2b")), []);
  assert.deepEqual(apparatusMentions(turnStanding("")), []);
});
