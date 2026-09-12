// relative.js — an experiment: addresses that are relative, resolution by state.
//
// Everything the record holds today is reached by an ABSOLUTE address: a seq
// in a ledger, `name#start-end` into a source's bytes, an mxc in a media
// store. That is a graph database's way — a key, a lookup, exact or nothing.
// A brain has no such keys. A neuron is where its connections put it, a
// memory is a pattern the network settles into from a partial cue, and an
// address is only ever RELATIVE: to the cue that is active now, or to the
// neighbour one step away.
//
// This module is that other way, kept pure so it can be measured:
//
//   sdrOf(text)         a sparse distributed representation — the "state"
//                       a text puts the field into: which of n bits it lights
//   Field               nodes with NO keys. The only ways in are recall(cue)
//                       — start from a state and let activation spread until
//                       it settles — and after(node)/before(node), one
//                       synapse along. There is no get(id). There is no id.
//   nullBand(field, …)  what a cue of that length pulls out of this field by
//                       chance: measured with random cues, never chosen
//   serialize()         nodes with their neighbours named by signature, not
//                       by position, so a re-ordered or re-numbered store
//                       rebuilds the same field
//
// And the third thing the two ways of addressing make between them — the
// Pattern over the Ground and the Figure: `reanchor` and `drift` in
// relative-pattern.js, which take an absolute address and a figure recalled
// from the same bytes and say whether they still agree, and mint the ground
// address anew from the figure when they do not.
//
// Structural constants, stated: n = 4096 bits per state; a token lights one
// bit. Density is whatever the text makes it; overlap is cosine over bits,
// so long and short texts compare on one scale. No activation threshold is
// chosen anywhere — the null band decides what counts as a recall.

// Declared, not measured (spec F4, P130): set by hand for the 2026-09-07
// relative-address experiment, the value every number in
// GROUND-FIGURE-PATTERN-SPEC.md §0 was measured with — a structural size,
// never a cut (nothing is decided against it). GFP Pass 36 measures its
// sensitivity (2,048 / 4,096 / 8,192) and confirms or replaces it in the
// record.
export const SDR_BITS = 4096;
/** Joins an ordered pair of words into one token; a word never contains it. */
export const PAIR = "\u0001";
export const isWord = (t) => !t.includes(PAIR);

/** FNV-1a over a string, 32 bits; the same token lights the same bit anywhere. */
export function hash32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** Words and their ordered pairs — order is part of the state, so "war and
 * peace" and "peace and war" light different bits. */
