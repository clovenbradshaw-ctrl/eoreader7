// notes-segments.mjs — ground / figure / pattern over what was HEARD.
//
// surprise-segments-RESULTS.md (2026-09-02) measured that music finds its
// bar by surprise and English does not find its sentence at the word, move
// or class grain, and named the next stream to cut: "the statement's own
// units are the ARRANGEMENTS (floor 2) and the NOTES of the ledger (floor
// 5), streams where recurrence is dense and the ground can be right." This
// driver is that measurement. Same kernel segmenter, same declared numbers,
// same null inside the cut; the stream is now `kernel/notes.js`'s own —
// the ledger a real reading of three real pages accumulates, in the order
// the reading heard it.
//
// THE ORACLE, held aside: where the SOURCE itself turns — its own section
// headings (h2/h3 in the fetched HTML), located in the readable face by
// byte offset. A hearing's position is its first span's absolute offset.
// A boundary placed before hearing i "finds a turn" when hearing i is the
// first hearing at or after some section start (±1 hearing, the music
// driver's own tolerance). Count-matched random placement, 200 draws.
//
// FOUR STREAMS, because a ledger can be read at more than one grain and
// which one carries the figure is itself the question: by note ID (nearly
// every hearing a first occurrence — the Aria's regime), by END1 (who is
// being talked about — dense recurrence), by END2, by LABEL.
//
// Declared: order 3, alpha 0.05, 20 shuffles for the cut, minLength 3,
// depth 3 (surprise-segments.mjs's own numbers, reused unchanged); 200
// alignment draws; the reader is the app's production configuration
// (POSPrior@1 gate on, determiners + negation received, pronouns resolved).
import { readFileSync, existsSync, writeFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable, decodeEntities } = await import(`${NATIVE}/organs/web.js`);
const { makeNotes } = await import(`${NATIVE}/kernel/notes.js`);
const { lcg } = await import(`${NATIVE}/kernel/continuation.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { classifyWord, dominantClass, POS_PRIOR_META, THRAX_META } = await import(`${NATIVE}/adapters/text/wordclass.js`);
const { makeGrammarLens } = await import(`${NATIVE}/organs/grammar-lens.js`);

const posPath = `${FIX}/pos-prior-eng.json`;
const posPrior = existsSync(posPath) ? JSON.parse(readFileSync(posPath, "utf8")) : null;
const lens = posPrior ? makeGrammarLens({ classifyWord, dominantClass, posPrior, posPriorMeta: POS_PRIOR_META, thraxMeta: THRAX_META }) : null;

const DECLARED = { order: 3, alpha: 0.05, draws: 20, seed: 1, minLength: 3, depth: 3, alignDraws: 200, tolerance: 1 };
const FRAME = {
  reader: "makeRelationReader",
  organs: { splitSentences: "native", surfaces: "native", relations: "native", pronouns: "native/en", posPrior: posPrior ? "POSPrior@1" : null, determiners: "priors.js/en", negation: "priors.js/en", blankFurniture: "blankLabelRows{minRun:4,maxCell:60}" },
  omitted: ["lemmatizer", "verbForms", "noteIdentity"],
  segmenter: DECLARED,
};

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns,
});
const notes = makeNotes();
// The same asymmetric gate organs/hyperlexicon.js builds for the app (P56):
// a settled non-verb is refused with its class, an out-of-vocabulary label admits.
const gate = lens ? ({ label }) => { const c = lens({ label }, { minShare: 0.5 }); return c?.settled && c.thraxClass && c.thraxClass !== "verb" ? { reason: "not_a_verb", detail: `${label} settles as ${c.thraxClass}` } : null; } : null;

/** Read one fetched page in DOCUMENT ORDER into a ledger; return the ledger, hearing offsets, and the section starts held aside. */
function readPage(name) {
  const html = readFileSync(`${FIX}/wikipedia-${name}.html`, "utf8");
  const face = extractReadable(html);
  const text = typeof face === "string" ? face : face?.text ?? "";
  const chunks = chunkSource(`${name}.txt`, text);
  const rel = reader(chunks, { pool: chunks });
  let log = notes.createNotes({ frame: { ...FRAME, source: name } });
  const offsets = [];   // per hearing seq: absolute offset in the readable face
  let offered = 0; const away = {};
  for (const c of chunks) {
    const claims = rel.read(String(c.text ?? ""))?.claims ?? [];
    const arrangements = claims.filter((k) => k.verdict === "bound").map((k) => ({ end1: k.end1, label: k.label, end2: k.end2, spans: (k.spans ?? []).map((s) => ({ ...s, ref: c.ref })) }));
    if (!arrangements.length) continue;
    offered += arrangements.length;
    const before = log.entries.length;
    const r = notes.admit(log, arrangements, { gate, witness: c.ref });
    log = r.log;
    for (const t of r.turnedAway) away[t.reason] = (away[t.reason] ?? 0) + 1;
    for (let i = before; i < log.entries.length; i += 1) {
      const e = log.entries[i];
      const first = (e.spans ?? []).at(-1);   // the span THIS hearing added
      const m = /#(\d+)-/.exec(first?.at ?? "");
      offsets[e.seq] = c.start + (m ? Number(first.at.split("#").at(-1).split("-")[0]) : 0);
      void m;
    }
  }
  // the oracle: section headings located in the face, by offset
  const heads = [...html.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => decodeEntities(m[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()).filter((h) => h && !/^(contents|references|external links|notes|see also|bibliography|further reading)$/i.test(h));
  const sections = [];
  let from = 0;
  for (const h of heads) {
    const i = text.indexOf(`\n${h}\n`, from);
    if (i >= 0) { sections.push(i + 1); from = i + 1; }
  }
  return { name, log, offsets, sections, chunks: chunks.length, offered, away, headings: heads.length, located: sections.length, faceLength: text.length };
}

/** Does boundary b (before stream index b) sit within ±tolerance hearings of the first hearing at/after a section start? */
function turnsFound(boundaries, streamSeqs, offsets, sections, tolerance) {
  const firstAt = sections.map((s) => streamSeqs.findIndex((q) => (offsets[q] ?? -1) >= s)).filter((i) => i > 0);
  const hit = (b) => firstAt.some((i) => Math.abs(i - b) <= tolerance);
  return { found: boundaries.filter(hit).length, turns: firstAt.length, firstAt };
}

function alignmentNull(count, n, streamSeqs, offsets, sections, tolerance, draws, seed) {
  const rng = lcg(seed);
  const rates = [];
  for (let d = 0; d < draws; d += 1) {
    const picks = new Set();
    while (picks.size < Math.min(count, n - 1)) picks.add(1 + Math.floor(rng() * (n - 1)));
    const r = turnsFound([...picks].sort((a, b) => a - b), streamSeqs, offsets, sections, tolerance);
    rates.push(count ? r.found / count : 0);
  }
  rates.sort((a, b) => a - b);
  return { median: rates[Math.floor(rates.length / 2)], p95: rates[Math.floor(rates.length * 0.95)], rates };
}

const lines = [];
const say = (s) => { console.log(s); lines.push(s); };
say(`# Ground / figure / pattern over what was heard — ${new Date().toISOString().slice(0, 10)}`);
say("");
say(`Declared: ${JSON.stringify(DECLARED)}. Frame: ${JSON.stringify(FRAME.organs)}; omitted ${JSON.stringify(FRAME.omitted)}.`);
say("");
const results = {};
for (const name of ["battle-of-borodino", "war-and-peace", "borodino-ru"]) {
  const t0 = Date.now();
  const page = readPage(name);
  const fold = notes.fold(page.log);
  const corroborated = fold.filter((n) => n.witnesses.length >= 2).length;
  say(`## ${name}`);
  say(`face ${page.faceLength} chars · ${page.chunks} chunks · bound arrangements offered ${page.offered} · turned away ${JSON.stringify(page.away)} · notes ${fold.length} (≥2 witnesses: ${corroborated}) · headings ${page.headings}, located ${page.located} · frame declared: ${notes.frameOf(page.log).declared ? "yes" : "no"} · ${Date.now() - t0}ms`);
  say("");
  say("| stream | hearings | distinct | cut (bits) | boundaries (median segment) | turns found / turns | count-matched random median (95th) | random at/above | recursion (cuts per level) |");
  say("|---|---|---|---|---|---|---|---|---|");
  results[name] = {};
  for (const by of ["id", "end1", "end2", "label"]) {
    const s = notes.stream(page.log, { by });
    const seqs = s.map((x) => x.seq);
    const seg = notes.segment(page.log, { by, ...DECLARED, depth: 1 });
    const found = turnsFound(seg.boundaries, seqs, page.offsets, page.sections, DECLARED.tolerance);
    const rate = seg.figures ? found.found / seg.figures : 0;
    const nul = alignmentNull(seg.figures, s.length, seqs, page.offsets, page.sections, DECLARED.tolerance, DECLARED.alignDraws, DECLARED.seed + 100);
    const above = nul.rates.filter((r) => r >= rate).length;
    const segLens = seg.segments.map((x) => x.length).sort((a, b) => a - b);
    const levels = notes.segment(page.log, { by, ...DECLARED }).levels ?? [];
    say(`| ${by} | ${s.length} | ${new Set(s.map((x) => x.symbol)).size} | ${seg.cut.toFixed(2)} | ${seg.figures} (${segLens[Math.floor(segLens.length / 2)] ?? 0}) | ${found.found} / ${found.turns} → **${(rate * 100).toFixed(0)}%** | ${(nul.median * 100).toFixed(0)}% (${(nul.p95 * 100).toFixed(0)}%) | ${seg.figures ? `${above} of ${DECLARED.alignDraws}` : "no cut"} | ${levels.map((l) => `${l.figures}${l.stopped ? `·${l.stopped}` : ""}`).join(" → ")} |`);
    results[name][by] = { hearings: s.length, distinct: new Set(s.map((x) => x.symbol)).size, cut: seg.cut, figures: seg.figures, found: found.found, turns: found.turns, rate, nullMedian: nul.median, nullP95: nul.p95, above, levels: levels.map((l) => ({ figures: l.figures, stopped: l.stopped ?? null })) };
  }
  // the figures themselves: the most surprising hearings, by end1, with their bytes
  const fig = notes.figures(page.log, { by: "end1", order: DECLARED.order });
  const byBits = [...fig].sort((a, b) => b.bits - a.bits).slice(0, 5);
  const entryAt = new Map(page.log.entries.map((e) => [e.seq, e]));
  say("");
  say("Most surprising hearings (by end1, bits before arrival):");
  for (const f of byBits) { const e = entryAt.get(f.seq); say(`- ${f.bits.toFixed(2)} bits · seq ${f.seq} · ${e.end1} —${e.label}→ ${e.end2}`); }
  say("");
}
writeFileSync(new URL("./results/notes-segments.json", import.meta.url), JSON.stringify({ declared: DECLARED, frame: FRAME, results }, null, 2));
say("Raw numbers: results/notes-segments.json");
