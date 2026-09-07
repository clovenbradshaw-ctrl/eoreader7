// read-run.mjs — a run's summary by the reading's own organs, no model: the
// transcript as a stream of exchanges over the novel's referent index, the
// ledger's notes, and the three resolution blocks (atmosphere over the whole
// run, the lens on what was most asked about, what recurs), then the rows'
// own tallies. The addresses stay in — this is the record's summary for a
// person, not a prompt for the mouth.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { organs as productOrgans } from "./lib/product-assay.mjs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const ROOT = new URL("../../../../", import.meta.url).pathname;
const FOLD = `${ROOT}the-fold/`;
const DIR = process.argv[2]; if (!DIR || !existsSync(join(DIR, "turns.jsonl"))) { console.error("usage: read-run.mjs <results dir>"); process.exit(2); }
const O = await productOrgans();
const { makeReferentIndex } = await import(`${FOLD}cast.js`);
const { atmosphereBlock, lensBlock, paradigmBlock, activeReferents, exchangesOf } = await import(`${FOLD}resolutions.js`);
const { mentionBook } = await import(`${FOLD}activation-retrieval.js`);
const { replayRecord } = await import(`${FOLD}record-log.js`);
const TL = await import(`${NATIVE}/kernel/task-log.js`);
const { dmdWindow } = await import(`${NATIVE}/kernel/activation.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });

const config = JSON.parse(readFileSync(join(DIR, "config.json"), "utf8"));
const rows = readFileSync(join(DIR, "turns.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const src = config.sources?.[0]; const path = src?.path ?? `${FOLD}pg2554.txt`;
const text = readFileSync(path, "utf8");
const chunks = O.chunkSource(src?.name ?? "pg2554.txt", text).map((c) => ({ ...c, source: src?.name ?? "pg2554.txt", kind: "prose" }));
const index = indexFor(chunks); const book = mentionBook(chunks, index, { splitSentences });
const prominence = (id) => book.byId.get(id)?.length ?? 0;
let notes = [];
const ledgerPath = join(NATIVE, "eval/the-fold/results/ledgers", `${config.corpusId}-${O.recipe}.jsonl`);
if (existsSync(ledgerPath)) { const rep = replayRecord(readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean), { createTaskLog: TL.createTaskLog, append: TL.append }); if (rep.log) notes = O.hl.foldWithStanding(rep.log); }
const transcript = rows.map((r) => ({ turn: r.turn, question: r.question, answer: r.answer, refs: r.refs ?? [] }));

console.log(`# ${DIR.split("/").pop()} — read by the organs\n`);
console.log(`${rows.length} turns · ${config.model} answering · resolutions ${config.resolutions ?? 0} · retrieval ${config.retrieval ?? "terms"} · material ${config.material ?? "passages"} · ledger ${notes.length} notes · corpus ${index.referents.size} referents\n`);

// THE ATMOSPHERE over the whole run: every ground the conversation stood on, in order.
const ex = exchangesOf(transcript, index).filter((e) => e.ids.size);
const grounds = [];
for (const e of ex) { const cur = grounds.at(-1); const opens = !cur || (e.asked.size && ![...e.asked].some((id) => cur.ids.has(id))); if (opens) grounds.push({ exchanges: [e], ids: new Set(e.ids) }); else { cur.exchanges.push(e); for (const id of e.ids) cur.ids.add(id); } }
const rep = (id) => index.represent(id) ?? id;
console.log(`## Where the conversation stood (${grounds.length} grounds over ${ex.length} exchanges that resolve to a referent)`);
for (const g of grounds) { const ids = [...g.ids].sort((a, b) => g.exchanges.filter((e) => e.ids.has(b)).length - g.exchanges.filter((e) => e.ids.has(a)).length || prominence(b) - prominence(a)).slice(0, 3).map(rep); const t = g.exchanges.map((e) => e.turn); console.log(`- turns ${t[0]}${t.length > 1 ? `–${t.at(-1)}` : ""}: ${ids.join(", ")}${g.exchanges.flatMap((e) => e.refs).length ? ` [${[...new Set(g.exchanges.flatMap((e) => e.refs))].slice(0, 3).join(", ")}]` : ""}`); }
console.log(atmosphereBlock({ question: rows.at(-1)?.question ?? "", transcript, index, prominence }).lines.map((l) => `  ${l}`).join("\n"));

// THE LENS on what was most asked about: the referents the questions named most, and what the ledger and the run say about them.
const asked = new Map(); for (const e of ex) for (const id of e.asked) asked.set(id, (asked.get(id) ?? 0) + 1);
const top = [...asked].sort((a, b) => b[1] - a[1]).slice(0, 4);
console.log(`\n## What was most asked about, and what is said`);
for (const [id, n] of top) {
  const l = lensBlock({ question: rep(id), active: new Set([id]), index, notes, transcript, dmdWindow });
  console.log(`- ${rep(id)} — asked about in ${n} exchange(s)`);
  for (const line of l.lines.filter((x) => x.startsWith("- ")).slice(0, 5)) console.log(`  ${line}`);
}
// WHAT RECURS
const p = paradigmBlock({ active: new Set(top.map(([id]) => id)), index, notes, dmdWindow });
if (p.lines.length) { console.log(`\n## What recurs`); for (const line of p.lines) console.log(`- ${line}`); }

// THE ROWS' OWN TALLIES
const n = rows.length; const calls = rows.reduce((a, r) => a + (r.calls ?? 0), 0);
const by = {}; for (const r of rows) { const m = r.move; by[m] ??= { n: 0, addressed: 0, resolved: 0 }; by[m].n++; if (r.addressed === true) by[m].addressed++; if (r.resolved) by[m].resolved++; }
const ta = rows.flatMap((r) => r.turnAddressed ?? []);
const auth = rows.map((r) => r.expectation?.authorship).filter((a) => a != null);
console.log(`\n## The rows' own tallies`);
console.log(`- prompt tokens per call ${(rows.reduce((a, r) => a + (r.promptTokens ?? 0), 0) / Math.max(1, calls)).toFixed(0)}, calls per turn ${(calls / n).toFixed(2)}, seconds per turn ${(rows.reduce((a, r) => a + (r.ms ?? 0), 0) / 1000 / n).toFixed(1)}`);
console.log(`- re-asked ${ta.filter((a) => a.reasked).length}, asked-about fully named ${ta.filter((a) => a.all === true).length}/${ta.length}, absences declared ${rows.reduce((a, r) => a + (r.voidsDeclared?.length ?? (r.turnAddressed ?? []).filter((x) => x.resolvedOn === "absence").length), 0)}`);
console.log(`- authorship ${auth.length ? (auth.reduce((a, b) => a + b, 0) / auth.length).toFixed(2) : "—"} over ${auth.length} measurable turns; unsupported sentences ${rows.reduce((a, r) => a + (r.unsupported ?? 0), 0)}; corrections learned ${rows.reduce((a, r) => a + (r.learnedAdded ?? 0), 0)}; owned ${rows.reduce((a, r) => a + (r.owned ?? 0), 0)}`);
console.log(`- retrieval ${JSON.stringify(rows.reduce((a, r) => { for (const y of r.retrieval ?? []) a[y.basis] = (a[y.basis] ?? 0) + 1; return a; }, {}))}; moves ${Object.entries(by).map(([m, v]) => `${m} ${v.n} (${v.addressed} addressed, ${v.resolved} resolved)`).join(", ")}`);
