#!/usr/bin/env node
// cli/claude-code-reason-gate.mjs — THE ENGINE REASONS, NOT THE MOUTH (2026-09-22).
// The user: "force Claude to leverage it anytime it is reasoning."
//
// A Stop hook. If this turn never ran cli/reason.mjs (the ledger hook marks the
// turn "reasoned" when it sees that command run), the stop is blocked ONCE with
// the instruction to hand the turn's reasoning to eoreader7. The second stop
// (stop_hook_active) always passes, so the gate can never loop. Any error: pass.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

try {
  const ev = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  if (ev.stop_hook_active) process.exit(0);
  const sid = String(ev.session_id ?? "unknown").replace(/[^A-Za-z0-9_-]/g, "");
  let st = null;
  try { st = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".claude", "eo-reason", "sessions", `${sid}.json`), "utf8")); } catch {}
  if (!st || st.reasoned) process.exit(0);
  const reason = [
    "eoreader7 has not checked this turn's reasoning.",
    "State every claim, inference, ordering, number or universal this turn relied on as JSON and run:",
    "  node /Users/mlacy/Documents/3.0/eoreader7/cli/reason.mjs <file.json>",
    "(claims as {ground, rel, roles:{ARG0, ARG1}, polarity, force}; plus declare / inferences / licenses / universals / equations / order as needed; add \"text\" to route the reasoning through the reader, referents and hyperlexicon).",
    "Report what it finds, correcting anything it convicts. If this turn made no claims at all, run it with {\"claims\": []} and say so.",
  ].join("\n");
  process.stdout.write(JSON.stringify({ decision: "block", reason }));
} catch (e) {
  try { fs.appendFileSync(path.join(os.homedir(), ".claude", "eo-reason", "errors.log"), `${new Date().toISOString()} claude-code-reason-gate: ${e?.stack ?? e}\n`); } catch {}
}
process.exit(0);
