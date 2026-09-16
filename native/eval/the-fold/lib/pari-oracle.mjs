// eval/the-fold/lib/pari-oracle.mjs — a REAL computation oracle for
// arithmetic geometry, in lib/pyodide-oracle.mjs's verdict vocabulary.
//
// WHY A SECOND ORACLE. pyodide-oracle.mjs is the science-stack verifier
// (sympy, scipy, numpy, networkx, sandboxed code). Its own header names the
// boundary honestly: a CAS is not everything, and what it cannot compute it
// returns `unchecked` for. Mordell-Weil rank is squarely past that boundary —
// rank is decided by descent, and no member of that stack implements it.
// PARI/GP does (`ellrank`, 2-descent with 4- and 8-descent fallbacks), so
// this file is the same seam pointed at a different engine.
//
// THE TRUST DIFFERENCE, DECLARED. pyodide runs in a WASM sandbox: the "code"
// engine executes generated code with no filesystem and no network, which is
// what makes executing it safe. This oracle shells out to a REAL system
// binary. That is a materially larger surface, so the input is not free-form:
// a caller hands COEFFICIENTS (validated as integers or rationals here), never
// a GP program, and this file builds the script. A coefficient that does not
// match the rational grammar is refused, never interpolated.
//
// VERDICT VOCABULARY, identical to pyodide-oracle.mjs so organs/reasoning-lint
// .js's injected `verify` takes either without knowing which it holds:
//   holds | false | undefined | ambiguous | unchecked
//
// WHAT IT WILL NOT DO (the R19 posture, kept). ellrank returns an interval
// [lo, hi]. When lo < hi the descent did NOT pin the rank — it bounded it.
// This file reports that as `unchecked` with the bounds named, never as a
// rank. An unproven rank is a gap, disclosed; it is never rounded to lo.

import { spawn } from "node:child_process";

/**
 * Run gp with a script on stdin. `execFile` has no stdin channel, so the
 * script must be written to the child explicitly or gp blocks on an open
 * stdin forever — the failure this helper exists to not have.
 */
function run(gp, args, { input = "", timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(gp, args);
    let stdout = "", stderr = "", settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; child.kill("SIGKILL"); const e = new Error(`timeout after ${timeout}ms`); e.killed = true; reject(e); } }, timeout);
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });
    child.on("error", (e) => { if (!settled) { settled = true; clearTimeout(timer); reject(e); } });
    child.on("close", () => { if (!settled) { settled = true; clearTimeout(timer); resolve({ stdout, stderr }); } });
    child.stdin.on("error", () => { /* gp may exit before the write drains */ });
    child.stdin.end(input);
  });
}

/** A coefficient the script may carry: an integer or a plain rational. */
const RATIONAL = /^-?\d+(\/\d+)?$/;

const bad = (detail) => Object.freeze({ verdict: "unchecked", detail });

/** Validate and normalize [a1,a2,a3,a4,a6] (or [A,B] short form). */
export function coefficients(coeffs) {
  if (!Array.isArray(coeffs) || (coeffs.length !== 2 && coeffs.length !== 5)) return null;
  const out = coeffs.map((c) => String(c).trim());
  return out.every((c) => RATIONAL.test(c)) ? out : null;
}

// Record-sized coefficients overflow gp's default 8 MB stack. Raising the
// ceiling reallocates the stack, which DISCARDS the rest of the input line it
// sits on — so it always goes on a line of its own, or nothing after it runs.
const STACK = "default(parisizemax, 2000000000)\n";

/** Validate points as [x, y] rational pairs; null if any fails the grammar. */
function pointList(points) {
  if (points == null) return [];
  if (!Array.isArray(points)) return null;
  const out = points.map((p) => (Array.isArray(p) ? coefficients([p[0], p[1]]) : null));
  return out.every(Boolean) ? out : null;
}
const gpPoints = (pts) => `[${pts.map(([x, y]) => `[${x},${y}]`).join(",")}]`;

/**
 * rank(coeffs, { points, timeoutMs }) — the descent, as a verdict-bearing
 * record. `exact` is a number ONLY when the descent pinned it (lo === hi);
 * `lo` is the descent's own proven lower bound either way. Known points, when
 * a construction supplies them, are handed to the descent so it does not have
 * to rediscover what was built.
 */
