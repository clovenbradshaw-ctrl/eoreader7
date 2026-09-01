// relations.test.js — the conformance suite adapters/text/relations.js has
// never had in the native tree (found while building DR4/DR5, live_priors/
// goldens/reading/DERIVED-RULES.md: subject-NP width and phrasal predicates,
// derived from a hand-rolled golden pass and worked backwards to what would
// close it). Pins both the pre-existing behavior (byte-identical when the
// new options are omitted — every existing caller, spans-frontmatter.test.js
// and levers.test.js among them, must see nothing change) and the two new
// opt-in capabilities, each proven against a real defect this pass found by
// RUNNING the extractor, not by reasoning about it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverRelationVocab, extractRelations, expandSubjectNP } from "../adapters/text/relations.js";

test("baseline: byte-identical to before when no new option is passed", () => {
  const text = "Victor loved Elizabeth.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Victor"], minSurfaces: 1 });
  const rels = extractRelations(text, { verbs });
  assert.deepEqual(rels, [{
    subject: "Victor", verb: "loved", object: "Elizabeth", polarity: "+",
    offset: 0, subjectOffset: 0, objectOffset: 13,
  }]);
});

test("baseline: a 2-token subject still works unchanged", () => {
  const text = "Prince Andrew arrived quickly.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Prince Andrew"], minSurfaces: 1 });
  const rels = extractRelations(text, { verbs });
  assert.equal(rels[0].subject, "Prince Andrew");
  assert.equal(rels[0].verb, "arrived");
});

// ── DR5: phrasal predicates ──────────────────────────────────────────────

test("DR5 off (default): an intervening auxiliary silently swallows the real verb into the object — the pre-existing, disclosed defect, unchanged", () => {
  const text = "He does not measure the distance.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["He"], minSurfaces: 1 });
  assert.deepEqual([...verbs], ["does"]);
  const rels = extractRelations(text, { verbs });
  assert.equal(rels[0].verb, "does");
  assert.equal(rels[0].object, "not measure the distance");
  assert.equal(rels[0].polarity, "+", "wrongly affirmative — the real, pre-existing bug this pass found and fixed under phrasalPredicates:true");
});

test("DR5 on: discoverRelationVocab nominates the real content verb past the aux/negation chain, AND the aux itself (it may be the clause's own bare main verb elsewhere in the material)", () => {
  const text = "He does not measure the distance.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["He"], minSurfaces: 1, phrasalPredicates: true });
  assert.ok(verbs.has("measure"), "the real content verb must still be nominated");
  assert.ok(verbs.has("does"), "the skipped aux is ALSO nominated — dual evidence, not a choice between the two (see tallyAfter's own header: unconditionally dropping it lost real bare-copula edges live, measured against live_priors/goldens/reading)");
  assert.equal(verbs.size, 2);
});

test("DR5 on: extractRelations captures the full predicate, subject stays bare, polarity reads correctly", () => {
  const text = "He does not measure the distance.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["He"], minSurfaces: 1, phrasalPredicates: true });
  const rels = extractRelations(text, { verbs, phrasalPredicates: true });
  assert.equal(rels.length, 1);
  assert.equal(rels[0].subject, "He");
  assert.equal(rels[0].verb, "does not measure");
  assert.equal(rels[0].object, "the distance");
  assert.equal(rels[0].polarity, "-");
});

test("DR5 on: an auxiliary chain that would otherwise strand the real verb in the object (UDHR's own 'have pledged themselves to achieve') is captured whole", () => {
  const text = "Member States have pledged themselves to achieve the promotion of universal respect.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Member States"], minSurfaces: 1, phrasalPredicates: true });
  assert.ok(verbs.has("pledged"));
  assert.ok(verbs.has("have"), "the aux is ALSO nominated now (dual evidence) — MATCHER's own greedy AUX_GROUP_RE still prefers the longer aux+verb reading below, so this does not resurrect the swallow bug");
  const rels = extractRelations(text, { verbs, phrasalPredicates: true });
  assert.equal(rels[0].subject, "Member States");
  assert.equal(rels[0].verb, "have pledged");
  assert.match(rels[0].object, /^themselves to achieve/);
});

