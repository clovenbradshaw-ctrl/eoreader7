// extract-edges.mjs — read a book once through the production relation
// reader (walls on, the configuration dracula-witness-walk.mjs declares) and
// cache its arrangements as {end1, label, end2, polarity, ref}. The identity
// eval reads this cache so a falsification run never re-pays extraction.
//   node extract-edges.mjs <book.txt> <out.json> [batchChunks=150]
import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = `${NATIVE}/eval/the-fold/fixtures`;
const [BOOK, OUT, BATCH = "150"] = process.argv.slice(2);
const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8"));
const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});
const raw = readFileSync(BOOK, "utf8").replace(/\r\n/g, "\n");
const passages = chunkSource(BOOK.split("/").pop(), raw);
const out = []; const t0 = Date.now(); const n = Number(BATCH);
for (let i = 0; i < passages.length; i += n) {
  const batch = passages.slice(i, i + n);
  const rel = reader(batch, { pool: batch });
  for (const e of rel.edges ?? []) {
    out.push({ end1: e.subject ?? e.end1, label: e.verb ?? e.label, end2: e.object ?? e.end2, polarity: e.polarity ?? null, ref: (e.refs ?? [])[0] ?? null, n: (e.refs ?? []).length || 1 });
  }
  if ((i / n) % 10 === 0) console.error(`${i}/${passages.length} passages, ${out.length} edges, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
writeFileSync(OUT, JSON.stringify({ book: BOOK.split("/").pop(), passages: passages.length, edges: out }));
console.error(`done: ${out.length} edges in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
