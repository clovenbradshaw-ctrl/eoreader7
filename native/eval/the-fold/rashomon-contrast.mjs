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
// The slot-level null (P95/S65's own "next 3" — this docket was reported
// but never computed by this driver). Draws and seed are declared, never
// swept against the result: SLOT_NULL_SEED is fixed once, before this null
// was ever run, the same discipline rashomon-probe.mjs's own `nullCross`
// already holds (a seed carried in the file, not chosen after seeing p).
const SLOT_NULL_DRAWS = Number(process.env.SLOT_NULL_DRAWS ?? 500);
const SLOT_NULL_SEED = 20260905;

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeReferentIndex } = await import(`${FOLD}cast.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable, blankSpans } = await import(`${NATIVE}/organs/web.js`);
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
const referentIndexFor = makeReferentIndex({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  // cast.js's own furniture wall (2026-09-04): opting in here is what
  // `passagesOf`'s own blankFurniture (below) is actually FOR — a chunk can
  // carry a page-scoped `.blanked` copy and this reader still ignore it
  // unless it says so itself (the same rule hypergraph.js's relation
  // reader already holds two screens up).
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
});
const runCapacity = makeCapacityRunner({ referentIndexFor, relationsFor });

// ── the material ──────────────────────────────────────────────────────────
// `readable(f)` also returns `navSpans` for an .html source — the
// `role="navigation"` survey `extractReadable` computes over the SAME
// `text` it returns (nothing removed there; see web.js's own header on
// DROP_ROLES for why an extraction-time deletion was refused: a wrong
// call there is silent and irreversible, "the note never exists"). A .txt
// source (Tolstoy's own excerpt) has no navSpans at all — `[]`, a no-op
// for `blankSpans` below.
const readable = (f) => (f.endsWith(".html")
  ? extractReadable(readFileSync(`${FIX}${f}`, "utf8"))
  : { text: readFileSync(`${FIX}${f}`, "utf8"), navSpans: [] });

const ACCOUNTS = [
  { id: "wikipedia-en", file: "wikipedia-battle-of-borodino.html", stance: "encyclopedic" },
  { id: "tolstoy", file: "tolstoy-borodino.txt", stance: "novelistic" },
  { id: "war-and-peace", file: "wikipedia-war-and-peace.html", stance: "literary-critical" },
];
const CONTROL = { id: "austerlitz", file: "wikipedia-battle-of-austerlitz.html", stance: "A DIFFERENT BATTLE — the control" };

const load = (a) => ({ ...a, ...readable(a.file) });
const accounts = ACCOUNTS.map(load);
const control = load(CONTROL);
const sources = Object.fromEntries([...accounts, control].map((a) => [a.id, a.text]));

// THE FURNITURE WALL ON THE CAST (rashomon-contrast-RESULTS.md's own "next
// 1"), and why it is a WALL rather than a deletion. A Wikipedia navbox is
// `<div role="navigation" class="navbox">`, never a `<nav>` element, so the
// existing DROP_CONTAINER tag list in web.js never touched it — a
// Works-by-Leo-Tolstoy navbox's link titles and a Napoleonic-Wars navbox's
// battle names rode through as ordinary body text and the cast admitted
// them as referent candidates, merging into real people by the "longest
// established surface" rule ("August Prince Andrew", an abbreviation "DOW"
// fusing Barclay de Tolly and Pyotr Bagration into one referent).
//
// The wall is NOT built by deleting that text at extraction — commitments.js
// names the exact risk of deciding significance there ("silently and
// irreversibly... the note never exists, so a wrong call cannot be found or
// taken back"), and READING-SPEC S51 measured the concrete danger: a navbox
// row and a line of screenplay dialogue are the SAME SHAPE. So `text` for
// every account above is byte-identical to a page with no navbox awareness
// at all (`web.test.mjs` pins this against these exact fixtures); the wall
// is applied HERE, at cast-building time, per account, over a REVERSIBLE
// masked copy (`blankSpans`, length-preserving, real bytes untouched) —
// composed with the pre-existing `blankLabelRows` succession-box wall
// (P82/P93), since the two catch different furniture shapes on the same
// page (a navbox's own role vs. a "Preceded by / X / Succeeded by" box that
// carries no ARIA role at all).
function furnitureWallFor(a) {
  return (t) => blankLabelRows(blankSpans(t, a.navSpans ?? []), { minRun: 4, maxCell: 60 });
}
function passagesOf(a) {
  return chunkSource(a.id, a.text, { blankFurniture: furnitureWallFor(a) });
}

// THE REFUSAL, COUNTED WHERE IT HAPPENS — never silent. Every account's own
// navSpans and the characters they cover are reported on the record (the
// console line below and `report.furnitureWall`), the same disclosure
// discipline S51 already holds itself to ("2,313 characters blanked...
// 12.4x with the page in view").
const furnitureWall = [...accounts, control].map((a) => ({
  id: a.id,
  navRegions: (a.navSpans ?? []).length,
  navCharsBlanked: (a.navSpans ?? []).reduce((n, s) => n + Math.max(0, s.end - s.start), 0),
}));

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
    sharedShare: all.length ? Number((shared.length / all.length).toFixed(4)) : 0, all, sharedClaims: shared,
    // rawEdges — the PER-OCCURRENCE list (subject/verb/object/from), before
    // the triple-level dedupe above. The slot-level null (below) needs this:
    // it re-labels which account each individual heard occurrence is
    // stamped with, holding the occurrence's own content fixed — the same
    // thing per-triple `assertedBy` cannot do once several occurrences of
    // one triple have already been folded into one row.
    rawEdges: edges };
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

// THE CAST HEALTH CHECK — not a golden the wall was tuned against, a
// disclosure that the earlier run's specific contamination is gone from
// the pooled referent set this driver actually builds `contrast()`'s cast
// from. Named strings from rashomon-contrast-RESULTS.md's own "verified in
// the raw fixture bytes" quote, checked as SUBSTRINGS of every referent's
// represented surface — never the mechanism the wall is built from, which
// is the structural `role="navigation"` survey above, medium- and
// fixture-independent.
const pooledCast = referentIndexFor(pooled);
const pooledReferents = [...pooledCast.referents].map((id) => pooledCast.represent(id)).filter(Boolean).sort();
const KNOWN_CONTAMINATION = ["Walk in the Light", "Story of One Appointment", "Dialogue Among Clever People", "Mesoten", "DOW", "August Prince Andrew"];
const contaminated = pooledReferents.filter((s) => KNOWN_CONTAMINATION.some((bad) => s.includes(bad)));
const REAL_PEOPLE = ["Napoleon", "Kutuzov", "Barclay", "Bagration"];
const realPeopleFound = REAL_PEOPLE.map((who) => ({ who, referents: pooledReferents.filter((s) => diaNorm(s).includes(diaNorm(who))) }));

// The contrast runs on the arm that actually produced a docket. Declared as
// a rule rather than chosen after seeing the numbers: a contrast needs claims
// two accounts both state, so the arm with more SHARED claims is the only one
// that can host it, and if neither has any the run reports that instead.
const chosen = armB.shared >= armA.shared ? armB : armA;
const docket = chosen.sharedClaims.length ? chosen.sharedClaims : chosen.all;
const claims = docket.slice(0, PROBE ? 3 : CLAIM_CAP);
const byTriple = new Map(chosen.all.map((c) => [`${c.subject}|${c.verb}|${c.object}`, c]));
const shared = chosen.sharedClaims;

// ── THE SLOT-LEVEL CONTEST DOCKET, AND ITS NULL ─────────────────────────────
// rashomon-contrast-RESULTS.md's own "What is next, in order" items 2-3, and
// the exact thing the 2026-09-05 audit named as missing: "the rashomon doc's
// slot-level table was never computed by its driver — a report by
// construction, enforced by nothing" (P95/S65). This computes it for real,
// off this driver's own already-cast-resolved edges, and licenses the count
// (or does not) against a real null rather than reporting it bare.
//
// THE GRAIN. The whole-claim comparison above keys on the ENTIRE triple as
// one string, and the doc's own finding is that this grain finds almost
// nothing — the object slot holds the predicate tail, so a claim essentially
// never repeats even within one account. The SLOT is the right grain: same
// (subject, verb), which OBJECT fills it, across accounts — the shape
// `hypergraph.js`'s own `cardinality: {fillers}`/`unbound`'s `competing`
// already name, computed here directly rather than hand-rolled a second
// time (P90's own named mistake). Both grains the doc reports at
// cast-resolved identity are computed; the raw-surface row is NOT — this
// driver's own edges are already resolved through `relationsFor`'s internal
// referent index (the file's own comment above: "the reader's own canonical
// ends, not a surface this driver lowercased"), so a raw-surface comparison
// would need a second, uncast reader pass this task does not call for, and
// P11 already disqualifies raw-surface identity as the wrong method to
// license anything on.
function slotStats(edges, keyFn) {
  const slots = new Map(); // slotKey -> Map(object -> Set(account))
  for (const e of edges) {
    if (!e.subject || !e.verb || !e.object) continue;
    const k = keyFn(e);
    if (!slots.has(k)) slots.set(k, new Map());
    const byObject = slots.get(k);
    if (!byObject.has(e.object)) byObject.set(e.object, new Set());
    byObject.get(e.object).add(e.from);
  }
  let filledByMultiple = 0, competing = 0;
  for (const byObject of slots.values()) {
    const accounts = new Set();
    for (const s of byObject.values()) for (const a of s) accounts.add(a);
    const multi = accounts.size > 1;
    if (multi) filledByMultiple += 1;
    // Competing: more than one DISTINCT object fills this slot, AND more
    // than one account is in the frame — one source restating itself twice
    // under one subject+verb is that source's own variation, never a
    // cross-account CONTEST. This is why filledByMultiple and competing sit
    // at or near equal on this material (rashomon-contrast-RESULTS.md's own
    // 7/7 and 15/15): once two accounts touch a slot at all on Rashomon
    // material, they almost never restate the identical object.
    if (multi && byObject.size > 1) competing += 1;
  }
  return { slots: slots.size, filledByMultiple, competing };
}

const SLOT_GRAINS = {
  "(subject, verb) cast-resolved": (e) => `${e.subject}\u0000${e.verb}`,
  "subject only, cast-resolved": (e) => e.subject,
};

// THE NULL. `contest.js::nullAdjudicate` (native/kernel/contest.js) was read
// first, per this task's own direction, and is NOT reused directly — its
// question and its generative model both differ from this one. It tests
// whether ONE deixis's best-candidate margin beats a redeal of WHICH
// MEMBERS WERE PRESENT AT EACH ACTIVATED FRAME (a single competition's
// significance, against a resampled co-presence pool). This question is
// "does the COUNT of independently-contested SLOTS across the whole docket
// exceed what relabeling produces" — a count over many slots, not one
// margin, built from permuting which ACCOUNT produced an already-fixed,
// already-heard occurrence rather than resampling frame membership. What
// DOES transfer, and is followed here, is the shape `nullAdjudicate` and
// every other Born gate in this codebase share: declared draws/seed/alpha
// (here alpha is implicit in the LICENSED/AT-THE-EDGE/RETRACTED cut, the
// same three-way verdict `nullAdjudicate`'s own construction reduces to at
// the edges), a real statistic tested against its own null distribution,
// nothing tuned after the fact. The actual MECHANISM reused is
// rashomon-probe.mjs's own `nullCross` — the SAME notes, the SAME slot
// membership, only WHICH ACCOUNT each occurrence is stamped with shuffled,
// each account's own total occurrence count held fixed (a permutation, not
// a resample) — because that is the precedent that actually answers this
// question, named explicitly in this task's own brief as reusable.
function slotNull(edges, keyFn, { draws, seed }) {
  const real = slotStats(edges, keyFn);
  const froms = edges.map((e) => e.from);
  let x = seed >>> 0;
  const rand = () => ((x = (1103515245 * x + 12345) >>> 0) / 4294967296);
  const nullCompeting = [];
  for (let d = 0; d < draws; d += 1) {
    const shuffled = [...froms];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const relabeled = edges.map((e, i) => ({ ...e, from: shuffled[i] }));
    nullCompeting.push(slotStats(relabeled, keyFn).competing);
  }
  const med = (xs) => { const a = [...xs].sort((p, q) => p - q); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const nLo = nullCompeting.length ? Math.min(...nullCompeting) : null;
  const nHi = nullCompeting.length ? Math.max(...nullCompeting) : null;
  const nMed = nullCompeting.length ? med(nullCompeting) : null;
  const beaten = nullCompeting.filter((v) => v >= real.competing).length;
  const verdict = nHi === null ? "UNAVAILABLE" : real.competing > nHi ? "LICENSED" : real.competing === nHi ? "AT THE EDGE" : "RETRACTED";
  return { ...real, null: { median: nMed, low: nLo, high: nHi, drawsMatchingOrBeating: beaten, draws }, verdict };
}

const slotDocket = Object.fromEntries(
  Object.entries(SLOT_GRAINS).map(([label, keyFn]) => [
    label,
    slotNull(chosen.rawEdges, keyFn, { draws: SLOT_NULL_DRAWS, seed: SLOT_NULL_SEED }),
  ]),
);

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
  furnitureWall: {
    what: "role=\"navigation\" survey (web.js) composed with the succession-box wall (blankLabelRows, P82/P93) — a reversible, length-preserving mask over the passage text handed to chunkSource, never a deletion at extraction",
    perSource: furnitureWall,
    pooledReferentCount: pooledReferents.length,
    contaminatedReferents: contaminated,
    realPeopleResolved: realPeopleFound,
  },
  extraction: {
    ab: [armA, armB].map(({ all, sharedClaims, rawEdges, ...rest }) => rest),
    chosenArm: chosen.arm,
    whyChosen: "the arm with more claims two accounts both state — the only arm that can host a contrast",
    claimsPut: claims.length,
    docketIsShared: shared.length > 0,
    readMs,
  },
  slotContestDocket: {
    what: "same (subject, verb), which OBJECT fills it, across accounts — hypergraph.js's own cardinality/competing shape, computed for real (P95/S65's own 'never computed by its driver' finding, closed here)",
    grains: slotDocket,
    nullMethod: "rashomon-probe.mjs's own nullCross construction: the same heard occurrences, the same slot membership, only which ACCOUNT each occurrence is stamped with is shuffled (a permutation, each account's own occurrence count held fixed)",
    whyNotNullAdjudicate: "contest.js::nullAdjudicate tests one deixis's best-candidate margin against a redeal of frame membership; this counts contested SLOTS across the whole docket against a redeal of account labels — a different statistic over a different generative model, disclosed in the driver's own comment",
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
say(`furniture wall (role="navigation" survey + succession-box wall, reversible, nothing deleted at extraction):`);
for (const f of furnitureWall) say(`  ${f.id}: ${f.navRegions} navbox region(s), ${f.navCharsBlanked} chars masked for cast-building`);
say(`  pooled cast: ${pooledReferents.length} referents; contaminated (named strings from the retracted finding): ${contaminated.length ? JSON.stringify(contaminated) : "none"}`);
for (const r of realPeopleFound) say(`    ${r.who}: ${r.referents.length ? JSON.stringify(r.referents) : "NOT FOUND"}`);
say(`A/B (read ${readMs}ms):`);
for (const a of [armA, armB]) say(`  ${a.arm}\n     ${a.edges} bound edges -> ${a.distinctClaims} distinct claims, ${a.shared} asserted by >1 account (${(a.sharedShare * 100).toFixed(2)}%)`);
say(`chosen: ${chosen.arm} — ${shared.length} shared claims${shared.length ? "" : ", FALLING BACK to the full list; no contrast is possible"}`);
say(`slot-level contest docket (${chosen.arm}'s own edges), null: shuffle account labels x${SLOT_NULL_DRAWS}, seed ${SLOT_NULL_SEED}:`);
for (const [label, g] of Object.entries(slotDocket)) {
  say(`  ${label}: ${g.slots} slots, ${g.filledByMultiple} filled by >1 account, ${g.competing} with competing fillers`);
  say(`    null competing: median ${g.null.median}, range ${g.null.low}-${g.null.high}; ${g.null.drawsMatchingOrBeating} of ${g.null.draws} draws match or beat the real ${g.competing}  VERDICT: ${g.verdict}`);
}
say(`claims put to every source: ${claims.length}`);
say(`  REAL    (${accountIds.join(", ")}): ${JSON.stringify(realArm)}  disagree ${realRate}`);
say(`  CONTROL (${controlIds.join(", ")}): ${JSON.stringify(controlArm)}  disagree ${ctlRate}  false contests vs the wrong battle: ${falseContests}`);
for (const d of disagreements.slice(0, 8)) say(`    DISAGREE  ${d.claim}  holds[${d.holds}] refused[${d.refused}]`);
say(`\n${report.reading}\n`);
say(`wrote ${OUT}\n`);
