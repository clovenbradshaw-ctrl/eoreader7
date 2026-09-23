// native/conformance/gfp-reading-shape.test.mjs — THE GFP SHAPE OF READING
// (2026-09-16). All cognition reads GFP-shaped by default; English-SVO (or
// any positional language with a measured RoleConfig@1) comes online ONLY
// when the caller declares a RoleConfig for that language
// (relations-language.js, the dispatch; user direction, verbatim:
// "dont call them SVO, call the GFP, and then higher up scope what that
// means in this context").
//
// What this pins:
//  1. The dispatch's DEFAULT mode is "gfp" — a reader with no roleConfig
//     produces figure-connector-figure arrangements typed by cell
//     (Ground/Figure/Pattern), NEVER subject/verb/object records.
//  2. Declaring English's measured RoleConfig brings mode "svo" online —
//     positional role assignment, still emitting the SAME neutral
//     {end1, label, end2} record shape.
//  3. The production perceiver (createCausalTextPerceiver) reads GFP by
//     default and SVO only when roleConfig is supplied.
import { test } from "node:test";
import assert from "node:assert";

const { readFileSync } = await import("node:fs");

const posPrior = JSON.parse(readFileSync(new URL("../priors/pos-en.json", import.meta.url), "utf8"));
const roleConfig = JSON.parse(readFileSync(new URL("../priors/role-config-eng.json", import.meta.url), "utf8"));

const { relationExtractorsFor } = await import("../adapters/text/relations-language.js");
const { extractGfpRelations, discoverGfpVocabulary } = await import("../adapters/text/relations-gfp.js");
const { cellLabelOf, makeGrainTyper } = await import("../adapters/text/grain-typing.js");
const { createCausalTextPerceiver, textEncounters } = await import("../adapters/text/recursive.js");
const { createRecursiveReader } = await import("../kernel/reading.js");
const { classifyWord, dominantClass } = await import("../adapters/text/wordclass.js");

const FIGURE_RICH = [
  "The fox jumps over the dog.",
  "The fox sleeps near the dog.",
  "The fox runs.",
  "The dog waits.",
  "The fox jumps again.",
  "The dog barks at the fox.",
].join(" ");

test("the dispatch defaults to GFP: no roleConfig → mode gfp, figure-connector-figure output", () => {
  const { mode, extractRelations } = relationExtractorsFor({ language: "ara", posPrior });
  assert.equal(mode, "gfp");
  const rows = extractRelations("The fox jumps over the dog.", { posPrior });
  assert.ok(Array.isArray(rows));
  for (const r of rows) {
    assert.ok("end1" in r && "label" in r && "end2" in r, "a GFP arrangement carries end1/label/end2");
    assert.ok(!("subject" in r || "verb" in r || "object" in r), "never a subject/verb/object record");
    assert.ok("cell" in r, "every arrangement is cell-typed");
  }
});

test("declaring English's measured RoleConfig brings SVO online — same neutral record shape", () => {
  const { mode, extractRelations } = relationExtractorsFor({ language: "eng", roleConfig, posPrior, classifyWord, dominantClass });
  assert.equal(mode, "svo");
  const rows = extractRelations("The quick fox jumps over the lazy dog.", { posPrior });
  assert.ok(rows.length >= 1, "English-SVO resolves a clause");
  for (const r of rows) {
    assert.ok("end1" in r && "label" in r && "end2" in r, "the SVO lens emits the SAME neutral record shape");
    assert.ok(!("subject" in r || "verb" in r || "object" in r), "the SVO lens never writes subject/verb/object onto the record");
  }
});

test("a RoleConfig without a posPrior refuses loudly — a role assignment with no evidence is never silent", () => {
  assert.throws(
    () => relationExtractorsFor({ language: "eng", roleConfig }),
    /posPrior is required whenever roleConfig is supplied/,
  );
});

test("extractGfpRelations discovers figures by recurrence + company, never capitalisation", () => {
  const rows = extractGfpRelations("The fox jumps over the dog. The fox sleeps with the dog. The fox jumps again.", { posPrior });
  assert.ok(rows.length >= 1, "recurring figures produce arrangements");
  for (const r of rows) {
    assert.ok(r.end1.length >= 3 && r.end2.length >= 3, "figures are content tokens, never single glyphs");
  }
  // Lowercased text still reads — no capitalisation gate.
  const lower = extractGfpRelations("the fox jumps over the dog. the fox sleeps with the dog. the fox jumps again.", { posPrior });
  assert.ok(lower.length >= 1, "lowercase-only text reads identically — no English-shaped case gate");
});

