// eval/record-pipeline.mjs — the sixth medium, and signal.js's first run
// IN ANGER: the instrument's own operational record.
//
// Every prior medium (music, video, turbulence, spatial) carried a grammar
// DECLARED before the run, so discoveries could be scored against planted
// truth. This one deliberately does not: record/explore-record.jsonl is
// 3,000+ real rows of what this instrument actually did over three weeks —
// searches, fetches, reads, deposits, terminal acts — and nobody planted
// anything. That makes it the first honest use of the organ's own promise:
// whatever beats the search-aware ceiling is a genuine discovery about the
// instrument's own behaviour, and nothing surviving is a MEASURED ABSENCE,
// not a failure to look. No score line at the end; findings are reported
// under the null, with the shared-instrument caveat carried per finding.
//
// Structurally it is also a new medium class: an OPERATIONAL EVENT LOG —
// ordered like a stream, but with heavy-tailed event frequencies (web-fetch
// is 60% of all rows), which is exactly the small-alphabet/dominant-symbol
// territory where turbulence found the unlicensed share floor. The null
// arm earns its keep here or nowhere.
import fs from "node:fs";
import { findSignal, phrase } from "../../eoreader7/native/organs/index.js";
import { discoverCompanyKinds } from "../../eoreader7/native/organs/index.js";

const rows = fs.readFileSync(new URL("../record/explore-record.jsonl", import.meta.url), "utf8")
  .split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
  .map((r) => ({ at: String(r.at ?? ""), event: String(r.event ?? "unknown") }))
  .filter((r) => r.at);
console.log(`record rows: ${rows.length}`);

// SOURCES: the record's own weeks — genuinely different operating periods
// (different features being built, different traffic), the closest this
// medium has to independent runs of "the instrument operating".
const week = (r) => (r.at < "2026-08-21" ? "week-1" : "week-2plus");
const bySource = new Map();
for (const r of rows) {
  const k = week(r);
  if (!bySource.has(k)) bySource.set(k, []);
  bySource.get(k).push(r);
}

// VOCABULARY: the record's own event names, enumerated (a mechanical fact
// about the file, not a search) — every kind that occurs 10+ times.
const counts = new Map();
for (const r of rows) counts.set(r.event, (counts.get(r.event) ?? 0) + 1);
const VOCAB = [...counts].filter(([, n]) => n >= 10).map(([e]) => e);
console.log(`vocabulary (>=10 occurrences): ${VOCAB.join(", ")}`);

// INSTRUMENTS: three ways of phrasing "what happened together" — the same
// scope (temporal order of events), different phrase rules, which is the
// spatial run's own law (instrument independence needs same-scope,
// different-rule instruments).
const mkPhrases = (events, breakFn) => {
  const phrases = [];
  let cur = [];
  for (let i = 0; i < events.length; i++) {
    cur.push(events[i].event);
    if (breakFn(events[i], events[i + 1]) || cur.length >= 40) { if (cur.length >= 2) phrases.push({ text: cur.join(" ") }); cur = []; }
  }
  if (cur.length >= 2) phrases.push({ text: cur.join(" ") });
  return phrases;
};
const minuteOf = (at) => at.slice(0, 16);
const instruments = [
  { recipe: "phrase-by-minute@same-clock-minute", discretize: (evs) => mkPhrases(evs, (a, b) => !b || minuteOf(a.at) !== minuteOf(b.at)) },
  { recipe: "phrase-by-gap@>60s-silence", discretize: (evs) => mkPhrases(evs, (a, b) => !b || (Date.parse(b.at) - Date.parse(a.at)) > 60_000) },
  { recipe: "phrase-by-count@fixed-12", discretize: (evs) => { const out = []; for (let i = 0; i < evs.length; i += 12) { const seg = evs.slice(i, i + 12).map((e) => e.event); if (seg.length >= 2) out.push({ text: seg.join(" ") }); } return out; } },
];

const sources = [...bySource].map(([ref, evs]) => ({ ref, material: evs }));
const result = await findSignal(sources, {
  instruments, vocabulary: VOCAB, discoverKinds: discoverCompanyKinds,
  clean: (t) => t, // event names are not text — hyphens are load-bearing
  draws: 120, seed: 0, alpha: 0.05,
  minMentions: 12, minShare: 0.4, minMembers: 1,
});

console.log("\n── THE INSTRUMENT'S OWN RECORD, THROUGH ITS OWN PIPELINE ──");
console.log(phrase(result));
if (result.refused) { console.log(JSON.stringify(result).slice(0, 400)); process.exit(0); }
for (const f of result.findings)
  console.log(`  ${f.subject} -> ${f.kind}  share ${f.share.toFixed(3)} (ceiling ${f.searchCeiling.toFixed(3)})` +
    `  sources ${f.sources.length}/2 · instruments ${f.instruments.length}/3` + (f.note ? `  [${f.note}]` : "  [CORROBORATED]"));
console.log(`\ncontrol: ${result.control.passed ? "passed" : "SURVIVED — unlicensed"} · gaps: ${result.gaps.length}`);
