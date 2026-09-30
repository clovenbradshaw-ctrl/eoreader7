#!/usr/bin/env node
// native/eval/reach/counterfactual.mjs — how would the recorded writer outputs have fared under a different MEDIUM?
//
// The battery says how often a small model's edits did harm. The question that follows is
// how to prevent it, and the answer the direction asks for is structure, not caution: change
// what the medium does with the writer's edit, so that the harm is not representable or not
// landed. This driver takes the edits the writer ACTUALLY produced (raw records, every prompt
// and answer kept) and re-applies them under other tool semantics, scoring each result by
// executing it, exactly as the battery does. No model is called.
//
//   as-run            the tool as it was (the control: the re-scored outcome must equal the
//                     recorded one, or the counterfactual machinery is wrong)
//   token             a find matches whole identifiers only (`port` no longer matches inside
//                     `exports`; `s` no longer matches inside every word)
//   closure           the edit is applied to the region AND the lines derived from the material,
//                     whatever the writer was shown — the medium carries the reach
//   closure+token     both
//   gate              as-run, but an edit that leaves a partial rename (a name changed away in
//                     some places and not others — derived from the artifact and the edit alone)
//                     is not landed
//   closure+token+gate all three
//
// WHAT THIS IS NOT. It re-applies answers a writer gave when it believed the tool worked one
// way; a writer told the tool works another way may answer differently. So it estimates what
// these recorded answers would have done, not what a writer under the new tool will do.
// Nothing here is a claim about a model that was not run.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TASKS } from "./tasks.mjs";
import { checkTask, htmlAvailable, closeBrowser } from "./check.mjs";
import { readRecords, applyEditsToView, segmentsFor, scoreOutcome, partialRenames } from "./battery.mjs";

const WORD = /[A-Za-z0-9_]/;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Like applyEditsToView, but a find made of word characters at an end only matches at an identifier boundary there. */
export function applyEditsBoundary(artifact, segments, edits) {
  if (!Array.isArray(edits) || edits.length === 0) return { ok: true, text: artifact, noop: true, replaced: 0 };
  const texts = segments.map((s) => artifact.slice(s.start, s.end));
  let replaced = 0;
  for (const [i, e] of edits.entries()) {
    if (typeof e?.find !== "string" || typeof e?.replace !== "string" || e.find === "") return { ok: false, reason: `edit ${i} is malformed` };
    const re = new RegExp(`${WORD.test(e.find[0]) ? "(?<![A-Za-z0-9_])" : ""}${escape(e.find)}${WORD.test(e.find[e.find.length - 1]) ? "(?![A-Za-z0-9_])" : ""}`, "g");
    let n = 0;
    for (let j = 0; j < texts.length; j += 1) texts[j] = texts[j].replace(re, () => { n += 1; return e.replace; });
    if (n === 0) return { ok: false, reason: `edit ${i}: the text to find is not in the text shown` };
    replaced += n;
  }
  let out = "";
  let at = 0;
  segments.forEach((s, j) => { out += artifact.slice(at, s.start) + texts[j]; at = s.end; });
  return { ok: true, text: out + artifact.slice(at), replaced };
}

export const VARIANTS = Object.freeze(["as-run", "token", "closure", "closure+token", "gate", "closure+token+gate"]);

/** The artifact a recorded run would have produced under a variant (null edits → nothing applied). */
export function afterUnder(record, variant) {
  const task = TASKS.find((t) => t.id === record.task);
  const edits = record.parsed?.edits;
  if (!task || !edits) return { task, text: task?.artifact, applied: false };
  const closure = variant.startsWith("closure");
  const segs = closure ? segmentsFor(task, "reach") : segmentsFor(task, record.arm);
  const apply = variant.includes("token") ? applyEditsBoundary : applyEditsToView;
  const r = apply(task.artifact, segs, edits);
  if (!r.ok) return { task, text: task.artifact, applied: false };
  let text = r.text;
  let refused = false;
  if (variant.endsWith("gate") && partialRenames(task.artifact, text).length > 0) { text = task.artifact; refused = true; }
  return { task, text, applied: true, refused };
}

export async function rescore(records, variants = VARIANTS) {
  const rows = [];
  // Many recorded answers produce the same edited text (the same edit, many seeds): execute each distinct (task, text) once.
  const memo = new Map();
  const checkedOnce = async (task, text) => {
    const k = `${task.id}\u0000${text}`;
    if (!memo.has(k)) memo.set(k, checkTask(task, text));
    return memo.get(k);
  };
  for (const r of records) {
    if (r.error) continue;
    const out = { key: r.key, arm: r.arm, kind: r.kind, task: r.task, recorded: { success: r.success, harm: r.harm }, by: {} };
    for (const v of variants) {
      const a = afterUnder(r, v);
      const checked = await checkedOnce(a.task, a.text);
      const s = scoreOutcome({ task: a.task, before: a.task.artifact, after: a.text, flagged: false, checked });
      out.by[v] = { success: s.success, harm: s.harm, refused: !!a.refused };
    }
    rows.push(out);
  }
  return rows;
}

