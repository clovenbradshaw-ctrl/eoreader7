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

// ── SATISFACTION and STRAIN ─────────────────────────────────────────────────
// Satisfaction is not "wrote N sections" — it is whether the DECLARED VOID is
// filled. The meno question ("how do we know when we've learned something we
// do not know?") answers itself only if we DEF the shape of the void FIRST:
// the essay is done when the void we declared — across all nine operators —
// is filled by content that passes its admission test. We know we've learned
// when nothing the void named is still missing.
//
// DEF the void: NUL (the essay itself), SIG (the topic that must resolve),
// INS (what kind of thing fills it), SEG (its extent), CON (what binds a
// section to the topic), SYN (how sections compose), DEF (how many), EVA (the
// admission test a section must pass), REC (what forces the declaration to be
// revised). EVA then checks the written piece against this declaration, and
// REC re-opens whatever the void still names as missing.
import { cellOf } from "../kernel/cube.js";
import { declareVoid, zeroSpace, fill, voidsOf } from "./void-shape.js";

// Declare the essay's void. `sections` is the DEF'd structure (the pieces the
// piece must have); the extent is the whole essay; EVA is the admission test
// a section must pass (real content, grounded, not meta-commentary).
//
// THE SHAPE IS THE MNEME'S. The void is not declared from the classical form
// in the abstract — it is declared AGAINST what the instrument has already
// encountered (the shadow / Mneme: every site visited, its text retained).
// What we can know is bounded by what we've seen; the void is the shape of
// what is still missing RELATIVE to that shadow. A void declared with no
// shadow states that the shadow is empty — an honest gap, never a wish. The
// shadow grounds the declaration: SIG (what must resolve) is bounded by the
// referents the shadow's reading established; SEG (extent) by how much the
// material can support; EVA (admission) is measured against the shadow's
// retained text, not against nothing.
export function declareEssayVoid({ title, topic, sections = [], holonLevel = "section", shadow = [], webSources = null } = {}) {
  const shadowChars = (webSources ?? new Map()).size
    ? [...(webSources ?? new Map()).values()].reduce((a, t) => a + String(t ?? "").length, 0)
    : 0;
  const declaration = declareVoid(
    {
      slot: title || "the piece",
      anchor: topic ?? null, // SIG: what must resolve — bounded by the shadow's referents
      admits: holonLevel ?? "section", // INS: what kind of part fills it
      extent: sections.length ? { from: 1, to: sections.length + 1 } : null, // SEG: how many parts
      relation: "is a part of", // CON
      composition: sections.length ? "the parts compose the whole" : null, // SYN
      cardinality: sections.length || null, // DEF: how many
      admission: "a part with real content, grounded in the shadow's material, written as the piece itself", // EVA
      reopensOn: "a part that is thin, ungrounded, or meta-commentary", // REC
      mneme: {
        // The void's ground: what the instrument has already encountered.
        shadowSites: (shadow ?? []).length,
        shadowChars,
        basis: shadowChars ? "the void is declared against the retained shadow — what we have seen bounds what the piece can fill" : "the shadow is empty — the void names a gap we have not yet begun to fill",
      },
    },
    { cellOf },
  );
  return declaration;
}

// The MENO CHECK: given the void declaration and the written piece, is the
// void filled? EVA measures each declared part against the admission test;
// voidsOf reports any unfilled extent. {ok, filled, of, failures, strain}.
export function fillCheck(declaration, documentLines = [], sections = [], { material = "" } = {}) {
  const failures = [];
  let totalStrain = 0;
  let filled = 0;
  for (let i = 0; i < sections.length; i++) {
    const text = documentLines[i] ?? "";
    const r = satisfactionOfSection(text, { theme: sections[i], material, isFirst: i === 0 });
    totalStrain += r.strain;
    if (r.ok) filled++;
    else for (const f of r.failures) failures.push({ index: i, theme: sections[i], ...f });
  }
  // The void's own extent check: any declared part with no section at all is
  // an unfilled hole in the void's shape, not merely a weak one.
  for (let i = filled; i < sections.length; i++) {
    if (!documentLines[i]) {
      failures.push({ index: i, theme: sections[i], kind: "unfilled", detail: `the void declared a part ("${sections[i]}") that was never written` });
      totalStrain++;
    }
  }
  const ok = filled === sections.length && sections.length > 0;
  return { ok, filled, of: sections.length, failures, totalStrain };
}
const META_COMMENTARY_RE = /\b(here's|here is|let me know if you|i'd like to|you can|would you|consider|things to consider|you'll want to|remember to|feel free|brainstorm|explanation:|note that|as an ai|i can't|i cannot)\b/i;

