// native/kernel/refutation.js — the veto organ: what the material REFUSES,
// never what it licenses.
//
// WHY THIS IS A VETO AND NOT A GATE, measured before it was written.
// the-fold's `eval/falsification-probe.mjs` ran six corpora with ground
// truth declared in advance through the real door and the real kernel
// nominator, and reported one decisive pair: a five-fact succession chain
// and a five-fact dominance chain, STRUCTURALLY IDENTICAL by construction
// (1:1, acyclic, every referent distinct, both nominated at identical
// support, both clearing uniqueness) and OPPOSITE in ground truth —
// succession composes soundly, "defeated" does not. The scan cannot tell
// them apart. Structure alone does not license composition, and a
// refutation-cleared candidate is therefore NOT a licence.
//
// What the same probe showed this organ CAN do is refuse, and refuse for
// real: 3 of 6 corpora were correctly refused, each on a positive,
// observable counterexample. That is the whole competence, and it is
// precisely bounded — refuting a claim of transitive composition requires a
// POSITIVE counterexample, and positive-only material supplies one in
// exactly two shapes:
//
//   UNIQUENESS  a referent standing at the same end of the same relation
//               twice, with distinct partners. The bridge then conflates
//               two distinct things (the real tenure bug: one person
//               entering one office twice, so a person-level bridge joined
//               two different terms).
//   CYCLE       a → b → … → a under one relation. A cycle directly
//               contradicts a transitive ordering, and is the one refutation
//               of transitivity that positive-only material can state.
//
// Where neither is present, ABSENCE IS NOT REFUTATION: nothing in
// positive-only material says "a did not beat c", and under open-world
// semantics that silence refutes nothing. This organ therefore never
// returns "clean" — it returns what it examined and what it found, and a
// caller that reads no-refutation as a licence has made the error the probe
// was run to prevent.
//
// AND IT NEVER REPORTS A CHECK IT COULD NOT RUN (P41: the absence of a
// refusal is not a check). Refutation is structurally impossible below two
// resolved edges, so `power` is reported on every result: a relation with
// one examined edge is `insufficient`, never `unrefuted`. Edges whose ends
// are not both resolved referents are counted as `unresolved` rather than
// silently dropped — a scan that examined nothing must not read as a scan
// that found nothing.

const freeze = (value) => Object.freeze(value);

/** Both ends of an arrangement, by ORDINAL POSITION — never by role name.
 * (relation-composition.js's own rule, inherited: an arrangement has ends,
 * not parts of speech.) Returns null unless BOTH ends are resolved
 * referents; an unresolved end cannot establish a violation. */
function endsOf(edge) {
  if (edge?.schema !== "EOHyperedge@1") return null;
  const parts = edge.participants ?? [];
  const from = parts[0];
  const to = parts.length >= 2 ? parts[parts.length - 1] : null;
  if (from?.standing !== "referent" || !from.ref) return null;
  if (to?.standing !== "referent" || !to.ref) return null;
  return { from: from.ref, to: to.ref, edge };
}

function findCycles(adjacency, limit) {
  const color = new Map();
  const stack = [];
  const cycles = [];
  const visit = (node) => {
    if (cycles.length >= limit) return;
    color.set(node, 1);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) {
      if (cycles.length >= limit) break;
      const seen = color.get(next) ?? 0;
      if (seen === 1) {
        const at = stack.indexOf(next);
        if (at >= 0) cycles.push(freeze([...stack.slice(at), next]));
      } else if (seen === 0) visit(next);
    }
    stack.pop();
    color.set(node, 2);
  };
  for (const node of adjacency.keys()) if ((color.get(node) ?? 0) === 0) visit(node);
  return cycles;
}

/**
 * refuteRelation(edges, relation, { expectUnique, cycleLimit }) — everything
 * the material positively says AGAINST treating `relation` as composable.
 *
 * `expectUnique` IS DECLARED BY THE CALLER AND DEFAULTS TO OFF, and that
 * default was earned by running this organ rather than reasoning about it.
 * Uniqueness refutes an ADJACENCY claim: immediate succession has exactly
 * one predecessor, so a referent with two is evidence of two conflated
 * tenures. It refutes NOTHING about a transitive relation, where many-to-
 * many is what transitivity MEANS — measured live on the succession
 * material, the derived closure `after:<office>` was flagged "refuted" on
 * uniqueness because Colfax is after both Hamlin AND Breckinridge, which is
 * the closure being correct. A check applied where its precondition does
 * not hold produces a refutation that means nothing; that is A10's trap
 * (a statistic insensitive to its perturbation fails invisibly), found here
 * one layer in from where this file's header already records it.
 *
 * So the caller declares the claim — `part_of` is genuinely transitive AND
 * many-to-many, `replaces` is genuinely 1:1 — and an undeclared relation
 * gets the cycle check alone. A cycle is always licensed: nothing may be
 * strictly after itself, whatever the cardinality.
 *
 * Returns `{ relation, examined, unresolved, power, uniqueness, cycles,
 * refuted, reasons }`. `refuted: false` means "nothing refuted it HERE",
 * which is not the same as sound and is never to be read as one — see this
 * file's header. A uniqueness check that did not run reports
 * `checked: false`, never a pass (P41: the absence of a refusal is not a
 * check).
 */
