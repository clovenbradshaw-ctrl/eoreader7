// eval/vendored-prior-eval.mjs — does injecting a real, cited, vendored
// closed class actually close the reach gap the crosslingual eval found, or
// is the gap deeper than a missing word list?
//
// asserted-crosslingual.md found relations.js has zero negation reach on
// Russian and Japanese, tracing the cause to priors.js's NEGATION_WORDS
// being hardcoded and tagged giver: "lang/en". That diagnosis makes a
// specific, falsifiable prediction: if the ONLY thing missing is the data,
// injecting a real vendored prior for a different language should recover
// real negation reads on that language's own material — nothing else about
// the mechanism should need to change. This is that test, run against real
// full-length Basque prose (not a synthetic fixture), through the SAME
// assertion tier (hypergraph.js) the rest of this investigation used.
//
// Basque, not a repeat of Russian/Japanese: case-marked, ergative,
// unrelated to any Indo-European language, negation fronts BEFORE the
// finite verb (the opposite structural position from English's postposed
// "not") — a real, different test of whether the mechanism generalizes or
// was accidentally tuned to English's own word order.
//
// Material: Domingo Agirre's Garoa (1912), public domain, fetched from
// klasikoak.armiarma.eus (Basque classics digital library), verified
// authentic (character/place names, case-marking density, grammatical
// particle frequency all checked against the real fetched bytes — see the
// sourcing agent's own report, not repeated here). The SAME work
// eoreader6.1/scripts/word-order.mjs already named as its own Basque
// comparison case (uncommitted research scratch, never run to a result in
// this environment) — this pass is independent verification of the same
// hypothesis that script's header states, using this repo's own tier
// rather than an external encoder.
//
// Declared numbers: draws=200, seed=0, sample = every 5th chunk (Garoa is
// far smaller than the War and Peace novels — 349,614 chars vs ~3M — so a
// denser sample stays tractable; capped at 200, unchanged from every other
// pass in this investigation).

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { chunkSource } from "../source.js";
import { makeRelationReader } from "../hypergraph.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(HERE, "..", "..", "eoreader6.1", "packages", "engine");
const EU_PRIOR_PATH = join(HERE, "..", "..", "eoreader6.1", "bin", "priors", "lang", "eu.json");

const DRAWS = 200;
const SEED = 0;
const SAMPLE_EVERY = 5;
const SAMPLE_MAX = 200;

const organs = async () => {
  const { splitSentences } = await import(join(ENGINE, "perceiver/text/spans.js"));
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    join(ENGINE, "perceiver/text/surfaces.js")
  );
  const { discoverRelationVocab, extractRelations } = await import(join(ENGINE, "perceiver/text/relations.js"));
  const { tokenize, buildFrequencyTable, functionWordSet } = await import(join(ENGINE, "perceiver/text/material.js"));
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
};

const lines = [];
const say = (s = "") => {
  lines.push(s);
  console.log(s);
};

function sample(chunks) {
  const picked = [];
  for (let i = 0; i < chunks.length && picked.length < SAMPLE_MAX; i += SAMPLE_EVERY) picked.push(chunks[i]);
  return picked;
}

const euPrior = JSON.parse(readFileSync(EU_PRIOR_PATH, "utf8"));
const EU_NEGATION = new Set(euPrior.negation);

say("# vendored-prior-eval — does a real, cited prior close the reach gap?");
say("");
say(`Vendored prior: ${EU_PRIOR_PATH.replace(join(HERE, "..", "..", ""), "")} — negation: [${[...EU_NEGATION].join(", ")}]`);
say(`Declared: draws=${DRAWS}, seed=${SEED}, sample = every ${SAMPLE_EVERY}th passage capped at ${SAMPLE_MAX}.`);
say("");

const text = readFileSync(join(HERE, "corpus", "garoa-eu.txt"), "utf8");
const chunks = chunkSource("garoa-eu.txt", text);
const sampled = sample(chunks);
say(`Garoa (Domingo Agirre, 1912): ${text.length.toLocaleString()} chars, ${chunks.length.toLocaleString()} passages, sample ${sampled.length}.`);
say("");

