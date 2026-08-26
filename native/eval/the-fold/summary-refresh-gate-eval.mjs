// eval/summary-refresh-gate-eval.mjs — the aperture-gated summary refresh,
// measured against a live model, end to end. Run: node
// eval/summary-refresh-gate-eval.mjs [conversation-model] [refresh-model]
//
// The claim under test (CLAUDE.md, "System 1's own ground, measured" and
// refreshSummary's own gate comment): gating the summary refresh on
// aperture.js's exchangeHeldGround saves real model calls on turns the
// engine's own continuation null says moved nothing, and does not skip a
// turn that actually moved the ground.
//
// The design that keeps this a fair comparison: ONE real conversation is
// run once (the model answers each question for real, on Ollama). The
// resulting transcript is then fed through BOTH the baseline path (every
// turn gets a real summary-refresh call) and the gated path (only the
// turns exchangeHeldGround refuses get one) — same transcript, same
// summary-refresh model, same prompts fold.js itself builds. What differs
// is only whether the call happens, so the comparison isolates the gate's
// own effect rather than conflating it with conversation-to-conversation
// variance.

import {
  FOLD_SCHEMA,
  FOLD_SYSTEM_PROMPT,
  advanceSummaryFold,
  buildSummaryUpdatePrompt,
  emptySummary,
  mechanicalFoldLine,
  updateSummaryWithFold,
} from "../fold.js";
import { exchangeHeldGround, makeApertureMeter, meterSnapshot } from "../aperture.js";
import { createTierStack, foldThrough } from "../../eoreader7/legacy-eoreader6.1/packages/engine/emergence/tiers.js";

const OLLAMA = "http://localhost:11434";
const CONVO_MODEL = process.argv[2] ?? "qwen2.5:14b-instruct-q4_K_M";
const REFRESH_MODEL = process.argv[3] ?? "gemma2:2b";

// The same seven-settle-then-pivot shape the gate's reachability was
// measured on (aperture.js::exchangeHeldGround's header) — long enough to
// let the ground actually settle, per the measured lesson in
// aperture.test.mjs that three exchanges do not.
const QUESTIONS = [
  "What does the report say about harbor traffic in spring? Answer in one sentence, inventing a specific plausible number if you have to.",
  "And the summer figure? One sentence.",
  "So is the ferry schedule what's driving both seasons? One sentence.",
  "What was the spring figure again? One sentence.",
  "And that was driven by the ferries? One sentence.",
  "Remind me of the summer number? One sentence.",
  "So both seasons sit above baseline because of the ferries? One sentence.",
  "Now, completely separately — what do you know about volcanic soil chemistry in Iceland? One sentence.",
  "Interesting. Does that affect what crops grow well there? One sentence.",
];

async function chat(model, messages, { json, maxTokens } = {}) {
  const t0 = performance.now();
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      ...(json ? { format: json === true ? "json" : json } : {}),
      options: { num_predict: maxTokens ?? 300 },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return {
    content: data.message?.content ?? "",
    ms: performance.now() - t0,
    promptTokens: data.prompt_eval_count ?? 0,
    outputTokens: data.eval_count ?? 0,
  };
}

async function runConversation() {
  console.log(`\n== running the real conversation once (${CONVO_MODEL}) ==\n`);
  const history = [];
  const transcript = [];
  for (const q of QUESTIONS) {
    history.push({ role: "user", content: q });
    const { content, ms, outputTokens } = await chat(CONVO_MODEL, history);
    history.push({ role: "assistant", content });
    transcript.push({ question: q, answer: content });
    console.log(`  Q: ${q}`);
    console.log(`  A: ${content.trim().replace(/\s+/g, " ")}  (${ms.toFixed(0)}ms, ${outputTokens} tok)\n`);
  }
  return transcript;
}

async function refreshOnce(summary, fold) {
  const { content, ms, promptTokens, outputTokens } = await chat(
    REFRESH_MODEL,
    [
      { role: "system", content: FOLD_SYSTEM_PROMPT },
      { role: "user", content: buildSummaryUpdatePrompt(summary, [...(summary.folds || []), fold]) },
    ],
    { json: FOLD_SCHEMA, maxTokens: 300 },
  );
  return { summary: updateSummaryWithFold(summary, fold, content), ms, promptTokens, outputTokens };
}

