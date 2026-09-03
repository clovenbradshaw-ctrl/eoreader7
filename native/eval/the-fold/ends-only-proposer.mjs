// ends-only-proposer.mjs -- the free measurement WHERE-WE-ARE.md names as the
// next thing to do, and it costs zero model calls.
//
// THE QUESTION. "Are these two notes the same proposition?" is a conjunction
// of three claims: the ends resolve to the same referents, the polarity
// agrees, and the labels denote the same act. Two of the three are already
// mechanical. The third -- verb synonymy -- is the wall.
//
// P74 measured the CONJUNCTION and got ZERO joins on real pages, and its own
// diagnosis attributed the zero to the label half (`sameLemma("withdraws",
// "retreated")` is false). Which means the ENDS half has never been measured
// on its own. This driver drops the label conjunct deliberately and asks the
// remaining question: does ends-only correspondence propose any same-as
// candidates AT ALL?
//
// It is not a re-run of a refuted experiment. It splits the conjunction at
// exactly the joint P74's own postmortem named, and the answer decides
// whether the label question is even worth taking to a giver:
//
//   ~0 candidates -> the wall is UPSTREAM (ends debris, lever 3), and no
//                    synonymy prior anywhere would help.
//   many          -> the label question is live, and a NAMED GIVER
//                    (Wiktionary, licensed on its marginal admits per LP11)
//                    is the licensed next move -- never a model, because
//                    "these labels denote the same act" is a Pattern-grain
//                    claim and a corpus can refute one but never earn one.
//
// THE MECHANISM, and it reuses organs rather than inventing a matcher. Each
// source's own reading already built its own universe of referents
// (`discoverReferents`); the group's maximal form is that universe's fullest
// name for a thing. Resolve each note's two ends IN ITS OWN SOURCE'S universe
// -- never across, because resolving across IS the assumed bridge and
// assuming it here would beg the question -- key the note by the resolved
// pair, and hash-join. Two notes from DIFFERENT sources landing on the same
// key with DIFFERENT labels are a same-as candidate. That is the
// withdraw/retreat shape exactly.
//
// TWO STRATA, kept apart because they are different findings. A candidate
// whose ends are already identical raw strings is a PURE LABEL case: the
// exact-triple match correctly did not fire, and only synonymy stands between
// it and a fold. A candidate whose ends differ as strings and only resolve
// together is one RESOLUTION EARNED -- the harder and more valuable kind, and
// the only kind the control below can kill.
//
// THE CONTROL (II.23), built to fail: resolve each source's notes against
// ANOTHER source's universe (deranged resolution), through the IDENTICAL
// keying code. If the resolution-earned stratum survives that, resolution
// contributed nothing a wrong universe would not, and the proposer is doing
// raw string matching in disguise -- which `hear()` already does, so it would
// add nothing at all. The pure-label stratum is invariant to the control by
// construction (identical raw strings key identically however they resolve)
// and is reported as invariant, never as a survival.
//
//   node ends-only-proposer.mjs     env: PAGES (comma list) - SAMPLE (24)
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const SAMPLE = Number(process.env.SAMPLE ?? 24);
const PAGE_REFS = (process.env.PAGES ?? "wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html,wikipedia-battle-of-borodino.html").split(",");

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { sourceOfWitness } = await import(`${NATIVE}/kernel/notes.js`);
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

// MATERIAL=wikipedia (default) reads the three real fixtures; MATERIAL=dracula
// cuts the real Gutenberg novel into chapter-sized sources exactly as
// dracula-witness-walk.mjs does -- a SECOND material of a different genre, so
// a zero measured on encyclopedic prose is not reported as a fact about
// reading in general when it might be a fact about one corpus.
const MATERIAL = process.env.MATERIAL ?? "wikipedia";
let PAGES;
if (MATERIAL === "dracula") {
  const BOOK = process.env.BOOK ?? "/home/user/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";
  const SLICE = Number(process.env.SLICE ?? 240000), OFFSET = Number(process.env.OFFSET ?? 100000), SOURCES = Number(process.env.SOURCES ?? 6);
  const slice = readFileSync(BOOK, "utf8").replace(/\r\n/g, "\n").slice(OFFSET, OFFSET + SLICE);
  const cuts = [...slice.matchAll(/\n\s*CHAPTER [IVXL]+\s*\n/g)].map((m) => m.index);
  const bounds = [0, ...cuts.slice(0, SOURCES - 1), slice.length];
  PAGES = [];
  for (let i = 0; i + 1 < bounds.length; i += 1) PAGES.push({ ref: `dracula-part-${i + 1}.txt`, text: slice.slice(bounds[i], bounds[i + 1]) });
} else {
  PAGES = PAGE_REFS.map((ref) => ({ ref, text: extractReadable(readFileSync(`${FIX}/${ref}`, "utf8")).text }));
}
console.log(`material: ${MATERIAL} (${PAGES.length} sources)`);

