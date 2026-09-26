// holonic-tension.test.mjs -- does a WHOLE (one pooled load-bearing check
// over a body-group's union) agree with the existing PARTS-aggregate (any
// member individually load-bearing)? A holon is both a whole and a part
// (2026-09-26 discussion); this is the concrete, falsifiable operationalization
// of that question via claim-dependencies.js's loadBearingOfWhole (new) vs
// arrange.js's own bodySlots loadBearing (existing, built from combining
// per-member loadBearingChecker calls).
//
// Measured live across every real content fixture used this session: 15 of
// 16 real body-groups agree. Exactly one real, reproducible disagreement:
// the Cumberland River fixture's body-6 group (p6.1/p6.2/p6.3, the Army
// Corps dam-building paragraph) reads parts=true but whole=false. This makes
// real statistical sense, not noise: consequentialSurprise measures a
// candidate's reach against a SIZE-MATCHED null -- a 3-seed group is judged
// against a 3-seed null, which itself reaches farther than a 1-seed null.
// One strongly-connected member can individually clear its own 1-seed bar
// while the pooled group, diluted by two weaker members, does not clear the
// higher 3-seed bar. PARTS-true does not imply WHOLE-true.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { buildDraft, drawnParts } from "./eot-draft.js";
import { buildReferents, attachReferents } from "./referents.js";
import { loadEotParser, attachEot } from "./eot-notation.js";
import { arrangeEssay } from "./arrange.js";
import { loadBearingOfWhole } from "./claim-dependencies.js";

const GROUND_PATH = new URL("./fixtures/cumberland-ground.md", import.meta.url);

test("HOLONIC TENSION: a real body-group can be parts-true but whole-false, and most real groups agree", async () => {
  const ground = fs.readFileSync(GROUND_PATH, "utf8");
  const task = "Write an essay on this material";
  const parser = await loadEotParser();
  const d = attachReferents(buildDraft({ task, ground }), buildReferents(ground));
  attachEot(drawnParts(d).flatMap((p) => p.children), parser.parse(ground, "ground"));
  const o = arrangeEssay({ draft: d, pValue: 0.05 });

  const bodyGroups = o.slots.filter((s) => s.slot !== "thesis" && s.slot !== "return" && s.statements?.length);
  assert.ok(bodyGroups.length >= 7, `expected the same real 7 body groups this fixture produced, got ${bodyGroups.length}`);

  let agree = 0, disagree = 0;
  const disagreements = [];
  for (const s of bodyGroups) {
    const whole = loadBearingOfWhole(o.claims.claims, s.statements, { pValue: 0.05 });
    if (s.loadBearing === whole) agree++;
    else { disagree++; disagreements.push({ slot: s.slot, statements: s.statements, parts: s.loadBearing, whole }); }
  }

  // The real, measured split: most real groups agree, at least one does not.
  assert.ok(agree >= 5, `expected most real body-groups to agree, got ${agree} of ${bodyGroups.length}`);
  assert.ok(disagree >= 1, "expected at least one real holonic disagreement -- if this now reads 0, the tension this test locks in has vanished and needs re-investigation, not a loosened assertion");

  // The specific, real disagreement found this session: body-6's own three
  // statements (dam-building paragraph), parts=true, whole=false.
  const body6 = disagreements.find((x) => x.statements.includes("p6.1") && x.statements.includes("p6.2") && x.statements.includes("p6.3"));
  assert.ok(body6, `expected the specific real body-6 disagreement (p6.1/p6.2/p6.3); found instead: ${JSON.stringify(disagreements)}`);
  assert.equal(body6.parts, true, "the parts-aggregate for body-6 must read true, as measured");
  assert.equal(body6.whole, false, "the whole-level check for body-6 must read false, as measured");
});
