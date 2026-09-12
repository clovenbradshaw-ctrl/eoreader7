// heimdall.mjs — the watcher at Bifröst who keeps every surface alive and
// steers traffic across them, on a DEF → EVA → REC loop.
//
// Handle: Heimdall — the god who stands at Bifröst and watches. He sees and
// hears everything, keeps watch against the day the bridge fails, and sounds
// the horn when danger comes. Here the bridge is the local model's SURFACES:
// every proxy process that fronts Ollama. Heimdall watches each one, re-forges
// the dead ones, and steers each request across the healthy ones.
//
// The loop, in this system's own act vocabulary:
//   DEF  — declare the void: every surface watched, and a suspected breakdown.
//   EVA  — evaluate: actually probe each surface, get a verdict.
//   REC  — re-zero: concede the failing ground and re-forge it (restart),
//          with the trigger recorded verbatim. Never a silent restart.
//
// The walls (this project's own law, applied to the watcher):
//   - EVA never convicts on a suspicion; it probes first, and only a
//     measured breakdown reaches REC.
//   - REC is bounded: a restart storm is itself a finding, never a loop.
//   - Steering admits by MODEL FAMILY with a per-family cap and a typed
//     429 + Retry-After refusal; routing across proxies to the SAME Ollama
//     serializes anyway, so the bridge shapes admission, never pretending
//     to spread load that cannot spread.
//   - Every act lands on an append-only log (heimdall-log.jsonl).
//
// Run standalone:  node heimdall.mjs
// The registry is env-driven: each surface is `name:port:cwd:cmd`, and the
// restart env is reproduced from the same vars used to launch it.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import http from "node:http";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";
const CHECK_INTERVAL_MS = Number(process.env.ER7_HEIMDALL_INTERVAL ?? 15000);
const HEALTH_TIMEOUT_MS = Number(process.env.ER7_HEIMDALL_HEALTH_TIMEOUT ?? 15000);
const MAX_RESTARTS = Number(process.env.ER7_HEIMDALL_MAX_RESTARTS ?? 3);
const RESTART_WINDOW_MS = Number(process.env.ER7_HEIMDALL_WINDOW ?? 10 * 60 * 1000);
const STEER_PORT = Number(process.env.ER7_HEIMDALL_PORT ?? 11437);
// Per-family admission cap (concurrent in-flight requests). Ollama runs one
// slot per model, so >1 in flight per family just queues invisibly; the
// bridge makes that queue VISIBLE and bounded. 0 = unlimited.
const FAMILY_CAP = Number(process.env.ER7_FAMILY_CAP ?? 1);
const RETRY_AFTER_S = Number(process.env.ER7_RETRY_AFTER ?? 15);
const LOG_FILE = path.join(HERE, "heimdall-log.jsonl");

const ts = () => new Date().toISOString();
const log = (msg) => process.stderr.write(`[${ts()}] [heimdall] ${msg}\n`);

function appendLog(entry) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify({ at: ts(), ...entry }) + "\n", "utf8");
  } catch { /* the log must never crash the watcher */ }
}

const fetchWithTimeout = async (url, ms) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { signal: ctrl.signal }); }
  finally { clearTimeout(t); }
};

// ── THE REGISTRY: every surface, its family, how to probe it, how to
// re-forge it. Env-driven so any process can be added without an edit:
//   ER7_SURFACES="er7:11436:/Users/mlacy/eoreader7:node proxy.mjs
//                 fold:8812:/Users/mlacy/Documents/3.0/the-fold:node explore-server.mjs 8812"
//   ER7_SURFACE_FAMILIES="er7:er7 fold:fold"   (surface -> model-family prefix)
//   ER7_SURFACE_ENV_er7="ER7_WEB_SEARCH=0"     (per-surface restart env)
// ─────────────────────────────────────────────────────────────────────────
const SURFACE_SPECS = String(process.env.ER7_SURFACES ?? "").trim()
  ? String(process.env.ER7_SURFACES).trim().split(/\s+/).filter(Boolean).map((s) => {
      const [name, port, cwd, ...cmd] = s.split(":");
      return { name, port: Number(port), cwd, cmd: cmd.join(":") || "node proxy.mjs" };
    })
  : [
      // Defaults: what this machine actually runs today. The er7 proxy (the
      // model the reader surfaces) and the three the-fold proxies.
      { name: "er7", port: 11436, cwd: HERE, cmd: "node proxy.mjs" },
      { name: "fold-8812", port: 8812, cwd: "/Users/mlacy/Documents/3.0/the-fold", cmd: "node explore-server.mjs" },
      { name: "fold-8819", port: 8819, cwd: "/Users/mlacy/Documents/3.0/the-fold", cmd: "node explore-server.mjs 8819" },
      { name: "fold-8837", port: 8837, cwd: "/Users/mlacy/Documents/3.0/the-fold", cmd: "node explore-server.mjs 8837" },
    ];

