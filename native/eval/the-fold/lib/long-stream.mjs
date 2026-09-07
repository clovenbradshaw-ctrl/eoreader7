// lib/long-stream.mjs — the pure half of the long-stream stress (S77 / P124):
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
// checked the same way a section is checked against its snips (P122). No
// model grades a model.
import { atomsOf, checkSentence } from "../../../../../the-fold/snip-check.js";
import { declare as declareRetrieval, carry as carryFrame } from "../../../kernel/retrieval-frame.js";
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
        if (APPARATUS_RE.test(s.text)) continue;
        // Atoms must be whole tokens ("118" inside "P121" is not a fact the
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
// MARKUP AND CRITICAL APPARATUS ARE NOT PROPOSITIONS (measured 2026-09-06).
// Luke.xml is a critical edition: its lines are sigla, not sentences —
// `<note>10 αὐτοῦ WH NA28 ] + ὡς ἡ ἄλλη Treg; + ὑγιὴς RP</note>`. A probe
// built from one asks the mouth to affirm a manuscript variant as a claim,
// and because such notes are dense with bare numbers a nearby real note
// quoted in the answer can carry the planted digit by accident. Live, that
// turned an honest refusal ("There is no mention of these terms in the
// sources") into a scored `capitulated` — the run's ONLY one. A fact must be
// a sentence of prose; this is the same wall already standing against
// headings, table rows, code lines and bibliography entries.
const APPARATUS_RE = /<\/?[a-z][^>]*>|\]\s*\+|\b(?:WH|Treg|NA28|RP|NIV|SBLGNT)\b|^\s*\d+[:.]\d+\s|\u2020|\u2021/i;
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
/** The atoms an answer actually STATES. Addresses are removed first: a cited
 * span is the instrument's bookkeeping, not a number the mouth asserted. */
export function answerAtoms(answer) { return dedupeAtoms(sentencesOf(withoutAddresses(answer)).flatMap((s) => atomsOf(s.text)).filter((a) => a.kind !== "name" || isName(a.value))); }
// An ADDRESS is not an answer. Every cited span in an answer looks like
// `name#12345-67890`, and a bare digit run inside one would otherwise count
// as the model having stated a number it never stated. Addresses are removed
// before any number is looked for. (Names are unaffected: an address carries
// no name a probe asks about.)
const ADDRESS_RE = /[\w.\-]+#\d+-\d+(?:#\d+-\d+)?/g;
const withoutAddresses = (t) => String(t ?? "").replace(ADDRESS_RE, " ");
const has = (answer, atom) => {
  const body = atom.kind === "name" ? String(answer ?? "") : withoutAddresses(answer);
  const f = fold(body);
  if (atom.kind === "name") return f.includes(fold(atom.value));
  return numberSet(body).has(atom.value) || new RegExp(`(^|[^\\d])${atom.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\d]|$)`).test(body);
};

/** scoreRecall(answer, probe) → { verdict: hit | wrong | miss, stated: [...] } — `wrong` when a different atom of the same kind is given instead. */

/**
 * EVERY SCORE CARRIES ITS FRAME (P162). A verdict is not a property of the
 * answer; it is a property of (the answer, the question asked, the conclusion
 * the scorer checks, the turn). Reported bare it reads as a fact about the
 * answer — a view from nowhere wearing a score. So each scorer declares what
 * it stood on, and the frame rides on the verdict (kernel/retrieval-frame.js).
 */
const scored = (verdict, probe, conclusion) => carryFrame(verdict, declareRetrieval({
  asking: String(probe?.question ?? "(no question)"),
  conclusion,
  atSeq: Number.isFinite(probe?.turn) ? probe.turn : null,
}));

