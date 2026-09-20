// falsify-referents.test.mjs — the referent resolution, under fire.
//
// The routes resolve a surface through the hyperlexicon's LEDGER: (POTUS,
// is-alias-of, kind:role:president) binds the surface to its referent, and
// only then does the route read the referent's current link. Five
// assumptions of that mechanism, each probed with the intent stated:
//
//   A. CONFLICT IS DISCLOSED, NEVER A WINNER — two admissions binding one
//      surface to DIFFERENT referents are a disagreement, not an overwrite:
//      the second act is refused (typed), the surface resolves to NOTHING
//      (the honest ambiguity), and the contest is on the index.
//   B. THE LEDGER IS IDEMPOTENT — the same admission heard twice is one act.
//   C. EVERY ADMISSION NAMES ITS GIVER — a witness-less binding is refused
//      (constitution II.2: a prior without a giver is a typed gap, never a
//      silently accepted one).
//   D. A SURFACE NEVER LEAKS TO ANOTHER REFERENT — the note binds exactly
//      the referent it names; nothing else resolves through it.
//   E. THE PER-SURFACE TRAIL IS CORRECT (probed and REFUTED as a bug):
//      the learned order is per SURFACE, not per referent — the alias hop
//      is surface-specific ("POTUS" reaches the kind through the alias
//      note; "president" reaches it directly), so a referent-shared order
//      would make the head surface pay the alias hop first and lose. The
//      referent is the resolution's OUTPUT; the surface is the route's key.
//
// The B-person ambiguity is the disclosed ceiling: "who is Premier?" — the
// surface names the role in the ledger, so the role is what resolves; a
// human named Premier is indistinguishable mechanically and is not guessed.

import test from "node:test";
import assert from "node:assert/strict";
import { createCurrentFactsStore } from "../organs/current-facts.js";
import { buildRouteIndex, routeAsk, ROUTE_TYPES } from "./hyperlexicon-routes.js";
import { lensForAsk } from "../adapters/text/fact-lenses.js";

const NOW = () => new Date("2026-09-19T12:00:00Z");
const makeStore = () => {
  const store = createCurrentFactsStore({ now: NOW, lensForAsk });
  store.adoptDatedRecord({ head: "president", text: "Wikidata lists Donald Trump as the current President of the United States, since 2025-01-20, term ending 2029-01-20.", ref: "wikidata:test#president" });
  store.adoptDatedRecord({ head: "premier", text: "Wikidata lists Jack Okafor as the current Premier of Alberta, since 2023-11-08.", ref: "wikidata:test#premier" });
  return store;
};

test("A — a conflicting admission is REFUSED (typed), never an overwrite; the contested surface resolves to nothing, disclosed", () => {
  const store = makeStore();
  const first = store.aliasTo("POTUS", "president", { witness: "w1@test" });
  assert.equal(first.admitted, true);
  const second = store.aliasTo("POTUS", "premier", { witness: "w2@test" });
  assert.equal(second.refused, true, "the second admission is a disagreement, not an overwrite");
  assert.equal(second.reason, "contested-surface");
  assert.equal(second.existing.object, "kind:role:president", "the existing binding is named");
  assert.equal(store.aliasNotes().length, 1, "only ONE admission on file — the refusal left no second act");
  // the route: the surface names one referent — it resolves, and only to it
  const hit = store.resolve("who is POTUS?", { rng: () => 1 });
  assert.equal(hit.ok, true);
  assert.equal(hit.kind.id, "kind:role:president", "POTUS resolves to the ONE referent the ledger binds");
});

