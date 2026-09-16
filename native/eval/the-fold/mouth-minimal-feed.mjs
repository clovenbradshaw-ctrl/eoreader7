// mouth-minimal-feed.mjs — robust A/B: how little can the mouth be fed and
// still answer accurately, in the right voice?
//
// User direction, verbatim: "test how we feed the mouth the minimal amount
// possible to get it to respond accurately with the proper stylization
// (typically you need to talk to the mouth in the way you want the mouth to
// talk)" — then: "do robust a/b testing on different levels models and stuff".
//
// What is being tested: ONLY how the mouth is fed. The fold's own pipeline
// is not involved; this is a bare, controlled probe of the ONE call that
// pipeline would make, varying nothing between arms but the feeding, and
// repeating every cell so the comparison is a measurement and not a taste.
//
//   arms (feeding shapes, nothing else differs):
//     bare        — the question alone, no system prompt at all.
//     exemplar    — ONE exemplar of the desired voice as the whole system
//                   prompt ("talk to the mouth the way you want the mouth to
//                   talk"): a question and a plain, direct answer, shown
//                   rather than instructed.
//     currentFlat — the fold's own FLAT_EXECUTE_SYSTEM_PROMPT (holon.js).
//     currentChat — the fold's own CHAT_SYSTEM_PROMPT (holon.js).
//
//   models: a ladder of real local mouths, small to large (MOUTH= or
//   --models= overrides). Every model answers every cell.
//
//   trials: each (model, arm, question) cell is repeated `trials` times at a
//   sampling temperature, so a single lucky/unlucky draw cannot carry the
//   comparison. Outcomes are aggregated as rates, and arms are compared
//   PAIRED on the same trials with the exact binomial sign test (the
//   McNemar question on paired binary outcomes — a per-trial A/B, not two
//   independent samples), so "exemplar beats currentFlat" is a claim with a
//   p-value and not a difference of two percentages.
//
//   scoring (mechanical, never a model's judgment — reproducible):
//     accurate: the expected fact (folded, any of several forms) appears.
//     clean:    accurate AND zero stylization violations, where stylization
//               is the fold's own voice, stated in its own prompts ("reply
//               directly, briefly, and naturally, the way a person would —
//               not a summary of the question"): apparatus narration, a
//               meta framing, a bounced-back question, verbosity, or a
//               question-echo are each a violation.
//
//   INCREMENTAL AND RESUMABLE: outcomes are appended per model to
//   results/mouth-minimal-feed-outcomes.jsonl and the report is REGENERATED
//   after every model completes, so a partial run (or a run killed because a
//   slow model's per-call latency exploded) keeps everything already measured
//   and never loses it. A re-run with `--models=` skips models whose rows are
//   already on file; `--fresh` drops the file.
//
// run: node mouth-minimal-feed.mjs                (default ladder + trials)
//      node mouth-minimal-feed.mjs --models=gemma2:2b,llama3.2 --trials=5
//      MOUTH=qwen3:8b node mouth-minimal-feed.mjs --arms=exemplar,currentChat

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { call, stylization, accurate, signTest, sign, pct } from "./lib/mouth-common.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, "results");
const RESULTS_PATH = path.join(RESULTS_DIR, "mouth-minimal-feed-RESULTS.md");
const OUTCOMES_PATH = path.join(RESULTS_DIR, "mouth-minimal-feed-outcomes.jsonl");

// The production prompts under test come from the real source — holon.js,
// never a copy — so the "current*" arms measure what the fold actually feeds
// the mouth, not a restatement of it.
const { FLAT_EXECUTE_SYSTEM_PROMPT, CHAT_SYSTEM_PROMPT } = await import("../../../../the-fold/holon.js");

// The fold's own routing ladder is small instruct models only (model-routing
// / the sentence-witness note: gemma2:2b, llama3.2, phi3:mini, the 14b
// instruct as the hand-chosen top rung) — plus the tiny CPU mouth and a
// couple of the broader pulls, so "levels" spans 1.7B to 14B.
const DEFAULT_MODELS = [
  { name: "smollm2:1.7b", tier: "tiny" },
  { name: "phi3:mini", tier: "small" },
  { name: "gemma2:2b", tier: "small" },
  { name: "llama3.2", tier: "small" },
  { name: "olmo2:7b", tier: "mid" },
  { name: "qwen3:8b", tier: "mid" },
  { name: "qwen2.5:14b-instruct-q4_K_M", tier: "large" },
];

