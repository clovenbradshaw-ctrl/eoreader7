// podcast-app-ledger.test.mjs — proves the append-only fix for real: every
// round lands as its own entry, nothing is destroyed, and re-loading from
// disk reproduces the identical fold. This is the regression for the exact
// bug found live tonight: podcast-app-codegen.mjs was overwriting one
// mutable file per round with no history at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readAppLedger, landAppRound, appendAppRound, projectApp, historyOf } from "./podcast-app-ledger.js";

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "er7-podcast-ledger-")), "ledger.jsonl");
}

test("the first round lands INS·Figure (a birth); the fold shows it", () => {
  const file = tmpFile();
  let log = readAppLedger(file);
  assert.equal(log.entries.length, 0, "nothing persisted yet");
  const from = log.nextSeq;
  log = landAppRound(log, { round: 1, mode: "generate", html: "<html>v1</html>", check: { issues: 0, findings: [] } });
  appendAppRound(file, log, from);
  const fold = projectApp(log);
  assert.equal(fold.operator, "INS");
  assert.equal(fold.html, "<html>v1</html>");
  assert.equal(fold.round, 1);
});

test("a second round SUPERSEDES — nothing is overwritten, both rounds remain in history", () => {
  const file = tmpFile();
  let log = readAppLedger(file);
  let from = log.nextSeq;
  log = landAppRound(log, { round: 1, mode: "generate", html: "<html>v1</html>", check: { issues: 1, findings: ["no audio"] } });
  appendAppRound(file, log, from);
  from = log.nextSeq;
  log = landAppRound(log, { round: 2, mode: "improve", instruction: "add dark mode", html: "<html>v2 dark</html>", check: { issues: 0, findings: [] } });
  appendAppRound(file, log, from);

  const fold = projectApp(log);
  assert.equal(fold.operator, "SYN", "the second round revises, it never re-births");
  assert.equal(fold.html, "<html>v2 dark</html>", "the fold shows the LATEST round");

  const hist = historyOf(log);
  assert.equal(hist.length, 2, "both rounds are still on the record");
  assert.equal(hist[0].html, "<html>v1</html>", "the FIRST round's html was never destroyed");
  assert.equal(hist[1].html, "<html>v2 dark</html>");
});

test("re-loading from disk after a process restart reproduces the identical fold — the whole point of append-only persistence", () => {
  const file = tmpFile();
  let log = readAppLedger(file);
  let from = log.nextSeq;
  log = landAppRound(log, { round: 1, mode: "generate", html: "<html>v1</html>", check: { issues: 0, findings: [] } });
  appendAppRound(file, log, from);
  from = log.nextSeq;
  log = landAppRound(log, { round: 2, mode: "improve", instruction: "vastly improve the UX", html: "<html>v2</html>", check: { issues: 0, findings: [] } });
  appendAppRound(file, log, from);

  // Simulate a fresh process: nothing in memory, read only from disk.
  const reloaded = readAppLedger(file);
  assert.equal(reloaded.entries.length, log.entries.length);
  assert.deepEqual(projectApp(reloaded), projectApp(log));
  assert.deepEqual(historyOf(reloaded), historyOf(log));
});

test("every steering prompt lands verbatim as its own audit entry, matching podcast.js's own landMouthAudit convention", () => {
  const file = tmpFile();
  let log = readAppLedger(file);
  const from = log.nextSeq;
  const audit = { request: [{ role: "user", content: "make it look like Spotify" }], rawResponse: "<html>...</html>", durationMs: 4200, model: "gemma2:2b" };
  log = landAppRound(log, { round: 1, mode: "improve", instruction: "make it look like Spotify", html: "<html>...</html>", check: { issues: 0, findings: [] }, audit });
  appendAppRound(file, log, from);

  const audits = log.entries.filter((e) => e.task_id.startsWith("audit:"));
  assert.equal(audits.length, 1);
  assert.equal(audits[0].operator, "SIG");
  assert.equal(audits[0].grain, "Ground");
  assert.deepEqual(audits[0].request, audit.request);
  assert.equal(audits[0].rawResponse, "<html>...</html>");
});

test("a --fresh round is disclosed on the entry, never silently indistinguishable from an ordinary revision", () => {
  const file = tmpFile();
  let log = readAppLedger(file);
  let from = log.nextSeq;
  log = landAppRound(log, { round: 1, mode: "generate", html: "<html>v1</html>", check: { issues: 0, findings: [] } });
  appendAppRound(file, log, from);
  from = log.nextSeq;
  log = landAppRound(log, { round: 1, mode: "improve", instruction: "start over", html: "<html>v2 fresh</html>", check: { issues: 0, findings: [] }, fresh: true });
  appendAppRound(file, log, from);
  const fold = projectApp(log);
  assert.equal(fold.fresh, true);
});

test("landAppRound refuses html with nothing in it — a round with no content is not a round", () => {
  const log = readAppLedger(tmpFile());
  assert.throws(() => landAppRound(log, { round: 1, mode: "generate", html: "   ", check: {} }), TypeError);
});

test("the cube progression stays legal across many rounds — checkCubeProgression stays silent", async () => {
  const { checkCubeProgression } = await import("../../kernel/task-log.js");
  const file = tmpFile();
  let log = readAppLedger(file);
  for (let round = 1; round <= 5; round += 1) {
    const from = log.nextSeq;
    log = landAppRound(log, { round, mode: round === 1 ? "generate" : "improve", html: `<html>v${round}</html>`, check: { issues: 0, findings: [] } });
    appendAppRound(file, log, from);
  }
  const violations = checkCubeProgression(log);
  assert.deepEqual(violations, [], "five rounds of INS then SYN×4 on one task must never violate the operator chain");
});