export function refuteRelation(edges = [], relation, { expectUnique = false, cycleLimit = 3 } = {}) {
  if (!relation) throw new TypeError("refuteRelation: the relation to examine is declared, never inferred from the edge set");
  const matching = (edges ?? []).filter((e) => e?.relation === relation);
  const resolved = matching.map(endsOf).filter(Boolean);
  const unresolved = matching.length - resolved.length;

  const forward = new Map();
  const backward = new Map();
  const adjacency = new Map();
  for (const { from, to, edge } of resolved) {
    if (!forward.has(from)) forward.set(from, new Map());
    forward.get(from).set(to, edge.id ?? null);
    if (!backward.has(to)) backward.set(to, new Map());
    backward.get(to).set(from, edge.id ?? null);
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(to);
  }

  const violations = [];
  if (expectUnique) {
    for (const [referent, partners] of forward) {
      if (partners.size >= 2) violations.push(freeze({ referent, side: "functional", detail: "stands at the first end of this relation more than once, with distinct partners", partners: freeze([...partners.keys()]), edgeRefs: freeze([...partners.values()].filter(Boolean)) }));
    }
    for (const [referent, partners] of backward) {
      if (partners.size >= 2) violations.push(freeze({ referent, side: "inverse-functional", detail: "stands at the second end of this relation more than once, with distinct partners", partners: freeze([...partners.keys()]), edgeRefs: freeze([...partners.values()].filter(Boolean)) }));
    }
  }

  const cycles = findCycles(adjacency, cycleLimit);

  // A scan that COULD NOT have refuted must not read as one that did not.
  const power = resolved.length < 2 ? "insufficient" : "sufficient";
  const reasons = [];
  if (violations.length) reasons.push("uniqueness");
  if (cycles.length) reasons.push("cycle");

  return freeze({
    schema: "EORelationRefutation@1",
    relation,
    examined: resolved.length,
    ofEdges: matching.length,
    unresolved,
    power,
    powerDetail: power === "insufficient"
      ? "fewer than two resolved edges carry this relation — neither a uniqueness violation nor a cycle is structurally expressible, so this scan could not have refuted anything"
      : "at least two resolved edges — both refutation shapes were expressible",
    uniqueness: freeze({
      checked: expectUnique,
      violated: violations.length > 0,
      violations: freeze(violations),
      ...(expectUnique ? {} : { why: "not checked: this relation was not declared 1:1, and uniqueness refutes nothing about a many-to-many one" }),
    }),
    cycles: freeze({ present: cycles.length > 0, examples: freeze(cycles) }),
    refuted: reasons.length > 0,
    reasons: freeze(reasons),
    // Stated on every result so no caller can quietly upgrade silence.
    disclosure: reasons.length > 0
      ? "a positive counterexample was found in this material"
      : "no counterexample was found in THIS material; open-world absence is not refutation and this is not a licence",
  });
}

/**
 * auditChemistry(edges, hyperlexicon) — every GIVEN affordance, against what
 * the material actually says.
 *
 * The audit examines the relations an affordance NAMES (its two sides), not
 * the affordance's own conclusion: a closure is refuted when the relation it
 * closes is refuted. Candidates are not audited — they license nothing, so
 * there is nothing for a counterexample to withdraw.
 *
 * WHERE UNIQUENESS IS LICENSED IS READ OFF THE AFFORDANCE, never assumed:
 * `meta.adjacency` names the side its giver claims is 1:1 (closureAffordances
 * stamps the base). Every other relation — the transitive product above all
 * — gets the cycle check alone. Assuming it instead was a real bug this
 * organ shipped with for one run: the derived closure was reported refuted
 * because a transitive relation is many-to-many on purpose.
 *
 * Returns one row per given affordance, each carrying the per-relation
 * refutation whole, so a caller concedes on evidence rather than on a flag.
 */
export function auditChemistry(edges = [], hyperlexicon = null, { cycleLimit = 3 } = {}) {
  const composition = hyperlexicon?.composition ?? {};
  const cache = new Map();
  const scanOf = (relation, expectUnique) => {
    const key = `${relation} ${expectUnique ? "1" : "0"}`;
    if (!cache.has(key)) cache.set(key, refuteRelation(edges, relation, { expectUnique, cycleLimit }));
    return cache.get(key);
  };

  const rows = [];
  for (const entry of Object.values(composition)) {
    if (entry?.standing !== "given") continue;
    const sides = [...new Set([entry.left, entry.right].filter(Boolean))];
    const claimedUnique = new Set([entry.meta?.adjacency].filter(Boolean));
    const scans = sides.map((side) => scanOf(side, claimedUnique.has(side)));
    const refutedBy = scans.filter((s) => s.refuted);
    rows.push(freeze({
      left: entry.left,
      right: entry.right,
      giver: entry.giver ?? null,
      yields: entry.meta?.yields ?? null,
      refuted: refutedBy.length > 0,
      refutedBy: freeze(refutedBy),
      scans: freeze(scans),
      // An audit over material too thin to refute is itself a disclosure.
      power: scans.every((s) => s.power === "sufficient") ? "sufficient" : "partial",
    }));
  }
  return freeze(rows);
}

/**
 * vetoedPairs(audit) — the (left, right) pairs a settle must not fire,
 * derived from an audit rather than hand-assembled by a caller. Returned as
 * plain pair objects so `reaction.js` owns its own key shape.
 */
export function vetoedPairs(audit = []) {
  return freeze((audit ?? []).filter((row) => row.refuted).map((row) => freeze({ left: row.left, right: row.right, reasons: row.refutedBy.flatMap((s) => s.reasons) })));
}
