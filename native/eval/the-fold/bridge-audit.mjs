// bridge-audit.mjs — Pass 12 step 1's gate: on real material, how many of
// this ledger's corroborations rest on a referent bridge nobody established?
//
// `hear()` unions two sources' witnesses when their triple matches. That
// asserts the propositions are the same AND that the two documents'
// referents are the same. The second is a bridge between two readings, each
// of which built its own universe of referents. It is now RECORDED as
// assumed (kernel/notes.js); this driver counts them and asks whether any
// are wrong.
//
// THE PROBE, and it costs no model calls: each source's own reading already
// knows what a surface names IN THAT DOCUMENT — `discoverReferents` groups
// surfaces into referents and the group's maximal form is that universe's
// fullest name for it. So for a joined note, ask both universes what each
// end's face names. Two universes giving incompatible maximal forms
// ("Kutuzov" -> "Mikhail Kutuzov" here, "Kutuzov" -> "Kutuzov's rearguard"
// there) is a SUSPECT bridge. Neither universe naming it at all is
// UNEXAMINABLE — a fact about the probe, never a pass.
//
// THE CONTROL (II.23), built to fail: redeal which notes are joined. If the
// real joins' suspect rate is no different from a redealt rate, the probe
// separates nothing and its number decides nothing.
//
//   node bridge-audit.mjs        env: PAGES (comma list) · DRAWS (30) · SEED
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const DRAWS = Number(process.env.DRAWS ?? 30);
const SEED = Number(process.env.SEED ?? 0);
const PAGE_REFS = (process.env.PAGES ?? "wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html,wikipedia-battle-of-borodino.html").split(",");

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { standingOf, sourceOfWitness } = await import(`${NATIVE}/kernel/notes.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const { createSeededRng } = await import(`${NATIVE}/kernel/rng.js`);
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

const PAGES = PAGE_REFS.map((ref) => ({ ref, text: extractReadable(readFileSync(`${FIX}/${ref}`, "utf8")).text }));

// ── each source's OWN universe of referents ─────────────────────────────
// surface -> referent id, and referent id -> the fullest form that universe
// gave it. Nothing here crosses documents; that is the point.
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

// what does THIS universe say a face names? the referent whose own surface
// the face carries — longest match first, so "Mikhail Kutuzov" beats "Kutuzov"
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
let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", audit: "bridge" } });
for (const pg of PAGES) {
  const passages = chunkSource(pg.ref, pg.text);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? []).filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (edges.length) log = hl.admit(log, edges, { witness: `${pg.ref}~walls-v1` }).log;
  }
}
const notes = hl.foldWithStanding(log);
console.log(`ledger: ${notes.length} notes from ${PAGES.length} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const [ref, u] of universes) console.log(`  ${ref}: ${u.maximal.size} referents, ${u.bySurface.size} surfaces`);

// ── the count the gate asks for ─────────────────────────────────────────
const joined = notes.filter((n) => (n.joins ?? []).length);
const corroborated = notes.filter((n) => n.sources >= 2);
console.log(`\nnotes standing on >= 2 sources: ${corroborated.length}`);
console.log(`of those, resting on a bridge nobody established: ${joined.length} (${corroborated.length ? Math.round(100 * joined.length / corroborated.length) : 0}%)`);
console.log(`total assumed bridges recorded: ${notes.reduce((a, n) => a + (n.assumedBridges ?? 0), 0)}`);

// ── the probe ───────────────────────────────────────────────────────────
function verdictFor(face, refA, refB) {
  const a = namesIn(universes.get(refA) ?? { bySurface: new Map(), maximal: new Map() }, face);
  const b = namesIn(universes.get(refB) ?? { bySurface: new Map(), maximal: new Map() }, face);
  if (a == null || b == null) return { v: "unexaminable", a, b };
  // AGREEMENT is namesCorefer, the SAME name-variant test this codebase
  // licenses everywhere else a mention is folded to a referent (P38's own
  // organ) — bare string equality was tried first and is a STRICTER, novel
  // criterion the rest of this system does not use, and it manufactured
  // false "differ" verdicts out of ordinary variation ("Allied Army" vs
  // "Allied", a token-subset match namesCorefer already resolves). Using a
  // second identity rule here, invented for this probe alone, would not be
  // measuring the bridge — it would be measuring the gap between two
  // definitions of "the same name" that the rest of the codebase never lets
  // stand apart.
  return { v: diaNorm(a) === diaNorm(b) || namesCorefer(a, b, diaNorm) ? "agree" : "differ", a, b };
}
function auditPair(end1, end2, refA, refB) {
  const out = [verdictFor(end1, refA, refB), verdictFor(end2, refA, refB)];
  if (out.some((x) => x.v === "differ")) return { cls: "suspect", detail: out };
  if (out.every((x) => x.v === "agree")) return { cls: "clean", detail: out };
  return { cls: "unexaminable", detail: out };
}
const tally = (rows) => { const t = {}; for (const r of rows) t[r.cls] = (t[r.cls] ?? 0) + 1; return t; };
const real = joined.flatMap((n) => (n.joins ?? []).map((j) => ({ note: n, ...auditPair(n.end1, n.end2, j.from[0], j.source), from: j.from[0], to: j.source })));
console.log(`\nPROBE over ${real.length} real bridges: ${JSON.stringify(tally(real))}`);

// ── the control (II.23): redeal which ends were joined ──────────────────
const pool = real.map((r) => ({ end1: r.note.end1, end2: r.note.end2, from: r.from, to: r.to }));
const rates = [];
for (let d = 0; d < DRAWS; d += 1) {
  const rng = createSeededRng(`${SEED}|${d}`);
  // BOTH ends are redealt, not just one: keeping end1 fixed would leave
  // half of every verdict identical between the arms and could hide a real
  // separation inside the shared half. A redealt row is another note's ends
  // across the SAME pair of sources — a bridge for a proposition these two
  // documents never jointly made.
  const order = pool.map((_, i) => i).sort(() => rng() - 0.5);
  const rows = pool.map((x, i) => auditPair(pool[order[i]].end1, pool[order[(i + 1) % order.length]].end2, x.from, x.to));
  const t = tally(rows);
  rates.push((t.suspect ?? 0) / (rows.length || 1));
}
rates.sort((a, b) => a - b);
const realRate = (tally(real).suspect ?? 0) / (real.length || 1);
console.log(`CONTROL, ${DRAWS} redeals of which ends are joined: suspect rate median ${(rates[rates.length >> 1] * 100).toFixed(1)}%, range ${(rates[0] * 100).toFixed(1)}–${(rates.at(-1) * 100).toFixed(1)}%`);
console.log(`REAL suspect rate: ${(realRate * 100).toFixed(1)}%`);
const above = rates.filter((r) => r >= realRate).length;
console.log(above === 0 ? "  the real rate sits outside every redeal — the probe separates" :
  above >= rates.length / 2 ? "  the real rate sits at or below the redealt middle — THE PROBE SEPARATES NOTHING and its number decides nothing" :
  `  ${above} of ${DRAWS} redeals reach the real rate — weak separation, no cut earned`);

console.log(`\nSUSPECT BRIDGES (the ends two universes disagree about):`);
for (const r of real.filter((x) => x.cls === "suspect").slice(0, 12))
  console.log(`  «${r.note.end1} —${r.note.label}→ ${r.note.end2}»  ${r.from} vs ${r.to}\n     ${r.detail.map((d, i) => `end${i + 1}: ${d.v === "differ" ? `"${d.a}" vs "${d.b}"` : d.v}`).join("  ·  ")}`);
