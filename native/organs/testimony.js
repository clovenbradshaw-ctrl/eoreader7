// testimony.js — the semantic witness tier: a small model handed ONE claim
// and ONE page's bytes, asked one BINARY question twice — "does the passage
// say this sentence is true?" for the claim, then for its sibling-swapped
// twin — with the verdict derived mechanically from the pair and every wall
// around the answers mechanical (L5: the witness is never trusted on its
// own word; measured same day: the three-way form got the right `because`
// and the wrong label out of gemma2:2b, so classification was taken away
// from the model entirely).
//
// Born from a measured failure (2026-08-19, "who won the 1960 world
// series?"): gemma2:2b answered "The New York Yankees won the 1960 World
// Series" — false, the Pirates won — and the checking ladder split exactly
// along its levels. The relation tier (hypergraph.js) said "the material
// never binds this edge" — honest but weak: its contradiction test matches
// an edge on subject+verb, and "the Pirates won X" vs "the Yankees won X"
// differs in SUBJECT, so no edge ever matched. Knowing that "won the 1960
// World Series" seats exactly one subject is world knowledge a mechanical
// extractor doesn't have. Meanwhile the web-proof tier CORROBORATED the
// false claim ✓ 3/3 — bag-of-words containment finds the loser's name all
// over every page about the series. The tier that understood least spoke
// loudest. A reader over the same bytes settles it in one short call:
// "contradicted — the passage says the Pirates won."
//
// The witness is a WITNESS, not an oracle (parliament-of-witnesses): its
// testimony lands typed beside the byte tier and the structural tier, and
// it is disciplined three ways, all mechanical, all here:
//   1. It must point at bytes: `because` — the passage words that decide
//      its verdict — is checked for containment in the slice it actually
//      read (the same wordSet/hasWord fold snipClaim states claims with).
//      Testimony whose decider is not in the passage is refused.
//   2. It is armed with a perturbation (the null-arm discipline): the same
//      question is asked about a sibling-swapped claim — the claim's name
//      replaced with a name from the PAGE'S OWN universe (Leibniz: the
//      sibling comes from the witness's material, never from the world at
//      large). A witness whose verdict does not move under the swap is
//      testifying about the vocabulary, not the claim — a distinction
//      without a difference — and its testimony is refused as insensitive.
//   3. A page with no sibling to swap cannot be armed; testimony still
//      ships but carries `armed: false` — disclosed, never implied tested.
//
// Pure: no DOM, no fetch, no model call — the caller (app.js) owns the one
// crossing and injects the completed text back through readTestimony.

import { foldDiacritics } from "./source.js";
import { wordSet, hasWord, splitSentences, CLAIM_STOPWORDS } from "./grounding.js";
import { namesIn } from "./cite.js";
import { snipClaim } from "./primary.js";

// A small, disclosed furniture register for REAL FETCHED PAGES — the same
// precedent grounding.js's own ABBREV_EXPANSIONS sets (a narrow, measured
// list with its reason stated, never a general capability claim). Measured
// live (2026-08-19, 25-specimen batch eval against real Wikipedia pages): a
// sentence naming an image's own caption ("a 1900 portrait by Jean Leon
// Gerome Ferris depicting Franklin, Adams, and Jefferson working on the
// Declaration") legitimately repeats the claim's own topic words in the
// caption's OWN TITLE TEXT ("Writing the Declaration of Independence,
// 1776") — which out-scored the sentence actually crediting Jefferson,
// because caption prose and reference prose read identically to word-
// overlap scoring. This does not classify content — it excludes the one
// Wikipedia furniture shape measured to cause it, the same way `blankStructure`
// excludes markdown headings from model output. A sentence matching stays
// OUT of candidate scoring entirely; it is never silently trusted either.
const CAPTION_MARKERS = /\b(?:portrait by|photograph by|painting by|photo by|drawing by|illustration by|engraving by)\b/i;

/** Ollama structured-outputs schema: a BINARY answer plus the decider in
 * the passage's own words — a shape by physics, not by asking nicely
 * (completeOnce's own posture for json calls). Binary on purpose, measured
 * (2026-08-19, gemma2:2b live): asked the three-way question, the small
 * model wrote a `because` that stated the contradiction perfectly and then
 * labeled it "neither" — the reading was right and the CLASSIFICATION was
 * beyond it. So the model is only ever the mouth: it answers "does the
 * passage say this sentence is true?" twice — the claim and its
 * sibling-swap — and the verdict (states / contradicts) is DERIVED
 * mechanically from the pair in foldTestimony, never asked as a label. */
