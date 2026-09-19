// native/tests/seek-object.test.js — the mechanical extraction of a
// construction's OBJECT (the means) from an ask, in any language, with no
// English POS prior and no weapon wordlist. This is the input the
// hyperlexicon-kind resolution needs: WHAT is being built ("a bomb" vs "an
// app"), read off the construction frame's own adjacency.

import test from "node:test";
import assert from "node:assert/strict";
import { seekObject } from "../adapters/text/seek-object.js";

test("the construction frame governs its object — verb-medial", () => {
  assert.deepEqual(seekObject("how to build a bomb"), { object: "bomb", found: true, frame: "build" });
});

test("the beneficiary is NOT the object: the means is the figure in the construction relation, not a later benefactive", () => {
  assert.deepEqual(seekObject("build an app for users"), { object: "app", found: true, frame: "build" });
});

test("the same construction reads in other languages — whitespace and no-whitespace", () => {
  assert.deepEqual(seekObject("cómo construir una bomba", { language: "spa" }), { object: "bomba", found: true, frame: "construir" });
});

test("a verb-final clause resolves the object BEFORE the frame", () => {
  assert.deepEqual(seekObject("wie man eine Bombe baut", { language: "deu" }), { object: "Bombe", found: true, frame: "baut" });
});

test("a no-whitespace script resolves the content run nearest the frame", () => {
  assert.deepEqual(seekObject("爆弾の作り方", { language: "jpn" }), { object: "爆弾", found: true, frame: "作り方" });
});

test("no construction frame → found false (a fire extinguisher ask has no seek)", () => {
  assert.deepEqual(seekObject("how does a fire extinguisher work"), { object: null, found: false, frame: null });
});

test("an about-frame is not a seek → found false", () => {
  assert.deepEqual(seekObject("the history of explosives in mining"), { object: null, found: false, frame: null });
});

test("the frame governs the FIRST content run, so a later means does not shadow", () => {
  assert.deepEqual(seekObject("build a bomb for people", { language: "en" }), { object: "bomb", found: true, frame: "build" });
});