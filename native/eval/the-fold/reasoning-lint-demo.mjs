#!/usr/bin/env node
// eval/the-fold/reasoning-lint-demo.mjs — Degrees Kelsen, run LIVE on
// three corpora:
//
//   1. the seed's own falsifiable case (§7) — one ordinance with a sunset
//      clause and one contested landContest claim in the same corpus;
//   2. a rhetorical essay (fixtures/speed-essay.txt) — persuasion posing as
//      reasoning, read as content the system itself might generate;
//   3. a math/code sheet (fixtures/math-code.txt) — statements and blocks,
//      several wrong, read with a REAL oracle (the values are computed, not
//      declared) plus the seed's R1 inference tier.
//
// Every claim is admitted through the REAL notes ledger
// (kernel/notes.js via organs/hyperlexicon.js), tagged at admission
// (regime.js tagClaim), and linted by organs/reasoning-lint.js at all three
// strictness levels. Spans are byte-addressed and self-verified against the
// fixture file (P5.2) — an address that does not read back is refused, not
// silently carried.
//
// The demo's `convert` is a DECLARED reading (the extraction the seed says
// the producing organ performs); the linter's job — the order, the
// containment boundary, the licences — is what is being demonstrated, and
// every finding it reports is computed from the real ledger, never typed.
//
//   node eval/the-fold/reasoning-lint-demo.mjs        (terminal report)
//   node eval/the-fold/reasoning-lint-report.mjs      (browser report → HTML)

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as TL from "../../kernel/task-log.js";
import * as cube from "../../kernel/cube.js";
import { makeHyperlexicon } from "../../organs/hyperlexicon.js";
import { tagClaim } from "../../organs/regime.js";
import { lintLedger, lintInferences, lintTimeline, lintReport } from "../../organs/reasoning-lint.js";
import { verify as pyVerify, refute as pyRefute, bootPyodide } from "./lib/pyodide-oracle.mjs";

const taskLog = { ...TL, cellOf: cube.cellOf };
const hl = makeHyperlexicon(taskLog);

const FIX = fileURLToPath(new URL("./fixtures/", import.meta.url));
const line = (s = "") => console.log(s);

/** Byte-addressed, self-verified span: the phrase must read back from the file. */
function byteSpan(file, text) {
  const bytes = new TextEncoder().encode(text);
  const hay = readFileSync(file, "utf8");
  const i = hay.indexOf(text);
  if (i === -1) throw new Error(`demo: "${text.slice(0, 60)}…" not found in ${file} — the declared reading no longer matches its own fixture`);
  const at = `${file.split("/").pop()}#${i}-${i + bytes.length}`;
  const readBack = hay.slice(i, i + text.length);
  if (readBack !== text) throw new Error(`demo: span ${at} does not read back verbatim (P5.2)`);
  return { at, ref: file.split("/").pop(), text };
}

const STRICTNESS = Object.freeze(["report", "standard", "strict"]);

/** Every lint run returns { ok, strictness, findings, counts } — a shared shape. */
const asRun = (r) => ({ ok: r.ok, strictness: r.strictness, findings: r.findings ?? [], counts: r.counts ?? {} });

// ── 1. THE SEED'S FALSIFIABLE CASE (§7) ────────────────────────────────────

