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
//    than against hope. Wald's sequential stopping (ask until the
//    likelihood ratio settles, rather than a fixed budget) is the named
//    better version of `maxAsks`, unbuilt — the hunt-meter (P72) already
//    stops on measured settling elsewhere and is the natural donor.
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
 * One note, one source, the full protocol: slice -> ask -> sibling-swap ->
 * ask -> foldTestimony. Returns the derived verdict with the decider's own
 * address in the source, or the typed refusal — never a bare boolean.
 */
export async function witnessNote(sentence, source, { ask, testimony } = {}) {
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
export async function corroborateLedger(log, door, sources, { ask, testimony, maxAsks, limitPerSource, featuresOfSource, featuresOfNote, render } = {}) {
  if (!Number.isFinite(maxAsks)) throw new TypeError("corroborateLedger: maxAsks is declared by the caller (P9)");
  let next = log;
  let asks = 0;
  const attested = [];
  const contradicted = [];
  const refusals = { "no-slice": 0, "no-testimony": 0, insensitive: 0, uncontained: 0, unreadable: 0, unarmed: 0, other: 0 };
  for (const source of sources) {
    const notes = door.foldHyperlexicon(next)
      // only notes this source has NOT already witnessed — a source never
      // seconds its own sighting (corroborateAtoms' own rule: two chunks of
      // one file are one perspective)
      .filter((n) => !(n.witnesses ?? []).some((w) => w === source.ref || w === `testimony:${source.ref}`));
    const candidates = proposeCandidates(notes, source.text, { limit: limitPerSource ?? notes.length, ...(featuresOfSource ? { featuresOfSource } : {}), ...(featuresOfNote ? { featuresOfNote } : {}), ...(render ? { render } : {}) });
    for (const c of candidates) {
      if (asks >= maxAsks) break;
      asks += 1;
      const w = await witnessNote(c.sentence, source, { ask, testimony });
      if (w.refused) { refusals[w.refused in refusals ? w.refused : "other"] += 1; continue; }
      if (w.verdict === "contradicts") { contradicted.push({ note: c.note, source: source.ref, because: w.because }); continue; }
      const r = door.attest(next, c.note.id, { witness: `testimony:${source.ref}`, span: w.span, because: w.because });
      if (!r.refused) { next = r.log; attested.push({ note: c.note, source: source.ref, because: w.because }); }
    }
  }
  return { log: next, attested, contradicted, refusals, asks };
}
