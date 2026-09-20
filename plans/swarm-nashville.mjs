// swarm-nashville.mjs — dispatch the ANTS at the retained corpus.
//
// "Swarm the ants": every capacity in the registry is pointed at each
// retained plan document (capacity-swarm.mjs — a new registry row is a new
// ant with zero code change), Wilson's round runs per document (breed +
// differentiate, gated by the measured rerun floor), and the census — every
// ant's yield, persona, stance, admitted children — plus the swarm's
// ANTI-MATTER (the terrains no ant touched, the typed gaps no ant could
// read) ride out with it. No model in the loop: cast and relations execute
// for real (capacity-runner.js), every other registered capacity reports
// its typed not_yet_executable gap — a gap is a result, never a silence.
//
// usage: node swarm-nashville.mjs [--docs nashvillenext-access-v5,...]
//        writes plans/nashville/discovery/swarm.json + prints the census.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { makeCapacityRunner } from "../native/organs/capacity-runner.js";
import { makeReferentIndex } from "../native/organs/cast.js";
import { engineRelationsFor } from "../native/the-fold/reader-bundle.js";
import { splitSentences } from "../native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "../native/adapters/text/surfaces.js";
import { listCapacities } from "../native/organs/capacities.js";
import { capacityAnts, pointCapacities, swarmCapacities } from "../native/eval/lavar/capacity-swarm.mjs";
import { eoSwarm, personaOf } from "../native/eval/lavar/eo-swarm.mjs";
import { elenchusBar, RERUN_NULL } from "../native/eval/lavar/elenchus-bar.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GROUND = join(HERE, "nashville", "ground");
const DISCO = join(HERE, "nashville", "discovery");

const argDocs = (process.argv.find((a) => a.startsWith("--docs=")) ?? "").replace("--docs=", "") || null;
const DOCS = argDocs
  ? argDocs.split(",")
  : ["nashvillenext-access-v5", "nmotion-final", "east-bank-exec", "uhs-full-report", "carp-final"];

// ── the runner — the SAME organs the proxy's own swarm turn uses ──────────
const referentIndexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm });
const relationsFor = (chunks) => engineRelationsFor(chunks);
const runCapacity = makeCapacityRunner({ referentIndexFor, relationsFor });

// ── the registry, as ants — the whole population, no hand-picking ─────────
const caps = listCapacities();
const ALL = capacityAnts(caps);
const NL = "swarm everything — every capacity at the retained plans";
const pointing = pointCapacities(NL);
if (pointing.gap) { console.error(pointing.reason); process.exit(1); }

/** measuredBar — the seed-best yield rerun RERUN_NULL.draws times through
 * elenchusBar: deterministic organ yields rerun identically, so the floor
 * collapses to epsilon (measured, never set). */
function measuredBar(ants, text, name) {
  const yields = ants.map((a) => {
    try {
      const r = runCapacity(a.capacity, { text, name });
      return r?.gap ? 0 : (r?.referents?.length ?? r?.edges?.length ?? r?.fillers?.length ?? r?.count ?? 0);
    } catch { return 0; }
  });
  const best = Math.max(0, ...yields);
  return elenchusBar(Array.from({ length: RERUN_NULL.draws }, () => best));
}

const census = { schema: "EOSwarmCensus@1", instance: "nashville", nl: NL, docs: [] };
for (const id of DOCS) {
  const text = readFileSync(join(GROUND, `${id}.txt`), "utf8");
  const bar = measuredBar(pointing.ants, text, id);
  const out = swarmCapacities({ nl: NL, runCapacity, material: { text, name: id }, bar });
  const bySeed = new Map(out.reports.map((r) => [r.capacity, r]));

  const seeds = out.swarm.ants.filter((a) => a.kind === "seed");
  const children = out.swarm.ants.filter((a) => a.kind !== "seed");
  const admitted = children.filter((a) => a.admitted);

  // the census row: every seed's yield (or typed gap), every admitted
  // child's composition, the best ant, and the anti-matter.
  const row = {
    doc: id,
    bar,
    mode: out.mode,
    pointed: out.pointed.length,
    seeds: seeds.map((a) => {
      const rep = bySeed.get(a.ids[0]) ?? null;
      const res = rep?.result ?? null;
      return {
        ids: a.ids, f: a.f, stance: a.stance ?? null, terrain: a.terrain ?? null,
        persona: a.persona?.gap ? { gap: a.persona.gap } : { archon: a.persona?.archon ?? null, label: a.persona?.label ?? null },
        ...(res?.gap
          ? { gap: res.gap, detail: String(res.detail ?? "").slice(0, 120) }
          : { yield: rep?.yield ?? 0, count: res?.count ?? 0, truncated: res?.truncated ?? false, examinedChars: res?.examinedChars ?? null, totalChars: res?.totalChars ?? null }),
      };
    }),
    children: {
      total: children.length,
      admitted: admitted.map((a) => ({ ids: a.ids, f: a.f, stance: a.stance ?? null, terrain: a.terrain ?? null, persona: a.persona?.label ?? null })),
    },
    best: { ids: out.swarm.best?.ids ?? [], f: out.swarm.best?.f ?? 0 },
    // THE ANTI-MATTER: terrains no ant touched + the typed gaps the ants
    // could not read — the swarm's holes are its questions. Terrain is read
    // off the POINTED REGISTRY (eoSwarm's census drops `terrain` from seed
    // ants — only differentiated children carry it — so reading it there
    // would report every terrain untouched: a census field gap, not a
    // finding).
    untouchedTerrains: ["Void", "Entity", "Kind", "Field", "Link", "Network", "Atmosphere", "Lens", "Paradigm"].filter(
      (t) => !pointing.pointed.some((c) => c.terrain === t)
    ),
    gapped: [...new Set(out.reports.map((r) => r.result?.gap).filter(Boolean))],
  };
  census.docs.push(row);

  console.log(`\n=== ${id} · bar ${bar.toExponential(2)} · ${row.pointed} capacities pointed ===`);
  for (const s of row.seeds) {
    if (s.gap) console.log(`  ✗ ${s.ids[0].padEnd(16)} ${s.gap}`);
    else console.log(`  ● ${s.ids[0].padEnd(16)} yield ${s.yield}${s.truncated ? ` (read ${s.examinedChars}/${s.totalChars} chars)` : ""} · ${s.persona.label}`);
  }
  if (row.children.admitted.length) {
    console.log(`  ✓ admitted children: ${row.children.admitted.map((c) => `${c.ids.join("+")}@${c.f}`).join(" · ")}`);
  } else {
    console.log(`  ✓ no combination beat its ground (bar ${bar.toExponential(2)})`);
  }
  console.log(`  best: ${row.best.ids.join("+")} @ ${row.best.f}`);
  if (row.untouchedTerrains.length) console.log(`  anti-matter — terrains untouched: ${row.untouchedTerrains.join(", ")}`);
  if (row.gapped.length) console.log(`  anti-matter — typed gaps: ${row.gapped.join(", ")}`);
}

mkdirSync(DISCO, { recursive: true });
writeFileSync(join(DISCO, "swarm.json"), JSON.stringify(census, null, 2));
console.log(`\nwrote ${join(DISCO, "swarm.json")}`);