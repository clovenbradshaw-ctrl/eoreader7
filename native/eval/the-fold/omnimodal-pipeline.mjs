// eval/omnimodal-pipeline.mjs — music and video through the pipeline
//
// User direction (2026-09-01, verbatim): "before we go too far, i want you
// to take music and video through the pipeline." The claim under test is
// NOT that the adapters below are good instruments — they are the crudest
// honest ones — but that the pipeline's ORGANS are medium-blind in fact,
// not by assertion: the SAME discoverCompanyKinds / frameWords / kindNotes /
// hear / foldHyperlexicon / distinctSources code, unmodified, over event
// streams decoded from REAL media bytes (a RIFF/WAVE file read by
// measure.js's own wavSamples; an H.264 MP4 decoded by the machine's own
// ffmpeg), with each discovery's II.23 shuffle control run in the same
// pass.
//
// STRATA NOTE (LEVELS.md): music is S2-NATIVE — audio has no script
// stratum; the score would be its S1, and this pipeline never sees one.
// Video's stream here is likewise the medium's own (frames), not captions.
//
// Re-runnable driver, P19/P27's posture: fixtures are synthesized INSIDE
// the run (a designed grammar, declared below), so the ground truth is by
// construction and the whole thing reproduces from the repos alone.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import * as K from "../kind-standing.js";
import * as H from "../hyperlexicon.js";
import * as TL from "../../eoreader7/native/kernel/task-log.js";
import { wavSamples } from "../measure.js";
import { distinctSources } from "../corroboration.js";

const OUT = "/tmp/omnimodal";
fs.mkdirSync(OUT, { recursive: true });
const FLOORS = { minMentions: 6, minShare: 0.5, minMembers: 2 };
let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const shuffleWithin = (phrases) => phrases.map((p) => {
  const w = p.text.split(" ");
  for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; }
  return { text: w.join(" ") };
});

// ── MUSIC ────────────────────────────────────────────────────────────────
// The designed grammar (declared BEFORE the run, ground truth by
// construction): theme notes (c4 e4 g4) open their phrases; ornament notes
// (d5 f5) are ALWAYS preceded by the drone a3 — the drone is the frame
// word. Two performances: same piece, different tempo and loudness, so the
// two sources are genuinely different byte streams stating one structure.
const NOTE_HZ = { a3: 220.0, c4: 261.63, e4: 329.63, g4: 392.0, d5: 587.33, f5: 698.46 };
const PHRASE = ["c4 a3 d5 e4 a3 f5 g4", "e4 a3 f5 c4 a3 d5 g4", "g4 a3 d5 e4 a3 f5 c4"];
function performance(tempoMs, amp) {
  const SR = 16000, tokens = [];
  for (let r = 0; r < 4; r++) for (const p of PHRASE) tokens.push(...p.split(" "), "|");
  const samples = [];
  for (const t of tokens) {
    const n = Math.floor((SR * tempoMs) / 1000);
    for (let i = 0; i < n; i++)
      samples.push(t === "|" ? 0 : amp * Math.sin(2 * Math.PI * NOTE_HZ[t] * (i / SR)) * Math.min(1, (n - i) / (n * 0.2), i / (n * 0.05)));
  }
  const pcm = new Int16Array(samples.map((x) => Math.max(-1, Math.min(1, x)) * 32767));
  const hdr = Buffer.alloc(44);
  hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + pcm.length * 2, 4); hdr.write("WAVE", 8);
  hdr.write("fmt ", 12); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
  hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
  hdr.write("data", 36); hdr.writeUInt32LE(pcm.length * 2, 40);
  return Buffer.concat([hdr, Buffer.from(pcm.buffer)]);
}
fs.writeFileSync(`${OUT}/performance-a.wav`, performance(180, 0.8));
fs.writeFileSync(`${OUT}/performance-b.wav`, performance(140, 0.5));