// EVA a single section against the DEF and the material. Returns {ok,
// failures:[{kind,detail}], strain:number} — strain 0 when clean, +1 per
// failure found (each correction the piece will need).
export function satisfactionOfSection(sectionText, { theme = "", material = "", isFirst = false } = {}) {
  const t = String(sectionText ?? "").trim();
  const failures = [];
  let strain = 0;
  if (t.length < 40) { failures.push({ kind: "thin", detail: "the section has almost no content" }); strain++; }
  // Meta-commentary is a SHAPE error: the model wrote ABOUT the piece instead
  // of writing it ("Here's a potential start... Explanation:... Let me know").
  if (META_COMMENTARY_RE.test(t)) { failures.push({ kind: "meta", detail: "the section describes the writing instead of being the piece" }); strain++; }
  // Grounding: does the section share content with the material? A section
  // with no overlap is fabricated, not written from the ground.
  if (material && material.length > 30) {
    const m = String(material).toLowerCase();
    const tokens = t.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 4);
    if (tokens.length) {
      const shared = tokens.filter((w) => m.includes(w)).length / tokens.length;
      if (shared < 0.08) { failures.push({ kind: "ungrounded", detail: "the section shares almost nothing with the material — it is not written from the ground" }); strain++; }
    }
  }
  return { ok: failures.length === 0, failures, strain };
}

// The whole-document satisfaction: every planned section satisfied. Returns
// {ok, satisfied:number, of:number, failures:[...], totalStrain:number}.
export function satisfactionOf(documentLines = [], sections = [], { material = "" } = {}) {
  const failures = [];
  let totalStrain = 0;
  let satisfied = 0;
  for (let i = 0; i < sections.length; i++) {
    const text = documentLines[i] ?? "";
    const r = satisfactionOfSection(text, { theme: sections[i], material, isFirst: i === 0 });
    totalStrain += r.strain;
    if (r.ok) satisfied++;
    else for (const f of r.failures) failures.push({ index: i, theme: sections[i], ...f });
  }
  const ok = satisfied === sections.length;
  return { ok, satisfied, of: sections.length, failures, totalStrain };
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
      out.push({ url, snip: cleanSpan(s) });
    }
  }
  return out;
}

// Clean a verbatim span: strip the citation/reference debris a source page
// carries in its own text — Wikipedia's "[ 89 ]", bracketed ref numbers,
// and the trailing whitespace they leave — so a quoted span is the source's
// own words, not its apparatus. Mechanical, never paraphrasing.
export function cleanSpan(s = "") {
  return String(s)
    .replace(/\[\s*\d+(?:\s*,?\s*\d+)*\s*\]/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\(\s*\)/g, "")
    .trim();
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
    // The verbatim span: the source's sentence most overlapping this one,
    // CLEANED of citation debris and capped so a footnote is a quotable
    // sentence, never a whole-page reproduction.
    const srcNorm = srcText.replace(/\s+/g, " ");
    const srcSentences = srcNorm.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim());
    let span = null, spanScore = 0;
    for (const ss of srcSentences) {
      const clean = cleanSpan(ss);
      if (clean.length < 25 || clean.length > 260) continue;
      const hits = terms.filter((t) => clean.toLowerCase().includes(t)).length;
      if (hits > spanScore) { spanScore = hits; span = clean; }
    }
    if (!span || spanScore < 3) continue;
    // APA-ish author/year: host + year from the URL's page (no publication
    // date available to a fetch — the host is the named source, the year is
    // the retrieval year, disclosed honestly).
    let host = "Unknown";
    try { host = new URL(best).hostname.replace(/^www\./, ""); } catch {}
    const year = new Date().getFullYear();
    notes.push({ sentence, host, year, url: best, span, spanIndex: srcText.indexOf(span) });
  }
  if (!notes.length) return "";
  // Footnotes: numbered in the essay, then the block at the end.
  const block = notes.map((n, i) => `${i + 1}. (${n.host}, ${n.year}). "${n.span}" — ${n.url}`).join("\n");
  return `\n\n## Footnotes\n\n${block}`;
}

