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

// ── the capacity map, wired (native/docs/THE-CAPACITY-MAP.md) ──────────────────────────────
import { NO_CROSSINGS, DECLARED_CROSSINGS } from "../kernel/capacity-map.js";

// The strict order is a hypothesis the pre-registered tests did not support, so it is not the default; it is still
// planned against, explicitly, here.
const STRICT = { crossings: DECLARED_CROSSINGS };

test("by default a plan reports only the places beneath within the class (ground before figure): the strict order across classes is not in force", () => {
  const p = planFold({ wants: ["Lens"], forWhom: "the auditor" });
  assert.deepEqual(p.steps.map((s) => s.assembly), ["assembly:lens"], "default behaviour is unchanged: only what was asked");
  assert.deepEqual(p.unmetPrerequisites.map((u) => u.terrain), ["Atmosphere"]);
  assert.deepEqual(planFold({ wants: ["Lens"], forWhom: "x", crossing: true }).steps.map((s) => s.assembly), ["assembly:atmosphere", "assembly:lens"]);
});

test("under the strict order (a hypothesis, asked for explicitly) a plan reports what it leaves unearned: a Lens asked for alone names the places beneath it", () => {
  const p = planFold({ wants: ["Lens"], forWhom: "the auditor", ...STRICT });
  assert.deepEqual(p.steps.map((s) => s.assembly), ["assembly:lens"], "only what was asked");
  assert.deepEqual(p.unmetPrerequisites.map((u) => u.terrain).sort(), ["Atmosphere", "Entity", "Field", "Link", "Void"]);
  assert.ok(p.unmetPrerequisites.every((u) => u.for === "Lens"));
  // the lens is reached with nothing beneath it: an orphan, and every class but one is unplaced
  assert.deepEqual(p.profile.reached.orphans.map((o) => o.terrain), ["Lens"]);
  assert.equal(p.profile.reached.profile.gap, "unplaced_class");
});

test("crossing: true repairs it — prerequisites become supporting steps, nearest the ground first, the asked-for fold last", () => {
  const p = planFold({ wants: ["Lens"], forWhom: "the auditor", crossing: true, ...STRICT });
  assert.deepEqual(p.unmetPrerequisites, []);
  assert.deepEqual(p.gaps, []);
  const ids = p.steps.map((s) => s.assembly);
  assert.deepEqual(ids, ["assembly:entity", "assembly:link", "assembly:atmosphere", "assembly:lens"]);
  const lens = p.steps.find((s) => s.assembly === "assembly:lens");
  assert.deepEqual(lens.reasons, ["asked"]);
  for (const s of p.steps.filter((x) => x.assembly !== "assembly:lens")) assert.ok(s.reasons.every((r) => r === "prerequisite of Lens" || r.startsWith("witness for")), `${s.assembly}: ${s.reasons}`);
});

test("CONTROL built to fail: with the crossings withdrawn the same plan asks for nothing beneath the Lens but its own ground", () => {
  const p = planFold({ wants: ["Lens"], forWhom: "the auditor", crossing: true, crossings: NO_CROSSINGS });
  assert.deepEqual(p.steps.map((s) => s.assembly), ["assembly:atmosphere", "assembly:lens"]);
});

test("`have` satisfies prerequisites; a same-read witness is still pulled in, because the registry says a witness is only lawful from the same read", () => {
  const five = ["Void", "Entity", "Field", "Link", "Atmosphere"];
  const all = planFold({ wants: ["Lens"], forWhom: "x", crossing: true, have: five, ...STRICT });
  assert.deepEqual(all.steps.map((s) => s.assembly), ["assembly:lens"]);
  const some = planFold({ wants: ["Lens"], forWhom: "x", crossing: true, have: ["Void", "Entity", "Atmosphere"], ...STRICT });
  const entity = some.steps.find((s) => s.assembly === "assembly:entity");
  assert.ok(entity && entity.reasons.some((r) => r.startsWith("witness for")), "link consumes the cast as a witness, so entity runs in this plan even though Entity is already had");
});

test("WALL holds under crossing: a Lens with no for-whom is refused and its prerequisites are not planned on its behalf", () => {
  const p = planFold({ wants: ["Lens"], crossing: true, ...STRICT });
  assert.equal(p.steps.length, 0);
  assert.deepEqual(p.gaps.map((g) => g.gap), ["no_for_whom"]);
});

test("the same wants in any order give the same plan, crossing or not (canonical output)", () => {
  for (const crossing of [false, true]) {
    const a = planFold({ wants: ["Network", "Kind", "Lens"], forWhom: "x", crossing, ...STRICT });
    const b = planFold({ wants: ["Lens", "Kind", "Network", "Kind"], forWhom: "x", crossing, ...STRICT });
    assert.deepEqual(a, b);
  }
});

test("a Network fold is planned UNMEASURED: the registry says the native run on real material has not been done (the old pattern missed 'native run on real material')", () => {
  const net = planFold({ wants: ["Network"] }).steps.find((s) => s.assembly === "assembly:network");
  assert.equal(net.measured, false);
});

test("an assembly that also declares a place above an unread one leaves an orphan the plan reports, not hides", () => {
  const p = planFold({ wants: ["Atmosphere"], forWhom: "x" });
  assert.deepEqual(p.profile.reached.orphans.map((o) => o.terrain), ["Paradigm"], "the atmosphere assembly declares Paradigm too; nothing beneath it reads a Lens");
});
