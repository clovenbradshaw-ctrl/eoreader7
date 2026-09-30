// native/eval/lavar/ud-fronted-predicate-check.mjs — mechanical check for
// the recurring gold-UD-annotation mistake named in CODING-LESSONS.md #76:
// a fronted participial/adjectival opener, or a fronted predicate in front
// of a copula, getting promoted to `root` because it comes first in the
// sentence, when the real predicate -- tracked by argument structure, not
// linear order -- sits elsewhere. Six independent, stateless gold-
// annotation passes rediscovered this rule on six different sentences in
// one day (2026-09-25) because nothing mechanical ever checked the answer;
// one of those six (the locative "were" case) got it wrong despite citing
// the correct rule in the same paragraph. This is that mechanical check.
//
// Input: a UD/CoNLL-U-shaped token array for ONE sentence -- {id, form,
// lemma, upos, xpos, feats, head, deprel}, 1-indexed ids, head=0 marks
// root -- the exact shape kernel/eot-rich.js's parseConllu() already
// produces per sentence (`.tokens`) and claim-null-scoring.mjs's
// rootTripleFrom() already consumes.
//
// SCOPE: this catches the two trap shapes actually seen recur, not every
// possible UD mistake. TRAP A is unambiguous and fires as an error. TRAP B
// is a judgment call (existential vs. copular "be") and fires as a
// warning only -- read the message, don't treat it as an auto-fail.
//
//   node native/eval/lavar/ud-fronted-predicate-check.mjs   (self-test)

const FINITE_XPOS = new Set(["VBZ", "VBP", "VBD", "MD"]);
const NONFINITE_XPOS = new Set(["VBG", "VBN", "VB"]);
const isVerby = (t) => t.upos === "VERB" || t.upos === "AUX";
const BE_FORM = /^(is|was|were|are|am|been|being|'s|'re)$/i;

function rootOf(tokens) {
  return tokens.find((t) => t.deprel === "root" || t.head === 0) ?? null;
}

function firstCommaId(tokens) {
  const c = tokens.find((t) => t.form === ",");
  return c ? c.id : null;
}

/** TRAP A -- a fronted non-finite (participial) or copular-adjectival
 *  opener, comma-bounded, with no finite verb of its own, standing in
 *  front of the sentence's real finite main verb. UD gold: that opening
 *  clause is `advcl`/`acl` on the main verb; the main verb -- wherever it
 *  sits -- is root. Fires only when the opening span truly has no finite
 *  verb of its own AND a finite verb exists after the comma: an ordinary
 *  finite subordinate clause ("Although he was tired, ...") is not this
 *  trap and is left alone. */
export function checkFrontedNonfiniteOpener(tokens) {
  const root = rootOf(tokens);
  if (!root) return { ok: true, findings: [] };
  const commaId = firstCommaId(tokens);
  if (commaId == null) return { ok: true, findings: [] };
  const opening = tokens.filter((t) => t.id < commaId);
  const main = tokens.filter((t) => t.id > commaId);
  if (!opening.length || !main.length) return { ok: true, findings: [] };
  const openingHasFiniteVerb = opening.some((t) => isVerby(t) && FINITE_XPOS.has(t.xpos));
  if (openingHasFiniteVerb) return { ok: true, findings: [] };
  const openingIsNonfiniteClause = opening.some((t) => isVerby(t) && NONFINITE_XPOS.has(t.xpos));
  if (!openingIsNonfiniteClause) return { ok: true, findings: [] };
  const mainHasFiniteVerb = main.some((t) => isVerby(t) && FINITE_XPOS.has(t.xpos));
  if (!mainHasFiniteVerb) return { ok: true, findings: [] };
  if (root.id > commaId) return { ok: true, findings: [] };
  return {
    ok: false,
    findings: [{
      level: "error",
      rule: "fronted-nonfinite-opener",
      message: `root is "${root.form}" (id ${root.id}), inside the opening ` +
        `non-finite clause before the comma at id ${commaId}. CODING-LESSONS.md ` +
        `#76: a fronted participial/adjectival opener is advcl/acl on the main ` +
        `clause's finite verb, never root itself. There is a finite verb after ` +
        `the comma -- root the sentence there instead.`,
    }],
  };
}

