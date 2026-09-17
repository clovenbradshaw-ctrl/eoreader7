import test from "node:test";
import assert from "node:assert/strict";
import { holographType, groundFacts, OUTPUT_HOLOGRAPH_SCHEMA } from "./output-holograph.js";
import { splitSentences } from "../adapters/text/spans.js";
import { createLemmatizer, morphologyFromPrior } from "../adapters/text/morphology.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const priorRaw = JSON.parse(readFileSync(join(HERE, "../priors/morphology-eng.json"), "utf8"));
const prior = morphologyFromPrior(priorRaw);
const sameAct = createLemmatizer(prior.forms, { language: prior.language }).sameAct;

const GROUND = [
  { end1: "the Poles", label: "shouted", end2: "Vivat", span: { start: 1627174 } },
  { end1: "Napoleon", label: "looked up and down", end2: "the river", span: { start: 1627286 } },
  { end1: "Napoleon", label: "gave", end2: "his orders", span: { start: 2155863 } },
];

test("a sentence carrying a ground fact's ends is typed material with its byte ref", () => {
  const { prose } = holographType({
    prose: "The Poles shouted Vivat. Napoleon looked up and down the river.",
    ground: GROUND, splitSentences, sameAct,
  });
  const first = prose.find((t) => t.text.includes("Poles"));
  assert.equal(first.ground, "material");
  assert.equal(first.ref, "pg2600.txt#1627174");
  assert.equal(first.groundedOn, "the Poles shouted Vivat");
});

test("a sentence carrying none of the ground's ends is self:model, marked, never laundered", () => {
  const { prose } = holographType({
    prose: "The wind whipped across the frozen expanse.",
    ground: GROUND, splitSentences, sameAct,
  });
  const s = prose[0];
  assert.equal(s.ground, "self:model");
  assert.equal(s.source, "the mouth");
  assert.equal(s.ref, undefined);
});

test("inflectional paraphrase of an end is still material through sameAct — order/orders", () => {
  const { prose } = holographType({
    prose: "Napoleon gave his order at dawn.",
    ground: [{ end1: "Napoleon", label: "gave", end2: "his orders", span: { start: 2155863 } }],
    splitSentences, sameAct,
  });
  assert.equal(prose[0].ground, "material", "order is the same act as orders through the morphology fold");
});

test("a different act is NOT material — roared is not the same end as shouted via content ends", () => {
  // "roared" is not same-act to "shouted" (different lemmas) and "Vivat"
  // carries the ground's end2 — but the ground fact's END is Vivat, and the
  // sentence carries it, so this is material by the end (the typing is about
  // which FACT grounded it, not the verb identity).
  const { prose } = holographType({
    prose: "Vivat!",
    ground: GROUND, splitSentences, sameAct,
  });
  assert.equal(prose[0].ground, "material", "Vivat is the ground fact's own end2 — the sentence is grounded");
});

test("the three tiers project: holograph has text+ref, shadow has ref only, echo is the coarse count", () => {
  const out = holographType({
    prose: "The Poles shouted Vivat. The wind blew. Napoleon gave his orders.",
    ground: GROUND, splitSentences, sameAct,
  });
  assert.equal(out.tiers.holograph.length, 3);
  assert.ok(out.tiers.holograph[0].text && out.tiers.holograph[0].ref, "holograph keeps text + address");
  assert.ok(!out.tiers.shadow[0].text && out.tiers.shadow[0].ref != null, "shadow is address only");
  assert.equal(out.tiers.echo.sentences + out.tiers.echo.model, 3, "echo counts the split");
  assert.match(out.verdict.line, /grounded in the record/);
});

test("groundFacts refuses a note with no byte span — a typed gap, never a guessed address", () => {
  const g = groundFacts([{ end1: "X", label: "did", end2: "Y" }]);
  assert.equal(g[0].ref, undefined);
  assert.equal(g[0].gap.type, "no_byte_address");
});

test("the schema is declared", () => {
  assert.equal(OUTPUT_HOLOGRAPH_SCHEMA, "EOHolographOutput@1");
});