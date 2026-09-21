// heimdall.mjs — the watcher at Bifröst who keeps every surface alive and
// steers traffic across them, on a DEF → EVA → REC loop.
//
// Handle: Heimdall — the god who stands at Bifröst and watches. He sees and
// hears everything, keeps watch against the day the bridge fails, and sounds
// the horn when danger comes. Here the bridge is the local model's SURFACES:
// every proxy process that fronts Ollama. Heimdall watches each one, re-forges
// the dead ones, and steers each request across the healthy ones.
//
// Huginn, Muninn and Kairos (the-fold/huginn.js, muninn.js, kairos.js) are
// his three — the triad under the bridge. Huginn is the watcher of model
// PRIORITIZATION — which model answers which job, ranked by measured
// evidence and hopped on typed failure, room mouths included. Muninn is
// the watcher of MEMORY — what is recalled into the turn from the record,
// and what earns standing, never a word of it replacing the record's own
// bytes. Kairos is the watcher of the PATTERN — whether the turn's
// difference made a difference, the sign (pattern / noise / gap) over the
// aperture's measured surprise and the correspondence acts, never a metric
// displayed and never a verdict from an unmeasured gap. Heimdall is the
// boss: the surfaces, the steering, the admission, the re-forging, and (since
// 2026-09-19) the reaping of background strays stay here; the three answer
// only under the bridge. The register lives in
// the-fold's solon.js — the one authoritative list, never restated here.
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
//   - Every act lands on a log (heimdall-log.jsonl) — append-only while it
//     is fresh, then SNAPSHOT and TRIM (2026-09-19): the memory is not
//     infinite. Recent past stays verbatim (full resolution); past a horizon
//     the raw lines fold into hourly snapshots, then daily, then are
//     released — higher resolution for the more recent past. The learner
//     (the rule-author holon) reads through the fold, so trimming never
//     blinds it.
//
// DUAL MODE (2026-09-13): the watcher now runs INSIDE the proxy. The proxy
// imports this module, starts the watcher, serves /heimdall itself, and
// applies the same admission on its own request path — one process, no
// separate steer port, no second checkout to drift. The module still runs
// STANDALONE (`node heimdall.mjs`) with its own steer server when it is the
// main entry; when imported, it exports its machinery and does not listen.
//
// The registry is env-driven: each surface is `name:port:cwd:cmd`, and the
// restart env is reproduced from the same vars used to launch it.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import http from "node:http";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const isMain = (() => {
  try { return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href; }
  catch { return false; }
})();

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";

// ── INFERENCE HOSTS: many small servers, one picker (2026-09-21) ──────────
// Our incentives are not a GPU farm's. The models are small and the box is
// shared, so a turn's cost is not generation throughput — it is the COLD
// LOAD (seconds, and it evicts what was resident) and the PROMPT EVAL (the
// prefix cache only helps on the server that already saw the prefix).
// Measured on this box 2026-09-21: one turn = 7.8s wall, of which prompt
// eval 1.7s, generation 4.4s for 32 tokens, load 10ms because the model
// was resident. A naive round robin across N servers would pay a cold load
// on every server for every model and throw away every prefix cache. So
// the picker is, in order:
//   1. STICKY — a session stays on the host that last served it while that
//      host is up and the model is still resident there (prefix cache, no
//      reload).
//   2. RESIDENT FIRST — among the rest, a host with the model resident
//      (/api/ps, probed each cadence) outranks one that must load it —
//      unless its expected wait exceeds the other's wait plus the load cost
//      MEASURED on that other host (its own load_duration EWMA), never a
//      hand-set constant.
//   3. SHORTEST EXPECTED WAIT — in-flight × measured mean turn ms on that
//      host for that model; unmeasured hosts score at the mean of the
//      measured ones, so they are tried, never starved or preferred.
//   4. ROTATE TIES — an idle fleet spreads instead of pinning the first host.
// A host that refuses (ECONNREFUSED) is stood down until the next cadence
// probes it back; a single timeout never convicts (the last state stands).
// Configure with ER7_OLLAMA_HOSTS="name=http://host:port,name=url"; the
// default is the one local daemon, so nothing changes for a one-box setup.
const HOST_EWMA = 0.3;
function parseHosts() {
  const raw = String(process.env.ER7_OLLAMA_HOSTS ?? "").trim();
  const out = [];
  for (const spec of raw.split(",").map((x) => x.trim()).filter(Boolean)) {
    const eq = spec.indexOf("=");
    const name = eq === -1 ? spec.replace(/^https?:\/\//, "").replace(/[^a-z0-9.-]/gi, "_") : spec.slice(0, eq).trim();
    const url = (eq === -1 ? spec : spec.slice(eq + 1).trim()).replace(/\/+$/, "");
    if (!/^https?:\/\//.test(url)) continue;
    out.push({ name, url });
  }
  if (!out.length) out.push({ name: "local", url: OLLAMA_URL });
  return out.map((h) => ({
    ...h, inflight: 0, calls: 0, picks: 0, fails: 0, lastAt: null, downAt: null, downReason: null,
    meanMs: new Map(),   // model -> EWMA turn ms on this host
    loadMs: null,        // EWMA of REAL loads (load_duration > 100ms) on this host
    resident: new Map(), // model -> expiresAt (from /api/ps) — what is hot here
  }));
}
const hosts = parseHosts();
const sessionHost = new Map(); // sessionId -> host name (stickiness)
let hostRotate = 0;
export const inferenceHosts = () => hosts;
export function hostByName(name) { return hosts.find((h) => h.name === name) ?? null; }
function hostUp(h) { return h.downAt == null; }
function hostResident(h, model) {
  const exp = h.resident.get(model);
  if (exp == null) return false;
  return Date.parse(exp) > Date.now() || !Number.isFinite(Date.parse(exp));
}
/** Pick the host for a turn. Returns { host, reason, order }. */
export function pickHost({ model = null, session = null } = {}) {
  const up = hosts.filter((h) => hostUp(h) && !h.shapeMismatch);
  if (!up.length) return { host: hosts[0], reason: "all_hosts_down_trying_first", order: hosts.map((h) => h.name) };
  if (model) maybePrewarm(model);
  // 1. sticky
  if (session && sessionHost.has(session)) {
    const h = hostByName(sessionHost.get(session));
    if (h && hostUp(h) && (!model || hostResident(h, model))) { h.picks++; return { host: h, reason: "sticky_session", order: [h.name] }; }
  }
  // 3. expected wait per host
  const measured = up.map((h) => (model ? h.meanMs.get(model) : null)).filter((v) => Number.isFinite(v) && v > 0);
  const typical = measured.length ? measured.reduce((a, b) => a + b, 0) / measured.length : 1;
  const waitOf = (h) => h.inflight * ((model && h.meanMs.get(model)) || typical);
  const loadCostOf = (h) => (h.loadMs ?? 0);
  // 2. resident first, unless waiting for the resident host costs more than
  //    loading elsewhere (that host's own measured load cost)
  let cands = up.slice();
  if (model) {
    const res = cands.filter((h) => hostResident(h, model));
    const cold = cands.filter((h) => !hostResident(h, model));
    if (res.length && cold.length) {
      const bestRes = Math.min(...res.map(waitOf));
      const bestColdTotal = Math.min(...cold.map((h) => waitOf(h) + loadCostOf(h)));
      cands = bestRes <= bestColdTotal ? res : cands;
    }
  }
  const waits = new Map(cands.map((h) => [h.name, waitOf(h)]));
  const min = Math.min(...waits.values());
  const tied = cands.filter((h) => waits.get(h.name) === min);
  // 4. rotate ties
  const pick = tied.length > 1 ? tied[hostRotate++ % tied.length] : tied[0];
  pick.picks++;
  if (session) sessionHost.set(session, pick.name);
  if (sessionHost.size > 5000) { const first = sessionHost.keys().next().value; sessionHost.delete(first); }
  const order = cands.slice().sort((x, y) => waits.get(x.name) - waits.get(y.name)).map((h) => h.name);
  const reason = tied.length > 1 ? "rotate_tie" : (model && hostResident(pick, model)) ? "resident_shortest_wait" : "shortest_expected_wait";
  return { host: pick, reason, order };
}
// ADMITTED, NOT YET STARTED: a turn passes the door seconds before it
// reaches a daemon (the mechanical pipeline runs first), so a burst looks
// idle at the door if only host in-flight is counted. Each admission lands a
// stamp; the next hostBegin consumes the oldest; a stamp older than 60s is a
// turn that never reached a host (answered mechanically, or failed) and is
// dropped — the count can never leak upward.
const admittedPending = [];
export function noteAdmitted() { admittedPending.push(Date.now()); }
function pendingCount() {
  const cut = Date.now() - 60000;
  while (admittedPending.length && admittedPending[0] < cut) admittedPending.shift();
  return admittedPending.length;
}
export function hostBegin(name) {
  if (admittedPending.length) admittedPending.shift();
  const h = hostByName(name); if (!h) return;
  h.inflight += 1; h.lastAt = Date.now();
}
export function hostEnd(name, { model = null, ms = null, ok = true, loadMs = 0, refused = false, queueMs = null } = {}) {
  const h = hostByName(name); if (!h) return;
  h.inflight = Math.max(0, h.inflight - 1);
  h.lastAt = Date.now();
  if (ok) {
    h.calls += 1;
    // the daemon's queue behind callers this gate never saw — an EWMA that
    // decays to zero once the foreign load is gone
    if (Number.isFinite(queueMs)) h.queueMs = h.queueMs == null ? Math.round(queueMs) : Math.round((1 - HOST_EWMA) * h.queueMs + HOST_EWMA * queueMs);
    if (h.downAt != null) { h.downAt = null; h.downReason = null; appendLog({ act: "rec", finding: "host_back", host: name }); }
    if (model && Number.isFinite(ms) && ms > 0) {
      const prev = h.meanMs.get(model);
      h.meanMs.set(model, prev == null ? Math.round(ms) : Math.round((1 - HOST_EWMA) * prev + HOST_EWMA * ms));
      // it just answered with this model: resident here until the daemon's keep-alive (refreshed by /api/ps)
      if (!h.resident.has(model)) h.resident.set(model, new Date(Date.now() + 600000).toISOString());
    }
    if (loadMs > 100) h.loadMs = h.loadMs == null ? Math.round(loadMs) : Math.round((1 - HOST_EWMA) * h.loadMs + HOST_EWMA * loadMs);
  } else {
    h.fails += 1;
    if (refused) { h.downAt = Date.now(); h.downReason = "refused"; appendLog({ act: "eva", finding: "host_down", host: name, reason: "refused" }); }
  }
}
/** The least expected wait for a model over the hosts that answer: in-flight
 *  × that host's measured mean for the model. null when no host has a
 *  measurement — unmeasured is never a hold. */
export function expectedWaitMs(model) {
  let best = null;
  const up = hosts.filter((h) => hostUp(h) && !h.shapeMismatch);
  // turns admitted but not yet on a host will spread over the up hosts
  const pendingEach = up.length ? Math.ceil(pendingCount() / up.length) : 0;
  for (const h of up) {
    const mean = h.meanMs.get(model);
    if (!Number.isFinite(mean) || mean <= 0) continue;
    const ahead = h.inflight + pendingEach;
    const ms = ahead * mean + (h.queueMs ?? 0);
    if (best == null || ms < best.ms) best = { ms, host: h.name, inflight: ahead, meanMs: mean, queueMs: h.queueMs ?? 0 };
  }
  return best ?? { ms: null, host: null, inflight: 0, meanMs: null };
}

/** SAME SHAPE (item 4): every host must run the same context window for a
 *  model it has loaded, or a switch between hosts is a reload. Compared from
 *  each host's own /api/ps; a host whose loaded window differs from the
 *  majority is marked and skipped by the picker until it matches. */
function checkHostShapes() {
  const windows = new Map(); // model -> Map(ctx -> [hosts])
  for (const h of hosts) for (const [m, info] of h.residentInfo ?? []) {
    if (!Number.isFinite(info?.contextLength)) continue;
    const byCtx = windows.get(m) ?? new Map();
    byCtx.set(info.contextLength, [...(byCtx.get(info.contextLength) ?? []), h.name]);
    windows.set(m, byCtx);
  }
  for (const h of hosts) {
    let mismatch = null;
    for (const [m, info] of h.residentInfo ?? []) {
      const byCtx = windows.get(m); if (!byCtx || byCtx.size < 2) continue;
      const majority = [...byCtx.entries()].sort((a, b) => b[1].length - a[1].length)[0][0];
      if (info.contextLength !== majority) mismatch = { model: m, window: info.contextLength, majority };
    }
    if (mismatch && !h.shapeMismatch) appendLog({ act: "eva", finding: "host_shape_mismatch", host: h.name, ...mismatch });
    if (!mismatch && h.shapeMismatch) appendLog({ act: "rec", finding: "host_shape_ok", host: h.name });
    h.shapeMismatch = mismatch;
  }
}

/** PRE-WARM (item 4): when a host's queue is longer than one of its own
 *  turns (in-flight × mean > mean, i.e. someone is already waiting), warm the
 *  model on an up host that does not have it resident — before the next
 *  prompt pays the cold load. One warm per host per cadence, fire-and-forget,
 *  and never into a host that is standing down. The trigger is the host's
 *  own measurement, not a constant. */
const prewarmAt = new Map();
export function maybePrewarm(model) {
  if (!model) return null;
  const queued = hosts.filter((h) => hostUp(h) && h.inflight > 1 && hostResident(h, model));
  if (!queued.length) return null;
  const cold = hosts.filter((h) => hostUp(h) && !h.shapeMismatch && !hostResident(h, model) && Date.now() - (prewarmAt.get(h.name) ?? 0) > 60000);
  if (!cold.length) return null;
  const target = cold[0];
  prewarmAt.set(target.name, Date.now());
  appendLog({ act: "rec", finding: "host_prewarm", host: target.name, model, because: `${queued[0].name} has ${queued[0].inflight} in flight` });
  fetch(`${target.url}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, keep_alive: "1h" }), signal: AbortSignal.timeout(120000) })
    .then((r) => { if (r.ok) target.resident.set(model, new Date(Date.now() + 3600000).toISOString()); })
    .catch(() => {});
  return target.name;
}

export function hostsDisclosure() {
  return hosts.map((h) => ({
    name: h.name, url: h.url, up: hostUp(h), downReason: h.downReason, inflight: h.inflight, calls: h.calls, picks: h.picks, fails: h.fails,
    lastAt: h.lastAt ? new Date(h.lastAt).toISOString() : null,
    shapeMismatch: h.shapeMismatch ?? null,
    queueMs: h.queueMs ?? null,
    loadMs: h.loadMs, meanMs: Object.fromEntries(h.meanMs), resident: [...h.resident.keys()],
    sessions: [...sessionHost.values()].filter((n) => n === h.name).length,
  }));
}
let CHECK_INTERVAL_MS = Number(process.env.ER7_HEIMDALL_INTERVAL ?? 15000); // runtime-adjustable (see SETTINGS)
const HEALTH_TIMEOUT_MS = Number(process.env.ER7_HEIMDALL_HEALTH_TIMEOUT ?? 15000);
let MAX_RESTARTS = Number(process.env.ER7_HEIMDALL_MAX_RESTARTS ?? 3); // runtime-adjustable
const RESTART_WINDOW_MS = Number(process.env.ER7_HEIMDALL_WINDOW ?? 10 * 60 * 1000);
const STEER_PORT = Number(process.env.ER7_HEIMDALL_PORT ?? 11437);
// Per-family admission cap (concurrent in-flight requests). Ollama is run
// CPU-only with OLLAMA_NUM_PARALLEL=4 (launchctl env, set 2026-09-16) so up
// to 4 requests per model genuinely run side by side instead of queuing
// invisibly behind one; the cap tracks that real capacity. 0 = unlimited.
let FAMILY_CAP = Number(process.env.ER7_FAMILY_CAP ?? 2); // runtime-adjustable
let RETRY_AFTER_S = Number(process.env.ER7_RETRY_AFTER ?? 15); // runtime-adjustable
// ── The queue, and the jump-the-cue passes (2026-09-17) ───────────────────
// A saturated box or full lane now answers with a REAL place in line, not a
// bare "try again". A bounded stock of one-use pass codes lets a caller jump
// the cue — but only a bounded ZIPPER_JUMP places, and only while the zipper
// alternation allows it: after a pass is redeemed, the next ZIPPER_DENSITY
// admissions must be pass-free, so pass-holders and everyone else merge like
// traffic at a merge — a pass train never starves the line.
let PASS_STOCK = Number(process.env.ER7_PASS_STOCK ?? 3);          // codes minted per window (runtime-adjustable)
const PASS_WINDOW_MS = Number(process.env.ER7_PASS_WINDOW ?? 15 * 60 * 1000);
let ZIPPER_JUMP = Number(process.env.ER7_ZIPPER_JUMP ?? 2);        // a pass jumps at most N places (runtime-adjustable)
let ZIPPER_DENSITY = Number(process.env.ER7_ZIPPER_DENSITY ?? 2);  // normal admissions after a pass (runtime-adjustable)
let WAITER_TTL_MS = Number(process.env.ER7_WAITER_TTL ?? 120 * 1000); // a stale waiter gives up its place (runtime-adjustable)
// ── THE SLA (2026-09-17): the longest anyone waits is tracked, committed,
// and kept as short as possible. A waiter who has been in line longer than
// the SLA is pulled to the ABSOLUTE front (longest-waiting first), so the
// guarantee is enforced by the schedule, not just reported. The target is a
// floor — Heimdall aims as short as the box allows.
let SLA_MAX_WAIT_MS = Number(process.env.ER7_SLA_MS ?? 12 * 1000); // 12s by default (user direction 2026-09-21; was 2 min) — runtime-adjustable
export function slaOverMs(w) {
  return w?.enteredAt ? Date.now() - w.enteredAt - SLA_MAX_WAIT_MS : 0;
}
export function slaDisclosure() {
  const now = Date.now();
  const waits = [...waiters.values()].map((w) => ({ waitS: Math.max(0, Math.round((now - (w.enteredAt ?? now)) / 1000)) }));
  const longest = waits.length ? Math.max(...waits.map((w) => w.waitS)) : 0;
  return {
    targetS: Math.round(SLA_MAX_WAIT_MS / 1000),
    longestWaitS: longest,
    over: longest > SLA_MAX_WAIT_MS / 1000,
    rule: `the longest anyone waits is tracked and enforced, round-robin: a waiter past ${Math.round(SLA_MAX_WAIT_MS / 1000)}s is pulled to the front, but the SLA lane and the normal lane merge one-and-one — no over-SLA train ever starves the line, and the SLA is always as short as the box allows.`,
  };
}
// Test seam — only the queue's own unit tests set this (the running proxy
// never imports it): forces admission state that live vitals cannot be
// relied on to produce inside a test process.
let _testSaturated = null;
let _testDevice = null;
let _testNow = null;
let _testVitals = null; // admission-grade vitals override (memory tests only)
const effectiveDevice = () => _testDevice ?? DEVICE_ID;
const nowMs = () => _testNow ?? Date.now();
export const __queueTest = {
  setSaturated(v) { _testSaturated = v; },
  setDevice(id) { _testDevice = id; },
  setNow(ts) { _testNow = ts; },
  setVitals(v) { _testVitals = v; },
  setOllamaModels(models) { ollamaModels = models; },
  reset() {
    waiters.clear(); lastServed.clear(); passes.length = 0; zipperLock = 0; claims.clear();
    profiles.clear(); unservable.clear(); _testSaturated = null; _testDevice = null; _testNow = null; _testVitals = null;
    ollamaModels = null;
  },
};
// ── Requestor profiles and rationing (2026-09-17) ─────────────────────────
// Every requestor gets a PROFILE — who they are, what class of work they do
// (interactive = a human waiting; batch = a background swarm), how much they
// have used in this window — and is RATIONED: a bounded number of turns per
// window per class, so no single requestor (or a whole swarm) can hog the
// box. Swarm/batch work is also queued BEHIND interactive work: it is served
// only when no human's turn is waiting.
const RATION_WINDOW_MS = Number(process.env.ER7_RATION_WINDOW ?? 15 * 60 * 1000);
const RATION_TURNS = {
  interactive: Number(process.env.ER7_RATION_TURNS_INTERACTIVE ?? 40), // a human can't outpace this
  batch: Number(process.env.ER7_RATION_TURNS_BATCH ?? 600),            // a swarm runs big, but still capped
};
const profiles = new Map(); // person -> { priority, turns, windowStart, lastAt, lastServeAt }
// Servable models — HEIMDALL'S CALL, measured against reality, not a dictum:
// a model is unservable if it is disclosed as hanging, or if it actually
// timed out recently (nothing came back). A model that PROVES it answers (a
// successful observed call) is served again — so if the box can handle a big
// model, it is welcome; if it does nothing, it is dropped until it works.
const unservable = new Map(); // model -> { at, reason }
const UNSERVABLE_COOLDOWN_MS = Number(process.env.ER7_UNSERVABLE_COOLDOWN ?? 10 * 60 * 1000);
export function markUnservable(model, reason) {
  if (!model) return;
  unservable.set(model, { at: Date.now(), reason });
  appendLog({ act: "eva", finding: "unservable", model, reason, giver: "heimdall", standing: "disclosed" });
}
export function markServable(model) {
  if (!model) return;
  unservable.delete(String(model).replace(/^er7:/, ""));
}
export function isServable(model, quirks = MODEL_QUIRKS) {
  if (!model) return false;
  const bare = String(model).replace(/^er7:/, "");
  const q = quirks?.[bare] ?? {};
  if (q?.systemRole === "hangs" || /hang/i.test(q?.note ?? "")) return false;
  const u = unservable.get(bare);
  if (u && Date.now() - u.at < UNSERVABLE_COOLDOWN_MS) return false;
  return true;
}
export function servableDisclosure() {
  return {
    cooldownS: Math.round(UNSERVABLE_COOLDOWN_MS / 1000),
    rule: "Heimdall decides what this box can serve, measured: a model disclosed as hanging, or one that actually timed out with nothing returned, is dropped from the roster until it proves it answers. If the box can handle a bigger model, it is welcome — it just has to answer.",
    unservable: [...unservable.entries()].map(([m, u]) => ({ model: m, reason: u.reason, at: u.at })),
  };
}
// Test seam — only the queue's own unit tests set this (the running proxy
// never imports it): forces admission state that live vitals cannot be
// relied on to produce inside a test process.

/** The work class of a request: a caller declares it (x-er7-priority), and
 *  the fallback guesses from the caller's name — a swarm (chapter-swarm,
 *  evals, batch readers) is batch; everything else (a human at a terminal or
 *  a page) is interactive. Batch is queued behind interactive, always. */
function priorityOf(headers = {}) {
  const declared = String(headers["x-er7-priority"] || "").trim().toLowerCase();
  if (declared === "batch" || declared === "background" || declared === "swarm") return "batch";
  if (declared === "interactive") return "interactive";
  const who = String(headers["x-er7-user"] || headers["x-er7-caller"] || headers["x-er7-session"] || "").toLowerCase();
  if (/^(swarm|chapter|eval|batch|wilson|primed|rosetta)/.test(who)) return "batch";
  return "interactive";
}

/** A requestor's profile, created on first touch and rationed per window. */
function profileOf(key, headers) {
  const now = Date.now();
  let p = profiles.get(key);
  if (!p) {
    p = { priority: priorityOf(headers), turns: 0, windowStart: now, lastAt: now, lastServeAt: 0 };
    profiles.set(key, p);
  } else if (now - p.windowStart > RATION_WINDOW_MS) {
    p.turns = 0; p.windowStart = now; // a fresh ration window
  }
  p.lastAt = now;
  return p;
}

/** Whether a requestor has spent their ration. Over-quota is a typed refusal,
 *  not a silent stall. */
function rationed(profile) {
  const cap = RATION_TURNS[profile.priority] ?? RATION_TURNS.batch;
  return profile.turns >= cap;
}

/** The ration disclosure: quotas per class and each profile's usage. */
export function rationDisclosure() {
  const now = Date.now();
  return {
    windowS: Math.round(RATION_WINDOW_MS / 1000),
    turns: RATION_TURNS,
    rule: `every requestor is profiled and rationed per ${Math.round(RATION_WINDOW_MS / 60000)} min: a human is capped at ${RATION_TURNS.interactive} turns, a background swarm at ${RATION_TURNS.batch} — and swarm work is always queued behind interactive work.`,
    profiles: [...profiles.entries()].map(([key, p]) => ({
      caller: key, priority: p.priority, turns: p.turns, cap: RATION_TURNS[p.priority] ?? RATION_TURNS.batch,
      resetInS: Math.max(0, Math.round((p.windowStart + RATION_WINDOW_MS - now) / 1000)),
    })),
  };
}
// A turn is inferred ONCE, BY ONE DEVICE AT A TIME, anywhere on the fleet —
// but the claim is a LEASE, not a permanent lock. If the claiming device
// stalls or fails, the lease is reclaimed and another device serves the turn:
// that is the recovery, and it is exactly why another device exists — to make
// up for a local delay or failure, never to duplicate the inference while the
// first device is still honestly serving.
const CLAIM_TTL_MS = Number(process.env.ER7_CLAIM_TTL ?? 5 * 60 * 1000);
const DEVICE_ID = String(process.env.ER7_DEVICE || os.hostname()).slice(0, 64);

// waiters: an ordered line, keyed by the PERSON's identity (see personKeyOf —
// a person is ONE place in line no matter how many sessions, tabs, or devices
// they pile work onto). Only WAITING people are in it: a caller who is being
// served right now is not in the line, and lastServed remembers who just got
// served so their next message re-joins BEHIND people who are still waiting.
const waiters = new Map(); // person -> { at, pass, servedAt }
const lastServed = new Map(); // person -> ts of their last serve (round-robin)
// The one-use pass stock for the current window.
const passes = []; // { code, mintedAt, redeemedAt }
let zipperLock = 0; // normal admissions still owed before another pass may jump
// Turn claims (leases), so inference is never duplicated across devices —
// and so a stalled or failed device's lease can be reclaimed by another.
const claims = new Map(); // claimId -> { device, at }

function mintPasses() {
  const now = Date.now();
  passes.forEach((p) => { if (now - p.mintedAt > PASS_WINDOW_MS) p.redeemedAt = now; }); // rotate expired
  while (passes.filter((p) => p.redeemedAt == null).length < PASS_STOCK) {
    passes.push({ code: `BIFROST-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, mintedAt: now, redeemedAt: null });
  }
}

