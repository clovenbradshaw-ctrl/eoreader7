// grid.test.mjs — the composition law against the REAL engine algebra
// (operators.js, holon/task-log.js), the same relative-path pattern
// build-log.test.mjs already uses. No stubs: a refusal here is a refusal
// the real `validateChain`/`append`/`projectTasks` would also produce.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as operators from "../kernel/cube.js";
import * as taskLog from "../kernel/task-log.js";
import { makeGrid, resolveStance, tokenizeAct, VERBS, STANCE_SHORTHANDS, flattenTerrains } from "./grid.js";
import { CAPACITIES, findCapacity, unresolvedCapacity, listCapacities } from "../organs/index.js";

function freshGrid() {
  const grid = makeGrid({ operators, taskLog });
  grid.withCapacities({ findCapacity, unresolvedCapacity });
  return grid;
}

// ── tokenizer ────────────────────────────────────────────────────────────────

test("tokenizeAct: unknown verb returns null so a caller can fall through", () => {
  assert.equal(tokenizeAct("wobble at Entity from encounter"), null);
  assert.equal(tokenizeAct(""), null);
});

test("tokenizeAct: reads clauses order-free and inline key:value tokens", () => {
  const t = tokenizeAct('distinguish zone-2 at Network from encounter ground drone-log broken:rotation warrant:temporal-adjacency');
  assert.equal(t.verb, "distinguish");
  assert.equal(t.object, "zone-2");
  assert.equal(t.terrain, "Network");
  assert.equal(t.stanceToken, "encounter");
  assert.equal(t.ground, "drone-log");
  assert.equal(t.broken, "rotation");
  assert.equal(t.warrant, "temporal-adjacency");
});

// ── stance resolution ────────────────────────────────────────────────────────

test("resolveStance: bare mode resolves against the supplied terrain grain", () => {
  const r = resolveStance("differentiate", "Figure");
  assert.equal(r.mode, "Differentiate");
  assert.equal(r.grain, "Figure");
  assert.equal(r.cell, "Differentiate·Figure");
});

test("resolveStance: named shorthand resolves when its grain matches the terrain", () => {
  const r = resolveStance("extraction", "Figure");
  assert.equal(r.mode, "Differentiate");
  assert.equal(r.shorthand, "extraction");
});

test("resolveStance: named shorthand refuses when its grain does not match the terrain", () => {
  const r = resolveStance("closure", "Figure"); // closure = generate·pattern
  assert.ok(r.refused);
  assert.equal(r.refused.type, "stance_grain_mismatch");
});

test("resolveStance: compound mode·grain form parses and checks grain agreement", () => {
  const ok = resolveStance("generate·pattern", "Pattern");
  assert.equal(ok.mode, "Generate");
  const mismatch = resolveStance("generate.pattern", "Figure");
  assert.ok(mismatch.refused);
});

test("resolveStance: unknown token is refused, never guessed", () => {
  const r = resolveStance("vibing", "Figure");
  assert.ok(r.refused);
  assert.equal(r.refused.type, "unknown_stance");
});

test("resolveStance: empty stance is refused — an undeclared stance is unfalsifiable", () => {
  const r = resolveStance("", "Figure");
  assert.ok(r.refused);
  assert.equal(r.refused.type, "no_stance");
});

test("resolveStance: `encounter` is grain-flexible, unlike the other three shorthands — pinned against §5's own worked example", () => {
  // The document's §5 worked example reads `distinguish at Network from
  // encounter` — Network is Pattern-grain. A Figure-locked `encounter`
  // (the naive reading of the shorthand table) could never parse this.
  const atPattern = resolveStance("encounter", "Pattern");
  assert.equal(atPattern.mode, "Generate");
  assert.equal(atPattern.grain, "Pattern");
  const atGround = resolveStance("encounter", "Ground");
  assert.equal(atGround.grain, "Ground");
  const atFigure = resolveStance("encounter", "Figure");
  assert.equal(atFigure.grain, "Figure");
});

test("VERBS: eight surface verbs, `distinguish` alone carries two operators", () => {
  assert.equal(Object.keys(VERBS).length, 8);
  assert.deepEqual(VERBS.distinguish.ops, ["SIG", "INS"]);
  for (const [verb, { ops }] of Object.entries(VERBS)) {
    if (verb !== "distinguish") assert.equal(ops.length, 1, verb);
  }
});

