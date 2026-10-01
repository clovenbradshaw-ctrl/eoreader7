// ═══ LOVELACE · TEACH IT TO FISH ═══ the cheap species are pinned three ways: what each fills, the control built to fail (a target redealt across the examples must never be called solved), and the limits.
import test from "node:test";
import assert from "node:assert/strict";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { FRESH } from "./diverse-fresh.mjs";
import { FRESH_C } from "./diverse-fresh-c.mjs";
import { cheapFill, fillSlot } from "./fielded-swarm.mjs";
import { solveContract, solveField, leaves } from "./synth-fields.mjs";
import { quotedIn, decideFromWords } from "./species.mjs";
import { composeFieldCode } from "./app-units.mjs";
import { runResults } from "./fold-experiment.mjs";

const SETS = { A: [...DIVERSE, ...HELDOUT], B: FRESH, C: FRESH_C };
const all = Object.values(SETS).flat(), by = Object.fromEntries(all.map((d) => [d.contract.name, d.contract]));
const sp = (n, k) => cheapFill(by[n])[k]?.species;

test("each species fills the slot kind it is for, in every set", () => {
  assert.equal(sp("bedReport", "status"), "decide"); assert.equal(sp("playerCard", "tier"), "decide"); assert.equal(sp("shipQuote", "tier"), "decide");
  assert.ok(["template", "joinPresent"].includes(sp("flightLeg", "route")), "an all-present join is a template or the join of the parts that exist"); assert.ok(["template", "joinPresent"].includes(sp("contactCard", "display")));
  assert.equal(sp("busTimes", "times"), "map"); assert.equal(sp("slotLabels", "labels"), "map");
  assert.equal(sp("cartTotal", "priciest"), "argmax"); assert.equal(sp("longestPost", "longest"), "argmax"); assert.equal(sp("wordStats", "longest"), "argmax");
  assert.equal(sp("readingTime", "longest"), "topk");
});

test("a decision list is read off the person's words — each quoted answer and its own clause — so three examples that fit several lists do not choose the wrong one", () => {
  const c = by.playerCard, terms = leaves(c).filter((t) => !t.arr && !t.constant).map((t) => ({ name: t.js.split(".").pop(), js: t.js, f: t.f }));
  const acc = solveContract(c).fields.find((f) => f.key === "accuracy"); terms.push({ name: "accuracy", js: `(${acc.js})`, f: acc.term.f });
  const r = decideFromWords(c, c.runs.slice(0, 3).map((x) => x.want().tier), terms);
  assert.match(r.js, />= 90 \? "gold".*>= 75 \? "silver".*"bronze"/, r.js);
  assert.deepEqual(quotedIn(c), ["gold", "silver", "bronze"]);
});

test("a whole unit every slot of which a cheap species filled passes the parent's whole oracle with no model — set A's seven flat tasks, set B's six and set C's four", () => {
  let whole = 0;
  for (const [set, ds] of Object.entries(SETS)) for (const d of ds) {
    const c = d.contract, keys = Object.keys(c.runs[0].want()); if (!c.runs[0].want() || Array.isArray(c.runs[0].want())) continue;
    const cheap = cheapFill(c); if (!keys.every((k) => cheap[k])) continue;
    const codes = Object.fromEntries(keys.map((k) => [k, `function ${k}Of(${c.params.join(", ")}) { return ${cheap[k].js}; }`]));
    assert.deepEqual(runResults(composeFieldCode(c, keys, codes), c, "exact"), c.runs.map(() => true), `${set}/${c.name}`); whole++;
  }
  assert.ok(whole >= 17, `${whole} whole units`);
});

test("the control built to fail: redeal every filled slot's targets across the shown examples — nothing may reproduce the true held-out runs", () => {
  let tried = 0, solved = 0;
  for (const d of all) {
    const c = d.contract, w0 = c.runs[0].want(); if (!w0 || typeof w0 !== "object" || Array.isArray(w0)) continue;
    const cheap = cheapFill(c), sol = solveContract(c), terms = leaves(c).filter((t) => !t.arr && !t.constant).map((t) => ({ name: t.js.split(".").pop(), js: t.js, f: t.f }));
    for (const f of sol.fields) if (f.kind === "solved") terms.push({ name: f.key, js: `(${f.js})`, f: f.term.f });
    for (const [k, v] of Object.entries(cheap)) {
      if (v.species === "copy") continue;
      const w = c.runs.slice(0, 3).map((r) => r.want()[k]); if (new Set(w.map((x) => JSON.stringify(x))).size < 2) continue;
      for (const rot of [1, 2]) {
        const vals = w.map((_, i) => w[(i + rot) % 3]); tried++;
        const r = v.species === "compose" ? solveField(c, k, vals).kind === "solved" : fillSlot(c, k, vals, terms);
        if (r) solved++;
      }
    }
  }
  assert.ok(tried >= 40, `${tried} redealt slots`); assert.equal(solved, 0, "a redealt target was filled and held on the true held-out runs");
});

test("LIMIT, pinned: what the species cannot do is left to the model and named — a conditional that answers with an input value, a substring, the best or mean of a list of numbers, a clamp", () => {
  for (const [n, k] of [["scoreboard", "winner"], ["initials", "initials"], ["gradeRow", "best"], ["gradeRow", "average"], ["bookFine", "daysLate"]]) assert.equal(cheapFill(by[n])[k], undefined, `${n}.${k} is outside the species`);
});
