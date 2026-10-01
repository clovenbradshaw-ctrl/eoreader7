// lowercase-lane-falsify.test.mjs — capital letters are one witness of a being,
// not the gate on whether the referent index may hold one (2026-09-30).
//
// THE FINDING. The reader forms an identity hypothesis for a description that
// recurs ("the pawl", "the cassette", "the cyclist"), and individuation.js
// carried a projection from such a hypothesis to a provisional referent
// (referentFromDescriptorHypothesis) that NOTHING CALLED. So on prose whose
// beings are common nouns the index held no referent and `resolveIn(ask)`
// returned nothing, however many hypotheses the reader was sitting on: the
// capital-derived pool and the positional pool were the only ways in.
//
// THE FIRST CUT WAS WRONG, AND MEASURED. Promoting every recurring definite or
// possessive descriptor added 185 beings to War and Peace's 38-being cast in
// 30 KB — "the time", "the thing", "the world", "her eyes", "that moment". A
// lane that admits on recurrence alone is the capital-letter mistake turned over.
// So this witness earns its standing against its own baseline, the way case's
// does (capitalisationIsSignificant: a capitalised share against a fair coin):
// the head must be said here significantly more than a received corpus says it,
// by the same exact binomial tail. Same 30 KB: 185 → 74, every word of the
// language's own furniture gone, the name lane byte-identical.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logBinomialUpperTail, isKeyInMaterial, receivedRate } from "../adapters/text/keyness.js";
import { namingGate } from "../adapters/text/nominal-beings.js";
import { descriptorLane } from "../adapters/text/descriptor-lane.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");
const POS = path.join(ROOT, "cli/priors/pos-prior-en.json");
const havePrior = fs.existsSync(POS);
const loadPrior = () => { const p = JSON.parse(fs.readFileSync(POS, "utf8")); return p.provenance?.source ? p : { ...p, provenance: { source: p.giver?.resource } }; };

// ── the instrument ─────────────────────────────────────────────────────────

test("the tail is the exact binomial, in log space, at any n", () => {
  // Checked against the direct sum where the direct sum is computable.
  const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; };
  const direct = (k, n, p) => { let s = 0; for (let j = k; j <= n; j++) s += C(n, j) * p ** j * (1 - p) ** (n - j); return s; };
  for (const [k, n, p] of [[3, 20, 0.1], [5, 50, 0.05], [10, 200, 0.02], [2, 190, 5e-5]]) {
    const got = Math.exp(logBinomialUpperTail(k, n, p)), want = direct(k, n, p);
    assert.ok(Math.abs(got - want) <= want * 1e-9, `k=${k} n=${n} p=${p}: ${got} vs ${want}`);
  }
  // Where the direct sum overflows (n = 5000) and a bare 0.5^n would underflow, the log-space answer still exists.
  const big = Math.exp(logBinomialUpperTail(40, 1_000_000, 1e-5));
  assert.ok(big > 0 && big < 1e-9, `large n: ${big}`);
  assert.equal(logBinomialUpperTail(0, 10, 0.1), 0);
  assert.equal(logBinomialUpperTail(11, 10, 0.1), -Infinity);
});

test("a word said no more than the language says it is never key; one said far more is", () => {
  // "time": ~2 per 1000 tokens in the received corpus. Twelve in 5000 is what the language expects (10).
  assert.equal(isKeyInMaterial(12, 5000, 2e-3), false, "at its own expectation, not key");
  assert.equal(isKeyInMaterial(25, 5000, 2e-3), true, "well past it, key");
  // A form the corpus never met has a small nonzero rate, and repeating it is key even in a short text.
  assert.equal(isKeyInMaterial(5, 190, 4.5e-6), true);
  // One occurrence carries no recurrence to test; a missing or zero baseline is no claim either way.
  assert.equal(isKeyInMaterial(1, 190, 4.5e-6), false);
  assert.equal(isKeyInMaterial(5, 190, null), false);
  assert.equal(isKeyInMaterial(5, 0, 1e-3), false);
});

