// node eval/hyperlexicon-door-probe.mjs
//
// Is the reading good enough for a MEANINGFUL hypergraph? — the measurement
// behind P73, re-runnable (P19/P27's own posture: a driver, not a committed
// regression test). It mirrors the LIVE turn exactly — app.js's own
// relation-reader configuration, holon.js's admission (retrieve → read →
// admit per passage, witness = the passage ref), holon.js's own
// >=2-witness ledger block — against two real committed Wikipedia fixtures,
// and reports what the model would actually be shown.
//
// Three arms, because shipping the POS prior changes TWO things at once and
// they must be told apart:
//   A — the pre-P73 live config: no POS prior on disk, no door gate.
//   B — prior loaded (hypergraph.js's own posPriorFor vocabulary gate goes
//       live — the ride-along), door gate still off.
//   C — prior + the door's classifyConnector gate threaded (the P73 live
//       config): what the gate turns away, and what the ledger holds after.
//
// The identity seam (noteIdentity, P73's other half) is deliberately NOT
// exercised here: it ships unwired (no production canonicalization organ
// yet), and its mechanism is pinned in hyperlexicon-identity.test.mjs.
// This driver measures shipped arms only.
import { readFileSync, existsSync } from "node:fs";

const FOLD = new URL("..", import.meta.url).pathname;
const NATIVE = new URL("../../eoreader7/native", import.meta.url).pathname;

const { makeRelationReader } = await import(`${FOLD}/hypergraph.js`);
const { makeHyperlexicon } = await import(`${FOLD}/hyperlexicon.js`);
const { adaptTaskLog } = await import(`${FOLD}/consequence.js`);
const { makeGrammarLens } = await import(`${FOLD}/grammar-lens.js`);
const { chunkSource, retrieve, tokenize, blankLabelRows } = await import(`${FOLD}/source.js`);
const { extractReadable } = await import(`${FOLD}/web.js`);

const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const enginePriors = await import(`${NATIVE}/adapters/text/priors.js`);
const { classifyWord, dominantClass, POS_PRIOR_META, THRAX_META } = await import(`${NATIVE}/adapters/text/wordclass.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);

// The shipped prior, read the way the page's own fetch would resolve it.
const posPath = `${FOLD}/priors-data/pos-prior-eng.json`;
const posPrior = existsSync(posPath) ? JSON.parse(readFileSync(posPath, "utf8")) : null;
if (!posPrior) console.log("NOTE: priors-data/pos-prior-eng.json absent — arms B/C degrade to arm A (data-gated, the live rule).");

const readerFor = (withPrior) => makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => (withPrior ? posPrior : null),
  determiners: new Set([...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS]),
  negationWords: enginePriors.NEGATION_WORDS,
  blankFurniture: (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 }),
  resolvePronouns,
});

const hyperlexiconFor = makeHyperlexicon({
  ...adaptTaskLog({
    createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append,
    ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS,
  }),
  projectTasks: nativeTaskLog.projectTasks,
  cellOf,
});

const lens = posPrior ? makeGrammarLens({ classifyWord, dominantClass, posPrior, posPriorMeta: POS_PRIOR_META, thraxMeta: THRAX_META }) : null;

// ── material: two real committed Wikipedia pages ─────────────────────────
const allChunks = [];
for (const name of ["battle-of-borodino", "war-and-peace"]) {
  const html = readFileSync(`${FOLD}/eval/fixtures/wikipedia-${name}.html`, "utf8");
  const face = extractReadable(html);
  const text = typeof face === "string" ? face : face?.text ?? "";
  allChunks.push(...chunkSource(`${name}.txt`, text));
}

const QUESTIONS = [
  "Who commanded the Russian army at the Battle of Borodino?",
  "Who wrote War and Peace and when was it published?",
  "What happened to Napoleon's army at Borodino?",
];

// Probe-only closed-class tally (disclosed hand list — a measurement
// instrument, never reading code): received determiners/negation from the
// engine's own register, plus common conjunctions/prepositions/pronoun
// forms seen in the raw output.
const closed = new Set([
  ...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS, ...enginePriors.NEGATION_WORDS,
  "and", "or", "of", "to", "in", "on", "at", "with", "for", "by", "from", "as", "i", "himself",
]);

function runArm(label, { withPrior, gate }) {
  const relationsFor = readerFor(withPrior);
  let log = null;
  let offered = 0;
  const verdicts = {};
  const away = {};
  for (const q of QUESTIONS) {
    const passages = retrieve(allChunks, q, 3);
    const relations = relationsFor(passages, { pool: passages });
    for (const p of passages) {
      const claims = relations.read(String(p.text ?? ""))?.claims ?? [];
      for (const c of claims) verdicts[c.verdict] = (verdicts[c.verdict] ?? 0) + 1;
      const edges = claims.filter((c) => c.verdict === "bound")
        .map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] })); // claims carry the earned names since the wipe; the ledger keeps its own subject/verb/object shape
      if (!edges.length) continue;
      offered += edges.length;
      const r = hyperlexiconFor.admit(log ?? hyperlexiconFor.createHyperlexicon(), edges, {
        witness: p.ref ?? null,
        classifyConnector: gate ? lens : null,
      });
      log = r.log;
      for (const t of r.turnedAway ?? []) away[t.reason ?? "?"] = (away[t.reason ?? "?"] ?? 0) + 1;
    }
  }
  const folded = log ? hyperlexiconFor.foldHyperlexicon(log) : [];
  const closedLabels = folded.filter((n) => closed.has(String(n.verb).toLowerCase()));
  const corroborated = folded.filter((n) => n.witnesses.length >= 2);
  console.log(`\n═══ arm ${label} ═══`);
  console.log(`verdicts: ${JSON.stringify(verdicts)}`);
  console.log(`edges offered: ${offered} · turnedAway: ${JSON.stringify(away)} · notes on the ledger: ${folded.length}`);
  console.log(`closed-class labels among notes: ${closedLabels.length} of ${folded.length}`);
  console.log(`notes with >=2 witnesses (the ledger block's own bar): ${corroborated.length}`);
  console.log(`notes:`);
  for (const n of folded) console.log(`  ${n.subject} —${n.verb}→ ${n.object}`);
  return { verdicts, offered, away, folded, closedLabels, corroborated };
}

runArm("A — no prior, no gate (pre-P73 live config)", { withPrior: false, gate: false });
runArm("B — prior on the reader, gate off (the ride-along alone)", { withPrior: true, gate: false });
runArm("C — prior + door gate (P73 live config)", { withPrior: true, gate: true });
