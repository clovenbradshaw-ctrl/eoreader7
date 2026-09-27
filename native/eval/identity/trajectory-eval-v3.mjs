// trajectory-eval-v3.mjs — the THIRD registered run (2026-09-27). v2 (kept as
// run) failed its gate again; tracing why found two faults, both fixed in the
// kernel and nothing else changed here:
//   1  the splice control removed the being's own displaced stage from the
//      comparison pool, so it only asked whether the donor was the being's
//      nearest companion (Natasha is Pierre's). Now splice(keepDisplaced) keeps
//      the true stage as a rival the impostor must beat.
//   2  acts every character performs (said, had, looked) dominated similarity;
//      they make no difference among beings. Now every lens's stages are
//      weightByDistinction'd: a feature shared by all anchors at a stage
//      weighs 0.
// Predictions, numbers, landmark, likelihoods, features and the T4 gate are
// v2's, unchanged.
//
// (v2's own header, kept:)
// trajectory-eval-v2.mjs — the SECOND registered run of identity as a
// trajectory (2026-09-27). v1 (trajectory-eval.mjs, kept as run) failed its
// splice control: a stage's extent was every content word of the sentence —
// the scene, not the being. v2 changes exactly one thing: each mention's
// features come from the BEING'S OWN slots (being-record.mjs: after / before /
// rel / with, the POS prior skipping closed classes), and the two lenses
// count those slots. Everything else — predictions, numbers, landmark,
// likelihoods — is v1's, unchanged. And T4 is now a GATE: if the splice
// control does not break the chain, T1, T3 and T5 are NOT READ.
//
// PRE-REGISTERED 2026-09-27, before the first run. Declared numbers:
//   frames = sentences; 30 stages over the book; a stage counts with >= 5
//   occurrences; a continuity link or similarity is evaluable with >= 8 other
//   anchors at that stage; merge belief over 20-sentence scenes; likelihoods
//   same 0.569 / different 1.44 — the medians of the REGISTERED Russian
//   complementary-distribution run (results/complementary-eval.json), so the
//   English test is not calibrated on English; surname prior log-odds 2.2
//   (p = 0.9). Landmark: the first sentence matching /death of (the )?(old )?
//   Count Bezukhov/ — declared from the plot, located by that search only.
//   Lenses: SOCIETY counts title/wealth/legitimacy words, INTIMATES counts
//   feeling/relationship words (lists below, declared as those judges' priors),
//   in any of the being's own slots.
//
//   T1  Pierre, early vs late: his first stage does NOT beat every other
//       anchor's last stage in similarity, AND his chain holds on >= 80% of
//       evaluable links
//   T2  Natasha and Sonya: their same-stage similarity rank is CLOSER in the
//       first third of shared stages than in the last third (overlap, then
//       divergence)
//   T3  the Bezukhov handover: "Bezukhov" is LESS like Pierre at stages up to
//       the landmark than after it (mean rank-p before > mean after)
//   T4  CONTROL built to fail: Natasha's stages spliced into Pierre's every
//       3rd stage break the chain at >= 80% of splice links
//   T5  for-whoms disagree: at the link crossing the landmark stage, Pierre's
//       chain BREAKS for SOCIETY and HOLDS for INTIMATES
//   T6  priors yield: under the surname prior "same", Pierre/Bezukhov ends
//       DIFFERENT with the prior yielded; the control Prince Andrew/Andrew
//       under the same prior ends SAME; a wrong prior "same" on Sonya/Natasha
//       ends DIFFERENT with the prior yielded
//   T7  gold prior swap: needs an occurrence-level key, which does not exist
//       here — declared NOT RUNNABLE, reported as a gap
// A gap (too little material) scores a prediction neither way.
//   node trajectory-eval.mjs <en.txt> [out.json]
import { writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { stagesOf, continuity, similarityAt, splice, mergeBelief, weightByDistinction } = await import(`${NATIVE}/kernel/identity-trajectory.js`);
const { createForWhom } = await import(`${NATIVE}/kernel/for-whom.js`);
const { beingRecord } = await import("./being-record.mjs");
const { readFileSync } = await import("node:fs");
const [EN, OUT] = process.argv.slice(2);

const D = { stages: 30, minPerStage: 5, minOthers: 8, window: 20, surnameLogOdds: 2.2, splitEvery: 3 };
const LIK = { same: 0.569, different: 1.44, giver: "results/complementary-eval.json, Russian registered run: median observed/expected co-presence of SAME and DIFFERENT pairs" };
const NAMES = ["Pierre", "Bezukhov", "Natasha", "Prince Andrew", "Andrew", "Bolkonski", "Princess Mary", "Countess Mary", "Nicholas", "Rostov", "Napoleon", "Bonaparte", "Kutuzov", "Sonya", "Denisov", "Dolokhov", "Boris", "Anatole", "Petya", "Prince Vasili", "Helene", "Moscow", "Russia", "Petersburg", "Bagration", "Alpatych", "Tikhon", "Berg", "Julie", "Speranski"];
const SOCIETY = ["count", "countess", "heir", "inheritance", "inherited", "fortune", "wealth", "wealthy", "rich", "rubles", "estate", "estates", "legitimate", "illegitimate", "title", "rank", "society", "salon", "prince", "princess", "son", "father", "will", "property"];
const INTIMATES = ["felt", "feel", "feeling", "love", "loved", "heart", "thought", "happy", "happiness", "soul", "friend", "wife", "tears", "smile", "smiled", "life", "god", "joy", "sad", "kind"];

const posPrior = JSON.parse(readFileSync(new URL("../../../../live_priors/derived-priors/pos-priors/pos-prior-en.json", import.meta.url), "utf8"));
const { rec, totalFrames, sentences } = beingRecord(EN, NAMES, { posPrior });
const stageSize = Math.ceil(totalFrames / D.stages);
// the landmark, located by its declared search alone (the record's own sentence split)
const landmarkAt = sentences.findIndex((s) => /death of (the )?(old )?Count Bezukhov/.test(s));
const L = Math.floor(landmarkAt / stageSize);

const judges = {
  everyone: createForWhom({ id: "reader", question: "who is who, across the book", giver: "the reader, counting every feature" }),
  society: createForWhom({ id: "society", question: "who holds which title and fortune", giver: "Moscow society (declared lens)", universe: SOCIETY.flatMap((w) => ["after", "before", "rel"].map((k) => `${k}:${w}`)) }),
  intimates: createForWhom({ id: "intimates", question: "who is this person to those who know them", giver: "Pierre's intimates (declared lens)", universe: INTIMATES.flatMap((w) => ["after", "before", "rel"].map((k) => `${k}:${w}`)) }),
};
const byFor = (fw) => weightByDistinction(new Map(NAMES.map((n) => [n, stagesOf(rec.get(n), { stageSize, minPerStage: D.minPerStage, forWhom: fw })])));
const all = byFor(judges.everyone);
const out = { declared: { ...D, stageSize, totalFrames, landmark: { sentence: landmarkAt, stage: L }, likelihood: LIK }, results: {} };

// T1
{ const P = [...all.get("Pierre").keys()].sort((a, b) => a - b), first = P[0], last = P.at(-1);
  const direct = similarityAt(all, "Pierre", "Pierre", first, last, { minOthers: D.minOthers });
  const chain = continuity(all, "Pierre", { minOthers: D.minOthers });
  out.results.T1 = { first, last, direct, chain: { holds: chain.holds, breaks: chain.breaks, gaps: chain.gaps, continuous: chain.continuous }, held: direct?.beatsAll === false && chain.continuous >= 0.8 }; }
// T2
{ const shared = [...all.get("Natasha").keys()].filter((s) => all.get("Sonya").has(s)).sort((a, b) => a - b);
  const ps = shared.map((s) => ({ s, r: similarityAt(all, "Natasha", "Sonya", s, s, { minOthers: D.minOthers }) })).filter((x) => x.r && !x.r.gap);
  const third = Math.max(1, Math.floor(ps.length / 3)), mean = (xs) => xs.reduce((a, x) => a + x.r.p, 0) / xs.length;
  const early = ps.length >= 3 ? mean(ps.slice(0, third)) : null, late = ps.length >= 3 ? mean(ps.slice(-third)) : null;
  out.results.T2 = { stages: ps.map((x) => ({ s: x.s, p: x.r.p, sim: x.r.sim })), earlyMeanP: early, lateMeanP: late, held: early == null ? null : early < late }; }
// T3
{ const rows = [...all.get("Bezukhov").keys()].sort((a, b) => a - b).map((s) => ({ s, r: all.get("Pierre").has(s) ? similarityAt(all, "Pierre", "Bezukhov", s, s, { minOthers: D.minOthers }) : null })).filter((x) => x.r && !x.r.gap);
  const before = rows.filter((x) => x.s <= L), after = rows.filter((x) => x.s > L), mean = (xs) => xs.reduce((a, x) => a + x.r.p, 0) / xs.length;
  out.results.T3 = { rows: rows.map((x) => ({ s: x.s, p: x.r.p, sim: x.r.sim })), beforeMeanP: before.length ? mean(before) : null, afterMeanP: after.length ? mean(after) : null, held: before.length && after.length ? mean(before) > mean(after) : null }; }
// T4
{ const { byAnchor, spliced } = splice(all, "Pierre", "Natasha", { every: D.splitEvery, keepDisplaced: true });
  const c = continuity(byAnchor, "Pierre", { minOthers: D.minOthers - 1 }); // the donor left the pool
  const at = c.links.filter((l) => l.verdict !== "gap" && (spliced.includes(l.to) || spliced.includes(l.from)));
  const rest = c.links.filter((l) => l.verdict !== "gap" && !(spliced.includes(l.to) || spliced.includes(l.from)));
  const broke = at.filter((l) => l.verdict === "breaks").length;
  out.results.T4 = { spliced, spliceLinks: at.length, broke, restHolds: rest.filter((l) => l.verdict === "holds").length, rest: rest.length, held: at.length ? broke / at.length >= 0.8 : null }; }
// T5
{ const cross = (fw) => { const by = byFor(fw); const c = continuity(by, "Pierre", { minOthers: D.minOthers }); const l = c.links.find((x) => x.from <= L && x.to > L); return { link: l ?? null, continuous: c.continuous }; };
  const soc = cross(judges.society), inti = cross(judges.intimates);
  out.results.T5 = { society: soc, intimates: inti, held: soc.link && inti.link && soc.link.verdict !== "gap" && inti.link.verdict !== "gap" ? soc.link.verdict === "breaks" && inti.link.verdict === "holds" : null }; }
// T6
{ const frames = (n) => rec.get(n).map((o) => o.at);
  const prior = { logOdds: D.surnameLogOdds, giver: "surname prior: a shared surname or name-part names one person (declared, the prior under test)" };
  const run = (a, b) => { const r = mergeBelief(frames(a), frames(b), { prior, likelihood: LIK, window: D.window, totalFrames }); return { verdict: r.verdict, logOdds: r.logOdds, materialAlone: r.materialAlone, prior: r.prior, sharedScenes: r.sharedScenes }; };
  const pb = run("Pierre", "Bezukhov"), aa = run("Prince Andrew", "Andrew"), sn = run("Sonya", "Natasha");
  out.results.T6 = { "Pierre|Bezukhov": pb, "Prince Andrew|Andrew": aa, "Sonya|Natasha": sn, held: pb.verdict === "different" && pb.prior.yielded && aa.verdict === "same" && sn.verdict === "different" && sn.prior.yielded }; }
// THE GATE: a measure that cannot tell a spliced-in being from the being
// itself measures nothing, and the tests built on it are not read.
if (out.results.T4.held !== true) for (const k of ["T1", "T3", "T5"]) out.results[k] = { notRead: "the splice control (T4) did not fail as required", measured: out.results[k], held: null };
// T7
out.results.T7 = { held: null, gap: "no occurrence-level key for this text; the gold prior swap cannot run until one is received" };

for (const [k, v] of Object.entries(out.results)) console.log(k, v.held === true ? "HELD" : v.held === false ? "FAILED" : "GAP", JSON.stringify(v).slice(0, 400));
if (OUT) writeFileSync(OUT, JSON.stringify(out));
