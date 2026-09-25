// tests/reason-fingerprint.test.mjs — cli/reason.mjs tagging every
// persisted ledger claim with fingerprint/source, run as real subprocesses
// against an isolated EO_LEDGER_DIR (the same pattern
// tests/reasoning-claims-ledger.test.mjs already established).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REASON = path.join(ROOT, "cli", "reason.mjs");
const LEDGER_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "reason-fingerprint-"));
const env = { ...process.env, EO_LEDGER_DIR: LEDGER_DIR };

const reason = (spec) => {
  const r = spawnSync("node", [REASON, "--json"], { input: JSON.stringify(spec), env, encoding: "utf8" });
  assert.equal(r.status, 0, `reason.mjs exited ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
};

function claimLinesFor(session) {
  const raw = fs.readFileSync(path.join(LEDGER_DIR, "eoreader7-reasoning:1.jsonl"), "utf8");
  return raw.split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((l) => l.kind === "reasoning-claim" && l.session === session);
}

test("a plain hand-authored claim persists source:'hand-authored' and a non-null fingerprint", () => {
  reason({ session: "fp-hand-session", claims: [{ ground: "/p1", rel: "holds", roles: { ARG0: "a", ARG1: "b" }, said: "a holds b" }] });
  const [line] = claimLinesFor("fp-hand-session");
  assert.ok(line, "the claim line must exist");
  assert.equal(line.source, "hand-authored");
  assert.equal(typeof line.fingerprint, "string");
  assert.ok(line.fingerprint.length > 0);
});

test("a claim carrying derivedBy:'claim-deriver' persists source:'claim-deriver'", () => {
  reason({ session: "fp-derived-session", claims: [{ ground: "/p2", rel: "identifier-rename", roles: { ARG0: "old", ARG1: "new" }, force: "default", said: "old renamed to new", derivedBy: "claim-deriver" }] });
  const [line] = claimLinesFor("fp-derived-session");
  assert.ok(line);
  assert.equal(line.source, "claim-deriver");
});

test("two claims with the same shape but different grounds/role-values persist the SAME fingerprint", () => {
  reason({ session: "fp-shape-session", claims: [{ ground: "/pA", rel: "identifier-rename", roles: { ARG0: "x", ARG1: "y" }, said: "x renamed to y" }] });
  reason({ session: "fp-shape-session", claims: [{ ground: "/pB", rel: "identifier-rename", roles: { ARG0: "m", ARG1: "n" }, said: "m renamed to n" }] });
  const lines = claimLinesFor("fp-shape-session");
  assert.equal(lines.length, 2);
  assert.equal(lines[0].fingerprint, lines[1].fingerprint);
});

test("a claim with a different rel persists a DIFFERENT fingerprint", () => {
  reason({ session: "fp-diff-session", claims: [{ ground: "/pC", rel: "identifier-rename", roles: { ARG0: "x", ARG1: "y" }, said: "x renamed to y" }] });
  reason({ session: "fp-diff-session", claims: [{ ground: "/pD", rel: "literal-change", roles: { ARG0: "x", ARG1: "y" }, said: "x changed to y" }] });
  const lines = claimLinesFor("fp-diff-session");
  assert.equal(lines.length, 2);
  assert.notEqual(lines[0].fingerprint, lines[1].fingerprint);
});