// -- each source's OWN universe (bridge-audit.mjs's organ, unchanged) -------
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
  } catch { /* an unbuildable universe is reported absent, never as agreement */ }
  const maximal = new Map([...members].map(([id, sfs]) => [id, sfs.slice().sort((a, b) => b.length - a.length)[0]]));
  return { bySurface, maximal };
}
const EMPTY_UNIVERSE = { bySurface: new Map(), maximal: new Map() };
function namesIn(u, face) {
  const f = diaNorm(String(face ?? ""));
  if (!f) return null;
  if (u.bySurface.has(f)) return u.maximal.get(u.bySurface.get(f)) ?? null;
  let best = null;
  for (const [sf, id] of u.bySurface) if (sf.length >= 3 && f.includes(sf) && (!best || sf.length > best.len)) best = { len: sf.length, id };
  return best ? u.maximal.get(best.id) ?? null : null;
}

// -- read ------------------------------------------------------------------
const t0 = Date.now();
const universes = new Map(PAGES.map((p) => [p.ref, universeOf(p.text)]));
let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", walls: true, posPrior: "POSPrior@1", probe: "ends-only-proposer" } });
for (const pg of PAGES) {
  const passages = chunkSource(pg.ref, pg.text);
  const rel = reader(passages, { pool: passages });
  for (const p of passages) {
    const edges = (rel.read(String(p.text ?? ""))?.claims ?? [])
      .filter((c) => c.verdict === "bound")
      .map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    if (edges.length) log = hl.admit(log, edges, { witness: `${pg.ref}~walls-v1` }).log;
  }
}
const notes = hl.foldWithStanding(log);
console.log(`ledger: ${notes.length} notes from ${PAGES.length} pages in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
for (const [ref, u] of universes) console.log(`  ${ref}: ${u.maximal.size} referents, ${u.bySurface.size} surfaces`);

// A note's sources: the refs its witnesses name, address and recipe stripped
// (the correction that made every 2-or-more-source count honest -- S45).
const sourcesOf = (n) => new Set((n.witnesses ?? []).map(sourceOfWitness).filter(Boolean));

// -- key each note by its ends RESOLVED IN ITS OWN UNIVERSE ----------------
// `resolve` is a parameter so the deranged control below runs the IDENTICAL
// keying code against a wrong universe: one implementation, never a second
// one written for the control.
const norm = (s) => diaNorm(String(s ?? "")).toLowerCase().trim();
function keyNotes(resolve) {
  const rows = [];
  for (const n of notes) {
    const srcs = [...sourcesOf(n)];
    if (!srcs.length) continue;
    const home = srcs[0];                       // the universe this note was read in
    const r1 = resolve(home, n.end1), r2 = resolve(home, n.end2);
    rows.push({
      note: n, home, srcs,
      k1: norm(r1 ?? n.end1), k2: norm(r2 ?? n.end2),
      resolved1: r1 != null, resolved2: r2 != null,
      raw1: norm(n.end1), raw2: norm(n.end2),
      label: norm(n.label),
    });
  }
  return rows;
}
const ownUniverse = (home, face) => namesIn(universes.get(home) ?? EMPTY_UNIVERSE, face);

// -- the proposal ----------------------------------------------------------
// A candidate: two notes, DIFFERENT sources, SAME resolved end-pair,
// DIFFERENT labels. Hash-join on the key, so this is linear, not quadratic.
function propose(rows) {
  const byKey = new Map();
  for (const r of rows) {
    const k = `${r.k1} ${r.k2}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(r);
  }
  const cands = [];
  for (const group of byKey.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) {
      const a = group[i], b = group[j];
      if (a.label === b.label) continue;                      // same label already: not a synonymy question
      if (a.srcs.some((s) => b.srcs.includes(s))) continue;   // same source: no corroboration to gain
      const rawSame = a.raw1 === b.raw1 && a.raw2 === b.raw2;
      cands.push({ a, b, stratum: rawSame ? "pure-label" : "resolution-earned" });
    }
  }
  return cands;
}

