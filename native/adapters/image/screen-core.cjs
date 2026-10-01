// adapters/image/screen-core.cjs — the screenshot → measured-model → HTML core.
//
// MOVED VERBATIM from native/tools/screenshot-to-html.html (PR #144, lines
// 142-736 of that page) so the browser tool and the node pipeline run ONE
// implementation: a second copy is the drift class this repo's own history
// keeps paying for (the native/tests/ copy tree). The tool now loads this
// file with a classic <script src>, which works from file:// as well as over
// http; node loads it through adapters/image/screen-read.js.
//
// It is a UMD on purpose: `module.exports` under node, `window.CV` in the
// page. It stays a .cjs so the package's "type": "module" does not turn the
// classic-script branch into an ESM parse error.
//
// PURE. It takes decoded pixels ({width, height, data: RGBA}) and OCR lines
// and returns a measured model; it decodes nothing and reads no file. The
// constants inside (tolerance, minimum box area, heading ratios, button size
// bounds, …) were set by hand by the tool's author and are NOT measured:
// adapters/image/screen-read.js names every one of them with its giver in
// SCREEN_SETTINGS and carries the ones used on every sidecar (II.11).
/* cv2html core: screenshot pixels + OCR lines -> HTML. Pure functions, no DOM. */
(function (root) {
'use strict';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const h2 = v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
const toHex = c => '#' + h2(c[0]) + h2(c[1]) + h2(c[2]);
const cdist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- color helpers ---------- */
function dominant(img, x0, y0, x1, y1) {
  x0 = clamp(Math.floor(x0), 0, img.width); x1 = clamp(Math.ceil(x1), 0, img.width);
  y0 = clamp(Math.floor(y0), 0, img.height); y1 = clamp(Math.ceil(y1), 0, img.height);
  if (x1 <= x0 || y1 <= y0) return [255, 255, 255];
  const sx = Math.max(1, Math.floor((x1 - x0) / 160)), sy = Math.max(1, Math.floor((y1 - y0) / 160));
  const d = img.data, W = img.width, hist = new Map();
  for (let y = y0; y < y1; y += sy) for (let x = x0; x < x1; x += sx) {
    const i = (y * W + x) * 4;
    const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
    let e = hist.get(k); if (!e) { e = [0, 0, 0, 0]; hist.set(k, e); }
    e[0]++; e[1] += d[i]; e[2] += d[i + 1]; e[3] += d[i + 2];
  }
  let best = null;
  for (const e of hist.values()) if (!best || e[0] > best[0]) best = e;
  return [Math.round(best[1] / best[0]), Math.round(best[2] / best[0]), Math.round(best[3] / best[0])];
}

function meanColor(img, x0, y0, x1, y1) {
  x0 = clamp(Math.floor(x0), 0, img.width); x1 = clamp(Math.ceil(x1), 0, img.width);
  y0 = clamp(Math.floor(y0), 0, img.height); y1 = clamp(Math.ceil(y1), 0, img.height);
  if (x1 <= x0 || y1 <= y0) return [200, 200, 200];
  const sx = Math.max(1, Math.floor((x1 - x0) / 80)), sy = Math.max(1, Math.floor((y1 - y0) / 80));
  const d = img.data, W = img.width; let r = 0, g = 0, b = 0, n = 0;
  for (let y = y0; y < y1; y += sy) for (let x = x0; x < x1; x += sx) { const i = (y * W + x) * 4; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

function sampleInk(img, x0, y0, x1, y1) {
  const W = img.width, d = img.data;
  const bg = dominant(img, x0 - 1, y0 - 1, x1 + 1, y1 + 1);
  x0 = clamp(Math.floor(x0), 0, W); x1 = clamp(Math.ceil(x1), 0, W);
  y0 = clamp(Math.floor(y0), 0, img.height); y1 = clamp(Math.ceil(y1), 0, img.height);
  const sx = Math.max(1, Math.floor((x1 - x0) / 120)), sy = Math.max(1, Math.floor((y1 - y0) / 40));
  const arr = []; let max = 0;
  for (let y = y0; y < y1; y += sy) for (let x = x0; x < x1; x += sx) {
    const i = (y * W + x) * 4;
    const dd = Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]);
    arr.push([dd, d[i], d[i + 1], d[i + 2]]); if (dd > max) max = dd;
  }
  let fr = 0, fg = 0, fb = 0, fn = 0, ink = 0;
  for (const a of arr) {
    if (a[0] >= max * 0.5) ink++;
    if (a[0] >= max * 0.75) { fr += a[1]; fg += a[2]; fb += a[3]; fn++; }
  }
  const fgc = fn ? [fr / fn, fg / fn, fb / fn] : [0, 0, 0];
  return { bg, fg: fgc, contrast: max, inkRatio: arr.length ? ink / arr.length : 0 };
}

/* ---------- flat region segmentation ---------- */
function segment(img, tol) {
  const W = img.width, H = img.height, d = img.data, N = W * H;
  const parent = new Int32Array(N);
  for (let i = 0; i < N; i++) parent[i] = i;
  function find(a) { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, p = i * 4;
      if (x + 1 < W) {
        const q = p + 4;
        if (Math.abs(d[p] - d[q]) + Math.abs(d[p + 1] - d[q + 1]) + Math.abs(d[p + 2] - d[q + 2]) <= tol) {
          const a = find(i), b = find(i + 1); if (a !== b) parent[b] = a;
        }
      }
      if (y + 1 < H) {
        const q = p + W * 4;
        if (Math.abs(d[p] - d[q]) + Math.abs(d[p + 1] - d[q + 1]) + Math.abs(d[p + 2] - d[q + 2]) <= tol) {
          const a = find(i), b = find(i + W); if (a !== b) parent[b] = a;
        }
      }
    }
  }
  const label = new Int32Array(N), rootId = new Int32Array(N).fill(-1);
  const comps = [];
  for (let i = 0; i < N; i++) {
    const r = find(i); let id = rootId[r];
    if (id < 0) { id = comps.length; rootId[r] = id; comps.push({ id, x0: W, y0: H, x1: -1, y1: -1, n: 0, r: 0, g: 0, b: 0 }); }
    label[i] = id;
    const c = comps[id], x = i % W, y = (i / W) | 0;
    if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
    c.n++; c.r += d[i * 4]; c.g += d[i * 4 + 1]; c.b += d[i * 4 + 2];
  }
  for (const c of comps) c.color = [Math.round(c.r / c.n), Math.round(c.g / c.n), Math.round(c.b / c.n)];
  return { W, H, label, comps };
}

function edgeScore(seg, c) {
  const W = seg.W, label = seg.label, id = c.id, bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
  const cx = Math.max(1, Math.floor(bw * 0.15)), cy = Math.max(1, Math.floor(bh * 0.15));
  let hit = 0, tot = 0;
  for (let x = c.x0 + cx; x <= c.x1 - cx; x++) {
    tot += 2; if (label[c.y0 * W + x] === id) hit++; if (label[c.y1 * W + x] === id) hit++;
  }
  for (let y = c.y0 + cy; y <= c.y1 - cy; y++) {
    tot += 2; if (label[y * W + c.x0] === id) hit++; if (label[y * W + c.x1] === id) hit++;
  }
  return tot ? hit / tot : 0;
}

function cornerRadius(seg, c) {
  const W = seg.W, label = seg.label, id = c.id, bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1;
  let a = 0; while (a < bw && label[c.y0 * W + c.x0 + a] !== id) a++;
  let b = 0; while (b < bh && label[(c.y0 + b) * W + c.x0] !== id) b++;
  const r = Math.max(a, b), half = Math.min(bw, bh) / 2;
  if (r < 3) return 0;
  if (r >= half - 1) return 9999;
  return r;
}

function findBoxes(seg, opts) {
  const comps = seg.comps;
  let bgComp = comps[0];
  for (const c of comps) if (c.n > bgComp.n) bgComp = c;
  const boxes = [], rules = [], outlines = [], used = new Set([bgComp.id]);
  for (const c of comps) {
    if (c.id === bgComp.id) continue;
    const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1, area = bw * bh;
    const mn = Math.min(bw, bh), mx = Math.max(bw, bh);
    if (mn <= 4 && mx >= 40 && c.n / area >= 0.85) {
      rules.push({ type: 'rule', x: c.x0, y: c.y0, w: bw, h: bh, color: c.color });
      used.add(c.id); continue;
    }
    if (c.n < opts.minArea || bw < 12 || bh < 12) continue;
    const es = edgeScore(seg, c), fill = c.n / area;
    const thick = c.n / (2 * (bw + bh));
    if (fill < 0.2 && thick <= 4.5) {
      if (es >= 0.9) {
        outlines.push({ x: c.x0, y: c.y0, w: bw, h: bh, color: c.color, thick: clamp(Math.round(thick), 1, 6), radius: cornerRadius(seg, c) });
        used.add(c.id);
      }
      continue;
    }
    if (es < 0.8) continue;
    boxes.push({ type: 'box', x: c.x0, y: c.y0, w: bw, h: bh, color: c.color, radius: cornerRadius(seg, c) });
    used.add(c.id);
  }
  return { bgComp, boxes, rules, outlines, used };
}

function mergeOutlines(boxes, outlines) {
  for (const o of outlines) {
    let best = null;
    for (const b of boxes) {
      if (b.border) continue;
      const s = o.thick + 3;
      if (Math.abs(b.x - (o.x + o.thick)) <= s && Math.abs(b.y - (o.y + o.thick)) <= s &&
          Math.abs((b.x + b.w) - (o.x + o.w - o.thick)) <= s && Math.abs((b.y + b.h) - (o.y + o.h - o.thick)) <= s) {
        if (!best || b.w * b.h > best.w * best.h) best = b;
      }
    }
    if (best) {
      best.x = o.x; best.y = o.y; best.w = o.w; best.h = o.h;
      best.border = { w: o.thick, color: o.color }; best.radius = Math.max(best.radius, o.radius);
    } else {
      boxes.push({ type: 'box', x: o.x, y: o.y, w: o.w, h: o.h, color: o.color, transparent: true, radius: o.radius, border: { w: o.thick, color: o.color } });
    }
  }
  return boxes;
}

/* ---------- image / icon regions (pixels not explained by boxes or text) ---------- */
function findImages(seg, usedArr, texts, opts) {
  const W = seg.W, H = seg.H, label = seg.label, N = W * H, T = 8;
  const left = new Uint8Array(N);
  for (let i = 0; i < N; i++) left[i] = usedArr[label[i]] ? 0 : 1;
  for (const t of texts) {
    const x0 = Math.max(0, Math.floor(t.x0) - 2), x1 = Math.min(W - 1, Math.ceil(t.x1) + 2);
    const y0 = Math.max(0, Math.floor(t.y0) - 2), y1 = Math.min(H - 1, Math.ceil(t.y1) + 2);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) left[y * W + x] = 0;
  }
  const tw = Math.ceil(W / T), th = Math.ceil(H / T);
  const busy = new Uint8Array(tw * th);
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) {
    let n = 0, tot = 0;
    for (let y = ty * T; y < Math.min(H, ty * T + T); y++) for (let x = tx * T; x < Math.min(W, tx * T + T); x++) { n += left[y * W + x]; tot++; }
    if (n >= tot * 0.1) busy[ty * tw + tx] = 1;
  }
  const dil = new Uint8Array(tw * th);
  for (let ty = 0; ty < th; ty++) for (let tx = 0; tx < tw; tx++) if (busy[ty * tw + tx]) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = tx + dx, ny = ty + dy;
      if (nx >= 0 && ny >= 0 && nx < tw && ny < th) dil[ny * tw + nx] = 1;
    }
  }
  const seen = new Uint8Array(tw * th), rects = [];
  for (let s = 0; s < tw * th; s++) {
    if (!dil[s] || seen[s]) continue;
    const stack = [s]; seen[s] = 1;
    let x0 = W, y0 = H, x1 = -1, y1 = -1, cnt = 0;
    while (stack.length) {
      const t = stack.pop(), tx = t % tw, ty = (t / tw) | 0;
      if (busy[t]) {
        for (let y = ty * T; y < Math.min(H, ty * T + T); y++) for (let x = tx * T; x < Math.min(W, tx * T + T); x++) {
          if (left[y * W + x]) { cnt++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
      }
      const nb = [[tx + 1, ty], [tx - 1, ty], [tx, ty + 1], [tx, ty - 1]];
      for (const [nx, ny] of nb) {
        if (nx < 0 || ny < 0 || nx >= tw || ny >= th) continue;
        const ni = ny * tw + nx; if (dil[ni] && !seen[ni]) { seen[ni] = 1; stack.push(ni); }
      }
    }
    if (cnt < 40 || x1 < 0) continue;
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (Math.min(w, h) < 6) continue;
    if (Math.max(w, h) >= 8 * Math.min(w, h) && Math.min(w, h) < 12) continue;
    if (w * h > 2500 && cnt / (w * h) < 0.05) continue;
    rects.push({ x: x0, y: y0, w, h });
  }
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j], s = 2;
      if (a.x <= b.x + b.w + s && b.x <= a.x + a.w + s && a.y <= b.y + b.h + s && b.y <= a.y + a.h + s) {
        const x0 = Math.min(a.x, b.x), y0 = Math.min(a.y, b.y);
        const x1 = Math.max(a.x + a.w, b.x + b.w), y1 = Math.max(a.y + a.h, b.y + b.h);
        rects[i] = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; rects.splice(j, 1); merged = true; break outer;
      }
    }
  }
  return rects.filter(r => r.w * r.h >= 100).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 150)
    .map(r => ({ type: 'image', x: Math.max(0, r.x - 1), y: Math.max(0, r.y - 1), w: Math.min(W, r.w + 2), h: Math.min(H, r.h + 2) }));
}

