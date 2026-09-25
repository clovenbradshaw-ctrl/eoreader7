// score.mjs — mechanical scorer for "the Long Project" battery. No model
// judge anywhere (this repo's standing posture: "scored with no model" —
// native/eval/the-fold/frontier-token-recall.mjs's own header, "recall is
// mechanical — normalized atom substrings, never a model judge"). Grades one
// answer set against questions.json's declared acceptance rules, and — given
// two answer sets over the SAME rung and question ids — runs the paired
// comparison PREREGISTRATION.md commits to: McNemar's exact test on
// per-question correct/incorrect outcomes, alpha 0.05. That alpha is not
// chosen here; it is this project's own standing convention, cited from
// native/kernel/network-standing.js's header ("host/population.js::LINK_SPEC's
// own convention — draws 199, alpha 0.05 — the certified consumer's cut,
// cited not re-derived"), the same number native/assemblies.js and every
// other caller of that module cites rather than re-picks.
//
//   node score.mjs --rung 12 --answers answers.json [--label unaided]
//   node score.mjs --rung 12 --answers a.json --label-a unaided \
//                             --answers-b b.json --label-b with_eoreader7
//
// An answer set is JSON: { "<questionId>": "free-text answer", ... } for
// SOME OR ALL of questions.json's 26 ids — questions the set omits are
// scored as incorrect (a subject that declines to answer has not answered).
//
// WHAT THIS DOES NOT DO: it does not run either arm and it does not
// interpret WHY an answer is right or wrong beyond the declared patterns —
// see questions.json's per-question `note` fields for the acceptance
// rule's own disclosed limitations (T4-2 in particular).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ALPHA = 0.05; // network-standing.js's LINK_SPEC convention, cited not re-derived (see header)

const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const asJson = args.includes("--json");
const RUNG = Number(flag("rung", ""));
const ANSWERS_A = flag("answers", flag("answers-a", null));
const ANSWERS_B = flag("answers-b", null);
const LABEL_A = flag("label-a", flag("label", "arm-a"));
const LABEL_B = flag("label-b", "arm-b");

if (!RUNG || !ANSWERS_A) {
  console.error("usage: node score.mjs --rung <12|60|300> --answers <file.json> [--answers-b <file.json> --label-a X --label-b Y]");
  process.exit(2);
}

const QUESTIONS = JSON.parse(readFileSync(join(HERE, "questions.json"), "utf8")).questions;
const manifestPath = join(HERE, "corpus", `rung-${RUNG}`, "manifest.json");
let manifest = null;
try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); }
catch { console.error(`no manifest at ${manifestPath} — run generate-corpus.mjs first`); process.exit(2); }

console.log(`the-long-project scorer`);
console.log(`  rung: ${RUNG}  ·  questions: ${QUESTIONS.length}  ·  alpha: ${ALPHA} (network-standing.js LINK_SPEC convention)`);
console.log(`  arm A: ${LABEL_A} <- ${ANSWERS_A}${ANSWERS_B ? `\n  arm B: ${LABEL_B} <- ${ANSWERS_B}` : ""}`);

