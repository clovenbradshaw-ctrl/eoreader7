// eval/mine-1-span-role.mjs — possibility (UniMorph) x probability resolved
// INSTANCE BY INSTANCE, not by a bare-span statistic.
//
// mine-1-unimorph-disambiguated-RESULTS.md and the priors-pooled/extractor-
// rate checks that followed it all scored the same thing: a WORD's type-
// level behavior, aggregated across every occurrence, then applied
// uniformly to every occurrence of that word in an essay. Calibrated
// against real control words, none of them separated "but"/"more" (UniMorph
// false positives) from genuine noun-verb conversion words at all — the
// features weren't insensitive to grammatical category, they just weren't
// asking a question with an answer.
//
// eoreader6.1's own prior research (scripts/experiments/FINDINGS.md, a
// stripped-out but findable line of work) already diagnosed exactly this
// shape of mistake for a related problem (agent-role resolution) and named
// the fix: "a surface span is never the thing with a part of speech — the
// referent is." The honest state before enough context has arrived is
// superposition, resolved per OCCURRENCE, never an averaged tag over every
// use a word has ever had.
//
// packages/engine/perceiver/text/roles.js (new, this pass) is the general
// mechanism: causal, one-hop activation recall (emergence/activation.js,
// reused unmodified — the same organ pronouns.js already trusts for an
// analogous problem, referent identity) resolving which of N declared
// roles a span occupies, refusing below declared floors rather than
// guessing. It has no notion of "verb" anywhere in it — role is a
// caller-declared label. This file supplies the ONLY NL-specific, verb-
// specific part: which occurrences are known evidence (UniMorph-
// unambiguous verbs and nouns) and which are unknown (UniMorph-ambiguous
// words needing per-occurrence resolution).
//
// Run: node eval/mine-1-span-role.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { makeRelationReader } from "../hypergraph.js";

const here = dirname(fileURLToPath(import.meta.url));

// roles.js has no real production caller yet, so there is no validated
// operating point to restate — the same honest debt host/corpus.js already
// discloses for pronouns.js's identical mechanism ("an engineering
// starting point, not yet validated against a retrieval-quality golden").
// Reusing corpus.js's own declared numbers rather than inventing a fresh
// pair: these are the only real "how much one-hop recall counts as a real
// echo" values this codebase has ever committed to for this exact
// mechanism, and reusing a standing number is more honest than a fresh
// guess that would be indistinguishable from tuning against this run's own
// score. Declared here, once, BEFORE this script was ever run against
// MINE-1's facts.
const SPAN_ROLE_OPTS = { minActivation: 0.05, minMargin: 0.2 };

async function organs() {
  const { splitSentences } = await import("../../eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../../eoreader6.1/packages/engine/perceiver/text/material.js");
  const { resolveSpanRole } = await import("../../eoreader6.1/packages/engine/perceiver/text/roles.js");
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize, resolveSpanRole, splitSentencesReal: splitSentences };
}

const VERDICT_RANK = { contradicted: 0, unbound: 1, "beyond-reach": 2, unheard: 3, bound: 4 };
function factVerdict(claims) {
  if (!claims.length) return "no_claims_extracted";
  let worst = claims[0].verdict;
  for (const c of claims) if (VERDICT_RANK[c.verdict] < VERDICT_RANK[worst]) worst = c.verdict;
  return worst;
}

/**
 * Locate every occurrence of a watched word in the essay, tagged as KNOWN
 * evidence (unambiguous verb or noun, per UniMorph) or UNKNOWN (ambiguous,
 * needs resolveSpanRole's own per-occurrence judgment). Recurrence
 * discipline is not reimplemented here — activation.js's own sparse-coding
 * gate (codeOf: distinctive AND already-recurring) already refuses to let
 * a hapax become a usable cue, the identical structural floor this
 * project's FORM_MIN_ARRIVALS elsewhere restates by hand for a mechanism
 * that has no such gate of its own.
 */
