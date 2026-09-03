// voices-measurement.mjs — of the notes this ledger calls "corroborated" on
// real pages, how many are actually more than one VOICE?
//
// `standingOf` counts distinct refs. This counts distinct voices, using
// `kernel/reproduction.js` to find material that one page reproduces from
// another with nothing marking it, and `organs/voices.js`'s declared lens to
// decide what that means for a note carried by it. No statistic anywhere:
// the collapse rests on shared units with both addresses, re-read.
//
//   node voices-measurement.mjs   env: PAGES (comma list) · MIN_RUN
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const PAGE_REFS = (process.env.PAGES ?? "wikipedia-battle-of-gettysburg.html,wikipedia-american-civil-war.html,wikipedia-abraham-lincoln.html").split(",");
// DECLARED (P4/P9). 40 normalized characters is about seven words of
// English — above `quotes.js`'s own MIN_QUOTE_WORDS floor of five, which it
// calls "the smallest run that is a clause rather than a collocation."
const MIN_RUN = Number(process.env.MIN_RUN ?? 40);

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { sourceOfWitness } = await import(`${NATIVE}/kernel/notes.js`);
const { makeReproduction } = await import(`${NATIVE}/kernel/reproduction.js`);
const { normalizedIndex } = await import(`${NATIVE}/organs/quotes.js`);
const { repetitionLens, findRepetitions, independentVoices } = await import(`${NATIVE}/organs/voices.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8"));

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});
const hl = makeHyperlexicon({ createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append, projectTasks: nativeTaskLog.projectTasks, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS, cellOf });

const shed = (s) => String(s).replace(/[*_`]/g, "").replace(/\s+/g, " ").trim();
const reproduction = makeReproduction({ fold: normalizedIndex, sameRaw: (a, b) => shed(a) === shed(b) });
const lens = repetitionLens({ minRun: MIN_RUN, giver: "voices-measurement.mjs" });

const PAGES = PAGE_REFS.map((ref) => ({ id: ref, material: extractReadable(readFileSync(`${FIX}/${ref}`, "utf8")).text }));

// ── what one page reproduces from another, nothing marking it ───────────
let t0 = Date.now();
const repetitions = findRepetitions(PAGES, { reproduction, minRun: MIN_RUN });
const repChars = repetitions.reduce((s, r) => s + r.units, 0);
console.log(`reproductions: ${repetitions.length} runs, ${repChars} units, across ${PAGES.length} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s (minRun=${MIN_RUN}, declared)`);
for (const r of repetitions.slice().sort((a, b) => b.units - a.units).slice(0, 3))
  console.log(`  [${r.units}] ${r.from} -> ${r.to}: ${JSON.stringify(r.raw.replace(/\s+/g, " ").slice(0, 90))}`);

// ── the ledger, read the way the app reads ──────────────────────────────
t0 = Date.now();
let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", lens: lens.name } });
for (const pg of PAGES) {
  const passages = chunkSource(pg.id, pg.material);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (edges.length) log = hl.admit(log, edges, { witness: `${pg.id}~walls-v1` }).log;
  }
}
const notes = hl.foldWithStanding(log);
console.log(`\nledger: ${notes.length} notes in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// ── the count, beside the old one ───────────────────────────────────────
const corroborated = notes.filter((n) => n.sources >= 2);
let stillMultiVoice = 0;
const collapsedNotes = [];
const survivors = [];
for (const n of corroborated) {
  const v = independentVoices(n, { repetitions, lens, sourceOfWitness });
  if (v.independentVoices >= 2) { stillMultiVoice++; survivors.push({ note: n, v }); }
  else collapsedNotes.push({ note: n, v });
}
console.log(`\nnotes standing on >=2 SOURCES (the count today):        ${corroborated.length}`);
console.log(`of those, standing on >=2 independent VOICES:            ${stillMultiVoice}`);
console.log(`collapsed to one voice by a reproduction nobody claimed: ${collapsedNotes.length}`);
for (const { note, v } of collapsedNotes.slice(0, 8))
  console.log(`  "${note.end1}" --${note.label}--> "${note.end2}"  ${v.sources} sources -> ${v.independentVoices} voice (${v.collapsed.map((c) => `${c.demoted}~${c.units}u`).join(", ")})`);
console.log(`\ncontextChecked: false on every collapse — shared units are shared units; whether a repeater used its origin faithfully is not asked here.`);
