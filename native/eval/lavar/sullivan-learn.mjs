// sullivan-learn.mjs — Sullivan learns which cues place a recurring form in
// the Void, at Entity, or at Kind, with Wilson's swarm doing the search.
// Handle: Sullivan.
//
// THE STUDENT'S SENSES are adapters/text/existence-grain.js's cue organs
// (E1–E6). THE SWARM is Wilson's own machinery, reused rather than
// re-implemented: createSwarmGate (swarm-gate.mjs) keeps one champion per
// cube terrain and admits a birth only on improvement over that champion,
// judged by bornAcceptance against the colony's own improvement
// distribution; the bar is elenchusBar over RERUN_NULL.draws reruns of the
// null seed. Seeds are the single-organ configs; each generation breeds the
// best's one-step neighbours; the walk stops after two dry generations.
//
// THE FITNESS IS GOLDEN-FREE: split-half consistent LICENSED resolution —
// the text is cut at the line nearest its middle, each half is read on its
// own (with its own nulls), and a form counts only if both halves resolve
// it the same way AND that way is licensed (Kind on a fired cue, Entity on
// naming evidence). Measured 2026-09-23: the unlicensed version of this
// fitness was degenerate — the no-organ config scored a perfect 1.000
// (calling everything an Entity is perfectly consistent) and Spearman
// against the witness was 0.25. Licensing is what made it track.
//
// THE GOLDEN IS A WITNESS, NEVER THE FITNESS. Each text's WITNESS below is
// the play's own character list (a Dramatis Personae, or Antigone's
// speaker cues plus its central named figures), hand-labelled under a
// stated rule, and read only AFTER the swarm has chosen — to report
// whether the golden-free fitness tracks it (Spearman over every config).
//
//   node native/eval/lavar/sullivan-learn.mjs [--json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { grainEvidence, grainOf, CUES } from "../../adapters/text/existence-grain.js";
import { cellOf } from "../../kernel/cube.js";
import { createSwarmGate } from "./swarm-gate.mjs";
import { elenchusBar, RERUN_NULL } from "./elenchus-bar.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIVE = path.resolve(HERE, "..", "..", "..", "..", "live_priors");
const POS_ENG = path.resolve(HERE, "..", "..", "..", "..", "the-fold", "priors-data", "pos-prior-eng.json");
const POS_GRC = path.resolve(HERE, "..", "..", "priors", "pos-grc.json");

// WITNESSES — labelling rule: a token that names one individual person or
// place (titles, ranks and roles excluded; forms that are also ordinary
// common words — "march", "quickly" — excluded as ambiguous). Speaker-label
// abbreviations of a listed name count (Faustus's "mephist").
export const TEXTS = Object.freeze([
  { id: "faustus", path: path.join(LIVE, "15-western-canon/marlowe/doctor-faustus-1604-quarto.txt"), prior: POS_ENG,
    witness: "faustus valdes cornelius wagner robin ralph lucifer belzebub mephistophilis alexander helen lorrain vanholt germany mephist" },
  // Audited 2026-09-23 against an independent witness (Wikipedia's
  // "Characters" list, fetched that day): the Dramatis Personae names people
  // formally and so missed the names the play actually calls them by. Added
  // under the SAME rule, from that list only (never from this organ's
  // output): hal harry ralph ned francis mugs tom kate robin gilliams.
  // "quickly" is a name once and an adverb twice in this text — a mixed
  // form, left out of a form-level witness rather than mislabelled.
  { id: "henry-iv-modern", path: path.join(LIVE, "15-western-canon/first-folio/henry-iv-part-1-modern.txt"), prior: POS_ENG,
    witness: "henry wales john lancaster westmoreland walter blunt thomas percy worcester northumberland hotspur edmund mortimer scroop york michael archibald douglas owen glendower richard vernon falstaff poins gadshill peto bardolph eastcheap england hal harry ralph ned francis mugs tom kate robin gilliams",
    witnessBefore: "henry wales john lancaster westmoreland walter blunt thomas percy worcester northumberland hotspur edmund mortimer scroop york michael archibald douglas owen glendower richard vernon falstaff poins gadshill peto bardolph eastcheap england" },
  { id: "antigone", path: path.join(LIVE, "11-multi-language/greek-originals/sophocles-antigone.txt"), prior: POS_GRC,
    witness: "κρέων κρέοντος κρέοντι κρέοντα ἀντιγόνη ἀντιγόνην ἰσμήνη ἰσμήνης αἵμων πολυνείκους ἐτεοκλέα οἰδίπου ζεὺς κρεων αντιγονη ισμηνη αιμων τειρεσιας ευρυδικη χορος" },
]);

