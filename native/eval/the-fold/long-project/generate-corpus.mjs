// generate-corpus.mjs — builds "the Long Project" corpus: a sequence of
// session-NNN.md files that read like real working-session summaries for an
// INVENTED software project (codename Quillfen — company, product, services,
// config keys, and every person are fictitious; see lib/people.mjs). Mostly
// routine distractor content (lib/distractors.mjs), with PLANTED fact-chains
// (lib/plants.mjs) spread evenly across the whole span, identical in content
// at every rung — only how many distractor sessions separate them changes.
//
// WHAT THIS DOES: renders three size rungs (12, 60, 300 sessions) from the
// same two hand-written pools, seeded and reproducible (same seed -> byte-
// identical corpus). It writes a manifest.json per rung mapping each planted
// event's id to the session number it landed on at that rung (questions.json
// stores event ids, never session numbers, because the number is rung-
// dependent), plus stats.json (words/chars/estimated tokens).
//
// WHAT THIS DOES NOT DO: it does not run either arm (unaided Claude Code or
// eoreader7-assisted) and it does not grade anything — see score.mjs for
// mechanical grading and verify-ground-truth.mjs for confirming the ground
// truth is actually present (or, for T4, actually absent) before any subject
// runs, per PREREGISTRATION.md.
//
//   node generate-corpus.mjs [--rungs 12,60,300] [--seed 20260922] [--out corpus]
//
// A rung's session count is the only thing that changes the placement: event
// index i of K total lands on session `1 + floor(i * N / K)` — even spacing
// across 1..N, so relative order (and every chain's internal order) is
// preserved at any N. The extension rung this project's own convention
// requires be declared in advance (PREREGISTRATION.md: "if no gap appears at
// the top rung, extend") is EXTENSION_RUNG sessions below — declared here,
// NOT generated, because generating it is only worth the cost if rung-300
// shows no gap. Its size is derived, not guessed: see the constant's own
// comment and PREREGISTRATION.md's "size ladder" section (sensitivity audit,
// 2026-09-22 — rung-300's ~21.6K tokens sits well inside any frontier
// model's context window, so it cannot by itself test scale-defeat; the
// extension rung is sized to actually exceed one).
//
// DISTRACTOR SELECTION (revised 2026-09-22, sensitivity audit — "the dedup
// exploit"): each fill slot draws a distractor id UNIFORMLY AT RANDOM with
// replacement (not a cycled, near-uniform queue — that made every id repeat
// almost exactly N*avg_fill/35 times, which is what let a bare frequency
// count cleanly separate the 59 frequency-1 plants from the always-repeated
// filler) and renders it through lib/paraphrase.mjs's hand-written
// substitution table (or a manual `variants` override — lib/distractors.mjs
// — for the few bodies that table cannot reword), each matching word
// independently rerolled. That produces a long-tail frequency distribution
// over MANY distinct filler strings instead of a flat one over 35, so a
// meaningful share of distractor TEXT also lands at frequency 1 — see
// verify-ground-truth.mjs's dedup-frequency check, which measures this
// directly on the generated corpus and fails the build if it does not hold.
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mulberry32, randInt, shuffled } from "./lib/prng.mjs";
import { PLANTS } from "./lib/plants.mjs";
import { DISTRACTORS } from "./lib/distractors.mjs";
import { PEOPLE_NAMES } from "./lib/people.mjs";
import { paraphrase } from "./lib/paraphrase.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── configuration, printed first (house style: P88, "state the reader's
// configuration before claiming anything about material") ──────────────────
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const RUNGS = flag("rungs", "12,60,300").split(",").map((s) => Number(s.trim())).filter(Number.isFinite);
const SEED = Number(flag("seed", 20260922));
const OUT = flag("out", "corpus");
// Declared, NOT generated (see header). Sized against a stated context-
// window figure, not guessed (sensitivity audit, 2026-09-22): rung-300 runs
// ~72 estimated tokens/session (21,616 / 300); frontier Claude context
// windows in current use run from roughly 200K up to 1,000,000 tokens in
// extended-context configurations. 1500 sessions (~108K tokens, the
// original figure) sits INSIDE even the smaller of those — it would not
// have exercised scale-defeat at all. 28,000 sessions is ~2.1M estimated
// tokens: comfortably past a 1,000,000-token window with headroom, so if
// this rung is ever built it tests the thing rung-12/60/300 cannot (see
// PREREGISTRATION.md's "what the built rungs actually test" note).
const EXTENSION_RUNG = 28000;

const HEADINGS = [
  ["decided", "Decided"],
  ["changed", "Changed"],
  ["found", "Found"],
  ["discussed", "Discussed"],
  ["deferred", "Deferred"],
];
const FILL_MIN = 1, FILL_MAX = 3; // extra routine items per session, seeded

console.log(`the-long-project corpus generator`);
console.log(`  rungs: ${RUNGS.join(", ")}  ·  extension rung (declared, not built): ${EXTENSION_RUNG}`);
console.log(`  seed: ${SEED}  ·  out: ${join(HERE, OUT)}`);
console.log(`  plants: ${PLANTS.length}  ·  distractor pool: ${DISTRACTORS.length}  ·  fill items/session: ${FILL_MIN}-${FILL_MAX}`);

