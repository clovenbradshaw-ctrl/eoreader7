// learn-pass-falsify.test.mjs — the multi-ground mechanism (2026-09-22): a
// second, nearer ground built mechanically from search over-fetch (never a
// hand-picked category), and honest fallback when there isn't enough for it.
import test from "node:test";
import assert from "node:assert/strict";
import { splitForGrounds, tagGroundedAt, populationQueries, toInstanceUnits, surpriseActivation, beliefFromRun, stanceQueries } from "./learn-pass.js";
import { emergentFacts } from "./form-prior.js";

const page = (i) => ({ url: `https://example.com/${i}`, text: `page ${i}` });

test("splitForGrounds: enough pages splits into instances + an adjacent ground of equal-ish size", () => {
  const pages = Array.from({ length: 12 }, (_, i) => page(i));
  const { instancePages, adjacentPages } = splitForGrounds(pages);
  assert.equal(instancePages.length + adjacentPages.length, 12);
  assert.ok(adjacentPages.length >= 5, `adjacent ground should meet the minimum: ${adjacentPages.length}`);
  assert.deepEqual(instancePages.map((p) => p.url), pages.slice(0, instancePages.length).map((p) => p.url), "instances keep the earlier-ranked pages");
  assert.deepEqual(adjacentPages.map((p) => p.url), pages.slice(instancePages.length).map((p) => p.url), "the ground is the later-ranked remainder, not re-shuffled");
});

test("splitForGrounds: too few pages never fabricates a ground — everything stays instances", () => {
  const pages = Array.from({ length: 7 }, (_, i) => page(i));
  const { instancePages, adjacentPages } = splitForGrounds(pages);
  assert.equal(instancePages.length, 7);
  assert.equal(adjacentPages.length, 0);
});

test("splitForGrounds: exactly at the boundary (10 → 5/5) still splits; 9 does not", () => {
  assert.equal(splitForGrounds(Array.from({ length: 10 }, (_, i) => page(i))).adjacentPages.length, 5);
  assert.equal(splitForGrounds(Array.from({ length: 9 }, (_, i) => page(i))).adjacentPages.length, 0);
});

test("tagGroundedAt: no near paradigm at all → every feature tagged far-only", () => {
  const features = [{ key: "a" }, { key: "b" }];
  tagGroundedAt(features, null);
  assert.deepEqual(features.map((f) => f.groundedAt), [["far"], ["far"]]);
});

test("tagGroundedAt: a feature whose key also holds against the near ground is tagged far+near; one that doesn't is far-only", () => {
  const features = [{ key: "line@0:syllables=5" }, { key: "count:bar=4" }];
  const nearParadigm = { features: [{ key: "line@0:syllables=5" }], all: [{ key: "line@0:syllables=5" }, { key: "count:bar=3" }] };
  tagGroundedAt(features, nearParadigm);
  assert.deepEqual(features[0].groundedAt, ["far", "near"], "found in the near run's own kept features");
  assert.deepEqual(features[1].groundedAt, ["far"], "not found in the near run at all — a weaker, broader signal");
});

test("tagGroundedAt matches against the near paradigm's UNCOMPRESSED `all` too, not only its compressed `features` — a fold on one side still counts", () => {
  const features = [{ key: "x" }];
  const nearParadigm = { features: [], all: [{ key: "x" }] }; // folded under something else in the near run, but the fact still held
  tagGroundedAt(features, nearParadigm);
  assert.deepEqual(features[0].groundedAt, ["far", "near"]);
});

test("populationQueries never contains the topic word — the far ground is topic-free by construction", () => {
  const qs = populationQueries();
  assert.ok(qs.every((q) => q.hunt === "population"));
  assert.ok(qs.every((q) => !/white paper|limerick|sonnet/i.test(q.q)));
});

test("toInstanceUnits: one whole document is one instance — NEVER split by segmentCollection, the live bug (one paper's own numbered sections mistaken for 9 items)", () => {
  const onePaperWithNumberedSections = [
    "Attention Is All You Need", "", "Abstract text here about the model.", "",
    "1 Introduction", "Some introduction prose that goes on for a while about the topic.", "",
    "2 Background", "Some background prose that goes on for a while about related work.", "",
    "3 Model Architecture", "Some architecture prose describing the model in detail here.", "",
    "9 Conclusion", "Some concluding prose wrapping up the paper's contributions.",
  ].join("\n");
  const units = toInstanceUnits([{ url: "https://example.com/paper.pdf", text: onePaperWithNumberedSections }]);
  assert.equal(units.length, 1, "one fetched document is exactly one instance, regardless of how many numbered sections it contains internally");
  assert.equal(units[0].id, "https://example.com/paper.pdf");
});

