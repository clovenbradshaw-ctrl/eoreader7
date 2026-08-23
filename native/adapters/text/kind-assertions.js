import { diaNorm } from "./surfaces.js";

const freeze = (value) => Object.freeze(value);
const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const slug = (value) => diaNorm(value).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Received English grammar fact, not a mined semantic list. The prior says
 * only which forms of BE can head an explicit copular classification and
 * which determiners introduce the predicate nominal. It does not say what
 * any noun means or which entity belongs to which kind.
 */
export const ENGLISH_COPULAR_KIND_PRIOR = freeze({
  schema: "EOGrammarPrior@1",
  language: "eng",
  giver: "lang/en",
  copulas: freeze(["is", "are", "was", "were", "be", "been", "being"]),
  indefiniteDeterminers: freeze(["a", "an"]),
});

function nounStanding(form, posPrior) {
  const counts = posPrior?.forms?.[diaNorm(form)];
  if (!counts) return null;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const nounShare = total ? (counts.NOUN ?? 0) / total : 0;
  return nounShare > 0.5 ? freeze({ nounShare, counts: freeze({ ...counts }), giver: posPrior.provenance?.source ?? null }) : null;
}

function referentCandidates(referents = []) {
  const byId = new Map();
  for (const ref of referents) {
    if (ref?.schema !== "EOReferent@1" || !ref.id) continue;
    if (!byId.has(ref.id)) byId.set(ref.id, ref);
  }
  return [...byId.values()];
}

/**
 * Return only explicit type assertions witnessed in this encounter.
 *
 * This is deliberately narrow. It will miss many valid classifications, but
 * it will not promote lexical recurrence, adjective similarity, or a model's
 * guess into Kind. Cross-language support should add a giver-named grammar
 * prior rather than widening this English rule by assumption.
 */
export function explicitKindAssertions(text, {
  sequencePosition = 0,
  referents = [],
  posPrior = null,
  grammarPrior = ENGLISH_COPULAR_KIND_PRIOR,
} = {}) {
  if (grammarPrior?.schema !== "EOGrammarPrior@1" || !grammarPrior?.giver) throw new TypeError("grammarPrior must be a giver-named EOGrammarPrior@1");
  if (posPrior && (posPrior.schema !== "POSPrior@1" || !posPrior.provenance?.source)) throw new TypeError("posPrior must be a giver-named POSPrior@1");
  if (!posPrior?.forms) return [];
  const copulas = new Set(grammarPrior.copulas ?? []);
  const determiners = new Set(grammarPrior.indefiniteDeterminers ?? []);
  const out = [];
  let ordinal = 0;

  for (const ref of referentCandidates(referents)) {
    for (const surface of ref.surfaces ?? []) {
      const needle = String(surface ?? "").trim();
      if (!needle) continue;
      const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapeRe(needle)})(?=[^\\p{L}\\p{N}]|$)`, "igu");
      let match;
      while ((match = re.exec(String(text ?? ""))) !== null) {
        const subjectStart = match.index + match[1].length;
        const afterStart = subjectStart + match[2].length;
        const tail = String(text ?? "").slice(afterStart);
        const words = [...tail.matchAll(WORD_RE)].slice(0, 6);
        if (words.length < 3) continue;
        const copula = diaNorm(words[0][0]);
        const determiner = diaNorm(words[1][0]);
        if (!copulas.has(copula) || !determiners.has(determiner)) continue;

        // The predicate noun may be preceded by one or two modifiers. POS is
        // received evidence about grammatical standing, not semantic type.
        let predicate = null;
        for (const token of words.slice(2, 5)) {
          const standing = nounStanding(token[0], posPrior);
          if (!standing) continue;
          predicate = { surface: token[0], offset: afterStart + token.index, standing };
          break;
        }
        if (!predicate) continue;
        const kindSurface = predicate.surface;
        const kindKey = `kind-surface:${slug(kindSurface) || "unknown"}`;
        const id = `kind-assertion:${sequencePosition}:${ordinal}`;
        ordinal += 1;
        out.push(freeze({
          schema: "EOKindAssertion@1",
          id,
          terrain: "Kind",
          eo: freeze({ op: "SIG", grain: "Pattern" }),
          subject: ref.id,
          kindSurface,
          kindKey,
          standing: "witnessed_explicit_classification",
          witness: `text:${sequencePosition}:${subjectStart}`,
          anchor: freeze({ start: subjectStart, end: predicate.offset + kindSurface.length }),
          provenance: freeze({
            giver: grammarPrior.giver,
            grammarPrior: grammarPrior.schema,
            posPrior: predicate.standing.giver,
            basis: "explicit_copular_predicate_nominal",
          }),
        }));
      }
    }
  }
  return freeze(out);
}
