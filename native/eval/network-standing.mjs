// native/eval/network-standing.mjs — the Network terrain earns standing:
// P6's "substantive product" (the binding layer), run over the native
// reading's own arrivals for the first time. constitutional-read has
// listed this stage under stagesNotRun since S1 was written; this driver
// is the stage, wired through the kernel's standing organ.
//
// ASSEMBLY, NAMED (P0): causal text perceiver (mention arrivals per
// encounter) -> kernel/network-standing.js with the ENGINE's bindLinks
// injected. Presence (terrain-activation's raw pair lighting) and
// standing (this) are reported side by side because confusing them is the
// exact mistake P1/P6 name.
//
// NUMBERS, EACH WITH ITS GIVER (S5/S7/S9):
//   window — MEASURED, dmdWindow over this book's own mention stream, COMPANY
//            conclusion: the recency slice's whole referent-count vector
//            against the first-quarter's own, cosine similarity, tested
//            against a permutation null of same-size slices (draws/seed
//            below) rather than a fixed threshold. Top-1 exact-match (the
//            prior conclusion) is brittle to a near-tied cast — measured on
//            this book: Pierre 24 / Borodino 21 / French 20 / Kutuzov 19 in
//            the first quarter, a five-way plurality no single-winner test
//            survives at any candidate depth. Company similarity tolerates
//            that tie because it asks "is this slice still about the same
//            CAST", not "does it agree on who is FIRST" (native/docs/
//            THE-CORE-MECHANISM.md's PREDICTION family — compare to what's
//            expected, never to a hand-set bar).
//   draws 199, alpha 0.05, seed — host/population.js::LINK_SPEC's own
//            convention, the certified consumer's cut, cited not chosen;
//            reused for the company null so one seed governs both nulls
//            this driver spends.
//   ON A GAP (reach_exceeds_candidates, still possible: a book whose company
//   never stabilizes even by similarity): the widest tried candidate is
//   handed back as a disclosed CEILING (resolutions.js::dmdCut's own
//   precedent), never a silent crash and never mistaken for a measurement.
//
// Usage: node native/eval/network-standing.mjs <book.txt>

import fs from "node:fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { extractSurfaces, discoverReferents, diaNorm } from "../adapters/text/surfaces.js";
import { splitSentences } from "../adapters/text/spans.js";
import { dmdWindow } from "../kernel/activation.js";
import { networkStanding, directedEdges } from "../kernel/network-standing.js";
import { bindLinks, buildLink } from "../legacy-ported/packages/engine/emergence/binding.js";

const POS_PRIOR = JSON.parse(fs.readFileSync(new URL("../../cli/priors/pos-prior-en.json", import.meta.url), "utf8"));
const WINDOW_CANDIDATES = [8, 16, 32, 64, 128, 256];
const LINK = { draws: 199, alpha: 0.05, seed: 20260812 }; // LINK_SPEC's convention, giver in header

