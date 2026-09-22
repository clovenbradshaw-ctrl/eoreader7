// node --test grounding.test.mjs

import { test } from "node:test";

// Measured live on War and Peace, 2026-08-16: retrieval folds diacritics and
// found the right chapters; the grounding index did not fold, so "Pierre
// Bezukhov" and "Helene" — both plainly in the retrieved bytes as Bezúkhov
// and Hélène — were flagged "not in the material". The fold now runs on both
// sides of every containment — and the fold is only the orthographic slice
// of the real principle, tested next: names point to REFERENTS.
test("names resolve against the material's own cast, via the engine's organs", async () => {
  const { makeCastResolver } = await import("./cast.js");
  const { checkGrounding } = await import("./grounding.js");
  // The REAL organs, not stand-ins — what counts as "the same name" must be
  // the engine's own answer, or discovery and support drift apart.
  const { splitSentences } = await import("../adapters/text/spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(
    "../adapters/text/surfaces.js"
  );
  const castFor = makeCastResolver({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });

  const passages = [
    {
      ref: "wp.txt#0-200",
      text:
        "That evening Pierre Bezúkhov spoke first. Later Pierre Bezúkhov rose, and the whole table turned. " +
        "No one interrupted Pierre Bezúkhov again.",
    },
  ];
  const resolveName = castFor(passages);

  // Sub-forms of an established name resolve to its referent: the passage
  // establishes "Pierre Bezúkhov"; the surname alone and the given name
  // alone both point at that referent, by the engine's own coreference.
  assert.equal(resolveName("Bezukhov"), true);
  assert.equal(resolveName("Pierre"), true);
  assert.equal(resolveName("Pierre Bezukhov"), true);

  // Support is ASYMMETRIC where coreference is not: an answer may not
  // EXTEND an established name with tokens the material never wrote — the
  // extension would be model-supplied content wearing a resolved name.
  const onlyPierre = castFor([{ ref: "x#0-9", text: "Then Pierre spoke. Then Pierre rose. Then Pierre left." }]);
  assert.equal(onlyPierre("Pierre"), true);
  assert.equal(onlyPierre("Pierre Bezukhov"), false, "the surname was never in the material");

  // The abbreviated form points at the referent — "Pierre B." resolves where
  // "Pierre Bezúkhov" is established — but an initial is not a stem: material
  // writing ONLY "Pierre B." must not support the full surname it never wrote.
  assert.equal(resolveName("Pierre B."), true);
  const onlyInitial = castFor([{ ref: "y#0-9", text: "Then Pierre B. spoke. Then Pierre B. rose. Then Pierre B. left." }]);
  assert.equal(onlyInitial("Pierre B."), true);
  assert.equal(onlyInitial("Pierre"), true);
  assert.equal(onlyInitial("Pierre Bezukhov"), false, "a bare initial cannot cover a surname");

  // Rescue, never veto: an unknown name resolves to nothing and the byte
  // check's finding stands.
  assert.equal(resolveName("Countess Marlborough"), false);
  const invented = checkGrounding("Countess Marlborough spoke first.", passages, { resolveName });
  assert.equal(invented.clean, false);

  // Through checkGrounding: possessive form of an established name, clean.
  const possessive = checkGrounding("Bezukhov's words carried.", passages, { resolveName });
  assert.equal(possessive.clean, true, JSON.stringify(possessive.findings));
});

test("a question-echoed name stays out of the record's unsupported list", async () => {
  const { checkGrounding, unsupportedClaims } = await import("./grounding.js");
  const passages = [{ ref: "n.txt#0-40", text: "The prisoners marched east through the night." }];
  const report = checkGrounding("The prisoners marched beside Karataev nightly.", passages, {
    question: "What was Karataev's role among the prisoners?",
  });
  // The finding exists — the stripe can draw it — but the record line does not.
  assert.ok(report.findings.some((f) => /Karataev/.test(f.text) && f.echoesQuestion));
  assert.ok(!unsupportedClaims(report).some((l) => /Karataev/.test(l)));
  // A name NOBODY supplied still reaches the record.
  const invented = checkGrounding("They followed Marlborough east.", passages, { question: "who marched?" });
  assert.ok(unsupportedClaims(invented).some((l) => /Marlborough/.test(l)));
});

