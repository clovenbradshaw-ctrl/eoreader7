// provenance-cover.test.js — every element of the artifact owes an account of
// where it came from (Ostrom). Controls, each built to fail if the check is
// wrong:
//   - a scripted build of every ladder rung comes out fully accounted for
//     and sealed;
//   - a renderer that emits text around its mapper ("Send" with no key) is
//     caught, and the artifact is not sealed;
//   - an engine key cannot carry any text ("Buy now" filed as engine:send);
//   - an account naming a note that is not on the record does not resolve;
//   - a visible attribute value is an element too;
//   - a silent mouth leaves no talk: account on the page;
//   - no regular expression.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, sentences, tokenize, analyse } from "../adapters/text/english-parser.js";
import { makeTalkBuild } from "../organs/talk-build.js";
import { renderBeliefMapped, ENGINE_WORDS } from "../adapters/build/belief-page.js";
import { uncovered, pageLeaves } from "../organs/provenance-cover.js";
import { makeNotes } from "../kernel/notes.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");
const model = loadModel(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", "parser-eng-ewt.json"), "utf8")));
const parse = (text) => analyse(model, tokenize(text).map((t) => t.form));
const ladder = JSON.parse(fs.readFileSync(path.join(NATIVE, "eval", "build-battery", "ladder.json"), "utf8"));

function mouth() {
  let i = 0;
  return async (p) => {
    i++;
    const lines = p.split("\n"), a = lines.at(-1), q = lines.at(-3) ?? "";
    if (a.startsWith("1. ") && a.endsWith(":")) { const first = a.slice(3, -1); const rows = lines.filter((x) => x[0] >= "0" && x[0] <= "9" && x.includes(". ")).map((x) => x.slice(x.indexOf(". ") + 2)).filter((x) => x !== first); const v = (k) => (q.includes("number") ? `${i * 10 + k}` : `row ${i}-${k}`); return ` ${v(0)}\n` + rows.map((r, k) => `${k + 2}. ${r}: ${v(k + 1)}`).join("\n"); }
    if (a === "1.") { const n = Number(q.split(" ")[1]) || 2; return Array.from({ length: n }, (_, k) => (k ? `${k + 1}. ` : "") + `Pod ${i}-${k}`).join("\n"); }
    if (a.endsWith(" is")) return `${i}.`;
    return `Pod ${i}. It has a friendly forum.`;
  };
}

test("every rung's page is fully accounted for, and sealed", async () => {
  for (const q of ladder.requests.filter((r) => r.kind === "page")) {
    const out = await makeTalkBuild({ ask: mouth(), parse, sentences, render: renderBeliefMapped, mouth: "scripted" }).build({ what: q.prompt, forWhom: q.answers.anchor });
    assert.equal(out.provenance.ok, true, `${q.id}: ${JSON.stringify(out.provenance.uncovered.slice(0, 3))} ${JSON.stringify(out.provenance.unresolved.slice(0, 3))}`);
    assert.ok(out.provenance.covered > 10);
    assert.ok(out.sealed, `${q.id} was not sealed`);
    assert.equal(out.sealed.kind, "TalkBuild@1");
  }
});

test("text emitted around the mapper is caught, and the page is not sealed", async () => {
  const leaky = (belief, o) => { const r = renderBeliefMapped(belief, o); return { ...r, artifact: r.artifact.replace("<main>", "<main><p>Send</p>") }; };
  const out = await makeTalkBuild({ ask: mouth(), parse, sentences, render: leaky, mouth: "scripted" }).build({ what: ladder.requests[1].prompt, forWhom: "fans" });
  assert.equal(out.provenance.ok, false);
  assert.ok(out.provenance.uncovered.some((l) => l.text === "Send"), JSON.stringify(out.provenance.uncovered));
  assert.equal(out.sealed, null);
});

test("an engine key cannot carry any text; an account must resolve to a note on the record", () => {
  const N = makeNotes();
  let log = N.createNotes({ frame: {} });
  log = N.hear(log, { end1: "site#1", label: "named", end2: "Pod Chat", witness: "talk:m#ask1" });
  const fold = N.fold(log);
  const id = fold[0].id;
  const page = "<html><body><h1>Pod Chat</h1><button>Buy now</button><p>Ghost</p></body></html>";
  const r = uncovered({ artifact: page, map: [{ text: "Pod Chat", src: [id] }, { text: "Buy now", src: ["engine:send"] }, { text: "Ghost", src: ["post#9|named|Ghost"] }], fold, engineWords: ENGINE_WORDS });
  assert.deepEqual(r.unresolved.map((u) => u.text).sort(), ["Buy now", "Ghost"]);
  assert.deepEqual(r.uncovered.map((l) => l.text).sort(), ["Buy now", "Ghost"]);
  assert.equal(r.covered, 1);
});

test("a visible attribute value is an element; style and script are not text", () => {
  const leaves = pageLeaves('<html><head><style>h1{color:red}</style><script>var x="<b>"</script></head><body><input placeholder="Search posts" name="q"><i title="computed">5</i></body></html>');
  assert.deepEqual(leaves.map((l) => `${l.where}:${l.text}`), ["@placeholder:Search posts", "@title:computed", "text:5"]);
});

test("a silent mouth leaves no talk: account on the page", async () => {
  const out = await makeTalkBuild({ ask: async () => "", parse, sentences, render: renderBeliefMapped, mouth: "m" }).build({ what: ladder.requests[2].prompt, forWhom: "fans" });
  const fold = makeNotes().fold(out.notes);
  const byId = new Map(fold.map((n) => [n.id, n]));
  const talk = out.map.filter((m) => m.src.some((s) => (byId.get(s)?.witnesses ?? []).some((w) => w.startsWith("talk:"))));
  assert.deepEqual(talk, [], "nothing on the page claims the silent mouth said it");
  assert.equal(out.provenance.ok, true, "and what is there — the request's own parts, engine words — is all accounted for");
});

test("provenance-cover contains no regular expression", () => {
  const found = scanRegexes(fs.readFileSync(path.join(NATIVE, "organs", "provenance-cover.js"), "utf8"));
  assert.equal(found.length, 0, JSON.stringify(found).slice(0, 200));
});
