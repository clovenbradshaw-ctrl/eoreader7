// swarm-server.test.mjs — the chat wire-up, pinned with the REAL organs
// (cast.js + reader-bundle.js, no stubs): ordinary chat never routes,
// pointed NL finds measured signal, nonsense is a typed gap, and the
// prose distinguishes measured-zero from reference-only.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { runSwarmTurn } from "../../../swarm-server.mjs";

const TEXT = "Lincoln appointed Hamlin. Hamlin served as vice president under Lincoln.";

test("ordinary chat is not routed to the swarm", () => {
  const out = runSwarmTurn({ task: "what does this passage mean?", texts: [{ name: "t", text: TEXT }] });
  assert.equal(out.routed, false);
});

test("a clean follow-up in a citation-heavy conversation is not routed (history is not material)", () => {
  // Live specimen, 2026-09-22: prior answers' marks swarmed plain questions.
  const history = [
    "Ocean tides are caused by the Moon and the Sun. [1][2]\n\n1 · witnessed:noaa   2 · bound:material",
    "| body | share |\n|---|---|\n| Moon | (~2/3) |\n| Sun | (~1/3) |\n\nThe Sun adds (~46%) of the Moon's force. [1][3]",
  ].map((text, i) => ({ name: `history-${i}`, text }));
  const out = runSwarmTurn({ task: "In one sentence, what is a fjord?", texts: [], history });
  assert.equal(out.routed, false);
});

test("every chat door hands its history to runSwarmTurn as `history`, never inside `texts`", () => {
  // The misfire lived at the doors, not in the detector: proxy.mjs spread
  // chatHistory into `texts`, so the trigger read prior answers as material.
  const src = fs.readFileSync(new URL("../../../proxy.mjs", import.meta.url), "utf8");
  const calls = src.split("runSwarmTurn({").slice(1).map((s) => s.slice(0, s.indexOf("});")));
  const doors = calls.filter((c) => c.includes("chatHistory"));
  assert.ok(doors.length >= 4, `expected the four chat doors, found ${doors.length}`);
  for (const c of doors)
    for (const line of c.split("\n").filter((l) => l.includes("chatHistory")))
      assert.match(line.trim(), /^history:/, `a door passes chatHistory outside history: — ${line.trim()}`);
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
