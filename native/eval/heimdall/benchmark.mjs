#!/usr/bin/env node
// er7-benchmark.mjs — the eoreader7 operational benchmark. Measures the axes
// that decide whether the box is "working well":
//
//   AXIS 1  DOORWAYS   — every surface answers (control + model doorways +
//                        swarm + sessions + browser ui).
//   AXIS 2  LATENCY    — warm per-turn latency for a small and a big ask
//                        (P50/P95). The per-turn pipeline floor is ~2.1s;
//                        a healthy warm box should be well under that + model.
//   AXIS 3  CONCURRENCY— N distinct callers in parallel: all served, no
//                        silent stalls, no timeouts, no unbounded waits.
//   AXIS 4  SLA        — no served call exceeds the 120s SLA target.
//   AXIS 5  FLEET      — every heimdall answers /heimdall, peers are up,
//                        no stale wedged standing (a recovered process reads
//                        healthy), no pending escalations.
//   AXIS 6  COORDINATION — with ER7_BENCH_FLEET_PEERS set, the fleet mesh
//                        contains every expected peer heimdall (multi-fleet
//                        coordination, not just the proxy's own addresses).
//
// Score: 0..100. 100 = every door serves, latency inside budget, all callers
// served with no stall, SLA held, fleet healthy AND coordinated. Chasing the
// benchmark = raising the score without touching quality.
//
// Usage: node er7-benchmark.mjs [--callers N] [--peers name=addr,...]
// Env:   ER7_URL (default http://127.0.0.1:11436)
//        ER7_FLEET_URL (default http://127.0.0.1:11438)
//        ER7_BENCH_PEERS — comma-separated name=address of expected peer heimdalls
const BASE = (process.env.ER7_URL || "http://127.0.0.1:11436").replace(/\/+$/, "");
const FLEET = (process.env.ER7_FLEET_URL || "http://127.0.0.1:11438").replace(/\/+$/, "");
const MODEL = process.env.ER7_BENCH_MODEL || "gemma2:2b";
const CALLERS = Number(process.argv.find((a) => a.startsWith("--callers="))?.split("=")[1] ?? process.argv[process.argv.indexOf("--callers") + 1] ?? 5);
const EXPECT_PEERS = (process.env.ER7_BENCH_PEERS || "")
  .split(",").map((s) => s.trim()).filter(Boolean)
  .map((s) => { const eq = s.indexOf("="); return eq === -1 ? { name: s } : { name: s.slice(0, eq), address: s.slice(eq + 1) }; });

const BIG_TASK = "Read this material and answer in a few sentences: what role has the Cumberland River played in Nashville's history and today?\n\nMATERIAL: The Cumberland River is the major waterway of Nashville, Tennessee. It flows 688 miles from Kentucky through Tennessee back to Kentucky. Nashville grew as a port city because the river connected the interior South to the Ohio and Mississippi systems. Today the river supports barge traffic, hydroelectric power, and recreation. Flood control is managed by the U.S. Army Corps of Engineers.";
const SMALL_TASK = "What river runs through Nashville? Answer in one short sentence.";

const score = { axes: {}, doors: 0, doorsTotal: 0, served: 0, callers: 0, latency: [], maxLatency: 0, slaBreaches: 0, fleetHealthy: true, fleetIssues: [], peersOk: true, peerIssues: [], coordinated: true, coordIssues: [] };

async function req(path, { method = "GET", body, headers = {}, timeoutMs = 180000 } = {}) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(BASE + path, {
      method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) { return { status: "timeout", ms: Date.now() - t0, error: e.name, text: "" }; }
  const text = await res.text();
  const ms = Date.now() - t0;
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, ms, retryAfter: res.headers.get("retry-after"), json, text: text.slice(0, 120) };
}

function door(path, opts) { score.doorsTotal += 1; return req(path, opts).then((r) => { if (r.status === 200 || r.status === 201) score.doors += 1; return r; }); }

async function warm() {
  await req("/v1/ask", { method: "POST", body: { task: "say ready", model: MODEL }, headers: { "x-er7-user": "bench-warm" }, timeoutMs: 120000 }).catch(() => {});
}

