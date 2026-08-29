// spans-frontmatter.test.js — detectFrontMatterRun (S27), tested against
// real specimens, not synthetic fixtures alone. Every control case named by
// the two independent skeptics who verified this function before it shipped
// is pinned here as its own regression, so a future edit cannot silently
// reopen either safety hole they found.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectFrontMatterRun } from "../adapters/text/spans.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GUTENBERG = path.join(HERE, "..", "..", "..", "live_priors", "01-literature-books", "gutenberg");
const SHAKESPEARE = path.join(HERE, "..", "..", "..", "live_priors", "15-western-canon", "folger-shakespeare");

function readIfPresent(...segments) {
  const p = path.join(...segments);
  try { return fs.readFileSync(p, "utf8"); }
  catch { return null; }
}

// ── synthetic cases, always runnable regardless of sibling corpus presence ──

test("detects a real TOC-shaped run and skips to the prose that follows", () => {
  const toc = Array.from({ length: 10 }, (_, i) => `CHAPTER ${i + 1}—A HEADING`).join("\n\n");
  const prose = "In 1815, a man of about seventy-five years of age lived quietly in the town, and this detail, though it has no connection whatever with the substance of what we are about to relate, is worth mentioning here for the sake of exactness in all points, since precision of this kind matters more than it first appears to a careful reader of any real history.";
  const text = toc + "\n\n" + prose;
  const r = detectFrontMatterRun(text);
  assert.equal(r.detected, true);
  assert.equal(text.slice(r.skipTo).trimStart().startsWith("In 1815"), true);
  assert.equal(r.runLength, 10);
});

test("does not fire on ordinary prose with no TOC at all", () => {
  const text = "It was the best of times, it was the worst of times.\n\nIt was the age of wisdom, it was the age of foolishness.\n\nIt was the epoch of belief, it was the epoch of incredulity.";
  const r = detectFrontMatterRun(text);
  assert.equal(r.detected, false);
  assert.equal(r.skipTo, 0);
});

test("skeptic 1's counter-example: quote-terminated dialogue must NOT be misread as TOC-shaped", () => {
  // The bug: a naive /[.!?]$/ test fails on a line ending in a closing
  // curly quote, because the terminator sits BEFORE the quote character.
  const dialogue = [
    "“Not in the least.”",
    "“Nor running a chance of arrest?”",
    "“None whatever.”",
    "“Not even in Bohemia?”",
    "“Least of all in Bohemia.”",
    "“Then I congratulate you.”",
    "“I hope no complications will arise.”",
    "“None. All is over between us.”",
  ].join("\n\n");
  const long = "The rapid exchange continued for some minutes longer, each reply shorter than the last, until at length the visitor rose, gathered his coat about him, and departed without another word, leaving the room considerably quieter than it had been at any point since his arrival that evening.";
  const text = dialogue + "\n\n" + long;
  const r = detectFrontMatterRun(text);
  assert.equal(r.detected, false, "quote-terminated dialogue must never be misread as an unterminated TOC line");
});

test("skeptic 2's counter-example: a back-of-book index (short unterminated lines, deep in the document) must NOT fire — maxScanChars bounds the search", () => {
  const frontProse = "A".repeat(40000); // pushes the index-shaped run past any reasonable front-matter window
  const index = Array.from({ length: 20 }, (_, i) => `Entry ${i}, Some Place ${i}`).join("\n\n");
  const closingProse = "This is a genuinely long paragraph of real narrative prose that would, if the detector fired here, incorrectly relocate the excerpt window into the back matter of the book rather than leaving it alone entirely, which is exactly the failure mode this test exists to forbid.";
  const text = frontProse + "\n\n" + index + "\n\n" + closingProse;
  const r = detectFrontMatterRun(text, { maxScanChars: 32000 });
  assert.equal(r.detected, false, "a short-line run past maxScanChars must never be detected as front matter");
});

test("a run shorter than tocRunMin does not fire — 8 consecutive is the declared floor", () => {
  const toc = Array.from({ length: 5 }, (_, i) => `CHAPTER ${i + 1}`).join("\n\n");
  const prose = "This is a real prose paragraph, long enough to qualify as the landing point, but the run above it is short — five headings, not eight — so detection must not fire on this specimen at all, regardless of how long this paragraph itself runs on for.";
  const r = detectFrontMatterRun(toc + "\n\n" + prose);
  assert.equal(r.detected, false);
});

test("empty and non-string input refuse gracefully", () => {
  assert.deepEqual(detectFrontMatterRun(""), { detected: false, skipTo: 0, runLength: 0 });
  assert.deepEqual(detectFrontMatterRun(null), { detected: false, skipTo: 0, runLength: 0 });
});

// ── real specimens, skipped (never failed) if the sibling corpus is absent ──