/* ---------- text ---------- */
function buildTexts(img, lines, opts) {
  const segs = [];
  for (const ln of lines) {
    let words = (ln.words || []).filter(w => w.text && w.text.trim() && w.bbox);
    if (!words.length && ln.text && ln.text.trim() && ln.bbox) words = [{ text: ln.text.trim(), bbox: ln.bbox, confidence: ln.conf }];
    if (!words.length) continue;
    words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
    const lh = Math.max.apply(null, words.map(w => w.bbox.y1 - w.bbox.y0));
    let cur = null;
    for (const w of words) {
      const b = w.bbox;
      if (cur && b.x0 - cur.x1 > Math.max(lh * 1.0, 14)) { segs.push(cur); cur = null; }
      if (!cur) cur = { words: [], x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, conf: 0, n: 0 };
      cur.words.push(w.text.trim());
      cur.x0 = Math.min(cur.x0, b.x0); cur.y0 = Math.min(cur.y0, b.y0);
      cur.x1 = Math.max(cur.x1, b.x1); cur.y1 = Math.max(cur.y1, b.y1);
      cur.conf += (w.confidence != null ? w.confidence : (ln.conf != null ? ln.conf : 80)); cur.n++;
    }
    if (cur) segs.push(cur);
  }
  const out = [];
  for (const s of segs) {
    s.text = s.words.join(' ');
    const conf = s.conf / s.n;
    if (!/[A-Za-z0-9À-￿]/.test(s.text)) continue;
    if (conf < opts.minConf) continue;
    if (s.text.length <= 2 && conf < 80) continue;
    const h = s.y1 - s.y0, w = s.x1 - s.x0;
    if (h < 5 || w < 4) continue;
    const ink = sampleInk(img, s.x0, s.y0, s.x1 + 1, s.y1 + 1);
    if (ink.contrast < 45) continue;
    s.hasAsc = /[A-Z0-9bdfhkltÀ-Ý]/.test(s.text);
    const hasDesc = /[gjpqy,;()\[\]{}]/.test(s.text);
    const ext = (s.hasAsc ? 0.74 : 0.52) + (hasDesc ? 0.21 : 0);
    s.em = clamp(h / ext, 8, 240);
    s.color = ink.fg; s.bg = ink.bg; s.bold = ink.inkRatio > 0.26;
    out.push(s);
  }
  return out;
}

