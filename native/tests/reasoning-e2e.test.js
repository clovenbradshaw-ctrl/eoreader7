// reasoning-e2e.test.js — "how far without an LLM", every tier's verdict
// read on each suite run (the-fold P95 / S65).
//
// `results/reasoning-e2e-no-llm-RESULTS.md` is a hand transcription of the
// driver's stdout. Re-run 2026-09-05 (P94's audit): every verdict
// reproduced, and the driver printed `undefined —undefined→ undefined` for
// every edge — the SVO fields the wipe removed, read unmigrated (S64's
// defect in a second driver). The material is BUILT (three passages
// written for the driver), so its verdict tables are the construction's
// own and are pinned exactly: Tier 1's four verdicts, Tier 2's two
// answers, Tier 3's two composed chains, Tier 4's cell summaries, Tier 5's
// six "before/after" rows (§3b of the doc), Tier 6's three, Tier 7's
// three ladder rows. A drift here is an organ moving, not the material.
//
// Reads through the engine's own adapters (the-fold's hypergraph.js and
// cast.js re-export them); the driver reads through the frozen provider
// where it is checked out and prints which. The-fold's verification.js and
// grid.js are the only cross-repo imports; absent, the test skips typed.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { runReasoningE2E, resolveOrgans, resolveModules } from "../eval/the-fold/lib/reasoning-e2e.mjs";

const NATIVE = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
const FOLD = new URL("../../../the-fold", import.meta.url).pathname;
const foldPresent = existsSync(`${FOLD}/verification.js`) && existsSync(`${FOLD}/grid.js`);
const skip = foldPresent ? false : "fixture_absent: the-fold checkout (verification.js, grid.js) is not beside this repo";

let out = null;
test("the run: engine adapters, the-fold's grid", { skip }, async () => {
  const { provider, organs, classes } = await resolveOrgans({ native: NATIVE, legacy: null, existsSync });
  const modules = await resolveModules({ native: NATIVE, fold: FOLD });
  out = runReasoningE2E({ organs, classes, modules });
  console.log(`  organs: ${provider}; edges bound: ${out.edges.length}`);
  assert.ok(out.edges.every((e) => e.end1 !== undefined && e.label !== undefined && e.end2 !== undefined), "every edge carries end1/label/end2 — the wiped SVO names are never read");
  assert.ok(out.edges.some((e) => e.end1 === "Lincoln" && e.label === "appointed" && e.end2 === "Seward"), "the stated edge is bound");
});

test("Tier 1: bound / unbound with the nearest edge named / beyond-reach / unbound with the object compared by tokens", { skip }, () => {
  assert.deepEqual(out.tier1.map((t) => t.verdict), ["bound", "unbound", "beyond-reach", "unbound"]);
  assert.deepEqual(out.tier1[1].nearest, { end1: "Lincoln", label: "appointed", end2: "Seward" }, "the near miss names the nearest real edge");
  assert.equal(out.tier1[3].endpoints?.object, "tokens", "Napoleon resolves to no referent — compared by content word alone");
  assert.equal(out.tier1[0].endpoints?.object, "referent");
});

test("Tier 2 and 3: answers straight off the graph, and two composed two-hop answers no sentence states", { skip }, () => {
  assert.deepEqual(out.tier2, { appointed: ["Seward"], nominated: ["Chase"] });
  assert.equal(out.tier3.length, 2);
  assert.deepEqual(out.tier3[0].chain, [["Lincoln", "appointed", "Seward"], ["Seward", "negotiated", "the Alaska purchase"]]);
  assert.deepEqual(out.tier3[1].chain, [["Chase", "administered", "Grant"], ["Lincoln", "nominated", "Chase"]]);
});

test("Tier 4: 4 of 9 cells hold on the bound claim; Link fails on the absent object, Entity discloses rather than asserts", { skip }, () => {
  assert.equal(out.tier4[0].summary, "4 of 9 cells hold, 0 fail, 0 told both ways, 0 gap, 5 not yet built");
  assert.equal(out.tier4[1].summary, "3 of 9 cells hold, 1 fail, 0 told both ways, 0 gap, 5 not yet built");
  assert.equal(out.tier4[1].cells.find((c) => c.terrain === "Link")?.verdict, "fails");
  assert.equal(out.tier4[1].cells.find((c) => c.terrain === "Entity")?.verdict, "holds");
});

test("Tier 5: negation read correctly, or withheld; never judged unread (the doc's §3b table)", { skip }, () => {
  const rows = out.tier5.map((t) => [t.off, t.on]);
  assert.deepEqual(rows, [
    ["contradicted", "contradicted"], // never
    ["contradicted", "contradicted"], // hardly
    ["unbound", "beyond-reach"], // did not
    ["no claim extracted", "no claim extracted"], // didn't — silence, not fixed
    ["bound", "beyond-reach"], // negotiated not — post-verbal
    ["bound", "beyond-reach"], // Lincoln did dismiss — the inverted, cited bound, withheld
  ]);
  assert.equal(out.tier5[0].readAs, "Seward never —negotiated[negated]→ the Alaska purchase");
  assert.equal(out.tier5[2].readAs, "Seward —did→ not negotiate the Alaska purchase", "periphrastic: the auxiliary takes the connector slot");
});

test("Tier 6: a shared definite article was the whole binding; the received class closes it", { skip }, () => {
  assert.deepEqual(out.tier6.map((t) => [t.off, t.on]), [["bound", "unbound"], ["unbound", "unbound"], ["bound", "bound"]]);
});

test("Tier 7: the ladder without the classes — holds / refused / withheld by object specificity", { skip }, () => {
  assert.deepEqual(out.tier7.map((t) => [t.raw, t.landed]), [["holds", "holds"], ["refused", "refused"], ["holds", "undetermined — withheld, never guessed"]]);
  assert.equal(out.tier7[2].objectSpecific, false, "the article-shared false bound is caught one rung up");
});
