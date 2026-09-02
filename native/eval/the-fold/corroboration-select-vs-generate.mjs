// eval/corroboration-select-vs-generate.mjs — the paraphrase wall, measured
// with both witness protocols on one real ledger.
//
// The F5 bottleneck (reading-recall-finding, addendum 5/6): the ledger's
// >=2-distinct-source gate starved at ~2% because restatements do not
// match; the witness tier is the licensed tool. Two protocols now exist —
// GENERATE (the model writes a because; armed by sibling swap; 0.33 recall,
// 0/36 false) and SELECT (the model points at a mechanically gathered
// sentence; armed by same-index; 2/6, 0/8 false). This driver runs the
// SAME settling walk over the SAME real ledger with the SAME ask budget
// under each, and reports attested notes, notes reaching the gate, ask
// economics, and — the precision guard — attests on PLANTED fabricated
// notes, which must stay 0 for either protocol to count.
import { buildLedger, splitSentences, distinctSources, corroborateLedger, T } from "./lib/borodino-ledger.mjs";
const OLLAMA = "http://localhost:11434", MODEL = "gemma2:2b", BUDGET = Number(process.env.BUDGET ?? 30);
// WINDOW: the co-presence prefilter's reach; "inf" = the whole source. ARMS: which arms to run.
const WINDOW = process.env.WINDOW === "inf" ? Infinity : Number(process.env.WINDOW ?? 400);
const ARMS = (process.env.ARMS ?? "generate,select").split(",");
const { log, hl, sources, planted, heard, before } = await buildLedger();
console.log(`ledger: ${before.length} notes (${heard} heard from 2 pages, ${planted.length} planted fabrications); at >=2 distinct sources before the walk: ${before.filter((n) => distinctSources(n.witnesses).size >= 2).length}`);

// ── asks ──────────────────────────────────────────────────────────────────
let calls = 0;
const chat = async (messages, schema) => {
  calls += 1;
  const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, stream: false, format: schema, options: { num_predict: 200, temperature: 0 }, messages }) });
  return (await res.json())?.message?.content ?? "";
};
const ask = async (s, slice) => T.readTestimony(await chat(T.buildWitnessMessages(s, slice), T.WITNESS_SCHEMA));
const selectAsk = async (messages) => { try { return JSON.parse(await chat(messages, T.SELECT_SCHEMA)); } catch { return {}; } };
const testimony = { witnessSlice: T.witnessSlice, siblingSwap: T.siblingSwap, foldTestimony: T.foldTestimony, buildSelectMessages: T.buildSelectMessages, foldSelect: T.foldSelect };

async function arm(name, extra) {
  calls = 0; const t0 = Date.now();
  const r = await corroborateLedger(log, hl, sources, { ask, testimony, maxAsks: BUDGET, copresenceWindow: WINDOW, ...extra });
  const after = hl.foldHyperlexicon(r.log);
  const gate = after.filter((n) => distinctSources(n.witnesses).size >= 2).length;
  const liedOn = r.attested.filter((a) => planted.includes(`${a.note?.subject}|${a.note?.verb}|${a.note?.object}`.toLowerCase())).length;
  console.log(`\n${name} [window ${WINDOW}]: asks ${r.asks}/${BUDGET} · model calls ${calls} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`  attested ${r.attested.length} · contradicted ${r.contradicted.length} · skipped-no-copresence ${r.skippedNoCopresence} · refusals ${JSON.stringify(r.refusals)}`);
  console.log(`  notes at >=2 DISTINCT sources after: ${gate} (before ${before.filter((n) => distinctSources(n.witnesses).size >= 2).length})`);
  console.log(`  PRECISION GUARD — attests on planted fabrications: ${liedOn} ${liedOn === 0 ? "✓" : "✗ THIS ARM LIED"}`);
  for (const a of r.attested.slice(0, process.env.SHOW ? 999 : 4)) console.log(`    ✓ ${a.note?.subject} —${a.note?.verb}→ ${a.note?.object}  ← ${a.source}`);
  return { name, asks: r.asks, calls, attested: r.attested.length, gate, liedOn };
}
const ran = [];
if (ARMS.includes("generate")) ran.push(await arm("GENERATE (write a because, sibling-swap arm)", {}));
if (ARMS.includes("select")) ran.push(await arm("SELECT (point at a gathered sentence, same-index arm)", { selectAsk, splitSentences }));
console.log(`\n── SUMMARY ── same ledger, same budget (${BUDGET} asks), window ${WINDOW}`);
for (const a of ran) console.log(`  ${a.name.split(" ")[0].padEnd(9)} attested ${a.attested} · gate ${a.gate} · calls ${a.calls} · attested-per-call ${(a.attested / Math.max(1, a.calls)).toFixed(3)} · lied ${a.liedOn}`);
