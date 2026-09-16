// Real filesystem, a real temp $HOME — no mocking. credentials.mjs computes
// its file path from os.homedir() at import time, so HOME must be set
// BEFORE the dynamic import (same pattern tests/proxy-client.test.mjs uses
// for ER7_PROXY_PORT).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "er7-cred-test-"));
process.env.HOME = tmpHome;

const { loadCredentials, saveMatrixCredentials, saveGithubCredentials, clearMatrixCredentials, clearGithubCredentials, credentialsPath } = await import("../credentials.mjs");

test("loadCredentials on a fresh $HOME returns both halves null", () => {
  assert.deepEqual(loadCredentials(), { matrix: null, github: null });
});

test("saveMatrixCredentials writes mode 600 and leaves github untouched", () => {
  saveMatrixCredentials({ homeserver: "https://matrix.org", userId: "@a:matrix.org", accessToken: "tok", deviceId: "DEV" });
  const st = fs.statSync(credentialsPath());
  assert.equal(st.mode & 0o777, 0o600);
  const creds = loadCredentials();
  assert.equal(creds.matrix.userId, "@a:matrix.org");
  assert.equal(creds.github, null);
});

test("saveGithubCredentials is additive — doesn't clobber matrix", () => {
  saveGithubCredentials({ token: "ghtok" });
  const creds = loadCredentials();
  assert.equal(creds.matrix.userId, "@a:matrix.org");
  assert.equal(creds.github.token, "ghtok");
});

test("clearMatrixCredentials clears only matrix", () => {
  clearMatrixCredentials();
  const creds = loadCredentials();
  assert.equal(creds.matrix, null);
  assert.equal(creds.github.token, "ghtok");
});

test("clearGithubCredentials clears only github", () => {
  clearGithubCredentials();
  assert.deepEqual(loadCredentials(), { matrix: null, github: null });
});
