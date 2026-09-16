// native/conformance/martial.test.mjs — the anti-copy archon: distinctive
// copies are findings, boilerplate is replication, and provenance is recorded.
import { test } from "node:test";
import assert from "node:assert";
import { copyFindings, replicationNotes, provenanceFor, annotateWithSources } from "../organs/martial.js";

const DISTINCTIVE = "def quicksort_engine(a):\n    if len(a) <= 1: return a\n    p = a[len(a)//2]\n    return quicksort_engine([x for x in a if x < p]) + [x for x in a if x == p] + quicksort_engine([x for x in a if x > p])\n";

test("a distinctive copied holon is a finding", () => {
  const r = copyFindings(DISTINCTIVE, { sources: [DISTINCTIVE] });
  assert.ok(r.findings.length > 0);
  assert.ok(r.findings.some((f) => f.similarity >= 0.9));
});

test("boilerplate composed of generic names is replication, not copying (low sets possibility for high)", () => {
  const boiler = "def main():\n    return run()\n\ndef run():\n    return 0\n";
  const r = copyFindings(boiler, { sources: [boiler] });
  assert.equal(r.findings.length, 0);
});

test("generic shapes are noted as replicable", () => {
  const n = replicationNotes("def main():\n    pass\n");
  assert.ok(n.notes.some((x) => x.name === "main"));
});

test("line-level provenance names what a holon drew on", () => {
  const source = "def parse_config(path):\n    with open(path) as f:\n        d = f.read()\n    out = {}\n    for line in d.splitlines():\n        k, v = line.split(\"=\")\n        out[k.strip()] = v.strip()\n    return out\n";
  const code = "# a tool\n" + source.replace("parse_config", "load_settings");
  const prov = provenanceFor(code, { sources: [{ text: source, name: "cfg.py", license: "MIT" }], fileName: "g.py" });
  assert.ok(prov.length > 0);
  const annotated = annotateWithSources(code, { provenance: prov, language: "python" });
  assert.ok(annotated.includes("in the style of cfg.py (MIT)"));
});
