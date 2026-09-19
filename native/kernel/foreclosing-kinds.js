// native/kernel/foreclosing-kinds.js — the hyperlexicon-kind EXISTENCE face.
// Handle: Xushen's own rule, applied to the harm shape — the judgment is a
// DICTIONARY reading (the kind), never a word list standing in for a verdict.
//
// WHAT THIS IS. The harm shape (organs/askshape.js) has two faces. The
// INTERPRETATION face reads how an ask would treat a standpoint that still
// stands (dismiss its experience / flatten its identity / override its say).
// The EXISTENCE face reads the deeper foreclosure: an ask whose realization is
// to END a standpoint — a means to void one, sought as capacity. Falsification
// (2026-09-19) proved the person-end detector fails both ways: 15/40 overfire
// on benign beneficiary constructions ("build an app for users") and 10/12
// leak on weapon construction with no person named ("how to build a bomb").
// The honest arm is the KIND of the construction's object: is it a
// FORECLOSING KIND — a means whose realization realizes the ENDING of a
// charter-protected right (life / liberty / security of person)?
//
// THE GIVEN AFFORDANCE TIER. This module IS that tier. It holds a small
// hyperlexicon of KIND referents — each with the multilingual surfaces that
// ATTEST it (the dictionary's own work; surfaces are data here, exactly as in
// the language lenses) and the charter-protected right(s) its realization
// ENDS. The charter family (organs/charter.js::familyAffordances) protects
// those rights; the reaction substrate (kernel/reaction.js) is the circuit:
//
//   kind --realizes_ending--> right --protected_by--> protect
//            ∘ (given chemistry: realizes_ending ∘ protected_by => forecloses)
//                    ⇒ the KIND FORECLOSES
//
// The verdict is COMPOSED, never listed: a surface resolves foreclosing only
// when the reaction derives the foreclosing edge — which requires the kind's
// ending-capacity edge AND a charter protection edge AND the given chemistry
// row. Pull any one and it withholds. That is the "an unlicensed composition
// is withheld" law the reaction substrate already runs, made the existence
// face's honest signal: a noun the tier does not resolve is a COVERAGE GAP,
// disclosed, never silently re-classified as verified-benign.
//
// THE GRAIN LAW, inherited whole (reaction.js): nothing here ADDS chemistry —
// the given tier is given (Xushen's dictionary, attested surfaces), and the
// reaction reads it. The charter ground is injected (the caller's charter, or
// this module's own UDHR default when none is supplied), so a substrate never
// runs ungoverned.

import { hyperedge } from "./hypergraph.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "./hyperlexicon.js";
import { createReactionSubstrate } from "./reaction.js";
// The kernel's own hashing convention (for-whom.js imports node:crypto's
// createHash the same way); the project's short-digest is the first 32 hex.
import { createHash } from "node:crypto";

const ENDS = "realizes_ending";
const PROTECTED_BY = "protected_by";
const FORECLOSES = "forecloses";
const ACT = "protect";

// The charter-protected rights a foreclosing means realizes the ENDING of.
// UDHR Article 3's own rights ("life, liberty and security of person") — the
// minimal ending-relations this tier composes against. A kind that ends none
// of these is not foreclosing; a kind that ends one composes here.
export const PROTECTED_RIGHTS = Object.freeze(["life", "liberty", "security of person"]);

