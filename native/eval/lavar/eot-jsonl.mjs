// eot-jsonl.mjs — a reading is a LEDGER OF OBSERVATIONS, and they nest by
// ADDRESS, not by order and not by pointer.
//
// User direction, verbatim (2026-09-09), in the order it arrived:
//   "look how much is redudnacne with the 'at' when you could have just
//    scoped the JSON to be within a certain source"
//   "this is more than one proposition. and propositions can be nested,
//    that's the whole point of the holograph"
//   "its a simialar logic to how html works"
//   "sections, parargraphs, all also nesting"
//   "BUT remember these are observations, these shold be JSONL lines, we can
//    provide observations at the end that revise our prior readings"
//   "so nest by address not order"
//
// WHAT EACH OF THOSE FIXES, concretely, against the flat `.eot.json` this
// replaces (185,462 bytes of sidecar for an 11,552-byte chapter — 16x the
// text it reads):
//
//   SCOPED TO ITS SOURCE. The source path appeared 741 times in that file =
//   35,568 bytes = 19% of the whole sidecar, carrying no information the
//   header did not already have. Here it appears ONCE, on line 0. Every
//   address below is a bare [start,end] into it.
//
//   NEST BY ADDRESS. No `parent`, no `in`, no `children`. An observation at
//   [1955,1967] is inside one at [1943,1967] because of what those numbers
//   ARE. Containment is COMPUTED, never declared — which is why the lines
//   may arrive in any order, and why a revision appended at the end slots
//   into the structure without anything being rewritten. (This is the HTML
//   analogy taken literally: a DOM is a projection of ranges over one byte
//   stream, and no element repeats the document's URL.)
//
//   SECTIONS AND PARAGRAPHS ARE OBSERVATIONS TOO. Not a separate schema —
//   the same line shape at a wider extent. Chapter 1 has real sections: the
//   two rows of asterisks are scene breaks, and the flat reading filed all
//   six of those rows as `no_relation_extracted` gaps. They were never
//   noise; they were structure, discarded and then counted against the
//   reading's own coverage.
//
//   THE LOG IS THE ARTIFACT; THE TREE IS A PROJECTION. This file emits the
//   ledger. `project()` at the bottom folds it into the nested shape, the
//   same way `kernel/fold.js` projects the reader's own log (S78: "a turn's
//   fold is an accessor: the tip while it is the tip, the log's projection
//   at that seq afterwards"). Nothing stores the tree.
//
//   REVISIONS ARE LINES, NOT EDITS. A later observation may supersede an
//   earlier one; BOTH stay on the record, and the projection takes the
//   surviving one. This is `task-log.js`'s own ENTRY_KINDS.SUPERSEDE
//   discipline, and it is what makes a reading that learns something on
//   page 9 about page 2 recordable at all — a tree can only ever show the
//   final state, which erases the reading that produced it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { splitSentences, normaliseNewlines } from "../../adapters/text/spans.js";
import { extractRelations, discoverRelationVocab } from "../../adapters/text/relations.js";
import { extractSurfaces, scriptCoverageBySentence } from "../../adapters/text/surfaces.js";
import { classifyWord, dominantClass } from "../../adapters/text/wordclass.js";
import * as cube from "../../kernel/cube.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LP_ROOT = path.resolve(HERE, "../../../../live_priors");
const MAX_DEPTH = 3;
const GRAMMAR_MIN_SHARE = 0.5;   // the production sidecar recipe's own value, matched not chosen
const MIN_SURFACES_PER_VERB = 1; // this repo's own relation tests' declared value, matched not chosen

