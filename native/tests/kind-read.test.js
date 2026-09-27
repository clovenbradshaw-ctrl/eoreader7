// kind-read.test.js — reasoning out what a kind of thing carries from a
// source that describes it, with no model. Fixed sources (fixtures/kind-read,
// Wikipedia leads kept verbatim). Controls, each built to fail if the
// reasoning is wrong:
//   - Reddit: a post is a kind of content; content is voted on by members;
//     so a post carries a vote count, inherited, with the sentence it rests
//     on; a board called a subreddit holds posts;
//   - forum: a message approved by ONE moderator is in a state (approved),
//     not counted — done by many is counted, done by one is a state;
//   - "such as" after a noun inside a prepositional phrase belongs to the
//     clause's noun ("content to the site such as links" -> content);
//   - reversed kinds reverse the inheritance; a passive with no agent and a
//     kind the source never names carry nothing (no source, no detail);
//   - wired into the build: a thin request's details are reasoned from the
//     source first, and the mouth is not asked what a post shows;
//   - no regular expression.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, sentences, tokenize, analyse } from "../adapters/text/english-parser.js";
import { readKinds, detailsFor, holdersOf, kindsAbove } from "../organs/kind-read.js";
import { makeTalkBuild } from "../organs/talk-build.js";
import { renderBelief } from "../adapters/build/belief-page.js";
import { makeNotes } from "../kernel/notes.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");
const model = loadModel(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", "parser-eng-ewt.json"), "utf8")));
const parse = (text) => analyse(model, tokenize(text).map((t) => t.form));
const fixture = (f) => fs.readFileSync(path.join(HERE, "fixtures", "kind-read", f), "utf8");
const read = (text) => readKinds(text, { parse, sentences }).facts;

test("Reddit: a post is content, content is voted on by members — so a post carries a vote count", () => {
  const facts = read(fixture("reddit.txt"));
  assert.deepEqual(kindsAbove(facts, "post"), ["post", "content"]);
  const d = detailsFor(facts, "post");
  assert.deepEqual(d.map((x) => x.detail), ["vote count"]);
  assert.equal(d[0].inherited, true, "the post's vote count is inherited from content");
  assert.ok(d[0].because[0].includes("voted up or down"), "it rests on the sentence that says so");
  assert.deepEqual(holdersOf(facts, "post").map((h) => [h.holder, ...h.called]), [["board", "subreddit"]]);
  assert.deepEqual(detailsFor(facts, "comment"), [], "the source says nothing of comments: nothing is derived");
});

test("forum: done by one is a state, not a count", () => {
  const d = detailsFor(read(fixture("internet-forum.txt")), "message");
  assert.deepEqual(d.map((x) => x.detail), ["approved"]);
});

test("controls: the clause's noun, reversed kinds, no agent", () => {
  const f1 = read("Users submit content to the site such as links and text posts, which are then rated by other members.");
  assert.deepEqual(kindsAbove(f1, "post"), ["post", "content"], "not 'site': the noun inside 'to the site' is the phrase's");
  assert.deepEqual(detailsFor(f1, "post").map((x) => x.detail), ["rate count"]);
  const f2 = read("Users share links such as posts and pictures, which are then rated by other members.");
  assert.deepEqual(kindsAbove(f2, "link"), ["link"], "reversed: a link is not a kind of post here");
  assert.deepEqual(kindsAbove(f2, "post"), ["post", "link"]);
  const f4 = read("Users submit content such as links and text posts, which are never voted on by other members.");
  assert.deepEqual(detailsFor(f4, "post"), [], "'never voted on' says it is not done");
  const f5 = read("Posts are not rated by other members.");
  assert.deepEqual(detailsFor(f5, "post"), [], "a denied passive derives nothing");
  const f3 = read("Posts are archived after a year.");
  assert.deepEqual(detailsFor(f3, "post"), [], "done to it by no one named: nothing is counted");
});

test("wired: a thin request's details are reasoned from the source; the mouth is not asked what a post shows", async () => {
  const looked = [];
  const lookup = async (term) => { looked.push(term); return term === "reddit" ? fixture("reddit.txt") : null; };
  const prompts = [];
  const ask = async (p) => {
    prompts.push(p);
    const anchor = p.split("\n").at(-1);
    if (anchor.startsWith("Each ")) return "Each community shows its name, its rules.";
    if (anchor === "It is called") return "Pod Chat";
    if (anchor === "1.") return p.includes("posts") ? "Orca Watch\n2. Fin Friday" : "Rules one";
    if (anchor.startsWith("1. ")) { const rows = p.split("\n").filter((l) => l[0] >= "0" && l[0] <= "9" && l.includes(". ")).map((l) => l.slice(l.indexOf(". ") + 2)); return rows.map((r, i) => `${i ? `${i + 1}. ${r}: ` : " "}${10 + i}`).join("\n"); }
    return "";
  };
  const tb = makeTalkBuild({ ask, parse, sentences, render: renderBelief, lookup, maxAsks: 20 });
  const out = await tb.build({ what: "make a reddit but only for dolphin content", forWhom: "dolphin fans", more: ["two communities, r/orca and r/pods, with two posts each"] });
  assert.deepEqual(looked, ["reddit"]);
  assert.deepEqual(out.spec.counted.find((c) => c.kind === "post").details, ["vote count"]);
  assert.ok(!prompts.some((p) => p.toLowerCase().includes("what does each post")), "the mouth was not asked what a post shows");
  const fold = makeNotes().fold(out.notes);
  const shows = fold.find((n) => n.end1 === "kind:post" && n.label === "shows" && n.end2 === "vote count");
  assert.ok(shows && shows.witnesses.includes("source:reddit"), "the reasoned detail is on the ledger with its source");
  const posts = out.belief.filter((t) => t.kind === "post");
  assert.ok(posts.length === 4 && posts.every((t) => t.props.some((p) => p.label === "vote count")), "every post carries the reasoned detail");
});

test("kind-read and its source adapter contain no regular expression", () => {
  for (const f of ["organs/kind-read.js", "adapters/sources/wiki-summary.js"]) {
    const found = scanRegexes(fs.readFileSync(path.join(NATIVE, f), "utf8"));
    assert.equal(found.length, 0, `${f}: ${JSON.stringify(found).slice(0, 200)}`);
  }
});
