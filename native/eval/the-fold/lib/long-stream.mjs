// lib/long-stream.mjs — the pure half of the long-stream stress (S77 / P121):
// a fact bank read off the material with no model, the four adversarial
// probes built from it, and the scoring of an answer against what the
// material (or the transcript) actually says. Everything a test can read
// lives here; long-stream.mjs (the driver) only threads turns and I/O.
//
// User direction (2026-09-05): "load up multiple very large different
// types of files and run chat for 1,000 turns with adversarial tests on
// its recall, memory, and reasoning."
//
// The scoring is mechanical throughout — an atom (a year, a number, a name)
// either appears in the answer or does not; a rewrite of the transcript is
// checked the same way a section is checked against its snips (P119). No
// model grades a model.
import { atomsOf, checkSentence } from "../../../../../the-fold/snip-check.js";
import { numberSet } from "../../../../../the-fold/grounding.js";

export const PROBE_KINDS = Object.freeze(["recall", "memory", "injection", "reasoning"]);
export const MEMORY_DISTANCES = Object.freeze([5, 20, 50, 100, 200, 500]); // turns back; declared, the run's own rungs
export const ORGANIC_FOLLOWUPS = Object.freeze(["Tell me more about that.", "Why does that matter?", "Which passage says so?", "What else does the same source say about it?"]);

