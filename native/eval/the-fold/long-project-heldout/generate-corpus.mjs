// generate-corpus.mjs — builds "the Emberlink Project" corpus: a sequence of
// session-NNN.md files that read like real working-session summaries for an
// INVENTED software project (codename Emberlink — company, product,
// services, config keys, and every person are fictitious; see lib/
// people.mjs). Mostly routine distractor content (lib/distractors.mjs), with
// PLANTED fact-chains (lib/plants.mjs) spread evenly across the whole span,
// identical in content at every rung — only how many distractor sessions
// separate them changes.
//
// Adapted from long-project/generate-corpus.mjs (same machinery: even
// placement by array index, seeded distractor fill, seeded paraphrase
// rendering, manifest/stats output) — this file's own content (the cast,
// the plants, the distractors) is new and independent of long-project's.
//
// THE ONE BEHAVIORAL ADDITION versus the copied source: ATTENDEE GATING.
// lib/people.mjs marks Declan Osei-Praveen `gatedBy: "t5-3-establish"` — he
// is introduced mid-project (T5-3) and must never appear in an attendee list
// before that plant's own session at whichever rung is being built. Plain
// attendee sampling (shuffle the full roster, slice 2-4) would occasionally
// draw him for an earlier session by chance, which would silently break the
// T5-3 "first-establishing session" ground truth the same way an unguarded
// distractor mention would (see lib/plants.mjs's and lib/distractors.mjs's
// headers). buildRung() computes each plant's session placement first, then
// samples attendees only from whoever is already "introduced" as of that
// session.
//
// WHAT THIS DOES NOT DO: it does not run either arm and it does not grade
// anything — see score.mjs for mechanical grading and verify-ground-truth.mjs
// for confirming the ground truth is actually present (or, for T4, actually
// absent) before any subject runs.
//
//   node generate-corpus.mjs [--rungs 12,60,300] [--seed 4471903] [--out corpus]
//
// A rung's session count is the only thing that changes the placement: event
// index i of K total lands on session `1 + floor(i * N / K)` — even spacing
// across 1..N, so relative order (and every chain's internal order) is
// preserved at any N.
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mulberry32, randInt, shuffled } from "./lib/prng.mjs";
import { PLANTS } from "./lib/plants.mjs";
import { DISTRACTORS } from "./lib/distractors.mjs";
import { PEOPLE } from "./lib/people.mjs";
import { paraphrase } from "./lib/paraphrase.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

// ── configuration, printed first (state the reader's configuration before
// claiming anything about material) ──────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : dflt; };
const RUNGS = flag("rungs", "12,60,300").split(",").map((s) => Number(s.trim())).filter(Number.isFinite);
const SEED = Number(flag("seed", 4471903));
const OUT = flag("out", "corpus");

const HEADINGS = [
  ["decided", "Decided"],
  ["changed", "Changed"],
  ["found", "Found"],
  ["discussed", "Discussed"],
  ["deferred", "Deferred"],
];
const FILL_MIN = 1, FILL_MAX = 3; // extra routine items per session, seeded

console.log(`the-emberlink-project corpus generator (held-out benchmark)`);
console.log(`  rungs: ${RUNGS.join(", ")}`);
console.log(`  seed: ${SEED}  ·  out: ${join(HERE, OUT)}`);
console.log(`  plants: ${PLANTS.length}  ·  distractor pool: ${DISTRACTORS.length}  ·  fill items/session: ${FILL_MIN}-${FILL_MAX}  ·  people: ${PEOPLE.length} (${PEOPLE.filter((p) => p.gatedBy).length} gated)`);

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
    const { plants } = bySession.get(s);
    for (const p of plants) events[p.id] = s;
  }

  // ATTENDEE GATING (see header): a gated person is eligible for session s
  // only once their own gatedBy plant has already landed at or before s —
  // computed from `events` above, per rung, since placement is rung-
  // dependent. An ungated person is eligible from session 1.
  const eligibleAsOf = (s) => PEOPLE.filter((p) => !p.gatedBy || events[p.gatedBy] <= s).map((p) => p.name);

  for (let s = 1; s <= N; s++) {
    const { plants, fill } = bySession.get(s);
    const roster = eligibleAsOf(s);
    const attendees = shuffled(rng, roster).slice(0, 2 + randInt(rng, 3)); // 2-4
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
  // Estimated, not a real tokenizer count — words/0.75 is the commonly cited
  // rule of thumb for English prose; disclosed as a heuristic, never treated
  // as exact.
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
