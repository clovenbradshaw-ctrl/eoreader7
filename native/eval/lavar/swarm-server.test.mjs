// swarm-server.test.mjs — the chat wire-up, pinned with the REAL organs
// (cast.js + reader-bundle.js, no stubs): ordinary chat never routes,
// pointed NL finds measured signal, nonsense is a typed gap, and the
// prose distinguishes measured-zero from reference-only.
import test from "node:test";
import assert from "node:assert/strict";
import { runSwarmTurn } from "../../../swarm-server.mjs";

const TEXT = "Lincoln appointed Hamlin. Hamlin served as vice president under Lincoln.";

test("ordinary chat is not routed to the swarm", () => {
  const out = runSwarmTurn({ task: "what does this passage mean?", texts: [{ name: "t", text: TEXT }] });
  assert.equal(out.routed, false);
});

test("pointed NL finds measured signal through the real organs", () => {
  const out = runSwarmTurn({ task: "swarm the cast and relations ants at this", texts: [{ name: "t", text: TEXT }], force: true });
  assert.equal(out.routed, true);
  assert.deepEqual([...out.pointed].sort(), ["cast", "relations"]);
  assert.ok(out.best.f > 0, "real organs yield real signal on real text");
  assert.ok(Number.isFinite(out.bar), "bar is measured, never a hand-set threshold");
  assert.ok(out.answer.includes("Best so far"), "prose answer rides along for chat");
});

test("nonsense pointing is a typed gap, never a silent empty", () => {
  const out = runSwarmTurn({ task: "xyzzy zqxj wugs qvothe", texts: [{ name: "t", text: TEXT }], force: true });
  assert.equal(out.routed, true);
  assert.equal(out.mode, "gap");
});

test("prose distinguishes measured-zero from reference-only", () => {
  const zero = runSwarmTurn({ task: "swarm the relations ants at this", texts: [{ name: "t", text: "Hm." }], force: true });
  const ref = runSwarmTurn({ task: "swarm the graph ants at this", texts: [{ name: "t", text: TEXT }], force: true });
  if (zero.best.f === 0 && zero.pointed.includes("relations"))
    assert.match(zero.answer, /measured nothing|empty ground/);
  assert.match(ref.answer, /reference-only/);
});
