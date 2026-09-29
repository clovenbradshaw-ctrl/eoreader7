// kondo.test.mjs — the tidy-prompt archon's walls, BUILT TO FAIL (II.23).
// PLANTED-CONTROL: every control here is run in BOTH directions — the planted
// waste is found, and the same prompt without it finds nothing — so a review
// that stopped looking would fail this file rather than pass it quietly.
//
// Against the REAL organs: the REAL firewall (strikeAddresses — the address
// residue this archon was built after), the REAL select protocol
// (buildSelectMessages), and the REAL Parmenides (identity is his verdict,
// never Kondo's).
import test from "node:test";
import assert from "node:assert/strict";
import { makeKondo, kondoDecision, kondoLine, unitsOf, wordsOf, tidyMaterial, TIDY_PAIRS, TIDY_NOTES_PAIR, KINDS, UNIT_FLOOR } from "./kondo.js";
import { makeParmenides } from "./parmenides.js";
import { strikeAddresses } from "./firewall.js";
import { buildSelectMessages } from "./testimony.js";

const parmenides = makeParmenides({ fold: (s) => wordsOf(s).join(" ") });
const kondo = makeKondo({ same: parmenides.same });
const sys = (content) => ({ role: "system", content });
const user = (content) => ({ role: "user", content });
const kinds = (r) => r.findings.map((f) => f.kind);
const INSTRUCTION = "You are talking with someone. Answer what they asked, in your own words.";
const SNIPS = `What the sources say, verbatim:
- Born in a one-room log cabin in Kentucky, Lincoln was raised on the frontier.
- Lincoln won the 1860 presidential election, becoming the first Republican president.`;

// ── the floor ─────────────────────────────────────────────────────────────
test("a unit of one word has no company to repeat", () => {
  assert.equal(UNIT_FLOOR, 2);
  const r = kondo.reviewCall({ messages: [sys("Yes\n\nYes"), user("Yes")] });
  assert.deepEqual(kinds(r), []);
});

// ── restated: nominated by words, decided by Parmenides ───────────────────
test("PLANTED-CONTROL — one fact given as a note and again as an expectation claim is carried twice; without the second it is not", () => {
  const planted = kondo.reviewCall({
    messages: [sys(`${INSTRUCTION}

What the sources state about this:
- Lincoln was raised on the frontier

My notes so far — what I made of the sources, which may be wrong:
- Lincoln — was raised→ on the frontier`), user("Where did Lincoln grow up?")],
  });
  const restated = planted.findings.filter((f) => f.kind === KINDS.RESTATED);
  assert.equal(restated.length, 1, "the second statement of one fact is the waste");
  assert.match(restated[0].owner, /fact-block\.js/);
  assert.match(restated[0].alsoBy, /dialogue\.js/);
  assert.match(restated[0].via, /^parmenides:/);

  const clean = kondo.reviewCall({
    messages: [sys(`${INSTRUCTION}

What the sources state about this:
- Lincoln was raised on the frontier`), user("Where did Lincoln grow up?")],
  });
  assert.deepEqual(kinds(clean), [], "nothing is carried twice when it is said once");
});

test("identity is Parmenides's verdict — a refusal is a typed gap, never a finding", () => {
  const refusing = makeKondo({ same: () => ({ verdict: "refused", detail: "no admitted form" }) });
  const r = refusing.reviewCall({ messages: [sys("- Lincoln was raised on the frontier\n\n- Lincoln was raised on the frontier")] });
  assert.deepEqual(kinds(r), []);
  assert.equal(r.gaps.filter((g) => g.type === "identity_not_same").length, 1);
});

// ── contained: the note inside the sentence it was read from ──────────────
test("a note whose every word already sits in the verbatim sentence is carried twice; a note the sentences do not carry is not", () => {
  const withNote = kondo.reviewCall({
    messages: [sys(`${INSTRUCTION}

${SNIPS}

My notes so far — what I made of the sources, which may be wrong:
- Lincoln — was raised→ on the frontier`)],
  });
  const contained = withNote.findings.filter((f) => f.kind === KINDS.CONTAINED);
  assert.equal(contained.length, 1);
  assert.match(contained[0].owner, /fact-block\.js/);
  assert.match(contained[0].carriedBy, /snip-check\.js/);

  const novel = kondo.reviewCall({
    messages: [sys(`${INSTRUCTION}

${SNIPS}

My notes so far — what I made of the sources, which may be wrong:
- Lincoln — signed→ the Emancipation Proclamation`)],
  });
  assert.deepEqual(kinds(novel), [], "a note the sentences do not already state is not waste");
});