function makePara(seg) { return { type: 'text', lines: [seg], em: seg.em, color: seg.color, bold: seg.bold }; }

function canJoin(p, s) {
  const last = p.lines[p.lines.length - 1], em = p.em;
  if (Math.abs(s.em - em) / em > 0.12) return false;
  if (cdist(p.color, s.color) > 120) return false;
  const gap = s.y0 - last.y1;
  if (gap < -0.25 * em || gap > 1.0 * em) return false;
  if (!(s.x0 < last.x1 && s.x1 > last.x0)) return false;
  const first = p.lines[0];
  const leftOK = Math.abs(s.x0 - first.x0) <= 0.6 * em;
  const cOK = Math.abs((s.x0 + s.x1) / 2 - (last.x0 + last.x1) / 2) <= 0.8 * em;
  const rOK = Math.abs(s.x1 - last.x1) <= 0.6 * em && p.lines.length > 1;
  return leftOK || cOK || rOK;
}

function finalizePara(p) {
  const L = p.lines, em = p.em, n = L.length;
  const base = l => l.y0 + (l.hasAsc ? 0.74 : 0.52) * em;
  let pitch = em * 1.25;
  if (n > 1) pitch = clamp((base(L[n - 1]) - base(L[0])) / (n - 1), em * 1.0, em * 2.4);
  p.lineH = pitch;
  const baseFromTop = (pitch - 1.117 * em) / 2 + 0.905 * em;
  const x0 = Math.min.apply(null, L.map(l => l.x0)), x1 = Math.max.apply(null, L.map(l => l.x1));
  p.x = x0 - 0.04 * em; p.w = x1 - x0 + 0.08 * em;
  p.y = base(L[0]) - baseFromTop; p.h = pitch * n;
  p.align = 'left';
  if (n > 1) {
    const lefts = L.map(l => l.x0), rights = L.map(l => l.x1), cs = L.map(l => (l.x0 + l.x1) / 2);
    const sp = a => Math.max.apply(null, a) - Math.min.apply(null, a);
    if (sp(lefts) <= 0.5 * em) p.align = 'left';
    else if (sp(rights) <= 0.5 * em) p.align = 'right';
    else if (sp(cs) <= 0.8 * em) p.align = 'center';
  }
}

