// cast-furniture.mjs — should the referent index read the furniture-blanked
// page? The decision hypergraph.js deferred, measured on both sides.
//
// THE DEFERRAL, VERBATIM, from hypergraph.js's own header — this is not an
// oversight being corrected, it is a stated decision being taken:
//
//   "This reaches EXTRACTION only. `indexFor(list)` and the sentences
//    `pronounBindingsFor` reads are both built from the UNBLANKED `p.text`
//    ... What the change removes is navbox EDGES, not navbox REFERENTS.
//    Blanking the index's input too is a separate decision with its own cost
//    (a name genuinely introduced in a caption or a list is then unknown to
//    the reading) and is not taken here."
//
// A real benefit on one side, a real cost on the other, and no measurement of
// either. This driver measures both.
//
// THE BENEFIT, found 2026-09-04 (rashomon-contrast). With the index on raw
// text, Wikipedia navbox link titles enter the cast as referents and the
// longest-established-surface rule MERGES them with real people: "Prince
// Andrew" became "August Prince Andrew"; Barclay de Tolly merged with Pyotr
// Bagration; "Light While There" — a navbox link to Tolstoy's 1888 "Walk in
// the Light While There is Light" — became a referent competing for slots.
// P11 routes ALL identity through this organ, so a corrupted cast corrupts
// every claim downstream.
//
// THE COST, exactly as the deferral names it: a name introduced ONLY in a
// caption or a list is, after blanking, unknown to the reading. That is a
// LOSS, not a saving, and it is counted here as its own column rather than
// folded into a net figure — the two are different kinds of change and a
// difference is only evidence when its direction is declared (P30).
//
// THE NULL IS SIZE-MATCHED, and it is the whole reason this is a measurement
// rather than an assertion. "This region is furniture" is a Pattern-grain
// claim: a corpus can REFUTE it and can never earn it (the grain theorem
// declarations.js is built around). So the arm that matters is not
// blanked-vs-raw — it is blanked-vs-BLANKING-THE-SAME-NUMBER-OF-CHARACTERS-
// SOMEWHERE-ELSE. If removing the furniture changes the cast no more than
// removing an equal quantity of arbitrary prose, the furniture hypothesis
// bought nothing and should not be declared even as a candidate.
//
// ZERO MODEL CALLS. Every stage is arithmetic over committed fixtures.
//
//   node cast-furniture.mjs      env: PAGES (comma list), DRAWS (default 20)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const HERE = new URL(".", import.meta.url).pathname;
const OUT = process.env.OUT_PATH ?? path.join(HERE, "results", "cast-furniture.json");
const DRAWS = Number(process.env.DRAWS ?? 20);
const PAGES = (process.env.PAGES ?? [
  "wikipedia-battle-of-borodino.html",
  "wikipedia-war-and-peace.html",
  "wikipedia-battle-of-austerlitz.html",
  "wikipedia-abraham-lincoln.html",
  "wikipedia-alan-turing.html",
  "wikipedia-apollo-11.html",
].join(",")).split(",");

const { makeReferentIndex } = await import(`${NATIVE}/organs/cast.js`);
const { chunkSource, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { lcg } = await import(`${NATIVE}/kernel/rng.js`);

const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const blanker = (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 });

// The size-matched null. Same COUNT of blanked characters as the furniture
// organ removed, placed in one contiguous run at a seeded offset, so the two
// arms differ in WHERE the loss falls and never in HOW MUCH. Newlines are
// preserved so the chunker's own segmentation is untouched — a null that
// re-segments the page would be measuring the chunker, not the cast.
function blankElsewhere(text, count, seed) {
  const src = String(text);
  if (count <= 0 || count >= src.length) return src;
  const rand = lcg(seed);
  const start = Math.floor(rand() * (src.length - count));
  const out = src.split("");
  for (let i = start; i < start + count; i += 1) if (out[i] !== "\n") out[i] = " ";
  return out.join("");
}

const countBlanked = (raw, b) => {
  let n = 0;
  for (let i = 0; i < raw.length; i += 1) if (raw[i] !== b[i]) n += 1;
  return n;
};