// ── orphaned: the real firewall's own residue ─────────────────────────────
test("the real firewall's address residue is orphaned text; the same spans without addresses leave none", () => {
  const spans = [
    { ref: "lincoln.txt#0-84", text: "Born in a one-room log cabin in Kentucky, Lincoln was raised on the frontier." },
    { ref: "lincoln.txt#90-174", text: "Lincoln won the 1860 presidential election, becoming the first Republican president." },
  ];
  // holon.js's own spanBlock shape (`${sp.ref}:\n"${sp.text}"`), through the
  // wall every prompt passes at the mouth's door.
  const withRefs = strikeAddresses(`My notes so far — what I made of the sources:\n- Lincoln — was raised→ on the frontier\n\n${spans.map((sp) => `${sp.ref}:\n"${sp.text}"`).join("\n\n")}`);
  const r = kondo.reviewCall({ messages: [sys(withRefs)] });
  const orphaned = r.findings.filter((f) => f.kind === KINDS.ORPHANED);
  assert.ok(orphaned.length >= 1, `the struck addresses leave residue:\n${withRefs}`);

  const withoutRefs = strikeAddresses(`My notes so far — what I made of the sources:\n- Lincoln — was raised→ on the frontier\n\n${spans.map((sp) => `"${sp.text}"`).join("\n\n")}`);
  const clean = kondo.reviewCall({ messages: [sys(withoutRefs)] });
  assert.equal(clean.findings.filter((f) => f.kind === KINDS.ORPHANED).length, 0, "no address, no residue");
});

// ── unprefixed: the arm that cannot reuse the cache ───────────────────────
test("the select protocol's arm resends its candidate list outside the shared prefix; list first, claim last, it does not", () => {
  const candidates = [
    "Vice President Hannibal Hamlin (1861-1865) Andrew Johnson (Mar-Apr 1865)",
    "Nominees President: James Buchanan Vice President: John C. Breckinridge",
  ];
  const real = [
    { model: "olmo", messages: buildSelectMessages("Hamlin was Lincoln's first vice president.", candidates) },
    { model: "olmo", messages: buildSelectMessages("Breckinridge was Lincoln's first vice president.", candidates) },
  ];
  const un = kondo.reviewTurn(real).cross.filter((f) => f.kind === KINDS.UNPREFIXED);
  assert.equal(un.length, 1, "the arm re-sends the same numbered list after the claim that differs");
  assert.ok(un[0].chars > 100);

  const system = buildSelectMessages("x", candidates)[0].content;
  const listFirst = (claim) => [sys(system), user(`Sentences:\n${candidates.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nClaim: "${claim}"`)];
  const reordered = [
    { model: "olmo", messages: listFirst("Hamlin was Lincoln's first vice president.") },
    { model: "olmo", messages: listFirst("Breckinridge was Lincoln's first vice president.") },
  ];
  assert.deepEqual(kondo.reviewTurn(reordered).cross.filter((f) => f.kind === KINDS.UNPREFIXED), [], "the list sits inside the shared prefix and is not recomputed");
});

// ── the window: heimdall's view first, the request second, a guess never ──
test("over-window reads heimdall's loaded window first, the request second, and refuses to guess", () => {
  const long = { model: "gemma2:2b", options: { num_ctx: 4096, num_predict: 512 }, messages: [sys("x ".repeat(10000))] };
  assert.ok(kondo.reviewCall(long).findings.some((f) => f.kind === KINDS.OVER_WINDOW), "20k chars will not fit 4096 tokens");

  const heimdallSays = makeKondo({ same: parmenides.same, windowOf: () => 32768 });
  const seen = heimdallSays.reviewCall(long);
  assert.equal(seen.findings.filter((f) => f.kind === KINDS.OVER_WINDOW).length, 0, "the window a model is actually loaded at wins");
  assert.equal(seen.windowFrom, "heimdall");

  const unknown = kondo.reviewCall({ model: "gemma2:2b", messages: [sys("x ".repeat(10000))] });
  assert.equal(unknown.findings.filter((f) => f.kind === KINDS.OVER_WINDOW).length, 0);
  assert.ok(unknown.gaps.some((g) => g.type === "no_window"), "unmeasured is a gap, never a verdict");
});

test("one model asked for under two windows is a window split — heimdall's, not the builder's", () => {
  const split = kondo.reviewTurn([
    { model: "gemma2:2b", options: { num_ctx: 4096 }, messages: [user("a b c")] },
    { model: "gemma2:2b", messages: [user("d e f")] },
  ]).cross.filter((f) => f.kind === KINDS.WINDOW_SPLIT);
  assert.equal(split.length, 1);
  assert.equal(split[0].owner, "heimdall");
  assert.deepEqual(split[0].windows, [4096, "default"]);

  const oneWindow = kondo.reviewTurn([
    { model: "gemma2:2b", options: { num_ctx: 8192 }, messages: [user("a b c")] },
    { model: "gemma2:2b", options: { num_ctx: 8192 }, messages: [user("d e f")] },
  ]).cross.filter((f) => f.kind === KINDS.WINDOW_SPLIT);
  assert.deepEqual(oneWindow, []);
});

