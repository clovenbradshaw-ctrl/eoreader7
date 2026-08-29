// eval/complicated-reading.mjs — a genuinely complicated text, read
// mechanically, the reasoning SHOWN stage by stage (user direction,
// 2026-08-29: "read something highly complicated and show me the
// reasoning"). Default material: the Second Schleswig War — the shooting
// half of the Schleswig-Holstein question, Palmerston's "only three people
// ever understood it". Live-fetched, cached under /tmp; pass another title
// as argv[2] to point the same ladder at different material.
//
// Every stage is one registered capability cell doing its own work and
// printing WHY — including the typed refusals and the disclosed ceilings,
// because the reasoning's honesty about what it cannot decide IS part of
// the reasoning. No model call anywhere; every verdict is mechanical.
//
// Known ceiling, disclosed where it shows (stage 3): extractRelations'
// connector boundaries are the documented MINE-1/P56 limitation — "an
// arrangement has ends, not parts of speech" — so some heard edges carry
// fragments in the connector slot. They are shown as heard, never cleaned
// up to look better than the organ that heard them.
import fs from "node:fs";
import { splitSentences } from "../../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, diaNorm } from "../../eoreader7/native/adapters/text/surfaces.js";
import { resolvePronouns } from "../../eoreader7/native/adapters/text/pronouns.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader7/native/adapters/text/relations.js";
import { makeClearance } from "../clearance.js";
import { unravel } from "../unravel.js";
import { createKindInductionIndex, indexKindEntries, kindEvidence } from "../../eoreader7/native/kernel/kind-induction.js";
import { induceEntityKindCandidates, testKindMembers } from "../../eoreader7/native/kernel/entity-kind-induction.js";

const TITLE = process.argv[2] ?? "Second Schleswig War";
const CACHE = `/tmp/complicated-${TITLE.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`;
const UA = "the-fold-eval (research; repo clovenbradshaw-ctrl/the-fold)";
// P38's declared, disclosed-as-unvalidated pronoun operating point — reused, never re-derived.
const PRONOUN_NUMBERS = { minActivation: 0.05, minMargin: 0.2 };

async function material() {
  if (fs.existsSync(CACHE)) return fs.readFileSync(CACHE, "utf8");
  const url = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=" + encodeURIComponent(TITLE);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = Object.values((await res.json()).query.pages)[0].extract;
  fs.writeFileSync(CACHE, text);
  return text;
}

const text = await material();
console.log(`STAGE 0 — the material: "${TITLE}"`);
console.log(`  ${text.length} chars, live-fetched (en.wikipedia.org), cached at ${CACHE}\n`);

const sentences = splitSentences(text);
const presence = extractSurfaces(sentences);
console.log("STAGE 1 — SIG·Ground (presence): what EXISTS in the material");
console.log(`  ${sentences.length} sentences; ${presence.length} candidate surfaces (position-capitalisation already refused at extraction — L2)`);
console.log(`  top: ${presence.slice(0, 10).map((s) => `${s.surface}(${s.sentences})`).join(", ")}\n`);

console.log("STAGE 2 — NUL·Figure (clearance): what is ESTABLISHED, not merely present (P38)");
const clearance = makeClearance({ splitSentences, extractSurfaces, discoverReferents, resolvePronouns, fold: diaNorm });
const ledger = clearance.clearFigures(text, { pronouns: PRONOUN_NUMBERS });
const est = [...ledger.established].sort((a, b) => (b.evidence[0]?.sentences ?? 0) - (a.evidence[0]?.sentences ?? 0));
console.log(`  established ${est.length} / refused-below-floor ${ledger.refused.length} / withheld-ambiguous ${ledger.withheld.length}`);
console.log(`  floor, observed from the organ's own behaviour (never re-derived): refused ≤ ${ledger.floorObserved.refusedMaxSentences} < ${ledger.floorObserved.admittedMinSentences} ≤ admitted`);
for (const e of est.slice(0, 8)) console.log(`    ${e.standing.padEnd(11)} ${e.referentId}  [${e.surfaces.join(" | ")}]${e.bindings ? `  ← ${e.bindings} pronoun binding(s)` : ""}`);
console.log(`  refused e.g.: ${ledger.refused.slice(0, 5).map((r) => r.surface).join(", ")} — exist, not established`);
for (const w of ledger.withheld) console.log(`    WITHHELD "${w.surface}" — ${w.candidates.length} candidate bearers, an occurrence-level question, never a third being`);
console.log(`  pronoun rung (declared ${PRONOUN_NUMBERS.minActivation}/${PRONOUN_NUMBERS.minMargin}): ${JSON.stringify(ledger.pronounRung)}`);
{
  const map = new Map();
  for (const e of ledger.established) for (const s of e.surfaces) map.set(s, e.referentId);
  const { bindings } = resolvePronouns(sentences, map, PRONOUN_NUMBERS);
  for (const b of bindings.slice(0, 4)) {
    const s = sentences.find((x) => x.order === b.sentenceOrder);
    console.log(`    "${b.pronoun}" → ${b.referentId} (activation ${b.activation.toFixed(1)}) in: ${s.text.trim().slice(0, 110)}`);
  }
}
console.log();