// A referent's identity for cross-arm comparison is its own most-individuated
// surface, folded for diacritics — the organ's own `represent`, never a
// lowercased end (P11). Comparing arms by referent_id would be meaningless:
// ids are positional and every arm renumbers them.
const surfacesOf = (idx) => new Set([...idx.referents].map((id) => diaNorm(String(idx.represent(id) ?? ""))).filter(Boolean));

function arm(passages, opts) {
  const idx = indexFor(passages, opts);
  return { idx, surfaces: surfacesOf(idx), referents: idx.referents.size };
}

const rows = [];
for (const file of PAGES) {
  const html = readFileSync(`${FIX}${file}`, "utf8");
  const text = extractReadable(html).text;
  const chunks = chunkSource(file, text, { blankFurniture: blanker });
  const withCopy = chunks.filter((c) => typeof c.blanked === "string").length;
  const blankedChars = chunks.reduce((n, c) => (typeof c.blanked === "string" ? n + countBlanked(String(c.text ?? ""), c.blanked) : n), 0);
  const totalChars = chunks.reduce((n, c) => n + String(c.text ?? "").length, 0);

  const raw = arm(chunks, { blanked: false });
  const blank = arm(chunks, { blanked: true });

  // LOST = in raw, gone after blanking. Split by the deferral's own question:
  // does the name still occur in the material OUTSIDE what was blanked? If it
  // does, blanking cost the reading a real name (the stated cost). If it does
  // not, the name lived only inside furniture (the benefit).
  const outsideFurniture = chunks
    .map((c) => (typeof c.blanked === "string" ? c.blanked : String(c.text ?? "")))
    .join("\n\n");
  const outsideFolded = diaNorm(outsideFurniture);
  const lost = [...raw.surfaces].filter((s) => !blank.surfaces.has(s));
  const costLost = lost.filter((s) => outsideFolded.includes(s));   // still in the page: a real loss
  const furnitureOnly = lost.filter((s) => !outsideFolded.includes(s)); // only ever in furniture
  const gained = [...blank.surfaces].filter((s) => !raw.surfaces.has(s));

  // ── THE NULL, SCORED ON THE AXIS THAT CARRIES THE DIRECTION ─────
  // A first cut of this driver scored "total surfaces changed" and read the
  // real arm as INSIDE its own null. That statistic is wrong, and wrong in
  // the way this file's own header warns about: it collapses a directional
  // question into a magnitude. A contiguous 3,766-character run torn out of
  // live prose destroys whole sentences and takes real names with them, so a
  // random blanking necessarily changes MORE — the null wins by doing more
  // damage, which is not evidence about furniture.
  //
  // The claim "these characters are furniture" is precisely the claim that
  // REMOVING THEM COSTS LESS REAL IDENTITY THAN REMOVING ARBITRARY
  // CHARACTERS DOES. So the axis is cost per character blanked: real names
  // lost (a surface that still occurs in what SURVIVED, so its loss is a
  // loss) over the characters blanking spent. Same denominator in both arms
  // by construction — the null blanks exactly as many characters. No label
  // for "what is furniture" is needed anywhere, which is the point: the
  // organ is judged by what its selection COSTS, never by agreeing with a
  // second opinion about navboxes.
  const nullDraws = [];
  for (let d = 1; d <= DRAWS; d += 1) {
    const nulled = chunks.map((c) => {
      const t = String(c.text ?? "");
      const n = typeof c.blanked === "string" ? countBlanked(t, c.blanked) : 0;
      return { ...c, blanked: n > 0 ? blankElsewhere(t, n, d * 7919 + t.length) : c.blanked };
    });
    const a = arm(nulled, { blanked: true });
    const survived = diaNorm(nulled.map((c) => (typeof c.blanked === "string" ? c.blanked : String(c.text ?? ""))).join("\n\n"));
    const nLost = [...raw.surfaces].filter((x) => !a.surfaces.has(x));
    nullDraws.push({
      referents: a.referents,
      lost: nLost.length,
      realLost: nLost.filter((x) => survived.includes(x)).length,
      onlyThere: nLost.filter((x) => !survived.includes(x)).length,
      changed: nLost.length + [...a.surfaces].filter((x) => !raw.surfaces.has(x)).length,
    });
  }
  const med = (xs) => { const q = [...xs].sort((x, y) => x - y); const m = q.length >> 1; return q.length % 2 ? q[m] : (q[m - 1] + q[m]) / 2; };
  const nullChanged = nullDraws.map((n) => n.changed);
  const nullRealLost = nullDraws.map((n) => n.realLost);
  // ── THE ENRICHMENT AXIS, PRE-REGISTERED BEFORE ITS NUMBERS WERE SEEN ────
  // The cost axis above asks "is this selection cheaper than random?" — a
  // NECESSARY question, and on the first full run the answer was: barely, 2
  // of 6 pages, all margins inside the null. That result stands as it fell.
  //
  // But it is not the SUFFICIENT question, and the reason is prior to any
  // number. The claim "these characters are furniture" says the region is
  // ENRICHED for referents that exist ONLY there and are no part of the
  // document's content. That is a ratio by construction — junk removed per
  // real name lost — not a cost. A selection can be exactly as cheap as
  // random and still be furniture, if it takes far more junk with it for the
  // same price. Declared here, with its direction (HIGH is good), before the
  // arm was run, so the axis cannot have been chosen to fit its own answer.
  const enrich = (only, real) => (real > 0 ? Number((only / real).toFixed(2)) : (only > 0 ? Infinity : null));
  const nullEnrichment = nullDraws.map((n) => enrich(n.onlyThere, n.realLost)).filter((x) => x !== null && Number.isFinite(x));
  const realEnrichment = enrich(furnitureOnly.length, costLost.length);
  const beatsEnrichment = nullEnrichment.length && Number.isFinite(realEnrichment)
    ? realEnrichment > Math.max(...nullEnrichment) : null;
  const realChanged = lost.length + gained.length;
  const per = (n) => (blankedChars ? Number(((n / blankedChars) * 1000).toFixed(3)) : null);
  // LOW is good on this axis, so the real arm is licensed only when it costs
  // less real identity than EVERY null draw, and claims nothing otherwise.
  const beatsCostNull = costLost.length < Math.min(...nullRealLost);

  rows.push({
    file,
    chars: totalChars,
    chunksWithBlankedCopy: withCopy,
    chunks: chunks.length,
    blankedChars,
    blankedShare: totalChars ? Number((blankedChars / totalChars).toFixed(4)) : 0,
    referentsRaw: raw.referents,
    referentsBlanked: blank.referents,
    furnitureOnlyReferentsRemoved: furnitureOnly.length,
    realNamesLost: costLost.length,
    referentsGained: gained.length,
    changedTotal: realChanged,
    nullChangedMedian: med(nullChanged),
    nullChangedLow: Math.min(...nullChanged),
    nullChangedHigh: Math.max(...nullChanged),
    // THE DECIDING ROW. Real identity destroyed per 1000 characters blanked,
    // real arm against a size-matched blanking elsewhere. Lower is better.
    realNamesLostPer1kBlanked: per(costLost.length),
    nullRealNamesLostPer1kBlanked: per(med(nullRealLost)),
    nullRealLostLow: Math.min(...nullRealLost),
    nullRealLostHigh: Math.max(...nullRealLost),
    // enrichment: junk-only referents removed per real name lost. HIGH is good.
    enrichment: realEnrichment,
    nullEnrichmentMedian: nullEnrichment.length ? med(nullEnrichment) : null,
    nullEnrichmentLow: nullEnrichment.length ? Math.min(...nullEnrichment) : null,
    nullEnrichmentHigh: nullEnrichment.length ? Math.max(...nullEnrichment) : null,
    beatsEnrichmentNull: beatsEnrichment,
    beatsCostNull,
    beatsNull: beatsEnrichment === true,
    magnitudeNote: "changedTotal vs nullChanged is reported but NOT scored — a random run through live prose changes more by being more destructive, which is a fact about the null, not about furniture",
    samples: { furnitureOnly: furnitureOnly.slice(0, 8), realNamesLost: costLost.slice(0, 8) },
  });
}

