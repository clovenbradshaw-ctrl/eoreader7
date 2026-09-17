// swarm-priors.mjs — promote hardened Things from the device store into the
// SHARED store (live_priors/derived-priors/swarm-priors/ — the GitHub surface
// the finder already reads). This is the received layer every machine
// bootstraps from, so the promotion bar is the corroboration bar: ONLY a
// SwarmThing@1 (>=2 independent materials) is promoted. A nominee stays on
// the device — nomination is never licensing; corroboration to >=2 promotes.
//
// The shared store keeps TWO artifacts:
//   swarm-breakthroughs.jsonl — the union of every device's kept winners
//       (the evidence a remote finder corroborates against);
//   <self-name>.json — one SwarmThingPrior@1 per hardened thing, with full
//       provenance (giver, witnesses, independent sources, lineage).
//
// usage: node swarm-priors.mjs [--out <dir>]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { harden, thingName, readBreakthroughs, REGISTRY } from "./swarm-things.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SHARED = process.argv.find((a) => a.startsWith("--out="))?.slice(6) ??
  "/Users/mlacy/Documents/3.0/live_priors/derived-priors/swarm-priors";

const LOCAL = path.join(HERE, "results", "swarm-breakthroughs.jsonl");

/** promote({ entries, sharedDir }) — merge the device's kept winners into the
 * shared breakthrough union (deduped by line), and write one SwarmThingPrior@1
 * per hardened thing. Returns { things, nominees, files }. Pure enough to
 * test against a temp dir. */
export function promote({ entries = readBreakthroughs(LOCAL), sharedDir = SHARED } = {}) {
  fs.mkdirSync(sharedDir, { recursive: true });
  const sharedBts = path.join(sharedDir, "swarm-breakthroughs.jsonl");
  const union = new Map();
  for (const l of (fs.existsSync(sharedBts) ? fs.readFileSync(sharedBts, "utf8") : "").split("\n").filter(Boolean)) {
    try { union.set(l, JSON.parse(l)); } catch { /* skip malformed */ }
  }
  for (const e of entries) union.set(JSON.stringify(e), e);
  fs.writeFileSync(sharedBts, [...union.values()].map((e) => JSON.stringify(e)).join("\n") + "\n");

  const { things, nominees } = harden(entries, { lineage: () => [] });
  const files = [];
  for (const t of things) {
    const file = path.join(sharedDir, `${t.name}.json`);
    const prior = {
      schema: "SwarmThingPrior@1",
      giver: "wilson.mjs — the swarm (Wilson the archon, Interpretation·Paradigm)",
      name: t.name,
      label: t.label,
      variant: t.variant,
      cells: t.cells,
      stance: t.stance,
      terrain: t.terrain,
      mhc: t.mhc,
      echo: t.echo,
      modalities: t.modalities ?? ["text"],
      mass: t.mass,
      witnesses: t.witnesses,
      independentSources: t.independentSources,
      lineage: t.lineage,
      declared: {
        corroborationRule: "the same variant winning on >=2 independent materials (a rerun is the same witness re-testifying)",
        namingRule: "content hash of consequence (variant + dominant terrain cells + mhc) — recomputable, no central authority; realized echoes are the thing's witness history, not its identity",
        labelRule: "the dominant cell's stance and terrain (kernel/cube.js)",
      },
      at: new Date().toISOString().slice(0, 10),
    };
    fs.writeFileSync(file, JSON.stringify(prior, null, 2) + "\n");
    files.push(file);
  }
  return { things, nominees, files, sharedBts };
}

// ── CLI ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const { things, nominees, files, sharedBts } = promote();
  console.log(JSON.stringify({
    promoted: things.map((t) => ({ name: t.name, variant: t.variant, label: t.label, witnesses: t.witnesses })),
    stayedNominee: nominees.length,
    breakthroughUnion: sharedBts,
    files,
  }, null, 2));
}