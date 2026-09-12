// witness-sentences.js — the witness over an ANSWER's own sentences, against
// Handle: Khaldun — after Ibn Khaldun, who checked a transmitted report against the nature of things before admitting it as history. Amendment XVII.
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

/**
 * The two ends a sentence is asked about: its claim's ends when the relation
 * tier extracted one, else two of its own content words — declared, crude,
 * said so, but no longer picked by raw length alone.
 *
 * BUG (found live, 2026-09-08): the old fallback sorted the sentence's own
 * content words by character length and took the top two, with no regard
 * for whether either word appears anywhere in what is being witnessed.
 * `statingCandidates` requires BOTH ends' features to co-occur in one source
 * sentence (h1>0 && h2>0), so an end drawn from a word the source never
 * uses guarantees zero candidates — the witness is refused as "no-testimony"
 * however long that word is. A denial's OWN vocabulary is routinely the
 * longest thing in the sentence: "Nope, goats were not mentioned in the
 * sources." picked ["mentioned","sources"] (9 and 7 letters) over "goats"
 * (5), searched a dialogue about live goats for "mentioned"+"sources" —
 * present nowhere in it — and refused a passage stating the fact verbatim.
 * Same shape on "The sources do not mention a Disney movie.": ["sources",
 * "mention"] beat "Disney"/"movie", even though the source's own sentence
 * ("What did you think about the Disney movie Frozen?") shares both those
 * shorter words with the answer.
 *
 * The fix reuses `proposeCandidates`'s own idiom, one file over: a word's
 * OWN presence in the source's feature set is checked before its length is
 * used to rank it. But presence alone is not quite enough — measured live
 * on the goats specimen above, "about" is ALSO a real word of the source
 * (two unrelated turns use it) and tied "goats" for length, so the picked
 * pair became "about"+"goats"; no sentence of the source states BOTH of
 * those together, and `statingCandidates`' own AND-gate (h1>0 && h2>0 — the
 * SAME sentence, not merely the same source) still returned nothing. Two
 * words that are each real but never co-occur fail exactly like two absent
 * words. So when the caller hands over the same sentence segmenter
 * `statingCandidates` itself is given, present words are ranked by how many
 * of the source's own sentences they each appear in — FEWER is preferred,
 * the same "recurs a lot → not distinctive" reasoning `statingCandidates`'
 * own `isGeneric` already applies one register over ("about" turns up in
 * two unrelated sentences; "goats" in exactly the one that matters) — and a
 * pair is only used when the source actually states it TOGETHER, checked
 * over those same sentences. Without a segmenter, presence-then-length is
 * the best available signal. One shared word anchors BOTH ends either way
 * (the same word twice turns the AND-gate into a plain presence check,
 * which is exactly what a single shared word licenses — never a guess at a
 * second word the source may not carry); zero shared words falls back to
 * the old length-only sort, unchanged, because there is nothing left to
 * prefer it over.
 */
export function endsFor(sentence, claims, sourceText = null, splitSentences = null) {
  const c = (claims ?? []).find((k) => k.sentence === sentence && k.end1 && k.end2);
  if (c) return { end1: String(c.end1), end2: String(c.end2), from: "claim" };
  const words = [...textFeatures(sentence)];
  if (words.length < 2) return null;
  const sourceFeatures = sourceText ? textFeatures(sourceText) : null;
  const present = sourceFeatures ? words.filter((w) => sourceFeatures.has(w)) : [];
  if (present.length) {
    if (sourceText && typeof splitSentences === "function") {
      let sentFeatures = [];
      try { sentFeatures = (splitSentences(sourceText) ?? []).map((s) => textFeatures(typeof s === "string" ? s : s?.text ?? "")); } catch { sentFeatures = []; }
      // Rarer (fewer stating sentences) first — the more specific word is
      // the better anchor, and the tiebreak among equally rare words is the
      // old length-only signal, kept for determinism.
      const bySpecificity = [...present].sort((a, b) => {
        const ca = sentFeatures.filter((f) => f.has(a)).length, cb = sentFeatures.filter((f) => f.has(b)).length;
        return ca - cb || b.length - a.length;
      });
      for (let i = 0; i < bySpecificity.length; i++) {
        for (let j = i + 1; j < bySpecificity.length; j++) {
          if (sentFeatures.some((f) => f.has(bySpecificity[i]) && f.has(bySpecificity[j]))) return { end1: bySpecificity[i], end2: bySpecificity[j], from: "longest-words" };
        }
      }
      // no pair co-occurs in any one source sentence — the single rarest
      // present word anchors both ends instead of a doomed pair.
      return { end1: bySpecificity[0], end2: bySpecificity[0], from: "longest-words" };
    }
    const sorted = [...present].sort((a, b) => b.length - a.length);
    if (sorted.length >= 2) return { end1: sorted[0], end2: sorted[1], from: "longest-words" };
    return { end1: sorted[0], end2: sorted[0], from: "longest-words" };
  }
  const sorted = [...words].sort((a, b) => b.length - a.length);
  return { end1: sorted[0], end2: sorted[1], from: "longest-words" };
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

/** Which sentences the relation tier settled, or the expectation already authored: any claim on the sentence bound → settled; a sentence ALL of whose claims are in `matched` (the expectation's matched set — their addresses were already carried) costs nothing to check (GFP Pass 41). */
export function settledBy(sentence, claims, matched = null) {
  const mine = (claims ?? []).filter((k) => k.sentence === sentence);
  if (mine.some((k) => k.verdict === "bound" || k.verdict === "witnessed")) return true;
  if (matched && mine.length && mine.every((k) => matched.has(k.key ?? k.sentence))) return true;
  return false;
}

/**
 * witnessSentences(sentences, claims, passages, organs) → per-sentence
 * witness rows, in order. `organs`: ask (generate), selectAsk, splitSentences,
 * testimony bundle, maxAsks (required, P9), and the two declared arm
 * widenings `fillerPool` / `armEitherEnd` (both off by default; see
 * corroboration.js's own headers and S52 for what each measures). Passages are joined into one
 * source so a stating sentence anywhere in what the answer was drafted from
 * can be pointed at.
 */
export async function witnessSentences(sentences, claims, passages, { ask, selectAsk = null, splitSentences = null, testimony, maxAsks, fillerPool = null, armEitherEnd = false, matched = null } = {}) {
  if (!Number.isFinite(maxAsks)) throw new TypeError("witnessSentences: maxAsks is declared by the caller (P9)");
  const text = (passages ?? []).map((p) => String(p?.text ?? "")).filter(Boolean).join("\n\n");
  const source = { ref: "passages", text };
  const rows = [];
  let asks = 0;
  for (const sentence of sentences ?? []) {
    if (settledBy(sentence, claims, matched)) { rows.push({ sentence, witness: "skipped", why: "settled by the relation tier or already expected by the record" }); continue; }
    const ends = endsFor(sentence, claims, text, splitSentences);
    if (!ends) { rows.push({ sentence, witness: "skipped", why: "no content to anchor a candidate on" }); continue; }
    if (asks >= maxAsks) { rows.push({ sentence, witness: "skipped", why: `budget of ${maxAsks} ask(s) spent` }); continue; }
    asks += 1;
    let w;
    try { w = await witnessNote(sentence, source, { ask, selectAsk, splitSentences, testimony, ends: { end1: ends.end1, end2: ends.end2 }, fillerPool, armEitherEnd }); }
    catch (err) { rows.push({ sentence, witness: "skipped", why: `witness threw: ${err?.message ?? err}` }); continue; }
    rows.push({ sentence, ...rowFor(w), ends });
  }
  return { rows, asks };
}
