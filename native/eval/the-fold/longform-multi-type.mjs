// eval/the-fold/longform-multi-type.mjs — long-form generation e2e across
// OUTPUT TYPES, not just essays. Each case starts a detached document job on
// the live proxy, polls it to completion, and the run's scorer (results/
// longform-multi-type-RESULTS.md) reads the ledger for what matters per type:
//   completion   — the void's questions all answered (satisfaction-gated done)
//   citations    — byte-addressed source rows on the ledger (cite.js)
//   grounding    — Kelsen/fidelity move + hyperlexicon + wikisource doors
//   shape        — the void declaration's cardinality/extent hold
// The proxy is the sanctioned egress; these run against whatever is live on
// :11436. Use the same organs a real session uses; nothing here calls the
// model directly.
//
//   node eval/the-fold/longform-multi-type.mjs  env: PROXY=…  CASES=n
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS = join(HERE, "results");
const PROXY = process.env.PROXY ?? "http://127.0.0.1:11436";
const POLL_MS = Number(process.env.POLL_MS ?? 5000);
const IDLE_MS = Number(process.env.IDLE_MS ?? 15000);

// THE TYPE BATTERY — each case is a different SHAPE of longform output. The
// void's 27-cell sweep is the same; what differs is the kind of material the
// reading must hold and the shape the output must fill.
const CASES = [
  {
    name: "essay",
    task: "Write an essay about the bongo antelope: its habitat, its diet, its conservation status, and why it is sometimes called the forest antelope.",
    expects: ["habitat", "diet", "conservation"],
  },
  {
    name: "biography",
    task: "Write a short biography of Ada Lovelace: her parentage, her work with Charles Babbage, what she wrote about the Analytical Engine, and how she is remembered.",
    expects: ["Lovelace", "Babbage", "Analytical Engine"],
  },
  {
    name: "literary-analysis",
    task: "Analyze Herman Melville's Moby-Dick as a literary work: the narrative voice, the symbolism of the white whale, and the themes of obsession and fate. Draw on the primary text.",
    expects: ["whale", "obsession", "Melville"],
    primarySource: "Moby Dick", // Wikisource door should resolve this
  },
  {
    name: "historical-narrative",
    task: "Write a historical account of the shipwreck of the Essex, the whale ship that inspired Moby-Dick: the crew, the ordeal, and what happened to the survivors.",
    expects: ["Essex", "whale", "survivors"],
  },
  {
    name: "technical-brief",
    task: "Write a technical brief explaining how reference counting works in JavaScript engines, and why it fails to collect cycles. Include an example.",
    expects: ["cycle", "reference count", "collect"],
  },
];

const notes = []; // the run's disclosed moves, one per completed job
const errors = [];

async function startJob(c) {
  // WARM OLLAMA first: a long-form case's setup (Gore gather + Wikisource
  // primary admission) can run 10+ minutes before the FIRST draw, during
  // which Ollama's keep_alive expires and the model unloads — then the first
  // draw cold-starts and can blow the per-case timeout. One tiny call before
  // the job pins the model resident.
  await warmOllama();
  const res = await fetch(`${PROXY}/v1/documents`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ task: c.task, model: "gemma2:2b", holonLevel: "section" }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`POST ${res.status}: ${t.slice(0, 200)}`); }
  return res.json();
}

