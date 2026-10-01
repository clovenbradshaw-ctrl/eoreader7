// ═══ LOVELACE · TEACH IT TO FISH ═══ the species built on the app's own leaves (branch, optional, coalesce, joinPresent, null) are tested where they were NOT looked at (set D), against a control built to fail, and at their stated limits.
import test from "node:test";
import assert from "node:assert/strict";
import { FRESH_D, luggageTagContract, ticketCodeContract } from "./diverse-fresh-d.mjs";
import { cheapFill } from "./fielded-swarm.mjs";
import { optional, coalesce, joinPresent, nullConstant, branch, optionalStrings } from "./species.mjs";
import { runResults } from "./fold-experiment.mjs";
import { composeFieldCode } from "./app-units.mjs";

const species = (c) => Object.fromEntries(Object.entries(cheapFill(c)).map(([k, v]) => [k, v.species]));
const NEW = new Set(["branch", "optional", "coalesce", "joinPresent", "null"]);

test("set D (written after the species, not edited after its first run): the shapes they were not looked at on fill, and every whole unit passes its oracle", () => {
  assert.deepEqual(species(luggageTagContract), { id: "copy", who: "coalesce", weight: "branch", lane: "joinPresent", note: "null" });
  let units = 0;
  for (const { contract: c, role } of FRESH_D) {
    const cheap = cheapFill(c), keys = Object.keys(c.runs[0].want());
    if (!keys.every((k) => cheap[k])) { assert.equal(role, "outside", `${c.name}: only the task written to sit outside may be left unfilled`); continue; }
    const codes = Object.fromEntries(keys.map((k) => [k, `function ${k}Of(${c.params.join(", ")}) { return ${cheap[k].js}; }`]));
    assert.ok(runResults(composeFieldCode(c, keys, codes), c, "exact").every(Boolean), `${c.name}: the composed unit passes its oracle`); units++;
  }
  assert.equal(units, 3);
});

test("LIMIT, pinned: a code built from slices and a padded number is outside every species — the model's slot, said so, not a silent miss", () => {
  const s = species(ticketCodeContract);
  assert.equal(s.code, undefined, "no species fills a substring-and-pad");
  assert.equal(s.desk, "copy");
});

test("a default is kept ONLY when a run falls through to it: nickname-or-first has no invented third arm", () => {
  const f = cheapFill(luggageTagContract).who.js;
  assert.equal(f, 'bag.owner?.nickname || bag.owner?.first');
  assert.doesNotMatch(f, /"metric"/, "a quoted word from the person's words that never fires is not a rule");
});

test("CONTROL built to fail: with every slot's targets REDEALT (rotated one run along), none of the new species fills anything", () => {
  for (const { contract: c } of FRESH_D) {
    const keys = Object.keys(c.runs[0].want()), n = c.runs.length;
    const rotated = { ...c, runs: c.runs.map((r, i) => ({ ...r, want: () => Object.fromEntries(keys.map((k) => [k, c.runs[(i + 1) % n].want()[k]])) })) };
    const varies = keys.filter((k) => new Set(c.runs.map((r) => JSON.stringify(r.want()[k]))).size > 1);
    const s = species(rotated);
    for (const k of varies) assert.ok(!NEW.has(s[k]), `${c.name}.${k}: a redealt target must not be filled by ${s[k]}`);
  }
});

test("a null constant needs the person's words to say null: all-null answers with no such word are not filled", () => {
  const wants = [null, null, null];
  assert.equal(nullConstant({ doc: "d", returns: "an object", notes: "", runs: [] }, wants), null);
  assert.deepEqual(nullConstant({ doc: "d", returns: "note = null (never carries one)", notes: "", runs: [] }, wants).js, "null");
});

test("branch refuses a parameter that merely correlates: one value per side with a single run each is not enough to be a rule", () => {
  const c = { ...luggageTagContract, runs: luggageTagContract.runs.slice(0, 2) };
  assert.equal(branch(c, "weight"), null, "two runs cannot show both sides twice");
});

