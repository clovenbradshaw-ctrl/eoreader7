#!/usr/bin/env node
// native/eval/reach/revise.mjs — "we can track all changes and revise as needed", run.
//
// Direction (user, 2026-09-30): every change is tracked on an append-only record, so a change
// that turns out to have broken something need not be prevented perfectly — it can be revised.
// The battery says how often a writer's edit breaks what it could not see. This driver asks the
// next question, of the edits that did: if the landing is an entry on a record, the integrity
// check (`partialRenames`, derived from the artifact before and after and nothing else — no
// language, no medium, no ethics) marks the entry CONTESTED, and the writer gets ONE repair turn
// shown what the check found, does the loop repair it?
//
// THE LOOP. The writer's edit is applied as recorded (the landed text). Where the derived check
// flags a partial rename, the record keeps the entry, marks it contested, and leaves the HEAD at
// the original artifact. One repair turn is then appended: the same task, the same edit contract,
// the change as recorded, and — depending on the condition — what the check found. The repair is
// applied only to the text the writer is shown. The head moves to the repaired text only if it
// passes the same derived check; otherwise the entry stays contested and the head stays put
// (nothing is delivered, nothing is broken). Every state is scored by executing it, exactly as in
// the battery.
//
// CONDITIONS (same model, same seed rule, same edit contract; they differ only in what the repair
// turn is shown):
//   again    the change as recorded, and the region as it now stands. A second turn and nothing
//            derived. The writer still sees only its region.
//   decoy    + as many other lines of the file as `derived` shows, drawn at random (seeded by the
//            run) from lines that are neither the region, nor a dependent, nor contain a flagged
//            name, under the same framing. The control built to fail: if extra lines help as much
//            as the derived ones, what helps is not what the check found.
//   lines    + the lines of the file that still contain a name the change removed elsewhere (the
//            dangling lines), under the same framing, with no sentence about them.
//   derived  lines + the derived finding, as a fact, in counts: "Names the change removed in some
//            places and left in others: price (3 before, 1 after)." No caution word, no advice.
//
// INPUT. The recorded runs of the reach battery (raw records) whose writer saw only its region
// (bare, placebo, stance, wisdom, goal) on a coupled task, whose landed edit the derived check
// flags, and which leave the flagged name on at least one line outside the region. Up to PER_TASK
// per task, chosen by a seeded hash of the run key. The decoy arm is excluded: its writer saw
// extra lines and could have landed edits outside the region.
//
// PRE-REGISTERED PREDICTIONS (written before any live repair run, scored mechanically by
// reviseRows(); thresholds are conventions, not derived):
//   R1  derived: the repair turn turns >= 50% of the flagged landings into success (the requested
//       change is present AND everything that worked before still works).
//   R2  again: a second turn with nothing derived repairs <= 10%: the writer still sees only its
//       region, and the ceiling says it cannot.
//   R3  decoy: <= 15% success, and derived beats decoy by >= 0.30: what repairs is the content
//       the check found, not the fact that more text was shown.
//   R4  lines ≈ derived on success (within 0.15): the lines carry the repair; the sentence that
//       names the finding adds little once the dangling lines are in front of the writer. If
//       derived beats lines by more, the finding itself is doing work.
//   R5  the landing rule: under `derived`, the harm that reaches the head is <= 10% of the flagged
//       landings and the head holds a successful change in >= 40% (the rest is the contested
//       entry left unresolved: nothing delivered, nothing broken).
//   R6  the repair turn does not itself do collateral damage (a line that is neither the region
//       nor a dependent removed) in more than 10% of `derived` runs.
//
// WHAT THIS DOES NOT SHOW. It is a repair of edits that a small model made when it could not see
// the parts that stand on them; the repair writer is handed exactly what the check found, so the
// question is whether a small writer USES derived feedback, not whether feedback can be derived.
// The derived check is blind to a change that keeps every name (a signature change with
// one-letter parameters, a shape change, a name assembled at run time): those landings are never
// flagged and never enter the loop — the table "what the check could not see" counts them. The
// record can revert only what is on the record; a change that leaves the file (a message sent, a
// row written to a system that keeps no log) cannot be revised by this loop at all.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TASKS } from "./tasks.mjs";
import { checkTask, htmlAvailable, closeBrowser } from "./check.mjs";
import {
  ask, readRecords, afterOf, partialRenames, nameCounts, surfaceForms, applyEditsToView, scoreOutcome, collateralIn,
  fnv, mulberry, pairedTasks, wilson, signTest, HOW, OTHER_LINES, fence, REACH_K,
} from "./battery.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONDITIONS = Object.freeze(["again", "decoy", "lines", "derived"]);
/** Writers that saw only their region: a landed edit of theirs can only have changed the region. */
export const SOURCE_ARMS = Object.freeze(["bare", "placebo", "stance", "wisdom", "goal"]);
export const PER_TASK = 5; // landings repaired per task. Declared, not tuned: 11 tasks x 4 conditions fits one afternoon of CPU.
export const REPAIR_K = REACH_K; // dangling lines shown at most. Same as the battery's derived reach.

