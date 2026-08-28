// hyperlexicon.test.mjs — the door, and the accumulation, against the REAL
// task-log and the REAL grammar lens over the REAL treebank prior.
//
// The specimen throughout is the live turn that produced this module: the
// three passages a real fetch retrieved for "who was Queen Victoria's prime
// minister?", and the ten edges the real extractor found in them. Nothing is
// hand-shaped to pass.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { makeHyperlexicon, assertionId, REFUSALS, VERB_CLASS } from "./hyperlexicon.js";
import { makeGrammarLens } from "./grammar-lens.js";

const ENGINE = "../eoreader7/legacy-eoreader6.1/packages/engine";
const taskLog = await import(`${ENGINE}/holon/task-log.js`);
const { classifyWord, dominantClass, THRAX_META, POS_PRIOR_META, THRAX_MAP } = await import(
  `${ENGINE}/perceiver/text/wordclass.js`
);
const posPrior = JSON.parse(
  readFileSync(new URL("../eoreader7/legacy-eoreader6.1/scripts/corpus/pos-prior-eng.json", import.meta.url), "utf8"),
);
const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior, posPriorMeta: POS_PRIOR_META, thraxMeta: THRAX_META });

const hl = makeHyperlexicon(taskLog);

const span = (ref, start, end, text) => ({ ref, start, end, text });
// Each edge gets its OWN byte range: a shared `at` would make span identity
// collapse by accident and quietly hide a merge bug.
let nextOffset = 0;
const edge = (subject, verb, object, spans = null) => {
  const text = `${subject} ${verb} ${object}.`;
  const start = nextOffset;
  nextOffset += text.length;
  return { subject, verb, object, spans: spans ?? [span("web:p", start, nextOffset, text)] };
};

// The ten edges the real extractor produced from the real retrieved passages,
// copied off the live run rather than invented.
const LIVE_EDGES = [
  edge("Queen Victoria", "reigned", "for over 60 years"),
  edge("and", "in", "that time had to get along with many politicians"),
  edge("the Victorian", "era's", "hallmark industrialization"),
  edge("Robert Peel", "is", "considered one of the most important Prime Ministers"),
  edge("Prime Minsters", "of", "them all"),
  edge("complete list", "is", "given above"),
  edge("with Peel", "went", "well"),
  edge("young Victoria", "ascended", "to the throne in 1837"),
  edge("and Melbourne", "developed", "a close relationship"),
  edge("new queen", "in", "government and politics"),
];

test("VERB_CLASS is the lens's OWN label, checked against it, never assumed", () => {
  // Written "Verb" at first, this matched nothing and the door silently
  // refused every real verb while letting the prepositions through.
  assert.ok(Object.values(THRAX_MAP).includes(VERB_CLASS), `THRAX_MAP has no ${JSON.stringify(VERB_CLASS)}`);
  assert.equal(THRAX_MAP.VERB, VERB_CLASS);
  assert.equal(THRAX_MAP.AUX, VERB_CLASS, "UD splits AUX from VERB; Thrax does not, and this door follows Thrax");
});

test("what admit reports as heard is what the returned log actually holds", () => {
  // `append` returns a NEW log. The first version of `admit` called `hear`
  // against the same original log every time and threw away every result, so
  // it reported ten successes and landed none.
  const { log, heard } = hl.admit(hl.createHyperlexicon(), LIVE_EDGES, { classifyConnector: lens, witness: "w" });
  assert.equal(hl.foldHyperlexicon(log).length, heard.length);
  assert.ok(heard.length > 0);
});

test("the door turns away the connectors that are settled non-verbs, and only those", () => {
  const log = hl.createHyperlexicon();
  const { heard, turnedAway } = hl.admit(log, LIVE_EDGES, { classifyConnector: lens, witness: "web:p" });

  const refusedVerbs = turnedAway.map((t) => t.edge.verb).sort();
  assert.deepEqual(refusedVerbs, ["in", "in", "of"], "prepositions are refused; nothing else is");
  for (const t of turnedAway) {
    assert.equal(t.reason, REFUSALS.NOT_A_VERB);
    assert.match(t.detail, /settles as/);
    // The refusal names who said so — a giver, not this file's opinion.
    assert.ok(t.givers?.measured, "a refusal carries the prior that made it");
  }
  assert.equal(heard.length, 7);
});

