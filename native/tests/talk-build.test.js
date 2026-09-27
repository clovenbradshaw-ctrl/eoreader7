// talk-build.test.js — the build as a conversation, with no model. Controls,
// each built to fail if the path is wrong:
//   - the request is read as a spec in word order: kinds from the last noun,
//     counts per parent, names, details that stop at the clause, and a second
//     count of the same kind kept apart ("three reported posts");
//   - the reader hears the plain sentences the seed and the mouth say;
//   - a scripted mouth that only talks builds a page the battery's checker
//     passes, and every entry the build wrote is typed by the ledger itself
//     (INS first heard, SYN heard again, operator_basis "produced") while no
//     prompt the mouth saw names an operator;
//   - a mouth that says nothing gets a page that FAILS the same checks: the
//     engine invents no content, it only keeps what was said;
//   - the reply's framing (an echoed anchor, a preamble line, a quoted title)
//     is not taken as the answer;
//   - the four files contain no regular expression.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, sentences, tokenize, analyse } from "../adapters/text/english-parser.js";
import { makeTalkReader } from "../organs/talk-reader.js";
import { specOf, makeTalkBuild, completeness, MAX_ASKS } from "../organs/talk-build.js";
import { renderBelief, renderBeliefMapped } from "../adapters/build/belief-page.js";
import { checkBuild, factsOf } from "../organs/build-check.js";
import { inspect } from "../eval/build-battery/inspect.mjs";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");
const model = loadModel(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", "parser-eng-ewt.json"), "utf8")));
const parse = (text) => analyse(model, tokenize(text).map((t) => t.form));
const ladder = JSON.parse(fs.readFileSync(path.join(NATIVE, "eval", "build-battery", "ladder.json"), "utf8"));
const rung = (id) => ladder.requests.find((r) => r.id === id);
const spec = (id) => specOf(rung(id).prompt, { parse, sentences });

// A mouth that only talks: it finishes whatever sentence it is handed, in the
// ways a small model does (a list, a number, a sentence), and knows nothing of
// operators, ledgers or pages.
function scriptedMouth() {
  let i = 0;
  const prompts = [];
  const ask = async (prompt) => {
    prompts.push(prompt);
    i++;
    const lines = prompt.split("\n");
    const anchor = lines.at(-1);
    const q = lines.at(-3) ?? "";
    if (anchor.startsWith("1. ") && anchor.endsWith(":")) {
      // a row per thing: answer the first, then go on "2. Name: value"
      const first = anchor.slice(3, -1);
      const rows = lines.filter((l) => l[0] >= "0" && l[0] <= "9" && l.includes(". ")).map((l) => l.slice(l.indexOf(". ") + 2)).filter((x) => x !== first);
      const value = (k) => (q.includes("number") ? `${i * 10 + k}` : `row ${i}-${k}`);
      return ` ${value(0)}\n` + rows.map((r, k) => `${k + 2}. ${r}: ${value(k + 1)}`).join("\n");
    }
    if (anchor === "1." && q.startsWith("Give the")) return Array.from({ length: 8 }, (_, k) => (k ? `${k + 1}. ` : "") + (q.includes("number") ? `${i * 10 + k}` : `note ${i}-${k}`)).join("\n");
    if (anchor === "1.") { const n = Number(q.split(" ")[1]) || 2; return Array.from({ length: n }, (_, k) => (k ? `${k + 1}. ` : "") + (q.startsWith("Write") ? `Lovely sighting ${i}-${k}!` : `Pod watch ${i}-${k}`)).join("\n"); }
    if (anchor.endsWith("says:")) return `What a day ${i}!`;
    if (anchor.endsWith("is called")) return `Pod watch ${i}. It is new.`;
    if (anchor.endsWith(" is")) return `${i * 3}.`;
    return `rules for each community and a list of posts.`;
  };
  return { ask, prompts };
}

test("the request is read as a spec in word order", () => {
  const r1 = spec("page-rung-1");
  assert.deepEqual(r1.counted.map((c) => [c.kind, c.modifier, c.n, c.names.join(",")]), [["species", "dolphin", 3, "bottlenose,orca,spinner"]]);
  assert.deepEqual(r1.counted[0].details, ["fact"]);

  const r3 = spec("page-rung-3");
  assert.deepEqual(r3.counted.map((c) => [c.kind, c.n, c.per]), [["community", 2, null], ["post", 3, "community"]]);
  assert.deepEqual(r3.counted[1].details, ["title", "vote count", "comment count"], "the with-list stops at the clause");
  assert.deepEqual(r3.named.map((p) => p.phrase), ["form", "button"]);
  assert.deepEqual(r3.named[0].details, ["title", "community"]);
  assert.equal(r3.named[1].purpose, "sort posts by votes");

  const r5 = spec("page-rung-5");
  assert.deepEqual(r5.counted.map((c) => [c.phrase, c.n, c.per, c.within]), [
    ["communities", 6, null, null], ["posts", 6, "community", null], ["short comments", 2, "post", null],
    ["user profiles", 5, null, null], ["reported posts", 3, null, "moderation queue"],
  ]);
  assert.deepEqual(r5.counted[0].names, ["r/bottlenose", "r/orca", "r/spinner", "r/riverdolphins", "r/dusky", "r/humpback"]);
  assert.deepEqual(r5.counted[3].details, ["username", "karma"]);
  assert.deepEqual(r5.counted[4].details, ["reason"]);
  assert.deepEqual(r5.named.map((p) => p.phrase), ["sidebar", "search box", "form", "button", "moderation queue", "page links"]);
});

test("the reader hears plain sentences", () => {
  const reader = makeTalkReader({ parse, sentences });
  const said = (text) => reader.read(text, { witness: "t" }).claims.map((c) => `${c.end1} ${c.label} ${c.end2}`);
  assert.deepEqual(said("There is a search box."), ["box#1 exists box"]);
  assert.deepEqual(said("The button is used to sort posts by votes."), ["button#2 for sort posts by votes"]);
  const claims = said("One more post in r/orca is called Superpod sighting. It has 301 upvotes.");
  assert.ok(claims.includes("post#3 named Superpod sighting"), claims.join(" | "));
  assert.ok(claims.includes("post#3 upvotes 301"), claims.join(" | "));
});

test("a mouth that only talks builds a page the checker passes; the ledger types every entry", async () => {
  for (const id of ["page-rung-1", "page-rung-3", "page-rung-5"]) {
    const { ask, prompts } = scriptedMouth();
    const tb = makeTalkBuild({ ask, parse, sentences, render: renderBeliefMapped });
    const out = await tb.build({ what: rung(id).prompt, forWhom: rung(id).answers.anchor });
    const verdict = checkBuild(rung(id), factsOf(inspect(out.artifact)), { cafe: ladder.cafe });
    assert.equal(verdict.pass, true, `${id}: ${verdict.results.filter((r) => !r.pass).map((r) => `${r.id}: ${r.detail}`).join(" | ")}`);
    assert.ok(out.asks <= MAX_ASKS);
    // the frame is declared; everything heard is typed by the ledger, never by the mouth
    const heard = out.notes.entries.filter((e) => e.operator !== "DEF");
    assert.ok(heard.length > 0);
    for (const e of heard) { assert.ok(["INS", "SYN"].includes(e.operator), e.operator); assert.equal(e.operator_basis, "produced"); }
    for (const p of prompts) for (const op of ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]) assert.ok(!p.split(" ").includes(op), `a prompt named ${op}`);
    const whole = completeness(out.spec, out.belief);
    assert.ok(whole.ratio > 0.9, `${id}: ${whole.have}/${whole.want}`);
  }
});

