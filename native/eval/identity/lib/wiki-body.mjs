// wiki-body.mjs — a Wikipedia page's BODY prose with its hyperlinks kept as
// spans (2026-09-28). Parsoid HTML (rest_v1/page/html): only top-level <p>
// paragraphs of the article sections are read — never infoboxes, navboxes,
// tables, captions or page chrome, which the host would otherwise read as
// prose ("Main menu"). Footnote markers (<sup>) and <style> are dropped.
// A link is { start, end, title, text } in the returned text's own JS-string
// coordinates; the title is the link target, the page it points at.
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " ", ndash: "–", mdash: "—" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
});
export function wikiBody(html) {
  // drop everything that is not article prose
  let h = html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, "")
    .replace(/<sup\b[\s\S]*?<\/sup>/gi, "")
    .replace(/<table\b[\s\S]*?<\/table>/gi, "")
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, "");
  const paras = [...h.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
  let text = ""; const links = [];
  for (const p of paras) {
    const open = []; let para = "";
    for (const tok of p.split(/(<[^>]+>)/)) {
      if (!tok) continue;
      if (tok[0] === "<") {
        const a = /^<a\b[^>]*rel="mw:WikiLink"[^>]*href="\.\/([^"#]+)[^"]*"/i.exec(tok);
        if (a) open.push({ start: text.length + (text ? 2 : 0) + para.length, title: decodeURIComponent(decode(a[1])).replace(/_/g, " ") });
        else if (/^<a\b/i.test(tok)) open.push(null);
        else if (/^<\/a>/i.test(tok)) { const o = open.pop(); if (o) links.push({ ...o, end: text.length + (text ? 2 : 0) + para.length }); }
        continue;
      }
      para += decode(tok).replace(/\s+/g, " ");
    }
    para = para.trim();
    if (!para) { links.splice(links.length - links.filter((l) => l.start >= text.length).length); continue; }
    text += (text ? "\n\n" : "") + para;
  }
  for (const l of links) l.text = text.slice(l.start, l.end);
  return { text, links: links.filter((l) => l.end > l.start) };
}