const real = propose(keyNotes(ownUniverse));
const tally = (cs) => cs.reduce((t, c) => (t[c.stratum] = (t[c.stratum] ?? 0) + 1, t), {});
const rt = tally(real);
console.log(`\nENDS-ONLY PROPOSAL over ${notes.length} notes`);
console.log(`  candidates (cross-source, ends correspond, labels differ): ${real.length}`);
console.log(`    pure-label        (ends already identical strings): ${rt["pure-label"] ?? 0}`);
console.log(`    resolution-earned (ends differ, resolve together):  ${rt["resolution-earned"] ?? 0}`);

// -- the control (II.23): deranged resolution ------------------------------
const refs = PAGES.map((p) => p.ref);
const deranged = (home, face) => {
  const i = refs.indexOf(home);
  return namesIn(universes.get(refs[(i + 1) % refs.length]) ?? EMPTY_UNIVERSE, face);
};
const ctrl = propose(keyNotes(deranged));
const ct = tally(ctrl);
console.log(`\nCONTROL -- each source's notes resolved against the NEXT source's universe`);
console.log(`  candidates: ${ctrl.length}   pure-label ${ct["pure-label"] ?? 0} (invariant by construction)   resolution-earned ${ct["resolution-earned"] ?? 0}`);
const realRE = rt["resolution-earned"] ?? 0, ctrlRE = ct["resolution-earned"] ?? 0;
console.log(realRE === 0
  ? "  -> resolution earned NOTHING: every candidate is a pure-label case, and the ends half proposes only what raw string identity already would."
  : ctrlRE >= realRE
    ? "  -> THE CONTROL SURVIVES: resolution contributes nothing a wrong universe would not, and this proposal decides nothing."
    : `  -> resolution contributes: ${realRE} real vs ${ctrlRE} deranged.`);

// -- read the landings, do not count them ---------------------------------
// This project's own repeated lesson (the slicer run; S50's two crude probes):
// a plausible number dissolves on inspecting the sample. Printed for reading.
const show = (cs, n) => cs.slice(0, n).map((c) =>
  `  [${c.stratum}]\n    ${c.a.home}: <<${c.a.note.end1} --${c.a.note.label}-> ${c.a.note.end2}>>\n    ${c.b.home}: <<${c.b.note.end1} --${c.b.note.label}-> ${c.b.note.end2}>>` +
  (c.stratum === "resolution-earned" ? `\n    keyed as: <<${c.a.k1}>> / <<${c.a.k2}>>` : "")).join("\n");
const byStratum = (s) => real.filter((c) => c.stratum === s);
console.log(`\nSAMPLE -- pure-label (${rt["pure-label"] ?? 0} total), first ${Math.min(SAMPLE, rt["pure-label"] ?? 0)}:`);
console.log(show(byStratum("pure-label"), SAMPLE) || "  (none)");
console.log(`\nSAMPLE -- resolution-earned (${realRE} total), first ${Math.min(SAMPLE, realRE)}:`);
console.log(show(byStratum("resolution-earned"), SAMPLE) || "  (none)");

// -- the decomposition the sample demands ----------------------------------
// The pure-label count came back ZERO, and a zero needs a denominator before
// it means anything. Decompose every cross-source note pair by what its ends
// and label did:
//   raw ends collide + label collides  -> ALREADY FOLDED by hear(); these are
//                                         the corroborated notes.
//   raw ends collide + label differs   -> a pure-label candidate (synonymy is
//                                         the only thing standing in the way).
//   raw ends do not collide            -> out of reach without resolution.
// If the first bucket is non-empty and the second is zero, then on this
// material ends never collide across sources WITHOUT the label colliding too
// -- and synonymy is never the blocker, because a paraphrase does not get as
// far as having matching ends in the first place.
{
  const rows = keyNotes(ownUniverse);
  const byRaw = new Map();
  for (const r of rows) {
    const k = `${r.raw1} ${r.raw2}`;
    if (!byRaw.has(k)) byRaw.set(k, []);
    byRaw.get(k).push(r);
  }
  let sameLabel = 0, diffLabel = 0;
  for (const group of byRaw.values()) {
    for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) {
      const a = group[i], b = group[j];
      if (a.srcs.some((s) => b.srcs.includes(s))) continue;
      if (a.label === b.label) sameLabel += 1; else diffLabel += 1;
    }
  }
  const corroborated = notes.filter((n) => sourcesOf(n).size >= 2).length;
  console.log(`\nDECOMPOSITION -- every cross-source pair whose RAW ends collide`);
  console.log(`  notes already standing on 2 or more sources (ends AND label collided, folded by hear): ${corroborated}`);
  console.log(`  unfolded cross-source pairs sharing a raw end-pair, same label: ${sameLabel}`);
  console.log(`  unfolded cross-source pairs sharing a raw end-pair, DIFFERENT label: ${diffLabel}`);
  console.log(diffLabel === 0
    ? "  -> on this material a raw end-pair NEVER collides across sources without the label colliding too.\n     Synonymy is never the blocker here: a paraphrase does not get as far as having matching ends."
    : `  -> ${diffLabel} pairs are blocked by the label alone -- the synonymy question is live on this material.`);
}