test("a mouth that says nothing gets a page that fails: the engine invents no content", async () => {
  const tb = makeTalkBuild({ ask: async () => "", parse, sentences, render: renderBeliefMapped });
  const out = await tb.build({ what: rung("page-rung-3").prompt, forWhom: "dolphin fans" });
  const verdict = checkBuild(rung("page-rung-3"), factsOf(inspect(out.artifact)), { cafe: ladder.cafe });
  const failed = verdict.results.filter((r) => !r.pass).map((r) => r.id);
  // "votes" may still pass: the request itself says there is a button to
  // "sort posts by votes", and that request-witnessed label is drawn
  assert.ok(failed.includes("comments") && failed.includes("posts"), failed.join(","));
  assert.ok(out.asks < MAX_ASKS, "every gap is let go after two silent asks");
  // only what the request itself said is on the record
  for (const e of out.notes.entries.filter((x) => x.operator !== "DEF")) assert.equal(String(e.witness ?? e.provenance?.witness ?? "request").startsWith("talk:"), false);
});

test("the reply's framing is not the answer", async () => {
  const replies = [
    "It is called Pod Chat.",                                          // echoed anchor
    "Sure! Here are three posts:\n1. \"Orca Watch\"\n2. Fin Friday\n3. Pod News",   // preamble, quotes
    "Orca Watch: 25\nPod News: 7",                                        // the row's name said again, rows out of order
  ];
  let k = 0;
  const ask = async () => replies[k++] ?? "";
  const tb = makeTalkBuild({ ask, parse, sentences, render: renderBeliefMapped, maxAsks: 3 });
  const out = await tb.build({ what: "make a site with three posts with a title and a vote count", forWhom: "fans" });
  const posts = out.belief.filter((t) => t.kind === "post");
  assert.deepEqual(posts.map((t) => t.name), ["Orca Watch", "Fin Friday", "Pod News"]);
  assert.deepEqual(posts.map((t) => t.props.find((p) => p.label === "vote count")?.value ?? null), ["25", null, "7"]);
  assert.equal(out.belief.find((t) => t.kind === "site").name, "Pod Chat");
});

