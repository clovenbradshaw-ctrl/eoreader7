// referents-falsify.test.mjs — the pipeline asks WHO, not which string.
// "All of our assertions of what a word is — it's just that assertion,
//  pointing to a referent" (user, 2026-09-21).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildReferents, attachReferents } from "./referents.js";
import { buildDraft } from "./eot-draft.js";
import { anchorsFor, carries } from "./prosify.js";

const GROUND = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "cumberland-ground.md"), "utf8");
const R = buildReferents(GROUND);
const names = (t) => [...R.resolveText(t)].map((id) => R.represent(id)).sort();

test("a surname, a possessive and an article are assertions about the same being", () => {
  assert.deepEqual(names("Donelson's flatboats"), ["John Donelson"]);
  assert.deepEqual(names("Walker named it."), ["Thomas Walker"]);
  assert.deepEqual(names("the Cumberland River"), names("Cumberland River"), "an article made a second referent");
});

test("a name behind a sentence-opening word is still reached", () => {
  assert.ok(names("While the Cumberland River fueled growth, Robertson settled.").includes("James Robertson"));
});

test("a fact is carried by a sentence naming the same beings in other words", () => {
  const d = attachReferents(buildDraft({ task: "Write an essay on the role of the Cumberland River in Nashville's growth.", ground: GROUND }), R);
  const A = anchorsFor(d);
  const id = d.root.children.flatMap((p) => p.children).find((pt) => pt.text.includes("James Robertson")).id;
  assert.equal(carries(A.get(id), ["In 1779 Robertson and Donelson founded the city beside the river."]).ok, true);
  assert.equal(carries(A.get(id), ["In 1779 two settlers founded the city beside the river."]).ok, false, "a fact carried with none of its beings named");
});

test("THE LIMIT, STATED: a misspelling resolves to nothing, so it cannot carry a fact — conservative, never a wrong binding", () => {
  assert.deepEqual(names("Donelsn led the flatboats."), []);
});
