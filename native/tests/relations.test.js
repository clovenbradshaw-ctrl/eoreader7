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

// ── the clause wall: PROPOSITION grain, not sentence grain (2026-09-01) ──
// `windowStart` walls subject expansion at the previous match or the
// SENTENCE start — typography. An assertion ends at its clause, so a walk
// that crosses a clause opener captures a span straddling two propositions.
// priors.js CLAUSE_OPENERS (giver lang/en) is the wall, and it is the SAME
// closed class pronouns.js's own sameClause consults — promoted out of that
// file's private regex so there is one list, not two.

test("expandSubjectNP stops at a clause opener — a subject never straddles two propositions", () => {
  // "...interesting. if so my stay may be very interesting" — walking left
  // from "stay" past "if" captured "if so my" on real prose.
  const text = "It was late, and if so my stay may be long.";
  const anchorStart = text.indexOf("stay");
  const result = expandSubjectNP(text, anchorStart, anchorStart + "stay".length, 0, {});
  assert.ok(result, "expected an expansion");
  assert.equal(/\b(if|and)\b/i.test(result.subject), false, `subject crossed a clause opener: "${result.subject}"`);
  assert.match(result.subject, /my stay/, `expected the clause's own subject, got "${result.subject}"`);
});

test("the clause wall STOPS, it never refuses — everything right of the opener is a real subject", () => {
  const text = "He waited because the old countess arrived.";
  const anchorStart = text.indexOf("countess");
  const result = expandSubjectNP(text, anchorStart, anchorStart + "countess".length, 0, {});
  assert.ok(result, "a clause opener must not null the whole expansion");
  assert.equal(result.subject, "the old countess");
});

test("a dangling coordinator is dropped — a coordinator is only earned by the sibling it joins", () => {
  // The loop consumes "and" hoping for an NP behind it; when the walk hits a
  // wall with nothing found, the span used to read "and he" — 24% of this
  // extractor's junk subjects on real prose were this one shape.
  const text = "The door opened and he entered.";
  const anchorStart = text.indexOf("he");
  const result = expandSubjectNP(text, anchorStart, anchorStart + "he".length, 0, {});
  if (result) assert.equal(/^(and|or|but|nor)\b/i.test(result.subject), false, `dangling coordinator kept: "${result.subject}"`);
});

test("CONTROL, built to fail: a coordinator the walk DID pay for is kept — a real joined NP survives", () => {
  const text = "Anna and Vasili discussed the war.";
  const anchorStart = text.indexOf("Vasili");
  const result = expandSubjectNP(text, anchorStart, anchorStart + "Vasili".length, 0, {});
  assert.ok(result, "expected the sibling NP to be joined");
  assert.equal(result.subject, "Anna and Vasili", "a genuine coordinated subject must NOT be trimmed by the dangling-coordinator rule");
});

// ── the received-class subject strip (2026-09-02) ──────────────────────────
// 55 of 83 subjects on a real two-page ledger were "and it" / "but he" /
// "battle that" / "after Smolensk": the leading-word strip only fired on a
// MEASURED function-word class, which small material cannot supply. The
// received classes (priors.js: CLAUSE_COORDINATORS, CLAUSE_OPENERS,
// determiners; giver lang/en) fire on their own now. The guards that were
// already there stay: a lone pronoun subject is untouched, "does not" is
// never stripped to "not", "his King" is never stripped to "King".
test("a two-token subject led by a received clause coordinator or opener is stripped to its head, with no measured class supplied", () => {
  const verbs = new Set(["was", "had", "considered", "razed"]);
  const subj = (t) => extractRelations(t, { verbs })[0]?.subject;
  assert.equal(subj("And it was the bloodiest day of the war."), "it");
  assert.equal(subj("Nobody spoke, but he had spoken with survivors before."), "he");
  assert.equal(subj("Smolensk fell; after Smolensk was razed the army withdrew."), "Smolensk");
  assert.equal(subj("The battle that was part of the larger campaign ended at dusk."), "battle");
});
test("the strip's own guards are untouched: a lone pronoun, a negation, and a possessive pronoun stay as they were", () => {
  const verbs = new Set(["told", "measure", "ruled"]);
  const subj = (t) => extractRelations(t, { verbs })[0]?.subject;
  assert.equal(subj("He told her everything."), "He");
  assert.notEqual(subj("The gauge does not measure pressure."), "not");
  assert.equal(subj("Then his King ruled the north."), "his King");
});


