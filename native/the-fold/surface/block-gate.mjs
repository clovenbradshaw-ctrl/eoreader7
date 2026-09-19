// block-gate.mjs — THE GATE (Paradigm · Interpretation·Pattern).
//
// Fold invariant: AN UNGROUNDED SURFACE IS REFUSED. The gate is the
// agreement that holds every other block honest, and the renderer will not
// emit a surface it refuses:
//   1. every link's ref resolves to verbatim-exact text in the retained ground;
//   2. zero surfaced source-lane rows are unflagged proposals (kind proposal
//      or a giver) — the model may propose, promotion requires a reviewer;
//   3. every metric row carries dataset + source + asOf;
//   4. the alternating ground digest re-derives — a tampered byte anywhere
//      in the corpus refuses the whole surface.
export const GATE_SCHEMA = "EOGate@1";

export function gateSurface({ ground, links, metrics, resolveSnippet, plansRoot, snapshotSidecar = null }) {
  const checks = [];
  const fail = (name, detail) => checks.push({ name, ok: false, detail });
  const pass = (name, detail) => checks.push({ name, ok: true, detail });

  let badRefs = 0;
  let firstBad = null;
  for (const l of links) {
    const ref = `${l.doc}#${l.at[0]}-${l.at[1]}`;
    const s = resolveSnippet(ref, [plansRoot]);
    const ok = !!(s && s.resolved && s.verbatim && s.verbatim === l.verbatim);
    if (!ok) { badRefs++; firstBad ??= `${l.id} ${ref}`; }
  }
  badRefs ? fail("refs resolve verbatim", `${badRefs}/${links.length} failed${firstBad ? ` (first: ${firstBad})` : ""}`)
          : pass("refs resolve verbatim", `${links.length}/${links.length}`);

  const proposals = links.filter((l) => l.kind === "proposal" || l.giver);
  proposals.length
    ? fail("no unflagged proposals", `${proposals.length} proposal/giver rows in the source lane`)
    : pass("no unflagged proposals", "0");

  const unprovenanced = metrics.filter((m) => !(m.provenance?.dataset && m.provenance?.source && m.provenance?.asOf));
  unprovenanced.length
    ? fail("metric provenance", `${unprovenanced.length} rows lack dataset/source/asOf`)
    : pass("metric provenance", `${metrics.length}/${metrics.length}`);

  let badMetricRefs = 0;
  let firstBadMetric = null;
  for (const m of metrics) {
    if (m.at && m.ref) {
      const s = resolveSnippet(m.ref, [plansRoot]);
      const ok = !!(s && s.resolved && s.verbatim === m.verbatim);
      if (!ok) { badMetricRefs++; firstBadMetric ??= `${m.id} ${m.ref}`; }
    } else if (m.derivedFrom) {
      if (!snapshotSidecar) continue;
      const ok = existsSync(snapshotSidecar.path) && sha(snapshotSidecar.path) === snapshotSidecar.sha256;
      if (!ok) { badMetricRefs++; firstBadMetric ??= `${m.id} (snapshot ${snapshotSidecar.path} fails its pinned sha256)`; }
    } else {
      badMetricRefs++; firstBadMetric ??= `${m.id} (no byte ref, no derivedFrom)`;
    }
  }
  badMetricRefs
    ? fail("metrics resolve to retained bytes", `${badMetricRefs} unresolved${firstBadMetric ? ` (first: ${firstBadMetric})` : ""}`)
    : pass("metrics resolve to retained bytes", `${metrics.length}/${metrics.length}`);

  const digestReDerives = groundDigest(ground) === ground.digest;
  digestReDerives
    ? pass("ground digest re-derives", ground.digest.slice(0, 12) + "…")
    : fail("ground digest re-derives", "the retained corpus does not match the pinned digest — a byte has changed");

  const ok = checks.every((c) => c.ok);
  return { schema: GATE_SCHEMA, ok, checks };
}

import { groundDigest } from "./block-ground.mjs";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");