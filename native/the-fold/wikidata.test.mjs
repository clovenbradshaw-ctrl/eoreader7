// wikidata.test.mjs — against the REAL captured Special:EntityData responses
// in eval/fixtures/wikidata/, never a hand-typed stand-in. These are the
// three entities the live Lincoln failure turns on.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const FIX = fileURLToPath(new URL("../eval/the-fold/fixtures/", import.meta.url));

import {
  chainAgreesByIdentity,
  entityUrl,
  GIVER,
  holdersOfPosition,
  HUMAN,
  isHuman,
  isQid,
  pagePropsUrl,
  parseEntity,
  parsePageProps,
  qidBridge,
} from "./wikidata.js";
import { chainFillers } from "./chains.js";
import * as wdMod from "./wikidata.js";

const VP_OF_US = "Q11699";
const fixture = (qid) => parseEntity(JSON.parse(readFileSync(`${FIX}wikidata/${qid}.json`, "utf8")));
const HAMLIN = fixture("Q273546");
const JOHNSON = fixture("Q8612");
const OFFICE = fixture("Q11699");
const pageprops = (name) => JSON.parse(readFileSync(`${FIX}wikidata/pageprops/${name}.json`, "utf8"));

test("a real entity parses to label, typed instance-of, and positions", () => {
  assert.equal(HAMLIN.qid, "Q273546");
  assert.equal(HAMLIN.label, "Hannibal Hamlin");
  assert.equal(HAMLIN.giver, GIVER);
  assert.ok(HAMLIN.instanceOf.includes(HUMAN), "P31 states human");
  assert.ok(HAMLIN.positions.length > 1, "a real person holds several positions");
});

test("both men are typed human; the office is not", () => {
  assert.equal(isHuman(HAMLIN), true);
  assert.equal(isHuman(JOHNSON), true);
  assert.equal(isHuman(OFFICE), false, "an office is not a person — P31 says so, no heuristic needed");
  assert.equal(OFFICE.positions.length, 0, "and an office holds no position");
});

test("THE ANSWER: the vice presidency finds exactly two people", () => {
  const holders = holdersOfPosition([HAMLIN, JOHNSON, OFFICE], VP_OF_US);
  assert.equal(holders.length, 2, "two holders, not one — the failure this file exists for");
  assert.deepEqual(
    holders.map((h) => h.label).sort(),
    ["Andrew Johnson", "Hannibal Hamlin"],
  );
  assert.ok(holders.every((h) => h.fields.human), "and both of them are people");
});

test("each holder carries its own real extent, from the giver's own qualifiers", () => {
  const holders = holdersOfPosition([HAMLIN, JOHNSON], VP_OF_US);
  const hamlin = holders.find((h) => h.id === "Q273546");
  const johnson = holders.find((h) => h.id === "Q8612");
  assert.match(hamlin.span.fromText, /^\+1861-03-04/);
  assert.match(hamlin.span.toText, /^\+1865-03-04/);
  // Johnson's whole vice presidency is six weeks — the case whose YEAR span
  // ("1865 to 1865") states nothing, and which succession.js's own date
  // reader independently extracted as March 4 → April 15, 1865.
  assert.match(johnson.span.fromText, /^\+1865-03-04/);
  assert.match(johnson.span.toText, /^\+1865-04-15/);
});

test("the chain closes by IDENTITY: Hamlin's successor IS Johnson's qid, mutually", () => {
  const holders = holdersOfPosition([HAMLIN, JOHNSON], VP_OF_US);
  const agreement = chainAgreesByIdentity(holders);
  assert.equal(agreement.links.length, 1, "one confirmed link between the two");
  assert.deepEqual(agreement.links[0], { from: "Q273546", to: "Q8612", mutual: true });
  assert.equal(agreement.mutual, true, "each pointer names the other — not a name-string match");
});

test("pointers leaving the set are reported as EDGES, not as faults", () => {
  // Hamlin's `replaces` names Breckinridge and Johnson's `replacedBy` names
  // Colfax — both real, both genuinely outside "VP under Lincoln". A closed
  // set has to be able to say where it ends.
  const holders = holdersOfPosition([HAMLIN, JOHNSON], VP_OF_US);
  const { openEnds } = chainAgreesByIdentity(holders);
  assert.ok(openEnds.some((e) => e.direction === "before" && e.names === "Q273212"), "bounded before by Breckinridge");
  assert.ok(openEnds.some((e) => e.direction === "after" && e.names === "Q310852"), "bounded after by Colfax");
  assert.ok(openEnds.every((e) => e.inSet === false));
});

