#!/usr/bin/env node
// sidecar-judge.mjs — THE GOLDEN, mechanical, no model.
// usage: node native/eval/the-fold/sidecar-judge.mjs <jobId> <workspaceDir>
//
// Grades an essay from its OWN sidecars against the record:
//   · the essay's ledger (`<jobId>:1.jsonl`) — the parts;
//   · the citations sidecar (`<jobId>:1.citations.json`) — grounding;
//   · the record — the workspace, RE-READ through the constitutional reader
//     (the fold's notes are the golden the essay is scored against).
// The judge is a sidecar-to-sidecar comparison: essay ledger vs record fold.
// No model writes or reads this verdict.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "../../adapters/text/recursive.js";
import { diaNorm, namesCorefer } from "../../adapters/text/surfaces.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { reconstruct } from "../../kernel/fold.js";
import { createRecursiveReader } from "../../kernel/reading.js";
import { readingIndexFromLog } from "../../the-fold/reading-log.js";
import { lavarGradeEssay, citationLedger } from "../../the-fold/document-ledger.js";
import { notesFromEdges } from "../../../proxy-runner.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [jobId, wsDir] = process.argv.slice(2);
if (!jobId || !wsDir) { console.error("usage: sidecar-judge.mjs <jobId> <workspaceDir>"); process.exit(1); }

const docsDir = path.join(HERE, "../../../documents");
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };

// ── 1. THE RECORD — re-read the workspace through the real reader ────────
const pos = JSON.parse(fs.readFileSync(path.join(HERE, "../../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json"), "utf8"));
const reader = createRecursiveReader({ perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: pos, reprojectEvery: 10 })], adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }), retrieve: () => [] } });
const recordTexts = [];
for (const f of fs.readdirSync(wsDir).sort()) {
  if (!/\.(txt|md)$/.test(f)) continue;
  const t = fs.readFileSync(path.join(wsDir, f), "utf8");
  if (t.trim().length > 40) { recordTexts.push(t); for (const e of textEncounters(t, { source: `workspace:${f}`, offset: 0 })) await reader.step(e); }
}
const log = reader.getLog();
const index = readingIndexFromLog(log, { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
const rawEntries = reader.getFold?.()?.graphEntries ?? [];
const props = notesFromEdges(rawEntries);
console.log(`RECORD: ${recordTexts.length} source(s), ${log.length} log entries, ${index.referents.size} referents, ${props.length} propositions`);

// ── 2. THE ESSAY SIDECARS ─────────────────────────────────────────────────
const ledger = (read(path.join(docsDir, `${jobId}:1.jsonl`)) ?? "").split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const parts = ledger.filter((l) => l.role === "part").map((l) => l.text ?? "");
const citations = read(path.join(docsDir, `${jobId}:1.citations.json`));
const cites = citations ? JSON.parse(citations) : { citations: [] };
const record = new Map();
for (const f of fs.readdirSync(wsDir).sort()) if (/\.(txt|md)$/.test(f)) record.set(`workspace:${f}`, fs.readFileSync(path.join(wsDir, f), "utf8"));
const ground = citationLedger(parts.join("\n\n"), record, { givers: [] });

// ── 3. THE HONEST VERDICT ─────────────────────────────────────────────────
const grade = lavarGradeEssay(parts, parts.map((_, i) => `section ${i + 1}`), { materialPropositions: props, index });
const groundedN = ground.citations.filter((c) => c.kind !== "unsupported").length;
const unsupportedN = ground.citations.filter((c) => c.kind === "unsupported").length;
const totalSentences = ground.citations.length;
console.log(`ESSAY: ${parts.length} parts, ${parts.join(" ").split(/\s+/).filter(Boolean).length} words`);
console.log(`\n═══ HONEST VERDICT (sidecar-to-sidecar, no model) ═══`);
console.log(`CARRIED:   ${grade.covered} of ${grade.ofPropositions} record propositions re-stated (${(grade.recall * 100).toFixed(1)}% recall)`);
console.log(`GROUNDED:  ${groundedN}/${totalSentences} sentences byte-backed by a source; ${unsupportedN} disclosed as the essay's own claim`);
console.log(`RESOLVED:  sections fold to record referents: ${grade.failures.length ? grade.failures.length + " unresolved" : "all resolve"}`);
console.log(`VERDICT:   ${grade.ok ? "SATISFIED" : "UNSATISFIED"} — ${grade.basis}`);
if (grade.failures?.length) console.log(`  first failures: ${grade.failures.slice(0, 3).map((f) => f.detail?.slice(0, 90)).join(" | ")}`);