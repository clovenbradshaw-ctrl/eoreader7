// proposition-holograph-real-data.mjs — the-fold's proposition holograph
// (the-fold/proposition-holograph.js) exercised on a real, uncurated source,
// not this repo's own built corpora (product-assay.mjs's CORPUS is written
// to hold clean single-clause sentences; every eval in this directory that
// depends on organs()/product-assay.mjs also pulls in grid.js/reader-frame.js
// from the sibling the-fold checkout this repo's own CI never checks out —
// see lib/fold-sibling.mjs). This driver imports only from native/ and the
// holograph itself, both self-contained, so it runs on eoreader7 alone.
//
//   node eval/the-fold/proposition-holograph-real-data.mjs
//        [--source <path>] [--limit <bytes>]
//
// WHAT IS REAL: the source text (default: fixtures/xfiles-wikipedia-excerpt.txt,
// see its provenance note below), the chunking (organs/source.js chunkSource),
// the relation extraction that produces "ground facts" (organs/hypergraph.js
// makeRelationReader — mechanical, POS-prior-based, no model call anywhere),
// the referent index (organs/cast.js), the paraphrase chase that TYPES each
// proposition entail/derive/invent (organs/run-dmca.js chaseParaphrase), the
// morphogenic cell placement (organs/creativity-table.js), and the holograph
// itself (the-fold/proposition-holograph.js, "PURE: no fetch, no DOM, no
// model call") — all unmodified, imported directly from this checkout.
//
// WHAT IS SUBSTITUTED, DISCLOSED: the "mouth" — the model that writes the
// synthetic propositions about the source — is a Claude session, not a live
// Ollama/Anthropic call (no model backend was reachable from the sandbox
// this was first run in). Every proposition below is real prose composed
// after reading the source text, tagged with what it was meant to test; none
// of it is copy-pasted from the source and none of it is fabricated data
// about a source that doesn't exist.
//
// PROVENANCE (fixtures/xfiles-wikipedia-excerpt.txt): the first ~9000 bytes
// of Wikipedia's "The X-Files" article (https://en.wikipedia.org/wiki/The_X-Files),
// fetched live via the MediaWiki API on 2026-09-28. Wikipedia article text is
// CC BY-SA 4.0 — this excerpt and anything derived from it (the ground facts
// below, the JSON this driver writes to results/) carry that share-alike
// attribution term; it is not public domain.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const NATIVE = join(HERE, "..", "..");
const FIX = join(HERE, "fixtures");
const RESULTS = join(HERE, "results");

const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : d; };
const SOURCE_PATH = flag("source", join(FIX, "xfiles-wikipedia-excerpt.txt"));
const LIMIT = Number(flag("limit", 0)) || null;

const { makeRelationReader } = await import(join(NATIVE, "organs/hypergraph.js"));
const { chunkSource } = await import(join(NATIVE, "organs/source.js"));
const { makeReferentIndex } = await import(join(NATIVE, "organs/cast.js"));
const { splitSentences } = await import(join(NATIVE, "adapters/text/spans.js"));
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(join(NATIVE, "adapters/text/surfaces.js"));
const { resolvePronouns } = await import(join(NATIVE, "adapters/text/pronouns.js"));
const { relationExtractorsFor } = await import(join(NATIVE, "adapters/text/relations-language.js"));
const { classifyWord, dominantClass } = await import(join(NATIVE, "adapters/text/wordclass.js"));
const M = await import(join(NATIVE, "adapters/text/morphology.js"));
const P = await import(join(NATIVE, "adapters/text/priors.js"));
const { chaseParaphrase } = await import(join(NATIVE, "organs/run-dmca.js"));
const { artifactCell } = await import(join(NATIVE, "organs/creativity-table.js"));
const { createPropositionHolograph, captureProposition, recombineAtomsFor, projectHolograph, settleAtoms } = await import(join(HERE, "..", "..", "the-fold/proposition-holograph.js"));

// ── the relation reader (native/organs/hypergraph.js), no model anywhere ──
const posPrior = JSON.parse(readFileSync(join(FIX, "pos-prior-eng.json"), "utf8"));
const verbForms = new Set(JSON.parse(readFileSync(join(FIX, "unimorph-eng-verb-forms.json"), "utf8")));
const sameAct = M.createLemmatizer(M.morphologyFromPrior(JSON.parse(readFileSync(join(FIX, "unimorph-morphology-prior.json"), "utf8"))).forms, { language: "eng" }).sameAct;
const dispatch = relationExtractorsFor({ language: "eng", roleConfig: null, posPrior, classifyWord, dominantClass });
const RELATION_READER_OPTIONS = {
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab: dispatch.discoverRelationVocab, extractRelations: dispatch.extractRelations,
  extractorsMode: "dispatch", posPriorFor: () => posPrior,
  verbForms, oovLexicon: verbForms,
  nounPhraseSubjects: true, phrasalPredicates: true, attestedVerbs: true, objectSpecificity: true,
  createLemmatizer: () => ({ sameAct }),
  morphologyIndex: {},
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  resolvePronouns,
};
const relationsFor = makeRelationReader(RELATION_READER_OPTIONS);
const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });

// ── the real source ────────────────────────────────────────────────────────
const SOURCE_NAME = SOURCE_PATH.split("/").pop();
let rawText = readFileSync(SOURCE_PATH, "utf8");
if (LIMIT) rawText = rawText.slice(0, LIMIT);
const chunks = chunkSource(SOURCE_NAME, rawText).map((c) => ({ ...c, source: SOURCE_NAME, kind: "prose" }));
console.log(`proposition-holograph-real-data — ${SOURCE_NAME}: ${rawText.length} bytes -> ${chunks.length} chunks`);

