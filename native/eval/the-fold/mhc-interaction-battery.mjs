// node eval/mhc-interaction-battery.mjs
//
// The interaction ladder bound to REAL counterparts. mhc.js is the scorer,
// mhc-interact.js is the ladder and its arms; this file is where three
// genuinely different things that answer back get wired to the probe surface.
//
// A RE-RUNNABLE DRIVER, NOT A COMMITTED REGRESSION TEST — the posture P19,
// P27 and eval/mhc-battery.mjs itself already set for measurement drivers
// here. The conformance for the machinery is mhc-interact.test.mjs and needs
// no subprocess at all.
//
// -- READING-POLICY P0, STATED BEFORE ANY NUMBER ---------------------------
//
// "Any claim about 'what this system can do' must name the assembly it was
// measured on." This driver hand-wires three counterparts and runs one ladder
// against each. Every number below is a statement about THAT pairing — this
// assembly, that counterpart — and never about the-fold's assembled reader,
// which does not appear here at all.
//
// -- WHY THESE THREE, AND WHY NOT A MODEL ----------------------------------
//
// The whole point of an interaction battery is that the SAME ladder runs
// against different counterparts, so environment-independence is askable at
// all. Three were chosen to be as unlike each other as this machine allows:
//
//   grid    — this repo's own act grammar (grid.js + capacity-runner.js's
//             landAct) over the engine's real kernel. In-process, symbolic,
//             and genuinely stateful: `relate` refuses until both referents
//             are established ON THIS LOG, `separate` refuses an object not
//             individuated on it, `revise` refuses a target that is not there.
//   python  — a real `python3 -i` subprocess. Out-of-process, an interpreter
//             this repo did not write, with real bindings carried across turns.
//   sh      — a real `sh` subprocess. Out-of-process, a different execution
//             model again, and the only counterpart here whose acceptance is
//             read off a real exit status rather than off its output text.
//
// NO MODEL IS INVOLVED ANYWHERE, by design and not by absence: every probe
// here is mechanical, so the battery costs nothing to re-run and its numbers
// do not move between runs for reasons nobody can name. A live model IS a
// legitimate counterpart for this contract — but scoring one re-opens the
// confound mhc-interact.js's header describes at length (both sides act, so
// the number is about the pair), and that needs a scripted control of declared
// order standing beside it. Named here, not attempted here.
//
// -- PROBES COME OUT OF EACH COUNTERPART, NOT OUT OF THIS FILE'S OPINIONS ---
//
// Each counterpart's `describe()` names its own accepted act, its own foreign
// act, its own stateful chain, and so on. The ladder is written once, in
// mhc-interact.js, against those declarations. Nothing in the ladder knows
// what a `distinguish` or a `print` is.

import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { runBattery, stageFrom, contentIndependence, orderOf, SYMBOLIC_FLOOR } from "../mhc.js";
import { interactionLadder, declareCounterpart } from "../mhc-interact.js";
import { makeGrid } from "../grid.js";
import { landAct } from "../../eoreader7/native/organs/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DRAWS = 5;
const SEED = 0;

const ASSEMBLY =
  "EXPERIMENT — mhc-interact.js's ladder hand-wired to three counterparts (this repo's act grammar over the engine kernel; a python3 subprocess; an sh subprocess). NOT the-fold's assembled reader. READING-POLICY P0.";

// -- the engine, wherever it is on this disk -------------------------------
//
// Same posture as eval/mhc-battery.mjs: the kernel has moved between layouts
// across generations of this project, and a driver that hardcodes one reports
// "organ unreachable" as a statement about the SYSTEM when it is a statement
// about a path. Both known layouts are tried and the one found is DECLARED.

const KERNEL_LAYOUTS = [
  { name: "eoreader6.1 (packages/engine)", cube: "../../eoreader6.1/packages/engine/operators.js", log: "../../eoreader6.1/packages/engine/holon/task-log.js" },
  { name: "eoreader7 (native/kernel)", cube: "../../eoreader7/native/kernel/cube.js", log: "../../eoreader7/native/kernel/task-log.js" },
];

async function loadKernel() {
  const tried = [];
  for (const layout of KERNEL_LAYOUTS) {
    try {
      const operators = await import(new URL(layout.cube, import.meta.url).href);
      const taskLog = await import(new URL(layout.log, import.meta.url).href);
      if (!operators.TERRAIN_BY_DOMAIN || !taskLog.createTaskLog) throw new Error("kernel present but does not carry the expected surface");
      return { layout: layout.name, operators, taskLog };
    } catch (err) {
      tried.push(`${layout.name}: ${err?.message ?? err}`);
    }
  }
  return { layout: null, tried };
}

