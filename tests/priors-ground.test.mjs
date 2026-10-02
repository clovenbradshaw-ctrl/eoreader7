// priors-ground.test.mjs — the received ground: passages of live_priors that carry an ask, located and cached.
//
// Measured 2026-09-30 against the real corpus: a per-DOCUMENT "holds most of the ask's words" rule ranks a file of
// Guardian cryptic clues and Ulysses as 8-of-8 matches for a bicycle-freewheel question (large documents hold every
// common word somewhere). The unit must be the passage: the words must occur TOGETHER. These tests hold that control,
// the structural rules (paragraph, else line; offsets that slice back to the passage), the cache, and the real corpus.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findPriorsGround, passagesOf, listEligible, fingerprintOf, sectionOf, persistEarnedGround, makeAskEvidence } from "../native/the-fold/priors-ground.js";

const REAL = process.env.ER7_PRIORS_DIR || decodeURIComponent(new URL("../../live_priors", import.meta.url).pathname);
const haveReal = fs.existsSync(path.join(REAL, "02-encyclopedic"));

// a small corpus with the shapes that matter: a true carrier in paragraphs, a big blob that holds every word scattered,
// a line-structured file (no blank lines), a repo-infrastructure file and a derived sidecar that must not be searched
const mk = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-pg-"));
  const put = (rel, text) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); return f; };
  put("02-encyclopedic/freewheel.txt", "Gearing overview.\n\nA bicycle freewheel lets the wheel spin while the pedals stay still. The pawl engages the ratchet only when pedalling forward.\n\nChains and sprockets are covered elsewhere.");
  // a long book: every word of the ask appears in it, in different paragraphs, never together
  const scatter = []; for (let i = 0; i < 200; i++) scatter.push("Filler about nothing in particular, paragraph " + i + ".\nMore padding here and there."); scatter.splice(20, 0, "The bicycle was red."); scatter.splice(90, 0, "A freewheel is a thing."); scatter.splice(150, 0, "The wheel turned and the pedal moved."); scatter.splice(180, 0, "We stay and spin, still.");
  put("01-literature/blob.txt", scatter.join("\n\n"));
  put("16-wordplay/lines.txt", ["Clue one: a bicycle, perhaps.", "Clue two: freewheel to a stop.", "Clue three: spin the wheel.", "Clue four: the pedal and the chain.", "Clue five: stay still."].join("\n"));
  put("manifests/m.json", '{"x":"bicycle freewheel wheel spin pedal stay still"}');
  put("scripts/readme.md", "bicycle freewheel wheel spin pedal stay still\n\nbicycle freewheel wheel spin pedal stay still");
  put("02-encyclopedic/freewheel.cv.md", "bicycle freewheel wheel spin pedal stay still\n\nbicycle freewheel wheel spin pedal stay still");
  return dir;
};
const ASK = "How a bicycle freewheel lets the wheel spin while the pedals stay still";
const roots = (dir) => [{ dir, label: "corpus" }];

test("CONTROL — the per-document rule picks the scattered book; the passage rule does not", async () => {
  const dir = mk(); const files = listEligible(roots(dir));
  const words = ["bicycle", "freewheel", "let", "wheel", "spin", "pedal", "stay", "still"];
  const docLevel = files.filter((f) => { const low = fs.readFileSync(f.abs, "utf8").toLowerCase(); return words.filter((w) => low.includes(w)).length * 2 > words.length; }).map((f) => f.rel);
  assert.ok(docLevel.includes("01-literature/blob.txt") && docLevel.includes("16-wordplay/lines.txt"), "the old rule admits documents that hold the words far apart: " + docLevel);
  const r = await findPriorsGround({ topic: ASK, roots: roots(dir) });
  assert.deepEqual([...new Set(r.passages.map((p) => p.rel))], ["02-encyclopedic/freewheel.txt"]);
});

