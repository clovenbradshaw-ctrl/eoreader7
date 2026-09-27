// organs/book-editor.js (Perkins): the pathos archons read a long work against
// its stipulated universe's own record (EVA), and each licensed revision is
// tried alone and kept only when its window reads better (REC). Scripted
// mouth; controls: a bridge that takes nothing up is undone, a budget of zero
// asks nothing, a fold never empties a part. No regex.
import test from "node:test";
import assert from "node:assert/strict";
import { sentences } from "../adapters/text/english-parser.js";
import { makeNotes } from "../kernel/notes.js";
import { makeLongForm, makeTextStore, MIN_BODY_SENTENCES } from "../organs/long-form.js";
import { makeBookEditor } from "../organs/book-editor.js";
import { universeOf } from "../organs/universe.js";
import { helixCheck, actOf } from "../organs/claim-acts.js";
import { PROSE_MEDIUM } from "../adapters/build/prose-medium.js";

function outlineNotes() {
  const N = makeNotes();
  let notes = N.createNotes({ frame: { universe: universeOf({ medium: PROSE_MEDIUM }).kind } });
  const h = (end1, label, end2, witness = "request") => { notes = N.hear(notes, { end1, label, end2, witness, because: "outline" }); };
  h("story#1", "exists", "story"); h("story#1", "named", "The Keeper's Light", "talk:m#ask1");
  h("character#2", "exists", "character"); h("story#1", "has", "character#2"); h("character#2", "position", "1"); h("character#2", "named", "Ana", "talk:m#ask2"); h("character#2", "job", "sailor", "talk:m#ask3");
  h("chapter#3", "exists", "chapter"); h("story#1", "has", "chapter#3"); h("chapter#3", "position", "2"); h("chapter#3", "says", "Ana finds a boat on the rocks.", "talk:m#ask4");
  [["scene#4", "Ana drags the boat onto the sand."], ["scene#5", "Ana paints the boat red."]].forEach(([id, line], k) => { h(id, "exists", "scene"); h("chapter#3", "has", id); h(id, "position", String(k + 1)); h(id, "says", line, "talk:m#ask5"); });
  return notes;
}
const BODIES = [
  // scene 4: carries its line and its chapter's; one line of pure filler; one restating
  "Ana finds a boat on the rocks below the lighthouse. Ana drags the boat onto the sand. She is able to use her strengths and abilities to make the best of her life. The tide was out. Ana drags the boat onto the sand again, onto the sand.",
  // scene 5: never says its own line (paint, red): the floor is due
  "The morning was grey and cold. Gulls cried over the water. Ana looked at the hull for a long time. Her hands were cold.",
];

async function written(mouthReplies = {}) {
  let body = 0;
  const prompts = [];
  const ask = async (prompt, { stage }) => {
    prompts.push({ stage, prompt });
    if (stage.startsWith("body:")) return BODIES[body++];
    if (stage.startsWith("bridge:")) return mouthReplies.bridge ?? "Nothing at all.";
    if (stage.startsWith("rewrite:")) return mouthReplies.rewrite ?? "";
    return "";
  };
  const lf = makeLongForm({ ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["job"] });
  const w = await lf.writeBodies({ notes: outlineNotes(), store: makeTextStore() });
  return { lf, ask, prompts, ...w };
}

test("the archons read the book against the story's own record, and what they license is done line by line", async () => {
  const { lf, ask, notes, store } = await written();
  const ed = makeBookEditor({ lf, ask, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["job"] });
  const before = ed.readBook({ notes, store, task: "a story" });
  const kinds = new Set(before.findings.map((f) => f.kind));
  assert.ok(kinds.has("unverified"), [...kinds].join(", "));
  assert.ok(kinds.has("statement_dropped"), [...kinds].join(", "));
  const out = await ed.editBook({ notes, store, task: "a story", budget: 0 });
  assert.equal(out.asks, 0, "a budget of nothing asked something");
  const book = lf.seal({ notes: out.notes, store: out.store, request: "a story" });
  // in a stipulated universe the telling is the source: a line the thin
  // record does not mention is reported, never folded (LICENSES_BY_UNIVERSE)
  assert.ok(book.artifact.includes("strengths and abilities"), "a told world's own line was folded as unverified");
  assert.ok(ed.readBook({ notes: out.notes, store: out.store, task: "a story" }).findings.some((f) => f.kind === "unverified" && f.licenses === null && f.licenseBy === "universe:stipulated"));
  // the same book read as a world (sources known) folds it
  const world = makeBookEditor({ lf, ask, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["job"], universe: "world" });
  const w2 = await world.editBook({ notes, store, task: "a story", budget: 0 });
  assert.ok(!lf.seal({ notes: w2.notes, store: w2.store, request: "a story" }).artifact.includes("strengths and abilities"), "a world's unverified line stayed");
  assert.ok(book.artifact.includes("Ana paints the boat red."), "the part's own line was not floored");
  assert.ok(book.artifact.includes("Ana drags the boat onto the sand.\n"), "a line the part stands on was cut");
  // every kept edit is a REC resting on the line it changed and the finding that licensed it
  const fold = lf.N.fold(book.notes);
  const findings = fold.filter((n) => n.label === "finding");
  assert.ok(findings.length && findings.every((n) => n.witnesses.every((w) => w.startsWith("archon:")) && actOf(n).op === "EVA"));
  const edits = fold.filter((n) => n.label.startsWith("line ") || n.label.startsWith("after "));
  assert.ok(edits.length && edits.every((n) => actOf(n).op === "REC"));
  const h = helixCheck({ fold, entries: book.notes.entries });
  assert.equal(h.ok, true, JSON.stringify(h.violations.slice(0, 3)));
  assert.equal(book.provenance.ok, true);
  assert.ok(book.sealed);
  // no part below a part's worth of sentences
  for (const id of ["scene#4", "scene#5"]) assert.ok(lf.currentLines(out.notes, out.store, id).lines.length >= MIN_BODY_SENTENCES, id);
});