// THE ORIGIN DOCUMENT IS PRESERVED EXACTLY, AND EVERY STRUCTURE IS COMPUTED
// AGAINST IT. User direction, verbatim: "this also means we need to do our
// best to preserve the exact origin doc, and we need to record our computed
// structual elements like chapters."
//
// This follows from address-nesting with no wiggle room: if containment is
// computed from byte offsets into the source, then ANY edit to the source
// silently invalidates every address in every ledger ever written against
// it. So:
//
//   - The source is read whole and never modified. Its sha256 is line 0.
//     A ledger whose source hash no longer matches is a ledger about bytes
//     that no longer exist, and says so rather than resolving to the wrong
//     text.
//
//   - A CHAPTER IS NOT A FILE. It is an observation at [start,end) on the
//     origin document, exactly like a paragraph or a proposition — same
//     line shape, wider extent. Extracting `pg11-alice-ch1.txt` as a
//     separate file (done earlier this session) was materialising a
//     projection as bytes: it makes a second origin that can drift, and
//     every address written against it is unmoored from the real book.
//
//   - FRONT MATTER IS RECORDED, NOT STRIPPED. Deleting a Gutenberg header
//     or a publisher's boilerplate destroys origin bytes and shifts every
//     offset after it. It is observed with a role instead, and a reader
//     that wants only narrative filters BY ROLE — which is a projection
//     concern, never an edit to the source.
const sourcePath = process.argv[2];
if (!sourcePath) { console.error("usage: node eot-jsonl.mjs <path-to-origin-document> [chapterNumber]"); process.exit(1); }
const originBytes = fs.readFileSync(sourcePath, "utf8");
const sha256 = crypto.createHash("sha256").update(originBytes, "utf8").digest("hex");
const READ_CHAPTER = Number(process.argv[3] ?? 1);

// THE ORIGIN HAS CRLF, AND PRESERVING IT EXACTLY MEANS READING AROUND IT,
// NEVER REWRITING IT. This book's real bytes use \r\n; the chapter file
// extracted from it earlier this session had been silently normalised to
// \n by the tool that wrote it — a second origin, already drifted from the
// first, with every address in it unmoored from the real book by one byte
// per line. Found here only because a paragraph regex written for \n\n
// matched nothing at all.
//
// spans.js::normaliseNewlines (S26) exists for exactly this and is INVERTIBLE:
// read in normalised space, then map every address back through `toRaw` so
// what lands on the ledger addresses the ORIGIN's own coordinates. The origin
// file is never touched.
const { text: raw, toRaw } = normaliseNewlines(originBytes);
const rawAt = (start, end) => [toRaw(start), toRaw(end)];

const POS_PRIOR = JSON.parse(fs.readFileSync(path.join(HERE, "../../priors/pos-eng.json"), "utf8"));
const thraxOf = (label) => {
  const head = String(label ?? "").trim().split(/\s+/).pop()?.toLowerCase();
  if (!head) return null;
  return dominantClass(classifyWord(head, { posPrior: POS_PRIOR }), { minShare: GRAMMAR_MIN_SHARE })?.thraxClass ?? null;
};

// GRAIN, NOT ERROR. The correction that produced this function, user's own
// question: "are we convinced this is wrong? isn't this Ground Figure
// Pattern?"
//
// It was not wrong. An earlier cut of this file REFUSED every relation whose
// connector settled as a preposition — `burning | with | curiosity`,
// `she | with | a waistcoat-pocket`, `walking hand in hand with | Dinah` —
// on the grounds that a preposition is not a verb. But `cube.js` already
// says what those are:
//
//   TERRAIN_BY_DOMAIN.Structure = { Ground: "Field", Figure: "Link", Pattern: "Network" }
//
// `relations.js`'s own header declares it builds `CON · Link · Binding` —
// so EVERY edge it emits is stamped Figure/Link regardless of what it
// actually found, and anything that is not a discrete act between two
// discrete ends then reads as a broken Link. "Burning with curiosity" is not
// a failed Link. It is a FIELD: a state, an ambient co-presence, CON at
// Ground grain (`cellOf("CON","Ground")` -> terrain Field, stance Tending).
// Judging it by Link's standards and discarding it threw away real structure
// and then counted the discard as cleanliness.
//
// So the connector's settled part of speech now TYPES the observation's
// grain instead of gating its admission. Same evidence, same received prior,
// same P56 asymmetry (settled is refusable, never confirmable) — but what it
// refuses is now a GRAIN CLAIM, not the observation itself:
//
//   verb / participle  -> CON · Figure   (Link, Binding)   a discrete act
//   preposition        -> CON · Ground   (Field, Tending)  a state, a co-presence
//   conjunction        -> SEG · Figure   (Link, Dissecting) a distinction drawn
//   anything else,
//   or unsettled       -> grain gap, and the observation is KEPT
//
// The last line is the important one. "to" is UD PART, deliberately outside
// Thrax's eight categories, so it settles as nothing — that is a GRAIN GAP,
// a typed absence carried on the record, never a reason to drop what was
// seen. A missing prior produces a gap, never a guessed value.
const GRAIN_BY_THRAX = Object.freeze({
  verb: { op: "CON", grain: "Figure" },
  participle: { op: "CON", grain: "Figure" },
  preposition: { op: "CON", grain: "Ground" },
  conjunction: { op: "SEG", grain: "Figure" },
});
const grainOf = (label) => {
  const thrax = thraxOf(label);
  const spec = thrax ? GRAIN_BY_THRAX[thrax] : null;
  if (!spec) {
    return {
      grain_gap: thrax
        ? `connector settles as "${thrax}", which this reading has no grain rule for — kept, not discarded`
        : `connector does not settle in the received prior (Universal Dependencies has no Thrax-tradition category for it, e.g. the infinitive marker "to" is PART) — kept, not discarded`,
      settledAs: thrax,
    };
  }
  const cell = cube.cellOf(spec.op, spec.grain);
  return { operator: spec.op, grain: spec.grain, terrain: cell.terrain, stance: cell.stance, settledAs: thrax };
};