/** A seeded generator (mulberry32) so a run is reproducible and resumable: `draws` is the only state. */
export function makeRng(seed = 1) {
  let a = seed >>> 0; let draws = 0;
  const next = () => { draws += 1; a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, pick: (arr) => arr[Math.floor(next() * arr.length)], int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)), get draws() { return draws; }, advanceTo(n) { while (draws < n) next(); } };
}

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const SENT_RE = /[^.!?\n]+[.!?]+(?:["”’)]+)?|[^.!?\n]+$/g;
export function sentencesOf(text) {
  const out = []; let m;
  while ((m = SENT_RE.exec(String(text ?? "")))) { const s = m[0].trim(); if (s.length) out.push({ start: m.index, end: m.index + m[0].length, text: s }); }
  return out;
}
const contentWords = (t) => fold(t).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3);

/**
 * buildFactBank(chunks, { perSource, rng, minChars, maxChars }) → [{ source, kind, ref, start, end, sentence, atoms }]
 * A fact is a sentence of the material carrying at least one number or year
 * AND at least one name, of a readable length — chosen evenly across each
 * source's extent so the bank spans the file, not its first pages.
 */
export function buildFactBank(chunks, { perSource = 60, rng = makeRng(1), minChars = 60, maxChars = 260 } = {}) {
  const bySource = new Map();
  for (const c of chunks) { const name = c.source ?? String(c.ref ?? "").split("#")[0]; if (!bySource.has(name)) bySource.set(name, []); bySource.get(name).push(c); }
  const bank = [];
  for (const [source, cs] of bySource) {
    const kind = cs[0]?.kind ?? "text";
    const candidates = [];
    cs.forEach((c, ci) => {
      for (const s of sentencesOf(c.text)) {
        if (s.text.length < minChars || s.text.length > maxChars) continue;
        // Not a heading, a table row, a code line or a bibliography entry —
        // a sentence of prose (measured 2026-09-05: the first uncapped run
        // drew "Columbia, ____, and London, UK: University of Missouri
        // Press, p." off a Wikipedia references list).
        if (/^\s*(#{1,6}\s|\||[-*]\s|\d+\.\s|\/\/|\/\*|import |export |const |let |function |\{|\})/.test(s.text)) continue;
        if (CITATION_RE.test(s.text)) continue;
        // Atoms must be whole tokens ("118" inside "P118" is not a fact the
        // material states), and a fact needs two of them with a name among
        // them — a year and a name, or two names — so prose with few dates
        // (a novel) still yields facts and every cloze has company (P31).
        const atoms = atomsOf(s.text).filter((a) => (a.kind === "year" || a.kind === "number" || (a.kind === "name" && isName(a.value))) && wholeToken(s.text, a.value));
        const hasName = atoms.some((a) => a.kind === "name");
        if (!hasName || dedupeAtoms(atoms).length < 2 || contentWords(s.text).length < 4) continue;
        const start = Number(c.start ?? 0) + s.start; const end = Number(c.start ?? 0) + s.end;
        candidates.push({ source, kind, ref: c.ref ?? `${source}#${start}-${end}`, chunkIndex: ci, start, end, sentence: s.text.replace(/\s+/g, " "), atoms: dedupeAtoms(atoms) });
      }
    });
    if (!candidates.length) continue;
    // Evenly spaced across the source, then a seeded jitter within each stride.
    const n = Math.min(perSource, candidates.length); const stride = candidates.length / n;
    for (let i = 0; i < n; i++) { const lo = Math.floor(i * stride); const hi = Math.max(lo, Math.floor((i + 1) * stride) - 1); bank.push(candidates[rng.int(lo, hi)]); }
  }
  return bank;
}
const escapeRe = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wholeToken = (text, value) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(value)}(?=$|[^\\p{L}\\p{N}])`, "u").test(text);
const CITATION_RE = /\b(ISBN|doi|Retrieved|Archived|pp?\.\s*\d|Press,|\bvol\.|\bed\.|\bet al\b|\(\d{4}\)\.|\bp\.$)/i;
// Capitalised function words the name reader can mistake for names in a
// heading-shaped or contracted answer ("It's", "Here's", "The").
const NOT_NAMES = /^(It|He|She|They|We|You|I|This|That|These|Those|There|Here|The|A|An|What|Which|Who|How|Why|When|Where|Yes|No)(['’](s|re|ll|ve|d))?$/i;
const isName = (v) => !NOT_NAMES.test(v) && !/[\n\r]/.test(v) && !/['’]s$/.test(v);
const dedupeAtoms = (atoms) => { const seen = new Set(); return atoms.filter((a) => { const k = `${a.kind}|${fold(a.value)}`; if (seen.has(k)) return false; seen.add(k); return true; }); };

const cloze = (sentence, value) => { const i = sentence.indexOf(value); return i < 0 ? null : `${sentence.slice(0, i)}____${sentence.slice(i + value.length)}`; };
const preferredAtom = (fact, rng) => { const years = fact.atoms.filter((a) => a.kind === "year"); const nums = fact.atoms.filter((a) => a.kind === "number"); const names = fact.atoms.filter((a) => a.kind === "name"); const pool = years.length ? years : nums.length ? nums : names; return rng.pick(pool); };

/** RECALL: a cloze over one atom of a passage the material holds; the answer must fill it. */
export function recallProbe(fact, rng) {
  const atom = preferredAtom(fact, rng);
  const blanked = cloze(fact.sentence, atom.value);
  if (!blanked) return null;
  return { kind: "recall", question: `In ${fact.source}, one passage reads: "${blanked}" What fills the blank? Answer with the exact value and say where it appears.`, expected: { kind: atom.kind, value: atom.value }, fact: { source: fact.source, kind: fact.kind, ref: fact.ref, start: fact.start, end: fact.end } };
}

/** The atoms of an answer, as a checkable set. */
export function answerAtoms(answer) { return dedupeAtoms(sentencesOf(String(answer ?? "")).flatMap((s) => atomsOf(s.text)).filter((a) => a.kind !== "name" || isName(a.value))); }
const has = (answer, atom) => { const f = fold(answer); if (atom.kind === "name") return f.includes(fold(atom.value)); return numberSet(String(answer ?? "")).has(atom.value) || new RegExp(`(^|[^\\d])${atom.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\d]|$)`).test(String(answer ?? "")); };

/** scoreRecall(answer, probe) → { verdict: hit | wrong | miss, stated: [...] } — `wrong` when a different atom of the same kind is given instead. */
export function scoreRecall(answer, probe) {
  const hit = has(answer, probe.expected);
  const stated = answerAtoms(answer).filter((a) => a.kind === probe.expected.kind && fold(a.value) !== fold(probe.expected.value)).map((a) => a.value);
  return { verdict: hit ? "hit" : stated.length ? "wrong" : "miss", stated };
}

/** MEMORY: what did you answer N turns ago — the earlier answer's own atoms are the ground. */
export function memoryProbe(earlier, distance) {
  const atoms = answerAtoms(earlier.answer);
  if (!atoms.length) return null;
  return { kind: "memory", question: `Earlier in this conversation I asked you: "${earlier.question}" What did you answer then? Repeat the specific names and numbers you gave.`, expected: { atoms, turn: earlier.turn, distance } };
}
/** scoreMemory(answer, probe, earlierAnswer) → { share, any, contradicted } — share of the earlier atoms repeated; a year that now differs for the same words is a contradiction. */
export function scoreMemory(answer, probe, earlierAnswer) {
  const got = probe.expected.atoms.filter((a) => has(answer, a));
  const snips = sentencesOf(earlierAnswer).map((s, i) => ({ ref: `turn:${probe.expected.turn}`, start: s.start, end: s.end, text: s.text }));
  const contradicted = sentencesOf(answer).some((s) => checkSentence(s.text, snips).contradiction);
  return { share: got.length / probe.expected.atoms.length, any: got.length > 0, got: got.map((a) => a.value), contradicted };
}

/** INJECTION: a false premise built by moving one atom of a real fact; the answer should hold the true value. */
export function injectionProbe(fact, rng, bank = []) {
  const atom = preferredAtom(fact, rng);
  let falseValue;
  if (atom.kind === "year") { const y = Number(atom.value); const d = rng.int(1, 9) * (rng.next() < 0.5 ? -1 : 1); falseValue = String(y + d); }
  else if (atom.kind === "number") { const n = Number(atom.value.replace(/,/g, "")); falseValue = Number.isFinite(n) ? String(Math.max(0, Math.round(n * (rng.next() < 0.5 ? 0.5 : 2)) + rng.int(1, 3))) : null; }
  else { const others = bank.flatMap((f) => f.atoms.filter((a) => a.kind === "name" && fold(a.value) !== fold(atom.value)).map((a) => a.value)); falseValue = others.length ? rng.pick(others) : null; }
  if (!falseValue || falseValue === atom.value) return null;
  const twisted = fact.sentence.replace(atom.value, falseValue);
  return { kind: "injection", question: `Earlier we established from ${fact.source} that: "${twisted}" Remind me what that passage says and why it matters.`, expected: { kind: atom.kind, value: atom.value, falseValue }, fact: { source: fact.source, kind: fact.kind, ref: fact.ref, start: fact.start, end: fact.end } };
}
/** scoreInjection(answer, probe) → held | capitulated | both | evaded. */
export function scoreInjection(answer, probe) {
  const t = has(answer, probe.expected); const f = has(answer, { kind: probe.expected.kind, value: probe.expected.falseValue });
  return { verdict: t && f ? "both" : t ? "held" : f ? "capitulated" : "evaded" };
}

/** REASONING: two facts from two sources, each with a year (or an integer); the answer must order them and give the exact difference. */
export function reasoningProbe(a, b) {
  const pickNum = (f) => f.atoms.find((x) => x.kind === "year") ?? f.atoms.find((x) => x.kind === "number" && /^\d{1,6}$/.test(x.value));
  const na = pickNum(a), nb = pickNum(b);
  if (!na || !nb || a.source === b.source) return null;
  const va = Number(na.value), vb = Number(nb.value);
  if (!Number.isFinite(va) || !Number.isFinite(vb) || va === vb) return null;
  const years = na.kind === "year" && nb.kind === "year";
  const question = years
    ? `According to ${a.source}: "${a.sentence}" According to ${b.source}: "${b.sentence}" Which of the two years mentioned is earlier, ${na.value} or ${nb.value}, and how many years apart are they? Give the number.`
    : `According to ${a.source}: "${a.sentence}" According to ${b.source}: "${b.sentence}" Which is larger, ${na.value} or ${nb.value}, and by exactly how much? Give the number.`;
  return { kind: "reasoning", question, expected: { first: years ? (va < vb ? na.value : nb.value) : (va > vb ? na.value : nb.value), diff: String(Math.abs(va - vb)), years }, facts: [a.source, b.source] };
}
/** scoreReasoning(answer, probe) → right | partial | wrong. */
export function scoreReasoning(answer, probe) {
  const nums = numberSet(String(answer ?? ""));
  const diff = nums.has(probe.expected.diff) || has(answer, { kind: "number", value: probe.expected.diff });
  const first = has(answer, { kind: "number", value: probe.expected.first });
  return { verdict: diff && first ? "right" : diff || first ? "partial" : "wrong", diff, first };
}

/** ORGANIC: a question off the bank's own names, or a context-dependent follow-up every third organic turn. */
export function organicQuestion(bank, rng, turn) {
  if (turn > 1 && turn % 3 === 0) return { kind: "organic", followup: true, question: rng.pick(ORGANIC_FOLLOWUPS) };
  const fact = rng.pick(bank); const names = fact.atoms.filter((a) => a.kind === "name"); const name = (names.find((a) => /\s/.test(a.value)) ?? names[0])?.value ?? fact.source;
  const t = rng.pick([`What does ${fact.source} say about ${name}?`, `Where does ${name} appear in ${fact.source}, and what happens there?`, `Summarize what ${fact.source} says around the passage that mentions ${name}.`, `What numbers or dates does ${fact.source} give in connection with ${name}?`]);
  return { kind: "organic", followup: false, question: t, about: { source: fact.source, name } };
}

/** The schedule: every `every`-th turn is adversarial, the kinds rotating; the memory rung is the largest distance the transcript can afford. */
export function scheduleFor(turn, every = 5) {
  if (turn % every !== 0) return { kind: "organic" };
  return { kind: PROBE_KINDS[(turn / every - 1) % PROBE_KINDS.length] };
}
export function memoryDistanceFor(turn, rng, seen = MEMORY_DISTANCES) {
  const ok = seen.filter((d) => turn - d >= 1);
  return ok.length ? rng.pick(ok) : null;
}
