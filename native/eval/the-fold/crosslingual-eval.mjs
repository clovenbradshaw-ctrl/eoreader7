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
// wrong, each probed on the same novel in a different translation (Russian)
// or, where the same novel isn't available, a substantial documented
// substitute (Japanese):
//
//   · RUSSIAN — case-marked arguments (Cyrillic declension) let a sentence's
//     constituents scramble far more freely than English's, so word ORDER
//     itself is a weaker signal. Whitespace-tokenized the same as English.
//   · JAPANESE — SOV order (verb comes last, not between subject and
//     object) AND, more structurally, NO WHITESPACE between words at all —
//     the tokenizer this whole extractor is built on (`\s+` between
//     subject/verb/object) has no separator to find.
//
// THE ARCHITECTURE, corrected mid-investigation (found by running, not
// designed for). The first cut of this eval called hypergraph.js's
// makeRelationReader — a TURN-SCOPED grounding-check organ, built and tested
// for a handful of retrieved passages — over an entire 11,132-passage novel
// at once. Its own edge-accumulation did a linear `.find()` over the WHOLE
// edge array per triple; that is a real O(n^2) cost this pass's own earlier
// draft hit (10+ minutes, still not finished) and has SEPARATELY been fixed
// in hypergraph.js itself (bucketing existing edges by an exact verb+polarity
// key so the fuzzy endpointsMatch scan only runs within a same-verb bucket —
// semantics unchanged, pinned by hypergraph.test.mjs). But bucketing alone
// still left a SECOND full-book pass slow (cast.js's own referent resolver
// is also not built for tens of thousands of surface events). The right fix
// was architectural, not another local optimisation: `packages/host/`
// already has a session-based, full-document reading pipeline purpose-built
// for exactly this scale — `sessionRelations` (discoveredCast, ONE call to
// discoverReferents/extractRelations over the whole document body, not per
// passage) and `emergence/graph.js`'s Map-keyed belief graph (admitGraph),
// already measured on THIS EXACT FILE (pg2600) elsewhere in this repo's own
// CLAUDE.md (admission ~8.6s, cast ~88s, graph ~25s on the full 3.3MB
// novel) — "the full power of the terrains and holons," as the redirect
// that produced this rewrite put it. This pass uses `sessionRelations` for
// its real, full-book, engine-native triple extraction (fast: ~120-160s for
// the full English novel end to end, not 10+ minutes) and does its OWN
// lightweight, Map-keyed (never linear-scanned), EXACT-STRING edge
// accumulation over those triples — deliberately NOT `admitGraph`, whose
// `structural: true` key (`subject|polarity|object`, no verb — a real,
// documented emergence/graph.js feature for binding-derived edges) collapses
// many distinct verbs into one high-weight node when ranked by mentions,
// which is the wrong shape for "how many distinct verb-typed edges does this
// language yield" and would have made this eval's own counts mean something
// different from what they claim to measure. hypergraph.js's own assertion
// tier (asserted.js's witness/standing counting, the word-salad order arm)
// is still exercised, but only on a declared BOUNDED sample — that machinery
// answers a turn-scoped question and was never meant to run at whole-book
// scale; running it there was this pass's own first mistake.
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
// on different target languages, using this repo's OWN assertion tier and
// the engine's own session pipeline rather than an external encoder — the
// same question, asked again, independently.
//
// DECLARED NUMBERS, fixed before running:
//   · order-arm draws = 200, seed = 0 — this repo's standing null-arm
//     number, unchanged from asserted-eval.mjs.
//   · order-arm SAMPLE budget = every 20th chunk from each language's full
//     chunk list (a stratified systematic sample, not the first N — spreads
//     across the whole work rather than clustering at the start), capped at
//     200 sampled passages per language. Declared because the order arm's
//     true cost (draws x sentences x extraction calls) makes a full-work arm
//     impractical even with a fast triple extractor.
//
// Run: node eval/crosslingual-eval.mjs <config.json>
//   config.json: { languages: [{ label, path, negationMarkers: [..] | null,
//                                skipReason }] }
//   negationMarkers is the free-standing-word negation probe (works for
//   English/Russian, where negation is its own token); null means "this
//   language's negation is not shaped like a preceding free word (e.g.
//   Japanese's verb-suffix negation), so the probe is honestly skipped
//   rather than run against the wrong shape."
// Writes: eval/results/asserted-crosslingual.md, .json

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { chunkSource } from "../source.js";
import { makeRelationReader } from "../hypergraph.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ENGINE = join(HERE, "..", "..", "eoreader7", "legacy-eoreader6.1", "packages", "engine");
const HOST = join(HERE, "..", "..", "eoreader7", "legacy-eoreader6.1", "packages", "host", "index.js");

