// wilson.mjs — THE SWARM, complete (2026-09-12).
//
// HEADS UP (2026-09-13): chapter-swarm.mjs is this archon's own discipline
// applied to the RECURSIVE reading pipeline (read-real's recipe) PER CHAPTER
// instead of the EOT ledger. The span-free bridge (lib/span-free-bridge.mjs)
// adjudicates under "Wilson's swarm"; the read recipe is the shared seam
// lib/read-recipe.mjs (cli/eoreader7.mjs reads through it too). Nomination at
// one independent chain site per chapter; corroboration by the accumulator's
// cross-chapter union to >=2; promotion to GIVEN with this archon named as
// giver. CV is a SENSE, not a tier: a chapter the flat reader reads wrong
// (native/organs/look.js weirdFormattingScore) is looked at before it is read
// as prose — the trigger is never suppressed. See LAVAR.md 2026-09-13.
//
// HEADS UP (2026-09-16): the swarm was deaf for a wiring reason, and the
// cube told us how to make it hear. (1) The admission gate was fed the
// CORRECTION delta (f2-f1 from the reread), which the reread routinely makes
// negative — so bornAcceptance refused every candidate even when it beat the
// best by +0.013 (measured: 416 births, 0 kept). The gate now admits on the
// IMPROVEMENT over the best (the elenchus-bar.mjs contract), never the
// correction delta. (2) The Differentiate face was unwired: the swarm bred
// and re-seeded but never split, so every variant was "turn an organ off"
// and the full reader won by monotonicity. A SEG pass now splits the best
// into terrain-specialists, and selection is per-terrain (one champion per
// terrain), so a specialist can outread the generalist on its own ground.
// (3) Every variant now measures against its OWN isolated ledger
// (eot-jsonl.mjs --ledger-name), so no reading is ever merged into another's.
// (4) Every birth carries its cell's STANCE (kernel/cube.js) — the raw
// material of device personality. See swarm-gate.mjs.
//
// Wilson, the archon of the swarm: an evolutionary swarm-storm of reading
// variants at holonic levels, under the received hierarchy and the cube.
//
// THE RECEIVED LAW (nobody re-invents it, nobody reorders it):
//   CUBE     27 creation-kinds (9 operators × 3 grains), 9 terrains
//            (Existence: Void/Entity/Kind · Structure: Field/Link/Network ·
//            Interpretation: Atmosphere/Lens/Paradigm).
//   COMMONS  the MHC orders — the depth axis (a higher order is defined in
//            terms of the one below, non-arbitrarily). Commons owns the
//            hierarchy; Wilson only DESCENDS it on a below-noise shape,
//            never reorders it.
//   STRATA   S0 bytes · S1 script · S2 heard · S3 meaning (the heard rule).
//
// WILSON (the archon, at Interpretation·Paradigm, MHC 12-13) runs the swarm:
//   the storm (breed/mutate/random/DMD-Born), the elenchus (keep or refuse),
//   stigmergy (shadows+echoes, only breakthroughs broadcast), survivalism
//   (energy; legal variants go DORMANT, never die), context routing
//   (script/language), the genealogy (append-only lineage, a thing tried
//   once is never abandoned), and the DESCENT (a below-noise shape triggers
//   REC down the MHC/terrain ladder).
//
// usage: node wilson.mjs [chapter] [--book <path>] [--lang <code>] [--gens N]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { shapeOf } from "./reading-shape.mjs";
import { dmd, economySVD } from "../../kernel/dmd.js";
import { closureOf, witnessAnswer } from "../../kernel/ground-closure.js";
import { elenchusBar, RERUN_NULL } from "./elenchus-bar.mjs";
import { createSwarmGate, stanceOf, specialistsOf } from "./swarm-gate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CH = Number(process.argv[2] ?? 1);
const BOOK = (process.argv.find((a) => a.startsWith("--book=")) ?? "--book=/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt").replace("--book=", "");
const GENS = Number((process.argv.find((a) => a.startsWith("--gens=")) ?? "--gens=3").replace("--gens=", ""));
const LANG = (process.argv.find((a) => a.startsWith("--lang=")) ?? "--lang=eng").replace("--lang=", "");
const langFlags = LANG === "eng" ? [] : [`--lang=${LANG}`];
const IS_AIW = BOOK.includes("Alice_s_Adventures");
const LEDGER = path.join(HERE, "results", `${path.basename(BOOK, ".txt")}-ch${CH}.eot.jsonl`);

