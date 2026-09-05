import test from "node:test";
import assert from "node:assert/strict";
import { runSettlementByArrival } from "../eval/the-fold/lib/settlement-by-arrival.mjs";

const { numbers: n } = await runSettlementByArrival();

test("after the cut meets its link one contest is open, typed contest, disputed by the denier", () => {
  assert.equal(n.contestsAfterAB, 1);
  assert.deepEqual(n.disputedBy, ["northgate-b.txt"]);
  assert.equal(n.kind, "contest");
});

test("a third source that restates the link corroborates it and settles nothing (P89)", () => {
  assert.equal(n.restated.sources, 2);
  assert.deepEqual(n.restated.disputedBy, ["northgate-b.txt"]);
  assert.equal(n.restated.contestsOpen, 1);
});

test("a silent third source leaves the contest open and is no candidate; a co-present one is a candidate and never a landing; a source that spoke never is", () => {
  assert.equal(n.silent.contestsOpen, 1);
  assert.equal(n.silent.candidates, 0);
  assert.equal(n.copresent.seeking, 1);
  assert.deepEqual(n.copresent.candidates, ["northgate-e.txt"]);
  assert.deepEqual(n.copresent.stating, ["northgate-a.txt"]);
  assert.deepEqual(n.copresent.contradicting, ["northgate-b.txt"]);
  assert.equal(n.copresent.contestsOpenAfterSearch, 1, "seeking is a lead, never a landing");
  assert.equal(n.copresent.defaultCandidates, 0, "the default featurizer is blind to a numeric end — disclosed, declared around in the driver");
});

test("controls: a kind the door did not land is unrouted with its reason; undeclared kinds are refused", () => {
  assert.equal(n.controls.wrongKindSeeking, 0);
  assert.equal(n.controls.wrongKindUnrouted, 1);
  assert.equal(n.controls.undeclaredRefused, true);
});

test("only settleDispute settles: upheld leaves link and cut live and the contest settled; conceded hands back the concession that takes the link down", () => {
  assert.deepEqual(n.upheld.timeline, ["link", "cut", "contest", "settled"]);
  assert.deepEqual(n.upheld.standing, { link: "live", cut: "live", contest: "settled" });
  assert.deepEqual(n.upheld.disputedBy, []);
  assert.equal(n.upheld.concession, false);
  assert.equal(n.conceded.concessionFor, "the northgate observatory|opened|in 1889");
  assert.deepEqual(n.conceded.timeline, ["link", "cut", "contest", "settled", "conceded"]);
  assert.deepEqual(n.conceded.standing, { link: "conceded", cut: "live", contest: "settled" });
  assert.equal(n.conceded.linkInFold, false);
});
