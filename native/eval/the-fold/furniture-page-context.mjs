// furniture-page-context.mjs — does deciding furniture with the PAGE in view
// beat deciding it inside one chunk? Both arms in ONE process, one variable.
//
// The measured defect: `blankLabelRows` calls something furniture only when it
// sees `minRun` CONSECUTIVE cells, and its one consumer applied it inside an
// already-chunked passage whose median length is 31-72 characters. A navbox
// arrives atomised into one-bullet passages, so the run never forms. The fix
// takes the decision in `chunkSource`, where the page still exists, and hands
// each chunk its own span of the result (`chunk.blanked`, readback-gated).
//
// ARMS. `shipped` chunks WITHOUT the organ (so the reader falls back to its
// per-sentence blanking, exactly as before); `page` chunks WITH it. Same
// fixtures, same reader, same process — the only difference is where the
// furniture decision was taken.
//
// CONTROLS (eo-constitution II.23 — a statistic ships with a control built to
// fail). `ddg-results.html` has no furniture and must show NO change at all.
// A real book (BOOK=/path, e.g. Gutenberg Frankenstein) must not lose real
// prose: the driver reports exactly how many characters the change newly
// blanks inside read text, and prints the largest of them so a reader can
// judge them rather than trust a total.
//
//   node furniture-page-context.mjs        env: PAGES · BOOK
import { readFileSync, existsSync } from "node:fs";

const FOLD = new URL("../../../../the-fold/", import.meta.url).pathname;
const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { makeHyperlexicon } = await import(`${NATIVE}/organs/hyperlexicon.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { splitSentences, normaliseNewlines } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { cellOf, GRAINS } = await import(`${NATIVE}/kernel/cube.js`);
const { makeGrammarLens } = await import(`${NATIVE}/organs/grammar-lens.js`);
const { classifyWord, dominantClass, POS_PRIOR_META, THRAX_META } = await import(`${NATIVE}/adapters/text/wordclass.js`);
const taskLog = await import(`${NATIVE}/kernel/task-log.js`);

const posPrior = existsSync(`${FIX}/pos-prior-eng.json`) ? JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8")) : null;

// DECLARED, and the same numbers every live caller injects (P4/P9).
const BLANK = { minRun: 4, maxCell: 60 };
const blank = (t) => blankLabelRows(t, BLANK);

// DECLARED, and the same number every live caller of this lens already
// declares (app.js, diet-boundary.mjs, admission-gate.mjs) — never a second
// threshold invented here.
const GRAMMAR_MIN_SHARE = 0.5;
const lens = posPrior ? makeGrammarLens({ classifyWord, dominantClass, posPrior, posPriorMeta: POS_PRIOR_META, thraxMeta: THRAX_META }) : null;

// A MIS-PARSE, read off the repo's own grammar lens rather than by eye: a
// note whose LABEL settles as something other than a verb is the extractor
// having taken a noun for the connector ("The —capsule→ communicator ..."),
// not a relation the material states. An unsettled reading is not counted —
// absence of a verdict is never a conviction.
const misParse = (note) => {
  if (!lens) return false;
  const c = lens({ label: note.label }, { minShare: GRAMMAR_MIN_SHARE });
  return Boolean(c?.settled && c.thraxClass && c.thraxClass !== "verb");
};

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
  discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: blank,
  // splitSentences normalises newlines (length-changing), so a sentence's
  // offset is in normalised space while the page-blanked copy is aligned to
  // the raw text. Without this the reader refuses every candidate on CRLF
  // material and falls back — safe, but the feature is simply off there.
  normaliseNewlines,
  resolvePronouns, nounPhraseSubjects: true,
});
const hl = makeHyperlexicon({ createTaskLog: taskLog.createTaskLog, append: taskLog.append, projectTasks: taskLog.projectTasks, ENTRY_KINDS: taskLog.ENTRY_KINDS, OPERATOR_BASIS: taskLog.OPERATOR_BASIS, GRAINS, cellOf });

// Probe-only closed-class tally — the SAME disclosed hand list
// hyperlexicon-door-probe.mjs uses, so the two drivers' "junk label" numbers
// mean the same thing. A measurement instrument, never reading code.
const closed = new Set([
  ...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS, ...P.NEGATION_WORDS,
  "and", "or", "of", "to", "in", "on", "at", "with", "for", "by", "from", "as", "i", "himself",
]);

// Verdict transitions: WHERE does a lost binding go? A claim that stops
// being `bound` has not necessarily stopped being extracted — it may have
// become `beyond-reach`, which this tier states outright is "a limit of this
// check, not a mark against the answer". Losing a binding that rested on
// furniture-supplied recurrence is a CORRECTION; losing extraction entirely
// would be a cost. The two must not be summed.
function verdicts(passages) {
  const rel = reader(passages, { pool: passages });
  const out = new Map();
  for (const p of passages) {
    for (const c of rel.read(String(p.text ?? ""))?.claims ?? []) {
      out.set(`${c.end1}|${c.label}|${c.end2}`, c.verdict);
    }
  }
  return out;
}

function readLedger(passages) {
  let log = hl.createHyperlexicon({ frame: { reader: "makeRelationReader", posPrior: posPrior ? "POSPrior@1" : null } });
  const rel = reader(passages, { pool: passages });
  let bound = 0;
  for (const p of passages) {
    const claims = rel.read(String(p.text ?? ""))?.claims ?? [];
    const edges = claims.filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, spans: c.spans ?? [] }));
    bound += edges.length;
    if (edges.length) log = hl.admit(log, edges, { witness: `${p.source}#${p.start}-${p.end}~arm` }).log;
  }
  const notes = hl.foldWithStanding(log);
  const junk = notes.filter((n) => closed.has(String(n.label ?? "").toLowerCase().trim()));
  return { bound, notes: notes.length, junk: junk.length, junkLabels: junk.map((n) => n.label), corroborated: notes.filter((n) => n.sources >= 2).length, list: notes };
}

