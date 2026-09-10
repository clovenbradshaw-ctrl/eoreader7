#!/usr/bin/env node
// postguard-witness-experiment.mjs — the POST-processing half of the guard
// pair this session is measuring. holon.js's unretrievedSuffix branch, after
// a bare draft comes back, asks a SEPARATE witness call: "does this reply
// state any SPECIFIC new detail... as if observed or known?" A YES swaps the
// whole draft for a canned refusal line — regardless of whether the detail
// is TRUE. This driver asks: on a real general-knowledge answer (no material
// framing at all — this is the same question the pre-guard experiment ran),
// how often does that witness fire YES on a CORRECT answer (a false
// positive against a fact the model actually knows), and does that rate
// change with the model doing the ANSWERING (not the witnessing — holon.js
// always uses one small witness model; here the witness model is held fixed
// at gemma2:2b, matching production, while the ANSWERING model varies).
//
//   node postguard-witness-experiment.mjs

const OLLAMA = "http://localhost:11434/api/chat";
const WITNESS_MODEL = "gemma2:2b"; // matches app.js's actual witness-model choice for this class of check
const ANSWER_MODELS = ["gemma2:2b", "llama3.2:latest", "phi3:mini", "qwen2.5:14b-instruct-q4_K_M"];

const CHAT_SYSTEM_PROMPT =
  "You are The Fold, a local reading and research assistant that works from whatever a person gives you. A friendly conversation. Reply directly, briefly, and naturally, the way a person would. Do not repeat back what was just said; say something new. Asked for your own opinion, a preference, or a concrete suggestion, give one plainly — pick a side, name a real option — rather than turning the question back around; once someone has already told you what they need to, answer from that instead of asking them to repeat it in a different shape.";

const QUESTIONS = [
  { q: "Who was Abraham Lincoln's vice president?", accept: [/hannibal hamlin/i, /andrew johnson/i] },
  { q: "What is the capital of France?", accept: [/paris/i] },
  { q: "Who wrote Pride and Prejudice?", accept: [/jane austen/i] },
  { q: "What is 17 times 24?", accept: [/\b408\b/] },
];

async function callOllama(model, messages) {
  const t0 = Date.now();
  const res = await fetch(OLLAMA, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0 } }),
  });
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status}`);
  const json = await res.json();
  return { reply: json?.message?.content ?? "", ms: Date.now() - t0 };
}

function witnessPrompt(draft) {
  return `A reply was given to a question, with nothing relevant found in the attached material to answer it from. The reply:\n\n"${draft}"\n\nDoes this reply state any SPECIFIC new detail, object, name, or fact as if it were observed or known — something beyond a plain "I don't have more on that"? Reply with exactly one word: YES or NO.`;
}

async function main() {
  const rows = [];
  for (const model of ANSWER_MODELS) {
    for (const { q, accept } of QUESTIONS) {
      process.stderr.write(`answer:${model} | ${q}\n`);
      const { reply: draft, ms: answerMs } = await callOllama(model, [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        { role: "user", content: q },
      ]);
      const correct = accept.some((re) => re.test(draft));
      const { reply: witnessReply, ms: witnessMs } = await callOllama(WITNESS_MODEL, [
        { role: "user", content: witnessPrompt(draft) },
      ]);
      const fires = /^YES/i.test(witnessReply.trim());
      rows.push({
        answerModel: model, question: q, answerMs, witnessMs,
        draft: draft.replace(/\s+/g, " ").trim(),
        correct, witnessFires: fires,
        falsePositive: correct && fires, // a TRUE answer the post-guard would still have swapped out
      });
    }
  }
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((err) => { console.error(err.stack || err); process.exit(1); });
