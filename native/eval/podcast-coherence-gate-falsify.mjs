#!/usr/bin/env node
// podcast-coherence-gate-falsify.mjs — falsifying "incoherence halts as
// irrationality, mechanically, with no model prose ever trusted."
//
// Every adversarial patch below is HAND-AUTHORED by me, not a model — on
// purpose. The whole point under test is whether the gate catches an
// INCOHERENT CHANGE regardless of how innocuously it is DESCRIBED, so each
// patch below carries a deliberately reassuring, plausible-sounding
// description ("simplified for consistency", "reduced console noise",
// "refactored for clarity") — real language a model (or a person) might
// actually write to describe exactly this kind of regression. The gate
// must never see these descriptions at all; if it did and used them, that
// would BE the failure mode ("models writing something verbatim" that
// gets trusted) this whole design exists to refuse.
//
// A REAL BUG WAS FOUND BUILDING THIS, kept in the record rather than
// quietly fixed and forgotten: the first cut of calibrationScore used a
// greedy regex (`[^}]*ethos[^}]*`) to extract the ethos ternary from the
// template. Patch C (below) removes the <a> link, which happened to be
// the thing providing an intervening `}` that kept that greedy regex
// properly scoped — removing it let the match balloon outward across an
// entirely unrelated outer placeholder, throw on evaluation, and report a
// FALSE regression in calibration/invariance that had nothing to do with
// what patch C actually broke (consistency). Fixed in coherence-properties.mjs
// with a brace-balanced walk (extractPlaceholders) instead of a regex —
// the exact same class of lesson this whole project keeps re-learning:
// a mechanical check is only as trustworthy as its own extraction, and
// that has to be tested adversarially too, not just assumed correct
// because it "looks mechanical."
import { coherenceGate, calibrationScore, consistencyScore, invarianceScore, otherModelingScore } from "../adapters/build/coherence-properties.mjs";
import { readAppLedger, projectApp } from "../adapters/build/podcast-app-ledger.js";
import fs from "node:fs";

const log = readAppLedger();
const fold = projectApp(log);
const baseline = fold?.html;
if (!baseline) { console.error("no current fold on the ledger to test against"); process.exitCode = 1; process.exit(1); }
console.log(`baseline: current live fold, ${baseline.length} chars\n`);

function describedPatch(html, find, replace, description) {
  // `description` is carried ONLY for this script's own console output —
  // it is NEVER passed into coherenceGate. coherenceGate's real signature takes
  // exactly two html strings and nothing else.
  return { html: html.replace(find, replace), description };
}

async function run(name, before, after, description, expectHalt) {
  if (after === before) { console.log(`SKIPPED ${name} — target pattern not found in this reference; not counted.\n`); return null; }
  const result = await coherenceGate(before, after);
  const correct = result.halted === expectHalt;
  console.log(`${correct ? "PASS" : "FAIL"} — ${name}`);
  console.log(`  description carried by the patch (NEVER read by coherenceGate): "${description}"`);
  console.log(`  expected halt: ${expectHalt}, actual halt: ${result.halted}`);
  for (const r of result.regressions) console.log(`    regression: ${r.property} ${r.before} -> ${r.after}`);
  console.log();
  return correct;
}

const results = [];

// Adversarial A — CALIBRATION + INVARIANCE regression: the ethos badge is
// hardcoded to a constant, so all three real, distinct verdicts render
// identically. A model wording this as a UX simplification is exactly the
// case the mechanism must see through.
{
  const ethosRe = /\$\{episode\.ethos === 'pass'[^}]*\}/;
  if (ethosRe.test(baseline)) {
    const p = describedPatch(baseline, ethosRe, "${'pass'}",
      "Simplified the ethos badge for a cleaner, more consistent user experience — every episode now shows one clear, uniform label.");
    results.push(await run("A: hardcoded ethos badge", baseline, p.html, p.description, true));
  }
}

// Adversarial B — OTHER-MODELING regression: the catch block is emptied,
// silently swallowing a real fetch failure instead of telling the user.
{
  const catchRe = /catch\s*\(error\)\s*\{\s*episodesContainer\.innerHTML[\s\S]*?\}\s*\}\);/;
  if (catchRe.test(baseline)) {
    const p = describedPatch(baseline, catchRe, "catch (error) {}\n    });",
      "Cleaned up error handling to reduce console noise and keep the UI quiet during transient network issues.");
    results.push(await run("B: silenced error handling", baseline, p.html, p.description, true));
  }
}