// -- a subprocess REPL as a counterpart session ----------------------------
//
// One marker line per act, written after the act itself, and everything up to
// it is that act's response. stdout and stderr are merged deliberately:
// python writes its prompts AND its tracebacks to stderr, and an act that
// raised is exactly as much a response as one that printed.

const MARK = "__MHC_ACT_DONE__";
const STEP_TIMEOUT_MS = 8000;

function replSession({ cmd, args, marker, accepted }) {
  const proc = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
  let buffer = "";
  proc.stdout.on("data", (d) => { buffer += d; });
  proc.stderr.on("data", (d) => { buffer += d; });
  proc.on("error", () => {});
  let dead = false;
  proc.on("exit", () => { dead = true; });

  return {
    async step(act) {
      if (dead) return { accepted: false, text: "the counterpart exited" };
      buffer = "";
      proc.stdin.write(`${act}\n${marker}\n`);
      const started = Date.now();
      while (!buffer.includes(MARK)) {
        if (dead || Date.now() - started > STEP_TIMEOUT_MS) {
          return { accepted: false, text: `${buffer}\n[no marker within ${STEP_TIMEOUT_MS}ms]` };
        }
        await new Promise((r) => setTimeout(r, 5));
      }
      const raw = buffer.slice(0, buffer.indexOf(MARK));
      return accepted(raw);
    },
    close() {
      try { proc.kill(); } catch { /* already gone */ }
    },
  };
}

// -- counterpart 1: this repo's own act grammar ----------------------------

function gridCounterpart(kernel) {
  const grid = makeGrid({ operators: kernel.operators, taskLog: kernel.taskLog });
  const act = (verb, obj = "alpha", rest = "at Entity from encounter ground g broken:rotation") => `${verb} ${obj} ${rest}`;
  const DISTINGUISH = act("distinguish");
  const DEFINE = "define finding at Field from generate";
  const idsIn = (t) => (String(t).match(/act-\d+/g) ?? []).length;

  return {
    id: "grid",
    kind: "this repo's act grammar (grid.js + landAct) over the engine kernel — in-process, stateful, refusal-bearing",
    open: async () => {
      let log = grid.createLog();
      return {
        step: (line) => {
          const r = landAct(grid, log, line);
          if (!r.ok) return { accepted: false, text: `refused: ${r.refusal?.type ?? "unknown"}` };
          log = r.log;
          return { accepted: true, text: (r.ids ?? []).join(" ") };
        },
        close() {},
      };
    },
    describe: () => ({
      accepted: DISTINGUISH,
      foreign: act("flurb"),
      // A `distinguish` lands SIG then INS — two entries, one act. A `define`
      // lands one. That difference is the grammar's own, not this file's.
      pair: [
        { act: DISTINGUISH, effect: (t) => idsIn(t) === 2 },
        { act: DEFINE, effect: (t) => idsIn(t) === 1 },
      ],
      // The second act is built from the id the first one HANDED BACK: a
      // `revise` must name a target that is actually on this log.
      // `revise` must name a target actually on this log, and the grammar
      // wants its terrain and stance like every other act. Measured live: a
      // blank id refuses `no_target` and a wrong one refuses
      // `target_not_found`, so this chain genuinely depends on the value the
      // first act handed back rather than merely following it.
      chain: {
        probe: DISTINGUISH,
        read: (t) => (String(t).match(/act-\d+/g) ?? []).slice(-1)[0] ?? "",
        use: (id) => `revise alpha at Entity from encounter because drift supersedes ${id}`,
        check: (t) => /^act-\d+/.test(String(t).trim()),
      },
      // The rule: how many log entries does a verb land? Two for the one verb
      // the grammar splits into SIG+INS, one for everything else it accepts.
      rule: {
        seen: ["define", "void"],
        novel: "distinguish",
        uncovered: "flurb",
        act: (verb) =>
          verb === "define" ? DEFINE : verb === "void" ? "void alpha at Field from differentiate ground g broken:rotation" : act(verb),
        predict: (verb) => (verb === "flurb" ? null : verb === "distinguish" ? 2 : 1),
        check: (t, predicted) => idsIn(t) === predicted,
      },
      // Two routes to one effect. The effect is that `separate alpha` LANDS,
      // which it only does once alpha is individuated on this log — and
      // individuating it at Entity and at Kind are two different acts that
      // both get it there. A warranted `relate` was tried as the second route
      // first and does not work: measured live, `separate` still refuses
      // `not_individuated` after one, so it is not offered here as a route it
      // never was.
      routes: {
        routes: [
          [DISTINGUISH, "separate alpha at Entity from extraction"],
          [act("distinguish", "alpha", "at Kind from encounter ground g broken:rotation"), "separate alpha at Entity from extraction"],
        ],
        // The effect is a landed `separate`, not "some act landed" — every
        // `distinguish` lands too, and a predicate that cannot tell them apart
        // would call any re-dealt pair of acts a route to this effect.
        reached: (obs) => obs.some((o) => o.accepted && o.act.startsWith("separate")),
      },
      slot: {
        template: (verb) => (verb === "define" ? DEFINE : verb === "void" ? "void alpha at Field from differentiate ground g broken:rotation" : act(verb)),
        candidates: ["distinguish", "define", "void", "separate", "relate", "synthesize", "revise", "flurb", "blorp", "qqq"],
        empty: "nothinghere",
      },
      // The do-operator: `relate` binds two referents only if both were
      // established first. Remove the act that establishes one of them and the
      // relate refuses — while an accepted-but-irrelevant act in its place
      // changes nothing.
      intervention: {
        plan: [DISTINGUISH, act("distinguish", "beta"), "relate alpha to beta at Link from cultivation"],
        omit: 0,
        placebo: act("distinguish", "gamma"),
        effect: (obs) => obs.some((o) => o.act.startsWith("relate") && o.accepted),
      },
    }),
  };
}

