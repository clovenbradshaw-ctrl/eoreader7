// referent-verify-falsify.test.mjs — THE FALSIFICATION TIER for the law:
//
//   "a sentence is admitted only when every capitalized name it carries is
//   grounded — nothing is held unattributed" (the constitution, §III).
//
// The gate is a MECHANICAL fact, not a judgment: the same sentence over the
// same ground yields the same verdict every time. Each test attacks a
// consequence the law must survive; the first pass is expected to fail
// somewhere (Popper, via the constitution §V: "the first pass nearly always
// fails"), and the surviving shape is the one that names its dissents.
import test from "node:test";
import assert from "node:assert/strict";
import {
  inventedNameRuns,
  referentVerified,
  isMetaSentence,
  admitSentence,
} from "./referent-verify.js";

const GROUND = [
  "The Cumberland River is a major waterway of the southeastern United States.",
  "It flows 688 miles from its headwaters in the Appalachian foothills of eastern Kentucky.",
  "The river drains a basin of about 18,000 square miles.",
  "Native American peoples including the Cherokee, Chickasaw, and Shawnee used the Cumberland.",
  "The river's name comes from the 1750 expedition of Dr. Thomas Walker, who named it for the Duke of Cumberland.",
  "Nashville's founding in 1779 by James Robertson and John Donelson was tied directly to the river.",
  "The Port of Nashville handles barge traffic.",
  "The Cumberland's locks and dams are built by the U.S. Army Corps of Engineers.",
].join(" ");

// ── V1  THE INVENTED NAME IS REFUSED. A sentence carrying a capitalized name
// the ground has never seen is cut. This is the 2026-09-21 hallucination:
// "Thomas Vanderbilt", "Thomas Duke", "Thomas Jefferson ... Duke's Creek".
test("V1 — invented referents are refused: Thomas Duke / Vanderbilt / Jefferson", () => {
  assert.ok(!referentVerified("Thomas Vanderbilt named the river after his family's home in Cumberland County.", GROUND), "Thomas Vanderbilt is invented — refused");
  assert.ok(!referentVerified("Thomas Duke, a prominent figure in the region's history, shaped the river's economy.", GROUND), "Thomas Duke is invented — refused");
  assert.ok(!referentVerified("Thomas Jefferson, in his 1800s survey of the state, named the river's source Duke's Creek.", GROUND), "Thomas Jefferson is invented — refused");
  assert.ok(!referentVerified("Thomas named Duke played a significant role in the development of the river's economy.", GROUND), "Thomas Duke (split) is invented — refused");
});

// ── V2  THE GROUNDED NAME PASSES. The real names from the workspace survive:
// Walker, the Duke of Cumberland, Robertson, Donelson, Cherokee, Nashville.
test("V2 — grounded names pass: Walker, Duke of Cumberland, Robertson, Donelson, Cherokee", () => {
  assert.ok(referentVerified("Dr. Thomas Walker named it for the Duke of Cumberland in 1750.", GROUND), "Walker + Duke of Cumberland are in the ground — admitted");
  assert.ok(referentVerified("James Robertson and John Donelson founded Nashville in 1779.", GROUND), "Robertson + Donelson are in the ground — admitted");
  assert.ok(referentVerified("Native American peoples including the Cherokee, Chickasaw, and Shawnee used the Cumberland as a route for trade.", GROUND), "Cherokee, Chickasaw, Shawnee are grounded — admitted");
  assert.ok(referentVerified("The river drains a basin of about 18,000 square miles.", GROUND), "no names at all — admitted");
});

// ── V3  PUNCTUATION BREAKS RUNS. Stripping punctuation must not glue "Cherokee,
// Chickasaw, and Shawnee" into one invented run; commas separate names.
test("V3 — punctuation breaks name runs; a comma-separated list is three grounded names", () => {
  const inv = inventedNameRuns("Native American peoples including the Cherokee, Chickasaw, and Shawnee used the Cumberland.", GROUND);
  assert.ok(!inv.some((r) => r.join(" ").toLowerCase() === "cherokee chickasaw shawnee"), "comma-separated names are never one run");
});

