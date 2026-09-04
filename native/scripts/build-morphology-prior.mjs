// build-morphology-prior.mjs — rebuild MorphologyPrior@1 from UniMorph.
//
// WHY THIS EXISTS. The shipped prior's own provenance named
// `scripts/build-morphology-prior.mjs` and that file was NOT in this
// repository, with an `input` path pointing at a previous session's scratch
// directory. So the prior could not be rebuilt, only replaced — which means a
// hole in it could not be corrected. That is the finding S56 was written
// around, and committing the builder is what closes it.
//
// WHAT IT KEEPS, and why the artifact is small. UniMorph English is 652,477
// (lemma, form, tags) rows. A regular inflection is recovered at read time by
// `morphology.js`'s own suffix rule, so storing it would be storing what the
// reader can already derive: only the IRREGULAR TAIL is kept — a form whose
// lemma the suffix rule cannot reach. That is why 224,550 verb pairs reduce to
// ~5,500 entries, and the ratio is reported on every build rather than
// assumed.
//
// THE HOLE IT CANNOT CLOSE, measured and disclosed rather than worked around:
// UniMorph English carries **zero rows for the lemma `be`**, while every other
// top-frequency irregular (have, do, go, say, get, make, know, take, see,
// come, think, give) carries five verb rows apiece. The three rows in which
// `am`, `are` and `were` appear at all are tagged `N;SG` — the noun senses.
// A second named giver closes it: `adapters/text/priors.js`'s
// `COPULA_PARADIGM`, injected as `createLemmatizer`'s `supplement`. This
// builder does NOT fold that in, because an artifact naming UniMorph as its
// giver must contain what UniMorph gave and nothing else.
//
//   curl -sL https://raw.githubusercontent.com/unimorph/eng/master/eng -o eng.tsv
//   node build-morphology-prior.mjs eng.tsv > ../eval/the-fold/fixtures/unimorph-morphology-prior.json
import { readFileSync } from "node:fs";

const SRC = process.argv[2];
if (!SRC) { console.error("usage: node build-morphology-prior.mjs <unimorph-eng.tsv>"); process.exit(2); }

// The reader's OWN rule, imported rather than restated — a builder that
// restates it drops forms the reader cannot re-derive the moment the two
// drift. Measured while writing this: a five-way divergent restatement (no
// `ied` rule, no doubled-consonant rule, no `ss` exclusion, a spurious bare
// `d` rule, a narrower `es`) produced a materially different artifact.
import { stemsOf } from "../adapters/text/morphology.js";

const rows = readFileSync(SRC, "utf8").split("\n");
const forms = Object.create(null);
let read = 0, recoverable = 0, kept = 0;
for (const line of rows) {
  const [lemma, form, tags] = line.split("\t");
  if (!lemma || !form || !tags) continue;
  // Every tag, not verbs alone. The shipped artifact recorded 224,550 pairs
  // read against this filter reading 127,514, and a verbs-only build came out
  // a strict SUBSET of it (rebuilt-only: 0) — so the original kept non-verb
  // paradigms too, and a lemmatizer asked about a noun should not silently
  // lose them.
  const l = lemma.toLowerCase(), f = form.toLowerCase();
  if (f === l) continue;
  // Counted AFTER the identity check — the shipped artifact records 224,550
  // pairs read, which is exactly the number of rows whose form differs from
  // its lemma. Verified against the source, not guessed.
  read += 1;
  if (stemsOf(f).has(l)) { recoverable += 1; continue; }
  (forms[f] ??= []).includes(l) || forms[f].push(l);
}

// `kept` is DISTINCT FORMS, not pairs — the shipped artifact records 5,531
// against 8,539 raw pairs kept, so a form with two lemmas counts once.
kept = Object.keys(forms).length;

const artifact = {
  schema: "MorphologyPrior@1",
  language: "eng",
  provenance: {
    source: "UniMorph English (github.com/unimorph/eng)",
    built_by: "native/scripts/build-morphology-prior.mjs",
    input: SRC,
    pairs_read: read,
    rule_recoverable_dropped: recoverable,
    kept,
    note: "the irregular tail only; regular inflections are recovered by stemsOf at read time",
    known_hole: "UniMorph English carries no rows for the lemma `be`; the copula is supplied by a second giver (priors.js COPULA_PARADIGM), never by this artifact",
  },
  forms,
  irregular: {},
};
process.stderr.write(`read ${read} verb pairs, dropped ${recoverable} as rule-recoverable, kept ${kept}\n`);
process.stdout.write(JSON.stringify(artifact));
