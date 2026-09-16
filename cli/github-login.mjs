// github-login.mjs — the CLI's own GitHub sign-in via OAuth Device Flow,
// reusing the-fold's github.js PURELY (buildDeviceCodeBody/
// parseDeviceCodeResponse/buildAccessTokenBody/parseAccessTokenResponse/
// nextPollIntervalMs — zero fetch calls in that file, per its own header).
// The-fold's browser can't reach github.com directly for this leg (no CORS
// headers on the device-flow endpoints — see the-fold's own
// explore-server.mjs comment), so its browser flow crosses through a local
// server. A Node CLI has no such restriction: it calls github.com directly,
// the same way `gh auth login` does.

import {
  GITHUB_DEVICE_CODE_URL, GITHUB_ACCESS_TOKEN_URL,
  buildDeviceCodeBody, parseDeviceCodeResponse, buildAccessTokenBody,
  parseAccessTokenResponse, nextPollIntervalMs, deviceFlowExpired, DeviceFlowError,
} from "../../the-fold/github.js";
import { loadCredentials, saveGithubCredentials, clearGithubCredentials } from "./credentials.mjs";

async function postForm(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(body).toString(),
  });
  return res.json();
}

/**
 * Starts the device flow and returns { userCode, verificationUri, poll } —
 * `poll()` is the caller's to await (or run in the background): it resolves
 * once the person has entered the code on github.com, or throws
 * DeviceFlowError on expiry/denial/error. Kept as two steps (not one
 * function that blocks until done) so a caller like tui.mjs can show the
 * code immediately and poll without freezing the UI.
 */
export async function startGithubDeviceFlow() {
  const raw = await postForm(GITHUB_DEVICE_CODE_URL, buildDeviceCodeBody());
  const started = parseDeviceCodeResponse(raw); // throws DeviceFlowError on a malformed/error response
  const startedAt = Date.now();
  let intervalMs = started.interval * 1000;

  async function poll() {
    for (;;) {
      if (deviceFlowExpired({ startedAt, expiresInSec: started.expires_in })) {
        throw new DeviceFlowError("expired — the code was not entered in time; run login again");
      }
      await new Promise((r) => setTimeout(r, intervalMs));
      const raw2 = await postForm(GITHUB_ACCESS_TOKEN_URL, buildAccessTokenBody(started.device_code));
      const result = parseAccessTokenResponse(raw2); // never throws — the status field is the decision
      if (result.status === "pending") continue;
      if (result.status === "slow_down") { intervalMs = nextPollIntervalMs(intervalMs, "slow_down"); continue; }
      if (result.status === "error") throw new DeviceFlowError(result.code);
      const github = { token: result.token };
      saveGithubCredentials(github);
      return github;
    }
  }

  return { userCode: started.user_code, verificationUri: started.verification_uri, poll };
}

export async function githubWhoAmI() {
  const { github } = loadCredentials();
  if (!github) return null;
  const res = await fetch("https://api.github.com/user", {
    headers: { authorization: `Bearer ${github.token}`, accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return { login: data.login ?? null };
}

export function githubLogout() {
  clearGithubCredentials();
}

export function githubStatus() {
  const { github } = loadCredentials();
  return { connected: !!github };
}
