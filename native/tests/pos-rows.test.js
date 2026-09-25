// tests/pos-rows.test.js — rows for a language with no parser, built from
// the real Hebrew POS prior: offsets mapped, classes from the prior's own
// dominant UPOS, sentences from the ledger's spans, nothing invented for a
// form the prior never saw.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rowsFromPosPrior, dominantUpos, BASIS } from "../adapters/text/pos-rows.js";
import { cuesOf } from "../adapters/text/morph-cues.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HEB = JSON.parse(readFileSync(path.join(HERE, "..", "priors", "pos-heb.json"), "utf8"));

// two short sentences from the treebank's own register (newspaper Hebrew)
const TEXT = "הוא לא הזכיר את הדבר. היא אמרה שלום.";
const dot1 = TEXT.indexOf(".") + 1;

test("dominantUpos: the prior's most-counted class, empty for an unseen form", () => {
  assert.equal(dominantUpos(HEB, "את"), "ADP");
  assert.equal(dominantUpos(HEB, "zzzz-never-seen"), "");
  assert.equal(dominantUpos({ forms: { x: { NOUN: 2, VERB: 2 } } }, "x"), "NOUN", "ties break lexically, never by insertion order");
});

test("rows carry mapped offsets, sentence indices from the ledger's spans, ids within a sentence, and no heads", () => {
  const rows = rowsFromPosPrior(TEXT, HEB, { map: (i) => 500 + i, sentences: [[500, 500 + dot1], [500 + dot1, 500 + TEXT.length]] });
  assert.equal(rows.length, 8);
  assert.equal(rows[0].form, "הוא");
  assert.equal(rows[0].off, 500);
  assert.equal(rows[0].sentence, 0);
  assert.equal(rows[5].sentence, 1, "the second sentence starts a new span");
  assert.equal(rows[5].id, 1, "ids restart per sentence");
  assert.ok(rows.every((r) => r.head === null && r.headIndex === -1 && r.feats === "_" && r.basis === BASIS));
  assert.ok(rows.some((r) => r.upos === "VERB"), "the prior classes at least one verb");
});

test("the rows feed Sullivan's cues: class-conditioned keys, neighbours within the sentence, never an aux cue", () => {
  const rows = rowsFromPosPrior(TEXT, HEB, { sentences: [[0, dot1], [dot1, TEXT.length]] });
  const sent = { tokens: rows.filter((r) => r.sentence === 0) };
  const cues = cuesOf(sent.tokens[2], sent);
  assert.ok(cues.some(([k, key, cls]) => k === "left" && key === "לא" && cls === sent.tokens[2].upos));
  assert.ok(cues.some(([k]) => k === "lclass"));
  assert.ok(!cues.some(([k]) => k === "aux"), "no parse, no auxiliary cue");
});

test("refuses a prior without a forms table", () => {
  assert.throws(() => rowsFromPosPrior("x", {}), /forms table/);
});
