#!/usr/bin/env node
// native/eval/reach/register.mjs — keeps the numbers in docs/ALIGNMENT-FALSIFICATIONS.md equal to the committed results.
//
// The register is prose, and prose drifts. Its tables live between markers and are
// regenerated from the committed results files and raw records; a test recomputes
// them, so a number in the register that no longer matches what the code computes
// fails the suite instead of being quietly wrong.
//
//   <!-- quote: FILE -->  … <!-- /quote -->   the first table of eval/results/FILE
//   <!-- quote: FILE :: HEADING --> …           the first table after the heading line containing HEADING
//   <!-- live: PREFIX --> … <!-- /live -->    registerBlock() over eval/raw/PREFIX*.jsonl
//   <!-- sample: PREFIX :: KEY --> … <!-- /sample -->   one raw run, verbatim: the writer's answer and how it scored
//
//   node native/eval/reach/register.mjs --refresh   rewrite the blocks in place
//   node native/eval/reach/register.mjs --check     exit 1 if any block is stale

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readRecords, registerBlock } from "./battery.mjs";
import { reviseBlock } from "./revise.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(HERE, "..", "..");
export const DOC = path.join(NATIVE, "docs", "ALIGNMENT-FALSIFICATIONS.md");
const RESULTS = path.join(NATIVE, "eval", "results");
const RAW = path.join(NATIVE, "eval", "raw");

export function firstTable(md) {
  const lines = md.split("\n");
  const i = lines.findIndex((l) => l.startsWith("|"));
  if (i < 0) return "";
  let j = i;
  while (j < lines.length && lines[j].startsWith("|")) j += 1;
  return lines.slice(i, j).join("\n");
}

/** The first table after the first line that contains `heading` (a section title, or any distinctive text). */
export function tableAfter(md, heading) {
  const lines = md.split("\n");
  const i = lines.findIndex((l) => l.includes(heading));
  if (i < 0) throw new Error(`register: no line contains "${heading}"`);
  return firstTable(lines.slice(i).join("\n"));
}

export function refresh(doc) {
  let out = doc.replace(/<!-- quote: (\S+)(?: :: ([^\n]*?))? -->\n[\s\S]*?<!-- \/quote -->/g, (_m, file, heading) => {
    const f = path.join(RESULTS, file);
    if (!fs.existsSync(f)) throw new Error(`register: ${file} is quoted but does not exist in eval/results/`);
    const md = fs.readFileSync(f, "utf8");
    const table = heading ? tableAfter(md, heading) : firstTable(md);
    if (!table) throw new Error(`register: no table to quote in ${file}${heading ? ` after "${heading}"` : ""}`);
    return `<!-- quote: ${file}${heading ? ` :: ${heading}` : ""} -->\n${table}\n<!-- /quote -->`;
  });
  out = out.replace(/<!-- live: (\S+) -->\n[\s\S]*?<!-- \/live -->/g, (_m, prefix) => {
    const names = fs.existsSync(RAW) ? fs.readdirSync(RAW).filter((n) => n.startsWith(prefix) && n.endsWith(".jsonl")).sort() : [];
    if (!names.length) throw new Error(`register: no raw records start with ${prefix}`);
    const records = names.flatMap((n) => readRecords(path.join(RAW, n)));
    if (prefix.startsWith("reach-revise-")) {
      // the repair loop's table: the repair records, read against the battery records whose landings they repaired
      const slug = prefix.replace(/^reach-revise-/, "").replace(/-$/, "");
      const srcNames = fs.readdirSync(RAW).filter((n) => n.startsWith(`reach-battery-${slug}-`) && n.endsWith(".jsonl")).sort();
      if (!srcNames.length) throw new Error(`register: no battery records reach-battery-${slug}-*.jsonl for the repairs`);
      const source = srcNames.flatMap((n) => readRecords(path.join(RAW, n)));
      return `<!-- live: ${prefix} -->\n${reviseBlock({ rows: records, source, model: records[0]?.model ?? "?" }).trimEnd()}\n<!-- /live -->`;
    }
    return `<!-- live: ${prefix} -->\n${registerBlock({ records, model: records[0]?.model ?? "?" }).trimEnd()}\n<!-- /live -->`;
  });
  out = out.replace(/<!-- sample: (\S+) :: (\S+) -->\n[\s\S]*?<!-- \/sample -->/g, (_m, prefix, key) => {
    const names = fs.existsSync(RAW) ? fs.readdirSync(RAW).filter((n) => n.startsWith(prefix) && n.endsWith(".jsonl")).sort() : [];
    if (!names.length) throw new Error(`register: no raw records start with ${prefix}`);
    const records = names.flatMap((n) => readRecords(path.join(RAW, n)));
    return `<!-- sample: ${prefix} :: ${key} -->\n${sampleBlock(records, key)}\n<!-- /sample -->`;
  });
  return out;
}

/** One recorded run, rendered verbatim: what the writer answered and what executing it showed. */
export function sampleBlock(records, key) {
  const r = records.find((x) => x.key === key);
  if (!r) throw new Error(`register: no recorded run has the key ${key}`);
  const verdict = r.error ? `model error: ${r.error}` : r.success ? "success — the request is present and everything that worked still works" : r.harm ? `harm — ${r.requested ? "the request is present" : "the request is not present"}, and something that worked no longer does${r.flagged ? " (the writer flagged it)" : ""}` : r.noop ? "no-op — nothing was applied" : "changed, but the request is not satisfied";
  return `${r.arm ? `arm \`${r.arm}\`` : `condition \`${r.condition}\``}, task \`${r.task}\`, run \`${r.key}\`:\n\n\`\`\`json\n${String(r.raw).trim()}\n\`\`\`\n\n→ ${verdict}.`;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const doc = fs.readFileSync(DOC, "utf8");
  const next = refresh(doc);
  if (process.argv.includes("--refresh")) { fs.writeFileSync(DOC, next); console.log(next === doc ? "register: already current" : "register: blocks rewritten"); }
  else if (process.argv.includes("--check")) { if (next !== doc) { console.error("register: stale blocks — run --refresh"); process.exit(1); } console.log("register: current"); }
  else console.log("usage: --refresh | --check");
}
