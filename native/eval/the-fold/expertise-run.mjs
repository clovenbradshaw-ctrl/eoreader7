#!/usr/bin/env node
// expertise-run.mjs — POLANYI'S OWN DRIVER: task the archon to go learn a
// form and record what it finds (2026-09-22), the same shape
// eval/lang-competency-run.mjs and eval/lavar/chapter-swarm.mjs already run
// for coding and Greek — a held-out pass, scored, appended to a ledger, the
// ledger the reusable competency.
//
//   node native/eval/the-fold/expertise-run.mjs --name limerick \
//        --corpus /path/to/instances --population /path/to/neighbours \
//        --source "gutenberg:pg982"
//
//   node native/eval/the-fold/expertise-run.mjs --list
//   node native/eval/the-fold/expertise-run.mjs --show limerick
//
// One pass: read every file under --corpus as one instance (segmented, if
// the directory holds one file that is a whole collection — a book of
// poems, a tune book), read --population the same way as the relative
// ground (paradigm.js: "be sure each hunt has a proper, relative ground"),
// learn the paradigm and the expectation, and RECORD it — provisional on
// the first source, corroborated and confirmed once a second source teaches
// the same form (kernel/kind-universe.js's own floor, the-fold/expertise.js).
// A pass whose instances are too few, or with no population to compare
// against, is refused rather than recorded (paradigm.js's own refusal,
// disclosed here, never silently skipped).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { elementsOf, segmentCollection } from "../../the-fold/medium.js";
import { learnParadigmEmergent } from "../../the-fold/paradigm.js";
import { learnForm } from "../../the-fold/form-prior.js";
import { loadExpertise, saveExpertise, recordExpertise, projectExpertise, knownForms, expertiseHistory, expertiseLines } from "../../the-fold/expertise.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (n, d = null) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const flag = (n) => process.argv.includes(`--${n}`);

/** A directory as instances: EVERY file is checked on its own for a
 *  recurring separator (segmentCollection) — a book of poems or a tune book
 *  segments into its many units; a file with none is one unit itself. Never
 *  assumed from the directory's file count alone (measured: a population
 *  directory of two whole books of sonnets, read as "2 files, each one
 *  instance," gave two giant units instead of ~150 sonnets each). */
function instancesOf(dir) {
  const entries = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());
  const units = []; const basis = [];
  for (const f of entries) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    const seg = segmentCollection(text);
    if (seg.units.length > 1) { units.push(...seg.units.map((u) => ({ ...u, id: `${f}#${u.id}` }))); basis.push(`${f}: ${seg.basis}`); }
    else { const e = elementsOf(text).elements; if (e.length >= 2) { units.push({ id: f, elements: e }); basis.push(`${f}: one instance (no recurring separator)`); } }
  }
  return { units, basis: basis.join("; ") };
}

if (flag("list")) {
  const ex = loadExpertise();
  const forms = knownForms(ex);
  console.log(forms.length ? forms.map((n) => { const c = projectExpertise(ex, n); return `${n.padEnd(20)} ${c.status.padEnd(11)} revision ${c.revision}, corroborated by ${c.corroboration}`; }).join("\n") : "(nothing learned yet)");
  process.exit(0);
}
if (arg("show")) {
  const ex = loadExpertise();
  const name = arg("show");
  console.log(expertiseLines(ex, name).join("\n"));
  if (flag("history")) { console.log("\nhistory:"); for (const h of expertiseHistory(ex, name)) console.log(`  revision ${h.revision}${h.superseded ? " (superseded)" : " (current)"}${h.falsified ? " [falsified]" : ""}`); }
  process.exit(0);
}

const name = arg("name");
const corpusDir = arg("corpus");
const popDir = arg("population");
const source = arg("source");
if (!name || !corpusDir || !popDir || !source) {
  console.error('usage: expertise-run.mjs --name NAME --corpus DIR --population DIR --source "id" [--slots ruler|emergent] [--expectation]');
  console.error("       expertise-run.mjs --list");
  console.error("       expertise-run.mjs --show NAME [--history]");
  process.exit(1);
}
const slots = arg("slots", "emergent");
const { units, basis: corpusBasis } = instancesOf(corpusDir);
const { units: pop, basis: popBasis } = instancesOf(popDir);
console.error(`corpus: ${corpusBasis}`);
console.error(`population: ${popBasis}`);

const paradigm = slots === "emergent" ? learnParadigmEmergent({ name, instances: units, population: pop }) : (await import("../../the-fold/paradigm.js")).learnParadigm({ name, instances: units, population: pop });
if (paradigm.refused) {
  console.error(`refused: ${paradigm.refused} — ${paradigm.basis}`);
  process.exit(2);
}
const formPrior = flag("expectation") ? learnForm(units, { slots }) : null;

const ex = loadExpertise();
const before = projectExpertise(ex, name);
const r = recordExpertise(ex, { name, paradigm, formPrior, source, note: corpusBasis });
saveExpertise(ex);

const after = projectExpertise(ex, name);
console.log(`\n${before ? `revised (was revision ${before.revision}, ${before.status})` : "first learned"} → revision ${after.revision}, ${r.status}, corroborated by ${r.corroboration}/2${r.confirmed ? " — CONFIRMED" : ""}`);
console.log(expertiseLines(ex, name).join("\n"));
console.log(`\nwritten: documents/expertise:1.jsonl (line ${r.line.id}); native/memory/expertise-store.json`);
