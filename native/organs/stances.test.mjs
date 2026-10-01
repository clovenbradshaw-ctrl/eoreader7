// The three stance cores, each with its control built to fail (II.23). Run: node --test native/organs/stances.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { traceSample, traceClaim, indexGround, licensed, redeal, leavesOf } from "./tracing.js";
import { cultivate, licensedCheck } from "./cultivating.js";
import { unravel, bridgesOf, partsOfRequest } from "./unraveling.js";

const REAL = JSON.stringify({ latitude: 51.5, longitude: -0.12, hourly: { time: ["2026-10-01T00:00", "2026-10-01T01:00"], pm2_5: [8.1, 7.4], pm10: [12.2, 11.9] }, units: { pm2_5: "μg/m³" } });
const SHOWN = { latitude: 51.5, hourly: { pm2_5: [8.1, 7.4], pm10: [12.2, 11.9] } };

test("Tracing: a real sample is grounded; its leaves trace to exact addresses", () => {
  const r = traceSample(SHOWN, [{ id: "a.json", bytes: REAL }]);
  assert.equal(r.verdict, "grounded"); assert.equal(r.traced, r.leaves);
});
test("Tracing control: the invented sample the pipeline once showed is refused", () => {
  const r = traceSample({ hourly: { pm2_5: [10, 11], pm10: [20, 21] } }, [{ id: "a.json", bytes: REAL }]);
  assert.equal(r.verdict, "invented"); assert.ok(r.failures.length);
});
test("Tracing control: the REDEAL (every value present, pairing destroyed) is refused, not grounded", () => {
  const dealt = redeal(SHOWN, 3), r = traceSample(dealt, [{ id: "a.json", bytes: REAL }]);
  assert.notEqual(r.verdict, "grounded");
  assert.deepEqual(leavesOf(dealt).map((l) => l.value).sort(), leavesOf(SHOWN).map((l) => l.value).sort(), "the redeal keeps the same values");
});
test("Tracing: a moved array position is named same-kind, a value under another key is value-only — neither counts as traced", () => {
  const idx = indexGround([{ id: "a", bytes: REAL }]);
  assert.equal(traceClaim({ path: "hourly.pm2_5[1]", value: 8.1 }, idx).status, "same-kind");
  assert.equal(traceClaim({ path: "hourly.pm10[0]", value: 8.1 }, idx).status, "value-only");
  assert.equal(traceClaim({ path: "hourly.pm10[0]", value: 99 }, idx).status, "refused");
});
test("Tracing: licensed only when it grounds the real sample and refuses its redeal and an invented leaf", () => {
  assert.equal(licensed(SHOWN, [{ id: "a", bytes: REAL }]).licensed, true);
  assert.equal(licensed(SHOWN, [{ id: "a", bytes: "not json at all" }]).licensed, false, "against bytes that hold nothing it is not licensed (the real sample is not grounded)");
});

