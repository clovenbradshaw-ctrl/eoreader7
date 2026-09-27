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
import { renderBelief } from "../adapters/build/belief-page.js";
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
    const tb = makeTalkBuild({ ask, parse, sentences, render: renderBelief });
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
  const tb = makeTalkBuild({ ask: async () => "", parse, sentences, render: renderBelief });
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
    "The site is called Pod Chat.",                                    // echoed anchor
    "Sure! Here are three posts:\n1. \"Orca Watch\"\n2. Fin Friday\n3. Pod News",   // preamble, quotes
  ];
  let k = 0;
  const ask = async () => replies[k++] ?? "";
  const tb = makeTalkBuild({ ask, parse, sentences, render: renderBelief, maxAsks: 2 });
  const out = await tb.build({ what: "make a site with three posts with a title", forWhom: "fans" });
  const names = out.belief.filter((t) => t.kind === "post").map((t) => t.name);
  assert.deepEqual(names, ["Orca Watch", "Fin Friday", "Pod News"]);
  assert.equal(out.belief.find((t) => t.kind === "site").name, "Pod Chat");
});

test("the talk path contains no regular expression", () => {
  for (const f of ["organs/talk-reader.js", "organs/talk-build.js", "adapters/build/belief-page.js", "eval/build-battery/run-talk.mjs"]) {
    const found = scanRegexes(fs.readFileSync(path.join(NATIVE, f), "utf8"));
    assert.equal(found.length, 0, `${f}: ${JSON.stringify(found).slice(0, 200)}`);
  }
});
