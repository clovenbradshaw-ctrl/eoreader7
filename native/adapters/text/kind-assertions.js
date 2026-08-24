import { diaNorm } from "./surfaces.js";
import { kindEvidence } from "../../kernel/kind-induction.js";

const freeze = (value) => Object.freeze(value);
const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const slug = (value) => diaNorm(value).replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Received English grammar fact, not a mined semantic list. The prior says
 * only which forms of BE can head an explicit copular classification and
 * which determiners introduce an indefinite nominal. It does not say what
 * any noun means or which entity belongs to which kind.
 */
export const ENGLISH_COPULAR_KIND_PRIOR = freeze({
  schema: "EOGrammarPrior@1",
  language: "eng",
  giver: "lang/en",
  copulas: freeze(["is", "are", "was", "were", "be", "been", "being"]),
  indefiniteDeterminers: freeze(["a", "an"]),
});

function posStanding(form, posPrior) {
  const counts = posPrior?.forms?.[diaNorm(form)];
  if (!counts) return null;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (!total) return null;
  return freeze({
    counts: freeze({ ...counts }),
    total,
    nounShare: (counts.NOUN ?? 0) / total,
    adjectiveShare: (counts.ADJ ?? 0) / total,
    adverbShare: (counts.ADV ?? 0) / total,
    giver: posPrior.provenance?.source ?? null,
  });
}

function nounStanding(form, posPrior) {
  const standing = posStanding(form, posPrior);
  return standing?.nounShare > 0.5 ? standing : null;
}

function modifierStanding(form, posPrior) {
  const standing = posStanding(form, posPrior);
  if (!standing) return null;
  return standing.adjectiveShare > 0.5 || standing.adverbShare > 0.5 ? standing : null;
}

/**
 * Find the head noun of a compact indefinite nominal. We may cross only
 * giver-supported adjective/adverb modifiers. Verbs, adpositions,
 * conjunctions, unknown tokens, etc. close the phrase. This prevents a loose
 * "a/an ... any noun in the next four words" window from manufacturing
 * received classifications across grammatical boundaries.
 */
function indefiniteHead(tokens, posPrior, { maxTokens = 4 } = {}) {
  for (const token of tokens.slice(0, maxTokens)) {
    const noun = nounStanding(token[0], posPrior);
    if (noun) return { surface: token[0], offset: token.index, standing: noun };
    if (modifierStanding(token[0], posPrior)) continue;
    break;
  }
  return null;
}

function referentCandidates(referents = []) {
  const byId = new Map();
  for (const ref of referents) {
    if (ref?.schema !== "EOReferent@1" || !ref.id) continue;
    if (!byId.has(ref.id)) byId.set(ref.id, ref);
  }
  return [...byId.values()];
}

function validatePriors(posPrior, grammarPrior) {
  if (grammarPrior?.schema !== "EOGrammarPrior@1" || !grammarPrior?.giver) throw new TypeError("grammarPrior must be a giver-named EOGrammarPrior@1");
  if (posPrior && (posPrior.schema !== "POSPrior@1" || !posPrior.provenance?.source)) throw new TypeError("posPrior must be a giver-named POSPrior@1");
}

/**
 * Witness an indefinite nominal as an explicit reference to a repeatable form.
 *
 * "a man", "an animal", "a strange creature" can name a Kind even when the
 * discourse has not earned a stable particular referent for the instance. The
 * source-local possible-instance id records only the grammatical instantiation
 * carried by the phrase; it is not promoted to Entity terrain. The Kind kernel
 * receives the classification evidence and projects Kind present-tense.
 */
export function explicitIndefiniteKindReferences(text, {
  sequencePosition = 0,
  posPrior = null,
  grammarPrior = ENGLISH_COPULAR_KIND_PRIOR,
} = {}) {
  validatePriors(posPrior, grammarPrior);
  if (!posPrior?.forms) return [];
  const determiners = new Set(grammarPrior.indefiniteDeterminers ?? []);
  const words = [...String(text ?? "").matchAll(WORD_RE)];
  const out = [];
  let ordinal = 0;
  for (let i = 0; i < words.length; i += 1) {
    const determiner = diaNorm(words[i][0]);
    if (!determiners.has(determiner)) continue;
    const predicate = indefiniteHead(words.slice(i + 1), posPrior);
    if (!predicate) continue;
    const kindSurface = predicate.surface;
    const kindKey = `kind-surface:${slug(kindSurface) || "unknown"}`;
    const phraseStart = words[i].index;
    out.push(kindEvidence({
      id: `kind-evidence:indefinite:${sequencePosition}:${ordinal}`,
      entityRef: `possible-instance:text:${sequencePosition}:${ordinal}`,
      evidenceType: "explicit_classification",
      kindKey,
      kindSurface,
      sequencePosition,
      witness: `text:${sequencePosition}:${phraseStart}`,
      anchor: { start: phraseStart, end: predicate.offset + kindSurface.length },
      provenance: {
        modality: "text",
        giver: grammarPrior.giver,
        grammarPrior: grammarPrior.schema,
        posPrior: predicate.standing.giver,
        basis: "indefinite_nominal_instantiation",
        instanceStanding: "source_local_possible_instance",
      },
    }));
    ordinal += 1;
  }
  return freeze(out);
}

/**
 * Return explicit source classifications witnessed in this encounter.
 *
 * Crucially, these are EOKindEvidence records, not Kind terrain facts. Text is
 * one sense organ among many; its grammar may witness that a source classifies
 * an Entity or instantiates a possible member, but only the modality-blind Kind
 * kernel projects Kind into the current Fold. Cross-language support should add
 * a giver-named grammar prior rather than widening this English rule by assumption.
 */
export function explicitKindAssertions(text, {
  sequencePosition = 0,
  referents = [],
  posPrior = null,
  grammarPrior = ENGLISH_COPULAR_KIND_PRIOR,
} = {}) {
  validatePriors(posPrior, grammarPrior);
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
        const words = [...tail.matchAll(WORD_RE)].slice(0, 7);
        if (words.length < 3) continue;
        const copula = diaNorm(words[0][0]);
        const determiner = diaNorm(words[1][0]);
        if (!copulas.has(copula) || !determiners.has(determiner)) continue;

        const predicate = indefiniteHead(words.slice(2), posPrior);
        if (!predicate) continue;
        const predicateOffset = afterStart + predicate.offset;
        const kindSurface = predicate.surface;
        const kindKey = `kind-surface:${slug(kindSurface) || "unknown"}`;
        const id = `kind-evidence:explicit:${sequencePosition}:${ordinal}`;
        ordinal += 1;
        out.push(kindEvidence({
          id,
          entityRef: ref.id,
          evidenceType: "explicit_classification",
          kindKey,
          kindSurface,
          sequencePosition,
          witness: `text:${sequencePosition}:${subjectStart}`,
          anchor: { start: subjectStart, end: predicateOffset + kindSurface.length },
          provenance: {
            modality: "text",
            giver: grammarPrior.giver,
            grammarPrior: grammarPrior.schema,
            posPrior: predicate.standing.giver,
            basis: "explicit_copular_predicate_nominal",
          },
        }));
      }
    }
  }

  const indefinite = explicitIndefiniteKindReferences(text, { sequencePosition, posPrior, grammarPrior });
  return freeze([...out, ...indefinite]);
}
