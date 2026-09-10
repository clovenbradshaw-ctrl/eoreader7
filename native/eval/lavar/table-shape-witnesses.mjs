// table-shape-witnesses.mjs — is a detected table ROW-shaped (each row one
// coherent record; columns are its named fields) or COLUMN-shaped (each
// column its own independent list; a row is a print-layout accident, not
// a relation between its cells)? Named directly by S108's own disclosed
// gap: a naive per-row tuple would fabricate a relation between cells
// that share nothing but position, for a real table already sitting in
// the specimen that found the gap.
//
// User direction, verbatim: "using the problem you found with the
// spreadsheet, help it not make a mistake like that again, and we need to
// try different competing programs on things to find the one that
// provides the most meaningful signal, global workspace theory type
// stuff." Global Workspace Theory (Baars): many specialized processes run
// in parallel, each blind to the others, each proposing its own read of
// the same evidence; they COMPETE for a shared, limited broadcast, and
// only the strongest coalition's content goes out to the rest of the
// system. Built here literally, not just as a metaphor, and with the part
// GWT itself insists on and this file's first draft skipped: a process
// only belongs in the coalition once it has EARNED a seat.
//
// EPISTEMIC CORRECTION, direct user framing, and load-bearing for how
// every claim below is worded: "we don't know the ground truth, we are
// always ever asymptotically approaching the referent... the noumena
// rather." Nothing in this file has access to what a table's author
// actually intended (the noumenon) — only to readings of it (phenomena):
// this file's own hand-parse of the surrounding prose, the same kind of
// interpretive act every specialist below performs mechanically or by
// asking a model. "Measured right" below means "agreed with this
// project's own best-available reading of two specimens," never "matched
// verified fact" — a converging approximation, not a final oracle. That
// does not make the comparison worthless: one specialist agreeing with
// the best-available reading on both specimens tried, while another
// contradicted it on one, is real, useful, disclosed evidence of relative
// reliability. It is evidence, not proof, and is written up as such.
//
// Three specialists were tried under that standard; only one made it into
// `judgeShape`'s own vote:
//   - `cellLengthSpecialist`: a plausible mechanical hypothesis, which
//     disagreed with the best-available reading on the first real
//     counterexample (below) — kept, computed, disclosed, never decisive.
//   - `blankClusteringSpecialist`: agreed with the best-available reading
//     on both specimens tried (a real vote or an honest abstention, never
//     a disagreeing vote) — this is the one that decides, alone, whenever
//     it has evidence.
//   - `visionWitnessSpecialist`: a local vision model shown an actual
//     rendered screenshot of the real table, per the user's own direct
//     framing ("let's not underestimate CV and OCR systems"). Tried,
//     measured, and NOT wired into the vote: it produced a fluent,
//     confident description that does not match the actual columns in
//     the image at all — a different, more detailed reading than this
//     file's own, but not evidently a closer approximation to the
//     referent — and gave the IDENTICAL description twice in a row. The
//     specific, disclosed lesson: asking-twice-and-checking-agreement
//     (this project's own standing discipline) only catches a witness
//     whose answer moves under a content-free reorder; it does nothing at
//     all against one that is simply consistent and, by this file's own
//     best-available reading, wrong. That failure mode needs an
//     independent check — corroboration from a different sense, never
//     more self-agreement from the same one.
// A permutation-null z-score decides each mechanical specialist's own
// strength (this project's own standing "no hand-set thresholds, prefer a
// measured null" rule, CLAUDE.md) — never an eyeballed cutoff, and a
// specialist whose own null is degenerate (nothing to measure) ABSTAINS
// rather than casting a vote it has no evidence for.
//
// Two real, contrasting specimens this was built and tested against, both
// from `05-academic-papers/open-access-books/paip/chapter-03.txt`, and
// both read the way the surrounding prose itself frames them (a
// best-available reading, not a verified fact):
//   ROW-shaped:    "| Type | Example | Explanation |" — a Lisp data-type
//                  reference, one real type per row.
//   COLUMN-shaped: "| definitions | conditional | variables | iteration
//                  | other |" — five independent, unequal-length lists of
//                  special-form names, aligned side by side for print.
//
// usage: node table-shape-witnesses.mjs <path-to-document.txt>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectTables } from "./table-rec.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OLLAMA = "http://localhost:11434";
const MODEL = "gemma2:2b"; // kept small on purpose — [[feedback_local_model_small]]
const PERMUTATIONS = 200;

