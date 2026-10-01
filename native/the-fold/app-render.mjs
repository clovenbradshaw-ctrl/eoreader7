// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 6 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// app-render.mjs — a comp's SPEC becomes a page: layout and binding are COMPUTED,
// nothing here is drawn by a model.
//
// The comp (comp-read.js's EOCompSpec@2) says what is on screen and how it is
// grouped — zones of kind title / summary / tabs / list, fields with a role
// (headline, caption, fact, aside, heading) — measured from pixels, with no
// meaning read into it. This module turns that arrangement into HTML/CSS and a
// data-binding table, and says plainly what it could not bind:
//
//   layoutOf(spec)        the ordered blocks of the page, chrome dropped (a status
//                         bar is the device's, not the app's)
//   bindingFor(spec, tbl) each comp field -> the source path it shows, where the
//                         DECLARED table (the source side knows its own fields)
//                         names one; everything else is a typed GAP, reported,
//                         never silently dropped and never invented
//   themeOf(spec)         accent / surface / ink / muted from the comp's measured
//                         palette (only colours the comp measured, nothing named)
//   renderPage(...)       the page itself
//
// The renderer carries no domain word. "Wind", "humidity", "E5" live in the
// binding tables the people who wired the sources declared; the comp's own words
// (place names, sample values, tab captions) are NEVER copied into the page — the
// page is built from the comp's arrangement and the source's data.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").trim();

/** Relative luminance 0..1 of an [r,g,b]. */
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const chroma = ([r, g, b]) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
const hex = ([r, g, b]) => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/** Colours the comp MEASURED -> the four the page uses. No colour is named or chosen here. */
export function themeOf(spec, { scheme = null } = {}) {
  const pal = (spec.palette ?? []).filter((p) => p.frac >= 0.01);
  if (!pal.length) return { accent: "#2b6cb0", surface: "#f7f7f7", ink: "#111111", muted: "#6b7280", scheme: "light", basis: "no palette measured; neutral defaults" };
  const byFrac = [...pal].sort((a, b) => b.frac - a.frac);
  const accentC = [...pal].filter((p) => chroma(p.rgb) >= 0.25).sort((a, b) => b.frac - a.frac)[0] ?? byFrac[0];
  const light = pal.filter((p) => lum(p.rgb) >= 0.85).sort((a, b) => b.frac - a.frac)[0];
  const dark = pal.filter((p) => lum(p.rgb) <= 0.2).sort((a, b) => b.frac - a.frac)[0];
  // the comp's own polarity: which of the two neutral extremes it gives more ground to
  const measured = byFrac.filter((p) => chroma(p.rgb) < 0.25).find((p) => lum(p.rgb) >= 0.85 || lum(p.rgb) <= 0.2);
  const compScheme = measured ? (lum(measured.rgb) <= 0.2 ? "dark" : "light") : light ? "light" : "dark";
  const use = scheme ?? compScheme;
  const surface = use === "light" ? hex(light?.rgb ?? [247, 247, 247]) : hex(dark?.rgb ?? [18, 18, 20]);
  const ink = use === "light" ? hex(dark?.rgb ?? [17, 17, 17]) : hex(light?.rgb ?? [240, 240, 240]);
  const grey = pal.filter((p) => chroma(p.rgb) < 0.12 && lum(p.rgb) > 0.2 && lum(p.rgb) < 0.85).sort((a, b) => b.frac - a.frac)[0];
  return { accent: hex(accentC.rgb), surface, ink, muted: hex(grey?.rgb ?? (use === "light" ? [107, 114, 128] : [156, 163, 175])), scheme: use, basis: `accent=most chromatic measured colour (${(accentC.frac * 100).toFixed(0)}% of the comp); surface/ink=its ${use} extremes` };
}

/** The blocks of the page in the comp's own order. Chrome is the device's, so it is dropped (and said). */
export function layoutOf(spec) {
  const fieldsOf = (z) => z.fields.map((id) => spec.fields.find((f) => f.id === id)).filter(Boolean);
  const blocks = [], dropped = [];
  for (const z of spec.zones) {
    if (z.kind === "chrome") { dropped.push({ zone: z.id, why: "device chrome, not the app's" }); continue; }
    blocks.push({ zone: z.id, kind: z.kind, n: z.n ?? null, fields: fieldsOf(z), at: z.at, basis: z.basis });
  }
  return { blocks, dropped, canvas: spec.canvas };
}

