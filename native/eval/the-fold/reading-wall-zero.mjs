// reading-wall-zero.mjs — ZERO model calls. What did the witness actually
// have in front of it on the eleven notes where the labeled stating
// sentence was among the eight? Dumps, per labeled-stated note: the claim
// string as the select protocol shows it (R.claimOfNote — the extraction's
// own fragment), the article sentence the note was cut from, the eight
// containment candidates with the labeled sentence's POSITION, and the arm
// claim competingFiller would build. Read before any budget is declared.
import { readFileSync } from "node:fs";
process.env.SLICERS ??= "containment"; process.env.N ??= "400";
const { poolOf, candidatesFor, endsOf, targets, R } = await import("./ranke-slicers.mjs");
const { competingFiller } = await import("../../organs/corroboration.js");
const T = await import("../../organs/testimony.js");
const L = JSON.parse(readFileSync(new URL("./results/slicer-labels.json", import.meta.url), "utf8")).labels;
const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const rows = [];
for (const [id, l] of Object.entries(L)) {
  if (!l.status.startsWith("stated")) continue;
  const row = targets.find((r) => r.id === id);
  if (!row) { console.log(`# ${id}: NOT IN TARGETS (walk changed)`); continue; }
  const ends = endsOf(row); const face = poolOf(row.facePath);
  const cands = await candidatesFor("containment", face, ends, R.claimOfNote(ends).sentence);
  const shown = cands.map((c) => c.shown);
  const want = (l.sentenceText ?? []).map(norm);
  const pos = shown.map((s, i) => (want.includes(norm(s)) ? i + 1 : null)).filter(Boolean);
  const filler = competingFiller(ends.end2, shown, { exclude: [ends.end1] });
  const armClaim = filler ? R.claimOfNote(ends).sentence.replace(new RegExp(ends.end2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), filler) : null;
  const pronoun = /^(they|he|she|it|we|this|that|these|those|of|the (crew|astronauts|two|three))\b/i.test(ends.end1);
  rows.push({ id, status: l.status, pos: pos[0] ?? null, claim: R.claimOfNote(ends).sentence, article: norm(row.article ?? ""), armClaim, filler, pronounSubject: pronoun, eight: shown, labeled: want });
  console.log(`\n# ${l.positionInRun4} · ${l.status} · labeled sentence at position ${pos.length ? pos.join(",") : "NONE"} of ${shown.length}`);
  console.log(`  CLAIM SHOWN : ${R.claimOfNote(ends).sentence}`);
  console.log(`  ARTICLE     : ${norm(row.article ?? "")}`);
  console.log(`  ARM CLAIM   : ${armClaim ?? "(unarmed: no filler)"}`);
  shown.forEach((s, i) => console.log(`  ${want.includes(norm(s)) ? "*" : " "} ${i + 1}. ${s.slice(0, 160)}`));
}
console.log(`\n${rows.length} labeled-stated notes; label in the eight: ${rows.filter((r) => r.pos).length}; pronoun/fragment subjects: ${rows.filter((r) => r.pronounSubject).length}; positions: ${JSON.stringify(rows.map((r) => r.pos))}`);
import { writeFileSync } from "node:fs";
writeFileSync(new URL("./results/reading-wall-zero.json", import.meta.url), JSON.stringify(rows, null, 2));
