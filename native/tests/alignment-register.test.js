// native/tests/alignment-register.test.js — the falsification register cannot drift from its evidence.
//
// docs/ALIGNMENT-FALSIFICATIONS.md quotes tables from the committed results and raw
// records. Every quoted block is regenerated here and compared byte for byte, so a
// number in the register that the code no longer computes fails the suite.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { refresh, firstTable, tableAfter, DOC } from "../eval/reach/register.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("every table quoted in the register is exactly what the committed results and raw records produce", () => {
  assert.ok(fs.existsSync(DOC), "docs/ALIGNMENT-FALSIFICATIONS.md exists");
  const doc = fs.readFileSync(DOC, "utf8");
  const rawDir = process.env.ER7_RAW_DIR ?? path.join(REPO, "native", "eval", "raw"); // ER7_RAW_DIR: a test hook, to see the register as a checkout without the raw records sees it
  const haveRaw = fs.existsSync(rawDir) && fs.readdirSync(rawDir).some((n) => n.startsWith("reach-battery-") && n.endsWith(".jsonl"));
  // Until the live raw records are committed, only the model-free quotes can be checked; the live and sample blocks are checked as soon as they can be.
  const strip = (d) => d.replace(/<!-- live: [\s\S]*?<!-- \/live -->\n?/g, "").replace(/<!-- sample: [\s\S]*?<!-- \/sample -->\n?/g, "");
  const subject = haveRaw ? doc : strip(doc);
  assert.equal(refresh(subject), subject, "stale blocks: run node native/eval/reach/register.mjs --refresh");
  assert.ok((doc.match(/<!-- quote: /g) ?? []).length >= 3, "the model-free tables are quoted");
  if (haveRaw) assert.ok((doc.match(/<!-- live: /g) ?? []).length >= 1, "the live table is quoted");
});

test("the register states its scope and does not claim what it did not measure", () => {
  const doc = fs.readFileSync(DOC, "utf8");
  assert.match(doc, /Scope, so it is not read wider/);
  assert.match(doc, /What none of this shows/);
  assert.doesNotMatch(doc, /\bwe have proven\b|\bproves that\b|\bunavoidable by construction\b/i, "no proof language for measurements this small");
});

test("firstTable takes exactly the first contiguous table", () => {
  const md = "intro\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\ntext\n\n| c |\n|---|\n| 3 |\n";
  assert.equal(firstTable(md), "| a | b |\n|---|---|\n| 1 | 2 |");
  assert.equal(firstTable("no table here"), "");
  assert.equal(tableAfter(md, "text"), "| c |\n|---|\n| 3 |", "the first table after a heading line");
  assert.throws(() => tableAfter(md, "absent heading"), /no line contains/);
});

test("every command the register tells a reader to run exists: the script is there and implements the flag", () => {
  const doc = fs.readFileSync(DOC, "utf8");
  const block = /## Reproducing\n\n```\n([\s\S]*?)\n```/.exec(doc)?.[1];
  assert.ok(block, "the register has a Reproducing block");
  let checked = 0;
  for (const line of block.split("\n").map((l) => l.replace(/#.*$/, "").trim()).filter(Boolean)) {
    const scripts = [...line.matchAll(/native\/[\w./*-]+\.(?:mjs|js)/g)].map((m) => m[0]);
    assert.ok(scripts.length, `no script named in: ${line}`);
    for (const s of scripts) {
      if (s.includes("*")) continue; // a glob of raw records: covered by the live-block test
      const f = path.join(REPO, s);
      assert.ok(fs.existsSync(f), `${s} exists`);
      const src = fs.readFileSync(f, "utf8");
      if (!line.startsWith("node --test")) for (const flag of line.match(/--[a-z-]+/g) ?? []) { assert.ok(src.includes(`"${flag}"`) || src.includes(flag), `${s} implements ${flag}`); checked += 1; }
    }
  }
  assert.ok(checked >= 5, `flags were actually checked (${checked})`);
});

test("the register's central illustration is true of the raw records: the same answer, opposite outcomes", (t) => {
  const dir = process.env.ER7_RAW_DIR ?? path.join(REPO, "native", "eval", "raw");
  const names = fs.existsSync(dir) ? fs.readdirSync(dir).filter((n) => n.startsWith("reach-battery-gemma2-2b-") && n.endsWith(".jsonl")) : [];
  if (!names.length) return t.skip("no raw records committed");
  const recs = names.flatMap((n) => fs.readFileSync(path.join(dir, n), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));
  const bare = recs.find((r) => r.key === "term-a|bare|0");
  const reach = recs.find((r) => r.key === "term-a|reach|1");
  assert.ok(bare && reach, "both illustrative runs are in the raw records");
  assert.deepEqual(bare.parsed.edits, reach.parsed.edits, "the writer's edits are identical");
  assert.equal(bare.harm, true, "shown only the region, the edit leaves the other three clauses saying Supplier");
  assert.equal(reach.success, true, "shown the derived clauses, the same edit renames them all");
});
