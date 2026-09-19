// hard-reasoning.mjs — EXTREMELY complicated logic, math, advanced reasoning,
// and generally unsolved problems.
//
//   MODELS=gemma2:2b,anthropic/claude-sonnet-4-6 node benchmarks/hard-reasoning.mjs
//
// Four blocks, all mechanically scored (no judge):
//   MATH    — numeric-answer items (arithmetic → algebra → word problems):
//             the final number must equal the gold value (tolerance-aware).
//   LOGIC   — knights-and-knaves + attribute puzzles with unique solutions:
//             the answer must name the exact solution tuple.
//   ADVANCED— probability, game theory, code-trace: exact answers.
//   OPEN    — Millennium-type UNSOLVED problems plus solved-but-hard controls:
//             an open problem scores ONLY by declining to solve it (no proof
//             or solution may be presented); a solved-hard control scores by
//             naming the real prover/result, never by claiming novelty.
//             Confabulating a proof of an open problem is the hallucination
//             this block hunts.
//
// Arms: each MODELS mouth grounded (/v1/ask) + RAW frontier control.
// Note: eoreader7's mechanical pipeline (quantity/logic/preference solvers)
// may settle MATH/LOGIC items pre-model — that is the system working as
// designed, and the scoreboard measures the whole instrument, mouth included.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
// ITEMS + scoreItem live in hard-reasoning-items.mjs, shared with Wilson's
// ant dispatcher (ant-dispatch.mjs) so battery and ants never disagree.
import { ITEMS, scoreItem } from "./hard-reasoning-items.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ER7 = (process.env.ER7 ?? "http://127.0.0.1:11436").replace(/\/+$/, "");
const ANTHROPIC_URL = (process.env.ER7_ANTHROPIC_URL ?? "https://api.anthropic.com").replace(/\/+$/, "");
const KEY = process.env.ANTHROPIC_API_KEY ?? "";
const MODELS = (process.env.MODELS ?? "gemma2:2b,anthropic/claude-sonnet-4-6")
  .split(",").map((s) => s.trim().replace(/^er7:/, "")).filter(Boolean);
// SUFFIX: an ant-adopted instruction appended to grounded tasks (e.g. the
// step-by-step winner). Applies to pipeline arms only — raw stays the control.
const SUFFIX = process.env.SUFFIX ?? "";

async function askEr7(model, prompt, sessionId) {
  const res = await fetch(`${ER7}/v1/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-er7-session": sessionId },
    body: JSON.stringify({ task: prompt + SUFFIX, model }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${model}: ${body?.error ?? res.status}`);
  return { text: body.answer ?? "", input: body.usage?.promptTokens ?? 0, output: body.usage?.completionTokens ?? 0, mechanical: body.mechanical ?? null };
}
async function askRaw(apiModel, prompt) {
  const res = await fetch(`${ANTHROPIC_URL}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: apiModel, max_tokens: 1024, system: "Answer briefly and exactly as requested.", messages: [{ role: "user", content: prompt }] }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`raw: ${body?.error?.message ?? res.status}`);
  return { text: (body.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n"), input: body.usage?.input_tokens ?? 0, output: body.usage?.output_tokens ?? 0 };
}

async function main() {
  if (!KEY) throw new Error("ANTHROPIC_API_KEY is required (env only — never in files).");
  const frontier = MODELS.find((m) => /claude|anthropic/i.test(m)) ?? "claude-sonnet-4-6";
  const apiModel = frontier.replace(/^anthropic\//i, "");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const results = [];
  for (const item of ITEMS) {
    const row = { id: item.id, block: item.block, q: item.q, arms: {} };
    for (const model of MODELS) {
      const r = await askEr7(model, item.q, `hr-${stamp}-${item.id}`).catch((e) => ({ text: `[ERROR] ${e.message}`, input: 0, output: 0, error: e.message }));
      const s = r.error ? { pass: false, why: `error: ${r.error.slice(0, 80)}` } : scoreItem(item, r.text);
      row.arms[model] = { pass: s.pass, why: s.why, input: r.input, output: r.output, mechanical: r.mechanical?.rung ?? r.mechanical?.gap ?? null, text: r.text.slice(0, 300), ...(r.error ? { error: r.error } : {}) };
    }
    const rr = await askRaw(apiModel, item.q).catch((e) => ({ text: `[ERROR] ${e.message}`, input: 0, output: 0, error: e.message }));
    const rs = rr.error ? { pass: false, why: `error` } : scoreItem(item, rr.text);
    row.arms[`raw/${apiModel}`] = { pass: rs.pass, why: rs.why, input: rr.input, output: rr.output, text: rr.text.slice(0, 300), ...(rr.error ? { error: rr.error } : {}) };
    results.push(row);
    const flags = Object.entries(row.arms).map(([m, a]) => `${m.split("/").pop()}:${a.error ? "ERR" : a.pass ? "✓" : "✗"}`).join(" ");
    console.log(`${item.id} [${item.block}] ${flags} — ${Object.values(row.arms)[0]?.why ?? ""}`);
    for (const [m, a] of Object.entries(row.arms)) {
      if (!a.pass && !a.error) console.log(`    ${m}: got: ${a.text.slice(0, 160).replace(/\n/g, " ")}`);
    }
  }
  const arms = Object.keys(results[0].arms);
  console.log(`\n── headline ──`);
  const summary = {};
  for (const arm of arms) {
    const byBlock = {};
    for (const r of results) {
      (byBlock[r.block] ??= { pass: 0, of: 0 }) && 0;
      byBlock[r.block].of++;
      if (r.arms[arm].pass) byBlock[r.block].pass++;
    }
    const tot = results.filter((r) => r.arms[arm].pass).length;
    summary[arm] = { pass: tot, of: results.length, acc: tot / results.length, byBlock: Object.fromEntries(Object.entries(byBlock).map(([b, v]) => [b, `${v.pass}/${v.of}`])) };
    console.log(`${arm.padEnd(32)} ${tot}/${results.length} ${JSON.stringify(summary[arm].byBlock)}`);
  }
  mkdirSync(join(HERE, "results"), { recursive: true });
  const path = join(HERE, "results", `hard-reasoning-${stamp}.json`);
  writeFileSync(path, JSON.stringify({ at: new Date().toISOString(), summary, results }, null, 2));
  console.log(`\nwrote ${path}`);
}

await main();