// The KIND TIER — the hyperlexicon's given dictionary. Each kind names the
// charter-protected right(s) its realization ENDS, and the multilingual
// surfaces that attest it. `patterns` are the given surfaces, folded into the
// regular expressions that read them (word-anchored for space-separated
// scripts, plain substrings for CJK/Arabic/Devanagari where there is no word
// boundary — the same convention the multilingual lens already documents).
// A surface is DATA (attested usage), never a verdict: alone it is a
// nomination; the reaction composes it into the judgment.
export const FORECLOSING_KIND_TIER = Object.freeze({
  explosive_device: {
    giver: "hyperlexicon kind tier (Xushen) — attested surfaces, given",
    ends: Object.freeze(["life", "security of person"]),
    basis: "an explosive device whose only realization is to detonate — it realizes the ENDING of life and the security of person",
    patterns: Object.freeze([
      /\b(?:bombs?|pipe\s+bombs?|nail\s+bomb|car\s+bomb|pressure\s+cooker\s+bomb|petrol\s+bomb|explosive\s+devices?|improvised\s+explosive\s+devices?|ieds?|explosives?|bomb\w*|bombę|rohrbomb\w*|pijpbom\w*|rörbomb\w*|pibebombe\w*|bomu)/iu,
      // "bom" is its own surface in Indonesian/Vietnamese — a standalone word
      // (no trailing \b: "bombę"'s non-ASCII tail has no ASCII word boundary).
      /\bbom\b/iu,
      /бомб/iu,
      /炸弹/,
      /爆弾/,
      /폭탄/,
      /قنبلة/,
      /بمب/,
      /बम/,
      /ระเบิด/,
      /βόμβ/iu,
      /פצצ\w*/iu,
    ]),
  },
  incendiary_means: {
    giver: "hyperlexicon kind tier (Xushen) — attested surfaces, given",
    ends: Object.freeze(["life", "security of person"]),
    basis: "an incendiary device whose only realization is to burn — it realizes the ENDING of life and the security of person",
    patterns: Object.freeze([
      /\b(?:incendiary\s+(?:devices?|weapons?|bombs?|mixtures?|munitions?|charges?|compounds?)|molotov(?:\s+cocktails?)?)\b/iu,
    ]),
  },
  chemical_agent: {
    giver: "hyperlexicon kind tier (Xushen) — attested surfaces, given",
    ends: Object.freeze(["life", "security of person"]),
    basis: "a chemical warfare agent whose only realization is to incapacitate or kill — it realizes the ENDING of life and the security of person",
    patterns: Object.freeze([
      /\b(?:nerve\s+(?:agent|gas)|chemical\s+weapons?|chemical\s+warfare\s+agents?|sarin|soman|tabun|\bvx\b|mustard\s+(?:gas|agents?)|weapon\s+of\s+mass\s+destruction)\b/iu,
    ]),
  },
  biological_agent: {
    giver: "hyperlexicon kind tier (Xushen) — attested surfaces, given",
    ends: Object.freeze(["life", "security of person"]),
    basis: "a weaponized biological agent whose only realization is to sicken or kill in multitude — it realizes the ENDING of life and the security of person",
    patterns: Object.freeze([
      /\b(?:biological\s+weapons?|bioweapons?|weaponi[sz]ed?\s+(?:pathogen\w*|viruses?|bacteri\w*|anthrax|smallpox|plague|toxins?|agents?)|lethal\s+pathogen\w*)\b/iu,
    ]),
  },
  nuclear_weapon: {
    giver: "hyperlexicon kind tier (Xushen) — attested surfaces, given",
    ends: Object.freeze(["life", "security of person"]),
    basis: "a nuclear device whose only realization is to annihilate — it realizes the ENDING of life and the security of person",
    patterns: Object.freeze([
      /\b(?:nuclear\s+(?:weapons?|devices?|bombs?|explosives?|warheads?)|atom(?:ic)?\s+bombs?|thermonuclear|hydrogen\s+bombs?|dirty\s+bombs?|radiological\s+(?:dispersal\s+)?(?:devices?|weapons?)|fissile\s+material\w*|weapons?-grade|warheads?)\b/iu,
    ]),
  },
});

// The default ground: the UDHR Article-3 excerpt this module stands on when
// the caller supplies no charter. Same provenance posture as
// organs/charter.js's own fallback excerpt — a real public-domain byte string,
// hashed, so a substrate built on it is grounded (never ungrounded), and a
// caller that passes a real charter overrides it.
const DEFAULT_UDHR_EXCERPT = `Universal Declaration of Human Rights
Article 3
Everyone has the right to life, liberty and security of person.
`;

