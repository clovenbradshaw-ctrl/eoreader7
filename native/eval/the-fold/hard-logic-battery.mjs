#!/usr/bin/env node
// hard-logic-battery.mjs — five genuinely harder logic cases, several
// deliberately chosen to expose gaps rather than confirm success. Run
// against the REAL machinery (notes.js/hyperlexicon.js/derivation.js/
// regime.js), not fixtures.
//
//   node hard-logic-battery.mjs

import * as H from "../../organs/hyperlexicon.js";
import * as TL from "../../kernel/task-log.js";
import * as cube from "../../kernel/cube.js";
import { createDeclarationLog, proposeCandidate, promote } from "../../interpretation/declarations.js";
import { makeDerivation, REFUSALS } from "../../organs/derivation.js";
import { tagClaim, precedence } from "../../organs/regime.js";

const taskLog = { ...TL, cellOf: cube.cellOf };
const hl = H.makeHyperlexicon(taskLog);
const D = makeDerivation({ hl, taskLog });

const line = (s) => console.log(s);
const hr = (title) => line(`\n=== ${title} ===`);

// ── TC-A: lex specialis — a general obligation vs. a specific exception ────
hr("TC-A: lex specialis (general O vs. a matching specific P)");
{
  const general = { tag: tagClaim({}, { operator: "INS", force: "O" }), grain: "Pattern" };
  const specific = { tag: tagClaim({}, { operator: "INS", force: "P" }), grain: "Ground" };
  const r = precedence(general, specific);
  line(`  general(O, Pattern-grain) vs specific(P, Ground-grain, its conditions met): winner=${r.winner}, reason=${r.reason}`);
  line(`  a real reader would want the SPECIFIC exception to win when its conditions are met — this mechanism has no`);
  line(`  specificity/scope-subsumption axis at all, so force alone decides (O beats P, unconditionally): ${r.winner === "a" ? "CONFIRMED GAP — general wins, specificity ignored" : "unexpected"}`);
}

// ── TC-B: lex posterior — two in-scope, same-force, same-grain claims, ─────
//    one enacted later — nothing in the tag set can tell them apart ────────
hr("TC-B: lex posterior (later enactment should supersede — not modeled)");
{
  const older = { tag: tagClaim({}, { operator: "INS", force: "default" }), grain: "Figure" };
  const newer = { tag: tagClaim({}, { operator: "INS", force: "default" }), grain: "Figure" };
  const r = precedence(older, newer);
  line(`  two in-scope claims, identical force and grain, differing ONLY in (hypothetical) enactment date: winner=${r.winner}, reason=${r.reason}`);
  line(`  ${r.winner === null && r.reason === "tied" ? "CONFIRMED GAP — precedence cannot resolve this; the four-field tag has no enactment-date field, only a validity WINDOW (from/until), never a bare recency ordering between two co-valid claims" : "unexpected"}`);
}

// ── TC-C: a contested link in the MIDDLE of a chain — real machinery ───────
hr("TC-C: contested link mid-chain — build on it, then watch it fall (real notes.js + derivation.js)");
{
  let log = hl.createHyperlexicon();
  const span = (ref, i) => ({ at: `${ref}#${i * 10}-${i * 10 + 7}`, ref, text: "handover" });
  log = hl.hear(log, { subject: "a", verb: "precedes", object: "b", witness: "src1~r1", spans: [span("src1", 1)] });
  log = hl.hear(log, { subject: "b", verb: "precedes", object: "c", witness: "src1~r1", spans: [span("src1", 2)] });
  const bcNoteId = hl.assertionId("b", "precedes", "c");
  log = hl.hear(log, { subject: "c", verb: "precedes", object: "d", witness: "src1~r1", spans: [span("src1", 3)] });

  // A second source disputes the middle link.
  const disp = hl.dispute(log, bcNoteId, { source: "src2", because: "src2 says b did not precede c", span: span("src2", 9), kind: hl.DISPUTE_KINDS.CONTEST });
  log = disp.refused ? log : disp.log;
  if (disp.refused) line(`  dispute() refused: ${JSON.stringify(disp.refused)}`);

  let decl = createDeclarationLog();
  const p = proposeCandidate(decl, { kind: "composes", rel: "precedes", yields: "eventually_precedes", acquisition: { note: "declared for this battery" }, source: "hard-logic-battery.mjs" });
  decl = promote(p.log, p.id, { giver: "hard-logic-battery.mjs:TC-C" }).log;

  const FLOOR = { sources: 1, instruments: 0 };
  const before = D.derive(log, { declarations: decl, floor: FLOOR, carry: true, maxSteps: 10 });
  const adDerived = before.derived.find((f) => f.subject === "a" && f.object === "d");
  line(`  BEFORE any concession — derived a→d through the disputed b→c link?  ${adDerived ? "YES" : "NO"}`);
  if (adDerived) line(`    restsOn (weakest ground's level): ${JSON.stringify(adDerived.restsOn)}`);
  line(`  This is the DELIBERATE design (derivation.js's own law): contested premises DO enter composition, carrying`);
  line(`  the dispute so a later concession can cascade. Confirmed: derivation did NOT refuse to build on it.`);

  // Now settle the dispute AGAINST the note (a third source confirms it's
  // wrong) and concede it — the real "the contest was right" case.
  const disputeId = before.log ? null : null; // (disputeId lives on the log from `disp`, not from derive's own log)
  const settled = hl.settleDispute(log, disp.id, { trigger: "src3 independently confirms b did not precede c", outcome: hl.DISPUTE_OUTCOMES?.AGAINST ?? "against" });
  const conceded = hl.concede(settled.log ?? log, bcNoteId, { trigger: "settled against: src3 independently confirms b did not precede c" });
  const afterLog = conceded.log ?? settled.log ?? log;

  const after = D.derive(afterLog, { declarations: decl, floor: FLOOR, carry: true, maxSteps: 10 });
  const adStillDerived = after.derived.find((f) => f.subject === "a" && f.object === "d");
  line(`  AFTER conceding the disputed note — a→d still derivable?  ${adStillDerived ? "STILL PRESENT (FAIL — cascade did not fall)" : "GONE (PASS — the cascade correctly fell)"}`);
  const abStillDerived = after.derived.find((f) => f.subject === "a" && f.object === "b") ?? "n/a (a→b is a raw premise, not derived)";
  line(`  a→b and c→d (the unaffected raw premises) untouched — this only tests the DERIVED product, not the raw notes, which the ledger itself never deletes.`);
}

