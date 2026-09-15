// fact-block.test.mjs — buildFactBlock, tested against the real engine
// perceiver organs (no stubs), the same freshRelationsRunner/makeRelationReader
// construction crown.test.mjs and capacity-runner.test.mjs already use.
//
// MOVED from the-fold 2026-09-14 (Phase 4 organ migration). WHICH ENGINE
// PROVIDER THIS SUITE EXERCISES: same declared switch hypergraph.test.mjs's
// own header explains — LEGACY by default, `ENGINE=native` for the
// production configuration, resolving to native automatically when the
// legacy-eoreader6.1 submodule is uninitialised.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { makeRelationReader } from "./hypergraph.js";
import { buildFactBlock, dedupeSourceText } from "./fact-block.js";

const LEGACY_PRESENT = existsSync(new URL("../../legacy-eoreader6.1/packages/engine/perceiver/text/spans.js", import.meta.url));
const PROVIDER = process.env.ENGINE === "native" || (process.env.ENGINE !== "legacy" && !LEGACY_PRESENT)
  ? "../adapters/text/"
  : "../../legacy-eoreader6.1/packages/engine/perceiver/text/";

async function freshRelations(passages) {
  const { splitSentences } = await import(PROVIDER + "spans.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(PROVIDER + "surfaces.js");
  const { discoverRelationVocab, extractRelations } = await import(PROVIDER + "relations.js");
  const { tokenize } = await import(PROVIDER + "material.js");
  return makeRelationReader({
    splitSentences,
    extractSurfaces,
    discoverReferents,
    namesCorefer,
    diaNorm,
    discoverRelationVocab,
    extractRelations,
    tokenize,
  })(passages, { pool: passages });
}

// Real specimen, reused from capacity-runner.test.mjs's own LINCOLN_TEXT
// shape (recurring names, so the referent bar clears): two passages, each
// naming a different Lincoln VP, exactly the material the live "did Hamlin
// serve the whole presidency" specimen (HYPERGRAPH-FIRST-GENERATION.md)
// used.
const PASSAGE_1 = {
  ref: "millercenter#0",
  text:
    "Hannibal Hamlin served as vice president to Abraham Lincoln from 1861 to 1865. Hamlin was Lincoln's first vice president.",
};
const PASSAGE_2 = {
  ref: "wikipedia#0",
  text:
    "Andrew Johnson served as vice president to Abraham Lincoln in 1865. Johnson succeeded Lincoln as president after the assassination.",
};

test("buildFactBlock: real material, real bound facts, no address anywhere in the output", async () => {
  const passages = [PASSAGE_1, PASSAGE_2];
  const relations = await freshRelations(passages);
  const block = buildFactBlock(relations, passages);
  assert.ok(block, "expected a real fact block from real bound claims");
  assert.ok(block.lines.length > 0);
  for (const line of block.lines) {
    assert.ok(!line.includes("["), `fact line must carry no address/ref bracket, got: ${line}`);
    assert.ok(!line.includes(PASSAGE_1.ref) && !line.includes(PASSAGE_2.ref), `fact line must not name a source ref: ${line}`);
  }
  // REVISED 2026-08-27 (firewall.js): the header used to be the literal
  // label "FACTS — read directly from your material (…)". The label and
  // its parenthetical were apparatus vocabulary; what has to survive is
  // that the block announces the facts as known and then lists them.
  // REVISED 2026-08-28: the block used to open "Known to be true:", which
  // asserts a fact about the world while having only produced a reading.
  // It is the speaking model's NOTES — provisional, and beaten by the
  // sources' own words when the two disagree.
  assert.match(block.text, /^My notes so far/, block.text);
  assert.match(block.text, /may be wrong/, "the notes state their own defeasibility");
  assert.match(block.text, /the source is right/, "and say what beats them");
  assert.ok(!block.text.includes("["), "the full rendered text must carry no bracket anywhere");
});

test("buildFactBlock: a fact stated identically in two passages appears exactly once", async () => {
  const dup = { ref: "dup#0", text: "Hannibal Hamlin served as vice president to Abraham Lincoln from 1861 to 1865." };
  const passages = [PASSAGE_1, dup];
  const relations = await freshRelations(passages);
  const block = buildFactBlock(relations, passages);
  assert.ok(block);
  const hamlinLines = block.lines.filter((l) => l.toLowerCase().includes("hannibal hamlin") && l.toLowerCase().includes("vice president"));
  assert.equal(hamlinLines.length, 1, `expected exactly one deduped line, got: ${JSON.stringify(hamlinLines)}`);
});

test("buildFactBlock: coverage is a real, honest count — not every sentence yields a bound fact", async () => {
  // The disclosed limit, exercised directly: a pronoun-subject sentence
  // ("He served...") extracts nothing (hypergraph.js's own real gap,
  // MECHANICAL-COVERAGE-INVESTIGATION.md), so it must not be silently
  // counted as covered.
  const passage = {
    ref: "mixed#0",
    text: "Hannibal Hamlin served as vice president to Abraham Lincoln. He also worked as a lawyer before that.",
  };
  const relations = await freshRelations([passage]);
  const block = buildFactBlock(relations, [passage]);
  assert.ok(block);
  assert.ok(block.coverage < 100, `expected partial coverage (a pronoun-subject sentence should not bind), got ${block.coverage}%`);
  assert.ok(block.coverage > 0, "expected the real, capitalized-subject sentence to still bind");
  // REVISED 2026-08-27 (firewall.js): the fraction used to be stated to the
  // MODEL ("7 of 97 sentence(s) with an extractable relation"). It is a
  // fact about this instrument, so it moved to the thinking — but it must
  // still be computed and reachable, which is what these fields are.
  assert.equal(block.boundSentenceCount + 0, block.boundSentenceCount, "the numerator is real and numeric");
  assert.ok(block.sentenceCount > block.boundSentenceCount, "the denominator is the real sentence count");
  assert.doesNotMatch(block.text, /sentence\(s\)/, "the count no longer rides into the model's own context");
});

test("buildFactBlock: negation renders as 'not' inline, never silently dropped", async () => {
  const passage = { ref: "neg#0", text: "Andrew Johnson never appointed Hannibal Hamlin to any office." };
  const relations = await freshRelations([passage]);
  const block = buildFactBlock(relations, [passage]);
  if (block) {
    // Real extractor sensitivity to negation phrasing is disclosed elsewhere
    // in this repo (CLAUDE.md's EVA section) — assert only IF a bound claim
    // resulted, and that when it does, negation is never silently lost.
    const hit = block.lines.find((l) => l.toLowerCase().includes("johnson") && l.toLowerCase().includes("appoint"));
    if (hit) assert.ok(hit.includes(" not "), `negated claim must render with "not": ${hit}`);
  }
});

test("buildFactBlock: capped at MAX_FACT_LINES, with the omission disclosed in text rather than silently dropped", async () => {
  // The real live specimen: 18 real bound facts from the full Hamlin
  // material (HYPERGRAPH-FIRST-GENERATION.md) — reproduced here at smaller
  // scale with a passage carrying more than 8 distinct real relations.
  // The real live specimen, verbatim (HYPERGRAPH-FIRST-GENERATION.md,
  // 2026-08-20 "salience gate" finding) — proven to produce 18 real bound
  // facts against the real engine organs; a hand-shortened fixture kept
  // measuring fewer than MAX_FACT_LINES, so the real material is reused
  // rather than guessed at again.
  const passage = {
    ref: "bio#0",
    text:
      "After Abraham Lincoln won the Republican Party nomination for President in 1860, the party turned to Hamlin as the vice presidential candidate because he had strong antislavery, pro-Union credentials and he was from the Northeast, which helped geographically balance the ticket. " +
      "After Lincoln took office and even with the outbreak of the Civil War, however, Hamlin had almost no role in the administration, as was common for this period in history. " +
      "Hamlin despised his new position as vice president. " +
      "Since Maine was sure to vote Republican whether Hamlin was on the ticket, the party wanted to widen its appeal and chose Andrew Johnson of Tennessee. " +
      "Hamlin missed becoming President by just a few weeks after Lincoln was assassinated in April 1865. " +
      "Hannibal Hamlin was the 15th vice president of the United States (1861-65) in the Republican administration of President Abraham Lincoln. " +
      "Hannibal Hamlin was born in Paris Hill, Maine, on August 27, 1809. " +
      "Hamlin served as vice president until March 4, 1865, but was rarely consulted by Lincoln while in office. " +
      "Hamlin recalled being told that Lincoln was the best story teller in the House. " +
      "Hamlin became known for supporting antislavery legislation and eventually served as vice president of the United States under President Abraham Lincoln. " +
      "Like Lincoln, Hamlin was a surveyor for a time and was a lawyer prior to entering politics. " +
      "Hamlin started as a representative in his home state of Maine. " +
      "Hannibal Hamlin of Maine served as vice president to President Abraham Lincoln in 1861-65 and was the first U.S. vice president from the Republican Party. " +
      "He served in the U.S. Senate as a Democrat from 1848 to 1857, but broke with his party over the issue of slavery.",
  };
  const relations = await freshRelations([passage]);
  const block = buildFactBlock(relations, [passage]);
  assert.ok(block);
  assert.ok(block.allLines.length > block.lines.length, "expected more real facts than the cap allows in this fixture");
  assert.ok(block.lines.length <= 8, "lines shown must never exceed MAX_FACT_LINES");
  // REVISED 2026-08-27 (firewall.js): the omission used to be disclosed in
  // the model-facing header. Disclosure is still mandatory — it just goes
  // to the reader, on the block's own `omitted` field, not into the
  // prompt, where it was one more sentence about how this app works.
  const omittedCount = block.allLines.length - block.lines.length;
  assert.equal(block.omitted, omittedCount, "the omission is disclosed as data, never silently dropped");
  assert.doesNotMatch(block.text, /omitted/, "…and no longer explained to the model");
  for (const l of block.lines) assert.ok(block.allLines.includes(l), "every shown line must be a real extracted fact");
});

test("buildFactBlock: null cases are typed gaps, never a throw or a silent empty string", async () => {
  assert.equal(buildFactBlock(null, [PASSAGE_1]), null);
  assert.equal(buildFactBlock(await freshRelations([PASSAGE_1]), []), null);
  assert.equal(buildFactBlock(await freshRelations([PASSAGE_1]), null), null);
  const empty = { ref: "empty#0", text: "" };
  assert.equal(buildFactBlock(await freshRelations([empty]), [empty]), null);
});

test("buildFactBlock: real material that yields no relation states an explicit VOID, never a vanished block", async () => {
  // Too short/nameless for discoverRelationVocab to measure anything —
  // hypergraph.js's own `report.vocabulary.gap` case.
  //
  // CONTRACT CHANGED 2026-08-26, deliberately. This used to assert `null`,
  // on the reasoning that an empty block must not read as a false success.
  // That intent is kept — what changed is that `null` did not achieve it:
  // the FACTS section simply disappeared from the prompt, leaving the model
  // passages, no facts, and no statement that there were no facts. A silent
  // absence is exactly the shape a model fills from memory, and it filled
  // it — "who was lincoln's vp?" came back "William R. Hargis", a person
  // who does not exist. User rule this now follows: give the model the
  // answer, or an explicit void in its place, never a gap.
  const passage = { ref: "tiny#0", text: "ok." };
  const relations = await freshRelations([passage]);
  const block = buildFactBlock(relations, [passage]);
  assert.ok(block, "real material must not vanish from the prompt");
  assert.equal(block.empty, true);
  assert.equal(block.lines.length, 0);
  // REVISED 2026-08-27 (firewall.js): was /FACTS — none/. The void's FORCE
  // is what this case exists to protect (the "William R. Hargis" incident);
  // the label and the extractor talk beneath it were not part of that force.
  assert.match(block.text, /I made no notes on these/, block.text);
  // The void must say what it is, not merely be short: an absence the model
  // is told to respect, rather than an empty heading it can read past.
  assert.match(block.text, /Do not fill this in from memory/, block.text);
});

test("buildFactBlock: NO material and material-that-yielded-nothing stay different facts", async () => {
  // The guard that keeps the void honest. A passage with no text examines
  // zero sentences — there is nothing to have failed to extract from, so
  // this stays `null` and the caller's own no-material disclosure handles
  // it. Claiming "none of the 0 sentences yielded a relation" would be a
  // void about nothing.
  const empty = { ref: "empty#0", text: "" };
  assert.equal(buildFactBlock(await freshRelations([empty]), [empty]), null);
});

test("buildFactBlock: a question ranks its own most relevant fact first, without dropping any other real fact", async () => {
  // The exact live specimen (HYPERGRAPH-FIRST-GENERATION.md): several true
  // facts about Hamlin, only one of which (his own term boundary) actually
  // bears on "did he serve the WHOLE presidency" — the model still has to
  // reason across it and the material's OTHER date-bearing fact, but this
  // file's own job stops at surfacing it first, not synthesizing the answer.
  const passage = {
    ref: "bio#0",
    text:
      "Hannibal Hamlin despised his position as vice president. Hamlin served as vice president to Abraham Lincoln from 1861 to 1865. Hamlin was born in Paris Hill, Maine.",
  };
  const relations = await freshRelations([passage]);
  const unranked = buildFactBlock(relations, [passage]);
  const ranked = buildFactBlock(relations, [passage], "did Hamlin serve for Lincoln's whole presidency 1861 1865");
  assert.ok(unranked && ranked);
  assert.equal(unranked.lines.length, ranked.lines.length, "ranking must never drop a real fact");
  assert.deepEqual([...unranked.lines].sort(), [...ranked.lines].sort(), "ranking is a re-order, not a re-write");
  const top = ranked.lines[0].toLowerCase();
  assert.ok(top.includes("1861") || top.includes("1865"), `expected the date-bearing fact ranked first, got: ${ranked.lines[0]}`);
});

test("buildFactBlock: an empty or all-stopword question leaves ranking a no-op (falls back to extraction order)", async () => {
  const relations = await freshRelations([PASSAGE_1]);
  const withEmpty = buildFactBlock(relations, [PASSAGE_1], "");
  const withNone = buildFactBlock(relations, [PASSAGE_1]);
  assert.deepEqual(withEmpty.lines, withNone.lines);
});

test("buildFactBlock: real adversarial control — a passage sharing no real relation with the question's own topic still only reports what it actually contains, nothing invented", async () => {
  const passage = { ref: "unrelated#0", text: "The weather in Boston was cold and rainy that week." };
  const relations = await freshRelations([passage]);
  const block = buildFactBlock(relations, [passage]);
  // Either null (nothing bound) or, if something bound, it must be about
  // weather/Boston — never a name from a DIFFERENT passage this function
  // was never given.
  if (block) {
    for (const line of block.lines) assert.ok(!/hamlin|hannibal|johnson|lincoln/i.test(line), `unrelated passage must never surface an unrelated name: ${line}`);
  }
});

// ── dedupeSourceText — the raw-material half of the salience gate ─────────

test("dedupeSourceText: pass 1 alone (no relations) catches only literal/near-literal repeats — real, honest, and NOT the full fix", () => {
  // The real specimen (HYPERGRAPH-FIRST-GENERATION.md): differently-worded
  // restatements of the SAME fact do NOT collapse on string normalization
  // alone — a real, measured limit of pass 1, not a bug. This is why pass 2
  // (relations) exists, tested separately below.
  const passages = [
    { ref: "a#0", text: "Hannibal Hamlin was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term." },
    { ref: "b#0", text: "Hannibal Hamlin was the 15th vice president of the United States (1861-65) in the Republican administration of President Abraham Lincoln." },
    { ref: "c#0", text: "Hannibal Hamlin was born in Paris Hill, Maine, on August 27, 1809." },
  ];
  const out = dedupeSourceText(passages);
  const allText = out.map((p) => p.text).join(" ");
  assert.equal((allText.match(/15th vice president/gi) ?? []).length, 2, "pass 1 alone must NOT collapse differently-worded restatements — that is pass 2's job");
  assert.ok(allText.includes("Paris Hill"));
});

test("dedupeSourceText: a literal copy-paste repeat collapses even without relations", () => {
  const passages = [
    { ref: "a#0", text: "Hamlin served as vice president." },
    { ref: "b#0", text: "Hamlin served as vice president!" }, // punctuation-only difference
  ];
  const out = dedupeSourceText(passages);
  const allText = out.map((p) => p.text).join(" ");
  assert.equal((allText.match(/served as vice president/gi) ?? []).length, 1);
});

test("dedupeSourceText: WITH relations, differently-worded restatements of the SAME extracted fact collapse — the real fix", async () => {
  const relations = await freshRelations([
    { ref: "a#0", text: "Hannibal Hamlin was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term." },
    { ref: "b#0", text: "Hannibal Hamlin was the 15th vice president of the United States (1861-65) in the Republican administration of President Abraham Lincoln." },
    { ref: "c#0", text: "Hannibal Hamlin was born in Paris Hill, Maine, on August 27, 1809." },
  ]);
  const passages = [
    { ref: "a#0", text: "Hannibal Hamlin was the 15th vice president of the United States, serving from 1861 to 1865, during President Abraham Lincoln's first term." },
    { ref: "b#0", text: "Hannibal Hamlin was the 15th vice president of the United States (1861-65) in the Republican administration of President Abraham Lincoln." },
    { ref: "c#0", text: "Hannibal Hamlin was born in Paris Hill, Maine, on August 27, 1809." },
  ];
  const out = dedupeSourceText(passages, relations);
  const allText = out.map((p) => p.text).join(" ");
  assert.equal((allText.match(/15th vice president/gi) ?? []).length, 1, "the two differently-worded restatements of the SAME bound triple must collapse to one");
  assert.ok(allText.includes("Paris Hill"), "a genuinely distinct fact (birthplace) must still survive");
});

test("dedupeSourceText: WITH relations, a sentence sharing names/dates but asserting something genuinely different is never collapsed — the adversarial case a fuzzy threshold would get wrong", async () => {
  const rawPassages = [
    { ref: "a#0", text: "Hamlin served as vice president to Abraham Lincoln from 1861 to 1865." },
    { ref: "b#0", text: "Hamlin was replaced as vice president by Andrew Johnson in 1865." },
  ];
  const relations = await freshRelations(rawPassages);
  const out = dedupeSourceText(rawPassages, relations);
  const allText = out.map((p) => p.text).join(" ");
  assert.ok(allText.includes("1861 to 1865"));
  assert.ok(allText.includes("replaced") && allText.includes("Andrew Johnson"), "a genuinely distinct, contrastive sentence must survive even when it shares names/roles with an earlier sentence");
});

test("dedupeSourceText: WITH relations, a sentence contributing ONE new fact alongside one already-seen fact still survives whole", async () => {
  const rawPassages = [
    { ref: "a#0", text: "Hamlin served as vice president to Abraham Lincoln." },
    { ref: "b#0", text: "Hamlin served as vice president to Abraham Lincoln. Hamlin was born in Maine." },
  ];
  const relations = await freshRelations(rawPassages);
  const out = dedupeSourceText(rawPassages, relations);
  const allText = out.map((p) => p.text).join(" ");
  assert.ok(allText.includes("Maine"), "a sentence must survive if it carries even ONE fact not already contributed, not be dropped wholesale for partial overlap");
});

test("dedupeSourceText: never mutates the input passages array or its objects", () => {
  const original = [{ ref: "a#0", text: "Hamlin served as vice president. Hamlin served as vice president." }];
  const snapshot = JSON.parse(JSON.stringify(original));
  dedupeSourceText(original);
  assert.deepEqual(original, snapshot, "the input passages must be untouched — callers rely on the original for citation checking");
});

test("dedupeSourceText: preserves every other field on a passage (ref, identity, …), only text is rewritten", () => {
  const passages = [{ ref: "a#0", identity: { guess: "a table" }, extra: 42, text: "One sentence here." }];
  const out = dedupeSourceText(passages);
  assert.equal(out[0].ref, "a#0");
  assert.deepEqual(out[0].identity, { guess: "a table" });
  assert.equal(out[0].extra, 42);
});

test("dedupeSourceText: null/empty inputs are handled without a throw, with or without relations", async () => {
  assert.deepEqual(dedupeSourceText([]), []);
  assert.deepEqual(dedupeSourceText(null), []);
  assert.deepEqual(dedupeSourceText([{ ref: "a#0", text: "" }]), [{ ref: "a#0", text: "" }]);
  assert.deepEqual(dedupeSourceText([], await freshRelations([PASSAGE_1])), []);
});

// ── the truncated-preview specimen (2026-09-09) ────────────────────────────
// Live turn: "I'm researching the Panama Canal's history for a documentary
// script. Who built the canal, when was it completed, and why did the
// earlier French attempt fail?" (gemma2:2b, checking + web on, no material
// attached). A fetched scribd.com page's own "AI-enhanced document" summary
// caption was extracted TWICE from that one page's raw text — once cut
// short with a trailing "…" (DuckDuckGo's own snippet convention landed the
// truncated copy in the search-result digest chunk), once in full a few
// hundred bytes later in the page's own body — and neither existing pass
// caught the duplicate: pass 1 is exact-match only (the strings differ);
// pass 2 (relations) was defeated by the clause the truncation happens to
// cut off ("...United States THAT led to its failure") producing its own
// extra, malformed triple that `covered`'s own "one new fact survives the
// whole sentence" rule correctly, but wrongly here, treated as new
// information. The model was shown the fact twice and wrote about it
// twice — once uncited, once carrying a real citation to the fuller copy.
const TRUNCATED = "The document discusses the history and challenges of the French Canal project initiated by Ferdinand de Lesseps in the 19th century, highlighting mismanagement and opposition from the United…";
const FULL_RESTATEMENT = "The document discusses the history and challenges of the French Canal project initiated by Ferdinand de Lesseps in the 19th century, highlighting mismanagement and opposition from the United States that led to its failure.";

test("dedupeSourceText: a truncated preview (trailing ellipsis) and its own fuller restatement collapse to one — WITHOUT relations", () => {
  const passages = [
    { ref: "web:search-results#0-200", text: TRUNCATED },
    { ref: "web:scribd.com-1#800-1400", text: FULL_RESTATEMENT },
  ];
  const out = dedupeSourceText(passages);
  const allText = out.map((p) => p.text).join(" ").trim();
  assert.equal(allText, FULL_RESTATEMENT, "the truncated preview must drop and the fuller sentence must survive, with no relations organ involved at all");
});

test("dedupeSourceText: the same truncated-preview specimen collapses WITH the real relations reader too (the live path)", async () => {
  const passages = [
    { ref: "web:search-results#0-200", text: TRUNCATED },
    { ref: "web:scribd.com-1#800-1400", text: FULL_RESTATEMENT },
  ];
  const relations = await freshRelations(passages);
  const out = dedupeSourceText(passages, relations);
  const allText = out.map((p) => p.text).join(" ").trim();
  assert.equal(allText, FULL_RESTATEMENT);
});

test("dedupeSourceText: the truncated-preview collapse is order-independent — full text first, truncated preview second", () => {
  const passages = [
    { ref: "web:scribd.com-1#800-1400", text: FULL_RESTATEMENT },
    { ref: "web:search-results#0-200", text: TRUNCATED },
  ];
  const out = dedupeSourceText(passages);
  const allText = out.map((p) => p.text).join(" ").trim();
  assert.equal(allText, FULL_RESTATEMENT, "a search digest is not reliably fetched before or after the full page it duplicates — the fix must not depend on which arrives first");
});

test("dedupeSourceText: a sentence ending in an ellipsis with no completing match anywhere survives untouched", () => {
  const passages = [{ ref: "a#0", text: 'He paused, then said, "I don\'t know..."' }];
  const out = dedupeSourceText(passages);
  assert.equal(out[0].text, passages[0].text, "an ellipsis with nothing to complete it is not evidence of truncation — only a real, present completion is");
});

test("dedupeSourceText: an ordinary longer sentence sharing an opening clause with an earlier one, ending normally, is never collapsed (not a truncation)", () => {
  const passages = [
    { ref: "a#0", text: "Hamlin served as vice president to Abraham Lincoln from 1861 to 1865." },
    { ref: "b#0", text: "Hamlin served as vice president to Abraham Lincoln from 1861 to 1865, but he was never close with the cabinet." },
  ];
  const out = dedupeSourceText(passages);
  const allText = out.map((p) => p.text).join(" ");
  assert.ok(allText.includes("never close with the cabinet"), "no trailing ellipsis on either sentence — a shared opening clause is not, by itself, a truncated preview, and the contrastive fact must survive");
});

test("buildFactBlock: the truncated preview's span never appears, even though its claim's spans are pooled across BOTH copies", async () => {
  const passages = [
    { ref: "web:search-results#0-200", text: TRUNCATED },
    { ref: "web:scribd.com-1#800-1400", text: FULL_RESTATEMENT },
  ];
  const relations = await freshRelations(passages);
  const fb = buildFactBlock(relations, passages, "who built the panama canal and why did the french attempt fail");
  assert.ok(fb, "expected a real fact block");
  assert.equal(fb.spans.length, 1, "only the fuller copy's span may survive");
  assert.equal(fb.spans[0].ref, "web:scribd.com-1#800-1400");
  assert.ok(!fb.spans.some((sp) => sp.text === TRUNCATED), "the truncated preview's own text must never appear as a span, whichever claim it rode in on");
});

test("buildFactBlock: the truncated preview's span is excluded order-independently too", async () => {
  const passages = [
    { ref: "web:scribd.com-1#800-1400", text: FULL_RESTATEMENT },
    { ref: "web:search-results#0-200", text: TRUNCATED },
  ];
  const relations = await freshRelations(passages);
  const fb = buildFactBlock(relations, passages, "who built the panama canal and why did the french attempt fail");
  assert.equal(fb.spans.length, 1);
  assert.equal(fb.spans[0].ref, "web:scribd.com-1#800-1400");
});