test("an asked revision is kept only when its window reads better: a bridge that takes nothing up is undone", async () => {
  const bad = await written({ bridge: "Meanwhile, far away, a train left the city." });
  const logs = [];
  const ed = makeBookEditor({ lf: bad.lf, ask: bad.ask, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["job"], log: (x) => logs.push(x) });
  const out = await ed.editBook({ notes: bad.notes, store: bad.store, task: "a story", budget: 5 });
  const bridges = logs.filter((l) => l.license === "bridge");
  assert.ok(bridges.length > 0, "no bridge was tried");
  assert.ok(bridges.every((b) => b.kind === "edit_undone"), JSON.stringify(bridges));
  assert.ok(!bad.lf.seal({ notes: out.notes, store: out.store, request: "t" }).artifact.includes("a train left the city"));
});

test("the universe decides the ground: a story with no source is stipulated; a page is the world", () => {
  assert.equal(universeOf({ medium: PROSE_MEDIUM }).kind, "stipulated");
  assert.equal(universeOf({ medium: PROSE_MEDIUM }).ground, "record");
  assert.equal(universeOf({ medium: PROSE_MEDIUM }).lookups, false);
  assert.equal(universeOf({ medium: { kind: "page" }, sources: [{ url: "x" }] }).kind, "world");
  assert.equal(universeOf({ medium: PROSE_MEDIUM, sources: [{ url: "x" }], stipulations: [{ truth: "false" }] }).kind, "counterfactual");
  assert.equal(universeOf({ medium: PROSE_MEDIUM, sources: [{ url: "x" }], stipulations: [{ truth: "open" }] }).kind, "hypothetical");
  assert.equal(universeOf({ medium: { kind: "music" } }).knowing, "snip");
});

test("Tolkien: a line that states a person's age against the record is repaired from the record, every other byte kept", async () => {
  const N = makeNotes();
  let notes = outlineNotes();
  notes = N.hear(notes, { end1: "character#2", label: "age", end2: "17", witness: "talk:m#ask3", because: "outline" });
  const replies = ["Ana finds a boat on the rocks. Ana drags the boat onto the sand. Ana, a 25-year-old sailor, knew the tide. The tide was out.", "Ana paints the boat red. The paint was cold. Gulls cried. Her hands were cold."];
  let k = 0;
  const ask = async (p, { stage }) => (stage.startsWith("body:") ? replies[k++] : "");
  const lf = makeLongForm({ ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["age", "job"] });
  const w = await lf.writeBodies({ notes, store: makeTextStore() });
  const ed = makeBookEditor({ lf, ask, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["age", "job"] });
  const read = ed.readBook({ notes: w.notes, store: w.store, task: "a story" });
  assert.ok(read.findings.some((f) => f.kind === "contradicts_record"), JSON.stringify(read.findings.map((f) => f.kind)));
  const out = await ed.editBook({ notes: w.notes, store: w.store, task: "a story", budget: 0 });
  const book = lf.seal({ notes: out.notes, store: out.store, request: "t" }).artifact;
  assert.ok(book.includes("Ana, a 17-year-old sailor, knew the tide."), book);
  assert.ok(!book.includes("25-year-old"));
});

test("a line set in must be a whole sentence: fragments a splice leaves are refused", async () => {
  const { wholeSentence } = await import("../organs/book-editor.js");
  assert.equal(wholeSentence("Of her comfort zone."), false);
  assert.equal(wholeSentence("She will need to be passionate about her work and."), false);
  assert.equal(wholeSentence("That she will always be driven by her desire."), false);
  assert.equal(wholeSentence("She will need to be passionate about her work"), false);
  assert.equal(wholeSentence("Ana pulls the boat onto the sand."), true);
});
