// tests/carried-ground.test.js — the ground row (organs/carried-ground.js):
// who was there at the close, where the being is, which day it is, and the
// strangers the prose made recur — each read from the bodies already set down.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sentences } from "../adapters/text/english-parser.js";
import { groundAt, FIELD_FACTS } from "../organs/carried-ground.js";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const prop = (label, value) => ({ label, value, note: `${label}-note` });
const cast = [
  { id: "c#1", name: "Ana", nameNote: "n1", props: [prop("home", "the lighthouse on Gull Rock"), prop("lacks", "her mother"), prop("becomes", "the keeper of the light")] },
  { id: "c#2", name: "Tom", nameNote: "n2", props: [] },
];
const part = (id, chapter, ...texts) => ({ id, chapter, lines: texts.map((text, i) => ({ text, addr: `line ${i + 1}` })) });
const parts = [
  part("p1", 0, "Ana woke in the lighthouse on Gull Rock.", "Her mother had been gone for years."),
  part("p2", 0, "The next morning Ana rowed across the strait.", "She met a sailor called Rex at the pier."),
  part("p3", 1, "Rex showed Ana the harbour.", "The following day they walked the market.", "Tom found them there, and Rex waved."),
];

test("the ground carried into the next part: who closed the last part, where the being is, the day, the recurring strangers", () => {
  const g = groundAt({ parts, k: 3, cast, sentences });
  assert.ok(g.facts.includes("When the part before ended, Ana and Tom were there."), JSON.stringify(g.facts));
  assert.ok(g.facts.includes("Ana is away from the lighthouse on Gull Rock."), JSON.stringify(g.facts));
  assert.ok(g.facts.includes("It is the third day of the story."), "two next-day phrases advance the day twice");
  assert.ok(g.facts.includes("Rex is also in the story."), "a stranger named in two parts is compiled into the ground");
  assert.ok(g.facts.length <= FIELD_FACTS);
});

test("the ground at an earlier part is that part's, not the latest (the stale control reads a real, older ground)", () => {
  const g = groundAt({ parts, k: 1, cast, sentences });
  assert.ok(g.facts.includes("Ana is at the lighthouse on Gull Rock."), JSON.stringify(g.facts));
  assert.ok(g.facts.includes("It is the first day of the story."));
  assert.ok(!g.facts.some((f) => f.includes("Rex")), "a stranger not yet recurring is not in the ground");
  assert.deepEqual(groundAt({ parts, k: 0, cast, sentences }).facts, [], "nothing before the first part");
});

test("the carried facts use no apparatus words and no regular expressions", () => {
  for (const f of groundAt({ parts, k: 3, cast, sentences }).facts) for (const w of ["ledger", "claim", "JSON", "premise", "note", "field"]) assert.ok(!f.split(" ").includes(w), f);
  assert.deepEqual(scanRegexes(fs.readFileSync(path.join(HERE, "..", "organs", "carried-ground.js"), "utf8")), []);
});
