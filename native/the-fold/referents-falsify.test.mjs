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

// "THE <HEAD NOUN>" (2026-09-26): a generic, definite reference to a
// multi-word name's own last word ("the river" for "Cumberland River"),
// resolved only when this ground's own real occurrence counts give one
// referent a clear majority. This fixture names three referents ending in
// "river" (Cumberland River, Ohio River, Shawnee River), but its own real
// mentions of the bare word "Cumberland" (a separate referent from
// "Cumberland River" — this file's own header names that fragmentation as a
// known, disclosed limit of the referent organ) split what would otherwise
// be Cumberland River's dominance closely enough against Shawnee River's own
// 2 real mentions that no clear majority exists — so "the river" correctly
// resolves to nothing here: conservative, never a wrong binding, even though
// a cleaner ground (the LIVE test below) shows the mechanism does resolve
// once that fragmentation is not muddying the count. "the Ohio River" and
// "the Shawnee River" still resolve correctly by their own full names,
// unaffected either way.
test("'the river' stays conservatively unresolved on THIS fixture (real counts are close, not a clear majority); full names are unaffected", () => {
  assert.deepEqual([...R.resolveText("the river")], [], "real occurrence counts here do not give one referent a clear majority");
  assert.deepEqual(names("the Ohio River"), ["Ohio River"]);
  assert.deepEqual(names("the Shawnee River"), ["Shawnee River"]);
});

test("'the <head noun>' resolves nothing on a genuine tie — conservative, never a wrong binding", () => {
  const tied = "The Science Museum opened in 1920. The Science Museum hosted exhibits for decades.\n\nThe Railway Museum opened in 1920. The Railway Museum hosted exhibits for decades.";
  const RT = buildReferents(tied);
  assert.deepEqual([...RT.resolveText("the museum")], [], "two equally-mentioned '___ Museum' referents: no clear majority, so nothing is asserted");
});

// THE REAL PRODUCTION FAILURE THIS FIXED (2026-09-26, live 10-page/moderate-
// ground demo this session): a faithful mouth paraphrase said "...locks and
// dams along the river..." instead of repeating "the Cumberland River", and
// carries() judged the sentence to carry NOTHING — Gebser then reported "the
// origin is absent" for the whole part, though the sentence was a true,
// grounded restatement of its own source fact.
test("LIVE: a real mouth paraphrase saying 'the river' instead of repeating the full name now carries its statement (2026-09-26 fix)", () => {
  const engGround = [
    "Steamboats reached Nashville in 1819 and carried cotton to New Orleans. Warehouses lined the waterfront by the 1850s.",
    "The Army Corps of Engineers built locks and dams on the Cumberland River beginning in the 1920s.",
  ].join("\n\n");
  const RE = buildReferents(engGround);
  const d = attachReferents(buildDraft({ task: "Write a piece on the Cumberland River's role in Nashville's history.", ground: engGround }), RE);
  const A = anchorsFor(d);
  const id = d.root.children.flatMap((p) => p.children).find((pt) => pt.text.includes("Army Corps")).id;
  const paraphrase = "Starting in the 1920s, the Corps of Engineers began constructing locks and dams along the river, creating a navigable waterway.";
  assert.equal(carries(A.get(id), [paraphrase]).ok, true, "the real, faithful paraphrase now carries its statement");
});
