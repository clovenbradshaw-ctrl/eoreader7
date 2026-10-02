// entity-profile.test.js — a meaningful profile on ANY entity, its key
// parameters decided by kind induction, on synthetic, medium-blind referents.
import test from "node:test";
import assert from "node:assert/strict";
import { assertionsFromTriples, buildEntityProfiles, profileOf, profileLines, ENTITY_PROFILE_SCHEMA, ENTITY_PROFILES_SCHEMA } from "../kernel/entity-profile.js";

// Two populations with disjoint relation sets: people (born/died/parent/spouse)
// and cities (area/mayor/country). Only "born" is asserted twice, agreeing.
function world() {
  const by = new Map();
  for (let i = 0; i < 12; i += 1) by.set(`P${i}`, [
    { rel: "born", value: `year${i}`, id: `P${i}#0`, witnessed: true },
    { rel: "born", value: `year${i}`, id: `P${i}#1`, witnessed: true },
    { rel: "died", value: `d${i}`, id: `P${i}#2`, witnessed: true },
    { rel: "parent", value: `par${i}`, id: `P${i}#3`, witnessed: true },
    { rel: "spouse", value: `sp${i}`, id: `P${i}#4`, witnessed: true },
  ]);
  for (let i = 0; i < 12; i += 1) by.set(`C${i}`, [
    { rel: "area", value: `a${i}`, id: `C${i}#0`, witnessed: true },
    { rel: "mayor", value: `m${i}`, id: `C${i}#1`, witnessed: true },
    { rel: "country", value: `co${i}`, id: `C${i}#2`, witnessed: true },
  ]);
  return by;
}

const CS = { draws: 99, alpha: 0.05, seed: 5 };
const run = (by, opts = {}) => buildEntityProfiles(by, { exposureFloor: 2, kindMethod: "characteristic-sets", kindOptions: CS, sameValue: (a, b) => a === b, ...opts });

test("assertionsFromTriples: both directions, only in-population ends", () => {
  const by = assertionsFromTriples([{ subject: "A", verb: "met", object: "B" }], { referents: ["A", "B"] });
  assert.deepEqual(by.get("A").map((a) => [a.rel, a.value]), [["met", "B"]]);
  assert.deepEqual(by.get("B").map((a) => [a.rel, a.value]), [["met", "A"]]);
  const only = assertionsFromTriples([{ subject: "A", verb: "met", object: "B" }], { referents: ["A"] });
  assert.ok(only.has("A") && !only.has("B"), "an end outside the population names no assertion");
  assert.equal(only.get("A")[0].value, "B", "the literal object is still carried as the value");
  const typed = assertionsFromTriples([{ end1: "A", label: "born", end2: "1715", seq: 3 }], { referents: ["A"] });
  assert.equal(typed.get("A")[0].seq, 3, "notes.fold shape and seq are read");
});

test("a kind is induced from the relation profile; the two populations separate", () => {
  const res = run(world());
  assert.equal(res.schema, ENTITY_PROFILES_SCHEMA);
  const p = res.byId.get("P0"), c = res.byId.get("C0");
  assert.ok(p.established && c.established, JSON.stringify(res.diagnostics));
  assert.notDeepEqual(p.kinds.map((k) => k.kindKey), c.kinds.map((k) => k.kindKey));
});

test("key parameters: kind-characteristic and functional standing order the profile", () => {
  const res = run(world());
  const p = res.byId.get("P0");
  assert.equal(p.schema, ENTITY_PROFILE_SCHEMA);
  const born = p.parameters.find((x) => x.rel === "born");
  const died = p.parameters.find((x) => x.rel === "died");
  assert.equal(born.standing, "fixed", "asserted twice, agreeing");
  assert.equal(died.standing, "unexposed", "asserted once — never tested");
  assert.ok(born.kindCharacteristic, "born is in the kind's signature");
  assert.equal(p.parameters[0].rel, "born", "characteristic + fixed ranks first");
  assert.ok(born.values[0].count === 2 && born.values.length === 1);
});

test("an entity whose population induces no kind still gets a profile, honestly marked", () => {
  const by = new Map([
    ["x", [{ rel: "p", value: "1", id: "x#0", witnessed: true }]],
    ["y", [{ rel: "q", value: "2", id: "y#0", witnessed: true }]],
    ["z", [{ rel: "r", value: "3", id: "z#0", witnessed: true }]],
  ]);
  const res = run(by);
  const x = res.byId.get("x");
  assert.equal(x.established, false);
  assert.equal(x.parameters.length, 1, "the raw relation profile is still shown");
  assert.equal(x.parameters[0].standing, "unknown", "no functional standing is claimed without a kind");
  assert.match(x.basis.note, /not established/);
});

test("profileOf is a pure read of a built population; profileLines renders it", () => {
  const by = world();
  const res = run(by);
  const again = profileOf("P0", { produced: res.produced, assertionsById: by, ids: [...by.keys()] });
  assert.deepEqual(again, res.byId.get("P0"));
  const lines = profileLines(res.byId.get("P0"));
  assert.ok(lines.some((l) => l.includes("born")) && lines[0].includes("P0"));
});

test("numbers are declared, and profile input is checked", () => {
  assert.throws(() => buildEntityProfiles(new Map(), { exposureFloor: 0 }), /exposureFloor/);
  assert.throws(() => buildEntityProfiles([], {}), /Map/);
});
