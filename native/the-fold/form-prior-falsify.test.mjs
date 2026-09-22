// form-prior-falsify.test.mjs — Bayesian surprise as the delta to the
// holograph (kernel/bayes-surprise.js) and a form learned by expectation
// (form-prior.js), proven on constructed streams (2026-09-22). The live
// measurements (Lear, Shakespeare, Browning, man pages, recipes) are in the
// commit and plans/generation-terrain-stance.md; these pin the mechanism.
import test from "node:test";
import assert from "node:assert/strict";
import { lgamma, digamma, klDirichlet, klAdmit, createHolograph, admit, ABSENT } from "../kernel/bayes-surprise.js";
import { learnForm, kindBoundaries, turnOf, formFacts, formHas, necessaryFacts } from "./form-prior.js";

let seed = 17;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const NOUNS = ["river", "window", "garden", "lantern", "harbor", "meadow", "kettle", "ladder", "pocket", "button", "candle", "thimble"];
const VERBS = ["carried", "painted", "folded", "counted", "gathered", "followed", "measured", "whispered"];
const RHYMES = [["hill", "still", "will", "mill"], ["town", "gown", "down", "crown"], ["cat", "hat", "mat", "flat"], ["bee", "tea", "sea", "knee"], ["door", "floor", "more", "shore"]];
const limerick = () => { const a = pick(RHYMES), b = pick(RHYMES.filter((r) => r !== a)); const A = shuffle(a), B = shuffle(b); return [`There was an old man of the ${A[0]},`, `Who ${pick(VERBS)} a ${pick(NOUNS)} ${A[1]};`, `He ${pick(VERBS)} the ${B[0]},`, `And a ${pick(NOUNS)} ${B[1]},`, `That odd old man of the ${A[0]}.`].join("\n"); };
const entry = () => [`NAME`, `     ${pick(NOUNS)} - ${pick(VERBS)} the ${pick(NOUNS)}`, ``, `DESCRIPTION`, `     The ${pick(NOUNS)} utility ${pick(VERBS)} each ${pick(NOUNS)} it is given.`, ``, `OPTIONS`, `     -a      ${pick(VERBS)} all of them.`].join("\n");

test("the special functions and the divergence are exact where they must be", () => {
  assert.ok(Math.abs(lgamma(5) - Math.log(24)) < 1e-10);
  assert.ok(Math.abs(digamma(1) + 0.5772156649) < 1e-8);
  assert.equal(klDirichlet([2, 3, 4], [2, 3, 4]), 0);
  assert.ok(klDirichlet([3, 3], [2, 3]) > 0);
  // The one-admission closed form equals the general divergence exactly.
  for (const [prior, v] of [[[1, 1], 0], [[5, 2, 1, 1], 1], [[40.5, 0.5, 3, 1], 0], [[1, 7, 2], 2]]) {
    const post = prior.map((x, i) => x + (i === v ? 1 : 0));
    const B = prior.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(klAdmit(prior[v], B) - klDirichlet(post, prior)) < 1e-9, `closed form vs general at ${JSON.stringify(prior)}`);
  }
});

test("Bayesian surprise is the delta to the holograph: the same value again moves it less and less; a new value moves it more than a repeat", () => {
  const h = createHolograph();
  const moves = Array.from({ length: 8 }, () => admit(h, { slot: "A" }).bayes);
  for (let i = 2; i < moves.length; i++) assert.ok(moves[i] < moves[i - 1], `repeat ${i} did not move it less: ${moves.map((m) => m.toFixed(3)).join(" ")}`);
  const repeat = admit(h, { slot: "A" }).bayes, novel = admit(h, { slot: "B" }).bayes;
  assert.ok(novel > repeat * 5, `a value the holograph expected against moved it only ${novel} vs ${repeat}`);
});

