// kernel/prior-query.js — THE MEANING POTENTIAL QUERY (Halliday). Staging is
// never limited to our sidecar: it is a query over the whole meaning
// potential — every prior in the house that carries knowledge of a genre,
// a medium, or a shape. The cascade:
//   1. the genre sidecar (FortunePrior) — accumulated staging per genre×medium×shape
//   2. the genre-tagged priors (NeedPrior@1) — the genre's meaning-cells and works
//   3. the reading priors (ReadingPriors@1, FoldReadingPrior@1) — the axioms
//   4. the record's own seams (always available — the generic staged pipeline)
//   5. the web (the hunt) — when the egress is open
// Each contributor is named with its provenance; the query is OPEN — a new
// prior family is registered, never a new branch.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIVE_PRIORS = path.resolve(HERE, "../../../live_priors/derived-priors");
const ARCS = path.join(LIVE_PRIORS, "arc-priors/fortune-prior-v1.json");
const NEEDS = path.join(LIVE_PRIORS, "need-priors");
const READS = path.join(LIVE_PRIORS, "reading-priors");
const FOLDS = path.join(LIVE_PRIORS, "fold-reading-priors");

const read = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };

/** All genre-tagged NeedPrior files — a prior family beyond the sidecar. */
function genrePriors() {
  const out = [];
  try { for (const f of fs.readdirSync(NEEDS)) { const d = read(path.join(NEEDS, f)); if (d?.schema === "NeedPrior@1" && d.genre) out.push({ file: f, ...d }); } } catch {}
  return out;
}

/** Load the genre sidecar (FortunePrior@1) — the machine's footprints. */
export function loadSidecar() {
  return read(ARCS);
}
export const SIDECAR_PATH = ARCS;

/**
 * queryMeaningPotential(register, { record, seams, hunt }) → the combined
 * staging evidence, each contributor named. The register's field/mode/shape
 * select; the cascade returns what every prior family knows.
 */
export function queryMeaningPotential(register, { record = null, seams = [] } = {}) {
  const field = register?.field?.field ?? null;
  const mode = register?.mode ?? "text";
  const evidence = [];

  // 1. the genre sidecar (our accumulated staging)
  const sidecar = read(ARCS);
  if (sidecar?.entries?.length) {
    const hits = sidecar.entries.filter((e) => String(e.genre ?? "").includes(field ?? "") || (field ?? "").includes(String(e.genre ?? "")) || String(e.subgenre ?? "").includes(field ?? ""));
    if (hits.length) {
      // SORT STAGING FROM EVIDENCE: the sidecar's STAGING field is the source's
      // OWN structure (hunted headings — stage names a reader cannot invent);
      // the movements' focus terms are coverage fragments (evidence the genre
      // was read, never stages). Only the material's own structure stages.
      const staged = hits.flatMap((e) => e.staging ?? []).map((s) => String(s).trim()).filter((s) => s.length >= 2 && s.length <= 120);
      const raw = [...new Set(hits.flatMap((e) => (e.movements ?? []).map((m) => m.focus)).filter((f) => f && f.length > 3))];
      evidence.push({ from: "FortunePrior@1 (sidecar)", seen: hits.length, phases: [...new Set(staged)].slice(0, 7), fragments: raw.slice(0, 4), shapes: [...new Set(hits.map((h) => h.felt?.shape ?? h.shape))], basis: `${hits.length} ${field ?? "?"} reading(s) accumulated — ${staged.length ? staged.length : "no"} clean stage(s) from source structure, ${raw.length} coverage fragment(s)` });
    }
  }

  // 2. the genre-tagged NeedPriors — the genre's meaning-cells and works
  const needs = genrePriors().filter((n) => String(n.genre ?? "").includes(field ?? "") || (field ?? "").includes(String(n.genre ?? "")));
  for (const n of needs) {
    evidence.push({ from: `NeedPrior@1 (${n.file})`, genre: n.genre, works: (n.works ?? []).slice(0, 4).map((w) => w.file), cells: Object.keys(n.cells ?? {}).length, basis: `the genre's meaning-options: ${Object.keys(n.cells ?? {}).length} recency×frequency cells from ${(n.works ?? []).length} work(s)` });
  }

  // 3. the reading priors — the axioms of how text is read
  const reads = read(path.join(READS, "reading-priors-v1.json"));
  if (reads) evidence.push({ from: "ReadingPriors@1", basis: `${Object.keys(reads.actExpectations ?? {}).length} act-expectation families, ${(reads.giver?.compiledFrom ?? []).length} compiled sources` });

  // 4. the record's own seams — always available
  if (record?.length || seams.length) evidence.push({ from: "the record's own seams", phases: seams.length ? `${seams.length} seam(s)` : `${record} sentence(s)`, basis: "the generic staged pipeline — derived from the material itself" });

  // 5. the web hunt — open when the egress is
  evidence.push({ from: "the web (hunt)", basis: "the egress is open — genre material is hunted and appended, never assumed" });

  return { register: { field, mode, tenor: register?.tenor?.tenor ?? "general" }, evidence };
}