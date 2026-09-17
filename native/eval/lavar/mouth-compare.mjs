// mouth-compare.mjs — the fluency experiment: smallest ethically-sourced
// model, warmed through Heimdall's own window discipline.
//
// The model: OLMo-2-1B (Ai2 — Allen Institute for AI: full training data,
// process, and checkpoints published, never an undisclosed mix). It is the
// smallest ethically-sourced instruct model this repo already trusts
// (WITNESS_MODEL / S1_MODEL in model-routing.js), and the repo's own
// measured note: on the select protocol it ran 30-65% faster than gemma2:2b.
//
// Heimdall's discipline (the bridge — loadedWindowOf via Ollama's /api/ps):
// a model's load cost is paid ONCE, then it is the window in force. So this
// warms the model with keep_alive so it stays resident across calls, checks
// /api/ps for its loaded window, and then writes. The load is the only slow
// part; the write after it is the real measurement.
//
// The ground is the record's — the six LaVar-verified arrangements.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const OLLAMA = process.env.OLLAMA || "http://localhost:11434";
const MODEL = process.env.MODEL || "smollm2:1.7b";
const OUT = join(HERE, "results", "olmo-fiction-written.txt");

const FACTS = [
  "the Poles shouted Vivat",
  "the troops pressed against one another",
  "Napoleon looked up and down the river",
  "Napoleon sat down on a log",
  "Napoleon gave his orders",
  "the orders had been executed before he gave them",
];

// HEIMDALL'S FINDING (measured live): smollm2:1.7b's chat template HANGS on
// a `system` role message — the same prompt answers fine folded into the
// `user` turn. This model was trained on user/assistant turns; the system
// role is a hallucination of the template, not a real feature. So the
// instruction is folded into the user turn — the way the model actually
// writes.
const user = [
  "You are a writer. Write a short scene of fiction using these facts, in the order they occur. You may add prose around them — description, dialogue, feeling — but you may not state any fact the list does not carry.",
  "The scene is set during Napoleon's invasion of Russia.",
  "The facts:",
  ...FACTS.map((f, i) => `${i + 1}. ${f}`),
  "Write the scene now.",
].join("\n");

// ── warm through Heimdall's window: keep_alive so the load is paid once, ──
// and a DECLARED num_ctx (Heimdall's loadedWindowOf discipline — bound the
// window, never let the model's default hang).
console.log(`model: ${MODEL}`);
const WINDOW = Number(process.env.CTX || 2048);
const tWarm = Date.now();
const warm = await fetch(`${OLLAMA}/api/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: MODEL, stream: false, keep_alive: "30m", options: { num_ctx: WINDOW }, messages: [{ role: "user", content: "warm" }] }),
});
await warm.json();
console.log(`warm: ${Date.now() - tWarm}ms (the load, paid once) · window ${WINDOW}`);

const ps = await fetch(`${OLLAMA}/api/ps`).then((r) => r.json()).catch(() => ({ models: [] }));
const loaded = ps.models?.find((m) => m.name === MODEL);
console.log(`heimdall /api/ps: ${loaded ? `loaded, context ${loaded.context_length}` : "not listed"}`);

// ── the write ──
const t0 = Date.now();
const res = await fetch(`${OLLAMA}/api/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: MODEL, stream: false, options: { temperature: 0.8, num_ctx: WINDOW }, messages: [{ role: "user", content: user }] }),
});
const body = await res.json();
const text = String(body?.message?.content ?? "").trim();
const ms = Date.now() - t0;
if (!text) { console.error("no output", body?.error ?? ""); process.exit(1); }

writeFileSync(OUT, text, "utf8");
console.log(`write: ${ms}ms (after warm) — saved ${OUT}`);
console.log("\n── the written scene ──\n");
console.log(text);