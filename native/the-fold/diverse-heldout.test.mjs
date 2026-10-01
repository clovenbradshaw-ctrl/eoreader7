// ═══ LOVELACE ═══ the held-out set is itself tested, like the set it holds out from: each oracle accepts a correct reference, rejects a constant and rejects
// the characteristic slip of its task; the cards are offered where they apply and NOT where they do not (a control, and `roundTo` for a round-UP).
import test from "node:test";
import assert from "node:assert/strict";
import { HELDOUT, HELDOUT_REFERENCE } from "./diverse-heldout.mjs";
import { testUnit, unitPrompt, cardsShown } from "./app-units.mjs";
import { loadUnit } from "./unit-wall.mjs";

const by = Object.fromEntries(HELDOUT.map((d) => [d.contract.name, d]));

test("every held-out task: the reference passes its whole oracle, and the shown example reproduced as a constant fails the rows not shown", () => {
  for (const d of HELDOUT) {
    const c = d.contract, ok = testUnit(HELDOUT_REFERENCE[c.name], c);
    assert.deepEqual(ok.failures, [], c.name);
    const ref = loadUnit(HELDOUT_REFERENCE[c.name], c.name), frozen = JSON.stringify(ref(...c.runs[0].args()));
    assert.equal(testUnit(`function ${c.name}() { return ${frozen}; }`, c).ok, false, `${c.name}: reproducing the shown example must not pass`);
  }
});

test("each held-out oracle rejects its task's characteristic slip — the one a small model made on the dev task the card was found on", () => {
  const bad = {
    cartTotal: `function cartTotal(cart) { let total = 0, items = 0; for (const l of cart.lines) { total += parseFloat(l.price) * Number(l.count); items += Number(l.count); } return { items, total: roundTo(total, 2), priciest: "" }; }`, // parseFloat("$1,299.99") is NaN
    overdueReport: `function overdueReport(tasks, today) { return tasks.filter((t) => !t.done && t.due < today).map((t) => ({ title: t.title, daysLate: +today.slice(8) - +t.due.slice(8) })); }`, // day arithmetic on the string: breaks at month ends
    readingTime: `function readingTime(text) { const w = text.split(/\\s+/).filter(Boolean); return { words: w.length, minutes: Math.round(w.length / 200), longest: [] }; }`, // whitespace split and a nearest round
    groupTags: `function groupTags(items) { const m = {}; for (const a of items) for (const t of a.tags) (m[t] = m[t] || []).push(a.title); return Object.entries(m).map(([tag, titles]) => ({ tag, titles })); }`, // not sorted
    flattenTree: `function flattenTree(tree) { return (tree.children || []).map((c) => tree.name + "/" + c.name); }`, // one level only
  };
  for (const [n, code] of Object.entries(bad)) assert.equal(testUnit(code, by[n].contract).ok, false, `${n}: the slip must fail`);
});

test("the cards are offered where they apply and not where they do not: parseMoney, daysBetween, splitWords; nothing for the two controls; roundTo NOT for a round-up", () => {
  assert.deepEqual(cardsShown(by.cartTotal.contract).sort(), ["parseMoney", "roundTo"], "the total is rounded to 2 decimals, so roundTo applies here");
  assert.deepEqual(cardsShown(by.overdueReport.contract), ["daysBetween"]);
  assert.deepEqual(cardsShown(by.readingTime.contract), ["splitWords"], "minutes are rounded UP to a whole number: Math.ceil, not decimal places");
  assert.deepEqual(cardsShown(by.groupTags.contract), []); assert.deepEqual(cardsShown(by.flattenTree.contract), []);
  assert.doesNotMatch(unitPrompt(by.groupTags.contract), /already exist/); assert.doesNotMatch(unitPrompt(by.flattenTree.contract), /already exist/);
});

test("a reference that does NOT call the card still passes: the cards are offered, never required", () => {
  const plain = `function overdueReport(tasks, today) { const d = (s) => Math.round(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 86400000); return tasks.map((t, i) => ({ t, i, late: d(today) - d(t.due) })).filter(({ t, late }) => !t.done && late > 0).sort((a, b) => b.late - a.late || a.i - b.i).map(({ t, late }) => ({ title: t.title, daysLate: late })); }`;
  assert.deepEqual(testUnit(plain, by.overdueReport.contract).failures, []);
});