test("a passage is returned with an address that slices back to its exact text", async () => {
  const dir = mk(); const r = await findPriorsGround({ topic: ASK, roots: roots(dir) });
  assert.equal(r.mode, "carried");
  for (const p of r.passages) {
    const file = fs.readFileSync(path.join(dir, p.rel), "utf8");
    assert.equal(file.slice(p.start, p.end), p.text);
    assert.equal(p.id, `priors:corpus/${p.rel}#${p.start}-${p.end}`);
    const w = r.weights; assert.ok(p.carries.reduce((n, x) => n + w[x], 0) * 2 > Object.values(w).reduce((n, x) => n + x, 0), "more than half of the evidence: " + p.carries);
  }
});

test("a block of complete lines is read by the line; hard-wrapped prose stays one passage", () => {
  const list = "Clue one: a bicycle, perhaps.\nClue two: freewheel to a stop.\nClue three: spin the wheel.";
  const lp = passagesOf(list); assert.equal(lp.length, 3); assert.equal(list.slice(lp[2].start, lp[2].end), "Clue three: spin the wheel.");
  const wrapped = "It was the best of times, it was the worst of\ntimes, it was the age of wisdom, it was the age of\nfoolishness, it was the epoch of belief.";
  const wp = passagesOf(wrapped); assert.equal(wp.length, 1); assert.equal(wrapped.slice(wp[0].start, wp[0].end), wrapped);
  // a list block beside a prose block, in one file, each read by its own rule, offsets exact
  const mixed = "Heading\n\nFirst clue.\nSecond clue.\nThird clue.\n\nA paragraph that wraps\nover two lines and ends here.";
  const mp = passagesOf(mixed).map((p) => mixed.slice(p.start, p.end));
  assert.deepEqual(mp, ["Heading", "First clue.", "Second clue.", "Third clue.", "A paragraph that wraps\nover two lines and ends here."]);
});

test("a corpus of clue lines contributes nothing to an ask no single line carries", async () => {
  const r = await findPriorsGround({ topic: ASK, roots: roots(mk()) });
  assert.ok(!r.passages.some((p) => p.rel.startsWith("16-wordplay")));
  assert.ok(!r.passages.some((p) => p.rel.startsWith("01-literature")), "the scattered book is examined and not admitted");
});

test("repo infrastructure and derived sidecars are not sources: manifests, scripts, *.cv.md are never searched", async () => {
  const dir = mk(); const rels = listEligible(roots(dir)).map((f) => f.rel);
  assert.deepEqual(rels, ["01-literature/blob.txt", "02-encyclopedic/freewheel.txt", "16-wordplay/lines.txt"]);
  const r = await findPriorsGround({ topic: ASK, roots: roots(dir) });
  assert.ok(r.passages.every((p) => !/manifests|scripts|\.cv\.md/.test(p.rel)));
});

test("no subject means nothing to look for, and an ask the corpus cannot carry is an honest not-carried with its count", async () => {
  const dir = mk();
  assert.equal((await findPriorsGround({ topic: "this", roots: roots(dir) })).mode, "no-subject");
  const r = await findPriorsGround({ topic: "the migration of arctic terns across the southern ocean", roots: roots(dir) });
  assert.equal(r.mode, "not-carried");
  assert.deepEqual(r.passages, []);
  assert.match(r.basis, /3 documents searched/);
  assert.equal((await findPriorsGround({ topic: ASK, roots: [{ dir: path.join(dir, "nowhere"), label: "x" }] })).mode, "no-corpus");
});

