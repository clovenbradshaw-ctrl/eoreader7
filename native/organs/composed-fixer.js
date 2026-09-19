// native/organs/composed-fixer.js — the per-behavior build driver, for a
// person in the loop with a competent-enough mouth. Not autonomy: it does
// ONE thing that has failed on every measured mouth — it turns a whole-task
// testCommand into per-behavior sub-gates, and only keeps a change that its
// own behavior's gate proves green.
//
// WHY (CODING-LESSONS #1/#2, and CODE-INVENTORY gap "Composed fixer driver +
// failing-test-as-subtask loop (per-behavior gates, banked partial wins)"):
// all-or-nothing gates destroy incremental wins, and a small mouth cannot
// hold a whole multi-file feature at once — measured live (Exp 6): given a
// "make test_greet.py pass" task, the mouth read helpers.py four times and
// never proposed an edit, and the unterminated multi-file round burned its
// whole budget. The gate was the problem AND the tool: split the whole gate
// into one behavior each, ask ONE behavior per sub-task, and the competent
// single-file edit the mouth CAN produce is kept the moment its gate goes
// green — banked, not reverted.
//
// MECHANISM: the sub-gates are DERIVED, never authored. The driver runs the
// caller's declared testCommand once; on failure it reads the failing assert
// lines from the workspace's own real test bytes (never a guess at what the
// test meant) and synthesizes one gate per behavior that imports the real
// entry from the real module and asserts the real call — exit 0 iff that
// behavior holds. runCodeLoop runs under that gate exactly as it runs under
// the whole gate, with the same physics (find/add bytes, revert-on-fail,
// real exec) — so a banked sub-win is a REAL win, and the whole gate still
// decides the whole.
//
// The person stays in the loop two ways: (1) they can DECLARE per-behavior
// gates (`gates: [{ name, command, task }]`) the way lesson #1's
// `node test.js <key>` demands, and the driver uses those verbatim; (2) the
// driver returns the full banked record, so a human (or the TUI) sees which
// behaviors landed, which the whole still refuses, and how many sub-rounds
// were spent. The mouth is never asked to sequence files; the driver does.
//
// LANGUAGE SCOPE (disclosed, never silent): per-behavior gate synthesis is
// fully mechanical for Python (assert entry(args) == want over a real module
// import). JavaScript gates are synthesized via a Node .mjs harness that
// dynamic-imports the real file; a shape the synthesis cannot read is
// skipped-with-record and the driver falls through to the whole gate —
// never a fabricated gate.
//
// BOUNDS: maxSubTasks, attemptsPerBehavior, maxRounds per sub-loop — all
// disclosed, all cheap. A sub-task that stalls (detectStall: repeated
// already-read / unparsed proposals) is stopped and reported as a refusal,
// not spun.

import fs from "node:fs";
import path from "node:path";
import { runCodeLoop, runTestCommand } from "../the-fold/code-loop.js";

const GATE_DIR = ".er7-gates";
const MAX_SUB_TASKS = 4;
const MAX_ATTEMPTS = 2;
const WHOLE_LIMIT = 4;
const MAX_OUTPUT_SHOWN = 1200;

/** callRe / assertRe — the exact shapes a test's real bytes must match for a
 * gate to be synthesized. Narrow on purpose: anything that is not a plain
 * entry(args) == literal is skipped-with-record, never guessed. The captured
 * expected value keeps its original quoting so it can be spliced back into a
 * synthesized gate as a real literal (never a bare NameError). */
