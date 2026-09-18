import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProposal } from "./code-loop.js";

// First pins on the loop's proposal grammar (previously entirely
// untested): a narrow declared shape in, a typed action out — never a
// guess at what was meant. runCodeLoop itself needs a live mouth and
// stays driver-tested, not unit-tested.

test("parseProposal: read action with a real path shape", () => {
  const r = parseProposal("ACTION: read\nPATH: src/app.py\n");
  assert.deepEqual(r, { ok: true, action: "read", path: "src/app.py" });
});

test("parseProposal: patch with ACTION line", () => {
  const r = parseProposal("ACTION: patch\nPATH: app.py\n<<<FIND>>>\ndef main():\n<<<ADD>>>\ndef main():\n    run()\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.action, "patch");
  assert.equal(r.path, "app.py");
  assert.equal(r.find, "def main():");
  assert.equal(r.add, "def main():\n    run()");
});

test("parseProposal: patch without ACTION line (backward compatible)", () => {
  const r = parseProposal("PATH: k.js\n<<<FIND>>>\nfoo()\n<<<ADD>>>\nbar()\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.action, "patch");
});

test("parseProposal: empty ADD is a delete (trailing newline trimmed)", () => {
  const r = parseProposal("PATH: x.py\n<<<FIND>>>\nold_line\n<<<ADD>>>\n\n<<<END>>>");
  assert.equal(r.ok, true);
  assert.equal(r.add, "");
});

test("parseProposal: prose with no block is a typed gap, never a guess", () => {
  const r = parseProposal("I think you should rewrite the whole file, it looks wrong.");
  assert.equal(r.ok, false);
  assert.equal(r.gap.kind, "unparsed_proposal");
});
