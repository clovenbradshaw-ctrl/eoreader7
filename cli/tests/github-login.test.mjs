// github.js's device-flow endpoints are hardcoded github.com URLs (by
// design — a real OAuth app id, not a configurable target), so this test
// intercepts global fetch at exactly that boundary rather than mocking
// this file's own logic: every response shape below is the real GitHub
// device-flow wire format (github.js's own parseDeviceCodeResponse/
// parseAccessTokenResponse are exercised for real against it), and the
// poll loop, timing, and credential save are this file's real code path.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "er7-github-test-"));
process.env.HOME = tmpHome;

const { startGithubDeviceFlow, githubStatus, githubLogout } = await import("../github-login.mjs");
const { GITHUB_DEVICE_CODE_URL, GITHUB_ACCESS_TOKEN_URL } = await import("../../../the-fold/github.js");

const realFetch = globalThis.fetch;
let tokenPollCount = 0;

function installFakeFetch({ pendingCalls = 0, finalStatus = "ok" } = {}) {
  tokenPollCount = 0;
  globalThis.fetch = async (url, opts) => {
    if (url === GITHUB_DEVICE_CODE_URL) {
      return jsonResponse({ device_code: "dc-1", user_code: "ABCD-1234", verification_uri: "https://github.com/login/device", expires_in: 900, interval: 0.01 });
    }
    if (url === GITHUB_ACCESS_TOKEN_URL) {
      tokenPollCount += 1;
      if (tokenPollCount <= pendingCalls) return jsonResponse({ error: "authorization_pending" });
      if (finalStatus === "denied") return jsonResponse({ error: "access_denied" });
      return jsonResponse({ access_token: "ghp_faketoken123" });
    }
    if (url === "https://api.github.com/user") return jsonResponse({ login: "octocat" });
    throw new Error(`unexpected fetch to ${url}`);
  };
}
function jsonResponse(body) {
  return { ok: true, json: async () => body };
}
function restoreFetch() { globalThis.fetch = realFetch; }

test("startGithubDeviceFlow: real device-code parse, correct user code surfaced", async () => {
  installFakeFetch({ pendingCalls: 0 });
  const { userCode, verificationUri, poll } = await startGithubDeviceFlow();
  assert.equal(userCode, "ABCD-1234");
  assert.equal(verificationUri, "https://github.com/login/device");
  const github = await poll();
  assert.equal(github.token, "ghp_faketoken123");
  assert.equal(githubStatus().connected, true);
  restoreFetch();
});

test("poll(): authorization_pending is retried, not surfaced as an error", async () => {
  installFakeFetch({ pendingCalls: 3 });
  const { poll } = await startGithubDeviceFlow();
  const github = await poll();
  assert.equal(github.token, "ghp_faketoken123");
  assert.ok(tokenPollCount > 3, "must have actually retried past the pending responses");
  restoreFetch();
});

test("poll(): access_denied surfaces as a real rejection", async () => {
  installFakeFetch({ pendingCalls: 0, finalStatus: "denied" });
  const { poll } = await startGithubDeviceFlow();
  await assert.rejects(() => poll(), /access_denied/);
  restoreFetch();
});

test("githubLogout clears the credential", () => {
  githubLogout();
  assert.equal(githubStatus().connected, false);
});