test("Cultivating: settles when `need` candidates pass, keeping the losers as typed data", async () => {
  const good = (id) => ({ id, get: async () => REAL.replace("-0.12", "51." + id.length + id.charCodeAt(1)) }), junk = (id) => ({ id, get: async () => "<html>nope</html>" }), boom = { id: "boom", get: async () => { throw new Error("503"); } };
  const check = async (bytes) => { const r = traceSample(SHOWN, [{ id: "x", bytes }]); return { ok: r.verdict === "grounded", why: r.verdict }; };
  const r = await cultivate({ candidates: [junk("j1"), boom, good("g1"), good("g2"), good("g3")], check, need: 2, budget: 8 });
  assert.equal(r.status, "settled"); assert.deepEqual(r.kept.map((k) => k.id), ["g1", "g2"]);
  assert.deepEqual(r.losers.map((l) => l.id), ["j1", "boom"]); assert.match(r.losers[1].why, /get failed/);
});
test("Cultivating control: all junk is unsettled — what passed is never called enough, and the budget is not exceeded", async () => {
  const junk = (id) => ({ id, get: async () => "<html>nope</html>" });
  const check = async (bytes) => ({ ok: traceSample(SHOWN, [{ id: "x", bytes }]).verdict === "grounded" });
  const r = await cultivate({ candidates: [1, 2, 3, 4, 5].map((i) => junk("j" + i)), check, need: 1, budget: 3 });
  assert.equal(r.status, "unsettled"); assert.equal(r.kept.length, 0); assert.equal(r.spent, 3);
  assert.equal(r.losers.filter((l) => l.why.startsWith("not tried")).length, 2);
});
test("Cultivating: identical bytes from a second address are one ground, not two", async () => {
  const twin = (id) => ({ id, get: async () => REAL });
  const r = await cultivate({ candidates: [twin("a"), twin("b")], check: async () => ({ ok: true }), need: 2, budget: 4 });
  assert.equal(r.status, "unsettled"); assert.equal(r.kept.length, 1); assert.match(r.losers[0].why, /same bytes/);
});
test("Cultivating refuses to run with no check, and a budget below 1", async () => {
  await assert.rejects(cultivate({ candidates: [] }), /needs a check/);
  await assert.rejects(cultivate({ candidates: [], check: async () => ({ ok: true }), budget: 0 }), RangeError);
});
test("Cultivating control: a check that admits a redeal of the good bytes is unlicensed", async () => {
  assert.equal((await licensedCheck(async (b) => ({ ok: traceSample(SHOWN, [{ id: "x", bytes: b }]).verdict === "grounded" }), REAL)).licensed, true);
  assert.equal((await licensedCheck(async () => ({ ok: true }), REAL)).licensed, false, "accept-everything is not a check");
});

test("Unraveling: a chain splits at every seam; a cycle does not split (control: no_seam)", () => {
  assert.equal(unravel(["a", "b", "c"], [["a", "b"], ["b", "c"]]).parts.length, 3);
  const cyc = unravel(["a", "b", "c"], [["a", "b"], ["b", "c"], ["c", "a"]]);
  assert.equal(cyc.status, "no_seam"); assert.equal(cyc.seams.length, 0);
});
test("Unraveling: two parallel edges between a pair are a cycle, not a seam (the parent-skip trap)", () => {
  assert.deepEqual(bridgesOf(["a", "b"], [["a", "b"], ["a", "b"]]), []);
  assert.equal(unravel(["a", "b"], [["a", "b"], ["a", "b"]]).status, "no_seam");
  assert.equal(unravel(["a", "b"], [["a", "b"]]).status, "split");
});
test("Unraveling: a two-lobed whole splits at its bridge into the two lobes", () => {
  const e = [["a", "b"], ["b", "c"], ["c", "a"], ["c", "d"], ["d", "e"], ["e", "f"], ["f", "d"]], r = unravel(["a", "b", "c", "d", "e", "f"], e);
  assert.equal(r.status, "split"); assert.deepEqual(r.parts.map((p) => p.sort().join("")).sort(), ["abc", "def"]); assert.deepEqual(r.seams, [["c", "d"]]);
});
test("Unraveling adapter: weather and fuel are independent parts; one shared word is a named seam; a cycle is one part", () => {
  const stop = new Set(["the", "and"]);
  assert.equal(partsOfRequest(["weather", "gas prices"], stop).parts.length, 2);
  const joined = partsOfRequest(["weather", "the weather map"], stop);
  assert.equal(joined.seams.length, 1, "joined by one shared word: that join is a seam the cut can name, not a part-less merge");
  assert.equal(partsOfRequest(["weather", "gas prices"], stop).seams.length, 0, "no join at all: separate parts with no seam to cut");
  assert.equal(partsOfRequest(["alpha beta", "beta gamma", "gamma alpha"], stop).status, "no_seam", "a cycle of shared words is one part");
});
