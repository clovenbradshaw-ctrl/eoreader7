// eval/dialogue.mjs — two mouths, one instrument, N messages.
//
// An ASKER reads each answer and asks the next question; an ANSWERER runs
// the full fold turn — retrieval on the question's own words, one bounded
// system message, mechanical checks (citations, grounding with the cast
// resolver, null-gated attribution), a warrant record where a check ran, a
// typed gap where none could, and the capped summary refresh. Exactly the
// turn app.js runs, headless — the pure modules ARE the app, which is the
// point of their purity.
//
// What this measures is the fold's central claim at real length: the
// transcript grows without limit, the carried context does not, and a
// record's address still resolves after the paraphrase has forgotten. Every
// turn's evidence is written to JSONL as it lands, so the run is scoreable
// afterward and resumable in analysis even if the model dies mid-run.
//
//   node eval/dialogue.mjs [messages] [deep model] [fast model]
//   node eval/dialogue.mjs 100 gemma2:2b
//   node eval/dialogue.mjs 100 qwen2.5:14b-instruct-q4_K_M
//
// Model routing is the app's own ladder (model-routing.js): plain turns, the
// asker, and the summary refresh spend the FAST rung; the DEEP model is spent
// only where the app spends it — a task, a decomposed question, /reflect. A
// run that names a big model does not spend it on the little questions.
// Override both explicitly to force everything onto one model.
//
// Budgets, named: answers are capped at ANSWER_MAX_TOKENS for throughput —
// this eval measures grounding and the fold, not eloquence — and the
// asker's question at QUESTION_MAX_TOKENS because a question is one
// sentence. Neither is a quality threshold; both are the run's own bounds.

import { writeFileSync, appendFileSync, readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  FOLD_SCHEMA,
  FOLD_SYSTEM_PROMPT,
  RECENCY_WINDOW,
  addWarrantRecord,
  buildRecordSystemMessage,
  buildSummarySystemMessage,
  buildSummaryUpdatePrompt,
  buildTurnMessages,
  buildWarrantRecord,
  charCount,
  emptySummary,
  mechanicalFoldLine,
  updateSummaryWithFold,
} from "../fold.js";
import { buildSourceBlock, checkCitations, chunkSource, openQuestions, retrieve } from "../source.js";
import { checkGrounding, unsupportedClaims } from "../grounding.js";
import { attribute, attributedRefs } from "../cite.js";
import { CONSTITUTION_PROMPT } from "../constitution.js";
import { makeCastResolver } from "../cast.js";
import { ROUTE_KINDS, routeModel } from "../model-routing.js";

// The engine's own organs, by relative path — same organs the page loads
// from /engine, same boundary discovery app.js runs.
import { lineIndex, outlineOfIndex } from "../../eoreader6/packages/engine/perceiver/text/segments.js";
import { splitSentences as engineSentences } from "../../eoreader6/packages/engine/perceiver/text/spans.js";
import {
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
} from "../../eoreader6/packages/engine/perceiver/text/surfaces.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OLLAMA = "http://localhost:11434";
const MESSAGES = Number(process.argv[2] ?? 100);
// The routing ladder, same as the app: MODEL is the deep rung (spent by a
// task, decomposed question, /reflect), FAST is the fastest rung for plain
// turns, the asker, and the summary refresh. A run that names a big model
// does not spend it on the little questions.
const MODEL = process.argv[3] ?? "gemma2:2b";
const FAST = process.argv[4] ?? routeModel(ROUTE_KINDS.FLAT, { selected: MODEL });
const ANSWER_MAX_TOKENS = 512;
const QUESTION_MAX_TOKENS = 100;
const FOLD_MAX_TOKENS = 300;

const castFor = makeCastResolver({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
});

// ── the corpus, cut exactly as the page cuts it ─────────────────────────────

const SOURCE_NAME = "pg2600.txt";
const text = readFileSync(join(HERE, "..", SOURCE_NAME), "utf8");
const discoverBoundaries = (t) => {
  try {
    const out = outlineOfIndex(lineIndex(t), { max: 5000 });
    if (out.gap || out.headings.length < 2) return null;
    return out.headings.map((h) => ({ start: h.start, end: h.end, label: h.label }));
  } catch {
    return null;
  }
};
const chunks = chunkSource(SOURCE_NAME, text, { boundaries: discoverBoundaries(text) });

