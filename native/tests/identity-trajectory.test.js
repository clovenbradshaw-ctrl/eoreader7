import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stagesOf, continuity, similarityAt, splice, mergeBelief } from "../kernel/identity-trajectory.js";
import { createForWhom } from "../kernel/for-whom.js";
import { identityVerdict } from "../kernel/identity-verdict.js";

// A world of 10 anchors over 20 stages. Each anchor drifts: at stage s it uses
// its own features "a<k>:<s>" and "a<k>:<s+1>" (overlapping chain), so its
// first and last stages share nothing, while every neighbouring pair shares one.
function world({ anchors = 10, stages = 20, perStage = 6 } = {}) {
  const by = new Map();
  for (let k = 0; k < anchors; k += 1) {
    const occ = [];
    for (let s = 0; s < stages; s += 1) for (let j = 0; j < perStage; j += 1) occ.push({ at: s * 100 + j, features: [`a${k}:${s}`, `a${k}:${s + 1}`, "common"] });
    by.set(`a${k}`, stagesOf(occ, { stageSize: 100, minPerStage: 3, forWhom: null }));
  }
  return by;
}

test("every number is declared", () => {
  assert.throws(() => stagesOf([], {}), /declared/);
  assert.throws(() => continuity(new Map(), "x", {}), /declared/);
  assert.throws(() => mergeBelief([1], [2], { window: 10, totalFrames: 100 }), /declared/);
});

test("continuity is a chain: every link holds though first and last share nothing", () => {
  const by = world();
  const c = continuity(by, "a0", { minOthers: 5 });
  assert.equal(c.continuous, 1, JSON.stringify(c.links.filter((l) => l.verdict !== "holds")));
  const direct = similarityAt(by, "a0", "a0", 0, 19, { minOthers: 5 });
  assert.equal(direct.sim, similarityAt(by, "a0", "a1", 0, 19, { minOthers: 5 }).sim, "first and last stages are no more alike than two strangers");
});

test("CONTROL built to fail: another being spliced in breaks the chain at the splice", () => {
  const { byAnchor, spliced } = splice(world(), "a0", "a1", { every: 4 });
  const c = continuity(byAnchor, "a0", { minOthers: 5 });
  const atSplice = c.links.filter((l) => spliced.includes(l.to) || spliced.includes(l.from));
  assert.ok(spliced.length >= 3);
  assert.ok(atSplice.every((l) => l.verdict === "breaks"), JSON.stringify(atSplice));
});

test("the for-whom's lens decides what counts: a lens that sees only 'common' sees no one", () => {
  const fw = createForWhom({ id: "only-common", question: "who is who", universe: ["common"] });
  const occ = [{ at: 1, features: ["a:1", "common"] }, { at: 2, features: ["a:1", "common"] }, { at: 3, features: ["a:1", "common"] }];
  const st = stagesOf(occ, { stageSize: 100, minPerStage: 3, forWhom: fw });
  assert.deepEqual([...st.get(0).vec.keys()], ["common"]);
});

const LIK = { same: 0.5, different: 1.5, giver: "test-declared rates" };
test("a prior that yields: the material overturns 'same' when the two are named together", () => {
  const a = [], b = [];
  for (let s = 0; s < 40; s += 1) for (let j = 0; j < 4; j += 1) { a.push(s * 20 + j); b.push(s * 20 + j); } // always in the same frame
  const r = mergeBelief(a, b, { prior: { logOdds: 2.2, giver: "surname prior (test)" }, likelihood: LIK, window: 20, totalFrames: 800 });
  assert.equal(r.verdict, "different");
  assert.equal(r.prior.yielded, true);
  assert.ok(r.path[0].logOdds > r.path.at(-1).logOdds);
});

test("the material alone can support 'same': one being never named twice in one frame", () => {
  const a = [], b = [];
  for (let s = 0; s < 40; s += 1) for (let j = 0; j < 4; j += 1) { a.push(s * 20 + j); b.push(s * 20 + 10 + j); }
  assert.equal(mergeBelief(a, b, { prior: null, likelihood: LIK, window: 20, totalFrames: 800 }).verdict, "same");
});

test("an undeclared prior is refused as a bias", () => {
  assert.throws(() => mergeBelief([1], [2], { prior: { logOdds: 1 }, likelihood: LIK, window: 20, totalFrames: 100 }), /bias/);
});

test("a verdict says who it was made for — and says so when no one was declared", () => {
  const ind = { a: "x", b: "y", verdict: "unbound", reason: null }, ex = { a: "x", b: "y", verdict: "unbound", proof: [] };
  assert.equal(identityVerdict(ind, ex).judgedFor.id, null);
  const fw = createForWhom({ id: "genealogist", question: "who descends from whom", giver: "a genealogist" });
  assert.equal(identityVerdict(ind, ex, { forWhom: fw }).judgedFor.giver, "a genealogist");
});

test("the organ names no medium and reads no spelling", () => {
  const src = readFileSync(new URL("../kernel/identity-trajectory.js", import.meta.url), "utf8").replace(/\/\/.*$/gm, "");
  for (const w of ["sentence", "word", "token", "text", "string", "name"]) assert.ok(!new RegExp(`\\b${w}`, "i").test(src), `kernel code names '${w}'`);
});

test("the displaced true stage stays as a rival: an impostor must beat the being's own next stage", () => {
  // a1 is a close companion of a0: it shares a0's own features at every stage
  const by = world();
  const comp = new Map([...by.get("a0")].map(([s, st]) => [s, { n: st.n, vec: new Map([...st.vec, ["companion", 3]]) }]));
  by.set("a1", comp);
  const loose = continuity(splice(by, "a0", "a1", { every: 4 }).byAnchor, "a0", { minOthers: 5 });
  const { byAnchor, spliced } = splice(by, "a0", "a1", { every: 4, keepDisplaced: true });
  const fair = continuity(byAnchor, "a0", { minOthers: 5 });
  const at = (c) => c.links.filter((l) => spliced.includes(l.to));
  assert.ok(at(loose).some((l) => l.verdict === "holds"), "without the rival, a companion passes for the being");
  assert.ok(at(fair).every((l) => l.verdict === "breaks"), JSON.stringify(at(fair)));
});

test("a feature every being shares at a moment weighs nothing", async () => {
  const { weightByDistinction } = await import("../kernel/identity-trajectory.js");
  const w = weightByDistinction(world());
  assert.ok(!w.get("a0").get(0).vec.has("common"));
  assert.ok(w.get("a0").get(0).vec.get("a0:0") > 0);
});
