// ground-ladder.test.mjs — MECHANICALLY PORTED (2026-09-28), unedited apart
// from import paths, from the-fold's own ground-ladder.test.mjs. This is
// the identical, already-adversarially-tuned test suite the-fold uses to
// hold its own copy correct, run here against the reconciled
// native/the-fold/ground-ladder.js so the two copies are verified against
// ONE shared suite rather than trusted to agree by inspection. If the-fold's
// test file changes, re-port the same mechanical way (see
// native/docs/ORGAN-CONSOLIDATION-2026-09.md).
//
import test from "node:test";
import assert from "node:assert/strict";
import { groundOf, groundLine, namesIn, TIERS } from "../the-fold/ground-ladder.js";
// P251's own real-organ requirement (never a mock standing in for the real
// coreference/referent-index organ): the REAL production bundle app.js
// wires at app.js:822-831 — cast.js's makeReferentIndex over the REAL
// eoreader7 surfaces/spans adapters — imported here so the tier-4 bare-
// pronoun-subject regression below runs against genuine coreference, not a
// hand-written resolveName stand-in.
import { extractSurfaces, extractLeadingSurfaces, discoverReferents, namesCorefer, diaNorm } from "../adapters/text/surfaces.js";
import { splitSentences as engineSentences } from "../adapters/text/spans.js";
import { makeReferentIndex } from "../organs/cast.js";

// Real production wiring, minus the POS-prior fetch (falls open exactly as
// app.js's own isCommonNoun does before posPriorCache is populated).
const isCommonNoun = () => false;
const namesCoreferGated = (a, b, opts) => namesCorefer(a, b, { ...opts, commonNoun: isCommonNoun });
const castBlankFurniture = (text) => text; // no infobox furniture in this specimen
const referentIndexFor = makeReferentIndex({
  splitSentences: engineSentences,
  extractSurfaces,
  discoverReferents,
  namesCorefer: namesCoreferGated,
  diaNorm,
  blankFurniture: castBlankFurniture,
  leadingSurfaces: extractLeadingSurfaces,
});

const passages = [{ ref: "a.txt#0-60", text: "Amelia Hartley founded the Northgate Observatory in 1887." }, { ref: "b.txt#0-40", text: "The observatory opened in 1889." }];
const ctx = { passages, model: "gemma2:2b", resolveName: (n) => (/hartley|northgate/i.test(n) ? new Set(["r1"]) : new Set()) };