// ── one model call, with one retry and a typed failure ──────────────────────

async function call(messages, { maxTokens, json, model } = {}) {
  const modelName = model ?? MODEL;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${OLLAMA}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: modelName,
          messages,
          stream: false,
          ...(json ? { format: json === true ? "json" : json } : {}),
          options: { num_predict: maxTokens ?? ANSWER_MAX_TOKENS },
        }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      return (await res.json()).message?.content ?? "";
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
}

// ── the asker ────────────────────────────────────────────────────────────────
//
// A language job and nothing else: read the last answer, ask one question.
// The question is EXTRACTED mechanically (first "?"-terminated sentence);
// a reply with no question in it falls back to the seed rotation — typed in
// the log as such, never silently skipped.

const ASKER_PROMPT =
  "You are reading a researcher's answers about a long Russian novel, one at a time. After each answer, ask the next question — exactly one sentence, ending with a question mark. Ask about something specific the answer mentions, or something it leaves open. Plain prose.";

const SEEDS = [
  "Who is Pierre Bezukhov?",
  "What happens at the duel with Dolokhov?",
  "What does Natasha do at her first grand ball?",
  "What does Prince Andrew see in the sky at Austerlitz?",
  "How does Moscow burn?",
  "What becomes of Pierre's marriage to Helene?",
  "Who is Kutuzov and what does he believe about battles?",
  "What is the comet of 1812 taken to mean?",
];
let seedIndex = 0;

function extractQuestion(reply) {
  const m = String(reply ?? "").match(/[^?]*\?/s);
  return m ? m[0].trim().replace(/\s+/g, " ") : null;
}

async function nextQuestion(lastAnswer, asked) {
  if (!lastAnswer) return { question: SEEDS[seedIndex++ % SEEDS.length], basis: "seed" };
  const recent = asked.slice(-8).map((q) => `- ${q}`).join("\n");
  const reply = await call(
    [
      { role: "system", content: ASKER_PROMPT },
      {
        role: "user",
        content: `The answer just given:\n${lastAnswer.slice(0, 2000)}\n\nQuestions already asked — do not repeat these:\n${recent}\n\nAsk the next question.`,
      },
    ],
    { maxTokens: QUESTION_MAX_TOKENS, model: FAST },
  );
  const q = extractQuestion(reply);
  if (q && !asked.includes(q)) return { question: q, basis: "asker" };
  return { question: SEEDS[seedIndex++ % SEEDS.length], basis: "seed-fallback" };
}

// ── the answerer: app.js's send(), headless ─────────────────────────────────

const state = { summary: emptySummary(), history: [] };

function measure() {
  return {
    transcript: charCount(state.history),
    carried:
      (buildSummarySystemMessage(state.summary)?.length ?? 0) +
      (buildRecordSystemMessage(state.summary)?.length ?? 0) +
      charCount(state.history.slice(-RECENCY_WINDOW)),
  };
}

