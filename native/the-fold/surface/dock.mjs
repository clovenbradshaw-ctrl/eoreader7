// dock.mjs — THE DOCK: the surface frame with no medium in it.
//
// Fold invariant: THE FRAME KNOWS SLOTS, NOT SUBJECTS. Six slots by ROLE —
// subject (the one thing attended to), sources (where things came from),
// measures (numbers with their basis), objects (the things named), relations
// (how they connect), rows (the ledger of acts). Nothing here says plan,
// agency, place, district or any other medium's noun; a civic surface, a maths
// bench and a lab notebook fill the same six slots with different adapters.
//
// An ITEM is { id, title, body?, address, status?, chips? }. `address` is the
// provenance and is REQUIRED — an item without one is refused unless it says
// `ungrounded: true`, in which case it is drawn as such (the gate's own rule:
// a row without provenance is not a row).
//
// Every visible name is a <span data-h="ns:id"> carrying the handle's id, so
// a settings change relabels the page live and never touches an id.
import { resolveHandles, labelOf } from "./handles.mjs";

export const DOCK_SCHEMA = "EODock@1";

export const DOCK_SLOTS = Object.freeze([
  { id: "subject",   terrain: "lens",    zone: "center", role: "the one thing being attended to" },
  { id: "sources",   terrain: "void",    zone: "left",   role: "where each thing came from" },
  { id: "measures",  terrain: "field",   zone: "right",  role: "numbers, each with its basis" },
  { id: "objects",   terrain: "entity",  zone: "top",    role: "the things that are named" },
  { id: "relations", terrain: "network", zone: "center", role: "how the named things connect" },
  { id: "rows",      terrain: "link",    zone: "drawer", role: "the append-only record of acts" },
]);

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const H = (handles, ns, id) => `<span data-h="${ns}:${id}">${esc(labelOf(handles, ns, id))}</span>`;

/** checkItems(items) -> { ok, refused:[{id, reason}] } */
export function checkItems(items = []) {
  const refused = [];
  for (const it of items) {
    if (!it?.id) refused.push({ id: it?.id ?? null, reason: "no id" });
    else if (!it.address && !it.ungrounded) refused.push({ id: it.id, reason: "no address — say `ungrounded: true` or give one" });
  }
  return { ok: refused.length === 0, refused };
}

function itemHtml(it, handles) {
  const status = it.status ? `<span class="st st-${esc(it.status)}">${H(handles, "status", it.status)}</span>` : "";
  const addr = it.address ? `<code class="addr">${esc(it.address)}</code>` : `<em class="ungrounded">ungrounded</em>`;
  const chips = (it.chips ?? []).map((c) => `<span class="chip">${esc(c)}</span>`).join("");
  return `<article class="item" data-id="${esc(it.id)}"><h3>${esc(it.title ?? it.id)} ${status}</h3>${it.body ? `<p>${esc(it.body)}</p>` : ""}<p class="prov">${addr}${chips}</p></article>`;
}

/** renderDock({ content, overrides }) -> { html, refused, rejectedHandles }
 *  `content` = { [slotId]: { items:[…], note? } }. A slot with refused items
 *  draws the refusal in place of the item — never silently omits it. */
export function renderDock({ content = {}, overrides = {}, title = "" } = {}) {
  const { handles, rejected } = resolveHandles(overrides);
  const refusedAll = [];
  const section = (slot) => {
    const c = content[slot.id] ?? { items: [] };
    const chk = checkItems(c.items);
    refusedAll.push(...chk.refused.map((r) => ({ slot: slot.id, ...r })));
    const bad = new Set(chk.refused.map((r) => r.id));
    const shown = (c.items ?? []).filter((i) => !bad.has(i.id)).map((i) => itemHtml(i, handles)).join("");
    const refusals = chk.refused.map((r) => `<p class="refused">refused: ${esc(r.id ?? "(no id)")} — ${esc(r.reason)}</p>`).join("");
    return `<section class="slot zone-${slot.zone}" data-slot="${slot.id}"><h2><span class="terrain">${H(handles, "terrain", slot.terrain)}</span> ${H(handles, "slot", slot.id)}</h2><p class="role">${esc(slot.role)}</p>${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}${shown || '<p class="empty">nothing here yet</p>'}${refusals}</section>`;
  };
  const html = `<div class="dock" data-schema="${DOCK_SCHEMA}">${title ? `<h1>${esc(title)}</h1>` : ""}${DOCK_SLOTS.map(section).join("")}</div>`;
  return { html, refused: refusedAll, rejectedHandles: rejected };
}

/** renderSettings(overrides) -> html for the rename panel. Each input is keyed
 *  data-ns/data-id and shows the default as its placeholder; empty = default. */
export function renderSettings(overrides = {}) {
  const { handles } = resolveHandles(overrides);
  const NAMES = { terrain: "Terrains", status: "Claim statuses", slot: "Dock slots" };
  const group = (ns) => `<fieldset><legend>${NAMES[ns]}</legend>${Object.keys(handles[ns]).map((id) => {
    const given = overrides?.[ns]?.[id] ?? "";
    return `<label><code>${esc(ns)}:${esc(id)}</code><input data-ns="${ns}" data-id="${esc(id)}" maxlength="32" value="${esc(given)}" placeholder="${esc(handles[ns][id])}"></label>`;
  }).join("")}</fieldset>`;
  return `<form class="handles-settings" onsubmit="return false"><p>Rename what you see. Ids, addresses and hashes never change — only the words drawn.</p>${["terrain", "status", "slot"].map(group).join("")}<p class="err" role="alert"></p></form>`;
}

/** The client half, as a string to inline: loads overrides from localStorage,
 *  relabels every [data-h], saves on input. Validation is the SAME module's
 *  rules (handles.mjs is served beside it and imported by the page). */
export const SETTINGS_SCRIPT = `
import { resolveHandles, setHandle } from "./handles.mjs";
const KEY = "fold-handles";
let overrides = {}; try { overrides = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
const apply = () => { const { handles } = resolveHandles(overrides);
  document.querySelectorAll("[data-h]").forEach((el) => { const [ns, id] = el.dataset.h.split(":"); if (handles[ns]?.[id]) el.textContent = handles[ns][id]; }); };
apply();
document.querySelectorAll(".handles-settings input").forEach((inp) => inp.addEventListener("input", () => {
  const r = setHandle(overrides, inp.dataset.ns, inp.dataset.id, inp.value);
  const err = inp.closest("form").querySelector(".err");
  if (r.error) { err.textContent = inp.dataset.ns + ":" + inp.dataset.id + " — " + r.error; return; }
  err.textContent = ""; overrides = r.overrides; try { localStorage.setItem(KEY, JSON.stringify(overrides)); } catch {} apply();
}));
`;