// -- counterpart 2: a real python3 subprocess ------------------------------

function pythonCounterpart() {
  const firstInt = (t) => {
    const m = String(t).match(/-?\d+/);
    return m ? Number(m[0]) : NaN;
  };
  const says = (t, n) => new RegExp(`(^|\\D)${n}(\\D|$)`).test(String(t));
  return {
    id: "python",
    kind: "a real `python3 -i` subprocess — out of process, an interpreter this repo did not write",
    open: async () =>
      replSession({
        cmd: "python3",
        args: ["-i", "-q"],
        marker: `print("${MARK}")`,
        accepted: (raw) => ({ accepted: !/Traceback|SyntaxError|IndentationError/.test(raw), text: raw.replace(/>>>|\.\.\./g, "").trim() }),
      }),
    describe: () => ({
      accepted: "print(6*7)",
      foreign: "zzz_not_a_function(1)",
      pair: [
        { act: "print(6*7)", effect: (t) => says(t, 42) },
        { act: "print(10+20)", effect: (t) => says(t, 30) },
      ],
      chain: {
        probe: "print(6*7)",
        read: firstInt,
        use: (v) => `print(${v}+1)`,
        check: (t, v) => Number.isFinite(v) && says(t, v + 1),
      },
      rule: {
        seen: [[2, 3], [4, 5]],
        novel: [7, 8],
        uncovered: ["x", 2],
        act: (c) => `print(${c[0]}*${c[1]})`,
        predict: (c) => (typeof c[0] === "number" && typeof c[1] === "number" ? c[0] * c[1] : null),
        check: (t, p) => p != null && says(t, p),
      },
      routes: {
        routes: [["print(6*7)"], ["y = 6*7", "print(y)"]],
        reached: (obs) => obs.some((o) => says(o.text, 42)),
      },
      slot: {
        template: (n) => `print(${n})`,
        candidates: ["len", "sum", "abs", "min", "max", "zzz_nope", "blorp", "qqq"],
        empty: "nothinghere",
      },
      intervention: {
        plan: ["x = 42", "print(x)"],
        omit: 0,
        placebo: "pass",
        // Quantified over the whole observation list, never the last response
        // alone — see EFFECT_MUST_NOT_READ_ONLY_THE_LAST_RESPONSE.
        effect: (obs) => obs.some((o) => says(o.text, 42)),
      },
    }),
  };
}

// -- counterpart 3: a real sh subprocess -----------------------------------
//
// The one counterpart whose acceptance is a real exit status rather than a
// reading of its output text. That is not a detail: it means "accepted" means
// something genuinely different here from what it means in the other two, and
// the ladder never learns the difference.

