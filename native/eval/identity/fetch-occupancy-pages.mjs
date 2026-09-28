// fetch-occupancy-pages.mjs — the held-out material and its ITEM-level key
// for occupancy-host-eval.mjs (2026-09-28). Fetched once, committed, so the
// run reproduces from the repo alone (P95: an untracked fixture is a run
// nobody can repeat).
//   material  rest_v1/page/html -> wikiBody(): body prose + hyperlink spans
//   ostension each page's own Wikidata item (pageprops.wikibase_item) and
//             every link target's item (redirects followed)
//   key       for every linked or page item that is a human (P31 Q5): its
//             P39 statements with their P642 ("of") qualifier; for every P39
//             position: its P1001 (applies to jurisdiction)
// Heimdall's crossing rules: one request per 1.2s, a named User-Agent.
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { wikiBody } = await import(`${NATIVE}/eval/identity/lib/wiki-body.mjs`);
export const HELD_OUT = ["Joachim Murat", "Mikhail Kutuzov", "Hannibal Hamlin", "Andrew Johnson", "Angela Merkel", "John Roberts", "William Rehnquist", "Pope Benedict XVI", "Tim Cook", "Satya Nadella", "Alex Ferguson", "Pep Guardiola", "Lawrence Summers"];
const OUT = new URL("./fixtures/occupancy-pages.json", import.meta.url);
const UA = "eoreader7-identity-eval/0.1 (research; one request per 1.2s)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, json = true) {
  for (let i = 0; i < 5; i += 1) {
    try { const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) }); await sleep(1200); if (r.ok) return json ? r.json() : r.text(); const w = Number(r.headers.get("retry-after")); await sleep(Number.isFinite(w) && w > 0 ? w * 1000 : 3000 * 2 ** i); }
    catch { await sleep(3000 * 2 ** i); }
  }
  throw new Error(`fetch failed: ${url}`);
}
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { schema: "EOOccupancyPages@1", giver: "en.wikipedia.org rest_v1/page/html + action=query pageprops; wikidata.org wbgetentities (P31, P39+P642, P1001)", retrievedAt: new Date().toISOString(), pages: {}, items: {}, titleItem: {} };
const qidsOf = async (titles) => {
  const need = [...new Set(titles)].filter((t) => !(t in out.titleItem));
  for (let i = 0; i < need.length; i += 50) {
    const batch = need.slice(i, i + 50);
    const j = await get(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&titles=${encodeURIComponent(batch.join("|"))}`);
    const norm = new Map((j.query?.normalized ?? []).map((n) => [n.from, n.to]));
    const redir = new Map((j.query?.redirects ?? []).map((n) => [n.from, n.to]));
    const byTitle = new Map(Object.values(j.query?.pages ?? {}).map((p) => [p.title, p.pageprops?.wikibase_item ?? null]));
    for (const t of batch) { let x = norm.get(t) ?? t; x = redir.get(x) ?? x; out.titleItem[t] = byTitle.get(x) ?? null; }
  }
};
for (const title of HELD_OUT) {
  if (!out.pages[title]) {
    const html = await get(`https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title.replace(/ /g, "_"))}`, false);
    out.pages[title] = wikiBody(html);
    console.log(title, out.pages[title].text.length, out.pages[title].links.length);
  }
  await qidsOf([title, ...out.pages[title].links.map((l) => l.title)]);
  writeFileSync(OUT, JSON.stringify(out));
}
// the key: humans among page + linked items, their P39, the positions' P1001
const itemsNeeded = new Set(HELD_OUT.map((t) => out.titleItem[t]).filter(Boolean));
for (const t of HELD_OUT) for (const l of out.pages[t].links) if (out.titleItem[l.title]) itemsNeeded.add(out.titleItem[l.title]);
console.log("items to classify", itemsNeeded.size);
// wbgetentities, 50 ids a request (the same entities Special:EntityData serves)
const entities = async (ids) => {
  const got = {};
  for (let i = 0; i < ids.length; i += 50) {
    const j = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&props=labels|claims|info&languages=en&format=json&ids=${ids.slice(i, i + 50).join("|")}`);
    Object.assign(got, j.entities ?? {});
    if (i % 500 === 0) console.log("entities", i, "/", ids.length);
  }
  return got;
};
const todo = [...itemsNeeded].filter((q) => !out.items[q]);
for (const [q, e] of Object.entries(await entities(todo))) {
  const human = (e.claims?.P31 ?? []).some((c) => c.mainsnak?.datavalue?.value?.id === "Q5");
  out.items[q] = { label: e.labels?.en?.value ?? null, human, lastrevid: e.lastrevid ?? null };
  if (human) out.items[q].P39 = (e.claims?.P39 ?? []).map((c) => ({ position: c.mainsnak?.datavalue?.value?.id ?? null, of: (c.qualifiers?.P642 ?? []).map((x) => x.datavalue?.value?.id).filter(Boolean) })).filter((s) => s.position);
}
writeFileSync(OUT, JSON.stringify(out));
const positions = [...new Set(Object.values(out.items).flatMap((i) => (i.P39 ?? []).map((s) => s.position)))];
out.positions = out.positions ?? {};
for (const [q, e] of Object.entries(await entities(positions.filter((q) => !out.positions[q])))) out.positions[q] = { label: e.labels?.en?.value ?? null, P1001: (e.claims?.P1001 ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean), lastrevid: e.lastrevid ?? null };
writeFileSync(OUT, JSON.stringify(out));
console.log("done", Object.keys(out.items).length, "items", Object.keys(out.positions).length, "positions");
