// ═══ LOVELACE · TEACH IT TO FISH ═══ THE HELD-OUT SET. Written AFTER parseMoney, daysBetween and splitWords, for them — and for two negative controls — by someone not
// shaping the task to the card: new domains (a shopping cart, an overdue list, a reading-time estimate), new key names, new output shapes, so that a card which only
// helps the task it was found on shows up as a card that does not help here (P71 generality gate).
//
//   cartTotal     cart lines with mixed price strings -> items, total, priciest      cards: parseMoney          (money amounts, no tax, other keys)
//   overdueReport tasks + today -> overdue titles with days late                      cards: daysBetween         (the other side of the date question dueSoon asked)
//   readingTime   text -> words, minutes (÷200 rounded UP), three longest words       cards: splitWords          (ceil, not decimals: roundTo must NOT be offered)
//   groupTags     articles with tags -> tag -> titles, sorted                         NO card applies            NEGATIVE CONTROL
//   flattenTree   a nested menu -> leaf paths                                         NO card applies            NEGATIVE CONTROL
//
// An arm that makes a control worse, or a card that does nothing on a task made for it, is the finding.
import { clone, run, shownOf } from "./diverse-tasks.mjs";

const money = (v) => (typeof v === "number" ? v : Number(String(v).replace(/[$,\s]/g, "")));
const cents = (x) => Math.round(x * 100) / 100;

// ---- 1. cartTotal ----
export const cartWant = (cart) => {
  const lines = cart.lines; let best = null;
  for (const l of lines) { const v = money(l.price) * Number(l.count); if (best === null || v > best.v) best = { v, name: l.name }; }
  return { items: lines.reduce((s, l) => s + Number(l.count), 0), total: cents(lines.reduce((s, l) => s + money(l.price) * Number(l.count), 0)), priciest: best ? best.name : "" };
};
const CARTS = [
  { customer: "Ada", lines: [{ name: "Desk lamp", price: "$1,299.99", count: "1" }, { name: "Pens", price: "3.5", count: 12 }, { name: "Notebook", price: 7, count: "3" }] },
  { customer: "Bo", lines: [{ name: "A", price: "$10", count: 2 }, { name: "B", price: "$5.00", count: 4 }] },
  { customer: "Cy", lines: [] },
  { customer: "Di", lines: [{ name: "Cable", price: "$0.10", count: "3" }, { name: "Hub", price: "$24.99", count: 1 }] },
  { customer: "Ed", lines: [{ name: "Rug", price: "1,200", count: "2" }, { name: "Mat", price: " $45.50 ", count: 1 }] },
];
export const cartTotalContract = {
  name: "cartTotal", kind: "leaf", params: ["cart"], paramDoc: "shopping cart",
  doc: "Turn one shopping cart into how many items it holds, what it costs in total, and its priciest line.",
  returns: "an object { items, total, priciest }\n  items = the sum of every line's count, total = the sum of price × count over all lines, rounded to 2 decimals, priciest = the name of the line with the largest price × count (the first one if two are tied; \"\" for an empty cart)",
  notes: "A price is written as text like \"$1,299.99\" or \"89.5\", or as a plain number; a count may be text. Prices are US dollars.",
  shown: shownOf(["cart"], [CARTS[0]]), sampleJson: CARTS[0],
  example: { args: "", input: () => [clone(CARTS[0])], output: () => cartWant(CARTS[0]) },
  runs: CARTS.map((c, i) => run(i === 0 ? "the shown cart" : `cart ${i + 1}`, [c], cartWant, { total: 0.0051 })),
};

