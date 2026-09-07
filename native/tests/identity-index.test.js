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
