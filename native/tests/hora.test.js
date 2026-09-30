// hora.test.js — the void-holarchy walker, with a scripted mouth and no model.
// Controls, each built to fail if the rule is wrong:
//   - a leaf's ask carries its own path only: no other section's entries;
//   - a refused cell is asked again with the SAME fresh prompt, never its reply;
//   - a repeated entry reopens its node (void-satisfaction) and is re-filled;
//   - the whole is sealed only when the verifier and satisfaction both pass;
//   - a request the mouth calls a program is handed to code-build, not built;
//   - a page assembled from sensible leaves passes the battery's own checks;
//   - the organ and its renderer hold no regular expression.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeHora, cleanLine, listOf, firstNumber, slotsFrom } from "../organs/hora.js";
import { renderPage } from "../adapters/build/page.js";
import { checkBuild, factsOf } from "../organs/build-check.js";
import { inspect } from "../eval/build-battery/inspect.mjs";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const battery = JSON.parse(fs.readFileSync(path.join(HERE, "..", "eval", "build-battery", "requests.json"), "utf8"));
const WHOLE = { slot: "make a reddit but only for dolphin content", anchor: "dolphin enthusiasts", cardinality: "three communities with four posts each" };

// A scripted mouth for the dolphin reddit: sections, counts, details, entries.
function scriptedMouth({ repeatOnce = false, emptyOnce = false } = {}) {
  const posts = ["Pod spotted off Monterey", "J-pod is back", "Boto sighting in the Amazon", "Signature whistles explained"];
  const seen = { repeated: false, emptied: false };
  return async (prompt, { stage }) => {
    if (stage === "kind") return "web";
    if (stage === "name") return "Dolphin Reddit";
    if (stage === "parts") return " Communities\n2. Posts";
    if (stage === "cardinality") return prompt.includes("Section: Communities") ? "3" : "4";
    if (stage === "admits") return prompt.includes("Section: Communities") ? " Name\n2. Members" : " Title\n2. Votes\n3. Comments";
    if (stage === "form") return "yes";
    if (stage === "form-fields") return " Title\n2. Community";
    if (stage === "button") return "Post";
    if (stage === "entry") {
      const i = Number(prompt.split("Entry ")[1].split(" ")[0]);
      if (prompt.includes("Section: Communities")) return [" r/bottlenose\nMembers: 1200", " r/orca\nMembers: 3400", " r/riverdolphins\nMembers: 560"][i - 1];
      if (emptyOnce && i === 2 && !seen.emptied) { seen.emptied = true; return " J-pod is back\nVotes:\nComments: 40"; }
      if (repeatOnce && i === 3 && !seen.repeated) { seen.repeated = true; return ` ${posts[0]}\nVotes: 12\nComments: 1`; }
      return ` ${posts[i - 1]}\nVotes: ${100 + i}\nComments: ${10 + i}`;
    }
    return "";
  };
}
const passingVerify = async (kind, text) => { const v = inspect(text); return { ok: v.kind === "page", checks: [`parsed as ${v.kind}`], detail: v.kind }; };

test("line reading: list furniture is dropped, numbers are read as digits or words, details map to slots", () => {
  assert.equal(cleanLine("  2. **Posts**"), "Posts");
  assert.equal(cleanLine("- \"Hours\""), "Hours");
  assert.deepEqual(listOf("Here are the sections:\n1. Communities\n2) Posts\n\n- Submit"), ["Communities", "Posts", "Submit"]);
  assert.equal(firstNumber("about twelve stalls"), 12);
  assert.equal(firstNumber("show 6 of them"), 6);
  assert.equal(firstNumber("a few"), null);
  assert.deepEqual(slotsFrom(" J-pod\nVotes: 301\ncomments: 40", ["Title", "Votes", "Comments"]), { Title: "J-pod", Votes: "301", Comments: "40" });
});

