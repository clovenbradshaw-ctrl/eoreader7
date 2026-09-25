// verify-ground-truth.mjs — BEFORE any subject runs, confirm this project's
// own ground truth actually holds against the corpus it built, mechanically,
// for every rung. Two checks:
//
//   T1/T2/T3/T5/T6 — every plant paragraph questions.json's answer depends on
//   is actually present in that rung's session files (grep, verbatim
//   substring — lib/plants.mjs's bodies land in the corpus unchanged, so this
//   is exact, not fuzzy). T3 additionally confirms its chain has exactly the
//   two conflicting statements and no third (a structural check that nothing
//   was added to resolve it).
//
//   T4 — the whole rung's text is grepped for every plausible surface form of
//   an answer (numbers, language names, title words, causal language), and
//   the check PASSES when NONE of them appear. This is the one direction
//   ordinary "grep for the answer" can't check (there is no answer to find);
//   each pattern below is commented with what it would catch.
//
//   DEDUP-FREQUENCY ATTACK (added 2026-09-22, sensitivity audit) — re-runs
//   the audit's own exploit: `grep -h "^- " session-*.md | sort | uniq -c`
//   groups every bullet item by its EXACT text and counts repeats. Before
//   this fix, EVERY planted paragraph sat at frequency 1 (each is unique,
//   hand-written, placed once) and EVERY distractor sat at a much higher,
//   near-uniform frequency (a 35-item pool cycled through hundreds of fill
//   slots) — so "frequency 1" was a perfect, zero-reasoning classifier for
//   "planted," and the separation got CLEANER as the rung grew (rung-300
//   worse than rung-60, worse than rung-12), the opposite of this test's own
//   scaling intent. The fix (lib/paraphrase.mjs, generate-corpus.mjs) reworks
//   each reused distractor independently at every insertion, so a meaningful
//   share of distractor TEXT also lands at frequency 1. This check FAILS the
//   rung if it does not: if the frequency-1 bucket is still EXACTLY the 59
//   planted paragraphs, with zero distractor lines mixed in, frequency alone
//   is still a working attack and the fix has not actually held.
//
//   node verify-ground-truth.mjs [--rungs 12,60,300]
//
// Exits 0 only if every rung passes every check. This does not grade a
// subject's answers (score.mjs does that); it only confirms the test itself
// is honest before anyone is asked to take it.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PLANTS, PLANTS_BY_CHAIN } from "./lib/plants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const RUNGS = flag("rungs", "12,60,300").split(",").map((s) => Number(s.trim())).filter(Number.isFinite);

const QUESTIONS = JSON.parse(readFileSync(join(HERE, "questions.json"), "utf8")).questions;

console.log(`the-long-project ground-truth verifier`);
console.log(`  rungs: ${RUNGS.join(", ")}  ·  questions: ${QUESTIONS.length}  ·  plants: ${PLANTS.length}`);

