// lib/legacy-sibling.mjs — the same refusal posture as fold-sibling.mjs
// (S65/P95: a driver refuses what its checkout lacks, typed, never an
// uncaught crash), for the OTHER sibling repo some organs reach into:
// `legacy-eoreader6.1`, vendored here as a git submodule (.gitmodules) and
// left uninitialised on most checkouts — including this repo's own CI
// (native-kernel.yml checks out eoreader7 alone, submodule or not).
//
// Deliberately generic over fold-sibling.mjs's own helpers rather than a
// second hand-rolled existence check: same shape (`resolveXSibling`,
// `available`), same class of error, so a caller that needs BOTH siblings
// composes the two the same way (see grammar-lens.test.mjs).

import { existsSync } from "node:fs";

export class LegacyUnavailableError extends Error {
  constructor(detail) {
    super(`the sibling legacy-eoreader6.1 checkout is not available: ${detail}`);
    this.name = "LegacyUnavailableError";
    this.type = "legacy_sibling_unreachable";
  }
}

/**
 * resolveLegacySibling(metaUrl, upLevels) — the sibling `legacy-eoreader6.1`
 * directory, as a `file://`-relative URL string, plus whether it actually
 * exists (an uninitialised submodule leaves the directory present but
 * empty — no package.json — so that counts as absent too).
 */
export function resolveLegacySibling(metaUrl, upLevels) {
  const path = new URL(upLevels, metaUrl).pathname;
  return { path, available: existsSync(path) && existsSync(`${path}package.json`) };
}

/** requireLegacyAvailable(metaUrl, upLevels, detail) — throws LegacyUnavailableError, never lets a bare MODULE_NOT_FOUND/ENOENT surface. */
export function requireLegacyAvailable(metaUrl, upLevels, detail) {
  const { path, available } = resolveLegacySibling(metaUrl, upLevels);
  if (!available) throw new LegacyUnavailableError(`${detail} (looked for ${path})`);
  return path;
}
