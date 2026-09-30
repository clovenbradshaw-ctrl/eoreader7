// ═══ LOVELACE · TEACH IT TO FISH ═══ the falsification set is itself tested: each oracle accepts a correct reference (with the cards
// it is allowed to call), rejects a constant, and rejects the characteristic slip of its task. An oracle that cannot fail proves nothing.
import test from "node:test";
import assert from "node:assert/strict";
import { DIVERSE, DIVERSE_REFERENCE } from "./diverse-tasks.mjs";
import { testUnit, unitPrompt } from "./app-units.mjs";
import { loadUnit } from "./unit-wall.mjs";

const by = Object.fromEntries(DIVERSE.map((d) => [d.contract.name, d]));

test("every task: the reference passes its whole oracle, and a constant (the shown example) fails the rows not shown", () => {
  for (const d of DIVERSE) {
    const c = d.contract;
    const ok = testUnit(DIVERSE_REFERENCE[c.name], c);
    assert.deepEqual(ok.failures, [], c.name);
    const ref = loadUnit(DIVERSE_REFERENCE[c.name], c.name);
    const frozen = JSON.stringify(ref(...c.runs[0].args()));
    const konst = testUnit(`function ${c.name}() { return ${frozen}; }`, c);
    assert.equal(konst.ok, false, `${c.name}: reproducing the shown example must not pass`);
  }
});

test("the roles say which tasks are controls for the cards; a control's reference needs no card except roundTo", () => {
  assert.deepEqual(DIVERSE.filter((d) => d.role === "control").map((d) => d.contract.name).sort(), ["dueSoon", "orderTotal", "topAuthors", "wordStats"]);
  for (const n of ["topAuthors", "dueSoon"]) assert.ok(!/padTime|haversineKm|roundTo|toNumber|joinPresent|compass16|ToFahrenheit/.test(DIVERSE_REFERENCE[n]), `${n} is a true negative control: no card applies`);
});

test("each oracle rejects its task's characteristic slip", () => {
  const bad = {
    busTimes: `function busTimes(stop) { return { stop: stop.stop_name, route: stop.route, times: stop.times.map((t) => String(t) + ":00") }; }`,
    flightLeg: `function flightLeg(from, to) { const km = haversineKm(from.latitude, from.longitude, to.latitude, to.longitude); return { route: from.iata + " → " + to.iata, km: roundTo(km, 1), miles: roundTo(km * 1.609344, 1) }; }`, // miles the wrong way round
    bedReport: `function bedReport(ward) { const free = ward.total_beds - ward.occupied_beds, pct = Math.round((ward.occupied_beds / ward.total_beds) * 100); return { name: ward.ward_name, free, percentFull: pct, status: pct > 85 ? "busy" : "ok" }; }`, // 85 must be busy; a full ward is "full"
    orderTotal: `function orderTotal(order) { const sub = order.items.reduce((s, it) => s + parseFloat(it.price) * Number(it.qty), 0); return { subtotal: roundTo(sub, 2), tax: roundTo(sub * order.tax_rate, 2), total: roundTo(sub * (1 + order.tax_rate), 2) }; }`, // parseFloat("$1,234.50") is NaN
    topAuthors: `function topAuthors(commits) { const n = {}; for (const c of commits) n[c.author.name] = (n[c.author.name] || 0) + 1; return Object.entries(n).map(([name, commits]) => ({ name, commits })).sort((a, b) => b.commits - a.commits).slice(0, 3); }`, // ties not broken by name
    dueSoon: `function dueSoon(tasks, today) { return tasks.filter((t) => !t.done && t.due >= today && t.due <= today.slice(0, 8) + String(+today.slice(8) + 7).padStart(2, "0")).map((t) => t.title); }`, // day arithmetic on the string: breaks at month ends
    wordStats: `function wordStats(text) { const w = text.split(/\\s+/).filter(Boolean); return { words: w.length, unique: new Set(w).size, longest: w.reduce((a, b) => (b.length > a.length ? b : a), ""), avgLen: w.length ? roundTo(w.reduce((s, x) => s + x.length, 0) / w.length, 1) : 0 }; }`, // punctuation and case
  };
  for (const [n, code] of Object.entries(bad)) assert.equal(testUnit(code, by[n].contract).ok, false, `${n}: the slip must fail`);
});

test("a key slip on the keyed tasks resolves through the layer where the evidence is a spelling (wardName, totalBeds), and the oracle still passes", () => {
  const slip = `function bedReport(ward) { const free = ward.totalBeds - ward.occupiedBeds; const pct = Math.round((ward.occupiedBeds / ward.totalBeds) * 100); return { name: ward.name, free, percentFull: pct, status: free === 0 ? "full" : pct >= 85 ? "busy" : "ok" }; }`;
  const r = testUnit(slip, by.bedReport.contract);
  assert.equal(r.ok, true, r.failures.join("\n"));
  const got = Object.fromEntries(r.resolutions.map((x) => [x.asked, x.real]));
  assert.equal(got.name, "ward_name", "declared by the contract's worked example (the value Cardiology sits at ward_name)");
  assert.equal(got.totalBeds, "total_beds"); assert.equal(got.occupiedBeds, "occupied_beds");
  const leg = `function flightLeg(from, to) { const km = haversineKm(from.lat, from.lon, to.lat, to.lon); return { route: from.iata + " → " + to.iata, km: roundTo(km, 1), miles: roundTo(km / 1.609344, 1) }; }`;
  assert.equal(testUnit(leg, by.flightLeg.contract).ok, true, "lat/lon are truncations of latitude/longitude");
});

test("LIMIT, pinned: a whole first word of a compound key (`total` for `total_beds`) is OFFERED, not resolved — `place` must never bind `place_id`", () => {
  const slip = `function bedReport(ward) { const free = ward.total - ward.occupied; return { name: ward.ward_name, free, percentFull: 0, status: "ok" }; }`;
  const r = testUnit(slip, by.bedReport.contract);
  assert.equal(r.ok, false, "the read stays undefined: a real absence is still a real failure");
  const t = r.resolutions.find((x) => x.asked === "total");
  assert.ok(!t || (!t.real && (t.ambiguous || t.unresolved !== false)), JSON.stringify(t));
  // what the layer does know: the candidate to POINT at. Resolving from it would swallow real absences.
  return import("../organs/key-referents.js").then(({ resolveKey }) => {
    const x = resolveKey("total", ["ward_name", "total_beds", "occupied_beds", "patients_waiting"]);
    assert.equal(x.resolved, false); assert.deepEqual(x.near, ["total_beds"]);
  });
});

test("a task's prompt carries the cards unless the contract says otherwise; the controls' prompts show them too (that is what is being falsified)", () => {
  for (const d of DIVERSE) { assert.match(unitPrompt(d.contract), /These functions already exist/, d.contract.name); assert.doesNotMatch(unitPrompt({ ...d.contract, cards: false }), /already exist/); }
});