// Gary's door (the-fold's archon for everything the mouth reads; pinned from
// this side as in gary-doors.test.js): no apparatus words, no prohibitions,
// no JSON asks — and as little as possible, so an ask carries what the build
// is and its own thing's path, never the whole request.
const APPARATUS = ["ledger", "claim", "slot", "belief", "spec", "witness", "operator", "fold", "gap", "anchor", "NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC", "EOT"];
const BANS = ["do not", "don't", "never", "must not", "should not", "refrain from", "avoid"];
test("Gary's door: every ask is facts in plain words, and its size does not grow with the build", async () => {
  const sizes = {};
  for (const id of ["page-rung-2", "page-rung-5"]) {
    const { ask, prompts } = scriptedMouth();
    await makeTalkBuild({ ask, parse, sentences, render: renderBeliefMapped }).build({ what: rung(id).prompt, forWhom: rung(id).answers.anchor });
    for (const p of prompts) {
      const words = p.split("\n").join(" ").split(" ").map((w) => w.toLowerCase().split("").filter((c) => c.toLowerCase() !== c.toUpperCase() || c === "'").join(""));
      for (const term of APPARATUS) assert.ok(!words.includes(term.toLowerCase()), `an ask names "${term}": ${p.slice(0, 120)}`);
      for (const ban of BANS) assert.ok(!p.toLowerCase().includes(ban), `an ask carries a prohibition ("${ban}")`);
      assert.ok(!words.includes("json"), "an ask asks for JSON");
      assert.ok(!p.includes(rung(id).prompt), "an ask carries the whole request");
    }
    sizes[id] = Math.max(...prompts.map((p) => p.length));
  }
  // rung 5 asks for six times the posts of rung 2; its largest ask may be a
  // little longer (six posts listed where three were), never the request's growth
  assert.ok(sizes["page-rung-5"] <= 1.3 * sizes["page-rung-2"], JSON.stringify(sizes));
});

