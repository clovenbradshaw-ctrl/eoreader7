// identity-routes.test.mjs — the enclitic route against the REAL engine organs (surfaces.js, cast.js), no stubs.
//
// The walls this pins, each with a control built to fail (II.23): the route is declared for a language and a missing one is a typed
// gap, not an English default; it folds the LAST token only (the every-token fold it replaces is run beside it and is shown to make the
// join the last-token fold must not); it RECOVERS — consulted only when the name asked as written resolved to nothing — so a name the
// index already answered is answered byte for byte as before (the always-on mode is run beside it and shown to join what the index
// kept apart); omitted, the index is byte-identical to before the seam existed; and a one-letter stem is never folded.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ENCLITIC_PRIORS, ENCLITIC_REFUSALS, MIN_STRIPPED_TOKEN, lastTokenFold, learnedNameFold, terminalEncliticFold } from "./identity-routes.js";
import { GAPS as NAME_FORM_GAPS } from "../adapters/text/name-forms.js";
import { makeReferentIndex } from "./cast.js";
import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm, opticalReferentForm, isNearMissSpelling, stripPossessive, isRomanNumeral } from "../adapters/text/surfaces.js";

const route = terminalEncliticFold({ language: "eng", stripEnclitic: stripPossessive, isNumeral: isRomanNumeral });
const everyToken = (t) => String(t ?? "").split(/\s+/).map(stripPossessive).join(" ");
const indexOf = (text, extra = {}) =>
  makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, leadingSurfaces: extractLeadingSurfaces, nameFold: opticalReferentForm, nameVariant: isNearMissSpelling, ...extra })([{ text }]);
const reps = (idx, q) => [...idx.resolve(q)].map((id) => idx.represent(id)).sort();
const has = (idx, rep) => [...idx.referents].some((id) => idx.represent(id) === rep);

test("the fold reads the LAST token and nothing else", () => {
  const f = lastTokenFold(stripPossessive);
  assert.equal(f("Elizabeth Hart's"), "Elizabeth Hart");
  assert.equal(f("Elizabeth Hart’s"), "Elizabeth Hart", "the typographic apostrophe is the same mark");
  assert.equal(f("Jesus'"), "Jesus", "a bare trailing apostrophe");
  assert.equal(f("King's Cross"), "King's Cross", "a mark inside a name is part of the name");
  assert.equal(f("Dante’s Blindness"), "Dante’s Blindness");
  assert.equal(f("  Anna's  "), "Anna");
  assert.equal(f("'s"), "", "a token that strips to nothing is dropped, not left as a space");
  assert.equal(MIN_STRIPPED_TOKEN, 2, "a single letter is never a name");
  assert.equal(f("Seven P\u2019s"), "Seven P\u2019s", "a plural of a letter is not a name losing a mark: left as written");
  assert.equal(f("Jackie Li's"), "Jackie Li", "a two-letter surname is a name, and cast.js counts the rest of the name either way");
  assert.equal(f("Ann's"), "Ann");
  assert.equal(f("Charles I's"), "Charles I's", "a bare numeral stem is left as written unless the caller licenses numerals …");
  assert.equal(lastTokenFold(stripPossessive, { isNumeral: isRomanNumeral })("Charles I's"), "Charles I", "… which indexes a name rather than being one");
  assert.equal(lastTokenFold(stripPossessive, { isNumeral: isRomanNumeral })("Seven P's"), "Seven P's", "and P is not a numeral, so the idiom stays unfolded");
  assert.equal(f(""), "");
  assert.equal(f(null), "");
});

test("a language must be DECLARED, and an unregistered one is a typed gap with the byte-identical default", () => {
  const none = terminalEncliticFold({ stripEnclitic: stripPossessive });
  assert.equal(none.fold, null);
  assert.equal(none.gap.type, ENCLITIC_REFUSALS.UNDECLARED_LANGUAGE);
  const blank = terminalEncliticFold({ language: "  ", stripEnclitic: stripPossessive });
  assert.equal(blank.gap.type, ENCLITIC_REFUSALS.UNDECLARED_LANGUAGE);
  const finnish = terminalEncliticFold({ language: "fin", stripEnclitic: stripPossessive });
  assert.equal(finnish.fold, null);
  assert.equal(finnish.gap.type, ENCLITIC_REFUSALS.NO_PRIOR_FOR_LANGUAGE);
  assert.equal(finnish.gap.language, "fin", "the gap names the language it did not fold for");
  const noOrgan = terminalEncliticFold({ language: "eng" });
  assert.equal(noOrgan.fold, null);
  assert.equal(noOrgan.gap.type, ENCLITIC_REFUSALS.NO_STRIP_ORGAN);
  for (const l of ["eng", "en", "ENG", "En"]) assert.equal(typeof terminalEncliticFold({ language: l, stripEnclitic: stripPossessive }).fold, "function", l);
  assert.ok(ENCLITIC_PRIORS.eng.giver && ENCLITIC_PRIORS.eng.measured, "a prior names its giver and what measured it");
  // a declined route changes nothing: the index built with its (null) fold is the index built without it
  const text = "Marta met a friend. Anna barked orders at the postman. The postman liked Anna.";
  const a = indexOf(text), b = indexOf(text, { surfaceFold: finnish.fold });
  for (const q of ["Anna", "Anna's", "Marta", "Helsinki"]) assert.deepEqual(reps(a, q), reps(b, q), q);
});

