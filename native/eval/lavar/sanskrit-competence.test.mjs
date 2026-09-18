// sanskrit-competence.test.mjs — HOW WE KNOW THE READER IS COMPETENT, narrow.
// (2026-09-18). Two witnesses agree: the reader's morphology and the Vedic
// treebank's hand-validated gold, on the TEST split the prior never saw.
// This is NOT proof of truth — a golden is a witness, not an oracle, and the
// prior was built from the treebank's TRAIN split, so high agreement is
// out-of-sample generalization of that tradition's OWN rules (the circularity
// is disclosed, not hidden). What it establishes is real but bounded: the
// reader and the treebank are not broken in the same way on unseen forms.
// Measured 2026-09-18 at the reader operating point (0.5/10, sanskrit-swarm):
// CASE 74.6% @ 77.7% cov | PERSON 94.2% | TENSE 94.3% | MOOD 94.3% |
// VOICE 100% of 55 votes on 58 voice-gold (sparse table, 32 endings —
// reported, never gated: a gate on 2% of verbs would license noise).
// The floors are set BELOW the measurement (a regression trips them; a
// hand-tuned aspiration never would).
//
// THE NULL ARM (L3): TEST gold Case labels are shuffled within-nominal-UPOS
// (20 draws, seed 42); the reader's votes are rescored per draw. Agreement
// must dissolve toward chance (~1/8 cases) — if the floors licensed noise,
// the shuffle would keep agreeing.
// HONEST ASYMMETRY (L4): the UFAL Classical test (different register AND
// Devanagari script, read through the treebank's own Translit field as
// second decoder, recipe ud-translit-field-v1) is REPORTED as landings,
// never gated — no oracle is invented for it.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { caseOf, paradigmOf } from "./sanskrit.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONLLU = path.join(HERE, "../fixtures/ud-sanskrit-vedic/sa_vedic-ud-test.conllu");
const UFAL = path.join(HERE, "../fixtures/ud-sanskrit-ufal/sa_ufal-ud-test.conllu");
const PRIOR = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/live_priors/derived-priors/case-priors/case-marking-san.json", "utf8"));

const NOMINAL_UPOS = ["NOUN", "PROPN", "ADJ", "PRON", "NUM"];
const SH = 0.5, CT = 10; // the reader operating point (sanskrit-swarm)