const blankedChars = (passages) => passages.reduce((s, p) => {
  const t = String(p.text ?? ""), b = typeof p.blanked === "string" ? p.blanked : blank(t);
  let n = 0; for (let i = 0; i < b.length; i++) if (b[i] === " " && t[i] !== " ") n++;
  return s + n;
}, 0);

// IS THIS NOTE DRAWN FROM FURNITURE? Exactly, via its own addresses — no
// hand list, no string search, no length floor.
//
// A claim's span carries the chunk's ref plus start/end RELATIVE to that
// chunk's text, which is precisely what `chunk.blanked` is aligned to. So the
// blanked reading of a span is `chunk.blanked.slice(span.start, span.end)`,
// and a span the page-wide blanker erased is one whose characters are now
// spaces where the material had content. That is the blanker's own verdict,
// read at the note's own address — never a second opinion about what
// furniture is.
//
// The floor is declared: a span counts as furniture-derived when MOST of it
// was erased, so a note that merely brushes a blanked edge is not convicted.
const FURNITURE_SPAN_SHARE = 0.5;

const furnitureDerived = (note, refToChunk) => {
  for (const sp of note.spans ?? []) {
    const chunk = refToChunk.get(sp?.ref);
    const blanked = chunk && typeof chunk.blanked === "string" ? chunk.blanked : null;
    if (!blanked) continue;
    const own = String(chunk.text ?? "").slice(sp.start, sp.end);
    const cut = blanked.slice(sp.start, sp.end);
    if (!own.length || cut.length !== own.length) continue;
    let erased = 0, content = 0;
    for (let i = 0; i < own.length; i++) {
      if (own[i] === " ") continue;
      content++;
      if (cut[i] === " ") erased++;
    }
    if (content && erased / content >= FURNITURE_SPAN_SHARE) return true;
  }
  return false;
};

function measure(name, text) {
  const shippedChunks = chunkSource(name, text);                       // no organ -> old path
  const pageChunks = chunkSource(name, text, { blankFurniture: blank }); // page context
  const gated = pageChunks.filter((c) => typeof c.blanked === "string").length;
  const a = readLedger(shippedChunks);
  const b = readLedger(pageChunks);
  const vA = verdicts(shippedChunks), vB = verdicts(pageChunks);
  const moved = new Map();
  for (const [k, va] of vA) {
    if (va !== "bound") continue;
    const vb = vB.has(k) ? vB.get(k) : "NOT EXTRACTED";
    if (vb !== "bound") moved.set(k, vb);
  }
  const refToChunk = new Map(pageChunks.map((c) => [c.ref, c]));
  a.furniture = a.list.filter((n) => furnitureDerived(n, refToChunk)).length;
  b.furniture = b.list.filter((n) => furnitureDerived(n, refToChunk)).length;
  a.mis = a.list.filter(misParse).length;
  b.mis = b.list.filter(misParse).length;
  return { name, chars: text.length, chunks: pageChunks.length, gated, a, b, refToChunk, moved,
           blankedA: blankedChars(shippedChunks), blankedB: blankedChars(pageChunks) };
}

