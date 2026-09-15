// latent-lean.test.js — the latent-lean hook. reading.js's step() accepts an
// OPTIONAL `adapters.latent`, `{ use(acts), bias() }`. When present, `use()`
// is handed this step's own operations (the authored delta's) after the
// delta is computed, and `bias()`'s return rides the TURN as `latentLean` —
// never folded into `fold` itself (orientation.js's own rule, Handle:
// Meerkat: "a raised stance that conditions the group's attention and is
// never itself evidence of what it's watching for"). Absent adapters.latent,
// `turn.latentLean` is simply not a key — full backward compatibility.
//
// The kernel stays self-contained: it never imports eo-teachings/archon-
// activation.mjs (outside this repo) or any concept of "archon" — this test
// stands in a fake `{ use, bias }` for it.
import test from "node:test";
import assert from "node:assert/strict";
import { createRecursiveReader } from "../kernel/reading.js";
import { eoOperation, deltaFold } from "../kernel/fold.js";

const op = eoOperation({ op: "SIG", grain: "Figure", witness: "w", payload: { action: "expectation", value: { id: "exp:1", schema: "EOExpectation@1" } } });

function readerWith(adapters) {
  return createRecursiveReader({
    adapters: {
      perceive: async () => [],
      revise: async () => deltaFold([op], { id: "delta:0" }),
      ...adapters,
    },
  });
}

test("a fake adapters.latent stub receives the step's own operations via use()", async () => {
  const received = [];
  const latent = {
    use: async (acts) => { received.push(acts); },
    bias: async () => ({ schema: "EOLatentLean@1", leaning: [{ archon: "mozi", share: 0.4 }], cold: false }),
  };
  const reader = readerWith({ latent });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0 });

  assert.equal(received.length, 1, "use() was called exactly once for this step");
  assert.deepEqual(received[0], [op], "handed exactly this step's own operations, from the authored delta");
  assert.deepEqual(received[0], turn.deltaFold.operations.slice());
});

test("turn.latentLean reflects bias()'s return, verbatim", async () => {
  const lean = Object.freeze({ schema: "EOLatentLean@1", leaning: Object.freeze([{ archon: "nagarjuna", share: 0.6 }]), cold: false });
  const latent = { use: async () => {}, bias: async () => lean };
  const reader = readerWith({ latent });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0 });
  assert.equal(turn.latentLean, lean);
});

test("a cold latent psychology (nothing warm) still surfaces its own honest verdict", async () => {
  const cold = Object.freeze({ schema: "EOLatentLean@1", leaning: Object.freeze([]), cold: true });
  const latent = { use: async () => {}, bias: async () => cold };
  const reader = readerWith({ latent });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0 });
  assert.deepEqual(turn.latentLean, cold);
});

test("a synchronous (non-async) adapters.latent works too — use()/bias() need not return promises", async () => {
  let usedWith = null;
  const latent = {
    use: (acts) => { usedWith = acts; },
    bias: () => ({ schema: "EOLatentLean@1", leaning: [], cold: true }),
  };
  const reader = readerWith({ latent });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0 });
  assert.ok(Array.isArray(usedWith));
  assert.equal(turn.latentLean.schema, "EOLatentLean@1");
});

test("with no adapters.latent, turn.latentLean is simply absent — existing tests are unaffected", async () => {
  const reader = readerWith({});
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0 });
  assert.equal("latentLean" in turn, false);
  // The rest of the turn is exactly as it always was.
  assert.equal(turn.deltaFold.operations.length, 1);
  assert.equal(turn.fold.schema, "EOFold@1");
});

test("a lean is never folded into `fold` itself — only the turn carries it", async () => {
  const latent = { use: async () => {}, bias: async () => ({ schema: "EOLatentLean@1", leaning: [{ archon: "mahavira", share: 1 }], cold: false }) };
  const reader = readerWith({ latent });
  const turn = await reader.step({ source: "fixture", modality: "text", sequencePosition: 0 });
  assert.equal("latentLean" in turn.fold, false);
  assert.equal(JSON.stringify(turn.fold).includes("mahavira"), false);
});
