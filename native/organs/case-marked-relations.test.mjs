// case-marked-relations.test.mjs — makeCaseMarkedRelationReader, against
// eoreader7's real native organs (spans.js + relations-case-marked.js).
// A separate file on purpose, the same precedent hyperlexicon-stance.test.mjs
// and arrangement.test.mjs already established: files reaching the frozen
// legacy submodule cannot load in this checkout, so anything real-organ-
// driven that does not need it lives on its own.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeCaseMarkedRelationReader } from "./hypergraph.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");

async function loadOrgans() {
  const spans = await import(path.join(NATIVE, "adapters/text/spans.js"));
  const latin = await import(path.join(NATIVE, "adapters/text/relations-case-marked.js"));
  const relationsFor = makeCaseMarkedRelationReader({
    splitSentences: spans.splitSentences,
    extractCaseMarkedRelation: latin.extractCaseMarkedRelation,
  });
  return { relationsFor };
}

test("declared organs required — never a silent private reimplementation", () => {
  assert.throws(() => makeCaseMarkedRelationReader({}), /splitSentences is injected/);
  assert.throws(() => makeCaseMarkedRelationReader({ splitSentences: () => [] }), /extractCaseMarkedRelation is injected/);
});

test("a real VOS (verb-object-subject) Latin sentence binds correctly, with byte-accurate spans", async () => {
  const { relationsFor } = await loadOrgans();
  const text = "possedit cetera pontus.";
  const report = relationsFor([{ ref: "ovid.txt", text }]);
  assert.equal(report.edges.length, 1);
  const [e] = report.edges;
  assert.equal(e.end1, "pontus");
  assert.equal(e.label, "possedit");
  assert.equal(e.end2, "cetera");
  assert.equal(e.end1Detail.case, "Nom");
  assert.equal(e.end2Detail.case, "Acc");
  // The span must address the SOURCE bytes, not a re-typed copy (P5.2's
  // own self-verification discipline, applied here).
  const span = e.spans[0];
  assert.equal(text.slice(span.start, span.end), span.text);
  assert.equal(span.ref, "ovid.txt");
});

test("the shape is {end1, label, end2} natively -- never subject/verb/object (P72's whole point, checked at the integration boundary too)", async () => {
  const { relationsFor } = await loadOrgans();
  const report = relationsFor([{ ref: "a.txt", text: "Maxima pars unda rapitur." }]);
  for (const e of report.edges) {
    assert.ok(!("subject" in e) && !("verb" in e) && !("object" in e));
    assert.ok("end1" in e && "label" in e && "end2" in e);
  }
});

test("a gap is a real, reported result -- never silently dropped from the reading", async () => {
  const { relationsFor } = await loadOrgans();
  // A multi-verb sentence is out of this organ's declared scope (clause
  // segmentation, unbuilt) -- it must surface as a gap, not vanish.
  const report = relationsFor([{ ref: "b.txt", text: "Latet arbore opaca aureus et foliis et lento vimine ramus." }]);
  assert.equal(report.edges.length, 0);
  assert.equal(report.gaps.length, 1);
  assert.equal(report.gaps[0].gap?.reason, "ambiguous_verb");
  assert.equal(report.gaps[0].ref, "b.txt");
});

test("multiple passages and multiple sentences per passage all get read", async () => {
  const { relationsFor } = await loadOrgans();
  const report = relationsFor([
    { ref: "a.txt", text: "possedit cetera pontus." },
    { ref: "b.txt", text: "Maxima pars unda rapitur." },
  ]);
  assert.equal(report.edges.length, 2);
  assert.deepEqual(report.edges.map((e) => e.refs[0]).sort(), ["a.txt", "b.txt"]);
});
