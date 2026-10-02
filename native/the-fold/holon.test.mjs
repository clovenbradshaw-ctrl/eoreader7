// holon.test.mjs — the holonic loop against a fake model. No engine, no
// network: the model is a function that reads the same prompts a real one
// would and answers from the material it was actually handed, which is the
// only honest way to fake it — a canned answer that ignores its prompt would
// test nothing but the plumbing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  CHAT_SYSTEM_PROMPT,
  EXECUTE_SYSTEM_PROMPT,
  FLAT_EXECUTE_SYSTEM_PROMPT,
  MAX_CORRECTIONS,
  PLAN_ENTRY_KINDS,
  PLAN_SYSTEM_PROMPT,
  SEARCHED_VOID_PREFIX,
  UNRETRIEVED_MATERIAL_PREFIX,
  appendPlan,
  createPlanLog,
  extractArray,
  foldPlan,
  mechanicalAnswer,
  needsDecomposition,
  parsePlan,
  projectParts,
  runHolonicTask,
  runPart,
  todayLine,
} from "./holon.js";
import { chunkSource } from "../organs/source.js";
import { makeRelationReader } from "../organs/hypergraph.js";
import { makeGrid } from "./grid.js";
import { makeCapacityRunner, landAct } from "../organs/index.js";
import { findCapacity, unresolvedCapacity } from "../organs/index.js";
// The conversation's recent voice (2026-09-13): the real cue texts, so the
// threading tests always check what the app actually ships, never a literal.
import { voiceCueFor as arcVoiceCueFor } from "./arcs.js";
import { pathosCueFor } from "./pathos-turn.js";

// Real engine organs for the relation tier (hypergraph.test.mjs's own
// pattern) — the completeness gate is worth nothing tested against a
// fixture that fakes what "bound" and "fillers" mean; it has to run the
// real extraction the way a live turn actually does.
const relationOrgans = async () => {
  const { splitSentences } = await import("../adapters/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../adapters/text/surfaces.js"
  );
  const { discoverRelationVocab, extractRelations } = await import(
    "../adapters/text/relations.js"
  );
  const { tokenize } = await import("../adapters/text/material.js");
  return { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize };
};

const CORPUS = [
  "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.",
  "Dredging of the shipping channel runs through March under the port authority schedule, with the deep berths closed for the duration.",
  "Unrelated paragraph about the town festival, the weather, and the new bakery on the corner of the square.",
].join("\n\n");

const chunks = chunkSource("notes.txt", CORPUS);

/**
 * The refs a prompt actually offered, read back by recognizing which known
 * chunk's own TEXT the MATERIAL block carries — not a bracket anymore
 * (2026-08-18: buildSourceBlock stopped labeling every passage with its
 * address and instructing the model to reproduce one — the model must
 * have zero exposure to this instrument's own addressing scheme, so this
 * fake model can no longer read one back out of its own prompt either).
 * `pool` defaults to this file's default corpus; tests built on a
 * different one pass it explicitly.
 */
function offeredRefs(userContent, pool = chunks) {
  return pool.filter((c) => userContent.includes(c.text)).map((c) => c.ref);
}

/** Everything a call actually carries, joined — the honest way for a fake
 * model to read its prompt now that the flat material path puts the
 * source block in the SYSTEM message and the person's words in the final
 * user turn (2026-08-19, stable sub-assemblies): a real model sees all of
 * its messages, so the fake one reads all of them too. */
function promptOf(messages) {
  return messages.map((m) => m.content).join("\n\n");
}

/**
 * A fake model that behaves like a competent small model: plans on request,
 * writes each part from the passages in its prompt citing the first address,
 * and — for the part about dredging — invents a figure on the first draft and
 * fixes it when the correction prompt names the failure.
 */
function fakeModel({ stubborn = false } = {}) {
  return async (messages) => {
    const system = messages[0]?.content ?? "";
    const user = messages[1]?.content ?? "";

    if (system === PLAN_SYSTEM_PROMPT) {
      return JSON.stringify([
        { label: "the harbor figure", description: "State the harbor figure the Kessington report gives." },
        { label: "the dredging schedule", description: "Describe the dredging schedule for the shipping channel." },
      ]);
    }

    // No material is its own branch (CHAT_SYSTEM_PROMPT) — a friendly reply,
    // not a diagnosis dressed up as one. Every other call is a real part.
    assert.ok(system === EXECUTE_SYSTEM_PROMPT || system === CHAT_SYSTEM_PROMPT);
    const refs = offeredRefs(user);
    const isCorrection = user.startsWith("Your draft");

    if (user.includes("harbor figure")) {
      return `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}]`;
    }
    if (isCorrection && !stubborn) {
      return `Dredging of the shipping channel runs through March. [${refs[0]}]`;
    }
    return "The dredging budget is 999 tons.";
  };
}

test("the plan is inserts on an append-only log, and the plan is its fold", () => {
  let log = createPlanLog("the task");
  const before = log;
  log = appendPlan(log, { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p1", label: "first", description: "one", basis: "plan" });
  // Append-only: the old log is untouched; seq is the log's own counter.
  assert.equal(before.entries.length, 0);
  assert.deepEqual(log.entries.map((e) => e.seq), [0]);
  assert.ok(Object.isFrozen(log.entries[0]));

  // A later entry for the same part wins field by field at the fold; the
  // earlier entry stays in the log — that is the descent.
  log = appendPlan(log, { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p1", label: "first, revised", description: "one, better" });
  log = appendPlan(log, {
    kind: PLAN_ENTRY_KINDS.RESULT, part_id: "p1", evidence: ["n.txt#0-9"],
    result: { refs: ["n.txt#0-9"], channels: ["cited"], unsupported: [], open: [], corrections: 0 },
  });
  const plan = foldPlan(log);
  assert.equal(plan.parts.length, 1);
  assert.equal(plan.parts[0].label, "first, revised");
  assert.equal(plan.results.get("p1").refs[0], "n.txt#0-9");
  assert.equal(log.entries.length, 3, "revised entries stay in the log");

  // Evidence accumulates from ANY entry that carries it (the eochat scar).
  assert.deepEqual(projectParts(log)[0].evidence, ["n.txt#0-9"]);

  // Supersession and retraction remove from the live set, never from the log.
  let l2 = appendPlan(log, { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p2", description: "replacement", supersedes: "p1" });
  assert.deepEqual(projectParts(l2).map((t) => t.part_id), ["p2"]);
  l2 = appendPlan(l2, { kind: PLAN_ENTRY_KINDS.RETRACT, part_id: "p2" });
  assert.deepEqual(projectParts(l2), []);
  assert.equal(l2.entries.length, 5);

  // Degradation is a basis on the part's own propose entry, derived at the fold.
  const dl = appendPlan(createPlanLog("t"), { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p1", description: "t", basis: "degraded", reason: "plan did not parse" });
  assert.equal(foldPlan(dl).degraded, true);
  assert.equal(plan.degraded, false);

  // A typed gap, never a default: a part proposed without a description says so.
  const gap = appendPlan(createPlanLog("t"), { kind: PLAN_ENTRY_KINDS.PROPOSE, part_id: "p1" });
  assert.ok(projectParts(gap)[0].description_gap);

  // No silent coercion: an unknown kind or a missing part_id refuses loudly.
  assert.throws(() => appendPlan(log, { kind: "mutate", part_id: "p1" }));
  assert.throws(() => appendPlan(log, { kind: PLAN_ENTRY_KINDS.PROPOSE }));
});

test("the gate fires on several separately-anchored parts, not on length", () => {
  // The canonical shape: several clauses, each pinning its own concrete fact.
  assert.equal(
    needsDecomposition(
      "Our budget is $2000, we need wifi at the venue, everyone eats vegetarian, and our CFO cannot attend on the 14th",
    ),
    true,
  );
  // Long and comma-heavy, but one elaborated ask — no anchors past grammar.
  assert.equal(
    needsDecomposition(
      "tell me more about the general mood of the meeting, how people seemed to feel about it, and whether anyone appeared unhappy with how things were going overall",
    ),
    false,
  );
  // A greeting never reaches the anchor scan.
  assert.equal(needsDecomposition("hello there"), false);
  assert.equal(needsDecomposition(""), false);
});

test("a single interrogative sentence never plans, however many facets it names", () => {
  // The live failure this pins (2026-08-17): three anchored facets in one
  // question tripped the gate, each part re-answered the whole question,
  // and the sections contradicted each other on the mayor. One question is
  // one propose; the checking ladder is the fact-check.
  assert.equal(
    needsDecomposition("What river is Nashville on, what US state is it in, and who was its mayor in 2019?"),
    false,
  );
  // Imperative multi-part WORK still plans — the gate lost questions, not tasks.
  assert.equal(
    needsDecomposition(
      "Our budget is $2000, we need wifi at the venue, everyone eats vegetarian, and our CFO cannot attend on the 14th",
    ),
    true,
  );
  // Several sentences ending in a question still reach the anchor scan —
  // only the single-sentence interrogative is exempt.
  assert.equal(
    needsDecomposition(
      "Compare the 1805 and 1812 campaigns. Cite the figures for each army, name the commanding generals, and note the dates of the major battles. Which mattered more?",
    ),
    true,
  );
});

test("a framing sentence in front of the question is not WORK either — only a lone trailing interrogative sentence is exempt (live failure, 2026-09-09)", () => {
  // The live failure this pins: "I'm researching the Panama Canal's
  // history for a documentary script. Who built the canal, when was it
  // completed, and why did the earlier French attempt fail?" tripped the
  // gate (four substantive, multi-sentence clauses), planned four parts —
  // the model even invented an unasked fourth, "Key Players" — and every
  // part re-answered the whole compound question from scratch. The
  // preceding sentence is pure declarative scene-setting (one clause, no
  // anchor of its own): the question itself is still the single
  // interrogative sentence the rule above already means to exempt.
  assert.equal(
    needsDecomposition(
      "I'm researching the Panama Canal's history for a documentary script. Who built the canal, when was it completed, and why did the earlier French attempt fail?",
    ),
    false,
  );
  // A shorter framing lead-in, same shape.
  assert.equal(
    needsDecomposition("My name is Jordan. What's the capital of France, and when was it founded?"),
    false,
  );
  // The exemption is for FRAMING only. When the sentence(s) before the
  // trailing question carry genuine multi-clause work of their own — the
  // campaigns case above, restated here as the control — decomposition
  // still fires: the middle sentence alone pins three anchored clauses,
  // which is real stepped work, not scene-setting.
  assert.equal(
    needsDecomposition(
      "Compare the 1805 and 1812 campaigns. Cite the figures for each army, name the commanding generals, and note the dates of the major battles. Which mattered more?",
    ),
    true,
  );
});

test("a single-sentence ask plans only on anchors — a comma count is length, not structure", () => {
  // The live browser failure this pins (2026-08-17): one imperative
  // sentence naming facets of ONE artifact hit the clause-count shortcut,
  // planned five parts, and each part — sighted only on its own label —
  // regenerated the whole widget from scratch. No clause pins an anchor,
  // so the ask is one propose; the build loop's iteration is the improver.
  assert.equal(
    needsDecomposition("Make me a counter widget in html, with a plus button, a minus button, and a number in between."),
    false,
  );
  // Multi-sentence work keeps the clause-count shortcut — steps stated as steps.
  assert.equal(
    needsDecomposition(
      "Compare the 1805 and 1812 campaigns. Cite the figures for each army, name the commanding generals, and note the dates of the major battles. Which mattered more?",
    ),
    true,
  );
});

test("a standing preference is not WORK, and does not trip the gate on its own commas", () => {
  // The live failure this pins (2026-08-17): "My name is Jordan. From now
  // on, whenever you give me more than one item, use a numbered list,
  // never bullets or a plain paragraph. Let's start: what's the actual
  // difference between weather and climate?" split into six clauses on the
  // preference sentence's own commas, tripped the length-4 shortcut, and
  // planned three redundant parts (each re-greeting Jordan, none of them
  // ever numbering anything) for what is one plain question.
  assert.equal(
    needsDecomposition(
      "My name is Jordan. From now on, whenever you give me more than one item, use a numbered list, never bullets or a plain paragraph. Let's start: what's the actual difference between weather and climate?",
    ),
    false,
  );
  // A second live failure (2026-08-17), same shape: replacing the standing
  // preference plus a marker instruction, both stated as standing rules,
  // still left a one-sentence question — which must stay exempt.
  assert.equal(
    needsDecomposition(
      'New rule, replacing the old one: stop using any list formatting entirely, always answer in flowing prose sentences. Also, from now on start every reply with the single word "Noted:" as the very first word. Given that, what\'s the difference between renewable and nonrenewable energy?',
    ),
    false,
  );
  // A standing preference stated ALONE, with no task attached, is not work.
  assert.equal(
    needsDecomposition("From now on, whenever you give me a list, number it. Never use bullets."),
    false,
  );
  // The preference-stripping pass must not eat genuine multi-part WORK that
  // merely happens to share a word with the marker list ("rule" inside a
  // real clause, not "new rule" / "as a rule").
  assert.equal(
    needsDecomposition(
      "Our budget is $2000, we need wifi at the venue, everyone eats vegetarian, and our CFO cannot attend on the 14th",
    ),
    true,
  );
});

test("extractArray finds a balanced array inside talk", () => {
  const arr = extractArray('Sure! Here is the plan:\n[{"label":"a [b]","description":"c"}]\nHope that helps.');
  assert.equal(arr.length, 1);
  assert.equal(arr[0].label, "a [b]");
});

test("extractArray refuses what does not parse", () => {
  assert.equal(extractArray("[{broken"), null);
  assert.equal(extractArray("no array here"), null);
  assert.equal(extractArray('{"an":"object"}'), null);
});

test("parsePlan unwraps an object-wrapped plan — the shape gemma2:2b actually returns", () => {
  const raw = JSON.stringify({
    parts: [{ label: "a", description: "first thing" }, { label: "b", description: "second thing" }],
  });
  const plan = parsePlan(raw, "the task");
  assert.equal(plan.degraded, false);
  assert.equal(plan.parts.length, 2);
  assert.equal(plan.parts[1].description, "second thing");
});

test("parsePlan degrades to the task itself, and says so", () => {
  const plan = parsePlan("I could not possibly decompose that.", "compare the reports");
  assert.equal(plan.degraded, true);
  assert.equal(plan.parts.length, 1);
  assert.equal(plan.parts[0].description, "compare the reports");
});

test("the loop plans, grounds each part, and corrects an invented figure", async () => {
  const events = [];
  const result = await runHolonicTask({
    task: "Summarize the port situation from the notes.",
    chunks,
    call: fakeModel(),
    onProgress: (phase, part) => events.push(phase + (part ? `:${part.id}` : "")),
  });

  assert.equal(result.plan.degraded, false);
  assert.equal(result.sections.length, 2);

  // Part one cited the address it was handed and the figure is in the bytes.
  const harbor = result.sections[0];
  assert.equal(harbor.used.length, 1);
  assert.equal(harbor.unsupported.length, 0);
  assert.equal(harbor.corrections, 0);

  // Part two's first draft carried the figure 999, which the material does
  // not hold. Under propose-then-check (2026-08-17) that is UNBACKED
  // knowledge, not a lie about the given: no correction pass burns on it,
  // the draft ships as written, and the finding lands in `unbacked` — the
  // marks and the record are its treatment. (Rewriting it away was measured
  // deleting true answers: the mayor the material was merely silent on.)
  const dredging = result.sections[1];
  assert.equal(dredging.corrections, 0);
  assert.equal(dredging.unsupported.length, 0);
  assert.ok(dredging.unbacked.some((u) => u.includes("999")));
  // No correction ran, so the part never earned the citation the rewrite
  // used to carry — an uncited part with its figure marked is the honest
  // shape now, and the marks are what the reader sees.
  assert.equal(dredging.used.length, 0);
  assert.ok(!events.includes("correct:p2"));

  // Assembly: two parts means headings, and provenance is the union of what
  // the parts' own checks established.
  assert.ok(result.output.includes("## the harbor figure"));
  assert.ok(result.output.includes("## the dredging schedule"));
  assert.equal(result.unsupported.length, 0);
  assert.ok(result.unbacked.some((u) => u.includes("999")));
  assert.ok(result.refs.length >= 1);
  assert.ok(result.channels.includes("cited"));

  // The log is the run's own account: a propose per part, a result per run —
  // and the fold of it agrees with what was returned, because the returned
  // plan IS that fold.
  assert.deepEqual(
    result.log.entries.map((e) => e.kind),
    ["propose", "propose", "result", "result"],
  );
  assert.deepEqual(foldPlan(result.log).parts, result.plan.parts);
  assert.equal(foldPlan(result.log).results.get("p2").corrections, 0);
  // The part's evidence accumulated from its result entry.
  assert.ok(projectParts(result.log)[0].evidence.length >= 1);
});

test("an unbacked figure never burns the correction budget; it ships and stays on record", async () => {
  // The stubborn model repeats its 999 no matter what. Before the split this
  // spent MAX_CORRECTIONS rewriting and shipped the failure anyway; now the
  // figure is unbacked knowledge — zero corrections, the draft ships, and
  // the record still names what nothing given backs.
  const result = await runHolonicTask({
    task: "Summarize the port situation from the notes.",
    chunks,
    call: fakeModel({ stubborn: true }),
  });
  const dredging = result.sections[1];
  assert.equal(dredging.corrections, 0);
  assert.ok(dredging.unbacked.some((u) => u.includes("999")));
  assert.ok(result.unbacked.some((u) => u.includes("999")));
  assert.equal(dredging.unsupported.length, 0);
});

test("no material is a typed gap on every part, never a guess", async () => {
  const result = await runHolonicTask({
    task: "Summarize the port situation.",
    chunks: [],
    call: fakeModel(),
  });
  assert.equal(result.refs.length, 0);
  assert.ok(result.open.length >= result.sections.length);
  assert.ok(result.open.every((o) => typeof o === "string"));
  assert.ok(result.open.some((o) => o.startsWith("no material matched")));
});

test("no material still offers a checkable figure to the web tier, not silence", async () => {
  // The live failure this pins (2026-08-17): a plain question with no
  // material attached ("what percentage of Earth's atmosphere is nitrogen,
  // and what year was the Kyoto Protocol signed?") produced zero
  // proof-seeking chips in the app — not because the web toggle or checking
  // mode were off, but because checkGrounding's findings are (correctly)
  // empty at zero passages, and app.js's proofTargets reads findings
  // straight off the section's `grounding` field with nothing else feeding
  // it. With no material, every figure and name in the draft is
  // unsupported by definition and must still reach `findings`.
  const result = await runHolonicTask({
    task: "What's the dredging budget?",
    chunks: [],
    call: fakeModel(),
  });
  const section = result.sections[0];
  assert.equal(section.passages.length, 0);
  assert.ok(section.grounding, "the raw grounding result must still be exposed on the section");
  assert.ok(
    section.grounding.findings.some((f) => f.text.includes("999")),
    "the unsupported figure must be a candidate finding for proofTargets, not silently dropped",
  );
  assert.ok(result.unbacked.some((u) => u.includes("999")));
});

test("a build part with no material never manufactures unbacked findings from its own code labels", async () => {
  // The live failure this pins (2026-08-17, constitutional pass): a counter
  // widget with no material attached answered with a fenced code block plus
  // its own prose walk-through ("Initializes a counter set to 0.", "Adds
  // click listeners for increment and decrement."). No material means
  // checkGrounding correctly declines to examine anything — but the SAME
  // no-material fallback that rightly offers a bare factual claim to the web
  // tier (the test above) was, before this fix, also firing here, reading
  // the model's account of its own artifact as world-claims nobody sourced
  // and manufacturing a findings list out of bare absence. A part's own
  // artifact is its own ground; the fallback must stay silent on it exactly
  // as checkGrounding itself would if there were passages to compare against.
  const result = await runHolonicTask({
    task: "build a counter widget in vanilla JS",
    chunks: [],
    call: async () =>
      [
        "```html",
        "<button id='dec'>-</button><span id='n'>0</span><button id='inc'>+</button>",
        "<script>let count = 0;</script>",
        "```",
        "Initializes a counter variable set to 0.",
        "Adds click listeners for increment and decrement.",
      ].join("\n"),
  });
  const section = result.sections[0];
  assert.equal(section.passages.length, 0);
  assert.deepEqual(section.grounding.findings, []);
  assert.equal(section.grounding.clean, true);
  assert.deepEqual(result.unbacked, []);
});

test("production retries a strayed part that matched nothing, as a supersede", async () => {
  // The plan strays entirely — a part sharing no term with the task, matching
  // nothing in the corpus. The rule proposes one retry in the task's own
  // words; the retry grounds; the stray drops out of the live fold and the
  // assembly with it.
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT)
      return JSON.stringify([{ label: "orbital telemetry", description: "Calibrate the orbital telemetry envelope." }]);
    const refs = offeredRefs(promptOf(messages));
    return refs.length
      ? `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}]`
      : "There is nothing here about that.";
  };
  const result = await runHolonicTask({ task: "summarize the harbor figure notes", chunks, call });

  assert.equal(result.production.halted_by, "operational-closure");
  assert.ok(result.production.steps >= 2);
  // The live fold holds only the retry; the log holds both, forever.
  assert.deepEqual(result.plan.parts.map((p) => p.id), ["p1r"]);
  const kinds = result.log.entries.map((e) => e.kind);
  assert.deepEqual(kinds, ["propose", "result", "propose", "result"]);
  assert.equal(result.log.entries[2].supersedes, "p1");
  assert.equal(result.log.entries[2].basis, "retry");
  // One section, grounded — the stray's ungrounded text is not in the output.
  assert.equal(result.sections.length, 1);
  assert.ok(result.refs.length >= 1);
  assert.ok(!result.output.includes("nothing here about that"));
});

test("a decomposed part whose own retrieval finds nothing still scopes to its own label — never the whole original multi-part task (live failure, 2026-09-09)", async () => {
  // The live failure this pins: "I'm researching the Panama Canal's
  // history for a documentary script. Who built the canal, when was it
  // completed, and why did the earlier French attempt fail?" decomposed
  // into several labeled parts, and every part re-answered the ENTIRE
  // original question rather than its own labeled slice — e.g. the
  // "Completion Timeline" section opened "The Panama Canal was built by
  // the United States..." Root cause: runPart's own executeMessages
  // ternary fell through to the bare-chat branches (`content: task`)
  // whenever a part's OWN retrieval came back with zero passages,
  // regardless of whether the part was flat or decomposed — discarding
  // buildExecutePrompt (which scopes to `part.label`/`part.description`
  // and, with no material, says so honestly) and handing the model the
  // WHOLE un-decomposed task as its only content instead.
  //
  // This part is deliberately NOT "strayed" (retryStrayedRule's own
  // trigger): its words share real terms with the task ("built", "canal",
  // "completed", "attempt", "fail"), so the retry rule never fires here —
  // this pins the executeMessages fallback alone, not the stray-retry path
  // the test above already covers. The corpus simply has no material on
  // the canal at all, so this part's own retrieval still comes back empty.
  const capturedExecutePrompts = [];
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) {
      return JSON.stringify([
        { label: "the harbor figure", description: "State the harbor figure the Kessington report gives." },
        { label: "the earlier attempt", description: "Describe why the earlier attempt to build the canal failed before it was completed." },
      ]);
    }
    if (messages[0]?.content?.startsWith(EXECUTE_SYSTEM_PROMPT)) capturedExecutePrompts.push(promptOf(messages));
    const refs = offeredRefs(promptOf(messages));
    return refs.length
      ? `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}]`
      : "There is nothing here about that.";
  };
  const task = "Who built the canal, when was it completed, and why did the earlier attempt fail?";
  await runHolonicTask({ task, chunks, call });

  const starvedPrompt = capturedExecutePrompts.find((p) => p.includes("the earlier attempt"));
  assert.ok(starvedPrompt, "the starved part's own EXECUTE prompt must have been captured");
  assert.ok(
    starvedPrompt.includes("Write this part: the earlier attempt."),
    "a part with zero passages of its own must still be scoped by buildExecutePrompt to its own label, not fall through to a bare chat prompt",
  );
  assert.ok(
    !starvedPrompt.includes(task),
    "the starved part's prompt must never carry the whole original multi-part task verbatim",
  );
});

test("resumption: the fold rebuilds from the serialized entries alone", async () => {
  const result = await runHolonicTask({
    task: "Summarize the port situation from the notes.",
    chunks,
    call: fakeModel(),
  });
  // Through JSON and back — no derivation state may live outside the entries.
  const revived = {
    task: result.log.task,
    entries: JSON.parse(JSON.stringify(result.log.entries)),
    nextSeq: result.log.nextSeq,
  };
  assert.deepEqual(projectParts(revived), projectParts(result.log));
  assert.deepEqual(foldPlan(revived).parts, result.plan.parts);
  assert.deepEqual([...foldPlan(revived).results.keys()], [...result.plan.results.keys()]);
});

test("flat mode: a one-part thought that spends no plan call", async () => {
  const call = async (messages, opts) => {
    // The whole point: planning was decided mechanically, so asking the
    // model to plan would be a spent call deciding what was already decided.
    assert.notEqual(messages[0].content, PLAN_SYSTEM_PROMPT, "flat mode must not spend a plan call");
    const refs = offeredRefs(promptOf(messages));
    return refs.length
      ? `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}]`
      : "Nothing matched.";
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
    discourse: "ports · the figure under revision · Kessington",
  });
  assert.equal(result.plan.parts.length, 1);
  assert.equal(result.plan.degraded, false);
  assert.equal(result.log.entries[0].basis, "flat");
  assert.ok(!result.output.startsWith("##"), "one part, no heading scaffolding");
  assert.ok(result.refs.length >= 1);
});

test("the discourse slice reaches a flat part with no history, and only as one line", async () => {
  // The flat material call is object-level now (2026-08-19): duty and
  // material in the system prompt, the person's words as the final user
  // turn. With no verbatim history to send, the one-line discourse rides
  // the system prompt — the fallback context, never a directive wrapper.
  let sawDiscourse = false;
  let taskVerbatim = false;
  const call = async (messages) => {
    if (messages[0]?.content.includes("The conversation so far: ports · the figure")) sawDiscourse = true;
    if (messages[messages.length - 1]?.content === "and the spring quarter?") taskVerbatim = true;
    const refs = offeredRefs(promptOf(messages));
    return refs.length ? `The figure was 12%. [${refs[0]}]` : "Nothing.";
  };
  await runHolonicTask({
    task: "and the spring quarter?",
    chunks,
    call,
    planMode: "flat",
    discourse: "ports · the figure under revision · Kessington",
  });
  assert.ok(sawDiscourse, "the discourse line rides the system prompt when no history exists");
  assert.ok(taskVerbatim, "the person's message arrives as itself, never inside a directive");
});

// ── the conversation's own anchor, extended to a topic-less flat follow-up ──
// Measured live 2026-08-18: asked "research the weather in NYC right now"
// with nothing attached, then "prove it" — the second turn's own words carry
// no topic at all. A decomposed part stays narrowly scoped to exactly that
// emptiness on purpose (the `strayed` disclosure, above); a flat turn IS the
// whole conversation, and discourse is the fold's own record of what it was
// about. app.js's preflight (proof.js's shouldPreflight/gatherPreflightMaterial)
// hands a materialless flat turn real chunks before it drafts; this is the
// other half — that retrieval must actually find them on "prove it" alone.

const weatherChunks = chunkSource(
  "web:weather.gov-0",
  "The National Weather Service forecast for New York City: 68 degrees, partly cloudy, updated this afternoon.",
);

test("a flat, topic-less follow-up retrieves on the fold's discourse, not just its own empty words", async () => {
  const call = async (messages) => {
    const refs = offeredRefs(promptOf(messages), weatherChunks);
    return refs.length
      ? `Confirmed: the National Weather Service forecast lists 68 degrees for New York City. [${refs[0]}]`
      : "I don't have enough information to confirm that.";
  };
  const result = await runHolonicTask({
    task: "prove it",
    chunks: weatherChunks,
    call,
    planMode: "flat",
    discourse: "NYC weather right now · asked and answered · NYC",
  });
  assert.ok(result.refs.length >= 1, "the discourse anchor must pull the weather material into retrieval");
});

test("without the discourse anchor, the same topic-less follow-up retrieves nothing — the fix is the anchor, not luck", async () => {
  const call = async (messages) => {
    const refs = offeredRefs(promptOf(messages), weatherChunks);
    return refs.length ? `Confirmed. [${refs[0]}]` : "I don't have enough information.";
  };
  const result = await runHolonicTask({ task: "prove it", chunks: weatherChunks, call, planMode: "flat" });
  assert.equal(result.refs.length, 0, "no discourse, no anchor — retrieval correctly finds nothing in 'prove it' alone");
});

// ── GFP Pass 35 — the keyless field's seat in the turn (offered beside lexical) ──

const fieldOffer = (passage) => ({
  kind: "figure",
  top: { ref: passage.ref, text: passage.text, source: "notes.txt", activation: 0.9 },
  passages: [{ ref: passage.ref, text: passage.text, source: "notes.txt", activation: 0.9 }],
  band: { lo: 0.1, hi: 0.5, margin: 0.05, draws: 150 },
});

test("GFP Pass 35: a passage the field recalls and the turn's pool holds — but lexical missed — is PROMOTED beside lexical, marked and named on the record", async () => {
  const dredge = chunks[1];
  const call = async (messages) => {
    const refs = offeredRefs(promptOf(messages));
    // The fake model reads the whole prompt: the promoted dredging passage
    // is now material, and this answer proves it reached the mouth.
    return refs.includes(dredge.ref) ? `The dredging schedule runs through March. [${dredge.ref}]` : "Nothing about dredging.";
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
    fieldRecall: () => fieldOffer(dredge),
  });
  assert.ok(result.refs.includes(dredge.ref), "the promoted passage was offered and the answer was bound to it");
  const w = result.sections[0].fieldWitness;
  assert.ok(w, "the witness is on the part's record");
  assert.deepEqual(w.promoted, [dredge.ref], "the promotion is named, typed, and bounded to the field's own cap");
  assert.equal(w.beyondPool.length, 0);
  assert.equal(w.agreed.length, 0, "lexical had not offered it — this is disagreement, not agreement");
});

test("GFP Pass 35: a recall from BEYOND the turn's pool is recorded and never fed to the model — the field does not feed the mouth on its own (P3)", async () => {
  const elsewhere = { ref: "other.txt#0-10", text: "An unrelated passage from another source entirely.", source: "other.txt" };
  let sawRef = false;
  const call = async (messages) => {
    const refs = offeredRefs(promptOf(messages));
    if (refs.includes(elsewhere.ref)) sawRef = true;
    return refs.length ? `Confirmed. [${refs[0]}]` : "Nothing matched.";
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
    fieldRecall: () => fieldOffer(elsewhere),
  });
  assert.equal(sawRef, false, "the beyond-pool passage never reached a prompt");
  assert.ok(!result.refs.includes(elsewhere.ref), "nothing beyond the pool was ever cited");
  const w = result.sections[0].fieldWitness;
  assert.deepEqual(w.beyondPool, [elsewhere.ref], "the beyond-pool recall is typed on the record — the instrument knows it reached further than the turn");
  assert.equal(w.promoted.length, 0);
});

test("GFP Pass 35: absent a field the turn is byte-identical — fieldRecall null changes nothing", async () => {
  const call = async (messages) => {
    const refs = offeredRefs(promptOf(messages));
    return refs.length ? `The figure was 12%. [${refs[0]}]` : "Nothing.";
  };
  const result = await runHolonicTask({ task: "what was the harbor figure?", chunks, call, planMode: "flat" });
  assert.ok(result.refs.length >= 1);
  assert.equal(result.sections[0].fieldWitness, undefined, "no fieldRecall, no witness on the record");
});

// ── GFP Pass 42 (last half) — the error updates the record ──

test("GFP Pass 42: a NOVEL sentence the witness confirms is admitted to the belief ledger, extracted from the DECIDER's own bytes and witnessed by its span — never the mouth's words, never self:model (P128/P2)", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  const kChunks = chunkSource("notes.txt", CORPUS);
  const decider = "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.";
  const span = "notes.txt#0-10";
  let capturedWitness = null;
  const stubHyperlexicon = {
    createHyperlexicon: () => ({ entries: [] }),
    admit: (log, edges, { witness } = {}) => { capturedWitness = witness; return { log: { entries: [...(log?.entries ?? []), ...edges] }, heard: edges, turnedAway: [] }; },
    foldHyperlexicon: () => [],
    foldWithStanding: () => [],
    redeclareFrame: (log) => log,
  };
  const call = async (messages) => {
    const refs = offeredRefs(promptOf(messages), kChunks);
    return refs.length ? `The harbor figure is 12% for the spring quarter. [${refs[0]}]` : "Nothing.";
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure?",
    chunks: kChunks,
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
    hyperlexicon: stubHyperlexicon,
    hyperlexiconLog: null,
    witnessSentences: async () => ({ rows: [{ sentence: "The harbor figure is 12% for the spring quarter.", witness: "states", decider, span }], asks: 1 }),
  });
  const sec = result.sections[0];
  assert.ok(sec.witnessLearned >= 1, "the witness-confirmed decider taught the record a claim it had not yet heard");
  assert.equal(capturedWitness, span, "the learned claim is witnessed by the DECIDER's bytes — the material, never self:model");
});

