// native/kernel/merge-standing.js — A MERGE IS A HYPOTHESIS, A POSITION IS ITS
// ATTACK (2026-09-28). Medium-blind, kernel-level. Standing: nomination.
//
// The cast's name-variant coreference MERGES two surfaces into one being
// ("Pierre Bezúkhov" into "Count Bezúkhov", under the title). The material's
// own occupancy testimony says that locus is HELD — by two distinct occupant
// referents. Both are evidence; neither is a verdict. This organ turns them
// into the identity organ's own vocabulary, so that kernel/identity.js's
// `deriveIdentityRevision` does the judging with the operators it already
// owns:
//   a merge      -> a SUPPORT of the identity alternative (left = the absorbed
//                   surface, right = the surviving one): CON·Figure, the
//                   alternative opened or strengthened, on the fold
//   a position   -> an ATTACK on every alternative that names that locus,
//                   once the locus has >= minOccupants distinct occupants:
//                   SEG·Figure, the alternative split to `distinct`, plus the
//                   DEF exclusion identity.js already lands
// Nothing here decides; nothing here names a medium. `minOccupants` is the
// caller's (P4) — positionsByPattern's own floor is 2 (one arrival has no
// co-arrival to test), and a caller that wants stricter says so.

export const MERGE_STANDING_SCHEMA = "EOMergeStanding@1";

/**
 * mergeEvidence({ merges, standings, witness, minOccupants })
 *   merges:    [{ surface, into, witness?, basis? }]
 *   standings: [{ locus, occupant, witness? }]   (locus and occupant are referent ids or surfaces — the SAME
 *                                               vocabulary the merges use; the caller keys them)
 * -> { supports, attacks, positions, schema }
 */
export function mergeEvidence({ merges = [], standings = [], witness = null, minOccupants } = {}) {
  if (!Number.isInteger(minOccupants) || minOccupants < 1) throw new TypeError("mergeEvidence: minOccupants is declared — how many holders make a position is never a default");
  const supports = merges.filter((m) => m?.surface && m?.into && m.surface !== m.into).map((m) => ({ left: m.surface, right: m.into, witness: m.witness ?? witness, reason: m.basis ?? "name_variant_merge" }));
  const byLocus = new Map();
  for (const s of standings) { if (!s?.locus || !s?.occupant) continue; if (!byLocus.has(s.locus)) byLocus.set(s.locus, { occupants: new Set(), witnesses: [] }); const e = byLocus.get(s.locus); e.occupants.add(s.occupant); if (s.witness) e.witnesses.push(s.witness); }
  const positions = [...byLocus].filter(([, e]) => e.occupants.size >= minOccupants).map(([locus, e]) => ({ locus, occupants: [...e.occupants], witnesses: e.witnesses }));
  const attacks = [];
  for (const p of positions) for (const m of merges) {
    if (m?.surface !== p.locus && m?.into !== p.locus) continue;
    attacks.push({ left: m.surface, right: m.into, witness: p.witnesses[0] ?? witness, reason: `position_held_by_${p.occupants.length}: a locus with ${p.occupants.length} distinct occupants is not one being` });
  }
  return Object.freeze({ schema: MERGE_STANDING_SCHEMA, supports: Object.freeze(supports), attacks: Object.freeze(attacks), positions: Object.freeze(positions) });
}