const FAMILY_OF = (surfaceName) =>
  (String(process.env.ER7_SURFACE_FAMILIES ?? "").trim()
    ? Object.fromEntries(String(process.env.ER7_SURFACE_FAMILIES).trim().split(/\s+/).filter(Boolean).map((kv) => kv.split(":")))
    : { er7: "er7", "fold-8812": "fold", "fold-8819": "fold", "fold-8837": "fold" })[surfaceName] ?? "any";

// A surface declares its own HEALTH PATH — the endpoint that tells the truth
// about it. The er7 proxy answers /health; the-fold's explore-server does
// not, and probing /health there is a false conviction (404 reads "down"
// when the surface is fine). The research rule that shapes this: a probe
// that cannot reach the real check is itself a bug — it false-fails.
const HEALTH_PATH_OF = (surfaceName) =>
  (String(process.env.ER7_SURFACE_HEALTH ?? "").trim()
    ? Object.fromEntries(String(process.env.ER7_SURFACE_HEALTH).trim().split(/\s+/).filter(Boolean).map((kv) => kv.split(":")))
    : { er7: "/health", "fold-8812": "/v1/models", "fold-8819": "/v1/models", "fold-8837": "/v1/models" })[surfaceName] ?? "/health";

const restartEnvFor = (name) =>
  Object.fromEntries(
    String(process.env[`ER7_SURFACE_ENV_${name}`] ?? "").trim().split(/\s+/).filter((s) => s.includes("="))
      .map((s) => { const i = s.indexOf("="); return [s.slice(0, i), s.slice(i + 1)]; }),
  );

const surfaces = SURFACE_SPECS.map((s) => ({
  ...s,
  family: FAMILY_OF(s.name),
  url: `http://127.0.0.1:${s.port}`,
  healthUrl: `http://127.0.0.1:${s.port}${HEALTH_PATH_OF(s.name)}`,
  up: null, reason: null, lastState: null, restartTimes: [], inflight: 0,
}));

// ── EVA: probe each surface, never convict on a suspicion ────────────────
// The wall: a probe that cannot REACH the real check proves nothing about
// the surface. A timeout ("This operation was aborted") under load means the
// box is busy, NOT that the surface is down — re-forging on it kills a
// healthy proxy and creates the very outage it then reports (measured live:
// a timed-out probe re-forged a working er7 proxy, then "no surface up" 503s
// while it booted). Only a DEFINITIVE refusal — connection refused, a real
// non-200 from the endpoint — flips a surface to down. An ambiguous read
// keeps the LAST KNOWN state and is logged as unverified, never convicted.
const DOWN_REASONS = new Set(["ECONNREFUSED", "ENOTFOUND", "EHOSTUNREACH"]);
async function probeSurface(surf) {
  try {
    const r = await fetchWithTimeout(surf.healthUrl, HEALTH_TIMEOUT_MS);
    if (r.status !== 200) { surf.up = false; surf.reason = `http_${r.status}`; return surf; }
    // A /health probe is honest on 200. A /v1/models probe must actually
    // return a model list — a 200 HTML shell would be a false "up".
    const body = await r.text();
    if (surf.healthUrl.includes("/v1/models")) {
      surf.up = /"id"\s*:/.test(body);
      surf.reason = surf.up ? null : "not_a_model_list";
    } else {
      surf.up = true;
      surf.reason = null;
    }
  } catch (err) {
    const code = err?.cause?.code ?? err?.message;
    if (DOWN_REASONS.has(code)) {
      // Definitive: nothing is listening there.
      surf.up = false;
      surf.reason = code;
    } else {
      // Ambiguous (timeout, abort, upstream error): the box is busy, not the
      // surface dead. Keep the last known state; mark unverified. Never
      // convict on a probe that could not complete.
      surf.reason = `unverified:${code ?? "timeout"}`;
      if (surf.up === null) surf.up = false; // never seen it: treat unknown as down for routing, but never RE-FORGE on this alone
    }
  }
  return surf;
}

