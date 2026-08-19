// eval/mine-1-unimorph-disambiguated.mjs — combining the received prior
// (UniMorph) with the material's own distributional evidence (the kind-
// induction question, answered narrowly rather than abandoned).
//
// mine-1-unimorph-RESULTS.md disclosed a real cost: ~half of spot-checked
// bound triples had a subject/verb boundary error, because English's
// noun-verb conversion means many UniMorph-tagged "verbs" (feed, play,
// serve, bias, stage...) are just as often nouns. A strict verb-only
// filter was already ruled out earlier (too few unambiguous words
// survive). This tries the middle path: for a word UniMorph tags BOTH N
// and V, don't just trust the tag — ask this ESSAY's own distribution
// whether it is acting as a verb here. The cheapest real signal
// available without a POS tagger: a verb is rarely immediately preceded
// by a determiner ("the article", not "the migrate"); a noun usually is.
// Admit an ambiguous word only when its non-determiner-preceded
// occurrences in THIS essay outnumber its determiner-preceded ones.
// Unambiguous UniMorph verbs (never tagged N) are admitted unconditionally,
// exactly as in the prior pass.
//
// This is computed PER ESSAY (a different verbForms Set per document,
// built from that document's own local counts) rather than a static global
// Set — hypergraph.js needed no changes for this: `verbForms` was already
// just a Set the caller builds, so building a smarter one per call is
// this eval script's job, not the tier's.
//
// Run: node eval/mine-1-unimorph-disambiguated.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { makeRelationReader } from "../hypergraph.js";

const here = dirname(fileURLToPath(import.meta.url));

async function organs() {
  const { splitSentences } = await import("../../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/material.js"
  );
  const { DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/priors.js"
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
    DEFINITE_DETERMINERS,
    INDEFINITE_DETERMINERS,
  };
}

const VERDICT_RANK = { contradicted: 0, unbound: 1, "beyond-reach": 2, unheard: 3, bound: 4 };
function factVerdict(claims) {
  if (!claims.length) return "no_claims_extracted";
  let worst = claims[0].verdict;
  for (const c of claims) if (VERDICT_RANK[c.verdict] < VERDICT_RANK[worst]) worst = c.verdict;
  return worst;
}

/** Every recurring word (>=2 sentence arrivals, function words excluded)
 * that is a known UniMorph verb form, admitted unconditionally when
 * UniMorph never also tags it a noun, admitted conditionally when it does
 * — only if this essay's own local counts show it acting as a verb more
 * than as a noun. */
function disambiguatedVerbForms(text, { splitSentences, tokenize, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, commonTerms }, VERB_SET, AMBIGUOUS_SET) {
  const isDet = (w) => DEFINITE_DETERMINERS.has(w) || INDEFINITE_DETERMINERS.has(w);
  const sentences = splitSentences(text);
  const chunks = sentences.map((s) => ({ terms: new Set(tokenize(typeof s === "string" ? s : s?.text ?? "")) }));
  const functionWords = commonTerms(chunks);

  const arrivals = new Map();
  const detBefore = new Map();
  const notDetBefore = new Map();
  for (const s of sentences) {
    const sText = typeof s === "string" ? s : s?.text ?? "";
    const toks = tokenize(sText);
    const seen = new Set();
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      if (w.length < 3 || functionWords.has(w)) continue;
      if (!seen.has(w)) {
        arrivals.set(w, (arrivals.get(w) ?? 0) + 1);
        seen.add(w);
      }
      if (i > 0 && isDet(toks[i - 1])) detBefore.set(w, (detBefore.get(w) ?? 0) + 1);
      else notDetBefore.set(w, (notDetBefore.get(w) ?? 0) + 1);
    }
  }

  const forms = new Set();
  for (const [w, n] of arrivals) {
    if (n < 2 || !VERB_SET.has(w)) continue;
    if (!AMBIGUOUS_SET.has(w)) {
      forms.add(w);
      continue;
    }
    const det = detBefore.get(w) ?? 0;
    const notDet = notDetBefore.get(w) ?? 0;
    if (notDet > det) forms.add(w);
  }
  return forms;
}

async function main() {
  const data = JSON.parse(readFileSync(join(here, "fixtures", "mine1-essays.json"), "utf8"));
  const verbFormsList = JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-verb-forms.json"), "utf8"));
  const ambiguousList = JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-ambiguous-nv.json"), "utf8"));
  const VERB_SET = new Set(verbFormsList);
  const AMBIGUOUS_SET = new Set(ambiguousList);
  const { commonTerms } = await import("../cite.js");

  const base = { ...(await organs()), commonTerms };

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
    const verbForms = disambiguatedVerbForms(ex.content, base, VERB_SET, AMBIGUOUS_SET);
    const essayReader = makeRelationReader({ ...base, verbForms });
    const built = essayReader(passages);
    const essayRow = {
      idx: ex.idx,
      topic: ex.topic,
      facts: ex.facts.length,
      vocabularyVerbs: built.examined ? built.vocabulary.verbs : 0,
      verdicts: {},
    };

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

  console.log(`MINE-1 · UniMorph vocabulary, ambiguous (N+V) words disambiguated by local determiner-adjacency`);
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

  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(here, "results", "mine-1-unimorph-disambiguated-run.json"), JSON.stringify({ totals, examined, perEssay }, null, 1));
  console.log(`\nfull per-essay breakdown: eval/results/mine-1-unimorph-disambiguated-run.json`);
}

main();
