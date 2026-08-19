// eval/adversarial-dialogue.mjs — two mouths, two folds, two belief graphs.
//
// dialogue.mjs runs one asker and one answerer against a fixed corpus. This
// runs two OPPOSED speakers against each other: each gets its own fold
// instance (fold.js's own state shape, unmodified — "context stays bounded
// per speaker exactly the way it already is for one"), its own accumulated
// utterances as its own retrieval corpus (source.js's retrieve(), reused
// verbatim), and its own evolving belief graph (hypergraph.js's
// makeRelationReader, reused verbatim — the material fed to it is simply
// the speaker's own words this time, not a book).
//
// What this measures, per the brief this implements: not that the speakers
// sound like they are engaging (gameable — a model that has learned what
// engagement sounds like passes that test for free) but that a SPECIFIC
// edge in one speaker's graph shows up, mechanically, in the other's graph
// afterward and survives to the transcript's own last turn — or is
// explicitly contradicted, and THAT survives. dialogue-graph.js is the one
// new instrument this required; everything else here is the same organs
// dialogue.mjs already threads together, run twice.
//
// WHAT THIS DOES NOT PROVE (state it here, not just in the report): a
// surviving edge shows a graph changed and traces to a specific prior
// utterance. It does not and cannot show WHY — model reasoning versus a
// small model's general tendency to drift toward whatever it last read
// under adversarial framing is beyond this instrument's reach, the same way
// an unresolved pronoun is beyond hypergraph.js's reach today.
//
//   node eval/adversarial-dialogue.mjs [turns] [deep model] [fast model]
//   node eval/adversarial-dialogue.mjs 16 gemma2:2b

import { writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  RECENCY_WINDOW,
  FOLD_SCHEMA,
  FOLD_SYSTEM_PROMPT,
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
  advanceSummaryFold,
} from "../fold.js";
import { buildSourceBlock, retrieve, tokenize as sourceTokenize } from "../source.js";
import { makeRelationReader } from "../hypergraph.js";
import { ROUTE_KINDS, routeModel } from "../model-routing.js";
import { classifyCrossGraphEdges, activeWindow, makeReferentIndex, edgesMatch } from "../dialogue-graph.js";

// Same organs, same relative path, dialogue.mjs's own precedent (the
// cast.js injection pattern: engine functions arrive as arguments so this
// module stays loadable from node without a browser DOM).
import { splitSentences as engineSentences } from "../../eoreader6.1/packages/engine/perceiver/text/spans.js";
import {
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
} from "../../eoreader6.1/packages/engine/perceiver/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader6.1/packages/engine/perceiver/text/relations.js";
import { tokenize as engineTokenize } from "../../eoreader6.1/packages/engine/perceiver/text/material.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OLLAMA = "http://localhost:11434";

const TURNS = Number(process.argv[2] ?? 16); // alternating replies AFTER both opening seeds
const MODEL = process.argv[3] ?? "gemma2:2b";
const FAST = process.argv[4] ?? routeModel(ROUTE_KINDS.FLAT, { selected: MODEL });
const ANSWER_MAX_TOKENS = 400;
const FOLD_MAX_TOKENS = 300;

// The reach of the present, converted for a SINGLE speaker's own turns —
// app.js:1950's own precedent, reused rather than a new number: "a ledger
// paragraph is one turn — two messages — so the recency slice is
// RECENCY_WINDOW/2 paragraphs." Here one speaker's own utterance is that
// paragraph; RECENCY_WINDOW/2 of them is the same declared present, converted.
const GRAPH_WINDOW = Math.floor(RECENCY_WINDOW / 2);

const organs = {
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
  discoverRelationVocab,
  extractRelations,
  tokenize: engineTokenize,
};
const readerFor = makeRelationReader(organs);
const referentIndexFor = makeReferentIndex(organs);

