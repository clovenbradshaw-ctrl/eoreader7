// organs/girard.js — MIMETIC PRIOR. Handle: René Girard — mimetic desire:
// "man is the creature who does not know what to desire, and he turns to
// others in order to make up his mind." A design choice asked for in a
// vacuum, with nothing real to imitate, is not creative freedom — it is
// exactly the failure mode measured live in this session: an isolated
// "make this stand out" ask returned an arbitrary red against an
// established Spotify-green accent, well-formed and genuinely different
// (it cleared its own contract) and tasteless anyway, because nothing was
// ever handed a MODEL to imitate.
//
// THIS ORGAN NEVER FETCHES A LIVE REFERENCE (by direct instruction: "we
// need this all done with local hardware"). Its evidence is extracted
// from REAL, ALREADY-BUILT design systems sitting on this machine's own
// disk — the-fold's own shared accent tokens (explore/explore.css,
// index.html) and heimdall's own, independently designed ones
// (src/style.css) — never a description of taste, always a real hex value
// read out of real committed CSS.
//
// THE MEASURED PATTERN, n=2 (disclosed exactly as that, not oversold as a
// law): both real, independently-built local systems vary their accent's
// EMPHASIS/DIM state by LIGHTNESS alone, staying within a few degrees of
// hue of the base accent —
//   the-fold:  --accent #6d28d9 -> --accent-soft #f3eeff, hue distance 5.7°
//   heimdall:  --accent #63d9a8 -> --accent-dim  #2a7a5e, hue distance 3.9°
// — never a second, unrelated hue. The model's own red departed the
// podcast app's established #1DB954 green by 141.2° of hue — nowhere near
// either real reference's own tolerance.
//
// PURE. No network, no filesystem access here — extraction from real CSS
// text is a pure function; a caller reads the files.

// A received closed class (W3C CSS Color Module Level 3's own keyword
// table), NOT invented here — the same "a received number is used
// verbatim" discipline priors.js already holds for every closed class.
// Deliberately a SMALL, disclosed subset (the keywords a small model
// plausibly produces), never claimed as the full 148-entry table.
export const NAMED_COLOR_HEX = Object.freeze({
  red: "#ff0000", orange: "#ffa500", yellow: "#ffff00", gold: "#ffd700",
  green: "#008000", lime: "#00ff00", teal: "#008080", cyan: "#00ffff",
  blue: "#0000ff", navy: "#000080", indigo: "#4b0082", purple: "#800080",
  violet: "#ee82ee", magenta: "#ff00ff", pink: "#ffc0cb", brown: "#a52a2a",
  black: "#000000", white: "#ffffff", gray: "#808080", grey: "#808080",
  silver: "#c0c0c0", crimson: "#dc143c", coral: "#ff7f50", salmon: "#fa8072",
  tomato: "#ff6347", chocolate: "#d2691e", tan: "#d2b48c", olive: "#808000",
});

/**
 * resolveToHex(value) -> "#rrggbb" or null. Handles a literal hex, an
 * rgb()/rgba() function, or a keyword from NAMED_COLOR_HEX above. A value
 * this cannot resolve (a CSS variable, an unknown keyword, a gradient)
 * returns null — a typed gap, never a guessed color.
 */
export function resolveToHex(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join("")}`;
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v);
  if (rgb) return `#${rgb.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0")).join("")}`;
  if (v in NAMED_COLOR_HEX) return NAMED_COLOR_HEX[v];
  return null;
}

/** hexToHsl("#rrggbb") -> { h (0-360), s, l }, standard conversion. */
export function hexToHsl(hex) {
  const clean = String(hex ?? "").replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) throw new TypeError(`girard: not a 6-digit hex color: ${JSON.stringify(hex)}`);
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

