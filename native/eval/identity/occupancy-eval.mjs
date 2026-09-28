// occupancy-eval.mjs — adapters/text/occupancy-testimony.js across FOUR
// domains, scored where an independent key exists. Zero model calls.
//
// PRE-REGISTERED 2026-09-27, before the first run (reader built and unit-
// tested on synthetic sentences only; no fixture below was read by it yet).
//   Domains: ENCYCLOPEDIC — the 11 wikipedia-*.html fixtures; NOVEL — War and
//   Peace (Maude, live_priors); LAW — ukpga-2017-1.md; COURT —
//   scotus-oral-argument-excerpt.md.
//   Key (encyclopedic only): Wikidata. An admitted occupant is resolved by
//   wbsearchentities, top 5 hits, the first whose P31 is Q5 (human); the key
//   is that person's P39 (position held) labels and aliases, fetched and
//   cached in fixtures/wikidata-occupancy-key.json (retrievedAt, lastrevid
//   kept). A standing is CONFIRMED when its locus shares a content word
//   (>= 3 letters, not a determiner, "of" or "and") with one of those labels.
//   An occupant with no human hit or no P39 is UNKEYED and scored neither way.
//   An unconfirmed keyed standing is reported as "not in the key", never as
//   wrong: Wikidata's P39 is incomplete by construction.
//
//   O1  encyclopedic: >= 50% of keyed standings are confirmed, AND a control
//       built to fail — loci permuted among the keyed standings (seed 7, 40
//       draws) — confirms at most half as often as the real pairing (median)
//   O2  novel: a standing is found with locus "Count Bezukhov" and an occupant
//       whose surface contains "Pierre"
//   O3  law: the statute yields zero standings (declared as a weak test: it
//       contains no appointment clause)
//   O4  every admitted standing feeds kernel/sequence.js without error; the
//       number of loci and edges is reported, and refuteLocus's verdict on
//       undated standings is reported as the disclosure it is
//   Refusals are reported by reason in every domain.
//   node occupancy-eval.mjs [out.json]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { readOccupancyTestimony, testimonyRecord } = await import(`${NATIVE}/adapters/text/occupancy-testimony.js`);
const { NEGATION_WORDS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, AUXILIARY_VERBS } = await import(`${NATIVE}/adapters/text/priors.js`);
const { COPULA_FORMS } = await import(`${NATIVE}/adapters/text/phasepost.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { declareSequence, readSequence, refuteLocus } = await import(`${NATIVE}/kernel/sequence.js`);
const { hyperedge } = await import(`${NATIVE}/kernel/hypergraph.js`);
const { createSeededRng, shuffled } = await import(`${NATIVE}/kernel/rng.js`);
const [OUT] = process.argv.slice(2);

const MODALS = new Set([...AUXILIARY_VERBS].filter((w) => !COPULA_FORMS.has(w) && !["have", "has", "had", "do", "does", "did"].includes(w)));
const FIX = new URL("../the-fold/fixtures/", import.meta.url);
const KEY = new URL("./fixtures/wikidata-occupancy-key.json", import.meta.url);
const opts = (source) => ({ source, determiners: { definite: DEFINITE_DETERMINERS, indefinite: INDEFINITE_DETERMINERS }, modals: MODALS, negation: NEGATION_WORDS });
const html = (s) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<sup[\s\S]*?<\/sup>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#91;|&#93;/g, "").replace(/&[a-z#0-9]+;/g, " ").replace(/\s+/g, " ");
const sentencesOf = (text) => splitSentences(text).map((s, at) => ({ text: s.text, at }));
const read = (source, text) => readOccupancyTestimony(sentencesOf(text), opts(source));
const tally = (xs, k) => xs.reduce((m, x) => ((m[x[k]] = (m[x[k]] ?? 0) + 1), m), {});

// ── the four domains ──────────────────────────────────────────────────────
const pages = ["abraham-lincoln", "alan-turing", "american-civil-war", "apollo-11", "battle-of-austerlitz", "battle-of-borodino", "battle-of-gettysburg", "bletchley-park", "katherine-johnson", "war-and-peace", "war-of-the-third-coalition"];
const ency = pages.map((p) => read(`wikipedia-${p}`, html(readFileSync(new URL(`wikipedia-${p}.html`, FIX), "utf8"))));
const novelText = readFileSync("/home/user/live_priors/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt", "utf8").replace(/\r\n/g, "\n").replace(/\s*\n\s*/g, " ");
const novel = read("war-and-peace", novelText);
const law = read("ukpga-2017-1", readFileSync(new URL("ukpga-2017-1.md", FIX), "utf8").replace(/^---[\s\S]*?---/, ""));
const court = read("scotus", readFileSync(new URL("scotus-oral-argument-excerpt.md", FIX), "utf8"));

// ── the key: Wikidata, fetched once and cached (Heimdall's crossing rules) ─
const UA = "eoreader7-identity-eval/0.1 (research; one request per 1.2s)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJSON(url) {
  for (let i = 0; i < 4; i += 1) {
    try { const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) }); if (r.ok) return await r.json(); const w = Number(r.headers.get("retry-after")); await sleep(Number.isFinite(w) && w > 0 ? w * 1000 : 2000 * 2 ** i); }
    catch { await sleep(2000 * 2 ** i); }
  }
  return { failed: url };
}
const entity = async (id) => { const j = await getJSON(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`); await sleep(1200); return j.failed ? null : Object.values(j.entities)[0]; };
const key = existsSync(KEY) ? JSON.parse(readFileSync(KEY, "utf8")) : { schema: "EOWikidataOccupancyKey@1", giver: "wikidata.org: wbsearchentities + Special:EntityData (P31, P39)", retrievedAt: new Date().toISOString(), occupants: {}, positions: {} };
const occupants = [...new Set(ency.flatMap((r) => r.candidates.map((c) => c.occupant)))];
for (const o of occupants) {
  if (key.occupants[o]) continue;
  const s = await getJSON(`https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(o)}&language=en&limit=5&format=json`); await sleep(1200);
  let hit = null;
  for (const h of s.search ?? []) { const e = await entity(h.id); if ((e?.claims?.P31 ?? []).some((c) => c.mainsnak?.datavalue?.value?.id === "Q5")) { hit = e; break; } }
  key.occupants[o] = hit ? { qid: hit.id, label: hit.labels?.en?.value ?? null, lastrevid: hit.lastrevid, P39: (hit.claims?.P39 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) } : { qid: null };
  for (const q of key.occupants[o].P39 ?? []) if (!key.positions[q]) { const e = await entity(q); key.positions[q] = e ? { label: e.labels?.en?.value ?? null, aliases: (e.aliases?.en ?? []).map((a) => a.value) } : { failed: true }; }
}
writeFileSync(KEY, JSON.stringify(key));

