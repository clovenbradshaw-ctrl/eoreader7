// speaker.test.mjs — the boundary against REAL Dracula bytes, plus the walls.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readHeading, speakerSections, speakerAt, DOCUMENT_KINDS, meetingBoundaries, meetingSections, turnMarkerBoundaries } from "./index.js";

// Resolved from this file, not from the process cwd — the organs suite runs from
// native/ (npm run test:organs) and from the repo root (node --test), and the
// corpus sits beside the repo either way.
const DRACULA = fileURLToPath(new URL("../../../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt", import.meta.url));
const HAVE_DRACULA = existsSync(DRACULA);

test("readHeading reads Dracula's real heading shapes — possessive, from-phrase, letter-comma, and kind-only", () => {
  assert.deepEqual(readHeading("JONATHAN HARKER’S JOURNAL"), { kind: "journal", speaker: "JONATHAN HARKER", how: "possessive" });
  assert.deepEqual(readHeading("JONATHAN HARKER’S JOURNAL--_continued_"), { kind: "journal", speaker: "JONATHAN HARKER", how: "possessive" });
  assert.deepEqual(readHeading("DR. SEWARD’S DIARY"), { kind: "diary", speaker: "DR. SEWARD", how: "possessive" });
  assert.deepEqual(readHeading("_Letter from Miss Mina Murray to Miss Lucy Westenra._"), { kind: "letter", speaker: "Miss Mina Murray", how: "from-phrase" });
  assert.deepEqual(readHeading("_Letter, Lucy Westenra to Mina Murray_."), { kind: "letter", speaker: "Lucy Westenra", how: "letter-comma" });
  const log = readHeading("LOG OF THE “DEMETER.”");
  assert.equal(log.kind, "log");
  assert.equal(log.speaker, null, "a log whose writer is not in the heading declares a BOUNDARY WITHOUT A SPEAKER — typed, never guessed");
});

test("ordinary prose is never a heading — the kind-word alone does not qualify a sentence", () => {
  assert.equal(readHeading("I wrote in my journal all evening and thought of home."), null,
    "too long / prose-shaped");
  assert.equal(readHeading(""), null);
  assert.equal(readHeading("CHAPTER I"), null, "no kind-word, no heading");
});

test("THE REAL BOOK: sections carry the right speakers at the right offsets, and 'I' has a different binding per section",
  { skip: HAVE_DRACULA ? false : `corpus absent: ${DRACULA}` }, () => {
  const text = readFileSync(DRACULA, "utf8");
  const sections = speakerSections(text);
  assert.ok(sections.length >= 20, `Dracula declares its sections densely: got ${sections.length}`);

  // the opening journal is Harker's
  const first = sections[0];
  assert.match(first.speaker ?? "", /HARKER/i, JSON.stringify(first));

  // find a Seward diary section and a Mina letter — three different "I"s
  const seward = sections.find((s) => /SEWARD/i.test(s.speaker ?? ""));
  const mina = sections.find((s) => /Mina Murray/i.test(s.speaker ?? "") && s.how === "from-phrase");
  assert.ok(seward, "Dr. Seward's diary is found");
  assert.ok(mina, "Mina's letter is found");

  // an offset inside each section binds to ITS declared speaker
  assert.match(speakerAt(sections, first.headingEnd + 100) ?? "", /HARKER/i);
  assert.match(speakerAt(sections, seward.headingEnd + 100) ?? "", /SEWARD/i);
  assert.match(speakerAt(sections, mina.headingEnd + 50) ?? "", /Mina/i);

  // and the front matter is UNCLAIMED — before the first heading, nobody speaks
  assert.equal(speakerAt(sections, 10), null, "front matter binds to no one — a typed absence, never a nearest-guess");

  // the binding table never rewrites: offsets index the text AS GIVEN
  for (const s of sections.slice(0, 5))
    assert.equal(text.slice(s.start, s.headingEnd).trim(), s.heading, "the heading's span names its own bytes (P5.2)");
});

test("the genre lexicon is received, small, and declared with its giver", async () => {
  const { DOCUMENT_KINDS_META } = await import("./index.js");
  assert.ok(DOCUMENT_KINDS.length <= 10, "a closed class, not a sample of English");
  assert.match(DOCUMENT_KINDS_META.giver, /received closed class/);
});

test("meetingBoundaries reads self-introductions and chair recognitions, inline, in document order", () => {
  const text = "Good morning. I'm Deshawn Reed, I'm the director of Primary Supportive Housing. " +
    "I'm Rolanda Nguyen with Nashville VA. " +
    "The chair recognizes Nathan, who raised a question about scoring.";
  const found = meetingBoundaries(text);
  assert.equal(found.length, 3, JSON.stringify(found));
  assert.equal(found[0].speaker, "Deshawn Reed");
  assert.equal(found[0].how, "self-introduction");
  assert.equal(found[1].speaker, "Rolanda Nguyen");
  assert.match(found[1].org ?? "", /Nashville VA/);
  assert.equal(found[2].speaker, "Nathan");
  assert.equal(found[2].how, "recognition");
});

