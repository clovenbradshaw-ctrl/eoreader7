// corroboration.js — the witness tier as the ledger's OFFICIAL second vote.
//
// THE MEASURED CASE FOR THIS EXISTING (reading-recall-finding.md, both
// addenda). Two real Wikipedia pages about one battle share ZERO
// mechanically-matchable restatements — even encyclopedic prose restates a
// proposition in different words, and every mechanical identity tried
// (exact triple, referent-canonical ends, deranged-alias control) measured
// FLAT. The paraphrase wall has one licensed door: the witness protocol
// (testimony.js, P32) — a small model reads one slice and answers yes/no
// twice (the claim, then its sibling-swapped twin), the verdict DERIVED
// from the pair, the decider required verbatim-or-located in source bytes.
// Run live before this module existed: 2 of 12 real notes corroborated
// cross-document against a mechanical baseline of 0, fabricated-note
// control 0/4.
//
// WHAT THIS MODULE ADDS: the wiring, not the judgment. Candidates are
// PROPOSED by shared vocabulary (retrieval proposes, the witness decides —
// the same split the capstone probe used), the witness runs under a
// DECLARED ask budget (P9 — model calls are the scarce resource), and a
// "states" verdict lands on the note through the door's own attest():
// witness string `testimony:<source-ref>`, namespaced so a vote earned by
// a model reading is never confusable with a mechanical re-sighting, and
// the decider sentence carried as a SPAN with a real address in the
// corroborating source's own bytes (P5.2 — the vote is re-openable).
//
// WHAT A VERDICT MAY DO:
//   states      -> attest (the second vote)
//   contradicts -> REPORTED, never landed. The door has no contradiction
//                  field, and inventing one here would be a silent schema
//                  widening; a contradiction is returned typed so the
//                  caller can route it to the machinery that owns
//                  contradiction (the claims tier), and the note is left
//                  exactly as it stood. Disclosed limit, not an oversight.
//   refused     -> nothing. A refusal is the witness's designed
//                  conservatism (P32: low recall, zero wrong corrections),
//                  never evidence against the note.
//
// ── INDEPENDENCE, NOT COUNT (user-supplied synthesis, 2026-09-01, of
// Condorcet 1785 / Ladha 1992 / Shannon-von Neumann / Wald 1945 / Bovens &
// Hartmann 2003 / Lamport BFT / Bikhchandani cascades) ──────────────────
//
// The number of witnesses matters far less than their independence, and
// this module's design follows four of that synthesis's conclusions:
//
// 1. EFFECTIVE SAMPLE SIZE. n correlated witnesses behave like
//    n/(1+(n-1)ρ) independent ones. Every `testimony:` vote shares the
//    witness MODEL as a channel, so k testimony votes are never k
//    independent witnesses — the independence a testimony vote adds is the
//    SOURCE's, not the model's, which is why votes are keyed by source and
//    a source never seconds its own sighting (two chunks of one file are
//    one perspective — corroborateAtoms' rule, now Ladha's). And two
//    Wikipedia pages are partly downstream of shared editing culture:
//    n_eff for "two pages agree" is honestly somewhere below 2. Counting
//    distinct SOURCES (distinctSources below) is the least-wrong cheap
//    measure available.
//
// 2. THE SECOND SOURCE IS THE BIGGEST GAIN; THE THIRD IS QUALITATIVELY
//    DIFFERENT. Lamport: two sources can never EXPOSE a liar — you see
//    the disagreement but not who is wrong. This is exactly why a
//    "contradicts" verdict is REPORTED and never landed: at n=2 a
//    states/contradicts pair is undecidable by construction, and routing
//    it to the claims tier (which can seek a third source) is the honest
//    move, not schema-widening the ledger.
//
// 3. NO CASCADES BY CONSTRUCTION. The witness is never shown the ledger,
//    other witnesses' votes, or the note's current standing —
//    buildWitnessMessages carries the sentence and the slice, nothing
//    else. Later votes cannot rationally defer to earlier ones because
//    they cannot see them.
//
// 4. RELIABILITY IS MEASURED, NOT ASSUMED. Bovens & Hartmann: coherence
//    among low-reliability witnesses is nearly worthless. This witness's
//    reliability parameter is on the record — fabricated-note control 0/4
//    false-states, recall low by design — and any consumer weighing a
//    `testimony:` vote can weigh it against that measured record rather
//    than against hope.
//
// ── CORROBORATION IS SURPRISE, AND THE BUDGET IS A SETTLING RULE ────────
//
// SPRT's accumulated log-likelihood ratio IS accumulated surprise, so the
// stopping question "when do I stop asking" and the surprise question
// "when do arrivals stop moving the ground" are one question — the
// hunt-meter (P72) already answers it for fetching; this module answers it
// for checking (P30's efficiency law: a call spent where nothing can move
// is compute spent reducing zero uncertainty). Which surprise is settled
// upstream: emergence/surprise.js keeps NOVELTY (the answer was rare)
// apart from BAYESIAN surprise (the answer moved a standing), and a vote
// counts here only for what it MOVES — a yes on a settled note moves
// nothing and is therefore worth nothing, however fluent it is.
//
// THE DARK-ROOM HAZARD, closed structurally rather than by comment. The
// first cut of this module ranked candidates by shared vocabulary
// DESCENDING — it spent the scarce model calls on the notes MOST likely to
// be confirmed, maximizing expected agreement and minimizing expected
// information. Friston's dark room, built by accident, noticed only when
// the surprise relationship was asked about out loud. The fix separates
// what that ranking conflated: overlap is FEASIBILITY (no shared features
// means no slice, so the witness cannot answer at all), and standing is
// VALUE (a note at one source has everything to gain; a settled note has
// nothing). Feasibility gates; value ranks; overlap only breaks ties.
// metacognition.js's own guard is the same law one register over —
// `observe` is a no-op on an all-zero delta, so silence cannot move a
// standing there either.
//
// THE WALK, and what is honestly NOT calibrated. Each note runs a
// unit-step walk: net = (distinct sources stating) − (distinct sources
// contradicting, this run). Settled-corroborated at net >= settleFloor
// with no live contradiction; disconfirmed at net <= −settleFloor
// (reported, never landed — the same rule as `contradicts` itself). The
// floor's giver is the ledger's own ≥2-witness mouth (the quantity being
// fed), not a tuned number. This is SPRT's SHAPE — two boundaries, walk
// until crossed — without SPRT's calibrated likelihood ratios, because the
// witness's true p(yes|true)/p(yes|false) have not been measured and
// inventing them would be worse than unit steps (II.10: an uncalibrated
// ratio is a change of units that fails invisibly). Lamport falls out
// instead of being bolted on: a contradiction drops net by one, so a
// contested note NEEDS a third source to settle, automatically.
//
// PURE. The model call (`ask`) and the testimony organs arrive as
// arguments — this module fetches nothing and can be tested offline with a
// scripted witness (the cast.js pattern, applied to a model).