const _ollamaWarmed = { at: 0 };
async function warmOllama() {
  // A tiny call is cheap; doing it per case keeps the model resident across
  // the whole battery. Throttled to once per 5 minutes (a case that finishes
  // fast should not pay a warm-up each time).
  if (Date.now() - _ollamaWarmed.at < 300000) return;
  try {
    const up = await fetch(`${PROXY.replace(":11436", ":11434")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "gemma2:2b", messages: [{ role: "user", content: "OK" }], stream: false, num_predict: 2 }),
    });
    if (up.ok) _ollamaWarmed.at = Date.now();
  } catch { /* best effort — the job's own draws will warm it */ }
}

async function pollJob(jobId, c, startedAt) {
  // Wikisource-heavy cases (a primary text admission in setup) take longer
  // before the first section lands — give them a bigger budget.
  const timeout = c.primarySource
    ? Number(process.env.TIMEOUT_MS ?? 12 * 60 * 1000) + 300000
    : Number(process.env.TIMEOUT_MS ?? 12 * 60 * 1000);
  let last = null;
  while (Date.now() - startedAt < timeout) {
    const res = await fetch(`${PROXY}/v1/documents/${encodeURIComponent(jobId)}`);
    if (!res.ok) { await new Promise((r) => setTimeout(r, POLL_MS)); continue; }
    const j = await res.json();
    last = j;
    if (j.status === "complete") return j;
    if (j.status === "error" || j.job?.error) { errors.push({ case: c.name, error: j.job?.error ?? j.status }); return j; }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  errors.push({ case: c.name, error: `timeout after ${((Date.now() - startedAt) / 1000).toFixed(0)}s` });
  return last ?? { status: "timeout", projection: "" };
}

// Simple grounded checks a type expects: does the projection contain the
// material's own words (primary-source wording), and how much prose landed.
function scoreCase(c, j) {
  const proj = String(j.projection ?? "");
  const chars = proj.length;
  const expected = c.expects ?? [];
  const hits = expected.filter((e) => proj.toLowerCase().includes(e.toLowerCase()));
  // The writer's own claims: sentences that cite (contain "—" or a reference
  // marker) vs. plain prose. Cite rows live on the ledger, not the projection;
  // the projection is the readable essay. Report coverage of expected terms.
  return { chars, covered: hits.length, of: expected.length, missing: expected.filter((e) => !hits.includes(e)) };
}

async function run() {
  const n = Number(process.env.CASES ?? CASES.length);
  // CASES_ONLY="3,5" runs only those 1-based indices (for re-running the
  // cases a partial run didn't prove).
  const only = (process.env.CASES_ONLY ?? "").split(",").map((s) => Number(s.trim())).filter((x) => Number.isInteger(x) && x >= 1);
  const battery = (only.length ? only.map((i) => CASES[i - 1]).filter(Boolean) : CASES.slice(0, n));
  const rows = [];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join(RESULTS, `longform-multi-type-${stamp}`);
  mkdirSync(dir, { recursive: true });
  for (const c of battery) {
    const startedAt = Date.now();
    process.stdout.write(`\n▸ ${c.name}: "${c.task.slice(0, 60)}…" — starting job…\n`);
    try {
      const job = await startJob(c);
      const j = await pollJob(job.jobId ?? job.sessionId ?? "?", c, startedAt);
      const s = scoreCase(c, j);
      const secs = ((Date.now() - startedAt) / 1000).toFixed(0);
      rows.push({ ...c, jobId: job.jobId, status: j.status, secs, ...s });
      process.stdout.write(`  ${j.status} in ${secs}s · ${s.chars} chars · covered ${s.covered}/${s.of} expected terms${s.missing.length ? ` · MISSING: ${s.missing.join(", ")}` : ""}\n`);
      // Flush per case: a partial run (timeout, proxy restart) still records
      // the cases that DID complete — the results are never lost to a crash.
      writeFileSync(join(dir, "cases.json"), JSON.stringify(rows, null, 2));
      writeFileSync(join(dir, "errors.json"), JSON.stringify(errors, null, 2));
    } catch (err) {
      errors.push({ case: c.name, error: err.message });
      rows.push({ ...c, status: "error", error: err.message });
      process.stdout.write(`  ERROR: ${err.message}\n`);
    }
    await new Promise((r) => setTimeout(r, IDLE_MS)); // let the proxy breathe between long jobs
  }

  // ── the run's record (same dir as the per-case flushes) ──
  writeFileSync(join(dir, "cases.json"), JSON.stringify(rows, null, 2));
  writeFileSync(join(dir, "errors.json"), JSON.stringify(errors, null, 2));

  const md = [
    `# Long-form generation e2e — output types beyond the essay`,
    ``,
    `Run ${new Date().toISOString()} · proxy ${PROXY} · model gemma2:2b · ${rows.length} case(s)`,
    ``,
    `| case | status | seconds | chars | covered/of | missing |`,
    `|---|---|---|---|---|---|`,
    ...rows.map((r) => `| ${r.name} | ${r.status} | ${r.secs ?? "—"} | ${r.chars ?? "—"} | ${r.covered ?? "—"}/${r.of ?? "—"} | ${(r.missing ?? []).join(", ") || "—"} |`),
    ``,
    `## Errors`,
    ...(errors.length ? errors.map((e) => `- **${e.case}**: ${e.error}`) : ["- none"]),
    ``,
    `Full per-case records in cases.json.`,
    ``,
  ].join("\n");
  writeFileSync(join(dir, "RESULTS.md"), md);
  console.log(`\n${md}\nrecorded in ${dir}`);
  return { rows, errors, dir };
}

run();