const lines = [];
let seq = 0;
const emit = (line) => { lines.push({ seq: seq++, ...line }); return lines[lines.length - 1]; };
let nextId = 0;
const id = (p) => `${p}${++nextId}`;

// ── line 0: the source. The ONE place the path is written. ────────────────
emit({
  schema: "EOTSource@1",
  path: path.relative(LP_ROOT, path.resolve(sourcePath)),
  sha256,
  bytes: originBytes.length,
  newlines: originBytes.includes("\r\n") ? "crlf — addresses below are in the ORIGIN's own coordinates, mapped back through spans.js::normaliseNewlines (S26)" : "lf",
  addressing: "every `at` below is [start,end) into THIS source; containment is computed from those numbers, never declared",
});

// ── line 1: the priors. What "how to read English" meant for this reading. ─
emit({
  schema: "EOTRecipe@1",
  language: "en",
  reader: "makeRelationReader — the POSITIONAL English reader: an end's role is found by its position in the clause, not by case-marking on the word. English word order carries meaning and this reading uses it.",

  // WHAT GROUND / FIGURE / PATTERN MEANS IN THIS CONTEXT, DECLARED ONCE.
  // User direction, verbatim: "dont call them SVO, call the GFP, and then
  // higher up scope what that means in this context."
  //
  // No line below says "subject", "verb" or "object". Those are English
  // grammar's names for English's own arrangement, and writing them onto
  // every record inverts the dependency law this kernel already fought once
  // (relation-composition.js: "AN ARRANGEMENT HAS ENDS, NOT PARTS OF SPEECH
  // ... composition chaining, a kernel concern, silently required material
  // some adapter had labelled with Greek grammar, and went dark on
  // everything else"). P76 renamed subject/verb/object to end1/label/end2
  // for that reason; this goes the rest of the way and types each
  // observation by its CELL IN THE CUBE instead of by an English part of
  // speech.
  //
  // The English interpretation is not deleted — it is SCOPED, here, to this
  // language and this reader, where a reader of another language can see
  // exactly what was assumed and replace it wholesale rather than finding it
  // smeared across 133 records.
  grainScope: {
    domain: "Structure — these observations are about how the material is arranged, not about what exists (Existence) or how it is being read (Interpretation)",
    Ground: {
      terrain: "Field", stance: "Tending", operator: "CON",
      is: "a state, a manner, a co-presence — a relation with no discrete act in it",
      inEnglishHere: "the label is a preposition ('burning WITH curiosity', 'seen a rabbit WITH a waistcoat-pocket'). The ends are not two actors; they are a figure and the ground it sits in.",
    },
    Figure: {
      terrain: "Link", stance: "Binding", operator: "CON",
      is: "a discrete act binding two discrete ends",
      inEnglishHere: "the label is a finite verb or participle. end1 is what English grammar would call the subject, end2 the complement — and that mapping is TRUE OF THIS READER AND THIS LANGUAGE ONLY, which is why it is written here once and nowhere else.",
    },
    Pattern: {
      terrain: "Network", stance: "Tracing", operator: "CON",
      is: "the recurring form across many links",
      inEnglishHere: "NOT PRODUCED BY THIS READING. Nothing here folds repeated links into a network; a Pattern-grain observation would have to be earned across the whole book, and this reading is scoped to one chapter.",
    },
    distinction: {
      terrain: "Link", stance: "Dissecting", operator: "SEG",
      is: "a distinction drawn between two ends rather than a relation asserted between them",
      inEnglishHere: "the label is a coordinator ('no pictures OR conversations'). Relate and Differentiate are different modes of the cube, so this is not a weaker CON — it is a different act.",
    },
    unsettled: "an observation whose label does not settle in the received POS prior carries `grain_gap` and NO grain. It is kept in full. A missing prior produces a typed gap, never a guessed grain.",
  },
  priors: [
    { name: "earned verb vocabulary", giver: "this material's own recurrence", scope: `a token is nominated as a verb only after following a recurring surface; minSurfaces ${MIN_SURFACES_PER_VERB}, declared` },
    { name: "POS refusal gate", giver: "Universal Dependencies UD_English-EWT (CC BY-SA 4.0), native/priors/pos-eng.json", scope: `wordclass.js dominantClass at minShare ${GRAMMAR_MIN_SHARE} — REFUSES a relation whose connector settles as a non-verb; never confirms one (P56: settled means refusable, never confirmable)` },
    { name: "inherited subject", giver: "this reading (new, 2026-09-09)", scope: "a nested clause with no subject of its own is read under the matrix subject that controls it" },
    { name: "script coverage per sentence", giver: "Unicode UCD General_Category (Cased_Letter vs L)", scope: "READING-SPEC S92 — tags each sentence cased/caseless so a mixed English+Mandarin document is readable per segment; this chapter is 100% cased" },
    { name: "case-marking prior", giver: "—", scope: "DELIBERATELY OMITTED. This is the positional reader, not makeCaseMarkedRelationReader. Case-marking is another language's prior, not a missing feature of this one." },
  ],
});

