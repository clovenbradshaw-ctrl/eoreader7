// native/kernel/kind-functional-induction.js — KIND INDUCTION ON THE FLY, and
// which relations each induced kind holds single-valued, for ANY referent type
// (2026-09-27). Medium-blind, kernel-level. Standing: nomination.
//
// User direction: "kind induction on the fly for any arbitrary referent type" —
// identity exclusion must not rest on a register someone typed for PEOPLE.
// This composes two things the engine already has:
//
//   KIND   kernel/entity-kind-induction.js (induceEntityKindCandidates) over
//          each referent's relation PROFILE — which relations it takes part
//          in, never its name. Only kinds that pass the inducer's own
//          random-subset null are used; its "fallback nomination" licenses
//          nothing.
//   ONE-VALUEDNESS per kind, read off the values themselves, under the grain
//          theorem hl-acquire.js already states: a corpus can REFUTE that a
//          relation is single-valued and can never establish it. So a relation
//          gets exactly one of three standings for a kind, never "given":
//            unexposed  no member asserts it more than once — it was never
//                       tested, so it licenses NOTHING
//            refuted    a member holds two values that do not agree, both
//                       witnessed — a real counterexample
//            candidate  at least `exposureFloor` members asserted it more
//                       than once and every such member's values agree, and
//                       nothing refutes it — defeasible, forever
//   A value pair the comparison cannot decide counts neither way.
//
// The output plugs into kernel/identity-exclusion.js as its register: every
// entry carries standing "candidate" and its evidence counts, and an exclusion
// resting on one is itself only a candidate — revisable when the kind or the
// relation is.

import { induceEntityKindCandidates } from "./entity-kind-induction.js";

export function induceKindsAndFunctions(referents, { assertionsOf, sameValue, witnessed = null, exposureFloor, kindOptions } = {}) {
  if (typeof assertionsOf !== "function" || typeof sameValue !== "function") throw new TypeError("kind-functional-induction: assertionsOf and sameValue must be supplied");
  if (!Number.isInteger(exposureFloor) || exposureFloor < 1) throw new TypeError("kind-functional-induction: exposureFloor must be declared");
  if (!kindOptions) throw new TypeError("kind-functional-induction: kindOptions must be declared (they are the kind inducer's own)");
  const ids = [...referents];
  // profile: presence of each relation — the kind is read from what a referent DOES
  const features = new Map();
  for (const id of ids) {
    const m = new Map();
    for (const a of assertionsOf(id) ?? []) {
      const sig = `rel:${a.rel}`;
      if (!m.has(sig)) m.set(sig, { featureKey: a.rel, featureValue: true, evidenceIds: new Set(), firstAt: 0, lastAt: 0 });
      m.get(sig).evidenceIds.add(a.id ?? `${id}:${a.rel}:${m.get(sig).evidenceIds.size}`);
    }
    if (m.size) features.set(id, m);
  }
  const induced = induceEntityKindCandidates(features, kindOptions);
  const kinds = induced.candidates.filter((k) => k.field?.stable === true && !k.fallbackNomination);
  const kindsOfRef = new Map(ids.map((id) => [id, new Set()]));
  for (const k of kinds) for (const m of k.memberRefs) kindsOfRef.get(m)?.add(k.kindKey);

  const register = new Map(), relations = new Map();
  for (const k of kinds) {
    const rels = new Map();
    for (const m of k.memberRefs) {
      const byRel = new Map();
      for (const a of assertionsOf(m) ?? []) { if (!byRel.has(a.rel)) byRel.set(a.rel, []); byRel.get(a.rel).push(a); }
      for (const [rel, vs] of byRel) {
        const r = rels.get(rel) ?? { members: 0, exposed: 0, agreed: 0, refuted: 0, refutedBy: [] };
        r.members += 1;
        if (vs.length > 1) {
          r.exposed += 1;
          let conflict = null, agree = true;
          for (let i = 0; i < vs.length; i += 1) for (let j = i + 1; j < vs.length; j += 1) {
            const s = sameValue(vs[i].value, vs[j].value, rel);
            if (s === false) { agree = false; if (!witnessed || (witnessed(vs[i]) && witnessed(vs[j]))) conflict ??= [vs[i], vs[j]]; }
          }
          if (conflict) { r.refuted += 1; if (r.refutedBy.length < 3) r.refutedBy.push({ member: m, a: conflict[0].id, b: conflict[1].id }); }
          else if (agree) r.agreed += 1;
        }
        rels.set(rel, r);
      }
    }
    const entries = new Map(); const table = {};
    for (const [rel, r] of rels) {
      const standing = r.refuted > 0 ? "refuted" : r.agreed >= exposureFloor ? "candidate" : "unexposed";
      table[rel] = { standing, ...r };
      if (standing === "candidate") entries.set(rel, { standing: "candidate", evidence: { members: r.members, exposed: r.exposed, agreed: r.agreed }, kind: k.kindKey });
    }
    register.set(k.kindKey, entries); relations.set(k.kindKey, table);
  }
  return Object.freeze({
    kinds: kinds.map((k) => ({ kindKey: k.kindKey, members: k.memberRefs, signatures: k.structuralSignatures, bindingEnergy: k.field.bindingEnergy })),
    kindsOf: (id) => kindsOfRef.get(id) ?? new Set(),
    register, relations,
    diagnostics: { referents: ids.length, profiled: features.size, kinds: kinds.length, inducer: induced.diagnostics },
  });
}
