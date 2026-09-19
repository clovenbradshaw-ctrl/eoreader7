// frontier-token-recall.mjs — a battery that measures TOKEN USAGE and RECALL.
//
//   MODELS=gemma2:2b,anthropic/claude-sonnet-4-6 node frontier-token-recall.mjs
//
// Three arms, server-side counters only:
//   LOCAL    — a free local mouth through eoreader7 (POST /v1/ask with the
//              material as an attachment: the full reading pipeline).
//   FRONTIER — a paid frontier mouth through the SAME pipeline (same grounding,
//              same prompt shape — the only difference is who speaks).
//   RAW      — the bare frontier question straight at api.anthropic.com (no
//              grounding, no pipeline). The ungrounded control.
//
// The materials plant SYNTHETIC facts (a fictitious archive no weights can
// know), so recall is honest: the raw arm cannot answer from training, the
// grounded arms can only answer by reading. Recall is mechanical — normalized
// atom substrings, never a model judge — and the headline numbers are:
//
//   mean recall per arm, total input/output tokens per arm,
//   tokens per recalled atom per arm (the cost of one remembered fact).
//
// SHARED=1 runs a mouth's tasks in ONE session (the learning curve: fold,
// activation, hyperlexicon accumulate); default isolates a fresh session per
// task. Results print as a table and land in results/frontier-token-recall-<stamp>.json.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ER7 = (process.env.ER7 ?? "http://127.0.0.1:11436").replace(/\/+$/, "");
const ANTHROPIC_URL = (process.env.ER7_ANTHROPIC_URL ?? "https://api.anthropic.com").replace(/\/+$/, "");
const KEY = process.env.ANTHROPIC_API_KEY ?? "";
// SHARED=1 runs all tasks in ONE session (the learning curve: fold, activation,
// hyperlexicon and prompt-cache accumulate); default isolates a fresh session
// per task (independent measurements). Fresh is the honest default for recall;
// shared is the honest mode for cost-over-use.
const SHARED = (process.env.SHARED ?? "0") === "1";
// MODELS: the mouths to run grounded, comma-separated — local tags and/or
// frontier ids (MODEL is kept as a one-mouth alias). Default is the honest
// three-way split: free local, paid frontier through the same pipeline.
// ARMS selects which arms run (comma-separated subset of local,frontier,raw,
// hybrid); default all. HYBRID_LOCAL names the free notes-writer for the
// hybrid arm (default: the first non-frontier mouth in MODELS).
const MODELS = (process.env.MODELS ?? process.env.MODEL ?? "gemma2:2b,anthropic/claude-sonnet-4-6")
  .split(",").map((s) => s.trim().replace(/^er7:/, "")).filter(Boolean);
const ARMS = (process.env.ARMS ?? "local,frontier,raw,hybrid").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const isFrontier = (m) => /claude|anthropic/i.test(m);
const HYBRID_LOCAL = (process.env.HYBRID_LOCAL ?? "").trim().replace(/^er7:/, "")
  || MODELS.find((m) => !isFrontier(m)) || "gemma2:2b";

// ── the battery: three planted documents, nine questions ─────────────────────
const MATERIALS = {
  "tallin-archive.txt": `The Tallin Maritime Archive records the winter convoy of 1814, when
harbormaster Ilsa Venn ordered seventeen lanterns lit along the harbor of glass
to guide the ice-cut ships home. The copper decree of 1814 fixed the pilot's
fee at nine copper rings per mast, payable to the Lantern Guild. Venn's deputy,
a rope-maker named Tomas Kell, kept the tally on knotted cord: forty-one knots
for forty-one ships, and one red knot for the ship that never came, the
Meridian Star. The archive's north drawer holds Kell's cord to this day.`,
  "vessa-herbarium.txt": `The Vessa Herbarium's third folio describes the glasspetal, a flower
that opens only in hail. Curator Odo Marren pressed six specimens in the spring
of 1902 and noted the petal count aloud: eleven petals on every bloom, no more,
no less. Marren's assistant, a beekeeper called Sella Ives, recorded that the
bees would not touch it — "the hive goes silent," she wrote, "when the
glasspetal cracks." The folio's margin carries her sketch of a Hive With No
Door, dated the third hailstorm of that April.`,
  "kett-ledger.txt": `Ledger-monk Brother Kett balanced the granary books of Aubergine Hall
for thirty years and never once used the word "shortage." His rule, the kett
measure, allowed each household a sack of rye per moon and a second sack only
when the bell tower showed two shadows at noon. The ledger's final page, in
Kett's own hand, forgives a debt of seventy silver spoons owed by the miller
Dorra Finch, "paid in full by one honest winter." The spoons were never
returned; they hang above the mill door, seventy in a row.`,
};

