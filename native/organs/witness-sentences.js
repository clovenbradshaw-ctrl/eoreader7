// witness-sentences.js — the witness over an ANSWER's own sentences, against
// the passages the answer was drafted from. The relation tier reads SLOT
// (subject —label→ object) and stops at the paraphrase wall: a true
// sentence arranged differently from the material ("Kutuzov replaced
// Barclay" vs the material's "the Tsar replaced Barclay with Kutuzov")
// reads `unbound`, and a false sentence whose verb the material never uses
// ("the Russian army continued to fight") reads `unheard` or produces no
// claim at all — and both were measured live, on one answer, 2026-09-02:
// the true sentence wore the ∅ badge and the false one wore nothing.
//
// This organ asks the witness the question the relation tier cannot: does
// any passage STATE this sentence? Same protocol as the corroboration walk
// (corroboration.js::witnessNote): SELECT — the model points at a
// mechanically gathered stating sentence by index and never writes a
// because — armed by the same-index rule, generate as the fallback when no
// co-present candidate can be offered. Only sentences the relation tier
// did not settle are asked (a bound sentence is already supported); asks
// are sequential, never a fan-out, and the budget is the caller's own
// declared number (P9), never a default.
//
// Verdicts, per sentence: `states` (a passage states it — the decider is
// the passage's own bytes), `refused` (asked, and no offered sentence
// states it — a fact about THESE passages, never a conviction: the
// material may simply not cover it), `skipped` (not asked: settled by the
// relation tier, or the budget ran out first, or the sentence carries no
// content to anchor a candidate on). A refusal never manufactures a
// contradiction; it marks. The precision guard is inherited from the
// walk: every attest is the passage's verbatim sentence, never the model's
// words.
import { witnessNote, textFeatures } from "./corroboration.js";

export const WITNESS_VERDICTS = Object.freeze(["states", "refused", "skipped"]);

/** The two ends a sentence is asked about: its claim's ends when the relation tier extracted one, else its two longest content words (declared, crude, said so). */
export function endsFor(sentence, claims) {
  const c = (claims ?? []).find((k) => k.sentence === sentence && k.end1 && k.end2);
  if (c) return { end1: String(c.end1), end2: String(c.end2), from: "claim" };
  const words = [...textFeatures(sentence)].sort((a, b) => b.length - a.length);
  if (words.length < 2) return null;
  return { end1: words[0], end2: words[1], from: "longest-words" };
}

/**
 * One witnessNote outcome → one row. ONLY the model saying "no" to every
 * offered sentence is a refusal ("no passage states this"); every other
 * non-verdict is the PROTOCOL declining to reach a verdict — no candidate
 * to offer, the arm not formable, the pair indiscriminate, the pointed-at
 * decider failing the company wall (measured live 2026-09-02:
 * `decider_unrelated` on "prepared for battle" against "ordered his soldiers
 * to prepare for battle" — a morphology gap in the wall, not silence from
 * the material) — and is a typed SKIP that draws no badge.
 */
export function rowFor(w) {
  if (w?.verdict === "states") return { witness: "states", decider: w.because ?? null, span: w.span ?? null };
  if (w?.refused === "no-testimony") return { witness: "refused", why: "no-testimony", via: w?.via ?? null };
  return { witness: "skipped", why: `witness could not reach a verdict: ${w?.refused ?? "unknown"}`, via: w?.via ?? null };
}

/** Which sentences the relation tier settled: any claim on the sentence bound → settled. */
export function settledBy(sentence, claims) {
  const mine = (claims ?? []).filter((k) => k.sentence === sentence);
  return mine.some((k) => k.verdict === "bound" || k.verdict === "witnessed");
}

/**
 * witnessSentences(sentences, claims, passages, organs) → per-sentence
 * witness rows, in order. `organs`: ask (generate), selectAsk, splitSentences,
 * testimony bundle, maxAsks (required, P9). Passages are joined into one
 * source so a stating sentence anywhere in what the answer was drafted from
 * can be pointed at.
 */
export async function witnessSentences(sentences, claims, passages, { ask, selectAsk = null, splitSentences = null, testimony, maxAsks } = {}) {
  if (!Number.isFinite(maxAsks)) throw new TypeError("witnessSentences: maxAsks is declared by the caller (P9)");
  const text = (passages ?? []).map((p) => String(p?.text ?? "")).filter(Boolean).join("\n\n");
  const source = { ref: "passages", text };
  const rows = [];
  let asks = 0;
  for (const sentence of sentences ?? []) {
    if (settledBy(sentence, claims)) { rows.push({ sentence, witness: "skipped", why: "settled by the relation tier" }); continue; }
    const ends = endsFor(sentence, claims);
    if (!ends) { rows.push({ sentence, witness: "skipped", why: "no content to anchor a candidate on" }); continue; }
    if (asks >= maxAsks) { rows.push({ sentence, witness: "skipped", why: `budget of ${maxAsks} ask(s) spent` }); continue; }
    asks += 1;
    let w;
    try { w = await witnessNote(sentence, source, { ask, selectAsk, splitSentences, testimony, ends: { end1: ends.end1, end2: ends.end2 } }); }
    catch (err) { rows.push({ sentence, witness: "skipped", why: `witness threw: ${err?.message ?? err}` }); continue; }
    rows.push({ sentence, ...rowFor(w), ends });
  }
  return { rows, asks };
}
