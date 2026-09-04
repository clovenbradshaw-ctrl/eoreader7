// cast-headroom.mjs — before touching the extractor, measure what consulting
// the cast would actually buy.
//
// THE WIRE, named in three documents and built in none: `extractRelations`
// accepts seventeen options and every one is a closed word class or a boolean
// — verbs, function words, negation, determiners, coordinators, boundaries.
// There is no referent index among them. The extractor decides where a
// subject span starts and stops from word classes and punctuation alone, and
// has no way to know what beings the document has established. Station 3
// earns a cast; station 4 never asks for it.
//
// WHY MEASURE FIRST. `relations.js` is a core organ with heavily pinned
// boundary behaviour — its own header records an attempted widening that took
// edge count on 400 Dracula passages from 1644 to 2647 because a shorter match
// lets the scan resume inside the truncated adjunct. Changing it is not free,
// so the headroom decides whether it is worth the risk, and the partition
// below says which intervention would even help.
//
// THE PARTITION. For every extracted edge, ask what its subject span is,
// against the document's OWN cast (`discoverReferents`, the same organ the
// reader already runs and already throws away for this purpose):
//
//   anchored     the span IS a known referent surface. Nothing to fix.
//   trimmable    the span CONTAINS a known surface plus extra words. A
//                cast-consulting extractor could cut to the being. This is
//                the headroom — the ONLY bucket this lever can reach.
//   castless     the span contains no known surface at all. Not reachable by
//                consulting the cast: either the cast missed the being, or the
//                span is furniture, or the subject is a pronoun or a
//                description no name covers.
//
// A lever's headroom is its `trimmable` share, and nothing else. Reporting
// `anchored + trimmable` as "what the cast could give us" would be counting
// what already works as a gain.
//
//   node cast-headroom.mjs     env: PAGES - SAMPLE (20)
import { readFileSync } from "node:fs";

const NATIVE = new URL("../..", import.meta.url).pathname;
const FIX = new URL("./fixtures/", import.meta.url).pathname;
const SAMPLE = Number(process.env.SAMPLE ?? 20);
const PAGE_REFS = (process.env.PAGES ?? "wikipedia-battle-of-borodino.html,wikipedia-battle-of-austerlitz.html,wikipedia-war-of-the-third-coalition.html").split(",");