test("a turn that alternates models is disclosed for huginn, never counted as waste", () => {
  const r = kondo.reviewTurn([
    { model: "gemma2:2b", messages: [user("a b c")] },
    { model: "olmo", messages: [user("d e f")] },
    { model: "gemma2:2b", messages: [user("g h i")] },
  ]);
  assert.equal(r.models.switches, 2);
  assert.equal(r.totals.carriedTwice.chars, 0);
});

// ── the record line ───────────────────────────────────────────────────────
test("the record carries kinds, owners and counts — never the prompt's own words", () => {
  const review = kondo.reviewTurn([{
    model: "gemma2:2b",
    messages: [sys(`${INSTRUCTION}

What the sources state about this:
- Lincoln was raised on the frontier near Hodgenville

My notes so far — what I made of the sources:
- Lincoln — was raised→ on the frontier near Hodgenville`)],
  }]);
  const entry = kondoDecision({ turn: 3, where: "chat", review });
  assert.equal(entry.act, "kondo-review");
  assert.equal(entry.turn, 3);
  assert.ok(entry.findings.some((f) => f.kind === KINDS.RESTATED));
  const serialized = JSON.stringify(entry);
  assert.ok(!serialized.includes("Hodgenville"), "the record holds counts and owners, not the material");
  assert.match(kondoLine(review), /^Kondo: /);
});

// ── units ─────────────────────────────────────────────────────────────────
test("a block's header names its owner, and a quoted span inside the notes belongs to the span block", () => {
  const units = unitsOf([sys(`My notes so far — what I made of the sources:
- Lincoln — was raised→ on the frontier
"Born in a one-room log cabin in Kentucky, Lincoln was raised on the frontier."`)]);
  assert.equal(units.length, 2, "the header is not a unit");
  assert.match(units[0].owner, /fact-block\.js/);
  assert.match(units[1].owner, /spanBlock/);
});

// ── the tidy: the cut a builder can make from her findings ────────────────
// PLANTED-CONTROL: each case is run BOTH ways — the duplicate is dropped, and
// the line that only LOOKS similar survives. A tidy that cut everything, or
// nothing, fails here.
const SNIPS_B = `What the sources say, verbatim:
- Born in a one-room log cabin in Kentucky, Lincoln was raised on the frontier.
- Lincoln won the 1860 presidential election, becoming the first Republican president.`;
const NOTES_B = `My notes so far — what I made of the sources, which may be wrong; where a note and a source disagree, the source is right:
- Lincoln — was raised→ on the frontier
- Lincoln — won→ the 1860 presidential election`;
const EXPECT_B = `What the sources state about this:
- Lincoln was raised on the frontier
- Lincoln won the 1860 presidential election

Looked for and not found so far:
- whether Lincoln studied law is not stated in what was read`;
const LEDGER_B = `From earlier reading, stated in more than one place:
- Lincoln — was raised→ on the frontier (read in 2 places)
- Hamlin — was→ the 15th vice president (read in 2 places)`;
const SPANS_B = `"Born in a one-room log cabin in Kentucky, Lincoln was raised on the frontier."

"Lincoln signed the Emancipation Proclamation in 1863."`;
const PREMISE_B = `What these sources say about it:
- Lincoln was raised on the frontier [lincoln.txt#0-84]`;
const TITLE_B = "What this material is, by its own title page: Abraham Lincoln, by Wikipedia.";
const DISCOURSE_B = "The conversation so far: Lincoln was raised on the frontier and won in 1860.";
const partsOf = () => [TITLE_B, SNIPS_B, PREMISE_B, EXPECT_B, NOTES_B, LEDGER_B, SPANS_B, DISCOURSE_B];

test("a span already quoted in the snips is dropped; a span the snips do not carry survives", () => {
  const { parts, dropped } = tidyMaterial(partsOf());
  const spans = parts[6];
  assert.ok(!spans.includes("one-room log cabin"), "the sentence the snips already quote is not sent twice");
  assert.ok(spans.includes("Emancipation Proclamation"), "the span the snips do NOT carry is still sent");
  assert.ok(dropped.some((d) => /spanBlock/.test(d.owner)));
});