test("headings are structure, not claims — but a name in a body sentence still is", async () => {
  const { checkGrounding } = await import("./grounding.js");
  const passages = [{ ref: "n.txt#0-50", text: "The committee met on the quay and adjourned early." }];
  const answer =
    "## Clash of Ideals\n\n**A Catalyst:**\n\n**Her Reaction:** the committee met on the quay. " +
    "Isn't that early? Countess Marlborough adjourned it.";
  const report = checkGrounding(answer, passages, {});
  const flagged = report.findings.map((f) => f.text);
  assert.ok(!flagged.some((t) => /Clash|Catalyst/.test(t)), `heading furniture flagged: ${flagged}`);
  assert.ok(!flagged.some((t) => /Reaction/.test(t)), "line-initial bold heading with trailing prose is furniture too");
  assert.ok(!flagged.some((t) => /Isn/.test(t)), "a capitalized contraction is grammar, never a name");
  assert.ok(flagged.some((t) => /Marlborough/.test(t)), "the body-sentence invention must still be caught");
});

test("a list item's bold label is a heading, not a claim — the walk-through case", async () => {
  const { checkGrounding, corroborateAtoms, blankStructure } = await import("./grounding.js");
  const passages = [{ ref: "n.txt#0-45", text: "The committee met on the quay and adjourned." }];
  // The model explaining its own code (measured live, 2026-08-17): a
  // numbered or bulleted list marker in front of the bold label used to
  // defeat the line-initial heading anchor, so every label leaked through
  // as a checkable claim and the chat filled with label chips.
  const answer =
    "1. **HTML Structure:** - We create the basic layout with two buttons.\n" +
    "2. **Counter Initialization:** let count = 0 sets the initial count.\n" +
    "- **Event Listeners:** each button updates the count when clicked.";
  // blankStructure stays length-preserving — offsets must survive.
  assert.equal(blankStructure(answer).length, answer.length);
  const report = checkGrounding(answer, passages, {});
  const flagged = report.findings.map((f) => f.text);
  assert.ok(!flagged.some((t) => /HTML|Structure/.test(t)), `label flagged: ${flagged}`);
  assert.ok(!flagged.some((t) => /Counter|Initialization/.test(t)), `label flagged: ${flagged}`);
  assert.ok(!flagged.some((t) => /Event|Listeners/.test(t)), `label flagged: ${flagged}`);
  // The list marker's own digit blanks with the label — "1." is furniture,
  // never a figure.
  assert.ok(!flagged.includes("1") && !flagged.includes("2"), `marker digit flagged: ${flagged}`);
  const { atoms } = corroborateAtoms(answer, passages);
  assert.ok(
    !atoms.some((a) => /Structure|Initialization|Listeners/.test(a.text)),
    `label atoms extracted: ${atoms.map((a) => a.text)}`,
  );
});

test("a bare markup tag is structure, not a claim, even without a fence — the SVG case", async () => {
  const { checkGrounding, blankStructure } = await import("./grounding.js");
  const passages = [{ ref: "n.txt#0-45", text: "The committee met on the quay and adjourned." }];
  // Measured live (2026-08-19): asked for SVG, a small model answered with
  // bare markup — no fence, so the fenced-code-block rule never fired — and
  // the apparatus flagged its own attribute values (100, 50, 40) as
  // unsupported figures: the artifact grounding itself in its own content.
  const answer = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="red" stroke-width="2" fill="red" /></svg>';
  assert.equal(blankStructure(answer).length, answer.length);
  const report = checkGrounding(answer, passages, {});
  const flagged = report.findings.map((f) => f.text);
  assert.ok(!flagged.some((t) => ["100", "50", "40", "2"].includes(t)), `attribute value flagged: ${flagged}`);
});

test("a lone capitalized word opening a sentence is position, not namehood", async () => {
  const { checkGrounding } = await import("./grounding.js");
  const passages = [{ ref: "n.txt#0-40", text: "The column marched east before dawn broke." }];
  // "Shock" and "Anxiety" open their sentences — position. "Kutuzov" recurs
  // mid-sentence — evidence, and absent from the bytes it stays flagged.
  const report = checkGrounding(
    "Shock ran through the ranks. Anxiety followed. The men trusted Kutuzov entirely.",
    passages,
    {},
  );
  const flagged = report.findings.map((f) => f.text);
  assert.ok(!flagged.includes("Shock"));
  assert.ok(!flagged.includes("Anxiety"));
  assert.ok(flagged.includes("Kutuzov"));

  // A list marker is part of the lead: "1. Social standing…" capitalizes
  // "Social" by position, same as a sentence start.
  const listed = checkGrounding("1. Social standing mattered. 2. Rank mattered more.", passages, {});
  const listedFlags = listed.findings.map((f) => f.text);
  assert.ok(!listedFlags.includes("Social"), JSON.stringify(listedFlags));
  assert.ok(!listedFlags.includes("Rank"));
});