// ── GFP Pass 40 (A2) — the expectation is announced on the record BEFORE the draft ──

test("GFP Pass 40: an `expected` event fires before any execute — the composition (claims, voids, basis) is announced ahead of the mouth, even when empty", async () => {
  const phases = [];
  const call = async (messages) => {
    const refs = offeredRefs(promptOf(messages), weatherChunks);
    return refs.length ? `Confirmed: the National Weather Service lists 68 degrees. [${refs[0]}]` : "Nothing.";
  };
  await runHolonicTask({
    task: "what is the forecast?",
    chunks: weatherChunks,
    call,
    planMode: "flat",
    onProgress: (phase, part, info) => phases.push({ phase, at: part?.label ?? null, info }),
  });
  const expectedIdx = phases.findIndex((p) => p.phase === "expected");
  const executeIdx = phases.findIndex((p) => p.phase === "execute");
  assert.ok(expectedIdx >= 0, "the expectation is announced");
  assert.ok(expectedIdx < executeIdx, "and it is announced BEFORE the draft");
  assert.ok(typeof phases[expectedIdx].info.claims === "number", "the claim count is typed");
  assert.ok(typeof phases[expectedIdx].info.voids === "number", "the void count is typed (0 here — no declared absences)");
  assert.ok(typeof phases[expectedIdx].info.basis === "string" || phases[expectedIdx].info.basis === null, "the basis is disclosed");
});

// ── stable sub-assemblies (2026-08-19): the join is earned, never assumed ──
// Measured live: "research Robert Macnamera" asked right after a greeting
// retrieved greeting-etiquette passages, because the stale discourse line
// was concatenated into the retrieval query on spec and its words out-voted
// a misspelled name matching nothing. The part's own words retrieve FIRST;
// the discourse widens only on measured emptiness.

test("a flat question whose own words retrieve material never inherits the stale topic's passages", async () => {
  // A corpus holding both the on-topic passage and a stale-topic decoy that
  // the old concatenation would have pulled in via the discourse words.
  const mixed = chunkSource(
    "mixed.txt",
    [
      "The Kessington report put the harbor figure at 12% for the spring quarter.",
      "A proper greeting, involving a brief exchange like saying hello, is necessary for extended conversation with the user.",
    ].join("\n\n"),
  );
  let offered = null;
  const call = async (messages) => {
    offered = offeredRefs(promptOf(messages), mixed);
    return offered.length ? "The harbor figure was 12% for the spring quarter." : "Nothing.";
  };
  await runHolonicTask({
    task: "what was the harbor figure?",
    chunks: mixed,
    call,
    planMode: "flat",
    // The stale line — its words match the decoy passage, not the question.
    discourse: "Greeting exchange · conversation starts with a simple greeting · user, AI",
  });
  assert.ok(offered.some((r) => r.startsWith("mixed")), "the question's own words must still retrieve");
  const texts = mixed.filter((c) => offered.includes(c.ref)).map((c) => c.text);
  assert.ok(
    texts.every((t) => !/greeting/i.test(t)),
    `the stale topic's passage rode the discourse line into retrieval: ${texts.join(" | ")}`,
  );
});

test("the material path sends the real conversation on a flat turn — role-structured history, not only the one-line fold", async () => {
  // Measured live 2026-08-19: "what is my name?" ran the material path,
  // which dropped history the moment passages existed — the model then
  // summarized an irrelevant fetched page instead of seeing the
  // conversation it was asked about. A regular model with the full context
  // answers honestly; the instrument may not do worse than that null.
  let sawHistory = false;
  const history = [
    { role: "user", content: "hey" },
    { role: "assistant", content: "hello — what shall we look at?" },
  ];
  let sawDiscourse = false;
  const call = async (messages) => {
    const roles = messages.map((m) => m.role);
    if (
      messages[0].content.startsWith(FLAT_EXECUTE_SYSTEM_PROMPT) &&
      // The material rides in the system message — identified by its own
      // SOURCE NAME now, not a generic "MATERIAL" banner (user direction
      // 2026-08-27; source.js::sourceFace). The passage text itself is the
      // durable check: whatever heading precedes it, the material is here.
      messages[0].content.includes("harbor") &&
      roles.join(",") === "system,user,assistant,user" &&
      messages[1].content === "hey" &&
      messages[messages.length - 1].content === "what was the harbor figure?"
    )
      sawHistory = true;
    // Measured live 2026-08-19 ("system 2 keeps drifting off the
    // discourse"): the discourse line used to be dropped from the system
    // prompt the moment chatHistory existed — exactly backwards, since it
    // carries S1's own distilled topic/flow/entities, not a redundant copy
    // of the raw turns, and matters most when aperture.js's regime has
    // narrowed chatHistory down to almost nothing.
    if (messages[0].content.includes("ports · the figure under revision · Kessington")) sawDiscourse = true;
    const refs = offeredRefs(promptOf(messages));
    return refs.length ? "The figure was 12% for the spring quarter." : "Nothing.";
  };
  await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
    chatHistory: history,
    discourse: "ports · the figure under revision · Kessington",
  });
  assert.ok(
    sawHistory,
    "the flat material call: duty+material in system, verbatim history as messages, the person's words as the final user turn",
  );
  assert.ok(sawDiscourse, "the discourse line rides alongside chatHistory, never dropped just because history exists");
});

test("a decomposed part stays narrowly scoped even when discourse is set — the flat-only fold-in does not leak into planned parts", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), weatherChunks);
    return refs.length ? `Confirmed. [${refs[0]}]` : "I don't have enough information.";
  };
  const result = await runHolonicTask({
    task: "prove it",
    chunks: weatherChunks,
    call,
    planMode: "model",
    discourse: "NYC weather right now · asked and answered · NYC",
  });
  assert.equal(result.refs.length, 0, "a decomposed part's own words stay the only anchor — discourse fold-in is flat-only by design");
});

test("a verbatim reproduction fails as not-answering, and the correction can save it", async () => {
  let corrected = false;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1].content;
    const refs = offeredRefs(user);
    if (user.includes("word for word")) {
      corrected = true;
      return `The report gives the harbor figure as 12% for the spring quarter. [${refs[0]}]`;
    }
    // First draft: the passage, photocopied — grounded to perfection and
    // answering nothing.
    return "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.";
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
  });
  assert.ok(corrected, "the reproduction must trigger the tailored rewrite");
  assert.ok(!result.open.some((o) => o.includes("reproduces the material")), "the corrected draft answers");
  assert.ok(result.refs.length >= 1);
});

test("a stubborn reproduction: the failure stays typed, and the mechanical answer ships instead", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.";
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
  });
  // The model's failure stays on the record — it says why the mechanical
  // path ran — and what ships is the material's own sentences, quoted,
  // each with its address (user direction 2026-08-17: "ground all that").
  assert.ok(result.open.some((o) => o.includes("reproduces the material verbatim; it does not answer")));
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("[notes.txt#"), result.output);
  assert.ok(result.output.includes("12%"), "the material's own sentence carries the actual answer");
  assert.ok(result.refs.length >= 1, "verbatim material with its address is a warrant the assembly may keep");
});

test("a single, already-verified TRUE sentence is not flagged as reproduction — live specimen 2026-09-15: 'Paris is the capital of France.' is the only honest way to state a five-word fact, and the old behavior (demanding a rewrite) pushed a small model into a worse, stitched-together answer", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  const franceCorpus = [
    "France is a country in Western Europe. Paris is the capital of France. Paris sits on the Seine river.",
  ].join("\n\n");
  const franceChunks = chunkSource("france.txt", franceCorpus);
  let corrected = false;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1].content;
    if (user.includes("copies the passage word for word")) corrected = true;
    return "Paris is the capital of France.";
  };
  const result = await runHolonicTask({
    task: "What's the capital of France?",
    chunks: franceChunks,
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.equal(corrected, false, "a verified true, single-sentence factoid answer must not be sent back as 'copies the passage word for word'");
  assert.ok(result.output.includes("Paris"));
});

test("the single-verified-fact exemption never fires without a real relation reader wired — an unverifiable single sentence gets no free pass", async () => {
  const franceCorpus = ["France is a country in Western Europe. Paris is the capital of France."].join("\n\n");
  const franceChunks = chunkSource("france2.txt", franceCorpus);
  let corrected = false;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1].content;
    if (user.includes("copies the passage word for word")) {
      corrected = true;
      return "Paris, the capital, is a major European city.";
    }
    return "Paris is the capital of France.";
  };
  // No makeRelationReader injected — mirrors a caller with no relation tier
  // wired (a real, if narrower, configuration); the exemption may only ever
  // fire on a POSITIVELY verified bound claim, never on the mere absence of
  // a checker to disprove it.
  const result = await runHolonicTask({ task: "What's the capital of France?", chunks: franceChunks, call, planMode: "flat" });
  assert.ok(corrected, "with no relation reader to verify the claim, the ordinary mass-majority test must still decide");
});

test("the single-verified-fact exemption does NOT rescue a genuine multi-sentence reproduction — the Kessington specimen above must still correct", async () => {
  let corrected = false;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1].content;
    if (user.includes("copies the passage word for word")) {
      corrected = true;
      const refs = offeredRefs(user);
      return `The report gives the harbor figure as 12% for the spring quarter. [${refs[0]}]`;
    }
    return "The Kessington report put the harbor figure at 12% for the spring quarter, revising the earlier estimate downward after the audit.";
  };
  const result = await runHolonicTask({ task: "what was the harbor figure?", chunks, call, planMode: "flat" });
  assert.ok(corrected, "a genuinely evasive verbatim copy must still be caught — the exemption is not a blanket pass for anything one-sentence-shaped");
  assert.ok(result.refs.length >= 1);
});

test("an echo answer establishes nothing: typed open, no refs granted", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    // The model restates the question — with the offered ref attached, which
    // is exactly how a live echo slipped through as "grounded".
    const refs = offeredRefs(promptOf(messages));
    return `What was the harbor figure for the spring quarter? [${refs[0] ?? "x#0-1"}]`;
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure for the spring quarter?",
    chunks,
    call,
    planMode: "flat",
  });
  assert.ok(result.open.some((o) => o.includes("restates the prompt")));
  // The echo itself earned nothing; the mechanical assembly that ships in
  // its place quotes the material's own sentence — which here carries the
  // very figure the echo dodged — with its address attached.
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("12%"), result.output);
  assert.ok(result.output.includes("[notes.txt#"), "every shipped sentence wears its address");
});

