// native/tests/relations-positional.test.js — the master positional
// reader (relations-hebrew.js/relations-arabic.js's replacement) and its
// seam onto the-fold's GFP architecture (`grounding-gfp.js::makeGfpGround`,
// "role assignment is the language's own eigenvalue... a caller reading
// an inflectional, Semitic or CJK text injects that language's own slot
// organ" — user direction, verbatim: "try GFP as much as useful").
//
// `makePositionalSlots` is the answer: a `RoleConfig@1`-driven reader IS
// a concrete slot organ for a positional Semitic language, partially
// applied once and injected as `slotsOf`, never a second architecture
// built beside GFP's own injection point. This file has two kinds of
// case: fast, priors-free conformance on the adapter's own contract
// (empty array on a gap, one-slot array on a resolved relation), and a
// real end-to-end composition against real UD_Hebrew-HTB data and the
// real `grounding-gfp.js`/`relation-kinds.js`/`kernel/notes.js` — never a
// hand-typed Hebrew fixture, matching this project's own standing rule.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { extractPositionalRelation, makePositionalSlots } from "../adapters/text/relations-positional.js";
import { classifyWord, dominantClass } from "../adapters/text/wordclass.js";

const resolve = (p) => fileURLToPath(new URL(p, import.meta.url));

let hebPosPrior = null, hebProclitics = null, hebRoleConfig = null;
try {
  hebPosPrior = JSON.parse(readFileSync(resolve("../priors/pos-heb.json"), "utf8"));
  hebProclitics = new Set(JSON.parse(readFileSync(resolve("../priors/proclitics-heb.json"), "utf8")).proclitics);
  hebRoleConfig = JSON.parse(readFileSync(resolve("../priors/role-config-heb.json"), "utf8"));
} catch { /* absent priors — every case below skips by name, never fails the suite */ }
const PRIORS_ABSENT = "Hebrew priors absent (native/priors/{pos-heb,proclitics-heb,role-config-heb}.json)";

let arbPosPrior = null, arbProclitics = null, arbRoleConfig = null;
try {
  arbPosPrior = JSON.parse(readFileSync(resolve("../priors/pos-arb.json"), "utf8"));
  arbProclitics = new Set(JSON.parse(readFileSync(resolve("../priors/proclitics-arb.json"), "utf8")).proclitics);
  arbRoleConfig = JSON.parse(readFileSync(resolve("../priors/role-config-arb.json"), "utf8"));
} catch { /* absent priors — every case below skips by name, never fails the suite */ }
const ARB_PRIORS_ABSENT = "Arabic priors absent (native/priors/{pos-arb,proclitics-arb,role-config-arb}.json)";

test("makePositionalSlots: a gap (no verb found) is an empty array, never a typed reason", (t) => {
  if (!hebRoleConfig) return t.skip(PRIORS_ABSENT);
  const slotsOf = makePositionalSlots({ roleConfig: hebRoleConfig, posPrior: hebPosPrior, classifyWord, dominantClass, proclitics: hebProclitics });
  // A bare noun phrase with no verb-like word at all — matches
  // extractPositionalRelation's own documented "no_verb_found" gap.
  const slots = slotsOf("הכרטיסים הרבים");
  assert.deepEqual(slots, [], "positionalSlots/englishSlots' own 'nothing found' contract — an array, never a gap object");
});

test("makePositionalSlots: a resolved relation is a one-slot array in GFP's own {end1,label,end2} shape", (t) => {
  if (!hebRoleConfig) return t.skip(PRIORS_ABSENT);
  const slotsOf = makePositionalSlots({ roleConfig: hebRoleConfig, posPrior: hebPosPrior, classifyWord, dominantClass, proclitics: hebProclitics });
  // Real UD_Hebrew-HTB test-split specimen (he_htb-ud-test.conllu, never
  // used to build role-config-heb.json): "her players Sfat and Giles
  // scored many points" — a clean single-verb clause this reader
  // resolves fully (no gap) against the master file's own logic.
  const text = "שחקניה שפע וגיילס קלעו נקודות רבות.";
  const direct = extractPositionalRelation(text, { roleConfig: hebRoleConfig, posPrior: hebPosPrior, classifyWord, dominantClass, proclitics: hebProclitics });
  assert.equal(direct.gap, null, "the chosen specimen must resolve cleanly, or this case is testing the wrong sentence");
  const slots = slotsOf(text);
  assert.equal(slots.length, 1);
  assert.equal(slots[0].end1, direct.end1.word);
  assert.equal(slots[0].label, direct.label.word);
  assert.equal(slots[0].end2, direct.end2.word);
});

test("makePositionalSlots: options are bound once — the returned function takes text alone, matching positionalSlots/englishSlots' own single-argument contract", (t) => {
  if (!hebRoleConfig) return t.skip(PRIORS_ABSENT);
  const slotsOf = makePositionalSlots({ roleConfig: hebRoleConfig, posPrior: hebPosPrior, classifyWord, dominantClass, proclitics: hebProclitics });
  assert.equal(slotsOf.length, 1, "grounding-gfp.js calls slotsOf(text) with exactly one argument");
});

// OMNILINGUAL CLAIM, CHECKED DIRECTLY: the SAME slotsOf-injection seam
// this project already ships for English (`englishSlots`) composes with
// a Hebrew RoleConfig@1 reader with zero changes to grounding-gfp.js —
// the language's own eigenvalue is exactly the thing that varies.
let gfp = null;
let nativeTaskLog = null;
try {
  gfp = await import("../../../the-fold/grounding-gfp.js");
} catch { /* the-fold sibling absent */ }
try {
  nativeTaskLog = await import("../kernel/task-log.js");
} catch { /* absent */ }
const { makeHyperlexicon } = await import("../organs/hyperlexicon.js").catch(() => ({ makeHyperlexicon: null }));
const GFP_ABSENT = "the-fold sibling (grounding-gfp.js) or a native kernel module absent";

