// tests/claude-code-recall.test.mjs — claude-code-recall.mjs's UserPromptSubmit
// additionalContext, run as a real subprocess against an ISOLATED ledger
// (EO_LEDGER_DIR points at a temp dir — never the real shared
// documents/eoreader7-reasoning:1.jsonl or another session's real claims),
// the same isolation tests/reasoning-claims-ledger.test.mjs already
// established for cli/claude-code-context.mjs/cli/reason.mjs. Subprocess,
// not an in-process import: cli/reasoning-ledger.mjs's own DOCS constant
// reads EO_LEDGER_DIR once at module load, so only a fresh process per test
// actually picks up a fresh ledger dir — the identical reason the sibling
// file already spawns rather than imports.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const REASON = path.join(ROOT, "cli", "reason.mjs");
const RECALL = path.join(ROOT, "cli", "claude-code-recall.mjs");
const LEDGER_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "claude-code-recall-"));
const env = { ...process.env, EO_LEDGER_DIR: LEDGER_DIR };

const reason = (spec) => {
  const r = spawnSync("node", [REASON, "--json"], { input: JSON.stringify(spec), env, encoding: "utf8" });
  assert.equal(r.status, 0, `reason.mjs exited ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
};
const recall = (ev) => {
  const r = spawnSync("node", [RECALL], { input: JSON.stringify(ev), env, encoding: "utf8" });
  assert.equal(r.status, 0, `claude-code-recall.mjs exited ${r.status}: ${r.stderr}`);
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};

test("a session with no reasoned claims yet — silent, no stdout at all", () => {
  const out = recall({ session_id: "recall-empty-session", prompt: "hello" });
  assert.equal(out, null);
});

test("a system notice never triggers recall, even mid-session with real claims", () => {
  reason({ session: "recall-notice-session", claims: [{ ground: "/pN", rel: "holds", roles: { ARG0: "a", ARG1: "b" }, said: "a holds b" }] });
  const out = recall({ session_id: "recall-notice-session", prompt: "<task-notification>a background task finished</task-notification>" });
  assert.equal(out, null, "a notice must never surface recall context, matching claude-code-ledger.mjs's own turn-boundary rule");
});

test("a session with a standing claim — surfaces it as UserPromptSubmit additionalContext", () => {
  reason({ session: "recall-basic-session", claims: [{ ground: "/p1", rel: "equals", roles: { ARG0: "EXCERPT", ARG1: "4000" }, said: "The EXCERPT constant is 4000." }] });
  const out = recall({ session_id: "recall-basic-session", prompt: "what were we doing?" });
  assert.ok(out, "must inject something");
  assert.equal(out.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(out.hookSpecificOutput.additionalContext, /EXCERPT/);
  assert.match(out.hookSpecificOutput.additionalContext, /equals/);
  assert.match(out.hookSpecificOutput.additionalContext, /cli\/reason\.mjs/);
});

test("session scoping is siloed — a different session's claims never leak into this one's recall", () => {
  reason({ session: "recall-sessionA", claims: [{ ground: "/pA", rel: "belongs-to", roles: { ARG0: "secretFact", ARG1: "sessionA" }, said: "secretFact belongs to session A" }] });
  const out = recall({ session_id: "recall-sessionB-reader", prompt: "anything standing?" });
  assert.equal(out, null, "session B must not see session A's claims by default");
});

test("secrets are never re-emitted through recall's own injected context", () => {
  reason({ session: "recall-secret-session", claims: [{ ground: "/psecret2", rel: "holds", roles: { ARG0: "key", ARG1: "sk-ant-api03-zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" }, said: "the key is sk-ant-api03-zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" }] });
  const out = recall({ session_id: "recall-secret-session", prompt: "what's the key?" });
  assert.ok(out);
  assert.equal(/sk-ant-api03-zzzzz/.test(out.hookSpecificOutput.additionalContext), false, "a secret scrubbed at write time must not resurface at recall time");
});

test("the CAP still discloses the true total when more claims stand than are shown", () => {
  for (let i = 0; i < 25; i++) {
    reason({ session: "recall-cap-session", claims: [{ ground: `/pcap${i}`, rel: "numbered", roles: { ARG0: `item${i}`, ARG1: String(i) }, said: `item${i} is ${i}` }] });
  }
  const out = recall({ session_id: "recall-cap-session", prompt: "status?" });
  assert.ok(out);
  assert.match(out.hookSpecificOutput.additionalContext, /25 claim\(s\)/);
  assert.match(out.hookSpecificOutput.additionalContext, /5 more/);
});
