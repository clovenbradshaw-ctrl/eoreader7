// eoreader7 · build-role-config — derives a language's own clause-level
// SUBJECT/OBJECT role-assignment strategy MECHANICALLY from a UD treebank's
// real gold dependency annotations, producing a `RoleConfig@1` any
// language can be read with through `adapters/text/relations-positional.js`
// (the one master positional reader — no per-language JS file).
//
// WHY THIS EXISTS, AND WHY IT IS NOT A REPEAT OF relations-case-marked.js.
// Building `relations-hebrew.js` and `relations-arabic.js` as two separate,
// hand-written files (2026-09-15) surfaced the same lesson twice in one
// afternoon: neither language's clause grammar is what its WALS "root-
// pattern" genus label practically implies (that label is about
// templatic WORD-formation, not clause-level role marking) — measured
// directly, Hebrew objects follow their verb 96.6% of the time and Arabic
// objects follow theirs 99.9% of the time; Hebrew subjects precede their
// verb 69.8% of the time, Arabic subjects split almost evenly (45.7%/
// 54.3%, i.e. position carries NO usable signal for Arabic's subject at
// all). Two DIFFERENT numbers, discovered the SAME way, is a strategy
// pattern, not a coincidence — hand-writing a third file for a third
// language would repeat the discovery-and-hand-code cycle a third time
// for no reason: what varies is a handful of MEASURED NUMBERS, not the
// mechanism that consumes them. This script measures those numbers; the
// reader that consumes them is one file, for any language.
//
// MECHANICAL MARKER DISCOVERY — the harder half, generalising a discovery
// this project had previously only made by hand. Hebrew's את (the
// definite-direct-object marker) was found by testing ONE received
// grammatical fact against the data. That is backwards for a script meant
// to run on a treebank whose grammar nobody has hand-inspected yet: this
// derives the SAME kind of fact directly from co-occurrence statistics,
// with its own control, so a real marker earns its place by measurement
// and a coincidental one is refused by the same test.
//
//   For every FORM appearing immediately before the head-verb-adjacent
//   nominal slot (the side already established as dominant for the
//   object), compute:
//     precision = P(the following token IS the gold object | this form appears there)
//     recall    = P(preceded by this form | is a gold object)
//   against the CORPUS BASE RATE of "the following token is a gold
//   object" (objects are a small fraction of all tokens, so a form
//   clearing precision far above that base rate, at a real volume floor,
//   is a genuine marker — not "some word happened to precede one object
//   once"). The control: a form's OWN precision is compared to the base
//   rate over the SAME population it was measured in, the same shape
//   `capitalisationIsSignificant` (surfaces.js) already uses for a
//   different question — a candidate earns its floor from its own
//   evidence volume, never a fixed threshold picked to admit one language.
//
// Usage: node native/scripts/build-role-config.mjs <train.conllu> <out.json> <lang> [minVolume=20] [draws=200] [alpha=0.05] [seed=1]
import { readFileSync, writeFileSync } from "node:fs";

const IN = process.argv[2];
const OUT = process.argv[3];
const LANGUAGE = process.argv[4];
const MIN_VOLUME = Number(process.argv[5] ?? 20); // a marker candidate needs at least this many occurrences before it is tested at all
const NULL_DRAWS = Number(process.argv[6] ?? 200); // this project's own standing null-arm draw count (P66/network-standing.js), reused not re-chosen
const NULL_ALPHA = Number(process.argv[7] ?? 0.05); // this project's own standing null-arm significance level, reused not re-chosen
const NULL_SEED = Number(process.argv[8] ?? 1);

if (!IN || !OUT || !LANGUAGE) {
  console.error("usage: node build-role-config.mjs <train.conllu> <out.json> <lang> [minVolume=20] [draws=200] [alpha=0.05] [seed=1]");
  process.exit(1);
}

function parseSentences(conllu) {
  const sentences = [];
  let toks = [];
  for (const line of conllu.split("\n")) {
    if (line.startsWith("#")) continue;
    if (!line.trim()) { if (toks.length) sentences.push(toks); toks = []; continue; }
    const cols = line.split("\t");
    if (!/^[0-9]+$/.test(cols[0])) continue; // skip multi-word-token ranges and empty nodes
    toks.push({ id: Number(cols[0]), form: cols[1], upos: cols[3], feats: cols[5], head: Number(cols[6]), deprel: cols[7].split(":")[0] });
  }
  if (toks.length) sentences.push(toks);
  return sentences;
}

const sentences = parseSentences(readFileSync(IN, "utf8"));

// ── POSITION: which side of its verb head does each role dominantly sit on ──
function positionStats(deprels) {
  let before = 0, after = 0;
  for (const toks of sentences) {
    for (const t of toks) {
      if (!deprels.includes(t.deprel)) continue;
      if (t.id < t.head) before++; else after++;
    }
  }
  const total = before + after;
  if (!total) return { total: 0, before: 0, after: 0, dominantSide: null, reliability: null };
  const dominantSide = before >= after ? "before" : "after";
  const reliability = Math.max(before, after) / total;
  return { total, before, after, dominantSide, reliability };
}
const objectPos = positionStats(["obj", "iobj"]);
const subjectPos = positionStats(["nsubj"]);

