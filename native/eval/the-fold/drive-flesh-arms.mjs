// drive-flesh-arms.mjs — THE EXPERIMENT'S STEP 3 (plans/generation-terrain-stance.md):
// F1 (today's path, prosify.js) and F2 (level by level, flesh2.js) live on the
// two best skeletons — A0 (control, the committed arrangement) and A2 (stance
// moves) — over the OHS dossier, measured the same way.
//
//   node drive-flesh-arms.mjs --arm A0|A2 --flesh F1|F2 [--model gemma2:2b] [--prefix ts]
//
// Each run goes through the SAME pipeline stages (register → void → ground →
// draft → referents → EOT → arrange [the arm] → steer → select → flesh →
// archons → tighten → turns → arrival); only the arrangement and the flesh
// differ. The ledger lands in documents/<prefix>-<flesh>-<arm>:1.jsonl.
// A run killed at any point leaves its ledger, and the piece at the last
// stable loop (Hora).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "../../the-fold/pipeline-run.mjs";
import { armsFor } from "./skeleton-arms.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };

const arm = arg("arm", "A0");
const flesh = arg("flesh", "F1");
const model = arg("model", "gemma2:2b");
const prefix = arg("prefix", "ts");
const id = `${prefix}-${flesh.toLowerCase()}-${arm.toLowerCase()}`;

const TASK = "Write an essay on what the audit found about the Office of Homeless Services and how the audit committee responded.";
// The flesh phase runs on the recommendations follow-up — the OHS document
// whose stance structure is the experiment's (graded recommendations, the
// committee's responses) — a bounded slice of the four-document dossier. The
// full 506-statement dossier is the skeleton phase's source; the flesh phase
// on it draws dozens of finer calls per giant stance section (measured: a
// single run exceeded ten minutes mid-prose). The arm is rebuilt on this
// ground, as every run's arrangement is.
// The raw derived ground still carries the PDF's letterhead and page
// headers ("METROPOLITAN NASHVILLE GOVERNMENT / OFFICE OF INTERNAL AUDIT",
// the committee members' names) — measured live 2026-09-21: it leaked
// straight into a floored piece. fixtures/ohs-followup-audit.md is the same
// document with the letterhead and page furniture stripped, paragraphs only —
// the ground the flesh phase actually reads from.
const GROUND = [
  process.argv.includes("--ground") ? process.argv[process.argv.indexOf("--ground") + 1] : path.join(HERE, "fixtures", "ohs-followup-audit.md"),
];

// A skeleton arm as an outline the pipeline can arrange from. A0 is the
// committed arrangement itself (arrangeEssay), so it needs no injection.
const armOutline = (draft) => {
  const { arms } = armsFor(draft);
  const secs = arms[arm];
  return {
    schema: "EOEssayOutline@1",
    thesis: null, thesisCandidates: [],
    basis: `skeleton arm ${arm} — ${secs.map((s) => s.name).join(", ")}`,
    slots: secs.map((s, i) => ({ slot: `body ${i + 1}`, statements: s.ids, basis: s.name })),
    links: [], findings: [], weakened: [],
  };
};

const t0 = Date.now();
const { docId, result } = await runPipeline({
  task: TASK,
  groundFiles: GROUND,
  model,
  id,
  arrange: arm === "A0" ? null : ({ draft }) => armOutline(draft),
  flesh: flesh === "F2" ? "flesh2" : "prosify",
  onStage: (s) => console.error(`  · ${s.role}: ${s.title}`),
});

const out = path.join(HERE, `../the-fold/results/terrain-stance-2026-09-21`);
fs.mkdirSync(out, { recursive: true });
// The run summary lives in the ledger; pull it so the comparison has one line.
let summary = null;
const ledgerPath = path.join(HERE, "../../../documents", `${docId}.jsonl`);
try {
  const summaryLine = fs.readFileSync(ledgerPath, "utf8").split("\n").find((l) => l.includes('"role":"summary"'));
  if (summaryLine) summary = JSON.parse(summaryLine).text;
} catch {}
fs.writeFileSync(path.join(out, `flesh-${flesh.toLowerCase()}-${arm.toLowerCase()}.json`), JSON.stringify({
  docId, arm, flesh, model, ground: GROUND[0], seconds: Math.round((Date.now() - t0) / 1000),
  summary,
  parts: result?.parts?.map((p) => ({ id: p.id, status: p.status, of: p.of, floored: p.floored, pieces: (p.pieces ?? []).length })) ?? null,
  levels: result?.levels ?? null,
}, null, 2));
console.error(`\nwrote ${path.join(out, `flesh-${flesh.toLowerCase()}-${arm.toLowerCase()}.json`)} · ${docId}`);