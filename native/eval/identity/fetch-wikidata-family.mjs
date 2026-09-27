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
const value = (snak) => {
  const v = snak?.datavalue?.value; if (v == null) return null;
  if (v.id) return { item: v.id };
  if (v.time) return { time: v.time, precision: v.precision, calendar: v.calendarmodel?.split("/").pop() };
  return { other: JSON.stringify(v).slice(0, 80) };
};
const people = {}, failed = []; const queue = [SEED]; const seen = new Set(); const retrievedAt = new Date().toISOString();
while (queue.length && Object.keys(people).length < Number(MAX)) {
  const id = queue.shift(); if (seen.has(id)) continue; seen.add(id);
  const e = await entity(id); await sleep(PAUSE_MS);
  if (e.failed) { failed.push(e.failed); continue; }
  const claims = {};
  for (const p of KEEP) for (const c of e.claims?.[p] ?? []) {
    const v = value(c.mainsnak); if (!v) continue;
    (claims[p] ??= []).push({ ...v, rank: c.rank, id: c.id, refs: (c.references ?? []).length, references: refsOf(c) });
  }
  if (!(claims.P31 ?? []).some((v) => v.item === "Q5")) continue; // humans only
  people[id] = { label: { en: e.labels?.en?.value ?? null, ru: e.labels?.ru?.value ?? null }, lastrevid: e.lastrevid ?? null, claims };
  for (const p of FOLLOW) for (const v of claims[p] ?? []) if (v.item && !seen.has(v.item)) queue.push(v.item);
  console.error(`${Object.keys(people).length}: ${id} ${people[id].label.en} / ${people[id].label.ru}`);
}
// the constraints: which properties Wikidata itself declares single-valued
const constraints = {};
for (const p of KEEP) {
  const e = await entity(p); await sleep(PAUSE_MS);
  constraints[p] = e.failed ? { label: null, types: null, gap: "fetch_failed", failed: e.failed } : { label: e.labels?.en?.value, lastrevid: e.lastrevid ?? null, types: (e.claims?.P2302 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean) };
}
writeFileSync(OUT, JSON.stringify({ schema: "EOWikidataFamily@1", giver: `wikidata.org Special:EntityData, crawled from ${SEED} along ${FOLLOW.join("/")}`, retrievedAt, failed, keep: KEEP, constraints, people }));
console.error(`done: ${Object.keys(people).length} people`);