test("diacritics fold on both sides of the grounding check", async () => {
  const { checkGrounding } = await import("./grounding.js");
  const passages = [{ ref: "wp.txt#0-99", text: "Pierre Bezúkhov married Hélène in Petersburg." }];
  const plain = checkGrounding("Pierre Bezukhov married Helene.", passages, {});
  assert.equal(plain.clean, true, JSON.stringify(plain.findings));
  const accented = checkGrounding("Pierre Bezúkhov married Hélène.", passages, {});
  assert.equal(accented.clean, true, JSON.stringify(accented.findings));
  // An actually absent name still fails — the fold widened the alphabet, not the test.
  const invented = checkGrounding("Pierre Bezukhov married Countess Marlborough.", passages, {});
  assert.equal(invented.clean, false);
});
import assert from "node:assert/strict";

import {
  buildUnionIndex,
  checkGrounding,
  extractAtoms,
  extractCheckableAtoms,
  hasWord,
  splitSentences,
  tokenSupported,
  unsupportedClaims,
  wordSet,
} from "./grounding.js";
import { chunkSource } from "./source.js";

const DOC = `The Kessington Report was commissioned by the Marrowfen Harbour Board in 1974.

The report put the silting figure at 12 percent per decade, a number the harbour committee disputed at length.`;
const passages = chunkSource("kess.txt", DOC);

test("an answer that stays inside the material is clean", () => {
  const r = checkGrounding(
    "The report put the silting figure at 12 percent per decade.",
    passages,
  );
  assert.ok(r.examined);
  assert.ok(r.clean);
  assert.ok(r.atomsChecked > 0, "it has to have actually checked something");
});

test("an invented figure, agency and year are each caught", () => {
  const r = checkGrounding(
    "The Kessington Report gave a figure of 21 percent, and Bryan TX PD disputed it in 1982.",
    passages,
  );
  assert.equal(r.clean, false);
  const said = unsupportedClaims(r).join(" | ");
  assert.match(said, /21/);
  assert.match(said, /Bryan/);
  assert.match(said, /1982/);
  // And it does not flag what IS there.
  assert.ok(!said.includes("Kessington"));
});

test("clean and examined are different facts", () => {
  // Nothing to check against is not a clean bill of health.
  const r = checkGrounding("Anything at all, with a figure of 99.", []);
  assert.equal(r.examined, false);
  assert.equal(r.clean, true);
  assert.equal(r.findings.length, 0);
});

test("extractCheckableAtoms offers candidates even where checkGrounding rightly declines to", () => {
  // Not a contradiction of the test above: checkGrounding's `examined:
  // false` at zero passages stays exactly what it is (nothing was checked
  // against material). This is a DIFFERENT question — is there anything in
  // the answer worth offering to the web tier? — and the answer is yes: with
  // no material at all, every atom is unsupported by definition.
  const atoms = extractCheckableAtoms("The report gave a figure of 99 percent, disputed by Bryan Whitfield.");
  const texts = atoms.map((a) => a.text);
  assert.ok(texts.some((t) => t.includes("99")));
  assert.ok(texts.some((t) => t.includes("Whitfield")));
  // A name the question itself supplied is still marked as echoing it —
  // the same discipline checkGrounding's own findings carry.
  const echoing = extractCheckableAtoms("The figure was 99 percent.", { question: "what was the 99 percent figure?" });
  assert.ok(echoing.every((a) => a.echoesQuestion || !/99/.test(a.text)));
});

test("a stem counts as the word", () => {
  const words = wordSet("the committee disputed several investigations");
  assert.ok(hasWord(words, "investigation"), "a shorter stem of a longer word");
  assert.ok(hasWord(words, "dispute"), "and the other direction");
  // Prefix stemming, not lemmatisation: "disputes" and "disputed" diverge at
  // the last character, so neither contains the other and neither counts.
  assert.ok(!hasWord(words, "disputes"));
  assert.ok(!hasWord(words, "adopted"));
});

