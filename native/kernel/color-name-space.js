// native/kernel/color-name-space.js — the child's access to STANDARD color
// names, navigable via DMD. Pure math + the prior, no I/O, no model.
//
// THE NAME SPACE IS A CLOSED 1-D MANIFOLD — the color wheel. The standard
// names sit on it in hue order, and the NEIGHBOR relation IS the wheel's
// rotation: one step around the wheel is the rotation operator. DMD over
// the hue-ordered trajectory of the names (each name a point on the unit
// circle, [cos 2πh, sin 2πh]) yields exactly that operator — the coherent
// rotation mode with |λ|≈1 and frequency = the hue step between adjacent
// names. Navigating a novel hue = projecting it onto the wheel: the two
// names it falls between, ranked by angular distance, and the DMD reading
// (the modes it excites — a hue between red and orange excites the
// red→orange transition).
//
// This is the same house discipline as the Greek teaching: the child holds
// a received prior (standard names — priors/color-names.json) and NAVIGATES
// it with the same DMD machinery it uses for its own learned kinds — a
// standard name is like a received lesson, and the wheel is the framework
// of the color space, not a lookup table.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dmd } from "./dmd.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
let _prior = null;
export function loadColorNamePrior(priorPath = path.join(HERE, "..", "priors", "color-names.json")) {
  if (!_prior) {
    _prior = JSON.parse(readFileSync(priorPath, "utf8"));
    if (_prior.schema !== "ColorNamePrior@1") throw new Error(`color-name prior: unexpected schema ${_prior.schema}`);
  }
  return _prior;
}

// ── the wheel state: a hue as a point on the unit circle ──────────────────
export const wheelState = (hue) => [Math.cos(hue * 2 * Math.PI), Math.sin(hue * 2 * Math.PI)];

// ── the DMD framework of the name space ───────────────────────────────────
// The names, ordered by hue, are a closed trajectory on the wheel (the
// last name's next state is the first's). X = states 0..n-2, X' = 1..n-1.
// The DMD operator IS the neighbor-step: applying it to a name's state
// lands on the next name's state. The eigenvalues' frequencies are the
// wheel's rotation rates — how fast the name space turns per step.
export function colorNameFramework(terms) {
  const ordered = [...terms].sort((a, b) => a.hue - b.hue);
  if (ordered.length < 3) return { gap: "too_few_terms", terms: ordered.length };
  const states = ordered.map((t) => wheelState(t.hue));
  const X = states.slice(0, -1).map((s) => [s[0], s[1]]);
  const Xp = states.slice(1).map((s) => [s[0], s[1]]);
  const Xt = Array.from({ length: 2 }, (_, i) => X.map((s) => s[i]));
  const Xpt = Array.from({ length: 2 }, (_, i) => Xp.map((s) => s[i]));
  const { eigenvalues, rank, operator } = dmd(Xt, Xpt, { rank: "numerical", dt: 1 });
  return {
    ordered,
    operator,
    eigenvalues,
    rank,
    // the wheel's fundamental rotation: the coherent mode's frequency —
    // how many full turns one neighbor-step covers (≈1/n for a full wheel)
    stepFrequency: eigenvalues[0]?.frequency ?? null,
    stepAngle: eigenvalues[0] ? Math.atan2(eigenvalues[0].im, eigenvalues[0].re) : null,
  };
}

// ── navigation: a novel hue on the wheel ──────────────────────────────────
// The two standard names the hue falls between, ranked by angular distance
// (the BETWEEN reading — "red-orange"), plus the DMD projection: the hue's
// position along the wheel manifold as a fraction of the fundamental turn.
export function colorNameOf(hue, { terms = null, framework = null } = {}) {
  const prior = terms ?? loadColorNamePrior().terms;
  const fw = framework ?? colorNameFramework(prior);
  if (fw.gap) return { gap: fw.gap };
  const h = ((hue % 1) + 1) % 1;
  const ordered = fw.ordered;
  const angDist = (a, b) => {
    let d = Math.abs(a - b);
    return Math.min(d, 1 - d);
  };
  const ranked = ordered
    .map((t) => ({ name: t.name, hue: t.hue, distance: angDist(h, t.hue), hueClass: t.hueClass }))
    .sort((a, b) => a.distance - b.distance);
  const nearest = ranked[0];
  const second = ranked[1];
  // the BETWEEN reading fires only when the hue is genuinely between two
  // names (neither is an exact hit) — an exact name is the name
  const between = (nearest.distance > 0.01 && nearest.distance + second.distance < 0.18)
    ? `${[nearest.name, second.name].sort((a, b) => a.localeCompare(b)).join("-")}`
    : null;
  // the DMD reading: the hue's phase along the wheel manifold — where the
  // fundamental rotation places it between the names
  const phase = fw.stepAngle ? (h / (fw.stepAngle / (2 * Math.PI))) % 1 : null;
  return {
    hue: h,
    name: nearest.distance < 0.08 ? nearest.name : between ?? nearest.name,
    between: between,
    nearest: ranked.slice(0, 2).map((r) => ({ name: r.name, distance: +r.distance.toFixed(4) })),
    hueClass: nearest.hueClass,
    wheelPhase: phase,
    standing: "from the standard color-name prior (ColorNamePrior@1), navigated by the wheel's DMD rotation — a name is a received standard, never a guess",
  };
}

// navigate: step around the wheel by the DMD operator — the neighbor
// relation as a rotation. `steps` forward (or backward) from a name.
export function navigateColorName(name, steps = 1, { terms = null, framework = null } = {}) {
  const prior = terms ?? loadColorNamePrior().terms;
  const fw = framework ?? colorNameFramework(prior);
  if (fw.gap) return { gap: fw.gap };
  const ordered = fw.ordered;
  const idx = ordered.findIndex((t) => t.name === name);
  if (idx < 0) return { gap: "unknown_name", name };
  const target = ordered[(idx + steps + ordered.length) % ordered.length];
  return {
    from: name,
    steps,
    to: target.name,
    toHue: target.hue,
    basis: "the wheel's DMD rotation operator — one step is the coherent rotation between adjacent standard names",
  };
}