async function answer(question) {
  const foldedRefs = (state.summary.records || []).flatMap((r) => r.refs);
  const passages = retrieve(chunks, question, 3, foldedRefs);
  const sourceBlock = buildSourceBlock(passages);
  const messages = buildTurnMessages({
    basePrompt: CONSTITUTION_PROMPT,
    summary: state.summary,
    history: state.history,
    question,
    sourceBlock,
  });

  const text = await call(messages, { maxTokens: ANSWER_MAX_TOKENS, model: FAST });
  state.history.push({ role: "user", content: question }, { role: "assistant", content: text });

  const { used, unsupported } = checkCitations(text, passages);
  const grounding = checkGrounding(text, passages, { question, resolveName: castFor(passages) });
  const attributions = attribute(text, passages, chunks);
  const attributed = attributedRefs(attributions);
  const grounded = [...new Set([...used, ...attributed])];
  const open = openQuestions(question, passages, grounded);

  const turn = state.summary.turnCount + 1;
  const fold = mechanicalFoldLine(question, text);
  const record = passages.length
    ? buildWarrantRecord({
        turn,
        gist: fold,
        channels: [...(used.length ? ["cited"] : []), ...(attributed.length ? ["attributed"] : [])],
        refs: grounded,
        unsupported: [...unsupported, ...unsupportedClaims(grounding)],
        open,
      })
    : null;
  if (record) state.summary = addWarrantRecord(state.summary, record);

  try {
    const raw = await call(
      [
        { role: "system", content: FOLD_SYSTEM_PROMPT },
        { role: "user", content: buildSummaryUpdatePrompt(state.summary, [...(state.summary.folds || []), fold]) },
      ],
      { maxTokens: FOLD_MAX_TOKENS, json: FOLD_SCHEMA, model: FAST },
    );
    state.summary = updateSummaryWithFold(state.summary, fold, raw);
  } catch {
    state.summary = updateSummaryWithFold(state.summary, fold);
  }

  return { text, passages: passages.map((p) => p.ref), grounded, unsupported: record?.unsupported ?? [], open, record: !!record };
}

// ── the run ─────────────────────────────────────────────────────────────────

mkdirSync(join(HERE, "results"), { recursive: true });
const stamp = process.env.DIALOGUE_STAMP ?? String(process.pid);
const outPath = join(HERE, "results", `dialogue-${stamp}.jsonl`);
writeFileSync(outPath, "");
console.log(`dialogue: ${MESSAGES} messages — deep ${MODEL}, fast ${FAST} — corpus ${SOURCE_NAME} (${chunks.length} passages)`);
console.log(`writing ${outPath}`);

const asked = [];
let lastAnswer = null;
const started = Date.now();

for (let msg = 1; msg <= MESSAGES; ) {
  const { question, basis } = await nextQuestion(lastAnswer, asked);
  asked.push(question);
  msg++; // the asker's message

  let a;
  try {
    a = await answer(question);
  } catch (err) {
    appendFileSync(outPath, JSON.stringify({ msg, question, error: String(err?.message ?? err) }) + "\n");
    console.log(`msg ${msg}: ERROR ${err?.message ?? err}`);
    msg++;
    lastAnswer = null;
    continue;
  }
  msg++; // the answerer's message
  lastAnswer = a.text;

  const m = measure();
  const line = {
    msg,
    turn: state.summary.turnCount,
    basis,
    question,
    answerChars: a.text.length,
    passages: a.passages,
    grounded: a.grounded,
    unsupported: a.unsupported,
    open: a.open,
    record: a.record,
    transcript: m.transcript,
    carried: m.carried,
  };
  appendFileSync(outPath, JSON.stringify(line) + "\n");
  console.log(
    `msg ${msg}/${MESSAGES} · turn ${line.turn} · ${basis} · refs ${a.grounded.length}` +
      (a.unsupported.length ? ` · unsupported ${a.unsupported.length}` : "") +
      (a.open.length ? ` · open ${a.open.length}` : "") +
      ` · carried ${m.carried.toLocaleString()} / transcript ${m.transcript.toLocaleString()}`,
  );
}

// ── the summary, computed from the file just written ────────────────────────

const rows = readFileSync(outPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
const ok = rows.filter((r) => !r.error);
const withRefs = ok.filter((r) => r.grounded?.length);
const withUnsupported = ok.filter((r) => r.unsupported?.length);
const last = ok[ok.length - 1];
console.log("\n— run summary —");
console.log(`turns: ${ok.length} (${rows.length - ok.length} errored)`);
console.log(`turns with grounded addresses: ${withRefs.length}/${ok.length}`);
console.log(`turns with unsupported claims on record: ${withUnsupported.length}/${ok.length}`);
console.log(`asker questions: ${rows.filter((r) => r.basis === "asker").length}, seeds: ${rows.filter((r) => r.basis !== "asker").length}`);
console.log(`final transcript ${last.transcript.toLocaleString()} chars; carried ${last.carried.toLocaleString()} chars`);
console.log(`elapsed ${Math.round((Date.now() - started) / 1000)}s`);