const PAGES = (process.env.PAGES ?? "wikipedia-battle-of-borodino,wikipedia-war-and-peace,wikipedia-apollo-11,wikipedia-battle-of-austerlitz,wikipedia-war-of-the-third-coalition,wikipedia-borodino-ru").split(",");

console.log(`furniture decided with the page in view vs inside one chunk — blankLabelRows(${JSON.stringify(BLANK)}), declared\n`);
const rows = [];
for (const page of PAGES) {
  const file = `${FIX}/${page}.html`;
  if (!existsSync(file)) { console.log(`  (missing ${page})`); continue; }
  rows.push(measure(page, extractReadable(readFileSync(file, "utf8")).text));
}

const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);
console.log(pad("page", 38), num("blanked", 16), num("bound", 13), num("notes", 12), num("FURNITURE", 12), num("MIS-PARSED", 13), num("corrob", 9));
console.log(pad("", 38), num("shipped→page", 16), num("shipped→page", 13), num("shipped→page", 12), num("shipped→page", 12), num("shipped→page", 13), num("s→p", 9));
for (const r of rows) {
  console.log(pad(r.name, 38), num(`${r.blankedA}→${r.blankedB}`, 16), num(`${r.a.bound}→${r.b.bound}`, 13),
              num(`${r.a.notes}→${r.b.notes}`, 12), num(`${r.a.furniture}→${r.b.furniture}`, 12), num(`${r.a.mis}→${r.b.mis}`, 13), num(`${r.a.corroborated}→${r.b.corroborated}`, 9));
}
const sum = (f) => rows.reduce((s, r) => s + f(r), 0);
console.log("\nTOTALS  blanked %d→%d · bound %d→%d · notes %d→%d · FURNITURE %d→%d · MIS-PARSED %d→%d · junk labels %d→%d · corroborated %d→%d",
  sum((r) => r.blankedA), sum((r) => r.blankedB), sum((r) => r.a.bound), sum((r) => r.b.bound),
  sum((r) => r.a.notes), sum((r) => r.b.notes), sum((r) => r.a.furniture), sum((r) => r.b.furniture),
  sum((r) => r.a.mis), sum((r) => r.b.mis),
  sum((r) => r.a.junk), sum((r) => r.b.junk), sum((r) => r.a.corroborated), sum((r) => r.b.corroborated));
const rate = (n, d) => d ? `${(100 * n / d).toFixed(2)}%` : "n/a";
console.log("        furniture rate %s→%s · mis-parse rate %s→%s  (per note — the quality axis a count cannot show)",
  rate(sum((r) => r.a.furniture), sum((r) => r.a.notes)), rate(sum((r) => r.b.furniture), sum((r) => r.b.notes)),
  rate(sum((r) => r.a.mis), sum((r) => r.a.notes)), rate(sum((r) => r.b.mis), sum((r) => r.b.notes)));
console.log(`readback gate: ${sum((r) => r.gated)} of ${sum((r) => r.chunks)} chunks received a page-aligned copy`);

// What the change COSTS: notes the shipped arm had and the page arm lost.
console.log("\n── where did the lost BINDINGS go? (a bound claim that stopped being bound) ──");
const dest = new Map();
for (const r of rows) for (const v of r.moved.values()) dest.set(v, (dest.get(v) ?? 0) + 1);
for (const [v, n] of [...dest].sort((x, y) => y[1] - x[1])) {
  const gloss = v === "beyond-reach" ? "  <- withheld: the subject no longer resolves. If its recurrence was furniture, this is a CORRECTION."
    : v === "NOT EXTRACTED" ? "  <- the claim is gone entirely — the real cost"
    : v === "unbound" ? "  <- extracted, no matching edge" : "";
  console.log(`  ${String(n).padStart(4)}  ->  ${v}${gloss}`);
}