/**
 * bindingFor(spec, table) — table is the source side's declaration, keyed by the comp's structure:
 *   { headline: {fmt}, caption: {fmt}, title: {fmt}, facts: { "<label>": {fmt} }, asides: { "<label>": {fmt} },
 *     tabs: {over}, list: { over, entry: { heading:{fmt}, caption:{fmt}, facts:{ "<label>": {fmt} }, aside:{fmt} } } }
 * A comp fact is matched by the FIRST WORD of its label (folded); a field the table has no entry for is a gap.
 */
export function bindingFor(spec, table) {
  const layout = layoutOf(spec);
  const bound = [], gaps = [];
  const labelKey = (f) => norm(f.label).split(" ")[0] || null;
  const lookup = (group, f) => { const k = labelKey(f); return (k && table[group]?.[k]) || null; };
  for (const b of layout.blocks) {
    if (b.kind === "title") { const t = table.title; for (const f of b.fields) (t ? bound : gaps).push(t ? { field: f.id, block: b.zone, slot: "title", ...t } : { field: f.id, why: "no source field declared for a title" }); continue; }
    if (b.kind === "summary") {
      for (const f of b.fields) {
        const slot = f.role === "headline" ? "headline" : f.role === "caption" ? "caption" : f.role === "aside" ? "aside" : "fact";
        const t = slot === "headline" ? table.headline : slot === "caption" ? table.caption : slot === "aside" ? lookup("asides", f) : lookup("facts", f);
        if (t) bound.push({ field: f.id, block: b.zone, slot, label: f.label, ...t }); else gaps.push({ field: f.id, block: b.zone, slot, label: f.label, why: `the source declares nothing for ${slot}${f.label ? ` "${f.label}"` : ""}` });
      }
      continue;
    }
    if (b.kind === "tabs") { if (table.tabs) bound.push({ block: b.zone, slot: "tabs", n: b.n, over: table.tabs.over }); else gaps.push({ block: b.zone, slot: "tabs", why: "no partition declared for tabs" }); continue; }
    if (b.kind === "list") {
      if (!table.list) { gaps.push({ block: b.zone, slot: "list", why: "no row source declared for the list" }); continue; }
      // the first entry is the fields up to the second heading (the comp repeats one signature; a cut-off last entry is ignored)
      const second = b.fields.findIndex((f, i) => i > 0 && f.role === "heading");
      const entry = second > 0 ? b.fields.slice(0, second) : b.fields;
      for (const f of entry) {
        const slot = f.role === "heading" ? "heading" : f.role === "caption" || f.role === "text" ? "caption" : f.role === "aside" ? "aside" : "fact";
        const t = slot === "heading" ? table.list.entry.heading : slot === "caption" ? table.list.entry.caption : slot === "aside" ? table.list.entry.aside : (table.list.entry.facts ?? {})[labelKey(f)];
        if (t) bound.push({ field: f.id, block: b.zone, slot: `entry.${slot}`, label: f.label, ...t }); else gaps.push({ field: f.id, block: b.zone, slot: `entry.${slot}`, label: f.label, why: `the source has no per-row field for ${slot}${f.label ? ` "${f.label}"` : ""}` });
      }
      bound.push({ block: b.zone, slot: "list", over: table.list.over, n: b.n });
      continue;
    }
    // text and anything else the comp measured that nothing declared: not bound, said so
    for (const f of b.fields) gaps.push({ field: f.id, block: b.zone, slot: b.kind, label: f.label, why: `a ${b.kind} block the source side declared no field for` });
  }
  return { layout, bound, gaps };
}

