// form-prior.js — A FORM LEARNED AS A PERSON LEARNS ONE: BY EXPECTATION,
// ONE INSTANCE AT A TIME, UNTIL ONE MORE STOPS MOVING THE HOLOGRAPH
// (2026-09-22).
//
// The user: "we've lost the idea of using bayesian surprise and activation
// … that's the key" — and "we need the bayesian surprise as the delta to the
// holograph." paradigm.js learns a form by CONTRAST (what separates the
// instances from everything else). A reader learns it by EXPECTATION: fifty
// limericks in, line 5's end word costs nothing, and a 13-line sonnet feels
// wrong before anyone counts. This module is that reader:
//
//   the prior      kernel/bayes-surprise.js — the holograph's Pattern grain,
//                  one slot per position fact (Vasana: impressions that
//                  condition later perception; Tala: the WHEN, the position)
//   the stream     instances admitted one at a time; each admission's
//                  SURPRISAL (how unexpected, Rubin) and BAYESIAN SURPRISE
//                  (how far it moved the prior, Itti & Baldi) recorded
//   the form       the slots that BECAME PREDICTABLE — more likely than not
//                  under the learned prior, and more predictable than the
//                  same instances with their element order destroyed (the
//                  null surprise-segments.js already uses: order destroyed)
//   learned at     the shallowest number of instances whose form is the form
//                  of all of them (kernel/activation.js dmdWindow's rule —
//                  the difference that makes a difference, applied to the
//                  definition): one more instance stopped changing it
//   the content    the slots that stay surprising — what the form leaves
//                  free for each instance to fill
//   the turn       Meyer: a slot the form predicts, where an instance still
//                  deviates — residual surprisal under the learned tendency
//
// Form versus content is never declared. No slot is written as "form" or
// "content"; what becomes predictable is the form, whatever it is.
//
// Slots (closed, per element position — the ruler, not the shape): its class,
// its marker kind, its syllable count, its closing punctuation, the earliest
// earlier position it rhymes with, the earliest earlier position whose end
// word it repeats, its first word, its last word; and per unit, its count.

import { elementsOf } from "./medium.js";
import { rhymes } from "./sound.js";
import { createHolograph, admit, modeOf, predict } from "../kernel/bayes-surprise.js";

export const FORM_PRIOR_SCHEMA = "EOFormPrior@1";

const asElements = (u) => (Array.isArray(u?.elements) ? u.elements : elementsOf(typeof u === "string" ? u : u?.text ?? "").elements);

/** The slot facts of one instance. */
export function formFacts(u) {
  const E = asElements(u);
  const f = new Map([["count", E.length]]);
  E.forEach((e, i) => {
    const earlier = (rel) => { for (let j = 0; j < i; j++) if (rel(E[j], e)) return `@${j}`; return "none"; };
    f.set(`@${i}:class`, e.cls);
    f.set(`@${i}:marker`, e.markerKind ?? "-");
    f.set(`@${i}:syllables`, e.syllables);
    f.set(`@${i}:closes`, e.end || "none");
    f.set(`@${i}:rhymes-with`, earlier((a, b) => rhymes(a.last, b.last)));
    f.set(`@${i}:ends-as`, earlier((a, b) => !!a.last && a.last === b.last));
    f.set(`@${i}:first-word`, e.first || "-");
    f.set(`@${i}:last-word`, e.last || "-");
  });
  // ROLE, NOT POSITION, for forms whose length varies (a man page, a recipe):
  // what the unit HAS, set only when present — everything it lacks is the
  // holograph's ABSENT, the void as information (the user: "a void is one of
  // the most useful pieces of information, the most maybe") — and its k-th
  // heading's words, aligned by ordinal rather than by line number.
  for (const e of E) { f.set(`has:${e.cls}`, "yes"); if (e.markerKind) f.set(`has-marker:${e.markerKind}`, "yes"); if (e.cls === "heading" && e.caps) f.set("has:capitals-heading", "yes"); }
  E.filter((e) => e.cls === "heading").forEach((e, k) => f.set(`heading#${k + 1}`, e.text.toLowerCase().replace(/[^a-z ]/g, "").trim() || "-"));
  return f;
}
/** Slots the order-destroyed null cannot touch: what a unit has, and its count. */
const ORDER_FREE = (slot) => slot === "count" || slot.startsWith("has");