test("siblings are told apart by name: a name already used is not taken again", async () => {
  const replies = ["Pod Chat", "Dolphin Fan\n2. Dolphin Fan\n3. Orca Watch", "Fin Friday"];
  let k = 0;
  const tb = makeTalkBuild({ ask: async () => replies[k++] ?? "", parse, sentences, render: renderBeliefMapped, maxAsks: 3 });
  const out = await tb.build({ what: "make a site with three posts with a title", forWhom: "fans" });
  assert.deepEqual(out.belief.filter((t) => t.kind === "post").map((t) => t.name), ["Dolphin Fan", "Orca Watch", "Fin Friday"]);
});

test("a thin request: the person's answers are read with it, and what each part shows is asked once", async () => {
  const prompts = [];
  let i = 0;
  const ask = async (p) => {
    prompts.push(p); i++;
    const lines = p.split("\n"), anchor = lines.at(-1);
    if (p.toLowerCase().includes("what does each")) return "Each post shows its name, its upvotes and its comments.";
    if (anchor.startsWith("1. ") && anchor.endsWith(":")) {
      const first = anchor.slice(3, -1);
      const rows = lines.filter((l) => l[0] >= "0" && l[0] <= "9" && l.includes(". ")).map((l) => l.slice(l.indexOf(". ") + 2)).filter((x) => x !== first);
      return ` ${i}\n` + rows.map((r, k) => `${k + 2}. ${r}: ${i + k + 1}`).join("\n");
    }
    if (anchor === "1.") return Array.from({ length: 4 }, (_, k) => (k ? `${k + 1}. ` : "") + `Pod note ${i}-${k}`).join("\n");
    return "Pod Chat";
  };
  const tb = makeTalkBuild({ ask, parse, sentences, render: renderBeliefMapped });
  const out = await tb.build({ what: "make a reddit but only for dolphin content", forWhom: "dolphin fans", more: ["three communities — r/bottlenose, r/orca and r/riverdolphins — with four posts each"] });
  assert.deepEqual(out.spec.counted.map((c) => [c.kind, c.n, c.per]), [["community", 3, null], ["post", 4, "community"]]);
  assert.deepEqual(out.spec.counted[1].details, ["upvotes", "comments"]);
  assert.equal(prompts.filter((p) => p.toLowerCase().includes("what does each")).length, 2, "asked once per part, communities and posts");
  const posts = out.belief.filter((t) => t.kind === "post");
  assert.equal(posts.length, 12);
  assert.ok(posts.every((t) => t.props.some((p) => p.label === "upvotes")), "every post carries what the mouth said a post shows");
});

test("the frame: by default an ask carries the task at hand, not the big picture", async () => {
  for (const frame of ["task", "whole"]) {
    const { ask, prompts } = scriptedMouth();
    await makeTalkBuild({ ask, parse, sentences, render: renderBeliefMapped, frame }).build({ what: rung("page-rung-3").prompt, forWhom: "dolphin fans" });
    const opened = prompts.filter((p) => p.startsWith("We are describing")).length;
    if (frame === "task") {
      assert.equal(opened, 0, "a task-framed ask never opens with the whole");
      const post = prompts.find((p) => p.includes("posts in r/"));
      assert.ok(post && !post.includes("reddit-style") && !post.includes("We are describing"), `the post ask carries its own path, not the whole: ${post}`);
      assert.ok(post.includes("for dolphin fans"), "and the request's own constraint on content");
    } else assert.equal(opened, prompts.length, "the whole-framed arm opens every ask with the whole");
  }
});

