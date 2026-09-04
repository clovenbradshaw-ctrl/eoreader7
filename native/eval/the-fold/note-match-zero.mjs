// note-match-zero.mjs — ZERO model calls. Compare NOTES to NOTES: fold the
// cited face with the same relation reader that folded the article, then
// match the article's note against the face's own edges on subject, act
// and object — referents and acts, not a claim string against sentence
// strings. Scored against the 12 labels; the rotated end2 is the control.
// User, 2026-09-02: "it never says it literally, but can't we compare
// hypergraphical notes?"
import { readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;
const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { textFeatures } = await import(`${NATIVE}/organs/corroboration.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}/adapters/text/morphology.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8"));
const morph = morphologyFromPrior(JSON.parse(readFileSync(`${FIX}/unimorph-morphology-prior.json`, "utf8")));
const { sameAct } = createLemmatizer(morph.forms, { language: morph.language });
// VERBS=prior: the received morphology prior's verb forms join the vocabulary
// (hypergraph.js `organs.verbForms`) — a one-page face cannot recur "placed"
// or "winched" after a surface often enough to derive them; the prior
// already attests them. And the lemmatizer, so "take" reaches "took".
const formSet = (f) => { const out = new Set(); for (const [k, v] of Object.entries(f ?? {})) { out.add(String(k).toLowerCase()); for (const x of Array.isArray(v) ? v : [v]) if (typeof x === "string") out.add(x.toLowerCase()); } return out; };
// VERBS=prior: UniMorph forms alone. VERBS=both: UniMorph ∪ the POS prior's
// verb-dominant forms (UD English-EWT, share > 0.5 declared here) — UniMorph
// English is a 10k-form sample that lacks "placed", "retrieved", "launched";
// the POS prior attests all three as verbs at 100%.
const posVerbForms = (floor) => { const out = new Set(); for (const [w, att] of Object.entries(posPrior.forms ?? {})) { const t = Object.values(att).reduce((a, b) => a + b, 0); if (t > 0 && ((att.VERB ?? 0) + (att.AUX ?? 0)) / t > floor) out.add(w.toLowerCase()); } return out; };
const verbForms = process.env.VERBS === "both" ? new Set([...formSet(morph.forms), ...posVerbForms(0.5)]) : process.env.VERBS === "prior" ? formSet(morph.forms) : null;
// ACTHEAD=1: compare acts by their HEAD. S50 put the auxiliary chain INTO the
// act (`were placed`, `had been used`), which fixed the object — and left the
// act a multi-word string that exact-match and the single-form lemmatizer
// cannot meet against a one-word act (`used`, `flew`). The head is found with
// the RECEIVED POS prior's own AUX-dominant measure at the floor already
// declared for verb-dominance (0.5); no hand list of auxiliaries.
const auxDominant = (w) => { const a = posPrior.forms?.[String(w).toLowerCase()]; if (!a) return false; const t = Object.values(a).reduce((x, y) => x + y, 0); return t > 0 && (a.AUX ?? 0) / t > 0.5; };
export const headAct = (act) => { const t = String(act ?? "").trim().split(/\s+/).filter(Boolean); for (let i = t.length - 1; i >= 0; i -= 1) if (!auxDominant(t[i])) return t[i].toLowerCase(); return t.at(-1)?.toLowerCase() ?? ""; };
const priorOrgans = verbForms ? { verbForms, createLemmatizer, morphologyIndex: morph.forms, morphologyLanguage: morph.language, ...(process.env.ATTEST === "1" ? { attestedVerbs: true } : {}) } : {};
const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
  ...(process.env.FINE === "1" ? { phrasalPredicates: true } : {}),
  ...priorOrgans, // FINE=1: the verb chain rides in the act (DR5), never split with its head inside the object
});

export { reader, chunkSource, sameAct, textFeatures };
if (import.meta.main) {
const backwards = JSON.parse(readFileSync(`${HERE}results/${process.env.FROM ?? "ranke-backwards-run5-offline.json"}`, "utf8"));
const L = JSON.parse(readFileSync(`${HERE}results/slicer-labels.json`, "utf8")).labels;
const endsOf = (row) => { const m = String(row.note).match(/^(.*?) —(.*?)→ (.*)$/); return m ? { end1: m[1], label: m[2], end2: m[3] } : null; };
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const feats = (t) => [...textFeatures(t)];
const PRONOUN = /^(they|he|she|it|we|this|that|these|those|of|all of the)$/i;
const overlap = (a, b) => a.filter((w) => b.some((x) => x === w || sameAct(x, w))).length;

const labeled = Object.entries(L).filter(([, l]) => l.status.startsWith("stated")).map(([id, l]) => ({ id, l, row: backwards.real.rows.find((r) => r.id === id) })).filter((x) => x.row);
const faceEdges = new Map();
// POOL=article: the article's own passages join the face's as the corpus
// the verb vocabulary is measured over — a one-page face cannot recur a
// verb enough to derive it alone; the article already did.
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const articlePassages = process.env.POOL === "article" ? chunkSource("wikipedia-apollo-11.html", extractReadable(readFileSync(`${FIX}/wikipedia-apollo-11.html`, "utf8")).text) : [];
function edgesOf(facePath) {
  if (faceEdges.has(facePath)) return faceEdges.get(facePath);
  const text = readFileSync(`${FIX}/${facePath}`, "utf8");
  const passages = chunkSource(facePath, text);
  const rel = reader(passages, { pool: [...passages, ...articlePassages] });
  const out = (rel.edges ?? []).map((e) => ({ e, s: feats(e.end1), a: String(e.label ?? ""), o: feats(e.end2), sent: norm(e.spans?.[0]?.text ?? "") }));
  faceEdges.set(facePath, out);
  return out;
}
function match(ends, edges) {
  const s = feats(ends.end1), o = feats(ends.end2), pronoun = PRONOUN.test(ends.end1.trim());
  let best = null;
  for (const f of edges) {
    const subj = pronoun ? null : overlap(s, f.s) > 0;
    let act = f.a && (f.a.toLowerCase() === ends.label.toLowerCase() || sameAct(f.a, ends.label));
    if (!act && process.env.ACTHEAD === "1" && f.a) { const hN = headAct(ends.label), hF = headAct(f.a); act = !!hN && !!hF && (hN === hF || sameAct(hN, hF)); }
    const obj = overlap(o, [...f.o, ...f.s]);
    if (!act) continue;
    if (subj === false) continue;
    const score = (subj ? 2 : 0) + obj;
    if (obj < 1) continue;
    if (!best || score > best.score) best = { f, score, subj, obj };
  }
  return { best, pronoun };
}
const rows = [];
for (let i = 0; i < labeled.length; i += 1) {
  const { id, l, row } = labeled[i];
  const ends = endsOf(row); const edges = edgesOf(row.facePath);
  const rot = endsOf(labeled[(i + 1) % labeled.length].row);
  const real = match(ends, edges), ctl = match({ ...ends, end2: rot.end2 }, edges);
  const want = (l.sentenceText ?? []).map(norm);
  const hit = real.best ? want.includes(real.best.f.sent) : false;
  rows.push({ id, pos: l.positionInRun4, status: l.status, faceEdges: edges.length, pronoun: real.pronoun, real: real.best ? { note: `${real.best.f.e.end1} —${real.best.f.a}→ ${real.best.f.e.end2}`, sent: real.best.f.sent, score: real.best.score, subj: real.best.subj, labeled: hit } : null, control: ctl.best ? { note: `${ctl.best.f.e.end1} —${ctl.best.f.a}→ ${ctl.best.f.e.end2}`, score: ctl.best.score } : null });
  console.log(`\n# ${l.positionInRun4} · ${l.status} · face edges ${edges.length} · subject ${real.pronoun ? "PRONOUN (typed: unresolved)" : "named"}`);
  console.log(`  ARTICLE : ${ends.end1} —${ends.label}→ ${ends.end2}`);
  console.log(`  REAL    : ${real.best ? `${real.best.f.e.end1} —${real.best.f.a}→ ${real.best.f.e.end2}  [score ${real.best.score}, ${hit ? "LABELED sentence" : "not a labeled sentence"}]\n            «${real.best.f.sent.slice(0, 160)}»` : "no match"}`);
  console.log(`  CONTROL : ${ctl.best ? `${ctl.best.f.e.end1} —${ctl.best.f.a}→ ${ctl.best.f.e.end2}  [score ${ctl.best.score}]` : "no match"}   (end2 rotated: ${rot.end2.slice(0, 60)})`);
}
const n = rows.length;
console.log(`\n${n} labeled notes · real matched ${rows.filter((r) => r.real).length}, on a labeled sentence ${rows.filter((r) => r.real?.labeled).length} · control matched ${rows.filter((r) => r.control).length} · pronoun subjects ${rows.filter((r) => r.pronoun).length}`);
const { writeFileSync } = await import("node:fs");
writeFileSync(`${HERE}results/note-match-zero${process.env.FINE === "1" ? "-fine" : ""}${process.env.POOL === "article" ? "-pool" : ""}${process.env.VERBS ? "-" + process.env.VERBS : ""}${process.env.ATTEST === "1" ? "-attested" : ""}${process.env.ACTHEAD === "1" ? "-acthead" : ""}.json`, JSON.stringify(rows, null, 2));
}
