// Real HTTP round-trip against a stand-in homeserver on a test-only port —
// exercises matrix.js's real homeserverBase/loginBody/paths (imported
// cross-repo, never restated) plus this file's own fetch/credential-store
// crossing. Real temp $HOME (credentials.mjs's own path), set before import.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "er7-matrix-test-"));
process.env.HOME = tmpHome;

const { matrixLogin, matrixLogout, matrixStatus, matrixWhoAmI } = await import("../matrix-login.mjs");

const PORT = 18464;
let server;
let sessionValid = true;

function startFakeHomeserver() {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.url === "/_matrix/client/v3/login" && req.method === "POST") {
        const parsed = JSON.parse(body);
        if (parsed.identifier?.user === "baduser") {
          res.writeHead(403, { "content-type": "application/json" });
          return res.end(JSON.stringify({ error: "Invalid password", errcode: "M_FORBIDDEN" }));
        }
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ user_id: `@${parsed.identifier.user}:localhost`, access_token: "tok-abc", device_id: "DEV1" }));
      }
      if (req.url === "/_matrix/client/v3/account/whoami") {
        if (!sessionValid || req.headers.authorization !== "Bearer tok-abc") { res.writeHead(401); return res.end("{}"); }
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ user_id: "@real:localhost" }));
      }
      if (req.url === "/_matrix/client/v3/logout" && req.method === "POST") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end("{}");
      }
      res.writeHead(404);
      res.end();
    });
  });
  return new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));
}

test("setup: fake homeserver listening", async () => { await startFakeHomeserver(); });

test("matrixStatus before login: not signed in", () => {
  assert.deepEqual(matrixStatus(), { signedIn: false });
});

test("matrixLogin: a wrong password surfaces the homeserver's own error", async () => {
  await assert.rejects(() => matrixLogin(`http://127.0.0.1:${PORT}`, "baduser", "wrong"), /Invalid password/);
});

test("matrixLogin: real round trip, real credential save", async () => {
  const creds = await matrixLogin(`http://127.0.0.1:${PORT}`, "alice", "correct-horse");
  assert.equal(creds.userId, "@alice:localhost");
  assert.equal(creds.accessToken, "tok-abc");
  assert.equal(matrixStatus().signedIn, true);
});

test("matrixWhoAmI: confirms a live session against the real homeserver", async () => {
  const who = await matrixWhoAmI();
  assert.equal(who.userId, "@real:localhost"); // the homeserver's own live answer, not the cached login response
});

test("matrixWhoAmI: a revoked session returns null, never throws", async () => {
  sessionValid = false;
  assert.equal(await matrixWhoAmI(), null);
  sessionValid = true;
});

test("matrixLogout: clears the local credential", async () => {
  await matrixLogout();
  assert.deepEqual(matrixStatus(), { signedIn: false });
});

test("teardown: close fake homeserver", () => { server.close(); });
