// native/organs/code-goal-lint.js — the unconscious coding intelligence
// (2026-09-21): goal evolution without regex, without a model.
//
// WHAT THIS IS. The "design on paper first" loop (run_ants.py --goal-evolve)
// writes EOT goals, runs a pass, and a failure becomes a NEW atom on the
// sheet. The first build parsed failures with hand-written regex — a
// re-derivation of what this codebase already does model-free. THIS organ
// replaces the regex with the referent + reasoning-lint machinery:
//
//   · The goal sheet is a CLAIM LEDGER — each atom is {end1, label, end2}
//     on the hyperlexicon shape, NOT a string.
//   · The satisfier (test) is the RECORD. A pass is a claim the record must
//     hold.
//   · The reasoning lint (organs/reasoning-lint.js, Kelsen's precedence) is
//     the judge: a failure is a typed FINDING — contested_claim (the pass
//     contradicts a goal), expired (a goal the pass no longer satisfies),
//     contradiction (two goals at one address), cycle (the pass proves its
//     own rule). The finding's KIND is the new atom, never a regex match.
//
// WHY REFERENTS. `repeat_prefix('',4)`, `repeat_prefix("", 4)`,
// `repeat_prefix('', 4)` are ONE referent (surfaces.js::referentIdentity →
// `class:` or `bytes:`), not three regex branches. The atom's identity is the
// referent; the spelling is a surface. Two goals that differ only in surface
// are the same atom — the lint sees one claim.
//
// WHAT IS INJECTED, AND WHY. Pure (shape + crossing apart, the house rule):
// `referentIndex` is injected (surfaces.js-style) so identity is the caller's
// law, never re-derived here; `goalKind` maps a goal's label to a class so
// guards/returns/inputs are typed, not prose.
import { createHash } from "node:crypto";

export const FINDING_KINDS = Object.freeze({
  CONTESTED: "contested_claim",
  EXPIRED: "expired_obligation",
  CONTRADICTION: "standing_contradiction",
  CYCLE: "support_cycle",
});

const sha256 = (s) => createHash("sha256").update(String(s ?? "")).digest("hex").slice(0, 16);
export const goalId = (goal) => `goal:${sha256([goal.end1, goal.label, goal.end2].join("|"))}`;

/** Surface normalization for code-goal referents (surfaces.js::referentForm
 *  posture): quotes and ALL whitespace are SURFACE, never identity.
 *  `repeat_prefix('',4)` ≡ `repeat_prefix("", 4)` ≡ `repeat_prefix('', 4)`
 *  — one referent. (A call's internal spacing is layout, like a sentence's.) */