function shCounterpart() {
  const says = (t, n) => new RegExp(`(^|\\D)${n}(\\D|$)`).test(String(t));
  return {
    id: "sh",
    kind: "a real `sh` subprocess — out of process, acceptance read off a real exit status",
    // The marker carries `$?` BEFORE the mark, so the exit status arrives
    // inside the slice this act's response is read from. `sh` prints nothing
    // on most failures, so its output text is a poor witness and its exit
    // status is the real one.
    open: async () =>
      replSession({
        cmd: "sh",
        args: [],
        marker: `echo "rc=$? ${MARK}"`,
        accepted: (raw) => {
          const m = String(raw).match(/rc=(\d+)\s*$/);
          return { accepted: m ? Number(m[1]) === 0 : false, text: String(raw).replace(/rc=\d+\s*$/, "").trim() };
        },
      }),
    describe: () => ({
      accepted: "echo hello",
      foreign: "zzz_not_a_command",
      pair: [
        { act: "expr 6 \\* 7", effect: (t) => says(t, 42) },
        { act: "expr 10 + 20", effect: (t) => says(t, 30) },
      ],
      chain: {
        probe: "expr 6 \\* 7",
        read: (t) => {
          const m = String(t).match(/-?\d+/);
          return m ? Number(m[0]) : NaN;
        },
        use: (v) => `expr ${v} + 1`,
        check: (t, v) => Number.isFinite(v) && says(t, v + 1),
      },
      rule: {
        seen: [[2, 3], [4, 5]],
        novel: [7, 8],
        uncovered: ["x", 2],
        act: (c) => `expr ${c[0]} \\* ${c[1]}`,
        predict: (c) => (typeof c[0] === "number" && typeof c[1] === "number" ? c[0] * c[1] : null),
        check: (t, p) => p != null && says(t, p),
      },
      routes: {
        routes: [["expr 20 + 22"], ["Y=$(expr 6 \\* 7)", "echo $Y"]],
        reached: (obs) => obs.some((o) => says(o.text, 42)),
      },
      slot: {
        template: (c) => `command -v ${c} > /dev/null`,
        candidates: ["echo", "printf", "cd", "pwd", "true", "zzz_nope", "blorp", "qqq"],
        empty: "nothinghere",
      },
      intervention: {
        plan: ["X=42", "echo $X"],
        omit: 0,
        placebo: ":",
        effect: (obs) => obs.some((o) => says(o.text, 42)),
      },
    }),
  };
}

// -- run -------------------------------------------------------------------

