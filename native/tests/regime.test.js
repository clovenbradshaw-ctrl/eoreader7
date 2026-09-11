import test from "node:test";
import assert from "node:assert/strict";
import {
  persistenceOf, regimeOf, forceOfClause, parseValidityWindow, inValidityWindow,
  tagClaim, isSettled, precedence, FORCES, scopeSatisfied, moreSpecific,
} from "../organs/regime.js";

test("persistenceOf: stored/ephemeral per the nine operators, unknown operator refused", () => {
  for (const op of ["INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"]) assert.equal(persistenceOf(op), "stored");
  for (const op of ["NUL", "SIG"]) assert.equal(persistenceOf(op), "ephemeral");
  assert.throws(() => persistenceOf("XYZ"), /unknown operator/);
});

test("regimeOf: any live dispute makes a claim contested, none makes it classical", () => {
  assert.equal(regimeOf([]), "classical");
  assert.equal(regimeOf(undefined), "classical");
  assert.equal(regimeOf([{ source: "a" }]), "contested");
});

test("forceOfClause: closed class only, narrative text never misread as an obligation", () => {
  assert.equal(forceOfClause("Operators must file a report within 30 days."), "O");
  assert.equal(forceOfClause("Residents shall not park on the north side."), "O");
  assert.equal(forceOfClause("Operators may request an extension."), "P");
  assert.equal(forceOfClause("The report describes annual rainfall."), "default");
  // reported speech about a real-world obligation is not THIS engine's own —
  // still classifies O by the closed-class rule (it cannot tell the two
  // apart from words alone), named here as the disclosed limit rather than
  // silently assumed away.
  assert.equal(forceOfClause("She said he must go."), "O");
});

test("parseValidityWindow: effective-date and sunset clauses parsed; unrecognized phrasing is open, never guessed", () => {
  const w1 = parseValidityWindow("This ordinance is effective as of January 1, 2020 and expires on December 31, 2024.");
  assert.equal(w1.open, false);
  assert.ok(Number.isFinite(w1.from));
  assert.ok(Number.isFinite(w1.until));
  assert.ok(w1.from < w1.until);

  const w2 = parseValidityWindow("Residents shall keep sidewalks clear of debris.");
  assert.deepEqual(w2, { from: null, until: null, open: true });
});

test("inValidityWindow: before from, at/after until, and the open control", () => {
  const window = parseValidityWindow("Effective as of 2020-01-01. This ordinance expires on 2024-12-31.");
  assert.equal(inValidityWindow(window, Date.parse("2019-06-01")), false, "before the window opens");
  assert.equal(inValidityWindow(window, Date.parse("2022-06-01")), true, "inside the window");
  assert.equal(inValidityWindow(window, Date.parse("2024-12-31")), false, "at the sunset instant, no longer in effect");
  assert.equal(inValidityWindow(window, Date.parse("2025-01-01")), false, "after sunset");
  assert.equal(inValidityWindow({ open: true }, Date.parse("2099-01-01")), true, "the disclosed unbounded control");
});

test("tagClaim + isSettled: the four fields assigned together, isSettled reading regime alone", () => {
  const tag = tagClaim({}, { operator: "SYN", disputedBy: [{ source: "x" }], force: "O" });
  assert.equal(tag.persistence, "stored");
  assert.equal(tag.regime, "contested");
  assert.equal(tag.force, "O");
  assert.equal(isSettled(tag), false);

  const settled = tagClaim({}, { operator: "INS", disputedBy: [] });
  assert.equal(isSettled(settled), true);
  assert.equal(settled.force, "default", "narrative claims default without text scanning");
});

// ── precedence: the fixed order, stop at the first rule that applies ───────

test("precedence: an out-of-scope claim (validity window) never reaches force or entrenchment", () => {
  const inWindow = { tag: tagClaim({}, { operator: "INS", validityText: "Effective as of 2020-01-01. Expires on 2024-12-31.", queryTime: Date.parse("2022-01-01") }), grain: "Pattern" };
  const expired = { tag: tagClaim({}, { operator: "DEF", validityText: "Effective as of 2010-01-01. Expires on 2015-01-01.", queryTime: Date.parse("2022-01-01") }), grain: "Ground" };
  // expired has HIGHER force priority and MORE entrenched grain than inWindow
  // would — if either mattered, expired should win. It must not even reach
  // that comparison.
  const r = precedence(inWindow, expired, { queryTime: Date.parse("2022-01-01") });
  assert.equal(r.winner, "a");
  assert.equal(r.reason, "validity_window");
});

