// cast.test.mjs — the furniture wall (2026-09-04): a caller that opts in by
// passing `blankFurniture` gets a passage's page-scoped `.blanked` copy
// instead of its raw `.text`; a caller that does not is untouched, even when
// the SAME passages carry a `.blanked` field for a different consumer's
// sake — the same "reader's own organ is authoritative" rule
// source-page-blanking.test.mjs already holds hypergraph.js to.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeCastHandles, makeReferentIndex } from "./cast.js";
import { chunkSource, blankLabelRows } from "./source.js";
import { extractReadable } from "./web.js";
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";

const ORGANS = { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm };
const FIX = new URL("../eval/the-fold/fixtures/", import.meta.url);
const blank = (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 });

test("BACKWARD COMPATIBLE: blankFurniture omitted entirely -> identical referents to today, whether or not a passage happens to carry .blanked", () => {
  const passages = [{ ref: "p", text: "Pierre Bezukhov walked into the salon. Natasha Rostova greeted him." }];
  const withBlanked = [{ ...passages[0], blanked: passages[0].text }]; // a no-op blanking, still present as a field
  const repsOf = (ps) => {
    const idx = makeReferentIndex(ORGANS)(ps); // no blankFurniture passed
    return [...idx.referents].map((id) => idx.represent(id)).sort();
  };
  assert.deepEqual(repsOf(passages), repsOf(withBlanked), ".blanked being present must change nothing when this caller never opted in");
});

test("A CALLER THAT NEVER ASKED FOR BLANKING DOES NOT GET IT FROM THE CHUNKER (mirrors source-page-blanking.test.mjs's own case for hypergraph.js)", () => {
  // Real navbox-shaped debris, chunked WITH page-level blankFurniture — so
  // .blanked exists on these passages — but THIS caller (no blankFurniture
  // passed to makeReferentIndex) must still read raw .text, because the
  // decision belongs to the reader, never to whichever unrelated caller
  // configured chunkSource.
  const text = "The council met on Tuesday.\n\nPreceded by\nBattle of Mesoten\nNapoleonic Wars\nBattle of Borodino\nSucceeded by\nFrench occupation of Moscow";
  const withPage = chunkSource("page", text, { blankFurniture: blank });
  assert.ok(withPage.some((p) => p.blanked != null), "the fixture must actually exercise withPageBlanking");

  const noOptIn = makeReferentIndex(ORGANS)(withPage); // blankFurniture NOT passed
  const reps = [...noOptIn.referents].map((id) => noOptIn.represent(id));
  assert.ok(reps.some((r) => /Mesoten/.test(r)), `a reader that never opted in must still see the unblanked debris: ${reps}`);
});

test("a passage's .blanked field is read INSTEAD of .text once this caller opts in", () => {
  // "Napoleon" deliberately never opens a sentence: extractSurfaces refuses
  // sentence-initial capitalisation at extraction (it carries no information
  // there), so a name used only as this test's "real referent" must sit
  // mid-sentence to be admitted as a candidate surface at all.
  const raw = "The army watched as Napoleon commanded the French. Soon Napoleon advanced on Moscow. " +
    "SPURIOUS Debris Referent appeared in the navbox here.";
  const debris = "SPURIOUS Debris Referent appeared in the navbox here.";
  const cleaned = raw.replace(debris, " ".repeat(debris.length));
  assert.equal(raw.length, cleaned.length, "test fixture itself must be length-preserving");
  const passages = [{ ref: "p", text: raw, blanked: cleaned }];

  const index = makeReferentIndex({ ...ORGANS, blankFurniture: blank })(passages);
  const reps = [...index.referents].map((id) => index.represent(id));
  assert.ok(!reps.some((r) => /SPURIOUS|Debris/.test(r)), `debris referent leaked through: ${reps}`);
  assert.ok(reps.some((r) => /Napoleon/.test(r)), "the real referent must still be found");

  const handles = makeCastHandles({ ...ORGANS, blankFurniture: blank })(passages);
  assert.ok(!handles.some((h) => /SPURIOUS|Debris/.test(h)), `makeCastHandles saw the same debris: ${handles}`);
});

test("opting in still refuses debris a caller never blanked in the first place — no silent rescue", () => {
  const passages = [{ ref: "p", text: "SPURIOUS Debris Referent, unrelated to Napoleon, appears alone here." }];
  const index = makeReferentIndex({ ...ORGANS, blankFurniture: blank })(passages); // opted in, but no .blanked field exists
  const reps = [...index.referents].map((id) => index.represent(id));
  assert.ok(reps.some((r) => /SPURIOUS|Debris/.test(r)), "opting in does not invent a .blanked field that chunkSource never produced");
});

test("REAL FIXTURE — the exact rashomon-contrast specimen: Barclay de Tolly and Pyotr Bagration no longer fuse into one referent", () => {
  const html = readFileSync(new URL("wikipedia-battle-of-borodino.html", FIX), "utf8");
  const text = extractReadable(html).text;

  const unblanked = chunkSource("wikipedia-borodino", text);
  const blanked = chunkSource("wikipedia-borodino", text, { blankFurniture: blank });
  assert.ok(blanked.some((p) => p.blanked != null), "the fixture must actually exercise withPageBlanking's .blanked field");

  const repsOf = (passages, optIn) => {
    const idx = makeReferentIndex(optIn ? { ...ORGANS, blankFurniture: blank } : ORGANS)(passages);
    return [...idx.referents].map((id) => idx.represent(id));
  };
  const before = repsOf(unblanked, false);
  const after = repsOf(blanked, true);

  const junk = /Mesoten|DOW\b/;
  assert.ok(before.some((r) => junk.test(r)), "the OLD (unblanked, opted-out) read must still show the measured defect");
  assert.ok(!after.some((r) => junk.test(r)), `the fixed, opted-in read still shows debris: ${after.filter((r) => junk.test(r))}`);
  assert.ok(before.some((r) => /Bagration/.test(r) && /Tolly/.test(r)), "the OLD read must show the actual fusion this bug produced");
  assert.ok(!after.some((r) => /Bagration/.test(r) && /Tolly/.test(r)), "Bagration and Tolly must no longer be one referent");
  assert.ok(after.some((r) => /Bagration/.test(r)), "Bagration must still be found");

  // And the SAME passages, read by a caller that never opts in, must be
  // untouched by the fact that .blanked exists on them at all.
  const stillRaw = repsOf(blanked, false);
  assert.deepEqual(stillRaw.sort(), before.sort(), "a chunk carrying .blanked changes nothing for a reader that never asked for it");
});