// ---- 2. overdueReport ----
const dayNo = (iso) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000);
export const overdueWant = (tasks, today) => tasks.map((t, i) => ({ t, i, late: dayNo(today) - dayNo(t.due) })).filter(({ t, late }) => !t.done && late > 0).sort((a, b) => b.late - a.late || a.i - b.i).map(({ t, late }) => ({ title: t.title, daysLate: late }));
const T = (title, due, done = false) => ({ title, due, done });
const OVERDUE = [
  [[T("Pay rent", "2026-09-28"), T("Dentist", "2026-10-20"), T("File taxes", "2026-09-30"), T("Old chore", "2026-09-01", true), T("Call Sam", "2026-09-28")], "2026-10-01"],
  [[T("Edge", "2026-02-27"), T("Next day", "2026-02-28"), T("Fine", "2026-03-02")], "2026-03-02"],
  [[T("Feb 29", "2028-02-29"), T("Feb 28", "2028-02-28")], "2028-03-01"],
  [[T("New Year's Eve", "2026-12-31")], "2027-01-02"], [[T("Later", "2026-01-05"), T("Today", "2026-01-01")], "2026-01-01"],
];
export const overdueReportContract = {
  name: "overdueReport", kind: "leaf", params: ["tasks", "today"], paramDoc: "to-do list and today's date",
  doc: "List the to-do items that are overdue, with how many days overdue each is.",
  returns: "an array of objects { title, daysLate }\n  one per task that is not done and whose due date is before today, daysLate = how many days after its due date today is, ordered by daysLate descending (most overdue first); tasks with the same daysLate keep their order in the list",
  notes: "Dates are ISO \"YYYY-MM-DD\". Count calendar days (months and leap years included). A task due today is not overdue.",
  shown: shownOf(["tasks", "today"], OVERDUE[0]), sampleJson: OVERDUE[0][0],
  example: { args: "", input: () => clone(OVERDUE[0]), output: () => overdueWant(...OVERDUE[0]) },
  runs: OVERDUE.map((d, i) => run(i === 0 ? "the shown list" : `list ${i + 1}`, d, overdueWant)),
};

// ---- 3. readingTime ----
export const readingWant = (text) => {
  const w = String(text).match(/[A-Za-z0-9']+/g) ?? [];
  const longest = [...new Set(w.map((x) => x.toLowerCase()))].sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0)).slice(0, 3);
  return { words: w.length, minutes: Math.ceil(w.length / 200), longest };
};
const PASSAGES = [
  "Reading speed varies, but most adults manage about two hundred words a minute; slow-moving, dense material takes longer, and skimming takes less.",
  Array.from({ length: 200 }, (_, i) => `w${i % 7}`).join(" "), Array.from({ length: 201 }, () => "echo").join(" "), "", "Don't stop -- it's a well-known fact: BIG words, big WORDS!",
];
export const readingTimeContract = {
  name: "readingTime", kind: "leaf", params: ["text"], paramDoc: "a passage of text",
  doc: "Estimate how long a passage takes to read.",
  returns: "an object { words, minutes, longest }\n  words = how many words, minutes = words divided by 200, rounded UP to a whole number of minutes (0 when there are no words), longest = the three longest different words in lowercase, longest first, words of equal length in alphabetical order",
  notes: "A word is a run of letters, digits and apostrophes; punctuation and hyphens separate words. Fewer than three different words gives a shorter list.",
  shown: shownOf(["text"], [PASSAGES[0]]), sampleJson: PASSAGES[0],
  example: { args: "", input: () => [PASSAGES[0]], output: () => readingWant(PASSAGES[0]) },
  runs: PASSAGES.map((t, i) => run(i === 0 ? "the shown passage" : `passage ${i + 1}`, [t], readingWant)),
};

// ---- 4. groupTags (negative control) ----
export const tagsWant = (items) => { const m = new Map(); for (const a of items) for (const t of a.tags) { if (!m.has(t)) m.set(t, []); m.get(t).push(a.title); } return [...m].map(([tag, titles]) => ({ tag, titles })).sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0)); };
const ARTICLES = [
  [{ title: "Intro", tags: ["js", "web"] }, { title: "Deep dive", tags: ["js"] }, { title: "Misc", tags: [] }, { title: "Servers", tags: ["web", "ops", "js"] }],
  [{ title: "Solo", tags: ["Zeta"] }, { title: "Pair", tags: ["alpha", "Zeta"] }], [], [{ title: "Repeat", tags: ["x", "x"] }, { title: "Other", tags: ["x"] }],
  [{ title: "Case", tags: ["Js", "js"] }],
];
export const groupTagsContract = {
  name: "groupTags", kind: "leaf", params: ["items"], paramDoc: "articles",
  doc: "Group a list of articles by their tags.",
  returns: "an array of objects { tag, titles }\n  one per distinct tag, ordered by tag alphabetically (plain character order), titles = the titles of the articles that carry that tag, in list order",
  notes: "An article with no tags appears under no tag. Tags are compared exactly as written, so \"Js\" and \"js\" are different tags. An article that repeats a tag is listed once per repeat.",
  shown: shownOf(["items"], [ARTICLES[0]]), sampleJson: ARTICLES[0],
  example: { args: "", input: () => [clone(ARTICLES[0])], output: () => tagsWant(ARTICLES[0]) },
  runs: ARTICLES.map((a, i) => run(i === 0 ? "the shown list" : `list ${i + 1}`, [a], tagsWant)),
};

// ---- 5. flattenTree (negative control) ----
export const treeWant = (node, prefix = "") => { const path = prefix ? `${prefix}/${node.name}` : node.name; const kids = node.children ?? []; return kids.length ? kids.flatMap((k) => treeWant(k, path)) : [path]; };
const TREES = [
  { name: "Menu", children: [{ name: "Food", children: [{ name: "Soup" }, { name: "Salad", children: [{ name: "Green" }, { name: "Caesar" }] }] }, { name: "Drinks" }] },
  { name: "Solo" }, { name: "Empty", children: [] }, { name: "A", children: [{ name: "B", children: [{ name: "C", children: [{ name: "D" }] }] }] },
  { name: "Root", children: [{ name: "x", children: [] }, { name: "y" }] },
];
export const flattenTreeContract = {
  name: "flattenTree", kind: "leaf", params: ["tree"], paramDoc: "a nested menu",
  doc: "List every leaf of a nested menu as a path.",
  returns: "an array of strings\n  one per leaf (an entry with no children), its path from the root joined with \"/\", depth-first in list order",
  notes: "The root's own name starts every path. An entry whose children list is empty, or absent, is a leaf; a root that is a leaf gives just its own name.",
  shown: shownOf(["tree"], [TREES[0]]), sampleJson: TREES[0],
  example: { args: "", input: () => [clone(TREES[0])], output: () => treeWant(TREES[0]) },
  runs: TREES.map((t, i) => run(i === 0 ? "the shown menu" : `menu ${i + 1}`, [t], (x) => treeWant(x))),
};

export const HELDOUT = [
  { contract: cartTotalContract, role: "cards", note: "parseMoney" }, { contract: overdueReportContract, role: "cards", note: "daysBetween" },
  { contract: readingTimeContract, role: "cards", note: "splitWords (and NOT roundTo: the rounding is up, not decimals)" },
  { contract: groupTagsContract, role: "control", note: "no card" }, { contract: flattenTreeContract, role: "control", note: "no card" },
].map((d) => ({ ...d, contract: { ...d.contract, salt: "heldout-1" } }));

/** reference solutions — for the tests only; never shown to a model */
export const HELDOUT_REFERENCE = {
  cartTotal: `function cartTotal(cart) { let items = 0, total = 0, best = -Infinity, priciest = ""; for (const l of cart.lines) { const v = parseMoney(l.price) * Number(l.count); items += Number(l.count); total += v; if (v > best) { best = v; priciest = l.name; } } return { items, total: roundTo(total, 2), priciest }; }`,
  overdueReport: `function overdueReport(tasks, today) { return tasks.map((t, i) => ({ t, i, late: daysBetween(t.due, today) })).filter(({ t, late }) => !t.done && late > 0).sort((a, b) => b.late - a.late || a.i - b.i).map(({ t, late }) => ({ title: t.title, daysLate: late })); }`,
  readingTime: `function readingTime(text) { const w = splitWords(text); const longest = [...new Set(w.map((x) => x.toLowerCase()))].sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0)).slice(0, 3); return { words: w.length, minutes: Math.ceil(w.length / 200), longest }; }`,
  groupTags: `function groupTags(items) { const m = new Map(); for (const a of items) for (const t of a.tags) { if (!m.has(t)) m.set(t, []); m.get(t).push(a.title); } return [...m].map(([tag, titles]) => ({ tag, titles })).sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0)); }`,
  flattenTree: `function flattenTree(tree) { const go = (n, p) => { const path = p ? p + "/" + n.name : n.name; const k = n.children || []; return k.length ? k.flatMap((c) => go(c, path)) : [path]; }; return go(tree, ""); }`,
};
