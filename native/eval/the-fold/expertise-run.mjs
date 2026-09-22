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
import { learnParadigmEmergent, detectParadigmPlurality } from "../../the-fold/paradigm.js";
import { learnForm } from "../../the-fold/form-prior.js";
import { loadExpertise, saveExpertise, recordExpertise, projectExpertise, knownForms, expertiseHistory, expertiseLines, demonstrateExpertise, sha256 } from "../../the-fold/expertise.js";
import { fetchWikipediaBase } from "../../the-fold/wiki-base.js";

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
  const units = []; const basis = []; const sources = [];
  for (const f of entries) {
    const text = fs.readFileSync(path.join(dir, f), "utf8");
    sources.push({ url: `file:${path.join(dir, f)}`, text, sha256: sha256(text) });
    const seg = segmentCollection(text);
    if (seg.units.length > 1) { units.push(...seg.units.map((u) => ({ ...u, id: `${f}#${u.id}` }))); basis.push(`${f}: ${seg.basis}`); }
    else { const e = elementsOf(text).elements; if (e.length >= 2) { units.push({ id: f, elements: e }); basis.push(`${f}: one instance (no recurring separator)`); } }
  }
  return { units, basis: basis.join("; "), sources };
}

/** A directory of MANY files, each one already-known to be exactly one real
 *  document (one paper per file — a fetch script's own manifest says so),
 *  NEVER re-split by segmentCollection. This is the fix for the live bug
 *  (2026-09-22): a single technical report's own numbered sections got
 *  mistaken for many short items by the SAME heuristic instancesOf() above
 *  still uses — segmentCollection cannot reliably tell "one document's
 *  sequential sections" from "a genuine collection," and for a corpus that
 *  ships its own per-file manifest, there is no need to guess: the manifest
 *  IS the ground truth for instance boundaries. A file whose real sha256
 *  disagrees with the manifest's own recorded hash is flagged, not silently
 *  trusted — the file changed since the manifest was written. */
function instancesOfManifest(manifestPath, root) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const records = manifest.records ?? [];
  const units = []; const basis = []; const sources = [];
  for (const rec of records) {
    const filePath = path.join(root, rec.file);
    if (!fs.existsSync(filePath)) { basis.push(`${rec.file}: MISSING, skipped`); continue; }
    const text = fs.readFileSync(filePath, "utf8");
    const realSha = sha256(text);
    if (rec.sha256 && rec.sha256 !== realSha) basis.push(`${rec.file}: sha256 MISMATCH vs manifest — file changed since the manifest was written`);
    sources.push({ url: `file:${rec.file}`, text, sha256: realSha });
    const e = elementsOf(text).elements;
    if (e.length >= 2) { units.push({ id: rec.file, elements: e }); basis.push(`${rec.file}: one instance (manifest-declared — never internally split)`); }
    else basis.push(`${rec.file}: too few elements, skipped`);
  }
  return { units, basis: `${units.length} manifest-declared instance(s) from ${manifestPath}: ${basis.join("; ")}`, sources };
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
if (arg("demonstrate")) {
  const demoName = arg("demonstrate");
  const model = arg("model", "gemma2:2b");
  const noBase = flag("no-base");
  const ex = loadExpertise();
  const { streamOllamaChat } = await import("../../../proxy-runner.mjs");
  const draw = async (messages, maxTokens) => { let out = ""; for await (const c of streamOllamaChat(model, messages, { maxTokens })) if (typeof c === "string") out += c; return out; };
  let base = null;
  if (!noBase) {
    console.error("hunting a random Wikipedia article to draw from (min 1500 chars)…");
    const b = await fetchWikipediaBase({ minChars: Number(arg("min-chars", 1500)) });
    if (b.refused) console.error(`no base found (${b.refused}) — demonstrating without one`);
    else { base = b; console.error(`base: "${b.title}" (${b.chars} chars, sha256 ${sha256(b.text)})`); }
  }
  const d = await demonstrateExpertise(ex, demoName, { draw, model, base });
  saveExpertise(ex);
  console.log(`\n${model} on "${demoName}"${base ? ` (grounded in "${base.title}")` : ""}: unshaped ${(d.baselineScore.score * 100).toFixed(0)}% (${d.baselineScore.held}/${d.baselineScore.of}) → given the measured shape ${(d.shapedScore.score * 100).toFixed(0)}% (${d.shapedScore.held}/${d.shapedScore.of})${d.delta > 0 ? " — measurably better" : d.delta < 0 ? " — measurably WORSE" : " — no difference"}`);
  console.log(`\n--- unshaped ---\n${d.baseline}\n\n--- shaped ---\n${d.shaped}`);
  console.log(`\nwritten: documents/expertise:1.jsonl (line ${d.line.id}); native/memory/expertise-store.json`);
  console.log(`recheck: scoreAgainstExpertise(projectExpertise(loadExpertise(), "${demoName}"), <the exact "baseline"/"shaped" text on that line>) must reproduce these scores exactly.`);
  process.exit(0);
}