test("an out-of-vocabulary connector is ADMITTED, never refused — P56's asymmetry", () => {
  // "reigned", "ascended" and "era's" are all absent from the treebank. Two
  // are real verbs and one is a possessive; the lens cannot tell, and so it
  // must not decide. A gap in the prior is not a fact about the word.
  for (const w of ["reigned", "ascended", "era's"]) {
    assert.equal(lens({ verb: w }).found, false, `${w} must be out of vocabulary for this test to mean anything`);
  }
  const log = hl.createHyperlexicon();
  const { heard, turnedAway } = hl.admit(log, [edge("the Victorian", "era's", "hallmark industrialization")], {
    classifyConnector: lens,
  });
  assert.equal(turnedAway.length, 0, "an unknown word is a disclosed gap, never a conviction");
  assert.equal(heard.length, 1);
});

test("NO LENS MEANS NO CHECK, and no check never reports a pass", () => {
  const log = hl.createHyperlexicon();
  const { heard, turnedAway } = hl.admit(log, LIVE_EDGES);
  assert.equal(turnedAway.length, 0);
  assert.equal(heard.length, 10, "without a lens every well-formed edge is heard — the check simply did not run");
});

test("an assertion with no bytes behind it is refused — P5.2 at the door", () => {
  const log = hl.createHyperlexicon();
  const { heard, turnedAway } = hl.admit(log, [{ subject: "A", verb: "met", object: "B", spans: [] }]);
  assert.equal(heard.length, 0);
  assert.equal(turnedAway[0].reason, REFUSALS.UNADDRESSED);
});

test("a missing end is refused rather than half-heard", () => {
  const log = hl.createHyperlexicon();
  const { turnedAway } = hl.admit(log, [{ subject: "A", verb: "met", object: "", spans: [span("r", 0, 1, "x")] }]);
  assert.equal(turnedAway[0].reason, REFUSALS.INCOMPLETE);
});

test("HEARING THE SAME THING TWICE MAKES ONE NOTE WITH TWO WITNESSES, not two notes", () => {
  const claim = (ref) => edge("Robert Peel", "served", "as prime minister", [span(ref, 0, 30, "Robert Peel served as prime minister.")]);
  let log = hl.createHyperlexicon();
  ({ log } = hl.admit(log, [claim("web:a")], { witness: "web:a" }));
  ({ log } = hl.admit(log, [claim("web:b")], { witness: "web:b" }));

  const fold = hl.foldHyperlexicon(log);
  assert.equal(fold.length, 1, "one assertion, however many pages state it");
  assert.deepEqual(fold[0].witnesses.sort(), ["web:a", "web:b"]);
  assert.equal(fold[0].spans.length, 2, "and both sources' bytes are kept — the second never erases the first");

  // The log itself grew by two entries: a birth and a re-hearing. The
  // accumulation is real, not a deduplicated read.
  assert.equal(log.entries.length, 2);
  assert.equal(log.entries[0].operator, "INS");
  assert.equal(log.entries[1].operator, "SYN");
});

test("the fold ranks by corroboration, so a cut for room drops the least witnessed", () => {
  let log = hl.createHyperlexicon();
  ({ log } = hl.admit(log, [edge("A", "met", "B")], { witness: "one" }));
  const twice = edge("C", "met", "D", [span("web:x", 0, 12, "C met D.")]);
  ({ log } = hl.admit(log, [twice], { witness: "one" }));
  ({ log } = hl.admit(log, [{ ...twice, spans: [span("web:y", 0, 12, "C met D.")] }], { witness: "two" }));

  const fold = hl.foldHyperlexicon(log);
  assert.equal(fold[0].subject, "C", "the corroborated assertion leads");
  assert.equal(fold[0].witnesses.length, 2);
  assert.equal(fold[1].witnesses.length, 1);
});

