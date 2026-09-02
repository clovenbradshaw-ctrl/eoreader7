// phasepost.test.mjs — conformance for the 27-phasepost overlay, against
// the REAL engine cube (kernel/cube.js), the REAL ActPrior@1 fixture
// (live_priors' own derived-priors/act-priors/), the REAL received
// determiner classes, and the REAL UniMorph lemmatizer — no stubs. Every
// example here is invented; the golden rows live in live_priors/goldens/
// reading/ and are scored by that repo's own eval driver, not asserted here.
//
// MOVED HERE FROM the-fold (2026-08-29) alongside phasepost.js itself —
// see that file's own header for why. This test's own cross-repo reads
// moved with it: cube.js/priors.js/morphology.js are now SIBLINGS within
// this repo (no longer `../eoreader7/...`); the ActPrior@1 fixture now
// lives in live_priors (a received lexicon is content, not code); the
// UniMorph morphology prior stays in the-fold, which still has other
// consumers of it (hypergraph.test.mjs among them) — moving only what
// this pass was actually asked to move, not everything that happened to
// be adjacent to it.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makePhasepost, headVerb, COPULA_FORMS } from "../adapters/text/phasepost.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const { cellOf } = await import(path.join(HERE, "..", "kernel", "cube.js"));
const priors = await import(path.join(HERE, "..", "adapters", "text", "priors.js"));
const morph = await import(path.join(HERE, "..", "..", "legacy-eoreader6.1", "packages", "engine", "perceiver", "text", "morphology.js"));

const actPrior = JSON.parse(fs.readFileSync(path.join(HERE, "..", "..", "..", "live_priors", "derived-priors", "act-priors", "act-prior-en.json"), "utf8"));
const morphPrior = JSON.parse(fs.readFileSync(path.join(HERE, "..", "eval", "the-fold", "fixtures", "unimorph-morphology-prior.json"), "utf8"));
const { lemmasOf } = morph.createLemmatizer(morphPrior.forms, { language: morphPrior.language });

const pp = makePhasepost({
  actPrior,
  cellOf,
  definiteDeterminers: priors.DEFINITE_DETERMINERS,
  indefiniteDeterminers: priors.INDEFINITE_DETERMINERS,
  lemmasOf: (f) => lemmasOf(f),
});

test("a unanimous lexical verb lands its declared act with the engine's own cell", () => {
  const v = pp.classify({ subject: "the storm", verb: "destroyed", object: "the granary" });
  assert.equal(v.op, "NUL");
  assert.equal(v.standing, "lexical");
  assert.equal(v.grain, "Figure"); // object present -> one thing destroyed
  assert.equal(v.cell.terrain, "Entity"); // NUL is Existence-domain; Figure grain -> Entity
  assert.match(v.via, /destroyed->destroy/); // the regular-inflection rule widened it
});

test("cell fields come from the injected engine cube, never restated", () => {
  const v = pp.classify({ subject: "the sculptor", verb: "believed", object: "the marble held a figure" });
  assert.equal(v.op, "EVA");
  assert.equal(v.grain, "Figure");
  assert.equal(v.cell.terrain, "Lens");
  assert.equal(v.cell.stance, "Binding");
});

test("a contested form stays a candidate set — never a coin-flip (P56)", () => {
  // "run" directly: VerbNet holds it in SIG (motion), CON (use/conduct) and
  // SYN (preparing) classes. NOTE, disclosed: the inflected "ran" does NOT
  // reach here — UniMorph's irregular table maps ran->rin (a dialectal
  // lemma), not ran->run, a real gap in the received prior worth knowing.
  const v = pp.classify({ subject: "the courier", verb: "run", object: "the ridge path" });
  assert.equal(v.standing, "contested");
  assert.equal(v.op, null);
  assert.ok(v.candidates.length >= 2);
  assert.ok(v.candidates.every((c) => c.cell && c.op));
});

