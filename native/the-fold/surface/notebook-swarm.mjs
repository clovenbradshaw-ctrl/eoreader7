// notebook-swarm.mjs — the colony, run on the notebook's real data, with its trails kept between runs and everything it finds put through
// the SAME gate a model-written or person-taught method goes through.
//
//   trails   <learned dir>/swarm-trails.json   the pheromone (kernel/stigmergy.js), persisted: what worked on one file guides the next
//   runs     the learned-analysis chain (kind "swarm-run"): every colony's size, ceiling and what it kept — append-only, hash-chained
//   finds    each surviving pipeline becomes a method {check, control} generated mechanically from the pipeline, admitted or refused by
//            notebook-learn.admit, stored with lineage "swarm:<run>", and from then on a skill like any other: switchable, audited
//
// The search runs on the FIRST half of the series (at most SEARCH_N samples); the method's own check confirms on the SECOND half, so a
// pipeline the colony chose is not judged on the data that chose it.
import fs from "node:fs"; import path from "node:path";
import { colony, ROUNDS, ANTS } from "../../organs/structure-swarm.js";
import { runPython } from "./notebook-run.mjs";
import { append } from "../../organs/analysis-store.js";
import { fill } from "./notebook-learn.mjs";

export const SEARCH_N = 32768;   // declared: the colony looks at no more than this many samples of the first half
export const SEARCH_SURR = 10;   // declared: surrogates per null per pipeline during the search
const trailsFile = (dir) => path.join(dir, "swarm-trails.json");
export const loadTrails = (dir) => { try { return JSON.parse(fs.readFileSync(trailsFile(dir), "utf8")); } catch { return {}; } };
export function saveTrails(dir, t) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(trailsFile(dir) + ".tmp", JSON.stringify(t)); fs.renameSync(trailsFile(dir) + ".tmp", trailsFile(dir)); }
export const pheromone = (t) => Object.values(t).reduce((n, l) => n + l.length, 0);

const runJson = (code, files) => { const r = runPython(code, files, { timeoutMs: 300000 }); const m = r.output.match(/^#json (.*)$/m); if (!r.ok || !m) throw new Error(`the colony's evaluator failed: ${r.output.split("\n").filter(Boolean).slice(-2).join(" | ").slice(0, 240)}`); return JSON.parse(m[1]); };
const head = (F, C, extra) => `from swarm import *\nfrom turb import series\nimport json\nt,x,rep=series(${JSON.stringify(F)},${JSON.stringify(C)}); x=x[:len(x)//2][:${SEARCH_N}]\n${extra}\n`;
const clean = "def cl(o):\n    return json.loads(json.dumps(o, default=float).replace('NaN','null'))\n";

export function evaluator(files, F, C) {
  return {
    evalBatch: async (specs, seed) => runJson(head(F, C, `${clean}print("#json "+json.dumps(cl(evaluate(x,${JSON.stringify(specs)},${SEARCH_SURR},${seed}))))`), files),
    ceilingOf: async (specs, seed) => runJson(head(F, C, `${clean}print("#json "+json.dumps(cl(ceiling(x,${JSON.stringify(specs)},${SEARCH_SURR},${seed},3))))`), files),
  };
}

const NULLDESC = { shuffle: "randomly re-ordered copies", phase: "linear Gaussian processes with the same spectrum" };
/** candidateFor(structure, meta) — the method a surviving pipeline IS, written mechanically. Nothing in it is a model's. */
export function candidateFor(s, meta) {
  const spec = JSON.stringify(s.spec), nd = NULLDESC[s.null], N = s.null;
  const half = 'x=x[len(x)//2:][:32768]';
  return {
    name: `structure: ${s.gloss} vs ${N}`, by: `swarm:${meta.run}`,
    desc: `${s.gloss}, tested against ${nd}. Found by an ant colony (${meta.tried} pipelines tried, chance ceiling z=${meta.ceiling[N].toFixed(1)}); words: ${s.gloss} ${s.spec.join(" ")} ${N === "phase" ? "nonlinear structure beyond the spectrum" : "temporal structure, order matters"} pattern structure`,
    claim: `In {{COL}}, ${s.gloss} is not what ${nd} produce: it stands outside all 40 of them, in the second half of the series.`,
    check: `from swarm import *\nfrom turb import series\nt,x,rep=series("{{FILE}}","{{COL}}"); ${half}\nspec=${spec}\nstat,lo,hi,z=structure_test(x,spec,"${N}",40,0)\nprint(f"#finding {{COL}}: ${s.gloss} = {stat:.4g}; the 40 ${nd} span {lo:.4g} to {hi:.4g} (z={z:.1f})")\nscope_sample(40,0,"40 ${nd} of {{COL}}, second half of the series")\nresult(bool(z>0 and (stat<lo or stat>hi)))`,
    control: `from swarm import *\nfrom turb import series\nt,x,rep=series("{{FILE}}","{{COL}}"); ${half}\ny=null_copy(x,"${N}",99)\nstat,lo,hi,z=structure_test(y,${spec},"${N}",40,1)\nprint(f"control: a copy of {{COL}} with the structure destroyed reads ${s.gloss} = {stat:.4g} against {lo:.4g} to {hi:.4g} — it must NOT read as structured")\nscope_sample(40,1,"40 ${nd} of a ${N} copy of {{COL}}")\nresult(bool(z>0 and (stat<lo or stat>hi)))`,
  };
}

/** exploreColumn({ files, file, col, dir, seed, rounds, ants }) -> { run, structures, ceiling, tried, log, trailsBefore, trailsAfter } */
export async function exploreColumn({ files, file: F, col: C, dir, seed = null, rounds, ants, now = Date.now() }) {
  rounds ??= Number(process.env.ER7_SWARM_ROUNDS) || ROUNDS; ants ??= Number(process.env.ER7_SWARM_ANTS) || ANTS; // declared dials; env lets a supervisor size a colony
  const trails = loadTrails(dir), before = pheromone(trails); seed ??= (before % 997) + 1;
  const ev = evaluator(files, F, C);
  const r = await colony({ ...ev, trails, rounds, ants, seed, now });
  saveTrails(dir, r.trails);
  const run = `${now.toString(36)}-${C}`;
  append(dir, { kind: "swarm-run", run, file: F, col: C, seed, rounds, ants, tried: r.tried, ceiling: r.ceiling, kept: r.structures.map((s) => ({ spec: s.spec, null: s.null, z: +s.z.toFixed(1) })), foundBeforeDedupe: r.foundBeforeDedupe, log: r.log, trailsBefore: before, trailsAfter: pheromone(r.trails) });
  return { run, ...r, trailsBefore: before, trailsAfter: pheromone(r.trails) };
}
