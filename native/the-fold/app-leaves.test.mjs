import test from "node:test";
import assert from "node:assert/strict";
import { LEAF_CONTRACTS, leafContract } from "./app-leaves.mjs";
import { UNIT_CONTRACTS } from "./app-weather-fuel.mjs";
import { COMPOSE, LEAVES_OF, FULL_UNITS, LEAF_NAMES } from "./app-compose.mjs";
import { REFERENCE_LEAVES } from "./app-weather-fuel.reference.mjs";
import { testUnit, testFunction, loadUnit, unitPrompt, contractHash } from "./app-units.mjs";

test("every leaf's reference passes every run of its oracle, and every leaf has a reference", () => {
  assert.deepEqual([...LEAF_NAMES].sort(), LEAF_CONTRACTS.map((c) => c.name).sort());
  for (const c of LEAF_CONTRACTS) { const r = testUnit(REFERENCE_LEAVES[c.name], c); assert.deepEqual(r.failures, [], `${c.name}`); }
});

test("the composed whole, built from the reference leaves, passes the WHOLE-response oracles", () => {
  for (const full of UNIT_CONTRACTS) {
    const leaves = Object.fromEntries(LEAVES_OF[full.name].map((n) => [n, loadUnit(REFERENCE_LEAVES[n], n)]));
    const r = testFunction(COMPOSE[full.name](leaves), full);
    assert.deepEqual(r.failures, [], `${full.name}`);
  }
  assert.deepEqual([...FULL_UNITS].sort(), UNIT_CONTRACTS.map((c) => c.name).sort());
});

test("a leaf that only reproduces the example row it was shown fails the rows it was not shown", () => {
  for (const c of LEAF_CONTRACTS) {
    const ref = loadUnit(REFERENCE_LEAVES[c.name], c.name);
    const first = c.runs[0];
    const frozen = JSON.stringify(ref(...first.args()));
    const r = testUnit(`function ${c.name}(){return ${frozen};}`, c);
    assert.equal(r.ok, false, `${c.name}: a constant must not pass`);
  }
});

test("each slip a small model actually made is caught and named by what it got wrong", () => {
  const fix = (n, a, b) => { assert.ok(REFERENCE_LEAVES[n].includes(a), `${n} has ${a}`); return REFERENCE_LEAVES[n].replace(a, b); };
  let r = testUnit(fix("parsePlace", "[r.name,r.admin1,r.country]", "[r.name,r.region,r.country]"), leafContract("parsePlace"));
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /label/);
  r = testUnit(fix("wttrHour", '.padStart(4,"0")', ""), leafContract("wttrHour"));
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /at is/);
  assert.equal(testUnit(REFERENCE_LEAVES.metnoHour, leafContract("metnoHour")).ok, true, "control: the unchanged body passes");
  r = testUnit(fix("metnoHour", "d.wind_speed*3.6", "d.wind_speed"), leafContract("metnoHour"));
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /windSpeed/);
  r = testUnit(fix("parseStation", "if(typeof la!==\"number\"||typeof lo!==\"number\")return null;", ""), leafContract("parseStation"));
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /null|threw|km/);
  r = testUnit(REFERENCE_LEAVES.priceAfter.replaceAll("Current2", "DataB"), leafContract("priceAfter"));
  assert.equal(r.ok, false, "reading an older week's cell (DataB) instead of the newest (Current2) is caught");
  r = testUnit(fix("newestWeek", "ws[ws.length-1]", "ws[0]"), leafContract("newestWeek"));
  assert.equal(r.ok, false); assert.match(r.failures.join("\n"), /week is/);
});

test("a leaf prompt is small, shows a real row and its worked answer, and carries no apparatus vocabulary", () => {
  for (const c of LEAF_CONTRACTS) {
    const p = unitPrompt(c);
    assert.ok(p.length < 4200, `${c.name} prompt is ${p.length} chars`);
    assert.match(p, new RegExp(`${c.name}\\(`));
    assert.match(p, /must return/);
    for (const bad of [/passage/i, /the prompt/i, /stigmer/i, /oracle/i, /ledger/i]) assert.doesNotMatch(p, bad);
  }
});

test("contract hashes differ per leaf and change when the recorded bytes change", () => {
  const hs = LEAF_CONTRACTS.map(contractHash);
  assert.equal(new Set(hs).size, hs.length);
  const c = leafContract("wttrHour");
  assert.notEqual(contractHash({ ...c, salt: "other bytes" }), contractHash(c));
});