const TASKS = [
  { id: "T1", doc: "tallin-archive.txt", q: "How many lanterns did Ilsa Venn order lit, and where?", atoms: ["seventeen lanterns", "harbor of glass"] },
  { id: "T2", doc: "tallin-archive.txt", q: "What did the copper decree of 1814 fix, and at what price?", atoms: ["copper decree of 1814", "nine copper rings per mast"] },
  { id: "T3", doc: "tallin-archive.txt", q: "What did Tomas Kell's knotted cord record, and what was the red knot?", atoms: ["forty-one knots", "forty-one ships", "meridian star"] },
  { id: "T4", doc: "vessa-herbarium.txt", q: "When does the glasspetal open, and how many petals does it have?", atoms: ["opens only in hail", "eleven petals"] },
  { id: "T5", doc: "vessa-herbarium.txt", q: "What did Sella Ives write about the bees and the glasspetal?", atoms: ["hive goes silent", "sella ives"] },
  { id: "T6", doc: "vessa-herbarium.txt", q: "What is the Hive With No Door, and when was it dated?", atoms: ["hive with no door", "third hailstorm"] },
  { id: "T7", doc: "kett-ledger.txt", q: "What is the kett measure?", atoms: ["kett measure", "sack of rye per moon", "two shadows at noon"] },
  { id: "T8", doc: "kett-ledger.txt", q: "What debt did Brother Kett forgive, and to whom?", atoms: ["seventy silver spoons", "dorra finch"] },
  { id: "T9", doc: "kett-ledger.txt", q: "Where are the seventy spoons now?", atoms: ["above the mill door", "seventy in a row"] },
];

// ── mechanical recall: normalized atom substrings, never a model judge ───────
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
function scoreRecall(answer, atoms) {
  const a = norm(answer);
  const hits = atoms.filter((atom) => a.includes(norm(atom)));
  return { hits: hits.length, of: atoms.length, recall: atoms.length ? hits.length / atoms.length : 0, missed: atoms.filter((x) => !hits.includes(x)) };
}

