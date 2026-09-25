// verify-ground-truth.mjs — BEFORE any subject runs, confirm this held-out
// benchmark's own ground truth actually holds against the corpus it built,
// mechanically, for every rung. Adapted from long-project/verify-ground-
// truth.mjs (same machinery), checked against this project's own lib/
// plants.mjs and questions.json. Six checks:
//
//   T1/T2/T5/T6 — every plant paragraph questions.json's answer depends on
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
//   DEDUP-FREQUENCY ATTACK — re-runs `grep -h "^- " session-*.md | sort |
//   uniq -c`'s own exploit: groups every bullet item by its EXACT text and
//   counts repeats. If frequency==1 were still a perfect classifier for
//   "planted" (every plant unique, every distractor render repeating
//   verbatim), that would be a zero-reasoning attack. lib/paraphrase.mjs +
//   lib/distractors.mjs's `variants` fix this by reworking each reused
//   distractor independently at every insertion; this check FAILS the rung
//   if frequency==1 still perfectly separates planted from filler.
//
//   T5-SUBJECT-BEFORE-ESTABLISHMENT (new check, this benchmark) — Declan
//   Osei-Praveen (T5-3) and the trellis service (T5-4) are gated: neither may
//   appear, anywhere (attendee line or body text), in any session numbered
//   before their own establishing plant's session at that rung. Reads each
//   session file SEPARATELY (not the whole-rung concatenation the other
//   checks use) so it can compare a mention's session number against the
//   rung's own manifest.json — generate-corpus.mjs's attendee gating and
//   lib/distractors.mjs's deliberate silence are exactly what this proves
//   held, rather than assuming it from how the generator is written.
//
//   T3-LATER-PLANT-NOT-A-CORRECTION (new check, this benchmark) — each T3
//   chain's LATER plant (array order — see lib/plants.mjs's header) must
//   read as a plain, present-tense restatement that merely disagrees with
//   the earlier one, never as a fix to it: it must contain none of
//   correct/actually/not/no longer/instead/updated/changed. A later plant
//   phrased as a correction would make the "unresolved" contradiction read
//   as a resolved one, defeating T3's whole point.
//
//   node verify-ground-truth.mjs [--rungs 12,60,300]
//
// Exits 0 only if every rung passes every check. This does not grade a
// subject's answers (score.mjs does that); it only confirms the test itself
// is honest before anyone is asked to take it.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PLANTS, PLANTS_BY_CHAIN, T5_SUBJECTS } from "./lib/plants.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const RUNGS = flag("rungs", "12,60,300").split(",").map((s) => Number(s.trim())).filter(Number.isFinite);

const QUESTIONS = JSON.parse(readFileSync(join(HERE, "questions.json"), "utf8")).questions;

console.log(`the-emberlink-project ground-truth verifier (held-out benchmark)`);
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
// t4-5 additionally checks every sentence mentioning IN-4417 for causal language.
const CAUSAL = /\b(because|due to|caused by|root cause)\b/i;

// Correction/retraction language a T3 chain's LATER plant must not contain
// (see header). Word-boundary, case-insensitive; "no longer" is matched as
// its own two-word phrase inside the same alternation.
const CORRECTION_LANGUAGE = /\b(?:correct|actually|not|no longer|instead|updated|changed)\b/i;

function rungDir(N) { return join(HERE, "corpus", `rung-${N}`); }
function loadRungText(N) {
  const dir = rungDir(N);
  const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
  return files.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
}
function loadManifest(N) {
  return JSON.parse(readFileSync(join(rungDir(N), "manifest.json"), "utf8"));
}
// Session files individually, each tagged with its session number (parsed
// from the filename, not trusted from inside the file).
function loadSessionsSeparately(N) {
  const dir = rungDir(N);
  const files = readdirSync(dir).filter((f) => /^session-\d+\.md$/.test(f)).sort();
  return files.map((f) => {
    const n = Number(/^session-(\d+)\.md$/.exec(f)[1]);
    return { session: n, text: readFileSync(join(dir, f), "utf8") };
  });
}

// The dedup-frequency attack, re-run against the generated corpus (see
// header). Groups every rendered bullet item ("- <body>") by its EXACT
// text, counts occurrences, and checks whether frequency==1 still perfectly
// separates the planted paragraphs from every distractor render.
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
  const attackWorks = freq1NonPlants === 0;
  return { distinctLines: counts.size, freq1Total: freq1.length, freq1Plants, freq1NonPlants, plantsAtFreq1, plantTotal: PLANTS.length, attackWorks };
}

