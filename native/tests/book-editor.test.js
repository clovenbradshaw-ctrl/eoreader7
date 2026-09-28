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
  // held to the turn's own checks before any trial: refused, with its reasons, never kept
  const refused = logs.filter((l) => l.kind === "edit_refused" && l.finding === "missing_transition");
  assert.ok(refused.length > 0 && refused.every((r) => String(r.why).includes("takes nothing up")), JSON.stringify(refused.slice(0, 2)));
  assert.ok(!logs.some((l) => l.kind === "edit_kept" && l.license === "bridge"));
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

test("Gornick, taught model-free: a part that says what came just before reads flat against shuffled orders", async () => {
  const { gornickCurve } = await import("../organs/book-editor.js");
  const fresh = ["The storm broke over the island at dusk and the ferry turned back.", "Ana climbed the tower with a lamp and a coil of rope over her shoulder.", "At dawn the gulls came back and the sea lay flat and grey below the cliffs.", "Tom rowed out past the reef where the wreck had settled in the sand.", "A letter came on the noon boat, sealed in green wax, addressed to no one."];
  const parts = [...fresh.map((text) => ({ text })), { text: fresh[3] + " " + fresh[3] }];
  const c = gornickCurve(parts, { draws: 30 });
  assert.ok(c.flat.includes(5), `the restating part was not flat: ${JSON.stringify(c.means.map((m) => m.toFixed(2)))}`);
  assert.ok(!c.flat.includes(1) && !c.flat.includes(2), "a fresh part read flat");
  assert.ok(typeof c.shape === "string" && c.meanBits > 0);
});

test("the pathos pass: a flat part is written again, the mouth proposes and the archons choose; nothing worse is ever kept", async () => {
  const fresh = [
    "The storm broke over the island at dusk. The ferry turned back toward the mainland. Ana watched it go from the rocks.",
    "Ana climbed the tower with a lamp and a coil of rope. The wind shook the glass. She lit the wick with cold hands.",
    "At dawn the gulls came back to the ledge. The sea lay flat and grey below the cliffs. Nobody spoke at breakfast.",
    "Tom rowed out past the reef at noon. The wreck had settled in the sand. He counted the ribs of the hull twice.",
  ];
  const restating = "Ana climbed the tower with a lamp and a coil of rope. The wind shook the glass. She lit the wick with cold hands. Ana climbed the tower with a lamp and a coil of rope. The wind shook the glass.";
  const run = async (candidatesSay) => {
    const bodies = [fresh[0], fresh[1], restating, fresh[3]];
    let b = 0, c = 0;
    const ask = async (p, { stage }) => (stage.startsWith("body:") ? bodies[b++] : stage.startsWith("pathos:") ? candidatesSay[c++ % candidatesSay.length] : "");
    const N = makeNotes();
    let notes = N.createNotes({ frame: { universe: "stipulated" } });
    const h = (end1, label, end2, witness = "request") => { notes = N.hear(notes, { end1, label, end2, witness, because: "outline" }); };
    h("story#1", "exists", "story"); h("character#2", "exists", "character"); h("story#1", "has", "character#2"); h("character#2", "position", "1"); h("character#2", "named", "Ana", "talk:m#1");
    h("chapter#3", "exists", "chapter"); h("story#1", "has", "chapter#3"); h("chapter#3", "position", "2"); h("chapter#3", "says", "A storm comes to the island.", "talk:m#2");
    ["The ferry turns back.", "Ana lights the lamp.", "The morning after the storm.", "Tom finds the wreck."].forEach((line, k) => { const id = `scene#${4 + k}`; h(id, "exists", "scene"); h("chapter#3", "has", id); h(id, "position", String(k + 1)); h(id, "says", line, "talk:m#3"); });
    const lf = makeLongForm({ ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: [] });
    const w = await lf.writeBodies({ notes, store: makeTextStore() });
    const ed = makeBookEditor({ lf, ask, medium: PROSE_MEDIUM, mouth: "m", castDetails: [] });
    const out = await ed.pathosPass({ notes: w.notes, store: w.store, task: "a story" });
    return { lf, out };
  };
  // one candidate restates again, one is fresh: the fresh one is chosen
  const good = await run([restating, "The morning after the storm was bright and strange. A seal slept on the landing stage. Ana brought it a fish and it did not move."]);
  assert.ok(good.out.targets >= 1, "the restating part was not read flat");
  const row = good.out.rows.find((r) => r.part === "scene#6");
  assert.ok(row?.kept, JSON.stringify(good.out.rows));
  const book = good.lf.seal({ notes: good.out.notes, store: good.out.store, request: "t" });
  assert.ok(book.artifact.includes("A seal slept on the landing stage."), "the chosen body is not in the book");
  assert.ok(!book.artifact.includes("Ana climbed the tower with a lamp and a coil of rope. The wind shook the glass.\nAna climbed"), "the old flat body stayed");
  assert.equal(book.provenance.ok, true); assert.equal(book.helix.ok, true, JSON.stringify(book.helix.violations.slice(0, 2)));
  const body = good.lf.N.fold(book.notes).find((n) => n.end1 === "scene#6" && n.label === "body");
  assert.ok(body.witnesses.some((x) => x.includes("#pathos")));
  // control: every candidate restates — nothing is kept, the book is unchanged
  const bad = await run([restating]);
  assert.ok(bad.out.rows.every((r) => !r.kept), JSON.stringify(bad.out.rows));
});