// ── REC: re-forge a failing surface, with the trigger recorded ───────────
function reforgeSurface(surf) {
  const env = { ...process.env, ...restartEnvFor(surf.name) };
  log(`REC — ${surf.name} down (${surf.reason}); re-forging: ${surf.cmd}`);
  appendLog({ act: "rec", surface: surf.name, family: surf.family, reason: surf.reason, cmd: surf.cmd });
  const [cmd0, ...rest] = surf.cmd.split(/\s+/);
  const child = spawn(cmd0, rest, { cwd: surf.cwd, env, detached: true, stdio: "ignore" });
  child.unref();
}

// ── DEF: the void we watch ───────────────────────────────────────────────
appendLog({ act: "def", surfaces: surfaces.map((s) => ({ name: s.name, port: s.port, family: s.family, cmd: s.cmd })), ollama: OLLAMA_URL });

// ── VITALS: CPU, GPU, load, and the Ollama process — the box's own breath.
// Every metric is read off what macOS actually reports (no nvidia-smi; this
// is an M3). CRITICAL: `top -l 1` is a FULL snapshot (~52s on a loaded box)
// and `ioreg` is huge — so vitals are split into two tiers:
//   FAST  (every tick): loadavg + the Ollama process. ~instant, cheap.
//   SLOW  (every SLOW_MS, skipped when self-defense says so): top's CPU
//         split and ioreg's GPU util. Expensive; the SELF-DEFENSE loop below
//         throttles it when the watcher's own probes are adding load.
// A read that times out is a typed `null`, never a blocker.
import { execFile } from "node:child_process";
import { execFileSync } from "node:child_process";

const execOut = (cmd, args, ms) => new Promise((resolve) => {
  execFile(cmd, args, { encoding: "utf8", timeout: ms, maxBuffer: 8_000_000 }, (err, stdout) => {
    resolve(err ? null : String(stdout ?? ""));
  });
});

async function collectFastVitals() {
  const v = { load1: null, load5: null, load15: null, ollamaCpu: null, ollamaMemMb: null, ollamaPid: null };
  const load = await execOut("sysctl", ["-n", "vm.loadavg"], 2000);
  if (load) {
    const [l1, l5, l15] = load.replace(/[{}]/g, "").trim().split(/\s+/).map(Number);
    v.load1 = l1; v.load5 = l5; v.load15 = l15;
  }
  const pidLine = await execOut("pgrep", ["-f", "llama-server"], 2000);
  const pid = pidLine?.trim().split("\n")[0];
  if (pid) {
    v.ollamaPid = Number(pid);
    const ps = await execOut("ps", ["-o", "%cpu=,rss=", "-p", pid], 2000);
    if (ps) {
      const parts = ps.trim().split(/\s+/);
      v.ollamaCpu = Number(parts[0] ?? null);
      v.ollamaMemMb = parts[1] ? Math.round(Number(parts[1]) / 1024) : null;
    }
  }
  return v;
}

async function collectSlowVitals() {
  const v = { cpuUser: null, cpuSys: null, cpuIdle: null, gpuUtil: null };
  const top = await execOut("top", ["-l", "1", "-n", "0", "-s", "0"], 60000);
  if (top) {
    const m = /CPU usage:\s*([\d.]+)% user,\s*([\d.]+)% sys,\s*([\d.]+)% idle/.exec(top);
    if (m) { v.cpuUser = Number(m[1]); v.cpuSys = Number(m[2]); v.cpuIdle = Number(m[3]); }
  }
  const ioreg = await execOut("ioreg", ["-c", "AppleGPU", "-l"], 10000);
  if (ioreg) {
    // GPU bandwidth: the renderer's ACTUAL utilization vs. idle — how much
    // of the GPU's compute is being used right now. 0 = idle, ~90+ = pegged.
    const m = /"Device Utilization %"=(\d+)/.exec(ioreg);
    if (m) v.gpuUtil = Number(m[1]);
  }
  return v;
}