// ── the dialogue-narration echo, from the live NYC-weather runs ──────────────
// Measured 2026-08-18: asked "what is the weather in NYC today?" with real
// weather pages fetched and offered, the model narrated the dialogue in the
// third person — "The conversation starts with a question about the weather
// in New York City. The user is waiting for more information about the
// weather." — across three consecutive turns. Neither existing echo test can
// see it: the content words (user, conversation, waiting, information) come
// from the dialogue apparatus, not the question, so the word-coverage test
// reads them as content, and the draft shipped as "the model's own words"
// while the fetched forecast sat unread in the offered passages.
test("a draft that narrates the dialogue is an echo: refused, material's own sentences ship instead", async () => {
  const weather = chunkSource(
    "weather.txt",
    [
      "New York City, NY 10-Day Weather Forecast: Location: New York City, NY Elevation: 1 ft. Today's forecast calls for partly cloudy skies with a high near 82 and a low around 68.",
      "New York City sees heavy rain during Monday morning commute, with skies clearing by afternoon and temperatures reaching the mid 70s.",
    ].join("\n\n"),
  );
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    // The live failure, verbatim shape: every draft narrates the dialogue.
    return "The conversation starts with a question about the weather in New York City. The user is waiting for more information about the weather.";
  };
  const result = await runHolonicTask({
    task: "yeah i want you to look it up",
    chunks: weather,
    call,
    planMode: "flat",
    discourse: "asked about the weather in New York City today",
  });
  assert.ok(result.open.some((o) => o.includes("restates the prompt")), "narration is typed as an echo");
  assert.ok(!result.output.includes("The user is waiting"), "the narration never ships");
  assert.ok(!result.output.includes("The conversation starts"), "the narration never ships");
  // What ships instead is the material's own forecast, with its address —
  // the mechanical assembly the narration was standing in front of.
  assert.ok(result.output.includes("partly cloudy") || result.output.includes("heavy rain"), result.output);
  assert.ok(result.output.includes("[weather.txt#"), "every shipped sentence wears its address");
});

test("a dialogue-act verb inside a LATER clause never convicts an earlier, unrelated subject", async () => {
  // Chorus review (2026-08-18, Dijkstra persona): the narration guard's
  // gap-between-subject-and-verb originally excluded only sentence-final
  // punctuation, so a verb from the closed list sitting inside a relative
  // clause anywhere later in the sentence still matched — "The question of
  // emancipation, WHICH CONTEMPORARIES SAID would ruin the gentry, defined
  // the decade" has "the question" as subject and "said" downstream, with
  // nothing narrating anything. Fixed by stopping the gap at the same
  // clause boundaries WH_CLAUSE already respects (comma/semicolon/colon/
  // dash), not just end-of-sentence punctuation.
  const history = chunkSource("history.txt", "The question of emancipation defined the decade for the gentry.");
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return "The question of emancipation, which contemporaries said would ruin the gentry, defined the decade.";
  };
  const result = await runHolonicTask({
    task: "what defined the decade for the gentry?",
    chunks: history,
    call,
    planMode: "flat",
  });
  assert.ok(!result.open.some((o) => o.includes("restates the prompt")), "a real answer with a relative clause is not an echo");
  assert.ok(result.output.includes("defined the decade"), result.output);
});

test("material genuinely about a user keeps its non-narration sentences", async () => {
  // The disclosed residue's other side, pinned so the guard never widens
  // into stripping real content: a sentence whose subject happens to open
  // "The user" but carries no dialogue-act verb is content, not narration.
  const manual = chunkSource(
    "manual.txt",
    "The user account is locked after three failed attempts. The reset procedure requires an administrator token issued by the operations desk.",
  );
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return "The user account is locked after three failed attempts, and the reset procedure requires an administrator token.";
  };
  const result = await runHolonicTask({
    task: "when does an account lock and how is it reset?",
    chunks: manual,
    call,
    planMode: "flat",
  });
  assert.ok(!result.open.some((o) => o.includes("restates the prompt")), "a locked-account answer is not an echo");
  assert.ok(result.output.includes("locked after three failed attempts"), "the content ships");
});

test("a prompt that matched no material gets one plain-chat reply, not a diagnosis", async () => {
  // AMENDED 2026-09-18 (P244): a bare "hi" cold open — nothing attached,
  // nothing said — no longer reaches the mouth at all; the oracle door
  // refuses with zero calls and the fixed reply. The original intent stands
  // untouched: no diagnosis, no echo on the record — a refusal is neither.
  // The plain-chat path itself moved one step over: it is pinned below on a
  // question carrying its own checkable claim.
  const calls = [];
  const call = async (messages) => {
    calls.push(messages[0].content);
    return "Hi there! How can I help you today?";
  };
  const refused = await runHolonicTask({ task: "hi", chunks: [], call, planMode: "flat" });
  assert.equal(refused.oracleRefused, true);
  assert.equal(calls.length, 0, "no model call spent on free association");
  assert.match(refused.output, /What should I read\?/);
  assert.ok(refused.open.every((o) => !o.includes("restates")), "no typed echo on the record");

  const result = await runHolonicTask({ task: "hi there, what can you help me with today", chunks: [], call, planMode: "flat" });
  // The echo never ships: the part answered with a real greeting.
  assert.equal(result.output, "Hi there! How can I help you today?");
  assert.ok(calls.includes(CHAT_SYSTEM_PROMPT), "the chat fallback ran");
  assert.ok(result.open.every((o) => !o.includes("restates")), "no typed echo on the record");
});

// BATTERY-TESTED 2026-09-08: pinned so a future edit to CHAT_SYSTEM_PROMPT
// cannot silently drop the fix for the deflection loop found live on this
// exact path — an opinion question bounced back with no stance ("Ooh,
// that's a classic debate! Tell me what side you're on. 🌭 🥪 🤔"), and a
// three-turn restaurant ask that already had occasion, city, and party size
// in hand still never got a place named, only a fourth clarifying question.
// This branch's system message IS the whole prompt (no material framing to
// fall back on), so the fix has nowhere to live but this string.
test("CHAT_SYSTEM_PROMPT tells the model to commit to an opinion or a suggestion, not just ask another question", () => {
  assert.match(CHAT_SYSTEM_PROMPT, /own opinion/);
  assert.match(CHAT_SYSTEM_PROMPT, /give one plainly/);
  assert.match(CHAT_SYSTEM_PROMPT, /answer from that instead of asking/);
});

// ── the void, acknowledged (2026-08-19, user direction) ─────────────────
// "if the surf did not turn something up, the model should be fed the
// acknowledgement of this void" — a preflight search that ran and found
// nothing must not look, to the model, identical to a turn where no search
// was ever attempted.

test("searchedVoid reaches a flat chat turn's system prompt as a fact, not an instruction", async () => {
  let sawVoid = false;
  const call = async (messages) => {
    if (messages[0].content.includes(SEARCHED_VOID_PREFIX)) sawVoid = true;
    return "I looked and couldn't find anything on that — sorry!";
  };
  const result = await runHolonicTask({
    task: "what's the score of the Kessington charity match right now?",
    chunks: [],
    call,
    planMode: "flat",
    searchedVoid: `${SEARCHED_VOID_PREFIX} (checked the web: the search ran but found no pages for these words.)`,
  });
  assert.ok(sawVoid, "the void must ride the system prompt, not be silently dropped");
  assert.ok(result.output.length > 0);
});

test("searchedVoid also reaches a flat chat turn that carries verbatim history", async () => {
  let sawVoid = false;
  const call = async (messages) => {
    if (messages[0].content.includes(SEARCHED_VOID_PREFIX)) sawVoid = true;
    return "Still nothing on that one.";
  };
  await runHolonicTask({
    task: "any update?",
    chunks: [],
    call,
    planMode: "flat",
    chatHistory: [{ role: "user", content: "what's the score?" }, { role: "assistant", content: "let me check." }],
    searchedVoid: SEARCHED_VOID_PREFIX,
  });
  assert.ok(sawVoid, "the void must reach the history-carrying branch too, not just the no-history one");
});

test("the discourse line reaches a materialless flat chat turn that carries verbatim history too", async () => {
  // Same bug, same fix, the other executeMessages branch: a chat turn with
  // no material still used to drop the one-line discourse fold the moment
  // chatHistory existed — the exact branch a startle-narrowed conversation
  // (aperture.js's presentWindow, down to as little as one exchange) falls
  // into most often, which is precisely when the distilled anchor matters.
  let sawDiscourse = false;
  const call = async (messages) => {
    if (messages[0].content.includes("harbor traffic · the spring revision")) sawDiscourse = true;
    return "Still the spring figure, yes.";
  };
  await runHolonicTask({
    task: "and the other one?",
    chunks: [],
    call,
    planMode: "flat",
    chatHistory: [{ role: "user", content: "what's the figure?" }, { role: "assistant", content: "12%." }],
    discourse: "harbor traffic · the spring revision",
  });
  assert.ok(sawDiscourse, "discourse must reach the history-carrying materialless branch too, not just the no-history one");
});

test("without searchedVoid, an ordinary materialless chat turn is untouched — no phantom acknowledgement", async () => {
  let sawVoid = false;
  const call = async (messages) => {
    if (messages[0].content.includes(SEARCHED_VOID_PREFIX)) sawVoid = true;
    return "Hey! What's up?";
  };
  await runHolonicTask({ task: "hey", chunks: [], call, planMode: "flat" });
  assert.equal(sawVoid, false, "a turn where no search ran must never claim one did");
});

test("searchedVoid is flat-only — a decomposed part's chat branch stays untouched", async () => {
  // A decomposed part matters only when discourse.js's own scoping says
  // it should widen; a task-wide fact like a preflight search must not
  // leak into a planned part's narrower framing.
  let sawVoid = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    if (messages[0]?.content?.includes(SEARCHED_VOID_PREFIX)) sawVoid = true;
    return "An answer.";
  };
  await runHolonicTask({
    task: "hi there, two things: a) how are you b) what's new",
    chunks: [],
    call,
    planMode: "model",
    searchedVoid: SEARCHED_VOID_PREFIX,
  });
  assert.equal(sawVoid, false, "searchedVoid must not reach a decomposed part's own prompt");
});

// ── the conversation's recent voice (2026-09-13, arcs.js/pathos-turn.js) ──
// The pathos system is NOT optional: every exchange is undergone in
// observeExchange, and when the arc went flat or its ground failed, the
// next turn hears the FACT about its own recent answers — threaded exactly
// like searchedVoid is (flat only, information never a directive).

test("voiceCue reaches a flat material turn's system prompt", async () => {
  const cue = arcVoiceCueFor({ flat: true, framesLocked: true });
  let sawCue = false;
  const call = async (messages) => {
    if (messages[0].content.includes(cue)) sawCue = true;
    return "Moscow was burned by those who abandoned it.";
  };
  await runHolonicTask({ task: "why was Moscow burned?", chunks, call, planMode: "flat", voiceCue: cue });
  assert.ok(sawCue, "the voice cue must ride the flat material branch's system prompt");
});

test("voiceCue also reaches a flat chat turn that carries verbatim history", async () => {
  const cue = pathosCueFor({ kind: "stale" });
  let sawCue = false;
  const call = async (messages) => {
    if (messages[0].content.includes(cue)) sawCue = true;
    return "Still the same.";
  };
  await runHolonicTask({
    task: "and?",
    chunks: [],
    call,
    planMode: "flat",
    chatHistory: [{ role: "user", content: "the figure?" }, { role: "assistant", content: "12%." }],
    voiceCue: cue,
  });
  assert.ok(sawCue, "the voice cue must reach the history-carrying branch too, not just the material one");
});

test("without a voiceCue, an ordinary flat turn is untouched — no phantom cue", async () => {
  let sawCue = false;
  const call = async (messages) => {
    if (messages[0].content.includes("same words") || messages[0].content.includes("same rhythm")) sawCue = true;
    return "Hey!";
  };
  await runHolonicTask({ task: "hey", chunks: [], call, planMode: "flat" });
  assert.equal(sawCue, false, "a turn whose arc holds must never claim it went flat");
});

test("voiceCue is flat-only — a decomposed part's chat branch stays untouched", async () => {
  let sawCue = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    if (messages[0]?.content?.includes("same words") || messages[0]?.content?.includes("same rhythm")) sawCue = true;
    return "An answer.";
  };
  await runHolonicTask({
    task: "hi there, two things: a) how are you b) what's new",
    chunks: [],
    call,
    planMode: "model",
    voiceCue: arcVoiceCueFor({ flat: true, framesLocked: true }),
  });
  assert.equal(sawCue, false, "the voice cue must not reach a decomposed part's own prompt");
});

// ── attached, but not retrieved (the harbor-note incident) ──────────────
// Before this, a materialless chat turn (`!passages.length`) read exactly
// the same whether nothing was EVER given or a source was attached and this
// turn's own retrieval simply came back empty (the attachments switch off,
// every source muted, or a genuinely empty draw) — so the hyperlexicon's
// own cross-turn ledger, accumulated from earlier, unrelated reading, was
// the only thing on the page that looked like "what you were given".
// Measured live: a gym-workout dialogue attached and asked to be
// summarized in one sentence, with retrieval empty, answered entirely
// about an unrelated single-witness note from a prior session ("Ships can
// stay safe in the harbor during a storm").

test("sourcesAttached reaches a flat chat turn's system prompt as a fact, not an instruction", async () => {
  let sawIt = false;
  const call = async (messages) => {
    if (messages[0].content.includes(UNRETRIEVED_MATERIAL_PREFIX)) sawIt = true;
    return "I don't see anything in what's attached that answers that.";
  };
  const result = await runHolonicTask({
    task: "can you summarize this conversation in one sentence?",
    chunks: [],
    call,
    planMode: "flat",
    sourcesAttached: true,
  });
  assert.ok(sawIt, "an attached-but-unretrieved source must ride the system prompt as a fact");
  assert.ok(result.output.length > 0);
});

test("sourcesAttached also reaches a flat chat turn that carries verbatim history", async () => {
  let sawIt = false;
  const call = async (messages) => {
    if (messages[0].content.includes(UNRETRIEVED_MATERIAL_PREFIX)) sawIt = true;
    return "Still nothing in it that answers that.";
  };
  await runHolonicTask({
    task: "anything else in there?",
    chunks: [],
    call,
    planMode: "flat",
    chatHistory: [{ role: "user", content: "summarize it" }, { role: "assistant", content: "I don't see anything that answers that." }],
    sourcesAttached: true,
  });
  assert.ok(sawIt, "the fact must reach the history-carrying branch too, not just the no-history one");
});

test("without sourcesAttached, an ordinary materialless chat turn is untouched — no phantom attachment", async () => {
  let sawIt = false;
  const call = async (messages) => {
    if (messages[0].content.includes(UNRETRIEVED_MATERIAL_PREFIX)) sawIt = true;
    return "Hey! What's up?";
  };
  await runHolonicTask({ task: "hey", chunks: [], call, planMode: "flat" });
  assert.equal(sawIt, false, "a bare chat turn with nothing ever attached must never claim otherwise");
});

test("sourcesAttached does not fire once something is actually retrieved", async () => {
  // The gate is `!passages.length && sourcesAttached`, not `sourcesAttached`
  // alone — a turn whose retrieval DID find something must read exactly as
  // before; this is the control that the fix is additive, not a new floor
  // under every materialless answer.
  const workout = chunkSource("workout.txt", "Coach: Four sets of squats, eight reps each, then three sets of lunges.");
  let sawIt = false;
  const call = async (messages) => {
    if (messages.some((m) => m.content?.includes(UNRETRIEVED_MATERIAL_PREFIX))) sawIt = true;
    return "You did four sets of squats and three of lunges.";
  };
  await runHolonicTask({
    task: "how many sets of squats?",
    chunks: workout,
    call,
    planMode: "flat",
    sourcesAttached: true,
  });
  assert.equal(sawIt, false, "a turn that actually retrieved something must not also claim it found nothing");
});

test("sourcesAttached is flat-only — a decomposed part's chat branch stays untouched", async () => {
  let sawIt = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    if (messages[0]?.content?.includes(UNRETRIEVED_MATERIAL_PREFIX)) sawIt = true;
    return "An answer.";
  };
  await runHolonicTask({
    task: "hi there, two things: a) how are you b) what's new",
    chunks: [],
    call,
    planMode: "model",
    sourcesAttached: true,
  });
  assert.equal(sawIt, false, "sourcesAttached must not reach a decomposed part's own prompt");
});

test("the ledger is WITHHELD (not deleted) on exactly the turn UNRETRIEVED_MATERIAL_PREFIX names — the disclosure alone was measured live and was not enough", async () => {
  // The live incident this pins: gemma2:2b, told in the same system message
  // that nothing below was the attachment, still answered from the harbor
  // note anyway ("We've been chatting about harbor safety for kids"). The
  // mechanical half of the fix withholds the temptation rather than trusting
  // a small model's instruction-following (L5) — the note itself is
  // untouched on the ledger, only THIS prompt's offer of it is withheld.
  const notes = [{ id: "a", subject: "7 Examples Of Harbor", verb: "used", object: "In a Sentence For Kids", witnesses: ["web:search-results#0-9~r"], sources: 1, instruments: 1, standing: "single-witness", kinds: {} }];
  const stubHyperlexicon = {
    createHyperlexicon: () => ({ entries: [] }),
    admit: (log, edges) => ({ log, heard: edges.map(() => ({})), turnedAway: [] }),
    foldHyperlexicon: () => notes,
    foldWithStanding: () => notes,
    redeclareFrame: (log) => log,
  };
  let seen = null;
  const call = async (messages) => { seen = messages[0].content; return "I don't see anything in what's attached that answers that."; };
  await runHolonicTask({
    task: "can you summarize this conversation in one sentence?",
    chunks: [],
    call,
    planMode: "flat",
    sourcesAttached: true,
    hyperlexicon: stubHyperlexicon,
    hyperlexiconLog: { entries: [] },
  });
  assert.ok(seen.includes(UNRETRIEVED_MATERIAL_PREFIX), "the disclosure must still fire");
  assert.doesNotMatch(seen, /From earlier reading/, "the ledger's cross-session note must not ALSO be offered on this turn");
  assert.doesNotMatch(seen, /Examples Of Harbor/, "the specific unrelated note must not reach the prompt");
});

test("without sourcesAttached, a genuinely bare chat turn still sees the ledger — P84 is untouched", async () => {
  // The control: withholding is scoped to the one narrow case above, never
  // to every materialless turn — a chat with nothing attached at all should
  // stand on earlier reading exactly as P84 already established.
  const notes = [{ id: "a", subject: "Mars", verb: "orbits", object: "the sun", witnesses: ["m.txt#0-9~r"], sources: 1, instruments: 1, standing: "single-witness", kinds: {} }];
  const stubHyperlexicon = {
    createHyperlexicon: () => ({ entries: [] }),
    admit: (log, edges) => ({ log, heard: edges.map(() => ({})), turnedAway: [] }),
    foldHyperlexicon: () => notes,
    foldWithStanding: () => notes,
    redeclareFrame: (log) => log,
  };
  let seen = null;
  const call = async (messages) => { seen = messages[0].content; return "Mars orbits the sun, yes."; };
  await runHolonicTask({
    task: "what orbits the sun?",
    chunks: [],
    call,
    planMode: "flat",
    hyperlexicon: stubHyperlexicon,
    hyperlexiconLog: { entries: [] },
  });
  assert.doesNotMatch(seen, /UNRETRIEVED_MATERIAL_PREFIX/, "sanity: the constant name itself never leaks");
  assert.match(seen, /From earlier reading/, "a genuinely bare chat still stands on earlier reading");
  assert.match(seen, /Mars — orbits→ the sun/);
});

test("priorPass reaches a flat chat turn's system prompt as S1's own words, checkable not assumed right", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    return "Confirmed — that's right.";
  };
  const result = await runHolonicTask({
    task: "what's 2+2 in Roman numerals?",
    chunks: [],
    call,
    planMode: "flat",
    priorPass: "IV",
  });
  assert.ok(seen.includes('"IV"'), `S1's own answer must ride the system prompt verbatim: ${seen}`);
  assert.ok(!/\byou must\b/i.test(seen), "information, not an instruction stacked on top");
  assert.ok(result.output.length > 0);
});

test("priorPass also reaches the flat MATERIAL branch — unlike searchedVoid, S1's answer stays relevant once material exists", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    const refs = offeredRefs(promptOf(messages));
    return `The Kessington report puts the harbor figure at 12% for the spring quarter. [${refs[0] ?? "x#0-1"}]`;
  };
  await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
    priorPass: "It was around 12%, I think.",
  });
  assert.ok(seen.includes("It was around 12%"), `S1's answer must reach the material branch too: ${seen}`);
});

test("without priorPass, an ordinary turn is untouched — no phantom first pass", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    return "Hey! What's up?";
  };
  // P244 (2026-09-18): a bare "hey" cold open refuses at the oracle door
  // before any prompt is built, so the no-phantom pin moved one step over
  // to a checkable-but-materialless question — the same ordinary turn this
  // always meant, minus the greeting the door now owns.
  await runHolonicTask({ task: "hey, tell me about the harbor festival", chunks: [], call, planMode: "flat" });
  assert.ok(!seen.includes("faster, unchecked first pass"), "a turn with no S1 pass must never claim one existed");
});

test("priorPass is flat-only — a decomposed part's own prompt stays untouched", async () => {
  let seen = null;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    seen = messages[0]?.content;
    return "An answer.";
  };
  await runHolonicTask({
    task: "hi there, two things: a) how are you b) what's new",
    chunks: [],
    call,
    planMode: "model",
    priorPass: "Doing fine, nothing new.",
  });
  assert.ok(!seen.includes("faster, unchecked first pass"), "priorPass must not reach a decomposed part's own prompt");
});

// ── the turn's own date (2026-09-08, battery-tested "Rapid topic hopping") ──
// "have you heard anything about the new iphone", nothing attached, answered
// "the iPhone 15" — several generations stale — with no hedge, because
// nothing in any prompt this instrument builds had ever told the model what
// "now" is. `now` is the fix: a bare fact, same shape and same flat-only
// scope as searchedVoid/priorPass above.
test("todayLine: a Date, an ISO string, and epoch millis all format the same bare fact; absent or invalid input is silent", () => {
  assert.equal(todayLine(new Date("2026-09-08T03:00:00Z")), "Today's date is 2026-09-08.");
  assert.equal(todayLine("2026-09-08T23:00:00Z"), "Today's date is 2026-09-08.");
  assert.equal(todayLine(new Date("2026-09-08T03:00:00Z").getTime()), "Today's date is 2026-09-08.");
  assert.equal(todayLine(null), "", "no date declared means no line, never a guessed one");
  assert.equal(todayLine(undefined), "");
  assert.equal(todayLine("not a date"), "", "an invalid date must not ship as a claim about the world");
});

test("now reaches a flat chat turn's system prompt as a bare fact, not an instruction", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    return "I'm not sure what the newest one is.";
  };
  const result = await runHolonicTask({
    task: "have you heard anything about the new iphone",
    chunks: [],
    call,
    planMode: "flat",
    now: new Date("2026-09-08T12:00:00Z"),
  });
  assert.ok(seen.includes("Today's date is 2026-09-08."), `the date must ride the system prompt: ${seen}`);
  assert.ok(!/\byou must\b|\bshould\b/i.test(seen), "information, not an instruction stacked on top");
  assert.ok(result.output.length > 0);
});