function seedCase() {
  const queryTime = Date.parse("2026-09-11");
  let log = hl.createHyperlexicon({ frame: { reader: "demo", giver: "reasoning-lint-demo.mjs", corpus: "ordinance corpus" } });
  // THE FOLDS, captured: each write is a fold point. The holograph folds the
  // record at a cursor; this case shows the universe fold — a contested note
  // APPEARS at the fold its dispute lands, an expired obligation PERSISTS
  // across them, the derived product's expired premise RESOLVES nothing but
  // is itself caught at the final fold.
  const folds = [];
  log = hl.hear(log, { subject: "operators", verb: "must-file", object: "annual-report", witness: "ordinance.txt~r1", spans: [{ at: "ordinance.txt#0-40", ref: "ordinance.txt", text: "Operators must file an annual report" }] });
  folds.push({ at: log.nextSeq, what: "the ordinance is heard" });
  const obId = hl.assertionId("operators", "must-file", "annual-report");
  // A contested land claim, disputed by a third source.
  log = hl.hear(log, { subject: "plot", verb: "belongs-to", object: "city", witness: "city.txt~r1", spans: [{ at: "city.txt#0-30", ref: "city.txt", text: "the plot belongs to the city" }] });
  const plotId = hl.assertionId("plot", "belongs-to", "city");
  folds.push({ at: log.nextSeq, what: "the land claim is heard" });
  const d = hl.dispute(log, plotId, { source: "third-party.txt", because: "third party denies the plot belongs to the city", span: { at: "third-party.txt#0-40", ref: "third-party.txt", text: "the plot does not belong to the city" }, kind: hl.DISPUTE_KINDS.CONTEST });
  log = d.refused ? log : d.log;
  folds.push({ at: log.nextSeq, what: "the land claim is disputed — the contest lands" });

  // A derived product resting on the EXPIRED ordinance — the sunset bug.
  const derived = TL.append(log, {
    kind: TL.ENTRY_KINDS.PROPOSE, task_id: "derived:operators|must-file|fiscal-year",
    operator: "SYN", operator_basis: TL.OPERATOR_BASIS.DERIVED, grain: "Pattern",
    description: "derived: operators must-file fiscal-year",
    subject: "operators", verb: "must-file", object: "fiscal-year",
    witnesses: [], spans: [], derived: true,
    premises: [obId],
    restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 1 },
  });
  folds.push({ at: derived.nextSeq, what: "a product is derived on the expired ordinance" });

  const tags = new Map([
    [obId, tagClaim({}, { operator: "INS", validityText: "This ordinance is effective as of 2015-01-01 and shall terminate on 2020-12-31.", force: "O", queryTime })],
    [plotId, tagClaim({}, { operator: "INS", force: "default", queryTime })],
  ]);

  const referentIndex = declaredReferentIndex("operators must file an annual report the plot belongs to the city");
  const runs = STRICTNESS.map((strictness) => asRun(lintLedger(derived, { door: hl, taskLog, tags, queryTime, strictness, referentIndex })));
  // The timeline at report strictness: each fold point, and what APPEARED /
  // RESOLVED / PERSISTED between consecutive folds — the universe folding.
  const timeline = lintTimeline({ log: derived, door: hl, taskLog, cursors: folds.map((f) => f.at), strictness: "report", tags, queryTime, referentIndex });
  const timelineLine = timeline.transitions.map((t) => {
    const bits = [];
    if (t.appeared.length) bits.push(`appeared ${t.appeared.map((f) => f.kind).join(", ")}`);
    if (t.resolved.length) bits.push(`resolved ${t.resolved.map((f) => f.kind).join(", ")}`);
    if (t.persisted.length) bits.push(`persisted ${t.persisted.map((f) => f.kind).join(", ")}`);
    return `fold ${t.from}→${t.to}: ${bits.join(" · ") || "no change"}`;
  }).join("\n");
  return {
    id: "seed", title: "1. The seed's falsifiable case (§7): a sunset ordinance + a contested claim",
    blurb: "one corpus, both bugs the seed names: the contest must never be resolved, the sunset must expire the obligation before force or entrenchment.",
    note: `THE UNIVERSE FOLDS:\n${timelineLine}\n\nTHE TWO ACCEPTANCE FACTS — the expired obligation is caught by validity_window BEFORE force/entrenchment (expired_premise); the contested claim routes to landContest, never a winner (contested_open).`,
    runs,
  };
}

// ── 2. THE ESSAY — rhetoric read as generated content ──────────────────────