export async function rank(coeffs, { points = null, timeoutMs = 60000, gp = "gp" } = {}) {
  const none = { lo: null, hi: null, exact: null };
  const cs = coefficients(coeffs);
  if (!cs) return { ...bad("coefficients must be 2 or 5 integers/rationals — refused, never interpolated"), ...none };
  const pts = pointList(points);
  if (!pts) return { ...bad("a supplied point failed the rational grammar — refused, never interpolated"), ...none };
  const call = pts.length ? `ellrank(E,0,${gpPoints(pts)})` : "ellrank(E)";
  const script = `${STACK}E=ellinit([${cs.join(",")}]);if(type(E)!="t_VEC",print("SINGULAR"),r=${call};print(r[1]," ",r[2]))\nquit\n`;
  let stdout, stderr;
  try {
    ({ stdout, stderr } = await run(gp, ["-q"], { input: script, timeout: timeoutMs }));
  } catch (e) {
    return { ...bad(`gp did not return (${e.killed ? `timeout after ${timeoutMs}ms` : String(e.message).slice(0, 120)})`), ...none };
  }
  const line = String(stdout).trim().split("\n").filter(Boolean).at(-1) ?? "";
  if (line.includes("SINGULAR")) return { verdict: "undefined", detail: "the coefficients define a singular curve — not an elliptic curve at all", ...none };
  const m = line.match(/^(\d+)\s+(\d+)$/);
  if (!m) {
    const err = String(stderr).split("\n").map((s) => s.trim()).filter((s) => s && !s.includes("new maximum stack size")).at(-1) ?? "";
    return { ...bad(`gp returned no rank: ${(err || line).slice(0, 100)}`), ...none };
  }
  const lo = Number(m[1]), hi = Number(m[2]);
  if (lo !== hi) {
    return { verdict: "unchecked", detail: `descent proves rank >= ${lo} and <= ${hi} but did not pin it — disclosed, never rounded to ${lo}`, lo, hi, exact: null };
  }
  return { verdict: "holds", detail: `2-descent pins rank = ${lo}`, lo, hi, exact: lo };
}

/**
 * rankCandidate(candidate, opts) — `rank()`, but reading `points` off the
 * candidate's own `forced` field rather than requiring the caller to pass it.
 *
 * WHY THIS EXISTS. Measured live 2026-09-16: `curve-rank-ek.mjs` built a
 * `forced` array of 9 real, verified generator points on every candidate and
 * then called `pari.rank(candidate.coeffs, {timeoutMs})` — never passing
 * `points` at all. No error, no warning: the descent just silently started
 * from scratch on every single run, exactly as if the points did not exist.
 * A driver that reads `candidate.coeffs` and forgets `candidate.forced` looks
 * identical to one that read both, right up until the numbers are far weaker
 * than they should be — the same silent-gap shape this repo's own house law
 * elsewhere calls out for other kinds of missing wiring. Structurally
 * preventing it (read `forced` HERE, once, rather than trusting every call
 * site to remember) is worth more than a comment reminding callers to do it.
 *
 * `opts.points`, if supplied, is used ONLY as a fallback when the candidate
 * carries no `forced` field at all (e.g. a bare {coeffs} with no
 * construction behind it) — a candidate's own forced points always win.
 */
export function rankCandidate(candidate, opts = {}) {
  const { points: fallbackPoints, ...rest } = opts;
  const points = Array.isArray(candidate?.forced) && candidate.forced.length ? candidate.forced : (fallbackPoints ?? null);
  return rank(candidate?.coeffs, { ...rest, points });
}

/**
 * verifyAgainstPublished(candidate, claimedRank, opts) — before trusting a
 * transcribed formula/example against a paper's own worked case, check for
 * an outright CONTRADICTION rather than a plausible-looking number: the
 * descent's proven upper bound `hi` can never be less than a true rank, so
 * `hi < claimedRank` means something is wrong upstream (a mistranscribed
 * coefficient, or — as measured live 2026-09-16 on this family's own u=11/5
 * check — a t-value copied from the wrong coordinate system after a paper
 * applies its own transformation before searching). A single worked-example
 * check that "looks close enough" is not enough; an inconsistency here is a
 * signal to re-read the primary source, not to explain away.
 *
 * Returns `{ consistent, pinned, ...rank() }` — `consistent: false` names
 * the contradiction; `pinned: true` means the descent independently
 * reproduced the claimed rank exactly (the strongest confirmation this
 * function can give, short of the paper's own proof).
 */