const DRAWS = 200;
const SEED = 0;
const SAMPLE_EVERY = 20;
const SAMPLE_MAX = 200;

// Restricts a language's own examples/counts to its own native script, so a
// source that code-switches (War and Peace's own French aristocratic
// dialogue, real Tolstoy, not corruption) doesn't let a handful of
// Latin-script triples from the opening pages stand in for "what this
// language's extraction looks like" — found necessary by checking, not
// assumed: an early draft's negation examples were dominated by French
// dialogue purely because the novel's OPENING scene is heavily French, and
// reported that as if it characterized the whole run. `scriptTest` is a
// regex string, applied to `subject+verb+object` joined; a triple counts as
// "native" only if it matches AND carries no Latin letter (so a name spelled
// in Latin transliteration inside otherwise-Cyrillic prose is excluded, not
// wrongly counted as native).
const nativeScript = (t, scriptRe) =>
  scriptRe ? scriptRe.test(t.subject + t.verb + t.object) && !/[a-zA-Z]/.test(t.subject + t.verb + t.object) : true;

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

/**
 * The full-work pass: real engine-native triples (sessionRelations, one
 * discoverReferents/extractRelations call over the whole document body —
 * the fast path this rewrite exists for), folded into a Map-keyed,
 * EXACT-STRING edge count — never a linear scan, never referent-fuzzy
 * matching (that is hypergraph.js's/asserted.js's job, reserved for the
 * bounded sample below). The key is `subject|verb|polarity|object`,
 * lowercased — a coarser identity than hypergraph.js's own endpointsMatch,
 * disclosed as exactly that: two mentions of "Pierre" and "he" naming the
 * same person will NOT merge here the way they would in the referent-aware
 * tier. That coarseness is the price of running at whole-book scale at all,
 * and it only ever SPLITS an edge that should have merged (undercounting
 * corroboration), never merges two that shouldn't (never fabricates
 * agreement) — the safe direction to be wrong in for a vocabulary/edge-count
 * measurement.
 */
async function fullWorkPass(lang, host) {
  const { createSession, admitChunked, sessionRelations } = host;
  const text = readFileSync(lang.path, "utf8");
  const session = createSession();

  let t0 = Date.now();
  const admitted = admitChunked(session, { text, sourceId: lang.label, language: null });
  const admitMs = Date.now() - t0;

  t0 = Date.now();
  const { relations, gaps } = sessionRelations(session, { sourceId: lang.label });
  const relateMs = Date.now() - t0;

  const edgeMap = new Map(); // "subj|verb|polarity|obj" -> {subject, verb, object, polarity, statements}
  const verbSet = new Set();
  for (const t of relations) {
    verbSet.add(t.verb);
    const key = `${String(t.subject).toLowerCase()}|${t.verb}|${t.polarity}|${String(t.object).toLowerCase()}`;
    const existing = edgeMap.get(key);
    if (existing) existing.statements += 1;
    else edgeMap.set(key, { subject: t.subject, verb: t.verb, polarity: t.polarity, object: t.object, statements: 1 });
  }

  say(
    `**${lang.label}** — ${text.length.toLocaleString()} chars, ${admitted.chunks.toLocaleString()} admitted chunks ` +
      `(admitChunked ${(admitMs / 1000).toFixed(1)}s).`,
  );
  say(
    `- sessionRelations (engine-native, whole-document triples): ${(relateMs / 1000).toFixed(1)}s · ` +
      `${relations.length.toLocaleString()} raw triples · ${verbSet.size.toLocaleString()} distinct verbs · ` +
      `${edgeMap.size.toLocaleString()} distinct (subject, verb, polarity, object) edges` +
      (gaps.length ? ` · gaps: ${gaps.length}` : ""),
  );
  if (gaps.length) for (const g of gaps) say(`  - gap: ${g.reason ?? JSON.stringify(g)} — ${g.detail ?? ""}`);

  // Script-mix disclosure: this novel's own aristocratic dialogue
  // code-switches into French, real Tolstoy, not corruption — reported so a
  // reader knows how much of "this language's own edges" is actually the
  // declared native script versus embedded Latin-script text, rather than
  // silently blending the two into one count.
  if (lang.scriptTest) {
    const scriptRe = new RegExp(lang.scriptTest, "u");
    let native = 0, latin = 0, mixed = 0;
    for (const t of relations) {
      const hasScript = scriptRe.test(t.subject + t.verb + t.object);
      const hasLatin = /[a-zA-Z]/.test(t.subject + t.verb + t.object);
      if (hasScript && !hasLatin) native++;
      else if (!hasScript && hasLatin) latin++;
      else mixed++;
    }
    say(
      `- script mix of the ${relations.length.toLocaleString()} raw triples: ${native.toLocaleString()} native-script only ` +
        `(${((100 * native) / relations.length).toFixed(1)}%), ${latin.toLocaleString()} Latin-script only ` +
        `(${((100 * latin) / relations.length).toFixed(1)}%, embedded-language dialogue — real Tolstoy, not corruption), ` +
        `${mixed.toLocaleString()} mixed/neither (${((100 * mixed) / relations.length).toFixed(1)}%)`,
    );
  }

  return { text, relations, edgeMap, verbSet, admitted, scriptRe: lang.scriptTest ? new RegExp(lang.scriptTest, "u") : null };
}

