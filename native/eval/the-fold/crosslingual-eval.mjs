// eval/crosslingual-eval.mjs — does the assertion tier honestly disclose its
// own reach limit, or does it confidently assert nonsense, on material its
// closed classes were never built for?
//
// THE QUESTION THIS ASKS, STATED SO IT ISN'T MISREAD AS THE OTHER ONE. This
// is NOT a test of whether "real structure" transfers across languages — that
// would need per-language closed-class registers (NEGATION_WORDS,
// THIRD_PERSON_SINGULAR, determiners — all currently tagged
// giver: "lang/en" in perceiver/text/priors.js) built and earned first,
// which this pass does not attempt. It is a LIMITS-DISCLOSURE test:
// extractRelations is "MEDIUM-SPECIFIC BY CONSTRUCTION" by its own header,
// reading English subject-verb-object ADJACENCY, separated by WHITESPACE, as
// if adjacency itself carried the relation. Three real, in-the-wild cases
// where different parts of that assumption are independently known to be
// wrong, each probed on the same novel in a different translation:
//
//   · RUSSIAN — case-marked arguments (Cyrillic declension) let a sentence's
//     constituents scramble far more freely than English's, so word ORDER
//     itself is a weaker signal. Whitespace-tokenized the same as English.
//   · JAPANESE — SOV order (verb comes last, not between subject and
//     object — the SVO pattern's own shape is wrong for this language) AND,
//     more structurally, NO WHITESPACE between words at all — the tokenizer
//     this whole extractor is built on (`\s+` between subject/verb/object)
//     has no separator to find. This tests a harder failure than Russian's:
//     not "the order is less informative" but "the pattern's own separator
//     does not exist in the text."
//
// PRIOR ART, found by searching before building anything new (this repo's
// own house rule): eoreader6.1/scripts/word-order.mjs already asked the
// adjacent question — English vs. Basque (a case-marked, freer-order
// language), measured by embedding-cosine drift under shuffle, on the SAME
// pg2600 War and Peace file — and named the mechanism this predicts: "Any
// tuple extractor that reads position is therefore English-shaped, and this
// measures how badly." That script is uncommitted research scratch
// (hardcoded to its author's own local paths) and was never run to a result
// in this environment; this pass is a different, complementary measurement
// (extraction admission and polarity, not embedding drift) on different
// target languages, using this repo's OWN assertion tier rather than an
// external encoder — the same question, asked again, independently.
//
// DECLARED NUMBERS, fixed before running:
//   · order-arm draws = 200, seed = 0 — this repo's standing null-arm
//     number, unchanged from asserted-eval.mjs.
//   · order-arm SAMPLE budget = every 20th chunk from each language's full
//     chunk list (a stratified systematic sample, not the first N — spreads
//     across the whole work rather than clustering at the start), capped at
//     200 sampled passages per language. Declared because the order arm's
//     true cost (draws x sentences x extraction calls) makes a full-work arm
//     impractical (the real-prose Wikipedia run — 827 edges, 200 draws —
//     already took 108s on a 72K-char excerpt; a full novel is far larger).
//     What is excluded by this cap is named here, not silently dropped.
//
// Run: node eval/crosslingual-eval.mjs <config.json>
//   config.json: { languages: [{ label, path, negationMarkers: [..] | null,
//                                enNegationControl: bool }] }
//   negationMarkers is the free-standing-word negation probe (works for
//   English/Russian, where negation is its own token); null means "this
//   language's negation is not shaped like a preceding free word (e.g.
//   Japanese's verb-suffix negation), so the probe is honestly skipped
//   rather than run wrong."
// Writes: eval/results/asserted-crosslingual.md, .json

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { chunkSource } from "../source.js";
import { makeRelationReader } from "../hypergraph.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(HERE, "..", "..", "eoreader6.1", "packages", "engine");

const DRAWS = 200;
const SEED = 0;
const SAMPLE_EVERY = 20;
const SAMPLE_MAX = 200;

const [, , configPath] = process.argv;
if (!configPath) {
  console.error("usage: node eval/crosslingual-eval.mjs <config.json>");
  process.exit(1);
}
const CONFIG = JSON.parse(readFileSync(configPath, "utf8"));

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