function defaultGround() {
  return {
    giver: "Universal Declaration of Human Rights — fallback excerpt (public domain); the foreclosing-kind tier's own default ground",
    protections: {
      "life, liberty and security of person": { surfaces: ["life, liberty and security of person"], articles: ["Article 3"] },
    },
    sha256: createHash("sha256").update(DEFAULT_UDHR_EXCERPT).digest("hex").slice(0, 32),
  };
}

// The rights a charter actually protects — resolved from ITS OWN protections,
// never assumed. A protection surface ("life, liberty and security of person")
// that contains a canonical right's words names that right as protected.
function protectedRights(charter) {
  if (!charter?.protections) return [];
  const surfaces = Object.values(charter.protections).flatMap((info) => info.surfaces ?? []);
  const joined = surfaces.join(" ").toLowerCase();
  return PROTECTED_RIGHTS.filter((r) => joined.includes(r.toLowerCase()));
}

// Substrates are built once per ground and reused — the tier is static, so a
// fresh ledger every call would be pure churn. Keyed by the ground's content
// hash (a passed charter, or the module's own default), so a caller that
// swaps the charter gets a substrate standing on the new ground.
const substrateCache = new Map();

function buildSubstrate(charter) {
  const ground = charter?.sha256 ? charter : defaultGround();
  const rights = protectedRights(ground);

  const entries = [];
  // 1. The kind tier's ending-capacity edges: each foreclosing kind realizes
  //    the ENDING of the protected right(s) its own given row names. Only
  //    kinds whose ends are among the rights THIS ground protects get their
  //    edge (a kind ending a right the ground does not protect is not
  //    foreclosing HERE — the composition withholds, which is the point of
  //    resolving against the charter).
  let n = 0;
  for (const [kind, info] of Object.entries(FORECLOSING_KIND_TIER)) {
    for (const right of info.ends ?? []) {
      if (!rights.includes(right)) continue;
      entries.push(hyperedge({
        id: `given:foreclosing-kind:${kind}:${right}`,
        relation: ENDS,
        participants: [
          { ref: kind, standing: "referent", role: null },
          { ref: right, standing: "referent", role: null },
        ],
        witness: `given-kind-tier:${kind}`,
        scope: { sequencePosition: n++ },
        meta: { given: true, tier: "foreclosing-kinds", kind, surfaces: info.surfaces ?? null },
      }));
    }
  }
  // 2. The charter family's protection edges: each protected right, bound to
  //    the real ground. The charter protects these — the kind composes against
  //    THIS ground, never a name.
  for (const right of rights) {
    entries.push(hyperedge({
      id: `charter:protects:${right}`,
      relation: PROTECTED_BY,
      participants: [
        { ref: right, standing: "referent", role: null },
        { ref: ACT, standing: "referent", role: null },
      ],
      witness: `charter-protects:${right}`,
      scope: { sequencePosition: n++ },
      meta: { given: true, binding: ground.sha256 ?? null, giver: ground.giver ?? null },
    }));
  }

  // 3. The reaction chemistry: a means that realizes the ending of a protected
  //    right IS a foreclosing kind. Stamped chemistry (a derivation rule, the
  //    reading's own chemistry path — reaction.js's licenseStanding keeps this
  //    tier apart from the moral license tier).
  const tierGiver = "foreclosing-kinds given tier";
  const chemistry = giveHyperlexiconAffordance(createHyperlexicon(), {
    left: ENDS,
    right: PROTECTED_BY,
    giver: tierGiver,
    meta: { chemistry: true, yields: FORECLOSES, basis: "a means that realizes the ENDING of a charter-protected right is a foreclosing kind" },
  });

  const substrate = createReactionSubstrate({ entries, hyperlexicon: chemistry, window: null, charter: { sha256: ground.sha256 } });
  return { substrate, ground, rights };
}

function substrateFor(charter) {
  const key = charter?.sha256 ?? "default";
  if (!substrateCache.has(key)) substrateCache.set(key, buildSubstrate(charter));
  return substrateCache.get(key);
}

