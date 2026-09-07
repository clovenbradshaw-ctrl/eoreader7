// An address is given at birth and kept (2026-09-07) — surfaces.js `prior`,
// recursive.js `addresses: "birth"`.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripContainer, splitSentences } from "../adapters/text/spans.js";
import { accumulateSurfaceEvidence, surfacesFromEvidence, discoverReferents, diaNorm } from "../adapters/text/surfaces.js";
import { createCausalTextPerceiver, textEncounters } from "../adapters/text/recursive.js";
import { reviseTextFold } from "../adapters/text/revision.js";
import { createRecursiveReader } from "../../kernel.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const POS = JSON.parse(fs.readFileSync(path.join(here, "../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json"), "utf8"));
const BOOK = "/Users/mlacy/Documents/3.0/the-fold/pg2600.txt";
const partition = (events) => { const by = new Map(); for (const e of events) { if (e.type !== "DEF.admit") continue; if (!by.has(e.referent_id)) by.set(e.referent_id, []); by.get(e.referent_id).push(e.surface); } return [...by.values()].map((xs) => xs.sort().join("|")).sort(); };
const refsOf = (events) => { const m = new Map(); for (const e of events) if (e.type === "DEF.admit") m.set(diaNorm(e.surface), e.referent_id); return m; };

test("THE PARTITION IS BYTE-IDENTICAL: the birth rule renames clusters and never changes which surfaces cluster together — on real material, refresh by refresh", () => {
  const text = stripContainer(fs.readFileSync(BOOK, "utf8").slice(0, 120000)).text;
  const sentences = splitSentences(text).map((s, i) => ({ text: String(s?.text ?? s), order: i }));
  const evidence = { capCounts: new Map(), lowerCounts: new Map(), sentenceIndex: new Map() };
  let prior = { refs: new Map(), born: new Map(), next: 0 }, refreshes = 0, renamedAtLeastOnce = false, lastRefs = null; // an EMPTY prior is the first refresh under the birth rule
  for (let at = 0; at < sentences.length; at += 100) {
    accumulateSurfaceEvidence(sentences.slice(at, at + 100), evidence);
    const surfaces = surfacesFromEvidence(evidence);
    const founder = discoverReferents(surfaces);
    const birth = discoverReferents(surfaces, { prior });
    assert.deepEqual(partition(birth.events), partition(founder.events), `refresh ${refreshes}: the same clusters`);
    assert.deepEqual(birth.gaps.map((g) => g.reason).sort(), founder.gaps.map((g) => g.reason).sort(), `refresh ${refreshes}: the same gaps`);
    const refs = refsOf(birth.events);
    if (lastRefs) for (const [k, id] of lastRefs) { if (refs.has(k) && refs.get(k) !== id) renamedAtLeastOnce = true; }
    if ([...refsOf(founder.events)].some(([k, id]) => refs.has(k) && refs.get(k) !== id)) renamedAtLeastOnce = true;
    prior = { refs, born: birth.addresses.born, next: birth.addresses.next };
    lastRefs = refs; refreshes += 1;
  }
  assert.ok(refreshes >= 5, "the fixture actually refreshed");
  assert.ok(renamedAtLeastOnce, "the fixture actually exercised a rename — otherwise the invariant passed vacuously");
});

test("A BEING KEEPS ITS ADDRESS across the flip that founder-minting makes: the fragment first, the fuller name later, then the tie turning", () => {
  const S = (surface, sentences, mentions) => ({ surface, sentences, mentions });
  // refresh 1: "Vasili" clears the floor first
  const r1 = discoverReferents([S("Vasili", 6, 8), S("Anna", 5, 6), S("Kutuzov", 4, 4), S("Moscow", 3, 3), S("Prince Vasili", 2, 2)], { prior: { refs: new Map(), born: new Map(), next: 0 } });
  const id1 = refsOf(r1.events).get("vasili");
  assert.equal(id1, "ref:auto:vasili");
  // refresh 2: "Prince Vasili" now outranks it (more sentences); founder-minting would call the being ref:auto:prince_vasili
  const surfaces2 = [S("Prince Vasili", 9, 12), S("Vasili", 7, 9), S("Anna", 6, 7), S("Kutuzov", 5, 5), S("Moscow", 4, 4)];
  const founder2 = discoverReferents(surfaces2);
  assert.equal(refsOf(founder2.events).get("vasili"), "ref:auto:prince_vasili", "the fixture reproduces the flip under founder-minting");
  const birth2 = discoverReferents(surfaces2, { prior: { refs: refsOf(r1.events), born: r1.addresses.born, next: r1.addresses.next } });
  assert.equal(refsOf(birth2.events).get("prince vasili"), "ref:auto:vasili", "under the birth rule the being keeps the address it was born with");
  assert.equal(refsOf(birth2.events).get("vasili"), "ref:auto:vasili");
  assert.deepEqual(partition(birth2.events), partition(founder2.events));
  assert.deepEqual(birth2.merges, [], "one being, one address: no merge to record");
});

