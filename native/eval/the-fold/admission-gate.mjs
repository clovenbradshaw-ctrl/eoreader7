#!/usr/bin/env node
// eval/admission-gate.mjs — the hypergraph admission door, measured before
// and after its EVA station is wired. Closes the loop on the 2026-09-01
// admission findings (18/29 junk labels admitted; corroboration 0/29; the
// gate present but unrunnable for want of its ground).
//
//   node eval/admission-gate.mjs
//
// Offline, no model call: this drives the retrieve → read → admit path a
// grounded turn runs (holon.js:1050's exact edge shape, hyperlexicon.js's
// real door), over the two committed real Wikipedia fixture pages, with
// app.js's own live relation-reader configuration mirrored organ for organ
// (native /engine-v7 adapters, determiners+negationWords on, blankFurniture
// at the app's declared minRun/maxCell, resolvePronouns wired). The three
// questions are DECLARED here, not tuned: this reconstructs the reported
// condition's mechanism, not its exact run (the original driver was not
// committed), so the "before" arm must REPRODUCE THE FINDING — junk-labeled
// admissions, zero corroboration — to license any claim about the "after".
//
// THE THREE ARMS, EO-typed (the cube is the structure of the fix, not
// decoration):
//   A  before — INS with no EVA in front of it: admit() with no
//      classifyConnector, the live app's condition when its POS-prior fetch
//      404s (which it did, on every checkout — see POLICIES.md P74).
//   B  the gate — EVA before INS: the SAME door, classifyConnector wired
//      (grammar-lens.js over live_priors' committed POSPrior@1 — the
//      Ground repo's artifact, read directly). Asymmetric per the grain
//      theorem: a SETTLED non-verb refuses with its giver named; an
//      out-of-vocabulary connector admits (absence convicts nothing).
//   C  the grain question — SYN's identity, measured BEFORE being built:
//      would folding note identity (subjects by referent face, verbs by
//      lemma) let cross-source witnesses corroborate? Reported as candidate
//      joins listed VERBATIM for adversarial inspection, cross-source and
//      within-source counted apart, per the standing caution (live_priors
//      POLICIES LP11): a loosened key is judged on its MARGINAL admits,
//      never on aggregate coverage. Verb folding uses eoreader7's committed
//      irregular-tail table (morphology-eng.json) — the regular-suffix rule
//      that table's own design defers to read time exists only in the
//      absent legacy engine, so regular-inflection pairs (retreats ~
//      retreated) do NOT fold here; that limitation is REPORTED per pair
//      class, never papered over with a hand-rolled stemmer.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { makeRelationReader } from "../hypergraph.js";
import { makeHyperlexicon } from "../hyperlexicon.js";
import { makeGrammarLens } from "../grammar-lens.js";
import { GRAMMAR_MIN_SHARE } from "../hypergraph.js";
import { makeReferentIndex } from "../cast.js";
import { chunkSource, retrieve, tokenize, blankLabelRows } from "../source.js";
import { extractReadable } from "../web.js";

import { splitSentences as engineSentences } from "../../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../../eoreader7/native/adapters/text/surfaces.js";
import { resolvePronouns } from "../../eoreader7/native/adapters/text/pronouns.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader7/native/adapters/text/relations.js";
import * as enginePriors from "../../eoreader7/native/adapters/text/priors.js";
import { classifyWord, dominantClass } from "../../eoreader7/native/adapters/text/wordclass.js";
import * as nativeTaskLog from "../../eoreader7/native/kernel/task-log.js";
import * as cube from "../../eoreader7/native/kernel/cube.js";
import { adaptTaskLog } from "../consequence.js";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---- ground: live_priors' committed POSPrior@1, read where it ships ----
const POS_PRIOR_PATH = join(HERE, "..", "..", "live_priors", "derived-priors", "pos-priors", "pos-prior-en.json");
const posPrior = JSON.parse(readFileSync(POS_PRIOR_PATH, "utf8"));

// eoreader7's committed irregular-tail lemma table (form -> [lemmas]).
const MORPH_PATH = join(HERE, "..", "..", "eoreader7", "native", "priors", "morphology-eng.json");
const morph = JSON.parse(readFileSync(MORPH_PATH, "utf8")).forms;

// ---- material: the two committed fixture pages ----
const pages = [
  { ref: "web:borodino", file: "wikipedia-battle-of-borodino.html" },
  { ref: "web:war-and-peace", file: "wikipedia-war-and-peace.html" },
].map((p) => {
  const html = readFileSync(join(HERE, "fixtures", p.file), "utf8");
  const text = extractReadable(html).text;
  return { ...p, text };
});