async function evaluate(transcript) {
  const apertureOrgans = makeApertureMeter({ createTierStack, foldThrough });
  const meter = apertureOrgans.create();

  let baselineSummary = emptySummary();
  let gatedSummary = emptySummary();
  const baseline = { calls: 0, ms: 0, promptTokens: 0, outputTokens: 0 };
  const gated = { calls: 0, ms: 0, promptTokens: 0, outputTokens: 0 };
  const rows = [];

  for (let i = 0; i < transcript.length; i++) {
    const turn = i + 1;
    const { question, answer } = transcript[i];
    const fold = mechanicalFoldLine(question, answer);

    const arrivals = [
      apertureOrgans.observe(meter, { turn, role: "user", text: question }),
      apertureOrgans.observe(meter, { turn, role: "assistant", text: answer }),
    ];
    const held = exchangeHeldGround(arrivals);

    // Baseline: every turn spends a real refresh call.
    const b = await refreshOnce(baselineSummary, fold);
    baselineSummary = b.summary;
    baseline.calls++;
    baseline.ms += b.ms;
    baseline.promptTokens += b.promptTokens;
    baseline.outputTokens += b.outputTokens;

    // Gated: only spend the call when the exchange did NOT hold the ground.
    let g;
    if (held) {
      gatedSummary = advanceSummaryFold(gatedSummary, fold);
      g = { ms: 0, promptTokens: 0, outputTokens: 0, skipped: true };
    } else {
      const r = await refreshOnce(gatedSummary, fold);
      gatedSummary = r.summary;
      gated.calls++;
      gated.ms += r.ms;
      gated.promptTokens += r.promptTokens;
      gated.outputTokens += r.outputTokens;
      g = { ...r, skipped: false };
    }

    rows.push({
      turn,
      censored: [arrivals[0].censored, arrivals[1].censored],
      bits: [arrivals[0].bits, arrivals[1].bits],
      rank: [arrivals[0].rank, arrivals[1].rank],
      novelRate: arrivals[1].novelRate,
      held,
      refreshed: !g.skipped,
    });
  }

  return { baseline, gated, baselineSummary, gatedSummary, rows, meter };
}

function fmtSummary(s) {
  return `topic="${s.topic}" | entities=[${(s.entities || []).join(", ")}] | context="${s.context}"`;
}

async function main() {
  const transcript = await runConversation();
  const { baseline, gated, baselineSummary, gatedSummary, rows, meter } = await evaluate(transcript);

  console.log("== per-turn gate verdicts ==\n");
  console.log("turn  held  refreshed  censored(u,a)      bits(u,a)      rank(u,a)          novelRate");
  for (const r of rows) {
    console.log(
      `${String(r.turn).padStart(2)}    ${String(r.held).padEnd(5)} ${String(r.refreshed).padEnd(9)}  ` +
      `${String(r.censored[0]).padEnd(8)} ${String(r.censored[1]).padEnd(8)}  ` +
      `${(r.bits[0] ?? "—").toString().padStart(6)} ${(r.bits[1] ?? "—").toString().padStart(6)}  ` +
      `${(r.rank[0] ?? "—").toString().padStart(6)} ${(r.rank[1] ?? "—").toString().padStart(6)}      ` +
      `${r.novelRate}`,
    );
  }

  console.log("\n== the learning state at the end of the run (meterSnapshot) ==\n");
  for (const t of meterSnapshot(meter)) console.log(`  ${t.name}: ${JSON.stringify(t)}`);

  console.log("\n== summary-refresh cost, baseline vs gated ==\n");
  console.log(`  baseline : ${baseline.calls} calls · ${baseline.ms.toFixed(0)}ms · ${baseline.promptTokens} prompt tok · ${baseline.outputTokens} output tok`);
  console.log(`  gated    : ${gated.calls} calls · ${gated.ms.toFixed(0)}ms · ${gated.promptTokens} prompt tok · ${gated.outputTokens} output tok`);
  const savedCalls = baseline.calls - gated.calls;
  const savedMs = baseline.ms - gated.ms;
  const savedTok = (baseline.promptTokens + baseline.outputTokens) - (gated.promptTokens + gated.outputTokens);
  console.log(`  saved    : ${savedCalls} call(s) (${Math.round((savedCalls / baseline.calls) * 100)}%) · ${savedMs.toFixed(0)}ms · ${savedTok} tokens`);

  console.log("\n== final summary state, baseline vs gated ==\n");
  console.log(`  baseline : ${fmtSummary(baselineSummary)}`);
  console.log(`  gated    : ${fmtSummary(gatedSummary)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
