// slicer-coverage.mjs — the question that needs no witness.
//
// Every model call in ranke-slicers.mjs asks a witness to POINT at which of
// K candidate sentences states the proposition. That call can only succeed
// if the slicer's top-K CONTAINS such a sentence. Whether it does is a
// property of the ranking alone, and is therefore measurable with ZERO
// model calls.
//
// This pass runs first, for a reason that is P85's own: a call that cannot
// move a standing is waste regardless of price. An arm that is silent on a
// note, or that offers a top-K identical to another arm's, cannot move the
// licensing standing on that note, and the calls it would consume are
// knowable-in-advance waste. The full cross-product was queued once without
// this check; this is the check.
//
// It reports three things, none of which needs a label:
//   1. SILENCE — how often each arm hands the witness nothing at all.
//   2. DISTINCTNESS — how much each pair of arms' top-K overlap. Two arms
//      that return the same eight sentences are one arm charged twice.
//   3. CONTROL DIVERGENCE — whether an arm's top-K changes at all when end2
//      is rotated. An arm whose candidates are identical under the II.23
//      control is ranking on end1/topic alone, and its control is not a
//      control: it was always going to see the same eight sentences.
//
// Usage:  N=162 node slicer-coverage.mjs   (EMB=0 to skip the embedder)
process.env.N ??= "162";
const D = await import("./ranke-slicers.mjs");
const { candidatesFor, real, control, K, WANT, R } = D;

const arms = WANT.filter((n) => n !== "embedding" || process.env.EMB !== "0");
const key = (c) => `${c.start ?? "?"}:${c.shown.slice(0, 60)}`;

const rowsOf = async (set) => {
  const per = new Map(arms.map((a) => [a, []]));
  for (const { row, ends, face } of set) {
    for (const a of arms) {
      let cands = null;
      try { cands = await candidatesFor(a, face, ends, R.claimOfNote(ends).sentence); }
      catch (e) { cands = null; }
      per.get(a).push({ host: row.host, note: row.note, cands: cands == null ? null : cands.map(key) });
    }
  }
  return per;
};

console.log(`\nZERO-CALL COVERAGE PASS — ${real.length} notes, K=${K}, arms: ${arms.join(", ")}\n`);
const realPer = await rowsOf(real);
const ctlPer = await rowsOf(control);

// 1. SILENCE
console.log("1. SILENCE — how often the arm hands the witness nothing");
console.log(`  ${"arm".padEnd(13)} ${"silent".padEnd(9)} ${"offered".padEnd(9)} ${"median|K|".padEnd(10)} calls it would cost`);
const silence = {};
for (const a of arms) {
  const rs = realPer.get(a);
  const silent = rs.filter((r) => r.cands == null || r.cands.length === 0).length;
  const offered = rs.length - silent;
  const sizes = rs.filter((r) => r.cands?.length).map((r) => r.cands.length).sort((x, y) => x - y);
  const med = sizes.length ? sizes[sizes.length >> 1] : 0;
  // the witness spends up to 2 calls per offered note, on each of 2 sides
  const cs = ctlPer.get(a);
  const ctlOffered = cs.filter((r) => r.cands?.length).length;
  const cost = (offered + ctlOffered) * 2;
  silence[a] = { silent, offered, ctlOffered, median: med, cost };
  console.log(`  ${a.padEnd(13)} ${String(silent).padEnd(9)} ${String(offered).padEnd(9)} ${String(med).padEnd(10)} ${cost}`);
}
const total = Object.values(silence).reduce((s, v) => s + v.cost, 0);
console.log(`  ${"".padEnd(13)} ${"".padEnd(9)} ${"".padEnd(9)} ${"TOTAL".padEnd(10)} ${total}`);

// 2. DISTINCTNESS
console.log("\n2. DISTINCTNESS — mean Jaccard of top-K, real side (1.00 = the same arm twice)");
const jac = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size && !B.size) return 1; const i = [...A].filter((x) => B.has(x)).length; return i / (A.size + B.size - i); };
for (let i = 0; i < arms.length; i += 1) for (let j = i + 1; j < arms.length; j += 1) {
  const A = realPer.get(arms[i]), B = realPer.get(arms[j]);
  const vals = [];
  for (let n = 0; n < A.length; n += 1) if (A[n].cands?.length && B[n].cands?.length) vals.push(jac(A[n].cands, B[n].cands));
  const m = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : NaN;
  console.log(`  ${(arms[i] + " vs " + arms[j]).padEnd(28)} ${vals.length ? m.toFixed(2) : "—"}  (over ${vals.length} notes both offered)`);
}

// 3. CONTROL DIVERGENCE
console.log("\n3. CONTROL DIVERGENCE — does the arm's top-K move when end2 is rotated?");
console.log("   (1.00 = the control sees the identical eight sentences: not a control)");
for (const a of arms) {
  const R = realPer.get(a), C = ctlPer.get(a);
  const vals = [];
  for (let n = 0; n < R.length; n += 1) if (R[n].cands?.length && C[n].cands?.length) vals.push(jac(R[n].cands, C[n].cands));
  const m = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : NaN;
  const same = vals.filter((v) => v === 1).length;
  console.log(`  ${a.padEnd(13)} mean ${vals.length ? m.toFixed(2) : "—"}  identical on ${same}/${vals.length}`);
}

const { writeFileSync } = await import("node:fs");
writeFileSync(new URL("./results/slicer-coverage.json", import.meta.url), JSON.stringify({ notes: real.length, K, arms, silence, real: Object.fromEntries(realPer), control: Object.fromEntries(ctlPer) }, null, 2));
console.log("\n0 model calls. Raw: results/slicer-coverage.json");