export function referentForm(term) {
  return String(term ?? "")
    .replace(/['"]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();
}

/** Normalize a goal/pass claim to a referent identity (surfaces.js posture:
 *  identity is the class or the bytes, never the spelling). */
export function referentOf(term, { referentIndex = null } = {}) {
  const form = referentForm(term);
  if (referentIndex) {
    const k = referentIndex instanceof Map ? referentIndex.get(form) : referentIndex[form];
    if (k) return `class:${k}`;
  }
  return `bytes:${sha256(form)}`;
}

/** A goal atom is {end1, label, end2, kind?} where kind ∈ {guard, return,
 *  name, rule}. The label is the relation; kind types it (a guard's label is
 *  "returns when X", a return's is "returns"). */
export function typedGoal({ end1, label, end2 }) {
  const condition = String(end1 ?? "") + " " + String(label ?? "");
  const kind = /(if|when|guard|empty|zero|negative|zero-length)/i.test(condition)
    ? "guard"
    : /^(returns?|produces?|yields?)/i.test(String(label))
      ? "return"
      : /(named|is called|defines)/i.test(String(label))
        ? "name"
        : "rule";
  return { end1, label, end2, kind, id: goalId({ end1, label, end2 }) };
}

/** THE LINT — pure over the goal sheet + one pass claim. Returns a typed
 *  finding (or null when the pass is coherent with the goals). The finding's
 *  `kind` IS the new atom's relation; `end1`/`end2` are the referents. */
export function lintCodeGoal({ goals = [], passClaim = null } = {}) {
  if (!passClaim) return null;
  const sheet = goals.map(typedGoal);
  const pass = typedGoal(passClaim);

  // (1) CONTESTED — the pass claim contradicts a goal atom at one identity.
  //     A guard goal (e.g. "returns '' when s is empty") is contested when the
  //     pass produces a non-empty value FOR the guarded input. This is the
  //     empty-s / zero-k / negative cases.
  const guard = sheet.find((g) => g.kind === "guard");
  if (guard) {
    const passContradicts = referentOf(pass.end1) === referentOf(guard.end1);
    if (passContradicts && referentOf(pass.end2) !== referentOf(guard.end2)) {
      return {
        kind: FINDING_KINDS.CONTESTED,
        severity: "error",
        level: "standard",
        detail: `the pass claim "${pass.end1} → ${pass.end2}" contradicts the guard "${guard.end1} → ${guard.end2}"`,
        note: passClaim,
        referents: { end1: pass.end1, end2: pass.end2 },
        atom: { end1: guard.end1, label: "returns", end2: guard.end2, kind: "guard" },
      };
    }
  }

  // (2) EXPIRED — a "return" goal the pass fails to satisfy. The pass's
  //     value for the goal's input is not the goal's end2. (The test lane
  //     reports the wanted value; the lint restates it as a claim.)
  const ret = sheet.find((g) => g.kind === "return");
  if (ret && referentOf(pass.end1) === referentOf(ret.end1) && referentOf(pass.end2) !== referentOf(ret.end2)) {
    return {
      kind: FINDING_KINDS.EXPIRED,
      severity: "error",
      level: "standard",
      detail: `the pass no longer satisfies the return goal "${ret.end1} → ${ret.end2}"`,
      note: passClaim,
      referents: { end1: ret.end1, end2: ret.end2 },
      atom: { end1: ret.end1, label: "returns", end2: ret.end2, kind: "return" },
    };
  }

  // (3) CONTRADICTION — two goals at one address, no rule separates them.
  //     The sheet itself is incoherent: a guard and a return at the same
  //     end1 with different end2. (e.g. "returns 'ababab'" vs "returns
  //     'ababa'" for the same call — the wrong-length family.)
  const atOneAddress = new Map();
  for (const g of sheet) {
    const key = referentOf(g.end1);
    const prev = atOneAddress.get(key);
    if (prev && referentOf(prev.end2) !== referentOf(g.end2)) {
      return {
        kind: FINDING_KINDS.CONTRADICTION,
        severity: "error",
        level: "standard",
        detail: `two goals at one address disagree: "${prev.end2}" vs "${g.end2}"`,
        referents: { end1: g.end1, end2: g.end2 },
        atom: { end1: g.end1, label: "returns exactly one value for a given input", end2: g.end2, kind: "rule" },
      };
    }
    atOneAddress.set(key, g);
  }

  // (4) CYCLE — the pass's end2 references its own end1 (the completion
  //     "proves its own rule": snake_string returns the input unchanged
  //     when the rule is even/odd split). This is the identity-output family.
  if (referentOf(pass.end1) === referentOf(pass.end2) && sheet.some((g) => g.kind !== "name")) {
    return {
      kind: FINDING_KINDS.CYCLE,
      severity: "error",
      level: "strict",
      detail: `the pass returns its input unchanged — a support cycle (begging the question): the output must differ from the input by the rule`,
      note: passClaim,
      referents: { end1: pass.end1, end2: pass.end2 },
      atom: { end1: pass.end1, label: "differs from the input by the declared rule", end2: pass.end2, kind: "rule" },
    };
  }

  return null;
}

/** THE ATOM → GOAL-SHEET WORDING: a finding's atom rendered as a precise
 *  clause for the next pass (the small-model law — goals on paper, never the
 *  model's own buggy code). */
export function atomClause(atom) {
  const { end1, label, end2 } = atom;
  if (atom.kind === "guard") return `${end1}, return ${end2}`;
  return `${end1} ${label} ${end2}`;
}