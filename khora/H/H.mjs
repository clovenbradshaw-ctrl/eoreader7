// H/H.mjs — the categories as HYPOTHESIS, not constitution (seed clause 3).
//
// Khora perceives the world THROUGH these forms — the 27, the helix, the wheel —
// and it holds them the way it holds every claim: half-life'd, controlled, with
// the falsifier written beside them, and REC applied to the axes themselves.
//
// THE WORD "A PRIORI" DOES NOT SURVIVE (swarm, 2026-10-01). These axes were NOT
// legislated from nothing; they were RECOVERED — from human verb embeddings
// (a posteriori), orthogonality measured (Rand ≈ 0.05), the 27-cell resolution
// fitted at 8.8× chance. They are a maintained, corpus-recovered MODEL with a
// birth certificate (PROVENANCE below), never dressed as a priori. The space
// was carved where languages were silent; the khora inherits that poverty ONLY
// if it forgets the carving. Its prosthetic advantage is that it can verb
// anything in notation — the desert is a finding about languages, never about
// machines. Do not under-attend where the prior is poor; that is
// self-immunizing (the prior measured on human lexicons confirms its own bias).
//
// The falsifier (written beside, never after):
//   "a transformation that no 27-cell address can hold falsifies H" —
//   when the perceiving body needs a cell the closed cube cannot address, and
//   the need is witnessed by an external author, H is falsified and the axes
//   are re-seeded (REC applies to the axes).
//
// RECORDED, UNWIRED (2026-10-01): reSeed is constitutional, not operational —
// the running resolver/cube still closes at 27. The escape hatch is NAMED, not
// silent, and it stays unwired until the closure is actually open. A named gap,
// never a claim.
//
// PURE: no imports. Selftest: node --input-type=module -e "import('./H.mjs').then(m=>m.selftest())"

export const H_SCHEMA = "Hypothesis-H@1";
export const OPERATORS = Object.freeze(["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);
export const GRAINS = Object.freeze(["Ground", "Figure", "Pattern"]);
export const HELIX = Object.freeze(OPERATORS);
export const FALSIFIER = "a transformation that no 27-cell address can hold falsifies H";

// The birth certificate — where the axes came from (a posteriori, never a priori).
export const PROVENANCE = Object.freeze({
  recovered: "human verb embeddings (corpus-recovered, a posteriori)",
  orthogonality: "measured, Rand ≈ 0.05",
  resolution: "27 cells fit at 8.8× chance",
  caveat: "the desert is a finding about languages, never machines — the khora can verb anything in notation",
});

/** H as a hypothesis: the 27 cells the perceiver addresses through, held as
 *  H — never a constitution, never a priori. `born` and `rounds` give it a
 *  half-life. The escape hatch is disclosed as unwired, never silent. */
export function H({ now = 0, rounds = 0 } = {}) {
  return Object.freeze({
    schema: H_SCHEMA,
    axes: { operators: OPERATORS, grains: GRAINS },
    cells: OPERATORS.length * GRAINS.length,
    helix: HELIX,
    provenance: PROVENANCE,
    falsifier: FALSIFIER,
    standing: "hypothesis",
    born: now,
    rounds,
    escapeHatch: Object.freeze({ mechanism: "reSeed — REC applies to the axes", wired: false }),
  });
}

/** Address a transformation through H. A cell is addressed when an operator and
 *  a grain both hold; a transformation that needs an operator or a grain outside
 *  the closed set is UNADDRESSABLE — and that is H's falsifier, witnessed. */
export function address(op, grain) {
  if (!OPERATORS.includes(op)) return { ok: false, unaddressable: { axis: "operator", value: op } };
  if (!GRAINS.includes(grain)) return { ok: false, unaddressable: { axis: "grain", value: grain } };
  return { ok: true, cell: `${op}·${grain}`, index: OPERATORS.indexOf(op) * GRAINS.length + GRAINS.indexOf(grain) };
}

/** REC applied to the axes: re-seed H when its falsifier fires — witnessed,
 *  budgeted, logged. Returns a NEW H (append-only — the old one is kept). */
export function reSeed(h, { now = 0 } = {}) {
  return H({ now, rounds: h.rounds + 1 });
}

export function selftest() {
  const t = (n, c) => { if (!c) { console.error("FAIL", n); process.exitCode = 1; } else console.log("ok", n); };
  const h = H();
  t("H is 27 cells", h.cells === 27);
  t("H is a hypothesis, never a constitution", h.standing === "hypothesis");
  t("the birth certificate is a posteriori, never a priori", h.provenance.recovered.includes("corpus-recovered") && !/a priori/.test(h.provenance.recovered));
  t("the escape hatch is named, not silent — unwired is disclosed", h.escapeHatch.wired === false && /reSeed/.test(h.escapeHatch.mechanism));
  t("the falsifier is written beside, never after", h.falsifier === FALSIFIER);
  t("a cell addresses", address("INS", "Figure").ok && address("INS", "Figure").cell === "INS·Figure");
  t("an unknown operator is unaddressable — H's falsifier", !address("ALT", "Figure").ok);
  t("an unknown grain is unaddressable", !address("INS", "Void").ok);
  t("reSeed is REC on the axes, budgeted and logged", reSeed(h).rounds === 1 && h.rounds === 0);
}