test("receivedRate reads only the prior's own declared figures, and a language without one has no rate", { skip: !havePrior && "POS prior not present in this checkout" }, () => {
  const rate = receivedRate(loadPrior());
  assert.ok(rate("time") > rate("teeth"), "a common form has the higher received rate");
  assert.ok(rate("teeth") > rate("pawl"), "an attested form outranks an unseen one");
  assert.ok(rate("pawl") > 0, "an unseen form is judged against a small rate, not assumed absent");
  assert.equal(receivedRate(null)("anything"), null);
  assert.equal(receivedRate({ forms: {} })("anything"), null, "no declared token count, no baseline");
  assert.equal(descriptorLane(null).key, undefined, "no prior, no key: the lane is typed as abstaining, never silently absent");
});

test("the naming gate reads the cue by how settled the prior says it is", { skip: !havePrior && "POS prior not present in this checkout" }, () => {
  const gate = namingGate(loadPrior());
  assert.equal(gate("same", "the"), false, "a head the prior settles as an adjective is refused");
  assert.equal(gate("rolling", "the"), false, "…and as a verb");
  assert.equal(gate("teeth", "that"), true, "a head attested as a noun passes whatever the cue");
  assert.equal(gate("driveshaft", "the"), true, "an unseen head rides a cue the prior settles as a determiner");
  assert.equal(gate("disengages", "that"), false, "…but not a cue it leaves unsettled: 'that disengages' is a clause");
  assert.equal(gate("pawl", "her"), false, "…nor a pronoun-class cue");
  assert.equal(namingGate(null)("disengages", "that"), true, "no prior refuses nothing");
});

// ── the reader, end to end ─────────────────────────────────────────────────

const FREEWHEEL = "A freewheel is a device in a transmission that disengages the driveshaft from the driven shaft when the driven shaft rotates faster than the driveshaft. Rotating the pedals forward turns the cassette, and the cassette carries the pawl. The pawl rides on the teeth of the ratchet, and the ratchet is fixed to the wheel. When the cyclist stops pedaling, the wheel keeps turning faster than the cassette. The pawl then slides over the teeth and clicks, so the wheel coasts freely. A spring holds the pawl against the teeth, and the spring is weak enough to let the pawl lift. Without the pawl the cyclist could not coast, because the wheel would drag the pedals. Rotating the wheel backward locks the pawl on the teeth again, and the cyclist feels the drive return. The cassette is threaded onto the hub of the wheel. A steel roller design replaces the pawl with rollers, and the rollers wedge between two discs. The two discs grip when the cyclist pushes the pedals. The cyclist coasts when the discs release the rollers.";

async function read(text) {
  const { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } = await import("../adapters/text/recursive.js");
  const { diaNorm, namesCorefer } = await import("../adapters/text/surfaces.js");
  const { reviseTextFold } = await import("../adapters/text/revision.js");
  const { createRecursiveReader } = await import("../kernel/reading.js");
  const { reconstruct } = await import("../kernel/fold.js");
  const { readingIndexFromLog } = await import("./reading-log.js");
  const posPrior = loadPrior();
  const reader = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior, descriptorAnchoring: { born: true, bornActivationFloor: 0.5, bornMarginFloor: 0.3, minWindow: 4 }, reprojectEvery: 3, language: "eng" })],
    adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }), retrieve: (_f, ev) => Object.freeze({ schema: "EORelevantFold@1", witnessed: [...ev], provisional: [], expectations: [], obligations: [], exclusions: [], unresolvedAlternatives: [], activeFrames: [], receivedPriors: [] }) },
  });
  for (const enc of textEncounters(text, { source: "probe", offset: 0 })) await reader.step(enc);
  const log = reader.getLog();
  const organs = { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn };
  return {
    off: readingIndexFromLog(log, organs),
    on: readingIndexFromLog(log, { ...organs, descriptors: descriptorLane(posPrior) }),
    // The same entries array, asked a third time without the lane: the memo must not serve the fold that promoted.
    offAgain: readingIndexFromLog(log, organs),
  };
}
const idsOf = (ix) => [...ix.referents].sort();
const descriptorIds = (ix) => idsOf(ix).filter((i) => i.startsWith("ref:descriptor:"));

