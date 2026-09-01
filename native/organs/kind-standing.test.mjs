import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { contextVectors, cosine, kindFit, kindMembership, foldPermitted } from "./kind-standing.js";

const LP = "/Users/mlacy/Documents/3.0/live_priors";
const BOOK = `${LP}/01-literature-books/gutenberg/pg345_Dracula.txt`;
const ALPHA = 0.05; // declared once for every case below, never defaulted in the module

const sent = (t, i) => ({ text: t, order: i });
const corpus = (lines) => lines.map(sent);

test("contextVectors: company only — the token before and after, sentence edges included", () => {
  const v = contextVectors(corpus(["We went to Whitby that day.", "Whitby was cold."]), ["Whitby"]);
  const w = v.get("Whitby");
  assert.equal(w.get("before=to"), 1);
  assert.equal(w.get("before=^"), 1, "sentence-initial is its own token, so position is evidence");
  assert.equal(w.get("after=was"), 1);
});

test("contextVectors: a surface with no occurrence gets no entry at all, never an empty one", () => {
  const v = contextVectors(corpus(["Nothing here."]), ["Whitby"]);
  assert.equal(v.has("Whitby"), false);
});

test("counts, not sets: a swamped context still contributes, and cosine reflects the shape", () => {
  const v = contextVectors(corpus([
    "At Whitby we waited.", "At Whitby again.", "At Whitby once more.",
    "Helsing spoke to Whitby.",
  ]), ["Whitby"]);
  const w = v.get("Whitby");
  assert.equal(w.get("before=at"), 3, "the dominant company keeps its weight");
  assert.equal(w.get("before=to"), 1, "the rare company is not erased — a set would flatten these to equal");
});

test("kindFit leaves the candidate out, so a declared member is never scored against itself", () => {
  const v = contextVectors(corpus([
    "We sailed to Varna.", "We sailed to Whitby.", "We sailed to Exeter.",
  ]), ["Varna", "Whitby", "Exeter"]);
  const f = kindFit("Varna", ["Varna", "Whitby", "Exeter"], v);
  assert.ok(f > 0.9, "identical company should read as a near-perfect fit");
  assert.equal(kindFit("Varna", ["Varna"], v), null, "a kind of only the candidate itself has no evidence");
});

test("alpha is never defaulted — an undeclared threshold throws (P4)", () => {
  const v = contextVectors(corpus(["At Whitby."]), ["Whitby"]);
  assert.throws(() => kindMembership("Whitby", ["Whitby"], v, {}), /alpha must be declared/);
});

test("a referent with no profile is UNKNOWN, never 'not a member'", () => {
  const v = contextVectors(corpus(["We sailed to Varna.", "We sailed to Whitby."]), ["Varna", "Whitby"]);
  const r = kindMembership("Nowhere", ["Varna", "Whitby"], v, { alpha: ALPHA });
  assert.equal(r.verdict, "unknown");
  assert.equal(r.reason, "no_profile");
});

test("foldPermitted ALLOWS on absent standing — a thin profile is a fact about the reader", () => {
  const v = contextVectors(corpus(["We sailed to Varna.", "We sailed to Whitby."]), ["Varna", "Whitby"]);
  const r = foldPermitted("Varna", "Nowhere", ["Varna", "Whitby"], v, { alpha: ALPHA });
  assert.equal(r.permitted, true);
  assert.equal(r.reason, "no_standing", "absence of evidence never refuses a fold");
});

// ── against the real book, real organs, no fixtures ──────────────────────
const haveBook = fs.existsSync(BOOK);
const PLACES = ["London", "Transylvania", "Bukovina", "Bistritz", "England", "Exeter", "Purfleet", "Carfax", "Whitby", "Varna"];

async function realVectors() {
  const { loadOrgans } = await import(`${LP}/scripts/eot-digest.mjs`);
  const organs = await loadOrgans();
  const { stripContainer, stripItalicsMarkup } = await import("./source.js");
  const body = stripItalicsMarkup(stripContainer(fs.readFileSync(BOOK, "utf8")).text);
  const sentences = organs.spans.splitSentences(body);
  const surfaces = organs.surfaces.extractSurfaces(sentences, {}).filter((e) => e.mentions >= 5).map((e) => e.surface);
  return contextVectors(sentences, surfaces);
}

test("THE SPECIMEN: Castle Dracula reads as a place, Count Dracula does not", { skip: !haveBook }, async () => {
  const v = await realVectors();
  const castle = kindMembership("Castle Dracula", PLACES, v, { alpha: ALPHA });
  const count = kindMembership("Count Dracula", PLACES, v, { alpha: ALPHA });
  assert.equal(castle.verdict, "member", `Castle Dracula p=${castle.p}`);
  assert.equal(count.verdict, "not_member", `Count Dracula p=${count.p}`);
  assert.ok(castle.fit > count.fit * 2, "and the separation is wide, not marginal");
});

test("THE FIX: the fold that started this is now refused, on positive evidence", { skip: !haveBook }, async () => {
  const v = await realVectors();
  const r = foldPermitted("Castle Dracula", "Count Dracula", PLACES, v, { alpha: ALPHA });
  assert.equal(r.permitted, false);
  assert.equal(r.reason, "different_kind");
});

test("CONTROL: real people are never read as places", { skip: !haveBook }, async () => {
  const v = await realVectors();
  for (const person of ["Van Helsing", "Mina", "Lucy", "Renfield"]) {
    assert.equal(kindMembership(person, PLACES, v, { alpha: ALPHA }).verdict, "not_member", person);
  }
});

test("CONTROL: the kind recovers its own declared members — 9 of 10, and the tenth is disclosed", { skip: !haveBook }, async () => {
  const v = await realVectors();
  const verdicts = PLACES.map((p) => [p, kindMembership(p, PLACES, v, { alpha: ALPHA }).verdict]);
  const members = verdicts.filter(([, x]) => x === "member").map(([p]) => p);
  assert.ok(members.length >= 9, `expected >=9 recovered, got ${members.length}: ${JSON.stringify(verdicts)}`);
  // Purfleet is genuinely marginal (p ~ 0.10) and is reported, never rounded in.
  assert.equal(members.includes("Purfleet"), false, "the marginal member stays marginal — this test pins the disclosure, not a pass");
});

test("DISCLOSED LIMIT: a thin profile lands not_member for want of evidence — East/West Cliff is NOT closed", { skip: !haveBook }, async () => {
  const v = await realVectors();
  const cliff = kindMembership("East Cliff", PLACES, v, { alpha: ALPHA });
  assert.equal(cliff.verdict, "not_member");
  assert.ok(cliff.p > 0.5, `East Cliff sits mid-population (p=${cliff.p}) — too few mentions to read, which is a fact about the reader`);
});