// ── O1 ────────────────────────────────────────────────────────────────────
const STOP = new Set([...DEFINITE_DETERMINERS, ...INDEFINITE_DETERMINERS, "of", "and"]);
const words = (s) => new Set((String(s ?? "").toLowerCase().match(/\p{L}{3,}/gu) ?? []).filter((w) => !STOP.has(w)));
const keyed = ency.flatMap((r) => r.candidates).filter((c) => (key.occupants[c.occupant]?.P39 ?? []).length);
const labelsOf = (o) => key.occupants[o].P39.flatMap((q) => [key.positions[q]?.label, ...(key.positions[q]?.aliases ?? [])]).filter(Boolean);
const confirmed = (occupant, locus) => { const lw = words(locus); return labelsOf(occupant).some((l) => [...words(l)].some((w) => lw.has(w))); };
const realRate = keyed.length ? keyed.filter((c) => confirmed(c.occupant, c.locus)).length / keyed.length : null;
const draws = [];
for (let d = 0; d < 40; d += 1) { const loci = shuffled(keyed.map((c) => c.locus), createSeededRng({ seed: 7, purpose: `occupancy-control-${d}` })); draws.push(keyed.filter((c, i) => confirmed(c.occupant, loci[i])).length / keyed.length); }
draws.sort((a, b) => a - b); const controlMedian = keyed.length ? draws[20] : null;
const O1 = { admitted: ency.reduce((n, r) => n + r.candidates.length, 0), keyed: keyed.length, unkeyed: ency.reduce((n, r) => n + r.candidates.length, 0) - keyed.length, confirmedRate: realRate, controlMedian, held: realRate != null && realRate >= 0.5 && controlMedian <= realRate / 2 };
// ── O2 / O3 ───────────────────────────────────────────────────────────────
const bez = novel.candidates.filter((c) => /count bezukhov/i.test(c.locus));
const O2 = { standings: novel.candidates.length, bezukhov: bez.map((c) => ({ occupant: c.occupant, locus: c.locus, clause: c.clause })), held: bez.some((c) => /Pierre/.test(c.occupant)) };
const O3 = { standings: law.candidates.length, held: law.candidates.length === 0, weak: "the statute contains no appointment clause" };
// ── O4 ────────────────────────────────────────────────────────────────────
const all = [...ency.flatMap((r) => r.candidates), ...novel.candidates, ...court.candidates];
const decl = declareSequence({ relation: "holds-after", locus: "locus", occupant: "occupant", position: "key", predecessor: "predecessor", giver: "the material's own testimony (adapters/text/occupancy-testimony.js)" });
let O4;
try { const seq = readSequence(all.map(testimonyRecord), decl, { hyperedge }); const ref = refuteLocus(seq.positions); O4 = { loci: new Set(seq.positions.map((p) => p.locus)).size, positions: seq.positions.length, edges: seq.edges.length, refuted: ref.refuted.length, disclosure: ref.disclosure, held: true }; }
catch (e) { O4 = { error: String(e), held: false }; }

const out = {
  domains: {
    encyclopedic: { pages: pages.length, admitted: O1.admitted, refused: tally(ency.flatMap((r) => r.refused), "reason"), sample: ency.flatMap((r) => r.candidates).slice(0, 25).map((c) => `${c.occupant} -> ${c.locus} [${c.pattern}${c.predecessor ? ` after ${c.predecessor}` : ""}]`) },
    novel: { admitted: novel.candidates.length, refused: tally(novel.refused, "reason"), sample: novel.candidates.slice(0, 25).map((c) => `${c.occupant} -> ${c.locus} [${c.pattern}]`) },
    law: { admitted: law.candidates.length, refused: tally(law.refused, "reason") },
    court: { admitted: court.candidates.length, refused: tally(court.refused, "reason"), sample: court.candidates.map((c) => `${c.occupant} -> ${c.locus}`) },
  },
  O1, O2, O3, O4,
  keyedDetail: keyed.map((c) => ({ occupant: c.occupant, qid: key.occupants[c.occupant].qid, locus: c.locus, confirmed: confirmed(c.occupant, c.locus), address: c.address })),
};
for (const k of ["O1", "O2", "O3", "O4"]) console.log(k, out[k].held === true ? "HELD" : out[k].held === false ? "FAILED" : "GAP", JSON.stringify(out[k]).slice(0, 300));
console.log(JSON.stringify(out.domains, null, 1).slice(0, 6000));
if (OUT) writeFileSync(OUT, JSON.stringify(out));
