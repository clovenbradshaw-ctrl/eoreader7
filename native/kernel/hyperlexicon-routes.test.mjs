// hyperlexicon-routes.test.mjs — KINDS and their dated LINKS: the fast hops,
// the term structure, the ledger projection. Real organ, no stand-ins.
// (Xunzi: kinds relate by resemblance; Shizhen: one specimen in a ranked kind.)
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRouteIndex, routeAsk, parseRouteRequest, currentLinkOf, linkCurrent,
  withTermStructure, isTermKind, kindNotes, serializeRoutes, loadRoutes,
  kindId, TERM_KIND, TERM_PARAMETER, ROUTE_TYPES,
} from "./hyperlexicon-routes.js";
import { factShape } from "../organs/fact-gate.js";

const NOW = new Date("2026-09-19T12:00:00Z");

const KIND = { id: kindId("president"), label: "president", jurisdiction: "United States", aliases: ["POTUS"], parameters: [TERM_PARAMETER], memberOf: [TERM_KIND] };
const LINK = { id: "kind:role:president|holds-office|donald trump", kindId: KIND.id, holder: "Donald Trump", since: "2025-01-20", until: "2029-01-20", at: "2026-09-19", ref: "wikidata:Q11696#P1308", giver: "dated-record" };
const LINK_BIDEN = { ...LINK, holder: "Joe Biden", since: "2021-01-20", until: "2025-01-20", at: "2021-01-21", giver: "dated-record", ordinal: "46th" };
const LINKS = [LINK_BIDEN, LINK];

test("the request is read off grammar: head, jurisdiction, ordinal, holder", () => {
  assert.deepEqual(parseRouteRequest("who is the president?", factShape), { head: "president", jurisdiction: null, ordinal: null, holder: null });
  assert.deepEqual(parseRouteRequest("who is the president of the United States?", factShape), { head: "president", jurisdiction: "United States", ordinal: null, holder: null });
  assert.deepEqual(parseRouteRequest("who is the 47th president?", factShape), { head: "president", jurisdiction: null, ordinal: "47th", holder: null });
  assert.deepEqual(parseRouteRequest("who is Donald Trump?", factShape), { head: "Donald Trump", jurisdiction: null, ordinal: null, holder: "Donald Trump" }, "no definite phrase: the capitalized run is both the alias candidate and the holder candidate — the hops decide which it is");
  assert.equal(parseRouteRequest("hello", factShape).head, null);
});

test("linkCurrent: the interval is a term — contains now only inside [since, until)", () => {
  assert.equal(linkCurrent(LINK, NOW), true, "inside the term");
  assert.equal(linkCurrent(LINK, new Date("2025-01-19")), false, "before the term starts");
  assert.equal(linkCurrent(LINK, new Date("2029-01-20")), false, "after the term ends");
  assert.equal(linkCurrent({ ...LINK, since: null, until: null }, NOW), true, "undated links are current by refresh");
});

test("currentLinkOf: the link whose TERM contains now wins over older terms", () => {
  assert.equal(currentLinkOf(KIND, LINKS, NOW).holder, "Donald Trump", "the covering term, not the newest row");
  assert.equal(currentLinkOf(KIND, LINKS, new Date("2023-06-01")).holder, "Joe Biden");
});

test("withTermStructure: a dated link declares the kind a kind of things that have terms", () => {
  const undated = withTermStructure({ ...KIND, parameters: [], memberOf: [] }, { ...LINK, since: null, until: null });
  assert.equal(isTermKind(undated), false, "an undated link cannot declare a term");
  const dated = withTermStructure({ ...KIND, parameters: [], memberOf: [] }, LINK);
  assert.ok(dated.parameters.includes(TERM_PARAMETER));
  assert.ok(dated.memberOf.includes(TERM_KIND));
  assert.equal(isTermKind(dated), true);
});