/** TRAP B (advisory) -- a form of "be" holding `root` itself, in a clause
 *  that also has a plausible nonverbal predicate (an obl/nmod/advmod child
 *  distinct from the subject) and no expletive "there". Per UD's own
 *  canonical "She is from Paris" (root=Paris, cop=is), a copula with a
 *  nonverbal predicate is never itself root -- regardless of surface
 *  order, fronted or not. This is a WARNING, not an error: existential
 *  "be" (with no predicate complement) and ADV-headed predicates ("I am
 *  here") are genuinely disputed territory this check does not try to
 *  settle -- it only flags the shape for a human/subagent to verify. */
export function checkCopulaKeptAsRoot(tokens) {
  const root = rootOf(tokens);
  if (!root) return { ok: true, findings: [] };
  if (root.lemma !== "be" && !BE_FORM.test(root.form)) return { ok: true, findings: [] };
  const kids = tokens.filter((t) => t.head === root.id);
  if (kids.some((t) => t.deprel === "expl")) return { ok: true, findings: [] };
  const subj = kids.find((t) => /^nsubj/.test(t.deprel));
  if (!subj) return { ok: true, findings: [] };
  const predicateCandidate = kids.find((t) => /^(obl|nmod|advmod)/.test(t.deprel) && t.id !== subj.id);
  if (!predicateCandidate) return { ok: true, findings: [] };
  return {
    ok: true,
    findings: [{
      level: "warning",
      rule: "copula-kept-as-root",
      message: `root is the copula "${root.form}" (id ${root.id}) itself, with ` +
        `"${predicateCandidate.form}" (id ${predicateCandidate.id}) attached as ` +
        `${predicateCandidate.deprel}. Verify this is genuinely existential "be" ` +
        `and not a copula with a nonverbal predicate that UD gold requires as ` +
        `root instead (canonical: "She is from Paris", root=Paris, cop=is) -- ` +
        `CODING-LESSONS.md #76 names a same-day case that got exactly this wrong.`,
    }],
  };
}

/** Run both traps; `ok` is false only on a TRAP A (error) finding. */
export function checkGoldParse(tokens) {
  const a = checkFrontedNonfiniteOpener(tokens);
  const b = checkCopulaKeptAsRoot(tokens);
  const findings = [...a.findings, ...b.findings];
  return { ok: !findings.some((f) => f.level === "error"), findings };
}

