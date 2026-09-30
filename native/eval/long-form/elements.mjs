// native/eval/long-form/elements.mjs — the missing elements (ONE-PIPELINE.md,
// "The missing elements"), each run on a book already written and held to
// the control stated before it was built. Offline: no model is asked.
//
//   E1 SIG·Figure  pronoun binding recovers parts where the being goes
//                  unnamed. Control: the pronouns of nameless sentences
//                  flipped in gender — binding that reads who is meant loses
//                  them; binding that only counts pronouns does not.
//   E2 NUL·Figure  strangers that recur (established) vs one-offs, and the
//                  share of all stray mentions the established ones carry.
//   E3 NUL·Pattern the book's verdict under kernel/settling.js: stuck
//                  (settled in any order), moving (settles in sequence), or
//                  churning (never settles). Control: the verdict must differ
//                  between books, or it reads nothing about any of them.
//   E4 SEG·Pattern seams (adjacent parts sharing no being) against the parts
//                  where the archons tried a bridge. Control: seams of the
//                  same parts in a shuffled order, same bridge parts.
//   E5 DEF·Pattern contradictions of the prose's own possessive facts.
//                  Control: redeal — each relation's values permuted among
//                  its subjects (organs/derivation.js's control); a count the
//                  redeal matches says nothing about the book.
//
//   node native/eval/long-form/elements.mjs <dir> [--state=ledger] [--edit-log=ledger-edited.log.jsonl]
import fs from "node:fs";
import path from "node:path";
import { sentences } from "../../adapters/text/english-parser.js";
import { makeLongForm, makeTextStore, outlineOf } from "../../organs/long-form.js";
import { PROSE_MEDIUM } from "../../adapters/build/prose-medium.js";
import { makeNotes } from "../../kernel/notes.js";
import { lcg } from "../../kernel/continuation.js";
import { readBack, clearance, stuck, seams, laws } from "../../organs/read-back.js";

const dir = process.argv[2];
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const stateName = arg("state", "ledger");
const outline = JSON.parse(fs.readFileSync(path.join(dir, "outline.json"), "utf8"));
const state = JSON.parse(fs.readFileSync(path.join(dir, `${stateName}.state.json`), "utf8"));
const none = async () => { throw new Error("elements.mjs asks nothing"); };
const lf = makeLongForm({ ask: none, sentences, medium: PROSE_MEDIUM, castDetails: outline.castDetails });
const store = makeTextStore(state.store);
const o = outlineOf(makeNotes().fold(state.notes), PROSE_MEDIUM);
const cast = o.cast.map((c) => ({ id: c.id, name: c.name }));
const groups = [];
const parts = o.leaves.map((leaf) => {
  const g = leaf.within.at(-1)?.id ?? "whole";
  if (groups.at(-1) !== g) groups.push(g);
  const cur = lf.currentLines(state.notes, store, leaf.part.id);
  return { id: leaf.part.id, chapter: groups.length - 1, lines: (cur?.lines ?? []).map((l) => ({ text: l.text, addr: l.addr })) };
}).filter((p) => p.lines.length);
const being = cast[0];
const known = o.cast.flatMap((c) => c.props.filter((p) => (outline.castDetails ?? []).includes(p.label) || ["home", "lacks", "becomes"].includes(p.label)).map((p) => p.value));
const report = { dir, state: stateName, parts: parts.length, cast: cast.map((c) => c.name) };
console.log(`${dir} · ${stateName} · ${parts.length} parts · cast ${cast.map((c) => c.name).join(", ")} · the being: ${being?.name}`);

// ── E1 SIG·Figure ──
const read = readBack({ parts, cast, sentences, known });
const unnamed = read.parts.filter((p) => !p.named.includes(being.id));
const recovered = unnamed.filter((p) => p.bound.includes(being.id));
const FLIP = new Map([["she", "he"], ["She", "He"], ["her", "his"], ["Her", "His"], ["herself", "himself"], ["he", "she"], ["He", "She"], ["his", "her"], ["His", "Her"], ["him", "her"], ["himself", "herself"]]);
const flipWord = (w) => { const letter = (ch) => ch.toLowerCase() !== ch.toUpperCase(); let a = 0, b = w.length; while (a < b && !letter(w[a])) a++; while (b > a && !letter(w[b - 1])) b--; const core = w.slice(a, b); return FLIP.has(core) ? w.slice(0, a) + FLIP.get(core) + w.slice(b) : w; };
const flipped = parts.map((p) => ({ ...p, lines: p.lines.map((l) => ({ ...l, text: sentences(l.text).map((s) => (cast.some((c) => s.text.includes(c.name)) ? s.text : s.text.split(" ").map(flipWord).join(" "))).join(" ") })) }));
const readF = readBack({ parts: flipped, cast, sentences, known });
const recoveredF = readF.parts.filter((p) => !p.named.includes(being.id) && p.bound.includes(being.id));
report.E1 = { unnamed: unnamed.length, recovered: recovered.length, recoveredUnderFlip: recoveredF.length, bindings: read.bindings, bindingsUnderFlip: readF.bindings };
console.log(`E1 SIG·Figure   ${being.name} unnamed in ${unnamed.length} of ${parts.length} parts; pronoun binding recovers ${recovered.length} (${read.bindings} bindings). Control, nameless pronouns flipped: recovers ${recoveredF.length} (${readF.bindings} bindings)`);