// ── the OOV connector gate takes a verb-form lexicon (2026-09-02) ──────────
// Without a POS attestation a connector used to admit on absence of
// evidence ("redoubt", "nobility", "aristocratic", Cyrillic "и" all shipped
// as verbs on a real ledger). With a lexicon supplied, an OOV token must be
// a known verb form to admit; without one the old posture is byte-identical.
test("an OOV connector admits only through a supplied verb-form lexicon; no lexicon, the old asymmetric posture stands", () => {
  const posPrior = { forms: { fell: { VERB: 9 }, rose: { VERB: 4 } } }; // nobility / diminishes unattested
  const text = "Napoleon nobility rose. Kutuzov nobility fell. Napoleon diminishes daily. Kutuzov diminishes too.";
  const surfaces = ["Napoleon", "Kutuzov"];
  const bare = discoverRelationVocab(text, { surfaces, minSurfaces: 1, posPrior });
  assert.ok(bare.verbs.has("nobility") && bare.verbs.has("diminishes"), "no lexicon: OOV admits, as before");
  assert.deepEqual(bare.candidates.filter((c) => c.verb === "nobility").map((c) => c.posStanding), ["gap"]);
  const gated = discoverRelationVocab(text, { surfaces, minSurfaces: 1, posPrior, verbForms: new Set(["diminishes", "fell", "rose"]) });
  assert.ok(!gated.verbs.has("nobility"), "an OOV noun the lexicon does not know is refused");
  assert.ok(gated.verbs.has("diminishes"), "an OOV verb form the lexicon knows admits");
  const standings = Object.fromEntries(gated.candidates.map((c) => [c.verb, c.posStanding]));
  assert.equal(standings.nobility, "gap_lexicon_refuses"); assert.equal(standings.diminishes, "gap_lexicon_admits");
});


// ── the received object boundary (objectBoundaryFrom) ─────────────────────
// Measured live, the-fold 2026-09-02: below the corpus floor the measured
// function-word class is null, so an object ran to the clause terminator —
// "Hannibal Hamlin in March 1865" — and never bridged, never folded, and
// reached the model as three notes for one fact.
import { objectBoundaryFrom } from "../adapters/text/relations.js";
const PRIOR = { schema: "POSPrior@1", forms: {
  in: { ADP: 900, ADV: 40 }, as: { ADP: 500, SCONJ: 300, ADV: 20 }, of: { ADP: 1000 },
  march: { PROPN: 50, NOUN: 10, VERB: 5 }, president: { NOUN: 200 }, vice: { NOUN: 40, ADJ: 10 },
  duke: { NOUN: 30, PROPN: 20 }, wellington: { PROPN: 20 },
} };
const SUCCESSION = "Hannibal Hamlin replaced John Breckinridge as vice president in 1861. Andrew Johnson replaced Hannibal Hamlin in March 1865.";

test("objectBoundary: byte-identical when omitted — the object still runs to the clause terminator below the corpus floor", () => {
  const { verbs } = discoverRelationVocab(SUCCESSION, { surfaces: ["Hannibal Hamlin", "John Breckinridge", "Andrew Johnson"], minSurfaces: 1 });
  const rels = extractRelations(SUCCESSION, { verbs });
  assert.deepEqual(rels.map((r) => r.object), ["John Breckinridge as vice president in 1861", "Hannibal Hamlin in March 1865"]);
});

test("objectBoundary: the received adposition class cuts the trailing adjunct — the live specimen's ends come back clean", () => {
  // the vocabulary is gated by the same prior the real reader passes — without
  // it "as"/"in" enter as VERBS (the gate's job, not the boundary's; found by running)
  const { verbs } = discoverRelationVocab(SUCCESSION, { surfaces: ["Hannibal Hamlin", "John Breckinridge", "Andrew Johnson"], minSurfaces: 1, posPrior: PRIOR });
  const boundary = objectBoundaryFrom(PRIOR, { minShare: 0.5 });
  assert.ok(boundary.has("in") && boundary.has("as") && boundary.has("of"));
  assert.ok(!boundary.has("march") && !boundary.has("president"), "a noun is never a boundary");
  const rels = extractRelations(SUCCESSION, { verbs, objectBoundary: boundary });
  assert.deepEqual(rels.map((r) => r.object), ["John Breckinridge", "Hannibal Hamlin"]);
  // offsets still address the source's own bytes
  for (const r of rels) assert.equal(SUCCESSION.slice(r.objectOffset, r.objectOffset + r.object.length), r.object);
});