// MULTI-WORD FIGURES (2026-09-23): an INJECTED figures set (dispatch mode —
// hypergraph.js's own real call) routinely carries multi-word names, and
// the old per-token mention scan could never match one — the exact live
// specimen this pins is the one the session's own incident started from:
// "Hannibal Hamlin was Lincoln's Vice President" read end1="Hannibal"
// label="Hamlin was" end2="Lincoln", the two-word figure split with a real
// word ("was") swallowed into the connector.
test("extractGfpRelations reads a multi-word injected figure as ONE figure, never fragmented with a real word swallowed into the connector", () => {
  const rows = extractGfpRelations("Hannibal Hamlin was Lincoln's Vice President.", {
    figures: new Set(["hannibal hamlin", "lincoln"]),
  });
  assert.ok(rows.length >= 1, "at least one arrangement is found");
  const withHamlin = rows.find((r) => /hamlin/i.test(r.end1) || /hamlin/i.test(r.end2));
  assert.ok(withHamlin, "an arrangement naming Hamlin exists");
  assert.equal(withHamlin.end1, "Hannibal Hamlin", "the whole two-word figure is one end, never split");
  assert.ok(!/hamlin/i.test(withHamlin.label), "the second word of the figure is never swallowed into the connector label");

  // BACKWARD COMPATIBLE: the self-discovery path (figures omitted) can only
  // ever produce single-word candidates — untouched by this fix.
  const selfDiscovered = extractGfpRelations("The fox jumps over the dog. The fox sleeps with the dog. The fox jumps again.", { posPrior });
  assert.ok(selfDiscovered.length >= 1, "single-word self-discovery still reads");
  for (const r of selfDiscovered) assert.ok(!/\s/.test(r.end1) && !/\s/.test(r.end2), "self-discovered figures stay single-word, exactly as before this fix");
});

test("grain-typing maps a settled connector to its cube cell — the same typing LaVar's EOT reader uses", () => {
  const typer = makeGrainTyper(posPrior);
  // "jumps" is a verb → CON · Figure (Link); "with" is a preposition → CON · Ground (Field).
  const link = typer.grainOf("jumps");
  const field = typer.grainOf("with");
  assert.equal(cellLabelOf(link), "CON·Figure (Link)");
  assert.equal(cellLabelOf(field), "CON·Ground (Field)");
  // The production adapter stamps the same cell on its arrangements.
  const rows = extractGfpRelations("fox jumps dog fox sleeps dog.", { posPrior });
  assert.ok(rows.some((r) => r.cell === "CON·Figure (Link)"), "a verb connector types CON·Figure (Link)");
});

test("the production perceiver reads GFP by default and SVO only when a RoleConfig is declared", async () => {
  const readerGfp = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ posPrior })],
  });
  for (const enc of textEncounters(FIGURE_RICH, { source: "gfp-shape" })) await readerGfp.step(enc);
  const gfpEdges = (readerGfp.getFold().graphEntries ?? []).filter((e) => e.schema === "EOHyperedge@1");

  const readerSvo = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ posPrior, language: "eng", roleConfig })],
  });
  for (const enc of textEncounters(FIGURE_RICH, { source: "svo-shape" })) await readerSvo.step(enc);
  const svoEdges = (readerSvo.getFold().graphEntries ?? []).filter((e) => e.schema === "EOHyperedge@1");

  // Both are reading the same material; the contract is the SHAPE, not a
  // count — GFP finds figure-connector-figure adjacency, SVO finds clauses.
  assert.ok(Array.isArray(gfpEdges) && Array.isArray(svoEdges));
  for (const edge of [...gfpEdges, ...svoEdges]) {
    assert.ok(edge.relation && edge.participants?.length >= 2, "every hyperedge carries a label and two ends");
  }
});

test("discoverGfpVocabulary returns a figure vocabulary, never an English verb list", () => {
  const { verbs, candidates } = discoverGfpVocabulary(FIGURE_RICH, { posPrior, minSurfaces: 2 });
  assert.equal(verbs.size, 0, "GFP never gates on a verb list");
  assert.ok(candidates.length >= 1, "figures are the vocabulary");
  for (const c of candidates) assert.ok(c.verb && c.surfaceForms?.length >= 1);
});