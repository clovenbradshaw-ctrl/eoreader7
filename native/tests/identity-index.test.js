// The edges a value stands in, indexed (2026-09-07): the same recanonicalization
// operations, in the same order, from a lookup instead of a scan of the fold.
import test from "node:test";
import assert from "node:assert/strict";
import { receivedGround, applyObservation, applyDelta } from "../kernel/fold.js";
import { hyperedge } from "../kernel/hypergraph.js";
import { deriveIdentityRevision, canonicalizeHyperedge } from "../kernel/identity.js";

const T = { transient: true };
const NAMES = ["the hooded courier", "Rowan", "the blue token", "Anna", "Pierre", "the count", "Nicholas", "the old prince"];
const edge = (i) => hyperedge({ id: `edge:${i}`, relation: i % 2 ? "carried" : "met", participants: [
  { role: "actor", standing: "unresolved_surface", ref: `occ:${i}:a`, surface: NAMES[i % NAMES.length] },
  { role: "object", standing: "unresolved_surface", ref: `occ:${i}:o`, surface: NAMES[(i * 3 + 1) % NAMES.length] },
], witness: `w:${i}` });
const obs = (i, entries) => Object.freeze({ schema: "Observation@1", id: `obs:${i}`, witness: "w", anchor: null, distinctions: [], hyperedges: Object.freeze(entries), graphEntries: Object.freeze([]), provenance: {} });
const opsOf = (d) => d.operations.filter((o) => o.operator === "REC").map((o) => [o.consequence.sourceEdge, JSON.stringify(o.payload.value.participants)]);