test("a key that is not a legal dotted name is reached by brackets (OpenStreetMap's `addr:street`)", () => {
  const data = [[{ tags: { "addr:housenumber": "12", "addr:street": "Oak" } }], [{ tags: { "addr:street": "Pine" } }], [{ tags: { "addr:housenumber": "7", "addr:street": "Elm" } }], [{ tags: {} }], [{ tags: { "addr:housenumber": "3", "addr:street": "Fir" } }]];
  const want = ([e]) => [e.tags["addr:housenumber"], e.tags["addr:street"]].filter(Boolean).join(" ") || null;
  const c = { name: "addr", params: ["e"], doc: "d", returns: "the housenumber and the street joined by a space, or null if neither exists", notes: "", runs: data.map((d) => ({ args: () => JSON.parse(JSON.stringify(d)), want: () => want(d) })) };
  const r = joinPresent(c, c.runs.slice(0, 3).map((x) => x.want()), (f) => c.runs.slice(3).every((x) => JSON.stringify(f(x.args())) === JSON.stringify(x.want())));
  assert.ok(r, "joined, with the missing parts left out and null when none exist");
  assert.match(r.js, /\["addr:street"\]/);
  assert.ok(optionalStrings(c).some((l) => /\["addr:housenumber"\]/.test(l.js)));
  void optional; void coalesce;
});

// ---- slice and normalize (built on the app's metnoHour, tested on invented shapes) ----
import { slice, normalize } from "./species.mjs";
const mkc = (returns, notes, data, wantOf) => ({ name: "t", params: ["x"], doc: "d", returns, notes, runs: data.map((d) => ({ args: () => JSON.parse(JSON.stringify([d])), want: () => wantOf(d) })) });
const holdsOn = (c) => (f) => c.runs.slice(3).every((r) => { try { return JSON.stringify(f(r.args())) === JSON.stringify(r.want()); } catch { return false; } });

test("slice finds a fixed stretch of a string and the held-out runs confirm it; a stretch that only fits the shown ones is refused", () => {
  const data = [{ ts: "2026-10-01T08:30:15Z" }, { ts: "2027-01-12T21:05:59Z" }, { ts: "2025-06-30T00:00:01Z" }, { ts: "2024-02-29T13:45:00Z" }, { ts: "2030-12-31T23:59:59Z" }];
  const c = mkc("the date", "", data, (d) => d.ts.slice(0, 10));
  const r = slice(c, c.runs.slice(0, 3).map((x) => x.want()), holdsOn(c));
  assert.ok(r && /\.slice\(0, 10\)/.test(r.js), r?.js);
  const redealt = { ...c, runs: c.runs.map((x, i) => ({ ...x, want: () => c.runs[(i + 1) % 5].want() })) };
  assert.equal(slice(redealt, redealt.runs.slice(0, 3).map((x) => x.want()), holdsOn(redealt)), null, "control: redealt targets are not a slice of anything");
});

test("normalize uses only the operations the words name, and a stated ending only if the words say it", () => {
  const data = [{ code: "clearsky_day" }, { code: "rain_night" }, { code: "partly_cloudy_polartwilight" }, { code: "fog" }, { code: "heavy_snow_day" }];
  const want = (d) => d.code.replace(/_(day|night|polartwilight)$/, "").replace(/_/g, " ");
  const withWords = mkc("the symbol, any ending _day, _night or _polartwilight removed, underscores as spaces", "", data, want);
  const r = normalize(withWords, withWords.runs.slice(0, 3).map((x) => x.want()), holdsOn(withWords));
  assert.ok(r, "fills when the words name the endings");
  assert.match(r.js, /_day\|_night\|_polartwilight/);
  const silent = mkc("the symbol made readable", "", data, want);
  assert.equal(normalize(silent, silent.runs.slice(0, 3).map((x) => x.want()), holdsOn(silent)), null, "the endings are not in the words, so they are not guessed");
});