test("DR5 on: a 2-token ordinary subject is never mistaken for an aux-chain start (the subject/aux boundary interaction this pass had to fix)", () => {
  const text = "Prince Andrew has arrived quickly.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Prince Andrew"], minSurfaces: 1, phrasalPredicates: true });
  assert.ok(verbs.has("arrived"));
  assert.ok(verbs.has("has"), "the aux is ALSO nominated now (dual evidence)");
  const rels = extractRelations(text, { verbs, phrasalPredicates: true });
  assert.equal(rels[0].subject, "Prince Andrew", "must not be \"Prince Andrew has\" — greedy 2-token subject nearly won this before the negative-lookahead guard");
  assert.equal(rels[0].verb, "has arrived");
});

test("DR5 off, on the SAME material: byte-identical to a caller that never opted in", () => {
  const text = "Member States have pledged themselves to achieve the promotion.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Member States"], minSurfaces: 1 });
  assert.deepEqual([...verbs], ["have"]);
  const rels = extractRelations(text, { verbs });
  assert.equal(rels[0].verb, "have");
  assert.match(rels[0].object, /^pledged themselves/);
});

// A real bug, found live against Alice's Adventures in Wonderland
// (live_priors/goldens/reading): unconditionally skipping every aux/modal
// occurrence, with no fallback, silently dropped a BARE COPULA reading
// from the vocabulary whenever nothing verb-like happened to follow it —
// "There was nothing so very remarkable in that" never nominated "was" at
// all under the first cut of phrasalPredicates, losing an edge the
// pre-DR5 pipeline correctly found. Fixed by tallying the aux word ITSELF
// as an additional candidate, never instead of continuing to look past it.
test("DR5 on: a bare copula (the aux word itself is the clause's own main verb) is still nominated as a candidate — nomination and gating are separate concerns", () => {
  const text = "There was nothing so very remarkable in that.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["There"], minSurfaces: 1, phrasalPredicates: true });
  // "nothing" is ALSO nominated here (whatever follows an aux is tallied
  // too, exactly as it always was) — that ambiguity is real callers'
  // posPrior gate's job to resolve (a pronoun/quantifier is essentially
  // never verb-dominant in a real treebank), not this function's; this
  // test only pins that the bare copula reading is not lost outright.
  assert.ok(verbs.has("was"), "the aux, with nothing verb-like following it in real material, must still be admitted as a candidate");
});

test("DR5 on: extractRelations, handed a vocabulary where the aux IS the only real verb, extracts the bare copula correctly (isolates the downstream extraction from discoverRelationVocab's own nomination noise)", () => {
  const text = "There was nothing so very remarkable in that.";
  const rels = extractRelations(text, { verbs: new Set(["was"]), phrasalPredicates: true });
  assert.equal(rels.length, 1);
  assert.equal(rels[0].verb, "was");
});

// ── DR4: whole-NP subjects ────────────────────────────────────────────────

test("DR4 off (default): the subject stays the bare 1-2 token anchor, byte-identical to before", () => {
  const text = "The peoples of the United Nations have reaffirmed their faith.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["United Nations"], minSurfaces: 1, phrasalPredicates: true });
  const rels = extractRelations(text, { verbs, phrasalPredicates: true });
  assert.equal(rels[0].subject, "United Nations");
  assert.equal(rels[0].subjectOffset, text.indexOf("United Nations"));
});

test("DR4 on: expands left through a genitive PP chain to the true outer determiner ('the peoples OF THE United Nations')", () => {
  const text = "The peoples of the United Nations have reaffirmed their faith.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["United Nations"], minSurfaces: 1, phrasalPredicates: true });
  const rels = extractRelations(text, { verbs, phrasalPredicates: true, nounPhraseSubjects: true });
  assert.equal(rels[0].subject, "The peoples of the United Nations");
  assert.equal(rels[0].subjectOffset, 0);
});

test("DR4 on: a bare-plural subject with no determiner at all is admitted at its widest content-word span, never refused", () => {
  const text = "Disregard and contempt for human rights have resulted in barbarous acts.";
  // The anchor marks "rights" — the 1-2 raw tokens MATCHER will actually
  // capture sit immediately before the verb regardless of where a caller's
  // referent surface was found; DR4's own job is recovering the REST of
  // the NP by walking backward from wherever that raw capture lands.
  const anchorIdx = text.indexOf("rights");
  const { verbs } = discoverRelationVocab(text, { surfaces: [], minSurfaces: 1, phrasalPredicates: true, anchorSpans: [{ index: anchorIdx, length: "rights".length, anchor: "rights-anchor" }] });
  const rels = extractRelations(text, { verbs, phrasalPredicates: true, nounPhraseSubjects: true });
  assert.equal(rels.length, 1);
  assert.equal(rels[0].subject, "Disregard and contempt for human rights", "no determiner anywhere — the whole coordinated bare-NP is the correct widest span");
});

