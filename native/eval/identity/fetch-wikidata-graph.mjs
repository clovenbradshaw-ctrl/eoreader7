// fetch-wikidata-graph.mjs — a MIXED-KIND graph from Wikidata Special:EntityData:
// breadth-first from seeds along every item-valued property, every claim kept
// (item, time, quantity), so referents of arbitrary kinds (people, places,
// works, occupations, awards...) arrive with whatever relations they carry.
// P31 is kept ONLY as a held-out oracle for kind; the property constraints are
// kept ONLY as a held-out oracle for single-valuedness. One request per 1.5s.
//   node fetch-wikidata-graph.mjs <out.json> <maxEntities> <seed...>
import { writeFileSync } from "node:fs";
const [OUT, MAX = "220", ...SEEDS] = process.argv.slice(2);
const PAUSE_MS = 1500, UA = "eoreader7-identity-eval/0.1 (research crawl, one request per 1.5s)";
// kind links are held out; Wikimedia-internal links (focus lists, categories,
// templates, maintenance) lead into the project's own bookkeeping, not the world
const NO_FOLLOW = new Set(["P31", "P279", "P5008", "P910", "P1151", "P1424", "P7084", "P6104", "P8989", "P1343", "P361", "P5125"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// HEIMDALL'S RULES FOR A CROSSING (archon review 2026-09-27): a breakdown is
// recorded, never assumed. 404/410 is a typed miss (no retry); 429/503 honour
// Retry-After; every request times out; a failure returns { failed } so the
// caller records it — never null standing in for "nothing there".
async function entity(id) {
  for (let i = 0; i < 4; i += 1) {
    let r;
    try { r = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) }); }
    catch (err) { if (i === 3) return { failed: { id, status: "network", detail: String(err?.name ?? err) } }; await sleep(PAUSE_MS * 2 ** (i + 1)); continue; }
    if (r.ok) return Object.values((await r.json()).entities)[0];
    if (r.status === 404 || r.status === 410) return { failed: { id, status: r.status } };
    const wait = Number(r.headers.get("retry-after"));
    await sleep(Number.isFinite(wait) && wait > 0 ? wait * 1000 : PAUSE_MS * 2 ** (i + 1));
    if (i === 3) return { failed: { id, status: r.status } };
  }
}
// RANKE: keep what a reference cites (stated in, URL, retrieved), never just
// a count — a count is the index's claim that a source exists; these are the
// leads a later pass can chase.
const refsOf = (c) => (c.references ?? []).map((r) => ({ statedIn: r.snaks?.P248?.[0]?.datavalue?.value?.id ?? null, url: r.snaks?.P854?.[0]?.datavalue?.value ?? null, retrieved: r.snaks?.P813?.[0]?.datavalue?.value?.time ?? null }));
const value = (s) => { const v = s?.datavalue?.value; if (v == null) return null;
  if (v.id) return { item: v.id };
  if (v.time) return { time: v.time, precision: v.precision, calendar: v.calendarmodel?.split("/").pop() };
  if (v.amount) return { amount: v.amount, unit: v.unit?.split("/").pop() };
  return null; };
const entities = {}, props = new Set(), failed = []; const retrievedAt = new Date().toISOString(); const queue = SEEDS.map((s) => [s, 0]); const seen = new Set();
while (queue.length && Object.keys(entities).length < Number(MAX)) {
  const [id, depth] = queue.shift(); if (seen.has(id)) continue; seen.add(id);
  const e = await entity(id); await sleep(PAUSE_MS); if (e.failed) { failed.push(e.failed); continue; }
  const claims = {};
  for (const [p, cs] of Object.entries(e.claims ?? {})) for (const c of cs) {
    if (c.rank === "deprecated") continue; const v = value(c.mainsnak); if (!v) continue;
    // the TIME a value holds — start / end / point-in-time qualifiers — so a
    // parameter that changes (spouse, residence, office) can be told from one
    // that contradicts itself
    const q = (k) => value(c.qualifiers?.[k]?.[0]);
    const when = { from: q("P580")?.time ?? null, to: q("P582")?.time ?? null, at: q("P585")?.time ?? null };
    (claims[p] ??= []).push({ ...v, refs: (c.references ?? []).length, references: refsOf(c), ...(when.from || when.to || when.at ? { when } : {}) }); props.add(p);
  }
  entities[id] = { label: { en: e.labels?.en?.value ?? null, ru: e.labels?.ru?.value ?? null }, lastrevid: e.lastrevid ?? null, claims };
  if (depth < 2) for (const [p, vs] of Object.entries(claims)) if (!NO_FOLLOW.has(p)) for (const v of vs) if (v.item && !seen.has(v.item)) queue.push([v.item, depth + 1]);
  console.error(`${Object.keys(entities).length} d${depth} ${id} ${entities[id].label.en ?? entities[id].label.ru}`);
}
const constraints = {}; let i = 0;
for (const p of props) { const e = await entity(p); await sleep(PAUSE_MS); i += 1;
  // a failed constraint fetch is a GAP in the held-out oracle — never the
  // shape of "no single-value constraint" (types: [] would read as many-valued)
  constraints[p] = e.failed ? { label: null, types: null, gap: "fetch_failed", failed: e.failed } : { label: e.labels?.en?.value ?? null, lastrevid: e.lastrevid ?? null, types: (e.claims?.P2302 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) };
  if (i % 25 === 0) console.error(`constraints ${i}/${props.size}`); }
writeFileSync(OUT, JSON.stringify({ schema: "EOWikidataGraph@1", giver: `wikidata.org Special:EntityData, BFS depth 2 from ${SEEDS.join(",")}`, retrievedAt, failed, heldOut: { kind: "P31", functional: "P2302 single-value constraints" }, constraints, entities }));
console.error(`done: ${Object.keys(entities).length} entities, ${props.size} properties, ${failed.length} failed entities, ${Object.values(constraints).filter((c) => c.gap).length} failed constraint fetches`);