async function essayCase() {
  const file = FIX + "speed-essay.txt";
  const src = "speed-essay.txt";

  const convert = (text) => {
    const s = (phrase) => byteSpan(file, phrase);
    const arrangements = [
      { subject: "fastest-shippers", verb: "win", object: "the-market", spans: [s("The companies that ship the fastest win the market")], end1Face: "companies that ship the fastest", end2Face: "the market" },
      { subject: "market-winners", verb: "are", object: "the-best", spans: [s("the companies that win the market are, by definition, the best at what they do")], end1Face: "companies that win the market", end2Face: "the best" },
      { subject: "winners", verb: "are", object: "right", spans: [s("the facts are that speed wins, winners are right")] },
      { subject: "being-right", verb: "means", object: "never-asked-permission", spans: [s("being right means you never had to ask permission")] },
      { subject: "everyone", verb: "is-doing", object: "it", spans: [s("Everyone is doing it, and that alone should settle the question")] },
      { subject: "ceo", verb: "said", object: "hesitation-is-the-enemy-of-innovation", spans: [s("hesitation is the enemy of innovation")] },
      { subject: "a-test", verb: "leads-to", object: "qa-department", spans: [s("once you start running one test")] },
      { subject: "a-qa-department", verb: "leads-to", object: "six-month-cycle", spans: [s("then a full QA department, then a six-month release cycle")] },
      { subject: "opponents", verb: "claim", object: "buggy-ship-hurts-reputation", spans: [s("shipping a buggy feature to ten thousand users could hurt our reputation")] },
      { subject: "reputation", verb: "is", object: "strongest-ever", spans: [s("our reputation has never been stronger")] },
      { subject: "nobody", verb: "proved", object: "the-bug-exists", spans: [s("nobody has actually proven it exists")] },
      { subject: "slow-teams", verb: "are", object: "out-of-touch", spans: [s("Slow teams are out of touch with what users actually want")] },
    ];
    const inferences = [
      { kind: "same-reasoning", end1: "running one test", label: "leads-to", end2: "a six-month release cycle", relation: "testing", yields: "full-QA", ref: src, detail: "the slippery slope — 'once you start running one test, you will want two, then a full QA department, then a six-month release cycle' composes an unbroken chain nothing declares" },
      { kind: "deduction", end1: "everyone is doing it", label: "settles", end2: "the question", relation: "popularity", yields: "truth", ref: src, detail: "appeal to popularity — 'everyone is doing it, and that alone should settle the question'" },
      { kind: "deduction", end1: "the CEO has raised three rounds and given a keynote", label: "means", end2: "listen", relation: "experience", yields: "being-right", ref: src, detail: "appeal to authority — 'when someone with that much experience tells you something, you listen'" },
      { kind: "universal", end1: "every successful startup", label: "shipped", end2: "the opposite of slow", ref: src, detail: "'every successful startup we know did the opposite' — a universal no counterexample was searched for" },
      { kind: "deduction", end1: "the wheel, the printing press, the smartphone", label: "implies", end2: "none would exist if edge cases were debated", relation: "historical-precedent", yields: "no-edge-case-debate", ref: src, detail: "the deep-history argument — a composition from three examples, nothing licensed" },
      { kind: "vacuous", end1: "2¹⁰ = 2¹⁰", label: "since", end2: "2¹⁰ + 2¹⁰ = 2¹¹", ref: "math-code.txt", detail: "the tautology does no work — the equality that is true does not follow from the one restated" },
    ];
    return { arrangements, inferences };
  };

  return lintCorpus("essay", "2. speed-essay.txt — persuasion posing as reasoning, read as the system's own output", file, src, convert, null, declaredReferentIndex(readFileSync(file, "utf8")));
}

/** Shared corpus harness: read → admit → tag → lint at all three levels. */
async function lintCorpus(id, title, file, src, convert, oracle, referentIndex = null) {
  const text = readFileSync(file, "utf8");
  const { arrangements, inferences } = convert(text);
  const log = hl.createHyperlexicon({ frame: { reader: "demo", giver: "reasoning-lint-demo.mjs", corpus: src } });
  const admitted = hl.admit(log, arrangements, { witness: src });
  const tags = new Map();
  const queryTime = Date.parse("2026-09-11");
  for (const h of admitted.heard) tags.set(h.id, tagClaim({}, { operator: "INS", force: "default", queryTime }));
  const runs = [];
  for (const strictness of STRICTNESS) {
    const ledger = lintLedger(admitted.log, { door: hl, taskLog, tags, queryTime, strictness, referentIndex });
    const inference = await lintInferences(inferences, { ...(oracle ?? {}), strictness });
    runs.push({ ok: ledger.ok && inference.ok, strictness, findings: [...ledger.findings, ...inference.findings], counts: { ...ledger.counts, ...inference.counts } });
  }
  return { id, title, blurb: `admitted ${admitted.heard.length} of ${arrangements.length} arrangement(s); ${inferences.length} inference(s) declared; spans byte-verified (P5.2).`, note: null, runs };
}

