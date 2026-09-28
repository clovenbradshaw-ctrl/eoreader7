// tests/narrative-arc.test.js — the nested arcs and the being the telling
// follows (organs/narrative-arc.js): the helix walked out from the void and
// back to it, each part asked for with its role, and "where is the being
// now?" answered from the text.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, sentences, tokenize, analyse } from "../adapters/text/english-parser.js";
import { makeNotes } from "../kernel/notes.js";
import { makeTalkBuild } from "../organs/talk-build.js";
import { makeLongForm, makeTextStore } from "../organs/long-form.js";
import { makeBookEditor } from "../organs/book-editor.js";
import { PROSE_MEDIUM } from "../adapters/build/prose-medium.js";
import { actOf, helixCheck } from "../organs/claim-acts.js";
import { BOOK_ARC, CHAPTER_ARC, roleAt, arcChecks, trajectory, whereIs, says } from "../organs/narrative-arc.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const model = loadModel(JSON.parse(fs.readFileSync(path.join(HERE, "..", "priors", "parser-eng-ewt.json"), "utf8")));
const parse = (text) => analyse(model, tokenize(text).map((t) => t.form));

test("the book's arc is the helix walked out from the void and back to it", () => {
  const ten = [...Array(10).keys()].map((k) => roleAt(BOOK_ARC, k, 10));
  assert.deepEqual(ten.map((r) => r.op), ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC", "NUL"]);
  for (const n of [2, 3, 6, 21]) {
    const roles = [...Array(n).keys()].map((k) => roleAt(BOOK_ARC, k, n));
    assert.equal(roles[0].role, "the void"); assert.equal(roles.at(-1).role, "the arrival");
    const at = roles.map((r) => BOOK_ARC.indexOf(r));
    assert.ok(at.every((x, i) => i === 0 || x >= at[i - 1]), `${n} parts walk the arc out of order: ${at}`);
  }
  assert.deepEqual([0, 1, 2, 3].map((k) => roleAt(CHAPTER_ARC, k, 4).role), ["the opening", "the turn", "the turn", "the landing"]);
});

// a book as the trajectory reads it: parts in chapters, lines with addresses
const part = (id, chapter, ...texts) => ({ id, chapter, lines: texts.map((text, i) => ({ text, addr: `line ${i + 1}` })) });
const FRAME = { p: "Ana", home: "the lighthouse on Gull Rock", lack: "her mother", becomes: "the keeper of the light" };

test("where is the being? read from the text, with the line that placed them", () => {
  const parts = [
    part("p1", 0, "Ana wakes in the lighthouse on Gull Rock.", "She has not seen her mother in years."),
    part("p2", 0, "A letter comes from the mainland.", "Ana reads it twice."),
    part("p3", 1, "Ana rows across the strait in the dark.", "The city is loud and strange."),
    part("p4", 1, "The rain does not stop."),
    part("p5", 2, "Ana finds her mother's grave.", "She is the keeper of the light now, and she knows it."),
    part("p6", 2, "Ana climbs the lighthouse on Gull Rock again.", "The lamp turns over the water."),
  ];
  const path = trajectory({ parts, frame: FRAME });
  assert.deepEqual(path.map((x) => x.at), ["home", "away", "away", null, "away", "home"]);
  const at4 = whereIs({ path, frame: FRAME, k: 3 });
  assert.equal(at4.at, "away");
  assert.equal(at4.line.text, "Ana rows across the strait in the dark.", "the answer does not cite the line that placed her");
  assert.ok(at4.answer.includes("last seen in part 3") && at4.answer.includes("has not come back") && at4.answer.includes("not yet the keeper"), at4.answer);
  const atEnd = whereIs({ path, frame: FRAME, k: 5 });
  assert.equal(atEnd.at, "home"); assert.equal(atEnd.back, 5); assert.equal(atEnd.changed, 4);
  assert.equal(atEnd.role, "the arrival");
  // Gebser and the being are satisfied: out, back, changed, the lack said at the start
  assert.deepEqual(arcChecks({ parts, frame: FRAME }).findings.map((f) => f.kind), []);
});

test("Gebser and the being find the arc unwalked: no arrival, the void unanswered, the being unchanged or lost", () => {
  const parts = [
    part("p1", 0, "Ana wakes early.", "The sea is grey."),
    part("p2", 1, "Ana rows across the strait."),
    part("p3", 1, "The city is loud."), part("p4", 1, "Rain."), part("p5", 1, "More rain."), part("p6", 1, "A dog barks."), part("p7", 1, "Night."),
    part("p8", 2, "Ana sleeps in a room above a bakery."),
  ];
  const { findings } = arcChecks({ parts, frame: FRAME });
  const kinds = findings.map((f) => f.kind);
  for (const k of ["no_arrival", "void_unanswered", "lack_unsaid", "unchanged_return", "being_lost"]) assert.ok(kinds.includes(k), `${k} not found: ${kinds}`);
  // each licensed finding names the part to write again, its role, and what it must say
  const arrival = findings.find((f) => f.kind === "no_arrival");
  assert.equal(arrival.part, "p8"); assert.equal(arrival.role.role, "the arrival"); assert.equal(arrival.licenses, "regenerate"); assert.equal(arrival.wants, FRAME.home);
  assert.equal(findings.find((f) => f.kind === "lack_unsaid").part, "p1");
  assert.equal(findings.find((f) => f.kind === "being_lost").licenses, null, "a lost being is reported, not a license");
  assert.ok(says("She misses her mom and her mother's voice", "her mother"));
  assert.ok(!says("The sea is grey.", "her mother"));
});

// the mouth for a whole story: people, bonds, the being's frame, then lines
function storyMouth() {
  const prompts = [];
  const ask = async (prompt, { stage }) => {
    prompts.push({ stage, prompt });
    if (stage.startsWith("count:character")) return "Ana\nTom";
    if (stage.startsWith("relation:")) return "father.";
    if (stage === "being:home") return "the lighthouse on Gull Rock.";
    if (stage === "being:lacks") return "her mother, who left when she was small.";
    if (stage === "being:becomes") return "the keeper of the light.";
    if (stage.startsWith("count:chapter")) return `Ana does chapter thing ${prompts.filter((p) => p.stage.startsWith("count:chapter")).length}.`;
    if (stage.startsWith("count:scene")) return `Scene line ${prompts.filter((p) => p.stage.startsWith("count:scene")).length} with Ana.`;
    if (stage === "opening") return "The Keeper's Light.";
    return "";
  };
  return { ask, prompts };
}

test("the being is asked for after the bonds and before any line; every part is asked with its role in the nested arcs", async () => {
  const m = storyMouth();
  const out = await makeTalkBuild({ ask: m.ask, parse, sentences, medium: PROSE_MEDIUM, mouth: "m" }).build({ what: "a story with 2 characters in 3 chapters of 2 scenes each" });
  const stages = m.prompts.map((p) => p.stage);
  const at = (s) => stages.findIndex((x) => x.startsWith(s));
  assert.ok(at("relation:") < at("being:home") && at("being:home") < at("being:lacks") && at("being:lacks") < at("being:becomes") && at("being:becomes") < at("count:chapter"), stages.join(" "));
  const fold = makeNotes().fold(out.notes);
  const ana = fold.find((n) => n.label === "named" && n.end2 === "Ana").end1;
  const val = (label) => fold.find((n) => n.end1 === ana && n.label === label)?.end2;
  assert.equal(val("home"), "the lighthouse on Gull Rock"); assert.equal(val("lacks"), "her mother"); assert.equal(val("becomes"), "the keeper of the light");
  assert.equal(actOf(fold.find((n) => n.end1 === ana && n.label === "lacks")).op, "NUL", "what is missing is the void");
  assert.equal(actOf(fold.find((n) => n.end1 === ana && n.label === "becomes")).op, "REC", "what the being becomes is the change");
  // chapters one at a time, each with the book's role as the engine's fact
  const chapterAsks = m.prompts.filter((p) => p.stage.startsWith("count:chapter"));
  assert.equal(chapterAsks.length, 3);
  assert.ok(chapterAsks[0].prompt.includes("In chapter 1, Ana is at the lighthouse on Gull Rock, missing her mother."), chapterAsks[0].prompt);
  assert.ok(chapterAsks[2].prompt.includes("In chapter 3, Ana comes home to the lighthouse on Gull Rock, no longer missing her mother, the keeper of the light now."), chapterAsks[2].prompt);
  // scenes carry their chapter's role and their own place in the chapter's arc
  const sceneAsk = m.prompts.find((p) => p.stage.startsWith("count:scene") && p.prompt.includes("In scene 2 of chapter 3"));
  assert.ok(sceneAsk && sceneAsk.prompt.includes("the chapter ends somewhere new for Ana") && sceneAsk.prompt.includes("In chapter 3, Ana comes home"), sceneAsk?.prompt);
  for (const p of m.prompts) for (const word of ["ledger", "claim", "JSON", "premise", "note", "role", "arc"]) assert.ok(!p.prompt.split(" ").includes(word), `${word} in a prompt: ${p.prompt}`);
  assert.equal(helixCheck({ fold, entries: out.notes.entries }).ok, true);
  return { out };
});

test("each scene's working note carries its roles; the role is on the record, derived, standing on the being", async () => {
  const m = storyMouth();
  const out = await makeTalkBuild({ ask: m.ask, parse, sentences, medium: PROSE_MEDIUM, mouth: "m" }).build({ what: "a story with 2 characters in 3 chapters of 2 scenes each" });
  const bodies = [];
  const lf = makeLongForm({ ask: async (prompt, { stage }) => { bodies.push({ stage, prompt }); return "Ana walks to the water. The light turns. She waits for a long time."; }, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: [] });
  const w = await lf.writeBodies({ notes: out.notes, store: makeTextStore() });
  assert.equal(bodies.length, 6);
  assert.ok(bodies[0].prompt.includes("In chapter 1, Ana is at the lighthouse on Gull Rock, missing her mother.") && bodies[0].prompt.includes("In scene 1 of chapter 1, the chapter opens on what Ana does not yet have."), bodies[0].prompt);
  assert.ok(bodies[5].prompt.includes("In chapter 3, Ana comes home"), bodies[5].prompt);
  const fold = makeNotes().fold(w.notes);
  const roles = fold.filter((n) => n.label === "role");
  assert.equal(roles.length, 6);
  assert.equal(actOf(roles[0]).op, "SEG", "a place in the arc is a boundary drawn at the pattern's grain");
  assert.deepEqual(roles.map((n) => n.end2).sort(), ["the arrival / the landing", "the arrival / the opening", "the gathering / the landing", "the gathering / the opening", "the void / the landing", "the void / the opening"]);
  const s = lf.seal({ notes: w.notes, store: w.store, request: "test" });
  assert.equal(s.helix.ok, true, JSON.stringify(s.helix.violations.slice(0, 3)));
  assert.equal(s.provenance.ok, true);
  // changing what the being becomes leaves the roles standing on it stale: they are withdrawn
  const N = makeNotes();
  const ana = fold.find((n) => n.label === "named" && n.end2 === "Ana").end1;
  const old = fold.find((n) => n.end1 === ana && n.label === "becomes");
  let notes = N.concede(w.notes, old.id, { trigger: "the person changed it" }).log;
  notes = lf.settleDerived(notes);
  assert.equal(N.fold(notes).filter((n) => n.label === "role").length, 0, "a role outlived the frame it stood on");
});

test("a part left off the arc is written again with its role in hand, and kept only if it walks it", async () => {
  const m = storyMouth();
  const out = await makeTalkBuild({ ask: m.ask, parse, sentences, medium: PROSE_MEDIUM, mouth: "m" }).build({ what: "a story with 2 characters in 3 chapters of 2 scenes each" });
  const bodies = ["Ana wakes in the lighthouse on Gull Rock. Her mother is gone. The sea is grey.", "Ana finds a letter. It is from the mainland. She reads it."];
  for (let i = 0; i < 3; i++) bodies.push(`Ana walks the streets of a far city ${i}. Nobody knows her ${i}. The rain falls ${i}.`);
  bodies.push("Ana sleeps above a bakery. The ovens are warm. She does not dream.");
  let b = 0;
  const regen = [];
  const ask = async (prompt, { stage }) => {
    if (stage.startsWith("body:")) return bodies[b++];
    if (stage.startsWith("pathos:")) {
      // the last scene's role in hand: first a draw that stays away, then one that comes home
      if (!prompt.includes("In scene 2 of chapter 3")) return `Ana counts the gulls ${b++}. The wind turns west ${b}. A boat passes ${b}.`;
      regen.push(prompt);
      return regen.length === 1 ? "Ana sleeps in a far city. The ovens are warm. Nothing is different." : "Ana comes home to the lighthouse on Gull Rock at dawn. Her mother is not there, and that is all right now. Ana is the keeper of the light.";
    }
    return "";
  };
  const lf = makeLongForm({ ask, sentences, medium: PROSE_MEDIUM, mouth: "m", castDetails: [] });
  const w = await lf.writeBodies({ notes: out.notes, store: makeTextStore() });
  const ed = makeBookEditor({ lf, ask, parse, medium: PROSE_MEDIUM, mouth: "m", castDetails: [] });
  const before = ed.readBook({ notes: w.notes, store: w.store, task: "a story" });
  const kinds = before.findings.filter((f) => f.licenses === "regenerate").map((f) => f.kind);
  assert.ok(kinds.includes("no_arrival") && kinds.includes("unchanged_return"), kinds.join(","));
  assert.ok(ed.whereIsBeing({ notes: w.notes, store: w.store, task: "a story", k: 5 }).answer.includes("has not come back"));
  const r = await ed.pathosPass({ notes: w.notes, store: w.store, task: "a story", candidates: 2 });
  // the regeneration heard the arrival's role; the candidate that stays away is refused
  assert.ok(regen[0].includes("Ana comes home to the lighthouse on Gull Rock"), regen[0]);
  const last = r.rows.find((x) => x.why.some((y) => y.includes("no_arrival")));
  assert.ok(last && last.kept, JSON.stringify(r.rows));
  const after = ed.whereIsBeing({ notes: r.notes, store: r.store, task: "a story", k: 5 });
  assert.equal(after.at, "home", after.answer);
  assert.ok(after.answer.includes("came back in part 6") && after.answer.includes("the keeper of the light by part 6"), after.answer);
});

test("no regular expressions in the arc organ", () => {
  const src = fs.readFileSync(path.join(HERE, "..", "organs", "narrative-arc.js"), "utf8");
  assert.deepEqual(scanRegexes(src), []);
});
