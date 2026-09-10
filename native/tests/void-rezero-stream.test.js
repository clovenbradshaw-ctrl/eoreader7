import test from "node:test";
import assert from "node:assert/strict";
import { FoldUnavailableError } from "../eval/the-fold/lib/fold-sibling.mjs";
import { runVoidRezeroStream } from "../eval/the-fold/lib/void-rezero-stream.mjs";

// A DRIVER REFUSES WHAT ITS CHECKOUT LACKS (READING-SPEC S65 / the-fold
// P95): this driver reaches into a sibling the-fold checkout via
// product-assay.mjs::organs. Caught once, here, so every test below is a
// real, reported skip rather than the whole file crashing at import.
let run = null, SKIP;
try {
  run = await runVoidRezeroStream({ seeds: 12 });
} catch (err) {
  if (!(err instanceof FoldUnavailableError)) throw err;
  SKIP = err.message;
}
const n = run?.numbers;


test("a void fills at the first passage stating its arrangement; the never-stated void stays open with the search reached", { skip: SKIP }, () => {
  assert.equal(n.forward.fills["opened-any"], 3);
  assert.equal(n.forward.fills["opened-1889"], 3);
  assert.equal(n.forward.fills["repaired-any"], 4);
  assert.equal(n.forward.fills["closed-never"], undefined);
  assert.deepEqual(n.forward.open["closed-never"], { reached: true, read: 7, total: 7 });
  assert.deepEqual(n.forward.timelines["closed-never"], ["declared", "redeclared"], "the reached-the-end declaration is its own event");
  assert.deepEqual(n.forward.timelines["opened-any"], ["declared", "filled"]);
});

test("a denial never fills a void: with the cut first, the exact void fills only when the link arrives", { skip: SKIP }, () => {
  assert.equal(n.denialFirst.cutAt, 1);
  assert.ok(n.denialFirst.opened1889 > 1, `filled at ${n.denialFirst.opened1889}, after the cut`);
  assert.deepEqual(n.forward.cuts, [6]);
});

test("fill cursors depend on order; the final open set does not (prefix invariance at the void)", { skip: SKIP }, () => {
  assert.equal(n.shuffles.openSetsDistinct, 1);
  assert.equal(n.shuffles.openSet, "closed-never");
  assert.ok(n.shuffles.cursorSpread["opened-any"] > 1, "the cursor moved with the order");
  assert.equal(n.shuffles.cursorSpread["closed-never"], 1, "open in every order");
});

test("controls built to fail: truncation turns a finding into a reader fact; the deranged corpus fills a different set", { skip: SKIP }, () => {
  assert.equal(n.truncated["closed-never"], false);
  assert.equal(n.truncated["repaired-any"], false, "unfilled because unread, and said so");
  assert.equal(n.deranged.differs, true, `real {${n.deranged.real}} vs deranged {${n.deranged.deranged}}`);
});
