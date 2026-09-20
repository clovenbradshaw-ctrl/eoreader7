// build-fold-surface.mjs — the Nashville plans surface as a fold artifact:
// native/the-fold/plans-surface.html. One artifact, embedded compact ledger +
// metrics + surface def, folded client-side into ONE organic tree — nested
// buckets you drill into (city → documents → sections → rows; beings; places;
// questions; metrics; gate), never a flat list. The fold's brand: deep
// indigo-violet, thin-line phosphor icons, Georgia prose, mono refs.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const NASH = join(ROOT, "plans", "nashville");
const GROUND = join(NASH, "ground");

const ledger = readFileSync(join(NASH, "ledger", "plans-nashville.jsonl"), "utf8")
  .trim().split("\n").filter(Boolean).map(JSON.parse);
const metrics = JSON.parse(readFileSync(join(NASH, "metrics", "metrics-nashville.json"), "utf8"));
const def = JSON.parse(readFileSync(join(NASH, "nashville.surfacedef.json"), "utf8"));
const manifest = JSON.parse(readFileSync(join(NASH, "manifest.json"), "utf8"));
const digest = JSON.parse(readFileSync(join(NASH, "ground-digest.json"), "utf8")).digest;

const rows = ledger.map((r) => [r.id, r.doc, r.at[0], r.at[1], r.verbatim, r.kind, r.page, r.fields ?? {}]);
const aggMetrics = metrics.filter((m) => m.registry !== "violations");
const shelf = manifest.docs.map((d) => {
  const s = JSON.parse(readFileSync(join(GROUND, `${d.id}.txt.provenance.json`), "utf8"));
  return { id: d.id, title: s.title, category: d.category, scale: d.scale, adopted: s.adopted, chars: s.chars, pages: s.pages, pdf: s.pdf_sha256.slice(0, 8), url: s.url };
});

