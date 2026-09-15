// hl-compound.test.mjs — conformance for interpretation/hl.js's compound
// logic (not/and/or/exists/forall). Before this file, this machinery had
// ZERO test coverage anywhere in this repo: no conformance test imported
// interpretation/hl.js at all, and the only prior compound-logic suite
// (eoreader6.1-RETIRED/packages/engine/interpretation/hl.test.mjs, 22
// cases) sat in a retired checkout and never exercised AND/OR at the one
// pair that actually distinguishes a genuine four-valued lattice from a
// linearized approximation of one — its own "compounds" test only ever
// combined BOUND/CONTRADICTED/BEYOND_REACH, which a total order over the
// four verdicts already gets right by construction.
//
// THE DIVERGENCE THIS FILE PINS. hl.js used to compute AND/OR by sorting
// the four verdicts into one line (TRUTH_ORDER = [CONTRADICTED, CONTESTED,
// UNBOUND, BOUND]) and taking min/max of each side's index in that line.
// That reproduces real Belnap-Dunn FDE everywhere EXCEPT the
// (CONTESTED, UNBOUND) pair: canonical FDE, computed from each verdict's
// two independent supports (is there evidence FOR the claim, is there
// evidence AGAINST it — BOUND=(for,¬against), CONTRADICTED=(¬for,against),
// CONTESTED=(for,against), UNBOUND=(¬for,¬against)), gives
// AND(CONTESTED, UNBOUND) = CONTRADICTED ("both AND neither" has no FOR
// shared by both sides, and one side's AGAINST survives — falsity-
// supported) and OR(CONTESTED, UNBOUND) = BOUND ("both OR neither" has a
// FOR from one side and no AGAINST shared by both — truth-supported). The
// linear order instead landed on CONTESTED and UNBOUND respectively,
// because it can only ever return one of its two operands' own verdicts
// (min/max over an index), never synthesize a THIRD verdict neither
// operand held. Verified independently by hand-deriving the two-support
// truth table and by exhaustively cross-checking hl.js's real read()
// against it for all 16 ordered (a,b) pairs x 2 operators — see the
// exhaustive test below, which is what actually pins the fix rather than
// trusting the worked example alone.
//
// WHY THIS WAS SAFE TO FIX RATHER THAN DISCLOSE-AND-PIN. Searched for
// every real or plausible caller of the compound form before touching
// anything: the-fold's hl-acquire.js (the one production consumer named
// in hl.js's own header) imports only createStage/addAnchor/addEdge/
// declareFunctional — it never calls read() or atomic() at all. The-fold's
// void-hl.js (the other real caller) calls atomic() directly for single
// edges and never builds an ["and", ...]/["or", ...] compound. No eval
// driver, test, or application file anywhere in either repo constructs a
// compound claim. Nothing live depends on the old linearized behavior, so
// the fix lands as a correction, not a disclosed deviation.
import test from "node:test";
import assert from "node:assert/strict";
import {
  BOUND,
  CONTRADICTED,
  CONTESTED,
  UNBOUND,
  BEYOND_REACH,
  UNREFUTED,
  createStage,
  addAnchor,
  addEdge,
  declareFunctional,
  declareTransitive,
  declareComplete,
  extendStage,
  read,
  flip,
} from "../interpretation/hl.js";

// A stage exhibiting exactly one caller-chosen verdict on one fresh
// (rel, s, o) triple — the building block for exhaustively pinning every
// AND/OR combination without any of the four cases interfering with each
// other on a shared stage.
function stageWithVerdict(verdict, tag) {
  const s = `${tag}_s`;
  const o = `${tag}_o`;
  const H = createStage();
  addAnchor(H, s);
  addAnchor(H, o);
  if (verdict === BOUND) {
    addEdge(H, { rel: "r", s, o, polarity: "+", source: "x" });
  } else if (verdict === CONTRADICTED) {
    addEdge(H, { rel: "r", s, o, polarity: "-", source: "x" });
  } else if (verdict === CONTESTED) {
    addEdge(H, { rel: "r", s, o, polarity: "+", source: "x" });
    addEdge(H, { rel: "r", s, o, polarity: "-", source: "y" });
  } // UNBOUND: no edges at all
  return { stage: H, claim: ["atom", "r", s, o] };
}

