// referent-slots-falsify — layer 7: the same hunt, over a referent's
// relations (2026-09-22). No synthetic data: every entity here is read from
// eval/the-fold/fixtures/succession-tenures.json, the real 23-entity
// Wikidata crawl another session already committed (P39 position-held,
// P580/P582 start/end). Nothing about "office" or "term" is written into
// referent-slots.js or into these assertions' setup — only into the fixture
// itself, which is real-world data, not a fixture built to pass this test.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { referentElements, referentFacts } from "./referent-slots.js";
import { learnParadigmEmergent, evaluateParadigmEmergent } from "./paradigm.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, "..", "eval", "the-fold", "fixtures", "succession-tenures.json");
const DATA = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const ENTITIES = Object.values(DATA.entities);

test("referentElements reshapes relation-instances into the SAME element shape the Ground reader produces for text", () => {
  const multi = ENTITIES.find((e) => e.tenures.length >= 3);
  const { elements } = referentElements(multi);
  assert.equal(elements.length, multi.tenures.length);
  for (const e of elements) { assert.equal(e.cls, "tenure"); assert.ok("office" in e && "start" in e && "startYear" in e); }
});

test("emergentFacts finds count:tenure and per-position office/year facts with zero new code — same organ as text", () => {
  const multi = ENTITIES.find((e) => e.tenures.length >= 3);
  const facts = referentFacts(multi);
  assert.equal(facts.get("count:tenure"), multi.tenures.length);
  assert.equal(facts.get("tenure@0:office"), multi.tenures[0].office);
  assert.ok(multi.tenures.some((t) => t.start), "fixture has at least one dated tenure");
});

test("SYN across a referent's OWN relations: a numeric year successor fact can fire between two of a person's own terms", () => {
  // find a real entity where two tenures share a boundary year (end==start
  // of another, or two ends coincide) so the emergent generator's own
  // equality fact (v == w) is exercised on referent data, not text.
  const hit = ENTITIES.map((e) => ({ e, facts: referentFacts(e) })).find(({ facts }) => [...facts.keys()].some((k) => /^tenure@\d+:(start|end)Year=$/.test(k) && facts.get(k) !== "none"));
  assert.ok(hit, "at least one real office-holder in the fixture should show two tenures sharing a boundary year");
  const eqKey = [...hit.facts.keys()].find((k) => /^tenure@\d+:(start|end)Year=$/.test(k) && hit.facts.get(k) !== "none");
  assert.match(hit.facts.get(eqKey), /^tenure@\d+$/);
});

test("DEF·Paradigm, run on REAL office-holders: multi-term vs single-term is separated by count:tenure — never written into the code", () => {
  const multi = ENTITIES.filter((e) => e.tenures.length >= 2);
  const single = ENTITIES.filter((e) => e.tenures.length === 1);
  if (multi.length < 5 || single.length < 5) return; // the fixture must supply both sides; refused rather than padded
  const half = (xs, side) => xs.filter((_, i) => i % 2 === side);
  const p = learnParadigmEmergent({ name: "multi-term office-holder", instances: half(multi, 0), population: half(single, 0) });
  assert.equal(p.refused, undefined, p.basis);
  const keys = (p.all ?? p.features).map((f) => f.slot);
  assert.ok(keys.includes("count:tenure"), `count:tenure must be among the discovered separators: ${keys.join(" · ")}`);
  const heldInMulti = half(multi, 1).filter((e) => evaluateParadigmEmergent(p, referentElements(e)).satisfies).length;
  const falseInSingle = half(single, 1).filter((e) => evaluateParadigmEmergent(p, referentElements(e)).satisfies).length;
  assert.ok(heldInMulti > half(multi, 1).length / 2, `held out multi-term holders must mostly satisfy: ${heldInMulti}/${half(multi, 1).length}`);
  assert.ok(falseInSingle < half(single, 1).length / 2, `held out single-term holders must mostly NOT satisfy: ${falseInSingle}/${half(single, 1).length}`);
});