test("the records feed chains.js unchanged, with identity as the matcher", () => {
  // The whole reason this file builds records instead of its own chain
  // walker: chainFillers is already generic. Fed qids, its one disclosed
  // weakness (substring name matching) is replaced by exact equality.
  const holders = holdersOfPosition([HAMLIN, JOHNSON], VP_OF_US);
  const fillers = chainFillers(holders, {
    groupBy: (r) => r.fields.position,
    spanOf: (r) => null,
    matches: (a, b) => a === b,
  });
  assert.equal(fillers.length, 2, "one confirmed set of two");
  assert.deepEqual(fillers.map((f) => f.filler).sort(), ["Q273546", "Q8612"]);
});

test("entityUrl refuses anything that is not a qid, rather than building a bad address", () => {
  assert.equal(entityUrl("Q42"), "https://www.wikidata.org/wiki/Special:EntityData/Q42.json");
  assert.throws(() => entityUrl("Hannibal Hamlin"), TypeError);
  assert.throws(() => entityUrl(null), TypeError);
  assert.equal(isQid("Q1"), true);
  assert.equal(isQid("P39"), false);
});

test("a non-entity response is null, never a half-built object", () => {
  assert.equal(parseEntity(null), null);
  assert.equal(parseEntity({}), null);
  assert.equal(parseEntity({ entities: {} }), null);
});

test("time precision is carried, never flattened into false exactness", () => {
  const holders = holdersOfPosition([HAMLIN], VP_OF_US);
  assert.equal(typeof holders[0].span.fromText, "string");
  const raw = HAMLIN.positions.find((p) => p.position === VP_OF_US);
  assert.equal(raw.start.precision, 11, "day precision, as the giver published it");
});