/* ---------- analysis ---------- */
function analyze(img, lines, opts) {
  opts = Object.assign({ tol: 10, minArea: 500, minConf: 45, dpr: 1, ratio: 1, images: true }, opts || {});
  const W = img.width, H = img.height;
  const seg = (opts.seg && opts.seg.tol === opts.tol && opts.seg.W === W && opts.seg.H === H) ? opts.seg : segment(img, opts.tol);
  seg.tol = opts.tol;
  const bf = findBoxes(seg, opts);
  let boxes = mergeOutlines(bf.boxes, bf.outlines);
  boxes.sort((a, b) => b.w * b.h - a.w * a.h);
  boxes = boxes.slice(0, 400);
  const texts = buildTexts(img, lines || [], opts);
  const usedArr = new Uint8Array(seg.comps.length);
  bf.used.forEach(id => { usedArr[id] = 1; });
  const imgs = opts.images ? findImages(seg, usedArr, texts, opts) : [];
  for (const im of imgs) im.color = meanColor(img, im.x, im.y, im.x + im.w, im.y + im.h);

  const root = { type: 'root', x: 0, y: 0, w: W, h: H, color: bf.bgComp.color, children: [] };
  boxes.forEach(b => { b.children = []; });
  const bySmall = boxes.slice().sort((a, b) => a.w * a.h - b.w * b.h);
  function parentOf(cx, cy, minArea) {
    for (const b of bySmall) {
      if (b.w * b.h <= minArea) continue;
      if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) return b;
    }
    return root;
  }
  for (const b of boxes) parentOf(b.x + b.w / 2, b.y + b.h / 2, b.w * b.h).children.push(b);
  for (const r of bf.rules) parentOf(r.x + r.w / 2, r.y + r.h / 2, 0).children.push(r);
  for (const im of imgs) parentOf(im.x + im.w / 2, im.y + im.h / 2, 0).children.push(im);

  const byParent = new Map();
  for (const s of texts) {
    const p = parentOf((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, 0);
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p).push(s);
  }
  const paras = [];
  for (const [p, list] of byParent) {
    list.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
    const ps = [];
    for (const s of list) {
      let joined = false;
      for (let i = ps.length - 1; i >= 0; i--) {
        if (canJoin(ps[i], s)) { ps[i].lines.push(s); joined = true; break; }
      }
      if (!joined) ps.push(makePara(s));
    }
    for (const pp of ps) { finalizePara(pp); p.children.push(pp); paras.push(pp); }
  }

  // headings by relative size
  const single = paras.filter(p => p.lines.length === 1).map(p => p.em).sort((a, b) => a - b);
  const med = single.length ? single[Math.floor(single.length / 2)] : 16;
  let h1Used = false;
  paras.slice().sort((a, b) => b.em - a.em).forEach(p => {
    p.tag = 'p';
    if (p.lines.length > 2) return;
    if (p.em >= 1.7 * med && !h1Used) { p.tag = 'h1'; h1Used = true; }
    else if (p.em >= 1.35 * med) p.tag = 'h2';
    else if (p.em >= 1.15 * med && p.bold) p.tag = 'h3';
  });

  // buttons, header, sections
  (function walk(node, parentColor) {
    for (const c of node.children || []) {
      if (c.type === 'box') {
        const kids = c.children;
        if (kids.length === 1 && kids[0].type === 'text' && kids[0].lines.length === 1 &&
            c.h >= 22 && c.h <= 90 && c.w <= 480 && kids[0].w / c.w >= 0.3 &&
            (c.border || cdist(c.color, parentColor) >= 40)) c.button = true;
        else if (c.w >= 0.9 * W && c.y <= 2 && c.h <= 200 && kids.length >= 2) c.tag = 'header';
        else if (c.w >= 0.9 * W && c.h >= 120) c.tag = 'section';
        walk(c, c.transparent ? parentColor : c.color);
      }
    }
  })(root, root.color);

  const rank = { box: 0, rule: 1, image: 2, text: 3 };
  (function sortKids(n) {
    if (!n.children) return;
    n.children.sort((a, b) => rank[a.type] - rank[b.type] || (b.w * b.h - a.w * a.h));
    n.children.forEach(sortKids);
  })(root);

  const flat = [];
  (function flatten(n) { for (const c of n.children || []) { flat.push(c); flatten(c); } })(root);
  return {
    width: W, height: H, unit: opts.ratio / opts.dpr, root, flat, seg,
    stats: { boxes: flat.filter(n => n.type === 'box').length, texts: paras.length, images: imgs.length, rules: bf.rules.length }
  };
}

