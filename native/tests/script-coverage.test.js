// script-coverage.test.js — surfaces.js::scriptCoverage, the boundary this
// organ reports rather than crosses.
//
// Every candidate-surface filter in surfaces.js reads capitalisation, so on a
// caseless script none of them can fire. Before scriptCoverage existed, that
// produced a small plausible surface count and NO gap — a guessed number where
// the file's own tier discipline requires a gap. These cases pin both the
// boundary and, just as importantly, the refusal to overreach past it: a
// bicameral non-Latin script must NOT be gapped.
import test from "node:test";
import assert from "node:assert/strict";
import { scriptCoverage, extractSurfaces, accumulateSurfaceEvidence, createSurfaceEvidence } from "../adapters/text/surfaces.js";

const sentencesOf = (...texts) => texts.map((text, order) => ({ text, order }));

test("bicameral scripts are not gapped — Latin, Greek, Cyrillic, Armenian", () => {
  // The overreach guard. Greek, Cyrillic and Armenian all HAVE case (Unicode
  // Cased_Letter) AND actually use both members of it in ordinary running
  // prose, so the mechanism is genuinely about them and a gap here would be
  // a false refusal. Measured on the real Greek Wikipedia article this was
  // built against, the surface layer reads Greek proper nouns correctly
  // (Παπανούτσος, Μιλήσιος, Νόηση) — its separate failure is in relation
  // extraction, which is not this organ's question.
  //
  // Georgian was ALSO on this list once, on the same "Cased_Letter is
  // present" reasoning — and that was wrong. See the third gap test below:
  // Georgian's Unicode-cased letters (Mkhedruli, General_Category Ll) are
  // never actually joined by the OTHER member of that pair in real writing,
  // so it belongs with the third boundary now, not this one.
  for (const [label, text] of [
    ["Latin", "Victor Frankenstein walked. The creature followed Victor Frankenstein home."],
    ["Greek", "Ο Παπανούτσος έγραψε πολλά. Ο Μιλήσιος δίδαξε στον Παπανούτσο."],
    ["Cyrillic", "Лев Толстой написал роман. Толстой жил в России много лет."],
    ["Armenian", "Հովհաննես Թումանյան գրել է բանաստեղծություն։ Թումանյան ապրել է Հայաստանում։"],
  ]) {
    const cov = scriptCoverage(sentencesOf(text));
    assert.equal(cov.gap, null, `${label} must not be gapped`);
    assert.equal(cov.casedShare, 1, `${label} is entirely cased`);
    assert.equal(cov.caselessLetters, 0, label);
  }
});

test("a wholly caseless script gaps as script_without_case — zero is not a threshold", () => {
  for (const [label, text] of [
    ["Hebrew", "פילוסופיה היא תחום דעת. הפילוסופיה עוסקת בשאלות יסוד."],
    ["Arabic", "الفلسفة مجال معرفي. تهتم الفلسفة بالأسئلة الأساسية."],
    ["Hangul", "철학은 학문이다. 철학은 근본적인 질문을 다룬다."],
    ["CJK", "哲学是一门学科。哲学研究根本问题。"],
    ["Devanagari", "दर्शन एक विषय है। दर्शन मूल प्रश्नों का अध्ययन करता है।"],
    ["Thai", "ปรัชญาเป็นสาขาวิชา ปรัชญาศึกษาคำถามพื้นฐาน"],
  ]) {
    const cov = scriptCoverage(sentencesOf(text));
    assert.equal(cov.gap?.reason, "script_without_case", label);
    assert.equal(cov.casedLetters, 0, label);
    assert.equal(cov.casedShare, 0, label);
    assert.equal(cov.gap.tier, "model", label);
    assert.equal(cov.gap.needsWitness, true, label);
  }
});