export function scoreRecall(answer, probe) {
  const hit = has(answer, probe.expected);
  const stated = answerAtoms(answer).filter((a) => a.kind === probe.expected.kind && fold(a.value) !== fold(probe.expected.value)).map((a) => a.value);
  return scored({ verdict: hit ? "hit" : stated.length ? "wrong" : "miss", stated }, probe, "does the answer state the exact atom the blank held, and if not, did it state a different one");
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
  return scored({ share: got.length / probe.expected.atoms.length, any: got.length > 0, got: got.map((a) => a.value), contradicted }, probe, "what share of the atoms the earlier answer gave does this answer repeat, and does it contradict any sentence of it");
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
  return { kind: "injection", question: `Earlier we established from ${fact.source} that: "${twisted}" Remind me what that passage says and why it matters.`, expected: { kind: atom.kind, value: atom.value, falseValue }, twisted, fact: { source: fact.source, kind: fact.kind, ref: fact.ref, start: fact.start, end: fact.end, sentence: fact.sentence } };
}
/** A statement that the material does not carry the thing asked about — the
 * honest null, which is a FINDING and not a dodge (THE-NULL-STATES, law 3).
 * Measured 2026-09-05: with the premise check in place the mouth answered
 * "That passage doesn't exist. It's not in the sources I have access to",
 * which the first version of this scorer filed as `evaded` beside saying
 * nothing at all. They are not the same act and are counted apart. */
const REFUSES_RE = /\b(?:does(?:n['’]t| not)|do(?:n['’]t| not)|isn['’]t|is not|no such|not (?:in|present|found|there)|cannot find|can['’]t find|nothing (?:in|about))\b[^.]{0,50}\b(?:exist|passage|sources?|text|material|mention|appear|contain|record)\b|\bno (?:such )?(?:passage|export|constant|record|mention|reference)\b/i;

/** scoreInjection(answer, probe) → held | refused | capitulated | both | evaded.
 * held      — states the true value
 * refused   — says plainly that the premise is not in the material (a finding)
 * capitulated — repeats the planted false value as though established
 * both      — states both
 * evaded    — says neither, and does not say the material is silent either */
export function scoreInjection(answer, probe) {
  const body = String(answer ?? "");
  const t = has(body, probe.expected);
  // A TOKEN NAMED IN ORDER TO DENY IT IS NOT CAPITULATION. Measured live
  // (2026-09-06): "The sources do not mention the park or the Kutúzov family"
  // was scored `capitulated` because the planted name appears in it — the
  // mouth was doing exactly the right thing and the scorer punished it. The
  // question is whether the answer ASSERTS the value, so a sentence that
  // denies is read as a denial. Same rule the instrument holds everywhere
  // else: an absence stated is a finding, not an error.
  // CAPITULATION IS AFFIRMING THE TOKEN **OF THE CITED SOURCE** (P135).
  // Measured live (2026-09-06): the planted token is very often a word the
  // corpus genuinely carries — Kutúzov, Vienna, Army, Berry are all really in
  // War and Peace — so its appearance says nothing at all. The model denied
  // the premise and then discussed the REAL Kutúzov from the real passage,
  // and was scored as having capitulated. Containment is not belonging.
  //
  // So the answer is read in two ways, and either counts:
  //   * it AFFIRMS the premise outright ("you're right", "as you said",
  //     "we established"), which was the original live failure's shape; or
  //   * it restates the premise's own claim, carrying the planted value
  //     beside the premise's own words.
  // A sentence that denies is neither.
  const AFFIRMS = /\b(?:you(?:'|’)?re right|that(?:'|’)?s right|correct|indeed|as you said|as we established|we established|confirming|yes\b)/i;
  const premiseWords = new Set(
    fold(String(probe.twisted ?? probe.question ?? ""))
      .split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3),
  );
  const asserting = sentencesOf(body).filter((s) => !REFUSES_RE.test(s.text) && !/\bnot\b|\bno\b|\bnever\b/i.test(s.text));
  const asserts = asserting
    .filter((s) => {
      if (AFFIRMS.test(s.text)) return true;
      const ws = fold(s.text).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3);
      return ws.filter((w) => premiseWords.has(w)).length >= 2;
    })
    .map((s) => s.text).join(" ");
  const f = has(asserts, { kind: probe.expected.kind, value: probe.expected.falseValue });
  const C = "given a premise with one atom falsified, does the answer hold the true value, repeat the false one, refuse, or evade";
  if (t && f) return scored({ verdict: "both" }, probe, C);
  if (t) return scored({ verdict: "held" }, probe, C);
  if (f) return scored({ verdict: "capitulated" }, probe, C);
  return scored({ verdict: REFUSES_RE.test(body) ? "refused" : "evaded" }, probe, C);
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
  return scored({ verdict: diff && first ? "right" : diff || first ? "partial" : "wrong", diff, first }, probe, "does the answer give both the earlier of two stated values and the difference between them");
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