const QUESTIONS = [
  { q: "Who was Abraham Lincoln's first vice president?", expect: ["hannibal hamlin", "hannibal", "hamlin"] },
  { q: "Who was Franklin D. Roosevelt's first vice president?", expect: ["john nance garner", "garner"] },
  { q: "What US state is Nashville the capital of?", expect: ["tennessee"] },
  { q: "What is the capital of France?", expect: ["paris"] },
  { q: "Who wrote Pride and Prejudice?", expect: ["jane austen", "austen"] },
  { q: "How many continents are there on Earth?", expect: ["seven", " 7 ", "7 continents"] },
  { q: "What is the largest planet in our solar system?", expect: ["jupiter"] },
  { q: "Who was the first president of the United States?", expect: ["george washington", "washington"] },
  { q: "What gas do plants absorb from the air during photosynthesis?", expect: ["carbon dioxide", "co2", "co 2"] },
  { q: "Which ocean borders the west coast of the United States?", expect: ["pacific"] },
];

// The exemplar arm: ONE question-and-answer pair in the desired voice, the
// whole system prompt. Shown, never instructed — that is the principle under
// test. The voice is the fold's own (plain, direct, brief, no heading, no
// list, no restating the question).
const EXEMPLAR = [
  { role: "system", content: "Answer the question plainly and directly, in your own words, the way you'd tell a person. One or two sentences. No heading, no list, no restating the question.\n\nQuestion: What is the capital of Canada?\nAnswer: Ottawa." },
];

const ARMS = {
  bare: (q) => [{ role: "user", content: q }],
  exemplar: (q) => [...EXEMPLAR, { role: "user", content: q }],
  currentFlat: (q) => [{ role: "system", content: FLAT_EXECUTE_SYSTEM_PROMPT }, { role: "user", content: q }],
  currentChat: (q) => [{ role: "system", content: CHAT_SYSTEM_PROMPT }, { role: "user", content: q }],
};

// ── the one call ────────────────────────────────────────────────────────────
const SAMPLING_TEMPERATURE = 0.7; // > 0 so trials are draws, not one answer repeated

// ── persistence ─────────────────────────────────────────────────────────────
// One JSONL row per (model, arm): the per-trial outcomes. The report is
// regenerated from the file after every model completes, so a run killed by
// a slow model's latency never loses what was already measured.
function loadOutcomes() {
  const map = {};
  if (!existsSync(OUTCOMES_PATH)) return map;
  for (const line of readFileSync(OUTCOMES_PATH, "utf8").split("\n").filter(Boolean)) {
    const row = JSON.parse(line);
    map[row.model] ??= {};
    map[row.model][row.arm] = row.trials;
  }
  return map;
}
function saveOutcomes(model, arm, trials) {
  writeFileSync(OUTCOMES_PATH, JSON.stringify({ model, arm, trials }) + "\n", { flag: "a" });
}

// ── the run ────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k, d) => { const m = args.find((a) => a.startsWith(`--${k}=`)); return m ? m.split("=").slice(1).join("=") : d; };
  const models = get("models", "") ? get("models", "").split(",").map((s) => s.trim()).filter(Boolean) : null;
  const arms = get("arms", "") ? get("arms", "").split(",").map((s) => s.trim()).filter(Boolean) : Object.keys(ARMS);
  const trials = Number(get("trials", "3")) || 3;
  const fresh = args.includes("--fresh");
  return { models, arms, trials, fresh };
}

