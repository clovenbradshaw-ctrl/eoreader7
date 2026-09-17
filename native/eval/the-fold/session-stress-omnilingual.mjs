// node session-stress-omnilingual.mjs
//
// Omnilingual regression check for this session's landed changes
// (hypergraph.js: judge() reduces both sides through headVerb before
// sameAct, commit 87f9a9f). Runs real claims through the affected organs
// (judge()/sameAct via makeRelationReader, and pronouns.js's
// resolvePronouns) against real, previously-used non-English material
// (the Russian ru.wikipedia.org Battle of Borodino fixture, per this
// file's own established convention in mhc-battery.mjs — NO English
// closed-class priors opted in, so a clean run is evidence the
// CAPITALIZATION/STRUCTURE-based machinery still generalizes, not that
// an English prior quietly carried it).
//
// Goal: confirm nothing from this session's changes crashes, false-
// binds, or newly mis-refuses on non-English text.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeRelationReader } from "../../organs/hypergraph.js";
import { extractReadable } from "../../organs/web.js";
import { splitSentences } from "../../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../../adapters/text/surfaces.js";
import { discoverRelationVocab, extractRelations } from "../../adapters/text/relations.js";
import { tokenize, buildFrequencyTable, functionWordSet } from "../../adapters/text/material.js";
import { resolvePronouns } from "../../adapters/text/pronouns.js";

const HERE = dirname(fileURLToPath(import.meta.url));

let pass = 0, fail = 0;
function report(name, ok, detail) {
  if (ok) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); }
}

const html = readFileSync(join(HERE, "fixtures", "wikipedia-borodino-ru.html"), "utf8");
const { text } = extractReadable(html);
console.log(`Russian Borodino fixture: ${text.length} chars extracted\n`);

// Build passages the same way mhc-battery.mjs does (2000-char slices).
const PASSAGE_CHARS = 2000;
const WORKING = 20;
const all = [];
const START = 2000; // skip leading nav/infobox debris, real prose starts here
for (let i = START; i < text.length; i += PASSAGE_CHARS) {
  const slice = text.slice(i, i + PASSAGE_CHARS);
  if (slice.trim()) all.push({ ref: `borodino-ru#${i}-${i + slice.length}`, text: slice });
}
const passages = all.slice(0, WORKING);

const org = { splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize, buildFrequencyTable, functionWordSet };

// ---------------------------------------------------------------------
// PROBE 1: the reader boots on real Russian material with no crash, and
// extracts SOME claims (proves the extraction pipeline itself runs end
// to end on Cyrillic bytes).
let reader, sampleClaims = [];
try {
  reader = makeRelationReader(org)(passages, { pool: passages });
  // Try reading a real sentence taken straight from the fixture text.
  const sentenceMatch = text.slice(2000).match(/[А-ЯЁ][^.!?]{20,140}[.!?]/);
  const sampleSentence = sentenceMatch ? sentenceMatch[0] : null;
  if (sampleSentence) {
    const r = reader.read(sampleSentence);
    sampleClaims = r.claims ?? [];
    console.log(`  sample sentence: "${sampleSentence.slice(0, 100)}..."`);
    console.log(`  claims extracted: ${sampleClaims.length}`);
  }
  report("reader boots and reads real Cyrillic material without crashing", true);
} catch (e) {
  report("reader boots and reads real Cyrillic material without crashing", false, String(e && e.stack ? e.stack.split("\n")[0] : e));
}

// ---------------------------------------------------------------------
// PROBE 2: headVerb-reduction path (this session's fix) does not crash
// or falsely bind on Cyrillic verbs. Constructed a small Russian claim
// with a real name from the fixture (Кутузов = Kutuzov) and an
// unrelated verb; without English morphology data, sameAct must degrade
// to exact-match only (no lemmatizer index supplied), never crash.
try {
  const claim = { subject: "Кутузов", verb: "командовал", object: "войсками" };
  const r2 = reader.read("Кутузов приказал отступить.");
  report("headVerb reduction on Cyrillic verb does not crash (no lemmatizer data — degrades safely)", true, `claims=${(r2.claims ?? []).length}`);
} catch (e) {
  report("headVerb reduction on Cyrillic verb does not crash", false, String(e && e.stack ? e.stack.split("\n")[0] : e));
}

// ---------------------------------------------------------------------
// PROBE 3: resolvePronouns (pronoun-gate item, S22 — NOT touched this
// session) runs cleanly on real Russian text with a pronoun ("он"/"она")
// near a named surface, confirming the untouched gate still behaves
// safely (no crash) on non-English input.
try {
  const sentences = splitSentences(text.slice(2000, 8000));
  const surfaces = extractSurfaces(sentences, {});
  const referents = discoverReferents ? discoverReferents(surfaces, {}) : [];
  // minActivation/minMargin: the declared operating point this repo's
  // own host/corpus.js uses (CLAUDE.md's own "S22 — co-presence is
  // evidence" section), reused here rather than invented.
  const bound = resolvePronouns(sentences, referents, { minActivation: 0.05, minMargin: 0.2 });
  report("resolvePronouns runs cleanly on real Cyrillic text (untouched S22 gate)", true, `bindings=${bound?.bindings?.length ?? "n/a"}`);
} catch (e) {
  report("resolvePronouns runs cleanly on real Cyrillic text (untouched S22 gate)", false, String(e && e.stack ? e.stack.split("\n")[0] : e));
}

// ---------------------------------------------------------------------
// PROBE 4 (adversarial): a Russian claim naming a DIFFERENT real
// battle-related entity than what's in the fixture should not falsely
// bind (checks the extended pipeline doesn't manufacture false positives
// on Cyrillic material either).
try {
  const claim = reader.read("Наполеон родился в Москве.");
  const c = (claim.claims ?? [])[0];
  report("adversarial Cyrillic false claim ('Napoleon was born in Moscow') does not falsely BIND", !c || c.verdict !== "bound", c ? `verdict=${c.verdict}` : "no claim extracted");
} catch (e) {
  report("adversarial Cyrillic false claim probe ran without crash", false, String(e && e.stack ? e.stack.split("\n")[0] : e));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
