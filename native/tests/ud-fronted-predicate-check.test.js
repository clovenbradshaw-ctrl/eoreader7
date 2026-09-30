// native/tests/ud-fronted-predicate-check.test.js — wires the FIXTURES
// array from eval/lavar/ud-fronted-predicate-check.mjs into `npm test`
// (tests/*.test.js is in the default glob), so the fronted-predicate/
// fronted-participle UD gold-parse check runs on every test pass instead
// of depending on a subagent or human running it by hand. See
// CODING-LESSONS.md #76.
import test from "node:test";
import assert from "node:assert/strict";
import { checkGoldParse, FIXTURES } from "../eval/lavar/ud-fronted-predicate-check.mjs";

for (const f of FIXTURES) {
  test(f.name, () => {
    const { ok, findings } = checkGoldParse(f.tokens);
    assert.equal(ok, f.expectOk, `expected ok=${f.expectOk}, findings: ${JSON.stringify(findings)}`);
    const hasWarn = findings.some((x) => x.level === "warning");
    assert.equal(hasWarn, f.expectWarn, `expected a warning=${f.expectWarn}, findings: ${JSON.stringify(findings)}`);
  });
}
