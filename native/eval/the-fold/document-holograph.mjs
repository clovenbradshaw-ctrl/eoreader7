// document-holograph.mjs — a constitutional, no-model document holograph.
//
//   node eval/the-fold/document-holograph.mjs --run <conversation-dir>
//        [--question "What does the paper say about the Transformer?"]
//
// The run must contain a persisted constitutional reading and must have a
// matching append-only ledger. The driver refuses missing artifacts rather
// than silently falling back to a presence index or a string summary.
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { organs as productOrgans } from "./lib/product-assay.mjs";
import { computeDocumentHolograph } from "./lib/document-holograph.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(HERE, "../../../../");
const RESULTS = join(HERE, "results");
const args = process.argv.slice(2);
const flag = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 && args[i + 1] != null ? args[i + 1] : d; };
const RUN = flag("run", null);
const QUESTION = flag("question", "What does the document say about the Transformer?");
if (!RUN) { console.error("refused: fixture_absent — --run <conversation-dir> is required; run conversation.mjs with --reading constitutional first"); process.exit(2); }

const dir = RUN.startsWith("/") ? RUN : existsSync(RUN) ? RUN : existsSync(join(HERE, RUN)) ? join(HERE, RUN) : join(RESULTS, "conversation", RUN);
const configPath = join(dir, "config.json");
if (!existsSync(configPath)) { console.error(`refused: fixture_absent — conversation config is absent: ${configPath}`); process.exit(2); }
const cfg = JSON.parse(readFileSync(configPath, "utf8"));
if (cfg.reading !== "constitutional" || !cfg.readingAssembly) { console.error("refused: organ_unreachable — the supplied run was not made with the constitutional reader"); process.exit(2); }
const readingName = `${cfg.corpusId}-${String(cfg.readingAssembly).replace(/[^\w.-]+/g, "_")}.jsonl`;
const readingPath = join(RESULTS, "readings", readingName);
const ledgerPath = join(RESULTS, "ledgers", `${cfg.corpusId}-${cfg.recipe}.jsonl`);
for (const [what, p] of [["reading", readingPath], ["ledger", ledgerPath]]) if (!existsSync(p)) { console.error(`refused: fixture_absent — ${what} is absent: ${p}`); process.exit(2); }
const source = cfg.sources?.[0];
if (!source?.path || !existsSync(source.path)) { console.error(`refused: fixture_absent — source bytes are absent: ${source?.path ?? "unknown"}`); process.exit(2); }

const O = await productOrgans();
const { replayRecord } = await import(join(ROOT, "the-fold", "record-log.js"));
const TL = await import(join(HERE, "../../kernel/task-log.js"));
const { reconstruct } = await import(join(HERE, "../../kernel/fold.js"));
const { diaNorm, namesCorefer } = await import(join(HERE, "../../adapters/text/surfaces.js"));
const { surfaceIndex, surfacesIn } = await import(join(HERE, "../../adapters/text/recursive.js"));
const ledger = replayRecord(readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean), { createTaskLog: TL.createTaskLog, append: TL.append }).log;
const notes = O.hl.foldWithStanding(ledger);
const readingEntries = readFileSync(readingPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const result = computeDocumentHolograph({
  question: QUESTION,
  readingEntries,
  notes,
  sources: { [source.name]: readFileSync(source.path, "utf8") },
  organs: { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn },
});
if (result.basis === "typed_gap") { console.error(`refused: ${result.gap} — ${JSON.stringify(result)}`); process.exit(2); }

console.log(`document-holograph — constitutional reading · ${source.name} · recipe ${cfg.recipe}`);
console.log(`  question: ${QUESTION}`);
console.log(`  identity: ${JSON.stringify(result.identity)} · ${result.referents} reader referents · ${result.addressedSentences} addressed sentences · ${result.notes} ledger notes`);
console.log(`  lens: ${result.lens.window} notes${result.lens.ceiling ? " (declared ceiling)" : " (measured cut)"} · ${result.lens.basis}`);
for (const line of result.lens.lines) console.log(`  ${line}`);
console.log(`  grounding: ${result.grounding.window} sentences${result.grounding.ceiling ? " (declared ceiling)" : " (measured cut)"} · ${result.grounding.cutBasis}`);
for (const p of result.grounding.passages) console.log(`  [${p.ref}] ${p.text}`);
console.log(`  address checks: ${JSON.stringify(result.addressChecks)} (layout-normalized ledger spans preserve their raw byte addresses)`);

mkdirSync(RESULTS, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const out = join(RESULTS, `document-holograph-${stamp}-${basename(source.name).replace(/\.[^.]+$/, "")}.json`);
writeFileSync(out, JSON.stringify({ ran: new Date().toISOString(), run: dir, source: source.name, recipe: cfg.recipe, reading: readingName, ledger: ledgerPath, ...result }, null, 1));
console.log(`  result → ${out}`);
