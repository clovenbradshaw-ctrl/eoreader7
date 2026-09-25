// cube.test.mjs — the algebra's own tables, against the real module.
import test from "node:test";
import assert from "node:assert/strict";
import { OPERATOR_CHAIN, DOMAINS, MODES, algebraAddresses } from "../kernel/cube.js";
import { OPERATOR_ORDER } from "../kernel/task-log.js";

test("OPERATOR_CHAIN is DERIVED from the cube's own tables, and equals canon", () => {
  // The divergence this replaces: task-log.js carried a hand-written
  // OPERATOR_ORDER (NUL SEG SIG CON EVA DEF INS SYN REC) whose own header
  // said "nothing is restated here" — while restating, and drifting from,
  // the OP_MODE/OP_DOMAIN tables ten lines above it. Audited 2026-09-01
  // against every operator-typed entry on disk and the full native suite:
  // neither could tell the two orders apart, so the divergence protected
  // nothing measurable. Derivation makes the drift structurally impossible.
  assert.deepEqual([...OPERATOR_CHAIN], ["NUL", "SIG", "INS", "SEG", "CON", "SYN", "DEF", "EVA", "REC"],
    "CUBE.md line 39's own enumeration");
  // it is domain-major x mode, read off the same tables cellOf uses
  const rebuilt = DOMAINS.flatMap((d) => MODES.map((m) => {
    const hit = algebraAddresses().find((a) => a.domain === d && a.mode === m);
    return hit?.op;
  })).filter(Boolean);
  assert.deepEqual([...OPERATOR_CHAIN], rebuilt, "derived, not typed: rebuilding it from cellOf's own output agrees");
  // and task-log serves the same object, so no consumer can see a different order
  assert.equal(OPERATOR_ORDER, OPERATOR_CHAIN, "task-log's OPERATOR_ORDER IS the chain, not a copy of it");
});