test("a reply is read, not only slotted; what the ear imagines is never on the page", async () => {
  const replies = ["Pod Chat. It has a friendly forum. One more post is called Ghost Post."];
  let k = 0;
  const tb = makeTalkBuild({ ask: async () => replies[k++] ?? "", parse, sentences, render: renderBeliefMapped, maxAsks: 1 });
  const out = await tb.build({ what: "make a site with three posts with a title", forWhom: "fans" });
  const site = out.belief.find((t) => t.kind === "site");
  assert.equal(site.name, "Pod Chat");
  const parts = site.children.map((c) => out.belief.find((t) => t.id === c)?.kind);
  assert.ok(parts.includes("forum"), `the rest of the reply is read into the site: ${JSON.stringify(parts)}`);
  // "One more post is called Ghost Post" is not about the site: the ear hears
  // a new post, but nothing asked for it and nothing holds it — it is not
  // on the record, so it is not on the page
  assert.ok(!out.belief.some((t) => t.name === "Ghost Post"), "a stray the ear imagined reached the page");
  assert.ok(!out.artifact.includes("Ghost Post"));
});

test("the request's own constraint on content is read as its topic", () => {
  assert.equal(specOf("make a reddit but only for dolphin content", { parse, sentences }).topic, "for dolphin content");
  assert.equal(spec("page-rung-3").topic, "for dolphin fans");
  assert.equal(specOf("make a site with three posts", { parse, sentences }).topic, null);
});

test("the mouth is one source however often it is asked; what it says a part shows is on the record", async () => {
  const { makeNotes } = await import("../kernel/notes.js");
  const N = makeNotes();
  // the same claim heard from two asks of one model: under the old grammar
  // (talk:<n>) each ask read as its own source — corroborated; under
  // talk:<model>#ask<n> it is one source
  const twice = (w1, w2) => { let n = N.createNotes({ frame: {} }); n = N.hear(n, { end1: "post#1", label: "vote count", end2: "12", witness: w1 }); n = N.hear(n, { end1: "post#1", label: "vote count", end2: "12", witness: w2 }); return N.foldWithStanding(n)[0].standing; };
  assert.notEqual(twice("talk:1", "talk:2"), "single-witness", "the old grammar counted two asks as two sources");
  assert.equal(twice("talk:qwen2.5-coder:1.5b#ask1", "talk:qwen2.5-coder:1.5b#ask2"), "single-witness", "one model agreeing with itself is one source");
  // and the build uses that grammar
  let k = 0;
  const out = await makeTalkBuild({ ask: async () => (k++ ? "" : "Pod Chat"), parse, sentences, render: renderBeliefMapped, maxAsks: 2, mouth: "qwen2.5-coder:1.5b" }).build({ what: "make a site with three posts with a title", forWhom: "fans" });
  const said = N.fold(out.notes).flatMap((x) => x.witnesses).filter((w) => w.startsWith("talk:"));
  assert.ok(said.length && said.every((w) => w.startsWith("talk:qwen2.5-coder:1.5b#ask")), said.join(","));
  // a thin request: the mouth's "shows" answer lands in the ledger
  const ask2 = async (p) => (p.toLowerCase().includes("what does each") ? "Each post shows its name, its upvotes." : "");
  const out2 = await makeTalkBuild({ ask: ask2, parse, sentences, render: renderBeliefMapped, maxAsks: 3, mouth: "m" }).build({ what: "make a reddit but only for dolphin content", more: ["two communities, r/a and r/b, with two posts each"] });
  const shows = N.fold(out2.notes).find((n) => n.end1 === "kind:post" && n.label === "shows" && n.end2 === "upvotes");
  assert.ok(shows && shows.witnesses[0].startsWith("talk:m#ask"), "the mouth's answer about what a post shows is heard");
});

test("the talk path contains no regular expression", () => {
  for (const f of ["organs/talk-reader.js", "organs/talk-build.js", "adapters/build/belief-page.js", "eval/build-battery/run-talk.mjs"]) {
    const found = scanRegexes(fs.readFileSync(path.join(NATIVE, f), "utf8"));
    assert.equal(found.length, 0, `${f}: ${JSON.stringify(found).slice(0, 200)}`);
  }
});
