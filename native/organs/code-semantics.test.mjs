// ═══ LOVELACE · LAVAR ═══ the semantic reading, pinned: it reads what a function DEPENDS on by intervention, holds that against what the contract says,
// and is silent on correct code. The controls are the point: a reading that cries wolf on a correct function is worse than none.
import test from "node:test";
import assert from "node:assert/strict";
import { observedDependencies, readSemantics, factsFrom, clausesFor, leavesOf, PRECISE_KINDS, ALL_KINDS, SEMANTICS_SCHEMA } from "./code-semantics.js";
import { GFP_CLAIM_SCHEMA } from "../kernel/gfp-claim.js";

const contract = {
  name: "now", params: ["current", "units"],
  returns: "an object { temp, condition, label }\n  Units: when units is \"metric\", temperatures are degrees Celsius; when \"imperial\", degrees Fahrenheit",
  notes: "temp comes from the _C or _F field by units; condition = the description; label is the place name.",
};
const ARGV = [{ temp_C: 18, temp_F: 65, desc: "Sunny", place: "London" }, "metric"];
const ALTS = { 1: ["metric", "imperial"] };
const call = (fn) => (argv) => fn(...argv);
const read = (fn, kinds) => readSemantics({ call: call(fn), argv: ARGV, params: contract.params, contract, alternatives: ALTS, anchor: "now", kinds });

const correct = (c, units) => ({ temp: units === "imperial" ? c.temp_F : c.temp_C, condition: c.desc, label: c.place });

test("observed by intervention: which output moves when which input moves — including the branch a selector takes only in its OTHER value", () => {
  const obs = observedDependencies({ call: call(correct), argv: ARGV, params: contract.params, alternatives: ALTS });
  const names = (k) => obs.deps[k].map((d) => d.name).sort();
  assert.deepEqual(obs.keys, ["temp", "condition", "label"]);
  assert.deepEqual(names("temp"), ["current.temp_C", "current.temp_F", "units"], "temp_F is found even though the example is metric");
  assert.deepEqual(names("condition"), ["current.desc"]); assert.deepEqual(names("label"), ["current.place"]);
});

test("CONTROL: a correct function raises NO finding", () => {
  const r = read(correct);
  assert.equal(r.read, true); assert.deepEqual(r.findings, []);
  assert.equal(r.schema, SEMANTICS_SCHEMA);
});

test("parameter_insensitive: the description names `units` and the output does not follow it — the `units` slip, found with no oracle", () => {
  const r = read((c, units) => ({ temp: c.temp_C, condition: c.desc, label: c.place }));
  assert.deepEqual(r.findings.map((f) => [f.kind, f.key, f.param]), [["parameter_insensitive", "temp", "units"]]);
  assert.deepEqual(r.findings[0].evidence.values, ["metric", "imperial"]);
});

test("a parameter the description does NOT name is not one the output is expected to follow (condition ignores units, correctly)", () => {
  assert.ok(!read(correct).findings.some((f) => f.key === "condition"));
});

test("output_independent: an answer that does not move under ANY input was not computed — the copied example", () => {
  const r = read((c, units) => ({ temp: units === "imperial" ? c.temp_F : c.temp_C, condition: c.desc, label: "London" }));
  assert.deepEqual(r.findings.map((f) => [f.kind, f.key]), [["output_independent", "label"]]);
});

test("an EMPTY answer at the example legitimately depends on nothing there: no finding for null, empty string, zero, false, []", () => {
  for (const empty of [null, "", 0, false, []]) assert.deepEqual(read((c, units) => ({ temp: units === "imperial" ? c.temp_F : c.temp_C, condition: c.desc, label: empty })).findings, [], JSON.stringify(empty));
});

