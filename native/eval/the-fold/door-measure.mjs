// door-measure.mjs — the payoff: does the measure blanker change what reaches
// the ledger, and does it change the right things?
//
// Everything measured today points at one number: the reader ingests 73-77%
// furniture from a Wikipedia page, and of the 22 notes that reach two sources
// on that page set, two are Wikipedia maintenance categories and the other
// twenty are two articles sharing 20 verbatim sentences. This runs the REAL
// pipeline twice, differing in one organ, and compares the ledgers.
//
// WHAT WOULD COUNT AS SUCCESS, declared before the run so it cannot be
// decided afterwards:
//   - the two maintenance-category notes are GONE
//   - genuine prose notes SURVIVE (checked by naming them, not by counting)
//   - the note count falls a lot, because 73% of the input was furniture
// WHAT WOULD COUNT AS FAILURE:
//   - real notes lost in bulk, or the corroborated set gutted of its genuine
//     members while the junk survives
//
//   node door-measure.mjs
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const REFS = (process.env.PAGES ?? "wikipedia-battle-of-borodino.html,wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html").split(",");
const PERCENTILE = Number(process.env.PERCENTILE ?? 0.9);
const FILL = Number(process.env.FILL ?? 0.8);
const MIN_RUN = Number(process.env.MIN_RUN ?? 2);

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows, measureOf, blankBelowMeasure } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { sourceOfWitness } = await import(`${NATIVE}/kernel/notes.js`);
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

// The two arms differ in ONE organ: whether the document is passed through the
// measure blanker before chunking. Blanking is length-preserving, so every
// byte offset in the second arm still names the same place in the real file.
function ledgerFor({ door }) {
  let log = hl.createHyperlexicon({ frame: { probe: "door-measure", door } });
  const kept = {};
  for (const ref of REFS) {
    const raw = extractReadable(readFileSync(`${FIX}${ref}`, "utf8")).text;
    let text = raw;
    if (door) {
      const measure = measureOf(raw, { percentile: PERCENTILE });
      text = blankBelowMeasure(raw, { measure, fill: FILL, minRun: MIN_RUN });
      kept[ref] = { measure, lines: raw.split("\n").filter((l) => l.trim()).length, keptLines: text.split("\n").filter((l) => l.trim()).length };
    }
    const passages = chunkSource(ref, text);
    const rel = reader(passages, { pool: passages });
    for (const p of passages) {
      const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound")
        .map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
      if (edges.length) log = hl.admit(log, edges, { witness: `${ref}~walls-v1` }).log;
    }
  }
  const notes = hl.foldWithStanding(log);
  const corr = notes.filter((n) => new Set((n.witnesses ?? []).map(sourceOfWitness).filter(Boolean)).size >= 2);
  return { notes, corr, kept };
}

const before = ledgerFor({ door: false });
const after = ledgerFor({ door: true });

console.log(`declared: percentile ${PERCENTILE}, fill ${FILL}, minRun ${MIN_RUN}\n`);
for (const [ref, k] of Object.entries(after.kept))
  console.log(`  ${ref.slice(10, 40).padEnd(32)} measure ${String(k.measure).padStart(4)}  lines ${k.lines} -> ${k.keptLines} (${(100 * k.keptLines / k.lines).toFixed(0)}%)`);

console.log(`\nLEDGER`);
console.log(`  notes         ${String(before.notes.length).padStart(5)}  ->  ${String(after.notes.length).padStart(5)}   (${(100 * after.notes.length / before.notes.length).toFixed(0)}% kept)`);
console.log(`  corroborated  ${String(before.corr.length).padStart(5)}  ->  ${String(after.corr.length).padStart(5)}`);

const id = (n) => `${n.end1}|${n.label}|${n.end2}`;
const afterIds = new Set(after.notes.map(id));

// The declared success condition, checked by NAME rather than by count.
const JUNK = [/short description/i, /different from wikidata/i, /^prince\|von\|schwarzenberg$/i, /\[ (de|ru|fr) \]/i, /^category/i];
const junkBefore = before.notes.filter((n) => JUNK.some((r) => r.test(id(n))));
const junkAfter = after.notes.filter((n) => JUNK.some((r) => r.test(id(n))));
console.log(`\nDECLARED JUNK (maintenance categories, navbox interlanguage markers, name fragments)`);
console.log(`  ${junkBefore.length} before -> ${junkAfter.length} after`);
for (const n of junkBefore.slice(0, 8)) console.log(`    ${afterIds.has(id(n)) ? "SURVIVES" : "gone    "}  <<${n.end1}>> --${n.label}-> <<${String(n.end2).slice(0, 44)}>>`);

// And the other half of the condition: do real notes survive? Named, not counted.
const REAL = ["napoleon", "kutuzov", "grande arm", "moscow", "borodino", "austerlitz"];
const realBefore = before.notes.filter((n) => REAL.some((r) => id(n).toLowerCase().includes(r)));
const realAfter = after.notes.filter((n) => REAL.some((r) => id(n).toLowerCase().includes(r)));
console.log(`\nNOTES NAMING THE MATERIAL'S OWN SUBJECTS`);
console.log(`  ${realBefore.length} before -> ${realAfter.length} after (${(100 * realAfter.length / (realBefore.length || 1)).toFixed(0)}% kept)`);
console.log(`  sample of survivors:`);
for (const n of realAfter.slice(0, 8)) console.log(`    <<${n.end1}>> --${n.label}-> <<${String(n.end2).slice(0, 52)}>>`);
console.log(`  sample of what was LOST (a real note dropped is a cost, not a win):`);
for (const n of realBefore.filter((x) => !afterIds.has(id(x))).slice(0, 8)) console.log(`    <<${n.end1}>> --${n.label}-> <<${String(n.end2).slice(0, 52)}>>`);

console.log(`\nEVERY corroborated note AFTER the door:`);
for (const n of after.corr) console.log(`  <<${n.end1}>> --${n.label}-> <<${String(n.end2).slice(0, 58)}>>`);
