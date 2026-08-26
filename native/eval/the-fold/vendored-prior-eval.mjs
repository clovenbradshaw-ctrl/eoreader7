// eval/vendored-prior-eval.mjs — does injecting a real, cited, vendored
// closed class actually close the reach gap the crosslingual eval found, or
// is the gap deeper than a missing word list?
//
// asserted-crosslingual.md found relations.js has zero negation reach on
// Russian and Japanese, tracing the cause to priors.js's NEGATION_WORDS
// being hardcoded and tagged giver: "lang/en". That diagnosis makes a
// specific, falsifiable prediction: if the ONLY thing missing is the data,
// injecting a real vendored prior for a different language/variety should
// recover real negation reads on that variety's own material — nothing
// else about the mechanism should need to change. This is that test, run
// three times against three real, differently-sourced text samples, through
// the SAME assertion tier (hypergraph.js) the rest of this investigation
// used.
//
// Three cases, each chosen to stress a different axis of "different":
//
//   Basque (eu)   — unrelated to any Indo-European language, ergative,
//                   negation fronts BEFORE the finite verb (opposite word
//                   order from English's postposed "not"). Tests whether
//                   the mechanism generalizes past English's own syntax.
//   Nigerian
//   Pidgin (pcm)  — an English-lexified pidgin/creole: superficially close
//                   to English in vocabulary, structurally its own
//                   grammar. Tests whether "looks like English" masks a
//                   real closed-class gap the same way an unrelated
//                   language does.
//   AAVE          — not a separate language at all, a dialect of English
//                   itself. Tests the sharpest case: even within ONE named
//                   language, a single hardcoded closed class silently
//                   assumes one dialect's grammar is the whole language's.
//
// Material:
//   - Basque: Domingo Agirre's Garoa (1912), public domain, fetched from
//     klasikoak.armiarma.eus.
//   - Nigerian Pidgin: 8+ full articles fetched from pcm.wikipedia.org,
//     ~117K characters, real encyclopedic prose in the variety itself.
//   - AAVE: the "content" column (human ground-truth transcription, not
//     any ASR hypothesis) of a CORAAL-derived transcript sample
//     (Koenecke et al. 2020 PNAS reproducibility data, CC BY-NC-SA 4.0,
//     research use — kept in eval/corpus/, gitignored, never
//     redistributed), extracted through source.js's own shared
//     `delimitedTable` CSV walker (not a second hand-rolled CSV parser),
//     4,450 rows joined into one prose file. 127 of those 4,450 rows
//     contain "ain't" in the ground-truth transcription — confirmed by
//     grep before this eval was written, so the material is known to
//     carry real negation before the prior is ever asked to find it.
//
// Declared numbers: draws=200, seed=0, sample = every Nth chunk, capped at
// 200 — unchanged from every other pass in this investigation. Basque's
// stride is 5 (Garoa is far smaller than the War and Peace novels);
// Pidgin's and AAVE's are 3 (each source sits well under a million
// characters, so a denser sample stays tractable at the same cap).

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { chunkSource, delimitedTable } from "../source.js";
import { makeRelationReader } from "../hypergraph.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(HERE, "..", "..", "eoreader7", "legacy-eoreader6.1", "packages", "engine");
const PRIORS_DIR = join(HERE, "..", "..", "eoreader7", "legacy-eoreader6.1", "bin", "priors", "lang");

const DRAWS = 200;
const SEED = 0;
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

function sample(chunks, every) {
  const picked = [];
  for (let i = 0; i < chunks.length && picked.length < SAMPLE_MAX; i += every) picked.push(chunks[i]);
  return picked;
}

