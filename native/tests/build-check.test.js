// build-check.test.js — the build battery's EVA, with no model. Controls, each
// built to fail if the checker is wrong:
//   - the engine's real café output for "make a reddit but only for dolphin
//     content" FAILS that request and PASSES the coffee-shop control;
//   - hand-written correct artifacts pass their requests, and a near-miss
//     (the right shape, the wrong number) fails;
//   - a word inside a longer word is not the word ("devoted" is not "vote");
//   - a list of three items counts three, never four;
//   - an artifact of the wrong kind passes nothing;
//   - the checker, the runner and the page reader contain no regular expression.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkBuild, factsOf, wordsOf, hasPhrase, satisfies, innermostMatches } from "../organs/build-check.js";
import { unfence, inspect } from "../eval/build-battery/inspect.mjs";
import { scanRegexes } from "../../scripts/kleene-up.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const battery = JSON.parse(fs.readFileSync(path.join(HERE, "..", "eval", "build-battery", "requests.json"), "utf8"));
const req = (id) => battery.requests.find((r) => r.id === id);
const score = (id, code) => checkBuild(req(id), factsOf(inspect(code)), { cafe: battery.cafe });

// The engine's own output for the dolphin reddit (2026-09-27, qwen2.5-coder:1.5b), body only.
const CAFE_DOLPHINS = `<!DOCTYPE html><html><head><title>Data</title><style>body{}</style></head><body>
<button class="theme-toggle">Dark mode</button><div class="container">
<h1>Dolphin Enthusiasts, Trainers, and Marine Biologists</h1>
<p class="tagline">Explore the world of dolphins, from bottlenose to orca, and river dolphins.</p>
<section><h2>Drinks</h2><ul><li>Bottlenose: $5</li><li>Orca: $7</li><li>River Dolphin: $6</li><li>Healthy Smoothie: $4</li><li>Healthy Shake: $3</li></ul></section>
<section><h2>Hours</h2><p>Monday to Friday: 9am - 5pm</p><p>Saturday and Sunday: 10am - 6pm</p></section>
</div><script>var x = 1;</script></body></html>`;

const post = (sub, title, votes, comments) => `<article class="post"><span class="sub">r/${sub}</span><h3>${title}</h3><p>${votes} points · ${comments} comments</p></article>`;
const GOOD_REDDIT = `<!DOCTYPE html><html><head><title>Dolphin Reddit</title></head><body>
<aside><h2>Communities</h2><ul><li>r/bottlenose</li><li>r/orca</li><li>r/riverdolphins</li></ul></aside>
<main>${post("bottlenose", "Pod spotted off Monterey", 120, 14)}${post("bottlenose", "Signature whistles explained", 88, 9)}
${post("orca", "J-pod is back", 301, 40)}${post("orca", "How orcas hunt as a team", 150, 22)}
${post("riverdolphins", "Boto sighting in the Amazon", 64, 5)}${post("riverdolphins", "Ganges dolphin census", 47, 3)}</main>
<form><input name="title"><button>Submit a post</button></form></body></html>`;

test("no regex: the checker, the runner, the inspector and the page reader hold none", () => {
  for (const f of ["../organs/build-check.js", "../eval/build-battery/run.mjs", "../eval/build-battery/run-raw.mjs", "../eval/build-battery/inspect.mjs"]) {
    const found = scanRegexes(fs.readFileSync(path.join(HERE, f), "utf8"));
    assert.equal(found.length, 0, `${f}: ${JSON.stringify(found)}`);
  }
  const py = fs.readFileSync(path.join(HERE, "..", "eval", "build-battery", "page-facts.py"), "utf8").split("\n");
  assert.ok(!py.some((l) => l.trim() === "import re" || l.trim().startsWith("import re ") || l.trim().startsWith("from re ")), "page-facts.py imports no regex module");
});

test("words: a phrase is whole words in order; a word inside a longer word does not count", () => {
  assert.deepEqual(wordsOf("r/orca: 301 points!"), ["r", "orca", "301", "points"]);
  assert.equal(hasPhrase(wordsOf("a devoted fan"), "vote"), false);
  assert.equal(hasPhrase(wordsOf("cast a vote"), "vote"), true);
  assert.equal(hasPhrase(wordsOf("route 12 weekday"), "route 12"), true);
  assert.equal(hasPhrase(wordsOf("route 120"), "route 12"), false);
  assert.equal(satisfies("costs $5", { marks: ["$"] }), true);
  assert.equal(satisfies("the the 3", { all: ["the", "3"] }), true);
  assert.equal(satisfies("the only", { all: ["the", "3"] }), false);
});