test("DR4 on: expansion never crosses a comma into the previous clause", () => {
  const text = "After the ceremony, the delegation departed quickly.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["the delegation"], minSurfaces: 1 });
  const rels = extractRelations(text, { verbs, nounPhraseSubjects: true });
  assert.equal(rels.length, 1);
  assert.ok(!rels[0].subject.includes("ceremony"), `must not cross the comma: got "${rels[0].subject}"`);
  assert.equal(rels[0].subject, "the delegation");
});

test("DR4 on: a dangling coordinator with nothing behind it is left unconsumed", () => {
  const text = "And the council convened promptly.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["the council"], minSurfaces: 1 });
  const rels = extractRelations(text, { verbs, nounPhraseSubjects: true });
  assert.equal(rels[0].subject, "the council", "\"And\" opens the sentence with nothing before it to coordinate — must not be swallowed");
});

test("expandSubjectNP directly: returns null when nothing wider exists", () => {
  const text = "Elizabeth smiled.";
  const anchorStart = text.indexOf("Elizabeth");
  const anchorEnd = anchorStart + "Elizabeth".length;
  const result = expandSubjectNP(text, anchorStart, anchorEnd, 0, {});
  assert.equal(result, null);
});

// A real bug, found live against the UDHR preamble (a fronted adverbial
// between an auxiliary and its main verb — "have IN THE CHARTER
// reaffirmed" — leaves MATCHER's own bare anchor sitting on "the Charter",
// nowhere near the true subject; widening blindly from there walked the
// WHOLE preceding clause, "have"/"in" included, as if they were ordinary
// NP-internal words). expandSubjectNP must refuse rather than fabricate a
// wider-but-wrong span the moment the walk crosses an auxiliary verb.
test("expandSubjectNP directly: refuses to widen across an auxiliary verb rather than walking into the predicate", () => {
  const text = "the peoples of the United Nations have in the Charter reaffirmed their faith";
  const anchorStart = text.indexOf("the Charter");
  const anchorEnd = anchorStart + "the Charter".length;
  const result = expandSubjectNP(text, anchorStart, anchorEnd, 0, {});
  assert.equal(result, null, "must refuse, not return \"the peoples of the United Nations have in the Charter\"");
});

test("DR4 on, end to end: the same UDHR sentence never widens across the auxiliary — subject stays the narrow (imperfect) anchor rather than swallowing the whole clause", () => {
  const text = "Whereas the peoples of the United Nations have in the Charter reaffirmed their faith in fundamental human rights.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Charter"], minSurfaces: 1 });
  const rels = extractRelations(text, { verbs, nounPhraseSubjects: true });
  assert.equal(rels.length, 1);
  assert.equal(rels[0].subject, "the Charter", "widening refused — the raw (imperfect) anchor is kept rather than a fabricated wider span");
});

// ── Both DR4 and DR5 together (the real golden shape) ────────────────────

test("DR4+DR5 together: the UDHR's own flagship sentence resolves correctly end to end", () => {
  const text = "The peoples of the United Nations have determined to promote social progress.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["United Nations"], minSurfaces: 1, phrasalPredicates: true });
  const rels = extractRelations(text, { verbs, phrasalPredicates: true, nounPhraseSubjects: true });
  assert.equal(rels.length, 1);
  assert.equal(rels[0].subject, "The peoples of the United Nations");
  assert.equal(rels[0].verb, "have determined");
  assert.match(rels[0].object, /^to promote/);
});

// ── collapseWs: a hard-wrapped line break surviving verbatim into a captured
// span, found live at corpus scale (live_priors' own DR45-AT-SCALE-RESULTS.md
// — a 1.56% baseline rate of raw newlines in captured subject/object text,
// more than TRIPLED to 5.01% by DR4's own wider walk covering more ground
// where a hard wrap could occur). The bytes matched are unchanged; only how
// the captured text reads is — the same sentence's own citation span (built
// from splitSentences) already read as clean prose with an ordinary space,
// while the subject/object capture leaked the raw `\n` straight through. ──

