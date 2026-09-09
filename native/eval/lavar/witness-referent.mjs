// witness-referent.mjs — a local model, used as a WITNESS on the ledger's
// own "void" gaps, never as an oracle.
//
// User's framing, verbatim: "experiment with a local model pushing the
// 'physics' or 'chemistry' (not json oracle-ing)". The distinction this
// script holds to (organs/testimony.js's own discipline, S99's tier rule):
// the model is asked ONE constrained question and made to SELECT an index
// from a candidate list drawn from the ledger's own cast — it never
// generates a referent from nothing, the way "json oracle-ing" would (hand
// the model a gap, ask it to invent and emit structured JSON about what
// happened). And it is never trusted on one answer: the SAME question is
// asked twice with the candidate list order reversed (a perturbation with
// no semantic content — "physics", not persuasion) and the verdict is
// DERIVED, mechanically, from whether the two answers name the same
// candidate. A witness whose pick flips under a content-free reordering is
// not discriminating the referent; it is echoing list position, and its
// testimony is refused exactly as testimony.js refuses a witness whose
// verdict does not move under its own sibling-swap arm.
//
// TARGET: role:"void" lines — a third-person pronoun the reading's own
// recall floor already refused to bind (S95's own SIG·Ground). These are
// not invented ambiguity; they are ambiguity the ledger already disclosed.
//
// usage: node witness-referent.mjs <ch1,ch2,...> [samplesPerChapter]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BOOK = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt";
const raw = fs.readFileSync(BOOK, "utf8");

const OLLAMA = "http://localhost:11434";
const MODEL = "gemma2:2b"; // kept small on purpose — [[feedback_local_model_small]]

const SCHEMA = { type: "object", properties: { pick: { type: "integer" } }, required: ["pick"] };

function buildMessages(sentence, pronoun, candidates) {
  const list = candidates.map((c, i) => `${i + 1}. ${c}`).join("\n");
  return [
    {
      role: "system",
      content:
        `You are given one sentence from a story and a numbered list of characters who appear in it. ` +
        `Decide which character the word "${pronoun}" in the sentence most likely refers to. ` +
        `Answer with the NUMBER of that character. If you cannot tell from this sentence alone, answer 0. ` +
        `Do not explain — pick a number only.`,
    },
    { role: "user", content: `Sentence: ${sentence}\n\nCharacters:\n${list}\n0. cannot tell` },
  ];
}

async function ask(messages) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, stream: false, format: SCHEMA, options: { num_predict: 20 } }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.message.content);
    return Number.isInteger(parsed.pick) ? parsed.pick : null;
  } catch {
    return null;
  }
}

function loadChapter(ch) {
  const ledgerPath = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${ch}.eot.jsonl`);
  const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const byReferent = new Map();
  for (const l of lines) {
    if (l.role !== "entity") continue;
    const longest = [...(l.surfaces ?? [])].sort((a, b) => b.length - a.length)[0];
    if (longest) byReferent.set(l.referent, longest);
  }
  const cast = [...byReferent.values()];
  const voids = lines.filter((l) => l.role === "void");
  return { cast, voids };
}

const chapters = (process.argv[2] ?? "1,2,3,4,5").split(",").map(Number);
const perChapter = Number(process.argv[3] ?? 3);

const results = [];
for (const ch of chapters) {
  const { cast, voids } = loadChapter(ch);
  if (cast.length < 2) { console.log(`ch${ch}: fewer than 2 cast members, skipping (no real choice to offer)`); continue; }
  const step = Math.max(1, Math.floor(voids.length / perChapter));
  const sample = voids.filter((_, i) => i % step === 0).slice(0, perChapter);
  for (const v of sample) {
    const sentence = raw.slice(v.at[0], v.at[1]).replace(/\s+/g, " ").trim();
    const m = sentence.match(/\b(she|he|it|her|him|they|them)\b/i);
    const pronoun = m ? m[0] : "it";
    const forward = cast;
    const reversed = [...cast].reverse();
    const [pick1, pick2] = await Promise.all([
      ask(buildMessages(sentence, pronoun, forward)),
      ask(buildMessages(sentence, pronoun, reversed)),
    ]);
    const name1 = pick1 === 0 ? "cannot-tell" : pick1 && forward[pick1 - 1] ? forward[pick1 - 1] : "unreadable";
    const name2 = pick2 === 0 ? "cannot-tell" : pick2 && reversed[pick2 - 1] ? reversed[pick2 - 1] : "unreadable";
    let verdict;
    if (name1 === "unreadable" || name2 === "unreadable") verdict = "unreadable";
    else if (name1 === "cannot-tell" && name2 === "cannot-tell") verdict = "no-candidate";
    else if (name1 === name2) verdict = "consistent";
    else verdict = "order-sensitive — refused";
    const entry = { chapter: ch, at: v.at, sentence: sentence.slice(0, 140), pronoun, cast: forward, pick1: name1, pick2: name2, verdict };
    results.push(entry);
    console.log(`ch${ch} @${v.at[0]}: "${pronoun}" in "${sentence.slice(0, 70)}..." — forward=${name1} reversed=${name2} -> ${verdict}`);
  }
}

fs.writeFileSync(path.join(HERE, "results", "witness-referent-results.json"), JSON.stringify(results, null, 1));
const consistent = results.filter((r) => r.verdict === "consistent").length;
const noCand = results.filter((r) => r.verdict === "no-candidate").length;
const refused = results.filter((r) => r.verdict.startsWith("order-sensitive")).length;
const unreadable = results.filter((r) => r.verdict === "unreadable").length;
console.log(`\n${results.length} probes: ${consistent} consistent, ${noCand} no-candidate (honest), ${refused} order-sensitive (refused), ${unreadable} unreadable`);