// ── the record of a landed change ────────────────────────────────────────────
const lineTable = (text) => { let o = 0; return text.split("\n").map((t, i) => { const r = { line: i + 1, text: t, start: o, end: o + t.length }; o += t.length + 1; return r; }); };
const overlaps = (l, r) => l.end > r.start && l.start < r.end;
const hasName = (text, names) => { const c = nameCounts(text); return names.some((n) => c.has(n)); };

/** Where the region sits in the landed text of a writer that could only edit the region (what precedes and follows is unchanged). */
export function landedRegion(task, landed) {
  const at = task.artifact.indexOf(task.region);
  if (at < 0) return null;
  const prefix = task.artifact.slice(0, at);
  const suffix = task.artifact.slice(at + task.region.length);
  if (landed.length < prefix.length + suffix.length || !landed.startsWith(prefix) || !landed.endsWith(suffix)) return null;
  return { start: prefix.length, end: landed.length - suffix.length };
}

/** The lines outside the region that still contain a name the change removed elsewhere — what the derived check points at. */
export function danglingLines(task, landed, names, { k = REPAIR_K } = {}) {
  const reg = landedRegion(task, landed);
  if (!reg) return [];
  return lineTable(landed).filter((l) => l.text.trim() && !overlaps(l, reg) && hasName(l.text, names)).slice(0, k);
}

/** The control: the same number of lines, seeded by the run, that are none of: the region, a dependent, a line holding a flagged name. */
export function decoyLines(task, landed, names, n, key) {
  const reg = landedRegion(task, landed);
  const pool = lineTable(landed).filter((l) => l.text.trim() && !(reg && overlaps(l, reg)) && !hasName(l.text, names) && !task.dependents.some((d) => l.text.includes(d)));
  const rnd = mulberry(fnv(`revise-decoy|${key}`));
  for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n).sort((a, b) => a.line - b.line);
}

/** The change as the record holds it: the edits that landed, verbatim and in order. */
export function changeRecord(edits) {
  return `The change already made to the file, as recorded:\n${edits.map((e) => `- replaced ${JSON.stringify(e.find)} with ${JSON.stringify(e.replace)}`).join("\n")}`;
}
/** The derived finding, as a fact in counts. Names are given as the file spells them. */
export function findingSentence(before, landed, names) {
  const a = nameCounts(before);
  const b = nameCounts(landed);
  const surface = surfaceForms(`${before}\n${landed}`);
  return `Names the change removed in some places and left in others: ${names.map((n) => `${surface.get(n) ?? n} (${a.get(n)} before, ${b.get(n)} after)`).join(", ")}.`;
}

/** The repair turn's prompt. `shown` is the extra lines (none for `again`). */
export function repairPrompt(task, { landed, edits, names, condition, shown }) {
  const reg = landedRegion(task, landed);
  const parts = [`Task: ${task.request}`, HOW, changeRecord(edits)];
  if (condition === "derived") parts.push(findingSentence(task.artifact, landed, names));
  parts.push(fence("Text you may change:", landed.slice(reg.start, reg.end)));
  if (shown.length) parts.push(fence(OTHER_LINES, shown.map((s) => s.text).join("\n")));
  return parts.join("\n\n");
}
/** The characters the repair writer may change: the region as it now stands, and the extra lines shown. */
export function repairSegments(task, landed, shown) {
  const reg = landedRegion(task, landed);
  return [{ start: reg.start, end: reg.end }, ...shown.map((l) => ({ start: l.start, end: l.end }))].sort((x, y) => x.start - y.start);
}
/** What each condition shows on top of the region. */
export function shownFor(task, item, condition) {
  if (condition === "again") return [];
  if (condition === "decoy") return decoyLines(task, item.landed, item.names, item.lines.length, item.source.key);
  return item.lines; // lines, derived
}