// ---- the page ----
const CSS = (t) => `:root{--accent:${t.accent};--surface:${t.surface};--ink:${t.ink};--muted:${t.muted};--card:color-mix(in srgb,var(--surface) 92%,var(--ink) 8%);--line:color-mix(in srgb,var(--surface) 82%,var(--ink) 18%)}
*{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header.bar{background:var(--accent);color:#fff;padding:14px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;position:sticky;top:0;z-index:2}
header.bar h1{font-size:1.15rem;margin:0;font-weight:600;flex:1 1 12rem}
form.search{display:flex;gap:6px;flex:1 1 16rem}form.search input{flex:1;padding:8px 10px;border-radius:8px;border:0;font:inherit}form.search button{padding:8px 12px;border-radius:8px;border:0;background:#fff;color:var(--accent);font:inherit;font-weight:600;cursor:pointer}
.opts{display:flex;gap:6px}.opts button{background:transparent;border:1px solid #fff8;color:#fff;border-radius:999px;padding:4px 10px;cursor:pointer;font:inherit;font-size:.85rem}.opts button[aria-pressed=true]{background:#fff;color:var(--accent)}
main{max-width:760px;margin:0 auto;padding:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:0 0 14px}
.headline{font-size:3.4rem;font-weight:300;line-height:1.05}.caption{color:var(--muted);margin:2px 0 10px}
dl.facts{display:grid;grid-template-columns:max-content 1fr;gap:4px 18px;margin:0}dl.facts dt{color:var(--muted)}dl.facts dd{margin:0}
.aside{color:var(--muted);font-size:.85rem;margin-top:8px}
nav.tabs{display:flex;border-bottom:2px solid var(--line);margin:0 0 10px}nav.tabs button{flex:1;padding:10px;background:none;border:0;border-bottom:3px solid transparent;margin-bottom:-2px;font:inherit;font-weight:600;color:var(--muted);cursor:pointer}nav.tabs button[aria-selected=true]{color:var(--accent);border-bottom-color:var(--accent)}
.entry{display:grid;grid-template-columns:1fr auto;gap:2px 12px;padding:10px 0;border-bottom:1px solid var(--line)}.entry:last-child{border:0}.entry .h{font-weight:600}.entry .c{color:var(--muted)}.entry .a{grid-row:1/3;grid-column:2;font-size:1.6rem;font-weight:300;align-self:center}.entry .f{grid-column:1;color:var(--muted);font-size:.85rem}
.gap{border:1px dashed var(--line);border-radius:12px;padding:10px 12px;color:var(--muted);font-size:.9rem;margin:0 0 14px}
.grades{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 4px}.grade{flex:1 1 7rem;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:8px 10px}.grade b{display:block;font-size:1.35rem;font-weight:400}.grade span{color:var(--muted);font-size:.8rem}
footer{max-width:760px;margin:0 auto;padding:6px 14px 28px;color:var(--muted);font-size:.8rem}footer a{color:var(--accent)}
.busy{opacity:.55;transition:opacity .15s}[hidden]{display:none!important}
@media(max-width:480px){.headline{font-size:2.8rem}main{padding:10px}}`;

