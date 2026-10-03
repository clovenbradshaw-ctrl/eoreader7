// native/the-fold/lesson-atoms.js — CONSUME THE CODING-LESSON ATOMS.
//
// The lessons ledger is atomized (results/coding-lesson-atoms.json) as
// propositions with intent. This module is the pipeline's reader of them: given
// a task, it selects the lesson atoms whose INTENT matches the task's own —
// the same clause-core intent the atomizer used, never a keyword — and renders
// them as a grounded brief the loop can carry.
//
// The selection is disclosed: each returned atom says whether it matched on the
// exact core or a shared operand, so a caller (and a falsifier) can see WHY a
// lesson was chosen, not just that it was.
import fs from "node:fs";
import { loadEotParser, clauseCore } from "./eot-notation.js";

const DEFAULT = new URL("../eval/the-fold/results/coding-lesson-atoms.json", import.meta.url);

export function loadLessonAtoms(p = DEFAULT) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")).atoms ?? []; } catch { return []; }
}

const deMark = (s) => String(s ?? "").replace(/\*\*|\*|`|_|#/g, "").replace(/\s+/g, " ").trim();
const coreOf = (parser, s) => { const d = clauseCore(parser, deMark(s)); if (d) return d; const l = deMark(s); return clauseCore(parser, "You " + l.charAt(0).toLowerCase() + l.slice(1)); };

/** selectLessons(task, atoms, {max}) -> the lesson atoms whose intent matches
 *  the task's, ranked. Each carries `match:{exact, operand}` — why it was picked. */
export async function selectLessons(task, atoms, { max = 6 } = {}) {
  const parser = await loadEotParser();
  if (!parser.ok || !atoms?.length) return [];
  const cores = [];
  for (const s of String(task).split(/(?<=[.!?])\s+/)) { const c = coreOf(parser, s); if (c) cores.push(c); }
  if (!cores.length) return [];
  const scored = atoms.map((a) => {
    const set = new Set(a.intent ?? []);
    let exact = 0, operand = 0;
    for (const c of cores) {
      if (set.has(c)) { exact += 1; continue; }
      const op = c.split("|")[1];
      if (op && op !== "you" && (a.intent ?? []).some((i) => i.split("|")[1] === op)) operand += 1;
    }
    return { a, exact, operand, score: exact * 10 + operand };
  }).filter((x) => x.score > 0).sort((x, y) => y.score - x.score || x.a.n - y.a.n);
  return scored.slice(0, max).map((x) => ({ ...x.a, match: { exact: x.exact, operand: x.operand } }));
}

/** lessonBrief(task, atoms, {max}) -> a grounded brief of the matched lessons,
 *  or "" when none match (the loop then runs exactly as before). */
export async function lessonBrief(task, atoms, { max = 5 } = {}) {
  const sel = await selectLessons(task, atoms, { max });
  if (!sel.length) return { brief: "", selected: [] };
  const brief = [
    "EARNED LESSONS (rules paid for by prior failed runs — apply where they bear):",
    ...sel.map((s) => `- ${s.title}${s.action ? `: ${String(s.action).replace(/\s+/g, " ").slice(0, 180)}` : ""}`),
  ].join("\n");
  return { brief, selected: sel.map((s) => ({ n: s.n, title: s.title, match: s.match, where: s.where })) };
}
