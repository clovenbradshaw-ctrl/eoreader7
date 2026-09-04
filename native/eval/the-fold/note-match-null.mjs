// note-match-null.mjs — ZERO model calls. The note-to-note matcher run across
// EVERY note in the rich walk that has a readable cited face, both act arms,
// against a seeded-derangement null drawn 20 times (the discipline
// `slicer-null` already uses: one draw is not a null).
//
// The two matcher arms across EVERY note in the rich walk
// that has a readable cited face — and a seeded-derangement null drawn 20
// times, the discipline the slicer's null already uses.
import { readFileSync, existsSync } from "node:fs";
const HERE = "/Users/mlacy/Documents/3.0/eoreader7/native/eval/the-fold/";
const FIX = HERE + "fixtures/";
process.env.FINE = "1"; process.env.VERBS = "both"; process.env.ATTEST = "1";
const { reader, chunkSource, sameAct, textFeatures } = await import(HERE + "note-match-zero.mjs");
const posPrior = JSON.parse(readFileSync(FIX + "pos-prior-eng.json", "utf8"));
const auxDominant = (w) => { const a = posPrior.forms?.[String(w).toLowerCase()]; if (!a) return false; const t = Object.values(a).reduce((x, y) => x + y, 0); return t > 0 && (a.AUX ?? 0) / t > 0.5; };
const headAct = (act) => { const t = String(act ?? "").trim().split(/\s+/).filter(Boolean); for (let i = t.length - 1; i >= 0; i -= 1) if (!auxDominant(t[i])) return t[i].toLowerCase(); return t.at(-1)?.toLowerCase() ?? ""; };
const backwards = JSON.parse(readFileSync(HERE + "results/ranke-backwards.json", "utf8"));
const endsOf = (r) => { const m = String(r.note).match(/^(.*?) —(.*?)→ (.*)$/); return m ? { end1: m[1], label: m[2], end2: m[3] } : null; };
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const feats = (t) => [...textFeatures(t)];
const PRON = /^(they|he|she|it|we|this|that|these|those|of|all of the)$/i;
const ov = (a, b) => a.filter((w) => b.some((x) => x === w || sameAct(x, w))).length;
const cache = new Map();
function edgesOf(p) {
  if (cache.has(p)) return cache.get(p);
  if (!p || !existsSync(FIX + p)) { cache.set(p, null); return null; }
  const ps = chunkSource(p, readFileSync(FIX + p, "utf8"));
  const rel = reader(ps, { pool: ps });
  const out = (rel.edges ?? []).map((e) => ({ s: feats(e.end1), a: String(e.label ?? ""), o: feats(e.end2), e, sent: norm(e.spans?.[0]?.text ?? "") }));
  cache.set(p, out); return out;
}
function match(ends, edges, useHead) {
  const s = feats(ends.end1), o = feats(ends.end2), pron = PRON.test(ends.end1.trim());
  for (const f of edges) {
    const subj = pron ? null : ov(s, f.s) > 0;
    let act = f.a && (f.a.toLowerCase() === ends.label.toLowerCase() || sameAct(f.a, ends.label));
    if (!act && useHead && f.a) { const hN = headAct(ends.label), hF = headAct(f.a); act = !!hN && !!hF && (hN === hF || sameAct(hN, hF)); }
    if (!act || subj === false || ov(o, [...f.o, ...f.s]) < 1) continue;
    return f;
  }
  return null;
}
const rows = backwards.real.rows.filter((r) => r.facePath && endsOf(r));
const usable = [];
for (const r of rows) { const e = edgesOf(r.facePath); if (e && e.length) usable.push({ r, ends: endsOf(r), edges: e }); }
console.log(`notes with a readable cited face: ${usable.length} of ${rows.length} (faces cached: ${cache.size})`);
// seeded derangement — end2 permuted across notes, every end2 kept, only which
// note it belongs to destroyed
const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function derange(n, rnd) { const p = [...Array(n).keys()]; for (let i = n - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < n; i += 1) if (p[i] === i) { const j = (i + 1) % n; [p[i], p[j]] = [p[j], p[i]]; } return p; }
for (const useHead of [false, true]) {
  const real = usable.filter((u) => match(u.ends, u.edges, useHead)).length;
  const nulls = [];
  for (let d = 0; d < 20; d += 1) {
    const p = derange(usable.length, mulberry(1000 + d));
    nulls.push(usable.filter((u, i) => match({ ...u.ends, end2: usable[p[i]].ends.end2 }, u.edges, useHead)).length);
  }
  nulls.sort((a, b) => a - b);
  const med = nulls[10], beat = nulls.filter((x) => x >= real).length;
  console.log(`${useHead ? "B act-head" : "A baseline "}: real ${real}  |  null median ${med}, range ${nulls[0]}-${nulls[19]}, draws >= real: ${beat}/20  (p ~ ${(beat / 20).toFixed(3)})`);
}