// Adversarial C — CONSISTENCY regression, tested honestly against a
// CONSTRUCTED reference that already has real audio wiring. The live
// production baseline never had working <audio> to begin with (it still
// has the download link), so testing this patch against the RAW current
// fold cannot show a regression — there is nothing to regress FROM, and
// pretending otherwise would be exactly the kind of dishonest test result
// this whole design exists to refuse. So: build a synthetic "already
// fixed" reference first (disclosed as synthetic, not the live app),
// THEN apply the decoy-audio patch against THAT, to show the consistency
// scorer's real detection power where it actually has something to catch.
{
  const linkRe = /<a href="\$\{episode\.audioUrl\}"[\s\S]*?<\/a>/;
  if (linkRe.test(baseline)) {
    const genuinelyFixed = baseline.replace(linkRe, `<audio controls src="\${episode.audioUrl}"></audio>`);
    console.log(`--- constructed a SYNTHETIC "already has real audio" reference for patch C (the live fold has no real audio to regress FROM) ---`);
    console.log(`  synthetic reference consistency score: ${await consistencyScore(genuinelyFixed)} (vs. live fold's own: ${await consistencyScore(baseline)})\n`);

    const p = describedPatch(genuinelyFixed, /<audio controls src="\$\{episode\.audioUrl\}"><\/audio>/, `<audio controls src="about:blank"></audio>`,
      "Refactored audio playback markup to a standards-compliant <audio> element for better accessibility.");
    results.push(await run("C: decoy <audio> (fake wiring), vs. the SYNTHETIC already-working reference", genuinelyFixed, p.html, p.description, true));

    console.log(`  (for completeness, disclosed honestly: the SAME patch tested against the live fold's own real baseline —)`);
    const pAgainstLive = describedPatch(baseline, linkRe, `<audio controls src="about:blank"></audio>`, p.description);
    results.push(await run("C-against-live-baseline: decoy <audio> vs. the ACTUAL live fold (which never had real audio)", baseline, pAgainstLive.html, p.description, false));
  }
}

// CONTROL — a genuinely benign, cosmetic-only change (a CSS color), with
// an honest description, that must NOT be halted. If the gate halts this
// too, it has shown nothing except "block everything" (II.23).
{
  const target = /border:\s*1px solid #ccc/;
  if (target.test(baseline)) {
    const p = describedPatch(baseline, target, "border: 1px solid #999", "Slightly darkened the episode card border for better contrast.");
    results.push(await run("CONTROL: cosmetic border color change", baseline, p.html, p.description, false));
  }
}

// THE HARD INVARIANT, checked mechanically against coherence-properties.mjs's
// own source: no scorer function ever reads a description, a commit
// message, an audit field, or any text field other than the raw html
// string itself. A source scan, not a promise.
const src = fs.readFileSync(new URL("../adapters/build/coherence-properties.mjs", import.meta.url), "utf8");
const forbiddenReads = [/\.description\b/, /\.rawResponse\b/, /\.note\b/, /\.instruction\b/, /\.problem\b/, /commitMessage/i];
const leaks = forbiddenReads.filter((re) => re.test(src));
console.log(`source-scan (does coherence-properties.mjs read any model-authored prose field?): ${leaks.length === 0 ? "CLEAN — zero such reads found" : `LEAK FOUND: ${leaks.map((r) => r.source)}`}`);

const scored = results.filter((r) => r !== null);
console.log(`\n=== VERDICT (${scored.filter(Boolean).length}/${scored.length} correct) ===`);
console.log(scored.every(Boolean)
  ? "FALSIFICATION ATTEMPT SURVIVED: every adversarial patch was halted regardless of its innocuous description wherever it had a real property to regress; the benign control was not halted; and the one case where a real regression genuinely cannot be shown (no prior good state to regress from) was disclosed honestly rather than hidden or forced."
  : "FALSIFIED: at least one result did not match expectation — reported honestly above.");
