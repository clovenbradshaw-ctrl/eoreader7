// eval/the-fold/lib/pyodide-oracle.mjs — a REAL computation oracle: claims
// are verified by the scientific Python stack running inside the vendored
// pyodide (the exact loadPattern scripts/date-normalize.mjs uses; the
// libraries are in node_modules/pyodide/pyodide-lock.json, the P21 wheel
// organ's mirror).
//
// WHY THIS FILE. The reasoning linter (organs/reasoning-lint.js) takes an
// injected `verify`/`refute` — the caller's oracle. A claim verifier is only
// worth the name if the verdicts are COMPUTED, not declared: sympy does
// symbolic differentiation and integration, scipy does exact statistical
// tests (the P70 precedent — exact hypergeometric tails instead of
// hand-derived closed forms), numpy does numerical checks, networkx does
// graph claims, and the sandbox executes generated code. All of it is the
// same seam, one boot, one verdict vocabulary.
//
// HOW A CLAIM IS DISPATCHED. A claim carries ONE of these fields, and the
// right engine runs it:
//
//   sympy      — a sympy expression (difference form: simplify→0 means holds)
//   scipy      — a small Python program using scipy.stats (exact nulls:
//                fisher_exact, hypergeom, binom_test, mannwhitneyu...)
//   numpy      — a small Python program using numpy (numerical claims)
//   networkx   — a small Python program using networkx (graph claims)
//   code       — generated code to EXECUTE (a function body + test input),
//                verified by actually running it, never by looking at it
//
// Each engine returns the linter's verdict vocabulary exactly:
//   { verdict: "holds" | "false" | "undefined" | "ambiguous" | "unchecked", detail }
//
// WHAT IT CANNOT DO, AND WHY THAT IS THE POINT (R19). A CAS is not a proof
// assistant for metamathematics: it cannot touch "CH is independent of ZFC".
// An honest verifier says `unchecked` for exactly those claims — the same
// withhold-never-guess posture every other organ here holds.
//
// COST, disclosed. Pyodide boot ~9s (this repo's documented figure). This is
// an OFFLINE / BATCH tool: boot once, verify many claims in one process.
// Never per-claim inside a live turn.
//
//   node eval/the-fold/lib/pyodide-oracle.mjs        (self-test)
//   node eval/the-fold/lib/pyodide-oracle.mjs code    (the code-execution test)

import { loadPyodide } from "pyodide";

let PY = null;

/** Boot pyodide + the science stack once; reused for the whole batch. */
export async function bootPyodide() {
  if (PY) return PY;
  PY = await loadPyodide();
  // Lazy, declared, additive: the first claim of each kind loads its own
  // package; sympy is the common denominator (its mpmath underlies scipy's
  // hypergeometric machinery), so it boots with the stack.
  await PY.loadPackage(["sympy", "numpy", "scipy"]);
  return PY;
}

/** Run a python program; return the last expression's value as text. */
async function run(py, code) {
  const out = await py.runPython(code);
  return String(out ?? "").trim();
}

/**
 * verify(claim) — dispatch to the engine the claim names. A claim with no
 * engine field is `unchecked`, disclosed, never guessed.
 */
export async function verify(claim) {
  const py = await bootPyodide();
  const { sympy, scipy, numpy, networkx, code, _run = code } = claim ?? {};

  if (sympy != null) return verifySympy(py, sympy);
  if (scipy != null) return verifyScipy(py, scipy);
  if (numpy != null) return verifyNumpy(py, numpy);
  if (networkx != null) return verifyNetworkx(py, networkx);
  if (code != null) return verifyCode(py, code);
  return { verdict: "unchecked", detail: "no engine expression declared for this claim — it is outside the computation this oracle can reach (e.g. a metamathematical statement about ZFC), disclosed, never guessed" };
}