// A side is USABLE only when it clears real separation from chance (0.5);
// declared, not tuned per language — a fixed distance from the coin-flip
// point, the same "structural, not fitted" posture this project holds
// every other derived floor to.
const MIN_RELIABILITY_ABOVE_CHANCE = 0.1;
const usable = (stats) => stats.reliability != null && stats.reliability - 0.5 >= MIN_RELIABILITY_ABOVE_CHANCE;

// ── MARKER DISCOVERY: does a token immediately preceding the object/subject
// slot (on its own dominant side) predict the role far above base rate? ──
// A tiny seeded LCG — reused verbatim from kind-standing.js's own
// discoverCompanyKinds null arm (the SAME shuffle-and-compare-to-quantile
// shape, generalised here from "which word sits where" to "which token
// carries the role label"), never re-derived as a second RNG.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

// A marker CANDIDATE is restricted to CLOSED-class forms — a genuine
// grammatical marker particle (את, a preposition, a subordinator) is
// never an open-class content word by definition. Found necessary live:
// without this restriction, a single-form per-candidate null (below) has
// no multiple-comparisons correction, and across the THOUSANDS of forms
// a real treebank contains, some open-class word will clear any per-form
// significance threshold by pure chance at small volume — "רוצה" ("wants",
// a VERB, 14/27 raw occurrences) cleared a per-form 95% shuffle ceiling
// this way before this restriction existed. Restricting candidates to the
// UPOS classes a marker particle could actually BE closes the false-
// positive class at its source, the same way `relations-case-marked.js`
// excludes `LATIN_PREPOSITIONS` from ever being read as a case-marked
// nominal — never a threshold fix for what is really a category error.
const CLOSED_MARKER_CLASSES = Object.freeze(new Set(["ADP", "PART", "SCONJ", "CCONJ", "DET", "AUX"]));

function dominantUpos(sentences) {
  const counts = new Map(); // form -> Map(upos -> n)
  for (const toks of sentences) for (const t of toks) {
    if (!counts.has(t.form)) counts.set(t.form, new Map());
    const m = counts.get(t.form);
    m.set(t.upos, (m.get(t.upos) ?? 0) + 1);
  }
  const dominant = new Map();
  for (const [form, m] of counts) {
    let best = null, bestN = 0, total = 0;
    for (const [upos, n] of m) { total += n; if (n > bestN) { bestN = n; best = upos; } }
    dominant.set(form, { upos: best, share: bestN / total });
  }
  return dominant;
}
const dominantUposByForm = dominantUpos(sentences);

function tallyHits(sentences, deprels, side) {
  const byForm = new Map(); // form -> { hits, total }
  for (const toks of sentences) {
    const byId = new Map(toks.map((t) => [t.id, t]));
    for (const t of toks) {
      const neighborId = side === "after" ? t.id + 1 : t.id - 1;
      const neighbor = byId.get(neighborId);
      const isRole = !!neighbor && deprels.includes(neighbor.deprel);
      const row = byForm.get(t.form) ?? { hits: 0, total: 0 };
      row.total++;
      if (isRole) row.hits++;
      byForm.set(t.form, row);
    }
  }
  return byForm;
}

/**
 * A marker candidate earns its place the same way `discoverCompanyKinds`
 * already requires (II.23): the REAL precision must beat the ceiling a
 * shuffle of the SAME material can reach by chance, not merely clear a
 * hand-picked ratio. THE SHUFFLE: within each sentence, the role deprel
 * label (`deprels`) is redealt among that sentence's own token positions
 * — same count of role-tokens per sentence, different tokens carrying it
 * — so a form's real adjacency-to-the-role rate is compared against what
 * adjacency-to-a-RANDOM-position-in-the-same-sentence would produce.
 * `hits`/`total` marginals per form are otherwise untouched by the null.
 *
 * MAX-STATISTIC (FAMILYWISE) CORRECTION, not a per-candidate null (S122,
 * a peer review — LaVar, via 3-0-96, 2026-09-16, not found by this
 * project's own running of it). `CLOSED_MARKER_CLASSES` narrows the
 * hypothesis space, but does not eliminate it: a real treebank's closed
 * classes still hold dozens of distinct forms, and testing each one
 * against its OWN per-form null at alpha=0.05 independently means the
 * search AS A WHOLE admits a genuine chance winner far more often than
 * 5% of the time — the same multiple-comparisons shape
 * `CLOSED_MARKER_CLASSES` was built to close for open-class words
 * ("רוצה"/"wants" clearing a per-form ceiling before that restriction
 * existed), recurring at smaller scale among the closed-class survivors.
 * Fixed the standard way: at each of the `NULL_DRAWS` shuffles, compute
 * the MAXIMUM null hit-rate across every ELIGIBLE candidate (the same
 * set tested in the real data) — one null distribution of "the best any
 * closed-class candidate could look like by chance," `NULL_DRAWS` deep
 * — rather than each candidate's own separate null. The real winning
 * candidate (necessarily the highest-precision real candidate: if it
 * does not clear the family ceiling, no lower-precision candidate can
 * either) is compared against THIS distribution's (1-alpha) quantile,
 * controlling the familywise error rate for "did this search admit any
 * marker at all," not merely one candidate's own individual
 * significance.
 */
