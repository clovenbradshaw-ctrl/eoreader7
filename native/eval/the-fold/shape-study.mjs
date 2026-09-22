// shape-study.mjs — every form, old and new, through both organs, against two
// grounds (2026-09-22). The user: "go back to our example things to discover
// shape from, as well as net new ones including musical forms, test how well
// we can extract shape." And: "be sure for each hunt it has a proper,
// relative ground to compare against."
//
//   CONTRAST (paradigm.js, DEF·Paradigm): learned on half a form's instances
//     against (a) everything else and (b) its NEIGHBOURS only — the proper
//     relative ground (tunes against tunes, verse against verse, prose
//     against prose); evaluated on the held-out halves.
//   EXPECTATION (form-prior.js): what becomes predictable, when it is
//     learned, and how far the delta to the form falls.
//   BOUNDARIES (form-prior.js kindBoundaries): mixed streams, unsupervised.
//
// Corpora are re-derived, never committed (paradigm-gather.mjs + curl of the
// Gutenberg and Nottingham Music Database files named below). The forms'
// names are the collections' own file names; the organs never see them.
//
//   PARADIGM_CORPUS=<dir> node native/eval/the-fold/shape-study.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { segmentCollection, elementsOf } from "../../the-fold/medium.js";
import { learnParadigm, evaluateParadigm, learnParadigmEmergent, evaluateParadigmEmergent } from "../../the-fold/paradigm.js";
import { learnForm, kindBoundaries } from "../../the-fold/form-prior.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const C = process.env.PARADIGM_CORPUS ?? path.join(HERE, "results/paradigm-2026-09-22/corpus");
const OUT = path.join(HERE, "results/shape-study-2026-09-22");
fs.mkdirSync(OUT, { recursive: true });
const gut = (t) => { const a = t.indexOf("*** START"), b = t.indexOf("*** END"); return t.slice(a >= 0 ? t.indexOf("\n", a) : 0, b >= 0 ? b : t.length); };
const read = (f) => fs.readFileSync(path.join(C, f), "utf8");
const dir = (d) => (fs.existsSync(path.join(C, d)) ? fs.readdirSync(path.join(C, d)).map((f) => ({ id: f, elements: elementsOf(read(path.join(d, f))).elements })).filter((u) => u.elements.length >= 2) : []);
const tunes = (f) => segmentCollection(read(path.join("abc", f))).units.filter((u) => u.elements.filter((e) => e.cls === "bar").length >= 4);
const CAP = Number(process.env.CAP ?? 120);
const cap = (xs) => xs.filter((_, i) => i % Math.max(1, Math.floor(xs.length / CAP)) === 0).slice(0, CAP);

// family: the neighbourhood a form is compared against in the strict arm
const FORMS = {
  "English sonnet": { family: "verse", units: segmentCollection(gut(read("pg1041.txt"))).units },
  "Petrarchan sonnet": { family: "verse", units: segmentCollection(gut(read("pg2002.txt"))).units },
  limerick: { family: "verse", units: segmentCollection(gut(read("pg982.txt"))).units },
  "Dickinson poem": { family: "verse", units: segmentCollection(gut(read("pg12242.txt"))).units.filter((u) => u.elements.length >= 4 && u.elements.length <= 40) },
  "man page": { family: "document", units: dir("man") },
  recipe: { family: "document", units: dir("recipes") },
  obituary: { family: "prose", units: dir("obits") },
  "encyclopedia prose": { family: "prose", units: dir("prose") },
  jig: { family: "tune", units: tunes("jigs.abc") },
  reel: { family: "tune", units: tunes("reels.abc") },
  hornpipe: { family: "tune", units: tunes("hpps.abc") },
  waltz: { family: "tune", units: tunes("waltzes.abc") },
  "morris tune": { family: "tune", units: tunes("morris.abc") },
  "Playford dance": { family: "tune", units: tunes("playford.abc") },
  "slip jig": { family: "tune", units: tunes("slip.abc") },
};
for (const [k, f] of Object.entries(FORMS)) { f.units = cap(f.units); if (f.units.length < 6) { console.log(`(${k}: ${f.units.length} unit(s) — too few, left out)`); delete FORMS[k]; } }
const half = (xs, side) => xs.filter((_, i) => i % 2 === side);
const pct = (a, b) => `${a}/${b}`;

