import test from "node:test";
import assert from "node:assert/strict";
import { createCausalPronounResolver } from "../adapters/text/pronoun-stream.js";
import { resolvePronouns } from "../adapters/text/pronouns.js";

const OPTS = { minActivation: 0.05, minMargin: 0.2 };
const SURFACES = new Map([["Elena", "ref:elena"], ["Marcus", "ref:marcus"]]);
const filler = (n) => `frame ${n} the ordinary business of the afternoon continued much as before with letters and accounts and quiet errands`;

function corpus() {
  const lines = [];
  let f = 0;
  const fill = (n) => { for (let i = 0; i < n; i += 1) lines.push(filler(f++)); };
  fill(3);
  lines.push("Elena knelt in the garden and pressed her palms into the warm garden soil.");
  fill(3);
  lines.push("Marcus stood at his workbench, running a plane along the rough workshop timber.");
  fill(3);
  lines.push("Elena trimmed the garden roses growing along the garden wall in the soil.");
  fill(3);
  lines.push("Marcus sanded the workshop timber until the grain shone in the workshop light.");
  fill(3);
  lines.push("Elena watered the garden roses again, kneeling in the soft garden soil.");
  fill(3);
  lines.push("Marcus planed another length of workshop timber, the grain pale in the light.");
  fill(6);
  lines.push("The garden soil there was rich, and she loved working the garden roses after rain.");
  fill(3);
  lines.push("Even in the evening chill he kept sanding the workshop timber, patient with the grain.");
  return lines.map((text, order) => ({ text, order, offset: order * 1000 }));
}

test("incremental causal pronoun resolver matches batch resolver on earned operating point", () => {
  const frames = corpus();
  const batch = resolvePronouns(frames, SURFACES, OPTS).bindings.map((item) => [item.sentenceOrder, item.pronoun, item.referentId]);
  const stream = createCausalPronounResolver(OPTS);
  const incremental = frames.flatMap((frame) => stream.step(frame, SURFACES).bindings)
    .map((item) => [item.sentenceOrder, item.pronoun, item.referentId]);
  assert.deepEqual(incremental, batch);
});

test("incremental resolver still refuses unrelated pronoun material", () => {
  const frames = corpus();
  frames[frames.length - 1] = { ...frames[frames.length - 1], text: "The distant bell rang twice and he wondered about the price of bread in the market square." };
  const stream = createCausalPronounResolver(OPTS);
  const final = frames.map((frame) => stream.step(frame, SURFACES)).at(-1);
  assert.equal(final.bindings.some((item) => item.pronoun === "he"), false);
  assert.ok(final.gaps.some((item) => item.pronoun === "he"));
});
