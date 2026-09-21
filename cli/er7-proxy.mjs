#!/usr/bin/env node
// er7-proxy — commandline launcher for the EOReader7 OpenAI-compatible proxy.
//
//   er7-proxy start            start the proxy (daemon, logs to proxy.log)
//   er7-proxy stop             stop the proxy
//   er7-proxy status           is it up? where? (proxy + heimdall fleet)
//   er7-proxy restart          stop then start (atomic: waits for the old process to die)
//   er7-proxy log              tail the runtime log
//   er7-proxy fleet:start      start the external heimdall fleet supervisor
//   er7-proxy fleet:stop       stop the fleet
//   er7-proxy fleet:status     is the fleet up?
//   er7-proxy fleet:log        tail the fleet log
//
// `start` brings up the external heimdall fleet (heimdall-fleet.mjs, port
// 11438) first, then the proxy — launched as a thin sandbox
// (ER7_EXTERNAL_HEIMDALL=1) only when a watcher is actually answering. The
// fleet watches the proxy from OUTSIDE the process, so a wedged proxy can
// never take its own watcher down with it (the 2026-09-20 lesson).
//
// Env: ER7_PROXY_PORT (default 11436), ER7_UPSTREAM (default http://localhost:11434)

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const PROXY = path.join(REPO_ROOT, "proxy.mjs");
const FLEET = path.join(REPO_ROOT, "heimdall-fleet.mjs");
export const PORT = Number(process.env.ER7_PROXY_PORT) || 11436;
export const FLEET_PORT = Number(process.env.ER7_HEIMDALL_FLEET_PORT) || 11438;
const LOG = process.env.ER7_PROXY_LOG || path.join(REPO_ROOT, "proxy.log");
const PID_FILE = path.join(REPO_ROOT, ".er7-proxy.pid");
const FLEET_LOG = path.join(REPO_ROOT, "heimdall-fleet.log");
const FLEET_PID_FILE = path.join(REPO_ROOT, ".er7-fleet.pid");
// Atomic restart (2026-09-21): `restart` must never spawn over a draining
// instance. The proxy answers SIGTERM gracefully (shutdown() closes the
// listening socket, drops connections, and exits within ~1.5s), so stop()
// WAITS for the pid to actually die before start() spawns; a process that
// survives the grace window is escalated to SIGKILL, never left to squat the
// port while a replacement tries to bind it.
const STOP_WAIT_MS = Number(process.env.ER7_PROXY_STOP_WAIT ?? 5000);
const STOP_POLL_MS = 150;

// isUp/start are exported so the TUI (tui.mjs, via proxy-client.mjs) can
// reuse the EXACT same health check and boot sequence `er7-proxy start`
// uses on the CLI — no second implementation to drift out of sync.
export function isUp() {
  try {
    const res = execSync(`curl -s -m 2 http://127.0.0.1:${PORT}/health`, { encoding: "utf8" });
    return res.includes('"ok"');
  } catch {
    return false;
  }
}

// The external heimdall fleet (2026-09-20): a supervisor that runs OUTSIDE the
// proxy process, so a wedged proxy can never take its watcher down with it.
// Same contract as the proxy health check — shared by isFleetUp/startFleet and
// the TUI's boot path.
export function isFleetUp() {
  try {
    const res = execSync(`curl -s -m 2 http://127.0.0.1:${FLEET_PORT}/health`, { encoding: "utf8" });
    return res.includes('"ok"');
  } catch {
    return false;
  }
}

function readPid(file) {
  try {
    return Number(fs.readFileSync(file, "utf8").trim());
  } catch {
    return null;
  }
}

// pidAlive guards pid > 1 on purpose: process.kill(0, ...) signals the whole
// process group, and a garbage pid file must never reach that call.
function pidAlive(pid) {
  if (!(pid > 1)) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function waitUntilGone(pid, { timeoutMs = STOP_WAIT_MS } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!pidAlive(pid)) return true;
    await new Promise((r) => setTimeout(r, STOP_POLL_MS));
  }
  return !pidAlive(pid);
}

