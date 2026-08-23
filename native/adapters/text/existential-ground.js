const freeze = (value) => Object.freeze(value);
const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const norm = (value) => String(value ?? "").normalize("NFKC").toLowerCase().replace(/[’]/g, "'");

/**
 * Received English grammar fact for a deliberately narrow negative-existential
 * construction. This does not equate Void with negation: it merely identifies
 * a linguistic form that explicitly supplies a bounded existential ground in
 * which an absence is asserted.
 */
export const ENGLISH_NEGATIVE_EXISTENTIAL_PRIOR = freeze({
  schema: "EOGrammarPrior@1",
  language: "eng",
  giver: "lang/en",
  heads: freeze([
    freeze(["there", "is", "no"]),
    freeze(["there", "are", "no"]),
    freeze(["there", "was", "no"]),
    freeze(["there", "were", "no"]),
  ]),
});

function nounStanding(form, posPrior) {
  const counts = posPrior?.forms?.[norm(form)];
  if (!counts) return null;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const nounShare = total ? (counts.NOUN ?? 0) / total : 0;
  return nounShare > 0.5 ? freeze({ nounShare, giver: posPrior.provenance?.source ?? null }) : null;
}

/**
 * Witness explicitly bounded absence grounds such as “there was no answer”.
 *
 * The returned object is the local existential Ground, not the missing thing
 * and not a NUL transformation. It therefore carries terrain=Void directly
 * and intentionally carries no stance: the terrain must not smuggle in a mode.
 */
export function explicitExistentialGrounds(text, {
  sequencePosition = 0,
  encounterRef = `encounter:${sequencePosition}`,
  posPrior = null,
  grammarPrior = ENGLISH_NEGATIVE_EXISTENTIAL_PRIOR,
} = {}) {
  if (grammarPrior?.schema !== "EOGrammarPrior@1" || !grammarPrior?.giver) throw new TypeError("grammarPrior must be a giver-named EOGrammarPrior@1");
  if (posPrior && (posPrior.schema !== "POSPrior@1" || !posPrior.provenance?.source)) throw new TypeError("posPrior must be a giver-named POSPrior@1");
  if (!posPrior?.forms) return freeze([]);

  const tokens = [...String(text ?? "").matchAll(WORD_RE)].map((match) => ({ raw: match[0], value: norm(match[0]), index: match.index }));
  const out = [];
  let ordinal = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    for (const head of grammarPrior.heads ?? []) {
      if (head.some((word, j) => tokens[i + j]?.value !== word)) continue;
      const after = i + head.length;
      let absent = null;
      // Permit a small modifier window, but require the absent figure's head to
      // be independently NOUN-dominant under the named POS giver.
      for (const token of tokens.slice(after, after + 4)) {
        const standing = nounStanding(token.raw, posPrior);
        if (!standing) continue;
        absent = { ...token, standing };
        break;
      }
      if (!absent) continue;
      const start = tokens[i].index;
      const end = absent.index + absent.raw.length;
      out.push(freeze({
        schema: "EOExistentialGround@1",
        id: `existential-ground:${sequencePosition}:${ordinal}`,
        terrain: "Void",
        standing: "witnessed_explicit_absence_ground",
        witnessed: true,
        scopeRef: encounterRef,
        absenceSurface: absent.raw,
        anchor: freeze({ start, end }),
        witness: `text:${sequencePosition}:${start}`,
        provenance: freeze({
          giver: grammarPrior.giver,
          grammarPrior: grammarPrior.schema,
          posPrior: absent.standing.giver,
          basis: "explicit_negative_existential",
        }),
      }));
      ordinal += 1;
      i = Math.max(i, after - 1);
      break;
    }
  }
  return freeze(out);
}
