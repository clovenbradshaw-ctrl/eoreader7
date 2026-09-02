// eval/witness-paraphrase-corpus.mjs — the same paraphrase battery as
// witness-paraphrase.mjs, but through the REAL production pipeline at
// corpus scale instead of a hand-picked 9KB excerpt: chunkSource() over
// the whole book (paragraph-grain, byte-addressed — source.js's own
// chunker, no shortcut), retrieve() per item exactly as app.js does for a
// live turn (term-overlap ranking against the item's own words, never a
// grep I chose by hand), and only the RETRIEVED passages handed to the
// witness. This is "properly read": the witness never sees more of the
// book than a real turn would surface, and it sees it addressed the way a
// real turn addresses it (chunk.ref/chunk.start/chunk.end).
//
// Material: War and Peace (pg2600.txt, 3.3MB, gitignored — read from disk,
// never copied into a fixture). Battery: sixteen War-and-Peace facts
// (verbatim / passive / role-reversed / rearranged / synonym-verb shapes,
// each paired with a FALSE twin), truth fixed here before the run, mirroring
// witness-paraphrase.mjs's own discipline on the small excerpt.
import { readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const T = await import(`${NATIVE}/organs/index.js`);
const { witnessSentences } = await import(`${NATIVE}/organs/witness-sentences.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { createLemmatizer, morphologyFromPrior } = await import(`${NATIVE}/adapters/text/morphology.js`);
const { chunkSource, retrieve } = await import(`${FOLD}/source.js`);

const OLLAMA = "http://localhost:11434";
const MODELS = (process.env.MODELS ?? "gemma2:2b").split(",");
const LIMIT = Number(process.env.LIMIT ?? 3); // passages per question — app.js's own default retrieval width

const bookPath = process.env.BOOK ?? `${FOLD}/../pg2600.txt`;
const bookText = readFileSync(bookPath, "utf8");
const prior = morphologyFromPrior(JSON.parse(readFileSync(`${NATIVE}/eval/the-fold/fixtures/unimorph-morphology-prior.json`, "utf8")));
const sameForm = createLemmatizer(prior.forms, { language: prior.language }).sameAct;

console.log(`chunking ${bookPath} (${bookText.length} chars)...`);
const t0 = Date.now();
const chunks = chunkSource("pg2600.txt", bookText, {});
console.log(`  ${chunks.length} chunks, ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// [id, question (real words a turn would ask), sentence to witness, truth, shape, end1, end2]
export const BATTERY = [
  [1, "who was appointed commander in chief to replace after Kutúzov", "The committee replaced someone with Kutúzov as commander in chief.", "ENTAILED", "role-reversed", "committee", "Kutúzov"],
  [2, "Kutúzov appointed commander in chief full powers armies", "Kutúzov was appointed commander in chief with full powers over the armies.", "ENTAILED", "near-verbatim", "Kutúzov", "commander in chief"],
  [3, "Kutúzov appointed commander in chief full powers armies", "Kutúzov replaced someone else as commander in chief.", "FALSE", "role-reversed-false", "Kutúzov", "commander in chief"],
  [4, "French army crossed the Niemen invasion", "The French army crossed the Niemen at the start of the invasion.", "ENTAILED", "near-verbatim", "French", "Niemen"],
  [5, "French army crossed the Niemen invasion", "The Niemen was crossed by the Russian army.", "FALSE", "swapped-agent", "Niemen", "Russian"],
  [6, "Bagratión wounded flèches captured retaken", "Prince Bagratión was wounded when the flèches were retaken.", "ENTAILED", "rearranged", "Bagratión", "flèches"],
  [7, "Bagratión wounded flèches captured retaken", "Kutúzov was wounded when the flèches were retaken.", "FALSE", "swapped-subject", "Kutúzov", "flèches"],
  [8, "Moscow was burned by its inhabitants", "Moscow was burned by the people who had abandoned it.", "ENTAILED", "near-verbatim", "Moscow", "inhabitants"],
  [9, "Moscow was burned by its inhabitants", "Moscow was burned by the French army.", "FALSE", "swapped-agent", "Moscow", "French"],
  [10, "Prince Andrew fatally wounded left care inhabitants district", "Prince Andrew was left in the care of the local people after being fatally wounded.", "ENTAILED", "passive", "Andrew", "wounded"],
  [11, "Prince Andrew fatally wounded left care inhabitants district", "Prince Andrew died instantly on the battlefield.", "FALSE", "unheard-verb", "Andrew", "battlefield"],
  [12, "Countess Hélène Bezúkhova suddenly died terrible", "Hélène Bezúkhova suddenly died.", "ENTAILED", "near-verbatim", "Hélène", "died"],
  [13, "Countess Hélène Bezúkhova suddenly died terrible", "Natásha Rostova suddenly died.", "FALSE", "swapped-subject", "Natásha", "died"],
  [14, "Natásha engaged brother sister of course out of question", "Natásha was engaged to marry a certain man's brother.", "ENTAILED", "rearranged", "Natásha", "engaged"],
  [15, "Natásha engaged brother sister of course out of question", "Natásha was engaged to marry Pierre.", "FALSE", "swapped-object", "Natásha", "Pierre"],
  [16, "Emperor's dislike Kutúzov committee advise appointment", "The committee advised the Emperor to appoint Kutúzov despite his dislike of him.", "ENTAILED", "role-reversed", "committee", "Emperor"],
];

let calls = 0;
function organsFor(model) {
  const chat = async (messages, schema) => {
    calls += 1;
    const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) });
    return (await res.json())?.message?.content ?? "";
  };
  const ask = async (s, slice) => T.readTestimony(await chat(T.buildWitnessMessages(s, slice), T.WITNESS_SCHEMA));
  const selectAsk = async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } };
  const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect, sameForm };
  return { ask, selectAsk, testimony, splitSentences };
}