export const WITNESS_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string", enum: ["yes", "no"] },
    because: { type: "string" },
  },
  required: ["answer", "because"],
};

/** Bounded read: the witness never gets a whole page. Sentences that state
 * the claim's own tokens first (snipClaim — the same organ the primary tier
 * snips with), widened to their neighbours so a contradiction living NEXT
 * to the claim's vocabulary is inside the window; when nothing anchors,
 * null — a typed absence the caller reports, never the first N chars of a
 * page pretending to be relevant. */
export const WITNESS_SLICE_MAX = 1600; // chars — a reading, not a document (P9: declared)

export function witnessSlice(target, faceText) {
  const src = String(faceText ?? "");
  if (!src.trim()) return null;
  const sentences = splitSentences(src);
  if (!sentences.length) return null;
  // Anchor sentences: full containment first (snipClaim), else the sentences
  // sharing the most claim tokens — a contradiction rarely restates every
  // token ("the Pirates won it" states no "Yankees").
  const snips = snipClaim(target, src);
  let anchors = snips.map((s) => s.start);
  if (!anchors.length) {
    const tokens = (target?.tokens?.length ? target.tokens : String(target?.text ?? "").split(/\s+/)).filter(Boolean);
    if (!tokens.length) return null;
    const scored = sentences
      .map((s) => ({ s, n: tokens.filter((t) => hasWord(wordSet(s.text), t)).length }))
      .filter((x) => x.n > 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 2);
    anchors = scored.map((x) => x.s.start);
  }
  if (!anchors.length) return null;
  // The window: each anchor sentence with one neighbour either side,
  // deduplicated, in document order, joined — capped at the declared max.
  const picked = new Set();
  for (const at of anchors) {
    const i = sentences.findIndex((s) => s.start === at);
    if (i < 0) continue;
    for (const j of [i - 1, i, i + 1]) if (sentences[j]) picked.add(j);
  }
  const slice = [...picked]
    .sort((a, b) => a - b)
    .map((i) => sentences[i].text)
    .join(" ")
    .slice(0, WITNESS_SLICE_MAX);
  return slice.trim() || null;
}

/** The one question — binary, in prose (prompt format matches output
 * format — no bracket scaffolding), material first so the claim cannot
 * prime the read. */
export function buildWitnessMessages(sentence, slice) {
  return [
    {
      role: "system",
      content:
        'You are checking one sentence against one passage. Answer yes only if the passage itself says the sentence is true; answer no otherwise. In "because", copy the passage\'s own words that decide your answer — exactly as written, not paraphrased.',
    },
    {
      role: "user",
      content: `Passage:\n${slice}\n\nSentence: ${sentence}\n\nDoes the passage say this sentence is true?`,
    },
  ];
}

/** Parse the witness's reply. Constrained decoding makes this trivial; the
 * scan tolerates a prose-mode model wrapping the object. Null on anything
 * that does not carry the closed-enum answer — a typed gap upstream, never
 * a guess. */
export function readTestimony(raw) {
  const s = String(raw ?? "");
  for (let start = s.indexOf("{"); start !== -1; start = s.indexOf("{", start + 1)) {
    let depth = 0;
    let inString = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inString) {
        if (ch === "\\") i++;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) {
        try {
          const parsed = JSON.parse(s.slice(start, i + 1));
          if (parsed && ["yes", "no"].includes(parsed.answer) && typeof parsed.because === "string")
            return { answer: parsed.answer, because: parsed.because.trim() };
        } catch {
          // not the object — keep scanning
        }
        break;
      }
    }
  }
  return null;
}

/** The pointer check: every content word of the witness's decider must be
 * IN the slice it read — hasWord over the same fold snipClaim states claims
 * with. A universal quantifier, not a threshold (the snipClaim discipline):
 * a witness that cannot point at the bytes did not read them. */
export function becauseVerbatim(because, slice) {
  const b = String(because ?? "").trim();
  if (!b) return false;
  const folded = (t) => foldDiacritics(String(t)).toLowerCase().replace(/\s+/g, " ");
  return folded(slice).includes(folded(b));
}

