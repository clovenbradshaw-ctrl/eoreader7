// longform-brief.mjs — the LONGFORM task: a sourced comprehensive brief.
//
//   MODELS=gemma2:2b,anthropic/claude-sonnet-4-6 node benchmarks/longform-brief.mjs
//
// The mouth must write a long-form brief (mode "long": one extended answer,
// ~2600-token budget) covering ALL THREE planted archives from their full
// texts as attachments. Scored mechanically, three ways:
//
//   1. ATOM RECALL — all 20 planted atoms across the three documents: how much
//      of the record survived a long generation (the longform recall curve).
//   2. UNSUPPORTED ENTITIES — capitalized multiword names in the answer that
//      appear NOWHERE in the sources: hallucination candidates, listed
//      verbatim for inspection. A grounded brief should name only what it
//      was given; every invented proper name is a finding.
//   3. TOKEN SHAPE — input/output per arm (longform is where prompt caching
//      and surf precision would show up in the cost curve).
//
// Arms mirror the battery: each MODELS mouth grounded-long, hybrid
// (local notes → frontier long generation), no raw arm (an ungrounded
// longform brief of fictitious archives is confabulation by construction).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ER7 = (process.env.ER7 ?? "http://127.0.0.1:11436").replace(/\/+$/, "");
const ANTHROPIC_URL = (process.env.ER7_ANTHROPIC_URL ?? "https://api.anthropic.com").replace(/\/+$/, "");
const KEY = process.env.ANTHROPIC_API_KEY ?? "";
const MODELS = (process.env.MODELS ?? "gemma2:2b,anthropic/claude-sonnet-4-6")
  .split(",").map((s) => s.trim().replace(/^er7:/, "")).filter(Boolean);
const isFrontier = (m) => /claude|anthropic/i.test(m);
const HYBRID_LOCAL = MODELS.find((m) => !isFrontier(m)) ?? MODELS[0];

const SOURCES = {
  "tallin-archive.txt": `The Tallin Maritime Archive records the winter convoy of 1814, when harbormaster Ilsa Venn ordered seventeen lanterns lit along the harbor of glass to guide the ice-cut ships home. The copper decree of 1814 fixed the pilot's fee at nine copper rings per mast, payable to the Lantern Guild. Venn's deputy, a rope-maker named Tomas Kell, kept the tally on knotted cord: forty-one knots for forty-one ships, and one red knot for the ship that never came, the Meridian Star. The archive's north drawer holds Kell's cord to this day. The Guild's charter, signed by Venn herself, forbids any pilot from raising his fee in wartime. Three guildmasters witnessed the signing: Pell Ostra, Mirelle Voss, and Dunkan Frye.`,
  "vessa-herbarium.txt": `The Vessa Herbarium's third folio describes the glasspetal, a flower that opens only in hail. Curator Odo Marren pressed six specimens in the spring of 1902 and noted the petal count aloud: eleven petals on every bloom, no more, no less. Marren's assistant, a beekeeper called Sella Ives, recorded that the bees would not touch it — "the hive goes silent," she wrote, "when the glasspetal cracks." The folio's margin carries her sketch of a Hive With No Door, dated the third hailstorm of that April. Marren later sent two pressed blooms to the botanist Ilya Sorren in Riga, who confirmed the count by letter on the ninth of May.`,
  "kett-ledger.txt": `Ledger-monk Brother Kett balanced the granary books of Aubergine Hall for thirty years and never once used the word "shortage." His rule, the kett measure, allowed each household a sack of rye per moon and a second sack only when the bell tower showed two shadows at noon. The ledger's final page, in Kett's own hand, forgives a debt of seventy silver spoons owed by the miller Dorra Finch, "paid in full by one honest winter." The spoons were never returned; they hang above the mill door, seventy in a row. Aubergine Hall itself was founded by Abbess Mora Telling, whose founding charter promised "bread without counting" — the promise Kett spent his life quietly breaking, one measured sack at a time.`,
};
const ATOMS = [
  "seventeen lanterns", "harbor of glass", "copper decree of 1814", "nine copper rings per mast", "lantern guild",
  "tomas kell", "forty-one knots", "forty-one ships", "meridian star", "pell ostra", "mirelle voss", "dunkan frye",
  "glasspetal", "opens only in hail", "odo marren", "eleven petals", "sella ives", "hive goes silent",
  "hive with no door", "third hailstorm", "ilya sorren", "ninth of may",
  "brother kett", "kett measure", "sack of rye per moon", "two shadows at noon", "seventy silver spoons",
  "dorra finch", "paid in full by one honest winter", "above the mill door", "seventy in a row",
  "mora telling", "bread without counting",
];
const BRIEF_TASK = `Write a comprehensive reference brief covering all three attached archives in full: the Tallin Maritime Archive, the Vessa Herbarium's third folio, and the granary ledger of Aubergine Hall. One section per archive, with every name, number, date, and rule stated exactly as recorded. Name only what the documents contain — invent nothing.`;

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

