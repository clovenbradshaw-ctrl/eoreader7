// The native lemmatizer replaces the frozen provider's only under parity
// (the ratchet): both run over the SAME received prior and the same forms.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createLemmatizer, morphologyFromPrior } from "../adapters/text/morphology.js";

const PRIOR = new URL("../eval/the-fold/fixtures/unimorph-morphology-prior.json", import.meta.url);
const LEGACY = new URL("../../legacy-eoreader6.1/packages/engine/perceiver/text/morphology.js", import.meta.url);

test("native createLemmatizer agrees with the frozen provider on lemma sets and sameAct over the real UniMorph prior", async (t) => {
  if (!existsSync(LEGACY)) return t.skip("frozen provider absent on this checkout (submodule)");
  const legacy = await import(LEGACY);
  const prior = morphologyFromPrior(JSON.parse(readFileSync(PRIOR, "utf8")));
  const a = createLemmatizer(prior.forms, { language: prior.language });
  const b = legacy.createLemmatizer(prior.forms, { language: prior.language });
  assert.equal(a.size, b.size); assert.deepEqual(a.gap, b.gap);
  const forms = Object.keys(prior.forms); let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const sample = Array.from({ length: 400 }, () => forms[Math.floor(rnd() * forms.length)]).concat(["prepared", "prepare", "went", "go", "running", "stopped", "flies", "studied", "prepares"]);
  for (const f of sample) assert.deepEqual([...a.lemmasOf(f)].sort(), [...b.lemmasOf(f)].sort(), f);
  for (const [x, y] of [["prepared", "prepare"], ["went", "go"], ["running", "run"], ["flies", "fly"], ["battle", "battled"], ["army", "armies"], ["kutuzov", "napoleon"]])
    assert.equal(a.sameAct(x, y), b.sameAct(x, y), `${x} ~ ${y}`);
  assert.equal(a.sameAct("prepared", "prepare"), true);
  assert.equal(a.sameAct("kutuzov", "napoleon"), false);
});
test("a prior with another declared language gets no English suffix rule; a missing prior is a loud gap", () => {
  const el = createLemmatizer({ "ἔλαβον": ["λαμβάνω"] }, { language: "grc" });
  assert.deepEqual([...el.lemmasOf("running")], ["running"], "no English stems folded under a Greek prior");
  const none = createLemmatizer(null);
  assert.ok(none.gap?.reason === "no_morphology_prior"); assert.equal(none.sameAct("a", "b"), false);
  assert.throws(() => morphologyFromPrior({ schema: "MorphologyPrior@1", forms: {} }), /giver/);
});