export async function verifyAgainstPublished(candidate, claimedRank, opts = {}) {
  const r = await rankCandidate(candidate, opts);
  if (r.hi !== null && r.hi < claimedRank) {
    return { ...r, consistent: false, pinned: false, detail: `CONTRADICTS the claimed rank ${claimedRank}: descent proves rank <= ${r.hi} — re-check the transcription (coordinates, coefficients, t-value) against the primary source before trusting anything built on this` };
  }
  const pinned = r.exact === claimedRank;
  return { ...r, consistent: true, pinned, detail: pinned ? `independently reproduces the claimed rank = ${claimedRank} via full 2-descent` : `consistent with the claim (not contradicted) but not independently pinned: ${r.detail}` };
}

const LOW_PRECISION = 38;
const HIGH_PRECISION = 77;
const parseReal = (s) => Number(String(s).replace(/\s+E/, "E"));

/**
 * independence(coeffs, points) — are these points independent in the group?
 *
 * The height-pairing determinant is nonzero exactly when they are, but it is
 * computed in floating point, so "nonzero" cannot be read off a single value
 * without a cutoff, and a cutoff here would be a hand-set threshold. Instead
 * the determinant is computed at TWO declared precisions. A true zero is
 * rounding noise and shrinks with the working precision — by about
 * (HIGH - LOW) orders of magnitude. A true nonzero value does not move. The
 * decision is which of those two predictions the pair lies closer to, and the
 * midpoint comes from the declared precisions, not from tuning.
 */
export async function independence(coeffs, points, { timeoutMs = 60000, gp = "gp" } = {}) {
  const cs = coefficients(coeffs);
  const pts = pointList(points);
  if (!cs || !pts || !pts.length) return { ...bad("coefficients or points failed the rational grammar"), independent: null };
  const P = gpPoints(pts);
  const script = `${STACK}default(realprecision, ${LOW_PRECISION})\nE=ellinit([${cs.join(",")}]);on=vecmin(apply(p->ellisoncurve(E,p),${P}));d1=matdet(ellheightmatrix(E,${P}));\ndefault(realprecision, ${HIGH_PRECISION})\nE=ellinit([${cs.join(",")}]);d2=matdet(ellheightmatrix(E,${P}));print(on,"|",d1,"|",d2)\nquit\n`;
  let stdout;
  try { ({ stdout } = await run(gp, ["-q"], { input: script, timeout: timeoutMs })); }
  catch (e) { return { ...bad(`gp did not return (${String(e.message).slice(0, 100)})`), independent: null }; }
  const line = String(stdout).trim().split("\n").filter(Boolean).at(-1) ?? "";
  const [on, d1s, d2s] = line.split("|");
  if (on !== "1") return { verdict: "false", detail: "a supplied point does not lie on the curve", independent: false };
  const d1 = Math.abs(parseReal(d1s)), d2 = Math.abs(parseReal(d2s));
  if (!Number.isFinite(d1) || !Number.isFinite(d2)) return { ...bad(`unparseable determinants: ${line.slice(0, 80)}`), independent: null };
  if (d1 === 0 || d2 === 0) return { verdict: "false", detail: `the height-pairing determinant is exactly zero — the ${pts.length} points are dependent`, independent: false, d1, d2 };
  const drop = Math.log10(d1) - Math.log10(d2);
  const independent = drop < (HIGH_PRECISION - LOW_PRECISION) / 2;
  return independent
    ? { verdict: "holds", detail: `${pts.length} points independent: height determinant ${d2.toPrecision(6)} is stable from ${LOW_PRECISION} to ${HIGH_PRECISION} digits`, independent, d1, d2 }
    : { verdict: "false", detail: `the determinant falls ${drop.toFixed(0)} orders when precision rises — rounding noise, the points are dependent`, independent, d1, d2 };
}

/**
 * parallelVerify(claims, { jobs }) — the same `verify(claim)` re-check
 * reasoning-lint's own checking ladder makes, but SPENT IN PARALLEL and
 * READ BACK, never awaited fresh inside a sequential loop.
 *
 * `lintInferences` (organs/reasoning-lint.js) calls its injected `verify`
 * once per claim inside a plain `for...of` — right for the small batches a
 * reading turn produces, and a real cost for a search batch of hundreds:
 * measured live 2026-09-16, a 360-candidate sieve's own parallel search
 * phase (6 workers) finished in 533s, then sat re-verifying its ~340 pinned
 * claims ONE AT A TIME — the checking ladder alone taking longer than the
 * search it was checking, on the very discipline meant to make results
 * trustworthy FAST enough to actually run every time.
 *
 * This runs every `verify()` call through the same bounded worker pool the
 * search itself already uses, keyed by claim OBJECT IDENTITY (a Map, not a
 * derived key — two claims can share every field and still be distinct
 * claims about distinct candidates), and returns a `verify` function
 * `lintInferences` can call that only ever reads the precomputed Map — so
 * the sequential loop still runs, but it does bookkeeping, not a fresh
 * spawn+gp round trip.
 */