test("build: a page assembled from sensible leaves passes the battery's own dolphin-reddit checks, and is sealed", async () => {
  const log = [];
  const hora = makeHora({ ask: scriptedMouth(), renderers: { page: renderPage }, verify: passingVerify, log: (e) => log.push(e) });
  const out = await hora.build(WHOLE);
  assert.equal(out.kind, "page");
  const v = checkBuild(battery.requests.find((r) => r.id === "dolphin-reddit"), factsOf(inspect(out.artifact)), { cafe: battery.cafe });
  assert.equal(v.pass, true, JSON.stringify(v.results.filter((r) => !r.pass)));
  assert.ok(out.sealed, "a whole that passed its checks is sealed");
  assert.equal(out.sealed.kind, "HoraPage@1");
  assert.ok(out.tree.holarchy.levels.length > 0, "the plan is a void-holarchy");
  assert.ok(out.tree.parts.every((p) => p.void.schema === "EOVoidLevel@1"), "each part's void is defineLevelVoid's");
});

test("paths only: an entry's ask never carries another section's entries", async () => {
  const prompts = [];
  const mouth = scriptedMouth();
  const hora = makeHora({ ask: async (p, o) => { prompts.push({ p, o }); return mouth(p, o); }, renderers: { page: renderPage }, verify: passingVerify });
  await hora.build(WHOLE);
  const postAsks = prompts.filter((x) => x.o.stage === "entry" && x.p.includes("Section: Posts"));
  assert.ok(postAsks.length >= 4);
  for (const x of postAsks) assert.ok(!x.p.includes("r/orca") && !x.p.includes("Members"), `a post ask carried community content: ${x.p}`);
  assert.ok(Math.max(...prompts.map((x) => x.p.length)) < 600, "every ask stays small");
});

test("refusal: an entry with an empty detail is asked again with the same fresh prompt, never its own reply", async () => {
  const prompts = [];
  const mouth = scriptedMouth({ emptyOnce: true });
  const log = [];
  const hora = makeHora({ ask: async (p, o) => { prompts.push({ p, o }); return mouth(p, o); }, renderers: { page: renderPage }, verify: passingVerify, log: (e) => log.push(e) });
  await hora.build(WHOLE);
  assert.ok(log.some((e) => e.kind === "cell_refused" && e.why === "a detail was left empty"));
  const second = prompts.filter((x) => x.o.stage === "entry" && x.p.includes("Section: Posts") && x.p.includes("Entry 2 of"));
  assert.equal(second.length, 2, "asked twice");
  assert.equal(second[0].p, second[1].p, "the same fresh prompt");
  assert.ok(second[1].o.temperature > second[0].o.temperature, "a little warmer");
});

test("repeat: an entry that repeats a sibling is refused and the part still fills its declared count", async () => {
  const log = [];
  const hora = makeHora({ ask: scriptedMouth({ repeatOnce: true }), renderers: { page: renderPage }, verify: passingVerify, log: (e) => log.push(e) });
  const out = await hora.build(WHOLE);
  assert.ok(log.some((e) => e.kind === "cell_refused" && e.why === "repeats an entry already listed"));
  const posts = out.tree.parts.find((p) => p.part === "Posts");
  assert.equal(posts.entries.length, 4);
  assert.equal(new Set(posts.entries.map((e) => e.Title)).size, 4);
});

test("seal: a whole the verifier rejects stays unsealed scratch", async () => {
  const log = [];
  const hora = makeHora({ ask: scriptedMouth(), renderers: { page: renderPage }, verify: async () => ({ ok: false, checks: ["forced failure"], detail: "no" }), log: (e) => log.push(e) });
  const out = await hora.build(WHOLE);
  assert.equal(out.sealed, null);
  assert.ok(log.some((e) => e.kind === "unsealed"));
});

test("program: a request the mouth calls a program is handed to code-build, not built here", async () => {
  const hora = makeHora({ ask: async (p, o) => (o.stage === "kind" ? "program" : ""), renderers: { page: renderPage }, verify: passingVerify });
  const out = await hora.build({ slot: "write a script that prints 96", anchor: "me", cardinality: "one number" });
  assert.equal(out.kind, "program");
  assert.equal(out.artifact, null);
  assert.equal(out.handedTo, "organs/code-build.js");
});

test("no regex in the walker or its renderer", () => {
  for (const f of ["../organs/hora.js", "../adapters/build/page.js"]) {
    const found = scanRegexes(fs.readFileSync(path.join(HERE, f), "utf8"));
    assert.equal(found.length, 0, `${f}: ${JSON.stringify(found)}`);
  }
});