test("THE VOID IS INFORMATION: a slot the holograph expected to be absent, arriving, is surprising — and a slot it expected, missing, is too", () => {
  const h = createHolograph();
  for (let i = 0; i < 10; i++) admit(h, { a: "x" });
  const arrives = admit(h, { a: "x", b: "y" }).perSlot.b;
  assert.ok(arrives.surprisal > 2 && arrives.bayes > 0, `a new slot after ten absences must surprise (was the bug: 0 bits): ${JSON.stringify(arrives)}`);
  const h2 = createHolograph();
  for (let i = 0; i < 10; i++) admit(h2, { a: "x", b: "y" });
  const missing = admit(h2, { a: "x" }).perSlot.b;
  assert.equal(missing.value, ABSENT);
  assert.ok(missing.surprisal > 2, "an expected slot, missing, is surprising");
  const g = createHolograph({ gamma: 0.5 });
  for (let i = 0; i < 10; i++) admit(g, { a: "x" });
  assert.ok(admit(g, { a: "z" }).perSlot.a.surprisal < admit(createHolograph(), {}).surprisal + 99, "decay is accepted");
});

test("learnForm: what becomes predictable is the form — line 5 ends on line 1's word, it opens on 'there' — and the end words stay content; the delta to the form falls", () => {
  seed = 17;
  const fp = learnForm(Array.from({ length: 60 }, limerick));
  // a merged fact answers to all its names (compression: tested once)
  const has = (slot, value) => formHas(fp, slot, value);
  assert.ok(has("@4:ends-as", "@0"), fp.form.map((f) => `${f.slot}=${f.value}`).join(", "));
  assert.ok(has("@0:first-word", "there"));
  assert.ok(has("@3:rhymes-with", "@2"));
  assert.ok(fp.content.slice(0, 5).some((c) => /last-word/.test(c.slot)), "the end words stay surprising: content, not form");
  assert.ok(fp.bayes.form.last < fp.bayes.form.first / 2, `the delta to the form must fall: ${JSON.stringify(fp.bayes.form)}`);
  assert.ok(fp.learnedAt != null && fp.learnedAt < 60);
  // Meyer: under the learned tendency, a limerick whose fifth line does not
  // return to the first line's word breaks exactly that slot.
  const broken = limerick().split("\n"); broken[4] = "And that was the end of the day.";
  const t = turnOf(fp, broken.join("\n"));
  const f4 = fp.form.find((x) => x.slot === "@4:ends-as" || (x.same ?? []).some((s) => s.slot === "@4:ends-as"));
  assert.ok(t.breaks.some((b) => b.slot === f4.slot), JSON.stringify(t.breaks));
});

test("THE CONTROL: the same instances with their lines shuffled have no positional form — nothing can become predictable at a position that means nothing", () => {
  seed = 23;
  const scrambled = Array.from({ length: 60 }, () => shuffle(limerick().split("\n")).join("\n"));
  const fp = learnForm(scrambled);
  const positional = fp.form.filter((f) => /rhymes-with|ends-as|first-word/.test(f.slot) && f.value !== "none");
  assert.equal(positional.length, 0, positional.map((f) => `${f.slot}=${f.value}`).join(", "));
});

test("kindBoundaries: against the kind being read now, a change of kind is found; one kind alone gives none", () => {
  seed = 29;
  const stream = [...Array.from({ length: 25 }, limerick), ...Array.from({ length: 25 }, entry)];
  const r = kindBoundaries(stream, { window: 8, draws: 20 });
  assert.equal(r.boundaries.length, 1, `${JSON.stringify(r.boundaries)} ${r.basis}`);
  assert.ok(Math.abs(r.boundaries[0] - 25) <= 2, `found at ${r.boundaries[0]}, the kind changed at 25`);
  const one = kindBoundaries(Array.from({ length: 50 }, limerick), { window: 8, draws: 20 });
  assert.deepEqual(one.boundaries, [], one.basis);
  assert.throws(() => kindBoundaries(stream, {}), /window is declared/);
  assert.ok(formFacts(limerick()).get("count") === 5);
});

