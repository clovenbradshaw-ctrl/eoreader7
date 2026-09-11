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

// ── EVA: does the composed piece match its declared essay shape? ────────────
// The DEF for a composition is the essay's classical form (thesis opening,
// thematic body, conclusion). EVA checks the ASSEMBLED text mechanically
// against that declared shape and reports which parts are missing — never
// trusts the model to self-judge. Returns {ok, failures:[{kind, detail}]}.
export function checkEssayShape(text, { parts = 3, themes = [] } = {}) {
  const t = String(text ?? "");
  const failures = [];
  const lower = t.toLowerCase();
  const words = t.replace(/\s+/g, " ").trim();
  // Opening: does the piece state a thesis early (a claim about the subject)?
  const first300 = words.slice(0, 300);
  const hasThesis = /\b(this essay|we\b|dolphins are|the subject|here we|let'?s|in this (piece|essay))\b/.test(first300) || first300.length > 60;
  if (!hasThesis) failures.push({ kind: "opening", detail: "the piece opens without stating its thesis" });
  // Body: are the declared themes actually addressed?
  for (const theme of themes.slice(0, parts)) {
    const probe = String(theme ?? "").slice(0, 60);
    if (!probe) continue;
    const tokens = probe.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    const hit = tokens.filter((w) => lower.includes(w)).length / Math.max(tokens.length, 1);
    if (tokens.length && hit < 0.5) failures.push({ kind: "body", detail: `the theme "${probe}" is not actually covered` });
  }
  // Conclusion: does the piece return to the thesis at the end?
  const last300 = words.slice(-300);
  const hasConclusion = /\b(in conclusion|to conclude|ultimately|finally|in the end|as we|let us|we have seen)\b/.test(last300) || last300.length > 40;
  if (!hasConclusion) failures.push({ kind: "closing", detail: "the piece ends without returning to its thesis" });
  return { ok: failures.length === 0, failures };
}

// ── REC: a rewrite pass names exactly what the EVA found, and the ledger
//    records the revision (supersede) so the before/after stays on file. ────

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

// ── APA footnotes with the verbatim span ───────────────────────────────────
// The essay's sentences are attributed to the web sources MECHANICALLY —
// never by the model choosing its citations. For each sentence that stands
// on a source, render an APA-style footnote carrying (a) the source's host
// and year, and (b) the VERBATIM sentence from the source it borrows from
// (the span, taken from the EOT-retained text, never paraphrased). The
// source's URL is the address; the borrowed sentence is the evidence.
export function renderApaFootnotes(essay, webSources = new Map(), { maxFootnotes = 12 } = {}) {
  if (!webSources.size) return "";
  // Split the essay into sentences.
  const sentences = String(essay ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
  const notes = [];
  for (const sentence of sentences) {
    if (notes.length >= maxFootnotes) break;
    const terms = sentence.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    if (terms.length < 4) continue;
    // Best-supporting source by token overlap (cite.js discipline: a word is
    // not evidence; a phrase shared with the source is).
    let best = null, bestScore = 0;
    for (const [url, text] of webSources.entries()) {
      if (!text) continue;
      const src = text.toLowerCase();
      const hits = terms.filter((t) => src.includes(t)).length;
      if (hits > bestScore) { bestScore = hits; best = url; }
    }
    if (!best || bestScore < 3) continue; // not grounded enough to cite
    const srcText = String(webSources.get(best) ?? "");
    // The verbatim span: the source's sentence most overlapping this one.
    const srcSentences = srcText.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim());
    let span = null, spanScore = 0;
    for (const ss of srcSentences) {
      const hits = terms.filter((t) => ss.toLowerCase().includes(t)).length;
      if (hits > spanScore) { spanScore = hits; span = ss; }
    }
    if (!span || spanScore < 3) continue;
    // APA-ish author/year: host + year from the URL's page (no publication
    // date available to a fetch — the host is the named source, the year is
    // the retrieval year, disclosed honestly).
    let host = "Unknown";
    try { host = new URL(best).hostname.replace(/^www\./, ""); } catch {}
    const year = new Date().getFullYear();
    notes.push({ sentence, host, year, url: best, span });
  }
  if (!notes.length) return "";
  // Footnotes: numbered in the essay, then the block at the end.
  const block = notes.map((n, i) => `${i + 1}. (${n.host}, ${n.year}). "${n.span}" — ${n.url}`).join("\n");
  return `\n\n## Footnotes\n\n${block}`;
}

// ── disk persistence: the essay LIVES as a JSONL file, projectable anytime ─
// The working essay is never just in-memory: every observation is appended as
// one JSONL line to <dir>/<docId>.jsonl, and the CURRENT state is always the
// projection of that file — the same fold discipline the reader's own log
// holds (S78: the log is the artifact, the tree is a projection). A later
// edit appends; nothing rewrites in place. projectLedgerFile re-folds the
// file at any moment, so a long essay can be re-projected mid-writing.
import fs from "node:fs";
import path from "node:path";

export function ledgerFilePath(dir, docId) {
  return path.join(dir, `${String(docId).replace(/[^a-z0-9:_-]/gi, "_")}.jsonl`);
}

export function appendLedgerLine(ledger, entry, { dir = null } = {}) {
  const line = appendDocumentObservation(ledger, entry);
  if (dir) {
    try {
      fs.appendFileSync(ledgerFilePath(dir, ledger.docId), JSON.stringify(line) + "\n");
    } catch { /* disk off: the in-memory ledger still holds the record */ }
  }
  return line;
}

export function projectLedgerFile(filePath, { includeTitle = true } = {}) {
  let text = "";
  try { text = fs.readFileSync(filePath, "utf8"); } catch { return null; }
  const ledger = { schema: SCHEMA, docId: path.basename(filePath, ".jsonl"), title: "", lines: [], superseded: new Set(), nextAddress: 0 };
  for (const line of String(text).split("\n")) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (!obj || typeof obj.id !== "string") continue;
    ledger.lines.push(obj);
    if (obj.supersedes) ledger.superseded.add(obj.supersedes);
  }
  return projectDocument(ledger, { includeTitle });
}

export function projectLedgerChangelog(filePath, { declaredParts = null } = {}) {
  let text = "";
  try { text = fs.readFileSync(filePath, "utf8"); } catch { return null; }
  const ledger = { schema: SCHEMA, docId: path.basename(filePath, ".jsonl"), title: "", lines: [], superseded: new Set(), nextAddress: 0 };
  for (const line of String(text).split("\n")) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (!obj || typeof obj.id !== "string") continue;
    ledger.lines.push(obj);
    if (obj.supersedes) ledger.superseded.add(obj.supersedes);
  }
  return documentChangeLog(ledger, { declaredParts });
}