// ── MEDIUM-BLINDNESS (II.11: earned by a test, never declared) ──────────
//
// The PROTOCOL here — propose by overlap, ask, swap a rival into the slot,
// ask again, derive the verdict from the pair, land it as a named witness
// with an address — carries no fact about language. A shot corroborating an
// event, a bar corroborating a motif, and a page corroborating a
// proposition are the same act. What IS text-specific is the ADAPTER: how
// you featurize a source, and how you build a rival. Both are injected.
//
// The default featurizer below is a TEXT adapter and says so: `\p{L}{4,}`
// is Latin-script biased (a CJK word is one or two characters and would be
// dropped entirely), and whitespace tokenization assumes a script that
// separates words. A caller reading another medium — or another script —
// supplies its own `featuresOf`; corroboration.test.mjs runs the whole
// protocol over a synthetic non-text medium to prove the protocol carries
// rather than asserting that it does.
const TEXT_CONTENT_WORD = /\p{L}{4,}/gu;
// FOLDED, because every organ that compares text to text must share
// retrieval's fold (CLAUDE.md's oldest cross-organ lesson — Bezúkhov/
// Bezukhov). Found live building the third-source seeker: the Maude
// translation writes Kutúzov 524 times, and an unfolded feature set makes
// the novel invisible to a claim about Kutuzov. NFD strip of combining
// marks — the same fold class source.js's foldDiacritics implements;
// restated minimally here to keep this module zero-import (its stated
// contract), with the drift risk carried by the test that pins the
// Kutúzov case against the REAL novel bytes.
const foldMarks = (t) => String(t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const textFeatures = (t) => new Set(foldMarks(String(t ?? "").toLowerCase()).match(TEXT_CONTENT_WORD) ?? []);

/**
 * The activated candidate set for the SELECT protocol: real sentences from
 * ANYWHERE in the source where BOTH ends fire, ranked by joint feature
 * density, capped. This is the correction the first live select run
 * exposed — the earlier code gathered from one co-presence WINDOW (a
 * single keyword's neighbourhood, which centres on a lone end), while the
 * select protocol wants the SET of stating places across the whole source.
 * The window stays the generate path's slice (one place to read); the set
 * is the select path's candidates (every place that could state it).
 */
export function statingCandidates(sourceText, ends, { featuresOf = textFeatures, splitSentences, limit, minLen = 12, maxLen = 400, isGeneric: isGenericInjected = null } = {}) {
  if (typeof splitSentences !== "function") throw new TypeError("statingCandidates: splitSentences is injected (the engine's own segmenter) — required");
  if (!Number.isFinite(limit)) throw new TypeError("statingCandidates: limit is declared by the caller (P9)");
  const src = String(sourceText ?? "");
  const f1all = [...featuresOf(ends?.end1)], f2all = [...featuresOf(ends?.end2)];
  if (!f1all.length || !f2all.length) return [];
  // PROPER ACTIVATION (user, 2026-09-01: "never trust the model on content,
  // but it's pretty good with meaning if you give it proper activation
  // context"). The generic word is the trap: "General" is a feature of end2's
  // own surface ("General Mikhail Kutuzov"), and it fired 6 of 8 candidates
  // on sentences about OTHER generals — the model then judged garbage.
  //
  // STRATUM: S1-script, BECOMING heard-clean (LEVELS.md; the todo test in
  // corroboration.test.mjs is the referent). This gate decides on
  // capitalization — a reader's signal a listener does not have — and so
  // sits below the heard rule's bar ("the system must be able to work
  // equally well if it only heard the novel and didn't read it"). Shipped
  // anyway, declared rather than silent: the S2 form is determiner
  // precedence ("the general" is said; "the Kutuzov" is not), a received
  // closed class, unbuilt.
  //
  // HOW A BABY LEARNS THIS (user, same session), and no hand-list: a title
  // is a word you ALSO hear as a common noun — "the general said" — while a
  // name never lives lowercase. Measured in this novel: general 424
  // lowercase / prince 349 / count 439, but kutuzov 0, napoleon 0,
  // bagration 0, pierre 0. Rarity cannot separate them (kutuzov 529 vs
  // general 657 — a protagonist is not rare); the lowercase life can. A
  // feature is generic when it recurs lowercase in the source past a
  // declared ratio of its capitalized uses — the same signal title-fold.js
  // already uses, measured here against the source rather than received as
  // a list. An end whose only features are generic keeps them (a disclosed
  // floor); its name's distinctive tokens carry the activation.
  // Both counts run on the ORIGINAL-CASE source (diacritics folded only),
  // so "lowercase" means genuinely lowercase — the first cut counted on an
  // already-lowercased copy and every Name read as 508 "lowercase" uses, a
  // measurement bug that emptied the set. Word-bounded, capped.
  // The predicate is INJECTABLE (the cast.js pattern): a caller with a
  // discovered company-kind organ (kind-standing.js::discoverCompanyKinds +
  // frameWords — S2-heard, taught nothing, II.23-controlled) passes
  // `isGeneric: (w) => frames.has(w)` and this gate becomes heard-clean —
  // the BECOMING below is inhabited by exactly that injection. The default
  // stays the S1 rule so no existing caller moves.
  const rawSrc = foldMarks(src);
  const countBounded = (w) => { let n = 0; const re = new RegExp(`(?<![\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "gu"); while (re.exec(rawSrc)) { n++; if (n > 99999) break; } return n; };
  const isGeneric = isGenericInjected ?? ((w) => {
    const lc = countBounded(w.toLowerCase());                 // genuinely lowercase life
    const cap = countBounded(w[0].toUpperCase() + w.slice(1)); // Name life
    return lc >= Math.max(2, cap); // lives lowercase as often as (or more than) as a Name
  });
  const distinctive = (feats) => {
    const kept = feats.filter((w) => !isGeneric(w));
    return kept.length ? kept : feats;
  };
  const f1 = distinctive(f1all), f2 = distinctive(f2all);
  let sents = [];
  try { sents = splitSentences(src); } catch { return []; }
  // COORDINATE SPACES, NEVER MIXED SILENTLY (the b0/c0 law, met live): the
  // engine's splitter collapses \r\n to \n BEFORE computing offsets, so on
  // a CRLF source (Gutenberg's 66k of them in War and Peace) its offsets
  // name the normalized text, not the file. Each \r\n before a normalized
  // position costs exactly one raw char, so the map back is a count of
  // preceding CRLFs. P5.2 makes the verification mandatory either way: a
  // span ships only when the mapped slice re-normalizes to the sentence
  // the splitter cut; otherwise the address is null, never guessed.
  const crlf = [];
  for (let i = src.indexOf("\r\n"); i >= 0; i = src.indexOf("\r\n", i + 2)) crlf.push(i);
  const toRaw = (n) => {
    // count CRLFs whose normalized position (rawIdx - rank) is < n
    let lo = 0, hi = crlf.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (crlf[mid] - mid < n) lo = mid + 1; else hi = mid; }
    return n + lo;
  };
  const normEq = (a, b) => a.replace(/\r\n/g, "\n") === b;
  const scored = [];
  for (const sent of sents) {
    // CARRY THE ADDRESS FORWARD FROM THE CUT (P5.2), never search for it
    // later: the segmenter already gives each sentence its own byte offset,
    // so a candidate knows exactly where in the source it came from. `shown`
    // is the whitespace-normalized form the model reads; `raw`/`start`/`end`
    // are the sentence's own bytes and span, so the model's pick resolves to
    // a real address with no regex and no wrong-occurrence risk.
    const raw = typeof sent === "string" ? sent : sent?.text ?? "";
    const offset = typeof sent === "object" && Number.isFinite(sent?.offset) ? sent.offset : null;
    const shown = raw.replace(/\s+/g, " ").trim();
    if (shown.length < minLen || shown.length > maxLen) continue;
    const g = foldMarks(shown.toLowerCase());
    const h1 = f1.filter((w) => g.includes(w)).length;
    const h2 = f2.filter((w) => g.includes(w)).length;
    if (h1 > 0 && h2 > 0) {
      let start = null, end = null, rawBytes = raw;
      if (offset != null) {
        const a = toRaw(offset), b = toRaw(offset + raw.length);
        const slice = src.slice(a, b);
        if (normEq(slice, raw)) { start = a; end = b; rawBytes = slice; } // verified: the file's own bytes
        else if (src.slice(offset, offset + raw.length) === raw) { start = offset; end = offset + raw.length; } // splitter did not normalize
        // else: unverifiable — span stays null, never guessed (P5.2)
      }
      scored.push({ shown, raw: rawBytes, start, end, density: h1 + h2 });
    }
  }
  return scored.sort((a, b) => b.density - a.density).slice(0, limit);
}

/**
 * REC·Figure at the fifth turn — ACT on a contradiction (or a thin
 * standing) by finding WHERE a further independent vote could come from.
 * Lamport made mechanical: at n=2 a disagreement is visible but not
 * adjudicable, so a contested note's next move is always a THIRD source;
 * a thin note's is a second. This is the DISCOVERY half only — pure
 * ranking of not-yet-witnessing sources by the same per-end feasibility
 * the walk already spends by (endsCopresentWindow); the re-ask half IS
 * the walk, whose contested-first ranking already prioritizes what this
 * function feeds it.
 *
 * Returns ranked `{source, window}` — never a verdict, never a vote.
 */
export function thirdSourceCandidates(note, sources, { featuresOf = textFeatures, limit } = {}) {
  if (!Number.isFinite(limit)) throw new TypeError("thirdSourceCandidates: limit is declared by the caller (P9)");
  const already = distinctSources(note.witnesses ?? []);
  const out = [];
  for (const source of sources ?? []) {
    if (already.has(source.ref)) continue;
    const w = endsCopresentWindow(source.text, { end1: note.end1 ?? note.subject, end2: note.end2 ?? note.object }, { featuresOf });
    if (w) out.push({ source, window: w });
  }
  return out.sort((a, b) => b.window.score ?? 0 - (a.window.score ?? 0)).slice(0, limit);
}

/**
 * DEF·Pattern at the fifth turn — the witness's MEASURED operating point,
 * landed as a declaration with its method and date, so every consumer of
 * a testimony vote can weigh it against numbers rather than hope
 * (Bovens & Hartmann's reliability parameter, measured not assumed).
 * Method: stated-by-construction trues (a page's own extracted claims
 * asked against that page) vs end-swapped fakes, armed protocol,
 * temperature 0, per model — plus every live fabricated batch pooled for
 * the false-state bound (rule of three at zero observed).
 *
 * The walk deliberately KEEPS unit steps: with LR(states) >= ~4, two
 * independent-source votes carry LR >= ~16, which is what settleFloor=2
 * already demands — the calibration VALIDATES the shipped design rather
 * than replacing it, and that outcome is recorded here instead of being
 * dressed up as a new mechanism.
 */
export const WITNESS_OPERATING_POINT = Object.freeze({
  measured: "2026-09-01",
  method: "stated-by-construction trues vs end-swapped fakes, armed protocol, temp 0; false bound pooled over all live fabricated batches (rule of three at 0/36)",
  models: Object.freeze({
    "gemma2:2b": Object.freeze({ pStatesGivenStated: 6 / 18, pStatesGivenFabricatedUpperBound: 3 / 36, armedFabricatedAsks: 36, falseStates: 0 }),
    "qwen2.5:14b-instruct-q4_K_M": Object.freeze({ pStatesGivenStated: 5 / 18, pStatesGivenFabricatedUpperBound: 3 / 12, armedFabricatedAsks: 12, falseStates: 0, note: "no better than gemma2:2b and ~3x slower — measured, not assumed" }),
  }),
});

/**
 * The independence-aware count: DISTINCT SOURCES across both witness kinds.
 * A mechanical sighting on page A plus a testimony vote from page A is ONE
 * source; `witnesses.length >= 2` would read it as two. Consumers gating
 * on corroboration should gate on THIS.
 */
export function distinctSources(witnesses) {
  const out = new Set();
  for (const w of witnesses ?? []) {
    const s = String(w);
    out.add(s.startsWith("testimony:") ? s.slice("testimony:".length) : s);
  }
  return out;
}

/** Shared-vocabulary ranking: which notes have a real chance in this source. */
export function proposeCandidates(notes, source, {
  limit,
  // TWO featurizers, not one — a first draft used a single `featuresOf` for
  // both and the non-text test caught it immediately: featurizing a SOURCE
  // and featurizing an ARRANGEMENT are different questions in any medium
  // (a bar of music is a set of motif onsets; an arrangement between two
  // motifs is its two ends). They coincide only in text, where both happen
  // to be "the words in this string", which is exactly the kind of
  // coincidence that reads as universal until another medium arrives.
  featuresOfSource = textFeatures,
  featuresOfNote = (n) => textFeatures(`${n.end1 ?? n.subject} ${n.label ?? n.verb} ${n.end2 ?? n.object}`),
  render = null,
} = {}) {
  if (!Number.isFinite(limit)) throw new TypeError("proposeCandidates: limit is declared by the caller (P9)");
  // How a note is rendered FOR THE WITNESS is the adapter's business too —
  // text joins its three cells with spaces; another medium renders an
  // arrangement however its own witness reads.
  const say = render ?? ((n) => `${n.end1 ?? n.subject} ${n.label ?? n.verb} ${n.end2 ?? n.object}`.replace(/\s+/g, " ").trim());
  const sourceFeatures = featuresOfSource(source);
  const scored = [];
  for (const n of notes) {
    const feats = [...featuresOfNote(n)];
    // A note with no features to share cannot be proposed by overlap —
    // typed as a skip, never scored as disagreement.
    if (!feats.length) continue;
    const shared = feats.filter((f) => sourceFeatures.has(f)).length / feats.length;
    if (shared > 0) scored.push({ note: n, sentence: say(n), shared });
  }
  return scored.sort((a, b) => b.shared - a.shared).slice(0, limit);
}

/**
 * The VALUE of asking about this note — expected movement of its standing,
 * not its likelihood of being confirmed. 0 means an ask is a wasted call:
 * settled (nothing left to move) or disconfirmed (moved as far down as the
 * walk reads). A contested note outranks a merely thin one — its next vote
 * decides a live disagreement, the highest-information ask available.
 */
export function askValue(note, { contradictSources, settleFloor } = {}) {
  if (!Number.isFinite(settleFloor)) throw new TypeError("askValue: settleFloor is declared by the caller");
  const stating = distinctSources(note.witnesses).size;
  const contras = contradictSources?.get(note.id)?.size ?? 0;
  const net = stating - contras;
  if (net <= -settleFloor) return { value: 0, reason: "disconfirmed", net };
  if (contras > 0) return { value: 2, reason: "contested", net };
  if (net >= settleFloor) return { value: 0, reason: "settled", net };
  return { value: 1, reason: "thin", net };
}

/**
 * The best window of `sourceText` where features of BOTH ends co-occur —
 * or null when no such window exists anywhere. Two jobs, one geometry
 * (the same per-end covering condition as the decider wall, applied
 * BEFORE the ask instead of after):
 *
 *  - PREFILTER: a candidate with no co-presence window is structurally
 *    hopeless — the decider wall could never pass — and asking a model
 *    about it is a wasted call. Measured on the live Borodino run before
 *    this existed: 14 of the top 40 candidates (35% of the whole budget)
 *    were hopeless by this test.
 *  - SLICE CENTERING: for a plausible candidate, the co-presence window
 *    is where a stating sentence would have to live, so the witness
 *    should read THERE — not wherever generic anchor scoring wanders
 *    (P32's own named gap: no prose-vs-table signal).
 *
 * Medium-blind like the rest of this module: `featuresOf` is injected,
 * the default is the text adapter and says so.
 */
export function endsCopresentWindow(sourceText, ends, { featuresOf = textFeatures, window = 400 } = {}) {
  const text = String(sourceText ?? "");
  const lower = foldMarks(text.toLowerCase());
  const f1 = [...featuresOf(ends?.end1)];
  const f2 = [...featuresOf(ends?.end2)];
  if (!f1.length || !f2.length) return null;
  let best = null;
  for (const w1 of f1) {
    let i = -1;
    while ((i = lower.indexOf(w1, i + 1)) >= 0) {
      const lo = Math.max(0, i - window);
      const hi = Math.min(text.length, i + window);
      const win = lower.slice(lo, hi);
      const hits2 = f2.filter((w2) => win.includes(w2)).length;
      if (hits2 > 0) {
        const score = hits2 + f1.filter((w) => win.includes(w)).length;
        if (!best || score > best.score) best = { start: lo, end: hi, score };
      }
    }
  }
  return best ? { start: best.start, end: best.end, text: text.slice(best.start, best.end) } : null;
}

/**
 * One note, one source, the full protocol: slice -> ask -> sibling-swap ->
 * ask -> foldTestimony. Returns the derived verdict with the decider's own
 * address in the source, or the typed refusal — never a bare boolean.
 */
export async function witnessNote(sentence, source, { ask, selectAsk = null, testimony, ends = null, slice: sliceOverride = null, splitSentences = null } = {}) {
  const { witnessSlice, siblingSwap, foldTestimony, buildSelectMessages, foldSelect } = testimony ?? {};
  if (typeof ask !== "function" || !witnessSlice || !siblingSwap || !foldTestimony)
    throw new TypeError("witnessNote: ask and the testimony organs are injected — required, never defaulted");
  const target = { kind: "name", text: sentence, sentence };
  const slice = sliceOverride ?? witnessSlice(target, source.text);
  if (!slice) return { refused: "no-slice" };

  // SELECT PATH (preferred when a segmenter is injected): activate the
  // slice into its own sentences, keep only those where BOTH ends fire,
  // and have the model POINT at one. The decider is verbatim by
  // construction, so the decider-company wall below is satisfied
  // structurally and the echo failure mode cannot occur. Falls through to
  // the generate path when there is no segmenter, no select organ, or no
  // co-present candidate to offer.
  if (splitSentences && selectAsk && buildSelectMessages && foldSelect && ends) {
    // Candidates across the WHOLE source, not the centred window — the
    // select set wants every place that could state the claim (see
    // statingCandidates' own header for why the window was the wrong
    // grain here). Feature fold is the module's own textFeatures, so
    // Kutúzov reaches a Kutuzov claim.
    const cands = statingCandidates(source.text, ends, { splitSentences, limit: 8 });
    if (cands.length) {
      const shownList = cands.map((c) => c.shown);
      const picked = foldSelect(await selectAsk(buildSelectMessages(sentence, shownList)), cands.map((c) => c.shown));
      if (picked.verdict === "states") {
        // THE ARM, grafted from the generate protocol (P32): a pointer that
        // says yes is not yet a vote. Calibrated live before this existed:
        // unarmed select read p(states|fabricated) = 1/8 — "Napoleon
        // surrendered to Kutuzov at Moscow" drew a pick whose decider
        // states no surrender, because pointing at a topically-adjacent
        // sentence costs nothing. The same candidate list is asked about
        // the sibling-swapped claim (a competing filler from the
        // candidates' own names — the existing siblingSwap organ, the
        // candidates themselves as its slice since they are real source
        // sentences); a picker that also finds the swap "stated" is
        // indiscriminate on this set, and its yes decides nothing. No
        // available swap = unarmed, and an unarmed yes is refused, not
        // trusted (the unarmed-yes rule, unchanged from generate).
        // the swap's sibling pool is the SOURCE's own names (the generate
        // posture), not the candidate list — the candidates are by
        // construction the sentences matching the claim, so a competing
        // filler is usually outside them (measured: an arm harvested from
        // candidates alone found no sibling and refused everything unarmed)
        const swap = siblingSwap(sentence, String(source.text ?? ""));
        if (!swap?.swapped) return { refused: "unarmed-select", via: "select" };
        const armPick = foldSelect(await selectAsk(buildSelectMessages(swap.swapped, shownList)), shownList);
        if (armPick.verdict === "states") return { refused: "indiscriminate", via: "select", arm: swap.swapped };
        // The pick's address is the one CARRIED FORWARD from its cut — no
        // search. The decider shown is the source's own bytes (`raw`, line
        // breaks and all); the span is the sentence's own offset. When the
        // segmenter gave no offset, the address is honestly null rather
        // than guessed.
        const chosen = cands[picked.index - 1];
        return {
          verdict: "states",
          because: chosen.raw,
          via: "select",
          span: chosen.start == null ? null : { ref: source.ref, at: `${source.ref}#${chosen.start}-${chosen.end}`, text: chosen.raw },
        };
      }
      // a select refusal is a real "no from the activated set" — return it,
      // don't silently retry the wanderable generate path on the same slice
      return { refused: picked.refused ?? "no-testimony", via: "select" };
    }
  }
  const real = await ask(sentence, slice);
  const swapped = real ? siblingSwap(sentence, slice, { hint: real.because ?? "" }) : null;
  const arm = swapped ? await ask(swapped, slice) : null;
  const t = foldTestimony({ real, arm, armed: Boolean(swapped), slice, claim: sentence, swapped: swapped ?? "" });
  if (!t.verdict) return { refused: t.refused ?? "no-testimony" };
  // THE DECIDER MUST KEEP THE CLAIM'S COMPANY (P31's company law, aimed at
  // the decider instead of the number). foldTestimony's containment wall
  // checks BYTES — a decider verbatim in the slice passes even when it does
  // not state the claim, and the first note ever through the ledger's
  // ≥2-source mouth rode exactly that gap: claim "The Grande Armée fought
  // against the Imperial Russian Army", decider "Tolstoy used a great deal
  // of his own experience in the Crimean War..." — verbatim in the slice,
  // silent on the claim. Byte containment is not entailment; company is
  // the cheap mechanical proxy this repo already licenses: the decider
  // must share at least two of the claim's own content features, or the
  // vote does not land. Refused typed, never a conviction — the same
  // withhold-vs-convict rule as every refusal above.
  if (t.verdict === "states") {
    const cf = testimony.featuresOfClaim ?? ((x) => new Set(String(x ?? "").toLowerCase().match(/\p{L}{4,}/gu) ?? []));
    const deciderFeats = cf(t.because);
    if (ends) {
      // PER-END COMPANY — derived from the relation's own structure, never
      // tuned to a specimen (P71): an assertion relates two ends, so a
      // decider silent on either end cannot be stating the relation. The
      // live specimen that forced this: the whole-claim floor passed a
      // decider containing "the Imperial Russian Army" VERBATIM (end2,
      // three shared features) while never mentioning the Grande Armée
      // (end1) or any fight — topic adjacency defeats any whole-claim
      // count, the same failure class that killed company-based act
      // identity. Per-end asks the structural question instead.
      const e1 = [...cf(ends.end1)].some((w) => deciderFeats.has(w));
      const e2 = [...cf(ends.end2)].some((w) => deciderFeats.has(w));
      if (!e1 || !e2) return { refused: "decider_unrelated", because: t.because, missingEnd: !e1 ? "end1" : "end2" };
    } else {
      // no ends supplied (a direct caller with only a sentence): the weaker
      // whole-claim floor, kept for what it can honestly do
      const claimFeats = cf(sentence);
      const shared = [...deciderFeats].filter((w) => claimFeats.has(w));
      if (new Set(shared).size < 2) return { refused: "decider_unrelated", because: t.because };
    }
  }
  // AN UNCHALLENGED YES IS NOT A SECOND WITNESS. foldTestimony ships a
  // `states` verdict even when no sibling could be built — correct for its
  // own caller (an unarmed reading is still a reading, and the app marks it
  // so), and NOT sufficient to vote here. Caught by this module's own
  // control: a witness that affirms everything walked straight through on a
  // note whose only name was its subject, because cite.js's namesIn vetoes
  // sentence-initial capitals (L2) and siblingSwap therefore had nothing to
  // swap. Bovens & Hartmann in one line — coherence among unchallenged
  // low-reliability reports is nearly worthless; the arm IS the challenge.
  if (t.verdict === "states" && !t.armed) return { refused: "unarmed" };
  // The decider's address in the SOURCE's own bytes — the vote is
  // re-openable or it is not landed (P5.2).
  const at = t.because ? String(source.text).indexOf(t.because) : -1;
  return {
    verdict: t.verdict,
    because: t.because,
    span: at >= 0 ? { ref: source.ref, at: `${source.ref}#${at}-${at + t.because.length}`, text: t.because } : null,
  };
}