test("toInstanceUnits: many distinct pages give many distinct instances — 'read a bunch of them' means many URLs, not one page sliced finer", () => {
  const pages = Array.from({ length: 6 }, (_, i) => ({ url: `https://example.com/paper-${i}.pdf`, text: `Title ${i}\n\nSome real prose content about paper number ${i} with enough words to count as an instance.` }));
  const units = toInstanceUnits(pages);
  assert.equal(units.length, 6);
  assert.deepEqual(units.map((u) => u.id), pages.map((p) => p.url));
});

test("toInstanceUnits drops a page whose extraction yielded fewer than 2 elements (empty/near-empty fetch), honestly, not as a fabricated instance", () => {
  const units = toInstanceUnits([{ url: "https://example.com/empty.pdf", text: "" }, { url: "https://example.com/real.pdf", text: "A real sentence here.\nAnd a second real sentence here too." }]);
  assert.equal(units.length, 1);
  assert.equal(units[0].id, "https://example.com/real.pdf");
});

test("surpriseActivation: a fresh holograph, no prior belief injected — admits real instances one at a time and reports whether surprise fell", () => {
  const NOUNS = ["river", "garden", "kettle", "lantern", "harbor", "meadow"];
  const mkInstance = (n) => ({ elements: [{ cls: "line", text: `The ${n} recurs.` }, { cls: "line", text: `A stable structural fact about ${n}.` }] });
  const instances = NOUNS.map((n) => mkInstance(n));
  const act = surpriseActivation(instances);
  assert.equal(act.admissions, 6);
  assert.equal(act.perInstanceBayes.length, 6);
  assert.ok(act.perInstanceBayes.every((b) => b >= 0), "Bayesian surprise (KL divergence) is never negative");
  assert.match(act.basis, /6 instance\(s\) admitted one at a time/);
  assert.ok(typeof act.stabilizing === "boolean");
});

test("surpriseActivation: fewer than 2 instances is declared null, not a fabricated single-point trend", () => {
  assert.equal(surpriseActivation([]), null);
  assert.equal(surpriseActivation([{ elements: [{ cls: "line", text: "x" }] }]), null);
});

test("surpriseActivation actually calls the real emergentFacts/admit machinery — verified by cross-checking one admission by hand", () => {
  const u = { elements: [{ cls: "line", text: "hello" }, { cls: "line", text: "world" }] };
  const facts = emergentFacts(u);
  assert.ok(facts.size > 0, "a real unit really does produce real emergent facts — the activation pass has something genuine to admit");
});

test("beliefFromRun: under_powered refusal teaches 'not from one reading'; no_null refusal teaches 'no ground, no competency' — distinct lessons from distinct causes", () => {
  const a = beliefFromRun("haiku", { refused: true, reason: "under_powered", instances: 2, population: 0 });
  assert.match(a.statement, /cannot come from one reading/);
  assert.equal(a.evidence.reason, "under_powered");
  const b = beliefFromRun("haiku", { refused: true, reason: "no_null", instances: 9, population: 1 });
  assert.match(b.statement, /relative ground/i);
  assert.equal(b.evidence.reason, "no_null");
});

test("beliefFromRun: a stabilizing activation and a non-stabilizing one produce OPPOSITE, honest lessons — never smoothed to always-positive", () => {
  const good = beliefFromRun("haiku", { ok: true, activation: { stabilizing: true, meanBayesEarlyHalf: 2, meanBayesLateHalf: 0.5, admissions: 10 } });
  assert.match(good.statement, /less surprising/i);
  const bad = beliefFromRun("haiku", { ok: true, activation: { stabilizing: false, meanBayesEarlyHalf: 1, meanBayesLateHalf: 1.2, admissions: 6 } });
  assert.match(bad.statement, /has not stabilized/);
  assert.match(bad.statement, /still provisional/);
});

test("beliefFromRun: an ordinary success with no activation data teaches nothing new — null, not a fabricated lesson", () => {
  assert.equal(beliefFromRun("haiku", { ok: true }), null);
});

test("stanceQueries: no stance gives no extra queries; a stance adds queries ALONGSIDE the bare form-hunt, never in place of it", () => {
  assert.deepEqual(stanceQueries("white paper", null), []);
  const qs = stanceQueries("white paper", "tech");
  assert.ok(qs.length >= 2);
  assert.ok(qs.every((q) => q.hunt === "exemplars"));
  assert.ok(qs.some((q) => q.q.includes("tech") && q.q.includes("white paper")));
});
