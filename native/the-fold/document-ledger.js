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
  // The projection is the READABLE ESSAY: the written parts and the citation
  // block. The plan, the outline, and the reading's internal scaffolding are
  // ledger facts, not essay prose — a reader of the piece must never see the
  // void questions or the outline machinery.
  const prose = alive.filter((l) => l.role === "part" || l.role === "citations");
  const body = prose.map((l) => l.text).join("\n\n");
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
export function checkEssayShape(text, { parts = 3, themes = [], subject = "" } = {}) {
  const t = String(text ?? "");
  const failures = [];
  const lower = t.toLowerCase();
  const words = t.replace(/\s+/g, " ").trim();
  // Opening: does the piece state a thesis early (a claim about the subject)?
  const first300 = words.slice(0, 300);
  const hasThesis = /\b(this essay|we\b|dolphins are|the subject|here we|let'?s|in this (piece|essay))\b/.test(first300) || first300.length > 60;
  if (!hasThesis) failures.push({ kind: "opening", detail: "the piece opens without stating its thesis" });
  // Body: is the SUBJECT genuinely addressed across the piece? The themes are
  // the void's questions; the essay ANSWERS them as grounded prose and never
  // echoes the question's own scaffolding words ("what space is this essay").
  // So the body check probes the SUBJECT's content nouns (what the piece must
  // actually be about), not the question text — a section that names the
  // bongo's genus, coat, and habitat IS the answer to "What KIND is X", even
  // though it never says the word "kind" (measured: the old probe falsely
  // failed 5 themes and Murch appended redundant sections forever).
  const probeText = String(subject || themes[0] || "").slice(0, 80);
  const stop = new Set(["what","which","where","when","why","how","does","is","are","the","a","an","and","of","to","in","on","at","for","that","this","from","with","its","it","one","be","so","or","your","our"]);
  const tokens = probeText.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3 && !stop.has(w));
  if (tokens.length) {
    const hit = tokens.filter((w) => lower.includes(w)).length / tokens.length;
    if (hit < 0.5) failures.push({ kind: "body", detail: `the piece barely mentions ${subject || "its subject"} — the themes are not actually addressed` });
  }
  // Conclusion: does the piece return to the thesis at the end?
  const last300 = words.slice(-300);
  const hasConclusion = /\b(in conclusion|to conclude|ultimately|finally|in the end|as we|let us|we have seen)\b/.test(last300) || last300.length > 40;
  if (!hasConclusion) failures.push({ kind: "closing", detail: "the piece ends without returning to its thesis" });
  return { ok: failures.length === 0, failures };
}

// ── DEF the void by ASKING QUESTIONS — the shape is what the piece must
//    ANSWER, never what the source's own headings happen to say. ────────────
// Wikipedia's taxonomy table is NOT the essay's shape. The essay's shape is
// the VOID of what a reader needs to know that the essay is obligated to
// fill. The DEF is generated by asking — and the asking is TAXONOMICALLY
// COMPLETE, EO style: one question per operator of the 27-cell cube, in
// dependency order (NUL→SIG→INS→SEG→CON→SYN→DEF→EVA→REC), so the void spans
// all three domains (Existence, Structure, Interpretation) and all three
// modes (Differentiate, Relate, Generate). Each question is the ACT the essay
// must perform — cells classify moves, never content (95.7% of assignments
// survive word-shuffling) — so the templates are domain-invariant: swap the
// subject, the 27-cell sweep holds. A finding at an earlier cell constrains
// every later one; an unanswered operator is a typed gap, never a default.
//
// 9 core questions (one per operator, the canonical grain) make the space
// `specified`; up to 27 (all three grains) is the ceiling. The generator here
// emits the 9 core in chain order — the minimum complete void to DEF before
// any material is hunted.

