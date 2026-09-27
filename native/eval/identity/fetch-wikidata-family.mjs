// fetch-wikidata-family.mjs — crawl a real family network from Wikidata
// Special:EntityData (the cached page, not the rate-limited API), one request
// every PAUSE_MS, and keep a compact assertion record per person plus the
// property constraints that say which relations are single-valued.
//   node fetch-wikidata-family.mjs <seedQID> <maxPersons> <out.json>
import { writeFileSync } from "node:fs";
const [SEED = "Q7243", MAX = "70", OUT] = process.argv.slice(2);
const PAUSE_MS = 1500;
const UA = "eoreader7-identity-eval/0.1 (research crawl, one request per 1.5s)";
const FOLLOW = ["P22", "P25", "P26", "P40", "P3373"]; // father, mother, spouse, child, sibling
const KEEP = ["P31", "P21", "P569", "P570", "P19", "P20", "P22", "P25", "P26", "P40", "P3373", "P106", "P27", "P735", "P734", "P1038"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function entity(id) {
  for (let i = 0; i < 4; i += 1) {
    const r = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, { headers: { "User-Agent": UA } });
    if (r.ok) return Object.values((await r.json()).entities)[0];
    await sleep(PAUSE_MS * 2 ** (i + 1));
  }
  throw new Error(`${id}: fetch failed`);
}
const value = (snak) => {
  const v = snak?.datavalue?.value; if (v == null) return null;
  if (v.id) return { item: v.id };
  if (v.time) return { time: v.time, precision: v.precision, calendar: v.calendarmodel?.split("/").pop() };
  return { other: JSON.stringify(v).slice(0, 80) };
};
const people = {}; const queue = [SEED]; const seen = new Set();
while (queue.length && Object.keys(people).length < Number(MAX)) {
  const id = queue.shift(); if (seen.has(id)) continue; seen.add(id);
  const e = await entity(id); await sleep(PAUSE_MS);
  const claims = {};
  for (const p of KEEP) for (const c of e.claims?.[p] ?? []) {
    const v = value(c.mainsnak); if (!v) continue;
    (claims[p] ??= []).push({ ...v, rank: c.rank, id: c.id, refs: (c.references ?? []).length });
  }
  if (!(claims.P31 ?? []).some((v) => v.item === "Q5")) continue; // humans only
  people[id] = { label: { en: e.labels?.en?.value ?? null, ru: e.labels?.ru?.value ?? null }, claims };
  for (const p of FOLLOW) for (const v of claims[p] ?? []) if (v.item && !seen.has(v.item)) queue.push(v.item);
  console.error(`${Object.keys(people).length}: ${id} ${people[id].label.en} / ${people[id].label.ru}`);
}
// the constraints: which properties Wikidata itself declares single-valued
const constraints = {};
for (const p of KEEP) {
  const e = await entity(p); await sleep(PAUSE_MS);
  constraints[p] = { label: e.labels?.en?.value, types: (e.claims?.P2302 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) };
}
writeFileSync(OUT, JSON.stringify({ schema: "EOWikidataFamily@1", giver: `wikidata.org Special:EntityData, crawled from ${SEED} along ${FOLLOW.join("/")}`, keep: KEEP, constraints, people }));
console.error(`done: ${Object.keys(people).length} people`);