test("an abbreviation is supported by its expansion, both directions", () => {
  const spelled = buildUnionIndex([{ text: "The chief executive signed it." }]);
  assert.ok(tokenSupported(spelled, false, "CEO"));
  const abbreviated = buildUnionIndex([{ text: "The CEO signed it." }]);
  assert.ok(tokenSupported(abbreviated, false, "executive"));
});

test("a list marker is not a claim about a quantity", () => {
  const atoms = extractAtoms("1. The committee met.");
  assert.ok(!atoms.some((a) => a.kind === "number" && a.text === "1"));
});

test("a discourse adverb is not a proper name", () => {
  // "Unfortunately, the report..." — capitalised, but grammar, not a claim.
  const r = checkGrounding("Unfortunately, the report was late.", passages);
  assert.ok(r.clean, unsupportedClaims(r).join("; "));
});

test("an abbreviation ending a clause does not split the sentence", () => {
  const s = splitSentences("Dr. Smith wrote it. Then it was filed.");
  assert.equal(s.length, 2);
  assert.match(s[0].text, /^Dr\. Smith/);
});

test("a name the question supplied is marked as echoing it", () => {
  const r = checkGrounding("Bryan TX PD ran the search.", passages, {
    question: "did Bryan TX PD run a search?",
  });
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].echoesQuestion, true);
});

test("a capped report says it was capped", () => {
  const many = Array.from({ length: 60 }, (_, i) => `Agency${i} filed 90${i}.`).join(" ");
  const r = checkGrounding(many, passages);
  assert.ok(r.truncated, "a truncated report that looks complete is a lie of omission");
  assert.equal(r.findings.length, 40);
  assert.ok(r.truncated.total > 40);
});

test("row-group column names count as material", () => {
  const csv = "agency,reason,case_number\nGary IN PD,stolen vehicle,24-0011\n";
  const rows = chunkSource("a.csv", csv);
  const r = checkGrounding("The case_number column lists 24-0011 for Gary IN PD.", rows);
  assert.ok(r.clean, unsupportedClaims(r).join("; "));
});

test("a bare number is not grounded by an unrelated occurrence elsewhere in the passage", async () => {
  // The measured failure (user, 2026-08-19, screenshot): "trazodone starts
  // working within 30 to 60 minutes" checked "30" and "60" as grounded
  // because a passage's WHOLE bag of numbers happened to contain those
  // digit strings — bare occurrence counting over strings, with no sense
  // of what the number actually meant. "You can tell a word by the company
  // it keeps": a number is grounded by a passage SENTENCE that carries it
  // together with its own descriptive words, not by the digit string
  // appearing anywhere in the document.
  const { checkGrounding, corroborateAtoms } = await import("./grounding.js");
  const real = [
    {
      ref: "dog.txt#0-80",
      text: "Trazodone usually starts working within 30 to 60 minutes of being given to a dog.",
    },
  ];
  const grounded = checkGrounding("Trazodone typically starts working within 30 to 60 minutes.", real);
  assert.ok(grounded.clean, JSON.stringify(grounded.findings));
  const { atoms } = corroborateAtoms("Trazodone typically starts working within 30 to 60 minutes.", real);
  assert.ok(atoms.filter((a) => a.kind === "number").every((a) => a.refs.length === 1));

  // Same two digit strings, present in the SAME document but never in the
  // same breath as the claim's own words — real bytes, wrong context.
  const decoy = [
    {
      ref: "dog.txt#0-140",
      text:
        "Vaccination records show 30 dogs were treated at the shelter last spring. " +
        "The clinic reopens in 60 days for renovations.",
    },
  ];
  const misgrounded = checkGrounding("Trazodone typically starts working within 30 to 60 minutes.", decoy);
  assert.equal(misgrounded.clean, false, "bare digit-string presence elsewhere must not ground the claim");
  const said = unsupportedClaims(misgrounded).join(" | ");
  assert.match(said, /30/);
  assert.match(said, /60/);
  const { atoms: decoyAtoms } = corroborateAtoms("Trazodone typically starts working within 30 to 60 minutes.", decoy);
  assert.ok(decoyAtoms.filter((a) => a.kind === "number").every((a) => a.refs.length === 0));
});