test("the ladder places a sentence on its highest rung and names the cell backstage", () => {
  // NOT byte-verbatim in any passage (the passages say "founded the Northgate
  // Observatory", this says "directed") — so it cannot be caught by the
  // verbatim rung and the relation/witness/ledger rungs below are what decide.
  const s = "Amelia Hartley directed the Northgate Observatory in 1887.";
  const bound = groundOf(s, { ...ctx, claims: [{ sentence: s, end1: "Amelia Hartley", label: "directed", end2: "the Northgate Observatory in 1887", verdict: "bound", spans: [{ ref: "a.txt#0-60", start: 0, end: 57 }] }] });
  assert.equal(bound.tier, "bound"); assert.equal(bound.cell, "CON·Figure"); assert.deepEqual(bound.addresses, ["a.txt#0-60"]);
  assert.match(groundLine(bound), /^stated at a\.txt#0-60$/);
  const wit = groundOf(s, { ...ctx, witness: { sentence: s, witness: "states", decider: "founded the Northgate Observatory in 1887" } });
  assert.equal(wit.tier, "witnessed"); assert.deepEqual(wit.addresses, ["a.txt#0-60"], "the passage holding the decider is the address");
  const rec = groundOf(s, { ...ctx, claims: [{ sentence: s, end1: "Amelia Hartley", label: "founded", end2: "the Northgate Observatory in 1887", verdict: "unbound" }], notes: [{ subject: "Amelia Hartley", verb: "founded", object: "the Northgate Observatory in 1887", witnesses: ["a.txt#0-60~r1", "c.txt#5-50~r1"] }] });
  assert.equal(rec.tier, "recorded"); assert.match(rec.phrase, /2 sources/); assert.deepEqual(rec.addresses, ["a.txt#0-60", "c.txt#5-50"]);
  const con = groundOf(s, { ...ctx, claims: [{ sentence: s, end1: "Amelia Hartley", label: "founded", end2: "the Northgate Observatory in 1887", verdict: "unbound" }], notes: [{ subject: "Amelia Hartley", verb: "founded", object: "the Northgate Observatory in 1887", witnesses: ["a.txt#0-60~r1"], disputedBy: ["b.txt"] }] });
  assert.equal(con.tier, "contested"); assert.equal(con.cell, "CON·Figure·CONTESTED");
  const dv = groundOf("Rowan Vale preceded Owen Blythe.", { ...ctx, resolveName: () => new Set(), derived: [{ subject: "Rowan Vale", verb: "preceded", object: "Owen Blythe", premises: ["p1", "p2"] }] });
  assert.equal(dv.tier, "derived"); assert.deepEqual(dv.addresses, ["p1", "p2"]);
  const named = groundOf("Amelia Hartley loved comets.", ctx);
  assert.equal(named.tier, "named"); assert.deepEqual(named.names, ["Amelia Hartley"]); assert.deepEqual(named.addresses, ["a.txt#0-60"]);
  // groundLine() concatenates phrase + address with a bare space (no connecting
  // word of its own) — the "named" tier's phrase must supply that connector
  // itself, or the chip reads as a broken sentence fragment glued to a raw
  // address (measured live 2026-09-09: "names established, claim not
  // web:search-results#0-2645").
  assert.equal(groundLine(named), "names established, claim not placed at a.txt#0-60");
  // A name can resolve to a known referent (resolveName succeeds) while the
  // PASSAGES HANDED TO THIS SENTENCE never state it (passageHolding finds no
  // match) — established.length > 0 with every ref null, so addresses is
  // empty. The phrase must not trail on the bare preposition "at" with
  // nothing to follow it.
  const namedNoAddress = groundOf("The Hartley Prize honors astronomers.", ctx);
  assert.equal(namedNoAddress.tier, "named");
  assert.deepEqual(namedNoAddress.addresses, [], "the name resolves, but no given passage states it");
  assert.equal(groundLine(namedNoAddress), "names established, claim not placed", "with no address to append, the phrase must stand alone rather than dangle on a bare preposition");
  const self = groundOf("The show ran nine seasons.", { ...ctx, witness: { witness: "refused" } });
  assert.equal(self.tier, "self"); assert.equal(self.cell, "self:model"); assert.equal(groundLine(self), "gemma2:2b — no source states this");
  const unasked = groundOf("The show ran nine seasons.", { ...ctx, witness: { witness: "skipped", why: "budget" } });
  assert.equal(unasked.tier, "self"); assert.match(unasked.detail, /not asked/); assert.equal(unasked.reached.witness, false, "a rung that never reached the sentence is said so");
  assert.deepEqual(TIERS, ["verbatim", "bound", "witnessed", "recorded", "derived", "contested", "named", "self"]);
});

test("witnessed tier: the engine's own placeholder span.ref (witness-sentences.js's joined 'passages' source) is never leaked as the address — the real per-passage ref is recovered instead (live bug, 2026-09-10)", () => {
  // NOT byte-verbatim in b.txt (that passage says "The observatory opened in
  // 1889." — this says "The observatory finally opened in 1889."), so the
  // witnessed rung is what decides, not the verbatim rung above it.
  const s = "The observatory finally opened in 1889.";
  // The exact shape witness-sentences.js's rowFor/corroboration.js's span
  // builder actually produce: `span.ref` is the literal string "passages"
  // — the label for the ONE text every passage got joined into before the
  // witness was asked — never a real, individually addressable passage.
  const wit = groundOf(s, {
    ...ctx,
    witness: { sentence: s, witness: "states", decider: "The observatory opened in 1889.", span: { ref: "passages", at: "passages#12-44", text: "The observatory opened in 1889." } },
  });
  assert.equal(wit.tier, "witnessed");
  assert.deepEqual(wit.addresses, ["b.txt#0-40"], "the real passage holding the decider, never the engine's own internal placeholder");
  assert.doesNotMatch(groundLine(wit), /passages/, "the placeholder never reaches the reader's own line");
  assert.equal(groundLine(wit), "a passage states this b.txt#0-40");
});

test("a witness refusal on THIS sentence outranks the named tier's bare name-match — the stronger, more specific check wins the display (live bug, 2026-09-09)", () => {
  // "Amelia Hartley loved comets" alone lands "named" (checked above): her
  // name resolves, nothing placed the claim, and no witness was ever asked
  // about it. But when a witness WAS asked about this exact sentence and
  // came back empty, that is strictly more informative than the bare name
  // match — showing "named, not placed" here reads as a weaker, almost
  // contradictory answer sitting in front of the real one.
  const refused = groundOf("Amelia Hartley loved comets.", { ...ctx, witness: { witness: "refused" } });
  assert.equal(refused.tier, "self");
  assert.equal(refused.refused, true);
  assert.match(refused.detail, /witness was asked and no passage states it/);
  // A witness that DID find a passage still wins outright at tier 2 — this
  // fix only ever touches the case a witness came back empty, never a case
  // it came back with an answer.
  const stated = groundOf("Amelia Hartley loved comets.", { ...ctx, witness: { witness: "states", decider: "Amelia Hartley loved comets." } });
  assert.equal(stated.tier, "witnessed");
  // No witness asked at all (null/skipped) still falls through to "named" —
  // this fix narrows the named tier's reach, it does not remove it.
  const noWitness = groundOf("Amelia Hartley loved comets.", ctx);
  assert.equal(noWitness.tier, "named");
});

test("tier 4 (derived) compares referent identity when the index is available, not bare token containment — recall gained on a differently-worded alias, a false match refused between two distinct referents", () => {
  // RECALL: a derived fact phrased with a wholly different name for the
  // SAME referent (zero shared tokens with the sentence) is missed by
  // pure bag-of-words containment but found once both sides resolve
  // through the same referent index — the "holograph" comparison this
  // ladder's own header names, not a string one.
  const alias = { passages, model: "gemma2:2b", resolveName: (n) => {
    const s = n.toLowerCase();
    if (s === "amelia hartley" || s === "doctor reyes") return new Set(["r1"]);
    return new Set();
  } };
  const recall = groundOf("Amelia Hartley discovered the comet.", { ...alias, derived: [{ subject: "Doctor Reyes", verb: "discovered", object: "the comet", premises: ["p1"] }] });
  assert.equal(recall.tier, "derived", "an alias with no shared tokens still resolves to the same referent as the sentence's own name");

  // PRECISION: a derived fact's subject shares a token (the surname) with
  // the sentence's own longer name purely by coincidence — the old
  // bag-of-words subset check would have credited the sentence with a
  // fact about a DIFFERENT, distinctly-resolved referent.
  const distinct = { passages, model: "gemma2:2b", resolveName: (n) => {
    const s = n.toLowerCase();
    if (s === "amelia jane hartley") return new Set(["r1"]);
    if (s === "amelia hartley") return new Set(["r2"]);
    return new Set();
  } };
  const precision = groundOf("Amelia Jane Hartley discovered the comet.", { ...distinct, derived: [{ subject: "Amelia Hartley", verb: "discovered", object: "the comet", premises: ["p1"] }] });
  assert.notEqual(precision.tier, "derived", "the subject's tokens are a literal subset of the sentence's, but they resolve to a DIFFERENT referent — must not be credited as derived");

  // When neither side has a resolvable name (index absent, or the
  // phrasing has no capitalised name at all), this falls through to the
  // existing token check exactly as before — nothing that worked
  // regresses.
  const noIndex = groundOf("Rowan Vale preceded Owen Blythe.", { passages, model: "gemma2:2b", resolveName: () => new Set(), derived: [{ subject: "Rowan Vale", verb: "preceded", object: "Owen Blythe", premises: ["p1", "p2"] }] });
  assert.equal(noIndex.tier, "derived", "with no resolvable identity either side, the token check still applies");
});

test("tier 4 (derived): a bare-pronoun subject can never be unconditionally promoted, against the REAL coreference organ, not a mock (P251)", () => {
  // This is the falsification workflow's own reproduction (2026-09-22),
  // ported in: the REAL cast.js::makeReferentIndex, wired over the REAL
  // eoreader7 adapters/text/surfaces.js and spans.js exactly as
  // app.js:822-831 wires referentIndexFor — never a hand-written
  // resolveName stand-in. The pinned "precision" test above (built before
  // this fix) only ever exercised two multi-word proper names through a
  // hand-written regex mock, so it could not have caught this: a bare
  // pronoun never reaches namesIn's resolution path at all (L2's own
  // function-word exclusion), and the old fallback — bare token
  // containment — was vacuously true for ANY candidate sentence whenever a
  // subject/object folded to zero tokens. No control specimen, however
  // constructed, could make the old code refuse it.
  const passages2 = [
    { ref: "report.txt#0-140", text: "Harold Whitfield joined Meridian Bank in 2001. He resigned from the position of treasurer after the scandal broke." },
    { ref: "report.txt#141-260", text: "Sandra Kowalski was hired by Meridian Bank in 2010 as an auditor. She stayed with the firm for a decade before retiring." },
  ];
  const index = referentIndexFor(passages2);
  const resolveName = (n) => index.resolve(n);

  // A "derived" fact on the record whose SUBJECT is a bare, unresolved
  // pronoun — exactly the shape a real coreference-promotion step would
  // leave behind for "Harold Whitfield ... He resigned ...". Two premises,
  // matching this repo's own reused corroboration floor — deliberately, so
  // this specimen also proves a d.premises.length >= 2 bypass would NOT
  // have closed the hole (see ground-ladder.js's own comment on sideMatches
  // for why that bypass was measured and rejected rather than shipped).
  const derived = [{ subject: "He", verb: "resigned", object: "the position", premises: ["note:1", "note:2"] }];

  // CONTROL: a sentence about the OTHER, unrelated, genuinely-indexed real
  // person, sharing the verb/object vocabulary by construction so only the
  // subject side can possibly discriminate true from false.
  const control = groundOf("Sandra Kowalski resigned from the position at Meridian Bank.", { derived, resolveName, passages: passages2 });
  assert.notEqual(control.tier, "derived", "a bare-pronoun-subject derived fact must never promote onto a sentence about a different, real, indexed referent");

  // The true specimen, about the fact's own actual real subject, is held to
  // the identical standard: this fix refuses the vacuous match altogether
  // (never reopens it on a corroboration count), so it too must fall
  // through rather than being credited — an honest, disclosed recall cost,
  // not a second bug.
  const trueSpecimen = groundOf("Harold Whitfield resigned from the position after the scandal.", { derived, resolveName, passages: passages2 });
  assert.notEqual(trueSpecimen.tier, "derived", "a bare pronoun subject is never trusted through the vacuous token-containment fallback, even for the fact's own true referent — this fix refuses unconditionally rather than by identity, since no real coreference resolution is wired into this ctx");
});

test("passageHolding prefers a real, reopenable page over the search-results digest when both contain the needle (live bug, 2026-09-10: 'See original source' on a real 'named' citation opened an address that had already outlived the turn)", () => {
  const mixed = [
    { ref: "web:search-results#0-2001", text: "Amelia Hartley founded the Northgate Observatory in 1887." },
    { ref: "web:example.com-0#40-99", text: "Amelia Hartley founded the Northgate Observatory in 1887, according to historians." },
  ];
  const named = groundOf("Amelia Hartley discovered a comet.", { passages: mixed, model: "gemma2:2b", resolveName: (n) => (/hartley/i.test(n) ? new Set(["r1"]) : new Set()) });
  assert.equal(named.tier, "named");
  assert.deepEqual(named.addresses, ["web:example.com-0#40-99"], "the real per-page ref wins over the ephemeral search-results digest, even though the digest matched first");
  // When the ONLY match is the digest (no real page ever carried the
  // needle), it is still the honest answer — never refused just because
  // it is the weaker kind of address.
  const digestOnly = groundOf("Amelia Hartley discovered a comet.", { passages: [mixed[0]], model: "gemma2:2b", resolveName: (n) => (/hartley/i.test(n) ? new Set(["r1"]) : new Set()) });
  assert.deepEqual(digestOnly.addresses, ["web:search-results#0-2001"]);
});

test("self tier discloses what was fed even though nothing bound (2026-09-10, user direction: 'this should disclose sources... even if it just says it was fed content from X site, here's the related passage')", () => {
  const fedPassages = [
    { ref: "web:fdrlibrary.marist.edu-0#0-200", text: "Some unrelated sentence." },
    { ref: "web:en.wikipedia.org-0#0-200", text: "Another unrelated sentence." },
  ];
  const self = groundOf("The show ran nine seasons.", { passages: fedPassages, model: "gemma2:2b", witness: { witness: "refused" } });
  assert.equal(self.tier, "self");
  assert.deepEqual(self.fedSources, ["web:fdrlibrary.marist.edu-0", "web:en.wikipedia.org-0"]);
  assert.deepEqual(self.fedRefs, ["web:fdrlibrary.marist.edu-0#0-200", "web:en.wikipedia.org-0#0-200"], "one real ref per distinct source, so a reader can still open the bytes");
  assert.match(self.detail, /2 pages were given to the model this turn \(web:fdrlibrary\.marist\.edu-0, web:en\.wikipedia\.org-0\)/);
  assert.match(self.detail, /none was confirmed to state this/, "never claims the fed material backs the sentence — only that it existed");
  // No passages retrieved at all this turn — byte-identical to before this
  // existed: no fed fields worth mentioning, and the detail says nothing
  // about pages.
  const nothingFed = groundOf("The show ran nine seasons.", { model: "gemma2:2b", witness: { witness: "refused" } });
  assert.deepEqual(nothingFed.fedSources, []);
  assert.doesNotMatch(nothingFed.detail, /given to the model/);

  // The search-results digest sits FIRST in `passages` (gatherPreflightMaterial's
  // own build order) but is the one ref type that can never actually be
  // reopened (live bug, 2026-09-10: "See original source" always opened
  // it, even with a real fetched page fed the SAME turn). `fedRefs[0]`
  // must be the real page, not whichever source happened to sort first.
  const digestFirst = groundOf("The show ran nine seasons.", {
    passages: [{ ref: "web:search-results#0-100", text: "x" }, { ref: "web:en.wikipedia.org-0#0-200", text: "x" }],
    model: "gemma2:2b", witness: { witness: "refused" },
  });
  assert.equal(digestFirst.fedRefs[0], "web:en.wikipedia.org-0#0-200", "a real, reopenable page outranks the digest for the action button, even though the digest was fed first");
});

test("named tier discloses what was fed too, not only 'self' (2026-09-14: P187 shipped fedSources/fedRefs on the self rung alone; the named rung reaches the bottom of the ladder just as often — the witness null/skipped, not specifically refused — and left a reader with a name-match chip that said nothing about what the mouth actually had in front of it)", () => {
  const fedPassages = [
    { ref: "web:example.com-0#0-200", text: "Some unrelated sentence about weather." },
    { ref: "web:another.org-0#0-90", text: "A second unrelated sentence." },
  ];
  // The exact live gap: a name resolves (established.length > 0) but no
  // given passage states the CLAIM (addresses stays empty) — this file's
  // own pre-existing `namedNoAddress` case, now with real fed passages so
  // the disclosure has something to name.
  const namedNoAddress = groundOf("The Hartley Prize honors astronomers.", { passages: fedPassages, model: "gemma2:2b", resolveName: (n) => (/hartley/i.test(n) ? new Set(["r1"]) : new Set()) });
  assert.equal(namedNoAddress.tier, "named");
  assert.deepEqual(namedNoAddress.addresses, [], "still no passage states the claim itself");
  assert.deepEqual(namedNoAddress.fedSources, ["web:example.com-0", "web:another.org-0"], "what was retrieved this turn is named even though nothing bound");
  assert.deepEqual(namedNoAddress.fedRefs, ["web:example.com-0#0-200", "web:another.org-0#0-90"], "one real, reopenable ref per source");
  assert.match(namedNoAddress.detail, /2 pages were given to the model this turn \(web:example\.com-0, web:another\.org-0\)/);
  assert.match(namedNoAddress.detail, /none was confirmed to state this/, "never dressed up as a confirmed citation");
  assert.equal(groundLine(namedNoAddress), "names established, claim not placed", "the short chip label is unchanged — the disclosure lives in the detail, same convention as the self rung");

  // The other half of the live gap: a name resolves AND passageHolding
  // finds a passage for the NAME itself (addresses non-empty) — that
  // address vouches for the referent existing, never for the claim, so the
  // fuller fed disclosure still belongs here too.
  const withNameAddress = groundOf("Amelia Hartley loved comets.", { passages: [{ ref: "a.txt#0-60", text: "Amelia Hartley founded the Northgate Observatory in 1887." }, ...fedPassages], model: "gemma2:2b", resolveName: (n) => (/hartley/i.test(n) ? new Set(["r1"]) : new Set()) });
  assert.equal(withNameAddress.tier, "named");
  assert.deepEqual(withNameAddress.addresses, ["a.txt#0-60"]);
  assert.ok(withNameAddress.fedSources.includes("web:example.com-0") && withNameAddress.fedSources.includes("web:another.org-0"), "fed sources are named even when the entity's own address is known — that address is not the claim's");

  // No passages retrieved at all — byte-identical silence, same as the self
  // rung's own "nothing fed" case.
  const nothingFed = groundOf("The Hartley Prize honors astronomers.", { model: "gemma2:2b", resolveName: (n) => (/hartley/i.test(n) ? new Set(["r1"]) : new Set()) });
  assert.equal(nothingFed.tier, "named");
  assert.deepEqual(nothingFed.fedSources, []);
  assert.doesNotMatch(nothingFed.detail, /given to the model/);

  // The action button in app.js falls back to `g.addresses?.[0] ?? g.fedRefs?.[0]`
  // — this only does something useful if fedRefs is actually populated at
  // this rung; pinning it here so a future refactor of app.js's fallback
  // chain has something to break against.
  assert.equal(namedNoAddress.fedRefs[0], "web:example.com-0#0-200");
});

test("the named tier may not promote a name checkGrounding already found unsupported IN THIS SENTENCE — the referent index resolving a name elsewhere in the material is a real, but different, fact (live specimen: a sentence claiming a false second vice president resolved 'named, not placed' because the name was a real referent from an unrelated part of the material, while checkGrounding had already flagged this exact sentence's use of it as unsupported; groundOf never saw that finding)", () => {
  const sentence = "His vice president after Hamlin was Breckinridge.";
  const base = {
    passages: [{ ref: "lincoln.txt#0-400", text: "Hannibal Hamlin served as vice president from 1861 to 1865. John C. Breckinridge ran against Lincoln in 1860." }],
    model: "gemma2:2b",
    resolveName: (n) => (/hamlin|breckinridge/i.test(n) ? new Set(["r1"]) : new Set()),
  };
  // Without the finding: byte-identical to before this fix — both names
  // resolve, so the sentence still reads "named, not placed" (a real,
  // if weak, tier — never claim more coverage than was actually added).
  const before = groundOf(sentence, base);
  assert.equal(before.tier, "named");
  assert.deepEqual(before.names.sort(), ["Breckinridge", "Hamlin"]);

  // With checkGrounding's own finding (grounding.js's real shape: kind,
  // atomKind, text, sentence, absent) naming THIS sentence's own use of
  // "Breckinridge" as unsupported: the ladder must not call it established.
  const finding = { kind: "unsupported_claim", atomKind: "name", text: "Breckinridge", sentence: `${sentence} who was lincoln's vice president?`, absent: ["Breckinridge"], start: 0, end: 12 };
  const after = groundOf(sentence, { ...base, groundingFindings: [finding] });
  assert.equal(after.tier, "named", "Hamlin alone still establishes — a partial contradiction narrows, it does not blank, the rung");
  assert.deepEqual(after.names, ["Hamlin"], "Breckinridge dropped; Hamlin, never contradicted, stands");

  // The flagship case: the ONLY name in the sentence is the contradicted
  // one — with nothing left to establish, the ladder must fall all the way
  // through to "self" (the model's own unbacked testimony), never stop at
  // "named, not placed" the way it did live.
  const onlyBad = "Breckinridge was his vice president.";
  const onlyBadFinding = { ...finding, sentence: `${onlyBad} who was lincoln's vice president?` };
  const fallenThrough = groundOf(onlyBad, { ...base, groundingFindings: [onlyBadFinding] });
  assert.equal(fallenThrough.tier, "self", "no rung placed it once the only name was dropped — the model's own voice, not a false 'named'");

  // A finding whose own flagged text never appears in this sentence must
  // never reach across and drop an unrelated name — the match is
  // deliberately scoped to the atom's OWN text (never `finding.sentence`,
  // which carries the question appended and is not guaranteed to equal
  // groundOf's own `sentence` argument byte-for-byte — a different splitter
  // reaching the same sentence must still match on what the atom itself
  // says, not on a second sentence-identity check that could silently fail
  // to line up).
  const unrelated = groundOf(sentence, { ...base, groundingFindings: [{ ...finding, text: "Seward", absent: ["Seward"] }] });
  assert.equal(unrelated.tier, "named");
  assert.deepEqual(unrelated.names.sort(), ["Breckinridge", "Hamlin"], "unaffected — 'Seward' never appears in this sentence, so nothing here is dropped");
});

test("names in a sentence are capitalised runs, never sentence-initial function words", () => {
  assert.deepEqual(namesIn("The X-Files was created by Chris Carter and aired on Fox."), ["X-Files", "Chris Carter", "Fox"]);
  assert.deepEqual(namesIn("Some viewers loved \"I Want to Believe\" and its tagline Trust No One, said Chris Carter."), ["Trust No One", "Chris Carter"], "a lone capitalised word at the sentence's start or inside a quoted title is capitalisation, not a name; a multi-word run still counts");
  assert.deepEqual(namesIn("Despite these successes, Mulder returned."), ["Mulder"], "a lone name mid-sentence counts");
});

test("a leading ¿/¡ (Spanish, Asturian, …) marks a question/exclamation's START, not its end — the sentence-initial veto must fire the same as after start-of-string or [.!?], not leak the interrogative pronoun as a name (found cross-lingual testing, 2026-09-15, Workflow: '¿Quién es el director del Observatorio de Peñasco?' let 'Quién' leak through and defeat identitySwapped's honest-answer guarantee downstream)", () => {
  assert.deepEqual(namesIn("¿Quién es el director del Observatorio de Peñasco?"), ["Observatorio de Peñasco"], "the interrogative pronoun right after ¿ is excluded exactly as it is after start-of-string");
  assert.deepEqual(namesIn("Quién es el director del Observatorio de Peñasco?"), ["Observatorio de Peñasco"], "the same sentence with ¿ removed already worked — control");
  assert.deepEqual(namesIn("¡Que viva el Observatorio de Peñasco!"), ["Observatorio de Peñasco"], "¡ gets the same treatment as ¿");
  assert.deepEqual(namesIn("Fue idea de Mulder. ¿Quién lo dudaba?"), ["Mulder"], "¿ after a real sentence boundary still excludes the pronoun that follows it, not just at string-start");
});

test("verbatim rung: a sentence byte-for-byte (folded) in the material's own bytes is grounded there, no names/witness needed — the 2-of-8 e2e cases that were word-for-word and still read 'self' (2026-09-15)", () => {
  const vPassages = [{ ref: "chem.txt#0-40", text: "The chemical symbol for gold is Au." }];
  const v = groundOf("The chemical symbol for gold is Au.", { passages: vPassages, model: "gemma2:2b", resolveName: () => new Set(), witness: { witness: "skipped", why: "unarmed-select" } });
  assert.equal(v.tier, "verbatim"); assert.equal(v.cell, "SIG·Ground");
  assert.deepEqual(v.addresses, ["chem.txt#0-40"]);
  assert.match(v.detail, /word for word/);
  assert.equal(groundLine(v), "stated verbatim in chem.txt#0-40");
  // The SAME material states a different fact — not verbatim, no name to
  // resolve, witness never armed → genuinely the model's own voice.
  const notVerbatim = groundOf("The chemical symbol for silver is Ag.", { passages: vPassages, model: "gemma2:2b", resolveName: () => new Set(), witness: { witness: "skipped", why: "unarmed-select" } });
  assert.equal(notVerbatim.tier, "self", "a byte-verbatim rung must not over-ground a sentence the material does NOT state");
  // A short common phrase contained in a longer sentence must not fire — the
  // rung requires >= 3 content tokens (a real claim, not a stray phrase).
  const shortCommon = groundOf("Water is wet.", { passages: [{ ref: "x.txt#0-30", text: "Water is wet when it falls." }], model: "gemma2:2b", resolveName: () => new Set() });
  assert.equal(shortCommon.tier, "self", "a 3-token sentence that happens to be contained is not a claim the material states as such");
});

test("leading-names: English's sentence-initial capitalisation convention is information, not a veto — a sentence-initial name in the ANSWER is offered when opt-in, and only the referent index confirms it (2026-09-15)", () => {
  // #18/#24's answer-side names sit sentence-initial ("Jupiter is...",
  // "Shakespeare authored...") and namesIn's L2 veto used to drop them before
  // the named rung could even ask the index.
  const resolveJupiter = (n) => (n === "Jupiter" ? new Set(["r1"]) : new Set());
  const off = namesIn("Jupiter is the biggest of all the planets orbiting the Sun.");
  assert.deepEqual(off, ["Sun"], "default (veto on): the sentence-initial single token is not a name candidate");
  const on = namesIn("Jupiter is the biggest of all the planets orbiting the Sun.", { leading: true });
  assert.deepEqual(on, ["Jupiter", "Sun"], "opt-in: the sentence-initial capital is offered as a candidate");
  // A pure function word is still never a candidate, leading or not.
  assert.deepEqual(namesIn("The biggest planet is Jupiter.", { leading: true }), ["Jupiter"]);
  // Through the ladder: with leadingNames the sentence-initial name resolves
  // and the sentence lands "named"; without it, nothing establishes.
  const jup = groundOf("Jupiter is the biggest of all the planets orbiting the Sun.", { passages: [{ ref: "m.txt#0-60", text: "Jupiter is the largest planet in the solar system." }], model: "gemma2:2b", resolveName: resolveJupiter, witness: { witness: "skipped", why: "budget" }, leadingNames: true });
  assert.equal(jup.tier, "named");
  assert.deepEqual(jup.names, ["Jupiter"]);
  const jupNoLeading = groundOf("Jupiter is the biggest of all the planets orbiting the Sun.", { passages: [{ ref: "m.txt#0-60", text: "Jupiter is the largest planet in the solar system." }], model: "gemma2:2b", resolveName: resolveJupiter, witness: { witness: "skipped", why: "budget" } });
  assert.equal(jupNoLeading.tier, "self", "without the opt-in, the sentence-initial name is never asked, so nothing establishes");
});

test("human-readable sections: a chunk's own label (source.js::makeChunk's .label) is preferred over the byte address in the reader's line — 'Chapter 2' not 'a.txt#0-60' (user direction, 2026-09-15)", () => {
  const labelled = [{ ref: "a.txt#0-60", label: "Chapter 2", text: "Amelia Hartley founded the Northgate Observatory in 1887." }];
  const v = groundOf("Amelia Hartley founded the Northgate Observatory in 1887.", { passages: labelled, model: "gemma2:2b", resolveName: () => new Set() });
  assert.equal(v.tier, "verbatim");
  assert.equal(v.label, "Chapter 2");
  assert.equal(groundLine(v), "stated verbatim in Chapter 2");
  assert.deepEqual(v.addresses, ["a.txt#0-60"], "the byte ref still rides on addresses for reopen() — the label never stands in for finding the bytes");
});

test("omnilingual + typo-robust: the verbatim rung and the fold are script-neutral — Cyrillic, Hebrew, CJK, and a diacritic/typo difference still ground or refuse honestly (2026-09-15)", () => {
  // Cyrillic, byte-verbatim (fold = NFD + lowercase, script-agnostic).
  const cyr = groundOf("Наполеон вторгся в Россию в 1812 году.", { passages: [{ ref: "nap.txt#0-40", text: "Наполеон вторгся в Россию в 1812 году." }], model: "gemma2:2b", resolveName: () => new Set() });
  assert.equal(cyr.tier, "verbatim", "a Cyrillic sentence byte-verbatim in the material is grounded — no English convention involved");
  // Cyrillic, sentence-initial NAME (Cyrillic shares English's capital
  // convention, so the leading-names toggle resolves it) — R3, the e2e case.
  const cyrName = groundOf("Москва — столица России.", { passages: [{ ref: "m.txt#0-20", text: "Столица России — Москва." }], model: "gemma2:2b", resolveName: (n) => (/Москва/.test(n) ? new Set(["r1"]) : new Set()), leadingNames: true });
  assert.equal(cyrName.tier, "named", "a sentence-initial Cyrillic name resolves once the leading-names toggle offers it to the index");
  // Hebrew, no capitalisation at all — the rung needs none.
  const heb = groundOf("המים רותחים במאה מעלות צלזיוס.", { passages: [{ ref: "h.txt#0-30", text: "המים רותחים במאה מעלות צלזיוס." }], model: "gemma2:2b", resolveName: () => new Set() });
  assert.equal(heb.tier, "verbatim", "a Hebrew sentence (no case) byte-verbatim in the material is grounded");
  // CJK, byte-verbatim.
  const cjk = groundOf("化学元素金的符号是Au。", { passages: [{ ref: "c.txt#0-20", text: "化学元素金的符号是Au。" }], model: "gemma2:2b", resolveName: () => new Set() });
  assert.equal(cjk.tier, "verbatim", "a CJK sentence byte-verbatim in the material is grounded");
  // Diacritic tolerance is the fold's own (Bezúkhov/Bezukhov precedent) —
  // a byte-verbatim rung reads the bytes as they are, and a NEAR-verbatim
  // sentence with a typo is NOT falsely grounded.
  const typo = groundOf("The chemical symbol for gold is Au.", { passages: [{ ref: "t.txt#0-40", text: "The chemical symbol for gold is Au. " }], model: "gemma2:2b", resolveName: () => new Set() });
  assert.equal(typo.tier, "verbatim", "trailing-space difference folds away");
  const near = groundOf("The chemical symobl for gold is Au.", { passages: [{ ref: "t.txt#0-40", text: "The chemical symbol for gold is Au." }], model: "gemma2:2b", resolveName: () => new Set() });
  assert.equal(near.tier, "self", "a typo ('symobl') is not byte-verbatim — the rung never invents ground the bytes do not carry");
  // Hebrew typo control, the e2e's own T1: honest self, never invented ground.
  const hebTypo = groundOf("המים רוחים במאה מעלות צלזיוס.", { passages: [{ ref: "h.txt#0-30", text: "המים רותחים במאה מעלות צלזיוס." }], model: "gemma2:2b", resolveName: () => new Set() });
  assert.equal(hebTypo.tier, "self", "a Hebrew typo ('רוחים' for 'רותחים') is not byte-verbatim — the script-neutral rung refuses honestly");
  // THE PARAPHRASE WALL IS MATERIAL-SHAPED, NOT SCRIPT-SHAPED (2026-09-15,
  // measured): a single-name material — English OR non-Latin — leaves the
  // witness unarmed (no competing filler) and, without a resolvable name to
  // fall back to, the sentence is honestly self. Same shape, same verdict.
  const singleNameEn = groundOf("The great novel was written by Jane in the 1830s.", { passages: [{ ref: "e.txt#0-50", text: "The famous author Jane wrote the great novel in the 1830s." }], model: "gemma2:2b", resolveName: () => new Set(), witness: { witness: "skipped", why: "uncontained" } });
  assert.equal(singleNameEn.tier, "self", "English single-name paraphrase with no resolvable name falls to self exactly like the non-Latin cases");
  const singleNameCyr = groundOf("«Евгений Онегин» был написан Пушкиным в 1830-х годах.", { passages: [{ ref: "r.txt#0-50", text: "Пушкин написал «Евгения Онегина» в 1830-х годах." }], model: "gemma2:2b", resolveName: () => new Set(), witness: { witness: "skipped", why: "unarmed-select" } });
  assert.equal(singleNameCyr.tier, "self", "Cyrillic single-name paraphrase hits the identical wall — the boundary is material shape, not script");
});

test("the Yoda principle, wired into the recorded rung's own match (P224's disclosed gap, closed 2026-09-15): a copula/identity note matches an answer's claim regardless of which end sits before or after 'is' — word order is grammar, not meaning; a genuine role-flip still refuses", () => {
  // The material heard "the capital of France is Paris" onto the ledger
  // (kernel/notes.js's own end1/label/end2 shape). The ANSWER states the
  // identical relation in the OTHER order — "Paris is the capital of
  // France" — which claimKey's ordered string would read as a different
  // triple entirely. groundKey folds both to the same key because "is" is
  // relation-kinds.js's SIG·Figure cell — an identity claim is
  // order-independent by construction, never a string.
  const capitalNote = { subject: "capital of France", verb: "is", object: "Paris", witnesses: ["fr.txt#0-40~r1"] };
  const reordered = groundOf("Paris is the capital of France.", {
    ...ctx, resolveName: () => new Set(),
    claims: [{ sentence: "Paris is the capital of France.", end1: "Paris", label: "is", end2: "capital of France", verdict: "unbound" }],
    notes: [capitalNote],
  });
  assert.equal(reordered.tier, "recorded", "the reordered copula claim lands on the SAME ledger note, not 'self'");
  assert.deepEqual(reordered.addresses, ["fr.txt#0-40"]);
  // The YODA reorder itself — "uh, France's capital, Paris is" — states the
  // identical figure/ground pair the note already carries; a caller's own
  // relation extractor would need its own word-order-off slot organ to
  // PRODUCE this claim shape (grounding-gfp.js's own englishSlots), but once
  // produced, this rung's match no longer refuses it for its order alone.
  const yoda = groundOf("The capital of France, Paris is.", {
    ...ctx, resolveName: () => new Set(),
    claims: [{ sentence: "The capital of France, Paris is.", end1: "capital of France", label: "is", end2: "Paris", verdict: "unbound" }],
    notes: [capitalNote],
  });
  assert.equal(yoda.tier, "recorded", "the canonical-order Yoda claim matches the note directly, and the reordered one above via the same fold");
  // A ROLE-FLIP is a genuinely different, FALSE proposition ("France is the
  // capital of Paris" swaps figure and ground) — its sorted ends differ from
  // the true note's sorted ends exactly as its unsorted ends already did, so
  // the fold that admits a reorder must not also admit a flip.
  const flip = groundOf("France is the capital of Paris.", {
    ...ctx, resolveName: () => new Set(),
    claims: [{ sentence: "France is the capital of Paris.", end1: "France", label: "is", end2: "capital of Paris", verdict: "unbound" }],
    notes: [capitalNote],
  });
  assert.notEqual(flip.tier, "recorded", "a role-flip states different ends (France vs. capital of Paris) — it must never match the true note");
  // A non-identity relation (an action, CON·Figure — not SIG·Figure) is
  // UNTOUCHED by the fold: order still matters, because "Napoleon defeated
  // Kutuzov" and "Kutuzov defeated Napoleon" are not the same claim.
  const actionNote = { subject: "Napoleon", verb: "defeated", object: "Kutuzov", witnesses: ["b.txt#0-30~r1"] };
  const actionFlip = groundOf("Kutuzov defeated Napoleon.", {
    ...ctx, resolveName: () => new Set(),
    claims: [{ sentence: "Kutuzov defeated Napoleon.", end1: "Kutuzov", label: "defeated", end2: "Napoleon", verdict: "unbound" }],
    notes: [actionNote],
  });
  assert.notEqual(actionFlip.tier, "recorded", "an ACTION relation stays position-sensitive — the fold is scoped to the SIG·Figure cell alone, never a blanket order-independence");
  // Cross-lingual, per relation-kinds.js's own "omnilingual by construction"
  // claim: a Hebrew copula ("היא") lands on the identical SIG·Figure cell as
  // English "is", so the reorder-tolerance is not an English-specific patch.
  const hebNote = { subject: "עיר הבירה של צרפת", verb: "היא", object: "פריז", witnesses: ["fr-he.txt#0-30~r1"] };
  const hebReordered = groundOf("פריז היא עיר הבירה של צרפת.", {
    ...ctx, resolveName: () => new Set(),
    claims: [{ sentence: "פריז היא עיר הבירה של צרפת.", end1: "פריז", label: "היא", end2: "עיר הבירה של צרפת", verdict: "unbound" }],
    notes: [hebNote],
  });
  assert.equal(hebReordered.tier, "recorded", "the reorder-tolerance is cell-based, not script-based — a Hebrew copula reorder matches its note exactly as the English one does");
});

test("a sentence a second witness grounded says so in its detail, with why the first witness did not decide", () => {
  const s = "Amelia Hartley directed the Northgate Observatory in 1887.";
  const second = groundOf(s, { ...ctx, witness: { sentence: s, witness: "states", decider: "founded the Northgate Observatory in 1887", secondWitness: "gemma2:2b", firstWitness: "incoherent" } });
  assert.equal(second.tier, "witnessed");
  assert.match(second.detail, /asked again of gemma2:2b: the first witness said no while pointing at a sentence/);
  const plain = groundOf(s, { ...ctx, witness: { sentence: s, witness: "states", decider: "founded the Northgate Observatory in 1887" } });
  assert.doesNotMatch(plain.detail, /asked again/);
});