const GROUPS = [
  ["region only (bare, placebo, stance, wisdom, goal, decoy)", (r) => ["bare", "placebo", "stance", "wisdom", "goal", "decoy"].includes(r.arm)],
  ["derived reach (reach, both, reachgoal)", (r) => ["reach", "both", "reachgoal"].includes(r.arm)],
  ["whole file", (r) => r.arm === "whole"],
];
const pct = (k, n) => (n ? `${Math.round((100 * k) / n)}% (${k}/${n})` : "—");

export function markdown(rows, { model = "?", files = [] } = {}) {
  const L = ["# Prevention, counterfactually — the recorded writer outputs under a different medium (deterministic, no model)", "",
    `Model that wrote the edits: \`${model}\`. Records: ${files.map((f) => `\`${f}\``).join(", ") || "—"}. Each recorded answer is re-applied under another tool semantics and scored by executing it, as in the battery. **This estimates what these recorded answers would have done, not what a writer told about the new tool would do.**`, "",
    "- `as-run` — the tool as it was: the control. Its outcome must equal the recorded one.",
    "- `token` — a find matches whole identifiers only.",
    "- `closure` — the edit is applied to the region AND the lines derived from the material, whatever the writer was shown.",
    "- `gate` — an edit that leaves a partial rename (derived from the artifact and the edit alone) is not landed.", ""];
  const agree = rows.filter((r) => r.by["as-run"].success === r.recorded.success && r.by["as-run"].harm === r.recorded.harm).length;
  L.push(`**Control.** Re-applying the recorded edits as-run reproduces the recorded outcome in ${agree} of ${rows.length} runs.`, "");
  // the headline table: one row per medium, the three kinds of writer on coupled tasks, and the uncoupled controls for the writer that saw only its region
  const cellOf = (test, kind, v, field) => { const rs = rows.filter((r) => r.kind === kind && test(r)); return pct(rs.filter((r) => r.by[v][field]).length, rs.length); };
  const [region, derived, whole] = GROUPS;
  L.push("## Summary: what the medium does with the edit", "",
    "Success / harm per hundred runs (the requested change is present AND everything that worked still works / something that worked no longer does). A refused edit counts as neither: nothing is delivered.", "",
    "| medium | region-only writer: coupled success | harm | derived-reach writer: coupled success | harm | whole-file writer: coupled success | harm | region-only writer: uncoupled success | harm |", "|---|---|---|---|---|---|---|---|---|");
  for (const v of VARIANTS) L.push(`| ${v} | ${cellOf(region[1], "coupled", v, "success")} | ${cellOf(region[1], "coupled", v, "harm")} | ${cellOf(derived[1], "coupled", v, "success")} | ${cellOf(derived[1], "coupled", v, "harm")} | ${cellOf(whole[1], "coupled", v, "success")} | ${cellOf(whole[1], "coupled", v, "harm")} | ${cellOf(region[1], "control", v, "success")} | ${cellOf(region[1], "control", v, "harm")} |`);
  L.push("");
  for (const kind of ["coupled", "control"]) {
    L.push(`## ${kind === "coupled" ? "Coupled tasks (the obvious edit breaks something elsewhere)" : "Uncoupled controls (nothing depends on the edit)"}`, "",
      "| writer was shown | medium | runs | success | harm | not landed | harm that still lands |", "|---|---|---|---|---|---|---|");
    for (const [label, test] of GROUPS) {
      const rs = rows.filter((r) => r.kind === kind && test(r));
      if (!rs.length) continue;
      for (const v of VARIANTS) {
        const c = rs.map((r) => r.by[v]);
        L.push(`| ${label} | ${v} | ${rs.length} | ${pct(c.filter((x) => x.success).length, rs.length)} | ${pct(c.filter((x) => x.harm).length, rs.length)} | ${c.filter((x) => x.refused).length} | ${c.filter((x) => x.harm && !x.refused).length} |`);
      }
    }
    L.push("");
  }
  // what the gate cost: edits it refused that would have been fine, and harm it missed
  const coupled = rows.filter((r) => r.kind !== "dynamic");
  const refusedFine = coupled.filter((r) => r.by.gate.refused && r.by["as-run"].success).length;
  const refusedHarm = coupled.filter((r) => r.by.gate.refused && r.by["as-run"].harm).length;
  const missed = coupled.filter((r) => r.by["as-run"].harm && !r.by.gate.refused).length;
  L.push("## What the gate cost", "", `Of the recorded runs, the gate refused ${refusedHarm} that did harm and ${refusedFine} that would have succeeded (false alarms); it let ${missed} harmful edits through, because a change that keeps every name is invisible to it (a signature change, a shape change, a name built at run time).`, "");
  return `${L.join("\n")}\n`;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (!files.length) { console.error("usage: counterfactual.mjs <raw reach-battery .jsonl>..."); process.exit(2); }
  const records = files.flatMap((f) => readRecords(f));
  if (!(await htmlAvailable())) console.error("note: Chromium unavailable; html tasks will be scored as unavailable");
  const rows = await rescore(records);
  process.stdout.write(markdown(rows, { model: records[0]?.model ?? "?", files: files.map((f) => path.relative(process.cwd(), f)) }));
  await closeBrowser();
}
