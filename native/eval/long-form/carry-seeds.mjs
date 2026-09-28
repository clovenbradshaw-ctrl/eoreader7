// native/eval/long-form/carry-seeds.mjs — the carried ground over three
// seeds, held to the decision rule pre-registered in ONE-PIPELINE.md
// (9cd9064): an element holds only if its arm beats BOTH the ledger and the
// stale control on the mean of its own measure over the seeds AND its mean
// repetition is no more than 3 points above the ledger's.
//
//   node native/eval/long-form/carry-seeds.mjs <dir:seedLabel> ...
//   e.g. state/long-form/carry1:1 state/long-form/carry2:1 state/long-form/carry3-s2:2 state/long-form/carry3-s3:3
import fs from "node:fs";
import path from "node:path";
import { sentences } from "../../adapters/text/english-parser.js";
import { makeNotes } from "../../kernel/notes.js";
import { outlineOf } from "../../organs/long-form.js";
import { PROSE_MEDIUM } from "../../adapters/build/prose-medium.js";
import { scoreBook, loadCoherence } from "./score.mjs";

await loadCoherence();
const ARMS = ["ledger", "field", "stale", "field-syn", "field-con", "field-rec"];
/** Repetition may exceed the ledger's by this many points — set by hand
 *  2026-09-28 in the pre-registration (ONE-PIPELINE.md). */
const REPEAT_TOLERANCE = 3;
const rows = {}; // arm -> [{seed, ...}]
for (const spec of process.argv.slice(2)) {
  const [dir, seed] = spec.split(":");
  const outline = JSON.parse(fs.readFileSync(path.join(dir, "outline.json"), "utf8"));
  const o = outlineOf(makeNotes().fold(outline.notes), PROSE_MEDIUM);
  const cast = o.cast.map((c) => ({ name: c.name, details: Object.fromEntries(c.props.filter((p) => (outline.castDetails ?? []).includes(p.label)).map((p) => [p.label, p.value])) }));
  const cs = fs.existsSync(path.join(dir, "carry-score.json")) ? JSON.parse(fs.readFileSync(path.join(dir, "carry-score.json"), "utf8")) : [];
  for (const arm of ARMS) {
    const book = path.join(dir, `${arm}.book.md`);
    if (!fs.existsSync(book)) continue;
    const text = fs.readFileSync(book, "utf8");
    const sc = scoreBook(text, cast, { castDetails: outline.castDetails });
    const c = cs.find((x) => x.arm === arm) ?? {};
    const days = text.toLowerCase().split(" ").filter((w) => { let x = w; while (x && !(x.at(-1) >= "a" && x.at(-1) <= "z")) x = x.slice(0, -1); return x === "day"; }).length;
    // one book per (arm, seed): carry2 carries carry1's ledger book as a copy
    if ((rows[arm] ?? []).some((r) => r.seed === Number(seed))) continue;
    (rows[arm] ??= []).push({ seed: Number(seed), repeated: sc.repeatedShare, wrongCallbacks: sc.callbacks.wrong, seams: c.seams ?? null, across: c.particularsAcrossChapters ?? null, strangersPer1k: c.strangersDistinctPer1k ?? null, promptMax: c.promptMax ?? null, days });
  }
}
const mean = (arm, k) => { const xs = (rows[arm] ?? []).map((r) => r[k]).filter((v) => v != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
const seedsOf = (arm) => (rows[arm] ?? []).map((r) => r.seed).sort().join(",");
console.log("arm        seeds   repeated%  wrongCB  seams  across  strangers/1k  promptMax  days");
for (const arm of ARMS) if (rows[arm]) console.log(`${arm.padEnd(10)} ${seedsOf(arm).padEnd(7)} ${String(mean(arm, "repeated")?.toFixed(1)).padStart(9)} ${String(mean(arm, "wrongCallbacks")?.toFixed(1)).padStart(8)} ${String(mean(arm, "seams")?.toFixed(2)).padStart(6)} ${String(mean(arm, "across")?.toFixed(2)).padStart(7)} ${String(mean(arm, "strangersPer1k")?.toFixed(2)).padStart(13)} ${String(mean(arm, "promptMax")?.toFixed(0)).padStart(10)} ${String(mean(arm, "days")?.toFixed(1)).padStart(5)}`);
const L = "ledger", S = "stale";
const rep = (arm) => mean(arm, "repeated") <= mean(L, "repeated") + REPEAT_TOLERANCE;
const verdicts = [
  { element: "CON·Ground (con: seams, fewer)", arm: "field-con", ok: mean("field-con", "seams") < mean(L, "seams") && mean("field-con", "seams") < mean(S, "seams") && rep("field-con") },
  { element: "SYN·Ground (syn: strangers across chapters, more)", arm: "field-syn", ok: mean("field-syn", "across") > mean(L, "across") && mean("field-syn", "across") > mean(S, "across") && rep("field-syn") },
  { element: "REC·Ground (rec: 'day' said, more)", arm: "field-rec", ok: mean("field-rec", "days") > mean(L, "days") && mean("field-rec", "days") > mean(S, "days") && rep("field-rec") },
  { element: "EVA·Ground (field: prompt max within 100 of the ledger)", arm: "field", ok: mean("field", "promptMax") - mean(L, "promptMax") <= 100 && rep("field") },
  { element: "the whole field (seams fewer than both)", arm: "field", ok: mean("field", "seams") < mean(L, "seams") && mean("field", "seams") < mean(S, "seams") && rep("field") },
];
console.log("\nby the pre-registered rule (mean over seeds; repetition within 3 points of the ledger):");
for (const v of verdicts) console.log(`  ${v.ok ? "HELD     " : "not held "} ${v.element}`);
fs.writeFileSync(path.join(process.argv[2].split(":")[0], "..", "carry-seeds.json"), JSON.stringify({ rows, verdicts }, null, 1));
