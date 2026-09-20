// stigmergy.test.mjs — the pheromone layer: deposits, evaporation, learned order.
// Real organ, no stand-ins (Wilson: the environment is the medium).
import test from "node:test";
import assert from "node:assert/strict";
import { trailWeight, deposit, trailStats, routeOrderFor, TRAIL_WINDOW, EXPLORE_EPSILON } from "./stigmergy.js";

const NOW = Date.parse("2026-09-19T12:00:00Z");
const DAY = 86400000;
const HOUR = 3600000;
const ROUTES = ["exact-kind", "alias", "jurisdiction", "ordinal", "holder"];

test("evaporation: a fresh deposit is near-full weight, an old one decays exponentially", () => {
  assert.ok(trailWeight(NOW, NOW) > 0.99);
  const week = trailWeight(NOW - 7 * DAY, NOW);
  assert.ok(Math.abs(week - Math.exp(-1)) < 0.01, `7 days at a 7-day half-life is e^-1 ≈ 0.368, got ${week}`);
  const month = trailWeight(NOW - 30 * DAY, NOW);
  assert.ok(month < 0.06, "30 days should have mostly evaporated");
});

test("deposit: appends, caps the window per head, keeps other heads' trails", () => {
  let t = {};
  for (let i = 0; i < TRAIL_WINDOW + 10; i++) t = deposit(t, { head: "president", route: "exact-kind", ok: true, ms: 10, at: NOW - i });
  assert.equal(t.president.length, TRAIL_WINDOW, "the window is capped");
  assert.equal(t.president.at(-1).ms, 10);
  t = deposit(t, { head: "president", route: "alias", ok: true, ms: 5, at: NOW });
  assert.equal(t.president.length, TRAIL_WINDOW, "capped after adding");
  t = deposit(t, { head: "mayor", route: "exact-kind", ok: true, ms: 3, at: NOW });
  assert.equal(t.mayor.length, 1);
  assert.equal(t.president.at(-1).route, "alias");
});

test("trailStats: strengths aggregate only successful deposits, decayed by age", () => {
  const t = deposit(deposit(deposit({}, { head: "president", route: "exact-kind", ok: true, ms: 20, at: NOW }), { head: "president", route: "exact-kind", ok: true, ms: 30, at: NOW - 7 * DAY }), { head: "president", route: "alias", ok: false, ms: 200, at: NOW });
  const s = trailStats(t, "president", { now: NOW, routes: ROUTES });
  const exact = s.find((x) => x.route === "exact-kind");
  const alias = s.find((x) => x.route === "alias");
  assert.ok(Math.abs(exact.strength - (1 + Math.exp(-1))) < 0.05, "a fresh hit plus a half-evaporated one");
  assert.equal(exact.hits, 2);
  assert.ok(Math.abs(exact.meanMs - 25) < 1e-9, "mean latency over hits only");
  assert.equal(alias.strength, 0, "a failed deposit contributes no strength");
  assert.equal(alias.deposits, 1);
});

test("routeOrderFor: learned order — strongest trail first, faster wins ties, untried trails last", () => {
  const t = deposit(deposit({}, { head: "president", route: "alias", ok: true, ms: 5, at: NOW }), { head: "president", route: "holder", ok: true, ms: 50, at: NOW });
  const order = routeOrderFor(t, "president", { now: NOW, routes: ROUTES, explore: 0 });
  assert.deepEqual(order, ["alias", "holder", "exact-kind", "jurisdiction", "ordinal"]);
});

test("routeOrderFor: equal strength, faster route wins", () => {
  const t = deposit(deposit({}, { head: "president", route: "exact-kind", ok: true, ms: 10, at: NOW }), { head: "president", route: "alias", ok: true, ms: 40, at: NOW });
  const order = routeOrderFor(t, "president", { now: NOW, routes: ROUTES, explore: 0 });
  assert.deepEqual(order, ["exact-kind", "alias", "jurisdiction", "ordinal", "holder"]);
});

test("routeOrderFor: evaporation demotes an old success below a fresh one", () => {
  const t = deposit(deposit({}, { head: "president", route: "holder", ok: true, ms: 5, at: NOW - 28 * DAY }), { head: "president", route: "exact-kind", ok: true, ms: 60, at: NOW });
  const order = routeOrderFor(t, "president", { now: NOW, routes: ROUTES, explore: 0 });
  assert.deepEqual(order, ["exact-kind", "holder", "alias", "jurisdiction", "ordinal"], "the month-old trail evaporates below the fresh one");
});

test("routeOrderFor: the scout — a never-tried route is probed first with probability epsilon", () => {
  const t = deposit({}, { head: "president", route: "exact-kind", ok: true, ms: 10, at: NOW });
  assert.deepEqual(routeOrderFor(t, "president", { now: NOW, routes: ROUTES, rng: () => 0 }), ["alias", "exact-kind", "jurisdiction", "ordinal", "holder"], "rng < epsilon scouts the first untried route");
  assert.deepEqual(routeOrderFor(t, "president", { now: NOW, routes: ROUTES, rng: () => 1 }), ["exact-kind", "alias", "jurisdiction", "ordinal", "holder"], "rng >= epsilon exploits");
  assert.ok(EXPLORE_EPSILON > 0 && EXPLORE_EPSILON < 1);
});

test("trailStats: unknown routes are measured too, and null means never tried", () => {
  const t = deposit({}, { head: "president", route: "refresh", ok: true, ms: 3, at: NOW });
  const s = trailStats(t, "president", { now: NOW, routes: ROUTES });
  const refresh = s.find((x) => x.route === "refresh");
  assert.equal(refresh.hits, 1);
  assert.equal(s.find((x) => x.route === "exact-kind").meanMs, null, "no deposits -> no mean");
});