test("the cache: a second ask of the same words scans nothing; a new word scans once; a changed corpus is re-read", async () => {
  const dir = mk(); const cacheFile = path.join(os.tmpdir(), `er7-pg-cache-${process.pid}-${Date.now()}.json`);
  const a = await findPriorsGround({ topic: ASK, roots: roots(dir), cacheFile });
  assert.ok(a.scanned.newWords.length > 0 && !a.scanned.cached);
  const b = await findPriorsGround({ topic: ASK, roots: roots(dir), cacheFile });
  assert.equal(b.scanned.cached, true);
  assert.deepEqual(b.passages.map((p) => p.id), a.passages.map((p) => p.id), "cached answer is the same ground");
  const c = await findPriorsGround({ topic: "a bicycle freewheel and a ratchet pawl", roots: roots(dir), cacheFile });
  assert.deepEqual(c.scanned.newWords.sort(), ["pawl", "ratchet"], "only the words never seen are scanned");
  // a changed corpus invalidates the cache (the fingerprint moves) and the new document is found
  fs.writeFileSync(path.join(dir, "02-encyclopedic/second.txt"), "Another account.\n\nThe bicycle freewheel lets the wheel spin and the pedals stay still, and the pedal may still spin.");
  const d = await findPriorsGround({ topic: ASK, roots: roots(dir), cacheFile });
  assert.equal(d.scanned.cached, false);
  assert.ok(d.passages.some((p) => p.rel === "02-encyclopedic/second.txt"));
  assert.notEqual(fingerprintOf(listEligible(roots(dir))), a && fingerprintOf(listEligible(roots(mk()))));
});

test("the cache lives outside the corpus: nothing is written into it", async () => {
  const dir = mk(); const before = listEligible(roots(dir)).length; const all = () => fs.readdirSync(dir, { recursive: true }).length;
  const n = all(); await findPriorsGround({ topic: ASK, roots: roots(dir), cacheFile: path.join(os.tmpdir(), `er7-pg-c2-${process.pid}.json`) });
  assert.equal(all(), n); assert.equal(listEligible(roots(dir)).length, before);
});

test("evidence, not word count: a generic word cannot make a passage relevant, a rare one can", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-pg-w-"));
  const put = (rel, text) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  // "set" and "size" are in every document; "continuum" and "hypothesis" are in one. Only the passage with the rare words is about the subject.
  for (let i = 0; i < 12; i++) put(`02-encyclopedic/ml-${i}.txt`, "Setting the size of the test set is a choice.\n\nThe size of the set decides the hypothesis we may test, so set it early.");
  put("02-encyclopedic/cantor.txt", "Cantor.\n\nThe continuum hypothesis concerns the size of infinite sets, a question Cantor could not settle.");
  const r = await findPriorsGround({ topic: "the continuum hypothesis and the size of infinite sets", roots: roots(dir) });
  assert.deepEqual(r.passages.map((p) => p.rel), ["02-encyclopedic/cantor.txt"], "the twelve passages that carry only common words are not ground");
  assert.ok(r.weights.continuum > 3 * r.weights.set, "the rare word weighs far more: " + JSON.stringify(r.weights));
});

test("the best passage of each document, most evidence first, and two sources are two passages", async () => {
  const dir = mk(); fs.writeFileSync(path.join(dir, "02-encyclopedic/second.txt"), "Another account.\n\nThe bicycle freewheel lets the wheel spin and the pedals stay still, and the pedal may still spin.");
  const r = await findPriorsGround({ topic: ASK, roots: roots(dir) });
  assert.deepEqual(r.passages.map((p) => p.rel).sort(), ["02-encyclopedic/freewheel.txt", "02-encyclopedic/second.txt"]);
  assert.equal(new Set(r.passages.map((p) => p.rel)).size, r.passages.length, "one per document");
  for (let i = 1; i < r.passages.length; i++) assert.ok(r.passages[i - 1].score >= r.passages[i].score, "ranked by evidence");
});

test("CRLF: Project Gutenberg files break paragraphs with \\r\\n\\r\\n, and must not read as one passage the size of the book", () => {
  const text = "First paragraph of a book,\r\nwrapped over two lines.\r\n\r\nSecond paragraph, also wrapped\r\nover two lines.\r\n\r\nThird.";
  const ps = passagesOf(text);
  assert.equal(ps.length, 3);
  assert.deepEqual(ps.map((p) => text.slice(p.start, p.end).replace(/\r/g, "")), ["First paragraph of a book,\nwrapped over two lines.", "Second paragraph, also wrapped\nover two lines.", "Third."]);
});