const index = indexFor(chunks);
console.log(`  referent index: ${index.referents.size} referents established`);

const rel = relationsFor(chunks, { pool: chunks });
const groundFacts = [];
for (const c of chunks) {
  const claims = rel.read(String(c.text ?? ""))?.claims ?? [];
  for (const cl of claims) {
    if (cl.verdict !== "bound") continue;
    groundFacts.push({ end1: cl.end1, label: cl.label, end2: cl.end2, fact: `${cl.end1} ${cl.label} ${cl.end2}`, ref: c.ref, spans: cl.spans ?? [] });
  }
}
console.log(`  ground facts extracted (mechanical, bound claims only): ${groundFacts.length}`);
for (const g of groundFacts) console.log(`    [${g.ref}] ${g.end1} —${g.label}→ ${g.end2}`);

// ── the mouth's propositions (disclosed above: written by a Claude session
// after reading the fetched article, not copied from it and not fabricated)
const PROPOSITIONS = [
  { text: "The X-Files was created by Chris Carter.", meant: "near-verbatim carry of a real, true fact — tests whether entail requires the extractor to have caught it" },
  { text: "David Duchovny plays Fox Mulder on the show.", meant: "a real fact, reworded — tests the entail/derive boundary" },
  { text: "Mulder is depicted as a Bureau profiler who was educated at Oxford.", meant: "a real fact from later in the excerpt, reworded further" },
  { text: "The show's endurance across three broadcast decades suggests conspiracy fiction ages better on television than in film.", meant: "genuine synthetic commentary, not stated anywhere in the source" },
  { text: "The Cigarette Smoking Man functions less as a person than as the series' recurring proof that institutions outlast any single villain.", meant: "genuine synthetic commentary, not stated anywhere in the source" },
];

console.log("\n=== chasing each proposition against the real extracted ground facts (organs/run-dmca.js, no model) ===");
const holograph = createPropositionHolograph();
const activationSet = groundFacts.slice(0, 8).map((g) => g.fact).join(" | ");
const atomRows = [];
for (const { text, meant } of PROPOSITIONS) {
  const chase = chaseParaphrase({
    text,
    sources: new Map([[SOURCE_NAME, rawText]]),
    citations: [],
    claims: groundFacts.map((g) => ({ end1: g.end1, label: g.label, end2: g.end2 })),
    index,
    whom: { face: null, ethos: "empty hub" },
  });
  const cell = artifactCell(chase.chase?.derivation === "Derive" ? "Derive" : "Invent");
  const atom = captureProposition(holograph, text, {
    activation: activationSet,
    groundFacts,
    chase: chase.chase,
    cell,
    giver: "claude-sonnet-5 (this session, substituting for a live model backend — disclosed in this file's header)",
    frame: { giver: "claude-sonnet-5", question: "what does the article establish about The X-Files?" },
    placement: "whole.turn",
    // Integrated with the reading side (2026-09-28): real source bytes, so
    // an entailed fact's address is actually verified (organs/verify-span.js)
    // rather than trusted on the strength of the phrase match alone.
    // `passages: chunks` matters — hypergraph.js's own claim spans are
    // offsets INTO the chunk they came from, not the source file; omitting
    // this silently fails every real span (verify-span.js's passage-relative
    // fallback never gets a passage list to resolve against).
    sources: { [SOURCE_NAME]: rawText },
    passages: chunks,
  });
  console.log(`\n  "${text}"`);
  console.log(`    meant to test: ${meant}`);
  console.log(`    typing: ${atom.typing}  derivation: ${atom.derivation}  cell: ${JSON.stringify(atom.cell)}`);
  if (atom.typing === "entail") console.log(`    entailed fact: ${atom.entailFact} [${atom.entailRef}]  verified: ${atom.entailVerified}`);
  else console.log(`    closest ground fact (did not qualify — needs BOTH ends): ${atom.closestGroundFact ?? "(no overlap at all)"}`);
  console.log(`    chase.basis: ${chase.chase?.basis ?? "(n/a)"}`);
  atomRows.push({ text, meant, typing: atom.typing, derivation: atom.derivation, cell: atom.cell, entailFact: atom.entailFact, entailRef: atom.entailRef, entailVerified: atom.entailVerified, closestGroundFact: atom.closestGroundFact, chaseBasis: chase.chase?.basis ?? null });
}

console.log("\n=== recombination: what the holograph offers back for a fresh void on {mulder, carter, duchovny} ===");
const recombined = recombineAtomsFor(holograph, { activation: ["mulder", "carter", "duchovny"], placement: "whole.turn", max: 5 });
for (const a of recombined) console.log(`  [${a.typing}] ${a.text}`);

console.log("\n=== settle: accept everything that isn't pure invention, refuse what is, then project ===");
settleAtoms(holograph, { accept: holograph.atoms.filter((a) => a.typing !== "invent").map((a) => a.id), context: "whole.turn" });
settleAtoms(holograph, { refuse: holograph.atoms.filter((a) => a.typing === "invent").map((a) => a.id), context: "whole.turn" });
const projected = projectHolograph(holograph);
console.log(projected.map((t) => `  - ${t}`).join("\n"));

console.log(`\n=== done: ${holograph.atoms.length} atoms captured, schema ${holograph.schema} ===`);

mkdirSync(RESULTS, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outPath = join(RESULTS, `proposition-holograph-real-data-${stamp}.json`);
writeFileSync(outPath, JSON.stringify({
  ran: new Date().toISOString(), source: SOURCE_NAME, bytes: rawText.length, chunks: chunks.length,
  referents: index.referents.size, groundFacts, propositions: atomRows,
  recombined: recombined.map((a) => ({ typing: a.typing, text: a.text })), projected,
}, null, 1));
console.log(`  result -> ${outPath}`);
