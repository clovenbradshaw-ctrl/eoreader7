// modality-transfer.mjs — TODAY'S ORGANS, UNMODIFIED, ON OTHER MODALITIES.
//
// The user (2026-09-25): "be sure that our competency in ANYTHING can help
// us comprehend ANYTHING regardless of modality." A competency that only
// works on the modality it was built on is a hack wearing a handle. Two
// organs built today on text are run here on music and on code with no
// change to either organ — only an adapter that says what an event is:
//
//   EDDINGTON (kernel/arrow.js)   on the two Bach MIDI fixtures — the event
//     is a melodic INTERVAL (pitch delta between successive onsets, so the
//     reading is transposition-blind) — and on a JavaScript token stream.
//     Reversed copies must read "backward" against the forward habit;
//     shuffled copies must lose their arrow. The habit for each piece is
//     the OTHER piece, read forward: Hume's habit crosses works, not files.
//   PARTEE (kernel/temporal-reference.js, through adapters/code/code-time.js)
//     on real source files of this repo: forward statement order, reversed,
//     and N seeded shuffles. Text never moved this organ under reversal
//     (three wirings, three "held"); code must, because definition precedes
//     use, and a reversed program has uses with nothing to reach back to.
//
// THE NULLS ARE THE ORGANS' OWN. arrow.js ranks against its symmetrized
// bootstrap; code-time's shuffled arms are the transplant harness's own
// discipline (seeded, declared, ranked). Nothing here is tuned to the
// modality.
//
//   node modality-transfer.mjs [--seeds=1,2,3,4,5,6,7,8] [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { arrowOf } from "../../kernel/arrow.js";
import { parseMidi } from "../../adapters/midi/midi.js";
import { statementsOf, codeTime, loadKeywords } from "../../adapters/code/code-time.js";
import { lcg, shuffled } from "../../kernel/continuation.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "..", "..");
const argv = process.argv.slice(2);
const SEEDS = (argv.find((a) => a.startsWith("--seeds=")) ?? "--seeds=1,2,3,4,5,6,7,8").split("=")[1].split(",").map(Number);
const JSON_OUT = argv.includes("--json");
const out = { generatedAt: new Date().toISOString(), seeds: SEEDS, midi: [], codeArrow: [], codeTime: [] };

// ── 1. EDDINGTON ON MUSIC ────────────────────────────────────────────────────
const MIDI = ["wtk1-prelude1.mid", "bwv-988-aria.mid"].map((f) => path.join(NATIVE, "eval", "the-fold", "fixtures", "midi", f));
const intervalsOf = (file) => {
  const parsed = parseMidi(fs.readFileSync(file));
  if (parsed.refused) throw new Error(`${file}: ${parsed.refused.type}`);
  const notes = [...parsed.notes].sort((a, b) => a.tick - b.tick || a.pitch - b.pitch);
  const seq = [];
  for (let i = 1; i < notes.length; i += 1) seq.push(String(notes[i].pitch - notes[i - 1].pitch));
  return { seq, notes: notes.length, ticksPerBeat: parsed.ticksPerBeat };
};
const music = MIDI.map((f) => ({ file: path.basename(f), ...intervalsOf(f) }));
for (let i = 0; i < music.length; i += 1) {
  const me = music[i], habit = music[(i + 1) % music.length].seq;
  const arm = (name, seq) => { const a = arrowOf(seq, { k: 2, draws: 32, seed: 7, reference: habit }); return { arm: name, verdict: a.verdict, direction: a.direction, irreversibility: +a.irreversibility.toFixed(4), nullMax: +a.null.max.toFixed(4), n: a.n }; };
  const rng = lcg(SEEDS[0]);
  out.midi.push({ file: me.file, notes: me.notes, habit: music[(i + 1) % music.length].file, arms: [arm("forward", me.seq), arm("reversed", [...me.seq].reverse()), arm(`shuffled@${SEEDS[0]}`, shuffled(me.seq, rng))] });
}

