// gary-doors.test.js — Gary keeps the mouth's door (the-fold/gary.js,
// P55), checked from this side of the boundary.
//
// Gary (the-fold) owns prompting; eoreader7 owns the engine. The
// dependency runs one way, so this file does NOT import his organs —
// it pins OUR mouth-facing constants against his REFUSE rules directly:
// no apparatus vocabulary (schema/operator names stay in code and round
// records, never prompts), no JSON asks, no prohibitions aimed at the
// mouth (facts to reason from, per his information-not-prohibition
// rule). If Gary's own checks ever run here, these pins must agree
// with them — drift either way is a failing test, not a quiet hole.

import { test } from "node:test";
import assert from "node:assert/strict";
import { PROPOSAL_FORMAT } from "../the-fold/code-loop.js";
import { ACTION_FORMAT } from "../the-fold/sandboxed-agent.js";
import { generationBriefFor } from "../adapters/code/language.js";

const APPARATUS = ["Prior@1", "DMD", "holograph", "EOT", "Heimdall", "SUPERSEDE", "fenced_proposal", "INS ·", "SEG ·", "SYN ·", "EOTBase", "EOTCodeOp"];
const PROHIBITION = /\b(?:do not|don't|never|must not|should not|refrain from)\b/i;
const JSON_ASK = /\bjson\s+(?:object|only|format)\b/i;

const MOUTHS = {
  "code-loop PROPOSAL_FORMAT": PROPOSAL_FORMAT,
  "sandboxed-agent ACTION_FORMAT": ACTION_FORMAT,
  "brief python": generationBriefFor("python") ?? "",
  "brief javascript": generationBriefFor("javascript") ?? "",
};

for (const [name, text] of Object.entries(MOUTHS)) {
  test(`gary/no-apparatus: ${name} names no instrument parts`, () => {
    for (const term of APPARATUS) {
      assert.doesNotMatch(text, new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${name} leaks apparatus term "${term}" to the mouth`);
    }
  });

  test(`gary/information-not-prohibition: ${name} carries facts, not bans`, () => {
    assert.doesNotMatch(text, PROHIBITION, `${name} aims a prohibition at the mouth`);
  });

  test(`gary/no-json-ask: ${name} never asks for JSON`, () => {
    assert.doesNotMatch(text, JSON_ASK, `${name} asks for JSON in prose`);
  });
}

test("gary/worked-example: the format teaches shapes with fake names", () => {
  // Falsified both ways 2026-09-19: real names echo (stub era), fake names
  // hold the shape, NO example collapses it at 2b (0/20: fences, trailing
  // newlines, directory-as-path — instruction qualifiers don't override
  // chat-code defaults, only shown shapes do). Kept, fake, pinned.
  assert.match(PROPOSAL_FORMAT, /Worked example/);
  assert.match(PROPOSAL_FORMAT, /every name below is fake/);
  assert.doesNotMatch(PROPOSAL_FORMAT, /def stub\(\)/);
});