// Canonical FDE, derived independently of hl.js's own implementation (two
// booleans per verdict, combined by AND/OR on each support separately),
// so this test does not just re-run the code under test against itself.
const SUPPORT = {
  [BOUND]: [true, false],
  [CONTRADICTED]: [false, true],
  [CONTESTED]: [true, true],
  [UNBOUND]: [false, false],
};
function nameOfSupport(forSup, againstSup) {
  for (const [name, pair] of Object.entries(SUPPORT)) {
    if (pair[0] === forSup && pair[1] === againstSup) return name;
  }
  throw new Error(`no verdict for (${forSup}, ${againstSup})`);
}
function canonicalAnd(a, b) {
  const [fa, aa] = SUPPORT[a];
  const [fb, ab] = SUPPORT[b];
  return nameOfSupport(fa && fb, aa || ab);
}
function canonicalOr(a, b) {
  const [fa, aa] = SUPPORT[a];
  const [fb, ab] = SUPPORT[b];
  return nameOfSupport(fa || fb, aa && ab);
}

const VALUES = [BOUND, CONTRADICTED, CONTESTED, UNBOUND];

test("AND/OR: exhaustive cross-check against canonical FDE (all 16 pairs x 2 operators)", () => {
  // The real assay: nothing here is trusted from a worked example alone.
  // Every one of the 32 (operand pair, operator) combinations is computed
  // two ways — hl.js's real read(), and the independent two-support
  // formula above — and must agree.
  for (const a of VALUES) {
    for (const b of VALUES) {
      const { stage: Ha, claim: phiA } = stageWithVerdict(a, "a");
      const { stage: Hb, claim: phiB } = stageWithVerdict(b, "b");
      const H = extendStage(Ha, Hb);
      const codeAnd = read(H, ["and", phiA, phiB]);
      const codeOr = read(H, ["or", phiA, phiB]);
      assert.equal(
        codeAnd,
        canonicalAnd(a, b),
        `AND(${a}, ${b}): expected canonical FDE ${canonicalAnd(a, b)}, got ${codeAnd}`,
      );
      assert.equal(
        codeOr,
        canonicalOr(a, b),
        `OR(${a}, ${b}): expected canonical FDE ${canonicalOr(a, b)}, got ${codeOr}`,
      );
    }
  }
});

test("AND/OR: the cross-term a linear order gets wrong — CONTESTED with UNBOUND", () => {
  // This is the specific pairing the retired suite's own "compounds" test
  // never reached (it only ever combined BOUND/CONTRADICTED/BEYOND_REACH —
  // grep eoreader6.1-RETIRED/packages/engine/interpretation/hl.test.mjs's
  // own "compounds" case to confirm). Pinned by name, not just folded into
  // the exhaustive loop above, so a future refactor that breaks this one
  // pair fails with a message naming exactly what regressed.
  const contested = stageWithVerdict(CONTESTED, "c");
  const unbound = stageWithVerdict(UNBOUND, "u");
  const H = extendStage(contested.stage, unbound.stage);
  assert.equal(read(H, ["atom", "r", "c_s", "c_o"]), CONTESTED, "sanity: the contested fixture reads contested");
  assert.equal(read(H, ["atom", "r", "u_s", "u_o"]), UNBOUND, "sanity: the unbound fixture reads unbound");

  // Both AND Neither = False (CONTRADICTED here — this codebase's "false").
  assert.equal(
    read(H, ["and", contested.claim, unbound.claim]),
    CONTRADICTED,
    "canonical FDE: Both AND Neither has no shared FOR and an unshared AGAINST survives — falsity-supported",
  );
  // Both OR Neither = True (BOUND here — this codebase's "true").
  assert.equal(
    read(H, ["or", contested.claim, unbound.claim]),
    BOUND,
    "canonical FDE: Both OR Neither has a FOR from one side and no shared AGAINST — truth-supported",
  );
  // Commutative: the reverse ordering gives the identical verdicts.
  assert.equal(read(H, ["and", unbound.claim, contested.claim]), CONTRADICTED);
  assert.equal(read(H, ["or", unbound.claim, contested.claim]), BOUND);
});