let _seed = 1;
const rnd = () => { _seed = (_seed * 1103515245 + 12345) % 2147483648; return _seed / 2147483648; };
const shuffled = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** Run a stream through a fresh holograph: the per-instance trajectory. */
export function readStream(units, { alpha = 1, gamma = 1 } = {}) {
  const holo = createHolograph({ alpha, gamma });
  const trajectory = units.map((u) => { const r = admit(holo, formFacts(u)); return { surprisal: r.surprisal, bayes: r.bayes, perSlot: r.perSlot }; });
  return { holo, trajectory };
}

/** The slots more likely than not under a holograph (the high bar). */
const likely = (holo) => [...holo.slots.keys()].map((s) => ({ slot: s, ...modeOf(holo, s) })).filter((x) => x.p > 0.5);

/**
 * learnForm(units, { alpha, draws, seed }) → EOFormPrior@1
 * The form: slots whose mode is more likely than not AND whose mode's
 * probability beats every one of `draws` order-destroyed streams (the same
 * instances, each with its elements shuffled). `draws` defaults to the number
 * of slots tested, so the level is at most one false slot expected across
 * them all.
 */
export function learnForm(units, { alpha = 1, draws = null, seed = 7 } = {}) {
  if (units.length < 5) return { schema: FORM_PRIOR_SCHEMA, refused: "under_powered", instances: units.length, form: [], basis: `${units.length} instance(s): below five nothing can become predictable` };
  const { holo, trajectory } = readStream(units, { alpha });
  const cands = likely(holo).filter((c) => !ORDER_FREE(c.slot));
  const orderFree = likely(holo).filter((c) => ORDER_FREE(c.slot));
  const D = draws ?? Math.max(20, cands.length);
  _seed = seed;
  const nullBest = new Map(cands.map((c) => [c.slot, []]));
  for (let d = 0; d < D; d++) {
    const nh = readStream(units.map((u) => ({ elements: shuffled(asElements(u)).map((e, i) => ({ ...e, i })) })), { alpha }).holo;
    for (const c of cands) nullBest.get(c.slot).push(modeOf(nh, c.slot)?.p ?? 0);
  }
  const form = cands.map((c) => {
    const nulls = nullBest.get(c.slot);
    const beaten = nulls.filter((p) => p >= c.p).length;
    return { ...c, nullMax: Math.max(...nulls), p0: (beaten + 1) / (D + 1) };
  }).filter((c) => c.p0 <= 1 / cands.length || (c.slot === "count" && c.p0 <= 1 / cands.length))
    .sort((a, b) => b.p - a.p);
  // Order-free slots (the count) are untouched by the order null: they pass
  // only by being more likely than not, and are marked as such.
  const countMode = modeOf(holo, "count");
  const count = countMode && countMode.p > 0.5 ? { slot: "count", ...countMode, orderFree: true } : null;
  const formSlots = new Set(form.map((f) => f.slot));
  // LEARNED AT: the shallowest prefix whose likely slots, restricted to the
  // form, are the form — one more instance stopped changing the definition.
  const defOf = (k) => { const h = readStream(units.slice(0, k), { alpha }).holo; return new Set(likely(h).filter((x) => formSlots.has(x.slot) && modeOf(holo, x.slot).value === x.value).map((x) => x.slot)); };
  let learnedAt = null;
  for (let k = 1; k <= units.length; k++) { const d = defOf(k); if (d.size === formSlots.size) { let stays = true; for (let k2 = k; k2 <= Math.min(units.length, k + 5); k2++) if (defOf(k2).size !== formSlots.size) { stays = false; break; } if (stays) { learnedAt = k; break; } } }
  // The content: slots that stay surprising — mean late surprisal highest.
  const late = trajectory.slice(Math.floor(trajectory.length / 2));
  const slotMean = new Map();
  for (const t of late) for (const [s, v] of Object.entries(t.perSlot)) { const a = slotMean.get(s) ?? [0, 0]; a[0] += v.surprisal; a[1]++; slotMean.set(s, a); }
  const content = [...slotMean].map(([s, [sum, n]]) => ({ slot: s, bits: sum / n })).filter((x) => !formSlots.has(x.slot) && !ORDER_FREE(x.slot)).sort((a, b) => b.bits - a.bits);
  // The delta, split: what each instance did to the FORM (the slots that
  // became predictable) and to the CONTENT (the rest). Only the first should
  // go to zero as the form is learned; content keeps moving the holograph by
  // its nature — each new end word rewrites its slot. (Measured on Lear:
  // the undivided total fell only 5.5 → 3.3 bits, because content dominated.)
  for (const t of trajectory) { t.bayesForm = 0; t.bayesContent = 0; for (const [sl, v] of Object.entries(t.perSlot)) { if (formSlots.has(sl) || sl === "count") t.bayesForm += v.bayes; else t.bayesContent += v.bayes; } }
  const tenth = Math.max(1, Math.floor(trajectory.length / 10));
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const early = trajectory.slice(0, tenth).map((t) => t.bayes), tail = trajectory.slice(-tenth).map((t) => t.bayes);
  const earlyF = trajectory.slice(0, tenth).map((t) => t.bayesForm), tailF = trajectory.slice(-tenth).map((t) => t.bayesForm);
  const earlyC = trajectory.slice(0, tenth).map((t) => t.bayesContent), tailC = trajectory.slice(-tenth).map((t) => t.bayesContent);
  return {
    schema: FORM_PRIOR_SCHEMA, instances: units.length, alpha, draws: D, tested: cands.length,
    holo, trajectory, form, count, content, learnedAt,
    // What every instance HAS (and so what the rest of a population would
    // have to lack): not testable against the order null, which cannot touch
    // it — its relative ground is the population (paradigm.js).
    orderFree,
    bayes: { first: mean(early), last: mean(tail), form: { first: mean(earlyF), last: mean(tailF) }, content: { first: mean(earlyC), last: mean(tailC) } },
    basis: `${units.length} instance(s) read one at a time; ${form.length} slot(s) became predictable beyond the order-destroyed null (${D} draws, level 1/${cands.length})${count ? `; ${count.value} element(s) in ${Math.round(count.p * 100)}%` : ""}; learned at instance ${learnedAt ?? "— (never settled)"}; Bayesian surprise per instance, to the form ${mean(earlyF).toFixed(2)} → ${mean(tailF).toFixed(2)} bits, to the content ${mean(earlyC).toFixed(1)} → ${mean(tailC).toFixed(1)} bits`,
  };
}