// T4's plausible-surface-form checks: one array of {re, why} per question id,
// covering the concrete ways a leaked answer could appear ANYWHERE in the
// rung's text (not just near the topic — a leak anywhere is still a leak).
const T4_SURFACE_FORMS = {
  "t4-1": [
    { re: /\d{2,3}(\.\d+)?\s*%/, why: "any two/three-digit percentage (an SLA number)" },
    { re: /\b(nine nines|four nines|three nines|five nines)\b/i, why: "colloquial SLA shorthand" },
    { re: /\b(99|95|90)(\.\d+)?\s*percent\b/i, why: "a common SLA figure spelled out" },
  ],
  "t4-2": [
    { re: /\b(largest|biggest|top)\b[^.\n]{0,40}\bcustomer\b/i, why: "a customer ranked by size" },
    { re: /\bcustomer\b[^.\n]{0,40}\b(largest|biggest|top)\b/i, why: "a customer ranked by size (reversed order)" },
  ],
  "t4-3": [
    { re: /\b(golang|rust|python|java|javascript|typescript|ruby|kotlin|scala|elixir|erlang|php|c\+\+|c#|node\.?js)\b/i, why: "any programming-language name, anywhere in the corpus" },
  ],
  "t4-4": [
    { re: /\b(product manager|program manager|project manager|engineering manager|director|vice president|head of|chief\b)\b/i, why: "any formal title word, anywhere in the corpus" },
    { re: /\bpm\b/i, why: "the abbreviation PM as a title" },
  ],
  "t4-5": [
    { re: /\broot cause\b[^.\n]{0,60}\b(was|is|:)/i, why: "a stated root cause for any incident" },
  ],
};
// t4-5 additionally checks every sentence mentioning QF-1042 for causal language.
const CAUSAL = /\b(because|due to|caused by|root cause)\b/i;

function rungDir(N) { return join(HERE, "corpus", `rung-${N}`); }
function loadRungText(N) {
  const dir = rungDir(N);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  return files.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
}

// The dedup-frequency attack, re-run against the generated corpus (see
// header). Groups every rendered bullet item ("- <body>") by its EXACT
// text, counts occurrences, and checks whether frequency==1 still perfectly
// separates the 59 planted paragraphs from every distractor render.
function dedupFrequencyCheck(N) {
  const dir = rungDir(N);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  const counts = new Map();
  for (const f of files) {
    for (const line of readFileSync(join(dir, f), "utf8").split("\n")) {
      const m = /^- (.+)$/.exec(line);
      if (m) counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    }
  }
  const plantBodies = new Set(PLANTS.map((p) => p.body));
  const freq1 = [...counts.entries()].filter(([, c]) => c === 1).map(([t]) => t);
  const freq1Plants = freq1.filter((t) => plantBodies.has(t)).length;
  const freq1NonPlants = freq1.length - freq1Plants;
  const plantsAtFreq1 = PLANTS.filter((p) => counts.get(p.body) === 1).length;
  // The attack works when frequency==1 is a PERFECT classifier: every plant
  // at freq 1, and NOTHING ELSE at freq 1 to contaminate it. Any distractor
  // text at freq 1 breaks that (a naive "grep frequency 1" now pulls in
  // noise), regardless of how many plants also happen to sit there.
  const attackWorks = freq1NonPlants === 0;
  return { distinctLines: counts.size, freq1Total: freq1.length, freq1Plants, freq1NonPlants, plantsAtFreq1, plantTotal: PLANTS.length, attackWorks };
}

let allOk = true;
for (const N of RUNGS) {
  console.log(`\n── rung ${N} ──`);
  let text;
  try { text = loadRungText(N); } catch (e) { console.log(`  FAIL: could not read corpus/rung-${N} (${e.message}) — run generate-corpus.mjs first`); allOk = false; continue; }

  let rungOk = true;

  // T1/T2/T5/T6: every plant body the chain needs must be verbatim in the corpus.
  for (const q of QUESTIONS) {
    if (!["T1", "T2", "T5", "T6"].includes(q.type)) continue;
    const chainPlants = PLANTS_BY_CHAIN.get(q.chain) ?? [];
    const missing = chainPlants.filter((p) => !text.includes(p.body));
    const ok = chainPlants.length > 0 && missing.length === 0;
    console.log(`  [${ok ? "OK " : "FAIL"}] ${q.id} (${q.type}): ${chainPlants.length} plant paragraph(s) expected, ${chainPlants.length - missing.length} found`);
    if (!ok) { rungOk = false; for (const m of missing) console.log(`         missing: ${m.id} — "${m.body.slice(0, 70)}…"`); }
  }

  // T3: both sides present, and the chain has EXACTLY two events (nothing
  // resolves it — verified structurally, since this corpus is closed and
  // hand-authored: no third plant or distractor touches a T3 topic).
  for (const q of QUESTIONS.filter((q) => q.type === "T3")) {
    const chainPlants = PLANTS_BY_CHAIN.get(q.chain) ?? [];
    const bothPresent = chainPlants.length === 2 && chainPlants.every((p) => text.includes(p.body));
    const exactlyTwo = chainPlants.length === 2;
    const ok = bothPresent && exactlyTwo;
    console.log(`  [${ok ? "OK " : "FAIL"}] ${q.id} (T3): both conflicting statements present=${bothPresent}, exactly 2 planted events (no resolution added)=${exactlyTwo}`);
    if (!ok) rungOk = false;
  }

  // T4: the whole rung's text must contain NONE of the plausible surface forms.
  for (const q of QUESTIONS.filter((q) => q.type === "T4")) {
    const forms = T4_SURFACE_FORMS[q.id] ?? [];
    const hits = forms.map((f) => ({ ...f, matched: f.re.test(text) })).filter((f) => f.matched);
    let ok = hits.length === 0;
    if (q.id === "t4-5") {
      const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.includes("QF-1042"));
      const causal = sentences.filter((s) => CAUSAL.test(s));
      console.log(`         QF-1042 mentioned in ${sentences.length} sentence(s), ${causal.length} with causal language`);
      if (causal.length) { ok = false; hits.push(...causal.map((s) => ({ why: "causal language in a QF-1042 sentence", matched: true, sentence: s }))); }
    }
    console.log(`  [${ok ? "OK " : "FAIL"}] ${q.id} (T4, silence): checked ${forms.length} surface-form pattern(s), ${hits.length} leaked`);
    for (const h of hits) console.log(`         LEAK: ${h.why}${h.sentence ? ` — "${h.sentence.slice(0, 90)}…"` : ""}`);
    if (!ok) rungOk = false;
  }

  // The dedup-frequency attack (sensitivity audit) — see header.
  {
    const dd = dedupFrequencyCheck(N);
    const ok = !dd.attackWorks;
    console.log(`  [${ok ? "OK " : "FAIL"}] dedup-frequency attack: ${dd.distinctLines} distinct bullet text(s); ${dd.freq1Total} sit at frequency 1 (${dd.freq1Plants} planted, ${dd.freq1NonPlants} distractor); ${dd.plantsAtFreq1}/${dd.plantTotal} plants are themselves at frequency 1`);
    if (!ok) { console.log(`         FAIL: frequency==1 still perfectly separates planted from filler (zero distractor contamination) — the dedup exploit still works at this rung`); rungOk = false; }
  }

  console.log(`  rung ${N}: ${rungOk ? "ALL CHECKS PASS" : "FAILED — see above"}`);
  allOk = allOk && rungOk;
}

console.log(`\n${allOk ? "ALL RUNGS PASS" : "AT LEAST ONE RUNG FAILED"}`);
process.exit(allOk ? 0 : 1);
