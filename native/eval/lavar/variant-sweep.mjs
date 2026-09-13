// variant-sweep.mjs — "create lots of variants and see who gets there"
// (2026-09-12), using the project's dependency-order discipline: the reader's
// improvement levers are NOT independent — S100's plan is ordered because
// "doing these in the wrong order produces numbers that cannot be
// interpreted." A lever bought before its dependency looks useless or worse;
// bought after it, it compounds. This sweep runs the reader across a ladder
// of cumulative variants (each adds one lever to the last) plus a WRONG-ORDER
// probe (a lever before its dependency), and scores each against the golden.
//
// LADDER (cumulative, in dependency order):
//   V0 base          no received-verb widening, no reduced-clause reader
//                    (the S105-era reader)
//   V1 +received     received-verb widening (participles/copulas/modals enter
//                    the vocabulary — the S100 item-5 direction)
//   V2 +reduced      the reduced-clause reader (participial tails) — depends
//                    on V1: without the participles IN the vocabulary, the
//                    reduced reader has nothing to anchor on
//   V3 -nounPhrases  nounPhraseSubjects OFF (the S90-adjacent gate direction)
//
// WRONG-ORDER PROBE:
//   W  +reduced only (received widening OFF) — the reduced reader with no
//      participles in the vocabulary. The dependency hypothesis says this
//      buys nothing; if it buys as much as V2, the order didn't matter.
//
// usage: node variant-sweep.mjs [chapter]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CH = Number(process.argv[2] ?? 1);
const BOOK = "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt";
const LEDGER = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${CH}.eot.jsonl`);

const VARIANTS = [
  { name: "V0 base", flags: ["--no-received-verbs", "--no-reduced"] },
  { name: "V1 +received", flags: ["--no-reduced"] },
  { name: "V2 +reduced (all)", flags: [] },
  { name: "V3 -nounPhrases", flags: ["--no-nps"] },
  { name: "W wrong-order (reduced before received)", flags: ["--no-received-verbs"] },
];

function scoreLedger() {
  const g = JSON.parse(fs.readFileSync(path.join(HERE, "goldens", `aiw-ch${CH}.json`), "utf8"));
  const LS = fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const props = LS.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1);
  const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
  const contentTok = (t) => (norm(t).match(/[\p{L}\p{N}’']+/gu) ?? []).filter((w) => !["the","a","an","and","or","of","to","in","with","her","his","its","their","our","my","your","there","she","he","it","they","was","were","had","have","been","being","as","at","by","for","from","on","that","this","these","those"].includes(w));
  // GFP coverage (the minimum bar — figure token + predicate-side token, any grain)
  let covered = 0;
  const sets = props.map((a) => ({ e1: new Set(contentTok(a.end1)), e2: new Set(contentTok(a.end2)) }));
  for (const p of g.propositions) {
    const e1 = new Set(contentTok(p.end1)), pred = new Set([...contentTok(p.label), ...contentTok(p.end2)]);
    if (!e1.size && !pred.size) { covered += 1; continue; }
    if (sets.some(({ e1: A, e2: B }) => (e1.size === 0 || [...e1].some((w) => A.has(w))) && (pred.size === 0 || [...pred].some((w) => B.has(w))))) covered += 1;
  }
  const gfp = covered / g.propositions.length * 100;
  // recall (label+end2, the historical metric)
  let hit = 0;
  for (const p of g.propositions) {
    const lab = norm(p.label), e2 = norm(p.end2);
    if (!lab) continue;
    if (props.some((x) => norm(x.label).includes(lab) && (!e2 || norm(x.end2).slice(0, 20).includes(e2.slice(0, 20)) || e2.includes(norm(x.end2).slice(0, 20))))) hit += 1;
  }
  const recall = hit / g.propositions.length * 100;
  return { gfp: gfp.toFixed(1), recall: recall.toFixed(1), emitted: props.length };
}

console.log(`variant sweep · ch${CH} · dependency-ordered ladder + wrong-order probe`);
console.log(`${"variant".padEnd(42)} ${"GFP%".padStart(6)} ${"recall%".padStart(7)} ${"emitted".padStart(7)}`);
const rows = [];
for (const v of VARIANTS) {
  const run = spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), BOOK, String(CH), ...v.flags], { encoding: "utf8", timeout: 120000 });
  const s = scoreLedger();
  rows.push({ ...v, ...s });
  console.log(`${v.name.padEnd(42)} ${s.gfp.padStart(6)} ${s.recall.padStart(7)} ${String(s.emitted).padStart(7)}`);
}
console.log(`\nread: V0<V1<V2 is the dependency order (each lever AFTER its dependency);`);
console.log(`W (reduced before received) tests the order itself — if W ≈ V2, order didn't matter.`);