export function parallelVerify(claims, { jobs = 4 } = {}) {
  const list = Array.isArray(claims) ? claims : [];
  const results = new Map();
  const ready = (async () => {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(jobs, list.length) }, async () => {
      while (next < list.length) {
        const i = next; next += 1;
        results.set(list[i], await verify(list[i]));
      }
    }));
  })();
  const lookup = async (claim) => { await ready; return results.get(claim) ?? bad("parallelVerify: claim was not in the batch this pool precomputed"); };
  return { ready, verify: lookup };
}

/**
 * verify(claim) — the reasoning-lint `verify` shape. A claim declares
 * `pari: { coeffs, rank }` for an EXACT rank, or `pari: { coeffs, atLeast,
 * points }` for a LOWER BOUND — the shape rank records take: nobody pins the
 * rank of a record curve, they exhibit enough independent points. The two
 * claims are different claims and are checked differently.
 */
export async function verify(claim) {
  const spec = claim?.pari;
  if (!spec) return bad("no `pari` engine expression declared on this claim");
  if (Number.isInteger(spec.atLeast)) {
    const r = await rank(spec.coeffs, spec);
    if (r.lo !== null && r.lo >= spec.atLeast) return { verdict: "holds", detail: `descent proves rank >= ${r.lo} >= ${spec.atLeast}` };
    if (r.hi !== null && r.hi < spec.atLeast) return { verdict: "false", detail: `descent proves rank <= ${r.hi} < ${spec.atLeast}` };
    if (Array.isArray(spec.points) && spec.points.length >= spec.atLeast) {
      const ind = await independence(spec.coeffs, spec.points.slice(0, spec.atLeast), spec);
      if (ind.independent) return { verdict: "holds", detail: `rank >= ${spec.atLeast} by exhibited points: ${ind.detail}` };
    }
    return { verdict: "unchecked", detail: `rank >= ${spec.atLeast} neither proven nor refuted (${r.detail})` };
  }
  const r = await rank(spec.coeffs, spec);
  if (r.exact === null) return { verdict: r.verdict, detail: r.detail };
  if (!Number.isInteger(spec.rank)) return bad(`the claim declares no integer rank to check against (got ${JSON.stringify(spec.rank)})`);
  return spec.rank === r.exact
    ? { verdict: "holds", detail: `2-descent confirms rank = ${r.exact}` }
    : { verdict: "false", detail: `2-descent says rank = ${r.exact}, the claim says ${spec.rank}` };
}

/** Does a point actually lie on the curve? A cheap, separate check. */
export async function onCurve(coeffs, [x, y], { timeoutMs = 15000, gp = "gp" } = {}) {
  const cs = coefficients(coeffs);
  const pt = coefficients([x, y]);
  if (!cs || !pt) return bad("coefficients or point failed the rational grammar");
  const script = `E=ellinit([${cs.join(",")}]);print(ellisoncurve(E,[${pt.join(",")}]));quit;`;
  try {
    const { stdout } = await run(gp, ["-q"], { input: script, timeout: timeoutMs });
    const v = String(stdout).trim().split("\n").filter(Boolean).at(-1);
    return v === "1"
      ? { verdict: "holds", detail: `(${pt.join(",")}) lies on the curve` }
      : { verdict: "false", detail: `(${pt.join(",")}) does NOT lie on the curve` };
  } catch (e) {
    return bad(`gp did not return (${String(e.message).slice(0, 100)})`);
  }
}

/** Is gp reachable at all? Callers disclose this rather than assume it. */
export async function available({ gp = "gp" } = {}) {
  try {
    // gp prints its banner on stderr; read both rather than assume a stream.
    const { stdout, stderr } = await run(gp, ["--version"], { timeout: 10000 });
    const banner = (String(stdout) + String(stderr)).trim().split("\n").filter(Boolean)[0] ?? "";
    return { ok: Boolean(banner), version: banner };
  } catch (e) {
    return { ok: false, version: null, detail: String(e.message).slice(0, 120) };
  }
}