/**
 * The wiring: walk proposed candidates under a declared ask budget, land
 * every "states" through the door's attest, report everything typed.
 * `door` is the makeHyperlexicon bundle; `log` is threaded, never mutated.
 */
export async function corroborateLedger(log, door, sources, {
  ask, selectAsk = null, testimony, maxAsks, limitPerSource, featuresOfSource, featuresOfNote, render, splitSentences = null,
  // The walk's boundary. Giver: the ledger's own >=2-witness mouth — the
  // quantity this module exists to feed — never a tuned number.
  settleFloor = 2,
} = {}) {
  if (!Number.isFinite(maxAsks)) throw new TypeError("corroborateLedger: maxAsks is declared by the caller (P9)");
  let next = log;
  let asks = 0;
  const attested = [];
  const contradicted = [];
  const refusals = { "no-slice": 0, "no-testimony": 0, insensitive: 0, uncontained: 0, unreadable: 0, unarmed: 0, decider_unrelated: 0, other: 0 };
  // Structurally hopeless candidates, skipped WITHOUT an ask — a
  // proposal-time refusal, tallied apart from the witness's own refusals
  // because no model call was spent and no testimony was heard.
  let skippedNoCopresence = 0;
  const copresence = new Map(); // `${noteId}\u0000${ref}` -> window|null, computed once
  const contradictSources = new Map(); // note id -> Set of source refs, THIS RUN (contradicts is reported, never landed)
  const askedPairs = new Set();        // `${noteId}\u0000${sourceRef}` — a spent call is spent, refusal included

  // Feasibility is precomputed per source (overlap cannot change mid-run);
  // VALUE is recomputed after every ask, because every ask can move it.
  const feasible = new Map(); // source.ref -> Map(note id -> {sentence, shared})
  for (const source of sources) {
    const notes = door.foldHyperlexicon(next);
    const proposed = proposeCandidates(notes, source.text, { limit: limitPerSource ?? notes.length, ...(featuresOfSource ? { featuresOfSource } : {}), ...(featuresOfNote ? { featuresOfNote } : {}), ...(render ? { render } : {}) });
    feasible.set(source.ref, new Map(proposed.map((c) => [c.note.id, c])));
  }
  const sourceByRef = new Map(sources.map((s) => [s.ref, s]));

  while (asks < maxAsks) {
    const notes = door.foldHyperlexicon(next);
    const byId = new Map(notes.map((n) => [n.id, n]));
    // Every feasible, unspent, still-movable (note, source) pair, ranked by
    // value first and overlap only as the tiebreak — the dark-room guard is
    // this sort order plus the value-0 exclusion, not a comment.
    let best = null;
    for (const [ref, cands] of feasible) {
      for (const [noteId, c] of cands) {
        const note = byId.get(noteId);
        if (!note) continue;
        if (askedPairs.has(`${noteId}\u0000${ref}`)) continue;
        // a source never seconds its own sighting (Ladha: one perspective)
        if ((note.witnesses ?? []).some((w) => w === ref || w === `testimony:${ref}`)) continue;
        const v = askValue(note, { contradictSources, settleFloor });
        if (v.value === 0) continue;
        // PREFILTER (the same per-end geometry as the decider wall, applied
        // before spending): no co-presence window means the wall could
        // never pass — skip without an ask, once per pair.
        const pairKey = `${noteId}\u0000${ref}`;
        if (!copresence.has(pairKey)) {
          const w = endsCopresentWindow(sourceByRef.get(ref).text, { end1: note.end1 ?? note.subject, end2: note.end2 ?? note.object });
          copresence.set(pairKey, w);
          if (!w) { skippedNoCopresence += 1; askedPairs.add(pairKey); }
        }
        if (!copresence.get(pairKey)) continue;
        if (!best || v.value > best.v.value || (v.value === best.v.value && c.shared > best.c.shared)) {
          best = { note, c, v, ref };
        }
      }
    }
    if (!best) break; // everything reachable is settled, disconfirmed, or spent — the walk's own stop, not the budget's
    asks += 1;
    askedPairs.add(`${best.note.id}\u0000${best.ref}`);
    const win = copresence.get(`${best.note.id}\u0000${best.ref}`);
    const w = await witnessNote(best.c.sentence, sourceByRef.get(best.ref), {
      ask, testimony,
      ends: { end1: best.note.end1 ?? best.note.subject, end2: best.note.end2 ?? best.note.object },
      // SLICE CENTERING: read where a stating sentence would have to live.
      slice: win?.text ?? null,
      // ACTIVATION: when a segmenter AND a selectAsk are present,
      // witnessNote prefers the select protocol over the centered slice —
      // point, never generate.
      selectAsk, splitSentences,
    });
    if (w.refused) { refusals[w.refused in refusals ? w.refused : "other"] += 1; continue; }
    if (w.verdict === "contradicts") {
      if (!contradictSources.has(best.note.id)) contradictSources.set(best.note.id, new Set());
      contradictSources.get(best.note.id).add(best.ref);
      contradicted.push({ note: best.note, source: best.ref, because: w.because });
      continue;
    }
    const r = door.attest(next, best.note.id, { witness: `testimony:${best.ref}`, span: w.span, because: w.because });
    if (!r.refused) { next = r.log; attested.push({ note: best.note, source: best.ref, because: w.because }); }
  }

  // The standings the walk ended on — reported typed, so a caller can route
  // `disconfirmed` to the claims tier (which owns contradiction) and can
  // see `contested` as "ran out before the third source", never as silence.
  const standings = { settled: [], contested: [], disconfirmed: [], thin: [] };
  // CON·Pattern at the fifth turn: the CONTEST STRUCTURE among notes —
  // who states, who contradicts, per note — as data a caller (the claims
  // tier, the third-source seeker) can act on, never a flat list of ids.
  const contests = [];
  for (const n of door.foldHyperlexicon(next)) {
    const v = askValue(n, { contradictSources, settleFloor });
    standings[v.reason === "settled" ? "settled" : v.reason === "disconfirmed" ? "disconfirmed" : v.reason === "contested" ? "contested" : "thin"].push(n.id);
    const contra = contradictSources.get(n.id);
    if (contra?.size) contests.push({ noteId: n.id, stating: [...distinctSources(n.witnesses)], contradicting: [...contra] });
  }
  return { log: next, attested, contradicted, refusals, asks, skippedNoCopresence, standings, contests, calibration: WITNESS_OPERATING_POINT, settleFloor };
}