async function readLanguage(lang, o) {
  const text = readFileSync(lang.path, "utf8");
  const t0 = Date.now();
  const chunks = chunkSource(lang.label, text);
  const avgLen = chunks.length ? Math.round(chunks.reduce((s, c) => s + c.text.length, 0) / chunks.length) : 0;
  say(
    `**${lang.label}** — ${text.length.toLocaleString()} chars, chunked into ${chunks.length.toLocaleString()} ` +
      `passages (avg ${avgLen} chars/passage, ${Date.now() - t0}ms).`,
  );

  const make = makeRelationReader(o);
  const t1 = Date.now();
  const unarmed = make(chunks, { pool: chunks });
  const standing = { corroborated: 0, "single-witness": 0 };
  for (const e of unarmed.edges) standing[e.assertion.standing]++;
  say(
    `- unarmed full-work read: ${(Date.now() - t1) / 1000}s · vocabulary ${unarmed.vocabulary.verbs} verbs · ` +
      `${unarmed.edges.length} edges (${standing.corroborated} corroborated / ${standing["single-witness"]} single-witness)` +
      (unarmed.vocabulary.gap ? ` · GAP: ${unarmed.vocabulary.gap}` : ""),
  );

  const sampled = sample(chunks);
  say(
    `- order-arm sample: every ${SAMPLE_EVERY}th passage, ${sampled.length} of ${chunks.length} ` +
      `(${(100 - (100 * sampled.length) / Math.max(chunks.length, 1)).toFixed(1)}% of the work excluded from the arm by this declared cap)`,
  );
  const t2 = Date.now();
  const armed = make(sampled, { pool: sampled, assert: { draws: DRAWS, seed: SEED } });
  say(`- armed read of the sample: ${(Date.now() - t2) / 1000}s · ${armed.edges.length} edges in-sample`);
  const fired = armed.edges.map((e) => e.assertion.orderArm.fired).sort((a, b) => a - b);
  const median = fired.length ? fired[Math.floor(fired.length / 2)] : null;
  say(
    `- salad-fired distribution across sampled edges: median ${median ?? "—"}/${DRAWS}, ` +
      `max ${fired[fired.length - 1] ?? "—"}/${DRAWS}` +
      (fired.length === 0 ? " (no edges in the sample to measure — itself a finding, stated plainly)" : ""),
  );
  say("");

  let negation = null;
  if (lang.negationMarkers?.length) {
    const negRefs = new Set(
      chunks.filter((c) => lang.negationMarkers.some((m) => c.text.includes(m))).map((c) => c.ref),
    );
    const negEdges = unarmed.edges.filter((e) => e.refs.some((r) => negRefs.has(r)));
    const readNeg = negEdges.filter((e) => e.polarity === "-");
    negation = {
      markers: lang.negationMarkers,
      bearingPassages: negRefs.size,
      edges: negEdges.length,
      readNegative: readNeg.length,
      examples: negEdges.slice(0, 5).map((e) => ({
        subject: e.subject,
        verb: e.verb,
        object: e.object,
        polarity: e.polarity,
        ref: e.refs[0],
      })),
    };
  }

  return { lang, text, chunks, unarmed, armed, sampled, negation };
}

const o = await organs();
say("# asserted-crosslingual — does the assertion tier disclose its own reach limit?");
say("");
say(
  `Declared: draws=${DRAWS}, seed=${SEED}, order-arm sample = every ${SAMPLE_EVERY}th passage capped at ${SAMPLE_MAX}. ` +
    `${CONFIG.languages.length} texts read: ${CONFIG.languages.map((l) => l.label).join(" · ")}.`,
);
say("");
say("## Full-work reads");
say("");

const results = [];
for (const lang of CONFIG.languages) results.push(await readLanguage(lang, o));