test("precedence: a contested claim is never silently picked as the winner — routes to landContest instead", () => {
  const contested = { tag: tagClaim({}, { operator: "SYN", disputedBy: [{ source: "x" }] }), grain: "Ground" };
  const classical = { tag: tagClaim({}, { operator: "SYN", disputedBy: [] }), grain: "Pattern" };
  // classical has the WEAKER grain (Pattern, least entrenched) — if
  // entrenchment ran, contested's Ground grain would win. It must not
  // reach that comparison either.
  const r = precedence(contested, classical);
  assert.equal(r.winner, null);
  assert.equal(r.reason, "route_to_landContest");
});

test("precedence: force decides once both are in scope and settled — O beats default beats P", () => {
  const obligation = { tag: tagClaim({}, { operator: "INS", force: "O" }), grain: "Pattern" };
  const permission = { tag: tagClaim({}, { operator: "INS", force: "P" }), grain: "Ground" };
  // permission has the stronger (more entrenched) grain — must not matter.
  const r = precedence(obligation, permission);
  assert.equal(r.winner, "a");
  assert.equal(r.reason, "force");
});

test("precedence: entrenchment (grain) only decides once validity, regime and force are all tied", () => {
  const ground = { tag: tagClaim({}, { operator: "INS", force: "default" }), grain: "Ground" };
  const pattern = { tag: tagClaim({}, { operator: "SYN", force: "default" }), grain: "Pattern" };
  const r = precedence(ground, pattern);
  assert.equal(r.winner, "a");
  assert.equal(r.reason, "entrenchment");
});

test("precedence: an unresolved tie is reported, never silently broken", () => {
  const a = { tag: tagClaim({}, { operator: "INS", force: "default" }), grain: "Figure" };
  const b = { tag: tagClaim({}, { operator: "SEG", force: "default" }), grain: "Figure" };
  const r = precedence(a, b);
  assert.equal(r.winner, null);
  assert.equal(r.reason, "tied");
});

// ── the falsifiable acceptance case, section 7 of the seed ─────────────────
//
// One ordinance with a sunset clause, one contested claim, same corpus.
// Before this module: nothing stopped a transitivity/circularity-only
// reasoning layer from either silently resolving the contest, or treating
// an expired obligation as still live (no validity-window concept
// existed). After: both are caught by regime.js alone, mechanically.

test("acceptance: sunset clause expires an obligation before entrenchment, AND a contested claim never wins precedence — same corpus", () => {
  const queryTime = Date.parse("2026-09-10");

  // The ordinance: an obligation with a sunset clause that has already
  // passed relative to queryTime.
  const expiredObligation = {
    tag: tagClaim({}, {
      operator: "INS",
      validityText: "This ordinance is effective as of 2015-01-01 and shall terminate on 2020-12-31.",
      force: forceOfClause("Operators must file an annual report."),
      queryTime,
    }),
    grain: "Ground", // maximally entrenched — if the window check is skipped, this claim would win on every later rule too
  };

  // A live, unrelated claim in scope right now, with weaker force AND
  // weaker grain — it should win ONLY because the obligation above is out
  // of scope, never because it out-argues it on force or entrenchment.
  const liveDefault = {
    tag: tagClaim({}, { operator: "SYN", force: "default", queryTime }),
    grain: "Pattern",
  };

  const r1 = precedence(expiredObligation, liveDefault, { queryTime });
  assert.equal(r1.winner, "b", "the expired obligation loses on validity_window despite O-force and Ground-grain, which would otherwise win every later rule");
  assert.equal(r1.reason, "validity_window");

  // The SAME corpus also carries a disputed claim — an in-scope, O-force,
  // Ground-grain assertion that a source has contested.
  const contestedClaim = {
    tag: tagClaim({}, { operator: "INS", disputedBy: [{ source: "third-party.txt" }], force: "O", queryTime }),
    grain: "Ground",
  };
  const classicalP = {
    tag: tagClaim({}, { operator: "INS", force: "P", queryTime }),
    grain: "Pattern",
  };

  const r2 = precedence(contestedClaim, classicalP, { queryTime });
  assert.equal(r2.winner, null, "a contested claim is never picked as the winner, however strong its force or grain");
  assert.equal(r2.reason, "route_to_landContest");

  // And neither case leaked into the other: the expired obligation's
  // failure was validity_window, not contest-routing; the contested
  // claim's failure was regime, not a validity-window artifact.
  assert.notEqual(r1.reason, "route_to_landContest");
  assert.notEqual(r2.reason, "validity_window");
});

// ── the 2026-09-10 amendment: specificity (lex specialis) and recency ──────
// (lex posterior), both closing gaps found by hard-logic-battery.mjs's
// TC-A and TC-B.

