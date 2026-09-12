// null-arm.mjs — the reader's own noise floor (2026-09-12, Diaconis lens:
// "does the effect exist, or does the test only look like it does?").
//
// Every arrangement the reader emits is asserted to have been "found" in
// the material. This is the calibration question the golden never asks:
// how much does the SAME reader find in material whose clause structure has
// been destroyed? A chapter's prose, word-shuffled, has no real
// subject-verb-object relations left — anything the reader still emits there
// is a false positive against the null: it was always going to "find"
// something, so a real reading's emitted counts mean little until they are
// placed against this floor. The same "survives the null" bar the rest of
// this project already holds its finders to (II.23, signal.js), applied to
// the reading itself.
//
// The shuffle is WORD-level within the chapter window (the chapter heading
// is preserved so the reader infers a chapter — the point is to destroy
// clause structure, not to break the driver). The reader runs UNCHANGED on
// the shuffled copy; the ledger it writes is read back for how many
// arrangements, referents, and typed absences the noise produced. Those
// counts are the floor. A real chapter's counts belong ABOVE them.
//
// usage: node null-arm.mjs <bookPath> <chapter> [--shuffle-sentences]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { detectAndMatch } from "./structure-rec.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [bookPath, chArg] = process.argv.slice(2);
const CH = Number(chArg ?? 1);
const shuffleSentences = process.argv.includes("--shuffle-sentences");
if (!bookPath) { console.error("usage: node null-arm.mjs <bookPath> <chapter> [--shuffle-sentences]"); process.exit(1); }

const raw = fs.readFileSync(bookPath, "utf8");
const detected = detectAndMatch(raw);
const h = detected.hits[CH - 1];
if (!h) { console.error(`no chapter ${CH} inferred by the shared detector`); process.exit(2); }
const afterTitle = h.titleLineEnd + (raw[h.titleLineEnd] === "\r" ? 2 : 1);
const headEnd = (Boolean(h.titleLine.trim()) && (raw[afterTitle] === "\n" || raw[afterTitle] === "\r")) ? h.titleLineEnd : h.titleLineStart;
const end = detected.hits[CH]?.start ?? raw.length;
const win = raw.slice(headEnd, end);

// Seeded shuffle so a run is reproducible (Diaconis: a null drawn once is a
// null drawn zero times — the seed is declared, never hidden).
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

let shuffledWin;
if (shuffleSentences) {
  const sentences = win.split(/(?<=[.!?”])\s+/);
  shuffledWin = shuffled(sentences, 42).join(" ");
} else {
  shuffledWin = shuffled(win.split(/(\s+)/), 42).join("");
}
const shuffledBook = raw.slice(0, headEnd) + shuffledWin + raw.slice(end);

const tmp = path.join("/tmp", `null-arm-${path.basename(bookPath, ".txt")}.txt`);
fs.writeFileSync(tmp, shuffledBook);

const run = spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), tmp, String(CH)], { encoding: "utf8", timeout: 120000 });
if (run.status !== 0 && !run.stdout) { console.error(run.stderr || `reader exited ${run.status}`); process.exit(3); }
const ledgerPath = path.join(HERE, "results", `${path.basename(tmp, ".txt")}-ch${CH}.eot.jsonl`);
if (!fs.existsSync(ledgerPath)) { console.error(`no ledger written for the shuffled copy (${ledgerPath})`); process.exit(3); }
const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const count = (role, schema) => lines.filter((l) => l.role === role && (!schema || l.schema === schema)).length;
const absences = lines.filter((l) => l.schema === "EOTAbsence@1").length;
const refusals = lines.filter((l) => l.schema === "EOTRefusal@1").length;
const entities = lines.filter((l) => l.role === "entity").length;
const voids = lines.filter((l) => l.role === "void").length;
const selfRef = lines.filter((l) => l.selfReferent).length;

console.log(`NULL ARM · ${path.basename(bookPath)} ch${CH} · ${shuffleSentences ? "sentence-shuffled" : "word-shuffled"} · seed 42`);
console.log(`  the reader found in NOISE: ${count("proposition", "EOTObservation@1")} arrangements, ${entities} entities, ${voids} voids, ${absences} typed absences, ${refusals} refusals, ${selfRef} self-referent folds`);
console.log(`  → these are the FALSE-POSITIVE FLOOR. A real chapter's counts must sit above them.`);
fs.unlinkSync(tmp);
try { fs.unlinkSync(ledgerPath); } catch {}
// eot-jsonl.mjs also writes a .prior.json and a .projected.json for every
// read — the null-arm is a measurement, not a reading, so none of its three
// artifacts stay behind.
for (const suffix of [".prior.json", ".projected.json"]) {
  try { fs.unlinkSync(ledgerPath.replace(".eot.jsonl", suffix)); } catch {}
}