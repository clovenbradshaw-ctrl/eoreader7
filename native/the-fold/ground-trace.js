// ground-trace.js — WHAT THE MODEL SAYS IS GROUNDED ONLY IF IT LINKS TO AN ADDRESS IN THE GROUND (2026-09-30).
//
// User direction: "anything the model says that can't be holographically linked to an auditable source is 'ungrounded' by
// definition"; "the proper state of things is it is ungrounded if the model has no input." Priors STEER which span is
// chosen (priors-ground.js); they never ENTER the text. So a shipped sentence is one of two things: LINKED — it carries its
// claim in one sentence of one source, at a byte address that slices back to that sentence — or UNGROUNDED, the model's own
// statement. There is no third state and no "sounds plausible".
//
// Measured on real bytes (2026-09-30), the job for "How a bicycle freewheel lets the wheel spin while the pedals stay still"
// was grounded on the Wikipedia Freewheel mechanism section and wrote, before three sentences quoted from it, "Bicycles don't
// just coast; they actively shift their momentum." and "This is achieved by a mechanism that allows the wheel to continue
// rotating while the pedals are stationary." Neither is in the section. document-ledger.js's citationLedger called them
// "company" and "verbatim": it counts a sentence sourced when three of its words occur ANYWHERE in a whole source — the
// per-document presence rule priors-ground.js had to leave for the passage. This module is the same correction at the
// grain of the claim: the words must occur TOGETHER, in one sentence of the source.
//
// The rule, a definition and no tuned number. A sentence is LINKED to a source sentence when MORE THAN HALF of its content
// words (draftWords stems minus the engine's isFunctionWord) occur in that one source sentence, AND every number it states
// occurs there too (a wrong year is a different claim). Among linking sentences the one carrying the most is the link. A
// sentence with no content word asserts nothing ("Yes.") and is not counted. No model call.
//
// Limits, stated: lexical — a negation or a reversal that keeps the words ("freewheels never spin") links; a claim
// assembled from TWO source sentences, neither carrying more than half of it, reads as ungrounded (the failure is to say
// "ungrounded", never to pass a claim); English word forms (see ground-carries.js).
import { draftWords } from "./eot-draft.js";
import { isFunctionWord } from "./pos-prior.js";

export const GROUND_TRACE_SCHEMA = "EOGroundTrace@1";

const contentWords = (s) => [...new Set(draftWords(String(s ?? "")).filter((w) => !isFunctionWord(w)))];
const numbersOf = (s) => [...new Set(String(s ?? "").match(/\d[\d.,]*\d|\d/g) ?? [])];

// sentence boundaries WITH offsets, so a link is an address: text.slice(start, end) is the sentence
export function sentenceSpans(text) {
  const out = []; const src = String(text ?? "");
  const r = /(?<=[.!?])\s+(?=[A-Z"“(\[])|\n[ \t\r]*\n/g; let last = 0, m;
  const push = (a, b) => { while (a < b && /\s/.test(src[a])) a++; while (b > a && /\s/.test(src[b - 1])) b--; if (b > a) out.push({ start: a, end: b }); };
  while ((m = r.exec(src))) { push(last, m.index); last = m.index + m[0].length; }
  push(last, src.length);
  return out;
}

/**
 * makeTracer(sources) → (sentence) => { status: "linked" | "ungrounded" | "no-claim", link, words }
 * The ground's sentences are read once; the tracer is then cheap to ask one sentence at a time, as the mouth draws.
 * link: { id, start, end, text, carries } — text is the SOURCE sentence the address slices back to.
 */
export function makeTracer(sources = []) {
  const units = [];
  for (const s of sources) for (const sp of sentenceSpans(s.text)) { const t = String(s.text).slice(sp.start, sp.end); units.push({ id: s.id, start: sp.start, end: sp.end, text: t, has: new Set(draftWords(t)), nums: numbersOf(t) }); }
  return (sentence) => {
    const words = contentWords(sentence);
    if (!words.length) return { status: "no-claim", link: null, words };
    const nums = numbersOf(sentence);
    let best = null;
    for (const u of units) {
      const carries = words.filter((w) => u.has.has(w));
      if (carries.length * 2 <= words.length) continue;
      if (!nums.every((n) => u.nums.includes(n))) continue;
      if (!best || carries.length > best.carries.length) best = { id: u.id, start: u.start, end: u.end, text: u.text, carries };
    }
    return { status: best ? "linked" : "ungrounded", link: best, words };
  };
}

/**
 * traceToGround({ text, sources }) → EOGroundTrace@1
 *   text     what the model wrote
 *   sources  [{ id, text }]  the ground: what the composition was allowed to stand on
 * sentences: [{ text, status: "linked" | "ungrounded", link: { id, start, end, carries } | null, words }]
 */
export function traceToGround({ text = "", sources = [] } = {}) {
  const trace = makeTracer(sources);
  const sentences = [];
  for (const sp of sentenceSpans(text)) {
    const t = String(text).slice(sp.start, sp.end);
    if (/^#{1,6}\s/.test(t)) continue; // a markdown heading names a part; it asserts nothing
    const r = trace(t);
    if (r.status === "no-claim") continue; // asserts nothing
    sentences.push({ text: t, status: r.status, link: r.link, words: r.words });
  }
  const linked = sentences.filter((x) => x.status === "linked").length;
  return {
    schema: GROUND_TRACE_SCHEMA, sentences, linked, ungrounded: sentences.length - linked,
    basis: sources.length
      ? `${linked} of ${sentences.length} sentence(s) carry more than half of their content words (and every number) in one sentence of the ground; the rest are the model's own statement, ungrounded`
      : `no ground was handed to the composition: all ${sentences.length} sentence(s) are the model's own statement, ungrounded`,
  };
}
