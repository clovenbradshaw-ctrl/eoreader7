// ground-trace.test.mjs — a shipped sentence is grounded only if it links to an address in the ground.
//
// Real bytes: tests/fixtures/freewheel-wikipedia.txt is the Wikipedia "Freewheel" page a consented hunt kept;
// freewheel-job-projection.txt is what gemma2:2b wrote for "How a bicycle freewheel lets the wheel spin while the pedals stay
// still" when grounded on its mechanism section (chars 1333-3519): two sentences of its own, then two quoted from the ground.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { traceToGround, sentenceSpans, makeTracer } from "../native/the-fold/ground-trace.js";
import { admit, segmentSentences } from "../native/the-fold/admission.js";
import { citationLedger } from "../native/the-fold/document-ledger.js";

const page = fs.readFileSync(new URL("./fixtures/freewheel-wikipedia.txt", import.meta.url), "utf8");
const ground = page.slice(1333, 3519);
const projection = fs.readFileSync(new URL("./fixtures/freewheel-job-projection.txt", import.meta.url), "utf8");
const src = [{ id: "priors:earned/90-earned/freewheel.txt#1333-3519", text: ground }];

test("CONTROL — the existing citation ledger calls the model's own sentences sourced (verbatim / company), none unsupported", () => {
  const c = citationLedger(projection, new Map([["g", ground]]));
  assert.equal(c.unsupported, 0, "it finds no unsupported sentence: three words anywhere in a whole source is enough");
  assert.ok(c.citations.some((x) => /^Bicycles don't just coast/.test(x.essaySentence) && x.kind !== "unsupported"));
  assert.ok(c.citations.some((x) => /^This is achieved by a mechanism/.test(x.essaySentence) && x.kind !== "unsupported"));
});

test("the real job: the model's two sentences are ungrounded; the two quoted from the ground are linked to an address that slices back", () => {
  const t = traceToGround({ text: projection, sources: src });
  const by = (re) => t.sentences.find((s) => re.test(s.text));
  assert.equal(by(/^Bicycles don't just coast/).status, "ungrounded");
  assert.equal(by(/^This is achieved by a mechanism/).status, "ungrounded");
  for (const re of [/^This simplest freewheel device/, /^When the drive disc slows down/]) {
    const s = by(re); assert.equal(s.status, "linked");
    assert.equal(s.link.id, src[0].id);
    // the model lightly edited them ("This simplest" for "The simplest"; "spring-loaded" for "spring -loaded"): the link is to the
    // SOURCE sentence, which the address slices back to — carried, not necessarily byte-verbatim
    const at = ground.slice(s.link.start, s.link.end);
    assert.ok(/^(The simplest freewheel device|(When|If) the drive disc slows down)/.test(at), at.slice(0, 60));
    assert.ok(s.link.carries.length * 2 > s.words.length);
  }
  assert.deepEqual([t.linked, t.ungrounded], [2, 2]);
});

test("a paraphrase that keeps more than half of its content words in one source sentence is linked; one that merely shares the topic is not", () => {
  const g = [{ id: "g", text: "Bicycles use freewheels to allow the cyclist to coast without pedaling. Rotating either the wheel or cassette backwards will engage the drive." }];
  const t = traceToGround({ text: "Cyclists coast without pedaling because bicycles use freewheels. Bicycles shift their momentum actively.", sources: g });
  assert.equal(t.sentences[0].status, "linked");
  assert.equal(t.sentences[1].status, "ungrounded");
});

test("a number the source does not state is a different claim: the same words with a wrong year are ungrounded", () => {
  const g = [{ id: "g", text: "In 1869, William Van Anden invented the freewheel for the bicycle." }];
  assert.equal(traceToGround({ text: "William Van Anden invented the freewheel for the bicycle in 1869.", sources: g }).sentences[0].status, "linked");
  assert.equal(traceToGround({ text: "William Van Anden invented the freewheel for the bicycle in 1870.", sources: g }).sentences[0].status, "ungrounded");
});

test("no input, ungrounded: with nothing handed to the composition every claim is the model's own", () => {
  const t = traceToGround({ text: "Bicycles coast downhill. This is often overlooked in design.", sources: [] });
  assert.deepEqual([t.linked, t.ungrounded], [0, 2]);
  assert.match(t.basis, /no ground/);
});

test("a sentence that asserts nothing is not counted; offsets slice back to the sentence", () => {
  const t = traceToGround({ text: "Yes. The freewheel uses a pawl.", sources: [{ id: "g", text: "The freewheel uses a pawl and ratchet." }] });
  assert.equal(t.sentences.length, 1);
  const text = "First one here.  Second one there.\n\nThird.";
  for (const sp of sentenceSpans(text)) assert.ok(["First one here.", "Second one there.", "Third."].includes(text.slice(sp.start, sp.end)));
});

test("admission: an unlinked sentence is refused with its reason, a linked one is admitted and returns the source sentence it lit", () => {
  const trace = makeTracer(src);
  const opts = { ground, priorLanding: "", instruction: "", registry: new Set(), linked: trace };
  const bad = admit("Bicycles don't just coast; they actively shift their momentum.", opts);
  assert.equal(bad.admit, false);
  assert.equal(bad.refused[0].kind, "unlinked");
  const good = admit("This simplest freewheel device consists of two saw-toothed, spring-loaded discs pressing against each other axially with the toothed sides together, like a ratchet but with the usual stationary part also rotating.", opts);
  if (good.admit) assert.match(good.lit.text, /^The simplest freewheel device/);
  else assert.notEqual(good.refused[0]?.kind, "unlinked", "it may be refused for another reason, never for lack of a link");
  // and without a tracer nothing changes: the option is additive
  const plain = admit("Bicycles don't just coast; they actively shift their momentum.", { ...opts, linked: null });
  assert.notEqual(plain.refused?.[0]?.kind, "unlinked");
});

test("a markdown heading (the document's own title) is a name, not a claim: it is not traced", () => {
  const g = [{ id: "g", text: "The freewheel uses a pawl and ratchet." }];
  const r = traceToGround({ text: "# How a bicycle freewheel lets the wheel spin while the pedals\n\nThe freewheel uses a pawl and ratchet.", sources: g });
  assert.equal(r.sentences.length, 1);
  assert.equal(r.sentences[0].status, "linked");
});

test("CONTROL (Wilson) — the tracer and the window cut the real ground at the same places, so a lit sentence is excluded by its exact string", () => {
  const win = new Set(segmentSentences(ground));
  const units = sentenceSpans(ground).map((sp) => ground.slice(sp.start, sp.end));
  const odd = units.filter((u) => !win.has(u));
  assert.deepEqual(odd, [], "tracer units the window does not hold as a sentence: " + JSON.stringify(odd.map((u) => u.slice(0, 80))));
});

test("Gary's law on the window: the mouth is never handed a prohibition or an apparatus marker for spent sentences (source control)", () => {
  const runner = fs.readFileSync(new URL("../proxy-runner.mjs", import.meta.url), "utf8");
  assert.ok(!/\[already grounded/.test(runner), "the exhausted-window marker told the mouth 'write this anew, never the same sentence' (gary.js information-not-prohibition, flagged 2026-09-30)");
});

test("CONTROL — a title on the line directly above the paragraph (no blank line) does not swallow the paragraph's first sentence", () => {
  const g = [{ id: "g", text: "The freewheel uses a pawl and ratchet." }];
  const r = traceToGround({ text: "# How a bicycle freewheel lets the wheel spin\nThe freewheel uses a pawl and ratchet.", sources: g });
  assert.equal(r.sentences.length, 1);
  assert.equal(r.sentences[0].status, "linked");
});
