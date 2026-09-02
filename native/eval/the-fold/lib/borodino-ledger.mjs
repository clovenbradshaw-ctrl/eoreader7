// eval/lib/borodino-ledger.mjs — ONE ledger build shared by the
// corroboration drivers: both Borodino pages read by the production reader
// bundle, heard into one hyperlexicon, plus planted fabrications as the
// precision guard. Shared so two drivers cannot drift into two ledgers.
import { readFileSync } from "node:fs";
const FOLD = new URL("../..", import.meta.url).pathname;
const NATIVE = new URL("../../../eoreader7/native", import.meta.url).pathname;
const { makeRelationReader } = await import(`${FOLD}/hypergraph.js`);
const { makeHyperlexicon } = await import(`${FOLD}/hyperlexicon.js`);
const { adaptTaskLog } = await import(`${FOLD}/consequence.js`);
const { chunkSource, blankLabelRows } = await import(`${FOLD}/source.js`);
const { extractReadable } = await import(`${FOLD}/web.js`);
const T = await import(`${FOLD}/../eoreader7/native/organs/index.js`);
const { corroborateLedger, distinctSources } = await import(`${FOLD}/../eoreader7/native/organs/index.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const { tokenize } = await import(`${NATIVE}/adapters/text/material.js`);
const enginePriors = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);

const posPrior = JSON.parse(readFileSync(`${FOLD}/priors-data/pos-prior-eng.json`, "utf8"));
const relationsFor = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS]),
  negationWords: enginePriors.NEGATION_WORDS,
  blankFurniture: (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 }),
  resolvePronouns,
});
const hl = makeHyperlexicon({ ...adaptTaskLog({ createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append, ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS, GRAINS }), projectTasks: nativeTaskLog.projectTasks, cellOf });

export async function buildLedger({ cap = 40 } = {}) {
const sources = [];
for (const name of ["battle-of-borodino", "war-and-peace"]) {
  const face = extractReadable(readFileSync(`${FOLD}/eval/fixtures/wikipedia-${name}.html`, "utf8"));
  sources.push({ ref: `${name}.txt`, text: typeof face === "string" ? face : face?.text ?? "" });
}
let log = hl.createHyperlexicon();
let heard = 0;
for (const s of sources) {
  const passages = chunkSource(s.ref, s.text).slice(0, cap); // declared cap — one page's worth of the reader's own passages
  const rel = relationsFor(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound")
      .map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (!edges.length) continue;
    const r = hl.admit(log, edges, { witness: p.ref ?? s.ref });
    log = r.log; heard += r.heard?.length ?? edges.length;
  }
}
// PLANTED FABRICATIONS — the precision guard: real notes with the object
// swapped for another note's object; an attest on any of these is a lie.
const notes0 = hl.foldHyperlexicon(log);
const planted = [];
for (let i = 0; i + 1 < Math.min(notes0.length, 8); i += 2) {
  const a = notes0[i], b = notes0[i + 1];
  if (a.object === b.object) continue;
  log = hl.hear(log, { subject: a.subject, verb: a.verb, object: b.object, witness: "planted:fabrication", spans: [] });
  planted.push(`${a.subject}|${a.verb}|${b.object}`.toLowerCase());
}
const before = hl.foldHyperlexicon(log);
return { log, hl, sources, planted, heard, before };
}
export { splitSentences, distinctSources, corroborateLedger, T };