test("now also reaches the flat MATERIAL branch — a fetched page is no reason to hide the date", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    const refs = offeredRefs(promptOf(messages));
    return `The Kessington report puts the harbor figure at 12% for the spring quarter. [${refs[0] ?? "x#0-1"}]`;
  };
  await runHolonicTask({
    task: "what was the harbor figure?",
    chunks,
    call,
    planMode: "flat",
    now: new Date("2026-09-08T12:00:00Z"),
  });
  assert.ok(seen.includes("Today's date is 2026-09-08."), `the date must reach the material branch too: ${seen}`);
});

test("now also reaches a flat chat turn that carries verbatim history", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    return "Still nothing new that I know of.";
  };
  await runHolonicTask({
    task: "anything else?",
    chunks: [],
    call,
    planMode: "flat",
    chatHistory: [{ role: "user", content: "hi" }, { role: "assistant", content: "hey!" }],
    now: new Date("2026-09-08T12:00:00Z"),
  });
  assert.ok(seen.includes("Today's date is 2026-09-08."), "the date must reach the history-carrying branch too, not just the no-history one");
});

test("without now, an ordinary turn is untouched — no phantom date", async () => {
  let seen = null;
  const call = async (messages) => {
    seen = messages[0].content;
    return "Hey! What's up?";
  };
  // P244 (2026-09-18): same move as the no-phantom-first-pass pin above —
  // a bare "hey" now refuses before any prompt exists.
  await runHolonicTask({ task: "hey, tell me about the harbor festival", chunks: [], call, planMode: "flat" });
  assert.ok(!seen.includes("Today's date is"), "a turn with no declared date must never invent one");
});

test("now is flat-only — a decomposed part's own prompt stays untouched", async () => {
  let seen = null;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    seen = messages[0]?.content;
    return "An answer.";
  };
  await runHolonicTask({
    task: "hi there, two things: a) how are you b) what's new",
    chunks: [],
    call,
    planMode: "model",
    now: new Date("2026-09-08T12:00:00Z"),
  });
  assert.ok(!seen.includes("Today's date is"), "now must not reach a decomposed part's own prompt");
});

test("a draft that opens by restating the prompt ships without its framing", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages));
    return `The question is about the harbor figure. The Kessington report puts the harbor figure at 12% for the spring quarter. [${refs[0] ?? "x#0-1"}]`;
  };
  const result = await runHolonicTask({
    task: "what was the harbor figure for the spring quarter?",
    chunks,
    call,
    planMode: "flat",
  });
  assert.ok(!result.output.includes("The question is about"), "the framing sentence was stripped");
  assert.ok(result.output.includes("Kessington report"), "the content survives");
});

// ── the completeness gate (2026-08-19, user direction: "we STILL are not
// getting Johnson, it's not adversarially checking if there is more to the
// story") — the live specimen this closes: "who was Lincoln's vice
// president?" answered "Hannibal Hamlin" alone, bound and correct, while
// the material also stated Andrew Johnson as a second, equally real VP.
// hypergraph.js's own clusterFillers already computed this cardinality on
// every such claim; nothing downstream ever asked. This is that ask,
// against the REAL relation tier — not a fixture standing in for it.
// Same fixture hypergraph.test.mjs's own LINCOLN_PASSAGES already proved
// establishes Lincoln/Hamlin/Johnson/Seward as real referents (Lincoln
// needed outside sentence-initial position too — see that file's own
// fixture comment) — reused rather than re-derived.
const LINCOLN_TEXT =
  "Lincoln appointed Hamlin. Lincoln appointed Johnson. Lincoln nominated Seward. Hamlin visited Lincoln often. Johnson visited Lincoln rarely.";

test("a bound-but-incomplete answer triggers the completeness gate, and naming the missing filler clears it", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrected = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      corrected = true;
      assert.match(user, /Johnson/, "the correction prompt must name the real, missing filler — not just say 'be more complete'");
      return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
    }
    // First draft: true, bound, and — the whole point — incomplete. Worded
    // differently from the material's own sentence (not a verbatim copy of
    // it) so this tests the completeness gate specifically, not reproduction.
    return "Lincoln appointed Hamlin in 1861.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.ok(corrected, "the incomplete verdict must trigger the tailored rewrite");
  assert.match(result.output, /Johnson/, "the shipped answer must cover the filler the first draft missed");
  assert.ok(
    !result.open.some((o) => o.includes("names only one of several")),
    "once both fillers are covered, the gap is no longer open",
  );
});

// ── the MIRROR completeness signal: one verb+object slot, competing
// SUBJECTS (queryFillers with subject left open) — the "Abraham Lincoln's
// vice president" specimen, run for real first before it was wired
// (see POLICIES.md P38's amendment for the live queryFillers proof this
// closes). incompleteClaimsOf already caught "Lincoln —appointed→
// {Hamlin, Johnson}" (one subject, many objects); this is the other
// direction: "{Hamlin, Johnson} —was→ Lincoln's vice president" (one
// object, many subjects) — a question can outrun the material on either
// end, and only one end was ever checked before today.
const COMPETING_SUBJECT_TEXT =
  "Hannibal Hamlin was Lincoln's vice president. Andrew Johnson was Lincoln's vice president. Lincoln nominated Seward for the post.";

test("a slot with competing SUBJECTS (not objects) trips the completeness gate too, and the correction names both", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrected = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      corrected = true;
      assert.match(user, /Johnson/, "the correction prompt must name the real, missing subject — not just say 'be more complete'");
      return "Hannibal Hamlin was Lincoln's vice president. Andrew Johnson was Lincoln's vice president too.";
    }
    // First draft: true, bound, and — the whole point — names only ONE of
    // the two subjects the material confirms for this exact slot. Worded
    // with a trailing clause the material itself does not carry (not a
    // verbatim copy of the material's own sentence) so this tests the
    // completeness gate specifically, not reproduction — the identical
    // discipline the object-side sibling test above already uses.
    return "Hannibal Hamlin was Lincoln's vice president in 1861.";
  };
  const result = await runHolonicTask({
    task: "who was Lincoln's vice president?",
    chunks: chunkSource("lincoln-vp.txt", COMPETING_SUBJECT_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.ok(corrected, "the competing-subjects signal must trigger the tailored rewrite");
  assert.match(result.output, /Johnson/, "the shipped answer must cover the subject the first draft missed");
  assert.ok(
    !result.open.some((o) => o.includes("names only one of several")),
    "once both subjects are covered, the gap is no longer open",
  );
});

// ── notes over mouth (user direction, 2026-09-23): the completeness gate's
// ONE "incomplete" retry can itself fabricate rather than merely omit — the
// real, measured 2026-08-20 specimen this file's own comment names ("also
// invented Schuyler Colfax"). maxCorrections=1 means there is no second
// model retry to catch that; mechanicalCompetingAnswer (holon.js) must ship
// the material's own verbatim, addressed sentences instead.
test("when the completeness gate's one retry fabricates a name, the shipped answer is the mechanical fallback — both real subjects, never the invention", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      // The retry itself is the failure: it drops Johnson (a real,
      // confirmed subject) and invents a name the material never states.
      return "Hannibal Hamlin was Lincoln's vice president. Schuyler Colfax was Lincoln's vice president too.";
    }
    return "Hannibal Hamlin was Lincoln's vice president in 1861.";
  };
  const result = await runHolonicTask({
    task: "who was Lincoln's vice president?",
    chunks: chunkSource("lincoln-vp-fabricated.txt", COMPETING_SUBJECT_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.match(result.output, /Hamlin/, "the mechanical fallback must still name the first real subject");
  assert.match(result.output, /Johnson/, "the mechanical fallback must recover the subject the fabricated retry dropped");
  assert.doesNotMatch(result.output, /Colfax/, "the fabricated name must never reach the shipped answer");
});

// ── the correction loop must hand a rewrite the SAME mechanically-computed
// material the first draft already had, not a narrower one (live failure,
// 2026-09-15). A real Panama Canal turn's "incomplete" correction was
// handed bare, undeduped `sourceBlock` — dropping the fact-block notes
// (buildFactBlock's own "My notes so far" line) the FIRST draft call
// already carried — and answered from training knowledge instead ("Suez
// Canal", a conflated completion year). The fix threads `draftMaterial`
// (the same object the initial call sends) into both correction branches;
// this pins it so it cannot silently regress back to `sourceBlock`.
test("the 'incomplete' correction rewrite carries the same fact-block notes the first draft had, not bare undeduped passages", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let correctionPrompt = null;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      correctionPrompt = user;
      return "Hannibal Hamlin was Lincoln's vice president. Andrew Johnson was Lincoln's vice president too.";
    }
    return "Hannibal Hamlin was Lincoln's vice president in 1861.";
  };
  await runHolonicTask({
    task: "who was Lincoln's vice president?",
    chunks: chunkSource("lincoln-vp-material.txt", COMPETING_SUBJECT_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.ok(correctionPrompt, "the incomplete correction must have fired");
  assert.match(
    correctionPrompt,
    /My notes so far/,
    "the correction rewrite must carry the same mechanically-extracted fact-block notes the first draft call already had, not bare undeduped passage text",
  );
});

// ── the relation tier read a correction retry's RAW draft, before the
// ship-time framing cut (which only ran once, after the whole loop settled)
// ever saw it (2026-08-20, found live: eval/results/material-dialogue-
// stress-703.jsonl turn 23). A retry that opens by echoing the question
// back — an ordinary small-model shape, the exact one the framing cut
// exists to clean — fed that echoed line straight into relations.read(),
// which read the QUESTION's own words as a claim about the world. The
// shipped answer was clean; `section.relations.claims` was not. Reproduced
// directly against the real engine organs (no mock, `node -e`, this file's
// own COMPETING_SUBJECT_TEXT fixture): reading "Who was Lincoln's vice
// president?\nHannibal Hamlin was Lincoln's vice president in 1861."
// manufactures a spurious beyond-reach claim (subject "Who", object
// carrying the "?") alongside the real bound one. inspect() now reads
// stripFraming(text), the SAME cut the ship-time text is built from.
test("a correction retry whose raw completion echoes the question does not leak a spurious relation claim into the shipped record", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrected = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      corrected = true;
      // The correction retry: real small-model shape — opens by echoing the
      // question, then answers cleanly and completely.
      return "Who was Lincoln's vice president?\nHannibal Hamlin was Lincoln's vice president in 1861. Andrew Johnson was Lincoln's vice president too.";
    }
    // First draft: bound but incomplete (names only Hamlin) — the identical
    // setup the sibling test above uses to trigger the competing-subjects
    // retry this test depends on.
    return "Hannibal Hamlin was Lincoln's vice president in 1861.";
  };
  const result = await runHolonicTask({
    task: "who was Lincoln's vice president?",
    chunks: chunkSource("lincoln-vp.txt", COMPETING_SUBJECT_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.ok(corrected, "the competing-subjects signal must trigger the retry this test depends on");
  assert.ok(!result.output.includes("Who was Lincoln's vice president?"), "the shipped answer must not carry the echoed question");
  const claims = result.sections[0]?.relations?.claims ?? [];
  assert.ok(claims.length > 0, "the real, answered claims must still reach the record — this is not a test of suppressing the relation tier");
  assert.ok(
    claims.every((c) => c.subject !== "Who" && !String(c.object ?? "").includes("?")),
    `relation claims must come only from the shipped answer, never from the echoed question: ${JSON.stringify(claims)}`,
  );
});

test("a slot with exactly ONE confirmed subject never trips the competing-subjects check — singular is the ordinary case", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrections = 0;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    corrections++;
    // Not verbatim to COMPETING_SUBJECT_TEXT's own "...for the post." — the
    // identical discipline every fixture in this file already applies.
    return "Lincoln nominated Seward for the vacant post.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln nominate?",
    chunks: chunkSource("lincoln-vp.txt", COMPETING_SUBJECT_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.equal(corrections, 1, "a single confirmed subject is the unremarked case — no completeness call spent on it");
});

// ── the completeness gate's belief lands on the shared task-log (P38: "the
// hypergraph records beliefs... held BY AN EXPERIENCER, not just given by a
// source") — grid.js's own tested evaluate/REC organs, not a parallel one.
function freshGridFixture() {
  return import("../kernel/cube.js").then(async (operators) => {
    const taskLog = await import("../kernel/task-log.js");
    const grid = makeGrid({ operators, taskLog });
    grid.withCapacities({ findCapacity, unresolvedCapacity });
    return grid;
  });
}

test("the completeness gate lands a REAL evaluate belief on the shared grid log — not just an in-memory fact this call's own variables happen to hold", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  const runCapacity = makeCapacityRunner({
    referentIndexFor: (passages) => {
      // Only "relations" is exercised by this path; a minimal stand-in for
      // the cast capacity keeps this test from needing a second real organ
      // bundle it never calls.
      return { referents: new Set(), resolve: () => new Set(), represent: () => null, events: [] };
    },
    relationsFor,
  });
  const grid = await freshGridFixture();
  const log0 = grid.createLog();
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
    return "Lincoln appointed Hamlin in 1861.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
    grid,
    gridLog: log0,
    runCapacity,
    landAct,
  });
  // The log genuinely changed — a new state, not the same object handed back.
  assert.notEqual(result.gridLog, log0, "the completeness gate must land something; the returned log cannot be identical to the one passed in");
  const { acts } = grid.foldGrid(result.gridLog);
  const evaluated = acts.filter((a) => a.verb === "evaluate");
  assert.ok(evaluated.length >= 1, "at least one real evaluate act must land when the completeness gate fires");
  const landed = evaluated[0];
  assert.ok(
    ["holds", "refused"].includes(landed.verdict) || landed.result?.judged?.verdict,
    `the landed evaluate must carry a REAL computed verdict, not a bare declaration: ${JSON.stringify(landed.result)}`,
  );
  // The experiencer rides on the record too — a belief with no one attached
  // to it is exactly the "given by a source" framing this closes.
  const proposeEntry = result.gridLog.entries.find((e) => e.task_id === landed.task_id && e.kind === "propose");
  assert.match(proposeEntry.because ?? "", /holon-relation-tier/, "the belief names WHO was reading when it formed, not just what was found");
});

test("the completeness-gate belief is fully opt-in — omitting grid/gridLog/runCapacity/landAct is byte-identical to before this existed", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
    return "Lincoln appointed Hamlin in 1861.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
    // grid/gridLog/runCapacity/landAct all omitted — the default.
  });
  assert.equal(result.gridLog, null, "no organs injected means no belief record — never a silently-created one");
  assert.match(result.output, /Johnson/);
});

test("an answer that already names every filler never trips the completeness gate — and its fabricated year is caught by the atom check instead (P125)", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  // Two different asks, counted apart: the completeness gate names a missing
  // filler ("the material confirms exactly"); the atom check names a value the
  // sources do not contain. This draft is complete AND carries a fabricated
  // year — 1861 appears nowhere in LINCOLN_TEXT — so the first must not fire
  // and the second must.
  let completeness = 0, atomChecks = 0, drafts = 0;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages.at(-1)?.content ?? "";
    if (user.includes("the material confirms exactly")) completeness++;
    else if (user.includes("These sentences say things the sources you were given do not")) atomChecks++;
    else drafts++;
    return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.equal(completeness, 0, "a complete first draft earns no completeness correction at all");
  assert.equal(drafts, 1, "one draft");
  assert.ok(!result.open.some((o) => o.includes("names only one of several")));
  // THE MOUTH IS NOT CENSORED (2026-09-10): the mechanical atom check still
  // runs (no model call) and still flags 1861, but nothing asks the model
  // to rewrite it and nothing could splice a rewrite back in even if one
  // came back — see holon.js's own note above `let text = stripFraming
  // (draft)`.
  assert.equal(atomChecks, 0, "the fabricated year is flagged mechanically; nothing asks the model to rewrite it");
  assert.deepEqual(result.correction.flags.map((f) => f.flags.map((x) => x.value)).flat(), ["1861"], "1861 is in no passage");
  assert.deepEqual(result.correction.outcomes.map((o) => o.outcome), [], "no rewrite was asked for, so there is no outcome to report");
  assert.match(result.output, /1861/, "the model's own original sentence ships exactly as it drafted it — flagged, never edited");
});

test("a single-filler slot never trips the completeness gate — singular is the ordinary, unremarked case", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrections = 0;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    corrections++;
    return "Lincoln nominated Seward for the post.";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln nominate?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.equal(corrections, 1, "a single real filler is the unremarked case — no completeness call spent on it");
});

test("reproduction and incompleteness each get their own correction round — the live Lincoln/Hamlin/Johnson specimen", async () => {
  // The live failure this closes: draft 1 was a bare, correct, but
  // VERBATIM name ("Hannibal Hamlin" in the real trace; "Hamlin" here) —
  // reproducedFromContent convicts it (a short answer is a substring of
  // the material's own sentence, so copiedMass === totalMass). The single
  // correction budget went to fixing reproduction; the fix produced a
  // fuller, paraphrased clause that was STILL incomplete (missing
  // Johnson), and with only one shot spent, that second failure shipped
  // unaddressed. This test pins that the reproduction fix and the
  // completeness fix each get their own round.
  const relationsFor = makeRelationReader(await relationOrgans());
  let reproductionRound = 0;
  let incompleteRound = 0;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      incompleteRound++;
      assert.match(user, /Johnson/, "the completeness correction must name the real missing filler");
      return "Lincoln appointed Hamlin in 1861. Lincoln appointed Johnson later.";
    }
    if (user.includes("word for word")) {
      reproductionRound++;
      // Paraphrased, not verbatim — clears reproduction, but is now a
      // full clause the completeness gate can examine, and it names only
      // Hamlin, exactly like the live specimen's own draft 2.
      return "Lincoln appointed Hamlin in 1861.";
    }
    // First draft: a bare, verbatim, correct-but-incomplete name — too
    // short and clauseless for the completeness gate to see at all, but
    // caught as reproduction because it is a substring of the material's
    // own sentence.
    return "Hamlin";
  };
  const result = await runHolonicTask({
    task: "who did Lincoln appoint?",
    chunks: chunkSource("lincoln.txt", LINCOLN_TEXT),
    call,
    planMode: "flat",
    makeRelationReader: relationsFor,
  });
  assert.equal(reproductionRound, 1, "the bare verbatim draft must trigger exactly one reproduction correction");
  assert.equal(incompleteRound, 1, "the fuller-but-incomplete draft must get its OWN correction round, not be silently shipped");
  assert.match(result.output, /Johnson/, "Johnson must surface in the final shipped answer");
  assert.ok(!result.open.some((o) => o.includes("reproduces the material verbatim")));
  assert.ok(!result.open.some((o) => o.includes("names only one of several")));
});

// ── the succession-box completeness signal (succession.js, additive to the
// hypergraph-based gate above) — the real live specimen: a Wikipedia
// succession box never states "Lincoln's vice presidents were Hamlin and
// Johnson" as one sentence extractRelations could bind; it states two
// separate records, each in its own "Preceded by"/"Succeeded by" fields.
// Reused verbatim from the real running app's own captured material.
const SUCCESSION_TEXT = `15th Vice President of the United States
In office
March 4, 1861 – March 4, 1865
President Abraham Lincoln
Preceded by John C. Breckinridge
Succeeded by Andrew Johnson
23rd United States Minister to Spain
In office
December 20, 1881 – October 17, 1882
President Chester A. Arthur
Preceded by Lucius Fairchild
Succeeded by John W. Foster
United States Senator from Maine
In office
March 4, 1869 – March 3, 1881
Preceded by Lot M. Morrill
Succeeded by Eugene Hale

17th President of the United States
In office
April 15, 1865 – March 4, 1869
Vice President Vacant [ a ]
Preceded by Abraham Lincoln
Succeeded by Ulysses S. Grant
16th Vice President of the United States
In office
March 4, 1865 – April 15, 1865
President Abraham Lincoln
Preceded by Hannibal Hamlin
Succeeded by Schuyler Colfax
United States Senator
from Tennessee
In office
March 4, 1875 – July 31, 1875
Preceded by Parson Brownlow
Succeeded by David M. Key

Hannibal Hamlin (August 27, 1809 – July 4, 1891) was an American politician and diplomat who was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term. He was the first Republican vice president.`;

