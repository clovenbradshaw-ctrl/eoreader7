// app-variants.mjs — one set of verified leaves, many apps: the axes of a variant matrix.
//
// A generated app is a cell of a tensor whose axes are the things that can change without a
// model being asked anything new:
//   layout    which comp's arrangement the page follows (each comp is a spec; the binding tables are the same)
//   theme     the comp's own polarity, or the other one
//   place     what the page opens on
//   fuel      with the fuel section (from the fuel comp) or without
// The units a variant needs are the verified leaves, found by contract hash — so the marginal cost of
// another cell is zero model calls and the time it takes to write a few files. The cost of a REVISION
// (a changed contract) is one leaf re-drawn: everything else is a cache hit, re-tested.
//
//   variantMatrix(axes) -> [{ id, layout, theme, place, fuel }]     the full cross product, stable order
//   buildVariants({ root, axes, units, specs, provenance }) -> { cells:[{ id, axes, ok, bytes, htmlSha, dir, gap }] }
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { assembleApp } from "./app-assemble.mjs";

const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function variantMatrix({ layout = ["default"], theme = [null], place = ["London"], fuel = [true] } = {}) {
  const out = [];
  for (const l of layout) for (const t of theme) for (const p of place) for (const f of fuel) out.push({ id: [slug(l), t ?? "comp", slug(p), f ? "fuel" : "nofuel"].join("_"), layout: l, theme: t, place: p, fuel: f });
  return out;
}

/** specs: { [layoutId]: { weather: EOCompSpec, fuel: EOCompSpec|null } } */
export function buildVariants({ root, axes, units, specs, provenance = {}, appName = "Weather & Fuel" }) {
  const cells = [];
  for (const v of variantMatrix(axes)) {
    const s = specs[v.layout];
    if (!s) { cells.push({ id: v.id, axes: v, ok: false, gap: { type: "no_spec", layout: v.layout } }); continue; }
    const dir = path.join(root, v.id);
    const r = assembleApp({ outDir: dir, appName, weatherSpec: s.weather, fuelSpec: v.fuel ? s.fuel : null, units, theme: v.theme, defaultPlace: v.place, provenance: { ...provenance, variant: v } });
    if (!r.ok) { cells.push({ id: v.id, axes: v, ok: false, gap: r.gap }); continue; }
    const html = fs.readFileSync(path.join(dir, "index.html"));
    cells.push({ id: v.id, axes: v, ok: true, dir, bytes: html.length, htmlSha: sha(html).slice(0, 12), accent: r.theme.accent, scheme: r.theme.scheme, gaps: { weather: r.binding.weather.gaps.length, fuel: r.binding.fuel?.gaps.length ?? null } });
  }
  return { cells, distinctPages: new Set(cells.filter((c) => c.ok).map((c) => c.htmlSha)).size };
}