/** The person behind a request, by precedence: a human (x-er7-user) before a
 *  device/app (x-er7-caller) before a conversation (x-er7-session). This is
 *  what "each person" means for fairness: one place in line per person, so
 *  ten tabs from one person are still one place, and a 25-message backlog is
 *  still one place. */
function personKeyOf(headers = {}) {
  return String(headers["x-er7-user"] || headers["x-er7-caller"] || headers["x-er7-session"] || "anon").slice(0, 64);
}

/** A presented pass code is honored only if it is a real, unredeemed code of
 *  the current window — anything else is a typed 400, never a silent
 *  misorder. */
function validPassCode(code, headers = {}) {
  if (!code) return null;
  return passes.find((p) => p.code === code && p.redeemedAt == null) ?? null;
}

/** The turn's claim id — the thing that must be inferred exactly once, even
 *  when the fleet spans devices. The caller tags each turn with x-er7-claim;
 *  a request without one falls back to the session. */
function claimIdOf(headers = {}) {
  return String(headers["x-er7-claim"] || headers["x-er7-session"] || "claim").slice(0, 96);
}

/** Claim the turn for this device — a LEASE, recoverable. A fresh claim held
 *  by another device is the "already being inferred elsewhere" refusal (no
 *  double inference); a claim that is stale (the other device stalled or
 *  failed — a delay THIS device exists to make up for) or already ours is
 *  taken over / confirmed. */
function claimTurn(headers = {}) {
  const id = claimIdOf(headers);
  const existing = claims.get(id);
  const now = Date.now();
  const device = effectiveDevice();
  if (existing && now - existing.at < CLAIM_TTL_MS) {
    if (existing.device !== device) return { ok: false, id, device: existing.device, stale: false };
    return { ok: true, id, device, reclaimed: false }; // a retry of our own live turn
  }
  const reclaimed = Boolean(existing && existing.device !== device);
  claims.set(id, { device, at: now });
  return { ok: true, id, device, reclaimed };
}

/** Release a claim when this device finishes or FAILS a turn, so the next
 *  device (the recovery) does not wait out the whole lease. Cross-device
 *  release is the same call on the shared ledger; locally it is immediate. */
export function releaseClaim(id) {
  const existing = claims.get(id);
  if (existing && existing.device === effectiveDevice()) claims.delete(id);
}

function pruneWaiters() {
  const now = Date.now();
  for (const [k, w] of waiters) {
    if (now - w.at > WAITER_TTL_MS) waiters.delete(k);
  }
}

/** Rank a waiter within its lane: interactive work first (a human waiting),
 *  then batch/swarm work — the swarm is always at the back of the cue. Within
 *  a lane, the round-robin holds (last-served sorts last), so a fresh caller
 *  cuts in front of a backlog. */
function laneRank([, w]) {
  return (w.priority === "batch" ? 1 : 0) * 1e12 + (w.servedAt ?? 0);
}

/** The LINE, in service order — SLA-enforced AND round-robin. A waiter past
 *  the SLA is pulled toward the front, but the SLA lane and the normal lane
 *  ZIPPER (one over-SLA, one normal, one over-SLA…), so the guarantee holds
 *  without an over-SLA train starving the line — everyone keeps moving. */
function lineOrder() {
  const normal = [...waiters.entries()]
    .filter(([, w]) => slaOverMs(w) <= 0)
    .sort((a, b) => laneRank(a) - laneRank(b));
  const over = [...waiters.entries()]
    .filter(([, w]) => slaOverMs(w) > 0)
    .sort((a, b) => slaOverMs(b[1]) - slaOverMs(a[1])); // longest past the SLA first
  const merged = [];
  for (let i = 0; i < Math.max(over.length, normal.length); i++) {
    if (i < over.length) merged.push(over[i]);
    if (i < normal.length) merged.push(normal[i]);
  }
  return merged;
}

/** A pass held for the zipper (presented while the alternation owes normal
 *  calls) is not yet eligible to serve — it blocks nobody, and the line
 *  advances past it. */
function isZipperHeld(w) {
  return Boolean(w?.pass && zipperLock > 0);
}

/** The rank of a caller among those ELIGIBLE to serve right now — a held pass
 *  is skipped, so the line keeps moving past it. Used for admission: position
 *  1 means it is genuinely your turn. */
function eligiblePositionOf(key) {
  let rank = 0;
  for (const [k, w] of lineOrder()) {
    if (isZipperHeld(w)) continue;
    rank += 1;
    if (k === key) return rank;
  }
  return 0;
}

/** A waiter's disclosed position: their rank in the line (with a held pass's
 *  ZIPPER_JUMP applied), for the queue disclosure. */
function effectivePositionOf(key) {
  const entries = lineOrder();
  const idx = entries.findIndex(([k]) => k === key);
  if (idx === -1) return 0; // not queued
  const base = idx + 1;
  const w = waiters.get(key);
  if (w?.pass && zipperLock <= 0) return Math.max(1, base - ZIPPER_JUMP);
  return base;
}

/** The zipper rule, disclosed so a caller can read why a jump was refused. */
export function zipperDisclosure() {
  mintPasses();
  return {
    stock: PASS_STOCK,
    windowS: Math.round(PASS_WINDOW_MS / 1000),
    jump: ZIPPER_JUMP,
    density: ZIPPER_DENSITY,
    lock: zipperLock,
    rule: `a pass jumps at most ${ZIPPER_JUMP} place(s); after one is redeemed the next ${ZIPPER_DENSITY} admissions are pass-free — callers merge, they do not queue-jump en masse.`,
    codes: passes.filter((p) => p.redeemedAt == null).map((p) => p.code),
    remaining: passes.filter((p) => p.redeemedAt == null).length,
    redeemed: passes.filter((p) => p.redeemedAt != null).length,
  };
}
const LOG_FILE = path.join(HERE, "heimdall-log.jsonl");

const ts = () => new Date().toISOString();
const log = (msg) => process.stderr.write(`[${ts()}] [heimdall] ${msg}\n`);

// ── THE LIVE SINK (2026-09-20): what Heimdall is seeing, broadcast ────────
// The append-only ledger is the record; the live sink is the shadow that
// rides beside it so a surface can show the watcher's acts the moment they
// land. The ledger writes FIRST — a broadcast failure never touches the
// record, and a dead sink is dropped, never fatal. The proxy subscribes
// here to serve GET /heimdall/live (a stream of the same rows the ledger
// keeps, plus status snapshots on a short cadence).
const liveSinks = new Set();
export function onLog(fn) {
  liveSinks.add(fn);
  return () => liveSinks.delete(fn);
}
// A SECOND, live-only sink (2026-09-20): real traffic that is worth showing in
// real time but NOT worth a ledger line per event — a finished call's own
// counters. The watch surface streams these so the bridge carries what really
// passed through; they are never persisted (the ledger keeps FINDINGS, not
// every call), so the record's character does not change.
const liveOnlySinks = new Set();
export function onLive(fn) {
  liveOnlySinks.add(fn);
  return () => liveOnlySinks.delete(fn);
}
export function emitLive(ev) {
  const row = { at: ts(), ...ev };
  for (const fn of liveOnlySinks) { try { fn(row); } catch {} }
}

function appendLog(entry) {
  const row = { at: ts(), ...entry };
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(row) + "\n", "utf8");
  } catch { /* the log must never crash the watcher */ }
  for (const fn of liveSinks) { try { fn(row); } catch {} }
}

export function logTail(n = 12) {
  try {
    return fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").slice(-n) : [];
  } catch { return []; }
}
/** The ledger, parsed, for a filterable view: the last n rows as objects.
 *  A `filter` ({key|surface|model|sessionId|finding}) selects one THREAD — the
 *  rows that share an identity — so a reader can pull the whole story. */
export function logLines(n = 400, filter = null) {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const all = fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").filter(Boolean);
    const take = Math.max(1, Math.min(8000, Number(n) || 400));
    let arr = all.slice(-take).map((l) => { try { return JSON.parse(l); } catch { return { at: null, act: "?", raw: l }; } });
    if (filter && typeof filter === "object") {
      const eq = (a, b) => String(a ?? "") === String(b ?? "");
      arr = arr.filter((r) =>
        (!filter.key || eq(r.key, filter.key)) &&
        (!filter.surface || eq(r.surface, filter.surface)) &&
        (!filter.model || eq(r.model, filter.model)) &&
        (!filter.sessionId || eq(r.sessionId, filter.sessionId)) &&
        (!filter.finding || eq(r.finding, filter.finding)));
    }
    return arr;
  } catch { return []; }
}

// ── MEMORY: the ledger is not infinite ─────────────────────────────────────
// Every act lands on the ledger, but a ledger that keeps every raw line
// forever is a memory that grows without bound — by 2026-09-19 the vitals
// rows alone (one ~every tick) were already MBs of forever. The law of this
// daemon's memory: SNAPSHOT, then TRIM, with HIGHER RESOLUTION FOR THE MORE
// RECENT PAST. The ledger keeps the recent past raw (full resolution); past
// the raw horizon the lines FOLD into hourly snapshots (what happened, how
// often, what the box measured — the pheromone trail preserved, the bytes
// returned); past the warm horizon the hourly snapshots fold into daily ones
// (coarser still); past the cold horizon the memory is released. The swarm
// that "learns its own rules from its own recorded history" (the rule-author
// holon) reads through the same fold, so trimming never blinds the learner —
// the finding-counts survive even when the verbatim lines are gone.
//
// The walls (this project's own law, applied to the trim):
//   - A fold NEVER loses a finding the learner counts on: counts, first/last
//     bounds, the act breakdown, vitals min/max/last, and the lesson notes'
//     text all survive; only the verbatim redundancy is returned.
//   - A line that cannot be aged (no parseable `at`) is NEVER folded — it
//     stays raw, because folding it would be guessing its age.
//   - The consolidation is synchronous and atomic (write-tmp-rename), so a
//     live appendLog can never interleave into a half-trimmed log.
//   - A consolidation failure NEVER takes the watcher down; it is skipped
//     and retried next cadence.
const MEMORY_FILE = path.join(HERE, "state", "heimdall-memory.json");
const RAW_HORIZON_MS = Number(process.env.ER7_HEIMDALL_RAW_HORIZON ?? 6 * 60 * 60 * 1000);         // full-resolution recent past
const WARM_HORIZON_MS = Number(process.env.ER7_HEIMDALL_WARM_HORIZON ?? 7 * 24 * 60 * 60 * 1000);  // hourly snapshots kept this long
const COLD_HORIZON_MS = Number(process.env.ER7_HEIMDALL_COLD_HORIZON ?? 90 * 24 * 60 * 60 * 1000); // daily snapshots kept this long
const CONSOLIDATE_MS = Number(process.env.ER7_HEIMDALL_CONSOLIDATE ?? 15 * 60 * 1000);
const SNAPSHOT_NOTES_CAP = Number(process.env.ER7_HEIMDALL_SNAPSHOT_NOTES ?? 50);

const hourKeyOf = (at) => new Date(Math.floor(at / 3600000) * 3600000).toISOString();
const dayKeyOf = (at) => new Date(Math.floor(at / 86400000) * 86400000).toISOString();

const emptyBucket = () => ({ findings: {}, acts: {}, vitals: { rows: 0, saturated: 0, slowPaused: 0, by: {} }, notes: [] });

// Fold ONE ledger entry into a snapshot bucket. The finding survives as a
// counted class (the shape the rule-author holon counts); a vitals row folds
// to per-metric min/max/last (never every row); a lesson note keeps its text
// (bounded per bucket, most recent kept).
function foldEntryInto(b, e, at) {
  const cls = e.finding ?? e.class ?? null;
  if (cls) {
    const probe = e.model ?? e.probe ?? e.surface ?? null;
    const fkey = `${cls}:${probe ?? "-"}`;
    const f = b.findings[fkey] ?? { class: cls, probe, count: 0, first: at, last: at };
    f.count += 1;
    f.first = Math.min(f.first, at);
    f.last = Math.max(f.last, at);
    b.findings[fkey] = f;
  }
  const act = e.act ?? "?";
  b.acts[act] = (b.acts[act] ?? 0) + 1;
  if (e.kind === "vitals") {
    b.vitals.rows += 1;
    if (e.saturated) b.vitals.saturated += 1;
    if (e.slowPaused) b.vitals.slowPaused += 1;
    for (const k of ["load1", "load5", "load15", "cpuUser", "cpuSys", "cpuIdle", "gpuUtil", "ollamaCpu", "ollamaMemMb", "memFreeMb", "memInactiveMb"]) {
      const v = e[k];
      if (!Number.isFinite(v)) continue;
      const s = b.vitals.by[k] ?? { min: v, max: v, last: v };
      s.min = Math.min(s.min, v);
      s.max = Math.max(s.max, v);
      s.last = v;
      b.vitals.by[k] = s;
    }
  }
  if (e.act === "note" && typeof e.note === "string" && e.note) {
    b.notes.push({ at: e.at, note: e.note });
    if (b.notes.length > SNAPSHOT_NOTES_CAP) b.notes = b.notes.slice(b.notes.length - SNAPSHOT_NOTES_CAP);
  }
}

/** Merge two snapshot buckets additively (the same hour/day heard twice is
 *  one act, counts summed, bounds widened, notes kept to the cap). */
export function mergeMemoryBuckets(a = emptyBucket(), b = emptyBucket()) {
  const out = emptyBucket();
  for (const bkt of [a, b]) {
    for (const [fkey, f] of Object.entries(bkt.findings ?? {})) {
      const m = out.findings[fkey] ?? { class: f.class, probe: f.probe, count: 0, first: f.first, last: f.last };
      m.count += f.count;
      m.first = Math.min(m.first, f.first);
      m.last = Math.max(m.last, f.last);
      out.findings[fkey] = m;
    }
    for (const [act, n] of Object.entries(bkt.acts ?? {})) out.acts[act] = (out.acts[act] ?? 0) + n;
    const v = bkt.vitals ?? {};
    out.vitals.rows += v.rows ?? 0;
    out.vitals.saturated += v.saturated ?? 0;
    out.vitals.slowPaused += v.slowPaused ?? 0;
    for (const [k, s] of Object.entries(v.by ?? {})) {
      const m = out.vitals.by[k] ?? { min: s.min, max: s.max, last: s.last };
      m.min = Math.min(m.min, s.min);
      m.max = Math.max(m.max, s.max);
      m.last = s.last;
      out.vitals.by[k] = m;
    }
    out.notes = [...out.notes, ...(bkt.notes ?? [])].slice(-SNAPSHOT_NOTES_CAP);
  }
  return out;
}

/** The fold, pure and testable: partition ledger lines by age into what
 *  stays RAW (younger than the raw horizon — full resolution), what folds
 *  into an HOUR bucket (past raw, within warm), what folds into a DAY bucket
 *  (past warm, within cold), and what is RELEASED (past cold — the memory is
 *  not infinite). Lines that cannot be aged stay raw. */
export function foldMemoryLines(lines, { now = Date.now(), rawHorizonMs = RAW_HORIZON_MS, warmHorizonMs = WARM_HORIZON_MS, coldHorizonMs = COLD_HORIZON_MS } = {}) {
  const rawCut = now - rawHorizonMs;
  const warmCut = now - warmHorizonMs;
  const coldCut = now - coldHorizonMs;
  const keep = [];
  const hourly = new Map();
  const daily = new Map();
  for (const line of lines) {
    if (typeof line !== "string" || !line.trim()) continue;
    let e; try { e = JSON.parse(line); } catch { keep.push(line); continue; }
    const at = Number.isFinite(e?.at) ? e.at : (e?.at ? Date.parse(e.at) : NaN);
    if (!Number.isFinite(at)) { keep.push(line); continue; } // unaged stays raw — never guess an age
    if (at >= rawCut) { keep.push(line); continue; }         // recent past: full resolution
    if (at < coldCut) continue;                              // past the cold horizon: released
    const target = at >= warmCut ? hourly : daily;
    const key = at >= warmCut ? hourKeyOf(at) : dayKeyOf(at);
    const b = target.get(key) ?? emptyBucket();
    foldEntryInto(b, e, at);
    target.set(key, b);
  }
  return { keep, hourly: [...hourly.entries()], daily: [...daily.entries()] };
}

/** A consolidation seam: fold + store + trim against ANY log/memory files
 *  (the daemon uses its real paths; tests use a temp dir). */
export function makeMemoryConsolidator({ logFile, memoryFile, rawHorizonMs = RAW_HORIZON_MS, warmHorizonMs = WARM_HORIZON_MS, coldHorizonMs = COLD_HORIZON_MS, now = Date.now, log = () => {} } = {}) {
  const nowFn = typeof now === "function" ? now : () => now;
  const readLogLines = () => {
    if (!fs.existsSync(logFile)) return [];
    return fs.readFileSync(logFile, "utf8").split("\n").filter((l) => l.trim());
  };
  const readStore = () => {
    try {
      const d = JSON.parse(fs.readFileSync(memoryFile, "utf8"));
      return { schema: "EOHeimdallMemory@1", consolidatedAt: d.consolidatedAt ?? null, hourly: d.hourly ?? {}, daily: d.daily ?? {} };
    } catch {
      return { schema: "EOHeimdallMemory@1", consolidatedAt: null, hourly: {}, daily: {} };
    }
  };
  const saveStore = (store) => {
    fs.mkdirSync(path.dirname(memoryFile), { recursive: true });
    const tmp = `${memoryFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
    fs.renameSync(tmp, memoryFile);
  };
  const writeLog = (keep) => {
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    const tmp = `${logFile}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, keep.join("\n") + (keep.length ? "\n" : ""));
    fs.renameSync(tmp, logFile);
  };
  const fold = (lines, opts = {}) => foldMemoryLines(lines, { now: nowFn(), rawHorizonMs, warmHorizonMs, coldHorizonMs, ...opts });
  const consolidate = () => {
    const at = nowFn();
    try {
      const raw = readLogLines();
      const { keep, hourly, daily } = fold(raw);
      const store = readStore();
      for (const [k, b] of hourly) store.hourly[k] = mergeMemoryBuckets(store.hourly[k], b);
      for (const [k, b] of daily) store.daily[k] = mergeMemoryBuckets(store.daily[k], b);
      // Promote: an hourly bucket that aged past the warm horizon folds into
      // its day (the coarser tier) and leaves the finer one.
      const warmCut = at - warmHorizonMs;
      for (const [k, b] of Object.entries(store.hourly)) {
        const bAt = Date.parse(k);
        if (Number.isFinite(bAt) && bAt < warmCut) {
          store.daily[dayKeyOf(bAt)] = mergeMemoryBuckets(store.daily[dayKeyOf(bAt)], b);
          delete store.hourly[k];
        }
      }
      // Release: past the cold horizon the memory is not infinite.
      const coldCut = at - coldHorizonMs;
      for (const [k] of Object.entries(store.hourly)) if (Number.isFinite(Date.parse(k)) && Date.parse(k) < warmCut) delete store.hourly[k];
      for (const [k] of Object.entries(store.daily)) if (Number.isFinite(Date.parse(k)) && Date.parse(k) < coldCut) delete store.daily[k];
      store.consolidatedAt = new Date(at).toISOString();
      saveStore(store);
      const trimmed = keep.length !== raw.length;
      if (trimmed) writeLog(keep);
      return { folded: raw.length - keep.length, kept: keep.length, trimmed, hourly: Object.keys(store.hourly).length, daily: Object.keys(store.daily).length, at: store.consolidatedAt };
    } catch (err) {
      log(`memory consolidate failed: ${err.message}`);
      return { folded: 0, kept: 0, trimmed: false, hourly: 0, daily: 0, error: err.message };
    }
  };
  // The read path the learner uses: raw recent lines + synthetic snapshot
  // lines for buckets overlapping the span — each snapshot line carries its
  // folded `count` and first/last, so a long window over a trimmed history
  // still counts what happened.
  const linesForWindow = (n = 4000, spanMs = DERIVED_WINDOW_MS, at = nowFn()) => {
    const raw = readLogLines().filter((l) => l.trim()).slice(-n);
    const out = [...raw];
    const from = at - spanMs;
    const store = readStore();
    for (const tier of ["hourly", "daily"]) {
      for (const [k, b] of Object.entries(store[tier] ?? {})) {
        const bAt = Date.parse(k);
        if (!Number.isFinite(bAt)) continue;
        for (const [fkey, f] of Object.entries(b.findings ?? {})) {
          if (!(f.last >= from)) continue; // bucket ends before the window: nothing to count
          out.push(JSON.stringify({
            act: "snapshot", tier, bucket: k, finding: f.class, probe: f.probe,
            count: f.count, first: new Date(f.first).toISOString(), last: new Date(f.last).toISOString(),
            at: new Date(f.last).toISOString(),
          }));
        }
      }
    }
    return out.slice(-n);
  };
  const disclosure = () => {
    const store = readStore();
    let rawLines = 0, rawBytes = 0;
    try { const txt = fs.readFileSync(logFile, "utf8"); rawLines = txt.split("\n").filter((l) => l.trim()).length; rawBytes = txt.length; } catch { /* unreadable log: report 0, never guess */ }
    return {
      schema: "EOHeimdallMemory@1",
      consolidatedAt: store.consolidatedAt ?? null,
      rawHorizonMs, warmHorizonMs, coldHorizonMs, consolidateMs: CONSOLIDATE_MS,
      rawLines, rawBytes,
      hourlyBuckets: Object.keys(store.hourly).length,
      dailyBuckets: Object.keys(store.daily).length,
      rule: "the ledger is not infinite: recent past stays verbatim, older past folds to hourly then daily snapshots (counts, vitals min/max/last, and lesson notes survive the fold), and past the cold horizon the memory is released — higher resolution for the more recent past",
    };
  };
  return { fold, consolidate, readStore, linesForWindow, disclosure };
}

const memory = makeMemoryConsolidator({ logFile: LOG_FILE, memoryFile: MEMORY_FILE, now: () => _testNow ?? Date.now() });
let lastConsolidateAt = 0; // first tick consolidates, then every CONSOLIDATE_MS
export const consolidateMemory = () => memory.consolidate();
export const memoryDisclosure = () => memory.disclosure();
/** The learner's read: raw recent lines + folded snapshot lines for the span. */
export const memoryLinesForWindow = (n = 4000, spanMs = DERIVED_WINDOW_MS) => memory.linesForWindow(n, spanMs);

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
      // model the reader surfaces), the three the-fold proxies, and the fold
      // chat server itself (serve.mjs :8811) — the surface the page loads
      // from, whose /heimdall also folds in the page's own browser-side
      // connection vitals (2026-09-13), so a watcher that cannot see inside
      // a browser still sees the page's engine and its Matrix room tie.
      { name: "er7", port: 11436, cwd: HERE, cmd: "node proxy.mjs" },
      { name: "fold-chat", port: 8811, cwd: "/Users/mlacy/Documents/3.0/the-fold", cmd: "node serve.mjs" },
      { name: "fold-8812", port: 8812, cwd: "/Users/mlacy/Documents/3.0/the-fold", cmd: "node explore-server.mjs" },
      { name: "fold-8819", port: 8819, cwd: "/Users/mlacy/Documents/3.0/the-fold", cmd: "node explore-server.mjs 8819" },
      { name: "fold-8837", port: 8837, cwd: "/Users/mlacy/Documents/3.0/the-fold", cmd: "node explore-server.mjs 8837" },
    ];

const FAMILY_OF = (surfaceName) =>
  (String(process.env.ER7_SURFACE_FAMILIES ?? "").trim()
    ? Object.fromEntries(String(process.env.ER7_SURFACE_FAMILIES).trim().split(/\s+/).filter(Boolean).map((kv) => kv.split(":")))
    : { er7: "er7", "fold-chat": "fold", "fold-8812": "fold", "fold-8819": "fold", "fold-8837": "fold" })[surfaceName] ?? "any";

// A surface declares its own HEALTH PATH — the endpoint that tells the truth
// about it. The er7 proxy answers /health; the-fold's explore-server does
// not, and probing /health there is a false conviction (404 reads "down"
// when the surface is fine). The research rule that shapes this: a probe
// that cannot reach the real check is itself a bug — it false-fails.
const HEALTH_PATH_OF = (surfaceName) =>
  (String(process.env.ER7_SURFACE_HEALTH ?? "").trim()
    ? Object.fromEntries(String(process.env.ER7_SURFACE_HEALTH).trim().split(/\s+/).filter(Boolean).map((kv) => kv.split(":")))
    : { er7: "/health", "fold-chat": "/health", "fold-8812": "/v1/models", "fold-8819": "/v1/models", "fold-8837": "/v1/models" })[surfaceName] ?? "/health";

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
  // ACTIVITY (2026-09-21): what is going through THIS server — turns begun
  // and finished, turns in flight, when it last moved, and the characters
  // written in the last window. The proxy attributes every turn to the
  // surface that asked (the page's origin port), so a fold page's traffic
  // reads on the fold's span, not on er7's.
  activity: { calls: 0, turns: 0, lastAt: null, samples: [] },
}));

// The surface this watcher IS, when imported into the proxy: its own port is
// watched for status but never re-forged (a proxy cannot spawn a duplicate of
// itself). null when running standalone.
let selfPort = null;
export const getSurfaces = () => surfaces;

/** The registered surface listening on a port, or null. The proxy maps a
 *  request's Origin/Referer port here so traffic is attributed to the
 *  server whose page sent it — mechanically, never declared. */
export function surfaceByPort(port) {
  const n = Number(port);
  if (!Number.isFinite(n)) return null;
  return surfaces.find((s) => s.port === n) ?? null;
}

const ACTIVITY_WINDOW_MS = 8000;
/** Land one activity event on a surface: "begin" (a turn started), "chars"
 *  (n characters written), "end" (a turn finished). Unknown names land on
 *  nothing — a surface not registered is not measured, never guessed. */
