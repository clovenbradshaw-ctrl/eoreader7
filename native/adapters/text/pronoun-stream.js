import { tokens, codeOf, recall, encodeFrame } from "../../memory/activation.js";
import { THIRD_PERSON_SINGULAR } from "./priors.js";
import { diaNorm } from "./surfaces.js";

const freeze = (value) => Object.freeze(value);
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PRONOUN_RE = /\b(he|him|his|himself|she|her|hers|herself)\b/gi;
const CLAUSE_OPENER_RE = /\b(?:that|which|who|whom|whose|because|although|though|while|when|whether|unless|since|before|after|until|if|to)\b/i;

const sameClause = (text, i, j) => {
  const [lo, hi] = i <= j ? [i, j] : [j, i];
  const between = text.slice(lo, hi);
  if (/[,;:"“”]/.test(between)) return false;
  return !CLAUSE_OPENER_RE.test(between);
};

const pronounsIn = (text) => [...String(text ?? "").matchAll(PRONOUN_RE)].map((m) => freeze({
  token: m[0].toLowerCase(),
  gender: THIRD_PERSON_SINGULAR[m[0].toLowerCase()],
  index: m.index,
}));

function namedMatchesIn(text, referentSurfaces) {
  const names = [...referentSurfaces.keys()].filter(Boolean).sort((a, b) => b.length - a.length);
  if (!names.length) return [];
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${names.map(escapeRe).join("|")})(?:['’]s?)?(?![\\p{L}\\p{N}])`, "giu");
  const matches = [];
  for (const m of String(text ?? "").matchAll(re)) {
    const bare = diaNorm(m[0].replace(/['’]s?$/i, ""));
    const ref = referentSurfaces.get(bare);
    if (ref) matches.push(freeze({ ref, index: m.index, surface: m[0] }));
  }
  return matches;
}

/**
 * Stateful form of pronouns.js::resolvePronouns for a recursive reader.
 *
 * Same operating semantics: causal one-hop activation, recall before encode,
 * explicit floor and margin, derived hard gender filter, and refusal when a
 * pronoun shares its sentence with a named surface. The only difference is
 * lifecycle: one sentence enters at a time so the reader never replays its
 * whole prefix merely to resolve the present sentence.
 */
export function createCausalPronounResolver({
  minActivation,
  minMargin,
  idfFloor,
  minLen,
  completion = 0.5,
  topEdges = 6,
  edgeSlots = 24,
  nonPersonal = [],
} = {}) {
  if (!Number.isFinite(minActivation) || minActivation < 0)
    throw new TypeError("createCausalPronounResolver: minActivation must be explicitly declared");
  if (!Number.isFinite(minMargin) || minMargin < 0 || minMargin > 1)
    throw new TypeError("createCausalPronounResolver: minMargin must be explicitly declared");

  const state = { df: new Map(), gramDf: new Map(), posting: new Map(), edges: new Map(), read: 0 };
  const namedByFrame = new Map();
  const genderEvidence = new Map();
  const nonPersonalSet = nonPersonal instanceof Set ? nonPersonal : new Set(nonPersonal);

  const referentGender = (ref) => {
    const evidence = genderEvidence.get(ref);
    if (!evidence) return "unknown";
    if (evidence.m > 0 && evidence.f === 0) return "m";
    if (evidence.f > 0 && evidence.m === 0) return "f";
    return "unknown";
  };

  function step(sentence, referentSurfaces = new Map()) {
    const surfaceMap = referentSurfaces instanceof Map ? referentSurfaces : new Map(Object.entries(referentSurfaces ?? {}));
    const normalizedMap = new Map([...surfaceMap].map(([surface, ref]) => [diaNorm(surface), ref]));
    const text = String(sentence?.text ?? "");
    const order = sentence?.order ?? state.read;
    const absoluteOffset = sentence?.offset ?? 0;
    const ws = tokens(text);
    const { trace, cue } = codeOf(ws, state, { minLen, idfFloor });
    const namedMatches = namedMatchesIn(text, normalizedMap);
    const named = new Set(namedMatches.map((item) => item.ref));
    const pronounHits = pronounsIn(text);
    const bindings = [];
    const gaps = [];

    if (named.size === 0 && pronounHits.length) {
      const activation = recall(cue, state, { completion, topEdges, selfOrder: order });
      const referentScore = new Map();
      for (const [priorOrder, amount] of activation) {
        for (const ref of namedByFrame.get(priorOrder) ?? []) {
          if (amount > (referentScore.get(ref) ?? -Infinity)) referentScore.set(ref, amount);
        }
      }

      for (const hit of pronounHits) {
        const candidates = [...referentScore.entries()]
          .filter(([ref]) => !nonPersonalSet.has(ref))
          .filter(([ref]) => {
            const gender = referentGender(ref);
            return gender === "unknown" || gender === hit.gender;
          })
          .sort((a, b) => b[1] - a[1]);

        if (!candidates.length) {
          gaps.push(freeze({ reason: "pronoun_no_candidate", pronoun: hit.token, index: hit.index, offset: absoluteOffset + hit.index }));
          continue;
        }
        const [topRef, topScore] = candidates[0];
        if (topScore < minActivation) {
          gaps.push(freeze({ reason: "pronoun_below_floor", pronoun: hit.token, index: hit.index, offset: absoluteOffset + hit.index, top: topRef, activation: topScore }));
          continue;
        }
        const second = candidates[1]?.[1] ?? 0;
        const margin = topScore > 0 ? (topScore - second) / topScore : 0;
        if (margin < minMargin) {
          gaps.push(freeze({ reason: "pronoun_no_margin", pronoun: hit.token, index: hit.index, offset: absoluteOffset + hit.index, top: topRef, runnerUp: candidates[1]?.[0] ?? null, margin }));
          continue;
        }
        bindings.push(freeze({
          referentId: topRef,
          sentenceOrder: order,
          index: hit.index,
          offset: absoluteOffset + hit.index,
          pronoun: hit.token,
          gender: hit.gender,
          activation: topScore,
          margin,
          provenance: freeze({ giver: "text/pronoun-stream::createCausalPronounResolver", basis: "one-hop activation recall over already-admitted named referents" }),
        }));
      }
    }

    if (named.size === 1 && pronounHits.length) {
      const [only] = named;
      const namingPositions = namedMatches.filter((item) => item.ref === only).map((item) => item.index);
      const evidence = genderEvidence.get(only) ?? { m: 0, f: 0 };
      for (const hit of pronounHits) {
        if (namingPositions.some((index) => sameClause(text, index, hit.index))) evidence[hit.gender] += 1;
      }
      genderEvidence.set(only, evidence);
    }

    namedByFrame.set(order, named);
    encodeFrame(state, order, ws, trace, { edgeSlots });
    return freeze({ bindings: freeze(bindings), gaps: freeze(gaps), named: freeze([...named]) });
  }

  return Object.freeze({ step, readCount: () => state.read });
}
