// resolutions-parity.test.mjs — the two live-specimen regressions
// the-fold/resolutions.test.mjs pins (2026-09-16), ported against the
// VENDORED copy at native/the-fold/resolutions.js (proxy-runner.mjs's own
// "vendored at native/the-fold/" import), run through eoreader7's real
// native/kernel/activation.js::dmdWindow and a real referent index built
// from the-fold's own cast.js (the direct cross-repo import pattern
// admission-gate.mjs/mine-1-referent-anchored.mjs/mhc-battery.mjs already
// use from this exact directory).
//
// Guards against the vendored copy drifting from the-fold's canonical file
// on exactly these two 2026-09-16 fixes — see organ-consolidation finding
// #8 (resolutions.js: the-fold canonical vs eoreader7 vendored copy).
import test from "node:test";
import assert from "node:assert/strict";
import { lensCut, paradigmBlock, RECURRENCE_FLOOR } from "../../the-fold/resolutions.js";
import { dmdWindow } from "../../kernel/activation.js";
import { makeReferentIndex } from "../../../../the-fold/cast.js";
import { splitSentences } from "../../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../../adapters/text/surfaces.js";

const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const PASSAGES = [
  { ref: "pg2554.txt#45324-48671", text: "In the morning, Rodion Raskolnikov listened intently but with a sick sensation. By then Raskolnikov had murdered the old woman and her sister. Each day Razumihin came to see Raskolnikov." },
  { ref: "pg2554.txt#48673-52190", text: "That evening Razumihin brought soup and sat with him, clumsy and kind. Later Razumihin told Raskolnikov about Porfiry Petrovich. Twice Porfiry Petrovich questioned Raskolnikov, and each time Porfiry smiled." },
];
const index = indexFor(PASSAGES);

test("VENDORED PARITY — the asked act keeps every value: two accounts of the act the question names both reach the Lens, while an unasked act's repeats still compress", () => {
  // Live specimen 2026-09-16 (the-fold): "Where was Ulysses S. Grant born?"
  // — two notes with the act "was born" and different objects shared the
  // act key, and the cut dropped Point Pleasant, leaving the Lens to state
  // Georgetown alone.
  const mk = (i, verb, object) => ({ subject: "Raskolnikov", verb, object, witnesses: [`novel.txt#${i * 10}-${i * 10 + 9}~r`], sources: 1 });
  const notes = [mk(0, "visited", "the tavern"), mk(1, "visited", "the office"), mk(2, "was born", "in Ryazan"), mk(3, "visited", "the bridge"), mk(4, "was born", "in Moscow"), mk(5, "visited", "the square")];
  const active = index.resolve("Raskolnikov");
  const asked = lensCut({ active, index, notes, dmdWindow, question: "Where was Raskolnikov born?" });
  const objects = asked.rows.filter((r) => r.n.verb === "was born").map((r) => r.n.object).sort();
  assert.deepEqual(objects, ["in Moscow", "in Ryazan"], `both values of the asked act are kept: ${asked.rows.map((r) => r.n.object).join(", ")}`);
  assert.equal(asked.rows.filter((r) => r.n.verb === "visited").length, 1, "the unasked act still compresses to one row");
  // CONTROL: asked about neither act, the cut keeps one row per act — the
  // behaviour the fix changes only for the act a question names.
  const unasked = lensCut({ active, index, notes, dmdWindow, question: "What did Raskolnikov do?" });
  assert.equal(unasked.rows.filter((r) => r.n.verb === "was born").length, 1, "an unasked act's second value is a repeat at act grain, as before");
  assert.equal(unasked.asked, 0);
});

test("VENDORED PARITY — recurrence counts places, not witness records: one sentence read at paragraph and sentence grain is one place; two sentences are two", () => {
  // Live specimen 2026-09-16 (the-fold): every note carried the arrival
  // read's paragraph address and the turn's sentence address for the same
  // bytes, and "What recurs" stated two places for a birthplace the
  // material states once.
  const active = index.resolve("Raskolnikov");
  const once = [{ subject: "Raskolnikov", verb: "visited", object: "Razumihin", witnesses: ["novel.txt#0-115~r", "novel.txt#0-59~r"], sources: 1 }];
  assert.equal(paradigmBlock({ active, index, notes: once, dmdWindow }).text, "", "a nested re-read of the same bytes does not recur");
  const twice = [{ subject: "Raskolnikov", verb: "visited", object: "Razumihin", witnesses: ["novel.txt#0-59~r", "novel.txt#60-115~r"], sources: 1 }];
  assert.match(paradigmBlock({ active, index, notes: twice, dmdWindow }).text, /\(2 places\)/, "two sentences are two places");
  assert.ok(RECURRENCE_FLOOR >= 2, "the floor the fixture above is built against");
});
