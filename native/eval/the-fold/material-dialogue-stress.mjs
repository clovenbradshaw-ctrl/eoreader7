// eval/material-dialogue-stress.mjs — a headless, material-aware, multi-turn
// stress test of the REAL live pipeline: app.js's castFor/relationsFor organ
// bundle (copied from app.js:208-266, the same construction proxy-runner.mjs
// and eval/hypergraph-generation-test.mjs already use headlessly), holon.js's
// real runHolonicTask (grid.js's claim-id spine wired IN this time — see
// below), and the per-source Testimony spine (capacity-runner.js's landAct/
// perSourceReadings/mergeTestimony, crown.js's renderCrown) driven for real
// after every answer, the same sequence CLAUDE.md's "claim-id spine" section
// and self-witness-integration-note.md describe.
//
//   node eval/material-dialogue-stress.mjs [model]
//   node eval/material-dialogue-stress.mjs gemma2:2b
//
// WHERE THIS SITS RELATIVE TO THE TWO EXISTING PRECEDENTS (read in full
// before writing this file): proxy-runner.mjs is "the exact turn app.js
// runs, headless" but discloses `chunks: []` — no material, no testimony
// spine. eval/dialogue.mjs is two mouths at conversation length, but it
// calls fold.js's OLDER buildTurnMessages/FOLD_SYSTEM_PROMPT path, never
// runHolonicTask/grid.js/crown.js. eval/hypergraph-generation-test.mjs is
// the closest real precedent — it already fires runHolonicTask with real
// chunks and relationsFor wired, multi-turn, chatHistory/discourse threaded
// — but it stops at the relation tier's own POOLED bound/contradicted/
// unbound verdicts; it never mints a claim_id or drives perSourceReadings/
// mergeTestimony/renderCrown. This file adds exactly that missing piece,
// plus real varied material (five topics, not the Lincoln/Hamlin fixture or
// pg2600.txt), plus a two-mouth asker generating real context-dependent
// follow-ups.
//
// A REAL DISCREPANCY FOUND WHILE READING, DISCLOSED RATHER THAN SILENTLY
// WORKED AROUND: the task this file was built against describes "app.js's
// crownTestimony function, added earlier today." No such function exists
// anywhere in this tree — grep for `crownTestimony` across every .js/.mjs/
// .html file finds exactly one hit, a CSS comment in index.html ("The crown
// line (crownTestimony): ...") describing the *idea*, not a binding. app.js
// imports neither holon.js nor capacity-runner.js's perSourceReadings/
// mergeTestimony/crown.js's renderCrown at all (confirmed by grep, not
// assumed) — self-witness-integration-note.md, committed the same day,
// says this in its own words: "Nothing calls any of it yet... checked
// directly before writing this note." A separate, concurrent worktree
// (.claude/worktrees/musing-jones-29acf8/) does have an app.js that calls
// runHolonicTask — evidently the live, uncommitted wiring pass in progress
// (git status on the main tree independently shows holon.js/index.html/
// crown.test.mjs modified-uncommitted) — but that worktree is a DIFFERENT
// session's isolated branch, out of scope to read or depend on here. So
// this file does what self-witness-integration-note.md's own closing
// section asks of "the owning session's call site": mint the claim,
// land one evaluate per loaded source, merge, render — reproduced here,
// headlessly, in eval-harness code, not inside app.js/holon.js (which the
// task itself named out of bounds).
//
// GRID/RUNCAPACITY/LANDACT ARE ALSO THREADED INTO THE runHolonicTask CALL
// ITSELF (grid/gridLog/runCapacity/landAct params holon.js already accepts
// as of this pass — confirmed by reading, not assumed): this exercises the
// OTHER, already-wired consumer of these organs, `landCompletenessBelief`
// (holon.js, P38), for real, so the ONE shared gridLog this file threads
// turn-to-turn accumulates both mechanisms' beliefs on one log, exactly the
// "one log, not per-conversation" discipline holon.js's own comment states.
//
// WHICH CLAIMS GET A CROWN PASS: every relation claim the pooled reader
// (relationsFor over ALL of the topic's own attached chunks) extracted from
// the SHIPPED answer whose POOLED verdict is not already "bound" — i.e.
// contradicted/unbound/beyond-reach/unheard. A claim the single pooled
// reading already bound cleanly gains nothing from per-source triangulation;
// the interesting cases are exactly the ones the merged view did not settle
// on its own. Capped at CROWN_CANDIDATES_PER_TURN (declared, disclosed on
// every turn's log line as candidatesFound vs candidatesChecked) — not a
// quality threshold, a runtime bound on the fan-out (candidates × loaded
// sources × landAct's own several runCapacity("relations") calls each).
//
// MATERIAL: five short topics, each a passage (or two) written for this run
// — real, checkable facts, not the Lincoln/Hamlin fixture already living in
// this repo's tests. One topic (gold) carries a single source, to exercise
// SINGLE/CONTRADICTED-single. One (Saturn) carries two sources that AGREE on
// the same claims, to exercise AGREE. One (the Titanic) carries two sources
// that genuinely disagree on the death toll — both numbers (~1,500 and
// 1,635) are real estimates that have each appeared in real historical
// accounts of the disaster; this is a real historiographical disagreement,
// not an invented conflict — to exercise DISAGREE. The remaining two (Wright
// brothers, Great Barrier Reef) are single-source and left to run straight;
// CONTRADICTED is left to emerge on its own if the small model misstates a
// figure the source states plainly, which is a real, not staged, failure
// mode small local models actually have.
//
// MATERIAL SCOPE PER TOPIC, DISCLOSED: the conversation's chatHistory is
// ONE continuous thread end to end (50+ turns, topics change mid-
// conversation with no announcement — the real stress case CLAUDE.md's
// stable-sub-assemblies section names: does retrieval correctly re-anchor
// on the NEW topic's material rather than dragging a stale topic's words
// forward). The ATTACHED MATERIAL resets at each topic boundary (an
// attach-new/remove-old simulation, not an ever-growing pile) — chosen so
// the per-source testimony pass stays meaningfully scoped to sources that
// could plausibly bear on the claim, rather than checking a claim about
// Saturn against a Titanic passage and recording five pages of inevitable
// "undetermined" noise.
//
// NARRATION AUDIT: provenance.js's stripNarrationSentences was found, while
// reading it for this task, to run in DETECT-ONLY mode as of a 2026-08-19
// user direction quoted in its own header ("no post processing. the model
// says what it says... not rewriting but changing its mind") — its
// DEFLATE_RE/CUT_RES matches now only feed holon.js's `narrated` correction
// verdict (mass-majority: fires only when matched narration exceeds HALF the
// draft's length), and are never excised from what ships regardless of
// match. So this file runs stripNarrationSentences/stripScaffoldNarration
// itself, directly, against every SHIPPED answer, purely to detect and log
// what the regex would flag — never to alter what ships. See the final
// report for what this found and why "extend the regex" is a smaller, and
// possibly not even shipped-text-affecting, fix than it sounds like.

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { runHolonicTask, needsDecomposition } from "../holon.js";
import { makeCastResolver, makeReferentIndex } from "../cast.js";
import { makeRelationReader } from "../hypergraph.js";
import { makeGrid } from "../grid.js";
import { makeCapacityRunner, landAct, perSourceReadings, mergeTestimony } from "../capacity-runner.js";
import { renderCrown } from "../crown.js";
import { stripNarrationSentences, stripScaffoldNarration, classifySentences } from "../provenance.js";
import { chunkSource, tokenize } from "../source.js";
import { mechanicalFoldLine } from "../fold.js";