// ── grammar acceptance per verb ─────────────────────────────────────────────

test("seven of the eight verbs parse a well-formed line with no log context", () => {
  // `separate` and `relate` are log-aware refusals (individuation, referent
  // resolution) — covered in their own tests below, against a real log
  // rather than the `{}` empty context this test uses for the rest.
  const grid = freshGrid();
  const lines = [
    "void at Void from differentiate ground drone-log broken:rotation",
    "distinguish zone at Entity from encounter ground drone-log broken:rotation",
    "synthesize cast, alpha at Field from generate",
    "define finding at Field from generate",
    "evaluate finding at Field from differentiate ground drone-log broken:rotation",
    "revise finding at Field from generate because it was wrong supersedes act-0",
  ];
  for (const line of lines) {
    const out = grid.parseAct(line, {});
    assert.equal(out.ok, true, `expected ok for: ${line} — got ${JSON.stringify(out.refusal)}`);
  }
});

test("void refuses without a named ground", () => {
  const grid = freshGrid();
  const out = grid.parseAct("void at Void from differentiate", {});
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "no_ground");
});

test("distinguish refuses without a named ground", () => {
  const grid = freshGrid();
  const out = grid.parseAct("distinguish zone at Entity from encounter", {});
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "no_ground");
});

test("distinguish is medium-blind: lands at a Structure-domain terrain, not re-derived from SIG/INS's own Existence domain", () => {
  const grid = freshGrid();
  const out = grid.parseAct("distinguish zone-2 at Network from encounter ground drone-log broken:rotation", {});
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
  assert.equal(out.event.terrain, "Network");
  assert.equal(out.event.domain, "Structure");
});

test("separate refuses at a Ground-grain terrain — nothing individuated yet to separate", () => {
  const grid = freshGrid();
  const out = grid.parseAct("separate drone-log at Field from differentiate", {});
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "not_individuated");
});

test("separate refuses when its object has not been individuated on the log yet", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const out = grid.parseAct("separate zone-2 at Network from differentiate", { log });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "not_individuated");
});

test("separate lands once its object is already established on the log", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const d = grid.parseAct("distinguish zone-2 at Network from encounter ground drone-log broken:rotation", { log });
  assert.equal(d.ok, true);
  ({ log } = grid.land(log, d.event));
  const out = grid.parseAct("separate zone-2 at Network from differentiate", { log });
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
});

test("relate refuses without two referents", () => {
  const grid = freshGrid();
  const out = grid.parseAct("relate zone-2 at Link from cultivation", {});
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "no_referents");
});

test("relate refuses two unresolved referents unless warranted", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const bare = grid.parseAct("relate zone-2 to council-vote-mar-3 at Link from cultivation", { log });
  assert.equal(bare.ok, false);
  assert.equal(bare.refusal.type, "referent_unresolved");

  const warranted = grid.parseAct("relate zone-2 to council-vote-mar-3 at Link from cultivation warrant:temporal-adjacency", { log });
  assert.equal(warranted.ok, true, JSON.stringify(warranted.refusal));
  assert.equal(warranted.event.warrant, "temporal-adjacency");
});

test("relate lands once both referents are established on the log", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  for (const line of [
    "distinguish zone-2 at Entity from encounter ground drone-log broken:rotation",
    "distinguish council-vote-mar-3 at Entity from encounter ground council-minutes broken:rotation",
  ]) {
    const p = grid.parseAct(line, { log });
    assert.equal(p.ok, true, JSON.stringify(p.refusal));
    ({ log } = grid.land(log, p.event));
  }
  const out = grid.parseAct("relate zone-2 to council-vote-mar-3 at Link from cultivation", { log });
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
});

test("synthesize refuses fewer than two parts", () => {
  const grid = freshGrid();
  const out = grid.parseAct("synthesize finding at Field from generate", {});
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "no_parts");
});

test("synthesize refuses parts that share no warranting relation and reference no capacity", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const out = grid.parseAct("synthesize alpha, beta at Field from generate", { log });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "unwarranted_synthesis");
});

test("synthesize lands when a capacity is referenced among its parts", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const out = grid.parseAct("synthesize cast, alpha at Field from generate", { log });
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
});

