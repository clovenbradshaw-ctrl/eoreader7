// claim-acts.test.js — every structural claim is one of the 27 phaseposts
// (operator × grain), and the record keeps the helix's order. Controls, each
// built to fail if the typing or the order is wrong:
//   - the structural words and the derived rules map to their cells; any
//     other label is a value (DEF·Figure) and says it was typed by default;
//   - a part bonded before it is instantiated is caught (the gap the
//     provenance check once papered over), and so is a conclusion whose
//     premise is not on the record;
//   - every scripted ladder rung and the lullaby come out in helix order and
//     sealed — and with the INS-first step removed, they do not;
//   - no regular expression.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { actOf, helixCheck, STRUCTURAL_ACTS } from "../organs/claim-acts.js";
import { makeNotes } from "../kernel/notes.js";
import { loadModel, sentences, tokenize, analyse } from "../adapters/text/english-parser.js";
import { makeTalkBuild } from "../organs/talk-build.js";
import { PAGE_MEDIUM } from "../adapters/build/page-medium.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");

test("structural words and derived rules are cells; anything else is a value, typed by default", () => {
  assert.deepEqual([actOf({ label: "exists" }).op, actOf({ label: "has" }).op, actOf({ label: "position" }).op, actOf({ label: "named" }).op], ["INS", "CON", "SEG", "DEF"]);
  assert.equal(actOf({ label: "shows" }).grain, "Pattern");
  assert.equal(actOf({ label: "total vote count", witnesses: ["derived:total"] }).op, "SYN");
  assert.equal(actOf({ label: "top post by vote count", witnesses: ["derived:top"] }).op, "EVA");
  const v = actOf({ label: "vote count", witnesses: ["talk:m#ask3"] });
  assert.deepEqual([v.op, v.grain], ["DEF", "Figure"]);
  assert.ok(v.typedBy.startsWith("default"), "a value is said to be typed by default");
  for (const [word, a] of Object.entries(STRUCTURAL_ACTS)) assert.ok(actOf({ label: word }).cell, `${word} -> ${a.op}·${a.grain} is a real cell`);
});

test("the helix: a part bonded before it is instantiated, and a conclusion without its premise, are caught", () => {
  const N = makeNotes();
  let log = N.createNotes({ frame: {} });
  log = N.hear(log, { end1: "site#1", label: "exists", end2: "site", witness: "request" });
  log = N.hear(log, { end1: "site#1", label: "has", end2: "forum#5", witness: "talk:m#ask1" });
  log = N.hear(log, { end1: "site#1", label: "total vote count", end2: "12", witness: "derived:total", because: "the sum [premises: post#9|vote count|12]" });
  const h = helixCheck({ fold: N.fold(log), entries: log.entries });
  assert.equal(h.ok, false);
  assert.ok(h.violations.some((v) => v.why.includes("forum#5 is bonded but was never instantiated")), JSON.stringify(h.violations));
  assert.ok(h.violations.some((v) => v.why.includes("premise post#9|vote count|12 is not on the record")));
  log = N.hear(log, { end1: "forum#5", label: "exists", end2: "forum", witness: "talk:m#ask1" });
  assert.equal(helixCheck({ fold: N.fold(log), entries: log.entries }).violations.filter((v) => v.why.includes("forum#5")).length, 0);
});

test("every scripted rung comes out in helix order and sealed; without INS-first it does not", async () => {
  const model = loadModel(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", "parser-eng-ewt.json"), "utf8")));
  const parse = (text) => analyse(model, tokenize(text).map((t) => t.form));
  const ladder = JSON.parse(fs.readFileSync(path.join(NATIVE, "eval", "build-battery", "ladder.json"), "utf8"));
  // a mouth whose opening reply also names a part ("It has a friendly forum")
  // — the very case that bonded a part before its INS
  const mouth = () => { let i = 0; return async (p) => { i++; const lines = p.split("\n"), a = lines.at(-1), q = lines.at(-3) ?? ""; if (a.startsWith("1. ") && a.endsWith(":")) { const first = a.slice(3, -1); const rows = lines.filter((x) => x[0] >= "0" && x[0] <= "9" && x.includes(". ")).map((x) => x.slice(x.indexOf(". ") + 2)).filter((x) => x !== first); const v = (k) => (q.includes("number") ? `${i * 10 + k}` : `row ${i}-${k}`); return ` ${v(0)}\n` + rows.map((r, k) => `${k + 2}. ${r}: ${v(k + 1)}`).join("\n"); } if (a === "1.") { const n = Number(q.split(" ")[1]) || 2; return Array.from({ length: n }, (_, k) => (k ? `${k + 1}. ` : "") + `Pod ${i}-${k}`).join("\n"); } if (a.endsWith(" is")) return `${i}.`; return `Pod ${i}. It has a friendly forum.`; }; };
  for (const q of ladder.requests.filter((r) => r.kind === "page").slice(0, 3)) {
    const out = await makeTalkBuild({ medium: PAGE_MEDIUM, ask: mouth(), parse, sentences, mouth: "scripted" }).build({ what: q.prompt, forWhom: q.answers.anchor });
    assert.equal(out.helix.ok, true, `${q.id}: ${JSON.stringify(out.helix.violations.slice(0, 2))}`);
    assert.ok(out.sealed);
  }
});

test("what was asked and not heard is a declared void on the record (NUL), scoped to the asks", async () => {
  const model = loadModel(JSON.parse(fs.readFileSync(path.join(NATIVE, "priors", "parser-eng-ewt.json"), "utf8")));
  const parse = (text) => analyse(model, tokenize(text).map((t) => t.form));
  const N = makeNotes();
  const out = await makeTalkBuild({ medium: PAGE_MEDIUM, ask: async () => "", parse, sentences, mouth: "m", maxAsks: 8 }).build({ what: "make a site with three posts with a title", forWhom: "fans" });
  const voids = N.foldVoids(out.notes);
  assert.ok(voids.length > 0, "the silent asks left voids");
  assert.ok(voids.some((v) => v.label === "has" && String(v.end2).includes("post")), JSON.stringify(voids.slice(0, 3)));
  assert.ok(voids.every((v) => (v.scope?.sources ?? []).includes("talk:m")), "each void names what was read");
});

test("claim-acts contains no regular expression", () => {
  const found = scanRegexes(fs.readFileSync(path.join(NATIVE, "organs", "claim-acts.js"), "utf8"));
  assert.equal(found.length, 0, JSON.stringify(found).slice(0, 200));
});