const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
const pad3 = (n) => String(n).padStart(3, "0");
const START_DATE = Date.UTC(2025, 0, 6); // 2025-01-06, a Monday
const dateFor = (sessionIndex) => new Date(START_DATE + (sessionIndex - 1) * 3 * 86400000).toISOString().slice(0, 10);

function buildRung(N) {
  const K = PLANTS.length;
  // Even placement, order-preserving: index i (0-based) -> session 1..N.
  const sessionOf = PLANTS.map((_, i) => Math.min(N, 1 + Math.floor((i * N) / K)));
  const bySession = new Map();
  for (let s = 1; s <= N; s++) bySession.set(s, { plants: [], fill: [] });
  PLANTS.forEach((p, i) => bySession.get(sessionOf[i]).plants.push(p));

  const rng = mulberry32((SEED * 1000003 + N) >>> 0);
  // Uniform-with-replacement over the 35 distractor ids, each rendering
  // through paraphrase() (or a manual `variants` override) — see header.
  // Deliberately NOT a cycled/reshuffled queue: that produced a near-flat
  // per-id repeat count, the exact shape the dedup-frequency attack needs.
  const nextDistractor = () => {
    const item = DISTRACTORS[randInt(rng, DISTRACTORS.length)];
    const body = item.variants
      ? [item.body, ...item.variants][randInt(rng, item.variants.length + 1)]
      : paraphrase(item.body, rng, randInt);
    return { kind: item.kind, body };
  };

  for (let s = 1; s <= N; s++) {
    const n = FILL_MIN + randInt(rng, FILL_MAX - FILL_MIN + 1);
    for (let k = 0; k < n; k++) bySession.get(s).fill.push(nextDistractor());
  }

  const files = []; // { path, content }
  const events = {}; // plant id -> session number, for questions.json / score.mjs / verify
  for (let s = 1; s <= N; s++) {
    const { plants, fill } = bySession.get(s);
    for (const p of plants) events[p.id] = s;
    const attendees = shuffled(rng, PEOPLE_NAMES).slice(0, 2 + randInt(rng, 3)); // 2-4
    const items = [...plants.map((p) => ({ kind: p.kind, body: p.body })), ...fill];
    let md = `# Session ${pad3(s)} — ${dateFor(s)}\n\n**Attendees:** ${attendees.join(", ")}\n`;
    for (const [kind, heading] of HEADINGS) {
      const rows = items.filter((it) => it.kind === kind);
      if (!rows.length) continue;
      md += `\n## ${heading}\n`;
      for (const it of rows) md += `- ${it.body}\n`;
    }
    files.push({ path: `session-${pad3(s)}.md`, content: md });
  }

  return { N, files, events };
}

let grandTotal = { words: 0, chars: 0, sessions: 0 };
const rungSummaries = [];

for (const N of RUNGS) {
  const { files, events } = buildRung(N);
  const dir = join(HERE, OUT, `rung-${N}`);
  mkdirSync(dir, { recursive: true });
  for (const f of files) writeFileSync(join(dir, f.path), f.content, "utf8");

  const fileHashes = files.map((f) => ({ path: f.path, sha256: sha256(f.content) })).sort((a, b) => a.path < b.path ? -1 : 1);
  const corpusId = sha256(fileHashes.map((f) => `${f.path}:${f.sha256}`).join("\n"));

  const allText = files.map((f) => f.content).join("\n");
  const words = allText.split(/\s+/).filter(Boolean).length;
  const chars = allText.length;
  // Estimated, not a real tokenizer count (this project's own model-token
  // counters are BPE tokenizers for other models entirely) — words/0.75 is
  // the commonly cited rule of thumb for English prose; disclosed as a
  // heuristic, never treated as exact.
  const estimatedTokens = Math.round(words / 0.75);

  const missing = PLANTS.filter((p) => events[p.id] == null);
  if (missing.length) throw new Error(`rung ${N}: ${missing.length} plant(s) never placed: ${missing.map((p) => p.id).join(", ")}`);

  const manifest = {
    rung: N, seed: SEED, sessionCount: N, plantCount: PLANTS.length,
    corpusId, files: fileHashes, events,
  };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 1));

  const stats = { rung: N, sessions: N, words, chars, estimatedTokens, tokenEstimateMethod: "words / 0.75 (heuristic, not a real tokenizer)" };
  writeFileSync(join(dir, "stats.json"), JSON.stringify(stats, null, 1));

  rungSummaries.push(stats);
  grandTotal.words += words; grandTotal.chars += chars; grandTotal.sessions += N;

  console.log(`  rung-${N}: ${N} sessions, ${words} words, ${chars} chars, ~${estimatedTokens} tokens, corpusId ${corpusId.slice(0, 12)} -> ${dir}`);
}

console.log(`\ndone. ${rungSummaries.length} rung(s) written under ${join(HERE, OUT)}`);
console.log(`extension rung (declared, not generated): ${EXTENSION_RUNG} sessions — build only if rung-300 shows no arm gap (PREREGISTRATION.md).`);