// ── V4  A TWO-WORD RUN IS A SINGLE NAME, TESTED WHOLE. "Thomas Duke" dies even
// though "Duke" alone is grounded — the whole sequence must appear.
test("V4 — a two-word run is tested whole: 'Duke' grounded does not admit 'Thomas Duke'", () => {
  assert.ok(!referentVerified("Thomas Duke, a prominent figure, shaped the river's economy.", GROUND), "the whole run 'Thomas Duke' is absent — refused");
  assert.ok(referentVerified("It was named for the Duke of Cumberland.", GROUND), "'the Duke of Cumberland' is grounded — admitted");
});

// ── V5  SENTENCE-INITIAL CAPITALS OF ORDINARY PROSE ARE NOT NAMES. "The river
// flows...", "In 1779..." open with ordinary capitalization.
test("V5 — sentence-initial ordinary capitals are not names", () => {
  assert.ok(referentVerified("The river's name comes from the 1750 expedition of Dr. Thomas Walker.", GROUND), "'The' opens the sentence — admitted");
  assert.ok(referentVerified("In 1779 the settlement was founded directly on the river.", GROUND), "'In' opens the sentence — admitted");
});

// ── V6  THE META-SENTENCE IS REFUSED. The mouth writes the piece; it does not
// talk about writing it. This is the other 2026-09-21 leak: "The user is
// requested to write about the Cumberland River."
test("V6 — meta-sentences are refused mechanically", () => {
  assert.ok(isMetaSentence("The user is requested to write about the Cumberland River."), "meta — refused");
  assert.ok(isMetaSentence("The essay will explore its significance."), "meta — refused");
  assert.ok(isMetaSentence("This essay is a subject of ongoing study."), "meta — refused");
  assert.ok(isMetaSentence("The essay's subject is the Cumberland River in Nashville."), "meta — refused");
  assert.ok(!isMetaSentence("The Cumberland River's flow cuts through the heart of Nashville."), "prose — admitted");
});

// ── V7  THE ADMISSION IS A TOTAL MECHANICAL FACT. A sentence repeated against
// the registry is refused as a repeated claim; the same sentence over the same
// ground and registry yields the same verdict every time.
test("V7 — admission is deterministic and refuses repeated claims via the registry", () => {
  const coreOf = (s) => String(s).toLowerCase().replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ").trim().split(" ").filter((w) => w.length > 3).slice(0, 6).join(" ");
  const registry = new Set([coreOf("The river drains a basin of about 18,000 square miles.")]);
  const first = admitSentence("The river drains a basin of about 18,000 square miles and connects the interior South to the Ohio.", { ground: GROUND, usedSentences: registry, claimCoreOf: coreOf });
  assert.ok(!first.admit, "repeats a deposited claim — refused");
  assert.ok(first.refused.some((r) => r.kind === "repeated_claim"), "the refusal names the reason");
  assert.ok(first.refused.every((r) => r.given === "model"), "every refusal is attributed — its given is the model");
  const fresh = admitSentence("The Port of Nashville handles barge traffic moving bulk commodities.", { ground: GROUND, usedSentences: registry, claimCoreOf: coreOf });
  assert.ok(fresh.admit, "a fresh grounded non-meta sentence is admitted");
  assert.deepEqual(fresh.refused, [], "no refusals on admission");
  const again = admitSentence("The Port of Nashville handles barge traffic moving bulk commodities.", { ground: GROUND, usedSentences: registry, claimCoreOf: coreOf });
  assert.ok(again.admit, "deterministic: the same sentence over the same state admits identically");
});

