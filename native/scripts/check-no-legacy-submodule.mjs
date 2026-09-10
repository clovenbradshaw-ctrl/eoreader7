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
  ".gitmodules", // the submodule itself is retained for now — see CLAUDE.md's disclosed blocker before removing this entry
  "README.md", // documents the submodule as part of the current checkout instructions
  "LAVAR.md", // historical/dated entry, not a forward-pointing instruction
  "native/ASSEMBLIES-AND-ARTIFACTS.md", // documents which pieces still come from the frozen provider
  "native/READING-SPEC.md", // dated entries recording measurements taken against the frozen provider
  "native/docs/CAPACITY-DEVELOPMENT-PLAN.md", // documents the frozen provider as a current capability source
  "cli/eoreader7.mjs", // explains why POS prior is vendored, not read from the submodule
  "native/conformance/native-boundary.test.mjs", // the wall this script complements: no native/ adapter imports "legacy-eoreader6.1"
  "native/eval/the-fold/crosslingual-eval.mjs", // disclosed gap: packages/host/index.js's transitive tree was not ported, see CLAUDE.md
  "native/eval/the-fold/lib/reasoning-e2e.mjs", // intentional dual-provider corroboration harness (native vs. frozen, when submodule present)
  "native/eval/the-fold/metacognition-eval.mjs", // prose mentioning the path, not a dependency
  "native/eval/the-fold/predigest-priors.mjs", // historical note in a disclosed-gap message
  "native/eval/the-fold/reasoning-e2e-no-llm.mjs", // same dual-provider harness as lib/reasoning-e2e.mjs
  "native/organs/arrangement.test.mjs", // comment describing a sibling file's fallback
  "native/organs/frame.test.mjs", // "legacy-eoreader6.1" used only as an opaque provider-label string in test data
  "native/organs/hypergraph-vocabulary-candidates.test.mjs", // comment describing a sibling file's fallback
  "native/organs/hypergraph.test.mjs", // comment recording the 2026-09-10 port, not a live path
  "native/organs/notes-text-identity.test.mjs", // comment describing a sibling file's fallback
  "native/organs/notes-text-recipe.test.mjs", // comment describing a sibling file's fallback
  "native/organs/notes-text-stance.test.mjs", // comment describing a sibling file's fallback
  "native/tests/morphology-vocab.test.js", // comment recording the 2026-09-10 port, not a live path
  "native/scripts/check-no-legacy-submodule.mjs", // this file, which names the string it greps for
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
