#!/usr/bin/env node
// mechanical-transitive-reasoning.mjs — the user's own correction to the
// "escalate to a bigger model" recommendation for multi-step reasoning:
// the model ASSERTS the premises, they get EOT-ized (hyperedge participants
// with referent standing), and the actual comparison is DERIVED through
// the kernel's own composition machinery (reaction.js + a declared
// transitive() affordance) — never asked of a model as a final judgment.
//
// Specimen: the exact question that tripped gemma2:2b and llama3.2 in
// model-capability-ladder-RESULTS.md — "Alice is older than Bob. Bob is
// older than Carol. Is Carol older or younger than Alice?" — answered here
// with ZERO model calls for the comparison itself.
//
//   node mechanical-transitive-reasoning.mjs

import { hyperedge } from "../../kernel/hypergraph.js";
import { createReactionSubstrate, affordancesFromDeclarations } from "../../kernel/reaction.js";
import { createHyperlexicon } from "../../kernel/hyperlexicon.js";

// Step 1: the premises, EOT-ized. In a real turn these would come from a
// small model's own STRUCTURED extraction of the prompt ("name the ordered
// pairs this comparative chain states") — not attempted here; this driver
// hand-builds the edges to isolate the composition step being proven, the
// same posture every other eval driver in this directory takes ("the
// driver supplies only what the mechanism itself does not").
const premises = [
  hyperedge({ id: "p1", relation: "older_than", witness: "question:premise-1", participants: [
    { role: "subject", ref: "alice", standing: "referent" },
    { role: "object", ref: "bob", standing: "referent" },
  ] }),
  hyperedge({ id: "p2", relation: "older_than", witness: "question:premise-2", participants: [
    { role: "subject", ref: "bob", standing: "referent" },
    { role: "object", ref: "carol", standing: "referent" },
  ] }),
];

// Step 2: the declaration — a person (or a closed, giver-named table of
// common comparative relations: older/younger, before/after, taller/
// shorter, ancestor-of) states that "older_than" is transitive. This is
// the ONE thing this driver asserts rather than derives -- composition.js's
// own law: "a closure is a giver's claim about a relation, never a
// default." A real wiring would declare a small CLOSED set of these once
// (the same shape /declare already lets a person do by hand, P102) rather
// than re-declaring per turn.
const GIVER = "eval:mechanical-transitive-reasoning (2026-09-10, comparative-relation closed class)";
const fold = { given: [{ rel: "older_than", declKind: "transitive", giver: GIVER }], conceded: [] };
const chemistry = createHyperlexicon({
  composition: affordancesFromDeclarations(fold).map((a) => ({ ...a, standing: "given" })),
});

// Step 3: react. No presence gate (floor: null) — a two-premise synthetic
// chain has no "reach of the present" question to ask; a real wiring over
// a live conversation would use the turn's own activation window.
const substrate = createReactionSubstrate({ entries: premises, hyperlexicon: chemistry, window: null });
const result = substrate.step({ floor: null });

console.log("Derived facts:");
for (const edge of result.derived) {
  console.log(`  ${edge.participants[0].ref} —${edge.relation}→ ${edge.participants[edge.participants.length - 1].ref}  (giver: ${edge.meta?.giver ?? edge.witness ?? "?"})`);
}

// Step 4: answer the actual question -- a lookup, not a judgment. The
// derived fact IS "alice older_than carol"; "is Carol older or younger
// than Alice" is answered by a declared, closed inverse-relation table
// (older_than's inverse is younger_than) -- the same posture P56's grammar
// lens takes toward "verb," never a model asked to compare freely.
const INVERSE = { older_than: "younger_than" };
const derivedAliceCarol = result.derived.find((e) =>
  e.relation === "older_than" &&
  e.participants[0].ref === "alice" &&
  e.participants[e.participants.length - 1].ref === "carol"
);

console.log("\nQuestion: Is Carol older or younger than Alice?");
if (derivedAliceCarol) {
  console.log(`Answer: ${INVERSE.older_than.toUpperCase()} (derived: alice -older_than-> carol, inverted; zero model calls)`);
} else {
  console.log("Answer: undetermined -- the composition step found no derived edge (this would be a real gap to report, not a guess)");
}