test("LOWERCASE BEINGS: a question naming the pawl, the teeth and the cyclist resolves — with the lane on, and to nothing with it off", { skip: !havePrior && "POS prior not present in this checkout" }, async () => {
  const { off, on, offAgain } = await read(FREEWHEEL.toLowerCase());
  assert.deepEqual(idsOf(off), [], `the premise: with no capital in the text, the name lanes hold no being (${idsOf(off)})`);
  assert.equal(off.resolveIn("how does the pawl engage the teeth?").size, 0);
  assert.equal(on.descriptorLane, "on");
  const ids = descriptorIds(on);
  for (const want of ["the_pawl", "the_teeth", "the_cassette", "the_cyclist", "the_wheel"]) assert.ok(ids.includes(`ref:descriptor:${want}`), `${want} is a provisional being: ${ids.join(", ")}`);
  const pawl = [...on.resolveIn("how does the pawl engage the teeth?")];
  assert.deepEqual(pawl.sort(), ["ref:descriptor:the_pawl", "ref:descriptor:the_teeth"]);
  assert.deepEqual([...on.resolveIn("what does the cyclist do with the wheel?")].sort(), ["ref:descriptor:the_cyclist", "ref:descriptor:the_wheel"]);
  // The memo is per lane: a third ask without it is served the fold WITHOUT the promoted beings.
  assert.deepEqual(idsOf(offAgain), [], "the lane is part of what was folded; it does not leak into a caller who did not ask");
});

test("what the lane refuses: a clause after 'that', a description only ever indefinite, and any bare case-derived guess", { skip: !havePrior && "POS prior not present in this checkout" }, async () => {
  const { on } = await read(FREEWHEEL.toLowerCase());
  const ids = descriptorIds(on);
  assert.ok(!ids.some((i) => /that_disengages/.test(i)), `'that disengages' is a clause, not a description: ${ids.join(", ")}`);
  assert.ok(!ids.some((i) => /^ref:descriptor:a_/.test(i)), "an indefinite is never one being by recurrence alone (individuation.js)");
  for (const id of ids) assert.equal(on.events.filter((e) => e.referent_id === id).length, 1, "a provisional being carries exactly the surface that earned it — no bare-head alias that would resolve a generic use");
  assert.ok(on.descriptorBeings >= 5 && on.descriptorBeings === ids.length);
});

test("case is not read: the same prose as written and lowercased earns the same beings", { skip: !havePrior && "POS prior not present in this checkout" }, async () => {
  const written = await read(FREEWHEEL);
  const lowered = await read(FREEWHEEL.toLowerCase());
  assert.deepEqual(descriptorIds(written.on), descriptorIds(lowered.on));
});

test("the name lane is untouched, and a descriptor never mints a second being for a name", { skip: !havePrior && "POS prior not present in this checkout" }, async () => {
  // «Cumberland River» is a capital-derived being here; "the cumberland" and "the river" each recur under a determiner and each
  // would clear the standing test (the corpus has never met "cumberland" and says "river" seldom). Whether they are that being
  // is the coreference organs' question — the lane is additive and does not mint a second one.
  const NAMED = "They crossed the Cumberland River at dawn and the river was wide. Later they followed the Cumberland River north, and the river narrowed. Near Nashville they left the Cumberland River behind them. Travelers praised the Cumberland River, and the river never froze that year. The guide knew the Cumberland River well, and the river carried their boats. Everyone watched the Cumberland River, because the river was their road.";
  const { off, on } = await read(NAMED);
  const before = idsOf(off);
  assert.ok(before.length >= 1, `the premise: a capital-derived being exists (${before.join(", ")})`);
  for (const id of before) assert.ok(on.referents.has(id), `${id} survives the lane`);
  const surfaces = (ix, id) => ix.events.filter((e) => e.referent_id === id).map((e) => e.surface).sort().join("|");
  for (const id of before) assert.equal(surfaces(on, id), surfaces(off, id), `${id}: the lane never edits a name-lane being's surfaces`);
  assert.ok(on.descriptorsSkipped >= 2, `the premise: the lane SAW the colliding descriptors and refused them (${on.descriptorsSkipped} skipped)`);
  assert.deepEqual(descriptorIds(on).filter((i) => /river|cumberland/.test(i)), [], "no second being for a name the name lane holds");
});

