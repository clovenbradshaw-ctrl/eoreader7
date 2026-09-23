// eval/ledger-paradigm-testimony.mjs — does eoreader7's own reasoning ledger
// carry real cross-session corroboration (EVA·Pattern, the Interpretation
// domain's own Pattern-grain cell — Paradigm · Tracing), read mechanically
// with the real registered organ (capacity-runner.js::mergeTestimony), no
// model call anywhere?
//
// THE ARC, kept honest — this test failed its own null TWICE before landing
// on an honest answer, and both failures are as load-bearing as the number:
//
//   ITERATION 1 (naive): one reading per session per ground, verdict "holds"
//   whenever a session claimed ANYTHING about that ground. Rejected before
//   running — with no "refused" signal anywhere in a purely declarative
//   claims corpus, every multi-session ground trivially reads AGREE, telling
//   us nothing (the same vacuous-presence-check trap this repo's own
//   cli/claude-code-context.mjs header already names and refuses).
//
//   ITERATION 2 (global session-label shuffle): group by (ground,rel);
//   count (ground,rel) pairs independently asserted by >=2 DISTINCT sessions
//   via mergeTestimony's real AGREE case; null = redeal which session every
//   claim came from (global shuffle). MEASURED: real=7, null mean=161.7 (out
//   of 200 runs), p=1.0 — the OPPOSITE of a working control. Diagnosis: real
//   work sessions are BURSTY (one session does a deep dive on a handful of
//   files, so repeated claims on one (ground,rel) are usually the SAME
//   session restating itself). A global shuffle destroys that real
//   session-locality and scatters claims across fictional sessions by the
//   birthday paradox, MANUFACTURING cross-session overlap that never
//   existed. The confound was never agreement; it was burstiness, and this
//   null destroyed the wrong thing.
//
//   ITERATION 3 (this file): hold each session's own real activity fixed —
//   which grounds it touched, how many claims, which rels it used overall —
//   and redeal ONLY the pairing WITHIN each session (which of its own
//   already-used rels lands on which of its own already-touched grounds).
//   MEASURED: real=7, null mean=7.14 (N=500), p=0.58 — no signal. The real
//   count is unremarkable once burstiness is properly controlled for rather
//   than destroyed.
//
// THE HONEST READING (not massaged into a positive): as currently measured,
// cross-session testimony merge over this ledger finds NOTHING beyond
// chance. Two disclosed, un-closed reasons, named rather than hidden:
//   (a) population is thin — only 37 grounds are touched by >=2 distinct
//       sessions at all, and only 7 of those converge on the EXACT SAME rel
//       string, a small-numbers regime this test cannot yet power past;
//   (b) identity is exact-string, not paraphrase-tolerant — two sessions
//       that genuinely agree in substance but phrase it as "reads-and-folds"
//       vs "folds" count as disagreement here, the same disclosed limit
//       cli/claude-code-context.mjs's own header already names and refuses
//       to silently paper over with a hand-picked similarity threshold.
// This is a LEAD (per CAPABILITY C4's own law: an empty cell is a lead,
// never a verdict), not a verdict that no such signal could ever be found.
//
//   node native/eval/the-fold/ledger-paradigm-testimony.mjs [--runs N] [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeTestimony } from "../../organs/capacity-runner.js";
import { createSeededRng, shuffled } from "../../kernel/rng.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LEDGER = process.env.EO_LEDGER_DIR
  ? path.join(process.env.EO_LEDGER_DIR, "eoreader7-reasoning:1.jsonl")
  : path.join(HERE, "..", "..", "..", "documents", "eoreader7-reasoning:1.jsonl");

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : dflt; };
const RUNS = flag("--runs", 500);
const asJson = args.includes("--json");

function loadSessionedClaims() {
  if (!fs.existsSync(LEDGER)) return [];
  return fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    .filter((l) => l.kind === "reasoning-claim" && l.session);
}

function agreeCount(bySession) {
  const groups = new Map(); // "ground\u0001rel" -> Map<session, claim>
  for (const [session, list] of bySession) {
    for (const c of list) {
      const key = `${c.ground}\u0001${c.rel}`;
      if (!groups.has(key)) groups.set(key, new Map());
      if (!groups.get(key).has(session)) groups.get(key).set(session, c);
    }
  }
  let agree = 0;
  const agreements = [];
  for (const [key, bySess] of groups) {
    if (bySess.size < 2) continue;
    const readings = [...bySess.entries()].map(([session, c]) => ({ verdict: "holds", read: [{ session, claimId: c.id }] }));
    if (mergeTestimony(readings).case === "AGREE") {
      agree++;
      const [ground, rel] = key.split("\u0001");
      agreements.push({ ground, rel, sessions: [...bySess.keys()] });
    }
  }
  return { agree, agreements };
}

function run() {
  const claims = loadSessionedClaims();
  const bySession = new Map();
  for (const c of claims) {
    if (!bySession.has(c.session)) bySession.set(c.session, []);
    bySession.get(c.session).push({ ground: String(c.ground ?? "/"), rel: String(c.rel ?? "?"), id: c.id });
  }

  const real = agreeCount(bySession);

  const rng = createSeededRng({ population: "eoreader7-reasoning-ledger:paradigm-testimony", purpose: "within-session-redeal-ground-rel-pairing" });
  const nullCounts = [];
  for (let run = 0; run < RUNS; run++) {
    const shuffledBySession = new Map();
    for (const [session, list] of bySession) {
      const grounds = list.map((c) => c.ground);
      const rels = shuffled(list.map((c) => c.rel), rng);
      const ids = list.map((c) => c.id);
      shuffledBySession.set(session, grounds.map((g, i) => ({ ground: g, rel: rels[i], id: ids[i] })));
    }
    nullCounts.push(agreeCount(shuffledBySession).agree);
  }
  const exceed = nullCounts.filter((v) => v >= real.agree).length;
  const pValue = (exceed + 1) / (nullCounts.length + 1);
  const hist = {};
  for (const v of nullCounts) hist[v] = (hist[v] ?? 0) + 1;

  const out = {
    schema: "EOLedgerParadigmTestimony@1",
    population: { sessions: bySession.size, claims: claims.length },
    realAgreeCount: real.agree,
    agreements: real.agreements,
    withinSessionRedealControl: {
      runs: RUNS, nullHistogram: hist,
      nullMean: nullCounts.reduce((a, b) => a + b, 0) / RUNS,
      nullMax: Math.max(...nullCounts, 0),
      pValue, discriminates: pValue < 0.05,
    },
  };

  if (asJson) { console.log(JSON.stringify(out, null, 1)); return out; }
  console.log(`eoreader7 ledger paradigm-testimony · ${out.population.sessions} sessions, ${out.population.claims} claims`);
  console.log(`real AGREE count (>=2 distinct sessions, same ground+rel, via mergeTestimony): ${real.agree}`);
  for (const a of real.agreements) console.log(`  ${a.ground} --${a.rel}  sessions=${JSON.stringify(a.sessions)}`);
  console.log(`within-session redeal control: real=${real.agree} vs null(N=${RUNS}) mean=${out.withinSessionRedealControl.nullMean.toFixed(3)} max=${out.withinSessionRedealControl.nullMax} → p=${pValue.toFixed(4)} (${out.withinSessionRedealControl.discriminates ? "DISCRIMINATES" : "does not discriminate — honest null, see this file's own header"})`);
  return out;
}

const result = run();
if (process.env.EO_WRITE_RESULTS) {
  const outPath = path.join(HERE, "results", "ledger-paradigm-testimony-latest.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 1));
}