async function run() {
  const { models, arms, trials, fresh } = parseArgs();
  if (fresh && existsSync(OUTCOMES_PATH)) writeFileSync(OUTCOMES_PATH, "");
  const stored = loadOutcomes();
  const ladder = models ? models.map((m) => ({ name: m, tier: "?" })) : DEFAULT_MODELS;
  const armNames = arms.filter((a) => ARMS[a]);
  if (!armNames.length) { console.error("no valid --arms="); process.exit(1); }
  console.log(`A/B · arms [${armNames.join(", ")}] · trials ${trials}/cell · temp ${SAMPLING_TEMPERATURE} · resumable`);
  console.log(`models: ${ladder.map((m) => m.name).join(" · ")}\n`);

  // outcomes[model][arm] = array of {accurate, clean, violations} one per trial
  const outcomes = {};
  for (const m of ladder) {
    outcomes[m.name] = {};
    for (const arm of armNames) {
      outcomes[m.name][arm] = stored[m.name]?.[arm] ?? [];
    }
  }
  const done = new Set(Object.keys(stored));

  for (const m of ladder) {
    if (done.has(m.name) && armNames.every((a) => (stored[m.name]?.[a] ?? []).length >= trials)) {
      console.log(`  ${m.name.padEnd(26)} (already on file, skipped)`);
      continue;
    }
    for (const arm of armNames) {
      if ((stored[m.name]?.[arm] ?? []).length >= trials) continue;
      const freshTrials = [];
      for (const q of QUESTIONS) {
        for (let t = 0; t < trials; t++) {
          const answer = await call(m.name, ARMS[arm](q.q), { temperature: SAMPLING_TEMPERATURE });
          const ok = accurate(q, answer);
          const s = stylization(q.q, answer);
          freshTrials.push({ accurate: ok, clean: ok && s.violations.length === 0, violations: s.violations });
        }
      }
      outcomes[m.name][arm] = [...(stored[m.name]?.[arm] ?? []), ...freshTrials];
      saveOutcomes(m.name, arm, freshTrials);
    }
    const fmt = armNames.map((a) => `${a} ${pct(outcomes[m.name][a], "clean")}/${pct(outcomes[m.name][a], "accurate")}`).join("  ");
    console.log(`  ${m.name.padEnd(26)} ${fmt}`);
    writeReport(ladder, armNames, outcomes, trials);
  }

  // ── sample answers (one-shot, once) ───────────────────────────────────────
  writeReport(ladder, armNames, outcomes, trials);
  const sampleModel = ladder.some((m) => m.name === "gemma2:2b") ? "gemma2:2b" : ladder[0].name;
  const lines = readFileSync(RESULTS_PATH, "utf8").split("\n");
  lines.push(`## Sample answers (gemma2:2b, 3 questions)`);
  lines.push("");
  for (const q of QUESTIONS.slice(0, 3)) {
    lines.push(`**Q:** ${q.q}`);
    for (const arm of armNames) {
      const answer = await call(sampleModel, ARMS[arm](q.q), { temperature: SAMPLING_TEMPERATURE });
      const ok = accurate(q, answer);
      const s = stylization(q.q, answer);
      lines.push(`- ${arm}: ${ok ? "✓" : "✗"} "${answer.trim().slice(0, 120)}"${s.violations.length ? ` [${s.violations.join(",")}]` : ""}`);
    }
    lines.push("");
  }
  writeFileSync(RESULTS_PATH, lines.join("\n") + "\n");
  console.log(`\nwrote ${RESULTS_PATH}`);

  const pooled = {};
  for (const a of armNames) pooled[a] = [];
  for (const m of ladder) for (const a of armNames) pooled[a].push(...(outcomes[m.name]?.[a] ?? []));
  console.log(`pooled clean: ${armNames.map((o) => `${o} ${pct(pooled[o], "clean")}`).join("  ")}`);
  console.log(`pooled accurate: ${armNames.map((o) => `${o} ${pct(pooled[o], "accurate")}`).join("  ")}`);
}