// ── the topic: two real, checkable historical positions ────────────────────
//
// Per the brief's own open question: a plain stated position, not a
// live_priors document pair, for this first run — disclosed here rather
// than pretended to be more than it is. Chosen for real, checkable content
// (dates, casualty figures, named events) so the online-grounding pass has
// actual claims to check against third parties, not opinion.
//
// Second topic (2026-08-18), swapped in after the first (Napoleon's 1812
// campaign) — a live, genuinely contested historiographical debate
// (traditionalist vs. revisionist), different domain and texture on
// purpose, to check whether the coherence collapse measured on the first
// topic was topic-specific or general. TOPIC_SUBJECT is the only string
// debatePrompt needs to name the debate; swapping topics again means
// editing this block, nothing downstream.

const TOPIC_SUBJECT = "whether the atomic bombings of Hiroshima and Nagasaki were necessary to end the Second World War";

const NECESSITY_STANCE =
  "The atomic bombings were necessary and ultimately saved lives: Japan's Supreme War Council remained deadlocked even after Hiroshima was destroyed on August 6, 1945, and it took the shock of the second bomb at Nagasaki on August 9 — the same day the Soviet Union declared war — to break the deadlock and force Emperor Hirohito's personal intervention. The planned invasion of the home islands, Operation Downfall, was projected to cost far more lives on both sides than the bombs did, on top of the roughly 100,000 people already dying every month the war continued.";
const DIPLOMACY_STANCE =
  "The bombs were not what ended the war — Japan's military position had already collapsed, and it was the Soviet Union's entry into the war on August 8, 1945 that broke the deadlock, not Hiroshima two days earlier. Japan's leadership had been seeking a negotiated surrender through Moscow since at least June 1945, its navy and air force were already destroyed, and its cities were already being firebombed nightly at a comparable human cost to the atomic strikes.";

const NECESSITY_SEED =
  "The atomic bombings of Hiroshima and Nagasaki were necessary and ultimately saved lives. Japan's Supreme War Council remained deadlocked even after Hiroshima was destroyed on August 6, 1945; military hardliners were still pushing to fight on, and it took the shock of a second bomb at Nagasaki on August 9, compounding the same day's Soviet declaration of war, to break the deadlock and force Emperor Hirohito's personal intervention. Absent the bombs, the planned invasion of the Japanese home islands, Operation Downfall, was projected by U.S. planners to cost hundreds of thousands of American casualties and far more Japanese lives, on top of the roughly one hundred thousand people already dying in the Pacific theater every month the war continued.";
const DIPLOMACY_SEED =
  "The atomic bombs were not what ended the war — Japan's military position had already collapsed, and it was the Soviet Union's entry into the war on August 8, 1945 that broke the deadlock, not Hiroshima two days earlier. Japan's leadership had been seeking a negotiated surrender through Moscow since at least June 1945, its navy and air force were already destroyed, and its cities were already being firebombed nightly with comparable casualties to the atomic strikes. The bombs' main effect was as much diplomatic, aimed at shaping the postwar balance with the Soviets, as it was military — and the roughly two hundred thousand dead by the end of 1945 between both cities was not the war-shortening necessity it was later claimed to be.";

function debatePrompt(speaker, opponent) {
  return (
    `You are ${speaker.name} in a structured debate about ${TOPIC_SUBJECT}. ` +
    `Your position: ${speaker.stance} ` +
    `${opponent.name} just made a specific claim, shown to you below as MATERIAL drawn from your own earlier statements because it bears on what they said. ` +
    `Answer them directly — extend the point if it strengthens your case, concede where the evidence runs against you, or dispute it with your own reasoning — never repeat your opening position unchanged as if they had not spoken. One paragraph, plain prose.`
  );
}

// ── one model call, with one retry and a typed failure — dialogue.mjs's own ─

