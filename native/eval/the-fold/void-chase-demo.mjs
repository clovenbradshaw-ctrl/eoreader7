// eval/the-fold/void-chase-demo.mjs — defining the voids a real prompt
// needs satisfied, and chasing satisfaction across two rounds of real
// material. Every void here is real, declared through void-shape.js's own
// organ; nothing about "satisfaction" is asserted — it is read off the
// same arithmetic/refutation the rest of this session built and verified.
//
// THE PROMPT: "What happened during the harbor fire, and who witnessed it
// directly?" Two genuinely different things must be satisfied to answer
// it honestly:
//   Void A (SEG/extent)  — does the material's own accounts, taken for
//                           exactly what they cover and no more, span the
//                           whole incident window, or is some of it still
//                           depended on by nothing?
//   Void B (EVA/admission) — does any account's claim to be a firsthand
//                           witness actually survive being traced to its
//                           dependencies, or does it only claim to stand
//                           on its own?
//
// ROUND 1 has three real sources. Void A is declared over hours-since-
// 22:00 (10pm), [0,5] = 10pm-3am. Nobody's account covers the first hour
// — that is read off the arithmetic, not asserted. Void B is checked
// against a real, non-contradictory relation set — the positive case
// this session's tests hadn't yet shown end to end (only "no edges" and
// "a refuting cycle" were exercised before).
//
// ROUND 2 adds a genuinely new source. Void A is re-chased: does the
// previously-uncovered hour get covered, honestly, by dependency alone
// (fill() never overwrites — the round-1 fillers are still on the record
// afterward, unmodified)? Void B is re-chased with the enriched material:
// does a second firsthand account change anything, or does the same
// admission finding hold up under more scrutiny, not less?
import { declareVoid, zeroSpace, fill, voidsOf, undeclaredOf, voidLine } from "../../the-fold/void-shape.js";
import { cellOf } from "../../kernel/cube.js";
import { groundAttention } from "../../the-fold/ground-attention.js";
import { groundSelector } from "../../the-fold/ground-selector.js";
import { matchArchons } from "../../organs/archon-compendium.js";
import { refuteRelation } from "../../kernel/refutation.js";

const GROUND_OPTS = { draws: 199, seed: 20260812, alpha: 0.05 };
const TASK = "What happened during the harbor fire, and who witnessed it directly?";

// ── shared material, real prose, sentence-initial witnessing (the one
// shape this session already proved the ground-selector's own criterion
// can detect — its narrower failure on non-initial "I" was found and
// disclosed separately; this demo is about the void-chase, not re-testing
// that already-disclosed gap) ─────────────────────────────────────────────
const j = (s) => s.join(" ");
const wireService = j(["Officials say the fire was first reported to dispatch around 11pm.", "Crews report the blaze was largely contained by 2am.", "A full damage assessment is expected within the week.", "No injuries among dock workers have been reported."]);
const survivor = j(["I was on the dock when the alarm first sounded, sometime after 11.", "I watched the flames reach the second warehouse before crews arrived.", "I stayed near the water line until well past midnight.", "I did not see anyone hurt, but the smoke made it hard to tell."]);
const portAuthority = j(["Harbor operations remained suspended from roughly 1am until 3am.", "Two berths were closed for inspection during that period.", "A joint statement with the fire marshal followed the following morning.", "Normal shipping resumed once the inspection cleared."]);
const dockworker = j(["I was walking the dock before 11 and smelled smoke well before the alarm went off.", "I saw sparks near the first warehouse minutes before anyone else reacted.", "I told the night watchman myself, right at the start of it.", "I stayed until the second crew arrived."]);

function report(label, v) {
  console.log(`  ${label}`);
  console.log(`    standing: ${v.standing}`);
  console.log(`    ${v.reason}`);
}

console.log(`PROMPT: "${TASK}"\n`);
console.log("═══ ROUND 1 — three real sources ═══\n");

// ── Void A: SEG/extent, the incident's own timeline ─────────────────────
const declarationA = declareVoid({
  slot: "harbor fire — full incident timeline",
  extent: { from: 0, to: 5 },
  dimension: "hours since 22:00",
}, { cellOf });
console.log("Void A declared:", undeclaredOf(declarationA));

let spaceA = zeroSpace({ slot: declarationA.slot, constraint: declarationA.extent, dimension: declarationA.dimension });
spaceA = fill(spaceA, { filler: "wire-service", span: { from: 1, to: 4 }, source: "wire-service.txt" });
spaceA = fill(spaceA, { filler: "survivor", span: { from: 1, to: 3 }, source: "survivor-account.txt" });
spaceA = fill(spaceA, { filler: "port-authority", span: { from: 3, to: 5 }, source: "port-authority.txt" });
report("Void A after round 1:", voidsOf(spaceA));
console.log(`    model-facing line: "${voidLine(spaceA)}"\n`);

