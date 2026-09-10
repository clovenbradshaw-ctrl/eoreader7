#!/usr/bin/env node
// model-capability-ladder.mjs — for the "minimum model needed per turn"
// question: on a spread of question DIFFICULTY (not just difficulty label —
// real questions spanning trivial recall, obscure recall, arithmetic,
// multi-step reasoning, and a should-refuse case), which is the CHEAPEST
// model tier that gets each one right? This is the seed data a learned
// router would train on — not the router itself.
//
//   node model-capability-ladder.mjs

const OLLAMA = "http://localhost:11434/api/chat";
const MODELS = ["gemma2:2b", "llama3.2:latest", "phi3:mini", "qwen2.5:14b-instruct-q4_K_M"];

const CHAT_SYSTEM_PROMPT =
  "You are The Fold, a local reading and research assistant that works from whatever a person gives you. A friendly conversation. Reply directly, briefly, and naturally, the way a person would. Do not repeat back what was just said; say something new. Asked for your own opinion, a preference, or a concrete suggestion, give one plainly — pick a side, name a real option — rather than turning the question back around; once someone has already told you what they need to, answer from that instead of asking them to repeat it in a different shape.";

const QUESTIONS = [
  { tier: "trivial-recall", q: "What is the capital of Japan?", accept: [/tokyo/i] },
  { tier: "trivial-recall", q: "Who wrote Romeo and Juliet?", accept: [/shakespeare/i] },
  { tier: "obscure-recall", q: "Who was the 10th President of the United States?", accept: [/tyler/i] },
  { tier: "obscure-recall", q: "What year did the Battle of Hastings take place?", accept: [/1066/] },
  { tier: "arithmetic", q: "What is 23 times 17?", accept: [/\b391\b/] },
  { tier: "arithmetic", q: "What is 144 divided by 12, plus 7?", accept: [/\b19\b/] },
  { tier: "multi-step-reasoning", q: "If a train leaves at 3:15pm and arrives at 5:40pm, how long was the trip? Answer in hours and minutes only.", accept: [/2\s*(?:hours?|hrs?|h)\s*(?:and\s*)?25\s*(?:minutes?|mins?|m)/i, /2:25/] },
  { tier: "multi-step-reasoning", q: "Alice is older than Bob. Bob is older than Carol. Is Carol older or younger than Alice? Answer with one word: OLDER or YOUNGER.", accept: [/younger/i] },
  { tier: "should-refuse", q: "What was my sister's name?", accept: [/don'?t know|no way|not (?:told|mentioned|given)|haven'?t (?:told|mentioned|shared)|no (?:information|context|idea)/i] },
];

async function callOllama(model, question) {
  const t0 = Date.now();
  const res = await fetch(OLLAMA, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        { role: "user", content: question },
      ],
      stream: false,
      options: { temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status}`);
  const json = await res.json();
  return { reply: json?.message?.content ?? "", ms: Date.now() - t0 };
}

async function main() {
  const rows = [];
  for (const model of MODELS) {
    for (const { tier, q, accept } of QUESTIONS) {
      process.stderr.write(`${model} | ${tier} | ${q}\n`);
      try {
        const { reply, ms } = await callOllama(model, q);
        const correct = accept.some((re) => re.test(reply));
        rows.push({ model, tier, question: q, ms, correct, reply: reply.replace(/\s+/g, " ").trim() });
      } catch (err) {
        rows.push({ model, tier, question: q, ms: null, correct: false, reply: `ERROR: ${err.message}` });
      }
    }
  }
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });
