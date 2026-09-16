// reader-bundle.js — the engine's OWN relation-reader bundle, built from
// native organs and native priors (ONE-ENGINE-PLAN: the-fold's browser
// chat must not need to assemble this; the engine already has every piece).
//
// This is the same RELATION_READER_OPTIONS the-fold's app.js builds at
// app.js:915, but sourced entirely from this repo's native/ tree — the
// fold's version reaches into `/engine-v7` for the same files, so there is
// exactly one implementation of "the material's own edges" once this is
// what the proxy turn feeds its reading surface from. Priors come from
// native/priors/ (pos-eng.json, morphology-eng.json) and the fold's
// committed fixtures (unimorph-morphology-prior.json), read once and
// cached — the same data-gated posture app.js uses (exact match until the
// prior resolves; byte-identical to a bare reader when a file is missing).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { makeRelationReader } from "../organs/hypergraph.js";
import { chunkSource, tokenize, blankLabelRows } from "../organs/source.js";
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";
import { resolvePronouns } from "../adapters/text/pronouns.js";
import { discoverRelationVocab, extractRelations } from "../adapters/text/relations.js";
import { createLemmatizer, morphologyFromPrior } from "../adapters/text/morphology.js";
import * as P from "../adapters/text/priors.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIORS = path.join(HERE, "..", "priors");

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

// The received closed classes (lang/en) — the same ones app.js injects.
const DETERMINERS = new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]);
const NEGATION_WORDS = P.NEGATION_WORDS;
const FIRST_PERSON = P.FIRST_PERSON;

// Received priors, loaded once, never re-read per turn. `posPrior` gates
// the relation vocabulary at the TYPE level; `morph`/`verbForms` widen
// verb identity to the same act (took→take). Both are data-gated: absent
// files leave the reader bare (exact-match only), byte-identical to the
// fold's own behavior before its fetches resolve.
let _cache = null;
function loadPriors() {
  if (_cache) return _cache;
  const posPrior = readJson(path.join(PRIORS, "pos-eng.json"), null);
  const morphRaw = readJson(path.join(PRIORS, "morphology-eng.json"), null);
  const unimorphRaw = readJson(path.join(HERE, "..", "eval", "the-fold", "fixtures", "unimorph-morphology-prior.json"), null);
  const morph = morphRaw ? morphologyFromPrior(morphRaw) : null;
  const unimorph = unimorphRaw ? morphologyFromPrior(unimorphRaw) : null;
  const prior = morph ?? unimorph;
  const forms = new Set();
  for (const source of [morph?.forms, unimorph?.forms]) {
    for (const k of Object.keys(source ?? {})) {
      forms.add(String(k).toLowerCase());
      const v = source[k];
      for (const x of Array.isArray(v) ? v : [v]) if (typeof x === "string") forms.add(x.toLowerCase());
    }
  }
  const lemmatizer = prior ? createLemmatizer(prior.forms, { language: prior.language }) : null;
  _cache = { posPrior, verbForms: forms.size ? forms : null, lemmatizer };
  return _cache;
}

/** The engine's own relation reader — `reader(list)` → the reader `read(answer)` returns per-sentence claims with verdicts and addresses. */
export function makeEngineRelationReader(extra = {}) {
  const { posPrior, verbForms, lemmatizer } = loadPriors();
  return makeRelationReader({
    splitSentences,
    extractSurfaces,
    discoverReferents,
    namesCorefer,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize,
    // TYPE-level vocabulary gate (the fold's own measured decision: junk
    // connectors 18 → 0 with the prior in place).
    posPriorFor: () => posPrior,
    verbForms,
    oovLexicon: verbForms,
    determiners: DETERMINERS,
    negationWords: NEGATION_WORDS,
    firstPerson: FIRST_PERSON,
    // Received morphology prior — "underwent" answers material that only
    // wrote "undergoes" as the same claim, never a second mechanism.
    ...(lemmatizer ? { createLemmatizer: () => ({ sameAct: (a, b) => lemmatizer.sameAct(a, b) }), morphologyIndex: {} } : {}),
    // Wikipedia infobox furniture — never read as prose by the clause
    // extractor (the same declared numbers app.js uses).
    blankFurniture: (text) => blankLabelRows(text, { minRun: 4, maxCell: 60 }),
    resolvePronouns,
    nounPhraseSubjects: true,
    phrasalPredicates: true,
    ...extra,
  });
}

/** A fresh reader over a list of passages (chunk-shaped or surfaced segments). */
export function engineRelationsFor(list, extra = {}) {
  const reader = makeEngineRelationReader(extra);
  const passages = (list ?? []).map((p) => {
    if (p && typeof p === "object" && p.text && (p.ref ?? p._ledger?.source)) {
      return { ref: String(p.ref ?? p._ledger.source), text: p.text };
    }
    if (typeof p === "string") return { ref: "surf", text: p };
    return p;
  });
  const joined = passages.map((p) => p.text).join("\n\n");
  return reader(chunkSource("material", joined, {}));
}

export { chunkSource };