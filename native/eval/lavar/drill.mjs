// drill.mjs — drilling down on one referent: the whole-book neighbourhood
// an address expands into, per THE-HOLOGRAPH.md ("an address expands to
// the bytes, the claims around them, the referent's whole neighbourhood")
// and S97 ("drilling down... is the opposite operation of ascending").
//
// Note on search-first (CLAUDE.md's own rule): kernel/hypergraph.js +
// kernel/interrogation.js already carry a real neighbourhood-expansion
// organ (buildHypergraph/relevantHypergraphNeighborhood), used by
// kernel/reading.js's assembled reader. It was checked before writing this
// file and set aside for a stated reason, not missed: it walks the OLDER
// Observation@1/EOHyperedge@1/EOMention@1 schema family (referencesOf's own
// switch statement), and this session's EOTObservation@1 ledger (S95) is a
// different, newer schema the organ has no case for — feeding it this
// ledger directly would silently return an empty neighbourhood every time
// (a harness-reading, not a material-reading, exactly P88's own trap).
// Adapting the EOT ledger into EOHyperedge@1 shape so the real organ can
// walk it is real, scoped, unattempted future work. This script instead
// does the same THING the organ does — expand a referent id into everything
// that touches it — directly against the schema this session actually
// produces, across every chapter's ledger at once (the organ itself only
// ever sees one fold).
//
// usage: node drill.mjs <referent-substring>   e.g. "alice", "rabbit", "dinah"
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const target = String(process.argv[2] ?? "").toLowerCase();
if (!target) { console.error("usage: node drill.mjs <referent-substring>"); process.exit(1); }

const chapters = [];
for (let ch = 1; ch <= 12; ch += 1) {
  const p = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${ch}.eot.jsonl`);
  if (!fs.existsSync(p)) continue;
  chapters.push({ ch, lines: fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) });
}

// Resolve which referent id(s) this substring names — a being can earn a
// slightly different auto-id per chapter's own coreference run (each
// chapter's cast is discovered fresh; S95's own per-document boundary), so
// the drill matches by SURFACE, not by assuming one id spans the book.
const ids = new Set();
const surfacesById = new Map();
for (const { lines } of chapters) {
  for (const l of lines) {
    if (l.role !== "entity") continue;
    const hit = (l.surfaces ?? []).some((s) => s.toLowerCase().includes(target));
    if (hit) { ids.add(l.referent); surfacesById.set(l.referent, l.surfaces); }
  }
}
if (!ids.size) { console.log(`no referent matching "${target}" found in any chapter's cast`); process.exit(0); }

console.log(`referent ids matching "${target}": ${[...ids].join(", ")}`);
console.log(`(a being's id is discovered fresh per chapter — S95's per-document boundary — so the SAME character can carry a different id across chapters; this drill unions by surface)\n`);

let totalTouches = 0;
const labelCounts = new Map();
const partnerCounts = new Map();
const voidNearMisses = [];
for (const { ch, lines } of chapters) {
  const chIds = new Set([...ids].filter((id) => lines.some((l) => l.role === "entity" && l.referent === id)));
  if (!chIds.size) continue;
  let chTouches = 0;
  for (const l of lines) {
    if (l.role !== "proposition") continue;
    const asEnd1 = l.end1Ref && chIds.has(l.end1Ref);
    const asEnd2 = l.end2Ref && chIds.has(l.end2Ref);
    if (!asEnd1 && !asEnd2) continue;
    chTouches += 1; totalTouches += 1;
    labelCounts.set(l.label, (labelCounts.get(l.label) ?? 0) + 1);
    const partnerRef = asEnd1 ? l.end2Ref : l.end1Ref;
    if (partnerRef && !chIds.has(partnerRef)) partnerCounts.set(partnerRef, (partnerCounts.get(partnerRef) ?? 0) + 1);
  }
  if (chTouches) console.log(`  ch${ch}: ${chTouches} arrangements touch this being`);
}

console.log(`\ntotal arrangements touching "${target}" across the book: ${totalTouches}`);
console.log(`distinct relation labels: ${labelCounts.size}`);
const topLabels = [...labelCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
console.log(`most frequent: ${topLabels.map(([l, n]) => `${l}(${n})`).join(", ")}`);
console.log(`distinct partner referents (other beings this one is arranged with): ${partnerCounts.size}`);
const topPartners = [...partnerCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
console.log(`most frequent partners (by id): ${topPartners.map(([id, n]) => `${id}(${n})`).join(", ")}`);