export const SPACE = Object.freeze({ E1: ["off", "all", "run"], E2: [0, 1], E3: [0, 1], E4: ["off", "raw", "cal"], E5: [0, 1], E6: [0, 1] });
const OFF = Object.freeze({ E1: "off", E2: 0, E3: 0, E4: "off", E5: 0, E6: 0 });
const CONFIGS = Object.entries(SPACE).reduce((acc, [k, vs]) => acc.flatMap((c) => vs.map((v) => ({ ...c, [k]: v }))), [{}]);
const keyOf = (c) => JSON.stringify(c);
export const nameOf = (c) => Object.entries(c).filter(([, v]) => v && v !== "off").map(([k, v]) => (v === 1 ? k : `${k}:${v}`)).join("+") || "none";
const terrainOf = (c) => [...new Set(Object.entries(c).filter(([, v]) => v && v !== "off").map(([k]) => cellOf(...CUES[k].cell).terrain))];
const bodyOf = (p) => { const raw = fs.readFileSync(p, "utf8"); return raw.slice(raw.indexOf("\n\n") + 2); };

function rank(xs) {
  const idx = xs.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j += 1; for (let k = i; k <= j; k += 1) r[idx[k][1]] = (i + j) / 2; i = j + 1; }
  return r;
}
export function spearman(a, b) {
  const ra = rank(a), rb = rank(b), mean = (x) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  ra.forEach((v, i) => { num += (v - ma) * (rb[i] - mb); da += (v - ma) ** 2; db += (rb[i] - mb) ** 2; });
  return da && db ? num / Math.sqrt(da * db) : null;
}

/** licensedSplitHalf(text, prior, seed) → (cfg) => fitness. */
export function licensedSplitHalf(text, prior, nullSeed) {
  const cut = text.indexOf("\n", Math.floor(text.length / 2));
  const A = grainEvidence(text.slice(0, cut), prior, { nullSeed }).forms;
  const B = grainEvidence(text.slice(cut), prior, { nullSeed }).forms;
  const both = [...A.keys()].filter((w) => B.has(w));
  return (cfg) => both.filter((w) => { const g1 = grainOf(A.get(w), cfg), g2 = grainOf(B.get(w), cfg); return g1 === g2 && (g1 === "Kind" || g1 === "Entity"); }).length / both.length;
}

function witnessOf(forms, gold, cfg) {
  const present = [...forms.keys()].filter((w) => gold.has(w));
  const g = (w) => grainOf(forms.get(w), cfg);
  const entity = [...forms.keys()].filter((w) => g(w) === "Entity");
  const hit = present.filter((w) => g(w) === "Entity").length;
  const killed = present.filter((w) => g(w) === "Kind" || g(w) === "Kind*").length;
  const contested = present.filter((w) => g(w) === "Contest").length;
  const P = entity.length ? hit / entity.length : 0, R = present.length ? hit / present.length : 0;
  return { present: present.length, hit, killed, contested, voided: present.length - hit - killed - contested, entity: entity.length, precisionLowerBound: +P.toFixed(3), recall: +R.toFixed(3), F1: +(P + R ? (2 * P * R) / (P + R) : 0).toFixed(3) };
}