test("both directions: a name asked with the mark reaches the bare referent, and the bare name reaches one established only with it", () => {
  const bare = "Marta met a friend at the market. Anna barked orders at the postman. Anna told her sister about Helsinki. The postman liked Anna.";
  const without = indexOf(bare), withMark = indexOf(bare, { surfaceFold: route.fold });
  assert.deepEqual(reps(without, "Anna's"), [], "before: a possessive in a question reaches nothing");
  assert.deepEqual(reps(withMark, "Anna's"), ["Anna"], "after: it reaches the referent the bare name does");
  assert.deepEqual(reps(withMark, "Anna"), reps(without, "Anna"), "the bare name resolves as it did");

  // A mark in mid-sentence is already stripped at extraction ("Anna" is the surface of "admired Anna's roses"); the stragglers are
  // the mentions that OPEN a sentence, which reach the index through extractLeadingSurfaces with the mark still on them.
  const marked = "Anna's dog barked at the postman. Anna's sister lives in Helsinki.";
  const m0 = indexOf(marked), m1 = indexOf(marked, { surfaceFold: route.fold });
  assert.ok(has(m0, "Anna's") && !has(m0, "Anna"), "precondition: the material establishes her only with the mark");
  assert.deepEqual(reps(m0, "Anna"), [], "before: the bare name does not reach her");
  assert.deepEqual(reps(m1, "Anna"), ["Anna's"], "after: it does");
});

test("CONTROL BUILT TO FAIL — a mark inside a title does not join the title to the name; folding every token does", () => {
  const text = "Dante arrived at the gate of the city. Dante spoke to Virgil. Virgil answered him. Dante\u2019s Blindness is the heading of the next chapter. Virgil\u2019s Departure closes the canto. Dante\u2019s Blindness returns later.";
  const plain = indexOf(text), last = indexOf(text, { surfaceFold: route.fold }), every = indexOf(text, { nameFold: (t, o) => opticalReferentForm(everyToken(t), o) });
  assert.ok(has(plain, "Dante") && has(plain, "Dante\u2019s Blindness") && has(plain, "Virgil") && has(plain, "Virgil\u2019s Departure"), "precondition: discovery keeps the person and the title apart");
  assert.deepEqual(reps(last, "Dante"), ["Dante"], "last-token: the person is the person");
  assert.deepEqual(reps(last, "Virgil"), ["Virgil"]);
  assert.deepEqual(reps(every, "Dante"), ["Dante", "Dante\u2019s Blindness"], "the every-token fold joins the title to the name — the failure the last-token fold exists to avoid");
  assert.deepEqual(reps(every, "Virgil"), ["Virgil", "Virgil\u2019s Departure"]);
  // A possessive of the person asked with the ASCII apostrophe used to reach the TITLE — through the one-edit spelling fallback, since
  // the glyph differs from the text's \u2019. The recovery fold is consulted first (an exact answer outranks a guessed spelling), so it
  // reaches the person.
  assert.deepEqual(reps(plain, "Dante's"), ["Dante\u2019s Blindness"], "before: a possessive of the person reached the TITLE");
  assert.deepEqual(reps(last, "Dante's"), ["Dante"], "after: it reaches the person");
  // The title is still reachable by its own full name.
  assert.deepEqual(reps(last, "Dante\u2019s Blindness"), ["Dante\u2019s Blindness"]);
  // THE LIMIT, stated: the same possessive typed with the text's own glyph is an EXACT sub-form of the title, so the index had
  // answered it (wrongly) and the recovery fold, which only speaks when the index did not, leaves that answer alone. The always-on
  // mode would change it — and would also join referents the index kept apart (next test).
  assert.deepEqual(reps(last, "Dante\u2019s"), reps(plain, "Dante\u2019s"), "an answer the index already gave is not changed");
  assert.deepEqual(reps(indexOf(text, { surfaceFold: route.fold, surfaceFoldMode: "always" }), "Dante\u2019s"), ["Dante"]);
});

