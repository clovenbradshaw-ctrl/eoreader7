// Handle: Lull — Ramon Llull, who held that every statement could be built
// from a small closed set of principles combined by rule, and drew the
// wheels that did the combining mechanically.
//
// claim-acts.js — every STRUCTURAL claim a build hears is one of the nine
// operators at a grain: one of the engine's 27 phaseposts (kernel/cube.js
// cellOf), never a free verb. The words the build has used for its own
// structure ("exists", "has", "named", "position", …) are mapped here, once,
// and nowhere else; a claim whose label is not structural is a value the
// record asserts of a thing (DEF·Figure — "vote count: 12", "says: …"),
// typed by default and said to be.
//
// Typing the acts makes the record checkable by its own order — the helix
// (NUL → SIG → INS → SEG → CON → SYN → DEF → EVA → REC): nothing may be
// bonded, bounded, defined or judged before it is instantiated, and no
// conclusion stands without its premises on the record. helixCheck reads a
// fold and names every claim that breaks that order. No regular expressions.

import { cellOf } from "../kernel/cube.js";

export const CLAIM_ACTS_SCHEMA = "ClaimActs@1";

/** The build's structural words, each one act at one grain — set by hand
 *  2026-09-27 from the words the talk build hears for its own structure. */
export const STRUCTURAL_ACTS = Object.freeze({
  exists: { op: "INS", grain: "Figure" },        // a thing is instantiated
  has: { op: "CON", grain: "Figure" },           // a part bonded to its whole
  position: { op: "SEG", grain: "Figure" },      // its place among its siblings
  named: { op: "DEF", grain: "Figure" },         // what it is called
  "for whom": { op: "DEF", grain: "Ground" },    // who the whole is for
  for: { op: "DEF", grain: "Figure" },           // what a part is for
  shows: { op: "DEF", grain: "Pattern" },        // what a KIND of part carries
});
/** What each reasoning rule does (organs/talk-reason.js), set by hand
 *  2026-09-27: a total or a count composes a whole from its parts; a top or a
 *  correction judges the parts against each other. */
export const DERIVED_ACTS = Object.freeze({
  total: { op: "SYN", grain: "Pattern" },
  shown: { op: "SYN", grain: "Figure" },
  top: { op: "EVA", grain: "Figure" },
  correct: { op: "EVA", grain: "Figure" },
  continuation: { op: "SYN", grain: "Figure" },
});

const isThing = (id) => typeof id === "string" && id.includes("#") && !id.startsWith("kind:") && !id.includes("|");
const derivedRule = (note) => {
  const w = (note?.witnesses ?? []).find((x) => String(x).startsWith("derived:"));
  return w ? String(w).slice("derived:".length).split("#")[0] : null;
};

/** actOf(note) -> { op, grain, cell, typedBy } — the phasepost a claim is. */
export function actOf(note) {
  const rule = derivedRule(note);
  const pick = (a, typedBy) => ({ ...a, cell: cellOf(a.op, a.grain), typedBy });
  if (rule && DERIVED_ACTS[rule]) return pick(DERIVED_ACTS[rule], `derived:${rule}`);
  if (STRUCTURAL_ACTS[note?.label]) return pick(STRUCTURAL_ACTS[note.label], "structural");
  return pick({ op: "DEF", grain: "Figure" }, "default: a value asserted of a thing");
}

/** premises named in a claim's because: "… [premises: a, b]", or — when an
 *  id may itself hold a comma (a line of a story is part of its note's id) —
 *  a JSON list, "… [premises: ["a", "b"]]" */
export function premisesOf(because) {
  const s = String(because ?? "");
  const at = s.lastIndexOf("[premises:");
  if (at < 0) return [];
  const rest = s.slice(at + "[premises:".length).trim();
  if (rest.startsWith("[")) {
    const end = rest.lastIndexOf("]]");
    try { return JSON.parse(rest.slice(0, end < 0 ? rest.length : end + 1)).map(String).filter(Boolean); } catch { return []; }
  }
  const end = rest.indexOf("]");
  return rest.slice(0, end < 0 ? rest.length : end).split(",").map((x) => x.trim()).filter(Boolean);
}

/**
 * helixCheck({ fold, entries }) -> { schema, ok, violations, acts }
 *   fold     the notes' fold (live claims)
 *   entries  the ledger's entries (for a derived claim's because), optional
 * A violation: an act on a thing never instantiated (CON/SEG/DEF/SYN/EVA
 * before INS), or a conclusion whose premises are not on the record.
 */
export function helixCheck({ fold, entries = [] }) {
  const instantiated = new Set(fold.filter((n) => actOf(n).op === "INS").map((n) => n.end1));
  const live = new Set(fold.map((n) => n.id));
  const liveThings = new Set(fold.flatMap((n) => [n.end1, n.end2]).filter(isThing));
  const becauseOf = new Map();
  for (const e of entries) if (e?.task_id && e.because != null) becauseOf.set(e.task_id, e.because);
  const violations = [];
  const acts = {};
  for (const n of fold) {
    const a = actOf(n);
    acts[`${a.op}·${a.grain}`] = (acts[`${a.op}·${a.grain}`] ?? 0) + 1;
    if (a.op === "INS") continue;
    for (const end of [n.end1, a.op === "CON" ? n.end2 : null]) {
      if (isThing(end) && !instantiated.has(end)) violations.push({ note: n.id, act: `${a.op}·${a.grain}`, why: `${end} is ${a.op === "CON" ? "bonded" : "acted on"} but was never instantiated (no INS on the record)` });
    }
    if (derivedRule(n)) {
      for (const p of premisesOf(becauseOf.get(n.id))) {
        if (!live.has(p) && !liveThings.has(p)) violations.push({ note: n.id, act: `${a.op}·${a.grain}`, why: `premise ${p} is not on the record` });
      }
    }
  }
  return { schema: CLAIM_ACTS_SCHEMA, ok: violations.length === 0, violations, acts };
}
