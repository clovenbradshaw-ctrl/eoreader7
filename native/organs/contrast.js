// organs/contrast.js — CONTRAST: the one visual-hierarchy archon with no
// personal handle, because none is needed or honest — the floor is a
// received standard (W3C WCAG 2.2, Understanding Success Criterion 1.4.3),
// used verbatim, exactly the discipline priors.js already holds for every
// received closed class: a number with a real giver is used as-is, never
// re-derived or softened into a "recommendation."
//
// WELL-EVIDENCED tier, the top of the literature review's own confidence
// table: this is a hard legal/perceptual floor (contrast-sensitivity loss
// with age; luminance-based so it also serves color-vision deficiency),
// never a judgment call. A caller wanting a "does this look nice" read
// will not find one here — see organs/visual-hierarchy.js's own header for
// why that channel is refused everywhere in this team, not only here.
//
// PURE.

/** relativeLuminance([r,g,b]) — WCAG's own formula, 0..255 channels. */
export function relativeLuminance([r, g, b]) {
  const chan = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [chan(r), chan(g), chan(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** contrastRatio(rgb1, rgb2) — WCAG's (L1+0.05)/(L2+0.05), L1 the lighter. */
export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * wcagFloorFor({fontSizePx, bold}) — 3:1 for "large text" (WCAG: >=24px
 * regular, or >=18.66px [14pt] bold), else 4.5:1. The floor and the size
 * cutoffs are W3C's own definition, used verbatim.
 */
export function wcagFloorFor({ fontSizePx, bold = false }) {
  const large = fontSizePx >= 24 || (bold && fontSizePx >= 18.66);
  return large ? 3.0 : 4.5;
}

import { EVIDENCE_TIER } from "./evidence-tier.js";

/**
 * contrastFindings(elements) — elements: [{ id, fontSizePx, bold, color:
 * [r,g,b], backgroundColor: [r,g,b] }]. Every finding is a hard W3C floor.
 */
export function contrastFindings(elements) {
  return (elements ?? []).map((el) => {
    const ratio = contrastRatio(el.color, el.backgroundColor);
    const floor = wcagFloorFor(el);
    return {
      tier: EVIDENCE_TIER.WELL_EVIDENCED,
      giver: "W3C WCAG 2.2, Understanding Success Criterion 1.4.3",
      id: el.id,
      ratio: Math.round(ratio * 100) / 100,
      floor,
      clears: ratio >= floor,
    };
  });
}