test("the anchor: a passage must carry the ask's most surprising word that the corpus attests, or it is about something else", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-pg-a-"));
  const put = (rel, text) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  // measured 2026-09-30: a cybernetics paragraph holds bicycle, pedal, wheel and "let" — more than half of the evidence of the
  // bicycle-freewheel ask — and never says freewheel. It is not ground for how a freewheel works.
  put("05-academic/black-box.txt", "Filler.\n\nWe work with Black Boxes more than we think. A bicycle is not a Black Box, for we can see every link, the wheel that may spin and the pedal that may stay still, and let us not delude ourselves.");
  put("02-encyclopedic/freewheel.txt", "Filler.\n\nThe bicycle freewheel lets the wheel spin while the pedals stay still, and the pedal turns it only forward.");
  for (let i = 0; i < 6; i++) put(`02-encyclopedic/pad-${i}.txt`, "Unrelated text about other things.\n\nMore unrelated text about something else entirely.");
  const r = await findPriorsGround({ topic: ASK, roots: roots(dir) });
  assert.equal(r.anchor, "freewheel");
  assert.deepEqual(r.passages.map((p) => p.rel), ["02-encyclopedic/freewheel.txt"]);
  // and without the anchor rule the cybernetics paragraph would have qualified on evidence alone
  const w = r.weights, total = Object.values(w).reduce((n, x) => n + x, 0);
  assert.ok((w.bicycle + w.wheel + w.pedal + w.let + w.spin + w.stay + w.still) * 2 > total, "the black-box paragraph carries more than half of the evidence: only the anchor excludes it");
});

test("polysemy: two rare words meeting by coincidence is not a subject — more than half of the WORDS must be carried too", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-pg-p-"));
  const put = (rel, text) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  // measured 2026-09-30 on the real corpus: for the continuum-hypothesis ask, a relativity paper ("the four-dimensional
  // continuum … hypothesis") and a creole survey ("a continuum of varieties … Chaudenson's hypothesis") each carried the two rare
  // words and more than half of the evidence. Neither is about the set-theoretic continuum hypothesis.
  put("01-literature/relativity.txt", "Preface.\n\nShould the determinant vanish at any point of the four-dimensional continuum, the hypothesis of covariance could not hold there.");
  put("11-multi-language/creole.txt", "Preface.\n\nThis supports the hypothesis that a continuum of varieties of French developed in the homestead society.");
  put("02-encyclopedic/cantor.txt", "Preface.\n\nThe continuum hypothesis states that no set has a size strictly between the integers and the reals; Cantor asked about infinite sets and their sizes.");
  for (let i = 0; i < 8; i++) put(`02-encyclopedic/pad-${i}.txt`, "Padding.\n\nThe infinite set was a size that we did not like.");
  const r = await findPriorsGround({ topic: "The continuum hypothesis and the sizes of infinite sets", roots: roots(dir) });
  assert.deepEqual(r.passages.map((p) => p.rel), ["02-encyclopedic/cantor.txt"]);
  const w = r.weights, total = Object.values(w).reduce((n, x) => n + x, 0);
  assert.ok((w.continuum + w.hypothesi) * 2 > total, "the coincident pair carries more than half of the evidence: only the word majority excludes it");
});

// ── from a passage to a place to stand: the section it sits in ──────────────────────────────────────────────
// Measured 2026-09-30: the one passage found for the continuum ask was 346 characters, and the pipeline's own ground gate
// reported "Ground not licensed — no revision will be spent". In these documents a heading is a one-line block with no terminal
// punctuation; the section under it is the coherent unit to stand on.
const DOC = "Logic\n\nIntro paragraph about logic in general.\n\nMetalogic\n\nMetalogic studies formal systems.\n\nMathematical logic\n\nThe term is used as a synonym of formal logic.\n\nSet theory began with Cantor and the continuum hypothesis.\n\nComputability theory studies effective procedures.\n\nComputational logic\n\nComputational logic implements reasoning.";

test("sectionOf: a paragraph under a heading expands to the blocks between that heading and the next", () => {
  const at = DOC.indexOf("Set theory began");
  const sec = sectionOf(DOC, at, at + "Set theory began with Cantor and the continuum hypothesis.".length);
  assert.equal(DOC.slice(sec.start, sec.end), "The term is used as a synonym of formal logic.\n\nSet theory began with Cantor and the continuum hypothesis.\n\nComputability theory studies effective procedures.");
});

