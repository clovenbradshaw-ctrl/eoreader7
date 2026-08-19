// eval/mine-1-layered.mjs — proper layering of tonight's sub-assemblies,
// instead of treating them as competing whole-pipeline alternatives.
//
// Each layer built tonight is a STABLE, independently-verified sub-assembly
// with its own honest failure mode:
//   L1  unambiguous UniMorph verbs         — always safe, zero cost, low recall alone
//   L2  ALL UniMorph-ambiguous words       — maximizes recall (closes no_claims_extracted
//                                             from 65.9% to 12.0%), but ships real
//                                             boundary errors (~half, spot-checked) and
//                                             2 known contradiction cases ("but", "more")
//   L3  resolveSpanRole, instance-level    — the cleanest precision of anything tried
//       causal activation recall             (0 contradictions), but too conservative
//                                             for essay-scale material to use as a GATE
//                                             (verb:0 resolved essay-wide — the RELATIVE
//                                             evidence density this mechanism needs
//                                             (activation.js's own recurrence floor)
//                                             is essay-scale-relative, not fixed, and
//                                             essays mostly don't clear it for "verb")
//
// The mistake in every attempt before this one: using L3 as a GATE (admit
// only what resolves to "verb") throws away L2's recall wherever L3 has no
// opinion (the overwhelming majority of occurrences — 20,559/21,500 gaps).
// L3's real, checked signal is not "which words are verbs" (too sparse to
// answer) — it is "which words this essay's own vocabulary structure
// actively argues AGAINST being verbs" (941 real non-verb resolutions,
// real activation, essay-relative). That is a NEGATIVE filter, not a
// positive one, and it is exactly targeted at the class of case that broke
// L2: does "more" (crypto essay) or "but" (laughter essay) — L2's own two
// known contradiction sources — ever resolve to non-verb here?
//
// L4 (this file): L2's recall, MINUS any ambiguous word L3 found real,
// essay-relative counter-evidence against (resolved non-verb at least
// once, never resolved verb). A word L3 has no opinion on at all (the
// common case) keeps L2's permissive default — L3's silence is not
// evidence, and is never read as one.
//
// Run: node eval/mine-1-layered.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { makeRelationReader } from "../hypergraph.js";

const here = dirname(fileURLToPath(import.meta.url));
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
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize, resolveSpanRole };
}

const VERDICT_RANK = { contradicted: 0, unbound: 1, "beyond-reach": 2, unheard: 3, bound: 4 };
function factVerdict(claims) {
  if (!claims.length) return "no_claims_extracted";
  let worst = claims[0].verdict;
  for (const c of claims) if (VERDICT_RANK[c.verdict] < VERDICT_RANK[worst]) worst = c.verdict;
  return worst;
}

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
      occurrences.push({ sentenceOrder: sentence.order, role, id });
      byId.set(id, t);
    }
  }
  return { occurrences, byId };
}

async function main() {
  const data = JSON.parse(readFileSync(join(here, "fixtures", "mine1-essays.json"), "utf8"));
  const VERB_SET = new Set(JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-verb-forms.json"), "utf8")));
  const AMBIGUOUS_SET = new Set(JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-ambiguous-nv.json"), "utf8")));
  const NOUN_ONLY_SET = new Set(JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-noun-only.json"), "utf8")));
  const UNAMBIGUOUS_VERB_SET = new Set([...VERB_SET].filter((w) => !AMBIGUOUS_SET.has(w)));

  const base = await organs();
  const { splitSentences, tokenize, resolveSpanRole } = base;

  const totals = { essays: data.examples.length, facts: 0, no_vocabulary_essays: 0, bound: 0, contradicted: 0, unbound: 0, "beyond-reach": 0, unheard: 0, no_claims_extracted: 0 };
  const perEssay = [];
  let vetoedWordOccurrences = 0;
  const vetoedWords = new Map(); // essay idx -> [words vetoed]

  for (const ex of data.examples) {
    const text = ex.content;
    const passages = [{ ref: `mine1:${ex.idx}#0`, text }];

    const sentences = splitSentences(text);
    const { occurrences, byId } = locateOccurrences(sentences, tokenize, UNAMBIGUOUS_VERB_SET, NOUN_ONLY_SET, AMBIGUOUS_SET);
    const { bindings } = resolveSpanRole(sentences, occurrences, SPAN_ROLE_OPTS);

    const everVerb = new Set();
    const everNonVerb = new Set();
    for (const b of bindings) {
      const word = byId.get(b.id);
      if (!word) continue;
      if (b.role === "verb") everVerb.add(word);
      else if (b.role === "non-verb") everNonVerb.add(word);
    }
    // The veto: real, essay-relative counter-evidence (resolved non-verb at
    // least once) with no positive evidence to offset it (never resolved
    // verb) — everything else keeps L2's permissive default, including
    // words L3 had no opinion on at all.
    const vetoed = new Set([...everNonVerb].filter((w) => !everVerb.has(w)));
    if (vetoed.size) vetoedWords.set(ex.idx, [...vetoed]);

    const essayVerbForms = new Set();
    for (const t of tokenize(text)) {
      if (UNAMBIGUOUS_VERB_SET.has(t)) essayVerbForms.add(t);
      else if (AMBIGUOUS_SET.has(t) && !vetoed.has(t)) essayVerbForms.add(t);
      else if (AMBIGUOUS_SET.has(t) && vetoed.has(t)) vetoedWordOccurrences++;
    }

    const essayReader = makeRelationReader({ ...base, verbForms: essayVerbForms });
    const built = essayReader(passages);
    const essayRow = { idx: ex.idx, topic: ex.topic, facts: ex.facts.length, vocabularyVerbs: built.examined ? built.vocabulary.verbs : 0, vetoed: [...vetoed], verdicts: {} };

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

  console.log(`MINE-1 · layered: UniMorph recall (L2) minus resolveSpanRole's real non-verb veto (L3)`);
  console.log(`${totals.essays} essays, ${totals.facts} attached facts`);
  console.log(`essays with any vetoed word: ${vetoedWords.size}/${totals.essays}`);
  console.log(`vetoed word-occurrences removed from vocabulary: ${vetoedWordOccurrences}`);
  console.log(`sample vetoes:`, [...vetoedWords.entries()].slice(0, 8));
  console.log(`\nof ${totals.facts} facts:`);
  console.log(`  no_claims_extracted: ${totals.no_claims_extracted} (${pct(totals.no_claims_extracted, totals.facts)})`);
  console.log(`  of the ${examined} facts that DID extract at least one relation claim:`);
  console.log(`    bound         : ${totals.bound} (${pct(totals.bound, examined)})`);
  console.log(`    contradicted  : ${totals.contradicted} (${pct(totals.contradicted, examined)})`);
  console.log(`    unbound       : ${totals.unbound} (${pct(totals.unbound, examined)})`);
  console.log(`    beyond-reach  : ${totals["beyond-reach"]} (${pct(totals["beyond-reach"], examined)})`);
  console.log(`    unheard       : ${totals.unheard} (${pct(totals.unheard, examined)})`);
  console.log(`\nheadline (bound / all ${totals.facts} attached facts): ${pct(totals.bound, totals.facts)}`);
  console.log(`headline (bound / ${examined} facts this reader could even read a claim from): ${pct(totals.bound, examined)}`);

  writeFileSync(join(here, "results", "mine-1-layered-run.json"), JSON.stringify({ totals, examined, perEssay }, null, 1));
  console.log(`\nfull per-essay breakdown: eval/results/mine-1-layered-run.json`);
}

main();
