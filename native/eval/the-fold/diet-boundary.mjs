// diet-boundary.mjs — where a reading stopped hearing its material, found
// by the ledger's own surprise against its own shuffle; and whether a
// ledger from one page predicts the hearings of another.
//
// WHAT THIS CORRECTS FIRST. notes-segments-RESULTS.md (the previous run)
// reported that "the most surprising hearings on all three pages are the
// last ones, and they are all furniture." That ranking was a floor
// artifact: `figures()` grew its alphabet as it read, so every later first
// occurrence read a hair more surprising than an earlier one, and a sort
// by bits simply named the tail. Fixed in the kernel (one floor, the
// stream's own alphabet). The question survives the artifact and is asked
// properly here: is the tail of a source a RUN of hearings above the null's
// cut that is longer than the shuffle's own tail runs? (II.23: the control
// is built to fail — the same hearings, order destroyed.)
//
// MATERIALS. The three committed Wikipedia pages read in document order
// (the wrapper is real: category links, templates, bibliography); each page
// CUT before its first back-matter heading as the prose-tail control; the
// last 120KB of the real Project Gutenberg Dracula WITH its licence tail,
// and the same slice cut at the "*** END OF" marker as its control — one
// real book, one real licence, no site rule anywhere in the kernel.
//
// Declared: by end1; order 3, alpha 0.05, 40 shuffles, seed 1 (notes.js's
// dietBoundaries; the order is surprise-segments.mjs's own). Continuation:
// orders 1..3, 20 shuffled-prior draws.
import { readFileSync, existsSync, writeFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const DRACULA = "/home/user/live_priors/01-literature-books/gutenberg/pg345_Dracula.txt";

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable, decodeEntities } = await import(`${NATIVE}/organs/web.js`);
const { makeNotes } = await import(`${NATIVE}/kernel/notes.js`);
const { lcg, shuffled, sedimentPrior, scorePrequential } = await import(`${NATIVE}/kernel/continuation.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const { classifyWord, dominantClass, POS_PRIOR_META, THRAX_META } = await import(`${NATIVE}/adapters/text/wordclass.js`);
const { makeGrammarLens } = await import(`${NATIVE}/organs/grammar-lens.js`);

const posPrior = JSON.parse(readFileSync(`${FIX}/pos-prior-eng.json`, "utf8"));
const lens = makeGrammarLens({ classifyWord, dominantClass, posPrior, posPriorMeta: POS_PRIOR_META, thraxMeta: THRAX_META });
const DIET = { by: "end1", order: 3, alpha: 0.05, draws: 40, seed: 1 };
const CONT = { orders: [1, 2, 3], draws: 20, seed: 5 };
const FRAME = { reader: "makeRelationReader", organs: { splitSentences: "native", surfaces: "native", relations: "native", pronouns: "native/en", posPrior: "POSPrior@1", determiners: "priors.js/en", negation: "priors.js/en" }, omitted: ["lemmatizer", "verbForms", "noteIdentity"], diet: DIET, continuation: CONT };

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns,
});
const notes = makeNotes();
const gate = ({ label }) => { const c = lens({ label }, { minShare: 0.5 }); return c?.settled && c.thraxClass && c.thraxClass !== "verb" ? { reason: "not_a_verb", detail: `${label} settles as ${c.thraxClass}` } : null; };

/** Read a text in DOCUMENT ORDER into a ledger under one witness source. */
function readText(name, text) {
  const chunks = chunkSource(`${name}.txt`, text);
  const rel = reader(chunks, { pool: chunks });
  let log = notes.createNotes({ frame: { ...FRAME, source: name } });
  for (const c of chunks) {
    const claims = rel.read(String(c.text ?? ""))?.claims ?? [];
    const arrangements = claims.filter((k) => k.verdict === "bound").map((k) => ({ end1: k.end1, label: k.label, end2: k.end2, spans: (k.spans ?? []).map((s) => ({ ...s, ref: c.ref })) }));
    if (arrangements.length) log = notes.admit(log, arrangements, { gate, witness: `${c.ref}~fixed-recipe` }).log;
  }
  return log;
}

/** The same hearings, order destroyed, re-heard under the same source. */
function shuffledLedger(log, seed) {
  const h = log.entries.filter((e) => e.end1 && e.label && e.end2);
  const rng = lcg(seed);
  const order = h.map((e, i) => ({ e, k: rng() })).sort((a, b) => a.k - b.k).map((x) => x.e);
  let out = notes.createNotes({ frame: { control: "shuffled" } });
  order.forEach((e, i) => { out = notes.hear(out, { end1: e.end1, label: e.label, end2: e.end2, spans: [{ ref: "ctl", start: i, end: i + 1 }], witness: `${String(e.witnesses.at(-1)).split("#")[0]}#${i}-${i + 1}~fixed-recipe` }); });
  return out;
}

