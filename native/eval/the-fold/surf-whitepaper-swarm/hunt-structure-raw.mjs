import { elementsOf } from "../../../the-fold/medium.js";
import { surf, liveWeb } from "../../../the-fold/surf.js";
import { hostOf } from "../../../organs/web.js";

const topic = "white paper";
const w = liveWeb();
const queries = [
  { hunt: "structure", q: `how to write a ${topic} structure sections`, basis: "real external structural guides" },
  { hunt: "structure", q: `${topic} format template sections example`, basis: "alternate phrasing" },
];
const s = await surf({ spec: {}, search: w.search, fetch: w.fetch, queries, maxSources: 8 });

for (const src of s.sources) {
  if (src.status !== "fetched" || !src.chars) { console.log(`SKIP ${src.status} ${src.url}`); continue; }
  const headings = elementsOf(src.text).elements.filter((e) => e.cls === "heading" && e.text);
  console.log(`\n=== ${hostOf(src.url)} (${src.url}) — ${headings.length} headings ===`);
  for (const h of headings) console.log(`  - ${h.text}`);
}