test("an address is not a claim about quantities", () => {
  // Live bug: the byte offsets in `kess.txt#80-174` were read as figures and
  // flagged as unsupported — the check accusing the answer of inventing the
  // very citation it was asked to write.
  const r = checkGrounding(
    "The report put the silting figure at 12 percent per decade. [kess.txt#80-174]",
    passages,
  );
  assert.ok(r.clean, unsupportedClaims(r).join("; "));
  const bare = checkGrounding("Per kess.txt#80-174, the figure was 12 percent.", passages);
  assert.ok(bare.clean, unsupportedClaims(bare).join("; "));
});

// SPELLED-OUT NUMBERS (found live, 2026-09-22, a mapping pass over the
// checkable-claim escalation ladder): "give me the year the treaty was
// signed" / S1 answers "The treaty was signed in eighteen forty eight." —
// a specific, checkable year claim. NUMBER_RE requires an actual digit
// character (\d), so a spelled-out year had nothing for it to match at
// all — a total blind spot, not a boundary edge case, for the whole
// number-atom path (extractAtoms -> extractCheckableAtoms -> needsSystem2
// in app.js). Fixed by parsing the closed grammar of English cardinal
// number words, never a word list of years.
test("a spelled-out year is a checkable number atom, same as its digit twin", async () => {
  const assert = (await import("node:assert/strict")).default;
  const { extractAtoms, extractCheckableAtoms, parseWordNumber } = await import("./grounding.js");

  const digitAtoms = extractAtoms("The treaty was signed in 1848.", 0).filter((a) => a.kind === "number");
  const wordAtoms = extractAtoms("The treaty was signed in eighteen forty eight.", 0).filter(
    (a) => a.kind === "number",
  );
  assert.equal(digitAtoms.length, 1);
  assert.equal(wordAtoms.length, 1);
  assert.equal(wordAtoms[0].tokens[0], digitAtoms[0].tokens[0], "the spelled year must parse to the same token as its digit twin");
  assert.equal(wordAtoms[0].tokens[0], "1848");

  // The actual live specimen: this is what let the wrong answer stand
  // unchecked before the fix (needsSystem2 in app.js reads exactly this).
  const s1Text = "The treaty was signed in eighteen forty eight.";
  const checkable = extractCheckableAtoms(s1Text, { question: "give me the year the treaty was signed" });
  assert.equal(checkable.length, 1, "a spelled-out year must be offered as a checkable atom");

  // The spoken-year idiom (two two-digit "registers", no scale word):
  // "nineteen sixty-three", "nineteen oh five", "twenty twenty-four".
  assert.equal(parseWordNumber("nineteen sixty three".split(" ")), 1963);
  assert.equal(parseWordNumber("nineteen oh five".split(" ")), 1905);
  assert.equal(parseWordNumber("twenty twenty four".split(" ")), 2024);

  // Ordinary cardinal grammar (a scale word present) still parses the usual way.
  assert.equal(parseWordNumber("one hundred and five thousand".split(" ")), 105000);
  // TENS+UNIT is addition, not a century splice: "forty eight" is 48, not 4008.
  assert.equal(parseWordNumber("forty eight".split(" ")), 48);

  // A lone ambiguous number word ("one", "two", "zero", "oh") never fires on
  // its own — it is ordinary English far more often than a claim.
  const ambiguous = extractAtoms("One of the reasons is cost. The two of us went. He said one thing.", 0).filter(
    (a) => a.kind === "number",
  );
  assert.equal(ambiguous.length, 0, "a bare pronoun-like number word must not be read as a claim");
});

// Found live 2026-09-22: a System 1 answer that is nothing but a bare name
// ("Francis.") is a ONE-WORD SENTENCE, not a stray capital opening a longer
// one — the position-capitalization exemption above has no "rest of the
// sentence" to explain here, so it must not fire, or extractCheckableAtoms
// returns [] for an answer whose entire content is a single, checkable,
// possibly-wrong claim (a stale or invented name answering a WH-definite
// question). The prior two specimens (Shock/Anxiety, the numbered list)
// both have real content after the matched word and must stay exempted —
// pinned here alongside the new case so the fix cannot regress either way.
test("a bare one-word answer is checkable — position has nothing to explain when nothing follows", async () => {
  const { extractAtoms, extractCheckableAtoms } = await import("./grounding.js");
  const atoms = extractAtoms("Francis.");
  assert.equal(atoms.length, 1, JSON.stringify(atoms));
  assert.equal(atoms[0].text, "Francis");

  const findings = extractCheckableAtoms("Francis.", { question: "who is the current pope" });
  assert.equal(findings.length, 1, JSON.stringify(findings));
  assert.equal(findings[0].text, "Francis");

  // The sibling specimens above (real content after the single word) must
  // still be exempted — this fix narrows the exemption, it does not remove it.
  const stillExempt = extractAtoms("Shock ran through the ranks.");
  assert.ok(!stillExempt.some((a) => a.text === "Shock"), JSON.stringify(stillExempt));
  const listStillExempt = extractAtoms("1. Social standing mattered.");
  assert.ok(!listStillExempt.some((a) => a.text === "Social"), JSON.stringify(listStillExempt));
});

