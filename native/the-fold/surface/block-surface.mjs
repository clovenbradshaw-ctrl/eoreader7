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
function groundingChip(kind, item, opts = {}) {
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

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const KIND_LABEL = { goal: "goal", number: "number", name: "agency", place: "place" };
const rowRef = (l) => `${l.doc}#${l.at[0]}-${l.at[1]}`;

export function renderSurface({ def, ground, links, metrics, projections, gate }) {
  const kindLabel = (k) => KIND_LABEL[k] ?? k;
  const docIdOf = (p) => p.split("/").pop().replace(".txt", "");
  const LENSES = def.topics ?? [];

  // ── LINK rows: tagged with doc, kind, beings, lenses ───────────────────
  const lensFor = (l) => LENSES.filter((t) => (t.queries ?? []).some((q) => `${l.verbatim} ${l.fields?.section ?? ""}`.toLowerCase().includes(String(q).toLowerCase()))).map((t) => t.id).join(" ");
  const rowsHtml = links.map((l) => {
    const ref = rowRef(l);
    const chips = [];
    for (const k of ["section", "agency", "place", "amount", "year"]) if (l.fields?.[k]) chips.push(`<span class="chip">${esc(k)}: ${esc(l.fields[k])}</span>`);
    const lens = lensFor(l);
    const gchip = groundingChip("row", l, { ref, verbatim: l.verbatim, kind: kindLabel(l.kind), source: docIdOf(l.doc), page: l.page });
    return `<div class="row" data-doc="${esc(docIdOf(l.doc))}" data-kind="${esc(l.kind)}" data-agency="${esc(l.fields?.agency ?? "")}" data-place="${esc(l.fields?.place ?? "")}"${lens ? ` data-lens="${esc(lens)}"` : ""} data-hay="${esc(`${l.verbatim} ${ref} ${kindLabel(l.kind)} ${l.fields?.agency ?? ""} ${l.fields?.place ?? ""} ${l.fields?.section ?? ""}`.toLowerCase())}"><div class="row-head"><span class="kind kind-${esc(l.kind)}">${esc(kindLabel(l.kind))}</span>${gchip}<span class="ref" data-byte="${esc(ref)}" data-page="p.${l.page}">${esc(ref)}</span><span class="page">p.${l.page}</span></div><div class="verbatim">${esc(l.verbatim)}</div><div class="chips">${chips.join("")}</div></div>`;
  }).join("");

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
    <div class="cards">${ground.docs.map((d) => `<div class="card" data-doc="${esc(d.id)}" data-hay="${esc(`${d.title} ${d.category} ${d.scale} ${d.adopted}`.toLowerCase())}"><h3>${esc(d.title)}</h3><p>${esc(d.category)} · ${esc(d.scale)} · ${esc(d.adopted)}</p><p>${d.pages} pages · ${d.chars.toLocaleString()} chars</p><p class="basis prov">${groundingChip("source", d, { ref: `txt ${d.txt_sha256.slice(0, 12)}… · pdf ${d.pdf_sha256.slice(0, 12)}…`, verbatim: d.title, source: `${d.category} · ${d.scale} · ${d.adopted}`, license: d.license })} pdf ${esc(d.pdf_sha256.slice(0, 8))}… · ${esc(d.license)}</p></div>`).join("")}</div>
    <p class="empty">click a document to read it — reader shows the retained text, source shows the exact bytes</p>`;

  // ── ENTITY — the beings, top band ──────────────────────────────────────
  const bead = (name, n, kind, split = false) => `<button class="bead ${split ? "split" : ""}" data-light="${esc(name)}" data-hay="${esc(name.toLowerCase())}"><span class="orb orb-${kind}"></span>${groundingChip("being", null, { verbatim: name, source: "cast — names resolve to who, never to byte strings" })}<span class="bead-name">${esc(name)}</span><span class="bead-count">${n}</span></button>`;
  const placeState = {};
  for (const p of projections.places ?? []) placeState[p.place.toLowerCase()] = p.state;
  const placeBead = (name, n) => {
    const st = placeState[name.toLowerCase()] ?? null;
    const cls = st === "lit" ? " place-lit" : st === "dim" ? " place-dim" : st === "unresolved" ? " place-unres" : "";
    const pj = (projections.places ?? []).find((p) => p.place.toLowerCase() === name.toLowerCase());
    const chips = pj ? (pj.districts ?? []).map((d) => `311 d${d}: ${vbd.get(d)?.open ?? "?"}`).join(" · ") : "";
    const stLbl = st ? `● ${st} · ${pj?.links?.length ?? 0} links` : "—";
    return `<button class="bead place${cls}" data-light="${esc(name)}" data-hay="${esc(name.toLowerCase())}" title="${esc(`${name} — ${stLbl} · ${chips || "no mapped districts"}`)}"><span class="orb orb-place"></span><span class="bead-name">${esc(name)}</span><span class="bead-count">${n}</span></button>`;
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
    return `<script type="application/json" id="doctext-${esc(d.id)}">${jsonScriptSafe({ text, marks })}</script>`;
  }).join("\n");

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
  .mode-btn.on { color: var(--violet); border-color: var(--violet2); }
  .reader-text { font-family: Georgia, serif; font-size: 1rem; line-height: 1.85; white-space: pre-wrap; max-height: 68vh; overflow: auto; padding: .2rem .3rem; }
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
  .beads { display: flex; gap: .9rem; flex-wrap: wrap; align-items: flex-start; }
  .bead { display: flex; flex-direction: column; align-items: center; gap: .25rem; background: none; border: none; padding: .3rem; cursor: pointer; transition: opacity .2s; }
  .bead .orb { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--violet2); box-shadow: 0 0 14px rgba(139, 92, 246, .35); background: rgba(139, 92, 246, .08); }
  .bead .orb-place { border-color: var(--amber); box-shadow: 0 0 14px rgba(251, 191, 36, .25); background: rgba(251, 191, 36, .07); }
  .bead.split .orb { border-color: var(--bad); box-shadow: none; background: transparent; }
  .bead.lit .orb { box-shadow: 0 0 22px rgba(139, 92, 246, .7); border-color: var(--violet); }
  .bead.lit .orb-place { box-shadow: 0 0 22px rgba(251, 191, 36, .6); border-color: var(--amber); }
  .bead.dim { opacity: .15; }
  .bead-name { font-family: ui-monospace, monospace; font-size: .64rem; color: var(--muted); }
  .bead-count { font-family: ui-monospace, monospace; font-size: .62rem; color: var(--dim); }
  .split-pair { display: flex; align-items: center; gap: .8rem; margin-top: .4rem; flex-wrap: wrap; }
  .split-edge { font-family: ui-monospace, monospace; font-size: .6rem; color: var(--bad); border-top: 2px dashed var(--bad); padding-top: .25rem; }
  .bead.place-lit .orb { border-color: var(--ok); box-shadow: 0 0 14px rgba(74, 222, 128, .35); }
  .bead.place-dim .orb { opacity: .55; border-color: var(--amber); box-shadow: 0 0 10px rgba(251, 191, 36, .2); }
  .bead.place-unres .orb { border-color: var(--bad); border-style: dashed; }
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
    .bead .orb { width: 30px; height: 30px; }
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
    <button id="tog-theme">light ⇄ dark</button>
    <button id="tog-refs">bytes ⇄ page</button>
    <button id="tog-prov">prov</button>
  </div>
  <div class="row2" id="kindstrip">${kindPills}<span class="pill" style="pointer-events:none;opacity:.5">lenses</span>${lensPills}</div>
</header>
<div class="whisper-strip" id="whisper-strip">${atmosphereInner}</div>
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
            <span class="spacer"></span>
            <button class="mode-btn on" id="reader-mode-reader">reader</button>
            <button class="mode-btn" id="reader-mode-source">source</button>
            <button id="reader-scope">open its rows in Connections →</button>
          </div>
          <div id="reader-body" class="reader-text"></div>
        </div>
      </div>
      <div class="panel" id="panel-beings">
        <h2><span class="terrain">T3 · Entity</span> the beings <span class="doc-meta">click one — it lights everywhere</span></h2>
        <p class="empty">agencies</p>
        <div class="beads" id="beads">${Object.entries(agencyCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([a, n]) => bead(a, n, "agency")).join("")}</div>
        <p class="empty">places — the ring is the lighting state; hover for 311</p>
        <div class="beads">${Object.entries(placeCount).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([p, n]) => placeBead(p, n)).join("")}</div>
        <div class="split-pair">${bead("MTA", agencyCount["MTA"] ?? 0, "agency", true)}<span class="split-edge">✗ not merged — no received prior</span>${bead("WeGo", agencyCount["WeGo"] ?? 0, "agency", true)}</div>
      </div>
      <div class="panel" id="panel-connections">
        <div class="drawer-head">
          <h2 style="margin:0"><span class="terrain">T4 · Link</span> the asserted connections</h2>
          <span class="spacer"></span>
          <span class="empty" id="drawer-state"></span>
          <button id="clear-light" style="display:none">clear light ✕</button>
        </div>
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
  </div>
</main>
${docPayloads}
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

  var q = '', light = null, scope = null;
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
    var inKind = kindOn[r.dataset.kind];
    var inLight = !light || (
      light.lens ? (r.dataset.lens || '').split(' ').indexOf(light.lens) !== -1
      : light.a ? r.dataset.agency === light.a && r.dataset.doc === light.p
      : beingOf(r).toLowerCase().indexOf(light) !== -1 && r.dataset.doc === (light.doc || r.dataset.doc)
    );
    return inScope && inKind && inLight && qMatch(r);
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
  function buildReaderHtml(text, marks) {
    var out = '', pos = 0, lastEnd = -1;
    var ms = marks.slice().sort(function (a, b) { return a.start - b.start; });
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.start < lastEnd) continue;
      if (m.start > pos) out += escHtml(text.slice(pos, m.start));
      out += '<mark ' + markAttrs(m) + '>' + escHtml(text.slice(m.start, m.end)) + '</mark>';
      pos = m.end; lastEnd = m.end;
    }
    out += escHtml(text.slice(pos));
    return out;
  }
  var ROWLEN = 110, ROWS_PER_PAGE = 360;
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
  var sourcesList = document.getElementById('sources-list');
  var sourcesReader = document.getElementById('sources-reader');

  function renderReaderBody() {
    var data = getDocData(readerState.doc);
    var body = document.getElementById('reader-body');
    if (readerState.mode === 'reader') {
      body.className = 'reader-text';
      body.innerHTML = buildReaderHtml(data.text, data.marks);
    } else {
      body.className = 'source-view';
      body.innerHTML = buildSourceHtml(data.text, data.marks, readerState.page);
      var pbtns = body.querySelectorAll('[data-page]');
      for (var i = 0; i < pbtns.length; i++) pbtns[i].addEventListener('click', function () {
        if (this.disabled) return;
        readerState.page = Number(this.dataset.page);
        renderReaderBody();
      });
    }
    var marks = body.querySelectorAll('.hit');
    for (var j = 0; j < marks.length; j++) marks[j].addEventListener('click', function () {
      var name = (this.dataset.agency || this.dataset.place || '').toLowerCase();
      if (name) toggleLight(name);
    });
  }
  function openReader(docId) {
    readerState.doc = docId; readerState.mode = 'reader'; readerState.page = 0;
    sourcesList.style.display = 'none'; sourcesReader.style.display = '';
    document.getElementById('reader-title').textContent = docId;
    document.getElementById('reader-mode-reader').classList.add('on');
    document.getElementById('reader-mode-source').classList.remove('on');
    renderReaderBody();
    updateCrumb();
  }
  document.getElementById('reader-back').addEventListener('click', function () {
    sourcesReader.style.display = 'none'; sourcesList.style.display = '';
    readerState.doc = null; updateCrumb();
  });
  document.getElementById('reader-mode-reader').addEventListener('click', function () {
    readerState.mode = 'reader'; this.classList.add('on');
    document.getElementById('reader-mode-source').classList.remove('on');
    renderReaderBody(); updateCrumb();
  });
  document.getElementById('reader-mode-source').addEventListener('click', function () {
    readerState.mode = 'source'; readerState.page = 0; this.classList.add('on');
    document.getElementById('reader-mode-reader').classList.remove('on');
    renderReaderBody(); updateCrumb();
  });
  document.getElementById('reader-scope').addEventListener('click', function () {
    scope = readerState.doc; showSection('connections'); refresh();
  });
  for (var ci = 0; ci < cards.length; ci++) cards[ci].addEventListener('click', function () { openReader(this.dataset.doc); });

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
      parts.push(readerState.mode === 'reader' ? 'reader — rendered text' : 'source — raw bytes, offset ' + (readerState.page * ROWS_PER_PAGE * ROWLEN));
    }
    if (scope) parts.push('scoped to ' + scope);
    if (light) parts.push('lit: ' + describeLight(light));
    if (q) parts.push('search "' + q + '"');
    document.getElementById('crumb').innerHTML = parts.map(function (p, i) {
      return (i > 0 ? '<span class="crumb-sep">›</span>' : '') + '<span>' + escHtml(p) + '</span>';
    }).join('');
  }

  function refresh() {
    var shown = 0, i;
    for (i = 0; i < rows.length; i++) { var ok = rowShown(rows[i]); rows[i].style.display = ok ? '' : 'none'; if (ok) shown++; }
    var st = document.getElementById('drawer-state');
    var lightDesc = light ? (light.lens ? 'lens ' + light.lens : light.a ? light.a + ' in ' + light.p : light) : '';
    st.textContent = shown ? shown + (shown === 1 ? ' row' : ' rows') + ' shown' + (lightDesc ? ' · lit by ' + lightDesc : '') + (scope ? ' · scoped to ' + scope : '') : 'light a being, an edge, a lens, or a card — rows materialize here. nothing is invented.';
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
      b.querySelector('.bead-count').textContent = n;
      b.classList.toggle('lit', litBy(name));
      b.classList.toggle('dim', (light && !litBy(name)) || (q && n === 0));
    }
    for (i = 0; i < gNodes.length; i++) gNodes[i].classList.toggle('dim', (light && !litBy(gNodes[i].dataset.node.toLowerCase())) || (q && !qMatch(gNodes[i])));
    for (i = 0; i < gEdges.length; i++) {
      var ge = gEdges[i];
      var hits = light && !light.lens && !light.a ? (ge.dataset.a.toLowerCase() === light || ge.dataset.p.toLowerCase() === light) : false;
      ge.classList.toggle('dim', (light && !light.lens && !light.a && !hits) || (q && !qMatch(ge)));
    }
    for (i = 0; i < subgraphs.length; i++) {
      var sg = subgraphs[i];
      var keepLens = !light || !light.lens || light.lens === sg.dataset.lens;
      sg.classList.toggle('hidden-lens', !lensOn[sg.dataset.lens] || !keepLens || (q && !qMatch(sg)));
    }
    for (i = 0; i < cards.length; i++) cards[i].style.display = qMatch(cards[i]) ? '' : 'none';
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
  for (var i2 = 0; i2 < beads.length; i2++) beads[i2].addEventListener('click', function () { toggleLight(this.dataset.light.toLowerCase()); });

  for (var i4 = 0; i4 < gNodes.length; i4++) gNodes[i4].addEventListener('click', function () { toggleLight(this.dataset.node.toLowerCase()); });
  for (var i5 = 0; i5 < gEdges.length; i5++) gEdges[i5].addEventListener('click', function () { toggleLight({ a: this.dataset.a, p: this.dataset.p }); });
  for (var i6 = 0; i6 < subgraphs.length; i6++) {
    (function (sg) {
      var head = sg.querySelector('.sub-head');
      if (head) head.addEventListener('click', function () { toggleLight({ lens: head.dataset.lensLight }); });
    })(subgraphs[i6]);
  }
  document.getElementById('scope-chip').addEventListener('click', function () { scope = null; refresh(); });
  document.getElementById('clear-light').addEventListener('click', function () { light = null; refresh(); });
  document.getElementById('gsearch').addEventListener('input', function (e) { q = e.target.value.trim().toLowerCase(); refresh(); });
  var kpills = document.querySelectorAll('#kindstrip .pill[data-kind]');
  for (var i8 = 0; i8 < kpills.length; i8++) kpills[i8].addEventListener('click', function () {
    var p = this; p.classList.toggle('on');
    if (p.classList.contains('on')) kindOn[p.dataset.kind] = true; else delete kindOn[p.dataset.kind];
    refresh();
  });
  var lpills = document.querySelectorAll('#kindstrip .pill[data-lens]');
  for (var i9 = 0; i9 < lpills.length; i9++) lpills[i9].addEventListener('click', function () {
    var p = this; p.classList.toggle('on');
    if (p.classList.contains('on')) lensOn[p.dataset.lens] = true; else delete lensOn[p.dataset.lens];
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
</script>
</body>
</html>`;
}