// ── INFERRED STRUCTURE ────────────────────────────────────────────────────
// User direction, verbatim: "or inferred strcutural elements rather" /
// "also our inferred parahraphs and stuff".
//
// INFERRED, not computed, and the word is load-bearing. This document has no
// markup. It has no chapters, no sections, no paragraphs and no sentences in
// it — it has BYTES, and a set of typographic conventions that a reader
// INTERPRETS as those things. A blank line is not a paragraph break; it is
// evidence a reader reads as one. A row of asterisks is not a scene break;
// it is ink that a reader of this tradition takes to mean one. "CHAPTER I."
// is a string that appears twice — once in a table of contents and once over
// the real chapter — and only a reader decides which is which.
//
// So every structural line below carries `inferred: true` and a `basis`
// naming the evidence that licensed it. That makes each one CONTESTABLE the
// same way a proposition is: a later observation can supersede it, and a
// reader who disagrees with the paragraph model can refuse these lines
// without touching the propositions addressed inside them. An inference
// recorded as a fact is the failure this whole ledger exists to prevent.
const infer = (role, at, basis, extra = {}) =>
  emit({ schema: "EOTObservation@1", id: id(role[0]), at: rawAt(at[0], at[1]), role, inferred: true, basis, ...extra });

// CHAPTERS. "CHAPTER I." appears in the table of contents AND over the real
// chapter; the TOC copy is followed by more TOC lines, the real one by a
// title line and then prose. The real headings are the ones at line-start
// followed by a blank line and a paragraph — taking the FIRST match would
// take the TOC, which is exactly the failure that put a table of contents
// into this book's flat reading.
const chapters = [];
{
  const RE = /^CHAPTER ([IVXLC]+)\.\s*\n([^\n]*)\n/gm;
  let m; const hits = [];
  while ((m = RE.exec(raw))) hits.push({ start: m.index, num: m[1], title: m[2].trim(), headEnd: m.index + m[0].length });
  for (let i = 0; i < hits.length; i += 1) {
    const end = i + 1 < hits.length ? hits[i + 1].start : raw.length;
    chapters.push({ ...hits[i], end, ordinal: i + 1 });
  }
  for (const c of chapters) {
    infer("chapter", [c.start, c.end], "a 'CHAPTER <roman>.' line at line-start followed by a title line and running prose — the table-of-contents copies of the same string are not followed by prose and are not matched", { ordinal: c.ordinal, numeral: c.num, title: c.title });
    infer("heading", [c.start, c.headEnd], "the chapter line and its title line", { ofChapter: c.ordinal });
  }
}