// Found live 2026-09-22: NUMBER_RE's trailing \b required a non-word
// character immediately after the digit run, but English attaches ordinal
// suffixes (1st, 2nd, 3rd, 4th...) and the bare plural/decade "s" (the
// 1990s) directly onto the digits with no separator, so a checkable year or
// ordinal in exactly this shape produced zero number atoms.
test("an ordinal or decade suffix does not hide the digits from NUMBER_RE", () => {
  const decade = extractAtoms("She was confirmed back in the 1990s.", 0).filter((a) => a.kind === "number");
  assert.deepEqual(decade.map((a) => a.tokens[0]), ["1990"]);

  const ordinal = extractAtoms("She was the 3rd woman confirmed to that seat.", 0).filter((a) => a.kind === "number");
  assert.deepEqual(ordinal.map((a) => a.tokens[0]), ["3"]);

  // An unrelated concatenation must not be swallowed just because it starts
  // with digits followed by letters — only the closed ordinal/plural suffix
  // classes are admitted, never an open "digits then any letters" rule.
  const unrelated = extractAtoms("The room was 20sqft.", 0).filter((a) => a.kind === "number");
  assert.equal(unrelated.length, 0, JSON.stringify(unrelated));
});

// Found live 2026-09-22: PROPER_RE's whole name-atom detection rests on
// Unicode uppercase to even start a match, so a small local model answering
// entirely in lowercase (a documented quirk of quantized models) produced
// zero checkable atoms even when it named a real, possibly-invented person.
test("an all-lowercase answer still yields checkable name atoms", () => {
  const atoms = extractAtoms("the governor of texas is greg abbott");
  const names = atoms.filter((a) => a.kind === "name").map((a) => a.text);
  assert.ok(names.includes("greg"), JSON.stringify(atoms));
  assert.ok(names.includes("abbott"), JSON.stringify(atoms));

  // The fallback must never fire once PROPER_RE already found a real name —
  // ordinary mixed-case text is completely untouched by this branch.
  const ordinary = extractAtoms("The governor of Texas is Greg Abbott.");
  const ordinaryNames = ordinary.filter((a) => a.kind === "name").map((a) => a.text);
  assert.ok(!ordinaryNames.includes("of"), JSON.stringify(ordinary));
  assert.ok(!ordinaryNames.includes("is"), JSON.stringify(ordinary));
});

// Found live 2026-09-22: a bare yes/no answer to a polarity question
// ("does decaf have caffeine") carries no digit and no capitalized
// multi-word run either way it is answered, so extractAtoms returns
// nothing and needsSystem2 never escalates on a checkable factual claim.
test("a polarity question's answer is checkable even with no number or name atom", () => {
  const affirm = extractCheckableAtoms(
    "Decaf coffee is caffeine-free, so it does not have caffeine.",
    { question: "does decaf have caffeine" },
  );
  assert.equal(affirm.length, 1, JSON.stringify(affirm));
  assert.equal(affirm[0].atomKind, "polarity");

  // A WH-question must not trip the polarity fallback — it already has its
  // own atom paths, and AUXILIARY_VERBS-first is specifically aux-inverted
  // yes/no shape, never a WH-question ("who is the president").
  const wh = extractCheckableAtoms("He has been president for a while now.", {
    question: "who is the current president",
  });
  assert.equal(wh.filter((f) => f.atomKind === "polarity").length, 0, JSON.stringify(wh));

  // An ordinary declarative sentence with no polarity question in play must
  // never spuriously produce a polarity atom.
  const noQuestion = extractCheckableAtoms("It has a mild flavor and a smooth finish.", { question: "" });
  assert.equal(noQuestion.length, 0, JSON.stringify(noQuestion));
});