// ── 1. THE CUBE (received) — 27 creation-kinds, 9 terrains ──
const OPERATORS = ["NUL","SIG","INS","SEG","CON","SYN","DEF","EVA","REC"];
const GRAINS = ["Ground","Figure","Pattern"];
const TERRAINS = { Existence: ["Void","Entity","Kind"], Structure: ["Field","Link","Network"], Interpretation: ["Atmosphere","Lens","Paradigm"] };
const DOMAIN_OF_TERRAIN = Object.fromEntries(Object.entries(TERRAINS).flatMap(([d, ts]) => ts.map((t) => [t, d])));
const KIND_OF_CELL = {}; // "op·grain" -> mechanism (the 27 creation-kinds)
{
  const mechanisms = {
    NUL: { Ground: "ask a gap -> its filler", Figure: "ask the one question whose answer is an agent", Pattern: "a null band spawns a probe" },
    SIG: { Ground: "mark a context-slot that repeats", Figure: "mark a single salient percept (visual/LLM — the slow sense)", Pattern: "mark the trace-field peak (statistical, fast)" },
    INS: { Ground: "birth on a changed context", Figure: "birth from a novel instance (S9 low sets possible)", Pattern: "birth from a recurring co-occurrence (fast)" },
    SEG: { Ground: "split an agent per context", Figure: "split an over-broad organ", Pattern: "split a coarse DMD mode (fast)" },
    CON: { Ground: "merge agents that co-fire in a context", Figure: "compose two agents (breeding)", Pattern: "a network agent from recurring organ-relations (fast)" },
    SYN: { Ground: "construct from a context template", Figure: "construct a whole from parts (a reader)", Pattern: "eigendecomposition of the fitness landscape (DMD/Born, fast)" },
    DEF: { Ground: "instantiate a parameterized organ for a context", Figure: "bind a slot (a lens filled by material)", Pattern: "define a kind from a cluster (fast)" },
    EVA: { Ground: "a context specialist is born as its judge", Figure: "a challenger contradicts the best (adversarial)", Pattern: "the fitness gradient births the next agent (fast)" },
    REC: { Ground: "stagnation -> a fresh random population", Figure: "a failing agent re-born from lineage with a mutation", Pattern: "no growing DMD modes -> re-zero the environment (fast)" },
  };
  for (const op of OPERATORS) for (const g of GRAINS) KIND_OF_CELL[`${op}·${g}`] = mechanisms[op][g];
}
const CELLS = Object.entries(KIND_OF_CELL).map(([cell, mech]) => ({ cell, mech }));

// ── 2. THE REGISTRY — organs typed (kind, MHC order, terrain, deps) ──
// The MHC order is the depth (Commons, received); the terrain is the 9.
const ORGANS = [
  { id: "received", name: "received-verbs", deps: [], flags: ["--no-received-verbs"], level: 9, terrain: "Network", cell: "SYN·Pattern", rationale: "the received floor (S112) — vocabulary folded from the corpus; the flag toggles it OFF, so this lever genuinely bites" },
  { id: "reduced", name: "reduced-clauses", deps: ["received"], flags: ["--no-reduced"], level: 8, terrain: "Link", cell: "CON·Figure", rationale: "comma+participle is a clause (needs the floor); the flag toggles it OFF, so this lever genuinely bites" },
  { id: "nps", name: "noun-phrase-subjects", deps: [], flags: ["--no-nps"], level: 7, terrain: "Link", cell: "INS·Figure", rationale: "noun phrases can head a clause" },
  { id: "deep", name: "deep-recurse", deps: [], flags: ["--max-depth=5"], level: 6, terrain: "Field", cell: "SEG·Figure", rationale: "nested clauses (readClause depth 3->5)" },
  { id: "reread", name: "reread-loop", deps: [], flags: ["--prior=1"], level: 10, terrain: "Atmosphere", cell: "EVA·Ground", rationale: "reread with own earned prior (loops on loops)" },
];
const byId = new Map(ORGANS.map((o) => [o.id, o]));
const ALL = Array.from({ length: 1 << ORGANS.length }, (_, m) => ORGANS.map((_, i) => (m & (1 << i)) !== 0).map((on, i) => on ? ORGANS[i].id : null).filter(Boolean));
function depsOf(id, acc = new Set()) { for (const d of byId.get(id).deps) { acc.add(d); depsOf(d, acc); } return acc; }
function legal(ids) { const have = new Set(ids); for (const id of ids) for (const d of depsOf(id)) if (!have.has(d)) return false; return true; }
const LEGAL = ALL.filter(legal);
const flagsFor = (ids) => { const out = []; for (const id of ids) for (const f of byId.get(id).flags) if (!out.includes(f)) out.push(f); return out; };
const nameFor = (ids) => ids.map((id) => byId.get(id).name).join("+") || "earned-only";
const levelOf = (ids) => Math.max(...ids.map((i) => byId.get(i).level));
const terrainOf = (ids) => ids.map((i) => byId.get(i).terrain);
// THE VARIANT LEDGER (2026-09-16): each genotype measures against its OWN
// ledger — eot-jsonl.mjs's --ledger-name. Without isolation, every variant's
// shape read the shared accumulating union and the swarm could hear nothing.
const variantLedger = (ids) => path.join(HERE, "results", `${path.basename(BOOK, ".txt").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-ch${CH}-${nameFor(ids)}.eot.jsonl`);

// ── 3. CONTEXT (the swarm is contextual) ──
const head = fs.readFileSync(BOOK, "utf8").slice(0, 4000);
const ctx = { lang: LANG, script: /[\p{Script=Cyrillic}]/u.test(head) ? "cyrillic" : /[\p{Script=Greek}]/u.test(head) ? "greek" : "latin" };
const contextHints = { latin: ["received", "reduced"], cyrillic: ["received"], greek: ["received"] };
console.log(`SWARM · ch${CH} · ${ctx.script}/${LANG} · context biases: ${contextHints[ctx.script]?.join(", ") || "base"}`);