// Declared before running, not tuned after:
const QUESTIONS = [
  "What happened at the Battle of Borodino?",
  "What did the Russian army do after the battle?",
  "How does War and Peace depict the Battle of Borodino and Napoleon's invasion?",
];
const PASSAGES_PER_QUESTION = 3; // holon.js's own PASSAGES_PER_PART shape

// ---- app.js's live relation-reader config, organ for organ — built TWICE:
// once with the POS prior absent (posPriorFor -> null: the live app's ACTUAL
// condition, since its fetch of /priors-data/pos-prior-eng.json 404s on
// every checkout), once with live_priors' committed ground supplied. The
// difference isolates what the reader's own vocabulary-level POS gate
// (hypergraph.js, P68's `posPriorFor` wiring) already catches when its
// ground actually ships — BEFORE the door's own lens ever runs.
const readerConfig = (posPriorOrNull) => ({
  splitSentences: engineSentences,
  extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPriorOrNull,
  determiners: new Set([...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS]),
  negationWords: enginePriors.NEGATION_WORDS,
  blankFurniture: (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 }),
  resolvePronouns,
});
const relationsForBlind = makeRelationReader(readerConfig(null));
const relationsForGrounded = makeRelationReader(readerConfig(posPrior));

// consequence.js's own adapter reconciles native's ordinal GRAINS with the
// GRAIN_RANK shape hyperlexicon.js reads — the exact construction
// hyperlexicon-stance.test.mjs already exercises, reused.
const hyperlexicon = makeHyperlexicon({
  ...adaptTaskLog({
    createTaskLog: nativeTaskLog.createTaskLog, append: nativeTaskLog.append,
    ENTRY_KINDS: nativeTaskLog.ENTRY_KINDS, OPERATOR_BASIS: nativeTaskLog.OPERATOR_BASIS,
    GRAINS: cube.GRAINS,
  }),
  projectTasks: nativeTaskLog.projectTasks,
  cellOf: cube.cellOf,
});

// ---- the passage set (same for every arm; the arms differ only at the door) ----
const chunks = pages.flatMap((p) => chunkSource(p.ref, p.text));
const passages = [];
const seen = new Set();
for (const q of QUESTIONS) {
  for (const p of retrieve(chunks, q, PASSAGES_PER_QUESTION)) {
    if (seen.has(p.ref)) continue;
    seen.add(p.ref);
    passages.push(p);
  }
}
console.log(`material: ${pages.map((p) => `${p.ref} (${p.text.length} chars)`).join(", ")}`);
console.log(`passages retrieved across ${QUESTIONS.length} declared questions: ${passages.length}\n`);

// holon.js:1050's exact admission shape
function edgesOf(relationsFor, passage) {
  const relations = relationsFor([passage]);
  const claims = relations.read(passage.text)?.claims ?? [];
  return claims
    .filter((c) => c.verdict === "bound")
    .map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] })); // earned names since the wipe
}

function runArm(name, relationsFor, { classifyConnector = null } = {}) {
  let log = hyperlexicon.createHyperlexicon();
  const heardAll = [], turnedAll = [];
  for (const p of passages) {
    const edges = edgesOf(relationsFor, p);
    if (!edges.length) continue;
    const r = hyperlexicon.admit(log, edges, {
      witness: p.ref, classifyConnector, minShare: GRAMMAR_MIN_SHARE,
    });
    log = r.log;
    heardAll.push(...r.heard);
    turnedAll.push(...r.turnedAway);
  }
  return { name, log, heard: heardAll, turnedAway: turnedAll };
}

function verbProfile(heard) {
  const byVerb = new Map();
  for (const h of heard) byVerb.set(h.verb, (byVerb.get(h.verb) ?? 0) + 1);
  const closed = new Set([
    ...enginePriors.DEFINITE_DETERMINERS, ...enginePriors.INDEFINITE_DETERMINERS,
    ...enginePriors.NEGATION_WORDS,
  ]);
  let junkish = 0;
  for (const h of heard) {
    const c = classifyWord(h.verb, { posPrior });
    const d = c.found ? dominantClass(c, { minShare: GRAMMAR_MIN_SHARE }) : null;
    if (closed.has(h.verb.toLowerCase()) || (d && d.thraxClass && d.thraxClass !== "verb")) junkish++;
  }
  return { byVerb: [...byVerb.entries()].sort((a, b) => b[1] - a[1]), junkish };
}

function corroboration(log) {
  const notes = hyperlexicon.foldHyperlexicon(log);
  const multi = notes.filter((n) => (n.witnesses?.length ?? 0) >= 2);
  return { notes: notes.length, multiWitness: multi.length, multi };
}

