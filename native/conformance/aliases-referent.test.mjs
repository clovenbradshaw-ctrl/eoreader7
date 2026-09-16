// native/conformance/aliases-referent.test.mjs — there is no real name: the
// referent IS the equivalence class of its aliases, and its identity is a byte
// key over the class (Frege: one object, many names). The class reaches the
// surface/referent layer, so any alias resolves to the same identity.
import { test } from "node:test";
import assert from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { declaredAliases, aliasClasses, aliasClassMap, shapesFrom } from "../organs/aliases.js";
import { splitSentences } from "../organs/grounding.js";
import { referentIdentity } from "../adapters/text/surfaces.js";

const PRIOR_PATH = new URL("../../../live_priors/derived-priors/alias-priors/alias-declaration-en.json", import.meta.url);
const SKIP = existsSync(PRIOR_PATH) ? undefined : `live_priors not beside the checkout: ${PRIOR_PATH}`;
const SHAPES = SKIP ? null : shapesFrom(JSON.parse(readFileSync(PRIOR_PATH, "utf8")), { minConfirmRate: 0.3, minFires: 100 });

const classesOf = (t) => aliasClasses(declaredAliases(t, { splitSentences, minUses: 2, shapes: SHAPES }).aliases);

test("a declared pair is ONE class, and the full name is just another alias", { skip: SKIP }, () => {
  const classes = classesOf("The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected.");
  assert.equal(classes.length, 1);
  const forms = classes[0].forms;
  assert.ok(forms.includes("rta"), "the gloss's right side is a form");
  assert.ok(forms.some((f) => f.includes("regional transit authority")), "the gloss's LEFT side is a form too — no form is the name");
  assert.ok(!forms.some((f) => f === "rta") || classes[0].display !== "regional transit authority", "the display representative is arbitrary, not the real name");
});

test("every alias of a referent shares ONE identity — a class key, not a name", { skip: SKIP }, () => {
  const map = aliasClassMap(classesOf("The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected."));
  const a = referentIdentity("RTA", { aliases: map });
  const b = referentIdentity("The Regional Transit Authority", { aliases: map });
  assert.equal(a, b, "two names, one referent");
  assert.ok(a.startsWith("class:"), "the identity is the class, never a spelling");
  // a form the material never declared is NOT in the class — identity is the bytes
  assert.ok(referentIdentity("Metro", { aliases: map }).startsWith("bytes:"));
});

test("the same declared pair in different materials reaches the SAME class key", { skip: SKIP }, () => {
  const c1 = classesOf("The Regional Transit Authority (RTA) covers downtown. The RTA budget was rejected.");
  const c2 = classesOf("The RTA budget was rejected. The Regional Transit Authority (RTA) covers downtown.");
  assert.equal(c1[0].key, c2[0].key, "the identity is the class, so it survives a different declaration order");
});