async function axisDoors() {
  const H = { "x-er7-user": `bench-doors-${Date.now()}` };
  await Promise.all([
    door("/health"), door("/"), door("/heimdall"), door("/v1/models"), door("/v1/sessions"), door("/content-rules"), door("/ui"),
    door("/v1/ask", { method: "POST", body: { task: SMALL_TASK, model: MODEL }, headers: H }),
    door("/v1/chat/completions", { method: "POST", body: { model: `er7:${MODEL}`, messages: [{ role: "user", content: "say ok" }] }, headers: H }),
    door("/api/chat", { method: "POST", body: { model: `er7:${MODEL}`, messages: [{ role: "user", content: "say ok" }] }, headers: H }),
    door("/v1/messages", { method: "POST", body: { model: `er7:${MODEL}`, max_tokens: 32, messages: [{ role: "user", content: "say ok" }] }, headers: H }),
    door("/v1/messages/count_tokens", { method: "POST", body: { model: `er7:${MODEL}`, messages: [{ role: "user", content: "hello" }] }, headers: H }),
    door("/v1/swarm", { method: "POST", body: { text: "The quick brown fox jumps over the lazy dog.", task: "Say what it means in one line.", model: MODEL }, headers: H }),
  ]);
  score.axes.doors = { name: "doorways", got: score.doors, total: score.doorsTotal, pct: score.doors / score.doorsTotal };
}

async function axisLatency() {
  const H = { "x-er7-user": `bench-lat-${Date.now()}` };
  const small = [], big = [];
  for (let i = 0; i < 2; i++) {
    const s = await req("/v1/ask", { method: "POST", body: { task: SMALL_TASK, model: MODEL }, headers: H });
    if (s.status === 200) small.push(s.ms);
    const b = await req("/v1/ask", { method: "POST", body: { task: BIG_TASK, model: MODEL }, headers: H });
    if (b.status === 200) big.push(b.ms);
  }
  const all = [...small, ...big];
  const p = (arr, q) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(arr.length - 1, Math.floor(arr.length * q))]; };
  score.axes.latency = { small, big, p50: p(all, 0.5), p95: p(all, 0.95), max: Math.max(0, ...all) };
  return all;
}

async function axisConcurrency(n) {
  const TASK = BIG_TASK;
  const results = await Promise.all(Array.from({ length: n }, (_, i) =>
    req("/v1/ask", { method: "POST", body: { task: TASK, model: MODEL }, headers: { "x-er7-user": `bench-conc-${i}-${Date.now()}` } })
  ));
  const served = results.filter((r) => r.status === 200);
  const timedOut = results.filter((r) => r.status === "timeout");
  const refused = results.filter((r) => r.status === 429 || r.status === 503);
  score.callers = n; score.served = served.length;
  score.maxLatency = Math.max(0, ...served.map((r) => r.ms));
  score.slaBreaches = served.filter((r) => r.ms > 120000).length;
  score.axes.concurrency = { callers: n, served: served.length, timedOut: timedOut.length, refused: refused.length, avgMs: served.length ? Math.round(served.reduce((a, r) => a + r.ms, 0) / served.length) : 0, maxMs: score.maxLatency };
  return served;
}

