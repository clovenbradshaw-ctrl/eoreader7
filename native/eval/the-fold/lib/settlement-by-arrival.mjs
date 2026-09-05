// settlement-by-arrival.mjs — Pass 27 of the null experiments (the-fold
// NEXT-PASSES): SETTLEMENT BY ARRIVAL. A cut meets its link and the door
// lands a contest (S69). A THIRD source arrives. What may settle it, and
// what may not:
//   1. a third source that RESTATES the link corroborates it and settles
//      nothing — corroboration is a label, never a gate (P89): the contest
//      stays open, `disputedBy` still names the denier;
//   2. a third source SILENT on the pair leaves the contest open and is not
//      a candidate for it;
//   3. a third source with both ends co-present is a CANDIDATE
//      (`contestedSearch` with the declared kinds) — the seeker's lead,
//      never a landing; a source that already spoke, either side, never is;
//   4. only `settleDispute` settles — outcome and trigger recorded — and the
//      timeline then reads link → cut → contest → settled; an UPHELD
//      settlement leaves the cut live; a CONCEDED one hands back the
//      concession that takes the link down, and the timeline says so.
// Controls (II.23): routing with a kind the door did not land leaves the
// contest UNROUTED with its reason; kinds undeclared throws.
// Zero model calls.
import { organs, readCorpus, CORPUS } from "./product-assay.mjs";

export const ARRIVALS = Object.freeze({
  restates: { "northgate-c.txt": "The Northgate Observatory opened in 1889." },
  silent: { "northgate-d.txt": "Marta Quill catalogued the comets of 1891." },
  copresent: { "northgate-e.txt": "The records for 1889 mention the Northgate Observatory and its telescope, but say nothing of an opening." },
});

const LINK = "the northgate observatory|opened|in 1889";

function arrive(O, log, corpus) {
  const r = readCorpus(O, corpus);
  let next = log;
  for (const p of r.passages) {
    const claims = r.rel.read(String(p.text ?? ""))?.claims ?? [];
    const edges = claims.filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, polarity: c.polarity ?? "+", spans: c.spans ?? [] }));
    if (!edges.length) continue;
    next = O.hl.admit(next, edges, { witness: `${p.ref}~${O.recipe}`, classifyConnector: null }).log;
  }
  return next;
}

const rowOf = (O, log) => O.hl.foldWithStanding(log).find((n) => n.id === LINK) ?? null;
const sourcesOf = (corpus) => Object.entries(corpus).map(([ref, text]) => ({ ref, text }));