async function armedSamplePass(lang, o) {
  const text = readFileSync(lang.path, "utf8");
  const chunks = chunkSource(lang.label, text);
  const sampled = sample(chunks);
  const make = makeRelationReader(o);
  const t0 = Date.now();
  const armed = make(sampled, { pool: sampled, assert: { draws: DRAWS, seed: SEED } });
  const ms = Date.now() - t0;
  const standing = { corroborated: 0, "single-witness": 0 };
  for (const e of armed.edges) standing[e.assertion.standing]++;
  say(
    `- assertion-tier sample (hypergraph.js, bounded — every ${SAMPLE_EVERY}th passage, ${sampled.length} of ` +
      `${chunks.length.toLocaleString()}, ${(100 - (100 * sampled.length) / Math.max(chunks.length, 1)).toFixed(1)}% ` +
      `excluded by this declared cap): ${(ms / 1000).toFixed(1)}s · ${armed.edges.length} edges ` +
      `(${standing.corroborated} corroborated / ${standing["single-witness"]} single-witness)` +
      (armed.vocabulary.gap ? ` · GAP: ${armed.vocabulary.gap}` : ""),
  );
  const fired = armed.edges.map((e) => e.assertion.orderArm?.fired).filter((f) => f != null).sort((a, b) => a - b);
  const median = fired.length ? fired[Math.floor(fired.length / 2)] : null;
  say(
    `- salad-fired distribution across sampled edges: median ${median ?? "—"}/${DRAWS}, ` +
      `max ${fired[fired.length - 1] ?? "—"}/${DRAWS}` +
      (fired.length === 0 ? " (no edges in the sample to measure — itself a finding, stated plainly)" : ""),
  );
  say("");
  return { chunks, sampled, armed };
}

const o = await organs();
const host = await import(HOST);
say("# asserted-crosslingual — does the assertion tier disclose its own reach limit?");
say("");
say(
  `Declared: draws=${DRAWS}, seed=${SEED}, order-arm sample = every ${SAMPLE_EVERY}th passage capped at ${SAMPLE_MAX}. ` +
    `${CONFIG.languages.length} texts read: ${CONFIG.languages.map((l) => l.label).join(" · ")}.`,
);
say("");
say(
  "Full-work counts below use the engine's OWN session pipeline (`sessionRelations`, packages/host/corpus.js) — " +
    "the fast, full-document-scale organ, not a bulk re-application of hypergraph.js's turn-scoped machinery " +
    "(that mistake, and the fix, are recorded in this file's own header). The assertion tier itself (standing, " +
    "the word-salad order arm) still runs, on a declared bounded sample, because that is the scale it is built for.",
);
say("");
say("## Full-work reads (engine-native, whole-document)");
say("");

const results = [];
for (const lang of CONFIG.languages) {
  const full = await fullWorkPass(lang, host);
  const armedSample = await armedSamplePass(lang, o);
  results.push({ lang, full, armedSample });
}

say("## Negation stress test — per language, where the probe applies");
say("");
say(
  "`extractRelations`'s polarity read (`NEGATION_BEFORE_VERB`) is built from `priors.js::NEGATION_WORDS`, " +
    'explicitly tagged `giver: "lang/en"`. This probe checks, per language whose negation is a free-standing ' +
    "word this repo can name (declared in the run's own config, never guessed), whether a real negated clause " +
    'the reader DOES extract an edge from ever reads polarity "-", using the FULL-WORK raw triples above ' +
    "(sessionRelations's own extraction, the same one the edge counts are built from) rather than a re-run. " +
    "A language whose negation is a bound suffix (Japanese's verb-suffix negation) has no free-standing marker " +
    "to search for, so the probe is honestly SKIPPED rather than run against the wrong shape.",
);
say("");

