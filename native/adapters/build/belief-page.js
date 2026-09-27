// adapters/build/belief-page.js — Terkel's renderer: a folded belief (things,
// their names, their counts and attributes, their parts) -> one self-contained
// HTML page. The engine owns every tag; the mouth only ever talked. A thing
// whose kind is one the engine knows how to draw as a control (a box, a field,
// a form, a button, links) is drawn as that control — a closed catalog, the
// surface-catalog posture: a kind outside it is drawn as a card, never guessed.
// No regular expressions: escaping is split/join, markup is built by el().
const esc = (s) => String(s ?? "").split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");
const el = (tag, inner = "", attrs = "") => "<" + tag + (attrs ? " " + attrs : "") + ">" + inner + "<" + "/" + tag + ">";
const one = (tag, attrs = "") => "<" + tag + (attrs ? " " + attrs : "") + ">";

/** The control catalog, set by hand 2026-09-27: kinds the renderer draws as
 *  working controls. */
export const CONTROL_KINDS = Object.freeze({ box: "input", field: "input", input: "input", bar: "input", form: "form", button: "button", link: "links", links: "links", menu: "links", tab: "links", tabs: "links" });

const STYLE = ":root{--bg:#f5f6f8;--fg:#1b2129;--card:#fff;--muted:#5d6773;--rule:#dde1e6;--accent:#2f5bb7}"
  + "@media (prefers-color-scheme:dark){:root{--bg:#12161b;--fg:#e4e8ed;--card:#1a2027;--muted:#98a2ae;--rule:#2a323c;--accent:#8aa7ee}}"
  + "*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--fg)}"
  + "header,main{max-width:1000px;margin:0 auto;padding:0 16px}header{padding-top:28px}h1{margin:0 0 4px;font-size:2rem}.for{color:var(--muted);margin:0 0 20px}"
  + "section{margin:0 0 26px}h2{font-size:1.15rem;margin:0 0 10px;color:var(--accent)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}"
  + "article{background:var(--card);border:1px solid var(--rule);border-radius:10px;padding:12px 14px}article h3{margin:0 0 4px;font-size:1rem}.kind{color:var(--muted);font-size:.8rem;text-transform:uppercase;letter-spacing:.06em}"
  + "dl{margin:6px 0 0;display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:.92rem}dt{color:var(--muted)}dd{margin:0}.parts{margin-top:8px;display:grid;gap:8px}"
  + ".parts article{border-radius:8px;padding:8px 10px}label{display:grid;gap:4px;font-size:.92rem;margin:4px 0}input{font:inherit;padding:8px;border:1px solid var(--rule);border-radius:6px;background:var(--bg);color:var(--fg)}"
  + "dd.derived{font-style:italic;color:var(--muted)}"
  + "button{font:inherit;padding:8px 14px;border:0;border-radius:6px;background:var(--accent);color:#fff;cursor:pointer}nav a{margin-right:12px}";

// "community" -> "communities", "post" -> "posts", "species" stays
const pluralOf = (k) => k.endsWith("s") ? k : k.endsWith("y") && !"aeiou".includes(k.at(-2)) ? k.slice(0, -1) + "ies" : k + "s";
const nameOf = (t) => t.name ?? [t.modifier, t.kind].filter(Boolean).join(" ");
// a control is labelled by what it is for when it has no name: "Sort posts by votes"
const labelOf = (t) => { const aim = t.props.find((p) => p.label === "for"); if (t.name || !aim) return nameOf(t); const v = String(aim.value); return v.charAt(0).toUpperCase() + v.slice(1); };

