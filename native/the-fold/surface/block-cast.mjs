// block-cast.mjs — THE CAST (Entity · Kind · Existence·Figure/Pattern).
//
// Fold invariant: IDENTITY IS TYPED, NEVER GUESSED. The cast discovers the
// beings the retained texts distinguish (referents from surfaces) and
// resolves names to them — and REFUSES to conflate a disjoint alias ("MTA"
// 2016 vs "WeGo" 2022) until a received prior with a named giver supplies
// the bridge. This block wraps the kernel's own identity organs
// (native/organs/cast.js makeReferentIndex) and projects the same
// resolveIn(text) contract the production fold uses (proxy-runner.mjs).
import { makeReferentIndex } from "../../organs/cast.js";
import { splitSentences } from "../../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../../adapters/text/surfaces.js";

export const CAST_SCHEMA = "EOCast@1";

const NON_BEING = /\b(?:what|which|who|whom|whose|where|when|why|how|do|does|did|i|me|my|you|your|we|us|our|it|its|he|she|they|them|the|a|an|is|are|am|have|has|had|was|were|be|been|being|to|of|in|on|at|for|with)\b/i;

/**
 * castTexts({ texts }) -> { schema, referents, resolve, represent, resolveIn }
 * `texts` = [{ name, text }] — one passage per retained document. The index
 * resolves over the union; resolveIn projects the production fold's contract
 * (never a scan — the engine's own identity organs, function words refused).
 */
export function castTexts({ texts }) {
  const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const index = indexFor(texts.map((t) => ({ text: `${t.name}\n${t.text}` })));
  const resolveIn = (text) => {
    const ids = new Set();
    for (const w of String(text).match(/\b[A-Z][A-Za-z']{2,}\b/g) ?? []) {
      if (NON_BEING.test(w)) continue;
      for (const id of index.resolve(w)) ids.add(id);
    }
    return ids;
  };
  return {
    schema: CAST_SCHEMA,
    referents: index.referents,
    resolve: index.resolve,
    represent: index.represent,
    resolveIn,
  };
}