// ── V8  THE GATE IS PURE — the SAME sentence over the SAME ground yields the
// SAME verdict, and the ground text is the ONLY text that grounds (never the
// sentence itself, never the gate's own words).
test("V8 — the gate is pure and grounds only on the ground", () => {
  const s = "Bratwurst University's quarterly report details the river's flow.";
  assert.ok(!referentVerified(s, GROUND), "Bratwurst University is invented — refused against the workspace ground");
  const other = "Bratwurst University is a fictional school mentioned in the source.";
  assert.ok(referentVerified(other, "The source mentions Bratwurst University."), "grounded in a ground that contains it — admitted");
  assert.equal(inventedNameRuns(s, GROUND).length, inventedNameRuns(s, GROUND).length, "pure: identical inputs, identical outputs");
});

// ── V9  ALL CONTENT HAS A GIVEN — A REFUSED RUN IS ATTRIBUTED, NEVER VANISHED
// (2026-09-21, the user's law: "all content has a given, if it's the model,
// that's the source"). A name the field has no trace of is NOT deleted — its
// given IS the model, disclosed in the refusal. The losing reading is kept,
// exactly as the constitution §V requires.
test("V9 — every refused run carries its given: the model; refusal is disclosure, not deletion", () => {
  const inv = inventedNameRuns("Thomas Vanderbilt named the river.", GROUND);
  assert.ok(inv.length >= 1, "the invented name is detected");
  assert.ok(inv.every((v) => v.given === "model"), "each invented name is attributed to the model — the field held no trace of it");
  assert.ok(inv.some((v) => v.name === "thomas vanderbilt"), "the refused name itself is kept in the record, never deleted");
  // A grounded name carries NO invented attribution — it was not the model's.
  const none = inventedNameRuns("James Robertson and John Donelson founded Nashville.", GROUND);
  assert.equal(none.length, 0, "grounded names are not attributed to the model");
  // The full admission discloses the given on every refusal.
  const adm = admitSentence("Thomas Duke, a prominent figure, shaped the river's economy.", { ground: GROUND });
  assert.ok(!adm.admit, "fabricated — refused");
  const ref = adm.refused.find((r) => r.kind === "invented_referent");
  assert.ok(ref, "the invented_referent refusal is present");
  assert.equal(ref.given, "model", "the refusal's given is the model — its source is disclosed");
  assert.ok(Array.isArray(ref.names) && ref.names.length >= 1, "the names are kept in the refusal");
});

// ── V10  THE ASSISTANT-VOICE FILTER (2026-09-24) — a second, distinct
// discourse register from V6's task-meta sentences: the mouth talking AS A
// CHAT ASSISTANT (turn-taking, offering to help) rather than writing the
// piece. Every sentence here is verbatim from a real piece on two real
// pipeline runs this session (surf-wp-fwd-b, surf-wp-fixed-web-1), not
// constructed from a guess at what scaffolding looks like.
test("V10 — assistant-voice scaffolding is refused mechanically, real prose is not", () => {
  assert.ok(isMetaSentence("Here's a breakdown of the provided text, formatted into lines, incorporating the facts you've given:"), "chat-assistant framing — refused");
  assert.ok(isMetaSentence("Let me know if you'd like me to expand on any of these points or if you have any other text you'd like to work with!"), "offer to continue helping — refused");
  assert.ok(isMetaSentence("Here's a breakdown of the white paper excerpt, presented in lines, incorporating the facts you provided:"), "chat-assistant framing (second real run) — refused");
  assert.ok(isMetaSentence("Let me know if you'd like me to expand on any of these points or if you have any other questions!"), "offer to continue helping (second real run) — refused");
  assert.ok(isMetaSentence("Here's why this rewrite works:"), "meta-commentary about the mouth's own rewrite — refused");
  assert.ok(isMetaSentence("How to continue the piece:"), "meta-instruction about continuing the piece — refused");
  // The control: ordinary technical prose that shares no vocabulary with
  // either discourse register must be admitted, not swept up by an
  // over-broad pattern.
  assert.ok(!isMetaSentence("SURF derives its two hunts entirely from the void's own words, never from external configuration."), "ordinary technical prose — admitted");
});