#!/usr/bin/env node
// cli/claude-code-recall.mjs — REASONING CARRIES FORWARD, NOT ONLY BACKWARD
// (2026-09-25). claude-code-steer.mjs and claude-code-reason-gate.mjs make
// eoreader7 reasoning a precondition for LEAVING a turn (deny a write, block
// a Stop) — enforcement at the boundary, once. Nothing fed the other
// direction: what an earlier turn in this same session already proved
// through cli/reason.mjs never re-entered a later turn's own context, so
// turn 5 could restate — or quietly contradict — something turn 2 already
// ran through falsifyGfp and left standing. A UserPromptSubmit hook.
//
// Read-only, and reuses rather than reimplements: findMatches/foldMatches
// are cli/claude-code-context.mjs's own fold, exported from that file for
// this import (tests/reasoning-claims-ledger.test.mjs T1-T4 already pin
// that fold correct; this file adds no new folding logic of its own). Seed
// "/" is that file's own documented no-special-case default — every claim
// THIS SESSION declared matches, the same siloed scope its own T3 test
// requires (a different session's claims never leak in). Never blocks,
// never writes session state (no saveState call — nothing here can race
// claude-code-ledger.mjs's own writes to the same per-turn state file, the
// lost-update class this repo's own memory documents against this file's
// siblings) — this only ever reads the durable, cross-turn
// documents/eoreader7-reasoning:1.jsonl ledger, a different file from that
// per-turn state entirely. Silent when nothing is folded yet (a session's
// first turn, or one with no reasoned claims) — no padding.
//
// No off-switch by design: ~/.claude/eo-reason/steer.off governs
// ENFORCEMENT (claude-code-state.mjs's own header), and this never denies
// or blocks anything to enforce. Fails open on its own error, logged, same
// as every sibling hook.
import fs from "node:fs";
import { sidOf, logError } from "./claude-code-state.mjs";
import { findMatches, foldMatches } from "./claude-code-context.mjs";

// A system notice is not the user's own ask — claude-code-ledger.mjs's own
// UserPromptSubmit branch defines the identical table for the identical
// reason (a background task finishing must not act like a fresh turn).
// Duplicated literally rather than imported: the same call
// claude-code-context.mjs's own header makes for structuralIdentity — a
// four-item literal both files must keep matching is cheaper and safer
// duplicated than behind a new shared module neither owns yet.
const NOTICE_OPENINGS = ["<task-notification>", "<cross-session-message", "[SYSTEM NOTIFICATION", "<system-reminder>"];

// A disclosed size bound on how much gets injected per turn — an
// engineering cap on token cost, not a claim about the world, so this
// repo's own refusal of hand-picked SCIENTIFIC thresholds (measured nulls
// over detection/significance judgments) does not apply to it; the same
// distinction claude-code-ledger.mjs's own EXCERPT constant already draws.
const CAP = 20;

/** Pure: the additionalContext string for this UserPromptSubmit event, or
 *  null to inject nothing. Exported so tests can drive it directly against
 *  a real, isolated ledger (EO_LEDGER_DIR) without going through stdin. */
export function recallContextFor(ev) {
  if (NOTICE_OPENINGS.some((o) => String(ev?.prompt ?? "").trimStart().startsWith(o))) return null;
  const sid = sidOf(ev);
  const result = findMatches("/", { allSessions: false, session: sid });
  const folded = foldMatches(result.matches);
  if (!folded.notes.length) return null;
  const shown = folded.notes.slice(0, CAP);
  const lines = [
    `eoreader7 — ${folded.notes.length} claim(s) this session already ran through reasoning (cli/reason.mjs) and left standing:`,
    ...shown.map((n) => `- [${n.standing}, ${n.witnessCount} witness(es)] ${n.subject} ${n.rel} ${n.object}`),
  ];
  if (folded.notes.length > shown.length) lines.push(`… and ${folded.notes.length - shown.length} more — node cli/claude-code-context.mjs --json for the full set.`);
  lines.push("Build on these rather than re-deriving or quietly contradicting them; if one no longer holds, say so and re-run reason.mjs.");
  return lines.join("\n");
}

function main() {
  const ev = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  const additionalContext = recallContextFor(ev);
  if (additionalContext) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } }));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (e) { logError("claude-code-recall", e); }
  process.exit(0);
}
