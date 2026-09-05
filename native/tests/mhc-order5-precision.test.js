// mhc-order5-precision.test.js — the MHC battery's order-5 result, pinned.
//
// WHY A TEST READS A DRIVER'S NUMBER. `native/eval/the-fold/mhc-battery.mjs`
// is "a re-runnable driver, not a committed regression test" (its header),
// and its committed output reported War and Peace at stage 13 from
// 2026-08-30 to 2026-09-05 while, from the same afternoon it was measured,
// the ladder no longer produced it: the `WORKING_PASSAGES` widening
// (40 → 70, made that day to give order 10 a specimen) pulled the article's
// back matter into the candidate pool for the first time, and two organ
// defects the front matter never exercised — a letterless token ("&") not
// breaking a capitalised run, and two different sub-phrases of one anchor
// both folding into it — produced two false merges on the fold's own
// individuation rule. Order 5 failed, the stage collapsed to "none
// readable", and nothing read the number, so nothing failed.
//
// This file makes that number ENFORCED: the same computation the battery
// runs (`lib/coref-agreement.mjs`, one implementation for both), over the
// same real fixtures, on every suite run. eo-constitution III.5: a typed gap
// no test reads is a report, not an enforcement — a committed eval result is
// the same. The-fold POLICIES.md "the stale stage" (2026-09-05) carries the
// full account; READING-SPEC's paired entry the engine side.
//
// What is pinned, and what is only disclosed:
//   · zero WRONG merges (pairs the rule withholds on that the fold merged)
//     on both English fixtures — the precision the stage stands on;
//   · zero STRANDINGS (pairs the rule calls one being that the fold split)
//     — the recall half, already held before this pass;
//   · the two named false merges that found this, by name, never again;
//   · the count of forms REFUSED as ambiguous is logged, not asserted — a
//     refusal is a typed gap the occurrence layer may still close (S11), and
//     the precision fix above has a real, disclosed recall cost here
//     ("Count Ilya Rostov" against "Ilya Andreyevich": same structural
//     shape as the false merge, told apart only by world knowledge this
//     tier does not have). A test that asserted it to zero would be tuning
//     against the specimen; a test that hid it would be the drift again.
//
// The Russian fixture is NOT pinned: its order-5 failures are the disclosed
// case-form/adjective register limits (P70's third amendment, READING-SPEC
// S39/S40), not this pass's, and pinning them here would freeze a known gap
// as a target.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { splitSentences } from "../adapters/text/spans.js";
import { extractSurfaces, discoverReferents, genericTokens, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";
import { extractReadable } from "../organs/web.js";
import { corefAgreementFor } from "../eval/the-fold/lib/coref-agreement.mjs";

const FIX = new URL("../eval/the-fold/fixtures/", import.meta.url);
const organs = { splitSentences, extractSurfaces, discoverReferents, genericTokens, namesCorefer, diaNorm };

// The battery's own slice: 1200-char passages, the whole document for these
// two fixtures (61 and 67 passages, under its declared 70 cap). The text
// handed to the rule is the joined slice, exactly as the driver joins it.
const PASSAGE_CHARS = 1200;
const WORKING_PASSAGES = 70;
function materialOf(file) {
  const { text } = extractReadable(readFileSync(new URL(file, FIX), "utf8"));
  const all = [];
  for (let i = 0; i < text.length; i += PASSAGE_CHARS) {
    const s = text.slice(i, i + PASSAGE_CHARS);
    if (s.trim()) all.push(s);
  }
  return all.slice(0, WORKING_PASSAGES).join("");
}

const describe = (pairs) => pairs.map((p) => `"${p.a}" | "${p.b}"`).join("; ");

for (const [name, file] of [
  ["war-and-peace", "wikipedia-war-and-peace.html"],
  ["borodino", "wikipedia-battle-of-borodino.html"],
]) {
  test(`order 5 on ${name}: the fold merges exactly what its own individuation rule says, and nothing it withholds on`, () => {
    const c = corefAgreementFor(materialOf(file), organs);
    assert.ok(c.shouldMerge > 0, "the fixture must offer pairs the rule calls one being — a vacuous pin pins nothing");
    assert.ok(c.shouldWithhold > 0, "the fixture must offer pairs the rule withholds on — otherwise precision is untested");
    assert.equal(c.wronglyMerged.length, 0, `wrongly merged: ${describe(c.wronglyMerged)}`);
    assert.equal(c.missed.length, 0, `stranded: ${describe(c.missed)}`);
    // Disclosed, never asserted: the refusals. See the header.
    console.log(
      `  ${name}: gathered ${c.didMerge}/${c.shouldMerge}, kept apart ${c.shouldWithhold - c.wronglyMerged.length}/${c.shouldWithhold}, ` +
        `abstained ${c.abstained}, refused as ambiguous ${c.ambiguous.length}` +
        (c.ambiguous.length ? ` (${c.ambiguous.map((a) => `"${a.surface}"${a.conflictsWith ? ` vs "${a.conflictsWith}"` : ""}`).join("; ")})` : ""),
    );
  });
}

test("the two false merges that found this never recur, by name", () => {
  const text = materialOf("wikipedia-war-and-peace.html");
  const c = corefAgreementFor(text, organs);
  const same = (a, b) => c.eventId.has(a) && c.eventId.has(b) && c.eventId.get(a) === c.eventId.get(b);
  // Bug 2: two different sub-phrases of "Oxford University Press" (the
  // Translations bibliography, which also lists Cambridge and Cornell
  // University Press) must not become one referent through their shared
  // anchor.
  assert.ok(!same("Oxford University", "University Press"), "Oxford University and University Press folded into one referent again");
  // Bug 1: "Natasha, Pierre & The Great Comet of 1812" (the 2012 musical's
  // own title) must not glue across the bare "&" into a surface the
  // material never contains.
  const surfaces = new Set(extractSurfaces(splitSentences(text), {}).map((s) => s.surface));
  assert.ok(!surfaces.has("Pierre The Great Comet"), "the letterless '&' no longer breaks the run");
  assert.ok(!surfaces.has("Pierre The Great"), "the letterless '&' no longer breaks the run");
  assert.ok(!same("Great Comet", "Pierre The Great"), "Great Comet and Pierre folded into one referent again");
  // And the real astronomical referent survives as itself.
  assert.ok(c.eventId.has("Great Comet"), "the Great Comet of 1811 is still admitted as a referent");
});
