// stem-identity.test.mjs — the shared prefix-stem identity primitive,
// extracted from greek.mjs, tested standalone so a future second language
// adapter can trust it without re-deriving greek.mjs's own tests. Every
// word pair below was verified computationally (not eyeballed) before
// being pinned — Latin's short declension stems make LCP-by-eye
// unreliable across a whole word, the same lesson greek.mjs's own
// accent-shift comment already states for a different reason.
import test from "node:test";
import assert from "node:assert/strict";
import { stripDiacritics, sameStem, groupByStem, refOf } from "./stem-identity.js";

test("stripDiacritics drops combining marks, script-agnostic", () => {
  assert.equal(stripDiacritics("θάνατος"), "θανατος");
  assert.equal(stripDiacritics("amāre"), "amare", "a macron-marked Latin edition, same mechanism");
  assert.equal(stripDiacritics("plain"), "plain");
});

test("sameStem agrees on cased Greek variants of one word (greek.mjs's own calibration pair)", () => {
  assert.ok(sameStem("κυβερνήτης", "κυβερνήτῃ"));
});

test("sameStem agrees on cased Latin variants of one word — nominative/accusative/genitive, a real 3-way group", () => {
  assert.ok(sameStem("senator", "senatorem"));
  assert.ok(sameStem("senator", "senatoris"));
  assert.ok(sameStem("senatorem", "senatoris"));
});

test("sameStem refuses two genuinely different short-stem words sharing no real prefix", () => {
  assert.equal(sameStem("rex", "regis"), false, "shared prefix 're' is 2 chars, below the floor -- a real, disclosed limit on short Latin stems");
  assert.equal(sameStem("senator", "amicitia"), false, "no shared prefix at all");
});

test("sameStem's floor is configurable, never hidden", () => {
  assert.equal(sameStem("rex", "regis", { minLcp: 2, minRatio: 0.4 }), true, "a lowered floor admits the short-stem pair the default refuses");
  assert.equal(sameStem("rex", "regis"), false, "the default floor still refuses it");
});

test("groupByStem folds recurring candidates, drops a group below minOccurrences", () => {
  const candidates = [
    { headLower: "κυβερνήτης", at: [0, 10] },
    { headLower: "κυβερνήτῃ", at: [20, 30] },
    { headLower: "πατρίς", at: [40, 46] }, // single occurrence, dropped
  ];
  const groups = groupByStem(candidates, { minOccurrences: 2 });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].stem, "κυβερνήτης");
  assert.equal(groups[0].occurrences, 2);
  assert.equal(groups[0].members.length, 2);
  assert.deepEqual(groups[0].at, [0, 10], "at is the first member's own address");
});

test("groupByStem carries arbitrary caller fields through members untouched", () => {
  const candidates = [
    { headLower: "senator", at: [0, 7], case: "Nom" },
    { headLower: "senatoris", at: [10, 19], case: "Gen" },
  ];
  const groups = groupByStem(candidates, { minOccurrences: 2 });
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].members.map((m) => m.case), ["Nom", "Gen"]);
});

test("groupByStem sorts by occurrence count descending", () => {
  const candidates = [
    { headLower: "puella", at: [0, 6] }, { headLower: "puellam", at: [10, 17] },
    { headLower: "senator", at: [20, 27] }, { headLower: "senatoris", at: [30, 39] }, { headLower: "senatorem", at: [40, 49] },
  ];
  const groups = groupByStem(candidates, { minOccurrences: 2 });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].stem, "senator", "3 occurrences ranks first");
  assert.equal(groups[1].stem, "puella", "2 occurrences ranks second");
});

test("refOf requires a declared lang — an unaddressed ref is refused, not minted silently", () => {
  assert.throws(() => refOf("rex", [{ stem: "rex" }], {}), TypeError);
});

test("refOf binds an occurrence to a discovered group by the SAME stem comparison groupByStem used", () => {
  const groups = groupByStem([{ headLower: "senator", at: [0, 7] }, { headLower: "senatoris", at: [10, 19] }], { minOccurrences: 2 });
  assert.equal(refOf("senatorem", groups, { lang: "lat" }), "ref:lat:auto:senator");
  assert.equal(refOf("puella", groups, { lang: "lat" }), null, "no matching group");
});

test("refOf also accepts a bare iterable of stem strings (a Map's own keys)", () => {
  const stems = new Map([["θάνατος", {}]]).keys();
  assert.equal(refOf("θανάτου", stems, { lang: "grc" }), "ref:grc:auto:θάνατος");
});