// ── normalization: same discipline as frontier-token-recall.mjs's scoreRecall
// (lowercase, non-alphanumeric -> space, collapse) — with two additions,
// both from the validity audit (2026-09-22, a 26/26 independently-written
// natural-phrasing gold set scored 16/26 against the original markers):
//   1. digit-grouping commas ("10,000") are removed BEFORE that pass so
//      "10,000" and "10000" normalize identically, in both the answer and
//      every pattern.
//   2. apostrophes (straight and curly) are removed, not turned into a
//      space, BEFORE that pass — so "can't"/"cant", "doesn't"/"doesnt",
//      "isn't"/"isnt" all normalize to the SAME token regardless of which
//      spelling a marker or an answer happens to use. Turning them into a
//      space instead (what the plain non-alnum pass below would otherwise
//      do) splits a contraction into two tokens ("can t") that then fails
//      to match the un-contracted marker phrase at all — the actual, small,
//      mechanical cause behind several of the audit's false negatives. ──
const norm = (s) => String(s ?? "")
  .replace(/(\d),(\d)/g, "$1$2")
  .replace(/[’']/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();
// An alt is used as a case-insensitive REGEX against the raw answer when it
// contains a regex metacharacter, else as a normalized substring — same
// discipline `forbiddenAny` already used below, now shared by required
// groups too (validity audit: several required phrases, e.g. t1d's
// "concurrency set to 8", are rigid fixed-adjacency substrings that a
// natural "concurrency is currently set to 8" cannot satisfy; a regex alt
// with a bounded gap, e.g. "concurrency[^.\\n]{0,30}\\b8\\b", tolerates the
// inserted words a substring check cannot).
const isRegexAlt = (a) => /[\\^$.|?*+()[\]{}]/.test(a);
const hasAny = (normText, rawText, alts) => alts.some((a) => isRegexAlt(a)
  ? (() => { try { return new RegExp(a, "i").test(rawText); } catch { return false; } })()
  : normText.includes(norm(a)));
const hasAll = (normText, rawText, groups) => groups.every((g) => hasAny(normText, rawText, g));
const regexAny = (rawText, patterns) => patterns.some((p) => { try { return new RegExp(p, "i").test(rawText); } catch { return false; } });

// ── shared marker groups (declared once, reused by every question of that
// mode — questions.json carries only the fact-specific tokens). Broadened
// 2026-09-22 (validity audit): the original ~20-30 entries per list read as
// ledger/engine boilerplate and missed ordinary phrasing wholesale — e.g.
// "I can't find any SLA uptime figure anywhere" matched none of the original
// SILENCE_MARKERS. Widened to cover common ways of saying "I looked and it
// is not there" / "these two disagree" / "this has stayed the same" in
// plain English, not just this project's own house phrasing — the audit's
// own warning is that a NARROW marker vocabulary that happens to resemble
// eoreader7's context-block phrasing risks the with-eoreader7 arm winning on
// wording overlap rather than genuine reading; a broad, generic vocabulary
// is the mitigation, not a cure (still disclosed in PREREGISTRATION.md). ──
const SILENCE_MARKERS = [
  "not stated", "does not state", "doesnt state", "not mentioned", "not given",
  "not specified", "not disclosed", "no record", "not found in the record",
  "does not say", "doesnt say", "not documented", "never states", "never mentions",
  "never says", "the record does not", "cannot be determined", "not available in",
  "isnt stated", "isnt given", "isnt specified", "not answered", "no answer",
  "cant find", "cannot find", "couldnt find", "unable to find", "did not find",
  "didnt find", "no mention", "no info", "nowhere in the record", "not in the record",
  "not present in the record", "isnt documented", "isnt disclosed", "wasnt stated",
  "wasnt given", "wasnt specified", "wasnt disclosed", "no indication", "not indicated",
  "wasnt found", "not found", "wasnt mentioned", "wasnt documented", "nothing in the record",
  "no session states", "no session mentions", "not part of the record", "doesnt appear",
  "does not appear", "not addressed", "left unanswered", "unanswered", "no data on",
  "silent on", "record is silent", "not clear from the record", "unclear from the record",
  "not sure", "unclear", "not clear", "nothing i found", "havent found", "have not found",
  "not able to find", "no such", "absent from the record", "no evidence", "not evident",
  "isnt anywhere", "not anywhere", "not once", "at no point", "not once stated",
  // Two general, regex-shaped fallbacks (round 2, 2026-09-22 — a first
  // independently-written gold-set pass still missed ALL FIVE T4 answers,
  // e.g. "no actual figure ever gets written down" and "no ... anywhere in
  // these sessions" matched none of the literal phrases above): a negator
  // within reach of a saying/finding/recording verb, either order. Bounded
  // to a clause (.;,\n) so it does not reach into an unrelated later clause.
  "\\b(?:not|never|no|nowhere|nothing|none|isnt|doesnt|didnt|cant|cannot|couldnt|wasnt|arent)\\b[^.;,\\n]{0,45}\\b(?:stat(?:e|es|ed|ing)|mention(?:s|ed|ing)?|say[s]?|said|specif(?:y|ies|ied|ying)|disclos(?:e|es|ed|ing)|document(?:s|ed|ing)?|given?|find|finds|found|finding|written|writes|record(?:s|ed|ing)?|indicat(?:e|es|ed|ing)|answer(?:s|ed|ing)?|address(?:es|ed|ing)?|appear(?:s|ed|ing)?|show(?:s|n|ing)?|list(?:s|ed|ing)?)\\b",
  "\\b(?:stat(?:e|es|ed)|mention(?:s|ed)?|specif(?:y|ies|ied)|disclos(?:e|es|ed)|document(?:s|ed)?|given?|found|written|record(?:s|ed)?|indicat(?:e|es|ed)|answer(?:s|ed)?|address(?:es|ed)?|appear(?:s|ed)?|show(?:s|n|ing)?)\\b[^.;,\\n]{0,20}\\b(?:not|never|nowhere|anywhere)\\b",
];
const CONFLICT_MARKERS = [
  "conflict", "contradict", "disagree", "inconsistent", "two different",
  "unresolved", "at odds", "both are stated", "both sessions", "clash",
  "differ", "differing", "mismatch", "mismatched", "not consistent",
  "inconsistency", "two conflicting", "conflicting accounts", "conflicting reports",
  "contradictory", "dont match", "does not match", "doesnt match", "no agreement",
  "disagreement", "one session says", "one says", "another says", "elsewhere it says",
  "cant both be right", "cannot both be right", "two different answers", "two accounts",
  "not reconciled", "never reconciled", "not resolved", "never resolved",
  "dont agree", "doesnt agree", "do not agree", "does not agree", "didnt agree",
  "never agreed", "muddled", "at variance", "doesnt line up", "does not line up",
  "\\b(?:nothing|never|not|no session|nobody)\\b[^.;,\\n]{0,20}\\breconcil",
  "\\b(?:nothing|never|not)\\b[^.;,\\n]{0,20}\\bresolv",
];
const NO_CHANGE_MARKERS = [
  "never changed", "no change", "unchanged", "hasnt changed", "has not changed",
  "stayed the same", "stays the same", "same as always", "consistent", "not changed",
  "hasnt moved", "has not moved", "remains", "remained the same", "still is",
  "still stands", "kept at", "held steady", "no revision", "never revised",
  "not revised", "no revisions", "steady", "static", "no updates", "still set to",
  "continues to be", "hasnt budged", "has not budged", "no changes", "same as it",
  "as it has always been", "as always", "same as its always been",
  "stayed put", "stays put", "never budged", "hasnt shifted", "has not shifted",
  "never moved", "been the same", "has been the same", "whole time", "the whole way through",
];
const CHANGE_ASSERTIONS = [
  "was raised", "was lowered", "increased to", "decreased to", "changed to",
  "updated to", "was changed", "has changed", "raised from", "lowered to", "revised to",
];

function grade(q, answerRaw) {
  const answer = answerRaw ?? "";
  const n = norm(answer);
  const reasons = [];
  if (!answer.trim()) return { correct: false, reasons: ["no answer given"] };

  let requiredGroups = q.accept.requiredGroups ?? [];
  let forbidden = q.accept.forbiddenAny ?? [];

  if (q.accept.mode === "silence") requiredGroups = [...requiredGroups, SILENCE_MARKERS];
  if (q.accept.mode === "conflict") requiredGroups = [...requiredGroups, CONFLICT_MARKERS];
  if (q.accept.mode === "restatement") { requiredGroups = [...requiredGroups, NO_CHANGE_MARKERS]; forbidden = [...forbidden, ...CHANGE_ASSERTIONS]; }
  if (q.accept.mode === "provenance") {
    const sessionNum = manifest.events[q.accept.establishEvent];
    if (sessionNum == null) return { correct: false, reasons: [`establishEvent ${q.accept.establishEvent} not in this rung's manifest — scorer/corpus mismatch`] };
    // Accept any plausible way of naming the integer: "session 7", "007",
    // "#7", "the 7th session" — matched as the bare integer token, robust to
    // zero-padding and phrasing, not to a phrase match.
    const padded = String(sessionNum).padStart(3, "0");
    const nums = (n.match(/\d+/g) ?? []).map((x) => Number(x));
    const hit = nums.includes(sessionNum) || n.includes(padded);
    if (!hit) reasons.push(`no session number matching ${sessionNum} (or ${padded}) found in the answer`);
    return { correct: hit, reasons: hit ? [] : reasons, expectedSession: sessionNum };
  }

  for (const g of requiredGroups) if (!hasAny(n, answer, g)) reasons.push(`missing required: ${g[0]}${g.length > 1 ? ` (or ${g.length - 1} alt.)` : ""}`);
  const forbiddenHit = forbidden.find((p) => {
    // A forbidden entry with regex metacharacters is used as a regex
    // (case-insensitive) against the RAW answer; a plain phrase is used as a
    // normalized substring, same discipline as required groups.
    if (/[\\^$.|?*+()[\]{}]/.test(p)) return regexAny(answer, [p]);
    return n.includes(norm(p));
  });
  if (forbiddenHit) reasons.push(`forbidden pattern matched: ${forbiddenHit}`);

  const correct = reasons.length === 0;
  return { correct, reasons };
}

function scoreSet(answers) {
  const rows = QUESTIONS.map((q) => ({ id: q.id, type: q.type, ...grade(q, answers[q.id]) }));
  const byType = {};
  for (const r of rows) { (byType[r.type] ??= { correct: 0, of: 0 }).of++; if (r.correct) byType[r.type].correct++; }
  const correct = rows.filter((r) => r.correct).length;
  return { rows, byType, correct, of: rows.length, accuracy: correct / rows.length };
}

// ── McNemar's exact test (two-sided, binomial) — draws no dependency; a
// direct sum of exact binomial(n, i) terms is exact for n <= 26 questions. ──
function choose(n, k) { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; }
function mcnemarExact(b, c, alpha) {
  const n = b + c;
  if (n === 0) return { n, b, c, p: 1, significant: false, alpha, detail: "no discordant pairs — the two arms agreed on every question" };
  const k = Math.min(b, c);
  let sum = 0;
  for (let i = 0; i <= k; i++) sum += choose(n, i);
  const p = Math.min(1, 2 * sum * Math.pow(0.5, n));
  return { n, b, c, p, significant: p < alpha, alpha };
}

const answersA = JSON.parse(readFileSync(ANSWERS_A, "utf8"));
const resultA = scoreSet(answersA);

function printSet(label, result) {
  console.log(`\n── ${label}: ${result.correct}/${result.of} (${(result.accuracy * 100).toFixed(1)}%) ──`);
  for (const r of result.rows) {
    console.log(`  [${r.correct ? "OK " : "ERR"}] ${r.id.padEnd(6)} ${r.type}  ${r.correct ? "" : r.reasons.join("; ")}`);
  }
  console.log(`  by type: ${Object.entries(result.byType).map(([t, v]) => `${t}=${v.correct}/${v.of}`).join("  ")}`);
}
printSet(LABEL_A, resultA);

let out = { rung: RUNG, alpha: ALPHA, a: { label: LABEL_A, file: ANSWERS_A, ...resultA } };

if (ANSWERS_B) {
  const answersB = JSON.parse(readFileSync(ANSWERS_B, "utf8"));
  const resultB = scoreSet(answersB);
  printSet(LABEL_B, resultB);

  // Paired outcomes, same question id in both.
  const byId = new Map(resultA.rows.map((r) => [r.id, r]));
  let b = 0, c = 0; // b: A right, B wrong · c: A wrong, B right
  const paired = [];
  for (const rb of resultB.rows) {
    const ra = byId.get(rb.id);
    if (!ra) continue;
    if (ra.correct && !rb.correct) b++;
    if (!ra.correct && rb.correct) c++;
    paired.push({ id: rb.id, type: rb.type, [LABEL_A]: ra.correct, [LABEL_B]: rb.correct });
  }
  const mcnemar = mcnemarExact(b, c, ALPHA);
  console.log(`\n── paired comparison (McNemar's exact test, alpha ${ALPHA}) ──`);
  console.log(`  ${LABEL_A} right / ${LABEL_B} wrong: ${b}   ·   ${LABEL_A} wrong / ${LABEL_B} right: ${c}   ·   discordant n=${mcnemar.n}`);
  console.log(`  p = ${mcnemar.p.toFixed(4)}  ->  ${mcnemar.significant ? `SIGNIFICANT at alpha ${ALPHA}` : `not significant at alpha ${ALPHA}`}`);
  if (mcnemar.n === 0) console.log(`  (the two arms agreed on every question this rung — no test to run)`);

  // Full accuracy curve per type, both arms, this rung.
  console.log(`\n  per-type accuracy, rung ${RUNG}:`);
  const types = [...new Set(QUESTIONS.map((q) => q.type))];
  for (const t of types) {
    const av = resultA.byType[t] ?? { correct: 0, of: 0 };
    const bv = resultB.byType[t] ?? { correct: 0, of: 0 };
    console.log(`    ${t}: ${LABEL_A}=${av.correct}/${av.of}  ${LABEL_B}=${bv.correct}/${bv.of}`);
  }

  out = { ...out, b: { label: LABEL_B, file: ANSWERS_B, ...resultB }, paired, mcnemar };
}

mkdirSync(join(HERE, "results"), { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outPath = join(HERE, "results", `score-rung${RUNG}-${stamp}.json`);
writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`\nwrote ${outPath}`);
if (asJson) console.log(JSON.stringify(out, null, 1));
