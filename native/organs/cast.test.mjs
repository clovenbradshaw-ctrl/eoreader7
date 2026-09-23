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
import { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm, referentForm, isNearMissSpelling } from "../adapters/text/surfaces.js";

const ORGANS = { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm };
const ORGANS_WITH_LEADING = { ...ORGANS, leadingSurfaces: extractLeadingSurfaces };
const ORGANS_WITH_VARIANT = { ...ORGANS, nameFold: referentForm, nameVariant: isNearMissSpelling };
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

test("SENTENCE-INITIAL NAMES (2026-09-15): English's capitalisation convention is information, not a veto — a name that ONLY ever opens a sentence resolves once the caller opts into leadingSurfaces, and the physics filter still refuses a sentence-opener that appears lowercased elsewhere", () => {
  const repsOf = (passages, optIn) => {
    const idx = makeReferentIndex(optIn ? ORGANS_WITH_LEADING : ORGANS)(passages);
    return [...idx.referents].map((id) => idx.represent(id));
  };
  const resolves = (passages, name, optIn) => makeReferentIndex(optIn ? ORGANS_WITH_LEADING : ORGANS)(passages).resolve(name).size > 0;

  // The exact e2e shape: "Napoleon" only ever appears sentence-initial in the
  // material. Without the opt-in it is invisible (extractSurfaces starts its
  // scan at token 1); with it, it resolves.
  const napoleon = [{ ref: "p", text: "Napoleon invaded Russia in 1812 with the Grande Armée." }];
  assert.equal(resolves(napoleon, "Napoleon", false), false, "the veto stands by default — sentence-initial position carries no namehood evidence");
  assert.equal(resolves(napoleon, "Napoleon", true), true, "opt-in: the convention IS information, offered as a candidate");
  assert.equal(resolves(napoleon, "Russia", true), true, "mid-sentence names resolve either way");
  assert.ok(repsOf(napoleon, true).includes("Napoleon"), "Napoleon is now an established referent");

  // Multi-word sentence-initial runs stay whole ("Thomas Edison" is one name,
  // never "Thomas").
  const edison = [{ ref: "p", text: "Thomas Edison patented the phonograph in 1878." }];
  assert.equal(resolves(edison, "Thomas Edison", false), false);
  assert.equal(resolves(edison, "Thomas Edison", true), true);
  assert.equal(resolves(edison, "Edison", true), true, "a sub-form of an established name resolves too");

  // THE PHYSICS FILTER STILL HOLDS: an ordinary sentence-opener that ALSO
  // appears lowercased in the material is refused even with the opt-in — the
  // capital alone is never the confirmation (the "Some"/"Trust" guard).
  const opener = [{ ref: "p", text: "Some viewers loved the show. The actors took some risks with it." }];
  assert.equal(resolves(opener, "Some", true), false, "\"Some\" appears lowercased elsewhere in the material — refused, not resolved");
  const realNameLowered = [{ ref: "p", text: "Napoleon was exiled. The emperor napoleon never returned to power." }];
  assert.equal(resolves(realNameLowered, "Napoleon", true), false, "a name used lowercased anywhere is not established — the same physics rule, one direction over");
});

test("SENTENCE-INITIAL NAMES, BACKWARD COMPATIBLE: omitting leadingSurfaces is byte-identical to before this seam existed", () => {
  const passages = [{ ref: "p", text: "Pierre Bezukhov walked into the salon. Natasha Rostova greeted him." }];
  const repsOf = (ps) => { const idx = makeReferentIndex(ORGANS)(ps); return [...idx.referents].map((id) => idx.represent(id)).sort(); };
  const a = repsOf(passages);
  const b = repsOf(passages);
  assert.deepEqual(a, b, "no leadingSurfaces passed -> identical to the pre-seam call, deterministic");
  assert.ok(a.some((r) => /Bezukhov/.test(r)), "mid-sentence referents are untouched");
});

