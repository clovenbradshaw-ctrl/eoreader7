// native/tests/morphology-vocab.test.js — the act closure's walls, against
// the REAL engine lemmatizer and the REAL vendored UniMorph prior.

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { actClosure } from "../adapters/text/morphology.js";
import { createLemmatizer, morphologyFromPrior } from "../adapters/text/morphology.js";

const here = path.dirname(fileURLToPath(import.meta.url));
// morphologyFromPrior takes the already-parsed prior (the native-boundary
// wall keeps adapters/text/ from touching the filesystem itself) — loadMorphology
// did its own fs.readFileSync; the read now happens here at the call site,
// ported out of legacy-eoreader6.1/packages/engine/perceiver/text/morphology.js
// 2026-09-10, same schema check, same behavior.
const prior = morphologyFromPrior(JSON.parse(fs.readFileSync(path.resolve(here, "../priors/morphology-eng.json"), "utf8")));
const lem = createLemmatizer(prior.forms, { language: prior.language });

test("an attested inflection of a measured act joins; presence is the material's wall, the prior only decides sameness", () => {
  const { forms, added } = actClosure(new Set(["trudged"]), ["trudges", "trudging", "talked"], lem);
  assert.ok(forms.has("trudges") && forms.has("trudging"));
  assert.ok(!forms.has("talked"), "a different act never joins, however regular its shape");
  assert.ok(added.every((a) => a.sameActAs === "trudged"), "every admission names the measured act it rides on");
});

test("UniMorph's ambiguity is preserved, and it shows: 'seen' joins via measured 'saw' — see-the-act and saw-the-tool intersect", () => {
  const { added } = actClosure(new Set(["saw"]), ["seen"], lem);
  assert.equal(added[0]?.form, "seen");
  assert.equal(added[0]?.sameActAs, "saw",
    "sameAct never picks a lemma (the engine module's own decision #1) — the closure inherits the ambiguity and DISCLOSES the ride");
});

test("a form the material does not contain never joins — the prior knows ten thousand inflections and admits none of them by itself", () => {
  const { forms } = actClosure(new Set(["walked"]), [], lem);
  assert.deepEqual([...forms], ["walked"]);
});

test("no prior degrades LOUDLY to exact forms — the gap is typed, the answer unchanged, nothing silent", () => {
  const { forms, gap } = actClosure(new Set(["trudged"]), ["trudges"], createLemmatizer(null));
  assert.equal(gap?.reason, "no_morphology_prior");
  assert.ok(!forms.has("trudges"));
});
