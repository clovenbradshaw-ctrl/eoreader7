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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function entity(id) {
  for (let i = 0; i < 4; i += 1) {
    const r = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, { headers: { "User-Agent": UA } });
    if (r.ok) return Object.values((await r.json()).entities)[0];
    await sleep(PAUSE_MS * 2 ** (i + 1));
  }
  return null;
}
const value = (s) => { const v = s?.datavalue?.value; if (v == null) return null;
  if (v.id) return { item: v.id };
  if (v.time) return { time: v.time, precision: v.precision, calendar: v.calendarmodel?.split("/").pop() };
  if (v.amount) return { amount: v.amount, unit: v.unit?.split("/").pop() };
  return null; };
const entities = {}, props = new Set(); const queue = SEEDS.map((s) => [s, 0]); const seen = new Set();
while (queue.length && Object.keys(entities).length < Number(MAX)) {
  const [id, depth] = queue.shift(); if (seen.has(id)) continue; seen.add(id);
  const e = await entity(id); await sleep(PAUSE_MS); if (!e) continue;
  const claims = {};
  for (const [p, cs] of Object.entries(e.claims ?? {})) for (const c of cs) {
    if (c.rank === "deprecated") continue; const v = value(c.mainsnak); if (!v) continue;
    (claims[p] ??= []).push({ ...v, refs: (c.references ?? []).length }); props.add(p);
  }
  entities[id] = { label: { en: e.labels?.en?.value ?? null, ru: e.labels?.ru?.value ?? null }, claims };
  if (depth < 2) for (const [p, vs] of Object.entries(claims)) if (p !== "P31" && p !== "P279") for (const v of vs) if (v.item && !seen.has(v.item)) queue.push([v.item, depth + 1]);
  console.error(`${Object.keys(entities).length} d${depth} ${id} ${entities[id].label.en ?? entities[id].label.ru}`);
}
const constraints = {}; let i = 0;
for (const p of props) { const e = await entity(p); await sleep(PAUSE_MS); i += 1;
  constraints[p] = { label: e?.labels?.en?.value ?? null, types: (e?.claims?.P2302 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) };
  if (i % 25 === 0) console.error(`constraints ${i}/${props.size}`); }
writeFileSync(OUT, JSON.stringify({ schema: "EOWikidataGraph@1", giver: `wikidata.org Special:EntityData, BFS depth 2 from ${SEEDS.join(",")}`, heldOut: { kind: "P31", functional: "P2302 single-value constraints" }, constraints, entities }));
console.error(`done: ${Object.keys(entities).length} entities, ${props.size} properties`);
