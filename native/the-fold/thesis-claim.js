// thesis-claim.js — WHEN SEVERAL THESIS CANDIDATES ARE THE SAME CLAIM
// (2026-09-25). arrange.js's thesis has always been a SELECTION: the one
// general, non-contrastive, subject-only statement whose words recur most.
// This file asks one further question, before that selection is trusted as
// final: do several of the eligible candidates recur not just in WORDS but
// as the SAME CLAIM — the same relation, over roles that agree? If they do,
// that agreement is real evidence the single top-scorer alone did not carry,
// and the thesis can be the GENERALIZATION those candidates agree on rather
// than just the highest-scoring one among them.
//
// Nothing here discovers a cluster by any means but the engine's own,
// already-proven one: kernel/entity-kind-induction.js's null-validated
// affinity-basin clustering, the same primitive the-fold/kinds.js already
// runs over every drafted statement and the-fold/paradigm.js already runs
// over literary forms. No new statistic, no hand-set threshold — a basin
// either clears its own random-subset binding-energy null or it does not.
//
// The evidence fed into it is one new feature per candidate: its predicate
// lemma, read off f.notes — arrange.js's OWN already-computed field (built
// by its local notesOf(), originally for Kelsen's cycle-finder). No new
// parsing, and no import of kinds.js's rootOf, which is private there.

import { kindEvidence, createKindInductionIndex, indexKindEntries } from "../kernel/kind-induction.js";
import { induceEntityKindCandidates } from "../kernel/entity-kind-induction.js";
import { claimFromTriple, generalizeClaims, caselessIdentity, holon } from "../kernel/gfp-claim.js";

/**
 * thesisBasin(pool, winnerId, { population }) → a validated EOKindCandidate@1
 * or null. `pool` is arrange.js's own thesis-candidate array (already gated:
 * general, non-contrastive, names no being beyond the subject); `winnerId`
 * is today's single-winner thesis point id — the returned basin, if any,
 * always contains it, so synthesis only ever elaborates today's pick, never
 * jumps to a cluster the recurrence score would never have chosen.
 */
export function thesisBasin(pool, winnerId, { population = "thesis-pool" } = {}) {
  const entries = [];
  let seq = 0;
  const posOf = new Map(pool.map((f, i) => [f.pt.id, i]));
  for (const f of pool) {
    for (const note of f.notes) {
      if (!note.label) continue;
      entries.push(kindEvidence({
        id: `tb-${++seq}`, entityRef: f.pt.id, featureKey: "predicate", featureValue: note.label,
        sequencePosition: posOf.get(f.pt.id), witness: f.pt.id, anchor: { start: f.pt.span.start, end: f.pt.span.end },
      }));
    }
  }
  const index = createKindInductionIndex();
  indexKindEntries(index, entries);
  const induced = induceEntityKindCandidates(index.entityFeatures, { population });
  return induced.candidates.find((c) =>
    c.field?.stable === true && c.fallbackNomination !== true && c.memberCount >= 2 && c.memberRefs.includes(winnerId)
  ) ?? null;
}

/**
 * thesisGeneralization(basinMembers, { identity, winnerId }) →
 *   { generalization, statements, relation, polarity, via, agreeingClaims, refused: null }
 *   or { generalization: null, refused: <why> } — a refusal is always said.
 * Builds one GFP claim per relation-note on each basin member (arrange.js's
 * own subj/root/obj triple, with its polarity and its via), groups them by
 * relation + polarity + via (a denial never joins the assertions it denies;
 * "flowed through" never joins "flowed past"), takes the group that holds
 * the WINNER's statement (today's pick is elaborated, never replaced by the
 * basin's most frequent relation), and refuses unless at least two claims
 * are in it AND they agree on at least one role — a relation's frequency is
 * not a claim (the reading archons, 2026-09-25: "river, sea, wind, and tide
 * shape"). `identity` defaults to caseless string identity, not a
 * referent-aware resolver: R's resolveText/represent operate over spans and
 * referent ids, not the bare parse-tree lemmas a note's end1/end2 already
 * are, so "the dam" merging with "Old Hickory Dam" is not attempted here.
 */
export function thesisGeneralization(basinMembers, { identity = caselessIdentity, winnerId = null } = {}) {
  const tagged = [];
  for (const f of basinMembers) {
    for (const note of f.notes) {
      if (!note.label) continue;
      tagged.push({
        claim: claimFromTriple(note.end1, note.label, note.end2, { ground: holon(`/${f.pt.part}`), id: note.id, polarity: note.polarity ?? "+" }),
        ptId: f.pt.id, via: note.via ?? "obj",
      });
    }
  }
  const keyOf = (t) => `${t.claim.rel}\u0001${t.claim.polarity}\u0001${t.via}`;
  const groups = new Map();
  for (const t of tagged) { const k = keyOf(t); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
  const own = [...groups.values()].filter((g) => g.some((t) => t.ptId === winnerId));
  if (winnerId != null && !own.length) return { generalization: null, refused: `the winner ${winnerId} carries no relation note in this basin` };
  const group = (own.length ? own : [...groups.values()]).sort((a, b) => b.length - a.length)[0];
  if (!group) return { generalization: null, refused: "no relation notes among the basin's members" };
  if (group.length < 2) return { generalization: null, refused: `only 1 claim carries the relation "${group[0].claim.rel}" (${group[0].claim.polarity}, ${group[0].via}) in the winner's group` };
  const generalization = generalizeClaims(group.map((t) => t.claim), { identity });
  if (!Object.keys(generalization.agreed).length) return { generalization: null, refused: `${group.length} claims share the relation "${generalization.rel}" but agree on no role — a relation's frequency is not a claim` };
  return {
    generalization,
    statements: [...new Set(group.map((t) => t.ptId))],
    relation: generalization.rel, polarity: generalization.polarity, via: group[0].via,
    agreeingClaims: group.length, refused: null,
  };
}
