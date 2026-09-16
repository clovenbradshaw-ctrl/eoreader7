// mouth-long-chat.mjs — how models respond when prompted over LONG chats,
// with the fold's own folding, not just one-shots.
//
// User direction, verbatim: "how they respond being prompted over long chats
// (eoreader folding) not just one shots".
//
// A 14-turn conversation is walked THREE ways, per model. Only the feeding
// differs; every turn's answer is a real call on the real model.
//
//   full   — system + the ENTIRE raw history every turn. The information
//            upper bound (unbounded context, the thing the fold exists to
//            avoid needing).
//   fold   — THE FOLD'S OWN SHAPE (holon.js flat-chat assembly): system =
//            CHAT_SYSTEM_PROMPT + the running ONE-LINE summary ("The
//            conversation so far: …") + the RECENCY_WINDOW (4) most recent
//            verbatim turns. The summary is maintained the way the fold
//            maintains its own — a model call distilling the conversation
//            to one line, refreshed every turn, same mouth, temperature 0.
//   window — the same recency window with NO summary: what folding is
//            compared against, so the summary's value is measured, not
//            asserted.
//
// The script interleaves context turns (facts and planted personal details)
// with PROBES, scored mechanically:
//   probe short — the fact is still inside the 4-turn window (the fold's
//                 present reaches it by raw history).
//   probe long  — the fact is beyond the window: only the summary (or full
//                 history) can still carry it. THIS is where folding either
//                 earns its keep or loses it.
// Context answers and probes are also scored for stylization (clean), and
// the clean rate is split first-half/second-half to see whether the voice
// drifts over length — the thing a one-shot eval cannot see.
//
// run: node mouth-long-chat.mjs
//      node mouth-long-chat.mjs --models=gemma2:2b,qwen3:8b --trials=2

import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { call, stylization, accurate, pct, feedArm, CHAT_SYSTEM_PROMPT } from "./lib/mouth-common.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = path.join(HERE, "results");
const RESULTS_PATH = path.join(RESULTS_DIR, "mouth-long-chat-RESULTS.md");

const DEFAULT_MODELS = [
  { name: "gemma2:2b", tier: "fast" },
  { name: "qwen3:8b", tier: "mid" },
  { name: "qwen2.5:14b-instruct-q4_K_M", tier: "large" },
];

const RECENCY_WINDOW = 4; // the fold's own present (fold.js)
const SUMMARY_TEMP = 0;
const ANSWER_TEMP = 0.3;

// THE CONVERSATION SCRIPT. `expect` = mechanical fact check. `probe` names
// the horizon (short = inside the 4-turn window at ask time, long = beyond
// it — only the summary/full history can still carry it). Context turns carry
// no expect; they are still scored for stylization.
const SCRIPT = [
  { u: "Let's talk about US history. Who was Abraham Lincoln's first vice president?", expect: ["hannibal", "hamlin"] },
  { u: "And who was his second vice president?", expect: ["andrew johnson", "johnson"] },
  { u: "By the way, my favorite color is teal." },
  { u: "What's my favorite color?", expect: ["teal"], probe: "short" },
  { u: "What's the capital of France?", expect: ["paris"] },
  { u: "I'm planning a trip to Paris soon." },
  { u: "Where am I planning a trip?", expect: ["paris"], probe: "short" },
  { u: "What is the largest planet in our solar system?", expect: ["jupiter"] },
  { u: "Who was Lincoln's second vice president again?", expect: ["andrew johnson", "johnson"], probe: "long" },
  { u: "The project meeting is on Wednesday at 4pm." },
  { u: "When is the project meeting?", expect: ["wednesday"], probe: "short" },
  { u: "What's my favorite color?", expect: ["teal"], probe: "long" },
  { u: "Which ocean borders the west coast of the United States?", expect: ["pacific"] },
  { u: "What is the capital of France?", expect: ["paris"], probe: "long" },
];

// The fold's own summary-refresh ask: distil to ONE line, grammar-held by
// the fold's own discipline (the one-line discourse the flat path feeds).
const SUMMARY_ASK = "Distill this conversation into ONE line: what the person asked about and what has been established so far. Reply with that one line only — no preamble.";

const CONDITIONS = ["full", "fold", "window"];

async function summaryOf(model, history) {
  const messages = [{ role: "system", content: SUMMARY_ASK }];
  for (const h of history) messages.push({ role: h.role, content: h.content });
  const s = (await call(model, messages, { temperature: SUMMARY_TEMP, maxTokens: 120 })).trim();
  return s.split("\n")[0].slice(0, 400);
}

// Walk one condition for one model, `trials` times. Returns per-turn outcomes.
async function walk(model, condition, trials) {
  const allOutcomes = [];
  for (let trial = 0; trial < trials; trial++) {
    let history = []; // full verbatim transcript (role, content) as actually said
    let summary = ""; // the fold's one-line distillation
    const outcomes = [];
    for (let i = 0; i < SCRIPT.length; i++) {
      const turn = SCRIPT[i];
      const q = turn.u;
      let messages;
      if (condition === "full") {
        messages = [{ role: "system", content: CHAT_SYSTEM_PROMPT }];
        for (const h of history) messages.push({ role: h.role, content: h.content });
        messages.push({ role: "user", content: q });
      } else if (condition === "fold") {
        messages = feedArm("fold", q, { summary, history, windowN: RECENCY_WINDOW });
      } else {
        messages = feedArm("fold", q, { summary: null, history, windowN: RECENCY_WINDOW });
      }
      const answer = await call(model, messages, { temperature: ANSWER_TEMP, maxTokens: 256 });
      const ok = turn.expect ? accurate(turn, answer) : null;
      const s = stylization(q, answer);
      outcomes.push({
        turn: i + 1,
        question: q,
        probe: turn.probe ?? null,
        hasExpect: Boolean(turn.expect),
        accurate: ok,
        clean: ok === null ? s.violations.length === 0 : ok && s.violations.length === 0,
        violations: s.violations,
        answer: answer.trim(),
      });
      history.push({ role: "user", content: q }, { role: "assistant", content: answer.trim() });
      if (condition === "fold") summary = await summaryOf(model, history);
    }
    allOutcomes.push(outcomes);
  }
  return allOutcomes;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (k, d) => { const m = args.find((a) => a.startsWith(`--${k}=`)); return m ? m.split("=").slice(1).join("=") : d; };
  const models = get("models", "") ? get("models", "").split(",").map((s) => s.trim()).filter(Boolean) : null;
  const trials = Number(get("trials", "2")) || 1;
  return { models, trials };
}

