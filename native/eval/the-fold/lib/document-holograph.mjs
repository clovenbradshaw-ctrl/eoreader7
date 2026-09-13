// document-holograph.mjs — the document holograph's pure computation.
// The caller supplies the constitutional reading log and the ledger projection;
// this module never scans a document to discover identity.
import { foldReading, readingIndexFromLog, mentionBookFromLog } from "../../../../../the-fold/reading-log.js";
import { activate, } from "../../../../../the-fold/activation-retrieval.js";
import { activeReferents, lensBlock, lensCut } from "../../../../../the-fold/resolutions.js";
import { dmdWindow } from "../../../kernel/activation.js";

const addressOf = (w) => String(typeof w === "string" ? w : (w?.at ?? w?.ref ?? "")).split("~")[0];
const layout = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const spanRange = (at) => {
  const m = /^(.*?)#(\d+)-(\d+)(?:#(\d+)-(\d+))?$/.exec(String(at ?? ""));
  if (!m) return null;
  const base = Number(m[2]);
  return { source: m[1], start: m[4] == null ? base : base + Number(m[4]), end: m[4] == null ? Number(m[3]) : base + Number(m[5]) };
};

function verifySpan(span, sources) {
  const range = spanRange(span?.at ?? span?.ref);
  if (!range) return { ok: false, reason: "span_address_unreadable", at: span?.at ?? span?.ref ?? null };
  const text = sources[range.source];
  if (typeof text !== "string") return { ok: false, reason: "source_absent", source: range.source };
  const raw = text.slice(range.start, range.end);
  if (raw === String(span.text ?? "")) return { ok: true, mode: "exact", source: range.source, start: range.start, end: range.end };
  // Relation spans are display text, not quotations. P17's declared layout
  // transform permits hard-wrap whitespace to become one display space while
  // the address still names the original bytes.
  if (layout(raw) === layout(span.text)) return { ok: true, mode: "layout_normalized", source: range.source, start: range.start, end: range.end };
  return { ok: false, reason: "span_does_not_read_back", at: span.at ?? span.ref };
}

function verifyPassage(passage, sources) {
  const text = sources[passage.source];
  if (typeof text !== "string") return { ok: false, reason: "source_absent", source: passage.source };
  return text.slice(passage.start, passage.end) === passage.text
    ? { ok: true }
    : { ok: false, reason: "passage_does_not_read_back", ref: passage.ref };
}

export function computeDocumentHolograph({ question, readingEntries, notes, sources, organs = {} }) {
  if (!question) throw new TypeError("document holograph requires a declared question");
  if (!Array.isArray(readingEntries) || !readingEntries.length) throw new TypeError("document holograph requires a constitutional reading log");
  if (!Array.isArray(notes)) throw new TypeError("document holograph requires the projected ledger notes");
  const reconstruct = organs.reconstruct ?? null;
  const identity = { reconstruct, diaNorm: organs.diaNorm, namesCorefer: organs.namesCorefer, surfaceIndex: organs.surfaceIndex, surfacesIn: organs.surfacesIn };
  const folded = foldReading(readingEntries, identity);
  const index = readingIndexFromLog(readingEntries, identity);
  const book = mentionBookFromLog(readingEntries, identity);
  const active = activeReferents(question, [], index);
  if (!active.ids.size) return { basis: "typed_gap", gap: "question_unresolved", question, identity: folded.identity, referents: index.referents.size, addressedSentences: book.sentences.length };

  const lens = lensBlock({ question, active: active.ids, index, notes, dmdWindow });
  const cut = lensCut({ question, active: active.ids, index, notes, dmdWindow });
  const retrieval = activate({ question, transcript: [], index, book, notes, dmdWindow, resolutions: 3 });
  const spanChecks = cut.rows.flatMap((r) => (r.n?.spans ?? []).map((s) => ({ ...verifySpan(s, sources), at: s.at ?? s.ref ?? null })));
  const passageChecks = retrieval.passages.map((p) => ({ ref: p.ref, ...verifyPassage(p, sources) }));
  const gaps = [...spanChecks, ...passageChecks].filter((x) => !x.ok);
  if (gaps.length) return { basis: "typed_gap", gap: "address_verification_failed", question, identity: folded.identity, referents: index.referents.size, addressedSentences: book.sentences.length, gaps };

  return {
    basis: "constitutional_reading",
    question,
    active: [...active.ids].map((id) => ({ id, surface: index.represent(id) })),
    identity: folded.identity,
    referents: index.referents.size,
    addressedSentences: book.sentences.length,
    notes: notes.length,
    lens: {
      lines: lens.lines,
      window: cut.window,
      ceiling: cut.ceiling === true,
      basis: cut.basis,
      selected: cut.rows.map((r) => ({ line: `${r.n.subject ?? r.n.end1} — ${r.n.verb ?? r.n.label}→ ${r.n.object ?? r.n.end2}`, addresses: [...new Set((r.n.witnesses ?? []).map(addressOf).filter((a) => a.includes("#")))], spans: r.n.spans ?? [] })),
    },
    addressChecks: {
      ledgerSpans: spanChecks.length,
      ledgerSpansExact: spanChecks.filter((x) => x.ok && x.mode === "exact").length,
      ledgerSpansLayoutNormalized: spanChecks.filter((x) => x.ok && x.mode === "layout_normalized").length,
      groundingPassages: passageChecks.length,
      groundingPassagesExact: passageChecks.filter((x) => x.ok).length,
    },
    grounding: {
      basis: retrieval.basis,
      window: retrieval.window,
      ceiling: retrieval.cutCeiling === true,
      cutBasis: retrieval.cutBasis,
      passages: retrieval.passages.map((p) => ({ ref: p.ref, text: p.text, source: p.source, start: p.start, end: p.end })),
      why: retrieval.why,
    },
  };
}
