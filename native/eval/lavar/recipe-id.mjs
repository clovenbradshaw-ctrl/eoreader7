// recipe-id.mjs — which generation of the reading pipeline produced a given
// sidecar, computed the same way P68 (the-fold/eoreader7 hyperlexicon work)
// already established for exactly this question: a SHA-256 over a declared
// descriptor, not a git commit. Git commit was tried first there and refused
// here for the same reason it would be wrong there today — this directory
// carries substantial uncommitted work (case-discovery, letter-ordinals, the
// numeral-less fallback, visual-rec.mjs), so keying identity off a commit
// hash would give every one of those genuinely different pipelines the SAME
// id. The descriptor is the actual bytes of the files that decide how a
// document gets read — content-addressed, correct regardless of git state.
//
// Sidecars in this directory are disposable (user direction, 2026-09-10:
// "are sidecars all in beta mode? I don't care if they even get fully
// deleted") — this is not a non-destructive-merge mechanism, and it does not
// try to be one. It exists so a scan of results/ can tell, mechanically,
// which sidecars were read by a pipeline generation that predates a real
// capability (case-discovery, letter-ordinal support, the numeral-less
// tier-3 fallback, vision-assisted structure) and are worth re-running,
// from ones already produced by the current generation.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// The files whose bytes decide how a document gets read. Adding a real
// capability to this pipeline (a new detector, a new tier) means adding its
// file here — that's the whole mechanism for making the recipe id change
// when the reading actually changes, and it changing when these bytes don't
// is exactly the bug this module exists to prevent.
export const RECIPE_FILES = [
  "eot-jsonl.mjs",
  "structure-rec.mjs",
  "table-rec.mjs",
  "table-shape-witnesses.mjs",
  "visual-rec.mjs",
  "visual-detect.py",
  "recoverability.mjs",
];

function fileHash(name) {
  const p = path.join(HERE, name);
  if (!fs.existsSync(p)) return null; // a file named here that doesn't exist yet is a real gap, not silently skipped
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);
}

function gitLabel() {
  try {
    const commit = execSync("git rev-parse --short HEAD", { cwd: HERE, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    const dirty = execSync("git status --porcelain", { cwd: HERE, stdio: ["ignore", "pipe", "ignore"] }).toString().trim().length > 0;
    return `${commit}${dirty ? "+dirty" : ""}`;
  } catch {
    return "no-git"; // never thrown past this — a label, not a dependency
  }
}

/**
 * The recipe id: a short, stable hash over the actual bytes of every file
 * that decides how a document gets read, PLUS a human-readable git label
 * (informational only — two runs at the same dirty git state with different
 * edits still get different ids, because the hash is over the bytes).
 */
export function currentRecipe() {
  const files = RECIPE_FILES.map((name) => ({ name, hash: fileHash(name) }));
  const missing = files.filter((f) => f.hash === null).map((f) => f.name);
  const digest = crypto.createHash("sha256");
  for (const f of files) digest.update(f.name).update(f.hash ?? "MISSING");
  return {
    recipeId: digest.digest("hex").slice(0, 16),
    files: Object.fromEntries(files.map((f) => [f.name, f.hash])),
    missing,
    git: gitLabel(),
    computedAt: new Date().toISOString().slice(0, 10),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(currentRecipe(), null, 2));
}