// Stop ONE process and WAIT until it is actually gone before returning. A
// graceful SIGTERM is given the full window; a process that survives it is
// escalated to SIGKILL. The port is free before anyone spawns a replacement.
async function stopOne(pidFile, name, { wait = true } = {}) {
  const pid = readPid(pidFile);
  if (!pid || !(pid > 1)) {
    console.log(`${name} not running`);
    return;
  }
  if (!pidAlive(pid)) {
    fs.unlinkSync(pidFile); // stale pid file: the process is already gone
    console.log(`${name} not running (stale pid ${pid})`);
    return;
  }
  try { process.kill(pid, "SIGTERM"); } catch {}
  if (wait) {
    if (!(await waitUntilGone(pid))) {
      try { process.kill(pid, "SIGKILL"); } catch {}
      await waitUntilGone(pid);
    }
  } else {
    await new Promise((r) => setTimeout(r, 100));
  }
  try { fs.unlinkSync(pidFile); } catch {}
  console.log(`stopped ${name} (pid ${pid})`);
}

async function stop() {
  await stopOne(PID_FILE, "er7 proxy");
  await stopOne(FLEET_PID_FILE, "heimdall fleet");
}

// `quiet` lets a caller (the TUI) boot the proxy without this module's own
// console.log lines landing in the middle of an Ink render — same spawn +
// health-check loop either way, just without the narration.
export async function start({ quiet = false } = {}) {
  // The external fleet goes up FIRST: the proxy is launched as a thin sandbox
  // (ER7_EXTERNAL_HEIMDALL=1) only when a watcher is actually answering, so a
  // failed fleet never leaves the proxy unsupervised. Best-effort — the fleet
  // is an addition; the proxy runs either way.
  const fleet = await startFleet({ quiet });
  if (isUp()) {
    if (!quiet) console.log(`er7 proxy already running on http://127.0.0.1:${PORT}`);
    return { started: false, alreadyRunning: true, port: PORT, fleet };
  }
  const env = { ...process.env };
  if (fleet.started || fleet.alreadyRunning) env.ER7_EXTERNAL_HEIMDALL = "1";
  // Spawn with retry: a child that crashes before it answers /health (almost
  // always EADDRINUSE — the previous instance's socket was still draining) is
  // a FALSE failure, never a real one. Retry after the port settles instead of
  // reporting failure and leaving the box dark.
  const MAX_ATTEMPTS = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const child = spawn("node", [PROXY], { cwd: REPO_ROOT, detached: true, stdio: "ignore", env });
    // Keep the handle referenced until the child proves it is up, so an early
    // crash is observable and retried rather than silently orphaned.
    let exited = null;
    child.once("exit", (code, signal) => { exited = { code, signal }; });
    fs.writeFileSync(LOG, "");
    let answered = false;
    for (let i = 0; i < 50; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (isUp()) { answered = true; break; }
      if (exited) break;
    }
    if (answered) {
      child.unref();
      if (exited) {
        // Something else answered /health while our child crashed — adopt, and
        // never overwrite a running process's pid with a dead child's.
        if (!quiet) console.log(`er7 proxy already running on http://127.0.0.1:${PORT} (our spawn exited)`);
        return { started: false, alreadyRunning: true, port: PORT, fleet };
      }
      fs.writeFileSync(PID_FILE, String(child.pid));
      if (!quiet) console.log(`er7 proxy listening on http://127.0.0.1:${PORT} (pid ${child.pid})`);
      return { started: true, alreadyRunning: false, port: PORT, pid: child.pid, fleet };
    }
    child.unref();
    if (!exited) {
      if (!quiet) console.error("er7 proxy failed to start — check proxy.log");
      return { started: false, alreadyRunning: false, port: PORT, error: "timed out waiting for /health", fleet };
    }
    lastError = `attempt ${attempt} child exited before answering (code ${exited.code}, signal ${exited.signal})`;
    await new Promise((r) => setTimeout(r, 500 * attempt));
  }
  if (!quiet) console.error(`er7 proxy failed to start after ${MAX_ATTEMPTS} attempts — check proxy.log`);
  return { started: false, alreadyRunning: false, port: PORT, error: lastError, fleet };
}