const callRe = /([A-Za-z_]\w*)\s*\(\s*([^()]*)\s*\)/;
const assertRe = /^\s*assert\s+.*?\b([A-Za-z_]\w*)\(([^()]*)\)\s*==\s*(.+?)\s*(?:#.*)?$/;

/** entrySourceFor(workspace, files, entry) -> { module, abs, isEsModule } |
 * null. The real file that declares the entry (never a test file), found by
 * reading real bytes; null when nothing declares it — the caller then skips
 * synthesis for that behavior (a gate that cannot name its module would be
 * a guess).
 */
export function entrySourceFor(workspace, files, entry) {
  const isTest = (rel) => {
    const base = rel.split("/").pop();
    return base.startsWith("test") || base.endsWith("_test.py") || base.endsWith(".test.mjs") || base.endsWith(".test.js") || base.endsWith(".spec.js");
  };
  for (const rel of files) {
    if (isTest(rel)) continue;
    if (!/\.(py|js|cjs|mjs)$/.test(rel)) continue;
    const abs = path.join(workspace, rel);
    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    if (new RegExp(`\\bdef\\s+${entry}\\s*\\(|\\bfunction\\s+${entry}\\s*\\(|\\bconst\\s+${entry}\\s*=`).test(text)) {
      const isPy = rel.endsWith(".py");
      const isEsModule = !isPy && (text.includes("export ") || /^\s*import\s.+/m.test(text));
      const module = isPy ? rel.replace(/\.py$/, "").replace(/\//g, ".") : path.resolve(abs);
      return { module, abs: path.resolve(abs), isEsModule, isPy };
    }
  }
  return null;
}

/** gateSpecFor(behavior, workspace, files) -> { name, gateCommand, gateFile } |
 * null. A per-behavior gate synthesized from the test's OWN bytes:
 *   Python: from helpmod import entry; assert entry(args) == want
 *   JS:     const { entry } = await import("<abs>"); assert.strictEqual(...)
 * The gate file lives under .er7-gates/ (dot-dir: the loop's listing skips
 * it, so the synthesized gate never pollutes the mouth's view — the file
 * that declares the entry is the target the mouth must edit).
 */
export function gateSpecFor(behavior, workspace, files) {
  const src = entrySourceFor(workspace, files, behavior.entry);
  if (!src || !behavior.args.trim()) return null;
  const gateName = `gate-${behavior.name.replace(/[^A-Za-z0-9_.-]/g, "_")}.${src.isPy ? "py" : "mjs"}`;
  const gateDir = path.join(workspace, GATE_DIR);
  fs.mkdirSync(gateDir, { recursive: true });
  const gateFile = path.join(gateDir, gateName);
  let script;
  if (src.isPy) {
    script = `import sys\nsys.path.insert(0, ${JSON.stringify(workspace)})\nfrom ${src.module} import ${behavior.entry}\nassert ${behavior.entry}(${behavior.args}) == ${behavior.want}\nprint("gate-ok")\n`;
} else {
    const arg = /^[A-Za-z0-9_.-]+\.(?:py|js|cjs|mjs)$/.test(src.abs) ? src.abs : `file://${src.abs}`;
    const want = behavior.want?.startsWith('"') || behavior.want?.startsWith("'") || behavior.want === "true" || behavior.want === "false" || behavior.want === "null" || behavior.want === "undefined" ? behavior.want : JSON.stringify(behavior.want);
    script = `import { ${behavior.entry} } from ${JSON.stringify(arg)};\nif (!(${behavior.entry}(${behavior.args}) === ${want})) {\n  console.error("gate-fail");\n  process.exit(1);\n}\nconsole.log("gate-ok");\n`;
  }
  fs.writeFileSync(gateFile, script);
  const gateCommand = src.isPy
    ? `python3 ${path.join(GATE_DIR, gateName)}`
    : `node ${path.join(GATE_DIR, gateName)}`;
  return { name: behavior.name, gateCommand, gateFile: path.join(GATE_DIR, gateName) };
}

/** deriveBehaviors({ workspace, files, failingOutput }) -> [...behaviors].
 * Reads the workspace's test files' REAL bytes, extracts every
 * assert entry(args) == want that the shape permits, and keeps only those
 * whose test appears in the failing output (the behaviors the whole gate
 * actually refuses) — caller can ask for all with `allBehaviors`. Each
 * behavior is { name (test file + assert no.), entry, args, want } with the
 * values preserved exactly as the test bytes carried them.
 */
export function deriveBehaviors({ workspace, files, failingOutput = "", allBehaviors = false }) {
  const out = [];
  let n = 0;
  for (const rel of files) {
    const base = rel.split("/").pop();
    const isTestFile = base.startsWith("test") || base.endsWith("_test.py") || /\.(test|spec)\.(py|js|mjs|cjs)$/.test(base);
    if (!isTestFile) continue;
    let text;
    try {
      text = fs.readFileSync(path.join(workspace, rel), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const m = assertRe.exec(line);
      if (!m) continue;
      const entry = m[1];
      const callm = callRe.exec(line);
      if (!callm) continue;
      const args = callm[2].trim();
      const want = m[3].trim();
      if (!args) continue;
      n += 1;
      const name = `${base}#${n}`;
      const mentioned = failingOutput.includes(`${entry}(${args})`);
      if (!allBehaviors && !mentioned) continue;
      out.push({ name, entry, args, want });
    }
  }
  return out;
}

/** detectStall(rounds, { window }) — the measured Exp-6 signature: N
 * consecutive rounds that neither read a new file nor touched disk
 * (already_read repeats, or unparsed proposals). A stalled sub-loop is
 * stopped and reported, never spun to its budget.
 */
export function detectStall(rounds, { window = 2 } = {}) {
  const tail = (rounds ?? []).slice(-window);
  if (tail.length < window) return false;
  return tail.every((r) => {
    const kind = r.gap?.kind ?? r.action;
    return kind === "already_read" || kind === "unparsed_proposal" || kind === "already_read";
  });
}

function truncate(text, max = MAX_OUTPUT_SHOWN) {
  const s = String(text ?? "");
  return s.length > max ? `${s.slice(0, max)}\n[...truncated...]` : s;
}

/** subTaskFor(behavior) — lesson #2's ask: ONE behavior, the exact failing
 * check quoted from the test's own bytes, never the whole feature.
 */
export function subTaskFor(behavior, task) {
  return `${task}\n\nThis round gates exactly ONE behavior (the gate is your real test):\nassert ${behavior.entry}(${behavior.args}) == ${behavior.want}\nMake that specific check pass. Format your reply as the loop requires.`;
}

/**
 * runComposedFix({ sessionId, model, task, workspace, testCommand, turn?,
 *   gates? (declared, verbatim), allBehaviors?, maxSubTasks?, attempts?,
 *   maxRounds?, caller?, signal?, testTimeoutMs? }) -> { done, via, banks,
 *   wholeAttempts, refused, whole, subRounds }.
 *
 * Drives runCodeLoop once per per-behavior gate, banking each green sub-win,
 * and lets the whole gate decide the whole. Returns the full disclosed record
 * (which behaviors landed, which the whole still refuses, how many rounds).
 * Never throws for an ordinary failed attempt — only for a malformed call.
 */
export async function runComposedFix({ sessionId, userId = null, model, task, workspace, testCommand, turn, gates = null, allBehaviors = false, maxSubTasks = MAX_SUB_TASKS, attempts = MAX_ATTEMPTS, maxRounds = 3, caller = null, signal = null, testTimeoutMs = 60000 }) {
  if (!workspace || !fs.existsSync(workspace)) throw new Error("workspace must be an existing directory");
  if (!testCommand || typeof testCommand !== "string") throw new Error("testCommand must be a declared, real command string");
  if (typeof turn !== "function" && turn !== undefined) throw new Error("turn must be a function when provided");

  const whole = (attempt) => {
    const r = runTestCommand(testCommand, workspace, testTimeoutMs);
    return { exitCode: r.exitCode, output: truncate(r.output) };
  };

  const wholeAttempts = [];
  let first = whole(0);
  wholeAttempts.push({ via: "whole", ...first });
  if (first.exitCode === 0) return { done: true, via: "whole", banks: [], wholeAttempts, refused: [], subRounds: 0, whole: first };

  const files = (() => {
    const out = [];
    const walk = (dir) => {
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (e.name.startsWith(".") || e.name === "node_modules") continue;
        const abs = path.join(dir, e.name);
        if (e.isDirectory()) walk(abs);
        else if (e.isFile()) out.push(path.relative(workspace, abs));
      }
    };
    walk(workspace);
    return out;
  })();

  const declared = Array.isArray(gates) ? gates.map((g) => ({ name: g.name, entry: null, args: [], want: null, gateCommand: g.command, declaredTask: g.task ?? null })) : [];
  const derived = declared.length ? [] : deriveBehaviors({ workspace, files, failingOutput: first.output, allBehaviors });

  const banks = [];
  const refused = [];
  let subRounds = 0;

  const sources = [...declared, ...derived].slice(0, Math.max(1, maxSubTasks));
  for (const behavior of sources) {
    if (signal?.aborted) break;
    let gateCommand = behavior.gateCommand ?? null;
    if (!gateCommand) {
      const spec = gateSpecFor(behavior, workspace, files);
      if (!spec) {
        refused.push({ name: behavior.name, reason: "no synthesized gate possible (entry not declared in a real file, or args unreadable)" });
        continue;
      }
      gateCommand = spec.gateCommand;
    }
    const subTask = behavior.declaredTask ?? subTaskFor(behavior, task);
    let last = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      last = await runCodeLoop({ sessionId, userId, model, task: subTask, workspace, testCommand: gateCommand, maxRounds, testTimeoutMs, caller, signal, turn });
      subRounds += last.rounds.length;
      if (last.done) break;
      if (detectStall(last.rounds)) {
        refused.push({ name: behavior.name, reason: `stall detected (${last.rounds.slice(-2).map((r) => r.gap?.kind ?? r.action).join(", ")})` });
        break;
      }
    }
    if (last?.done) {
      banks.push({ name: behavior.name, gateCommand, sub: last });
      const mid = whole(0);
      wholeAttempts.push({ via: `bank:${behavior.name}`, ...mid });
      if (mid.exitCode === 0) {
        return { done: true, via: "composed", banks, wholeAttempts, refused, subRounds, whole: mid };
      }
    } else if (last?.rounds?.length) {
      refused.push({ name: behavior.name, reason: `loop did not go green in ${attempts} attempt(s)` });
    }
    if (wholeAttempts.length >= WHOLE_LIMIT) break;
  }

  const final = whole(0);
  wholeAttempts.push({ via: "final", ...final });
  return { done: final.exitCode === 0, via: final.exitCode === 0 ? "composed" : "refused", banks, wholeAttempts, refused, subRounds, whole: final };
}