test("MONOTONE — a name the index already answered is answered exactly as before; the fold only speaks where it was silent", () => {
  const text = "Marta met a friend at the market. Anna barked orders at the postman. Anna told her sister about Helsinki. Anna's dog barked at Marta. Dante arrived at the gate. Dante\u2019s Blindness is the heading of the next chapter. Macy said hello. Macy's closed early.";
  const plain = indexOf(text), last = indexOf(text, { surfaceFold: route.fold });
  const asked = ["Anna", "Marta", "Helsinki", "Dante", "Dante\u2019s", "Dante\u2019s Blindness", "Macy", "Macy's", "Anna's", "Marta's", "Nobody", "Postman"];
  let answered = 0;
  for (const q of asked) {
    const before = reps(plain, q);
    if (before.length) { answered += 1; assert.deepEqual(reps(last, q), before, `${q}: already answered, so unchanged`); }
  }
  assert.ok(answered >= 8, `precondition: most of the names are ones the index already answers (${answered})`);
  assert.deepEqual(reps(plain, "Marta's"), [], "silent before");
  assert.deepEqual(reps(last, "Marta's"), ["Marta"], "answered after");
  assert.deepEqual(reps(last, "Nobody's"), [], "a name the material never establishes stays unanswered");
});

test("CONTROL BUILT TO FAIL — a plural of a letter does not reduce to a generic word and join everything that shares it", () => {
  const text = "Seven P\u2019s were cut into his forehead. The Seven Virtues were named in the next canto. The Seven Virtues returned later. Righteous Kings were praised, and the Seven Kings of the old song.";
  const bareFold = (t) => String(t ?? "").trim().split(/\s+/).map(stripPossessive).join(" ");
  const plain = indexOf(text), last = indexOf(text, { surfaceFold: route.fold, surfaceFoldMode: "always" }), bare = indexOf(text, { surfaceFold: bareFold, surfaceFoldMode: "always" });
  assert.ok(has(plain, "Seven P\u2019s") && has(plain, "The Seven Virtues"), "precondition: the material establishes the marks and the virtues apart");
  assert.deepEqual(reps(last, "Seven P\u2019s"), reps(plain, "Seven P\u2019s"), "with the floor the plural resolves as it did, even folding always");
  assert.ok(reps(bare, "Seven P\u2019s").includes("The Seven Virtues"), "without the floor the stripped residue 'Seven' reaches the virtues — the failure the floor exists to avoid");
});

test("THE COST of folding ALWAYS, pinned: a business named with the mark is joined to the person; the recovery fold does not join them", () => {
  const text = "Macy said hello to the clerk. Macy waved. Macy's closed early on Sunday. Everyone shopped at Macy's that year.";
  const plain = indexOf(text), recover = indexOf(text, { surfaceFold: route.fold }), always = indexOf(text, { surfaceFold: route.fold, surfaceFoldMode: "always" });
  assert.ok(has(plain, "Macy") && has(plain, "Macy's"), "precondition: discovery keeps the person and the store apart");
  assert.deepEqual(reps(plain, "Macy"), ["Macy"]);
  assert.deepEqual(reps(recover, "Macy"), ["Macy"], "recovery: the index answered, so the answer stands");
  assert.deepEqual(reps(recover, "Macy's"), reps(plain, "Macy's"));
  assert.deepEqual(reps(always, "Macy"), ["Macy", "Macy's"], "always-on: the position rule cannot tell the store from the person — it reads no material. Measured, disclosed, not shipped.");
});

test("the near-miss spelling fallback folds the same way (a mark and a typo together)", () => {
  const text = "Johnson signed the order. Johnson left the room. The clerk filed Johnson's order.";
  const idx = indexOf(text, { surfaceFold: route.fold });
  assert.deepEqual(reps(indexOf(text), "Jonson's"), [], "before: neither the mark nor the spelling resolves");
  assert.deepEqual(reps(idx, "Jonson's"), ["Johnson"], "after: the mark is folded, then the one-edit fallback finds the referent");
});

