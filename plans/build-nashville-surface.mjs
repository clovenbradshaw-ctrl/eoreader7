// build-nashville-surface.mjs — resolve every ledger ref against the retained
// ground, stamp resolved/unresolved per row, render the surface to nashville.html.
// An unresolvable ref renders as a red badge, never as content.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveSnippet } from "../cli/holograph.mjs";
import { renderPlanSurface } from "../native/organs/plans/render.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NASH = join(HERE, "nashville");
const GROUND = join(NASH, "ground");

const manifest = JSON.parse(readFileSync(join(NASH, "manifest.json"), "utf8"));
const def = JSON.parse(readFileSync(join(NASH, "nashville.surfacedef.json"), "utf8"));
const rows = readFileSync(join(NASH, "ledger", "plans-nashville.jsonl"), "utf8")
  .trim().split("\n").filter(Boolean).map(JSON.parse);
const metrics = JSON.parse(readFileSync(join(NASH, "metrics", "metrics-nashville.json"), "utf8"));

const docs = manifest.docs.map((d) => {
  const sidecar = JSON.parse(readFileSync(join(GROUND, `${d.id}.txt.provenance.json`), "utf8"));
  return {
    id: d.id, title: sidecar.title, category: d.category, scale: d.scale,
    publisher: sidecar.publisher, adopted: sidecar.adopted, license: sidecar.license,
    url: sidecar.url, chars: sidecar.chars, pages: sidecar.pages,
    pdf_sha256: sidecar.pdf_sha256, txt_sha256: sidecar.txt_sha256,
    extraction: sidecar.extraction?.mode,
  };
});

const resolved = {};
let unresolved = 0;
for (const r of rows) {
  const ref = `${r.doc}#${r.at[0]}-${r.at[1]}`;
  const s = resolveSnippet(ref, [HERE]);
  const ok = !!(s && s.resolved && s.verbatim && s.verbatim === r.verbatim);
  resolved[r.id] = ok;
  if (!ok) { unresolved++; console.log("UNRESOLVED", r.id, r.verbatim.slice(0, 60)); }
}

const html = renderPlanSurface({ def, docs, rows, metrics, resolved });

writeFileSync(join(NASH, "nashville.html"), html);
console.log(`rendered ${join(NASH, "nashville.html")}`);
console.log(`  rows: ${rows.length}  resolved: ${Object.values(resolved).filter(Boolean).length}  unresolved: ${unresolved}  metrics: ${metrics.length}`);