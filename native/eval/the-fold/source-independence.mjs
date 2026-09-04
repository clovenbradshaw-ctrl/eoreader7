// source-independence.mjs — the syndication half, measured.
//
// THE FINDING THIS EXISTS FOR. Of the 22 notes standing on two or more sources
// across three real Wikipedia articles, two are Wikipedia maintenance
// categories — the admission door removes those — and the other TWENTY are two
// articles sharing 20 verbatim sentences. No admission door reaches them,
// because they were never furniture. One text in two places is ONE WITNESS.
//
// THE ORGAN is `corroboration.js::sharedTextGroups`, the mirror of the
// shared-instrument count that already sits beside it: two sources read by one
// instrument are one READING; two sources carrying one text are one SOURCE.
//
// THE CONTROL (II.23), built to fail: redeal each source's sentences among the
// sources, keeping every sentence and every source's count exactly, destroying
// only which document a sentence came from. If the redealt corpus shares as
// much as the real one, the measure has found the marginals and decides
// nothing.
//
//   node source-independence.mjs   env: PAGES - MIN_LEN - MIN_SHARED - DRAWS
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const REFS = (process.env.PAGES ?? "wikipedia-battle-of-borodino.html,wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html").split(",");
const MIN_LEN = Number(process.env.MIN_LEN ?? 40);
const MIN_SHARED = Number(process.env.MIN_SHARED ?? 2);
const DRAWS = Number(process.env.DRAWS ?? 40);
const SEED = Number(process.env.SEED ?? 0);

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows, measureOf, blankBelowMeasure } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { sharedTextGroups, distinctSources } = await import(`${NATIVE}/organs/corroboration.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const T = await import(`${NATIVE}/kernel/task-log.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});
const hl = makeHyperlexicon({ createTaskLog: T.createTaskLog, append: T.append, projectTasks: T.projectTasks, ENTRY_KINDS: T.ENTRY_KINDS, OPERATOR_BASIS: T.OPERATOR_BASIS, GRAINS, cellOf });

const pages = REFS.map((ref) => ({ ref, text: extractReadable(readFileSync(`${FIX}${ref}`, "utf8")).text }));
const DECL = { minSentenceLength: MIN_LEN, minShared: MIN_SHARED, splitSentences };

// GROUPING RUNS ON DOOR-FILTERED TEXT, and this is a measured decision, not a
// tidy-up. On RAW text all three of these pages collapse into one — but
// Borodino's overlap with the other two is entirely the publishing system's
// own furniture (navbox rows, reference formatting, category lines), which any
// two pages from one site share. Measured both ways:
//
//   raw            borodino x austerlitz 14, borodino x third-coalition 11,
//                  austerlitz x third-coalition 24  -> ALL THREE collapse
//   door-filtered  borodino x austerlitz  0, borodino x third-coalition  1,
//                  austerlitz x third-coalition  8  -> exactly two collapse
//
// The door-filtered answer is the true one: Wikipedia's Third Coalition
// article copies its Austerlitz section from the Austerlitz article, verbatim
// ("sensing trouble, napoleon ordered his own heavy guard cavalry forward"),
// and Borodino shares nothing but chrome with either. Grouping on raw text
// would collapse any two pages from one site regardless of content.
const doorText = (t) => blankBelowMeasure(t, { measure: measureOf(t, { percentile: 0.9 }), fill: 0.8, minRun: 2 });
const forGrouping = pages.map((p) => ({ ref: p.ref, text: doorText(p.text) }));

// ── the measure, on the real corpus ──────────────────────────────────────
const real = sharedTextGroups(forGrouping, DECL);
const rawGroups = sharedTextGroups(pages, DECL);
console.log(`on RAW text these pages would read as ${rawGroups.groups.length} independent text(s) — the publishing system's own furniture. Grouping below is on DOOR-FILTERED text.`);
console.log(`declared: minSentenceLength ${MIN_LEN}, minShared ${MIN_SHARED}\n`);
console.log("SHARED VERBATIM SENTENCES, pairwise");
for (const o of real.overlaps)
  console.log(`  ${o.a.slice(10, 34).padEnd(26)} x ${o.b.slice(10, 34).padEnd(26)} ${String(o.shared).padStart(3)} of ${o.of}`);
console.log(`\n${real.groups.length} independent text(s) among ${pages.length} sources; ${real.collapsed} collapsed`);
for (const g of real.groups.filter((x) => x.length > 1))
  console.log(`  one text: ${g.map((r) => r.slice(10, 40)).join(" + ")}`);