async function main() {
  const path = process.argv[2];
  if (!path) throw new TypeError("usage: node native/eval/network-standing.mjs <book.txt>");
  const stripped = stripContainer(fs.readFileSync(path, "utf8"));
  const encounters = textEncounters(stripped.text, { source: `file:${path.split("/").pop()}`, offset: stripped.offset });
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POS_PRIOR });

  const arrivals = new Map(); // referent -> sorted encounter positions
  const mentionObs = [];
  let pos = 0;
  for (const enc of encounters) {
    const refs = [];
    for (const c of (await perceiver.perceive(enc, {})) ?? []) {
      for (const g of c.candidate?.graphEntries ?? []) {
        if (g?.schema === "EOMention@1" && g.referent) {
          refs.push(g.referent);
          const xs = arrivals.get(g.referent) ?? [];
          if (xs[xs.length - 1] !== pos) xs.push(pos);
          arrivals.set(g.referent, xs);
        }
      }
    }
    mentionObs.push(refs);
    pos += 1;
  }

  // --- company conclusion: the referent-count vector, not a single winner ---
  // "Semantic" here means: two stretches are the same TOPIC if their whole
  // cast of referents is distributed similarly, not if they agree on which
  // one member of a near-tied cast happens to lead. Cosine similarity over
  // count vectors is the plainest measure with that property (Salton, TF
  // vector space, standard IR) and needs no separate distributional prior —
  // the material's own mention counts ARE the vector.
  const vectorOf = (obs) => {
    const m = new Map();
    for (const r of obs.flat()) m.set(r, (m.get(r) ?? 0) + 1);
    return m;
  };
  const cosine = (a, b) => {
    let dot = 0, na = 0, nb = 0;
    const keys = new Set([...a.keys(), ...b.keys()]);
    for (const k of keys) { const x = a.get(k) ?? 0, y = b.get(k) ?? 0; dot += x * y; na += x * x; nb += y * y; }
    return na && nb ? dot / Math.sqrt(na * nb) : 0;
  };

  // Same LCG family as native/legacy-ported/packages/engine/emergence/binding.js
  // ("PRNG — LCG, same family as the rest of this repo"), reused rather than
  // a second generator invented for this one null.
  const lcg = (seed) => { let state = seed | 0; return () => { state = (state * 1664525 + 1013904223) | 0; return (state >>> 0) / 4294967296; }; };

  const quarter = mentionObs.slice(0, Math.floor(mentionObs.length / 4));
  const wholeVec = vectorOf(quarter);

  // The null: how similar does an ARBITRARY same-size contiguous slice of
  // THIS SAME first quarter look to the whole, by chance? Answers "is the
  // real recency slice's company more than coincidentally like the whole's",
  // never a fixed similarity cutoff — the permutation control this whole
  // codebase's II.23 requires before a statistic is trusted (companion arm
  // in eval/network-standing-company-null.mjs proves this band is sensitive:
  // it collapses toward 1.0 on a corpus with one dominant referent, and
  // toward 0 on a scrambled-order control).
  const rnd = lcg(LINK.seed);
  const nullBandAt = (depth, draws = LINK.draws) => {
    const sims = [];
    for (let i = 0; i < draws; i++) {
      const start = Math.floor(rnd() * Math.max(1, quarter.length - depth));
      sims.push(cosine(vectorOf(quarter.slice(start, start + depth)), wholeVec));
    }
    sims.sort((a, b) => a - b);
    return { hi: sims[Math.min(sims.length - 1, Math.ceil(sims.length * (1 - LINK.alpha)))], draws: sims.length };
  };

  const top1Of = (obs) => { const m = vectorOf(obs); return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 1).map(([r]) => r); };
  const companyConclusion = (obs) => ({ vec: vectorOf(obs), top1: top1Of(obs), size: obs.length });
  // MEASURED, not assumed (eval/network-standing-company-compare.mjs): pure
  // cosine ALONE was tried first and made recall WORSE across six real
  // books (1/6 converged, against top-1's 3/6) — a genuine negative result,
  // kept rather than discarded, because cosine over the whole cast is a
  // STRICTER agreement than matching one winner, not a looser one, and this
  // material's near-tied casts fail it just as often as they fail top-1.
  // What measurably helps is the UNION: agree if EITHER signal agrees. This
  // can only ever find a window at least as often as top-1 alone (every
  // book top-1 converges on, the union converges on identically — same
  // depth, same reason) while adding company-similarity as a SECOND,
  // independent route to convergence for books where no single referent's
  // rank is stable but the whole cast's PROPORTIONS still are (measured:
  // Heart of Darkness gains a real window, 16, that top-1 alone never
  // finds). Disclosed cost: an OR of two independently-controlled tests
  // has a higher combined false-positive rate than either alone — not
  // re-derived here, a real cost of combining rather than a free win.
  //
  // "The whole set is never a candidate" (resolutions.js::dmdCut's own
  // rule, POLICIES.md P171): a candidate depth at or past the quarter's own
  // length would make `recent` literally equal `whole`. Not special-cased —
  // the null band degenerates the same way (every draw at that depth IS the
  // whole set, so band.hi == 1.0) and top-1 trivially also agrees with
  // itself there, so this case is excluded from candidates instead, never
  // silently treated as a win.
  const companyEqual = (recentConclusion, wholeConclusion) => {
    if (JSON.stringify(recentConclusion.top1) === JSON.stringify(wholeConclusion.top1)) return true;
    const band = nullBandAt(recentConclusion.size);
    const observed = cosine(recentConclusion.vec, wholeConclusion.vec);
    return observed > band.hi;
  };

  // A candidate at or past the quarter's own length would make `recent`
  // literally equal `whole` — dmdWindow's own docs and dmdCut's precedent
  // both hold "the whole set is never a candidate": tested here, not just
  // asserted, because top1's trivial self-equality would otherwise report
  // a fake "measured" window the instant candidates run out on a short
  // quarter (found by reasoning about borodino-excerpt.txt's own 20-row
  // quarter against candidates up to 256, before it could bite silently).
  const testableCandidates = WINDOW_CANDIDATES.filter((d) => d < quarter.length);
  const measuredWindow = testableCandidates.length
    ? dmdWindow(quarter, companyConclusion, { candidates: testableCandidates, equal: companyEqual })
    : { window: null, gamma: null, gap: "quarter_too_short", basis: `the first quarter (${quarter.length} units) is smaller than the smallest candidate depth (${WINDOW_CANDIDATES[0]}) — nothing below it to test`, tried: [] };
  // dmdCut's own precedent (the-fold resolutions.js): a reach_exceeds_candidates
  // gap is never a reason to throw the whole computation away. The widest
  // tried candidate is handed back as a DECLARED CEILING, disclosed as
  // exactly that, never mistaken for a measurement.
  const widestTested = testableCandidates.length ? testableCandidates[testableCandidates.length - 1] : quarter.length;
  const measured = measuredWindow.window != null
    ? measuredWindow
    : { window: widestTested, gamma: null, basis: `ceiling: no depth up to ${widestTested} reproduced the whole first-quarter's company at its own null band — the widest ACTUALLY TESTED candidate handed as the declared budget (never one filtered out for being >= the quarter itself)`, tried: measuredWindow.tried, ceiling: true, gap: measuredWindow.gap };

  // IDENTITY IS RETRIEVAL-TIME (P1: activation decays, identity does not).
  // The causal perceiver assigns ids as clustered AT THAT MOMENT of the
  // read — before "Henry Clerval" has ever been seen, bare "Henry" and
  // bare "Clerval" are two ids, and arrivals recorded under the early ids
  // stay split even after the reader's own clustering has merged them.
  // Measured: the standing organ then ranked Clerval–Henry among the top
  // "bonds" — self-company read as a bond. So arrivals are PROJECTED here
  // through the reading's FINAL clustering (the same organs, full
  // evidence): each incremental id names its founding surface, and the
  // final clustering says which being that surface belongs to.
  const finalRefs = discoverReferents(extractSurfaces(splitSentences(stripped.text), {}));
  const finalIdOf = new Map();
  for (const e of finalRefs.events) if (e.type === "DEF.admit") finalIdOf.set(diaNorm(e.surface).replace(/\s+/g, "_"), e.referent_id);
  const merged = new Map();
  let remapped = 0;
  for (const [id, a] of arrivals) {
    const founding = id.replace(/^ref:auto:/, "");
    const finalId = finalIdOf.get(founding) ?? id;
    if (finalId !== id) remapped += 1;
    const xs = merged.get(finalId) ?? [];
    xs.push(...a);
    merged.set(finalId, xs);
  }
  for (const xs of merged.values()) xs.sort((x, y) => x - y);
  const beings = [...merged.entries()].map(([id, a]) => ({ id, arrivals: [...new Set(a)] }));
  const standing = networkStanding(beings, { bindLinks, window: measured.window, ...LINK });

  // presence-side comparison: how many RAW pairs ever co-arrive at all
  const rawPairs = standing.pairsTested;

  // The directed pass runs ONLY over admitted edges (S9: standing licenses
  // the more expensive question). totalUnits = this reading's encounters.
  const dir = directedEdges(beings, standing.edges, { buildLink, totalUnits: pos, ...{ draws: LINK.draws, seed: LINK.seed } });

  console.log(JSON.stringify({
    schema: "EONetworkStanding@1",
    book: path.split("/").pop(),
    assembly: "causal text perceiver (mention arrivals per encounter) -> kernel/network-standing with engine bindLinks injected",
    declared: { window: { value: measured.window, basis: measured.basis ?? "dmdWindow, company (cosine-similarity) derive on this book's own first-quarter mention stream, against a permutation null", ceiling: measured.ceiling ?? false, gap: measured.gap ?? null } , ...LINK },
    beings: beings.length,
    identityProjection: { incrementalIds: arrivals.size, finalBeings: beings.length, remapped },
    belowArrivalFloor: standing.belowFloor.length,
    rawCoArrivingPairs: rawPairs,
    edges: standing.edges.length,
    refusedAsCoincident: standing.refused.length,
    topEdges: standing.edges.slice(0, 15),
    refusedSample: standing.refused.sort((a, b) => b.coArrivals - a.coArrivals).slice(0, 6),
    direction: {
      oriented: dir.directed.length,
      undetermined: dir.undetermined.length,
      topOriented: dir.directed.sort((a, b) => b.strength - a.strength).slice(0, 10),
    },
    note: "presence lights every raw pair (terrain-activation); standing is only what clears its own null — the two counts differing IS the finding (P6)",
  }, null, 1));
}

main().catch((err) => { console.error(err); process.exit(1); });
