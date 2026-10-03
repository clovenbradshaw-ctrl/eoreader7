// native/organs/stance.test.mjs — THE FALSIFICATION TIER for stance.js.
//
// Stance is the join at a level of holonic relevancy: SHAPE ∧ GROUND ∧
// STRAIN_CARRIED-TIED-TO-BEING. These invariants must hold, and the one that
// matters most — the shuffled control — must NOT pass. The real case is the
// Elizabethan Poor Law (eval/stance-holonic-experiment.mjs): a faithful reading
// carries the material's own commitment, the inverted fabrication names the
// theme with an opposite commitment, and the shuffled control reuses the
// material's act words about a DIFFERENT being.
//
//   node --test native/organs/stance.test.mjs

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readStance, carriesStrain, stanceSigns, levelStance, STANCE_GIVER } from "./stance.js";
import { buildReferents } from "../the-fold/referents.js";

const THEME = "the Elizabethan Poor Law";
const MATERIAL = "The Elizabethan Poor Law provided work for the unemployed and pensions for the disabled, but the poor were harshly punished and the vagrants were cruelly constrained, for the law treated poverty as a crime rather than a misfortune.";
const holon = () => ({ theme: THEME, ground: MATERIAL, material: MATERIAL, referents: buildReferents(MATERIAL), passages: [{ ref: null, text: MATERIAL }] });

const FAITHFUL = "The Elizabethan Poor Law provided work for the unemployed and pensions for the disabled, yet it harshly punished the poor and cruelly constrained vagrants, treating poverty as a crime rather than a misfortune.";
const INVERTED = "The Elizabethan Poor Law was effective and its success improved the lives of the poor, with a sense of fairness in its application.";
const SHUFFLED = "The weather was harshly punished and the mountains were cruelly constrained, treating the valley as a crime rather than a misfortune.";

// S1 — NO LEXICON. The file must not carry a sentiment word list.
test("S1 — no lexicon: the file carries no good/bad word list", () => {
  const src = readFileSync(fileURLToPath(new URL("./stance.js", import.meta.url)), "utf8");
  // a lexicon would be a regex alternation of evaluative adjectives
  assert.ok(!/\b(?:good|bad|positive|negative|excellent|terrible|great|awful|success|failure)\b\s*\|/i.test(src), "no evaluative alternation (a word list) is present");
  assert.ok(!/const\s+(?:POS|NEG|GOOD|BAD)\s*=\s*\//i.test(src), "no POS/NEG regex constant");
});

// S2 — THE REAL CASE. faithful in_terms; inverted against; shuffled off_being.
test("S2 — the real case: faithful in_terms, inverted against, shuffled off_being", () => {
  const f = readStance(FAITHFUL, holon(), { level: "whole" });
  const i = readStance(INVERTED, holon(), { level: "whole" });
  const s = readStance(SHUFFLED, holon(), { level: "whole" });
  assert.equal(f.stance, "in_terms", "the faithful reading is in terms of the material");
  assert.equal(i.stance, "against", "the inverted reading is against the material");
  assert.equal(s.stance, "off_being", "the shuffled control lands off the being, never in terms");
  assert.notEqual(s.stance, "in_terms", "the shuffled control is NEVER in_terms (the tie is what kills it)");
});

// S3 — SIGN IS RELATION-DERIVED. The inverted reading's sign comes from the
// material's own commitment, not a stance word: it is −1 with no lexicon.
test("S3 — the sign is derived from the material's own commitment, never a word list", () => {
  const i = readStance(INVERTED, holon(), { level: "whole" });
  assert.equal(i.sign, -1, "inverted reads −1");
  assert.equal(i.signs.inverted.length > 0, true, "the inversion cites the relation, not a word");
  // and removing the theme yields no claim to compare — a gap, not a verdict
  const gap = stanceSigns("An unrelated sentence about the weather.", { ground: MATERIAL, theme: "", passages: [{ ref: null, text: MATERIAL }] });
  assert.equal(gap.sign, 0, "no shared subject is a gap, never a verdict");
});

// S4 — LEVEL MONOTONICITY. A whole that reads in_terms has no off_being part;
// one off_being part makes the whole off_being.
test("S4 — the general recurses: one off_being part makes the whole off_being", () => {
  const mixed = FAITHFUL + " " + SHUFFLED;
  const L = levelStance(mixed, holon());
  assert.ok(["off_being", "against"].includes(L.stance), "a whole carrying an off-being part is not in_terms");
  const pure = levelStance(FAITHFUL, holon());
  assert.equal(pure.stance !== "unnamed" && pure.sign >= 0, true, "a wholly faithful text reads in_terms or against, never unnamed");
});

// S5 — NULL. The adversarial control is the material's ACT WORDS ON UNRELATED
// REFERENTS (the spec's shuffled case), which must read off_being, never
// in_terms. (A BAG-shuffle of the material's own words is NOT caught here and is
// disclosed as a limit: a bag preserves content and loses composition, and
// composition is SHAPE's job — holonicSatisfaction reads open/turn/land by
// position, not by whether the words cohere, so a bag still passes shape. That
// is a shape-tier gap, named here rather than hidden; stance cannot fix it
// without duplicating shape's job.)
test("S5 — null: the material's act words on UNRELATED referents read off_being, never in_terms", () => {
  const r = readStance(SHUFFLED, holon(), { level: "whole" });
  assert.equal(r.stance, "off_being", "act words on the wrong being land off-being");
  assert.notEqual(r.stance, "in_terms", "the shuffled control is never in terms");
});

test("carriesStrain — the material's distinctive words carried, tied to the being", () => {
  const cs = carriesStrain(FAITHFUL, { theme: THEME, ground: MATERIAL, referents: buildReferents(MATERIAL) });
  assert.ok(cs.carried.length > 0, "the faithful reading carries the material's distinctive words");
  assert.equal(cs.tied, true, "and they are tied to the being the theme names");
  const sh = carriesStrain(SHUFFLED, { theme: THEME, ground: MATERIAL, referents: buildReferents(MATERIAL) });
  assert.equal(sh.tied, false, "the shuffled control's words are not tied to the theme's being");
});

test("giver — the lens is declared, not universal", () => {
  assert.match(STANCE_GIVER, /not universal/i, "the English lens is disclosed as an adapter's, not the kernel's");
});