test("more archons: Sockeye repairs an unbound opening pronoun, Sacks and Strunk & White license their revisions", async () => {
  const replies = [
    "Ana finds a boat on the rocks. The gulls cried above the reef. The tide went out slowly all afternoon.",
    "She is able to use her strengths and abilities to make the best of her life. The boat was heavy and old. At the end of the day the paint was still wet on the hull.",
    "The wind came up at night over the island. She is able to use her strengths and abilities to make the best of her life. The lamp burned low.",
  ];
  let k = 0;
  const ask = async (p, { stage }) => (stage.startsWith("body:") ? replies[k++] : "");
  const N = makeNotes();
  let notes = N.createNotes({ frame: { universe: "stipulated" } });
  const h = (end1, label, end2, witness = "request") => { notes = N.hear(notes, { end1, label, end2, witness, because: "outline" }); };
  h("story#1", "exists", "story"); h("character#2", "exists", "character"); h("story#1", "has", "character#2"); h("character#2", "position", "1"); h("character#2", "named", "Ana", "talk:m#1");
  h("chapter#3", "exists", "chapter"); h("story#1", "has", "chapter#3"); h("chapter#3", "position", "2"); h("chapter#3", "says", "A boat on the rocks.", "talk:m#2");
  ["Ana finds a boat.", "Ana paints the boat.", "Ana keeps the lamp."].forEach((line, i) => { const id = `scene#${4 + i}`; h(id, "exists", "scene"); h("chapter#3", "has", id); h(id, "position", String(i + 1)); h(id, "says", line, "talk:m#3"); });
  const lf = makeLongForm({ ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: [] });
  const w = await lf.writeBodies({ notes, store: makeTextStore() });
  const ed = makeBookEditor({ lf, ask, medium: PROSE_MEDIUM, mouth: "m", castDetails: [] });
  const read = ed.readBook({ notes: w.notes, store: w.store, task: "a story" });
  const kinds = new Set(read.findings.map((f) => `${f.editor}: ${f.kind}`));
  assert.ok(kinds.has("Sockeye: stale_pronoun"), [...kinds].join(" | "));
  assert.ok(kinds.has("Oliver Sacks: repeated_template"), [...kinds].join(" | "));
  assert.ok(kinds.has("William Strunk Jr. & E. B. White: style_cliche"), [...kinds].join(" | "));
  const out = await ed.editBook({ notes: w.notes, store: w.store, task: "a story", budget: 0 });
  const book = lf.seal({ notes: out.notes, store: out.store, request: "t" });
  assert.ok(book.artifact.includes("\nAna is able to use her strengths"), "the unbound pronoun was not repaired to the name");
  assert.equal(book.helix.ok, true); assert.equal(book.provenance.ok, true);
});

test("a bridge that takes up the close and hands on to the opening reaches the judge", async () => {
  const good = await written({ bridge: "Ana left the boat on the sand and walked up to look at the hull in the grey morning." });
  const logs = [];
  const ed = makeBookEditor({ lf: good.lf, ask: good.ask, medium: PROSE_MEDIUM, mouth: "m", castDetails: ["job"], log: (x) => logs.push(x) });
  await ed.editBook({ notes: good.notes, store: good.store, task: "a story", budget: 5 });
  const tried = logs.filter((l) => l.license === "bridge" && (l.kind === "edit_kept" || l.kind === "edit_undone"));
  assert.ok(tried.length > 0, JSON.stringify(logs.filter((l) => l.finding === "missing_transition").slice(0, 2)));
});