test("OMNILINGUAL CLAIM, CHECKED DIRECTLY: a real Hebrew RoleConfig@1 reader composes with the-fold's makeGfpGround, no changes to that module", async (t) => {
  if (!hebRoleConfig || !gfp || !makeHyperlexicon || !nativeTaskLog) return t.skip(GFP_ABSENT);
  const slotsOf = makePositionalSlots({ roleConfig: hebRoleConfig, posPrior: hebPosPrior, classifyWord, dominantClass, proclitics: hebProclitics });
  // makeHyperlexicon(taskLog) is `native/organs/hyperlexicon.js`'s own
  // text face over `kernel/notes.js` (P80) — the "identical API"
  // (createHyperlexicon/hear/foldHyperlexicon) grounding-gfp.js's own
  // `makeNotes` option was written against. grounding-gfp.js's own
  // `notesFactory = taskLog ? () => makeNotes(taskLog) : makeNotes`
  // means the real task-log module rides through as GFP's own `taskLog`
  // option, never restated here.
  const ground = gfp.makeGfpGround({ makeNotes: makeHyperlexicon, slotsOf, taskLog: nativeTaskLog });
  const text = "שחקניה שפע וגיילס קלעו נקודות רבות.";
  const result = ground({ passages: [{ text, ref: "he_htb-ud-test#specimen" }] });
  assert.equal(result.notes.length, 1, "the one resolved slot hears one note onto the hyperlexicon");
  const note = result.notes[0];
  assert.deepEqual(note.witnesses, ["he_htb-ud-test#specimen~gfp-adjacency"]);
  assert.equal(note.end1, "שפע");
  assert.equal(note.label, "קלעו");
  assert.equal(note.end2, "נקודות");
  assert.ok(note.spans?.[0]?.at?.startsWith("he_htb-ud-test#specimen#"), "P5.2: the note carries a real, addressed span, not a bare string");
});

// A SECOND language, checked directly — S120's own disclosed gap
// ("Composing an Arabic RoleConfig@1 the identical way is not separately
// demonstrated here") closed: the mechanism is language-blind by
// construction (`makePositionalSlots` takes whichever roleConfig/
// posPrior/proclitics triple a caller supplies), and this proves it
// rather than asserting it from the Hebrew case alone.
test("OMNILINGUAL CLAIM, CHECKED DIRECTLY (a second language): a real Arabic RoleConfig@1 reader composes with the SAME the-fold makeGfpGround, no changes to that module or this reader", async (t) => {
  if (!arbRoleConfig || !gfp || !makeHyperlexicon || !nativeTaskLog) return t.skip(ARB_PRIORS_ABSENT);
  const slotsOf = makePositionalSlots({ roleConfig: arbRoleConfig, posPrior: arbPosPrior, classifyWord, dominantClass, proclitics: arbProclitics });
  // Real UD_Arabic-PADT test-split specimen (ar_padt-ud-test.conllu,
  // never used to build role-config-arb.json): "President Ben Ali signs
  // an order regulating school life" — a clean single-verb clause
  // S121's own head-of-phrase filter resolves cleanly (no gap).
  const text = "الرئيس بن علي يوقع أمرا بتنظيم الحياة المدرسية";
  const direct = extractPositionalRelation(text, { roleConfig: arbRoleConfig, posPrior: arbPosPrior, classifyWord, dominantClass, proclitics: arbProclitics });
  assert.equal(direct.gap, null, "the chosen specimen must resolve cleanly, or this case is testing the wrong sentence");
  const ground = gfp.makeGfpGround({ makeNotes: makeHyperlexicon, slotsOf, taskLog: nativeTaskLog });
  const result = ground({ passages: [{ text, ref: "ar_padt-ud-test#specimen" }] });
  assert.equal(result.notes.length, 1, "the one resolved slot hears one note onto the hyperlexicon");
  const note = result.notes[0];
  assert.deepEqual(note.witnesses, ["ar_padt-ud-test#specimen~gfp-adjacency"]);
  assert.equal(note.end1, direct.end1.word);
  assert.equal(note.label, direct.label.word);
  assert.equal(note.end2, direct.end2.word);
  assert.ok(note.spans?.[0]?.at?.startsWith("ar_padt-ud-test#specimen#"), "P5.2: the note carries a real, addressed span, not a bare string");
});

test("relation-kinds.js's kindOf IS omnilingual for what it has seen (a Hebrew copula), and honestly typed-gap for what it has not (an ordinary Hebrew action verb)", async (t) => {
  if (!gfp) return t.skip(GFP_ABSENT);
  const { kindOf } = await import("../../../the-fold/relation-kinds.js");
  // COPULA already carries הוא/היא (relation-kinds.js's own closed set) —
  // the SAME cell an English "is" and a Russian copula land on, per that
  // file's own header claim, checked directly rather than trusted from
  // prose.
  const copula = kindOf("היא");
  assert.equal(copula.gap, undefined);
  assert.equal(copula.cell, "SIG·Figure");
  // An ordinary Hebrew action verb ("קלעו", scored) has no entry in any
  // of relation-kinds.js's closed English/transliterated-loanword sets —
  // a real, disclosed gap in today's omnilingual COVERAGE (the
  // MECHANISM refuses to guess; it does not yet know this word), not a
  // failure of the mechanism.
  const action = kindOf("קלעו");
  assert.equal(action.gap, "unclassed");
});
