// existence-grain.test.mjs — the walls are the measurements that made this
// organ worth having (2026-09-23): under the learned cues, no real name is
// ever killed in Doctor Faustus, Henry IV Part 1 or Antigone; the named
// characters land at Entity; the role-title class lands as typed Contests;
// the unlicensed E4 raw kill really does kill names (why it is excluded);
// and the learned default is what Sullivan's swarm actually chose.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { cellOf } from "../../kernel/cube.js";
import { binomialTail, wordShuffle, grainEvidence, grainOf, existenceGrains, LEARNED_CUES, CUES } from "./existence-grain.js";
import { TEXTS, learn, nameOf } from "../../eval/lavar/sullivan-learn.mjs";

const body = (p) => { const raw = readFileSync(p, "utf8"); return raw.slice(raw.indexOf("\n\n") + 2); };
const available = (spec) => existsSync(spec.path) && existsSync(spec.prior);
const loadPrior = (spec) => JSON.parse(readFileSync(spec.prior, "utf8"));
const byId = Object.fromEntries(TEXTS.map((t) => [t.id, t]));

test("the organ sits at NUL·Ground (terrain Void); its kill cues at NUL·Pattern (Kind)", () => {
  assert.equal(cellOf("NUL", "Ground").terrain, "Void");
  assert.equal(cellOf(...CUES.E2.cell).terrain, "Kind");
  assert.equal(cellOf(...CUES.E3.cell).terrain, "Kind");
});

test("grainOf licenses: kill+naming is a Contest, a kill is Kind, the raw dispersion kill is Kind*, naming or avoidance is Entity, nothing is Void", () => {
  const ev = (o) => ({ E1all: false, E1run: false, E2: false, E3: false, E4raw: false, E4cal: false, E5: false, E6: false, naming: false, avoids: false, ...o });
  const all = { E1: "run", E2: 1, E3: 1, E4: "raw", E5: 1, E6: 1 };
  assert.equal(grainOf(ev({ E2: true, naming: true }), all), "Contest");
  assert.equal(grainOf(ev({ E2: true }), all), "Kind");
  assert.equal(grainOf(ev({ E4raw: true, naming: true }), all), "Kind*");
  assert.equal(grainOf(ev({ naming: true }), all), "Entity");
  assert.equal(grainOf(ev({ avoids: true }), all), "Entity");
  assert.equal(grainOf(ev({ E2: true, avoids: true }), all), "Kind", "absence of kind-marking cannot contest a positive kill");
  assert.equal(grainOf(ev({}), all), "Void");
});

test("binomialTail is exact at small n and honest at the edges", () => {
  assert.equal(binomialTail(0, 5, 0.3, "upper"), 1);
  assert.ok(Math.abs(binomialTail(2, 2, 0.5, "upper") - 0.25) < 1e-12);
  assert.ok(Math.abs(binomialTail(0, 3, 0.5, "lower") - 0.125) < 1e-12);
  assert.equal(binomialTail(1, 4, 0, "upper"), 1, "a degenerate rate is no evidence");
});

test("wordShuffle permutes words into the same skeleton — same word multiset, same punctuation", () => {
  const t = "Enter FAUSTUS.\nThe doctor reads; a book falls.\nFaustus, Faustus!";
  const s = wordShuffle(t, 7);
  const words = (x) => (x.match(/[\p{L}]+/gu) ?? []).sort().join(" ");
  assert.equal(words(s), words(t));
  assert.equal(s.replace(/[\p{L}]+/gu, "_"), t.replace(/[\p{L}]+/gu, "_"));
});

test("on a caseless script the orthographic cue self-silences — it is particular, not universal", () => {
  const he = "הספר של המלך נמצא בבית. המלך קרא את הספר בבית שלו. הספר היה ישן והמלך אהב אותו מאוד בבית.";
  const ev = grainEvidence(he.repeat(4), { forms: {} });
  assert.equal(ev.cased, false);
  assert.ok([...ev.forms.values()].every((e) => e.E3 === false && e.naming === false));
});

for (const id of ["faustus", "henry-iv-modern", "antigone"]) {
  const spec = byId[id];
  test(`real ${id}: under the learned cues no witness name is killed`, { skip: available(spec) ? false : `${id} text or prior not present` }, () => {
    const gold = new Set(spec.witness.split(" "));
    const r = existenceGrains(body(spec.path), loadPrior(spec));
    const killed = [...r.Kind, ...r["Kind*"]].filter((w) => gold.has(w));
    assert.deepEqual(killed, [], `witness names killed: ${killed.join(" ")}`);
  });
}

