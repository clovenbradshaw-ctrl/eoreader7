// thesis-claim-falsify.test.mjs — claimsOf, the reasoning-core bridge
// (2026-09-25): a generalized thesis claim, read through organs/
// reasoning-lint.js's real lintGfp/falsifyGfp, not just the kernel that
// built it. Each member claim strict at its own real ground; one claim at
// the generalization's own ground, force default; never strict at the lca.
import test from "node:test";
import assert from "node:assert/strict";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { loadEotParser, attachEot } from "./eot-notation.js";
import { arrangeEssay } from "./arrange.js";
import { thesisBasin, thesisGeneralization, claimsOf } from "./thesis-claim.js";
import { lintGfp, falsifyGfp } from "../organs/reasoning-lint.js";
import { gfpClaim } from "../kernel/gfp-claim.js";

const SHAPED = [
  "The river shaped the town.", "", "The river shaped the port.", "", "The river shaped the valley.", "", "The river shaped the harbor.", "",
  "The ferry carried grain across the river.", "", "The mill ground wheat beside the river.", "", "The road followed the river.", "",
  "The market sold fish from the river.", "", "The bridge crossed the river.", "", "The barge hauled coal down the river.", "",
  "The fog hid the river.", "", "The flood covered the river.",
].join("\n");

function notesOf(pt) {
  const out = [];
  for (const r of pt.eot ?? []) {
    const m = r.meaning; if (!m?.nodes?.length) continue;
    const byKey = new Map(m.nodes.map((n) => [n.key, n]));
    const rootArc = (m.arcs ?? []).find((a) => a.from == null);
    const root = rootArc ? byKey.get(rootArc.to) : null; if (!root) continue;
    const arcs = (m.arcs ?? []).filter((a) => a.from === root.key);
    const subj = arcs.find((a) => /^nsubj/.test(a.rel));
    const obj = arcs.find((a) => a.rel === "obj") ?? arcs.find((a) => a.rel === "obl");
    if (!(subj && obj)) continue;
    out.push({ id: `${pt.id}:${root.key}`, end1: byKey.get(subj.to)?.lemma, label: root.lemma, end2: byKey.get(obj.to)?.lemma, witness: pt.id, polarity: "+", via: obj.rel === "obl" ? "obl:" : "obj" });
  }
  return out;
}

test("claimsOf: a real generalized thesis becomes real claims the reasoning core reads cleanly — strict at each member's own ground, default at the lca, never strict at the lca", async (t) => {
  const parser = await loadEotParser();
  if (!parser.ok) return t.skip(parser.reason);
  const task = "Write an essay on the river.";
  const d = attachReferents(buildDraft({ task, ground: SHAPED }), buildReferents(SHAPED));
  attachEot(drawnParts(d).flatMap((p) => p.children), parser.parse(SHAPED, "ground"));
  const points = drawnParts(d).flatMap((p) => (p.children ?? []).map((pt) => ({ ...pt, part: p.id })));
  const feat = points.map((pt) => ({ pt, notes: notesOf(pt) }));
  const o = arrangeEssay({ draft: d });
  assert.ok(o.thesis.claim, "the pipeline itself generalizes on this fixture");

  const hunt = thesisBasin(feat, o.thesis.id, { population: "test" });
  const basinMembers = feat.filter((f) => hunt.candidate?.memberRefs.includes(f.pt.id));
  const gen = thesisGeneralization(basinMembers, { winnerId: o.thesis.id });
  assert.equal(gen.claims.length, 4, "one claim per basin member, kept not discarded");

  const claims = claimsOf(gen);
  assert.equal(claims.length, 5, "4 member claims + 1 generalization claim");
  const members = claims.filter((c) => c.ground !== "/");
  assert.deepEqual(members.map((c) => c.ground).sort(), ["/p1", "/p2", "/p3", "/p4"], "each member's OWN real part, not the lca");
  assert.ok(members.every((c) => c.force === "strict"), "every member claim is strict at its own ground");
  assert.ok(members.every((c) => c.schema === "EOGfpClaim@1"));

  const lcaClaim = claims.find((c) => c.ground === "/");
  assert.ok(lcaClaim, "one claim at the generalization's own ground");
  assert.equal(lcaClaim.force, "default", "never strict at the lca — a report is not a law");
  assert.deepEqual(lcaClaim.roles, { ARG0: "river" }, "only the agreed role; ARG1 varies and is not asserted at the wider ground");

  const lr = lintGfp(claims, { functional: ["shape"] });
  assert.equal(lr.ok, true, "sibling grounds asserting different ARG1 values never contradict");
  assert.deepEqual(lr.findings, []);

  const fr = falsifyGfp(claims, { functional: ["shape"] });
  assert.deepEqual(fr.findings.map((f) => f.kind), ["strict_guard_reachable", "strict_guard_reachable", "strict_guard_reachable", "strict_guard_reachable"], "the one-valued declaration is reachable for every strict member claim");
});

test("claimsOf: real contradictions among the resulting claims are still caught — the bridge does not launder them", () => {
  const a = gfpClaim({ ground: "/p1", rel: "shape", roles: { ARG0: "river", ARG1: "town" }, force: "strict", id: "a" });
  const b = gfpClaim({ ground: "/p1", rel: "shape", roles: { ARG0: "river", ARG1: "desert" }, force: "strict", id: "b" });
  const r = lintGfp([a, b], { functional: ["shape"] });
  assert.equal(r.ok, false);
  assert.deepEqual(r.findings.map((f) => f.kind), ["standing_contradiction"]);
});

test("claimsOf: no generalization, no claims — never invents one from a bare refusal", () => {
  assert.deepEqual(claimsOf({ generalization: null, refused: "no role agreed" }), []);
  assert.deepEqual(claimsOf(null), []);
  assert.deepEqual(claimsOf(undefined), []);
});
