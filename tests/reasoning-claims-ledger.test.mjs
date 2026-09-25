// tests/reasoning-claims-ledger.test.mjs — cli/reason.mjs's structured-claims
// write side and cli/claude-code-context.mjs's session-scoped read-time fold,
// run as real processes against an ISOLATED ledger (EO_LEDGER_DIR points at a
// temp dir, so this never touches the real shared documents/eoreader7-
// reasoning:1.jsonl or any other session's real claims).
//
// This is the T1/T2/T3 acceptance shape from the reason-claims design,
// pinned as a permanent regression: the same structured roles declared with
// different prose across several runs fold to ONE entry with an accumulated
// witness count (T1); claims with different role values stay separate
// entries (T2); and session scoping defaults to siloing the current session,
// widened only by --all-sessions or --session (T3). See cli/reason.mjs and
// cli/claude-code-context.mjs's own headers for the full design and the
// disclosed bounds this does NOT close (role-value-level paraphrase; roles
// beyond ARG0/ARG1; a workflow-subagent's session id not always being a true
// per-conversation wall).
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REASON = path.join(ROOT, "cli", "reason.mjs");
const CONTEXT = path.join(ROOT, "cli", "claude-code-context.mjs");
const LEDGER_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "reasoning-claims-ledger-"));
const env = { ...process.env, EO_LEDGER_DIR: LEDGER_DIR };

const reason = (spec) => {
  const r = spawnSync("node", [REASON, "--json"], { input: JSON.stringify(spec), env, encoding: "utf8" });
  assert.equal(r.status, 0, `reason.mjs exited ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
};
const read = (args) => {
  const r = spawnSync("node", [CONTEXT, "--json", ...args], { env: { ...env, CLAUDE_CODE_SESSION_ID: undefined }, encoding: "utf8" });
  return JSON.parse(r.stdout);
};

test("T1: the same structured roles, declared with different prose across three real runs, fold to ONE entry with an accumulated witness count", () => {
  const claim = { ground: "/p1", rel: "equals", roles: { ARG0: "EXCERPT", ARG1: "4000" } };
  for (const said of [
    "The EXCERPT constant is 4000.",
    "4000 is the value EXCERPT holds — the bound this file has always used.",
    "Whatever gets excerpted from a file is capped at four thousand characters, per the EXCERPT constant.",
  ]) {
    const out = reason({ session: "t1-session", claims: [{ ...claim, said }] });
    assert.equal(out.ok, true);
  }
  const r = read(["--session", "t1-session"]);
  const note = r.notes.find((n) => n.subject === "EXCERPT" && n.object === "4000");
  assert.ok(note, "the folded EXCERPT/4000 note must exist");
  assert.equal(note.witnessCount, 3, "three distinct runs must leave three distinct, accumulated witnesses — never collapsed by a repeated witness string");
  assert.equal(new Set(note.witnesses).size, 3, "the three witnesses must be distinct strings, not a repeated constant");
  assert.equal(note.instances.length, 3, "all three original prose statements must still be recoverable");
});

test("T2: claims with different role values stay separate entries — folding never collapses genuinely distinct facts", () => {
  reason({ session: "t2-session", claims: [{ ground: "/p1", rel: "equals", roles: { ARG0: "EXCERPT", ARG1: "4000" }, said: "EXCERPT is 4000." }] });
  reason({ session: "t2-session", claims: [{ ground: "/p2", rel: "equals", roles: { ARG0: "MAX_RETRIES", ARG1: "3" }, said: "MAX_RETRIES is 3." }] });
  const r = read(["--session", "t2-session"]);
  assert.equal(r.notes.length, 2, "two genuinely distinct claims must fold to two entries, never one");
  assert.ok(r.notes.some((n) => n.subject === "EXCERPT" && n.object === "4000"));
  assert.ok(r.notes.some((n) => n.subject === "MAX_RETRIES" && n.object === "3"));
});

test("T2b (the disclosed bound, design part E): paraphrase AT THE ROLE-VALUE LEVEL does not fold — 'EXCERPT' and 'the EXCERPT constant' stay separate, honestly", () => {
  reason({ session: "t2b-session", claims: [{ ground: "/p1", rel: "equals", roles: { ARG0: "EXCERPT", ARG1: "4000" }, said: "EXCERPT is 4000." }] });
  reason({ session: "t2b-session", claims: [{ ground: "/p1", rel: "equals", roles: { ARG0: "the EXCERPT constant", ARG1: "4000" }, said: "The EXCERPT constant equals 4000." }] });
  const r = read(["--session", "t2b-session"]);
  assert.equal(r.notes.length, 2, "a role-value-level paraphrase is a real, disclosed limit — it must not silently fold");
});

test("T3: session scoping defaults to siloing the current session; --all-sessions and --session widen it explicitly", () => {
  reason({ session: "t3-session-B", claims: [{ ground: "/p3", rel: "declared-only-under", roles: { ARG0: "session-B", ARG1: "marker" }, said: "declared under session B" }] });

  const asOtherSession = spawnSync("node", [CONTEXT, "--json"], { env: { ...env, CLAUDE_CODE_SESSION_ID: "t3-session-C-reader" }, encoding: "utf8" });
  const defaultScope = JSON.parse(asOtherSession.stdout);
  assert.equal(defaultScope.notes.length, 0, "the default (siloed) scope under a DIFFERENT session must not see session B's claim");

  const widened = spawnSync("node", [CONTEXT, "--json", "--all-sessions"], { env: { ...env, CLAUDE_CODE_SESSION_ID: "t3-session-C-reader" }, encoding: "utf8" });
  const all = JSON.parse(widened.stdout);
  assert.ok(all.notes.some((n) => n.subject === "session-B"), "--all-sessions must widen to see session B's claim");

  const named = read(["--session", "t3-session-B"]);
  assert.ok(named.notes.some((n) => n.subject === "session-B"), "--session <id> must name and see the other session explicitly");
});

test("T4-adjacent: a claim missing ARG1 (unary) is honestly refused by the fold, never silently dropped or crashed on", () => {
  reason({ session: "t4-unary-session", claims: [{ ground: "/p4", rel: "exists", roles: { ARG0: "lonely-thing" }, said: "a unary predicate" }] });
  const r = read(["--session", "t4-unary-session"]);
  assert.equal(r.foldedEntries, 0);
  assert.equal(r.foldRefused, 1, "an incomplete arrangement must be disclosed as refused, not silently absent");
});

test("secrets are scrubbed from the persisted ledger even inside a role value", () => {
  reason({ session: "t-secret-session", claims: [{ ground: "/psecret", rel: "holds", roles: { ARG0: "key", ARG1: "sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ" }, said: "the key is sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ" }] });
  const raw = fs.readFileSync(path.join(LEDGER_DIR, "eoreader7-reasoning:1.jsonl"), "utf8");
  assert.equal(/sk-ant-api03-abcdefgh/.test(raw), false, "no secret may reach disk, in `said` or in a role value");
});
