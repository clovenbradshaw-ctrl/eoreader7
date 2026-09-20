// block-surface.mjs — THE SURFACE (Lens · Interpretation·Figure).
//
// Fold invariant: THE SURFACE IS A PROJECTION, NEVER AN AUTHOR. Def-driven,
// refuses to emit when the gate refuses.
//
// THE FILTER/SEEN SPLIT: the three Interpretation terrains are the SEEING —
// they filter, they never hold content. Paradigm (worldviews + the gate
// seal), Atmosphere (the whisper: model prose, toggled), Lens (search,
// lens pills, the byte inspector) all live in the frame. The six content
// terrains are the SEEN — the canvas: Void (the sources, left rail),
// Field (the measures, right rail), Entity (the beings, top band), Kind
// (the pills), Network (the graph, center), Link (the rows, a drawer that
// appears ON DEMAND and scrolls into view — it is never below the fold).
// The light verb toggles everything at once: click a being anywhere and
// beads, graph, subgraphs, tiles, and rows all beam together.
import { readFileSync } from "node:fs";
import { cellOf, surfaceCellOf, CELLS, OPERATOR_GLYPHS, GRAIN_DECALS, OPERATOR_NAME, GRAIN_NAME } from "./grounding-glyphs.mjs";

export const SURFACE_SCHEMA = "EOSurface@1";

// The modal reads the static per-cell table from an embedded JSON payload —
// one copy on the page, not one copy per chip. Only the item's own address /
// verbatim / source rides each chip's `data-g`.
const GROUNDING_CELLS = Object.freeze(Object.fromEntries(
  Object.entries(CELLS).map(([addr, c]) => {
    const [op, grain] = addr.split("·");
    return [addr, { terrain: c.terrain, stance: c.stance, name: c.name, nulls: c.nulls, description: c.description, operator: OPERATOR_NAME[op], grainName: GRAIN_NAME[grain], glyph: `${OPERATOR_GLYPHS[op]}${GRAIN_DECALS[grain]}` }];
  }),
));