export function noteSurfaceActivity(name, phase, { chars = 0 } = {}) {
  const s = surfaces.find((x) => x.name === name);
  if (!s) return null;
  const a = s.activity;
  const now = Date.now();
  a.lastAt = now;
  if (phase === "begin") { a.turns += 1; a.calls += 1; }
  else if (phase === "end") { a.turns = Math.max(0, a.turns - 1); }
  else if (phase === "chars" && chars > 0) {
    a.samples.push({ at: now, chars });
    if (a.samples.length > 400) a.samples.splice(0, a.samples.length - 400);
  }
  return a;
}
function activityDisclosure(s) {
  const a = s.activity;
  const now = Date.now();
  a.samples = a.samples.filter((x) => x.at > now - ACTIVITY_WINDOW_MS);
  const chars = a.samples.reduce((n, x) => n + x.chars, 0);
  const span = a.samples.length ? now - a.samples[0].at : 0;
  return {
    calls: a.calls,
    inflight: a.turns + s.inflight,
    lastAt: a.lastAt ? new Date(a.lastAt).toISOString() : null,
    idleS: a.lastAt ? Math.round((now - a.lastAt) / 1000) : null,
    charsPerS: span > 0 ? Math.round((chars * 1000) / span) : 0,
    moving: a.turns > 0 || s.inflight > 0 || (a.lastAt != null && now - a.lastAt < 3000),
  };
}
export const markInflight = (name, delta) => {
  const s = surfaces.find((x) => x.name === name);
  if (s) s.inflight = Math.max(0, s.inflight + delta);
  return s?.inflight ?? 0;
};

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
  // Capture the child's own stdout/stderr to state/reforge-<name>.log — a
  // re-forge that dies silently (a bad cwd, a wrong arg, an instant exit) is
  // otherwise invisible, which is exactly the fold-8819/8837 mystery: the
  // spawn happens and nothing listens. The death is now on the record.
  let out = "ignore";
  try { fs.mkdirSync(path.join(HERE, "state"), { recursive: true }); out = fs.openSync(path.join(HERE, "state", `reforge-${surf.name}.log`), "a"); } catch { /* fall back to ignore */ }
  const [cmd0, ...rest] = surf.cmd.split(/\s+/);
  let child;
  try { child = spawn(cmd0, rest, { cwd: surf.cwd, env, detached: true, stdio: out === "ignore" ? "ignore" : ["ignore", out, out] }); }
  catch (err) { appendLog({ act: "eva", finding: "reforge_spawn_error", surface: surf.name, error: err.message }); return; }
  child.on("error", (err) => appendLog({ act: "eva", finding: "reforge_spawn_error", surface: surf.name, error: err.message }));
  child.on("exit", (code, signal) => appendLog({ act: "eva", finding: "reforge_child_exit", surface: surf.name, pid: child.pid, code, signal: signal ?? null, cmd: surf.cmd }));
  child.unref();
}