// Unsupported entities: capitalized multiword phrases in the answer with no
// normalized substring match in the combined sources. SCOPE (Greenberg):
// English-shaped by construction (Latin capitals, whitespace words) — valid
// for these English archives only, not a universal name detector. Single
// capital words are skipped (sentence starts); the check is deliberately
// strict — every hit is listed verbatim so a human grades the finding, not
// the script.
function unsupportedEntities(answer, sourcesNorm) {
  const found = new Set();
  for (const m of String(answer ?? "").matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)) {
    const phrase = norm(m[1]);
    if (phrase.split(" ").length < 2) continue;
    if (!sourcesNorm.includes(phrase)) found.add(m[1]);
  }
  return [...found];
}

async function askLong(model, sessionId) {
  const res = await fetch(`${ER7}/v1/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-er7-session": sessionId },
    body: JSON.stringify({
      task: BRIEF_TASK, model, mode: "long",
      attachments: Object.entries(SOURCES).map(([name, text]) => ({ name, text })),
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${model}: ${body?.error ?? res.status}`);
  return { text: body.answer ?? "", input: body.usage?.promptTokens ?? 0, output: body.usage?.completionTokens ?? 0, truncated: body.truncated ?? false };
}

async function hybridLong(sessionId, apiModel) {
  const notes = await askLong(HYBRID_LOCAL, `${sessionId}-notes`);
  const res = await fetch(`${ANTHROPIC_URL}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: apiModel, max_tokens: 2600,
      system: "Expand the reading notes below into a comprehensive reference brief, one section per archive, with every name, number, date, and rule stated exactly as recorded. Name only what the notes contain — invent nothing.",
      messages: [{ role: "user", content: `Reading notes:\n${notes.text}\n\nWrite the comprehensive brief.` }],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`hybrid gen: ${body?.error?.message ?? res.status}`);
  return {
    text: (body.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n"),
    input: body.usage?.input_tokens ?? 0, output: body.usage?.output_tokens ?? 0,
    freeNotesChars: notes.text.length, freeInput: notes.input, freeOutput: notes.output,
  };
}

async function main() {
  if (!KEY) throw new Error("ANTHROPIC_API_KEY is required (env only — never in files).");
  const sourcesNorm = norm(Object.values(SOURCES).join("\n"));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const frontier = MODELS.find(isFrontier);
  const apiModel = frontier ? frontier.replace(/^anthropic\//i, "") : "claude-sonnet-4-6";

  const score = (text) => {
    const a = norm(text);
    const hits = ATOMS.filter((atom) => a.includes(norm(atom)));
    return { hits: hits.length, of: ATOMS.length, recall: hits.length / ATOMS.length, entities: unsupportedEntities(text, sourcesNorm) };
  };
  const results = {};
  for (const model of MODELS) {
    const r = await askLong(model, `lf-${stamp}-${model.replace(/[^a-z0-9]+/gi, "-")}`).catch((e) => ({ text: `[ERROR] ${e.message}`, input: 0, output: 0, error: e.message }));
    const s = score(r.text);
    results[`grounded/${model}`] = { ...r, ...s, chars: r.text.length };
    console.log(`grounded/${model}: recall=${s.hits}/${s.of} unsupported-entities=${s.entities.length} in=${r.input} out=${r.output} chars=${r.text.length}${r.truncated ? " TRUNCATED" : ""}${r.error ? ` ERR ${r.error.slice(0, 100)}` : ""}`);
    for (const e of s.entities) console.log(`    UNGROUNDED NAME: ${e}`);
  }
  if (frontier) {
    const h = await hybridLong(`lf-${stamp}-hybrid`, apiModel).catch((e) => ({ text: `[ERROR] ${e.message}`, input: 0, output: 0, error: e.message }));
    const s = score(h.text);
    results[`hybrid/${HYBRID_LOCAL}+${apiModel}`] = { ...h, ...s, chars: h.text.length };
    console.log(`hybrid/${HYBRID_LOCAL}+${apiModel}: recall=${s.hits}/${s.of} unsupported-entities=${s.entities.length} paid-in=${h.input} paid-out=${h.output} chars=${h.text.length} (free notes: ${h.freeNotesChars ?? 0}ch)${h.error ? ` ERR ${h.error.slice(0, 100)}` : ""}`);
    for (const e of s.entities) console.log(`    UNGROUNDED NAME: ${e}`);
  }
  mkdirSync(join(HERE, "results"), { recursive: true });
  const path = join(HERE, "results", `longform-brief-${stamp}.json`);
  writeFileSync(path, JSON.stringify({ at: new Date().toISOString(), atoms: ATOMS.length, results }, null, 2));
  console.log(`\nwrote ${path}`);
}

await main();
