// ═══ COMP CONSENSUS — reasoning over many comps: what recurs is the pattern, what appears once is that comp's own ═══
//
// PURE (no I/O, no model). comp-read.js reads ONE comp into a spec (zones of a kind, fields with a role, counts, a palette) and knows no subject. This organ reads
// MANY specs together, the way a person who has looked at a dozen screens of one kind knows what such a screen holds without copying any of them:
//   - a ZONE KIND is part of the pattern if it appears in at least FLOOR comps (a structural 2: one comp is an instance, not a pattern — the same floor binding.js and
//     the kind-induction code use) AND it recurs more than the same comps' own zones would put it there by chance (a null: each comp's zone kinds redealt across comps,
//     every comp keeping its own zone count and the whole harvest keeping its kind frequencies, so only "this kind belongs on this kind of screen" is destroyed);
//   - the ORDER of recurring kinds is their median vertical position (0 = top, 1 = bottom) across the comps that have them;
//   - a COUNT (cards in a strip, rows in a stack) is the median across the comps that have the kind, with its spread said, never a single comp's number;
//   - the ROLES a kind's fields carry (headline, fact, aside, ...) recur the same way.
// Device chrome (status bars) is the device's, not the app's, and is dropped before anything is counted. A palette is NOT reasoned over: colours do not recur as structure,
// only whether the screens run light or dark does (the majority, said with its split).
//
// What is not claimed: that the consensus is a good layout, only that it is what recurs in the comps that were found, with the control that says it is not an accident of a
// small harvest. Every number it outputs says how many comps it rests on. With fewer than FLOOR usable comps it refuses (`too_few_comps`) rather than echo one.
export const CONSENSUS_SCHEMA = "EOCompConsensus@1";
/** a pattern needs at least two instances: a structural minimum by construction (one instance has no recurrence to test) — the same 2 as emergence/binding.js's arrivals floor and the kind-standing recurrence floor (P4: declared, never tuned) */
export const FLOOR = 2;
/** draws of the redeal null: 200 is the standing null-arm number this repo declared for its other nulls (the kinds arm, 2026-08-16), reused here and never tuned against a result */
export const NULL_DRAWS = 200;
/** the alpha a kind must beat: 0.05, network-standing.js's convention (set by hand there, 2026-08-16), reused here and then divided by the number of kinds tried */
export const NULL_ALPHA = 0.05;

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const lum = (rgb) => (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;

/** the app's own zones of one spec, chrome dropped: [{ kind, y (0..1 centre), n, roles:[...] }] in reading order */
export function zonesOf(spec) {
  const H = spec?.canvas?.height || 1, byId = new Map((spec?.fields ?? []).map((f) => [f.id, f]));
  return (spec?.zones ?? []).filter((z) => z.kind !== "chrome").map((z) => ({ kind: z.kind, y: (z.at.y + z.at.h / 2) / H, n: z.n ?? null, entry: z.entry ?? null, roles: [...new Set((z.fields ?? []).map((id) => byId.get(id)?.role).filter(Boolean))] }));
}

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

/**
 * consensus(specs, { floor, draws, seed }) -> { schema, comps, kinds:[{ kind, comps, share, y, n:{median, min, max}|null, roles:[{role, comps}], nullRate, beatsNull }], order:[kind], scheme:{light, dark}, refused? }
 *   kinds are the recurring ones only (>= floor comps); `order` is the median top-to-bottom order of those that also beat the null; `refused` names why there is no consensus.
 */
export function consensus(specs, { floor = FLOOR, draws = NULL_DRAWS, alpha = NULL_ALPHA, seed = 1 } = {}) {
  const per = specs.map(zonesOf).filter((z) => z.length);
  if (per.length < floor) return { schema: CONSENSUS_SCHEMA, comps: per.length, kinds: [], order: [], refused: { type: "too_few_comps", detail: `${per.length} comp(s) with readable zones; a pattern needs at least ${floor}` } };
  const kindsAll = [...new Set(per.flatMap((z) => z.map((x) => x.kind)))];
  // every kind is a separate try at "this recurs": trying more kinds raises the bar (signal.js's rule — the search inflates), so each is held to alpha / kinds tried
  const alphaEff = alpha / kindsAll.length;
  const compsWith = (k, pz = per) => pz.filter((z) => z.some((x) => x.kind === k)).length;
  // the null: pool every zone-kind occurrence of the harvest, deal them back to comps keeping each comp's own zone count — which comp holds a kind is destroyed, how common the kind is is kept
  const pool = per.flatMap((z) => z.map((x) => x.kind)), r = rng(seed), atLeast = new Map(kindsAll.map((k) => [k, 0]));
  const observed = new Map(kindsAll.map((k) => [k, compsWith(k)]));
  for (let d = 0; d < draws; d++) {
    const p = [...pool]; for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    let at = 0; const dealt = per.map((z) => { const part = p.slice(at, at + z.length); at += z.length; return part; });
    for (const k of kindsAll) if (dealt.filter((part) => part.includes(k)).length >= observed.get(k)) atLeast.set(k, atLeast.get(k) + 1);
  }
  const kinds = kindsAll.filter((k) => observed.get(k) >= floor).map((k) => {
    const here = per.map((z) => z.filter((x) => x.kind === k)).filter((a) => a.length), ys = here.map((a) => a[0].y), ns = here.flatMap((a) => a.map((x) => x.n).filter((n) => n != null));
    const roleCount = new Map(); for (const a of here) for (const role of new Set(a.flatMap((x) => x.roles))) roleCount.set(role, (roleCount.get(role) ?? 0) + 1);
    const nullRate = atLeast.get(k) / draws;
    return { kind: k, comps: observed.get(k), share: +(observed.get(k) / per.length).toFixed(3), y: +median(ys).toFixed(3), n: ns.length ? { median: median(ns), min: Math.min(...ns), max: Math.max(...ns) } : null,
      roles: [...roleCount.entries()].filter(([, c]) => c >= floor).map(([role, comps]) => ({ role, comps })).sort((a, b) => b.comps - a.comps), nullRate: +nullRate.toFixed(3), beatsNull: nullRate < alphaEff };
  }).sort((a, b) => a.y - b.y);
  const lights = specs.map((s) => (s?.palette ?? []).slice().sort((a, b) => b.frac - a.frac)[0]).filter(Boolean).map((p) => lum(p.rgb) >= 0.5);
  return { schema: CONSENSUS_SCHEMA, comps: per.length, draws, alpha, alphaEff: +alphaEff.toFixed(4), kinds, order: kinds.filter((k) => k.beatsNull).map((k) => k.kind),
    scheme: lights.length ? { light: lights.filter(Boolean).length, dark: lights.filter((x) => !x).length } : null,
    note: kinds.length && !kinds.some((k) => k.beatsNull) ? "kinds recur, but none beats the null at this harvest size: more comps are needed before this is called a pattern" : null };
}

/** the consensus as a sentence a person would say ("a title, a summary, a strip of about 4 cards — from 5 comps") */
export function describeConsensus(c) {
  if (c.refused) return `no pattern: ${c.refused.detail}`;
  const part = (k) => k.kind === "strip" ? `a strip of about ${k.n?.median ?? "several"} cards` : k.kind === "rows" ? `a stack of about ${k.n?.median ?? "several"} label/value rows` : k.kind === "list" ? `a list of about ${k.n?.median ?? "several"} entries` : k.kind === "tabs" ? `${k.n?.median ?? "several"} tabs` : `a ${k.kind}`;
  const ks = c.kinds.filter((k) => k.beatsNull);
  return ks.length ? `${ks.map(part).join(", then ")} — what recurs in ${c.comps} comps (each beats a ${c.draws}-draw null at ${c.alphaEff})` : `${c.comps} comps, no zone kind that beats the null yet`;
}