// ── MANUAL RESTART — the operator asks, by name (2026-09-20) ──────────────
// The same REC the watcher runs on a measured breakdown, now on the
// operator's word. The SAME walls hold: never the self (a proxy cannot
// re-forge itself), and never a restart storm (bounded per window — the
// storm is itself a finding, so a person cannot make a loop of it either).
// Every manual re-forge lands on the ledger, tagged as such.
export function restartSurface(name) {
  const surf = surfaces.find((s) => s.name === String(name ?? "").trim());
  if (!surf) return { ok: false, error: `no such surface: ${name}` };
  if (selfPort != null && surf.port === selfPort) return { ok: false, error: `${surf.name} is this proxy itself — a proxy cannot re-forge itself; restart the process` };
  const now = Date.now();
  surf.restartTimes = surf.restartTimes.filter((t) => now - t < RESTART_WINDOW_MS);
  if (surf.restartTimes.length >= MAX_RESTARTS) {
    return { ok: false, error: `restart storm: ${surf.restartTimes.length} in ${Math.round(RESTART_WINDOW_MS / 60000)}min — refusing (raise maxRestarts to allow more)` };
  }
  surf.restartTimes.push(now);
  reforgeSurface(surf);
  appendLog({ act: "rec", finding: "manual_restart", surface: surf.name, cmd: surf.cmd, key: "operator", giver: "heimdall", standing: "disclosed" });
  return { ok: true, surface: surf.name, cmd: surf.cmd, restartsInWindow: surf.restartTimes.length, note: `re-forging ${surf.name} — ${surf.cmd}` };
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

// ── MEMORY HEADROOM (2026-09-19, learned the hard way) ───────────────────────
// Three large-model loads hung tonight (qwen3:4b abort→cascade, 14B-Q4 120s
// timeout, coder:7b 420s timeout) while the daemon itself answered a resident
// model in 2.7s — the box was not down, it had ~47MB free pages: no room to
// LOAD anything big. CPU idle said "fine"; memory said "full". So the watcher
// reads memory too: vm_stat pages free (+ speculative) in MB. Inactive pages
// (file cache) are reported separately — reclaimable, but reclaiming 5GB
// under pressure is itself a stall, so the pressure signal reads FREE only.
// Floor env: ER7_MEM_FLOOR_MB (default 512 — below this, no large load lands).
let MEM_FLOOR_MB = Number(process.env.ER7_MEM_FLOOR_MB ?? 512); // runtime-adjustable
let SWAP_CEIL_PCT = Number(process.env.ER7_SWAP_CEIL ?? 85); // swap above this is a concern (runtime-adjustable)
let MEM_GATE_ON = (process.env.ER7_MEM_GATE ?? "1") !== "0"; // runtime-adjustable
async function collectMemHeadroom() {
  const out = await execOut("vm_stat", [], 3000);
  if (!out) return { memFreeMb: null, memInactiveMb: null };
  const page = /page size of (\d+) bytes/.exec(out);
  const num = (name) => {
    const m = new RegExp(`${name}:\\s*([\\d.]+)\\.`).exec(out);
    return m ? Number(m[1]) : null;
  };
  const pageBytes = page ? Number(page[1]) : 16384;
  const toMb = (pages) => pages == null ? null : Math.round(pages * pageBytes / 1048576);
  const free = num("Pages free");
  const speculative = num("Pages speculative");
  const inactive = num("Pages inactive");
  const compressor = num("Pages occupied by compressor");
  const swapins = num("Swapins");
  const swapouts = num("Swapouts");
  return {
    memFreeMb: toMb(free == null ? null : free + (speculative ?? 0)),
    memInactiveMb: toMb(inactive),
    memAvailableMb: toMb((free ?? 0) + (speculative ?? 0) + (inactive ?? 0)),
    memCompressorMb: toMb(compressor),
    swapInPages: swapins,
    swapOutPages: swapouts,
  };
}
// SWAP CHURN — the LIVE signal. A high swap LEVEL is history (macOS never
// moves pages back on its own); swap OUT pages per second is whether the box
// is thrashing RIGHT NOW. High and flat is fine; churn is what costs.
let _swapPrev = null;
function swapRates(swapIn, swapOut) {
  const now = Date.now();
  let inPerS = null, outPerS = null;
  if (_swapPrev && swapIn != null && swapOut != null) {
    const dt = Math.max(0.5, (now - _swapPrev.at) / 1000);
    inPerS = Math.max(0, Math.round(((swapIn - _swapPrev.in) / dt) * 10) / 10);
    outPerS = Math.max(0, Math.round(((swapOut - _swapPrev.out) / dt) * 10) / 10);
  }
  if (swapIn != null && swapOut != null) _swapPrev = { in: swapIn, out: swapOut, at: now };
  return { inPerS, outPerS };
}
let SWAP_CHURN_PPS = Number(process.env.ER7_SWAP_CHURN_PPS ?? 100); // pages/s out = thrashing (runtime-adjustable)
// Swap is the honest pressure signal on macOS: "free" is always low (the OS
// keeps cache), but swap filling up means the box is THRASHING — that is what
// "maxed out" looks like, and why load is high while CPU sits idle.
async function readSwap() {
  const out = await execOut("sysctl", ["-n", "vm.swapusage"], 3000);
  if (!out) return {};
  const total = Number((/total = ([\d.]+)M/.exec(out) || [])[1]);
  const used = Number((/used = ([\d.]+)M/.exec(out) || [])[1]);
  if (!Number.isFinite(total) || !Number.isFinite(used)) return {};
  return { swapTotalMb: Math.round(total), swapUsedMb: Math.round(used), swapPct: Math.round((100 * used) / Math.max(1, total)) };
}
/** WHY memory reads pressured — the label must name the test that fired,
 *  never the stale swap level (the holon's old label printed "swap 97%" for
 *  a churn conviction and read as a level conviction). */
export function memoryPressureReason(vitals, floorMb = MEM_FLOOR_MB) {
  if (!vitals) return null;
  const churn = vitals.swapOutPerS ?? null;
  if (churn != null && churn >= SWAP_CHURN_PPS) return `thrashing: ${Math.round(churn)} pages/s swapped out (ceiling ${SWAP_CHURN_PPS})`;
  const avail = vitals.memAvailableMb ?? vitals.memFreeMb;
  if (avail != null && avail < floorMb) return `only ${avail}MB usable, floor ${floorMb}MB`;
  const free = vitals.memFreeMb ?? null;
  if (free != null && free < 256) return `only ${free}MB truly free`;
  return null;
}
export function memoryPressured(vitals, floorMb = MEM_FLOOR_MB) {
  if (!vitals) return false; // unknown is never a conviction
  // SWAP LEVEL is a stale watermark on macOS (it drains only on reboot) — a
  // box that once peaked reads "full" forever. The live signal is CHURN
  // (pages swapped out per second): high and flat is fine; thrashing is what
  // costs. Convicting on the level alone stood the residency holon down for
  // days and refused every non-resident load on a healthy box, so every
  // evicted model paid a cold load — measured: calls 500'd with "fetch
  // failed" while the daemon answered the same resident model in 1.3s.
  const churn = vitals.swapOutPerS ?? null;
  if (churn != null && churn >= SWAP_CHURN_PPS) return true;
  // Judge on AVAILABLE memory (free + reclaimable inactive), never on "free"
  // alone — free excludes the cache the box can give back on demand.
  const avail = vitals.memAvailableMb ?? vitals.memFreeMb;
  if (avail != null && avail < floorMb) return true;
  // Truly out of free pages is still admission-grade (the 2026-09-19 lesson:
  // a 9GB load with ~47MB free hung 120s+ — reclaimable cache was not free
  // enough to load into).
  const free = vitals.memFreeMb ?? null;
  if (free != null && free < 256) return true;
  return false;
}

async function collectFastVitals() {
  const v = { load1: null, load5: null, load15: null, ollamaCpu: null, ollamaMemMb: null, ollamaPid: null, memFreeMb: null, memInactiveMb: null };
  const load = await execOut("sysctl", ["-n", "vm.loadavg"], 2000);
  if (load) {
    const [l1, l5, l15] = load.replace(/[{}]/g, "").trim().split(/\s+/).map(Number);
    v.load1 = l1; v.load5 = l5; v.load15 = l15;
  }
  // THE RUNNER IS NOT ALWAYS CALLED llama-server (fixed 2026-09-15). This read
  // was `pgrep -f llama-server`, and every vitals row this watcher ever wrote
  // carried `ollamaPid: null` — not because Ollama was idle, but because that
  // name only matches ONE of the two installs on this box: the Ollama.app
  // runner is `…/Resources/llama-server`, while the Homebrew server (the one
  // actually serving :11434 as of 14:01 today) re-execs ITSELF as the runner,
  // `/opt/homebrew/Cellar/ollama/…/libexec/ollama`, which that pattern can
  // never match. So the process is found by what it DOES rather than by what
  // it is called: among everything whose command line names ollama or
  // llama-server, the runner is the one holding the weights — the largest
  // resident set. No match is a typed null, as before.
  const table = await execOut("ps", ["-Ao", "pid=,rss=,%cpu=,args="], 3000);
  if (table) {
    let best = null;
    for (const row of table.split("\n")) {
      const m = /^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(.*)$/.exec(row);
      if (!m) continue;
      const args = m[4];
      if (!/ollama|llama-server/i.test(args) || /pgrep|grep /.test(args)) continue;
      const rss = Number(m[2]);
      if (!best || rss > best.rss) best = { pid: Number(m[1]), rss, cpu: Number(m[3]) };
    }
    if (best) {
      v.ollamaPid = best.pid;
      v.ollamaCpu = best.cpu;
      v.ollamaMemMb = Math.round(best.rss / 1024);
    }
  }
  // Memory headroom rides the fast tier (one vm_stat, ~instant): the lesson
  // of 2026-09-19 is that CPU idle can read "fine" while no large load can
  // land. A failed read is typed nulls, never a blocker.
  try {
    const mem = await collectMemHeadroom();
    v.memFreeMb = mem.memFreeMb;
    v.memInactiveMb = mem.memInactiveMb;
    v.memAvailableMb = mem.memAvailableMb;
    v.memCompressorMb = mem.memCompressorMb;
    v.swapInPages = mem.swapInPages; v.swapOutPages = mem.swapOutPages;
    const r = swapRates(mem.swapInPages, mem.swapOutPages);
    v.swapInPerS = r.inPerS; v.swapOutPerS = r.outPerS;
    Object.assign(v, await readSwap());
  } catch { /* keep last good */ }
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
export const isBoxSaturated = boxSaturated;

// ── DISCLOSURE: what a user actually wants to know. CPU/GPU BANDWIDTH is
// the free headroom, not the raw number: how much of each is NOT busy right
// now. ETA is a count of work ahead scaled by a measured per-turn time —
// never a promise, always an honest estimate ("~N request(s) ahead, each
// roughly M seconds").
let lastTurnMs = 20000; // seed: a realistic single turn until real ones land
let lastTurnActualMs = null; // the last MEASURED prompt→response wall time (this door)
let turnSamples = 0;
const TURN_MS_SEED = 20000;
const TURN_MS_FLOOR = 5000;
export function recordTurnMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  lastTurnActualMs = Math.round(ms);
  turnSamples++;
  lastTurnMs = Math.round(0.6 * lastTurnMs + 0.4 * ms); // EWMA
}
function etaFor(workAhead) {
  if (workAhead <= 0) return { ahead: 0, etaMs: 0, perTurnMs: lastTurnMs };
  return { ahead: workAhead, etaMs: Math.round(workAhead * lastTurnMs), perTurnMs: lastTurnMs };
}
// The disclosure object every surface /heimdall and every thinking block can
// read: the box's breathing room, in plain numbers.
export function disclosure() {
  const v = cachedVitals() ?? {};
  const cpuBusy = v.cpuIdle == null ? null : Math.round(100 - v.cpuIdle);
  const gpuBusy = v.gpuUtil; // device utilization % — the GPU's actual load
  const workAhead = surfaces.reduce((a, s) => a + s.inflight, 0) + waiters.size;
  const eta = etaFor(workAhead);
  return {
    at: ts(),
    cpu: cpuBusy == null ? { busy: null, idle: null, note: "not measured yet" } : { busy: cpuBusy, idle: Math.round(v.cpuIdle) },
    gpu: gpuBusy == null ? { busy: null, note: "not measured yet" } : { busy: gpuBusy, idle: Math.round(100 - gpuBusy) },
    load: v.load1 ?? null,
    queue: {
      workAhead,
      perTurnMs: eta.perTurnMs,
      lastMs: lastTurnActualMs,
      samples: turnSamples,
      etaMs: eta.etaMs,
      etaHuman: eta.etaMs ? `${Math.round(eta.etaMs / 1000)}s` : "now",
      // the live line, head first — who is waiting and where each sits
      positions: [...waiters.keys()].map((k) => ({ caller: k, position: effectivePositionOf(k) })),
    },
    // multi-device: which device is serving, what turns are claimed (inferred
    // once, by one device at a time), and how a stalled or failed device's
    // lease is reclaimed so another device makes up the delay.
    device: DEVICE_ID,
    claims: [...claims.entries()].map(([id, c]) => ({ id, device: c.device, ageS: Math.round((Date.now() - c.at) / 1000) })),
    recovery: {
      leaseS: Math.round(CLAIM_TTL_MS / 1000),
      rule: `a turn is inferred once, by one device at a time; if that device stalls or fails, its lease is reclaimed and another device serves the turn — the other device exists to make up the delay, never to double the inference.`,
    },
    zipper: zipperDisclosure(),
    // profiles and rations: who is calling, what class, how much they've used
    rationing: rationDisclosure(),
    // the SLA: the longest anyone is waiting, and whether the box is holding it
    sla: slaDisclosure(),
    // which models Heimdall will actually let the box serve (measured, not dictated)
    servable: servableDisclosure(),
    // memory headroom: the 2026-09-19 lesson — CPU idle can read "fine"
    // while no large load can land (~47MB free hung three loads in a row).
    memory: {
      freeMb: v.memFreeMb ?? null,
      inactiveMb: v.memInactiveMb ?? null,
      availableMb: v.memAvailableMb ?? null,
      compressorMb: v.memCompressorMb ?? null,
      swapUsedMb: v.swapUsedMb ?? null,
      swapTotalMb: v.swapTotalMb ?? null,
      swapPct: v.swapPct ?? null,
      swapInPerS: v.swapInPerS ?? null,
      swapOutPerS: v.swapOutPerS ?? null,
      swapChurnCeil: SWAP_CHURN_PPS,
      thrashing: v.swapOutPerS != null && v.swapOutPerS >= SWAP_CHURN_PPS,
      floorMb: MEM_FLOOR_MB,
      swapCeilPct: SWAP_CEIL_PCT,
      pressured: memoryPressured(v),
      rule: `a model that is not already resident is refused fast (typed 503, never a hang) while free pages sit below ${MEM_FLOOR_MB}MB — a load attempted there hung for 120–420s (large) and ~290s in total silence (gemma2:2b evict-and-swap) and poisoned the session behind it. Size is no exemption: any load evicts.`,
    },
    // the fast pass: remote mouths never wait for the local box
    fastPass: {
      rule: "a remote mouth (Anthropic's own API, the opencode server) never touches this box — no VRAM, no reload — so it skips saturation, the family cap, and the queue. Ration, servable, and exactly-once claim still apply.",
      ungated: UNGATED_SUBSTRINGS,
    },
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
  if (_testVitals) return { ..._testVitals }; // admission-grade test override
  return vitalsCache ? { ...vitalsCache, ...vitalsSlowCache } : null; // never spawns
}
export const readVitals = cachedVitals;
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

// ── THE MODELS ON THE BRIDGE: which model is loaded, at which window ──────
// The watcher could see the box (load, CPU, GPU) and every surface, and could
// NOT see the one fact that decides what a prompt costs and whether it fits:
// the context window Ollama actually loaded a model at. Measured on this box
// 2026-09-15: gemma2:2b was reloaded between an 8192-token window and a
// 4352-token one all day — 238 loads and ~40 min of load time in 4.5 h —
// because different callers asked for different num_ctx, and Ollama reloads a
// runner whenever the requested window differs from the loaded one. Every
// switch is a full re-load of the weights, and none of it reached this log.
//
// This is that eye: /api/ps on the same tick as vitals. A read that fails is
// a typed null — unknown, never convicting, the same rule the surface probes
// hold. A model seen at a DIFFERENT window than last tick lands a
// `window_changed` finding, and a storm of them escalates exactly as a
// restart storm does. Kondo (the-fold/kondo.js) reads `loadedWindowOf` to say
// whether a prompt fits the window it will really run in.
let ollamaModels = null;
const windowSeen = new Map(); // model -> { contextLength, switches: [ms] }

// ── WHAT EACH MODEL ACTUALLY DOES, MEASURED FROM REAL TRAFFIC ────────────
// Asked for a model's real throughput, this watcher had nothing to say, and
// the obvious source does not exist: the Ollama.app writes a parseable
// per-request log (~/.ollama/logs/server.log) but the Homebrew server now
// serving this box writes none, so scraping a log would measure whichever
// install happened to be running — a fact about the log, not about the box.
//
// The numbers already exist at every caller: Ollama returns
// prompt_eval_count/duration, eval_count/duration and load_duration on the
// done chunk of every single call. So a surface REPORTS what it already
// measured (`observeCall`), and the bridge keeps the account: totals per
// model, and an EWMA so a rate follows the box rather than averaging away a
// bad hour. Nothing here spends a model call of its own to find out — a
// watcher that generates load to measure load is the self-defense loop's own
// refuted move.
//
// Measured while building this, and the reason it is worth keeping: gemma2:2b
// answered at 15.8 tok/s on an idle box and averaged 4.4 tok/s across a real
// 4.5-hour working window — the same model, ~3.6x slower under contention.
// A number like that is invisible without this.
const throughput = new Map(); // model -> { calls, promptTokens, promptMs, genTokens, genMs, loads, loadMs, genRate, promptRate, ungatedCalls, upstream, reasoningTokens, cacheReadTokens, cacheWriteTokens, costTotal }
const EWMA = 0.3;

// ── WHAT EACH MODEL DOESN'T SAY UNTIL YOU ASK, MEASURED LIVE ───────────────
// The window and the throughput are the bridge's numbers; the QUIRKS are the
// model's own, learned the hard way and kept so the next caller does not
// rediscover them (2026-09-17, the fiction-write session):
//
//   smollm2:1.7b — HANGS on a `system`-role message. The same prompt, with
//     the instruction folded into the `user` turn, writes fluent prose in
//     seconds; with a `system` role it never returns (measured: the call
//     timed out at 90-120s while /api/ps showed the model resident). Its
//     template was trained on user/assistant turns; the system role is a
//     template hallucination, not a feature.
//   hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF — the HF import loads to a
//     HUGE default window (minutes to load; observed hung for 4+ minutes),
//     but a DECLARED num_ctx:2048 loads in ~3.5s. Always bound the window
//     (Heimdall's loadedWindowOf discipline: declare what you need, never
//     let the import's default hang).
//   every small model — the load is paid ONCE; a model resident in /api/ps
//     answers in seconds, but any request asking a DIFFERENT num_ctx than
//     the loaded window forces a full reload (measured 2026-09-15 on
//     gemma2:2b: 238 loads in 4.5h from exactly that). Declare the window
//     consistently, warm with keep_alive, and the load is paid once.
const MODEL_QUIRKS = Object.freeze({
  "smollm2:1.7b": Object.freeze({
    systemRole: "hangs",
    note: "fold the instruction into the user turn — the system role is a template hallucination, not a feature",
  }),
});

/** The declared quirks for a model, or null — the bridge's own record. */
export function modelQuirksOf(model) {
  return MODEL_QUIRKS[String(model ?? "")] ?? null;
}

/**
 * One finished call, as its caller already measured it. Every field optional:
 * a caller that knows only some of them still contributes what it has, and a
 * zero-duration read is dropped rather than turned into an infinite rate.
 *
 * UNGATED calls (upstream: "opencode") never touched the local box: no
 * keep-alive, no VRAM, no reload — so they are counted apart
 * (`ungatedCalls`, never mixed into the local contention picture) and their
 * rates are never computed (no local ms exist to divide by). USED vs SAVED:
 * every call banks prompt+gen as used; cache-read tokens bank as saved (the
 * provider served them cut-rate from cache instead of full recompute), and
 * cost totals ride alongside for the spenders that report it.
 */
export function observeCall({ model, surface = null, host = null, queueMs = 0, promptTokens = 0, promptMs = 0, genTokens = 0, genMs = 0, loadMs = 0, ungated = false, upstream = null, reasoningTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0, cost = null } = {}) {
  if (!model) return null;
  // A successful call is proof the model answers — Heimdall keeps it servable.
  markServable(model);
  const t = throughput.get(model) ?? { calls: 0, promptTokens: 0, promptMs: 0, genTokens: 0, genMs: 0, loads: 0, loadMs: 0, genRate: null, promptRate: null, ungatedCalls: 0, upstream: null, reasoningTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costTotal: 0, costCalls: 0 };
  t.calls++;
  t.promptTokens += promptTokens; t.promptMs += promptMs;
  t.genTokens += genTokens; t.genMs += genMs;
  if (ungated) { t.ungatedCalls++; if (upstream) t.upstream = upstream; }
  t.reasoningTokens += reasoningTokens;
  t.cacheReadTokens += cacheReadTokens;
  t.cacheWriteTokens += cacheWriteTokens;
  if (cost !== null && cost !== undefined && Number.isFinite(Number(cost))) { t.costTotal += Number(cost); t.costCalls++; }
  // A load_duration over ~100ms is a real (re)load, not a cache hit: measured
  // on this box, an already-resident model answers with ~120ms and a genuine
  // reload with ~1,200ms.
  if (loadMs > 100) { t.loads++; t.loadMs += loadMs; }
  if (genTokens > 0 && genMs > 0) {
    const rate = genTokens / (genMs / 1000);
    t.genRate = t.genRate == null ? rate : EWMA * rate + (1 - EWMA) * t.genRate;
  }
  if (promptTokens > 0 && promptMs > 0) {
    const rate = promptTokens / (promptMs / 1000);
    t.promptRate = t.promptRate == null ? rate : EWMA * rate + (1 - EWMA) * t.promptRate;
  }
  throughput.set(model, t);
  t.queueMs = (t.queueMs ?? 0) + (queueMs || 0);
  if (_turn && !ungated) {
    // TURN PHASES (experiment E1): attribute this call's own timings to the
    // turn that is running, so "where the time goes" is measured, not argued.
    _turn.draws += 1;
    _turn.queueMs = (_turn.queueMs ?? 0) + (queueMs || 0);
    _turn.loadMs += loadMs || 0; _turn.promptMs += promptMs || 0; _turn.genMs += genMs || 0;
    _turn.promptTokens += promptTokens || 0; _turn.genTokens += genTokens || 0;
  } else if (_turn && ungated) { _turn.remote += 1; }
  emitLive({ act: "call", surface: surface ?? "er7", host: host ?? null, model, promptTokens, genTokens, genMs, promptMs, reloaded: loadMs > 100, ungated: !!ungated, upstream: upstream ?? null });
  return t;
}

// ── TURN PHASES (E1) — the instrument every speed experiment reads from ───
// One row per turn: how many draws, and how the wall time split across model
// LOAD, PROMPT eval, and GENERATION. Falsifier: if genMs is <30% of wallMs on
// real turns, the token levers are the wrong ones (prompt/load is the target).
let _turn = null;
let _turnSeq = 0;
// THE TURN'S OWN SCOPE (2026-09-21): `_turn` is one global, so under a burst
// every concurrent turn read the LAST session begun and the picker stuck all
// of them to one host (measured: three of eight waited 9.5s while the other
// host sat idle). AsyncLocalStorage carries each turn's session down to the
// call site correctly under any concurrency.
import { AsyncLocalStorage } from "node:async_hooks";
export const turnScope = new AsyncLocalStorage();
export const currentTurnSession = () => turnScope.getStore()?.sessionId ?? null;
const TURN_PHASES = [];
export function beginTurn({ sessionId = null, model = null } = {}) {
  _turn = { id: ++_turnSeq, sessionId, model, startAt: Date.now(), draws: 0, loadMs: 0, promptMs: 0, genMs: 0, promptTokens: 0, genTokens: 0, remote: 0 };
  return _turn.id;
}
export function endTurn(id) {
  if (!_turn || _turn.id !== id) return null;
  const t = _turn; _turn = null;
  t.wallMs = Date.now() - t.startAt;
  t.genPct = t.wallMs ? Math.round((100 * t.genMs) / t.wallMs) : null;
  t.at = new Date().toISOString();
  TURN_PHASES.push(t); if (TURN_PHASES.length > 300) TURN_PHASES.shift();
  appendLog({ act: "crossing", finding: "turn_phases", sessionId: t.sessionId, model: t.model, draws: t.draws, loadMs: t.loadMs, promptMs: t.promptMs, genMs: t.genMs, queueMs: t.queueMs ?? 0, wallMs: t.wallMs, genPct: t.genPct, promptTokens: t.promptTokens, genTokens: t.genTokens, remote: t.remote });
  return t;
}
// The mechanism-match instrument (the falsifier for the "skip generation" claim):
// every time a mechanism settles a real task, its match lands on the ledger. A
// WRONG settled mechanism on a real task shows up here — which is exactly what
// would prove a blanket skip unsafe.
export function noteMechanism({ mechanism = null, kind = null, winner = null, task = null } = {}) {
  appendLog({ act: "crossing", finding: "mechanism_match", mechanism, kind, winner, task: String(task ?? "").slice(0, 140) });
}

export function phaseStats() {
  const byModel = {};
  for (const t of TURN_PHASES) {
    const k = t.model || "?";
    const m = byModel[k] ?? (byModel[k] = { model: k, turns: 0, draws: 0, loadMs: 0, promptMs: 0, genMs: 0, wallMs: 0, genTokens: 0 });
    m.turns++; m.draws += t.draws; m.loadMs += t.loadMs; m.promptMs += t.promptMs; m.genMs += t.genMs; m.wallMs += t.wallMs; m.genTokens += t.genTokens;
  }
  return { turns: TURN_PHASES.length, recent: TURN_PHASES.slice(-20), byModel: Object.values(byModel) };
}

/** What a model is doing lately: rates, totals, and how often it reloaded. */
export function throughputOf(model = null) {
  const shape = (m, t) => ({
    model: m,
    calls: t.calls,
    genTokPerSec: t.genRate == null ? null : Math.round(t.genRate * 10) / 10,
    promptTokPerSec: t.promptRate == null ? null : Math.round(t.promptRate),
    genTokens: t.genTokens, promptTokens: t.promptTokens,
    genSeconds: Math.round(t.genMs / 1000), promptSeconds: Math.round(t.promptMs / 1000),
    reloads: t.loads, reloadSeconds: Math.round(t.loadMs / 1000),
    queueSeconds: Math.round((t.queueMs ?? 0) / 1000), // waited inside the daemon behind callers this gate never saw
    window: loadedWindowOf(m),
    // The ungated lane, kept apart: how many calls never touched this box,
    // and where they went instead. Rates above are local-box only — an
    // ungated call contributes tokens, never seconds.
    ungatedCalls: t.ungatedCalls ?? 0,
    ...(t.upstream ? { upstream: t.upstream } : {}),
    // USED vs SAVED, where the caller reported it: used = prompt + gen (+
    // reasoning when split out); saved = cache-read tokens the provider
    // served cut-rate instead of full price. Cost totals ride for spenders.
    tokensUsed: (t.promptTokens ?? 0) + (t.genTokens ?? 0),
    tokensSaved: t.cacheReadTokens ?? 0,
    ...((t.reasoningTokens ?? 0) > 0 ? { reasoningTokens: t.reasoningTokens } : {}),
    ...((t.cacheWriteTokens ?? 0) > 0 ? { cacheWriteTokens: t.cacheWriteTokens } : {}),
    ...((t.costCalls ?? 0) > 0 ? { costTotal: Math.round((t.costTotal ?? 0) * 1e6) / 1e6, costCalls: t.costCalls } : {}),
  });
  if (model) { const t = throughput.get(model); return t ? shape(model, t) : null; }
  return [...throughput.entries()].map(([m, t]) => shape(m, t)).sort((a, b) => b.genSeconds - a.genSeconds);
}

/** The window a model is loaded at right now, or null when unknown. */
export function loadedWindowOf(model) {
  const row = (ollamaModels ?? []).find((m) => m.name === model);
  return Number.isFinite(row?.contextLength) ? row.contextLength : null;
}
/** Every model resident right now, or null when the read failed. */
export function loadedModels() {
  return ollamaModels;
}

/** Seed what Heimdall is willing to serve: a model LARGER than the box has
 *  ever proven it can answer is assumed unservable until it actually answers
 *  (a successful observed call promotes it). This is why a 30B that "did
 *  nothing" is not offered — it has to prove itself to get back on the
 *  roster. A name with no size marker is left alone. */
export function modelIsBiggerThan(name, floorB = 4) {
  const m = /(?:^|[^a-z0-9.])(\d+(?:\.\d+)?)b(?:$|[^a-z0-9])/i.exec(String(name).replace(/^er7:/, ""));
  if (!m) return false;
  return Number(m[1]) > floorB;
}
export function seedUnservableLarge(models = loadedModels()) {
  for (const m of models) {
    const name = m?.name ?? m?.model ?? m;
    if (!name) continue;
    const bare = String(name).replace(/^er7:/, "");
    if (modelIsBiggerThan(bare) && !unservable.has(bare)) {
      unservable.set(bare, { at: Date.now(), reason: "large_unproven" });
      appendLog({ act: "eva", finding: "unservable_seeded", model: bare, reason: "large_unproven", giver: "heimdall", standing: "disclosed" });
    }
  }
}

export async function refreshOllamaModels() {
  // every host's own /api/ps: what is resident WHERE, and which hosts answer
  await Promise.all(hosts.map(async (h) => {
    try {
      const r = await fetchWithTimeout(`${h.url}/api/ps`, 3000);
      if (!r.ok) return;
      const b = await r.json();
      h.resident = new Map((b?.models ?? []).map((m) => [m.name ?? m.model, m.expires_at ?? null]).filter(([n]) => n));
      h.residentInfo = new Map((b?.models ?? []).map((m) => [m.name ?? m.model, { contextLength: Number.isFinite(m.context_length) ? m.context_length : null }]).filter(([n]) => n));
      if (h.downAt != null) { h.downAt = null; h.downReason = null; appendLog({ act: "rec", finding: "host_back", host: h.name }); }
    } catch (e) {
      const code = e?.cause?.code ?? e?.code ?? "";
      if (/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH/.test(String(code)) && h.downAt == null) { h.downAt = Date.now(); h.downReason = String(code); appendLog({ act: "eva", finding: "host_down", host: h.name, reason: String(code) }); }
      // a timeout keeps the last known state — never convict on a suspicion
    }
  }));
  checkHostShapes();
  let models;
  try {
    const res = await fetchWithTimeout(`${OLLAMA_URL}/api/ps`, 3000);
    if (!res.ok) return;
    const body = await res.json();
    models = (body?.models ?? []).map((m) => ({
      name: m.name ?? m.model ?? null,
      contextLength: Number.isFinite(m.context_length) ? m.context_length : null,
      vramMb: Number.isFinite(m.size_vram) ? Math.round(m.size_vram / 1048576) : null,
      expiresAt: m.expires_at ?? null,
    }));
  } catch { return; } // unknown: keep the last good reading
  const now = Date.now();
  for (const m of models) {
    if (!m.name) continue;
    const seen = windowSeen.get(m.name);
    const switches = (seen?.switches ?? []).filter((t) => now - t < RESTART_WINDOW_MS);
    if (seen && m.contextLength != null && seen.contextLength != null && seen.contextLength !== m.contextLength) {
      switches.push(now);
      log(`EVA — ${m.name} reloaded at a different window: ${seen.contextLength} → ${m.contextLength} (${switches.length} in ${RESTART_WINDOW_MS / 60000}min)`);
      appendLog({ act: "eva", finding: "window_changed", model: m.name, from: seen.contextLength, to: m.contextLength, inWindow: switches.length });
      if (switches.length >= MAX_RESTARTS) {
        lintedNote({
          kind: "infra", level: "escalate", severity: "high",
          note: `${m.name} reloaded at a different context window ${switches.length} times in ${RESTART_WINDOW_MS / 60000}min — callers are asking for different num_ctx, and every switch is a full model reload`,
          giver: "heimdall", standing: "disclosed", probe: m.name,
        });
        switches.length = 0; // reported once per window, never once per tick
      }
    }
    windowSeen.set(m.name, { contextLength: m.contextLength, switches });
  }
  ollamaModels = models;
}

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

// ── THE DUPLICATE REAPER: the background must not breed ────────────────────
// Measured 2026-09-19: the box carried 40+ `node serve.mjs 0` orphans (the
// fold's test/eval harnesses spawn an ephemeral-port server whose stop()
// never runs when the parent dies), a second proxy.mjs, stale `node --test`
// runners days old — background processes clogging CPU/RAM that nobody owns.
// Heimdall's remit expands: he does not only watch the NAMED surfaces, he
// watches the WHOLE background for strays and reaps them — a REC, recorded
// on the ledger, bounded like every other REC.
//
// The walls (a kill is the strongest act this daemon takes):
//   - NEVER kill by bare name. A pid dies only on a KNOWN stray signature:
//     an ephemeral `serve.mjs 0` orphan past its grace (ppid 1 — its spawner
//     is gone, and nothing addresses a random port); a same-model
//     llama-server duplicate (Ollama runs ONE runner per model — the second
//     same-blob runner is surplus by definition; the oldest holder is kept);
//     a `node --test` older than the age cap (a test run that outlived its
//     parent); a server process holding NO listening port at all (it failed
//     to bind but never exited — verified by lsof, never guessed).
//   - NEVER the self, NEVER an ancestor of the self, NEVER pid ≤ 1.
//   - A single instance is never a duplicate — no conviction on a suspicion.
//   - A contested same-port group with no lsof proof is REPORTED, never
//     killed (an unverified probe convicts nothing — the surface rule).
//   - Bounded per act (REAP_MAX_KILLS) and escalating: SIGTERM first, SIGKILL
//     only for a pid that survived a TERM and is still stray on re-sense.
//   - ER7_REAP_OFF=1 disables killing entirely (census-only: sense and
//     disclose, never touch). The off switch is the standing control.
const REAP_MS = Number(process.env.ER7_REAP_CADENCE ?? 5 * 60 * 1000);
const REAP_SERVE_GRACE_MS = Number(process.env.ER7_REAP_SERVE_GRACE ?? 10 * 60 * 1000);
const REAP_TEST_AGE_MS = Number(process.env.ER7_REAP_TEST_AGE ?? 2 * 60 * 60 * 1000);
const REAP_MAX_KILLS = Number(process.env.ER7_REAP_MAX_KILLS ?? 5);
let REAP_KILL_ON = (process.env.ER7_REAP_OFF ?? "0") !== "1"; // runtime-adjustable

/** Parse a `ps` etime ([dd-]hh:mm:ss) to seconds, or null when it is not a time. */
export function parseEtime(s) {
  const m = /^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d\d)$/.exec(String(s ?? "").trim());
  if (!m) return null;
  return Number(m[1] ?? 0) * 86400 + Number(m[2] ?? 0) * 3600 + Number(m[3]) * 60 + Number(m[4]);
}

/** The census, pure and testable: group a process table into herds, name the
 *  strays (killable on signature alone) and the contested groups (same-port
 *  claims that need lsof proof before anyone dies). Rows are
 *  { pid, ppid, ageS, rssKb, args }. */
export function censusBackground(rows, { now = Date.now(), selfPid = process.pid, serveGraceMs = REAP_SERVE_GRACE_MS, testAgeMs = REAP_TEST_AGE_MS } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const byPid = new Map(list.map((r) => [r.pid, r]));
  // The safe set: the self and every ancestor up the ppid chain — a reaper
  // that can kill its own parent is a loaded gun pointed at its own head.
  const safe = new Set([selfPid]);
  let anc = byPid.get(selfPid)?.ppid;
  while (anc != null && anc > 1 && !safe.has(anc)) { safe.add(anc); anc = byPid.get(anc)?.ppid; }
  const strays = [];
  const contested = [];
  const herds = {};
  const bump = (sig) => { herds[sig] = (herds[sig] ?? 0) + 1; };
  const modelGroups = new Map(); // blob -> rows
  const serverGroups = new Map(); // "script[:port]" -> rows
  for (const r of list) {
    if (!(r.pid > 1) || safe.has(r.pid)) continue;
    const args = String(r.args ?? "");
    const ageS = r.ageS ?? 0;
    // 1) Ephemeral fold servers: `serve.mjs 0` binds a random port. Past its
    // grace with ppid 1 its spawner is gone and nothing addresses that port —
    // an orphan by construction, not by suspicion.
    if (/serve\.mjs\s+0(\s|$)/.test(args)) {
      bump("serve-ephemeral");
      if (r.ppid === 1 && ageS * 1000 >= serveGraceMs) {
        strays.push({ pid: r.pid, ppid: r.ppid, ageS, rssKb: r.rssKb ?? null, signature: "serve-ephemeral", reason: `ephemeral-port orphan (ppid 1, age ${ageS}s past ${Math.round(serveGraceMs / 60000)}min grace)` });
      }
      continue;
    }
    // 2) Same-model llama runners: grouped here, decided below. A bare
    // `ollama serve` (no --model) is the server itself — never a runner.
    const mm = /llama-server\b/.test(args) ? /--model\s+(\S+)/.exec(args) : null;
    if (mm) {
      const key = `llama:${mm[1].split("/").pop()}`;
      bump(key);
      if (!modelGroups.has(key)) modelGroups.set(key, []);
      modelGroups.get(key).push(r);
      continue;
    }
    // 3) Stale test runners: a `node --test` older than the cap outlived
    // whatever spawned it. Recent ones are someone's live run — hands off.
    if (/(^|\s)node\s+--test\b/.test(args)) {
      bump("test-runner");
      if (ageS * 1000 >= testAgeMs) {
        strays.push({ pid: r.pid, ppid: r.ppid, ageS, rssKb: r.rssKb ?? null, signature: "test-runner", reason: `stale test runner (age ${ageS}s past ${Math.round(testAgeMs / 3600000)}h cap)` });
      }
      continue;
    }
    // 4) Fixed-role servers: grouped by script + claimed port for the
    // contested check below (lsof decides who actually holds what).
    const pm = /(proxy\.mjs|explore-server\.mjs|serve\.mjs)(?:\s+(\d+))?(\s|$)/.exec(args);
    if (pm) {
      const key = pm[2] ? `${pm[1]}:${pm[2]}` : `${pm[1]}:bare`;
      bump(key);
      if (!serverGroups.has(key)) serverGroups.set(key, []);
      serverGroups.get(key).push(r);
      continue;
    }
  }
  // Same-model duplicates: keep the OLDEST holder (the runner the server
  // converged on); newer same-blob arrivals are the surplus. The ledger
  // names the keeper, so the act is auditable.
  for (const [key, group] of modelGroups) {
    if (group.length < 2) continue;
    const ordered = [...group].sort((a, b) => (b.ageS ?? 0) - (a.ageS ?? 0) || a.pid - b.pid);
    const [keep, ...rest] = ordered;
    for (const r of rest) {
      strays.push({ pid: r.pid, ppid: r.ppid, ageS: r.ageS, rssKb: r.rssKb ?? null, signature: key, reason: `same-model duplicate (keeping oldest pid ${keep.pid}, age ${keep.ageS ?? 0}s)` });
    }
  }
  for (const [key, group] of serverGroups) {
    if (group.length < 2) continue;
    contested.push({ key, pids: group.map((r) => ({ pid: r.pid, ageS: r.ageS ?? 0, rssKb: r.rssKb ?? null })) });
  }
  // rowsRead rides along so a caller can tell "no strays" apart from "no
  // reading" — an empty table is a failed probe, never a clean bill.
  return { strays, contested, herds, rowsRead: list.length, at: new Date(now).toISOString() };
}

/** The act, injectable for tests: TERM each stray within budget, KILL only a
 *  pid that survived a previous TERM. `termed` carries the escalation state
 *  (pid -> termedAt); the daemon passes its own map, tests a fresh one. */
export function reapBackground({ strays = [], kill = () => false, maxKills = REAP_MAX_KILLS, now = Date.now(), termed = new Map() } = {}) {
  const termedOut = [], killed = [], gone = [], skipped = [];
  let budget = maxKills;
  for (const s of strays) {
    if (budget <= 0) { skipped.push({ ...s, why: "kill_cap" }); continue; }
    const prev = termed.get(s.pid);
    const signal = prev != null ? "SIGKILL" : "SIGTERM";
    let r;
    try { r = kill(s.pid, signal); } catch { r = false; }
    if (r === "gone") { gone.push({ ...s }); termed.delete(s.pid); continue; }
    if (!r) { skipped.push({ ...s, why: "kill_failed" }); continue; }
    budget -= 1;
    if (signal === "SIGKILL") { killed.push({ ...s, signal }); termed.delete(s.pid); }
    else { termedOut.push({ ...s, signal }); termed.set(s.pid, now); }
  }
  for (const [pid, at] of termed) if (now - at > 3600000) termed.delete(pid); // forget stale TERM records
  return { termed: termedOut, killed, gone, skipped, at: new Date(now).toISOString() };
}

const safePids = (byPid) => {
  const safe = new Set([process.pid]);
  let anc = byPid.get(process.pid)?.ppid;
  while (anc != null && anc > 1 && !safe.has(anc)) { safe.add(anc); anc = byPid.get(anc)?.ppid; }
  return safe;
};
/** The background tasks an operator can see and, by name, end. The reaper's
 *  OWN walls hold: the self, every ancestor, and pid 1 are protected — a task
 *  view that can kill its own parent is a loaded gun at its own head. */
export async function backgroundTasks() {
  const rows = await readProcessTable();
  const census = censusBackground(rows);
  const strayPids = new Set(census.strays.map((s) => s.pid));
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  const safe = safePids(byPid);
  // Only real background jobs — node/python/ollama runners and the known
  // server scripts — never an app bundle that merely has "node_modules" in a path.
  const isTask = (args) => {
    if (/^\/(Applications|System|Library|usr\/lib)\//.test(args)) return false;
    const exe = args.trim().split(/\s+/)[0].split("/").pop();
    if (/^(node|python3?|ollama|llama-server|deno|bun|ruby|uvicorn|gunicorn)$/.test(exe)) return true;
    return /(serve\.mjs|proxy\.mjs|explore-server\.mjs|heimdall-fleet\.mjs|kotva|\bfold\b)/.test(args);
  };
  const interesting = rows.filter((r) => r.pid > 1 && isTask(String(r.args ?? "")));
  return {
    rowsRead: census.rowsRead ?? rows.length,
    strays: census.strays, contested: census.contested, herds: census.herds,
    tasks: interesting.sort((a, b) => (b.rssKb || 0) - (a.rssKb || 0)).map((r) => ({
      pid: r.pid, ppid: r.ppid, ageS: r.ageS, rssMb: Math.round((r.rssKb || 0) / 1024), args: r.args.slice(0, 200),
      self: r.pid === process.pid, protected: r.pid === 1 || safe.has(r.pid), stray: strayPids.has(r.pid),
    })),
  };
}
/** Unload one resident model now (Ollama keep_alive:0) — frees its weights +
 *  KV cache. The operator's and the reporter's hand on "available". */
export async function evictModel(name) {
  const m = String(name || "").trim();
  if (!m) return { ok: false, error: "name required" };
  try {
    const r = await fetch(`${OLLAMA_URL}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model: m, keep_alive: 0 }), signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { ok: false, error: `ollama HTTP ${r.status}` };
  } catch (e) { return { ok: false, error: e.message }; }
  appendLog({ act: "rec", finding: "model_evicted", model: m, key: "heimdall", giver: "heimdall", standing: "disclosed" });
  return { ok: true, model: m, note: `${m} unloaded` };
}

// ── SYSTEM REPORTS — a surface flags an issue, Heimdall fixes its path ─────
// Any system (a fold surface, the fleet, an agent, a caller) may report a
// blocked or broken path. Heimdall DEFs it on the ledger, then TRIES the path
// within the same REC walls as his own acts: a named surface is re-forged
// (never the self, never a storm); memory pressure is relieved by evicting the
// largest idle model; a refused model is checked against the servable set. If
// nothing here can fix it, the report is ESCALATED — never silently dropped.
export async function handleReport({ from = "unknown", issue = "", kind = "", detail = "", need = null } = {}) {
  const text = `${issue} ${kind} ${detail} ${need ?? ""}`.toLowerCase();
  appendLog({ act: "def", finding: "system_report", from: String(from).slice(0, 60), issue: String(issue).slice(0, 200), kind: kind || null, detail: String(detail).slice(0, 300) });
  const vt = cachedVitals() || {};
  const attempts = [];
  let fixed = false;

  // 1) a named surface is the path → re-forge it (bounded by restartSurface's walls)
  const named = surfaces.find((s) => s.name && text.includes(String(s.name).toLowerCase()));
  const surfaceish = /\b(surface|unreachable|down|refus|connect|proxy|fold|bridge|\b5\d\d\b)\b/.test(text) || kind === "surface" || need === "surface";
  if (named && surfaceish) {
    const r = restartSurface(named.name);
    attempts.push({ action: `restart ${named.name}`, ...r });
    fixed = r.ok;
  } else if (surfaceish) {
    attempts.push({ action: "probe surfaces", up: surfaces.filter((s) => s.up === true).length, total: surfaces.length, surfaces: surfaces.map((s) => ({ name: s.name, up: s.up, reason: s.reason })) });
  }

  // 2) memory / swap pressure → free the path: evict the largest idle model
  const memish = /\b(memory|swap|ram|oom|pressure|avail)\b/.test(text) || kind === "memory";
  if (memish) {
    const loaded = Array.isArray(loadedModels()) ? loadedModels() : [];
    const biggest = [...loaded].sort((a, b) => (b.size_vram || b.size || 0) - (a.size_vram || a.size || 0))[0];
    if (biggest && (vt.swapPct ?? 0) >= SWAP_CEIL_PCT) {
      const nm = biggest.name || biggest.model;
      const r = await evictModel(nm);
      attempts.push({ action: `evict ${nm}`, ...r });
      fixed = fixed || r.ok;
    }
    attempts.push({ note: "swap is sticky: freeing RAM does not lower the swap LEVEL; only quitting apps or a reboot drains it. Churn (pg/s out) is the live signal, not the level." });
  }

  // 3) a refused / unservable model → name what can answer instead
  const modelish = /\b(model|ollama|load|unservable|dropped|hung|timeout|first byte)\b/.test(text) || kind === "model";
  if (modelish) {
    const un = (servableDisclosure().unservable || []).map((u) => u.model);
    attempts.push({ action: "servable", dropped: un, resid: (Array.isArray(loadedModels()) ? loadedModels() : []).map((m) => m.name) });
  }

  if (!attempts.length) attempts.push({ note: "no path matched the report — escalate to the operator" });
  const outcome = fixed ? "path_fixed" : attempts.some((a) => a.ok) ? "path_attempted" : "path_escalated";
  appendLog({ act: fixed ? "rec" : "eva", finding: outcome, from: String(from).slice(0, 60), actions: attempts.map((a) => a.action || "note").slice(0, 4) });
  return {
    from, issue: String(issue).slice(0, 200), fixed, outcome, attempts,
    disclosure: { giver: "heimdall", standing: "disclosed", rule: "a reported path issue is DEF'd on the ledger, then re-forged within the REC walls (never the self, never a storm); if no path can be fixed from here, the report is ESCALATED, never silently dropped" },
  };
}
export async function killTask(pid) {
  pid = Number(pid);
  if (!Number.isInteger(pid) || pid <= 1) return { ok: false, error: "refusing pid 1 / invalid pid" };
  const rows = await readProcessTable();
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  if (safePids(byPid).has(pid)) return { ok: false, error: `refusing ${pid} — it is this process or one of its parents` };
  const row = byPid.get(pid);
  if (!row) return { ok: false, error: `no such pid: ${pid}` };
  try { process.kill(pid, "SIGTERM"); } catch (e) { return { ok: false, error: `kill failed: ${e.message}` }; }
  appendLog({ act: "rec", finding: "manual_kill", pid, args: row.args.slice(0, 160), key: "operator", giver: "heimdall", standing: "disclosed" });
  return { ok: true, pid, signal: "SIGTERM", note: `sent SIGTERM to ${pid} (${row.args.slice(0, 80)})` };
}

// The apps Heimdall will never quit on his own: the system UI, the model
// server, the browser holding the watch surface, and every `node`/opencode
// process (the surface's proxy, this session's host, the fold/fleet servers).
const NEVER_QUIT = /WindowServer|kernel_task|launchd|loginwindow|\bDock\b|Finder|SystemUIServer|ControlCenter|NotificationCenter|coreaudiod|bluetoothd|ollama serve|llama-server|Ollama\.app|Brave Browser|Google Chrome|Chromium|Safari|Firefox|Microsoft Edge|Arc|Comet|Chrome Helper|WebKit|WebContent|\bnode\b|opencode|OpenCode|\bCode Helper\b|electron\.app/i;

/** SPECIAL: quit the biggest memory-hog processes so RAM AND its swapped pages
 *  are released — the only lever that drains swap short of a reboot. Gated by
 *  the `quitHogs` setting; the same walls as killTask hold (never the self,
 *  never an ancestor, never pid 1), plus: never the system UI, never the model
 *  server. Every quit is ledgered. */
export async function quitMemoryHogs({ max = 4 } = {}) {
  if (!QUIT_HOGS_ON) return { ok: false, enabled: false, error: 'the quitHogs setting is OFF — enable it first: "set quitHogs on"' };
  const rows = await readProcessTable().catch(() => []);
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  const safe = safePids(byPid);
  const SKIP = NEVER_QUIT;
  const hogs = rows
    .filter((r) => r.pid > 1 && !safe.has(r.pid) && !SKIP.test(String(r.args || "")))
    .map((r) => ({ pid: r.pid, rssMb: Math.round((r.rssKb || 0) / 1024), args: String(r.args || "") }))
    .sort((a, b) => b.rssMb - a.rssMb)
    .slice(0, Math.max(1, Math.min(12, Number(max) || 4)));
  const quit = [];
  for (const h of hogs) {
    try {
      process.kill(h.pid, "SIGTERM");
      quit.push(h);
      appendLog({ act: "rec", finding: "hog_quit", pid: h.pid, rssMb: h.rssMb, args: h.args.slice(0, 120), key: "operator", giver: "heimdall", standing: "disclosed" });
    } catch (e) { appendLog({ act: "eva", finding: "hog_quit_failed", pid: h.pid, error: e.message }); }
  }
  const freedMb = quit.reduce((a, h) => a + h.rssMb, 0);
  return { ok: true, enabled: true, quit, freedMb, note: `asked ${quit.length} memory hog(s) (~${freedMb}MB resident) to quit — quitting releases RAM AND its swapped pages, the only way to drain swap without a reboot` };
}

/** SPECIAL: quit ANY user app (all of them, not just the top hog), keeping the
 *  surface (browser + proxy), this session's host, the model server, and the
 *  system. Gated by the `quitApps` setting (off by default). Every quit is
 *  ledgered. `keepSurface:false` would quit the browser and node too — the
 *  surface's own tab included. */
export async function quitApps({ keepSurface = true, max = 60 } = {}) {
  if (!QUIT_APPS_ON) return { ok: false, enabled: false, error: 'the quitApps setting is OFF — enable it first: "set quitApps on"' };
  const rows = await readProcessTable().catch(() => []);
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  const safe = safePids(byPid);
  const keep = (r) => r.pid <= 1 || safe.has(r.pid) || /^\/(System|usr|sbin)\//.test(String(r.args || "")) || (keepSurface && NEVER_QUIT.test(String(r.args || "")));
  const apps = rows
    .filter((r) => !keep(r))
    .map((r) => ({ pid: r.pid, rssMb: Math.round((r.rssKb || 0) / 1024), args: String(r.args || "") }))
    .sort((a, b) => b.rssMb - a.rssMb)
    .slice(0, Math.max(1, Math.min(200, Number(max) || 60)));
  const quit = [];
  for (const h of apps) {
    try {
      process.kill(h.pid, "SIGTERM");
      quit.push(h);
      appendLog({ act: "rec", finding: "app_quit", pid: h.pid, rssMb: h.rssMb, args: h.args.slice(0, 120), key: "operator", giver: "heimdall", standing: "disclosed" });
    } catch (e) { appendLog({ act: "eva", finding: "app_quit_failed", pid: h.pid, error: e.message }); }
  }
  const freedMb = quit.reduce((a, h) => a + h.rssMb, 0);
  return { ok: true, enabled: true, quit, freedMb, note: `asked ${quit.length} app process(es) (~${freedMb}MB) to quit${keepSurface ? " — the surface, this session, the model server and the system were kept" : ""}` };
}

async function readProcessTable() {
  const out = await execOut("ps", ["-Ao", "pid=,ppid=,etime=,rss=,args="], 5000);
  if (!out) return [];
  const rows = [];
  for (const line of out.split("\n")) {
    const m = /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const ageS = parseEtime(m[3]);
    if (ageS == null) continue;
    rows.push({ pid: Number(m[1]), ppid: Number(m[2]), ageS, rssKb: Number(m[4]), args: m[5] });
  }
  return rows;
}

/** lsof proof: pid -> the set of TCP ports it actually holds LISTEN on, or
 *  null when the probe could not complete (then nobody dies — unverified). */
async function listeningPorts() {
  const out = await execOut("lsof", ["-iTCP", "-sTCP:LISTEN", "-P", "-n"], 5000);
  if (!out) return null;
  const held = new Map();
  for (const line of out.split("\n")) {
    const m = /^\S+\s+(\d+)\s.*TCP\s+(?:\S+:)?(\d+)\s+\(LISTEN\)/.exec(line);
    if (!m) continue;
    const pid = Number(m[1]), port = Number(m[2]);
    if (!held.has(pid)) held.set(pid, new Set());
    held.get(pid).add(port);
  }
  return held;
}

const reaperTermed = new Map(); // pid -> SIGTERM issued at (escalation state)
let lastReapReport = null;
let lastReapAt = 0; // first tick reaps, then every REAP_MS

/** The live reaper: census the background, resolve contested groups against
 *  lsof proof, kill the strays within budget, record every death on the
 *  ledger. Returns the report (also disclosed in /heimdall). */
export async function liveReap({ censusRows = null } = {}) {
  const at = Date.now();
  const rows = censusRows ?? await readProcessTable();
  const census = censusBackground(rows, { now: at, selfPid: process.pid });
  const strays = [...census.strays];
  const unresolved = [];
  if (census.contested.length) {
    const held = await listeningPorts();
    if (!held) {
      for (const g of census.contested) unresolved.push(g.key); // no proof: report only
    } else {
      for (const g of census.contested) {
        const portsOf = (pid) => held.get(pid) ?? new Set();
        const withPorts = g.pids.filter((p) => portsOf(p.pid).size > 0);
        const portless = g.pids.filter((p) => portsOf(p.pid).size === 0);
        // A server process holding NO listening port failed to bind but never
        // exited — a stray by measurement, not by suspicion.
        for (const p of portless) {
          strays.push({ pid: p.pid, ageS: p.ageS, rssKb: p.rssKb, signature: g.key, reason: `claims ${g.key} but holds no listening port` });
        }
        // Everyone holds a port but they share one: keep the oldest holder.
        const byPort = new Map();
        for (const p of withPorts) {
          for (const port of portsOf(p.pid)) {
            if (!byPort.has(port)) byPort.set(port, []);
            byPort.get(port).push(p);
          }
        }
        for (const [port, holders] of byPort) {
          if (holders.length < 2) continue;
          const ordered = [...holders].sort((a, b) => (b.ageS ?? 0) - (a.ageS ?? 0) || a.pid - b.pid);
          for (const h of ordered.slice(1)) {
            strays.push({ pid: h.pid, ageS: h.ageS, rssKb: h.rssKb, signature: g.key, reason: `shares bound port ${port} (keeping oldest holder pid ${ordered[0].pid})` });
          }
        }
        if (!portless.length && ![...byPort.values()].some((hs) => hs.length > 1)) unresolved.push(g.key);
      }
    }
  }
  if (!REAP_KILL_ON || !strays.length) {
    const report = {
      at: new Date(at).toISOString(), off: !REAP_KILL_ON,
      census: { rowsRead: census.rowsRead ?? rows.length, strays: census.strays.length, contested: census.contested.length, unresolved, herds: census.herds },
      termed: [], killed: [], gone: [], skipped: REAP_KILL_ON ? [] : strays.map((s) => ({ ...s, why: "reap_off" })),
    };
    lastReapReport = report;
    return report;
  }
  const r = reapBackground({
    strays,
    kill: (pid, sig) => {
      try { process.kill(pid, 0); } catch { return "gone"; } // already dead: a mercy, not a kill
      try { process.kill(pid, sig); return true; } catch { return false; }
    },
    now: at, termed: reaperTermed,
  });
  for (const k of [...r.termed, ...r.killed]) {
    appendLog({ act: "rec", finding: "duplicate_reaped", pid: k.pid, signal: k.signal, signature: k.signature, reason: k.reason, ageS: k.ageS ?? null, rssKb: k.rssKb ?? null, giver: "heimdall", standing: "disclosed" });
  }
  if (r.termed.length || r.killed.length) {
    lintedNote({
      kind: "infra", level: "warn", severity: "medium",
      note: `heimdall reaped ${r.termed.length + r.killed.length} background strays (${[...r.termed, ...r.killed].map((k) => `${k.signature}#${k.pid}`).join(", ")}) — the background must not breed`,
      giver: "heimdall", standing: "disclosed", probe: "reaper",
    });
  }
  lastReapReport = {
    ...r,
    census: { rowsRead: census.rowsRead ?? rows.length, strays: census.strays.length, contested: census.contested.length, unresolved, herds: census.herds },
  };
  return lastReapReport;
}

export function reaperDisclosure() {
  return {
    cadenceMs: REAP_MS, killOn: REAP_KILL_ON, maxKills: REAP_MAX_KILLS,
    serveGraceMs: REAP_SERVE_GRACE_MS, testAgeMs: REAP_TEST_AGE_MS,
    last: lastReapReport,
    rule: "the background must not breed: ephemeral serve.mjs orphans past their grace, same-model llama duplicates, stale test runners, and server processes holding no port are reaped (TERM, then KILL for survivors), bounded per act and recorded on the ledger — never the self, never an ancestor, never on an unverified probe, never with the off switch set",
  };
}

async function tick() {
  // SELF-DEFENSE first: adjust the watcher's own behavior before measuring.
  await selfDefense();

  // MEMORY — the ledger is not infinite (2026-09-19): fold the raw history
  // past the raw horizon into snapshots and trim it, on its own cadence. A
  // snapshot-consolidation failure is a skip, never a crash (consolidateMemory
  // catches and reports). First tick always consolidates, so a long-running
  // log is trimmed the moment the daemon boots. WIRED-IN (2026-09-20,
  // improvement B6): when the module runs inside the proxy, consolidation is
  // the memory holon's own DEF→EVA→REC act (declared in proxy.mjs) — the tick
  // owns it only in STANDALONE mode, so the same act never runs twice.
  if (isMain && Date.now() - lastConsolidateAt >= CONSOLIDATE_MS) {
    lastConsolidateAt = Date.now();
    consolidateMemory();
  }

  // THE REAPER — the background must not breed (2026-09-19): census the
  // process table and reap the strays on its own cadence. A reaper failure
  // is a skip, never a crash (liveReap catches into the report; the catch
  // below is the belt). First tick reaps, so a bred-up box is cleaned the
  // moment the daemon boots.
  if (Date.now() - lastReapAt >= REAP_MS) {
    lastReapAt = Date.now();
    liveReap().catch((err) => log(`reaper error: ${err.message}`));
  }

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
      // A DOWN transition carries its finding class, so the rule-author holon
      // can count it — a surface outage with no finding is invisible to the
      // learning loop (measured 2026-09-17: 3 er7 refusals, never counted).
      // Recoveries (UP) carry no finding: coming back is the control firing,
      // not a new pattern.
      appendLog({ act: "eva", surface: surf.name, family: surf.family, up: surf.up, reason: surf.reason ?? null, ...(surf.up === false ? { finding: "surface_down" } : {}) });
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

    // SELF surfaces (the proxy this watcher runs inside of) are watched for
    // STATUS but never re-forged — spawning a duplicate would EADDRINUSE on
    // the proxy's own port. Only the fold surfaces can be re-forged here.
    if (selfPort != null && surf.port === selfPort) {
      log(`EVA — ${surf.name} (self) definitively down: ${surf.reason}. A proxy cannot re-forge itself — escalate.`);
      appendLog({ act: "eva", surface: surf.name, finding: "self_down", reason: surf.reason ?? null });
      continue;
    }

    // Bound the REC: a restart storm is a finding, never a happy loop.
    const now = Date.now();
    surf.restartTimes = surf.restartTimes.filter((t) => now - t < RESTART_WINDOW_MS);
    if (surf.restartTimes.length >= MAX_RESTARTS) {
      log(`EVA — ${surf.name} down and ${MAX_RESTARTS} restarts in the window; refusing to restart-loop. Escalate.`);
      appendLog({ act: "eva", surface: surf.name, finding: "restart_storm", count: surf.restartTimes.length });
      // The escalation is REAL, not a log line: land a reasoning-linted note
      // (KIND × LEVEL × SEVERITY, giver Heimdall, standing disclosed) so the
      // storm is on the record in the shape the reasoning-lint machinery reads
      // — the same shape a surface's abrupt loss would leave, with the count.
      // This surface stays DOWN for routing (never handed traffic) but is NOT
      // abandoned silently: the finding survives the watcher's own restarts.
      lintedNote({
        kind: "infra", level: "escalate", severity: "high",
        note: `${surf.name} down and ${surf.restartTimes.length} restarts in ${RESTART_WINDOW_MS / 60000}min window — refusing to restart-loop`,
        giver: "heimdall", standing: "disclosed", probe: surf.name,
      });
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
  refreshOllamaModels().catch(() => {});
  // THE HOLONIC TREE — every declared child watcher (each a whole-and-part
  // DEF→EVA→REC holon) runs after the surface pass, on its own cadence.
  await runHolonTree().catch((err) => log(`holon tree error: ${err.message}`));
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

// ── FAST PASS: the ungated lane (2026-09-18) ─────────────────────────────────
// A remote mouth (Anthropic's own API, the opencode server) never touches this
// box: no VRAM, no keep-alive, no reload, no local contention. Gating it on box
// saturation or the local family cap is a category error — a pegged box would
// 429 a call that costs the box nothing. So an ungated model skips the
// saturation check, the family cap, and the head-of-line queue entirely: the
// ration, the servable check, and the exactly-once claim still apply (fairness
// and safety are not bypassed), but the local line never blocks it. The
// admission carries fastPass:true so the proxy skips its local inflight mark
// too — otherwise the remote call would inflate workAhead/ETA and lane-full
// decisions for the local calls behind it.
const UNGATED_SUBSTRINGS = String(process.env.ER7_UNGATED_ALLOW ?? "anthropic,claude,deepseek,opencode")
  .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
let FAST_PASS_ON = true; // runtime-adjustable: the remote (ungated) lane
let QUIT_HOGS_ON = false; // SPECIAL setting (off): allow quitting memory-hog apps
let QUIT_APPS_ON = false; // SPECIAL setting (off): allow quitting ANY app
let PARALLELISM = Number(process.env.ER7_OLLAMA_PARALLEL ?? 2); // concurrent model calls (NUM_PARALLEL)
export const currentParallelism = () => PARALLELISM; // the ceiling any concurrent draws respect
export function isUngatedModel(model) {
  if (!FAST_PASS_ON) return false;
  const bare = String(model ?? "").replace(/^er7:/, "").toLowerCase();
  if (!bare || bare === "unknown") return false;
  return UNGATED_SUBSTRINGS.some((sub) => sub === "*" || bare.includes(sub));
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

// ── THE KNOBS — Heimdall's own settings, adjustable by his operator ───────
// The operator can ask Heimdall (POST /heimdall/ask) to change a bounded set
// of settings. Each knob has a type, a range, a plain-language "about", and
// the live environment default it can be reset to. A change is validated,
// applied to the live value the decisions already read, appended to the
// ledger, and persisted — so it survives a restart and is always disclosed.
const SETTINGS_FILE = path.join(HERE, "state", "heimdall-settings.json");
const SETTINGS = {
  // SPECIAL (off by default): permit Heimdall to QUIT the biggest memory-hog
  // apps. Quitting is the only way to release RAM *and its swapped pages* —
  // the lever nothing else here has. Apps may lose unsaved work, so it is a
  // deliberate opt-in; every quit lands on the ledger, and the walls hold:
  // never the self, never an ancestor, never pid 1, never the system UI or
  // the model server.
  quitHogs: { def: false, type: "bool", about: "SPECIAL: allow Heimdall to quit the biggest memory-hog apps to free RAM and drain swap (off by default; apps may lose unsaved work)", aliases: ["quit hogs", "quit memory hogs", "memory hogs", "kill hogs", "quit apps"] },
  quitApps: { def: false, type: "bool", about: "SPECIAL: allow Heimdall to quit ANY app (all user apps, not just the top hog) — keeps the surface and system by default", aliases: ["quit apps", "quit all apps", "close all apps", "quit everything"] },
  parallelism: { def: PARALLELISM, type: "int", min: 1, max: 8, about: "concurrent model calls the server runs at once (NUM_PARALLEL) — more helps BATCH throughput (many independent draws: essay sections, code sections, files), costs per-call latency; apply with \"restart the model server\"", aliases: ["parallelism", "num parallel", "parallel"] },
  familyCap:    { def: FAMILY_CAP,  type: "int",  min: 0,  max: 64,   about: "max turns of one model family in flight at once (0 = unlimited)", aliases: ["family cap", "familycap"] },
  retryAfterS:  { def: RETRY_AFTER_S, type: "int", min: 1, max: 600,   about: "seconds a refused caller is told to wait", aliases: ["retry after", "retryafter", "retry-after"] },
  slaSeconds:   { def: Math.round(SLA_MAX_WAIT_MS / 1000), type: "int", min: 5, max: 3600, about: "the longest anyone should wait before being pulled to the front", aliases: ["sla", "sla seconds", "max wait"] },
  memFloorMb:   { def: MEM_FLOOR_MB, type: "int", min: 64, max: 65536, about: "free MB below which a non-resident load is refused fast", aliases: ["memory floor", "mem floor"] },
  memGate:      { def: MEM_GATE_ON, type: "bool", about: "refuse non-resident loads while memory is under the floor", aliases: ["memory gate", "mem gate"] },
  passStock:    { def: PASS_STOCK,  type: "int",  min: 0,  max: 64,   about: "jump-the-cue passes minted per window", aliases: ["pass stock", "passes"] },
  zipperJump:   { def: ZIPPER_JUMP, type: "int",  min: 0,  max: 32,   about: "places a pass may jump", aliases: ["zipper jump"] },
  zipperDensity:{ def: ZIPPER_DENSITY, type: "int", min: 0, max: 32,  about: "pass-free admissions after a pass is redeemed", aliases: ["zipper density"] },
  waiterTtlSeconds: { def: Math.round(WAITER_TTL_MS / 1000), type: "int", min: 10, max: 3600, about: "a quiet waiter gives up their place after this long", aliases: ["waiter ttl", "wait ttl"] },
  maxRestarts:  { def: MAX_RESTARTS, type: "int", min: 0,  max: 32,   about: "re-forges allowed per surface in the window before the storm is a finding", aliases: ["max restarts", "restarts", "restart limit"] },
  reapKill:     { def: REAP_KILL_ON, type: "bool", about: "whether the reaper may terminate strays (off = census only)", aliases: ["reap kill", "reaper", "reap"] },
  checkIntervalSeconds: { def: Math.round(CHECK_INTERVAL_MS / 1000), type: "int", min: 5, max: 3600, about: "how often the watcher probes every surface", aliases: ["check interval", "probe interval", "cadence", "tick interval"] },
  fastPass:     { def: true, type: "bool", about: "whether remote lanes skip the local queue", aliases: ["fast pass", "fastpass", "ungated", "remote lane"] },
  swapCeilPct:  { def: SWAP_CEIL_PCT, type: "int", min: 50, max: 100, about: "swap level (%) that counts as pressure \u2014 refused only when also churning or starved", aliases: ["swap ceiling", "swap ceil", "swap limit"] },
  swapChurnPps: { def: SWAP_CHURN_PPS, type: "int", min: 0, max: 5000, about: "swap-out pages/second that count as active thrashing", aliases: ["swap churn", "churn"] },
};
function applySetting(name, value, { persist = true } = {}) {
  const key = canonicalSetting(name);
  if (!key) return { ok: false, error: `no such setting: ${name}` };
  const spec = SETTINGS[key];
  const v = coerceSetting(value, spec);
  if (v == null) return { ok: false, error: `bad value for ${key} (${spec.type}${spec.min != null ? ` ${spec.min}–${spec.max}` : ""}): ${value}` };
  const from = settingValue(key);
  switch (key) {
    case "familyCap": FAMILY_CAP = v; break;
    case "retryAfterS": RETRY_AFTER_S = v; break;
    case "slaSeconds": SLA_MAX_WAIT_MS = v * 1000; break;
    case "memFloorMb": MEM_FLOOR_MB = v; break;
    case "memGate": MEM_GATE_ON = v; break;
    case "passStock": PASS_STOCK = v; break;
    case "zipperJump": ZIPPER_JUMP = v; break;
    case "zipperDensity": ZIPPER_DENSITY = v; break;
    case "waiterTtlSeconds": WAITER_TTL_MS = v * 1000; break;
    case "maxRestarts": MAX_RESTARTS = v; break;
    case "reapKill": REAP_KILL_ON = v; break;
    case "checkIntervalSeconds": CHECK_INTERVAL_MS = v * 1000; selfDefenseIntervalMs = v * 1000; break;
    case "fastPass": FAST_PASS_ON = v; break;
    case "quitHogs": QUIT_HOGS_ON = v; break;
    case "quitApps": QUIT_APPS_ON = v; break;
    case "parallelism": PARALLELISM = v; break;
    case "swapCeilPct": SWAP_CEIL_PCT = v; break;
    case "swapChurnPps": SWAP_CHURN_PPS = v; break;
    default: return { ok: false, error: `no such setting: ${key}` };
  }
  if (persist) saveSettings();
  return { ok: true, setting: key, from, to: v };
}
function canonicalSetting(name) {
  const n = String(name ?? "").toLowerCase().trim().replace(/[\s_-]+/g, " ");
  if (!n) return null;
  if (SETTINGS[n]) return n;
  let best = null, bestLen = 0;
  for (const [key, spec] of Object.entries(SETTINGS)) {
    for (const al of [key.toLowerCase(), ...(spec.aliases || [])]) {
      if (al.length > bestLen && n.includes(al)) { best = key; bestLen = al.length; }
    }
  }
  return best;
}
function coerceSetting(value, spec) {
  if (spec.type === "bool") {
    if (typeof value === "boolean") return value;
    const s = String(value ?? "").toLowerCase().trim();
    if (["1", "true", "on", "yes", "enable", "enabled", "raise", "up"].includes(s)) return true;
    if (["0", "false", "off", "no", "disable", "disabled", "down"].includes(s)) return false;
    return null;
  }
  const n = Math.round(Number(String(value ?? "").match(/-?\d+/)?.[0]));
  if (!Number.isFinite(n)) return null;
  if (n < spec.min || n > spec.max) return null;
  return n;
}
function settingValue(name) {
  switch (name) {
    case "familyCap": return FAMILY_CAP;
    case "retryAfterS": return RETRY_AFTER_S;
    case "slaSeconds": return Math.round(SLA_MAX_WAIT_MS / 1000);
    case "memFloorMb": return MEM_FLOOR_MB;
    case "memGate": return MEM_GATE_ON;
    case "passStock": return PASS_STOCK;
    case "zipperJump": return ZIPPER_JUMP;
    case "zipperDensity": return ZIPPER_DENSITY;
    case "waiterTtlSeconds": return Math.round(WAITER_TTL_MS / 1000);
    case "maxRestarts": return MAX_RESTARTS;
    case "reapKill": return REAP_KILL_ON;
    case "checkIntervalSeconds": return Math.round(CHECK_INTERVAL_MS / 1000);
    case "fastPass": return FAST_PASS_ON;
    case "quitHogs": return QUIT_HOGS_ON;
    case "quitApps": return QUIT_APPS_ON;
    case "parallelism": return PARALLELISM;
    case "swapCeilPct": return SWAP_CEIL_PCT;
    case "swapChurnPps": return SWAP_CHURN_PPS;
    default: return null;
  }
}
function saveSettings() {
  const out = {};
  for (const key of Object.keys(SETTINGS)) {
    const v = settingValue(key);
    if (v !== SETTINGS[key].def) out[key] = v;
  }
  try { fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true }); fs.writeFileSync(SETTINGS_FILE, JSON.stringify(out, null, 2)); } catch { /* a failed save never breaks a change */ }
}
function loadSettings() {
  try {
    const o = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    for (const [k, v] of Object.entries(o)) if (SETTINGS[k]) applySetting(k, v, { persist: false });
  } catch { /* no file yet: the env defaults stand */ }
}
loadSettings();
/** The knobs, disclosed: current value, default, range, and whether overridden. */
export function heimdallSettings() {
  return Object.entries(SETTINGS).map(([name, spec]) => {
    const value = settingValue(name);
    return { name, value, default: spec.def, type: spec.type, min: spec.min ?? null, max: spec.max ?? null, about: spec.about, overridden: value !== spec.def };
  });
}
export function setHeimdallSetting(name, value, opts = {}) {
  const r = applySetting(name, value, opts);
  if (r.ok) appendLog({ act: "crossing", finding: "setting_changed", setting: r.setting, from: r.from, to: r.to, key: opts.key ?? "operator", giver: "heimdall", standing: "disclosed" });
  return r;
}

// ── ASK HEIMDALL — the operator chat, confined to the bridge ──────────────
// Heimdall answers for ONE domain: the watch. Surfaces, models, the line,
// the box's vitals, where the efficiency is, his rules, his child watchers,
// and his settings. He does not speak of anything else — the domain gate is
// the ethos, and an off-domain ask gets a typed decline, never an invention.
// His answers are his own DISCLOSED state, composed from GET /heimdall with
// zero model tokens: he reports what he measures, and nothing he has not
// measured. A setting ask is applied (validated, ledgered, persisted) and
// confirmed. Every ask and answer lands on the ledger.
const DOMAIN_HELP =
  "I keep the bridge. Ask me of the surfaces, the models, the line, the box's breath, " +
  "where the efficiency is, my rules, my child watchers, or my settings \u2014 and I will " +
  "answer from what I have measured. I will not speak of anything else.";
function askDisclosure() {
  return { giver: "heimdall", standing: "disclosed", groundedIn: "GET /heimdall", tokens: 0 };
}
function fmtTokps(m) { return m.genTokPerSec == null ? "unmeasured" : `${m.genTokPerSec} tok/s (${Math.round(1000 / m.genTokPerSec)} ms/tok)`; }
function efficiencyFindings() {
  const d = disclosure();
  const out = [];
  const un = d.servable?.unservable || [];
  if (un.length) out.push(`${un.length} model(s) dropped from the roster: ${un.map((u) => u.model).join(", ")} \u2014 they hung or timed out.`);
  if (d.memory?.pressured) out.push(`memory is under the ${d.memory.floorMb}MB floor (${d.memory.freeMb}MB free) \u2014 a load would hang; free memory or serve resident models.`);
  if (d.queue?.workAhead > 0) out.push(`the line is ${d.queue.workAhead} deep (~${d.queue.etaHuman}); batch work waits behind interactive by design.`);
  if (d.saturated) out.push(`the box is pegged (CPU idle ${d.cpu?.idle ?? "?"}%) \u2014 throughput falls under contention; free headroom or route work off-box.`);
  for (const m of throughputOf()) {
    if (m.ungatedCalls) continue;
    if (m.reloads) out.push(`${m.model} reloaded ${m.reloads}\u00d7 (${Math.round((m.reloadSeconds || 0) / m.reloads)}s each) \u2014 declare one num_ctx and warm with keep_alive to pay the load once.`);
    if (m.genTokPerSec != null && m.genTokPerSec < 6) out.push(`${m.model} is at ${m.genTokPerSec} tok/s \u2014 it has run ~3.6\u00d7 faster on a free box.`);
  }
  return out;
}
// ── THE FACTS BRIEF — the grounded state every answer stands on ───────────
// The watchman answers from what he measured. This brief is that measurement,
// assembled once: the systems, the CRASH EVIDENCE from the ledger (so "why do
// they keep crashing?" has real material), the models, the line, the box, and
// the rules. It grounds both the mechanical answer and the framed turn.
const CONCERN = new Set(["surface_down","restart_storm","self_down","unservable","unservable_refused","unservable_seeded","turned_no_answer","model_dropped","window_changed","forward_failed","first_byte_timeout","memory_pressured","saturated","rationed","claimed","bad_pass","zipper_held","setting_refused"]);
function concernScan(limit = 500) {
  const counts = {}, last = {};
  for (const r of logLines(limit)) {
    const f = r.finding; if (!f || !CONCERN.has(f)) continue;
    counts[f] = (counts[f] || 0) + 1; last[f] = r;
  }
  return { counts, last };
}
async function buildFacts(st, d, sys) {
  const L = [];
  L.push(`SYSTEMS (source: ${sys.source}${sys.load != null ? `, load ${Number(sys.load).toFixed(1)}${sys.saturated ? " PEGGED" : ""}` : ""}):`);
  for (const s of sys.surfaces) {
    L.push(`- ${s.name} :${s.port} ${s.up === true ? "UP" : s.up === false ? (String(s.reason || "").startsWith("unverified") ? "UNVERIFIED" : "DOWN") : "NEVER PROBED"}`
      + `${s.standing ? ` (${s.standing})` : ""}${s.saturated ? " saturated" : ""}${s.escalation ? ` escalation:${s.escalation}` : ""}${s.reason ? ` reason=${s.reason}` : ""}${s.restartsInWindow ? ` restarts=${s.restartsInWindow}` : ""}`);
  }
  const { counts, last } = concernScan();
  const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  if (keys.length) {
    L.push("CONCERNING (recent ledger findings, most frequent first):");
    for (const k of keys.slice(0, 12)) {
      const r = last[k];
      L.push(`- ${k} \u00d7${counts[k]}\u2014 last: ${[r.surface, r.model, r.reason ? "reason=" + r.reason : null, r.message].filter(Boolean).join(" ") || "(no detail)"}`.replace("\u2014", " \u2014 "));
    }
  } else L.push("CONCERNING: nothing concerning in the recent ledger.");
  const tp = throughputOf();
  if (tp.length) {
    L.push("MODELS:");
    for (const m of tp) L.push(`- ${m.model}: ${m.calls} call(s), ${m.genTokPerSec == null ? "rate unmeasured" : m.genTokPerSec + " tok/s"}${m.reloads ? `, ${m.reloads} reload(s) avg ${Math.round((m.reloadSeconds || 0) / m.reloads)}s` : ""}${m.window ? `, window ${m.window}` : ""}${m.ungatedCalls ? `, ${m.ungatedCalls} ungated` : ""}`);
    const un = d.servable?.unservable || [];
    if (un.length) L.push(`- dropped (hung/timed out): ${un.map((u) => u.model).join(", ")}`);
  }
  // RAM — the live memory picture, so "how do we reduce RAM load?" has material
  const v = st.vitals || {};
  const procRows = await readProcessTable().catch(() => []);
  const top = procRows.filter((r) => r.pid > 1)
    .map((r) => ({ pid: r.pid, mb: Math.round((r.rssKb || 0) / 1024), cmd: String(r.args || "").split(/\s+/).slice(0, 3).join(" ").slice(0, 48) }))
    .sort((a, b) => b.mb - a.mb).slice(0, 6);
  L.push(`RAM: ${v.memAvailableMb ?? "?"}MB available (free ${v.memFreeMb ?? "?"}MB + reclaimable inactive), total ${v.memTotalMb ?? "?"}MB, compressor ${v.memCompressorMb ?? "?"}MB; SWAP ${v.swapUsedMb ?? "?"}MB / ${v.swapTotalMb ?? "?"}MB = ${v.swapPct ?? "?"}%${(v.swapPct ?? 0) >= 85 ? " \u2014 THRASHING" : ""}; floor ${d.memory?.floorMb}MB${d.memory?.pressured ? " \u2014 PRESSURED" : ""}.`);
  L.push(`TOP MEMORY: ${top.map((t) => `${t.pid} ${t.mb}MB ${t.cmd}`).join(" | ")}`);
  const resident = Array.isArray(st.ollamaModels) ? st.ollamaModels.map((m) => m.name || m.model) : null;
  L.push(`RESIDENT MODELS: ${resident && resident.length ? resident.join(", ") : "none read"}.`);
  L.push("LEVERS (what can be tuned): ollama OLLAMA_MAX_LOADED_MODELS (co-resident count) \u00b7 OLLAMA_KEEP_ALIVE (how long a model holds its RAM) \u00b7 per-model num_ctx (a bigger window = more RAM, and switching windows forces a reload) \u00b7 heimdall setting memFloorMb/memGate (refuses a non-resident load under the floor) \u00b7 fewer/smaller co-resident models \u00b7 /v1/models is the roster.");
  L.push(`LINE: ${d.queue?.workAhead ?? 0} ahead, ETA ${d.queue?.etaHuman ?? "now"}; ${d.queue?.samples ? `last turn ${(d.queue.lastMs / 1000).toFixed(1)}s, avg ${(d.queue.perTurnMs / 1000).toFixed(1)}s over ${d.queue.samples}` : "no timed turn yet"}; SLA ${d.sla?.targetS}s, longest wait ${d.sla?.longestWaitS}s.`);
  L.push(`BOX: load ${sys.load ?? "?"}, CPU ${d.cpu?.busy == null ? "unmeasured" : d.cpu.busy + "%"}, GPU ${d.gpu?.busy == null ? "unmeasured" : d.gpu.busy + "%"}, memory ${d.memory?.freeMb == null ? "unmeasured" : d.memory.freeMb + "MB"} (floor ${d.memory?.floorMb}MB)${d.memory?.pressured ? " PRESSURED" : ""}.`);
  const rs = [...derivedRuleStore(), ...mintedRules()];
  if (rs.length) L.push(`RULES: ${rs.map((r) => `${r.key || r.finding}=${r.standing}${r.count ? `(\u00d7${r.count})` : ""}`).join(", ")}.`);
  return L.join("\n");
}

export async function heimdallAsk(ask, { caller = "anon", fleet = null } = {}) {
  const text = String(ask ?? "").trim();
  const at = ts();
  if (!text) return { intent: "empty", answer: DOMAIN_HELP, refused: false, disclosure: askDisclosure() };
  const lower = text.toLowerCase();
  appendLog({ act: "eva", finding: "heimdall_ask", key: caller, ask: text.slice(0, 240) });

  // An IMPERATIVE ("quit the memory hogs", "free memory", "close the apps") is
  // an ACTION, not a setting query — it must not be swallowed by the quitHogs
  // setting's aliases, which would otherwise just report the value.
  if (/\b(quit|kill|close|free|drain)\b[\s\S]{0,24}\b(hogs?|memory|apps?|swap|everything)\b/.test(lower) && !/\b(set|what|value|range|default|describe|turn)\b/.test(lower)) {
    const all = /\b(all|every|everything)\b/.test(lower);
    const r = all ? await quitApps({ keepSurface: true }) : await quitMemoryHogs({ max: 4 });
    const answer = r.ok
      ? `Quit ${r.quit.length} ${all ? "app process(es)" : "hog(s)"} (~${r.freedMb}MB resident): ${r.quit.map((h) => `${h.pid} ${String(h.args).split(/\s+/)[0].split("/").pop()}`).join(", ") || "none"}. ${r.note}`
      : r.error;
    appendLog({ act: "crossing", finding: "heimdall_answer", key: caller, intent: all ? "quit_all_apps" : "hogs", ok: r.ok });
    return { intent: all ? "quit_all_apps" : "hogs", answer, refused: !r.ok, disclosure: askDisclosure() };
  }

  // 1) a setting named → change it or report it
  const setName = canonicalSetting(lower);
  if (setName) {
    const spec = SETTINGS[setName];
    const hasValue = /\d/.test(lower) || /\b(on|off|true|false|enable|disable|enabled|disabled|yes|no|up|down)\b/.test(lower);
    if (!hasValue) {
      const v = settingValue(setName);
      const answer = `${setName} = ${v}. Range ${spec.type === "bool" ? "on/off" : `${spec.min}\u2013${spec.max}`}. ${spec.about}.`;
      appendLog({ act: "crossing", finding: "heimdall_answer", key: caller, intent: "setting_query", setting: setName, value: v });
      return { intent: "setting", setting: setName, answer, refused: false, disclosure: askDisclosure() };
    }
    const valueToken = spec.type === "bool"
      ? (lower.match(/\b(on|off|true|false|enable|disable|enabled|disabled|yes|no|up|down)\b/) || [])[0]
      : (lower.match(/-?\d+/) || [])[0];
    const r = setHeimdallSetting(setName, valueToken, { key: caller });
    if (!r.ok) {
      appendLog({ act: "eva", finding: "setting_refused", key: caller, setting: setName, value: valueToken });
      return { intent: "setting", setting: setName, answer: `I cannot set ${setName} to ${valueToken}. ${r.error}.`, refused: true, disclosure: askDisclosure() };
    }
    const eff = { familyCap: "a full model family now refuses with a typed 429", slaSeconds: "the SLA target moved", memGate: "the memory gate is now " + (r.to ? "on" : "off"), reapKill: "the reaper is now " + (r.to ? "killing strays" : "census only"), fastPass: "the remote lane is now " + (r.to ? "open" : "closed"), checkIntervalSeconds: "the watcher's probe cadence moved" }[r.setting] || "the value moved";
    const answer = `Done. ${r.setting}: ${r.from} \u2192 ${r.to}. ${eff}. Recorded on the ledger and persisted.`;
    appendLog({ act: "crossing", finding: "heimdall_answer", key: caller, intent: "setting_change", setting: r.setting, from: r.from, to: r.to });
    return { intent: "setting", setting: r.setting, applied: { from: r.from, to: r.to }, answer, refused: false, disclosure: askDisclosure() };
  }

  // 2) the domain gate: what is this ask about?
  const H = {
    modelserver: /\b(ollama|model server|model runner)\b[\s\S]{0,30}\b(restart|reboot|unwedge|revive|stuck|wedged|hang|dead|frozen)\b|\b(restart|reboot|unwedge|revive)\b[\s\S]{0,24}\b(ollama|model server|model runner)\b/,
    surfaces: /\b(surface|surfaces|bridge|spans?|up|down|health|probe|unverified|er7|fold|running|active|serving|live|systems?|processes|servers?|procs?|what'?s (up|on|running)|what is running|who'?s (up|running))\b/,
    models: /\b(model|models|ollama|token|tok\/s|throughput|reload|window|forge|generat|llm|weights)/,
    hogs: /\b(memory hogs?|quit (the )?(memory )?hogs?|kill hogs|free (up )?(the )?memory|free memory|close (the )?apps?|quit apps?|drain swap)\b/,
    timing: /\b(time|timing|how long|latency|response time|takes?|duration|per turn|turn time|how fast|milliseconds|seconds|prompt to response|delay)\b/,
    queue: /\b(queue|line|wait|waiting|eta|sla|ration|pass(es)?|zipper|ahead|backlog)\b/,
    vitals: /\b(cpu|gpu|memory|mem\b|load|box|saturat|vitals|breath|ram|pegged|headroom)/,
    efficiency: /\b(efficien|slow|optim|speed|improv|bottleneck|cost|waste|faster|why.*(slow|wait))/,
    rules: /\b(rules?|foresight|derived|learn|standing|control|conceded)/,
    holons: /\b(holons?|child watchers?|the nine|watchers?)/,
    reaper: /\b(reap|strays?|background process)/,
    summary: /\b(status|report|overview|summary|how.*(going|things)|what.*(see|seeing|running|up|on)|state of|happening|going on|everything|overall|currently|right now|who is|what is)\b/,
    help: /\b(help|what can you|what do you|commands?|settings list|list.*settings|what are the settings)\b/,
  };
  // NO KEYWORD MATCH IS NOT A REFUSAL. An open question about the bridge
  // ("why do they keep crashing?") is exactly what a watchman must answer;
  // the domain firewall now rides on the framed turn below, and the grounded
  // facts gathered here are what it answers from. Only an empty ask declines.
  const intent = Object.keys(H).find((k) => H[k].test(lower)) || "open";

  const st = heimdallStatus();
  const d = st.disclosure || {};
  // The system, merged: an external fleet's peer mesh is the real health of
  // every active eoreader-affecting process; without it, this proxy's own
  // (maybe unprobed) surfaces. Heimdall answers from whichever really watched.
  const sys = (Array.isArray(fleet) && fleet.length)
    ? (() => {
        const peers = [];
        for (const f of fleet) for (const p of (f.peers || [])) peers.push(p);
        const by = {};
        for (const p of peers) if (!by[p.name]) by[p.name] = p;
        return {
          source: "fleet", load: fleet[0]?.boxLoad?.load1 ?? null, saturated: !!fleet[0]?.boxLoad?.saturated,
          surfaces: Object.values(by).map((p) => ({
            name: p.name, port: (String(p.address || "").split(":").pop()) || "?", family: "",
            up: p.up === true ? true : p.up === false ? false : null, reason: p.reason || null,
            inflight: 0, restartsInWindow: 0, standing: p.standing || null,
            saturated: (p.saturatedTicks || 0) > 0,
            escalation: p.escalation?.status === "pending" ? (/conced|answered/i.test(p.escalation.reason || "") ? "conceding" : "pending") : null,
          })),
        };
      })()
    : { source: "proxy", load: st.vitals?.load1 ?? null, saturated: !!d.saturated, surfaces: st.surfaces };
  let lines = [];
  switch (intent) {
    case "help":
    case "summary": {
      const up = sys.surfaces.filter((s) => s.up === true).length;
      const down = sys.surfaces.filter((s) => s.up === false && !String(s.reason || "").startsWith("unverified"));
      lines.push(`${up}/${sys.surfaces.length} systems up (${sys.source})${down.length ? `; DOWN: ${down.map((s) => s.name).join(", ")}` : ""}.`);
      lines.push(`${sys.surfaces.filter((s) => s.up === true).map((s) => s.name).join(", ") || "nothing"} answering.`);
      lines.push(`The line: ${d.queue?.workAhead ?? 0} ahead, ~${d.queue?.etaHuman ?? "now"}${(d.saturated || sys.saturated) ? "; the box is pegged" : ""} · load ${sys.load ?? "?"}.`);
      const forge = throughputOf().filter((m) => !m.ungatedCalls && m.genTokPerSec != null).sort((a, b) => b.genTokPerSec - a.genTokPerSec)[0];
      if (forge) lines.push(`Fastest model: ${forge.model} at ${forge.genTokPerSec} tok/s.`);
      lines.push(`CPU ${d.cpu?.busy ?? "unmeasured"}, GPU ${d.gpu?.busy ?? "unmeasured"}, memory ${d.memory?.freeMb ?? "unmeasured"}MB free (floor ${d.memory?.floorMb}).`);
      if (intent === "help") lines.push(DOMAIN_HELP, `My knobs: ${heimdallSettings().map((s) => s.name).join(", ")}.`);
      break;
    }
    case "surfaces":
      for (const s of sys.surfaces) lines.push(`${s.name} :${s.port} ${s.up === true ? "UP" : s.up === false ? (String(s.reason || "").startsWith("unverified") ? "UNVERIFIED" : "DOWN") : "NEVER PROBED"}`
        + `${s.standing ? ` (${s.standing})` : ""}${s.family ? ` family ${s.family}` : ""}${s.saturated ? " \u2014 saturated" : ""}`
        + `${s.escalation === "pending" ? " \u2014 ESCALATION PENDING" : s.escalation === "conceding" ? " \u2014 escalation conceding (it answered)" : ""}`
        + `${s.inflight ? `, ${s.inflight} in flight` : ""}${s.restartsInWindow ? `, ${s.restartsInWindow} re-forge(s)` : ""}${s.reason ? ` (${s.reason})` : ""}.`);
      break;
    case "models": {
      const tp = throughputOf();
      if (!tp.length) lines.push("No model has answered yet \u2014 the forge is cold.");
      for (const m of tp) lines.push(`${m.model}: ${m.calls} call(s), ${fmtTokps(m)}${m.reloads ? `, ${m.reloads} reload(s) averaging ${Math.round((m.reloadSeconds || 0) / m.reloads)}s` : ", no reloads"}${m.window ? `, window ${m.window}` : ""}${m.ungatedCalls ? ` (${m.ungatedCalls} ungated \u2192 ${m.upstream || "remote"})` : ""}.`);
      const un = d.servable?.unservable || [];
      if (un.length) lines.push(`Dropped: ${un.map((u) => u.model).join(", ")}.`);
      break;
    }
    case "timing": {
      const q = d.queue || {};
      if (q.samples) lines.push(`Last prompt \u2192 response: ${(q.lastMs / 1000).toFixed(1)}s (this door); average ~${(q.perTurnMs / 1000).toFixed(1)}s over ${q.samples} timed turn(s). That is the WHOLE turn \u2014 any wait in the line plus generation.`);
      else lines.push(`No turn has been timed on this door yet this session \u2014 I will not quote the old seed (${(q.perTurnMs / 1000).toFixed(0)}s) as if it were measured. Send a turn and ask again.`);
      lines.push(`Per model: ${throughputOf().filter((m) => !m.ungatedCalls).map((m) => `${m.model} ${m.genTokPerSec == null ? "unmeasured" : `${m.genTokPerSec} tok/s (${Math.round(1000 / m.genTokPerSec)} ms/tok)`}`).join(", ") || "none measured"}.`);
      const prom = throughputOf().filter((m) => m.promptTokPerSec != null);
      if (prom.length) lines.push(`Prompt eval: ${prom.map((m) => `${m.model} ${Math.round(m.promptTokPerSec)} tok/s`).join(", ")}.`);
      lines.push(`First token is NOT separately instrumented \u2014 I time the whole turn only. The wait in the line is ${q.workAhead ?? 0} ahead, ETA ${q.etaHuman ?? "now"}.`);
      break;
    }
    case "queue": {
      const pos = [...(d.queue?.positions || [])].sort((a, b) => a.position - b.position);
      lines.push(`Ahead ${d.queue?.workAhead ?? 0}, ETA ${d.queue?.etaHuman ?? "now"}, ~${Math.round((d.queue?.perTurnMs || 0) / 1000)}s per turn.`);
      lines.push(`SLA ${d.sla?.targetS}s; longest wait ${d.sla?.longestWaitS}s${d.sla?.over ? " (OVER)" : ""}.`);
      lines.push(pos.length ? pos.map((p) => `#${p.position} ${p.caller}`).join(", ") : "The line is clear.");
      lines.push(`Passes: ${d.zipper?.remaining ?? 0} available, jump \u2264 ${d.zipper?.jump}, then ${d.zipper?.density} pass-free. Time-to-first-token is not instrumented here \u2014 this wait is the measured one.`);
      break;
    }
    case "vitals":
      lines.push(`load ${sys.load ?? d.load ?? "?"}${sys.saturated ? " (pegged)" : ""}.`);
      lines.push(`CPU ${d.cpu?.busy == null ? "unmeasured" : d.cpu.busy + "% busy (" + d.cpu.idle + "% idle)"}, GPU ${d.gpu?.busy == null ? "unmeasured" : d.gpu.busy + "%"}.`);
      lines.push(`Ollama pid ${st.vitals?.ollamaPid ?? "?"}, ${st.vitals?.ollamaCpu ?? "?"}% cpu, ${st.vitals?.ollamaMemMb ?? "?"}MB.`);
      lines.push(`Memory ${d.memory?.freeMb == null ? "unmeasured" : d.memory.freeMb + "MB free"}, floor ${d.memory?.floorMb}MB${d.memory?.pressured ? " \u2014 PRESSURED" : ""}.`);
      break;
    case "efficiency": {
      const f = efficiencyFindings();
      lines = f.length ? f : ["Nothing is being wasted that I can measure: no reloads, no pressure, the line is clear and the box breathes."];
      break;
    }
    case "rules": {
      const rs = [...derivedRuleStore(), ...mintedRules().map((r) => ({ ...r, source: "mint" }))];
      if (!rs.length) lines.push("No rule yet \u2014 nothing has recurred past its floor.");
      for (const r of rs) lines.push(`${r.key || r.finding}: ${r.standing}${r.count ? ` (${r.count}\u00d7)` : ""} \u2014 ${r.rule}${r.control ? ` [control: ${r.control}]` : ""}`);
      break;
    }
    case "holons":
      for (const h of holonTree()) lines.push(`${h.name}: ${h.running ? "running" : "idle"}, every ${Math.round(h.cadenceMs / 1000)}s, ${h.findings} finding(s) \u2014 ${h.def}`);
      break;
    case "reaper": {
      const rep = reaperDisclosure();
      lines.push(`Reaper ${rep.killOn ? "killing" : "census-only"}, every ${Math.round(rep.cadenceMs / 1000)}s, max ${rep.maxKills} per act.`);
      if (rep.last) lines.push(`Last pass: ${rep.last.census?.strays ?? 0} stray(s), ${(rep.last.termed || []).length} termed, ${(rep.last.killed || []).length} killed.`);
      break;
    }
    case "hogs": {
      const r = await quitMemoryHogs({ max: 4 });
      if (!r.ok) lines.push(r.error, "Quitting your biggest memory hogs is the only thing here that drains swap \u2014 but it can lose unsaved work, so it stays off until you turn it on.");
      else { lines.push(`Quit ${r.quit.length} hog(s) (~${r.freedMb}MB resident): ${r.quit.map((h) => `${h.pid} ${String(h.args).split(/\s+/)[0].split("/").pop()}`).join(", ")}.`); lines.push(r.note); }
      break;
    }
    case "modelserver": {
      const r = await restartModelServer();
      lines.push(r.ok ? `${r.note}. Killed ${r.killed.length} old process(es); give it ~2s to come up.` : `could not restart the model server: ${r.error}`);
      break;
    }
  }
  const facts = await buildFacts(st, d, sys);
  if (!lines.length) lines.push(facts); // an open question: the brief IS the fallback answer
  const answer = lines.join("\n");
  appendLog({ act: "crossing", finding: "heimdall_answer", key: caller, intent, lines: lines.length });
  return { intent, answer, facts, refused: false, disclosure: askDisclosure() };
}

// ── LIGHT VITALS — the tachometers (2026-09-20) ──────────────────────────
// A cheap sampler for the gauges, usable even when the watcher runs OUT of
// this process (ER7_EXTERNAL_HEIMDALL=1): CPU total AND per-core from
// os.cpus() deltas (no subprocess), load from os.loadavg(), memory from one
// vm_stat, GPU from ioreg on a slow throttle. It fills the SAME vitals cache
// the watcher uses, so every surface reads one reading.
let _cpuPrev = null;
let _gpuCache = null, _gpuAt = 0;
const GPU_TTL_MS = Number(process.env.ER7_GPU_TTL ?? 5000);
export async function sampleVitalsNow() {
  const v = { ...(vitalsCache || {}) };
  const cores = os.cpus();
  if (_cpuPrev && _cpuPrev.length === cores.length) {
    const per = []; let tu = 0, ts = 0, ti = 0, total = 0;
    for (let i = 0; i < cores.length; i++) {
      const a = cores[i].times, b = _cpuPrev[i].times;
      const du = a.user - b.user, dsys = a.sys - b.sys, di = a.idle - b.idle;
      const dt = (du + dsys + di + ((a.nice || 0) - (b.nice || 0)) + ((a.irq || 0) - (b.irq || 0))) || 1;
      per.push(Math.max(0, Math.min(100, Math.round((100 * (dt - di)) / dt))));
      tu += du; ts += dsys; ti += di; total += dt;
    }
    v.cpuUser = Math.round((100 * tu) / total);
    v.cpuSys = Math.round((100 * ts) / total);
    v.cpuIdle = Math.round((100 * ti) / total);
    v.cores = per;
  }
  _cpuPrev = cores;
  v.coreCount = cores.length;
  const la = os.loadavg();
  v.load1 = la[0]; v.load5 = la[1]; v.load15 = la[2];
  try {
    const mem = await collectMemHeadroom();
    v.memFreeMb = mem.memFreeMb; v.memInactiveMb = mem.memInactiveMb; v.memAvailableMb = mem.memAvailableMb; v.memCompressorMb = mem.memCompressorMb;
    v.swapInPages = mem.swapInPages; v.swapOutPages = mem.swapOutPages;
    const r = swapRates(mem.swapInPages, mem.swapOutPages);
    v.swapInPerS = r.inPerS; v.swapOutPerS = r.outPerS;
  } catch { /* keep last */ }
  Object.assign(v, await readSwap().catch(() => ({})));
  v.memTotalMb = Math.round(os.totalmem() / 1048576);
  if (Date.now() - _gpuAt > GPU_TTL_MS) {
    try {
      const ioreg = await execOut("ioreg", ["-c", "AppleGPU", "-l"], 8000);
      const gm = ioreg ? /"Device Utilization %"=(\d+)/.exec(ioreg) : null;
      _gpuCache = gm ? Number(gm[1]) : _gpuCache;
    } catch { /* a failed GPU read keeps the last */ }
    _gpuAt = Date.now();
  }
  v.gpuUtil = _gpuCache;
  vitalsCache = { ...(vitalsCache || {}), ...v };
  vitalsCacheAt = Date.now();
  return v;
}

// ── THE MODEL SERVER — the thing everything else waits on ─────────────────
// The 2026-09-21 lesson: an Ollama.app `serve` can WEDGE (0% CPU for 30+ min,
// /api/ps resident, every generate hanging) and nothing restarts it — every
// turn then stalls to its deadline. This is the lever + the watchdog that ends
// that class: restart `ollama serve` directly with the tuned, non-wedging env
// (concurrency 2, window 4096, one resident model, CPU-only), never the app.
const OLLAMA_BIN = process.env.ER7_OLLAMA_BIN ?? "/Applications/Ollama.app/Contents/Resources/ollama";
const MODEL_RESTART_WINDOW_MS = Number(process.env.ER7_MODEL_RESTART_WINDOW ?? 10 * 60 * 1000);
// The last model-server restart is PERSISTED (2026-09-21), never just in
// memory: the proxy is re-forged by the fleet when it wedges, and an
// in-memory `lastModelRestartAt` resets to 0 on every restart — which quietly
// defeated the window cap and let the watchdog cold-restart ollama serve
// minutes apart (measured: model_server_restart at 03:57, 04:05, 04:08). The
// restart timestamp now rides the state file, so the window survives a
// re-forge and the box's most violent act stays once-per-window for real.
const MODEL_RESTART_STATE_FILE = path.join(HERE, "state", "model-server-restart.json");
let lastModelRestartAt = loadLastModelRestart();
function loadLastModelRestart() {
  try { return Number(JSON.parse(fs.readFileSync(MODEL_RESTART_STATE_FILE, "utf8")).lastRestartAt) || 0; } catch { return 0; }
}
function saveLastModelRestart() {
  try { fs.mkdirSync(path.dirname(MODEL_RESTART_STATE_FILE), { recursive: true }); fs.writeFileSync(MODEL_RESTART_STATE_FILE, JSON.stringify({ lastRestartAt: Date.now(), at: ts() })); } catch { /* a failed save never breaks a restart */ }
}
export function modelServerConfig() {
  return {
    bin: OLLAMA_BIN,
    env: {
      OLLAMA_NUM_PARALLEL: String(PARALLELISM),
      OLLAMA_CONTEXT_LENGTH: process.env.ER7_OLLAMA_CTX ?? "8192",
      OLLAMA_MAX_LOADED_MODELS: process.env.ER7_OLLAMA_MAX_LOADED ?? "1",
      OLLAMA_NUM_GPU: process.env.ER7_OLLAMA_NUM_GPU ?? "0",
      OLLAMA_KEEP_ALIVE: process.env.ER7_OLLAMA_KEEP_ALIVE ?? "10m",
      OLLAMA_HOST: process.env.OLLAMA_HOST ?? "127.0.0.1:11434",
    },
  };
}
export async function restartModelServer({ force = false } = {}) {
  // GATED (2026-09-21): a model-server restart is the box's most violent act —
  // every in-flight turn dies with it. Only a server that is actually
  // UNRESPONSIVE is restarted (a healthy-but-busy server is never cold-killed),
  // and only once per window. The ledger's own churn is the finding this exists
  // to end: three "restart the model server" asks in 11 minutes, each one
  // killing every turn on the box and making the proxy look broken.
  const now = Date.now();
  if (!force && now - lastModelRestartAt < MODEL_RESTART_WINDOW_MS) {
    const waitS = Math.max(1, Math.round((MODEL_RESTART_WINDOW_MS - (now - lastModelRestartAt)) / 1000));
    appendLog({ act: "eva", finding: "model_server_restart_capped", waitS, key: "operator", giver: "heimdall", standing: "disclosed" });
    return { ok: false, capped: true, waitS, error: `the model server was restarted recently — Heimdall holds another restart for ~${waitS}s. Each restart kills every turn in flight; the box needs time to settle.` };
  }
  if (!force) {
    const alive = await probeModelServer();
    if (alive.ok) {
      appendLog({ act: "eva", finding: "model_server_healthy_refused", key: "operator", giver: "heimdall", standing: "disclosed" });
      return { ok: false, healthy: true, error: "the model server answers — it is busy, not stuck. Restarting a healthy-but-busy server kills every in-flight turn; Heimdall refuses." };
    }
  }
  const rows = await readProcessTable().catch(() => []);
  const killed = [];
  for (const r of rows) {
    if (/Ollama\.app\/Contents\/Resources\/ollama serve|llama-server/i.test(String(r.args || ""))) {
      try { process.kill(r.pid, "SIGTERM"); killed.push(r.pid); } catch { /* already gone */ }
    }
  }
  await new Promise((r) => setTimeout(r, 1500));
  const { bin, env } = modelServerConfig();
  let child;
  try { child = spawn(bin, ["serve"], { env: { ...process.env, ...env }, detached: true, stdio: "ignore" }); }
  catch (e) { appendLog({ act: "eva", finding: "model_server_restart_failed", error: e.message }); return { ok: false, error: e.message }; }
  child.unref();
  lastModelRestartAt = Date.now();
  saveLastModelRestart();
  appendLog({ act: "rec", finding: "model_server_restart", pid: child.pid, killed, config: env, key: "operator", giver: "heimdall", standing: "disclosed" });
  return { ok: true, pid: child.pid, killed, note: `restarted ollama serve (parallel ${env.OLLAMA_NUM_PARALLEL}, ctx ${env.OLLAMA_CONTEXT_LENGTH}, max_loaded ${env.OLLAMA_MAX_LOADED_MODELS}, gpu ${env.OLLAMA_NUM_GPU})` };
}
/** One cheap liveness probe of the model server (never spawns load of its own).
 *  LESSON 22 (2026-09-21): the failure surface is a real generate, not the
 *  tags endpoint. A wedged server answers /api/tags instantly while every
 *  generate hangs past 120 s — the probe that only checks tags calls a
 *  wedged server "healthy, busy not stuck" and the remedy gate refuses to fix
 *  the exact wedge it exists to end. Probe a 1-token generate on a small
 *  resident model under a strict timeout; /api/tags alone is not a liveness
 *  signal for a model server. */
const PROBE_MODEL = process.env.ER7_PROBE_MODEL ?? "gemma2:2b";
export async function probeModelServer({ timeoutMs = 8000 } = {}) {
  try {
    const tags = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!tags.ok) return { ok: false, status: tags.status, surface: "tags" };
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: PROBE_MODEL,
        stream: false,
        messages: [{ role: "user", content: "Say OK" }],
        options: { num_predict: 4, temperature: 0 },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return { ok: false, status: r.status, surface: "generate" };
    const j = await r.json().catch(() => null);
    if (!j || !j.done) return { ok: false, surface: "generate", reason: "no done on a finished generate" };
    return { ok: true, status: 200, surface: "generate" };
  } catch (e) {
    return { ok: false, surface: "generate", error: e?.cause?.code ?? e.message };
  }
}

// ── THE MERGED API — what the proxy uses when heimdall runs inside it. ─────
// The full status object (what /heimdall serves), the chat admission gate
// (saturation + family cap), and the watcher kickoff. The standalone steer
// server uses the same pieces; the proxy imports them.

export function heimdallStatus() {
  return {
    at: ts(),
    status: "ok",
    steered: isMain,
    steerPort: STEER_PORT,
    familyCap: FAMILY_CAP,
    retryAfterS: RETRY_AFTER_S,
    settings: heimdallSettings(),
    disclosure: disclosure(),
    vitals: cachedVitals() ?? null,
    ollamaModels,
    modelQuirks: MODEL_QUIRKS,
    holons: holonTree(),
    mintedRules: mintedRules(),
    derivedRules: derivedRuleStore(),
    roomMouths: roomMouthStore(),
    hosts: [...hostsDisclosure(), ...roomMouthStore().map((m) => ({ name: m.id, url: `matrix:${m.user}`, kind: "room", up: true, inflight: 0, calls: 0, picks: 0, fails: 0, lastAt: m.at, resident: [m.model], meanMs: {}, loadMs: null, sessions: 0, pickable: false }))],
    throughput: throughputOf(),
    surfaces: surfaces.map((s) => ({
      name: s.name, family: s.family, port: s.port, up: s.up, reason: s.reason,
      inflight: s.inflight, cmd: s.cmd, restartsInWindow: s.restartTimes.length,
      restartable: !(selfPort != null && s.port === selfPort),
      activity: activityDisclosure(s),
    })),
    logTail: logTail(12),
    memory: memoryDisclosure(),
    reaper: reaperDisclosure(),
    phases: phaseStats(),
  };
}

// The admission gate for a chat request: saturation and the per-family cap,
// with a typed refusal (never a hang). The proxy calls this on its OWN chat
// path (marking its own surface's inflight), exactly as the standalone steer
// server did for the surface it forwarded to.
//
// `headers` carries the caller's identity (x-er7-session / x-er7-caller) and
// an optional one-use pass (x-er7-pass). The gate now answers refusals with
// a REAL place in line: `queue.position` (1-based, stable across retries —
// retrying does not shuffle you), and a pass lets you zipper up ZIPPER_JUMP
// places once the alternation allows it. Admission is head-only: when a slot
// is free you are admitted if you are at the head of the line, otherwise you
// get `not_your_turn` with your position — the queue actually means
// something now.
export function admitChat(body = "{}", headers = {}) {
  mintPasses();
  pruneWaiters();
  const model = modelOf(body);
  const family = familyOfRequest(model);
  const key = personKeyOf(headers);
  const passCode = String(headers["x-er7-pass"] || "").trim() || null;
  const pass = validPassCode(passCode, headers);
  if (passCode && !pass) {
    appendLog({ act: "eva", finding: "bad_pass", key, code: passCode });
    return { allowed: false, status: 400, type: "bad_pass", message: `no such jump-the-cue pass: ${passCode}` };
  }

  // Every requestor is profiled and rationed: a swarm that has spent its
  // window is refused up front (typed, never a stall), and its priority class
  // decides where it sits in the line — batch is always behind interactive.
  const profile = profileOf(key, headers);
  if (rationed(profile)) {
    const resetInS = Math.max(0, Math.round((profile.windowStart + RATION_WINDOW_MS - Date.now()) / 1000));
    appendLog({ act: "eva", finding: "rationed", key, priority: profile.priority, turns: profile.turns, cap: RATION_TURNS[profile.priority] });
    return {
      allowed: false, status: 429, type: "rationed", family, model, retryAfterS: Math.min(60, Math.max(5, resetInS)),
      message: `${key} has used ${profile.turns}/${RATION_TURNS[profile.priority]} turns this window — the ration resets in ~${resetInS}s. Heimdall holds the line for everyone.`,
      ration: rationDisclosure(),
    };
  }

  // HEIMDALL'S CALL: a model this box cannot actually serve right now (known
  // to hang, or timed out with nothing returned) is refused, not silently
  // stalled — and the refusal names the models that DO answer.
  if (!isServable(model)) {
    appendLog({ act: "eva", finding: "unservable_refused", key, model, family });
    return {
      allowed: false, status: 503, type: "model_unavailable", family, model, retryAfterS: 15,
      message: `${model} is not answering on this box right now (Heimdall dropped it). Pick a model the box can serve — /v1/models lists them.`,
      servable: servableDisclosure(),
    };
  }

  // FAST PASS (2026-09-18): a remote mouth never touches this box, so it
  // never waits for it. No waiters enqueue, no head-of-line, no saturation
  // or lane-full refusal — the local line is for local contention. A presented
  // jump-the-cue pass is NOT redeemed here (the call needed no jump; burning
  // a pass would be theft). The ration above and the servable check above
  // already ran; the exactly-once claim below still runs.
  if (isUngatedModel(model)) {
    const claim = claimTurn(headers);
    if (!claim.ok) {
      appendLog({ act: "eva", finding: "claimed", key, claim: claim.id, device: claim.device });
      return {
        allowed: false, status: 429, type: "claimed", family, model, retryAfterS: Math.max(2, RETRY_AFTER_S),
        message: `this turn is already being inferred on ${claim.device} — Heimdall will not run it twice; it will be retried on another device if ${claim.device} stalls.`,
        claim: { id: claim.id, device: claim.device },
      };
    }
    profile.turns += 1;
    profile.lastServeAt = Date.now();
    lastServed.set(key, Date.now());
    appendLog({ act: "crossing", finding: "fast_pass", key, model, family, ungated: true });
    return { allowed: true, family, model, pass: null, claim, priority: profile.priority, fastPass: true, ungated: true };
  }

  // MEMORY GATE (2026-09-19, learned; widened 2026-09-20): a model that is
  // NOT already resident must be LOADED, and a load attempted with no free
  // pages hangs for minutes, then aborts and poisons the session behind it
  // (measured: 120s, 420s, plus a turned_no_answer cascade — and a
  // gemma2:2b evict-and-swap against a 9.8GB resident that stalled ~290s
  // in total proxy silence). Small is not free: ANY load evicts, so the
  // old >4B size exemption was a hole, not a fast lane. Refused FAST with
  // a typed reason while headroom sits below the floor, whatever the size.
  // Resident models answer from memory already held — loading nothing,
  // never gated. Remote (fast-passed) turns never reach this line. Unknown
  // headroom or unknown residency never convicts.
  if (MEM_GATE_ON) {
    const vitals = cachedVitals();
    // BOX-LEVEL SWAP GUARD (2026-09-20; corrected to CHURN, 2026-09-21): swap
    // LEVEL alone is history — macOS never moves pages back, so a box can sit
    // at 92% swap with idle app pages and plenty of AVAILABLE RAM and still
    // serve fine. What costs is CHURN (pages swapping out NOW) or true
    // starvation (available below the floor). Refuse only then; a high-but-
    // idle swap does not block a turn the box can actually serve.
    const churning = vitals?.swapOutPerS != null && vitals.swapOutPerS >= SWAP_CHURN_PPS;
    const starved = (vitals?.memAvailableMb ?? Infinity) < MEM_FLOOR_MB * 2;
    if (vitals?.swapPct != null && vitals.swapPct >= SWAP_CEIL_PCT && (churning || starved)) {
      appendLog({ act: "eva", finding: "memory_pressured", key, model, family, swapPct: vitals.swapPct, swapOutPerS: vitals.swapOutPerS ?? null, availableMb: vitals.memAvailableMb ?? null });
      return {
        allowed: false, status: 503, type: "memory_pressured", family, model, retryAfterS: 30,
        message: `the box is ${churning ? "thrashing" : "starved"} \u2014 swap ${vitals.swapPct}% full, ${vitals.swapOutPerS ?? "?"} pg/s out, ${vitals.memAvailableMb ?? "?"}MB available. Heimdall holds the turn so the box can drain; retry shortly or route to the remote lane.`,
        memory: { swapPct: vitals.swapPct, swapOutPerS: vitals.swapOutPerS ?? null, swapUsedMb: vitals.swapUsedMb, swapTotalMb: vitals.swapTotalMb, availableMb: vitals.memAvailableMb ?? null, floorMb: MEM_FLOOR_MB },
      };
    }
    // Residency is tri-state: null (/api/ps unreadable) is UNKNOWN, never
    // evidence of absence — collapsing it to "not resident" would turn a
    // failed daemon read into refusals.
    const loaded = loadedModels();
    const residencyKnown = Array.isArray(loaded);
    const resident = residencyKnown && loaded.some((m) => (m.name ?? m.model) === String(model).replace(/^er7:/, ""));
    if (!resident && residencyKnown && memoryPressured(vitals) && vitals?.memAvailableMb != null) {
      appendLog({ act: "eva", finding: "memory_pressured", key, model, family, availableMb: vitals.memAvailableMb });
      return {
        allowed: false, status: 503, type: "memory_pressured", family, model, retryAfterS: 60,
        message: `${model} is not resident and the box holds only ~${vitals.memAvailableMb}MB available (floor ${MEM_FLOOR_MB}MB) \u2014 a load attempted now would hang, so Heimdall refuses fast instead. Free memory or serve a resident model; /v1/models lists what answers without loading.`,
        memory: { availableMb: vitals.memAvailableMb, freeMb: vitals.memFreeMb ?? null, floorMb: MEM_FLOOR_MB },
      };
    }
  }

  // Every caller holds a place in the line (first touch enqueues them, so a
  // retry is never shuffled). A pass jump during a live zipper merge is held,
  // not misordered.
  const saturated = _testSaturated ?? boxSaturated(cachedVitals());
  // EXPECTED WAIT (2026-09-21): the picker's own evidence — the least
  // (in-flight × measured mean turn) over the hosts that answer — is the
  // honest "when would this start". Past the SLA it is held with that ETA,
  // in words, instead of queueing silently inside the daemon (NUM_PARALLEL
  // is invisible from here). Unmeasured hosts never hold: no evidence, no
  // conviction.
  const ew = expectedWaitMs(String(model ?? "").replace(/^er7:/, ""));
  if (ew.ms != null && ew.ms > SLA_MAX_WAIT_MS) {
    appendLog({ act: "eva", finding: "expected_wait", key, model, family, waitMs: ew.ms, host: ew.host, inflight: ew.inflight, meanMs: ew.meanMs });
    return {
      allowed: false, status: 429, type: "expected_wait", family, model, retryAfterS: Math.max(2, Math.ceil(ew.ms / 1000)),
      message: `every server is busy — the least wait is ~${Math.ceil(ew.ms / 1000)}s on ${ew.host} (${ew.inflight} ahead at ~${(ew.meanMs / 1000).toFixed(1)}s each), past the ${Math.round(SLA_MAX_WAIT_MS / 1000)}s promise. Heimdall holds the turn; retry in ${Math.ceil(ew.ms / 1000)}s.`,
      expectedWait: ew,
    };
  }
  const familyInflight = FAMILY_CAP > 0 && family !== "any"
    ? surfaces.filter((s) => s.family === family).reduce((a, s) => a + s.inflight, 0)
    : 0;
  const laneFull = FAMILY_CAP > 0 && family !== "any" && familyInflight >= FAMILY_CAP;
  const busy = saturated || laneFull;
  const existing = waiters.get(key);
  if (!existing) {
    // Enqueue with the round-robin marker (when this person was last served),
    // their work class (batch = the swarm, always at the back), and enteredAt
    // — the honest start of their wait, for the SLA. enteredAt never refreshes
    // on retry, so the longest-wait metric is real.
    waiters.set(key, { at: Date.now(), enteredAt: nowMs(), pass: pass ? pass.code : null, servedAt: lastServed.get(key) ?? 0, priority: profile.priority });
  } else {
    existing.at = Date.now();
    if (pass) existing.pass = pass.code;
  }

  if (pass && zipperLock > 0) {
    // The merge is zippering: the pass is held (never redeemed) until the
    // alternation drains — a jump now would cut a pass-train through.
    const eff = effectivePositionOf(key);
    appendLog({ act: "eva", finding: "zipper_held", key, code: pass.code, lock: zipperLock });
    return {
      allowed: false, status: 429, type: "zipper", family, model, retryAfterS: Math.max(2, RETRY_AFTER_S),
      message: `the merge is zippering — ${zipperLock} normal call(s) go first, then your pass jumps you up. Heimdall keeps the pass for you.`,
      queue: queueOf(key, eff),
      zipper: zipperDisclosure(),
    };
  }

  // If a slot is genuinely free, admit — but only the caller at the HEAD of
  // the line. Head is not "who arrived first": it is "who has been waiting
  // longest since their last serve" (round-robin, one serve per person), so a
  // fresh caller's single message cuts in front of someone else's 25-message
  // backlog instead of waiting behind the pile.
  if (!busy) {
    // eligible, not merely effective: a pass HELD for the zipper blocks nobody
    const position = eligiblePositionOf(key);
    if (position === 1) {
      // The turn must be inferred once, by one device — but the lease is
      // recoverable: a stale claim (the local device stalled or failed) is
      // reclaimed here, which is what another device is for.
      const claim = claimTurn(headers);
      if (!claim.ok) {
        appendLog({ act: "eva", finding: "claimed", key, claim: claim.id, device: claim.device });
        return {
          allowed: false, status: 429, type: "claimed", family, model, retryAfterS: Math.max(2, RETRY_AFTER_S),
          message: `this turn is already being inferred on ${claim.device} — Heimdall will not run it twice; it will be retried on another device if ${claim.device} stalls.`,
          claim: { id: claim.id, device: claim.device },
        };
      }
      // Serve. Zipper alternation: a pass that jumps starts a lock; a normal
      // admission that follows a pass pays one of the owed normal slots.
      if (pass) {
        pass.redeemedAt = Date.now();
        zipperLock = ZIPPER_DENSITY;
        appendLog({ act: "crossing", finding: "pass_redeemed", key, code: pass.code });
      } else if (zipperLock > 0) {
        zipperLock -= 1;
      }
      // FAIR QUEUE: the caller just got served — remember it (their next
      // message re-joins the BACK of the line) and take them OUT of the
      // waiting line while they serve, so the queue shows only people still
      // waiting, never the caller who is mid-turn. Their ration counts this
      // turn.
      profile.turns += 1;
      profile.lastServeAt = Date.now();
      lastServed.set(key, Date.now());
      waiters.delete(key);
      noteAdmitted();
      return { allowed: true, family, model, pass: pass ? pass.code : null, claim, priority: profile.priority };
    }
    // The box has room, but it is not your turn yet — hold your place.
    const eff = position;
    appendLog({ act: "eva", finding: "not_your_turn", key, position: eff, family });
    return {
      allowed: false, status: 429, type: "not_your_turn", family, model, retryAfterS: Math.max(2, RETRY_AFTER_S),
      message: `a slot is free but it is not your turn — you are #${eff} in line. Heimdall keeps your place; retrying does not shuffle you.`,
      queue: queueOf(key, eff),
    };
  }

  // Refused (saturated / lane full): you hold your place. A retry keeps it.
  const eff = effectivePositionOf(key);
  const reason = saturated ? "saturated" : "lane_full";
  // The refusal carries the reading it was made on (cpuIdle, load, swap,
  // available) so the throttle is FALSIFIABLE: a stream of `saturated` rows
  // at idle >= 15% proves boxSaturated is twitchy; rows at idle <= 10% prove
  // the peg is real. Never a refusal without its evidence.
  const _v = cachedVitals() || {};
  appendLog({ act: "eva", finding: reason, key, position: eff, family, model, retryAfterS: RETRY_AFTER_S,
    cpuIdle: _v.cpuIdle ?? null, load1: _v.load1 ?? null, swapPct: _v.swapPct ?? null, availableMb: _v.memAvailableMb ?? null });
  return {
    allowed: false, status: 429, type: reason, family, model, retryAfterS: RETRY_AFTER_S,
    message: `${reason === "saturated" ? "box saturated" : `family ${family} busy`} — you are #${eff} in line (${queueOf(key, eff).etaHuman}). Heimdall keeps your place; retrying does not shuffle you.`,
    queue: queueOf(key, eff),
    zipper: zipperDisclosure(),
  };
}

function queueOf(key, position) {
  const workAhead = surfaces.reduce((a, s) => a + s.inflight, 0) + waiters.size;
  const eta = etaFor(Math.max(0, workAhead));
  return {
    position: position ?? effectivePositionOf(key),
    workAhead,
    perTurnMs: eta.perTurnMs,
    etaMs: eta.etaMs,
    etaHuman: eta.etaMs ? `${Math.round(eta.etaMs / 1000)}s` : "now",
  };
}

let _watcherStarted = false;
export function startWatcher({ selfPort: p = null } = {}) {
  if (p != null) selfPort = p;
  if (_watcherStarted) return;
  _watcherStarted = true;
  schedule();
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
  // ── /heimdall — the full status. The proxy serves this locally now; the
  // standalone steer server serves the same object.
  if (req.method === "GET" && req.url === "/heimdall") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(heimdallStatus()));
    return;
  }
  // ── POST /reap — run the duplicate reaper on demand (same pass the tick
  // runs on its own cadence). Returns the report: what was TERM/KILLed, what
  // was skipped, what stays contested. The off switch (ER7_REAP_OFF=1) turns
  // this into a census-only read.
  if (req.method === "POST" && req.url === "/reap") {
    const r = await liveReap().catch((err) => ({ error: err.message }));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(r));
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
    const isChat = req.method === "POST" && /(\/v1\/chat\/completions|\/api\/chat|\/v1\/messages|\/v1\/messages\/count_tokens)$/.test(req.url);
    if (!isChat) {
      const target = pickSurface("any") ?? surfaces[0];
      if (!target?.up) { res.writeHead(503, { "content-type": "application/json" }); res.end(JSON.stringify({ error: { message: "no surface up" } })); return; }
      await forwardTo(res, req.method, `${target.url}${req.url}`, req.headers, body);
      return;
    }

    const model = modelOf(body);
    const family = familyOfRequest(model);

    // The admission gate — saturation + the per-family cap, typed refusals.
    const admit = admitChat(body);
    if (!admit.allowed) {
      log(`STEER — refusing ${family} (${admit.type}) with ${admit.status}, retry ${admit.retryAfterS}s`);
      res.writeHead(admit.status, { "content-type": "application/json", "retry-after": String(admit.retryAfterS) });
      res.end(JSON.stringify({ error: { message: admit.message, type: admit.type, retry_after: admit.retryAfterS } }));
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

// ── HEIMDALL THE SENTINEL: the outward flows ──────────────────────────────
// Heimdall is the archon of the outward flows — every API connection that
// leaves the system: the vision calls to OLLAMA, the reasoning minds, the
// chat/proxy surfaces, the mechanical senses. He knows the OTHER paths, runs
// experiments to find the path that fits the current box, and regulates the
// box homeostatically — sense the vitals, compare to a setpoint, act
// (pace / defer / escalate / downgrade / re-forge) to restore equilibrium
// BEFORE breakdown, with hysteresis so he never flaps. His findings are
// reasoning-linted notes (KIND × LEVEL × SEVERITY, append-only), and when a
// decision needs reasoning he consults a mind whose answer is itself linted.
// The experiment budget is COST-CLASS-AWARE (a fast path gets a short budget,
// so a failing path is cut early — the moondream 48s waste was the lesson)
// and his choice is CACHED per (path, document-class), so a re-ingest of the
// same kind does not re-experiment: the second plan lands near-silent.

export const HEIMDALL_PATHS = Object.freeze({
  vision: Object.freeze([
    { name: "moondream", kind: "vision", model: "moondream:latest", costClass: "fast", capability: "general-coarse" },
    { name: "qwen2.5vl:7b", kind: "vision", model: "qwen2.5vl:7b", costClass: "normal", capability: "general-precise" },
  ]),
  minds: Object.freeze([
    { name: "gemma2:2b", kind: "mind", model: "gemma2:2b", costClass: "cheap", capability: "reasoning-lite" },
    { name: "qwen3:30b-a3b", kind: "mind", model: "qwen3:30b-a3b", costClass: "expensive", capability: "reasoning" },
  ]),
  mechanical: Object.freeze([
    { name: "tesseract-psm6", kind: "mechanical", model: "tesseract", costClass: "fast", capability: "precise-ocr" },
    { name: "tesseract-psm3", kind: "mechanical", model: "tesseract", costClass: "fast", capability: "precise-ocr" },
  ]),
  // ROOM MOUTHS — machines reached through a Matrix room (P119), each
  // offering models of its own. These are filled by the room wiring
  // (matrix-client.js / the other agent's crossing) and are NOT a static
  // roster: a mouth that comes or goes is added/removed live. costClass is
  // the measured network hop's cost — remote inference pays the room's seal
  // + transfer, so a fast local horse outranks a remote one of equal speed.
  room: Object.freeze([]),
});

// ── THE ROOM-MOUTH REGISTRY ──────────────────────────────────────────────
// The live set of remote machines the bridge can cross inference to. Each
// entry mirrors huginn.js's roomCandidateOf shape: id `room:@who:server
// <model>`, user `@who:server`, the offered model, and what the machine
// measured of itself (device, gpu, spare) — the same evidence a local horse
// carries, one register over. The room wiring (matrix-client.js) calls
// upsertRoomMouth/removeRoomMouth as mouths come and go; heimdallStatus
// surfaces the set so a caller can see which remote horses the bridge knows.
const roomMouths = new Map(); // id -> { id, user, model, device, gpu, home, at }
export function upsertRoomMouth(m) {
  const id = (m?.id) || (m?.user && m?.model ? "room:" + String(m.user).replace(/^@/, "") + " " + m.model : null);
  if (!id) return null;
  roomMouths.set(id, { id, user: m.user, model: m.model, device: m.device ?? null, gpu: m.gpu ?? null, home: m.home ?? "remote", at: Date.now() });
  appendLog({ act: "eva", finding: "room_mouth", id, user: m.user, model: m.model, device: m.device ?? null, giver: "heimdall", standing: "disclosed" });
  return roomMouths.get(id);
}
export function removeRoomMouth(id) {
  if (roomMouths.delete(id)) {
    appendLog({ act: "eva", finding: "room_mouth_left", id, giver: "heimdall", standing: "disclosed" });
    return true;
  }
  return false;
}
export function roomMouthStore() {
  return [...roomMouths.values()].map((m) => ({ ...m, at: new Date(m.at).toISOString() }));
}

/** The room paths the bridge knows for a given job kind and model — the
 *  seam the room wiring (matrix-client.js) feeds. Each path mirrors
 *  huginn.js's roomCandidateOf shape so the prioritizer ranks a remote
 *  mouth beside a local horse on the same measured scale. `model` may be
 *  null to return every mouth offering any model (the failover form). */
export function roomPathsFor(kind, { model = null } = {}) {
  const all = [...roomMouths.values()];
  const byModel = model ? all.filter((m) => m.model === model) : all;
  return byModel.map((m) => ({
    name: m.id,
    kind,
    model: m.model,
    costClass: "remote",
    capability: "room-mouth",
    user: m.user,
    gpu: m.gpu ?? null,
    home: m.home ?? "remote",
  }));
}

// cost-class-aware experiment budgets (ms): a fast path is cut early.
const EXPERIMENT_BUDGET_MS = Object.freeze({ fast: 15000, normal: 45000, expensive: 90000 });
const CHOICE_CACHE_FILE = path.join(HERE, "heimdall-choice-cache.json");
const loadChoiceCache = () => { try { const d = JSON.parse(fs.readFileSync(CHOICE_CACHE_FILE, "utf8")); return Object.entries(d); } catch { return []; } };
const saveChoiceCache = () => { try { fs.writeFileSync(CHOICE_CACHE_FILE, JSON.stringify(Object.fromEntries(CHOICE_CACHE))); } catch { /* the cache must never take the watcher down */ } };
const CHOICE_CACHE = new Map(loadChoiceCache()); // `${docClass}:vision` → path name

// the homeostatic regulator: sense → setpoint → act, with hysteresis.
const REG = {
  setpoint: { minCpuIdle: 10, maxTurnMs: 90000 },
  hysteresisSamples: 2,
  deviating: 0,
  last: "clear",
};
export function regulate(vitals, { turnMs = null } = {}) {
  const idle = vitals?.cpuIdle;
  const saturated = idle != null && idle <= REG.setpoint.minCpuIdle;
  const slow = turnMs != null && turnMs > REG.setpoint.maxTurnMs;
  const deviating = saturated || slow;
  REG.deviating = deviating ? REG.deviating + 1 : 0;
  let act = "clear";
  if (REG.deviating >= REG.hysteresisSamples) act = deviating ? "defer" : "clear";
  else if (deviating) act = "watch";
  REG.last = act;
  return { saturated, slow, idle, act, deviating: REG.deviating, setpoint: REG.setpoint };
}

const sentinelTimeout = (p, ms, label) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)),
]);