test("REAL SPECIMEN — Les Misérables (the case this function was built for): detects the TOC and skips to real prose past the excerpt window", () => {
  const raw = readIfPresent(GUTENBERG, "pg135_Les_Mis_rables__French_.txt");
  if (raw == null) return;
  const r = detectFrontMatterRun(raw);
  assert.equal(r.detected, true);
  const landed = raw.slice(r.skipTo, r.skipTo + 200);
  // The real landing point is Hugo's own Preface ("So long as there shall
  // exist...") — genuine authored prose, correctly distinguished from the
  // heading-shaped table of contents it follows. This is a MORE precise
  // landing than the narrative's own incipit ("In 1815...", Volume I Book
  // First Chapter I) would have been: the function's job is to find the
  // first real prose past the front matter, not to locate the narrative
  // specifically, and the Preface genuinely comes first in this edition.
  assert.ok(landed.includes("So long as there shall exist"), `expected to land on real prose, got: ${JSON.stringify(landed.slice(0, 80))}`);
  assert.ok(r.skipTo > 8000, "the whole point: the real prose sits past the flat 8000-char excerpt window");
});

test("REAL SPECIMEN — Les Misérables: an excerpt built from the detected skip point actually extracts real relation edges (0 before, real edges after)", async () => {
  const raw = readIfPresent(GUTENBERG, "pg135_Les_Mis_rables__French_.txt");
  if (raw == null) return;
  const { extractSurfaces, discoverReferents } = await import("../adapters/text/surfaces.js");
  const { discoverRelationVocab, extractRelations } = await import("../adapters/text/relations.js");
  const { splitSentences } = await import("../adapters/text/spans.js");

  const readEdges = (excerpt) => {
    const sentences = splitSentences(excerpt);
    const surfaceEvidence = extractSurfaces(sentences);
    const { events } = discoverReferents(surfaceEvidence, {});
    const surfaces = [...new Set(events.map((e) => e.surface))];
    const vocab = discoverRelationVocab(excerpt, { surfaces, minSurfaces: 1 });
    // extractRelations reads ONE SENTENCE's own text at a time (the same
    // per-sentence call convention hypergraph.js's own makeRelationReader
    // uses) — not the whole excerpt and not the sentences array itself.
    let total = 0;
    for (const sent of sentences) total += extractRelations(sent.text, { verbs: vocab.verbs }).length;
    return total;
  };

  const flatExcerpt = raw.slice(0, 8000);
  const r = detectFrontMatterRun(raw);
  assert.equal(r.detected, true);
  const skippedExcerpt = raw.slice(r.skipTo, r.skipTo + 8000);

  const edgesBefore = readEdges(flatExcerpt);
  const edgesAfter = readEdges(skippedExcerpt);
  assert.equal(edgesBefore, 0, "the flat prefix excerpt (all table of contents) extracts nothing — the anomaly this function fixes");
  assert.ok(edgesAfter > 0, `the skipped-to excerpt must extract real edges; got ${edgesAfter}`);
});

test("REAL SPECIMEN — Moby Dick's real ~28KB Etymology/Extracts front section is prose-shaped and must NOT be flagged", () => {
  const raw = readIfPresent(GUTENBERG, "pg2701_Moby_Dick.txt");
  if (raw == null) return;
  const r = detectFrontMatterRun(raw, { maxScanChars: 32000 });
  assert.equal(r.detected, false, "Moby Dick's Etymology/Extracts section is real quoted prose with real terminators, not a TOC — must be left alone");
});

test("REAL SPECIMEN SWEEP — every other gutenberg book in this corpus is checked; a positive fire outside the known TOC-bearing specimens is reported by name", () => {
  let entries;
  try { entries = fs.readdirSync(GUTENBERG); }
  catch { return; }
  const KNOWN_TOC = new Set(["pg135_Les_Mis_rables__French_.txt"]);
  const fired = [];
  for (const name of entries) {
    if (!name.endsWith(".txt")) continue;
    const raw = readIfPresent(GUTENBERG, name);
    if (raw == null) continue;
    const r = detectFrontMatterRun(raw, { maxScanChars: 32000 });
    if (r.detected) fired.push({ name, skipTo: r.skipTo, runLength: r.runLength });
  }
  const unexpected = fired.filter((f) => !KNOWN_TOC.has(f.name));
  // A positive fire on an UNKNOWN specimen is not automatically wrong — it
  // may be a genuine, previously-unnoticed TOC-bearing book — but it must
  // be visible, not silently accepted, so this assertion prints exactly
  // which files fired if the set ever changes, rather than passing blind.
  assert.deepEqual(unexpected, [], `unexpected front-matter detections outside the known set: ${JSON.stringify(unexpected)}`);
});

test("REAL SPECIMEN — a folger-shakespeare play (short front matter, real prose stage directions) does not misfire", () => {
  const raw = readIfPresent(SHAKESPEARE, "Hamlet.txt");
  if (raw == null) return;
  const r = detectFrontMatterRun(raw, { maxScanChars: 32000 });
  assert.equal(r.detected, false);
});