async function axisFleet() {
  // Every expected heimdall answers /heimdall; peers are up; no stale wedged;
  // no pending escalations.
  const fleets = [FLEET, ...EXPECT_PEERS.map((p) => p.address).filter(Boolean)];
  for (const addr of [...new Set(fleets)]) {
    try {
      const res = await fetch(`${addr}/heimdall`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) { score.fleetHealthy = false; score.fleetIssues.push(`${addr}: HTTP ${res.status}`); continue; }
      const j = await res.json();
      const self = j?.self ?? {};
      if (self.standing === "wedged" && (self.lastLagMs ?? 1) < 250) {
        score.fleetHealthy = false; score.fleetIssues.push(`${addr}: stale wedged (lastLag ${self.lastLagMs}ms but standing wedged)`);
      }
      if ((j?.pendingEscalations?.length ?? 0) > 0) { score.fleetHealthy = false; score.fleetIssues.push(`${addr}: ${j.pendingEscalations.length} pending escalation(s)`); }
      for (const peer of j?.peers ?? []) {
        if (peer.up === false) { score.peersOk = false; score.peerIssues.push(`${addr} → ${peer.name}: down`); }
      }
    } catch (e) { score.fleetHealthy = false; score.fleetIssues.push(`${addr}: unreachable (${e.name})`); }
  }
  // Coordination: the first fleet's mesh must contain every expected peer.
  try {
    const res = await fetch(`${FLEET}/heimdall`, { signal: AbortSignal.timeout(6000) });
    const j = await res.json();
    const meshNames = (j?.peers ?? []).map((p) => p.name);
    for (const p of EXPECT_PEERS) {
      if (!meshNames.includes(p.name)) { score.coordinated = false; score.coordIssues.push(`${p.name} not in mesh`); }
    }
  } catch (e) { score.coordinated = false; score.coordIssues.push(`fleet ${FLEET} unreachable: ${e.name}`); }
  score.axes.fleet = { healthy: score.fleetHealthy, issues: score.fleetIssues, peersOk: score.peersOk, peerIssues: score.peerIssues, coordinated: score.coordinated, coordIssues: score.coordIssues };
}

function compute() {
  const d = score.axes.doors?.pct ?? 0;                                        // 0..1
  const lat = score.axes.latency ?? {};
  const latP95 = lat.p95 ?? 60000;
  const latScore = Math.max(0, Math.min(1, 1 - (latP95 - 10000) / 60000));      // p95 10s→1.0, 70s→0
  const conc = score.axes.concurrency ?? {};
  const servedPct = score.callers ? score.served / score.callers : 0;           // 0..1
  const stallFree = score.slaBreaches === 0 && (conc.timedOut ?? 0) === 0 ? 1 : 0;
  const fleet = score.fleetHealthy && score.peersOk ? 1 : 0;
  const coord = score.coordinated ? 1 : 0;
  const total = Math.round(100 * (0.25 * d + 0.20 * latScore + 0.25 * servedPct + 0.10 * stallFree + 0.10 * fleet + 0.10 * coord));
  score.total = total;
  score.axes.score = { d, latScore, servedPct, stallFree, fleet, coord, total };
}

async function main() {
  await warm();
  console.log(`er7 benchmark — ${new Date().toISOString()}\n  base=${BASE} fleet=${FLEET} model=${MODEL} callers=${CALLERS}`);
  if (EXPECT_PEERS.length) console.log(`  expected peer heimdalls: ${EXPECT_PEERS.map((p) => `${p.name}=${p.address}`).join(", ")}`);

  await axisDoors();
  console.log(`\n[1] doorways        ${score.doors}/${score.doorsTotal}`);

  await axisLatency();
  const lat = score.axes.latency;
  console.log(`[2] latency         small=${JSON.stringify(lat.small)} big=${JSON.stringify(lat.big)} p95=${lat.p95}ms max=${lat.max}ms`);

  await axisConcurrency(CALLERS);
  const c = score.axes.concurrency;
  console.log(`[3] concurrency     ${c.served}/${c.callers} served  (${c.timedOut} timeout, ${c.refused} refused) avg=${c.avgMs}ms max=${c.maxMs}ms sla-breaches=${score.slaBreaches}`);

  await axisFleet();
  const f = score.axes.fleet;
  console.log(`[4] fleet           healthy=${f.healthy} peersOk=${f.peersOk} coordinated=${f.coordinated}`);
  for (const i of [...f.issues, ...f.peerIssues, ...f.coordIssues]) console.log(`      ! ${i}`);

  compute();
  console.log(`\nSCORE: ${score.total}/100`);
  console.log(`  weights: doors ${(score.axes.score.d * 25).toFixed(1)} + latency ${(score.axes.score.latScore * 20).toFixed(1)} + concurrency ${(score.axes.score.servedPct * 25).toFixed(1)} + stall-free ${(score.axes.score.stallFree * 10).toFixed(1)} + fleet ${(score.axes.score.fleet * 10).toFixed(1)} + coordination ${(score.axes.score.coord * 10).toFixed(1)}`);
  return score;
}

main().then((s) => process.exit(s.total >= 95 ? 0 : 1)).catch((e) => { console.error("benchmark error:", e); process.exit(2); });