// eval/mine-1-span-role-clause.mjs — the granularity fix named in
// mine-1-layered-RESULTS.md: resolveSpanRole shares one recall pass per
// SENTENCE across every ambiguous occurrence in it (correct for
// pronouns.js's actual question — one referent per sentence — wrong for
// word-role resolution, where different words in one sentence can have
// different true roles; checked directly, six different words in one
// sentence all carried the identical margin/activation). roles.js itself
// is untouched — it already just consumes whatever "sentence" frames it's
// handed, in order. The fix is entirely in this file: hand it CLAUSE-level
// frames instead of whole sentences, so occurrences in different clauses
// of the same sentence get genuinely different recall.
//
// The clause boundary is not a new invention — it is pronouns.js's own
// `sameClause`/CLAUSE_OPENER_RE, the same received closed grammatical
// class (English subordinators + relative pronouns) already earned and
// tested there, reused here as a SEGMENTER instead of a pairwise check.
// Same giver, different use of the identical signal.
//
// Run: node eval/mine-1-span-role-clause.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { makeRelationReader } from "../hypergraph.js";

const here = dirname(fileURLToPath(import.meta.url));
const SPAN_ROLE_OPTS = { minActivation: 0.05, minMargin: 0.2 };

// Identical to pronouns.js's own CLAUSE_OPENER_RE (perceiver/text/pronouns.js) —
// restated, not re-derived, because it is not exported from that file.
const CLAUSE_OPENER_RE = /\b(?:that|which|who|whom|whose|because|although|though|while|when|whether|unless|since|before|after|until|if|to)\b/gi;
const CLAUSE_PUNCT_RE = /[,;:"“”]/g;
const WORD_RE = /[\p{L}\p{N}']+/gu;

/** Split each sentence into clause-level frames at the same boundaries
 * pronouns.js's sameClause already treats as clause edges — comma/
 * semicolon/colon/quote (split AFTER), and a subordinator/relative
 * pronoun (split BEFORE, so the opener stays with the clause it
 * introduces). A fragment with no words is dropped, never emitted empty. */
function clauseFrames(sentences) {
  const frames = [];
  let order = 0;
  for (const sentence of sentences) {
    const text = sentence.text;
    const boundaries = new Set([0, text.length]);
    let m;
    CLAUSE_PUNCT_RE.lastIndex = 0;
    while ((m = CLAUSE_PUNCT_RE.exec(text))) boundaries.add(m.index + 1);
    CLAUSE_OPENER_RE.lastIndex = 0;
    while ((m = CLAUSE_OPENER_RE.exec(text))) boundaries.add(m.index);
    const points = [...boundaries].sort((a, b) => a - b);
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const seg = text.slice(start, end);
      if (!WORD_RE.test(seg)) continue;
      WORD_RE.lastIndex = 0;
      frames.push({ text: seg, offset: (sentence.offset ?? 0) + start, order: order++, start, end, sentenceOrder: sentence.order });
    }
  }
  return frames;
}

/** Which frame (by absolute sentence-local char index) a token occurrence
 * falls in, within the same sentence's own frame list. */
function frameFor(frames, sentenceOrder, localIndex) {
  for (const f of frames) {
    if (f.sentenceOrder !== sentenceOrder) continue;
    if (localIndex >= f.start && localIndex < f.end) return f;
  }
  return null;
}

async function organs() {
  const { splitSentences } = await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js"
  );
  const { tokenize } = await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/material.js");
  const { resolveSpanRole } = await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/roles.js");
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize, resolveSpanRole };
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
  const VERB_SET = new Set(JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-verb-forms.json"), "utf8")));
  const AMBIGUOUS_SET = new Set(JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-ambiguous-nv.json"), "utf8")));
  const NOUN_ONLY_SET = new Set(JSON.parse(readFileSync(join(here, "fixtures", "unimorph-eng-noun-only.json"), "utf8")));
  const UNAMBIGUOUS_VERB_SET = new Set([...VERB_SET].filter((w) => !AMBIGUOUS_SET.has(w)));

  const base = await organs();
  const { splitSentences, resolveSpanRole } = base;

  const totals = { essays: data.examples.length, facts: 0, no_vocabulary_essays: 0, bound: 0, contradicted: 0, unbound: 0, "beyond-reach": 0, unheard: 0, no_claims_extracted: 0 };
  const perEssay = [];
  const resolutionTotals = { verb: 0, "non-verb": 0, role_no_candidate: 0, role_below_floor: 0, role_no_margin: 0 };

  for (const ex of data.examples) {
    const text = ex.content;
    const passages = [{ ref: `mine1:${ex.idx}#0`, text }];

    const sentences = splitSentences(text);
    const frames = clauseFrames(sentences);

    const occurrences = [];
    const byId = new Map();
    let seq = 0;
    for (const sentence of sentences) {
      WORD_RE.lastIndex = 0;
      let m;
      while ((m = WORD_RE.exec(sentence.text))) {
        const t = m[0].toLowerCase();
        let role = null;
        if (AMBIGUOUS_SET.has(t)) role = null;
        else if (UNAMBIGUOUS_VERB_SET.has(t)) role = "verb";
        else if (NOUN_ONLY_SET.has(t)) role = "non-verb";
        else continue;
        const frame = frameFor(frames, sentence.order, m.index);
        if (!frame) continue;
        const id = `o${seq++}`;
        occurrences.push({ sentenceOrder: frame.order, role, id });
        byId.set(id, t);
      }
    }

    const { bindings, gaps } = resolveSpanRole(frames, occurrences, SPAN_ROLE_OPTS);
    for (const b of bindings) resolutionTotals[b.role] = (resolutionTotals[b.role] ?? 0) + 1;
    for (const g of gaps) resolutionTotals[g.reason] = (resolutionTotals[g.reason] ?? 0) + 1;

    const resolvedVerb = new Set();
    for (const b of bindings) {
      if (b.role !== "verb") continue;
      const word = byId.get(b.id);
      if (word) resolvedVerb.add(word);
    }
    const essayVerbForms = new Set();
    const { tokenize } = base;
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

  console.log(`MINE-1 · instance-level span-role resolution, CLAUSE-level frames (granularity fix)`);
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

  writeFileSync(join(here, "results", "mine-1-span-role-clause-run.json"), JSON.stringify({ totals, resolutionTotals, examined, perEssay }, null, 1));
  console.log(`\nfull per-essay breakdown: eval/results/mine-1-span-role-clause-run.json`);
}

main();
