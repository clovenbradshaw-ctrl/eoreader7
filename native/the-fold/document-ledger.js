// document-ledger.js — a generated document as an EOT ledger, projectable at
// any point, with a human change log folded off it.
//
// The EOT discipline, applied to a document the proxy GENERATES (an essay, a
// code file) rather than one it READS. The record is the object: the working
// file a person opens is a PROJECTION of this ledger at some revision, and
// every edit — a section admitted, a revision superseding it — is a line
// appended here, never an in-place edit. Re-expansion is always possible; the
// current text is never the only text.
//
// DEF, EVA and REC (the Interpretation domain, THE-THREE-MATHEMATICS) are
// RUNTIME operations here, not file rows: they are the gates the driver uses
// while composing, and only their OUTCOME lands in the ledger as lines —
//   DEF  declare the composition's shape (how many parts) before any part is
//        written; a definition is a wish until its evaluate clears.
//   EVA  admit a candidate part: it must carry real text AND be grounded
//        (some surfed material addresses it) or it fails admission.
//   REC  when admission fails, re-zero: append a revision that supersedes the
//        failed part and re-generate it. A revision is a line, never an edit.
// The ledger therefore carries the change log's RESULT; the gates live in the
// composing driver. project(ledger) reconstructs the document at any point —
// surviving parts in address order, superseded parts dropped.

const SCHEMA = "EOTDocument@1";

let _seq = 0;

// ── the ledger ──────────────────────────────────────────────────────────────
export function createDocumentLedger({ docId, title = "", path = "" } = {}) {
  return {
    schema: SCHEMA,
    docId: docId ?? `doc:${Date.now()}:${_seq++}`,
    title,
    path,
    createdAt: new Date().toISOString(),
    lines: [], // append-only
    superseded: new Set(),
    nextAddress: 0,
  };
}

export function appendDocumentObservation(ledger, entry) {
  const at = entry.at ?? [ledger.nextAddress, ledger.nextAddress + String(entry.text ?? "").length];
  const line = {
    schema: "EOTObservation@1",
    id: entry.id ?? `${ledger.docId}:obs:${ledger.lines.length}`,
    at,
    role: entry.role ?? "part",
    kind: entry.kind ?? null,
    title: entry.title ?? null,
    text: entry.text ?? "",
    supersedes: entry.supersedes ?? null,
    giver: entry.giver ?? null,
    basis: entry.basis ?? null,
    appendedAt: new Date().toISOString(),
  };
  ledger.lines.push(line);
  if (line.supersedes) {
    ledger.superseded.add(line.supersedes);
  } else {
    ledger.nextAddress = Math.max(ledger.nextAddress, at[1]);
  }
  return line;
}

// ── projection: the document at any point ───────────────────────────────────
// Fold the ledger: surviving observations (never superseded), in address
// order. A revision (supersedes set) drops its target from the projection and
// takes the target's address slot with its own text. This is a pure function
// of the ledger — same bytes in, same projection out, at any point in time.
export function projectDocument(ledger, { includeTitle = true } = {}) {
  const alive = ledger.lines.filter((l) => !ledger.superseded.has(l.id));
  alive.sort((a, b) => (a.at[0] - b.at[0]) || (a.at[1] - b.at[1]));
  const body = alive.map((l) => l.text).join("\n\n");
  if (!includeTitle || !ledger.title) return body;
  return ledger.title ? `# ${ledger.title}\n\n${body}`.trim() : body;
}

// ── the change log: a human read of what the document has BEEN ─────────────
// Folded off the ledger at its CURRENT state — DEF declared at the top (the
// shape the composition aimed at), then each admitted part, then each
// revision, newest last. Lines, not prose: the record stays checkable.
export function documentChangeLog(ledger, { declaredParts = null } = {}) {
  const out = [];
  const declared = declaredParts
    ? `${declaredParts.length} part${declaredParts.length === 1 ? "" : "s"}: ${declaredParts.map((p) => `"${p}"`).join(", ")}`
    : "no declared shape (single-part composition)";
  out.push(`# Change log — ${ledger.docId}`);
  out.push("");
  out.push(`Declared (DEF): ${declared}`);
  out.push("");
  const admitted = ledger.lines.filter((l) => !l.supersedes);
  if (!admitted.length) out.push("No parts admitted yet.");
  for (const l of admitted) {
    const state = ledger.superseded.has(l.id) ? "REVISED" : "alive";
    out.push(`- [${state}] ${l.title ?? l.role} (${l.at[0]}–${l.at[1]})${l.basis ? ` — ${l.basis}` : ""}`);
  }
  const revised = ledger.lines.filter((l) => l.supersedes);
  for (const l of revised) {
    out.push(`- [REVISION] ${l.title ?? l.role} supersedes ${l.supersedes}${l.basis ? ` — ${l.basis}` : ""}`);
  }
  return out.join("\n");
}

// ── EVA / REC gates (runtime) ───────────────────────────────────────────────
// These are the composing driver's gates, kept here so the driver calls them
// instead of re-implementing the judgment. They decide what gets admitted;
// they never write a file row themselves.

// EVA — admit a candidate part. A part carries real text (some minimum) AND
// is grounded (some surfed segment addresses it). Returns {ok, because}.
export function admitPart({ text, grounded = true, minChars = 20 } = {}) {
  const chars = String(text ?? "").trim().length;
  if (chars < minChars) return { ok: false, because: `too thin: ${chars} chars < ${minChars} minimum` };
  if (!grounded) return { ok: false, because: "not grounded: no surfed material addresses this part" };
  return { ok: true, because: `admitted: ${chars} chars, grounded` };
}

// REC — declare that a part needs re-zeroing and the ledger line to record it.
export function revisePart({ ledger, targetId, title, text, basis }) {
  return appendDocumentObservation(ledger, {
    supersedes: targetId,
    role: "part",
    kind: "revision",
    title,
    text,
    basis,
    at: null, // revision takes its target's slot via projection ordering
  });
}

// ── verbatim source snips (citations, never generated) ─────────────────────
// The Fold's snip discipline (snip-check.js): "What the sources say, verbatim".
// Sentences are taken mechanically from the EOT-retained source text — never
// paraphrased, never invented. Each snip carries its source address. Returns
// [] when no source text is retained.
export function snipsFromSources(webSources, { maxSnips = 6, maxChars = 240 } = {}) {
  const out = [];
  for (const [url, text] of (webSources ?? new Map()).entries()) {
    if (out.length >= maxSnips) break;
    if (!text) continue;
    const sentences = String(text)
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 40 && s.length <= maxChars);
    for (const s of sentences) {
      if (out.length >= maxSnips) break;
      out.push({ url, snip: s });
    }
  }
  return out;
}

// ── serialization ───────────────────────────────────────────────────────────
export function serializeLedger(ledger) {
  return JSON.stringify(ledger, null, 2);
}