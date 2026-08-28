// Every governing law in READING-SPEC.md names a giver.
//
// The apparatus refuses a gift whose giver cannot be named — and until
// 2026-08-28 its own governing laws carried unnamed ones. This makes the rule
// enforceable against the SPEC's class of law, not only against runtime priors.
//
// A law satisfies the rule one of two ways:
//   giver: earned-here — <commit>      (measured in this repo; the commit is the receipt)
//   giver: <name/work>  ... PRIOR-ART-INVENTORY.md   (received; the inventory carries the row)
//
// It also reports two structural findings the count alone would hide: a law
// number used twice, and a giver line naming a commit git does not have.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const SPEC = path.join(ROOT, "READING-SPEC.md");
const INVENTORY = path.join(ROOT, "PRIOR-ART-INVENTORY.md");

const spec = fs.readFileSync(SPEC, "utf8").split("\n");
const inventory = fs.readFileSync(INVENTORY, "utf8");

const laws = [];
for (let i = 0; i < spec.length; i += 1) {
  const m = /^## (S\d+) — (.+)$/.exec(spec[i]);
  if (!m) continue;
  // the window MUST stop at the next heading. A fixed 11-line slice reaches
  // into the following law and finds ITS giver, so a deleted giver reads as
  // present — the check silently passing on the defect it exists to catch.
  let end = i + 1;
  while (end < spec.length && !/^## /.test(spec[end])) end += 1;
  const window = spec.slice(i + 1, end).join("\n");
  const giver = /^\s*> \*\*giver:\*\*\s*(.+)$/m.exec(window);
  laws.push({ id: m[1], title: m[2], line: i + 1, giver: giver ? giver[1].trim() : null });
}

const commitExists = (sha) => {
  try { execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: ROOT, stdio: "ignore" }); return true; }
  catch { return false; }
};

const findings = [];
for (const law of laws) {
  if (!law.giver) { findings.push({ law: law.id, kind: "no_giver", detail: "no `> **giver:**` line within 12 lines of the heading" }); continue; }
  const earned = /^earned-here\s+—\s+(\S+)/.exec(law.giver);
  if (earned) {
    if (earned[1] !== "unknown" && !commitExists(earned[1])) {
      findings.push({ law: law.id, kind: "commit_missing", detail: `names ${earned[1]}, which this repo does not have` });
    }
    continue;
  }
  // received: the inventory must carry it. Match on the giver's own surname/first token.
  const token = (law.giver.match(/[A-Z][a-zA-Z]+/) ?? [])[0];
  if (!token || !inventory.includes(token)) {
    findings.push({ law: law.id, kind: "not_in_inventory", detail: `received giver "${law.giver.slice(0, 60)}…" has no row in PRIOR-ART-INVENTORY.md` });
  }
}

// a law number used twice is a citation hazard: an external reference to it
// cannot say which law it meant.
const seen = new Map();
for (const law of laws) {
  if (seen.has(law.id)) findings.push({ law: law.id, kind: "duplicate_number", detail: `also used at line ${seen.get(law.id)}; an external citation of ${law.id} is ambiguous` });
  else seen.set(law.id, law.line);
}

const out = {
  schema: "EOPriorArtCited@1",
  laws: laws.length,
  withGiver: laws.filter((l) => l.giver).length,
  earnedHere: laws.filter((l) => /^earned-here/.test(l.giver ?? "")).length,
  received: laws.filter((l) => l.giver && !/^earned-here/.test(l.giver)).length,
  findings,
};
console.log(JSON.stringify(out, null, 1));
if (findings.some((f) => f.kind !== "duplicate_number")) {
  console.error(`\nFAIL: ${findings.length} finding(s) — a governing law without a resolvable giver`);
  process.exit(1);
}
if (findings.length) console.error(`\nreported (non-fatal): ${findings.length} duplicate law number(s)`);