test("STANDING: a noun the language says all the time is not a being for being said four times here; a rare one is", { skip: !havePrior && "POS prior not present in this checkout" }, async () => {
  // ~1,900 words of one-off coined nouns (no recurrence, so no hypothesis of their own), "the time" four times — about what
  // the received corpus's rate expects over this many words — and "the pawl" four times, a form the corpus has never met.
  const coin = (i) => { const c = "bdfgklmnprstvz", v = "aeiou"; let x = i, w = ""; for (let k = 0; k < 3; k++) { w += c[x % c.length] + v[(x >> 2) % v.length]; x = Math.floor(x / 3) + 7 + k; } return w + "x"; };
  const lines = [];
  for (let i = 0; i < 190; i += 1) {
    lines.push(`Then a traveler${coin(i * 2)} crossed the ${coin(i * 2 + 1)} beside a ${coin(i * 2 + 401)} at dusk.`);
    if (i % 47 === 10) lines.push("The time passed slowly, and the pawl clicked.");
  }
  const text = lines.join(" ");
  const { on, off } = await read(text);
  assert.deepEqual(idsOf(off), [], "the premise: nothing in this text is a capital-derived being");
  const ids = descriptorIds(on);
  assert.ok(ids.includes("ref:descriptor:the_pawl"), `the rare word, said four times, is a being: ${ids.join(", ")}`);
  assert.ok(!ids.includes("ref:descriptor:the_time"), "the common word, said four times, is not: the language says it about that often anyway");
});

test("without a baseline the lane abstains, typed — recurrence under a determiner alone admits nothing", { skip: !havePrior && "POS prior not present in this checkout" }, async () => {
  const { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } = await import("../adapters/text/recursive.js");
  const { diaNorm, namesCorefer } = await import("../adapters/text/surfaces.js");
  const { reviseTextFold } = await import("../adapters/text/revision.js");
  const { createRecursiveReader } = await import("../kernel/reading.js");
  const { reconstruct } = await import("../kernel/fold.js");
  const { readingIndexFromLog } = await import("./reading-log.js");
  const reader = createRecursiveReader({
    perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: loadPrior(), descriptorAnchoring: { born: true, bornActivationFloor: 0.5, bornMarginFloor: 0.3, minWindow: 4 }, reprojectEvery: 3, language: "eng" })],
    adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }), retrieve: (_f, ev) => Object.freeze({ schema: "EORelevantFold@1", witnessed: [...ev], provisional: [], expectations: [], obligations: [], exclusions: [], unresolvedAlternatives: [], activeFrames: [], receivedPriors: [] }) },
  });
  for (const enc of textEncounters(FREEWHEEL.toLowerCase(), { source: "probe", offset: 0 })) await reader.step(enc);
  const organs = { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn };
  // A caller that ASKED for the lane and has no prior is told so — not read as one who never asked.
  const ix = readingIndexFromLog(reader.getLog(), { ...organs, descriptors: descriptorLane(null) });
  assert.equal(ix.descriptorLane, "no_baseline");
  assert.equal(ix.descriptorBeings, 0);
  assert.deepEqual(idsOf(ix), []);
  const never = readingIndexFromLog(reader.getLog(), organs);
  assert.equal(never.descriptorLane, "off", "…and 'never asked' stays distinguishable from 'asked, no baseline'");
  // A refusal that THROWS is a refusal: a broken gate must not read as no gate.
  const lane = descriptorLane(loadPrior());
  const broken = readingIndexFromLog(reader.getLog(), { ...organs, descriptors: { ...lane, naming: () => { throw new Error("gate down"); } } });
  assert.equal(broken.descriptorBeings, 0, "a gate that throws admits nothing");
  assert.ok(broken.descriptorsSkipped > 0, "…and the refusals are counted, not silent");
});
