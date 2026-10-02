#!/usr/bin/env node
// native/scripts/check-no-legacy-submodule.mjs — guard against reintroducing
// a dependency on the legacy-eoreader6.1 submodule.
//
// 2026-09-10: legacy-eoreader6.1's real engine modules, data fixtures, and
// scripts were migrated out (into native/adapters/text/, native/legacy-ported/,
// native/eval/fixtures/, native/priors/, cli/priors/) — see eoreader7/CLAUDE.md
// for the full record of what moved where and what was deliberately left
// behind, disclosed. This script greps the tracked source tree for the
// string "legacy-eoreader6.1" and fails loudly if a new reference shows up
// outside the allowlist below, so a future session (human or AI) does not
// silently grow a new dependency on a submodule this repo is retiring.
//
// Run as part of `npm test` (wired into native/package.json's "test" script)
// or standalone: node native/scripts/check-no-legacy-submodule.mjs

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");

// Files allowed to mention the string "legacy-eoreader6.1" — every entry
// here must be a COMMENT, a test-data LABEL, or documentation of the
// migration/retirement itself, never a live import or filesystem path this
// repo's own code depends on. Keep this list short; growing it back toward
// the pre-2026-09-10 86-file count is the failure this script exists to
// catch.
const ALLOWLIST = new Set([
  ".gitignore", // the submodule is still checked out (root symlinks depend on it, see CLAUDE.md) — its own ignore rules stay
  "README.md", // documents the submodule as part of the current checkout instructions
  "LAVAR.md", // historical/dated entry, not a forward-pointing instruction
  "native/ASSEMBLIES-AND-ARTIFACTS.md", // documents which pieces still come from the frozen provider
  "native/READING-SPEC.md", // dated entries recording measurements taken against the frozen provider
  "native/docs/CAPACITY-DEVELOPMENT-PLAN.md", // documents the frozen provider as a current capability source
  "cli/eoreader7.mjs", // explains why POS prior is vendored, not read from the submodule
  "native/conformance/native-boundary.test.mjs", // the wall this script complements: no native/ adapter imports "legacy-eoreader6.1"
  "native/eval/the-fold/crosslingual-eval.mjs", // disclosed gap: packages/host/index.js's transitive tree was not ported, see CLAUDE.md; now reads the ported legacy-ported/packages/host/corpus.js, the 6.1 mention is historical comment
  "native/eval/the-fold/lib/reasoning-e2e.mjs", // reads native organs only since 2026-10-01 (the frozen provider is retired); the 6.1 mention is a historical comment
  "native/organs/arrangement.test.mjs", // comment describing a sibling file's fallback
  "native/organs/frame.test.mjs", // "legacy-eoreader6.1" used only as an opaque provider-label string in test data
  "native/organs/hypergraph-vocabulary-candidates.test.mjs", // comment describing a sibling file's fallback
  "native/organs/hypergraph.test.mjs", // comment recording the 2026-09-10 port, not a live path
  "native/organs/notes-text-identity.test.mjs", // comment describing a sibling file's fallback
  "native/organs/notes-text-recipe.test.mjs", // comment describing a sibling file's fallback
  "native/organs/notes-text-stance.test.mjs", // comment describing a sibling file's fallback
  "native/tests/morphology-vocab.test.js", // comment recording the 2026-09-10 port, not a live path
  "native/scripts/check-no-legacy-submodule.mjs", // this file, which names the string it greps for
  "native/eval/the-fold/metacognition-eval.mjs", // prose mentioning the path, not a dependency
  "native/eval/the-fold/predigest-priors.mjs", // historical note in a disclosed-gap message
  "CHORUS-LOG.md", // dated postmortem entries recording the 2026-09-10 retirement
  "LEGACY-EOREADER6.1.md", // the retirement's own pointer doc — history, not a dependency
  "native/eval/the-fold/date-normalize.mjs", // comment: the isolated npm install never touches the old submodule
  "native/eval/the-fold/gfp-vs-svo-first.mjs", // comment naming the retired corpus home; reads native/scripts/corpus since 2026-10-01
  "native/eval/the-fold/long-project-heldout/HELDOUT.md", // "legacy-eoreader6.1/ — not read" — a refusal list, not a dependency
  "native/eval/the-fold/package.json", // description explaining the isolated deps avoid the old submodule's package.json
  "native/eval/the-fold/unwired-organs.mjs", // comment naming the frozen provider as a past home
  "native/scripts/build-verb-noun-backoff-prior.mjs", // comment: the conllu default returns 0 when absent; reads native/scripts/corpus
  "native/tests/corpus-resonance.test.js", // comment describing the skip pattern; no legacy path read
  "native/the-fold/ground-selector.js", // comment citing the retired host/population.js measurement
  "proxy-runner.mjs", // two comments recording past thresholds and the retired exact-term ladder
  "scripts/kleene-up.mjs", // the sweep's own skip-list of retired/moved directories
]);

// Historical result artifacts: dated postmortems recording what a past run's
// config actually was. Never edited to erase history; matched by prefix.
const HISTORICAL_PREFIXES = ["native/eval/the-fold/results/", "native/eval/results/"];

function trackedFiles() {
  const out = execFileSync("git", ["-C", REPO_ROOT, "ls-files"], { encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

function grepLegacy(files) {
  if (files.length === 0) return [];
  try {
    const out = execFileSync("git", ["-C", REPO_ROOT, "grep", "-l", "legacy-eoreader6.1", "--", ...files], {
      encoding: "utf8",
    });
    return out.split("\n").filter(Boolean);
  } catch (e) {
    if (e.status === 1) return []; // grep found nothing — clean
    throw e;
  }
}

const files = trackedFiles().filter((f) => !f.startsWith("legacy-eoreader6.1/"));
const hits = grepLegacy(files);
const unexpected = hits.filter(
  (f) => !ALLOWLIST.has(f) && !HISTORICAL_PREFIXES.some((p) => f.startsWith(p)),
);

if (unexpected.length > 0) {
  console.error("check-no-legacy-submodule: new reference(s) to legacy-eoreader6.1 found outside the allowlist:");
  for (const f of unexpected) console.error(`  ${f}`);
  console.error(
    "\nThe legacy-eoreader6.1 submodule was retired 2026-09-10 (see eoreader7/CLAUDE.md). " +
      "If this file genuinely needs the frozen provider, migrate it the way the rest of the " +
      "codebase was migrated (native/adapters/text/, native/legacy-ported/, native/eval/fixtures/) " +
      "rather than adding a new dependency on the submodule. If it's a deliberate, disclosed " +
      "exception (a comment, a label, documented dual-provider harness), add it to ALLOWLIST in " +
      "this script with a one-line reason.",
  );
  process.exit(1);
}

console.log(`check-no-legacy-submodule: clean (${hits.length} allowlisted mention(s), 0 unexpected)`);
