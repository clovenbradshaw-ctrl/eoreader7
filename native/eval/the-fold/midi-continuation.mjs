// eval/the-fold/midi-continuation.mjs — continue a real piece of music from
// a prior sedimented from what was heard so far, teaching it no music.
//
// THE ASK (user, 2026-09-02): "build out our priors influencing our reading
// and generation more, and not just with text but with music, where we
// generate a continuation of a midi file mid stream without teaching it
// music theory."
//
// WHAT HAPPENS. Two real Bach files (public domain, fixtures/midi/SOURCES.md)
// are read at floor 0 by adapters/midi/midi.js — note events with tick
// addresses, no interpretation. Each note becomes one event token carrying
// only what the file says: pitch, duration in ticks, and the gap to the next
// onset in ticks. The piece is split MID-STREAM: the first SPLIT of its
// notes are "heard"; the rest is held out. kernel/continuation.js sediments
// a prior from the heard part at declared grains (order 1..ORDER) and:
//   1. PREDICTS the held-out notes one at a time, prequentially — scored in
//      bits per note, against the same prior sedimented from a SHUFFLED
//      hearing (order destroyed, marginals kept: the control built to fail)
//      and against the bare alphabet (order 0).
//   2. CONTINUES the piece from where the hearing stopped, N notes, seeded.
//      The continuation is written out as a .mid beside the original and
//      beside a shuffled-prior continuation, so a person can listen.
//   3. IS JUDGED BY THE READING ORGANS, not by ear: arrangementsFrom and
//      discoverCompanyKinds are run on the continuation exactly as they were
//      run on the original, and the share of the original's own recurrent
//      arrangements and kinds that the continuation reproduces is reported —
//      for the real prior and for the shuffled control. Novelty is reported
//      beside it (share of 3-grams the hearing never contained), so a
//      continuation that merely replays is visible as such.
//   4. CROSS-WORK: the prior from the OTHER piece, merged with this piece's
//      own hearing, predicts this piece's held-out notes — does experience of
//      another work help, hurt, or do nothing? (This is the sedimented-prior
//      question the text side has compiled and never consumed.)
//
// NO MUSIC THEORY: no scale, no key, no chord, no meter is named anywhere.
// The one received convention is note NAMING (c4 = MIDI 60), a projection
// used for display and for the kind organ's vocabulary; the model itself
// runs on MIDI numbers and tick counts, which are the file's own.
import fs from "node:fs";
import { parseMidi, writeMidi, noteName } from "../../adapters/midi/midi.js";
import { sedimentPrior, mergePriors, scorePrequential, continueStream, lcg, shuffled, sedimentShapePrior, mergeShapePriors, scorePrequentialWithShape, continueStreamWithShape, expertOf, runMixture, continueMixture } from "../../kernel/continuation.js";
import { arrangementsFrom } from "../../organs/event-arrangements.js";
import { discoverCompanyKinds } from "../../organs/kind-standing.js";

const HERE = new URL(".", import.meta.url).pathname;
const OUT = `${HERE}results/midi`;
fs.mkdirSync(OUT, { recursive: true });
const PIECES = ["wtk1-prelude1", "bwv-988-aria"];
// declared, every one, before the run
const SPLIT = Number(process.env.SPLIT ?? 0.6);
const ORDER = Number(process.env.ORDER ?? 3);
const CONTINUE = Number(process.env.CONTINUE ?? 64);
const SEED = Number(process.env.SEED ?? 11);
const KIND_FLOORS = { minMentions: 8, minShare: 0.5, minMembers: 1, clean: (t) => t, nullArm: { draws: 100, seed: 0, alpha: 0.05 } };

const say = (s) => console.log(s);
say(`midi continuation — split ${SPLIT}, order ${ORDER}, continue ${CONTINUE} notes, seed ${SEED}, no theory\n`);

