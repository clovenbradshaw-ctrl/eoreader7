// referents.test.mjs — the capital signal, right-sized (2026-09-30).
//
// The reader finds common nominals fine (individuation.js, lowercased,
// determiner-based); the pipeline's referent index was capital-only, so on
// lowercase mechanism prose resolveText(ask) returned nothing and the live
// hypotheses sat unused — the only referent a sentence-initial "Rotating".
// Capitalisation keeps its narrow job (proper names); recurrent definite /
// possessive descriptors do the common-nominal job beside it, never as
// proper beings (they resolve asks, never join parts across sources).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildReferents, descriptorReferents, isProperReferent } from "./referents.js";

const FREEWHEEL = [
  "Bicycles use freewheels to allow the cyclist to coast without pedaling.",
  "Rotating either the wheel or cassette causes the pawl to slide over the teeth.",
  "When the cyclist stops pedaling, the ratchet slips as the wheel continues.",
  "When the cassette is rotated, the pawl catches the teeth, creating a lock.",
  "As the cyclist pedals forward, the cassette spins and the pawl drives the wheel.",
].join(" ");

test("descriptor tier: recurrent definite nominals the capital organ cannot see become resolvable", () => {
  const found = descriptorReferents(FREEWHEEL).map((d) => d.surface).sort();
  assert.deepEqual(found, ["the cassette", "the cyclist", "the pawl", "the teeth", "the wheel"]);
});

test("Freewheel ground: lowercase asks resolve to descriptor referents", () => {
  const R = buildReferents(FREEWHEEL);
  assert.equal(R.descriptors, 5);
  for (const [ask, want] of [
    ["how does the pawl catch", "the pawl"],
    ["the wheel spins while the pedals stay still", "the wheel"],
    ["the cyclist coasts without pedaling", "the cyclist"],
    ["PAWL CATCHES THE TEETH", "the pawl"],
  ]) {
    const got = [...R.resolveText(ask)].map((id) => R.represent(id));
    assert.ok(got.includes(want), `${ask} -> ${got}`);
  }
});

test("sentence-initial position is not identity: settled non-nominals never resolve as names", () => {
  const R = buildReferents(FREEWHEEL);
  assert.deepEqual([...R.resolveName("When")], [], "ADV sentence opener resolves to nothing");
  assert.deepEqual([...R.resolveText("When the cyclist stops")].filter((id) => R.represent(id) === "When"), [], "no When referent leaks through text resolution");
  // Unseen words keep the asymmetric polarity: the prior's silence is never
  // evidence against. A genuine sentence-initial name still resolves.
  const R2 = buildReferents("Napoleon invaded Russia in 1812 with the Grande Armée.");
  assert.ok([...R2.resolveName("Napoleon")].length > 0, "unseen sentence-initial name still resolves by presence");
});

test("descriptors are never proper: they resolve asks but join nothing across sources", () => {
  const R = buildReferents(FREEWHEEL);
  for (const q of ["the pawl", "the wheel", "pawl"]) {
    for (const id of R.resolveText(q)) {
      if (String(id).startsWith("ref:descriptor:")) assert.equal(isProperReferent(R, id), false);
    }
  }
});

test("name tier wins: grounds with real names keep their bindings, descriptors never compete", () => {
  const cg = readFileSync(new URL("./fixtures/cumberland-ground.md", import.meta.url), "utf8");
  const R = buildReferents(cg);
  // "the river" is a multi-word name's tail here — no competing generic id.
  for (const id of R.resolveText("the river")) {
    assert.ok(!String(id).startsWith("ref:descriptor:"), `descriptor competes with the name tier: ${id}`);
  }
  assert.ok([...R.resolveText("Cumberland River")].some((id) => R.represent(id) === "Cumberland River"));
  assert.ok([...R.resolveText("Walker")].some((id) => R.represent(id) === "Thomas Walker"));
});
