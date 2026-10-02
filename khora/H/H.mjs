// H/H.mjs — the categories as HYPOTHESIS, not constitution (seed clause 3).
//
// Khora perceives the world THROUGH these forms — the 27, the helix, the wheel —
// and it holds them the way it holds every claim: half-life'd, controlled, with
// the falsifier written beside them, and REC applied to the axes themselves.
// This file does not legislate the cube (that is eoreader7's, as H, piped in);
// it holds H the way khora holds H — as the first hypothesis, revisable, never
// a constitution.
//
// The falsifier (written beside, never after):
//   "a transformation that no 27-cell address can hold falsifies H" —
//   when the perceiving body needs a cell the closed cube cannot address, and
//   the need is witnessed by an external author, H is falsified and the axes
//   are re-seeded (REC applies to the axes).
//
// PURE: no imports. Selftest: node --input-type=module -e "import('./H.mjs').then(m=>m.selftest())"

export const H_SCHEMA = "Hypothesis-H@1";
export const OPERATORS = Object.freeze(["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]);
export const GRAINS = Object.freeze(["Ground", "Figure", "Pattern"]);
export const HELIX = Object.freeze(OPERATORS);
export const FALSIFIER = "a transformation that no 27-cell address can hold falsifies H";

/** H as a hypothesis: the 27 cells the perceiver addresses through, held as
 *  H — never a constitution. `born` and `rounds` give it a half-life. */
export function H({ now = 0, rounds = 0 } = {}) {
  return Object.freeze({
    schema: H_SCHEMA,
    axes: { operators: OPERATORS, grains: GRAINS },
    cells: OPERATORS.length * GRAINS.length,
    helix: HELIX,
    falsifier: FALSIFIER,
    standing: "hypothesis",
    born: now,
    rounds,
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
  t("the falsifier is written beside, never after", h.falsifier === FALSIFIER);
  t("a cell addresses", address("INS", "Figure").ok && address("INS", "Figure").cell === "INS·Figure");
  t("an unknown operator is unaddressable — H's falsifier", !address("ALT", "Figure").ok);
  t("an unknown grain is unaddressable", !address("INS", "Void").ok);
  t("reSeed is REC on the axes, budgeted and logged", reSeed(h).rounds === 1 && h.rounds === 0);
}