// EVA: run an experiment across the known paths, cost-class-aware budgets.
export async function runPathExperiment(probe, { paths = HEIMDALL_PATHS.vision, question = "describe what this page is and what it commits to" } = {}) {
  const { lookAtImage } = await import("./native/organs/look.js");
  const results = [];
  for (const p of paths) {
    const budget = EXPERIMENT_BUDGET_MS[p.costClass] ?? 45000;
    const t0 = Date.now();
    const entry = { path: p.name, model: p.model, costClass: p.costClass, ms: 0, ok: false };
    try {
      const r = await sentinelTimeout(lookAtImage(probe.image, { visionModel: p.model, name: probe.name }), budget, `experiment ${p.name}`);
      entry.ms = Date.now() - t0;
      entry.ok = true;
      entry.settled = r.visionSettled ?? null;
      entry.vision = r.visionRead ?? null;
    } catch (e) {
      entry.ms = Date.now() - t0;
      entry.error = e.message;
    }
    appendLog({ at: new Date().toISOString(), act: "eva", kind: "experiment", probe: probe.name, ...entry });
    results.push(entry);
  }
  return results.sort((a, b) => (a.ok === b.ok ? a.ms - b.ms : a.ok ? -1 : 1));
}

// the mind Heimdall can consult when a decision needs reasoning.
export async function consultMind(prompt, { mind = "qwen3:30b-a3b", maxTokens = 320, timeoutMs = 120000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({ model: mind, messages: [{ role: "user", content: prompt }], stream: false, options: { num_predict: maxTokens, temperature: 0 } }),
    });
    if (!res.ok) throw new Error(`ollama ${res.status}`);
    const data = await res.json();
    const text = (data?.message?.content ?? "").trim();
    appendLog({ at: new Date().toISOString(), act: "eva", kind: "mind", mind, prompt: prompt.slice(0, 200), answer: text.slice(0, 300) });
    return { text, giver: `mind:${mind}` };
  } finally {
    clearTimeout(timer);
  }
}

