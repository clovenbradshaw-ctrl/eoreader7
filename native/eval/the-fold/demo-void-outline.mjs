#!/usr/bin/env node
// demo-void-outline.mjs — the recursive void on the real Chicago record.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "../../adapters/text/recursive.js";
import { diaNorm, namesCorefer } from "../../adapters/text/surfaces.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { reconstruct } from "../../kernel/fold.js";
import { createRecursiveReader } from "../../kernel/reading.js";
import { readingIndexFromLog } from "../../the-fold/reading-log.js";
import { segmentBySurprise } from "../../kernel/surprise-segments.js";
import { outlineFromRecord, updateOutline } from "../../organs/void-outline.js";
import { notesFromEdges } from "../../../proxy-runner.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const wsDir = path.resolve(HERE, "fixtures/chicago");
const pos = JSON.parse(fs.readFileSync(path.resolve(HERE, "../../../cli/priors/pos-prior-en.json"), "utf8"));
const reader = createRecursiveReader({ perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: pos, reprojectEvery: 10 })], adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }), retrieve: () => [] } });

const JUNK = new Set(["coordinates","location","significance","managed","source","authored","published","related","topics","last","updated","visit","information","primary","resources","bureau","gallery","references","overview","notes","search","press","the model indian school","smithsonian institution press","fair that changed america","progress international exposition","the official","mbi publishing","wikipedia","library","archive","published in","authored by","related topics","for more information","last updated","a century","century of progress","sky ride"]);
const allTokens = [];
for (const f of fs.readdirSync(wsDir).sort()) {
  if (!/\.txt$/.test(f)) continue;
  const t = fs.readFileSync(path.join(wsDir, f), "utf8");
  if (t.trim().length <= 40) continue;
  for (const e of textEncounters(t, { source: `workspace:${f}`, offset: 0 })) await reader.step(e);
  allTokens.push(...t.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 2));
}

const log = reader.getLog();
const idx = readingIndexFromLog(log, { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
const ge = reader.getFold()?.graphEntries ?? [];
const props = notesFromEdges(ge);

// being-quality ranking (mention counts via the index's surface rows)
const mentions = new Map();
for (const e of idx.events ?? []) mentions.set(e.referent_id, (mentions.get(e.referent_id) ?? 0) + 1);
const quality = (id, s) => { const n = String(s ?? "").trim(); if (n.length <= 3) return 0; const lc = n.toLowerCase(); if (JUNK.has(lc)) return 0; if (lc === "the chicago world's fair") return 0; let q = n.split(/\s+/).length >= 2 ? 2 : 0; if (/[A-Z]/.test(n)) q += 1; return q * (1 + Math.log2(1 + (mentions.get(id) ?? 0))); };
const referents = [...idx.referents.values()].map((id) => { let s = id; try { s = idx.represent?.(id) ?? id; } catch {} return { id, name: s, mentions: mentions.get(id) ?? 0 }; }).filter(({ id, name }) => quality(id, name) > 0).sort((a, b) => quality(b.id, b.name) - quality(a.id, a.name)).slice(0, 8);

// seams: the record's own surprisal segments
let seams = [];
try { const s = segmentBySurprise(allTokens.slice(0, 15000), { order: 3, alpha: 0.7, draws: 64, seed: 7, minLength: 60 }); seams = Array.isArray(s) ? s : (s?.regions ?? s?.segments ?? []); } catch { seams = []; }

console.log(`record: ${props.length} propositions, ${idx.referents.size} referents, ${seams.length} seams`);
console.log(`top beings: ${referents.map((r) => r.name).join(" | ")}`);

const outline = outlineFromRecord({ topic: "the Chicago World's Fair", referents, propositions: props, seams, voids: [], maxPhases: 7 });
console.log("\n═══ THE RECURSIVE VOID — a trajectory, derived from the record ═══\n");
for (const ph of outline.phases) {
  const tr = ph.transition ? `  ⤷ ${ph.transition.kind.toUpperCase()}: ${ph.transition.basis}` : "  (opens the essay — the thesis is born here)";
  console.log(`[${ph.id}] ${ph.focus}  — ${ph.claims.length} fresh claim(s)`);
  console.log(tr);
}
console.log("\n═══ THE ARC (Vonnegut: cumulative fresh claims per phase) ═══");
for (const a of outline.arc) console.log(`  ${String(a.freshClaims).padStart(3)} +${a.cumulative}  ${a.phase}`);
console.log(`\nreopensOn: ${outline.reopensOn.map((r) => r.when).join(", ")}`);
console.log(`basis: ${outline.basis}`);

// recursion demo: the reading "grew" — new beings arrived
const grew = outlineFromRecord({ topic: "the Chicago World's Fair", referents, propositions: props, seams, voids: [], maxPhases: 7 });
const updated = updateOutline(grew, { referents, propositions: props, seams, coveredKeys: new Set() });
console.log(`\n═══ RECURSION: update() → ${updated.superseded.length} superseded, ${updated.appended.length} appended ═══`);