test("synthesize lands when its parts were already related", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  for (const line of [
    "distinguish alpha at Entity from encounter ground m broken:rotation",
    "distinguish beta at Entity from encounter ground m broken:rotation",
  ]) {
    const p = grid.parseAct(line, { log });
    ({ log } = grid.land(log, p.event));
  }
  const r = grid.parseAct("relate alpha to beta at Link from cultivation", { log });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  ({ log } = grid.land(log, r.event));
  const out = grid.parseAct("synthesize alpha, beta at Field from generate", { log });
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
});

test("synthesize refuses when declared from a relate posture — the one named stance-law rule", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const out = grid.parseAct("synthesize cast, alpha at Field from relate", { log });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "illegal_stance");
});

test("define parses without a companion evaluate — that check is fold-time, not grammar-time", () => {
  const grid = freshGrid();
  const out = grid.parseAct("define finding at Field from generate", {});
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
  assert.equal(out.event.requiresEvaluate, true);
});

test("evaluate refuses without a constructed ground", () => {
  const grid = freshGrid();
  const out = grid.parseAct("evaluate finding at Field from differentiate", {});
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "no_ground");
});

test("evaluate refuses an unknown declared verdict", () => {
  const grid = freshGrid();
  const out = grid.parseAct("evaluate finding at Field from differentiate ground m broken:rotation verdict:maybe", {});
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "unknown_verdict");
});

test("revise refuses without a trigger or a target", () => {
  const grid = freshGrid();
  const noTrigger = grid.parseAct("revise finding at Field from generate supersedes act-0", {});
  assert.equal(noTrigger.ok, false);
  assert.equal(noTrigger.refusal.type, "no_trigger");

  const noTarget = grid.parseAct("revise finding at Field from generate because it was wrong", {});
  assert.equal(noTarget.ok, false);
  assert.equal(noTarget.refusal.type, "no_target");
});

test("revise refuses a target that is not on the log", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const out = grid.parseAct("revise finding at Field from generate because it was wrong supersedes act-99", { log });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "target_not_found");
});

// ── landing and the append-only log ─────────────────────────────────────────

test("distinguish lands two task-log entries (SIG then INS), never one", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const p = grid.parseAct("distinguish zone-2 at Entity from encounter ground m broken:rotation", { log });
  const landed = grid.land(log, p.event);
  log = landed.log;
  assert.equal(landed.ids.length, 2);
  const entries = log.entries.filter((e) => landed.ids.includes(e.task_id));
  assert.deepEqual(entries.map((e) => e.operator), ["SIG", "INS"]);
  assert.equal(entries[0].actGroup, "SIG+INS");
  // SIG before INS is forward in the engine's real OPERATOR_ORDER — the
  // referee stays silent on this pair.
  const flags = taskLog.checkCubeProgression(log);
  assert.equal(flags.length, 0);
});

test("append-only: revise supersedes an act on the fold without erasing it from the raw log", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const d = grid.parseAct("define finding at Field from generate", { log });
  const landedD = grid.land(log, d.event);
  log = landedD.log;
  const targetId = landedD.ids[0];
  assert.ok(log.entries.some((e) => e.task_id === targetId));

  const beforeCount = log.entries.length;
  const r = grid.parseAct(`revise finding at Field from generate because it was wrong supersedes ${targetId}`, { log });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  const landedR = grid.land(log, r.event);
  log = landedR.log;

  // The raw log only grows.
  assert.equal(log.entries.length, beforeCount + 1);
  assert.ok(log.entries.some((e) => e.task_id === targetId), "the superseded entry is still on the log");

  // But the fold no longer shows the superseded act as live.
  const { acts } = grid.foldGrid(log);
  assert.ok(!acts.some((a) => a.task_id === targetId));
  assert.ok(acts.some((a) => a.task_id === landedR.ids[0]));
});

// ── DEF landing status ───────────────────────────────────────────────────────

test("foldGrid: a define with no companion evaluate lands as a wish, not testimony", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const d = grid.parseAct("define finding at Field from generate", { log });
  ({ log } = grid.land(log, d.event));
  const { landings } = grid.foldGrid(log);
  assert.equal(landings.length, 1);
  assert.equal(landings[0].status, "wish");
});