// REC: the homeostatic choice + the recovery ladder + the cache.
export function choosePath(results, vitals, { mind = null, probe = null, docClass = null } = {}) {
  const reg = regulate(vitals);
  const ok = results.filter((r) => r.ok);
  let path = ok[0]?.path ?? "mechanical-ocr";
  let why = ok.length
    ? `fastest ok path (${ok[0].path}, ${ok[0].ms}ms)`
    : "no vision path ok — recovery ladder falls back to mechanical OCR";
  if (reg.act === "defer") why = `box ${reg.saturated ? "saturated" : "slow"} (cpuIdle ${reg.idle}) — ${why}`;
  // a degraded fallback (mechanical OCR) is never cached — the box may have
  // been transiently down, and the next ingest should re-probe vision, not
  // stay downgraded forever.
  if (docClass && path !== "mechanical-ocr") { CHOICE_CACHE.set(`${docClass}:vision`, path); saveChoiceCache(); }
  const note = { at: new Date().toISOString(), act: "rec", kind: "path", path, why, docClass, setpoint: reg.setpoint, deviating: reg.deviating };
  appendLog(note);
  return { path, why, reg, note, mindAnswer: null };
}

export function recoveryLadder(results) {
  const ok = results.filter((r) => r.ok);
  return ok.length ? ok[0].path : "mechanical-ocr";
}