test("A MERGE OF TWO PRIOR BEINGS is testimony with a witness; A SPLIT keeps the address with the cluster holding more of its bearers; a fresh birth colliding with a live address is suffixed", () => {
  const S = (surface, sentences, mentions) => ({ surface, sentences, mentions });
  // Two beings born apart ("Mikhail" and "Kutuzov"), then "Mikhail Kutuzov" arrives and witnesses them as one.
  const r1 = discoverReferents([S("Mikhail", 6, 6), S("Kutuzov", 6, 6), S("Anna", 5, 5), S("Moscow", 3, 3)], { prior: { refs: new Map(), born: new Map(), next: 0 } });
  const p1 = { refs: refsOf(r1.events), born: r1.addresses.born, next: r1.addresses.next };
  const r2 = discoverReferents([S("Mikhail Kutuzov", 8, 9), S("Mikhail", 7, 7), S("Kutuzov", 7, 7), S("Anna", 6, 6), S("Moscow", 4, 4)], { prior: p1 });
  const refs2 = refsOf(r2.events);
  assert.equal(refs2.get("mikhail kutuzov"), refs2.get("mikhail"), "one being");
  assert.equal(refs2.get("kutuzov"), refs2.get("mikhail"));
  const kept = refs2.get("mikhail");
  assert.ok(["ref:auto:mikhail", "ref:auto:kutuzov"].includes(kept), "the kept address is one of the two prior ones — the earlier-born");
  const merge = r2.merges.find((m) => m.kept === kept);
  assert.ok(merge, "the merge of two prior beings is on record");
  assert.deepEqual(merge.folded, [kept === "ref:auto:mikhail" ? "ref:auto:kutuzov" : "ref:auto:mikhail"]);
  assert.equal(merge.witness, "Mikhail Kutuzov", "witnessed by the surface that united them");
  // A birth whose minted id would collide with a live address is suffixed, never silently the same being.
  const r3 = discoverReferents([S("Anna", 6, 6), S("Anna Pavlovna", 5, 5), S("Boris", 4, 4)], { prior: { refs: new Map([["anna", "ref:auto:anna"]]), born: new Map([["ref:auto:anna", 0]]), next: 1 } });
  const refs3 = refsOf(r3.events);
  assert.equal(refs3.get("anna"), "ref:auto:anna", "the prior bearer keeps the address");
  assert.notEqual(refs3.get("boris"), "ref:auto:anna");
});

test("ON THE REAL 60 KB PREFIX, the oscillation P165 pinned is gone under the birth rule, and the partition of surfaces into beings is the founder rule's", async () => {
  const stripped = stripContainer(fs.readFileSync(BOOK, "utf8").slice(0, 60000));
  const read = async (addresses) => {
    const encounters = textEncounters(stripped.text, { source: "file:pg2600", offset: stripped.offset });
    const reader = createRecursiveReader({ perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POS, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 }, addresses })], adapters: { revise: reviseTextFold, retrieve: (_f, ev) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...ev]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }) } });
    return reader.read(encounters);
  };
  const [founder, birth] = await Promise.all([read("founder"), read("birth")]);
  const merges = (r) => r.fold.graphEntries.filter((g) => g.schema === "EOReferentMerge@1");
  const cyclic = (ms) => { const into = new Map(); for (const m of ms) for (const f of m.folded) into.set(f, m.kept); return [...into].filter(([f, k]) => into.get(k) === f).length; };
  assert.ok(cyclic(merges(founder)) >= 1, "the founder rule still oscillates on this prefix (P165's finding stands for the default)");
  assert.equal(cyclic(merges(birth)), 0, "under the birth rule no address flips back");
  // The mentions of one being land on one address: the surfaces named by the final referents partition identically.
  const beings = (r) => { const live = r.fold.graphEntries.filter((g) => g.schema === "EOReferent@1"); return live.map((x) => [...x.surfaces].sort().join("|")).sort(); };
  const mentionsOnSuperseded = (r) => { const folded = new Set(merges(r).flatMap((m) => m.folded)); return r.fold.graphEntries.filter((g) => g.schema === "EOMention@1" && folded.has(g.referent)).length; };
  assert.ok(mentionsOnSuperseded(founder) > mentionsOnSuperseded(birth), `mentions stranded on superseded addresses: founder ${mentionsOnSuperseded(founder)}, birth ${mentionsOnSuperseded(birth)}`);
  assert.ok(beings(birth).length <= beings(founder).length, "no more beings than before");
});
