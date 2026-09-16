// look.test.mjs — the native "looking" capacity (native/organs/look.js).
//
// The organ exists because a reading can be wrong in a way nothing above the
// log can see (LAVAR.md §1): text whose FORMATTING the plain-text reader
// structurally cannot see (a table, a column, box-drawing, sub-sentence
// lines) is read wrong before a single referent resolves. "Looking" is the
// fix one register down — render it and read the image. The pure, model-free
// parts are tested here (the trigger + the grade); the CV/OCR/vision senses
// are external dependencies (opencv venv, tesseract, ollama vision models)
// and are exercised by the proxy's own integration path, not this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { weirdFormattingScore, shouldLook, isImageFileName, shouldLookPage } from "./look.js";
import { lavarGradeReading } from "../the-fold/document-ledger.js";

const PROSE = "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do. Once or twice she had peeped into the book her sister was reading.";

test("normal prose is NOT flagged as misread formatting", () => {
  const s = weirdFormattingScore(PROSE);
  assert.equal(s.score, 0);
  assert.deepEqual(s.signals, []);
});

test("a table is flagged — the reader is reading it wrong", () => {
  const table = ["| Name   | Age |", "| Alice  |  7  |", "| Bill   |  6  |", "| Dinah  | cat |"].join("\n");
  const s = weirdFormattingScore(table);
  assert.ok(s.score > 0, `expected table_rows signal, got ${JSON.stringify(s.signals)}`);
  assert.ok(s.signals.includes("table_rows"));
});

test("very short sub-sentence lines (a column) are flagged", () => {
  const column = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta"].join("\n");
  const s = weirdFormattingScore(column);
  assert.ok(s.score > 0, `expected a column signal, got ${JSON.stringify(s.signals)}`);
});

test("box-drawing text is flagged", () => {
  const box = ["┌─────────────┐", "│  box 1      │", "└─────────────┘", "┌─────────────┐", "│  box 2      │", "└─────────────┘"].join("\n");
  const s = weirdFormattingScore(box);
  assert.ok(s.score > 0, `expected box_drawing signal, got ${JSON.stringify(s.signals)}`);
});

test("shouldLook: images always look; weird-format text looks; prose does not", () => {
  assert.deepEqual(shouldLook({ fileName: "diagram.png", isImage: true }), { look: true, reason: "image_file" });
  const tableGate = shouldLook({ fileName: "t.txt", text: ["| a | b |", "| 1 | 2 |", "| 3 | 4 |"].join("\n") });
  assert.equal(tableGate.look, true);
  assert.match(tableGate.reason, /weird_formatting/);
  const proseGate = shouldLook({ fileName: "p.txt", text: PROSE });
  assert.equal(proseGate.look, false);
});

test("isImageFileName covers the proxy's image extensions", () => {
  assert.ok(isImageFileName("shot.png"));
  assert.ok(isImageFileName("scan.JPG"));
  assert.ok(!isImageFileName("notes.md"));
  assert.ok(!isImageFileName("book.txt"));
});

// ── shouldLookPage: the web organ's page trigger ───────────────────────────
const PAGE_PROSE_HTML = "<html><head><title>An ordinary article</title></head><body><h1>Title</h1><p>Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do. Once or twice she had peeped into the book her sister was reading.</p></body></html>";
const PAGE_PROSE_TEXT = "Title\n\nAlice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do. Once or twice she had peeped into the book her sister was reading.";

test("shouldLookPage: an ordinary prose page does NOT need looking", () => {
  const v = shouldLookPage({ url: "https://example.org/article", title: "An ordinary article", text: PAGE_PROSE_TEXT, html: PAGE_PROSE_HTML });
  assert.equal(v.look, false);
  assert.equal(v.auto, false);
  assert.deepEqual(v.signals, []);
});

test("shouldLookPage: a page whose text face is empty fires AND auto-fires (JS shell / image page)", () => {
  const v = shouldLookPage({ url: "https://example.org/app", text: "", html: "<html><head><title>App</title></head><body><div id='root'></div></body></html>" });
  assert.equal(v.look, true);
  assert.equal(v.auto, true);
  assert.ok(v.signals.includes("empty_face"));
});