// ── parse a detected table's own bytes into a real grid ──────────────────
// The tuple-level parsing S108 named as unbuilt: header + data rows into
// actual (row, col, header, value) cells, each independently addressable.
export function parseGrid(raw, table) {
  const text = raw.slice(table.start, table.end);
  const lines = text.split(/\r?\n/).filter(Boolean);
  const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const header = splitRow(lines[0]);
  const dataLines = lines.slice(2); // skip header + separator
  const rows = dataLines.map((l) => splitRow(l));
  return { header, rows };
}

// ── each cell, independently addressed ────────────────────────────────────
// The tuple-level parsing S108 named and left unbuilt: not just "here is
// the text of this cell" but "here is the exact byte range this cell's
// text occupies in the origin document" — this project's own P5.2
// discipline (an address that does not slice back byte-identical is
// refused outright, never recorded), applied to a table cell the same way
// `eot-jsonl.mjs`'s own `addressOf` applies it to a clause's own ends.
export function addressedGrid(raw, table) {
  const text = raw.slice(table.start, table.end);
  const lines = text.split(/\r?\n/);
  const lineStarts = []; { let off = table.start; for (const l of lines) { lineStarts.push(off); off += l.length + 1; } }
  const nonEmptyIdx = lines.map((l, i) => (l.trim() ? i : -1)).filter((i) => i >= 0);
  const splitWithOffsets = (lineIdx) => {
    const line = lines[lineIdx], lineStart = lineStarts[lineIdx];
    const cells = [];
    let searchFrom = 0;
    for (const raw_cell of line.split("|")) {
      const trimmed = raw_cell.trim();
      if (trimmed) {
        const localIdx = line.indexOf(trimmed, searchFrom);
        const start = lineStart + localIdx, end = start + trimmed.length;
        // P5.2: refuse an address that does not slice back identical.
        cells.push(raw.slice(start, end) === trimmed ? { text: trimmed, at: [start, end] } : { text: trimmed, at: null });
        searchFrom = localIdx + trimmed.length;
      } else {
        cells.push({ text: "", at: null });
      }
    }
    // Drop the leading/trailing empty cell a "| a | b |"-style split produces.
    if (cells.length && cells[0].text === "" && line.trim().startsWith("|")) cells.shift();
    if (cells.length && cells[cells.length - 1].text === "" && line.trim().endsWith("|")) cells.pop();
    return cells;
  };
  const header = splitWithOffsets(nonEmptyIdx[0]);
  const rows = nonEmptyIdx.slice(2).map((i) => splitWithOffsets(i));
  return { header, rows };
}

// ── emit tuples, informed by the shape verdict but never asserting past
// it. Row-shaped: one tuple per row, fields keyed by the header this
// project's own best-available reading calls "field names." Column-
// shaped: one tuple per (column, item) — explicitly NOT a per-row record,
// so a print-layout accident never becomes a fabricated relation between
// cells that merely share a line. "undetermined" emits nothing rather
// than guessing either shape. ─────────────────────────────────────────────
export function emitTuples(addressedGridResult, shape) {
  const { header, rows } = addressedGridResult;
  if (shape === "row") {
    return rows.map((row, r) => ({
      kind: "record", row: r,
      fields: header.map((h, c) => ({ header: h.text, value: row[c]?.text ?? "", at: row[c]?.at ?? null })),
    }));
  }
  if (shape === "column") {
    return header.map((h, c) => ({
      kind: "list", column: h.text, columnAt: h.at,
      items: rows.map((row, r) => ({ row: r, value: row[c]?.text ?? "", at: row[c]?.at ?? null })).filter((it) => it.value),
    }));
  }
  return []; // undetermined — disclosed as no tuples emitted, not a guess
}

