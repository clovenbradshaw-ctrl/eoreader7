// eoreader7 · build-identity-closed-classes — derives a language's own
// determiner and copula-paradigm closed classes MECHANICALLY from a
// received POSPrior@1 (native/priors/pos-<lang>.json), which already
// carries per-form UPOS tallies from the same UD treebank this project's
// other priors come from. No new fetch, no hand-typed vocabulary: a form
// is a determiner candidate iff the treebank itself tags it DET at or
// above a declared count; a copula candidate iff tagged AUX the same way.
// Artifact forms (trailing "_" — a lemma-placeholder convention some
// treebank exports carry) are excluded by construction, never eyeballed.
//
// DISCLOSED SCOPE, stated once here rather than at every call site: AUX
// tags a language's OVERT copula (Hebrew/Arabic verbal "to be", attested
// in past/future); neither language marks present-tense "X is Y" with any
// token at all (a zero-copula "nominal sentence"), so this derivation
// structurally cannot produce a form for that construction — there is
// nothing in the treebank to tag. See identity-evidence.js's own header.
//
// Usage: node native/scripts/build-identity-closed-classes.mjs <pos-prior.json> <out.json> <lang> [minCount=20]

import { readFileSync, writeFileSync } from "node:fs";

const IN = process.argv[2];
const OUT = process.argv[3];
const LANGUAGE = process.argv[4];
const MIN_COUNT = Number(process.argv[5] ?? 20);
const ARTIFACT = /_$/;

if (!IN || !OUT || !LANGUAGE) {
  console.error("usage: node build-identity-closed-classes.mjs <pos-prior.json> <out.json> <lang> [minCount=20]");
  process.exit(1);
}

const posPrior = JSON.parse(readFileSync(IN, "utf8"));
const forms = posPrior.forms ?? {};

const tagged = (upos, minCount) =>
  Object.entries(forms)
    .filter(([form, tags]) => !ARTIFACT.test(form) && (tags[upos] ?? 0) >= minCount)
    .sort((a, b) => (b[1][upos] ?? 0) - (a[1][upos] ?? 0));

const determiners = tagged("DET", MIN_COUNT);
const copula = tagged("AUX", MIN_COUNT);

writeFileSync(
  OUT,
  JSON.stringify({
    schema: "IdentityClosedClasses@1",
    language: LANGUAGE,
    provenance: {
      giver: posPrior.provenance?.giver ?? "unknown",
      license: posPrior.provenance?.license ?? "unknown",
      source: posPrior.provenance?.source ?? IN,
      builder: "eoreader7 native/scripts/build-identity-closed-classes.mjs",
      min_count: MIN_COUNT,
      note:
        "determiners = forms this treebank tags DET at or above min_count; copula = forms tagged AUX the same way. " +
        "Mechanical derivation from the same received POSPrior@1 this project's other priors come from — never a hand-typed word list. " +
        "DISCLOSED GAP: a zero-copula ('nominal sentence') present-tense identity has no overt token to tag, so this class cannot cover it in any language.",
    },
    determiners: determiners.map(([form]) => form),
    determinerCounts: Object.fromEntries(determiners),
    copula: copula.map(([form]) => form),
    copulaCounts: Object.fromEntries(copula),
  }, null, 2),
);
console.error(
  `${LANGUAGE}: ${determiners.length} determiners (>= ${MIN_COUNT}x): ${determiners.map(([f, t]) => `${f}(${t.DET})`).join(", ")}\n` +
  `${LANGUAGE}: ${copula.length} copula forms (>= ${MIN_COUNT}x): ${copula.map(([f, t]) => `${f}(${t.AUX})`).join(", ")} -> ${OUT}`,
);