function attachCrops(model, cropFn, maxBytes) {
  for (const n of model.flat) if (n.type === 'image' && !n.src && cropFn) n.src = cropFn(n.x, n.y, n.w, n.h);
}

/* ---------- HTML generation ---------- */
const DEFAULT_STACK = "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function generate(model, opts) {
  opts = Object.assign({ mode: 'flex', fontStack: DEFAULT_STACK, measure: null, title: 'Converted page' }, opts || {});
  const u = model.unit, mode = opts.mode, stack = opts.fontStack;
  const P = v => (Math.round(v * u * 100) / 100) + 'px';
  const col = c => toHex(c);

  function bb(items) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const it of items) { x0 = Math.min(x0, it.x); y0 = Math.min(y0, it.y); x1 = Math.max(x1, it.x + it.w); y1 = Math.max(y1, it.y + it.h); }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function ext(it, axis) {
    const s = it.type === 'text' ? (axis === 'y' ? it.h * 0.12 : 0) : 0;
    const pad = 1;
    return axis === 'y' ? [it.y + s + pad, it.y + it.h - s - pad] : [it.x + pad, it.x + it.w - pad];
  }
  function cut(items, axis) {
    const sorted = items.slice().sort((a, b) => ext(a, axis)[0] - ext(b, axis)[0]);
    const groups = []; let cur = null, curMax = -Infinity;
    for (const it of sorted) {
      const [s, e] = ext(it, axis);
      if (!cur || s >= curMax) { cur = { items: [] }; groups.push(cur); curMax = e; }
      cur.items.push(it); curMax = Math.max(curMax, e);
    }
    return groups;
  }

  function renderText(n, extra) {
    let ls = '';
    if (opts.measure) {
      let longest = n.lines[0];
      for (const l of n.lines) if (l.x1 - l.x0 > longest.x1 - longest.x0) longest = l;
      const target = (longest.x1 - longest.x0) * u;
      const mw = opts.measure(longest.text, n.bold ? 700 : 400, n.em * u, stack);
      const chars = Math.max(1, longest.text.length);
      if (mw > 0) {
        const per = clamp((target - mw) / chars, -0.12 * n.em * u, 0.12 * n.em * u);
        if (Math.abs(per) >= 0.05) ls = 'letter-spacing:' + (Math.round(per * 100) / 100) + 'px';
      }
    }
    const st = ['margin:0', 'font:' + (n.bold ? 700 : 400) + ' ' + P(n.em) + '/' + P(n.lineH) + ' ' + stack,
      'color:' + col(n.color), 'white-space:nowrap', 'flex:none'];
    if (n.align !== 'left') st.push('width:' + P(n.w), 'text-align:' + n.align);
    if (ls) st.push(ls);
    if (extra) st.push(extra);
    return '<' + n.tag + ' style="' + st.join(';') + '">' + n.lines.map(l => esc(l.text)).join('<br>') + '</' + n.tag + '>';
  }

  function renderBox(n, extra) {
    const bw = n.border ? n.border.w : 0;
    const st = ['width:' + P(n.w), 'height:' + P(n.h), 'flex:none'];
    if (!n.transparent) st.push('background:' + col(n.color));
    if (n.radius) st.push('border-radius:' + (n.radius >= 9999 ? '9999px' : P(n.radius)), 'overflow:hidden');
    if (bw) st.push('border:' + P(bw) + ' solid ' + col(n.border.color));
    if (n.button) {
      const t = n.children[0];
      st.push('padding:0', 'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center', 'white-space:nowrap',
        'font:' + (t.bold ? 700 : 400) + ' ' + P(t.em) + '/1.2 ' + stack, 'color:' + col(t.color));
      if (!bw) st.push('border:0');
      if (extra) st.push(extra);
      return '<button type="button" style="' + st.join(';') + '">' + esc(t.lines[0].text) + '</button>';
    }
    st.push('display:flow-root');
    let inner = '';
    if (n.children.length) {
      const b = bb(n.children), ox = n.x + bw, oy = n.y + bw;
      if (mode === 'abs') inner = stackLayout(n.children, { x: ox, y: oy, w: n.w - 2 * bw, h: n.h - 2 * bw }, '');
      else inner = layoutGroup(n.children, 'margin-left:' + P(b.x - ox) + ';margin-top:' + P(b.y - oy));
    }
    if (extra) st.push(extra);
    const tag = n.tag || 'div';
    return '<' + tag + ' style="' + st.join(';') + '">' + inner + '</' + tag + '>';
  }

  function renderItem(n, extra) {
    if (n.type === 'text') return renderText(n, extra);
    if (n.type === 'rule') return '<div style="width:' + P(n.w) + ';height:' + P(n.h) + ';background:' + col(n.color) + ';flex:none;' + extra + '"></div>';
    if (n.type === 'image') {
      const base = 'display:block;width:' + P(n.w) + ';height:' + P(n.h) + ';flex:none;' + extra;
      if (n.src) return '<img src="' + n.src + '" alt="' + esc(n.alt || '') + '" style="' + base + ';object-fit:cover">';
      return '<div role="img" aria-label="' + esc(n.alt || 'image') + '" style="' + base + ';background:' + col(n.color) + '"></div>';
    }
    return renderBox(n, extra);
  }

  function stackLayout(items, b, extra) {
    const inner = items.map(it => renderItem(it, 'position:absolute;left:' + P(it.x - b.x) + ';top:' + P(it.y - b.y))).join('');
    return '<div style="position:relative;flex:none;width:' + P(b.w) + ';height:' + P(b.h) + ';' + extra + '">' + inner + '</div>';
  }

  function layoutGroup(items, extra) {
    if (!items.length) return '';
    if (items.length === 1) return renderItem(items[0], extra);
    const b = bb(items);
    if (mode === 'flex') {
      const rows = cut(items, 'y');
      if (rows.length > 1) {
        let html = '', prev = b.y;
        for (const g of rows) {
          const gb = bb(g.items);
          const centered = gb.w < b.w - 8 && Math.abs((gb.x + gb.w / 2) - (b.x + b.w / 2)) <= 3;
          const ml = centered ? 'margin-left:auto;margin-right:auto' : 'margin-left:' + P(gb.x - b.x);
          html += layoutGroup(g.items, 'margin-top:' + P(gb.y - prev) + ';' + ml);
          prev = gb.y + gb.h;
        }
        return '<div style="display:flex;flex-direction:column;align-items:flex-start;flex:none;width:' + P(b.w) + ';' + extra + '">' + html + '</div>';
      }
      const cols = cut(items, 'x');
      if (cols.length > 1) {
        let html = '', prev = b.x;
        for (const g of cols) {
          const gb = bb(g.items);
          html += layoutGroup(g.items, 'margin-left:' + P(gb.x - prev) + ';margin-top:' + P(gb.y - b.y));
          prev = gb.x + gb.w;
        }
        return '<div style="display:flex;flex-direction:row;align-items:flex-start;flex:none;width:' + P(b.w) + ';' + extra + '">' + html + '</div>';
      }
    }
    return stackLayout(items, b, extra);
  }

  const r = model.root;
  let body;
  if (mode === 'abs') {
    body = stackLayout(r.children, { x: 0, y: 0, w: r.w, h: r.h }, '');
  } else {
    const b = r.children.length ? bb(r.children) : { x: 0, y: 0 };
    body = layoutGroup(r.children, 'margin-left:' + P(b.x) + ';margin-top:' + P(b.y));
  }
  return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + esc(opts.title) + '</title>\n<style>\n*{box-sizing:border-box}\nbody{margin:0;background:' + col(r.color) + ';font-family:' + stack + '}\n#page{position:relative;width:' + P(r.w) + ';min-height:' + P(r.h) + ';margin:0 auto;overflow:hidden;background:' + col(r.color) + '}\n</style>\n</head>\n<body>\n<div id="page">\n' + body + '\n</div>\n</body>\n</html>\n';
}

