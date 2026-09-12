import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, "..", "eval", "lavar", "golden-to-ledger.mjs");
const LP = path.join(HERE, "..", "..", "..", "live_priors");
const GOLDEN = path.join(LP, "goldens", "reading", "udhr-arb.golden.json");
const SOURCE = path.join(LP, "06-government-legal", "un-udhr", "udhr-arb.txt");

test("golden-to-ledger: every emitted address independently re-slices to the golden's own relation word — real UTF-8 bytes, not trusted from the golden's own char-space claim", { skip: !fs.existsSync(GOLDEN) || !fs.existsSync(SOURCE) ? "sibling live_priors checkout with this golden not present" : false }, () => {
  const out = path.join("/tmp", `golden-to-ledger-test-${Date.now()}.eot.jsonl`);
  execFileSync("node", [SCRIPT, GOLDEN, SOURCE, out], { encoding: "utf8" });
  const lines = fs.readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const header = lines.find((l) => l.schema === "EOTSource@1");
  assert.ok(header, "header line present");
  const raw = fs.readFileSync(SOURCE);
  const props = lines.filter((l) => l.schema === "EOTObservation@1" && l.role === "proposition");
  assert.ok(props.length > 100, "a real, non-trivial number of propositions converted");
  for (const p of props) {
    const [start, end] = p.at;
    const slice = raw.subarray(start, end).toString("utf8").replace(/\s+/g, " ").trim();
    const relHead = String(p.label).replace(/\s+/g, " ").trim().split(" ").pop();
    assert.ok(slice.includes(relHead), `address ${JSON.stringify(p.at)} for "${p.label}" resolves to real bytes containing the relation`);
  }
  fs.unlinkSync(out);
});

test("golden-to-ledger: every proposition carries the golden's own language-independent prop id, for cross-language joining", { skip: !fs.existsSync(GOLDEN) || !fs.existsSync(SOURCE) ? "sibling live_priors checkout not present" : false }, () => {
  const out = path.join("/tmp", `golden-to-ledger-test2-${Date.now()}.eot.jsonl`);
  execFileSync("node", [SCRIPT, GOLDEN, SOURCE, out], { encoding: "utf8" });
  const lines = fs.readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const props = lines.filter((l) => l.schema === "EOTObservation@1");
  assert.ok(props.every((p) => typeof p.prop === "string" && p.prop.startsWith("udhr:")));
  fs.unlinkSync(out);
});