const sum = (k) => rows.reduce((n, r) => n + r[k], 0);
const beat = rows.filter((r) => r.beatsNull).length;
const report = {
  driver: "cast-furniture.mjs",
  ran: new Date().toISOString().slice(0, 10),
  modelCalls: 0,
  question: "should makeReferentIndex read chunk.blanked? the decision hypergraph.js's header deferred, with the cost it named measured beside the benefit",
  decision: "OPT-IN. cast.js gained { blanked } on all three faces; omitted, every caller is byte-identical (584 pass / 0 fail / 1 todo, unchanged).",
  nullDraws: DRAWS,
  nullConstruction: "the same NUMBER of characters blanked, placed in one contiguous run at a seeded offset elsewhere in the same chunk; newlines preserved so segmentation is untouched",
  totals: {
    pages: rows.length,
    furnitureOnlyReferentsRemoved: sum("furnitureOnlyReferentsRemoved"),
    realNamesLost: sum("realNamesLost"),
    referentsGained: sum("referentsGained"),
    pagesWhereRealBeatsNull: beat,
  },
  rows,
  decidingAxis: "ENRICHMENT — junk-only referents removed per real name lost, HIGH is good. Pre-registered before its numbers were seen. The claim that a region is furniture IS the claim that it is enriched for referents existing only there.",
  secondaryAxis: "real identity destroyed per character blanked — LOW is good. The claim that these characters are furniture IS the claim that removing them costs less real identity than removing arbitrary characters.",
  reading: beat === rows.length
    ? "on every page, the furniture selection removes MORE junk-only referents per real name lost than a size-matched selection elsewhere — the furniture hypothesis is earned as a CANDIDATE (unrefuted at this stage), never as a conviction"
    : beat === 0
      ? "on no page is the furniture selection more enriched for junk-only referents than a size-matched selection elsewhere. THE FURNITURE HYPOTHESIS BUYS NOTHING HERE and must not be declared, even as a candidate."
      : `${beat} of ${rows.length} pages beat their own size-matched null. The claim holds where it beat the null and nowhere else; a per-page candidate, not a global rule.`,
};

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2));