/** sympy — symbolic difference, reduced to a verdict (nan/zoo vs oo vs value). */
async function verifySympy(py, expr) {
  const out = await run(py, `
from sympy import *
x, a, b, t, n = symbols('x a b t n')
expr = ${expr}
try:
    d = simplify(expr)
    result = "HOLDS" if d == 0 else "FALSE:" + str(d)
except ZeroDivisionError:
    result = "UNDEFINED: division by zero"
except Exception as e:
    result = "ERR:" + type(e).__name__ + " " + str(e)[:120]
result
`);
  return classifySympy(out);
}

function classifySympy(s) {
  const last = s.split("\n").filter(Boolean).at(-1) ?? "";
  if (last.startsWith("HOLDS")) return { verdict: "holds", detail: "sympy simplifies the difference to zero" };
  if (last.startsWith("FALSE:")) {
    const d = last.slice(6).trim();
    // nan / zoo — the expression has NO value (0/0, 1/0 in the reals):
    // undefined, never a countervalue (1/0 is not ∞).
    // oo / -oo — genuinely infinite; a claim of a FINITE value is FALSE.
    if (/^(nan|zoo)$/.test(d)) return { verdict: "undefined", detail: `the expression evaluates to ${d} — undefined in the real numbers, not a countervalue` };
    if (/^[+-]?oo$/.test(d)) return { verdict: "false", detail: `the expression is ${d}, not the finite value claimed — e.g. the harmonic series diverges, it converges to no number` };
    return { verdict: "false", detail: `sympy reduces the difference to: ${d}` };
  }
  if (last.startsWith("UNDEFINED:")) return { verdict: "undefined", detail: last.slice(11).trim() };
  if (last.startsWith("ERR:")) return { verdict: "undefined", detail: last.slice(4).trim() };
  return { verdict: "unchecked", detail: `sympy returned an unrecognized answer: ${last.slice(0, 80) || s.slice(0, 80)}` };
}

/** The verdict contract every engine hands back: VERDICT:detail on the last line. */
function classifyPython(s, engine) {
  const last = s.split("\n").filter(Boolean).at(-1) ?? "";
  const m = last.match(/^(HOLDS|FALSE|UNDEFINED|AMBIGUOUS|UNCHECKED):?(.*)$/);
  if (!m) return { verdict: "unchecked", detail: `${engine} returned an unrecognized answer: ${last.slice(0, 80) || s.slice(0, 80)}` };
  const [, v, d] = m;
  const map = { HOLDS: "holds", FALSE: "false", UNDEFINED: "undefined", AMBIGUOUS: "ambiguous", UNCHECKED: "unchecked" };
  return { verdict: map[v], detail: (d || "").trim() || `${engine} computed the claim's truth` };
}

/** scipy — exact statistical tests (Fisher, hypergeometric, binomial, ...). */
async function verifyScipy(py, program) {
  const out = await run(py, `
from scipy import stats
import numpy as np
try:
${indent(program)}
except Exception as e:
    result = "UNDEFINED:" + type(e).__name__ + " " + str(e)[:120]
result
`);
  return classifyPython(out, "scipy");
}

/** numpy — numerical claims (matrix singularity, norms, aggregation, ...). */
async function verifyNumpy(py, program) {
  const out = await run(py, `
import numpy as np
try:
${indent(program)}
except Exception as e:
    result = "UNDEFINED:" + type(e).__name__ + " " + str(e)[:120]
result
`);
  return classifyPython(out, "numpy");
}

/** networkx — graph claims (bipartite, acyclic, connectivity, ...). */
async function verifyNetworkx(py, program) {
  const pyid = await PY;
  await pyid.loadPackage("networkx");
  const out = await run(py, `
import networkx as nx
try:
${indent(program)}
except Exception as e:
    result = "UNDEFINED:" + type(e).__name__ + " " + str(e)[:120]
result
`);
  return classifyPython(out, "networkx");
}

/**
 * verifyCode — execute GENERATED code and check it against a test input.
 * `code` is { src, test } where `src` is the code to run (a function or a
 * script that binds a result) and `test` is a python program that ends by
 * setting `result` to the verdict. The claim is verified by RUNNING it —
 * never by looking at it — the witness.js compile-check taken one step
 * further, on the actual bytes.
 */
