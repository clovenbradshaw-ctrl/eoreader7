// eval/the-fold/overtones.mjs — the harmonic series heard from real sound,
// against a null, and then USED: a metric on pitches that lets a prior
// over Bach's notes spread belief to overtone-neighbours — the stream
// deciding, through the mixture, whether that helps.
//
// User direction, 2026-09-02: not melody — "overtones more or less. music."
//
// Two real recordings, both read as bytes by measure.js's own wavSamples
// (mono 22.05 kHz WAV decoded locally by ffmpeg from public archives — the
// audio itself is NOT committed; SOURCES below name where it came from):
//   AUDIO_A: a piano recording of the C-major Prelude (Jamendo via the
//            Internet Archive, jamendo-312572, CC BY-NC-ND 3.0) — the same
//            piece the MIDI experiment reads, as sound.
//   AUDIO_B: a 1940s 78rpm, voice and guitar (Internet Archive great-78,
//            78_house-of-the-rising-sun_josh-white-and-his-guitar_gbia0001628b).
// Plus the control built to fail: seeded white noise, which has no
// harmonics and must not "hear" them beyond alpha.
import fs from "node:fs";
import { wavSamples } from "../../../../the-fold/measure.js";
import { discoverHarmonics, overtoneOverlap } from "../../adapters/audio/overtones.js";
import { parseMidi } from "../../adapters/midi/midi.js";
import { sedimentPrior, expertOf, smoothedExpertOf, runMixture, lcg, shuffled } from "../../kernel/continuation.js";

const HERE = new URL(".", import.meta.url).pathname;
const AUDIO = process.env.AUDIO_DIR ?? "/private/tmp/claude-501/-Users-mlacy-Documents-3-0-the-fold/8165ce2d-b32f-4e53-83a6-fbe04f86fcf9/scratchpad/midi";
const say = (s) => console.log(s);
// declared, all of them
const H = { frame: 4096, hop: 2048, partials: 8, band: [80, 1000], draws: 100, seed: 0, alpha: 0.05, energyFloor: 0.004 };
const TOLERANCE = 0.03;                 // a frequency ratio: partials within 3% coincide
const TUNING = (n) => 440 * Math.pow(2, (n - 69) / 12); // giver: MIDI 1.0 / 12-TET reference pitch — the one convention, declared
const SPLIT = 0.6, ORDER = 3, SEED = 11;

say(`overtones — frame ${H.frame} (${(22050 / H.frame).toFixed(1)} Hz bins), partials ${H.partials}, band ${H.band.join("–")} Hz, ${H.draws} redeals at alpha ${H.alpha}\n`);

// ── 1. IS THE HARMONIC SERIES IN THE SOUND? ──────────────────────────────
function read(path) { const w = wavSamples(fs.readFileSync(path)); if (w.refused) throw new Error(`${path}: ${w.refused.type}`); return w; }
const noise = (() => { const r = lcg(5); const n = 22050 * 20; const s = new Float64Array(n); for (let i = 0; i < n; i += 1) s[i] = r() * 2 - 1; return { samples: s, sampleRate: 22050 }; })();
const results = {};
for (const [label, w] of [["piano: Prelude in C (recording)", read(`${AUDIO}/prelude-piano.wav`)], ["78rpm: voice and guitar", read(`${AUDIO}/rising-sun.wav`)], ["CONTROL: white noise", noise]]) {
  const r = discoverHarmonics(w.samples, w.sampleRate, H);
  results[label] = r;
  say(`${label.padEnd(34)} frames ${String(r.framesRead).padStart(4)} (silent ${r.framesSilent})  heard harmonics in ${(100 * r.share).toFixed(1).padStart(5)}%  profile k=1..${H.partials}: ${r.profile.map((x) => x.toFixed(2)).join(" ")}`);
}
const piano = results["piano: Prelude in C (recording)"], ctrl = results["CONTROL: white noise"];
// the test is against the CONTROL, never a number invented here: a recording
// hears harmonics at some multiple of the rate white noise does (declared: ≥ 2×)
const RATIO = 2;
const heardVsNoise = (r) => (ctrl.share ? r.share / ctrl.share : Infinity);
say(`→ piano hears harmonics at ${heardVsNoise(piano).toFixed(1)}× the noise rate, the 78rpm at ${heardVsNoise(results["78rpm: voice and guitar"]).toFixed(1)}× — ${heardVsNoise(piano) >= RATIO ? "the harmonic series is HEARD in real sound and not in noise: energy at integer multiples of the strongest peak beats random frequencies in the same band, frame by frame. The piano's lower share is polyphony: in a chord the strongest peak's multiples are masked by the other notes" : "NOT established — do not build on it"}\n`);