export function becauseContained(because, slice) {
  const b = String(because ?? "").trim();
  if (!b) return false;
  if (becauseVerbatim(b, slice)) return true;
  const words = b.split(/\s+/).filter((w) => /\p{L}|\p{N}/u.test(w));
  if (!words.length) return false;
  const sliceWords = wordSet(String(slice ?? ""));
  return words.every((w) => hasWord(sliceWords, w));
}

/** The word-bearing parts of a name, for containment walls. */
const nameParts = (n) => String(n ?? "").split(/\s+/).filter((w) => /\p{L}|\p{N}/u.test(w));

/** The perturbation: swap a name the claim carries for a name the PAGE
 * carries that the claim does not — the sibling comes from the witness's
 * own universe, and it is chosen as the COMPETING FILLER of the claim's
 * own slot: among the page's candidate names, the one whose sentence
 * shares the most of the claim's non-name vocabulary. (The first cut took
 * the longest page name and drew "National League. The Pittsburgh
 * Pirates" — NAME_RUN_RE legally runs across a sentence boundary — so a
 * candidate carrying a sentence break is excluded, and length is only the
 * tiebreak.) Null when either side has no name to offer; the caller ships
 * testimony unarmed and says so. */
export function siblingSwap(sentence, slice, { hint = "" } = {}) {
  const sent = String(sentence ?? "");
  const claimNames = namesIn(sent);
  if (!claimNames.length) return null;
  const from = [...claimNames].sort((a, b) => b.length - a.length)[0];
  const foldedSent = foldDiacritics(sent).toLowerCase();
  // A "name" spanning a raw newline is table/infobox cells glued together
  // by plain-text extraction ("Other\nUndecided\nMargin", "Vice President
  // John Adams\nPreceded") — never a real name; \s in NAME_RUN_RE matches
  // newlines too, and a period already excludes the sentence-spanning case
  // for the same reason. Measured live, same batch eval as CAPTION_MARKERS.
  const candidates = namesIn(String(slice ?? "")).filter(
    (n) => !/[.!?\n]\s?/.test(n) && !foldedSent.includes(foldDiacritics(n).toLowerCase()),
  );
  if (!candidates.length) return null;
  // The witness's own stated reason, when offered, is tried FIRST — not
  // trusted on its own word (the arm re-checks it exactly as it checks
  // everything else), but a name the witness already noticed is worth
  // trying before a name independently re-derived with no access to what
  // it saw. Measured live 2026-08-19: asked about the 1960 World Series,
  // `real.because` already read "the Pittsburgh Pirates were matched
  // against the New York Yankees... and the Pirates won" — the correct
  // answer, verbatim, sitting unused while the slot-scoring heuristic
  // below picked "Major League Baseball" instead. Still walled: the hinted
  // name must be a real, ALREADY-FILTERED candidate in this slice (never
  // taken from the hint text directly), so a model's own hallucinated
  // reasoning cannot become an ungrounded swap.
  if (hint) {
    const foldedCandidates = new Map(candidates.map((c) => [foldDiacritics(c).toLowerCase(), c]));
    for (const hn of namesIn(String(hint)).sort((a, b) => b.length - a.length)) {
      const key = foldDiacritics(hn).toLowerCase();
      if (!foldedCandidates.has(key)) continue;
      const to = foldedCandidates.get(key);
      const at = sent.indexOf(from);
      if (at < 0) return null;
      return { swapped: sent.slice(0, at) + to + sent.slice(at + from.length), from, to, hinted: true };
    }
  }
  // The claim's slot vocabulary: its words outside the swapped name, minus
  // the closed stopword class (the same CLAIM_STOPWORDS proof.js/cite.js
  // already use) — unfiltered, "the"/"of"/"a" matched almost every
  // candidate's sentence equally, diluting the one signal that should
  // actually separate a real answer from noise.
  const fromParts = new Set(nameParts(from).map((w) => w.toLowerCase()));
  const slotWords = sent
    .split(/\s+/)
    .filter((w) => /\p{L}|\p{N}/u.test(w))
    .map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter((w) => w && !fromParts.has(w.toLowerCase()) && !CLAIM_STOPWORDS.has(w.toLowerCase()));
  const sentences = splitSentences(String(slice ?? "")).filter((s) => !CAPTION_MARKERS.test(s.text));
  const scoreOf = (name) => {
    const parts = nameParts(name);
    let best = 0;
    for (const s of sentences) {
      const ws = wordSet(s.text);
      if (!parts.every((p) => hasWord(ws, p))) continue;
      best = Math.max(best, slotWords.filter((t) => hasWord(ws, t)).length);
    }
    return best;
  };
  const scored = candidates.map((n) => ({ n, score: scoreOf(n) })).sort((a, b) => b.score - a.score || b.n.length - a.n.length);
  // A candidate that scored 0 everywhere is not a competing filler — it is
  // just some other name that happens to be on the page. Ties at 0 used to
  // be broken by raw length, which handed the longest piece of furniture
  // that survived filtering a win by default; zero evidence is zero
  // evidence, not a fallback to guess from.
  if (!scored[0].score) return null;
  const to = scored[0].n;
  const at = sent.indexOf(from);
  if (at < 0) return null;
  return { swapped: sent.slice(0, at) + to + sent.slice(at + from.length), from, to };
}

