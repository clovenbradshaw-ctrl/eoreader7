// rashomon-contrast.mjs — TWO ACCOUNTS OF ONE EVENT, CONTRASTED AT THE CELL
// THE QUESTION LIVES IN.
//
// This replaces the run retracted in results/rashomon-probe-RESULTS.md. That
// run compared subject/verb/object strings across sources with
// `end.toLowerCase()` through an UNGATED door, and reported the result as a
// finding about Tolstoy. P92 names what went wrong in the algebra rather than
// in prose — run the two moves through `cellOf`:
//
//     the question asked   EVA/Pattern -> Paradigm  Tracing  Relate/Interpretation
//     the organ used       CON/Figure  -> Link      Binding  Relate/Structure
//
// Different domain AND different grain. "Do these accounts disagree" is a
// Paradigm-grain tracing move over whole readings; "are these two edges the
// same edge" is a Link-grain binding move over two strings. At Figure grain
// the object of comparison IS a string, which is exactly why
// `end.toLowerCase()` felt available — and why P11 forbids it: at Paradigm
// grain identity can only come from the cast.
//
// THE REGISTERED CHAIN, read out of `CAPACITIES` before anything was written
// (P92), every step an organ this repo already has:
//
//   web        EVA/Lens             web.js::extractReadable            snip -> text
//   cast       SIG+INS/Entity       cast.js::makeReferentIndex         who is who
//   relations  CON/Link             hypergraph.js::makeRelationReader  each source's edges
//   standing   EVA/Paradigm         capacity-runner.js::mergeTestimony THE CONTRAST
//   (P91)      CON/Figure/CONTESTED notes.js::dispute via landContest  the wire
//
// Nothing new is invented here. The only thing this driver contributes is
// the LOOP: mint one claim_id, put the SAME claim to every source through
// `landAct`'s evaluate, and let `perSourceReadings` + `mergeTestimony` do the
// comparing on that spine. `mergeTestimony` has produced a typed DISAGREE
// since BUILD-2 and — audited 2026-09-04 — has never been called on readings
// from real per-source hypergraphs, only on synthetic ones in mhc-battery.
// This is its first real material.
//
// THE READER'S CONFIGURATION IS THE FIRST THING REPORTED (P88/P90). Every
// lever is on and named in the output: the POS prior (POSPrior@1, UD
// English-EWT), the received determiner and negation classes, furniture
// blanking, pronoun resolution, noun-phrase subjects. A claim about material
// is void until the instrument that read it is on the record.
//
// THE MATERIAL: three accounts of Borodino, all committed, all offline —
// English Wikipedia (encyclopedic), Tolstoy's own narrative (novelistic,
// Project Gutenberg), and the War and Peace article (literary-critical).
// Both sides claimed Borodino as a victory, which is what makes it the
// Rashomon case rather than a corroboration exercise.
//
// THE CONTROL IS MATERIAL-SHAPED, NOT A SHUFFLE. A fourth source is a
// DIFFERENT BATTLE (Austerlitz, 1805, different armies, different year). The
// same Borodino claims are put to it. A machine that is reading should go
// SILENT there — undetermined, not contradicted — because Austerlitz has
// nothing to say about Borodino's dispositions. If DISAGREE fires against
// the wrong battle as often as it fires between two accounts of the right
// one, this driver is detecting nothing, and it says so in those words.
//
//   node rashomon-contrast.mjs        env: CLAIMS (cap, default 40), PROBE=1
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const HERE = new URL(".", import.meta.url).pathname;
const OUT = process.env.OUT_PATH ?? path.join(HERE, "results", "rashomon-contrast.json");
const CLAIM_CAP = Number(process.env.CLAIMS ?? 40);
const PROBE = process.env.PROBE === "1";

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeReferentIndex } = await import(`${FOLD}cast.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { makeGrid } = await import(`${FOLD}grid.js`);
const { makeCapacityRunner, landAct, perSourceReadings, mergeTestimony, findCapacity, unresolvedCapacity } =
  await import(`${NATIVE}/organs/index.js`);
const LEGACY = new URL("../../../legacy-eoreader6.1/packages/engine/", import.meta.url).pathname;
const operators = await import(`${LEGACY}operators.js`);
const taskLog = await import(`${LEGACY}holon/task-log.js`);

const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));

// THE PRODUCTION CONFIGURATION, lifted unchanged from
// bridge-object-measurement.mjs — the levers, not a subset of them. Reported
// verbatim in the output so no claim below can be read without it.
const READER_CONFIG = Object.freeze({
  posPrior: posPrior.schema ?? "POSPrior@1",
  posPriorGiver: posPrior.giver?.resource ?? "unknown",
  determiners: "priors.js DEFINITE + INDEFINITE (received, giver lang/en)",
  negationWords: "priors.js NEGATION_WORDS (received)",
  blankFurniture: "blankLabelRows minRun 4 maxCell 60",
  resolvePronouns: true,
  nounPhraseSubjects: true,
});
const relationsFor = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});
const referentIndexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const runCapacity = makeCapacityRunner({ referentIndexFor, relationsFor });

// ── the material ──────────────────────────────────────────────────────────
const readable = (f) => (f.endsWith(".html")
  ? extractReadable(readFileSync(`${FIX}${f}`, "utf8")).text
  : readFileSync(`${FIX}${f}`, "utf8"));

const ACCOUNTS = [
  { id: "wikipedia-en", file: "wikipedia-battle-of-borodino.html", stance: "encyclopedic" },
  { id: "tolstoy", file: "tolstoy-borodino.txt", stance: "novelistic" },
  { id: "war-and-peace", file: "wikipedia-war-and-peace.html", stance: "literary-critical" },
];
const CONTROL = { id: "austerlitz", file: "wikipedia-battle-of-austerlitz.html", stance: "A DIFFERENT BATTLE — the control" };

const load = (a) => ({ ...a, text: readable(a.file) });
const accounts = ACCOUNTS.map(load);
const control = load(CONTROL);
const sources = Object.fromEntries([...accounts, control].map((a) => [a.id, a.text]));

// ── the claims: what any Borodino account actually asserts ────────────────
// Bound edges only — `verdict === "bound"` is hypergraph.js's own gate, the
// one the retracted run bypassed. A claim is a TRIPLE, minted to a claim_id,
// and from that point on nothing downstream compares a surface string.
function passagesOf(a) { return chunkSource(a.id, a.text); }

// ── A/B: THREE READERS, OR ONE DOCUMENT THAT REMEMBERS WHO SAID WHAT ──────
//
// ARM A (siloed) reads each account with its OWN reader and its own pool, and
// then tries to reconcile the results afterwards. ARM B pools every account's
// passages into ONE document and runs ONE reader over it, keeping provenance
// on each passage — `chunkSource(a.id, ...)` already stamps the account into
// every passage ref, so an edge knows which account produced it without any
// account ever getting its own private world.
//
// A MEASURED, NOT ASSERTED. Arm A's first run produced 1466 distinct triples
// across three accounts of one battle with exactly ONE asserted by more than
// one account. Re-keyed through a pooled cast it got worse, not better: 9 of
// 1471 edges had BOTH ends resolve. That is the diagnosis — an edge read
// inside account X's own referent universe carries endpoints established
// THERE, and re-resolving those surfaces against a pooled cast asks a
// question the reader already answered differently. Identity has to be shared
// at READ time, not reconciled at compare time. That is the same lesson P11
// states for names, one tier up: the reader's universe is the thing that must
// be common.
//
// So arm B is the user's own instruction, taken literally: one document,
// provenance retained.
function readArm(name, groups) {
  // groups: [{ id, passages }] — arm A passes one group per account with its
  // own pool; arm B passes ONE group whose pool is every passage there is.
  const edges = [];
  for (const g of groups) {
    const rel = relationsFor(g.passages, { pool: g.pool ?? g.passages });
    for (const p of g.passages) {
      const from = String(p.ref ?? "").split("#")[0] || g.id;
      for (const c of rel.read(String(p.text ?? ""))?.claims ?? []) {
        if (c.verdict !== "bound") continue;
        edges.push({ subject: c.end1, verb: c.label, object: c.end2, from, spans: c.spans ?? [] });
      }
    }
  }
  // Dedupe within ONE referent universe. In arm B the reader's own endpoints
  // already ARE the shared identity — `makeRelationReader` resolves ends
  // through its internal `makeReferentIndex` over the pool it was given — so
  // the key is the reader's own canonical ends, not a surface this driver
  // lowercased. That is the difference between the two arms, and it is the
  // whole point of the A/B.
  const byClaim = new Map();
  for (const e of edges) {
    const k = `${e.subject}\u0000${e.verb}\u0000${e.object}`;
    if (!byClaim.has(k)) byClaim.set(k, { subject: e.subject, verb: e.verb, object: e.object, assertedBy: new Set(), spans: [] });
    const row = byClaim.get(k);
    row.assertedBy.add(e.from);
    for (const sp of e.spans) if (row.spans.length < 6) row.spans.push(sp);
  }
  const all = [...byClaim.values()].map((c) => ({ ...c, assertedBy: [...c.assertedBy] }))
    .sort((a, b) => b.assertedBy.length - a.assertedBy.length);
  const shared = all.filter((c) => c.assertedBy.length > 1);
  return { arm: name, edges: edges.length, distinctClaims: all.length, shared: shared.length,
    sharedShare: all.length ? Number((shared.length / all.length).toFixed(4)) : 0, all, sharedClaims: shared };
}

const t0 = Date.now();
const byAccount = new Map(accounts.map((a) => [a.id, passagesOf(a)]));
const controlPassages = passagesOf(control);
const pooled = [...byAccount.values()].flat();

const armA = readArm("A siloed — one reader per account", accounts.map((a) => ({ id: a.id, passages: byAccount.get(a.id) })));
// Arm B pools the three ACCOUNTS only. The control battle is deliberately
// NOT in the shared universe: adding it would let Austerlitz's referents
// establish identity for Borodino's claims, which is the confound the
// control exists to detect.
const armB = readArm("B one document — pooled pool, provenance retained", [{ id: "pooled", passages: pooled, pool: pooled }]);
const readMs = Date.now() - t0;

// The contrast runs on the arm that actually produced a docket. Declared as
// a rule rather than chosen after seeing the numbers: a contrast needs claims
// two accounts both state, so the arm with more SHARED claims is the only one
// that can host it, and if neither has any the run reports that instead.
const chosen = armB.shared >= armA.shared ? armB : armA;
const docket = chosen.sharedClaims.length ? chosen.sharedClaims : chosen.all;
const claims = docket.slice(0, PROBE ? 3 : CLAIM_CAP);
const byTriple = new Map(chosen.all.map((c) => [`${c.subject}|${c.verb}|${c.object}`, c]));
const shared = chosen.sharedClaims;

// ── the contrast ──────────────────────────────────────────────────────────
const freshGrid = () => { const g = makeGrid({ operators, taskLog }); g.withCapacities({ findCapacity, unresolvedCapacity }); return g; };

async function contrast(claim, sourceIds) {
  const grid = freshGrid();
  const claimId = await grid.mintClaimId({ subject: claim.subject, verb: claim.verb, object: claim.object });
  let log = grid.createLog();
  const act = `evaluate ${claim.subject} ${claim.verb} ${claim.object} at Link from differentiate ground`;
  for (const src of sourceIds) {
    const out = landAct(grid, log, `${act} ${src} broken:rotation`, { sources, runCapacity, claimId });
    if (out.log) log = out.log;
  }
  const readings = perSourceReadings(grid, log, claimId);
  return { claimId, readings, merged: mergeTestimony(readings) };
}

const tally = () => ({ AGREE: 0, DISAGREE: 0, SINGLE: 0, CONTRADICTED: 0, UNDETERMINED: 0 });
const realArm = tally(), controlArm = tally();
const disagreements = [], controlDisagreements = [];
const accountIds = accounts.map((a) => a.id);
// The control swaps ONE real account for the wrong battle, holding the arm
// size at three so the two arms are comparable by construction — the
// layer-size lesson from contest-ladder, applied before the fact instead of
// discovered after it.
const controlIds = [accountIds[0], accountIds[1], control.id];

const t1 = Date.now();
for (const claim of claims) {
  const real = await contrast(claim, accountIds);
  realArm[real.merged.case] += 1;
  if (real.merged.case === "DISAGREE") {
    disagreements.push({
      claim: `${claim.subject} | ${claim.verb} | ${claim.object}`,
      claimId: real.claimId,
      holds: real.merged.holds.map((r) => r.who),
      refused: real.merged.refused.map((r) => r.who),
    });
  }
  const ctl = await contrast(claim, controlIds);
  controlArm[ctl.merged.case] += 1;
  if (ctl.merged.case === "DISAGREE") {
    controlDisagreements.push({
      claim: `${claim.subject} | ${claim.verb} | ${claim.object}`,
      refused: ctl.merged.refused.map((r) => r.who),
      refusedByControl: ctl.merged.refused.some((r) => String(r.who).startsWith(control.id)),
    });
  }
}
const contrastMs = Date.now() - t1;

const rate = (t) => { const n = Object.values(t).reduce((s, x) => s + x, 0); return n ? Number((t.DISAGREE / n).toFixed(3)) : null; };
const realRate = rate(realArm), ctlRate = rate(controlArm);
const falseContests = controlDisagreements.filter((d) => d.refusedByControl).length;

const report = {
  driver: "rashomon-contrast.mjs",
  ran: new Date().toISOString().slice(0, 10),
  modelCalls: 0,
  supersedes: "results/rashomon-probe-RESULTS.md (retracted 2026-09-04)",
  cell: {
    question: "EVA/Pattern -> Paradigm / Tracing (Relate/Interpretation)",
    organ: "capacity-runner.js::mergeTestimony, registered as `standing` at EVA/Paradigm",
    whatTheRetractedRunUsed: "CON/Figure -> Link / Binding (Relate/Structure)",
  },
  readerConfiguration: READER_CONFIG,
  material: {
    accounts: accounts.map((a) => ({ id: a.id, file: a.file, stance: a.stance, chars: a.text.length })),
    control: { id: control.id, file: control.file, stance: control.stance, chars: control.text.length },
  },
  extraction: {
    ab: [armA, armB].map(({ all, sharedClaims, ...rest }) => rest),
    chosenArm: chosen.arm,
    whyChosen: "the arm with more claims two accounts both state — the only arm that can host a contrast",
    claimsPut: claims.length,
    docketIsShared: shared.length > 0,
    readMs,
  },
  arms: {
    real: { sources: accountIds, cases: realArm, disagreeRate: realRate },
    control: { sources: controlIds, cases: controlArm, disagreeRate: ctlRate, falseContestsAgainstTheWrongBattle: falseContests },
  },
  disagreements: disagreements.slice(0, 20),
  controlDisagreements: controlDisagreements.slice(0, 20),
  contrastMs,
  reading:
    realRate === null || ctlRate === null
      ? "no claim was decidable in one of the arms — nothing is claimed"
      : realRate > ctlRate
        ? `three accounts of one battle disagree at ${(realRate * 100).toFixed(1)}% where the wrong battle produces ${(ctlRate * 100).toFixed(1)}% — the contrast is reading the material, not the machinery`
        : `the wrong battle produces disagreement at ${(ctlRate * 100).toFixed(1)}% against ${(realRate * 100).toFixed(1)}% for three accounts of the right one. THE CONTRAST IS NOT READING THE MATERIAL, and nothing about Borodino follows from this run.`,
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));

const say = (s) => console.log(s);
say(`\n=== rashomon-contrast — ${report.modelCalls} model calls ===`);
say(`reader: ${JSON.stringify(READER_CONFIG)}`);
say(`material: ${accounts.map((a) => `${a.id}(${a.text.length})`).join(", ")}  | control: ${control.id}(${control.text.length})`);
say(`A/B (read ${readMs}ms):`);
for (const a of [armA, armB]) say(`  ${a.arm}\n     ${a.edges} bound edges -> ${a.distinctClaims} distinct claims, ${a.shared} asserted by >1 account (${(a.sharedShare * 100).toFixed(2)}%)`);
say(`chosen: ${chosen.arm} — ${shared.length} shared claims${shared.length ? "" : ", FALLING BACK to the full list; no contrast is possible"}`);
say(`claims put to every source: ${claims.length}`);
say(`  REAL    (${accountIds.join(", ")}): ${JSON.stringify(realArm)}  disagree ${realRate}`);
say(`  CONTROL (${controlIds.join(", ")}): ${JSON.stringify(controlArm)}  disagree ${ctlRate}  false contests vs the wrong battle: ${falseContests}`);
for (const d of disagreements.slice(0, 8)) say(`    DISAGREE  ${d.claim}  holds[${d.holds}] refused[${d.refused}]`);
say(`\n${report.reading}\n`);
say(`wrote ${OUT}\n`);
