// eval/mine-1-referent-anchored.mjs — possibility (UniMorph) x probability
// grounded in REFERENTS, not bare-span statistics.
//
// mine-1-unimorph-disambiguated-RESULTS.md found that scoring an ambiguous
// word by its own decontextualized distributional behavior (determiner-
// adjacency, pooled or local) has no real discriminating power — the
// feature isn't sensitive to grammatical category, only to superficial
// regularities that correlate with it inconsistently. The reframe: words
// don't mean things as bare spans; they point at referents. So instead of
// asking "what does this WORD usually do," ask "in THIS material, does
// this word sit immediately after something already established as a
// REFERENT" — discoverRelationVocab already asks exactly that question,
// today only for NAMED surfaces (cast.js), which is why it starves on
// concept essays. This feeds it NAMED + FORM referents (the same
// recurring-content-word identity hypergraph.js's subject-identity fix
// already computes) as anchors, then intersects the resulting candidates
// with UniMorph's possibility gate. Necessary (UniMorph) then sufficient
// (referent-anchored within the material), not one heuristic doing both.
//
// Run: node eval/mine-1-referent-anchored.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { makeRelationReader } from "../hypergraph.js";
import { makeReferentIndex } from "../cast.js";
import { commonTerms } from "../cite.js";

const here = dirname(fileURLToPath(import.meta.url));

const FORM_MIN_ARRIVALS = 2; // same structural minimum hypergraph.js's own forms use

async function organs() {
  const { splitSentences } = await import("../../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../../eoreader6.1/packages/engine/perceiver/text/material.js");
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize };
}

function formsOf(text, { splitSentences, tokenize }, functionWords) {
  const arrivals = new Map();
  for (const s of splitSentences(text)) {
    const sText = typeof s === "string" ? s : s?.text ?? "";
    const seen = new Set();
    for (const t of tokenize(sText)) {
      if (t.length < 3 || functionWords?.has(t)) continue;
      if (!seen.has(t)) { arrivals.set(t, (arrivals.get(t) ?? 0) + 1); seen.add(t); }
    }
  }
  const forms = new Set();
  for (const [w, n] of arrivals) if (n >= FORM_MIN_ARRIVALS) forms.add(w);
  return forms;
}

const VERDICT_RANK = { contradicted: 0, unbound: 1, "beyond-reach": 2, unheard: 3, bound: 4 };
function factVerdict(claims) {
  if (!claims.length) return "no_claims_extracted";
  let worst = claims[0].verdict;
  for (const c of claims) if (VERDICT_RANK[c.verdict] < VERDICT_RANK[worst]) worst = c.verdict;
  return worst;
}

async function main() {
  const data = JSON.parse(readFileSync(join(here, "fixtures", "mine1-essays.json"), "utf8"));
  const verbFormsList = JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-verb-forms.json"), "utf8"));
  const VERB_SET = new Set(verbFormsList);

  const base = await organs();
  const { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, tokenize } = base;
  const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });

  const totals = {
    essays: data.examples.length,
    facts: 0,
    no_vocabulary_essays: 0,
    bound: 0,
    contradicted: 0,
    unbound: 0,
    "beyond-reach": 0,
    unheard: 0,
    no_claims_extracted: 0,
  };
  const perEssay = [];

  for (const ex of data.examples) {
    const text = ex.content;
    const passages = [{ ref: `mine1:${ex.idx}#0`, text }];

    const index = indexFor(passages);
    const namedSurfaces = [...new Set(index.events.map((e) => e.surface))];
    const chunks = splitSentences(text).map((s) => ({ terms: new Set(tokenize(typeof s === "string" ? s : s?.text ?? "")) }));
    const fw = commonTerms(chunks);
    const forms = formsOf(text, base, fw);
    const anchors = [...new Set([...namedSurfaces, ...forms])];

    let verbForms = new Set();
    if (anchors.length) {
      try {
        const { verbs } = discoverRelationVocab(text, { surfaces: anchors, functionWords: fw, minSurfaces: 1 });
        for (const v of verbs) if (VERB_SET.has(v)) verbForms.add(v);
      } catch {
        verbForms = new Set();
      }
    }

    const essayReader = makeRelationReader({ ...base, verbForms });
    const built = essayReader(passages);
    const essayRow = { idx: ex.idx, topic: ex.topic, facts: ex.facts.length, vocabularyVerbs: built.examined ? built.vocabulary.verbs : 0, verdicts: {} };

    if (!built.examined || !built.vocabulary.verbs) {
      totals.no_vocabulary_essays++;
      totals.facts += ex.facts.length;
      totals.no_claims_extracted += ex.facts.length;
      essayRow.verdicts.no_claims_extracted = ex.facts.length;
      perEssay.push(essayRow);
      continue;
    }

    for (const fact of ex.facts) {
      const report = built.read(fact);
      const v = factVerdict(report.claims);
      totals.facts++;
      totals[v] = (totals[v] ?? 0) + 1;
      essayRow.verdicts[v] = (essayRow.verdicts[v] ?? 0) + 1;
    }
    perEssay.push(essayRow);
  }

  const examined = totals.facts - totals.no_claims_extracted;
  const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");

  console.log(`MINE-1 · UniMorph (possibility) x referent-anchored discoverRelationVocab (probability, named+form)`);
  console.log(`${totals.essays} essays, ${totals.facts} attached facts\n`);
  console.log(`essays with no measurable relation vocabulary at all: ${totals.no_vocabulary_essays}/${totals.essays}\n`);
  console.log(`of ${totals.facts} facts:`);
  console.log(`  no_claims_extracted: ${totals.no_claims_extracted} (${pct(totals.no_claims_extracted, totals.facts)})`);
  console.log(`  of the ${examined} facts that DID extract at least one relation claim:`);
  console.log(`    bound         : ${totals.bound} (${pct(totals.bound, examined)})`);
  console.log(`    contradicted  : ${totals.contradicted} (${pct(totals.contradicted, examined)})`);
  console.log(`    unbound       : ${totals.unbound} (${pct(totals.unbound, examined)})`);
  console.log(`    beyond-reach  : ${totals["beyond-reach"]} (${pct(totals["beyond-reach"], examined)})`);
  console.log(`    unheard       : ${totals.unheard} (${pct(totals.unheard, examined)})`);
  console.log(`\nheadline (bound / all ${totals.facts} attached facts): ${pct(totals.bound, totals.facts)}`);
  console.log(`headline (bound / ${examined} facts this reader could even read a claim from): ${pct(totals.bound, examined)}`);

  writeFileSync(join(here, "results", "mine-1-referent-anchored-run.json"), JSON.stringify({ totals, examined, perEssay }, null, 1));
  console.log(`\nfull per-essay breakdown: eval/results/mine-1-referent-anchored-run.json`);
}

main();