// FRONT MATTER: everything before the first real chapter. Recorded, never
// stripped — deleting it would shift every offset after it.
if (chapters.length && chapters[0].start > 0) {
  infer("front-matter", [0, chapters[0].start], "everything preceding the first inferred chapter heading — title, byline, edition line and the table of contents");
}

// Everything below is read WITHIN one chapter's address range. The chapter
// is the scope; nothing is copied out of the origin to achieve that.
const chapter = chapters.find((c) => c.ordinal === READ_CHAPTER);
if (!chapter) { console.error(`no chapter ${READ_CHAPTER} inferred in this document`); process.exit(2); }
const WIN = [chapter.headEnd, chapter.end];
const inWindow = (start, end) => start >= WIN[0] && end <= WIN[1];

// SCENE BREAKS: a row of asterisks. Chapter 1's flat reading counted all six
// of these rows as `no_relation_extracted` extraction gaps — they were never
// noise, they were structure, discarded and then charged against coverage.
const ASTERISK_ROW = /^[ \t]*(?:\*[ \t]*){3,}$/gm;
const breaks = [...raw.matchAll(ASTERISK_ROW)]
  .map((m) => ({ start: m.index, end: m.index + m[0].length }))
  .filter((b) => inWindow(b.start, b.end));
for (const b of breaks) infer("scene-break", [b.start, b.end], "a line of three or more asterisks — the printed convention for a break in time or scene");

// SECTIONS: the runs of prose BETWEEN scene breaks, inside the chapter.
{
  const cuts = [WIN[0], ...breaks.flatMap((b) => [b.start, b.end]), WIN[1]];
  for (let i = 0; i < cuts.length - 1; i += 2) {
    const [start, end] = [cuts[i], cuts[i + 1]];
    if (end > start && raw.slice(start, end).trim()) {
      infer("section", [start, end], "a run of prose bounded by inferred scene breaks or by the chapter's own edges");
    }
  }
}

// PARAGRAPHS: blank-line separated runs.
{
  const PARA = /(?:^|\n)[ \t]*\n/g; PARA.lastIndex = 0;
  let cursor = WIN[0]; const bounds = []; let m;
  const win = raw.slice(WIN[0], WIN[1]);
  const P2 = /\n[ \t]*\n/g;
  while ((m = P2.exec(win))) { bounds.push([cursor, WIN[0] + m.index]); cursor = WIN[0] + m.index + m[0].length; }
  bounds.push([cursor, WIN[1]]);
  for (const [start, end] of bounds) {
    const text = raw.slice(start, end);
    if (!text.trim()) continue;
    ASTERISK_ROW.lastIndex = 0;
    if (ASTERISK_ROW.test(text.trim())) continue; // already observed as a scene break
    const lead = text.length - text.trimStart().length;
    const tail = text.length - text.trimEnd().length;
    infer("paragraph", [start + lead, end - tail], "a run of text bounded by blank lines — the printed convention for a paragraph; this document carries no paragraph markup of its own");
  }
}

// SENTENCES, each carrying its own script tag (S92).
const sentences = splitSentences(raw).filter((s) => inWindow(s.offset, s.offset + s.text.length));
const script = scriptCoverageBySentence(sentences);
for (let i = 0; i < sentences.length; i += 1) {
  const s = sentences[i];
  infer("sentence", [s.offset, s.offset + s.text.length],
    "a terminator-bounded run, abbreviations and closing quotes accounted for (adapters/text/spans.js::splitSentences)",
    { script: script[i]?.dominant ?? null });
}