// the client: declared by the binding, small, no framework; one render function per block kind
const CLIENT = `const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const state={place:null,units:localStorage.getItem('units')||'metric',day:0,data:null,fuel:null};
const get=(o,p)=>p.split('.').reduce((a,k)=>a==null?a:a[k],o);
const fmt=(tpl,ctx)=>tpl.replace(/\\{([^}|]+)(?:\\|([^}]*))?\\}/g,(_,p,d)=>{const v=get(ctx,p.trim());return v==null||v===''?(d??'—'):v;});
async function j(u){const r=await fetch(u);const d=await r.json();if(!r.ok)throw Object.assign(new Error(d.error||r.status),{gap:d});return d;}
function setPlace(p){state.place=p;history.replaceState(null,'','#'+encodeURIComponent(p.label));$$('[data-bind=title]').forEach(e=>e.textContent=p.label);load();}
async function load(){const p=state.place;if(!p)return;document.body.classList.add('busy');
  const q='lat='+p.lat+'&lon='+p.lon+'&units='+state.units+'&tz='+encodeURIComponent(p.tz||'')+'&country='+encodeURIComponent(p.country||'');
  const [w,f]=await Promise.allSettled([j('/api/weather?'+q),j('/api/fuel?'+q)]);
  state.data=w.status==='fulfilled'?w.value:{gap:w.reason.gap||{error:String(w.reason)}};state.fuel=f.status==='fulfilled'?f.value:{gap:f.reason.gap||{error:String(f.reason)}};
  state.day=0;draw();document.body.classList.remove('busy');}
function draw(){const d=state.data;const W=$('#weather');if(W){const ok=d&&!d.gap;$('#weather-gap').hidden=ok;$('#weather-body').hidden=!ok;if(!ok){$('#weather-gap').textContent='No weather could be read: '+((d&&d.gap&&(d.gap.error||d.gap.detail))||'unknown');}else{
  const ctx={...d,u:d.units};$$('[data-fmt]',W).forEach(e=>{if(e.closest('template'))return;e.textContent=fmt(e.dataset.fmt,ctx);});
  const tabs=$('#tabs');if(tabs){tabs.innerHTML='';d.days.slice(0,Number(tabs.dataset.n)||3).forEach((dy,i)=>{const b=document.createElement('button');b.textContent=dy.label;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(i===state.day));b.onclick=()=>{state.day=i;draw();};tabs.appendChild(b);});}
  const list=$('#entries');if(list){list.innerHTML='';const day=d.days[state.day];const rows=d.hours.filter(h=>!day||h.date===day.date);const tpl=$('#entry-tpl');rows.forEach(h=>{const n=tpl.content.cloneNode(true);$$('[data-fmt]',n).forEach(e=>e.textContent=fmt(e.dataset.fmt,{h,u:d.units}));list.appendChild(n);});if(!rows.length)list.textContent='No hours for this day.';}
  $('#source').textContent=d.source?'via '+d.source+(d.tried&&d.tried.length>1?' (after '+d.tried.filter(t=>t!==d.source).join(', ')+' failed)':''):'';}}
  const F=$('#fuel');if(F){const f=state.fuel;const ok=f&&!f.gap;$('#fuel-gap').hidden=ok;$('#fuel-body').hidden=!ok;if(!ok){$('#fuel-gap').textContent='No fuel data: '+((f&&f.gap&&(f.gap.error||f.gap.detail))||'unknown');}else{
   const g=$('#grades');g.innerHTML='';if(f.prices){f.prices.grades.forEach(x=>{const e=document.createElement('div');e.className='grade';e.innerHTML='<b></b><span></span>';e.firstChild.textContent='$'+x.price.toFixed(3);e.lastChild.textContent=x.grade;g.appendChild(e);});$('#price-note').textContent=f.prices.scope+' · week of '+f.prices.week+' · per gallon';}else{$('#price-note').textContent=f.priceGap||'';}
   const list=$('#stations');list.innerHTML='';const tpl=$('#station-tpl');const mi=state.units==='imperial';f.stations.slice(0,12).forEach(s=>{const n=tpl.content.cloneNode(true);const ctx={s,dist:mi?(s.km/1.609344).toFixed(1)+' mi':s.km.toFixed(1)+' km'};$$('[data-fmt]',n).forEach(e=>e.textContent=fmt(e.dataset.fmt,ctx));list.appendChild(n);});if(!f.stations.length)list.textContent='No fuel stations found near here.';}}
  $$('.opts button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.units===state.units)));}
$('#search').addEventListener('submit',async e=>{e.preventDefault();const q=$('#q').value.trim();if(!q)return;try{const r=await j('/api/geocode?q='+encodeURIComponent(q));if(!r.places.length){$('#weather-gap').hidden=false;$('#weather-gap').textContent='No place found for "'+q+'".';return;}setPlace(r.places[0]);}catch(err){$('#weather-gap').hidden=false;$('#weather-gap').textContent='Search failed: '+err.message;}});
$$('.opts button').forEach(b=>b.onclick=()=>{state.units=b.dataset.units;localStorage.setItem('units',state.units);load();});
(async()=>{const h=decodeURIComponent(location.hash.slice(1));const q=h||$('#q').dataset.default;$('#q').value=q;$('#search').requestSubmit();})();`;

/** One block's HTML from its binding. `bound` entries carry `fmt` (a {path|default} template over the source's own payload). */
function blockHtml(block, bound) {
  const mine = bound.filter((b) => b.block === block.zone);
  const fmtOf = (slot) => mine.find((b) => b.slot === slot)?.fmt;
  if (block.kind === "summary") {
    const facts = mine.filter((b) => b.slot === "fact"), asides = mine.filter((b) => b.slot === "aside");
    return `<section class="card" id="weather-body" hidden><div class="headline" data-fmt="${esc(fmtOf("headline") ?? "")}">—</div>${fmtOf("caption") ? `<div class="caption" data-fmt="${esc(fmtOf("caption"))}">—</div>` : ""}<dl class="facts">${facts.map((b) => `<dt>${esc(b.display ?? b.label)}</dt><dd data-fmt="${esc(b.fmt)}">—</dd>`).join("")}</dl>${asides.map((b) => `<div class="aside">${esc(b.display ?? b.label)}: <span data-fmt="${esc(b.fmt)}">—</span></div>`).join("")}</section>`;
  }
  if (block.kind === "tabs") return `<nav class="tabs" role="tablist" id="tabs" data-n="${block.n ?? 3}"></nav>`;
  if (block.kind === "list") {
    const f = mine.filter((b) => b.slot === "entry.fact");
    return `<section class="card"><div id="entries"></div><template id="entry-tpl"><div class="entry"><div class="h" data-fmt="${esc(fmtOf("entry.heading") ?? "")}"></div>${fmtOf("entry.caption") ? `<div class="c" data-fmt="${esc(fmtOf("entry.caption"))}"></div>` : ""}<div class="f">${f.map((b) => `${esc(b.display ?? b.label)} <span data-fmt="${esc(b.fmt)}"></span>`).join(" · ")}</div>${fmtOf("entry.aside") ? `<div class="a" data-fmt="${esc(fmtOf("entry.aside"))}"></div>` : ""}</div></template></section>`;
  }
  return "";
}

