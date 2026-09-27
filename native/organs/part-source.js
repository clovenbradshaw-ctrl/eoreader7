// Handle: Panizzi — Antonio Panizzi, the librarian who wrote the cataloguing
// rules: every item found, and every item recorded with where it came from.
//
// part-source.js — a page part SNIPPED, not written: found on the fly among
// published packages, kept only under a license that permits it, cut to the
// rules the page actually uses, and carried with its provenance. The engine
// draws its page from the fold (adapters/build/belief-page.js); what the page
// looks like is not the engine's to invent by hand either. So:
//
//   find     the need is declared by the renderer (the HTML elements it
//            emits); a need names its search ("classless css" for a
//            stylesheet that styles plain elements) and the registry is asked
//   license  a candidate is kept only when the registry's stated license is
//            in the permissive family below; the package's own LICENSE file
//            is fetched and travels with the snip (MIT and its kin ask that
//            the notice go with every copy)
//   choose   each kept candidate's stylesheets are read and the one whose
//            rules reach the most of the page's elements wins (fewest bytes
//            on a tie) — coverage measured, never a favourite
//   snip     only the rules whose selectors name an element the page emits
//            (plus :root, html, body, *), and any @media block holding one,
//            each with its exact byte range in the pinned file
//   stamp    package@version/path, its URL, license, sha256 and the byte
//            ranges, in a comment at the head of the snipped CSS
//
// Pure except for what is injected (`npm`: adapters/sources/npm-parts.js).
// No regular expressions.

export const PART_SOURCE_SCHEMA = "PartSource@1";

/** The permissive licenses a snip may be taken under, set by hand
 *  2026-09-27 from the OSI's permissive family (no copyleft: a snip must not
 *  bind the page it lands in). */
export const PERMISSIVE = Object.freeze(new Set(["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD", "CC0-1.0", "Unlicense"]));
/** What each need searches for, set by hand 2026-09-27: a stylesheet for a
 *  page of plain elements is what the registry calls "classless css". */
export const NEED_QUERIES = Object.freeze({ stylesheet: ["classless css"] });
const ALWAYS = new Set([":root", "html", "body", "*"]);

/** Top-level CSS blocks with their byte ranges: [{ head, start, end, inner }]
 *  (inner: the nested blocks of an @-rule). Comments and strings are skipped. */
export function cssBlocks(text, from = 0, to = text.length) {
  const out = [];
  let i = from, headStart = from;
  while (i < to) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "*") { const e = text.indexOf("*/", i + 2); i = e < 0 ? to : e + 2; if (text.slice(headStart, i).trim().startsWith("/*")) headStart = i; continue; }
    if (c === "\"" || c === "'") { const e = text.indexOf(c, i + 1); i = e < 0 ? to : e + 1; continue; }
    if (c === "{") {
      let depth = 1, j = i + 1;
      while (j < to && depth) {
        if (text[j] === "/" && text[j + 1] === "*") { const e = text.indexOf("*/", j + 2); j = e < 0 ? to : e + 2; continue; }
        if (text[j] === "{") depth++; else if (text[j] === "}") depth--;
        j++;
      }
      const head = text.slice(headStart, i).trim();
      let start = headStart;
      while (start < i && (text[start] === " " || text[start] === "\n" || text[start] === "\r" || text[start] === "\t")) start++;
      out.push({ head, start, end: j, inner: head.startsWith("@") ? cssBlocks(text, i + 1, j - 1) : [] });
      i = j; headStart = j;
      continue;
    }
    if (c === ";" && text.slice(headStart, i).trim().startsWith("@")) { i++; headStart = i; continue; }   // @import / @charset
    i++;
  }
  return out;
}

/** The element names a selector targets: "nav a:hover, .card > h3" -> a, nav, h3
 *  (a name led by ".", "#", ":" or "[" is a class, id, pseudo or attribute). */