async function call(messages, { maxTokens, json, model, temperature } = {}) {
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
          options: { num_predict: maxTokens ?? ANSWER_MAX_TOKENS, ...(temperature != null ? { temperature } : {}) },
        }),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      return (await res.json()).message?.content ?? "";
    } catch (err) {
      if (attempt === 1) throw err;
    }
  }
}

// ── mechanical repetition detection ─────────────────────────────────────────
//
// Measured live on this exact harness (2026-08-18): gemma2:2b and
// qwen2.5:14b both, independently, degenerated into reproducing a PRIOR
// reply — sometimes the opponent's, sometimes their own — byte for byte,
// and once that happens the loop is a stable fixed point (today's output
// becomes tomorrow's "question", so an exact repeat never breaks on its
// own).
//
// Deliberately NOT sentence-splitting (dropped after the first version of
// this fix, by user direction: "not overly dedicated to NL, the
// universality is what gives stability"). A sentence is an English-prose
// concept; leaning on it here would mean this check only ever works on
// English prose, and needs a parallel special case for every other
// register or language this harness might one day carry. Whole-string
// equality after whitespace normalization needs no linguistic structure
// at all — it is the same check that already found the run of six
// byte-identical turns in the diagnostic pass, run live instead of after
// the fact. Narrower in what it catches (a partial, one-paragraph borrow
// slips through) but that narrowness is disclosed, not hidden: it is
// exactly the failure this harness has actually measured, twice,
// independently, and needs no invented similarity threshold to name it —
// two strings are equal or they are not.
function normalizeForCompare(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

function exactReplyRepeat(newText, priorTexts) {
  const n = normalizeForCompare(newText);
  if (!n) return false;
  return priorTexts.some((p) => normalizeForCompare(p) === n);
}

/**
 * The deeper failure exact-repeat detection cannot see: measured live on
 * BOTH topics (Napoleon's 1812 campaign, then independently the atomic-
 * bombings debate), gemma2:2b drifted into sycophantic-opener + vague,
 * referent-poor abstraction — "a pressure cooker," "a confluence of
 * factors" — that starves hypergraph.js's own extractor down to zero
 * measurable edges, turn after turn, with NOTHING literally repeated. A
 * second NL-pattern detector (a "sycophantic opener" regex, a vagueness
 * score) would be exactly the un-universal patch this instrument's own
 * design already argues against — so this reuses the SAME structural
 * instrument the whole harness already stands on, dialogue-graph.js's own
 * edgesMatch, one step earlier in the pipeline than its usual post-hoc use.
 *
 * The gate: does the candidate reply's own OWN newly-extracted edges add
 * anything the speaker's own immediately-prior turn did not already
 * establish? Not "does this turn have few edges" — hypergraph.js's own
 * stated philosophy is that low structure is a typed gap, not
 * automatically a defect (a turn can legitimately have little new to
 * say), and gating on an absolute floor would punish exactly the honest,
 * modest turns that philosophy protects. Gating on "strictly no edge not
 * already in the immediately-prior snapshot" targets only genuine
 * standstill — the graph did not move at all — which a legitimately thin
 * but NEW turn does not trigger (any single fresh, resolvable claim clears
 * it), and an empty-of-content turn does (nothing to compare, nothing new
 * to find).
 */
function noNewEdgesVsPrior(candidateText, priorEdges, priorTexts, transcriptSoFar) {
  if (!priorEdges.length) return false; // nothing established yet to have failed to add to
  const candidateReader = readerFor([{ ref: "candidate", text: candidateText }], {
    pool: sentencePool(transcriptSoFar + "\n\n" + candidateText),
  });
  if (!candidateReader.edges.length) return true; // extraction found nothing at all — the instrument's own measure of standstill
  const sharedIndex = referentIndexFor([{ text: [...priorTexts, candidateText].join("\n\n") }]);
  return candidateReader.edges.every((ce) => priorEdges.some((pe) => edgesMatch(sharedIndex, diaNorm, ce, pe)));
}

function degeneracyReason(text, priorTexts, priorEdges, transcriptSoFar) {
  if (exactReplyRepeat(text, priorTexts)) return "exact-repeat";
  if (noNewEdgesVsPrior(text, priorEdges, priorTexts, transcriptSoFar)) return "no-new-edges";
  return null;
}

const REPETITION_RETRIES = 2;
// Retry temperature: high enough to escape a fixed point, still declared
// and named rather than tuned against an outcome — the same posture
// arithmetic.js and the routing ladder take toward every other number in
// this repo. Ollama's own default (no temperature sent) is what attempt 0
// always uses; only a DETECTED repeat spends this.
const REPETITION_RETRY_TEMPERATURE = 1.1;

// ── a speaker: its own fold, its own utterances, its own evolving graph ────

function makeSpeaker(name, stance) {
  return {
    name,
    stance,
    fold: { summary: emptySummary(), history: [] },
    rawText: "",
    utterances: [], // [{turn, text, ref}]
    timeline: [], // [{turn, edges}]  — hypergraph.js's own edgeFace shape
  };
}

/** One chunk per utterance, offsets built directly rather than through
 * chunkSource's blank-line paragraph detection: each turn's reply IS
 * already exactly one unit (one speaker, one turn), so there is nothing for
 * paragraph-splitting to discover that appending does not already know —
 * and building it directly keeps a turn's ref stable across every later
 * turn (append-only, never re-chunked from scratch). */
function appendUtterance(speaker, turn, text) {
  const start = speaker.rawText.length ? speaker.rawText.length + 2 : 0;
  if (speaker.rawText.length) speaker.rawText += "\n\n";
  speaker.rawText += text;
  const end = speaker.rawText.length;
  const ref = `${speaker.name}#${start}-${end}`;
  const chunk = { source: speaker.name, start, end, text, ref, terms: new Set(sourceTokenize(text)) };
  speaker.utterances.push({ turn, text, ref, chunk });
}

/** The closed function-word class (cite.js::commonTerms, wired inside
 * hypergraph.js) needs `pool.length >= CORPUS_MINIMUM` (10) or it refuses
 * itself and returns nothing — measured live on this exact harness: with a
 * pool of one speaker's 2-6 own utterances, the measure never fires,
 * function words leak into the verb slot unfiltered, and extraction
 * produces garbage triples like {subject:"denied Napoleon", verb:"the",
 * object:"decisive early battle..."}. hypergraph.js's own header already
 * names the class of this bug ("material.js's functionWordSet... degenerates
 * at turn scale"); a debate's first several turns are an even smaller
 * material than a single turn's few passages. The fix is not a new
 * threshold — CORPUS_MINIMUM stays hypergraph.js's own declared floor — it
 * is giving the measure a bigger, legitimate pool sooner: the WHOLE
 * transcript so far, both speakers, split to SENTENCES (splitSentences,
 * already an injected organ) rather than left at 2-6 whole utterances. A
 * few-sentence opening statement alone crosses 10 sentence-chunks; the
 * pool is measurement material only, never fed to relationsFor as passages
 * — a speaker's graph is still built exclusively from that speaker's own
 * words. */
function sentencePool(text) {
  if (!text.trim()) return [];
  let sentences = [];
  try {
    sentences = engineSentences(text);
  } catch {
    return [];
  }
  return sentences
    .map((s) => (typeof s === "string" ? s : s?.text ?? ""))
    .filter((s) => s.trim())
    .map((s) => ({ text: s, terms: new Set(engineTokenize(s)) }));
}

/** The speaker's ACTIVE graph at this turn: GRAPH_WINDOW of their own most
 * recent utterances, not the full history. Full-history extraction from
 * ever-growing text is monotonic (nothing already stated is ever re-read
 * out of a bigger passage set) and could never produce "echoed-not-
 * retained" by construction — this window is what makes an edge capable of
 * falling out of the active graph at all, mirroring what the model's OWN
 * live context actually still carries (fold.js's RECENCY_WINDOW), not a
 * bookkeeping artifact. */
function snapshotGraph(speaker, turn, transcriptSoFar) {
  const active = activeWindow(speaker.utterances, GRAPH_WINDOW);
  const passages = active.map((u) => ({ ref: u.ref, text: u.text }));
  const reader = readerFor(passages, { pool: sentencePool(transcriptSoFar) });
  speaker.timeline.push({ turn, edges: reader.edges, vocabularyVerbs: reader.vocabulary.verbs });
  return reader;
}

function seedSpeaker(speaker, turn, text, transcriptSoFar) {
  speaker.fold.history.push({ role: "assistant", content: text });
  speaker.fold.summary = advanceSummaryFold(speaker.fold.summary, mechanicalFoldLine("(opening position)", text));
  appendUtterance(speaker, turn, text);
  return snapshotGraph(speaker, turn, transcriptSoFar);
}

async function replyTurn(speaker, opponent, turn, transcriptSoFar) {
  const question = opponent.utterances[opponent.utterances.length - 1].text;
  const chunks = speaker.utterances.map((u) => u.chunk);
  const foldedRefs = (speaker.fold.summary.records || []).flatMap((r) => r.refs);
  const passages = retrieve(chunks, question, 3, foldedRefs);
  const sourceBlock = buildSourceBlock(passages);
  const messages = buildTurnMessages({
    basePrompt: debatePrompt(speaker, opponent),
    summary: speaker.fold.summary,
    history: speaker.fold.history,
    question,
    sourceBlock,
  });
  // The actual wire size, not a re-derivation: `messages` here is exactly
  // what gets POSTed to Ollama below. `speaker.fold.history` is the FULL,
  // ever-growing turn log (every reply this speaker has ever given);
  // buildTurnMessages (fold.js) slices it to RECENCY_WINDOW raw messages
  // before this point, so `sentMessages`/`sentChars` measure what actually
  // leaves the process, and `historyMessages`/`historyChars` measure what
  // it would have been unbounded — the comparison this run is asked to
  // prove, computed, not asserted.
  const sentMessages = messages.length;
  const sentChars = charCount(messages);
  const historyMessages = speaker.fold.history.length;
  const historyChars = charCount(speaker.fold.history);

  // The texts a repeat would be copying FROM: the opponent's provocation
  // (cross-speaker copying, the turn-7 qwen2.5:14b case) and the speaker's
  // own last two utterances (same-speaker looping, the gemma2:2b case) —
  // both failure shapes measured live, both checked. priorEdges is the
  // speaker's own graph as it stood before this turn (its last timeline
  // snapshot — the seed's, if this is the speaker's first reply) — the
  // baseline noNewEdgesVsPrior asks whether this turn moved anything.
  const priorTexts = [question, ...activeWindow(speaker.utterances, GRAPH_WINDOW).map((u) => u.text)];
  const priorEdges = speaker.timeline.length ? speaker.timeline[speaker.timeline.length - 1].edges : [];
  let text = await call(messages, { maxTokens: ANSWER_MAX_TOKENS, model: FAST });
  let degenerate = degeneracyReason(text, priorTexts, priorEdges, transcriptSoFar);
  let repetitionRetries = 0;
  // The fix is deliberately NOT an English instruction telling the model
  // what it did wrong — that would hand a compliance-critical outcome
  // back to the model's own instruction-following, the exact thing L5
  // distrusts and the reason a fabricated citation is replaced mechanically
  // rather than argued with (links.js). SAME messages, SAME question — only
  // the decoding temperature changes, a property of generation, not of
  // what the model was told.
  while (degenerate && repetitionRetries < REPETITION_RETRIES) {
    repetitionRetries++;
    text = await call(messages, { maxTokens: ANSWER_MAX_TOKENS, model: FAST, temperature: REPETITION_RETRY_TEMPERATURE });
    degenerate = degeneracyReason(text, priorTexts, priorEdges, transcriptSoFar);
  }
  // Ships even if still degenerate after the bound — a wrong mechanical
  // answer isn't risked, but neither is an infinite retry loop; the
  // residue is TYPED and disclosed below, never silently hidden.
  speaker.fold.history.push({ role: "user", content: question }, { role: "assistant", content: text });

  const fold = mechanicalFoldLine(question, text);
  const turnNum = speaker.fold.summary.turnCount + 1;
  // No unsupported/citation checks against this record: the MATERIAL here
  // is the speaker's own prior words, not an external corpus of facts to
  // verify — that verification is the separate, third-party online-
  // grounding pass, never the speaker's own material standing in for it.
  const record = passages.length
    ? buildWarrantRecord({ turn: turnNum, gist: fold, channels: ["self-consistency"], refs: passages.map((p) => p.ref), unsupported: [], open: [] })
    : null;
  if (record) speaker.fold.summary = addWarrantRecord(speaker.fold.summary, record);

  try {
    const raw = await call(
      [
        { role: "system", content: FOLD_SYSTEM_PROMPT },
        { role: "user", content: buildSummaryUpdatePrompt(speaker.fold.summary, [...(speaker.fold.summary.folds || []), fold]) },
      ],
      { maxTokens: FOLD_MAX_TOKENS, json: FOLD_SCHEMA, model: FAST },
    );
    speaker.fold.summary = updateSummaryWithFold(speaker.fold.summary, fold, raw);
  } catch {
    speaker.fold.summary = advanceSummaryFold(speaker.fold.summary, fold);
  }

  appendUtterance(speaker, turn, text);
  const reader = snapshotGraph(speaker, turn, transcriptSoFar + "\n\n" + text);

  return {
    text,
    question,
    passages: passages.map((p) => p.ref),
    edgeCount: reader.edges.length,
    vocabularyVerbs: reader.vocabulary.verbs,
    sentMessages,
    sentChars,
    historyMessages,
    historyChars,
    repetitionRetries,
    degeneracyUnresolved: degenerate,
  };
}

// ── the run ──────────────────────────────────────────────────────────────

mkdirSync(join(HERE, "results"), { recursive: true });
const stamp = process.env.DIALOGUE_STAMP ?? String(process.pid);
const outPath = join(HERE, "results", `adversarial-dialogue-${stamp}.jsonl`);
writeFileSync(outPath, "");
console.log(`adversarial-dialogue: ${TURNS} replies after 2 seeds — deep ${MODEL}, fast ${FAST}, graph window ${GRAPH_WINDOW} utterances`);
console.log(`writing ${outPath}`);

const A = makeSpeaker("necessity-advocate", NECESSITY_STANCE);
const B = makeSpeaker("diplomacy-advocate", DIPLOMACY_STANCE);
const started = Date.now();

let turn = 0;
let transcriptSoFar = "";
turn++;
seedSpeaker(A, turn, NECESSITY_SEED, transcriptSoFar);
transcriptSoFar += NECESSITY_SEED;
appendFileSync(outPath, JSON.stringify({ turn, speaker: A.name, kind: "seed", text: NECESSITY_SEED, edgeCount: A.timeline.at(-1).edges.length }) + "\n");
turn++;
seedSpeaker(B, turn, DIPLOMACY_SEED, transcriptSoFar);
transcriptSoFar += "\n\n" + DIPLOMACY_SEED;
appendFileSync(outPath, JSON.stringify({ turn, speaker: B.name, kind: "seed", text: DIPLOMACY_SEED, edgeCount: B.timeline.at(-1).edges.length }) + "\n");
console.log(`turn 1: ${A.name} (seed) · turn 2: ${B.name} (seed)`);

for (let i = 0; i < TURNS; i++) {
  const [speaker, opponent] = i % 2 === 0 ? [A, B] : [B, A];
  turn++;
  let r;
  try {
    r = await replyTurn(speaker, opponent, turn, transcriptSoFar);
  } catch (err) {
    appendFileSync(outPath, JSON.stringify({ turn, speaker: speaker.name, kind: "error", error: String(err?.message ?? err) }) + "\n");
    console.log(`turn ${turn}: ERROR ${err?.message ?? err}`);
    continue;
  }
  transcriptSoFar += "\n\n" + r.text;
  appendFileSync(
    outPath,
    JSON.stringify({
      turn,
      speaker: speaker.name,
      kind: "reply",
      question: r.question,
      text: r.text,
      passages: r.passages,
      edgeCount: r.edgeCount,
      vocabularyVerbs: r.vocabularyVerbs,
      sentMessages: r.sentMessages,
      sentChars: r.sentChars,
      historyMessages: r.historyMessages,
      historyChars: r.historyChars,
      repetitionRetries: r.repetitionRetries,
      degeneracyUnresolved: r.degeneracyUnresolved,
    }) + "\n",
  );
  console.log(
    `turn ${turn}: ${speaker.name} · edges ${r.edgeCount} (vocab verbs ${r.vocabularyVerbs}) · passages ${r.passages.length}` +
      ` · sent ${r.sentMessages}msg/${r.sentChars}ch vs full history ${r.historyMessages}msg/${r.historyChars}ch` +
      (r.repetitionRetries
        ? ` · DEGENERATE detected, ${r.repetitionRetries} retry(s)${r.degeneracyUnresolved ? ` (unresolved: ${r.degeneracyUnresolved})` : " (resolved)"}`
        : ""),
  );
}

// ── the cross-graph report ──────────────────────────────────────────────

const fullCorpus = [...A.utterances, ...B.utterances].map((u) => ({ text: u.text }));
const sharedIndex = referentIndexFor(fullCorpus);

const bToA = classifyCrossGraphEdges({ assertorTimeline: B.timeline, responderTimeline: A.timeline, sharedIndex, diaNorm });
const aToB = classifyCrossGraphEdges({ assertorTimeline: A.timeline, responderTimeline: B.timeline, sharedIndex, diaNorm });

function tally(findings) {
  const t = {};
  for (const f of findings) t[f.verdict] = (t[f.verdict] ?? 0) + 1;
  return t;
}

const DISCLOSED_LIMIT =
  "This report shows which graph changed, traces each change to a specific prior utterance, and shows whether the change held rather than flickered. It does not and cannot show WHY — whether that is the model weighing an argument or a small model's general tendency to drift toward whatever it last read under adversarial framing. That question is beyond this instrument's reach, the same way an unresolved pronoun is beyond hypergraph.js's reach today.";

const report = {
  turn: turn + 1,
  kind: "report",
  turns: turn,
  speakers: [A.name, B.name],
  graphWindow: GRAPH_WINDOW,
  bToA: { direction: `${B.name} -> ${A.name}`, finalResponderTurn: bToA.finalResponderTurn, tally: tally(bToA.findings), findings: bToA.findings },
  aToB: { direction: `${A.name} -> ${B.name}`, finalResponderTurn: aToB.finalResponderTurn, tally: tally(aToB.findings), findings: aToB.findings },
  disclosedLimit: DISCLOSED_LIMIT,
};
appendFileSync(outPath, JSON.stringify(report) + "\n");

console.log("\n— cross-graph report —");
console.log(`${B.name} -> ${A.name}: ${JSON.stringify(tally(bToA.findings))}`);
console.log(`${A.name} -> ${B.name}: ${JSON.stringify(tally(aToB.findings))}`);
console.log(`\n${DISCLOSED_LIMIT}`);
console.log(`\nelapsed ${Math.round((Date.now() - started) / 1000)}s`);
console.log(`written to ${outPath}`);
