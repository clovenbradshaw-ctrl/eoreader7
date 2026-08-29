// spans-normalise.test.js — normaliseNewlines's own offset map (S25). This
// file, not splitSentences.test-anything, because the two functions are
// tested independently on purpose: normaliseNewlines carries a NEW
// capability (an invertible raw<->normalised offset map); splitSentences
// itself is asserted UNCHANGED, exercised transitively everywhere it
// already was.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseNewlines, splitSentences } from "../adapters/text/spans.js";

test("normaliseNewlines: CRLF collapses to LF, and toRaw recovers the true raw offset across it", () => {
  const raw = "one\r\ntwo\r\nthree";
  const { text, toRaw } = normaliseNewlines(raw);
  assert.equal(text, "one\ntwo\nthree");
  // "three" starts at normalised offset 8 (o-n-e-\n-t-w-o-\n = 8 chars).
  // In the raw string it starts at 10 (o-n-e-\r-\n-t-w-o-\r-\n = 10 chars).
  const normIdx = text.indexOf("three");
  const rawIdx = raw.indexOf("three");
  assert.equal(normIdx, 8);
  assert.equal(rawIdx, 10);
  assert.equal(toRaw(normIdx), rawIdx);
});

test("normaliseNewlines: bare CR is a same-length substitution, not a removal — toRaw is identity across it", () => {
  const raw = "a\rb\rc";
  const { text, toRaw } = normaliseNewlines(raw);
  assert.equal(text, "a\nb\nc");
  for (let i = 0; i < text.length; i++) assert.equal(toRaw(i), i, `offset ${i}`);
});

test("normaliseNewlines: mixed CRLF and bare CR in one string, offsets checked at every position", () => {
  const raw = "aa\r\nbb\rcc\r\ndd";
  const { text, toRaw } = normaliseNewlines(raw);
  // Walk every normalised offset and confirm toRaw(n) really names a raw
  // position whose surrounding text matches — the round-trip property that
  // matters, not just one hand-picked index.
  for (let n = 0; n <= text.length; n++) {
    const r = toRaw(n);
    // The raw string, with its own \r\n/\r folded the same way UP TO r,
    // must equal the normalised string up to n. This is the actual
    // invariant a consumer relies on: text.slice(0, n) corresponds to
    // raw.slice(0, r) after the same normalisation.
    assert.equal(normaliseNewlines(raw.slice(0, r)).text, text.slice(0, n), `n=${n} r=${r}`);
  }
});

test("normaliseNewlines: text with no CR at all is untouched and toRaw is identity", () => {
  const raw = "no carriage returns here\njust plain newlines\n";
  const { text, toRaw } = normaliseNewlines(raw);
  assert.equal(text, raw);
  for (const n of [0, 5, 10, text.length]) assert.equal(toRaw(n), n);
});

test("normaliseNewlines: empty string", () => {
  const { text, toRaw } = normaliseNewlines("");
  assert.equal(text, "");
  assert.equal(toRaw(0), 0);
});

test("normaliseNewlines: the actual case this closes — a marker far past many CRLF pairs resolves to its true raw offset", () => {
  // Reproduces the shape of the real specimen (a Project Gutenberg file with
  // Windows line endings) without depending on any sibling repo's corpus:
  // 42 CRLF-terminated header lines, then a target sentence, matching the
  // real file's own measured shape (42 CRLF pairs before the found span).
  const header = Array.from({ length: 42 }, (_, i) => `header line ${i}`).join("\r\n") + "\r\n";
  const target = "\"_The best book of verses for children_ _ever written._\"--A.";
  const raw = header + target + "\r\nmore text after";
  const { text, toRaw } = normaliseNewlines(raw);
  const normIdx = text.indexOf(target);
  const rawIdx = raw.indexOf(target);
  assert.ok(rawIdx > normIdx, "raw offset must be ahead of normalised offset once CRLFs have been collapsed");
  assert.equal(toRaw(normIdx), rawIdx);
  assert.equal(raw.slice(toRaw(normIdx), toRaw(normIdx) + target.length), target);
});

test("normaliseNewlines composed with splitSentences: a sentence span's offset converts back to the real raw file position", () => {
  const header = "Title: Example\r\nAuthor: Nobody\r\n\r\n";
  const body = "First sentence here. Second sentence follows.";
  const raw = header + body;
  const { text: normalised, toRaw } = normaliseNewlines(raw);
  const sentences = splitSentences(normalised);
  assert.ok(sentences.length >= 2);
  for (const s of sentences) {
    const rawStart = toRaw(s.offset);
    const rawEnd = toRaw(s.offset + s.text.length);
    // NOT raw.slice(rawStart, rawEnd) === s.text by bare equality: a span
    // that straddles an embedded CRLF (the header's own two lines, joined
    // into one sentence because nothing terminates between them) legitimately
    // still carries \r\n in the raw file where the normalised text this
    // sentence was read from carries plain \n — that \r is real, present in
    // the actual bytes, and toRaw correctly names its position. The
    // invariant self-verification depends on is that reapplying the SAME
    // normalisation to the raw slice reproduces the text that was read —
    // proving the address names the right bytes, not that those bytes are
    // already pre-normalised.
    assert.equal(normaliseNewlines(raw.slice(rawStart, rawEnd)).text, s.text, `sentence "${s.text}" must resolve in the RAW file, not just the normalised copy`);
  }
});

test("splitSentences is unchanged: normalising first and calling splitSentences on the result is byte-identical to calling it directly", () => {
  const raw = "Line one.\r\nLine two.\r\nLine three continues\rmid-sentence.\n\nNew paragraph here.";
  const direct = splitSentences(raw);
  const { text: pre } = normaliseNewlines(raw);
  const viaPrenormalised = splitSentences(pre);
  assert.deepEqual(direct, viaPrenormalised);
});
