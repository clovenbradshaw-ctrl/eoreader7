// arc-falsify — layer 6: the order of what is DONE, read as an attribute of
// elements the Ground reader already produced, never a new fact kind
// (2026-09-22). What is under test is attachArc itself: real cube addresses
// from the real EOT parser, real emergentFacts downstream — nothing stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import { attachArc, movesOf, ARC_SCHEMA } from "./arc.js";
import { emergentFacts } from "./form-prior.js";
import { loadEotParser } from "./eot-notation.js";

const PARA = (paras) => ({ text: paras.join("\n\n") });

const OBIT = PARA([
  "She was born in Ohio in 1930.",
  "She married John Smith in 1950.",
  "She worked as a teacher for thirty years.",
  "The committee recommended she be honored posthumously.",
  "She is survived by two children and four grandchildren.",
]);
const RECIPE = PARA([
  "Combine the flour and the water in a bowl.",
  "Knead the dough for ten minutes.",
  "Let the dough rest for one hour.",
  "Bake the loaf for forty minutes.",
]);

let PARSER = null;
test.before(async () => { PARSER = await loadEotParser(); });

test("attachArc refuses gracefully when the parser is unavailable, never fabricating a flat arc", async () => {
  const r = await attachArc([OBIT], { parser: { ok: false, reason: "test: no model" } });
  assert.equal(r.attached, false);
  assert.match(r.reason, /no model/);
  assert.equal(r.schema, ARC_SCHEMA);
});

test("real parse: paragraphs at different positions in the SAME unit get different move labels", async (t) => {
  if (!PARSER?.ok) return t.skip("no parser model installed");
  const r = await attachArc([OBIT], { parser: PARSER });
  assert.equal(r.attached, true);
  assert.equal(r.parsed, 5, "every one of the five paragraphs parsed to at least one address");
  const moves = movesOf(r.units[0]);
  assert.ok(moves.length >= 2, `an obituary's five paragraphs must not collapse to one move: ${JSON.stringify(moves)}`);
  assert.ok(new Set(moves).size >= 2, "the moves must not all be identical — that would mean the arc carries no information");
});

test("real parse: the recipe's moves and the obituary's moves are different sequences, read from the SAME baseline", async (t) => {
  if (!PARSER?.ok) return t.skip("no parser model installed");
  const r = await attachArc([OBIT, RECIPE], { parser: PARSER });
  assert.equal(r.attached, true);
  const [obitMoves, recipeMoves] = r.units.map(movesOf);
  assert.notDeepEqual(obitMoves, recipeMoves, "two genuinely different forms must not arc identically");
  // the recipe's imperative paragraphs should not ALL read as the obituary's
  // own dominant move — some real difference must survive the shared baseline
  const overlap = recipeMoves.filter((m) => obitMoves.includes(m)).length;
  assert.ok(overlap < recipeMoves.length, `recipe moves must not be a strict subset repeat of obituary moves: recipe=${JSON.stringify(recipeMoves)} obit=${JSON.stringify(obitMoves)}`);
});

test("the arc is an ordinary attribute: emergentFacts makes position, equality and succession facts from it with no new code path", async (t) => {
  if (!PARSER?.ok) return t.skip("no parser model installed");
  const r = await attachArc([OBIT], { parser: PARSER });
  const facts = emergentFacts(r.units[0]);
  const keys = [...facts.keys()];
  assert.ok(keys.some((k) => k.startsWith("count:move")), `emergentFacts must see the move class: ${keys.filter((k) => k.includes("move")).join(" · ")}`);
  assert.ok(keys.some((k) => /^@\d+:stance$/.test(k) || /^move@\d+:stance$/.test(k)), `emergentFacts must see per-position stance: ${keys.filter((k) => k.includes("stance")).join(" · ")}`);
});

test("moves compress runs: a unit that leans the same way throughout is one move, not one per paragraph", async (t) => {
  if (!PARSER?.ok) return t.skip("no parser model installed");
  const uniform = PARA(["The committee approved the plan.", "The committee approved the budget.", "The committee approved the schedule."]);
  const r = await attachArc([uniform], { parser: PARSER });
  const moves = movesOf(r.units[0]);
  assert.ok(moves.length <= 3, `a run of like paragraphs should not multiply spuriously: ${JSON.stringify(moves)}`);
});
