// derivation.test.mjs — floor 6's walls, against the REAL ledger, the REAL
// reaction circuit, the REAL refutation scan and the REAL declarations
// register. Ground truth by construction: a relay a→b→c→d→e recorded by two
// sources and read by two instruments; `a after c` is TRUE and never
// stated. Planted: `z replaces a` (one witness — a cycle-closer that must
// stop at the floor) and, in one test, `x replaces b` at full standing (a
// second predecessor for b — a uniqueness violation the veto must catch).
//
// The decisive tests are the wall (a product carries no witness; premises'
// witness sets are byte-identical after landing), the cascade (conceding
// one premise takes every product resting on it, transitively, and nothing
// else), and the two controls built to fail (no giver → 0; redealt premises
// → a different set; licensed ⊆ naive).
import test from "node:test";
import assert from "node:assert/strict";
import * as H from "./hyperlexicon.js";
import * as TL from "../kernel/task-log.js";
import * as cube from "../kernel/cube.js";
import { createDeclarationLog, proposeCandidate, promote, foldDeclarations } from "../interpretation/declarations.js";
import { distinctSources } from "./corroboration.js";
import { makeDerivation, premisesOf, naiveJoin, redeal, isDerivedId, REFUSALS } from "./derivation.js";

const taskLog = { ...TL, cellOf: cube.cellOf };
const hl = H.makeHyperlexicon(taskLog);
const D = makeDerivation({ hl, taskLog });
const GIVER = "derivation.test.mjs — a stand-in giver, disclosed: the relay's handover semantics are declared by this test, never by the material";
const FLOOR = { sources: 2, instruments: 2 };

const span = (ref, i) => ({ at: `${ref}#${i * 10}-${i * 10 + 7}`, ref, text: "handover" });
const SOURCES = ["log-1", "log-2"];
const RECIPES = ["read-v1", "read-v2"];
const CHAIN = ["a", "b", "c", "d", "e"];

function relayLedger({ plantCycle = true, plantSecondPredecessor = false } = {}) {
  let log = hl.createHyperlexicon();
  let i = 0;
  for (const s of SOURCES) for (const r of RECIPES) {
    for (let k = 0; k + 1 < CHAIN.length; k += 1)
      log = hl.hear(log, { subject: CHAIN[k], verb: "replaces", object: CHAIN[k + 1], witness: `${s}~${r}`, spans: [span(s, i++)] });
    if (plantSecondPredecessor) log = hl.hear(log, { subject: "x", verb: "replaces", object: "b", witness: `${s}~${r}`, spans: [span(s, i++)] });
  }
  if (plantCycle) log = hl.hear(log, { subject: "z", verb: "replaces", object: "a", witness: "log-1~read-v1", spans: [span("log-1", 99)] });
  return log;
}
function licensed() {
  let decl = createDeclarationLog();
  const p = proposeCandidate(decl, { kind: "composes", rel: "replaces", yields: "after", acquisition: { note: "declared by the test" }, source: "relay ledger" });
  decl = promote(p.log, p.id, { giver: GIVER }).log;
  return decl;
}
const triple = (d) => `${d.subject}|${d.verb}|${d.object}`;

test("the floor is declared, never defaulted", () => {
  assert.throws(() => premisesOf([], {}), /declared/);
  assert.throws(() => premisesOf([], { floor: { sources: 2 } }), /declared/);
  assert.throws(() => D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR }), new RegExp(REFUSALS.no_steps.slice(0, 20)));
});

test("instruments:0 is a declaration — a recipe-less witness (a live chat admission) can stand at it, and only at it", () => {
  let log = hl.createHyperlexicon();
  log = hl.hear(log, { subject: "a", verb: "replaces", object: "b", witness: "pasted.txt#0-40", spans: [span("pasted.txt", 0)] });
  log = hl.hear(log, { subject: "a", verb: "replaces", object: "b", witness: "other.txt#0-40", spans: [span("other.txt", 0)] });
  const notes = hl.foldHyperlexicon(log);
  const strict = premisesOf(notes, { floor: { sources: 2, instruments: 1 } });
  assert.equal(strict.premises.length, 0);
  assert.equal(strict.stopped[0].instruments, 0, "an undeclared instrument is honestly zero, never silently one");
  const declared = premisesOf(notes, { floor: { sources: 2, instruments: 0 } });
  assert.equal(declared.premises.length, 1);
  assert.throws(() => premisesOf(notes, { floor: { sources: 0, instruments: 0 } }), /declared/, "sources still needs at least one");
});