test("AND/OR: idempotent and BOUND/CONTRADICTED cases the retired suite already covered, ported", () => {
  const H = createStage();
  for (const a of ["lincoln", "n16", "n22"]) addAnchor(H, a);
  declareFunctional(H, "ordinal", { giver: "us-presidency: one ordinal per president" });
  addEdge(H, { rel: "ordinal", s: "lincoln", o: "n16", polarity: "+", source: "wiki" });
  const bound = ["atom", "ordinal", "lincoln", "n16"];
  const contra = ["atom", "ordinal", "lincoln", "n22"]; // R2 functional exclusion -> contradicted
  assert.equal(read(H, contra), CONTRADICTED, "sanity: functional exclusion fires");
  assert.equal(read(H, ["and", bound, contra]), CONTRADICTED);
  assert.equal(read(H, ["or", bound, contra]), BOUND);

  // Idempotent cases, one per verdict — these are exactly the shape the
  // retired suite's own coverage never went past (self-AND/OR).
  for (const v of VALUES) {
    const { stage, claim } = stageWithVerdict(v, `idem_${v}`);
    assert.equal(read(stage, ["and", claim, claim]), v, `${v} AND ${v} = ${v}`);
    assert.equal(read(stage, ["or", claim, claim]), v, `${v} OR ${v} = ${v}`);
  }
});

test("AND/OR: BEYOND_REACH absorbs in both, ahead of the FDE table entirely", () => {
  const H = createStage();
  addAnchor(H, "lincoln");
  addAnchor(H, "n16");
  addEdge(H, { rel: "ordinal", s: "lincoln", o: "n16", polarity: "+", source: "wiki" });
  const bound = ["atom", "ordinal", "lincoln", "n16"];
  const beyond = ["atom", "ordinal", "washington", "n1"]; // washington never anchored
  assert.equal(read(H, beyond), BEYOND_REACH, "sanity: an unanchored endpoint is beyond reach");
  assert.equal(read(H, ["and", bound, beyond]), BEYOND_REACH);
  assert.equal(read(H, ["or", bound, beyond]), BEYOND_REACH);
  assert.equal(read(H, ["and", beyond, bound]), BEYOND_REACH);
  assert.equal(read(H, ["or", beyond, bound]), BEYOND_REACH);
});

test("AND/OR: an open-domain forall verdict refuses to compose, typed", () => {
  const H = createStage();
  addAnchor(H, "lincoln");
  addAnchor(H, "n16");
  addEdge(H, { rel: "ordinal", s: "lincoln", o: "n16", polarity: "+", source: "wiki" });
  const allMale = (x) => ["atom", "sex", x, "male"];
  const forallClaim = ["forall", null, allMale, "presidents_fresh"];
  assert.equal(read(H, forallClaim), UNREFUTED, "sanity: nothing refutes it, and it is not declared complete");
  assert.throws(
    () => read(H, ["and", forallClaim, ["atom", "ordinal", "lincoln", "n16"]]),
    /quantifier_in_compound/,
    "an open-domain forall verdict is stage-indexed and must be read alone, never silently coerced into a compound",
  );
  assert.throws(
    () => read(H, ["or", ["atom", "ordinal", "lincoln", "n16"], forallClaim]),
    /quantifier_in_compound/,
  );
});