test("collapseWs: a hard Gutenberg line break inside the base (non-DR4) subject capture reads as an ordinary space, never a raw newline", () => {
  const text = "During his official career\nFlorence was free from external threats.";
  const rels = extractRelations(text, { verbs: new Set(["was"]) });
  assert.equal(rels.length, 1);
  assert.equal(rels[0].subject, "career Florence");
  assert.ok(!rels[0].subject.includes("\n"), "subject must never carry a raw newline");
});

test("collapseWs: DR4's wider expandSubjectNP walk collapses a MULTI-CHARACTER internal whitespace run (a hard-wrap plus leading indentation) to a single space — a real length mismatch between the raw and collapsed text, the exact case that would expose an anchorEnd computed from the collapsed string's own (shorter) length instead of the raw match", () => {
  const text = "During his official career\n   Florence was free from external threats.";
  const rels = extractRelations(text, { verbs: new Set(["was"]), nounPhraseSubjects: true });
  assert.equal(rels.length, 1);
  assert.equal(rels[0].subject, "his official career Florence", "the 4-char whitespace run collapses to one space");
  assert.ok(!rels[0].subject.includes("\n"), "widened subject must never carry a raw newline");
  // The raw text's "his" starts where "During " ends (index 8) — if anchorEnd
  // were derived from subject.length (the COLLAPSED, shorter string) rather
  // than the raw match's own end (subjEnd), the widened span would undershoot
  // by exactly the 3 characters collapsing removed, and this slice would read
  // "s of" or similar garbage instead of "his".
  assert.equal(text.slice(rels[0].subjectOffset, rels[0].subjectOffset + 3), "his");
});

// ── ReDoS safety — this file's own two-incident history demands this, not optional ──

test("ReDoS: dense aux/negation vocabulary with no matching verb resolves in single-digit milliseconds, both flag states", () => {
  const words = ["the", "a", "did", "not", "never", "would", "could", "should", "have", "has", "had", "will", "John", "Mary", "of", "and", "or"];
  let text = "";
  for (let i = 0; i < 6000; i += 1) text += `${words[i % words.length]} `;
  text += ".";
  for (const phrasalPredicates of [false, true]) {
    const t0 = Date.now();
    extractRelations(text, { verbs: new Set(["nonexistentverb123"]), phrasalPredicates, nounPhraseSubjects: true });
    const elapsed = Date.now() - t0;
    assert.ok(elapsed < 500, `phrasalPredicates=${phrasalPredicates} took ${elapsed}ms — real ReDoS risk`);
  }
});

test("ReDoS: a long aux/negation run between subject and a real match at the far end still resolves fast", () => {
  const words = ["did", "not", "never", "would", "could", "should", "have", "has", "had", "will"];
  let text = "John ";
  for (let i = 0; i < 6000; i += 1) text += `${words[i % words.length]} `;
  text += "arrived.";
  const t0 = Date.now();
  extractRelations(text, { verbs: new Set(["arrived"]), phrasalPredicates: true });
  const elapsed = Date.now() - t0;
  assert.ok(elapsed < 500, `took ${elapsed}ms`);
});

// ── \b generalized past ASCII — found running real fetched Война и мир prose ──
//
// discoverRelationVocab's SURFACE_RE (and negationBeforeVerbFor's, and
// OBJECT_GROUP's / AUX_GROUP_RE's / SUBJECT_SECOND_GUARD's function-word
// boundaries) used `\b`, and JS's `\b` is ASCII-\w-only with no Unicode mode
// — a surface written entirely in a non-Latin script can never be located,
// regardless of recurrence, so zero candidates were ever nominated for it.
// Confirmed live (live_priors/11-multi-language/war-and-peace/ru/), then
// isolated here: NOT case declension (a flat, undeclined, exactly-repeated
// Cyrillic surface fails identically), NOT one script's own quirk (Greek,
// Hebrew, Armenian all reproduce it independently), and NOT anything about
// recurrence itself (the same construction on the same text minus \b works).