function coraalProse() {
  const cached = join(HERE, "corpus", "coraal-prose.txt");
  try {
    return readFileSync(cached, "utf8");
  } catch {
    // fall through to extraction
  }
  const raw = readFileSync(join(HERE, "corpus", "coraal-transcripts.csv"), "utf8");
  const table = delimitedTable(raw);
  const contentIdx = table.head.indexOf("content");
  const texts = table.rows.map((r) => r[contentIdx]).filter(Boolean);
  // Joined with paragraph breaks, not a bare space: chunkSource reads
  // structure from blank lines, and a single space between 4,450 rows
  // collapsed the whole 1MB+ blob into ONE chunk (found live — the
  // assertion tier's 200-draw order arm then re-ran extraction on that
  // single megabyte-scale "passage" 200 times, ballooning to 99 CPU-
  // minutes and 2.7GB before being killed). Each CORAAL row becomes its
  // own paragraph-sized passage, matching how the other two cases'
  // material (Wikipedia articles, a print novel) is naturally structured.
  const joined = texts.join("\n\n");
  writeFileSync(cached, joined);
  return joined;
}

async function runCase({ label, priorFile, priorLangKey, textPath, textLoader, sampleEvery, particle }) {
  say(`## ${label}`);
  say("");

  const prior = JSON.parse(readFileSync(join(PRIORS_DIR, priorFile), "utf8"));
  const NEGATION = new Set(prior.negation);
  say(`Vendored prior: bin/priors/lang/${priorFile} — negation additions: [${[...NEGATION].join(", ")}]`);
  say(`Declared: draws=${DRAWS}, seed=${SEED}, sample = every ${sampleEvery}th passage capped at ${SAMPLE_MAX}.`);

  const text = textLoader ? textLoader() : readFileSync(textPath, "utf8");
  const chunks = chunkSource(priorLangKey + "-material.txt", text);
  const sampled = sample(chunks, sampleEvery);
  say(`Material: ${text.length.toLocaleString()} chars, ${chunks.length.toLocaleString()} passages, sample ${sampled.length}.`);
  say("");

  const o = await organs();
  const make = makeRelationReader(o);

  say("### Before: no prior injected (relations.js's own English default)");
  say("");
  const before = make(sampled, { pool: sampled, assert: { draws: DRAWS, seed: SEED } });
  const beforeNeg = before.edges.filter((e) => e.polarity === "-");
  say(
    `- vocabulary: ${before.vocabulary.verbs} verbs · ${before.edges.length} edges · ` +
      `${beforeNeg.length} read polarity "-"` +
      (before.vocabulary.gap ? ` · GAP: ${before.vocabulary.gap}` : ""),
  );
  const particleAsVerbBefore = particle ? before.edges.some((e) => e.verb === particle) : null;
  if (particle) say(`- "${particle}" admitted as a verb: ${particleAsVerbBefore}`);
  say("");

  say(`### After: bin/priors/lang/${priorFile}'s negation Set injected`);
  say("");
  const after = make(sampled, { pool: sampled, assert: { draws: DRAWS, seed: SEED }, negationWords: NEGATION });
  const afterNeg = after.edges.filter((e) => e.polarity === "-");
  say(
    `- vocabulary: ${after.vocabulary.verbs} verbs · ${after.edges.length} edges · ` +
      `${afterNeg.length} read polarity "-"` +
      (after.vocabulary.gap ? ` · GAP: ${after.vocabulary.gap}` : ""),
  );
  const particleAsVerbAfter = particle ? after.edges.some((e) => e.verb === particle) : null;
  if (particle) say(`- "${particle}" admitted as a verb: ${particleAsVerbAfter}`);
  say("");

  if (afterNeg.length) {
    say(`Up to five real negated edges, verbatim, from actual ${label} prose:`);
    for (const e of afterNeg.slice(0, 5))
      say(`- "${e.subject}" —${e.verb} (negated)→ "${e.object}" · ${e.assertion.standing}, ${e.refs.length} passage(s)`);
    say("");
  }

  const confirmed = beforeNeg.length === 0 && afterNeg.length > 0 && (particle ? !particleAsVerbAfter : true);
  say("### Verdict");
  say("");
  if (confirmed) {
    say(
      `**Confirmed.** Zero negation reach before the prior (${beforeNeg.length}/${before.edges.length}), ` +
        `real negation reach after it (${afterNeg.length}/${after.edges.length}), on the SAME sampled passages ` +
        "through the SAME unmodified assertion tier — the only variable changed was the injected data." +
        (particle ? ` The vendored particle "${particle}" was never admitted into the measured vocabulary in either run, exactly as designed.` : ""),
    );
  } else {
    say(
      `**Not fully confirmed** — before: ${beforeNeg.length} negated, after: ${afterNeg.length} negated` +
        (particle ? `, "${particle}" as verb: before=${particleAsVerbBefore} after=${particleAsVerbAfter}` : "") +
        `. Read the numbers above plainly rather than assuming the predicted result: this is what actually happened.`,
    );
  }
  say("");

  return {
    label,
    priorFile,
    draws: DRAWS,
    seed: SEED,
    sampleEvery,
    sampleSize: sampled.length,
    before: { verbs: before.vocabulary.verbs, edges: before.edges.length, negated: beforeNeg.length, particleAsVerb: particleAsVerbBefore },
    after: { verbs: after.vocabulary.verbs, edges: after.edges.length, negated: afterNeg.length, particleAsVerb: particleAsVerbAfter },
    confirmed,
    examples: afterNeg.slice(0, 10).map((e) => ({ subject: e.subject, verb: e.verb, object: e.object, refs: e.refs })),
  };
}

