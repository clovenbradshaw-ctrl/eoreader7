import { test } from "node:test";
import assert from "node:assert/strict";
import { regimeFinding } from "./design-regime.js";

test("regimeFinding: refuses an undeclared regime — visual pathos for no one in particular", () => {
  assert.throws(() => regimeFinding({ declaredRegime: undefined, tokenUsage: [] }), /declared regime/);
});

test("regimeFinding: expressive-rupture never convicts, whatever the token usage looks like", () => {
  const r = regimeFinding({ declaredRegime: "expressive-rupture", tokenUsage: [{ value: "#121212", role: "bg" }, { value: "#131313", role: "bg" }] });
  assert.equal(r.contested, false);
});

test("regimeFinding: grid-systematic catches a real inconsistency (two near-identical grays for one role)", () => {
  const r = regimeFinding({ declaredRegime: "grid-systematic", tokenUsage: [{ value: "#121212", role: "bg" }, { value: "#131313", role: "bg" }] });
  assert.equal(r.contested, true);
  assert.equal(r.inconsistentRoles[0].role, "bg");
});

test("CONTROL: grid-systematic with genuinely consistent token usage is not contested", () => {
  const r = regimeFinding({ declaredRegime: "grid-systematic", tokenUsage: [{ value: "#121212", role: "bg" }, { value: "#121212", role: "bg" }, { value: "#1DB954", role: "accent" }] });
  assert.equal(r.contested, false);
});