const report = { forms: {}, boundaries: [] };
for (const [name, form] of Object.entries(FORMS)) {
  const t0 = Date.now();
  const row = { family: form.family, instances: form.units.length };
  // arms: the ruler (hand-written families) and the emergent slots, each against
  // everything and against the neighbours only.
  for (const [arm, others, emergent] of [["ruler vs neighbours", Object.entries(FORMS).filter(([k, f]) => k !== name && f.family === form.family), false], ["emergent vs all", Object.entries(FORMS).filter(([k]) => k !== name), true], ["emergent vs neighbours", Object.entries(FORMS).filter(([k, f]) => k !== name && f.family === form.family), true]]) {
    const pop = others.flatMap(([, f]) => f.units);
    const p = (emergent ? learnParadigmEmergent : learnParadigm)({ name, instances: half(form.units, 0), population: half(pop, 0) });
    const ev = (u) => (emergent ? evaluateParadigmEmergent : evaluateParadigm)(p, u).satisfies;
    if (p.refused) { row[arm] = { refused: p.refused, basis: p.basis }; continue; }
    const hin = half(form.units, 1).filter(ev).length;
    const byForm = Object.fromEntries(others.map(([k, f]) => [k, pct(half(f.units, 1).filter(ev).length, half(f.units, 1).length)]));
    const falseIn = others.reduce((a, [, f]) => a + half(f.units, 1).filter(ev).length, 0);
    const outN = others.reduce((a, [, f]) => a + half(f.units, 1).length, 0);
    row[arm] = { features: p.features.length, count: p.count ?? null, scheme: p.scheme ?? null, cells: p.byCell ? Object.fromEntries(Object.entries(p.byCell).map(([c, fs]) => [c, fs.length])) : null, top: p.features.filter((f) => f.type !== "measure").slice(0, 10).map((f) => f.key), heldIn: pct(hin, half(form.units, 1).length), falseIn: pct(falseIn, outN), byForm };
  }
  for (const slots of ["ruler", "emergent"]) {
    const fp = learnForm(form.units, { slots });
    row[`expectation (${slots})`] = fp.refused ? { refused: fp.refused } : { formSlots: fp.form.length, learnedAt: fp.learnedAt, deltaToForm: [+fp.bayes.form.first.toFixed(2), +fp.bayes.form.last.toFixed(2)], deltaToContent: [+fp.bayes.content.first.toFixed(1), +fp.bayes.content.last.toFixed(1)], orderFree: fp.orderFree.slice(0, 8).map((o) => `${o.slot}=${o.value}`), top: fp.form.filter((f) => f.value !== "none" && !/\(absent\)/.test(String(f.value))).slice(0, 10).map((f) => `${f.slot}=${f.value}`), limit: fp.limit };
  }
  report.forms[name] = row;
  console.log(`\n${name} [${form.family}, ${form.units.length}] (${Math.round((Date.now() - t0) / 1000)}s)`);
  for (const arm of ["ruler vs neighbours", "emergent vs all", "emergent vs neighbours"]) {
    const a = row[arm];
    console.log(`  ${arm.padEnd(23)} ${a.refused ? a.refused : `${a.features} features${a.count ? `, ${a.count} parts` : ""}${a.scheme ? `, ${a.scheme}` : ""}${a.cells ? ` [${Object.entries(a.cells).map(([c, n]) => `${c} ${n}`).join(", ")}]` : ""} · held out ${a.heldIn} in, ${a.falseIn} false`}`);
  }
  console.log(`    emergent signs: ${(row["emergent vs neighbours"].top ?? []).join(" · ")}`);
  for (const slots of ["ruler", "emergent"]) {
    const e = row[`expectation (${slots})`];
    console.log(`  expectation (${slots.padEnd(8)}) ${e.refused ? e.refused : `${e.formSlots} predictable, learned at ${e.learnedAt ?? "—"}, delta to form ${e.deltaToForm.join(" → ")}, to content ${e.deltaToContent.join(" → ")}`}`);
    if (!e.refused) console.log(`      form: ${e.top.join(" · ")}`);
  }
}

const S = (k, n) => FORMS[k]?.units.slice(0, n) ?? [];
const streams = [
  ["jig → reel → waltz", [...S("jig", 30), ...S("reel", 30), ...S("waltz", 30)], [30, 60]],
  ["reel → hornpipe", [...S("reel", 40), ...S("hornpipe", 40)], [40]],
  ["jig → morris tune", [...S("jig", 30), ...S("morris tune", 25)], [30]],
  ["limerick → Dickinson poem", [...S("limerick", 30), ...S("Dickinson poem", 30)], [30]],
  ["English → Petrarchan sonnet", [...S("English sonnet", 40), ...S("Petrarchan sonnet", 40)], [40]],
  ["limerick → jig", [...S("limerick", 30), ...S("jig", 30)], [30]],
  ["CONTROL: jigs only", S("jig", 90), []],
  ["CONTROL: reels only", S("reel", 90), []],
  ["CONTROL: Dickinson only", S("Dickinson poem", 90), []],
];
console.log("\nBOUNDARIES (unsupervised, against the kind being read now; window 10)");
for (const [name, s, truth] of streams) {
  if (s.length < 20) continue;
  for (const slots of ["ruler", "emergent"]) {
    const r = kindBoundaries(s, { window: 10, draws: 20, slots });
    const hit = truth.filter((t) => r.boundaries.some((b) => Math.abs(b - t) <= 2)).length;
    const falseB = r.boundaries.filter((b) => !truth.some((t) => Math.abs(b - t) <= 2)).length;
    report.boundaries.push({ name, slots, truth, found: r.boundaries, hit, of: truth.length, false: falseB });
    console.log(`  ${name.padEnd(32)} ${slots.padEnd(8)} found ${JSON.stringify(r.boundaries).padEnd(12)} truth ${JSON.stringify(truth).padEnd(9)} ${truth.length ? `${hit}/${truth.length} found` : "control"}${falseB ? `, ${falseB} false` : ""}`);
  }
}
fs.writeFileSync(path.join(OUT, "shape-study.json"), JSON.stringify(report, null, 2));
console.log(`\nwrote ${path.join(OUT, "shape-study.json")}`);