test("not: R3 involution — swaps BOUND/CONTRADICTED, fixes CONTESTED/UNBOUND/BEYOND_REACH", () => {
  const H = createStage();
  addAnchor(H, "lincoln");
  addAnchor(H, "n16");
  addEdge(H, { rel: "ordinal", s: "lincoln", o: "n16", polarity: "+", source: "wiki" });
  const phi = ["atom", "ordinal", "lincoln", "n16"];
  assert.equal(read(H, ["not", phi]), CONTRADICTED);
  assert.equal(read(H, ["not", ["not", phi]]), read(H, phi), "double negation returns to the original verdict");
  assert.equal(flip(CONTESTED), CONTESTED, "contested is its own fixed point");
  assert.equal(flip(UNBOUND), UNBOUND, "unbound is its own fixed point");
  assert.equal(flip(BEYOND_REACH), BEYOND_REACH, "beyond-reach is its own fixed point");
});

test("exists: BOUND if any witness binds; else CONTESTED if any is contested; else UNBOUND", () => {
  const H = createStage();
  addAnchor(H, "lincoln", "president");
  addAnchor(H, "n16");
  addEdge(H, { rel: "ordinal", s: "lincoln", o: "n16", polarity: "+", source: "wiki" });
  const boundBody = (x) => ["atom", "ordinal", x, "n16"];
  assert.equal(read(H, ["exists", null, boundBody]), BOUND, "one bound witness suffices");

  const H2 = createStage();
  addAnchor(H2, "canyon");
  addAnchor(H2, "old");
  addEdge(H2, { rel: "is", s: "canyon", o: "old", polarity: "+", source: "a" });
  addEdge(H2, { rel: "is", s: "canyon", o: "old", polarity: "-", source: "b" });
  const contestedBody = (x) => ["atom", "is", x, "old"];
  assert.equal(read(H2, ["exists", null, contestedBody]), CONTESTED, "no bound witness, but a contested one, is contested — never bound");

  const H3 = createStage();
  addAnchor(H3, "canyon");
  addAnchor(H3, "old");
  const unboundBody = (x) => ["atom", "is", x, "old"];
  assert.equal(read(H3, ["exists", null, unboundBody]), UNBOUND, "no witness at all is unbound");
});

test("forall: a declared-complete domain reduces to a finite conjunction and can bind", () => {
  const H = createStage();
  addAnchor(H, "hamlin");
  addAnchor(H, "johnson");
  declareComplete(H, "lincoln_vps", ["hamlin", "johnson"], { giver: "us-presidency: Lincoln served two terms" });
  addEdge(H, { rel: "was_senator", s: "hamlin", o: "hamlin", polarity: "+", source: "x" });
  addEdge(H, { rel: "was_senator", s: "johnson", o: "johnson", polarity: "+", source: "x" });
  const sen = (x) => ["atom", "was_senator", x, x];
  assert.equal(read(H, ["forall", null, sen, "lincoln_vps"]), BOUND, "every declared-complete member binds -> forall binds");
});

test("forall: an open domain is refutable (one contradiction) but never bindable at any finite stage", () => {
  const H0 = createStage();
  addAnchor(H0, "lincoln");
  addAnchor(H0, "male");
  addEdge(H0, { rel: "sex", s: "lincoln", o: "male", polarity: "+", source: "x" });
  const allMale = (x) => ["atom", "sex", x, "male"];
  assert.equal(read(H0, ["forall", null, allMale, "presidents_open"]), UNREFUTED, "no counterexample yet, and the domain is open — never BOUND");

  const H1 = extendStage(H0, createStage());
  addAnchor(H1, "someone_else");
  addEdge(H1, { rel: "sex", s: "someone_else", o: "male", polarity: "-", source: "x" });
  assert.equal(read(H1, ["forall", null, allMale, "presidents_open_2"]), CONTRADICTED, "one real counterexample refutes it outright");
});