// The reference: the scan the index replaces — every hyperedge in fold order, filtered by touches, canonicalised, compared to the current canonical found by search.
const norm = (x) => String(x ?? "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const pv = (p) => (p?.standing === "unresolved_surface" && p?.surface) ? norm(p.surface) : norm(p?.ref ?? p?.value ?? p?.surface);
const reference = (fold, alternatives, identity) => {
  const out = [];
  for (const e of fold.graphEntries.filter((x) => x?.schema === "EOHyperedge@1")) {
    if (!(e.participants ?? []).some((p) => pv(p) === identity.left || pv(p) === identity.right)) continue;
    const next = canonicalizeHyperedge(e, alternatives);
    const before = fold.graphEntries.find((x) => x?.schema === "EOCanonicalHyperedge@1" && x.sourceEdge === e.id) ?? null;
    if (before && JSON.stringify(before) === JSON.stringify(next)) continue;
    out.push([e.id, JSON.stringify(next.participants)]);
  }
  return out;
};

test("supports over a growing fold: the indexed path yields the reference scan's operations, in its order, at every step — including after canonicals exist and after an attack", () => {
  let fold = receivedGround();
  const pairs = [["the hooded courier", "Rowan"], ["Anna", "Pierre"], ["the count", "Nicholas"], ["the old prince", "Rowan"]];
  for (let i = 0; i < 48; i += 1) {
    fold = applyObservation(fold, obs(i, [edge(i), edge(100 + i)]), T);
    const [l, r] = pairs[i % pairs.length];
    const d = deriveIdentityRevision({ fold, supports: [{ left: l, right: r, witness: `w:${i}` }] });
    const con = d.operations.find((o) => o.operator === "CON");
    if (!con) { assert.deepEqual(opsOf(d), [], `step ${i}: a pair attacked earlier is distinct — no support, no recanonicalization`); continue; }
    const identity = con.payload.value;
    const alternatives = [...fold.unresolvedAlternatives.filter((x) => x.id !== identity.id), identity];
    assert.deepEqual(opsOf(d), reference(fold, alternatives, identity), `step ${i}`);
    fold = applyDelta(fold, d, T);
    if (i % 7 === 6) {
      const a = deriveIdentityRevision({ fold, attacks: [{ left: l, right: r, witness: `w:a:${i}`, reason: "incompatible multiplicity" }] });
      fold = applyDelta(fold, a, T);
    }
  }
  assert.ok(fold.graphEntries.some((x) => x.schema === "EOCanonicalHyperedge@1"), "the fixture actually produced canonicals");
});

test("an updated edge with unchanged participant values is swapped in place; a changed one recomputes — both exact", () => {
  let fold = applyObservation(receivedGround(), obs(0, [edge(1), edge(2)]), T);
  let d = deriveIdentityRevision({ fold, supports: [{ left: "Rowan", right: "the blue token", witness: "w" }] });
  fold = applyDelta(fold, d, T);
  // same values, new witness: an update the index absorbs
  fold = applyObservation(fold, obs(1, [{ ...edge(1), witness: "w:changed" }]), T);
  d = deriveIdentityRevision({ fold, supports: [{ left: "Rowan", right: "the blue token", witness: "w2" }] });
  const identity = d.operations.find((o) => o.operator === "CON").payload.value;
  assert.deepEqual(opsOf(d), reference(fold, [...fold.unresolvedAlternatives.filter((x) => x.id !== identity.id), identity], identity));
  // changed values: the update forces a recompute, and the answer is still the reference's
  const moved = hyperedge({ ...edge(2), participants: [{ role: "actor", standing: "unresolved_surface", ref: "occ:2:a", surface: "Pierre" }, { role: "object", standing: "unresolved_surface", ref: "occ:2:o", surface: "Rowan" }] });
  fold = applyObservation(fold, obs(2, [moved]), T);
  d = deriveIdentityRevision({ fold, supports: [{ left: "Pierre", right: "Rowan", witness: "w3" }] });
  const id2 = d.operations.find((o) => o.operator === "CON").payload.value;
  assert.deepEqual(opsOf(d), reference(fold, [...fold.unresolvedAlternatives.filter((x) => x.id !== id2.id), id2], id2));
});

test("ONE from-scratch build across a chain asked with extras every step — and the extras are met after the fold's edges, as the concatenation scan met them", async () => {
  const { identityStats } = await import("../kernel/identity.js");
  let fold = applyObservation(receivedGround(), obs(0, [edge(0)]), T);
  deriveIdentityRevision({ fold, supports: [{ left: "the hooded courier", right: "Rowan", witness: "w:0" }] });
  const before = identityStats.computes;
  for (let i = 1; i <= 30; i += 1) {
    const extras = [edge(i), edge(100 + i)];
    const d = deriveIdentityRevision({ fold, extraEntries: extras, supports: [{ left: "the hooded courier", right: "Rowan", witness: `w:${i}` }] });
    const identity = d.operations.find((o) => o.operator === "CON").payload.value;
    const alternatives = [...fold.unresolvedAlternatives.filter((x) => x.id !== identity.id), identity];
    const concatenated = { ...fold, graphEntries: [...fold.graphEntries, ...extras] };
    assert.deepEqual(opsOf(d), reference(concatenated, alternatives, identity), `step ${i}: the concatenation scan's operations, in its order`);
    fold = applyObservation(fold, obs(i, extras), T);
    fold = applyDelta(fold, d, T);
  }
  assert.equal(identityStats.computes, before, "thirty sentences with extras: zero further from-scratch builds");
});

test("APPENDED THEN UPDATED IN ONE DELTA: the index holds the fold's canonical (the merged second), never the stale first — the case the 480 KB gate caught at step 5534", async () => {
  const { eoOperation, deltaFold } = await import("../kernel/fold.js");
  let fold = applyObservation(receivedGround(), obs(0, [edge(1)]), T);
  const first = canonicalizeHyperedge(edge(1), [{ schema: "EOIdentityAlternative@1", id: "identity:a", left: "rowan", right: "anatole", standing: "live_hypothesis" }]);
  const second = canonicalizeHyperedge(edge(1), []);
  assert.notEqual(JSON.stringify(first.participants), JSON.stringify(second.participants), "the fixture's two canonicals differ");
  const twice = deltaFold([
    eoOperation({ id: "op:1", op: "REC", grain: "Figure", witness: "w", payload: { action: "graph-object", value: first } }),
    eoOperation({ id: "op:2", op: "REC", grain: "Figure", witness: "w", payload: { action: "graph-object", value: second } }),
  ], { id: "delta:twice" });
  fold = applyDelta(fold, twice, T);
  const held = fold.graphEntries.find((x) => x.id === first.id);
  assert.deepEqual(held.participants, second.participants, "the fold holds the merged second");
  const d = deriveIdentityRevision({ fold, supports: [{ left: "Rowan", right: "the blue token", witness: "w2" }] });
  const rec = d.operations.find((o) => o.operator === "REC" && o.consequence.sourceEdge === "edge:1");
  assert.ok(rec, "the support recanonicalizes the edge");
  assert.deepEqual(rec.consequence.from, second.participants, "its `from` is the fold's canonical, not the stale appended one");
});