function report(arm, { gated = false } = {}) {
  const prof = verbProfile(arm.heard);
  const cor = corroboration(arm.log);
  const refusedByGate = arm.turnedAway.filter((t) => /verb/i.test(t.reason ?? ""));
  console.log(`— ${arm.name}`);
  console.log(`  admitted ${arm.heard.length}, turned away ${arm.turnedAway.length}${gated ? ` (${refusedByGate.length} by the connector gate)` : ""}`);
  console.log(`  labels: ${prof.byVerb.map(([v, n]) => `${v}×${n}`).join(", ")}`);
  if (gated && refusedByGate.length) {
    console.log(`  gate refusals (verbatim):`);
    for (const t of refusedByGate) console.log(`    "${String(t.edge.subject).slice(0, 40)}" —${t.edge.verb}→ "${String(t.edge.object).slice(0, 40)}"  · ${t.detail}`);
  }
  console.log(`  non-verb-labeled among admitted (same lens, post hoc): ${prof.junkish}/${arm.heard.length}`);
  console.log(`  corroboration: ${cor.multiWitness}/${cor.notes} notes with ≥2 witnesses\n`);
  return { prof, cor };
}

// ---- arm A0: the live app's ACTUAL condition (prior 404s, no door gate) ----
const A0 = runArm("A0 (reader blind — posPrior null, the live 404 condition; no door gate)", relationsForBlind);
report(A0);

// ---- arm A1: ground shipped, door still ungated ----
const A1 = runArm("A1 (reader grounded — vocabulary-level POS gate runs; door still ungated)", relationsForGrounded);
report(A1);

// ---- arm B: ground shipped AND door gated ----
const classifyConnector = makeGrammarLens({ classifyWord, dominantClass, posPrior });
const B = runArm("B (reader grounded + EVA at the door)", relationsForGrounded, { classifyConnector });
report(B, { gated: true });

// ---- arm B2: door gated but reader blind — what the door alone catches ----
const B2 = runArm("B2 (reader blind + EVA at the door — the door's own marginal value)", relationsForBlind, { classifyConnector });
report(B2, { gated: true });

// ---- arm C: the grain question, measured not built ----
// Fold candidates over arm B's heard notes: subjects by referent face
// (cast.js's own index over the two pages), verbs by irregular-tail lemma.
const refIndex = makeReferentIndex({ splitSentences: engineSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm })(
  pages.map((p) => ({ text: p.text })),
);
const face = (s) => {
  const r = refIndex.resolve?.(s);
  return r?.display ?? r?.id ?? s.toLowerCase().replace(/\s+/g, " ").trim();
};
const lemmas = (v) => {
  const w = v.toLowerCase();
  return new Set([w, ...(morph[w] ?? [])]);
};
const sameLemma = (a, b) => {
  const A2 = lemmas(a), B2 = lemmas(b);
  for (const x of A2) if (B2.has(x)) return true;
  return false;
};

const notesB = hyperlexicon.foldHyperlexicon(B.log);
const joins = [];
for (let i = 0; i < notesB.length; i++) for (let j = i + 1; j < notesB.length; j++) {
  const a = notesB[i], b = notesB[j];
  if (a.id === b.id) continue;
  if (face(a.subject) === face(b.subject) && sameLemma(a.verb, b.verb)
      && face(a.object ?? "") === face(b.object ?? "")) {
    const wa = new Set(a.witnesses ?? []), wb = new Set(b.witnesses ?? []);
    const crossSource = [...wa].some((w) => !wb.has(w)) || [...wb].some((w) => !wa.has(w));
    joins.push({ a, b, crossSource });
  }
}
console.log(`— arm C: identity-fold candidates over arm B's ${notesB.length} notes (measured, not built)`);
console.log(`  folds found: ${joins.length} (${joins.filter((j) => j.crossSource).length} cross-source)`);
for (const j of joins) {
  console.log(`    [${j.crossSource ? "CROSS" : "within"}] "${j.a.subject}" —${j.a.verb}→ "${j.a.object}"  ~  "${j.b.subject}" —${j.b.verb}→ "${j.b.object}"`);
}
// The flagship reported pair, checked by name: does the proposed fold even
// reach it? withdraw/retreat differ at the LEMMA, not the inflection.
console.log(`  flagship pair check: sameLemma("withdraws","retreated") = ${sameLemma("withdraws", "retreated")}`);
console.log(`  (regular-inflection pairs like retreats~retreated also do not fold here — the`);
console.log(`   regular-suffix rule lives only in the absent legacy engine; reported, not hand-rolled)`);
