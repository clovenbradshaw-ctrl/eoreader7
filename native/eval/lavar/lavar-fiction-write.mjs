// lavar-fiction-write.mjs — the story written FOR REAL, by the mouth, from
// LaVar's verified material.
//
// The correction, finally closed the way the architecture intends: the model
// is the MOUTH of the record — it writes prose, never from nothing, but from
// the material the record holds. The mechanical composition path (stitching
// fragments, then stitching LaVar's arrangements) read as nonsense because
// it was never the mouth's job to write; it was the mouth's job to VOICE.
//
// THIS script hands the mouth (a real local model) the six LaVar-verified,
// byte-addressed arrangements as its ground, and asks it to write the scene.
// The ground is the record's — every fact the mouth may state is one of the
// six, each with its byte address (held back from the mouth, P55 — the
// record attaches them after). The mouth writes prose; nothing mechanical
// stitches.
//
// The prompt is shaped by the same disciplines the real app uses: facts as
// ground, never instructions; the material's own words as the only facts;
// the mouth free to compose prose FROM them. GARY's rules would read it at
// the door (no addresses, no apparatus vocabulary) — here the ground is
// given plainly.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOLOGRAPH = join(HERE, "results", "pg2600-holograph.json");
const OUT = join(HERE, "results", "lavar-fiction-written.txt");

const holo = JSON.parse(readFileSync(HOLOGRAPH, "utf8"));
const admitted = holo.results
  .filter((x) => x.heard?.length)
  .map((x) => ({ note: x.heard[0], span: x.span ?? { start: 0 } }))
  .sort((a, b) => (a.span?.start ?? 0) - (b.span?.start ?? 0));

const facts = admitted.map((a) => [a.note.end1, a.note.label, a.note.end2].filter(Boolean).join(" "));

const MODEL = process.env.MODEL || "gemma2:2b";
const OLLAMA = process.env.OLLAMA || "http://localhost:11434";

const system = [
  "You are a writer. You will be given facts that the source material states, and you will write a short scene of fiction that uses those facts.",
  "Use the facts as your ground. You may add prose around them — description, dialogue, feeling — but you may not state any fact the ground does not carry.",
  "Write in plain, vivid prose. Show the scene, do not report it.",
].join("\n");

const user = [
  "The scene is set during Napoleon's invasion of Russia.",
  "These are the facts the material states, in the order they occur:",
  ...facts.map((f, i) => `${i + 1}. ${f}`),
  "Write the scene now.",
].join("\n");

const res = await fetch(`${OLLAMA}/api/chat`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: MODEL, stream: false, messages: [{ role: "system", content: system }, { role: "user", content: user }], options: { temperature: 0.8 } }),
});
const body = await res.json();
const text = String(body?.message?.content ?? "").trim();
if (!text) {
  console.error("no output from model", MODEL, body?.error ?? "");
  process.exit(1);
}

writeFileSync(OUT, text, "utf8");
console.log(`wrote ${OUT}`);
console.log(`model: ${MODEL} · facts grounded: ${facts.length}`);
console.log("── the written scene ──\n");
console.log(text);
console.log("\n── the facts the mouth was grounded on ──");
facts.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));