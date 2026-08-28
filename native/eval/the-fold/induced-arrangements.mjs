// eval/induced-arrangements.mjs — does an INDUCED shape reach a corpus where a
// declared one does not?
//
// The baseline is P57's own disclosed limit: `network.js`'s two hand-picked
// recognizers (`surface`, `extent`), run over this instrument's whole read
// corpus, bind 8 systems. This driver runs `periodicity.js` — which knows no
// vocabulary at all — over the same bytes and reports what it finds, with the
// null's own tail as the only cut.
//
//   node eval/induced-arrangements.mjs [maxPages]

import { readFileSync, readdirSync, statSync } from "node:fs";
import { signature, periodOf } from "../periodicity.js";
import { makeNetworkBinder, extentShape, surfaceShape } from "../network.js";

const { extractSurfaces } = await import("../../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/surfaces.js");

// DECLARED, with its giver named: the null's own 99th percentile. Not a number
// picked to make a specimen pass — the same posture the kinds arm holds for
// its own quantile, and the value is reported beside every finding so a reader
// can move it and see what changes.
const ALPHA = 0.01;
const WINDOW = 20;   // lines per test — the smallest run that can show a period
const STRIDE = 10;

const files = readdirSync("web/pages").filter((f) => f.endsWith(".txt"));
const limit = Number(process.argv[2] ?? files.length);

const binder = makeNetworkBinder({ shapes: [extentShape, surfaceShape({ extractSurfaces })] });

let pages = 0, bytes = 0;
let declaredSystems = 0, inducedRegions = 0, pagesWithInduced = 0;
const examples = [];

const t0 = Date.now();
for (const f of files.slice(0, limit)) {
  const path = `web/pages/${f}`;
  if (!statSync(path).size) continue;
  const text = readFileSync(path, "utf8");
  pages++; bytes += text.length;

  declaredSystems += binder.bindRecurring(text, { ref: `web:${f}` }).systems.length;

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const sigs = lines.map(signature);
  let hitsHere = 0, i = 0;
  while (i + WINDOW <= sigs.length) {
    const r = periodOf(sigs.slice(i, i + WINDOW), { draws: 200, seed: i });
    if (r && r.beatenBy / r.draws <= ALPHA) {
      hitsHere++; inducedRegions++;
      if (examples.length < 14 && r.z > 3) {
        examples.push({ f, period: r.period, z: +r.z.toFixed(2), first: lines[i].slice(0, 44), second: lines[i + 1].slice(0, 34) });
      }
      i += WINDOW;
    } else i += STRIDE;
  }
  if (hitsHere) pagesWithInduced++;
}

console.log(`corpus: ${pages} pages · ${(bytes / 1e6).toFixed(1)}MB · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`alpha ${ALPHA} (the null's own tail), window ${WINDOW} lines\n`);
console.log(`DECLARED shapes (network.js, two hand-picked):  ${declaredSystems} systems`);
console.log(`INDUCED  shapes (periodicity.js, no vocabulary): ${inducedRegions} regions on ${pagesWithInduced} pages\n`);
console.log("a sample of what induction found that the declared shapes never reached:");
for (const e of examples) console.log(`  p=${e.period} z=${String(e.z).padStart(5)}  ${e.first}  ⏎  ${e.second}`);