// ── the citation ledger: the holograph pointer, at the true levels of borrow ─
// Footnotes are text; this is the STRUCTURED record — the whole point of EOT
// and the holograph: every output term points precisely to the input bytes it
// came from. Borrowing is a SPECTRUM, and it is RARELY whole-sentence
// verbatim (the Fold's cite.js / snip-check.js discipline):
//
//   VERBATIM  — the whole span exists byte-exact in the source (rare).
//               The span carries a full byte address + per-atom pointers.
//   COMPANY   — the claim's ATOMS (numbers, years, names) each sit in the
//               source BESIDE a content word of the sentence (P31's company
//               rule). This is the COMMON case: the essay paraphrased, but
//               every carried fact is traceable to real source bytes.
//   UNSUPPORTED — no source carries the claim's atoms with company. A
//               disclosed gap — never a silent un-cited claim.
//
// Every atom that IS supported records its real byte address in the retained
// source text: an address is a birth, not a spelling.
export function citationLedger(essay, webSources = new Map(), { maxCitations = 20 } = {}) {
  if (!webSources.size) return { citations: [], of: 0, verbatim: 0, company: 0, unsupported: 0, basis: "no retained sources to cite against" };
  const sentences = String(essay ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
  const citations = [];
  for (const sentence of sentences) {
    if (citations.length >= maxCitations) break;
    const terms = sentence.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    if (terms.length < 4) continue;
    // The claim's ATOMS: numbers (incl. years) and names (capitalized words).
    const atoms = [];
    const numRe = /\b(?:\d[\d.,]*(?:[mkg]?m|k?g|%|ft|in|m|km|mph)?|1[5-9]\d\d|20\d\d)\b/g;
    let nm;
    while ((nm = numRe.exec(sentence))) atoms.push({ kind: /^1[5-9]\d\d$|^20\d\d$/.test(nm[0]) ? "year" : "number", value: nm[0] });
    const nameRe = /\b[A-Z][a-z]{2,}\b/g;
    while ((nm = nameRe.exec(sentence))) atoms.push({ kind: "name", value: nm[0] });
    // Best source by token overlap (the claim's words against the source).
    let best = null, bestScore = 0;
    for (const [url, text] of webSources.entries()) {
      if (!text) continue;
      const src = text.toLowerCase();
      const hits = terms.filter((t) => src.includes(t)).length;
      if (hits > bestScore) { bestScore = hits; best = url; }
    }
    if (!best || bestScore < 3) { citations.push({ essaySentence: sentence, source: null, kind: "unsupported", atoms: [], basis: "no source shares enough of the claim's words" }); continue; }
    const srcText = String(webSources.get(best) ?? "");
    const srcNorm = srcText.replace(/\s+/g, " ");
    const srcLower = srcNorm.toLowerCase();
    const essayLower = sentence.toLowerCase();
    // Company words: the sentence's content words, excluding the atom's own.
    const cw = terms.filter((t) => t.length > 3);
    // The verbatim span, if one exists (byte-exact in the source).
    const srcSentences = srcNorm.split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim());
    let span = null, spanScore = 0;
    for (const ss of srcSentences) {
      const clean = cleanSpan(ss);
      if (clean.length < 25 || clean.length > 260) continue;
      const hits = terms.filter((t) => clean.toLowerCase().includes(t)).length;
      if (hits > spanScore) { spanScore = hits; span = clean; }
    }
    const at = span && spanScore >= 3 ? srcNorm.indexOf(span) : -1;
    const verbatim = at >= 0;
    // The HOLOGRAPH POINTER per atom: each atom's byte address in the source,
    // found BESIDE a company word (P31) when it exists, else marked unsupported.
    const atomSpans = [];
    const seenAtoms = new Set();
    for (const atom of atoms) {
      const key = `${atom.kind}:${atom.value.toLowerCase()}`;
      if (seenAtoms.has(key)) continue;
      seenAtoms.add(key);
      const needle = atom.value.toLowerCase();
      const needleAt = srcLower.indexOf(needle);
      if (needleAt < 0) { atomSpans.push({ ...atom, at: null, supported: false, company: [] }); continue; }
      // Company: does a content word of the sentence sit within ±60 chars of
      // the atom in the source? (The atom beside the claim's other words.)
      const win = srcNorm.slice(Math.max(0, needleAt - 60), Math.min(srcNorm.length, needleAt + needle.length + 60)).toLowerCase();
      const company = cw.filter((w) => w !== needle && win.includes(w));
      atomSpans.push({ ...atom, at: [needleAt, needleAt + needle.length], supported: true, company: company.slice(0, 5) });
    }
    const supportedAtoms = atomSpans.filter((a) => a.supported);
    let host = "Unknown";
    try { host = new URL(best).hostname.replace(/^www\./, ""); } catch {}
    // Grade the borrow: verbatim span > all atoms company-supported > partial.
    const allSupported = supportedAtoms.length === atomSpans.length && atomSpans.length > 0;
    const kind = verbatim ? "verbatim" : allSupported ? "company" : "unsupported";
    citations.push({
      essaySentence: sentence,
      source: { url: best, host },
      verbatimSpan: span && verbatim ? span : null,
      kind,
      at: verbatim ? [at, at + span.length] : null,
      // The holograph pointer: each carried atom with its real byte address.
      atoms: atomSpans,
      retrievedAt: new Date().toISOString(),
    });
  }
  const counts = { verbatim: citations.filter((c) => c.kind === "verbatim").length, company: citations.filter((c) => c.kind === "company").length, unsupported: citations.filter((c) => c.kind === "unsupported").length };
  return { citations, of: citations.length, ...counts, basis: `mechanically attributed against ${webSources.size} retained source(s): ${counts.verbatim} verbatim, ${counts.company} company-supported (paraphrase, atoms byte-addressed), ${counts.unsupported} unsupported (disclosed)` };
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