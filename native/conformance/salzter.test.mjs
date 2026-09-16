// native/conformance/salzter.test.mjs — the security archon: it DETECTS the
// CWE gaps frontier models write, and does NOT false-flag the safe form.
import { test } from "node:test";
import assert from "node:assert";
import { securityFindings } from "../organs/salzter.js";

test("detects the CWE gaps models leave in ordinary code", async () => {
  const vuln = `
import sqlite3, hashlib, os, random
def get_user(name):
    cur.execute(f"SELECT * FROM users WHERE name = {name}")
def rm(p):
    os.system("rm " + p)
def pw(p):
    return hashlib.md5(p.encode()).hexdigest()
def tok():
    return random.randint(1, 9)
`;
  const r = await securityFindings(vuln, { language: "python" });
  const cwes = new Set(r.findings.map((f) => f.cwe));
  assert.ok(cwes.has("CWE-89"), "SQL injection");
  assert.ok(cwes.has("CWE-78"), "command injection");
  assert.ok(cwes.has("CWE-327"), "weak hash");
  assert.ok(cwes.has("CWE-338"), "weak randomness");
});

test("does NOT false-flag the safe form (not janky)", async () => {
  const safe = `
import hashlib, secrets
def get_user(name):
    cur.execute("SELECT * FROM users WHERE name = ?", (name,))
def pw(p):
    return hashlib.sha256(p.encode()).hexdigest()
def tok():
    return secrets.token_hex(16)
`;
  const r = await securityFindings(safe, { language: "python" });
  const cwes = new Set(r.findings.map((f) => f.cwe));
  assert.ok(!cwes.has("CWE-89"), "parameterized query is safe");
  assert.ok(!cwes.has("CWE-327"), "sha256 is not a weak hash here");
  assert.ok(!cwes.has("CWE-338"), "secrets is CSPRNG");
});

test("unparseable code is DISCLOSED, never a silent pass (a scan that cannot run says so)", async () => {
  const broken = "def f():\n\nnot_indented = 1\n";
  const r = await securityFindings(broken, { language: "python" });
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].kind, "unparseable");
});