// -- how coarse is referent resolution, measured ---------------------------
// Every resolution-earned candidate collapsed two DIFFERENT raw end-pairs onto
// one key. Count how many distinct raw end-pairs each winning key absorbed:
// that number IS the coarsening, and it is why the control survives.
{
  const rows = keyNotes(ownUniverse);
  const byKey = new Map();
  for (const r of rows) {
    const k = `${r.k1} ${r.k2}`;
    if (!byKey.has(k)) byKey.set(k, new Set());
    byKey.get(k).add(`${r.raw1} ${r.raw2}`);
  }
  const winning = [...new Set(real.map((c) => `${c.a.k1} ${c.a.k2}`))];
  const sizes = winning.map((k) => byKey.get(k)?.size ?? 0).sort((a, b) => b - a);
  console.log(`\nCOARSENING -- distinct raw end-pairs absorbed by each key that produced a candidate`);
  console.log(`  keys: ${winning.length}   absorbed: ${sizes.join(", ")}`);
  console.log(`  -- a key absorbing many distinct end-pairs is not finding restatement.`);
  console.log(`     It is saying "these two notes are about the same two referents", which is true of`);
  console.log(`     every pair of propositions relating one pair of things -- and there are many.`);
}

// -- what the ONE candidate turned out to be, generalised ------------------
// The single pure-label candidate across both materials is tense, not
// synonymy ("The door is shut" / "The door was shut"), and `sameAct` -- the
// UniMorph-backed organ already built for exactly this -- does NOT fold it:
// the vendored MorphologyPrior@1 keeps the IRREGULAR TAIL ONLY (5,531 of
// 224,550 pairs; regular inflections are recovered by a suffix rule at read
// time) and the English copula is in neither half. So measure the reach of
// that gap over this material's own labels, rather than assert it.
{
  const P = JSON.parse(readFileSync(`${FIX}/unimorph-morphology-prior.json`, "utf8"));
  const inPrior = (w) => Boolean(P.forms?.[String(w).toLowerCase()]);
  const COPULA = new Set(["is", "was", "are", "were", "be", "been", "being", "am"]);
  const labels = notes.map((n) => norm(n.label).split(/\s+/)[0]).filter(Boolean);
  const cop = labels.filter((w) => COPULA.has(w)).length;
  const covered = labels.filter(inPrior).length;
  console.log(`\nMORPHOLOGY REACH over ${labels.length} note labels`);
  console.log(`  label heads the prior's forms table carries at all: ${covered} (${Math.round(100 * covered / (labels.length || 1))}%)`);
  console.log(`  label heads that are the English copula: ${cop} (${Math.round(100 * cop / (labels.length || 1))}%) -- none of which the prior carries`);
  console.log(`  copula forms present in the prior: ${[...COPULA].filter(inPrior).length} of ${COPULA.size}`);
  console.log(`  -- a lemmatizer blind to the most common verb in English silently reads every`);
  console.log(`     copular restatement as a different act. That is a coverage gap in a RECEIVED`);
  console.log(`     prior with a named giver, and its fix is a better prior -- not a model.`);
}

// -- what the ends half could never reach ----------------------------------
// The denominator nobody has stated: how many notes have an end that resolved
// to nothing at all in their own universe. That is lever 3's debris, and it
// bounds this proposal from above -- an end that names nothing can never
// correspond to anything.
const rows = keyNotes(ownUniverse);
const unresolved = rows.filter((r) => !r.resolved1 || !r.resolved2).length;
const bothUnresolved = rows.filter((r) => !r.resolved1 && !r.resolved2).length;
console.log(`\nDISCLOSED`);
console.log(`  notes with at least one end resolving to no referent in their own universe: ${unresolved} of ${rows.length} (${Math.round(100 * unresolved / (rows.length || 1))}%)`);
console.log(`  notes with NEITHER end resolving: ${bothUnresolved}`);
console.log(`  -- that is lever 3's debris, and it bounds this proposal from above.`);
