// organs/long-form.js (Dickens) with a scripted mouth: the bodies stage over a
// fixed outline, its working notes, the book's provenance, and revisions — a
// rename with no asks, a changed detail re-asked line by line — with the
// controls that must fail: truth maintenance off leaves stale words, a mouth
// that never says enough leaves declared voids, the checker counts planted
// strays. No regex.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, sentences, tokenize, analyse } from "../adapters/text/english-parser.js";
import { makeNotes } from "../kernel/notes.js";
import { makeLongForm, makeTextStore, outlineOf, replaceWord, wordAt, linesOfBody, bodyOfReply } from "../organs/long-form.js";
import { PROSE_MEDIUM } from "../adapters/build/prose-medium.js";
import { scoreBook } from "../eval/long-form/score.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const parser = loadModel(JSON.parse(fs.readFileSync(path.join(HERE, "..", "priors", "parser-eng-ewt.json"), "utf8")));
void parser; void tokenize; void analyse;

// an outline on the record, as talk-build leaves it: a story, two people with
// an age and a job, two chapters of two scenes, each with its line
function outlineNotes() {
  const N = makeNotes();
  let notes = N.createNotes({});
  const h = (end1, label, end2, witness = "request") => { notes = N.hear(notes, { end1, label, end2, witness, because: "outline" }); };
  h("story#1", "exists", "story"); h("story#1", "named", "The Keeper's Light", "talk:m#ask1");
  const people = [["character#2", "Ana", "17", "sailor"], ["character#3", "Tom", "40", "fisherman"]];
  let pos = 0;
  for (const [id, name, age, job] of people) { h(id, "exists", "character"); h("story#1", "has", id); h(id, "position", String(++pos)); h(id, "named", name, "talk:m#ask2"); h(id, "age", age, "talk:m#ask3"); h(id, "job", job, "talk:m#ask3"); }
  const lines = [["Ana finds a boat on the rocks.", ["Ana pulls the boat onto the sand.", "Tom comes down to the shore."]], ["A storm comes in the night.", ["The light fails in the storm.", "Ana climbs the tower."]]];
  let scene = 10;
  lines.forEach(([cl, scenes], c) => {
    const ch = `chapter#${4 + c}`;
    h(ch, "exists", "chapter"); h("story#1", "has", ch); h(ch, "position", String(++pos)); h(ch, "says", cl, "talk:m#ask4");
    scenes.forEach((sl, k) => { const sc = `scene#${scene++}`; h(sc, "exists", "scene"); h(ch, "has", sc); h(sc, "position", String(k + 1)); h(sc, "says", sl, "talk:m#ask5"); });
  });
  return notes;
}

// the mouth: each scene's words name who the scene line names, and say their job
const BODIES = [
  "Ana ran down to the water. She was a sailor and knew boats. The boat was old but whole.\n\nShe pulled it up the sand.",
  "Tom came down the path. Tom was a fisherman, and Tom's nets hung over his arm. He looked at the boat for a long time.",
  "The storm broke the lamp glass. Mr. Hale said the light would fail. It failed before midnight.",
  "Ana climbed the stairs in the dark. The wind shook the tower. Tomorrow the bananas would come on the ferry, and so would Ana's letter.",
];
function scriptedMouth() {
  const prompts = [];
  let body = 0;
  const ask = async (prompt, { stage }) => {
    prompts.push({ stage, prompt });
    if (stage.startsWith("body:")) return BODIES[body++] ?? "";
    if (stage.startsWith("revise:")) return "Tom was a ferryman, and he knew the crossing well. More words after.";
    return "";
  };
  return { ask, prompts };
}