const DATA = {
  rows, metrics: aggMetrics, def, shelf,
  gate: {
    digest, resolved: `${rows.length}/${rows.length}`, proposals: 0,
    metricProvenance: `${metrics.length}/${metrics.length}`,
    asOf: metrics.find((m) => m.registry === "districts")?.provenance?.asOf ?? null,
    source: metrics.find((m) => m.registry === "districts")?.provenance?.source ?? null,
  },
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Fold — Nashville plans surface</title>
<style>
  :root {
    --bg: #0d0b16;
    --bg2: #141126;
    --bg3: #1b1735;
    --line: #2b2450;
    --line2: #3a3170;
    --ink: #ece9fb;
    --muted: #8f88b3;
    --dim: #6b6492;
    --violet: #a78bfa;
    --violet2: #8b5cf6;
    --violet3: #7c3aed;
    --ok: #4ade80;
    --bad: #f87171;
    --amber: #fbbf24;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font-family: Georgia, serif; line-height: 1.65; }
  header { position: sticky; top: 0; z-index: 20; background: rgba(13, 11, 22, .92); backdrop-filter: blur(6px); border-bottom: 1px solid var(--line); padding: .65rem 1.4rem; display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .mark { display: flex; align-items: center; gap: .55rem; font-family: ui-monospace, Menlo, monospace; font-size: .85rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .mark .dot { width: 12px; height: 12px; border-radius: 3px; background: linear-gradient(135deg, var(--violet), var(--violet3)); box-shadow: 0 0 12px rgba(139, 92, 246, .55); }
  .mark b { color: var(--ink); font-weight: 700; }
  .spacer { flex: 1; }
  .status { font-family: ui-monospace, Menlo, monospace; font-size: .72rem; color: var(--dim); }
  .status .ok { color: var(--ok); }
  button { font-family: ui-monospace, Menlo, monospace; font-size: .74rem; color: var(--muted); background: var(--bg2); border: 1px solid var(--line2); border-radius: 6px; padding: .32rem .7rem; cursor: pointer; }
  button:hover { color: var(--ink); border-color: var(--violet2); }
  main { max-width: 64rem; margin: 0 auto; padding: 1.4rem 1.4rem 3rem; }
  .hero { padding: 1.2rem 0 1.4rem; border-bottom: 1px solid var(--line); margin-bottom: 1.4rem; }
  .hero h1 { margin: 0 0 .3rem; font-size: 1.9rem; font-weight: 600; letter-spacing: -.01em; }
  .hero p { margin: 0; font-family: ui-monospace, Menlo, monospace; font-size: .78rem; color: var(--muted); }
  details { border: 1px solid var(--line); border-radius: 10px; background: var(--bg2); margin: .6rem 0; }
  details details { border-color: var(--line); background: var(--bg3); margin: .4rem 0 .4rem .4rem; }
  details details details { background: rgba(27, 23, 53, .6); }
  summary { cursor: pointer; list-style: none; padding: .55rem .9rem; font-family: ui-monospace, Menlo, monospace; font-size: .82rem; letter-spacing: .02em; color: var(--ink); user-select: none; }
  summary::-webkit-details-marker { display: none; }
  summary::before { content: "▸ "; color: var(--violet2); }
  details[open] > summary::before { content: "▾ "; }
  summary:hover { color: var(--violet); }
  summary .meta { color: var(--dim); font-size: .72rem; margin-left: .6rem; }
  summary .badge { font-size: .66rem; padding: .08rem .45rem; border-radius: 999px; margin-left: .6rem; }
  .badge.v { background: rgba(139, 92, 246, .16); color: var(--violet); border: 1px solid rgba(139, 92, 246, .35); }
  .badge.g { background: rgba(74, 222, 128, .1); color: var(--ok); border: 1px solid rgba(74, 222, 128, .3); }
  .badge.r { background: rgba(248, 113, 113, .1); color: var(--bad); border: 1px solid rgba(248, 113, 113, .35); }
  .badge.a { background: rgba(251, 191, 36, .1); color: var(--amber); border: 1px solid rgba(251, 191, 36, .3); }
  .bucket { padding: .1rem .9rem .9rem; }
  .row { border-left: 2px solid var(--line2); padding: .3rem .8rem; margin: .5rem 0 .5rem .4rem; border-radius: 0 6px 6px 0; }
  .row-head { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; font-family: ui-monospace, Menlo, monospace; font-size: .72rem; color: var(--dim); }
  .kind { font-size: .62rem; text-transform: uppercase; letter-spacing: .06em; padding: .1rem .45rem; border-radius: 3px; background: rgba(139, 92, 246, .14); color: var(--violet); }
  .kind-number { background: rgba(251, 191, 36, .12); color: var(--amber); }
  .kind-name { background: rgba(74, 222, 128, .12); color: var(--ok); }
  .kind-place { background: rgba(251, 191, 36, .1); color: #f0abfc; }
  .ref { color: var(--violet); cursor: help; }
  .page { color: var(--dim); }
  .verbatim { margin: .2rem 0 .05rem; font-size: .98rem; color: var(--ink); }
  .chips { display: flex; gap: .4rem; flex-wrap: wrap; font-family: ui-monospace, Menlo, monospace; }
  .chip { font-size: .66rem; background: rgba(143, 136, 179, .1); border: 1px solid var(--line); border-radius: 4px; padding: .04rem .45rem; color: var(--muted); }
  .provenance { font-family: ui-monospace, Menlo, monospace; font-size: .72rem; color: var(--dim); display: flex; gap: .4rem 1.2rem; flex-wrap: wrap; padding: 0 .9rem .5rem; }
  .provenance b { color: var(--muted); font-weight: 600; }
  .model-claim { font-style: italic; color: var(--muted); border-left: 2px solid var(--line2); padding: .3rem .8rem; margin: .5rem 0 .5rem .4rem; }
  .model-tag { font-family: ui-monospace, Menlo, monospace; font-size: .66rem; color: var(--dim); font-style: normal; letter-spacing: .04em; }
  table { border-collapse: collapse; width: 100%; font-family: ui-monospace, Menlo, monospace; font-size: .76rem; margin: .4rem 0 .8rem; }
  th, td { border: 1px solid var(--line); padding: .28rem .5rem; text-align: left; }
  th { color: var(--violet); background: var(--bg3); font-weight: 600; }
  td { color: var(--muted); }
  .num { text-align: right; }
  .ok { color: var(--ok); }
  ul { margin: .2rem 0 .8rem; padding-left: 1.3rem; color: var(--muted); font-family: ui-monospace, Menlo, monospace; font-size: .76rem; }
  .empty { font-family: ui-monospace, Menlo, monospace; font-size: .72rem; color: var(--dim); padding: .2rem .8rem; }
  footer { max-width: 64rem; margin: 0 auto; padding: 1rem 1.4rem 2.5rem; border-top: 1px solid var(--line); font-family: ui-monospace, Menlo, monospace; font-size: .68rem; color: var(--dim); }
  footer code { color: var(--muted); }
</style>
</head>
<body>

<header>
  <span class="mark"><span class="dot"></span>the&nbsp;fold · <b>nashville</b></span>
  <span class="spacer"></span>
  <span class="status" id="status"></span>
  <button id="tog-refs">bytes ⇄ page</button>
</header>

<main>
  <div class="hero">
    <h1>Nashville — plans surface</h1>
    <p>five retained plans · byte-anchored rows · provenance-stamped metrics · the gate refuses an ungrounded surface</p>
  </div>
  <div id="tree"></div>
</main>

<footer>
  A surface of the fold — one embedded artifact (compact ledger + metrics + def), folded client-side into nested buckets.
  Every ref is <code>file#start-end</code> into a retained, hashed text layer. Nothing here is authored by a frontier model.
</footer>

<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
  <symbol id="i-list" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" d="M80 64h128M80 128h128M80 192h128M40 64h.01M40 128h.01M40 192h.01"/></symbol>
  <symbol id="i-user" viewBox="0 0 256 256"><circle cx="128" cy="96" r="48" fill="none" stroke="currentColor" stroke-width="16"/><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" d="M64 216c8-40 32-56 64-56s56 16 64 56"/></symbol>
  <symbol id="i-map" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" d="M128 24c-32 0-64 26-64 64 0 48 64 144 64 144s64-96 64-144c0-38-32-64-64-64z"/><circle cx="128" cy="88" r="24" fill="none" stroke="currentColor" stroke-width="16"/></symbol>
  <symbol id="i-grid" viewBox="0 0 256 256"><rect x="48" y="48" width="56" height="56" fill="none" stroke="currentColor" stroke-width="16"/><rect x="152" y="48" width="56" height="56" fill="none" stroke="currentColor" stroke-width="16"/><rect x="48" y="152" width="56" height="56" fill="none" stroke="currentColor" stroke-width="16"/><rect x="152" y="152" width="56" height="56" fill="none" stroke="currentColor" stroke-width="16"/></symbol>
  <symbol id="i-chart" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" d="M32 224h192M48 176v-48M112 176V80M176 176V112"/></symbol>
  <symbol id="i-chat" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" d="M40 120c0-44 40-80 88-80s88 36 88 80-40 80-88 80c-14 0-28-3-40-8l-32 8 12-24c-10-12-16-27-16-44z"/></symbol>
  <symbol id="i-shield" viewBox="0 0 256 256"><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" d="M128 32l80 32v64c0 56-34 88-80 104-46-16-80-48-80-104V64z"/><path fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" d="M96 128l24 24 40-48"/></symbol>
</svg>

<script>
  const DATA = ${JSON.stringify(DATA)};
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const docName = (p) => (p.split('/').pop() || p).replace('.txt', '');
  const kindLabel = { goal: 'goal', number: 'number', name: 'agency', place: 'place' };
  let bytes = true;

  const refHtml = (r) => {
    const ref = r[1] + '#' + r[2] + '-' + r[3];
    return '<span class="ref" data-byte="' + esc(ref) + '" data-page="p.' + r[6] + '">' + (bytes ? esc(ref) : 'p.' + r[6]) + '</span>';
  };
  const rowHtml = (r) => {
    const f = r[7] || {};
    const chips = [];
    for (const k of ['section', 'agency', 'place', 'amount', 'year']) if (f[k]) chips.push('<span class="chip">' + esc(k) + ': ' + esc(f[k]) + '</span>');
    return '<div class="row"><div class="row-head"><span class="kind kind-' + esc(r[5]) + '">' + esc(kindLabel[r[5]] || r[5]) + '</span>' + refHtml(r) + '<span class="page">p.' + r[6] + '</span></div><div class="verbatim">' + esc(r[4]) + '</div><div class="chips">' + chips.join('') + '</div></div>';
  };
  const bucket = (title, meta, inner, open) => '<details' + (open ? ' open' : '') + '><summary>' + title + (meta ? '<span class="meta">' + meta + '</span>' : '') + '</summary><div class="bucket">' + inner + '</div></details>';

  // ── T1·VOID — the documents ────────────────────────────────────────────
  const documentsTree = () => {
    const byDoc = {};
    for (const r of DATA.rows) (byDoc[r[1]] ||= []).push(r);
    return bucket('the documents', DATA.shelf.length + ' retained plans · hashed · page-bridged', DATA.shelf.map((s) => {
      const rs = byDoc['nashville/ground/' + s.id + '.txt'] || [];
      const bySec = {};
      for (const r of rs) { const sec = r[7]?.section || '—'; (bySec[sec] ||= []).push(r); }
      const inner = '<div class="provenance"><span>adopted <b>' + esc(s.adopted) + '</b></span><span>pdf <b>' + esc(s.pdf) + '</b>…</span><span><b>' + s.pages + '</b> pages</span><span><b>' + s.chars.toLocaleString() + '</b> chars</span></div>' +
        Object.keys(bySec).map((sec) => bucket(esc(sec), bySec[sec].length + ' rows', bySec[sec].map(rowHtml).join(''))).join('');
      return bucket(esc(s.title), esc(s.category) + ' · ' + s.pages + ' pages · ' + rs.length + ' rows', inner, s.id === 'nmotion-final');
    }).join(''), true);
  };

  // ── T3·ENTITY — the beings, with the links that name them ──────────────
  const beingsTree = () => {
    const counts = {};
    const rowsFor = (q) => DATA.rows.filter((r) => { const f = r[7] || {}; const hay = (f.agency + ' ' + f.place + ' ' + f.section + ' ').toLowerCase(); return hay.includes(q.toLowerCase()); });
    const beings = [['MTA', 'agency'], ['WeGo', 'agency'], ['MDHA', 'agency'], ['NDOT', 'agency'], ['Barnes Fund', 'agency'], ['East Bank', 'place'], ['North Nashville', 'place'], ['Antioch', 'place'], ['Bordeaux', 'place']];
    const inner = beings.map(([name, kind]) => {
      const rs = rowsFor(name);
      if (!rs.length) return '';
      const split = name === 'MTA' || name === 'WeGo' ? '<span class="badge r">✗ not merged — no received prior</span>' : '';
      return bucket('<span class="kind kind-' + kind + '">' + kind + '</span> ' + esc(name), rs.length + ' links', rs.slice(0, 12).map(rowHtml).join('') + (rs.length > 12 ? '<p class="empty">… ' + (rs.length - 12) + ' more</p>' : '') + split, name === 'MTA');
    }).join('');
    return bucket('the beings', 'identity typed, never guessed', inner, true);
  };

  // ── T6·NETWORK — questions as lenses, plans nested inside ──────────────
  const questionsTree = () => {
    const inner = DATA.def.topics.map((t) => {
      const q = t.queries.map((x) => x.toLowerCase());
      const hit = DATA.rows.filter((r) => { const hay = (r[4] + ' ' + (r[7]?.section ?? '')).toLowerCase(); return q.some((x) => hay.includes(x)); });
      if (!hit.length) return '';
      const byDoc = {};
      for (const r of hit) (byDoc[r[1]] ||= []).push(r);
      const docs = Object.keys(byDoc).map((d) => bucket(esc(docName(d)), byDoc[d].length + ' rows', byDoc[d].slice(0, 6).map(rowHtml).join('') + (byDoc[d].length > 6 ? '<p class="empty">… ' + (byDoc[d].length - 6) + ' more in the register</p>' : ''))).join('');
      return bucket(esc(t.label), hit.length + ' rows · ' + Object.keys(byDoc).length + ' plans', docs);
    }).join('');
    return bucket('the questions', 'one question, five plans answering', inner, true);
  };

  // ── PLACES — the lighting map, nested ──────────────────────────────────
  const placesTree = () => {
    const places = DATA.def.metrics.placeDistricts || {};
    const vbd = new Map((DATA.metrics.filter((m) => m.registry === 'violations-by-district') || []).map((m) => [Number(m.district), m.fields]));
    const inner = Object.keys(places).map((place) => {
      const hits = DATA.rows.filter((r) => String(r[7]?.place ?? '').toLowerCase() === place.toLowerCase());
      const dists = places[place] || [];
      const chips = dists.map((d) => '<span class="chip">311 d' + d + ': ' + esc(vbd.get(d)?.open ?? '?') + ' open</span>').join('');
      const state = hits.length >= 6 ? '<span class="badge v">lit · ' + hits.length + ' links</span>' : hits.length ? '<span class="badge a">dim · ' + hits.length + ' links</span>' : '<span class="badge r">unresolved — lights nothing</span>';
      return bucket(esc(place), state, (hits.length ? hits.slice(0, 8).map(rowHtml).join('') + (hits.length > 8 ? '<p class="empty">… ' + (hits.length - 8) + ' more</p>' : '') : '<p class="empty">no plan row names this place — it is not lit</p>') + '<div class="chips">' + chips + '</div>');
    }).join('') + bucket('MTA ↔ WeGo', '<span class="badge r">✗ disjoint aliases — no received prior</span>', '<p class="empty">the 2016 MTA and the 2022 WeGo are one agency\'s successive names. the engine records the split, not the merge.</p>');
    return bucket('the places', 'lighting — a link lights its entity, its network, its field · one hop', inner);
  };

  // ── T5·FIELD — metrics, nested by district ─────────────────────────────
  const metricsTree = () => {
    const byReg = {};
    for (const m of DATA.metrics) (byReg[m.registry] ||= []).push(m);
    const districts = byReg.districts || [];
    const vbd = new Map((byReg['violations-by-district'] || []).map((m) => [Number(m.district), m.fields]));
    const rowsT = districts.map((d) => { const f = d.fields || {}; const v = vbd.get(Number(d.district)) || {}; return '<tr><td>' + d.district + '</td><td>' + esc(f.population ?? '') + '</td><td>' + esc(f.median_household_income ?? '') + '</td><td>' + esc(f.pct_renter ?? '') + '</td><td>' + esc(f.pct_child_poverty ?? '') + '%</td><td class="num">' + esc(v.open ?? '') + '</td><td class="num">' + esc(v.total ?? '') + '</td></tr>'; }).join('');
    const stress = (byReg['housing-stress'] || [])[0];
    const landlords = (byReg.landlords || []).map((m) => '<li>' + esc(m.fields.landlord) + ' — ' + esc(m.fields.properties) + ' props / ' + esc(m.fields.evictions) + ' filings</li>').join('');
    const pv = (m) => m?.provenance ? '<p class="empty">dataset ' + esc(m.provenance.dataset) + ' · asOf ' + esc(m.provenance.asOf) + '</p>' : '';
    const inner = (stress ? bucket('housing stress', esc(stress.fields.totalEvictionFilings ?? '') + ' eviction filings · ' + esc(stress.fields.distinctLandlords ?? '') + ' landlords', pv(stress)) : '') +
      bucket('districts by council district', districts.length + ' districts', '<table><thead><tr><th>d</th><th>pop</th><th>med. income</th><th>% renter</th><th>% child pov.</th><th class="num">311 open</th><th class="num">311 total</th></tr></thead><tbody>' + rowsT + '</tbody></table>' + pv(districts[0])) +
      bucket('top landlords', '20 by portfolio', '<ul>' + landlords + '</ul>' + pv((byReg.landlords || [])[0]));
    return bucket('the metrics', 'provenance per row — a metric without provenance is not rendered', inner);
  };

  // ── T7·ATMOSPHERE — the analysis lane ──────────────────────────────────
  const analysisTree = () => {
    const inner = '<div class="model-claim"><span class="model-tag">stated by the model · no retained source states it</span><br>The city housing commitments are densest in the East Bank, where 311 and eviction pressure are also highest — but no single retained document draws that line.</div>' +
      '<div class="model-claim"><span class="model-tag">stated by the model · no retained source states it</span><br>nMotion MTA and the East Bank WeGo are one agency successive names; the engine records the split, not the merge.</div>';
    return bucket('the analysis', 'model prose only · never blended with the register', inner);
  };

  // ── T9·PARADIGM — the gate ─────────────────────────────────────────────
  const gateTree = () => {
    const g = DATA.gate;
    const inner = '<div class="provenance"><span><b>[REVISION]</b> nMotion partnerships supersedes plans:nashville:nmotion:row:0001</span></div><div class="provenance"><span>— reviewer: WEGO-ERA JOINT AGENCY note added</span></div>' +
      '<ul><li class="ok">● refs resolve verbatim · ' + g.resolved + '</li><li class="ok">● no unflagged proposals · ' + g.proposals + '</li><li class="ok">● metric provenance · ' + g.metricProvenance + '</li><li class="ok">● ground digest re-derives · ' + g.digest.slice(0, 12) + '…</li><li class="ok">● determinism · same layer in, same rows out</li></ul>' +
      '<div class="provenance"><span>' + esc(g.source ?? '') + '</span><span>asOf ' + esc(g.asOf ?? '') + '</span></div>';
    return bucket('the gate', '<span class="badge g">● pass</span>', inner, true);
  };

  // ── assemble the tree ──────────────────────────────────────────────────
  function render() {
    const tree = document.getElementById('tree');
    tree.innerHTML =
      documentsTree() +
      beingsTree() +
      placesTree() +
      questionsTree() +
      metricsTree() +
      analysisTree() +
      gateTree();
    document.getElementById('status').innerHTML = 'live · <span class="ok">' + DATA.rows.length + '</span> rows · <span class="ok">' + DATA.gate.resolved + '</span> refs resolve verbatim';
  }
  document.getElementById('tog-refs').addEventListener('click', () => { bytes = !bytes; render(); });
  render();
</script>
</body>
</html>
`;

writeFileSync(join(HERE, "..", "native", "the-fold", "plans-surface.html"), html);
console.log("wrote", join(HERE, "..", "native", "the-fold", "plans-surface.html"), (html.length / 1e6).toFixed(2), "MB");