// mouth-model-swap.mjs — value of swapping the mouth WHILE RUNNING: faster
// vs larger models per TYPE of prompt.
//
// User direction, verbatim: "see if there's any value added swapping while
// running, using faster vs larger models per type of prompt".
//
// The fold already routes per kind (model-routing.js): SUMMARY/FLAT go to
// the fastest rung, DEEP work spends the user's chosen (larger) model. That
// reservation is a standing decision; this eval measures whether it is
// justified — for each prompt TYPE, does the larger model beat the fast one
// by a margin that earns the swap, or does the fast model carry the type?
//
//   types: fact (one-answer factual), reasoning (multi-step logic),
//          instruction (follow-a-directive, structure checkable),
//          summarize (compress given text), opinion (subjective — quality is
//          stylization only).
//   models: fast = gemma2:2b (the fold's fastest rung), mid = llama3.2,
//           large = qwen2.5:14b-instruct-q4_K_M (the fold's DEEP rung).
//   feeding: the fold's own conversation prompt (currentChat) for every
//           type — the production voice — so only the MODEL differs, never
//           the feeding.
//   trials: 3 per (type, model, question) at temp 0.7, paired on the SAME
//           trials, exact binomial sign test.
//
// run: node mouth-model-swap.mjs
//      node mouth-model-swap.mjs --models=gemma2:2b,qwen2.5:14b-instruct-q4_K_M --trials=5

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { call, stylization, accurate, signTest, sign, pct, feedArm, fold } from "./lib/mouth-common.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, "results");
const RESULTS_PATH = path.join(RESULTS_DIR, "mouth-model-swap-RESULTS.md");

const DEFAULT_MODELS = [
  { name: "gemma2:2b", tier: "fast" },
  { name: "llama3.2", tier: "mid" },
  { name: "qwen2.5:14b-instruct-q4_K_M", tier: "large" },
];

// One question set per type. `expect` is checked with the same mechanical
// containment as the one-shot eval, plus per-question flags:
//   all:      every expected form must appear
//   order:    the expected forms must appear in order (planet list, sort)
//   atLeast:  at least N of the expected forms must appear (synonyms)
// `opinion` questions carry no expect: there is no fact to be right about,
// so their quality IS stylization (clean).
const TYPES = {
  fact: {
    feed: (q) => q.q,
    questions: [
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
    ],
  },
  reasoning: {
    feed: (q) => q.q,
    questions: [
      { q: "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?", expect: ["0.05", "5 cents", "five cents"] },
      { q: "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?", expect: ["5 minutes", "5 min"] },
      { q: "Alice is taller than Bob, and Carol is taller than Alice. Who is the tallest?", expect: ["carol"] },
      { q: "A train travels 120 miles in 2 hours. What is its average speed?", expect: ["60"] },
      { q: "What is the next number in the sequence 2, 6, 12, 20, 30, ?", expect: ["42"] },
      { q: "John's mother has three children. Two are named April and May. What is the third child's name?", expect: ["john"] },
      { q: "Which is larger: 3/7 or 2/5?", expect: ["3/7"] },
      { q: "All bloops are razzles. All razzles are crozzles. Are all bloops crozzles?", expect: ["yes"] },
      { q: "A rectangle has length 8 and width 3. What is its area?", expect: ["24"] },
      { q: "You have 3 apples, give away 1, buy 4 more, then eat 2. How many apples do you have?", expect: ["4"] },
    ],
  },
  instruction: {
    feed: (q) => q.q,
    questions: [
      { q: "List the planets in order from the Sun.", expect: ["mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"], all: true, order: true },
      { q: "Count the letters in the word 'encyclopedia'.", expect: ["12"] },
      { q: "Repeat the following number back exactly: 7,293,184", expect: ["7293184"] },
      { q: "Which of these is not a prime number: 2, 9, 17, 23?", expect: ["9"] },
      { q: "Sort these numbers from smallest to largest: 12, 3, 9, 1, 7.", expect: ["1", "3", "7", "9", "12"], order: true },
      { q: "If you reverse the word 'desserts', what do you get?", expect: ["stressed"] },
      { q: "Write one short sentence that contains the word 'holograph'.", expect: ["holograph"] },
      { q: "Give me three synonyms for 'quick'.", expect: ["fast", "rapid", "swift", "speedy", "hasty"], atLeast: 3 },
      { q: "What is the 5th letter of the alphabet?", expect: ["e"] },
      { q: "How many sides does a hexagon have?", expect: ["6", "six"] },
    ],
  },
  summarize: {
    // the material IS the question for a summary — one message, same shape.
    feed: (q) => q.q,
    questions: [
      { q: "In one sentence, what is the main point? The capital of Argentina is Buenos Aires, a city founded twice. Its first founding, in 1536, failed; the city was refounded in 1580.", expect: ["buenos aires"] },
      { q: "In one sentence, what is the main point? Photosynthesis is the process by which green plants use sunlight to turn carbon dioxide and water into glucose and oxygen.", expect: ["sunlight", "carbon dioxide"], all: true },
      { q: "In one sentence, what is the main point? The Nile is generally considered the longest river in the world, flowing over 6,650 kilometers through northeastern Africa.", expect: ["nile", "longest"], all: true },
      { q: "In one sentence, what is the main point? Elephants are the largest living land animals, and their trunks can lift more than 200 kilograms.", expect: ["largest", "land"], all: true },
      { q: "In one sentence, what is the main point? The Amazon rainforest produces about 20 percent of the oxygen in Earth's atmosphere.", expect: ["amazon", "20"], all: true },
    ],
  },
  opinion: {
    feed: (q) => q.q,
    questions: [
      { q: "Cats or dogs — which do you prefer?" },
      { q: "What's a good book for someone who likes mysteries?" },
      { q: "Should I take the train or drive for a 300-mile trip?" },
      { q: "What's the best way for a beginner to start learning to code?" },
      { q: "Coffee or tea?" },
    ],
  },
};