function readGold(conlluPath, { translit = false } = {}) {
  const nominals = []; // {form, Case}
  const verbs = [];    // {form, Person, Number, Tense, Voice, Mood}
  for (const line of fs.readFileSync(conlluPath, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const c = line.split("\t");
    if (c.length < 6 || !/^\d+$/.test(c[0])) continue;
    let form = c[1];
    const upos = c[3], feats = c[5], misc = c[9] ?? "";
    if (feats === "_") continue;
    const f = Object.fromEntries(feats.split("|").map((x) => x.split("=")));
    if (translit) {
      const m = misc.match(/Translit=([^|]+)/);
      if (!m) continue;
      form = m[1];
    }
    if (NOMINAL_UPOS.includes(upos) && f.Case) nominals.push({ form, Case: f.Case, upos });
    if ((upos === "VERB" || upos === "AUX") && f.Person && f.Mood && !f.VerbForm) {
      verbs.push({ form, Person: f.Person, Number: f.Number, Tense: f.Tense, Voice: f.Voice, Mood: f.Mood });
    }
  }
  return { nominals, verbs };
}

function auditCase(nominals) {
  let cls = 0, agr = 0;
  for (const g of nominals) {
    const r = caseOf(g.form, PRIOR, { minShare: SH, minCount: CT });
    if (r) { cls += 1; if (r.case === g.Case) agr += 1; }
  }
  return { nominal: nominals.length, classified: cls, agree: agr };
}

function auditVerbs(verbs) {
  let person = 0, personAgree = 0, tense = 0, tenseAgree = 0, mood = 0, moodAgree = 0, voiceGold = 0, voiceVoted = 0, voiceAgree = 0;
  for (const g of verbs) {
    const r = paradigmOf(g.form, PRIOR, { minShare: SH, minCount: CT });
    if (!r) continue;
    if (g.Number && r.number) { person += 1; if (String(r.person) === String(g.Person) && r.number === g.Number) personAgree += 1; }
    if (g.Tense && r.tense) { tense += 1; if (r.tense === g.Tense) tenseAgree += 1; }
    if (g.Mood && r.mood) { mood += 1; if (r.mood === g.Mood) moodAgree += 1; }
    if (g.Voice) { voiceGold += 1; if (r.voice) { voiceVoted += 1; if (r.voice === g.Voice) voiceAgree += 1; } }
  }
  return { person, personAgree, tense, tenseAgree, mood, moodAgree, voiceGold, voiceVoted, voiceAgree };
}

test("out-of-sample morphology competence, against the Vedic TEST split the prior never saw", () => {
  const { nominals, verbs } = readGold(CONLLU);
  const c = auditCase(nominals);
  const v = auditVerbs(verbs);
  assert.ok(c.classified >= 0.7 * c.nominal, `case coverage: ${c.classified}/${c.nominal} must classify >= 70% of gold nominals`);
  assert.ok(c.agree / c.classified >= 0.65, `case agreement ${(100 * c.agree / c.classified).toFixed(1)}% must clear 65%`);
  assert.ok(v.personAgree / v.person >= 0.9, `person agreement ${(100 * v.personAgree / v.person).toFixed(1)}% must clear 90%`);
  assert.ok(v.tenseAgree / v.tense >= 0.85, `tense agreement ${(100 * v.tenseAgree / v.tense).toFixed(1)}% must clear 85%`);
  assert.ok(v.moodAgree / v.mood >= 0.85, `mood agreement ${(100 * v.moodAgree / v.mood).toFixed(1)}% must clear 85%`);
  // VOICE: reported, never gated (32-ending sparse table — a gate would license noise).
});

test("the null arm: shuffled gold dissolves agreement (the floors do not license noise)", () => {
  const { nominals } = readGold(CONLLU);
  const observed = auditCase(nominals);
  const observedAgr = observed.agree / observed.classified;
  // Deterministic shuffle, seed 42 (RERUN_NULL discipline: declared seed).
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const byUpos = new Map();
  for (const n of nominals) {
    if (!byUpos.has(n.upos)) byUpos.set(n.upos, []);
    byUpos.get(n.upos).push(n.Case);
  }
  let maxShuffled = 0;
  for (let d = 0; d < 20; d += 1) {
    const shuffled = nominals.map((n) => {
      const pool = byUpos.get(n.upos);
      return { form: n.form, Case: pool[Math.floor(rnd() * pool.length)] };
    });
    const s = auditCase(shuffled);
    maxShuffled = Math.max(maxShuffled, s.agree / Math.max(1, s.classified));
  }
  console.error(`NULL ARM observed ${(100 * observedAgr).toFixed(1)}% vs shuffled max ${(100 * maxShuffled).toFixed(1)}% (20 draws)`);
  assert.ok(observedAgr > maxShuffled + 0.2, `observed ${(100 * observedAgr).toFixed(1)}% must clear shuffled max ${(100 * maxShuffled).toFixed(1)}% by 20 points`);
});

test("the measured competence is reported, never hidden", () => {
  const { nominals, verbs } = readGold(CONLLU);
  const c = auditCase(nominals);
  const v = auditVerbs(verbs);
  console.error(`CASE ${(100 * c.agree / c.classified).toFixed(1)}% (${c.classified}/${c.nominal}) | PERSON ${(100 * v.personAgree / v.person).toFixed(1)}% | TENSE ${(100 * v.tenseAgree / v.tense).toFixed(1)}% | MOOD ${(100 * v.moodAgree / v.mood).toFixed(1)}% | VOICE ${(100 * v.voiceAgree / Math.max(1, v.voiceVoted)).toFixed(1)}% (${v.voiceVoted}/${v.voiceGold} voted, ungated)`);
});

test("UFAL Classical landings via the treebank's own Translit field (second decoder, reported never gated)", () => {
  const { nominals } = readGold(UFAL, { translit: true });
  assert.ok(nominals.length > 100, `UFAL Translit read must yield gold nominals (got ${nominals.length})`);
  const c = auditCase(nominals);
  console.error(`UFAL LANDINGS (ud-translit-field-v1, Classical register): CASE ${(100 * c.agree / Math.max(1, c.classified)).toFixed(1)}% (${c.classified}/${c.nominal}) — landings, not a gate`);
});
