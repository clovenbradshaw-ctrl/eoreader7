#!/usr/bin/env node
// cli/claude-code-reason-gate.mjs — THE ENGINE REASONS, NOT THE MOUTH (2026-09-22).
// The user: "force Claude to leverage it anytime it is reasoning" — then "make
// it steer." A Stop hook. The turn may end only when (a) eoreader7 checked the
// turn's reasoning (cli/reason.mjs ran, read from its own output), and (b)
// every file this turn changed is covered by a PASSING run that states a claim
// grounded at that file (cli/claude-code-state.mjs coverageOf). Otherwise the
// stop is blocked ONCE with what is missing; the second stop
// (stop_hook_active) always passes, so the gate cannot loop. Off switch:
// ~/.claude/eo-reason/steer.off. Fails open on its own error, logged.
import fs from "node:fs";
import path from "node:path";
import { steeringOff, sidOf, loadState, uncovered, coverageOf, logError } from "./claude-code-state.mjs";

const REASON = path.join(path.dirname(new URL(import.meta.url).pathname), "reason.mjs");

try {
  const ev = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
  if (!ev.stop_hook_active && !steeringOff()) {
    const st = loadState(sidOf(ev));
    const open = uncovered(st, Object.keys(st.changed ?? {}));
    let reason = null;
    if (open.length) {
      reason = [
        "**eoreader7 coverage gap** — this turn changed file(s) its reasoning does not cover:",
        "",
        ...open.map((f) => { const r = coverageOf(st, f).run; return r && !r.ok ? `- **${f}** — latest run FAILED: ${(r.errors ?? []).slice(0, 1).map((e) => e.split("\n")[0]).join("\n  ")}` : `- **${f}** — no passing run states a claim grounded at it`; }),
        "",
        "State what each change does and preserves as claims grounded AT the file:",
        "",
        "```json",
        "{",
        '  "claims": [{"ground": "' + open[0] + '", "rel": "…", "roles": {"ARG0": "…", "ARG1": "…"}, "polarity": "+", "force": "strict"}],',
        '  "text": "description of the change"',
        "}",
        "```",
        "",
        `  node ${REASON} <spec.json> --compact`,
      ].join("\n");
    } else if (!(st.runs ?? []).length && st.turn > 0) {
      reason = [
        "**eoreader7 reasoning check required**",
        "",
        "State every claim, inference, ordering, number or universal this turn relied on as JSON:",
        "",
        "```json",
        "{",
        '  "claims": [',
        '    {"ground": "/path/or/p1", "rel": "relation-name", "roles": {"ARG0": "subject", "ARG1": "object"}, "polarity": "+", "force": "strict", "text": "claim in prose"}',
        "  ],",
        '  "inferences": [],  "universals": [],  "equations": [],  "order": {},',
        '  "text": "optional narrative or reasoning text"',
        "}",
        "```",
        "",
        "Every \"force\":\"strict\" claim is falsification-tested by default (a synthetic counterexample built from its own declared functional/acyclic property, re-checked) — no flag needed for that.",
        "Then run (compact UI with `--compact`, or `--ants` to add edge-case mutation fuzzing on top):",
        `  node ${REASON} <spec.json> [--compact] [--ants]`,
        "",
        "Report findings and correct anything it convicts.",
      ].join("\n");
    }
    if (reason) process.stdout.write(JSON.stringify({ decision: "block", reason }));
  }
} catch (e) { logError("claude-code-reason-gate", e); }
process.exit(0);