test("scopeSatisfied: no declared scope is unconditional; a declared scope needs every tag present", () => {
  assert.equal(scopeSatisfied(null, []), true);
  assert.equal(scopeSatisfied(new Set(["day:sunday"]), ["day:sunday", "resident:true"]), true);
  assert.equal(scopeSatisfied(new Set(["day:sunday", "resident:true"]), ["day:sunday"]), false);
});

test("moreSpecific: a proper superset of conditions is more specific; equal, subset or incomparable scopes are not", () => {
  const general = new Set(["location:downtown"]);
  const specific = new Set(["location:downtown", "day:sunday", "resident:true"]);
  const incomparable = new Set(["location:downtown", "vehicle:truck"]);
  assert.equal(moreSpecific(specific, general), true);
  assert.equal(moreSpecific(general, specific), false);
  assert.equal(moreSpecific(general, general), false, "equal scopes are not more specific than each other");
  assert.equal(moreSpecific(specific, incomparable), false, "neither is a superset of the other");
  assert.equal(moreSpecific(null, general), false);
});

test("precedence: lex specialis — a satisfied specific exception now beats a general obligation (TC-A closed)", () => {
  const general = { tag: tagClaim({}, { operator: "INS", force: "O", scope: ["location:downtown"] }), grain: "Pattern" };
  const specific = { tag: tagClaim({}, { operator: "INS", force: "P", scope: ["location:downtown", "day:sunday", "resident:true"] }), grain: "Ground" };
  const r = precedence(general, specific, { conditions: ["location:downtown", "day:sunday", "resident:true"] });
  assert.equal(r.winner, "b");
  assert.equal(r.reason, "specificity");
});

test("precedence: an unsatisfied specific exception never wins on specificity — the query's own conditions decide applicability", () => {
  const general = { tag: tagClaim({}, { operator: "INS", force: "O", scope: ["location:downtown"] }), grain: "Pattern" };
  const specific = { tag: tagClaim({}, { operator: "INS", force: "P", scope: ["location:downtown", "day:sunday", "resident:true"] }), grain: "Ground" };
  // it is NOT Sunday — the specific exception's own conditions are not met
  const r = precedence(general, specific, { conditions: ["location:downtown"] });
  assert.equal(r.winner, "a", "falls through to force since specificity did not apply — the general rule wins, correctly, because the exception's conditions are not met");
  assert.equal(r.reason, "force");
});

test("precedence: claims with no declared scope, or incomparable scopes, fall through to force exactly as before", () => {
  const a = { tag: tagClaim({}, { operator: "INS", force: "O" }), grain: "Pattern" };
  const b = { tag: tagClaim({}, { operator: "INS", force: "P" }), grain: "Ground" };
  const r = precedence(a, b);
  assert.equal(r.winner, "a");
  assert.equal(r.reason, "force");
});

test("precedence: lex posterior — a later enactment supersedes an earlier one of equal force and grain (TC-B closed)", () => {
  const older = { tag: tagClaim({}, { operator: "INS", force: "default", enactedAt: Date.parse("2010-01-01") }), grain: "Figure" };
  const newer = { tag: tagClaim({}, { operator: "INS", force: "default", enactedAt: Date.parse("2024-01-01") }), grain: "Figure" };
  const r = precedence(older, newer);
  assert.equal(r.winner, "b");
  assert.equal(r.reason, "recency");
});

test("precedence: recency is skipped entirely when either side declares no enactment date — falls through to entrenchment, never a guessed default", () => {
  const withDate = { tag: tagClaim({}, { operator: "INS", force: "default", enactedAt: Date.parse("2024-01-01") }), grain: "Pattern" };
  const withoutDate = { tag: tagClaim({}, { operator: "SYN", force: "default" }), grain: "Ground" };
  const r = precedence(withDate, withoutDate);
  assert.equal(r.winner, "b", "entrenchment decides (Ground beats Pattern) since recency could not — not the one WITH a date winning by default");
  assert.equal(r.reason, "entrenchment");
});

test("precedence: the full order still holds — validity and regime outrank specificity and recency, exactly as they outrank force", () => {
  const queryTime = Date.parse("2026-09-10");
  const expiredButSpecific = {
    tag: tagClaim({}, {
      operator: "INS", force: "P", scope: ["location:downtown", "day:sunday"],
      validityText: "Effective as of 2010-01-01. Expires on 2015-01-01.", queryTime,
    }),
    grain: "Ground",
  };
  const liveGeneral = { tag: tagClaim({}, { operator: "INS", force: "O", scope: ["location:downtown"], queryTime }), grain: "Pattern" };
  const r = precedence(expiredButSpecific, liveGeneral, { queryTime, conditions: ["location:downtown", "day:sunday"] });
  assert.equal(r.winner, "b", "the expired claim loses on validity_window despite being more specific and Ground-grain — validity still runs first");
  assert.equal(r.reason, "validity_window");
});