async function main() {
  const kernel = await loadKernel();

  const python = pythonCounterpart();
  const sh = shCounterpart();
  const counterparts = [];
  if (kernel.layout) counterparts.push(gridCounterpart(kernel));
  else console.error(`kernel unreachable, grid counterpart omitted:\n  ${kernel.tried.join("\n  ")}`);
  counterparts.push(python, sh);

  for (const c of counterparts) {
    const d = declareCounterpart(c);
    if (!d.ok) throw new Error(`counterpart "${c.id}" refused: ${d.refusal.detail}`);
  }

  const runs = [];
  for (let i = 0; i < counterparts.length; i += 1) {
    const counterpart = counterparts[i];
    // Rotating siblings: every counterpart's discrimination control is a real
    // other counterpart, never a stub written to fail.
    const sibling = counterparts[(i + 1) % counterparts.length];
    process.stderr.write(`running ${counterpart.id} (sibling: ${sibling.id})...`);
    const started = Date.now();
    const ladder = interactionLadder({ counterpart, sibling, assembly: ASSEMBLY, draws: DRAWS, seed: SEED });
    const report = await runBattery(ladder.items, {}, { assembly: ASSEMBLY, priors: [], material: counterpart.id });
    process.stderr.write(` ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
    runs.push({ material: counterpart.id, kind: counterpart.kind, sibling: sibling.id, report, stage: stageFrom(report), gaps: ladder.gaps });
  }

  const independence = contentIndependence(runs.map((r) => ({ material: r.material, report: r.report })));

  const outDir = join(HERE, "results");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "mhc-interaction-battery.json"), JSON.stringify({ assembly: ASSEMBLY, kernel: kernel.layout, draws: DRAWS, seed: SEED, runs, independence }, null, 2));
  writeFileSync(join(outDir, "mhc-interaction-RESULTS.md"), markdown({ kernel, runs, independence }));
  console.log(markdown({ kernel, runs, independence }));
}

function markdown({ kernel, runs, independence }) {
  const L = [];
  L.push("# The interaction battery — what order of task this instrument completes when the material answers back\n");
  L.push(`Kernel: \`${kernel.layout ?? "unreachable — the grid counterpart was omitted"}\`. Seeded draws per arm: ${DRAWS}. Seed ${SEED}. No model anywhere in this run.\n`);
  L.push(`**READING-POLICY P0 — the assembly.** ${ASSEMBLY}\n`);
  L.push("**READING-POLICY P3 — priors injected.** None. Every number below is a result about an *unprimed* instrument.\n");
  L.push(
    "**The confound, named before any number.** In the reading battery the material is inert, so a stage read off it is the reader's. Here both sides act, so each row below is a claim about a PAIR — this ladder against that counterpart — and never about either alone. The `discrimination` arm's control is a real sibling counterpart, named per section.\n",
  );

  for (const run of runs) {
    L.push(`## ${run.material}\n`);
    L.push(`*${run.kind}*. Discrimination control: \`${run.sibling}\`.\n`);
    const s = run.stage;
    L.push(
      s.stage == null
        ? `**No stage is readable** — ${s.cappedBy?.detail ?? "nothing was measured"}\n`
        : `**Stage: ${s.stage} (${orderOf(s.stage)?.name})**${s.cappedBy ? ` — ${s.cappedBy.detail}` : " — the ladder stops at 11; nothing above it was declared"}\n`,
    );
    if (s.isolated.length) L.push(`Passes above the cap, carried as observations and NOT folded into the stage: ${s.isolated.map((i) => `${i.order} (${i.name})`).join(", ")}\n`);
    L.push("| order | name | verdict | item | detail |");
    L.push("|---|---|---|---|---|");
    for (const item of run.report.items) {
      const verdict = item.status === "passed" || item.status === "failed" ? `\`${item.status}\`` : `\`${item.status}\` (${item.reason})`;
      L.push(`| ${item.order} | ${orderOf(item.order)?.name} | ${verdict} | ${item.name} | ${String(item.detail ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")} |`);
    }
    L.push("");
    if (run.gaps.length) L.push(`Probes this counterpart does not offer: ${run.gaps.map((g) => g.probe).join(", ")}\n`);
  }

  L.push("## Environment-independence\n");
  L.push(
    "The interaction reading of the MHC's own content-independence claim: a task's ORDER must not depend on WHAT it is interacting with. It is not a claim that the instrument succeeds equally against every counterpart — that difference is ordinary, and it is what a stage measurement is for.\n",
  );
  if (independence.gap) {
    L.push(`Not examined: ${independence.detail}\n`);
    return L.join("\n");
  }
  L.push(`**Scale held: ${independence.held}** — ${independence.violations.length} order(s) changed their order-hood with the counterpart.\n`);
  if (independence.violations.length) {
    L.push("**Violations** — a valid order-N task against one counterpart, MIS-DECLARED against another. This is the thing the scale forbids:\n");
    for (const v of independence.violations) L.push(`- order ${v.order}: ${v.cells.map((c) => `${c.material}=\`${c.status}\``).join(", ")}`);
    L.push("");
  }
  if (independence.performance.length) {
    L.push("**Performance varied** — a well-formed task at that order against both, completed against one. Ordinary:\n");
    for (const p of independence.performance) L.push(`- order ${p.order}: ${p.cells.map((c) => `${c.material}=\`${c.status}\``).join(", ")}`);
    L.push("");
  }
  if (independence.noProbe.length) {
    L.push("**No probe** — the counterpart offers no specimen for that item. A fact about the counterpart:\n");
    for (const n of independence.noProbe) L.push(`- order ${n.order}: ${n.cells.map((c) => `${c.material}=\`${c.status}\``).join(", ")}`);
    L.push("");
  }
  if (independence.agreed.length) L.push(`Agreed outright on ${independence.agreed.length} order(s): ${independence.agreed.map((a) => `${a.order} (\`${a.status}\`)`).join(", ")}.\n`);
  L.push(`Orders 0-${SYMBOLIC_FLOOR - 1} are out of scope by construction (mhc.js's own declared floor); orders 12-16 carry no item on this ladder and are not implied.\n`);
  return L.join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