test("cased debris in a caseless material gaps as script_mostly_without_case, carrying its share", () => {
  // The case that actually bit, reproduced in miniature: a Hebrew article
  // carrying an English caption. Cased letters are present, so the mechanism
  // fires — on the English alone. Measured on the real article: 3.5% cased,
  // and the six surfaces it found were "School", "Athens", "Raffaello",
  // "Internet" — the caption, never the article.
  const cov = scriptCoverage(sentencesOf(
    "פילוסופיה היא תחום דעת העוסק בשאלות יסוד.",
    "The School of Athens by Raffaello Sanzio da Urbino.",
    "הפילוסופיה היוונית התפתחה באתונה במשך מאות שנים רבות מאוד.",
  ));
  assert.equal(cov.gap?.reason, "script_mostly_without_case");
  assert.ok(cov.casedLetters > 0, "cased debris is present");
  assert.ok(cov.casedShare < 0.5, `caseless is the majority, got ${cov.casedShare}`);
  assert.match(cov.gap.detail, /% of this material's letters carry case/);
  assert.equal(cov.gap.casedShare, cov.casedShare, "the gap carries the measured share");
});

test("a script whose case member never appears outside sentence-initial position gaps as script_case_unused — zero is not a threshold here either", () => {
  // Found running this instrument on all 516 real UN UDHR translations
  // (live_priors POLICIES.md LP8, eoreader7 READING-SPEC.md S36), not
  // invented here: Georgian's everyday alphabet, Mkhedruli, is Unicode
  // General_Category Ll (lowercase) — so `casedLetters` is 100% of its
  // letters and the two gaps above correctly stay silent — but ordinary
  // published Georgian never uses the OTHER member of that pair, Mtavruli,
  // to mark anything; it is a monumental/decorative variant, not a working
  // capitalisation convention. A real 10,174-letter UDHR translation
  // contained not one Mtavruli letter outside its own file's English
  // header. `CAP_TOKEN` needs a capital OUTSIDE sentence-initial position
  // to have any evidence at all (position is not namehood — the same rule
  // every sentence-initial exclusion in this file already applies), and
  // Georgian never supplies one. The identical shape recurs on two
  // completely unrelated scripts, confirming this is a structural
  // question about CASE USAGE, never a fact about any one alphabet: a
  // Cherokee transcription using the syllabary's OWN traditional block
  // (every character General_Category Lu by default — the mirror image of
  // Georgian, all-uppercase rather than all-lowercase) fails for the same
  // reason from the other side; and an ordinary Latin-alphabet sentence
  // written in a lowercase-only romanisation convention — no exotic script
  // at all — fails identically, because the defect was never about the
  // alphabet, only about whether THIS material ever contrasts the two.
  for (const [label, text] of [
    ["Georgian (Mkhedruli, real UDHR shape)", "შოთა რუსთაველი დაწერა ლექსი. რუსთაველი ცხოვრობდა საქართველოში."],
    ["Cherokee (traditional syllabary, all-Lu by default)", "ᏓᏂᏔᏍᎦ ᎤᏪᏘᏒᎩ ᎦᏙᎯᎢ. ᏓᏂᏔᏍᎦ ᎤᏪᏥᎢ ᏂᎦᎥ."],
    ["Latin, lowercase-only romanisation", "viktor valgamaa kirjutas raamatu. valgamaa elas eestis kaua."],
  ]) {
    const cov = scriptCoverage(sentencesOf(text));
    assert.equal(cov.gap?.reason, "script_case_unused", label);
    assert.ok(cov.casedLetters > 0, `${label}: this gap is about material that DOES have cased letters`);
    assert.equal(cov.gap.tier, "model", label);
    assert.equal(cov.gap.needsWitness, true, label);
    assert.equal(cov.gap.casedShare, cov.casedShare, `${label}: the gap carries the measured share`);
  }

  // The boundary itself, pinned precisely: ONE non-initial capitalised
  // token anywhere is enough to NOT gap — this organ reports absence, it
  // does not enforce a minimum recurrence (that floor, if any, belongs to
  // extractSurfaces/discoverReferents downstream, not to this gate).
  const oneOccurrence = sentencesOf("the man walked home. later he met Someone by the gate.");
  assert.equal(scriptCoverage(oneOccurrence).gap, null, "a single non-initial capital is already evidence, not nothing");
});

test("scriptCoverage accepts pre-computed evidence and produces the identical result either way", () => {
  // eot-sidecar.mjs's own fold-once discipline: a caller about to run
  // extractSurfaces on the same sentences anyway should not pay for the
  // capitalised-run walk twice. Pinned here as an equivalence, not just
  // documented, so the optimisation path can never silently diverge from
  // the default one.
  const georgian = sentencesOf("შოთა რუსთაველი დაწერა ლექსი.", "რუსთაველი ცხოვრობდა საქართველოში.");
  const bare = scriptCoverage(georgian);
  const ev = accumulateSurfaceEvidence(georgian, createSurfaceEvidence());
  const withEvidence = scriptCoverage(georgian, { evidence: ev });
  assert.deepEqual(withEvidence, bare);

  const armenian = sentencesOf("Հովհաննես Թումանյան գրել է բանաստեղծություն։", "Թումանյան ապրել է Հայաստանում։");
  const bareArm = scriptCoverage(armenian);
  const evArm = accumulateSurfaceEvidence(armenian, createSurfaceEvidence());
  assert.deepEqual(scriptCoverage(armenian, { evidence: evArm }), bareArm);
});

test("the gap fires exactly where the surface layer goes blind — and not where it does not", () => {
  // The whole point, stated as one assertion pair against the same organ the
  // gap is about: caseless material yields surfaces that are NOT from it,
  // while bicameral material yields surfaces that ARE.
  const hebrew = sentencesOf(
    "פילוסופיה היא תחום דעת העוסק בשאלות יסוד.",
    "The School of Athens by Raffaello Sanzio da Urbino.",
    "הפילוסופיה היוונית התפתחה באתונה במשך מאות שנים רבות מאוד.",
  );
  const greek = sentencesOf(
    "Ο Παπανούτσος έγραψε πολλά βιβλία για τη φιλοσοφία.",
    "Ο Μιλήσιος δίδαξε στον Παπανούτσο τη φιλοσοφία της Αθήνας.",
  );

  assert.ok(scriptCoverage(hebrew).gap, "caseless material is gapped");
  const hebrewSurfaces = extractSurfaces(hebrew).map((s) => s.surface);
  // Every surface found is Latin-script debris — none is Hebrew.
  for (const s of hebrewSurfaces) assert.doesNotMatch(s, /\p{Script=Hebrew}/u, s);

  assert.equal(scriptCoverage(greek).gap, null, "bicameral material is not gapped");
  const greekSurfaces = extractSurfaces(greek).map((s) => s.surface);
  assert.ok(greekSurfaces.some((s) => /\p{Script=Greek}/u.test(s)), "Greek surfaces are genuinely Greek");
});

test("material with no letters at all is not gapped — nothing was missed", () => {
  const cov = scriptCoverage(sentencesOf("123 456.", "789 --- 0."));
  assert.equal(cov.gap, null);
  assert.equal(cov.casedLetters, 0);
  assert.equal(cov.caselessLetters, 0);
  assert.equal(cov.casedShare, 0);
});

test("scriptCoverage reads sentences without mutating them or requiring surfaces", () => {
  const sents = sentencesOf("Victor walked.", "Victor returned.");
  const before = JSON.stringify(sents);
  scriptCoverage(sents);
  assert.equal(JSON.stringify(sents), before, "input is untouched");
});