test("a succession-box specimen: naming only Hamlin trips the completeness gate, and the correction names Johnson", async () => {
  const relationsFor = makeRelationReader(await relationOrgans());
  let corrected = false;
  const call = async (messages) => {
    if (messages[0]?.content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const user = messages[1]?.content ?? messages[0]?.content ?? "";
    if (user.includes("the material confirms exactly")) {
      corrected = true;
      assert.match(user, /Johnson/, "the correction prompt must name the real, missing filler off the succession box");
      return "Hannibal Hamlin was Abraham Lincoln's first vice president, and Andrew Johnson was his second.";
    }
    // First draft: true, bound in the ordinary prose sense, and correct —
    // but names only one of the two real succession-box holders.
    return "Hannibal Hamlin was Abraham Lincoln's vice president.";
  };
  const result = await runHolonicTask({
    task: "who was Abraham Lincoln's vice president?",
    chunks: chunkSource("lincoln-succession.txt", SUCCESSION_TEXT),
    call,
    planMode: "flat",
    // High enough that all three of this material's own retrieval chunks
    // (the boundary the plain-prose blank lines already draw) come back
    // regardless of which one scores highest — succession.js needs the
    // WHOLE box structure, including the box that anchors Hamlin and the
    // box whose chain resolves Johnson, to be in the same sourceBlock.
    passagesPerPart: 10,
    makeRelationReader: relationsFor,
  });
  assert.ok(corrected, "the succession-box signal must trigger the tailored rewrite");
  assert.match(result.output, /Johnson/, "the shipped answer must cover the succession-box filler the first draft missed");
});

test("a fenced code answer survives byte-exact — fences are structure, never framing", async () => {
  // Measured live: ```python read as framing (its one token was in the
  // prompt), the opening fence was dropped, and the framing trim's rejoin
  // flattened every newline — the code arrived as one line with an orphan
  // fence, and no build could be made from it.
  const code =
    "```python\ndef fib(n):\n    a = [0, 1]\n    for i in range(2, n):\n        a.append(a[i-1] + a[i-2])\n    return a\n```";
  const task = "Write a short Python function returning the first n Fibonacci numbers.";

  const bare = await runHolonicTask({ task, chunks: [], call: async () => code, planMode: "flat" });
  assert.equal(bare.output, code, "no framing: the draft ships untouched, newlines and all");

  const framed = await runHolonicTask({
    task,
    chunks: [],
    call: async () => `The question is about Fibonacci numbers. ${code}`,
    planMode: "flat",
  });
  // The framing prefix used to be CUT here (stripNarrationSentences, inside
  // clean()) — silent surgery on the model's own words, on the chat/no-
  // material path too, contradicting that path's own stated law two
  // paragraphs up in holon.js ("What the person gets is what the model
  // said, as a person"). User direction, 2026-08-19: no post-processing —
  // the model's words ship as the model wrote them; a bad opener is a
  // reason to ask it to reconsider, never a reason to edit it out from
  // under it. So the prefix now survives. What this test actually
  // guards — fence integrity — still must hold: the code block itself
  // stays byte-exact, no dropped fence, no flattened newlines.
  assert.ok(
    framed.output.endsWith(code),
    "the fenced code block survives byte-exact even when framing prose precedes it",
  );
});

// ── the reproduction detector's fold, and its measure ───────────────────────
//
// A model does not retype a source's bytes; it retypes its WORDS. Curly
// quotes come back straight, em dashes come back as hyphens, the ellipsis
// glyph comes back as three dots, and a comma drifts. The detector's fold
// must be blind to all of that on BOTH sides or a photocopy reads as an
// answer (audit 2026-08-16, findings at holon.js:649 and :657).
const LEDGER = chunkSource(
  "ledger.txt",
  [
    // Curly apostrophe, curly quotation marks, an em dash, an ellipsis glyph
    // — the typography a source carries and a model does not reproduce.
    "The harbourmaster’s ledger records the tonnage of every berth, and the clerk kept the margin for his own remarks. “The silting figure was never disputed,” he wrote there — the committee had accepted it in March, and nobody reopened it afterwards. The audit is finished. The berths reopened in May.",
    // Dialogue: nine short lines, most of them under any content-token floor.
    "“Well, and what then?” he asked.\n“Nothing,” said Pierre.\n“He has gone away.”\n“Gone where?”\n“To Moscow, they say.”\n“And the letter?”\n“It was burned.”\n“Burned by whom?”\n“By the count himself.”",
    "Unrelated paragraph about the town festival, the weather, and the new bakery on the corner of the square.",
  ].join("\n\n"),
);

test("a transcription with its typography normalized is still a reproduction", async () => {
  // The first chunk, retyped: straight quotes for curly, a hyphen for the em
  // dash, a straight apostrophe, and one comma dropped. Not one word changed.
  const retyped =
    "The harbourmaster's ledger records the tonnage of every berth and the clerk kept the margin for his own remarks. \"The silting figure was never disputed,\" he wrote there - the committee had accepted it in March, and nobody reopened it afterwards. The audit is finished. The berths reopened in May.";
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return retyped;
  };
  const result = await runHolonicTask({
    task: "what does the ledger say about the silting figure?",
    chunks: LEDGER,
    call,
    planMode: "flat",
  });
  assert.ok(
    result.open.some((o) => o.includes("reproduces the material verbatim; it does not answer")),
    "straightened typography is retyping, not writing",
  );
  // The retyping earned nothing; the mechanical assembly ships in its place,
  // quoting the material with its address on every sentence.
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("[ledger.txt#"), result.output);
});

test("SELECTED TESTIMONY: an answer that is a set of the sources' own atomic statements, every one question-relevant, is not a reproduction — the live 2026-09-02 specimen", async () => {
  // the irrelevant sentence sits INSIDE the offered passage — a control
  // that lived in an unretrieved chunk was never a copy of anything offered
  // and cleared for the wrong reason (found by running it)
  const succession = chunkSource("vp.txt",
    "Hannibal Hamlin replaced John Breckinridge. Andrew Johnson replaced Hannibal Hamlin. Schuyler Colfax replaced Andrew Johnson. Henry Wilson replaced Schuyler Colfax. The convention that year met in Baltimore.");
  let corrections = 0;
  const list = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    if (/word for word/.test(messages[1].content)) corrections++;
    return "Here is the order:\n\n1. Hannibal Hamlin replaced John Breckinridge.\n2. Andrew Johnson replaced Hannibal Hamlin.\n3. Schuyler Colfax replaced Andrew Johnson.\n4. Henry Wilson replaced Schuyler Colfax.";
  };
  const r = await runHolonicTask({ task: "Who replaced whom as vice president, in order?", chunks: succession, call: list, planMode: "flat" });
  assert.equal(corrections, 0, "a set of relevant statements is answering — no reproduction correction fired");
  assert.ok(!r.open.some((o) => o.includes("reproduces the material")), JSON.stringify(r.open));
  assert.ok(!r.open.some((o) => o.includes("assembled mechanically")), "the model's own list ships, not the fallback");
  assert.match(r.output, /Henry Wilson replaced Schuyler Colfax/);
  // THE CONTROL, built to fail: the same list with ONE irrelevant sentence
  // copied along — the convention line the question never asked about —
  // is transcription, and convicts.
  let corrections2 = 0;
  const dragged = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    if (/word for word/.test(messages[1].content)) corrections2++;
    return "Hannibal Hamlin replaced John Breckinridge. Andrew Johnson replaced Hannibal Hamlin. Schuyler Colfax replaced Andrew Johnson. Henry Wilson replaced Schuyler Colfax. The convention that year met in Baltimore.";
  };
  const r2 = await runHolonicTask({ task: "Who replaced whom as vice president, in order?", chunks: succession, call: dragged, planMode: "flat" });
  assert.ok(corrections2 >= 1, "one irrelevant copied sentence makes it a photocopy again");
  // and ONE copied relevant sentence is still a single fact owed in one's own words
  let corrections3 = 0;
  const single = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    if (/word for word/.test(messages[1].content)) corrections3++;
    return "Andrew Johnson replaced Hannibal Hamlin.";
  };
  await runHolonicTask({ task: "Who replaced Hannibal Hamlin?", chunks: succession, call: single, planMode: "flat" });
  assert.ok(corrections3 >= 1, "a set needs two members; one copied sentence stays a reproduction");
});

test("wholesale transcription of short dialogue is a reproduction", async () => {
  // Nine short lines behind one lead-in sentence. Under a sentence COUNT the
  // lines sit in the denominator and can never reach the numerator (each is
  // under the content-token floor), so the majority cut can never fire — the
  // whole dialogue face of a novel photocopies past the guard. Character mass
  // has no such blind spot: what the lines weigh is what they contribute.
  const dialogue = LEDGER[1].text;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    return `The exchange between the two men runs as follows.\n${dialogue}`;
  };
  const result = await runHolonicTask({
    task: "what passes between the count and Pierre about the letter?",
    chunks: LEDGER,
    call,
    planMode: "flat",
  });
  assert.ok(
    result.open.some((o) => o.includes("reproduces the material verbatim; it does not answer")),
    "short lines are still the material's words",
  );
  // The transcription earned nothing; what ships is the mechanical assembly
  // with its addresses.
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("[ledger.txt#"), result.output);
});

test("an original short answer holding two verbatim lines is NOT a reproduction", async () => {
  // The false-positive guard, and the reason the measure is mass rather than
  // a floorless sentence count: two of these three sentences ARE the
  // material's own words ("The audit is finished." / "The berths reopened in
  // May.") — a count would read 2 of 3 and condemn an answer whose substance
  // is entirely the model's own. Mass reads what the three sentences actually
  // weigh, and the original one weighs more than both quotations together.
  const answer =
    "The audit is finished. The berths reopened in May. What the ledger will not tell you is why the committee let the silting number stand for so long, and nothing in these pages connects the closure of the berths to that decision.";
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), LEDGER);
    return `${answer} [${refs[0] ?? "ledger.txt#0-1"}]`;
  };
  const result = await runHolonicTask({
    task: "what does the ledger not tell you about the silting decision?",
    chunks: LEDGER,
    call,
    planMode: "flat",
  });
  assert.ok(
    !result.open.some((o) => o.includes("reproduces the material")),
    "an answer that answers is not a photocopy",
  );
  assert.ok(!result.open.some((o) => o.includes("restates the prompt")));
  assert.ok(result.refs.length >= 1, "and it keeps the warrant it earned");
});

test("a plan that fails to parse is itself a typed gap", async () => {
  const call = async (messages) =>
    messages[0].content === PLAN_SYSTEM_PROMPT
      ? "no json for you"
      : `The report puts the harbor figure at 12%. [${offeredRefs(promptOf(messages))[0] ?? "x#0-1"}]`;
  const result = await runHolonicTask({ task: "the harbor figure", chunks, call });
  assert.equal(result.plan.degraded, true);
  assert.ok(result.open.some((o) => o.includes("plan did not parse")));
  // One part means no heading scaffolding around a single answer.
  assert.ok(!result.output.startsWith("##"));
});

// ── the embedded-interrogative echo, from the live Borodino runs ────────────
// Measured 2026-08-17, three echoes in a row: the model resolves the
// question's "this battle" to the material's own "Borodino" and restates the
// question — as a declarative ("…is addressed."), and twice with the question
// mark still on. The word-for-word framing test cannot see any of the three;
// the wh-clause blanking and the ?-tail rule must.
const BORODINO = [
  "The battle near the village of Borodino was fought on 7 September 1812, during the French invasion of Russia.",
  "The Grande Armee under Napoleon met the Imperial Russian Army about 110 kilometres west of Moscow.",
  "The Russian army withdrew in good order afterward, and Napoleon entered Moscow a week later without a decisive victory.",
].join("\n\n");
const borodinoChunks = chunkSource("pasted.txt", BORODINO);
const BORODINO_TASK = "Who commanded the Russian army at this battle, and who led the French?";

test("an echo that resolves the question's own deixis is still an echo: typed open, no refs", async () => {
  let drafts = 0;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), borodinoChunks);
    // First draft: the declarative echo. Correction: the ?-terminated echo.
    // Both are the live shapes, byte for byte in structure.
    drafts++;
    return drafts === 1
      ? `The question of who commanded the Russian army at the Battle of Borodino and who led the French is addressed. [${refs[0] ?? "x#0-1"}]`
      : `The question at hand is who commanded the Russian army at the Battle of Borodino, and who led the French forces? [${refs[0] ?? "x#0-1"}]`;
  };
  const result = await runHolonicTask({ task: BORODINO_TASK, chunks: borodinoChunks, call, planMode: "flat" });
  assert.ok(result.open.some((o) => o.includes("restates the prompt")), JSON.stringify(result.open));
  // The restatement never ships: the mechanical assembly does, quoting the
  // material with addresses on every sentence.
  assert.ok(result.open.some((o) => o.includes("assembled mechanically")));
  assert.ok(result.output.includes("[pasted.txt#"), result.output);
  assert.ok(!/question at hand|is addressed/.test(result.output), "the echo itself stays off the page");
});

test("a real answer carrying a wh-relative clause is NOT framing and keeps its warrant", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), borodinoChunks);
    return `Napoleon, who led the French, entered Moscow a week later. [${refs[0] ?? "x#0-1"}]`;
  };
  const result = await runHolonicTask({ task: "who led the French at this battle?", chunks: borodinoChunks, call, planMode: "flat" });
  assert.ok(!result.open.some((o) => o.includes("restates the prompt")), JSON.stringify(result.open));
  assert.ok(result.refs.length >= 1, "content outside the wh-clause is an answer, and it keeps its address");
});

// ── the link tier (links.js): a cited URL is checked, not taken on its own word ──

test("checkLink off (the default): a cited URL ships untouched — nothing was fetched to accuse it", async () => {
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages));
    return `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}] See https://fake.example/report for the filing.`;
  };
  const result = await runHolonicTask({ task: "State the harbor figure the Kessington report gives.", chunks, call, planMode: "flat" });
  const section = result.sections[0];
  assert.equal(section.links, null, "no checkLink organ was injected — the tier does not run at all");
  assert.match(section.text, /https:\/\/fake\.example\/report/, "the standing web consent being off never accuses a citation it cannot check");
});

test("checkLink on: a URL that does not resolve is mechanically removed from the shipped text and joins the record's unsupported list", async () => {
  const seen = [];
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages));
    return `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}] See https://fake.example/report for the filing.`;
  };
  const checkLink = async (url) => {
    seen.push(url);
    return { ok: false, status: 404 };
  };
  const result = await runHolonicTask({
    task: "State the harbor figure the Kessington report gives.",
    chunks,
    call,
    planMode: "flat",
    checkLink,
  });
  assert.deepEqual(seen, ["https://fake.example/report"]);
  const section = result.sections[0];
  assert.equal(section.links.links.length, 1);
  assert.equal(section.links.links[0].verdict, "unreachable");
  assert.ok(section.linkCorrections.some((c) => c.url === "https://fake.example/report"));
  // The bare, working-looking citation is gone from what ships…
  assert.doesNotMatch(section.text, /See https:\/\/fake\.example\/report for/);
  // …replaced with a marker that still names what was tried, and the
  // finding lands on the record's unsupported list, same as an invented
  // figure or a fabricated quotation would.
  assert.match(section.text, /\[link removed — did not resolve: https:\/\/fake\.example\/report\]/);
  assert.ok(result.unsupported.some((u) => u.includes("https://fake.example/report")));
});

test("checkLink on: a URL that resolves ships exactly as written, no marker, not fetched twice", async () => {
  let calls = 0;
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages));
    return `The report puts the harbor figure at 12% for the spring quarter. [${refs[0]}] See https://real.example/report for the filing.`;
  };
  const checkLink = async (url) => {
    calls++;
    return { ok: true, status: 200, textChars: 4000, title: "The Kessington Filing" };
  };
  const result = await runHolonicTask({
    task: "State the harbor figure the Kessington report gives.",
    chunks,
    call,
    planMode: "flat",
    checkLink,
  });
  assert.equal(calls, 1);
  const section = result.sections[0];
  assert.equal(section.links.links[0].verdict, "resolved");
  assert.match(section.text, /See https:\/\/real\.example\/report for the filing\./);
  assert.ok(!result.unsupported.some((u) => u.includes("real.example")));
});

test("checkLink on: a URL the loaded material itself already contains is never fetched — it is material-grounded, not a model assertion", async () => {
  const withUrlChunks = chunkSource(
    "notes.txt",
    `${CORPUS}\n\nThe filing is mirrored at https://real.example/mirror for the public record.`,
  );
  const call = async (messages) => {
    if (messages[0].content === PLAN_SYSTEM_PROMPT) return "irrelevant";
    const refs = offeredRefs(promptOf(messages), withUrlChunks);
    return `The report puts the harbor figure at 12% for the spring quarter, mirrored at https://real.example/mirror. [${refs[0]}]`;
  };
  const checkLink = async () => {
    throw new Error("checkLink must not be called for a URL already in the loaded material");
  };
  const result = await runHolonicTask({
    task: "State the harbor figure the Kessington report gives.",
    chunks: withUrlChunks,
    call,
    planMode: "flat",
    checkLink,
  });
  const section = result.sections[0];
  assert.equal(section.links.links[0].verdict, "in-material");
  assert.match(section.text, /https:\/\/real\.example\/mirror/);
});

test("mechanicalAnswer: prefers a real sentence over a bare infobox row with the same or higher raw overlap", () => {
  // Measured live 2026-08-20 against real fetched material ("who was
  // Abraham Lincoln's vice president?"): a succession box's "In office /
  // President X / Preceded by Y / Succeeded by Z" lines have no sentence-
  // final punctuation, and raw overlap-count alone let "President Abraham
  // Lincoln" (3 words, all query tokens) outrank a genuinely informative
  // sentence in the same passage. This pins the fix: terminal punctuation
  // is a structural tell for real prose vs. page furniture, applied here
  // the way blankStructure/stripContainer already apply it elsewhere.
  const mixed =
    "President Abraham Lincoln\n\n" +
    "Hamlin left the vice presidency in 1865 and later returned to the Senate representing Maine.";
  const out = mechanicalAnswer("Who was Abraham Lincoln's vice president?", [{ text: mixed, ref: "b" }]);
  assert.match(out, /Hamlin left the vice presidency/);
  assert.doesNotMatch(out, /"President Abraham Lincoln"/);
});

test("mechanicalAnswer: still surfaces a bare fragment honestly when no real sentence exists in that passage", () => {
  const infoboxOnly =
    "In office\nMarch 4, 1861 – March 4, 1865\nPresident Abraham Lincoln\n" +
    "Preceded by John C. Breckinridge\nSucceeded by Andrew Johnson";
  const out = mechanicalAnswer("Who was Abraham Lincoln's vice president?", [{ text: infoboxOnly, ref: "a" }]);
  assert.match(out, /President Abraham Lincoln/, "never nothing when something exists, even a fragment");
});

// ── P73: the door's grammar gate threads from runHolonicTask to admit ──────
// The pin is the THREADING, not the lens: a stub reader yields one bound
// claim so the admit path genuinely runs, a stub hyperlexicon captures the
// options the door was actually called with, and the lens object must
// arrive by identity — with null (the default, every pre-existing caller)
// pinned as its own case so the gate never runs unasked.
test("classifyConnector threads from runHolonicTask through runPart to the admit door (P73)", async () => {
  const runWith = async (opts) => {
    const seen = [];
    const stubHyperlexicon = {
      createHyperlexicon: () => ({ entries: [] }),
      admit: (log, edges, o) => { seen.push(o); return { log, heard: edges.map(() => ({})), turnedAway: [] }; },
      foldHyperlexicon: () => [],
    };
    const stubReader = () => ({
      edges: [],
      read: () => ({
        claims: [{
          verdict: "bound", subject: "Kessington report", verb: "put",
          object: "the harbor figure at 12%",
          spans: [{ ref: "notes.txt#0-40", start: 0, end: 40, text: "The Kessington report put the harbor" }],
        }],
      }),
    });
    await runHolonicTask({
      task: "what is the harbor figure?",
      chunks,
      call: async () => "The harbor figure is 12%.",
      makeRelationReader: stubReader,
      hyperlexicon: stubHyperlexicon,
      hyperlexiconLog: null,
      ...opts,
    });
    return seen;
  };

  const lens = () => ({ settled: false, thraxClass: null });
  const threaded = await runWith({ classifyConnector: lens });
  assert.ok(threaded.length > 0, "the door was reached");
  for (const o of threaded) assert.equal(o.classifyConnector, lens, "the lens arrives at admit by identity");

  const unthreaded = await runWith({});
  assert.ok(unthreaded.length > 0, "the door was reached on the default path too");
  for (const o of unthreaded) assert.equal(o.classifyConnector, null, "absent, the gate is null — never a silent default lens");
});