test("foldGrid: a define whose companion evaluate holds lands as testimony", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const d = grid.parseAct("define finding at Field from generate", { log });
  ({ log } = grid.land(log, d.event));
  const e = grid.parseAct("evaluate finding at Field from differentiate ground m broken:rotation verdict:holds", { log });
  ({ log } = grid.land(log, e.event));
  const { landings } = grid.foldGrid(log);
  assert.equal(landings[0].status, "testimony");
  assert.ok(landings[0].evaluatedBy);
});

test("foldGrid: a define whose companion evaluate refuses lands as refused, not testimony", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const d = grid.parseAct("define finding at Field from generate", { log });
  ({ log } = grid.land(log, d.event));
  const e = grid.parseAct("evaluate finding at Field from differentiate ground m broken:rotation verdict:refused", { log });
  ({ log } = grid.land(log, e.event));
  const { landings } = grid.foldGrid(log);
  assert.equal(landings[0].status, "refused");
});

test("foldGrid: two different defines of the same object never cross-match to each other's evaluate", () => {
  // Regression for a real bug: Array.find always returned the FIRST
  // same-object evaluate, so a second, unrelated define of "finding"
  // silently inherited the first define's companion.
  const grid = freshGrid();
  let log = grid.createLog();
  const d1 = grid.parseAct("define finding at Field from generate", { log });
  ({ log } = grid.land(log, d1.event));
  const e1 = grid.parseAct("evaluate finding at Field from differentiate ground m broken:rotation verdict:holds", { log });
  ({ log } = grid.land(log, e1.event));
  const d2 = grid.parseAct("define finding at Field from generate", { log });
  ({ log } = grid.land(log, d2.event));
  // d2 has no companion of its own yet — it must NOT borrow e1.
  const { landings } = grid.foldGrid(log);
  const [l1, l2] = landings;
  assert.equal(l1.status, "testimony");
  assert.equal(l2.status, "wish", "the second define must not inherit the first define's evaluate");
});

test("foldGrid: a later evaluate corrects an earlier verdict for the SAME define", () => {
  // Regression: Array.find's first-match behaviour meant a corrected
  // re-run of `evaluate` (e.g. refused, then re-checked and holds) could
  // never be seen — the define stayed stuck on the first verdict forever.
  const grid = freshGrid();
  let log = grid.createLog();
  const d = grid.parseAct("define finding at Field from generate", { log });
  ({ log } = grid.land(log, d.event));
  const bad = grid.parseAct("evaluate finding at Field from differentiate ground m broken:rotation verdict:refused", { log });
  ({ log } = grid.land(log, bad.event));
  const fixed = grid.parseAct("evaluate finding at Field from differentiate ground m broken:seed verdict:holds", { log });
  ({ log } = grid.land(log, fixed.event));
  const { landings } = grid.foldGrid(log);
  assert.equal(landings.length, 1);
  assert.equal(landings[0].status, "testimony", "the later, corrected evaluate must win over the earlier refused one");
});

test("void/distinguish/evaluate require BOTH a candidate and a perturbation, not either alone", () => {
  // Regression: `hasGround` used `||`, so `ground m` with no `broken:`
  // (or `broken:x` with no candidate) each independently passed.
  const grid = freshGrid();
  const groundOnly = grid.parseAct("void at Void from differentiate ground m", {});
  assert.equal(groundOnly.ok, false, "a candidate with no perturbation is half a ground, not a whole one");
  assert.equal(groundOnly.refusal.type, "no_ground");
  const brokenOnly = grid.parseAct("void at Void from differentiate broken:rotation", {});
  assert.equal(brokenOnly.ok, false, "a perturbation with no candidate is half a ground, not a whole one");
  assert.equal(brokenOnly.refusal.type, "no_ground");
});

test("relate: a referent whose own name contains a bare \"to\" does not fracture the split, when quoted", () => {
  // Regression: splitting the joined object STRING on /\s+to\s+/ could not
  // tell a referent's own words from the separator — a referent literally
  // named "commute to work" produced three parts and a wrong refusal.
  const grid = freshGrid();
  let log = grid.createLog();
  const out = grid.parseAct('relate "commute to work" to council-vote-mar-3 at Link from cultivation warrant:g', { log });
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
  assert.deepEqual(out.event.referents, ["commute to work", "council-vote-mar-3"]);
});

