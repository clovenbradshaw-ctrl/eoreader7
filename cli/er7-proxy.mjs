#!/usr/bin/env node
// er7-proxy — commandline launcher for the EOReader7 OpenAI-compatible proxy.
//
//   er7-proxy start            start the proxy (daemon, logs to proxy.log)
//   er7-proxy stop             stop the proxy
//   er7-proxy status           is it up? where?
//   er7-proxy restart          stop then start
//   er7-proxy log              tail the runtime log
//
// Env: ER7_PROXY_PORT (default 11436), ER7_UPSTREAM (default http://localhost:11434)

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const PROXY = path.join(REPO_ROOT, "proxy.mjs");
const PORT = Number(process.env.ER7_PROXY_PORT) || 11436;
const LOG = process.env.ER7_PROXY_LOG || path.join(REPO_ROOT, "proxy.log");
const PID_FILE = path.join(REPO_ROOT, ".er7-proxy.pid");

function isUp() {
  try {
    const res = execSync(`curl -s -m 2 http://127.0.0.1:${PORT}/health`, { encoding: "utf8" });
    return res.includes('"ok"');
  } catch {
    return false;
  }
}

function readPid() {
  try {
    return Number(fs.readFileSync(PID_FILE, "utf8").trim());
  } catch {
    return null;
  }
}

function stop() {
  const pid = readPid();
  if (pid) {
    try {
      process.kill(pid, "SIGTERM");
      fs.unlinkSync(PID_FILE);
      console.log(`stopped er7 proxy (pid ${pid})`);
      return;
    } catch {
      fs.unlinkSync(PID_FILE);
    }
  }
  console.log("er7 proxy not running");
}

async function start() {
  if (isUp()) {
    console.log(`er7 proxy already running on http://127.0.0.1:${PORT}`);
    return;
  }
  const child = spawn("node", [PROXY], { cwd: REPO_ROOT, detached: true, stdio: "ignore" });
  child.unref();
  fs.writeFileSync(LOG, "");
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (isUp()) {
      fs.writeFileSync(PID_FILE, String(child.pid));
      console.log(`er7 proxy listening on http://127.0.0.1:${PORT} (pid ${child.pid})`);
      return;
    }
  }
  console.error("er7 proxy failed to start — check proxy.log");
  process.exitCode = 1;
}

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
    break;
  case "log":
    try {
      console.log(fs.readFileSync(LOG, "utf8"));
    } catch {
      console.log("no log yet — start the proxy first");
    }
    break;
  default:
    console.error(`unknown command: ${cmd}`);
    process.exitCode = 1;
}