// ═══ LOVELACE · TEACH IT TO FISH ═══ the species built on the app's own leaves (branch, optional, coalesce, joinPresent, null) are tested where they were NOT looked at (set D), against a control built to fail, and at their stated limits.
import test from "node:test";
import assert from "node:assert/strict";
import { FRESH_D, luggageTagContract, ticketCodeContract } from "./diverse-fresh-d.mjs";
import { cheapFill } from "./fielded-swarm.mjs";
import { optional, coalesce, joinPresent, nullConstant, branch, optionalStrings } from "./species.mjs";
import { runResults } from "./fold-experiment.mjs";
import { composeFieldCode } from "./app-units.mjs";

const species = (c) => Object.fromEntries(Object.entries(cheapFill(c)).map(([k, v]) => [k, v.species]));
const NEW = new Set(["branch", "optional", "coalesce", "joinPresent", "null"]);

test("set D (written after the species, not edited after its first run): the shapes they were not looked at on fill, and every whole unit passes its oracle", () => {
  assert.deepEqual(species(luggageTagContract), { id: "copy", who: "coalesce", weight: "branch", lane: "joinPresent", note: "null" });
  let units = 0;
  for (const { contract: c, role } of FRESH_D) {
    const cheap = cheapFill(c), keys = Object.keys(c.runs[0].want());
    if (!keys.every((k) => cheap[k])) { assert.equal(role, "outside", `${c.name}: only the task written to sit outside may be left unfilled`); continue; }
    const codes = Object.fromEntries(keys.map((k) => [k, `function ${k}Of(${c.params.join(", ")}) { return ${cheap[k].js}; }`]));
    assert.ok(runResults(composeFieldCode(c, keys, codes), c, "exact").every(Boolean), `${c.name}: the composed unit passes its oracle`); units++;
  }
  assert.equal(units, 3);
});

test("LIMIT, pinned: a code built from slices and a padded number is outside every species — the model's slot, said so, not a silent miss", () => {
  const s = species(ticketCodeContract);
  assert.equal(s.code, undefined, "no species fills a substring-and-pad");
  assert.equal(s.desk, "copy");
});

test("a default is kept ONLY when a run falls through to it: nickname-or-first has no invented third arm", () => {
  const f = cheapFill(luggageTagContract).who.js;
  assert.equal(f, 'bag.owner?.nickname || bag.owner?.first');
  assert.doesNotMatch(f, /"metric"/, "a quoted word from the person's words that never fires is not a rule");
});

test("CONTROL built to fail: with every slot's targets REDEALT (rotated one run along), none of the new species fills anything", () => {
  for (const { contract: c } of FRESH_D) {
    const keys = Object.keys(c.runs[0].want()), n = c.runs.length;
    const rotated = { ...c, runs: c.runs.map((r, i) => ({ ...r, want: () => Object.fromEntries(keys.map((k) => [k, c.runs[(i + 1) % n].want()[k]])) })) };
    const varies = keys.filter((k) => new Set(c.runs.map((r) => JSON.stringify(r.want()[k]))).size > 1);
    const s = species(rotated);
    for (const k of varies) assert.ok(!NEW.has(s[k]), `${c.name}.${k}: a redealt target must not be filled by ${s[k]}`);
  }
});

test("a null constant needs the person's words to say null: all-null answers with no such word are not filled", () => {
  const wants = [null, null, null];
  assert.equal(nullConstant({ doc: "d", returns: "an object", notes: "", runs: [] }, wants), null);
  assert.deepEqual(nullConstant({ doc: "d", returns: "note = null (never carries one)", notes: "", runs: [] }, wants).js, "null");
});

test("branch refuses a parameter that merely correlates: one value per side with a single run each is not enough to be a rule", () => {
  const c = { ...luggageTagContract, runs: luggageTagContract.runs.slice(0, 2) };
  assert.equal(branch(c, "weight"), null, "two runs cannot show both sides twice");
});

test("a key that is not a legal dotted name is reached by brackets (OpenStreetMap's `addr:street`)", () => {
  const data = [[{ tags: { "addr:housenumber": "12", "addr:street": "Oak" } }], [{ tags: { "addr:street": "Pine" } }], [{ tags: { "addr:housenumber": "7", "addr:street": "Elm" } }], [{ tags: {} }], [{ tags: { "addr:housenumber": "3", "addr:street": "Fir" } }]];
  const want = ([e]) => [e.tags["addr:housenumber"], e.tags["addr:street"]].filter(Boolean).join(" ") || null;
  const c = { name: "addr", params: ["e"], doc: "d", returns: "the housenumber and the street joined by a space, or null if neither exists", notes: "", runs: data.map((d) => ({ args: () => JSON.parse(JSON.stringify(d)), want: () => want(d) })) };
  const r = joinPresent(c, c.runs.slice(0, 3).map((x) => x.want()), (f) => c.runs.slice(3).every((x) => JSON.stringify(f(x.args())) === JSON.stringify(x.want())));
  assert.ok(r, "joined, with the missing parts left out and null when none exist");
  assert.match(r.js, /\["addr:street"\]/);
  assert.ok(optionalStrings(c).some((l) => /\["addr:housenumber"\]/.test(l.js)));
  void optional; void coalesce;
});
