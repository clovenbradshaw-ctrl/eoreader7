// native/organs/deduction-csp.js — general constraint-satisfaction
// deduction: the classic "logic grid puzzle" shape (a Zebra Puzzle, an
// Einstein's Riddle, a seating-and-drinks puzzle), never one specific
// riddle's wording. The Boolos liar/truth-teller/random puzzle
// (puzzle-templates.js) is ONE instance of this general shape (a
// hypothesis space + a set of distinguishing observations); this module
// is the OTHER common instance: SUBJECTS (people, houses, positions —
// whatever the puzzle enumerates) each carry exactly one value per
// declared CATEGORY (a bijection, subject <-> value, per category), and a
// declared set of closed-vocabulary CONSTRAINTS narrows the space of
// consistent assignments down to (ideally) exactly one.
//
// Deduction, not puzzle-recognition: nothing here is keyed to a riddle's
// surface wording. A caller (or a model-assisted extraction, see
// aristotle.js) declares the subjects, each category's values, and the
// constraints; this module's job is only to VERIFY that declaration is
// well-formed against its own closed vocabulary and MECHANICALLY solve
// it by exhaustive search over the (small, declared, capped) space of
// bijections — the same "small hypothesis space, exhaustive, capped"
// posture distinguishing-plan.js already takes, generalized from ONE
// hypothesis space per puzzle to one PER CATEGORY, combined.
//
// CLOSED CONSTRAINT VOCABULARY (never a freeform predicate — a model or
// caller can only compose from these, so every constraint is checkable
// against the declared subjects/categories/values before it is ever
// evaluated):
//   fixed(category, subject, value)         — subject's value in category IS value
//   notFixed(category, subject, value)       — subject's value in category is NOT value
//   sameSubject(categoryA, valueA, categoryB, valueB)      — whoever has valueA in categoryA also has valueB in categoryB
//   differentSubject(categoryA, valueA, categoryB, valueB) — negation of the above
//   positionOffset(category, value1, value2, offset)       — category is a declared ORDERED category (its values are integers, the position line); the subject with value1 sits `offset` positions from the subject with value2 (offset may be negative; 0 means same subject, covered by sameSubject instead — offset must be nonzero here)
//
// A puzzle with no unique solution is a REAL refusal (`ambiguous` with
// every surviving assignment, or `unsatisfiable` with none) — this module
// never picks a "most likely" winner among several consistent worlds.

export const CONSTRAINT_KINDS = Object.freeze(["fixed", "notFixed", "sameSubject", "differentSubject", "positionOffset"]);

export const REFUSALS = Object.freeze({
  bad_declaration: "the subjects/categories/constraints declaration failed a closed-vocabulary check — never solved against an unverified shape",
  unsatisfiable: "no assignment consistent with every subjects, this is a real refusal about the declared puzzle, not a search failure",
  ambiguous: "more than one assignment is consistent with every declared constraint — the puzzle as declared does not have a unique solution",
});

const DEFAULT_MAX_SUBJECTS = 8;

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

/**
 * validateDeclaration({ subjects, categories, constraints }) — the closed
 * check: every category has exactly `subjects.length` distinct values,
 * every constraint is one of CONSTRAINT_KINDS and references only
 * declared categories/values (and, for `positionOffset`, a category
 * whose values are exactly the integers 1..n — the declared "ordered"
 * shape, never inferred). Returns `{ ok: true }` or `{ ok: false, reason
 * }` — never throws on bad input, since a model's extraction is exactly
 * the untrusted input this exists to catch.
 */