/* ---------- OCR helpers ---------- */
function lineAvgConf(l) {
  const ws = (l.words || []).filter(w => w.confidence != null);
  return ws.length ? ws.reduce((s, w) => s + w.confidence, 0) / ws.length : (l.conf != null ? l.conf : 0);
}
function overlapFrac(a, b) { // intersection over area of a
  const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const area = Math.max(1, (a.x1 - a.x0) * (a.y1 - a.y0));
  return ix * iy / area;
}
// Merge a second OCR pass (e.g. on the inverted image) into the first: keep good lines from the
// first pass, add lines from the second only where the first found nothing usable.
function mergeOCR(first, second) {
  const good = first.filter(l => lineAvgConf(l) >= 50);
  const out = good.slice();
  for (const l of second) {
    if (lineAvgConf(l) < 60) continue;
    if (good.some(g => overlapFrac(l.bbox, g.bbox) > 0.3)) continue;
    out.push(l);
  }
  return out;
}
// Dark or strongly colored boxes where page-level OCR tends to fail (light text on dark or saturated fills).
function weakRegions(img, model) {
  const out = [];
  for (const b of model.flat) {
    if (b.type !== 'box' || b.transparent) continue;
    if (b.h < 18 || b.h > 200 || b.w < 30) continue;
    if (b.children.some(c => c.type === 'image' && c.w * c.h > 0.25 * b.w * b.h)) continue;
    const l = 0.2126 * b.color[0] + 0.7152 * b.color[1] + 0.0722 * b.color[2];
    const sat = Math.max(b.color[0], b.color[1], b.color[2]) - Math.min(b.color[0], b.color[1], b.color[2]);
    if (!(l < 140 || sat > 90)) continue;
    const ink = sampleInk(img, b.x + 2, b.y + 2, b.x + b.w - 2, b.y + b.h - 2);
    if (ink.contrast < 80 || ink.inkRatio < 0.01) continue;
    out.push({ x: b.x, y: b.y, w: b.w, h: b.h });
  }
  return out.sort((a, b) => b.w * b.h - a.w * a.h);
}
// Replace OCR lines whose center lies inside rect with lines read from that region (already in page coordinates).
function applyRegionLines(lines, rect, regionLines) {
  const inside = l => {
    const cx = (l.bbox.x0 + l.bbox.x1) / 2, cy = (l.bbox.y0 + l.bbox.y1) / 2;
    return cx >= rect.x && cx <= rect.x + rect.w && cy >= rect.y && cy <= rect.y + rect.h;
  };
  return lines.filter(l => !inside(l)).concat(regionLines.filter(l => lineAvgConf(l) >= 60));
}

const api = { analyze, generate, attachCrops, segment, dominant, mergeOCR, weakRegions, applyRegionLines, DEFAULT_STACK };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CV = api;
})(typeof window !== 'undefined' ? window : globalThis);
