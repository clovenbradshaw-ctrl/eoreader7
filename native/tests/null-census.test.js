import test from "node:test";
import assert from "node:assert/strict";
import { runNullCensus } from "../eval/the-fold/lib/null-census.mjs";

const { numbers: n } = await runNullCensus({ seeds: 8 });

test("a stated draft binds at exactly the cursor its passage arrives, and reads `unheard` — a vocabulary null — until then", () => {
  for (const k of ["founded", "opened", "repaired"]) assert.equal(n.forward.closing[k], n.forward.statedCursor[k], k);
  assert.deepEqual(n.forward.transitions.opened, ["unheard@1", "bound@3"]);
  assert.deepEqual(n.forward.transitions.repaired, ["unheard@1", "bound@4"]);
});

test("the never-stated drafts keep their typed null at the end of the read: a fabrication `unbound`, an unused verb `unheard`, the derived-only sentence `unbound` at the reader while derived on the record", () => {
  assert.equal(n.forward.census.unread, 0);
  assert.equal(n.forward.census.verdicts.bakery, "unbound");
  assert.equal(n.forward.census.verdicts.comets, "unheard");
  assert.equal(n.forward.census.verdicts.derivedOnly, "unbound");
  assert.equal(n.forward.census.derived, 1);
  assert.deepEqual(n.forward.transitions.derivedOnly, ["unheard@1", "unbound@2"], "its verb arrives at 2, its truth never arrives at the reader");
  assert.equal(n.forward.derivedAt, 5, "the derived fact exists from the cursor its second premise lands");
});

test("the cut and its contest land at one cursor — the cursor the denial meets its link", () => {
  assert.equal(n.forward.cutAt, 6);
  assert.equal(n.forward.contestAt, 6);
  assert.equal(n.forward.census.contests, 1);
});

test("controls: a truncated read is a reader fact (unread > 0, later drafts still unheard, no contest, nothing derived); shuffling moves every cursor and no census", () => {
  assert.equal(n.truncated.unread, 5);
  assert.equal(n.truncated.verdicts.founded, "bound");
  assert.equal(n.truncated.verdicts.opened, "unheard");
  assert.equal(n.truncated.contests, 0);
  assert.equal(n.truncated.derived, 0);
  assert.equal(n.shuffles.distinctCensus, 1);
  assert.ok(n.shuffles.closingSpread.opened > 1 && n.shuffles.closingSpread.repaired > 1);
  assert.ok(n.shuffles.contestSpread > 1);
});