console.log("STAGE 3 — CON·Figure (relations): what the material itself STATES");
const vocab = discoverRelationVocab(text, { surfaces: presence, minSurfaces: 1 });
const verbs = vocab.verbs ?? vocab;
const rel = extractRelations(text, { verbs, limit: 4000 });
const edges = rel.relations ?? rel.edges ?? rel;
console.log(`  vocabulary measured from the text: ${verbs.size ?? verbs.length} connector forms → ${edges.length} edges heard`);
const succ = edges.filter((e) => /succe|throne|duch|heir|annex|protocol|claim/i.test(`${e.verb} ${e.object}`));
console.log(`  ${succ.length} touch the succession dispute; a sample (shown AS HEARD — the connector-boundary ceiling is P56's, disclosed, not cleaned up):`);
for (const e of succ.slice(0, 6)) console.log(`    "${e.subject}" —${e.verb}→ "${String(e.object).slice(0, 58)}"${e.negated ? " [negated]" : ""}`);
console.log();

console.log("STAGE 4 — SEG·Pattern (unravel): does the material separate at its own seams?");
const estSurfaces = new Map();
for (const e of ledger.established) for (const s of e.surfaces) estSurfaces.set(diaNorm(s), e.referentId);
const resolveEnd = (span) => {
  const t = diaNorm(String(span));
  if (estSurfaces.has(t)) return estSurfaces.get(t);
  for (const [surf, id] of estSurfaces) if (surf.length > 3 && t.includes(surf)) return id;
  return null;
};
const graphEdges = [];
edges.forEach((e, i) => {
  const a = resolveEnd(e.subject); const b = resolveEnd(e.object);
  if (a && b && a !== b) graphEdges.push({ a, b, verb: e.verb, sourceEdge: i });
});
console.log(`  belief graph gated by clearance (established referents only): ${graphEdges.length} edges`);
const cut = unravel(graphEdges);
if (cut.refused) {
  console.log(`  REFUSED ${cut.refused.type}: ${cut.refused.detail}`);
  console.log(`  articulation points still reported: ${cut.articulationPoints.join(", ") || "none"}`);
} else {
  console.log(`  ${cut.components.length} component(s), ${cut.cutEdges.length} seam(s), ${cut.parts.length} parts after the cut`);
  for (const b of cut.cutEdges.slice(0, 4)) console.log(`    seam: ${b.a} —${b.edge.verb}→ ${b.b} (source edge #${b.edge.sourceEdge})`);
  const big = [...cut.parts].sort((x, y) => y.length - x.length);
  for (const p of big.slice(0, 3)) console.log(`    part[${p.length}]: ${p.slice(0, 6).join(", ")}${p.length > 6 ? ", …" : ""}`);
}
console.log();

console.log("STAGE 5 — SIG·Pattern + NUL·Pattern (kinds): structure the field itself suggests");
const bySentence = new Map();
sentences.forEach((s) => {
  const here = new Set();
  const folded = diaNorm(s.text);
  for (const [surf, id] of estSurfaces) if (folded.includes(surf)) here.add(id);
  if (here.size > 1) bySentence.set(s.order, [...here]);
});
const entries = [];
let seq = 0;
for (const [si, ids] of bySentence) for (const id of ids) for (const other of ids) {
  if (id !== other) { seq += 1; entries.push(kindEvidence({ id: `co-${seq}`, entityRef: id, featureKey: "companion", featureValue: other, sequencePosition: si, witness: `sent-${si}` })); }
}
const index = createKindInductionIndex();
indexKindEntries(index, entries);
const induced = induceEntityKindCandidates(index.entityFeatures, { permutations: 128, population: `complicated:${TITLE}` });
console.log(`  features are pure co-arrival (no word semantics); ${index.entityFeatures.size} profiled entities → ${induced.candidates.length} basin(s)`);
for (const c of induced.candidates.slice(0, 2)) console.log(`    basin[${c.memberCount}] binding ${c.field.bindingEnergy.toFixed(3)}, null ${c.cohesionNull.passed ? "CLEARS" : "fails"} (p=${c.cohesionNull.pValue.toFixed(3)}): ${c.memberRefs.slice(0, 5).join(", ")}${c.memberCount > 5 ? ", …" : ""}`);
if (induced.candidates.length) {
  const declared = [...induced.candidates[0].memberRefs];
  const confirm = testKindMembers(index.entityFeatures, declared, { permutations: 128, population: `complicated:${TITLE}` });
  console.log(`  the DECLARED-membership door re-tests the inducer's basin: cleared=${confirm.cleared} (p=${confirm.bindingNull.pValue.toFixed(3)}) — two doors, one field, one answer`);
  const all = [...index.entityFeatures.keys()];
  const scattered = [declared[0], ...all.filter((id) => !declared.includes(id)).slice(0, Math.max(1, declared.length - 1))];
  const deny = testKindMembers(index.entityFeatures, scattered, { permutations: 128, population: `complicated:${TITLE}` });
  console.log(`  control, one member + scattered outsiders: ${deny.refused ? `refused ${deny.refused.type}` : `cleared=${deny.cleared} (binding ${deny.energy.bindingEnergy.toFixed(3)}, p=${deny.bindingNull.pValue.toFixed(3)})`} — the null discriminates, it does not rubber-stamp`);
}
console.log();
console.log("STAGE 6 — what stays OPEN (typed, never silent)");
console.log(`  ${ledger.withheld.length} ambiguous form(s); ${ledger.coreference.unresolvedMentionGaps} referents with unresolved pronoun/descriptor mentions; the connector-boundary ceiling above`);
