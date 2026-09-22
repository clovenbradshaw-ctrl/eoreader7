// transcript-reading-falsify.test.mjs — the reader is handed a conversation
// without its role marks, and nothing moves (2026-09-22). The decisive case
// runs the proxy's own reader: with the marks, "user", "assistant" and the
// questions' opening words became beings; blanked, only what was said twice.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readableTranscript } from "./transcript-reading.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");

test("the marks are blanked to their own length: every byte after them keeps its position", () => {
  const t = "[System Context]: about a river\n\n[user]: Tell me about the Cumberland River.\n\n[assistant]: The Cumberland River runs 688 miles.";
  const r = readableTranscript(t);
  assert.equal(r.length, t.length);
  assert.ok(!/\[(user|assistant|System Context)\]:/.test(r));
  for (const w of ["Tell me about", "The Cumberland River runs", "about a river"]) assert.equal(r.indexOf(w), t.indexOf(w), `"${w}" moved`);
  assert.equal(readableTranscript("a note [user]: mid-line stays"), "a note [user]: mid-line stays", "only a mark that opens a line is a mark");
  assert.equal(readableTranscript("[1] a citation stays"), "[1] a citation stays");
});

const POS = path.join(ROOT, "legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json");
test("THE PROXY'S OWN READER: with the marks, the transcript's scaffolding becomes beings; blanked, it does not", { skip: !fs.existsSync(POS) && "POS prior not present in this checkout" }, async () => {
  const { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } = await import("../adapters/text/recursive.js");
  const { diaNorm, namesCorefer } = await import("../adapters/text/surfaces.js");
  const { reviseTextFold } = await import("../adapters/text/revision.js");
  const { createRecursiveReader } = await import("../kernel/reading.js");
  const { reconstruct } = await import("../kernel/fold.js");
  const { readingIndexFromLog } = await import("./reading-log.js");
  const prior = JSON.parse(fs.readFileSync(POS, "utf8"));
  const posPrior = prior.provenance?.source ? prior : { ...prior, provenance: { source: prior.giver?.resource } };
  let roleConfig = null; try { roleConfig = JSON.parse(fs.readFileSync(path.join(ROOT, "native/priors/role-config-eng.json"), "utf8")); } catch {}
  const readWith = async (blank) => {
    const reader = createRecursiveReader({
      perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior, descriptorAnchoring: { born: true, bornActivationFloor: 0.5, bornMarginFloor: 0.3, minWindow: 4 }, reprojectEvery: 10, language: "eng", roleConfig })],
      adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }), retrieve: (_f, ev) => Object.freeze({ schema: "EORelevantFold@1", witnessed: [...ev], provisional: [], expectations: [], obligations: [], exclusions: [], unresolvedAlternatives: [], activeFrames: [], receivedPriors: [] }) },
    });
    const turns = [["Tell me about the Cumberland River.", "The Cumberland River runs 688 miles through Kentucky and Tennessee."], ["Why did Nashville grow there?", "Nashville grew on the bluff above the river because the Cumberland was the only road."], ["What about the floods?", "The flood of 1927 covered the low city of Nashville."], ["Tell me more.", "What the floods did, the dams on the Cumberland River undid."]];
    let prev = "";
    const lines = [];
    for (const [q, a] of turns) {
      lines.push(`[user]: ${q}`, `[assistant]: ${a}`);
      const text = lines.join("\n\n");
      const shown = blank ? readableTranscript(text) : text;
      for (const enc of textEncounters(shown.slice(prev.length), { source: "probe", offset: prev.length })) await reader.step(enc);
      prev = text;
    }
    const index = readingIndexFromLog(reader.getLog(), { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
    return [...index.referents.keys()];
  };
  const marked = await readWith(false), blanked = await readWith(true);
  // Measured on this four-turn fixture: marked → [cumberland_river, tell] —
  // "Tell" read as a name because the mark put it mid-line; on the six-turn
  // run "user" and "assistant" cleared the floor too.
  assert.ok(marked.some((id) => /user|assistant|:tell$|:what$|:why$/.test(id)), `the falsifier's premise: with the marks, the scaffolding or a question's opening word is read as a being (${marked.join(", ")})`);
  assert.ok(!blanked.some((id) => /user|assistant|:tell$|:what$|:why$/.test(id)), `blanked, no scaffolding and no question-opening word is a being: ${blanked.join(", ")}`);
  // Measured: blanked → [cumberland_river] here (the six-turn probe kept
  // Nashville too). The claim is only that the real subject is still read.
  assert.ok(blanked.some((id) => /cumberland/.test(id)), `the conversation's subject is still read: ${blanked.join(", ")}`);
});
