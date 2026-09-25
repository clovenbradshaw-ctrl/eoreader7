// transplant-arm.mjs — the newborn from another universe (2026-09-25).
//
// The question (user): if a mind built under one causality were transplanted
// as a newborn into a universe where causality ran differently, would it have
// trouble understanding? The house's answer is to run the transplant rather
// than argue it. Three copies of ONE chapter, the reader UNCHANGED on each:
//
//   forward   the chapter as written — causes before effects
//   reversed  the same sentences, order inverted — effects before causes
//             (Time's Arrow / Memento as a mechanical intervention: every
//             sentence intact, only the arrow flipped)
//   shuffled  the same sentences in a seeded random order — the null: as
//             disordered as "reversed" but with NO consistent arrow, so
//             anything reversed loses that shuffled also loses is the cost
//             of disorder, not of inverted causality
//
// What is read back, per arm, from the EOT ledger eot-jsonl.mjs writes:
// arrangements (propositions), entities, voids, typed absences, refusals,
// surprises (the Itti & Baldi expectation organ — the one that should feel
// an inverted arrow), expectations, and self-referent notes. A count that
// holds across all three arms is a faculty that never depended on the
// arrow (Humean — relearnable, or never needed it). A count that falls in
// BOTH reversed and shuffled is disorder cost. A count that falls in
// reversed but NOT shuffled is the a priori arrow: the organ was built for
// one direction of time and reads the other as noise. That last column is
// the transplant's trouble, measured.
//
// Discipline: the reader is not modified; the seed is declared; the three
// ledgers and their sidecars are deleted after tallying (a measurement, not
// a reading — same as null-arm.mjs, whose windowing and shuffle this reuses).
//
// usage: node transplant-arm.mjs <bookPath> <chapter> [--seed=42] [--keep]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { detectAndMatch } from "./structure-rec.mjs";
import { arrowOf } from "../../kernel/arrow.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [bookPath, chArg] = process.argv.slice(2);
const CH = Number(chArg ?? 1);
// One shuffle is one draw. --seeds=1,2,3 draws the null several times so
// "reversed" can be RANKED inside the shuffled distribution instead of
// compared with a single draw (Diaconis: a null drawn once is drawn zero
// times). Default: the one seed null-arm.mjs declares.
const SEEDS = ((process.argv.find((a) => a.startsWith("--seeds=")) ?? process.argv.find((a) => a.startsWith("--seed=")) ?? "--seed=42").split("=")[1]).split(",").map(Number).filter(Number.isFinite);
const KEEP = process.argv.includes("--keep");
if (!bookPath) { console.error("usage: node transplant-arm.mjs <bookPath> <chapter> [--seeds=1,2,3] [--keep]"); process.exit(1); }

const raw = fs.readFileSync(bookPath, "utf8");
const detected = detectAndMatch(raw);
const h = detected.hits[CH - 1];
if (!h) { console.error(`no chapter ${CH} inferred by the shared detector`); process.exit(2); }
const afterTitle = h.titleLineEnd + (raw[h.titleLineEnd] === "\r" ? 2 : 1);
const headEnd = (Boolean(h.titleLine.trim()) && (raw[afterTitle] === "\n" || raw[afterTitle] === "\r")) ? h.titleLineEnd : h.titleLineStart;
const end = detected.hits[CH]?.start ?? raw.length;
const win = raw.slice(headEnd, end);

