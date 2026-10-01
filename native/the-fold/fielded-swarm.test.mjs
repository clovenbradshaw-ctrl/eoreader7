// ═══ LOVELACE · TEACH IT TO FISH ═══ the cheap species of the swarm are pinned: what they fill, in which order, and that a unit they fill completely passes the whole oracle with no model at all.
import test from "node:test";
import assert from "node:assert/strict";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { cheapFill } from "./fielded-swarm.mjs";
import { composeFieldCode } from "./app-units.mjs";
import { runResults } from "./fold-experiment.mjs";

const by = Object.fromEntries([...DIVERSE, ...HELDOUT].map((d) => [d.contract.name, d.contract]));
const species = (n) => Object.fromEntries(Object.entries(cheapFill(by[n])).map(([k, v]) => [k, v.species]));

test("a copy is tried before a composition, a composition before the non-numeric species: a value at one input path is a copy, one computed from several is composed, a conditional is decided, a list mapped through a helper is mapped", () => {
  assert.deepEqual(species("bedReport"), { name: "copy", free: "compose", percentFull: "compose", status: "decide" });
  assert.deepEqual(species("busTimes"), { stop: "copy", route: "copy", times: "map" });
  assert.equal(species("wordStats").avgLen, "compose", "a mean that is 0 for no words is a guard, read off the example");
});

test("a unit every slot of which a cheap species fills is whole with no model call: orderTotal composes and passes the parent's whole oracle, held-out runs included", () => {
  const c = by.orderTotal, cheap = cheapFill(c), keys = Object.keys(cheap), args = c.params.join(", ");
  assert.deepEqual(keys.sort(), ["subtotal", "tax", "total"]);
  const codes = Object.fromEntries(keys.map((k) => [k, `function ${k}Of(${args}) { return ${cheap[k].js}; }`]));
  const unit = composeFieldCode(c, ["subtotal", "tax", "total"], codes);
  assert.deepEqual(runResults(unit, c, "exact"), c.runs.map(() => true));
});

test("a copy path names the parameter by its position: `[0].stop_name` is `stop.stop_name`", () => {
  assert.equal(cheapFill(by.busTimes).stop.js, "stop.stop_name");
});