import * as engineOperators from "../../eoreader7/legacy-eoreader6.1/packages/engine/operators.js";
import * as engineTaskLog from "../../eoreader7/legacy-eoreader6.1/packages/engine/holon/task-log.js";
import { splitSentences as engineSentences } from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/spans.js";
import {
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
} from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/relations.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OLLAMA = process.env.FOLD_OLLAMA_URL ?? "http://localhost:11434";
const ANSWER_MAX_TOKENS = 512;
const QUESTION_MAX_TOKENS = 100;
const CALL_RETRIES = 2;
const CROWN_CANDIDATES_PER_TURN = 3; // declared bound on the crown-pass fan-out — see header

// ── model selection: the app's own real default, confirmed from
// model-routing.js's MODEL_PICKER[0] (the FAST rung every flat chat turn
// spends regardless of what the user picked, per routeModel's own logic),
// not assumed — falls back to whatever `ollama list` actually has pulled,
// named on the console and in the run's own log header, never silently
// substituted. ─────────────────────────────────────────────────────────────
const REQUESTED_MODEL = process.argv[2] ?? "gemma2:2b";

async function resolveModel(requested) {
  try {
    const res = await fetch(`${OLLAMA}/api/tags`);
    if (!res.ok) throw new Error(`ollama /api/tags: ${res.status}`);
    const { models = [] } = await res.json();
    const names = models.map((m) => m.name ?? m.model);
    if (names.includes(requested)) return { model: requested, offered: names, substituted: false };
    if (names.length) return { model: names[0], offered: names, substituted: true };
    throw new Error("ollama has no models pulled");
  } catch (err) {
    throw new Error(`could not resolve a model from Ollama at ${OLLAMA}: ${err.message}`);
  }
}