const BACK = /^(references|see also|notes|bibliography|further reading|external links|sources|citations|notes and references|примечания|литература|ссылки|см\. также)$/i;
function readableWithCut(html) {
  const face = extractReadable(html);
  const text = typeof face === "string" ? face : face?.text ?? "";
  const heads = [...html.matchAll(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/g)].map((m) => decodeEntities(m[2].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()).filter(Boolean);
  let cutAt = -1;
  for (const h of heads) { if (BACK.test(h)) { const i = text.indexOf(`\n${h}\n`); if (i >= 0) { cutAt = i; break; } } }
  return { text, prose: cutAt > 0 ? text.slice(0, cutAt) : null, cutHeading: cutAt > 0 ? heads.find((h) => BACK.test(h)) : null };
}

const lines = [];
const say = (s) => { console.log(s); lines.push(s); };
const showRun = (log, b, n = 6) => {
  const at = new Map(log.entries.map((e) => [e.seq, e]));
  return b.seqs.slice(0, n).map((q) => { const e = at.get(q); return `${e.end1} —${e.label}→ ${e.end2}`; }).join(" · ") + (b.seqs.length > n ? ` · … (${b.seqs.length})` : "");
};
say(`# Diet boundaries and cross-source continuation — ${new Date().toISOString().slice(0, 10)}`);
say(`Declared: diet ${JSON.stringify(DIET)}; continuation ${JSON.stringify(CONT)}. Frame: ${JSON.stringify(FRAME.organs)}; omitted ${JSON.stringify(FRAME.omitted)}.`);
say("");
say("## Diet boundaries: the tail run above the null, against the shuffle's own tail runs");
say("");
say("| material | hearings | notes | tail run | null (95th) | boundary | conceded | what the run holds |");
say("|---|---|---|---|---|---|---|---|");
const results = { diet: {}, continuation: {} };
const ledgers = {};
function report(name, log) {
  const [b] = notes.dietBoundaries(log, DIET);
  const c = b.boundary ? notes.concedeDiet(log, b, { trigger: "diet boundary" }) : null;
  const [sh] = notes.dietBoundaries(shuffledLedger(log, 99), DIET);
  say(`| ${name} | ${b.hearings} | ${notes.fold(log).length} | ${b.run} | ${b.runNull} | ${b.boundary ? "**yes**" : "no"} | ${c ? c.conceded.length : 0} | ${b.boundary ? showRun(log, b) : "—"} |`);
  say(`| ${name} · shuffled | ${sh.hearings} | — | ${sh.run} | ${sh.runNull} | ${sh.boundary ? "**yes**" : "no"} | — | ${sh.boundary ? showRun(shuffledLedger(log, 99), sh) : "—"} |`);
  results.diet[name] = { hearings: b.hearings, run: b.run, runNull: b.runNull, boundary: b.boundary, conceded: c?.conceded.length ?? 0, shuffled: { run: sh.run, runNull: sh.runNull, boundary: sh.boundary } };
  return c?.log ?? log;
}
for (const name of ["battle-of-borodino", "war-and-peace", "borodino-ru"]) {
  const t0 = Date.now();
  const html = readFileSync(`${FIX}/wikipedia-${name}.html`, "utf8");
  const { text, prose, cutHeading } = readableWithCut(html);
  const full = readText(name, text);
  ledgers[name] = report(name, full);
  if (prose) report(`${name} · cut before "${cutHeading}"`, readText(`${name}-prose`, prose));
  else say(`| ${name} · prose control | — | — | — | — | no back-matter heading located | — | — |`);
  console.error(`${name}: ${Date.now() - t0}ms`);
}
if (existsSync(DRACULA)) {
  const t0 = Date.now();
  const raw = readFileSync(DRACULA, "utf8").replace(/\r\n/g, "\n");
  const endAt = raw.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK");
  const slice = raw.slice(Math.max(0, raw.length - 120000));
  const sliceEnd = slice.indexOf("*** END OF THE PROJECT GUTENBERG EBOOK");
  report("dracula · last 120KB with licence tail", readText("dracula-tail", slice));
  report("dracula · same slice cut at the END marker", readText("dracula-cut", slice.slice(0, sliceEnd)));
  console.error(`dracula: ${Date.now() - t0}ms (licence tail ${raw.length - endAt} chars)`);
} else say("| dracula | — | — | — | — | corpus not on this disk | — | — |");
say("");
say("## Cross-source continuation: does a ledger sedimented from page A predict page B's hearings?");
say("");
say("bits per hearing on B (lower is better): under a prior from A, vs the median of 20 priors from A with its order destroyed (same alphabet, same counts — only the order can carry). A gain that survives the shuffle is order transferring across pages.");
say("");
say("| A → B | stream | order | bits/hearing under A | under shuffled A (median) | gain (bits) | shuffled draws A beats |");
say("|---|---|---|---|---|---|---|");
const names = Object.keys(ledgers);
for (const a of names) for (const b of names) {
  if (a === b) continue;
  for (const by of ["end1", "label"]) {
    const A = notes.stream(ledgers[a], { by }).map((x) => x.symbol);
    const B = notes.stream(ledgers[b], { by }).map((x) => x.symbol);
    const alphabetSize = new Set([...A, ...B]).size;
    for (const order of CONT.orders) {
      const prior = sedimentPrior(A, { order, giver: `ledger:${a}` });
      const bits = scorePrequential(prior, B, { alphabetSize }).bitsPerEvent;
      const rng = lcg(CONT.seed);
      const nulls = [];
      for (let d = 0; d < CONT.draws; d += 1) nulls.push(scorePrequential(sedimentPrior(shuffled(A, rng), { order, giver: "shuffled" }), B, { alphabetSize }).bitsPerEvent);
      nulls.sort((x, y) => x - y);
      const median = nulls[Math.floor(nulls.length / 2)];
      const beats = nulls.filter((n) => bits < n).length;
      say(`| ${a} → ${b} | ${by} | ${order} | ${bits.toFixed(3)} | ${median.toFixed(3)} | ${(median - bits).toFixed(3)} | ${beats} of ${CONT.draws} |`);
      results.continuation[`${a}->${b}|${by}|${order}`] = { bits, median, beats };
    }
  }
}
writeFileSync(new URL("./results/diet-boundary.json", import.meta.url), JSON.stringify({ declared: { DIET, CONT }, frame: FRAME, results }, null, 2));
say("");
say("Raw numbers: results/diet-boundary.json");
