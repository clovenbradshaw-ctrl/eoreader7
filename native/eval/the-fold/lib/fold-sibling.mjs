// lib/fold-sibling.mjs — ONE place that knows whether the sibling `the-fold`
// checkout is present, so every driver that reaches into it refuses the
// same way (P22/P24/P39's drift class: two copies of "is the sibling repo
// here" would rot independently).
//
// WHY THIS EXISTS. Several lib/*.mjs files import real modules from a
// sibling `the-fold` repo (grid.js, reader-frame.js, snip-check.js,
// grounding.js) or a package only vendored THERE (mathjs), via a fixed
// relative/URL path. That sibling repo is never checked out by this
// repo's own CI (native-kernel.yml checks out eoreader7 alone), so every
// one of those imports threw an uncaught MODULE_NOT_FOUND — crashing the
// whole test FILE, including tests that need nothing from the-fold at
// all when the import sits at module top level. This is a fact about the
// CHECKOUT (P41: never about the material, and here, never about the
// reasoning organs either) — REFUSE it, typed, the same posture
// `walk-fixtures.mjs::walkFaces` already holds for missing corpus faces.

import { existsSync } from "node:fs";

export class FoldUnavailableError extends Error {
  constructor(detail) {
    super(`the sibling the-fold checkout is not available: ${detail}`);
    this.name = "FoldUnavailableError";
    this.type = "fold_sibling_unreachable";
  }
}

/**
 * resolveFoldSibling(metaUrl, upLevels) — the sibling `the-fold` directory,
 * as a `file://`-relative URL string, plus whether it actually exists.
 * `upLevels` is the caller's own declared relative path (this module does
 * not guess a repo's own directory depth) — e.g. `"../../../../../the-fold/"`
 * matches the depth `product-assay.mjs`/`frontier-25.mjs` already use.
 */
export function resolveFoldSibling(metaUrl, upLevels) {
  const path = new URL(upLevels, metaUrl).pathname;
  return { path, available: existsSync(path) && existsSync(`${path}package.json`) };
}

/** requireFoldAvailable(metaUrl, upLevels, detail) — throws FoldUnavailableError, never lets a bare MODULE_NOT_FOUND surface. */
export function requireFoldAvailable(metaUrl, upLevels, detail) {
  const { path, available } = resolveFoldSibling(metaUrl, upLevels);
  if (!available) throw new FoldUnavailableError(`${detail} (looked for ${path})`);
  return path;
}
