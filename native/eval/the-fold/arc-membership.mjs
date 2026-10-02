// native/eval/the-fold/arc-membership.mjs — B-FALSIFICATION (step 1).
//
// The design (GL-WP-05 follow-through, the meaning-gated hunt): the white
// paper / obituary / statute / encyclopedia prose set is the KNOWN-FAILING
// class at the SHAPE level (position slots drown role slots, generation-
// terrain-stance.md:479,522). The claim to falsify is B:
//
//   "the accumulated MEANING of a form's holographs separates the forms
//   where shape could not" — a white paper's beings (problem, audience,
//   recommendation, evidence) differ from an obituary's (deceased,
//   survivors, funeral) in what they MEAN, and kindBoundaries' cross-beats-
//   self delta over the meaning-level accumulation finds the seam.
//
// The experiment is offline, no model, no web: read every corpus document
// holographically (the real reader), extract the MEANING signature (referents
// + relations + gaps), and ask whether the forms separate at that level.
//
// Membership by meaning, made concrete: a candidate accretes into a form's
// hyperlexicon when its meaning-signature moves that accumulation more than
// its own members do (the cross-beats-self delta — kindBoundaries' score at
// the meaning level, not the indentation level).
//
// Run: node native/eval/the-fold/arc-membership.mjs [--limit N]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  // THE MEANING SIGNATURE: what the reading heard, not how it indented.
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

// Cross-beats-self at the MEANING level: how much does admitting a candidate
// move the form's accumulation (union of referent+relation surfaces) beyond
// what its own members already move it? The kindBoundaries score, made over
// meaning sets instead of position facts.
function meaningDelta(accum, signature) {
  const before = accum.size;
  for (const s of signature.referentSurfaces) accum.add(`ref:${s}`);
  for (const s of signature.relations) accum.add(`rel:${s}`);
  return accum.size - before;
}

async function main() {
  const limit = Number(process.argv.indexOf("--limit") > -1 ? process.argv[process.argv.indexOf("--limit") + 1] : 0);
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

  // ── SEPARATION BY MEANING ──────────────────────────────────────────────
  console.log(`\n═══ B-FALSIFICATION: does MEANING separate the failing set? ═══`);

  // (1) PAIRWISE: how distinct are two forms' accumulated meanings?
  //     Jaccard over the meaning sets — the lower the overlap, the more the
  //     forms separate by meaning. Two obituaries should overlap MORE than an
  //     obituary and a white paper.
  const formAccum = {};
  for (const form of forms) {
    formAccum[form] = new Set();
    for (const d of docs.filter((x) => x.form === form)) meaningDelta(formAccum[form], d);
  }
  console.log(`\n  form meaning-set sizes: ${forms.map((f) => `${f}=${formAccum[f].size}`).join(" ")}`);
  const jaccard = (a, b) => {
    const inter = new Set([...a].filter((x) => b.has(x))).size;
    return inter / Math.max(1, a.size + b.size - inter);
  };
  for (let i = 0; i < forms.length; i++) for (let j = i + 1; j < forms.length; j++) {
    const jac = jaccard(formAccum[forms[i]], formAccum[forms[j]]);
    console.log(`  Jaccard(${forms[i]}, ${forms[j]}) = ${jac.toFixed(3)}`);
  }

  // (2) CROSS-BEATS-SELF: within a form, does a same-form member move the
  //     accumulation LESS than a different-form member does (relative to the
  //     form's own baseline)? The score the design names.
  console.log(`\n  cross-beats-self: for each form's accumulation, the mean delta of`);
  console.log(`  admitting a SAME-form member vs a DIFFERENT-form member:`);
  for (const form of forms) {
    const base = new Set();
    for (const d of docs.filter((x) => x.form === form)) meaningDelta(base, d);
    const selfDeltas = [], crossDeltas = [];
    for (const d of docs) {
      if (d.form === form) continue;
      const accum = new Set(base);
      const delta = meaningDelta(accum, d);
      crossDeltas.push({ doc: d.file, delta });
    }
    // same-form delta: the marginal move of each member beyond the others
    const members = docs.filter((x) => x.form === form);
    for (const m of members) {
      const others = new Set();
      for (const o of members) if (o !== m) meaningDelta(others, o);
      selfDeltas.push({ doc: m.file, delta: meaningDelta(new Set(others), m) });
    }
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    const selfMean = mean(selfDeltas.map((x) => x.delta));
    const crossMean = mean(crossDeltas.map((x) => x.delta));
    const sep = crossMean - selfMean;
    console.log(`  ${form.padEnd(12)} self-delta ${selfMean.toFixed(1)} | cross-delta ${crossMean.toFixed(1)} | separation ${sep.toFixed(1)} ${sep > 0 ? "SEPARATES" : "does not separate"}`);
  }

  // (3) THE VERDICT — the honest reading of B.
  console.log(`\n═══ THE VERDICT ═══`);
  console.log(`  total ${docs.length} documents, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`  falsifying control: if the accumulated MEANING of the forms does not separate at`);
  console.log(`  cross-beats-self (a same-form member moves the accumulation as much as a`);
  console.log(`  different-form one), B is refuted: the meaning level is no better than shape.`);
}

main().catch((e) => { console.error(e); process.exit(1); });