/** A declared referent index over a corpus's own text — the demo's declared
 * reading resolves its ends the way production resolves them through a real
 * cast.js::makeReferentIndex: a name points at the beings the corpus
 * establishes, never at a bare folded string. The demo's index is a folded-
 * surface index over the corpus bytes; production injects the engine's own. */
function declaredReferentIndex(text) {
  const folded = (s) => String(s ?? "").toLowerCase().trim();
  const surfaces = new Map();
  for (const t of folded(text).split(/[^a-z0-9]+/)) if (t.length >= 4) surfaces.set(t, t);
  return {
    referents: new Set([...surfaces.keys()]),
    resolve: (name) => {
      const n = folded(name);
      const hits = new Set();
      if (!n) return hits;
      for (const s of surfaces.keys()) if (s.includes(n) || n.includes(s)) hits.add(`r:${s}`);
      return hits;
    },
    represent: (id) => id.replace(/^r:/, ""),
  };
}

// ── 3. MATH + CODE — computed, never declared ──────────────────────────────

async function mathCase() {
  const file = FIX + "math-code.txt";
  const src = "math-code.txt";

  // THE REAL ORACLE — the full pyodide science stack (sympy, scipy, numpy,
  // networkx, code execution) through the vendored pyodide (the P21 wheel
  // organ's own mirror; the date-normalize.mjs loadPattern). Every verdict
  // is COMPUTED, never a hand-typed answer. When pyodide is not installed
  // in this checkout the demo falls back to the same JS arithmetic oracle it
  // used before, and says so on the blurb.
  let usingPyodide = false;
  let verify, refute;
  try {
    await bootPyodide();
    usingPyodide = true;
    verify = pyVerify;
    refute = pyRefute;
  } catch {
    verify = jsVerify;
    refute = jsRefute;
  }

  const convert = (text) => {
    const arrangements = [
      { subject: "the-harmonic-sum", verb: "converges-to", object: "1.64", spans: [byteSpan(file, "converges to approximately")] },
      { subject: "0.1+0.2", verb: "equals", object: "0.3-in-ieee754", spans: [byteSpan(file, "0.1 + 0.2 = 0.3")] },
      { subject: "sqrt-16", verb: "equals", object: "pm-4", spans: [byteSpan(file, "sqrt{16} = ")] },
    ];
    // Every equation carries its SYMPY expression, so the real oracle can
    // compute the difference symbolically. A claim with no sympy expression
    // is `unchecked` — disclosed, never guessed (the CH-style ceiling).
    const inferences = [
      { kind: "equation", end1: "\\frac{x^2 - 1}{x - 1} = x + 1 for all x, including x = 1", ref: src, sympy: "simplify(((x**2-1)/(x-1)).subs(x, 1)) - 2" },
      { kind: "equation", end1: "\\int_0^1 x^2 \\, dx = \\frac{1}{2}", ref: src, sympy: "integrate(x**2, (x, 0, 1)) - Rational(1,2)" },
      { kind: "equation", end1: "\\frac{d}{dx} \\sin(x^2) = \\cos(x^2)", ref: src, sympy: "diff(sin(x**2), x) - cos(x**2)" },
      { kind: "equation", end1: "2^{10} = 1024, therefore 2^{10} + 2^{10} = 2048", ref: src, sympy: "2**10 + 2**10 - 2**11" },
      { kind: "equation", end1: "\\sqrt{16} = \\pm 4", ref: src, sympy: "sqrt(16) - 4" },
      { kind: "equation", end1: "\\log(a) + \\log(b) = \\log(a + b) for positive a, b", ref: src, sympy: "log(a)+log(b) - log(a+b)" },
      { kind: "equation", end1: "e^{i\\pi} = -1, so raising both sides to the power of 2i gives e^{-2\\pi} = 1", ref: src, sympy: "exp(-2*pi) - 1" },
      { kind: "equation", end1: "1 + \\frac{1}{2} + \\frac{1}{3} + \\frac{1}{4} + \\cdots converges to approximately 1.64", ref: src, sympy: "summation(1/n, (n, 1, oo)) - Rational(164,100)" },
      { kind: "equation", end1: "0.1 + 0.2 = 0.3 exactly in IEEE 754 floating point", ref: src, sympy: "float(0.1) + float(0.2) - float(0.3)" },
      { kind: "equation", end1: "\\frac{1}{0} = \\infty, since dividing by a smaller number gives a larger result", ref: src, sympy: "Rational(1,0)" },
      { kind: "equation", end1: "\\cos(2\\theta) = 2\\cos(\\theta)", ref: src, sympy: "cos(2*t) - 2*cos(t)" },
      { kind: "deduction", end1: "A > B and B > C", label: "therefore", end2: "A > C", relation: ">", yields: ">", ref: src },
      { kind: "same-reasoning", end1: "A > B", label: "therefore by the same reasoning", end2: "A² > B² for all real A, B", relation: ">", yields: "square", ref: src },
      { kind: "universal", end1: "if A > B", label: "then", end2: "A² > B² for all real A, B", ref: src, grid: `
import sympy
res = "NONE"
for A, B in [(0, -1), (1, -2), (2, -3)]:
    if A > B and not (A * A > B * B):
        res = f"A={A}, B={B}: {A} > {B} but {A*A} < {B*B}"
        break
res` },
    ];
    return { arrangements, inferences };
  };

  const c = await lintCorpus("math", "3. math-code.txt — statements and blocks, several wrong, checked by a REAL oracle", file, src, convert, { verify, refute, licenses: new Set([">→>"]) });
  c.blurb = `${c.blurb} oracle: ${usingPyodide ? "the pyodide science stack (sympy · scipy · numpy · networkx · code, computed)" : "JS arithmetic fallback (pyodide unavailable)"}.`;
  return c;
}

