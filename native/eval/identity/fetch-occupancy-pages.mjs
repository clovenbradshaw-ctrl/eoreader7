// fetch-occupancy-pages.mjs — the held-out material and its ITEM-level key
// for occupancy-host-eval.mjs (2026-09-28). Fetched once, committed, so the
// run reproduces from the repo alone (P95: an untracked fixture is a run
// nobody can repeat).
//   material  rest_v1/page/html -> wikiBody(): body prose + hyperlink spans
//   (2026-09-28, on direction — "stop focusing on Wikidata": the item-level
//   key this script first fetched is dropped; the material is the ground.)
// Heimdall's crossing rules: one request per 1.2s, a named User-Agent.
import { writeFileSync, existsSync, readFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { wikiBody } = await import(`${NATIVE}/eval/identity/lib/wiki-body.mjs`);
export const HELD_OUT = ["Joachim Murat", "Mikhail Kutuzov", "Hannibal Hamlin", "Andrew Johnson", "Angela Merkel", "John Roberts", "William Rehnquist", "Pope Benedict XVI", "Tim Cook", "Satya Nadella", "Alex Ferguson", "Pep Guardiola", "Lawrence Summers"];
const OUT = new URL("./fixtures/occupancy-pages.json", import.meta.url);
const UA = "eoreader7-identity-eval/0.1 (research; one request per 1.2s)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 5; i += 1) {
    try { const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(45000) }); await sleep(1200); if (r.ok) return r.text(); const w = Number(r.headers.get("retry-after")); await sleep(Number.isFinite(w) && w > 0 ? w * 1000 : 3000 * 2 ** i); }
    catch { await sleep(3000 * 2 ** i); }
  }
  throw new Error(`fetch failed: ${url}`);
}
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { schema: "EOOccupancyPages@1", giver: "en.wikipedia.org rest_v1/page/html, body prose with hyperlink spans (lib/wiki-body.mjs)", retrievedAt: new Date().toISOString(), pages: {} };
for (const title of HELD_OUT) {
  if (out.pages[title]) continue;
  out.pages[title] = wikiBody(await get(`https://en.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(title.replace(/ /g, "_"))}`));
  console.log(title, out.pages[title].text.length, out.pages[title].links.length);
  writeFileSync(OUT, JSON.stringify(out));
}
console.log("done", Object.keys(out.pages).length, "pages");
