// organs/run-dmca.js — RUN DMCA (named by the user): the reproduction check.
// The question: did the mouth COMPOSE, or did it REPRODUCE a source's words?
// Reproducing FOR QUOTATION (explicitly cited) is legitimate; reproducing
// WITHOUT a citation is a DMCA violation — copy, not composition.
//
// The parse is three-way:
//   quoted   — a reproduced span that carries an explicit citation
//   copied   — a reproduced span with NO citation (the violation)
//   composed — the mouth's own prose (inspired, not reproduced)
//
// THE BOUNDARY between "inspired" and "reproduced" must come out of DMD+Born
// (born-dmd-rosetta.mjs's own question — "can the boundary come OUT of DMD +
// Born, instead of a hand-set overlap threshold?"), never a hand-set n-gram.
// Until that measurement lands, `n` is a named constant whose derivation is
// DISCLOSED as a gap, not a measurement — the same discipline that refuses to
// pass a magic number off as a measured one.
//
// Archons: a task BETWEEN Alexander and Ranke — not owned by one.
//   Alexander (SYN) owns the obligation: a synthesis must COMPOSE a new
//     pattern, never clone one. A copy is a failed synthesis.
//   Ranke owns the check: the source's words stay the source's — "wie es
//     eigentlich gewesen" — grounded is grounded, invention is invention.
// runDMCA is the seam where the two meet: did SYN actually synthesize, or did
// it cross into reproducing Ranke's sources? The citation ledger's split and
// the DMD+Born reproduction boundary are the instruments of that seam.
// Marshall upholds the law the seam enforces.

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9'\s]/g, " ").replace(/\s+/g, " ").trim();

const shinglesOf = (text, n) => {
  const words = norm(text).split(" ");
  const out = new Set();
  for (let i = 0; i + n <= words.length; i++) out.add(words.slice(i, i + n).join(" "));
  return { words, out };
};

// THE NULL (Diaconis's discipline, Ranke's boundary): a run is REPRODUCTION
// only if it SURVIVES shuffling the source's words — i.e. it is SPECIFIC to
// the source's order, not a common-phrase overlap that any lighthouse prose
// shares by chance. The hand-set n=6 was measured to flag 175 "copied" runs
// where the citation ledger found 11 verbatim sentences; the shuffle-null
// destroys common-phrase coincidences, so only genuine order-specific
// reproduction crosses the boundary. A deterministic seed keeps it
// reproducible — the null is rebuilt, never a magic number.
function shuffleWords(text, seed = 7) {
  const words = norm(text).split(" ");
  let s = seed >>> 0;
  const rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr.join(" ");
}

export function runDMCA({ text = "", sources = new Map(), citations = [], n = 6, nullSeed = 7 } = {}) {
  const t = norm(text);
  if (t.split(" ").length < n) return { ok: true, derivation: 0, quoted: 0, copied: 0, boundary: `shuffle-null (n=${n})`, basis: "too short to measure — derivation unknown" };
  // REAL source shingles, and the NULL (shuffled) source shingles.
  const sourceShingles = new Set();
  const nullShingles = new Set();
  for (const s of sources.values()) {
    for (const sh of shinglesOf(s, n).out) sourceShingles.add(sh);
    for (const sh of shinglesOf(shuffleWords(s, nullSeed), n).out) nullShingles.add(sh);
  }

  // the cited (quoted) spans — only grounded entries, never `unsupported`.
  const citedShingles = new Set();
  for (const c of citations ?? []) {
    if (c?.source == null || c?.kind === "unsupported") continue;
    for (const sh of shinglesOf(c?.essaySentence ?? "", n).out) citedShingles.add(sh);
  }

  // THE SPECTRUM: a run counts as DERIVED when it is order-specific to a
  // source (survives the shuffle-null). `derivation` is the write's POSITION
  // on the spectrum — 0 = independent, 1 = fully reproduced. Plagiarism is a
  // REGION (low distance × uncited), not a flag: quoted = derived but owned,
  // copied = derived and unowned, and the rest of the write sits further out
  // toward inspiration (unmeasured by this verbatim instrument).
  const writeShingles = [...shinglesOf(text, n).out];
  let quoted = 0, copied = 0, derived = 0;
  const seen = new Set();
  for (const sh of writeShingles) {
    if (!sourceShingles.has(sh)) continue;       // not in any source
    if (nullShingles.has(sh)) continue;           // common phrase, not order-specific
    if (seen.has(sh)) continue; seen.add(sh);
    derived++;
    if (citedShingles.has(sh)) quoted++; else copied++;
  }
  const derivation = writeShingles.length ? derived / writeShingles.length : 0;

  return {
    ok: copied === 0,
    derivation,
    quoted,
    copied,
    boundary: `shuffle-null (n=${n}; the run must survive the source's words being scrambled) — the verbatim end of the derivation spectrum`,
    basis: copied
      ? `derivation ${(derivation * 100).toFixed(0)}% — ${quoted} run(s) cited (quotation), ${copied} uncited (copy): plagiarism is this region of the spectrum`
      : quoted
        ? `derivation ${(derivation * 100).toFixed(0)}% — all ${quoted} reproduced run(s) cited (quotation, not copy)`
        : `derivation ${(derivation * 100).toFixed(0)}% — no order-specific reproduction; the prose sits toward the inspired end (paraphrase is unmeasured by this verbatim instrument)`,
  };
}

/**
 * CATEGORIZE where each span came from, against the periodic table of
 * creativity. Provenance decides the cell:
 *   Reproduce — verbatim (order-specific), split quoted (cited) vs copied (not)
 *   Derive    — grounded but reworded (the citation ledger's `company`)
 *   Invent    — the model's own (the citation ledger's `unsupported`)
 */
export function categorizeCreativity({ text = "", sources = new Map(), citations = [], n = 6 } = {}) {
  const dmca = runDMCA({ text, sources, citations, n });
  const ledger = {
    verbatim: (citations ?? []).filter((c) => c?.kind === "verbatim").length,
    company: (citations ?? []).filter((c) => c?.kind === "company").length,
    unsupported: (citations ?? []).filter((c) => c?.kind === "unsupported").length,
  };
  // The derivation axis reads ALL THREE provenance signals, not just the
  // verbatim ratio: verbatim (quoted or copied) → Reproduce; grounded but
  // reworded (company) → Derive; the model's own (unsupported) → Invent.
  const derivation = (dmca.quoted + dmca.copied) > 0 ? "Reproduce" : ledger.company > 0 ? "Derive" : "Invent";
  return {
    reproduce: { quoted: dmca.quoted, copied: dmca.copied },
    derive: ledger.company,
    invent: ledger.unsupported,
    derivation,
    cell: { grain: "Pattern", phase: "Structure", derivation, name: { Reproduce: "Convention", Derive: "Composition", Invent: "System" }[derivation], archon: "Alexander" },
    basis: dmca.basis,
  };
}