// ── THE LEARNED ROUTE (READING-SPEC S139) ─────────────────────────────────────
// learnedNameFold builds the same route from a NameFormPrior@1 a treebank taught (priors/name-forms-<iso>.json) instead of the typed English object
// above. The walls are the route's own and are pinned again here against the real index; what is new is that the answer comes from a count.
const prior = (iso) => JSON.parse(readFileSync(new URL(`../priors/name-forms-${iso}.json`, import.meta.url), "utf8"));
const learned = learnedNameFold({ language: "eng", prior: prior("eng"), isNumeral: isRomanNumeral });
const learnedFr = learnedNameFold({ language: "fra", prior: prior("fra"), isNumeral: isRomanNumeral });

test("learned: a language must be DECLARED, the prior must be for THAT language, and an unnamed or missing one is a typed gap with the index's byte-identical default", () => {
  const undeclared = learnedNameFold({ prior: prior("eng") });
  assert.equal(undeclared.fold, null);
  assert.equal(undeclared.gap.type, ENCLITIC_REFUSALS.UNDECLARED_LANGUAGE, "never applied by default, even to English");
  assert.equal(learnedNameFold({ language: "  ", prior: prior("eng") }).gap.type, ENCLITIC_REFUSALS.UNDECLARED_LANGUAGE);
  const other = learnedNameFold({ language: "deu", prior: prior("eng") });
  assert.equal(other.fold, null);
  assert.equal(other.gap.type, NAME_FORM_GAPS.OTHER_LANGUAGE, "the English prior is not applied to a material declared German");
  assert.equal(learnedNameFold({ language: "eng", prior: null }).gap.type, NAME_FORM_GAPS.NO_PRIOR);
  const noGiver = prior("eng"); delete noGiver.provenance.giver;
  assert.equal(learnedNameFold({ language: "eng", prior: noGiver }).gap.type, NAME_FORM_GAPS.BAD_PRIOR, "a prior that names no giver is refused");
  for (const l of ["eng", "en", "ENG", "En"]) assert.equal(typeof learnedNameFold({ language: l, prior: prior("eng") }).fold, "function", l);
  for (const l of ["fra", "fr"]) assert.equal(typeof learnedNameFold({ language: l, prior: prior("fra") }).fold, "function", l);
  const text = "Marta met a friend. Anna barked orders at the postman. The postman liked Anna.";
  const a = indexOf(text), b = indexOf(text, { surfaceFold: other.fold });
  for (const q of ["Anna", "Anna's", "Marta", "Helsinki"]) assert.deepEqual(reps(a, q), reps(b, q), `a declined route changes nothing: ${q}`);
});

test("learned: both directions, and monotone, exactly as the typed route — against the real index", () => {
  const bare = "Marta met a friend at the market. Anna barked orders at the postman. Anna told her sister about Helsinki. The postman liked Anna.";
  const without = indexOf(bare), withMark = indexOf(bare, { surfaceFold: learned.fold });
  assert.deepEqual(reps(without, "Anna's"), []);
  assert.deepEqual(reps(withMark, "Anna's"), ["Anna"], "a possessive in a question reaches the bare name's referent");
  assert.deepEqual(reps(withMark, "Anna’s"), ["Anna"], "and with the typographic apostrophe");
  assert.deepEqual(reps(withMark, "Anna"), reps(without, "Anna"));
  const marked = "Anna's dog barked at the postman. Anna's sister lives in Helsinki.";
  const m0 = indexOf(marked), m1 = indexOf(marked, { surfaceFold: learned.fold });
  assert.deepEqual(reps(m0, "Anna"), []);
  assert.deepEqual(reps(m1, "Anna"), ["Anna's"], "the bare name reaches a referent the material establishes only with the mark");
  const text = "Marta met a friend at the market. Anna barked orders at the postman. Anna told her sister about Helsinki. Anna's dog barked at Marta. Dante arrived at the gate. Dante\u2019s Blindness is the heading of the next chapter. Macy said hello. Macy's closed early.";
  const plain = indexOf(text), last = indexOf(text, { surfaceFold: learned.fold });
  let answered = 0;
  for (const q of ["Anna", "Marta", "Helsinki", "Dante", "Dante\u2019s", "Dante\u2019s Blindness", "Macy", "Macy's", "Anna's", "Marta's", "Nobody", "Postman"]) {
    const before = reps(plain, q);
    if (before.length) { answered += 1; assert.deepEqual(reps(last, q), before, `${q}: already answered, so unchanged`); }
  }
  assert.ok(answered >= 8);
  assert.deepEqual(reps(last, "Marta's"), ["Marta"]);
  assert.deepEqual(reps(last, "Nobody's"), [], "a name the material never establishes stays unanswered");
});

