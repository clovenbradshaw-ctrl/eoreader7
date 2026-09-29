// build-ohs-reading-index.mjs — generate the pre-built FoldReadingIndex@2 JSON that the
// holodeck's reading-worker fetches instead of downloading and decompressing the full .zst
// in the browser. Run this whenever the ground-readings .zst changes, then commit the result.
//
//   node plans/build-ohs-reading-index.mjs [path/to/file.jsonl.zst]
//
// Default input: ../ohs-custody/ground-readings/*.jsonl.zst (alphabetically last, i.e. newest).
// Output: same directory, same basename + .index.json.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CUSTODY = join(HERE, '..', '..', 'ohs-custody');

// zstd frame header → declared content size.
function frameSize(b) {
  if (b[0] !== 0x28 || b[1] !== 0xB5 || b[2] !== 0x2F || b[3] !== 0xFD) throw new Error('not a zstd frame');
  const fhd = b[4], fcs = fhd >> 6, single = (fhd >> 5) & 1, did = [0, 1, 2, 4][fhd & 3];
  let o = 5 + (single ? 0 : 1) + did;
  const n = fcs === 0 ? (single ? 1 : 0) : [0, 2, 4, 8][fcs]; if (!n) return null;
  let v = 0; for (let i = n - 1; i >= 0; i--) v = v * 256 + b[o + i]; return n === 2 ? v + 256 : v;
}

const inc = (o, k, n) => { o[k] = (o[k] || 0) + (n || 1); };

function buildIndex(lines, fromUrl) {
  const t0 = Date.now();
  let cur = null, seq = 0, bad = 0;
  const src = {}; const S = s => src[s] || (src[s] = { chunks: 0, chars: 0, ops: {}, terrain: {}, kinds: {}, cast: {}, bonds: {}, idChurn: {} });
  const cast = new Map(); const bonds = new Map(); const canon = new Map(); const ids = new Map(); const kinds = {}; const order = [];
  const onLine = l => {
    if (!l) return; let j; try { j = JSON.parse(l); } catch (x) { bad++; return; }
    if (j.schema === 'Encounter@1') { cur = j.source; seq++; const X = S(cur); X.chunks++; X.chars += j.extent || 0; if (!order.includes(cur)) order.push(cur); return; }
    if (j.schema !== 'DeltaFold@1' || !cur) return; const X = S(cur);
    for (const o of j.operations || []) {
      const c = o.consequence || {}; const k = o.operator + '/' + (c.kind || '?'); inc(kinds, k); inc(X.kinds, k); inc(X.ops, o.operator); inc(X.terrain, o.terrain);
      const v = o.payload && o.payload.value; if (!v) continue;
      if (v.schema === 'EOReferent@1') { const id = v.id; let R = cast.get(id); if (!R) { R = { id, surfaces: [], standing: v.standing, mentions: 0, src: {}, first: cur, firstSeq: seq }; cast.set(id, R); } (v.surfaces || []).forEach(s => { if (!R.surfaces.includes(s)) R.surfaces.push(s); }); R.mentions = Math.max(R.mentions, v.mentions || 0); R.standing = v.standing || R.standing; inc(R.src, cur); inc(X.cast, (v.surfaces || [id])[0]); }
      else if (v.schema === 'EOHyperedge@1') { const P = (v.participants || []).map(p => p.surface || p.surfaceKey || '?'); if (P.length < 2) continue; const key = P.slice(0, 2).sort().join(' — '); let B = bonds.get(key); if (!B) { B = { a: P[0], b: P[1], n: 0, rel: {}, pos: 0, neg: 0, src: {}, first: cur, firstSeq: seq }; bonds.set(key, B); } B.n++; inc(B.rel, v.relation || '?'); if ((v.meta && v.meta.polarity) === '-') B.neg++; else B.pos++; inc(B.src, cur); inc(X.bonds, key); }
      else if (v.schema === 'EOCanonicalHyperedge@1') { const P = (v.participants || []).map(p => p.value); if (P.length < 2) continue; const key = P.slice(0, 2).sort().join(' — '); let B = canon.get(key); if (!B) { B = { a: P[0], b: P[1], n: 0, alts: {}, src: {} }; canon.set(key, B); } B.n++; (v.participants || []).forEach(p => (p.alternatives || []).forEach(a => { if (a !== p.value) inc(B.alts, a); })); inc(B.src, cur); }
      else if (v.schema === 'EOIdentityAlternative@1') { const key = v.left + ' ↔ ' + v.right; let I = ids.get(key); if (!I) { I = { left: v.left, right: v.right, n: 0, events: {}, src: {} }; ids.set(key, I); } I.n++; inc(I.events, c.kind || v.standing || '?'); inc(I.src, cur); inc(X.idChurn, key); }
      else if (c.kind === 'identity_split' || c.kind === 'identity_reading_refused' || c.kind === 'identity_hypothesis_supported') { const key = c.identity || (o.inputs || []).join(' ↔ '); let I = ids.get(key); if (!I) { I = { left: (o.inputs || [])[0] || key, right: (o.inputs || [])[1] || '', n: 0, events: {}, src: {} }; ids.set(key, I); } I.n++; inc(I.events, c.kind); inc(I.src, cur); inc(X.idChurn, key); }
    }
  };
  lines.forEach(onLine);
  const top = (m, n, sc) => [...m.values()].sort((a, b) => sc(b) - sc(a)).slice(0, n).map(x => ({ ...x, srcN: Object.keys(x.src || {}).length }));
  const trim = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 25));
  Object.values(src).forEach(X => { X.cast = trim(X.cast); X.bonds = trim(X.bonds); X.idChurn = trim(X.idChurn); });
  return { schema: 'FoldReadingIndex@2', from: fromUrl, cursor: null, builtAt: new Date().toISOString(), ms: Date.now() - t0, lines: lines.length, bad, encounters: seq, order, sources: src, kinds,
    castTotal: cast.size, cast: top(cast, 3000, x => x.mentions * 10 + Object.keys(x.src).length),
    bondsTotal: bonds.size, bonds: top(bonds, 3000, x => x.n + 3 * Object.keys(x.src).length),
    canonTotal: canon.size, canon: top(canon, 1500, x => x.n),
    identitiesTotal: ids.size, identities: top(ids, 1500, x => x.n) };
}