// NEW: no T5-gated subject appears in any session numbered before its own
// establishing plant's session at this rung. Word-boundary, case-sensitive
// (these are all proper nouns / a lowercase service name that is never
// legitimately capitalized differently in this corpus).
function t5GatingCheck(N, manifest) {
  const sessions = loadSessionsSeparately(N);
  const results = [];
  for (const [chain, subject] of Object.entries(T5_SUBJECTS)) {
    const establishId = `${chain}-establish`;
    const establishSession = manifest.events[establishId];
    if (establishSession == null) { results.push({ chain, subject, ok: false, detail: `establishing plant ${establishId} not in this rung's manifest` }); continue; }
    const re = new RegExp(`\\b${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    const leaks = sessions.filter((s) => s.session < establishSession && re.test(s.text));
    results.push({ chain, subject, establishSession, ok: leaks.length === 0, leaks: leaks.map((s) => s.session) });
  }
  return results;
}

// NEW: every T3 chain's LATER plant (array order) contains none of
// correct/actually/not/no longer/instead/updated/changed.
function t3CorrectionLanguageCheck() {
  const results = [];
  for (const q of QUESTIONS.filter((q) => q.type === "T3")) {
    const chainPlants = PLANTS_BY_CHAIN.get(q.chain) ?? [];
    const later = chainPlants[chainPlants.length - 1];
    const hit = later ? CORRECTION_LANGUAGE.exec(later.body) : null;
    results.push({ chain: q.chain, plantId: later?.id, ok: !!later && !hit, hit: hit?.[0] ?? null });
  }
  return results;
}

let allOk = true;
for (const N of RUNGS) {
  console.log(`\n── rung ${N} ──`);
  let text, manifest;
  try { text = loadRungText(N); manifest = loadManifest(N); } catch (e) { console.log(`  FAIL: could not read corpus/rung-${N} (${e.message}) — run generate-corpus.mjs first`); allOk = false; continue; }

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
      const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.includes("IN-4417"));
      const causal = sentences.filter((s) => CAUSAL.test(s));
      console.log(`         IN-4417 mentioned in ${sentences.length} sentence(s), ${causal.length} with causal language`);
      if (causal.length) { ok = false; hits.push(...causal.map((s) => ({ why: "causal language in an IN-4417 sentence", matched: true, sentence: s }))); }
    }
    console.log(`  [${ok ? "OK " : "FAIL"}] ${q.id} (T4, silence): checked ${forms.length} surface-form pattern(s), ${hits.length} leaked`);
    for (const h of hits) console.log(`         LEAK: ${h.why}${h.sentence ? ` — "${h.sentence.slice(0, 90)}…"` : ""}`);
    if (!ok) rungOk = false;
  }

  // The dedup-frequency attack.
  {
    const dd = dedupFrequencyCheck(N);
    const ok = !dd.attackWorks;
    console.log(`  [${ok ? "OK " : "FAIL"}] dedup-frequency attack: ${dd.distinctLines} distinct bullet text(s); ${dd.freq1Total} sit at frequency 1 (${dd.freq1Plants} planted, ${dd.freq1NonPlants} distractor); ${dd.plantsAtFreq1}/${dd.plantTotal} plants are themselves at frequency 1`);
    if (!ok) { console.log(`         FAIL: frequency==1 still perfectly separates planted from filler (zero distractor contamination) — the dedup exploit still works at this rung`); rungOk = false; }
  }

  // NEW: T5-gated subjects never appear before their own establishing session.
  {
    const results = t5GatingCheck(N, manifest);
    for (const r of results) {
      console.log(`  [${r.ok ? "OK " : "FAIL"}] t5-subject-gating (${r.chain}, "${r.subject}"): establishes at session ${r.establishSession}${r.ok ? ", no earlier mention" : ""}`);
      if (!r.ok) { console.log(`         FAIL: appears in earlier session(s): ${(r.leaks ?? []).join(", ") || r.detail}`); rungOk = false; }
    }
  }

  // NEW: every T3 chain's later plant carries no correction language.
  {
    const results = t3CorrectionLanguageCheck();
    for (const r of results) {
      console.log(`  [${r.ok ? "OK " : "FAIL"}] t3-no-correction-language (${r.chain}, ${r.plantId}): ${r.ok ? "clean" : `matched "${r.hit}"`}`);
      if (!r.ok) rungOk = false;
    }
  }

  console.log(`  rung ${N}: ${rungOk ? "ALL CHECKS PASS" : "FAILED — see above"}`);
  allOk = allOk && rungOk;
}

console.log(`\n${allOk ? "ALL RUNGS PASS" : "AT LEAST ONE RUNG FAILED"}`);
process.exit(allOk ? 0 : 1);
