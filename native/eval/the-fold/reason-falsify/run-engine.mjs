// Runs every item through cli/reason.mjs and scores it against its expected finding.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ITEMS, PROBES } from "./items.mjs";
const CLI = new URL("../../../../cli/reason.mjs", import.meta.url).pathname;
const rows = [];
for (const it of [...ITEMS, ...PROBES]) {
  const f = path.join(os.tmpdir(), `reason-${it.id}.json`);
  fs.writeFileSync(f, JSON.stringify(it.spec));
  let out;
  try { out = JSON.parse(execFileSync("node", [CLI, f, "--json"], { encoding: "utf8" })); }
  catch (e) { out = JSON.parse(e.stdout); }
  const kinds = out.findings.map((x) => x.kind);
  const verdict = out.ok ? "sound" : "error";
  const caught = it.expect === "none" ? out.ok : kinds.includes(it.expect);
  rows.push({ id: it.id, source: it.source, truth: it.truth, verdict, expect: it.expect, kinds, pass: caught && verdict === it.truth, detail: out.findings.find((x) => x.kind === it.expect)?.detail ?? null });
}
fs.writeFileSync(new URL("./engine-results.json", import.meta.url), JSON.stringify(rows, null, 1));
for (const r of rows) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.id.padEnd(3)} ${r.source.padEnd(20)} truth=${r.truth.padEnd(5)} engine=${r.verdict.padEnd(5)} found=[${r.kinds.join(",")}]`);
console.log(`\n${rows.filter((r) => r.pass).length}/${rows.length} correct`);
