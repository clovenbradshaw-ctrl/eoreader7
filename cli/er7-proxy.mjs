#!/usr/bin/env node
// er7-proxy — commandline launcher for the EOReader7 OpenAI-compatible proxy.
//
//   er7-proxy start            start the proxy (daemon, logs to proxy.log)
//   er7-proxy stop             stop the proxy
//   er7-proxy status           is it up? where? (proxy + heimdall fleet)
//   er7-proxy restart          stop then start
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

function stopOne(pidFile, name) {
  const pid = readPid(pidFile);
  if (pid) {
    try {
      process.kill(pid, "SIGTERM");
      fs.unlinkSync(pidFile);
      console.log(`stopped ${name} (pid ${pid})`);
      return;
    } catch {
      fs.unlinkSync(pidFile);
    }
  }
  console.log(`${name} not running`);
}

function stop() {
  stopOne(PID_FILE, "er7 proxy");
  stopOne(FLEET_PID_FILE, "heimdall fleet");
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
  const child = spawn("node", [PROXY], { cwd: REPO_ROOT, detached: true, stdio: "ignore", env });
  child.unref();
  fs.writeFileSync(LOG, "");
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (isUp()) {
      fs.writeFileSync(PID_FILE, String(child.pid));
      if (!quiet) console.log(`er7 proxy listening on http://127.0.0.1:${PORT} (pid ${child.pid})`);
      return { started: true, alreadyRunning: false, port: PORT, pid: child.pid, fleet };
    }
  }
  if (!quiet) console.error("er7 proxy failed to start — check proxy.log");
  return { started: false, alreadyRunning: false, port: PORT, error: "timed out waiting for /health", fleet };
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
      stop();
      break;
    case "restart":
      stop();
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
      stopOne(FLEET_PID_FILE, "heimdall fleet");
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