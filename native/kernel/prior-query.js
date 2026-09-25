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
//
// Handle: Bayes — after asking what is already believed before generating
// from nothing. NOT a claim of calibrated probability: this module never
// computes a posterior or a likelihood ratio (organs/corroboration.js
// already drew that line — "the witness's true p(yes|true)/p(yes|false)
// have not been measured, and inventing them would be worse than unit
// steps"). Bayes's actual job is narrower and honest: consult every real
// prior family this house has (native/kernel/rhythm-priors.js/Tala for
// WHEN, native/kernel/experience-priors.js/Vasana for residual cross-work
// impressions, this cascade for genre/staging via live_priors/derived-priors)
// BEFORE a caller falls back to a hand-written template — never silently
// skip the asking. Registered 2026-09-17 (archon-bayes-priors) after a
// "write me a sonnet" request was answered from register.js's VOICE_BY_FIELD
// template alone, though this exact cascade — with one real "lyric" entry
// already in the sidecar — sits one function call away. Amendment XVII.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LIVE_PRIORS = path.resolve(HERE, "../../../live_priors/derived-priors");

// Read fresh on every call, like correction-rule.js's correctionRulesFile —
// never cached at import time — so a test can point this at a fixture
// directory (ER7_LIVE_PRIORS) without a fresh module instance per case, and
// so a real corpus edited between calls (live_priors is a real, actively
// edited local checkout) is never served stale.
export function livePriorsDir(explicit) {
  return explicit ?? process.env.ER7_LIVE_PRIORS ?? DEFAULT_LIVE_PRIORS;
}
const arcsPath = (dir) => path.join(dir, "arc-priors/fortune-prior-v1.json");
const needsDir = (dir) => path.join(dir, "need-priors");
const readsPath = (dir) => path.join(dir, "reading-priors/reading-priors-v1.json");

const read = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } };

/** All genre-tagged NeedPrior files — a prior family beyond the sidecar. */
function genrePriors(dir) {
  const out = [];
  try { for (const f of fs.readdirSync(needsDir(dir))) { const d = read(path.join(needsDir(dir), f)); if (d?.schema === "NeedPrior@1" && d.genre) out.push({ file: f, ...d }); } } catch {}
  return out;
}

/** Load the genre sidecar (FortunePrior@1) — the machine's footprints. */
export function loadSidecar({ liveDir } = {}) {
  return read(arcsPath(livePriorsDir(liveDir)));
}
export function sidecarPath(liveDir) {
  return arcsPath(livePriorsDir(liveDir));
}
export const SIDECAR_PATH = arcsPath(DEFAULT_LIVE_PRIORS);

/**
 * queryMeaningPotential(register, { record, seams, hunt }) → the combined
 * staging evidence, each contributor named. The register's field/mode/shape
 * select; the cascade returns what every prior family knows.
 */
export function queryMeaningPotential(register, { record = null, seams = [], liveDir = null } = {}) {
  const field = register?.field?.field ?? null;
  const mode = register?.mode ?? "text";
  const dir = livePriorsDir(liveDir);
  const evidence = [];

  // 1. the genre sidecar (our accumulated staging)
  const sidecar = read(arcsPath(dir));
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
  const needs = genrePriors(dir).filter((n) => String(n.genre ?? "").includes(field ?? "") || (field ?? "").includes(String(n.genre ?? "")));
  for (const n of needs) {
    evidence.push({ from: `NeedPrior@1 (${n.file})`, genre: n.genre, works: (n.works ?? []).slice(0, 4).map((w) => w.file), cells: Object.keys(n.cells ?? {}).length, basis: `the genre's meaning-options: ${Object.keys(n.cells ?? {}).length} recency×frequency cells from ${(n.works ?? []).length} work(s)` });
  }

  // 3. the reading priors — the axioms of how text is read
  const reads = read(readsPath(dir));
  if (reads) evidence.push({ from: "ReadingPriors@1", basis: `${Object.keys(reads.actExpectations ?? {}).length} act-expectation families, ${(reads.giver?.compiledFrom ?? []).length} compiled sources` });

  // 4. the record's own seams — always available
  if (record?.length || seams.length) evidence.push({ from: "the record's own seams", phases: seams.length ? `${seams.length} seam(s)` : `${record} sentence(s)`, basis: "the generic staged pipeline — derived from the material itself" });

  // 5. the web hunt — open when the egress is
  evidence.push({ from: "the web (hunt)", basis: "the egress is open — genre material is hunted and appended, never assumed" });

  return { register: { field, mode, tenor: register?.tenor?.tenor ?? "general" }, evidence };
}