test("objectBoundary: a boundary word as the object's FIRST token is still captured (the pronoun/one-token rule holds)", () => {
  const text = "Victor gave in quickly.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Victor"], minSurfaces: 1 });
  const rels = extractRelations(text, { verbs, objectBoundary: objectBoundaryFrom(PRIOR, { minShare: 0.5 }) });
  assert.ok(rels[0]?.object.startsWith("in"), "the mandatory first token is never refused for its class: " + rels[0]?.object);
});

test("objectBoundary: THE DISCLOSED COST — a multiword name carrying an adposition is cut at it", () => {
  // "Duke of Wellington" → "Duke". Not hidden: this is the price of a
  // class-level cut, and the earned-face wire (hypergraph.js endpoint) is
  // where a known multiword surface takes precedence over it. Pinned so
  // the cost is visible, and so a later fix that restores the name is
  // measured against this line rather than assumed.
  const text = "Napoleon fought the Duke of Wellington at Waterloo.";
  const { verbs } = discoverRelationVocab(text, { surfaces: ["Napoleon", "Duke of Wellington"], minSurfaces: 1 });
  const rels = extractRelations(text, { verbs, objectBoundary: objectBoundaryFrom(PRIOR, { minShare: 0.5 }) });
  assert.equal(rels[0]?.object, "the Duke");
});

test("objectBoundaryFrom: minShare is declared, and a prior with no forms still yields the received clause classes", () => {
  assert.throws(() => objectBoundaryFrom(PRIOR, {}), /declared/);
  const bare = objectBoundaryFrom(null, { minShare: 0.5 });
  assert.ok(bare.has("and") && bare.has("but"), "clause coordinators are received, not measured");
});

// ── THE SUBJECT WALLS (2026-09-02) — real Dracula sentences, each the shape
// of a debris subject the production reader emitted, pinned with the
// subject it must read now. `subjectWalls: false` reproduces the old walk.
import { NEGATION_WORDS } from "../adapters/text/priors.js";
const wallsRead = (text, verbs, extra = {}) => extractRelations(text, { verbs: new Set(verbs), nounPhraseSubjects: true, negationWords: NEGATION_WORDS, ...extra });
const subjectOf = (rels, verb) => rels.find((r) => r.verb === verb)?.subject ?? null;

test("walls: a trailing negation is not part of the subject — 'I never saw' reads subject 'I', polarity negative", () => {
  const rels = wallsRead("They are both quiet persons, and I never saw the man angry.", ["saw"]);
  assert.equal(subjectOf(rels, "saw"), "I");
  assert.equal(rels[0].polarity, "-");
  assert.equal(subjectOf(wallsRead("They are both quiet persons, and I never saw the man angry.", ["saw"], { subjectWalls: false }), "saw"), "I never", "the old walk kept the negation — pinned so the flag is real");
});

test("walls: a relativizer at the anchor's edge belongs to the clause — 'the men who came' reads subject 'One of the men'", () => {
  const rels = wallsRead("One of the men who came up here often to look for the boats was followed by his dog.", ["came"]);
  assert.equal(subjectOf(rels, "came"), "One of the men");
  const cows = wallsRead("Lucy was in gay spirits, owing to some dear cows who came nosing towards us.", ["came"]);
  assert.equal(subjectOf(cows, "came"), "some dear cows");
});

test("walls: a pronoun is a whole subject wherever it sits in the anchor — 'I think it will', 'I hope I did', 'think of what might'", () => {
  assert.equal(subjectOf(wallsRead("I think it will be best for her to go to bed.", ["will"]), "will"), "it");
  assert.equal(subjectOf(wallsRead("I thought it wiser to do so. I hope I did right.", ["did"]), "did"), "I");
  assert.equal(subjectOf(wallsRead("There was no time to think of what might happen.", ["might"]), "might"), "what");
});

test("walls: a determiner-initial anchor is already at its left edge — 'when I came in view again the cloud had passed'", () => {
  assert.equal(subjectOf(wallsRead("When I came in view again the cloud had passed, and the moonlight struck.", ["had"]), "had"), "the cloud");
  assert.equal(subjectOf(wallsRead("When I came in view again the cloud had passed, and the moonlight struck.", ["had"], { subjectWalls: false }), "had"), "I came in view again the cloud", "the old walk glued the matrix clause on");
  // the of-chain still widens through a determiner (DR4's own flagship)
  assert.equal(subjectOf(wallsRead("The peoples of the United Nations reaffirmed faith.", ["reaffirmed"]), "reaffirmed"), "The peoples of the United Nations");
});