test("bodies are written in order, each from a bounded working note; every line of the book is accounted for", async () => {
  const mouth = scriptedMouth();
  const lf = makeLongForm({ ask: mouth.ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["age", "job"] });
  const w = await lf.writeBodies({ notes: outlineNotes(), store: makeTextStore(), topic: "about a lighthouse keeper's daughter" });
  assert.equal(w.asks, 4);
  assert.deepEqual(mouth.prompts.map((p) => p.stage), ["body:scene#10", "body:scene#11", "body:scene#12", "body:scene#13"]);
  // the note carries the facts of the people its lines name, as sentences, and nothing about anyone else
  const first = mouth.prompts[0].prompt;
  assert.ok(first.includes("Ana's job is sailor.") && first.includes("Ana's age is 17."), first);
  assert.ok(!first.includes("Tom's job"), "a person not named in the part's lines was carried");
  assert.ok(mouth.prompts[1].prompt.includes("Tom's job is fisherman."));
  // the anchor is the last sentences of the part before
  assert.ok(mouth.prompts[1].prompt.endsWith("The boat was old but whole. She pulled it up the sand."), mouth.prompts[1].prompt);
  // no apparatus words reach the mouth
  for (const p of mouth.prompts) for (const word of ["ledger", "claim", "JSON", "premise", "note"]) assert.ok(!p.prompt.includes(word), `${word} in a prompt`);
  const s = lf.seal({ notes: w.notes, store: w.store, request: "test" });
  assert.equal(s.provenance.ok, true, JSON.stringify(s.provenance.uncovered.slice(0, 3)));
  assert.equal(s.helix.ok, true, JSON.stringify(s.helix.violations.slice(0, 3)));
  assert.ok(s.sealed, "not sealed");
  // the mouth's words are the book's words, byte for byte, one sentence a line
  assert.ok(s.artifact.includes("\nTom was a fisherman, and Tom's nets hung over his arm.\n"));
  assert.ok(s.artifact.includes("\nMr. Hale said the light would fail.\n"), "a title split the sentence");
  assert.ok(s.artifact.includes("## Chapter 1") && s.artifact.includes("## Chapter 2"), "chapters are numbered by their own kind, not among the people");
});

test("a rename edits the words mechanically: no asks, whole words only, untouched lines keep their bytes and their claims", async () => {
  const lf = makeLongForm({ ask: scriptedMouth().ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["age", "job"] });
  const w = await lf.writeBodies({ notes: outlineNotes(), store: makeTextStore() });
  const before = lf.seal({ notes: w.notes, store: w.store, request: "t" });
  const r = lf.rename({ notes: before.notes, store: w.store, who: "Tom", to: "Sam" });
  assert.equal(r.asks, 0);
  const after = lf.seal({ notes: r.notes, store: r.store, request: "t" });
  assert.equal(wordAt(after.artifact, "Tom").length, 0, "the old name is still said");
  assert.ok(after.artifact.includes("Sam's nets") && after.artifact.includes("Tomorrow the bananas"), "a rename reached inside a word or missed a possessive");
  // every line that did not say the name is the same bytes, resting on the same claim
  const was = new Map(before.map.map((m) => [m.text, m.src.join()]));
  for (const m of after.map) if (!m.text.includes("Sam")) assert.equal(was.get(m.text), m.src.join(), `untouched line changed: ${m.text}`);
  // an edited line rests on the words it edited and the person's change
  const edited = after.map.find((m) => m.text.startsWith("Sam came down"));
  assert.ok(edited.src[0].includes("line 1"), JSON.stringify(edited));
  assert.equal(after.provenance.ok, true); assert.equal(after.helix.ok, true, JSON.stringify(after.helix.violations));
  assert.deepEqual(lf.stale(r.notes), []);
  assert.equal(replaceWord("Banana Ana", "Ana", "Eva"), "Banana Eva");
});

test("a changed detail re-asks only the lines that say the old value; with the revision off, the old words stay and the parts are stale", async () => {
  const mouth = scriptedMouth();
  const lf = makeLongForm({ ask: mouth.ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["age", "job"] });
  const w = await lf.writeBodies({ notes: outlineNotes(), store: makeTextStore() });
  const base = lf.seal({ notes: w.notes, store: w.store, request: "t" });
  // control: the change heard, the words left alone — the record says which parts are stale
  const off = await lf.changeDetail({ notes: base.notes, store: w.store, who: "Tom", label: "job", to: "ferryman", cycles: 0 });
  const offBook = lf.seal({ notes: off.notes, store: off.store, request: "t" }).artifact;
  assert.ok(offBook.includes("fisherman"), "the control lost the old word");
  assert.ok(lf.stale(off.notes).some((x) => x.part === "scene#11"), JSON.stringify(lf.stale(off.notes)));
  // on: one ask for the one line that says it, the new line in its place
  const lf2 = makeLongForm({ ask: mouth.ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["age", "job"] });
  const on = await lf2.changeDetail({ notes: base.notes, store: w.store, who: "Tom", label: "job", to: "ferryman" });
  assert.equal(on.asks, 1);
  const book = lf2.seal({ notes: on.notes, store: on.store, request: "t" });
  assert.ok(!book.artifact.includes("fisherman"));
  assert.ok(book.artifact.includes("\nTom was a ferryman, and he knew the crossing well.\n"), "only the first sentence of the reply is the line");
  assert.deepEqual(lf2.stale(on.notes), []);
  assert.equal(book.provenance.ok, true); assert.equal(book.helix.ok, true);
  // the revision prompt carries the new fact and the lines before, never the old sentence
  const rev = mouth.prompts.find((p) => p.stage.startsWith("revise:")).prompt;
  assert.ok(rev.includes("Tom's job is ferryman.") && rev.endsWith("Tom came down the path.") && !rev.includes("fisherman"), rev);
});

