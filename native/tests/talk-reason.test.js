// talk-reason.test.js — reasoning over a build's record, with no model.
// Controls, each built to fail if the reasoning is wrong:
//   - a total is the sum of what the parts carry; one part carrying a number
//     is not a total (no conclusion from a single premise);
//   - the top part is the one with the most of the first number the request
//     asked for, and a tie names no top;
//   - a count the thing's own parts contradict is corrected, with its reason;
//   - a part repeating a sibling word for word is retracted, not counted;
//   - wired into the build: a retraction reopens the gap and the mouth is
//     asked again; a conclusion follows its premises when they change; every
//     derived claim carries only derived witnesses and is marked on the page;
//   - no regular expression.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reason, isDerived } from "../organs/talk-reason.js";
import { loadModel, sentences, tokenize, analyse } from "../adapters/text/english-parser.js";
import { makeTalkBuild } from "../organs/talk-build.js";
import { renderBelief } from "../adapters/build/belief-page.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");

const thing = (id, kind, name, props = {}, children = [], parent = null) => ({ id, kind, name, modifier: null, parent, children, props: Object.entries(props).map(([label, value]) => ({ label, value: String(value) })) });
const spec = { counted: [{ kind: "community", n: 2, details: [] }, { kind: "post", n: 3, per: "community", details: ["vote count", "comment count"] }] };

test("derive: totals, how many shown, the top part — and nothing from a single premise", () => {
  const belief = [
    thing("community#1", "community", "r/orca", {}, ["post#1", "post#2", "post#3"]),
    thing("post#1", "post", "Superpod", { "vote count": 301, "comment count": 40 }, [], "community#1"),
    thing("post#2", "post", "Calf spotted", { "vote count": 120, "comment count": 12 }, [], "community#1"),
    thing("post#3", "post", "Quiet day", { "vote count": 7 }, [], "community#1"),
    thing("community#2", "community", "r/spinner", {}, ["post#4"]),
    thing("post#4", "post", "Spin", { "vote count": 50 }, [], "community#2"),
  ];
  const r = reason({ fold: [], belief, spec });
  const got = (end1, label) => r.derive.find((d) => d.end1 === end1 && d.label === label)?.end2 ?? null;
  assert.equal(got("community#1", "total vote count"), "428");
  assert.equal(got("community#1", "total comment count"), "52");
  assert.equal(got("community#1", "posts shown"), "3");
  assert.equal(got("community#1", "top post by vote count"), "Superpod");
  assert.equal(got("community#2", "total vote count"), null, "one post is not a total");
  assert.equal(got("community#2", "posts shown"), null);
  for (const d of r.derive) assert.ok(d.because && d.rule, "every conclusion names its rule and premises");
});

test("a tie names no top; a contradicted count is corrected with its reason", () => {
  const belief = [
    thing("community#1", "community", "r/orca", {}, ["post#1", "post#2"]),
    thing("post#1", "post", "A", { "vote count": 10, "comment count": 1 }, ["comment#1", "comment#2"], "community#1"),
    thing("post#2", "post", "B", { "vote count": 10 }, [], "community#1"),
    thing("comment#1", "comment", null, { says: "Lovely" }, [], "post#1"),
    thing("comment#2", "comment", null, { says: "Wow" }, [], "post#1"),
  ];
  const r = reason({ fold: [], belief, spec });
  assert.ok(!r.derive.some((d) => d.label.startsWith("top")), "a tie has no top");
  assert.deepEqual(r.correct.map((c) => [c.end1, c.label, c.from, c.to]), [["post#1", "comment count", "1", "2"]]);
  assert.ok(r.correct[0].trigger.includes("fewer than the 2 comments"));
});

test("a part repeating a sibling word for word is retracted, and not counted", () => {
  const belief = [
    thing("post#1", "post", "A", {}, ["comment#1", "comment#2", "comment#3"]),
    thing("comment#1", "comment", null, { says: "Great sighting!" }, [], "post#1"),
    thing("comment#2", "comment", null, { says: "great sighting! " }, [], "post#1"),
    thing("comment#3", "comment", null, { says: "Where was this?" }, [], "post#1"),
  ];
  const r = reason({ fold: [], belief, spec });
  assert.deepEqual(r.retract.map((x) => x.thing), ["comment#2"]);
  assert.equal(r.derive.find((d) => d.label === "comments shown")?.end2, "2", "the repeat is not counted");
});

const model = loadModel(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", "parser-eng-ewt.json"), "utf8")));
const parse = (text) => analyse(model, tokenize(text).map((t) => t.form));
const foldOf = async (out) => (await import("../kernel/notes.js")).makeNotes().fold(out.notes);

test("wired: conclusions are the engine's, follow the parts on the record, and are marked on the page", async () => {
  const replies = ["Pod Chat", "Orca Watch\n2. Fin Friday\n3. Pod News", " 30\n2. Fin Friday: 5\n3. Pod News: 12"];
  let k = 0;
  const prompts = [];
  const tb = makeTalkBuild({ ask: async (p) => { prompts.push(p); return replies[k++] ?? ""; }, parse, sentences, render: renderBelief, maxAsks: 6 });
  const out = await tb.build({ what: "make a site with three posts with a vote count", forWhom: "fans" });
  const derived = (await foldOf(out)).filter(isDerived);
  assert.ok(derived.length > 0, "the build reasoned over its record");
  for (const n of derived) assert.ok(n.witnesses.every((w) => w.startsWith("derived:")), "a derived claim is never the mouth's");
  for (const p of prompts) assert.ok(!p.includes("total vote count"), "a conclusion is the engine's, not handed to the mouth");
  const site = out.belief.find((t) => t.kind === "site");
  assert.equal(site.props.find((p) => p.label === "total vote count")?.value, "47");
  assert.equal(site.props.find((p) => p.label === "top post by vote count")?.value, "Orca Watch");
  assert.ok(out.artifact.includes('class="derived"'), "a computed value is marked on the page");
});

test("wired, recursive: a repeat is retracted, its gap reopens, the mouth is asked again, the count follows", async () => {
  // answered by what is asked: nothing to say about what a comment shows;
  // three comments, two the same; asked for one more, a new one
  const events = [];
  const ask = async (p) => {
    const anchor = p.split("\n").at(-1);
    if (anchor.startsWith("Each ")) return "";
    if (anchor === "It is called") return "Pod Chat";
    if (anchor === "1.") return "Great sighting!\n2. Great sighting!\n3. Where was this?";
    return "Lovely photo.";
  };
  const tb = makeTalkBuild({ ask, parse, sentences, render: renderBelief, maxAsks: 6, log: (e) => events.push(e) });
  const out = await tb.build({ what: "make a site with three comments", forWhom: "fans" });
  const said = out.belief.filter((t) => t.kind === "comment").map((t) => t.props.find((p) => p.label === "says")?.value);
  assert.deepEqual(said, ["Great sighting!", "Where was this?", "Lovely photo."], "the repeat is gone and a new comment was asked for");
  assert.ok(events.some((e) => e.kind === "reason" && e.retracted === 1), "the retraction is on the record");
  const fold = await foldOf(out);
  assert.equal(fold.find((n) => n.label === "comments shown")?.end2, "3", "the conclusion followed its premises through the edit");
  assert.equal(out.artifact.split("Great sighting!").length, 2, "the repeat is not on the page");
});

test("talk-reason contains no regular expression", () => {
  const found = scanRegexes(fs.readFileSync(path.join(NATIVE, "organs", "talk-reason.js"), "utf8"));
  assert.equal(found.length, 0, JSON.stringify(found).slice(0, 200));
});