// The box is saturated ONLY when CPU idle is actually pegged — the honest
// capacity signal on macOS, where load average counts hundreds of sleeping
// processes and reads absurdly high (measured: load 250+ at 50% idle on an
// 8-core box). Load average is NEVER a refusal basis here; it is noise. And
// an UNKNOWN reading is never a refusal either ("a missing measurement is
// never a conviction"): if the slow tier (which reads CPU idle) has not
// landed, the box is read as NOT saturated. The family cap is the real
// admission control.
function boxSaturated(vitals) {
  if (!vitals || vitals.cpuIdle == null) return false;
  return vitals.cpuIdle <= 10; // pegged: ~0% idle means no room for a turn
}

// ── DISCLOSURE: what a user actually wants to know. CPU/GPU BANDWIDTH is
// the free headroom, not the raw number: how much of each is NOT busy right
// now. ETA is a count of work ahead scaled by a measured per-turn time —
// never a promise, always an honest estimate ("~N request(s) ahead, each
// roughly M seconds").
let lastTurnMs = 120000; // seed: a plausible long turn until real ones land
const TURN_MS_SEED = 120000;
const TURN_MS_FLOOR = 10000;
function recordTurnMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  lastTurnMs = Math.round(0.6 * lastTurnMs + 0.4 * ms); // EWMA
}
function etaFor(workAhead) {
  if (workAhead <= 0) return { ahead: 0, etaMs: 0, perTurnMs: lastTurnMs };
  return { ahead: workAhead, etaMs: Math.round(workAhead * lastTurnMs), perTurnMs: lastTurnMs };
}
// The disclosure object every surface /heimdall and every thinking block can
// read: the box's breathing room, in plain numbers.
function disclosure() {
  const v = cachedVitals() ?? {};
  const cpuBusy = v.cpuIdle == null ? null : Math.round(100 - v.cpuIdle);
  const gpuBusy = v.gpuUtil; // device utilization % — the GPU's actual load
  const workAhead = surfaces.reduce((a, s) => a + s.inflight, 0);
  const eta = etaFor(workAhead);
  return {
    at: ts(),
    cpu: cpuBusy == null ? { busy: null, idle: null, note: "not measured yet" } : { busy: cpuBusy, idle: Math.round(v.cpuIdle) },
    gpu: gpuBusy == null ? { busy: null, note: "not measured yet" } : { busy: gpuBusy, idle: Math.round(100 - gpuBusy) },
    load: v.load1 ?? null,
    queue: { workAhead, perTurnMs: eta.perTurnMs, etaMs: eta.etaMs, etaHuman: eta.etaMs ? `${Math.round(eta.etaMs / 1000)}s` : "now" },
    saturated: boxSaturated(cachedVitals()),
    surfacesUp: surfaces.filter((s) => s.up === true).length,
    surfacesTotal: surfaces.length,
  };
}