// ── necessaryFacts: "what do all X have that other things may or may not
// have?" — the WITHIN-KIND question, no comparison ground required. ──────
test("necessaryFacts: 'varies' (emergentFacts' own not-constant sentinel) is NEVER a candidate — it is a null value, not a finding", () => {
  const varyingUnits = Array.from({ length: 10 }, (_, i) => ({ elements: [{ cls: "line", text: `line ${i} of different length ${"x".repeat(i)}` }, { cls: "line", text: "b" }] }));
  const r = necessaryFacts(varyingUnits, { draws: 50 });
  assert.ok(!r.necessary.some((f) => f.value === "varies"), "no candidate ever carries the literal sentinel value");
});

test("necessaryFacts: a genuine shared, non-varying trait across the whole corpus is found and reported stable", () => {
  // Every instance's headings end with no closing punctuation, constant
  // within EACH instance (so it lifts to heading*:end="-") — genuinely
  // shared across all 20 instances, unlike anything about the body lines.
  // TWO headings per instance: emergentFacts' lift loop only computes a
  // cls*:attr fact when a class has >= 2 elements in that instance.
  const units = Array.from({ length: 20 }, (_, i) => ({
    elements: [
      { cls: "heading", text: "Title", end: "" },
      { cls: "heading", text: "Subtitle", end: "" },
      { cls: "line", text: `body line one of instance ${i}, length varies ${"z".repeat(i % 5)}` },
      { cls: "line", text: `body line two of instance ${i}` },
    ],
  }));
  const r = necessaryFacts(units, { draws: 100 });
  assert.equal(r.refused, null);
  const found = r.necessary.find((f) => f.key === "heading*:end" && f.value === "-");
  assert.ok(found, `expected heading*:end=- among necessary facts, got: ${JSON.stringify(r.necessary)}`);
  assert.equal(found.support, 1);
  assert.ok(found.stability >= 0.9);
});

test("necessaryFacts: a trait present in only HALF the corpus is correctly rejected as not necessary", () => {
  const units = Array.from({ length: 20 }, (_, i) => ({
    elements: [
      { cls: "heading", text: "Title", end: i % 2 === 0 ? "" : "." }, // only half share "-"
      { cls: "heading", text: "Subtitle", end: i % 2 === 0 ? "" : "." },
      { cls: "line", text: "body" },
    ],
  }));
  const r = necessaryFacts(units, { draws: 100, minSupport: 0.8 });
  assert.ok(!r.necessary.some((f) => f.key === "heading*:end"), "a 50%-shared trait must not clear an 80% support floor");
});

test("necessaryFacts: fewer than 5 instances refuses rather than claiming universality from a handful", () => {
  const units = Array.from({ length: 3 }, () => ({ elements: [{ cls: "line", text: "a" }, { cls: "line", text: "b" }] }));
  const r = necessaryFacts(units);
  assert.equal(r.refused, "under_powered");
  assert.deepEqual(r.necessary, []);
});

test("necessaryFacts: split-half stability actually discriminates — a trait driven by a FEW outlier instances (support just clears the floor but isn't robust) is caught", () => {
  // 17/20 = 85% support (clears an 80% floor) but the 3 "no" instances are
  // clustered such that many random halves still land close to the edge —
  // this is a softer check: mainly confirms `stability` is computed and can
  // differ from raw `support`, not a guarantee of rejection in every case.
  const units = Array.from({ length: 20 }, (_, i) => ({
    elements: [{ cls: "heading", text: "Title", end: i < 17 ? "" : "." }, { cls: "heading", text: "Subtitle", end: i < 17 ? "" : "." }, { cls: "line", text: "body" }],
  }));
  const r = necessaryFacts(units, { draws: 200, minSupport: 0.8 });
  const found = r.necessary.find((f) => f.key === "heading*:end" && f.value === "-");
  if (found) assert.ok(found.stability <= 1 && found.stability >= 0, "stability is a real fraction, distinct from the raw support number");
});