// ── THE GROUNDING CHIP ────────────────────────────────────────────────────
// Every grounded element wears its cell's glyph (∅− … ⊛*), and the glyph is a
// door: clicking it opens the modal naming the grounding act, the null it
// owes, and the item's own byte address / verbatim / source. The cell comes
// from the item's own `grounding` field when the data declares it, else the
// surface's role default (source / row / measure / being / network).
const escAttr = (s) => esc(s).replace(/"/g, "&quot;");
// The bare render strips every piece of chrome — the grounding chips included.
// Set per-call inside renderSurface; groundingChip is synchronous and never
// re-entrant, so a module flag is safe here.
let BARE_CHIPS = false;
function groundingChip(kind, item, opts = {}) {
  if (BARE_CHIPS) return "";
  const c = surfaceCellOf(kind, item?.grounding);
  const detail = {
    cell: `${c.op}·${c.grain}`,
    glyph: c.glyph,
    terrain: c.terrain,
    stance: c.stance,
    name: c.name,
    ...opts,
  };
  return `<span class="gchip gchip-${c.grain.toLowerCase()}" tabindex="0" role="button"
    data-cell="${escAttr(detail.cell)}"
    data-g="${escAttr(JSON.stringify(detail))}"
    title="${escAttr(`${c.glyph} — ${c.name}`)}">${c.glyph}</span>`;
}

// ── READER REFLOW — a structure-aware projection of the retained bytes ────
// Reader mode reads a reflowed view: form feeds stripped, end-of-line
// hyphens rejoined, intra-paragraph newlines collapsed to spaces. A byte
// offset map carries every original index into reflowed coordinates so the
// byte-cited marks can be remapped, and the reflowed text is split into a
// paragraph table (with heading flags) for typographic rendering. Source
// mode keeps the raw bytes and the original offsets untouched — this
// projection never claims to be them.
const isWordChar = (c) => typeof c === "string" && /[A-Za-z0-9]/.test(c);
function reflowText(raw) {
  const out = [];
  const map = new Array(raw.length + 1);
  let oi = 0;
  let ci = 0;
  while (ci < raw.length) {
    const ch = raw[ci];
    if (ch === "\f") { map[ci] = oi; ci++; continue; }
    if (ch === "-") {
      let j = ci + 1;
      while (j < raw.length && raw[j] === "\f") j++;
      if (raw[j] === "\n") {
        let k = j + 1;
        while (k < raw.length && raw[k] === "\f") k++;
        if (isWordChar(raw[k]) && isWordChar(out[out.length - 1])) {
          let l = out.length - 1;
          while (l >= 0 && isWordChar(out[l])) l--;
          let r = k;
          while (r < raw.length && isWordChar(raw[r])) r++;
          const lLen = out.length - 1 - l, rLen = r - k;
          if (lLen > 0 && rLen > 0 && lLen + rLen >= 4) {
            map[ci] = oi;
            map[j] = oi;
            ci = k;
            continue;
          }
        }
      }
    }
    if (ch === "\n") {
      out.push("\n");
      map[ci] = oi++;
      ci++;
      continue;
    }
    out.push(ch);
    map[ci] = oi++;
    ci++;
  }
  map[raw.length] = oi;
  const text = out.join("");
  return { text, map, paras: splitParas(text) };
}
function isHeading(t) {
  const s = t.trim();
  if (s.length >= 90) return false;
  if (/[.!?:]$/.test(s)) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 14) return false;
  if (/^(chapter|section|table|figure|appendix|exhibit)\b/i.test(s) && /\d/.test(s)) return true;
  const caps = words.every((w) => /^[A-Z0-9'’\-&(),./]+$/.test(w));
  if (caps && (words.length >= 2 || s.length >= 4)) return true;
  const title = words.every((w) => /^[A-Z]/.test(w) && (w.length === 1 || /^[a-z0-9'’\-(),./]+$/.test(w.slice(1))));
  if (title && (words.length >= 2 || s.length >= 4)) return true;
  return false;
}
function splitParas(text) {
  const paras = [];
  const lines = text.split("\n");
  let cur = null;
  const flush = (end) => {
    if (cur && end > cur.start) {
      paras.push({ start: cur.start, end, heading: cur.heading });
      cur = null;
    }
  };
  let ls = 0;
  for (let li = 0; li < lines.length; li++) {
    const len = lines[li].length;
    const lineStart = ls, lineEnd = ls + len;
    const t = lines[li].trim();
    if (!t) { flush(lineStart); ls = lineEnd + 1; continue; }
    const isList = /^[•\-\–\*]\s|^\d+[.)]\s/.test(t);
    const head = isHeading(t);
    if (cur === null) {
      cur = { start: lineStart, heading: head };
    } else if (isList || head) {
      flush(lineStart);
      cur = { start: lineStart, heading: head };
    } else {
      const prev = li > 0 ? lines[li - 1].trim() : "";
      if (!prev || /[.!?:;]$/.test(prev) || prev.length < 50) {
        flush(lineStart);
        cur = { start: lineStart, heading: head };
      }
    }
    ls = lineEnd + 1;
  }
  flush(text.length);
  if (!paras.length && text.length) paras.push({ start: 0, end: text.length, heading: isHeading(text) });
  return paras;
}
function remapMarks(marks, map, len) {
  const out = [];
  for (const m of marks) {
    const s = Math.max(0, Math.min(map[m.start] ?? len, len));
    const e = Math.max(0, Math.min(map[m.end] ?? len, len));
    if (e > s) out.push({ ...m, start: s, end: e });
  }
  return out;
}

// ── STARTLE — the alert that breaks unconscious reading ─────────────────
// A startle is a place where the retained text does something genuinely
// unexpected — a control glyph, a replacement char, an ID-like digit run,
// a token too long to be a word, a punctuation-dense table fragment, a rule
// line. The reader surfaces it as an alert ("what am I looking at?"), never
// a silent formatting decision — and the alert can jump to the exact raw
// bytes in Source mode. Mechanical only: no model, no judgment call.
const STARTLE_KIND = {
  glyph: "a glyph that isn't printable text",
  replacement: "the replacement char — a decode failure left this behind",
  digits: "a digit run that reads like an ID, not a number",
  longword: "a token too long to be a word — table fragment or blob?",
  density: "a run that is mostly punctuation — table/box-drawing fragment?",
  ruleline: "a rule line — repeated punctuation as a divider",
};
function detectStartles(raw, cap = 14) {
  const out = [];
  const push = (at, len, kind) => {
    if (len <= 0) return;
    const last = out[out.length - 1];
    if (last && at < last.at + last.len) {
      last.len = Math.max(at + len, last.at + last.len) - last.at;
      last.kind = last.kind === kind ? last.kind : "density";
      return;
    }
    out.push({ at, len, kind });
  };
  const printable = /^[\x20-\x7E\u00A0-\u024F\u2010-\u2027\u2030-\u205E\u2070-\u2BFF\uFB00-\uFB06]$/;
  let i = 0;
  while (i < raw.length && out.length < cap) {
    const c = raw[i];
    if (c === "\uFFFD") {
      let j = i;
      while (j < raw.length && raw[j] === "\uFFFD") j++;
      push(i, j - i, "replacement");
      i = j;
      continue;
    }
    if (c === "\uFEFF" || c === "\u200B" || c === "\u200C" || c === "\u200D") { i++; continue; }
    if (c !== "\f" && c !== "\n" && c !== "\t" && c !== " " && !printable.test(c)) {
      push(i, 1, "glyph");
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < raw.length && /[0-9]/.test(raw[j])) j++;
      if (j - i >= 8) push(i, j - i, "digits");
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i;
      while (j < raw.length && /[A-Za-z0-9'’\-]/.test(raw[j])) j++;
      if (j - i >= 60) push(i, j - i, "longword");
      i = j;
      continue;
    }
    i++;
  }
  let at = 0;
  for (const line of raw.split("\n")) {
    if (out.length >= cap) break;
    const t = line.replace(/\f/g, "");
    const rl = /^(.)\1{4,}$/.exec(t.trim());
    if (rl && /[=•*\-\u2500\u2501.]/.test(rl[1])) push(at, t.length, "ruleline");
    else {
      const chars = t.replace(/\s/g, "");
      if (chars.length >= 40) {
        const punct = (chars.match(/[^A-Za-z0-9]/g) || []).length;
        if (punct / chars.length > 0.6) push(at, t.length, "density");
      }
    }
    at += line.length + 1;
  }
  return out;
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const KIND_LABEL = { goal: "goal", number: "number", name: "agency", place: "place" };
const rowRef = (l) => `${l.doc}#${l.at[0]}-${l.at[1]}`;

export function renderSurface({ def, ground, links, metrics, projections, gate, nativePages, geoPoints, bare = false }) {
  BARE_CHIPS = bare;
  const kindLabel = (k) => KIND_LABEL[k] ?? k;
  const docIdOf = (p) => p.split("/").pop().replace(".txt", "");
  const LENSES = def.topics ?? [];

  // ── LINK rows: tagged with doc, kind, beings, lenses ───────────────────
  const lensFor = (l) => LENSES.filter((t) => (t.queries ?? []).some((q) => `${l.verbatim} ${l.fields?.section ?? ""}`.toLowerCase().includes(String(q).toLowerCase()))).map((t) => t.id).join(" ");
  const rowHtml = (l) => {
    const ref = rowRef(l);
    const lens = lensFor(l);
    const gchip = groundingChip("row", l, { ref, verbatim: l.verbatim, kind: kindLabel(l.kind), source: docIdOf(l.doc), page: l.page });
    const f = l.fields ?? {};
    const slot = (label, cls, value) => `<div class="slot s-${cls}"><span class="slot-lbl">${label}</span><span class="slot-val${value ? "" : " empty"}"${value && (cls === "agency" || cls === "place") ? ` data-hol="${cls}" title="this being — click to focus it"` : ""}>${value ? esc(value) : "—"}</span></div>`;
    return `<div class="row" data-doc="${esc(docIdOf(l.doc))}" data-kind="${esc(l.kind)}" data-agency="${esc(f.agency ?? "")}" data-place="${esc(f.place ?? "")}"${lens ? ` data-lens="${esc(lens)}"` : ""} data-hay="${esc(`${l.verbatim} ${ref} ${kindLabel(l.kind)} ${f.agency ?? ""} ${f.place ?? ""} ${f.section ?? ""}`.toLowerCase())}"><div class="row-head"><span class="kind kind-${esc(l.kind)}">${esc(kindLabel(l.kind))}</span>${gchip}<span class="ref" data-byte="${esc(ref)}" data-page="p.${l.page}">${esc(ref)}</span><span class="page">p.${l.page}</span></div><div class="verbatim">${esc(l.verbatim)}</div><div class="slots">${slot("agency", "agency", f.agency)}${slot("place", "place", f.place)}${slot("amount", "amount", f.amount)}${slot("year", "year", f.year)}${slot("section", "section", f.section)}</div></div>`;
  };
  const rowsHtml = links.map(rowHtml).join("");

  // ── counts ──────────────────────────────────────────────────────────────
  const agencyCount = {}, placeCount = {};
  for (const l of links) {
    if (l.fields?.agency) agencyCount[l.fields.agency] = (agencyCount[l.fields.agency] ?? 0) + 1;
    if (l.fields?.place) placeCount[l.fields.place] = (placeCount[l.fields.place] ?? 0) + 1;
  }
  const kinds = {};
  for (const l of links) kinds[l.kind] = (kinds[l.kind] ?? 0) + 1;

  // ── VOID — the sources, left rail ──────────────────────────────────────
  const voidInner = `<h2><span class="terrain">T1 · Void</span> the sources</h2>
    <div class="cards">${ground.docs.map((d) => { const y = String(d.adopted ?? "").match(/\d{4}/)?.[0] ?? null; return `<div class="card" data-doc="${esc(d.id)}"${y ? ` data-adopted="${y}"` : ""} data-hay="${esc(`${d.title} ${d.category} ${d.scale} ${d.adopted}`.toLowerCase())}"><h3>${esc(d.title)}</h3><p>${esc(d.category)} · ${esc(d.scale)} · ${esc(d.adopted)}</p><p>${d.pages} pages · ${d.chars.toLocaleString()} chars</p><p class="basis prov">${groundingChip("source", d, { ref: `txt ${d.txt_sha256.slice(0, 12)}… · pdf ${d.pdf_sha256.slice(0, 12)}…`, verbatim: d.title, source: `${d.category} · ${d.scale} · ${d.adopted}`, license: d.license })} pdf ${esc(d.pdf_sha256.slice(0, 8))}… · ${esc(d.license)}</p></div>`; }).join("")}</div>
    <p class="empty">click a document to read it — reader shows the retained text, source shows the exact bytes</p>`;

  // ── ENTITY — the beings, top band ──────────────────────────────────────
  // A being is a READABLE CARD, not a decorative orb: its name in type, its
  // kind, its count, the documents that name it, and — for a place — the
  // districts it maps to with their live 311 open counts. Every number is
  // a byte-anchored row count; the card lights everywhere when clicked.
  const beingDocs = {};
  for (const l of links) {
    const b = l.fields?.agency || l.fields?.place;
    if (!b) continue;
    (beingDocs[b] ??= new Set()).add(docIdOf(l.doc));
  }
  const docSpread = (name) => {
    const n = beingDocs[name]?.size ?? 0;
    return n ? `${n} plan${n > 1 ? "s" : ""}` : "—";
  };
  const beingCard = (name, n, kind, { split = false, districts = null, state = null } = {}) => {
    const spread = docSpread(name);
    const dchips = districts?.length
      ? `<span class="bead-dchips">${districts.map((d) => `<span class="bead-dchip" title="311 open in district ${d}">d${d} · ${vbd.get(d)?.open ?? "?"}</span>`).join("")}</span>`
      : "";
    const stateTag = state
      ? `<span class="bead-state ${esc(state)}">${esc(state)}</span>`
      : "";
    return `<button class="bead ${split ? "split" : ""}" data-light="${esc(name)}" data-hay="${esc(name.toLowerCase())}">
      <span class="bead-bar bead-bar-${kind}"></span>
      <span class="bead-main">
        <span class="bead-name">${esc(name)}${stateTag}</span>
        <span class="bead-meta"><span class="bead-count">${n} rows</span> · ${esc(spread)}</span>
        ${dchips}
      </span>
      ${groundingChip("being", null, { verbatim: name, source: "cast — names resolve to who, never to byte strings" })}
    </button>`;
  };
  const placeState = {};
  for (const p of projections.places ?? []) placeState[p.place.toLowerCase()] = p.state;
  const placeCard = (name, n) => {
    const st = placeState[name.toLowerCase()] ?? null;
    const cls = st ? ` place-${st}` : "";
    const pj = (projections.places ?? []).find((p) => p.place.toLowerCase() === name.toLowerCase());
    const spread = docSpread(name);
    return `<button class="bead place${cls}" data-light="${esc(name)}" data-hay="${esc(name.toLowerCase())}" title="${esc(`${name} — ${st ?? "no lighting state"} · ${pj?.districts?.length ?? 0} mapped districts`)}"><span class="bead-bar bead-bar-place"></span><span class="bead-main"><span class="bead-name">${esc(name)}${st ? `<span class="bead-state ${esc(st)}">${esc(st)}</span>` : ""}</span><span class="bead-meta"><span class="bead-count">${n} rows</span> · ${esc(spread)}</span>${pj?.districts?.length ? `<span class="bead-dchips">${pj.districts.map((d) => `<span class="bead-dchip" title="311 open in district ${d}">d${d} · ${vbd.get(d)?.open ?? "?"}</span>`).join("")}</span>` : ""}</span>${groundingChip("being", null, { verbatim: name, source: "cast — names resolve to who, never to byte strings" })}</button>`;
  };

  // ── NETWORK — the graph, center ────────────────────────────────────────
  const topBeings = [...Object.entries(agencyCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([a]) => a), ...Object.entries(placeCount).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p]) => p)];
  const docIds = ground.docs.map((d) => d.id);
  const ROW_H = 22, GMARGIN = 16;
  const graph = (beings, docs, counts, w, maxEdges) => {
    const rows = Math.max(beings.length, docs.length, 1);
    const h = GMARGIN * 2 + (rows - 1) * ROW_H;
    const gx = 92, gx2 = w - 92;
    const nodeY = (i) => GMARGIN + i * ROW_H;
    const kindOf = (nm) => (agencyCount[nm] !== undefined ? "agency" : "place");
    const ns = (names, x, anchor, isDoc) => names.map((nm, i) => {
      const cls = isDoc ? "doc" : kindOf(nm);
      const tx = anchor === "end" ? x - 12 : x + 12;
      return `<g class="g-node" data-node="${esc(nm)}" data-hay="${esc(nm.toLowerCase())}"><circle class="node node-${cls}" cx="${x}" cy="${nodeY(i)}" r="5"/><text x="${tx}" y="${nodeY(i) + 3}" text-anchor="${anchor}" class="node-label">${esc(nm)}</text></g>`;
    }).join("");
    const es = Object.entries(counts).sort((a, b) => b[1].n - a[1].n).slice(0, maxEdges).map(([k, v]) => {
      const [a, p] = k.split("│");
      const y1 = nodeY(beings.indexOf(a)), y2 = nodeY(docs.indexOf(p));
      return `<g class="g-edge" data-a="${esc(a)}" data-p="${esc(p)}" data-hay="${esc(`${a} ${p}`.toLowerCase())}"><title>${esc(`${a} in ${p} — ${v.n} rows · ${v.ref}`)}</title><line class="edge" x1="${gx}" y1="${y1}" x2="${gx2}" y2="${y2}" stroke-width="${Math.min(1 + v.n / 20, 4)}"/></g>`;
    }).join("");
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">${es}${ns(beings, gx, "end", false)}${ns(docs, gx2, "start", true)}</svg>`;
  };
  const countsFor = (ls, beings, docs) => {
    const c = {};
    for (const l of ls) { const b = l.fields?.agency || l.fields?.place; const d = docIdOf(l.doc); if (b && beings.includes(b) && docs.includes(d)) { const k = `${b}│${d}`; if (c[k]) c[k].n++; else c[k] = { n: 1, ref: rowRef(l) }; } }
    return c;
  };
  const beingsFor = (ls) => {
    const a = {}, p = {};
    for (const l of ls) { if (l.fields?.agency) a[l.fields.agency] = (a[l.fields.agency] ?? 0) + 1; if (l.fields?.place) p[l.fields.place] = (p[l.fields.place] ?? 0) + 1; }
    return [...Object.entries(a).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([x]) => x), ...Object.entries(p).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([x]) => x)];
  };
  const mainEdgeCounts = countsFor(links, topBeings, docIds);
  const subgraphs = (projections.networks ?? []).map((n) => {
    const lensLinks = n.docs.flatMap((d) => d.links);
    const bs = beingsFor(lensLinks);
    const cs = countsFor(lensLinks, bs, docIds);
    const body = Object.keys(cs).length ? `<div class="f-network">${graph(bs, docIds, cs, 360, 8)}</div>` : `<p class="empty">no being↔document edges drawn — the ${n.rows} byte-cited rows live in the drawer; click the label to see them</p>`;
    return `<div class="subgraph" data-lens="${esc(n.id)}" data-hay="${esc(`${n.label} ${n.rows} rows ${n.docs.length} plans`.toLowerCase())}"><h3 class="reg-h sub-head" data-lens-light="${esc(n.id)}" title="click — these rows light in the drawer">${esc(n.label)} ${groundingChip("network", n, { verbatim: n.label, source: `${n.rows} rows · ${n.docs.length} plans` })} <span class="doc-meta">${n.rows} rows · ${n.docs.length} plans</span></h3>${body}</div>`;
  }).join("");

  // ── READER/SOURCE — the retained text, per document ─────────────────────
  // Reader shows the extracted text as a comfortable read; Source shows the
  // identical bytes, chunked with an offset gutter — literally the address
  // space every ref points into. Both are built from the SAME retained file
  // (never re-derived text), with the SAME mark spans, so switching modes
  // never changes what a byte says, only how it's laid out.
  const jsonScriptSafe = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
  const marksByDoc = {};
  for (const l of links) {
    const id = docIdOf(l.doc);
    (marksByDoc[id] ??= []).push({ start: l.at[0], end: l.at[1], kind: l.kind, ref: rowRef(l), agency: l.fields?.agency ?? null, place: l.fields?.place ?? null });
  }
  const docPayloads = ground.docs.map((d) => {
    let text = "";
    try { text = readFileSync(d.txtPath, "utf8"); } catch { text = ""; }
    const marks = (marksByDoc[d.id] ?? []).sort((a, b) => a.start - b.start);
    const rf = reflowText(text);
    const startles = detectStartles(text, 14).map((s) => {
      const a0 = rf.map[s.at] ?? rf.text.length;
      const a1 = rf.map[Math.min(s.at + s.len, text.length)] ?? rf.text.length;
      return {
        at: Math.min(a0, rf.text.length),
        len: Math.max(1, a1 - a0),
        rawAt: s.at,
        kind: s.kind,
        label: STARTLE_KIND[s.kind] ?? s.kind,
        preview: text.slice(s.at, Math.min(s.at + s.len, text.length)).replace(/\s+/g, " ").trim().slice(0, 60),
      };
    });
    let native = "";
    const np = nativePages?.[d.id];
    if (!bare && np && np.length) native = `\n<script type="application/json" id="nativepages-${esc(d.id)}">${jsonScriptSafe(np)}</script>`;
    return `<script type="application/json" id="doctext-${esc(d.id)}">${jsonScriptSafe({ text, marks })}</script>\n<script type="application/json" id="readertext-${esc(d.id)}">${jsonScriptSafe({ text: rf.text, marks: remapMarks(marks, rf.map, rf.text.length), paras: rf.paras, startles })}</script>${native}`;
  }).join("\n");

  // ── the timeline meta + the map lens payload ─────────────────────────────
  const docYears = ground.docs.map((d) => ({ doc: d.id, year: Number(String(d.adopted ?? "").match(/\d{4}/)?.[0] ?? NaN) })).filter((x) => Number.isFinite(x.year));
  const T_MIN = docYears.length ? Math.min(...docYears.map((x) => x.year)) : 2020;
  const T_MAX = docYears.length ? Math.max(...docYears.map((x) => x.year)) : 2020;
  const asOfYear = metrics.find((m) => m.provenance?.asOf)?.provenance.asOf;
  const timelineMeta = { min: T_MIN, max: T_MAX, docs: docYears, now: Number(String(asOfYear ?? "").match(/\d{4}/)?.[0] ?? null) };
  const timelinePayload = `<script type="application/json" id="timeline-meta">${jsonScriptSafe(timelineMeta)}</script>`;
  const geoPayload = geoPoints ? `<script type="application/json" id="geopoints">${jsonScriptSafe(geoPoints)}</script>` : "";

  // ── FIELD — the measures, right rail ───────────────────────────────────
  const byReg = {};
  for (const m of metrics) (byReg[m.registry] ??= []).push(m);
  const vbd = new Map((byReg["violations-by-district"] ?? []).map((m) => [Number(m.district), m.fields]));
  const districts = byReg.districts ?? [];
  const fieldRows = districts.map((d) => { const f = d.fields ?? {}; const v = vbd.get(Number(d.district)) ?? {}; const ref = d.ref ?? null; return `<div class="dline" data-hay="${esc(`${d.district} ${f.population ?? ""} ${f.median_household_income ?? ""}`.toLowerCase())}" ${ref ? `data-ref="${esc(ref)}" title="${esc(ref)}"` : ""}>${groundingChip("measure", d, { ref: ref ?? "aggregate — derivedFrom recorded", verbatim: `d${d.district} · ${f.population ?? ""} pop · $${f.median_household_income ?? ""}`, source: d.registry ?? "metrics", derivedFrom: d.derivedFrom?.address ?? null })}<b>d${d.district}</b> <span>${esc(f.population ?? "")} pop</span> <span>$${esc(f.median_household_income ?? "")}</span> <span class="num">311 ${esc(v.open ?? "")} open</span></div>`; }).join("");
  const stress = (byReg["housing-stress"] ?? [])[0];
  const pv = (m) => m?.provenance ? `<p class="empty prov">dataset ${esc(m.provenance.dataset)} · asOf ${esc(m.provenance.asOf)}</p>` : "";
  const firstDist = districts.find((d) => d.ref);
  const fieldInner = `<h2><span class="terrain">T5 · Field</span> the measures</h2>
    ${stress ? `<h3 class="reg-h">housing stress <span class="doc-meta">${esc(stress.fields.totalEvictionFilings ?? "")} filings</span></h3>${pv(stress)}` : ""}
    <h3 class="reg-h">districts <span class="doc-meta">35 · byte-sourced</span></h3>${fieldRows}
    <p class="empty prov">${firstDist ? `each district is an address — <span class="ref">${esc(firstDist.ref)}</span>` : "refs computed at build"}</p>
    <p class="empty prov">aggregates are derived from the retained snapshot — derivedFrom on every row</p>`;

  // ── ATMOSPHERE — the whisper (a filter: disclosure) ────────────────────
  const atmosphereInner = (projections.atmosphere ?? []).map((a) => `<div class="model-claim" data-hay="${esc(a.text.toLowerCase())}"><span class="model-tag">${esc(a.basis)}</span><br>${esc(a.text)}</div>`).join("") ||
    `<p class="empty">no model commentary — nothing here is the mouth's prose.</p>`;

  // ── PARADIGM — the agreements (a filter: worldview + the seal) ─────────
  const worldviewsHtml = `<span class="wv on" data-wv="the fold · byte-honesty">the fold · byte-honesty</span><span class="wv" data-wv="equity">equity</span><span class="wv" data-wv="fiscal">fiscal</span><span class="wv" data-wv="resilience">resilience</span>`;
  const checksHtml = `<ul>${gate.checks.map((c) => `<li class="${c.ok ? "ok" : "bad"}" data-hay="${esc(`${c.name} ${c.detail}`.toLowerCase())}">${c.ok ? "●" : "✗"} ${esc(c.name)} · ${esc(c.detail)}</li>`).join("")}</ul>`;

  // ── LENS — the filter cluster (search · lenses · inspector) ────────────
  const lensPills = LENSES.map((t) => `<span class="pill on" data-lens="${esc(t.id)}">${esc(t.label)}</span>`).join("");
  const kindPills = Object.entries(kinds).map(([k, n]) => `<span class="pill on" data-kind="${esc(k)}"><span class="kind kind-${esc(k)}">${esc(kindLabel(k))}</span> ${n}</span>`).join("");

  // ── BARE — the chrome-less single scroll. The five content terrains, all
  // visible, one under the other; the only verbs are open-a-document and
  // light-a-being. No header, no rail, no inspector, no timeline, no map,
  // no toggles, no grounding modal, no footer. Everything retained stays.
  if (bare) {
    const perDoc = {};
    for (const l of links) { const id = docIdOf(l.doc); (perDoc[id] ??= []).push(l); }
    const rowsGrouped = ground.docs.filter((d) => perDoc[d.id]?.length).map((d) =>
      `<h3 class="reg-h">${esc(d.title)} <span class="doc-meta">${perDoc[d.id].length} row${perDoc[d.id].length > 1 ? "s" : ""}</span></h3>${perDoc[d.id].map(rowHtml).join("")}`
    ).join("");
    return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Fold — ${esc(def.name)} plans surface</title>
<style>
  :root { --bg:#0d0b16; --bg2:#141126; --bg3:#1b1735; --line:#2b2450; --line2:#3a3170; --ink:#ece9fb; --muted:#8f88b3; --dim:#6b6492; --violet:#a78bfa; --violet2:#8b5cf6; --violet3:#7c3aed; --ok:#4ade80; --bad:#f87171; --amber:#fbbf24; --ground:#c2572f; --figure:#2f6b8f; --pattern:#3f7d4a; }
  * { box-sizing: border-box; }
  html, body { overflow-x: hidden; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: Georgia, serif; line-height: 1.6; }
  main { max-width: 96rem; margin: 0 auto; padding: 1rem 1.4rem 4rem; }
  section { margin: 0 0 3rem; }
  h2.sec-title { margin: 0 0 .5rem; font-size: 1rem; font-weight: 600; }
  h2.sec-title .count { font-family: ui-monospace, monospace; font-size: .66rem; font-weight: 400; color: var(--dim); }
  .reg-h { font-size: .95rem; margin: .8rem 0 .35rem; }
  .doc-meta { font-family: ui-monospace, monospace; font-size: .7rem; color: var(--dim); font-weight: 400; }
  .empty { font-family: ui-monospace, monospace; font-size: .68rem; color: var(--dim); padding: .15rem .4rem; }
  button { font-family: ui-monospace, monospace; font-size: .68rem; color: var(--muted); background: var(--bg2); border: 1px solid var(--line2); border-radius: 6px; padding: .26rem .5rem; cursor: pointer; }
  button:hover { color: var(--ink); border-color: var(--violet2); }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: .6rem; }
  .card { border: 1px solid var(--line); border-radius: 8px; padding: .6rem .7rem; background: var(--bg3); cursor: pointer; transition: border-color .15s; }
  .card:hover { border-color: var(--violet2); }
  .card h3 { margin: 0 0 .15rem; font-size: .88rem; }
  .card p { margin: .1rem 0; font-family: ui-monospace, monospace; font-size: .66rem; color: var(--muted); }
  .basis { font-size: .64rem; color: var(--dim); font-family: ui-monospace, monospace; }
  .reader-head { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin: 0 0 .6rem; padding-bottom: .5rem; border-bottom: 1px solid var(--line); }
  .reader-title { font-family: ui-monospace, monospace; font-size: .78rem; color: var(--ink); }
  .reader-text { font-family: Georgia, serif; font-size: 1.05rem; line-height: 1.85; max-width: 54rem; padding: .2rem .3rem; }
  .reader-text h3 { color: var(--violet); font-size: 1.12rem; margin: 1.05rem 0 .4rem; font-weight: 600; }
  .reader-text p { margin: .5rem 0; }
  .eword { border-bottom: 1px dotted rgba(74, 222, 128, .5); cursor: pointer; }
  .eword:hover { color: var(--ok); border-color: var(--ok); background: rgba(74, 222, 128, .1); }
  .eword-hot { background: rgba(74, 222, 128, .3); border-radius: 2px; box-shadow: 0 0 0 1px rgba(74, 222, 128, .35); }
  .hit { border-radius: 3px; padding: 0 .1rem; cursor: pointer; }
  .hit-goal { background: rgba(139, 92, 246, .22); }
  .hit-number { background: rgba(251, 191, 36, .25); }
  .hit-name { background: rgba(74, 222, 128, .22); }
  .hit-place { background: rgba(74, 222, 128, .16); border-bottom: 1px dashed var(--amber); }
  .hit:hover { outline: 1px solid var(--violet); }
  .beads { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: .5rem; }
  .bead { position: relative; display: flex; align-items: stretch; gap: .6rem; background: var(--bg3); border: 1px solid var(--line); border-radius: 8px; padding: .5rem .55rem; cursor: pointer; transition: border-color .15s, opacity .2s; text-align: left; }
  .bead:hover { border-color: var(--violet2); }
  .bead-bar { flex: none; width: 4px; border-radius: 999px; background: var(--violet2); }
  .bead-bar-place { background: var(--amber); }
  .bead.split .bead-bar { background: var(--bad); }
  .bead-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .12rem; }
  .bead-name { font-family: Georgia, serif; font-size: .88rem; color: var(--ink); display: flex; align-items: center; gap: .35rem; flex-wrap: wrap; }
  .bead-meta { font-family: ui-monospace, monospace; font-size: .64rem; color: var(--dim); }
  .bead-count { color: var(--muted); }
  .bead-state { font-family: ui-monospace, monospace; font-size: .56rem; text-transform: uppercase; letter-spacing: .04em; padding: .06rem .35rem; border-radius: 3px; border: 1px solid var(--line2); }
  .bead-state.lit { color: var(--ok); border-color: var(--ok); }
  .bead-state.dim { color: var(--amber); border-color: var(--amber); }
  .bead-state.unresolved { color: var(--bad); border-color: var(--bad); border-style: dashed; }
  .bead-dchips { display: flex; gap: .25rem; flex-wrap: wrap; margin-top: .18rem; }
  .bead-dchip { font-family: ui-monospace, monospace; font-size: .56rem; color: var(--muted); background: rgba(143, 136, 179, .08); border: 1px solid var(--line); border-radius: 3px; padding: .05rem .3rem; }
  .bead.dim { opacity: .15; }
  .bead.lit { border-color: var(--violet2); background: var(--bg2); }
  .bead.lit .bead-bar { box-shadow: 0 0 12px var(--violet2); }
  .bead.place-lit .bead-bar { background: var(--ok); box-shadow: 0 0 12px var(--ok); }
  .bead.place-dim .bead-bar { background: var(--amber); box-shadow: 0 0 10px var(--amber); }
  .bead.place-unres .bead-bar { background: transparent; border: 1px dashed var(--bad); }
  .split-pair { display: flex; align-items: center; gap: .8rem; margin-top: .5rem; flex-wrap: wrap; }
  .split-pair .bead { flex: 1 1 200px; }
  .split-edge { font-family: ui-monospace, monospace; font-size: .6rem; color: var(--bad); border-top: 2px dashed var(--bad); padding-top: .25rem; }
  .slot-legend { font-family: ui-monospace, monospace; font-size: .64rem; color: var(--dim); margin: 0 0 .7rem; }
  .slot-legend b { color: var(--violet); font-weight: 500; }
  .row { border-left: 2px solid var(--line2); padding: .3rem .8rem; margin: .45rem 0 .45rem .3rem; border-radius: 0 6px 6px 0; display: block; }
  .row.dim { opacity: .35; }
  .row-head { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; font-family: ui-monospace, monospace; font-size: .7rem; color: var(--dim); }
  .slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .3rem .5rem; margin-top: .45rem; }
  .slot { border: 1px dashed var(--line); border-radius: 6px; padding: .18rem .45rem .22rem; background: var(--bg3); min-width: 0; }
  .slot-lbl { display: block; font-size: .54rem; text-transform: uppercase; letter-spacing: .07em; color: var(--dim); }
  .slot-val { font-family: ui-monospace, monospace; font-size: .72rem; color: var(--ink); word-break: break-word; }
  .slot-val.empty { color: var(--dim); font-style: italic; }
  .slot-val[data-hol] { cursor: pointer; color: var(--violet); border-bottom: 1px dotted var(--violet2); }
  .slot-val[data-hol]:hover { color: var(--ink); background: rgba(139, 92, 246, .12); border-radius: 3px; }
  .kind { font-size: .6rem; text-transform: uppercase; letter-spacing: .06em; padding: .1rem .4rem; border-radius: 3px; background: rgba(139, 92, 246, .14); color: var(--violet); }
  .kind-number { background: rgba(251, 191, 36, .12); color: var(--amber); }
  .kind-name { background: rgba(74, 222, 128, .12); color: var(--ok); }
  .ref { color: var(--violet); cursor: help; }
  .page { color: var(--dim); }
  .verbatim { margin: .15rem 0 .05rem; font-size: .92rem; color: var(--ink); }
  .f-network svg { width: 100%; height: auto; display: block; }
  .f-network .node { fill: var(--bg2); stroke: var(--violet2); stroke-width: 1.5; cursor: pointer; transition: opacity .2s; }
  .f-network .node-doc { stroke: var(--ok); }
  .f-network .node-place { stroke: var(--amber); }
  .f-network .edge { stroke: var(--line2); stroke-dasharray: 3 5; fill: none; cursor: pointer; transition: opacity .2s; }
  .f-network .g-node:hover .node { stroke: var(--violet); fill: var(--violet); }
  .f-network .g-edge:hover .edge { stroke: var(--violet); }
  .f-network .node-label { font-family: ui-monospace, monospace; font-size: 8px; fill: var(--muted); pointer-events: none; }
  .f-network .dim { opacity: .1; }
  .subgraph { margin-top: .8rem; }
  .subgraph.dim { opacity: .3; }
  .sub-head { cursor: pointer; }
  .sub-head:hover { color: var(--violet); }
  .legend { font-family: ui-monospace, monospace; font-size: .62rem; color: var(--dim); padding: .2rem 0 .4rem; }
  .subgrid { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; margin-top: .5rem; }
  @media (max-width: 1200px) { .subgrid { grid-template-columns: 1fr; } }
  .dline { font-family: ui-monospace, monospace; font-size: .66rem; color: var(--muted); padding: .28rem .45rem; border-bottom: 1px solid var(--line); }
  .dline b { color: var(--violet); }
  .dline .num { color: var(--amber); }
  @media (max-width: 900px) { .beads { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
  <section id="sec-sources">
    <div id="sources-list">
      <h2 class="sec-title">the sources <span class="count">${ground.docs.length} retained plans · hashed · page-bridged</span></h2>
      <div class="cards">${ground.docs.map((d) => `<div class="card" data-doc="${esc(d.id)}"><h3>${esc(d.title)}</h3><p>${esc(d.category)} · ${esc(d.scale)} · ${esc(d.adopted)}</p><p>${d.pages} pages · ${d.chars.toLocaleString()} chars</p><p class="basis">pdf ${esc(d.pdf_sha256.slice(0, 8))}… · ${esc(d.license)}</p></div>`).join("")}</div>
    </div>
    <div id="sources-reader" style="display:none">
      <div class="reader-head"><button id="reader-back">← back to sources</button><span class="reader-title" id="reader-title"></span></div>
      <div id="reader-body" class="reader-text"></div>
    </div>
  </section>
  <section id="sec-beings">
    <h2 class="sec-title">the beings <span class="count">agencies who act · places the plans name</span></h2>
    <div class="beads">${Object.entries(agencyCount).sort((a, b) => b[1] - a[1]).map(([a, n]) => beingCard(a, n, "agency")).join("")}</div>
    <div class="beads">${Object.entries(placeCount).sort((a, b) => b[1] - a[1]).map(([p, n]) => placeCard(p, n)).join("")}</div>
    <div class="split-pair">${beingCard("MTA", agencyCount["MTA"] ?? 0, "agency", { split: true })}<span class="split-edge">✗ not merged — no received prior</span>${beingCard("WeGo", agencyCount["WeGo"] ?? 0, "agency", { split: true })}</div>
  </section>
  <section id="sec-connections">
    <h2 class="sec-title">the asserted connections <span class="count">${links.length} rows · every one byte-cited</span></h2>
    <p class="slot-legend">each connection is the same box with the same slots — <b>agency · place · amount · year · section</b> — plus its byte ref and page. an empty slot renders as <b>—</b>: the row does not carry that field. click an agency or place value, or a being anywhere, to light it.</p>
    <div id="rows">${rowsGrouped}</div>
  </section>
  <section id="sec-network">
    <h2 class="sec-title">the web <span class="count">edges are beings named in documents — hover an edge for its byte ref</span></h2>
    <div class="f-network">${graph(topBeings, docIds, mainEdgeCounts, 620, 24)}</div>
    <p class="legend">violet = agencies · amber = places · green = documents · stroke width = rows</p>
    <div class="subgrid">${subgraphs}</div>
  </section>
  <section id="sec-measures">${fieldInner}</section>
</main>
${docPayloads}
<script>
  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var rows = Array.prototype.slice.call(document.querySelectorAll('#rows .row'));
  var beads = Array.prototype.slice.call(document.querySelectorAll('.bead'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var subgraphs = Array.prototype.slice.call(document.querySelectorAll('.subgraph'));
  var gNodes = Array.prototype.slice.call(document.querySelectorAll('.g-node'));
  var gEdges = Array.prototype.slice.call(document.querySelectorAll('.g-edge'));

  var light = null;
  var beingOf = function (r) { return (r.dataset.agency || '') + ' ' + (r.dataset.place || ''); };
  var litBy = function (name) { return light && !light.lens && !light.a && light === name.toLowerCase(); };

  // ── the reader — the retained text, rendered; nothing else ─────────────
  var rDocCache = {};
  function fallbackParas(text) {
    var paras = [], start = 0;
    for (var p = 0; p <= text.length; p++) {
      if (p === text.length || text[p] === '\\n') {
        if (p > start) paras.push({ start: start, end: p, heading: false });
        start = p + 1;
      }
    }
    if (!paras.length && text.length) paras.push({ start: 0, end: text.length, heading: false });
    return paras;
  }
  function getReaderData(id) {
    if (rDocCache[id]) return rDocCache[id];
    var data = null;
    var el = document.getElementById('readertext-' + id);
    if (el) { try { data = JSON.parse(el.textContent); } catch (e) { data = null; } }
    if (!data || !data.text) {
      var raw = document.getElementById('doctext-' + id);
      var txt = raw ? JSON.parse(raw.textContent).text : '';
      data = { text: txt, marks: [], paras: fallbackParas(txt) };
    }
    if (!data.paras || !data.paras.length) data.paras = fallbackParas(data.text);
    data.marks = (data.marks || []).slice().sort(function (a, b) { return a.start - b.start; });
    rDocCache[id] = data;
    return data;
  }
  var entityList = [];
  function buildEntityList() {
    entityList = [];
    var seen = {};
    var beads2 = document.querySelectorAll('.bead');
    for (var bi = 0; bi < beads2.length; bi++) {
      var nm = beads2[bi].dataset.light;
      if (!nm) continue;
      var lower = nm.toLowerCase();
      if (seen[lower]) continue;
      seen[lower] = true;
      entityList.push({ name: nm, lower: lower, len: lower.length });
    }
    entityList.sort(function (a, b) { return b.len - a.len; });
  }
  function isWordChar(c) { return c && /[A-Za-z0-9']/.test(c); }
  function wordify(seg) {
    if (!entityList.length) return escHtml(seg);
    var low = seg.toLowerCase();
    var out = '', cursor = 0;
    while (cursor < seg.length) {
      var best = null;
      for (var i = 0; i < entityList.length; i++) {
        var idx = low.indexOf(entityList[i].lower, cursor);
        if (idx === -1) continue;
        if (!best || idx < best.idx || (idx === best.idx && entityList[i].len > best.len)) {
          best = { idx: idx, ent: entityList[i] };
        }
      }
      if (!best) break;
      var before = seg[best.idx - 1], after = seg[best.idx + best.ent.len];
      if (isWordChar(before) || isWordChar(after)) { cursor = best.idx + 1; continue; }
      if (best.idx > cursor) out += escHtml(seg.slice(cursor, best.idx));
      out += '<span class="eword" data-entity="' + escHtml(best.ent.name) + '" title="' + escHtml(best.ent.name) + '">' + escHtml(seg.slice(best.idx, best.idx + best.ent.len)) + '</span>';
      cursor = best.idx + best.ent.len;
    }
    out += escHtml(seg.slice(cursor));
    return out;
  }
  function markAttrs(m) {
    var who = m.agency || m.place || '';
    return 'class="hit hit-' + m.kind + '"' +
      (m.agency ? ' data-agency="' + escHtml(m.agency) + '"' : '') +
      (m.place ? ' data-place="' + escHtml(m.place) + '"' : '') +
      ' title="' + escHtml(m.kind + (who ? ' · ' + who : '') + ' · ' + m.ref) + '"';
  }
  function paragraphHtml(rt, pi) {
    var par = rt.paras[pi];
    var p0 = par.start, p1 = par.end;
    var seg = rt.text.slice(p0, p1);
    var out = '', pos = 0;
    var ms = rt.marks;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.end <= p0 || m.start >= p1) continue;
      var s = Math.max(m.start, p0), e = Math.min(m.end, p1);
      if (s > pos) out += wordify(seg.slice(pos - p0, s - p0));
      out += '<mark ' + markAttrs(m) + '>' + escHtml(seg.slice(s - p0, e - p0)) + '</mark>';
      pos = e;
    }
    if (pos < p1) out += wordify(seg.slice(pos - p0));
    return par.heading ? '<h3>' + out + '</h3>' : '<p>' + out + '</p>';
  }
  function openReader(docId) {
    buildEntityList();
    var rt = getReaderData(docId);
    var out = '';
    for (var pi = 0; pi < rt.paras.length; pi++) out += paragraphHtml(rt, pi);
    document.getElementById('reader-body').innerHTML = out;
    document.getElementById('reader-title').textContent = docId;
    document.getElementById('sources-list').style.display = 'none';
    document.getElementById('sources-reader').style.display = '';
    document.getElementById('sources-reader').scrollIntoView({ block: 'start' });
  }
  document.getElementById('reader-back').addEventListener('click', function () {
    document.getElementById('sources-reader').style.display = 'none';
    document.getElementById('sources-list').style.display = '';
  });

  // ── the light verb — one click lights it everywhere ────────────────────
  function refresh() {
    var i;
    for (i = 0; i < rows.length; i++) {
      var r = rows[i];
      var m = !light ? true :
        light.lens ? (r.dataset.lens || '').split(' ').indexOf(light.lens) !== -1
        : light.a ? r.dataset.agency === light.a && r.dataset.doc === light.p
        : beingOf(r).toLowerCase().indexOf(light) !== -1;
      r.classList.toggle('dim', !m);
    }
    for (i = 0; i < beads.length; i++) {
      var b = beads[i], name = b.dataset.light.toLowerCase();
      b.classList.toggle('lit', litBy(name));
      b.classList.toggle('dim', light && !litBy(name));
    }
    for (i = 0; i < gNodes.length; i++) {
      var g = gNodes[i];
      g.classList.toggle('dim', light && !litBy(g.dataset.node.toLowerCase()));
    }
    for (i = 0; i < gEdges.length; i++) {
      var ge = gEdges[i];
      var hit = light && !light.lens && !light.a ? (ge.dataset.a.toLowerCase() === light || ge.dataset.p.toLowerCase() === light) : false;
      ge.classList.toggle('dim', (light && !light.lens && !light.a && !hit) || (light && light.lens));
    }
    for (i = 0; i < subgraphs.length; i++) {
      var sg = subgraphs[i];
      var keep = !light || (light.lens ? light.lens === sg.dataset.lens : true);
      sg.classList.toggle('dim', !keep);
    }
  }
  function toggleLight(name) { light = light === name ? null : name; refresh(); }

  for (var ci = 0; ci < cards.length; ci++) cards[ci].addEventListener('click', function () { openReader(this.dataset.doc); });
  for (var i2 = 0; i2 < beads.length; i2++) beads[i2].addEventListener('click', function () { toggleLight(this.dataset.light.toLowerCase()); });
  for (var i4 = 0; i4 < gNodes.length; i4++) gNodes[i4].addEventListener('click', function () { toggleLight(this.dataset.node.toLowerCase()); });
  for (var i5 = 0; i5 < gEdges.length; i5++) gEdges[i5].addEventListener('click', function () { toggleLight({ a: this.dataset.a, p: this.dataset.p }); });
  for (var i6 = 0; i6 < subgraphs.length; i6++) {
    (function (sg) {
      var head = sg.querySelector('.sub-head');
      if (head) head.addEventListener('click', function () { toggleLight({ lens: head.dataset.lensLight }); });
    })(subgraphs[i6]);
  }
  document.getElementById('rows').addEventListener('click', function (ev) {
    var sv = ev.target.closest('.slot-val[data-hol]');
    if (sv) {
      var nm = sv.textContent.trim();
      if (nm && nm !== '—') toggleLight(nm.toLowerCase());
    }
  });
  document.getElementById('reader-body').addEventListener('click', function (ev) {
    var t = ev.target;
    if (t.closest('.hit')) {
      var hit = t.closest('.hit');
      var name = (hit.dataset.agency || hit.dataset.place || '').toLowerCase();
      if (name) toggleLight(name);
      return;
    }
    if (t.closest('.eword')) {
      var ew = t.closest('.eword');
      var ed = ew.dataset.entity.toLowerCase();
      toggleLight(ed);
      var ews = document.getElementById('reader-body').querySelectorAll('.eword');
      for (var ex = 0; ex < ews.length; ex++) {
        if (ews[ex] === ew) continue;
        if (ews[ex].dataset.entity.toLowerCase() === ed) ews[ex].classList.add('eword-hot');
        else ews[ex].classList.remove('eword-hot');
      }
    }
  });

  refresh();
  buildEntityList();
</script>
</body>
</html>`;
  }
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Fold — ${esc(def.name)} plans surface</title>
<style>
  :root { --bg:#0d0b16; --bg2:#141126; --bg3:#1b1735; --line:#2b2450; --line2:#3a3170; --ink:#ece9fb; --muted:#8f88b3; --dim:#6b6492; --violet:#a78bfa; --violet2:#8b5cf6; --violet3:#7c3aed; --ok:#4ade80; --bad:#f87171; --amber:#fbbf24; --ground:#c2572f; --figure:#2f6b8f; --pattern:#3f7d4a; --header-bg: rgba(13, 11, 22, .92); }
  html[data-theme="light"] { --bg:#f8f6ff; --bg2:#ffffff; --bg3:#efeafb; --line:#e2ddf3; --line2:#c8bfe8; --ink:#241e3f; --muted:#5b5480; --dim:#8b84ab; --violet:#6d4bd8; --violet2:#7c3aed; --violet3:#6d28d9; --ok:#15803d; --bad:#b91c1c; --amber:#b45309; --ground:#b04a1e; --figure:#1f5f8f; --pattern:#2f6b46; --header-bg: rgba(248, 246, 255, .92); }
  * { box-sizing: border-box; }
  html, body { overflow-x: hidden; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: Georgia, serif; line-height: 1.6; transition: background .25s, color .25s; }
  body.no-prov .prov, body.no-prov .basis { display: none; }
  .frame { position: sticky; top: 0; z-index: 30; background: var(--header-bg); backdrop-filter: blur(6px); border-bottom: 1px solid var(--line); padding: .5rem 1rem; }
  .frame .row1 { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
  .mark { display: flex; align-items: center; gap: .5rem; font-family: ui-monospace, Menlo, monospace; font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .mark .dot { width: 11px; height: 11px; border-radius: 3px; background: linear-gradient(135deg, var(--violet), var(--violet3)); box-shadow: 0 0 12px rgba(139, 92, 246, .55); }
  .mark b { color: var(--ink); }
  .spacer { flex: 1; }
  .seal-mini { font-family: ui-monospace, monospace; font-size: .66rem; color: var(--ok); border: 1px solid var(--ok); border-radius: 999px; padding: .1rem .55rem; cursor: pointer; }
  .seal-mini.refuse { color: var(--bad); border-color: var(--bad); }
  .worldviews { display: flex; gap: .3rem; flex-wrap: wrap; }
  .wv { font-family: ui-monospace, monospace; font-size: .62rem; color: var(--muted); border: 1px solid var(--line2); border-radius: 999px; padding: .08rem .45rem; cursor: pointer; }
  .wv.on { color: var(--violet); border-color: var(--violet2); }
  #gsearch { flex: 1; min-width: 140px; background: var(--bg2); border: 1px solid var(--line2); border-radius: 6px; color: var(--ink); font-family: ui-monospace, monospace; font-size: .74rem; padding: .3rem .55rem; }
  #grep { font-family: ui-monospace, monospace; font-size: .62rem; color: var(--dim); cursor: pointer; }
  .grepp { color: var(--violet); text-decoration: underline dotted; margin: 0 .2rem; }
  .grepp:hover { color: var(--ink); }
  button { font-family: ui-monospace, monospace; font-size: .68rem; color: var(--muted); background: var(--bg2); border: 1px solid var(--line2); border-radius: 6px; padding: .26rem .5rem; cursor: pointer; }
  button:hover { color: var(--ink); border-color: var(--violet2); }
  .scope-chip { font-family: ui-monospace, monospace; font-size: .66rem; color: var(--violet); border: 1px dashed var(--violet2); border-radius: 999px; padding: .08rem .5rem; cursor: pointer; }
  .frame .row2 { display: flex; gap: .35rem; flex-wrap: wrap; align-items: center; margin-top: .4rem; }
  .pill { font-family: ui-monospace, monospace; font-size: .68rem; padding: .12rem .5rem; border-radius: 999px; border: 1px solid var(--line2); color: var(--muted); display: inline-flex; align-items: center; gap: .3rem; cursor: pointer; }
  .pill.on { color: var(--violet); border-color: var(--violet2); }
  .pill.off { color: var(--dim); border-style: dashed; opacity: .55; }
  .whisper-strip { display: none; border-bottom: 1px solid var(--line); background: var(--bg3); padding: .4rem 1rem; }
  .whisper-strip.on { display: block; }
  .timebar { display: flex; align-items: center; gap: .5rem; margin-top: .45rem; padding: .15rem .2rem 0; }
  .tb-label { font-family: ui-monospace, monospace; font-size: .6rem; text-transform: uppercase; letter-spacing: .06em; color: var(--dim); }
  .tb-cursor { font-family: ui-monospace, monospace; font-size: .68rem; color: var(--amber); }
  #timeline-svg { width: 100%; max-width: 460px; height: 34px; cursor: crosshair; }
  #timeline-svg .t-doc { cursor: pointer; }
  #timeline-svg .t-doc:hover { fill: var(--violet); }
  #timeline-svg .t-now { stroke: var(--dim); stroke-dasharray: 2 3; }
  .map-strip { display: none; border-bottom: 1px solid var(--line); background: var(--bg3); padding: .5rem 1rem .8rem; }
  .map-strip.on { display: block; }
  .map-head { display: flex; align-items: baseline; gap: .8rem; flex-wrap: wrap; margin-bottom: .4rem; }
  .map-head .terrain { font-family: ui-monospace, monospace; font-size: .6rem; color: var(--violet2); text-transform: uppercase; letter-spacing: .05em; }
  #map-body svg { background: var(--bg3); border: 1px solid var(--line); border-radius: 8px; }
  #map-body .vdot { cursor: pointer; }
  #map-body .vdot:hover { fill: var(--bad); }
  .dline-hot { outline: 2px solid var(--amber); background: rgba(251, 191, 36, .12); }
  .card.t-dim { opacity: .35; pointer-events: none; }
  .nword-being { border-bottom: 2px solid rgba(74, 222, 128, .55); }
  main { max-width: 96rem; margin: 0 auto; padding: 1rem 1rem 2.5rem; }
  .crumb { font-family: ui-monospace, monospace; font-size: .68rem; color: var(--dim); padding: .1rem .2rem .7rem; }
  .crumb span { color: var(--muted); }
  .crumb-sep { margin: 0 .4rem; color: var(--line2); }
  .workspace { display: flex; gap: 1rem; align-items: flex-start; }
  .rail { display: flex; flex-direction: column; gap: .3rem; width: 172px; flex: none; position: sticky; top: 108px; }
  .rail-btn { display: flex; justify-content: space-between; align-items: flex-start; gap: .4rem; text-align: left; font-family: ui-monospace, monospace; font-size: .72rem; padding: .5rem .6rem; border-radius: 8px; border: 1px solid var(--line); background: var(--bg2); color: var(--muted); cursor: pointer; }
  .rail-btn .rail-t { color: var(--dim); font-size: .6rem; display: block; margin-top: .1rem; font-weight: 400; }
  .rail-btn:hover { border-color: var(--violet2); color: var(--ink); }
  .rail-btn.on { border-color: var(--violet2); background: var(--bg3); color: var(--violet); box-shadow: inset 2px 0 0 var(--violet2); }
  .rail-n { font-size: .64rem; color: var(--dim); background: var(--bg3); border-radius: 999px; padding: .05rem .4rem; flex: none; }
  .rail-btn.on .rail-n { color: var(--violet); background: rgba(139, 92, 246, .14); }
  .workbody { flex: 1; min-width: 0; }
  .inspector { width: 264px; flex: none; position: sticky; top: 108px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg2); padding: .7rem .8rem; font-family: ui-monospace, monospace; max-height: calc(100vh - 140px); overflow: auto; }
  .inspector h3 { margin: 0 0 .4rem; font-size: .8rem; color: var(--violet); line-height: 1.4; }
  .insp-empty { font-size: .68rem; color: var(--dim); line-height: 1.6; }
  .insp-row { font-size: .7rem; color: var(--muted); margin: .22rem 0; display: flex; justify-content: space-between; gap: .5rem; }
  .insp-row b { color: var(--ink); font-weight: 500; }
  .insp-sec { font-size: .6rem; text-transform: uppercase; letter-spacing: .06em; color: var(--dim); margin-top: .65rem; }
  .insp-acts { display: flex; flex-direction: column; gap: .3rem; margin-top: .5rem; }
  .insp-acts button { text-align: left; }
  .insp-ink { display: inline-block; font-family: ui-monospace, monospace; font-size: .66rem; color: var(--violet); background: none; border: 1px solid var(--line2); border-radius: 999px; padding: .05rem .45rem; margin: .15rem .15rem 0 0; cursor: pointer; }
  .insp-ink:hover { color: var(--ink); border-color: var(--violet); }
  .insp-line { font-size: .68rem; color: var(--muted); padding: .35rem 0; border-bottom: 1px solid var(--line); cursor: pointer; line-height: 1.5; }
  .insp-line:hover { color: var(--ink); background: var(--bg3); }
  .insp-line .kind { margin-right: .25rem; }
  .insp-ref { color: var(--violet); font-size: .6rem; display: block; margin-top: .1rem; }
  #insp-sentinel { font-size: .6rem; color: var(--dim); text-align: center; padding: .35rem 0; }
  .conn-groups { display: flex; flex-direction: column; gap: .4rem; }
  .conn-group { display: flex; justify-content: space-between; align-items: center; gap: .6rem; font-family: ui-monospace, monospace; font-size: .72rem; color: var(--muted); background: var(--bg3); border: 1px solid var(--line); border-radius: 8px; padding: .5rem .7rem; cursor: pointer; text-align: left; }
  .conn-group:hover { border-color: var(--violet2); color: var(--ink); }
  .conn-group b { color: var(--violet); }
  .conn-group .n { color: var(--dim); flex: none; }
  .panel { display: none; border: 1px solid var(--line); border-radius: 10px; background: var(--bg2); padding: .8rem 1rem; min-width: 0; }
  .panel.on { display: block; }
  .panel h2 { margin: 0 0 .4rem; font-size: .92rem; font-weight: 600; }
  .panel .terrain { font-family: ui-monospace, monospace; font-size: .6rem; color: var(--violet2); text-transform: uppercase; letter-spacing: .05em; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: .6rem; }
  .card { border: 1px solid var(--line); border-radius: 8px; padding: .6rem .7rem; background: var(--bg3); cursor: pointer; transition: border-color .15s; }
  .card:hover { border-color: var(--violet2); }
  .card h3 { margin: 0 0 .15rem; font-size: .88rem; }
  .card p { margin: .1rem 0; font-family: ui-monospace, monospace; font-size: .66rem; color: var(--muted); }
  .basis { font-size: .64rem; color: var(--dim); font-family: ui-monospace, monospace; }
  .reader-head { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin-bottom: .6rem; padding-bottom: .5rem; border-bottom: 1px solid var(--line); }
  .reader-title { font-family: ui-monospace, monospace; font-size: .78rem; color: var(--ink); }
  .startle-count { font-family: ui-monospace, monospace; font-size: .66rem; color: var(--amber); border: 1px solid var(--amber); border-radius: 999px; padding: .05rem .5rem; cursor: pointer; }
  .startle-count:hover { background: rgba(251, 191, 36, .12); }
  .startle { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; border: 1px dashed var(--amber); border-radius: 8px; background: rgba(251, 191, 36, .07); color: var(--amber); padding: .4rem .6rem; margin: .8rem 0; font-family: ui-monospace, monospace; font-size: .72rem; }
  .startle b { color: var(--amber); font-weight: 600; }
  .startle-glyph { font-size: 1rem; line-height: 1; }
  .startle-label { color: var(--muted); }
  .startle-jump { margin-left: auto; }
  .srow.startle-hot .gtxt { background: rgba(251, 191, 36, .28); outline: 1px solid var(--amber); border-radius: 3px; }
  .mode-btn.on { color: var(--violet); border-color: var(--violet2); }
  .reader-text { font-family: Georgia, serif; font-size: 1.05rem; line-height: 1.85; max-width: 54rem; max-height: 68vh; overflow: auto; padding: .2rem .3rem; }
  .reader-text h3 { color: var(--violet); font-size: 1.12rem; margin: 1.05rem 0 .4rem; font-weight: 600; }
  .reader-text p { margin: .5rem 0; }
  .reader-text .pager { font-family: ui-monospace, monospace; font-size: .66rem; }
  .reader-native { max-height: 68vh; overflow: auto; padding: .3rem; }
  .npage { position: relative; margin: 0 auto 1.2rem; box-shadow: 0 0 0 1px var(--line), 0 8px 30px rgba(0, 0, 0, .35); border-radius: 4px; overflow: hidden; background: #fff; }
  .nwords { position: absolute; inset: 0; }
  .nword { position: absolute; color: transparent; background: transparent; cursor: pointer; border-radius: 2px; }
  .nword:hover { background: rgba(167, 139, 250, .3); }
  .nword-hot { background: rgba(251, 191, 36, .45); }
  .nword-being { border-bottom: 2px solid rgba(74, 222, 128, .55); }
  #reader-find { background: var(--bg2); border: 1px solid var(--line2); border-radius: 6px; color: var(--ink); font-family: ui-monospace, monospace; font-size: .7rem; padding: .2rem .5rem; min-width: 150px; }
  .find { background: rgba(251, 191, 36, .35); border-radius: 2px; padding: 0 .05rem; }
  .find-hot { outline: 2px solid var(--amber); background: rgba(251, 191, 36, .5); }
  .eword { border-bottom: 1px dotted rgba(74, 222, 128, .5); cursor: pointer; }
  .eword:hover { color: var(--ok); border-color: var(--ok); background: rgba(74, 222, 128, .1); }
  .eword-hot { background: rgba(74, 222, 128, .3); border-radius: 2px; box-shadow: 0 0 0 1px rgba(74, 222, 128, .35); }
  .hit { border-radius: 3px; padding: 0 .1rem; cursor: pointer; }
  .hit-goal { background: rgba(139, 92, 246, .22); }
  .hit-number { background: rgba(251, 191, 36, .25); }
  .hit-name { background: rgba(74, 222, 128, .22); }
  .hit-place { background: rgba(74, 222, 128, .16); border-bottom: 1px dashed var(--amber); }
  .hit:hover { outline: 1px solid var(--violet); }
  .source-view { font-family: ui-monospace, monospace; font-size: .72rem; max-height: 68vh; overflow: auto; }
  .pager { display: flex; align-items: center; gap: .6rem; padding: .4rem .2rem; color: var(--dim); font-size: .66rem; }
  .srow { display: flex; gap: .7rem; padding: .04rem 0; white-space: pre-wrap; word-break: break-all; }
  .goff { flex: none; width: 62px; text-align: right; color: var(--dim); user-select: none; }
  .gtxt { flex: 1; color: var(--ink); }
  .beads { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: .5rem; }
  .bead { position: relative; display: flex; align-items: stretch; gap: .6rem; background: var(--bg3); border: 1px solid var(--line); border-radius: 8px; padding: .5rem .55rem .5rem .4rem; cursor: pointer; transition: border-color .15s, opacity .2s; text-align: left; }
  .bead:hover { border-color: var(--violet2); }
  .bead-bar { flex: none; width: 4px; border-radius: 999px; background: var(--violet2); }
  .bead-bar-place { background: var(--amber); }
  .bead.split .bead-bar { background: var(--bad); }
  .bead-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .12rem; }
  .bead-name { font-family: Georgia, serif; font-size: .88rem; color: var(--ink); display: flex; align-items: center; gap: .35rem; flex-wrap: wrap; }
  .bead-meta { font-family: ui-monospace, monospace; font-size: .64rem; color: var(--dim); }
  .bead-count { color: var(--muted); }
  .bead-state { font-family: ui-monospace, monospace; font-size: .56rem; text-transform: uppercase; letter-spacing: .04em; padding: .06rem .35rem; border-radius: 3px; border: 1px solid var(--line2); }
  .bead-state.lit { color: var(--ok); border-color: var(--ok); }
  .bead-state.dim { color: var(--amber); border-color: var(--amber); }
  .bead-state.unresolved { color: var(--bad); border-color: var(--bad); border-style: dashed; }
  .bead-dchips { display: flex; gap: .25rem; flex-wrap: wrap; margin-top: .18rem; }
  .bead-dchip { font-family: ui-monospace, monospace; font-size: .56rem; color: var(--muted); background: rgba(143, 136, 179, .08); border: 1px solid var(--line); border-radius: 3px; padding: .05rem .3rem; }
  .bead.dim { opacity: .15; }
  .bead.lit { border-color: var(--violet2); background: var(--bg2); }
  .bead.lit .bead-bar { box-shadow: 0 0 12px var(--violet2); }
  .bead.lit .bead-bar-place { box-shadow: 0 0 12px var(--amber); }
  .bead.place-lit .bead-bar { background: var(--ok); box-shadow: 0 0 12px var(--ok); }
  .bead.place-dim .bead-bar { background: var(--amber); box-shadow: 0 0 10px var(--amber); }
  .bead.place-unres .bead-bar { background: transparent; border: 1px dashed var(--bad); }
  .bead .gchip { position: absolute; top: .3rem; right: .3rem; }
  .split-pair { display: flex; align-items: center; gap: .8rem; margin-top: .4rem; flex-wrap: wrap; }
  .split-pair .bead { flex: 1 1 200px; }
  .split-edge { font-family: ui-monospace, monospace; font-size: .6rem; color: var(--bad); border-top: 2px dashed var(--bad); padding-top: .25rem; }
  .legend { font-family: ui-monospace, monospace; font-size: .62rem; color: var(--dim); padding: .15rem .4rem .4rem; }
  .subgrid { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; margin-top: .4rem; }
  @media (max-width: 1200px) { .subgrid { grid-template-columns: 1fr; } }
  .empty { font-family: ui-monospace, monospace; font-size: .68rem; color: var(--dim); padding: .15rem .4rem; }
  .doc-meta { font-family: ui-monospace, monospace; font-size: .7rem; color: var(--dim); font-weight: 400; }
  .reg-h { font-size: .95rem; margin: .7rem 0 .3rem; }
  .reg-h.sub-head { cursor: pointer; }
  .reg-h.sub-head:hover { color: var(--violet); }
  .f-network svg { width: 100%; height: auto; display: block; }
  .f-network .node { fill: var(--bg2); stroke: var(--violet2); stroke-width: 1.5; cursor: pointer; transition: opacity .2s; }
  .f-network .node-doc { stroke: var(--ok); }
  .f-network .node-place { stroke: var(--amber); }
  .f-network .edge { stroke: var(--line2); stroke-dasharray: 3 5; fill: none; cursor: pointer; transition: opacity .2s; }
  .f-network .g-node:hover .node { stroke: var(--violet); fill: var(--violet); }
  .f-network .g-edge:hover .edge { stroke: var(--violet); }
  .f-network .node-label { font-family: ui-monospace, monospace; font-size: 8px; fill: var(--muted); pointer-events: none; }
  .f-network .dim { opacity: .1; }
  .subgraph { margin-top: .7rem; }
  .subgraph.hidden-lens { display: none; }
  .dline { font-family: ui-monospace, monospace; font-size: .66rem; color: var(--muted); padding: .28rem .45rem; border-bottom: 1px solid var(--line); cursor: help; }
  .dline b { color: var(--violet); }
  .dline .num { color: var(--amber); }
  .drawer-head { display: flex; align-items: center; gap: .7rem; flex-wrap: wrap; margin-bottom: .4rem; }
  .drawer-body { max-height: 68vh; overflow: auto; }
  .row { border-left: 2px solid var(--line2); padding: .3rem .8rem; margin: .45rem 0 .45rem .3rem; border-radius: 0 6px 6px 0; display: none; }
  .row-head { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; font-family: ui-monospace, monospace; font-size: .7rem; color: var(--dim); }
  .slots { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: .3rem .5rem; margin-top: .45rem; }
  .slot { border: 1px dashed var(--line); border-radius: 6px; padding: .18rem .45rem .22rem; background: var(--bg3); min-width: 0; }
  .slot-lbl { display: block; font-size: .54rem; text-transform: uppercase; letter-spacing: .07em; color: var(--dim); }
  .slot-val { font-family: ui-monospace, monospace; font-size: .72rem; color: var(--ink); word-break: break-word; }
  .slot-val.empty { color: var(--dim); font-style: italic; }
  .slot-val[data-hol] { cursor: pointer; color: var(--violet); border-bottom: 1px dotted var(--violet2); }
  .slot-val[data-hol]:hover { color: var(--ink); background: rgba(139, 92, 246, .12); border-radius: 3px; }
  .slot-legend { font-family: ui-monospace, monospace; font-size: .64rem; color: var(--dim); margin: 0 0 .5rem; }
  .slot-legend b { color: var(--violet); font-weight: 500; }
  .row.t-dim { opacity: .3; }
  .kind { font-size: .6rem; text-transform: uppercase; letter-spacing: .06em; padding: .1rem .4rem; border-radius: 3px; background: rgba(139, 92, 246, .14); color: var(--violet); }
  .kind-number { background: rgba(251, 191, 36, .12); color: var(--amber); }
  .kind-name { background: rgba(74, 222, 128, .12); color: var(--ok); }
  .ref { color: var(--violet); cursor: help; }
  .page { color: var(--dim); }
  .verbatim { margin: .15rem 0 .05rem; font-size: .92rem; color: var(--ink); }
  .chips { display: flex; gap: .3rem; flex-wrap: wrap; font-family: ui-monospace, monospace; }
  .chip { font-size: .62rem; background: rgba(143, 136, 179, .1); border: 1px solid var(--line); border-radius: 4px; padding: .04rem .4rem; color: var(--muted); }
  .gchip { display: inline-flex; align-items: center; justify-content: center; min-width: 1.35em; font-family: "Apple Symbols", "Noto Sans Symbols 2", "Noto Sans Symbols", ui-monospace, Menlo, monospace; font-size: .86rem; line-height: 1; padding: .12rem .18rem; border-radius: 5px; border: 1px solid var(--line2); color: var(--muted); background: var(--bg3); cursor: pointer; user-select: none; transition: color .15s, border-color .15s; }
  .gchip:hover { color: var(--ink); border-color: var(--violet2); }
  .gchip-ground { color: var(--ground); border-color: color-mix(in srgb, var(--ground) 55%, transparent); }
  .gchip-figure { color: var(--figure); border-color: color-mix(in srgb, var(--figure) 55%, transparent); }
  .gchip-pattern { color: var(--pattern); border-color: color-mix(in srgb, var(--pattern) 55%, transparent); }
  .gmodal { display: none; position: fixed; inset: 0; z-index: 60; background: rgba(6, 5, 12, .72); align-items: center; justify-content: center; padding: 1.2rem; }
  .gmodal.on { display: flex; }
  .gmodal-card { max-width: 34rem; width: 100%; max-height: 84vh; overflow: auto; background: var(--bg2); border: 1px solid var(--line2); border-radius: 12px; padding: 1.1rem 1.2rem 1.2rem; }
  .gmodal-head { display: flex; align-items: center; gap: .8rem; margin-bottom: .7rem; }
  .gmodal-glyph { font-size: 2.2rem; line-height: 1.1; font-family: "Apple Symbols", "Noto Sans Symbols 2", "Noto Sans Symbols", Menlo, ui-monospace, monospace; }
  .gmodal-title { font-size: 1.02rem; font-weight: 600; }
  .gmodal-addr { font-family: ui-monospace, monospace; font-size: .7rem; color: var(--dim); }
  .gmodal-close { margin-left: auto; }
  .gmodal p { margin: .45rem 0; font-size: .88rem; line-height: 1.5; }
  .gmodal .lbl { font-family: ui-monospace, monospace; font-size: .62rem; text-transform: uppercase; letter-spacing: .06em; color: var(--dim); }
  .gmodal .meta-line { font-family: ui-monospace, monospace; font-size: .72rem; color: var(--muted); border-left: 2px solid var(--line2); padding-left: .6rem; margin: .3rem 0; }
  .gmodal .nulls { font-family: ui-monospace, monospace; font-size: .72rem; color: var(--amber); }
  .gmodal .ref-line { font-family: ui-monospace, monospace; font-size: .72rem; color: var(--violet); word-break: break-all; }
  .gmodal .verbatim { font-style: italic; color: var(--muted); }
  .model-claim { font-style: italic; color: var(--muted); border-left: 2px solid var(--line2); padding: .3rem .8rem; margin: .4rem 0; }
  .model-tag { font-family: ui-monospace, monospace; font-size: .62rem; color: var(--dim); font-style: normal; letter-spacing: .04em; }
  #paradigm-pop { display: none; border: 1px solid var(--line); border-radius: 10px; background: var(--bg2); padding: .6rem .8rem; margin: .5rem 1rem; }
  #paradigm-pop.on { display: block; }
  #paradigm-pop ul { display: flex; gap: .4rem 1.4rem; flex-wrap: wrap; padding-left: 0; list-style: none; font-family: ui-monospace, monospace; font-size: .7rem; color: var(--muted); }
  .ok { color: var(--ok); }
  .bad { color: var(--bad); }
  footer { max-width: 96rem; margin: 0 auto; padding: 0 1rem 2rem; font-family: ui-monospace, monospace; font-size: .66rem; color: var(--dim); }
  @media (max-width: 900px) {
    .workspace { flex-direction: column; }
    .rail { flex-direction: row; flex-wrap: wrap; width: auto; position: static; }
    .rail-btn { flex: 1 1 auto; }
    .beads { grid-template-columns: 1fr; }
    footer { font-size: .6rem; }
  }
</style>
</head>
<body>
<header class="frame">
  <div class="row1">
    <span class="mark"><span class="dot"></span>the&nbsp;fold · <b>${esc(def.city)}</b></span>
    <div class="worldviews" id="worldviews">${worldviewsHtml}</div>
    <span class="seal-mini ${gate.ok ? "" : "refuse"}" id="seal-mini" title="the gate — paradigm-independent">gate ${gate.ok ? "● pass" : "✗ refuse"}</span>
    <span class="spacer"></span>
    <span class="scope-chip" id="scope-chip" style="display:none"></span>
    <input id="gsearch" placeholder="search — every view is from a position">
    <button id="tog-whisper">whisper</button>
    <button id="tog-gate">gate</button>
    <button id="tog-map">map</button>
    <button id="tog-theme">light ⇄ dark</button>
    <button id="tog-refs">bytes ⇄ page</button>
    <button id="tog-prov">prov</button>
  </div>
  <div class="row2" id="kindstrip">${kindPills}<span class="pill" style="pointer-events:none;opacity:.5">lenses</span>${lensPills}</div>
  <div class="timebar" id="timebar">
    <span class="tb-label">timeline lens</span>
    <button id="t-prev" title="cursor back one year">◀</button>
    <svg id="timeline-svg" viewBox="0 0 460 34" preserveAspectRatio="xMidYMid meet"></svg>
    <button id="t-next" title="cursor forward one year">▶</button>
    <span class="tb-cursor" id="t-label"></span>
  </div>
</header>
<div class="whisper-strip" id="whisper-strip">${atmosphereInner}</div>
<div class="map-strip" id="map-strip">
  <div class="map-head"><span class="terrain">map lens · Interpretation·Figure</span><span class="empty">spatial arrangement of the retained snapshot — amber = open code violations · violet = eviction property density</span></div>
  <div id="map-body"></div>
</div>
<div id="paradigm-pop">${checksHtml}</div>
<main>
  <div class="crumb" id="crumb"></div>
  <div class="workspace">
    <nav class="rail" id="rail">
      <button class="rail-btn on" data-section="sources"><span>Sources<span class="rail-t">T1 · the documents</span></span><span class="rail-n" id="rn-sources">0</span></button>
      <button class="rail-btn" data-section="beings"><span>Beings<span class="rail-t">T3 · agencies &amp; places</span></span><span class="rail-n" id="rn-beings">0</span></button>
      <button class="rail-btn" data-section="connections"><span>Connections<span class="rail-t">T4 · asserted rows</span></span><span class="rail-n" id="rn-connections">0</span></button>
      <button class="rail-btn" data-section="network"><span>Network<span class="rail-t">T6 · the graph</span></span><span class="rail-n" id="rn-network">0</span></button>
      <button class="rail-btn" data-section="measures"><span>Measures<span class="rail-t">T5 · the metrics</span></span><span class="rail-n" id="rn-measures">0</span></button>
    </nav>
    <div class="workbody">
      <div class="panel on" id="panel-sources">
        <div id="sources-list">${voidInner}</div>
        <div id="sources-reader" style="display:none">
          <div class="reader-head">
            <button id="reader-back">← back to sources</button>
            <span class="reader-title" id="reader-title"></span>
            <span id="startle-count" class="startle-count" style="display:none" title="something unexpected in this document — what am I looking at?"></span>
            <span class="spacer"></span>
            <button class="mode-btn on" id="reader-mode-reader">reader</button>
            <button class="mode-btn" id="reader-mode-source">source</button>
            <button class="mode-btn" id="reader-mode-native">native</button>
            <input id="reader-find" placeholder="find in this document">
            <button id="reader-filter" class="mode-btn" title="only paragraphs with a match">filter</button>
            <button id="reader-next" title="next match">↓</button>
            <span id="find-state" class="empty"></span>
            <button id="reader-scope">open its rows in Connections →</button>
          </div>
          <div id="reader-body" class="reader-text"></div>
        </div>
      </div>
      <div class="panel" id="panel-beings">
        <h2><span class="terrain">T3 · Entity</span> the beings <span class="doc-meta">click one — it lights everywhere</span></h2>
        <p class="empty">agencies — who acts</p>
        <div class="beads" id="beads">${Object.entries(agencyCount).sort((a, b) => b[1] - a[1]).map(([a, n]) => beingCard(a, n, "agency")).join("")}</div>
        <p class="empty">places — the districts each maps to, with 311 open counts</p>
        <div class="beads">${Object.entries(placeCount).sort((a, b) => b[1] - a[1]).map(([p, n]) => placeCard(p, n)).join("")}</div>
        <div class="split-pair">${beingCard("MTA", agencyCount["MTA"] ?? 0, "agency", { split: true })}<span class="split-edge">✗ not merged — no received prior</span>${beingCard("WeGo", agencyCount["WeGo"] ?? 0, "agency", { split: true })}</div>
      </div>
      <div class="panel" id="panel-connections">
        <div class="drawer-head">
          <h2 style="margin:0"><span class="terrain">T4 · Link</span> the asserted connections</h2>
          <span class="spacer"></span>
          <span class="empty" id="drawer-state"></span>
          <button id="clear-light" style="display:none">clear light ✕</button>
        </div>
        <p class="slot-legend">every connection is the same box with the same slots — <b>agency · place · amount · year · section</b> — plus its byte ref and page. an empty slot renders as <b>—</b>: the row does not carry that field. click an agency or place value to focus it.</p>
        <div id="conn-groups" class="conn-groups" style="display:none"></div>
        <div class="drawer-body" id="rows">${rowsHtml}</div>
      </div>
      <div class="panel" id="panel-network">
        <h2><span class="terrain">T6 · Network</span> the web <span class="doc-meta">edges are beings named in documents — hover an edge for its byte ref</span></h2>
        <div class="f-network" id="graph">${graph(topBeings, docIds, mainEdgeCounts, 620, 24)}</div>
        <p class="legend">violet = agencies · amber = places · green = documents · stroke width = rows</p>
        <div class="subgrid" id="subgraphs">${subgraphs}</div>
      </div>
      <div class="panel" id="panel-measures">${fieldInner}</div>
    </div>
    <aside class="inspector" id="inspector">
      <div class="insp-empty">nothing focused — click a name anywhere.<br><br>every named thing — a being, a document, a kind, a lens — has a profile that opens here: where it appears, how many rows, what it co-occurs with. nothing is invented.</div>
    </aside>
  </div>
</main>
${docPayloads}
${timelinePayload}
${geoPayload}
<script type="application/json" id="grounding-cells">${jsonScriptSafe(GROUNDING_CELLS)}</script>
<div class="gmodal" id="gmodal" role="dialog" aria-modal="true">
  <div class="gmodal-card" id="gmodal-card">
    <div class="gmodal-head">
      <span class="gmodal-glyph" id="gmodal-glyph"></span>
      <div>
        <div class="gmodal-title" id="gmodal-title"></div>
        <div class="gmodal-addr" id="gmodal-addr"></div>
      </div>
      <button class="gmodal-close" id="gmodal-close">✕</button>
    </div>
    <div id="gmodal-body"></div>
  </div>
</div>
<footer>A surface of the fold — the Interpretations filter (Paradigm · Atmosphere · Lens); Existence and Structure are what you look at (Void · Entity · Kind · Link · Network · Field). Every ref is <code>file#start-end</code> into a retained, hashed text layer. The glyph beside each grounded element is that grounding act's cell (<span class="gchip gchip-figure" data-cell="CON·Figure">⋈+</span> arrangement · <span class="gchip gchip-figure" data-cell="SIG·Figure">○+</span> identity · <span class="gchip gchip-ground" data-cell="CON·Ground">⋈−</span> field · <span class="gchip gchip-pattern" data-cell="CON·Pattern">⋈*</span> network · <span class="gchip gchip-figure" data-cell="INS·Figure">●+</span> source) — click it for what that grounding is and what it owes. Nothing here is authored by a frontier model.</footer>
<script>
  var root = document.documentElement;
  var saved = localStorage.getItem('fold-theme');
  var prefers = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  root.dataset.theme = saved || prefers;
  document.getElementById('tog-theme').addEventListener('click', function () {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('fold-theme', root.dataset.theme);
  });
  var bytes = true;
  document.getElementById('tog-refs').addEventListener('click', function () {
    bytes = !bytes;
    var refs = document.querySelectorAll('.ref');
    for (var i = 0; i < refs.length; i++) refs[i].textContent = bytes ? refs[i].dataset.byte : refs[i].dataset.page;
  });
  document.getElementById('tog-prov').addEventListener('click', function () { document.body.classList.toggle('no-prov'); });
  document.getElementById('tog-whisper').addEventListener('click', function () { document.getElementById('whisper-strip').classList.toggle('on'); });
  document.getElementById('tog-gate').addEventListener('click', function () { document.getElementById('paradigm-pop').classList.toggle('on'); });

  function escHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var rows = Array.prototype.slice.call(document.querySelectorAll('#rows .row'));
  var beads = Array.prototype.slice.call(document.querySelectorAll('.bead'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var dlines = Array.prototype.slice.call(document.querySelectorAll('.dline'));
  var subgraphs = Array.prototype.slice.call(document.querySelectorAll('.subgraph'));
  var gNodes = Array.prototype.slice.call(document.querySelectorAll('.g-node'));
  var gEdges = Array.prototype.slice.call(document.querySelectorAll('.g-edge'));

  var q = '', light = null, scope = null, forceAll = null, kindFocus = null;
  var kindOn = {};
  var kp = document.querySelectorAll('#kindstrip .pill[data-kind].on');
  for (var i = 0; i < kp.length; i++) kindOn[kp[i].dataset.kind] = true;
  var lensOn = {};
  var lp = document.querySelectorAll('#kindstrip .pill[data-lens].on');
  for (var j = 0; j < lp.length; j++) lensOn[lp[j].dataset.lens] = true;

  var hayOf = function (el) { return el.dataset.hay || ''; };
  var qMatch = function (el) { return !q || hayOf(el).indexOf(q) !== -1; };
  var beingOf = function (r) { return (r.dataset.agency || '') + ' ' + (r.dataset.place || ''); };

  function rowShown(r) {
    var inScope = !scope || r.dataset.doc === scope;
    var inKind = kindOn[r.dataset.kind] && (!kindFocus || r.dataset.kind === kindFocus);
    var inTime = !adoptedOf[r.dataset.doc] || adoptedOf[r.dataset.doc] <= tCursor;
    var inLight = !light || (
      light.lens ? (r.dataset.lens || '').split(' ').indexOf(light.lens) !== -1
      : light.a ? r.dataset.agency === light.a && r.dataset.doc === light.p
      : beingOf(r).toLowerCase().indexOf(light) !== -1 && r.dataset.doc === (light.doc || r.dataset.doc)
    );
    return inScope && inKind && inLight && inTime && qMatch(r);
  }
  function litBy(name) { return light && !light.lens && !light.a && light === name.toLowerCase(); }

  // ── the holograph reader/source — built from the SAME retained bytes ────
  var docCache = {};
  function getDocData(id) {
    if (docCache[id]) return docCache[id];
    var el = document.getElementById('doctext-' + id);
    var data = el ? JSON.parse(el.textContent) : { text: '', marks: [] };
    docCache[id] = data;
    return data;
  }
  function markAttrs(m) {
    var who = m.agency || m.place || '';
    return 'class="hit hit-' + m.kind + '"' +
      (m.agency ? ' data-agency="' + escHtml(m.agency) + '"' : '') +
      (m.place ? ' data-place="' + escHtml(m.place) + '"' : '') +
      ' title="' + escHtml(m.kind + (who ? ' · ' + who : '') + ' · ' + m.ref) + '"';
  }
  // ── the structure-aware reader — a reflowed projection, never the bytes ──
  // The reader consumes the readertext-<id> payload (reflowed text, remapped
  // marks, paragraph table) and renders headings as h3, body as p, paginated
  // at paragraph boundaries. Only ENTITIES are clickable — an entity word
  // opens its profile in the inspector; every other word is text, never a
  // link. Source mode still reads the raw doctext payload byte-exact.
  var rDocCache = {};
  function fallbackParas(text) {
    var paras = [], start = 0;
    for (var p = 0; p <= text.length; p++) {
      if (p === text.length || text[p] === '\\n') {
        if (p > start) paras.push({ start: start, end: p, heading: false });
        start = p + 1;
      }
    }
    if (!paras.length && text.length) paras.push({ start: 0, end: text.length, heading: false });
    return paras;
  }
  function getReaderData(id) {
    if (rDocCache[id]) return rDocCache[id];
    var data = null;
    var el = document.getElementById('readertext-' + id);
    if (el) { try { data = JSON.parse(el.textContent); } catch (e) { data = null; } }
    if (!data || !data.text) {
      var raw = getDocData(id);
      data = { text: raw.text, marks: raw.marks, paras: fallbackParas(raw.text) };
    }
    if (!data.paras || !data.paras.length) data.paras = fallbackParas(data.text);
    data.marks = data.marks.slice().sort(function (a, b) { return a.start - b.start; });
    rDocCache[id] = data;
    return data;
  }
  // ONLY ENTITIES ARE CLICKABLE (user direction): a plain word is text, not
  // a link. entityList is populated from the beings panel (agencies +
  // places, including multi-word names like "East Bank" / "Housing
  // Division"); wordify wraps an entity's FULL surface — never a fragment
  // of one — in a clickable span that opens the being's profile.
  var entityList = [];
  function buildEntityList() {
    entityList = [];
    var seen = {};
    var beads2 = document.querySelectorAll('.bead');
    for (var bi = 0; bi < beads2.length; bi++) {
      var nm = beads2[bi].dataset.light;
      if (!nm) continue;
      var lower = nm.toLowerCase();
      if (seen[lower]) continue;
      seen[lower] = true;
      entityList.push({ name: nm, lower: lower, len: lower.length });
    }
    entityList.sort(function (a, b) { return b.len - a.len; });
  }
  function isWordChar(c) { return c && /[A-Za-z0-9']/.test(c); }
  function wordify(seg) {
    if (!entityList.length) return escHtml(seg);
    var low = seg.toLowerCase();
    var out = '', cursor = 0;
    while (cursor < seg.length) {
      // earliest entity-surface match from cursor; ties go to the longest
      var best = null;
      for (var i = 0; i < entityList.length; i++) {
        var idx = low.indexOf(entityList[i].lower, cursor);
        if (idx === -1) continue;
        if (!best || idx < best.idx || (idx === best.idx && entityList[i].len > best.len)) {
          best = { idx: idx, ent: entityList[i] };
        }
      }
      if (!best) break;
      // a real word boundary: the char before is not a letter, the char
      // after is not a letter — "East Bank" never matches inside
      // "Eastbankrupt" or after "theeast"
      var before = seg[best.idx - 1], after = seg[best.idx + best.ent.len];
      if (isWordChar(before) || isWordChar(after)) { cursor = best.idx + 1; continue; }
      if (best.idx > cursor) out += escHtml(seg.slice(cursor, best.idx));
      out += '<span class="eword" data-entity="' + escHtml(best.ent.name) + '" title="' + escHtml(best.ent.name) + '">' + escHtml(seg.slice(best.idx, best.idx + best.ent.len)) + '</span>';
      cursor = best.idx + best.ent.len;
    }
    out += escHtml(seg.slice(cursor));
    return out;
  }
  function paragraphHtml(rt, pi) {
    var par = rt.paras[pi];
    var p0 = par.start, p1 = par.end;
    var seg = rt.text.slice(p0, p1);
    var out = '', pos = 0;
    var ms = rt.marks;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.end <= p0 || m.start >= p1) continue;
      var s = Math.max(m.start, p0), e = Math.min(m.end, p1);
      if (s > pos) out += wordify(seg.slice(pos - p0, s - p0));
      out += '<mark ' + markAttrs(m) + '>' + escHtml(seg.slice(s - p0, e - p0)) + '</mark>';
      pos = e;
    }
    if (pos < p1) out += wordify(seg.slice(pos - p0));
    return par.heading ? '<h3>' + out + '</h3>' : '<p>' + out + '</p>';
  }
  function paragraphHtml(rt, pi) {
    var par = rt.paras[pi];
    var p0 = par.start, p1 = par.end;
    var seg = rt.text.slice(p0, p1);
    var ranges = [];
    var ms = rt.marks;
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.end <= p0 || m.start >= p1) continue;
      ranges.push({ s: Math.max(m.start, p0) - p0, e: Math.min(m.end, p1) - p0, m: m });
    }
    if (rFind) {
      var low = seg.toLowerCase(), f = rFind, at = low.indexOf(f);
      while (at !== -1) {
        ranges.push({ s: at, e: at + f.length, m: null });
        at = low.indexOf(f, at + f.length);
      }
    }
    ranges.sort(function (a, b) { return a.s - b.s; });
    var merged = [];
    for (var r2 = 0; r2 < ranges.length; r2++) {
      var cur = ranges[r2];
      if (merged.length && cur.s < merged[merged.length - 1].e) {
        var prev = merged[merged.length - 1];
        if (cur.e > prev.e) prev.e = cur.e;
        if (cur.m && !prev.m) prev.m = cur.m;
      } else merged.push({ s: cur.s, e: cur.e, m: cur.m });
    }
    var out = '', pos = 0;
    for (var k = 0; k < merged.length; k++) {
      var rng = merged[k];
      if (rng.s > pos) out += wordify(seg.slice(pos, rng.s));
      if (rng.m) out += '<mark ' + markAttrs(rng.m) + '>' + escHtml(seg.slice(rng.s, rng.e)) + '</mark>';
      else out += '<mark class="find">' + escHtml(seg.slice(rng.s, rng.e)) + '</mark>';
      pos = rng.e;
    }
    if (pos < seg.length) out += wordify(seg.slice(pos));
    return par.heading ? '<h3>' + out + '</h3>' : '<p>' + out + '</p>';
  }
  function countMatches(text, term) {
    var low = text.toLowerCase(), n = 0, at = low.indexOf(term);
    while (at !== -1) { n++; at = low.indexOf(term, at + term.length); }
    return n;
  }
  var R_CHUNK = 40;
  var rStream = { rt: null, pi: 0, stIdx: 0 };
  function startleHtml(st) {
    return '<div class="startle" data-rawat="' + st.rawAt + '" title="' + escHtml(st.label) + '"><span class="startle-glyph">⚠</span><b>what am I looking at?</b><span class="startle-label">' + escHtml(st.label) + (st.preview ? ' — “' + escHtml(st.preview) + '”' : '') + '</span><button class="startle-jump">raw bytes →</button></div>';
  }
  function rMore() {
    var box = document.getElementById('rparas');
    if (!box || !rStream.rt) return false;
    var rt = rStream.rt;
    var added = 0;
    while (added < R_CHUNK && rStream.pi < rt.paras.length) {
      var pi = rStream.pi;
      rStream.pi++;
      var par = rt.paras[pi];
      var matches = rFind ? countMatches(rt.text.slice(par.start, par.end), rFind) : -1;
      if (rFilter && matches === 0) continue;
      box.insertAdjacentHTML('beforeend', paragraphHtml(rt, pi));
      added++;
      while (rStream.stIdx < (rt.startles || []).length && rt.startles[rStream.stIdx].at < par.end) {
        var st = rt.startles[rStream.stIdx];
        if (st.at >= par.start) box.insertAdjacentHTML('beforeend', startleHtml(st));
        rStream.stIdx++;
      }
    }
    var done = rStream.pi >= rt.paras.length;
    var sent = document.getElementById('r-sentinel');
    if (sent) sent.style.display = done ? 'none' : '';
    return !done;
  }
  function onRScroll() {
    var body = document.getElementById('reader-body');
    if (readerState.mode === 'reader' && body.scrollTop + body.clientHeight >= body.scrollHeight - 80) {
      if (!rMore()) body.removeEventListener('scroll', onRScroll);
    }
  }
  function restartReader() {
    var body = document.getElementById('reader-body');
    rStream.pi = 0; rStream.stIdx = 0;
    body.innerHTML = '<div id="rparas"></div><div id="r-sentinel" class="empty">more ↓ scroll</div>';
    rMore();
    updateFindState();
    if (rFilter) {
      var f = body.querySelector('.find');
      if (f) f.scrollIntoView({ block: 'center' });
    }
  }
  var ROWLEN = 110, ROWS_PER_PAGE = 360;
  function renderNativeHtml(id) {
    var el = document.getElementById('nativepages-' + id);
    if (!el) return '<p class="empty">no native rendering for this document — pdf.js or pdftoppm was unavailable at build time; the reader and source modes still work.</p>';
    var data;
    try { data = JSON.parse(el.textContent); } catch (e) { return '<p class="empty">native payload failed to parse.</p>'; }
    var out = '';
    for (var p = 0; p < data.length; p++) {
      var pg = data[p];
      out += '<div class="npage" style="width:' + pg.w + 'px">' +
        (pg.img ? '<img src="' + pg.img + '" alt="page ' + (p + 1) + '" style="width:100%">' : '<div class="empty" style="height:400px">page ' + (p + 1) + ' — no render</div>') +
        '<div class="nwords">';
      for (var w = 0; w < pg.words.length; w++) {
        var wd = pg.words[w];
        // ONLY ENTITIES ARE CLICKABLE — a plain word on the native page is
        // not a link; only a being (agency/place) gets an overlay span.
        if (!beingSet[wd.t.toLowerCase()]) continue;
        out += '<span class="nword nword-being" data-word="' + escHtml(wd.t) + '" style="left:' + wd.x.toFixed(1) + 'px;top:' + wd.y.toFixed(1) + 'px;width:' + wd.w.toFixed(1) + 'px;height:' + wd.h.toFixed(1) + 'px" title="' + escHtml(wd.t) + '"></span>';
      }
      out += '</div></div>';
    }
    return '<p class="empty">rendered from the retained PDF at build time — only entity words are clickable (they open the profile); the exact byte layer is source mode.</p>' + out;
  }
  function buildSourceHtml(text, marks, page) {
    var totalRows = Math.max(1, Math.ceil(text.length / ROWLEN));
    var totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
    page = Math.max(0, Math.min(page, totalPages - 1));
    var startRow = page * ROWS_PER_PAGE, endRow = Math.min(totalRows, startRow + ROWS_PER_PAGE);
    var ms = marks.slice().sort(function (a, b) { return a.start - b.start; });
    var html = '';
    for (var r = startRow; r < endRow; r++) {
      var rs = r * ROWLEN, re = Math.min(text.length, rs + ROWLEN);
      var seg = '', p = rs;
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.end <= rs || m.start >= re) continue;
        var s = Math.max(m.start, rs), e = Math.min(m.end, re);
        if (s > p) seg += escHtml(text.slice(p, s));
        seg += '<mark ' + markAttrs(m) + '>' + escHtml(text.slice(s, e)) + '</mark>';
        p = e;
      }
      seg += escHtml(text.slice(p, re));
      html += '<div class="srow"><span class="goff">' + rs + '</span><span class="gtxt">' + seg + '</span></div>';
    }
    var pager = '<div class="pager"><button ' + (page <= 0 ? 'disabled' : '') + ' data-page="' + (page - 1) + '">← prev</button><span>bytes ' + startRow * ROWLEN + '–' + (endRow * ROWLEN) + ' of ' + text.length + ' · page ' + (page + 1) + '/' + totalPages + '</span><button ' + (endRow >= totalRows ? 'disabled' : '') + ' data-page="' + (page + 1) + '">next →</button></div>';
    return pager + '<div class="source-rows">' + html + '</div>' + pager;
  }

  var readerState = { doc: null, mode: 'reader', page: 0 };
  var rFind = '', rFilter = false;
  var sourcesList = document.getElementById('sources-list');
  var sourcesReader = document.getElementById('sources-reader');

  function renderReaderBody() {
    var body = document.getElementById('reader-body');
    if (readerState.mode === 'reader') {
      body.className = 'reader-text';
      rStream.rt = getReaderData(readerState.doc);
      rStream.pi = 0; rStream.stIdx = 0;
      body.innerHTML = '<div id="rparas"></div><div id="r-sentinel" class="empty">more ↓ scroll</div>';
      rMore();
      updateFindState();
    } else if (readerState.mode === 'native') {
      body.className = 'reader-native';
      body.innerHTML = renderNativeHtml(readerState.doc);
    } else {
      var data = getDocData(readerState.doc);
      body.className = 'source-view';
      body.innerHTML = buildSourceHtml(data.text, data.marks, readerState.page);
      var pbtns = body.querySelectorAll('[data-page]');
      for (var i = 0; i < pbtns.length; i++) pbtns[i].addEventListener('click', function () {
        if (this.disabled) return;
        readerState.page = Number(this.dataset.page);
        renderReaderBody();
      });
    }
    var sc = document.getElementById('startle-count');
    var startles = (getReaderData(readerState.doc).startles) || [];
    sc.style.display = startles.length ? '' : 'none';
    sc.textContent = '⚠ ' + startles.length + ' unexpected';
  }
  document.getElementById('reader-body').addEventListener('scroll', onRScroll);
  document.getElementById('reader-body').addEventListener('click', function (ev) {
    var t = ev.target;
    if (t.closest('.hit')) {
      var hit = t.closest('.hit');
      var name = (hit.dataset.agency || hit.dataset.place || '').toLowerCase();
      if (name) { toggleLight(name); openInspector('being', name); }
      return;
    }
    if (t.closest('.eword')) {
      var ew = t.closest('.eword');
      var entity = ew.dataset.entity;
      var ed = entity.toLowerCase();
      toggleLight(ed);
      openInspector('being', entity);
      var ews = document.getElementById('reader-body').querySelectorAll('.eword');
      for (var ex = 0; ex < ews.length; ex++) ews[ex].classList.remove('eword-hot');
      for (var ex = 0; ex < ews.length; ex++) if (ews[ex] !== ew && ews[ex].dataset.entity.toLowerCase() === ed) ews[ex].classList.add('eword-hot');
      return;
    }
    if (t.closest('.nword')) {
      var nw = t.closest('.nword');
      var nwd = nw.dataset.word.toLowerCase();
      toggleLight(nwd);
      openInspector('being', nw.dataset.word);
      var nws = document.getElementById('reader-body').querySelectorAll('.nword');
      for (var nx = 0; nx < nws.length; nx++) nws[nx].classList.remove('nword-hot');
      for (var nx = 0; nx < nws.length; nx++) if (nws[nx] !== nw && nws[nx].dataset.word.toLowerCase() === nwd) nws[nx].classList.add('nword-hot');
      return;
    }
    if (t.closest('.startle-jump')) {
      var rawAt = Number(t.closest('.startle').dataset.rawat);
      readerState.mode = 'source';
      readerState.page = Math.max(0, Math.floor(rawAt / ROWLEN / ROWS_PER_PAGE));
      document.getElementById('reader-mode-reader').classList.remove('on');
      document.getElementById('reader-mode-source').classList.add('on');
      renderReaderBody();
      var srows = document.getElementById('reader-body').querySelectorAll('.srow');
      var startRow = readerState.page * ROWS_PER_PAGE;
      for (var sr = 0; sr < srows.length; sr++) {
        var r0 = (startRow + sr) * ROWLEN, r1 = r0 + ROWLEN;
        if (rawAt >= r0 && rawAt < r1) {
          srows[sr].classList.add('startle-hot');
          srows[sr].scrollIntoView({ block: 'center' });
          break;
        }
      }
      updateCrumb();
    }
  });
  function openReader(docId) {
    readerState.doc = docId; readerState.mode = 'reader'; readerState.page = 0;
    buildEntityList();
    rFind = ''; rFilter = false;
    document.getElementById('reader-find').value = '';
    document.getElementById('reader-filter').classList.remove('on');
    document.getElementById('find-state').textContent = '';
    sourcesList.style.display = 'none'; sourcesReader.style.display = '';
    document.getElementById('reader-title').textContent = docId;
    document.getElementById('reader-mode-reader').classList.add('on');
    document.getElementById('reader-mode-source').classList.remove('on');
    document.getElementById('reader-mode-native').classList.remove('on');
    renderReaderBody();
    updateCrumb();
  }
  function updateFindState() {
    var fs = document.getElementById('find-state');
    if (!rFind) { fs.textContent = ''; return; }
    var rt = getReaderData(readerState.doc);
    var total = 0, pars = 0;
    for (var fi = 0; fi < rt.paras.length; fi++) {
      var n = countMatches(rt.text.slice(rt.paras[fi].start, rt.paras[fi].end), rFind);
      if (n) { total += n; pars++; }
    }
    fs.textContent = total + ' matches in ' + pars + ' paragraphs';
  }
  document.getElementById('reader-find').addEventListener('input', function () {
    rFind = this.value.trim().toLowerCase();
    if (!rFind) rFilter = false;
    document.getElementById('reader-filter').classList.toggle('on', rFilter);
    restartReader();
  });
  document.getElementById('reader-filter').addEventListener('click', function () {
    rFilter = !rFilter;
    this.classList.toggle('on', rFilter);
    restartReader();
  });
  document.getElementById('reader-next').addEventListener('click', function () {
    if (!rFind) return;
    var body2 = document.getElementById('reader-body');
    var finds = body2.querySelectorAll('.find');
    var cur = body2.querySelector('.find-hot');
    var next = null;
    for (var fi = 0; fi < finds.length; fi++) {
      if (cur && finds[fi] === cur) { next = finds[fi + 1] || finds[0]; break; }
    }
    if (!next) next = finds[0];
    if (cur) cur.classList.remove('find-hot');
    if (next) { next.classList.add('find-hot'); next.scrollIntoView({ block: 'center' }); }
  });
  document.getElementById('reader-back').addEventListener('click', function () {
    sourcesReader.style.display = 'none'; sourcesList.style.display = '';
    readerState.doc = null; updateCrumb();
  });
  document.getElementById('reader-mode-reader').addEventListener('click', function () {
    readerState.mode = 'reader'; readerState.page = 0; this.classList.add('on');
    document.getElementById('reader-mode-source').classList.remove('on');
    document.getElementById('reader-mode-native').classList.remove('on');
    renderReaderBody(); updateCrumb();
  });
  document.getElementById('reader-mode-source').addEventListener('click', function () {
    readerState.mode = 'source'; readerState.page = 0; this.classList.add('on');
    document.getElementById('reader-mode-reader').classList.remove('on');
    document.getElementById('reader-mode-native').classList.remove('on');
    renderReaderBody(); updateCrumb();
  });
  document.getElementById('reader-mode-native').addEventListener('click', function () {
    readerState.mode = 'native'; readerState.page = 0; this.classList.add('on');
    document.getElementById('reader-mode-reader').classList.remove('on');
    document.getElementById('reader-mode-source').classList.remove('on');
    renderReaderBody(); updateCrumb();
  });
  document.getElementById('reader-scope').addEventListener('click', function () {
    scope = readerState.doc; showSection('connections'); refresh();
  });
  document.getElementById('startle-count').addEventListener('click', function () {
    var s = document.getElementById('reader-body').querySelector('.startle');
    if (s) s.scrollIntoView({ block: 'center' });
  });
  for (var ci = 0; ci < cards.length; ci++) cards[ci].addEventListener('click', function () { openReader(this.dataset.doc); openInspector('doc', this.dataset.doc); });

  // ── one panel at a time — no view from nowhere ───────────────────────────
  var sectionPanels = { sources: 'panel-sources', beings: 'panel-beings', connections: 'panel-connections', network: 'panel-network', measures: 'panel-measures' };
  var railBtns = Array.prototype.slice.call(document.querySelectorAll('.rail-btn'));
  var state = { section: 'sources' };
  function showSection(sec) {
    state.section = sec;
    for (var k in sectionPanels) document.getElementById(sectionPanels[k]).classList.toggle('on', k === sec);
    for (var i = 0; i < railBtns.length; i++) railBtns[i].classList.toggle('on', railBtns[i].dataset.section === sec);
    updateCrumb();
  }
  for (var rb = 0; rb < railBtns.length; rb++) railBtns[rb].addEventListener('click', function () { showSection(this.dataset.section); });

  var secLabel = { sources: 'Sources — the retained documents', beings: 'Beings — agencies & places named', connections: 'Connections — the asserted rows', network: 'Network — the graph', measures: 'Measures — the metrics' };
  function describeLight(l) {
    if (l.lens) return 'lens ' + l.lens;
    if (l.a) return l.a + ' in ' + l.p;
    return l;
  }
  function updateCrumb() {
    var parts = [secLabel[state.section] || state.section];
    if (state.section === 'sources' && readerState.doc) {
      parts.push(readerState.doc);
      parts.push(readerState.mode === 'reader' ? 'reader — rendered text' : readerState.mode === 'native' ? 'native — the retained PDF, word-linked' : 'source — raw bytes, offset ' + (readerState.page * ROWS_PER_PAGE * ROWLEN));
    }
    if (scope) parts.push('scoped to ' + scope);
    if (light) parts.push('lit: ' + describeLight(light));
    if (q) parts.push('search "' + q + '"');
    document.getElementById('crumb').innerHTML = parts.map(function (p, i) {
      return (i > 0 ? '<span class="crumb-sep">›</span>' : '') + '<span>' + escHtml(p) + '</span>';
    }).join('');
  }

  function buildGroups() {
    var perDoc = {};
    for (var i = 0; i < rows.length; i++) perDoc[rows[i].dataset.doc] = (perDoc[rows[i].dataset.doc] || 0) + 1;
    return Object.keys(perDoc).sort(function (a, b) { return perDoc[b] - perDoc[a]; }).map(function (d) {
      var card = cards.find(function (c) { return c.dataset.doc === d; });
      var t = card ? card.querySelector('h3').textContent : d;
      return '<button class="conn-group" data-doc="' + escHtml(d) + '"><span><b>' + escHtml(t) + '</b><br>' + escHtml(d) + '</span><span class="n">' + perDoc[d] + ' rows →</span></button>';
    }).join('') + '<button class="conn-group" data-doc="*"><span>show every row anyway</span><span class="n">' + rows.length + ' rows</span></button>';
  }
  document.getElementById('conn-groups').addEventListener('click', function (ev) {
    var g = ev.target.closest('.conn-group');
    if (!g) return;
    if (g.dataset.doc === '*') { forceAll = true; refresh(); return; }
    scope = g.dataset.doc;
    refresh();
  });
  document.getElementById('rows').addEventListener('click', function (ev) {
    var sv = ev.target.closest('.slot-val[data-hol]');
    if (sv) {
      var nm = sv.textContent.trim();
      if (nm && nm !== '—') { toggleLight(nm.toLowerCase()); openInspector('being', nm); }
    }
  });

  // ── the timeline lens — every fact is dated by its document ─────────────
  var adoptedOf = {};
  for (var ci2 = 0; ci2 < cards.length; ci2++) {
    var ay = cards[ci2].dataset.adopted;
    if (ay) adoptedOf[cards[ci2].dataset.doc] = Number(ay);
  }
  var tMeta = null;
  var tPayload = document.getElementById('timeline-meta');
  if (tPayload) { try { tMeta = JSON.parse(tPayload.textContent); } catch (e) { tMeta = null; } }
  var T_MIN = (tMeta && tMeta.min) || 2015;
  var T_MAX = (tMeta && tMeta.max) || 2025;
  var tCursor = T_MAX;
  function setCursor(y) {
    tCursor = Math.max(T_MIN, Math.min(T_MAX, y));
    updateTimelineCursor();
    refresh();
  }
  function updateTimelineCursor() {
    var l = document.getElementById('t-label');
    if (l) l.textContent = 'cursor · ' + tCursor;
    var c = document.getElementById('t-cursor');
    if (c && tMeta) {
      var W = 460, padL = 30, padR = 10;
      var x = padL + (tCursor - T_MIN) / (T_MAX - T_MIN) * (W - padL - padR);
      c.setAttribute('x1', x);
      c.setAttribute('x2', x);
    }
  }
  function buildTimeline() {
    var svg = document.getElementById('timeline-svg');
    if (!svg) return;
    var W = 460, padL = 30, padR = 10;
    var x = function (y) { return padL + (y - T_MIN) / (T_MAX - T_MIN) * (W - padL - padR); };
    var html = '<line x1="' + padL + '" y1="18" x2="' + (W - padR) + '" y2="18" stroke="#3a3170"/>';
    for (var y = T_MIN; y <= T_MAX; y++) {
      html += '<line x1="' + x(y) + '" y1="15" x2="' + x(y) + '" y2="21" stroke="#3a3170"/>';
      html += '<text x="' + x(y) + '" y="31" text-anchor="middle" font-size="8" fill="#6b6492">' + y + '</text>';
    }
    if (tMeta && tMeta.now && tMeta.now >= T_MIN && tMeta.now <= T_MAX) {
      html += '<line class="t-now" x1="' + x(tMeta.now) + '" y1="5" x2="' + x(tMeta.now) + '" y2="27" stroke="#6b6492"/>';
      html += '<text x="' + x(tMeta.now) + '" y="10" text-anchor="middle" font-size="7" fill="#6b6492">now</text>';
    }
    for (var i = 0; i < (tMeta ? tMeta.docs.length : 0); i++) {
      var d = tMeta.docs[i];
      html += '<circle class="t-doc" cx="' + x(d.year) + '" cy="18" r="4.5" fill="#4ade80" opacity="0.85" data-year="' + d.year + '" title="' + escHtml(d.doc + ' · adopted ' + d.year) + '"/>';
    }
    html += '<line id="t-cursor" x1="' + x(tCursor) + '" y1="5" x2="' + x(tCursor) + '" y2="27" stroke="#fbbf24" stroke-width="2"/>';
    svg.innerHTML = html;
  }
  buildTimeline();
  updateTimelineCursor();
  document.getElementById('timeline-svg').addEventListener('click', function (ev) {
    var t = ev.target;
    if (t.classList && t.classList.contains('t-doc')) { setCursor(Number(t.dataset.year)); return; }
    var rect = this.getBoundingClientRect();
    var W = 460, padL = 30, padR = 10;
    var y = Math.round(T_MIN + ((ev.clientX - rect.left) / rect.width) * (T_MAX - T_MIN));
    setCursor(y);
  });
  document.getElementById('t-prev').addEventListener('click', function () { setCursor(tCursor - 1); });
  document.getElementById('t-next').addEventListener('click', function () { setCursor(tCursor + 1); });

  // ── the map lens — the retained snapshot, arranged by space ─────────────
  function renderMap() {
    var body = document.getElementById('map-body');
    if (!body) return;
    var payload = document.getElementById('geopoints');
    if (!payload) { body.innerHTML = '<p class="empty">no map data retained for this instance — the map lens has nothing to arrange.</p>'; return; }
    var gp;
    try { gp = JSON.parse(payload.textContent); } catch (e) { body.innerHTML = '<p class="empty">map payload failed to parse.</p>'; return; }
    var b = gp.bounds;
    var W = 560, H = Math.round(W * (b[3] - b[1]) / (b[2] - b[0]));
    var px = function (lon) { return (lon - b[0]) / (b[2] - b[0]) * W; };
    var py = function (lat) { return (b[3] - lat) / (b[3] - b[1]) * H; };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '">';
    for (var i = 0; i < gp.props.length; i++) {
      var p = gp.props[i];
      var r = Math.max(1, Math.sqrt(p[2]) * 1.7);
      svg += '<circle cx="' + px(p[0]).toFixed(1) + '" cy="' + py(p[1]).toFixed(1) + '" r="' + r.toFixed(1) + '" fill="rgba(139,92,246,.5)" title="' + p[2] + ' properties · ' + p[3] + ' eviction filings"/>';
    }
    for (var j = 0; j < gp.viols.length; j++) {
      var v = gp.viols[j];
      svg += '<circle class="vdot" cx="' + px(v[0]).toFixed(1) + '" cy="' + py(v[1]).toFixed(1) + '" r="1.8" fill="rgba(251,191,36,.85)" data-district="' + (v[2] || '') + '" title="code violation · district ' + (v[2] || '?') + '"/>';
    }
    svg += '</svg>';
    body.innerHTML = svg;
    var vdots = body.querySelectorAll('.vdot');
    for (var vd = 0; vd < vdots.length; vd++) vdots[vd].addEventListener('click', function () {
      var d = this.dataset.district;
      if (!d) return;
      var dl = null;
      for (var k = 0; k < dlines.length; k++) {
        var b2 = dlines[k].querySelector('b');
        if (b2 && b2.textContent === 'd' + d) { dl = dlines[k]; break; }
      }
      showSection('measures');
      if (dl) {
        dl.classList.add('dline-hot');
        dl.scrollIntoView({ block: 'center' });
      }
    });
  }
  renderMap();
  document.getElementById('tog-map').addEventListener('click', function () { document.getElementById('map-strip').classList.toggle('on'); });

  function refresh() {
    var shown = 0, i;
    for (i = 0; i < rows.length; i++) { var ok = rowShown(rows[i]); rows[i].style.display = ok ? 'block' : 'none'; if (ok) shown++; }
    var grouped = !scope && !light && !q && !forceAll && !kindFocus && tCursor >= T_MAX;
    var groupsEl = document.getElementById('conn-groups');
    groupsEl.style.display = grouped ? '' : 'none';
    document.getElementById('rows').style.display = grouped ? 'none' : '';
    if (grouped) groupsEl.innerHTML = buildGroups();
    var st = document.getElementById('drawer-state');
    var lightDesc = light ? (light.lens ? 'lens ' + light.lens : light.a ? light.a + ' in ' + light.p : light) : '';
    if (grouped) {
      st.textContent = rows.length + ' rows, grouped by document — pick one, or light a being. nothing is invented.';
    } else {
      st.textContent = shown ? shown + (shown === 1 ? ' row' : ' rows') + ' shown' + (lightDesc ? ' · lit by ' + lightDesc : '') + (scope ? ' · scoped to ' + scope : '') + (kindFocus ? ' · kind ' + kindFocus : '') : 'light a being, an edge, a lens, or a card — rows materialize here. nothing is invented.';
    }
    document.getElementById('clear-light').style.display = light ? '' : 'none';

    for (i = 0; i < beads.length; i++) {
      var b = beads[i], name = b.dataset.light.toLowerCase();
      var n = 0;
      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        if (scope && row.dataset.doc !== scope) continue;
        if (!kindOn[row.dataset.kind]) continue;
        if (q && hayOf(row).indexOf(q) === -1) continue;
        if (beingOf(row).toLowerCase().indexOf(name) !== -1) n++;
      }
      b.querySelector('.bead-count').textContent = n + ' rows';
      b.classList.toggle('lit', litBy(name));
      b.classList.toggle('dim', (light && !litBy(name)) || (q && n === 0));
    }
    for (i = 0; i < gNodes.length; i++) {
      var tDeadN = adoptedOf[gNodes[i].dataset.node] !== undefined && adoptedOf[gNodes[i].dataset.node] > tCursor;
      gNodes[i].classList.toggle('dim', (light && !litBy(gNodes[i].dataset.node.toLowerCase())) || (q && !qMatch(gNodes[i])) || tDeadN);
    }
    for (i = 0; i < gEdges.length; i++) {
      var ge = gEdges[i];
      var hits = light && !light.lens && !light.a ? (ge.dataset.a.toLowerCase() === light || ge.dataset.p.toLowerCase() === light) : false;
      var tDeadE = adoptedOf[ge.dataset.p] !== undefined && adoptedOf[ge.dataset.p] > tCursor;
      ge.classList.toggle('dim', (light && !light.lens && !light.a && !hits) || (q && !qMatch(ge)) || tDeadE);
    }
    for (i = 0; i < subgraphs.length; i++) {
      var sg = subgraphs[i];
      var keepLens = !light || !light.lens || light.lens === sg.dataset.lens;
      sg.classList.toggle('hidden-lens', !lensOn[sg.dataset.lens] || !keepLens || (q && !qMatch(sg)));
    }
    for (i = 0; i < cards.length; i++) {
      cards[i].style.display = qMatch(cards[i]) ? '' : 'none';
      cards[i].classList.toggle('t-dim', adoptedOf[cards[i].dataset.doc] !== undefined && adoptedOf[cards[i].dataset.doc] > tCursor);
    }
    for (i = 0; i < dlines.length; i++) dlines[i].style.display = qMatch(dlines[i]) ? '' : 'none';

    document.getElementById('rn-sources').textContent = cards.filter(function (c) { return c.style.display !== 'none'; }).length;
    document.getElementById('rn-beings').textContent = beads.filter(function (b) { return !b.classList.contains('dim'); }).length;
    document.getElementById('rn-connections').textContent = shown;
    document.getElementById('rn-network').textContent = subgraphs.filter(function (s) { return !s.classList.contains('hidden-lens'); }).length;
    document.getElementById('rn-measures').textContent = dlines.filter(function (d) { return d.style.display !== 'none'; }).length;

    var chip = document.getElementById('scope-chip');
    chip.style.display = scope ? '' : 'none';
    chip.textContent = 'scoped: ' + scope + ' ✕';
    updateCrumb();
  }

  function toggleLight(name) { light = light === name ? null : name; refresh(); }

  // ── the inspector — every named thing has a profile ──────────────────────
  var inspector = document.getElementById('inspector');
  var placeNames = {};
  var beingSet = {};
  (function () {
    var pb = document.querySelectorAll('.bead.place');
    for (var pi = 0; pi < pb.length; pi++) placeNames[pb[pi].dataset.light.toLowerCase()] = true;
    var pn = document.querySelectorAll('.g-node .node-place');
    for (var pj = 0; pj < pn.length; pj++) placeNames[pn[pj].parentNode.dataset.node.toLowerCase()] = true;
    var all = document.querySelectorAll('.bead');
    for (var ai = 0; ai < all.length; ai++) beingSet[all[ai].dataset.light.toLowerCase()] = true;
  })();
  var inspStream = { list: [], idx: 0, CHUNK: 25 };
  function inspRowHtml(r) {
    var refEl = r.querySelector('.ref');
    var ref = refEl && refEl.dataset ? (refEl.dataset.byte || '') : '';
    var v = r.querySelector('.verbatim').textContent;
    if (v.length > 110) v = v.slice(0, 110) + '…';
    return '<div class="insp-line" data-doc="' + escHtml(r.dataset.doc) + '" data-agency="' + escHtml(r.dataset.agency || '') + '" data-place="' + escHtml(r.dataset.place || '') + '"><span class="kind kind-' + escHtml(r.dataset.kind) + '">' + escHtml(r.dataset.kind) + '</span> ' + escHtml(v) + '<span class="insp-ref">' + escHtml(ref || r.dataset.doc) + '</span></div>';
  }
  function inspMore() {
    var box = document.getElementById('insp-rows');
    if (!box) return false;
    var end = Math.min(inspStream.idx + inspStream.CHUNK, inspStream.list.length);
    for (var i = inspStream.idx; i < end; i++) box.insertAdjacentHTML('beforeend', inspRowHtml(inspStream.list[i]));
    inspStream.idx = end;
    var done = inspStream.idx >= inspStream.list.length;
    var sent = document.getElementById('insp-sentinel');
    if (sent) sent.style.display = done ? 'none' : '';
    return !done;
  }
  function onInspScroll() {
    if (inspector.scrollTop + inspector.clientHeight >= inspector.scrollHeight - 60) {
      if (!inspMore()) inspector.removeEventListener('scroll', onInspScroll);
    }
  }
  function timeSpanOf(rws) {
    var yrs = {};
    for (var i = 0; i < rws.length; i++) {
      var a = adoptedOf[rws[i].dataset.doc];
      if (a) yrs[a] = 1;
    }
    var yk = Object.keys(yrs).map(Number).sort(function (a, b) { return a - b; });
    if (!yk.length) return '—';
    return yk.length === 1 ? String(yk[0]) : yk[0] + '–' + yk[yk.length - 1];
  }
  function openInspector(type, name) {
    var html = '';
    var stream = [];
    if (type === 'being') {
      var nm = String(name).toLowerCase();
      var rws = rows.filter(function (r) { return beingOf(r).toLowerCase().indexOf(nm) !== -1; });
      stream = rws;
      var perDoc = {};
      rws.forEach(function (r) { perDoc[r.dataset.doc] = (perDoc[r.dataset.doc] || 0) + 1; });
      var docLines = Object.keys(perDoc).sort(function (a, b) { return perDoc[b] - perDoc[a]; }).slice(0, 6).map(function (d) {
        return '<div class="insp-row"><span>' + escHtml(d) + '</span><b>' + perDoc[d] + '</b></div>';
      }).join('') || '<div class="insp-empty">no rows — a cast name, not yet a connection</div>';
      var co = {};
      rws.forEach(function (r) {
        [r.dataset.agency, r.dataset.place].forEach(function (o) {
          if (o && String(o).toLowerCase() !== nm) co[o] = (co[o] || 0) + 1;
        });
      });
      var coLines = Object.keys(co).sort(function (a, b) { return co[b] - co[a]; }).slice(0, 6).map(function (o) {
        return '<button class="insp-ink" data-insp="being" data-name="' + escHtml(o) + '">' + escHtml(o) + ' · ' + co[o] + '</button>';
      }).join('') || '<div class="insp-empty">none co-occur</div>';
      var kind = placeNames[name.toLowerCase()] ? 'place' : 'agency';
      html = '<h3>◉ ' + escHtml(name) + '</h3>' +
        '<div class="insp-row"><span>type</span><b>' + kind + '</b></div>' +
        '<div class="insp-row"><span>rows</span><b>' + rws.length + '</b></div>' +
        '<div class="insp-row"><span>time span</span><b>' + timeSpanOf(rws) + '</b></div>' +
        '<div class="insp-sec">appears in</div>' + docLines +
        '<div class="insp-sec">co-occurs with</div><div>' + coLines + '</div>' +
        '<div class="insp-acts"><button data-act="light" data-name="' + escHtml(name) + '">light it everywhere</button>' +
        '<button data-act="rows" data-name="' + escHtml(name) + '">its rows in Connections</button>' +
        '<button data-act="reader" data-name="' + escHtml(name) + '">first mention in a document</button></div>';
    } else if (type === 'doc') {
      var card = cards.find(function (c) { return c.dataset.doc === name; });
      var title = card ? card.querySelector('h3').textContent : name;
      var rws2 = rows.filter(function (r) { return r.dataset.doc === name; });
      stream = rws2;
      var st = (getReaderData(name).startles || []).length;
      html = '<h3>▤ ' + escHtml(title) + '</h3>' +
        '<div class="insp-row"><span>doc id</span><b>' + escHtml(name) + '</b></div>' +
        '<div class="insp-row"><span>adopted</span><b>' + escHtml(card && card.dataset.adopted ? card.dataset.adopted : '—') + '</b></div>' +
        '<div class="insp-row"><span>rows</span><b>' + rws2.length + '</b></div>' +
        '<div class="insp-row"><span>unexpected</span><b>' + st + '</b></div>' +
        '<div class="insp-acts"><button data-act="read" data-name="' + escHtml(name) + '">open in the reader</button>' +
        '<button data-act="scope" data-name="' + escHtml(name) + '">scope Connections to it</button></div>';
    } else if (type === 'kind') {
      var rws3 = rows.filter(function (r) { return r.dataset.kind === name; });
      stream = rws3;
      html = '<h3>◈ kind · ' + escHtml(name) + '</h3>' +
        '<div class="insp-row"><span>rows</span><b>' + rws3.length + '</b></div>' +
        '<div class="insp-acts"><button data-act="kindrows" data-name="' + escHtml(name) + '">its rows in Connections</button></div>';
    } else if (type === 'lens') {
      var rws4 = rows.filter(function (r) { return (r.dataset.lens || '').split(' ').indexOf(name) !== -1; });
      stream = rws4;
      var docsN = {};
      rws4.forEach(function (r) { docsN[r.dataset.doc] = 1; });
      html = '<h3>◎ lens · ' + escHtml(name) + '</h3>' +
        '<div class="insp-row"><span>rows</span><b>' + rws4.length + '</b></div>' +
        '<div class="insp-row"><span>documents</span><b>' + Object.keys(docsN).length + '</b></div>' +
        '<div class="insp-acts"><button data-act="lensrows" data-name="' + escHtml(name) + '">its rows in Connections</button>' +
        '<button data-act="lensnet" data-name="' + escHtml(name) + '">its subgraph in Network</button></div>';
    } else {
      html = '<div class="insp-empty">nothing focused — click a name anywhere.<br><br>every named thing — a being, a document, a kind, a lens — has a profile that opens here: where it appears, how many rows, what it co-occurs with. nothing is invented.</div>';
    }
    if (stream.length) html += '<div class="insp-sec">its rows — ' + stream.length + '</div><div id="insp-rows"></div><div id="insp-sentinel" class="insp-empty">more ↓ scroll</div>';
    inspector.innerHTML = html;
    inspStream.list = stream;
    inspStream.idx = 0;
    inspMore();
    inspector.removeEventListener('scroll', onInspScroll);
    inspector.addEventListener('scroll', onInspScroll);
    var acts = inspector.querySelectorAll('[data-act]');
    for (var a = 0; a < acts.length; a++) acts[a].addEventListener('click', function () {
      var nm = this.dataset.name;
      if (this.dataset.act === 'light') toggleLight(nm.toLowerCase());
      else if (this.dataset.act === 'rows') { light = nm.toLowerCase(); showSection('connections'); refresh(); }
      else if (this.dataset.act === 'reader') { var c = cards.find(function (x) { return x.dataset.doc === nm; }); if (c) openReader(c.dataset.doc); }
      else if (this.dataset.act === 'read') openReader(nm);
      else if (this.dataset.act === 'scope') { scope = nm; showSection('connections'); refresh(); }
      else if (this.dataset.act === 'kindrows') { kindFocus = nm; showSection('connections'); refresh(); }
      else if (this.dataset.act === 'lensrows') { light = { lens: nm }; showSection('connections'); refresh(); }
      else if (this.dataset.act === 'lensnet') showSection('network');
    });
    var inks = inspector.querySelectorAll('[data-insp]');
    for (var ik = 0; ik < inks.length; ik++) inks[ik].addEventListener('click', function () { openInspector(this.dataset.insp, this.dataset.name); });
  }
  inspector.addEventListener('click', function (ev) {
    var line = ev.target.closest('.insp-line');
    if (line) { scope = line.dataset.doc; showSection('connections'); refresh(); }
  });
  openInspector('none');
  for (var i2 = 0; i2 < beads.length; i2++) beads[i2].addEventListener('click', function () { toggleLight(this.dataset.light.toLowerCase()); openInspector('being', this.dataset.light); });

  for (var i4 = 0; i4 < gNodes.length; i4++) gNodes[i4].addEventListener('click', function () {
    var nm = this.dataset.node;
    toggleLight(nm.toLowerCase());
    var isDoc = cards.some(function (c) { return c.dataset.doc === nm; });
    openInspector(isDoc ? 'doc' : 'being', nm);
  });
  for (var i5 = 0; i5 < gEdges.length; i5++) gEdges[i5].addEventListener('click', function () { toggleLight({ a: this.dataset.a, p: this.dataset.p }); });
  for (var i6 = 0; i6 < subgraphs.length; i6++) {
    (function (sg) {
      var head = sg.querySelector('.sub-head');
      if (head) head.addEventListener('click', function () { toggleLight({ lens: head.dataset.lensLight }); });
    })(subgraphs[i6]);
  }
  document.getElementById('scope-chip').addEventListener('click', function () { scope = null; refresh(); });
  document.getElementById('clear-light').addEventListener('click', function () { light = null; kindFocus = null; refresh(); });
  document.getElementById('gsearch').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); refresh(); });
  var kpills = document.querySelectorAll('#kindstrip .pill[data-kind]');
  for (var i8 = 0; i8 < kpills.length; i8++) kpills[i8].addEventListener('click', function () {
    var p = this; p.classList.toggle('on');
    if (p.classList.contains('on')) kindOn[p.dataset.kind] = true; else delete kindOn[p.dataset.kind];
    openInspector('kind', p.dataset.kind);
    refresh();
  });
  var lpills = document.querySelectorAll('#kindstrip .pill[data-lens]');
  for (var i9 = 0; i9 < lpills.length; i9++) lpills[i9].addEventListener('click', function () {
    var p = this; p.classList.toggle('on');
    if (p.classList.contains('on')) lensOn[p.dataset.lens] = true; else delete lensOn[p.dataset.lens];
    openInspector('lens', p.dataset.lens);
    refresh();
  });
  var wvs = document.querySelectorAll('.wv');
  for (var i10 = 0; i10 < wvs.length; i10++) wvs[i10].addEventListener('click', function () {
    for (var x = 0; x < wvs.length; x++) wvs[x].classList.toggle('on', wvs[x] === this);
  });

  // ── the grounding chips → the modal ──────────────────────────────────────
  // A chip is a door: the glyph is the cell the element was grounded under,
  // and the modal names the act, the null it owes in the same cell, and the
  // element's own address / verbatim / source.
  var gCells = {};
  var gPayload = document.getElementById('grounding-cells');
  if (gPayload) { try { gCells = JSON.parse(gPayload.textContent); } catch (e) { gCells = {}; } }
  var gmodal = document.getElementById('gmodal');
  function closeGrounding() { gmodal.classList.remove('on'); }
  function openGrounding(chip) {
    var item = {};
    try { item = JSON.parse(chip.dataset.g || '{}'); } catch (e) { item = { cell: chip.dataset.cell || '' }; }
    var cell = gCells[item.cell] || { name: item.cell, glyph: chip.textContent.trim(), terrain: '', stance: '' };
    document.getElementById('gmodal-glyph').textContent = cell.glyph || item.glyph || '';
    document.getElementById('gmodal-title').textContent = cell.name || item.cell;
    document.getElementById('gmodal-addr').textContent = (item.cell || '') + (cell.terrain ? ' · ' + cell.terrain + ' · ' + cell.stance : '');
    var rows = [];
    if (cell.operator) rows.push('<p><span class="lbl">the act</span><br>' + escHtml(cell.operator) + '</p>');
    if (cell.description) rows.push('<p>' + escHtml(cell.description) + '</p>');
    if (cell.nulls) rows.push('<p><span class="lbl">the null it owes — same cell</span><br><span class="nulls">' + escHtml(cell.nulls) + '</span></p>');
    if (item.ref) rows.push('<p><span class="lbl">address</span><br><span class="ref-line">' + escHtml(item.ref) + '</span></p>');
    if (item.verbatim) rows.push('<p><span class="lbl">grounded on</span><br><span class="verbatim">“' + escHtml(item.verbatim) + '”</span></p>');
    if (item.source) rows.push('<p class="meta-line">' + escHtml(item.source) + '</p>');
    if (item.kind) rows.push('<p class="meta-line">kind: ' + escHtml(item.kind) + '</p>');
    if (item.page) rows.push('<p class="meta-line">page: ' + escHtml(item.page) + '</p>');
    if (item.license) rows.push('<p class="meta-line">license: ' + escHtml(item.license) + '</p>');
    if (item.derivedFrom) rows.push('<p class="meta-line">derivedFrom: ' + escHtml(item.derivedFrom) + '</p>');
    document.getElementById('gmodal-body').innerHTML = rows.join('');
    gmodal.classList.add('on');
  }
  var gchips = Array.prototype.slice.call(document.querySelectorAll('.gchip'));
  for (var gi = 0; gi < gchips.length; gi++) (function (chip) {
    chip.addEventListener('click', function (ev) { ev.stopPropagation(); openGrounding(chip); });
    chip.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ev.stopPropagation(); openGrounding(chip); }
    });
  })(gchips[gi]);
  gmodal.addEventListener('click', function (ev) { if (ev.target === gmodal) closeGrounding(); });
  document.getElementById('gmodal-close').addEventListener('click', closeGrounding);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeGrounding(); });

  refresh();
  buildEntityList();
</script>
</body>
</html>`;
}