export async function runSettlementByArrival() {
  const O = await organs();
  const lines = []; const say = (s) => lines.push(s);
  const base = readCorpus(O, CORPUS).log;
  const disputes0 = O.hl.disputesOf(base);
  const d0 = disputes0.get(LINK) ?? [];
  say(`configuration: production reader, recipe ${O.recipe.slice(0, 12)}; 0 model calls. After A and B: ${disputes0.size} contest(s) open on the record; the link is disputed by ${d0.map((d) => d.source).join(", ") || "nobody"} (kind ${d0[0]?.kind ?? "?"})`);
  const kinds = O.hl.NEEDS_THIRD_SOURCE;

  // 1. restated: corroborated, still contested
  const restated = arrive(O, base, ARRIVALS.restates);
  const r1 = rowOf(O, restated);
  say(`restated by C: sources ${r1?.sources} (${r1?.standing}); disputedBy ${JSON.stringify(r1?.disputedBy ?? [])}; contests open ${O.hl.disputesOf(restated).size}`);
  // 2. silent: open, no candidate
  const silent = arrive(O, base, ARRIVALS.silent);
  const seekSilent = O.hl.contestedSearch ? null : null;
  const CO = await import("../../../organs/corroboration.js");
  const CS = CO.contestedSearch;
  // FOUND BY RUNNING (2026-09-05): `textFeatures` drops numerals and closed-
  // class words, so a note whose second end is a bare date ("in 1889") has
  // NO features and `thirdSourceCandidates` can never find a candidate for
  // it — the seeker is blind to numeric ends under its default featurizer.
  // The featurizer is the caller's to declare (the organ injects it), so
  // this driver declares one that keeps numerals, and says so beside the
  // numbers. The default's blindness is reported as `defaultCandidates`.
  const withNumerals = (t) => new Set([...CO.textFeatures(t), ...(String(t ?? "").match(/\b\d{3,4}\b/g) ?? [])]);
  const featuresOf = withNumerals;
  const s2 = CS(silent, O.hl, sourcesOf(ARRIVALS.silent), { limit: 3, kinds, featuresOf });
  say(`silent D: contests open ${O.hl.disputesOf(silent).size}; seeking ${s2.seeking.length} with ${s2.seeking[0]?.candidates.length ?? 0} candidate(s)`);
  // 3. co-present: a candidate, never a landing; A and B never candidates
  const s3 = CS(base, O.hl, [...sourcesOf(CORPUS), ...sourcesOf(ARRIVALS.copresent)], { limit: 3, kinds, featuresOf });
  const s3default = CS(base, O.hl, [...sourcesOf(CORPUS), ...sourcesOf(ARRIVALS.copresent)], { limit: 3, kinds });
  const cands = s3.seeking[0]?.candidates.map((c) => c.source.ref) ?? [];
  say(`co-present E offered with A and B: seeking ${s3.seeking.length}, candidates ${JSON.stringify(cands)} (default featurizer, blind to the numeric end: ${s3default.seeking[0]?.candidates.length ?? 0}); stating ${JSON.stringify(s3.seeking[0]?.stating ?? [])}, contradicting ${JSON.stringify(s3.seeking[0]?.contradicting ?? [])}; contests open after the search ${O.hl.disputesOf(base).size}`);
  // controls: wrong kind → unrouted; undeclared → throws
  const wrong = CS(base, O.hl, sourcesOf(ARRIVALS.copresent), { limit: 3, kinds: ["individuation"], featuresOf });
  let threw = false; try { CS(base, O.hl, [], { limit: 3 }); } catch { threw = true; }
  say(`control: kinds [individuation] → seeking ${wrong.seeking.length}, unrouted ${wrong.unrouted.length} (${wrong.unrouted[0]?.reason ?? ""}); kinds undeclared → ${threw ? "refused" : "ACCEPTED (the wall is down)"}`);
  // 4. settlement — upheld
  const disputeId = d0[0]?.id;
  const up = O.hl.settleDispute(base, disputeId, { outcome: O.hl.DISPUTE_OUTCOMES.UPHELD, trigger: "a third source read at the door states the opening" });
  const tUp = O.hl.negationTimeline(up.log, LINK);
  say(`settled UPHELD: timeline ${tUp.events.map((e) => e.act).join(" → ")}; standing ${JSON.stringify(tUp.standing)}; disputedBy now ${JSON.stringify(rowOf(O, up.log)?.disputedBy ?? [])}; concession handed back: ${up.concession ? "yes" : "none"}`);
  const co = O.hl.settleDispute(base, disputeId, { outcome: O.hl.DISPUTE_OUTCOMES.CONCEDED, trigger: "the denier's own primary document read at the door" });
  let coLog = co.log;
  if (co.concession) coLog = O.hl.concede(coLog, co.concession.id, { trigger: co.concession.trigger }).log;
  const tCo = O.hl.negationTimeline(coLog, LINK);
  say(`settled CONCEDED: concession handed back for ${co.concession?.id ?? "nothing"}; after conceding: timeline ${tCo.events.map((e) => e.act).join(" → ")}; standing ${JSON.stringify(tCo.standing)}; link in the fold: ${rowOf(O, coLog) ? "yes" : "no"}`);
  const numbers = {
    contestsAfterAB: disputes0.size, disputedBy: d0.map((d) => d.source), kind: d0[0]?.kind ?? null,
    restated: { sources: r1?.sources ?? null, disputedBy: r1?.disputedBy ?? [], contestsOpen: O.hl.disputesOf(restated).size },
    silent: { contestsOpen: O.hl.disputesOf(silent).size, candidates: s2.seeking[0]?.candidates.length ?? 0 },
    copresent: { seeking: s3.seeking.length, candidates: cands, defaultCandidates: s3default.seeking[0]?.candidates.length ?? 0, stating: s3.seeking[0]?.stating ?? [], contradicting: s3.seeking[0]?.contradicting ?? [], contestsOpenAfterSearch: O.hl.disputesOf(base).size },
    controls: { wrongKindSeeking: wrong.seeking.length, wrongKindUnrouted: wrong.unrouted.length, undeclaredRefused: threw },
    upheld: { timeline: tUp.events.map((e) => e.act), standing: tUp.standing, disputedBy: rowOf(O, up.log)?.disputedBy ?? [], concession: Boolean(up.concession) },
    conceded: { concessionFor: co.concession?.id ?? null, timeline: tCo.events.map((e) => e.act), standing: tCo.standing, linkInFold: Boolean(rowOf(O, coLog)) },
  };
  return { lines, numbers };
}