async function run() {
  const { models, trials } = parseArgs();
  const ladder = models ? models.map((m) => ({ name: m, tier: "?" })) : DEFAULT_MODELS;
  console.log(`long-chat · conditions [${CONDITIONS.join(", ")}] · models [${ladder.map((m) => m.name).join(", ")}] · ${SCRIPT.length} turns × ${trials} trials\n`);

  const results = {}; // results[model][condition] = flattened outcomes
  for (const m of ladder) {
    results[m.name] = {};
    for (const c of CONDITIONS) {
      results[m.name][c] = (await walk(m.name, c, trials)).flat();
      const acc = results[m.name][c].filter((o) => o.hasExpect);
      const clean = results[m.name][c];
      const half = Math.floor(clean.length / 2);
      const cleanFirst = clean.slice(0, half).filter((o) => o.clean).length;
      const cleanSecond = clean.slice(half).filter((o) => o.clean).length;
      console.log(`  ${m.name.padEnd(26)} ${c.padEnd(7)} probes ${acc.filter((o) => o.accurate).length}/${acc.length} · clean ${clean.filter((o) => o.clean).length}/${clean.length} (first ${cleanFirst}/${half} → second ${cleanSecond}/${clean.length - half})`);
    }
  }

  const lines = [];
  const W = (s = "") => lines.push(s);
  W(`# mouth-long-chat — long-chat behavior, with the fold's own folding`);
  W();
  W(`*${new Date().toISOString()} · ${CONDITIONS.length} conditions × ${ladder.map((m) => m.name).join(", ")} × ${SCRIPT.length} turns × ${trials} trials · recency window ${RECENCY_WINDOW} (the fold's own present) · summary refreshed every turn, same mouth, temp ${SUMMARY_TEMP}.*`);
  W();
  W(`One 14-turn conversation walked three ways — **full** (entire raw history), **fold** (the fold's own shape: one-line running summary + the last ${RECENCY_WINDOW} verbatim turns), **window** (the same window, no summary). Probes are scored mechanically by fact; **short** probes sit inside the window, **long** probes sit beyond it — only the summary (or full history) can still carry them. That is where folding either earns its keep or loses it.`);
  W();
  for (const m of ladder) {
    W(`## ${m.name}`);
    W();
    W(`| condition | probes right | short right | long right | context clean | clean (all turns) | first-half clean | second-half clean |`);
    W(`|-----------|-------------|------------|-----------|--------------|-------------------|------------------|-------------------|`);
    for (const c of CONDITIONS) {
      const o = results[m.name][c];
      const probes = o.filter((x) => x.hasExpect);
      const short = probes.filter((x) => x.probe === "short");
      const long = probes.filter((x) => x.probe === "long");
      const half = Math.floor(o.length / 2);
      W(`| ${c} | ${probes.filter((x) => x.accurate).length}/${probes.length} | ${short.filter((x) => x.accurate).length}/${short.length} | ${long.filter((x) => x.accurate).length}/${long.length} | ${o.filter((x) => x.hasExpect && x.clean).length}/${probes.length} | ${o.filter((x) => x.clean).length}/${o.length} | ${o.slice(0, half).filter((x) => x.clean).length}/${half} | ${o.slice(half).filter((x) => x.clean).length}/${o.length - half} |`);
    }
    W();
  }
  W(`## the fold's value, per model — long-horizon probes (the summary's one job)`);
  W();
  W(`| model | full long | fold long | window long |`);
  W(`|-------|-----------|-----------|-------------|`);
  for (const m of ladder) {
    const row = CONDITIONS.map((c) => {
      const long = results[m.name][c].filter((x) => x.probe === "long");
      return `${long.filter((x) => x.accurate).length}/${long.length}`;
    });
    W(`| ${m.name} | ${row.join(" | ")} |`);
  }
  W();
  const lost = [];
  for (const m of ladder) {
    const fullLong = results[m.name].full.filter((x) => x.probe === "long" && x.accurate).length;
    const foldLong = results[m.name].fold.filter((x) => x.probe === "long" && x.accurate).length;
    const winLong = results[m.name].window.filter((x) => x.probe === "long" && x.accurate).length;
    lost.push(`${m.name}: full ${fullLong}/4 · fold ${foldLong}/4 · window ${winLong}/4`);
  }
  W(`Long probes: ${lost.join(" — ")}. The **fold** column is the production shape; where it matches **full** and beats **window**, the one-line summary is carrying what the recency window drops — the whole reason the fold exists.`);
  W();
  writeFileSync(RESULTS_PATH, lines.join("\n") + "\n");
  console.log(`\nwrote ${RESULTS_PATH}`);
}

mkdirSync(RESULTS_DIR, { recursive: true });
run().catch((err) => { console.error(err); process.exit(1); });