// ── the input: flagged landings of the recorded battery ──────────────────────
export function selectLandings(records, { perTask = PER_TASK } = {}) {
  const by = new Map();
  let flagged = 0;
  let noOutside = 0;
  for (const r of records) {
    if (r.error || r.kind !== "coupled" || !SOURCE_ARMS.includes(r.arm)) continue;
    const a = afterOf(r);
    if (!a) continue;
    const names = partialRenames(a.task.artifact, a.text);
    if (!names.length) continue;
    flagged += 1;
    const lines = danglingLines(a.task, a.text, names);
    if (!lines.length) { noOutside += 1; continue; }
    const rows = by.get(r.task) ?? [];
    rows.push({ source: r, task: a.task, landed: a.text, edits: r.parsed.edits, names, lines });
    by.set(r.task, rows);
  }
  const selected = [];
  for (const id of [...by.keys()].sort()) {
    const rows = by.get(id).sort((x, y) => fnv(`revise-select|${x.source.key}`) - fnv(`revise-select|${y.source.key}`) || (x.source.key < y.source.key ? -1 : 1));
    selected.push(...rows.slice(0, perTask));
  }
  const eligible = [...by.values()].reduce((n, rows) => n + rows.length, 0);
  return { selected, flagged, noOutside, eligible, capped: eligible - selected.length };
}

// ── one repair ───────────────────────────────────────────────────────────────
export async function repairOne(item, condition, { seed, askFn = ask } = {}) {
  const { task, landed, edits, names, source } = item;
  const shown = shownFor(task, item, condition);
  const prompt = repairPrompt(task, { landed, edits, names, condition, shown });
  let raw;
  try { raw = await askFn(prompt, { seed }); } catch (e) { return { error: `model call failed: ${e.message}`, prompt }; }
  let parsed = null;
  try { parsed = JSON.parse(raw.text); } catch { /* recorded below */ }
  const applied = parsed ? applyEditsToView(landed, repairSegments(task, landed, shown), parsed.edits) : { ok: false, reason: "the response was not valid JSON" };
  // A refused or empty repair appends nothing: the landed text stands, and it is the flagged one.
  const final = applied.ok ? applied.text : landed;
  const checked = await checkTask(task, final);
  const s = scoreOutcome({ task, before: task.artifact, after: final, flagged: false, checked });
  const derivedClean = partialRenames(task.artifact, final).length === 0;
  // The landing rule: the head moves only to a text that passes the same derived check; otherwise it stays at the original.
  const headMoves = derivedClean && final !== task.artifact;
  const head = headMoves ? { changed: s.changed, success: s.success, harm: s.harm } : { changed: false, success: false, harm: false };
  const reg = landedRegion(task, landed);
  return {
    sourceKey: source.key, sourceArm: source.arm, names, shown: shown.map((l) => l.line), prompt, raw: raw.text, ms: raw.ms, tokens: raw.tokens, parsed,
    applied: { ok: applied.ok, reason: applied.reason ?? null, noop: !!applied.noop, replaced: applied.replaced ?? 0 },
    checked, ...s, derivedClean, head,
    touchedOutside: !(final.startsWith(landed.slice(0, reg.start)) && final.endsWith(landed.slice(reg.end))),
    repaired: applied.ok && !applied.noop && final !== landed,
    reverted: final === task.artifact, // the repair undid the change: the entry is withdrawn, and the file is what it was
    collateral: final !== task.artifact && collateralIn(task, final),
  };
}