// ---- guard ----
import { guard } from "./species.mjs";
test("guard finds the yes/no 'nothing to return' from the words and every run; a constant or a coincidence is not a rule", () => {
  const data = [{ id: 1, pos: "4.5", alt: "x" }, { id: 2, pos: "7.25", alt: "y" }, { id: 3, pos: "oops", alt: "z" }, { id: 4, pos: "9", alt: "w" }, { id: 5, pos: "n/a", alt: "v" }];
  const c = { name: "g", params: ["p"], doc: "d", returns: "the place, or null if its pos is not a number", notes: "", runs: data.map((d) => ({ args: () => JSON.parse(JSON.stringify([d])), want: () => (Number.isNaN(parseFloat(d.pos)) ? null : { id: d.id }) })) };
  const g = guard(c);
  assert.ok(g && /parseFloat\(p\?\.pos\)/.test(g.js), g?.js);
  const allSame = { ...c, runs: c.runs.map((r) => ({ ...r, want: () => ({ id: 1 }) })) };
  assert.equal(guard(allSame), null, "no null run: nothing to learn a guard from");
  const redealt = { ...c, runs: c.runs.map((r, i) => ({ ...r, want: () => (i % 2 ? null : { id: i }) })) };
  assert.equal(guard(redealt), null, "CONTROL: nulls assigned by position are not any predicate of the input");
});

// ---- scrape (a whole leaf read out of a string of HTML text) ----
import { scrape } from "./species.mjs";
const page = (rows, extra = "") => `<html><body><h1>Stats</h1><table>${rows.map(([k, v]) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`).join("")}</table><ul>${extra}</ul></body></html>`;
const mkScrape = (params, data, wantOf) => ({ name: "s", kind: "leaf", params, doc: "d", returns: "r", notes: "", runs: data.map((d) => ({ args: () => [...d], want: () => wantOf(...d) })) });

test("scrape: the value after the cell holding a parameter's text — found from where the example sits, held to every other page", () => {
  const rows = [[["Oak", 12], ["Pine", 7], ["Elm", 31]], [["Pine", 9], ["Oak", 4], ["Ash", 18]], [["Ash", 2], ["Fir", 66], ["Oak", 5]], [["Elm", 40], ["Oak", 88], ["Fir", 3]], [["Oak", 1], ["Elm", 2]]];
  const data = rows.flatMap((r) => [[page(r), "Oak"], [page(r), "Elm"], [page(r), "Zzz"]]).slice(0, 12);
  const want = (h, label) => { const m = new RegExp(`<td class="k">${label}</td><td class="v">(\\d+)</td>`).exec(h); return m ? Number(m[1]) : null; };
  const c = mkScrape(["html", "label"], data, want);
  const r = scrape(c);
  assert.ok(r && /indexOf\(">" \+ label \+ "<"\)/.test(r.body), r?.body);
  const redealt = { ...c, runs: c.runs.map((x, i) => ({ ...x, want: () => c.runs[(i + 1) % c.runs.length].want() })) };
  assert.equal(scrape(redealt), null, "CONTROL: redealt answers are not read off any page");
});

test("scrape: the last (or first) match of the tag before the value; a string that is not markup is not a scrape", () => {
  const data = ["a", "b", "c", "d"].map((x, i) => [`<div><span class="w">old</span><span class="w">${x}${i}</span></div>`]);
  const c = mkScrape(["html"], data, (h) => /<span class="w">([^<]*)<\/span><\/div>/.exec(h)[1]);
  assert.match(scrape(c).body, /m\[m\.length - 1\]\[1\]/);
  const plain = mkScrape(["text"], [["hello world"], ["foo bar"], ["x y"]], (t) => t.split(" ")[0]);
  assert.equal(scrape(plain), null);
});
