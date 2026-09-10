#!/usr/bin/env node
// mechanical-logic-battery.mjs — five more logic-task shapes through the
// same mechanism mechanical-transitive-reasoning.mjs proved: premises as
// EOT edges, a declared composition law, the kernel derives — never a
// model asked to judge the composed answer. Each case is a different
// SHAPE of the underlying algebra, not a harder version of the same one.
//
//   node mechanical-logic-battery.mjs

import { hyperedge } from "../../kernel/hypergraph.js";
import { createReactionSubstrate, affordancesFromDeclarations, refutedAffordances, closureAffordances } from "../../kernel/reaction.js";
import { createHyperlexicon } from "../../kernel/hyperlexicon.js";
import { refuteRelation } from "../../kernel/refutation.js";

const edge = (id, relation, from, to) => hyperedge({
  id, relation, witness: `question:${id}`,
  participants: [{ role: "subject", ref: from, standing: "referent" }, { role: "object", ref: to, standing: "referent" }],
});

function settleAll(entries, chemistry) {
  const substrate = createReactionSubstrate({ entries, hyperlexicon: chemistry, window: null });
  return substrate.settle({ cue: null, floor: null, maxSteps: 10 });
}

function line(s) { console.log(s); }

// ── TC1: 2-hop transitive (baseline sanity check, same shape as the ────────
//    original specimen, re-run here so the whole battery is one file) ─────
line("=== TC1: 2-hop transitive (older_than) ===");
{
  const entries = [edge("p1", "older_than", "alice", "bob"), edge("p2", "older_than", "bob", "carol")];
  const chem = createHyperlexicon({ composition: affordancesFromDeclarations({ given: [{ rel: "older_than", declKind: "transitive", giver: "eval:battery" }] }).map((a) => ({ ...a, standing: "given" })) });
  const r = settleAll(entries, chem);
  line(`  derived: ${r.derived.map((e) => `${e.from} —${e.relation}→ ${e.to}`).join("; ") || "(none)"}`);
  line(`  expected: alice —older_than→ carol  →  ${r.derived.some((e) => e.from === "alice" && e.to === "carol" && e.relation === "older_than") ? "PASS" : "FAIL"}`);
}

// ── TC2: 4-hop transitive chain — does depth alone break anything? ────────
line("\n=== TC2: 4-hop transitive chain (before) ===");
{
  const entries = [
    edge("p1", "before", "monday", "tuesday"),
    edge("p2", "before", "tuesday", "wednesday"),
    edge("p3", "before", "wednesday", "thursday"),
    edge("p4", "before", "thursday", "friday"),
  ];
  const chem = createHyperlexicon({ composition: affordancesFromDeclarations({ given: [{ rel: "before", declKind: "transitive", giver: "eval:battery" }] }).map((a) => ({ ...a, standing: "given" })) });
  const r = settleAll(entries, chem);
  const gotMondayFriday = r.derived.some((e) => e.from === "monday" && e.to === "friday" && e.relation === "before");
  line(`  derived count: ${r.derived.length}`);
  line(`  monday —before→ friday (full 4-hop span)?  ${gotMondayFriday ? "PASS" : "FAIL"}`);
  line(`  quiescent after ${r.steps.length} step(s): ${r.quiescent}`);
}

// ── TC3: non-transitive adjacency composing into a DIFFERENT relation ─────
//    (reaction.js's own worked case: immediate succession does not mean
//    transitivity of "immediately follows" — it means a NEW relation,
//    "eventually follows", is what the chain actually establishes.)
line("\n=== TC3: adjacency closing into a different relation (succession) ===");
{
  const entries = [
    edge("p1", "immediately_follows", "reign2", "reign1"),
    edge("p2", "immediately_follows", "reign3", "reign2"),
    edge("p3", "immediately_follows", "reign4", "reign3"),
  ];
  const chem = createHyperlexicon({
    composition: closureAffordances({ base: "immediately_follows", yields: "eventually_follows", giver: "eval:battery" }).map((a) => ({ ...a, standing: "given" })),
  });
  const r = settleAll(entries, chem);
  const wrongImmediate = r.derived.some((e) => e.relation === "immediately_follows" && !(e.from === "reign2" && e.to === "reign1") && !(e.from === "reign3" && e.to === "reign2") && !(e.from === "reign4" && e.to === "reign3"));
  const rightEventual = r.derived.some((e) => e.relation === "eventually_follows" && e.from === "reign4" && e.to === "reign1");
  line(`  derived: ${r.derived.map((e) => `${e.from} —${e.relation}→ ${e.to}`).join("; ")}`);
  line(`  reign4 correctly stated as "eventually_follows" reign1 (never "immediately_follows")?  ${rightEventual && !wrongImmediate ? "PASS" : "FAIL"}`);
}