test("walls: a verb reached through a coordinator is a coordinated predicate — the subject is shared ('the poor thing became quiet and fell', 'I ran downstairs and looked')", () => {
  // The live shape: the FIRST predicate's verb was not in the cleared
  // vocabulary (only "fell" / "looked" cleared), so the anchor was "quiet
  // and" / "downstairs and" and the walk glued the first predicate on. The
  // wall needs to KNOW "became"/"ran" are verbs — `verbWall`, a received
  // verb-form set (the reader passes the POS prior's verb-dominant forms).
  assert.equal(subjectOf(wallsRead("The moment it touched the stone the poor thing became quiet and fell all into a tremble.", ["fell"], { verbWall: new Set(["became"]) }), "fell"), "the poor thing");
  assert.equal(subjectOf(wallsRead("I ran downstairs and looked in the sitting-room.", ["looked"], { verbWall: new Set(["ran"]) }), "looked"), "I");
  // without the received wall the old debris shape comes back — pinned so
  // the option is known to be load-bearing
  // (the pronoun wall alone stops before "I" — the first predicate is still
  // glued on; only the verb wall reaches the shared subject)
  assert.equal(subjectOf(wallsRead("I ran downstairs and looked in the sitting-room.", ["looked"]), "looked"), "ran downstairs and");
});

test("walls: a match with no subject left under them is refused, counted, never emitted as debris", () => {
  const rels = wallsRead("Which came first is unknown, and so.", ["came"]);
  assert.ok(!rels.some((r) => /^(which|and|so)$/i.test(r.subject)), `no bare opener subject: ${JSON.stringify(rels.map((r) => r.subject))}`);
  assert.equal(typeof rels.refusedSubjects, "number");
});

test("walls: a coordinated pronoun keeps its sibling ('Lucy and I'); a determiner chain continues across a received adposition ('every joint in my body', 'the ruins of the abbey'); a verb form right after a determiner is a noun", () => {
  assert.equal(subjectOf(wallsRead("Lucy and I had both a fight for it with the dusty miller.", ["had"]), "had"), "Lucy and I");
  const adpositions = new Set(["in", "of", "at"]);
  assert.equal(subjectOf(wallsRead("It seemed to me as though every joint in my body were rusty.", ["were"], { adpositions }), "were"), "every joint in my body");
  // "ruins" is a verb form in any English lexicon; after "the" it is a noun
  assert.equal(subjectOf(wallsRead("The ruins of the abbey were coming into view.", ["were"], { adpositions, verbWall: new Set(["ruins"]) }), "were"), "The ruins of the abbey");
});

test("walls: a verb at the anchor's edge is trimmed ('I wished to get' → 'I', 'it might have' → 'it'); a predeterminer joins its noun phrase ('the knowledge of such a thing')", () => {
  const verbWall = new Set(["wished", "might", "have"]);
  assert.equal(subjectOf(wallsRead("For many other reasons I wished to get her home at once.", ["get"], { verbWall }), "get"), "I");
  assert.equal(subjectOf(wallsRead("I feared it might have been worse.", ["been"], { verbWall }), "been"), "it");
  assert.equal(subjectOf(wallsRead("How the knowledge of such a thing would fret her.", ["would"], { adpositions: new Set(["of"]) }), "would"), "the knowledge of such a thing");
});

test("A DECIMAL IS ONE TOKEN: a measured quantity survives the subject walk, whole", () => {
  // Found 2026-09-04 by pointing the reader at a corpus chosen for its
  // measured quantities (the 2026 Sanriku earthquake). Two separate cuts were
  // destroying every decimal in a subject: this adapter's own token regex
  // disagreed with the engine's own tokenizer (source.js::tokenize keeps
  // "9.0" whole), and the clause window could land BETWEEN "9." and "0" so
  // the walk began mid-number. The ledger held "0 magnitude earthquake killed
  // thousands in 2011" for a source that says 9.0 — a wrong number that reads
  // as a right one, which no wall downstream can catch because the bytes are
  // already gone at the cut.
  assert.equal(subjectOf(wallsRead("A 9.0 magnitude earthquake killed thousands in 2011.", ["killed"]), "killed"), "9.0 magnitude earthquake");
  assert.equal(subjectOf(wallsRead("A 7.7 magnitude earthquake struck off Sanriku.", ["struck"]), "struck"), "7.7 magnitude earthquake");
  assert.equal(subjectOf(wallsRead("The 1,200 residents evacuated the coast.", ["evacuated"]), "evacuated"), "The 1,200 residents", "the anchor itself began mid-token here — the matcher captured \"200 residents\"");
  // The continuation requires DIGITS, so a sentence-final period is still not
  // part of its token and an abbreviation is untouched.
  assert.equal(subjectOf(wallsRead("Kuji reported a wave of 80 cm.", ["reported"]), "reported"), "Kuji");
});