export function selectorElements(selector) {
  const out = new Set();
  const s = String(selector ?? "").toLowerCase();
  let word = "", lead = "";
  const flush = () => { if (word && !".#:[-".includes(lead || " ") && !"0123456789".includes(word[0])) out.add(word); word = ""; };
  for (let i = 0; i <= s.length; i++) {
    const c = s[i] ?? " ";
    // an attribute selector's contents ("[type=text]") name no element
    if (c === "[") { flush(); const e = s.indexOf("]", i + 1); i = e < 0 ? s.length : e; continue; }
    const isWord = (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c === "-" || c === "_";
    if (isWord) { if (!word) lead = s[i - 1] ?? " "; word += c; continue; }
    flush();
  }
  for (const a of ALWAYS) if (s.split(",").some((part) => part.trim() === a)) out.add(a);
  return out;
}

/** snipCss(text, elements) -> { css, ranges, reached }: the rules that style
 *  an element the page emits, each at its exact byte range in `text`. */
export function snipCss(text, elements) {
  const want = new Set([...elements, ...ALWAYS]);
  const ranges = [];
  const reached = new Set();
  const takes = (b) => { const hit = [...selectorElements(b.head)].filter((e) => want.has(e)); hit.forEach((e) => reached.add(e)); return hit.length > 0; };
  for (const b of cssBlocks(text)) {
    if (b.head.startsWith("@font-face") || b.head.startsWith("@keyframes") || b.head.startsWith("@import")) continue;
    if (b.head.startsWith("@")) { if (b.inner.some(takes)) ranges.push([b.start, b.end]); continue; }
    if (takes(b)) ranges.push([b.start, b.end]);
  }
  const css = ranges.map(([a, z]) => text.slice(a, z)).join("\n");
  return { css, ranges, reached: [...reached].filter((e) => !ALWAYS.has(e)) };
}

/**
 * sourcePart({ need, elements, npm, maxCandidates }) -> Promise<part | null>
 *   part: { schema, need, css, provenance: { package, version, path, url,
 *           license, licenseText, sha256, ranges, reached, of, candidates } }
 */
export async function sourcePart({ need = "stylesheet", elements, npm, maxCandidates = 6 }) {
  const tried = [];
  let best = null;
  for (const q of NEED_QUERIES[need] ?? []) {
    const found = (await npm.search(q, maxCandidates)) ?? [];
    for (const p of found) {
      const ok = PERMISSIVE.has(String(p.license ?? ""));
      tried.push({ name: p.name, version: p.version, license: p.license, kept: ok });
      if (!ok) continue;
      const files = (await npm.files(p.name, p.version)) ?? [];
      const sheets = files.filter((f) => f.path.endsWith(".css") && !f.path.endsWith(".min.css") && f.size < 60000).sort((a, b) => a.path.length - b.path.length).slice(0, 4);
      for (const f of sheets) {
        const got = await npm.file(p.name, p.version, f.path);
        if (!got?.text) continue;
        const s = snipCss(got.text, elements);
        const score = s.reached.length;
        if (!best || score > best.score || (score === best.score && s.css.length < best.snip.css.length)) best = { score, snip: s, p, f, got };
      }
    }
  }
  if (!best || !best.score) return null;
  const files = (await npm.files(best.p.name, best.p.version)) ?? [];
  const lic = files.find((f) => { const n = f.path.toLowerCase(); return n === "/license" || n === "/license.md" || n === "/license.txt" || n === "/licence"; });
  const licenseText = lic ? (await npm.file(best.p.name, best.p.version, lic.path))?.text ?? null : null;
  return {
    schema: PART_SOURCE_SCHEMA, need, css: best.snip.css,
    provenance: { package: best.p.name, version: best.p.version, path: best.f.path, url: best.got.url, license: best.p.license, licenseText, sha256: best.got.sha256, ranges: best.snip.ranges, reached: best.snip.reached, of: [...elements], candidates: tried },
  };
}

/** The comment that travels at the head of the snipped CSS. */
export function provenanceComment(p) {
  const clean = (s) => String(s ?? "").split("*/").join("* /");
  return `/* snipped, not written: ${clean(p.package)}@${clean(p.version)}${clean(p.path)}\n   ${clean(p.url)}\n   license ${clean(p.license)} · sha256 ${p.sha256}\n   bytes ${p.ranges.map(([a, z]) => `${a}-${z}`).join(", ")}\n   styles: ${p.reached.join(", ")}\n${p.licenseText ? `\n${clean(p.licenseText).trim()}\n` : `\n(no license file in the package; the registry states ${clean(p.license)})\n`}*/`;
}