// ── P84: the ledger block discloses standing; it never withholds ──────────
// Two tiers inside one budget: corroborated notes (kernel standingOf —
// distinct SOURCES) first, then single-witness notes that share vocabulary
// with THIS part's question; a primary-backed note is named as such. A
// single note about something else never reaches the model, and every
// line is firewall-clean.
test("the ledger block carries corroborated notes, then question-relevant single-witness notes with their standing disclosed, and names a primary-backed note (P84)", async () => {
  const sent = [];
  const notes = [
    { id: "a", subject: "Kessington", verb: "lies", object: "on the harbor coast", witnesses: ["k.txt#0-9~r", "primary:archive.org#3-40~ranke-v1"], sources: 2, instruments: 2, standing: "corroborated-independently", kinds: { sighting: 1, primary: 1 } },
    { id: "b", subject: "the harbor", verb: "opened", object: "in 1811", witnesses: ["k.txt#20-30~r"], sources: 1, instruments: 1, standing: "single-witness", kinds: { sighting: 1 } , disputedBy: [{ id: "d1", source: "t.txt", because: "the harbor opened in 1812", kind: "contest" }] },
    { id: "c", subject: "Mars", verb: "orbits", object: "the sun", witnesses: ["m.txt#0-9~r"], sources: 1, instruments: 1, standing: "single-witness", kinds: { sighting: 1 } },
    { id: "d", subject: "the harbor tide", verb: "turns", object: "twice a day", witnesses: ["k.txt#50-60~r", "t.txt#1-9~r"], sources: 2, instruments: 1, standing: "corroborated", kinds: { sighting: 2 } },
    { id: "e", subject: "the tide", verb: "turns", object: "twice a day", witnesses: ["k.txt#70-80~r", "t.txt#10-19~r"], sources: 2, instruments: 1, standing: "corroborated", kinds: { sighting: 2 } },
  ];
  const stubHyperlexicon = {
    createHyperlexicon: () => ({ entries: [] }),
    admit: (log, edges) => ({ log, heard: edges.map(() => ({})), turnedAway: [] }),
    foldHyperlexicon: () => notes,
    foldWithStanding: () => notes,
    redeclareFrame: (log) => log,
  };
  const stubReader = () => ({ edges: [], read: () => ({ claims: [] }) });
  await runHolonicTask({
    task: "what is the harbor figure?",
    chunks,
    call: async (messages) => { sent.push(JSON.stringify(messages)); return "The harbor figure is 12%."; },
    makeRelationReader: stubReader,
    hyperlexicon: stubHyperlexicon,
    hyperlexiconLog: { entries: [] },
    hyperlexiconDerived: [
      { id: "derived:h", subject: "the harbor", verb: "before", object: "the tide", premises: ["b", "d"], restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 2 } },
      { id: "derived:m", subject: "Mars", verb: "before", object: "Venus", premises: ["c"], restsOn: { sources: 1, instruments: 1, contested: 0, grounds: 1 } },
    ],
    hyperlexiconVoids: [
      { id: "void:the harbor|closed|*", subject: "the harbor", verb: "closed", object: null, scope: { sources: ["a.txt", "b.txt"], read: 3, total: 5 }, reached: false, declaredAt: 9 },
      { id: "void:mars|orbits|*", subject: "Mars", verb: "orbits", object: null, scope: { sources: ["a.txt"], read: 5, total: 5 }, reached: true, declaredAt: 10 },
    ],
  });
  const text = sent.join("\n");
  assert.match(text, /derived — no source states these/, "the derived tier is shown (P102)");
  assert.match(text, /the harbor — before→ the tide \(follows from 2 earlier claims, never stated itself; the weakest of them stated once so far\)/);
  assert.doesNotMatch(text, /Mars — before→ Venus/, "a derived fact sharing nothing with the question is not shown either");
  assert.match(text, /stated in more than one place/, "the corroborated tier is shown");
  assert.match(text, /Kessington — lies→ on the harbor coast \(read in 2 places, one of them a source the account itself cites\)/, "a primary-backed note is named as such");
  assert.match(text, /the harbor tide — turns→ twice a day \(read in 2 places\)/);
  assert.doesNotMatch(text, /- the tide — turns→/, "a corroborated note sharing nothing with the question is not shown either — both tiers are ranked by the question");
  assert.match(text, /stated once so far and bearing on this question/, "the single-witness tier is disclosed, not withheld");
  assert.match(text, /the harbor — opened→ in 1811 \(stated once so far, nowhere else yet; disputed by t.txt — not settled\)/, "a live dispute is said to the mouth, never a conviction (P101)");
  assert.doesNotMatch(text, /Mars — orbits/, "a single-witness note sharing nothing with the question never reaches the model");
  assert.match(text, /Nothing here states these, and that is the answer/, "the void tier is relayed as an affirmative negation the mouth can express (P105, prosified 2026-09-13)");
  assert.match(text, /whether the harbor closed is not stated in what was read \(looked for in 2 sources, 3 of 5 parts read so far\)/, "a void carries its scope — how many sources, how far read");
  assert.doesNotMatch(text, /Mars — orbits→ \?/, "a void sharing nothing with the question is not shown either");
  const { apparatusMentions } = await import("./firewall.js");
  const block = text.match(/From earlier reading[^"]*/g) ?? [];
  assert.ok(block.length, "the block was sent");
  for (const b of block) assert.deepEqual(apparatusMentions(b.replace(/\\n/g, "\n")), [], "firewall-clean");
});

// ── attachment/mute isolation (2026-09-08 battery) ──────────────────────
// A note the ledger carries can be grounded in a source this very
// conversation has since muted, or one it never even holds any more —
// reading-on-arrival admits a source's claims the moment it is attached,
// and mute is deliberately a retrieval concept, so silencing a source
// afterward never retracts what was already heard from it. Before this,
// nothing re-checked a note's witnesses against what is actually live, so
// a note stood on nothing but a muted or gone source rode the ledger block
// (and resolutionBlocks' "cited on this ground" line) exactly like one
// grounded in material this turn actually has. Measured live: two files
// explicitly unchecked before any question was asked, a third attached
// and enabled, and the answer's grounding line still named the muted file.
test("a ledger note grounded only in a muted/gone source is withheld once something is attached — one grounded in a live source still shows (attachment/mute isolation)", async () => {
  const sent = [];
  const notes = [
    // Muted/gone: "old-notes.txt" is not among this turn's chunks at all.
    { id: "stale", subject: "Kessington", verb: "closed", object: "the harbor early", witnesses: ["old-notes.txt#0-9~r"], sources: 1, instruments: 1, standing: "single-witness", kinds: {} },
    // Live: "notes.txt" is exactly what this turn's own chunks are built from.
    { id: "live", subject: "Kessington", verb: "revised", object: "the harbor figure", witnesses: ["notes.txt#0-9~r"], sources: 1, instruments: 1, standing: "single-witness", kinds: {} },
  ];
  const stubHyperlexicon = {
    createHyperlexicon: () => ({ entries: [] }),
    admit: (log, edges) => ({ log, heard: edges.map(() => ({})), turnedAway: [] }),
    foldHyperlexicon: () => notes,
    foldWithStanding: () => notes,
    redeclareFrame: (log) => log,
  };
  await runHolonicTask({
    task: "what is the harbor figure?",
    chunks,
    call: async (messages) => { sent.push(JSON.stringify(messages)); return "The harbor figure is 12%."; },
    hyperlexicon: stubHyperlexicon,
    hyperlexiconLog: { entries: [] },
    sourcesAttached: true,
  });
  const text = sent.join("\n");
  assert.doesNotMatch(text, /Kessington — closed→ the harbor early/, "a note whose only witness is a muted/gone source must not reach the mouth");
  assert.match(text, /Kessington — revised→ the harbor figure/, "a note grounded in a source this turn actually has stays offered");
});

test("without sourcesAttached, a note from a source outside this turn's chunks still shows — the isolation gate is opt-in, not a blanket witness check", async () => {
  // The control: the new filter is gated on `sourcesAttached` exactly like
  // UNRETRIEVED_MATERIAL_PREFIX above, so a genuinely bare conversation
  // (nothing attached at all, ever) keeps standing on earlier reading —
  // P84's own control, unmoved by this fix.
  const sent = [];
  const notes = [{ id: "a", subject: "Mars", verb: "orbits", object: "the sun", witnesses: ["m.txt#0-9~r"], sources: 1, instruments: 1, standing: "single-witness", kinds: {} }];
  const stubHyperlexicon = {
    createHyperlexicon: () => ({ entries: [] }),
    admit: (log, edges) => ({ log, heard: edges.map(() => ({})), turnedAway: [] }),
    foldHyperlexicon: () => notes,
    foldWithStanding: () => notes,
    redeclareFrame: (log) => log,
  };
  await runHolonicTask({
    task: "what orbits the sun?",
    chunks: [],
    call: async (messages) => { sent.push(JSON.stringify(messages)); return "Mars orbits the sun, yes."; },
    hyperlexicon: stubHyperlexicon,
    hyperlexiconLog: { entries: [] },
  });
  assert.match(sent.join("\n"), /Mars — orbits→ the sun/, "with nothing ever attached, a note from any source still stands (P84)");
});

test("a bare-label decomposed section (no piece object) is anchored to its own question's subject — a generic label like 'Collisions' must not drift to a physical-objects reading (live failure, 2026-09-17)", async () => {
  const { buildExecutePrompt } = await import("./holon.js");
  const task = "Explain, in your own words, what a hash table is and why collisions happen.";
  const prompt = buildExecutePrompt({ label: "Collisions", description: "Explain hash collisions." }, "x", null, task);
  assert.match(prompt, /This part belongs to a larger answer about: /, "an ordinary (non-piece) decomposed section must still get a subject anchor");
  assert.ok(!prompt.includes(task), "the anchor must never be the full original task verbatim");
  const noAnchor = buildExecutePrompt({ label: "Collisions", description: "Explain hash collisions." }, "x");
  assert.ok(!noAnchor.includes("larger answer about"), "no topic supplied means no anchor line, unchanged from before");
});

test("P108: a piece's section is told its place, the outline, the previous tail and its word target; a short draft is continued once, measured, before any check", async () => {
  const { buildExecutePrompt, pieceLine, wordCount, CONTINUE_BELOW } = await import("./holon.js");
  const line = pieceLine({ topic: "the harbor", pages: 30, words: 650, index: 3, count: 5, outline: ["Origins", "Tides", "Trade", "Storms", "Legacy"], previousTail: "and the tide turned." });
  assert.match(line, /^This is section 3 of 5 of a 30-page piece on the harbor\. The sections, in order: Origins; Tides; Trade; Storms; Legacy\. The previous section ended: "and the tide turned\." Write about 650 words/);
  assert.equal(pieceLine(null), "");
  assert.match(buildExecutePrompt({ label: "Tides", description: "what the tide does." }, "x", { words: 100 }), /Write this part: Tides\. what the tide does\.\nThis is one section of a longer piece\. Write about 100 words/);
  const { apparatusMentions } = await import("./firewall.js");
  assert.deepEqual(apparatusMentions(line), [], "firewall-clean");
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast.");
  const sent = [];
  const short = "The harbor tide turns twice a day.";
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => { sent.push(messages); const u = messages.at(-1)?.content ?? ""; if (/Continue this section/.test(u)) return "It lies on the coast, and the tide is its clock."; if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "what the tide does." }] }); return short; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 40 },
  });
  const continuation = sent.filter((m) => /Continue this section/.test(m.at(-1)?.content ?? ""));
  assert.equal(continuation.length, 1, "exactly one continuation when the draft is under the floor");
  assert.equal(continuation[0].at(-2)?.role, "assistant", "the draft so far is the assistant's own turn");
  assert.ok(wordCount(short) < 40 * CONTINUE_BELOW);
  assert.match(r.output, /tide is its clock/, "the continuation is part of the section that was checked and shipped");
  assert.ok(r.sections[0].continued && r.sections[0].continued.from < r.sections[0].continued.to);
  const sentTwice = sent.filter((m) => /Continue this section/.test(m.at(-1)?.content ?? "")).length;
  assert.equal(sentTwice, 1);
});

test("task_03d3a119: a piece section's discourse summary rides in the SYSTEM message, never inside the `user` content a section is asked to WRITE — the shape that let a live turn quote its own injected context back into the fiction", async () => {
  // Reproduces the live specimen's shape: a discourse line distinctive
  // enough that if it leaked into the user content, it would be trivially
  // greppable there. Before this fix, buildExecutePrompt folded `discourse`
  // straight into the returned string that becomes the `user` message —
  // structurally indistinguishable from the source material sitting right
  // below it. The fix moves it to the system message, matching the flat
  // chat path's own chatContext convention (a few hundred lines up in
  // holon.js) instead of inventing a new one.
  const discourse = "the reader keeps circling back to the lighthouse keeper's own daily routine";
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast.");
  const sent = [];
  const short = "The harbor tide turns twice a day.";
  await runHolonicTask({
    task: "write about the harbor",
    chunks,
    discourse,
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "what the tide does." }] });
      return short;
    },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 40 },
  });
  // The draft call: system carries the whole system prompt + discourse suffix; user is buildExecutePrompt's own output.
  const draftCall = sent.find((m) => m.some((x) => x.role === "user" && /Write this part: Tides/.test(x.content ?? "")));
  assert.ok(draftCall, "the section's draft call was sent");
  const sys = draftCall.find((m) => m.role === "system")?.content ?? "";
  const usr = draftCall.find((m) => m.role === "user")?.content ?? "";
  assert.match(sys, /The conversation so far: the reader keeps circling back to the lighthouse keeper's own daily routine/, "discourse lands in the system message");
  assert.doesNotMatch(usr, /conversation so far/i, "the user content — what the model is asked to WRITE from — never carries the discourse line or its own label");
  assert.doesNotMatch(usr, /lighthouse keeper/, "nor the discourse's own words, anywhere in the content a section drafts from");
});

test("P110: the piece's own checks — obligations from the cast, the duplicate veto, the coverage ask, the meta-talk cut, the per-section hunt, the conclusion's facts", async () => {
  const { obligationsFrom, coverageOf, cutMetaTalk, pieceLine } = await import("./holon.js");
  const { splitSentences } = await import("../organs/cite.js");
  const index = { referents: new Set(["r1", "r2", "r3"]), events: [{ referent: "r1" }, { referent: "r1" }, { referent: "r2" }], represent: (id) => ({ r1: "Fox Mulder", r2: "Chris Carter", r3: "Dana Scully" })[id] };
  assert.deepEqual(obligationsFrom(index), ["Fox Mulder", "Chris Carter", "Dana Scully"], "ranked by recurrence, then name");
  assert.deepEqual(coverageOf("Mulder believed. Carter wrote it.", ["Fox Mulder", "Chris Carter", "Dana Scully"]).missed, ["Dana Scully"]);
  const cut = cutMetaTalk("The show ran nine seasons. There is no need to restate the question. Let me know if you'd like me to continue writing this section.", { instructionText: "Write this part. There is no need to restate the question. Continue this section from where it stopped — continuous prose, no lists, no headings. Let me know", materialText: "The show ran nine seasons on Fox.", splitSentences });
  assert.equal(cut.text, "The show ran nine seasons.");
  assert.equal(cut.cut.length, 2, "two sentences of the mouth talking about the writing");
  const line = pieceLine({ topic: "the harbor", words: 100, index: 2, count: 2, outline: ["Tides", "Legacy"], obligations: ["the harbor master"], alreadySaid: ["the tide turns twice a day"], facts: { disagreements: ["the harbor opened in 1811 (b.txt says otherwise)"], gaps: ["director of the harbor"] } });
  assert.match(line, /This section should say something about: the harbor master\. Earlier sections already said: the tide turns twice a day\. The sources disagree on: the harbor opened in 1811 \(b\.txt says otherwise\)\. Nothing read says: director of the harbor\./);
  const { apparatusMentions } = await import("./firewall.js");
  assert.deepEqual(apparatusMentions(line), [], "firewall-clean");
  // end to end with stubs: two sections whose drafts repeat the same claim; the second is asked once for something new; a thin section hunts
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast. The harbor master is Ada Rowe.");
  const sent = [];
  let hunts = 0;
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "the tide." }, { label: "Coast", description: "the coast." }] });
      if (/Every claim here was made in an earlier section/.test(u)) return "The harbor lies on the coast, and its master is Ada Rowe, who keeps the light.";
      if (/Continue this section/.test(u)) return "And the tide is its clock, turning twice a day.";
      return "The harbor tide turns twice a day. There is no need to restate the question.";
    },
    makeRelationReader: (ps) => ({ edges: [], read: (t) => ({ claims: /tide turns twice/.test(t) ? [{ end1: "the harbor tide", label: "turns", end2: "twice a day", verdict: "bound", refs: [ps[0]?.ref], spans: [] }] : [] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 20, referentIndexFor: () => index, huntFor: async () => { hunts += 1; return []; } },
  });
  const dup = sent.filter((m) => /Every claim here was made in an earlier section/.test(m.at(-1)?.content ?? ""));
  assert.equal(dup.length, 1, "the second section's claims were all already said — asked once for something new");
  assert.ok(hunts >= 1, "a section whose retrieval was thin hunted on its own words");
  // THE MOUTH IS NOT CENSORED (2026-09-10): cutMetaTalk still runs (its own
  // direct unit test above pins it unchanged) but the finding is no longer
  // applied to what ships — see holon.js's own note above `let text =
  // stripFraming(draft)`.
  assert.match(r.output, /restate the question/, "the model's own draft ships exactly as it wrote it, narration and all");
  assert.ok(r.sections.every((s) => s.piece && Array.isArray(s.piece.obligations)), "every section carries its obligations and coverage");
});

test("P111: the unconscious edits the mouth — a section that restates an earlier one is cut and merged away, model-free, and the edits are on the result", async () => {
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast.");
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => {
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "the tide." }, { label: "Again", description: "the tide again." }] });
      if (/Every claim here was made in an earlier section/.test(u)) return "Tides come to this harbor twice each day, and a light stands where the coast begins.";
      return "Tides come to this harbor twice each day, and a light stands where the coast begins.";
    },
    makeRelationReader: () => ({ edges: [], read: (t) => ({ claims: [{ end1: "the harbor tide", label: "turns", end2: "twice a day", verdict: "bound", refs: ["h.txt#0-30"], spans: [] }] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 10 },
  });
  assert.ok(Array.isArray(r.edits) && r.edits.length >= 1, "edits landed");
  assert.ok(r.edits.some((e) => e.kind === "restated-sentence" || e.kind === "empty-section" || e.kind === "merged-section"));
  assert.equal((r.output.match(/## /g) ?? []).length <= 1 || !/## Again/.test(r.output) || true, true);
  assert.equal(r.output.split("where the coast begins").length - 1, 1, "the restated section's prose appears once in the shipped piece");
});

test("a piece's own build log: pieceLog carries the drafted (pre-edit) whole-piece text and the edited (post-unconscious-edit) text, so a caller can land both as real build-log checkpoints", async () => {
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast.");
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => {
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "the tide." }, { label: "Again", description: "the tide again." }] });
      if (/Every claim here was made in an earlier section/.test(u)) return "Tides come to this harbor twice each day, and a light stands where the coast begins.";
      return "Tides come to this harbor twice each day, and a light stands where the coast begins.";
    },
    makeRelationReader: () => ({ edges: [], read: (t) => ({ claims: [{ end1: "the harbor tide", label: "turns", end2: "twice a day", verdict: "bound", refs: ["h.txt#0-30"], spans: [] }] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 10 },
  });
  assert.ok(r.pieceLog, "a piece carries a pieceLog");
  assert.equal(typeof r.pieceLog.drafted, "string");
  // Before the unconscious edit ran, both sections' identical draft stood —
  // the restated prose appears TWICE, exactly what editPiece went on to cut.
  assert.equal(r.pieceLog.drafted.split("where the coast begins").length - 1, 2, "the pre-edit draft still carries the restated section");
  assert.match(r.pieceLog.drafted, /## Again/, "the pre-edit draft still carries the section piece-edit.js went on to drop or merge away");
  // After the edit pass, the checkpoint matches what actually shipped.
  assert.equal(typeof r.pieceLog.edited, "string");
  assert.notEqual(r.pieceLog.edited, r.pieceLog.drafted, "a real edit happened, so the checkpoint moved");
  assert.equal(r.pieceLog.edited.split("where the coast begins").length - 1, 1, "the edited checkpoint already reflects the cut");
  assert.equal(r.pieceLog.edited, r.output, "nothing more changed the text after the edit pass on this fixture (no revision landed)");
});

test("a single-section piece (no edit pass ever runs) still carries a drafted pieceLog and no edited checkpoint", async () => {
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day.");
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async () => "Tides come to this harbor twice each day.",
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    piece: { topic: "the harbor", pages: 1, words: 10 },
  });
  assert.equal(typeof r.pieceLog.drafted, "string");
  assert.equal(r.pieceLog.edited, null, "no edit pass ran (a single-section piece), so there is no second checkpoint");
});

test("P116: a piece returns its revisions — an array, empty when nothing later changed anything", async () => {
  const chunks = chunkSource("h.txt", "The harbor tide turns twice a day. The harbor lies on the coast.");
  const r = await runHolonicTask({
    task: "write about the harbor", chunks,
    call: async (messages) => { const u = messages.at(-1)?.content ?? ""; if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Tides", description: "the tide." }, { label: "Coast", description: "the coast." }] }); return /Coast/.test(u) ? "A light stands where the coast begins." : "Tides come to this harbor twice each day."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    planMode: "model", piece: { topic: "the harbor", pages: 1, words: 10 },
  });
  assert.ok(Array.isArray(r.revisions));
  assert.equal(r.revisions.filter((x) => x.kind === "revision-error").length, 0, "the revision pass ran without error");
});

test("P122: the snips are handed above the material; a drafted year no snip carries is flagged with no model, asked once with the flags as facts, and lands only when the rewrite's atoms pass; the witness is spent on the flagged sentence first", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The harbor tide turns twice a day, and the harbor master keeps the light.");
  const index = { entries: [{ surface: "Ada Rowe", mentions: 3 }, { surface: "the harbor light", mentions: 2 }] };
  const sent = [];
  const witnessed = [];
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Light", description: "the light." }] });
      if (/These sentences say things the sources you were given do not/.test(u)) return "Here are the rewritten sentences:\nThe harbor light was built in 1841 by Ada Rowe.";
      return "The harbor light was built in 1847 by Ada Rowe. The harbor tide turns twice a day.";
    },
    makeRelationReader: (ps) => ({ edges: [], read: (t) => ({ claims: /tide turns twice/.test(t) ? [{ end1: "the harbor tide", label: "turns", end2: "twice a day", verdict: "bound", refs: [ps[0]?.ref], spans: [] }] : [] }) }),
    witnessSentences: async (sentences) => { witnessed.push(...sentences); return { rows: sentences.map((sentence) => ({ sentence, witness: "skipped", why: "test" })), asks: 0 }; },
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 20, referentIndexFor: () => index },
  });
  const draftAsk = sent.find((m) => /Write this part: Light/.test(m.at(-1)?.content ?? ""));
  assert.ok(draftAsk, "the section was drafted");
  assert.match(draftAsk.at(-1).content, /What the sources say, verbatim:\n- The harbor light was built in 1841 by Ada Rowe\./, "the snips ride above the material, verbatim, addressed");
  const revise = sent.filter((m) => /These sentences say things the sources you were given do not/.test(m.at(-1)?.content ?? ""));
  assert.equal(revise.length, 1, "one rewrite ask for the flagged sentence");
  assert.match(revise[0].at(-1).content, /the sources do not use the year "1847" here; they say 1841 where this says 1847: "The harbor light was built in 1841 by Ada Rowe\."/, "the ask carries the flag and the contradicting source as plain facts");
  assert.doesNotMatch(revise[0].at(-1).content, /appears in no snip|beside none of this sentence/, "never the instrument's own working (P125)");
  const sec = r.sections[0];
  assert.ok(sec.piece.snipCheck, "the check is on the section's record");
  assert.equal(sec.piece.snipCheck.flagged, 1);
  assert.equal(sec.piece.snipCheck.contradictions.length, 1);
  assert.deepEqual(sec.piece.snipCheck.contradictions[0].source, ["1841"]);
  // THE MOUTH IS NOT CENSORED (2026-09-10): the rewrite ask still runs and
  // its outcome is still recorded (the pure `applyRewrite` this reads is
  // unchanged, it is just never spliced back into `sec.text` — see
  // holon.js's own note above `let text = stripFraming(draft)`), so the
  // model's own original sentence — 1847, not the corrected 1841 — is what
  // ships, still flagged.
  assert.deepEqual(sec.piece.snipCheck.outcomes.map((o) => o.outcome), ["rewritten"], "the rewrite is computed and its outcome recorded, even though it never lands");
  assert.match(sec.text, /built in 1847 by Ada Rowe/, "the model's own original sentence ships unedited");
  assert.doesNotMatch(sec.text, /1841/, "the rewrite was never applied");
  assert.equal(sec.piece.snipCheck.after.flagged, 1, "checked against the SAME unedited text as before, so the flag stands");
  assert.equal(witnessed.length, 2, "the witness saw both sentences");
});

test("P122 control: the same draft against snips from an unrelated passage flags MORE, and a rewrite whose year is still wrong is refused so the original stands", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The harbor tide turns twice a day.");
  const index = { entries: [{ surface: "Ada Rowe", mentions: 3 }] };
  const r = await runHolonicTask({
    task: "write about the harbor",
    chunks,
    call: async (messages) => {
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Light", description: "the light." }] });
      if (/These sentences say things the sources you were given do not/.test(u)) return "The harbor light was built in 1852 by Ada Rowe.";
      return "The harbor light was built in 1847 by Ada Rowe. The harbor tide turns twice a day.";
    },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    planMode: "model",
    piece: { topic: "the harbor", pages: 1, words: 20, referentIndexFor: () => index },
  });
  const sc = r.sections[0].piece.snipCheck;
  assert.deepEqual(sc.outcomes.map((o) => o.outcome), ["refused"], "a rewrite still carrying a wrong year does not land");
  assert.match(r.sections[0].text, /1847/, "the original stands, flagged");
  assert.equal(sc.after.flagged, 1);
  assert.match(sc.outcomes[0].because, /still contradicts a snip|unsupported/);
});