export function learn(spec) {
  const text = bodyOf(spec.path);
  const prior = JSON.parse(fs.readFileSync(spec.prior, "utf8"));
  const gold = new Set(spec.witness.split(" "));
  const fitness = licensedSplitHalf(text, prior, 7);
  const full = grainEvidence(text, prior, { nullSeed: 7 });
  const rows = CONFIGS.map((cfg) => ({ cfg, f: fitness(cfg), w: witnessOf(full.forms, gold, cfg) }));
  const byKey = new Map(rows.map((r) => [keyOf(r.cfg), r]));
  const top = [...rows].sort((a, b) => b.f - a.f)[0];
  const reruns = Array.from({ length: RERUN_NULL.draws }, (_, i) => licensedSplitHalf(text, prior, RERUN_NULL.seed + i * 13)(top.cfg));
  const bar = elenchusBar(reruns);

  const gate = createSwarmGate({ bar });
  const seeds = Object.entries(SPACE).flatMap(([k, vs]) => vs.filter((v) => v && v !== "off").map((v) => ({ ...OFF, [k]: v })));
  for (const c of seeds) gate.record(c, terrainOf, byKey.get(keyOf(c)).f);
  let best = seeds.map((c) => byKey.get(keyOf(c))).sort((a, b) => b.f - a.f)[0];
  const tried = new Set(seeds.map(keyOf));
  const lineage = [{ gen: 0, kept: nameOf(best.cfg), f: +best.f.toFixed(4) }];
  let gen = 0, dry = 0, births = 0;
  while (dry < 2 && tried.size < CONFIGS.length) {
    gen += 1;
    let kept = 0;
    const kids = Object.entries(SPACE).flatMap(([k, vs]) => vs.filter((v) => v !== best.cfg[k]).map((v) => ({ ...best.cfg, [k]: v }))).filter((c) => !tried.has(keyOf(c)));
    for (const c of kids) {
      tried.add(keyOf(c)); births += 1;
      const r = byKey.get(keyOf(c));
      const improvement = r.f - gate.championFor(c, terrainOf, best.f);
      gate.recordImprovement(improvement);
      if (!gate.admits(improvement)) continue;
      gate.record(c, terrainOf, r.f); kept += 1;
      if (r.f > best.f) { best = r; lineage.push({ gen, kept: nameOf(c), f: +r.f.toFixed(4) }); }
    }
    dry = kept ? 0 : dry + 1;
  }
  const grains = { Entity: [], Kind: [], "Kind*": [], Contest: [], Void: [] };
  for (const [w, e] of full.forms) grains[grainOf(e, best.cfg)].push(w);
  for (const k of Object.keys(grains)) grains[k].sort((a, b) => full.forms.get(b).n - full.forms.get(a).n);
  const byWitness = [...rows].sort((a, b) => b.w.F1 - a.w.F1)[0];
  // Does the conclusion depend on trusting the witness? Score the same swarm
  // against the pre-audit witness too, when one is kept.
  const before = spec.witnessBefore ? (() => {
    const g0 = new Set(spec.witnessBefore.split(" "));
    const w0 = rows.map((r) => witnessOf(full.forms, g0, r.cfg));
    return { champion: witnessOf(full.forms, g0, best.cfg), spearmanF1: spearman(rows.map((r) => r.f), w0.map((w) => w.F1)) };
  })() : null;
  return {
    witnessBefore: before,
    text: spec.id, configs: CONFIGS.length, births, generations: gen, elenchusBar: bar, speaks: full.speaks,
    champion: { cues: nameOf(best.cfg), fitness: +best.f.toFixed(4), witness: best.w },
    lineage,
    terrainChampions: Object.fromEntries([...gate.bestByTerrain].map(([t, v]) => [t, { cues: nameOf(v.ids), fitness: +v.f.toFixed(4) }])),
    feelTracksWitness: { spearmanF1: spearman(rows.map((r) => r.f), rows.map((r) => r.w.F1)), spearmanNotKilling: spearman(rows.map((r) => r.f), rows.map((r) => -r.w.killed)) },
    witnessFavourite: { cues: nameOf(byWitness.cfg), fitness: +byWitness.f.toFixed(4), witness: byWitness.w },
    grains: Object.fromEntries(Object.entries(grains).map(([k, ws]) => [k, { count: ws.length, top: ws.slice(0, 40) }])),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const results = TEXTS.filter((t) => fs.existsSync(t.path)).map(learn);
  for (const r of results) {
    console.log(`\n${r.text}: champion ${r.champion.cues} f=${r.champion.fitness} | witness gold ${r.champion.witness.hit}/${r.champion.witness.present} killed=${r.champion.witness.killed} contested=${r.champion.witness.contested} void=${r.champion.witness.voided} | entity=${r.champion.witness.entity}`);
    console.log(`  lineage: ${r.lineage.map((l) => `gen${l.gen} ${l.kept}@${l.f}`).join(" -> ")}  (${r.births} births, bar ${r.elenchusBar.toExponential(2)})`);
    console.log(`  feel tracks witness: Spearman(F1)=${r.feelTracksWitness.spearmanF1?.toFixed(3)}  witness favourite: ${r.witnessFavourite.cues} (killed ${r.witnessFavourite.witness.killed})`);
    if (r.witnessBefore) console.log(`  vs the PRE-AUDIT witness: champion gold ${r.witnessBefore.champion.hit}/${r.witnessBefore.champion.present} killed=${r.witnessBefore.champion.killed} P>=${r.witnessBefore.champion.precisionLowerBound}; Spearman(F1)=${r.witnessBefore.spearmanF1?.toFixed(3)}  (corrected: P>=${r.champion.witness.precisionLowerBound})`);
    console.log(`  Entity: ${r.grains.Entity.top.slice(0, 25).join(" ")}`);
    console.log(`  Contest: ${r.grains.Contest.top.slice(0, 15).join(" ")}`);
  }
  const out = path.join(HERE, "results", "sullivan-learn.json");
  fs.writeFileSync(out, JSON.stringify({ schema: "SullivanLearn@1", at: new Date().toISOString().slice(0, 10), fitness: "split-half consistent licensed resolution (golden-free)", results }, null, 2));
  console.log(`\nwrote ${path.relative(process.cwd(), out)}`);
}
