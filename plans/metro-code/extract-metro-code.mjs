// extract-metro-code.mjs — responsibilities of every department -> EOT ledger.
//
// Uses the eoreader7 deterministic plans extractor organ
// (native/organs/plans/extract.mjs) for byte-anchored row emission, then applies a
// deterministic responsibility classifier (duty-verb + section-title evidence) that
// upgrades rows to kind "responsibility". Same ledger schema as the OHS plans surface
// (PlanLedgerObservation@1). No model in the loop. Same ground in, same ledger out.

import fs from "node:fs";
import { extractPlanRows } from "/Users/mlacy/Documents/3.0/eoreader7/native/organs/plans/extract.mjs";

const ROOT = new URL("./", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL("./manifest.json", import.meta.url), "utf8"));

const DUTY_VERBS = new Set([
  "administer", "appoint", "approve", "audit", "coordinate", "develop", "direct",
  "enforce", "establish", "ensure", "inspect", "investigate", "license", "maintain",
  "manage", "operate", "oversee", "perform", "prepare", "prescribe", "provide",
  "regulate", "require", "respond", "review", "supervise", "superintend", "recommend",
  "report", "submit", "adopt", "implement", "conduct", "examine", "certify", "collect",
  "promulgate", "employ", "manage", "fund", "monitor", "evaluate", "promote",
  "protect", "preserve", "plan", "design", "construct", "maintain", "repair",
  "control", "operate", "administer", "superintend",
  "shall have the power", "shall have authority", "shall be the duty", "shall be responsible",
  "duties of", "powers and duties", "functions of", "responsibility of",
]);

const HEADING_SECTION_RE = /(duties|powers|functions|responsibility|creation|created|established|establish|authority|personnel|director|appointment|operations)/i;

function canonicalNames(heading) {
  // "CHAPTER 2.44 - POLICE DEPARTMENT" -> ["police department", "department of police", "police"]
  const raw = heading.replace(/^CHAPTER\s+\d+\.\d+\s*-\s*/i, "").replace(/^[A-Z]+\.?\s*\d*\s*\.\s*/i, "");
  const words = raw.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const joined = words.join(" ");
  const names = new Set([joined]);
  // department of X / X department forms
  if (joined.startsWith("department of ")) {
    const rest = joined.replace(/^department of /, "");
    names.add(rest + " department");
    names.add(rest);
  } else if (joined.endsWith(" department")) {
    const rest = joined.replace(/ department$/, "");
    names.add("department of " + rest);
  }
  // city of nashville / metro aliases
  names.add("metropolitan government");
  names.add("metro");
  return [...names];
}

let seq = 0;
const rows = [];
for (const ch of manifest.chapters) {
  const txtPath = new URL(`./ground/${ch.slug}.txt`, import.meta.url);
  const text = fs.readFileSync(txtPath, "utf8");
  const heading = ch.title;
  const dept = heading.replace(/^CHAPTER\s+\d+(\.\d+)?\s*-\s*/i, "").trim();
  const vocab = { agencies: canonicalNames(heading), places: [], quantities: [], goals: [] };
  const organRows = extractPlanRows({ text, doc: ch.slug, mode: "layout", vocab });

  // Responsibility classifier: upgrade rows whose section or text shows duty evidence.
  for (const r of organRows) {
    const section = r.fields?.section ?? "";
    const v = r.verbatim.toLowerCase();
    const dutyHit = [...DUTY_VERBS].some((w) => v.includes(w));
    const sectionHit = HEADING_SECTION_RE.test(section) || section === "";
    if (!dutyHit && !sectionHit) continue;
    seq += 1;
    rows.push({
      schema: "PlanLedgerObservation@1",
      id: `metro:dept:${ch.slug}:row:${String(seq).padStart(4, "0")}`,
      doc: `metro-code/ground/${ch.slug}.txt`,
      at: r.at,
      verbatim: r.verbatim,
      kind: "responsibility",
      fields: {
        department: dept,
        chapter: ch.slug,
        chapterHeading: heading,
        section: section || null,
        basis: `deterministic extractor + duty classifier (${r.basis})`,
      },
      supersedes: null,
      giver: null,
    });
  }
}

const ledgerPath = new URL("./ledger/metro-code-departments.jsonl", import.meta.url);
fs.writeFileSync(ledgerPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");

const byDept = {};
for (const r of rows) byDept[r.fields.department] = (byDept[r.fields.department] ?? 0) + 1;
const summary = {
  schema: "MetroCodeLedgerSummary@1",
  total: rows.length,
  perDepartment: byDept,
  builtAt: new Date().toISOString(),
};
fs.writeFileSync(new URL("./ledger/summary.json", import.meta.url), JSON.stringify(summary, null, 2));
console.log("rows:", rows.length);
for (const [d, n] of Object.entries(byDept).sort((a, b) => b[1] - a[1])) console.log(`  ${n.toString().padStart(4)}  ${d}`);