for (const model of MODELS) {
  calls = 0; const tm0 = Date.now();
  const organs = organsFor(model);
  const rows = [];
  for (const [id, question, sentence, truth, shape, e1, e2] of BATTERY) {
    const passages = retrieve(chunks, question, LIMIT).map((c) => ({ text: c.text, ref: c.ref, start: c.start, end: c.end }));
    const claims = [{ sentence, end1: e1, end2: e2, verdict: "unbound" }];
    let row;
    if (!passages.length) {
      row = { sentence, witness: "skipped", why: "retrieve() found nothing for this question" };
    } else {
      const r = await witnessSentences([sentence], claims, passages, { ...organs, maxAsks: 1 });
      row = r.rows[0];
    }
    rows.push({ id, truth, shape, sentence, question, passageCount: passages.length,
      passageRefs: passages.map((p) => `${p.ref}#${p.start}-${p.end}`),
      witness: row.witness, why: row.why ?? null, via: row.via ?? null, decider: row.decider ?? null });
  }
  const ent = rows.filter((r) => r.truth === "ENTAILED"), fal = rows.filter((r) => r.truth === "FALSE");
  const lies = fal.filter((r) => r.witness === "states");
  console.log(`\n== ${model} · corpus=${bookPath.split("/").pop()} (${chunks.length} chunks, limit ${LIMIT}) · ${calls} calls · ${((Date.now() - tm0) / 1000).toFixed(0)}s`);
  for (const r of rows) {
    const mark = r.truth === "ENTAILED" ? (r.witness === "states" ? "✓" : "·") : (r.witness === "states" ? "✗ LIE" : "✓");
    console.log(`  ${String(r.id).padStart(2)} ${r.truth.padEnd(8)} ${r.shape.padEnd(20)} ${r.witness.padEnd(8)} ${mark}  found ${r.passageCount} passage(s)  ${r.sentence}`);
    if (r.passageCount === 0) console.log(`       (no chunk shared enough terms with: "${r.question}")`);
    else if (r.witness === "states") console.log(`       ← [${r.passageRefs[0]}] ${String(r.decider).replace(/\s+/g, " ").slice(0, 110)}`);
    else if (r.why) console.log(`       (${r.why}${r.via ? ` · via ${r.via}` : ""})  retrieved: ${r.passageRefs.join(", ")}`);
  }
  console.log(`  ENTAILED read states: ${ent.filter((r) => r.witness === "states").length}/${ent.length} (of which retrieval found nothing: ${ent.filter((r) => r.passageCount === 0).length})` +
    `   FALSE read states (LIES): ${lies.length}/${fal.length}` +
    `   refused-by-model ${rows.filter((r) => r.witness === "refused").length} · skipped ${rows.filter((r) => r.witness === "skipped").length}`);
}
