// document-holograph.mjs — the document holograph's pure computation.
// The caller supplies the constitutional reading log and the ledger projection;
// this module never scans a document to discover identity.
import { dmdWindow } from "../../../kernel/activation.js";
import { resolveFoldSibling, requireFoldAvailable } from "./fold-sibling.mjs";
import { verifySpan, verifyPassage } from "../../../organs/verify-span.js";

// reading-log.js, activation-retrieval.js and resolutions.js are the sibling
// the-fold checkout's own modules, which this repo's CI never checks out
// (native-kernel.yml checks out eoreader7 alone). Static imports of them threw
// MODULE_NOT_FOUND at load and crashed every importer, so they are imported
// only when the sibling is present, and computeDocumentHolograph refuses,
// typed (FoldUnavailableError), when it is not — lib/fold-sibling.mjs's one
// posture, shared with product-assay.mjs, frontier-25.mjs and long-stream.mjs.
const FOLD_UP = "../../../../../the-fold/";
const { available: FOLD_OK } = resolveFoldSibling(import.meta.url, FOLD_UP);
const foldModule = (name) => (FOLD_OK ? import(new URL(`${FOLD_UP}${name}`, import.meta.url).href) : {});
const { foldReading, readingIndexFromLog, mentionBookFromLog } = await foldModule("reading-log.js");
const { activate } = await foldModule("activation-retrieval.js");
const { activeReferents, lensBlock, lensCut } = await foldModule("resolutions.js");

/** requireDocumentHolographFold() — throws FoldUnavailableError when the sibling the-fold checkout is absent; returns its path otherwise. */
export function requireDocumentHolographFold() {
  return requireFoldAvailable(import.meta.url, FOLD_UP, "document-holograph.mjs needs reading-log.js, activation-retrieval.js and resolutions.js from it");
}

const addressOf = (w) => String(typeof w === "string" ? w : (w?.at ?? w?.ref ?? "")).split("~")[0];

// verifySpan/verifyPassage moved to organs/verify-span.js (2026-09-28) —
// this file's own copy and product-assay.mjs's were two independent
// codings of the same check that had drifted apart (this one understood
// P17's layout tolerance; product-assay's understood a passage-relative
// coordinate frame). Both callers now share one implementation that does
// both, so a span either module hands it verifies the same way.

export function computeDocumentHolograph({ question, readingEntries, notes, sources, organs = {} }) {
  requireDocumentHolographFold();
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
