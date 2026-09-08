// holograph-compression.mjs — the compression ladder measured with NO model:
// for every question a real conversation asked, what the activation hands at
// level 1 (the sentences carry the acts) against level 3 (the Lens carries
// the acts and the sentences ground its shown ones), over the persisted
// constitutional reading and the ledger a conversation run left on disk
// (THE-HOLOGRAPH §6/§7; the-fold resolutions.js::dmdCut/lensCut,
// activation-retrieval.js::activate).
//
//   node eval/the-fold/holograph-compression.mjs [--run <results/conversation/<dir>>]
//
// Refuses (S65) when the reading, the ledger or the run's turns.jsonl are
// absent in this checkout — they are run outputs, reproduced by
// conversation.mjs, never fixtures. Every figure is printed with what it is
// a measurement of; the results doc transcribes this output.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const NATIVE = join(HERE, "..", "..");
const FOLD = join(NATIVE, "..", "..", "the-fold");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const runsRoot = join(HERE, "results", "conversation");
const runDir = arg("run", null) ?? (existsSync(runsRoot) ? readdirSync(runsRoot).filter((d) => existsSync(join(runsRoot, d, "turns.jsonl")) && existsSync(join(runsRoot, d, "config.json"))).sort().at(-1) : null);
if (!runDir) { console.error("refused: fixture_absent — no conversation run with turns.jsonl under results/conversation/ (run conversation.mjs first)"); process.exit(2); }
const dir = runDir.startsWith("/") ? runDir : join(runsRoot, runDir);
const cfg = JSON.parse(readFileSync(join(dir, "config.json"), "utf8"));
const readingPath = join(HERE, "results", "readings", `${cfg.corpusId}-${String(cfg.readingAssembly ?? "causalTextPerceiver+reviseTextFold@refresh25").replace(/[^\w.-]+/g, "_")}.jsonl`);
const ledgerPath = join(HERE, "results", "ledgers", `${cfg.corpusId}-${cfg.recipe}.jsonl`);
for (const [what, p] of [["reading", readingPath], ["ledger", ledgerPath]]) if (!existsSync(p)) { console.error(`refused: fixture_absent — the ${what} this run stood on is not in this checkout: ${p}`); process.exit(2); }
const { organs: productOrgans } = await import(join(HERE, "lib", "product-assay.mjs")); const O = await productOrgans();
const TL = await import(join(NATIVE, "kernel", "task-log.js")); const { replayRecord } = await import(join(FOLD, "record-log.js"));
const ledger = replayRecord(readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean), { createTaskLog: TL.createTaskLog, append: TL.append }).log;
const notes = O.hl.foldWithStanding(ledger);
const { readingIndexFromLog, mentionBookFromLog, foldReading } = await import(join(FOLD, "reading-log.js"));
const { reconstruct } = await import(join(NATIVE, "kernel", "fold.js")); const { diaNorm, namesCorefer } = await import(join(NATIVE, "adapters", "text", "surfaces.js")); const { surfaceIndex, surfacesIn } = await import(join(NATIVE, "adapters", "text", "recursive.js"));
const { dmdWindow } = await import(join(NATIVE, "kernel", "activation.js")); const { activate } = await import(join(FOLD, "activation-retrieval.js")); const { lensBlock, activeReferents } = await import(join(FOLD, "resolutions.js"));
const entries = readFileSync(readingPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const organs = { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn };
const fr = foldReading(entries, organs); const index = readingIndexFromLog(entries, organs), book = mentionBookFromLog(entries, organs);
console.log(`holograph compression — run ${dir.split("/").at(-1)} · corpus ${cfg.corpusId} · recipe ${cfg.recipe} · reading ${cfg.readingAssembly ?? "constitutional"} · notes ${notes.length} · log entries ${entries.length}`);
console.log(`  identity: ${JSON.stringify(fr.identity)} — beings after the reader's own merges (record) and coreference (containment, one host only); ambiguous forms kept apart`);
console.log(`  beings ${index.referents.size} · addressed sentences ${book.sentences.length}`);
const qs = readFileSync(join(dir, "turns.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((r) => r.question);
const stat = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? { med: s[Math.floor(s.length / 2)], max: s.at(-1), mean: Math.round(s.reduce((p, c) => p + c, 0) / s.length) } : null };
const rows = [];
for (const q of qs) {
  const b = activate({ question: q, transcript: [], index, book, notes, dmdWindow, resolutions: 1 });
  const a = activate({ question: q, transcript: [], index, book, notes, dmdWindow, resolutions: 3 });
  if (b.basis !== "activation") { rows.push({ q, basis: b.basis }); continue; }
  const act = activeReferents(q, [], index); const lens = lensBlock({ question: q, active: act.ids, index, notes, dmdWindow });
  rows.push({ q, basis: "activation", active: a.active.map((id) => index.represent(id)), level1: { window: b.window, chars: b.passages.reduce((s, p) => s + p.text.length, 0) }, level3: { window: a.window, chars: a.passages.reduce((s, p) => s + p.text.length, 0), lensChars: lens.text.length, lensWindow: lens.windows?.notes ?? 0, lensCeiling: !!lens.cuts?.notes?.ceiling, lensOf: lens.cuts?.notes?.of ?? null, grounded: a.lens?.grounded ?? 0, groundingOf: a.lens?.groundingOf ?? 0, shownActs: a.lens?.acts ?? 0 } });
}
const act = rows.filter((r) => r.basis === "activation");
for (const r of act) console.log(`  ${JSON.stringify(r.q.slice(0, 44))} active ${JSON.stringify(r.active)} · level 1: ${r.level1.window} sentences/${r.level1.chars} chars · level 3: Lens ${r.level3.lensWindow} notes/${r.level3.lensChars} chars${r.level3.lensCeiling ? ` (ceiling of ${r.level3.lensOf})` : ""} + ${r.level3.window} sentences/${r.level3.chars} chars grounding ${r.level3.grounded}/${r.level3.groundingOf}`);
console.log(`  questions activating: ${act.length} of ${qs.length} (the rest resolve to no referent — term retrieval stands in, disclosed)`);
console.log(`  level 1 sentences (chars): ${JSON.stringify(stat(act.map((r) => r.level1.chars)))} · level 3 sentences: ${JSON.stringify(stat(act.map((r) => r.level3.chars)))} · Lens: ${JSON.stringify(stat(act.map((r) => r.level3.lensChars)))} · Lens at ceiling ${act.filter((r) => r.level3.lensCeiling).length} of ${act.length}`);
console.log(`  handed at level 3 (Lens + sentences): ${JSON.stringify(stat(act.map((r) => r.level3.chars + r.level3.lensChars)))} vs level 1 sentences alone: ${JSON.stringify(stat(act.map((r) => r.level1.chars)))} · grounded share: ${JSON.stringify(stat(act.map((r) => Math.round(100 * r.level3.grounded / Math.max(1, r.level3.groundingOf)))))}%`);
