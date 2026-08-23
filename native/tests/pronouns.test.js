import test from "node:test";
import assert from "node:assert/strict";
import { resolvePronouns } from "../adapters/text/pronouns.js";

const mk = (lines) => lines.map((text, i) => ({ text, order: i, offset: i * 1000 }));
const filler = (n) => `frame ${n} the ordinary business of the afternoon continued much as before with letters and accounts and quiet errands`;
const OPTS = { minActivation: 0.05, minMargin: 0.2 };

const buildTwoCharacterCorpus = () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(3);
  lines.push("Elena knelt in the garden and pressed her palms into the warm garden soil.");
  pushFiller(3);
  lines.push("Marcus stood at his workbench, running a plane along the rough workshop timber.");
  pushFiller(3);
  lines.push("Elena trimmed the garden roses growing along the garden wall in the soil.");
  pushFiller(3);
  lines.push("Marcus sanded the workshop timber until the grain shone in the workshop light.");
  pushFiller(3);
  lines.push("Elena watered the garden roses again, kneeling in the soft garden soil.");
  pushFiller(3);
  lines.push("Marcus planed another length of workshop timber, the grain pale in the light.");
  pushFiller(6);
  lines.push("The garden soil there was rich, and she loved working the garden roses after rain.");
  pushFiller(3);
  lines.push("Even in the evening chill he kept sanding the workshop timber, patient with the grain.");
  return lines;
};

const SURFACES = new Map([["Elena", "ref:elena"], ["Marcus", "ref:marcus"]]);

test("pronoun operating point is declared, never defaulted", () => {
  assert.throws(() => resolvePronouns([], new Map()), /minActivation/);
  assert.throws(() => resolvePronouns([], new Map(), { minActivation: 0 }), /minMargin/);
});

test("pronoun-only scenes bind by causal thematic recall", () => {
  const { bindings, gaps } = resolvePronouns(mk(buildTwoCharacterCorpus()), SURFACES, OPTS);
  const she = bindings.find((x) => x.pronoun === "she");
  const he = bindings.find((x) => x.pronoun === "he");
  assert.equal(she?.referentId, "ref:elena");
  assert.equal(he?.referentId, "ref:marcus");
  assert.equal(gaps.length, 0);
});

test("activation beats recency", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(3);
  lines.push("Marcus stood at his workbench, running a plane along the rough workshop timber.");
  pushFiller(3);
  lines.push("Marcus sanded the workshop timber until the grain shone in the workshop light.");
  pushFiller(3);
  lines.push("Marcus planed another length of workshop timber, the grain pale in the light.");
  pushFiller(6);
  lines.push("Thomas coiled the harbor rope and watched the tide slide past the pier.");
  pushFiller(2);
  lines.push("Even in the evening chill he kept sanding the workshop timber, patient with the grain.");
  const { bindings } = resolvePronouns(mk(lines), new Map([["Marcus", "ref:marcus"], ["Thomas", "ref:thomas"]]), OPTS);
  assert.equal(bindings.find((x) => x.pronoun === "he")?.referentId, "ref:marcus");
});

test("unrelated pronoun material is refused rather than guessed", () => {
  const lines = buildTwoCharacterCorpus();
  lines[lines.length - 1] = "The distant bell rang twice and he wondered about the price of bread in the market square.";
  const { bindings, gaps } = resolvePronouns(mk(lines), SURFACES, OPTS);
  assert.ok(!bindings.some((x) => x.pronoun === "he"));
  assert.ok(gaps.some((x) => x.pronoun === "he" && x.reason === "pronoun_no_candidate"));
});

test("gender is a hard filter", () => {
  const lines = [];
  let f = 0;
  const pushFiller = (k) => { for (let i = 0; i < k; i++) lines.push(filler(f++)); };
  pushFiller(3);
  lines.push("Marcus stood at his workbench, running a plane along the rough workshop timber.");
  pushFiller(3);
  lines.push("Marcus sanded the workshop timber until the grain shone in the workshop light.");
  pushFiller(3);
  lines.push("Marcus planed another length of workshop timber, the grain pale in the light.");
  pushFiller(6);
  lines.push("Even in the evening chill she kept sanding the workshop timber, patient with the grain.");
  const { bindings, gaps } = resolvePronouns(mk(lines), new Map([["Marcus", "ref:marcus"]]), OPTS);
  assert.equal(bindings.length, 0);
  assert.ok(gaps.some((x) => x.reason === "pronoun_no_candidate"));
});