console.log("\n── notes LOST, classified: was the note drawn from furniture, or from prose? ──");
let lostF = 0, lostP = 0;
const proseLosses = [];
for (const r of rows) {
  const after = new Set(r.b.list.map((n) => `${n.end1}|${n.label}|${n.end2}`));
  for (const n of r.a.list) {
    if (after.has(`${n.end1}|${n.label}|${n.end2}`)) continue;
    if (furnitureDerived(n, r.refToChunk) || misParse(n)) lostF++;
    else { lostP++; if (proseLosses.length < 20) proseLosses.push(`  [${r.name}] "${n.end1}" —${n.label}→ "${n.end2}"`); }
  }
}
console.log(`  ${lostF} lost that were FURNITURE-derived or MIS-PARSED (the point of the change)`);
console.log(`  ${lostP} lost that were neither — real relations in real prose (the cost; judge these)`);
for (const l of proseLosses) console.log(l);

console.log("\n── notes GAINED (absent as shipped, present with page context) ──");
let gained = 0;
for (const r of rows) {
  const before = new Set(r.a.list.map((n) => `${n.end1}|${n.label}|${n.end2}`));
  for (const n of r.b.list) {
    const k = `${n.end1}|${n.label}|${n.end2}`;
    if (before.has(k)) continue;
    gained++;
    if (gained <= 15) console.log(`  [${r.name}] "${n.end1}" —${n.label}→ "${n.end2}"`);
  }
}
console.log(`  ${gained} gained in total${gained > 15 ? " (first 15 shown)" : ""}`);

// ── CONTROL 1: a page with no furniture must not move at all ──
console.log("\n── CONTROL (built to fail): a page with no furniture ──");
if (existsSync(`${FIX}/ddg-results.html`)) {
  const c = measure("ddg-results", extractReadable(readFileSync(`${FIX}/ddg-results.html`, "utf8")).text);
  const same = c.blankedA === c.blankedB && c.a.bound === c.b.bound && c.a.notes === c.b.notes;
  console.log(`  ddg-results.html: blanked ${c.blankedA}→${c.blankedB} · bound ${c.a.bound}→${c.b.bound} · notes ${c.a.notes}→${c.b.notes}  ${same ? "UNCHANGED (as it must be)" : "*** MOVED — the change is not inert on furniture-free material ***"}`);
}

// ── CONTROL 2: a real book must not lose real prose ──
const BOOK = process.env.BOOK;
if (BOOK && existsSync(BOOK)) {
  console.log("\n── CONTROL (built to fail): a real book — what does the change newly blank? ──");
  // DELIBERATELY NOT newline-normalised. An earlier version of this control
  // stripped CRLF before testing, which normalised away the exact coordinate-
  // space bug the reader's guard exists for. A real book is read as it sits
  // on disk.
  const raw = readFileSync(BOOK, "utf8");
  const crlf = (raw.match(/\r\n/g) ?? []).length;
  const cs = chunkSource("book", raw, { blankFurniture: blank });
  let covered = 0, newly = 0;
  const regions = [];
  for (const p of cs) {
    const own = String(p.text ?? ""), b = typeof p.blanked === "string" ? p.blanked : own;
    const per = blank(own);
    covered += own.length;
    let run = null;
    for (let i = 0; i < own.length; i++) {
      const isNew = b[i] === " " && own[i] !== " " && per[i] === own[i];
      if (isNew) { newly++; if (run === null) run = i; }
      else if (run !== null) { regions.push(own.slice(run, i)); run = null; }
    }
    if (run !== null) regions.push(own.slice(run));
  }
  regions.sort((x, y) => y.length - x.length);
  console.log(`  ${BOOK}: ${crlf} CRLF pairs, read as it sits on disk`);
  console.log(`  ${newly} chars newly blanked of ${covered} read (${(100 * newly / covered).toFixed(4)}%)`);
  console.log(`  largest newly-blanked fragments — judge these, do not trust the total:`);
  for (const r of regions.slice(0, 12)) console.log(`    ${JSON.stringify(r)}`);
}
