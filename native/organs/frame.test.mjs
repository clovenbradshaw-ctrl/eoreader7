// frame.test.mjs — DEF·Ground's walls, and the depth-axis verdict.
// The decisive case runs the REAL relation reader under BOTH real engine
// providers as two declared frames over one material — the exact live
// specimen (54/58 vs 52/58, invisible until declared) the cell was built
// against. If the pre-registered sibling-derived design passes these
// unmodified, §VIII.2 earns its point.
import test from "node:test";
import assert from "node:assert/strict";
import { declareFrame, framed, comparable, REFUSALS } from "./frame.js";
import { makeRelationReader } from "./hypergraph.js";

test("the declaration gate: nothing defaulted, refusals name exactly what is missing (the NUL·Ground sibling's grammar)", async () => {
  const whole = await declareFrame({
    organs: { provider: "native/adapters/text" },
    givers: { determiners: "UD_English-EWT via priors.js (lang/en)" },
    numbers: { minShare: 0.5 },
  });
  assert.ok(whole.frame, JSON.stringify(whole));
  assert.match(whole.frame.id, /^frame:[0-9a-f]{16}$/);

  const missingSection = await declareFrame({ organs: { provider: "x" }, numbers: {} });
  assert.equal(missingSection.refused, "undeclared_frame");
  assert.ok(missingSection.what.some((w) => /givers.*section absent/.test(w)), "an absent section is named, not skipped");

  const unvalued = await declareFrame({ organs: { provider: "" }, givers: {}, numbers: { alpha: NaN } });
  assert.equal(unvalued.refused, "undeclared_frame");
  assert.deepEqual(unvalued.what.sort(), ["numbers.alpha", "organs.provider"], "every missing piece, by name");

  // declaring EMPTY is a statement, not an omission — allowed
  const empty = await declareFrame({ organs: {}, givers: {}, numbers: {} });
  assert.ok(empty.frame, "an explicitly empty ground is a declared ground");
});

test("the id is content-addressed: same declaration, same frame; any component moved, different frame", async () => {
  const a = await declareFrame({ organs: { p: "legacy" }, givers: {}, numbers: { n: 1 } });
  const b = await declareFrame({ numbers: { n: 1 }, givers: {}, organs: { p: "legacy" } }); // order must not matter
  const c = await declareFrame({ organs: { p: "native" }, givers: {}, numbers: { n: 1 } });
  assert.equal(a.frame.id, b.frame.id, "canonicalized — declaration order is not identity");
  assert.notEqual(a.frame.id, c.frame.id);
});

test("THE WALL: cross-frame verdicts refuse comparison, NAMING the components that differ; unframed verdicts join nothing", async () => {
  const legacy = (await declareFrame({ organs: { provider: "legacy-eoreader6.1" }, givers: {}, numbers: {} })).frame;
  const native = (await declareFrame({ organs: { provider: "native" }, givers: {}, numbers: {} })).frame;
  const va = framed({ verdict: "bound", passing: 54 }, legacy);
  const vb = framed({ verdict: "bound", passing: 52 }, native);

  const same = comparable(va, framed({ verdict: "unbound" }, legacy));
  assert.equal(same.comparable, true);

  const cross = comparable(va, vb, { frames: { [legacy.id]: legacy, [native.id]: native } });
  assert.equal(cross.comparable, false);
  assert.equal(cross.refused, "cross_frame");
  assert.deepEqual(cross.differs, [{ at: "organs.provider", a: "legacy-eoreader6.1", b: "native" }],
    "the refusal carries WHICH ground differs — 54 vs 52 is about the frames, not the material");

  assert.equal(comparable({ verdict: "bound" }, va).refused, "unframed");
});

test("THE LIVE SPECIMEN, end to end: the two REAL engine providers as two declared frames over one material", async () => {
  const material = [{ ref: "wp.txt#0-300", text: "Abraham Lincoln appointed Hannibal Hamlin. Abraham Lincoln appointed Andrew Johnson. Hannibal Hamlin visited Abraham Lincoln." }];
  const load = async (root) => {
    const sp = await import(root + "spans.js"), su = await import(root + "surfaces.js");
    const rl = await import(root + "relations.js"), mt = await import(root + "material.js");
    return {
      splitSentences: sp.splitSentences, extractSurfaces: su.extractSurfaces,
      discoverReferents: su.discoverReferents, namesCorefer: su.namesCorefer, diaNorm: su.diaNorm,
      discoverRelationVocab: rl.discoverRelationVocab, extractRelations: rl.extractRelations,
      tokenize: mt.tokenize, buildFrequencyTable: mt.buildFrequencyTable, functionWordSet: mt.functionWordSet,
    };
  };
  const PROVIDERS = {
    legacy: "../eoreader7/legacy-eoreader6.1/packages/engine/perceiver/text/",
    native: "../eoreader7/native/adapters/text/",
  };
  const verdicts = {}, frames = {};
  for (const [tag, root] of Object.entries(PROVIDERS)) {
    const { frame } = await declareFrame({ organs: { provider: tag, root }, givers: {}, numbers: {} });
    frames[frame.id] = frame;
    const reader = makeRelationReader(await load(root))(material, { pool: material });
    const claim = reader.read("Abraham Lincoln appointed Hannibal Hamlin.").claims[0];
    assert.ok(claim, `${tag} must produce a claim`);
    verdicts[tag] = framed(claim, frame);
  }
  // both real verdicts carry their real frames, and the wall behaves:
  const cross = comparable(verdicts.legacy, verdicts.native, { frames });
  assert.equal(cross.comparable, false, "the two providers are two interpretive grounds — never silently compared");
  assert.ok(cross.differs.some((d) => d.at === "organs.provider"), JSON.stringify(cross.differs));
  const withinFrame = comparable(verdicts.native, framed({ verdict: "anything" }, frames[verdicts.native.frame]), { frames });
  assert.equal(withinFrame.comparable, true, "and within one declared ground, comparison proceeds");
});
