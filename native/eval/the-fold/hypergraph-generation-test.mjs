// eval/hypergraph-generation-test.mjs — fire the REAL fold pipeline (surf,
// fold, holonic turn, correction loop, relation tier) against model generation
// over real material. Shows what the hypergraph catches that token-level
// checks miss, across multi-turn conversation with accumulated context.
//
//   node eval/hypergraph-generation-test.mjs [model] [turns]
//   node eval/hypergraph-generation-test.mjs gemma2:2b 5
//   node eval/hypergraph-generation-test.mjs qwen2.5:14b-instruct-q4_K_M 5

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { runHolonicTask, needsDecomposition } from "../holon.js";
import { makeCastResolver } from "../cast.js";
import { makeRelationReader, relationFindings, relationsClean } from "../hypergraph.js";
import {
  FOLD_SCHEMA, FOLD_SYSTEM_PROMPT, RECENCY_WINDOW,
  addWarrantRecord, buildRecordSystemMessage, buildSummarySystemMessage,
  buildSummaryUpdatePrompt, buildTurnMessages, buildWarrantRecord,
  charCount, emptySummary, mechanicalFoldLine, updateSummaryWithFold,
} from "../fold.js";
import { buildSourceBlock, checkCitations, chunkSource, openQuestions, retrieve } from "../source.js";
import { checkGrounding, unsupportedClaims } from "../grounding.js";
import { attribute, attributedRefs } from "../cite.js";
import { CONSTITUTION_PROMPT } from "../constitution.js";

import { lineIndex, outlineOfIndex } from "../../eoreader6.1/packages/engine/perceiver/text/segments.js";
import { splitSentences as engineSentences } from "../../eoreader6.1/packages/engine/perceiver/text/spans.js";
import {
  extractSurfaces, discoverReferents, namesCorefer, diaNorm,
} from "../../eoreader6.1/packages/engine/perceiver/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader6.1/packages/engine/perceiver/text/relations.js";
import { tokenize } from "../source.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OLLAMA = process.env.FOLD_OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.argv[2] ?? "gemma2:2b";
const TURNS = Number(process.argv[3] ?? 5);
const ANSWER_MAX_TOKENS = 512;
const FOLD_MAX_TOKENS = 300;

// ── the exact organ bundle app.js builds at app.js:208-259 ───────────────────

const castFor = makeCastResolver({
  splitSentences: engineSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
});

const relationsFor = makeRelationReader({
  splitSentences: engineSentences,
  extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations, tokenize,
});

// ── material ────────────────────────────────────────────────────────────────

const SOURCE_NAME = "pg2600.txt";
const text = readFileSync(join(HERE, "..", SOURCE_NAME), "utf8");
const discoverBoundaries = (t) => {
  try {
    const out = outlineOfIndex(lineIndex(t), { max: 5000 });
    if (out.gap || out.headings.length < 2) return null;
    return out.headings.map((h) => ({ start: h.start, end: h.end, label: h.label }));
  } catch { return null; }
};
const chunks = chunkSource(SOURCE_NAME, text, { boundaries: discoverBoundaries(text) });

// ── model call (same shape as proxy-runner.mjs) ─────────────────────────────

function makeOllamaCall(model, usage) {
  return async function call(messages, { maxTokens, json } = {}) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${OLLAMA}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            messages,
            stream: false,
            ...(json ? { format: json === true ? "json" : json } : {}),
            options: { num_predict: maxTokens ?? ANSWER_MAX_TOKENS },
          }),
        });
        if (!res.ok) throw new Error(`ollama ${res.status}`);
        const data = await res.json();
        usage.promptTokens += data.prompt_eval_count ?? 0;
        usage.completionTokens += data.eval_count ?? 0;
        return data.message?.content ?? "";
      } catch (err) {
        if (attempt === 1) throw err;
      }
    }
  };
}

// ── questions ────────────────────────────────────────────────────────────────

const QUESTIONS = [
  "Who is Pierre Bezukhov and what happens to him?",
  "What happens at the duel with Dolokhov?",
  "Who does Natasha marry in the end?",
  "What does Prince Andrew see at Austerlitz?",
  "How does Moscow burn and who orders it?",
];

// ── the run ──────────────────────────────────────────────────────────────────

mkdirSync(join(HERE, "results"), { recursive: true });
const outPath = join(HERE, "results", `hypergraph-gen-${process.pid}.jsonl`);
writeFileSync(outPath, "");

console.log(`hypergraph × generation test — model: ${MODEL}, turns: ${TURNS}`);
console.log(`corpus: ${SOURCE_NAME} (${chunks.length} passages)`);
console.log(`writing ${outPath}\n`);

const state = { summary: emptySummary(), history: [] };
const asked = [];