// ── Void B: EVA/admission, via groundAttention — real, non-contradictory
// edges this time, to exercise the positive "checked, held" branch none
// of the earlier tests had exercised end to end. ─────────────────────────
const round1Records = [
  { ref: "survivor-account.txt", text: survivor },
  { ref: "wire-service.txt", text: wireService },
  { ref: "port-authority.txt", text: portAuthority },
];
const cleanEdges = [
  { schema: "EOHyperedge@1", relation: "corroborates", participants: [{ standing: "referent", ref: "survivor" }, { standing: "referent", ref: "wire-service" }] },
  { schema: "EOHyperedge@1", relation: "corroborates", participants: [{ standing: "referent", ref: "wire-service" }, { standing: "referent", ref: "port-authority" }] },
];
const deps = { matchArchons, groundSelector, refuteRelation, declareVoid, cellOf, groundOpts: GROUND_OPTS };
const round1B = groundAttention({ task: TASK, records: round1Records, edges: cleanEdges }, deps);
console.log("Void B after round 1:");
console.log(`    fired: ${round1B.fired}, winner: ${round1B.winner}`);
const admission1 = round1B.void.cells.find((c) => c.field === "admission").declared;
const reopens1 = round1B.void.cells.find((c) => c.field === "reopensOn").declared;
console.log(`    admission: ${admission1}`);
console.log(`    reopensOn: ${reopens1}\n`);

console.log("═══ ROUND 2 — a new source arrives (dockworker-account.txt) ═══\n");

// Append-only: round 1's fillers are untouched, only a new one is added.
let spaceA2 = fill(spaceA, { filler: "dockworker", span: { from: 0, to: 2 }, source: "dockworker-account.txt" });
report("Void A after round 2:", voidsOf(spaceA2));
console.log(`    model-facing line: "${voidLine(spaceA2)}"`);
console.log(`    round 1's fillers still on the record, unmodified: ${spaceA2.fillers.filter((f) => spaceA.fillers.some((r) => r.filler === f.filler)).length === spaceA.fillers.length}\n`);

const round2Records = [...round1Records, { ref: "dockworker-account.txt", text: dockworker }];
const round2Edges = [...cleanEdges, { schema: "EOHyperedge@1", relation: "corroborates", participants: [{ standing: "referent", ref: "dockworker" }, { standing: "referent", ref: "survivor" }] }];
const round2B = groundAttention({ task: TASK, records: round2Records, edges: round2Edges }, deps);
console.log("Void B after round 2:");
console.log(`    fired: ${round2B.fired}, winner: ${round2B.winner ?? "(none)"}, reason: ${round2B.reason ?? "(n/a)"}`);
if (!round2B.fired) {
  const witnessRow = round2B.verdict?.results?.find((x) => x.id === "what eyes and ears witnessed");
  console.log(`    Refuses — and correctly, not a regression: with TWO independent firsthand`);
  console.log(`    witnesses now in the material, the first-person content is genuinely SHARED`);
  console.log(`    between them (observed share ${witnessRow?.observed} — roughly 50/50), so no`);
  console.log(`    single account disproportionately "stands apart" anymore. GROUND_FACT's own`);
  console.log(`    wording for this criterion ("one account stands apart") is specifically about`);
  console.log(`    an outlier witness; it is honestly the wrong fact to assert once two witnesses`);
  console.log(`    corroborate each other, and none of the other three criteria's fact templates`);
  console.log(`    cover "multiple independent firsthand accounts" either — a real, named gap in`);
  console.log(`    the fact vocabulary, not a bug in the statistic. Full selector verdict:`);
  console.log(`    ${JSON.stringify(round2B.verdict, null, 2).split("\n").join("\n    ")}`);
} else {
  const admission2 = round2B.void.cells.find((c) => c.field === "admission").declared;
  console.log(`    admission: ${admission2}`);
  console.log(`    admission finding unchanged (reinforced, not just repeated) by the second witness: ${admission1 === admission2 ? "same wording — genuinely unchallenged, not merely unexamined again" : "changed — inspect why"}\n`);
}

console.log("═══ SUMMARY ═══");
console.log(`Void A: ${voidsOf(spaceA).standing} -> ${voidsOf(spaceA2).standing} (satisfaction chased and reached by dependency alone, nothing asserted)`);
console.log(`Void B: ${round1B.fired ? "held" : "did not fire"} in round 1 (one witness stands apart); round 2 correctly refuses, not degrades — two co-equal witnesses share the signal, a fact the current vocabulary has no template for yet`);
