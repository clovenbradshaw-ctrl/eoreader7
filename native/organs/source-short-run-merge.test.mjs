// source-short-run-merge.test.mjs — a run of short paragraphs (a label and
// the list it introduces) stays one chunk, instead of shredding into
// fragments retrieval can neither find nor read alone.
//
// Found live, 2026-09-10, driving the real chat page: "Who was Franklin D.
// Roosevelt's vice president?" answered Garner and Wallace, dropped Truman.
// Every message sent to the model was checked directly — none contained
// "Truman" — and the app's own saved fetch of the Wikipedia page (checked
// directly on disk) DOES state it, twice over: once in prose, and once in
// a "Cabinet of President Franklin D. Roosevelt" infobox list reading
// "Vice President / - John Nance Garner (1933-1941) / - Henry A. Wallace
// (1941-1945) / - Harry S. Truman (1945)". chunkProse's default blank-line
// split (unaffected here — this feature is opt-in) put each of those four
// lines in its own chunk: the 14-character label "Vice President" never
// even cleared the 20-char floor that keeps a chunk at all (dropped, not
// merged), and each bare name+date chunk shared no vocabulary with a
// question about "vice president" — unretrievable by construction, even
// though the fact was fetched successfully and sitting right there.
//
// A separate file because source.js has no dedicated suite of its own —
// source-page-blanking.test.mjs and source-atmosphere.test.mjs are its
// siblings, one file per chunking feature, same reason each states for
// itself.
import test from "node:test";
import assert from "node:assert/strict";
import { chunkSource } from "./source.js";

// A synthetic fixture, not the live gitignored web/pages/ file (this
// repo's own "no external corpus file" rule, source-atmosphere.test.mjs's
// own precedent) — shaped exactly like the real specimen: a genuine
// prose paragraph before and after, a short label, three short bulleted
// entries, a second short label to prove the run correctly STOPS there
// too rather than swallowing the next list whole.
const CABINET_PAGE = [
  "Roosevelt led the country through the Great Depression and the Second World War, serving four terms before his death in office in April 1945.",
  "Vice President",
  "- John Nance Garner (1933–1941)",
  "- Henry A. Wallace (1941–1945)",
  "- Harry S. Truman (1945)",
  "Secretary of State",
  "- Cordell Hull (1933–1944)",
  "The war in the Pacific continued for several more months after his death, ending with Japan's surrender in September 1945.",
].join("\n\n");

test("absent organ: chunking is byte-identical — every existing caller is untouched", () => {
  const plain = chunkSource("page", CABINET_PAGE);
  const same = chunkSource("page", CABINET_PAGE, {});
  assert.deepEqual(plain, same);
  // The known failure mode, reproduced first so the fix below is measured
  // against a real regression, not an assumed one: the label is dropped
  // (never clears the 20-char floor) and each name lands alone.
  assert.ok(!plain.some((c) => c.text.includes("Vice President")), "the label alone never clears the 20-char floor — it is dropped, not kept");
  const garner = plain.find((c) => c.text.includes("Garner"));
  const truman = plain.find((c) => c.text.includes("Truman"));
  assert.ok(garner && truman && garner !== truman, "each name is its own isolated chunk, sharing no vocabulary with the office that names them");
});

test("mergeShortRuns: the label and its whole list land in ONE retrievable chunk", () => {
  const chunks = chunkSource("page", CABINET_PAGE, { mergeShortRuns: true });
  const vp = chunks.filter((c) => c.text.includes("Vice President"));
  assert.equal(vp.length, 1, "one chunk carries the label — not the label alone and not one per name");
  assert.match(vp[0].text, /Vice President[\s\S]*Garner[\s\S]*Wallace[\s\S]*Truman/, "the label and all three names, in document order, together");

  // "Secretary of State" is ALSO a short paragraph, so it joins the SAME
  // run — this is deliberate, not a leak: nothing distinguishes "a new
  // list's own header" from "the same list continuing" at the paragraph
  // level, and the real Wikipedia specimen this closes merges its whole
  // adjacent cabinet roster the identical way — verified live to still
  // retrieve correctly (the merged chunk scores on "vice president" and
  // carries the names regardless of what else rides along). The one real
  // boundary is a genuinely long paragraph or the maxChars cap, both
  // covered by their own tests below.
  assert.ok(vp[0].text.includes("Secretary of State"), "an adjacent short list joins the same run — bounded by maxChars, not split on every new label");
});

test("a real prose paragraph either side of the short run is never absorbed into it", () => {
  const chunks = chunkSource("page", CABINET_PAGE, { mergeShortRuns: true });
  const lede = chunks.find((c) => c.text.startsWith("Roosevelt led"));
  const tail = chunks.find((c) => c.text.startsWith("The war in the Pacific"));
  assert.ok(lede && !lede.text.includes("Vice President"), "the long paragraph before the list stands alone");
  assert.ok(tail && !tail.text.includes("Secretary of State"), "the long paragraph after the list stands alone");
});

test("every merged chunk is a real, self-verifying slice of the source bytes (P5.2) — never a synthesized join", () => {
  const chunks = chunkSource("page", CABINET_PAGE, { mergeShortRuns: true });
  assert.ok(chunks.length > 2, "sanity: more than one chunk exists to check");
  for (const c of chunks) {
    assert.equal(CABINET_PAGE.slice(c.start, c.end).trim(), c.text, `${c.ref} does not read back from its own recorded span`);
  }
});

test("maxChars is a real, named safety cap — a long run of short paragraphs still splits, never grows without bound", () => {
  // 40 short bulleted entries, none individually long enough to end a run
  // on its own — without a cap this would be ONE chunk of ~1,300 characters
  // and growing; the declared default (1200) is a stated budget (P9), not
  // an assumed one.
  const longList = ["A roster."].concat(Array.from({ length: 40 }, (_, i) => `- Entry number ${i + 1} of the roster`)).join("\n\n");
  const chunks = chunkSource("page", longList, { mergeShortRuns: true });
  assert.ok(chunks.length > 1, "the run split at least once rather than becoming one unbounded chunk");
  for (const c of chunks) assert.ok(c.text.length <= 1200 + 200, `chunk exceeded the declared cap by more than one paragraph's own length: ${c.text.length}`);

  // The cap itself is declared, not hardcoded here — a caller may name a
  // smaller one.
  const tighter = chunkSource("page", longList, { mergeShortRuns: { maxChars: 200 } });
  assert.ok(tighter.length > chunks.length, "a smaller declared cap splits into more, smaller chunks");
});