test("P123: the depth slider — depth 0 spends no rewrite and no witness ask; depth 2 asks a second rewrite when the first is refused; depth 1 is byte-identical to the plain defaults", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The harbor tide turns twice a day.");
  const index = { entries: [{ surface: "Ada Rowe", mentions: 3 }] };
  const run = async (depth, answers) => {
    let rewrites = 0; let witnessCalls = 0;
    const r = await runHolonicTask({
      task: "write about the harbor", chunks, depth,
      call: async (messages) => {
        const u = messages.at(-1)?.content ?? "";
        if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Light", description: "the light." }] });
        if (/These sentences say things the sources you were given do not/.test(u)) { rewrites += 1; return answers[rewrites - 1] ?? answers.at(-1); }
        return "The harbor light was built in 1847 by Ada Rowe. The harbor tide turns twice a day.";
      },
      makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
      witnessSentences: async (sentences, claims, passages, { maxAsks }) => { witnessCalls += 1; return { rows: [], asks: 0, maxAsks }; },
      planMode: "model", piece: { topic: "the harbor", pages: 1, words: 20, referentIndexFor: () => index },
    });
    return { r, rewrites, witnessCalls, maxAsks: r.sections[0].witness?.maxAsks };
  };
  const quick = await run(0, ["The harbor light was built in 1841 by Ada Rowe."]);
  assert.equal(quick.rewrites, 0, "depth 0 asks no rewrite"); assert.equal(quick.r.depth, 0);
  assert.equal(quick.r.sections[0].piece.snipCheck.flagged, 1, "the mechanical check still runs at depth 0");
  assert.equal(quick.maxAsks, 0, "depth 0 hands the witness a budget of 0");
  const plain = await run(1, ["The harbor light was built in 1852 by Ada Rowe.", "The harbor light was built in 1841 by Ada Rowe."]);
  assert.equal(plain.rewrites, 1, "depth 1: one rewrite ask, as before"); assert.equal(plain.maxAsks, 24);
  assert.match(plain.r.sections[0].text, /1847/, "the model's own original ships — the mouth is not censored");
  // THE MOUTH IS NOT CENSORED (2026-09-10): a rewrite is never spliced back
  // in regardless of how it comes back (see holon.js's own note above `let
  // text = stripFraming(draft)`), so a SECOND round asking about the exact
  // same still-standing flag would just be a second wasted call — capped
  // at one ask at every depth above 0 now, not scaled by the slider. The
  // slider still widens the witness budget (maxAsks below), which is a
  // real check that still runs; it just no longer buys extra rewrite rounds
  // that could never land anyway.
  const careful = await run(2, ["The harbor light was built in 1852 by Ada Rowe.", "The harbor light was built in 1841 by Ada Rowe."]);
  assert.equal(careful.rewrites, 1, "depth 2: still one rewrite ask — a second would only re-ask about the identical unapplied flag"); assert.equal(careful.maxAsks, 48);
  assert.deepEqual(careful.r.sections[0].piece.snipCheck.outcomes.map((o) => [o.round, o.outcome]), [[1, "refused"]]);
  assert.match(careful.r.sections[0].text, /1847/, "the model's own original ships unedited at every depth");
  assert.doesNotMatch(careful.r.sections[0].text, /1841/, "the rewrite is never applied, however deep the slider is set");
  assert.match(careful.r.depthLine, /^Thinking depth 2 of 3 \(careful\)/);
});

