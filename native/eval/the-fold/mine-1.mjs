// eval/mine-1.mjs — MINE-1 against the house verdict reader, priority 1 of
// goldens/EXTERNAL-BENCHMARKS.md ("The Goldens").
//
// THE QUESTION. MINE-1 (Mo et al., KGGen, arXiv:2502.09956) asks: for each
// of a set of held-out articles, does the knowledge graph built from that
// article still contain the facts the article stated? The published
// protocol retrieves a local subgraph (top-8 similar nodes + 2-hop
// neighbors) and asks an LLM judge a binary yes/no per fact. This script
// runs the OTHER arm the goldens document names: swap the judge for the
// house's own mechanical instrument, hypergraph.js's five-verdict relation
// reader — the same organ that grounds a fold answer against its material,
// pointed here at someone else's essays instead of this project's own
// corpus. No training, no schema, no judge call, nothing tuned against
// this run's own score.
//
// WHAT IS NOT RUN HERE, AND WHY. The standard LLM-judge arm (embeddings +
// GPT-5 judge, per kg-gen's own _1_evaluation.py) needs an OpenAI API key
// this environment does not have configured. Rather than fake it with a
// different judge and report it as comparable to the published table, that
// arm is left unrun — a typed absence, not a silent substitution. What DOES
// run needs no key and no embedding index at all: hypergraph.js's reader
// works off the material's own discovered relation vocabulary, exactly as
// it does inside this app.
//
// THE MATERIAL. `fixtures/mine1-essays.json` — 105 essays and their 1,575
// attached facts (15 each), pulled once from the dataset MINE-1's own repo
// (github.com/stair-lab/kg-gen) points at:
// huggingface.co/datasets/kyssen/kg-gen-evaluation-essays and
// .../kg-gen-evaluation-answers, retrieved 2026-08-18. Copied into this
// fixture rather than fetched live on every run, for the same reason
// eval/measure-real-data.mjs copies its own CSV: a reproducible run reads
// the same bytes tomorrow that it read today. (The MINE-1 paper's own
// abstract says "100 articles" — the published dataset actually ships 105;
// this script reports the real count rather than trimming to match the
// paper's own rounded number.)
//
// THE SCORING RULE, DECLARED BEFORE THE RUN. `reader.read(fact)` returns one
// verdict per relation CLAIM the fact sentence contains — usually one triple
// per fact, since these are short single-clause statements, but the rule
// below is defined for the general case: a fact's own verdict is the WORST
// of its claims' verdicts, worst-first: contradicted > unbound > beyond-reach
// > unheard > bound. A fact with zero extractable claims (no subject-verb-
// object shape at all — a genuinely common shape for a plain declarative
// sentence to miss) is its own typed gap, `no_claims_extracted`, counted
// separately rather than folded into any verdict bucket. This mirrors
// exactly how relationFindings/relationsClean already treat these five
// outcomes as different facts, never a bit.
//
// Run: node eval/mine-1.mjs

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
  };
}

// worst-first, matching relationFindings'/relationsClean's own reading of
// which verdicts are findings (contradicted, unbound) versus disclosed
// limits of the instrument (beyond-reach, unheard) versus support (bound).
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
    no_vocabulary_essays: 0, // essay too short/nameless for a relation vocabulary at all
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

  console.log(`MINE-1 · house verdict reader (no judge, no embeddings, no training)`);
  console.log(`${totals.essays} essays, ${totals.facts} attached facts (${data.source})\n`);
  console.log(`essays with no measurable relation vocabulary at all: ${totals.no_vocabulary_essays}/${totals.essays}\n`);
  console.log(`of ${totals.facts} facts:`);
  console.log(`  no_claims_extracted (no SVO shape found in the fact sentence): ${totals.no_claims_extracted} (${pct(totals.no_claims_extracted, totals.facts)})`);
  console.log(`  of the ${examined} facts that DID extract at least one relation claim:`);
  console.log(`    bound         (essay binds this edge)             : ${totals.bound} (${pct(totals.bound, examined)})`);
  console.log(`    contradicted  (essay binds the opposite polarity) : ${totals.contradicted} (${pct(totals.contradicted, examined)})`);
  console.log(`    unbound       (no edge like this in the essay)    : ${totals.unbound} (${pct(totals.unbound, examined)})`);
  console.log(`    beyond-reach  (an endpoint doesn't resolve)       : ${totals["beyond-reach"]} (${pct(totals["beyond-reach"], examined)})`);
  console.log(`    unheard       (verb outside essay's own vocab)    : ${totals.unheard} (${pct(totals.unheard, examined)})`);
  console.log(`\nheadline (bound / all ${totals.facts} attached facts, MINE-1's own denominator): ${pct(totals.bound, totals.facts)}`);
  console.log(`headline (bound / ${examined} facts this reader could even read a claim from): ${pct(totals.bound, examined)}`);

  const outPath = join(here, "results", "mine-1-run.json");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(outPath, JSON.stringify({ totals, examined, perEssay }, null, 1));
  console.log(`\nfull per-essay breakdown: eval/results/mine-1-run.json`);
}

main();