for (let turn = 1; turn <= TURNS; turn++) {
  const question = QUESTIONS[(turn - 1) % QUESTIONS.length];
  asked.push(question);
  console.log(`━━━ turn ${turn}: ${question}`);

  const usage = { promptTokens: 0, completionTokens: 0 };
  const call = makeOllamaCall(MODEL, usage);

  // ── run the REAL holonic pipeline: surf → plan → execute → check → fold ──
  const planMode = needsDecomposition(question) ? "model" : "flat";
  const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);

  const result = await runHolonicTask({
    task: question,
    chunks,                    // ← material attached (proxy-runner had [])
    call,
    foldedRefs,
    makeNameResolver: castFor,
    makeRelationReader: relationsFor,  // ← hypergraph wired
    checkLink: null,
    planMode,
    chatHistory: state.history,
    discourse: mechanicalFoldLine(state.history.slice(-2).map(h => h.content).join(" "), ""),
    priorPass: null,
    searchedVoid: null,
  });

  const answerText = result.output;
  console.log(`\nMODEL ANSWER (${answerText.length} chars):\n${answerText.slice(0, 600)}\n`);

  // ── TOKEN-LEVEL CHECKS (what dialogue.mjs does) ─────────────────────────
  const passages = retrieve(chunks, question, 3, foldedRefs);
  const { used } = checkCitations(answerText, passages);
  const grounding = checkGrounding(answerText, passages, { question, resolveName: castFor(passages) });
  const tokenUnsupported = unsupportedClaims(grounding);

  console.log(`TOKEN-LEVEL (atom tier):`);
  console.log(`  cited: ${used.length}  unsupported: ${tokenUnsupported.length}`);
  for (const c of tokenUnsupported.slice(0, 3)) console.log(`    · ${c}`);

  // ── RELATION-TIER (what the hypergraph found) ───────────────────────────
  const hyperUnsupported = result.unsupported ?? [];
  const hyperUnbacked = result.unbacked ?? [];

  console.log(`\nRELATION-TIER (hypergraph, from holonic pipeline):`);
  console.log(`  contradicted/unbound edges driving correction: ${hyperUnsupported.length}`);
  for (const u of hyperUnsupported.slice(0, 5)) console.log(`    · ${u}`);
  console.log(`  unbacked (material silent, ships marked): ${hyperUnbacked.length}`);
  for (const u of hyperUnbacked.slice(0, 3)) console.log(`    · ${u}`);

  // ── HYPERGRAPH vs TOKENS: what did the relation tier catch alone? ────────
  const onlyHypergraph = hyperUnsupported.filter(
    (u) => !tokenUnsupported.some((t) => t.includes(u.slice(0, 20)))
  );
  if (onlyHypergraph.length > 0) {
    console.log(`\n  ⚡ HYPERGRAPH CAUGHT (invisible to token checks):`);
    for (const f of onlyHypergraph) console.log(`    ⚡ ${f}`);
  }

  // ── fold the turn ────────────────────────────────────────────────────────
  state.history.push({ role: "user", content: question }, { role: "assistant", content: answerText });
  const fold = mechanicalFoldLine(question, answerText);
  const record = buildWarrantRecord({
    turn,
    gist: fold,
    channels: result.channels ?? [],
    refs: result.refs ?? [],
    unsupported: hyperUnsupported,
    open: result.open ?? [],
  });
  state.summary = addWarrantRecord(state.summary, record);

  try {
    const raw = await call(
      [
        { role: "system", content: FOLD_SYSTEM_PROMPT },
        { role: "user", content: buildSummaryUpdatePrompt(state.summary, [...(state.summary.folds || []), fold]) },
      ],
      { maxTokens: FOLD_MAX_TOKENS, json: FOLD_SCHEMA },
    );
    state.summary = updateSummaryWithFold(state.summary, fold, raw);
  } catch {
    state.summary = updateSummaryWithFold(state.summary, fold);
  }

  const carried =
    (buildSummarySystemMessage(state.summary)?.length ?? 0) +
    (buildRecordSystemMessage(state.summary)?.length ?? 0) +
    charCount(state.history.slice(-RECENCY_WINDOW));

  const line = {
    turn, question,
    answerChars: answerText.length,
    planMode, parts: result.parts,
    tokenUnsupported: tokenUnsupported.length,
    hyperUnsupported: hyperUnsupported.length,
    hyperUnbacked: hyperUnbacked.length,
    transcript: charCount(state.history),
    carried,
    usage,
  };
  appendFileSync(outPath, JSON.stringify(line) + "\n");
  console.log(
    `\ncarried ${carried.toLocaleString()} / transcript ${charCount(state.history).toLocaleString()}` +
    ` · tokens in=${usage.promptTokens} out=${usage.completionTokens}` +
    ` · plan=${planMode} parts=${result.parts}`,
  );
  console.log("");
}

console.log("done.");