// ── VITALS CACHE ──────────────────────────────────────────────────────────
// Fast vitals refresh on every tick (single-flight so concurrent ticks await
// one collection); slow vitals refresh on SLOW_MS, gated by the SELF-DEFENSE
// loop below — when the watcher's own probes are contributing to load, the
// slow tier is skipped until the box breathes. The STEER path reads the LAST
// GOOD snapshot; a request never spawns a process itself.
let vitalsCache = null;
let vitalsCacheAt = 0;
let vitalsSlowCache = null;
let vitalsSlowAt = 0;
let vitalsInFlight = null;
const VITALS_TTL_MS = Number(process.env.ER7_HEIMDALL_VITALS_TTL ?? 60000);
const VITALS_SLOW_MS = Number(process.env.ER7_HEIMDALL_VITALS_SLOW ?? 120000);
function cachedVitals() {
  return vitalsCache ? { ...vitalsCache, ...vitalsSlowCache } : null; // never spawns
}
async function refreshVitals() {
  const now = Date.now();
  if (vitalsCache && now - vitalsCacheAt < VITALS_TTL_MS) return cachedVitals();
  if (vitalsInFlight) return vitalsInFlight;
  vitalsInFlight = (async () => {
    try { vitalsCache = await collectFastVitals(); vitalsCacheAt = Date.now(); }
    catch { /* keep last good */ }
    finally { vitalsInFlight = null; }
    return cachedVitals();
  })();
  return vitalsInFlight;
}
async function refreshSlowVitals() {
  const now = Date.now();
  if (vitalsSlowCache && now - vitalsSlowAt < VITALS_SLOW_MS) return;
  if (selfDefensePausedSlow) return; // the watcher's own load gate says skip
  vitalsSlowCache = await collectSlowVitals();
  vitalsSlowAt = Date.now();
}

let lastVitals = null;
const VITALS_LOG_MS = Number(process.env.ER7_HEIMDALL_VITALS_LOG ?? 15000);

// ── SELF-DEFENSE: the watcher watches its own watching ────────────────────
// DEF — declare the void: the watcher can contribute to the very load it
//   measures (measured: `top -l 1` ~52s, and a naive loop stacked copies).
// EVA — evaluate: count the watcher's OWN probe children (`top`, `ioreg`).
//   If the watcher is running more than one slow probe at once, it is part
//   of the problem — its probes are stacking.
// REC — re-zero: pause the slow vitals tier (top + ioreg) and back the tick
//   interval off until the box breathes. The fast tier (loadavg + the
//   Ollama process) is cheap and always safe, so it keeps running — the
//   steering still reads a truthful load signal, just without the watcher
//   inflating it.
let selfDefensePausedSlow = false;
let selfDefenseIntervalMs = CHECK_INTERVAL_MS;
let lastSlowProbeChildren = 0;

async function evalSelfProbes() {
  try {
    // Count ONLY the watcher's own probe children (by PPID), never every
    // `top`/`ioreg` on the box — other apps run those too, and counting them
    // makes self-defense pause the slow tier forever on a busy machine.
    const out = await execOut("ps", ["-Ao", "pid=,ppid=,comm="], 2000);
    if (!out) return 0;
    const myPid = String(process.pid);
    return out.split("\n").filter((l) => {
      const parts = l.trim().split(/\s+/);
      if (parts.length < 3) return false;
      const [pid, ppid, comm] = parts;
      return ppid === myPid && (comm === "top" || comm === "ioreg");
    }).length;
  } catch { return 0; }
}

async function selfDefense() {
  const probes = await evalSelfProbes();
  const stacking = probes > 1;
  if (stacking && !selfDefensePausedSlow) {
    // REC: the watcher is inflating its own measurement. Concede the slow
    // tier and the tight cadence; keep only the cheap, truthful fast tier.
    selfDefensePausedSlow = true;
    selfDefenseIntervalMs = Math.min(60000, Math.max(CHECK_INTERVAL_MS * 4, 30000));
    log(`REC — self-defense: ${probes} slow probe child(ren) stacking; pausing slow vitals (top+ioreg) and backing tick to ${selfDefenseIntervalMs}ms. The watcher will not create the load it measures.`);
    appendLog({ act: "rec", finding: "self_load", probes, pausedSlow: true, intervalMs: selfDefenseIntervalMs });
  } else if (!stacking && selfDefensePausedSlow) {
    // The box breathed; the slow tier is safe again — but ease back, never
    // snap: a single clean read is not two texts (the autonomy spiral's own
    // "a single clean text is a lucky text").
    selfDefensePausedSlow = false;
    selfDefenseIntervalMs = CHECK_INTERVAL_MS;
    log(`REC — self-defense: probes back to ${probes}; slow vitals resumed, tick to ${selfDefenseIntervalMs}ms.`);
    appendLog({ act: "rec", finding: "self_clear", probes, pausedSlow: false, intervalMs: selfDefenseIntervalMs });
  }
  lastSlowProbeChildren = probes;
}

