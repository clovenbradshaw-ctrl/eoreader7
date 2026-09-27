// fetch-property-classes.mjs — how WIKIDATA ITSELF classifies each property
// (P31 of the property entity) and each class's superclass chain (P279*), so
// "which relations are bookkeeping, not the world" is read from the giver's
// own typing, never from a hand-typed list. Heimdall's crossing rules: typed
// failures recorded, Retry-After honoured, timeouts, retrievedAt.
//   node fetch-property-classes.mjs <graph.json> <out.json> [maxDepth=4]
import { readFileSync, writeFileSync } from "node:fs";
const [GRAPH, OUT, DEPTH = "4"] = process.argv.slice(2);
const PAUSE_MS = 1500, UA = "eoreader7-identity-eval/0.1 (research crawl, one request per 1.5s)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function entity(id) {
  for (let i = 0; i < 4; i += 1) {
    let r;
    try { r = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) }); }
    catch (err) { if (i === 3) return { failed: { id, status: "network" } }; await sleep(PAUSE_MS * 2 ** (i + 1)); continue; }
    if (r.ok) return Object.values((await r.json()).entities)[0];
    if (r.status === 404 || r.status === 410) return { failed: { id, status: r.status } };
    const wait = Number(r.headers.get("retry-after")); await sleep(Number.isFinite(wait) && wait > 0 ? wait * 1000 : PAUSE_MS * 2 ** (i + 1));
    if (i === 3) return { failed: { id, status: r.status } };
  }
}
const ids = (e, p) => (e.claims?.[p] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
const g = JSON.parse(readFileSync(GRAPH, "utf8"));
const properties = {}, classes = {}, failed = []; const retrievedAt = new Date().toISOString();
const queue = [];
for (const p of Object.keys(g.constraints)) {
  const e = await entity(p); await sleep(PAUSE_MS);
  if (e.failed) { failed.push(e.failed); properties[p] = { gap: "fetch_failed" }; continue; }
  properties[p] = { label: e.labels?.en?.value ?? null, lastrevid: e.lastrevid ?? null, classes: ids(e, "P31") };
  for (const c of properties[p].classes) queue.push([c, 0]);
}
while (queue.length) {
  const [c, d] = queue.shift(); if (classes[c] || d > Number(DEPTH)) continue;
  const e = await entity(c); await sleep(PAUSE_MS);
  if (e.failed) { failed.push(e.failed); classes[c] = { gap: "fetch_failed" }; continue; }
  classes[c] = { label: e.labels?.en?.value ?? null, subclassOf: ids(e, "P279") };
  for (const s of classes[c].subclassOf) queue.push([s, d + 1]);
  if (Object.keys(classes).length % 25 === 0) console.error(`classes ${Object.keys(classes).length}`);
}
writeFileSync(OUT, JSON.stringify({ schema: "EOWikidataPropertyClasses@1", giver: "wikidata.org Special:EntityData: P31 of each property, P279 chain of each class", retrievedAt, failed, properties, classes }));
console.error(`done: ${Object.keys(properties).length} properties, ${Object.keys(classes).length} classes, ${failed.length} failed`);