for (const r of results) {
  if (!r.lang.negationMarkers?.length) {
    say(`**${r.lang.label}:** probe skipped — ${r.lang.skipReason ?? "negation is not shaped as a free-standing word in this language, per the run's own config."}`);
    say("");
    continue;
  }
  const markers = r.lang.negationMarkers;
  // A triple's own subject/verb/object text doesn't carry the negation
  // marker itself (that's outside the matched span) — the marker's presence
  // is checked in the SENTENCE the triple's subject/object came from, so
  // the raw text is re-scanned around each triple's approximate position.
  // Cheap and honest: chunk the document once (already have `chunks` from
  // the armed-sample pass) and ask which chunks contain a marker; count
  // triples whose subject OR object substring is found inside one of those
  // chunks' own text (an approximation — sessionRelations doesn't carry a
  // byte offset per triple — disclosed as exactly that).
  const negChunks = r.armedSample.chunks.filter((c) => markers.some((m) => c.text.includes(m)));
  const negText = negChunks.map((c) => c.text).join("\n");
  // Restricted to the language's OWN declared script (when it has one) —
  // otherwise a code-switched passage's embedded Latin-script dialogue
  // (real Tolstoy, not corruption) can dominate the shown evidence purely
  // by where in the book it happens to sit, which an earlier draft of this
  // eval did (its five examples were almost all French, from the novel's
  // French-heavy opening scene) and is corrected here.
  const candidateTriples = r.full.relations.filter((t) => negText.includes(t.subject) || negText.includes(t.object));
  const bearingTriples = r.full.scriptRe
    ? candidateTriples.filter((t) => nativeScript(t, r.full.scriptRe))
    : candidateTriples;
  const readNeg = bearingTriples.filter((t) => t.polarity === "-");
  say(
    `**${r.lang.label}:** ${negChunks.length.toLocaleString()} passages contain a negation marker (${markers.join(", ")}); ` +
      `${bearingTriples.length.toLocaleString()} ${r.full.scriptRe ? "native-script " : ""}triples' subject/object ` +
      `text also appears in one of those passages (an approximation — sessionRelations carries no per-triple offset ` +
      `— never a precise count), of which ${readNeg.length} read polarity "-".` +
      (r.full.scriptRe && candidateTriples.length !== bearingTriples.length
        ? ` (${(candidateTriples.length - bearingTriples.length).toLocaleString()} more candidates excluded as ` +
          "non-native-script — embedded dialogue, not this language's own prose.)"
        : ""),
  );
  if (bearingTriples.length) {
    say("Five examples, verbatim:");
    for (const t of bearingTriples.slice(0, 5))
      say(`- "${t.subject}" —${t.verb}${t.polarity === "-" ? " (negated)" : " (affirmative)"}→ "${t.object}"`);
  }
  say(
    readNeg.length === 0 && bearingTriples.length > 0
      ? "→ **Zero triples anywhere near a negation marker read polarity \"-\"** — the reach gap this pass predicted, confirmed on real material."
      : bearingTriples.length === 0
        ? "→ No triples to test on this measure — inconclusive."
        : `→ ${readNeg.length}/${bearingTriples.length} DID read "-" — worth reading by hand (the JSON record carries the examples) rather than assumed to be genuine negation-detection working, since the mechanism has no non-English trigger and coincidence (or a triple merely sitting near, not stating, the negation) is the likelier explanation.`,
  );
  say("");

  // Did the negation marker itself get admitted as a "verb"?
  const admitted = markers.filter((m) => r.full.verbSet.has(m.trim()));
  say(
    admitted.length
      ? `Also: ${admitted.join(", ")} was admitted as a "verb" in the measured vocabulary — the English-only ` +
          "NEGATION_WORDS exclusion never fires on it; the Zipf-derived functionWordSet evidently did not catch it either."
      : `Also: no bare negation marker (${markers.map((m) => m.trim()).join(", ")}) appears as a triple's verb — ` +
          "the language-agnostic functionWordSet appears to have caught it on pure recurrence, a save it was not designed for but may be working anyway.",
  );
  say("");
}

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
        chars: r.full.text.length,
        rawTriples: r.full.relations.length,
        distinctVerbs: r.full.verbSet.size,
        distinctEdges: r.full.edgeMap.size,
        armedSampleSize: r.armedSample.sampled.length,
        armedEdgeCount: r.armedSample.armed.edges.length,
      })),
    },
    null,
    2,
  ),
);
console.log("\nwrote eval/results/asserted-crosslingual.md and .json");