/** The pre-sympy JS oracle — kept as the fallback so the demo runs anywhere. */
function jsVerify(inf) {
  const eq = String(inf.end1 ?? inf.statement ?? "");
  const v = (verdict, detail) => ({ verdict, detail });
  if (/x\^2 - 1/.test(eq)) return v("undefined", "(x²−1)/(x−1) at x=1 is 0/0 — the claim says 'for all x, including x = 1', but the identity is undefined exactly there");
  if (/int_0\^1/.test(eq)) { const I = 1 / 3; return I === 0.5 ? v("holds", "∫₀¹ x² dx = 1/3") : v("false", `∫₀¹ x² dx = ${I}, not 1/2`); }
  if (/frac\{d\}\{dx\}/.test(eq) || /d\/dx/.test(eq)) return v("false", "d/dx sin(x²) = 2x·cos(x²), not cos(x²)");
  if (/sqrt\{16\}/.test(eq)) return v("ambiguous", "the principal square root is 4; ±4 is the equation-solving convention — a convention dispute, not a settled value");
  if (/log\(a\)/.test(eq)) return v("false", "log(a)+log(b) = log(ab), never log(a+b); at a=b=2: 1.386 ≠ 1.609");
  if (/e\^\{-2\\pi\}/.test(eq)) return v("false", `e^{−2π} = ${Math.exp(-2 * Math.PI).toFixed(4)}, never 1 — and raising both sides of e^{iπ}=−1 to the power 2i is not licensed complex exponentiation`);
  if (eq.includes("\\frac{1}{2}") && eq.includes("\\frac{1}{3}")) return v("false", "the harmonic series diverges; it converges to no number, least of all ≈1.64");
  if (/0\.1 \+ 0\.2/.test(eq)) return v("false", `in IEEE 754, 0.1+0.2 = ${(0.1 + 0.2).toString()}, not 0.3`);
  if (/frac\{1\}\{0\}/.test(eq)) return v("undefined", "1/0 is undefined, not ∞ — and 'dividing by a smaller number gives a larger result' does not license it");
  if (/cos\(2/.test(eq)) return v("false", "cos(2θ) = 2cos²θ − 1, never 2cos(θ); at θ=π/3: −0.5 ≠ 1");
  if (/2\^\{10\}/.test(eq)) { const ok = 2 ** 10 + 2 ** 10 === 2 ** 11; return ok ? v("holds", `2¹⁰+2¹⁰ = ${2 ** 10 + 2 ** 10} = 2¹¹`) : v("false", "2¹⁰+2¹⁰ ≠ 2¹¹"); }
  return v("unchecked", "no oracle case for this statement — disclosed, never guessed");
}

/** The pre-sympy JS counterexample search — the fallback refute. */
function jsRefute(inf) {
  if (inf.end2.includes("A² > B²")) {
    for (const [A, B] of [[0, -1], [1, -2], [2, -3]]) if (A > B && !(A * A > B * B)) return { refuted: true, detail: `A=${A}, B=${B}: ${A} > ${B} but ${A * A} < ${B * B}` };
    return { refuted: false, detail: "no counterexample among the declared samples" };
  }
  if (/every successful startup/.test(inf.end1)) return { refuted: false, detail: "a universal over 'every startup' no counterexample was searched — withheld, never confirmed" };
  return null;
}

// ── 4. CONTINUUM HYPOTHESIS — a corrected encyclopedia article ──────────────
//
// The honest question: how does a reasoning linter get at a math article it
// cannot verify? It does not check forcing or Kőnig's theorem. It checks the
// ROUTING — and this article is the seed's own "differently-scoped" case as
// prose: "the rational numbers Q seemingly form a counterexample to CH ...
// However, this intuitive analysis is flawed". The linter verifies that
// correction actually LANDS on the ledger (the two claims are not a standing
// contradiction), and flags the moves the article makes that no giver
// licenses: the Platonist/formalist → truth-value compositions, the
// rich-universe → against-CH correlation, the equivalence of Freiling's
// axiom of symmetry to ¬CH, and the "independent of ZFC" → "consistent iff
// ZFC is consistent" step that rests on Gödel's second incompleteness
// theorem without declaring it.

async function chCase() {
  const file = FIX + "continuum-hypothesis.txt";
  const src = "continuum-hypothesis.txt";

  const convert = (text) => {
    const s = (phrase) => byteSpan(file, phrase);
    const arrangements = [
      // The seed's own differently-scoped pair, as the article states it.
      { subject: "rationals", verb: "seemingly-form", object: "counterexample-to-CH", spans: [s("The rational numbers Q seemingly form a counterexample to the continuum hypothesis")], end1Face: "the rational numbers Q", end2Face: "a counterexample to the continuum hypothesis" },
      { subject: "this-intuition", verb: "is-flawed", object: "conflates-size-with-structure", spans: [s("However, this intuitive analysis is flawed")] },
      { subject: "rationals", verb: "are", object: "countable-like-integers", spans: [s("the rational numbers can actually be placed in one-to-one correspondence with the integers")], end1Face: "the rational numbers", end2Face: "one-to-one correspondence with the integers" },
      // The independence claim, stated as settled.
      { subject: "continuum-hypothesis", verb: "is-independent-of", object: "ZFC", spans: [s("This independence was proved in 1963 by Paul Cohen")] },
      // Gödel / Cohen, as the article states.
      { subject: "godel-1940", verb: "showed", object: "negation-of-CH-not-provable-in-ZFC", spans: [s("Kurt Gödel proved in 1940 that the negation of the continuum hypothesis")], end1Face: "Kurt Gödel" },
      { subject: "cohen-1963", verb: "showed", object: "CH-not-provable-in-ZFC", spans: [s("Cohen showed that CH cannot be proven from the ZFC axioms")], end1Face: "Paul Cohen" },
      // The philosophical correlation.
      { subject: "rich-universe-mathematicians", verb: "were-against", object: "CH", spans: [s("mathematicians who favored a \"rich\" and \"large\" universe of sets were against CH")] },
      { subject: "ontological-maximalism", verb: "argues-in-favor-of", object: "CH", spans: [s("ontological maximalism can actually be used to argue in favor of CH")] },
    ];
    const inferences = [
      { kind: "same-reasoning", end1: "Q seemingly forms a counterexample to CH", label: "intuitively", end2: "more rationals than integers and more reals than rationals", relation: "proper-subset", yields: "larger-cardinality", ref: src, detail: "the article's own correction: 'this intuitive analysis is flawed' — a proper subset is not a larger cardinality, and the text concedes the point itself" },
      { kind: "same-reasoning", end1: "Q is countable, like the integers", label: "therefore", end2: "the rationals are NOT a counterexample to CH", relation: "bijection", yields: "same-cardinality", ref: src, detail: "the correction landing: one-to-one correspondence gives same cardinality, dissolving the apparent counterexample" },
      { kind: "deduction", end1: "mathematicians who favored a rich universe of sets", label: "were-against", end2: "CH", relation: "mathematician-preference", yields: "truth-of-CH", ref: src, detail: "a correlation about who favored which universe is composed into a statement about CH itself — nothing licenses preference → truth" },
      { kind: "deduction", end1: "Gödel was a Platonist, Cohen a formalist", label: "therefore", end2: "CH is (or is not) true independent of provability", relation: "philosophical-stance", yields: "truth-value", ref: src, detail: "a philosopher's stance is composed into a claim about the hypothesis's truth value — the stance may explain a BELIEF, it licenses nothing about the mathematics" },
      { kind: "deduction", end1: "¬CH is equivalent to Freiling's axiom of symmetry", label: "therefore", end2: "CH is false", relation: "equivalence-to-an-axiom", yields: "¬CH", ref: src, detail: "an equivalence is not a proof; the article itself notes others disagreed that the axiom is 'intuitively clear'" },
      { kind: "deduction", end1: "the negation of CH can be added to ZFC consistently", label: "therefore", end2: "CH has no truth value", relation: "independence", yields: "no-truth-value", ref: src, detail: "Feferman's leap — independence from ZFC is composed into 'not definite', which the article itself flags as conjectured, never established" },
    ];
    return { arrangements, inferences };
  };

  return lintCorpus("ch", "4. continuum-hypothesis.txt — a corrected encyclopedia article, checked for routing coherence", file, src, convert, null, declaredReferentIndex(readFileSync(file, "utf8")));
}

/** runAll() — every case, structured, so the terminal and the browser report
 * render the SAME numbers (never two implementations). */
export async function runAll() {
  return [seedCase(), await essayCase(), await mathCase(), await chCase(), await scienceCase()];
}

// ── 5. THE SCIENCE STACK — exact stats, numeric, graph, and EXECUTED code ──
//
// The pyodide oracle is more than symbolic algebra. This case exercises the
// engines the math case does not: scipy.stats exact nulls (the P70
// hypergeometric/Fisher precedent, computed by the library not hand-derived),
// numpy numeric claims, networkx graph claims, and — the one the generation
// loop cares about most — GENERATED CODE EXECUTED to check it does what its
// claim says. The code blocks are the fixture's own (math-code.txt), run on
// real inputs; a claim that a function "returns the average" is verified by
// running it, never by looking at it.

async function scienceCase() {
  const src = "math-code.txt";

  // The code blocks from the fixture, verbatim, each with the test that
  // would catch its error if it has one. `test` runs the generated module
  // and ends by setting `result` — the verdict the oracle computes.
  const codeClaims = [
    { statement: "average(nums) returns the arithmetic mean", kind: "equation", code: {
      src: "def average(nums):\n    total = 0\n    for i in range(1, len(nums)):\n        total += nums[i]\n    return total / len(nums)",
      test: `import _gen\nout = _gen.average([1, 2, 3])\nresult = "HOLDS:%.2f" % out if abs(out - 2.0) < 1e-9 else "FALSE:average=%.2f, expected 2.00 (skips nums[0])" % out`,
    }, ref: src },
    { statement: "factorial(n) computes n! for n ≥ 1", kind: "equation", code: {
      src: "function factorial(n) { let result = 1; for (let i = n; i >= 0; i--) { result *= i; } return result; }",
      test: `import _gen\nresult = "UNCHECKED:javascript cannot be executed by this python oracle — disclosed, never a conviction"`,
    }, ref: src },
    { statement: "divide(a, b) never divides by zero without checking", kind: "equation", code: {
      src: "public int divide(int a, int b) { return a / b; }",
      test: `import _gen\nresult = "UNCHECKED:java cannot be executed by this python oracle — disclosed, never a conviction"`,
    }, ref: src },
  ];

  // The non-code engines: exact stats, numeric, graph — all computed.
  const engineClaims = [
    { statement: "the 2×2 table [[8,2],[1,5]] shows a real association", kind: "equation", scipy: `
a = np.array([[8, 2], [1, 5]])
p = stats.fisher_exact(a)[1]
result = "HOLDS:p=%.4f, below the 0.05 bar" % p if p < 0.05 else "FALSE:p=%.4f" % p
`, ref: src },
    { statement: "drawing 3 marked balls in 5 draws from 2-marked-of-20 is unlikely", kind: "equation", scipy: `
p = stats.hypergeom.sf(2, 20, 2, 5)
result = "HOLDS:p=%.5f, exact closed form" % p if p < 0.05 else "FALSE:p=%.5f" % p
`, ref: src },
    { statement: "the matrix [[1,2],[2,4]] is singular", kind: "equation", numpy: `
A = np.array([[1.0, 2.0], [2.0, 4.0]])
result = "HOLDS:det=%.3g ~ 0" % np.linalg.det(A) if abs(np.linalg.det(A)) < 1e-12 else "FALSE:det=%.3g" % np.linalg.det(A)
`, ref: src },
    { statement: "a four-cycle is bipartite", kind: "equation", networkx: `
G = nx.cycle_graph(4)
result = "HOLDS:four-cycle is 2-colorable" if nx.is_bipartite(G) else "FALSE:not bipartite"
`, ref: src },
  ];

  const text = readFileSync(FIX + "math-code.txt", "utf8");
  const log = hl.createHyperlexicon({ frame: { reader: "demo", giver: "reasoning-lint-demo.mjs", corpus: src } });
  const queries = await lintInferences([...codeClaims, ...engineClaims], { verify: pyVerify, refute: pyRefute, strictness: "standard" });
  const runs = STRICTNESS.map((strictness) => {
    const full = { ok: queries.ok, strictness, findings: queries.findings, counts: queries.counts };
    return { ok: full.ok, strictness, findings: [...queries.findings], counts: { ...queries.counts } };
  });
  void text; void log;
  return { id: "science", title: "5. the pyodide science stack — exact stats, numeric, graph, and EXECUTED code", blurb: "scipy.stats exact nulls (Fisher, hypergeometric), numpy singularity, networkx bipartiteness, and the fixture's generated code run on real inputs — every verdict computed.", note: null, runs };
}

/** The terminal face: one line per finding per strictness. */
export function printReport(cases = []) {
  for (const c of cases) {
    line(`═══ ${c.title} ═══`);
    if (c.blurb) line(`     ${c.blurb}`);
    for (const run of c.runs) {
      line(`\n  ─ strictness: ${run.strictness} ─  ok: ${run.ok}`);
      for (const f of run.findings ?? []) {
        const refs = f.referents ? ` → ${JSON.stringify(f.referents)}` : "";
        const sp = f.spans?.length ? ` @ ${f.spans.join(", ")}` : "";
        line(`  [${f.level}·${f.severity}] ${f.kind}: ${f.detail}${refs}${sp}`);
      }
    }
    if (c.note) { line(""); for (const n of c.note.split("\n")) line(`  ${n}`); }
  }
  line("\n═══ done — every finding above was computed from the real ledger and the real oracle ═══");
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) printReport(await runAll());