async function tick() {
  // SELF-DEFENSE first: adjust the watcher's own behavior before measuring.
  await selfDefense();

  // SURFACE PROBES FIRST — routing depends on them and they are fast. They
  // must never wait on the slow vitals tier: `top -l 1` takes ~50s+ on a
  // loaded box, and gating surface health on it means no surface is ever
  // verified (measured: everything stayed `up: null` under load). The slow
  // tier is fire-and-forget below; the box's CPU/GPU reading can land late.
  for (const surf of surfaces) {
    const before = surf.up;
    await probeSurface(surf);
    if (before !== surf.up) {
      log(`EVA — ${surf.name} (${surf.family}) ${surf.up ? "UP" : "DOWN"} (${surf.reason})`);
      appendLog({ act: "eva", surface: surf.name, family: surf.family, up: surf.up, reason: surf.reason ?? null });
    }
    if (surf.up) { surf.restartTimes = []; continue; }

    // The REC wall: never re-forge on an UNVERIFIED probe (a timeout means
    // the box is busy, not that the surface died — re-forging a healthy
    // proxy creates the outage it then reports). Only a definitive refusal
    // earns a re-forge.
    if ((surf.reason ?? "").startsWith("unverified:")) {
      if (surf.up === null) surf.up = false; // unknown stays unknown for routing
      continue;
    }

    // Bound the REC: a restart storm is a finding, never a happy loop.
    const now = Date.now();
    surf.restartTimes = surf.restartTimes.filter((t) => now - t < RESTART_WINDOW_MS);
    if (surf.restartTimes.length >= MAX_RESTARTS) {
      log(`EVA — ${surf.name} down and ${MAX_RESTARTS} restarts in the window; refusing to restart-loop. Escalate.`);
      appendLog({ act: "eva", surface: surf.name, finding: "restart_storm", count: surf.restartTimes.length });
      continue;
    }
    surf.restartTimes.push(now);
    reforgeSurface(surf);
}

  // VITALS — the FAST tier (loadavg + Ollama proc) is cheap (~instant) and is
  // AWAITED so the disclosure is never all-null. The SLOW tier (top + ioreg)
  // takes ~50s+ on a loaded box and is fire-and-forget, never gating routing
  // or /heimdall. A late CPU/GPU reading is honest; a missing one is "?".
  await refreshVitals().catch(() => {});
  refreshSlowVitals().catch(() => {});
  const full = cachedVitals();
  const saturated = boxSaturated(full);
  const vitalsChanged = !lastVitals || Math.abs((full?.load1 ?? 0) - (lastVitals.load1 ?? 0)) > 2 || full?.gpuUtil !== lastVitals.gpuUtil || full?.ollamaPid !== lastVitals.ollamaPid;
  const vitalsDue = !lastVitals || Date.now() - (lastVitals._at ?? 0) > VITALS_LOG_MS;
  if (vitalsChanged && vitalsDue) {
    lastVitals = { ...full, _at: Date.now() };
    log(`VITALS — load ${full?.load1 ?? "?"}/${full?.load5 ?? "?"}/${full?.load15 ?? "?"} cpu ${full?.cpuUser ?? "?"}%u/${full?.cpuSys ?? "?"}%s/${full?.cpuIdle ?? "?"}%idle gpu ${full?.gpuUtil ?? "?"}% ollama pid=${full?.ollamaPid ?? "?"} cpu=${full?.ollamaCpu ?? "?"}% mem=${full?.ollamaMemMb ?? "?"}MB ${saturated ? "⚠ SATURATED" : ""}${selfDefensePausedSlow ? " [slow-vitals paused]" : ""}`);
    appendLog({ act: "eva", kind: "vitals", ...full, saturated, slowPaused: selfDefensePausedSlow });
  }
}

