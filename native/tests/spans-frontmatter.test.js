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

// All corpus paths are resolved from THIS file, never from the process cwd —
// this suite runs from native/ (npm test) and from the repo root (node --test).
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIVE_PRIORS = path.join(HERE, "..", "..", "..", "live_priors");
const GUTENBERG = path.join(LIVE_PRIORS, "01-literature-books", "gutenberg");
const SHAKESPEARE = path.join(LIVE_PRIORS, "15-western-canon", "folger-shakespeare");
const LES_MIS = path.join(GUTENBERG, "pg135_Les_Mis_rables__French_.txt");
const MOBY_DICK = path.join(GUTENBERG, "pg2701_Moby_Dick.txt");
const HAMLET = path.join(SHAKESPEARE, "Hamlet.txt");
const NL_CODE = path.join(LIVE_PRIORS, "06-government-legal", "world-legislation", "nl", "BWBR0001838.md");

// An absent specimen is a NAMED SKIP that prints the path it looked for —
// never a silent green. Until 2026-09-04 a read helper that swallowed ENOENT
// to null, five callers that then `return`ed on it, and one bare
// `catch { return; }` around the sweep's readdir meant all six real-specimen
// cases below PASSED on any checkout without the sibling corpus, having
// asserted nothing at all.
const absent = (p) => (fs.existsSync(p) ? false : `specimen absent: ${p}`);

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

test("REAL-CORPUS-SWEEP counter-example: a markdown-structured legal code with many short 'repealed' article stubs must NOT be misread as a table of contents", () => {
  // Found by running the FULL live_priors corpus sweep with this function
  // wired in, not by reasoning about it: a real Dutch legal code
  // (Wetboek van Koophandel) opens with a YAML frontmatter block, then
  // markdown ATX headings ("##### Artikel 2") each immediately followed
  // by the single word "Vervallen" ("Repealed") for a dozen consecutive
  // articles — a real, legitimate, dense-but-genuine document structure,
  // not an undifferentiated list of chapter titles. Before the ATX-heading
  // exclusion below, this cleared the TOC-run floor and skipped 4,594
  // real characters, turning a previously-clean 39-edge reading into a
  // 0-edge one. This is the SAME failure shape the back-of-book-index
  // counter-example above already names (a real document structure
  // sharing TOC's surface shape), on a second, unrelated convention this
  // function's original nine-book control set never tested (none of them
  // were markdown-formatted).
  const nl = [
    "##### Artikel 2", "Vervallen", "##### Artikel 3", "Vervallen",
    "##### Artikel 4", "Vervallen", "##### Artikel 5", "Vervallen",
    "##### Artikel 6", "Vervallen", "##### Artikel 7", "Vervallen",
    "##### Artikel 8", "Vervallen", "##### Artikel 9", "Vervallen",
    "##### Artikel 10", "Vervallen", "##### Artikel 11", "Vervallen",
  ].join("\n\n");
  const prose = "##### Artikel 15\n\nDe in dezen titel genoemde vennootschappen worden geregeerd door de overeenkomsten van partijen, door dit Wetboek en door het Burgerlijk Regt, wat een uitgebreide en gedetailleerde wettelijke regeling van deze materie inhoudt.";
  const text = nl + "\n\n" + prose;
  const r = detectFrontMatterRun(text);
  assert.equal(r.detected, false, "a run of markdown headings and their own short-but-real content ('Vervallen') must never be misread as a table of contents");
});

test("REAL SPECIMEN — the exact Dutch legal code this counter-example is drawn from does not misfire, end to end",
  { skip: absent(NL_CODE) }, () => {
  const raw = fs.readFileSync(NL_CODE, "utf8");
  const r = detectFrontMatterRun(raw);
  assert.equal(r.detected, false, "the real specimen that motivated the ATX-heading exclusion must not fire");
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

test("REAL SPECIMEN — Les Misérables (the case this function was built for): detects the TOC and skips to real prose past the excerpt window",
  { skip: absent(LES_MIS) }, () => {
  const raw = fs.readFileSync(LES_MIS, "utf8");
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

test("REAL SPECIMEN — Les Misérables: an excerpt built from the detected skip point actually extracts real relation edges (0 before, real edges after)",
  { skip: absent(LES_MIS) }, async () => {
  const raw = fs.readFileSync(LES_MIS, "utf8");
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

test("REAL SPECIMEN — Moby Dick's real ~28KB Etymology/Extracts front section is prose-shaped and must NOT be flagged",
  { skip: absent(MOBY_DICK) }, () => {
  const raw = fs.readFileSync(MOBY_DICK, "utf8");
  const r = detectFrontMatterRun(raw, { maxScanChars: 32000 });
  assert.equal(r.detected, false, "Moby Dick's Etymology/Extracts section is real quoted prose with real terminators, not a TOC — must be left alone");
});

test("REAL SPECIMEN SWEEP — every other gutenberg book in this corpus is checked; a positive fire outside the known TOC-bearing specimens is reported by name",
  { skip: absent(GUTENBERG) }, () => {
  const entries = fs.readdirSync(GUTENBERG);
  const KNOWN_TOC = new Set(["pg135_Les_Mis_rables__French_.txt"]);
  const fired = [];
  for (const name of entries) {
    if (!name.endsWith(".txt")) continue;
    const raw = fs.readFileSync(path.join(GUTENBERG, name), "utf8");
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

test("REAL SPECIMEN — a folger-shakespeare play (short front matter, real prose stage directions) does not misfire",
  { skip: absent(HAMLET) }, () => {
  const raw = fs.readFileSync(HAMLET, "utf8");
  const r = detectFrontMatterRun(raw, { maxScanChars: 32000 });
  assert.equal(r.detected, false);
});
