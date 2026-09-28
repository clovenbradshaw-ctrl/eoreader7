// relation-priors-i18n.test.mjs — the received closed classes injected into
// discoverRelationVocab/extractRelations, checked against real UDHR text in
// all three registered languages (spa/arb/cmn).
//
// Fixtures (native/adapters/text/fixtures/udhr-{spa,arb,cmn_hans}.txt) are
// copied from live_priors/06-government-legal/un-udhr/ — public-domain UN
// text, the same copy-not-reach-across-repos convention this project's
// fixtures already follow (native/eval/udhr/derived/ holds the same corpus
// for other organs).
//
// THE INVARIANT, verified directly against the real functions rather than
// asserted from reading the code: injecting a language's own closed classes
// NEVER adds, removes, or changes the CONTENT (subject/verb/object) of any
// extracted edge — the only field that may differ is `polarity`, and only
// where the material's own negation word (each language's own declared
// set) sits in the pre-verb window `negationBeforeVerbFor` already checks.
// Measured live on this checkout (2026-09-28): Spanish 134 edges/4 polarity
// flips, Arabic 5 edges/1 flip, Mandarin 1 edge/0 flips — edge COUNT and
// every edge's CONTENT byte-identical to the English-default baseline in
// all three. Counts are not pinned as exact numbers here (a real edit to
// relations.js's own extraction could legitimately move them) — what is
// pinned is the invariant itself, which nothing legitimate should break.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { splitSentences } from "./spans.js";
import { extractSurfaces } from "./surfaces.js";
import { discoverRelationVocab, extractRelations } from "./relations.js";
import { relationPriorOptionsFor } from "./relation-priors-i18n.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(HERE, "fixtures");

function extractEdges(text, opts = {}) {
  const sents = splitSentences(text, {});
  const surfaces = extractSurfaces(sents, {});
  const vocab = discoverRelationVocab(text, { surfaces, minSurfaces: 1 });
  return extractRelations(text, { verbs: vocab.verbs, ...opts });
}

// { file, code } — code is what relationPriorOptionsFor(code) expects; the
// Mandarin fixture's own filename carries the script tag (cmn_hans) that
// relationPriorOptionsFor's registry key does not.
const LANGS = [
  { file: "udhr-spa.txt", code: "spa", label: "Spanish" },
  { file: "udhr-arb.txt", code: "arb", label: "Arabic" },
  { file: "udhr-cmn_hans.txt", code: "cmn", label: "Mandarin" },
];

for (const { file, code, label } of LANGS) {
  const fixturePath = path.join(FIXTURES, file);
  const ready = fs.existsSync(fixturePath);

  test(`${label}: injecting relationPriorOptionsFor("${code}") changes at most polarity, never edge content or count`, { skip: !ready && `fixture not present: ${fixturePath}` }, () => {
    const text = fs.readFileSync(fixturePath, "utf8");
    const baseline = extractEdges(text, {});
    const opts = relationPriorOptionsFor(code);
    assert.ok(opts, `relationPriorOptionsFor("${code}") must return a real options object`);
    const injected = extractEdges(text, opts);

    assert.equal(injected.length, baseline.length, "injecting a language prior must never add or remove an edge");
    let polarityFlips = 0;
    for (let i = 0; i < baseline.length; i++) {
      const a = baseline[i], b = injected[i];
      assert.equal(b.subject, a.subject, `edge ${i}: subject must be byte-identical`);
      assert.equal(b.verb, a.verb, `edge ${i}: verb must be byte-identical`);
      assert.equal(b.object, a.object, `edge ${i}: object must be byte-identical`);
      assert.equal(b.offset, a.offset, `edge ${i}: offset must be byte-identical (same location in the source)`);
      if (a.polarity !== b.polarity) polarityFlips++;
    }
    // Report, not assert an exact count: a real relations.js change could
    // legitimately move this. What's pinned is the invariant above.
    if (polarityFlips > 0) {
      for (const w of opts.negationWords ?? []) assert.ok(typeof w === "string" && w.length > 0, "a real negation word, not an empty string");
    }
  });
}

test("Spanish: the injected negation class produces a real, non-vacuous effect on the real UDHR specimen", { skip: !fs.existsSync(path.join(FIXTURES, "udhr-spa.txt")) }, () => {
  // Spanish "no" is common in the UDHR's own rights-and-prohibitions
  // register ("nadie será...", "no podrá..."); this is the one language
  // where the fix should visibly fire, not just type-check as a no-op.
  //
  // The control here is a NON-EMPTY but non-matching Set, never an empty
  // one — found live while writing this test: negationBeforeVerbFor(new
  // Set()) does NOT mean "nothing negates," it builds an empty-alternation
  // regex that matches a zero-width position almost everywhere, flipping
  // EVERY edge to negative (confirmed: all 134/134 edges on this exact
  // fixture). A real, disclosed relations.js defect (an empty Set should
  // mean "no negation markers for this language," not "everything is
  // negated") — out of scope for this file, named in
  // ORGAN-CONSOLIDATION-2026-09.md rather than fixed here, since it
  // touches the shared negation mechanism every caller of extractRelations
  // depends on and needs its own dedicated verification pass.
  const text = fs.readFileSync(path.join(FIXTURES, "udhr-spa.txt"), "utf8");
  const baseline = extractEdges(text, {});
  const injected = extractEdges(text, relationPriorOptionsFor("spa"));
  const control = extractEdges(text, { ...relationPriorOptionsFor("spa"), negationWords: new Set(["zzznonexistentnegationmarkerzzz"]) });
  const flips = baseline.filter((a, i) => a.polarity !== injected[i].polarity).length;
  const controlFlips = baseline.filter((a, i) => a.polarity !== control[i].polarity).length;
  assert.equal(controlFlips, 0, "a non-matching negation word must flip nothing — sanity check that the mechanism responds to real matches, not mere presence of a Set");
  assert.ok(flips > 0, "Spanish's real negation words must flip at least one edge's polarity on real UDHR text — otherwise the fix is untested, not merely narrow");
});