// ── 4. THE SHAPE (golden-free fitness) + noise floor ──
const nullRun = spawnSync("node", [path.join(HERE, "null-arm.mjs"), BOOK, String(CH), ...langFlags], { encoding: "utf8", timeout: 120000 });
const nullLine = nullRun.stdout.split("\n").find((l) => l.includes("found in NOISE"));
const NOISE_FLOOR = nullLine ? Number((nullLine.match(/found in NOISE: (\d+) arrangements/) ?? [])[1] ?? 0) : 0;
// THE WITNESS'S BAR, DERIVED FROM THE NULL (2026-09-13). The null-arm
// already reports how much the reader folds a being into itself on
// structureless material — its own self-referent-folds count IS the
// false-positive floor for closure. A reading whose openness (passage /
// deposits) is below the null's is folding into itself more than noise
// does: the field is closing, and the witness answers re-ground, never
// accumulate. The bar is the null's own numbers, never a hand-set
// threshold (ground-closure.js's own header).
const nullSelfFolds = nullLine ? Number((nullLine.match(/(\d+) self-referent folds/) ?? [])[1] ?? 0) : 0;
const nullAbsences = nullLine ? Number((nullLine.match(/(\d+) typed absences/) ?? [])[1] ?? 0) : 0;
const NULL_SHAPE = { selfReferentFolds: nullSelfFolds, contests: 0, movesHolograph: 0, typedAbsences: nullAbsences };
const witnessOf = (s) => closureOf({ shape: s, nullShape: NULL_SHAPE });
function fitness(s, nf) { if (s.recoverability !== 1) return 0; const sig = Math.max(0, s.emitted - nf); return 0.4 * s.referentPurity + 0.3 * (1 - s.voidRate) + 0.3 * (s.emitted ? sig / s.emitted : 0) + holographHealth(s); }
// ── LOOK AT THE HOLOGRAPH ITSELF (2026-09-12) — a REAL strategy. The
// reading's own record names its own gaps: self-referent folds (the reader
// folded a being into itself — the Marmeladov shape), untyped contests
// (ambiguity needing a witness), and movesHolograph (the dynamics actually
// moving). A healthy holograph has zero folds, few contests, and the
// expectations it opens actually resolving. This is the error-correction
// signal the swarm chases, beside the cross-language Rosetta anchors. The
// weights are small and DECLARED (the holograph's health is a tie-breaker
// and a warning, never a replacement for purity/void/signal).
//
// THE WITNESS RIDES ON TOP (2026-09-13): the openness verdict is the
// structural term — a closing/closed field is penalised by the full
// witness margin, not a hand-set weight, because the witness's whole job
// is to answer re-ground when the field closes. The drift (attention
// wandered) is reported for the archon, never typed into the score.
function holographHealth(s) {
  const w = witnessOf(s);
  const opennessPenalty = w.verdict === "closed" ? 0.2 : w.verdict === "closing" ? 0.1 : 0;
  return -0.1 * (s.selfReferentFolds ?? 0) - 0.05 * (s.contests ?? 0) + 0.02 * (s.movesHolograph ?? 0) - opennessPenalty;
}
// ── THE ACCOMPLISHMENT LINE — every swarm-produced reading appends to its
// OWN ledger a record of HOW it was accomplished (the strategy: the config,
// the MHC/terrain, the holograph-health, the collective lexicon, the Rosetta
// anchors). The log must say how the reading was made, so a future reader
// can see the method beside the finding — the genealogy on the ledger.
function accomplishment(ids, shape, f, { lexicon = null, note = "" } = {}) {
  const entry = {
    schema: "EOTAccomplishment@1",
    at: new Date().toISOString().slice(0, 10),
    strategy: "swarm — holograph-health + golden-free shape, Wilson the archon",
    config: nameFor(ids), mhc: levelOf(ids), terrain: terrainOf(ids),
    shape: f, holograph: { selfReferentFolds: shape.selfReferentFolds, contests: shape.contests, movesHolograph: shape.movesHolograph, voids: shape.voids },
    witness: (() => { const w = witnessOf(shape); return { verdict: w.verdict, openness: w.openness, nullOpenness: w.nullOpenness, answer: witnessAnswer(w).action }; })(),
    lexicon, note,
  };
  fs.appendFileSync(variantLedger(ids), JSON.stringify(entry) + "\n");
  return entry;
}
// ── THE ERROR-CORRECTION CHASE ── the swarm does not score a reading cold.
// A variant is measured TWICE: its first read, then its CORRECTED read (the
// reread loop — the revision/elenchus machinery appending corrections). The
// fitness is shape + a CORRECTION BONUS for how much the correction
// improved it: the swarm selects for readings that GET BETTER when
// corrected, which is how the BASELINE improves. A reading that is already
// clean (delta 0) and one that cannot be corrected both score flat; only a
// reading whose errors are correctable earns the bonus. CORRECTION_BONUS is
// declared (0.5), never tuned.
const CORRECTION_BONUS = 0.5;
function correctedFitness(ids, nf) {
  const s1 = run(ids, false);
  const f1 = fitness(s1, nf);
  const s2 = run(ids, true); // the reread = the correction pass
  const f2 = fitness(s2, nf);
  const delta = f2 - f1;
  return { f: f1 + CORRECTION_BONUS * Math.max(0, delta), f1, f2, delta, s2 };
}
function run(ids, loop) {
  const ledger = variantLedger(ids);
  const extra = loop ? ["--prior=1"] : [];
  spawnSync("node", [path.join(HERE, "eot-jsonl.mjs"), BOOK, String(CH), `--ledger-name=${path.basename(ledger, ".eot.jsonl")}`, ...langFlags, ...flagsFor(ids), ...extra], { encoding: "utf8", timeout: 120000 });
  return shapeOf(ledger, BOOK);
}
function golden(ledgerPath) { if (!IS_AIW) return null; try { const g = JSON.parse(fs.readFileSync(path.join(HERE, "goldens", `aiw-ch${CH}.json`), "utf8")); const LS = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)); const props = LS.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1); const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim(); const ct = (t) => (norm(t).match(/[\p{L}\p{N}’']+/gu) ?? []).filter((w) => !["the","a","an","and","or","of","to","in","with","her","his","its","their","our","my","your","there","she","he","it","they","was","were","had","have","been","being","as","at","by","for","from","on","that","this","these","those"].includes(w)); const sets = props.map((a) => ({ e1: new Set(ct(a.end1)), e2: new Set(ct(a.end2)) })); let cov = 0; for (const p of g.propositions) { const e1 = new Set(ct(p.end1)), pred = new Set([...ct(p.label), ...ct(p.end2)]); if (!e1.size && !pred.size) { cov += 1; continue; } if (sets.some(({ e1: A, e2: B }) => (e1.size === 0 || [...e1].some((w) => A.has(w))) && (pred.size === 0 || [...pred].some((w) => B.has(w))))) cov += 1; } return cov / g.propositions.length * 100; } catch { return null; } }

// ── 5. STIGMERGY (shadows+echoes, breakthrough only), DMD+Born, survivalism, genealogy ──
const shadows = [];
const GENEALOGY = path.join(HERE, "results", "swarm-genealogy.jsonl");
const genealogy = [];
const recordBirth = (gen, parents, ids, c, stance = "Watching") => { const e = { born: gen, parents: parents.map((p) => nameFor(p.ids) ?? "seed"), genotype: ids.join("+"), context: c, stance, fate: "alive" }; genealogy.push(e); fs.appendFileSync(GENEALOGY, JSON.stringify(e) + "\n"); return e; };
const recordFate = (e, fate, shape) => { e.fate = fate; if (shape !== undefined) e.shape = shape; fs.appendFileSync(GENEALOGY, JSON.stringify({ ...e, __fate: true }) + "\n"); };
const fitnessSeries = new Map();
const recordSeries = (ids, f) => { const k = ids.join(","); const a = fitnessSeries.get(k) ?? []; a.push(f); fitnessSeries.set(k, a); };
// ── THE BREAKTHROUGH STORE (positive results preserved AGAINST the
// reading's own echo/shadow, for future systems). A breakthrough (a variant
// that survived the elenchus and moved the shape) is recorded keyed by the
// READING's deidentified residue — its ECHO (a coarse signature: "something
// like this was read here") and its SHADOW (state + pointer, no words). A
// future system given a new reading computes that reading's echo, queries
// the store, and retrieves the winning configuration — the swarm's positive
// results become retrievable knowledge for any system that later reads
// similar material. Append-only, never overwritten; the disk holds the
// winners keyed to their residue, not the actions that found them.
const BREAKTHROUGHS = path.join(HERE, "results", "swarm-breakthroughs.jsonl");
const readingEcho = (shape) => { const b = [shape.referentPurity >= 0.5 ? 1 : 0, shape.voidRate < 0.5 ? 1 : 0, shape.perSentence >= 2 ? 1 : 0].join(""); return `r${b}`; };
const readingShadow = (ids, shape) => ({ script: ctx.script, lang: LANG, axes: { purity: shape.referentPurity, void: shape.voidRate, signal: shape.emitted }, pointer: variantLedger(ids) });
const preserveBreakthrough = (ids, shape, f, gen, delta = 0) => {
  // THE TRAIL IS BORN-WEIGHTED (2026-09-13). The correction delta is the
  // ant's return; the trail it lays is that return's born mass Δ²/ΣΔ² over
  // the colony's observed improvements. A real find leaves a strong trail,
  // a reroll leaves nothing — the strength a future system retrieves by.
  const totalMass = observedDeltas.reduce((a, b) => a + b * b, 0);
  const mass = delta > 0 && totalMass > 0 ? (delta * delta) / totalMass : 0;
  const entry = { schema: "SwarmBreakthrough@1", at: new Date().toISOString().slice(0, 10), gen, echo: readingEcho(shape), shadow: readingShadow(ids, shape), variant: ids.join("+"), mhc: levelOf(ids), terrain: terrainOf(ids), shape: f, mass, delta };
  fs.appendFileSync(BREAKTHROUGHS, JSON.stringify(entry) + "\n");
  return entry;
};
const queryBreakthroughs = (shape) => {
  if (!fs.existsSync(BREAKTHROUGHS)) return [];
  const echo = readingEcho(shape);
  return fs.readFileSync(BREAKTHROUGHS, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.echo === echo).sort((a, b) => (b.mass ?? 0) - (a.mass ?? 0));
};
function bornWeights(cands) {
  const cols = Math.max(1, ...cands.map((c) => fitnessSeries.get(c.join(","))?.length ?? 0));
  if (cols < 2) return null;
  const X = cands.map((c) => { const a = fitnessSeries.get(c.join(",")) ?? []; return Array.from({ length: cols }, (_, i) => a[i] ?? a[a.length - 1] ?? 0); });
  const Xp = X.map((r) => [r[1] ?? r[0], ...r.slice(0, -1)]);
  // THE MODE->CANDIDATE MAPPING, FIXED (2026-09-13). The previous cut
  // returned one born weight PER EIGENVALUE (rank modes) and indexed them
  // into cands (nCands) — misaligned whenever nCands > rank, and wrong in
  // kind: an eigenvalue is a SYSTEM-level mode, while a CANDIDATE's
  // participation in that mode is its amplitude, read off the mode's
  // eigenvector, not the eigenvalue. The Born rule is per-candidate:
  // p_i = |u_i|^2 over the mode that carries the growth. Take the mode
  // with the largest eigenvalue magnitude (the dominant direction of the
  // trajectory) and weight each candidate by its squared amplitude in
  // that mode's left singular vector (the SVD's U column — dmd's own
  // economySVD). Length-correct by construction: U has one row per
  // candidate.
  const { U, s } = economySVD(X, { rank: Math.min(X.length, cols) });
  const lam = dmd(X, Xp, { rank: Math.min(X.length, cols) }).eigenvalues;
  if (!U.length || !lam.length) return null;
  const dominant = lam.reduce((a, b) => (b.magnitude > a.magnitude ? b : a), lam[0]);
  const idx = lam.indexOf(dominant);
  const u = U.map((row) => row[idx] ?? 0); // candidate amplitudes in the dominant mode
  const born = u.map((a) => a * a);
  const total = born.reduce((a, b) => a + b, 0);
  return total > 0 ? born.map((b) => b / total) : null;
}
// ── ENERGY IS BORN-CHARGED (2026-09-13). The old ECONOMY charged
// ENERGY_COST=1 per attempt regardless of outcome — a colony goes dormant
// BY REFUSING (measured: everything refused, parents drained, population
// emptied while the seed persisted). The charge now lands only on an
// UNINFORMATIVE attempt (a reroll — delta within the measured rerun-null
// floor, i.e. an attempt that deposited no born mass); a variant that
// deposits born mass REPLENISHES. Dormancy follows Wilson's actual
// economics: starvation of real finds, never the act of foraging.
const ENERGY_START = 3, ENERGY_COST = 1, ENERGY_GAIN = 2, CARRY = 8;
const energy = new Map();
const elenchus = [];
// ── THE STARTLE RESPONSE (the aperture regime's own logic, wired into the
// swarm): a sharp move in the baseline shape IS a startle — attention
// narrows to the moment and a REC fires on the reading system. The
// threshold is MEASURED from the trajectory's own recent variance (a move
// beyond 2x the running sigma is censored-above — the aperture's own
// "placed arrival reads 1-rank" discipline), never a hand-picked number.
// On startle, Wilson RECs: re-grounds at the current best and descends one
// level, the same re-zero the aperture's contraction produces in the fold.
const startle = { sigmas: [], lastBest: null, fired: 0 };
function maybeStartle(f, gen) {
  if (startle.lastBest === null) { startle.lastBest = f; return false; }
  const d = Math.abs(f - startle.lastBest);
  startle.lastBest = f;
  startle.sigmas.push(d);
  if (startle.sigmas.length < 2) return false;
  const n = startle.sigmas.length;
  const mu = startle.sigmas.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(startle.sigmas.reduce((a, b) => a + (b - mu) ** 2, 0) / n) || 1e-9;
  // THE STARTLE FLOOR IS THE MEASURED RERUN-NULL (2026-09-13), never a
  // hand-set 0.01. A move is a startle only when it clears BOTH 2σ of the
  // running trajectory AND the shape's own reproducibility floor (a move
  // smaller than what the read itself varies by is not a surprise, it is
  // noise). Set from the seed's rerun-null before the storm; the old
  // `> 0.01` was the class of hand-set threshold this file's own laws
  // forbid (eoreader6.1/CLAUDE.md: never tune a number by checking what it
  // does to a golden).
  const startled = d > 2 * sd && d > (startle.floor ?? 0.01);
  if (startled) startle.fired += 1;
  return startled;
}

// ── 6. THE STORM ──
// The seed is the RATIONAL set (not every legal combination — running 28
// full reads per generation is the "fill the disk" the law forbids; the
// swarm explores from a sane seed and breeds from there).
const SEED = [
  [], ["received"], ["received", "reduced"], ["received", "nps"], ["received", "deep"],
  ["received", "reduced", "nps"], ["received", "nps", "deep"], ["received", "reduced", "nps", "deep"],
].filter(legal);
let pop = SEED.map((ids) => ({ ids, s: run(ids, false), f: 0 }));
for (const p of pop) { const c = correctedFitness(p.ids, NOISE_FLOOR); p.s = c.s2; p.f = c.f; p.delta = c.delta; }
let best = [...pop].sort((a, b) => b.f - a.f)[0];
const seen = new Map(pop.map((p) => [p.ids.join(","), p]));
console.log(`seed: ${LEGAL.length} legal compositions; best=${nameFor(best.ids)} @MHC${levelOf(best.ids)} terrain ${terrainOf(best.ids).join("/")} shape ${best.f.toFixed(3)}`);
// ── THE ELENCHUS BAR, MEASURED (2026-09-13). The old `+0.005` stood five
// orders of magnitude above the shape's reproducibility floor (measured:
// 21 genotypes -> the identical 16-digit shape). The bar is now the
// seed's own RERUN-NULL: the same variant read RERUN_NULL.draws times,
// the max |Δ| between reruns IS the floor for "this variant differs."
// A deterministic read measures ~0 and the bar collapses to epsilon — any
// real positive delta recruits. Measured, never set (elenchus-bar.mjs).
const rerunShapes = [];
for (let d = 0; d < RERUN_NULL.draws; d++) { const rs = run(best.ids, false); rerunShapes.push(fitness(rs, NOISE_FLOOR)); }
const ELENCHUS_BAR = elenchusBar(rerunShapes);
// The startle floor is the same measured reproducibility floor — a shape
// move below it is the read's own noise, never a surprise.
startle.floor = ELENCHUS_BAR;
console.log(`elenchus bar: rerun-null over ${RERUN_NULL.draws} reads of the seed (draws ${RERUN_NULL.draws}, seed ${RERUN_NULL.seed}) — floor ${rerunShapes[0].toFixed(6)} vs reruns → bar ${ELENCHUS_BAR.toExponential(2)} (the old +0.005 is ${(0.005 / ELENCHUS_BAR).toFixed(0)}x above this)`);
// The colony's observed corrections — the ant's return, for the breakthrough
// trail's born mass (preserveBreakthrough). Kept separate from the ADMISSION
// gauge: admitting on the correction delta (which the reread routinely makes
// negative) is the wiring that refused 416 births and kept 0.
const observedDeltas = [];
// THE GATE (2026-09-16): one shared admission, IMPROVEMENT-over-champion. A
// candidate clears the MEASURED bar AND carries born mass over the colony's
// own observed IMPROVEMENTS (never its correction deltas) — the contract
// elenchus-bar.mjs's bornAcceptance documents. Per-terrain champions let a
// specialist be selected against its own ground, not the global best.
const gate = createSwarmGate({ bar: ELENCHUS_BAR });
for (const p of pop) gate.record(p.ids, terrainOf, p.f); // the seed champions every terrain it covers
let descents = 0;
for (let gen = 1; gen <= GENS; gen++) {
  const ranked = [...pop].sort((a, b) => b.f - a.f);
  let moved = false;
  // RANDOM SEED (REC·Ground) — always explore.
  {
    const rand = LEGAL[Math.floor(Math.random() * LEGAL.length)];
    const rk = rand.join(",");
    if (!seen.has(rk)) {
      seen.set(rk, true);
      const rc = correctedFitness(rand, NOISE_FLOOR); const rf = rc.f; const cDelta = rc.delta;
      observedDeltas.push(cDelta);
      const rImp = rf - gate.championFor(rand, terrainOf, best.f);
      gate.recordImprovement(rImp);
      recordSeries(rand, rf);
      const rb = recordBirth(gen, [], rand, `${ctx.script}:${LANG}`, stanceOf("REC", "Ground"));
      if (gate.admits(rImp)) {
        recordFate(rb, "kept", rf); gate.record(rand, terrainOf, rf);
        if (rf > best.f) best = { ids: rand, s: rc.s2, f: rf };
        moved = true; preserveBreakthrough(rand, rc.s2, rf, gen, cDelta);
        console.log(`  gen ${gen} RANDOM KEPT ${nameFor(rand)}: ${rf.toFixed(3)} (REC·Ground — a random proposal broke through, preserved)`);
      } else { recordFate(rb, "refused", rf); console.log(`  gen ${gen} RANDOM ${nameFor(rand)}: ${rf.toFixed(3)} refused (exploration, lineage kept)`); }
    }
  }
  // BREED (CON·Figure) + MUTATE (SIG/INS·Figure). SELECTION IS BY BORN
  // MASS (2026-09-13): bornWeights was defined and never called — the DMD
  // decomposition of the fitness series into |λ|² born mass is what decides
  // WHICH variants the colony breeds. The top-3-by-scalar was the flat
  // "breed the top-3" that ignored growth and frequency; the DMD modes ARE
  // the synergy (combination breeding is what the eigenvectors are). A
  // variant whose trajectory sits in a growing mode (|λ| > 1) is bred; a
  // decaying one (|λ| < 1) fades. Fall back to the ranked top-3 only when
  // the series is too short to decompose (a declared shortage, never a
  // silent default).
  const breeders = (() => {
    const weights = bornWeights(pop.map((p) => p.ids));
    if (!weights) return ranked.slice(0, 3);
    const byBorn = pop.map((p, i) => ({ p, w: weights[i] ?? 0 })).sort((a, b) => b.w - a.w);
    return byBorn.slice(0, 3).map((x) => x.p);
  })();
  for (const p of breeders) {
    for (const o of ORGANS) {
      const trial = p.ids.includes(o.id) ? p.ids.filter((x) => x !== o.id) : [...p.ids, o.id];
      if (!legal(trial)) { elenchus.push({ gen, proposal: `${nameFor(p.ids)}+/-${o.name}`, reason: "DAG" }); continue; }
      const key = trial.join(",");
      const birth = recordBirth(gen, [p], trial, `${ctx.script}:${LANG}`, stanceOf("CON", "Figure"));
      if (seen.has(key)) { recordFate(birth, "retried"); continue; }
      seen.set(key, true);
      const c = correctedFitness(trial, NOISE_FLOOR); const s = c.s2; const f = c.f; const cDelta = c.delta; observedDeltas.push(cDelta);
      const improvement = f - gate.championFor(trial, terrainOf, best.f);
      gate.recordImprovement(improvement);
      recordSeries(trial, f);
      // BORN-CHARGED: a kept trial replenishes; a refused (uninformative)
      // trial costs the energy of its own reroll. The parent is NOT charged
      // for breeding — foraging is not the cost; rerolling is.
      if (gate.admits(improvement)) {
        shadows.push({ gen, ...{ level: levelOf(trial), terrain: terrainOf(trial), ids: trial, shape: f } });
        preserveBreakthrough(trial, s, f, gen, cDelta);
        energy.set(key, (energy.get(key) ?? ENERGY_START) + ENERGY_GAIN);
        recordFate(birth, "kept", f);
        gate.record(trial, terrainOf, f);
        if (f > best.f) best = { ids: trial, s, f };
        moved = true;
        console.log(`  gen ${gen} KEPT ${nameFor(trial)} @MHC${levelOf(trial)} ${terrainOf(trial).join("/")}: ${f.toFixed(3)} (+${improvement.toFixed(3)}) — shadow left, energy ${energy.get(key)}`);
      } else { elenchus.push({ gen, proposal: `${nameFor(trial)}`, f, reason: "degraded" }); energy.set(key, (energy.get(key) ?? ENERGY_START) - ENERGY_COST); recordFate(birth, "refused", f); console.log(`  gen ${gen} REFUSED ${nameFor(trial)}: ${f.toFixed(3)} (energy ${energy.get(key)})`); }
    }
    // DORMANCY: legal variants never die — only a variant that keeps
    // rerolling (depositing no born mass) starves.
    if ((energy.get(p.ids.join(",")) ?? ENERGY_START) <= 0) { pop = pop.filter((x) => x.ids.join(",") !== p.ids.join(",")); recordFate(genealogy.filter((e) => e.genotype === p.ids.join("+") && e.fate === "alive").slice(-1)[0] ?? {}, "dormant"); console.log(`  gen ${gen} ${nameFor(p.ids)} DORMANT (starvation of real finds — the act of foraging never cost it)`); }
  }
  while (pop.length > CARRY) { const w = pop.sort((a, b) => a.f - b.f)[0]; pop = pop.filter((x) => x !== w); recordFate(genealogy.filter((e) => e.genotype === w.ids.join("+") && e.fate === "alive").slice(-1)[0] ?? {}, "dormant"); console.log(`  gen ${gen} ${nameFor(w.ids)} DORMANT (capacity) — lineage preserved`); }
  // SEG · THE DIFFERENTIATE FACE (2026-09-16). The swarm bred (Relate) and
  // re-seeded (Generate) but never split (Differentiate): every variant was
  // "turn an organ off", so the full reader won by monotonicity and the
  // swarm's 0-kept record is exactly that hole. SEG·Figure splits the best
  // into its terrain-specialists; each specialist is measured against ITS
  // terrain's champion, so a specialist that outreads the generalist on its
  // own ground is kept — the landscape stops being monotone.
  for (const { t, ids: spec } of specialistsOf(best.ids, { terrainOfOrgan: (id) => byId.get(id).terrain, depsOf, legal })) {
    const key = spec.join(",");
    if (seen.has(key)) continue;
    seen.set(key, true);
    const birth = recordBirth(gen, [best], spec, `${ctx.script}:${LANG}:seg`, stanceOf("SEG", "Figure"));
    const c = correctedFitness(spec, NOISE_FLOOR);
    observedDeltas.push(c.delta);
    const sImp = c.f - gate.championFor(spec, terrainOf, best.f);
    gate.recordImprovement(sImp);
    recordSeries(spec, c.f);
    if (gate.admits(sImp)) {
      gate.record(spec, terrainOf, c.f);
      recordFate(birth, "kept", c.f);
      preserveBreakthrough(spec, c.s2, c.f, gen, c.delta);
      if (c.f > best.f) best = { ids: spec, s: c.s2, f: c.f };
      moved = true;
      console.log(`  gen ${gen} SEG KEPT ${nameFor(spec)} → ${t} (Dissecting — a specialist outread the generalist): ${c.f.toFixed(3)}`);
    } else {
      recordFate(birth, "refused", c.f);
      console.log(`  gen ${gen} SEG ${nameFor(spec)} → ${t}: ${c.f.toFixed(3)} refused (the generalist still holds ${t})`);
    }
  }
  // LOOPS ON LOOPS (EVA·Ground / the atmosphere's reread). Re-run the first
  // read first: with per-variant ledgers the reread must diff against ITS OWN
  // read, never a stale foreign ledger (the -0.365 "reread" in the old log
  // was the earned-only read folded into another variant's union).
  run(best.ids, false);
  const sl = run(best.ids, true); const fl = fitness(sl, NOISE_FLOOR);
  console.log(`  gen ${gen} reread loop on ${nameFor(best.ids)}: ${fl.toFixed(3)} (was ${best.f.toFixed(3)})`);
  if (fl > best.f) best = { ids: best.ids, s: sl, f: fl };
  // THE STARTLE RESPONSE — a sharp shape-move narrows attention and fires a REC.
  if (maybeStartle(best.f, gen)) {
    console.log(`  gen ${gen} STARTLE: shape moved ${startle.sigmas[startle.sigmas.length-1].toFixed(3)} beyond 2σ — attention narrows, REC fires`);
    const rec = run(best.ids, true); const rf = fitness(rec, NOISE_FLOOR);
    if (rf > best.f) { best = { ids: best.ids, s: rec, f: rf }; console.log(`  gen ${gen} REC KEPT re-grounded ${nameFor(best.ids)}: ${rf.toFixed(3)}`); moved = true; }
  }
  // DESCENT (REC — the atmosphere decides): if the best is AT/BELOW the
  // noise floor, the ground is conceded: re-seed ONE MHC/terrain lower.
  // THE WITNESS ANSWERS THE SAME GATE (2026-09-13): a reading whose field
  // is closing/closed must be re-grounded even at a high shape — a high
  // score achieved by folding the reading into itself is exactly the habit
  // forming, and the witness's one job is to refuse accumulation onto a
  // closing field (ground-closure.js: witnessAnswer -> re-ground).
  const witnessGate = witnessOf(best.s).verdict === "closing" || witnessOf(best.s).verdict === "closed";
  if ((best.f < 0.55 && best.f > 0 && descents < 3) || (witnessGate && descents < 3)) {
    if (witnessGate && best.f >= 0.55) console.log(`  gen ${gen} WITNESS: the field is ${witnessOf(best.s).verdict} (openness ${witnessOf(best.s).openness.toFixed(3)} < null ${witnessOf(best.s).nullOpenness.toFixed(3)}) — the reweighting is becoming habit; REC fires`);
    descents += 1;
    const lower = ORGANS.filter((o) => o.level <= levelOf(best.ids) - 1);
    const lowerIds = lower.filter((o) => contextHints[ctx.script]?.includes(o.id) || o.level <= levelOf(best.ids) - 2).map((o) => o.id);
    const reseed = lowerIds.length ? lowerIds : ["received"];
    if (legal(reseed)) {
      console.log(`  gen ${gen} DESCENT (REC): shape ${best.f.toFixed(3)} below bar -> re-ground @MHC${levelOf(reseed)} ${terrainOf(reseed).join("/")} (${nameFor(reseed)})`);
      const birth = recordBirth(gen, [best], reseed, `${ctx.script}:${LANG}:re`, stanceOf("REC", "Ground"));
      const rc2 = correctedFitness(reseed, NOISE_FLOOR); const rf = rc2.f;
      if (rf > best.f) { best = { ids: reseed, s: rc2.s2, f: rf }; gate.record(reseed, terrainOf, rf); recordFate(birth, "kept", rf); moved = true; console.log(`  gen ${gen} DESCENT KEPT ${nameFor(reseed)}: ${rf.toFixed(3)} (+${(rf - best.f).toFixed(3)})`); }
      else recordFate(birth, "refused", rf);
    }
  }
  if (!moved && fl <= best.f) { console.log(`  gen ${gen} approaching the limit — no current improvement (a pause, never a finish; the swarm keeps the trajectory).`); if (gen >= 2) break; }
}

const g = golden(variantLedger(best.ids));
const prior = queryBreakthroughs(best.s);
console.log(`startle: ${startle.fired} REC-firing surprise(s) on the reading system`);
const finalWitness = witnessOf(best.s);
console.log(`witness: the field is ${finalWitness.verdict} — openness ${finalWitness.openness === null ? "n/a" : finalWitness.openness.toFixed(3)} vs the null's ${finalWitness.nullOpenness === null ? "n/a" : finalWitness.nullOpenness.toFixed(3)} (${witnessAnswer(finalWitness).action})`);
console.log(`terrain champions: ${[...gate.bestByTerrain.entries()].map(([t, v]) => `${t}=${nameFor(v.ids)}@${v.f.toFixed(3)}`).join(" · ") || "none"}`);
console.log(`breakthrough store: ${prior.length} prior winner(s) keyed to this reading's echo (${readingEcho(best.s)}) — future systems retrieve by this residue`);
console.log(`\nCURRENT BEST (asymptotic — no final answer, always revisable): ${nameFor(best.ids)} @MHC${levelOf(best.ids)} terrain ${terrainOf(best.ids).join("/")} — shape ${best.f.toFixed(3)}${best.delta !== undefined ? ` (correction +${best.delta.toFixed(3)})` : ""} | golden: ${g === null ? "none" : g.toFixed(1) + "%"} | descents ${descents}`);
console.log(`elenchus ${elenchus.length} (${elenchus.filter((e) => e.reason === "DAG").length} DAG, ${elenchus.length - elenchus.filter((e) => e.reason === "DAG").length} degraded) · genealogy ${genealogy.length} births (append-only ${path.relative(process.cwd(), GENEALOGY)}) · shadows ${shadows.length} breakthroughs`);
console.log(`the 27 creation-kinds are declared (${CELLS.length} cells); the fast ones wired: breeding CON·Figure, random REC·Ground, DMD/Born SYN·Pattern, trace SIG·Pattern, elenchus EVA·Figure, reread EVA·Ground, descent REC·Pattern.`);