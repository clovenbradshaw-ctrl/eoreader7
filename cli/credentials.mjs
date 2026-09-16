// credentials.mjs — where this CLI keeps its own Matrix/GitHub sign-in,
// independent of the-fold's browser session (a separate Node process has no
// access to localStorage/IndexedDB, and bridging the two would need a new
// IPC mechanism nobody asked for — user direction: this CLI logs in on its
// own). One flat JSON file, mode 600, matching the precedent already in
// this codebase for a local secret at rest: the-fold's matrix-worker.mjs
// writes its own session to ~/.the-fold/matrix-worker.json the same way.
//
// Shape: { matrix: { homeserver, userId, accessToken, deviceId } | null,
//          github: { token, tokenType, scope } | null }
// Both halves optional and independent — signing into one never requires
// the other.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DIR = path.join(os.homedir(), ".eoreader7");
const FILE = path.join(DIR, "credentials.json");

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
}

export function loadCredentials() {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return { matrix: parsed.matrix ?? null, github: parsed.github ?? null };
  } catch {
    return { matrix: null, github: null };
  }
}

function writeCredentials(creds) {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify(creds, null, 2) + "\n", { mode: 0o600 });
  fs.chmodSync(FILE, 0o600); // mkdir/writeFileSync's mode is subject to umask — set explicitly rather than trust it
}

export function saveMatrixCredentials(matrix) {
  const creds = loadCredentials();
  writeCredentials({ ...creds, matrix });
}

export function saveGithubCredentials(github) {
  const creds = loadCredentials();
  writeCredentials({ ...creds, github });
}

export function clearMatrixCredentials() {
  const creds = loadCredentials();
  writeCredentials({ ...creds, matrix: null });
}

export function clearGithubCredentials() {
  const creds = loadCredentials();
  writeCredentials({ ...creds, github: null });
}

export const credentialsPath = () => FILE;
