// native/conformance/blindspot.test.mjs — the whole-view archon (Popper): it
// detects the properties a single window cannot hold, and not the safe forms.
import { test } from "node:test";
import assert from "node:assert";
import { blindspotFindings } from "../organs/blindspot.js";

test("detects unfalsifiable tests, timing compares, and leaks", async () => {
  const code = `
def test_login():
    login("a", "b")

def test_sanity():
    assert True

def read(p):
    f = open(p)
    return f.read()

def check(password, stored):
    return password == stored
`;
  const r = await blindspotFindings(code, { language: "python" });
  const kinds = new Set(r.findings.map((f) => f.kind));
  assert.ok(kinds.has("unfalsifiable_test"), "a test with no assertion");
  assert.ok(kinds.has("unfalsifiable_assert"), "assert True");
  assert.ok(kinds.has("resource_leak"), "open() without with");
  assert.ok(kinds.has("timing_unsafe_compare"), "secret compared with ==");
});

test("detects a cross-function taint path, and NOT the safe parameterized form", async () => {
  const code = `
from flask import request
def build_query(name):
    return f"SELECT * FROM users WHERE name = {name}"
def handler():
    name = request.args.get("name")
    q = build_query(name)
    cur.execute(q)
def safe():
    name = request.args.get("name")
    cur.execute("SELECT * FROM users WHERE name = ?", (name,))
`;
  const r = await blindspotFindings(code, { language: "python" });
  const paths = r.findings.filter((f) => f.kind === "taint_path");
  assert.equal(paths.length, 1, "exactly one taint path, in the vulnerable handler");
  assert.equal(paths[0].line, 8);
});

test("unparseable code is DISCLOSED (once), never a silent pass", async () => {
  const broken = "def f():\n\nnot_indented = 1\n";
  const r = await blindspotFindings(broken, { language: "python" });
  const unparseable = r.findings.filter((f) => f.kind === "unparseable");
  assert.equal(unparseable.length, 1);
});
