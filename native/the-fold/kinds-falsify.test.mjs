// kinds-falsify.test.mjs — THE FIRST DEDICATED TEST OF kinds.js (2026-09-21).
//
// The user, auditing the pipeline's own confidence: "how confident are we of
// the prior steps? we need to prove they are stable and have useful products
// at those steps." kinds.js had been exercised only by eyeballing live runs
// (the OHS "6 alike" risk ratings at p = 0.008) — zero direct or indirect
// tests existed. This is that gap closed: a real positive case (a ground
// with a genuine repeated-label series, verified against the actual
// function's output before being written as an assertion, not assumed), a
// real null case (a ground with no repeated structure at all — the organ
// must find nothing, not invent a kind to have something to report), and
// the two smaller exported functions (labelOf, kindSentence) that the
// arrangement and flesh phases both read directly.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { statementKinds, saturatingSpans, kindSentence, labelOf } from "./kinds.js";

const TASK = "Write a piece from this material.";
const draft = (ground) => attachReferents(buildDraft({ task: TASK, ground }), buildReferents(ground));

test("labelOf reads an enumerated series label, and only that shape", () => {
  assert.equal(labelOf("Observation B, Coordinated Entry Policies and Procedures."), "observation");
  assert.equal(labelOf("Recommendation D.1, on ensuring access..."), "recommendation");
  assert.equal(labelOf("Item 3: something."), "item");
  assert.equal(labelOf("The office serves the county."), null, "an ordinary sentence has no label");
  // A colon-label with no enumerator ("Status:", "Note:") is NOT the same
  // shape as an enumerated series — labelOf must not confuse the two (the
  // referent organ's own colon-label gap, corrupting a real piece the same
  // night this was written, is a DIFFERENT bug in a DIFFERENT module).
  assert.equal(labelOf("Status: Implemented."), null);
});

test("kindSentence states the count in words, singular for one, and nothing for an unlabeled kind", () => {
  assert.equal(kindSentence({ members: [1], label: "observation" }), "one observation");
  assert.equal(kindSentence({ members: [1, 2, 3, 4, 5, 6], label: "observation" }), "six observations");
  assert.equal(kindSentence({ members: [1, 2], label: "recommendation" }), "two recommendations");
  assert.equal(kindSentence({ members: [1, 2], label: null }), null);
});

test("a real repeated-label series is found, and its members are exactly the series — nothing more, nothing less", () => {
  const ground = [
    "The city commissioned a review of its parks.",
    "",
    "Observation A: the playground equipment at Elm Park is unsafe. Observation B: the restrooms at Elm Park are closed. Observation C: the parking lot at Elm Park floods.",
    "",
    "The review also covered budget matters unrelated to any observation.",
  ].join("\n");
  const d = draft(ground);
  const K = statementKinds(d);
  assert.equal(K.kinds.length, 1, "exactly one kind: the observation series");
  const k = K.kinds[0];
  assert.deepEqual(k.members, ["p2.1", "p2.2", "p2.3"]);
  assert.equal(k.label, "observation");
  assert.equal(kindSentence(k), "three observations");
  // On a ground this small (5 statements) the cohesion null lacks the
  // population for its permutation test to have power — measured: it does
  // NOT clear here (pValue 1, cleared false) even though the clustering is
  // exactly right. This is not a bug to route around with a bigger
  // synthetic ground; it is a real, documented property of the null (see
  // the next test for a scale where the same null genuinely clears).
  assert.equal(k.cleared, false, "too few entities for the null to discriminate at this scale — expected, not a defect");
});

test("at real document scale, the same null genuinely clears — not asserted, measured on a committed fixture", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const ground = fs.readFileSync(path.join(here, "..", "eval", "the-fold", "fixtures", "ohs-followup-audit.md"), "utf8");
  const d = draft(ground);
  const K = statementKinds(d);
  const cleared = K.kinds.filter((k) => k.cleared);
  assert.ok(cleared.length >= 1, "at least one candidate clears the null on real document scale");
  for (const k of cleared) assert.ok(k.pValue <= 0.01, `p=${k.pValue} should be well under the 0.05 the null is read against`);
});

test("A REAL GAP, PROVEN NOT ASSUMED: a value-repeated series (\"Status: Implemented.\" x7) clusters and clears the null, but gets NO label and NO kind sentence, because labelOf only reads enumerator series — every current caller (flesh2.js, skeleton-arms.mjs) filters on kindSentence's truthiness and silently drops it", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const ground = fs.readFileSync(path.join(here, "..", "eval", "the-fold", "fixtures", "ohs-followup-audit.md"), "utf8");
  const d = draft(ground);
  const K = statementKinds(d);
  const statusKind = K.kinds.find((k) => k.cleared && k.members.length === 7);
  assert.ok(statusKind, "the status series is found and clears");
  assert.equal(statusKind.label, null, "no majority enumerator label — 'Status:' is a value field, not a series prefix");
  assert.equal(kindSentence(statusKind), null, "so kindSentence has nothing to say about a real, cleared kind");
});

test("THE NULL: a ground with no repeated structure yields no kinds — measured, not assumed", () => {
  const ground = [
    "The river flows south.",
    "",
    "A bridge crosses it near the mill. The mill closed in 1950. Fishermen still gather at dawn.",
  ].join("\n");
  const d = draft(ground);
  const K = statementKinds(d);
  assert.equal(K.kinds.length, 0, "nothing here repeats; the organ must not invent a kind to have something to report");
});

test("saturatingSpans picks the statement with the most new beings/figures first, and stops adding once nothing is new", () => {
  const ground = [
    "Alpha visited the museum.",
    "",
    "Alpha spoke with Beta. Beta and Gamma discussed the exhibit. The exhibit closed in 1999.",
  ].join("\n");
  const d = draft(ground);
  const ids = drawnParts(d).flatMap((p) => p.children.map((pt) => pt.id));
  const spans = saturatingSpans(ids, d);
  // p1.1 ("Alpha visited the museum") is excluded: once p2.1 is picked
  // (Alpha AND Beta, the higher-gain statement), Alpha is already shown and
  // "museum" is not a referent, so p1.1 adds nothing new — greedy, not a bug.
  assert.deepEqual(spans.map((s) => s.id), ["p2.1", "p2.2", "p2.3"]);
});

test("without a referent resolver, saturatingSpans still returns something rather than throwing", () => {
  const ground = "Alpha visited the museum.\n\nAlpha spoke with Beta.";
  const d = buildDraft({ task: TASK, ground }); // no attachReferents
  const ids = drawnParts(d).flatMap((p) => p.children.map((pt) => pt.id));
  assert.doesNotThrow(() => saturatingSpans(ids, d));
});