test("the substrate bonds on IDENTITY ends (earned faces in the id), not on display debris — the live 2026-09-02 case", () => {
  // the ledger's own Station-3→4 wire: an object heard with adjunct debris
  // whose face was earned as the bare referent
  let log = hl.createHyperlexicon();
  for (const w of ["s1~r1", "s2~r2"]) {
    log = hl.hear(log, { subject: "Andrew Johnson", verb: "replaced", object: "Hannibal Hamlin in March 1865", objectFace: "Hannibal Hamlin", witness: w, spans: [span(w.slice(0, 2), 1)] });
    log = hl.hear(log, { subject: "Hannibal Hamlin", verb: "replaced", object: "John Breckinridge as vice president", objectFace: "John Breckinridge", witness: w, spans: [span(w.slice(0, 2), 2)] });
  }
  let decl = createDeclarationLog();
  const p = proposeCandidate(decl, { kind: "composes", rel: "replaced", yields: "after", acquisition: {}, source: "test" });
  decl = promote(p.log, p.id, { giver: GIVER }).log;
  const r = D.derive(log, { declarations: decl, floor: FLOOR, maxSteps: 4 });
  assert.equal(r.derived.length, 1, "the two notes bridge at the earned face 'hannibal hamlin'");
  assert.equal(triple(r.derived[0]), "Andrew Johnson|after|John Breckinridge as vice president", "the product is worded in the material's own words, its identity in its id");
  assert.equal(r.derived[0].id, "derived:andrew johnson|after|john breckinridge");
});

test("premises are F5 notes at the floor; a one-witness note is STOPPED, typed with its counts", () => {
  const notes = hl.foldHyperlexicon(relayLedger());
  const { premises, stopped } = premisesOf(notes, { floor: FLOOR });
  assert.equal(premises.length, 4, "a→b, b→c, c→d, d→e stand");
  assert.equal(stopped.length, 1);
  assert.deepEqual([stopped[0].subject, stopped[0].object, stopped[0].sources, stopped[0].instruments], ["z", "a", 1, 1]);
});