test("Cyrillic: a recurring, grammatically-inflected Russian name nominates real verbs — the exact measured defect", () => {
  const text = "Анна Павловна кашляла несколько дней. Анна Павловна улыбнулась князю Василию. Князь Василий поцеловал руку Анны Павловны.";
  const { verbs, candidates } = discoverRelationVocab(text, { surfaces: ["Анна Павловна", "Князь Василий"], minSurfaces: 1 });
  assert.ok(verbs.has("кашляла"), `expected "кашляла" among nominated verbs, got: ${candidates.map((c) => c.verb).join(", ")}`);
  assert.ok(verbs.has("улыбнулась"));
  assert.ok(verbs.has("поцеловал"));
  const rels = extractRelations(text, { verbs });
  assert.equal(rels.length, 3);
  assert.equal(rels[0].subject, "Анна Павловна");
  assert.equal(rels[0].verb, "кашляла");
});

test("Cyrillic: recurrence alone (no case declension in play) used to fail identically — confirms the cause was \\b, not morphology", () => {
  // Every mention is the exact same undeclined string, on purpose — if the
  // defect were about Russian's grammatical case system fragmenting surface
  // identity, holding the surface FIXED would route around it. It does not
  // change the outcome, because the surface can never be located at all.
  const text = "Анна Павловна говорила. Анна Павловна кашляла. Анна Павловна улыбнулась.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Анна Павловна"], minSurfaces: 1 });
  assert.ok(verbs.size >= 2, `expected real candidates from an exactly-recurring Cyrillic surface, got ${verbs.size}`);
});

test("cross-script generality: Greek and Hebrew — unrelated scripts, unrelated language families, same mechanism", () => {
  const greek = "Ελένη μίλησε. Ελένη γέλασε. Ελένη έφυγε.";
  const { verbs: gv } = discoverRelationVocab(greek, { surfaces: ["Ελένη"], minSurfaces: 1 });
  assert.ok(gv.size >= 2, `Greek: expected candidates, got ${gv.size}`);

  const hebrew = "דוד דיבר. דוד צחק. דוד הלך.";
  const { verbs: hv } = discoverRelationVocab(hebrew, { surfaces: ["דוד"], minSurfaces: 1 });
  assert.ok(hv.size >= 2, `Hebrew: expected candidates, got ${hv.size}`);
});

test("negationBeforeVerbFor: a non-Latin-script injected negation prior is now findable too (this file's own documented use case — a vendored lang/xx.json need not be ASCII, e.g. a real Russian NegationPrior@1 fronting «не»)", () => {
  const text = "Анна Павловна не любила Наполеона.";
  const cyrillicNegation = new Set(["не"]);
  // Mirrors the file's own established "DR5 on" pattern above: phrasalPredicates
  // lets discovery skip past the negation word to the real content verb, and
  // negationWords must be injected at BOTH calls, exactly as a real caller
  // threads one language's own vendored prior through the whole ladder. The
  // clause is transitive (an object follows) — extractRelations' own SVO
  // shape has no path for an intransitive clause, in any language, and that
  // is unrelated to what this test is isolating.
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Анна Павловна"], minSurfaces: 1, phrasalPredicates: true, negationWords: cyrillicNegation });
  assert.ok(verbs.has("любила"), `expected "любила" nominated past the Cyrillic negation word, got: ${[...verbs].join(", ")}`);
  const rels = extractRelations(text, { verbs, phrasalPredicates: true, negationWords: cyrillicNegation });
  assert.equal(rels.length, 1);
  assert.equal(rels[0].verb, "не любила");
  assert.equal(rels[0].object, "Наполеона");
  assert.equal(rels[0].polarity, "-", "the injected Cyrillic negation word must be found before the verb, not silently missed by an ASCII-only \\b");
});

test("byte-identical for ASCII: the fix changes nothing about existing English extraction", () => {
  const text = "Prince Vasili spoke languidly. Anna Pavlovna smiled warmly.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Prince Vasili", "Anna Pavlovna"], minSurfaces: 1 });
  assert.deepEqual([...verbs].sort(), ["smiled", "spoke"]);
  const rels = extractRelations(text, { verbs });
  assert.deepEqual(rels.map((r) => [r.subject, r.verb, r.object]), [
    ["Prince Vasili", "spoke", "languidly"],
    ["Anna Pavlovna", "smiled", "warmly"],
  ]);
});
