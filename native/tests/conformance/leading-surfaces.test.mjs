// leading-surfaces.test.mjs — the mirror organ, against the real module.
import test from "node:test";
import assert from "node:assert/strict";
import { extractLeadingSurfaces, extractSurfaces } from "../adapters/text/surfaces.js";
import { splitSentences } from "../adapters/text/spans.js";

const sents = (t) => splitSentences(t);

test("extractLeadingSurfaces returns exactly what extractSurfaces deliberately skips", () => {
  const s = sents("Lincoln once defended a client. He studied law books late. Lincoln returned home.");
  const leading = extractLeadingSurfaces(s).map((x) => x.surface);
  assert.ok(leading.includes("Lincoln"), "a name that only ever opens sentences");
  // and the main scan, correctly, sees nothing here — that is the gap this fills
  assert.deepEqual(extractSurfaces(s), [], "sentence-initial capitals carry no namehood evidence to the main scan");
});

test("it counts the sentences a surface opened, and multi-word runs stay whole", () => {
  const s = sents("Abraham Lincoln rode north. Abraham Lincoln returned. Rain fell hard.");
  const got = extractLeadingSurfaces(s);
  const lincoln = got.find((x) => x.surface === "Abraham Lincoln");
  assert.ok(lincoln, `the run is not split: ${JSON.stringify(got)}`);
  assert.equal(lincoln.sentences, 2);
});

test("EVIDENCE-FREE BY CONTRACT: ordinary words that open sentences are returned too, and that is the point", () => {
  // The organ asserts nothing about namehood — its whole contract is that a
  // consumer must confirm candidates by OTHER evidence (a real pronoun
  // binding). A version that filtered here would be reading capitalisation
  // as evidence again, which is exactly what the main scan refuses to do.
  const got = extractLeadingSurfaces(sents("The weather turned cold. Rain fell hard. Merchants argued loudly.")).map((x) => x.surface);
  assert.deepEqual(got.sort(), ["Merchants", "Rain", "The"]);
});

test("the received never-a-name class is honoured, and an all-caps heading is not a sentence", () => {
  assert.deepEqual(extractLeadingSurfaces(sents("I saw the river. I walked home.")), [],
    "\"I\" carries no naming evidence in English regardless of capitalisation");
  assert.deepEqual(extractLeadingSurfaces(sents("CHAPTER ONE HERE. Rain fell hard.")).map((x) => x.surface), ["Rain"],
    "an all-caps unit is typography, not a sentence-initial name");
});

test("a punctuation break stops the run, exactly as the main scan's own rule does", () => {
  const got = extractLeadingSurfaces(sents("Lincoln, Douglas debated often. Rain fell.")).map((x) => x.surface);
  assert.ok(got.includes("Lincoln"), `the comma ends the run: ${JSON.stringify(got)}`);
  assert.ok(!got.includes("Lincoln Douglas"), "two names separated by punctuation are never glued into one");
});

test("a lowercase or empty opening yields nothing — no guessing", () => {
  assert.deepEqual(extractLeadingSurfaces(sents("rain fell hard. wind rose.")), []);
  assert.deepEqual(extractLeadingSurfaces([]), []);
});
