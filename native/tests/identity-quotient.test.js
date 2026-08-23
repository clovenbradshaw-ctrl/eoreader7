import test from "node:test";
import assert from "node:assert/strict";
import { createIdentityQuotientIndex, indexIdentityQuotientEntries, snapshotIdentityQuotient } from "../kernel/identity-quotient.js";

const occurrence = (id) => Object.freeze({ schema: "EOReferentOccurrence@1", id, standing: "unresolved_identity" });
const referent = (id, occurrenceRefs = [], supportRefs = []) => Object.freeze({ schema: "EOReferent@1", id, occurrenceRefs: Object.freeze(occurrenceRefs), supportRefs: Object.freeze(supportRefs), standing: "provisional" });

test("Entity quotient joins only warranted occurrence identity and leaves unresolved recurrence outside", () => {
  const a = occurrence("ref-occ:a");
  const b = occurrence("ref-occ:b");
  const c = occurrence("ref-occ:c");
  const victor = referent("ref:victor");
  const binding = Object.freeze({ schema: "EOPronounBinding@1", id: "pronoun-binding:b-victor", occurrence: b.id, referent: victor.id, standing: "provisional", supportRefs: Object.freeze(["w:b"]) });
  const unresolved = Object.freeze({ schema: "EOIdentityAlternative@1", id: "identity:a:c", left: "a", right: "c", standing: "live_hypothesis", supportRefs: Object.freeze(["w:similar"]) });

  const quotient = snapshotIdentityQuotient(createIdentityQuotientIndex([a, b, c, victor, binding, unresolved]));
  assert.equal(quotient.classes.length, 1);
  const cls = quotient.classes[0];
  assert.equal(cls.canonicalReferent, victor.id);
  assert.deepEqual(cls.occurrenceRefs, [b.id]);
  assert.ok(cls.supportRefs.includes(binding.id));
  assert.equal(quotient.classByNode[a.id], undefined, "unresolved recurrence must not enter the quotient");
  assert.equal(quotient.classByNode[c.id], undefined, "unresolved recurrence must not enter the quotient");
});

test("explicit discourse identity is transitive bookkeeping without becoming new witness", () => {
  const a = occurrence("ref-occ:a");
  const b = occurrence("ref-occ:b");
  const c = occurrence("ref-occ:c");
  const ab = Object.freeze({ schema: "EODiscourseIdentityLink@1", id: "discourse-link:a:b", leftOccurrence: a.id, rightOccurrence: b.id, standing: "supported" });
  const bc = Object.freeze({ schema: "EODiscourseIdentityLink@1", id: "discourse-link:b:c", leftOccurrence: b.id, rightOccurrence: c.id, standing: "supported" });
  const quotient = snapshotIdentityQuotient(createIdentityQuotientIndex([a, b, c, ab, bc]));
  assert.equal(quotient.classes.length, 1);
  assert.deepEqual(quotient.classes[0].occurrenceRefs, [a.id, b.id, c.id]);
  assert.equal(quotient.classes[0].witnessed, false);
  assert.deepEqual(quotient.classes[0].supportRefs, [ab.id, bc.id]);
});

test("removing a provisional binding recomputes the present quotient without rewriting history", () => {
  const a = occurrence("ref-occ:a");
  const victor = referent("ref:victor");
  const binding = Object.freeze({ schema: "EOPronounBinding@1", id: "pronoun-binding:a-victor", occurrence: a.id, referent: victor.id, standing: "provisional" });
  const index = createIdentityQuotientIndex([a, victor, binding]);
  assert.equal(snapshotIdentityQuotient(index).classes[0].occurrenceRefs.length, 1);

  indexIdentityQuotientEntries(index, [Object.freeze({
    schema: "EOOperation@1",
    id: "op:remove-binding",
    payload: Object.freeze({ action: "remove-provisional", id: binding.id }),
  })]);
  const after = snapshotIdentityQuotient(index);
  assert.equal(after.classes.length, 1, "the referent remains a singleton Entity class");
  assert.equal(after.classes[0].canonicalReferent, victor.id);
  assert.deepEqual(after.classes[0].occurrenceRefs, []);
  assert.equal(after.classByNode[a.id], undefined);
});

test("multiple referent ids in one warranted component are exposed as a collision, never silently canonicalized", () => {
  const a = occurrence("ref-occ:a");
  const left = referent("ref:left", [a.id], ["support:left"]);
  const right = referent("ref:right");
  const binding = Object.freeze({ schema: "EODefiniteBinding@1", id: "definite-binding:a-right", occurrence: a.id, referent: right.id, standing: "provisional" });
  const quotient = snapshotIdentityQuotient(createIdentityQuotientIndex([a, left, right, binding]));
  assert.equal(quotient.classes.length, 1);
  assert.equal(quotient.classes[0].referentCollision, true);
  assert.equal(quotient.classes[0].canonicalReferent, null);
  assert.deepEqual(quotient.classes[0].referentRefs, [left.id, right.id]);
});