test("identity folds case and surrounding space, so one assertion is one task", () => {
  assert.equal(assertionId("Robert Peel", "served", "as PM"), assertionId("  robert peel ", "SERVED", " as pm "));
  let log = hl.createHyperlexicon();
  ({ log } = hl.admit(log, [edge("Robert Peel", "served", "as PM")], { witness: "a" }));
  ({ log } = hl.admit(log, [edge("robert peel", "served", "as pm")], { witness: "b" }));
  assert.equal(hl.foldHyperlexicon(log).length, 1);
});

test("the log is the reading — the fold is rebuildable from the entries alone", () => {
  let log = hl.createHyperlexicon();
  ({ log } = hl.admit(log, LIVE_EDGES, { classifyConnector: lens, witness: "web:p" }));
  const before = hl.foldHyperlexicon(log);
  assert.ok(before.length, "the fold has to hold something for a replay check to mean anything");

  // Replay every entry through the real `append` into a fresh log, the same
  // resumption property build-log.js and the skill log already hold.
  let replayed = hl.createHyperlexicon();
  for (const e of JSON.parse(JSON.stringify(log.entries))) replayed = taskLog.append(replayed, e);
  assert.deepEqual(hl.foldHyperlexicon(replayed), before);
});

test("THE SPECIMEN, whole: the door does not rescue a reading that never had the answer", () => {
  // The honest measurement this module was built from, pinned so it cannot be
  // quietly claimed as fixed. Admission removes three junk notes from the
  // model's context — real, and worth having. It does NOT put a prime
  // minister in the fold, because the extractor never found one: the
  // sentence naming ten of them yielded no edge at all. A cleaner reading of
  // a reading that missed the answer is still a reading that missed it.
  let log = hl.createHyperlexicon();
  ({ log } = hl.admit(log, LIVE_EDGES, { classifyConnector: lens, witness: "web:p" }));
  const fold = hl.foldHyperlexicon(log);
  assert.equal(fold.length, 7, "seven assertions survive the door");

  // What the material plainly SAYS, in a raw span the model was handed:
  // "The Ten Victorian Prime Ministers Under Queen Victoria Robert Peel
  // (1834-1835; 1841-1846)". What the fold carries about it: nothing with a
  // term in it. Not one admitted assertion states when anybody held the
  // office, which is what the question was actually asking.
  const dated = fold.filter((f) => /\b1[678]\d\d\b/.test(`${f.subject} ${f.verb} ${f.object}`));
  assert.deepEqual(
    dated.map((f) => f.subject),
    ["young Victoria"],
    "the only dated assertion is Victoria's own accession — no holder of the office has a term anywhere in the fold",
  );

  // And the one edge that mentions the office at all is about REPUTATION,
  // not office-holding: "Robert Peel is considered one of the most important
  // Prime Ministers in British history" says nothing about serving Victoria.
  // Nine of the ten prime ministers the material names never become a
  // subject at all.
  const subjects = fold.map((f) => f.subject.toLowerCase()).join(" | ");
  for (const pm of ["gladstone", "disraeli", "russell", "palmerston", "salisbury", "derby", "aberdeen", "rosebery"]) {
    assert.ok(!subjects.includes(pm), `${pm} is named in the material and absent from the fold`);
  }

  // THE DISCLOSED RESIDUE, pinned so it is never mistaken for solved. The
  // door catches connectors; it cannot catch an assertion whose connector is
  // a perfectly good verb and whose SUBJECT is page furniture. All three of
  // these survive, and all three are noise:
  const surviving = fold.map((f) => `${f.subject} ${f.verb} ${f.object}`);
  assert.ok(surviving.some((t) => /^complete list is given above/.test(t)), "an anaphor to the page itself gets through");
  assert.ok(surviving.some((t) => /^the Victorian era's/.test(t)), "a possessive gets through, because the treebank has never seen it");
  assert.ok(surviving.some((t) => /^with Peel went well/.test(t)), "a prepositional-phrase subject gets through");
});