say("## Negation stress test — per language, where the probe applies");
say("");
say(
  "`extractRelations`'s polarity read (`NEGATION_BEFORE_VERB`) is built from `priors.js::NEGATION_WORDS`, " +
    'explicitly tagged `giver: "lang/en"`. This probe checks, per language whose negation is a free-standing ' +
    "word this repo can name (declared in the run's own config, never guessed), whether a real negated clause " +
    'the reader DOES extract an edge from ever reads polarity "-". A language whose negation is a bound suffix ' +
    "(agglutinated onto the verb, not a separate word — Japanese, if included below) has no free-standing marker " +
    "to search for, so the probe is honestly SKIPPED for it rather than run against the wrong shape and reported " +
    "as a false negative.",
);
say("");

for (const r of results) {
  if (!r.negation) {
    say(`**${r.lang.label}:** probe skipped — ${r.lang.skipReason ?? "negation is not shaped as a free-standing word in this language, per the run's own config."}`);
    say("");
    continue;
  }
  const n = r.negation;
  say(
    `**${r.lang.label}:** ${n.bearingPassages.toLocaleString()} passages contain a negation marker (${n.markers.join(", ")}); ` +
      `${n.edges} edges came from those passages, of which ${n.readNegative} read polarity "-".`,
  );
  if (n.examples.length) {
    say("Examples:");
    for (const e of n.examples)
      say(`- "${e.subject}" —${e.verb}${e.polarity === "-" ? " (negated)" : " (affirmative)"}→ "${e.object}" [${e.ref}]`);
  }
  say(
    n.readNegative === 0 && n.edges > 0
      ? "→ **Zero edges read \"-\" despite real negation markers in the stating passages** — the reach gap this pass predicted, confirmed on real material."
      : n.edges === 0
        ? "→ No edges at all came from negation-bearing passages to test — inconclusive on this measure."
        : `→ ${n.readNegative}/${n.edges} DID read "-" — worth reading by hand (the JSON record carries the examples) rather than assumed to be genuine negation-detection working, since the mechanism has no non-English trigger and coincidence is the likelier explanation.`,
  );
  say("");
}

// Negation-particle-as-verb check, wherever a marker list is declared: did
// the bare marker itself get admitted into the measured vocabulary as if it
// were a verb? The English-only NEGATION_WORDS exclusion inside
// discoverRelationVocab never fires on a non-English form; only the
// Zipf-derived functionWordSet (language-agnostic BY CONSTRUCTION) could
// still catch it on pure frequency — checked, not assumed either way.
say("## Did a negation marker itself get admitted into the measured verb vocabulary?");
say("");
for (const r of results) {
  if (!r.lang.negationMarkers?.length) continue;
  const verbs = new Set(r.unarmed.edges.map((e) => e.verb));
  const admitted = r.lang.negationMarkers.filter((m) => verbs.has(m.trim()));
  say(
    admitted.length
      ? `**${r.lang.label}: YES** — ${admitted.join(", ")} admitted as a "verb" in the measured vocabulary. ` +
          "The English-only NEGATION_WORDS exclusion never fires on it; the Zipf-derived functionWordSet " +
          "evidently did not catch it either."
      : `**${r.lang.label}: no** — no bare negation marker (${r.lang.negationMarkers.map((m) => m.trim()).join(", ")}) ` +
          "appears as an edge's verb. The language-agnostic Zipf-derived functionWordSet appears to have caught " +
          "it on pure recurrence, a save it was not designed for but may be working anyway.",
  );
}
say("");

mkdirSync(join(HERE, "results"), { recursive: true });
writeFileSync(join(HERE, "results", "asserted-crosslingual.md"), lines.join("\n") + "\n");
writeFileSync(
  join(HERE, "results", "asserted-crosslingual.json"),
  JSON.stringify(
    {
      draws: DRAWS,
      seed: SEED,
      sampleEvery: SAMPLE_EVERY,
      sampleMax: SAMPLE_MAX,
      languages: results.map((r) => ({
        label: r.lang.label,
        chars: r.text.length,
        chunks: r.chunks.length,
        vocabVerbs: r.unarmed.vocabulary.verbs,
        vocabGap: r.unarmed.vocabulary.gap ?? null,
        edgeCount: r.unarmed.edges.length,
        armedSampleSize: r.sampled.length,
        armedEdgeCount: r.armed.edges.length,
        negation: r.negation,
      })),
    },
    null,
    2,
  ),
);
console.log("\nwrote eval/results/asserted-crosslingual.md and .json");
