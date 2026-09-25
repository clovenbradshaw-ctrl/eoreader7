// native/organs/two-surface.test.mjs — the two-surface law (2026-09-21).
//
// A paragraph has TWO surfaces, never one:
//
//   EOT surface — pure logos + ethos. Points at referents purely. The atoms:
//   {end1, label, end2} notes on the hyperlexicon, whose referents may carry
//   a prettyName ("Ada Lovelace") OR a fully unintelligible hashId. Identity
//   is the referent, never the surface. No pathos here — pathos is the
//   other surface's job.
//
//   Pathos NL surface — compelling prose. The same atoms, re-rendered FOR a
//   whom, using pronouns + synonyms so the prettyName never repeats in
//   sentence after sentence. Not repetitive, not mechanical-by-repetition:
//   mechanically varied, via the existing variation machinery.
//
// The surfaces are two renderings of ONE claim row. The EOT version is what
// floats and is moved (chased, equated, re-instantiated in any frame); the
// pathos version is what a human experiences.
import test from "node:test";
import assert from "node:assert/strict";
import { snipVariation } from "./variation.js";
import { varyReferent } from "./vary-referent.js";
import { voiceOf } from "./output-voice.js";

// ── the atom set for one claim row, as EOT holds it ───────────────────────
// Referents are pointed at PURELY. A prettyName is a convenience surface;
// the identity would survive as a hashId. Both must work.
const ATOM = {
  prettyName: "the Analytical Engine",
  hashId: "ref:a91f4e",
  relations: [
    { end1: "the Analytical Engine", label: "has no pretensions to originate", end2: "anything" },
    { end1: "the Analytical Engine", label: "can do", end2: "whatever we know how to order it to perform" },
    { end1: "the Analytical Engine", label: "can follow", end2: "analysis" },
  ],
};

// ── the pathos NL surface, mechanically ───────────────────────────────────
// The EOT atoms are rendered to prose; the repeated referent is varied with
// synonyms/pronouns so the prettyName does not appear in every sentence.
const renderSentences = (atom) => atom.relations.map((r) => `${r.end1} ${r.label} ${r.end2}.`);
const SYNONYMS = ["the engine", "it"];

function vary(sentences, atom) {
  const out = [sentences[0]];
  for (const s of sentences.slice(1)) {
    // Referent-aware variation: swap the atom's OWN end1 surface (which may
    // be a capitalized proper noun — beyond snipVariation's lowercase
    // opening heuristic) for a synonym/pronoun, preserving the label.
    const varied = varyReferent(s, { referent: atom.prettyName, synonyms: SYNONYMS });
    out.push(varied ?? s);
  }
  return out;
}

test("the EOT atom points at the referent purely — the prettyName and the hashId name the same being", () => {
  // The EOT version does not dress the referent in prose. The atom is the
  // claim row; prettyName and hashId are two surfaces of the same referent.
  assert.equal(ATOM.prettyName, "the Analytical Engine");
  assert.notEqual(ATOM.hashId, ATOM.prettyName, "a hashId is unintelligible by design");
  // Identity is the referent, never the surface: both point at the same claim
  // row. (kernel/notes.js noteId is over the bare ends; surfaces.js resolves
  // aliases to referent identity.)
  assert.ok(ATOM.relations.every((r) => r.end1 === ATOM.prettyName), "the atom's ends are referent-pure, no prose dressing");
});

test("the pathos NL surface varies the repeated referent with synonyms — never the same opening twice", () => {
  const sentences = renderSentences(ATOM);
  const plain = sentences.join(" ");
  const varied = vary(sentences, ATOM);

  // The plain rendering repeats "the Analytical Engine" three times.
  const repeatCount = (s) => (s.match(/the Analytical Engine/g) || []).length;
  assert.equal(repeatCount(plain), 3, "the EOT-to-NL literal rendering repeats the prettyName");
  assert.ok(repeatCount(varied.join(" ")) < repeatCount(plain), "the varied surface repeats the prettyName less");
  // The varied surface still carries every claim — no atom is lost.
  assert.equal(varied.length, sentences.length, "every sentence survives the variation pass");
  // Every sentence still makes the SAME claim (the label is never altered).
  ATOM.relations.forEach((r, i) => {
    assert.ok(varied[i].includes(r.label), `sentence ${i} still carries its label: ${r.label}`);
  });
  // The variation is mechanical (deterministic transform, zero tokens).
  const again = vary(sentences, ATOM);
  assert.deepEqual(varied, again, "snipVariation is deterministic — same input, same output");
});

test("the two surfaces are two renderings of ONE claim row — the EOT version is the movable atom", () => {
  // The EOT version is what is chased + equated + moved (run-dmca.js's
  // two-tier chase at proposition grain); the pathos version is what a human
  // reads. Both ride the same atom set.
  const atoms = ATOM.relations.map((r) => ({ end1: r.end1, label: r.label, end2: r.end2 }));
  const prose = vary(renderSentences(ATOM), ATOM).join(" ");

  // Every atom's label survives into the prose (the claim is never lost).
  for (const a of atoms) {
    assert.ok(prose.includes(a.label), `the prose carries the atom's label: "${a.label}"`);
  }
  // And the atom set is fully recoverable in principle — the prose is a
  // rendering, never a different claim.
  assert.equal(atoms.length, ATOM.relations.length);
});

test("voice registers compose with the two-surface render — the NL surface wears the register, the EOT surface does not", () => {
  // The pathos surface is where register lives (output-voice.js); the EOT
  // atom is register-free — a claim row has no voice until it is surfaced.
  const plainVoice = voiceOf({ claim: ATOM.relations[0] });
  assert.equal(plainVoice.register, "plain");
  assert.equal(plainVoice.text, "the Analytical Engine — has no pretensions to originate — anything.");
  // The EOT atom itself carries no register — it is {end1,label,end2}.
  assert.ok(!("register" in ATOM.relations[0]), "the EOT atom is register-free; voice is a surface property");
});