// browser-smoke.mjs — smoke test for `eoreader7 -browser` / `TheFold`: the
// launcher (cli/browser.mjs) must bring The Fold up locally (boot the er7
// proxy + ensure the sibling the-fold's serve.mjs is listening) and hand back
// its URL. Run from cli/: node tests/browser-smoke.mjs
process.env.ER7_NO_OPEN = "1";

import assert from "node:assert/strict";
import { serveFold } from "../browser.mjs";
import { PORT } from "../er7-proxy.mjs";

const FOLD_PORT = 12171; // a test port, never the real :8811

async function main() {
  const url = await serveFold({ open: false, port: FOLD_PORT });
  assert.ok(url.includes(String(FOLD_PORT)), `url should carry the fold port: ${url}`);

  const health = await fetch(`${url.replace("localhost", "127.0.0.1")}/health`).then((r) => r.json());
  assert.equal(health.status, "ok", "the fold's /health reports ok");
  assert.equal(health.surface, "fold-chat", "the served surface is the fold-chat surface");

  // The fold's heimdall corner folds in the er7 proxy's queue over loopback.
  const heimdall = await fetch(`${url.replace("localhost", "127.0.0.1")}/heimdall`).then((r) => r.json());
  assert.equal(heimdall.surface.name, "fold-chat");
  assert.ok(heimdall.bridgeQueue === null || typeof heimdall.bridgeQueue === "object", "bridge queue folds in (or is a typed null)");

  console.log(`ok   serveFold brings the fold up on ${url}`);
  console.log(`ok   fold /health ok; surface ${health.surface}`);
  console.log(`ok   fold /heimdall folds the er7 proxy (port ${PORT})`);
  console.log("\nBROWSER SMOKE PASS (3 checks)");
  process.exit(0);
}

main().catch((err) => {
  console.error(`FAIL browser smoke — ${err.message}`);
  process.exit(1);
});