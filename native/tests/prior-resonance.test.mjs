// native/tests/prior-resonance.test.mjs — the-fold/prior-resonance.js's own
// coverage. Live-embedding cases require a real, local Ollama with
// nomic-embed-text pulled (this module makes no non-embedding fallback, on
// purpose — see corpus-resonance.js's own header). Skips cleanly, the same
// pattern corpus-resonance.test.js already established, when that real
// dependency is not present, rather than failing the run.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  walkCorpusDir,
  readExcerpt,
  resonantCorpusEntries,
  resonantLivePriorsCategories,
} from "../the-fold/prior-resonance.js";

const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";
let embeddingAvailable = false;
try {
  const res = await fetch(`${OLLAMA}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", input: "ping" }),
  });
  embeddingAvailable = res.ok;
} catch { /* no local Ollama reachable — skip below */ }

const HANDBOOK = path.resolve(import.meta.dirname, "..", "..", "..", "eoreaderhandbook");
const LIVE_PRIORS = path.resolve(import.meta.dirname, "..", "..", "..", "live_priors");

// ── walkCorpusDir / readExcerpt — pure, no Ollama needed ────────────────────

test("walkCorpusDir: recurses, filters to .txt/.md, skips dotfiles/dot-dirs, respects maxFiles", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-corpus-walk-"));
  try {
    fs.writeFileSync(path.join(dir, "a.txt"), "a");
    fs.writeFileSync(path.join(dir, "b.md"), "b");
    fs.writeFileSync(path.join(dir, "c.json"), "{}");
    fs.writeFileSync(path.join(dir, ".hidden.txt"), "h");
    fs.mkdirSync(path.join(dir, "sub"));
    fs.writeFileSync(path.join(dir, "sub", "d.txt"), "d");
    fs.mkdirSync(path.join(dir, ".dotdir"));
    fs.writeFileSync(path.join(dir, ".dotdir", "e.txt"), "e");

    const all = walkCorpusDir(dir);
    const rels = all.map((f) => f.path).sort();
    assert.deepEqual(rels, ["a.txt", "b.md", "sub/d.txt"]);

    const capped = walkCorpusDir(dir, { maxFiles: 1 });
    assert.equal(capped.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("walkCorpusDir: a nonexistent directory yields an empty list, never a thrown error", () => {
  assert.deepEqual(walkCorpusDir("/does/not/exist/at/all"), []);
});

test("readExcerpt: a short file returns its whole trimmed text; a long file returns a mid-document slice, never the head", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-excerpt-"));
  try {
    const shortPath = path.join(dir, "short.txt");
    fs.writeFileSync(shortPath, "  hello   world  \n");
    assert.equal(readExcerpt(shortPath, { excerptChars: 3000 }), "hello world");

    const longPath = path.join(dir, "long.txt");
    // A realistic proportion: a short front-matter header (~5% of the
    // document) ahead of the real body — the shape a book chapter or a
    // Gutenberg-style file actually has. The prior version of this test
    // used a head section covering ~34% of the file, which landed INSIDE
    // readExcerpt's own 1/3-mark cut point by coincidence and failed —
    // a defect in this test's own chosen proportions, not in readExcerpt,
    // caught and fixed here rather than loosening the assertion.
    const head = "HEAD-MARKER ".repeat(10); // ~120 chars
    const middle = "MID-MARKER ".repeat(200); // ~2200 chars
    const tail = "TAIL-MARKER ".repeat(200); // ~2400 chars
    fs.writeFileSync(longPath, head + middle + tail);
    const excerpt = readExcerpt(longPath, { excerptChars: 100 });
    assert.ok(!excerpt.includes("HEAD-MARKER"), "the excerpt must not start at the document's own head");
    assert.ok(excerpt.includes("MID-MARKER") || excerpt.includes("TAIL-MARKER"), "the excerpt must land past the first third");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readExcerpt: a missing file returns null, never throws", () => {
  assert.equal(readExcerpt("/does/not/exist.txt"), null);
});

// ── resonantCorpusEntries — gap-path coverage, no Ollama needed ─────────────

test("resonantCorpusEntries: baseDir is required, refused with a typed error otherwise", async () => {
  await assert.rejects(() => resonantCorpusEntries("x", [{ path: "a.txt" }], {}), /baseDir is required/);
});

test("resonantCorpusEntries: every entry unreadable yields empty matches and one typed gap per entry, zero Ollama calls", async () => {
  const res = await resonantCorpusEntries("anything", [{ path: "nope-a.txt" }, { path: "nope-b.txt" }], { baseDir: "/does/not/exist" });
  assert.deepEqual(res.matches, []);
  assert.equal(res.consulted, 0);
  assert.equal(res.ceiling, null);
  assert.equal(res.gaps.length, 2);
  assert.ok(res.gaps.every((g) => g.gap === "source_unreadable"));
});

test("resonantLivePriorsCategories: a nonexistent corpus directory yields a typed corpus_absent gap, never a thrown error, zero Ollama calls", async () => {
  const res = await resonantLivePriorsCategories("anything", { liveDir: "/does/not/exist/live_priors" });
  assert.deepEqual(res.matches, []);
  assert.equal(res.categoriesSampled, 0);
  assert.equal(res.gaps.length, 1);
  assert.equal(res.gaps[0].gap, "corpus_absent");
});

// Regression: a live demonstration run against the real, unfiltered
// live_priors corpus reported "scripts" and "goldens" — real corpus
// machinery, never content — as resonant CATEGORIES, because every
// subdirectory of liveDir was being treated as one. Pinned here so the
// CATEGORY_DIR_RE fix cannot silently regress.
test("resonantLivePriorsCategories: only numbered content-category directories (01-, 06-, ...) are sampled — corpus machinery (scripts, src, manifests, digested, derived-priors, goldens) is never treated as a category, zero Ollama calls", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-live-priors-machinery-"));
  try {
    for (const name of ["01-literature-books", "06-government-legal", "scripts", "src", "manifests", "digested", "derived-priors", "goldens"]) {
      fs.mkdirSync(path.join(dir, name), { recursive: true }); // left empty on purpose — see comment above
    }
    const res = await resonantLivePriorsCategories("anything", { liveDir: dir });
    assert.equal(res.categoriesSampled, 2, "only the two numbered directories are real categories");
    assert.equal(res.consulted, 0, "every category is empty, so nothing was actually read");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ── live discrimination — requires a real, reachable Ollama ─────────────────

test(
  "resonantCorpusEntries: a witness/testimony query ranks the real 103-witness.md chapter above an unrelated real chapter, and gaps coexist with real matches",
  { skip: !embeddingAvailable && "no local Ollama + nomic-embed-text reachable" },
  async () => {
    const entries = [
      { path: "103-witness.md" },
      { path: "702-the-watchmakers-discipline.md" },
      { path: "this-file-does-not-exist.md" },
    ];
    const res = await resonantCorpusEntries(
      "what does it mean to witness something and testify to it",
      entries,
      { baseDir: HANDBOOK, top: 2 },
    );
    assert.equal(res.consulted, 2, "the two real chapters were read; the fabricated third was not");
    assert.equal(res.gaps.length, 1);
    assert.equal(res.gaps[0].path, "this-file-does-not-exist.md");
    assert.ok(res.matches.length >= 1, "at least the witness chapter should clear the off-topic null ceiling");
    assert.equal(res.matches[0].entry.path, "103-witness.md");
    assert.ok(res.matches[0].similarity > res.ceiling);
  },
);

test(
  "resonantLivePriorsCategories: a human-rights query surfaces 06-government-legal over 14-holy-texts, and a Joseph/Egypt query surfaces the reverse — real copied bytes, real embeddings, real measured null",
  { skip: !embeddingAvailable && "no local Ollama + nomic-embed-text reachable" },
  async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-live-priors-fixture-"));
    try {
      const govDir = path.join(dir, "06-government-legal");
      const holyDir = path.join(dir, "14-holy-texts");
      fs.mkdirSync(govDir, { recursive: true });
      fs.mkdirSync(holyDir, { recursive: true });
      // Real bytes, copied verbatim from the real corpus — never fabricated
      // stand-in text (confirmed present and peeked before this test was
      // written: udhr-eng.txt is clean English UDHR text; sura-012-Yusuf.txt
      // carries real English translation passages about Joseph and Egypt
      // alongside Arabic/transliteration).
      fs.copyFileSync(
        path.join(LIVE_PRIORS, "06-government-legal", "un-udhr", "udhr-eng.txt"),
        path.join(govDir, "udhr-eng.txt"),
      );
      fs.copyFileSync(
        path.join(LIVE_PRIORS, "14-holy-texts", "quran-suras", "sura-012-Yusuf.txt"),
        path.join(holyDir, "sura-012-Yusuf.txt"),
      );

      const rights = await resonantLivePriorsCategories(
        "the human right to a fair trial and due process under the law",
        { liveDir: dir, perCategory: 5 },
      );
      assert.equal(rights.categoriesSampled, 2);
      assert.ok(rights.matches.length >= 1, "at least one category should resonate with a human-rights query");
      assert.equal(rights.matches[0].category, "06-government-legal");

      const joseph = await resonantLivePriorsCategories(
        "Joseph was sold into slavery by his brothers and taken to Egypt",
        { liveDir: dir, perCategory: 5 },
      );
      assert.ok(joseph.matches.length >= 1, "at least one category should resonate with the Joseph/Egypt query");
      assert.equal(joseph.matches[0].category, "14-holy-texts");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);