export function tokensOf(text) {
  const words = String(text ?? "").toLowerCase().match(/[\p{L}\p{N}']+/gu) ?? [];
  const out = words.slice();
  for (let i = 1; i < words.length; i++) out.push(`${words[i - 1]}${PAIR}${words[i]}`);
  return out;
}
/** The state a text lights: a sorted array of distinct bit indices. */
export function sdrOf(text, { bits = SDR_BITS } = {}) {
  const set = new Set();
  for (const t of tokensOf(text)) set.add(hash32(t) % bits);
  return Uint32Array.from([...set].sort((a, b) => a - b));
}
/** |a ∩ b| over sorted index arrays. */
export function sharedBits(a, b) {
  let i = 0, j = 0, n = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { n++; i++; j++; } else if (a[i] < b[j]) i++; else j++; }
  return n;
}
/** Cosine over lit bits: 1 for the same state, 0 for nothing shared. */
export function overlap(a, b) { return a.length && b.length ? sharedBits(a, b) / Math.sqrt(a.length * b.length) : 0; }

/** A node is a state, a payload, and its synapses. It has no key. */
class Node {
  constructor(text, payload) { this.sdr = sdrOf(text); this.text = text; this.payload = payload; this.next = new Map(); this.prev = new Map(); this.signature = hash32(text).toString(16); }
}

/**
 * The field. Admit texts in the order they arrived and each is joined to the
 * one before it by a synapse of weight 1 (temporal adjacency — what a brain
 * gets for free from time). Recall starts from a cue's state, activates every
 * node by overlap, then lets activation spread along synapses for `steps`
 * rounds with gain `spread`, and reports where it settled. Nothing here is
 * looked up; everything is reached.
 */
export class Field {
  constructor({ spread = 0.25, steps = 1 } = {}) { this.nodes = []; this.spread = spread; this.steps = steps; this.last = null; this.vocab = new Map(); }
  get size() { return this.nodes.length; }
  /** Admit a text; it is joined to whatever was admitted just before it. */
  admit(text, payload = null, { after = this.last } = {}) {
    const node = new Node(text, payload);
    if (after) { after.next.set(node, (after.next.get(node) ?? 0) + 1); node.prev.set(after, (node.prev.get(after) ?? 0) + 1); }
    this.nodes.push(node); this.last = node;
    for (const w of tokensOf(text)) if (isWord(w)) this.vocab.set(w, (this.vocab.get(w) ?? 0) + 1);
    return node;
  }
  /** Strengthen a synapse between two nodes that were reached together (Hebb). */
  bind(a, b, w = 1) { a.next.set(b, (a.next.get(b) ?? 0) + w); b.prev.set(a, (b.prev.get(a) ?? 0) + w); }
  /** One synapse forward or back: the neighbour the strongest link names. */
  after(node) { let best = null, bw = 0; for (const [n, w] of node.next) if (w > bw) { best = n; bw = w; } return best; }
  before(node) { let best = null, bw = 0; for (const [n, w] of node.prev) if (w > bw) { best = n; bw = w; } return best; }
  /**
   * Start from a cue's state and settle. Returns the nodes in activation
   * order with the activation each settled at; nothing about which counts
   * as a recall — that is the null band's to say (see `recallAgainstNull`).
   */
  recall(cue, { steps = this.steps, spread = this.spread } = {}) {
    const q = typeof cue === "string" ? sdrOf(cue) : cue;
    let a = new Float64Array(this.nodes.length);
    const index = new Map(this.nodes.map((n, i) => [n, i]));
    for (let i = 0; i < this.nodes.length; i++) a[i] = overlap(q, this.nodes[i].sdr);
    for (let s = 0; s < steps; s++) {
      const b = Float64Array.from(a);
      for (let i = 0; i < this.nodes.length; i++) {
        if (!a[i]) continue;
        for (const [n, w] of this.nodes[i].next) b[index.get(n)] += spread * w * a[i];
        for (const [n, w] of this.nodes[i].prev) b[index.get(n)] += spread * w * a[i];
      }
      a = b;
    }
    const order = [...a.keys()].sort((i, j) => a[j] - a[i]);
    return order.map((i) => ({ node: this.nodes[i], activation: a[i] }));
  }
  /**
   * What a cue of `tokenCount` words pulls out of THIS field by chance: random
   * words drawn from the field's own vocabulary, `draws` times; the band is
   * the lowest and highest top activation seen, and the widest gap between a
   * top and its runner-up. Measured, not chosen.
   *
   * `steps`/`spread` are NEW (2026-09-08), additive, and default to the
   * field's own — every existing caller is byte-identical. They exist
   * because a null band measured at one hop count is the wrong control for
   * a recall measured at another: more spreading steps changes what chance
   * alone can pull out of this field, so a multi-hop question ("does this
   * cue still settle on something above chance after N hops") needs its own
   * band at that same N, never the field's default band reused past hop 1.
   */
  nullBand(tokenCount, { draws = 200, rng = Math.random, steps = this.steps, spread = this.spread } = {}) {
    const words = [...this.vocab.keys()];
    if (!words.length || !this.nodes.length) return { lo: 0, hi: 0, margin: 0, draws: 0, steps };
    let lo = Infinity, hi = 0, margin = 0;
    for (let d = 0; d < draws; d++) {
      const cue = Array.from({ length: Math.max(1, tokenCount) }, () => words[Math.floor(rng() * words.length)]).join(" ");
      const r = this.recall(cue, { steps, spread });
      const top = r[0]?.activation ?? 0, second = r[1]?.activation ?? 0;
      lo = Math.min(lo, top); hi = Math.max(hi, top); margin = Math.max(margin, top - second);
    }
    return { lo: lo === Infinity ? 0 : lo, hi, margin, draws, steps };
  }
  /**
   * A recall that says whether it is one: the top node when its activation
   * clears the null band AND its lead over the runner-up exceeds the widest
   * lead chance produced; `ambiguous` when the field settled on more than
   * one figure; `nothing` when it is inside the band.
   *
   * `steps`/`spread` (new, additive, default the field's own — every
   * existing caller unchanged): passed to BOTH the recall and a
   * self-measured band, so a caller cannot accidentally compare a hop-N
   * recall against a hop-1 band by only setting one of the two. A `band`
   * passed in explicitly is trusted as already measured at the right hop
   * count — the caller's own responsibility, same as before.
   */
  recallAgainstNull(cue, { band = null, draws = 200, steps = this.steps, spread = this.spread } = {}) {
    const words = tokensOf(cue).filter(isWord).length;
    const b = band ?? this.nullBand(words, { draws, steps, spread });
    const r = this.recall(cue, { steps, spread });
    const top = r[0], second = r[1];
    if (!top || top.activation <= b.hi) return { kind: "nothing", top: top ?? null, band: b, ranked: r };
    if (second && top.activation - second.activation <= b.margin) return { kind: "ambiguous", top, second, band: b, ranked: r };
    return { kind: "figure", top, band: b, ranked: r };
  }
  /** Nodes with their neighbours named by SIGNATURE — a store with no positions. */
  serialize() {
    return this.nodes.map((n) => ({ text: n.text, payload: n.payload, signature: n.signature, next: [...n.next].map(([m, w]) => [m.signature, w]), prev: [...n.prev].map(([m, w]) => [m.signature, w]) }));
  }
  static deserialize(rows, opts) {
    const f = new Field(opts);
    const bySig = new Map();
    for (const r of rows) { const n = new Node(r.text, r.payload); bySig.set(r.signature, n); f.nodes.push(n); for (const w of tokensOf(r.text)) if (isWord(w)) f.vocab.set(w, (f.vocab.get(w) ?? 0) + 1); }
    for (const r of rows) { const n = bySig.get(r.signature); for (const [sig, w] of r.next ?? []) { const m = bySig.get(sig); if (m) n.next.set(m, w); } for (const [sig, w] of r.prev ?? []) { const m = bySig.get(sig); if (m) n.prev.set(m, w); } }
    f.last = f.nodes.at(-1) ?? null;
    return f;
  }
}
