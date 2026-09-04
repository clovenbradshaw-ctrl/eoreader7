// longform-code.mjs — can a code artifact grow past what any single message
// could emit, because each message carries only a DELTA?
//
// THE CLAIM UNDER TEST. `/fold <n>` and every routed complaint ask the model
// for ONE flat {find, add} edit (app.js's PATCH_SCHEMA), read it mechanically
// (build-log.js's readOps), type the act off the BYTES rather than off any
// label the model wrote (deriveOp), and land it as a SUPERSEDE carrying only
// the delta (patchBuild). `foldBuild` then compiles the whole at any cursor
// from the last full entry plus the patch stack. If that works, an artifact's
// size is bounded by nothing the model has to say in one breath.
//
// THE CONTROL, BUILT TO FAIL (eo-constitution II.23). A `regenerate` arm where
// the model re-emits the WHOLE artifact every turn — which is what an ordinary
// chat loop does. If the delta arm does not emit dramatically less for the
// same final artifact, the patch carriage buys nothing and should be said to
// buy nothing. Both arms must also land the IDENTICAL final code, or the
// comparison is between two different things.
//
// NO MODEL RUNS HERE, and that is deliberate rather than a limitation being
// hidden: this measures the CARRIAGE (does a delta stack compile the same
// whole, and at what emission cost), not whether a model writes good patches.
// The scripted stand-in emits exactly the patch a correct model would. What a
// real model does with this schema is measured elsewhere and is not claimed
// by this driver — see P16's amendment for the live iterate-eval numbers.
//
//   node longform-code.mjs        env: STEPS
import * as taskLog from "../../kernel/task-log.js";

const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const { makeBuildLog } = await import(`${FOLD}/build-log.js`);
const buildLog = makeBuildLog(taskLog);

// DECLARED (P4/P9): how many turns of longform we simulate. The claim is
// about the SHAPE of the two curves, which is visible at any N above a few;
// 24 keeps the run instant and the arithmetic legible.
const STEPS = Number(process.env.STEPS ?? 24);

const SEED = `// telemetry.js — rolling statistics over a live stream.
export function createTelemetry() {
  const state = { count: 0 };
  return { state };
}
`;

// Each turn adds one real function. A patch anchors on the LAST line the
// previous turn added, which is what a model reading the current projection
// would do.
const fnFor = (i) => `
export function metric${i}(xs) {
  if (!Array.isArray(xs) || !xs.length) return null;
  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const spread = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  return { metric: ${i}, n, mean, spread };
}
`;

const ANCHOR = "  return { state };\n}\n";

// ── ARM A: deltas. The model emits one {find, add} per turn. ─────────────
function deltaArm() {
  let log = buildLog.proposeBuild({
    n: 1, turn: 1, caption: "telemetry", instruction: "a rolling-statistics module",
    seg: { type: "code", lang: "js", code: SEED },
  });
  const emitted = [];
  let landed = 0, refused = 0;
  const cursors = [];

  for (let i = 1; i <= STEPS; i++) {
    // What a correct model would say this turn: anchor on the tail of what
    // it can see, append the new function. `add` CONTAINS `find`, so
    // deriveOp reads this as INS · admit off the bytes.
    const find = i === 1 ? ANCHOR : fnFor(i - 1);
    const patch = { find, add: find + fnFor(i) };
    const bytes = JSON.stringify(patch).length;
    emitted.push(bytes);

    const ops = buildLog.readOps([patch]);
    if (!ops) { refused++; continue; }
    const r = buildLog.patchBuild(log, { ops, reason: "revision", tell: `add metric${i}` });
    if (!r.landed) { refused++; continue; }
    log = r.log;
    landed++;
    cursors.push(log.entries[log.entries.length - 1].seq);
  }
  return { log, emitted, landed, refused, cursors, code: buildLog.foldBuild(log)?.code ?? null };
}

// ── ARM B (the control): regenerate. The model re-emits the whole thing. ──
function regenerateArm() {
  let log = buildLog.proposeBuild({
    n: 2, turn: 1, caption: "telemetry", instruction: "a rolling-statistics module",
    seg: { type: "code", lang: "js", code: SEED },
  });
  const emitted = [];
  let code = SEED;
  for (let i = 1; i <= STEPS; i++) {
    code = code + fnFor(i);
    emitted.push(JSON.stringify({ code }).length); // the whole artifact, every turn
    // reviseBuild returns the LOG itself, not {log, landed} — unlike
    // patchBuild. Getting that wrong left the control arm frozen at its seed
    // and reported a vacuous pass; the built-something guard below is what
    // caught it.
    log = buildLog.reviseBuild(log, { code, reason: "edit" });
  }
  return { log, emitted, code: buildLog.foldBuild(log)?.code ?? null };
}

