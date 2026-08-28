// The wall, this repo's half: the falsification probe is a standing fixture,
// and no source here turns absence-of-refutation into admission.
//
// eb72dbf ran the probe BEFORE the mechanism and killed the tempting design —
// letting a refutation-cleared candidate license its own derivation. That
// result lived in a scratch driver and a results doc. A finding nothing runs
// is a finding that decays, and this one will be re-proposed because it is the
// obvious optimization. So the six corpora with pre-declared ground truth run
// every time, and the twin result is asserted rather than remembered.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PROBE = path.join(HERE, "eval", "falsification-probe.mjs");
const OUT = path.join(HERE, "eval", "results", "falsification-probe.json");

execFileSync(process.execPath, [PROBE], { cwd: HERE, stdio: "ignore" });
const probe = JSON.parse(fs.readFileSync(OUT, "utf8"));

test("the six pre-declared corpora still run", () => {
  assert.ok(probe.rows.length >= 6, `expected the full corpus set, got ${probe.rows.length}`);
  for (const r of probe.rows) {
    assert.ok(typeof r.declared?.composesSoundly === "boolean",
      `${r.corpus} lost its pre-declared ground truth — the probe only means something if truth was declared before the run`);
  }
});

test("the twins remain indistinguishable — structure does not license composition", () => {
  const succession = probe.rows.find((r) => r.corpus.startsWith("succession-clean"));
  const dominance = probe.rows.find((r) => r.corpus.startsWith("defeated-acyclic"));
  assert.ok(succession && dominance, "the decisive twin pair is missing from the corpus set");
  // opposite in truth by declaration
  assert.notEqual(succession.declared.composesSoundly, dominance.declared.composesSoundly);
  // identical to the scan
  assert.equal(succession.scanRefuses, dominance.scanRefuses,
    "the scan now separates the twins. That is either a bug or a real new capability — " +
    "either way a human must look before anything downstream treats it as a licence.");
});

test("no source in this repo admits on absence of refutation", () => {
  const roots = [HERE, path.join(HERE, "eval")];
  const offenders = [];
  for (const dir of roots) {
    for (const name of fs.readdirSync(dir)) {
      if (!/\.(js|mjs)$/.test(name)) continue;
      const full = path.join(dir, name);
      if (!fs.statSync(full).isFile()) continue;
      const lines = fs.readFileSync(full, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (/^\s*(\/\/|\*)/.test(line)) return;
        const at = line.indexOf(".refuted");
        // any NEGATED read counts, however the value was obtained —
        // `!x.refuted`, `!f(a,b)[0].refuted`, `!(await s).refuted`. The earlier
        // narrow pattern (`!ident.refuted`) missed a call expression and a
        // planted offender walked straight through it.
        if (at < 0 || !line.slice(0, at).includes("!")) return;
        // a continuation line (`: x ? …`, `&& …`) belongs to an expression whose
        // head line was already judged; judging it separately double-counts one
        // decision and makes the marker un-placeable.
        if (/^\s*([:?]|&&|\|\||\.)/.test(line)) return;

        // Reading a negated refusal to REPORT is legitimate; reading it to
        // ADMIT is the wall. The difference is not decidable from the token,
        // so intent must be declared: a reporting use carries `veto-report:`
        // and says what it reports. Anything else counts as an admission.
        // walk back through the contiguous comment block, so the marker may
        // head a real explanation instead of being crammed onto one line
        let marked = /veto-report:/.test(line);
        for (let j = i - 1; j >= 0 && !marked && /^\s*(\/\/|\*)/.test(lines[j]); j -= 1) {
          if (/veto-report:/.test(lines[j])) marked = true;
        }
        if (marked) return;
        offenders.push(`${name}:${i + 1}: ${line.trim()}`);
      });
    }
  }
  assert.deepEqual(offenders, [],
    "absence of refutation is not a licence. Pass what a NAMED GIVER licensed to afterVeto() and let the scan only remove.");
});