test("sectionOf: a document with no headings is not expanded — a book is not one section", () => {
  const book = "It was a bright cold day in April.\n\nThe clocks were striking thirteen.\n\nWinston slipped quickly through the glass doors.";
  const at = book.indexOf("The clocks");
  const sec = sectionOf(book, at, at + "The clocks were striking thirteen.".length);
  assert.equal(book.slice(sec.start, sec.end), "The clocks were striking thirteen.");
});

test("sectionOf: a single line of a list is not expanded to its neighbours", () => {
  const list = "Heading\n\nFirst clue.\nSecond clue.\nThird clue.";
  const at = list.indexOf("Second clue.");
  const sec = sectionOf(list, at, at + "Second clue.".length);
  assert.equal(list.slice(sec.start, sec.end), "Second clue.");
});

test("a found passage is returned as its section, addressed by the section, with the passage range kept", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-pg-s-"));
  fs.mkdirSync(path.join(dir, "02-encyclopedic"), { recursive: true });
  fs.writeFileSync(path.join(dir, "02-encyclopedic/logic.txt"), DOC.replace("Set theory began with Cantor and the continuum hypothesis.", "Set theory began with Cantor; the continuum hypothesis asks about the sizes of infinite sets."));
  for (let i = 0; i < 6; i++) fs.writeFileSync(path.join(dir, `02-encyclopedic/pad-${i}.txt`), "Padding.\n\nThe infinite set was a size that we did not like.");
  const r = await findPriorsGround({ topic: "The continuum hypothesis and the sizes of infinite sets", roots: [{ dir, label: "c" }] });
  assert.equal(r.passages.length, 1);
  const p = r.passages[0]; const file = fs.readFileSync(path.join(dir, p.rel), "utf8");
  assert.equal(file.slice(p.start, p.end), p.text, "the address is the section's and slices back to its text");
  assert.ok(p.text.includes("Set theory began") && p.text.includes("Computability theory") && !p.text.includes("Metalogic") && !p.text.includes("Computational logic"));
  assert.equal(file.slice(p.passageStart, p.passageEnd).startsWith("Set theory began"), true);
  assert.equal(p.id, `priors:c/${p.rel}#${p.start}-${p.end}`);
});

// ── the ground grows: what a consented hunt earns is kept, so the next ask finds it without going out ─────────
const PAGE = "Freewheel\n\nA freewheel is a device on a bicycle.\n\nMechanism\n\nThe bicycle freewheel lets the wheel spin while the pedals stay still. The pawl engages the ratchet only when the pedal drives forward, and the wheel may still spin.\n\nHistory\n\nFreewheels were introduced in the 1890s.";