const { makeRelationReader } = await import(`${NATIVE}/organs/hypergraph.js`);
const { chunkSource, tokenize, blankLabelRows } = await import(`${NATIVE}/organs/source.js`);
const { extractReadable } = await import(`${NATIVE}/organs/web.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import(`${NATIVE}/adapters/text/surfaces.js`);
const { resolvePronouns } = await import(`${NATIVE}/adapters/text/pronouns.js`);
const { discoverRelationVocab, extractRelations } = await import(`${NATIVE}/adapters/text/relations.js`);
const P = await import(`${NATIVE}/adapters/text/priors.js`);
const posPrior = JSON.parse(readFileSync(`${FIX}pos-prior-eng.json`, "utf8"));

const reader = makeRelationReader({
  splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm, discoverRelationVocab, extractRelations, tokenize,
  posPriorFor: () => posPrior,
  determiners: new Set([...P.DEFINITE_DETERMINERS, ...P.INDEFINITE_DETERMINERS]),
  negationWords: P.NEGATION_WORDS,
  blankFurniture: (t) => blankLabelRows(t, { minRun: 4, maxCell: 60 }),
  resolvePronouns, nounPhraseSubjects: true,
});

const norm = (s) => diaNorm(String(s ?? "")).toLowerCase().replace(/\s+/g, " ").trim();
const PRONOUNS = new Set([...P.SUBJECT_PRONOUNS, ...P.ANAPHORIC_PRONOUNS].map(norm));

for (const ref of PAGE_REFS) {
  const text = extractReadable(readFileSync(`${FIX}${ref}`, "utf8")).text;

  // The document's own cast — the SAME organ the reader already runs.
  const surfaces = extractSurfaces(splitSentences(text));
  const known = new Set();
  try { for (const e of discoverReferents(surfaces, {}).events) known.add(norm(e.surface)); } catch { /* reported as an empty cast, never as agreement */ }

  const passages = chunkSource(ref, text);
  const rel = reader(passages, { pool: passages });
  const edges = [];
  for (const p of passages) for (const c of rel.read(String(p.text ?? ""))?.claims ?? []) edges.push(c);

  const buckets = { anchored: [], trimmable: [], castless: [] };
  for (const c of edges) {
    const s = norm(c.end1);
    if (!s) continue;
    if (known.has(s)) { buckets.anchored.push(c); continue; }
    // Contains a known surface, with words to spare. Matched on WORD
    // BOUNDARIES, never as a substring — the first cut used `includes` and
    // reported 47.2% headroom on matches like "art" inside "a quarter of a
    // million soldiers" and "russian" inside "Prussian Baltic". That is the
    // same substring bug this repo has already caught twice (P22's
    // `synthesize` matching `zone` inside `zone-99`), and it inflates the one
    // number this measurement exists to produce.
    const words = s.split(" ");
    let hit = null;
    for (const k of known) {
      const kw = k.split(" ");
      if (kw.length > words.length) continue;
      for (let i = 0; i + kw.length <= words.length; i += 1) {
        let ok = true;
        for (let j = 0; j < kw.length; j += 1) if (words[i + j] !== kw[j]) { ok = false; break; }
        if (ok && (!hit || k.length > hit.length)) hit = k;
      }
    }
    if (hit) {
      // WHERE the cast surface sits decides whether a trim is safe, and the
      // sample says it decides it sharply. A surface at the END means the
      // words before it leaked in ("replace Barclay", "Aftermath Territorial
      // changes French") — cutting the prefix recovers the being. A surface at
      // the START or in the MIDDLE means the span is a longer noun phrase the
      // cast only has a fragment of ("the Battle of Moscow" vs "the battle",
      // "Alexander I" vs "alexander") — and trimming to the fragment is a
      // REGRESSION, not a repair.
      const kw = hit.split(" ");
      const at = words.findIndex((_, i) => kw.every((w, j) => words[i + j] === w));
      const where = at === 0 ? "leading" : at + kw.length === words.length ? "trailing" : "interior";
      buckets.trimmable.push({ c, hit, where });
    } else buckets.castless.push(c);
  }

  const n = edges.length || 1;
  console.log(`\n${ref}`);
  console.log(`  ${edges.length} edges, cast of ${known.size} surfaces`);
  for (const [k, v] of Object.entries(buckets))
    console.log(`    ${k.padEnd(10)} ${String(v.length).padStart(4)}  (${(100 * v.length / n).toFixed(1)}%)`);
  const wh = {};
  for (const t of buckets.trimmable) wh[t.where] = (wh[t.where] ?? 0) + 1;
  console.log(`  trimmable by where the cast surface sits: ${Object.entries(wh).map(([k, v]) => `${k} ${v} (${(100 * v / n).toFixed(1)}%)`).join(", ")}`);
  console.log(`  SAFE HEADROOM (trailing only — the prefix leaked): ${(100 * (wh.trailing ?? 0) / n).toFixed(1)}% of edges`);

  // What the castless bucket actually is decides whether a DIFFERENT lever is
  // the bigger one, so it is broken down rather than left as a residue.
  const cl = buckets.castless;
  const pron = cl.filter((c) => PRONOUNS.has(norm(c.end1))).length;
  const short = cl.filter((c) => norm(c.end1).split(" ").length <= 2).length;
  console.log(`    castless breakdown: ${pron} pronoun subjects, ${short} of two words or fewer, ${cl.length - pron} not a bare pronoun`);

  console.log(`\n  TRIMMABLE, first ${Math.min(SAMPLE, buckets.trimmable.length)} — what a cast-consulting extractor would cut to:`);
  for (const { c, hit, where } of buckets.trimmable.filter((t) => t.where === "trailing").slice(0, SAMPLE))
    console.log(`    [${where}] <<${c.end1}>>  --${c.label}->  ...  cut to: <<${hit}>>`);
  console.log(`\n  CASTLESS, first ${Math.min(8, cl.length)} — beyond this lever:`);
  for (const c of cl.slice(0, 8)) console.log(`    <<${c.end1}>>  --${c.label}->  <<${String(c.end2).slice(0, 50)}>>`);
}
