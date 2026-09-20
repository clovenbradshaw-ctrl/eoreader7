// heimdall-resolve.mjs — resolve the standing of every derived rule against
// the append-only log, and learn the lesson the evidence teaches.
//
// A derived rule carries its falsifying control — the counterfactual that,
// if it fires, concedes the rule (REC: re-zero, never a silent keep). This
// script is that check, run on demand:
//
//   - It reads heimdall-log.jsonl and heimdall-derived-rules.json.
//   - The log is a TRIMMED memory now (the 2026-09-19 snapshot-and-trim):
//     old raw lines are folded into snapshots in state/heimdall-memory.json,
//     and the lesson notes' text SURVIVES the fold — so this walk reads both
//     the raw log and the folded notes, and sees the whole recorded history
//     within the snapshot retention.
//   - For the model_dropped class it measures: after a re-warm of model M,
//     does M drop again within the keep_alive window (75s)? Every such
//     repeat is a conceded control.
//   - A rule whose control fired is rewritten in the store with
//     standing: "conceded", concededReason, and concededAt — the rule is
//     NOT deleted (it taught the lesson); it is re-zeroed with the witness
//     named, so the next derivation can sharpen it instead of re-learning.
//   - The resolution lands on the append-only log as a lesson note.
//
// This is a pure read + one append; it never touches the watcher's loop.
// Usage: node heimdall-resolve.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adoptDerivedRule, derivedRuleStore, lintedNote } from "./heimdall.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(HERE, "heimdall-log.jsonl");
const MEMORY_FILE = path.join(HERE, "state", "heimdall-memory.json");
const KEEP_ALIVE_WINDOW_S = 75; // measured: er7:gemma2:2b re-warms cycle at 45-75s

function loadLog() {
  const events = [];
  for (const line of fs.readFileSync(LOG_FILE, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  return events;
}

// Folded lesson notes from the memory snapshots (state/heimdall-memory.json):
// the trimmed log no longer holds the old raw note lines, but the fold kept
// their TEXT, so the whole-history walk still sees them. Same shape as a raw
// note event ({ at, note }), marked folded so the read is honest about it.
function loadMemoryNotes() {
  try {
    const d = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
    const notes = [];
    for (const tier of ["hourly", "daily"]) {
      for (const b of Object.values(d[tier] ?? {})) {
        for (const n of b?.notes ?? []) notes.push({ at: n.at, note: n.note, folded: true });
      }
    }
    return notes;
  } catch { return []; }
}

// For each model_dropped rule, walk the log: a re-warm of the probe model
// followed by another re-warm of the SAME model within KEEP_ALIVE_WINDOW_S
// is a conceded control (the model dropped again right after being warmed).
function resolveModelDropped(rules, events) {
  const warms = new Map(); // model -> [at, ...]
  for (const e of events) {
    const note = e?.note ?? "";
    if (!note.includes("re-warmed")) continue;
    const m = note.split(": re-warmed: ")[1];
    if (!m || m.startsWith("heimdall derived")) continue;
    if (!warms.has(m)) warms.set(m, []);
    warms.get(m).push(new Date(e.at ?? 0).getTime());
  }
  const conceded = [];
  for (const rule of rules) {
    if (rule.class !== "model_dropped") continue;
    const probe = rule.probe ?? rule.model;
    const times = warms.get(probe) ?? [];
    let repeats = 0;
    for (let i = 1; i < times.length; i++) {
      if ((times[i] - times[i - 1]) / 1000 <= KEEP_ALIVE_WINDOW_S) repeats += 1;
    }
    if (repeats >= 1) {
      conceded.push({ rule, repeats, times });
    }
  }
  return conceded;
}

const rules = derivedRuleStore();
const events = [...loadMemoryNotes(), ...loadLog()];
const conceded = resolveModelDropped(rules, events);

console.log(`resolving ${rules.length} derived rules against ${events.length} log events`);
if (!conceded.length) {
  console.log("no conceded controls — every rule stands");
  process.exit(0);
}

for (const { rule, repeats, times } of conceded) {
  const last = new Date(times[times.length - 1]);
  const reason = `control fired ${repeats}×: ${rule.probe ?? rule.model} re-warmed then dropped again within ${KEEP_ALIVE_WINDOW_S}s (last ${last.toISOString()}) — the re-warm-and-drop cycle is the box's own failure mode, not a stranger's`;
  console.log(`CONCEDED ${rule.key}: ${reason}`);
  adoptDerivedRule({
    class: rule.class,
    probe: rule.probe,
    count: rule.count,
    spanMin: rule.spanMin,
    model: rule.model,
    rule: rule.rule,
    giver: "heimdall",
    standing: "conceded",
    control: rule.control,
    concededReason: reason,
    concededAt: Date.now(),
  });
  lintedNote({
    kind: "infra",
    level: "warn",
    severity: "medium",
    note: `heimdall lesson (${rule.key}): ${reason}`,
    giver: "heimdall",
    standing: "conceded",
    probe: rule.key,
  });
}

console.log(`\nresolved ${conceded.length} conceded rule(s); store + log updated.`);