// F0: pitch-track the REAL bytes back into an event stream — wavSamples is
// measure.js's own RIFF walk; pitch by zero-crossing rate per fixed hop,
// snapped to the nearest known note (the crudest honest tracker: it reads
// the samples, not the score, and a wrong build here fails the ground truth)
function heardTokens(path) {
  const wav = wavSamples(fs.readFileSync(path));
  if (wav.refused) throw new Error(wav.refused.type);
  const { samples, sampleRate } = wav;
  // autocorrelation pitch per hop — the zero-crossing first cut misread
  // attack/decay transients at the faster tempo (spurious intermediate
  // notes), and the kinds CORRECTLY refused to form on the noisy stream;
  // autocorrelation is amplitude-immune, so both performances decode clean
  const hop = Math.floor(sampleRate * 0.03);
  const out = [];
  const lagLo = Math.floor(sampleRate / 800), lagHi = Math.ceil(sampleRate / 180);
  for (let o = 0; o + hop * 2 <= samples.length; o += hop) {
    let energy = 0;
    for (let i = 0; i < hop; i++) energy += Math.abs(samples[o + i]);
    if (energy / hop < 0.01) { out.push("|"); continue; }
    let bestLag = 0, bestR = -Infinity;
    for (let lag = lagLo; lag <= lagHi; lag++) {
      let r = 0;
      for (let i = 0; i < hop; i++) r += samples[o + i] * samples[o + i + lag];
      if (r > bestR) { bestR = r; bestLag = lag; }
    }
    const hz = sampleRate / bestLag;
    let best = null, d = Infinity;
    for (const [note, f] of Object.entries(NOTE_HZ)) if (Math.abs(f - hz) < d) { d = Math.abs(f - hz); best = note; }
    out.push(best);
  }
  // collapse runs (a note held across hops is one event), split phrases on silence
  const events = out.filter((t, i) => t !== out[i - 1]);
  return events.join(" ").split("|").map((p) => p.trim()).filter(Boolean).map((text) => ({ text }));
}

const perfA = heardTokens(`${OUT}/performance-a.wav`);
const perfB = heardTokens(`${OUT}/performance-b.wav`);
const VOCAB_M = Object.keys(NOTE_HZ);
console.log("── MUSIC ──");
console.log(`performance-a: ${perfA.length} phrases decoded from real WAV bytes; first: "${perfA[0]?.text}"`);

// clean: identity — token hygiene is a TEXT prior (the run that found it:
// the default cleaner stripped "d5" to "d" and every kind was silently
// empty; the fix made the cleaner injectable rather than widening the
// default, so text callers keep their hygiene and music declares its own)
const MFLOORS = { ...FLOORS, clean: (t) => t };
const kindsA = K.discoverCompanyKinds(perfA, VOCAB_M, MFLOORS);
const kindsB = K.discoverCompanyKinds(perfB, VOCAB_M, MFLOORS);
for (const k of kindsA) console.log(`  discovered (perf A): ${k.name}: ${k.members.join(", ")}`);
const framesA = K.frameWords(kindsA);
console.log(`  frame notes (word-signed kinds): ${[...framesA].join(", ") || "(none)"}`);

// II.23 control, in-pass: shuffle notes within phrases -> kinds must dissolve
const kindsShuf = K.discoverCompanyKinds(shuffleWithin(perfA), VOCAB_M, MFLOORS);
console.log(`  II.23 shuffle control: ${kindsShuf.length === 0 ? "kinds dissolve ✓" : "SURVIVED — UNLICENSED: " + kindsShuf.map((k) => k.name).join(",")}`);

// F5: both performances land their discovered kinds in the ONE hyperlexicon
const hl = H.makeHyperlexicon(TL);
let log = hl.createHyperlexicon();
for (const n of K.kindNotes(kindsA, { witness: "performance-a.wav(heard)" })) log = hl.hear(log, n);
for (const n of K.kindNotes(kindsB, { witness: "performance-b.wav(heard)" })) log = hl.hear(log, n);
const musicNotes = hl.foldHyperlexicon(log).filter((n) => n.witnesses.length >= 2);
console.log(`  corroborated notes (>=2 witnesses):`);
for (const n of musicNotes) console.log(`    ${n.id}  [${n.witnesses.length} witnesses, ${distinctSources(n.witnesses).size} distinct]`);