// The 27 cells — each operator × grain is a possible VOID TYPE. A question is
// relevant only when its cell actually bears on THIS essay: asking all 27
// every time is noise, and asking fewer leaves the space under-specified. So
// each cell carries a RELEVANCE predicate — when it applies to the subject
// and the question — and the DEF converts the relevant cells into voids,
// typing the rest as `not-relevant` (an undeclared cell is a typed gap, never
// a default). The same organs serve any subject; the predicates decide which
// voids exist for this one.
//   Terrain of each cell: Void/Entity/Kind · Field/Link/Network ·
//   Atmosphere/Lens/Paradigm. Stance: Clearing/Dissecting/Unraveling ·
//   Tending/Binding/Tracing · Cultivating/Making/Composing.
const VOID_CELLS = [
  // ── Existence · what exists ──
  // HOLON (the law: low sets possibility for high, high probability for low).
  // LOW cells ask about the SUBJECT — X itself, its kinds, beings, relations,
  // extent, story — and are the sections Wolfe writes. HIGH cells ask about
  // the ESSAY — its frame, thesis, claims, parts, revisions, the account it
  // instantiates — and are the shape Murch checks and Ranke grounds, never a
  // reader-facing section.
  { op: "NUL", grain: "Ground", terrain: "Void", holon: "low", ask: (s) => `What is ${s}, marked off from everything adjacent to it — what space is this essay, and what is it NOT?`, relevant: () => true }, // every essay marks its subject off
  // BORN: relevant only when the material actually shows multiple beings/kinds
  // (several referents) or the question asks about kinds.
  { op: "NUL", grain: "Figure", terrain: "Entity", holon: "low", ask: (s) => `Does ${s} name ONE being that clears its ground, or several that must be kept apart?`, relevant: (q, r) => /(?:species|subspecies|kinds?|types?|varieties?)/i.test(q) || /\b(?:several|multiple|many|both|either)\b/i.test(q) || (r?.referents ?? 0) > 3 },
  { op: "NUL", grain: "Pattern", terrain: "Kind", holon: "low", ask: (s) => `What KIND is ${s} — and do its kinds hold as kinds against the material, or are they unresolved?`, relevant: () => true },
  { op: "SIG", grain: "Ground", terrain: "Void", holon: "high", ask: (s) => `What is absent and must be found for the essay about ${s} to exist — what presence is currently missing?`, relevant: (q, r) => /(?:unknown|unclear|undocumented|scarcely|rarely|little known|not well)/i.test(q) || (r?.surprise ?? 0) === 0 },
  { op: "SIG", grain: "Figure", terrain: "Entity", holon: "low", ask: (s) => `Which ${s} is this — the names and the referent, so one being is meant, not a byte string?`, relevant: () => true }, // every essay resolves its subject
  // BORN: relevant when the material has multiple kinds/forms (subspecies, races).
  { op: "SIG", grain: "Pattern", terrain: "Kind", holon: "low", ask: (s) => `How many distinct ${s} keep recurring as the same kind across the sources — each candidate signed as a proposal?`, relevant: (q, r) => /(?:subspecies|populations?|variants?|forms?|races?)/i.test(q) || (r?.referents ?? 0) > 3 },
  { op: "INS", grain: "Ground", terrain: "Void", holon: "low", ask: (s) => `What baseline account of ${s} must be built before any judgment can land on it?`, relevant: () => true },
  { op: "INS", grain: "Figure", terrain: "Entity", holon: "high", ask: (s) => `What does the essay bring into being about ${s} — the portrait, the thesis — what is born here that did not exist before?`, relevant: (q) => /\b(?:essay|paper|portrait|account|thesis|history)\b/i.test(q) },
  { op: "INS", grain: "Pattern", terrain: "Kind", holon: "high", ask: (s) => `What established kind of account does the essay on ${s} instantiate — species description, conservation assessment, natural-history narrative?`, relevant: () => true },
  // ── Structure · how things hang together ──
  { op: "SEG", grain: "Ground", terrain: "Field", holon: "low", ask: (s) => `What extent must the essay cover, and in what units — ${s}'s range, scale, span — so a hole is a visible uncovered stretch?`, relevant: () => true },
  { op: "SEG", grain: "Figure", terrain: "Link", holon: "high", ask: (s) => `What does the essay cut apart, and is the cut derived off the material's own bytes (ecology from anatomy, not a model's label)?`, relevant: (q) => /(?:geograph|range|habitat|distribution|extent|how far|where)/i.test(q) },
  { op: "SEG", grain: "Pattern", terrain: "Network", holon: "low", ask: (s) => `Where do the parts of ${s}'s story part at natural seams — what separates into distinct chapters at the material's own bridges?`, relevant: (q) => /(?:chapter|section|part|stages?|phases?|periods?)/i.test(q) },
  // BORN: relevant when the material has relations (edges) to bind.
  { op: "CON", grain: "Ground", terrain: "Field", holon: "low", ask: (s) => `What connective field do ${s}'s relations live in — the ambient of possible relations before any single one is confirmed?`, relevant: (q, r) => /\b(?:predat|prey|habitat|relat|depend|threat|interact)\b/i.test(q) || (r?.relations ?? 0) > 0 },
  { op: "CON", grain: "Figure", terrain: "Link", holon: "low", ask: (s) => `What binds each named thing to ${s} — the material's own edges: predator→prey, ${s}→forest, each span-verified?`, relevant: () => true }, // every essay binds its subject
  { op: "CON", grain: "Pattern", terrain: "Network", holon: "low", ask: (s) => `What recurring relation runs through ${s}'s story — the same cycle (habitat loss → decline) found at a real recurrence floor?`, relevant: (q, r) => /(?:cycle|recurr|repeated|again|trend|pattern)/i.test(q) || (r?.relations ?? 0) > 2 },
  // BORN: relevant when multiple sources were actually retained.
  { op: "SYN", grain: "Ground", terrain: "Field", holon: "high", ask: (s) => `What received readings of ${s} merge into ONE carried ground the essay stands on — which accounts compile, with typed gaps for absences?`, relevant: (q, r) => /(?:source|record|account|history|literature|several)/i.test(q) || (r?.sources ?? 0) > 1 },
  { op: "SYN", grain: "Figure", terrain: "Link", holon: "low", ask: (s) => `Where do two sources about ${s} agree into one claim with two witnesses — which re-sightings fold into the same note?`, relevant: (q, r) => /(?:agree|corroborat|witness|confirm|support|both)/i.test(q) || (r?.sources ?? 0) > 1 },
  { op: "SYN", grain: "Pattern", terrain: "Network", holon: "high", ask: (s) => `How do the essay's parts about ${s} compose — how do its relations chain so a reader walks from one section to the next without repetition?`, relevant: () => true },
  // ── Interpretation · what the reader holds ── (the essay's HIGH: Murch/Ranke)
  { op: "DEF", grain: "Ground", terrain: "Atmosphere", holon: "high", ask: (s) => `What interpretive frame is the essay on ${s} declared in — conservation alarm, natural-history wonder, extinction narrative?`, relevant: () => true },
  { op: "DEF", grain: "Figure", terrain: "Lens", holon: "high", ask: (s) => `How many answers does the essay on ${s} hold — one thesis or several — DECLARED, never read off grammar?`, relevant: () => true },
  // BORN: relevant when the material shows a genuine dispute.
  { op: "DEF", grain: "Pattern", terrain: "Paradigm", holon: "high", ask: (s) => `What candidate framings of ${s} are proposed, which are REFUTED by the material, and which stay candidate — never given?`, relevant: (q, r) => /(?:debate|dispute|controv|interpret|framing|theor|argue)/i.test(q) || r?.disputes === true },
  { op: "EVA", grain: "Ground", terrain: "Atmosphere", holon: "high", ask: (s) => `What does the essay owe the reader's accumulated picture of ${s} — and when does that ground MOVE (surprise contracts the window)?`, relevant: (q, r) => /(?:surpris|expect|known|assum|picture|assume)/i.test(q) || (r?.surprise ?? 0) > 0 },
  { op: "EVA", grain: "Figure", terrain: "Lens", holon: "high", ask: (s) => `What test must each claim about ${s} pass — grounded in the retained material, witnessed, within the declared extent?`, relevant: () => true }, // every essay tests its claims
  // BORN: relevant when multiple witnesses exist (several sources).
  { op: "EVA", grain: "Pattern", terrain: "Paradigm", holon: "high", ask: (s) => `What is each claim about ${s}'s standing across all its witnesses — agree, single, disputed, contradicted, undetermined?`, relevant: (q, r) => /(?:several|multiple|sources?|studies?|reports?|claims?|findings?)/i.test(q) || (r?.sources ?? 0) > 1 },
  { op: "REC", grain: "Ground", terrain: "Atmosphere", holon: "high", ask: (s) => `When does the essay about ${s} concede its frame and re-zero — what arrival starts a fresh atmosphere?`, relevant: () => true },
  { op: "REC", grain: "Figure", terrain: "Lens", holon: "high", ask: (s) => `What would make the essay about ${s} take back a specific claim — and what new ground would be born with it?`, relevant: () => true },
  // BORN: relevant when the material shows status/finding change.
  { op: "REC", grain: "Pattern", terrain: "Paradigm", holon: "high", ask: (s) => `What finding about ${s} forces the whole declaration to be revised — a new subspecies, a changed status, a reversed trajectory?`, relevant: (q, r) => /(?:status|change|new|revis|discover|updat|finding)/i.test(q) || (r?.surprise ?? 0) > 3 },
];

// Which cells produce ESSAY CONTENT (a section the reader sees) vs. SHAPE
// INSTRUMENTS (a question about the essay's own frame/declaration/revision —
// conversation instruments that steer the composition loop but are not
// sections of a standalone piece). THE LAW OF HOLONS decides: LOW asks about
// the SUBJECT (sets possibility for the essay's claims — these are the
// sections Wolfe writes); HIGH asks about the ESSAY (the frame/claims/
// revisions Murch edits and Ranke grounds — never a reader-facing section).
const isEssayCell = (op, grain, holon) => holon === "low";