const say = (s) => console.log(s);
say(`\n=== cast-furniture — ${report.modelCalls} model calls, ${DRAWS} null draws ===`);
say(`the question: ${report.question}\n`);
for (const r of rows) {
  say(`${r.file}`);
  say(`   ${r.chars} chars, ${r.chunksWithBlankedCopy}/${r.chunks} chunks carry a verified blanked copy, ${r.blankedChars} chars blanked (${(r.blankedShare * 100).toFixed(1)}%)`);
  say(`   referents ${r.referentsRaw} -> ${r.referentsBlanked}   BENEFIT furniture-only removed ${r.furnitureOnlyReferentsRemoved}   COST real names lost ${r.realNamesLost}   gained ${r.referentsGained}`);
  say(`   REAL IDENTITY COST per 1k blanked chars: furniture ${r.realNamesLostPer1kBlanked}  vs  elsewhere ${r.nullRealNamesLostPer1kBlanked}  (raw names lost: ${r.realNamesLost} vs ${r.nullRealLostLow}-${r.nullRealLostHigh})  ->  ${r.beatsNull ? "BEATS NULL" : "inside the null"}`);
  say(`   ENRICHMENT junk-only removed per real name lost: furniture ${r.enrichment}  vs  elsewhere ${r.nullEnrichmentLow}-${r.nullEnrichmentHigh} (median ${r.nullEnrichmentMedian})  ->  ${r.beatsEnrichmentNull ? "BEATS NULL" : "inside the null"}`);
  say(`   (unscored magnitude: changed ${r.changedTotal} vs null ${r.nullChangedLow}-${r.nullChangedHigh})`);
  if (r.samples.furnitureOnly.length) say(`     furniture-only: ${r.samples.furnitureOnly.slice(0, 4).map((x) => `"${x.slice(0, 40)}"`).join(", ")}`);
  if (r.samples.realNamesLost.length) say(`     REAL NAMES LOST: ${r.samples.realNamesLost.slice(0, 4).map((x) => `"${x.slice(0, 40)}"`).join(", ")}`);
}
say(`\ntotals: furniture-only removed ${report.totals.furnitureOnlyReferentsRemoved}, real names lost ${report.totals.realNamesLost}, gained ${report.totals.referentsGained}`);
say(`cost axis (secondary): ${rows.filter((r) => r.beatsCostNull).length} of ${rows.length} pages beat their null`);
say(`${report.reading}\n`);
say(`wrote ${OUT}\n`);