export function validateDeclaration({ subjects, categories, constraints } = {}) {
  if (!Array.isArray(subjects) || subjects.length < 2) return { ok: false, reason: "subjects must be a declared array of at least 2 distinct names" };
  if (new Set(subjects).size !== subjects.length) return { ok: false, reason: "subjects must be distinct" };
  if (subjects.length > DEFAULT_MAX_SUBJECTS) return { ok: false, reason: `${subjects.length} subjects exceeds the declared cap of ${DEFAULT_MAX_SUBJECTS} — exhaustive search over bijections is small by design, not built to scale past it` };
  if (!categories || typeof categories !== "object" || Array.isArray(categories) || Object.keys(categories).length === 0) return { ok: false, reason: "categories must be a declared non-empty object of name -> distinct value array" };
  for (const [name, values] of Object.entries(categories)) {
    if (!Array.isArray(values) || values.length !== subjects.length) return { ok: false, reason: `category "${name}" must declare exactly ${subjects.length} values, one per subject` };
    if (new Set(values).size !== values.length) return { ok: false, reason: `category "${name}"'s values must be distinct` };
  }
  if (!Array.isArray(constraints) || constraints.length === 0) return { ok: false, reason: "constraints must be a declared non-empty array" };

  const categoryHasValue = (category, value) => Object.prototype.hasOwnProperty.call(categories, category) && categories[category].includes(value);
  const isOrdered = (category) => {
    const values = categories[category];
    if (!values) return false;
    const asNums = [...values].sort((a, b) => Number(a) - Number(b));
    return asNums.every((v, i) => Number(v) === i + 1) && values.every((v) => Number.isInteger(Number(v)));
  };

  for (const c of constraints) {
    if (!c || !CONSTRAINT_KINDS.includes(c.kind)) return { ok: false, reason: `every constraint's "kind" must be one of ${CONSTRAINT_KINDS.join(", ")} — got ${JSON.stringify(c?.kind)}` };
    switch (c.kind) {
      case "fixed":
      case "notFixed":
        if (!subjects.includes(c.subject)) return { ok: false, reason: `${c.kind}: subject "${c.subject}" is not declared` };
        if (!categoryHasValue(c.category, c.value)) return { ok: false, reason: `${c.kind}: value "${c.value}" is not declared in category "${c.category}"` };
        break;
      case "sameSubject":
      case "differentSubject":
        if (!categoryHasValue(c.categoryA, c.valueA)) return { ok: false, reason: `${c.kind}: value "${c.valueA}" is not declared in category "${c.categoryA}"` };
        if (!categoryHasValue(c.categoryB, c.valueB)) return { ok: false, reason: `${c.kind}: value "${c.valueB}" is not declared in category "${c.categoryB}"` };
        break;
      case "positionOffset":
        if (!isOrdered(c.category)) return { ok: false, reason: `positionOffset: category "${c.category}" is not a declared ORDERED category (its values must be exactly the integers 1..${subjects.length})` };
        if (!categoryHasValue(c.category, c.value1)) return { ok: false, reason: `positionOffset: value1 "${c.value1}" is not declared in category "${c.category}"` };
        if (!categoryHasValue(c.category, c.value2)) return { ok: false, reason: `positionOffset: value2 "${c.value2}" is not declared in category "${c.category}"` };
        if (!Number.isInteger(c.offset) || c.offset === 0) return { ok: false, reason: "positionOffset: offset must be a declared nonzero integer" };
        break;
    }
  }
  return { ok: true };
}

/** subjectOf(assignment, category, value) — which subject holds `value` in `category`, under one candidate assignment (`{ [category]: { [subject]: value } }`). */
function subjectOf(assignment, category, value) {
  const row = assignment[category];
  for (const subject of Object.keys(row)) if (row[subject] === value) return subject;
  return null;
}

function satisfies(assignment, constraint) {
  switch (constraint.kind) {
    case "fixed":
      return assignment[constraint.category][constraint.subject] === constraint.value;
    case "notFixed":
      return assignment[constraint.category][constraint.subject] !== constraint.value;
    case "sameSubject":
      return subjectOf(assignment, constraint.categoryA, constraint.valueA) === subjectOf(assignment, constraint.categoryB, constraint.valueB);
    case "differentSubject":
      return subjectOf(assignment, constraint.categoryA, constraint.valueA) !== subjectOf(assignment, constraint.categoryB, constraint.valueB);
    case "positionOffset": {
      const s1 = subjectOf(assignment, constraint.category, constraint.value1);
      const s2 = subjectOf(assignment, constraint.category, constraint.value2);
      return Number(assignment[constraint.category][s1]) === Number(assignment[constraint.category][s2]) + constraint.offset;
    }
    default:
      return false;
  }
}

/**
 * solveCsp({ subjects, categories, constraints }) — validates the
 * declaration, then exhaustively enumerates every bijection of subjects
 * to each category's values (independently per category — categories are
 * never assumed correlated except through the declared constraints
 * themselves) and filters by every constraint. Returns `{ solutions }`
 * (an array; length 0 is REFUSALS.unsatisfiable, length > 1 is
 * REFUSALS.ambiguous, length 1 is the unique answer) — or `{ refused,
 * reason }` if the declaration itself fails validation.
 */
export function solveCsp({ subjects, categories, constraints }) {
  const check = validateDeclaration({ subjects, categories, constraints });
  if (!check.ok) return Object.freeze({ refused: REFUSALS.bad_declaration, reason: check.reason });

  const categoryNames = Object.keys(categories);
  const perCategoryAssignments = categoryNames.map((name) => permutations(categories[name]).map((perm) => Object.fromEntries(subjects.map((s, i) => [s, perm[i]]))));

  const solutions = [];
  function build(i, acc) {
    if (i === categoryNames.length) {
      if (constraints.every((c) => satisfies(acc, c))) solutions.push(Object.freeze(structuredCloneAssignment(acc)));
      return;
    }
    for (const rowAssignment of perCategoryAssignments[i]) {
      build(i + 1, { ...acc, [categoryNames[i]]: rowAssignment });
    }
  }
  build(0, {});

  if (solutions.length === 0) return Object.freeze({ refused: REFUSALS.unsatisfiable, solutions: Object.freeze([]) });
  if (solutions.length > 1) return Object.freeze({ refused: REFUSALS.ambiguous, solutions: Object.freeze(solutions) });
  return Object.freeze({ solutions: Object.freeze(solutions), solution: solutions[0] });
}

function structuredCloneAssignment(acc) {
  return Object.fromEntries(Object.entries(acc).map(([category, row]) => [category, Object.freeze({ ...row })]));
}