// The surfaces that name a foreclosing kind, matched against the text — the
// construction object's kind surfaces, resolved from the tier. Returns the
// matched kind referents (deduped, in tier order).
export function foreclosingKindsInText(text) {
  const t = String(text ?? "").toLocaleLowerCase();
  const found = [];
  for (const [kind, info] of Object.entries(FORECLOSING_KIND_TIER)) {
    if (info.patterns.some((p) => p.test(t))) found.push(kind);
  }
  return found;
}

/**
 * resolveForeclosingKind(text, { charter }) — is the construction object a
 * FORECLOSING KIND? The lens's `voids` arm reads this; the judgment is
 * composed through the reaction substrate against the charter ground, never a
 * word list.
 *
 * Returns:
 *   foreclosing   true  — the surface resolved to a foreclosing kind AND the
 *                         reaction derived the foreclosing edge (kind ending
 *                         the right + the right protected by this charter).
 *                  false — no foreclosing kind resolved; the substrate
 *                          WITHHELD the composition (no ending-capacity edge
 *                          licensed for what the ask names).
 *   kind          the resolved foreclosing kind referent(s), or [] .
 *   coverageGap   true when nothing resolved — the honest signal: this is a
 *                 disclosed gap (an unlicensed composition is withheld), NOT a
 *                 verified non-foreclosing.
 *   derived       the reaction's derived facts (provenance: kind, right, the
 *                 two given edges, the chemistry giver).
 *   withheld      the reaction's withheld report.
 *   ground        the charter ground the composition stood on.
 */
export function resolveForeclosingKind(text, { charter = null } = {}) {
  const t = String(text ?? "");
  const kinds = foreclosingKindsInText(t);
  const { substrate, ground, rights } = substrateFor(charter);

  // Cue the resolved kinds (and the raw surfaces, so an unresolvable noun's
  // withheld standing is visible) and settle — presence gates the reaction.
  const cueRefs = [...new Set([...kinds, ...t.toLocaleLowerCase().split(/\W+/u).filter((w) => w.length >= 3)])];
  const settled = kinds.length
    ? substrate.settle({ cue: [...kinds], floor: 0, maxSteps: 6 })
    : substrate.settle({ cue: cueRefs, floor: 0, maxSteps: 3 });

  const forecloses = settled.derived.filter((f) => f.relation === FORECLOSES);
  if (kinds.length && forecloses.length) {
    return {
      foreclosing: true,
      kind: kinds,
      coverageGap: false,
      derived: settled.derived.map((f) => ({ relation: f.relation, from: f.from, to: f.to, giver: f.giver })),
      withheld: settled.withheld,
      ground: { sha256: ground.sha256 ?? null, giver: ground.giver ?? null },
      basis: `the construction object resolves to a FORECLOSING KIND (${kinds.join(", ")}): the reaction derived that its realization ends a charter-protected right (${forecloses.map((f) => f.to).join(", ")}), standing on ${ground.giver}`,
    };
  }
  // No foreclosing kind resolved — the reaction substrate WITHHELD the
  // composition (no given ending-capacity edge licensed the ask's object).
  // This is the honest signal for an arbitrary noun: a disclosed coverage gap,
  // never a re-classified pass. Benign constructions ("build an app for
  // users") pass HERE because no foreclosing kind was named — not because the
  // reader verified "app" cannot end a right.
  return {
    foreclosing: false,
    kind: [],
    coverageGap: true,
    derived: [],
    withheld: settled.withheld,
    ground: { sha256: ground.sha256 ?? null, giver: ground.giver ?? null },
    basis: `no construction object resolved to a foreclosing kind: the reaction substrate withheld the composition (an unlicensed composition is withheld). Pass is a DISCLOSED COVERAGE GAP, not a verified non-foreclosing — kind resolution of an arbitrary noun is not yet possible; ${rights.join(", ")} are the protected rights this ground composes against.`,
  };
}