// greek-competence.test.mjs — HOW WE KNOW THE READER IS COMPETENT, narrow
// (2026-09-17). Two witnesses agree: the reader's morphology and the PROIEL
// treebank's hand-annotated gold, on the TEST split the prior never saw.
// This is NOT proof of truth — a golden is a witness, not an oracle, and the
// prior was built from the treebank's TRAIN split, so high agreement is
// out-of-sample generalization of that tradition's OWN rules (the circularity
// is disclosed, not hidden). What it establishes is real but bounded: the
// reader and the treebank are not broken in the same way on unseen forms.
// Measured 2026-09-17: CASE 84.4%, PERSON 98.6%, TENSE 88.0%, VOICE 93.5%,
// MOOD 91.2%. The floors are set BELOW the measurement (a regression trips
// them; a hand-tuned aspiration never would).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { caseOf, paradigmOf } from "./greek.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONLLU = path.join(HERE, "../fixtures/ud-greek-proiel/grc_proiel-ud-test.conllu");
const PRIOR = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/live_priors/derived-priors/case-priors/case-marking-grc.json", "utf8"));

function audit() {
  let nominal = 0, caseAgree = 0, caseClassified = 0;
  let person = 0, personAgree = 0, personClassified = 0;
  let tense = 0, tenseAgree = 0, voice = 0, voiceAgree = 0, mood = 0, moodAgree = 0;
  for (const line of fs.readFileSync(CONLLU, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const c = line.split("\t");
    if (c.length < 6 || !/^\d+$/.test(c[0])) continue;
    const form = c[1], upos = c[3], feats = c[5];
    if (feats === "_") continue;
    const f = Object.fromEntries(feats.split("|").map((x) => x.split("=")));
    if (["NOUN", "PROPN", "ADJ", "PRON", "NUM"].includes(upos) && f.Case) {
      nominal += 1;
      const r = caseOf(form, PRIOR);
      if (r) { caseClassified += 1; if (r.case === f.Case) caseAgree += 1; }
    }
    if ((upos === "VERB" || upos === "AUX") && f.VerbForm === "Fin") {
      const r = paradigmOf(form, PRIOR);
      if (r) {
        if (f.Person && r.person !== null) { person += 1; personClassified += 1; if (String(r.person) === String(f.Person)) personAgree += 1; }
        if (f.Tense && r.tense) { tense += 1; if (r.tense === f.Tense) tenseAgree += 1; }
        if (f.Voice && r.voice) { voice += 1; if (r.voice === f.Voice) voiceAgree += 1; }
        if (f.Mood && r.mood) { mood += 1; if (r.mood === f.Mood) moodAgree += 1; }
      }
    }
  }
  return { nominal, caseAgree, caseClassified, person, personAgree, personClassified, tense, tenseAgree, voice, voiceAgree, mood, moodAgree };
}

test("out-of-sample morphology competence, against the PROIEL TEST split the prior never saw", () => {
  const m = audit();
  assert.ok(m.caseClassified >= 0.8 * m.nominal, `case coverage: ${m.caseClassified}/${m.nominal} must classify >= 80% of gold nominals`);
  assert.ok(m.caseAgree / m.caseClassified >= 0.7, `case agreement ${(100 * m.caseAgree / m.caseClassified).toFixed(1)}% must clear 70%`);
  assert.ok(m.personAgree / m.personClassified >= 0.9, `person agreement ${(100 * m.personAgree / m.personClassified).toFixed(1)}% must clear 90%`);
  assert.ok(m.tenseAgree / m.tense >= 0.75, `tense agreement ${(100 * m.tenseAgree / m.tense).toFixed(1)}% must clear 75%`);
  assert.ok(m.voiceAgree / m.voice >= 0.75, `voice agreement ${(100 * m.voiceAgree / m.voice).toFixed(1)}% must clear 75%`);
  assert.ok(m.moodAgree / m.mood >= 0.75, `mood agreement ${(100 * m.moodAgree / m.mood).toFixed(1)}% must clear 75%`);
});

test("the measured competence is reported, never hidden", () => {
  const m = audit();
  console.error(`CASE ${(100 * m.caseAgree / m.caseClassified).toFixed(1)}% (${m.caseClassified}/${m.nominal}) | PERSON ${(100 * m.personAgree / m.personClassified).toFixed(1)}% | TENSE ${(100 * m.tenseAgree / m.tense).toFixed(1)}% | VOICE ${(100 * m.voiceAgree / m.voice).toFixed(1)}% | MOOD ${(100 * m.moodAgree / m.mood).toFixed(1)}%`);
});