// ── STEERING: the bridge. Admit by model family with a typed refusal. ─────
const familyOfRequest = (model) => String(model ?? "").split(":")[0] || "any";
// A surface is routable only on a VERIFIED up — `null` (never probed) and
// `false` are both refused. An unverified timeout keeps the last KNOWN up so
// a busy-but-alive surface keeps serving, but a surface never seen up is not
// handed traffic.
const healthyOf = (family) => surfaces.filter((s) => s.up === true && (family === "any" || s.family === family));
// Least-connections within the family: the surface with the fewest in-flight
// requests is the one to cross. The one reliable capacity signal is the
// bridge's own in-flight count (research: latency EWMA is noise on one box).
const pickSurface = (family) => {
  const candidates = healthyOf(family);
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.inflight - b.inflight);
  return candidates[0];
};

const modelOf = (body) => {
  try { return String(JSON.parse(body)?.model ?? "").trim() || "unknown"; }
  catch { return "unknown"; }
};

async function forwardTo(res, method, targetUrl, headers, body) {
  const ctrl = new AbortController();
  res.on("close", () => ctrl.abort());
  const started = Date.now();
  const up = await fetch(targetUrl, { method, headers: { ...headers, host: new URL(targetUrl).host }, body, signal: ctrl.signal });
  res.writeHead(up.status, { ...up.headers, "x-heimdall-steered": "1" });
  if (!up.body) { res.end(); recordTurnMs(Date.now() - started); return { sentBytes: false, status: up.status }; }
  const reader = up.body.getReader();
  const dec = new TextDecoder();
  let sentBytes = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sentBytes = true;
    res.write(dec.decode(value, { stream: true }));
  }
  res.end();
  recordTurnMs(Date.now() - started);
  return { sentBytes, status: up.status };
}