test("the five hops: exact-kind, alias, jurisdiction, ordinal, holder — and the honest absence", () => {
  // the alias is a LEDGER NOTE binding the surface to the referent id —
  // (POTUS, is-alias-of, kind:role:president) — never a string on the kind
  const aliasNotes = [{ subject: "POTUS", verb: "is-alias-of", object: KIND.id, witness: "test" }];
  const idx = buildRouteIndex([KIND], LINKS, aliasNotes);
  const routes = { trails: null, now: NOW, routes: ROUTE_TYPES, rng: () => 1 };
  const exact = routeAsk(idx, { head: "president" }, routes);
  assert.equal(exact.route, "exact-kind"); assert.equal(exact.kind.id, KIND.id); assert.equal(exact.link.holder, "Donald Trump");
  const alias = routeAsk(idx, { head: "POTUS" }, routes);
  assert.equal(alias.route, "alias"); assert.equal(alias.kind.id, KIND.id);
  const jur = routeAsk(idx, { jurisdiction: "United States" }, routes);
  assert.equal(jur.route, "jurisdiction"); assert.equal(jur.link.holder, "Donald Trump");
  const idxOrd = buildRouteIndex([KIND], [{ ...LINK, ordinal: "47th" }, LINK_BIDEN], aliasNotes);
  const ord = routeAsk(idxOrd, { ordinal: "47th" }, routes);
  assert.equal(ord.route, "ordinal"); assert.equal(ord.link.holder, "Donald Trump");
  const past = routeAsk(idxOrd, { ordinal: "46th" }, routes);
  assert.equal(past.route, "ordinal"); assert.equal(past.link.holder, "Joe Biden", "a past ordinal resolves the past link, never today's");
  const holder = routeAsk(idx, { holder: "Donald Trump" }, routes);
  assert.equal(holder.route, "holder"); assert.equal(holder.kind.label, "president");
  const none = routeAsk(idx, { head: "mayor" }, routes);
  assert.equal(none.ok, false); assert.equal(none.kind, null); assert.equal(none.link, null);
  assert.deepEqual(routeAsk(idx, { holder: "Nobody Q" }, routes).kind, null);
});

test("kindNotes: the ledger projection — role membership and the meta-kind of things that have terms", () => {
  const notes = kindNotes([KIND], { witness: "current-facts@1" });
  assert.deepEqual(notes, [
    { subject: "president", verb: "keeps-company", object: KIND.id, witness: "current-facts@1", because: "the role word is a member of its own role-kind" },
    { subject: KIND.id, verb: "keeps-company", object: TERM_KIND, witness: "current-facts@1", because: "this role kind carries dated links — a kind of thing that has terms" },
  ]);
  const plain = kindNotes([{ ...KIND, parameters: [], memberOf: [] }]);
  assert.equal(plain.length, 1, "an undated kind has no meta-membership");
});

test("serialize/load: the environment round-trips kinds, links, alias notes and trails", () => {
  const data = serializeRoutes({ kinds: [KIND], links: LINKS, aliasNotes: [{ subject: "POTUS", verb: "is-alias-of", object: KIND.id, witness: "test" }], trails: { president: [{ route: "exact-kind", ok: true, ms: 4, at: 1 }] } });
  const env = loadRoutes(JSON.parse(JSON.stringify(data)));
  assert.equal(env.kinds.length, 1); assert.equal(env.links.length, 2);
  assert.deepEqual(env.kinds[0].aliases, ["POTUS"]);
  assert.equal(env.aliasNotes.length, 1);
  assert.equal(env.aliasNotes[0].subject, "POTUS");
  assert.deepEqual(env.trails.president[0], { route: "exact-kind", ok: true, ms: 4, at: 1 });
  assert.deepEqual(loadRoutes(null), { kinds: [], links: [], aliasNotes: [], trails: {} });
  assert.deepEqual(loadRoutes({ schema: "other" }), { kinds: [], links: [], aliasNotes: [], trails: {} }, "foreign schema is the honest empty environment");
});