test("synthesize: a comma inside a quoted part name does not fracture the split", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const out = grid.parseAct('synthesize cast, "Nashville, TN" at Field from generate', { log });
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
});

test("synthesize: a part merely sharing a substring with a related referent does not warrant the synthesis", () => {
  // Regression: the relation check used String.includes against the
  // relate act's raw object text, so "zone" (a synthesize part) matched
  // inside "zone-99 to zone-100" even though "zone" was never itself
  // related to anything.
  const grid = freshGrid();
  let log = grid.createLog();
  for (const line of [
    "distinguish zone-99 at Entity from encounter ground m broken:rotation",
    "distinguish zone-100 at Entity from encounter ground m broken:rotation",
  ]) {
    const p = grid.parseAct(line, { log });
    ({ log } = grid.land(log, p.event));
  }
  const r = grid.parseAct("relate zone-99 to zone-100 at Network from generate", { log });
  assert.equal(r.ok, true, JSON.stringify(r.refusal));
  ({ log } = grid.land(log, r.event));
  const out = grid.parseAct("synthesize zone, alpha at Field from generate", { log });
  assert.equal(out.ok, false, "\"zone\" was never itself related — it only resembles a related referent's prefix");
  assert.equal(out.refusal.type, "unwarranted_synthesis");
});

test("synthesize: the actual related pair (both referents named) does warrant the synthesis", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  for (const line of [
    "distinguish zone-99 at Entity from encounter ground m broken:rotation",
    "distinguish zone-100 at Entity from encounter ground m broken:rotation",
  ]) {
    const p = grid.parseAct(line, { log });
    ({ log } = grid.land(log, p.event));
  }
  const r = grid.parseAct("relate zone-99 to zone-100 at Network from generate", { log });
  ({ log } = grid.land(log, r.event));
  const out = grid.parseAct("synthesize zone-99, zone-100 at Field from generate", { log });
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
});

// ── attachResult ─────────────────────────────────────────────────────────────

test("attachResult: refuses a target that is not on the log", () => {
  const grid = freshGrid();
  const log = grid.createLog();
  const out = grid.attachResult(log, "act-99", { count: 3 });
  assert.equal(out.ok, false);
  assert.equal(out.refusal.type, "target_not_found");
});

test("attachResult: lands a result onto an already-landed act without re-typing it, and never erases the raw entries", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const p = grid.parseAct("distinguish zone-2 at Entity from encounter ground m broken:rotation", { log });
  const landed = grid.land(log, p.event);
  log = landed.log;
  const insId = landed.ids[1]; // INS is the second of the two entries `distinguish` lands
  const beforeCount = log.entries.length;
  const out = grid.attachResult(log, insId, { count: 2, referents: [{ surface: "Pierre" }, { surface: "Natasha" }] });
  assert.equal(out.ok, true, JSON.stringify(out.refusal));
  log = out.log;
  assert.equal(log.entries.length, beforeCount + 1);
  const { acts } = grid.foldGrid(log);
  const withResult = acts.find((a) => a.task_id === insId);
  assert.equal(withResult.result.count, 2);
  assert.equal(withResult.operator, "INS", "the result attaches to the same task; it does not re-type it");
});

// ── capacities.js ────────────────────────────────────────────────────────────

test("capacities: every entry names a real terrain, and every field is filled", () => {
  const validTerrains = new Set(Object.values(operators.TERRAIN_BY_DOMAIN).flatMap((byGrain) => Object.values(byGrain)));
  for (const c of CAPACITIES) {
    assert.ok(c.id && c.module && c.fn && c.terrain && c.op, JSON.stringify(c));
    assert.ok(validTerrains.has(c.terrain), `${c.id}: "${c.terrain}" is not one of the nine terrains`);
  }
});

