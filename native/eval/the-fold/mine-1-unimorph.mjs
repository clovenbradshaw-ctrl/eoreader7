// eval/mine-1-unimorph.mjs — MINE-1 with vocabulary widened by UniMorph.
//
// Identical protocol to eval/mine-1.mjs (same fixture, same scoring rule,
// declared before this run and unchanged after) with ONE difference:
// hypergraph.js's `verbForms` organ is wired to a received morphological
// prior — UniMorph's English inflection table (github.com/unimorph/eng,
// Kirov et al., retrieved 2026-08-19), every surface form UniMorph tags
// V;... — instead of anchoring vocabulary discovery on capitalized
// surfaces alone. See hypergraph.js's own header comment on `verbForms`
// for why this widening bypasses discoverRelationVocab's anchoring step
// entirely rather than feeding it, and eval/results/mine-1-next-steps.md
// for the two anchor-widening attempts that were tried and rejected first.
//
// Run: node eval/mine-1-unimorph.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { makeRelationReader } from "../hypergraph.js";

const here = dirname(fileURLToPath(import.meta.url));

async function organs() {
  const { splitSentences } = await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(
    "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js"
  );
  const verbFormsList = JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-verb-forms.json"), "utf8"));
  return {
    splitSentences,
    extractSurfaces,
    discoverReferents,
    namesCorefer,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize,
    buildFrequencyTable,
    functionWordSet,
    verbForms: new Set(verbFormsList),
  };
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
  const reader = makeRelationReader(await organs());

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
    const passages = [{ ref: `mine1:${ex.idx}#0`, text: ex.content }];
    const built = reader(passages);
    const essayRow = {
      idx: ex.idx,
      topic: ex.topic,
      facts: ex.facts.length,
      vocabularyVerbs: built.examined ? built.vocabulary.verbs : 0,
      edges: built.examined ? built.edges.length : 0,
      verdicts: {},
    };

    if (!built.examined || !built.vocabulary.verbs) {
      totals.no_vocabulary_essays++;
      totals.facts += ex.facts.length;
      totals.no_claims_extracted += ex.facts.length;
      essayRow.verdicts.no_claims_extracted = ex.facts.length;
      essayRow.gap = "no relation vocabulary could be measured from this essay";
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

  console.log(`MINE-1 · house verdict reader + UniMorph-widened vocabulary`);
  console.log(`${totals.essays} essays, ${totals.facts} attached facts\n`);
  console.log(`essays with no measurable relation vocabulary at all: ${totals.no_vocabulary_essays}/${totals.essays}\n`);
  console.log(`of ${totals.facts} facts:`);
  console.log(`  no_claims_extracted (no SVO shape found in the fact sentence): ${totals.no_claims_extracted} (${pct(totals.no_claims_extracted, totals.facts)})`);
  console.log(`  of the ${examined} facts that DID extract at least one relation claim:`);
  console.log(`    bound         (essay binds this edge)             : ${totals.bound} (${pct(totals.bound, examined)})`);
  console.log(`    contradicted  (essay binds the opposite polarity) : ${totals.contradicted} (${pct(totals.contradicted, examined)})`);
  console.log(`    unbound       (no edge like this in the essay)    : ${totals.unbound} (${pct(totals.unbound, examined)})`);
  console.log(`    beyond-reach  (an endpoint doesn't resolve)       : ${totals["beyond-reach"]} (${pct(totals["beyond-reach"], examined)})`);
  console.log(`    unheard       (verb outside essay's own vocab)    : ${totals.unheard} (${pct(totals.unheard, examined)})`);
  console.log(`\nheadline (bound / all ${totals.facts} attached facts): ${pct(totals.bound, totals.facts)}`);
  console.log(`headline (bound / ${examined} facts this reader could even read a claim from): ${pct(totals.bound, examined)}`);

  const outPath = join(here, "results", "mine-1-unimorph-run.json");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(outPath, JSON.stringify({ totals, examined, perEssay }, null, 1));
  console.log(`\nfull per-essay breakdown: eval/results/mine-1-unimorph-run.json`);
}

main();
