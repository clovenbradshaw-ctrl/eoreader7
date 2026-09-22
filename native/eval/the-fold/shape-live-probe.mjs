import { declareVoidSpec } from "../../the-fold/void-spec.js";
import { liveWeb } from "../../the-fold/surf.js";
import { surfForShape, shapeLines, matchShape } from "../../the-fold/shape.js";
import fs from "node:fs";
const web = liveWeb();
const out = {};
for (const task of process.argv.slice(2)) {
  const spec = declareVoidSpec({ task });
  const t0 = Date.now();
  const r = await surfForShape({ spec, web, rounds: 2 });
  console.log(`\n=== ${task} (${Math.round((Date.now() - t0) / 1000)}s, ${r.rounds} round(s)) ===\n${r.surfed.basis}\nSHAPE: ${r.shape.basis}\n${shapeLines(r.shape).join("\n")}`);
  out[task] = { rounds: r.rounds, surf: r.surfed.basis, sources: r.surfed.sources.map((s) => ({ host: s.host, url: s.url, status: s.status, chars: s.chars, headings: (s.headings ?? []).slice(0, 40) })), shape: r.shape };
}
fs.writeFileSync(new URL("./results/nine-stages-2026-09-22/shape-live.json", import.meta.url), JSON.stringify(out, null, 2));
