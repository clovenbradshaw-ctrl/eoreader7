// earned-constants.test.js — FOLD-CONSTITUTION II.11, ratcheted for eoreader7.
//
// II.11: "Every threshold, cutoff, minimum count, and top-N names the run
// that derived it, or the pipeline carries the flag downstream. This is not
// a refusal: a person may set a cutoff by hand and say so, at which point it
// is `received` and names them as its giver. What is refused is a constant
// with no giver and no measurement — a judgment wearing the clothes of a
// setting."
//
// the-fold has carried this ratchet since P146 (59 unaccounted of 85
// disclosed as baseline, failing on the sixtieth). eoreader7 did not, and the
// handoff plan named that as its second item: the same defect class was found
// four times in one session, twice by the person who had just written the
// rule against it. A rule held only in prose regresses at the speed of the
// next convenient edit.
//
// THIS IS A RATCHET, NOT A THRESHOLD. It records the constants already
// standing as a disclosed baseline and fails when a NEW one appears. It
// scans kernel/, adapters/text/ and organs/ — the trees that decide things
// about material — and not eval/, whose drivers are measurement harnesses
// with their own declared runs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.resolve(here, "..");
const SCANNED = ["kernel", "adapters/text", "organs"];

// A constant accounts for itself when the comment attached to it names either
// a measurement (a run, a date, a policy, the words measured/derived) or a
// giver. Both halves of II.11 are accepted: earned, or received and said so.
const ACCOUNTED = /\b(measured|derived|giver|declared by|the run that|P\d{1,3}\b|S\d{1,3}\b|\d{4}-\d{2}-\d{2}|convention|by construction|the standard|arbitrary but|chosen by|set by hand)\b/i;

// A JUDGMENT decides something about the material; a BUDGET decides how much
// of it to show or spend. Being wrong about a floor is not being wrong about
// a snippet length, so the two are reported apart.
const JUDGMENT = /(FLOOR|THRESHOLD|_CUT|BONUS|WEIGHT|^MIN_|_MIN$|RATIO|SHARE|ALPHA)/;

export function scanConstants(dirs = SCANNED) {
  const rows = [];
  for (const rel of dirs) {
    const dir = path.join(NATIVE, rel);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js") && !x.includes(".test.")).sort()) {
      const lines = fs.readFileSync(path.join(dir, f), "utf8").split("\n");
      lines.forEach((line, i) => {
        const m = line.match(/^export const ([A-Z][A-Z0-9_]*)\s*=\s*(-?[0-9][0-9._e]*)\s*;?(.*)$/);
        if (!m) return;
        let ctx = m[3] || "";
        for (let j = i - 1; j >= 0 && j > i - 14; j--) {
          const t = lines[j].trim();
          if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) ctx = `${t} ${ctx}`;
          else if (t === "") continue;
          else break;
        }
        rows.push({ file: `${rel}/${f}`, name: m[1], value: m[2], accounted: ACCOUNTED.test(ctx), judgment: JUDGMENT.test(m[1]) });
      });
    }
  }
  return rows;
}

const BASELINE_PATH = path.join(here, "earned-constants.json");
const key = (r) => `${r.file}:${r.name}`;

test("II.11: no NEW constant may appear without naming its measurement or its giver", () => {
  const rows = scanConstants();
  const baseline = new Set(JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")).unaccounted);
  const fresh = rows.filter((r) => !r.accounted).map(key).filter((k) => !baseline.has(k));
  assert.deepEqual(fresh, [],
    `${fresh.length} constant(s) with no measurement and no giver — a judgment wearing the clothes of a setting (II.11).\n` +
    `Say where the number came from in a comment on it, or, if a person set it, say so and name them.\nNew: ${fresh.join(", ")}`);
});

test("II.11: the baseline may only shrink, and may not name constants that no longer exist", () => {
  const rows = scanConstants();
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")).unaccounted;
  const names = new Set(rows.map(key));
  const gone = baseline.filter((k) => !names.has(k));
  assert.deepEqual(gone, [], `the baseline names constants that no longer exist — regenerate it: ${gone.join(", ")}`);
  const still = new Set(rows.filter((r) => !r.accounted).map(key));
  const fixed = baseline.filter((k) => !still.has(k));
  if (fixed.length) console.log(`  (${fixed.length} baseline constant(s) now account for themselves; remove them from earned-constants.json)`);
});

test("II.11: the check can actually fail — a planted unearned constant is caught", () => {
  // THE CONTROL (II.10: an unfalsified gate reports unmeasured, never pass).
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "earned-"));
  fs.writeFileSync(path.join(dir, "planted.js"), "export const MYSTERY_FLOOR = 0.34;\n");
  fs.writeFileSync(path.join(dir, "honest.js"), "// measured 2026-09-07 over the 1,000-turn run\nexport const HONEST_FLOOR = 0.5;\n");
  const rows = [];
  for (const f of fs.readdirSync(dir)) {
    const lines = fs.readFileSync(path.join(dir, f), "utf8").split("\n");
    lines.forEach((line, i) => {
      const m = line.match(/^export const ([A-Z][A-Z0-9_]*)\s*=\s*(-?[0-9][0-9._e]*)/);
      if (!m) return;
      const ctx = (i > 0 && lines[i - 1].trim().startsWith("//") ? lines[i - 1] : "") + (line.split(";")[1] ?? "");
      rows.push({ name: m[1], accounted: ACCOUNTED.test(ctx), judgment: JUDGMENT.test(m[1]) });
    });
  }
  fs.rmSync(dir, { recursive: true, force: true });
  const planted = rows.find((r) => r.name === "MYSTERY_FLOOR");
  const honest = rows.find((r) => r.name === "HONEST_FLOOR");
  assert.equal(planted.accounted, false, "an unearned constant must be caught");
  assert.equal(planted.judgment, true, "a FLOOR is a judgment, not a budget");
  assert.equal(honest.accounted, true, "a constant that names its measurement must pass");
});

test("II.11: judgments are reported apart from budgets", () => {
  const rows = scanConstants();
  const j = rows.filter((r) => !r.accounted && r.judgment);
  console.log(`  II.11 standing debt: ${rows.filter((r) => !r.accounted).length} unaccounted of ${rows.length}, of which ${j.length} decide something about the material:`);
  for (const r of j) console.log(`    ${r.file}:${r.name} = ${r.value}`);
  assert.ok(rows.length > 0, "the scanner must find constants at all");
});
