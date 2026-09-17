#!/usr/bin/env node
// browser.mjs — `eoreader7 -browser`: the local version of The Fold.
//
// The Fold is the browser surface on EOReader 7 (the sibling `../the-fold`
// repo: its web app is served by its own serve.mjs, which already mounts
// this repo's native tree and legacy engine). So this file does not ship a
// second web app — the browser version of the TUI IS The Fold, served
// locally, nothing external. This file is just the launcher that gets the
// pair up and opens the browser:
//
//   1. makes sure the er7 proxy is up (The Fold's heimdall corner folds in
//      the proxy's machine-wide queue over loopback);
//   2. makes sure The Fold's server (serve.mjs, default :8811) is up —
//      spawning it from the sibling if not;
//   3. opens the browser on it.
//
// Launchable the same way from either name: `eoreader7 -browser` or
// `TheFold` (the CLI registers both bins).

import { spawn, exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as proxyClient from "./proxy-client.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const FOLD_ROOT = path.resolve(REPO_ROOT, "..", "the-fold");
export const FOLD_PORT = Number(process.env.ER7_FOLD_PORT) || 8811;

async function foldUp(port = FOLD_PORT) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Bring The Fold up locally and return its URL. Boots the er7 proxy first
 *  (The Fold folds the proxy's heimdall corner into its own /heimdall), then
 *  spawns the fold's own serve.mjs from the sibling repo if it is not already
 *  listening. */
export async function serveFold({ open = true, port } = {}) {
  const foldPort = port ?? FOLD_PORT;
  if (!proxyClient.isUp()) {
    const res = await proxyClient.ensureRunning();
    if (!proxyClient.isUp()) throw new Error(res.error || "failed to start the er7 proxy");
  }

  if (!fs.existsSync(path.join(FOLD_ROOT, "serve.mjs"))) {
    throw new Error(
      `The Fold is not present at ${FOLD_ROOT}.\n` +
      `eoreader7 -browser IS The Fold served locally — clone it as a sibling:\n` +
      `  git clone --recurse-submodules https://github.com/clovenbradshaw-ctrl/the-fold.git ${FOLD_ROOT}\n` +
      `then run the fold's own launcher once (${FOLD_ROOT}/fold) to install its node_modules.`);
  }

  if (!(await foldUp(foldPort))) {
    const child = spawn("node", ["serve.mjs", String(foldPort)], {
      cwd: FOLD_ROOT,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, THE_FOLD_NO_OPEN: "1" },
    });
    child.unref();
    let up = false;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await foldUp(foldPort)) { up = true; break; }
    }
    if (!up) throw new Error("The Fold server did not come up — check the-fold/serve.mjs");
  }

  const url = `http://localhost:${foldPort}`;
  console.log(`eoreader7 -browser → The Fold (local) on ${url}`);
  if (open && process.env.ER7_NO_OPEN !== "1") {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${cmd} ${url}`);
  }
  return url;
}

const isMain = path.resolve(process.argv[1] ?? "") === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  serveFold().catch((err) => {
    console.error(`eoreader7 -browser: ${err.message}`);
    process.exitCode = 1;
  });
}