/**
 * renderPage({ title, weather: {spec, table, displayNames}, fuel: {...}, theme, defaultPlace, about }) -> { html, binding:{weather, fuel}, theme }
 * The weather comp is the page's layout authority. The fuel section is built from the fuel comp's arrangement the same way
 * (a title, then a list of entries each with a heading, price facts, a caption and an aside), bound to the fuel source's own fields.
 */
export function renderPage({ appName, weather, fuel, theme = null, defaultPlace = "London", aboutHref = "/about" }) {
  const wb = bindingFor(weather.spec, weather.table);
  const t = themeOf(weather.spec, theme ? { scheme: theme } : {});
  const applyNames = (b, names) => { for (const x of b.bound) if (x.label && names[norm(x.label).split(" ")[0]]) x.display = names[norm(x.label).split(" ")[0]]; };
  applyNames(wb, weather.displayNames ?? {});
  const wBlocks = wb.layout.blocks.filter((b) => b.kind !== "title").map((b) => blockHtml(b, wb.bound)).join("\n");
  let fuelHtml = "", fb = null;
  if (fuel) {
    fb = bindingFor(fuel.spec, fuel.table);
    applyNames(fb, fuel.displayNames ?? {});
    const entry = fb.bound.filter((b) => b.slot?.startsWith("entry."));
    const pick = (s) => entry.find((b) => b.slot === s)?.fmt;
    const facts = entry.filter((b) => b.slot === "entry.fact");
    fuelHtml = `<section class="card" id="fuel"><h2 style="margin:0 0 4px;font-size:1.05rem">${esc(fuel.heading ?? "Fuel nearby")}</h2><div id="fuel-gap" class="gap" hidden></div><div id="fuel-body" hidden><div class="grades" id="grades"></div><div class="aside" id="price-note"></div><div id="stations"></div><template id="station-tpl"><div class="entry"><div class="h" data-fmt="${esc(pick("entry.heading") ?? "{s.name}")}"></div>${pick("entry.caption") ? `<div class="c" data-fmt="${esc(pick("entry.caption"))}"></div>` : ""}<div class="f">${facts.map((b) => `${esc(b.display ?? b.label)} <span data-fmt="${esc(b.fmt)}"></span>`).join(" · ")}</div>${pick("entry.aside") ? `<div class="a" style="font-size:1rem" data-fmt="${esc(pick("entry.aside"))}"></div>` : ""}</div></template></div></section>`;
  }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(appName)}</title><style>${CSS(t)}</style></head><body>
<header class="bar"><h1 data-bind="title">${esc(appName)}</h1><form class="search" id="search"><input id="q" name="q" placeholder="Search a place" autocomplete="off" data-default="${esc(defaultPlace)}" aria-label="place"><button>Go</button></form><div class="opts" role="group" aria-label="units"><button data-units="metric">°C · km</button><button data-units="imperial">°F · mi</button></div></header>
<main id="weather"><div id="weather-gap" class="gap" hidden></div>
${wBlocks}
${fuelHtml}
</main><footer><span id="source"></span> · <a href="${esc(aboutHref)}">how this app was made</a></footer>
<script>${CLIENT}</script></body></html>`;
  return { html, binding: { weather: { bound: wb.bound, gaps: wb.gaps, dropped: wb.layout.dropped }, fuel: fb ? { bound: fb.bound, gaps: fb.gaps, dropped: fb.layout.dropped } : null }, theme: t };
}