const steer = http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      status: "ok", steered: true, familyCap: FAMILY_CAP,
      surfaces: surfaces.map((s) => ({ name: s.name, family: s.family, up: s.up, inflight: s.inflight })),
    }));
    return;
  }
  // ── /heimdall — the full status, readable from ANY surface. Every surface
  // forwards /heimdall here, so the bridge's breath is one endpoint: the
  // vitals (CPU/GPU/load/ollama), the queue + ETA disclosure, every surface's
  // state, the DEF/EVA/REC log tail, and the steering config.
  if (req.method === "GET" && req.url === "/heimdall") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      at: ts(),
      status: "ok",
      steered: true,
      steerPort: STEER_PORT,
      familyCap: FAMILY_CAP,
      retryAfterS: RETRY_AFTER_S,
      disclosure: disclosure(),
      vitals: cachedVitals() ?? null,
      surfaces: surfaces.map((s) => ({
        name: s.name, family: s.family, port: s.port, up: s.up, reason: s.reason,
        inflight: s.inflight, cmd: s.cmd, restartsInWindow: s.restartTimes.length,
      })),
      logTail: (() => { try { return fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").slice(-12) : []; } catch { return []; } })(),
    }));
    return;
  }
  if (req.method === "GET" && (req.url === "/v1/models" || req.url === "/api/tags")) {
    // Models: prefer a healthy surface; fall back to any that answers.
    const target = pickSurface("any") ?? surfaces.find((s) => s.up) ?? surfaces[0];
    if (!target?.up) { res.writeHead(503, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: "no surface up" } })); return; }
    await forwardTo(res, "GET", `${target.url}${req.url}`, req.headers, null);
    return;
  }

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    const isChat = req.method === "POST" && /(\/v1\/chat\/completions|\/api\/chat)$/.test(req.url);
    if (!isChat) {
      const target = pickSurface("any") ?? surfaces[0];
      if (!target?.up) { res.writeHead(503, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: "no surface up" } })); return; }
      await forwardTo(res, req.method, `${target.url}${req.url}`, req.headers, body);
      return;
    }

    const model = modelOf(body);
    const family = familyOfRequest(model);

    // A saturated box refuses fast (EVA before admission): piling work onto a
    // box whose load is already far above its cores helps nobody. The refusal
    // is typed and carries Retry-After so a client backs off instead of
    // stampeding. The vitals gate reads the CACHED snapshot — never spawns a
    // process on the request path.
    const liveVitals = cachedVitals();
    const saturated = boxSaturated(liveVitals);
    if (saturated) {
      log(`STEER — box saturated (load ${liveVitals.load1} gpu ${liveVitals.gpuUtil}%); refusing ${family} with 429, retry ${RETRY_AFTER_S}s`);
      appendLog({ act: "eva", finding: "saturated", family, model, load1: liveVitals.load1, gpuUtil: liveVitals.gpuUtil, retryAfterS: RETRY_AFTER_S });
      res.writeHead(429, { "content-type": "application/json", "retry-after": String(RETRY_AFTER_S) });
      res.end(JSON.stringify({ error: { message: `box saturated — retry after ${RETRY_AFTER_S}s`, type: "saturated", retry_after: RETRY_AFTER_S } }));
      return;
    }

    const target = pickSurface(family);
    if (!target) {
      // No healthy surface for this family: typed refusal, never a hang.
      log(`STEER — no surface up for family ${family}`);
      appendLog({ act: "eva", finding: "no_surface", family, model });
      res.writeHead(503, { "content-type": "application/json", "retry-after": String(RETRY_AFTER_S) });
      res.end(JSON.stringify({ error: { message: `no surface available for ${family} — retry`, type: "no_surface", retry_after: RETRY_AFTER_S } }));
      return;
    }

    if (FAMILY_CAP > 0 && family !== "any") {
      const familyInflight = surfaces.filter((s) => s.family === family).reduce((a, s) => a + s.inflight, 0);
      if (familyInflight >= FAMILY_CAP) {
        log(`STEER — family ${family} full (${familyInflight} in flight); refusing 429, retry ${RETRY_AFTER_S}s`);
        appendLog({ act: "eva", finding: "lane_full", family, model, inflight: familyInflight, retryAfterS: RETRY_AFTER_S });
        res.writeHead(429, { "content-type": "application/json", "retry-after": String(RETRY_AFTER_S) });
        res.end(JSON.stringify({ error: { message: `family ${family} busy — retry after ${RETRY_AFTER_S}s`, type: "lane_full", retry_after: RETRY_AFTER_S } }));
        return;
      }
    }

    target.inflight += 1;
    const d = disclosure();
    try {
      const out = await forwardTo(res, "POST", `${target.url}${req.url}`, { ...req.headers, "x-heimdall-eta": d.queue.etaHuman, "x-heimdall-cpu": String(d.cpu.busy ?? ""), "x-heimdall-gpu": String(d.gpu.busy ?? "") }, body);
      appendLog({ act: "crossing", family, model, surface: target.name, status: out.status, sentBytes: out.sentBytes, etaMs: d.queue.etaMs });
    } catch (err) {
      log(`STEER — forward failed pre-first-byte on ${target.name}: ${err.message}`);
      appendLog({ act: "eva", finding: "forward_failed", family, model, surface: target.name, reason: err.message });
      if (!res.headersSent) {
        res.writeHead(503, { "content-type": "application/json", "retry-after": String(RETRY_AFTER_S) });
        res.end(JSON.stringify({ error: { message: "bridge forward failed — retry", type: "bridge_error", retry_after: RETRY_AFTER_S } }));
      } else {
        res.end();
      }
    } finally {
      target.inflight -= 1;
    }
  });
});

// ── THE SELF-SCHEDULING LOOP ─────────────────────────────────────────────
// The tick re-schedules itself so the SELF-DEFENSE loop can adjust the
// cadence: a watcher that backs off when it is contributing to load, and
// eases back when the box breathes. Overlap is impossible — a slow tick is
// simply not running two at once.
let ticking = false;
async function schedule() {
  if (ticking) return;
  ticking = true;
  try { await tick(); }
  catch (err) { log(`tick error: ${err.message}`); }
  finally { ticking = false; }
  setTimeout(schedule, selfDefenseIntervalMs);
}
schedule();

steer.listen(STEER_PORT, "127.0.0.1", () => {
  log(`Heimdall steering on http://127.0.0.1:${STEER_PORT} — ${surfaces.length} surface(s): ${surfaces.map((s) => `${s.name}(${s.family})`).join(", ")} (family cap ${FAMILY_CAP}, tick ${selfDefenseIntervalMs}ms)`);
  appendLog({ act: "def", steered: { port: STEER_PORT, familyCap: FAMILY_CAP, retryAfterS: RETRY_AFTER_S } });
});