/**
 * turnOf(formPrior, unit) — Meyer: under the learned tendency, where does
 * this instance deviate? Each form slot's surprisal for this instance; the
 * slots it breaks (the form predicts a value, the instance gives another).
 */
export function turnOf(fp, unit) {
  const f = formFacts(unit);
  const breaks = [];
  for (const s of fp.form) {
    const v = f.get(s.slot);
    if (v == null) { breaks.push({ slot: s.slot, expected: s.value, got: "(absent)", bits: Infinity }); continue; }
    if (String(v) !== String(s.value)) breaks.push({ slot: s.slot, expected: s.value, got: String(v), bits: predict(fp.holo, s.slot, String(v)).bits });
  }
  return { breaks, held: fp.form.length - breaks.length, of: fp.form.length };
}

// ── KIND BOUNDARIES: A NEW KIND IS WHAT MOVES THE CURRENT GROUND MORE THAN
// ITS OWN MEMBERS DO (2026-09-22). The user: "be sure for each hunt it has a
// proper, relative ground to compare against." Measured first against the
// wrong ground — the whole stream shuffled, which mixes every kind everywhere
// and made a man page's hundreds of slots set the bar (cut ≈ 400 bits; no
// boundary found). The relative ground is the kind being read NOW: the
// `window` instances before a candidate boundary. Its score is the delta the
// instances AFTER it make to that ground's holograph, per fact, minus the
// delta the ground's own members make to it (each left out and re-admitted)
// — how much more the arrivals move the ground than the ground moves itself.
// The null is the scan's own maximum over permuted streams (the maximum, so
// the whole scan is one test): a boundary beats every permuted maximum.
// `window` is declared (kernel/activation.js: how wide the present is is the
// reader's to say) and stated in the result.

