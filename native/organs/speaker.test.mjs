// speaker.test.mjs — the boundary against REAL Dracula bytes, plus the walls.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readHeading, speakerSections, speakerAt, DOCUMENT_KINDS } from "../eoreader7/native/organs/index.js";

const DRACULA = "../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";

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

test("THE REAL BOOK: sections carry the right speakers at the right offsets, and 'I' has a different binding per section", () => {
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
  const { DOCUMENT_KINDS_META } = await import("../eoreader7/native/organs/index.js");
  assert.ok(DOCUMENT_KINDS.length <= 10, "a closed class, not a sample of English");
  assert.match(DOCUMENT_KINDS_META.giver, /received closed class/);
});