test("a mouth that never says a whole part leaves a declared void, and the book says so", async () => {
  const lf = makeLongForm({ ask: async () => "Too short.", sentences, medium: PROSE_MEDIUM, mouth: "m" });
  const w = await lf.writeBodies({ notes: outlineNotes(), store: makeTextStore() });
  assert.equal(w.voids.length, 4);
  assert.equal(w.asks, 12, "each part asked three times");
  const s = lf.seal({ notes: w.notes, store: w.store, request: "t" });
  assert.equal(s.verified.ok, false, "a book of voids passed its own check");
});

test("a reply is cut to whole sentences; headings and preambles are not the body", () => {
  const body = bodyOfReply("Chapter 2: The Storm\nHere is the scene:\nThe wind rose. The sea came up the sand. Ana ran to the", sentences);
  assert.equal(body, "The wind rose. The sea came up the sand.");
  assert.equal(linesOfBody(body, sentences).length, 2);
});

test("the checker counts planted strays and wrong jobs, and not the cast", () => {
  const cast = [{ name: "Ana", details: { age: "17", job: "sailor" } }, { name: "Tom", details: { age: "40", job: "fisherman" } }];
  const book = "# T\n\nAna met Quinn at the harbour.\nTom, the fisherman, waved to Zed.\nAna was a fisherman that year.\nAna was 17 years old.\nTom was 12 years old.\n";
  const r = scoreBook(book, cast, { castDetails: ["age", "job"] });
  assert.ok(r.strays.top.some((x) => x.startsWith("Quinn")) && r.strays.top.some((x) => x.startsWith("Zed")), JSON.stringify(r.strays));
  assert.ok(!r.strays.top.some((x) => x.startsWith("Ana") || x.startsWith("Tom")));
  assert.equal(r.callbacks.right, 2);   // Tom the fisherman; Ana 17
  assert.equal(r.callbacks.wrong, 2);   // Ana a fisherman; Tom 12
});

test("no regular expressions in the long-form organ, its medium or its checker", () => {
  for (const f of ["../organs/long-form.js", "../adapters/build/prose-medium.js", "../eval/long-form/score.mjs", "../eval/long-form/run.mjs"]) {
    const src = fs.readFileSync(path.join(HERE, f), "utf8");
    assert.ok(!src.includes("new RegExp") && !src.includes(".match(/") && !src.includes(".test(") && !src.includes(".replace(/"), f);
  }
});

test("a change said in plain words is read against the cast, or refused", async () => {
  const { readChange } = await import("../organs/long-form.js");
  const cast = [{ name: "Lily" }, { name: "Tommy" }, { name: "Lola" }];
  const opts = { cast, details: ["age", "job"], numericDetails: new Set(["age"]) };
  assert.deepEqual(readChange("Rename Lily to Wren.", opts), { kind: "rename", who: "Lily", to: "Wren" });
  assert.deepEqual(readChange("call Lily Wren", opts), { kind: "rename", who: "Lily", to: "Wren" });
  assert.deepEqual(readChange("Tommy's job is ferry pilot", opts), { kind: "detail", who: "Tommy", label: "job", to: "ferry pilot" });
  assert.deepEqual(readChange("Tommy is a ferry pilot now.", opts), { kind: "detail", who: "Tommy", label: "job", to: "ferry pilot" });
  assert.deepEqual(readChange("Lola is 49", opts), { kind: "detail", who: "Lola", label: "age", to: "49" });
  assert.ok(readChange("Make it sadder", opts).refused);
  assert.ok(readChange("Tommy is tired", opts).refused, "a state was read as a detail");
});

test("a changed detail reaches the value however it is capitalised in the prose", async () => {
  const replies = ["Ana finds a boat. Ana drags the boat onto the sand. Tom came down to see it.", "Tom looked at it. Tom, the Fisherman, said nothing. The light was on."];
  let k = 0;
  const ask = async (p, { stage }) => (stage.startsWith("body:") ? replies[k++] ?? "" : stage.startsWith("revise:") ? "Tom, the ferryman, said nothing." : "");
  const lf = makeLongForm({ ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["age", "job"] });
  const notes0 = outlineNotes();
  const w = await lf.writeBodies({ notes: notes0, store: makeTextStore() });
  const out = await lf.changeDetail({ notes: w.notes, store: w.store, who: "Tom", label: "job", to: "ferryman" });
  assert.equal(out.edits, 1);
  assert.ok(!lf.seal({ notes: out.notes, store: out.store, request: "t" }).artifact.toLowerCase().includes("fisherman"));
});