/** The decider, located in the source's own bytes (quotes.js's posture: a
 * drifted quote is rewritten to the source, never shipped as the model's
 * paraphrase): the slice's first sentence carrying ALL parts of the
 * sentence's most specific name and at least one of its other words — the
 * name alone could sit in an unrelated sentence; one slot word ties it to
 * the slot (a structural minimum, binding.js's own kind of floor). Null
 * when no sentence qualifies. */
export function locateDecider(sentence, slice) {
  const name = namesIn(String(sentence ?? "")).sort((a, b) => b.length - a.length)[0] ?? null;
  if (!name) return null;
  const parts = nameParts(name);
  const partSet = new Set(parts.map((w) => w.toLowerCase()));
  const rest = String(sentence)
    .split(/\s+/)
    .filter((w) => /\p{L}|\p{N}/u.test(w) && !partSet.has(w.toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, "")));
  // The MOST deciding sentence, not the first qualifying one — measured
  // live: document order handed back "the Series was played between X and
  // Y" when "Y defeated X to win it" sat one sentence later; both carry the
  // name, the second carries the slot. Ties keep document order.
  let best = null;
  let bestScore = 0;
  for (const s of splitSentences(String(slice ?? ""))) {
    const ws = wordSet(s.text);
    if (!parts.every((p) => hasWord(ws, p))) continue;
    const score = rest.filter((t) => hasWord(ws, t)).length;
    if (score > bestScore) {
      best = s.text.trim();
      bestScore = score;
    }
  }
  return best;
}

/**
 * Compose the two binary reads into one typed testimony — or a typed
 * refusal. THE VERDICT IS DERIVED, NEVER ASKED: claim-yes with the sibling
 * refused is "states"; claim-no with the sibling AFFIRMED is "contradicts"
 * — the page seats the swapped referent in the claim's own slot, which is
 * the slot-competition reading the hypergraph cannot reach mechanically.
 * Both-yes is a witness agreeing with everything — insensitive, refused.
 * Both-no (or claim-no with nothing to swap) is a page that states neither
 * — the ∅ count already says that; no testimony. Never a bare boolean:
 * what refused, and why, is the record's to keep.
 */
export function foldTestimony({
  real,
  arm = null,
  armed = false,
  host = null,
  url = null,
  slice = "",
  claim = "",
  swapped = "",
}) {
  if (!real) return { refused: "unreadable", host, url };
  // The decider shown to the reader is the SOURCE'S own sentence when one
  // is locatable (quotes.js's posture — measured live: the arm's `because`
  // echoed the swapped sentence's inflection, "won" where the page writes
  // "win", and honest testimony was refused as uncontained). The model's
  // `because` is the fallback, and it must pass the containment wall.
  // Preference order, measured: (1) the witness's own pointer when it is
  // VERBATIM in the bytes — it just passed the strongest wall, and live it
  // picked the decisive sentence where slot-coverage scoring tied on a
  // weaker one; (2) the located source sentence when the pointer drifted;
  // (3) a word-level-contained pointer; else refuse.
  const deciderFor = (sentence, because) =>
    becauseVerbatim(because, slice)
      ? because
      : locateDecider(sentence, slice) ?? (becauseContained(because, slice) ? because : null);
  if (real.answer === "yes") {
    if (armed && arm?.answer === "yes") return { refused: "insensitive", host, url };
    const decider = deciderFor(claim, real.because);
    if (!decider) return { refused: "uncontained", host, url, because: real.because };
    return { verdict: "states", because: decider, host, url, armed: Boolean(armed && arm) };
  }
  // real.answer === "no" — a contradiction is only ever derived from the
  // page AFFIRMING the sibling in the same slot; "no" alone is silence.
  if (armed && arm?.answer === "yes") {
    const decider = deciderFor(swapped, arm.because);
    if (!decider) return { refused: "uncontained", host, url, because: arm.because };
    return { verdict: "contradicts", because: decider, host, url, armed: true };
  }
  return { refused: "no-testimony", host, url };
}

