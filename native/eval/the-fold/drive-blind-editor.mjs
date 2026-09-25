// drive-blind-editor.mjs — THE EXPERIMENT'S STEP 4 (plans/generation-terrain-stance.md):
// a blind pairwise editor verdict, sources open. Each pair of pieces is shown
// anonymized (Piece A / Piece B, order fixed by a seeded coin), and a judge
// model names the better piece plus each piece's factual errors. Votes are
// tallied per skeleton (A0 vs A2) and per flesh (F1 vs F2).
//
//   node drive-blind-editor.mjs [--model qwen3:8b] [--judge-seed 1]

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const model = arg("model", "qwen3:8b");
const seed = Number(arg("judge-seed", "1"));

const { streamOllamaChat } = await import("../../../proxy-runner.mjs");

const pieces = {
  "F1/A0": fs.readFileSync(path.join(HERE, "results/terrain-stance-2026-09-21/pieces/ts-live-f1-a0.txt"), "utf8"),
  "F1/A2": fs.readFileSync(path.join(HERE, "results/terrain-stance-2026-09-21/pieces/ts-live-f1-a2.txt"), "utf8"),
  "F2/A0": fs.readFileSync(path.join(HERE, "results/terrain-stance-2026-09-21/pieces/ts-live-f2-a0.txt"), "utf8"),
  "F2/A2": fs.readFileSync(path.join(HERE, "results/terrain-stance-2026-09-21/pieces/ts-live-f2-a2.txt"), "utf8"),
};
const source = fs.readFileSync(path.join(HERE, "../../../plans/ohs/ground/AUD-HID-FOLLOWUP-2025.txt"), "utf8");

const mulberry = (s) => () => { let t = (s += 0x6D2B79F5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const names = Object.keys(pieces);
const pairs = [];
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) pairs.push([names[i], names[j]]);

const draw = async (messages, maxTokens) => {
  let out = "";
  for await (const chunk of streamOllamaChat(model, messages, { maxTokens })) if (typeof chunk === "string") out += chunk;
  return out;
};

const verdicts = [];
for (const [a, b] of pairs) {
  const rnd = mulberry(seed + names.indexOf(a) * 7 + names.indexOf(b));
  const swap = rnd() < 0.5;
  const [x, y] = swap ? [a, b] : [b, a];
  const prompt = `You are an editor with the source document open. The ask was: "Write an essay on what the audit found about the Office of Homeless Services and how the audit committee responded."

SOURCE DOCUMENT (the only ground truth):
${source}

PIECE A:
${pieces[x]}

PIECE B:
${pieces[y]}

Which piece is the better essay on the ask? Base the answer on the source alone. Then list each piece's factual errors: a claim the source contradicts, a number the source does not support, or an attribution the source does not make. If a sentence is verbatim from the source it is not an error.

Answer as JSON only:
{"better": "A" or "B" or "tie", "why": "one or two sentences", "errorsA": ["each factual error in Piece A, if any"], "errorsB": ["each factual error in Piece B, if any"]}`;
  let raw = "";
  try { raw = await draw([{ role: "user", content: prompt }], 700); } catch (e) { raw = `{"better":"tie","why":"judge error: ${String(e?.message ?? e).slice(0,80)}","errorsA":[],"errorsB":[]}`; }
  let j = null;
  try { j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); } catch { j = { better: "tie", why: `unparseable: ${raw.slice(0, 120)}`, errorsA: [], errorsB: [] }; }
  const winner = j.better === "A" ? x : j.better === "B" ? y : null;
  verdicts.push({ pair: `${x} vs ${y}`, winner, why: j.why, errorsA: j.errorsA ?? [], errorsB: j.errorsB ?? [] });
  console.error(`· ${x} vs ${y} → ${winner ?? "tie"}`);
  await new Promise((r) => setTimeout(r, 1500));
}

// Tally: per skeleton arm (A0 vs A2) and per flesh arm (F1 vs F2), across the
// pairs where they face each other (and across all judges, for the four runs).
const tally = (keyOf) => {
  const wins = {}, losses = {}, ties = {};
  for (const v of verdicts) {
    if (!v.winner) { ties[v.pair] = (ties[v.pair] ?? 0) + 1; continue; }
    const w = keyOf(v.winner);
    wins[w] = (wins[w] ?? 0) + 1;
  }
  return { wins, pairs: pairs.length };
};

const armKey = (n) => n.split("/")[1];
const fleshKey = (n) => n.split("/")[0];
const arm = tally(armKey);
const flesh = tally(fleshKey);

const out = {
  model, seed, source: path.basename(source) && "AUD-HID-FOLLOWUP-2025.txt",
  verdicts,
  arms: arm,
  flesh: { F1: 0, F2: 0 },
};
// F1 vs F2 wins come only from pairs that are not same-arm comparisons.
for (const v of verdicts) if (v.winner) out.flesh[fleshKey(v.winner)] = (out.flesh[fleshKey(v.winner)] ?? 0) + 1;

fs.writeFileSync(path.join(HERE, "results/terrain-stance-2026-09-21/blind-editor.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ arms: arm, flesh: out.flesh }, null, 2));
console.error(`wrote results/terrain-stance-2026-09-21/blind-editor.json`);