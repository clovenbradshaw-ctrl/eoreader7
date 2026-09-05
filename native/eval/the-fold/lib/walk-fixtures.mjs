// lib/walk-fixtures.mjs — the fixture rule for every driver that stands on a
// recorded walk: a face the walk names and this checkout lacks is a REFUSAL,
// never a narrowed pool.
//
// WHY. `results/ranke-backwards.json` names the faces its walk read. 86 of
// its 106 were untracked (`5541af4`, 2026-09-04 11:52) thirty-two minutes
// after `cited-source-null-RESULTS.md` and `ordered-read-reach-RESULTS.md`
// were written from them. Both drivers then skipped the absent faces with an
// `existsSync … continue` and printed the same "16 independent sources"
// over the 20 that remained — a null over a silently narrowed pool, which
// P94 / S64 named the worst of the three possible outcomes. The 2026-09-05
// audit made the skip DISCLOSED; this pass (the-fold P95 / S65) makes it a
// typed gap and a non-zero exit, because a disclosed narrowing is still a
// number nobody can compare to the doc's.
//
// The alternative — committing the faces the docs stand on — was declined:
// the docs are dated records of one run, not claims about the repo, and
// the 09-04 untracking rule ("regenerable eval output stays out of the
// tree") holds. So the docs say "reproducible only where the walk's
// fixtures exist", and the driver says which are missing.
//
// ONE implementation, three consumers (both drivers and the test that pins
// the rule) — the drift class P22/P24/P39 name.

import { existsSync } from "node:fs";

/**
 * Every face the walk's real rows name, split by presence under `fixtureDir`.
 * @param {{real:{rows:Array<{facePath?:string}>}}} walkJson
 * @param {string} fixtureDir — absolute path, trailing slash
 * @returns {{named:string[], present:string[], absent:string[], gap:null|object}}
 *   `gap` is null when every named face is present, else a typed gap:
 *   { type: "fixture_absent", named, present, absent, sample } — a fact
 *   about the CHECKOUT, never about the material (P41).
 */
export function walkFaces(walkJson, fixtureDir) {
  const rows = walkJson?.real?.rows;
  if (!Array.isArray(rows)) throw new TypeError("walkFaces: walkJson.real.rows is the walk's record; nothing else is");
  const named = [...new Set(rows.map((r) => r.facePath).filter(Boolean))];
  const present = named.filter((f) => existsSync(fixtureDir + f));
  const absent = named.filter((f) => !existsSync(fixtureDir + f));
  const gap = absent.length
    ? { type: "fixture_absent", named: named.length, present: present.length, absent: absent.length, sample: absent.slice(0, 3) }
    : null;
  return { named, present, absent, gap };
}

/** The refusal line a driver prints before exiting non-zero. */
export function describeWalkGap(gap, { walkFile = "results/ranke-backwards.json", driver = "this driver" } = {}) {
  return (
    `REFUSED (${gap.type}): the walk in ${walkFile} names ${gap.named} faces; ${gap.absent} are absent from fixtures/ ` +
    `(e.g. ${gap.sample.join(", ")}). ${driver} does not narrow its pool to the ${gap.present} that remain — a null over a ` +
    `silently narrowed pool is not comparable to the doc's run (P94/S64). This is a fact about the checkout, not the material: ` +
    `the results doc is reproducible only where the walk's fixtures exist.`
  );
}
