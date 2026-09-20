// build-nashville-ledger.mjs — fold the deterministic extractor over all five
// grounds into the append-only PlanLedgerObservation@1 JSONL, byte-anchored and
// page-bridged. No model in the loop: everything below is mechanical.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractPlanRows, planRowPriority } from "../native/organs/plans/extract.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NASH = join(HERE, "nashville");
const GROUND = join(NASH, "ground");
const LEDGER_DIR = join(NASH, "ledger");
const CAP = 3500;

const manifest = JSON.parse(readFileSync(join(NASH, "manifest.json"), "utf8"));

function pageFor(pagemap, byteStart) {
  for (const pg of pagemap) if (byteStart >= pg.byteStart && byteStart < pg.byteEnd) return pg.page;
  return pagemap.length;
}

const all = [];
const perDoc = {};
for (const doc of manifest.docs) {
  const text = readFileSync(join(GROUND, `${doc.id}.txt`), "utf8");
  const pagemap = JSON.parse(readFileSync(join(GROUND, `${doc.id}.txt.pagemap.json`), "utf8"));
  let rows = extractPlanRows({ text, doc: doc.id, mode: doc.extraction ?? "layout" });
  rows = rows
    .map((r) => ({ ...r, page: pageFor(pagemap, r.at[0]) }))
    .filter((r, idx, arr) => arr.findIndex((x) => x.verbatim === r.verbatim) === idx) // dedupe boilerplate
    .sort((a, b) => planRowPriority(a) - planRowPriority(b) || a.at[0] - b.at[0])
    .slice(0, CAP);
  perDoc[doc.id] = {
    rows: rows.length,
    goals: rows.filter((r) => r.kind === "goal").length,
    numbers: rows.filter((r) => r.kind === "number").length,
    names: rows.filter((r) => r.kind === "name").length,
    places: rows.filter((r) => r.kind === "place").length,
  };
  all.push(...rows);
}

all.sort((a, b) => a.doc.localeCompare(b.doc) || a.at[0] - b.at[0]);
mkdirSync(LEDGER_DIR, { recursive: true });
writeFileSync(join(LEDGER_DIR, "plans-nashville.jsonl"), all.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(LEDGER_DIR, "summary.json"), JSON.stringify({ total: all.length, perDoc }, null, 2));
console.log(JSON.stringify({ total: all.length, perDoc }, null, 2));