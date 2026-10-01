// ═══ LOVELACE · TEACH IT TO FISH ═══ what the system fills with no model at all is itself tested: found expressions must hold on the runs they were not shown, and the limits are pinned.
import test from "node:test";
import assert from "node:assert/strict";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { solveContract, solveField, wordConstants, UNIT_FACTORS } from "./synth-fields.mjs";

const by = Object.fromEntries([...DIVERSE, ...HELDOUT].map((d) => [d.contract.name, d.contract]));
const field = (name, key) => solveContract(by[name]).fields.find((f) => f.key === key);

test("arithmetic over the input's own keys: free beds is a difference, a percentage is a share times the hundred the word `percentage` names, and each holds on the runs it was not shown", () => {
  assert.equal(field("bedReport", "free").expr, "(ward.total_beds - ward.occupied_beds)");
  assert.match(field("bedReport", "percentFull").expr, /roundTo\(\(\(ward\.occupied_beds \/ ward\.total_beds\) \* 100\), 0\)/);
  for (const k of ["free", "percentFull"]) assert.equal(field("bedReport", k).heldOut, "2/2");
});

test("sums and products over a list, a money string read as money, and a field built on a field already solved (total on subtotal and tax)", () => {
  assert.equal(field("orderTotal", "subtotal").expr, "sumProd(order.items, price, qty)");
  assert.match(field("orderTotal", "tax").expr, /roundTo\(.*tax_rate.*, 2\)/);
  assert.match(field("orderTotal", "total").expr, /\+ tax\)/);
  assert.equal(field("cartTotal", "items").expr, "sum(cart.lines, count)");
});

test("the card operations enter the search only when the person's words name them, and compose: kilometres from four coordinates, miles from that distance", () => {
  assert.equal(field("flightLeg", "km").expr, "roundTo(haversineKm(from.latitude, from.longitude, to.latitude, to.longitude), 1)");
  assert.match(field("flightLeg", "miles").expr, /^roundTo\(kmToMiles\(haversineKm\(/);
  assert.equal(solveContract(by.bedReport).fields.some((f) => /haversine/.test(f.expr ?? "")), false, "a ward has no coordinates and the words name no distance");
});

test("a number the person's words state is a constant (`divided by 200`); a unit word stands for its factor (`percentage` is 100) — both are read, never typed per task", () => {
  assert.ok(wordConstants(by.readingTime).includes(200)); assert.equal(UNIT_FACTORS.percentage, 100);
  assert.equal(field("readingTime", "minutes").expr, "ceil((words / 200))");
});

test("LIMIT, pinned: a guard is not an arithmetic expression — `0 when there are no words` makes the mean undefined on the empty example, so avgLen is left to the model, and text and list results are not searched at all", () => {
  assert.equal(field("wordStats", "avgLen").kind, "unsolved");
  assert.equal(field("bedReport", "status").kind, "non-numeric");
  assert.equal(solveContract(by.topAuthors).shape, "not-flat-object");
});

test("the control built to fail: with each solved field's targets REDEALT across the examples, nothing may be called solved — a strange expression that happens to hit three numbers is a coincidence and the held-out runs say so", () => {
  let tried = 0, solved = 0, coincidences = 0;
  for (const d of [...DIVERSE, ...HELDOUT]) for (const f of solveContract(d.contract).fields.filter((x) => x.kind === "solved")) {
    const w = d.contract.runs.slice(0, 3).map((r) => r.want()[f.key]); if (new Set(w).size < 2) continue;
    for (const rot of [1, 2]) { const vals = w.map((_, i) => w[(i + rot) % 3]); tried++; const r = solveField(d.contract, f.key, vals); if (r.kind === "solved") solved++; if (r.kind === "coincidence") coincidences++; }
  }
  assert.ok(tried >= 20, `${tried} redealt fields tried`); assert.equal(solved, 0, "a redealt target reproduced on the held-out runs");
  assert.ok(coincidences >= 0);
});

test("a found expression is a claim about every run: coincidences are named, never counted as solved", () => {
  const r = solveField(by.bedReport, "free", [1, 2, 3]);
  assert.notEqual(r.kind, "solved"); if (r.kind === "coincidence") assert.match(r.heldOut, /^\d+\/\d+$/);
  for (const d of [...DIVERSE, ...HELDOUT]) for (const f of solveContract(d.contract).fields.filter((x) => x.kind === "solved")) { const [a, b] = f.heldOut.split("/").map(Number); assert.equal(a, b, `${d.contract.name}.${f.key} = ${f.expr}`); }
});