function controlHtml(t, byId) {
  const what = CONTROL_KINDS[t.kind];
  const label = labelOf(t);
  if (what === "input") return el("label", esc(label) + one("input", 'name="' + esc(t.id) + '" placeholder="' + esc(label) + '"'));
  if (what === "button") return el("button", esc(label), 'type="button"');
  if (what === "links") {
    const items = [...t.props.map((p) => p.value), ...t.children.map((c) => nameOf(byId.get(c)))];
    return el("nav", (items.length ? items : [label]).map((x) => el("a", esc(x), 'href="#"')).join(""));
  }
  // a form: its parts and its details become fields, then a button that sends
  const fields = [...t.children.map((c) => byId.get(c)).filter(Boolean).map((c) => nameOf(c)), ...t.props.filter((p) => p.label !== "for").map((p) => p.label)];
  const inputs = (fields.length ? fields : ["Title"]).map((f, i) => el("label", esc(f) + one("input", 'name="f' + i + '"')));
  return el("form", el("h3", esc(label)) + inputs.join("") + el("button", "Send", 'type="submit"'), "onsubmit=\"event.preventDefault()\"");
}

// a value the engine computed from the parts is marked as computed, never
// passed off as something said
const propHtml = (p) => el("dt", esc(p.label)) + (p.derived ? el("dd", el("i", esc(p.value), 'title="computed from the parts on this page"'), 'class="derived"') : p.superseded ? el("dd", el("s", esc(p.value), 'title="said, and corrected by the parts on this page"')) : el("dd", esc(p.value)));

/** The HTML elements this renderer emits — what a snipped stylesheet must
 *  reach (organs/part-source.js measures coverage against this list). */
export const RENDERED_ELEMENTS = Object.freeze(["header", "main", "section", "article", "h1", "h2", "h3", "p", "span", "dl", "dt", "dd", "i", "s", "form", "label", "input", "button", "nav", "a"]);

function thingHtml(t, byId, depth) {
  if (CONTROL_KINDS[t.kind]) return controlHtml(t, byId);
  const props = t.props.length ? el("dl", t.props.map(propHtml).join("")) : "";
  const parts = t.children.map((c) => byId.get(c)).filter(Boolean);
  const partsHtml = parts.length && depth < 4 ? el("div", parts.map((p) => thingHtml(p, byId, depth + 1)).join(""), 'class="parts"') : "";
  return el("article", el("span", esc(t.kind), 'class="kind"') + el("h3", esc(nameOf(t))) + props + partsHtml);
}

// With `style` (a snipped stylesheet, organs/part-source.js) the page carries
// no hand-written CSS at all: the snip with its provenance comment, and the
// layout the stylesheet gives plain elements. Without one, STYLE — the
// engine's own fallback — is used and the page says so.
export function renderBelief(belief, { what = "", forWhom = "", style = null } = {}) {
  const byId = new Map(belief.map((t) => [t.id, t]));
  const site = belief.find((t) => t.kind === "site" && !t.parent) ?? null;
  // the page is titled by what was said, never by the request's own words
  // (a request carries the checker's words, so drawing it would pass checks
  // no one talked into the page)
  const title = site?.name ?? "Untitled site";
  const roots = belief.filter((t) => !t.parent && t !== site);
  // the site's own parts come first, then anything else heard at the top
  const top = [...(site ? site.children.map((c) => byId.get(c)).filter(Boolean) : []), ...roots];
  const groups = new Map();
  for (const t of top) { const k = CONTROL_KINDS[t.kind] ? "Tools" : t.kind; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); }
  const sections = [...groups.entries()].map(([k, list]) => el("section", el("h2", esc(k === "Tools" ? "Tools" : (list.length > 1 ? pluralOf(k) : k))) + el("div", list.map((t) => thingHtml(t, byId, 0)).join(""), 'class="grid"'))).join("\n");
  const siteProps = site?.props.length ? el("dl", site.props.filter((p) => p.label !== "is").map(propHtml).join("")) : "";
  const css = style?.css ? `\n${style.comment ?? ""}\n${style.css}\n` : `\n/* no licensed stylesheet was found for this page: the engine's own fallback, written by hand */\n${STYLE}\n`;
  const head = "<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" + el("title", esc(title)) + "\n" + el("style", css);
  const header = el("header", el("h1", esc(title)) + (forWhom ? el("p", "For " + esc(forWhom), 'class="for"') : "") + siteProps);
  return "<!DOCTYPE html>\n" + el("html", "\n" + el("head", "\n" + head + "\n") + "\n" + el("body", "\n" + header + "\n" + el("main", sections) + "\n") + "\n", 'lang="en"') + "\n";
}