// Find the input .zst file.
let zstPath = process.argv[2];
if (!zstPath) {
  const dir = join(CUSTODY, 'ground-readings');
  const files = readdirSync(dir).filter(f => f.endsWith('.jsonl.zst')).sort();
  if (!files.length) { console.error('No .jsonl.zst files found in', dir); process.exit(1); }
  zstPath = join(dir, files[files.length - 1]);
}

console.error('Reading', zstPath);
const buf = new Uint8Array(readFileSync(zstPath));

// Decompress with @bokuweb/zstd-wasm (same library the browser worker uses).
const { default: zstdInit } = await import('https://esm.sh/@bokuweb/zstd-wasm@0.0.27');
await zstdInit();
const { decompress } = await import('https://esm.sh/@bokuweb/zstd-wasm@0.0.27');
const raw = decompress(buf);
const want = frameSize(buf);
if (want !== null && raw.length !== want) { console.error('Size mismatch:', raw.length, 'vs declared', want); process.exit(1); }
if (raw.length < 1000 || raw[0] !== 123) { console.error('Decompressed bytes are not JSON lines'); process.exit(1); }

console.error('Decompressed', (raw.length / 1e6).toFixed(1), 'MB — indexing...');
const fromUrl = 'https://raw.githubusercontent.com/clovenbradshaw-ctrl/ohs-custody/main/ground-readings/' + basename(zstPath);
const lines = new TextDecoder().decode(raw).split('\n');
const index = buildIndex(lines, fromUrl);

const outPath = zstPath.replace(/\.zst$/, '.index.json');
writeFileSync(outPath, JSON.stringify(index));
console.error('Written', outPath);
console.error('encounters:', index.encounters, '· cast:', index.castTotal, '· bonds:', index.bondsTotal, '· identities:', index.identitiesTotal);
console.error('Commit ground-readings/' + basename(outPath) + ' to the ohs-custody repo.');
