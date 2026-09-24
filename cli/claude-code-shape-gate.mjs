#!/usr/bin/env node
// cli/claude-code-shape-gate.mjs — Handle: Strauss, inverted (2026-09-24). A
// Straussian text carries a safe exoteric surface and a different esoteric
// one underneath, for readers who know to look; this gate refuses to let a
// request's harmful realization ride under an innocuous surface framing
// unread. A Stop hook.
//
// cli/claude-code-ledger.mjs's UserPromptSubmit branch already read the
// turn's own ask through askShape (native/organs/askshape.js) and, when its
// EXISTENCE face reads harmful ("no UNDERSTAND launders it" — that file's
// own rule, not a new one), left st.straussian for this file to find. This
// file re-reads askShape over Claude's OWN final message — never a
// self-report of it — and blocks ONCE, asking Claude to state explicitly how
// the gap was handled, only when the response itself still carries the same
// shape. A response that already declined or redirected passes silently: no
// added friction on the common, already-correct case. The second stop
// (stop_hook_active) always passes, so the gate cannot loop, exactly like
// claude-code-reason-gate.mjs. Off switch: ~/.claude/eo-reason/steer.off.
// Fails open on its own error, logged.
//
// Never writes state (no saveState call) — this is what a second Stop
// command reading the SAME session state file as claude-code-ledger.mjs's
// own Stop-branch write must do to avoid the lost-update race documented in
// this repo's own memory for this exact file.
import fs from "node:fs";
import { steeringOff, sidOf, loadState, logError } from "./claude-code-state.mjs";
import { askShapeBest } from "../native/organs/askshape.js";
import { defaultCharter } from "../native/organs/charter.js";

const charter = defaultCharter();

/** Pure decision: does this Stop event need to block on an unaddressed
 *  AntiStraussian flag? Exported so tests can drive it directly with
 *  synthetic ev/st, no subprocess or stdin needed. */
export function shapeGateDecision(ev, st) {
  const flag = st.straussian;
  if (!flag || flag.turn !== st.turn) return { block: false, reason: null };
  const shape = askShapeBest(ev.last_assistant_message ?? "", { charter });
  if (!shape.harmful) return { block: false, reason: null };
  const reason = [
    `**eoreader7 — surface framing flagged, the response still carries it**`,
    "",
    `The turn's own ask read as ${flag.shape ?? "harmful"}:`,
    ...flag.witnesses.map((w) => `- ${w}`),
    "",
    "Your own final message still reads the same way through the same check. Before the turn ends, state explicitly — in your own words — how you're handling this: that you declined or redirected the underlying request, or the specific textual grounds this is a false positive.",
  ].join("\n");
  return { block: true, reason };
}

function main() {
  const ev = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  if (ev.stop_hook_active || steeringOff()) return;
  const st = loadState(sidOf(ev));
  const { block, reason } = shapeGateDecision(ev, st);
  if (block) process.stdout.write(JSON.stringify({ decision: "block", reason }));
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (e) { logError("claude-code-shape-gate", e); }
  process.exit(0);
}
