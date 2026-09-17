// tui.e2e.test.mjs — end-to-end test of the TUI: spawns the real Ink app in
// a pseudo-terminal (via the Python PTY driver) against a hermetic fake
// proxy, drives real keystrokes, and asserts on the rendered *screen*.
//
// These are slow and sensitive to machine load (each scenario boots a real
// node process; under a saturated machine they time out rather than fail
// wrongly). Run them with the repo otherwise idle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRIVER = path.join(HERE, "e2e", "drive.py");
const COLS = 110;
const ROWS = 30;

function runScenario(name) {
  return new Promise((resolve, reject) => {
    execFile(
      "python3",
      [DRIVER, "--scenario", name, "--cols", String(COLS), "--rows", String(ROWS)],
      { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        resolve({ err, stdout: stdout + stderr });
      },
    );
  });
}

const scenarios = ["boot", "help", "tabs", "chat", "model", "scroll", "agent", "history", "search"];

for (const name of scenarios) {
  test(`tui e2e: ${name}`, { timeout: 140_000 }, async () => {
    const { err, stdout } = await runScenario(name);
    assert.ok(
      err === null || err?.code === undefined,
      `scenario ${name} failed to run:\n${stdout}`,
    );
    assert.match(stdout, /PASS/, `scenario ${name} assertions failed:\n${stdout}`);
  });
}