// ── shuffle helper, seeded per-call so a specialist's own null is
// reproducible within one run without needing Math.random banned anywhere
// upstream (this script is a standalone CLI, not a Workflow script, so
// Math.random is fine here) ───────────────────────────────────────────────
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function variance(nums) {
  const mean = nums.reduce((s, x) => s + x, 0) / nums.length;
  return nums.reduce((s, x) => s + (x - mean) ** 2, 0) / nums.length;
}
function zScore(observed, nullSamples) {
  const mean = nullSamples.reduce((s, x) => s + x, 0) / nullSamples.length;
  const sd = Math.sqrt(variance(nullSamples));
  if (sd === 0) return null; // degenerate null — nothing to compare against
  return (observed - mean) / sd;
}

// ── SPECIALIST 1: cell length by column — TRIED, FOUND CONFOUNDED, KEPT
// FOR DISCLOSURE ONLY, NEVER A DECIDING VOTE ───────────────────────────────
// The hypothesis: a row-shaped table's columns are different KINDS of
// field (a short "Type", a long "Explanation") — real by-column
// structure; a column-shaped table's columns are parallel lists of the
// SAME kind of item — no real by-column length effect beyond chance.
// MEASURED WRONG on the very first real column-shaped specimen: the
// "definitions | conditional | variables | iteration | other" table
// scored z=5.11 for ROW — confidently, strongly, wrong — because
// "definitions" (defparameter, defconstant) are just lexically LONGER
// Lisp names than "conditional"/"variables" terms, entirely independent
// of whether the table is row- or column-shaped. The statistic is real;
// the causal story behind it is confounded (name length can come from
// EITHER genuine field-kind heterogeneity OR from which lexical category
// a parallel list happens to hold), so it cannot be trusted to discriminate
// this question on its own. Computed and reported for transparency;
// excluded from the coalition below.
function cellLengthSpecialist(grid) {
  const { header, rows } = grid;
  const cols = header.length;
  const byCol = (data) => Array.from({ length: cols }, (_, c) => data.map((r) => r[c] ?? "").filter(Boolean));
  const colMeans = (colsData) => colsData.map((cells) => cells.length ? cells.reduce((s, c) => s + c.length, 0) / cells.length : 0);
  const observedVar = variance(colMeans(byCol(rows)));

  const flat = rows.flat();
  const nullVars = [];
  for (let p = 0; p < PERMUTATIONS; p += 1) {
    const shuf = shuffled(flat);
    const reshaped = [];
    for (let r = 0; r < rows.length; r += 1) reshaped.push(shuf.slice(r * cols, r * cols + cols));
    nullVars.push(variance(colMeans(byCol(reshaped))));
  }
  const z = zScore(observedVar, nullVars);
  if (z === null) return { name: "cellLength", verdict: "abstain", strength: 0, note: "degenerate null (no length variance under shuffling at all)" };
  return { name: "cellLength", verdict: z > 0 ? "row" : "column", strength: Math.abs(z), z };
}

// ── SPECIALIST 2: blank-cell clustering by column ─────────────────────────
// A column-shaped table with unequal list lengths pads short lists with
// blank cells CONCENTRATED in specific columns. A row-shaped table's
// blanks (rare) should be scattered no more by column than chance
// placement would produce. Null: reshuffle which POSITIONS are blank
// across the whole grid (same total blank count), recompute variance of
// blank-fraction across columns. High z — blanks cluster by column more
// than chance — evidence for COLUMN-shaped.
function blankClusteringSpecialist(grid) {
  const { header, rows } = grid;
  const cols = header.length;
  const isBlank = (cell) => !cell || !cell.trim();
  const totalBlanks = rows.flat().filter(isBlank).length;
  if (totalBlanks === 0 || totalBlanks === rows.length * cols) {
    return { name: "blankClustering", verdict: "abstain", strength: 0, note: "no blanks (or nothing but blanks) — nothing to cluster" };
  }
  const blankFractionByCol = (positions) => {
    const counts = new Array(cols).fill(0);
    for (const [r, c] of positions) counts[c] += 1;
    return counts.map((n) => n / rows.length);
  };
  const observedPositions = [];
  rows.forEach((row, r) => row.forEach((cell, c) => { if (isBlank(cell)) observedPositions.push([r, c]); }));
  const observedVar = variance(blankFractionByCol(observedPositions));

  const allPositions = [];
  rows.forEach((row, r) => row.forEach((_, c) => allPositions.push([r, c])));
  const nullVars = [];
  for (let p = 0; p < PERMUTATIONS; p += 1) {
    const shuffledPositions = shuffled(allPositions).slice(0, totalBlanks);
    nullVars.push(variance(blankFractionByCol(shuffledPositions)));
  }
  const z = zScore(observedVar, nullVars);
  if (z === null) return { name: "blankClustering", verdict: "abstain", strength: 0, note: "degenerate null" };
  return { name: "blankClustering", verdict: z > 0 ? "column" : "row", strength: Math.abs(z), z };
}

