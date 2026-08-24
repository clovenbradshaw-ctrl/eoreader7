// native/eval/network-standing.mjs — the Network terrain earns standing:
// P6's "substantive product" (the binding layer), run over the native
// reading's own arrivals for the first time. constitutional-read has
// listed this stage under stagesNotRun since S1 was written; this driver
// is the stage, wired through the kernel's standing organ.
//
// ASSEMBLY, NAMED (P0): causal text perceiver (mention arrivals per
// encounter) -> kernel/network-standing.js with the ENGINE's bindLinks
// injected. Presence (terrain-activation's raw pair lighting) and
// standing (this) are reported side by side because confusing them is the
// exact mistake P1/P6 name.
//
// NUMBERS, EACH WITH ITS GIVER (S5/S7/S9):
//   window — MEASURED, dmdWindow over this book's own mention stream
//            (top-1 "who is this stretch about" derive; the same
//            measurement terrain-activation-live already reports)
//   draws 199, alpha 0.05, seed — host/population.js::LINK_SPEC's own
//            convention, the certified consumer's cut, cited not chosen
//
// Usage: node native/eval/network-standing.mjs <book.txt>

import fs from "node:fs";
import { stripContainer } from "../adapters/text/spans.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { dmdWindow } from "../kernel/activation.js";
import { networkStanding } from "../kernel/network-standing.js";
import { bindLinks } from "../../legacy-eoreader6.1/packages/engine/emergence/binding.js";

const POS_PRIOR = JSON.parse(fs.readFileSync(new URL("../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json", import.meta.url), "utf8"));
const WINDOW_CANDIDATES = [8, 16, 32, 64, 128, 256];
const LINK = { draws: 199, alpha: 0.05, seed: 20260812 }; // LINK_SPEC's convention, giver in header

async function main() {
  const path = process.argv[2];
  if (!path) throw new TypeError("usage: node native/eval/network-standing.mjs <book.txt>");
  const stripped = stripContainer(fs.readFileSync(path, "utf8"));
  const encounters = textEncounters(stripped.text, { source: `file:${path.split("/").pop()}`, offset: stripped.offset });
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POS_PRIOR });

  const arrivals = new Map(); // referent -> sorted encounter positions
  const mentionObs = [];
  let pos = 0;
  for (const enc of encounters) {
    const refs = [];
    for (const c of (await perceiver.perceive(enc, {})) ?? []) {
      for (const g of c.candidate?.graphEntries ?? []) {
        if (g?.schema === "EOMention@1" && g.referent) {
          refs.push(g.referent);
          const xs = arrivals.get(g.referent) ?? [];
          if (xs[xs.length - 1] !== pos) xs.push(pos);
          arrivals.set(g.referent, xs);
        }
      }
    }
    mentionObs.push(refs);
    pos += 1;
  }

  const top1 = (obs) => {
    const m = new Map();
    for (const r of obs.flat()) m.set(r, (m.get(r) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 1).map(([r]) => r);
  };
  const measured = dmdWindow(mentionObs.slice(0, Math.floor(mentionObs.length / 4)), top1, { candidates: WINDOW_CANDIDATES });
  if (measured.window == null) throw new Error(`window measurement gapped: ${measured.gap} — declare one with its reason before running standing`);

  const beings = [...arrivals.entries()].map(([id, a]) => ({ id, arrivals: a }));
  const standing = networkStanding(beings, { bindLinks, window: measured.window, ...LINK });

  // presence-side comparison: how many RAW pairs ever co-arrive at all
  const rawPairs = standing.pairsTested;

  console.log(JSON.stringify({
    schema: "EONetworkStanding@1",
    book: path.split("/").pop(),
    assembly: "causal text perceiver (mention arrivals per encounter) -> kernel/network-standing with engine bindLinks injected",
    declared: { window: { value: measured.window, basis: "dmdWindow, top-1 derive on this book's own first-quarter mention stream" }, ...LINK },
    beings: beings.length,
    belowArrivalFloor: standing.belowFloor.length,
    rawCoArrivingPairs: rawPairs,
    edges: standing.edges.length,
    refusedAsCoincident: standing.refused.length,
    topEdges: standing.edges.slice(0, 15),
    refusedSample: standing.refused.sort((a, b) => b.coArrivals - a.coArrivals).slice(0, 6),
    note: "presence lights every raw pair (terrain-activation); standing is only what clears its own null — the two counts differing IS the finding (P6)",
  }, null, 1));
}

main().catch((err) => { console.error(err); process.exit(1); });
