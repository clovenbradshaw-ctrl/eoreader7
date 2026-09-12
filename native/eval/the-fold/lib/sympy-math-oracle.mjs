// eval/the-fold/lib/sympy-math-oracle.mjs — a REAL math oracle: claims are
// verified symbolically by sympy, running inside the vendored pyodide
// (the exact loadPattern scripts/date-normalize.mjs uses; sympy+mpmath are
// in node_modules/pyodide/pyodide-lock.json, the P21 wheel organ's mirror).
//
// WHY THIS FILE. The reasoning linter (organs/reasoning-lint.js) takes an
// injected `verify`/`refute` — the caller's oracle. Until now the demo
// hand-typed verdicts. A math verifier is only worth the name if the
// verdicts are COMPUTED, not declared: sympy does symbolic differentiation,
// integration, simplification, and limits, so "∫₀¹x² dx = ½" is answered by
// actually integrating to ⅓, never by a table.
//
// WHAT IT CANNOT DO, AND WHY THAT IS THE POINT (R19). Sympy is a CAS, not a
// proof assistant for metamathematics. It cannot touch "CH is independent of
// ZFC" — that is a theorem ABOUT ZFC, needing a proof checker over a formal
// system (Lean/mathlib, Metamath set.mm), not symbolic algebra. An honest
// verifier says `unchecked` for exactly those claims — the same withhold-
// never-guess posture every other organ here holds. The CH article's
// philosophical moves (Platonist stance → truth value) are then caught by
// the linter's OWN R1 tier, not by any oracle: structure never licenses
// composition.
//
// COST, disclosed. Pyodide boot ~9s (this repo's documented figure). This
// is an OFFLINE / BATCH tool: boot once, verify many claims in one process.
// Never per-claim inside a live turn.
//
//   node eval/the-fold/lib/sympy-math-oracle.mjs   (self-test)
//
// The oracle speaks the linter's verdict vocabulary exactly:
//   { verdict: "holds" | "false" | "undefined" | "ambiguous" | "unchecked", detail }

import { loadPyodide } from "pyodide";

let PY = null;

/** Boot pyodide + sympy once; reused for the whole batch. */
export async function bootSympy() {
  if (PY) return PY;
  PY = await loadPyodide();
  await PY.loadPackage("sympy");
  return PY;
}

/**
 * verify(claim) — symbolic check of an equation claim.
 *
 * `claim` carries a `sympy` field: the exact sympy expression whose truth we
 * ask (a difference expression — sympy reduces it and reports whether it
 * simplifies to zero). Claims without a `sympy` expression are `unchecked`
 * with a detail saying the claim is outside the algebra this oracle can
 * reach — never a guessed verdict.
 */
export async function verify(claim) {
  const py = await bootSympy();
  const expr = claim?.sympy;
  if (!expr) {
    return { verdict: "unchecked", detail: "no sympy expression declared for this claim — it is outside the algebra this oracle can reach (e.g. a metamathematical statement about ZFC), disclosed, never guessed" };
  }
  // An expression like "simplify(...) - simplify(...)" or a plain value we
  // reduce to a verdict. Runs inside sympy; the wasm call is the one truth.
  const out = await py.runPython(`
from sympy import *
x, a, b, t, n = symbols('x a b t n')
expr = ${expr}
try:
    d = simplify(expr)
    if d == 0:
        result = "HOLDS"
    else:
        result = "FALSE:" + str(d)
except ZeroDivisionError:
    result = "UNDEFINED: division by zero"
except Exception as e:
    result = "ERR:" + type(e).__name__ + " " + str(e)[:120]
result
`);
  const s = String(out ?? "").trim();
  const last = s.split("\n").filter(Boolean).at(-1) ?? "";
  if (last.startsWith("HOLDS")) return { verdict: "holds", detail: "sympy simplifies the difference to zero" };
  if (last.startsWith("FALSE:")) {
    const d = last.slice(6).trim();
    // Three different non-zero answers, three different verdicts:
    //   nan / zoo  — the expression has NO value (0/0, 1/0 in the reals);
    //                undefined, never a countervalue (1/0 is not ∞).
    //   oo / -oo   — the expression is genuinely infinite; a claim that it
    //                equals a FINITE value (the harmonic sum "converges to
    //                1.64") is FALSE, not undefined.
    //   anything else — an ordinary nonzero difference: FALSE.
    if (/^(nan|zoo)$/.test(d)) return { verdict: "undefined", detail: `the expression evaluates to ${d} — undefined in the real numbers, not a countervalue` };
    if (/^[+-]?oo$/.test(d)) return { verdict: "false", detail: `the expression is ${d}, not the finite value claimed — e.g. the harmonic series diverges, it converges to no number` };
    return { verdict: "false", detail: `sympy reduces the difference to: ${d}` };
  }
  if (last.startsWith("UNDEFINED:")) return { verdict: "undefined", detail: last.slice(11).trim() };
  if (last.startsWith("ERR:")) return { verdict: "undefined", detail: last.slice(4).trim() };
  return { verdict: "unchecked", detail: `sympy returned an unrecognized answer: ${last.slice(0, 80) || s.slice(0, 80)}` };
}

/**
 * refute(inf) — a counterexample search over a declared sample grid, for a
 * universal claim. Sound ONE way only: a found counterexample is a real
 * refutation; "none among the declared samples" is withheld, never a
 * confirmation (R2 — refutation is a veto, never a licence).
 */
export async function refute(inf) {
  const py = await bootSympy();
  const grid = inf?.grid;
  if (!grid) return null;
  const out = await py.runPython(`
${grid}
`);
  const s = String(out ?? "").trim();
  if (s && s !== "NONE") return { refuted: true, detail: s };
  return { refuted: false, detail: "no counterexample among the declared sample grid" };
}

// ── self-test (the same claims the demo lints, computed not typed) ────────
const IS_MAIN = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (IS_MAIN) {
  const cases = [
    { label: "∫₀¹ x² dx = ½", sympy: "integrate(x**2, (x, 0, 1)) - Rational(1,2)" },
    { label: "d/dx sin(x²) = cos(x²)", sympy: "diff(sin(x**2), x) - cos(x**2)" },
    { label: "(x²−1)/(x−1) = x+1 (identity)", sympy: "simplify((x**2-1)/(x-1) - (x+1))" },
    { label: "log(a)+log(b) = log(a+b)", sympy: "log(a)+log(b) - log(a+b)" },
    { label: "cos(2θ) = 2cos(θ)", sympy: "cos(2*t) - 2*cos(t)" },
    { label: "2¹⁰+2¹⁰ = 2¹¹", sympy: "2**10 + 2**10 - 2**11" },
    { label: "CH independent of ZFC", sympy: null },
  ];
  for (const c of cases) console.log(`${c.label} → ${JSON.stringify(await verify(c))}`);
}