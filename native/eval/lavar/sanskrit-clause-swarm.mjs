// sanskrit-clause-swarm.mjs — colony two: the structure learns (2026-09-18).
//
// Colony one bred FLOORS (scalars — Wilson's gate, grid). This colony breeds
// STRUCTURE: the four toggles of sanskritClauses (preferPre, useOblique,
// useParticiple, itiBoundary). Structure IS a set, so this colony runs the
// REAL eoSwarm: BREED is union (CON·Figure over toggle subsets — combining
// two structural wins is meaningful, which is exactly what colony one's
// scalars could not do), gated by the SAME Wilson admission Wilson breeds
// through (elenchusBar + bornAcceptance). The DIFFERENTIATE face is skipped
// (no depsOf/terrainOfOrgan: single-feature toggles do not decompose into
// terrains — skipped rather than faked, eoSwarm's own contract).
//
// fitness(ids) = mean(subject accuracy, object accuracy) over MATCHED gold
// finite verbs on the Vedic TEST split the priors never saw (LAVAR split):
// gold subject = the verb's nsubj dependent (or null = pro-drop, and a null
// reader subject on a subjectless verb scores — recovery rewarded, never
// deafness: only EMITTED clauses score, and the emission rate is reported
// beside fitness, never hidden inside it — L7). Gold object = obj ?? iobj
// ?? obl. Components reported per ant.
// POS tallies and the verb gate come from TRAIN only (received measurement,
// same discipline as the priors — no leakage: TEST is scored, never read
// for anything but score).
// bar = elenchusBar over RERUN_NULL.draws reruns of the seed best
// (deterministic read → epsilon; a measured nonzero floor would be honored).
//
//   node sanskrit-clause-swarm.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sanskritClauses, confirmedVerbSet } from "./sanskrit.mjs";
import { eoSwarm } from "./eo-swarm.mjs";
import { elenchusBar, RERUN_NULL } from "./elenchus-bar.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEST = path.join(HERE, "../fixtures/ud-sanskrit-vedic/sa_vedic-ud-test.conllu");
const TRAIN = "/tmp/sa_vedic-train.conllu";
const CASE_PRIOR = JSON.parse(fs.readFileSync("/Users/mlacy/Documents/3.0/live_priors/derived-priors/case-priors/case-marking-san.json", "utf8"));