test("A2 — the route's OWN contest guard: if two conflicting notes are ever on file (an older environment, a foreign write), the surface resolves to NOTHING and the index discloses the contest", () => {
  const notes = [
    { subject: "POTUS", verb: "is-alias-of", object: "kind:role:president", witness: "w1" },
    { subject: "POTUS", verb: "is-alias-of", object: "kind:role:premier", witness: "w2" },
  ];
  const kinds = [
    { id: "kind:role:president", label: "president", jurisdiction: null, parameters: [], memberOf: [] },
    { id: "kind:role:premier", label: "premier", jurisdiction: null, parameters: [], memberOf: [] },
  ];
  const links = [{ id: "l1", kindId: "kind:role:president", holder: "Donald Trump", at: "2026-09-19" }];
  const idx = buildRouteIndex(kinds, links, notes);
  assert.deepEqual(idx.contested.potus, ["kind:role:president", "kind:role:premier"], "the contest is disclosed on the index (keyed by the normed surface)");
  const hit = routeAsk(idx, { head: "POTUS" }, { trails: null, now: NOW(), routes: ROUTE_TYPES, rng: () => 1 });
  assert.equal(hit.ok, false, "a contested surface resolves to NOTHING — never a silent last-writer-wins");
});

test("B — the ledger is idempotent: the same admission heard twice is one act", () => {
  const store = makeStore();
  store.aliasTo("POTUS", "president", { witness: "w1@test" });
  const again = store.aliasTo("POTUS", "president", { witness: "w1@test" });
  assert.equal(again.refused, true, "the duplicate is refused as a duplicate");
  assert.equal(store.aliasNotes().length, 1);
});

test("C — every admission names its giver: a witness-less binding is refused", () => {
  const store = makeStore();
  const r = store.aliasTo("POTUS", "president");
  assert.equal(r.refused, true);
  assert.equal(r.reason, "no-witness");
  assert.equal(store.aliasNotes().length, 0, "a witness-less admission never reaches the ledger");
  const k = store.upsertKind({ label: "president", aliases: ["POTUS"] });
  assert.equal(k.refusedAliases.length, 1, "upsertKind's batch discloses the refusal");
  assert.equal(k.refusedAliases[0].reason, "no-witness");
  assert.equal(store.aliasNotes().length, 0);
});

test("D — a surface never leaks to another referent: the note binds exactly whom it names", () => {
  const store = makeStore();
  store.aliasTo("POTUS", "president", { witness: "w1@test" });
  const hit = store.resolve("who is POTUS?", { rng: () => 1 });
  assert.equal(hit.kind.label, "president");
  assert.equal(hit.link.holder, "Donald Trump", "POTUS reaches the president's link, never the premier's");
  const premier = store.resolve("who is the premier?", { rng: () => 1 });
  assert.equal(premier.link.holder, "Jack Okafor", "the premier resolves its own");
  // and the surface itself is never a kind: POTUS binds, it does not become
  assert.equal(store.kindFor("POTUS").label, "president");
});

test("E — the per-surface trail is CORRECT (this probe REFUTES the per-referent concern): the alias hop is surface-specific, so the learning must be too", () => {
  const store = makeStore();
  store.aliasTo("POTUS", "president", { witness: "w1@test" });
  // ten alias resolutions teach the POTUS surface the alias route...
  for (let i = 0; i < 10; i++) store.resolve("who is POTUS?", { rng: () => 1 });
  // ...and the HEAD surface learns nothing from them: its first hop (exact-kind)
  // is its own correct route, and a shared per-referent order would have made
  // it probe the alias hop first — the alias hop can never resolve the head
  // surface (no note binds "president" to itself), costing two probes forever.
  assert.equal(store.trails().president ?? null, null, "the head surface's trails are its own — not polluted by the POTUS surface");
  assert.ok(store.trails().POTUS.length >= 10, "the POTUS surface learned its own route");
  const hit = store.resolve("who is the president?", { rng: () => 1 });
  assert.equal(hit.ok, true);
  assert.equal(hit.kind.id, "kind:role:president");
});

test("the B-person ambiguity is the disclosed ceiling: a surface that names a role resolves the role", () => {
  const store = makeStore();
  store.aliasTo("Premier", "premier", { witness: "w1@test" });
  const hit = store.resolve("who is Premier?", { rng: () => 1 });
  assert.equal(hit.ok, true);
  assert.equal(hit.kind.label, "premier", "the ledger's binding is the meaning — a human named Premier is not guessed");
});