// ── TC4: a cycle among the PREMISES — refutation must catch it, not the ───
//    reaction step (which has no notion of "wrong", only "derivable") ─────
line("\n=== TC4: cycle in the premises (older_than: alice>bob>carol>alice) ===");
{
  const entries = [
    edge("p1", "older_than", "alice", "bob"),
    edge("p2", "older_than", "bob", "carol"),
    edge("p3", "older_than", "carol", "alice"), // contradicts p1+p2's implied alice>carol
  ];
  const audit = refuteRelation(entries, "older_than", { cycleLimit: 5 });
  line(`  refuteRelation("older_than"): refuted=${audit.refuted}, power=${audit.power}`);
  line(`  reasons: ${JSON.stringify(audit.reasons ?? [])}`);
  line(`  correctly caught as a positive cycle counterexample?  ${audit.refuted ? "PASS" : "FAIL"}`);
  // Show what happens if this relation's cycle is NOT checked first — the
  // reaction step still "derives" something, because step() has no
  // veto without being told: this is the reason refutation runs BEFORE
  // composition in a real wiring, not as an afterthought.
  const chem = createHyperlexicon({ composition: affordancesFromDeclarations({ given: [{ rel: "older_than", declKind: "transitive", giver: "eval:battery" }] }).map((a) => ({ ...a, standing: "given" })) });
  const rUnchecked = settleAll(entries, chem);
  line(`  UNCHECKED composition still derives: ${rUnchecked.derived.map((e) => `${e.from} —${e.relation}→ ${e.to}`).join("; ")} — this is why refutation must gate composition, not follow it`);

  // FORCED, per direct instruction: refutedAffordances (kernel/reaction.js)
  // runs refuteRelation itself and drops any GIVEN declaration whose
  // relation comes back refuted, before affordancesFromDeclarations ever
  // sees it — a caller cannot forget the check, because there is no path
  // to chemistry that skips it.
  const guarded = refutedAffordances({ given: [{ rel: "older_than", declKind: "transitive", giver: "eval:battery" }] }, entries, { expectUnique: true });
  const chemGuarded = createHyperlexicon({ composition: guarded.affordances });
  const rGuarded = settleAll(entries, chemGuarded);
  line(`  FORCED (refutedAffordances): survivors=${JSON.stringify(guarded.survivors)}, vetoed=${JSON.stringify(guarded.vetoed)}`);
  line(`  FORCED composition now derives: ${rGuarded.derived.length === 0 ? "(nothing — correctly refuses to compose over its own contradiction)" : rGuarded.derived.map((e) => `${e.from} —${e.relation}→ ${e.to}`).join("; ")}  →  ${rGuarded.derived.length === 0 ? "PASS" : "FAIL"}`);
}

// ── TC5: an UNDECLARED relation — must withhold, never guess ──────────────
line("\n=== TC5: undeclared relation (parent_of, genuinely non-transitive) ===");
{
  const entries = [edge("p1", "parent_of", "alice", "bob"), edge("p2", "parent_of", "bob", "carol")];
  const chem = createHyperlexicon({}); // nothing declared
  const r = settleAll(entries, chem);
  const wronglyDerived = r.derived.some((e) => e.relation === "parent_of" && e.from === "alice" && e.to === "carol");
  line(`  derived: ${r.derived.length === 0 ? "(none)" : r.derived.map((e) => `${e.from} —${e.relation}→ ${e.to}`).join("; ")}`);
  line(`  withheld: ${JSON.stringify(r.withheld)}`);
  line(`  correctly refused to claim "alice parent_of carol"?  ${!wronglyDerived ? "PASS" : "FAIL"}`);
}
