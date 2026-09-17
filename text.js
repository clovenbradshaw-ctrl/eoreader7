// Canonical EOReader 7 text adapter.
// New text applications import here rather than through legacy engine paths.
export { stripContainer, splitSentences, deriveAbbreviations, looksLikeMaterial } from "./native/adapters/text/spans.js";
export { createCausalTextPerceiver, textEncounters } from "./native/adapters/text/recursive.js";
export { reviseTextFold } from "./native/adapters/text/revision.js";
export { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "./native/adapters/text/surfaces.js";
export { discoverRelationVocab, extractRelations } from "./native/adapters/text/relations.js";
export { extractGfpRelations, discoverGfpVocabulary } from "./native/adapters/text/relations-gfp.js";
export { relationExtractorsFor } from "./native/adapters/text/relations-language.js";
export { makeGrainTyper, cellLabelOf, GRAIN_BY_THRAX } from "./native/adapters/text/grain-typing.js";
