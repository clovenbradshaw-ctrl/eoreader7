#!/usr/bin/env node
// model-guardrail-experiment.mjs — does the UNRETRIEVED_MATERIAL_PREFIX
// pre-processing guard (holon.js) suppress CORRECT general-knowledge
// answers, and does that cost scale with model size? Real Ollama calls,
// real models already pulled on this machine, no fixtures.
//
// Reproduces the exact system-prompt concatenation app.js uses
// (CHAT_SYSTEM_PROMPT + " " + UNRETRIEVED_MATERIAL_PREFIX, holon.js:2534)
// against a bare CHAT_SYSTEM_PROMPT control, across the four MODEL_PICKER
// rungs, on four ground-truthed general-knowledge questions.
//
//   node model-guardrail-experiment.mjs

const OLLAMA = "http://localhost:11434/api/chat";

const CHAT_SYSTEM_PROMPT =
  "You are The Fold, a local reading and research assistant that works from whatever a person gives you. A friendly conversation. Reply directly, briefly, and naturally, the way a person would. Do not repeat back what was just said; say something new. Asked for your own opinion, a preference, or a concrete suggestion, give one plainly — pick a side, name a real option — rather than turning the question back around; once someone has already told you what they need to, answer from that instead of asking them to repeat it in a different shape.";

const UNRETRIEVED_MATERIAL_PREFIX =
  "Something is attached to this conversation, but none of it came up for this question. Anything below is from separate, earlier reading — not the attachment — so say plainly that what's attached doesn't answer this, rather than answering from that instead.";

const MODELS = ["gemma2:2b", "llama3.2:latest", "phi3:mini", "qwen2.5:14b-instruct-q4_K_M"];

const QUESTIONS = [
  { q: "Who was Abraham Lincoln's vice president?", accept: [/hannibal hamlin/i, /andrew johnson/i] },
  { q: "What is the capital of France?", accept: [/paris/i] },
  { q: "Who wrote Pride and Prejudice?", accept: [/jane austen/i] },
  { q: "What is 17 times 24?", accept: [/\b408\b/] },
];

const REFUSAL_MARKERS = [
  /doesn'?t answer this/i,
  /isn'?t (?:more|any) (?:specific )?(?:detail|information)/i,
  /(?:nothing|none) (?:of it )?came up/i,
  /what'?s attached/i,
  /i (?:don'?t|do not) have (?:more|that|access)/i,
  /cannot determine/i,
];

function scoreReply(reply, accept) {
  const refused = REFUSAL_MARKERS.some((re) => re.test(reply));
  const correct = accept.some((re) => re.test(reply));
  return { refused, correct };
}

async function callOllama(model, system, question) {
  const t0 = Date.now();
  const res = await fetch(OLLAMA, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: question },
      ],
      stream: false,
      options: { temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status}`);
  const json = await res.json();
  const ms = Date.now() - t0;
  return { reply: json?.message?.content ?? "", ms };
}

async function main() {
  const rows = [];
  for (const model of MODELS) {
    for (const { q, accept } of QUESTIONS) {
      for (const [label, system] of [
        ["bare", CHAT_SYSTEM_PROMPT],
        ["guarded", `${CHAT_SYSTEM_PROMPT} ${UNRETRIEVED_MATERIAL_PREFIX}`],
      ]) {
        process.stderr.write(`${model} | ${label} | ${q}\n`);
        try {
          const { reply, ms } = await callOllama(model, system, q);
          const { refused, correct } = scoreReply(reply, accept);
          rows.push({ model, label, question: q, ms, refused, correct, reply: reply.replace(/\s+/g, " ").trim() });
        } catch (err) {
          rows.push({ model, label, question: q, ms: null, refused: null, correct: false, reply: `ERROR: ${err.message}` });
        }
      }
    }
  }
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });
