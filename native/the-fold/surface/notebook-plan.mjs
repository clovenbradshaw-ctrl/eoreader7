// notebook-plan.mjs — a question in plain language -> which file, which columns, which analyses. It POINTS; it never writes code.
//
//   with a model (opts.ask): the model may only choose from the recipe ids and column names it is shown (a schema-constrained
//   pointer); anything else it says is refused. Without one: retrieval overlap between the question and each recipe's description,
//   which is a plain word match — it is told to the person as such, along with every word of the question that matched nothing.
import { tokenize } from "../../organs/source.js";
import { RECIPES, ALL_WORDS } from "./notebook-recipes.mjs";

const isTime = (n) => /^(t|time|time_?s|t_?s|timestamp)$/i.test(n);
const stem = (w) => w.replace(/(ies|es|s)$/, "");
export function numericColumns(table, sample = 300) {
  return table.header.filter((h, j) => {
    if (isTime(h)) return false;
    const vals = table.rows.slice(0, sample).map((r) => r[j]).filter((x) => x !== "" && x != null);
    return vals.length >= 0.5 * Math.min(sample, table.rows.length) && vals.every((x) => Number.isFinite(Number(x)));
  });
}
const words = (s) => String(s).toLowerCase().split(/[^a-z0-9\-\/]+/).filter(Boolean);

/** plan(question, files, { ask }) -> { file, table, columns, recipes, matched, unmatched, via, refusal? } (async) */
export async function plan(question, files, { ask = null } = {}) {
  const withTables = files.filter((f) => f.tables?.length);
  if (!withTables.length) return { refusal: "no table has been ingested — /ingest a csv, xlsx or a tabular file first (a PDF's text is not a time series)" };
  const qw = new Set(words(question).map(stem));
  const named = withTables.filter((f) => words(f.name.replace(/\.[a-z0-9]+$/i, "")).some((w) => qw.has(stem(w)) && w.length > 2));
  const file = (named[0] ?? withTables.at(-1)); const table = file.tables[0];
  const numeric = numericColumns(table);
  if (!numeric.length) return { refusal: `${file.name} has no numeric columns to analyse`, file: file.name };
  const UNITS = new Set(["mps", "s", "hz", "k", "m", "ms", "pa"]);
  const said = numeric.filter((c) => words(c).some((w) => !UNITS.has(w) && qw.has(stem(w))));
  let columns = said.length ? said : numeric, scores = {}, via = "word match between the question and each analysis's description (no model)";
  let recipes;
  if (ask) {
    try {
      const got = await ask({ question, recipes: RECIPES.map((r) => ({ id: r.id, desc: r.desc })), columns: numeric });
      const okR = (got.recipes ?? []).filter((id) => RECIPES.some((r) => r.id === id)), okC = (got.columns ?? []).filter((c) => numeric.includes(c));
      if (okR.length) { recipes = okR; if (okC.length) columns = okC; via = "a model pointed at the analyses and columns (it could only choose from the list shown)"; }
    } catch (e) { via += ` — the model was unreachable (${String(e.message).slice(0, 60)}), so the word match was used`; }
  }
  const qtok = tokenize(String(question).replace(/[-\/]/g, " ")).map(stem);
  if (!recipes) {
    const all = [...qw].some((w) => ALL_WORDS.has(w));
    for (const r of RECIPES) scores[r.id] = [...new Set(qtok)].filter((t) => new Set(tokenize(r.desc).map(stem)).has(t));
    recipes = all ? RECIPES.map((r) => r.id) : RECIPES.filter((r) => scores[r.id].length).map((r) => r.id);
    if (all) via = "your words asked for everything, so every analysis";
  }
  if (!recipes.length) return { refusal: `nothing in the question matched an analysis I have. I can do: ${RECIPES.map((r) => `${r.id} (${r.title})`).join("; ")}. Say which, or "everything".`, file: file.name, columns };
  if (!recipes.includes("quality")) recipes = ["quality", ...recipes]; // a claim about a signal is only as good as its cleaning: always shown first
  const matchedWords = new Set(recipes.flatMap((id) => scores[id] ?? []));
  const unmatched = [...new Set(qtok)].filter((t) => !matchedWords.has(t) && !numeric.some((c) => words(c).map(stem).includes(t)));
  return { file: file.name, table, columns, recipes, matched: [...matchedWords], unmatched, via, scores };
}