export function plan(selected, { conditions = CONDITIONS, order = 1 } = {}) {
  const items = [];
  for (const item of selected) for (const condition of conditions) items.push({ item, condition, key: `${item.source.key}|${condition}` });
  const rnd = mulberry(order);
  for (let i = items.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
  return items;
}
export async function runRevise({ file, selected, conditions = CONDITIONS, order = 1, concurrency = 2, askFn = ask, model = "?", log = () => {} } = {}) {
  const done = new Set();
  if (file && fs.existsSync(file)) {
    for (const r of readRecords(file)) done.add(r.key);
    const text = fs.readFileSync(file, "utf8");
    if (text && !text.endsWith("\n")) fs.appendFileSync(file, "\n");
  }
  const todo = plan(selected, { conditions, order }).filter((x) => !done.has(x.key));
  let next = 0;
  let finished = 0;
  const worker = async () => {
    for (;;) {
      const i = next; next += 1;
      if (i >= todo.length) return;
      const { item, condition, key } = todo[i];
      const rec = await repairOne(item, condition, { seed: fnv(`${key}|${order}|revise`), askFn });
      const row = { key, task: item.task.id, family: item.task.family, kind: item.task.kind, condition, order, model, at: new Date().toISOString(), ...rec };
      if (file) fs.appendFileSync(file, `${JSON.stringify(row)}\n`);
      finished += 1;
      log(`${finished}/${todo.length} ${key} ${row.error ? `ERROR ${row.error}` : row.success ? "repaired" : row.harm ? "still-harm" : "no change"}`);
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { planned: todo.length, alreadyDone: done.size };
}

// ── reading the records ──────────────────────────────────────────────────────
const asArms = (rows) => rows.filter((r) => !r.error).map((r) => ({ ...r, arm: r.condition }));
export function summarizeRevise(rows) {
  const out = {};
  for (const c of CONDITIONS) {
    const rs = rows.filter((r) => !r.error && r.condition === c);
    const n = rs.length;
    const k = (f) => rs.filter(f).length;
    out[c] = {
      n, success: k((r) => r.success), harm: k((r) => r.harm), unchanged: k((r) => !r.repaired),
      repaired: k((r) => r.repaired), reverted: k((r) => r.reverted), touchedOutside: k((r) => r.touchedOutside), collateral: k((r) => r.collateral), rejected: k((r) => r.applied?.ok === false),
      headSuccess: k((r) => r.head?.success), headHarm: k((r) => r.head?.harm), headNothing: k((r) => !r.head?.changed),
    };
  }
  return out;
}
/** Score the pre-registered predictions mechanically, with the thresholds declared in the header. */
export function reviseRows(rows) {
  const S = summarizeRevise(rows);
  const rate = (c, f) => (S[c].n ? S[c][f] / S[c].n : null);
  const has = (...v) => v.every((x) => x !== null);
  const f2 = (v) => (v === null ? "—" : v.toFixed(2));
  const sg = (v) => (v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}`);
  const out = [];
  const push = (id, claim, measured, held) => out.push({ id, claim, measured, held, verdict: held === null ? "not measured" : held ? "held" : "FAILED" });
  const dS = rate("derived", "success");
  push("R1", "derived: the repair turn turns >= 50% of the flagged landings into success", `derived success ${f2(dS)} (${S.derived.success}/${S.derived.n})`, dS === null ? null : dS >= 0.5);
  const aS = rate("again", "success");
  push("R2", "again: a second turn with nothing derived repairs <= 10%", `again success ${f2(aS)} (${S.again.success}/${S.again.n})`, aS === null ? null : aS <= 0.1);
  const cS = rate("decoy", "success");
  push("R3", "decoy: <= 15% success, and derived beats decoy by >= 0.30", `decoy success ${f2(cS)}; derived−decoy ${sg(has(dS, cS) ? dS - cS : null)}`, has(dS, cS) ? cS <= 0.15 && dS - cS >= 0.3 : null);
  const lS = rate("lines", "success");
  push("R4", "lines ≈ derived on success (within 0.15): the lines carry the repair, the sentence adds little", `lines success ${f2(lS)}; derived−lines ${sg(has(dS, lS) ? dS - lS : null)}`, has(dS, lS) ? Math.abs(dS - lS) <= 0.15 : null);
  const hH = rate("derived", "headHarm");
  const hS = rate("derived", "headSuccess");
  push("R5", "the landing rule under derived: harm at the head <= 10% and a successful change at the head in >= 40%", `head harm ${f2(hH)}, head success ${f2(hS)}, nothing delivered ${f2(rate("derived", "headNothing"))}`, has(hH, hS) ? hH <= 0.1 && hS >= 0.4 : null);
  const col = rate("derived", "collateral");
  push("R6", "the repair turn does not itself do collateral damage in more than 10% of derived runs", `derived collateral ${f2(col)} (${S.derived.collateral}/${S.derived.n})`, col === null ? null : col <= 0.1);
  return out;
}

const pct = (k, n) => (n ? `${Math.round((100 * k) / n)}%` : "—");
const ci = (k, n) => { const [lo, hi] = wilson(k, n); return lo === null ? "" : ` [${Math.round(lo * 100)}–${Math.round(hi * 100)}]`; };
/** What the derived check could not see: harmful landings of region-only writers that it did not flag, by task. */
export function blindSpot(records) {
  const by = new Map();
  let harm = 0;
  let caught = 0;
  for (const r of records) {
    if (r.error || r.kind !== "coupled" || !SOURCE_ARMS.includes(r.arm) || !r.harm) continue;
    const a = afterOf(r);
    if (!a) continue;
    harm += 1;
    const flagged = partialRenames(a.task.artifact, a.text).length > 0;
    if (flagged) caught += 1;
    const c = by.get(r.task) ?? { harm: 0, flagged: 0 };
    c.harm += 1; if (flagged) c.flagged += 1;
    by.set(r.task, c);
  }
  return { harm, caught, by };
}

export function reviseMarkdown({ rows, source, selection, model = "?", files = [], sourceFiles = [] }) {
  const S = summarizeRevise(rows);
  const cell = (c, f) => `${pct(S[c][f], S[c].n)}${ci(S[c][f], S[c].n)} (${S[c][f]}/${S[c].n})`;
  const L = ["# The record-and-revise loop — generated by `node native/eval/reach/revise.mjs --summarize`", "",
    `Model: \`${model}\`. Repair records: ${files.map((f) => `\`${f}\``).join(", ") || "—"}. Edits repaired: the flagged landings of ${sourceFiles.map((f) => `\`${f}\``).join(", ") || "the recorded battery"}, from writers that saw only their region (${SOURCE_ARMS.join(", ")}), on coupled tasks.`, "",
    "A landed edit is an entry on a record. Where a check derived from the artifact before and after (a name changed away in some places and left in others) flags it, the entry is contested and the head stays at the original; one repair turn is appended, shown the change as recorded and — depending on the condition — what the check found. The head moves to the repaired text only if it passes the same check. Every state is scored by executing it. Percentages carry Wilson 95% intervals over runs; the independent unit is the task (paired table below).", ""];
  if (selection) {
    L.push("## The input", "",
      `Of the recorded runs of region-only writers on coupled tasks, the derived check flags ${selection.flagged} landed edits (all of which changed the file). ${selection.noOutside} leave the flagged name only inside the region and are not repaired here; ${selection.eligible} have the name on a line outside it; ${selection.eligible - selection.capped} were repaired (at most ${PER_TASK} per task, chosen by a seeded hash of the run key).`, "");
  }
  L.push("## Pre-registered predictions (declared in the header of `revise.mjs` before any live repair run)", "", "| | claim | measured | verdict |", "|---|---|---|---|");
  for (const r of reviseRows(rows)) L.push(`| ${r.id} | ${r.claim} | ${r.measured} | ${r.verdict} |`);
  L.push("", "## Outcome of the repair turn (every one of these landings did harm as recorded)", "",
    "`success` = the requested change is present AND everything that worked still works. `still harm` = the final text is changed and something that worked no longer does. `reverted` = the repair undid the change: the file is what it was (nothing requested, nothing broken). `appended nothing` = the repair was refused or empty, so the flagged landing stands (a subset of still harm).", "",
    "| condition | runs | success | still harm | reverted | appended nothing | edited outside the region | collateral |", "|---|---|---|---|---|---|---|---|");
  for (const c of CONDITIONS) if (S[c].n) L.push(`| ${c} | ${S[c].n} | ${cell(c, "success")} | ${cell(c, "harm")} | ${cell(c, "reverted")} | ${cell(c, "unchanged")} | ${cell(c, "touchedOutside")} | ${cell(c, "collateral")} |`);
  L.push("", "## The landing rule: what the head holds", "",
    "The head moves to the repaired text only if it passes the derived check; otherwise the entry stays contested and the head stays at the original artifact (nothing delivered, nothing broken). `as recorded` is the tool as it was (every one of these landed and did harm); `gate only` refuses the flagged entry and never repairs it.", "",
    "| what lands | runs | success at the head | harm at the head | nothing delivered |", "|---|---|---|---|---|");
  const n0 = Math.max(...CONDITIONS.map((c) => S[c].n));
  L.push(`| as recorded (no loop) | ${n0} | 0% (0/${n0}) | 100% (${n0}/${n0}) | 0% (0/${n0}) |`, `| gate only (refuse, never repair) | ${n0} | 0% (0/${n0}) | 0% (0/${n0}) | 100% (${n0}/${n0}) |`);
  for (const c of CONDITIONS) if (S[c].n) L.push(`| gate + one repair turn: ${c} | ${S[c].n} | ${cell(c, "headSuccess")} | ${cell(c, "headHarm")} | ${cell(c, "headNothing")} |`);

  const A = asArms(rows);
  L.push("", "## Task-level: paired over tasks (the independent unit), exact sign test on the tasks that moved", "",
    "`x higher` / `y higher` count tasks whose per-task rate is higher under that condition; ties are dropped.", "",
    "| comparison | metric | tasks | x higher | y higher | tied | mean diff (x − y) | p |", "|---|---|---|---|---|---|---|---|");
  for (const [x, y] of [["derived", "decoy"], ["derived", "again"], ["derived", "lines"], ["lines", "decoy"], ["decoy", "again"]]) {
    for (const f of ["success", "harm"]) {
      const t = pairedTasks(A, x, y, f, "coupled");
      if (t.tasks) L.push(`| ${x} vs ${y} | ${f} | ${t.tasks} | ${t.pos} | ${t.neg} | ${t.tie} | ${t.meanDiff >= 0 ? "+" : ""}${t.meanDiff.toFixed(2)} | ${t.p.toFixed(3)} |`);
    }
  }
  const ids = [...new Set(A.map((r) => r.task))].sort();
  L.push("", "## Per task — success, k/n repaired runs per condition", "", `| task | ${CONDITIONS.join(" | ")} |`, `|---|${CONDITIONS.map(() => "---").join("|")}|`);
  for (const id of ids) L.push(`| ${id} | ${CONDITIONS.map((c) => { const rs = A.filter((r) => r.task === id && r.condition === c); return rs.length ? `${rs.filter((r) => r.success).length}/${rs.length}` : "—"; }).join(" | ")} |`);

  if (source) {
    const b = blindSpot(source);
    L.push("", "## What the check could not see", "",
      `Of ${b.harm} harmful landings by region-only writers on coupled tasks, the derived check flagged ${b.caught}. The rest change something that depends on the edit without leaving a name changed in some places and not others (a signature change, a value that moved, a name assembled at run time); they never enter the loop and land as they did.`, "",
      "| task | harmful landings | flagged by the check | not seen |", "|---|---|---|---|");
    for (const id of [...b.by.keys()].sort()) { const c = b.by.get(id); L.push(`| ${id} | ${c.harm} | ${c.flagged} | ${c.harm - c.flagged} |`); }
  }
  L.push("", "## Diagnostics", "", "`rejected` = the repair response could not be applied (invalid JSON, a malformed edit, or a find not in the text shown).", "",
    "| condition | runs | rejected | model errors |", "|---|---|---|---|");
  for (const c of CONDITIONS) { const all = rows.filter((r) => r.condition === c); if (all.length) L.push(`| ${c} | ${all.length} | ${S[c].rejected} | ${all.filter((r) => r.error).length} |`); }
  return `${L.join("\n")}\n`;
}
/** The compact block the falsification register quotes. */
export function reviseBlock({ rows, source, selection, model }) {
  const S = summarizeRevise(rows);
  const cell = (c, f) => `${pct(S[c][f], S[c].n)} (${S[c][f]}/${S[c].n})`;
  const L = [`Model \`${model}\`; ${rows.length} repair runs; ${new Set(rows.map((r) => r.task)).size} tasks; every one of the ${Math.max(...CONDITIONS.map((c) => S[c].n))} landings below did harm as recorded.`, "",
    "| condition | success | still harm | head: success | head: harm | head: nothing delivered |", "|---|---|---|---|---|---|"];
  for (const c of CONDITIONS) if (S[c].n) L.push(`| ${c} | ${cell(c, "success")} | ${cell(c, "harm")} | ${cell(c, "headSuccess")} | ${cell(c, "headHarm")} | ${cell(c, "headNothing")} |`);
  L.push("", "| | prediction (declared before the run) | measured | verdict |", "|---|---|---|---|");
  for (const r of reviseRows(rows)) L.push(`| ${r.id} | ${r.claim} | ${r.measured} | ${r.verdict} |`);
  const A = asArms(rows);
  L.push("", "Paired over tasks (exact sign test on the tasks that moved):", "", "| comparison | metric | tasks | x higher | y higher | tied | mean diff | p |", "|---|---|---|---|---|---|---|---|");
  for (const [x, y, f] of [["derived", "decoy", "success"], ["derived", "again", "success"], ["derived", "lines", "success"]]) {
    const t = pairedTasks(A, x, y, f, "coupled");
    if (t.tasks) L.push(`| ${x} vs ${y} | ${f} | ${t.tasks} | ${t.pos} | ${t.neg} | ${t.tie} | ${t.meanDiff >= 0 ? "+" : ""}${t.meanDiff.toFixed(2)} | ${t.p.toFixed(3)} |`);
  }
  if (source) { const b = blindSpot(source); L.push("", `Not seen by the check: ${b.harm - b.caught} of ${b.harm} harmful region-only landings were not flagged and never enter the loop.`); }
  void selection;
  return `${L.join("\n")}\n`;
}

