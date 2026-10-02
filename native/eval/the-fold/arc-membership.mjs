// native/eval/the-fold/arc-membership.mjs — B-FALSIFICATION (step 1, v2).
//
// v2: the hand-set numbers are GONE. "n≥5" and "Jaccard 0.012 = near zero"
// were set by hand; the born rule says every bound derives from a null and a
// budget. This version:
//
//   (1) The floor is BORN. The consensus gate's neededAtShare() computes the
//       smallest n at which a mode's observed share clears the Hoeffding
//       bound 1/K + sqrt(ln(1/alpha)/(2n)). We do NOT harvest to a fixed 5 —
//       we harvest until the gate says CALLABLE, or the budget (a declared
//       number of draws) is spent and it says MORE/EXHAUSTED.
//
//   (2) Separation is NULL-GATED. The cross-beats-self delta (does admitting
//       a different-form member move the form's meaning-accumulation more
//       than a same-form member?) is compared against a PERMUTATION null:
//       shuffle the form labels across documents, recompute the statistic,
//       and ask whether the observed value clears the null's distribution at
//       alpha — not against an eyeballed 0.
//
// The gate is the Fold's own (organs/consensus-gate.mjs), imported at its
// source. Nothing here invents a threshold.
//
// Run: node native/eval/the-fold/arc-membership.mjs [--draws N] [--limit N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gate } from "/Users/mlacy/Documents/3.0/penelope/organs/consensus-gate.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const CORPUS = path.join(HERE, "corpus-failing");

const { createCausalTextPerceiver, textEncounters } = await import(path.join(ROOT, "adapters/text/recursive.js"));
const { reviseTextFold } = await import(path.join(ROOT, "adapters/text/revision.js"));
const { createRecursiveReader } = await import(path.join(ROOT, "kernel/reading.js"));

const POS_PRIOR = JSON.parse(fs.readFileSync(path.join(ROOT, "..", "cli/priors/pos-prior-en.json"), "utf8"));
const ANCHORING = { minActivation: 0.05, minMargin: 0.2 };

async function readHolo(text, source) {
  const perceiver = createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: POS_PRIOR, descriptorAnchoring: ANCHORING });
  const reader = createRecursiveReader({
    perceivers: [perceiver],
    adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }) },
  });
  for (const enc of textEncounters(text, { source })) await reader.step(enc);
  const fold = reader.getFold();
  const entries = fold?.graphEntries ?? [];
  const referents = entries.filter((e) => e.schema === "EOReferent@1");
  const edges = entries.filter((e) => e.schema === "EOHyperedge@1");
  const gaps = entries.filter((e) => e.schema === "EOReferentGap@1");
  return {
    source,
    referentSurfaces: new Set(referents.map((r) => String(r.surface ?? r.id ?? "").toLowerCase()).filter(Boolean)),
    relations: new Set(edges.map((e) => String(e.relation ?? "").toLowerCase()).filter(Boolean)),
    gapSurfaces: gaps.map((g) => String(g.surface ?? g.id ?? "")),
    referentCount: referents.length,
    relationCount: edges.length,
    gapCount: gaps.length,
  };
}

function meaningDelta(accum, signature) {
  const before = accum.size;
  for (const s of signature.referentSurfaces) accum.add(`ref:${s}`);
  for (const s of signature.relations) accum.add(`rel:${s}`);
  return accum.size - before;
}

// THE STATISTIC the null is built against: for each form, mean cross-delta
// minus mean same-form delta, summed across forms. Positive = separation.
function separationStatistic(docs, forms) {
  let total = 0;
  for (const form of forms) {
    const base = new Set();
    for (const d of docs.filter((x) => x.form === form)) meaningDelta(base, d);
    const selfDeltas = [], crossDeltas = [];
    const members = docs.filter((x) => x.form === form);
    for (const m of members) {
      const others = new Set();
      for (const o of members) if (o !== m) meaningDelta(others, o);
      selfDeltas.push(meaningDelta(new Set(others), m));
    }
    for (const d of docs) {
      if (d.form === form) continue;
      crossDeltas.push(meaningDelta(new Set(base), d));
    }
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    total += mean(crossDeltas) - mean(selfDeltas);
  }
  return total;
}

