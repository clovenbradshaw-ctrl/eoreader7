// tests/earned-cast-ground.test.js — earned-cast.js has no test file of its
// own today (found while wiring the ground attention); this covers the one
// new seam this pass adds: state.groundFact -> the "ground" attention ->
// cueBundle's mouth, and confirms it never leaks past bannedHits.
import test from "node:test";
import assert from "node:assert/strict";
import { cueBundle, eligibleAttentions, bannedHits } from "../the-fold/earned-cast.js";

test("earned-cast: state.groundFact is absent by default, \"ground\" never fires uninvited", () => {
  const eligible = eligibleAttentions({ act: "question", state: {} });
  assert.equal(eligible.some((e) => e === "ground" || e.startsWith("ground:")), false);
});

test("earned-cast: a set state.groundFact makes \"ground\" eligible and reaches the mouth", () => {
  const state = { groundFact: "one account stands apart as written by someone who was there." };
  const bundle = cueBundle({ act: "question", state, depth: 1 });
  assert.ok(bundle.eligible.some((e) => e === "ground" || e.startsWith("ground:")));
  assert.ok(bundle.mouth.includes(state.groundFact));
});

test("earned-cast: the ground fact composes with other attentions' facts in one mouth, all firewall-clean", () => {
  const state = {
    groundFact: "the accounts here diverge and do not reconcile — the doubt stands, not settled either way.",
    contested: ["x"],
  };
  const bundle = cueBundle({ act: "escalation", state, depth: 1 });
  assert.ok(bundle.mouth.includes(state.groundFact));
  assert.deepEqual(bannedHits(bundle.mouth), []);
});
