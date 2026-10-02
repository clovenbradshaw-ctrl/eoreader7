// lib/fold-sibling.mjs — ONE place that knows whether the fold's modules
// are present, so every driver that reaches into them refuses the same way
// (P22/P24/P39's drift class: two copies of "is the fold here" would rot
// independently).
//
// WHY THIS EXISTS. Several lib/*.mjs files import real modules from the
// reading workbench (grid.js, reader-frame.js, snip-check.js, grounding.js)
// or a package only vendored there (mathjs), via a fixed relative/URL path.
// Since 2026-10-01 those modules live in THIS repo at
// native/the-fold/ (absorbed from the sibling `the-fold` repo, now archived
// as `the-fold-legacy/`). A checkout always has native/the-fold/; only the
// archive path may be absent. A module that is archive-only (e.g. the
// terminal's term.js/sql.js, reader-frame.js) must name the archive and be
// refused when the archive is not checked out. This is a fact about the
// CHECKOUT (P41: never about the material, and here, never about the
// reasoning organs either) — REFUSE it, typed, the same posture
// `walk-fixtures.mjs::walkFaces` already holds for missing corpus faces.

import { existsSync } from "node:fs";

export class FoldUnavailableError extends Error {
  constructor(detail) {
    super(`the fold's modules are not available: ${detail}`);
    this.name = "FoldUnavailableError";
    this.type = "fold_sibling_unreachable";
  }
}

/**
 * resolveFoldSibling(metaUrl, upLevels) — the directory holding the fold's
 * modules (native/the-fold/ after the 2026-10-01 absorption, or the
 * archived sibling `the-fold-legacy/` for a module that stayed behind), as
 * a `file://`-relative URL string, plus whether it is available.
 * `upLevels` is the caller's own declared relative path (this module does
 * not guess a repo's own directory depth). A directory is available when it
 * exists and holds the reading workbench's own `fold.js` (native home) or a
 * package.json (the archived repo).
 */
export function resolveFoldSibling(metaUrl, upLevels) {
  const path = new URL(upLevels, metaUrl).pathname;
  const sentinel =
    existsSync(`${path}fold.js`) ||   // native/the-fold/ home
    existsSync(`${path}hypergraph.js`) || // native/organs/ home
    existsSync(`${path}package.json`); // the archived sibling repo
  return { path, available: existsSync(path) && sentinel };
}

/** requireFoldAvailable(metaUrl, upLevels, detail) — throws FoldUnavailableError, never lets a bare MODULE_NOT_FOUND surface. */
export function requireFoldAvailable(metaUrl, upLevels, detail) {
  const { path, available } = resolveFoldSibling(metaUrl, upLevels);
  if (!available) throw new FoldUnavailableError(`${detail} (looked for ${path})`);
  return path;
}