const A = deltaArm();
const B = regenerateArm();
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

console.log(`longform code over ${STEPS} turns — delta carriage vs regenerating the whole artifact\n`);
console.log(`                              delta arm    regenerate (control)`);
console.log(`turns landed                  ${String(A.landed).padStart(9)}    ${String(STEPS).padStart(9)}`);
console.log(`final artifact chars          ${String(A.code?.length ?? 0).padStart(9)}    ${String(B.code?.length ?? 0).padStart(9)}`);
console.log(`largest single emission       ${String(Math.max(...A.emitted)).padStart(9)}    ${String(Math.max(...B.emitted)).padStart(9)}`);
console.log(`TOTAL bytes the model emitted ${String(sum(A.emitted)).padStart(9)}    ${String(sum(B.emitted)).padStart(9)}`);
console.log(`  ratio (regenerate / delta)  ${(sum(B.emitted) / sum(A.emitted)).toFixed(2)}x`);

console.log(`\nemission per turn (first 6 / last 3):`);
const show = (xs) => xs.slice(0, 6).join(", ") + " … " + xs.slice(-3).join(", ");
console.log(`  delta      : ${show(A.emitted)}`);
console.log(`  regenerate : ${show(B.emitted)}`);

// ── THE CORRECTNESS CHECKS — a cheaper curve proves nothing if it built
//    something else. ───────────────────────────────────────────────────
console.log(`\n── correctness ──`);
// GUARD: two empty artifacts are trivially "identical" and would report a
// pass while proving nothing. An arm that produced no code fails outright.
const built = Boolean(A.code) && Boolean(B.code) && A.code.length > SEED.length;
const same = built && A.code === B.code;
console.log(`  both arms actually BUILT something: ${built ? "yes" : "*** NO — every check below is vacuous ***"}`);
console.log(`  both arms landed the IDENTICAL final artifact: ${same ? "yes" : built ? "*** NO — the comparison is void ***" : "(unanswerable — nothing was built)"}`);
if (!same) {
  console.log(`    delta tail     : ${JSON.stringify(String(A.code).slice(-90))}`);
  console.log(`    regenerate tail: ${JSON.stringify(String(B.code).slice(-90))}`);
}
console.log(`  every function present in the delta arm: ${
  Array.from({ length: STEPS }, (_, i) => `metric${i + 1}(`).filter((f) => String(A.code).includes(f)).length
} of ${STEPS}`);

// foldBuild must compile the whole from the patch stack at EVERY cursor.
let cursorOk = 0, cursorBad = [];
A.cursors.forEach((seq, i) => {
  const at = buildLog.foldBuild(A.log, seq);
  const expect = i + 1; // functions present as of this turn
  const have = Array.from({ length: STEPS }, (_, k) => `metric${k + 1}(`).filter((f) => String(at?.code ?? "").includes(f)).length;
  if (have === expect) cursorOk++; else cursorBad.push({ seq, expect, have });
});
console.log(`  foldBuild compiles the right whole at each cursor: ${cursorOk} of ${A.cursors.length}`);
for (const b of cursorBad.slice(0, 3)) console.log(`    seq ${b.seq}: expected ${b.expect} functions, got ${b.have}`);

// ── L5: the act is typed off the BYTES, never off the model's label ──
console.log(`\n── L5: the operator is read off the bytes, not the model's word ──`);
const lying = { op: "INS", find: "const state = { count: 0 };", add: "const state = { count: 0, sum: 0 };" };
const readBack = buildLog.readOps([lying]);
console.log(`  model SAID: ${lying.op}   ·   bytes actually REPLACE the anchor`);
console.log(`  derived   : ${readBack?.[0]?.op}  ${readBack?.[0]?.op === "SYN" ? "(correct — a replacement is SYN·compile, not INS·admit)" : "*** took the label at its word ***"}`);
console.log(`\nNo model ran. This measures the carriage, not whether a model writes good patches.`);