test("a text input is probed with changes a tokenizer notices: `longest` moves for a LONG appended word, and a word count moves for any word", () => {
  const c2 = { name: "ws", params: ["text"], returns: "an object { words, longest }", notes: "" };
  const ws = (text) => { const w = String(text).match(/[A-Za-z0-9']+/g) ?? []; return { words: w.length, longest: w.reduce((a, b) => (b.length > a.length ? b : a), "") }; };
  const r = readSemantics({ call: (argv) => ws(...argv), argv: ["the quick brown fox"], params: c2.params, contract: c2, alternatives: {}, anchor: "ws" });
  assert.deepEqual(r.findings, [], "the correct function depends on its text, in both outputs");
});

test("the observed reads are landed as EOGfpClaims at the holon /anchor/output, so the holograph can project them at a cursor", () => {
  const r = read(correct);
  assert.ok(r.claims.length >= 4 && r.claims.every((c) => c.schema === GFP_CLAIM_SCHEMA && c.rel === "reads"));
  assert.ok(r.claims.some((c) => c.ground === "/now/temp" && c.roles.ARG0 === "temp" && c.roles.ARG1 === "units"));
});

test("the noisy kinds are OPT-IN: on prose they cried wolf on correct code, so the default is only the two behavioural kinds", () => {
  assert.deepEqual([...PRECISE_KINDS], ["parameter_insensitive", "output_independent"]);
  assert.ok(ALL_KINDS.includes("unlicensed_referent") && ALL_KINDS.includes("missing_referent"));
  const bed = { name: "b", params: ["ward"], returns: "an object { free }\n  free = beds not occupied", notes: "" };
  const W = [{ total_beds: 24, occupied_beds: 21, patients_waiting: 3 }];
  const sloppy = (w) => ({ free: w.total_beds - w.occupied_beds - w.patients_waiting });
  const args = { call: (a) => sloppy(...a), argv: W, params: bed.params, contract: bed, alternatives: {}, anchor: "b" };
  assert.deepEqual(readSemantics(args).findings, [], "off by default");
  assert.deepEqual(readSemantics({ ...args, kinds: ALL_KINDS }).findings.map((f) => [f.kind, f.key, f.refers]), [["unlicensed_referent", "free", "patients_waiting"]]);
});

test("the facts for the NEXT prompt are plain: about the thing and what the function did, no machinery, no prohibition", () => {
  const r = read((c, units) => ({ temp: c.temp_C, condition: c.desc, label: c.place }));
  const facts = factsFrom(r.findings);
  assert.equal(facts.length, 1); assert.match(facts[0], /`temp` has to follow `units`/); assert.match(facts[0], /temp comes from the _C or _F field by units/);
  for (const f of facts) assert.doesNotMatch(f, /referent|canonical|ledger|finding|reading|oracle|lint/i);
  assert.match(factsFrom([{ kind: "ambiguous_call", name: "mph", candidates: ["msToMph", "kmhToMph"] }])[0], /`mph` could mean any of `msToMph`, `kmhToMph` — say which one you mean/);
  assert.match(factsFrom([{ kind: "unresolved_call", name: "deg2rad" }])[0], /There is no function called `deg2rad` here/);
});

test("clausesFor isolates the definition of ONE output from a list of them", () => {
  const c = { returns: "an object { name, free, status }\n  name = the ward's name, free = beds not occupied, status = full when no bed is free", notes: "" };
  assert.ok(clausesFor(c, "free").some((s) => /beds not occupied/.test(s)));
  assert.ok(!clausesFor(c, "name").some((s) => /beds not occupied/.test(s)), "name's clause does not carry free's definition");
  assert.deepEqual(leavesOf([{ a: 1, b: { c: "x" } }, "u"]).map((l) => l.path.join(".")), ["0.a", "0.b.c", "1"]);
});

test("a function that throws everywhere is not read, and says so (read: false), never a finding", () => {
  const r = readSemantics({ call: () => { throw new Error("no"); }, argv: ARGV, params: contract.params, contract, alternatives: ALTS });
  assert.equal(r.read, false); assert.deepEqual(r.findings, []);
});