// ── E2 NUL·Figure ──
const cl = clearance(read);
const mentions = (list) => list.reduce((a, e) => a + read.parts.reduce((s, p) => s + (p.strangers[e.name] ?? 0), 0), 0);
const estM = mentions(cl.established), refM = mentions(cl.refused);
report.E2 = { established: cl.established.length, refused: cl.refused.length, establishedMentions: estM, oneOffMentions: refM, top: cl.established.slice(0, 8) };
console.log(`E2 NUL·Figure   strangers: ${cl.established.length} recur (${estM} mentions), ${cl.refused.length} one-offs (${refM}); recurring: ${cl.established.slice(0, 8).map((e) => `${e.name}×${e.parts}p`).join(" ")}`);

// ── E3 NUL·Pattern ──
const openings = parts.map((p) => (p.lines[0]?.text ?? "").split(" ")[0].toLowerCase());
const st = stuck(read, { pValue: 0.05, rng: lcg(7), openings });
report.E3 = { verdict: st.verdict ?? st.gap, p: st.p ?? null, runMass: st.runMass, maxRun: st.maxRun, settled: st.settled };
console.log(`E3 NUL·Pattern  ${st.verdict ?? st.gap}${st.p != null ? ` (p=${st.p})` : ""} · run mass ${st.runMass}, longest run ${st.maxRun} · slots held: ${JSON.stringify(st.settled)}`);

// ── E4 SEG·Pattern ──
const sm = seams(read, cl);
const logFile = path.join(dir, arg("edit-log", "ledger-edited.log.jsonl"));
if (fs.existsSync(logFile)) {
  const idx = new Map(parts.map((p, k) => [p.id, k]));
  const bridged = new Set();
  for (const line of fs.readFileSync(logFile, "utf8").split("\n")) { if (!line) continue; let x; try { x = JSON.parse(line); } catch { continue; } if ((x.kind === "edit_kept" || x.kind === "edit_undone" || x.kind === "edit_refused") && (x.license === "bridge" || x.finding === "no_bridge" || x.finding === "takes_nothing_up") && idx.has(x.part)) bridged.add(idx.get(x.part)); }
  const hit = sm.filter((k) => bridged.has(k)).length;
  const rng = lcg(11);
  let ctl = 0, atLeast = 0; const DRAWS = 200;   // set by hand 2026-09-28: enough shuffles for a stable mean
  for (let d = 0; d < DRAWS; d++) {
    const perm = read.parts.slice();
    for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const s2 = seams({ parts: perm }, cl);
    const pr = s2.filter((k) => bridged.has(k)).length / Math.max(1, s2.length);
    ctl += pr; if (pr >= hit / Math.max(1, sm.length)) atLeast++;
  }
  const pShuffle = (atLeast + 1) / (DRAWS + 1);
  report.E4 = { seams: sm.length, bridged: bridged.size, seamsAtBridges: hit, precision: sm.length ? hit / sm.length : null, shuffledPrecision: ctl / DRAWS, p: pShuffle, baseRate: bridged.size / parts.length };
  console.log(`E4 SEG·Pattern  ${sm.length} seams; ${bridged.size} parts where a bridge was tried; ${hit} seams fall there (${sm.length ? Math.round((100 * hit) / sm.length) : 0}%). Control, parts shuffled: ${Math.round((100 * ctl) / DRAWS)}% (p=${pShuffle.toFixed(3)}) · base rate ${Math.round((100 * bridged.size) / parts.length)}%`);
} else {
  report.E4 = { seams: sm.length, bridged: null };
  console.log(`E4 SEG·Pattern  ${sm.length} seams of ${parts.length - 1} links (no edit log to hold them against)`);
}

// ── E5 DEF·Pattern ──
const lw = laws(read);
const edges = read.parts.flatMap((p) => p.facts);
const byLabel = new Map();
for (const e of edges) { if (!byLabel.has(e.label)) byLabel.set(e.label, []); byLabel.get(e.label).push(e); }
const rngR = lcg(13);
let redealt = 0; const RD = 200;   // set by hand 2026-09-28: redeal draws
for (let d = 0; d < RD; d++) {
  const dealt = [];
  for (const [, es] of byLabel) { const vals = es.map((e) => e.end2); for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(rngR() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; } es.forEach((e, i) => dealt.push({ ...e, end2: vals[i] })); }
  redealt += laws({ parts: [{ facts: dealt }] }).contradictions.length;
}
report.E5 = { facts: lw.edges, contradictions: lw.contradictions.length, redeal: redealt / RD, refutedRelations: lw.scan.refuted.map((r) => r.rel), candidates: lw.scan.candidates.map((r) => r.rel), examples: lw.contradictions.slice(0, 5) };
console.log(`E5 DEF·Pattern  ${lw.edges} possessive facts; ${lw.contradictions.length} contradictions the book made itself; control redeal: ${(redealt / RD).toFixed(1)}. ${lw.contradictions.slice(0, 3).map((c) => `${cast.find((x) => x.id === c.subject)?.name}'s ${c.label}: ${c.values.map((v) => v.value).join(" / ")}`).join("; ")}`);
fs.writeFileSync(path.join(dir, `elements.${stateName}.json`), JSON.stringify(report, null, 1));