// ── the exact organ bundle app.js builds at app.js:208-266, headlessly —
// proxy-runner.mjs's own precedent for this (castFor/relationsFor
// identical); referentIndexFor added here because capacity-runner.js's
// "cast" capacity needs it and proxy-runner.mjs never wires
// capacity-runner.js at all. ─────────────────────────────────────────────
const castFor = makeCastResolver({ splitSentences: engineSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const relationsFor = makeRelationReader({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer,
  diaNorm,
  discoverRelationVocab,
  extractRelations,
  tokenize,
});
const referentIndexFor = makeReferentIndex({ splitSentences: engineSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });

// The claim-id spine's own organs — grid.js's makeGrid bound to the SAME
// engine algebra/task-log grid.test.mjs verifies against (never a stub),
// and capacity-runner.js's runtime over the two capacities that actually
// execute (cast, relations). One grid instance, one gridLog, for the whole
// run — "one log, not per-conversation" (holon.js's own comment on why
// grid/gridLog/runCapacity/landAct are accepted at the top of
// runHolonicTask at all).
const grid = makeGrid({ operators: engineOperators, taskLog: engineTaskLog });
const runCapacity = makeCapacityRunner({ referentIndexFor, relationsFor });
let gridLog = grid.createLog();

// ── the model call — same shape as proxy-runner.mjs/eval/dialogue.mjs's own
// (retry once, typed failure on the second) — with one addition: every
// call this turn makes is pushed onto `callLog`, so the FIRST call's
// response can be recovered as the turn's raw draft (before whatever the
// correction loop did to it) without needing anything holon.js does not
// already expose on its return value. ───────────────────────────────────
function makeOllamaCall(model, usage, callLog) {
  return async function call(messages, { maxTokens, json } = {}) {
    for (let attempt = 0; attempt < CALL_RETRIES; attempt++) {
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
        const text = data.message?.content ?? "";
        callLog.push({ messages, text });
        return text;
      } catch (err) {
        if (attempt === CALL_RETRIES - 1) throw err;
      }
    }
  };
}

// ── material: five topics, written for this run (see header for why each
// shape was chosen) ─────────────────────────────────────────────────────

const TOPICS = [
  {
    key: "gold",
    label: "the element gold",
    sources: [
      {
        name: "gold.txt",
        text:
          "Gold is a chemical element with the symbol Au and atomic number 79. It is a dense, soft, malleable, and ductile metal with a bright yellow color. Gold does not react with most chemicals but is dissolved by aqua regia, a mixture of nitric acid and hydrochloric acid. The metal is used in jewelry, electronics, dentistry, and as a store of value. Pure gold is too soft for many uses, so it is often alloyed with other metals such as silver and copper to make it harder.",
      },
    ],
    questions: [
      "What is gold's atomic number and chemical symbol?",
      "What color is gold?",
      "Why is gold often alloyed with other metals?",
      "What is aqua regia and how does it relate to gold?",
      "What are some common uses of gold?",
    ],
  },
  {
    key: "titanic",
    label: "the sinking of the Titanic",
    // Two real historically-cited death-toll estimates for the same event —
    // see header: this is a genuine historiographical disagreement, not a
    // constructed one. The short "The Titanic killed about N people." sentence
    // is deliberately ALSO stated plainly (not just "approximately N died in
    // the disaster") — a scratchpad diagnostic run against the real
    // hypergraph.js extractor before this run (see final report) found that
    // "N people died in the disaster" (bare-common-noun subject "people")
    // extracts NO claim at all, while "The Titanic killed N people" (named,
    // capitalized subject; simple transitive past-tense verb) extracts and
    // binds cleanly — measured, not guessed. The added speed sentence is a
    // second, real axis of historical debate (whether the ship was going too
    // fast for the ice conditions), included as a second candidate for the
    // testimony pass to find disagreement on.
    sources: [
      {
        name: "titanic-a.txt",
        text:
          "The RMS Titanic struck an iceberg on the night of April 14, 1912, and sank in the early hours of April 15. The ship was on its maiden voyage from Southampton to New York City. The Titanic killed about 1,500 people, out of more than 2,200 aboard. The Titanic was traveling at high speed when it struck the iceberg.",
      },
      {
        name: "titanic-b.txt",
        text:
          "The Titanic sank on April 15, 1912, after colliding with an iceberg the night before. Investigators later estimated that 1,635 people lost their lives when the ship went down. The Titanic killed about 1,635 people, making it one of the deadliest peacetime maritime disasters in history. The Titanic was not traveling at high speed when it struck the iceberg.",
      },
    ],
    questions: [
      "When did the Titanic sink?",
      "How many people died when the Titanic sank?",
      "Where was the Titanic sailing from and to?",
      "What did the Titanic collide with?",
      "Was the Titanic on its first voyage?",
      "Was the Titanic traveling fast when it struck the iceberg?",
    ],
  },
  {
    key: "saturn",
    label: "the planet Saturn",
    // Two sources that independently AGREE on the same claims — exercises
    // mergeTestimony's AGREE case (>=2 real holds).
    sources: [
      {
        name: "saturn-a.txt",
        text:
          "Saturn is the sixth planet from the Sun and the second-largest planet in the Solar System, after Jupiter. It is famous for its prominent ring system, made mostly of ice particles with a smaller amount of rocky debris and dust. Saturn has dozens of known moons. Titan is Saturn's largest moon.",
      },
      {
        name: "saturn-b.txt",
        text:
          "Saturn, often called the ringed giant, is the sixth planet outward from the Sun. Its rings are composed primarily of ice, with some rock and dust mixed in. The planet's largest moon, Titan, is bigger than the planet Mercury.",
      },
    ],
    questions: [
      "Where is Saturn in the order of planets from the Sun?",
      "What are Saturn's rings mostly made of?",
      "What is the name of Saturn's largest moon?",
      "How does Titan compare in size to Mercury?",
      "Is Saturn the largest planet in the Solar System?",
    ],
  },
  {
    key: "wright",
    label: "the Wright brothers' first flight",
    sources: [
      {
        name: "wright.txt",
        text:
          "Orville and Wilbur Wright were American inventors credited with building and flying the first successful motor-operated airplane. They made the first controlled, sustained flight of a powered aircraft on December 17, 1903, near Kitty Hawk, North Carolina. That first flight lasted 12 seconds and covered 120 feet. The brothers ran a bicycle shop in Dayton, Ohio, before turning to aviation.",
      },
    ],
    questions: [
      "Who were the Wright brothers?",
      "When did the Wright brothers make their first powered flight?",
      "Where did the first flight take place?",
      "How long did that first flight last?",
      "What business did the Wright brothers run before aviation?",
    ],
  },
  {
    key: "reef",
    label: "the Great Barrier Reef",
    sources: [
      {
        name: "reef.txt",
        text:
          "The Great Barrier Reef is the world's largest coral reef system, located off the coast of Queensland, Australia. It stretches over 2,300 kilometers and is made up of nearly 3,000 individual reefs. The reef is home to thousands of species, including sea turtles, sharks, and over 1,500 species of fish. Rising ocean temperatures have caused repeated mass coral bleaching events in recent years.",
      },
    ],
    questions: [
      "Where is the Great Barrier Reef located?",
      "How long is the Great Barrier Reef?",
      "What kinds of animals live in the reef?",
      "What has caused mass coral bleaching events there?",
      "About how many individual reefs make up the system?",
    ],
  },
];

// ── the asker: reads the real last answer, asks one real follow-up
// (eval/dialogue.mjs's own extraction convention: first "?"-terminated
// sentence, mechanically pulled — never trusted as free text). ──────────

const ASKER_PROMPT =
  "You are a curious person chatting about something you just read. Read the answer you were just given, then ask ONE natural follow-up question about it — exactly one sentence, ending with a question mark. Ask about something specific the answer just said, or something it left out. Plain conversational English, no preamble.";

function extractQuestion(reply) {
  const m = String(reply ?? "").match(/[^?]*\?/s);
  return m ? m[0].trim().replace(/\s+/g, " ") : null;
}

async function nextFollowUp(call, topicLabel, lastQuestion, lastAnswer) {
  const reply = await call(
    [
      { role: "system", content: ASKER_PROMPT },
      {
        role: "user",
        content: `Topic: ${topicLabel}\nQuestion just asked: ${lastQuestion}\nAnswer just given: ${String(lastAnswer ?? "").slice(0, 1200)}\n\nAsk one natural follow-up.`,
      },
    ],
    { maxTokens: QUESTION_MAX_TOKENS },
  );
  const q = extractQuestion(reply);
  if (q) return { question: q, basis: "asker" };
  // Typed fallback, never silently skipped (dialogue.mjs's own discipline):
  // a generic but genuinely context-dependent follow-up, naming the topic.
  return { question: `Can you tell me more about ${topicLabel}?`, basis: "asker-fallback" };
}

// ── the crown pass: reproduces the sequence self-witness-integration-
// note.md and CLAUDE.md's claim-id-spine section describe, headlessly,
// against every relation claim the pooled reader did NOT already bind. ──

function safeClaimWord(s) {
  // Strip characters that would break out of the quoted object clause
  // (a literal `"`) or that grid.js's tokenizer would otherwise choke on;
  // everything else (including punctuation) is harmless inside a quoted
  // span. Mirrors landCompletenessBelief's own `safe()` but narrower —
  // that function builds an UNQUOTED line and so must strip every
  // clause-keyword-shaped character; this one quotes the whole claim (grid.
  // js's own documented grammar for "a quoted, full-sentence object" —
  // capacity-runner.js's landAct docstring says so directly) so only the
  // quote character itself is dangerous.
  return String(s ?? "").replace(/"/g, "'").replace(/\s+/g, " ").trim();
}

async function crownPassForTurn(turnTag, relationReport, sourcesMap) {
  const claims = relationReport?.claims ?? [];
  const candidates = claims.filter((c) => c.verdict !== "bound");
  const checked = candidates.slice(0, CROWN_CANDIDATES_PER_TURN);
  const results = [];
  for (const c of checked) {
    const subject = safeClaimWord(c.subject);
    const verb = safeClaimWord(c.verb);
    const object = safeClaimWord(c.object);
    if (!subject || !verb || !object) {
      results.push({ claim: { subject: c.subject, verb: c.verb, object: c.object }, pooledVerdict: c.verdict, skipped: "empty subject/verb/object after sanitizing" });
      continue;
    }
    const claimId = await grid.mintClaimId({ subject, verb, object });
    const claimText = `${subject} ${verb} ${object}`;
    let landedAny = false;
    for (const [sourceName, sourceText] of Object.entries(sourcesMap)) {
      const line = `evaluate "${claimText}" at Link from differentiate ground ${sourceName} broken:testimony because ${turnTag}`;
      let out;
      try {
        out = landAct(grid, gridLog, line, { sources: { [sourceName]: sourceText }, runCapacity, claimId });
      } catch (err) {
        results.push({ claim: { subject, verb, object }, pooledVerdict: c.verdict, claimId, error: `landAct threw on ${sourceName}: ${err.message}` });
        continue;
      }
      if (out.ok) {
        gridLog = out.log;
        landedAny = true;
      } else {
        results.push({ claim: { subject, verb, object }, pooledVerdict: c.verdict, claimId, refusal: out.refusal, source: sourceName });
      }
    }
    if (!landedAny) continue;
    const readings = perSourceReadings(grid, gridLog, claimId);
    const merged = mergeTestimony(readings);
    const crowned = renderCrown(merged);
    results.push({
      claim: { subject, verb, object },
      pooledVerdict: c.verdict,
      claimId,
      case: merged.case,
      standing: merged.standing,
      witnesses: readings.map((r) => ({ who: r.who, verdict: r.verdict })),
      crownText: crowned.text,
      verified: crowned.verified,
    });
  }
  return { candidatesFound: candidates.length, candidatesChecked: checked.length, crown: results };
}

// ── narration audit: detect-only, matching what the real pipeline itself
// now does (see header) — never applied to what shipped. ────────────────

function auditNarration(shippedText, discourse, hasMaterial) {
  const scaffold = stripScaffoldNarration(shippedText);
  const sentence = stripNarrationSentences(scaffold.text, { discourse, hasMaterial });
  const totalLen = scaffold.text.length;
  const cutLen = sentence.removed.join(" ").length;
  return {
    bracketNarrationRemoved: scaffold.removed, // this half IS actually cut from what ships
    sentenceNarrationDetected: sentence.removed, // detect-only — NOT cut from what ships
    massMajority: totalLen > 0 && cutLen > totalLen / 2, // holon.js's own `narrated` formula
  };
}

// ── the answerer: runHolonicTask exactly as app.js/proxy-runner.mjs would
// call it, chunks/grid/runCapacity/landAct all real, plus the crown pass
// above driven on the shipped answer's own relation claims. ─────────────

async function answerTurn({ model, question, chatHistory, discourse, chunks, sourcesMap, turnTag }) {
  const usage = { promptTokens: 0, completionTokens: 0 };
  const callLog = [];
  const call = makeOllamaCall(model, usage, callLog);
  const planMode = needsDecomposition(question) ? "model" : "flat";

  const result = await runHolonicTask({
    task: question,
    chunks,
    call,
    foldedRefs: [],
    makeNameResolver: castFor,
    makeRelationReader: relationsFor,
    checkLink: null,
    planMode,
    chatHistory,
    discourse,
    grid,
    gridLog,
    runCapacity,
    landAct,
  });
  if (result.gridLog) gridLog = result.gridLog; // landCompletenessBelief's own accumulation, if any fired

  const section = result.sections?.[0] ?? null;
  const relationReport = section?.relations ?? null;
  const draftText = callLog[0]?.text ?? null; // the raw first completion, before scaffold-strip/correction

  const sentences = classifySentences(result.output, section?.attributions ?? [], section?.grounding?.findings ?? [], relationReport?.claims ?? []);
  const grounding = {
    sentences: sentences.length,
    material: sentences.filter((s) => s.ground === "material").length,
    model: sentences.filter((s) => s.ground === "model").length,
    unbackedSentences: sentences.filter((s) => s.absent.length > 0).length,
  };

  const narration = auditNarration(result.output, discourse, chunks.length > 0);
  const crownPass = await crownPassForTurn(turnTag, relationReport, sourcesMap);

  return {
    result,
    draftText,
    shippedText: result.output,
    planMode,
    corrections: section?.corrections ?? 0,
    grounding,
    relationClaims: (relationReport?.claims ?? []).map((c) => ({ subject: c.subject, verb: c.verb, object: c.object, verdict: c.verdict, polarity: c.polarity })),
    narration,
    crownPass,
    usage,
    callCount: callLog.length,
  };
}

// ── the run ──────────────────────────────────────────────────────────────

async function main() {
  const { model, offered, substituted } = await resolveModel(REQUESTED_MODEL);
  if (substituted) {
    console.log(`WARNING: requested model "${REQUESTED_MODEL}" is not pulled in Ollama. Offered: ${offered.join(", ") || "(none)"}. Using "${model}" instead.`);
  } else {
    console.log(`model: ${model} (requested "${REQUESTED_MODEL}", confirmed pulled — offered: ${offered.join(", ")})`);
  }

  mkdirSync(join(HERE, "results"), { recursive: true });
  const stamp = process.env.STRESS_STAMP ?? String(process.pid);
  const outPath = join(HERE, "results", `material-dialogue-stress-${stamp}.jsonl`);
  writeFileSync(outPath, "");
  console.log(`writing ${outPath}`);
  console.log(`topics: ${TOPICS.map((t) => t.key).join(", ")}`);

  const chatHistory = [];
  let turn = 0;
  const started = Date.now();

  for (const topic of TOPICS) {
    const chunks = topic.sources.flatMap((s) => chunkSource(s.name, s.text));
    const sourcesMap = Object.fromEntries(topic.sources.map((s) => [s.name, s.text]));
    console.log(`\n════ topic: ${topic.key} (${topic.sources.length} source${topic.sources.length > 1 ? "s" : ""}, ${chunks.length} chunks) ════`);

    for (const initialQuestion of topic.questions) {
      // initial turn
      turn++;
      const turnTagInitial = `turn-${turn}-${topic.key}`;
      const tInitial0 = Date.now();
      let initial;
      try {
        initial = await answerTurn({
          model,
          question: initialQuestion,
          chatHistory,
          discourse: mechanicalFoldLine(chatHistory.slice(-2).map((h) => h.content).join(" "), ""),
          chunks,
          sourcesMap,
          turnTag: turnTagInitial,
        });
      } catch (err) {
        appendFileSync(outPath, JSON.stringify({ turn, topic: topic.key, role: "initial", basis: "scripted", question: initialQuestion, error: String(err?.message ?? err) }) + "\n");
        console.log(`turn ${turn} [${topic.key}] INITIAL ERROR: ${err?.message ?? err}`);
        continue;
      }
      chatHistory.push({ role: "user", content: initialQuestion }, { role: "assistant", content: initial.shippedText });
      logTurn(outPath, {
        turn, topic: topic.key, role: "initial", basis: "scripted", question: initialQuestion,
        elapsedMs: Date.now() - tInitial0, ...summarizeForLog(initial),
      });
      console.log(consoleLine(turn, topic.key, "initial", initialQuestion, initial));

      // follow-up turn — a real question from the asker model, reading the
      // real answer just given, never a canned second question.
      turn++;
      const turnTagFollow = `turn-${turn}-${topic.key}`;
      const tFollow0 = Date.now();
      const usage = { promptTokens: 0, completionTokens: 0 };
      const askerCall = makeOllamaCall(model, usage, []);
      let followUp;
      try {
        followUp = await nextFollowUp(askerCall, topic.label, initialQuestion, initial.shippedText);
      } catch (err) {
        followUp = { question: `Can you say more about ${topic.label}?`, basis: "asker-error-fallback" };
      }
      let followAnswer;
      try {
        followAnswer = await answerTurn({
          model,
          question: followUp.question,
          chatHistory,
          discourse: mechanicalFoldLine(chatHistory.slice(-2).map((h) => h.content).join(" "), ""),
          chunks,
          sourcesMap,
          turnTag: turnTagFollow,
        });
      } catch (err) {
        appendFileSync(outPath, JSON.stringify({ turn, topic: topic.key, role: "followup", basis: followUp.basis, question: followUp.question, error: String(err?.message ?? err) }) + "\n");
        console.log(`turn ${turn} [${topic.key}] FOLLOWUP ERROR: ${err?.message ?? err}`);
        continue;
      }
      chatHistory.push({ role: "user", content: followUp.question }, { role: "assistant", content: followAnswer.shippedText });
      logTurn(outPath, {
        turn, topic: topic.key, role: "followup", basis: followUp.basis, question: followUp.question,
        elapsedMs: Date.now() - tFollow0, ...summarizeForLog(followAnswer),
      });
      console.log(consoleLine(turn, topic.key, "followup", followUp.question, followAnswer));
    }
  }

  console.log(`\ndone. ${turn} turns, ${Math.round((Date.now() - started) / 1000)}s. gridLog has ${gridLog.entries.length} entries.`);
  console.log(`log: ${outPath}`);
}

function summarizeForLog(a) {
  return {
    draftText: a.draftText,
    shippedText: a.shippedText,
    planMode: a.planMode,
    corrections: a.corrections,
    refs: a.result.refs,
    unsupported: a.result.unsupported,
    unbacked: a.result.unbacked,
    open: a.result.open,
    channels: a.result.channels,
    grounding: a.grounding,
    relationClaims: a.relationClaims,
    narration: a.narration,
    crown: a.crownPass,
    usage: a.usage,
    callCount: a.callCount,
  };
}

function logTurn(outPath, line) {
  appendFileSync(outPath, JSON.stringify(line) + "\n");
}

function consoleLine(turn, topicKey, role, question, a) {
  const crownBits = a.crownPass.crown
    .filter((c) => c.case)
    .map((c) => `${c.case}${c.standing ? `/${c.standing}` : ""}`)
    .join(",");
  return (
    `turn ${turn} [${topicKey}/${role}] "${question}" → ${a.shippedText.length} chars` +
    ` · unsupported ${a.result.unsupported.length} · unbacked ${a.result.unbacked.length}` +
    ` · ground M${a.grounding.material}/m${a.grounding.model} of ${a.grounding.sentences}` +
    (a.narration.sentenceNarrationDetected.length ? ` · NARRATION x${a.narration.sentenceNarrationDetected.length}` : "") +
    (crownBits ? ` · crown[${crownBits}]` : "")
  );
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