test("shouldLookPage: visual structure is a SURVEY signal, never an auto-fire — a page with a table AND extracted prose is read fine as text", () => {
  const html = "<html><body><p>Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do. Once or twice she had peeped into the book her sister was reading.</p><table><tr><td>a</td><td>b</td></tr></table><img src='x.png' alt='a diagram'><figure><svg></svg></figure></body></html>";
  const v = shouldLookPage({ url: "https://example.org/diagram", title: "Diagram", text: PAGE_PROSE_TEXT, html });
  assert.equal(v.look, true, "survey says it is worth a look");
  assert.equal(v.auto, false, "but the prose extracted fine — nothing auto-renders");
  assert.ok(v.signals.includes("embedded_visual"));
});

test("shouldLookPage: embedded media (an iframe the dump drops whole) is survey-only, never auto", () => {
  const v = shouldLookPage({ url: "https://example.org/embed", title: "Embed", text: "some text", html: "<html><body><p>some text</p><iframe src='https://example.org/other'></iframe></body></html>" });
  assert.equal(v.look, true);
  assert.equal(v.auto, false);
  assert.ok(v.signals.includes("embedded_media"));
});

test("shouldLookPage: extracted text that itself reads wrong fires AND auto-fires, reusing the file trigger's own score", () => {
  const boxText = ["┌─────────────┐", "│  box 1      │", "└─────────────┘", "┌─────────────┐", "│  box 2      │", "└─────────────┘"].join("\n");
  const v = shouldLookPage({ url: "https://example.org/box", title: "Box", text: boxText, html: "<html><body><pre>box</pre></body></html>" });
  assert.equal(v.look, true);
  assert.equal(v.auto, true);
  assert.ok(v.signals.some((s) => s.startsWith("weird_formatting")));
});

test("shouldLookPage: no html bytes and no text is not a page to look at (nothing rendered either)", () => {
  const v = shouldLookPage({ url: "https://example.org/x", text: "", html: "" });
  assert.equal(v.look, false);
  assert.equal(v.auto, false);
});

test("shouldLookPage: the real Borodino article fires the survey but NOT auto (prose extracted fine)", () => {
  const html = "<html><body><p>prose</p><table><tr><td>1</td><td>2</td></tr></table><img src='x'></body></html>";
  const v = shouldLookPage({ url: "https://en.wikipedia.org/wiki/Battle_of_Borodino", title: "Battle of Borodino", text: "The Battle of Borodino took place near the village of Borodino on 7 September 1812 during Napoleon's invasion of Russia.", html });
  assert.equal(v.look, true);
  assert.equal(v.auto, false);
});

test("lavarGradeReading: a misread-formatting source is 'not reading well' and should look", () => {
  const table = ["| Name   | Age |", "| Alice  |  7  |", "| Bill   |  6  |"].join("\n");
  const grade = lavarGradeReading({ source: "t.txt", text: table, propositions: [], weirdFormattingScore });
  assert.equal(grade.readingWell, false);
  assert.equal(grade.shouldLook, true);
  assert.ok(grade.failures.some((f) => f.kind === "misread_formatting"));
});

test("lavarGradeReading: prose read well is reading well", () => {
  const grade = lavarGradeReading({ source: "p.txt", text: PROSE, propositions: [{ label: "sitting", end2: "by her sister" }], weirdFormattingScore });
  assert.equal(grade.readingWell, true);
  assert.equal(grade.shouldLook, false);
});

test("lavarGradeReading: a substantial source with zero propositions is a silent miss", () => {
  const longProse = Array.from({ length: 40 }, () => PROSE).join("\n\n");
  const grade = lavarGradeReading({ source: "s.txt", text: longProse, propositions: [], weirdFormattingScore });
  assert.equal(grade.readingWell, false);
  assert.ok(grade.failures.some((f) => f.kind === "silent_read"));
});