test("this module makes no network call of its own", () => {
  const src = readFileSync(new URL("./wikidata.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\bfetch\s*\(/, "the server owns the crossing, this file owns the shape");
  assert.doesNotMatch(src, /XMLHttpRequest|axios|node-fetch/);
});

// ── the seek primitives ─────────────────────────────────────────────────────

test("url builders encode the constraint, and refuse a malformed id list", async () => {
  const { searchUrl, inverseUrl, entitiesUrl } = await import("./wikidata.js");
  assert.match(searchUrl("vice president"), /wbsearchentities.*search=vice%20president/);
  assert.match(inverseUrl(["P31=Q42178", "P17=Q30"]), /haswbstatement%3AP31%3DQ42178%20haswbstatement%3AP17%3DQ30/);
  // non-qids are dropped rather than sent — a bad id would poison the batch
  assert.match(entitiesUrl(["Q1", "not-a-qid", "Q2"]), /ids=Q1%7CQ2|ids=Q1\|Q2/);
});

test("datedTerms keeps only terms with BOTH ends dated", async () => {
  const { datedTerms } = await import("./wikidata.js");
  const terms = datedTerms(HAMLIN);
  assert.ok(terms.length >= 1);
  assert.ok(terms.every((t) => t.start && t.end), "an undated boundary cannot bound an interval");
  assert.ok(terms.some((t) => t.office === VP_OF_US));
});

test("bindByTerm chooses NO term — it reports every one, including the empty ones", async () => {
  const { bindByTerm } = await import("./wikidata.js");
  // Lincoln's four real dated terms, as the live giver supplies them.
  const lincolnTerms = [
    { office: "Q13218630", start: "+1847-03-04T00:00:00Z", end: "+1849-03-04T00:00:00Z" },
    { office: "Q11696", start: "+1861-03-04T00:00:00Z", end: "+1865-04-15T00:00:00Z" },
    { office: "Q1467287", start: "+1860-11-06T00:00:00Z", end: "+1861-03-04T00:00:00Z" },
  ];
  const perTerm = bindByTerm([HAMLIN, JOHNSON], lincolnTerms, VP_OF_US);
  assert.equal(perTerm.length, 3, "every term reported, not just the productive one");
  const presidency = perTerm.find((t) => t.term.office === "Q11696");
  assert.equal(presidency.bound.length, 2, "two vice presidents under the presidency");
  assert.deepEqual(presidency.bound.map((b) => b.label), ["Hannibal Hamlin", "Andrew Johnson"]);
  assert.deepEqual(presidency.bound.map((b) => b.qid), ["Q273546", "Q8612"], "in term order, earliest first");
  // and the zeros are real answers, not omissions
  assert.equal(perTerm.find((t) => t.term.office === "Q13218630").bound.length, 0);
  assert.equal(perTerm.find((t) => t.term.office === "Q1467287").bound.length, 0);
});

test("every binding carries its giver and a fetchable address", async () => {
  const { bindByTerm } = await import("./wikidata.js");
  const [{ bound }] = bindByTerm([HAMLIN, JOHNSON], [{ office: "Q11696", start: "+1861-03-04T00:00:00Z", end: "+1865-04-15T00:00:00Z" }], VP_OF_US);
  for (const b of bound) {
    assert.equal(b.giver, GIVER);
    assert.match(b.address, /^https:\/\/www\.wikidata\.org\/wiki\/Special:EntityData\/Q\d+\.json$/);
  }
});

test("parseSearch keeps rival readings rather than collapsing to the first", async () => {
  const { parseSearch } = await import("./wikidata.js");
  const got = parseSearch({ search: [{ id: "Q91", label: "Abraham Lincoln", description: "president" }, { id: "Q2821841", label: "Abraham Lincoln", description: "grandfather" }] });
  assert.equal(got.length, 2, "ambiguity is data, not noise");
  assert.equal(got[1].qid, "Q2821841");
});

test("coverage separates the real answer from the true-but-useless one", async () => {
  const { bindByTerm } = await import("./wikidata.js");
  // Both terms below really did contain sitting vice presidents. Only one is
  // what "Lincoln's vice president" means, and tiling is what says so.
  const presidency = { office: "Q11696", start: "+1861-03-04T00:00:00Z", end: "+1865-04-15T00:00:00Z" };
  const [p] = bindByTerm([HAMLIN, JOHNSON], [presidency], VP_OF_US);
  assert.equal(p.bound.length, 2);
  assert.equal(p.coverage.gaps, 0, "the two vice presidencies leave no gap");
  assert.equal(p.coverage.tiles, true, "they tile the presidency exactly");
  assert.ok(p.coverage.ratio > 0.99);

  // A holder floating inside a longer, unrelated term covers little of it.
  const houseSeat = { office: "Q17495450", start: "+1834-01-01T00:00:00Z", end: "+1842-01-01T00:00:00Z" };
  const [h] = bindByTerm([HAMLIN], [houseSeat], VP_OF_US);
  assert.equal(h.bound.length, 0, "Hamlin's term is outside it entirely");
  assert.equal(h.coverage.tiles, false);
  assert.equal(h.coverage.ratio, 0);
});

test("coverage names no cut — it reports a ratio and gap count, nothing thresholded", async () => {
  const { coverageOf } = await import("./wikidata.js");
  const term = { start: "+1861-03-04T00:00:00Z", end: "+1865-04-15T00:00:00Z" };
  // one holder covering only the first half: real coverage, one trailing gap
  const half = coverageOf(term, [{ start: "+1861-03-04T00:00:00Z", end: "+1863-03-04T00:00:00Z" }]);
  assert.ok(half.ratio > 0.4 && half.ratio < 0.6, `expected roughly half, got ${half.ratio}`);
  assert.equal(half.gaps, 1);
  assert.equal(half.tiles, false);
  // an undated holder contributes nothing rather than a guessed magnitude
  assert.equal(coverageOf(term, [{ start: null, end: null }]).ratio, 0);
});

test("renderHolders assembles the answer from the giver's own words, no model", async () => {
  const { renderHolders, bindByTerm } = await import("./wikidata.js");
  const presidency = { office: "Q11696", start: "+1861-03-04T00:00:00Z", end: "+1865-04-15T00:00:00Z" };
  const [t] = bindByTerm([HAMLIN, JOHNSON], [presidency], VP_OF_US);
  const line = renderHolders({ anchor: "Abraham Lincoln", slot: "vice president", bound: t.bound, coverage: t.coverage });
  assert.equal(
    line,
    "Abraham Lincoln's vice president was Hannibal Hamlin (March 4, 1861 to March 4, 1865), then Andrew Johnson (March 4, 1865 to April 15, 1865). Between them they held it for the whole term.",
  );
  // the one thing the model kept doing, made structurally impossible
  assert.doesNotMatch(line, /president of the United States|became president/i);
});

test("renderHolders REFUSES an unclosed set rather than implying closure", async () => {
  const { renderHolders } = await import("./wikidata.js");
  const bound = [{ label: "Someone", start: "+1861-03-04T00:00:00Z", end: "+1862-01-01T00:00:00Z" }];
  assert.equal(renderHolders({ anchor: "A", slot: "s", bound, coverage: { tiles: false, ratio: 0.2, gaps: 1 } }), null);
  assert.equal(renderHolders({ anchor: "A", slot: "s", bound: [], coverage: { tiles: true, ratio: 1, gaps: 0 } }), null);
  assert.equal(renderHolders({ anchor: "", slot: "s", bound, coverage: { tiles: true } }), null);
});

test("renderHolders never states an exactness the giver declined to state", async () => {
  const { renderHolders } = await import("./wikidata.js");
  const bound = [{ label: "X", start: "+1834-00-00T00:00:00Z", end: "+1842-00-00T00:00:00Z" }];
  const line = renderHolders({ anchor: "A", slot: "s", bound, coverage: { tiles: true, ratio: 1, gaps: 0 } });
  assert.match(line, /X \(1834 to 1842\)/, "a zeroed month renders as the year alone");
  assert.doesNotMatch(line, /00/);

  // Each grain said at its own grain: a known month with an unknown day is
  // the month, never rounded down to the year and never invented up to a day.
  const monthOnly = [{ label: "Y", start: "+1834-03-00T00:00:00Z", end: "+1842-09-00T00:00:00Z" }];
  assert.match(
    renderHolders({ anchor: "A", slot: "s", bound: monthOnly, coverage: { tiles: true, ratio: 1, gaps: 0 } }),
    /Y \(March 1834 to September 1842\)/,
  );
});

// ── learning the relating property ─────────────────────────────────────────

const raw = (qid) => JSON.parse(readFileSync(`${FIX}wikidata/${qid}.json`, "utf8")).entities[qid];

test("backPointersIn finds the properties an entity uses to point at a slot", async () => {
  const { backPointersIn } = await import("./wikidata.js");
  // Both men really do point at the vice presidency, via P39.
  assert.ok(backPointersIn(raw("Q273546"), "Q11699").includes("P39"));
  assert.ok(backPointersIn(raw("Q8612"), "Q11699").includes("P39"));
  // and not at something they have no relation to
  assert.deepEqual(backPointersIn(raw("Q273546"), "Q999999999"), []);
});

test("nominateRelating LEARNS the property from examples — P39 is never typed in", async () => {
  const { nominateRelating, clearsFloor, RELATING_WITNESS_FLOOR } = await import("./wikidata.js");
  const cands = nominateRelating("Q11699", [raw("Q273546"), raw("Q8612")]);
  const top = cands[0];
  assert.equal(top.right, "P39", "the property was discovered, not declared");
  assert.equal(top.left, "Q11699");
  assert.equal(top.count, 2);
  assert.deepEqual(top.witnesses.sort(), ["Q273546", "Q8612"], "real qids, so the nomination is checkable");
  assert.equal(clearsFloor(top), true);
  assert.equal(RELATING_WITNESS_FLOOR, 2);
});

test("one witness is a coincidence — it nominates but does not clear the floor", async () => {
  const { nominateRelating, clearsFloor } = await import("./wikidata.js");
  const [only] = nominateRelating("Q11699", [raw("Q273546")]);
  assert.equal(only.count, 1);
  assert.equal(clearsFloor(only), false, "nomination is not reasoning permission");
});

test("the slot entity never witnesses itself", async () => {
  const { nominateRelating } = await import("./wikidata.js");
  const cands = nominateRelating("Q11699", [raw("Q11699"), raw("Q273546"), raw("Q8612")]);
  for (const c of cands) assert.ok(!c.witnesses.includes("Q11699"));
});

test("exampleIdsFrom reads the slot's own entity-valued claims, deduped", async () => {
  const { exampleIdsFrom } = await import("./wikidata.js");
  const ids = exampleIdsFrom(raw("Q11699"));
  assert.ok(ids.length > 5, `expected real outgoing claims, got ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length, "deduped");
  assert.ok(ids.every((i) => /^Q\d+$/.test(i)));
});

test("a witness of the wrong kind does not count — the P301 failure, pinned", async () => {
  const { nominateRelating, clearsFloor } = await import("./wikidata.js");
  // A stand-in for the real category page that beat P39 two-to-one: it
  // points at the office exactly as a person does, and is not a person.
  const category = { id: "Q1111111", claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q4167836" } } } }], P301: [{ mainsnak: { datavalue: { value: { id: "Q11699" } } } }] } };
  const category2 = { id: "Q2222222", claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q4167836" } } } }], P301: [{ mainsnak: { datavalue: { value: { id: "Q11699" } } } }] } };
  const unguarded = nominateRelating("Q11699", [raw("Q273546"), raw("Q8612"), category, category2]);
  assert.equal(unguarded[0].right, "P301", "counting alone really does prefer the housekeeping property");

  const guarded = nominateRelating("Q11699", [raw("Q273546"), raw("Q8612"), category, category2], { kind: "Q5" });
  assert.equal(guarded[0].right, "P39", "requiring the sought kind recovers the membership property");
  assert.equal(guarded[0].count, 2);
  assert.equal(clearsFloor(guarded[0]), true);
  assert.ok(!guarded.some((c) => c.right === "P301"), "the category witnesses nothing");
});

test("kindQidFor names the giver's own id, and refuses an unknown kind", async () => {
  const { kindQidFor, KIND_QIDS } = await import("./wikidata.js");
  assert.equal(kindQidFor("person"), "Q5");
  assert.equal(kindQidFor("Person"), "Q5");
  assert.equal(kindQidFor("spaceship"), null, "an unlisted kind is null, never a guess");
  assert.equal(Object.isFrozen(KIND_QIDS), true);
});

// ── the stopping rule: sample until another example makes no difference ────

test("nominationVerdict ignores what cannot change the outcome", async () => {
  const { nominationVerdict } = await import("./wikidata.js");
  // same leader, same standing, different counts and tail — no difference
  const a = [{ right: "P39", count: 2, witnesses: ["a", "b"] }, { right: "P527", count: 1, witnesses: ["c"] }];
  const b = [{ right: "P39", count: 5, witnesses: ["a", "b", "c", "d", "e"] }];
  assert.equal(nominationVerdict(a), nominationVerdict(b));
  // a leader that has not cleared is a different verdict from one that has
  assert.notEqual(nominationVerdict([{ right: "P39", count: 1, witnesses: ["a"] }]), nominationVerdict(a));
  assert.equal(nominationVerdict([]), "none");
});

test("enoughExamples stops when a batch makes no difference, not at a set number", async () => {
  const { enoughExamples } = await import("./wikidata.js");
  const cat = (id) => ({ id, claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q4167836" } } } }], P301: [{ mainsnak: { datavalue: { value: { id: "Q11699" } } } }] } });
  // Two humans settle it immediately; everything after is a distinction
  // without a difference, and the walk must stop paying for it.
  const batches = [[raw("Q273546"), raw("Q8612")], [cat("Q9001")], [cat("Q9002")], [cat("Q9003")], [cat("Q9004")]];
  let i = 0;
  const got = await enoughExamples(async () => batches[i++] ?? [], "Q11699", { kind: "Q5" });
  assert.equal(got.candidates[0].right, "P39");
  assert.equal(got.settled, true);
  assert.equal(got.batches, 3, "one batch to decide, two to confirm nothing changed — then stop");
  assert.ok(got.examined < 5, `stopped early, examined ${got.examined}`);
});

test("enoughExamples keeps paying while each batch still moves the verdict", async () => {
  const { enoughExamples } = await import("./wikidata.js");
  // Each batch changes who leads, so nothing has settled and it must not stop.
  const pointer = (id, prop) => ({ id, claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q5" } } } }], [prop]: [{ mainsnak: { datavalue: { value: { id: "Q11699" } } } }] } });
  const batches = [[pointer("Q1", "P39")], [pointer("Q2", "P39")], [pointer("Q3", "P527"), pointer("Q4", "P527"), pointer("Q5x", "P527")]];
  let i = 0;
  const got = await enoughExamples(async () => batches[i++] ?? [], "Q11699", { kind: "Q5" });
  assert.equal(got.batches, 3, "it did not stop while the leader was still moving");
  assert.equal(got.candidates[0].right, "P527", "the last batch really did change the verdict");
});

test("an exhausted source ends the walk honestly rather than looping", async () => {
  const { enoughExamples } = await import("./wikidata.js");
  const got = await enoughExamples(async () => [], "Q11699", { kind: "Q5" });
  assert.equal(got.examined, 0);
  assert.equal(got.settled, false, "nothing settled — there was nothing to settle");
  assert.equal(got.candidates.length, 0);
});

test("a refused fetch is reported as a refusal, never as an exhausted source", async () => {
  const { enoughExamples } = await import("./wikidata.js");
  // one real batch, then the giver declines
  const batches = [[raw("Q273546")], null];
  let i = 0;
  const got = await enoughExamples(async () => (i < batches.length ? batches[i++] : null), "Q11699", { kind: "Q5" });
  assert.equal(got.refused, true, "the walk says the giver declined");
  assert.equal(got.settled, false);
  assert.equal(got.examined, 1, "what was actually examined is still reported");
  // and genuine exhaustion is a different result
  const done = await enoughExamples(async () => [], "Q11699", { kind: "Q5" });
  assert.equal(done.refused, false);
  assert.equal(done.settled, false);
});

// ── the search-aware null ──────────────────────────────────────────────────

test("curveballStep preserves BOTH margins — every degree and every total", async () => {
  const { curveballStep } = await import("./wikidata.js");
  const rows = [new Set(["P39", "P1"]), new Set(["P527", "P2"]), new Set(["P39", "P527"])];
  const degBefore = rows.map((r) => r.size);
  const totBefore = new Map();
  for (const r of rows) for (const p of r) totBefore.set(p, (totBefore.get(p) ?? 0) + 1);
  let n = 0;
  const rnd = (() => { let i = 0; return () => [0.1, 0.5, 0.3, 0.7, 0.2, 0.9][i++ % 6]; })();
  for (let k = 0; k < 40; k++) if (curveballStep(rows, rnd)) n++;
  assert.ok(n > 0, "the swap actually moved something");
  assert.deepEqual(rows.map((r) => r.size), degBefore, "each example's degree is untouched");
  const totAfter = new Map();
  for (const r of rows) for (const p of r) totAfter.set(p, (totAfter.get(p) ?? 0) + 1);
  assert.deepEqual([...totAfter.entries()].sort(), [...totBefore.entries()].sort(), "each property's prevalence is untouched");
});

test("the real Lincoln nomination is DEGENERATE — too thin to null-test, and says so", async () => {
  const { relatingNull } = await import("./wikidata.js");
  // The actual evidence the live walk had: two humans, both using only P39.
  const got = relatingNull("Q11699", [raw("Q273546"), raw("Q8612")], { kind: "Q5", draws: 200 });
  assert.equal(got.observed, 2);
  assert.equal(got.degenerate, true, "a swap needs differing entries; identical rows give it none");
  assert.equal(got.rank, null, "no rank is reported, because nothing was tested");
  assert.match(got.reason, /no room to move|exchange anything/);
});

test("max-prevalence CANNOT be nulled by a fixed-margin swap — the finding, pinned", () => {
  // Written first expecting the concentrated case to survive the null. It
  // does not, and cannot: the curveball swap only exchanges entries where
  // two rows DIFFER, so a property present in every row is never in
  // `onlyI`/`onlyJ` and is structurally immovable. Preserving every column
  // total is the whole point of the perturbation, and the leader's witness
  // count IS a column total — so this null was being asked to test the one
  // quantity it exists to hold fixed. Both a genuinely concentrated leader
  // and pure noise come back `degenerate`, identically, which is why the
  // real question moved to sameness.js (shared slots vs shared values).
  const w = (id, props) => ({ id, claims: Object.fromEntries([["P31", [{ mainsnak: { datavalue: { value: { id: "Q5" } } } }]], ...props.map((p) => [p, [{ mainsnak: { datavalue: { value: { id: "S" } } } }]])]) });
  const concentrated = Array.from({ length: 8 }, (_, i) => w(`Q${i}`, ["P39", `P90${i}`]));
  const { relatingNull } = wdMod;
  const real = relatingNull("S", concentrated, { kind: "Q5", draws: 200, seed: 7 });
  assert.equal(real.observed, 8);
  assert.equal(real.degenerate, true, "a universally-held property is immovable under a margin-preserving swap");
  assert.equal(real.rank, null, "and so no rank may be reported");

  const scattered = Array.from({ length: 8 }, (_, i) => w(`Q${i}`, [`P8${i}`, `P90${i}`]));
  const noise = relatingNull("S", scattered, { kind: "Q5", draws: 200, seed: 7 });
  assert.equal(noise.degenerate, true, "noise is refused too — the null cannot separate them, and says so");
});
test("the null reports a rank and never a verdict — no threshold lives here", async () => {
  const { relatingNull } = await import("./wikidata.js");
  const src = readFileSync(new URL("./wikidata.js", import.meta.url), "utf8");
  const fn = src.slice(src.indexOf("export function relatingNull"));
  assert.doesNotMatch(fn.slice(0, 2000), /rank\s*[<>]=?\s*0\.\d/, "relatingNull states a number; a caller decides what it licenses");
  const got = relatingNull("S", [], { kind: "Q5" });
  assert.equal(got.degenerate, true, "no witnesses is not a finding");
});

// ── the adapter ────────────────────────────────────────────────────────────

test("the adapter answers seek.js's four questions from captured bytes", async () => {
  const { makeWikidataSource } = await import("./wikidata.js");
  const { seekBindings } = await import("./seek.js");
  // Every response served from the real fixtures on disk; no network.
  const canned = new Map([
    ["Q273546", raw("Q273546")],
    ["Q8612", raw("Q8612")],
    ["Q11699", raw("Q11699")],
  ]);
  const get = async (url) => {
    if (/wbsearchentities/.test(url)) {
      const term = decodeURIComponent(url.split("search=")[1] ?? "");
      if (/lincoln/i.test(term)) return { search: [{ id: "Q91", label: "Abraham Lincoln" }] };
      if (/vice/i.test(term)) return { search: [{ id: "Q11699", label: "Vice President of the United States" }] };
      return { search: [] };
    }
    if (/wbgetentities/.test(url)) {
      const ids = decodeURIComponent(url.split("ids=")[1].split("&")[0]).split("|");
      const entities = {};
      for (const id of ids) {
        if (canned.has(id)) entities[id] = canned.get(id);
        // a minimal stand-in for the anchor, holding one dated office
        if (id === "Q91") entities[id] = { id: "Q91", labels: { en: { value: "Abraham Lincoln" } }, claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q5" } } } }], P39: [{ mainsnak: { datavalue: { value: { id: "Q11696" } } }, qualifiers: { P580: [{ datavalue: { value: { time: "+1861-03-04T00:00:00Z" } } }], P582: [{ datavalue: { value: { time: "+1865-04-15T00:00:00Z" } } }] } }] } };
        if (id === "Q11696") entities[id] = { id: "Q11696", labels: { en: { value: "President of the United States" } }, claims: { P17: [{ mainsnak: { datavalue: { value: { id: "Q30" } } } }] } };
      }
      return { entities };
    }
    if (/haswbstatement/.test(url)) {
      const q = decodeURIComponent(url.split("srsearch=")[1] ?? "");
      if (/P31%3DQ11699|P31=Q11699/.test(q)) return { query: { searchinfo: { totalhits: 1 }, search: [{ title: "Q11699" }] } };
      if (/P39=Q11699/.test(q)) return { query: { searchinfo: { totalhits: 2 }, search: [{ title: "Q273546" }, { title: "Q8612" }] } };
      return { query: { searchinfo: { totalhits: 0 }, search: [] } };
    }
    return null;
  };

  const source = makeWikidataSource({ get });
  const { wikidataSpan } = await import("./wikidata.js");
  // The relation is supplied here rather than learned: learning is covered
  // against the REAL fixtures above, and this case exists to prove the four
  // adapter questions carry a walk end to end. Passing it also exercises
  // seek.js's own `relation` bypass, which a caller with a known schema uses.
  const got = await seekBindings({ anchor: "Abraham Lincoln", slot: "vice president", kind: "Q5" }, source, { span: wikidataSpan, relation: "P39" });
  assert.ok(!got.gap, `expected bindings, got ${JSON.stringify(got.gap)}`);
  assert.equal(got.relation, "P39");
  const scope = got.perScope.find((p) => p.bound.length);
  assert.deepEqual(scope.bound.map((b) => b.label), ["Hannibal Hamlin", "Andrew Johnson"]);
  assert.equal(scope.coverage.tiles, true);
  assert.equal(scope.coverage.ratio, 1);
});

test("asSourceEntity exposes EVERY entity-valued claim, not just the two parseEntity keeps", async () => {
  const { asSourceEntity } = await import("./wikidata.js");
  const e = asSourceEntity(raw("Q273546"));
  assert.ok(e.relations.length > e.relations.filter((r) => r.relation === "P39").length, "a general walk must see the whole neighbourhood");
  assert.ok(e.kinds.includes("Q5"));
  const vp = e.relations.find((r) => r.relation === "P39" && r.value === "Q11699");
  assert.match(vp.scope.from, /^\+1861-03-04/);
  assert.equal(vp.next, "Q8612", "qualifiers become prev/next, which seek.js reads without knowing their ids");
});

test("the adapter refuses to build its own crossing", async () => {
  const { makeWikidataSource } = await import("./wikidata.js");
  assert.throws(() => makeWikidataSource({}), TypeError);
  assert.throws(() => makeWikidataSource(), TypeError);
});

test("a declined read stays a refusal through the adapter, never an empty result", async () => {
  const { makeWikidataSource } = await import("./wikidata.js");
  const source = makeWikidataSource({ get: async () => null });
  assert.equal(await source.resolve("anything"), null);
  assert.equal(await source.entities(["Q1"]), null);
  assert.equal(await source.membersOf("P39", "Q11699"), null);
});

// ── cross-source referents, by qid (found chasing "make cross source
// referents", 2026-09-15) — against REAL captured pageprops responses,
// eval/fixtures/wikidata/pageprops/, never a hand-typed stand-in ──────────

test("parsePageProps reads the real qid a fetched Wikipedia page carries, whatever language it's written in", () => {
  assert.equal(parsePageProps(pageprops("harvard-en")), "Q13371");
  assert.equal(parsePageProps(pageprops("harvard-ru")), "Q13371", "Russian, Cyrillic title, same real entity");
  assert.equal(parsePageProps(pageprops("harvard-he")), "Q13371", "Hebrew, caseless script, same real entity");
  assert.equal(parsePageProps(pageprops("harvard-zh")), "Q13371", "Chinese, no word boundaries, same real entity");
  assert.equal(parsePageProps(pageprops("stanford-en")), "Q41506", "a genuinely different real institution has its own, different qid");
});

test("parsePageProps refuses rather than guesses when the property is absent or the shape is wrong", () => {
  assert.equal(parsePageProps({}), null);
  assert.equal(parsePageProps({ query: { pages: { 1: { title: "X" } } } }), null, "a real page with no linked Wikidata item at all");
  assert.equal(parsePageProps(null), null);
});

test("qidBridge: four real Wikipedia articles in four different scripts (Latin, Cyrillic, Hebrew, Han) all correctly bridge to the SAME real entity, by qid, never by name-string", () => {
  const en = { qid: parsePageProps(pageprops("harvard-en")), ref: "wiki:en#0-1" };
  const ru = { qid: parsePageProps(pageprops("harvard-ru")), ref: "wiki:ru#0-1" };
  const he = { qid: parsePageProps(pageprops("harvard-he")), ref: "wiki:he#0-1" };
  const zh = { qid: parsePageProps(pageprops("harvard-zh")), ref: "wiki:zh#0-1" };
  for (const [a, b] of [[en, ru], [en, he], [en, zh], [ru, he], [ru, zh], [he, zh]]) {
    const r = qidBridge(a, b);
    assert.ok(r.bridged, JSON.stringify(r));
    assert.equal(r.qid, "Q13371");
  }
});

test("qidBridge refuses to bridge two genuinely different real institutions, even in the same language", () => {
  const harvardEn = { qid: parsePageProps(pageprops("harvard-en")), ref: "wiki:en-harvard#0-1" };
  const stanfordEn = { qid: parsePageProps(pageprops("stanford-en")), ref: "wiki:en-stanford#0-1" };
  const r = qidBridge(harvardEn, stanfordEn);
  assert.equal(r.bridged, false);
  assert.equal(r.reason, "different_qid");
});

test("qidBridge refuses BY NAME when a qid is missing, never silently reads that as 'different' the same way a genuine mismatch would", () => {
  const known = { qid: "Q13371", ref: "a" };
  assert.deepEqual(qidBridge({ ref: "b" }, known), { bridged: false, reason: "missing_qid", a: "b", b: "a" });
  assert.deepEqual(qidBridge(known, { qid: "not-a-real-qid", ref: "c" }), { bridged: false, reason: "missing_qid", a: "a", b: "c" });
  assert.equal(qidBridge({}, {}).reason, "missing_qid");
});

test("pagePropsUrl builds the address a caller's own fetch should read, non-ASCII titles included", () => {
  const url = pagePropsUrl("ru", "Гарвардский университет");
  assert.match(url, /^https:\/\/ru\.wikipedia\.org\/w\/api\.php\?/);
  assert.match(url, /prop=pageprops/);
  assert.match(url, /ppprop=wikibase_item/);
  assert.doesNotMatch(url, /Гарвардский/, "the raw Cyrillic must be percent-encoded, never embedded literally in a URL");
});

test("THE MEASURED FALSE POSITIVE this organ exists to replace: namesCorefer's cross-document name check 'bridges' Harvard to an UNRELATED Stanford specimen sharing only the shape of an embedded foreign-language gloss — reproduced against the real engine organs, never assumed from the header alone", async () => {
  const { makeReferentIndex } = await import("../organs/cast.js");
  const { extractSurfaces, discoverReferents, namesCorefer, diaNorm } = await import("../adapters/text/surfaces.js");
  const { splitSentences } = await import("../adapters/text/spans.js");
  const { classifyWord, dominantClass } = await import("../adapters/text/wordclass.js");
  const posPrior = JSON.parse(readFileSync(new URL("../eval/the-fold/fixtures/pos-prior-eng.json", import.meta.url), "utf8"));
  const isCommonNoun = (w) => { const d = dominantClass(classifyWord(w, { posPrior }), { minShare: 0.5 }); return Boolean(d && d.upos === "NOUN"); };
  assert.equal(isCommonNoun("university"), false, "PROPN-dominant (79% share) in the real treebank, not OOV like 'observatory' was — a second, different shape of the same class of gap");
  const indexFor = makeReferentIndex({ splitSentences, extractSurfaces, discoverReferents, namesCorefer: (a, b) => namesCorefer(a, b, { commonNoun: isCommonNoun }), diaNorm });
  // The real fetched English Wikipedia lead extract — a single isolated
  // sentence never even admits "Harvard University" as a referent at all
  // (the Born gate's own conservative admission, P79), so this needs
  // genuine multi-mention prose, not a hand-typed stand-in either.
  const EN_EXTRACT = readFileSync(`${FIX}wikidata/pageprops/harvard-en-extract.txt`, "utf8");
  const harvardEn = indexFor([{ text: EN_EXTRACT, ref: "en#0-1" }]);
  const unrelatedStanfordRu = indexFor([{ text: "Стэнфордский университет (англ. Stanford University) — университет в США.", ref: "ru#0-1" }]);
  const enSurfaces = [...new Set(harvardEn.events.map((e) => e.surface))];
  const ruSurfaces = [...new Set(unrelatedStanfordRu.events.map((e) => e.surface))];
  let falsePositive = false;
  for (const es of enSurfaces) for (const rs of ruSurfaces) { try { if (namesCorefer(es, rs, { commonNoun: isCommonNoun }) || namesCorefer(rs, es, { commonNoun: isCommonNoun })) falsePositive = true; } catch {} }
  assert.ok(falsePositive, "if this ever starts failing, the namesCorefer-level gap has been closed and this test (and its header's own warning) should be revisited, not deleted silently");
});
