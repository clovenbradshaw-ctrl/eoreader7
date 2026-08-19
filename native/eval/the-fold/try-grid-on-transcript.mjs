// eval/try-grid-on-transcript.mjs — does grid.js's REAL refusal grammar add
// anything to the degeneracy signal, tried offline against a transcript
// already on disk, no new model calls.
//
// Constraint (user, 2026-08-19): the model may not categorize its own turn
// or write structured output. So this never asks the model anything — it
// takes hypergraph.js's edges, which the harness ALREADY extracts
// mechanically from the model's free prose, and lands each one as a grid.js
// act using ONE FIXED mapping: every SVO edge is, by construction, a
// `relate <subject> to <object> at Link from cultivation` — not a judgment
// call about which of nine cells a sentence "really is" (the classifier
// move CUBE.md already measured and refused), just naming what an SVO
// triple structurally already is. `warrant:<speaker>` marks every edge
// honestly as OFFERED (the speaker's own claim), not independently
// established — so the referent-establishment check is not the thing under
// test here; what IS under test is whether landing these on grid.js's REAL
// append-only log and reading its own fold/progression back says anything
// my ad hoc edge-novelty gate does not.

import { readFileSync } from "node:fs";
import { makeRelationReader } from "../hypergraph.js";
import { makeReferentIndex, activeWindow } from "../dialogue-graph.js";
import { makeGrid } from "../grid.js";

import { splitSentences as engineSentences } from "../../eoreader6.1/packages/engine/perceiver/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../../eoreader6.1/packages/engine/perceiver/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../../eoreader6.1/packages/engine/perceiver/text/relations.js";
import { tokenize as engineTokenize } from "../../eoreader6.1/packages/engine/perceiver/text/material.js";
import * as operators from "../../eoreader6.1/packages/engine/operators.js";
import * as taskLog from "../../eoreader6.1/packages/engine/holon/task-log.js";

const organs = { splitSentences: engineSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize: engineTokenize };
const readerFor = makeRelationReader(organs);
const grid = makeGrid({ operators, taskLog });

const GRAPH_WINDOW = 2;

function sentencePool(text) {
  if (!text.trim()) return [];
  let sentences;
  try { sentences = engineSentences(text); } catch { return []; }
  return sentences.map((s) => (typeof s === "string" ? s : s?.text ?? "")).filter((s) => s.trim()).map((s) => ({ text: s, terms: new Set(engineTokenize(s)) }));
}

const path = process.argv[2] ?? "eval/results/adversarial-dialogue-hiroshima-gemma2b-v3-edgegate.jsonl";
const lines = readFileSync(path, "utf8").trim().split("\n").map(JSON.parse);
const turns = lines.filter((l) => l.kind === "seed" || l.kind === "reply");

const speakers = {};
function speaker(name) {
  if (!speakers[name]) speakers[name] = { name, utterances: [], transcriptSoFar: "", log: grid.createLog(), landedEdgeKeys: new Set() };
  return speakers[name];
}

console.log(`replaying ${turns.length} turns from ${path}\n`);

for (const t of turns) {
  const sp = speaker(t.speaker);
  sp.utterances.push({ turn: t.turn, text: t.text });
  sp.transcriptSoFar += (sp.transcriptSoFar ? "\n\n" : "") + t.text;

  const active = activeWindow(sp.utterances, GRAPH_WINDOW);
  const passages = active.map((u, i) => ({ ref: `${sp.name}#${u.turn}`, text: u.text }));
  const reader = readerFor(passages, { pool: sentencePool(sp.transcriptSoFar) });

  let landed = 0, refused = 0;
  const refusals = [];
  for (const e of reader.edges) {
    const key = `${e.subject.toLowerCase()}|${e.verb.toLowerCase()}|${e.polarity}|${e.object.toLowerCase()}`;
    if (sp.landedEdgeKeys.has(key)) continue; // already landed earlier — don't re-land the same claim every window
    sp.landedEdgeKeys.add(key);
    const subj = e.subject.replace(/"/g, "'");
    const obj = e.object.replace(/"/g, "'");
    const line = `relate "${subj}" to "${obj}" at Link from cultivation warrant:${sp.name}`;
    const result = grid.parseAct(line, { log: sp.log });
    if (result.ok) {
      const { log } = grid.land(sp.log, result.event);
      sp.log = log;
      landed++;
    } else {
      refused++;
      refusals.push({ edge: `${e.subject} —${e.verb}→ ${e.object}`, refusal: result.refusal });
    }
  }
  console.log(
    `turn ${t.turn} (${t.speaker}): hypergraph edges ${reader.edges.length}, new-to-log ${landed + refused}, landed ${landed}, REFUSED ${refused}` +
      (refusals.length ? `\n  ${refusals.map((r) => `${r.edge} — ${r.refusal.type}: ${r.refusal.detail}`).join("\n  ")}` : ""),
  );
}

console.log("\n— grid fold, per speaker —");
for (const sp of Object.values(speakers)) {
  const fold = grid.foldGrid(sp.log);
  console.log(`${sp.name}: ${fold.acts.length} acts on the log, progression flags: ${JSON.stringify(fold.progression)}`);
}
