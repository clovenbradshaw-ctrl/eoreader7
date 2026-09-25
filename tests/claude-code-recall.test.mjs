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

// maxBuffer explicit: a 200-claim spec's --json output runs ~70KB; harmless
// headroom given cli/reason.mjs's own real stdout-truncation bug (found and
// fixed building this test — process.exit() racing a large pending pipe
// write, see that file's own header) is the fix that actually matters.
const MAX_BUFFER = 16 * 1024 * 1024;
const reason = (spec, customEnv = env) => {
  const r = spawnSync("node", [REASON, "--json"], { input: JSON.stringify(spec), env: customEnv, encoding: "utf8", maxBuffer: MAX_BUFFER });
  assert.equal(r.status, 0, `reason.mjs exited ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
};
const recall = (ev, customEnv = env) => {
  const r = spawnSync("node", [RECALL], { input: JSON.stringify(ev), env: customEnv, encoding: "utf8", maxBuffer: MAX_BUFFER });
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

test("the CAP still discloses the true total when more RELEVANT claims stand than are shown", () => {
  // 2026-09-25: recallContextFor now filters through claim-relevance.js's
  // relevantClaims before CAP ever applies (see that file's own header),
  // so this fixture must be genuinely relevant to its own prompt to
  // exercise CAP/disclosure at all. Measured empirically building this
  // fix: mean+1SD admission over a REAL, naturally-varying score
  // distribution admits roughly its top ~15% by design (that is what "one
  // SD above the mean" selects on close-to-normal data) — a smaller
  // fixture (25 near-duplicate claims) never reliably clears CAP(20) no
  // matter how closely it matches the prompt, and that is the filter
  // working as intended (selective, not "show most of what's related"),
  // not a bug to engineer around. 200 distinct, genuinely on-topic
  // claims (one reason.mjs call, one claims array — not 200 separate
  // subprocess spawns) reliably admits ~25-30, comfortably above CAP.
  // Its OWN fresh, isolated ledger dir — not this file's shared LEDGER_DIR,
  // which by this point in the file carries a handful of earlier tests'
  // unrelated claims too. Background relevance weighting (claim-relevance
  // .js) reads document frequency across the WHOLE ledger regardless of
  // session, so sharing it here would let those earlier claims skew the
  // measured statistic this test depends on.
  //
  // FIXTURE NOTE (measured empirically building this test): mean+1SD
  // admission structurally selects a MINORITY of any realistic score
  // distribution (Chebyshev's inequality bounds how much can sit above one
  // SD above the mean) — several near-uniform fixtures (200 claims sharing
  // one fixed set of topic words, differing only by an index number)
  // reliably admitted 0, because near-identical scores can never exceed
  // their own mean by construction. What works is DELIBERATE, WIDE,
  // roughly-uniform score spread: each claim shares a DIFFERENT-SIZED
  // subset (0 through the full pool, cycling deterministically — not
  // random, so this is reproducible) of a shared vocabulary pool with the
  // prompt. 300 such claims measured live to admit 54 through the real
  // pipeline (findMatches -> foldMatches -> relevantClaims), comfortably
  // above CAP(20).
  const capLedgerDir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-code-recall-cap-"));
  const capEnv = { ...process.env, EO_LEDGER_DIR: capLedgerDir };
  const pool = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa"];
  const TOTAL = 300;
  const claims = [];
  for (let i = 0; i < TOTAL; i++) {
    const n = i % (pool.length + 1);
    const words = pool.slice(0, n).join(" ") || "nothing";
    claims.push({ ground: `/pcap${i}`, rel: "covers", roles: { ARG0: `item${i}`, ARG1: `${words} unique${i}` }, said: `item${i} covers ${words} unique${i}` });
  }
  reason({ session: "recall-cap-session", claims }, capEnv);
  const out = recall({ session_id: "recall-cap-session", prompt: `which items cover ${pool.join(" ")}` }, capEnv);
  assert.ok(out, "at least some of these deliberately wide-spread claims must clear the relevance bar");
  const m = out.hookSpecificOutput.additionalContext.match(new RegExp(`eoreader7 — (\\d+)/${TOTAL} claim`));
  assert.ok(m, `header must disclose N/${TOTAL}, got: ${out.hookSpecificOutput.additionalContext.slice(0, 120)}`);
  const relevantCount = Number(m[1]);
  assert.ok(relevantCount > 20, `expected more than CAP(20) to be relevant for this wide-spread fixture, got ${relevantCount}/${TOTAL}`);
  assert.match(out.hookSpecificOutput.additionalContext, new RegExp(`${relevantCount - 20} more relevant`));
});