say("# vendored-prior-eval — does a real, cited prior close the reach gap?");
say("");
say(
  "Three cases: Basque (a genuinely different LANGUAGE), Nigerian Pidgin (an " +
    "English-lexified pidgin that looks close to English but isn't), and AAVE " +
    "(not a separate language at all — a DIALECT of English, the sharpest test " +
    "of whether one hardcoded closed class silently assumed one dialect speaks " +
    "for the whole language).",
);
say("");

const results = [];

results.push(
  await runCase({
    label: "Basque (Domingo Agirre, Garoa, 1912)",
    priorFile: "eu.json",
    priorLangKey: "garoa-eu",
    textPath: join(HERE, "corpus", "garoa-eu.txt"),
    sampleEvery: 5,
    particle: "ez",
  }),
);

results.push(
  await runCase({
    label: "Nigerian Pidgin (pcm.wikipedia.org articles)",
    priorFile: "pcm.json",
    priorLangKey: "pcm-wiki",
    textPath: join(HERE, "corpus", "nigerian-pidgin.txt"),
    sampleEvery: 3,
    particle: "no",
  }),
);

results.push(
  await runCase({
    label: "AAVE (CORAAL-derived transcript, human ground-truth column)",
    priorFile: "en-AAVE.json",
    priorLangKey: "coraal-aave",
    textLoader: coraalProse,
    sampleEvery: 3,
    particle: "ain't",
  }),
);

say("## Summary across all three");
say("");
for (const r of results) {
  say(
    `- ${r.label}: before ${r.before.negated}/${r.before.edges} negated → ` +
      `after ${r.after.negated}/${r.after.edges} negated — ${r.confirmed ? "CONFIRMED" : "not fully confirmed"}`,
  );
}
say("");
const allConfirmed = results.every((r) => r.confirmed);
say(
  allConfirmed
    ? "**All three cases confirmed.** The reach gap traces to missing vendored data in every case tried so " +
        "far — a different language (Basque), a different-but-related variety (Nigerian Pidgin), and a " +
        "dialect of the SAME language the mechanism already claimed to handle (AAVE) — not to anything " +
        "structurally unfixable in relations.js itself."
    : "Not every case confirmed — see the per-case verdicts above.",
);
say("");

writeFileSync(join(HERE, "results", "vendored-prior-eval.md"), lines.join("\n") + "\n");
writeFileSync(join(HERE, "results", "vendored-prior-eval.json"), JSON.stringify(results, null, 2));
console.log("\nwrote eval/results/vendored-prior-eval.md and .json");