// ── SPECIALIST 3 (model witness): only consulted when the mechanical
// coalition is weak. Same discipline as witness-referent.mjs /
// structure-rec.mjs's own tier 3: closed forced choice, asked twice with
// the sample reversed, trusted only on agreement. ────────────────────────
async function ask(messages) {
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL, messages, stream: false,
      format: { type: "object", properties: { pick: { type: "integer" } }, required: ["pick"] },
      options: { num_predict: 20 },
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  try { const p = JSON.parse(data.message.content); return Number.isInteger(p.pick) ? p.pick : null; } catch { return null; }
}
function buildTableMessages(header, sampleRows, options) {
  const rowsText = sampleRows.map((r) => header.map((h, i) => `${h}=${r[i] ?? ""}`).join(", ")).join("\n");
  const list = options.map((o, i) => `${i + 1}. ${o}`).join("\n");
  return [
    { role: "system", content: `You are given a table's column headers and a few sample rows. Decide which description fits. Answer with the NUMBER only.` },
    { role: "user", content: `Headers: ${header.join(", ")}\n\nSample rows:\n${rowsText}\n\nDescriptions:\n${list}` },
  ];
}
async function modelWitnessSpecialist(grid) {
  const options = [
    "A: each ROW is one coherent thing, and the columns are its named fields (a record)",
    "B: each COLUMN is its own independent list of items, and a row is just print-layout — the cells in one row are not really related to each other",
  ];
  const sample = grid.rows.slice(0, 4);
  const forward = options, reversed = [...options].reverse();
  const [p1, p2] = await Promise.all([
    ask(buildTableMessages(grid.header, sample, forward)),
    ask(buildTableMessages(grid.header, [...sample].reverse(), reversed)),
  ]);
  const a1 = p1 === 1 ? forward[0] : p1 === 2 ? forward[1] : null;
  const a2 = p2 === 1 ? reversed[0] : p2 === 2 ? reversed[1] : null;
  if (!a1 || !a2 || a1 !== a2) return { name: "modelWitness", verdict: "abstain", strength: 0, note: !a1 || !a2 ? "unreadable" : "order-sensitive — refused" };
  return { name: "modelWitness", verdict: a1.startsWith("A") ? "row" : "column", strength: 1 };
}