// Same seeded LCG null-arm.mjs declares, so the shuffled arm here is the
// same null that file would draw at the same seed.
function shuffled(arr, seed) {
  const a = [...arr];
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sentence split as null-arm.mjs does it (English prose, closing quotes
// included). Paragraph breaks are flattened to one space in every arm,
// forward included, so the three arms differ in ORDER only.
const sentences = win.split(/(?<=[.!?”])\s+/).map((s) => s.trim()).filter(Boolean);
const arms = {
  forward: sentences.join(" "),
  reversed: [...sentences].reverse().join(" "),
  // the medium's own arrow inverted — every word backwards, not just the
  // sentences: this is the arm the Eddington organ (kernel/arrow.js) should
  // read as "backward" against the forward chapter as its habit
  "reversed-words": sentences.join(" ").split(/\s+/).reverse().join(" "),
};
for (const s of SEEDS) arms[`shuffled@${s}`] = shuffled(sentences, s).join(" ");

// Eddington, over the raw word sequence of each arm, with the forward arm
// as the reference habit. Sentence reversal keeps every within-sentence
// bigram, so at the word grain it should read as forward — that is the
// measured difference between the medium's arrow and the referred one.
// Case-folded on purpose and disclosed (Dijkstra): "The" at a sentence head
// and "the" inside one are the same word for an ORDER measurement; the
// capital is the sentence boundary's mark, which is the thing being moved.
// Latin-script assumption, same scope as the sentence split above.
const words = (text) => text.toLowerCase().split(/\s+/).filter(Boolean);
const habit = words(arms.forward);
const arrowRows = {};
for (const [arm, body] of Object.entries(arms)) {
  const r = arrowOf(words(body), { k: 2, draws: 32, seed: 7, reference: arm === "forward" ? null : habit });
  arrowRows[arm] = { verdict: r.verdict, direction: r.direction, irreversibility: r.irreversibility, nullMax: r.null.max };
}

const slug = path.basename(bookPath, ".txt");
const tally = {};
for (const [arm, body] of Object.entries(arms)) {
  const book = raw.slice(0, headEnd) + "\n" + body + "\n" + raw.slice(end);
  const tmp = path.join("/tmp", `transplant-${arm}-${slug}.txt`);
  fs.writeFileSync(tmp, book);
  const ledgerName = `transplant-${arm}-${slug}`;
  const run = spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), tmp, String(CH), `--ledger-name=${ledgerName}`], { encoding: "utf8", timeout: 300000 });
  const ledgerPath = path.join(HERE, "results", `${ledgerName}.eot.jsonl`);
  if (!fs.existsSync(ledgerPath)) { console.error(`${arm}: no ledger written (${ledgerPath})\n${run.stderr}`); process.exit(3); }
  const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const n = (pred) => lines.filter(pred).length;
  tally[arm] = {
    sentences: n((l) => l.role === "sentence"),
    arrangements: n((l) => l.role === "proposition" && l.schema === "EOTObservation@1"),
    entities: n((l) => l.role === "entity"),
    voids: n((l) => l.role === "void"),
    absences: n((l) => l.schema === "EOTAbsence@1"),
    refusals: n((l) => l.schema === "EOTRefusal@1"),
    surprises: n((l) => l.schema === "EOTSurprise@1"),
    expectations: n((l) => l.role === "expectation"),
    selfReferent: n((l) => l.selfReferent),
  };
  fs.unlinkSync(tmp);
  if (!KEEP) for (const suffix of [".eot.jsonl", ".prior.json", ".projected.json"]) { try { fs.unlinkSync(ledgerPath.replace(".eot.jsonl", suffix)); } catch {} }
}

// Reading the columns. The shuffled draws are the null distribution of
// "same sentences, no arrow". reversed is placed INSIDE it as a rank: the
// share of draws at or beyond reversed on the side away from forward.
//   held      forward, reversed and every draw agree — never depended on order
//   disorder  reversed sits inside the shuffled range — the cost is disorder,
//             which the null pays too
//   ARROW     reversed sits OUTSIDE every shuffled draw — the inverted arrow
//             alone moved it; that organ was built for one direction of time
// A rank is reported, never a cut-off; with one seed a rank is one draw.
const rows = Object.keys(tally.forward);
const shuffledArms = Object.keys(tally).filter((k) => k.startsWith("shuffled@"));
console.log(`TRANSPLANT · ${slug} ch${CH} · ${sentences.length} sentences · shuffled ×${shuffledArms.length} (seeds ${SEEDS.join(",")})`);
console.log(`${"organ".padEnd(14)} ${"forward".padStart(8)} ${"reversed".padStart(9)} ${"shuffled".padStart(12)}   ${"rank".padStart(5)}   reading`);
for (const r of rows) {
  const f = tally.forward[r], rv = tally.reversed[r];
  const sh = shuffledArms.map((k) => tally[k][r]);
  const lo = Math.min(...sh), hi = Math.max(...sh);
  const beyond = rv >= f ? sh.filter((x) => x >= rv).length : sh.filter((x) => x <= rv).length;
  const rank = beyond / sh.length;
  const reading = rv === f && lo === f && hi === f ? "held" : rv > hi || rv < lo ? "ARROW — outside every shuffled draw" : "disorder";
  console.log(`${r.padEnd(14)} ${String(f).padStart(8)} ${String(rv).padStart(9)} ${(lo === hi ? String(lo) : `${lo}–${hi}`).padStart(12)}   ${rank.toFixed(2).padStart(5)}   ${reading}`);
}
console.log(`\nARROW rows are the a priori: an organ built for one direction of time. "disorder" rows are the price of losing structure, which the shuffled null also pays. "held" rows never depended on the arrow. rank = share of shuffled draws at or beyond reversed, on reversed's side of forward.`);

console.log(`\nEDDINGTON (kernel/arrow.js) over each arm's word sequence, k=2, forward arm as the habit:`);
console.log(`${"arm".padEnd(14)} ${"verdict".padStart(13)} ${"direction".padStart(10)} ${"irrev".padStart(8)} ${"null max".padStart(9)}`);
for (const [arm, r] of Object.entries(arrowRows)) {
  if (arm.startsWith("shuffled@") && arm !== `shuffled@${SEEDS[0]}`) continue; // one shuffle is enough to show the null's own arrow
  console.log(`${arm.padEnd(14)} ${r.verdict.padStart(13)} ${String(r.direction ?? "—").padStart(10)} ${r.irreversibility.toFixed(4).padStart(8)} ${r.nullMax.toFixed(4).padStart(9)}`);
}
console.log(`reversed-words should read backward; reversed (sentences) should read forward — the medium's arrow lives in the words, the referred arrow in the order of what they say.`);