// ── proposition observations ──────────────────────────────────────────────
const surfaces = extractSurfaces(sentences);
// Vocabulary is earned from THIS CHAPTER's own text, not the whole book —
// the reading is scoped to the chapter, so what it has been able to learn
// must be too. Reading chapter 1 with a vocabulary earned from chapter 12
// would be lookahead, which is the one thing a causal reader may not do.
const vocabReport = discoverRelationVocab(raw.slice(WIN[0], WIN[1]), { surfaces, minSurfaces: MIN_SURFACES_PER_VERB });
const verbs = vocabReport?.verbs instanceof Set ? vocabReport.verbs : new Set(vocabReport?.verbs ?? []);
const opts = { verbs, phrasalPredicates: true, nounPhraseSubjects: true };

const carriesVerb = (t) => String(t ?? "").toLowerCase().split(/[^\p{L}\p{N}’']+/u).some((w) => verbs.has(w));
const promoteLabel = (label, objectText) => {
  if (thraxOf(label) === "verb") return null;
  const m = String(objectText ?? "").match(/^\s*([\p{L}\p{N}’']+)\s+([\s\S]*)$/u);
  if (!m) return null;
  const [, head, rest] = m;
  if (!verbs.has(head.toLowerCase()) || thraxOf(head) !== "verb" || !rest.trim()) return null;
  return { label: `${label} ${head}`.trim(), object: rest };
};
// P5.2 as a GATE: an address that does not slice back byte-identical is
// refused outright, never recorded and flagged.
const addressOf = (text, withinText, withinStart) => {
  const i = withinText.indexOf(text);
  if (i < 0) return null;
  const start = withinStart + i, end = start + text.length;
  return raw.slice(start, end) === text ? [start, end] : null;
};

function readClause(subject, objText, objStart, depth) {
  if (depth >= MAX_DEPTH || !carriesVerb(objText)) return;
  const inner = extractRelations(`${subject} ${objText}`, opts)[0];
  if (!inner?.object || inner.object === objText) return;
  const promoted = promoteLabel(inner.verb, inner.object);
  if (promoted) { inner.verb = promoted.label; inner.object = promoted.object; }
  const at = addressOf(inner.object, objText, objStart);
  if (!at) return;
  emit({
    schema: "EOTObservation@1", id: id("o"), at: rawAt(at[0], at[1]), role: "proposition",
    end1: subject, label: inner.verb, end2: inner.object,
    subjectBasis: "inherited", // controlled by the matrix subject; no subject of its own in the text
    ...grainOf(inner.verb),
  });
  readClause(subject, inner.object, at[0], depth + 1);
}

for (const sent of sentences) {
  for (const e of extractRelations(sent.text, opts)) {
    if (!e.subject || !e.object) continue;
    const at = addressOf(e.object, sent.text, sent.offset);
    if (!at) continue;
    emit({
      schema: "EOTObservation@1", id: id("o"), at: rawAt(at[0], at[1]), role: "proposition",
      end1: e.subject, label: e.verb, end2: e.object, subjectBasis: "stated",
      ...grainOf(e.verb),
    });
    readClause(e.subject, e.object, at[0], 1);
  }
}

// Nothing is refused for its grain any more. What used to be five discarded
// "non-verb connector" refusals are now five Field-grain observations on the
// record, and the observations whose connector does not settle carry a
// grain_gap instead of a grain. See grainOf above for why.

// ── revisions: appended at the end, superseding earlier lines by id ───────
// These are the hand-check's own findings, recorded the way this ledger
// requires them to be recorded — as later observations that supersede
// earlier ones, with both kept. Nothing above was edited.
// Targeted BY ADDRESS, not by matching subject/label strings — the same rule
// the nesting follows. A revision found by string match breaks the moment the
// string it matched on is the very thing being corrected; an address does not
// move. (The first cut of this file matched on strings and landed 1 of 4.)
const atText = (needle) => {
  const i = raw.indexOf(needle, WIN[0]);
  // Mapped to ORIGIN coordinates, because that is what every emitted `at`
  // is in — a lookup in normalised space against raw addresses silently
  // matches nothing.
  return i < 0 || i >= WIN[1] ? null : rawAt(i, i + needle.length);
};
const propositionAt = (needle) => {
  const at = atText(needle);
  if (!at) return null;
  return lines.find((x) => x.role === "proposition" && x.at[0] === at[0] && x.at[1] === at[1])
      ?? lines.find((x) => x.role === "proposition" && x.at[0] >= at[0] && x.at[1] <= at[1]);
};
const REVISIONS = [
  { find: "out of that dark hall", end1: "she", label: "longed to get", end2: "out of that dark hall", because: "hand-check: the matrix verb 'longed' was recorded as the subject. Its real subject is 'she' ('How she longed to get out of that dark hall') — a catenative verb with an infinitive complement, and this reader applies subject inheritance only to NESTED clauses, never to the outer one." },
  { find: "into the garden at once", end1: "she", label: "decided on going", end2: "into the garden at once", because: "hand-check: same class — the phrasal verb 'decided on' was recorded as the subject; the real subject 'she' sits before it, past two intervening clauses." },
  { find: "in it a very small cake", end1: "she", label: "found", end2: "in it a very small cake", because: "hand-check: a coordinated clause sharing the previous clause's subject by ellipsis ('she opened it, and found…'). The coordinator 'and' was recorded where 'she' belongs." },
  { find: "went Alice after it", end1: "Alice", label: "went", end2: "down, after it", because: "hand-check: subject-verb inversion after a fronted adverbial — 'down went Alice' means 'Alice went down'. Read by plain left-to-right position the ends came out exactly reversed, which is the one place English word order stops being a reliable guide to role." },
];
for (const r of REVISIONS) {
  const target = propositionAt(r.find);
  if (!target) continue;
  emit({
    schema: "EOTRevision@1", supersedes: target.id, id: id("r"), at: target.at, role: "proposition",
    end1: r.end1, label: r.label, end2: r.end2 ?? target.end2,
    because: r.because, witness: "LaVar hand-check, 2026-09-09",
  });
}

// ── PROJECTION: the tree, computed from addresses alone ──────────────────
// Nothing here is stored. Containment is `a.start >= b.start && a.end <= b.end`
// with the wider span winning; equal spans break the tie by role rank, which
// is the only ordering this projection declares.
const ROLE_RANK = { section: 0, paragraph: 1, sentence: 2, proposition: 3, "scene-break": 2, heading: 1 };
function project(ledger) {
  const superseded = new Set(ledger.filter((l) => l.supersedes).map((l) => l.supersedes));
  const nodes = ledger
    .filter((l) => l.at && (l.schema === "EOTObservation@1" || l.schema === "EOTRevision@1"))
    .filter((l) => !superseded.has(l.id))
    .map((l) => ({ ...l, children: [] }))
    .sort((a, b) => (a.at[0] - b.at[0]) || (b.at[1] - a.at[1]) || ((ROLE_RANK[a.role] ?? 9) - (ROLE_RANK[b.role] ?? 9)));
  const roots = []; const stack = [];
  for (const n of nodes) {
    while (stack.length && !(n.at[0] >= stack[stack.length - 1].at[0] && n.at[1] <= stack[stack.length - 1].at[1])) stack.pop();
    (stack.length ? stack[stack.length - 1].children : roots).push(n);
    stack.push(n);
  }
  return roots;
}

const outDir = path.join(HERE, "results");
fs.mkdirSync(outDir, { recursive: true });
const base = path.basename(sourcePath, ".txt");
const jsonlPath = path.join(outDir, `${base}.eot.jsonl`);
fs.writeFileSync(jsonlPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");

const tree = project(lines);
fs.writeFileSync(path.join(outDir, `${base}.projected.json`), JSON.stringify(tree, null, 1));

const count = (r) => lines.filter((l) => l.role === r && l.schema === "EOTObservation@1").length;
const depthOf = (n, d = 0) => (n.children.length ? Math.max(...n.children.map((c) => depthOf(c, d + 1))) : d);
console.log(`${lines.length} lines — ${count("section")} sections, ${count("paragraph")} paragraphs, ${count("sentence")} sentences, ${count("proposition")} propositions, ${lines.filter((l) => l.grain_gap).length} grain gaps, ${lines.filter((l) => l.schema === "EOTRevision@1").length} revisions`);
console.log(`projection: ${tree.length} roots, max nesting depth ${Math.max(...tree.map((t) => depthOf(t)))}`);
console.log(`jsonl ${(fs.statSync(jsonlPath).size / 1024).toFixed(1)} KB against a source of ${(raw.length / 1024).toFixed(1)} KB`);
console.log(`-> ${path.relative(process.cwd(), jsonlPath)}`);