test("an unattested verb is a typed gap, never a guess", () => {
  const v = pp.classify({ subject: "the engine", verb: "quixnorped", object: "the manifold" });
  assert.equal(v.standing, "gap");
  assert.equal(v.op, null);
  assert.match(v.because, /unattested/);
});

test("the lemmatizer widens an inflected form to its attested lemma", () => {
  const v = pp.classify({ subject: "the clerk", verb: "drew", object: "a boundary line" });
  // drew -> draw via the UniMorph irregular table; draw itself is contested
  // in VerbNet, so the verdict is contested VIA the lemma — proving the
  // widening ran, without pretending the lexicon settled it.
  assert.equal(v.standing, "contested");
  assert.match(v.via, /drew->draw/);
});

test("existential-negative subject reads NUL·Ground mechanically (A4)", () => {
  const v = pp.classify({ subject: "nothing of consequence", verb: "was", object: "in the ledger" });
  assert.equal(v.op, "NUL");
  assert.equal(v.grain, "Ground");
  assert.equal(v.standing, "mechanical");
});

test("copula + kind predicate reads SIG·Pattern (rule 2)", () => {
  const v = pp.classify({ subject: "the harbormaster", verb: "is", object: "a meticulous keeper of tides" });
  assert.equal(v.op, "SIG");
  assert.equal(v.grain, "Pattern");
  assert.equal(v.standing, "copula");
});

test("copula + unique-role predicate reads SIG·Figure (rule 3)", () => {
  const v = pp.classify({ subject: "the lighthouse", verb: "is", object: "the tallest structure on the cape" });
  assert.equal(v.op, "SIG");
  assert.equal(v.grain, "Figure");
});

test("copula + locative predicate reads SIG·Ground (rule 5)", () => {
  const v = pp.classify({ subject: "the archive", verb: "was", object: "in the cellar during the flood" });
  assert.equal(v.op, "SIG");
  assert.equal(v.grain, "Ground");
});

test("copula + participle routes to the participial verb's own act (rule 1)", () => {
  const v = pp.classify({ subject: "the bell tower", verb: "was", object: "destroyed by the quake" });
  assert.equal(v.op, "NUL");
  assert.equal(v.standing, "copula-participle");
});

test("a phrasal relation strips its auxiliary group to the act-bearing head", () => {
  assert.equal(headVerb("have pledged themselves to achieve").head, "pledged");
  assert.equal(headVerb("is considered").head, "considered");
  assert.equal(headVerb("is considered").copula, true);
  assert.equal(headVerb("was").head, null);
  assert.equal(headVerb("was").copula, true);
});

test("universal-quantified subject promotes grain to Pattern", () => {
  const v = pp.classify({ subject: "all migratory cranes", verb: "cross", object: "the delta" });
  assert.equal(v.grain, "Pattern");
});

test("no object lands Ground grain — an intransitive's own unfolding", () => {
  const g = pp.grainOf({ subject: "the sentry", object: null });
  assert.equal(g.grain, "Ground");
});

test("the overlay never edits the edge it reads", () => {
  const edge = Object.freeze({ subject: "the crate", verb: "contained", object: "the survey maps" });
  const v = pp.classify(edge);
  assert.equal(v.op, "CON"); // contain-15.4/comprise-107.2/fit-54.3 — unanimous
  assert.equal(edge.verb, "contained");
});

test("have/has/had standing alone is the possession main verb, never stripped as auxiliary", () => {
  assert.equal(headVerb("had").head, "have");
  assert.equal(headVerb("have pledged").head, "pledged");
  const v = pp.classify({ subject: "the atlas", verb: "had", object: "forty plates of the coastline" });
  assert.notEqual(v.standing, "gap");
});

test("a productive re- prefix offers REC as a disclosed candidate, never an override", () => {
  const v = pp.classify({ subject: "the council", verb: "reaffirmed", object: "its charter" });
  assert.equal(v.standing, "contested");
  assert.ok(v.candidates.some((c) => c.op === "REC"));
  assert.ok(v.candidates.length >= 2, "the lexicon's own reading must survive beside REC");
  assert.match(v.because, /morphological re-/);
});
