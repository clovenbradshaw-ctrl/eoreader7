// healing-loop.js — loops on loops, holonic depth (2026-09-29).
//
// The lesson this was built from, stated plainly: chasing ONE real coding
// task through this proxy tonight (a local model implementing RSS-feed
// parsing) surfaced FOUR separate, real infrastructure bugs — an opaque
// connection failure, an opaque HTTP rejection, a stale model-name prefix,
// and a syntax-checker that reported the wrong error — each found only by
// manually reproducing the failure, reading the real source, forming a
// hypothesis, and testing it directly. Every fix then had to be re-verified
// against the real test suite before the ORIGINAL task could even be
// retried. That whole cycle — fail, diagnose, fix, verify, retry — is what
// this module makes the engine do to itself, instead of requiring a human
// to notice and repeat it by hand every time.
//
// runCodeLoop's own contract (its docstring, code-loop.js) is that it never
// throws for an ordinary failed attempt — only for a malformed call, or
// when the underlying model call (turn()) itself fails. That second case IS
// "the engine is broken," not "the task is hard" — code-loop.js's own
// stuck-loop detector (repeatsLastGap) already handles the ordinary-but-
// unproductive case; this module handles the other one.
//
// HOLONIC, NOT FLAT: healing a broken fix is the same shape of problem as
// healing the original task, so this calls ITSELF — a heal attempt that
// itself throws triggers another heal cycle, recursively, up to
// maxHealingDepth. "Arbitrary height, as needed" is honored by making the
// recursion genuine rather than a hand-picked 2-step pipeline; "as needed"
// is honored by a real, finite, disclosed depth bound — true unbounded
// recursion against a shared, multi-user engine is never safe, no matter
// how the request is framed.
//
// SAFETY: every self-directed edit this makes runs with requireReasoning
// forced true (code-loop.js's own gate, the same discipline every human
// edit to this codebase goes through) — a self-healing loop must never be
// LESS safe than a human doing the same edits by hand.

import { fileURLToPath } from "node:url";
import { runCodeLoop } from "./code-loop.js";

// eoreader7's own repo root — two directories up from native/the-fold/.
// The default healing workspace: when the engine breaks, the engine's own
// source (proven by its own real test suite) is what a heal targets.
export const DEFAULT_HEALING_WORKSPACE = fileURLToPath(new URL("../..", import.meta.url));
export const DEFAULT_MAX_HEALING_DEPTH = 5;
export const DEFAULT_HEALING_TEST_COMMAND = "npm test";

/** A MECHANICAL diagnosis task, derived from the caught error's own
 * message — never invented, never asking a model to first summarize the
 * problem in its own words (the error already states it). */
function diagnosisTaskFor(err) {
  return [
    "A coding-loop task failed with an infrastructure-shaped error, not a normal test failure:",
    "",
    String(err?.message ?? err),
    "",
    "Find the real, root cause of this specific failure in this codebase (read the actual relevant source; do not guess). Propose and apply the smallest correct fix, and make sure the existing test suite still passes.",
  ].join("\n");
}

/**
 * runHealingCodeLoop(args, opts) -> the same shape runCodeLoop returns
 * (done, rounds, finalTestOutput, ...), plus healedAt: [{ depth, task,
 * workspace, testCommand, result }] recording every heal cycle actually
 * run, oldest first — [] when no healing was needed at all.
 *
 * args: exactly runCodeLoop's own arguments for the ORIGINAL task.
 * opts.maxHealingDepth: hard bound on total recursive heal cycles (default
 *   DEFAULT_MAX_HEALING_DEPTH) — exceeding it re-throws, it never silently
 *   gives up quietly.
 * opts.healingWorkspace / healingTestCommand: where and how a heal is
 *   verified (defaults: this engine's own repo root, its own real
 *   `npm test`).
 * opts.healingModel: the model a heal cycle uses (defaults to args.model —
 *   the same mouth attempting the original task also attempts the fix,
 *   unless the caller asks for a specifically stronger one).
 * opts.codeLoopRunner: injectable (defaults to the real runCodeLoop) —
 *   tests stage a controllable fake here instead of calling a real model
 *   or touching real files, exactly the seam runCodeLoop itself already
 *   offers via its own `turn` parameter, one layer up.
 */
export async function runHealingCodeLoop(args, opts = {}) {
  const {
    maxHealingDepth = DEFAULT_MAX_HEALING_DEPTH,
    healingWorkspace = DEFAULT_HEALING_WORKSPACE,
    healingModel = null,
    healingTestCommand = DEFAULT_HEALING_TEST_COMMAND,
    codeLoopRunner = runCodeLoop,
    healingDepth = 0,
  } = opts;

  let result;
  try {
    result = await codeLoopRunner(args);
  } catch (err) {
    if (healingDepth >= maxHealingDepth) {
      throw Object.assign(
        new Error(`self-healing exhausted at depth ${healingDepth} (maxHealingDepth=${maxHealingDepth}): ${err.message}`),
        { code: "ERR_HEALING_EXHAUSTED", cause: err, healingDepth },
      );
    }

    const diagnosisTask = diagnosisTaskFor(err);
    const healArgs = {
      sessionId: `${args.sessionId ?? "healing"}-heal-${healingDepth + 1}`,
      userId: args.userId ?? null,
      model: healingModel ?? args.model,
      task: diagnosisTask,
      workspace: healingWorkspace,
      testCommand: healingTestCommand,
      maxRounds: args.maxRounds,
      candidates: args.candidates,
      contextMode: "fold",
      requireReasoning: true, // non-negotiable for a self-directed edit
      caller: args.caller ?? null,
      signal: args.signal ?? null,
    };
    const healResult = await runHealingCodeLoop(healArgs, { ...opts, healingDepth: healingDepth + 1 });
    const healRecord = { depth: healingDepth + 1, task: diagnosisTask, workspace: healingWorkspace, testCommand: healingTestCommand, result: healResult };

    if (!healResult.done) {
      throw Object.assign(
        new Error(`original task failed (${err.message}); the self-heal attempt at depth ${healingDepth + 1} did not converge either`),
        { code: "ERR_HEALING_FAILED", cause: err, healAttempt: healResult, healedAt: [healRecord] },
      );
    }

    // The heal converged — retry the ORIGINAL task. A retry that throws
    // AGAIN (a different or residual problem) triggers another full heal
    // cycle via this same recursive call, up to the shared maxHealingDepth.
    const retried = await runHealingCodeLoop(args, { ...opts, healingDepth: healingDepth + 1 });
    return { ...retried, healedAt: [healRecord, ...(retried.healedAt ?? [])] };
  }

  return { ...result, healedAt: result.healedAt ?? [] };
}