test("floor 6 derives never-stated facts from corroborated premises, with provenance to bytes", () => {
  const r = D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  const got = new Set(r.derived.map(triple));
  // the closure composes TWO edges at a bridge: `a replaces b` alone never
  // yields `a after b` — the product is what the material never states
  assert.deepEqual([...got].sort(), ["a|after|c", "a|after|d", "a|after|e", "b|after|d", "b|after|e", "c|after|e"]);
  const ac = r.derived.find((d) => triple(d) === "a|after|c");
  assert.equal(ac.depth, 1, "one bridge-hop over two raw premises");
  assert.equal(r.derived.find((d) => triple(d) === "a|after|e").depth >= 2, true);
  assert.ok(ac.grounds.includes(hl.assertionId("a", "replaces", "b")) && ac.grounds.includes(hl.assertionId("b", "replaces", "c")), "grounds walk to the raw notes");
  assert.ok(ac.provenance.every((at) => /^log-[12]#\d+-\d+$/.test(at)), "provenance reaches byte addresses");
  assert.ok(ac.provenance.length >= 8, "every witness's span of both premises: " + ac.provenance.length);
  assert.equal(ac.giver, GIVER);
  assert.ok(r.derived.every((d) => d.landed === "new"));
  assert.equal(r.stopped.length, 1, "the planted cycle-closer never reached the substrate");
  // the planted e→a is NOT among the premises, so no product rests on it
  assert.ok(!r.derived.some((d) => d.subject === "z" || d.object === "z"));
});

test("THE WALL: a derived note has no witnesses, never reads corroborated, and lands nothing on its premises", () => {
  const before = relayLedger();
  const witnessesBefore = new Map(hl.foldHyperlexicon(before).map((n) => [n.id, [...n.witnesses].sort().join(",")]));
  const r = D.derive(before, { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  const derived = D.foldDerived(r.log);
  assert.equal(derived.length, 6);
  for (const d of derived) {
    assert.deepEqual(d.witnesses, [], "stated nowhere");
    assert.equal(distinctSources(d.witnesses).size, 0, "the >=2-sources gate excludes it by construction");
    assert.ok(d.premises.length >= 2 && d.provenance.length > 0, "carried by its premises, not by witnesses");
  }
  // F5 consumers never see it
  const folded = hl.foldHyperlexicon(r.log);
  assert.ok(folded.every((n) => !isDerivedId(n.id)), "foldHyperlexicon projects only what was HEARD");
  // the leak assay: landing products changed no premise's witness set
  for (const n of folded) assert.equal([...n.witnesses].sort().join(","), witnessesBefore.get(n.id), `premise ${n.id} unchanged`);
  // every premise's standing is exactly what it was
  const premisesAfter = premisesOf(folded, { floor: FLOOR }).premises.map((n) => n.id).sort();
  assert.deepEqual(premisesAfter, r.premises.slice().sort());
});

test("typed by the act: SYN·Pattern·derived, the cell read off the cube, and re-running lands nothing new", () => {
  const r = D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  const entry = r.log.entries.find((e) => isDerivedId(e.task_id));
  assert.equal(entry.operator, "SYN");
  assert.equal(entry.operator_basis, TL.OPERATOR_BASIS.DERIVED);
  assert.equal(entry.grain, "Pattern");
  const c = cube.cellOf("SYN", "Pattern");
  assert.equal(entry.cell, `${c.op}·${c.grain}`);
  assert.equal(entry.stance, c.stance);
  assert.equal(entry.terrain, c.terrain);
  const again = D.derive(r.log, { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  assert.equal(again.log.entries.length, r.log.entries.length, "idempotent: nothing appended");
  assert.ok(again.derived.every((d) => d.landed === "unchanged"));
});

test("CONTROL (no giver): a candidate licenses nothing — derivation is a measured zero", () => {
  let decl = createDeclarationLog();
  decl = proposeCandidate(decl, { kind: "composes", rel: "replaces", yields: "after", acquisition: {}, source: "relay ledger" }).log;
  const r = D.derive(relayLedger(), { declarations: decl, floor: FLOOR, maxSteps: 8 });
  assert.equal(r.derived.length, 0);
  assert.equal(r.licences.length, 0);
  assert.equal(r.candidates.length, 1, "the candidate is disclosed, not silently ignored");
  assert.ok(r.withheld.length > 0, "chains were in contact and withheld for want of a licence: " + JSON.stringify(r.withheld));
});

test("CONTROL (perturbation): redealt premises derive a DIFFERENT set; licensed ⊆ naive on both", () => {
  const real = relayLedger({ plantCycle: false });
  const rReal = D.derive(real, { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  const notes = hl.foldHyperlexicon(real);
  // the redeal is a different material: rebuild a ledger from the permuted notes
  const dealt = redeal(notes, { seed: 7 });
  let alt = hl.createHyperlexicon();
  for (const n of dealt) for (const w of n.witnesses) alt = hl.hear(alt, { subject: n.subject, verb: n.verb, object: n.object, witness: w, spans: n.spans });
  const rAlt = D.derive(alt, { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  const sReal = new Set(rReal.derived.map(triple)), sAlt = new Set(rAlt.derived.map(triple));
  assert.notDeepEqual([...sReal].sort(), [...sAlt].sort(), "the derived set moved when the premises moved");
  // the standing regression: the licensed set is a SUBSET of the unlicensed join
  for (const [r, ns] of [[rReal, notes], [rAlt, hl.foldHyperlexicon(alt)]]) {
    const naive = naiveJoin(premisesOf(ns, { floor: FLOOR }).premises, { base: "replaces", yields: "after" });
    for (const d of r.derived) assert.ok(naive.has(triple(d)), `licensed reached a fact naive did not: ${triple(d)}`);
  }
});

test("THE VETO: a uniqueness violation among the premises stops the licensed pair, reported apart from withheld", () => {
  const r = D.derive(relayLedger({ plantSecondPredecessor: true }), { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  assert.ok(r.audit.some((row) => row.refuted), "the audit refuted the adjacency claim: " + JSON.stringify(r.audit.map((a) => a.refuted)));
  assert.equal(r.derived.length, 0, "nothing is derived under a refuted licence");
  assert.ok(r.vetoed.length > 0, "vetoed, not withheld — somebody vouched and the material refuted it");
  assert.equal(r.withheld.length, 0);
});

test("THE CASCADE: conceding one premise withdraws every product resting on it, transitively, and nothing else", () => {
  const r = D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  const bc = hl.assertionId("b", "replaces", "c");
  const entriesBefore = r.log.entries.length;
  const c = D.concedePremise(r.log, bc, { trigger: "log-2 was a copy of log-1 — one source, not two" });
  assert.equal(c.refused, null);
  const taken = new Set(c.withdrawn.map(triple));
  assert.deepEqual([...taken].sort(), ["a|after|c", "a|after|d", "a|after|e", "b|after|d", "b|after|e"], "everything through b→c");
  const live = D.foldDerived(c.log).map(triple).sort();
  assert.deepEqual(live, ["c|after|e"], "what did not rest on it stands");
  assert.ok(!hl.foldHyperlexicon(c.log).some((n) => n.id === bc), "the premise left the F5 projection");
  assert.ok(c.log.entries.length > entriesBefore && c.log.entries.length === entriesBefore + 1 + 5, "append-only: one REC for the note, one per product, nothing deleted");
  const depths = Object.fromEntries(D.withdrawnDerived(c.log).map((w) => [triple(w), w.cascadeDepth]));
  assert.equal(depths["a|after|c"], 1, "a→c rests DIRECTLY on b→c");
  assert.equal(depths["b|after|d"], 1, "so does b→d");
  assert.ok(depths["a|after|e"] >= 2, "a→e rests on a product that rested on b→c: depth " + depths["a|after|e"]);
  // a re-derivation over the conceded ledger does not resurrect them
  const again = D.derive(c.log, { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  assert.deepEqual(D.foldDerived(again.log).map(triple).sort(), ["c|after|e"]);
});

test("THE PHYSICS: a reaction needs contact with the present — an unconnected cue derives nothing, a connected one reaches the closure through its own products", () => {
  const log = relayLedger();
  assert.throws(() => D.derive(log, { declarations: licensed(), floor: FLOOR, maxSteps: 8, cue: ["e"] }), /floor/, "a real cue needs a declared presence floor");
  const cold = D.derive(log, { declarations: licensed(), floor: FLOOR, maxSteps: 8, cue: ["z"], presenceFloor: 0.5 });
  assert.equal(cold.derived.length, 0, "nothing lit touches any chain: no presence, no reasoning");
  assert.equal(cold.withheld.length, 0, "and nothing was withheld either — the chains were never in contact");
  const warm = D.derive(log, { declarations: licensed(), floor: FLOOR, maxSteps: 8, cue: ["e"], presenceFloor: 0.5 });
  assert.equal(warm.derived.length, 6, "lit at one end, the front propagates because each product lights its own ends");
  assert.ok(warm.quiescent);
});

test("a withdrawal or a concession without a trigger is refused, and an unknown note is named", () => {
  const r = D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  assert.equal(D.withdrawDerived(r.log, { premise: "x" }, {}).refused.type, "no_trigger");
  assert.equal(hl.concede(r.log, "nobody|did|this", { trigger: "t" }).refused.type, "unknown_note");
  assert.equal(hl.concede(r.log, hl.assertionId("a", "replaces", "b"), {}).refused.type, "no_trigger");
});

test("a derivation the material later STATES is reported as such, never double-counted as a sighting", () => {
  const r = D.derive(relayLedger(), { declarations: licensed(), floor: FLOOR, maxSteps: 8 });
  const log = hl.hear(r.log, { subject: "a", verb: "after", object: "c", witness: "log-3~read-v1", spans: [span("log-3", 1)] });
  const ac = D.foldDerived(log).find((d) => triple(d) === "a|after|c");
  assert.equal(ac.stated, true);
  assert.deepEqual(ac.witnesses, [], "the derived note still carries no witness — the heard note is a separate F5 note");
  const heard = hl.foldHyperlexicon(log).find((n) => n.id === hl.assertionId("a", "after", "c"));
  assert.equal(heard.witnesses.length, 1);
});
