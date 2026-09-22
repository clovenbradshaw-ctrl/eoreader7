// Live probe of stage 3 on the real web, a few calls only.
import { declareVoidSpec } from "../../the-fold/void-spec.js";
import { surf, surfLines, liveWeb } from "../../the-fold/surf.js";
import fs from "node:fs";
const web = liveWeb();
const out = {};
for (const task of process.argv.slice(2)) {
  const spec = declareVoidSpec({ task });
  const t0 = Date.now();
  const s = await surf({ spec, search: web.search, fetch: web.fetch, perQuery: 5, maxSources: 4 });
  console.log(`\n=== ${task} (${Math.round((Date.now() - t0) / 1000)}s) ===\n${s.basis}\n${surfLines(s).join("\n")}`);
  out[task] = { ...s, sources: s.sources.map((x) => ({ ...x, text: x.text.slice(0, 4000) })) };
}
fs.writeFileSync(new URL("./results/nine-stages-2026-09-22/surf-live.json", import.meta.url), JSON.stringify(out, null, 2));