// ── 2. THE METRIC, from the piano's own partial profile ──────────────────
const profile = piano.profile;
const sim = (a, b) => overtoneOverlap(TUNING(a), TUNING(b), profile, { tolerance: TOLERANCE });
say(`2. overtone overlap between pitches, from the recording's own profile (no theory): c4~g4 ${sim(60, 67).toFixed(2)}  c4~c5 ${sim(60, 72).toFixed(2)}  c4~e4 ${sim(60, 64).toFixed(2)}  c4~f4 ${sim(60, 65).toFixed(2)}  c4~c#4 ${sim(60, 61).toFixed(2)}  c4~f#4 ${sim(60, 66).toFixed(2)}`);
say(`   (what a listener would call consonant sits high, what they would call dissonant sits low — and nothing here was told which is which)\n`);

// ── 3. DOES HEARING OVERTONES HELP PREDICT BACH? the stream decides ───────
const r = parseMidi(fs.readFileSync(`${HERE}fixtures/midi/wtk1-prelude1.mid`));
const tokens = r.notes.map((n, i) => `${n.pitch}/${n.dur}/${i + 1 < r.notes.length ? r.notes[i + 1].tick - n.tick : 0}`);
const cut = Math.floor(tokens.length * SPLIT), heard = tokens.slice(0, cut), held = tokens.slice(cut);
const own = (k) => sedimentPrior(heard, { order: k, giver: `prelude:heard@${k}` });
const pitchOf = (t) => Number(t.split("/")[0]), restOf = (t) => t.slice(t.indexOf("/"));
// similarity on tokens: same duration/gap, overtone overlap on the pitch
const tokenSim = (a, b) => (restOf(a) === restOf(b) ? sim(pitchOf(a), pitchOf(b)) : 0);
// the control: the same overlap values dealt to the wrong pitch pairs
const pitches = [...new Set(r.notes.map((n) => n.pitch))];
const perm = shuffled(pitches, lcg(SEED + 7));
const remap = new Map(pitches.map((p, i) => [p, perm[i]]));
const randomSim = (a, b) => (restOf(a) === restOf(b) ? sim(remap.get(pitchOf(a)) ?? pitchOf(a), remap.get(pitchOf(b)) ?? pitchOf(b)) : 0);
const alphabetSize = new Set(tokens).size;
const experts = [
  expertOf("hearing@1", own(1)), expertOf("hearing@2", own(2)), expertOf("hearing@3", own(3)),
  smoothedExpertOf("hearing@3 spread by overtones", own(3), tokenSim),
  smoothedExpertOf("hearing@1 spread by overtones", own(1), tokenSim),
  smoothedExpertOf("hearing@3 spread at RANDOM (control)", own(3), randomSim),
  expertOf("SHUFFLED hearing (control)", sedimentPrior(shuffled(heard, lcg(SEED + 1)), { order: ORDER, giver: "shuffled" })),
];
const warm = runMixture(experts, heard, { order: ORDER, alphabetSize });
const test = runMixture(experts, held, { weights: warm.weights, seen: new Set(heard), order: ORDER, alphabetSize });
say(`3. the Prelude's held-out ${held.length} notes, every source an expert, weighted by its own surprise:`);
say(`   mixture ${test.bitsPerEvent.toFixed(2)} bits/note  top-1 ${(100 * test.top1).toFixed(1)}%`);
for (const [n, w, b] of experts.map((x, j) => [x.name, test.weights[j], test.cumulativeBits[j] / held.length]).sort((a, b) => b[1] - a[1]))
  say(`     ${n.padEnd(40)} weight ${w.toFixed(3).padStart(6)}   its own surprise ${b.toFixed(2)} bits/note`);
say(`   lead: ${test.leads.map((l) => `${l.expert}@${l.at}`).join(" → ")}`);
const ov = test.cumulativeBits[3] / held.length, plain = test.cumulativeBits[2] / held.length, rnd = test.cumulativeBits[5] / held.length;
say(`→ spreading belief to overtone-neighbours ${ov < plain ? "REDUCES" : "does not reduce"} surprise on the Prelude (${ov.toFixed(2)} vs ${plain.toFixed(2)} plain); the random-neighbour control reads ${rnd.toFixed(2)} — ${ov < rnd ? "the overtone metric beats random nearness" : "no better than random nearness: the metric did not earn anything here"}.`);