// ── the SELECT protocol: activate, then point — never generate ──────────
//
// The generate protocol (buildWitnessMessages + siblingSwap + foldTestimony
// above) asks the model to WRITE a `because`, and a small model wanders
// there: measured live against the real War and Peace, gemma2:2b echoed the
// CLAIM back as its own because rather than quoting the novel, and the
// containment wall correctly refused the unquoted vote — a true fact lost
// to the task shape, not to the model's judgment (it had answered "yes"
// correctly).
//
// The fix is eoreader's posture everywhere else: the model slot-fills, the
// mechanism constrains. Feed it ACTIVATION — the real sentences where both
// ends already fire, pre-segmented — and have it SELECT one by index. The
// decider is then a real source sentence BY CONSTRUCTION: the echo failure
// mode cannot occur, because the model never writes a because, it points at
// one. User's own steer (2026-09-01): "small model should be fed with
// relevant activation, no?"
//
// Measured live, gemma2:2b, against the real novel, before shipping:
//   positive (real claim, real co-present set) -> selects a real sentence
//   control A (fabricated relation over a real co-present set) -> refuses
//   control B (true-ish claim, all-decoy set)  -> refuses
// Both controls built to fail; both held. This is a SIBLING protocol, not
// a replacement — the generate protocol stays for callers who have a slice
// but no segmenter, and foldTestimony still governs the generate path.

export const SELECT_SCHEMA = Object.freeze({
  type: "object",
  properties: {
    stated: { type: "string", enum: ["yes", "no"] },
    sentence: { type: "integer" }, // 1-based index into the candidate list, or 0 for none
  },
  required: ["stated", "sentence"],
});

/** The one message shape the select protocol uses — candidates numbered from 1. */
export function buildSelectMessages(claim, candidates) {
  const list = (candidates ?? []).map((c, i) => `${i + 1}. ${String(c).replace(/\s+/g, " ").trim()}`).join("\n");
  return [
    {
      role: "system",
      content:
        "You are given a claim and a numbered list of sentences from a source. " +
        "Decide whether ANY sentence states the claim is true. If yes, give the NUMBER " +
        "of the single sentence that most directly states it. If no sentence states it, " +
        "answer stated:no and sentence:0. Do not invent; only choose from the list.",
    },
    { role: "user", content: `Claim: "${String(claim ?? "")}"\n\nSentences:\n${list}` },
  ];
}

/**
 * foldSelect(raw, candidates) — the verdict, DERIVED from the model's index,
 * never trusting the index blind. A pick outside [1, n] or a stated:yes with
 * no valid index is refused; a valid pick returns the candidate VERBATIM as
 * the decider (containment is guaranteed, not checked, because the decider
 * IS a candidate). `candidates` is the exact list buildSelectMessages was
 * given, so index k names candidates[k-1].
 */
export function foldSelect(raw, candidates) {
  const list = Array.isArray(candidates) ? candidates : [];
  let parsed = raw;
  if (typeof raw === "string") { try { parsed = JSON.parse(raw); } catch { return { refused: "unreadable" }; } }
  if (!parsed || typeof parsed !== "object") return { refused: "unreadable" };
  if (parsed.stated !== "yes") return { refused: "no-testimony" };
  const idx = Number(parsed.sentence);
  if (!Number.isInteger(idx) || idx < 1 || idx > list.length) return { refused: "no-valid-pick" };
  const decider = String(list[idx - 1]).replace(/\s+/g, " ").trim();
  return { verdict: "states", because: decider, index: idx };
}
