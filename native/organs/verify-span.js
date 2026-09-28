// organs/verify-span.js — ONE span/passage verification, shared by the
// reading side (eval/the-fold/lib/document-holograph.mjs) and, as of this
// integration, the proposition side (the-fold/proposition-holograph.js),
// instead of two near-identical copies that had drifted apart
// (document-holograph.mjs's own verifySpan understood the "at" combined
// address and P17's layout tolerance; product-assay.mjs's understood the
// {ref,start,end} shape hypergraph.js's own claim spans actually use, plus
// a passage-relative coordinate fallback — neither covered the other's case).
//
// A span or passage claims: "these bytes, at this address, read this text."
// verifySpan checks that against the real source: an exact match, the one
// declared layout tolerance (P17 — hard-wrap whitespace collapses to one
// display space, the address still names the original bytes), or a
// passage-relative coordinate frame when the caller supplies passages
// (hypergraph.js's own claim spans are offsets INTO the passage, not the
// source file) — and never anything looser. A span that doesn't verify is
// a disclosed fact about the claim's address, never smoothed over.

const layout = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

// Accepts either shape a caller already has: {ref, start, end, text}
// (hypergraph.js's claim spans — start/end may be source-absolute OR
// passage-relative; both are tried) or {at: "name#start-end", text}
// (document-holograph.mjs's combined address, optionally with a second
// "#start-end" for a passage-relative sub-span).
function rangeOf(span) {
  if (Number.isFinite(span?.start) && Number.isFinite(span?.end) && span?.ref) {
    return { source: String(span.ref).split("#")[0], start: span.start, end: span.end, passageRef: span.ref };
  }
  const m = /^(.*?)#(\d+)-(\d+)(?:#(\d+)-(\d+))?$/.exec(String(span?.at ?? span?.ref ?? ""));
  if (!m) return null;
  const base = Number(m[2]);
  return { source: m[1], start: m[4] == null ? base : base + Number(m[4]), end: m[4] == null ? Number(m[3]) : base + Number(m[5]), passageRef: null };
}

/** verifySpan(span, sources, { passages }) — sources: { [name]: fullText }.
 * passages (optional): [{ref, start, end}], for spans whose start/end are
 * offsets into a passage rather than the source file. Returns
 * { ok, mode, source, start, end } or { ok: false, reason, at }. */
export function verifySpan(span, sources, { passages = [] } = {}) {
  const range = rangeOf(span);
  if (!range) return { ok: false, reason: "span_address_unreadable", at: span?.at ?? span?.ref ?? null };
  const text = sources?.[range.source];
  if (typeof text !== "string") return { ok: false, reason: "source_absent", source: range.source };
  const claimed = String(span.text ?? "");
  const raw = text.slice(range.start, range.end);
  if (raw === claimed) return { ok: true, mode: "exact", source: range.source, start: range.start, end: range.end };
  if (layout(raw) === layout(claimed)) return { ok: true, mode: "layout_normalized", source: range.source, start: range.start, end: range.end };
  const p = range.passageRef ? passages.find((x) => x.ref === range.passageRef) : null;
  if (p) {
    const pStart = p.start + range.start, pEnd = p.start + range.end;
    const passRaw = text.slice(pStart, pEnd);
    if (passRaw === claimed || layout(passRaw) === layout(claimed)) return { ok: true, mode: "passage_relative", source: range.source, start: pStart, end: pEnd };
  }
  return { ok: false, reason: "span_does_not_read_back", at: span?.at ?? span?.ref ?? null };
}

/** verifyPassage(passage, sources) — a whole passage's {source,start,end,text}
 * against the source it names. */
export function verifyPassage(passage, sources) {
  const text = sources?.[passage?.source];
  if (typeof text !== "string") return { ok: false, reason: "source_absent", source: passage?.source };
  return text.slice(passage.start, passage.end) === passage.text
    ? { ok: true }
    : { ok: false, reason: "passage_does_not_read_back", ref: passage?.ref ?? null };
}