test("an earned page is kept with where it came from, and is found by the next ask of the same subject", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-eg-"));
  const w = persistEarnedGround({ dir, docs: [{ url: "https://en.wikipedia.org/wiki/Freewheel", text: PAGE }], task: ASK, at: "2026-09-30T18:00:00.000Z" });
  assert.equal(w.written.length, 1);
  assert.ok(/^90-earned\//.test(w.written[0].rel));
  const manifest = fs.readFileSync(path.join(dir, "earned.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(manifest.map((m) => [m.url, m.task, m.at]), [["https://en.wikipedia.org/wiki/Freewheel", ASK, "2026-09-30T18:00:00.000Z"]]);
  assert.match(manifest[0].sha1, /^[0-9a-f]{40}$/);
  // the next ask, with nothing handed over and no web, finds it in the earned root — located, and as a section
  for (let i = 0; i < 6; i++) { fs.mkdirSync(path.join(dir, "90-earned"), { recursive: true }); fs.writeFileSync(path.join(dir, "90-earned", `pad-${i}.txt`), "Padding.\n\nThe wheel turned and the set was a size."); }
  const r = await findPriorsGround({ topic: ASK, roots: [{ dir, label: "earned" }] });
  assert.equal(r.mode, "carried", r.basis);
  const p = r.passages[0];
  assert.equal(p.label, "earned");
  assert.ok(p.text.includes("lets the wheel spin") && !p.text.includes("1890s"), "the section under Mechanism");
  assert.equal(fs.readFileSync(path.join(dir, p.rel), "utf8").slice(p.start, p.end), p.text);
});

test("keeping is idempotent and honest: the same page twice is one file; a changed page replaces it and the manifest says both", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-eg-"));
  const url = "https://example.org/freewheel";
  persistEarnedGround({ dir, docs: [{ url, text: PAGE }], task: ASK, at: "t1" });
  persistEarnedGround({ dir, docs: [{ url, text: PAGE }], task: ASK, at: "t2" });
  assert.equal(listEligible([{ dir, label: "e" }]).length, 1);
  assert.equal(fs.readFileSync(path.join(dir, "earned.jsonl"), "utf8").trim().split("\n").length, 1, "an unchanged page adds no manifest line");
  persistEarnedGround({ dir, docs: [{ url, text: PAGE + "\n\nMore text." }], task: ASK, at: "t3" });
  assert.equal(listEligible([{ dir, label: "e" }]).length, 1);
  const m = fs.readFileSync(path.join(dir, "earned.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(m.map((x) => x.at), ["t1", "t3"]);
});

test("a url is data, never a path: hostile urls keep their page inside the earned directory", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-eg-"));
  const urls = ["https://evil.example/../../../../etc/passwd", "file:///etc/hosts", "https://x.example/" + "a".repeat(400), "https://x.example/%2e%2e/%2e%2e/secret"];
  const w = persistEarnedGround({ dir, docs: urls.map((url, i) => ({ url, text: "page body " + i + " long enough to keep" })), task: "t", at: "t" });
  for (const x of w.written) { assert.ok(!/\.\./.test(x.rel) && !x.rel.startsWith("/"), x.rel); assert.equal(path.dirname(path.join(dir, x.rel)), path.join(dir, "90-earned")); }
  assert.equal(w.written.length, urls.length);
  assert.equal(fs.existsSync("/etc/passwd.txt"), false);
});

// ── which carrying passage: recurrence, not presence ────────────────────────────────────────────────────────────────────
test("CONTROL — by presence a short simile outranks the paragraph the ask is about; by recurrence it does not", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-rec-"));
  const put = (rel, text) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
  put("02-encyclopedic/freewheel.txt", [
    "Helicopters", "Freewheels are also used in rotorcraft. Just as a bicycle's wheel must spin faster than the pedals, a freewheel lets a rotorcraft's blade spin while the engine stays still.",
    "Bicycles", "The bicycle freewheel keeps the wheel spinning while the pedals stay still. A bicycle freewheel holds a pawl; the freewheel pawl rides the ratchet, so the wheel keeps spinning and the pedals stay still. Every bicycle freewheel works this way.",
  ].join("\n\n"));
  for (let i = 0; i < 6; i++) put(`01-literature/pad-${i}.txt`, "The wheel turned and the set was a size.");
  const r = await findPriorsGround({ topic: ASK, roots: [{ dir, label: "t" }] });
  assert.equal(r.mode, "carried", r.basis);
  assert.ok(r.passages[0].text.includes("pawl"), "the bicycle paragraph, not the rotorcraft simile: " + r.passages[0].text.slice(0, 80));
  // the old rule — sum of evidence counted once — would have ranked the simile first (it holds the words in a shorter text)
  const once = (txt) => { const has = new Set(txt.toLowerCase().match(/[a-z]+/g)); return ["bicycle", "freewheel", "let", "wheel", "spin", "pedal", "stay", "still"].filter((w) => [...has].some((h) => h.startsWith(w))).length; };
  const simile = "Just as a bicycle's wheel must spin faster than the pedals, a freewheel lets a rotorcraft's blade spin while the engine stays still. Freewheels are also used in rotorcraft.";
  const about = "The bicycle freewheel keeps the wheel spinning while the pedals stay still. A bicycle freewheel holds a pawl; the freewheel pawl rides the ratchet, so the wheel keeps spinning and the pedals stay still. Every bicycle freewheel works this way.";
  assert.ok(once(simile) > once(about), "presence alone rates the simile higher (" + once(simile) + " words of the ask against " + once(about) + ")");
});

test("furniture: a bracketed token like [ edit ] is not a heading, and does not end up at the edge of a section", () => {
  const text = "Helicopters\n\n[ edit ]\n\nFreewheels are also used in rotorcraft.\n\n[ edit ]\n\nHistory\n\n[ edit ]\n\nIn 1869 it was invented.";
  const start = text.indexOf("Freewheels"), end = start + "Freewheels are also used in rotorcraft.".length;
  const sec = sectionOf(text, start, end);
  assert.equal(text.slice(sec.start, sec.end), "Freewheels are also used in rotorcraft.");
  assert.ok(!text.slice(sec.start, sec.end).includes("[ edit ]"));
});

// ── the real corpus (skipped where it is not present) ───────────────────────────────────────────────────────
const CACHE = path.join(os.tmpdir(), `er7-pg-real-${process.pid}.json`);
const real = { skip: !haveReal && "live_priors not present" };

test("REAL: the bicycle ask finds no ground in live_priors — not through the cryptic-clues file, a whole book, or a paragraph on black boxes", real, async () => {
  const r = await findPriorsGround({ topic: ASK, roots: [{ dir: REAL, label: "live_priors" }], cacheFile: CACHE });
  assert.equal(r.anchor, "freewheel");
  assert.equal(r.mode, "not-carried", r.basis + " | " + r.passages.map((p) => p.id + " " + p.carries));
  assert.deepEqual(r.passages, []);
  assert.ok(r.candidateDocs > 0, "documents that mention the words exist and were examined, not admitted: " + r.candidateDocs);
});

test("REAL: the spinning-top ask finds no ground: a cryptic clue and a novel that share two of its words are not physics", real, async () => {
  const r = await findPriorsGround({ topic: "Why a spinning top stays upright", roots: [{ dir: REAL, label: "live_priors" }], cacheFile: CACHE });
  assert.equal(r.mode, "not-carried", r.passages.map((p) => p.rel + " " + p.carries));
});

test("REAL: no passage, for any ask, is the size of a book: paragraphs are read as paragraphs, CRLF files included", real, async () => {
  const r = await findPriorsGround({ topic: "the continuum hypothesis and the sizes of infinite sets", roots: [{ dir: REAL, label: "live_priors" }], cacheFile: CACHE });
  for (const p of r.passages) assert.ok(p.end - p.start < 20000, p.id + " is " + (p.end - p.start) + " characters");
});

test("REAL: the continuum-hypothesis ask finds located passages, each of which carries more than half of the words", real, async () => {
  const r = await findPriorsGround({ topic: "The continuum hypothesis and the sizes of infinite sets", roots: [{ dir: REAL, label: "live_priors" }], cacheFile: CACHE });
  assert.equal(r.mode, "carried", r.basis);
  assert.ok(r.passages.length > 0);
  for (const p of r.passages) {
    const file = fs.readFileSync(path.join(REAL, p.rel), "utf8");
    assert.equal(file.slice(p.start, p.end), p.text, "the address is exact: " + p.id);
    const w = r.weights; assert.ok(p.carries.reduce((n, x) => n + w[x], 0) * 2 > Object.values(w).reduce((n, x) => n + x, 0), p.id + " carries more than half of the evidence: " + p.carries);
    assert.ok(!/cryptic/i.test(p.rel), "never the cryptic-clues file");
  }
  assert.ok(r.passages.some((p) => /Logic\.txt$/.test(p.rel)), "the encyclopedic article on logic, measured 2026-09-30: " + r.passages.map((p) => p.rel));
  assert.ok(!r.passages.some((p) => /Electrodynamics|apics/.test(p.rel)), "a relativity paper and a creole survey share two rare words with the ask and are not about it: " + r.passages.map((p) => p.rel));
});

test("REAL: the continuum ask's ground is the section of Logic.txt under 'Mathematical logic', not one 346-character paragraph", real, async () => {
  const r = await findPriorsGround({ topic: "The continuum hypothesis and the sizes of infinite sets", roots: [{ dir: REAL, label: "live_priors" }], cacheFile: CACHE });
  const p = r.passages.find((x) => /Logic\.txt$/.test(x.rel));
  assert.ok(p, "found");
  assert.ok(p.end - p.start > 1500, "a section, " + (p.end - p.start) + " chars");
  assert.ok(/Set theory originated in the study of the infinite/.test(p.text) && /Computability theory/.test(p.text));
  assert.ok(!/^Mathematical logic\s*$/m.test(p.text) && !/^Computational logic\s*$/m.test(p.text), "bounded by the headings, headings excluded");
});

test("REAL: the second ask of the same words is answered from the cache", real, async () => {
  const r = await findPriorsGround({ topic: "The continuum hypothesis and the sizes of infinite sets", roots: [{ dir: REAL, label: "live_priors" }], cacheFile: CACHE });
  assert.equal(r.scanned.cached, true);
  assert.ok(r.scanned.ms < 5000, "warm: " + r.scanned.ms + "ms");
});

test("REAL: the bicycle-freewheel ask, with the real Wikipedia page kept as earned ground, is grounded in the bicycle mechanism, not the rotorcraft paragraph", { skip: !haveReal }, async () => {
  const earned = fs.mkdtempSync(path.join(os.tmpdir(), "er7-earned-"));
  const body = fs.readFileSync(new URL("./fixtures/freewheel-wikipedia.txt", import.meta.url), "utf8");
  const w = persistEarnedGround({ dir: earned, docs: [{ url: "https://en.wikipedia.org/wiki/Freewheel", text: body }], task: ASK });
  assert.equal(w.written.length, 1);
  const r = await findPriorsGround({ topic: ASK, roots: [{ dir: REAL, label: "live_priors" }, { dir: earned, label: "earned" }], cacheFile: path.join(earned, "words.json") });
  assert.equal(r.mode, "carried", r.basis);
  const top = r.passages.find((p) => p.label === "earned");
  assert.ok(top, "the earned page is found");
  assert.ok(top.text.includes("Bicycles use freewheels to allow the cyclist to coast"), "the ground is the section about bicycle freewheels: " + top.text.slice(0, 120));
  assert.ok(!top.text.includes("rotorcraft"), "and not the rotorcraft paragraph");
  assert.equal(body.slice(top.start, top.end), top.text);
  assert.ok(!/^\[ edit \]/.test(top.text) && !/\[ edit \]$/.test(top.text.trim()), "no furniture at the edges");
});

test("the ask as a steer: on the real Freewheel section the sentences that carry the ask outrank every one that does not — the disc sentences the jobs shipped carry none", () => {
  const body = fs.readFileSync(new URL("./fixtures/freewheel-wikipedia.txt", import.meta.url), "utf8").slice(1333, 3519);
  const score = makeAskEvidence(ASK);
  const sents = body.split(/(?<=[.!?"])\s+/).filter((x) => x.trim());
  const ranked = sents.map((t) => ({ t, s: score(t) })).sort((a, b) => b.s - a.s);
  assert.ok(/^(Bicycles use freewheels|Most bicycle freewheels|As the cyclist pedals forward)/.test(ranked[0].t), "the top sentence carries several words of the ask: " + ranked[0].t.slice(0, 60));
  assert.ok(ranked.slice(0, 4).every((r) => r.s > 0));
  const disc = ranked.filter((r) => /^(Rotating in one direction, the saw teeth|If the drive disc slows)/.test(r.t));
  assert.equal(disc.length, 2);
  assert.ok(disc.every((r) => r.s === 0), "the disc-mechanism sentences carry none of the ask");
  assert.equal(makeAskEvidence("", null)("anything at all"), 0);
  // weights steer: a rare word counts for more than a common one
  const w = { bicycl: 1, freewheel: 9 };
  assert.ok(makeAskEvidence("bicycle freewheel", w)("A freewheel.") > makeAskEvidence("bicycle freewheel", w)("A bicycle."));
});