// A question's expected facts may appear in order (planet list, sort) or all
// together (summary) or k-of-n (synonyms); default is any-one.
export function matches(question, answer) {
  const a = fold(String(answer ?? ""));
  if (!question.expect?.length) return true; // opinion: no fact to be right about
  const hits = question.expect.map((e) => a.includes(fold(e).trim()));
  if (question.all || question.order) return hits.every(Boolean);
  if (question.atLeast) return hits.filter(Boolean).length >= question.atLeast;
  return hits.some(Boolean);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k, d) => { const m = args.find((a) => a.startsWith(`--${k}=`)); return m ? m.split("=").slice(1).join("=") : d; };
  const models = get("models", "") ? get("models", "").split(",").map((s) => s.trim()).filter(Boolean) : null;
  const trials = Number(get("trials", "3")) || 3;
  return { models, trials };
}

async function run() {
  const { models, trials } = parseArgs();
  const ladder = models ? models.map((m) => ({ name: m, tier: "?" })) : DEFAULT_MODELS;
  const typeNames = Object.keys(TYPES);
  const temp = 0.7;
  console.log(`A/B swap · types [${typeNames.join(", ")}] · models [${ladder.map((m) => m.name).join(", ")}] · trials ${trials} @ temp ${temp}\n`);

  // quality per (type, model): one outcome {accurate, clean, quality} per trial
  const outcomes = {};
  for (const t of typeNames) {
    outcomes[t] = {};
    for (const m of ladder) outcomes[t][m.name] = [];
  }

  for (const type of typeNames) {
    for (const m of ladder) {
      for (const q of TYPES[type].questions) {
        const messages = feedArm("currentChat", TYPES[type].feed(q));
        for (let t = 0; t < trials; t++) {
          const answer = await call(m.name, messages, { temperature: temp });
          const ok = matches(q, answer);
          const s = stylization(q.q, answer);
          const clean = ok && s.violations.length === 0;
          outcomes[type][m.name].push({ accurate: ok, clean, quality: ok && clean });
        }
      }
    }
    const fmt = ladder.map((m) => `${m.name.split(":")[0]} ${pct(outcomes[type][m.name], "quality")}`).join("  ");
    console.log(`  ${type.padEnd(12)} ${fmt}`);
  }

  // ── report ────────────────────────────────────────────────────────────────
  const lines = [];
  const W = (s = "") => lines.push(s);
  W(`# mouth-model-swap — value of swapping the mouth while running`);
  W();
  W(`*${new Date().toISOString()} · types [${typeNames.join(", ")}] × models [${ladder.map((m) => m.name).join(", ")}] × ${trials} trials/question @ temp ${temp} · feeding = the fold's own conversation prompt (currentChat) for every type, so only the model differs.*`);
  W();
  W(`The question: does a LARGER model earn the swap on a given prompt type, or does the FAST model carry it? **quality** = accurate AND clean (stylization; opinion types have no fact to check, so quality is stylization alone). Paired comparison = exact binomial sign test on the same trials.`);
  W();
  W(`## quality per type × model`);
  W();
  W(`| type | ${ladder.map((m) => `${m.name.split(":")[0]} quality`).join(" | ")} | ${ladder.map((m) => `${m.name.split(":")[0]} acc`).join(" | ")} |`);
  W(`|------|${ladder.map(() => "---").join("|")}|${ladder.map(() => "---").join("|")}|`);
  for (const type of typeNames) {
    W(`| ${type} | ${ladder.map((m) => pct(outcomes[type][m.name], "quality")).join(" | ")} | ${ladder.map((m) => pct(outcomes[type][m.name], "accurate")).join(" | ")} |`);
  }
  W();
  W(`## does large beat fast? — paired, per type (quality)`);
  W();
  const fast = ladder.find((m) => m.tier === "fast") ?? ladder[0];
  const large = ladder.find((m) => m.tier === "large") ?? ladder[ladder.length - 1];
  W(`| type | ${fast.name.split(":")[0]} quality | ${large.name.split(":")[0]} quality | large>fast | fast>large | p |`);
  W(`|------|--------|---------|-----|-----|-----|`);
  for (const type of typeNames) {
    const t = signTest(outcomes[type][fast.name].map((x) => x.quality), outcomes[type][large.name].map((x) => x.quality));
    W(`| ${type} | ${pct(outcomes[type][fast.name], "quality")} | ${pct(outcomes[type][large.name], "quality")} | ${t.b} | ${t.c} | ${t.p}${sign(t.p)} |`);
  }
  W();
  W(`Reading: "large>fast" counts trials where large was clean-and-right and fast was not; "fast>large" the reverse. p<0.05 means the gap is real on this material. Where p stays high, the FAST model carries the type — swapping to large spends tokens for no measurable gain.`);
  W();
  const justifies = [];
  const suffices = [];
  for (const type of typeNames) {
    const t = signTest(outcomes[type][fast.name].map((x) => x.quality), outcomes[type][large.name].map((x) => x.quality));
    const largeQ = pct(outcomes[type][large.name], "quality");
    const fastQ = pct(outcomes[type][fast.name], "quality");
    if (t.p < 0.05 && t.better === "B") justifies.push(`${type} (${fastQ} → ${largeQ}, p=${t.p})`);
    else suffices.push(`${type} (fast ${fastQ} vs large ${largeQ}, p=${t.p})`);
  }
  W(`## verdict`);
  W();
  W(`- **The larger model earns its swap on:** ${justifies.length ? justifies.join("; ") : "none on this material (p≥0.05 everywhere)"}.`);
  W(`- **The fast model carries:** ${suffices.length ? suffices.join("; ") : "none"}.`);
  W();
  writeFileSync(RESULTS_PATH, lines.join("\n") + "\n");
  console.log(`\nwrote ${RESULTS_PATH}`);
}

mkdirSync(RESULTS_DIR, { recursive: true });
run().catch((err) => { console.error(err); process.exit(1); });