// ── 2. EDDINGTON ON CODE ─────────────────────────────────────────────────────
const CODE = ["kernel/arrow.js", "kernel/temporal-reference.js", "adapters/text/morph-cues.js"].map((f) => path.join(NATIVE, f));
const tokensOf = (text) => (text.match(/[A-Za-z_$][\w$]*|\d+|[^\s\w]/g) ?? []).map((t) => t.toLowerCase());
const codeTexts = CODE.map((f) => ({ file: path.relative(NATIVE, f), tokens: tokensOf(fs.readFileSync(f, "utf8")) }));
for (let i = 0; i < codeTexts.length; i += 1) {
  const me = codeTexts[i], habit = codeTexts[(i + 1) % codeTexts.length].tokens;
  const arm = (name, seq) => { const a = arrowOf(seq, { k: 2, draws: 32, seed: 7, reference: habit }); return { arm: name, verdict: a.verdict, direction: a.direction, irreversibility: +a.irreversibility.toFixed(4), nullMax: +a.null.max.toFixed(4), n: a.n }; };
  out.codeArrow.push({ file: me.file, habit: codeTexts[(i + 1) % codeTexts.length].file, arms: [arm("forward", me.tokens), arm("reversed", [...me.tokens].reverse()), arm(`shuffled@${SEEDS[0]}`, shuffled(me.tokens, lcg(SEEDS[0])))] });
}

// ── 3. PARTEE ON CODE — the transplant the text could not give ───────────────
const KW = loadKeywords();
for (const f of CODE) {
  const S = statementsOf(fs.readFileSync(f, "utf8"), KW);
  const names = new Set(S.flatMap((s) => s.declares));
  const count = (stmts) => { const r = codeTime(stmts, { names }); return { bound: r.counts.bound, no_candidate: r.counts.no_candidate, references: r.counts.references, declarations: r.counts.declarations, superseded: r.counts.superseded }; };
  const fwd = count(S), rev = count([...S].reverse());
  const sh = SEEDS.map((s) => count(shuffled(S, lcg(s))));
  const rows = {};
  for (const k of ["bound", "no_candidate"]) {
    const vals = sh.map((x) => x[k]);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const beyond = rev[k] >= fwd[k] ? vals.filter((v) => v >= rev[k]).length : vals.filter((v) => v <= rev[k]).length;
    rows[k] = { forward: fwd[k], reversed: rev[k], shuffled: [lo, hi], rank: beyond / vals.length, reading: rev[k] === fwd[k] && lo === fwd[k] && hi === fwd[k] ? "held" : rev[k] > hi || rev[k] < lo ? "ARROW — outside every shuffled draw" : "disorder" };
  }
  out.codeTime.push({ file: path.relative(NATIVE, f), statements: S.length, declarations: fwd.declarations, references: fwd.references, superseded: fwd.superseded, rows });
}

// ── report ───────────────────────────────────────────────────────────────────
if (JSON_OUT) { console.log(JSON.stringify(out, null, 1)); }
else {
  console.log(`MODALITY TRANSFER · ${out.generatedAt} · organs unmodified · shuffled seeds ${SEEDS.join(",")}`);
  console.log(`\nEDDINGTON ON MUSIC — melodic intervals between successive onsets; habit = the other piece read forward`);
  for (const m of out.midi) {
    console.log(`${m.file} (${m.notes} notes; habit ${m.habit})`);
    for (const a of m.arms) console.log(`  ${a.arm.padEnd(12)} ${a.verdict.padStart(13)} ${String(a.direction ?? "—").padStart(9)}   irrev ${a.irreversibility}  null max ${a.nullMax}  n ${a.n}`);
  }
  console.log(`\nEDDINGTON ON CODE — token stream; habit = the next file read forward`);
  for (const c of out.codeArrow) {
    console.log(`${c.file} (habit ${c.habit})`);
    for (const a of c.arms) console.log(`  ${a.arm.padEnd(12)} ${a.verdict.padStart(13)} ${String(a.direction ?? "—").padStart(9)}   irrev ${a.irreversibility}  null max ${a.nullMax}  n ${a.n}`);
  }
  console.log(`\nPARTEE ON CODE — declarations establish and advance a name's ground; references resolve against it; reversed statement order`);
  console.log(`${"file".padEnd(36)} ${"row".padEnd(13)} ${"forward".padStart(8)} ${"reversed".padStart(9)} ${"shuffled".padStart(10)} ${"rank".padStart(5)}   reading`);
  for (const c of out.codeTime) {
    for (const [k, r] of Object.entries(c.rows)) console.log(`${c.file.padEnd(36)} ${k.padEnd(13)} ${String(r.forward).padStart(8)} ${String(r.reversed).padStart(9)} ${`${r.shuffled[0]}–${r.shuffled[1]}`.padStart(10)} ${r.rank.toFixed(2).padStart(5)}   ${r.reading}`);
    console.log(`${"".padEnd(36)} (${c.statements} statements, ${c.declarations} declarations, ${c.references} references, ${c.superseded} superseded)`);
  }
}
const outPath = path.join(HERE, "results", "modality-transfer.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
if (!JSON_OUT) console.log(`\n-> ${path.relative(process.cwd(), outPath)}`);