import { klDirichlet, ABSENT } from "../kernel/bayes-surprise.js";

// A window's counts, absence included: a member lacking a slot another member
// has holds ABSENT there (kernel/bayes-surprise.js).
const countsOf = (factsList) => {
  const slots = new Set(factsList.flatMap((f) => [...f.keys()]));
  const m = new Map();
  for (const s of slots) { const x = new Map(); for (const f of factsList) { const k = f.has(s) ? String(f.get(s)) : ABSENT; x.set(k, (x.get(k) ?? 0) + 1); } m.set(s, x); }
  m.members = factsList.length;
  return m;
};
/** Bayesian surprise, bits per fact, of admitting `facts` to counts `C` (optionally with one member's own facts removed). */
function deltaPerFact(C, facts, alpha, without = null) {
  let bits = 0;
  const slots = new Set([...C.keys(), ...facts.keys()]);
  for (const s of slots) {
    const v = facts.has(s) ? String(facts.get(s)) : ABSENT;
    const m = C.get(s) ?? new Map([[ABSENT, C.members]]);
    const own = without ? (without.has(s) ? String(without.get(s)) : ABSENT) : null;
    const count = (k) => (m.get(k) ?? 0) - (k === own ? 1 : 0);
    // + the novel bucket (kernel/bayes-surprise.js): the unseen stays possible, so a repeat still moves belief
    const support = [...new Set([...m.keys(), v])].filter((k) => k === v || count(k) > 0).concat(["\u0000novel"]);
    const prior = support.map((k) => Math.max(0, count(k)) + alpha);
    const post = support.map((k, i) => prior[i] + (k === v ? 1 : 0));
    bits += klDirichlet(post, prior) / Math.LN2;
  }
  return bits / Math.max(1, slots.size);
}
function scan(F, window, alpha) {
  const score = new Array(F.length).fill(null);
  for (let t = window; t + window <= F.length; t++) {
    const pre = F.slice(t - window, t), C = countsOf(pre);
    const self = pre.reduce((a, f) => a + deltaPerFact(C, f, alpha, f), 0) / pre.length;
    const cross = F.slice(t, t + window).reduce((a, f) => a + deltaPerFact(C, f, alpha), 0) / window;
    score[t] = cross - self;
  }
  return score;
}

/**
 * kindBoundaries(stream, { window, draws, alpha, seed }) →
 *   { boundaries, score, cut, window, draws, basis }
 * A boundary at t: the score is a local maximum, beats the maximum score of
 * every one of `draws` permuted streams, and sits at least `window` from the
 * last boundary.
 */
export function kindBoundaries(stream, { window, draws = 20, alpha = 1, seed = 5 } = {}) {
  if (!Number.isInteger(window) || window < 2) throw new TypeError("kindBoundaries: window is declared (an integer ≥ 2)");
  if (stream.length < 2 * window) return { boundaries: [], score: [], cut: null, window, draws, basis: `${stream.length} instance(s): fewer than two windows of ${window} — nothing to compare`, refused: "too_short" };
  const F = stream.map(formFacts);
  const score = scan(F, window, alpha);
  _seed = seed;
  const maxima = [];
  for (let d = 0; d < draws; d++) maxima.push(Math.max(...scan(shuffled(F), window, alpha).filter((x) => x != null)));
  const cut = Math.max(...maxima);
  const boundaries = [];
  for (let t = window; t + window <= F.length; t++) {
    const s = score[t];
    if (s == null || s <= cut) continue;
    if ((score[t - 1] ?? -Infinity) > s || (score[t + 1] ?? -Infinity) > s) continue;
    if (boundaries.length && t - boundaries.at(-1) < window) continue;
    boundaries.push(t);
  }
  return { boundaries, score, cut, window, draws, basis: `each candidate scored against the kind being read NOW (the ${window} instance(s) before it): how much more the next ${window} move that ground than its own members do, bits per fact; a boundary beats the scan's maximum on every one of ${draws} permuted streams (cut ${cut.toFixed(3)})` };
}