/** hueDistance(hexA, hexB) -> degrees, 0..180, the shorter way round the wheel. */
export function hueDistance(hexA, hexB) {
  const a = hexToHsl(hexA).h;
  const b = hexToHsl(hexB).h;
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/**
 * extractAccentTokens(cssText) -> [{ name, hex }] — every `--accent`-family
 * CSS custom property declared in real CSS text (accent, accent-soft,
 * accent-dim, accent2, ... — anything starting "--accent" and holding a
 * hex value). Pure text extraction; the caller supplies real file
 * contents, never a path or a network read.
 */
export function extractAccentTokens(cssText) {
  const out = [];
  const re = /--(accent[\w-]*)\s*:\s*(#[0-9a-fA-F]{6})\b/g;
  let m;
  while ((m = re.exec(String(cssText ?? "")))) out.push({ name: m[1], hex: m[2] });
  return out;
}

/**
 * mimeticFinding(references) -> a real, measured finding over real local
 * design systems. `references`: [{ giver, cssText }] — giver names the
 * real file/system (e.g. "the-fold/explore/explore.css"), cssText its
 * real committed CSS. For each reference with 2+ accent-family tokens,
 * measures the hue distance between the BASE accent and every other
 * accent-family token (its own emphasis/dim/soft variants). Reports the
 * measured maximum across all references — never invents a threshold; a
 * caller wanting a dial reads THIS number and states its own giver/basis
 * when declaring one (see checkMimicry).
 */
export function mimeticFinding(references) {
  const perReference = [];
  for (const { giver, cssText } of references ?? []) {
    const tokens = extractAccentTokens(cssText);
    const base = tokens.find((t) => t.name === "accent");
    if (!base || tokens.length < 2) { perReference.push({ giver, measured: false, detail: "fewer than 2 accent-family tokens found — nothing to measure" }); continue; }
    const distances = tokens.filter((t) => t.hex !== base.hex).map((t) => ({ name: t.name, hueDistance: Math.round(hueDistance(base.hex, t.hex) * 10) / 10 }));
    perReference.push({ giver, measured: true, base: base.hex, variants: distances, maxHueDistance: distances.length ? Math.max(...distances.map((d) => d.hueDistance)) : 0 });
  }
  const measuredRefs = perReference.filter((r) => r.measured);
  const maxAcrossAll = measuredRefs.length ? Math.max(...measuredRefs.map((r) => r.maxHueDistance)) : null;
  return {
    schema: "EOMimeticFinding@1",
    n: measuredRefs.length,
    perReference,
    maxHueDistanceObserved: maxAcrossAll,
    detail: measuredRefs.length
      ? `${measuredRefs.length} real local design system(s) measured — each varies its accent's emphasis/dim state by lightness alone, within ${maxAcrossAll}° of hue`
      : "no reference had 2+ accent-family tokens to measure",
  };
}

/**
 * checkMimicry(proposedHex, establishedAccentHex, threshold) — the
 * computable contract THE-THEORY-OF-PATHOS.md's own "differentiate"
 * strategy was missing: a proposed emphasis color is MIMETIC (imitates a
 * real model — same hue family as the established accent) or ARBITRARY
 * (an unrelated hue, invented from nothing, exactly what produced the
 * tasteless red). `threshold` is a REGIME DIAL (organs/regime-dial.js
 * shape), never invented here — a caller states its own giver/basis,
 * typically citing mimeticFinding's own measured maxHueDistanceObserved.
 */
export function checkMimicry(proposedHex, establishedAccentHex, threshold) {
  if (!threshold || typeof threshold !== "object" || threshold.value === undefined || typeof threshold.giver !== "string" || !threshold.giver.trim() || typeof threshold.basis !== "string" || !threshold.basis.trim()) {
    throw new TypeError('girard: checkMimicry requires a regime dial { value, giver, basis } — a hue-distance floor with no giver and no stated basis is an invented rule, the same "practitioner heuristic, no empirical support" class this whole team refuses to manufacture');
  }
  const distance = Math.round(hueDistance(proposedHex, establishedAccentHex) * 10) / 10;
  const mimetic = distance <= threshold.value;
  return {
    schema: "EOMimicryCheck@1",
    proposed: proposedHex,
    establishedAccent: establishedAccentHex,
    hueDistance: distance,
    thresholdGiver: threshold.giver,
    thresholdBasis: threshold.basis,
    mimetic,
    detail: mimetic
      ? `imitates the established accent — ${distance}° of hue, within the declared ${threshold.value}° floor`
      : `arbitrary — ${distance}° of hue from the established accent, invented from nothing rather than imitating it (declared floor: ${threshold.value}°)`,
  };
}
