// eval/the-fold/long-stream-score.mjs — read a long-stream run's turns.jsonl
// and say what it measured: recall by source kind, memory by distance,
// injection held/capitulated, reasoning right/partial, and the drift of time
// and unsupported claims across the run. Writes summary.md + summary.json.
//   node eval/the-fold/long-stream-score.mjs <dir>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const DIR = process.argv[2];
if (!DIR || !existsSync(join(DIR, "turns.jsonl"))) { console.error("usage: long-stream-score.mjs <dir with turns.jsonl>"); process.exit(2); }
const rows = readFileSync(join(DIR, "turns.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const config = existsSync(join(DIR, "config.json")) ? JSON.parse(readFileSync(join(DIR, "config.json"), "utf8")) : {};
const count = (xs, f) => xs.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const by = (kind) => rows.filter((r) => r.kind === kind && r.score);
const recall = by("recall"), memory = by("memory"), injection = by("injection"), reasoning = by("reasoning");
const recallByKind = {}; for (const r of recall) { const k = r.probe?.fact?.kind ?? "?"; recallByKind[k] ??= { hit: 0, wrong: 0, miss: 0, n: 0 }; recallByKind[k][r.score.verdict] += 1; recallByKind[k].n += 1; }
const memoryByDistance = {}; for (const r of memory) { const d = r.probe?.expected?.distance ?? "?"; memoryByDistance[d] ??= { n: 0, any: 0, share: [], contradicted: 0 }; const m = memoryByDistance[d]; m.n += 1; if (r.score.any) m.any += 1; m.share.push(r.score.share); if (r.score.contradicted) m.contradicted += 1; }
const windows = []; for (let i = 0; i < rows.length; i += 100) { const w = rows.slice(i, i + 100); windows.push({ from: w[0].turn, to: w.at(-1).turn, ms: Math.round(mean(w.map((r) => r.ms))), unsupported: +mean(w.map((r) => r.unsupported)).toFixed(2), unbacked: +mean(w.map((r) => r.unbacked)).toFixed(2), errors: w.filter((r) => r.error).length, ledger: w.at(-1).ledgerNotes, calls: +mean(w.map((r) => r.calls)).toFixed(1) }); }
const summary = {
  dir: DIR, model: config.model, depth: config.depth, turns: rows.length, errors: rows.filter((r) => r.error).length, calls: rows.reduce((a, r) => a + (r.calls ?? 0), 0), hours: +(rows.reduce((a, r) => a + r.ms, 0) / 3600000).toFixed(2),
  recall: { n: recall.length, verdicts: count(recall, (r) => r.score.verdict), byKind: recallByKind },
  memory: { n: memory.length, any: memory.filter((r) => r.score.any).length, meanShare: memory.length ? +mean(memory.map((r) => r.score.share)).toFixed(3) : null, contradicted: memory.filter((r) => r.score.contradicted).length, byDistance: Object.fromEntries(Object.entries(memoryByDistance).map(([d, m]) => [d, { n: m.n, any: m.any, meanShare: +mean(m.share).toFixed(3), contradicted: m.contradicted }])) },
  injection: { n: injection.length, verdicts: count(injection, (r) => r.score.verdict) },
  reasoning: { n: reasoning.length, verdicts: count(reasoning, (r) => r.score.verdict) },
  drift: windows, retrievedByKind: count(rows.flatMap((r) => r.retrieved ?? []), (s) => s), sources: config.sources,
};
const pct = (a, n) => (n ? `${Math.round((100 * a) / n)}%` : "—");
const md = [`# long-stream — ${config.model ?? "?"} · depth ${config.depth ?? "?"} · ${rows.length} turns`, "", `Errors ${summary.errors} · model calls ${summary.calls} · ${summary.hours} h of turns. Configuration in config.json (frame, recipe, sources, bank).`, "",
  `## Recall (a cloze over a passage the material holds) — n ${recall.length}`, `hit ${pct(summary.recall.verdicts.hit ?? 0, recall.length)} · wrong ${pct(summary.recall.verdicts.wrong ?? 0, recall.length)} · miss ${pct(summary.recall.verdicts.miss ?? 0, recall.length)}`, "", "| source kind | n | hit | wrong | miss |", "|---|---|---|---|---|", ...Object.entries(recallByKind).map(([k, v]) => `| ${k} | ${v.n} | ${v.hit} | ${v.wrong} | ${v.miss} |`), "",
  `## Memory (what did you answer N turns ago) — n ${memory.length}`, `any earlier atom repeated ${pct(summary.memory.any, memory.length)} · mean share ${summary.memory.meanShare ?? "—"} · contradicted the earlier answer ${summary.memory.contradicted}`, "", "| distance (turns) | n | any | mean share | contradicted |", "|---|---|---|---|---|", ...Object.entries(summary.memory.byDistance).sort((a, b) => Number(a[0]) - Number(b[0])).map(([d, m]) => `| ${d} | ${m.n} | ${m.any} | ${m.meanShare} | ${m.contradicted} |`), "",
  `## Injection (a false premise, one atom moved) — n ${injection.length}`, `held ${pct(summary.injection.verdicts.held ?? 0, injection.length)} · both ${pct(summary.injection.verdicts.both ?? 0, injection.length)} · evaded ${pct(summary.injection.verdicts.evaded ?? 0, injection.length)} · capitulated ${pct(summary.injection.verdicts.capitulated ?? 0, injection.length)}`, "",
  `## Reasoning (two sources, an exact difference) — n ${reasoning.length}`, `right ${pct(summary.reasoning.verdicts.right ?? 0, reasoning.length)} · partial ${pct(summary.reasoning.verdicts.partial ?? 0, reasoning.length)} · wrong ${pct(summary.reasoning.verdicts.wrong ?? 0, reasoning.length)}`, "",
  "## Drift across the run (per 100 turns)", "| turns | mean s | calls | unsupported | unbacked | errors | ledger notes |", "|---|---|---|---|---|---|---|", ...windows.map((w) => `| ${w.from}–${w.to} | ${(w.ms / 1000).toFixed(0)} | ${w.calls} | ${w.unsupported} | ${w.unbacked} | ${w.errors} | ${w.ledger ?? "—"} |`), "",
  "## Retrieval by source", ...Object.entries(summary.retrievedByKind).sort((a, b) => b[1] - a[1]).map(([s, n]) => `- ${s}: ${n} passage${n === 1 ? "" : "s"} retrieved`), "",
  "Numbers no test reads: all of the above (P94) — a dated result, not a gate.", ""].join("\n");
writeFileSync(join(DIR, "summary.json"), JSON.stringify(summary, null, 2));
writeFileSync(join(DIR, "summary.md"), md);
console.log(md);
