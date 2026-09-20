// whitepaper-html.js — a static, inert HTML rendering of a composed
// document whose quotes carry archive-anchor.js's own verified standing.
//
// REUSES crown.js's own trace rule one register over (the-fold, P39
// BUILD-4: a rendered claim never carries a fact its own data did not
// produce). Here: an ANCHORED quote renders as a real `<a>` into the
// verified snapshot address `anchorClaim` returned; an UNANCHORED or
// NOT_A_URL quote is rendered too — never dropped, per this whole
// codebase's withhold-vs-convict discipline — but visibly, structurally
// distinct (a different element, a different class, the reason in the
// text itself), so a reader can never mistake a claim nobody verified for
// one that was. No JS anywhere in the output: a static page cannot let a
// reader be fooled by a script re-coloring an unverified claim green.
//
// PURE. No fetch, no DOM API — a string builder over the shapes
// archive-anchor.js and whitepaper.js already produce. No engine import
// beyond those two organs' own exported constant.
//
// Generality: universal — the render reads only { standing, quote,
// sourceUrl, snapshotUrl, span, reason, detail } fields every anchoring
// result already carries; nothing here is specific to any one document's
// subject matter.

import { ANCHOR_STANDINGS } from "./archive-anchor.js";

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One quote, rendered by its own standing — never by a guess at it. */
function renderQuote(c) {
  const quote = esc(c.quote ?? "");
  if (c.standing === ANCHOR_STANDINGS.ANCHORED) {
    const addr = `${esc(c.snapshotUrl)}#:~:text=${encodeURIComponent(String(c.quote ?? "").slice(0, 120))}`;
    const range = c.span ? ` data-bytes="${c.span.start}-${c.span.end}"` : "";
    return `<a class="quote-anchor" href="${addr}" title="verified at ${esc(c.snapshotUrl)}"${range}>&ldquo;${quote}&rdquo;<sup class="anchor-mark">✓</sup></a>`;
  }
  const reason = c.standing === ANCHOR_STANDINGS.NOT_A_URL
    ? "not a web source — nothing to archive"
    : `${esc(c.reason ?? "unverified")}${c.detail ? `: ${esc(c.detail)}` : ""}`;
  return `<span class="quote-unanchored" title="UNVERIFIED — ${reason}">&ldquo;${quote}&rdquo;<sup class="anchor-mark unverified">⚠</sup></span>`;
}

/** One claim/paragraph: its prose plus its quote(s) rendered inline. */
function renderClaim(claim) {
  const body = esc(claim.text ?? "");
  const quotes = (claim.quotes ?? []).map(renderQuote).join(" ");
  const source = claim.sourceUrl ? ` <span class="claim-source">(<a href="${esc(claim.sourceUrl)}">source</a>)</span>` : "";
  return `<p class="claim">${body}${quotes ? ` ${quotes}` : ""}${source}</p>`;
}

function renderSection(section) {
  const heading = section.heading ? `<h2>${esc(section.heading)}</h2>` : "";
  const claims = (section.claims ?? []).map(renderClaim).join("\n");
  const withheld = (section.withheld ?? []).length
    ? `<div class="withheld"><em>Withheld from this section (${section.withheld.length}): ${section.withheld.map((w) => esc(w.reason ?? "undetermined")).join("; ")}</em></div>`
    : "";
  return `<section>\n${heading}\n${claims}\n${withheld}\n</section>`;
}

const CSS = `
body { font: 16px/1.6 Georgia, serif; max-width: 74ch; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; background: #fdfdfb; }
h1 { font-size: 1.8rem; } h2 { font-size: 1.3rem; margin-top: 2rem; border-bottom: 1px solid #ddd; }
.quote-anchor { color: #0a5f38; text-decoration: none; border-bottom: 1px dotted #0a5f38; }
.quote-anchor:hover { background: #eafaf1; }
.quote-unanchored { color: #7a1f1f; background: #fdf0f0; border-bottom: 1px dotted #7a1f1f; cursor: help; }
.anchor-mark { font-size: 0.7em; }
.anchor-mark.unverified { color: #b00; }
.claim-source { font-size: 0.85em; color: #666; }
.withheld { margin-top: 0.5rem; padding: 0.5rem; background: #fafafa; border-left: 3px solid #ccc; font-size: 0.9em; color: #555; }
footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 0.85em; color: #666; }
.coverage { font-size: 0.85em; color: #444; background: #f6f6f0; padding: 0.75rem 1rem; border: 1px solid #e0e0d5; }
`.trim();

/**
 * renderWhitepaperHtml(doc) — a whitepaper.js document (see that module's
 * `composeWhitepaper`) into one static HTML string.
 *   doc: { title, sections: [{ heading, claims: [{text, quotes, sourceUrl}], withheld }], coverage }
 * No JS anywhere in the output — static, inert HTML, consistent with the
 * "no fabrication, ever" posture: nothing in the page can let a reader
 * accidentally trust an unverified claim via a script re-painting it.
 */
export function renderWhitepaperHtml(doc) {
  const title = esc(doc?.title ?? "Untitled");
  const sections = (doc?.sections ?? []).map(renderSection).join("\n");
  const cov = doc?.coverage;
  const covLine = cov
    ? `<div class="coverage">Quote anchoring: ${cov.anchored ?? 0} anchored to a verified archive.org snapshot, ${cov.unanchored ?? 0} unverified, ${cov.notAUrl ?? 0} not web sources — of ${cov.total ?? 0} quotes total.</div>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${CSS}</style>
</head>
<body>
<h1>${title}</h1>
${covLine}
${sections}
<footer>Every quote marked <span class="quote-anchor">✓</span> was verified byte-for-byte against an archive.org snapshot this instrument fetched and read; every quote marked <span class="quote-unanchored">⚠</span> could not be verified and is disclosed rather than dropped.</footer>
</body>
</html>`;
}