test("capacities: every entry's declared terrain is domain-consistent with its declared op — checked by the algebra, not by the file's own comments", () => {
  // Domain is fixed by the operator letter alone (operators.js::OP_DOMAIN,
  // reached here via the exported `operatorOf`), never a free label — so a
  // capacity's terrain must equal TERRAIN_BY_DOMAIN[domain(op)][grain of
  // its declared terrain]. This is the check the module's own header says
  // caught two entries by hand while the table was written (`skill`,
  // `build`); it is asserted mechanically here so a future entry gets the
  // same check automatically rather than depending on someone doing the
  // arithmetic again by eye.
  const byTerrain = flattenTerrains(operators.TERRAIN_BY_DOMAIN);
  for (const c of CAPACITIES) {
    const ops = c.op.split("+");
    const domains = new Set(ops.map((op) => operators.cellOf(op, "Ground").domain));
    assert.equal(domains.size, 1, `${c.id}: its operator(s) ${c.op} do not share one domain`);
    const [domain] = domains;
    const { grain } = byTerrain.get(c.terrain);
    const expectedTerrain = operators.TERRAIN_BY_DOMAIN[domain][grain];
    assert.equal(c.terrain, expectedTerrain, `${c.id}: op ${c.op} is ${domain}-domain, grain ${grain} → should be terrain "${expectedTerrain}", not "${c.terrain}"`);
  }
});

test("findCapacity: exact id resolves, case-insensitively; unknown names refuse", () => {
  assert.ok(findCapacity("cast"));
  assert.ok(findCapacity("CAST"));
  assert.equal(findCapacity("spiral_animator"), null);
});

test("unresolvedCapacity: shape matches the document's own refusal wording", () => {
  const g = unresolvedCapacity("spiral_animator");
  assert.equal(g.gap, "unresolved_capacity");
  assert.match(g.detail, /spiral_animator/);
  assert.match(g.detail, /unresolved capacity/);
});

test("listCapacities returns the same frozen table", () => {
  assert.equal(listCapacities(), CAPACITIES);
});

// ── the claim-id spine (Per-Source Testimony spec, BUILD-0) ─────────────────

test("mintClaimId: deterministic and content-addressed — same triple, same id, twice", async () => {
  const grid = freshGrid();
  const a = await grid.mintClaimId({ subject: "Hamlin", verb: "was", object: "vice president" });
  const b = await grid.mintClaimId({ subject: "Hamlin", verb: "was", object: "vice president" });
  assert.equal(a, b);
  assert.match(a, /^@[0-9a-f]{64}$/);
});

test("mintClaimId: a different object mints a different id", async () => {
  const grid = freshGrid();
  const a = await grid.mintClaimId({ subject: "Hamlin", verb: "was", object: "vice president" });
  const b = await grid.mintClaimId({ subject: "Hamlin", verb: "was", object: "president" });
  assert.notEqual(a, b);
});

test("mintClaimId: whitespace/case are normalized — a phrasing difference judge() itself already normalizes mints the SAME id", async () => {
  const grid = freshGrid();
  const a = await grid.mintClaimId({ subject: "Hamlin", verb: "was", object: "vice president" });
  const b = await grid.mintClaimId({ subject: "  hamlin ", verb: "WAS", object: "vice   president" });
  assert.equal(a, b);
});

test("land(): threads claim_id through onto the PROPOSE entry, exactly like warrant/because — omitted, unchanged from before this pass", () => {
  const grid = freshGrid();
  const log0 = grid.createLog();
  const parsed = grid.parseAct("distinguish zone-2 at Network from encounter ground drone-log broken:rotation", { log: log0 });
  assert.equal(parsed.ok, true);

  const withoutId = grid.land(log0, parsed.event);
  const bare = withoutId.log.entries.find((e) => e.task_id === withoutId.ids[0]);
  assert.equal(bare.claim_id, undefined);

  const withId = grid.land(log0, { ...parsed.event, claim_id: "@abc123" });
  const stamped = withId.log.entries.find((e) => e.task_id === withId.ids[0]);
  assert.equal(stamped.claim_id, "@abc123");
  // nothing else about the entry changed by adding the one field
  assert.equal(stamped.domain, bare.domain);
  assert.equal(stamped.grain, bare.grain);
});

test("attachResult(): claim_id rides in `extra` exactly like a computed verdict already does — zero new grid.js surface needed", () => {
  const grid = freshGrid();
  const log0 = grid.createLog();
  const parsed = grid.parseAct('evaluate "Hamlin was VP" at Link from differentiate ground m broken:rotation', { log: log0 });
  const landed = grid.land(log0, parsed.event);
  const withResult = grid.attachResult(landed.log, landed.ids[0], { rawVerdict: "holds" }, { verdict: "holds", claim_id: "@def456" });
  assert.equal(withResult.ok, true);
  const { acts } = grid.foldGrid(withResult.log);
  const act = acts.find((a) => a.task_id === landed.ids[0]);
  assert.equal(act.verdict, "holds");
  assert.equal(act.claim_id, "@def456");
});