test("items: a list of three matching items counts three, never the list as a fourth", () => {
  const tree = { t: "#root", x: "", c: [{ t: "ul", x: "", c: ["a vote", "b vote", "c vote"].map((x) => ({ t: "li", x, c: [] })) }] };
  assert.equal(innermostMatches(tree, { any: ["vote"] }).length, 3);
});

test("control: the engine's café output for the dolphin reddit fails that request and passes the coffee-shop control", () => {
  const dolphins = score("dolphin-reddit", CAFE_DOLPHINS);
  assert.equal(dolphins.pass, false);
  const failed = dolphins.results.filter((r) => !r.pass).map((r) => r.id);
  for (const id of ["votes", "comments", "posts", "cafe"]) assert.ok(failed.includes(id), `expected ${id} to fail: ${JSON.stringify(dolphins.results)}`);
  const cafe = score("coffee-shop-control", CAFE_DOLPHINS);
  assert.equal(cafe.pass, true, JSON.stringify(cafe.results));
});

test("reference: a real dolphin reddit page passes every check", () => {
  const v = score("dolphin-reddit", GOOD_REDDIT);
  assert.equal(v.pass, true, JSON.stringify(v.results.filter((r) => !r.pass)));
});

const PROGRAMS = {
  "bill-split": ["bill = 120\ntip = 0.18\nprint(f'Each person owes ${bill * (1 + tip) / 4:.2f}')", "print('Each person owes $30.00')"],
  "fahrenheit": ["f = 100\nprint(f'{f}F is {(f - 32) * 5 / 9:.2f}C')", "print('100F is 38.2C')"],
  "new-year-countdown": ["from datetime import date\nprint((date(2027, 1, 1) - date(2026, 9, 27)).days, 'days')", "print(95, 'days')"],
  "roman-1994": ["def roman(n):\n    vals = [(1000,'M'),(900,'CM'),(500,'D'),(400,'CD'),(100,'C'),(90,'XC'),(50,'L'),(40,'XL'),(10,'X'),(9,'IX'),(5,'V'),(4,'IV'),(1,'I')]\n    out = ''\n    for v, s in vals:\n        while n >= v:\n            out += s\n            n -= v\n    return out\nprint(roman(1994))", "print('MCMXCVI')"],
  "word-count": ["from collections import Counter\nfor w, n in Counter('the cat and the dog and the bird'.split()).most_common():\n    print(w, n)", "for w in 'the cat and the dog and the bird'.split():\n    print(w)"],
  "dolphin-orca-count": ["for i in range(1, 21):\n    print('DolphinOrca' if i % 15 == 0 else 'Dolphin' if i % 3 == 0 else 'Orca' if i % 5 == 0 else i)", "for i in range(1, 21):\n    print(i)"],
  "low-stock": ["stock = {'apples': 3, 'pears': 40, 'melon': 1}\nfor k, v in stock.items():\n    if v < 5:\n        print(k, v)", "stock = {'apples': 3, 'pears': 40, 'melon': 1}\nfor k, v in stock.items():\n    print(k, v)"],
};

test("reference programs pass, and a near-miss of each (right shape, wrong answer) fails", () => {
  for (const [id, [good, wrong]] of Object.entries(PROGRAMS)) {
    const ok = score(id, good);
    assert.equal(ok.pass, true, `${id} good: ${JSON.stringify(ok.results.filter((r) => !r.pass))}`);
    const bad = score(id, wrong);
    assert.equal(bad.pass, false, `${id} near-miss passed: ${JSON.stringify(bad.results)}`);
  }
});

test("kind: a page returned for a program request passes nothing, and a crashing program does not 'run'", () => {
  const v = score("bill-split", GOOD_REDDIT);
  assert.equal(v.pass, false);
  assert.ok(v.results.every((r) => !r.pass), `a wrong-kind artifact passed: ${JSON.stringify(v.results.filter((r) => r.pass))}`);
  const crash = score("roman-1994", "print('MCMXCIV')\nraise SystemExit(3)");
  assert.equal(crash.results.find((r) => r.id === "runs").pass, false);
});

test("unfence: the code inside the first fence, cut by position; unfenced text passes through", () => {
  assert.equal(unfence("here you go\n```python\nprint(1)\n```\nthanks"), "print(1)");
  assert.equal(unfence("print(2)"), "print(2)");
  assert.equal(unfence("```html\n<p>x</p>"), "<p>x</p>");
});