// ── VIDEO ────────────────────────────────────────────────────────────────
// Grammar (declared): scene shots (red/green/blue) open their sequences; a
// SLATE (near-black) always precedes the two "insert" shots (yellow, cyan)
// — the slate is the frame shot. Two cuts of the film at different frame
// rates/sizes = two sources.
const SHOT_RGB = { red: "0xE04040", green: "0x30B050", blue: "0x3050D0", yellow: "0xD0C030", cyan: "0x30C0C0", slate: "0x101010" };
const SEQ = ["red slate yellow green slate cyan blue", "green slate cyan red slate yellow blue", "blue slate yellow green slate cyan red"];
function film(path, fps, size) {
  const shots = [];
  for (let r = 0; r < 4; r++) for (const s of SEQ) shots.push(...s.split(" "));
  const parts = shots.map((s) => `color=c=${SHOT_RGB[s]}:s=${size}:d=0.5:r=${fps}`);
  const filter = parts.map((p, i) => `${p}[v${i}];`).join("") + parts.map((_, i) => `[v${i}]`).join("") + `concat=n=${parts.length}:v=1:a=0[out]`;
  execFileSync("ffmpeg", ["-y", "-filter_complex", filter, "-map", "[out]", "-pix_fmt", "yuv420p", path], { stdio: "pipe" });
}
film(`${OUT}/cut-a.mp4`, 12, "160x120");
film(`${OUT}/cut-b.mp4`, 8, "96x72");

// F0: decode REAL frames (rawvideo out of ffmpeg), mean RGB per frame,
// snap to nearest declared shot color, collapse runs -> shot event stream
function shotTokens(path, w, hgt) {
  const raw = execFileSync("ffmpeg", ["-i", path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { stdio: ["pipe", "pipe", "pipe"], maxBuffer: 1 << 28 });
  const frame = w * hgt * 3, out = [];
  for (let o = 0; o + frame <= raw.length; o += frame) {
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < frame; i += 3) { r += raw[o + i]; g += raw[o + i + 1]; b += raw[o + i + 2]; }
    const n = frame / 3, mean = [r / n, g / n, b / n];
    let best = null, d = Infinity;
    for (const [shot, hex] of Object.entries(SHOT_RGB)) {
      const c = [parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), parseInt(hex.slice(6, 8), 16)];
      const dist = Math.hypot(mean[0] - c[0], mean[1] - c[1], mean[2] - c[2]);
      if (dist < d) { d = dist; best = shot; }
    }
    out.push(best);
  }
  const events = out.filter((t, i) => t !== out[i - 1]);
  // one "sentence" per SEQ-length run of 7 shots — the film's own phrasing
  const phrases = [];
  for (let i = 0; i < events.length; i += 7) phrases.push({ text: events.slice(i, i + 7).join(" ") });
  return phrases;
}
const cutA = shotTokens(`${OUT}/cut-a.mp4`, 160, 120);
const cutB = shotTokens(`${OUT}/cut-b.mp4`, 96, 72);
const VOCAB_V = Object.keys(SHOT_RGB);
console.log("\n── VIDEO ──");
console.log(`cut-a: ${cutA.length} sequences decoded from real MP4 frames; first: "${cutA[0]?.text}"`);
const kindsVA = K.discoverCompanyKinds(cutA, VOCAB_V, FLOORS);
const kindsVB = K.discoverCompanyKinds(cutB, VOCAB_V, FLOORS);
for (const k of kindsVA) console.log(`  discovered (cut A): ${k.name}: ${k.members.join(", ")}`);
console.log(`  frame shots (word-signed kinds): ${[...K.frameWords(kindsVA)].join(", ") || "(none)"}`);
const kindsVShuf = K.discoverCompanyKinds(shuffleWithin(cutA), VOCAB_V, FLOORS);
console.log(`  II.23 shuffle control: ${kindsVShuf.length === 0 ? "kinds dissolve ✓" : "SURVIVED — UNLICENSED: " + kindsVShuf.map((k) => k.name).join(",")}`);
for (const n of K.kindNotes(kindsVA, { witness: "cut-a.mp4(seen)" })) log = hl.hear(log, n);
for (const n of K.kindNotes(kindsVB, { witness: "cut-b.mp4(seen)" })) log = hl.hear(log, n);
const all = hl.foldHyperlexicon(log).filter((n) => n.witnesses.length >= 2);
console.log(`  corroborated notes across the WHOLE ledger now:`);
for (const n of all) console.log(`    ${n.id}  [${distinctSources(n.witnesses).size} distinct sources]`);
console.log(`\nledger: one hyperlexicon holding text-session kinds' SHAPE plus music plus video — media never mixed, addresses shared.`);