// ── A VISION WITNESS, TRIED AND MEASURED — NOT WIRED IN ──────────────────
// User direction: "let's not underestimate CV and OCR systems" / "how to
// look at things with multiple 'eyes'... reconcile from our multiple
// senses a single world experience." A real screenshot of this exact
// table, rendered as it actually looks in a document (headers, borders,
// the blank cells visibly blank), was shown to a local vision model
// (`moondream:latest`, via Ollama's image API) with three different
// framings. Two ("What am I looking at?" / "Tell me what you see")
// produced nothing usable — an empty reply, or a degenerating repetition
// loop ("dopr", "doprq", "doprqr", ... spiraling into nonsense) on this
// OCR-dense content. The third ("What is in this image?") produced a
// fluent, confident, and WRONG description — a hallucinated 3-column
// "concept / description / language" structure that matches nothing in
// the real 5-column table. Asked twice, it gave the IDENTICAL wrong
// answer both times.
//
// That repeat is the important, disclosed lesson, not a footnote: this
// project's own "ask twice, trust only on agreement" discipline
// (witness-referent.mjs, structure-rec.mjs's tier 3) catches a witness
// that flips under a content-free reorder — but it does nothing against a
// witness that is simply, confidently, DETERMINISTICALLY wrong every
// time. Self-consistency is necessary evidence of stability; it is not
// evidence of correctness — and neither this file's own best-available
// reading nor the vision witness's own description is the noumenon; only
// an independent check (a different sense corroborating, not the same
// sense repeating itself) can move a disagreement toward the referent at
// all.
//
// The general design rule this earns, and the one actually implemented
// below: a sense only gets a seat in the coalition once its OWN verdicts
// have been checked against this project's own best-available reading of
// real specimens — the exact discipline `blankClustering` already passed
// and `cellLength` already failed, applied uniformly rather than assuming
// a new modality deserves a vote just for being a different sense.
// `moondream:latest`,
// on this specific structural-perception task, has not earned one: it is
// implemented and callable (`visionWitnessSpecialist`, disabled by
// default) so a future pass can re-measure it — against a better prompt,
// a larger vision model, or a differently-rendered image — but it is not
// part of `judgeShape`'s own arbitration until it does.
export async function visionWitnessSpecialist(imageBase64) {
  const prompt = "What is in this image?";
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "moondream:latest", messages: [{ role: "user", content: prompt, images: [imageBase64] }], stream: false }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}`);
  const data = await res.json();
  return { name: "visionWitness", verdict: "abstain", strength: 0, note: `not yet earning a coalition seat — raw description logged, not parsed to a verdict: ${(data.message?.content ?? "").slice(0, 200)}` };
}

// ── GWT-style arbitration ─────────────────────────────────────────────────
// Global Workspace Theory, applied rather than just named: independent
// specialists propose in parallel; only a coalition that has actually
// EARNED trust (measured against this project's own best-available
// reading, not just "another sense") gets to decide. `blankClustering` is
// the one mechanical specialist that survived measurement — it decides
// alone whenever it has evidence (no hand-picked weight to balance it
// against `cellLength`, which is excluded, disclosed above, rather than
// diluted in). When `blankClustering` abstains (no blanks — most
// row-shaped tables, and any column-shaped table whose lists happen to be
// equal length), the mechanical tier has nothing to say at all, and the
// question escalates to the text model witness — the one other
// specialist that has passed the same "ask twice, trust on agreement"
// bar. The vision witness is computed nowhere in this path until it
// clears the same bar the other two already had to.
//
// A PRIOR, added after direct user correction — verbatim: the merging
// this file first reached for conflated two different things, and named
// only one. Crossmodal binding (independent channels weighted by their
// own reliability) is what the specialist-vs-specialist arbitration above
// already does. MISSING until now: memory as an ACTIVE prior shaping the
// current read in real time, not a fact reported after the fact — a
// document that has already shown 15 row-shaped tables makes the 16th
// more likely row-shaped too, before a single one of its own cells is
// examined, the same way a recognized scene sharpens the very next
// percept rather than commenting on it afterward.
//
// Built as a real statistic, not a hand-picked weight: `documentPriorZ`
// treats the running history of this SAME document's own prior verdicts
// as a one-sample proportion test against a neutral 50/50 null (Laplace
// add-one smoothed, so an empty or unanimous history never produces an
// infinite or undefined z) — a real, standard z-score, on the identical
// scale as `cellLength`/`blankClustering`'s own permutation z-scores, so
// it can be combined with them by simple addition. This IS Stouffer's
// method (the standard meta-analytic combination of independent z-scores
// from separate tests) — the combination in this file was never
// mathematically wrong; what was missing was a term for memory to
// contribute to the sum at all.
const MECHANICAL_SIGNIFICANCE = 2; // z >= 2, the standard normal-distribution convention

export function documentPriorZ(history) {
  if (!history.length) return { z: 0, n: 0 };
  const rowCount = history.filter((h) => h === "row").length;
  const n = history.length;
  const phat = (rowCount + 1) / (n + 2); // Laplace add-one smoothing
  const se = Math.sqrt(0.25 / (n + 2));
  return { z: (phat - 0.5) / se, n };
}

// FOUND WRONG TWICE, RUNNING IT ON A REAL 19-TABLE DOCUMENT, BEFORE THIS
// SETTLED. First cut: the prior could decide alone, without consulting the
// model, once its own magnitude cleared the significance bar — a run of
// column-shaped code-example tables built a prior strong enough (z<-3) to
// mis-classify the LATER "Type | Example | Explanation" reference tables
// as column-shaped, tables the model witness correctly calls row-shaped
// every time it is actually asked. Second cut: consulting the model
// unconditionally and then ADDING its vote to the prior on one combined
// z-like scale — but the model witness's own "strength" (a flat 1, from a
// binary agree/disagree signal with no natural continuous magnitude the
// way a permutation z-score has) is not on the same scale as a
// document-prior z that can exceed 3 after enough tables accumulate. That
// let the same failure back in through a units mismatch: an uncalibrated
// "1" silently outvoted by an accumulated prior, the identical CLASS of
// error as `cellLength`'s z=5 outvoting `blankClustering`'s z=2 earlier in
// this same file — never combine two numbers on the same scale unless
// they have actually been calibrated onto it.
//
// The fix is structural, not numeric, and is the more faithful reading of
// what a prior is for besides: memory sharpens or fills in an AMBIGUOUS
// percept; it does not get to overrule a clear one. Direct evidence, when
// a specialist that has earned its seat actually casts a real vote, wins
// outright — no numeric combination with the prior at all. The prior only
// decides when every earned, directly-consulted specialist abstains, and
// says so plainly when it does.
export async function judgeShape(grid, history = []) {
  const prior = documentPriorZ(history);
  const priorWitness = { name: "documentPrior", verdict: prior.z > 0 ? "row" : prior.z < 0 ? "column" : "abstain", strength: Math.abs(prior.z), z: prior.z, note: `from ${prior.n} prior table(s) in this document` };
  const disclosedOnly = cellLengthSpecialist(grid);
  const blanks = blankClusteringSpecialist(grid);
  const witnesses = [disclosedOnly, blanks, priorWitness];
  if (blanks.verdict !== "abstain") {
    return { shape: blanks.verdict, coalition: blanks.verdict === "row" ? blanks.strength : -blanks.strength, witnesses };
  }
  const mw = await modelWitnessSpecialist(grid);
  witnesses.push(mw);
  if (mw.verdict !== "abstain") {
    return { shape: mw.verdict, coalition: mw.verdict === "row" ? mw.strength : -mw.strength, witnesses };
  }
  // Every directly-consulted, earned specialist abstained — the prior
  // decides, honestly, as the fallback it is, never as an override.
  return { shape: priorWitness.verdict === "abstain" ? "undetermined" : priorWitness.verdict, coalition: prior.z, witnesses };
}

// ── standalone report ─────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const bookPath = process.argv[2];
  if (!bookPath) { console.error("usage: node table-shape-witnesses.mjs <path-to-document.txt>"); process.exit(1); }
  const raw = fs.readFileSync(bookPath, "utf8");
  const tables = detectTables(raw);
  if (!tables.length) { console.log("No tables found."); process.exit(0); }
  const documentHistory = []; // this document's own prior verdicts, in reading order
  for (const t of tables) {
    const grid = parseGrid(raw, t);
    const result = await judgeShape(grid, documentHistory);
    if (result.shape === "row" || result.shape === "column") documentHistory.push(result.shape);
    console.log(`\n[${t.start},${t.end}] header: ${grid.header.join(" | ")}`);
    for (const w of result.witnesses) console.log(`  ${w.name}: ${w.verdict}${w.z !== undefined ? ` (z=${w.z.toFixed(2)})` : ""}${w.note ? ` — ${w.note}` : ""}`);
    console.log(`  -> coalition score ${result.coalition.toFixed(2)}, verdict: ${result.shape.toUpperCase()}-shaped`);
    if (result.shape === "row" || result.shape === "column") {
      const addressed = addressedGrid(raw, t);
      const tuples = emitTuples(addressed, result.shape);
      const sample = tuples[0];
      const addrOk = result.shape === "row" ? sample?.fields.every((f) => f.at) : sample?.items.every((it) => it.at);
      console.log(`  tuples emitted: ${tuples.length} (${result.shape === "row" ? "one per row" : "one per column"}) — sample: ${JSON.stringify(sample)}`);
      console.log(`  addresses verified (P5.2 slice-back): ${addrOk ? "yes" : "NO — see gap"}`);
    }
  }
}