function tokensOf(notes) {
  // pitch / duration ticks / gap-to-next-onset ticks — the file's own numbers
  return notes.map((n, i) => `${n.pitch}/${n.dur}/${i + 1 < notes.length ? notes[i + 1].tick - n.tick : 0}`);
}
function notesFromTokens(tokens, startTick) {
  let tick = startTick;
  return tokens.map((t) => { const [pitch, dur, gap] = t.split("/").map(Number); const n = { tick, dur, pitch, velocity: 80 }; tick += gap; return n; });
}
function phrasesOf(notes, ticksPerBeat) {
  // a phrase for the kind organ = the notes within one span of 4 beats of the
  // file's own ticksPerBeat — a length in the file's units, not a meter
  const bar = ticksPerBeat * 4;
  const byBar = new Map();
  for (const n of notes) { const b = Math.floor(n.tick / bar); if (!byBar.has(b)) byBar.set(b, []); byBar.get(b).push(noteName(n.pitch)); }
  return [...byBar.values()].map((ns) => ({ text: ns.join(" ") }));
}
const pitchVocab = (notes) => [...new Set(notes.map((n) => noteName(n.pitch)))];

// ── STRUCTURAL ANALOGY SOURCES: anything with a stream, none of it music ──
// A novel (Dracula, words in order), the instrument's own operational record
// (event names in order), and the OTHER Bach piece — each sedimented into a
// shape prior (how streams move: repeat / return / new), never into symbols.
const FOLD = `${HERE}../../../../the-fold`;
const words = (text, cap) => (text.toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).slice(0, cap);
const analogs = {};
try { analogs.novel = words(fs.readFileSync(`${FOLD}/../live_priors/01-literature-books/gutenberg/pg345_Dracula.txt`, "utf8"), 40000); } catch { /* not on this machine */ }
try { analogs.record = fs.readFileSync(`${FOLD}/record/explore-record.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l).event ?? "?"; } catch { return "?"; } }); } catch { /* no record here */ }
const SHAPE_ORDER = ORDER;
const shapeFrom = (name, ev) => sedimentShapePrior(ev, { order: SHAPE_ORDER, giver: name });
for (const [k, ev] of Object.entries(analogs)) say(`analog stream "${k}": ${ev.length} events, ${new Set(ev).size} distinct — shape prior only, symbols never cross`);
say("");

const pieces = {};
for (const name of PIECES) {
  const r = parseMidi(fs.readFileSync(`${HERE}fixtures/midi/${name}.mid`));
  if (r.refused) throw new Error(`${name}: ${r.refused.type}`);
  const cut = Math.floor(r.notes.length * SPLIT);
  const tokens = tokensOf(r.notes);
  pieces[name] = { r, cut, heard: tokens.slice(0, cut), held: tokens.slice(cut), tokens };
  say(`${name}: ${r.notes.length} notes, ${r.tracks.length} tracks, ${r.ticksPerBeat} ticks/beat · heard ${cut}, held out ${r.notes.length - cut} · alphabet ${new Set(tokens).size} distinct events`);
}
say("");

for (const name of PIECES) {
  const P = pieces[name];
  const other = PIECES.find((n) => n !== name);
  const rng = lcg(SEED);
  const own = sedimentPrior(P.heard, { order: ORDER, giver: `${name}:heard-${P.cut}` });
  const ctrl = sedimentPrior(shuffled(P.heard, lcg(SEED + 1)), { order: ORDER, giver: `${name}:heard-shuffled` });
  const alphabetOnly = sedimentPrior(P.heard, { order: 1, giver: `${name}:order-1` });
  const cross = mergePriors([own, sedimentPrior(pieces[other].tokens, { order: ORDER, giver: `${other}:whole` })], { giver: `${name}+${other}` });

  say(`── ${name} ──`);
  say(`1. PREQUENTIAL on the ${P.held.length} held-out notes (bits per note, lower is better; top-1 = the prior's most-expected note was the actual one)`);
  const rows = [["own hearing, order " + ORDER, scorePrequential(own, P.held)], ["own hearing, order 1", scorePrequential(alphabetOnly, P.held)], ["SHUFFLED hearing (control)", scorePrequential(ctrl, P.held)], [`own + ${other} (cross-work)`, scorePrequential(cross, P.held)]];
  for (const [label, s] of rows) say(`   ${label.padEnd(34)} ${s.bitsPerEvent.toFixed(2).padStart(6)} bits/note  top-1 ${(100 * s.top1).toFixed(1).padStart(5)}%  unseen ${s.unseen}  answered at grain ${JSON.stringify(s.grainsAnswered)}`);
  // STRUCTURAL ANALOGY: shape priors from other media bearing on the hearing's own symbol prior
  const shapeRows = [];
  const shapeSelf = shapeFrom(`${name}:heard`, P.heard);
  shapeRows.push(["own hearing's shapes", scorePrequentialWithShape(own, shapeSelf, P.held)]);
  for (const [k, ev] of Object.entries(analogs)) shapeRows.push([`shapes of ${k}`, scorePrequentialWithShape(own, shapeFrom(k, ev), P.held)]);
  shapeRows.push([`shapes of ${other} (music)`, scorePrequentialWithShape(own, shapeFrom(other, pieces[other].tokens), P.held)]);
  if (analogs.novel) shapeRows.push(["shapes of SHUFFLED novel (control)", scorePrequentialWithShape(own, shapeFrom("novel-shuffled", shuffled(analogs.novel, lcg(SEED + 3))), P.held)]);
  const everything = mergeShapePriors([shapeSelf, ...Object.entries(analogs).map(([k, ev]) => shapeFrom(k, ev)), shapeFrom(other, pieces[other].tokens)], { giver: "all analogs" });
  shapeRows.push(["shapes of EVERYTHING merged", scorePrequentialWithShape(own, everything, P.held)]);
  say(`   structural analogy — the same hearing, reweighted by how OTHER streams move:`);
  for (const [label, s] of shapeRows) say(`   ${label.padEnd(34)} ${s.bitsPerEvent.toFixed(2).padStart(6)} bits/note  top-1 ${(100 * s.top1).toFixed(1).padStart(5)}%`);
  // 4. WHAT ACTUALLY HAPPENS DECIDES — every source as an expert, weighted by
  // its surprise on the notes that actually arrived. The weights are learned
  // on the HEARD part first (the prior predicting itself as it grows — a
  // hearing is prequential too), then carried into the held-out part where
  // they keep updating. Nothing is chosen by hand.
  const own1 = sedimentPrior(P.heard, { order: 1, giver: `${name}:o1` }), own2 = sedimentPrior(P.heard, { order: 2, giver: `${name}:o2` });
  const experts = [
    expertOf("hearing@1", own1), expertOf("hearing@2", own2), expertOf("hearing@3", own),
    expertOf(`+${other} symbols`, cross),
    ...(analogs.novel ? [expertOf("hearing × novel shapes", own, shapeFrom("novel", analogs.novel))] : []),
    ...(analogs.record ? [expertOf("hearing × record shapes", own, shapeFrom("record", analogs.record))] : []),
    expertOf(`hearing × ${other} shapes`, own, shapeFrom(other, pieces[other].tokens)),
    expertOf("SHUFFLED hearing (control)", ctrl),
  ];
  const alphabetSize = new Set(P.tokens).size;
  // NOTE: the experts' priors were sedimented from the whole heard part, so
  // scoring the heard part itself is in-sample for them; it is used ONLY to
  // set the starting weights, and the held-out score is what is reported.
  const warm = runMixture(experts, P.heard, { order: ORDER, alphabetSize });
  const test = runMixture(experts, P.held, { weights: warm.weights, seen: new Set(P.heard), order: ORDER, alphabetSize });
  say(`4. WHAT ACTUALLY HAPPENS DECIDES — ${experts.length} sources, weighted by their own surprise on the notes that arrived:`);
  say(`   mixture on held-out: ${test.bitsPerEvent.toFixed(2)} bits/note  top-1 ${(100 * test.top1).toFixed(1)}%   (best single source above: ${Math.min(...rows.map((r) => r[1].bitsPerEvent), ...shapeRows.map((r) => r[1].bitsPerEvent)).toFixed(2)})`);
  const ranked = experts.map((x, j) => [x.name, test.weights[j], test.cumulativeBits[j] / P.held.length]).sort((a, b) => b[1] - a[1]);
  for (const [n, wgt, b] of ranked) say(`     ${n.padEnd(30)} weight ${wgt.toFixed(3).padStart(6)}   its own surprise ${b.toFixed(2)} bits/note`);
  say(`   the lead changed hands: ${test.leads.map((l) => `${l.expert}@${l.at}`).join(" → ") || "never"}`);
  const genMix = continueMixture(experts, test.weights, P.heard.slice(-ORDER), { length: CONTINUE, rng: lcg(SEED + 5), seen: new Set(P.tokens.slice(0, P.cut)), order: ORDER });
  const ownS = rows[0][1], ctrlS = rows[2][1], crossS = rows[3][1];
  say(`   → the hearing ${ownS.bitsPerEvent < ctrlS.bitsPerEvent ? "PREDICTS the rest better than its own shuffle" : "does NOT beat its shuffle — the prior learned nothing beyond marginals"}; cross-work experience ${crossS.bitsPerEvent < ownS.bitsPerEvent ? "helps" : crossS.bitsPerEvent > ownS.bitsPerEvent ? "hurts" : "changes nothing"} (${crossS.bitsPerEvent.toFixed(2)} vs ${ownS.bitsPerEvent.toFixed(2)}).`);

  // 2. CONTINUE from where the hearing stopped
  const seedCtx = P.heard.slice(-ORDER);
  const gen = continueStream(own, seedCtx, { length: CONTINUE, rng });
  const genCtrl = continueStream(ctrl, seedCtx, { length: CONTINUE, rng: lcg(SEED + 2) });
  const genAnalog = continueStreamWithShape(own, everything, seedCtx, { length: CONTINUE, rng: lcg(SEED + 4) });
  const lastHeard = P.r.notes[P.cut - 1];
  const startTick = lastHeard.tick + (Number(P.heard[P.cut - 1].split("/")[2]) || lastHeard.dur);
  const heardNotes = P.r.notes.slice(0, P.cut).map((n) => ({ tick: n.tick, dur: n.dur, pitch: n.pitch, velocity: n.velocity }));
  const genNotes = notesFromTokens(gen.generated.map((g) => g.event), startTick);
  const ctrlNotes = notesFromTokens(genCtrl.generated.map((g) => g.event), startTick);
  fs.writeFileSync(`${OUT}/${name}-original.mid`, writeMidi(P.r.notes, { ticksPerBeat: P.r.ticksPerBeat, tempo: P.r.tempo }));
  fs.writeFileSync(`${OUT}/${name}-heard-then-continued.mid`, writeMidi([...heardNotes, ...genNotes], { ticksPerBeat: P.r.ticksPerBeat, tempo: P.r.tempo }));
  fs.writeFileSync(`${OUT}/${name}-heard-then-shuffled-control.mid`, writeMidi([...heardNotes, ...ctrlNotes], { ticksPerBeat: P.r.ticksPerBeat, tempo: P.r.tempo }));
  const mixNotes = notesFromTokens(genMix.generated.map((g) => g.event), startTick);
  fs.writeFileSync(`${OUT}/${name}-heard-then-continued-by-mixture.mid`, writeMidi([...heardNotes, ...mixNotes], { ticksPerBeat: P.r.ticksPerBeat, tempo: P.r.tempo }));
  const analogNotes = notesFromTokens(genAnalog.generated.map((g) => g.event), startTick);
  fs.writeFileSync(`${OUT}/${name}-heard-then-continued-with-analogy.mid`, writeMidi([...heardNotes, ...analogNotes], { ticksPerBeat: P.r.ticksPerBeat, tempo: P.r.tempo }));
  const analogShapes = genAnalog.generated.reduce((m, g) => (m[g.shape] = (m[g.shape] ?? 0) + 1, m), {});
  say(`   with structural analogy (all analogs merged): moves drawn ${JSON.stringify(analogShapes)} → results/midi/${name}-heard-then-continued-with-analogy.mid`);
  const grainHist = gen.grains.reduce((m, g) => (m[g] = (m[g] ?? 0) + 1, m), {});
  say(`2. CONTINUED ${CONTINUE} notes from the last ${ORDER} heard; drawn at grain ${JSON.stringify(grainHist)} (${ORDER} = the prior had heard this exact ${ORDER}-context before; 0 = only the alphabet). Written: results/midi/${name}-heard-then-continued.mid (and -shuffled-control.mid, -original.mid)`);
  say(`   first notes: ${genNotes.slice(0, 12).map((n) => `${noteName(n.pitch)}/${n.dur}`).join(" ")}`);

  // 3. JUDGED BY THE READING ORGANS
  const pairsOf = (tokens) => { const a = arrangementsFrom(tokens.map((t) => t.split("/")[0]), { ref: name, label: "then", minRecurrence: 2 }); return new Map((a.arrangements ?? []).map((x) => [`${x.end1} ${x.end2}`, x.count])); };
  const origPairs = pairsOf(P.tokens);
  const share = (tokens) => { const p = pairsOf(tokens); let hit = 0; for (const k of origPairs.keys()) if (p.has(k)) hit += 1; return origPairs.size ? hit / origPairs.size : 0; };
  const genTokens = gen.generated.map((g) => g.event), ctrlTokens = genCtrl.generated.map((g) => g.event);
  const grams = (toks, k) => new Set(toks.map((_, i) => toks.slice(i, i + k).join(" ")).filter((g) => g.split(" ").length === k));
  const heard3 = grams(P.heard, 3);
  const novelty = (toks) => { const g = grams(toks, 3); let novel = 0; for (const x of g) if (!heard3.has(x)) novel += 1; return g.size ? novel / g.size : 0; };
  say(`3. JUDGED BY THE ORGANS — the original's recurrent pitch arrangements (${origPairs.size} pairs at ≥2): continuation reproduces ${(100 * share(genTokens)).toFixed(0)}%, shuffled control ${(100 * share(ctrlTokens)).toFixed(0)}%, the held-out rest itself ${(100 * share(P.held)).toFixed(0)}%`);
  const analogTokens = genAnalog.generated.map((g) => g.event);
  const mixTokens = genMix.generated.map((g) => g.event);
  say(`   by the mixture (weights the stream taught): reproduces ${(100 * share(mixTokens)).toFixed(0)}% of the original's arrangements, novelty ${(100 * novelty(mixTokens)).toFixed(0)}% → results/midi/${name}-heard-then-continued-by-mixture.mid`);
  say(`   with analogy: reproduces ${(100 * share(analogTokens)).toFixed(0)}% of the original's arrangements`);
  say(`   novelty (3-grams never heard): continuation ${(100 * novelty(genTokens)).toFixed(0)}% · with analogy ${(100 * novelty(analogTokens)).toFixed(0)}% · shuffled ${(100 * novelty(ctrlTokens)).toFixed(0)}% · the real rest ${(100 * novelty(P.held)).toFixed(0)}%`);
  const vocab = pitchVocab(P.r.notes);
  const kindsOrig = discoverCompanyKinds(phrasesOf(P.r.notes, P.r.ticksPerBeat), vocab, KIND_FLOORS);
  const kindsGen = discoverCompanyKinds(phrasesOf([...heardNotes, ...genNotes], P.r.ticksPerBeat), vocab, KIND_FLOORS);
  const kindsCtrl = discoverCompanyKinds(phrasesOf([...heardNotes, ...ctrlNotes], P.r.ticksPerBeat), vocab, KIND_FLOORS);
  const kindKey = (k) => `${k.name}:${[...k.members].sort().join(",")}`;
  const origK = new Set(kindsOrig.map(kindKey));
  const recover = (ks) => origK.size ? [...new Set(ks.map(kindKey))].filter((k) => origK.has(k)).length / origK.size : 0;
  say(`   kinds the organ discovered in the whole original: ${kindsOrig.length}${kindsOrig.length ? " — " + kindsOrig.slice(0, 4).map((k) => `${k.name}={${k.members.join(",")}}`).join("; ") : ""}`);
  say(`   recovered on heard+continuation: ${(100 * recover(kindsGen)).toFixed(0)}% · on heard+shuffled: ${(100 * recover(kindsCtrl)).toFixed(0)}%`);
  say("");
}
say("Every number above is on real files, from real bytes, with the same organs judging the continuation that read the original; nothing musical was named.");
