// framing-adoption.test.mjs — THE FALSIFICATION TIER for the law:
//
//   "a stored framing is POSSIBILITY; it becomes PROBABILITY only when it was
//    recorded under a gate that refuses the prompt's own words."
//
// The measured defect (2026-09-21). The discovery prompt handed the mouth a
// concrete NARRATIVE command as an `e.g.` for every genre:
//
//   "Begin in the middle of a concrete moment, in a real place, showing the
//    senses; never a thesis, never a summary, never name the genre or the
//    structure."
//
// A 2b mouth copies an example. BOTH stored exposition framings in the live
// sidecar carry that sentence verbatim, so every essay run inherited a story
// voice that forbids a thesis — which is why an essay about a river opened on
// a skyline "like a defiant fist against the sky". `stagingIsMachinery`
// already purged the sibling defect one field over (staging that echoed the
// machine's own basis prose); nothing checked the voice.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  framingFor, appendFraming, voiceIsEchoedExample, voiceIsSample, FRAMING_GATE,
} from "./fortune-prior.js";

const ECHOED = "Begin in the middle of a concrete moment, in a real place, showing the senses; never a thesis, never a summary, never name the genre or the structure.";
const REAL_VOICE = { opening: "State the claim the piece will defend before any evidence.", body: "Give the next piece of evidence and say what it establishes." };
const priorWith = (entries) => ({ schema: "FortunePrior@1", standing: "received", giver: null, compiledAt: null, entries, byGenre: {}, byMedium: {}, byShape: {} });
const entry = (genre, framing, medium = "text") => ({ genre, medium, framing });

test("THE MEASURED DEFECT: the prompt's own example is recognised as an echo", () => {
  assert.equal(voiceIsEchoedExample({ opening: ECHOED, body: "x" }), true);
  assert.equal(voiceIsEchoedExample({ opening: `  ${ECHOED.toUpperCase()}  `, body: "x" }), true, "case and spacing must not hide it");
  assert.equal(voiceIsEchoedExample(REAL_VOICE), false, "a genuine command was called an echo");
  assert.equal(voiceIsEchoedExample(null), false);
});

test("a voice that is a line of the piece, not a command about writing, is a sample", () => {
  assert.equal(voiceIsSample({ opening: "The salt spray stings Thomas's face as the ship throws him against the railing." }), true);
  assert.equal(voiceIsSample(REAL_VOICE), false, "a genuine command was called a sample");
  // THE CEILING, STATED: capitalisation is the signal, so a caseless script
  // gets no guard here and must say so rather than pretend.
  assert.equal(voiceIsSample({ opening: "汽船每年春天沿河运送棉花。" }), false, "a caseless script cannot be judged by case");
});

test("PROVENANCE IS THE RULE: an ungated framing is never adopted, however clean it looks", () => {
  const adopted = framingFor(priorWith([entry("exposition", { staging: ["a", "b"], writeVoice: REAL_VOICE })]), { genre: "exposition", medium: "text" });
  assert.equal(adopted, null, "an ungated entry became the voice a piece is written in");
});

test("a framing recorded through appendFraming carries the gate and IS adopted", () => {
  const prior = appendFraming(priorWith([]), { genre: "exposition", medium: "text", framing: { staging: ["a", "b"], writeVoice: REAL_VOICE }, basis: "t", giver: "model" });
  const adopted = framingFor(prior, { genre: "exposition", medium: "text" });
  assert.ok(adopted, "a gated entry was not adopted");
  assert.equal(adopted.framing.gate, FRAMING_GATE);
  assert.match(adopted.framing.writeVoice.opening, /State the claim/);
});

test("the gate does not rescue an echo or a sample that was recorded through it", () => {
  for (const bad of [{ opening: ECHOED, body: "x" }, { opening: "The rain falls on Elm Street, each drop a hammer." }]) {
    const prior = appendFraming(priorWith([]), { genre: "exposition", medium: "text", framing: { staging: ["a"], writeVoice: bad }, basis: "t", giver: "model" });
    assert.equal(framingFor(prior, { genre: "exposition", medium: "text" }), null, `adopted a bad voice: ${bad.opening.slice(0, 40)}`);
  }
});

test("the last GATED framing wins, and an ungated later entry cannot displace it", () => {
  let prior = appendFraming(priorWith([]), { genre: "exposition", medium: "text", framing: { staging: ["a"], writeVoice: REAL_VOICE }, basis: "first", giver: "model" });
  prior = { ...prior, entries: [...prior.entries, entry("exposition", { staging: ["z"], writeVoice: { opening: "Later but ungated." } })] };
  const adopted = framingFor(prior, { genre: "exposition", medium: "text" });
  assert.match(adopted.framing.writeVoice.opening, /State the claim/, "an ungated later entry displaced a gated one");
});

test("THE LIVE SIDECAR: no pre-gate framing is ever adopted, and no adopted one is an echo or a sample", async () => {
  const { loadSidecar } = await import("./prior-query.js");
  const prior = loadSidecar();
  if (!prior?.entries?.length) return; // no sidecar on this machine — nothing to pin
  const genres = [...new Set(prior.entries.filter((e) => e.framing).map((e) => e.genre))];
  assert.ok(genres.length >= 1, "the live sidecar should hold the entries this test was written against");
  for (const genre of genres) {
    for (const medium of ["text", "video"]) {
      const a = framingFor(prior, { genre, medium });
      if (!a) continue;
      assert.equal(a.framing.gate, FRAMING_GATE, `${genre}/${medium}: a pre-gate framing was adopted`);
      assert.equal(voiceIsEchoedExample(a.framing.writeVoice), false, `${genre}/${medium}: adopted an echo`);
      assert.equal(voiceIsSample(a.framing.writeVoice), false, `${genre}/${medium}: adopted a sample`);
    }
  }
});

test("ADDITIVE ONLY: a discovered voice stands aside for a field the register declares", async () => {
  const { voiceIsDeclaredFor } = await import("./register.js");
  // The measured pair: the declared exposition voice opens with a thesis; the
  // discovered one, asked a story question, forbids one.
  assert.equal(voiceIsDeclaredFor({ field: { field: "exposition" } }), true);
  assert.equal(voiceIsDeclaredFor({ field: { field: "narrative" } }), true);
  assert.equal(voiceIsDeclaredFor({ field: { field: "recipe" } }), false, "an undeclared field must still be fillable by discovery");
  assert.equal(voiceIsDeclaredFor({}), false);
});
