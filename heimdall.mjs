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
// boss: the surfaces, the steering, the admission and the re-forging stay
// here; the three answer only under the bridge. The register lives in
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
//   - Every act lands on an append-only log (heimdall-log.jsonl).
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
const CHECK_INTERVAL_MS = Number(process.env.ER7_HEIMDALL_INTERVAL ?? 15000);
const HEALTH_TIMEOUT_MS = Number(process.env.ER7_HEIMDALL_HEALTH_TIMEOUT ?? 15000);
const MAX_RESTARTS = Number(process.env.ER7_HEIMDALL_MAX_RESTARTS ?? 3);
const RESTART_WINDOW_MS = Number(process.env.ER7_HEIMDALL_WINDOW ?? 10 * 60 * 1000);
const STEER_PORT = Number(process.env.ER7_HEIMDALL_PORT ?? 11437);
// Per-family admission cap (concurrent in-flight requests). Ollama is run
// CPU-only with OLLAMA_NUM_PARALLEL=4 (launchctl env, set 2026-09-16) so up
// to 4 requests per model genuinely run side by side instead of queuing
// invisibly behind one; the cap tracks that real capacity. 0 = unlimited.
const FAMILY_CAP = Number(process.env.ER7_FAMILY_CAP ?? 4);
const RETRY_AFTER_S = Number(process.env.ER7_RETRY_AFTER ?? 15);
// ── The queue, and the jump-the-cue passes (2026-09-17) ───────────────────
// A saturated box or full lane now answers with a REAL place in line, not a
// bare "try again". A bounded stock of one-use pass codes lets a caller jump
// the cue — but only a bounded ZIPPER_JUMP places, and only while the zipper
// alternation allows it: after a pass is redeemed, the next ZIPPER_DENSITY
// admissions must be pass-free, so pass-holders and everyone else merge like
// traffic at a merge — a pass train never starves the line.
const PASS_STOCK = Number(process.env.ER7_PASS_STOCK ?? 3);          // codes minted per window
const PASS_WINDOW_MS = Number(process.env.ER7_PASS_WINDOW ?? 15 * 60 * 1000);
const ZIPPER_JUMP = Number(process.env.ER7_ZIPPER_JUMP ?? 2);        // a pass jumps at most N places
const ZIPPER_DENSITY = Number(process.env.ER7_ZIPPER_DENSITY ?? 2);  // normal admissions after a pass
const WAITER_TTL_MS = Number(process.env.ER7_WAITER_TTL ?? 120 * 1000); // a stale waiter gives up its place
// ── THE SLA (2026-09-17): the longest anyone waits is tracked, committed,
// and kept as short as possible. A waiter who has been in line longer than
// the SLA is pulled to the ABSOLUTE front (longest-waiting first), so the
// guarantee is enforced by the schedule, not just reported. The target is a
// floor — Heimdall aims as short as the box allows.
const SLA_MAX_WAIT_MS = Number(process.env.ER7_SLA_MS ?? 120 * 1000); // 2 min by default
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
const effectiveDevice = () => _testDevice ?? DEVICE_ID;
const nowMs = () => _testNow ?? Date.now();
export const __queueTest = {
  setSaturated(v) { _testSaturated = v; },
  setDevice(id) { _testDevice = id; },
  setNow(ts) { _testNow = ts; },
  reset() {
    waiters.clear(); lastServed.clear(); passes.length = 0; zipperLock = 0; claims.clear();
    profiles.clear(); unservable.clear(); _testSaturated = null; _testDevice = null; _testNow = null;
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

function appendLog(entry) {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify({ at: ts(), ...entry }) + "\n", "utf8");
  } catch { /* the log must never crash the watcher */ }
}

export function logTail(n = 12) {
  try {
    return fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8").trim().split("\n").slice(-n) : [];
  } catch { return []; }
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
}));

// The surface this watcher IS, when imported into the proxy: its own port is
// watched for status but never re-forged (a proxy cannot spawn a duplicate of
// itself). null when running standalone.
let selfPort = null;
export const getSurfaces = () => surfaces;
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
const TURN_MS_SEED = 20000;
const TURN_MS_FLOOR = 5000;
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
  "hf.co/allenai/OLMo-2-0425-1B-Instruct-GGUF:latest": Object.freeze({
    defaultWindow: "huge",
    note: "always declare num_ctx (2048 loads in ~3.5s; the default window takes minutes and can hang)",
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
export function observeCall({ model, promptTokens = 0, promptMs = 0, genTokens = 0, genMs = 0, loadMs = 0, ungated = false, upstream = null, reasoningTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0, cost = null } = {}) {
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
  return t;
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

async function refreshOllamaModels() {
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
    disclosure: disclosure(),
    vitals: cachedVitals() ?? null,
    ollamaModels,
    modelQuirks: MODEL_QUIRKS,
    holons: holonTree(),
    mintedRules: mintedRules(),
    derivedRules: derivedRuleStore(),
    roomMouths: roomMouthStore(),
    throughput: throughputOf(),
    surfaces: surfaces.map((s) => ({
      name: s.name, family: s.family, port: s.port, up: s.up, reason: s.reason,
      inflight: s.inflight, cmd: s.cmd, restartsInWindow: s.restartTimes.length,
    })),
    logTail: logTail(12),
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

  // Every caller holds a place in the line (first touch enqueues them, so a
  // retry is never shuffled). A pass jump during a live zipper merge is held,
  // not misordered.
  const saturated = _testSaturated ?? boxSaturated(cachedVitals());
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
  appendLog({ act: "eva", finding: reason, key, position: eff, family, model, retryAfterS: RETRY_AFTER_S });
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
    { name: "olmo2:7b", kind: "mind", model: "olmo2:7b", costClass: "cheap", capability: "reasoning-lite" },
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

async function runHolonTree() {
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
  surface_down: Object.freeze({
    control: "a surface_down finding followed by successful crossings with no intervening re-forge, escalation, or recovery was a false conviction — the probe cried wolf, and that concedes this rule",
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
export function makeRuleAuthorHolon({ logLines = logTail, now = Date.now, log = () => {} } = {}) {
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
        const at = Date.parse(e.at ?? "");
        if (!Number.isFinite(at) || at < t0) continue;
        const key = `${cls}:${probe ?? ""}`;
        const c = counts.get(key) ?? { class: cls, probe, count: 0, first: at, last: at, model: probe };
        c.count += 1;
        if (at < c.first) c.first = at;
        if (at > c.last) c.last = at;
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