export const FIXTURES = [
  { name: "In the corner stood an old chair. (correct)", expectOk: true, expectWarn: false, tokens: [
    { id: 1, form: "In", lemma: "in", upos: "ADP", xpos: "IN", head: 3, deprel: "case" },
    { id: 2, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 3, deprel: "det" },
    { id: 3, form: "corner", lemma: "corner", upos: "NOUN", xpos: "NN", head: 4, deprel: "obl" },
    { id: 4, form: "stood", lemma: "stand", upos: "VERB", xpos: "VBD", head: 0, deprel: "root" },
    { id: 5, form: "an", lemma: "a", upos: "DET", xpos: "DT", head: 7, deprel: "det" },
    { id: 6, form: "old", lemma: "old", upos: "ADJ", xpos: "JJ", head: 7, deprel: "amod" },
    { id: 7, form: "chair", lemma: "chair", upos: "NOUN", xpos: "NN", head: 4, deprel: "nsubj" },
    { id: 8, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 4, deprel: "punct" },
  ] },
  { name: "Behind the guns were their limbers. (correct)", expectOk: true, expectWarn: false, tokens: [
    { id: 1, form: "Behind", lemma: "behind", upos: "ADP", xpos: "IN", head: 3, deprel: "case" },
    { id: 2, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 3, deprel: "det" },
    { id: 3, form: "guns", lemma: "gun", upos: "NOUN", xpos: "NNS", head: 0, deprel: "root" },
    { id: 4, form: "were", lemma: "be", upos: "AUX", xpos: "VBD", head: 3, deprel: "cop" },
    { id: 5, form: "their", lemma: "they", upos: "PRON", xpos: "PRP$", head: 6, deprel: "nmod:poss" },
    { id: 6, form: "limbers", lemma: "limber", upos: "NOUN", xpos: "NNS", head: 3, deprel: "nsubj" },
    { id: 7, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 3, deprel: "punct" },
  ] },
  { name: "Behind the guns were their limbers. (wrong: root kept on \"were\")", expectOk: true, expectWarn: true, tokens: [
    { id: 1, form: "Behind", lemma: "behind", upos: "ADP", xpos: "IN", head: 3, deprel: "case" },
    { id: 2, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 3, deprel: "det" },
    { id: 3, form: "guns", lemma: "gun", upos: "NOUN", xpos: "NNS", head: 4, deprel: "obl" },
    { id: 4, form: "were", lemma: "be", upos: "VERB", xpos: "VBD", head: 0, deprel: "root" },
    { id: 5, form: "their", lemma: "they", upos: "PRON", xpos: "PRP$", head: 6, deprel: "nmod:poss" },
    { id: 6, form: "limbers", lemma: "limber", upos: "NOUN", xpos: "NNS", head: 4, deprel: "nsubj" },
    { id: 7, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 4, deprel: "punct" },
  ] },
  { name: "Having ridden round the whole line, Prince Andrew made his way home. (correct)", expectOk: true, expectWarn: false, tokens: [
    { id: 1, form: "Having", lemma: "have", upos: "AUX", xpos: "VBG", head: 2, deprel: "aux" },
    { id: 2, form: "ridden", lemma: "ride", upos: "VERB", xpos: "VBN", head: 10, deprel: "advcl" },
    { id: 3, form: "round", lemma: "round", upos: "ADP", xpos: "IN", head: 6, deprel: "case" },
    { id: 4, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 6, deprel: "det" },
    { id: 5, form: "whole", lemma: "whole", upos: "ADJ", xpos: "JJ", head: 6, deprel: "amod" },
    { id: 6, form: "line", lemma: "line", upos: "NOUN", xpos: "NN", head: 2, deprel: "obl" },
    { id: 7, form: ",", lemma: ",", upos: "PUNCT", xpos: ",", head: 2, deprel: "punct" },
    { id: 8, form: "Prince", lemma: "Prince", upos: "PROPN", xpos: "NNP", head: 9, deprel: "compound" },
    { id: 9, form: "Andrew", lemma: "Andrew", upos: "PROPN", xpos: "NNP", head: 10, deprel: "nsubj" },
    { id: 10, form: "made", lemma: "make", upos: "VERB", xpos: "VBD", head: 0, deprel: "root" },
    { id: 11, form: "his", lemma: "he", upos: "PRON", xpos: "PRP$", head: 12, deprel: "nmod:poss" },
    { id: 12, form: "way", lemma: "way", upos: "NOUN", xpos: "NN", head: 10, deprel: "obj" },
    { id: 13, form: "home", lemma: "home", upos: "NOUN", xpos: "NN", head: 10, deprel: "obl" },
    { id: 14, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 10, deprel: "punct" },
  ] },
  { name: "Having ridden round the whole line, Prince Andrew made his way home. (wrong: root kept on \"ridden\")", expectOk: false, expectWarn: false, tokens: [
    { id: 1, form: "Having", lemma: "have", upos: "AUX", xpos: "VBG", head: 2, deprel: "aux" },
    { id: 2, form: "ridden", lemma: "ride", upos: "VERB", xpos: "VBN", head: 0, deprel: "root" },
    { id: 3, form: "round", lemma: "round", upos: "ADP", xpos: "IN", head: 6, deprel: "case" },
    { id: 4, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 6, deprel: "det" },
    { id: 5, form: "whole", lemma: "whole", upos: "ADJ", xpos: "JJ", head: 6, deprel: "amod" },
    { id: 6, form: "line", lemma: "line", upos: "NOUN", xpos: "NN", head: 2, deprel: "obl" },
    { id: 7, form: ",", lemma: ",", upos: "PUNCT", xpos: ",", head: 2, deprel: "punct" },
    { id: 8, form: "Prince", lemma: "Prince", upos: "PROPN", xpos: "NNP", head: 9, deprel: "compound" },
    { id: 9, form: "Andrew", lemma: "Andrew", upos: "PROPN", xpos: "NNP", head: 10, deprel: "nsubj" },
    { id: 10, form: "made", lemma: "make", upos: "VERB", xpos: "VBD", head: 2, deprel: "parataxis" },
    { id: 11, form: "his", lemma: "he", upos: "PRON", xpos: "PRP$", head: 12, deprel: "nmod:poss" },
    { id: 12, form: "way", lemma: "way", upos: "NOUN", xpos: "NN", head: 10, deprel: "obj" },
    { id: 13, form: "home", lemma: "home", upos: "NOUN", xpos: "NN", head: 10, deprel: "obl" },
    { id: 14, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 10, deprel: "punct" },
  ] },
  { name: "Present at the meeting were John and Mary. (correct)", expectOk: true, expectWarn: false, tokens: [
    { id: 1, form: "Present", lemma: "present", upos: "ADJ", xpos: "JJ", head: 0, deprel: "root" },
    { id: 2, form: "at", lemma: "at", upos: "ADP", xpos: "IN", head: 4, deprel: "case" },
    { id: 3, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 4, deprel: "det" },
    { id: 4, form: "meeting", lemma: "meeting", upos: "NOUN", xpos: "NN", head: 1, deprel: "obl" },
    { id: 5, form: "were", lemma: "be", upos: "AUX", xpos: "VBD", head: 1, deprel: "cop" },
    { id: 6, form: "John", lemma: "John", upos: "PROPN", xpos: "NNP", head: 1, deprel: "nsubj" },
    { id: 7, form: "and", lemma: "and", upos: "CCONJ", xpos: "CC", head: 8, deprel: "cc" },
    { id: 8, form: "Mary", lemma: "Mary", upos: "PROPN", xpos: "NNP", head: 6, deprel: "conj" },
    { id: 9, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 1, deprel: "punct" },
  ] },
  { name: "Present at the meeting were John and Mary. (wrong: root kept on \"were\")", expectOk: true, expectWarn: true, tokens: [
    { id: 1, form: "Present", lemma: "present", upos: "ADJ", xpos: "JJ", head: 5, deprel: "advmod" },
    { id: 2, form: "at", lemma: "at", upos: "ADP", xpos: "IN", head: 4, deprel: "case" },
    { id: 3, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 4, deprel: "det" },
    { id: 4, form: "meeting", lemma: "meeting", upos: "NOUN", xpos: "NN", head: 1, deprel: "obl" },
    { id: 5, form: "were", lemma: "be", upos: "VERB", xpos: "VBD", head: 0, deprel: "root" },
    { id: 6, form: "John", lemma: "John", upos: "PROPN", xpos: "NNP", head: 5, deprel: "nsubj" },
    { id: 7, form: "and", lemma: "and", upos: "CCONJ", xpos: "CC", head: 8, deprel: "cc" },
    { id: 8, form: "Mary", lemma: "Mary", upos: "PROPN", xpos: "NNP", head: 6, deprel: "conj" },
    { id: 9, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 5, deprel: "punct" },
  ] },
  { name: "Walking along the road, she saw a dog. (correct)", expectOk: true, expectWarn: false, tokens: [
    { id: 1, form: "Walking", lemma: "walk", upos: "VERB", xpos: "VBG", head: 7, deprel: "advcl" },
    { id: 2, form: "along", lemma: "along", upos: "ADP", xpos: "IN", head: 4, deprel: "case" },
    { id: 3, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 4, deprel: "det" },
    { id: 4, form: "road", lemma: "road", upos: "NOUN", xpos: "NN", head: 1, deprel: "obl" },
    { id: 5, form: ",", lemma: ",", upos: "PUNCT", xpos: ",", head: 1, deprel: "punct" },
    { id: 6, form: "she", lemma: "she", upos: "PRON", xpos: "PRP", head: 7, deprel: "nsubj" },
    { id: 7, form: "saw", lemma: "see", upos: "VERB", xpos: "VBD", head: 0, deprel: "root" },
    { id: 8, form: "a", lemma: "a", upos: "DET", xpos: "DT", head: 9, deprel: "det" },
    { id: 9, form: "dog", lemma: "dog", upos: "NOUN", xpos: "NN", head: 7, deprel: "obj" },
    { id: 10, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 7, deprel: "punct" },
  ] },
  { name: "Walking along the road, she saw a dog. (wrong: root kept on \"Walking\")", expectOk: false, expectWarn: false, tokens: [
    { id: 1, form: "Walking", lemma: "walk", upos: "VERB", xpos: "VBG", head: 0, deprel: "root" },
    { id: 2, form: "along", lemma: "along", upos: "ADP", xpos: "IN", head: 4, deprel: "case" },
    { id: 3, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 4, deprel: "det" },
    { id: 4, form: "road", lemma: "road", upos: "NOUN", xpos: "NN", head: 1, deprel: "obl" },
    { id: 5, form: ",", lemma: ",", upos: "PUNCT", xpos: ",", head: 1, deprel: "punct" },
    { id: 6, form: "she", lemma: "she", upos: "PRON", xpos: "PRP", head: 1, deprel: "nsubj" },
    { id: 7, form: "saw", lemma: "see", upos: "VERB", xpos: "VBD", head: 1, deprel: "parataxis" },
    { id: 8, form: "a", lemma: "a", upos: "DET", xpos: "DT", head: 9, deprel: "det" },
    { id: 9, form: "dog", lemma: "dog", upos: "NOUN", xpos: "NN", head: 7, deprel: "obj" },
    { id: 10, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 1, deprel: "punct" },
  ] },
  { name: "Being tired, John went to bed early. (correct)", expectOk: true, expectWarn: false, tokens: [
    { id: 1, form: "Being", lemma: "be", upos: "AUX", xpos: "VBG", head: 2, deprel: "cop" },
    { id: 2, form: "tired", lemma: "tired", upos: "ADJ", xpos: "JJ", head: 5, deprel: "advcl" },
    { id: 3, form: ",", lemma: ",", upos: "PUNCT", xpos: ",", head: 2, deprel: "punct" },
    { id: 4, form: "John", lemma: "John", upos: "PROPN", xpos: "NNP", head: 5, deprel: "nsubj" },
    { id: 5, form: "went", lemma: "go", upos: "VERB", xpos: "VBD", head: 0, deprel: "root" },
    { id: 6, form: "to", lemma: "to", upos: "ADP", xpos: "IN", head: 7, deprel: "case" },
    { id: 7, form: "bed", lemma: "bed", upos: "NOUN", xpos: "NN", head: 5, deprel: "obl" },
    { id: 8, form: "early", lemma: "early", upos: "ADV", xpos: "RB", head: 5, deprel: "advmod" },
    { id: 9, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 5, deprel: "punct" },
  ] },
  { name: "Being tired, John went to bed early. (wrong: root kept on \"tired\")", expectOk: false, expectWarn: false, tokens: [
    { id: 1, form: "Being", lemma: "be", upos: "AUX", xpos: "VBG", head: 2, deprel: "cop" },
    { id: 2, form: "tired", lemma: "tired", upos: "ADJ", xpos: "JJ", head: 0, deprel: "root" },
    { id: 3, form: ",", lemma: ",", upos: "PUNCT", xpos: ",", head: 2, deprel: "punct" },
    { id: 4, form: "John", lemma: "John", upos: "PROPN", xpos: "NNP", head: 2, deprel: "nsubj" },
    { id: 5, form: "went", lemma: "go", upos: "VERB", xpos: "VBD", head: 2, deprel: "parataxis" },
    { id: 6, form: "to", lemma: "to", upos: "ADP", xpos: "IN", head: 7, deprel: "case" },
    { id: 7, form: "bed", lemma: "bed", upos: "NOUN", xpos: "NN", head: 5, deprel: "obl" },
    { id: 8, form: "early", lemma: "early", upos: "ADV", xpos: "RB", head: 5, deprel: "advmod" },
    { id: 9, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 2, deprel: "punct" },
  ] },
  { name: "There was a chair in the corner. (correct existential, no warning)", expectOk: true, expectWarn: false, tokens: [
    { id: 1, form: "There", lemma: "there", upos: "PRON", xpos: "EX", head: 2, deprel: "expl" },
    { id: 2, form: "was", lemma: "be", upos: "VERB", xpos: "VBD", head: 0, deprel: "root" },
    { id: 3, form: "a", lemma: "a", upos: "DET", xpos: "DT", head: 4, deprel: "det" },
    { id: 4, form: "chair", lemma: "chair", upos: "NOUN", xpos: "NN", head: 2, deprel: "nsubj" },
    { id: 5, form: "in", lemma: "in", upos: "ADP", xpos: "IN", head: 7, deprel: "case" },
    { id: 6, form: "the", lemma: "the", upos: "DET", xpos: "DT", head: 7, deprel: "det" },
    { id: 7, form: "corner", lemma: "corner", upos: "NOUN", xpos: "NN", head: 2, deprel: "obl" },
    { id: 8, form: ".", lemma: ".", upos: "PUNCT", xpos: ".", head: 2, deprel: "punct" },
  ] },
];

function runSelfTest() {
  let failures = 0;
  for (const f of FIXTURES) {
    const { ok, findings } = checkGoldParse(f.tokens);
    const hasWarn = findings.some((x) => x.level === "warning");
    const pass = ok === f.expectOk && hasWarn === f.expectWarn;
    if (!pass) failures += 1;
    console.log(`${pass ? "PASS" : "FAIL"}  ${f.name}` +
      (findings.length ? `\n         ${findings.map((x) => `[${x.level}] ${x.message}`).join("\n         ")}` : ""));
  }
  console.log(`\n${FIXTURES.length - failures}/${FIXTURES.length} fixtures passed.`);
  if (failures) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) runSelfTest();