test("an expectation claim restating a note is dropped, a new one survives, and the voids are never touched", () => {
  const { parts } = tidyMaterial(partsOf());
  const expect = parts[3];
  assert.ok(!expect.includes("What the sources state about this:"), "a section that loses every line loses its header");
  assert.ok(expect.includes("Looked for and not found so far:"), "the void section is not a duplicate and is left alone");
  assert.ok(expect.includes("whether Lincoln studied law"), "the void's own line survives");

  const withNew = partsOf();
  withNew[3] = `What the sources state about this:
- Lincoln was raised on the frontier
- Lincoln appointed Hamlin as his first vice president`;
  const kept = tidyMaterial(withNew).parts[3];
  assert.ok(kept.includes("appointed Hamlin"), "a claim the notes do NOT carry survives");
  assert.ok(!kept.includes("was raised on the frontier"), "the one they do carry does not");
  assert.ok(kept.includes("What the sources state about this:"), "a section that keeps a line keeps its header");
});

test("a ledger note this turn already read is dropped; one it did not is kept", () => {
  const { parts } = tidyMaterial(partsOf());
  const ledger = parts[5];
  assert.ok(!ledger.includes("was raised"), "the ledger does not restate this turn's own note");
  assert.ok(ledger.includes("15th vice president"), "the ledger's own separate claim stands");
  assert.ok(ledger.includes("From earlier reading"), "its header stands with it");
});

test("blocks no pair names are never touched — premise, title page, discourse, and the snips that are KEPT", () => {
  const before = partsOf();
  const { parts } = tidyMaterial(before);
  assert.equal(parts[0], before[0], "title page");
  assert.equal(parts[1], before[1], "the snips are the verbatim carrier that is KEPT");
  assert.equal(parts[2], before[2], "a premise fact that repeats a note is the premise check's, not a duplicate");
  assert.equal(parts[4], before[4], "and the notes, which the default never cuts");
  assert.equal(parts[7], before[7], "the discourse line");
});

test("THE NOTES CUT IS AN ARM, NOT THE DEFAULT: by default a note stays even when the snips carry it; asked for, it goes", () => {
  const full = { pairs: [...TIDY_PAIRS, TIDY_NOTES_PAIR] };
  // by default the notes layer is whole — measured worse to cut it (kondo.js's
  // own header carries the numbers: 3-4 fabrications in 10 against 0)
  assert.equal(tidyMaterial(partsOf()).parts[4], partsOf()[4], "the default keeps every note");

  assert.equal(tidyMaterial(partsOf(), full).parts[4], "", "the arm cuts notes the snips already carry, header and all");

  const adds = partsOf();
  adds[4] = [
    "My notes so far — what I made of the sources, which may be wrong:",
    "- Lincoln — was raised→ on the frontier",
    "- Lincoln — delivered→ the Gettysburg Address",
  ].join("\n");
  const kept = tidyMaterial(adds, full).parts[4];
  assert.ok(kept.includes("Gettysburg"), "even under the arm, a note nothing else carries survives");
  assert.ok(!kept.includes("was raised"), "and the one the snips carry does not");
  assert.ok(kept.includes("My notes so far"), "and it keeps its framing");
});

test("NO CLAIM LEAVES THE PROMPT: everything the untidied material stated is still stated by a line that survives", () => {
  const before = partsOf();
  const after = tidyMaterial(before).parts.join("\n\n");
  const keptWords = " " + wordsOf(after).join(" ") + " ";
  const claims = before.join("\n\n").split("\n").filter((l) => /^\s*-/.test(l)).map((l) => wordsOf(l.replace(/\s*\([^()]*\)\s*$/, "")).join(" "));
  let checked = 0;
  for (const c of claims) {
    if (c.split(" ").length < 2) continue;
    checked++;
    assert.ok(keptWords.includes(" " + c + " "), 'a claim vanished from the prompt: "' + c + '"');
  }
  assert.ok(checked >= 5, "the invariant actually examined the claims (" + checked + ")");
});

test("the tidy is idempotent, and closes Kondo's own loop on the pairs it names", () => {
  const once = tidyMaterial(partsOf()).parts;
  const twice = tidyMaterial(once).parts;
  assert.deepEqual(twice, once);
  const before = kondo.reviewCall({ messages: [sys(partsOf().join("\n\n"))] });
  const after = kondo.reviewCall({ messages: [sys(once.join("\n\n"))] });
  const dup = (r) => r.findings.filter((f) => f.kind === KINDS.RESTATED || f.kind === KINDS.CONTAINED).length;
  assert.ok(dup(after) < dup(before), `duplication falls (${dup(before)} -> ${dup(after)})`);
});

test("a tidy with nothing to prune against changes nothing", () => {
  const alone = [NOTES_B, DISCOURSE_B];
  assert.deepEqual(tidyMaterial(alone).parts, alone);
});
