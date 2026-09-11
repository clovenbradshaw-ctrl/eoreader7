// native/tests/morphology-vocab.test.js — the act closure's walls, against
// the REAL engine lemmatizer and the REAL vendored UniMorph prior.

import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { actClosure } from "../adapters/text/morphology.js";
import { resolveLegacySibling } from "../eval/the-fold/lib/legacy-sibling.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const { path: LEGACY_PATH, available: LEGACY_OK } = resolveLegacySibling(import.meta.url, "../../legacy-eoreader6.1/");
const SKIP = LEGACY_OK ? undefined : `the sibling legacy-eoreader6.1 checkout is not available: morphology.js (looked for ${LEGACY_PATH})`;
const { createLemmatizer, loadMorphology } = LEGACY_OK
  ? await import(`${LEGACY_PATH}packages/engine/perceiver/text/morphology.js`)
  : { createLemmatizer: undefined, loadMorphology: undefined };
const prior = LEGACY_OK ? loadMorphology(path.resolve(here, "../priors/morphology-eng.json")) : null;
const lem = LEGACY_OK ? createLemmatizer(prior.forms, { language: prior.language }) : null;

test("an attested inflection of a measured act joins; presence is the material's wall, the prior only decides sameness", { skip: SKIP }, () => {
  const { forms, added } = actClosure(new Set(["trudged"]), ["trudges", "trudging", "talked"], lem);
  assert.ok(forms.has("trudges") && forms.has("trudging"));
  assert.ok(!forms.has("talked"), "a different act never joins, however regular its shape");
  assert.ok(added.every((a) => a.sameActAs === "trudged"), "every admission names the measured act it rides on");
});

test("UniMorph's ambiguity is preserved, and it shows: 'seen' joins via measured 'saw' — see-the-act and saw-the-tool intersect", { skip: SKIP }, () => {
  const { added } = actClosure(new Set(["saw"]), ["seen"], lem);
  assert.equal(added[0]?.form, "seen");
  assert.equal(added[0]?.sameActAs, "saw",
    "sameAct never picks a lemma (the engine module's own decision #1) — the closure inherits the ambiguity and DISCLOSES the ride");
});

test("a form the material does not contain never joins — the prior knows ten thousand inflections and admits none of them by itself", { skip: SKIP }, () => {
  const { forms } = actClosure(new Set(["walked"]), [], lem);
  assert.deepEqual([...forms], ["walked"]);
});

test("no prior degrades LOUDLY to exact forms — the gap is typed, the answer unchanged, nothing silent", { skip: SKIP }, () => {
  const { forms, gap } = actClosure(new Set(["trudged"]), ["trudges"], createLemmatizer(null));
  assert.equal(gap?.reason, "no_morphology_prior");
  assert.ok(!forms.has("trudges"));
});