async function verifyCode(py, { src, test }) {
  // The source is injected as the file the test imports — pyodide's MEMFS,
  // the same mount term-py-worker.mjs uses. Runs only inside the sandbox.
  await py.runPython(`
import sys, io
_src = ${JSON.stringify(String(src ?? ""))}
open("/tmp/_gen.py", "w").write(_src)
sys.path.insert(0, "/tmp")
`);
  const out = await run(py, `
try:
${indent(test)}
except Exception as e:
    result = "UNDEFINED:" + type(e).__name__ + " " + str(e)[:120]
result
`);
  return classifyPython(out, "code");
}

/** Indent a caller program so it lives inside the engine's try block. */
function indent(program) {
  return String(program ?? "")
    .split("\n")
    .map((l) => (l.trim() ? "    " + l : l))
    .join("\n");
}

/**
 * refute(inf) — a counterexample search over a declared sample grid, for a
 * universal claim. Sound ONE way only: a found counterexample is a real
 * refutation; "none among the declared samples" is withheld, never a
 * confirmation (R2 — refutation is a veto, never a licence).
 */
export async function refute(inf) {
  const py = await bootPyodide();
  const grid = inf?.grid;
  if (!grid) return null;
  const out = await run(py, `${grid}`);
  if (out && out !== "NONE") return { refuted: true, detail: out };
  return { refuted: false, detail: "no counterexample among the declared sample grid" };
}

// Backwards-compatible alias: the sympy-only name the demo and tests already
// import still works; this module is the same engine with more faces.
export const bootSympy = bootPyodide;

// ── self-test (the same claims the demo lints, computed not typed) ────────
const IS_MAIN = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (IS_MAIN) {
  const onlyCode = process.argv.includes("code");
  const cases = [
    { label: "∫₀¹ x² dx = ½", sympy: "integrate(x**2, (x, 0, 1)) - Rational(1,2)" },
    { label: "d/dx sin(x²) = cos(x²)", sympy: "diff(sin(x**2), x) - cos(x**2)" },
    { label: "CH independent of ZFC", sympy: null },
    { label: "Fisher: 2×2 association is real (exact)", scipy: `
a = np.array([[8, 2], [1, 5]])
p = stats.fisher_exact(a)[1]
result = "HOLDS:" + ("p=%.4f, below the 0.05 bar" % p) if p < 0.05 else "FALSE:p=%.4f" % p
` },
    { label: "hypergeometric tail: 3 of 5 from a marked 2 of 20 (exact)", scipy: `
p = stats.hypergeom.sf(2, 20, 2, 5)
result = "HOLDS:" + ("p=%.5f, exact closed form" % p) if p < 0.05 else "FALSE:p=%.5f" % p
` },
    { label: "matrix [[1,2],[2,4]] is singular (numpy)", numpy: `
A = np.array([[1.0, 2.0], [2.0, 4.0]])
result = "HOLDS:det=%.3g ~ 0" % np.linalg.det(A) if abs(np.linalg.det(A)) < 1e-12 else "FALSE:det=%.3g" % np.linalg.det(A)
` },
    { label: "graph C4 is bipartite (networkx)", networkx: `
G = nx.cycle_graph(4)
result = "HOLDS:four-cycle is 2-colorable" if nx.is_bipartite(G) else "FALSE:not bipartite"
` },
  ];
  if (onlyCode) {
    const c = {
      label: "generated average() skips nums[0]",
      code: {
        src: "def average(nums):\n    total = 0\n    for i in range(1, len(nums)):\n        total += nums[i]\n    return total / len(nums)",
        test: `
import _gen
out = _gen.average([1, 2, 3])
result = "HOLDS:" + ("average=%.2f" % out) if abs(out - 2.0) < 1e-9 else "FALSE:average=%.2f, expected 2.00 (skips nums[0])" % out
`,
      },
    };
    console.log(`${c.label} → ${JSON.stringify(await verify(c))}`);
    process.exit(0);
  }
  for (const c of cases) console.log(`${c.label} → ${JSON.stringify(await verify(c))}`);
}