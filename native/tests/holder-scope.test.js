// native/tests/holder-scope.test.js — a reference resolves only against
// what its own holder (or something reachable from it) established, via
// the real contest.js adjudicator. Checked against a non-linguistic domain
// before English modal subordination.

import test from "node:test";
import assert from "node:assert/strict";
import { cellOf } from "../kernel/cube.js";
import { READER as PERSPECTIVE_READER } from "../kernel/perspective.js";
import {
  accessibleHolders, admissibleUnder, resolveUnderHolder,
  RESOLUTION_CELL, READER,
} from "../kernel/holder-scope.js";

test("READER is perspective.js's own reserved baseline, re-exported, not restated", () => {
  assert.equal(READER, PERSPECTIVE_READER);
});

test("cell is read off the real cube, not restated by hand", () => {
  assert.deepEqual(RESOLUTION_CELL, cellOf("CON", "Figure"));
  assert.equal(RESOLUTION_CELL.terrain, "Link");
});

test("accessibleHolders always includes the holder itself, even with no accessibility declared", () => {
  assert.deepEqual([...accessibleHolders("holder:x")], ["holder:x"]);
});

test("accessibleHolders walks the declared graph transitively", () => {
  const accessibility = { "holder:creature": ["holder:victor"], "holder:victor": ["holder:walton"], "holder:walton": [READER] };
  const reach = accessibleHolders("holder:creature", accessibility);
  assert.deepEqual([...reach].sort(), ["holder:creature", "holder:victor", "holder:walton", READER].sort());
});

test("accessibleHolders is cycle-safe — a caller-declared loop does not hang or duplicate", () => {
  const accessibility = { a: ["b"], b: ["a"] };
  const reach = accessibleHolders("a", accessibility);
  assert.deepEqual([...reach].sort(), ["a", "b"]);
});

test("admissibleUnder refuses a referent introduced by an unreachable holder", () => {
  const established = [{ id: "r1", holder: "holder:sibling-hypothesis" }];
  const admissible = admissibleUnder("holder:main", established, {});
  assert.equal(admissible("r1"), false, "a sibling hypothesis's own establishments are not reachable by default — nothing declares that path");
});

test("resolveUnderHolder: a referent reachable through the accessibility graph binds via the real adjudicator", () => {
  const established = [{ id: "wolf-1", holder: "modal:might:m1" }];
  const out = resolveUnderHolder("modal:might:m1", established, {}, {
    scores: new Map([["wolf-1", 1]]), minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(out.verdict, "bound");
  assert.equal(out.id, "wolf-1");
  assert.deepEqual(out.cell, RESOLUTION_CELL);
});

test("resolveUnderHolder composes a caller's own admissible filter (gender, etc.) with the scope filter, ANDed — never overridden", () => {
  const established = [{ id: "r1", holder: "h" }, { id: "r2", holder: "h" }];
  const out = resolveUnderHolder("h", established, {}, {
    scores: new Map([["r1", 1], ["r2", 1]]),
    minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
    admissible: (id) => id === "r2", // e.g. a gender filter excluding r1
  });
  assert.equal(out.id, "r2");
});

// ── omnimodal proof: identical kernel functions, a non-linguistic domain ──

test("OMNIMODAL: a referent established only inside a conditional plan-branch, unreachable from the baseline plan — no NL anywhere", () => {
  const established = [
    { id: "tank-level-1", holder: "plan:baseline" },
    { id: "backup-pump-1", holder: "branch:if-pump-fails" },
  ];
  // "branch:if-pump-fails" reaches the baseline plan (a hypothesis can cite
  // baseline facts) but the baseline plan does NOT reach into the branch —
  // the accessibility graph is directional, declared by the caller.
  const accessibility = { "branch:if-pump-fails": ["plan:baseline"] };

  const insideBranch = resolveUnderHolder("branch:if-pump-fails", established, accessibility, {
    scores: new Map([["tank-level-1", 1], ["backup-pump-1", 5]]),
    minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(insideBranch.id, "backup-pump-1", "the higher-scoring in-branch referent wins when both are reachable");

  const baselineOnly = resolveUnderHolder("plan:baseline", established, accessibility, {
    scores: new Map([["backup-pump-1", 999]]), // even a dominant score cannot cross the scope
    minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(baselineOnly.verdict, "no_candidate", "the baseline plan cannot reach into a branch it never declared reachable");
});

test("ADAPTER-SHAPED: 'A wolf might come in. It would eat you first.' — same kernel code, English holders", () => {
  // A text adapter would recognize "might" as opening a hypothesis and
  // "it" as scoped to it (not built here); English values stand in for
  // what such an adapter would supply.
  const established = [
    { id: "traveller-1", holder: READER },
    { id: "wolf-1", holder: "modal:might:m1" },
  ];
  const accessibility = { "modal:might:m1": [READER] };
  const resolved = resolveUnderHolder("modal:might:m1", established, accessibility, {
    scores: new Map([["traveller-1", 1], ["wolf-1", 5]]),
    minActivation: 0.1, minMargin: 0.2, contestedMargin: 0.5,
  });
  assert.equal(resolved.id, "wolf-1", "\"it\" resolves to the wolf the hypothesis itself introduced, not the reader's own baseline traveller");
});