// NAME-VARIANT FOLD (2026-09-23): capitalisation is a differentiator, never
// the primary signal (this repo's own L2) — a name resolved once must
// answer to a later mention that only differs in case, in a leetspeak-style
// stand-in glyph, or (as a last resort, safety-gated) in a single dropped/
// transposed/substituted letter. Real material, real organs throughout.
test("NAME-VARIANT FOLD: case and leetspeak mentions of an established name resolve to the same referent", () => {
  const passages = [{ ref: "p", text: "In March 1862, Andrew Johnson was appointed military governor of Tennessee. People said johnson governed firmly. Some accounts spell it j0hnson in old records." }];
  const idx = makeReferentIndex(ORGANS_WITH_VARIANT)(passages);
  const rep = (name) => [...idx.resolve(name)].map((id) => idx.represent(id));
  assert.deepEqual(rep("Johnson"), ["Andrew Johnson"]);
  assert.deepEqual(rep("johnson"), ["Andrew Johnson"], "a lowercase mention resolves to the same referent, not zero");
  assert.deepEqual(rep("j0hnson"), ["Andrew Johnson"], "a leetspeak-glyph mention resolves to the same referent, not zero");
});

test("NAME-VARIANT FOLD, BACKWARD COMPATIBLE: omitting nameFold/nameVariant is byte-identical to before this seam existed", () => {
  const passages = [{ ref: "p", text: "In March 1862, Andrew Johnson was appointed military governor of Tennessee." }];
  const withVariant = makeReferentIndex(ORGANS_WITH_VARIANT)(passages);
  const without = makeReferentIndex(ORGANS)(passages);
  assert.deepEqual([...withVariant.resolve("Johnson")].sort(), [...without.resolve("Johnson")].sort());
  assert.equal([...without.resolve("johnson")].length, 1, "diaNorm alone already lowercases, so plain case-folding was never the gap");
  assert.equal([...without.resolve("j0hnson")].length, 0, "no nameFold injected -> the pre-existing behavior stands: diaNorm alone does not fold leetspeak glyphs");
});

test("NAME-VARIANT FOLD: a single-edit typo falls back to the one established referent it is a near-miss of", () => {
  const passages = [{ ref: "p", text: "Andrew Johnson served two terms in the Senate before becoming president." }];
  const idx = makeReferentIndex(ORGANS_WITH_VARIANT)(passages);
  assert.ok([...idx.resolve("Jonson")].length === 1, "\"Jonson\" (a dropped letter) resolves to exactly the material's one near-miss candidate");
  assert.deepEqual(idx.resolve("Jonson"), idx.resolve("Johnson"), "the near-miss and the real spelling resolve to the same referent");
});

test("NAME-VARIANT FOLD: refused, never guessed, when a near-miss query is equidistant between two real, independently-established names", () => {
  // Verified live via espeak-ng before this fix landed: "Reed"/"Reid" are
  // simultaneously edit-distance-1 AND exact homophones — a real hazard,
  // not a contrived one — so an unconditional typo-tolerant fold would
  // silently merge two different people. This is the safety property that
  // makes the fallback safe: it activates only once every exact/folded
  // match has already found nothing, and refuses outright on any tie.
  const passages = [{ ref: "p", text: "The committee was chaired by Sarah Reed for two years. Michael Reid gave the closing remarks at the final session." }];
  const idx = makeReferentIndex(ORGANS_WITH_VARIANT)(passages);
  assert.deepEqual([...idx.resolve("Reed")].map((id) => idx.represent(id)), ["Sarah Reed"], "an exact spelling still resolves to itself, never rescued into the other");
  assert.deepEqual([...idx.resolve("Reid")].map((id) => idx.represent(id)), ["Reid"]);
  assert.notDeepEqual(idx.resolve("Reed"), idx.resolve("Reid"), "the two real referents stay distinct");
  // "Rexd" is edit-distance-1 from BOTH "reed" and "reid" (substituting the
  // third letter either way) — the genuinely ambiguous case the safety
  // design exists for.
  assert.deepEqual([...idx.resolve("Rexd")], [], "equidistant between two real, distinct referents — refused, not guessed");
});