async function pickFrontierModel() {
  const want = MODELS.find(isFrontier);
  if (want) return want;
  const res = await fetch(`${ANTHROPIC_URL}/v1/models?limit=50`, {
    headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01" },
  });
  if (!res.ok) throw new Error(`models list: ${res.status}`);
  const body = await res.json();
  const ids = (body?.data ?? []).map((m) => m.id);
  return ids.find((id) => /sonnet/i.test(id)) ?? ids[0] ?? (() => { throw new Error("no models on the account"); })();
}
const bareModel = (m) => String(m).replace(/^er7:/, "").replace(/^anthropic\//i, "");

async function groundedArm(model, task, sessionId) {
  const res = await fetch(`${ER7}/v1/ask`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-er7-session": sessionId },
    body: JSON.stringify({
      task: task.q,
      model,
      attachments: [{ name: task.doc, text: MATERIALS[task.doc] }],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`grounded ${task.id}: ${body?.error ?? res.status}`);
  return {
    text: body.answer ?? "",
    input: body.usage?.promptTokens ?? 0,
    output: body.usage?.completionTokens ?? 0,
    // The learning-curve telemetry: what the reading did this turn, so a
    // shared-session run shows whether the fold gets cheaper as it learns
    // (fewer edges/bindings re-derived, mechanical early-returns, cache).
    edges: body.relationEdges ?? null,
    bindings: body.referentBindings ?? null,
    mechanical: body.mechanical ?? null,
    truncated: body.truncated ?? false,
  };
}

async function rawArm(task, apiModel) {
  const res = await fetch(`${ANTHROPIC_URL}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: apiModel,
      max_tokens: 512,
      system: "Answer briefly and factually. If you do not know, say so.",
      messages: [{ role: "user", content: task.q }],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`raw ${task.id}: ${body?.error?.message ?? res.status}`);
  const text = (body.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return {
    text,
    input: body.usage?.input_tokens ?? 0,
    output: body.usage?.output_tokens ?? 0,
    cacheRead: body.usage?.cache_read_input_tokens ?? 0,
  };
}

// HYBRID — local notes, frontier generation. Stage 1 (FREE): the full
// pipeline with the free local mouth writes grounded reading notes. Stage 2
// (PAID): the frontier mouth generates the final answer from THOSE NOTES
// alone — no material, no pipeline. Paid tokens are stage 2 only; the
// question is whether recall survives the handoff, and at what paid price.
async function hybridArm(localModel, task, sessionId, apiModel) {
  const notes = await groundedArm(localModel, task, `${sessionId}-notes`);
  if (notes.error) return { ...notes, stage: "notes" };
  const res = await fetch(`${ANTHROPIC_URL}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: apiModel,
      max_tokens: 512,
      system: "Answer the user's question using ONLY the reading notes below. If the notes do not contain the answer, say so plainly. Do not use outside knowledge.",
      messages: [{ role: "user", content: `Reading notes:\n${notes.text}\n\nQuestion: ${task.q}` }],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`hybrid gen ${task.id}: ${body?.error?.message ?? res.status}`);
  const text = (body.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return {
    text,
    input: body.usage?.input_tokens ?? 0,
    output: body.usage?.output_tokens ?? 0,
    cacheRead: body.usage?.cache_read_input_tokens ?? 0,
    freeNotesChars: notes.text.length,
    freeInput: notes.input,
    freeOutput: notes.output,
  };
}

const pad = (s, n) => String(s ?? "").padEnd(n).slice(0, n);

async function main() {
  if (!KEY) throw new Error("ANTHROPIC_API_KEY is required (env only — never in files).");
  const frontierModel = await pickFrontierModel();
  const apiModel = bareModel(frontierModel);
  console.log(`mouths (grounded): ${MODELS.join(", ")} · raw control: ${apiModel} · er7: ${ER7} · shared=${SHARED ? "yes" : "no"}\n`);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const sum = (xs) => xs.reduce((a, b) => a + b, 0);
  const aggRows = (rows) => {
    if (!rows.length) return { meanRecall: 0, atomsHit: 0, atomsOf: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, tokensPerRecalledAtom: null, skipped: true };
    const recs = rows.map((x) => x.score.recall);
    const atomsHit = sum(rows.map((x) => x.score.hits));
    const inT = sum(rows.map((x) => x.input));
    const outT = sum(rows.map((x) => x.output));
    return {
      meanRecall: recs.reduce((a, b) => a + b, 0) / recs.length,
      atomsHit, atomsOf: sum(rows.map((x) => x.score.of)),
      inputTokens: inT, outputTokens: outT, totalTokens: inT + outT,
      tokensPerRecalledAtom: atomsHit ? (inT + outT) / atomsHit : null,
    };
  };

  const arms = {}; // model -> { rows, summary }
  for (const model of MODELS) {
    if (isFrontier(model) ? !ARMS.includes("frontier") : !ARMS.includes("local")) continue;
    const rows = [];
    for (const task of TASKS) {
      // Fresh session per task by default (independent measurements); one
      // session in SHARED mode (the learning curve).
      const sid = SHARED ? `ftr-${stamp}-${model.replace(/[^a-z0-9]+/gi, "-")}` : `ftr-${stamp}-${task.id}`;
      const g = await groundedArm(model, task, sid).catch((e) => ({ text: `[ERROR] ${e.message}`, input: 0, output: 0, error: e.message }));
      const s = scoreRecall(g.text, task.atoms);
      rows.push({ id: task.id, q: task.q, result: { ...g, ...s }, score: s, input: g.input, output: g.output });
      console.log(`${pad(model, 32)} ${task.id} ${s.hits}/${s.of} rec=${s.recall.toFixed(2)} in=${g.input} out=${g.output}${g.error ? ` ERR ${g.error.slice(0, 80)}` : ""}${g.edges != null ? ` edges=${g.edges} bindings=${g.bindings}` : ""}`);
      if (s.missed.length) console.log(`${" ".repeat(42)}missed: ${s.missed.join(" · ")}`);
    }
    arms[model] = { rows, summary: aggRows(rows.map((r) => ({ ...r, score: r.score }))) };
  }

  // RAW: the ungrounded control, once (it takes no material by design).
  const rawRows = [];
  if (ARMS.includes("raw")) {
  for (const task of TASKS) {
    const r = await rawArm(task, apiModel).catch((e) => ({ text: `[ERROR] ${e.message}`, input: 0, output: 0, error: e.message }));
    const s = scoreRecall(r.text, task.atoms);
    rawRows.push({ id: task.id, q: task.q, result: { ...r, ...s }, score: s, input: r.input, output: r.output });
    console.log(`${pad(`raw/${apiModel}`, 32)} ${task.id} ${s.hits}/${s.of} rec=${s.recall.toFixed(2)} in=${r.input} out=${r.output}${r.error ? ` ERR ${r.error.slice(0, 80)}` : ""}`);
  }
  }

  // HYBRID: free local notes, paid frontier generation.
  let hybridRows = [];
  if (ARMS.includes("hybrid")) {
    for (const task of TASKS) {
      const sid = SHARED ? `ftr-${stamp}-hybrid` : `ftr-${stamp}-hyb-${task.id}`;
      const h = await hybridArm(HYBRID_LOCAL, task, sid, apiModel).catch((e) => ({ text: `[ERROR] ${e.message}`, input: 0, output: 0, error: e.message }));
      const s = scoreRecall(h.text, task.atoms);
      hybridRows.push({ id: task.id, q: task.q, result: { ...h, ...s }, score: s, input: h.input, output: h.output });
      console.log(`${pad(`hybrid/${HYBRID_LOCAL}+${apiModel}`, 32)} ${task.id} ${s.hits}/${s.of} rec=${s.recall.toFixed(2)} paid-in=${h.input} paid-out=${h.output} (free notes: ${h.freeNotesChars ?? 0}ch)${h.error ? ` ERR ${h.error.slice(0, 80)}` : ""}`);
      if (s.missed.length) console.log(`${" ".repeat(42)}missed: ${s.missed.join(" · ")}`);
    }
  }

  const summary = {
    at: new Date().toISOString(), er7: ER7, shared: SHARED,
    raw: { model: apiModel, ...aggRows(rawRows.map((r) => ({ ...r, score: r.score }))) },
    arms: Object.fromEntries(Object.entries(arms).map(([m, a]) => [m, a.summary])),
    ...(hybridRows.length ? { hybrid: { notes: HYBRID_LOCAL, gen: apiModel, ...aggRows(hybridRows.map((r) => ({ ...r, score: r.score }))) } } : {}),
  };
  console.log(`\n── headline ──`);
  const line = (name, s) => console.log(`${pad(name, 32)} recall=${s.meanRecall.toFixed(2)} atoms=${s.atomsHit}/${s.atomsOf} in=${s.inputTokens} out=${s.outputTokens} total=${s.totalTokens} tok/atom=${s.tokensPerRecalledAtom == null ? "n/a" : s.tokensPerRecalledAtom.toFixed(0)}`);
  for (const [m, s] of Object.entries(summary.arms)) line(`grounded/${m}`, s);
  if (hybridRows.length) line(`hybrid/${HYBRID_LOCAL}+${apiModel}`, summary.hybrid);
  line(`raw/${apiModel}`, summary.raw);

  mkdirSync(join(HERE, "results"), { recursive: true });
  const path = join(HERE, "results", `frontier-token-recall-${stamp}.json`);
  writeFileSync(path, JSON.stringify({ summary, arms: Object.fromEntries(Object.entries(arms).map(([m, a]) => [m, a.rows])), raw: rawRows, hybrid: hybridRows }, null, 2));
  console.log(`\nwrote ${path}`);
}

await main();