test("real Doctor Faustus: the play's own named figures land at Entity; the role-titles land as typed Contests", { skip: available(byId.faustus) ? false : "not present" }, () => {
  const r = existenceGrains(body(byId.faustus.path), loadPrior(byId.faustus));
  for (const w of ["faustus", "mephistophilis", "lucifer", "wagner", "robin", "valdes", "cornelius", "helen"]) assert.ok(r.Entity.includes(w), `${w} should be Entity`);
  // Measured: 101 Entity / 1468 Kind / 33 Contest / 87 Void.
  for (const w of ["doctor", "emperor", "clown", "chorus", "angel"]) assert.ok(r.Contest.includes(w), `${w} should be a typed Contest (capitalised as a name, yet takes determiners or is settled common)`);
  assert.ok(r.Entity.length <= 120, `Entity should stay a small figure against the ground, got ${r.Entity.length}`);
});

test("real Henry IV Part 1: the cast lands at Entity, and real proper nouns the character list omits land there too", { skip: available(byId["henry-iv-modern"]) ? false : "not present" }, () => {
  const r = existenceGrains(body(byId["henry-iv-modern"].path), loadPrior(byId["henry-iv-modern"]));
  for (const w of ["falstaff", "hotspur", "percy", "glendower", "poins", "bardolph", "mortimer", "douglas"]) assert.ok(r.Entity.includes(w), `${w} should be Entity`);
  for (const w of ["hal", "london", "shrewsbury", "coventry"]) assert.ok(r.Entity.includes(w), `${w} (a real proper noun absent from the witness) should be Entity`);
});

test("real Antigone: Kreon, Zeus and Oedipus land at Entity from Greek orthography alone", { skip: available(byId.antigone) ? false : "not present" }, () => {
  const r = existenceGrains(body(byId.antigone.path), loadPrior(byId.antigone));
  for (const w of ["κρέων", "ζεὺς", "οἰδίπου", "πολυνείκους", "θήβης"]) assert.ok(r.Entity.includes(w), `${w} should be Entity`);
});

test("why E4 raw is excluded: accepting 'no burstier than chance' without power kills real names in every text", () => {
  for (const spec of TEXTS.filter(available)) {
    const gold = new Set(spec.witness.split(" "));
    const r = existenceGrains(body(spec.path), loadPrior(spec), { cues: { ...LEARNED_CUES, E4: "raw" } });
    assert.ok(r["Kind*"].some((w) => gold.has(w)), `${spec.id}: the unlicensed raw kill should take at least one witness name`);
  }
});

test("do we trust the golden? The conclusions survive correcting it — and optimizing it directly would learn to kill names", { skip: available(byId["henry-iv-modern"]) ? false : "not present" }, () => {
  const r = learn(byId["henry-iv-modern"]);
  // Same zero kills and the same tracking under the pre-audit and the
  // corrected witness (measured: Spearman 0.568 -> 0.566).
  assert.equal(r.witnessBefore.champion.killed, 0);
  assert.equal(r.champion.witness.killed, 0);
  assert.ok(Math.abs(r.feelTracksWitness.spearmanF1 - r.witnessBefore.spearmanF1) < 0.05);
  // Measured: the config the corrected witness itself scores best kills 8
  // of 35 real names — an incomplete golden rewards shrinking the Entity set.
  assert.ok(r.witnessFavourite.witness.killed > 0, "the witness-optimal config should be shown to kill names — the reason the swarm never tunes against it");
});

test("the learned default is what the swarm chose, and its golden-free fitness tracks the witness on both English plays", { skip: available(byId.faustus) && available(byId["henry-iv-modern"]) ? false : "not present" }, () => {
  for (const id of ["faustus", "henry-iv-modern"]) {
    const r = learn(byId[id]);
    assert.equal(r.champion.cues, nameOf(LEARNED_CUES), `${id}: swarm champion ${r.champion.cues} differs from LEARNED_CUES — revisit the default`);
    assert.equal(r.champion.witness.killed, 0);
    // Measured 0.591 (Faustus) and 0.568 (Henry IV); the floor sits below.
    assert.ok(r.feelTracksWitness.spearmanF1 >= 0.5, `${id}: Spearman(fitness, witness) fell to ${r.feelTracksWitness.spearmanF1}`);
  }
});