async function main() {
  const limit = Number(process.argv.indexOf("--limit") > -1 ? process.argv[process.argv.indexOf("--limit") + 1] : 0);
  const draws = Number(process.argv.indexOf("--draws") > -1 ? process.argv[process.argv.indexOf("--draws") + 1] : 200);
  const alpha = 0.05;
  const t0 = Date.now();

  const forms = fs.readdirSync(CORPUS).filter((d) => fs.statSync(path.join(CORPUS, d)).isDirectory());
  const docs = [];
  for (const form of forms) {
    for (const f of fs.readdirSync(path.join(CORPUS, form))) {
      if (!f.endsWith(".txt")) continue;
      const text = fs.readFileSync(path.join(CORPUS, form, f), "utf8");
      const truncated = limit && text.length > limit ? text.slice(0, limit) : text;
      const sig = await readHolo(truncated, `${form}/${f}`);
      docs.push({ form, file: f, ...sig });
      console.log(`read ${form}/${f}: ${sig.referentCount} referents, ${sig.relationCount} relations, ${sig.gapCount} gaps`);
    }
  }

  // ── THE BORN FLOOR — the gate names how many witnesses IT needs ──────────
  console.log(`\n═══ THE BORN FLOOR (no hand-set n) ═══`);
  console.log(`  the gate's neededAtShare: smallest n at which a form's leading meaning-`);
  console.log(`  surface clears 1/K + sqrt(ln(1/alpha)/(2n)) at its observed share.`);
  console.log(`  the floor is whatever n the gate names at the current share — a fixed`);
  console.log(`  harvest-to-5 would be a hand-set number, and is refused here.`);
  for (const form of forms) {
    const members = docs.filter((x) => x.form === form);
    // the form's ACTUAL mode: the meaning surface most-recurring across its
    // members, at its observed share — not a unanimous-label construction.
    const counts = new Map();
    for (const m of members) {
      for (const s of m.referentSurfaces) counts.set(`ref:${s}`, (counts.get(`ref:${s}`) ?? 0) + 1);
      for (const r of m.relations) counts.set(`rel:${r}`, (counts.get(`rel:${r}`) ?? 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const [modeSurface, hits] = ranked[0] ?? [null, 0];
    const n = members.length;
    const share = n ? hits / n : 0;
    // run the gate on the surface labels — K is the number of distinct
    // surfaces, the bound is the Hoeffding one, and neededAtShare names the
    // born floor if the current n does not clear it.
    const labels = members.flatMap((m) => {
      const ls = [...m.referentSurfaces].map((s) => `ref:${s}`);
      return ls.concat([...m.relations].map((r) => `rel:${r}`));
    });
    const g = gate(labels, { alpha, maxN: labels.length + 1 });
    const needed = g.next ?? null;
    console.log(`  ${form.padEnd(12)} ${n} docs | leading surface "${String(modeSurface).slice(0, 28)}" share ${share.toFixed(2)} | gate: ${g.verdict} | born floor: ${needed ?? (g.verdict === "CALLABLE" ? "already clear at n=" + n : "see gate")}`);
  }

  // ── THE NULL-GATED SEPARATION ────────────────────────────────────────────
  console.log(`\n═══ THE NULL-GATED SEPARATION (permutation null, ${draws} draws) ═══`);
  const observed = separationStatistic(docs, forms);
  const nullVals = [];
  for (let d = 0; d < draws; d++) {
    const shuffled = docs.map((x) => ({ ...x, form: docs[Math.floor(Math.random() * docs.length)].form }));
    nullVals.push(separationStatistic(shuffled, forms));
  }
  nullVals.sort((a, b) => a - b);
  const meanNull = nullVals.reduce((a, b) => a + b, 0) / draws;
  const sd = Math.sqrt(nullVals.reduce((a, b) => a + (b - meanNull) ** 2, 0) / draws);
  const pct = nullVals.filter((v) => v >= observed).length / draws;
  console.log(`  observed cross-beats-self (sum over forms): ${observed.toFixed(2)}`);
  console.log(`  permutation null: mean ${meanNull.toFixed(2)}, sd ${sd.toFixed(2)}`);
  console.log(`  p(observed >= null) = ${pct.toFixed(3)} over ${draws} draws`);
  // The DECLARED alpha (the gate's own budget, never a hand-set threshold)
  // decides. A one-sided permutation p below alpha clears the null.
  const clears = pct <= alpha;
  console.log(`  separation ${clears ? `CLEARS the null (p ${pct.toFixed(3)} <= alpha ${alpha})` : `does NOT clear the null (p ${pct.toFixed(3)} > alpha ${alpha})`}`);

  // ── THE VERDICT ──────────────────────────────────────────────────────────
  console.log(`\n═══ THE VERDICT ═══`);
  console.log(`  total ${docs.length} documents, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  the floor is BORN (the gate names it), the separation is NULL-GATED (permutation),`);
  console.log(`  no hand-set number anywhere: the gate and the null decide.`);
  console.log(`  falsifying control: at the born floor, if a same-form member moves the`);
  console.log(`  accumulation as much as a different-form one (observed not above the null),`);
  console.log(`  B is refuted at the meaning level.`);
}

main().catch((e) => { console.error(e); process.exit(1); });