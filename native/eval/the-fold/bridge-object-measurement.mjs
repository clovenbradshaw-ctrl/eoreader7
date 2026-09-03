// bridge-object-measurement.mjs — Pass 12 step 2, measured on real material.
//
// bridge-audit.mjs (step 1's gate) established that referent bridges are
// COMMON on real prose (22/22 corroborated notes across three pages rest
// on one) and that this driver's own zero-model probe cannot yet tell a
// real bridge from a redealt one at this sample size — a power problem,
// not a clearance. That licenses step 2 ("bridges as recorded objects")
// on the "common, not rare" finding alone, explicitly NOT on a claim that
// the 22 bridges are safe.
//
// This driver runs step 2's own module (organs/bridges.js) over the SAME
// three real Wikipedia pages step 1 used, through the SAME production
// pipeline (unchanged from bridge-audit.mjs), and reports what recording
// bridges as their own corroboratable objects actually finds — in
// particular, whether any bridge is asserted by more than one INDEPENDENT
// content note (the capability step 1's per-note `join` could not show at
// all), and reuses step 1's own namesCorefer-based probe, pointed at the
// DISTINCT bridge objects rather than at raw joins, so a bridge asserted
// twice is examined once, not twice.
//
//   node bridge-object-measurement.mjs   env: PAGES (comma list)
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const PAGE_REFS = (process.env.PAGES ?? "wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html,wikipedia-battle-of-borodino.html").split(",");

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { makeNotes, standingOf, sourceOfWitness } = await import(`${NATIVE}/kernel/notes.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const nativeTaskLog = await import(`${NATIVE}/kernel/task-log.js`);
const { deriveBridgeArrangements, syncBridges, BRIDGE_LABEL } = await import(`${NATIVE}/organs/bridges.js`);
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

const PAGES = PAGE_REFS.map((ref) => ({ ref, text: extractReadable(readFileSync(`${FIX}/${ref}`, "utf8")).text }));

function universeOf(text) {
  const sents = splitSentences(text);
  const surfaces = extractSurfaces(sents);
  const bySurface = new Map(), members = new Map();
  try {
    for (const e of discoverReferents(surfaces, {}).events) {
      const id = e.referent_id, sf = String(e.surface);
      bySurface.set(diaNorm(sf), id);
      if (!members.has(id)) members.set(id, []);
      members.get(id).push(sf);
    }
  } catch { /* a universe that could not be built is reported as absent, never as agreement */ }
  const maximal = new Map([...members].map(([id, sfs]) => [id, sfs.slice().sort((a, b) => b.length - a.length)[0]]));
  return { bySurface, maximal };
}
function namesIn(u, face) {
  const f = diaNorm(String(face ?? ""));
  if (!f) return null;
  if (u.bySurface.has(f)) return u.maximal.get(u.bySurface.get(f)) ?? null;
  let best = null;
  for (const [sf, id] of u.bySurface) if (sf.length >= 3 && f.includes(sf) && (!best || sf.length > best.len)) best = { len: sf.length, id };
  return best ? u.maximal.get(best.id) ?? null : null;
}

const t0 = Date.now();
const universes = new Map(PAGES.map((p) => [p.ref, universeOf(p.text)]));
let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", audit: "bridge-object" } });
for (const pg of PAGES) {
  const passages = chunkSource(pg.ref, pg.text);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (edges.length) log = hl.admit(log, edges, { witness: `${pg.ref}~walls-v1` }).log;
  }
}
const contentNotes = hl.foldWithStanding(log);
console.log(`content ledger: ${contentNotes.length} notes from ${PAGES.length} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// ── step 2 itself: sync every derivable bridge onto its own ledger ──────
const bridges = makeNotes();
let bridgeLog = bridges.createNotes();
const sync = syncBridges(bridgeLog, bridges, contentNotes);
bridgeLog = sync.log;
const bridgeNotes = bridges.foldWithStanding(bridgeLog);

console.log(`\nbridge arrangements derived: ${sync.heard.length} (from ${contentNotes.filter((n) => (n.joins ?? []).length).length} content notes with a join)`);
console.log(`turned away (no incoming face — a join predating S48's widening): ${sync.turnedAway.length}`);
console.log(`distinct bridge OBJECTS on the bridge ledger: ${bridgeNotes.length}`);
const byStanding = {};
for (const b of bridgeNotes) byStanding[b.standing] = (byStanding[b.standing] ?? 0) + 1;
console.log(`bridge standings: ${JSON.stringify(byStanding)}`);

const corroborated = bridgeNotes.filter((b) => b.sources >= 2);
console.log(`\nbridges independently asserted by >= 2 DIFFERENT content notes: ${corroborated.length}`);
for (const b of corroborated.slice(0, 5)) console.log(`  ${b.end1} <-> ${b.end2}  (${b.witnesses.length} witnesses)`);
if (!corroborated.length) console.log("  none on this material — every crossing here was assumed once, by exactly one content note.");

// ── the probe, reused from step 1, pointed at DISTINCT bridge objects ───
// (namesCorefer, P38's own organ — the same fix step 1 made, applied here
// too, for the identical reason: a bare-string second identity rule would
// manufacture false disagreement, not measure one.)
function verdictFor(sourceAndFace) {
  const [source, ...rest] = sourceAndFace.split(":");
  const face = rest.join(":");
  const u = universes.get(source) ?? { bySurface: new Map(), maximal: new Map() };
  return namesIn(u, face);
}
let suspect = 0, clean = 0, unexaminable = 0;
for (const b of bridgeNotes) {
  // end1/end2 are "<sourceKey>:<face>" where sourceKey may be a "+"-joined
  // set of sources (the prior side, once corroborated more than once) — the
  // probe reads the FIRST prior source alone, matching step 1's own choice
  // (`j.from[0]`) to examine one real crossing rather than the whole set.
  const priorSource = b.end1.split(":")[0].split("+")[0];
  const priorFace = b.end1.slice(b.end1.indexOf(":") + 1);
  const incomingSourceAndFace = b.end2;
  const a = namesIn(universes.get(priorSource) ?? { bySurface: new Map(), maximal: new Map() }, priorFace);
  const bb = verdictFor(incomingSourceAndFace);
  if (a == null || bb == null) { unexaminable += 1; continue; }
  if (diaNorm(a) === diaNorm(bb) || namesCorefer(a, bb, diaNorm)) clean += 1; else suspect += 1;
}
console.log(`\nPROBE over ${bridgeNotes.length} DISTINCT bridge objects: {"suspect":${suspect},"clean":${clean},"unexaminable":${unexaminable}}`);
console.log(`(step 1's own probe examined ${23} raw crossings on this same material; examining distinct OBJECTS instead of raw crossings is the count step 2 changes, not the probe's own power — its disclosed limits from bridge-audit-RESULTS.md still apply unchanged.)`);