test("foldClaim: slices one claim's entries out of a log carrying several, whether the claim_id arrived via land() or attachResult()", () => {
  const grid = freshGrid();
  let log = grid.createLog();

  // "void" — single-op (NUL), unlike "distinguish" (SIG+INS, two entries per
  // landing) — keeps this test's own arithmetic legible.
  const p1 = grid.parseAct("void at Void from differentiate ground m broken:rotation", { log });
  ({ log } = grid.land(log, { ...p1.event, claim_id: "@aaa" }));

  const p2 = grid.parseAct('evaluate "zone-b checked" at Link from differentiate ground m broken:rotation', { log });
  ({ log } = grid.land(log, { ...p2.event, claim_id: "@bbb" }));

  const p3 = grid.parseAct('evaluate "zone-a checked" at Link from differentiate ground m broken:rotation', { log });
  const landed3 = grid.land(log, p3.event); // no claim_id on the ACT itself this time
  log = landed3.log;
  log = grid.attachResult(log, landed3.ids[0], { holds: true }, { claim_id: "@aaa" }).log;

  const folded = grid.foldClaim(log, "@aaa");
  assert.equal(folded.cells.length, 2); // p1's own PROPOSE (void) + p3's RESULT (evaluate) — never p2's @bbb entry
  assert.ok(folded.cells.every((c) => c.claim_id === "@aaa"));
});

test("foldClaim: an unknown claim_id folds to zero cells, never a throw", () => {
  const grid = freshGrid();
  const log = grid.createLog();
  const folded = grid.foldClaim(log, "@nothing-landed-here");
  assert.deepEqual(folded.cells, []);
  assert.deepEqual(folded.domainsCovered, []);
});

test("foldClaim: domain/grain filters narrow independently, reading whatever domain/grain the ORIGINAL act already declared", () => {
  const grid = freshGrid();
  let log = grid.createLog();

  const existential = grid.parseAct("void at Void from differentiate ground m broken:rotation", { log }); // Existence×Ground
  ({ log } = grid.land(log, { ...existential.event, claim_id: "@ccc" }));

  // "Link" is Structure-domain (TERRAIN_BY_DOMAIN.Structure.Figure), not
  // Interpretation — a real thing worth being exact about here, since
  // capacity-runner.js's own evaluate lines conventionally use `at Link`
  // today even though an EVA verdict is semantically Interpretation-domain
  // (the spec's own leaf/crown table wants "Lens"). Disclosed, not fixed
  // by this test — it tests what the grammar actually does.
  const structural = grid.parseAct('evaluate "zone-2 checked" at Link from differentiate ground m broken:rotation', { log });
  ({ log } = grid.land(log, { ...structural.event, claim_id: "@ccc" }));

  assert.equal(grid.foldClaim(log, "@ccc", { domain: "Existence" }).cells.length, 1);
  assert.equal(grid.foldClaim(log, "@ccc", { domain: "Structure" }).cells.length, 1);
  assert.equal(grid.foldClaim(log, "@ccc", { domain: "Interpretation" }).cells.length, 0);
  assert.deepEqual(grid.foldClaim(log, "@ccc").domainsCovered.sort(), ["Existence", "Structure"]);
});

test("foldClaim: a cursor (`at`) excludes cells landed after it — the same 'as of' reading foldBuild gives code, applied to a claim", () => {
  const grid = freshGrid();
  let log = grid.createLog();
  const p1 = grid.parseAct("void at Void from differentiate ground m broken:rotation", { log });
  const landed1 = grid.land(log, { ...p1.event, claim_id: "@ccc" });
  log = landed1.log;
  const cursorSeq = log.entries.find((e) => e.task_id === landed1.ids[0]).seq;

  const p2 = grid.parseAct('evaluate "zone-2 checked" at Link from differentiate ground m broken:rotation', { log });
  ({ log } = grid.land(log, { ...p2.event, claim_id: "@ccc" }));

  assert.equal(grid.foldClaim(log, "@ccc").cells.length, 2);
  assert.equal(grid.foldClaim(log, "@ccc", { at: cursorSeq }).cells.length, 1);
});
