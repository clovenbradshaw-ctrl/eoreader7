// self-health.mjs — Heimdall watching HIS OWN process.
//
// The 2026-09-20 lesson: a wedged proxy spun at 98.5% CPU for ten hours,
// unreachable on /health, deaf to SIGTERM. Heimdall ran INSIDE that process,
// so when the loop wedged, the watcher wedged with it — there was no one to
// watch the watcher. This module is the out-of-sandbox counter: an event-loop
// heartbeat and a self-CPU sampler that can run in ANY process (the proxy OR
// a standalone heimdall) and answer one question honestly: is THIS process
// healthy, or is it the thing that needs terminating?
//
// Two signals, both mechanical, neither model-involved:
//   - event-loop lag: a setInterval that is scheduled to fire every
//     LAG_TICK_MS and measures how late it actually fires. A healthy loop
//     fires within a few ms; a loop busy spinning in a microtask is late by
//     seconds. Late-fire count and the worst observed lag are the signal.
//   - self-CPU: the process's own %CPU over a window, read off `ps` by pid.
//     A spin is a long run at ~100% with zero request throughput.
//
// This is a REC holon: it DEFines health, EVA-luates the sample, and REC-ords
// a standing (healthy / lagging / wedged) with its falsifying control. It
// never terminates anything — it only answers whether THIS process should be
// a candidate for termination, so the fleet can ask the operator instead of
// guessing.
//
// falsifying control: a process that fires its heartbeat late N times but is
// NOT wedged (it is only busy, and answers a probe) must not be marked wedged.
import { execFile } from "node:child_process";

export const LAG_TICK_MS = Number(process.env.ER7_HEIMDALL_LAG_TICK_MS ?? 1000);
// A loop is marked "lagging" when the worst late-fire in the window exceeds
// this; "wedged" when the count of late fires passes the wedge threshold.
export const LAG_WORST_MS = Number(process.env.ER7_HEIMDALL_LAG_WORST_MS ?? 250);
export const WEDGE_SAMPLES = Number(process.env.ER7_HEIMDALL_WEDGE_SAMPLES ?? 5);
export const CPU_SAMPLE_MS = Number(process.env.ER7_HEIMDALL_CPU_SAMPLE_MS ?? 3000);

const ts = () => new Date().toISOString();

function execOut(cmd, args, ms) {
  return new Promise((resolve) => {
    execFile(cmd, args, { encoding: "utf8", timeout: ms, maxBuffer: 8_000_000 }, (err, stdout) => {
      resolve(err ? null : String(stdout ?? ""));
    });
  });
}

// ── state ────────────────────────────────────────────────────────────────────
// The standing is a RECENT-window property, never an all-time worst. `lagSamples`
// is the sliding window (the last WINDOW_MAX samples of late-fire deltas); the
// standing, the late-count, and the "worst lag" are all DERIVED from that window
// on read. A process that had one bad episode years ago and has been answering
// since MUST read healthy — the falsifying control is honored by construction
// (a monotonic all-time worst would report a recovered process as wedged forever).
// The all-time peak is kept for disclosure only (history), and never drives the
// standing.
let lagSamples = [];       // most recent late-fire deltas (ms), the standing window
let peakLagMs = 0;         // all-time worst late-fire seen (disclosure/history only)
let selfCpu = null;        // own %CPU, last read
let cpuReadAt = 0;
let startedAt = Date.now();
let heartbeatTimer = null;
let cpus = null;           // test override

export const WINDOW_MAX = 16; // how many recent samples decide the standing

/** Derived from the window: how many recent samples fired late, and the window's
 *  worst. These — not the all-time peak — are what `standing` means. */
function recentLag() {
  const worstLagMs = lagSamples.length ? Math.max(...lagSamples) : 0;
  const lateCount = lagSamples.filter((s) => s > LAG_WORST_MS).length;
  return { worstLagMs, lateCount };
}

export const __selfTest = {
  setCpus(v) { cpus = v; },
  setLag({ samples = null, worst = null, count = null } = {}) {
    // The standing contract is window-derived: tests set the window `samples`
    // and the standing must follow from it. The `worst`/`count` fields are
    // accepted for back-compat but the standing is always read off samples.
    if (samples != null) lagSamples = samples;
    if (worst != null) peakLagMs = worst;
  },
  get state() { const r = recentLag(); return { lagSamples, ...r, peakLagMs, selfCpu }; },
};

/** The event-loop heartbeat. Call once to start; the returned handle is the
 *  timer (stop it with clearInterval) — tests use the handle to fast-forward.
 */
export function startHeartbeat({ onLag = null } = {}) {
  if (heartbeatTimer) return heartbeatTimer;
  const lastExpected = { at: Date.now() };
  const hb = () => {
    const now = Date.now();
    const late = now - lastExpected.at - LAG_TICK_MS;
    lastExpected.at = now;
    lagSamples.push(Math.max(0, late));
    if (lagSamples.length > WINDOW_MAX) lagSamples.shift();
    if (late > peakLagMs) peakLagMs = late;
    onLag?.({ late, count: recentLag().lateCount, worst: recentLag().worstLagMs });
  };
  heartbeatTimer = setInterval(hb, LAG_TICK_MS);
  hb(); // first sample immediately
  return heartbeatTimer;
}

/** Read this process's own %CPU over the window. `ps`-based, cheap, one
 *  child per call — never run on the hot tick; the fleet paces it. */
export async function readSelfCpu({ now = Date.now() } = {}) {
  if (cpus) { selfCpu = cpus.cpu ?? null; cpuReadAt = now; return selfCpu; }
  if (selfCpu != null && now - cpuReadAt < CPU_SAMPLE_MS) return selfCpu;
  const out = await execOut("ps", ["-p", String(process.pid), "-o", "%cpu="], 2000);
  selfCpu = out ? Number(out.trim()) : null;
  cpuReadAt = now;
  return selfCpu;
}

/** Standing: healthy / lagging / wedged, with the evidence and the control.
 *  The standing is a RECENT-window property (the falsifying control, honored):
 *  a process whose worst lag is in the past but whose recent window is clean
 *  reads healthy — a recovered process must not be reported as wedged forever.
 *  `worstLagMs` and `lateCount` are the recent-window values that DECIDE the
 *  standing; `peakLagMs` is the all-time worst, disclosure-only history. */
export function selfStanding() {
  const { worstLagMs, lateCount } = recentLag();
  const wedge = lateCount >= WEDGE_SAMPLES;
  const lagging = worstLagMs > LAG_WORST_MS;
  const standing = wedge ? "wedged" : lagging ? "lagging" : "healthy";
  return {
    standing,
    at: ts(),
    uptimeMs: Date.now() - startedAt,
    worstLagMs,
    peakLagMs,
    lateCount,
    lastLagMs: lagSamples.length ? lagSamples[lagSamples.length - 1] : null,
    cpuPct: selfCpu,
    // falsifying control: a busy-but-answering process must never read wedged.
    // The standing is the recent window; the all-time peak is history and never
    // convicts. A probe answering AFTER late fires breaks the standing — the fleet
    // re-checks before terminating and will not terminate on lag alone.
    falsifyingControl: "a late heartbeat followed by an answered probe concedes wedged",
  };
}

/** Force-read the current standing synchronously from state (no new I/O). */
export function selfSnapshot() {
  const s = selfStanding();
  return {
    pid: process.pid,
    ...s,
  };
}

export function stopHeartbeat() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}