function writeReport(ladder, armNames, outcomes, trials) {
  const lines = [];
  const W = (s = "") => lines.push(s);
  W(`# mouth-minimal-feed — how little can the mouth be fed`);
  W();
  W(`*${new Date().toISOString()} · ${armNames.length} arms × ${ladder.filter((m) => outcomes[m.name]).length}/${ladder.length} models complete × ${QUESTIONS.length} questions × ${trials} trials/cell @ temp ${SAMPLING_TEMPERATURE}.*`);
  W();
  W(`The user's own question: "test how we feed the mouth the minimal amount possible to get it to respond accurately with the proper stylization (typically you need to talk to the mouth in the way you want the mouth to talk)." Arms vary ONLY the feeding of one call — the fold's pipeline is not involved. **clean** = accurate AND no stylization violation (apparatus/framing/bounce/verbose/restate — the fold's own voice, scored mechanically). Paired comparisons are the exact binomial sign test on the same trials.`);
  W();
  W(`## Per model — clean / accurate`);
  W();
  W(`| model | ${armNames.map((a) => `${a} clean`).join(" | ")} | ${armNames.map((a) => `${a} acc`).join(" | ")} |`);
  W(`|-------|${armNames.map(() => "---").join("|")}|${armNames.map(() => "---").join("|")}|`);
  for (const m of ladder) {
    if (!outcomes[m.name]) continue;
    W(`| ${m.name} | ${armNames.map((a) => pct(outcomes[m.name][a], "clean")).join(" | ")} | ${armNames.map((a) => pct(outcomes[m.name][a], "accurate")).join(" | ")} |`);
  }
  W();
  const doneModels = ladder.filter((m) => outcomes[m.name]);
  const pooled = {};
  for (const a of armNames) pooled[a] = [];
  for (const m of doneModels) for (const a of armNames) pooled[a].push(...(outcomes[m.name][a] ?? []));
  W(`## Pairwise, pooled across all models and trials — is arm A better than arm B (paired sign test)?`);
  W();
  W(`| A | B | A clean | B clean | A>B (trials) | B>A (trials) | p |`);
  W(`|---|----|--------|---------|-----|-----|-----|`);
  const pairs = [];
  for (let i = 0; i < armNames.length; i++) for (let j = i + 1; j < armNames.length; j++) pairs.push([armNames[i], armNames[j]]);
  for (const [a, b] of pairs) {
    const t = signTest(pooled[a].map((x) => x.clean), pooled[b].map((x) => x.clean));
    W(`| ${a} | ${b} | ${pct(pooled[a], "clean")} | ${pct(pooled[b], "clean")} | ${t.c} | ${t.b} | ${t.p}${sign(t.p)} |`);
  }
  W();
  W(`Reading the sign test: the column "A>B" counts trials where A was clean and B was not; "B>A" the reverse. A p<0.05 means the asymmetry is not chance.`);
  W();
  W(`## Verdict per tier`);
  W();
  const tiers = [...new Set(doneModels.map((m) => m.tier))];
  for (const tier of tiers) {
    const modelsInTier = doneModels.filter((m) => m.tier === tier).map((m) => m.name);
    const best = armNames.map((a) => ({ arm: a, clean: modelsInTier.reduce((s, m) => s + outcomes[m][a].filter((x) => x.clean).length, 0), total: modelsInTier.reduce((s, m) => s + outcomes[m][a].length, 0) }));
    best.sort((x, y) => y.clean - x.clean);
    W(`- **${tier}** (${modelsInTier.join(", ")}): best arm by clean — **${best[0].arm}** (${best[0].clean}/${best[0].total})${best.length > 1 ? `, then ${best.slice(1).map((b) => `${b.arm} (${b.clean}/${b.total})`).join(", ")}` : ""}`);
  }
  W();
  W(`## The A/B that matters: does the MINIMAL exemplar feeding match the fold's own production prompts on stylization?`);
  W();
  if (armNames.includes("exemplar") && armNames.includes("currentChat")) {
    const t = signTest(pooled["exemplar"].map((x) => x.clean), pooled["currentChat"].map((x) => x.clean));
    W(`exemplar ${pct(pooled.exemplar, "clean")} clean vs currentChat ${pct(pooled.currentChat, "clean")} clean — p = ${t.p}${sign(t.p)}. ${t.better === "B" ? "currentChat" : t.better === "A" ? "exemplar" : "neither"} leads.`);
  }
  W();
  writeFileSync(RESULTS_PATH, lines.join("\n") + "\n");
}

mkdirSync(RESULTS_DIR, { recursive: true });
run().catch((err) => { console.error(err); process.exit(1); });