// Generate the VOID CELLS for a subject: all 27 considered, the relevant ones
// emitted as questions (with their cell metadata), the rest typed not-relevant.
// Returns { cells: [{question, op, grain, terrain, relevant, essay, ...}], of, relevant, notRelevant }.
// `essay` marks whether the cell's question asks for ESSAY CONTENT (grounded
// prose about the subject) vs. an ESSAY-SHAPE instrument (a question about
// the essay itself — how it is framed, what it declares, when it would
// revise). Content cells become sections the reader sees; shape cells steer
// the composition loop internally and are not emitted as reader-facing
// sections — a "when would the essay take back a claim" question is a
// conversation instrument, not a section of a standalone piece.
export function voidCellsFor({ topic, question = "", openQuestions = [], shadowReferents = [], reading = null } = {}) {
  const t = String(topic ?? "").trim() || "this subject";
  const cells = [];
  const seen = new Set();
  const push = (questionText, meta) => {
    const k = questionText.toLowerCase().replace(/\s+/g, " ").trim();
    if (k && !seen.has(k)) { seen.add(k); cells.push({ question: questionText, ...meta }); }
  };
  for (const q of openQuestions ?? []) push(String(q ?? "").replace(/[?？]\s*$/, "") + "?", { op: "open", grain: null, terrain: null, relevant: true, essay: false });
  const refs = (shadowReferents ?? []).filter((r) => r && typeof r === "string" && r !== t).slice(0, 3);
  for (const ref of refs) push(`What is ${ref}, and how does it relate to ${t}?`, { op: "SIG", grain: "Figure", terrain: "Entity", relevant: true, essay: true });
  // THE BORN GATE: relevance is decided by the MATERIAL the hunt actually
  // found (reading), not only the question's words. A cell is relevant when
  // either the question asks it OR the reading's state demands it — the void
  // is born from what was found, never a fixed count.
  for (const cell of VOID_CELLS) {
    const relevant = cell.relevant(question ?? "", reading ?? {});
    if (relevant) push(cell.ask(t), { op: cell.op, grain: cell.grain, terrain: cell.terrain, relevant: true, cell: `${cell.op}·${cell.grain}`, essay: isEssayCell(cell.op, cell.grain, cell.holon) });
    else cells.push({ question: null, op: cell.op, grain: cell.grain, terrain: cell.terrain, relevant: false, cell: `${cell.op}·${cell.grain}`, essay: isEssayCell(cell.op, cell.grain, cell.holon) });
  }
  return { cells, of: cells.length, relevant: cells.filter((c) => c.relevant).length, notRelevant: cells.filter((c) => !c.relevant).length, subject: t };
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
const META_COMMENTARY_RE = /\b(here's|here is|let me know if you|i'd like to|you can|would you|consider|things to consider|you'll want to|remember to|feel free|brainstorm|explanation:|note that|as an ai|i can't|i cannot|this essay instantiates|this essay is|this essay seeks|this essay aims|this essay will|this essay holds|the essay begins|the essay then|the essay concludes|the essay's purpose|the essay explores|the essay delves|the essay argues|this essay cuts|this essay on|this account will|the essay must|the essay's narrative|in this essay|this essay examines|this essay analyzes|the essay focuses)\b/i;

// EVA a single section against the DEF and the material. Returns {ok,
// failures:[{kind,detail}], strain:number} — strain 0 when clean, +1 per
// failure found (each correction the piece will need).
export function satisfactionOfSection(sectionText, { theme = "", material = "", isFirst = false, prior = "" } = {}) {
  const t = String(sectionText ?? "").trim();
  const failures = [];
  let strain = 0;
  if (t.length < 40) { failures.push({ kind: "thin", detail: "the section has almost no content" }); strain++; }
  // Meta-commentary is a SHAPE error: the model wrote ABOUT the piece instead
  // of writing it ("Here's a potential start... Explanation:... Let me know").
  if (META_COMMENTARY_RE.test(t)) { failures.push({ kind: "meta", detail: "the section describes the writing instead of being the piece" }); strain++; }
  // Grounding: does the section share content with the material? A section
  // with no overlap is fabricated, not written from the ground. The test is
  // LENGTH-AWARE: a long section's ratio is diluted by connective prose, so
  // it must also clear a floor of DISTINCT material-tokens actually used —
  // a section that names real material facts (Cameroon, Congo Basin, 200
  // pounds) is grounded even when its prose is expansive.
  if (material && material.length > 30) {
    const m = String(material).toLowerCase();
    const tokens = t.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 4);
    if (tokens.length) {
      const used = new Set(tokens.filter((w) => m.includes(w)));
      const ratio = used.size / tokens.length;
      const distinct = used.size;
      if (ratio < 0.08 && distinct < 5) {
        failures.push({ kind: "ungrounded", detail: `the section shares almost nothing with the material (${distinct} material words of ${tokens.length}) — it is not written from the ground` });
        strain++;
      }
    }
  }
  // Continuity: does the section merely RESTATE the preceding one? An essay
  // composes — each section builds on what came before, never re-explains it
  // from scratch. High overlap with the immediate prior section (beyond a
  // connective phrase) means it restarted instead of continuing.
  if (prior && String(prior).trim().length > 60) {
    const p = String(prior).toLowerCase();
    const tokens = t.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 4);
    if (tokens.length) {
      const shared = tokens.filter((w) => p.includes(w)).length / tokens.length;
      // The prior's OWN tokens, so a section full of connective scaffolding
      // ("the essay", "the piece", "the material") is not counted as overlap.
      const priorTokens = new Set(p.split(/[^a-z']+/).filter((w) => w.length > 4));
      const real = tokens.filter((w) => priorTokens.has(w)).length / tokens.length;
      if (real >= 0.7) { failures.push({ kind: "repetition", detail: `the section restates the previous one (${Math.round(real * 100)}% of its content-tokens already appeared) — it should build on, not repeat` }); strain++; }
    }
  }
  return { ok: failures.length === 0, failures, strain };
}

// ── FISHER'S NULL TEST FOR REPETITION ──────────────────────────────────────
// Handle: Fisher — after Ronald Fisher's permutation test: a figure is a
// placement against a null built by shuffling, or it is refused. Repetition
// is only REAL when the openings recur more than a shuffled baseline would
// — five paragraphs opening "The bongo antelope, scientifically classified
// as..." is repetition only if shuffling the openings would not produce the
// same recurrences by chance. `detectRepetition` measures the sentence/
// paragraph OPENINGS across the essay, compares the recurrence count to a
// null built by shuffling the openings, and reports the openings that recur
// above chance (p < 0.05 by permutation). This is the DETECTOR; Murch flags
// its findings, Oliveros varies them.
export function detectRepetition(documentLines = [], { shuffles = 400, pValue = 0.05 } = {}) {
  const openings = (documentLines ?? [])
    .map((l) => String(l ?? "").trim())
    .filter((l) => l.length > 20)
    .map((l) => {
      const words = l.split(/\s+/);
      const start = words.slice(0, 14).map((w) => w.toLowerCase().replace(/[^a-z']/g, ""));
      return { full: l, words: start };
    });
  if (openings.length < 2) return { repeated: [], p: 1, n: openings.length, basis: "fewer than two sections — nothing to test" };
  // The observed statistic: the LONGEST shared leading-word prefix across any
  // pair of openings. "The bongo antelope, scientifically classified as
  // Tragelaphus eurycerus" = 8+ shared words; a varied essay shares 1-2.
  const maxSharedPrefix = (list) => {
    let best = 0;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i].words, b = list[j].words;
        const min = Math.min(a.length, b.length);
        let shared = 0;
        for (let k = 0; k < min; k++) if (a[k] === b[k]) shared++; else break;
        if (shared > best) best = shared;
      }
    }
    return best;
  };
  const observed = maxSharedPrefix(openings);
  // THE NULL (Fisher): each opening's words are SHUFFLED WITHIN itself — the
  // word-distribution is kept, but the ORDER is destroyed. A long leading
  // prefix is real repetition only if it exceeds what word-order-scramble
  // would produce by chance. This is the honest null: order matters.
  let above = 0;
  for (let s = 0; s < shuffles; s++) {
    const scrambled = openings.map((o) => ({ ...o, words: [...o.words].sort(() => Math.random() - 0.5) }));
    if (maxSharedPrefix(scrambled) >= observed) above++;
  }
  const p = (above + 1) / (shuffles + 1); // +1: the observed is itself a draw
  const repeated = p < pValue ? openings
    .filter((o) => {
      const prefix = o.words.slice(0, 3).join(" ");
      return openings.some((x) => x !== o && x.words.slice(0, 3).join(" ") === prefix);
    })
    .map((o) => o.full) : [];
  return {
    p: Number(p.toFixed(3)),
    repeated,
    n: openings.length,
    observed,
    significant: p < pValue,
    basis: p < pValue
      ? `Fisher: the longest shared opening-prefix is ${observed} words — word-order scramble gives that ${(p * 100).toFixed(0)}% of the time (p=${p.toFixed(3)}), so the openings repeat, not by chance`
      : `Fisher: the longest shared opening-prefix is ${observed} words — word-order scramble gives that ${(p * 100).toFixed(0)}% of the time (p=${p.toFixed(3)}), within chance`,
  };
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

// ── THE HOLOGRAPHIC CHECK: the essay is folded at the SAME points the
//    material was folded, and the fold-points are compared. ────────────────
// The material was folded through the reader into a referent index; the essay
// is folded through THAT SAME index (`resolveIn`). A section that names the
// material's own beings (Tragelaphus, the Congo Basin, the coat's stripes)
// resolves to real material referents — it is grounded IN THE RECORD, with
// the beings' byte-addressed spans riding the finding (P5.2, 54a5622). A
// section that names a being the material never folded ("Diceros bicornis
// longipes" for the bongo) resolves to NOTHING — it is a fabrication, typed
// `unresolved`, never a guess. This is the answer checked holographically:
// fold the essay, compare the fold-points, the record is the ground.
// `index` is the material's referent index (readingIndexFromLog's resolveIn).
// Returns {ok, failures:[{kind,detail,sectionIndex,resolved,unresolved}], fold}.
export function holographicSatisfaction(documentLines = [], sections = [], { index = null } = {}) {
  const failures = [];
  const fold = [];
  const resolveIn = (text) => {
    try {
      const r = index?.resolveIn?.(String(text ?? ""));
      return r instanceof Set ? r : new Set(r ?? []);
    } catch { return new Set(); }
  };
  const represent = (id) => { try { return index?.represent?.(id) ?? id; } catch { return id; } };
  const materialIds = new Set([...(index?.referents?.keys?.() ?? [])]);
  for (let i = 0; i < documentLines.length; i++) {
    const text = String(documentLines[i] ?? "");
    const resolved = resolveIn(text);
    const inMaterial = [...resolved].filter((id) => materialIds.has(id));
    const resolvedNames = [...new Set([...inMaterial].map(represent))].filter(Boolean);
    fold.push({ sectionIndex: i, theme: sections[i] ?? "", resolved: resolvedNames });
    if (!text.trim()) {
      failures.push({ kind: "thin", sectionIndex: i, detail: "the section has no content" });
      continue;
    }
    // A section must resolve to at least ONE material being to be grounded.
    // If it resolves to none, it is folded against an empty fold-point: the
    // essay invented beings the material never carried (measured: the model
    // wrote "Diceros bicornis longipes" — a black rhino — for the bongo; the
    // holographic fold resolves it to nothing and names the fabrication).
    if (!inMaterial.length) {
      failures.push({ kind: "unresolved", sectionIndex: i, detail: `the section folds to no material referent — it is not written from the record (resolved: ${resolvedNames.join(", ") || "none"})` });
    }
  }
  const ok = failures.length === 0;
  return { ok, filled: documentLines.length - failures.length, of: documentLines.length, failures, totalStrain: failures.length, fold, materialCount: materialIds.size };
}

// ── LAVAR GRADES THE READING INTO EOT ─────────────────────────────────────
// LaVar's method (native/eval/lavar/golden-tool.mjs): the reading is scored
// by RECALL — how many of the material's own propositions the reading
// re-states, matched on label + end2 (never prose). Here the essay is the
// reading, the material's EOT fold (its graph entries) is the golden, and
// each essay section is graded as a set of EOT propositions: does it carry
// the material's claims (label + end2 recall), resolved through the referent
// index? This is "LaVar grades our reading into EOT" — the essay is scored
// against what the material actually holds, never against how it is phrased.
// `materialPropositions` are the material's own {label, end2, end1} claims
// (the reader's graph entries); `index` resolves the essay's words to them.
export function lavarGradeEssay(documentLines = [], sections = [], { materialPropositions = [], index = null } = {}) {
  const failures = [];
  const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
  const props = (materialPropositions ?? []).filter((p) => p && norm(p.label));
  // The essay's claims: fold each section through the material's referent
  // index, and match its label+end2 against the material's own propositions.
  const resolveIn = (text) => {
    try {
      const r = index?.resolveIn?.(String(text ?? ""));
      return r instanceof Set ? r : new Set(r ?? []);
    } catch { return new Set(); }
  };
  const represent = (id) => { try { return index?.represent?.(id) ?? id; } catch { return id; } };
  let covered = 0;
  const coveredKeys = new Set();
  const perSection = [];
  for (let i = 0; i < documentLines.length; i++) {
    const text = String(documentLines[i] ?? "");
    const resolved = resolveIn(text);
    const names = [...resolved].map(represent).map(norm).filter(Boolean);
    // A section is grounded if it resolves to at least one material being.
    if (!resolved.size && text.trim()) {
      failures.push({ kind: "unresolved", sectionIndex: i, detail: `section ${i + 1} folds to no material referent — LaVar cannot grade prose the record does not carry` });
    }
    // Recall: does the section re-state the material's propositions?
    let sectionCovered = 0;
    for (const p of props) {
      const lab = norm(p.label);
      if (!lab || coveredKeys.has(lab)) continue;
      const e2 = norm(p.end2);
      // The section carries the proposition's act (label) and (when named)
      // its object — the same recall golden-tool.mjs scores on.
      const textLower = text.toLowerCase();
      const labHit = lab.length > 2 && textLower.includes(lab);
      const e2Hit = !e2 || e2.length <= 2 || textLower.includes(e2) || names.some((n) => n && (e2.includes(n) || n.includes(e2)));
      if (labHit && e2Hit) { coveredKeys.add(lab); covered++; sectionCovered++; }
    }
    perSection.push({ sectionIndex: i, carried: sectionCovered });
  }
  const recall = props.length ? covered / props.length : 0;
  // LaVar's grade is the recall: how much of the material's own EOT fold the
  // essay re-states. A section that fails to resolve is a fabrication; the
  // recall score is the honest grade — a 0-recall essay is not a reading.
  return {
    ok: failures.length === 0 && recall >= 0.5,
    filled: documentLines.length - failures.length,
    of: documentLines.length,
    failures,
    totalStrain: failures.length + (recall < 0.5 ? 1 : 0),
    recall: Number(recall.toFixed(3)),
    covered,
    ofPropositions: props.length,
    basis: props.length ? `LaVar: the essay re-states ${covered} of the material's ${props.length} EOT propositions (${(recall * 100).toFixed(0)}% recall)` : "LaVar: the material carried no propositions to grade against",
    perSection,
  };
}

// ── COMPETENCY: the essay reduces the surprise of its own thesis ───────────
// The user's principle: an essay opens with a surprising, assertive claim
// ("the Titanic was sunk through capitalistic hubris") and its competency is
// how well the retrieved GROUNDED evidence retroactively reduces that
// surprise. Competency is NOT how much the essay re-states the material
// (LaVar recall) and NOT length — it is the surprise-reduction: the opening
// thesis creates an expectation gap; the body's grounded evidence closes it
// by explaining the why. Measured here:
//   thesisSurprise — how many of the material's propositions the opening
//     asserts AGAINST (its claim moves the reading's expectations): the
//     opening is surprising when its specific nouns/acts are NOT what the
//     material's ordinary account would state first.
//   evidenceGrounding — how many distinct material propositions the body
//     carries that bear on the thesis's own terms (the why behind the claim).
//   surpriseReduction — the ratio: the body's grounded evidence relative to
//     the thesis's surprise. An essay whose thesis is surprising but whose
//     body carries no grounding for it is INCOMPETENT (a claim with no why).
// `opening` is the first section's text; `body` the rest. `index` resolves
// both against the material's referents. Returns a grade in [0,1].
export function competencyGrade({ opening = "", body = [], materialPropositions = [], index = null } = {}) {
  const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
  const props = (materialPropositions ?? []).filter((p) => p && norm(p.label));
  const resolveIn = (text) => {
    try {
      const r = index?.resolveIn?.(String(text ?? ""));
      return r instanceof Set ? r : new Set(r ?? []);
    } catch { return new Set(); }
  };
  const represent = (id) => { try { return index?.represent?.(id) ?? id; } catch { return id; } };
  // The thesis's own terms: the material referents the opening asserts, and
  // the content words it uses (a surprising claim uses unexpected terms).
  const thesisIds = resolveIn(opening);
  const thesisNames = [...thesisIds].map(represent).map(norm).filter(Boolean);
  const thesisWords = new Set(norm(opening).split(/[^a-z']+/).filter((w) => w.length > 4));
  // Surprise: the opening asserts a claim that moves the material's ordinary
  // account — its content words are NOT the material's most-repeated terms.
  // Measured as the fraction of the thesis's words that are NOT in any of the
  // material's propositions (unexpected vocabulary = a surprising claim).
  const materialWords = new Set();
  for (const p of props) { for (const w of norm(`${p.end1} ${p.label} ${p.end2}`).split(/[^a-z']+/)) if (w.length > 4) materialWords.add(w); }
  const surprisingWords = [...thesisWords].filter((w) => !materialWords.has(w));
  const thesisSurprise = thesisWords.size ? surprisingWords.length / thesisWords.size : 0;
  // Evidence grounding: how many of the material's propositions the body
  // actually carries (the why behind the thesis's terms).
  const bodyText = norm((body ?? []).join(" "));
  let evidenceCarried = 0;
  for (const p of props) {
    const lab = norm(p.label); if (!lab) continue;
    const e2 = norm(p.end2);
    const labHit = lab.length > 2 && bodyText.includes(lab);
    const e2Hit = !e2 || e2.length <= 2 || bodyText.includes(e2);
    if (labHit && e2Hit) evidenceCarried++;
  }
  const evidenceGrounding = props.length ? evidenceCarried / props.length : 0;
  // SURPRISE-REDUCTION: the body's grounded evidence relative to the thesis's
  // surprise. A surprising thesis (high thesisSurprise) needs grounding to
  // reduce it; an unsurprising thesis needs none. The essay is competent when
  // it explains the why — evidenceGrounding covering the thesis's surprise.
  // When the thesis asserts nothing surprising, the bar is simply that the
  // body carries the material (the essay is a description, not an argument).
  const surpriseReduction = thesisSurprise > 0.2
    ? Math.min(1, evidenceGrounding / thesisSurprise)
    : evidenceGrounding;
  return {
    ok: surpriseReduction >= 0.5,
    grade: Number(surpriseReduction.toFixed(3)),
    thesisSurprise: Number(thesisSurprise.toFixed(3)),
    evidenceGrounding: Number(evidenceGrounding.toFixed(3)),
    surprisingWords: surprisingWords.slice(0, 6),
    evidenceCarried,
    ofPropositions: props.length,
    basis: thesisSurprise > 0.2
      ? `the thesis is surprising (${surprisingWords.length} unexpected terms); the body carries ${evidenceCarried} of ${props.length} material propositions — ${(surpriseReduction * 100).toFixed(0)}% surprise-reduction`
      : `the opening is descriptive (${surprisingWords.length} unexpected terms); the body carries ${evidenceCarried} of ${props.length} material propositions — ${(surpriseReduction * 100).toFixed(0)}% grounded`,
  };
}

// ── KELSEN: THE PRIMARY MODALITY — the essay's claims resolve by the norm
//    hierarchy, and the RESOLUTION IS SHOWN (teaching). ────────────────────
// Kelsen's order (regime.js precedence): validity window first, then
// specificity (lex specialis), then force, then recency (lex posterior),
// then entrenchment — never a silent pick. The essay's propositions are
// graded through this: when two claims the essay carries conflict, the
// order names a winner and WHY. The default mode is HYPER-GROUNDED — every
// claim is a norm in a hierarchy, and the essay teaches the reader the
// order by showing each resolution: "claim A prevails because claim B is
// out of its validity window (lex specialis: the specific beats the
// general; lex posterior: the later enactment beats the earlier)."
// `propositions` are the essay's claims (the material's EOT entries it
// carries); `index` resolves them; `precedence` and `tagClaim` are the
// regime organs, injected. Returns {ok, resolutions, conflicts, basis}.
export function kelsenGrade({ propositions = [], index = null, precedence = null, tagClaim = null, queryTime = Date.now() } = {}) {
  if (typeof precedence !== "function") {
    return { ok: true, resolutions: [], conflicts: [], basis: "no precedence organ injected — the Kelsen grade is declared, not measured (the regime organ lives in organs/regime.js)" };
  }
  const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
  const props = (propositions ?? []).filter((p) => p && norm(p.label));
  const resolveIn = (text) => {
    try {
      const r = index?.resolveIn?.(String(text ?? ""));
      return r instanceof Set ? r : new Set(r ?? []);
    } catch { return new Set(); }
  };
  const represent = (id) => { try { return index?.represent?.(id) ?? id; } catch { return id; } };
  // Group the essay's claims by their SUBJECT (the referent they resolve to),
  // then resolve conflicts WITHIN each subject's claim-set through Kelsen.
  const bySubject = new Map();
  for (const p of props) {
    const ids = resolveIn(`${p.end1 ?? ""} ${p.label ?? ""} ${p.end2 ?? ""}`);
    const subject = ids.size ? [...ids].map(represent).join(", ") : norm(p.end1 ?? "?");
    if (!bySubject.has(subject)) bySubject.set(subject, []);
    bySubject.get(subject).push(p);
  }
  const resolutions = [];
  let conflicts = 0;
  for (const [subject, claims] of bySubject) {
    if (claims.length < 2) continue; // a single claim on a subject has nothing to resolve
    // Tag each claim (default force/validity, different enactedAt per claim
    // index so lex posterior is exercised) and pairwise resolve.
    for (let i = 0; i < claims.length; i++) {
      for (let j = i + 1; j < claims.length; j++) {
        const a = claims[i], b = claims[j];
        // A CONFLICT is same relation, different object — a functional
        // relation with two fillers ("is nocturnal" vs "is diurnal"), the
        // Lincoln vice-president case. Two claims about the same subject
        // with DIFFERENT relations are complementary facts, not a conflict
        // ("is nocturnal" + "found in Kenya" both hold — no resolution
        // needed). A genuine Kelsen conflict is the functional clash.
        const sameAct = norm(a.label) === norm(b.label);
        const sameObject = norm(a.end2) === norm(b.end2);
        if (!sameAct || sameObject) continue; // not a functional clash — no conflict
        let aTag = null, bTag = null;
        if (typeof tagClaim === "function") {
          try { aTag = tagClaim(a, { operator: "CON", enactedAt: i, queryTime }); } catch { aTag = null; }
          try { bTag = tagClaim(b, { operator: "CON", enactedAt: j, queryTime }); } catch { bTag = null; }
        }
        if (!aTag || !bTag) continue;
        try {
          const r = precedence({ tag: aTag, grain: "Figure" }, { tag: bTag, grain: "Figure" }, { queryTime });
          conflicts++;
          // THE TEACHING SURFACE: name the resolution, never hide it. The
          // reader sees why one claim prevails under the norm hierarchy.
          resolutions.push({
            subject,
            a: `${a.end1 ?? ""} ${a.label} ${a.end2 ?? ""}`.trim(),
            b: `${b.end1 ?? ""} ${b.label} ${b.end2 ?? ""}`.trim(),
            winner: r.winner === "a" ? "a" : r.winner === "b" ? "b" : null,
            reason: r.reason ?? null,
            why: r.reason === "validity_window"
              ? `${r.winner === "a" ? a.end1 : b.end1} prevails: the other claim is out of its validity window — validity is checked before force or specificity is ever consulted`
              : r.reason === "specificity"
                ? `${r.winner === "a" ? a.end1 : b.end1} prevails: lex specialis — the more specific claim beats the general`
                : r.reason === "force"
                  ? `${r.winner === "a" ? a.end1 : b.end1} prevails on force — the higher-ranked norm binds`
                  : r.reason === "recency"
                    ? `${r.winner === "a" ? a.end1 : b.end1} prevails: lex posterior — the later enactment beats the earlier`
                    : r.reason === "entrenchment"
                      ? `${r.winner === "a" ? a.end1 : b.end1} prevails on entrenchment — the deeper grain binds`
                      : r.reason === "tied" ? "tied: same force, same grain, no decisive recency — a declared tiebreak is needed, never guessed" : r.detail ?? null,
          });
        } catch { /* an unresolved pair is not graded — never a guess */ }
      }
    }
  }
  return {
    ok: conflicts > 0 ? resolutions.every((r) => r.winner) : true,
    conflicts,
    resolved: resolutions.filter((r) => r.winner).length,
    tied: resolutions.filter((r) => !r.winner).length,
    resolutions,
    basis: conflicts ? `Kelsen resolved ${resolutions.filter((r) => r.winner).length} of ${conflicts} conflicts among the essay's claims — each resolution named` : "Kelsen: no conflicting claims among the essay's propositions — nothing to resolve",
  };
}

// ── REC: a rewrite pass names exactly what the EVA found, and the ledger
//    records the revision (supersede) so the before/after stays on file. ────

// ── LAVAR TELLS US IF WE ARE READING WELL ──────────────────────────────────
// The user's standing: LaVar should tell us if we are reading well, and be
// adapted as needed to help trigger "looking". This grade answers the first
// half on a single source: did the reader actually READ the bytes, or was
// it misreading a text whose formatting it structurally cannot see (a table,
// a column, box-drawing, sub-sentence lines)? When the reader is reading
// wrong, `shouldLook` fires — the CV/OCR "looking" pass — so the source is
// rendered and read the way a person would see it. The gate is mechanical
// (weirdFormattingScore from native/organs/look.js, injected here so this
// file stays dependency-free): a source is "not read well" when its own
// bytes carry layout the plain-text reader cannot see, or when the reading
// produced zero propositions from a source that should have had some.
export function lavarGradeReading({ source = "", text = "", propositions = [], weirdFormattingScore = null, expectedFloor = 3 } = {}) {
  const failures = [];
  const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();
  const gate = typeof weirdFormattingScore === "function" ? weirdFormattingScore(text) : null;
  const props = (propositions ?? []).filter((p) => p && norm(p.label));
  if (gate && gate.score > 0) {
    failures.push({ kind: "misread_formatting", detail: `the text's own formatting is being read wrong (${(gate.signals ?? []).join(", ")}) — should look at it` });
  }
  // A real source that produced nothing is a silent miss — the reader read
  // the bytes and heard nothing, which is as bad as a fabricated proposition
  // (the same withheld-not-convict posture: an empty read is not a reading).
  const meaningful = norm(text).split(/\s+/).filter(Boolean).length;
  if (meaningful >= 80 && props.length === 0) {
    failures.push({ kind: "silent_read", detail: "a substantial source yielded zero propositions — the reader heard nothing it could admit" });
  }
  const readingWell = failures.length === 0;
  return {
    ok: readingWell,
    readingWell,
    shouldLook: Boolean(gate && gate.score > 0),
    signals: gate?.signals ?? [],
    source,
    propositions: props.length,
    basis: readingWell
      ? "LaVar: this source was read well — its bytes yielded propositions and its formatting was not being misread"
      : `LaVar: this source was NOT read well — ${failures.map((f) => f.detail).join("; ")}`,
    failures,
  };
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
export function renderApaFootnotes(essay, webSources = new Map(), { maxFootnotes = 12, givers = [] } = {}) {
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
    if (!span || spanScore < 3) {
      // NOT GROUNDED IN A SOURCE — the sentence is the essay's OWN statement.
      // Cite its giver (the model) rather than silently dropping it or
      // passing it off as material (the user's discipline: the model stating
      // something is a giver that should be cited).
      notes.push({
        sentence,
        host: givers.find((g) => g?.role === "model")?.name ?? "the model",
        year: new Date().getFullYear(),
        url: null,
        span: null,
        spanIndex: -1,
        modelClaim: true,
      });
      continue;
    }
    // APA-ish author/year: host + year from the URL's page (no publication
    // date available to a fetch — the host is the named source, the year is
    // the retrieval year, disclosed honestly).
    let host = "Unknown";
    try { host = new URL(best).hostname.replace(/^www\./, ""); } catch {}
    const year = new Date().getFullYear();
    notes.push({ sentence, host, year, url: best, span, spanIndex: srcText.indexOf(span) });
  }
  if (!notes.length) return "";
  // Footnotes: numbered in the essay, then the block at the end. A model-
  // stated claim is disclosed as such — its giver is the model, never a
  // source that did not say it.
  const block = notes.map((n, i) => n.modelClaim
    ? `${i + 1}. (${n.host}, ${n.year}). "${n.sentence.slice(0, 160)}…" — stated by ${n.host} (the essay's own claim; no retained source states it)`
    : `${i + 1}. (${n.host}, ${n.year}). "${n.span}" — ${n.url}`).join("\n");
  return `\n\n## Footnotes\n\n${block}`;
}

// ── INLINE CITATION MARKERS: the citation is EMBEDDED in the text, not only
//    in a footnote block. Each sentence that carries a citation gets [n] right
//    after it, pointing to the footnote list — the reader sees, AT THE CLAIM,
//    that it is sourced (or stated by the model). This is the teaching
//    surface at the sentence grain: you never read a claim without seeing
//    where it comes from. `citations` is the citationLedger's output.
export function embedInlineCitations(essay, citations = []) {
  if (!citations?.length) return String(essay ?? "");
  let text = String(essay ?? "");
  // Match each citation's sentence back into the text and append [n].
  // A sentence is inserted only ONCE (the first occurrence), so a repeated
  // sentence in the essay keeps its first marker. Citations are applied in
  // order; the marker's number is the footnote index (1-based).
  const placed = new Set();
  for (let i = 0; i < citations.length; i++) {
    const c = citations[i];
    const sentence = String(c.essaySentence ?? "").trim();
    if (!sentence) continue;
    if (placed.has(sentence)) continue;
    placed.add(sentence);
    // Find the sentence in the running text — the first occurrence. Match on
    // the leading chunk (the sentence's first 40 chars) so whitespace
    // differences don't defeat the insertion.
    const lead = sentence.slice(0, 40).replace(/\s+/g, " ");
    const idx = text.indexOf(lead);
    if (idx < 0) continue;
    // Walk forward to the sentence's end (its own punctuation) — the text may
    // continue past what the ledger captured, so insert AFTER the sentence's
    // own terminator, not mid-way.
    let end = idx + lead.length;
    while (end < text.length && !/[.!?]["'”]?\s*$/.test(text.slice(Math.max(0, end - 3), end + 1)) && !/[.!?]\s/.test(text.slice(end, end + 2))) {
      end++;
    }
    if (end > text.length) end = text.length;
    text = text.slice(0, end) + ` [${i + 1}]` + text.slice(end);
  }
  return text;
}

// ── THE HTML SURFACE: citations togglable, style switchable (APA ⇄ MLA). ──
// A self-contained HTML page of the essay: the inline [n] markers are
// clickable links to the footnote list; a toolbar toggles the citations
// ON/OFF (show just the prose, or the prose with markers and footnotes) and
// switches the footnote STYLE between APA and MLA. Both styles are rendered
// from the same citation data — never two lists that drift.
// `citations` is the citationLedger output (each has essaySentence, giver,
// source{url,host}, kind, groundingText).
export function renderEssayHtml({ title = "the piece", prose = "", citations = [], thinking = "" } = {}) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  // APA: (Host, Year). "Verbatim span" — URL. MLA: Host, "Title of Page," Year, URL.
  const apa = (c, i) => {
    const host = c.giver && c.kind !== "unsupported" ? (c.source?.host ?? "source") : c.giver ?? "the model";
    const year = new Date().getFullYear();
    const span = c.groundingText ? `&ldquo;${esc(c.groundingText.slice(0, 160))}${c.groundingText.length > 160 ? "…" : ""}&rdquo;` : "";
    return c.kind === "unsupported"
      ? `<span class="model-claim">${host}, ${year}. &ldquo;${esc(c.essaySentence.slice(0, 120))}…&rdquo; — stated by ${host} (the essay's own claim; no retained source states it)</span>`
      : `(${esc(host)}, ${year}). ${span}${c.source?.url ? ` &mdash; ${esc(c.source.url)}` : ""}`;
  };
  const mla = (c, i) => {
    const host = c.giver && c.kind !== "unsupported" ? (c.source?.host ?? "Source") : c.giver ?? "the model";
    const year = new Date().getFullYear();
    const span = c.groundingText ? `&ldquo;${esc(c.groundingText.slice(0, 160))}${c.groundingText.length > 160 ? "…" : ""}&rdquo;` : "";
    return c.kind === "unsupported"
      ? `<span class="model-claim">${esc(host)}, ${year}. &ldquo;${esc(c.essaySentence.slice(0, 120))}…&rdquo; &mdash; stated by ${host} (no retained source states it)</span>`
      : `${esc(host)}, ${year}${c.source?.url ? `, ${esc(c.source.url)}` : ""}${span ? `. ${span}` : ""}.`;
  };
  const footnotesApa = citations.map((c, i) => `<li id="fn-${i + 1}">${apa(c, i)}</li>`).join("\n");
  const footnotesMla = citations.map((c, i) => `<li id="fn-mla-${i + 1}">${mla(c, i)}</li>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body { font-family: Georgia, serif; max-width: 46rem; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.7; color: #1a1a1a; }
  h1 { font-size: 1.6rem; line-height: 1.3; }
  .toolbar { position: sticky; top: 0; background: #fafafa; border-bottom: 1px solid #ddd; padding: .6rem 1.5rem; margin: -2rem -1.5rem 1.5rem; display: flex; gap: 1rem; align-items: center; font-family: sans-serif; font-size: .85rem; }
  .toolbar label { display: flex; align-items: center; gap: .35rem; }
  .prose { font-size: 1.05rem; }
  .prose p { margin: 1em 0; }
  .cite { color: #0b5; cursor: pointer; font-size: .8em; vertical-align: super; text-decoration: none; }
  .cite:hover { color: #070; }
  .fn { font-size: .9rem; color: #444; }
  .fn li { margin: .4em 0; }
  .model-claim { font-style: italic; color: #777; }
  .thinking { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: .85rem; color: #666; font-family: sans-serif; white-space: pre-wrap; }
  body.no-cites .cite { display: none; }
  body.no-cites .fn, body.no-cites .fn-block { display: none; }
  .footnotes-apa, .footnotes-mla { display: none; }
  body.style-apa .footnotes-apa { display: block; }
  body.style-mla .footnotes-mla { display: block; }
</style></head>
<body class="style-apa">
<div class="toolbar">
  <label><input type="checkbox" id="toggle-cites" checked> citations</label>
  <label>style:
    <select id="toggle-style">
      <option value="apa">APA</option>
      <option value="mla">MLA</option>
    </select>
  </label>
</div>
<h1>${esc(title)}</h1>
<div class="prose">${esc(prose).replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</div>
<h2 class="fn-block">Footnotes</h2>
<ol class="fn footnotes-apa" id="fns-apa">${footnotesApa}</ol>
<ol class="fn footnotes-mla" id="fns-mla">${footnotesMla}</ol>
${thinking ? `<div class="thinking">${esc(thinking)}</div>` : ""}
<script>
  const body = document.body;
  document.getElementById('toggle-cites').addEventListener('change', e => body.classList.toggle('no-cites', !e.target.checked));
  document.getElementById('toggle-style').addEventListener('change', e => { body.classList.toggle('style-apa', e.target.value === 'apa'); body.classList.toggle('style-mla', e.target.value === 'mla'); });
  // Make inline [n] markers clickable links to the footnote.
  document.querySelectorAll('.prose').forEach(p => { p.innerHTML = p.innerHTML.replace(/\\[(\d+)\\]/g, '<a class="cite" href="#fn-\\$1">[\\$1]</a>'); });
</script>
</body></html>`;
}

// ── THE LIVE HTML PROJECTION: the HTML is the projection, fed by the JSONL.
//    The .html shell fetches the ledger's JSONL and the citations JSON on
//    EVERY load, folds them client-side, and renders. Refreshing the page
//    re-folds the latest JSONL — the essay is never a stale .md snapshot.
//    The toolbar can hide/show citations and switch footnote style (APA ⇄
//    MLA), and EXPORT the current fold as Markdown or as JSON. The MD is an
//    export, never the default projection.
export function renderLiveEssayHtml({ docId, title = "the piece", jsonlPath, citationsPath } = {}) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  body { font-family: Georgia, serif; max-width: 46rem; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.7; color: #1a1a1a; }
  h1 { font-size: 1.6rem; line-height: 1.3; }
  .toolbar { position: sticky; top: 0; background: #fafafa; border-bottom: 1px solid #ddd; padding: .6rem 1.5rem; margin: -2rem -1.5rem 1.5rem; display: flex; gap: 1rem; align-items: center; font-family: sans-serif; font-size: .85rem; flex-wrap: wrap; }
  .toolbar label { display: flex; align-items: center; gap: .35rem; }
  .toolbar button { font-family: sans-serif; font-size: .8rem; padding: .25rem .6rem; cursor: pointer; }
  .prose { font-size: 1.05rem; }
  .prose p { margin: 1em 0; }
  .cite { color: #0b5; cursor: pointer; font-size: .8em; vertical-align: super; text-decoration: none; }
  .fn { font-size: .9rem; color: #444; }
  .fn li { margin: .4em 0; }
  .model-claim { font-style: italic; color: #777; }
  .thinking { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: .85rem; color: #666; font-family: sans-serif; white-space: pre-wrap; }
  body.no-cites .cite { display: none; }
  body.no-cites .fn, body.no-cites .fn-block { display: none; }
  .footnotes-apa, .footnotes-mla { display: none; }
  body.style-apa .footnotes-apa { display: block; }
  body.style-mla .footnotes-mla { display: block; }
  .status { font-family: sans-serif; font-size: .8rem; color: #999; }
</style></head>
<body class="style-apa">
<div class="toolbar">
  <span class="status" id="status">loading…</span>
  <label><input type="checkbox" id="toggle-cites" checked> citations</label>
  <label>style:
    <select id="toggle-style">
      <option value="apa">APA</option>
      <option value="mla">MLA</option>
    </select>
  </label>
  <button id="export-md">export .md</button>
  <button id="export-json">export .json</button>
</div>
<h1 id="essay-title">${esc(title)}</h1>
<div class="prose" id="prose">…</div>
<h2 class="fn-block">Footnotes</h2>
<ol class="fn footnotes-apa" id="fns-apa"></ol>
<ol class="fn footnotes-mla" id="fns-mla"></ol>
<div class="thinking" id="thinking" hidden></div>
<script>
  // ── THE LIVE FOLD: fetch the ledger's JSONL + citations on every load ──
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const status = document.getElementById('status');
  const prose = document.getElementById('prose');
  const fnsApa = document.getElementById('fns-apa');
  const fnsMla = document.getElementById('fns-mla');
  const thinking = document.getElementById('thinking');
  const body = document.body;
  let fold = { projection: '', citations: [], thinkingText: '' };

  async function load() {
    status.textContent = 'refreshing from the ledger…';
    try {
      // The LEDGER: append-only JSONL — the artifact. Fold client-side: the
      // parts + citations lines in address order, superseded dropped (the
      // same fold projectLedgerFile does server-side; here it runs in the
      // page so a refresh is always current).
      const ledgerRes = await fetch('${esc(jsonlPath)}');
      if (!ledgerRes.ok) throw new Error('ledger ' + ledgerRes.status);
      const ledgerText = await ledgerRes.text();
      const lines = ledgerText.split('\\n').map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const superseded = new Set(lines.filter(l => l.supersedes).map(l => l.supersedes));
      const alive = lines.filter(l => !superseded.has(l.id));
      // THE PROSE IS THE PARTS ONLY — the citations-role lines carry the
      // footnote BLOCK, which the page renders separately from the structured
      // citations.json. Folding citations into the prose AND rendering the
      // footnote list from citations.json would show every footnote TWICE.
      const proseLines = alive.filter(l => l.role === 'part');
      let projection = proseLines.map(l => l.text ?? '').join('\\n\\n');
      const thinkingText = alive.filter(l => l.role === 'thinking' || l.role === 'plan').map(l => l.text ?? '').join('\\n\\n');
      // The CITATIONS: the structured ledger (the holograph pointer).
      let citations = [];
      try {
        const cRes = await fetch('${esc(citationsPath)}');
        if (cRes.ok) { const cj = await cRes.json(); citations = cj.citations ?? []; }
      } catch { citations = []; }
      // INLINE MARKERS, applied CLIENT-SIDE: each citation's essaySentence is
      // found in the folded prose and [n] is appended after it — the markers
      // are computed here (never duplicated, never stored twice).
      citations.forEach((c, i) => {
        const sentence = String(c.essaySentence ?? '').trim();
        if (!sentence) return;
        const lead = sentence.slice(0, 40).replace(/\\s+/g, ' ');
        const idx = projection.indexOf(lead);
        if (idx < 0) return;
        let end = idx + lead.length;
        while (end < projection.length && !/[.!?]["'”]?\\s*$/.test(projection.slice(Math.max(0, end - 3), end + 1)) && !/[.!?]\\s/.test(projection.slice(end, end + 2))) end++;
        if (end > projection.length) end = projection.length;
        projection = projection.slice(0, end) + ' [' + (i + 1) + ']' + projection.slice(end);
      });
      fold = { projection, citations, thinkingText };
      render();
      status.textContent = 'live — ' + alive.length + ' ledger line(s), ' + citations.length + ' citation(s)';
    } catch (err) {
      status.textContent = 'error: ' + err.message;
    }
  }

  function apa(c, i) {
    const host = c.giver && c.kind !== 'unsupported' ? (c.source?.host ?? 'source') : c.giver ?? 'the model';
    const year = new Date().getFullYear();
    const span = c.groundingText ? '\\u201c' + esc(c.groundingText.slice(0, 160)) + (c.groundingText.length > 160 ? '…' : '') + '\\u201d' : '';
    return c.kind === 'unsupported'
      ? '<span class="model-claim">' + esc(host) + ', ' + year + '. \\u201c' + esc(c.essaySentence.slice(0, 120)) + '…\\u201d — stated by ' + esc(host) + ' (the essay\\'s own claim; no retained source states it)</span>'
      : '(' + esc(host) + ', ' + year + '). ' + span + (c.source?.url ? ' — ' + esc(c.source.url) : '');
  }
  function mla(c, i) {
    const host = c.giver && c.kind !== 'unsupported' ? (c.source?.host ?? 'Source') : c.giver ?? 'the model';
    const year = new Date().getFullYear();
    const span = c.groundingText ? '\\u201c' + esc(c.groundingText.slice(0, 160)) + (c.groundingText.length > 160 ? '…' : '') + '\\u201d' : '';
    return c.kind === 'unsupported'
      ? '<span class="model-claim">' + esc(host) + ', ' + year + '. \\u201c' + esc(c.essaySentence.slice(0, 120)) + '…\\u201d — stated by ' + esc(host) + ' (no retained source states it)</span>'
      : esc(host) + ', ' + year + (c.source?.url ? ', ' + esc(c.source.url) : '') + (span ? '. ' + span : '') + '.';
  }
  function render() {
    // Inline [n] markers -> clickable links to the footnote.
    let html = esc(fold.projection).replace(/\\n\\n+/g, '</p><p>').replace(/\\n/g, '<br>');
    html = html.replace(/\\[(\\d+)\\]/g, '<a class="cite" href="#fn-\\$1">[\\$1]</a>');
    prose.innerHTML = '<p>' + html + '</p>';
    fnsApa.innerHTML = fold.citations.map((c, i) => '<li id="fn-' + (i + 1) + '">' + apa(c, i) + '</li>').join('\\n');
    fnsMla.innerHTML = fold.citations.map((c, i) => '<li id="fn-mla-' + (i + 1) + '">' + mla(c, i) + '</li>').join('\\n');
    if (fold.thinkingText) { thinking.hidden = false; thinking.textContent = fold.thinkingText; }
  }

  // ── EXPORT: the current fold as Markdown or as JSON ──
  function download(name, text, mime) {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    URL.revokeObjectURL(a.href);
  }
  document.getElementById('export-md').addEventListener('click', () => {
    const proseText = fold.projection;
    const fnBlock = fold.citations.length
      ? '\\n\\n## Footnotes\\n\\n' + fold.citations.map((c, i) => (i + 1) + '. ' + apa(c, i).replace(/<[^>]+>/g, '')).join('\\n')
      : '';
    download('${docId}'.replace(/[^a-z0-9_-]/gi, '_') + '.md', esc(proseText).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') + fnBlock, 'text/markdown');
  });
  document.getElementById('export-json').addEventListener('click', () => {
    download('${docId}'.replace(/[^a-z0-9_-]/gi, '_') + '.json', JSON.stringify(fold, null, 2), 'application/json');
  });
  document.getElementById('toggle-cites').addEventListener('change', e => body.classList.toggle('no-cites', !e.target.checked));
  document.getElementById('toggle-style').addEventListener('change', e => { body.classList.toggle('style-apa', e.target.value === 'apa'); body.classList.toggle('style-mla', e.target.value === 'mla'); });
  load();
</script>
</body></html>`;
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
export function citationLedger(essay, webSources = new Map(), { maxCitations = 20, givers = [] } = {}) {
  if (!webSources.size) return { citations: [], of: 0, verbatim: 0, company: 0, unsupported: 0, basis: "no retained sources to cite against", givers };
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
    // The claim's ATOMS: numbers (incl. years) and real NAMES (capitalized
    // words that are not sentence-initial function words — "They", "Though",
    // "One", "This" are positions, not atoms; a name is a proper noun).
    const atoms = [];
    const numRe = /\b(?:\d[\d.,]*(?:[mkg]?m|k?g|%|ft|in|m|km|mph)?|1[5-9]\d\d|20\d\d)\b/g;
    let nm;
    while ((nm = numRe.exec(sentence))) atoms.push({ kind: /^1[5-9]\d\d$|^20\d\d$/.test(nm[0]) ? "year" : "number", value: nm[0] });
    const nameRe = /\b[A-Z][a-z]{2,}\b/g;
    const SENTENCE_HEAD = /\b(?:The|A|An|This|These|Those|Their|They|Though|One|Two|He|She|It|His|Her|Its|While|Because|However|Therefore|Moreover|Additionally|Finally|Some|Most|Many|Dolphins)\b/;
    const nameSeen = new Set();
    while ((nm = nameRe.exec(sentence))) {
      const value = nm[0];
      if (SENTENCE_HEAD.test(value)) continue;
      if (nameSeen.has(value)) continue;
      nameSeen.add(value);
      atoms.push({ kind: "name", value });
    }
    // Best source by token overlap (the claim's words against the source).
    let best = null, bestScore = 0;
    for (const [url, text] of webSources.entries()) {
      if (!text) continue;
      const src = text.toLowerCase();
      const hits = terms.filter((t) => src.includes(t)).length;
      if (hits > bestScore) { bestScore = hits; best = url; }
    }
    if (!best || bestScore < 3) {
      // UNSOURCED = THE MODEL'S CLAIM, never a nameless guess. The model
      // stated it; the model is the giver, and the citation says so (the
      // user's discipline: the model stating something is a giver that
      // should be cited — and priors that steered are cited too).
      citations.push({
        essaySentence: sentence,
        source: null,
        kind: "unsupported",
        giver: givers.find((g) => g?.role === "model")?.name ?? "the model",
        priors: givers.filter((g) => g?.role === "prior").map((g) => g.name),
        atoms: [],
        basis: "no source shares enough of the claim's words — this is the essay's own statement, cited to its giver (the model) rather than passed off as material",
      });
      continue;
    }
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
    // THE GROUNDING TEXT: the verbatim source sentence(s) that actually
    // contain the supported atoms — what the source SAYS, not just where the
    // atoms sit. A citation must show the words that ground the claim, so a
    // reader (or a check) sees the source's own sentence the claim stands on.
    // Falls back to the span for verbatim borrows. For claims with no
    // numeric/name atoms, match on the claim's own content words instead.
    const groundingSentences = [];
    const srcSentencesFlat = srcSentences.map((ss) => cleanSpan(ss));
    const groundByAtom = (needle) => srcSentencesFlat.find((ss) => ss.toLowerCase().includes(needle));
    for (const atom of supportedAtoms) {
      const needle = atom.value.toLowerCase();
      const srcSentence = groundByAtom(needle);
      if (srcSentence && !groundingSentences.includes(srcSentence)) groundingSentences.push(srcSentence);
    }
    if (!groundingSentences.length) {
      // No atoms found a home — try the claim's distinctive content words
      // (the non-generic terms that make this claim about THIS thing).
      const distinctive = cw.filter((w) => w.length > 4).sort((a, b) => b.length - a.length);
      for (const word of distinctive) {
        const srcSentence = groundByAtom(word);
        if (srcSentence && !groundingSentences.includes(srcSentence)) groundingSentences.push(srcSentence);
        if (groundingSentences.length >= 2) break;
      }
    }
    const groundingText = verbatim && span ? span : groundingSentences[0] ?? null;
    // Grade the borrow: verbatim span > company-supported (a source sentence
    // grounds the claim's words, with atoms byte-addressed where they exist)
    // > unsupported (nothing grounds it). A claim with no numeric/name atoms
    // but a grounding sentence is still company — the source's own words are
    // the evidence, not only the atoms.
    const allSupported = atomSpans.length === 0 ? groundingSentences.length > 0 : supportedAtoms.length === atomSpans.length;
    const kind = verbatim ? "verbatim" : allSupported && groundingText ? "company" : "unsupported";
    citations.push({
      essaySentence: sentence,
      source: { url: best, host },
      // THE GIVER: the source states the claim; the source is the giver
      // (cited, byte-addressed). Priors that steered the composition are
      // cited too — a prior's steer is a provenance, never invisible.
      giver: host,
      priors: givers.filter((g) => g?.role === "prior").map((g) => g.name),
      // The VERBATIM WORDS that ground this claim — never an address alone.
      groundingText,
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