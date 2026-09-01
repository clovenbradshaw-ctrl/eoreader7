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
const textFeatures = (t) => new Set(String(t ?? "").toLowerCase().match(TEXT_CONTENT_WORD) ?? []);

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
 * One note, one source, the full protocol: slice -> ask -> sibling-swap ->
 * ask -> foldTestimony. Returns the derived verdict with the decider's own
 * address in the source, or the typed refusal — never a bare boolean.
 */
export async function witnessNote(sentence, source, { ask, testimony, ends = null } = {}) {
  const { witnessSlice, siblingSwap, foldTestimony } = testimony ?? {};
  if (typeof ask !== "function" || !witnessSlice || !siblingSwap || !foldTestimony)
    throw new TypeError("witnessNote: ask and the testimony organs are injected — required, never defaulted");
  const target = { kind: "name", text: sentence, sentence };
  const slice = witnessSlice(target, source.text);
  if (!slice) return { refused: "no-slice" };
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
  ask, testimony, maxAsks, limitPerSource, featuresOfSource, featuresOfNote, render,
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
        if (!best || v.value > best.v.value || (v.value === best.v.value && c.shared > best.c.shared)) {
          best = { note, c, v, ref };
        }
      }
    }
    if (!best) break; // everything reachable is settled, disconfirmed, or spent — the walk's own stop, not the budget's
    asks += 1;
    askedPairs.add(`${best.note.id}\u0000${best.ref}`);
    const w = await witnessNote(best.c.sentence, sourceByRef.get(best.ref), {
      ask, testimony,
      ends: { end1: best.note.end1 ?? best.note.subject, end2: best.note.end2 ?? best.note.object },
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
  for (const n of door.foldHyperlexicon(next)) {
    const v = askValue(n, { contradictSources, settleFloor });
    standings[v.reason === "settled" ? "settled" : v.reason === "disconfirmed" ? "disconfirmed" : v.reason === "contested" ? "contested" : "thin"].push(n.id);
  }
  return { log: next, attested, contradicted, refusals, asks, standings, settleFloor };
}
