// model-switch.test.mjs — plain-speech model switching, falsified at the
// pure layer (no model draws: detect + resolve are mechanical).
//   S1 INTENT — a switch verb plus a model reference fires; either alone
//      does not. "switch to a different topic" and "I use gemma daily" must
//      never switch. Refutation: any of them yields a target.
//   S2 REFERENCE — full roster ids, bare names, and alias classes resolve;
//      unknown names do not. Refutation: an unresolvable ref yields an id.
//   S3 DETERMINISM — ambiguous refs resolve by the documented preference
//      (exact > unique fragment > sonnet > opus > deepseek > haiku > first),
//      byte-identical every time.
//   S4 NO GUESSING — "slow" and unknown aliases refuse (null); the turn
//      proceeds on the requested model with a miss note.
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectModelSwitch, resolveModelTarget } from "../proxy-runner.mjs";

const ROSTER = [
  "er7:gemma2:2b",
  "er7:qwen3:4b",
  "er7:opencode/claude-haiku-4-5",
  "er7:opencode/claude-sonnet-4-6",
  "er7:opencode/deepseek-v4-pro",
];

test("S1 — intent needs BOTH a switch verb and a model reference", () => {
  const fires = [
    "switch to haiku",
    "Switch to Haiku please",
    "can you switch to haiku?",
    "use haiku",
    "give me sonnet",
    "try deepseek",
    "switch to haiku and explain recursion",
    "change to the fast one",
    "i want to use haiku for this",
    "use something faster",
    "switch to er7:opencode/claude-sonnet-4-6",
  ];
  for (const t of fires) {
    assert.ok(detectModelSwitch(t, ROSTER), `"${t}" should be a switch ask`);
  }
  const quiet = [
    "switch to a different topic",
    "I use gemma daily for coding",
    "we use qwen in production",
    "what do you think about AI?",
    "how does blockchain work?",
    "switch the lights off",
    "use the following data to answer",
    "change my answer to be shorter",
    "tell me everything I told you, exactly",
    "hello — before we start, remember this: my dog is Pancake",
    "er7:opencode/claude-sonnet-4-6 please", // bare id, no verb — mention, not instruction (/model is the precise command)
    "sonnet keeps timing out on me",
  ];
  for (const t of quiet) {
    assert.equal(detectModelSwitch(t, ROSTER), null, `"${t}" must never switch`);
  }
});

test("S2 — references resolve against the roster; unknown names do not", () => {
  assert.equal(resolveModelTarget("er7:opencode/claude-sonnet-4-6", ROSTER), "er7:opencode/claude-sonnet-4-6");
  assert.equal(resolveModelTarget("haiku", ROSTER), "er7:opencode/claude-haiku-4-5");
  assert.equal(resolveModelTarget("sonnet", ROSTER), "er7:opencode/claude-sonnet-4-6");
  assert.equal(resolveModelTarget("gemma", ROSTER), "er7:gemma2:2b");
  assert.equal(resolveModelTarget("deepseek", ROSTER), "er7:opencode/deepseek-v4-pro");
  assert.equal(resolveModelTarget("qwen", ROSTER), "er7:qwen3:4b");
  assert.equal(resolveModelTarget("gpt-99", ROSTER), null);
  assert.equal(resolveModelTarget("sydney", ROSTER), null);
  // end-to-end through detect: full id in a sentence
  assert.equal(detectModelSwitch("switch to er7:qwen3:4b", ROSTER)?.ref, "er7:qwen3:4b");
});

test("S3 — ambiguous refs resolve deterministically by flagship preference", () => {
  assert.equal(resolveModelTarget("claude", ROSTER), "er7:opencode/claude-sonnet-4-6");
  const again = resolveModelTarget("claude", ROSTER);
  assert.equal(again, "er7:opencode/claude-sonnet-4-6", "same input, same target, every time");
  assert.equal(resolveModelTarget("@fast", ROSTER), "er7:opencode/claude-haiku-4-5");
  assert.equal(resolveModelTarget("@smart", ROSTER), "er7:opencode/claude-sonnet-4-6");
  assert.equal(resolveModelTarget("@frontier", ROSTER), "er7:opencode/claude-sonnet-4-6");
  assert.equal(resolveModelTarget("@local", ROSTER, { current: "er7:gemma2:2b" }), "er7:gemma2:2b");
  assert.equal(resolveModelTarget("@remote", ROSTER), "er7:opencode/claude-sonnet-4-6");
});

test("S4 — no guessing: slow/unknown aliases refuse", () => {
  assert.equal(resolveModelTarget("@slow", ROSTER), null);
  assert.equal(resolveModelTarget("@whatever", ROSTER), null);
  assert.equal(resolveModelTarget("haiku", []), null, "empty roster resolves nothing");
});