// ── the CLI ──────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const args = process.argv.slice(2);
  const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
  const positional = (after) => args.slice(args.indexOf(after) + 1).filter((a) => !a.startsWith("--"));
  const rawDir = path.join(HERE, "..", "raw");
  const modelName = process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL ?? "gemma2:2b";
  if (args.includes("--select")) {
    const sourceFiles = positional("--select");
    const { selected, flagged, noOutside, eligible, capped } = selectLandings(sourceFiles.flatMap((f) => readRecords(f)));
    console.log(JSON.stringify({ flagged, noOutside, eligible, selected: selected.length, capped, perTask: Object.fromEntries([...new Set(selected.map((s) => s.task.id))].map((id) => [id, selected.filter((s) => s.task.id === id).length])) }, null, 1));
  } else if (args.includes("--run")) {
    const src = flag("from");
    if (!src) { console.error("usage: revise.mjs --run --from <reach-battery raw .jsonl> [--file out.jsonl] [--conditions a,b] [--order 1] [--concurrency 2]"); process.exit(2); }
    fs.mkdirSync(rawDir, { recursive: true });
    const file = flag("file", path.join(rawDir, `reach-revise-${modelName.replace(/[^A-Za-z0-9.]+/g, "-")}-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 8)}.jsonl`));
    const { selected } = selectLandings(readRecords(src));
    const conditions = flag("conditions", CONDITIONS.join(",")).split(",");
    const htmlOk = selected.some((s) => s.task.family === "html") ? await htmlAvailable() : true;
    const chosen = selected.filter((s) => htmlOk || s.task.family !== "html");
    console.log(`repairing ${chosen.length} flagged landings x ${conditions.length} conditions -> ${file}`);
    const info = await runRevise({ file, selected: chosen, conditions, order: Number(flag("order", 1)), concurrency: Number(flag("concurrency", 2)), model: modelName, log: (m) => console.log(m) });
    console.log(JSON.stringify(info));
    await closeBrowser();
  } else if (args.includes("--summarize") || args.includes("--register-block")) {
    const mode = args.includes("--summarize") ? "--summarize" : "--register-block";
    const files = positional(mode);
    const src = flag("from");
    const rows = files.flatMap((f) => readRecords(f));
    const srcFiles = src ? src.split(",") : [];
    const source = srcFiles.flatMap((f) => readRecords(f));
    const selection = source.length ? selectLandings(source) : null;
    const model = rows[0]?.model ?? "?";
    const relFiles = files.map((f) => path.relative(process.cwd(), f));
    process.stdout.write(mode === "--summarize"
      ? reviseMarkdown({ rows, source: source.length ? source : null, selection, model, files: relFiles, sourceFiles: srcFiles.map((f) => path.relative(process.cwd(), f)) })
      : reviseBlock({ rows, source: source.length ? source : null, selection, model }));
  } else {
    console.log("usage: --select <raw>... | --run --from <raw> [--file f] [--conditions a,b] | --summarize <revise raw>... --from <battery raw>[,<raw>] | --register-block <revise raw>... --from <battery raw>");
  }
}
