// eval/fetch-succession.mjs — widen the succession material by crawling
// P1365/P1366 outward from the committed 23 seeds, writing NEW fixture files
// in the SAME two shapes (tenures for the derivation, terms for the oracle —
// one Special:EntityData page per entity, different properties read into
// each file). The committed 23-entity fixtures are never modified: P60 and
// the first oracle run were measured on them and must stay reproducible.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED = JSON.parse(fs.readFileSync(path.join(HERE, "fixtures", "succession-tenures.json"), "utf8"));
const HOPS = Number(process.env.HOPS ?? 2), CAP = Number(process.env.CAP ?? 160);
const RETRIEVED = new Date().toISOString().slice(0, 10);

const tenures = {}, terms = {};
for (const [q, e] of Object.entries(SEED.entities)) { tenures[q] = e; terms[q] = { label: e.label, terms: {} }; for (const t of e.tenures) (terms[q].terms[t.office] ??= []).push({ start: t.start, end: t.end }); }

const timeOf = (qual) => qual?.[0]?.datavalue?.value?.time ?? null;
const itemOf = (qual) => qual?.[0]?.datavalue?.value?.id ?? null;
async function fetchEntity(q) {
  const res = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${q}.json`, { headers: { "user-agent": "the-fold succession crawl (research; contact via repo)" } });
  if (!res.ok) return null;
  const ent = (await res.json()).entities?.[q];
  if (!ent) return null;
  const label = ent.labels?.en?.value ?? q;
  const rows = [];
  for (const c of ent.claims?.P39 ?? []) {
    const office = c.mainsnak?.datavalue?.value?.id; if (!office) continue;
    const qs = c.qualifiers ?? {};
    rows.push({ office, start: timeOf(qs.P580), end: timeOf(qs.P582), replaces: itemOf(qs.P1365), replacedBy: itemOf(qs.P1366) });
  }
  return { label, tenures: rows };
}

let frontier = new Set();
for (const e of Object.values(tenures)) for (const t of e.tenures) for (const x of [t.replaces, t.replacedBy]) if (x && !tenures[x]) frontier.add(x);
let fetched = 0;
for (let hop = 1; hop <= HOPS && frontier.size && Object.keys(tenures).length < CAP; hop++) {
  const next = new Set();
  for (const q of frontier) {
    if (tenures[q] || Object.keys(tenures).length >= CAP) continue;
    const e = await fetchEntity(q); fetched += 1;
    await new Promise((r) => setTimeout(r, 250)); // polite
    if (!e) continue;
    tenures[q] = e; terms[q] = { label: e.label, terms: {} };
    for (const t of e.tenures) { (terms[q].terms[t.office] ??= []).push({ start: t.start, end: t.end }); for (const x of [t.replaces, t.replacedBy]) if (x && !tenures[x]) next.add(x); }
  }
  console.log(`hop ${hop}: fetched ${fetched}, entities ${Object.keys(tenures).length}, frontier ${next.size}`);
  frontier = next;
}
const giver = `wikidata.org Special:EntityData, retrieved ${RETRIEVED} — 2-hop crawl along P1365/P1366 from the committed 23 seeds; P39 statements with P580/P582 and P1365/P1366 qualifiers`;
fs.writeFileSync(path.join(HERE, "fixtures", "succession-tenures-wide.json"), JSON.stringify({ schema: "EOTenureMaterial@1", giver, purpose: SEED.purpose, note: "WIDE set; the committed 23-entity file is untouched", entities: tenures }, null, 1));
fs.writeFileSync(path.join(HERE, "fixtures", "succession-terms-wide.json"), JSON.stringify({ giver: giver.replace("P1365/P1366 qualifiers", "P580 start / P582 end"), independence: "the oracle reads P580/P582 only; the derivation reads P1365/P1366 and tenure indices only — same pages, different properties", entities: terms }, null, 1));
console.log(`wrote ${Object.keys(tenures).length} entities to succession-{tenures,terms}-wide.json`);