const manifestPath = arg("manifest");
const manifestRoot = arg("root");

if (!name || !popDir || !source || (!corpusDir && !manifestPath) || (manifestPath && !manifestRoot)) {
  console.error('usage: expertise-run.mjs --name NAME --corpus DIR --population DIR --source "id" [--slots ruler|emergent] [--expectation]');
  console.error('       expertise-run.mjs --name NAME --manifest manifest.json --root DIR --population DIR --source "id"  (trusts the manifest\'s own file list — one file, one instance, never internally split)');
  console.error('       expertise-run.mjs --demonstrate NAME [--model gemma2:2b]');
  console.error("       expertise-run.mjs --list");
  console.error("       expertise-run.mjs --show NAME [--history]");
  process.exit(1);
}
const slots = arg("slots", "emergent");
const { units, basis: corpusBasis, sources: corpusSources } = manifestPath ? instancesOfManifest(manifestPath, manifestRoot) : instancesOf(corpusDir);
const { units: pop, basis: popBasis } = instancesOf(popDir);
console.error(`corpus: ${corpusBasis}`);
console.error(`population: ${popBasis}`);
for (const s of corpusSources) console.error(`  sha256 ${s.sha256}  ${s.url}`);

const paradigm = slots === "emergent" ? learnParadigmEmergent({ name, instances: units, population: pop }) : (await import("../../the-fold/paradigm.js")).learnParadigm({ name, instances: units, population: pop });
if (paradigm.refused) {
  console.error(`refused: ${paradigm.refused} — ${paradigm.basis}`);
  process.exit(2);
}
const formPrior = flag("expectation") ? learnForm(units, { slots }) : null;

// Optional, additive: does the engine's OWN reading find that these
// instances — all filed under one name, with no declared stance — cluster
// into more than one real sub-paradigm (kernel/entity-kind-induction.js's
// affinity-basin induction over the same emergentFacts, its own null)? This
// DISCLOSES a real split; it never forks the recording on its own.
const plurality = detectParadigmPlurality(units, { name, population: `expertise:${name}` });
if (plurality.plural) console.error(`plurality: ${plurality.basis}`);
const note = [corpusBasis, plurality.plural ? `plurality check: ${plurality.basis}` : null].filter(Boolean).join("; ");

const ex = loadExpertise();
const before = projectExpertise(ex, name);
const r = recordExpertise(ex, { name, paradigm, formPrior, source, note, sources: corpusSources });
saveExpertise(ex);

const after = projectExpertise(ex, name);
console.log(`\n${before ? `revised (was revision ${before.revision}, ${before.status})` : "first learned"} → revision ${after.revision}, ${r.status}, corroborated by ${r.corroboration}/2${r.confirmed ? " — CONFIRMED" : ""}`);
console.log(expertiseLines(ex, name).join("\n"));
console.log(`\nwritten: documents/expertise:1.jsonl (line ${r.line.id}); native/memory/expertise-store.json`);
console.log(`\nprove it: node ${path.relative(process.cwd(), path.join(HERE, "expertise-run.mjs"))} --demonstrate ${name} [--model ${arg("model", "gemma2:2b")}]`);