export async function startFleet({ quiet = false } = {}) {
  if (isFleetUp()) {
    if (!quiet) console.log(`heimdall fleet already running on http://127.0.0.1:${FLEET_PORT}`);
    return { started: false, alreadyRunning: true, port: FLEET_PORT };
  }
  // Persist the peer mesh config so a restart (`er7-proxy restart`) does not
  // lose it: the fleet reads ER7_HEIMDALL_PEERS first, then falls back to this
  // file. A multi-heimdall mesh survives managed restarts.
  const peers = process.env.ER7_HEIMDALL_PEERS ?? "";
  if (peers.trim()) {
    try {
      const peersFile = process.env.ER7_HEIMDALL_PEERS_FILE || path.join(REPO_ROOT, ".er7-fleet.peers");
      fs.writeFileSync(peersFile, peers.trim() + "\n");
    } catch {}
  }
  const out = fs.openSync(FLEET_LOG, "a");
  const child = spawn("node", [FLEET, "--operator", "log"], { cwd: REPO_ROOT, detached: true, stdio: ["ignore", out, out] });
  child.unref();
  fs.closeSync(out);
  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (isFleetUp()) {
      fs.writeFileSync(FLEET_PID_FILE, String(child.pid));
      if (!quiet) console.log(`heimdall fleet listening on http://127.0.0.1:${FLEET_PORT} (pid ${child.pid})`);
      return { started: true, alreadyRunning: false, port: FLEET_PORT, pid: child.pid };
    }
  }
  if (!quiet) console.error("heimdall fleet failed to start — check heimdall-fleet.log");
  return { started: false, alreadyRunning: false, port: FLEET_PORT, error: "timed out waiting for /health" };
}

// Only run the CLI dispatch when this file is the process entry point —
// importing it (from proxy-client.mjs, for the TUI) must not also run
// `start` on module load.
const isMain = path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const cmd = process.argv[2] ?? "start";
  switch (cmd) {
    case "start":
      await start();
      break;
    case "stop":
      await stop();
      break;
    case "restart":
      // Proxy only — the external fleet survives a proxy restart, so its
      // raise state (pending escalations) is not lost. stopOne WAITS until the
      // old proxy is actually dead, so start() never spawns over a draining
      // socket (the EADDRINUSE/EADDRINUSE churn that killed mid-run turns).
      await stopOne(PID_FILE, "er7 proxy");
      await start();
      break;
    case "status":
      console.log(isUp() ? `running on http://127.0.0.1:${PORT}` : "not running");
      console.log(isFleetUp() ? `heimdall fleet on http://127.0.0.1:${FLEET_PORT}` : "heimdall fleet not running");
      break;
    case "log":
      try {
        console.log(fs.readFileSync(LOG, "utf8"));
      } catch {
        console.log("no log yet — start the proxy first");
      }
      break;
    case "fleet:start":
      await startFleet();
      break;
    case "fleet:stop":
      await stopOne(FLEET_PID_FILE, "heimdall fleet");
      break;
    case "fleet:status":
      console.log(isFleetUp() ? `heimdall fleet running on http://127.0.0.1:${FLEET_PORT}` : "heimdall fleet not running");
      break;
    case "fleet:log":
      try {
        console.log(fs.readFileSync(FLEET_LOG, "utf8"));
      } catch {
        console.log("no fleet log yet");
      }
      break;
    default:
      console.error(`unknown command: ${cmd}`);
      process.exitCode = 1;
  }
}