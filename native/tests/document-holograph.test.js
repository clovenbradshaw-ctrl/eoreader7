import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDocumentHolograph, requireDocumentHolographFold } from "../eval/the-fold/lib/document-holograph.mjs";
import { FoldUnavailableError } from "../eval/the-fold/lib/fold-sibling.mjs";
import { diaNorm, namesCorefer } from "../adapters/text/surfaces.js";
import { dmdWindow } from "../kernel/activation.js";

// A DRIVER REFUSES WHAT ITS CHECKOUT LACKS (READING-SPEC S65 / the-fold
// P95): the holograph computes through the sibling the-fold checkout's
// reading-log.js, activation-retrieval.js and resolutions.js. Caught once,
// here, so every test below is a real, reported skip rather than the whole
// file crashing at import (precedent: tests/void-rezero-stream.test.js).
let SKIP;
try {
  requireDocumentHolographFold();
} catch (err) {
  if (!(err instanceof FoldUnavailableError)) throw err;
  SKIP = err.message;
}

const TEXT = "Alice built a bridge.";
const END = TEXT.length;
const readingEntries = [
  { schema: "Encounter@1", source: "fixture.txt", modality: "text", anchor: { start: 0, end: END }, material: TEXT, sequencePosition: 0 },
  { schema: "EOMention@1", id: "mention:0:alice", referent: "ref:alice", encounterRef: "encounter:0", source: "fixture.txt", anchor: { start: 0, end: 5 } },
  { schema: "Observation@1", graphEntries: [{ schema: "EOReferent@1", id: "ref:alice", surfaces: ["Alice"], provenance: [], fedBy: [] }] },
];
const note = { subject: "Alice", label: "built", object: "a bridge", witnesses: [`fixture.txt#0-${END}~recipe`], spans: [{ at: `fixture.txt#0-${END}`, text: TEXT }] };

test("document holograph projects constitutional identity, cuts the Lens, and verifies bytes", { skip: SKIP }, () => {
  const out = computeDocumentHolograph({ question: "What does the document say about Alice?", readingEntries, notes: [note], sources: { "fixture.txt": TEXT }, organs: { diaNorm, namesCorefer } });
  assert.equal(out.basis, "constitutional_reading");
  assert.equal(out.active[0].surface, "Alice");
  assert.equal(out.lens.selected.length, 1);
  assert.equal(out.addressChecks.groundingPassagesExact, 1);
  assert.equal(out.grounding.passages[0].text, TEXT);
  assert.equal(out.grounding.passages[0].ref, `fixture.txt#0-${END}`);
});

test("document holograph refuses a span that does not read back", { skip: SKIP }, () => {
  const bad = { ...note, spans: [{ at: `fixture.txt#0-${END}`, text: "Alice invented a bridge." }] };
  const out = computeDocumentHolograph({ question: "What does the document say about Alice?", readingEntries, notes: [bad], sources: { "fixture.txt": TEXT }, organs: { diaNorm, namesCorefer } });
  assert.equal(out.basis, "typed_gap");
  assert.equal(out.gap, "address_verification_failed");
});