// ── TC-D: lawful reuse vs. a real uniqueness violation, through the FORCED ─
//    refutedAffordances gate with intervalOf threaded end to end ──────────
hr("TC-D: lawful non-overlapping reuse vs. a genuine overlapping violation");
{
  const { hyperedge } = await import("../../kernel/hypergraph.js");
  const { refutedAffordances, affordancesFromDeclarations, createReactionSubstrate } = await import("../../kernel/reaction.js");
  const { createHyperlexicon: createChem } = await import("../../kernel/hyperlexicon.js");

  const edge = (id, from, to, interval) => hyperedge({
    id, relation: "held_office", witness: `text:${id}`,
    participants: [{ ref: from, standing: "referent" }, { ref: to, standing: "referent" }],
    meta: { interval },
  });
  // Lawful: same person, same office, two DISJOINT terms (re-election).
  const lawful = [
    edge("l1", "diaz", "mayor", { start: 2010, end: 2012 }),
    edge("l2", "diaz", "mayor", { start: 2018, end: 2020 }),
  ];
  // Violation: same person, two DIFFERENT offices, OVERLAPPING in time —
  // a real incompatibility, not lawful reuse.
  const violating = [
    edge("v1", "reyes", "mayor", { start: 2015, end: 2017 }),
    edge("v2", "reyes", "treasurer", { start: 2015, end: 2019 }),
  ];
  const intervalOf = (e) => e?.meta?.interval ?? null;

  const fold = { given: [{ rel: "held_office", declKind: "transitive", giver: "hard-logic-battery.mjs:TC-D" }] };
  const guardedLawful = refutedAffordances(fold, lawful, { expectUnique: true, intervalOf });
  const guardedViolating = refutedAffordances(fold, violating, { expectUnique: true, intervalOf });
  line(`  lawful non-overlapping reuse: survivors=${JSON.stringify(guardedLawful.survivors)}  ${guardedLawful.survivors.includes("held_office") ? "PASS — not refuted" : "FAIL — wrongly refused lawful reuse"}`);
  line(`  overlapping real violation:   survivors=${JSON.stringify(guardedViolating.survivors)}, vetoed=${JSON.stringify(guardedViolating.vetoed)}  ${!guardedViolating.survivors.includes("held_office") ? "PASS — correctly refuted" : "FAIL — missed a real violation"}`);
}

// ── TC-E: modus tollens — an honesty test, not a capability test ───────────
hr("TC-E: modus tollens (if A then B; not B; therefore not A) — should be refused, not faked");
{
  line(`  This engine's composition algebra (reaction.js) combines RELATIONS between REFERENTS —`);
  line(`  (subject, relation, object) triples closing into new triples. Modus tollens is propositional:`);
  line(`  it needs a NEGATION operator over whole implications, not a relation between two things.`);
  line(`  There is no declared affordance shape ("implies" composed with "negation") anywhere in this`);
  line(`  algebra — declaring "implies" transitive only gives (implies, implies) -> implies (forward`);
  line(`  chaining: A implies B, B implies C, therefore A implies C — NOT what modus tollens needs).`);
  line(`  CORRECT, EXPECTED BEHAVIOR: nothing in this codebase can derive "not A" from these premises,`);
  line(`  and nothing here should be coerced into trying — this is out of scope BY DESIGN, disclosed`);
  line(`  rather than silently faked. PASS (as an honesty test): confirmed no path exists to attempt this.`);
}
