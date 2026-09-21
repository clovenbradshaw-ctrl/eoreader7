// referent-name-falsify.test.mjs — THE FALSIFICATION TIER for the law:
//
//   "a prettyName on a referent is an assertion that can be revised in the
//   log" (2026-09-21).
//
// The prettyName is NOT a datum (the reading-log's `represent` picking the
// longest surface silently is a fixed ladder). It is an ASSERTION — "this
// surface names this referent" — with a basis, a stance, and an APPEND-ONLY
// log of revisions. A better name SUPERSEDES, never edits; the prior name is
// the superseded history entry. Each falsification attacks a consequence.
import test from "node:test";
import assert from "node:assert/strict";
import {
  createNameRegister,
  assertName,
  reviseName,
  concedeName,
  nameFor,
  representName,
  NAME_STANCES,
} from "./referent-name.js";

// ── N1  A NAME IS AN ASSERTION, NEVER A BARE STRING. It is born with a basis
// and a for-whom; re-asserting over an existing name is refused (a referent is
// named once; revise it in the log).
test("N1 — a name is an assertion with basis + for-whom; re-assertion is refused", () => {
  const r = createNameRegister();
  const entry = assertName(r, "r07f3c91", { name: "the Cumberland River", basis: "longest surface in the reading's fold", forWhom: "english" });
  assert.ok(entry, "a name is asserted");
  assert.equal(entry.name, "the Cumberland River");
  assert.equal(entry.basis, "longest surface in the reading's fold", "the name carries its reason");
  assert.equal(entry.stance, NAME_STANCES.HOLDS);
  assert.equal(entry.history.length, 1, "born with one log entry");
  const again = assertName(r, "r07f3c91", { name: "the river", basis: "another try", forWhom: "english" });
  assert.ok(again.refused, "re-asserting over a named referent FOR THE SAME WHOM is refused");
  assert.equal(again.refused.type, "already_named");
  // A name FOR A DIFFERENT whom is a DIFFERENT assertion (S43) — not refused.
  const other = assertName(r, "r07f3c91", { name: "река Камберленд", basis: "russian reading", forWhom: "russian" });
  assert.ok(other && !other.refused, "a name for another for-whom is a separate assertion, never a re-assertion");
});

// ── N2  A REVISION SUPERSEDES, NEVER EDITS — THE LOG IS APPEND-ONLY. The
// prior name is kept as the superseded history entry; the log grew, nothing
// erased. The current name is folded from the log.
test("N2 — a revision supersedes; the prior name is the superseded history entry", () => {
  const r = createNameRegister();
  assertName(r, "r07f3c91", { name: "the Cumberland River", basis: "longest surface", forWhom: "english" });
  const rev = reviseName(r, "r07f3c91", { name: "the Cumberland", basis: "a shorter canonical form wins for the english for-whom", forWhom: "english", giver: "the editor" });
  assert.ok(rev.revised);
  assert.equal(rev.was, "the Cumberland River", "the prior name is recorded");
  assert.equal(rev.now, "the Cumberland");
  const entry = r.byId.get(`r07f3c91\u0000english`);
  assert.equal(entry.history.length, 2, "the log grew — append-only");
  assert.equal(entry.history[0].name, "the Cumberland River", "the prior name is the superseded history entry, never erased");
  const folded = nameFor(r, "r07f3c91", { forWhom: "english" });
  assert.equal(folded.name, "the Cumberland", "the current name is folded from the log");
});

// ── N3  THE NAME IS A PROJECTION FOR A FOR-WHOM — two frames may name one
// referent differently (S43), each in its own log. The fold reads the right
// one; neither is merged into a single voice.
test("N3 — the name is per-for-whom; two frames, two names, never merged", () => {
  const r = createNameRegister();
  assertName(r, "r07f3c91", { name: "the Cumberland River", basis: "english reading", forWhom: "english" });
  assertName(r, "r07f3c91", { name: "река Камберленд", basis: "russian reading", forWhom: "russian" });
  const en = nameFor(r, "r07f3c91", { forWhom: "english" });
  const ru = nameFor(r, "r07f3c91", { forWhom: "russian" });
  assert.equal(en.name, "the Cumberland River");
  assert.equal(ru.name, "река Камберленд");
  assert.notEqual(en.name, ru.name, "two recipes, two instruments — never merged into one voice");
});

// ── N4  A CONCEDED NAME IS FOLDED AWAY — the absence of the wrong path. The
// record that demonstrated the name wrong keeps the concession in the log; the
// name is no longer projected, but it is never erased.
test("N4 — a conceded name is folded away but never erased from the log", () => {
  const r = createNameRegister();
  assertName(r, "r4b88d1a", { name: "Nashville", basis: "longest surface", forWhom: "english" });
  const c = concedeName(r, "r4b88d1a", { basis: "the material never calls it Nashville — the surface was a mis-attribution", forWhom: "english", giver: "the reader" });
  assert.ok(c.revised);
  const folded = nameFor(r, "r4b88d1a", { forWhom: "english" });
  assert.equal(folded, null, "a conceded name is folded away — absent, not forbidden");
  const entry = r.byId.get(`r4b88d1a\u0000english`);
  assert.equal(entry.history.length, 2, "the concession is in the log");
  assert.equal(entry.history[0].name, "Nashville", "the prior name is the superseded entry — never erased");
  // The fallback projection names the referent by id when the name is folded
  // away — disclosed, never a silent guess.
  const proj = representName(r, "r4b88d1a", { forWhom: "english", fallback: "r4b88d1a" });
  assert.equal(proj, "r4b88d1a", "the fallback is the id itself, disclosed");
});