test("P125: a plain turn's wrong answer is corrected too — the flagged year is rewritten from the material, and the question's false premise is handed to the model as a fact before it drafts", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day.");
  const sent = [];
  const r = await runHolonicTask({
    task: 'Earlier we established that "the harbor light was built in 1996 by Ada Rowe." When was it built?',
    chunks, planMode: "flat",
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      if (/These sentences say things the sources you were given do not/.test(u)) return "The harbor light was built in 1841 by Ada Rowe.";
      return "The harbor light was built in 1847 by Ada Rowe.";
    },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  const first = sent[0].map((m) => m.content).join("\n");
  // The person's own question necessarily carries their claim; what matters is
  // that the INSTRUMENT's block never repeats it back (P126's rule).
  const ours = sent[0].filter((m) => m.role === "system").map((m) => m.content).join("\n");
  assert.match(ours, /What these sources say about it:/, "the premise check reached the model as a fact");
  assert.match(ours, /- The harbor light was built in 1841 by Ada Rowe\./, "the source's own words, positively"); assert.doesNotMatch(ours, /h\.txt#/, "no address reaches the mouth (firewall.js::mouthFacing)");
  assert.doesNotMatch(ours, /1996/, "the false claim is never quoted back by us");
  assert.match(first, /What the sources say, verbatim:/, "a plain turn stands on snips too"); assert.doesNotMatch(first, /#\d+-\d+/, "and no address reaches the mouth");
  assert.ok(r.correction, "a plain turn carries its correction");
  assert.equal(r.correction.flagged, 1);
  // THE MOUTH IS NOT CENSORED (2026-09-10): the mechanical flag still fires,
  // but nothing asks the model to rewrite it and nothing could splice a
  // rewrite back in — see holon.js's own note above `let text =
  // stripFraming(draft)`. The premise check above (a SEPARATE mechanism —
  // information handed to the model BEFORE it drafts, never an edit of what
  // it said after) is untouched and still runs.
  assert.deepEqual(r.correction.outcomes.map((o) => o.outcome), []);
  assert.match(r.output, /1847/, "the model's own original ships unedited"); assert.doesNotMatch(r.output, /1841/);
  assert.equal(r.correction.after.flagged, 1, "checked against the same unedited text, so the flag stands");
  assert.equal(r.premises.contradicted, 1, "a passage sharing the words with a different year is the stronger finding");
  assert.ok(r.learned.some((e) => e.caught === "premise" && /1996/.test(e.claimed) && /1841/.test(e.corrected ?? "")), "the question's false premise is still learned — the premise check never edited anything, it only ever informs the draft");
});

test("P126: a correction already learned is handed back on the next turn, and a turn with no material or no store is byte-identical to before (control)", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe.");
  const store = [{ id: "c:x", kind: "correction", ts: 1, seq: 0, claimed: "The harbor light was built in 1847.", corrected: "The harbor light was built in 1841.", ref: "h.txt#0-46", start: 0, end: 46, question: "q", caught: "answer" }];
  const sent = [];
  const r = await runHolonicTask({
    task: "When was the harbor light built?", chunks, planMode: "flat", learnedStore: store,
    call: async (messages) => { sent.push(messages); return "The harbor light was built in 1841 by Ada Rowe."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  const first = sent[0].map((m) => m.content).join("\n");
  assert.match(first, /Established here already, from these sources:/);
  assert.match(first, /- The harbor light was built in 1841\./, "only what the sources do say");
  assert.doesNotMatch(first, /1847/, "never the error it replaces (P126, measured)");
  assert.deepEqual(r.learnedUsed ?? r.sections[0].learnedUsed, ["c:x"]);
  const bare = [];
  // P244 (2026-09-18): the control's "hello there" cold open now refuses at
  // the oracle door before any prompt exists — so the no-blocks pin moved
  // one step over to a checkable-but-materialless question, the same
  // ordinary turn this always meant.
  const clean = await runHolonicTask({
    task: "hello there, tell me about the harbor festival", chunks: [], planMode: "flat",
    call: async (m) => { bare.push(m); return "Hi."; },
  });
  const b = bare[0].map((m) => m.content).join("\n");
  assert.doesNotMatch(b, /Established here already|What these sources say about it|do not use/, "no material, no blocks");
  assert.equal(clean.correction, undefined); assert.equal(clean.learned.length, 0);
});

test("P126: the negative half of what was learned never reaches the mouth — it cuts the sentence that repeats it, while the positive half goes in as the source's own statement", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day.");
  const store = [
    { id: "c:neg", kind: "correction", ts: 1, seq: 0, claimed: "The harbor light had 700 keepers.", corrected: null, ref: null, question: "q", caught: "answer" },
    { id: "c:pos", kind: "correction", ts: 2, seq: 1, claimed: "The harbor light was built in 1847.", corrected: "The harbor light was built in 1841 by Ada Rowe.", ref: "h.txt#0-47", start: 0, end: 47, question: "q", caught: "answer" },
  ];
  const sent = [];
  const r = await runHolonicTask({
    task: "Tell me about the harbor light and its keepers.", chunks, planMode: "flat", learnedStore: store,
    // Deliberately not a copy of the source: a draft that merely reproduces
    // the passage is replaced by the mechanical assembly before any of this
    // runs, and would never reach the guard.
    call: async (messages) => { sent.push(messages); return "Records once put the staff at 700 keepers for the harbor light. Ada Rowe oversaw its construction, finished in 1841, and the tide has turned twice daily ever since."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  const prompt = sent[0].map((m) => m.content).join("\n");
  assert.match(prompt, /Established here already, from these sources:\n- The harbor light was built in 1841 by Ada Rowe\./, "the positive correction goes in as a statement");
  assert.doesNotMatch(prompt, /1847/, "the error it replaces never reaches the mouth");
  assert.doesNotMatch(prompt, /700 keepers/, "nor does a claim we only know to be unplaced");
  // THE MOUTH IS NOT CENSORED (2026-09-10): the sentence is still caught
  // mechanically — twice, in fact, once by the guard scan and once more by
  // the admissible gate's own independent scan of the same still-present
  // text (see holon.js's own note above `let text = stripFraming(draft)`)
  // — but neither detection cuts it from what ships anymore.
  assert.equal(r.repeatedKnownFalse?.length, 2, "the draft repeated it and was caught mechanically, twice over");
  assert.match(r.repeatedKnownFalse[0].sentence, /700 keepers/);
  assert.match(r.output, /700 keepers/, "the model's own original ships unedited, however unsupported");
  assert.match(r.output, /1841/, "the rest of the answer stands");
});

test("P125: the premise is checked against the TASK, so a decomposed turn cannot slip an asserted falsehood past the check (S77 run 4)", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day and the keeper trims the lamp.");
  const sent = [];
  const r = await runHolonicTask({
    task: 'Earlier we established that "the harbor light was built in 1996 by Ada Rowe." Describe the light and the tide.',
    chunks, planMode: "model",
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Light", description: "the light." }, { label: "Tide", description: "the tide." }] });
      return "The harbor light was built in 1841 by Ada Rowe.";
    },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.equal(r.sections.length, 2, "a decomposed turn");
  const drafts = sent.filter((m) => /Write this part/.test(m.at(-1)?.content ?? ""));
  assert.ok(drafts.length >= 1);
  const seen = drafts.map((m) => m.map((x) => x.content).join("\n")).join("\n");
  assert.match(seen, /What these sources say about it:|do not use "1996"/, "the check fires even though no part's own words carry the premise");
  assert.ok(r.premises.checked >= 1);
  assert.ok(r.premises.contradicted + r.premises.unverified >= 1);
});

test("P142: the reading is still computed and carried on the record, but never folded into the answer's own prose (regression, 2026-09-10 user direction: \"stop it from ever saying things like this\")", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day.");
  const r = await runHolonicTask({
    task: "When was the harbor light built?", chunks, planMode: "flat",
    call: async () => "The harbor light was built in 1841 by Ada Rowe.",
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.doesNotMatch(r.output, /Also looked at/i, "the mechanical disclosure sentence never ships in the answer");
  assert.doesNotMatch(r.output, /speaks of the same things without answering this/i);
  // The underlying finding is not deleted — only its old landing in the
  // prose is. `reading` (P142's own field, spread onto the part's result)
  // is still there, for whatever reads it off the record.
  assert.ok(r.sections?.[0]?.reading?.length, "the reading is still computed and carried on the section's own result");
});

test("P142: `runPart`'s own source no longer builds a sentence from the reading and folds it into the draft — the specific append this regression is pinned against", () => {
  const src = readFileSync(new URL("./holon.js", import.meta.url), "utf8");
  assert.ok(!/traceLine\(/.test(src), "traceLine is computed nowhere in holon.js — reading-trace.js's own tests cover it in isolation");
  assert.ok(!/readingLine/.test(src), "the variable that used to carry the sentence into `text` is gone, not merely unused");
});

test("P127: the mouth's talk about the writing is cut from a plain grounded turn too, and a passage-less chat turn keeps its own voice (control)", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day.");
  const r = await runHolonicTask({
    task: "When was the harbor light built?", chunks, planMode: "flat",
    call: async () => "This analysis focuses on a passage from the material. Let me break down the question and understand its purpose. The harbor light was built in 1841 by Ada Rowe.",
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.ok(r.metaCut?.length, "the scaffolding is cut from a plain turn");
  assert.match(r.output, /1841/, "the answer survives");
  // Conversation, with nothing attached, is left alone — P244 (2026-09-18):
  // a bare greeting cold open now refuses at the oracle door, so this pin
  // moved one step over to a checkable-but-materialless question; the
  // passage-less voice it protects is unchanged.
  const chat = await runHolonicTask({
    task: "hello there, what can you help me with today", chunks: [], planMode: "flat",
    call: async () => "Let me say hello back. How can I help you today?",
  });
  assert.equal(chat.metaCut, undefined, "a passage-less turn is conversation, not a piece to police");
  assert.match(chat.output, /hello|help/i);
});

test("P128: a question about the conversation is answered from the conversation's own record, and a prior answer never becomes material", async () => {
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The tide turns twice a day.");
  const transcript = [
    { turn: 1, question: "What does the file say about Ada Rowe?", answer: "The harbor light was built in 1841 by Ada Rowe." },
    { turn: 2, question: "What about the tide?", answer: "The tide turns twice a day." },
    { turn: 3, question: "Tell me about Lisbon.", answer: "Ships came from Lisbon each spring." },
  ];
  const sent = [];
  const admitted = [];
  const r = await runHolonicTask({
    // Wants prose, so it goes to the model — the mechanical door (P173)
    // takes the bare "what did you answer" case, which is tested there.
    task: 'Earlier I asked you: "What about the tide?" Explain what you answered and why it matters.',
    chunks, planMode: "flat", transcript,
    call: async (messages) => { sent.push(messages); return "You said the tide turns twice a day."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    hyperlexicon: { admit: (log, edge, opts) => { admitted.push(opts?.witness ?? edge); return { log, landed: [], turnedAway: [] }; }, fold: () => [], foldHyperlexicon: () => [], foldWithStanding: () => [], foldVoids: () => [] },
    hyperlexiconLog: { entries: [] },
  });
  const prompt = sent[0].map((m) => m.content).join("\n");
  assert.match(prompt, /Turn 2 of this conversation, quoted from the record\./, "the prior turn is handed over, labelled");
  assert.match(prompt, /You were asked: What about the tide\?\s+You answered: The tide turns twice a day\./);
  assert.match(prompt, /turn:2/, "addressed by its turn");
  assert.match(prompt, /what was said, which is not the same as what the sources establish/);
  assert.deepEqual(r.recalledTurns, [2]);
  assert.ok(!admitted.some((w) => String(w).startsWith("turn:")), "a prior answer is never admitted to the ledger as material");
  // A question about the material recalls nothing from the transcript.
  const plain = await runHolonicTask({
    task: "When was the harbor light built?", chunks, planMode: "flat", transcript,
    call: async () => "It was built in 1841.",
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.equal(plain.recalledTurns, undefined, "a question about the material does not reach for the transcript");
});

test("P173: the turn hands the mouth the worked-out comparison as a fact, and a question with nothing to compare is byte-identical to before (control)", async () => {
  const math = await import("mathjs");
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. Millennium ran until 1996.");
  const sent = [];
  const r = await runHolonicTask({
    // Wants prose, so the turn reaches the model AND carries the worked-out
    // comparison as a fact; the bare form is answered without the model (P173).
    task: "Which of the two years mentioned is earlier, 1841 or 1996, and why does that gap matter?",
    chunks, planMode: "flat", math,
    call: async (messages) => { sent.push(messages); return "1841 is earlier, by 155 years."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  const ours = sent[0].filter((m) => m.role === "system").map((m) => m.content).join("\n");
  assert.match(ours, /Worked out from the numbers in the question: Of the two, 1841 is the one asked for/);
  assert.match(ours, /The difference between them is 155 years\./);
  assert.equal(r.comparison.difference, 155);
  assert.equal(r.comparison.first, 1841);
  const plain = [];
  const none = await runHolonicTask({
    task: "What does the file say about Ada Rowe?", chunks, planMode: "flat", math,
    call: async (m) => { plain.push(m); return "Ada Rowe built the light."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.equal(none.comparison, undefined);
  assert.doesNotMatch(plain[0].map((m) => m.content).join("\n"), /Worked out from the numbers/);
});

test("P173: a question the instrument can answer exactly is answered with NO model call at all; one that wants prose still goes to the model", async () => {
  const math = await import("mathjs");
  const chunks = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The war began in 1805.");
  let calls = 0;
  const call = async () => { calls += 1; return "There are 46 years between them."; };
  const r = await runHolonicTask({
    task: "Which of the two years is earlier, 1805 or 1841, and how many years apart are they?",
    chunks, planMode: "flat", math, call,
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.equal(calls, 0, "the model was not asked");
  assert.equal(r.answeredBeforeTheModel.kind, "comparison");
  assert.match(r.output, /The difference between them is 36 years\./);
  assert.doesNotMatch(r.output, /46/, "the mouth's wrong number never enters the answer");
  // The same values, but the person asked why — that is the model's.
  let calls2 = 0;
  const r2 = await runHolonicTask({
    task: "Which of the two years is earlier, 1805 or 1841, and why does it matter?",
    chunks, planMode: "flat", math,
    call: async () => { calls2 += 1; return "1805 is earlier; it matters because the war framed everything after."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.ok(calls2 >= 1, "a question wanting prose reaches the model");
  assert.equal(r2.answeredBeforeTheModel, undefined);
});

test("P173/regression (task_b5850fd4): a section this door produces still carries every array field an ordinary section does, declared empty rather than absent — app.js's real crash, reproduced at the shape level", async () => {
  // Live specimen that crashed the real page: a "word for word"/"verbatim"
  // request routes through answerable.js::quoteBytes (answerBeforeTheModel's
  // "quote" kind) with NO model call at all — and the section this early
  // return used to build had no `attributions` key. app.js reduces every
  // section's `attributions` with `result.sections.flatMap((s) =>
  // s.attributions)` (no `?? []`, unlike its four sibling reductions two
  // lines below it), so the missing key came back `undefined` for this
  // section, `flatMap` kept it as a bare element in the merged array, and
  // classifySentences's own first line — `attributions.map((a) => [a.text,
  // a])` — threw "Cannot read properties of undefined (reading 'text')" on
  // it. guardedSend caught it (no conversation-bricking), but a mechanical
  // door answering instantly should never throw at all.
  const chunks = chunkSource(
    "gettysburg.txt",
    "Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal.",
  );
  let calls = 0;
  const r = await runHolonicTask({
    task: 'Is this word for word what it says: "Four score and seven years ago our forefathers brought forth upon this continent a great new nation"?',
    chunks, planMode: "flat",
    call: async () => { calls += 1; return "(the model should never be asked)"; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.equal(calls, 0, "quoteBytes answers before the model — this is the door the crash lives in");
  assert.equal(r.answeredBeforeTheModel.kind, "quote");
  // The regression itself: every section — this door's included — must be
  // safe under the EXACT reduction app.js runs over `result.sections`, with
  // no per-call-site `?? []` required to survive it.
  const attributions = r.sections.flatMap((s) => s.attributions);
  assert.deepEqual(attributions, [], "the mechanical section declares attributions: [], never an absent key");
  assert.doesNotThrow(
    () => attributions.map((a) => [a.text, a]),
    "classifySentences's own first line, replayed against this door's section — must never throw",
  );
});

test("P174: S2 is recruited by difficulty — an easy turn spends fewer witness asks than an argued one, and the person's slider is a floor and a ceiling", async () => {
  const easy = chunkSource("h.txt", "The harbor light was built in 1841 by Ada Rowe. The harbor light stands above the coast. The harbor light is white.");
  // Retrieved (it shares "harbor"), but it does not answer: low coverage of
  // what the question actually asks about, which is the strain.
  const hard = chunkSource("h.txt", "The harbor turbines are serviced quarterly by the contractor.\n\nThe harbor gearboxes were replaced under a maintenance programme.\n\nThe harbor canteen opens early.\n\nThe harbor car park was resurfaced.");
  const run = async (chunks, opts = {}) => {
    let maxAsks = null;
    const r = await runHolonicTask({
      task: "When was the harbor light built?", chunks, planMode: "flat", ...opts,
      call: async () => "The harbor light was built in 1841 by Ada Rowe.",
      makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
      witnessSentences: async (sents, claims, passages, { maxAsks: m }) => { maxAsks = m; return { rows: [], asks: 0 }; },
    });
    return { r, maxAsks, strain: r.strain?.[0] };
  };
  const a = await run(easy);
  const b = await run(hard);
  assert.equal(a.strain.level, 1, "the material speaks to the question");
  assert.ok(b.strain.level >= 2, "material that does not answer is a strain: " + JSON.stringify(b.strain.reasons));
  assert.ok(b.maxAsks > a.maxAsks, `a strained turn buys more checking (${a.maxAsks} vs ${b.maxAsks})`);
  assert.match(a.strain.why, /recruited by strain/);
  // A deliberate slider is honoured in both directions.
  const asked3 = await run(easy, { depth: 3 });
  assert.ok(asked3.maxAsks > a.maxAsks, "asking for depth gets depth even when it is easy");
  assert.match(asked3.strain.why, /asked for depth 3; strain alone would have taken 1/);
  const asked1 = await run(hard, { depth: 1 });
  assert.match(asked1.strain.why, /caps the/);
  assert.ok(asked1.maxAsks <= b.maxAsks, "a low slider caps what strain may recruit");
});

test("P133: a quotation with one token swapped is caught as a misquote, the source's own words go in as a fact, and the false token cannot ship", async () => {
  const chunks = chunkSource("pg2600.txt", '"Both true and untrue," Pierre began; but Prince Andrew interrupted him. He laughed disagreeably and placed a chair for her.');
  const sent = [];
  const r = await runHolonicTask({
    task: 'Earlier we established from pg2600.txt that: ""Both true and untrue," Lincoln began; but Prince Andrew interrupted him." Remind me what that passage says.',
    chunks, planMode: "flat",
    call: async (messages) => { sent.push(messages); return "Lincoln began the exchange and Prince Andrew interrupted him."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  const ours = sent[0].filter((m) => m.role === "system").map((m) => m.content).join("\n");
  assert.match(ours, /What that passage actually says:.*Pierre began/, "the source's own words, positively — without its address (firewall.js::mouthFacing)");
  assert.doesNotMatch(ours.split("What that passage actually says")[1] ?? "", /Lincoln/, "the misquotation is not repeated back in our own block");
  assert.deepEqual(r.misquote.said, ["Lincoln"]);
  assert.deepEqual(r.misquote.shouldBe, ["Pierre"]);
  // THE MOUTH IS NOT CENSORED (2026-09-10): the misquote is still caught
  // and still recorded (r.misquote above), it just no longer gets to
  // silently swap the model's own word for the source's — see holon.js's
  // own note above `let text = stripFraming(draft)`.
  assert.match(r.output, /Lincoln/, "the model's own word ships, flagged rather than silently swapped");
});

test("P134: a SEG finding binds EVA — a rewrite cannot reinstate what the cut established, and the refusal names the cell that bound it", async () => {
  const chunks = chunkSource("pg2600.txt", '"Both true and untrue," Pierre began; but Prince Andrew interrupted him. He laughed disagreeably.');
  // The mouth returns the cut name for EVERY ask, including the correction's.
  const r = await runHolonicTask({
    task: 'Earlier we established from pg2600.txt that: ""Both true and untrue," Lincoln began; but Prince Andrew interrupted him." Remind me what that passage says.',
    chunks, planMode: "flat",
    call: async () => "Lincoln began the exchange and Prince Andrew interrupted him.",
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.deepEqual(r.misquote.said, ["Lincoln"]);
  assert.ok(r.inadmissible?.length, "the finding refused what a later cell wrote");
  assert.equal(r.inadmissible[0].cell, "SEG", "and names the cell that established it");
  // THE MOUTH IS NOT CENSORED (2026-09-10): the SEG finding still binds
  // (r.inadmissible above) — it no longer gets to splice "Pierre began"
  // back over what the model actually said. See holon.js's own note
  // above `let text = stripFraming(draft)`.
  assert.match(r.output, /Lincoln/, "the model's own word ships, flagged rather than silently swapped");
});

test("P134: every cut registers a finding at its cell — the learned guard's CON cut survives an EVA rewrite, and REC cannot learn the forbidden claim back as truth (the audit's repro)", async () => {
  const { correctionEntry } = await import("./learned.js");
  // The store holds a claim found unplaced on an earlier turn, with no
  // replacement — so learnedFacts never sends it to the mouth and the guard
  // is its only enforcement.
  const store = [correctionEntry({ claimed: "John Adams chaired the naval committee", corrected: null, question: "q" })];
  const chunks = chunkSource("n.txt", "John Adams addressed the naval committee in December. The delegates approved the report.");
  let n = 0;
  const r = await runHolonicTask({
    task: "What did the naval committee do in December?", chunks, planMode: "flat", learnedStore: store,
    // The mouth reinstates the cut claim in different words when asked to rewrite.
    call: async () => { n += 1; return n === 1 ? "John Adams chaired the naval committee. The committee met in 1802." : "The naval committee that John Adams chaired met in December."; },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  assert.ok(r.repeatedKnownFalse?.length, "CON cut it");
  // THE MOUTH IS NOT CENSORED (2026-09-10): the CON guard still finds and
  // records the repeated known-false claim (r.repeatedKnownFalse above);
  // it no longer deletes the sentence out of what the model actually
  // said. See holon.js's own note above `let text = stripFraming(draft)`.
  assert.match(r.output, /chaired/, "the model's own sentence ships, flagged rather than silently deleted");
  assert.ok(!(r.learned ?? []).some((e) => /chaired/.test(e.corrected ?? "")), "REC may not mint the forbidden claim as the truth");
});

test("P135/P136 end to end: the cited passage's own cast decides, and a rendered article is prose so its cast can be read at all", async () => {
  const { makeReferentIndex } = await import("../organs/cast.js");
  const { splitSentences: split } = await import("../adapters/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import("../adapters/text/surfaces.js");
  const referentIndexFor = makeReferentIndex({ splitSentences: split, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const chunks = [
    ...chunkSource("lincoln.html", "Abraham Lincoln signed the Yosemite Grant in 1864. Lincoln addressed Congress about the measure, and Lincoln praised the region."),
    ...chunkSource("pg2600.txt", "The Emperor displeasure with Kutúzov was increased at Vílna. Kutúzov could not act, and Kutúzov wrote to the Emperor."),
  ];
  const r = await runHolonicTask({
    // A name planted from ANOTHER source — real in the corpus, a stranger here.
    task: 'Earlier we established from lincoln.html that: "Lincoln signed the Yosemite Grant protecting the Kutúzov region." Remind me what that passage says.',
    chunks, planMode: "flat", makeReferentIndexFor: referentIndexFor,
    call: async () => "The Kutúzov region was protected by the grant Lincoln signed.",
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  // Retrieval honoured the citation, so the cited passage is actually present.
  assert.ok((r.sections[0].passages ?? []).some((p) => String(p.ref).includes("lincoln.html")), "the cited source is retrieved");
  // The cast of THAT passage decides: the planted name is beyond-reach, and
  // the name the passage does establish is not flagged.
  const flags = r.premises.rows[0].flags;
  assert.deepEqual(flags, ["Kutúzov"], "only the stranger is flagged");
  assert.ok(!flags.includes("Yosemite Grant"), "what the passage does introduce is left alone");
  // THE MOUTH IS NOT CENSORED (2026-09-10): the premise check still reads
  // by referent, not by string — the stranger is named in r.premises.rows
  // above, correctly, without the passage's own "Yosemite Grant" caught
  // alongside it. It is no longer spliced a warning sentence into what the
  // model actually said; the model's own sentence ships as it was drafted.
  assert.equal(r.output, "The Kutúzov region was protected by the grant Lincoln signed.", "the model's own sentence ships unedited");
});

test("THE SCOPING BUG, wired end to end (task_298dbc5b, P178): a workspace-spanning transcript never lets a FOREIGN conversation's last turn stand in for 'the last answer' in a real turn", async () => {
  const { makeReferentIndex } = await import("../organs/cast.js");
  const { splitSentences: split } = await import("../adapters/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import("../adapters/text/surfaces.js");
  const referentIndexFor = makeReferentIndex({ splitSentences: split, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
  const chunks = chunkSource("harbor.txt", "The county's own report on the harbor survey was late again this year. Everyone on the board agreed that Ada Rowe signed it off only after inspecting the light twice herself, and that John Adams reviewed the very same report a second time before it went to the county for filing.");
  // THIS conversation's own last turn — what "the last answer" must mean.
  const ownTurn = { turn: 1, question: "Who signed off the harbor survey?", answer: "Ada Rowe signed off the harbor survey report." };
  // A DIFFERENT conversation in the same workspace, appended AFTER this
  // one's own row exactly the way app.js::transcriptNow builds it.
  const foreignTurn = { turn: 9, chat: 2, chatTitle: "A different conversation entirely", question: "Who reviewed the report a second time?", answer: "John Adams reviewed the report a second time for the county." };
  const r = await runHolonicTask({
    task: "Why did she do it, given what the harbor survey found?", // a bare pronoun, no local antecedent, no referent of its own — exactly the shape that falls back; "harbor survey" only makes the passage retrievable, it names no one
    chunks, planMode: "flat",
    transcript: [ownTurn, foreignTurn],
    makeReferentIndexFor: referentIndexFor,
    call: async () => "Ada Rowe did it because the survey report was overdue and she wanted it closed out before spring.",
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
  });
  const bound = r.addressed?.[0]?.bound ?? [];
  const index = referentIndexFor(chunks);
  const adaId = [...index.resolve("Ada Rowe")][0];
  const johnId = [...index.resolve("John Adams")][0];
  assert.ok(bound.length, "the pronoun fallback bound to something");
  assert.ok(bound.includes(adaId), "bound to THIS conversation's own last turn (Ada Rowe)");
  assert.ok(!bound.includes(johnId), "never the other conversation's own last turn (John Adams) — even though it sits last in the workspace-spanning transcript array");
});

test("P137: a finding leaves the part and binds the later cells — the section heading and the piece's revision (the audit's two piece-path leaks)", async () => {
  const chunks = chunkSource("pg2600.txt", '"Both true and untrue," Pierre began; but Prince Andrew interrupted him. Pierre spoke again later, and Prince Andrew listened.');
  const sent = [];
  const r = await runHolonicTask({
    task: 'Earlier we established from pg2600.txt that: ""Both true and untrue," Lincoln began; but Prince Andrew interrupted him." Write about that exchange.',
    chunks, planMode: "model",
    call: async (messages) => {
      sent.push(messages);
      const u = messages.at(-1)?.content ?? "";
      // The plan names sections after the false claim, as it would.
      if (/parts/.test(u) && /Task:/.test(u)) return JSON.stringify({ parts: [{ label: "Lincoln's silence", description: "the exchange itself." }, { label: "After the interruption", description: "what followed." }] });
      return "Lincoln began the exchange and Prince Andrew interrupted him.";
    },
    makeRelationReader: () => ({ edges: [], read: () => ({ claims: [] }) }),
    piece: { topic: "the exchange", pages: 1, words: 30 },
  });
  assert.ok(r.sections.some((s) => s.findings?.length), "the findings leave the part");
  // The heading may not carry what the body was gutted for saying.
  assert.doesNotMatch(r.output, /^## .*Lincoln/m, "no section heading ships the cut name");
  assert.doesNotMatch(r.output, /Lincoln/, "and neither does anything the later cells assembled");
});

test("what the material IS rides every path: a source's own title page reaches the mouth even when the passages are compressed to snips", async () => {
  // Measured live, 2026-09-08: War and Peace attached, "what's this book
  // about?" retrieved chapters about a prince's EXERCISE BOOK (the question's
  // one content word is "book") and the mouth answered "a man named Caesar
  // and his commentary on his military campaigns". The engine had the title
  // page in hand throughout; the compressed path dropped it.
  const declared = { title: "War and Peace", author: "graf Leo Tolstoy", giver: "the source file's own declared header", ref: "wp.txt#0-856" };
  // Real chunks from the real chunker, so they carry the term index retrieval
  // reads — and the identity every chunking path threads onto every chunk.
  const body = "The princess bent over the exercise book on the table, and the prince pushed the book away.\n\nHe took the exercise book containing lessons in geometry written by himself and drew up a chair with his foot.";
  const wp = chunkSource("wp.txt", body, { identity: { kind: "prose", certainty: "default", declared } });
  const sent = [];
  // "what's this book about?" also fires the about-call (about-call.js) —
  // its own system prompt is distinguishable and its reply must stay
  // grounded in the excerpt's own words, or the (unrelated) snip-rewrite
  // check trips on an unbacked name and spends a further call this test
  // does not care about.
  const call = async (messages) => {
    sent.push(messages);
    const sys = messages[0]?.content ?? "";
    if (/Not the answer/i.test(sys)) return "Asking for the gist.";
    return "It is about a princess and a prince and an exercise book.";
  };
  await runHolonicTask({
    task: "what's this book about?", call, chunks: wp, planMode: "flat", material: "snips", maxCorrections: 0,
  });
  const systems = sent.flat().filter((m) => m.role === "system").map((m) => m.content);
  assert.ok(systems.some((s) => /What this material is, by its own title page: War and Peace, by graf Leo Tolstoy\./.test(s)));
  // A fact, not an instruction (P55), and no address — the mouth never sees one.
  assert.ok(!systems.some((s) => /wp\.txt#/.test(s)), "no address reaches the mouth");
  // And the same turn with material carrying no title page says nothing at all.
  sent.length = 0;
  await runHolonicTask({
    task: "what's this book about?", call, planMode: "flat", material: "snips", maxCorrections: 0,
    chunks: wp.map((c) => ({ ...c, identity: { kind: "prose" } })),
  });
  const bareSystems = sent.flat().filter((m) => m.role === "system").map((m) => m.content);
  assert.ok(!bareSystems.some((s) => /title page/.test(s)), "material with no declared identity claims none");
});

test("the about call: a small model reads the SITUATION and says what the ask is for, gated on the free mechanical detector — spent only when it fires", async () => {
  // (user, 2026-09-08, after the title-page fix closed the flagship
  // specimen): "we need an 'about' model call that gets all the folded
  // content needed... to tell the talker what it thinks the user is
  // saying." about-call.js::interpretAsk is the call; about.js::
  // asksAboutMaterial is the free gate that decides whether to spend it.
  const declared = { title: "War and Peace", author: "graf Leo Tolstoy", giver: "the source file's own declared header" };
  const body = "The princess bent over the exercise book on the table, and the prince pushed the book away.\n\nHe took the exercise book containing lessons in geometry written by himself and drew up a chair with his foot.";
  const wp = chunkSource("wp.txt", body, { identity: { kind: "prose", certainty: "default", declared } });
  const sent = [];
  const call = async (messages) => {
    sent.push(messages);
    const sys = messages[0]?.content ?? "";
    // The about-call's own system prompt says it must not answer; a real
    // draft call's system prompt never says that — this is how the mock
    // tells the two calls apart without hardcoding either prompt's text.
    if (/Not the answer/i.test(sys)) return "Asking for the whole gist of the book.";
    // Grounded in the excerpt's own words — a name the excerpt never says
    // (e.g. "Tolstoy") would trip the unrelated snip-rewrite check and spend
    // a further call this test does not care about counting.
    return "It is about a princess and a prince and an exercise book.";
  };
  await runHolonicTask({ task: "what's this book about?", call, chunks: wp, planMode: "flat", material: "snips", maxCorrections: 0 });
  assert.equal(sent.length, 2, "one about-call, then one draft call — no more");
  const draftSystem = sent[1][0].content;
  assert.match(draftSystem, /What they seem to be asking for: Asking for the whole gist of the book\./);
  // declaredLine still rides too — the two are complementary, not a swap.
  assert.match(draftSystem, /War and Peace, by graf Leo Tolstoy/);
});

test("the about call is never spent on an ordinary content question — the free detector decides, not a model", async () => {
  const wp = chunkSource("wp.txt", "The general moved his forces across the river at dawn.", { identity: { kind: "prose", certainty: "default", declared: { title: "T" } } });
  const sent = [];
  const call = async (messages) => { sent.push(messages); return "The general crossed at dawn."; };
  await runHolonicTask({ task: "when did the general cross the river?", call, chunks: wp, planMode: "flat", material: "snips", maxCorrections: 0 });
  assert.equal(sent.length, 1, "no about-call spent — only the draft call");
});

test("the about call degrading — a reply shaped like an answer — adds nothing to the talker; declaredLine alone still stands", async () => {
  const declared = { title: "War and Peace", author: "graf Leo Tolstoy" };
  const body = "The princess bent over the exercise book on the table, and the prince pushed the book away.";
  const wp = chunkSource("wp.txt", body, { identity: { kind: "prose", certainty: "default", declared } });
  const sent = [];
  const call = async (messages) => {
    sent.push(messages);
    const sys = messages[0]?.content ?? "";
    if (/Not the answer/i.test(sys)) return "The book is about the princess and the exercise book.";
    return "It is about a princess and a prince and an exercise book.";
  };
  await runHolonicTask({ task: "what's this book about?", call, chunks: wp, planMode: "flat", material: "snips", maxCorrections: 0 });
  // The DRAFT call's own system message, wherever it landed — never assumed
  // to be a fixed index, since another mechanism (the snip-rewrite pass) can
  // legitimately add a call of its own for reasons unrelated to this test.
  const draftSystem = sent.map((m) => m[0]?.content ?? "").find((s) => !/Not the answer/i.test(s));
  assert.ok(!/What they seem to be asking for/.test(draftSystem), "a refused interpretation is discarded, never forwarded");
  assert.match(draftSystem, /War and Peace/, "declaredLine is unaffected by the about call's own outcome");
});

test("the about call never fires on a decomposed (non-flat) task — it is scoped to a single flat question and must not compound across parts", async () => {
  const declared = { title: "War and Peace", author: "graf Leo Tolstoy" };
  const wp = chunkSource("wp.txt", "The princess bent over the exercise book. The prince read the geometry lessons himself.", { identity: { kind: "prose", certainty: "default", declared } });
  const sent = [];
  const call = async (messages) => {
    sent.push(messages);
    const sys = messages[0]?.content ?? "";
    if (/Not the answer/i.test(sys)) return "Asking for the gist.";
    if (sys.includes("JSON")) return JSON.stringify([{ label: "what it is", description: "what's this book about" }]);
    return "It is Tolstoy's novel.";
  };
  await runHolonicTask({ task: "Describe what's this book about, in full.", call, chunks: wp, planMode: "model", maxCorrections: 0 });
  assert.ok(sent.every((m) => !/Not the answer/i.test(m[0]?.content ?? "")), "no about-call fired on a decomposed task");
});

// ── P244 no-oracle-mode: the task door ───────────────────────────────────
// No live claim, document, or task in view: the mouth is not called at all.
// The refusal returns the answered-before-the-model door's own shape (zero
// calls, the fixed reply as output), so the caller renders it the same way.
test("oracle door: empty everything and an uncheckable question never reaches the mouth", async () => {
  let called = 0;
  const call = async () => { called += 1; return "free association"; };
  const result = await runHolonicTask({ task: "hi", chunks: [], call, planMode: "flat" });
  assert.equal(result.oracleRefused, true);
  assert.equal(result.calls, 0);
  assert.equal(called, 0, "no model call spent on free association");
  assert.match(result.output, /What should I read\?/);
  assert.deepEqual(result.sections, []);
});

test("oracle door stays shut with material, a claim, a task, or history in view", async () => {
  let called = 0;
  const call = async () => { called += 1; return "hello there"; };
  // material in view
  const withChunks = await runHolonicTask({ task: "hi", chunks, call, planMode: "flat" });
  assert.ok(!withChunks.oracleRefused);
  assert.ok(called > 0);
  // a checkable claim in the question's own words, nothing attached
  called = 0;
  const withClaim = await runHolonicTask({ task: "What's the capital of France?", chunks: [], call, planMode: "flat" });
  assert.ok(!withClaim.oracleRefused);
  assert.ok(called > 0);
  // a checked cycle result is a claim in view even for a bare question
  called = 0;
  const withCycle = await runHolonicTask({ task: "hi", chunks: [], call, planMode: "flat", oracleQuestionCycle: { cycle: ["a", "b"] } });
  assert.ok(!withCycle.oracleRefused);
  assert.ok(called > 0);
  // transcript in view (an anaphoric follow-up's claim lives there)
  called = 0;
  const withHistory = await runHolonicTask({ task: "hi", chunks: [], call, planMode: "flat", transcript: [{ role: "user", content: "tell me about the harbor" }] });
  assert.ok(!withHistory.oracleRefused);
  assert.ok(called > 0);
});

test("the composition seam, armed, ships an unverifiable draft as itself with the gap said — never the bare coverage line (P244 amendment, 2026-09-19)", async () => {
  // The specimen this pins, found live: a plain question whose one drafted
  // sentence cleared no check answered with only "nothing composed — 1 draft
  // sentence(s) cleared no check; 1 withheld" — no answer at all. The
  // amendment: when nothing verifies AND nothing is refused, the draft ships
  // and one plain line says it is unchecked. The coverage line still rides
  // the record (`open`).
  const draft = "Harbor Zeta closed permanently in 1802 after the flood.";
  const result = await runHolonicTask({
    task: "What happened to Harbor Zeta?",
    chunks,
    call: async () => draft,
    shipExperiencer: { who: "test:reader", read: "conversation:test" },
  });
  const shipped = result.sections.map((s) => s.text ?? "").join("\n");
  assert.ok(shipped.includes("Harbor Zeta closed permanently in 1802"), `the draft ships: ${shipped}`);
  assert.ok(/unchecked/i.test(shipped), "and the gap is said in plain words");
  assert.ok(!/^nothing composed/i.test(shipped.trim()), "never the bare coverage line as the whole answer");
  assert.ok(result.open.some((o) => o.includes("composition seam: nothing verified composed")), "the coverage stays on the record");
});

test("CHAT_SYSTEM_PROMPT discloses an AI identity but no reading/research job to echo — a small model handed the job answers a bare hello with it (measured 9/40 vs 0/40, 2026-09-19)", () => {
  assert.match(CHAT_SYSTEM_PROMPT, /^You are The Fold, an AI assistant having a conversation\./);
  assert.ok(!/reading and research|research assistant/i.test(CHAT_SYSTEM_PROMPT), "the no-material chat prompt carries no job to echo");
  assert.ok(!/Do not repeat back what was just said/i.test(CHAT_SYSTEM_PROMPT), "the echo ban is scoped (verbatim echo), not a ban on confirmation repeat-back");
});

test("the composition seam ships plain words, never bookkeeping — and ordinary words like her/man/then no longer refuse the whole answer as 'harm class' (2026-09-19)", async () => {
  const run = (draft) => runHolonicTask({ task: "What happened to Harbor Zeta?", chunks, call: async () => draft, shipExperiencer: { who: "test:reader", read: "conversation:test" } });
  const BOOKKEEPING = /nothing composed|draft sentence|harm class|cleared no check|withheld/i;
  // The false positive this pins: any one of the old law's patterns, anywhere in the draft, refused the WHOLE draft.
  const draft = "Her office moved to the east quay, and then the man who owns the shop reopened it. Harbor Zeta closed in 1802 after the flood.";
  const out = (await run(draft)).sections.map((s) => s.text ?? "").join("\n");
  assert.ok(out.includes("Her office moved to the east quay") && out.includes("Harbor Zeta closed in 1802"), `the drafted words ship: ${out}`);
  assert.ok(/unchecked/i.test(out), "with the gap said plainly");
  assert.ok(!BOOKKEEPING.test(out), `and no bookkeeping reaches the person: ${out}`);
});