function locateOccurrences(sentences, tokenize, UNAMBIGUOUS_VERB_SET, NOUN_ONLY_SET, AMBIGUOUS_SET) {
  const occurrences = [];
  const byId = new Map();
  let seq = 0;
  for (const sentence of sentences) {
    for (const t of tokenize(sentence.text)) {
      let role = null;
      if (AMBIGUOUS_SET.has(t)) role = null;
      else if (UNAMBIGUOUS_VERB_SET.has(t)) role = "verb";
      else if (NOUN_ONLY_SET.has(t)) role = "non-verb";
      else continue;
      const id = `o${seq++}`;
      const occ = { sentenceOrder: sentence.order, role, id };
      occurrences.push(occ);
      byId.set(id, t);
    }
  }
  return { occurrences, byId };
}

async function main() {
  const data = JSON.parse(readFileSync(join(here, "fixtures", "mine1-essays.json"), "utf8"));
  const verbFormsList = JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-verb-forms.json"), "utf8"));
  const ambiguousList = JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-ambiguous-nv.json"), "utf8"));
  const nounOnlyList = JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-noun-only.json"), "utf8"));
  const VERB_SET = new Set(verbFormsList);
  const AMBIGUOUS_SET = new Set(ambiguousList);
  const NOUN_ONLY_SET = new Set(nounOnlyList);
  const UNAMBIGUOUS_VERB_SET = new Set([...VERB_SET].filter((w) => !AMBIGUOUS_SET.has(w)));

  const base = await organs();
  const { splitSentences, tokenize, resolveSpanRole } = base;

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
  const resolutionTotals = { verb: 0, "non-verb": 0, role_no_candidate: 0, role_below_floor: 0, role_no_margin: 0 };

  for (const ex of data.examples) {
    const text = ex.content;
    const passages = [{ ref: `mine1:${ex.idx}#0`, text }];

    const sentences = splitSentences(text);
    const { occurrences, byId } = locateOccurrences(sentences, tokenize, UNAMBIGUOUS_VERB_SET, NOUN_ONLY_SET, AMBIGUOUS_SET);
    const { bindings, gaps } = resolveSpanRole(sentences, occurrences, SPAN_ROLE_OPTS);

    for (const b of bindings) resolutionTotals[b.role] = (resolutionTotals[b.role] ?? 0) + 1;
    for (const g of gaps) resolutionTotals[g.reason] = (resolutionTotals[g.reason] ?? 0) + 1;

    // Bridge to the essay-scoped verbForms Set hypergraph.js's extractRelations
    // actually consumes (a flat vocabulary, not per-occurrence) — a real,
    // disclosed narrowing of what resolveSpanRole gives us: an ambiguous
    // word is admitted for the WHOLE essay if AT LEAST ONE of its own
    // occurrences resolved to "verb" with real activation. Collapsing
    // instance-level judgments back to a type-level Set is exactly the
    // move this file's own header calls out as the wrong question in
    // general — done here only because the current consumer has no
    // per-occurrence API, named as a limitation in the write-up, not
    // silently assumed harmless.
    const resolvedVerb = new Set();
    for (const b of bindings) {
      if (b.role !== "verb") continue;
      const word = byId.get(b.id);
      if (word) resolvedVerb.add(word);
    }
    const essayVerbForms = new Set();
    for (const t of tokenize(text)) {
      if (UNAMBIGUOUS_VERB_SET.has(t)) essayVerbForms.add(t);
      else if (resolvedVerb.has(t)) essayVerbForms.add(t);
    }

    const essayReader = makeRelationReader({ ...base, verbForms: essayVerbForms });
    const built = essayReader(passages);
    const essayRow = {
      idx: ex.idx,
      topic: ex.topic,
      facts: ex.facts.length,
      vocabularyVerbs: built.examined ? built.vocabulary.verbs : 0,
      ambiguousOccurrences: occurrences.filter((o) => o.role === null).length,
      resolvedVerb: bindings.filter((b) => b.role === "verb").length,
      resolvedNonVerb: bindings.filter((b) => b.role === "non-verb").length,
      unresolved: gaps.length,
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

  console.log(`MINE-1 · instance-level span-role resolution (roles.js) over UniMorph-ambiguous words`);
  console.log(`${totals.essays} essays, ${totals.facts} attached facts\n`);
  console.log(`per-occurrence resolution across all essays:`, resolutionTotals);
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

  writeFileSync(join(here, "results", "mine-1-span-role-run.json"), JSON.stringify({ totals, resolutionTotals, examined, perEssay }, null, 1));
  console.log(`\nfull per-essay breakdown: eval/results/mine-1-span-role-run.json`);
}

main();