// ── the control (II.23): redeal sentences among the sources ──────────────
let seed = SEED >>> 0;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pools = forGrouping.map((p) => splitSentences(p.text).map((x) => x?.text ?? x));
const flat = pools.flat();
const counts = pools.map((p) => p.length);
const nulls = [];
for (let d = 0; d < DRAWS; d += 1) {
  const bag = flat.slice();
  for (let i = bag.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
  let at = 0;
  const redealt = counts.map((n, i) => ({ ref: `null-${i}`, text: bag.slice(at, at += n).join(" ") }));
  nulls.push(Math.max(0, ...sharedTextGroups(redealt, DECL).overlaps.map((o) => o.shared)));
}
nulls.sort((a, b) => a - b);
const realMax = Math.max(0, ...real.overlaps.map((o) => o.shared));
const above = nulls.filter((n) => n >= realMax).length;
console.log(`\nCONTROL — sentences redealt among the sources, ${DRAWS} draws`);
console.log(`  largest shared count: real ${realMax}, redealt median ${nulls[DRAWS >> 1]} (${nulls[0]}-${nulls.at(-1)})`);
console.log(above === 0
  ? "  -> the real overlap sits outside every redeal: these documents share a TEXT, not a vocabulary."
  : `  -> ${above} of ${DRAWS} redeals reach it: THE CONTROL SURVIVES and this measure decides nothing.`);

// ── what it does to the ledger ───────────────────────────────────────────
// TWO ARMS: the ledger as the reader builds it today, and the ledger the
// admission door builds. The door and source-independence answer DIFFERENT
// halves of the same problem, so the honest number is what survives both.
const ledgerFrom = (src) => {
  let log = hl.createHyperlexicon({ frame: { probe: "source-independence" } });
  for (const pg of src) {
    const passages = chunkSource(pg.ref, pg.text);
    const rel = reader(passages, { pool: passages });
    for (const p of passages) {
      const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound")
        .map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
      if (edges.length) log = hl.admit(log, edges, { witness: `${pg.ref}~walls-v1` }).log;
    }
  }
  return hl.foldWithStanding(log);
};
const doorNotes = ledgerFrom(forGrouping);
const doorCorr = doorNotes.filter((n) => distinctSources(n.witnesses ?? []).size >= 2);
const bothCorr = doorNotes.filter((n) => distinctSources(n.witnesses ?? [], { groupOf: real.groupOf }).size >= 2);

let log = hl.createHyperlexicon({ frame: { probe: "source-independence" } });
for (const pg of pages) {
  const passages = chunkSource(pg.ref, pg.text);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound")
      .map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (edges.length) log = hl.admit(log, edges, { witness: `${pg.ref}~walls-v1` }).log;
  }
}
const notes = hl.foldWithStanding(log);
const corrBefore = notes.filter((n) => distinctSources(n.witnesses ?? []).size >= 2);
const corrAfter = notes.filter((n) => distinctSources(n.witnesses ?? [], { groupOf: real.groupOf }).size >= 2);
console.log(`\nTHE LEDGER`);
console.log(`  notes                         ${notes.length}`);
console.log(`  standing on 2+ sources        ${corrBefore.length}  ->  ${corrAfter.length}  once one text counts once`);
console.log(`\n  the ${corrBefore.length - corrAfter.length} note(s) that were never corroborated:`);
const gone = corrBefore.filter((b) => !corrAfter.some((a) => a.id === b.id));
for (const n of gone.slice(0, 24)) console.log(`    <<${n.end1}>> --${n.label}-> <<${String(n.end2).slice(0, 48)}>>`);
if (corrAfter.length) {
  console.log(`\n  what SURVIVES as genuinely corroborated:`);
  for (const n of corrAfter) console.log(`    <<${n.end1}>> --${n.label}-> <<${String(n.end2).slice(0, 48)}>>`);
} else {
  console.log(`\n  nothing survives: on this material every corroboration was one text counted twice.`);
}

// ── both halves together ─────────────────────────────────────────────────
console.log(`\n${"=".repeat(72)}\nBOTH HALVES — the admission door AND source independence`);
console.log(`  as the reader builds it today                       ${corrBefore.length}`);
console.log(`  with the admission door alone                       ${doorCorr.length}`);
console.log(`  with source independence alone                      ${corrAfter.length}`);
console.log(`  with BOTH                                           ${bothCorr.length}`);
for (const n of bothCorr) console.log(`    <<${n.end1}>> --${n.label}-> <<${String(n.end2).slice(0, 48)}>>`);
console.log(bothCorr.length === 0
  ? `\n  On this three-page fixture there is NO genuine cross-source corroboration.\n  Every one of the ${corrBefore.length} was either the publishing system's furniture or one\n  text counted twice. The two halves are complementary: the door removes what\n  independence cannot see, and independence removes what the door cannot.`
  : `\n  ${bothCorr.length} note(s) are corroborated by genuinely independent sources.`);
