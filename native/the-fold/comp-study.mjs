// ═══ LOVELACE · TEACH IT TO FISH ═══ STUDY MANY COMPS, THEN REASON OVER THEM — the image-to-HTML converter fed by a harvest instead of one picture.
//   node native/the-fold/comp-study.mjs --need "air quality" --out <dir> [--keep 6]
// Cultivating (comp-research.mjs, robots- and license-aware, every page and image on the seen-ledger) finds candidate screenshots for the need; each kept comp is read by the
// eye (adapters/image/comp-detect.py) and the structural reader (organs/comp-read.js, no subject matter in it); then the SPECS are reasoned over together
// (organs/comp-consensus.js): what recurs across comps is the layout the pattern asks for, what appears in one comp is that comp's own and is left out.
// Nothing is copied: a spec carries structure (zone kinds, order, counts, roles, a palette), never pixels, brand text or images (likenessOf is the check).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compSpecOf } from "../organs/comp-read.js";
import { researchComps } from "./comp-research.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), ADAPTERS = path.join(here, "..", "adapters", "image");
const pyJson = (python, script, args) => JSON.parse(execFileSync(python, [script, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 240000 }));

export async function studyComps({ need, out, keep = 6, python = process.env.VISUAL_DETECT_PYTHON, queries = null, log = () => {} }) {
  fs.mkdirSync(out, { recursive: true });
  const qs = queries ?? [`${need} app screenshot`, `${need} app UI design screen`, `${need} mobile app screens`];
  const found = await researchComps({ need: `${need} app screen`, queries: qs, dir: path.join(out, "research"), python, maxPages: 8, maxImages: 18, keepTop: keep, log });
  const picked = found.candidates.slice(0, keep), comps = [];
  for (const c of picked) {
    let m, spec = null, err = null;
    try { m = pyJson(python, path.join(ADAPTERS, "comp-detect.py"), [c.file]); spec = compSpecOf(m, { source: { url: c.url, sha256: c.sha256 } }); } catch (e) { err = String(e.message).slice(0, 160); }
    comps.push({ id: c.id, url: c.url, page: c.page, sha256: c.sha256, license: c.license, file: c.file, width: c.width, height: c.height, spec, err });
    log(`read ${c.id}: ${spec ? `${spec.zones?.length ?? 0} zones` : `refused (${err})`}`);
  }
  fs.writeFileSync(path.join(out, "comps.json"), JSON.stringify(comps.map(({ spec, ...r }) => ({ ...r, zones: spec?.zones?.length ?? null })), null, 1));
  fs.writeFileSync(path.join(out, "specs.json"), JSON.stringify(comps.filter((c) => c.spec).map((c) => ({ id: c.id, url: c.url, spec: c.spec })), null, 1));
  return { found: found.counts, ledger: found.ledger, comps };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
  const r = await studyComps({ need: arg("need"), out: path.resolve(arg("out", "./comp-study")), keep: Number(arg("keep", 6)), log: (m) => console.log("·", m) });
  console.log(JSON.stringify({ found: r.found, comps: r.comps.map((c) => ({ id: c.id, url: c.url, w: c.width, h: c.height, zones: c.spec?.zones?.length ?? null, err: c.err, license: c.license?.standing })) }, null, 1));
}
