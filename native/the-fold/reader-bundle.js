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
import { relationExtractorsFor } from "../adapters/text/relations-language.js";
import { classifyWord, dominantClass } from "../adapters/text/wordclass.js";
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

// THE LANGUAGE DISPATCH (2026-09-23): this bundle's own header says it
// exists so there is "exactly one implementation of the material's own
// edges" once the proxy turn reads from it — but it had been left on the
// older adapters/text/relations.js import while the-fold's own app.js
// (RELATION_READER_OPTIONS, app.js:988) had already migrated to this
// dispatch. Confirmed drift, found and reproduced live by a peer session's
// pipeline audit (native/eval/lens-direction.mjs) and independently
// verified here against both repos' real committed source. GFP mode, not
// SVO: mirrors app.js's own dispatchExtractors exactly, including its
// `roleConfig: null` — app.js's own SVO_DECLARED constant is hardcoded
// false there because a direct, disclosed measurement (2026-09-20) found
// the English positional/SVO reader failing on real prose ("Ulysses S.
// Grant was born in Point Pleasant, Ohio, in 1822" → zero edges); a role
// grammar is earned, never implied, and it has not been earned yet.
let _dispatch = null;
function dispatchExtractors() {
  return _dispatch ?? (_dispatch = relationExtractorsFor({ language: "eng", roleConfig: null, posPrior: null, classifyWord, dominantClass }));
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
    // Read at CALL time, not bound at construction (app.js's own comment,
    // reused verbatim): a reader built once picks up any later dispatch
    // change with no re-construction. `extractorsMode: "dispatch"` tells
    // hypergraph.js's own vocabulary gate that these extractors are
    // self-gating BY DESIGN (GFP's own discoverRelationVocab, unlike the
    // old relations.js, is not meant to pre-populate a verb set) — without
    // it, an empty vocabulary would silence every edge.
    discoverRelationVocab: (...a) => dispatchExtractors().discoverRelationVocab(...a),
    extractRelations: (...a) => dispatchExtractors().extractRelations(...a),
    extractorsMode: "dispatch",
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