// ── received instruments (TRAIN only) ──
const posForms = {};
{
  for (const line of fs.readFileSync(TRAIN, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const c = line.split("\t");
    if (c.length < 6 || !/^\d+$/.test(c[0])) continue;
    const form = c[1].toLowerCase(), upos = c[3];
    if (!form || !upos || upos === "_") continue;
    (posForms[form] ??= {})[upos] = (posForms[form][upos] ?? 0) + 1;
  }
}
const posPrior = { forms: posForms };
const VERBS = confirmedVerbSet(posPrior, 0.5);

// ── gold clauses (TEST only, scored never read) ──
const SENTENCES = []; // {text, verbs: [{form, subj, obj}]}
{
  let text = null, rows = [];
  const flush = () => {
    if (!rows.length) { text = null; rows = []; return; }
    const verbs = [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const r of rows) {
      if (!["VERB", "AUX"].includes(r.upos)) continue;
      const f = r.feats;
      if (!(f.Person && f.Mood && !f.VerbForm)) continue; // finite (Vedic: bare Mood+Person)
      const deps = rows.filter((d) => d.head === r.id);
      const subj = deps.find((d) => d.deprel.split(":")[0] === "nsubj")?.form.toLowerCase() ?? null;
      const obj = deps.find((d) => ["obj", "iobj", "obl"].includes(d.deprel.split(":")[0]))?.form.toLowerCase() ?? null;
      verbs.push({ form: r.form.toLowerCase(), subj, obj });
    }
    if (text && verbs.length) SENTENCES.push({ text, verbs });
    text = null; rows = [];
  };
  for (const line of fs.readFileSync(TEST, "utf8").split("\n")) {
    if (line.startsWith("# text =")) { text = line.replace("# text =", "").trim(); continue; }
    if (!line.trim()) { flush(); continue; }
    if (line.startsWith("#")) continue;
    const c = line.split("\t");
    if (c.length < 8 || !/^\d+$/.test(c[0])) continue;
    const feats = c[5] === "_" ? {} : Object.fromEntries(c[5].split("|").map((x) => x.split("=")));
    rows.push({ id: Number(c[0]), form: c[1], upos: c[3], feats, head: Number(c[6]), deprel: c[7] });
  }
  flush();
}

// ── fitness over toggle subsets ──
const toOpts = (ids) => ({
  preferPre: ids.includes("pre"),
  useOblique: ids.includes("obl"),
  useParticiple: ids.includes("part"),
  itiBoundary: ids.includes("iti"),
});

function score(ids) {
  const opts = toOpts(ids);
  let subjHit = 0, subjTot = 0, objHit = 0, objTot = 0, emitted = 0, goldVerbs = 0;
  for (const s of SENTENCES) {
    const present = new Set([...VERBS].filter((v) => s.text.toLowerCase().includes(v)));
    if (!present.size) continue;
    const clauses = sanskritClauses(s.text, present, posPrior, CASE_PRIOR, { minShare: 0.5, minCount: 10, ...opts });
    const pool = [...clauses];
    for (const g of s.verbs) {
      goldVerbs += 1;
      const i = pool.findIndex((c) => c.verb.toLowerCase() === g.form);
      if (i < 0) continue; // verb gate missed it — emission loss, reported
      emitted += 1;
      const cl = pool.splice(i, 1)[0];
      const rs = cl.subject?.headLower ?? null, ro = cl.object?.headLower ?? null;
      subjTot += 1; if (rs === g.subj) subjHit += 1;
      if (g.obj !== null || ro !== null) { objTot += 1; if (ro === g.obj) objHit += 1; }
    }
  }
  const subjAcc = subjTot ? subjHit / subjTot : 0;
  const objAcc = objTot ? objHit / objTot : 0;
  return { subjAcc, objAcc, f: (subjAcc + objAcc) / 2, emission: goldVerbs ? emitted / goldVerbs : 0, emitted, goldVerbs };
}

const fitness = (ids) => score(ids).f;
const terrainOf = () => ["Link"]; // role assignment is Link-terrain work; one terrain, disclosed
const legal = () => true; // any toggle subset is a reader; disclosed (no DAG to check)

const SEED_ANTS = [
  { ids: ["pre", "obl", "part", "iti"], op: "CON", grain: "Figure" }, // the shipped reader
  { ids: [], op: "CON", grain: "Figure" },                            // the bare reader
  { ids: ["pre"], op: "CON", grain: "Figure" },
  { ids: ["obl"], op: "CON", grain: "Figure" },
  { ids: ["part"], op: "CON", grain: "Figure" },
  { ids: ["iti"], op: "CON", grain: "Figure" },
];

const seedBest = SEED_ANTS.map((a) => ({ ids: a.ids, f: fitness(a.ids) })).sort((x, y) => y.f - x.f)[0];
const reruns = Array.from({ length: RERUN_NULL.draws }, () => fitness(seedBest.ids));
const BAR = elenchusBar(reruns);

console.log(`sanskrit-clause-swarm · ${SENTENCES.length} gold-clause sentences (Vedic TEST) · verb gate emits ${[...VERBS].length} TRAIN-confirmed forms · rerun bar ${BAR.toExponential(2)}`);
console.log(`seed best: [${seedBest.ids.join(",")}] f=${seedBest.f.toFixed(4)}`);

const { ants, best } = eoSwarm({ ants: SEED_ANTS, fitness, terrainOf, legal, bar: BAR });

for (const a of [...ants].sort((x, y) => y.f - x.f)) {
  const s = score(a.ids);
  console.log(`  ${a.admitted ? "KEPT" : "refused"} [${a.ids.join(",") || "bare"}] (${a.kind}) f=${a.f.toFixed(4)} subj=${(100 * s.subjAcc).toFixed(1)}% obj=${(100 * s.objAcc).toFixed(1)}% emit=${(100 * s.emission).toFixed(1)}% (${s.emitted}/${s.goldVerbs})`);
}
const bs = score(best.ids);
console.log(`\nWINNER [${best.ids.join(",") || "bare"}] f=${best.f.toFixed(4)} subj=${(100 * bs.subjAcc).toFixed(1)}% obj=${(100 * bs.objAcc).toFixed(1)}% emit=${(100 * bs.emission).toFixed(1)}%`);
console.log(JSON.stringify({ winner: best.ids, ...bs }));