const o = await organs();
const make = makeRelationReader(o);

say("## Before: no prior injected (relations.js's own English default)");
say("");
const before = make(sampled, { pool: sampled, assert: { draws: DRAWS, seed: SEED } });
const beforeNeg = before.edges.filter((e) => e.polarity === "-");
say(
  `- vocabulary: ${before.vocabulary.verbs} verbs · ${before.edges.length} edges · ` +
    `${beforeNeg.length} read polarity "-"` +
    (before.vocabulary.gap ? ` · GAP: ${before.vocabulary.gap}` : ""),
);
const ezAsVerbBefore = before.edges.some((e) => e.verb === "ez");
say(`- "ez" admitted as a verb: ${ezAsVerbBefore}`);
say("");

say("## After: bin/priors/lang/eu.json's negation Set injected");
say("");
const after = make(sampled, { pool: sampled, assert: { draws: DRAWS, seed: SEED }, negationWords: EU_NEGATION });
const afterNeg = after.edges.filter((e) => e.polarity === "-");
say(
  `- vocabulary: ${after.vocabulary.verbs} verbs · ${after.edges.length} edges · ` +
    `${afterNeg.length} read polarity "-"` +
    (after.vocabulary.gap ? ` · GAP: ${after.vocabulary.gap}` : ""),
);
const ezAsVerbAfter = after.edges.some((e) => e.verb === "ez");
say(`- "ez" admitted as a verb: ${ezAsVerbAfter}`);
say("");

if (afterNeg.length) {
  say("Five real negated edges, verbatim, from actual Garoa prose:");
  for (const e of afterNeg.slice(0, 5))
    say(`- "${e.subject}" —${e.verb} (negated)→ "${e.object}" · ${e.assertion.standing}, ${e.refs.length} passage(s)`);
  say("");
}

say("## Verdict");
say("");
if (beforeNeg.length === 0 && afterNeg.length > 0 && !ezAsVerbAfter) {
  say(
    `**Confirmed.** Zero negation reach before the prior (${beforeNeg.length}/${before.edges.length}), ` +
      `real negation reach after it (${afterNeg.length}/${after.edges.length}), on the SAME sampled passages ` +
      "through the SAME unmodified assertion tier — the only variable changed was the injected data. " +
      "This is evidence FOR the diagnosis the crosslingual eval made: the reach gap traced to missing " +
      "vendored data, not to something structurally unfixable in the mechanism itself. The vendored " +
      'particle "ez" was never admitted into the measured vocabulary in either run, exactly as designed.',
  );
} else {
  say(
    `**Not fully confirmed** — before: ${beforeNeg.length} negated, after: ${afterNeg.length} negated, ` +
      `"ez" as verb: before=${ezAsVerbBefore} after=${ezAsVerbAfter}. Read the numbers above plainly rather ` +
      "than assuming the predicted result: this is what actually happened.",
  );
}
say("");

writeFileSync(join(HERE, "results", "vendored-prior-eval.md"), lines.join("\n") + "\n");
writeFileSync(
  join(HERE, "results", "vendored-prior-eval.json"),
  JSON.stringify(
    {
      draws: DRAWS,
      seed: SEED,
      sampleEvery: SAMPLE_EVERY,
      sampleSize: sampled.length,
      before: { verbs: before.vocabulary.verbs, edges: before.edges.length, negated: beforeNeg.length, ezAsVerb: ezAsVerbBefore },
      after: { verbs: after.vocabulary.verbs, edges: after.edges.length, negated: afterNeg.length, ezAsVerb: ezAsVerbAfter },
      examples: afterNeg.slice(0, 10).map((e) => ({ subject: e.subject, verb: e.verb, object: e.object, refs: e.refs })),
    },
    null,
    2,
  ),
);
console.log("\nwrote eval/results/vendored-prior-eval.md and .json");