test("learned: it folds the LAST word's end and the title keeps its inner mark — the control the typed route's every-token ancestor fails", () => {
  const text = "Dante arrived at the gate of the city. Dante spoke to Virgil. Virgil answered him. Dante\u2019s Blindness is the heading of the next chapter. Virgil\u2019s Departure closes the canto. Dante\u2019s Blindness returns later.";
  const plain = indexOf(text), idx = indexOf(text, { surfaceFold: learned.fold });
  assert.deepEqual(reps(idx, "Dante"), ["Dante"], "the person is the person");
  assert.deepEqual(reps(plain, "Dante's"), ["Dante\u2019s Blindness"], "before: a possessive of the person reached the TITLE");
  assert.deepEqual(reps(idx, "Dante's"), ["Dante"], "after: it reaches the person");
  assert.deepEqual(reps(idx, "Dante\u2019s Blindness"), ["Dante\u2019s Blindness"], "the title is still reachable by its own name");
});

test("learned: the stem floor is the CONSUMER'S — a one-letter stem is left as written, a numeral is licensed by the caller's own test, and the prior declares neither", () => {
  assert.equal(prior("eng").operatingPoint.minStem, 1, "the treebank cannot see the idiom, so the prior declares no floor");
  const f = learned.fold;
  assert.equal(f("Seven P\u2019s"), "Seven P\u2019s", "a plural of a letter is not a name losing a mark");
  assert.equal(f("Jackie Li's"), "Jackie Li", "a two-letter surname is a name");
  assert.equal(f("Charles I's"), "Charles I", "a numeral indexes a name; the engine's own isRomanNumeral licenses it");
  assert.equal(learnedNameFold({ language: "eng", prior: prior("eng") }).fold("Charles I's"), "Charles I's", "without a numeral licence the one-letter stem stays as written");
  assert.equal(f(""), "");
});

test("learned vs typed: the same answer on every name of a bench but one — the one the learned table never saw twice, named", () => {
  const typed = route.fold, fold = learned.fold;
  const bench = ["Anna's", "Anna\u2019s", "Bush\u2019s", "Jones'", "Jesus'", "Thomas", "James", "Texas", "Iraqis", "Elizabeth Hart's", "Dante's Inferno", "King's Cross", "O'Brien", "Marines", "Seven P's", "Charles I's", "Jackie Li's", "Ann's", "  Anna's  ", "the King of England's", "Macy's"];
  // The typed route also trims and collapses whitespace; the learned fold keeps what it does not strip exactly as written, and the index
  // tokenizes either way — so the comparison is on the tokens.
  const toks = (x) => x.trim().split(/\s+/).join(" ");
  for (const n of bench) assert.equal(toks(fold(n)), typed(n), `${JSON.stringify(n)}`);
  assert.equal(fold("  Anna's  "), "  Anna  ", "the learned fold changes only what it strips");
  // THE ONE DIFFERENCE, stated: an apostrophe after a letter that is not s. The typed route strips any trailing apostrophe; the learned table has
  // seen `s'` (15 of 15 in the treebank) and not enough `x'` to speak, so it is silent there. Measured: one type of the audit's 1,186 (README of the record).
  assert.equal(typed("Cox'"), "Cox");
  assert.equal(fold("Cox'"), "Cox'");
});

test("learned, French: an elided article comes off the front of a name, and the English prior does not fold a French mark", () => {
  const text = "Pierre voyage beaucoup. Pierre aime l'Allemagne. Pierre a \u00e9crit sur l'Allemagne. Allemagne est un grand pays. Marie visite d'Alsace chaque \u00e9t\u00e9. Marie aime Alsace. Marie parle d'Alsace.";
  const plain = indexOf(text), idx = indexOf(text, { surfaceFold: learnedFr.fold });
  for (const q of ["l'Allemagne", "l\u2019Allemagne", "d'Alsace", "qu'Allemagne"]) { assert.deepEqual(reps(plain, q), [], `before: ${q} reaches nothing`); assert.equal(reps(idx, q).length, 1, `after: ${q} reaches a referent`); }
  assert.deepEqual(reps(idx, "l'Allemagne"), ["Allemagne"]);
  assert.deepEqual(reps(idx, "de Gaulle"), [], "a name that merely begins with d is not an elision: the apostrophe is part of the evidence");
  assert.equal(learnedFr.fold("Anna's"), "Anna's", "a language's prior does not fold another language's marks");
  assert.equal(learned.fold("l'Allemagne"), "l'Allemagne", "and the English prior leaves a French elision alone");
});