function discoverMarker(deprels, side) {
  const real = tallyHits(sentences, deprels, side);
  const eligible = new Set();
  for (const [form, { total }] of real) {
    if (total < MIN_VOLUME) continue;
    if (!CLOSED_MARKER_CLASSES.has(dominantUposByForm.get(form)?.upos)) continue;
    eligible.add(form);
  }
  if (!eligible.size) return null;

  const rng = makeRng(NULL_SEED);
  const maxNullRates = []; // one entry per draw: the BEST eligible candidate's null hit-rate that draw
  for (let d = 0; d < NULL_DRAWS; d++) {
    const shuffled = sentences.map((toks) => {
      const roleIds = toks.filter((t) => deprels.includes(t.deprel)).map((t) => t.id);
      const positions = toks.map((t) => t.id);
      // Fisher-Yates over which positions receive the role label this draw.
      const pool = positions.slice();
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const redealtRoleIds = new Set(pool.slice(0, roleIds.length));
      return toks.map((t) => ({ ...t, deprel: redealtRoleIds.has(t.id) ? deprels[0] : (deprels.includes(t.deprel) ? "_was_role_" : t.deprel) }));
    });
    const drawTally = tallyHits(shuffled, [deprels[0]], side);
    let drawMax = 0;
    for (const form of eligible) {
      const row = drawTally.get(form);
      const rate = row?.total ? row.hits / row.total : 0;
      if (rate > drawMax) drawMax = rate;
    }
    maxNullRates.push(drawMax);
  }
  maxNullRates.sort((a, b) => a - b);
  const idx = Math.min(maxNullRates.length - 1, Math.ceil((1 - NULL_ALPHA) * maxNullRates.length) - 1);
  const ceiling = maxNullRates[Math.max(0, idx)];

  let best = null;
  for (const form of eligible) {
    const { hits, total } = real.get(form);
    const precision = hits / total;
    if (!best || precision > best.precision) best = { form, hits, total, precision };
  }
  if (!best || best.precision <= ceiling) return null; // even the best real candidate does not beat what the best chance candidate could reach
  return { ...best, nullCeiling: ceiling };
}

const objectMarker = discoverMarker(["obj", "iobj"], objectPos.dominantSide ?? "after");

const config = {
  schema: "RoleConfig@1",
  language: LANGUAGE,
  provenance: {
    builder: "eoreader7 native/scripts/build-role-config.mjs",
    source: IN,
    min_volume: MIN_VOLUME,
    null_draws: NULL_DRAWS,
    null_alpha: NULL_ALPHA,
    null_seed: NULL_SEED,
    note: "position stats and marker candidates are both derived mechanically from this treebank's own gold dependency annotations — never hand-typed or asserted from general linguistic knowledge. A marker candidate is admitted only when its real precision beats the (1-alpha) quantile of a within-sentence role-label shuffle (II.23), never a fixed ratio — and (S122) that quantile is the MAX-STATISTIC across every eligible closed-class candidate tried, not a per-candidate null, so the admitted marker is significant against the whole search, not merely against itself.",
  },
  object: {
    ...objectPos,
    usable: usable(objectPos),
    marker: objectMarker ? { form: objectMarker.form, precision: objectMarker.precision, nullCeiling: objectMarker.nullCeiling, volume: objectMarker.total, recall: objectMarker.hits / (objectPos.before + objectPos.after || 1) } : null,
  },
  subject: {
    ...subjectPos,
    usable: usable(subjectPos),
    // subject markers are discovered too, for a language where the object
    // side has no marker but the subject side does (not the case for
    // Hebrew/Arabic, measured — both languages' overt case/definiteness
    // marking concentrates on the object, but this is not assumed for a
    // future language this script has not yet been run on).
    marker: discoverMarker(["nsubj"], subjectPos.dominantSide ?? "before"),
  },
};

writeFileSync(OUT, JSON.stringify(config, null, 2));
console.error(`${LANGUAGE}: object ${objectPos.dominantSide}(${(objectPos.reliability * 100).toFixed(1)}%) marker=${config.object.marker?.form ?? "none"} | subject ${subjectPos.dominantSide}(${(subjectPos.reliability * 100).toFixed(1)}%) usable=${config.subject.usable} marker=${config.subject.marker?.form ?? "none"} -> ${OUT}`);