export function cachedVisionPath(docClass) {
  return CHOICE_CACHE.get(`${docClass}:vision`) ?? null;
}

// a reasoning-linted finding, append-only — the shape the reasoning-lint
// machinery reads, with the giver and standing disclosed.
export function lintedNote({ kind, level, severity, note, giver, standing, probe = null, docClass = null } = {}) {
  const entry = { at: new Date().toISOString(), act: "note", kind, level, severity, note, giver, standing, probe, docClass };
  appendLog(entry);
  return entry;
}

// ── THE HOLONIC LOOP TREE ────────────────────────────────────────────────
// DEF: every watcher is a whole-and-part. The root tick is the root holon; a
// concern may declare a CHILD holon — its own DEF (the void it watches), EVA
// (a sense that probes and returns a finding or null), REC (an act that
// re-zeros on that finding) — and that holon may declare holons of its own.
// A holon is bounded the way the root is: it runs on its own cadence, its
// sense is single-flight (a slow sense never stacks), and its act may spend
// the SNACK (one bounded, cached mind-call) but never a probe of its own
// that creates the load it measures. Findings land on the ledger, giver
// heimdall, standing disclosed.
const HOLONS = new Map(); // name -> holon

export function declareLoop({ name, def, cadenceMs = 30000, sense, act, parent = null }) {
  if (HOLONS.has(name)) return HOLONS.get(name);
  const holon = { name, def, cadenceMs, sense, act, parent, last: 0, running: false, findings: [], children: [] };
  HOLONS.set(name, holon);
  if (parent && HOLONS.has(parent)) HOLONS.get(parent).children.push(name);
  appendLog({ act: "def", holon: name, def, cadenceMs, parent: parent ?? null, giver: "heimdall", standing: "disclosed" });
  return holon;
}

