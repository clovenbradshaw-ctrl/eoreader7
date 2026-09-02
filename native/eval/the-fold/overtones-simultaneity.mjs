// eval/the-fold/overtones-simultaneity.mjs — the overtone metric's proper
// test: not what comes NEXT but what sounds TOGETHER. Physics says notes
// that overlap in time in real music share more partials than chance; if
// the metric read off a recording is real, it should bite here, where the
// succession test (overtones.mjs §3) said it earns nothing.
//
// MATERIAL: the two Bach MIDI files. Two notes SOUND TOGETHER when their
// [tick, tick+dur) intervals overlap; the pair is weighted by the overlap
// in ticks. No theory: an interval intersection on the file's own numbers.
// NULL (II.23): the same timing with the PITCHES redealt within the piece —
// identical simultaneity structure, random pairings — 200 redeals. The
// statistic is the overlap-weighted mean overtone overlap of co-sounding
// pairs; the piece must sit above the redealt distribution's (1−alpha)
// quantile, or overtones are not what organises this music's simultaneity.
// A second arm, the same statistic with a RANDOM similarity (the metric's
// values dealt to the wrong pitch pairs), must NOT beat its own null.
import fs from "node:fs";
import { parseMidi, noteName } from "../../adapters/midi/midi.js";
import { overtoneOverlap } from "../../adapters/audio/overtones.js";
import { lcg, shuffled } from "../../kernel/continuation.js";

const HERE = new URL(".", import.meta.url).pathname;
const say = (s) => console.log(s);
// the piano's own partial profile, as measured by overtones.mjs on the real recording (k=1..8)
// TWO DECLARED PROFILES, both measured by overtones.mjs on real recordings:
// the piano's (steep — only octaves and fifths register) and the 78rpm's
// (slower fall-off — the 5th partial, where a major third lives, is
// audible). PROFILE=piano|guitar picks one; the null is run under each.
const PROFILES = {
  piano: { profile: [1.00, 0.15, 0.05, 0.02, 0.01, 0.01, 0.00, 0.00], giver: "overtones.mjs on IA jamendo-312572 (piano, Prelude in C), 2026-09-02" },
  guitar: { profile: [1.00, 0.26, 0.13, 0.07, 0.05, 0.03, 0.03, 0.02], giver: "overtones.mjs on IA great-78 gbia0001628b (voice and guitar), 2026-09-02" },
};
const WHICH = process.env.PROFILE ?? "piano";
const PROFILE = PROFILES[WHICH].profile, PROFILE_GIVER = PROFILES[WHICH].giver;
const TUNING = (n) => 440 * Math.pow(2, (n - 69) / 12);
const TOLERANCE = Number(process.env.TOLERANCE ?? 0.03), DRAWS = 200, SEED = 3, ALPHA = 0.05;
const sim = new Map();
const S = (a, b) => { const k = a < b ? `${a}|${b}` : `${b}|${a}`; if (!sim.has(k)) sim.set(k, overtoneOverlap(TUNING(a), TUNING(b), PROFILE, { tolerance: TOLERANCE })); return sim.get(k); };

say(`overtones × simultaneity — profile from ${PROFILE_GIVER}; ${DRAWS} pitch redeals at alpha ${ALPHA}\n`);

function coSounding(notes) {
  // every pair whose sounding intervals overlap, weighted by the overlap in ticks
  const pairs = [];
  const sorted = [...notes].sort((a, b) => a.tick - b.tick);
  for (let i = 0; i < sorted.length; i += 1) {
    const a = sorted[i], aEnd = a.tick + a.dur;
    for (let j = i + 1; j < sorted.length && sorted[j].tick < aEnd; j += 1) {
      const b = sorted[j];
      const w = Math.min(aEnd, b.tick + b.dur) - b.tick;
      if (w > 0 && a.pitch !== b.pitch) pairs.push([i, j, w]);
    }
  }
  return { sorted, pairs };
}
const stat = (pitches, pairs, simFn) => { let s = 0, w = 0; for (const [i, j, wt] of pairs) { s += wt * simFn(pitches[i], pitches[j]); w += wt; } return w ? s / w : 0; };

for (const name of ["wtk1-prelude1", "bwv-988-aria"]) {
  const r = parseMidi(fs.readFileSync(`${HERE}fixtures/midi/${name}.mid`));
  const { sorted, pairs } = coSounding(r.notes);
  const pitches = sorted.map((n) => n.pitch);
  const real = stat(pitches, pairs, S);
  const rng = lcg(SEED);
  const nulls = Array.from({ length: DRAWS }, () => stat(shuffled(pitches, rng), pairs, S)).sort((a, b) => a - b);
  const q = nulls[Math.floor((1 - ALPHA) * (DRAWS - 1))], med = nulls[Math.floor(DRAWS / 2)];
  const above = nulls.filter((x) => x >= real).length, below = nulls.filter((x) => x <= real).length;
  const lo = nulls[Math.floor(ALPHA * (DRAWS - 1))];
  // the metric-control arm: overtone values dealt to the wrong pitch pairs
  const distinct = [...new Set(pitches)];
  const perm = shuffled(distinct, lcg(SEED + 1));
  const remap = new Map(distinct.map((p, i) => [p, perm[i]]));
  const Srand = (a, b) => S(remap.get(a), remap.get(b));
  const realRand = stat(pitches, pairs, Srand);
  const rng2 = lcg(SEED + 2);
  const nullsRand = Array.from({ length: DRAWS }, () => stat(shuffled(pitches, rng2), pairs, Srand)).sort((a, b) => a - b);
  const aboveRand = nullsRand.filter((x) => x >= realRand).length;
  say(`── ${name}: ${r.notes.length} notes, ${pairs.length} co-sounding pairs ──`);
  say(`   overlap-weighted mean overtone overlap of pairs that sound together: ${real.toFixed(4)}`);
  say(`   pitches redealt (timing kept): 5th ${lo.toFixed(4)}, median ${med.toFixed(4)}, 95th ${q.toFixed(4)}; redeals at/above the real value: ${above} of ${DRAWS}, at/below: ${below}`);
  say(`   → ${real > q ? "notes that sound together share MORE partials than chance (two-sided: above the 95th)" : real < lo ? "notes that sound together share FEWER partials than chance (two-sided: below the 5th) — the music AVOIDS what this metric scores high" : "within the null — overtones, at this profile, neither organise nor are avoided in this music's simultaneity"}`);
  say(`   control (metric values dealt to the wrong pairs): real ${realRand.toFixed(4)}, redeals at or above: ${aboveRand} of ${DRAWS} → ${aboveRand > ALPHA * DRAWS ? "does NOT beat its null, as it must not" : "BEATS its null — the statistic is not measuring overtones; do not trust the line above"}`);
  // what the metric says the piece's most co-sounding pairs are, by name
  const byPair = new Map();
  for (const [i, j, w] of pairs) { const k = [noteName(pitches[i]), noteName(pitches[j])].sort().join("+"); byPair.set(k, (byPair.get(k) ?? 0) + w); }
  const top = [...byPair].sort((a, b) => b[1] - a[1]).slice(0, 8);
  say(`   most-sounding pairs (ticks together): ${top.map(([k, w]) => `${k}(${w})`).join(" ")}\n`);
}