test("meetingSections holds a binding until the next declared boundary, and speakerAt reads it", () => {
  const text = "Welcome everyone. I'm Deshawn Reed, director of housing. " +
    "We have eighteen vouchers this month and referrals happen in three meetings. " +
    "I'm Rolanda Nguyen with the VA. Our team handles coordinated entry assessments.";
  const sections = meetingSections(text);
  assert.equal(sections.length, 2, JSON.stringify(sections));
  // an offset well inside Deshawn's stretch, before Rolanda's boundary, binds to Deshawn
  const midDeshawn = text.indexOf("eighteen vouchers");
  assert.equal(speakerAt(sections, midDeshawn), "Deshawn Reed");
  const midRolanda = text.indexOf("coordinated entry");
  assert.equal(speakerAt(sections, midRolanda), "Rolanda Nguyen");
  // front matter before the first boundary is unclaimed, same rule as the epistolary path
  assert.equal(speakerAt(sections, 0), null);
});

test("a bare 'recognizes' with no readable name produces no boundary — typed absence, never a guess", () => {
  const text = "Sure, recognizes. The floor is open for comments.";
  const found = meetingBoundaries(text);
  assert.equal(found.length, 0, JSON.stringify(found));
});

test("reported speech carrying a capitalized name after \"I'm\" is a disclosed false-positive risk, not silently avoided", () => {
  // ASR has no diarization: this organ reads the surface PATTERN, not who is
  // actually talking — a caller must cross-check, per the function's own
  // header. A lowercase continuation ("I'm not sure...") correctly does NOT
  // match (see the prior test); this is the case that genuinely does.
  const text = "She told the room, I'm Jordan's biggest supporter on this.";
  const found = meetingBoundaries(text);
  assert.equal(found.length, 1, "the surface pattern matches even though the true speaker is 'she', not Jordan");
  assert.equal(found[0].speaker, "Jordan's");
});

test("the meeting-boundary vocabulary is received, small, and declared with its giver", async () => {
  const { MEETING_BOUNDARY_META } = await import("./index.js");
  assert.match(MEETING_BOUNDARY_META.giver, /received closed class/);
});

test("turnMarkerBoundaries binds a name announced right before a >> marker, modeled on a real transcript specimen", () => {
  // a shape drawn from a real 2026-09-09 HPC meeting caption track: the
  // chair names who is about to speak, then the >> marks their turn start,
  // and a second >> marks the next speaker change after their remarks
  const text = "It looks like we have one person signed up for public comment. That would be Dr. John Rizo. >> Thank you. Hello. >> Thank you, Madam Chair.";
  const found = turnMarkerBoundaries(text);
  assert.equal(found.length, 2, JSON.stringify(found));
  assert.equal(found[0].speaker, "John Rizo", "the abbreviation's own internal period is a disclosed precision cost -- the title is lost, the name is not");
  assert.equal(found[0].how, "turn-marker");
  assert.equal(found[1].speaker, null, "\"Hello\" alone must not bind as a name -- the same word-count floor");
});

test("turnMarkerBoundaries refuses a bare interjection before a marker — the measured false-positive class, closed by a word-count floor, never a word list", () => {
  for (const word of ["Okay", "Yes", "Awesome", "Maybe", "Hello", "Mhm"]) {
    const text = `We appreciate that. ${word}. >> Thank you for coming today.`;
    const found = turnMarkerBoundaries(text);
    assert.equal(found[0].speaker, null, `"${word}" alone must not bind as a name: ${JSON.stringify(found[0])}`);
  }
});

test("turnMarkerBoundaries refuses a facilitator's multi-name batch — too many words to guess which name the response belongs to", () => {
  // real shape: several attendees' names read in one breath before any one
  // of them responds
  const text = "Jamie Villalobos Deonna Allen Rob Michelle Southerd >> Present, no conflict.";
  const found = turnMarkerBoundaries(text);
  assert.equal(found[0].speaker, null, JSON.stringify(found[0]));
});

test("meetingBoundaries merges turn markers and self-introductions in document order", () => {
  const text = "Welcome. >> Thank you, Madam Chair. I'm Deshawn Reed with Primary Supportive Housing.";
  const found = meetingBoundaries(text);
  const hows = found.map((b) => b.how);
  assert.deepEqual(hows, ["turn-marker", "self-introduction"], JSON.stringify(found));
});