export function holonTree() {
  return [...HOLONS.entries()].map(([name, h]) => ({
    name, def: h.def, cadenceMs: h.cadenceMs, parent: h.parent,
    children: h.children, findings: h.findings.length, running: h.running,
  }));
}

async function runHolon(h) {
  if (h.running) return; // single-flight: a slow sense never stacks
  if (Date.now() - h.last < h.cadenceMs) return;
  h.running = true;
  h.last = Date.now();
  try {
    const finding = await h.sense();
    if (finding) {
      h.findings.push(finding);
      h.findings = h.findings.slice(-8);
      const acted = await h.act(finding);
      appendLog({ act: "rec", holon: h.name, finding: finding.class ?? null, probe: finding.probe ?? null, ...acted, giver: "heimdall", standing: "disclosed" });
      if (acted?.note) {
        lintedNote({ kind: "infra", level: "warn", severity: "medium", note: `${h.name}: ${acted.note}`, giver: "heimdall", standing: "disclosed", probe: finding.probe ?? h.name });
      }
    }
  } catch (err) {
    appendLog({ act: "eva", holon: h.name, error: err.message, giver: "heimdall", standing: "disclosed" });
  } finally {
    h.running = false;
  }
}

export async function runHolonTree() {
  for (const h of HOLONS.values()) {
    await runHolon(h);
    for (const c of h.children) { const child = HOLONS.get(c); if (child) await runHolon(child); }
  }
}

// ── THE SNACK ────────────────────────────────────────────────────────────
// A finding that recurs is a candidate for a RULE: instead of re-deciding
// every tick, consult a mind ONCE per (class:probe) window and keep the
// minted rule. This is the one model call the watcher may spend — a snack,
// never a meal — bounded by budget, cached so a recurring finding never
// re-pays it, and linted (giver mind:<model>, standing disclosed) so the
// reasoning stays on the record in the shape the lint machinery reads.
const RULE_CACHE = new Map(); // `${class}:${probe}` -> { rule, giver, mintedAt }
const RULE_TTL_MS = 60 * 60 * 1000;

export async function mintRule({ finding, evidence = "", mind = "qwen3:30b-a3b", budgetMs = 60000 }) {
  const key = `${finding?.class ?? "?"}:${finding?.probe ?? ""}`;
  const hit = RULE_CACHE.get(key);
  if (hit && Date.now() - hit.mintedAt < RULE_TTL_MS) return hit;
  const prompt = [
    "Heimdall keeps the local model bridge on schedule. A finding just recurred.",
    "",
    `finding: ${JSON.stringify(finding ?? {}, null, 2)}`,
    evidence ? `evidence: ${evidence}` : null,
    "",
    "Give ONE operational rule to keep things flowing — short, concrete, actionable, plain prose. No preamble.",
  ].filter(Boolean).join("\n");
  let rule, giver;
  try {
    const r = await consultMind(prompt, { mind, maxTokens: 160, timeoutMs: budgetMs });
    rule = r.text.trim();
    giver = r.giver;
  } catch (err) {
    rule = `(snack failed: ${err.message})`;
    giver = "heimdall";
  }
  const entry = { rule, giver, mintedAt: Date.now(), finding: finding?.class ?? null, probe: finding?.probe ?? null };
  RULE_CACHE.set(key, entry);
  lintedNote({ kind: "infra", level: "warn", severity: "medium", note: `heimdall rule (${key}): ${rule}`, giver, standing: "disclosed", probe: key });
  return entry;
}

export function mintedRules() {
  return [...RULE_CACHE.entries()].map(([k, v]) => ({ key: k, rule: v.rule, giver: v.giver, mintedAt: v.mintedAt }));
}

// ── THE DERIVED RULE-AUTHOR — the swarm writes its own rules ──────────────
// The snack (above) CONSULTS a mind when a finding recurs. This is the
// other half of "the system writes its own emergent rules": read the
// bridge's own append-only ledger — the pheromone trail every finding,
// every act, every crossing deposits — and DERIVE a standing rule from the
// measured pattern itself. No mind call: the rule IS the generalization of
// what the ledger shows happened, stated in the house's own act-vocabulary
// (DEF→EVA→REC), with the recurrence count as its evidence.
//
// The wall (II.23, "a control built to fail"): a derived rule is only minted
// when the pattern has recurred PAST A MEASURED FLOOR (a single event is a
// fact, not a pattern — three in the window is), and each rule carries its
// falsifying control — the counterfactual that, if it fires, concedes the
// rule (REC). A rule that cannot be refuted is a superstition wearing a
// rule's clothes, and is not minted.
//
// The derived rules live beside the snack's in a persistent store, keyed by
// (finding-class:probe) so a recurring pattern never re-derives every tick.
const DERIVED_RULES_FILE = path.join(HERE, "heimdall-derived-rules.json");
const DERIVED_FLOOR = Number(process.env.ER7_DERIVED_RULE_FLOOR ?? 3);
const DERIVED_WINDOW_MS = Number(process.env.ER7_DERIVED_RULE_WINDOW ?? 30 * 60 * 1000);

// The rule templates: how a recorded finding becomes a standing rule. Each
// carries its falsifying control — the counterfactual that concedes it.
// PURE, no ledger access: given the measured facts, say what the bridge
// learned. Giver is always heimdall (the ledger's own voice), standing
// disclosed, and the rule rides the lint machinery like every other note.
const DERIVED_TEMPLATES = Object.freeze({
  window_changed: Object.freeze({
    control: "a caller asking the SAME num_ctx as the loaded window must NOT trigger a reload (a reload on a matching window would concede this rule)",
  }),
  model_dropped: Object.freeze({
    control: "a re-warmed model must NOT drop again within one keep_alive window of the warm (a drop right after re-warm concedes this rule)",
  }),
  saturated: Object.freeze({
    control: "a refusal at saturation must be followed by a recovery, not a stall (a saturation refusal that never recovers concedes this rule)",
  }),
  forward_failed: Object.freeze({
    control: "a re-forwarded request must land (a repeat forward_failed for the same probe concedes this rule)",
  }),
  // A definitive surface refusal (nothing listening — ECONNREFUSED and kin,
  // or a real non-200 from the health path). Learned 2026-09-17: er7 refused
  // 3 times in 13min while a client spun thousands of instant failures
  // against it, and the rule-author could not even count the pattern — a
  // DOWN transition carried no finding class, so the learning loop was blind
  // to the bridge's own outages. Control below.
  // Learned 2026-09-19: three large-model loads hung (qwen3:4b abort→cascade,
  // 14B-Q4 120s timeout, coder:7b 420s timeout) while the daemon answered a
  // resident model in 2.7s — CPU idle read "fine" with ~47MB free pages.
  // Memory pressure is its own admission signal, not a footnote on saturation.
  memory_pressured: Object.freeze({
    control: "a non-resident model of ANY size that loads AND answers while free pages sit below the floor concedes this rule — headroom, not hope, decides",
  }),
});

/** Derive a rule from measured findings, or null when the pattern is not yet
 *  a pattern. `count` is how many times this class recurred in the window;
 *  `first`/`last` bound the span. A rule carries the observation it was
 *  derived from and its falsifying control — both on the record. */
export function deriveRule({ class: cls, probe = null, count, first, last, model = null } = {}) {
  if (count < DERIVED_FLOOR) return null; // a single event is a fact, not a pattern
  const tpl = DERIVED_TEMPLATES[cls];
  if (!tpl) return null; // a class with no template is unmeasured — no rule
  const spanMin = first && last ? Math.max(1, Math.round((last - first) / 60000)) : null;
  const rule = [
    `${cls} recurred ${count} times in ${spanMin ? `${spanMin}min` : "the window"}${model ? ` (${model})` : ""} — the bridge's own ledger says:`,
    RULE_TEXT[cls],
    `Control: ${tpl.control}`,
  ].join(" ");
  return { class: cls, probe, count, spanMin, model, rule, giver: "heimdall", standing: "disclosed", control: tpl.control };
}

// The plain-language rule each recorded finding class earns — stated in the
// house's own voice, never a preference dressed as a fact.
const RULE_TEXT = Object.freeze({
  window_changed: "declare ONE num_ctx per model and hold it — a model reloaded at a different window pays a full load every switch.",
  model_dropped: "hold the horses that served: a used model that drops is re-warmed (one per cadence, never into a saturated box) before the next caller eats the cold-load.",
  saturated: "admission is the gate: when the box is pegged, refuse with Retry-After and hold — never let a busy box be warmed into a deeper storm.",
  forward_failed: "a wedged upstream is a typed gap, never a hang — probe first, refuse with a reason, and retry only what can land.",
  surface_down: "nothing listening is down, never busy: re-forge a forgeable surface at once, escalate a self surface at once, and confirm the recovery on a fresh probe — a timeout is never this finding.",
  memory_pressured: "free pages are admission-grade: a model that is not resident is refused fast below the floor, whatever its size — a load attempted without headroom hangs for minutes and poisons the session behind it, and hope is not headroom.",
});

let derivedRules = loadDerivedRules();
function loadDerivedRules() {
  try {
    const d = JSON.parse(fs.readFileSync(DERIVED_RULES_FILE, "utf8"));
    return new Map(Object.entries(d));
  } catch { return new Map(); }
}
function saveDerivedRules() {
  try { fs.writeFileSync(DERIVED_RULES_FILE, JSON.stringify(Object.fromEntries(derivedRules))); } catch { /* never crashes the watcher */ }
}

/** Record a derived rule. Keyed by (class:probe) so a recurring pattern
 *  never re-derives every tick; the rule carries its evidence and control. */
export function adoptDerivedRule(r) {
  if (!r) return null;
  const key = `${r.class}:${r.probe ?? ""}`;
  derivedRules.set(key, { ...r, adoptedAt: Date.now() });
  saveDerivedRules();
  lintedNote({ kind: "infra", level: "warn", severity: "medium", note: `heimdall derived rule (${key}): ${r.rule}`, giver: r.giver, standing: r.standing, probe: key });
  return r;
}

export function derivedRuleStore() {
  return [...derivedRules.entries()].map(([k, v]) => ({ key: k, ...v }));
}

/** CONCEDE a derived rule (REC): its falsifying control fired. The rule's
 *  own text stays on the record (append-only — a conceded rule is a rule
 *  that WAS), but it no longer stands. */
export function concedeDerivedRule(key, { reason } = {}) {
  if (!derivedRules.has(key)) return null;
  const prior = derivedRules.get(key);
  derivedRules.set(key, { ...prior, standing: "conceded", concededAt: Date.now(), concededReason: reason ?? "control fired" });
  saveDerivedRules();
  lintedNote({ kind: "infra", level: "warn", severity: "medium", note: `heimdall derived rule CONCEDED (${key}): ${reason ?? "control fired"}`, giver: "heimdall", standing: "disclosed", probe: key });
  return derivedRules.get(key);
}

// ── THE RULE-AUTHOR HOLON — the swarm watches its own ledger ──────────────
// The emergent loop itself: every tick, read the bridge's own append-only
// ledger, count how often each finding-class recurred in the window, and
// DERIVE a standing rule when the pattern has earned one (past DERIVED_FLOOR).
// The rule is adopted only when absent (a recurring pattern never re-derives
// every tick), and a rule whose falsifying control fires is conceded. This
// is the swarm becoming literate: the bridge learns its own rules from its
// own recorded history, no mind, no hand.
export function makeRuleAuthorHolon({ logLines = memoryLinesForWindow, now = Date.now, log = () => {} } = {}) {
  return {
    sense: async () => {
      const lines = logLines(4000); // enough history for the window
      const counts = new Map(); // class:probe -> { class, probe, count, first, last, model }
      const t0 = now() - DERIVED_WINDOW_MS;
      for (const line of lines) {
        let e; try { e = JSON.parse(line); } catch { continue; }
        if (!e?.act) continue;
        const cls = e.finding ?? e.class ?? null;
        const probe = e.model ?? e.probe ?? e.surface ?? null;
        if (!cls) continue;
        // A SNAPSHOT line is a FOLDED set of occurrences (the memory's trim):
        // it carries its own first/last and a count instead of one `at`. The
        // window filter reads the folded first, and the count multiplies — the
        // learner sees the pattern exactly as the verbatim ledger would.
        const at = Date.parse(e.first ?? e.at ?? "");
        if (!Number.isFinite(at) || at < t0) continue;
        const key = `${cls}:${probe ?? ""}`;
        const c = counts.get(key) ?? { class: cls, probe, count: 0, first: at, last: at, model: probe };
        c.count += Number.isFinite(e.count) ? e.count : 1;
        if (at < c.first) c.first = at;
        const last = Date.parse(e.last ?? "");
        if (Number.isFinite(last) && last > c.last) c.last = last;
        counts.set(key, c);
      }
      // A class that recurred past the floor and has no LIVE derived rule yet.
      const candidates = [...counts.values()].filter((c) => c.count >= DERIVED_FLOOR);
      const ready = [];
      for (const c of candidates) {
        const key = `${c.class}:${c.probe ?? ""}`;
        const existing = derivedRules.get(key);
        if (existing && existing.standing !== "conceded") continue; // already stands
        ready.push(c);
      }
      return ready.length ? { class: "pattern_earned", candidates: ready } : null;
    },
    act: async (finding) => {
      const adopted = [];
      for (const c of finding.candidates) {
        const r = deriveRule({ ...c, first: c.first, last: c.last });
        if (r) { adoptDerivedRule(r); adopted.push(r); }
      }
      return { note: adopted.length ? `adopted ${adopted.length} derived rule(s): ${adopted.map((r) => `${r.class}:${r.probe}`).join(", ")}` : null, adopted: adopted.length };
    },
  };
}

// ── THE MESSAGE — what a response is told ────────────────────────────────
// The bridge ALWAYS states which model returned an answer (attribution is
// not optional). Heimdall's own words are rarer than that: he speaks into a
// response ONLY when there has been a problem (a finding to disclose), and
// even then at most once per RATE window — a god at Bifröst groans when the
// bridge does, not on every passing foot. `note` is the finding; without it
// there is no message at all.
let lastSpokeAt = 0;
const MESSAGE_RATE_MS = Number(process.env.ER7_HEIMDALL_MESSAGE_RATE_MS ?? 60000);

export function bridgeMessage({ model = null, note = null } = {}) {
  const now = Date.now();
  const m = { giver: "heimdall", standing: "disclosed", at: ts(), model };
  if (!note) return m; // nothing wrong — state the model, hold the tongue
  if (now - lastSpokeAt < MESSAGE_RATE_MS) return m; // spoke too recently — stay silent
  lastSpokeAt = now;
  return { ...m, note };
}

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
// ── STANDALONE MODE ───────────────────────────────────────────────────────
// When heimdall.mjs is the MAIN ENTRY it runs its own steer server + watcher
// on STEER_PORT. When IMPORTED (the proxy wires the watcher in), nothing
// listens here — the machinery above is what the proxy uses.
if (isMain) {
  schedule();
  steer.listen(STEER_PORT, "127.0.0.1", () => {
    log(`Heimdall steering on http://127.0.0.1:${STEER_PORT} — ${surfaces.length} surface(s): ${surfaces.map((s) => `${s.name}(${s.family})`).join(", ")} (family cap ${FAMILY_CAP}, tick ${selfDefenseIntervalMs}ms)`);
    appendLog({ act: "def", steered: { port: STEER_PORT, familyCap: FAMILY_CAP, retryAfterS: RETRY_AFTER_S } });
  });
}