import test from "node:test";
import assert from "node:assert/strict";
import { planFold, INTERPRETIVE } from "./fold-plan.js";

test("a structural want plans the assemblies that answer it, with no for-whom needed", () => {
  const p = planFold({ wants: ["Entity", "Link"] });
  assert.deepEqual(p.gaps, []);
  const ids = p.steps.map((s) => s.assembly);
  assert.ok(ids.includes("assembly:entity") && ids.includes("assembly:link"));
  assert.ok(ids.indexOf("assembly:entity") < ids.indexOf("assembly:link"), "link consumes the cast as a witness: entity runs first");
  assert.equal(p.forWhom, null);
});

test("WALL: an interpretive want with no for-whom is refused, never defaulted (no view from nowhere)", () => {
  for (const want of INTERPRETIVE) {
    const p = planFold({ wants: [want] });
    assert.equal(p.steps.length, 0);
    assert.equal(p.gaps[0].gap, "no_for_whom");
  }
  const named = planFold({ wants: ["Lens"], forWhom: "the auditor" });
  assert.equal(named.gaps.length, 0);
  assert.ok(named.steps.some((s) => s.assembly === "assembly:lens"));
  assert.equal(named.forWhom, "the auditor");
});

test("a whitespace-only for-whom is no for-whom", () => {
  assert.equal(planFold({ wants: ["Lens"], forWhom: "   " }).gaps[0].gap, "no_for_whom");
});

test("a want nothing answers is a typed hole, not a nearest guess", () => {
  const p = planFold({ wants: ["Entity", "Sentiment"] });
  assert.ok(p.steps.length >= 1);
  assert.deepEqual(p.gaps.map((g) => [g.want, g.gap]), [["Sentiment", "no_assembly_for"]]);
});

test("the plan never claims more than the registry: an assembly whose measurement has not run is planned unmeasured, with its own stagesNotRun", () => {
  const kind = planFold({ wants: ["Kind"] }).steps.find((s) => s.assembly === "assembly:kind");
  assert.equal(kind.measured, false);
  assert.ok(kind.stagesNotRun.length > 0);
});

test("CONTROL built to fail: the wants come only from the caller — the same wants over any material give the same plan", () => {
  assert.deepEqual(planFold({ wants: ["Network", "Kind"] }), planFold({ wants: ["Kind", "Network", "Kind"] }));
});

test("a want is answered by what an assembly is FOR: Lens plans the lens fold, not the entity fold whose cells merely emit a Lens-domain op; the baseline is never planned", () => {
  const p = planFold({ wants: ["Lens"], forWhom: "the auditor" });
  assert.deepEqual(p.steps.map((s) => s.assembly), ["assembly:lens"]);
  assert.ok(!planFold({ wants: ["Entity", "Link"] }).steps.some((s) => s.layer === "baseline"));
});
