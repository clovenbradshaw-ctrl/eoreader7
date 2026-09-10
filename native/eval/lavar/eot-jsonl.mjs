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
import { extractSurfaces, scriptCoverageBySentence, accumulateSurfaceEvidence, createSurfaceEvidence, surfacesFromEvidence, discoverReferents } from "../../adapters/text/surfaces.js";
import { bindNarrationFrames, pronounResolver } from "../../adapters/text/perspective-claims.js";
import { boundAnchorSpans } from "../../adapters/text/vocabulary.js";
import * as cube from "../../kernel/cube.js";
import { makeGrainTyper } from "./grain-typing.mjs";
import { receivedGround, applyDelta } from "../../kernel/fold.js";
import { deriveIdentityRevision } from "../../kernel/identity.js";
import { textIdentityEvidence } from "../../adapters/text/identity-evidence.js";

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
// REREADING. User direction, verbatim: "sometimes it helps to reread a
// chapter for a person" / "now with CH 1 and Ch2 as priors, reread ch 1".
//
// A reread is NOT lookahead, and the difference is the whole justification.
// A first pass may not use what it has not yet read — that is S3's law and
// why the vocabulary is earned from the chapter alone. But a REREAD legitimately
// knows the later chapters, BECAUSE IT HAS READ THEM. The knowledge is
// declared, its source named, and the pass is marked as a second one, so no
// reader of the ledger can mistake a reread's reach for a first pass's.
//
// What a loaded prior carries is what an earlier reading EARNED: its verb
// vocabulary and its cast. Nothing about the arrangements is carried — those
// are re-read from the bytes every time, and where the reread now disagrees
// with the first pass, the disagreement is appended as a revision rather
// than overwriting what the first pass honestly saw.
const PRIOR_CHAPTERS = (process.argv.find((a) => a.startsWith("--prior=")) ?? "")
  .replace("--prior=", "").split(",").map((x) => Number(x.trim())).filter(Boolean);

// A LEXICON PRIOR is a DIFFERENT kind of prior than the reread above, and it
// is loaded through a DIFFERENT, narrower door on purpose. --prior=N reads
// THIS SAME document's own earlier chapter — verbs AND cast, because it is
// the same beings across the reread. A lexicon crosses documents (S99: a
// giver-and-provenance resource joins the received-priors tier), and S95's
// per-document boundary makes referent identity non-transferable across
// documents — Alice is not a candidate referent for a book that never
// mentions her. So this loader has NO CODE PATH that reads a `cast` field
// at all, even an empty one: the file's shape cannot leak identity, by
// construction, not by the discipline of whoever built the file.
// Comma-separated, like --prior=, so a growing shelf of lexicons (one per
// document already read — eval/lavar/build-lexicon.mjs writes one per
// document from that document's own .prior.json files) composes rather
// than forcing a caller to pre-merge them by hand.
const lexicons = (process.argv.find((a) => a.startsWith("--lexicon=")) ?? "")
  .replace("--lexicon=", "").split(",").map((s) => s.trim()).filter(Boolean)
  .map((p) => JSON.parse(fs.readFileSync(p, "utf8")));
for (const lx of lexicons) if (!lx.giver) { console.error("a lexicon prior must name its giver"); process.exit(2); }

// THE FIELD-LENS BOOST lives in its own script, eval/lavar/field-lens-
// boost.mjs, deliberately NOT inline here. A first cut ran it as a step
// inside this same invocation, after the reread-delta reconciliation above
// — measured to actually regress a golden score (ch2: 58/274 -> 54/274)
// the moment it composed with a fresh reread in the SAME pass, for reasons
// not worth chasing blind: two structural interventions (reread's own
// contest/dedup reconciliation, and the boost's separate dedup-by-referent)
// touching the same `lines` array in one invocation is exactly the kind of
// compound change this project's own measurement discipline refuses to
// trust without isolating each half. The boost is a pure POST-HOC pass
// instead — it reads an already-finished ledger, its own .prior.json
// vocabulary, and the raw source, and only ever APPENDS; it never
// re-enters this file's own read/reread machinery. Run it after a chapter
// is otherwise finished being read (or reread), never inside the same
// invocation as either.

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

// LANGUAGE. Defaults to English (this driver's whole history until now).
// "do other languages... it shows us if we are doing too much of an
// english shaped solution" (user, this session) — --lang= swaps the ONE
// thing that is cheaply, honestly portable (a real, giver-cited POS prior
// already built for these languages from Universal Dependencies treebanks,
// native/priors/pos-*.json) and the pronoun set the void-detector scans
// for. Everything else in this driver is left AS-IS on purpose: sentence
// splitting, capitalisation-based referent discovery, and the whole
// subject-inheritance nesting model are English/Latin-script assumptions
// this pass does NOT paper over — the point of this run is to see where
// those assumptions hold and where they silently produce nothing, not to
// ship a polished multilingual reader. Every pronoun list below is a
// small, disclosed, best-effort set (this project's own NEGATION_WORDS/
// DEFINITE_DETERMINERS precedent — priors.js — narrow lists with their
// reason stated, never a claim of a complete paradigm), and several
// languages' own typology makes the list SHORT ON PURPOSE: Korean is
// pro-drop (third-person pronouns are grammatically optional and rare in
// real prose, not merely under-listed here), and Hebrew has no neuter
// "it" at all (every noun is grammatically masculine or feminine).
const LANG = (process.argv.find((a) => a.startsWith("--lang=")) ?? "--lang=eng").replace("--lang=", "");
// JavaScript's `\b` is an ASCII-only boundary (defined against `\w` =
// [A-Za-z0-9_]) even with the `u` flag — it does NOT become Unicode-aware.
// A boundary check right against a Greek, Hebrew, or Turkish dotless-ı
// character silently never fires (both sides read as "non-word" to `\b`,
// so no transition is ever seen there), which is exactly the class of bug
// this whole pass exists to catch — found here, in the adaptation meant to
// TEST for English-shaped assumptions, which is its own finding. Fixed
// with an explicit Unicode-letter/number lookaround instead of `\b`.
const wordBound = (alts) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${alts})(?![\\p{L}\\p{N}])`, "iu");
const LANG_PRONOUNS = {
  eng: wordBound("she|he|it|her|him|they|them"),
  fra: wordBound("il|elle|ils|elles|lui|leur|leurs"),
  tur: wordBound("o|onu|ona|onlar|onları|onların"),
  kor: /(그녀|그것|그들|그는|그가|그를)/,
  ell: wordBound("αυτός|αυτή|αυτό|αυτοί|αυτές|αυτά|του|της|τους|τις"),
  heb: /(הוא|היא|הם|הן)/,
};
if (!LANG_PRONOUNS[LANG]) { console.error(`no pronoun set declared for --lang=${LANG} (declared: ${Object.keys(LANG_PRONOUNS).join(", ")})`); process.exit(2); }
const POS_PRIOR_PATH = path.join(HERE, "../../priors", LANG === "eng" ? "pos-eng.json" : `pos-${LANG}.json`);
if (!fs.existsSync(POS_PRIOR_PATH)) { console.error(`no POS prior at ${POS_PRIOR_PATH} for --lang=${LANG}`); process.exit(2); }
const POS_PRIOR = JSON.parse(fs.readFileSync(POS_PRIOR_PATH, "utf8"));
// GRAIN, NOT ERROR. The correction that produced this typing, user's own
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
// grain instead of gating its admission — moved into grain-typing.mjs (a
// pure module, POS prior passed in rather than read from a fixed --lang
// path) so a second caller doing a targeted re-read of one candidate
// sentence (field-lens-boost.mjs) types its own findings with the
// identical logic, never a second, driftable copy of it.
const { thraxOf, grainOf } = makeGrainTyper(POS_PRIOR);

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
  language: LANG,
  reader: LANG === "eng"
    ? "makeRelationReader — the POSITIONAL English reader: an end's role is found by its position in the clause, not by case-marking on the word. English word order carries meaning and this reading uses it."
    : `makeRelationReader — the SAME positional reader used for English, run on --lang=${LANG} WITHOUT a case-marking or word-order adaptation for this language. Only the POS prior and the void-detector's pronoun set were swapped (see the priors below); sentence splitting, capitalisation-based referent discovery, and the positional (not case-marked) end-role assignment are English/Latin-script assumptions carried over UNCHANGED. This is a deliberate stress test of those assumptions, not a claim of adapted support — read the reading's own hand evaluation for what held and what silently produced nothing.`,

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
    { name: "POS refusal gate", giver: `${POS_PRIOR.provenance?.giver ?? "unknown"}, native/priors/pos-${LANG}.json`, scope: `wordclass.js dominantClass at minShare ${GRAMMAR_MIN_SHARE} — REFUSES a relation whose connector settles as a non-verb; never confirms one (P56: settled means refusable, never confirmable)` },
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
  // A REAL title line is bounded by blank lines on both sides — the same
  // typographic convention that makes it a heading rather than running
  // prose. Not every book has one: The Picture of Dorian Gray's chapters
  // go straight from "CHAPTER I." to prose with no title line at all, and
  // without this check the regex swallowed the paragraph's own first
  // physical line as if it were a title — found by recoverability.mjs
  // (S101) failing on a SECOND text after Alice in Wonderland passed clean,
  // because AIW's own convention (a real title on every chapter) never
  // exercised this branch. Requiring a blank line immediately after the
  // candidate title distinguishes "Down the Rabbit-Hole\n\nAlice was..."
  // (real title) from "The studio was filled...\nsummer wind..." (prose,
  // wrapped across the physical line the naive regex captured).
  // A SECOND, SIBLING CONVENTION, added after reading Frankenstein for the
  // first time: "Chapter 1" (title-case word, Arabic numeral, no trailing
  // period) has zero matches under the Roman-numeral form above — this
  // book's heads[] would come back empty and every chapter read as "no
  // chapter N inferred". The Roman-numeral branch's own exact shape
  // (literal all-caps, required period) is UNCHANGED, so nothing already
  // verified against AIW or Dorian Gray can start matching differently;
  // this only adds a second alternative the first branch never reached.
  // A THIRD SIBLING, found reading the real Tom Sawyer for the first time
  // (structure-rec.mjs's own "sniff" identified it mechanically, via
  // skeleton recurrence, before this file was touched by hand at all):
  // "CHAPTER I" — all-caps, Roman numeral, no trailing period. The first
  // branch's own required period means this book's heads[] came back
  // empty even though the word and numeral alphabet both matched AIW's
  // own convention; the fix is one more alternative, tried only after the
  // period-requiring form has already had its chance, so nothing already
  // verified can start matching a bare-numeral candidate instead.
  const RE = /^(?:CHAPTER (?<roman>[IVXLC]+)\.|Chapter (?<arabic>\d+)\.?|CHAPTER (?<romanBare>[IVXLC]+))\s*\n(?<titleLine>[^\n]*)\n/gmd;
  let m; const hits = [];
  while ((m = RE.exec(raw))) {
    const candidateEnd = m.index + m[0].length;
    const titleLine = m.groups.titleLine;
    const hasRealTitle = Boolean(titleLine.trim()) && raw[candidateEnd] === "\n";
    const convention = m.groups.roman !== undefined ? "CHAPTER <roman>." : m.groups.arabic !== undefined ? "Chapter <arabic>" : "CHAPTER <roman>";
    hits.push({
      start: m.index, num: m.groups.roman ?? m.groups.arabic ?? m.groups.romanBare,
      convention,
      title: hasRealTitle ? titleLine.trim() : "",
      headEnd: hasRealTitle ? candidateEnd : m.indices.groups.titleLine[0],
    });
  }
  for (let i = 0; i < hits.length; i += 1) {
    const end = i + 1 < hits.length ? hits[i + 1].start : raw.length;
    chapters.push({ ...hits[i], end, ordinal: i + 1 });
  }
  for (const c of chapters) {
    // The basis names the CONVENTION THIS HEADING ACTUALLY MATCHED, not
    // just "the Roman-numeral form" unconditionally — found wrong on the
    // very first book read under the new "Chapter <arabic>" branch
    // (Frankenstein: all 24 chapters logged as "'CHAPTER <roman>.'" while
    // every one was really "Chapter 1".."Chapter 24"). A basis that names
    // the wrong evidence is the exact failure `infer`'s own header warns
    // against — an inference recorded as if it were a different fact.
    infer("chapter", [c.start, c.end], `a '${c.convention}' line at line-start followed by running prose (a title line, when the book gives one, is blank-line-bounded like the heading itself) — the table-of-contents copies of the same string are not followed by prose and are not matched`, { ordinal: c.ordinal, numeral: c.num, title: c.title });
    infer("heading", [c.start, c.headEnd], c.title ? "the chapter line and its title line" : "the chapter line alone — this book gives its chapters no title line", { ofChapter: c.ordinal });
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

// The priors an earlier reading earned, loaded and DISCLOSED. Union, never
// replacement: what this chapter earns on its own is kept whole, and the
// prior only ever widens what can be heard.
const loadedPriors = [];
for (const n of PRIOR_CHAPTERS) {
  const f = path.join(HERE, "results", `${path.basename(sourcePath, ".txt")}-ch${n}.prior.json`);
  if (!fs.existsSync(f)) { console.error(`prior for chapter ${n} not found (${path.basename(f)}) — read it first`); process.exit(2); }
  loadedPriors.push({ chapter: n, ...JSON.parse(fs.readFileSync(f, "utf8")) });
}


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

// THE BOUND-PRONOUN ANCHOR, wired. This is the fix for the defect a
// word-for-word hand-read of the whole chapter exposed, and it is the
// difference between reading this chapter and reporting a measurement of
// the reader's own starvation.
//
// WHAT THE HAND-READ FOUND. `discoverRelationVocab` nominates a token as a
// candidate verb only when it FOLLOWS a candidate referent surface, and
// surfaces are found by capitalisation (S86). Chapter 1 is narrated almost
// entirely in pronouns — "she", "it", "her" — so `ran`, `took`, `saw`,
// `found`, `knelt`, `ventured` were never nominated at all. 22 verbs earned
// from 11.7 KB of prose, and every main clause carrying the chapter's actual
// events was missing from the reading: Alice beginning to get tired, the
// White Rabbit running past her, the Rabbit taking the watch from its
// pocket, Alice taking down the marmalade jar, Alice finding herself in the
// long hall. This is S86's capitalisation-only finding biting the VERB tier
// rather than the being tier — S86/S87/S88 all treat it as a
// being-discovery problem, and nobody had recorded that the same single
// signal starves the verb vocabulary too.
//
// NOTHING NEW IS BUILT HERE. The lever already existed, tested, and was
// wired into nothing — not this driver, not `adapters/text/recursive.js`,
// not `live_priors/scripts/eot-sidecar.mjs` (checked, all three). This is
// the same shape as the `build-pos-prior.mjs` incident CLAUDE.md's own
// "search for the organ before you write one" section records: a real organ
// sitting one directory over, one call away. The chain is
// `bindNarrationFrames` -> `boundAnchorSpans` -> `discoverRelationVocab
// ({anchorSpans})`, and `tests/levers.test.js` pins the exact property this
// needs: "a name anchor and a bound-pronoun anchor SHARE the tally."
//
// WHAT IT DOES NOT DO, because the same test file pins that too: "unbound
// pronouns contribute NOTHING — the wall is positional, the string 'he'
// anchors nowhere by itself." A pronoun licenses a discovery anchor only
// once it has been BOUND to a referent. The bare string still licenses
// nothing, so this widens what can be heard without lowering what must be
// earned.
//
// CHAPTER-LOCAL COORDINATES, deliberately. `boundAnchorSpans`' own contract
// is "one space in, one space out", so the frame, the binding and the
// anchors all run in the chapter's own byte space. Nothing here emits an
// observation — the vocabulary is a Set of strings — so no address leaves
// this block, and the extraction below keeps using normalised-global
// offsets mapped through `toRaw` exactly as before.
const chapterText = raw.slice(WIN[0], WIN[1]);
const chapterSentences = splitSentences(chapterText);
const chapterEvidence = accumulateSurfaceEvidence(chapterSentences, createSurfaceEvidence());
const { events: castEvents } = discoverReferents(surfacesFromEvidence(chapterEvidence), {});
const surfaceToReferent = new Map(castEvents.map((e) => [e.surface, e.referent_id]));
for (const pr of loadedPriors) for (const [sur, ref] of pr.cast ?? []) if (!surfaceToReferent.has(sur)) surfaceToReferent.set(sur, ref);

// Declared, never defaulted — `resolvePronouns` throws without them, and the
// giver is named rather than a number chosen here: these are
// `organs/hypergraph.js`'s own PRONOUN_MIN_ACTIVATION / PRONOUN_MIN_MARGIN,
// the operating point the production reader already runs at, and which that
// file's own header discloses as unvalidated against a golden.
const RECALL = { minActivation: 0.05, minMargin: 0.2 };

// ONE FRAME. Chapter 1 has a single third-person narrator and no nested
// teller, so the honest frame set is one covering the chapter. This is not a
// simplification of `bindNarrationFrames`' frame-scoping — it is that
// scoping correctly applied to material with one teller.
const { boundSentences, perFrame } = bindNarrationFrames({
  frames: [{ narrator: "narrator", byteStart: 0, byteEnd: chapterText.length }],
  text: chapterText,
  offset: 0,
  surfaceToReferent,
  recall: RECALL,
});
const anchorSpans = boundAnchorSpans(boundSentences, chapterText);

// ── THE SIG ROW: what is being talked about ──────────────────────────────
// User's question, verbatim: "we need to be extracting the referents so we
// actually know what is being talked about, we're missing the SIG row
// entirely?" Yes — the entire EXISTENCE domain was absent. Every line in
// this ledger was Structure (CON/SEG: how the material is arranged) or an
// inferred structural extent. Nothing ever asserted that a BEING is there.
// Referent ids appeared only as annotations hanging off an arrangement's
// ends, which makes a being a property of a relation — exactly backwards.
//
//   cellOf("SIG","Figure") -> Existence · Relate · terrain ENTITY, stance Binding
//   cellOf("SIG","Ground") -> Existence · Relate · terrain VOID,   stance Tending
//   cellOf("SIG","Pattern")-> Existence · Relate · terrain KIND,   stance Tracing
//
// TWO ACTS, KEPT APART, because they are in different domains and collapsing
// them would hide which is revisable. `discoverReferents` emits `DEF.admit`
// — cellOf("DEF","Figure") = Interpretation · Differentiate · LENS —
// the READER'S act of judging that these surfaces name one being. The
// ENTITY is the resulting claim that the being is there. The Lens act can be
// wrong without the text changing; that is what makes it the revisable one,
// and why it is recorded rather than folded silently into the Entity.
const byReferent = new Map();
for (const ev of castEvents) {
  if (!byReferent.has(ev.referent_id)) byReferent.set(ev.referent_id, { surfaces: [], provenance: ev.provenance });
  byReferent.get(ev.referent_id).surfaces.push(ev.surface);
}
for (const [refId, info] of byReferent) {
  // A being's address is where it ENTERS the text — the first occurrence of
  // any surface it answers to. That makes the entity nest inside the
  // sentence that introduces it, which is true of the reading and not just
  // convenient: a being arrives somewhere.
  let first = Infinity, firstSurface = null;
  for (const sur of info.surfaces) {
    const i = chapterText.indexOf(sur);
    if (i >= 0 && i < first) { first = i; firstSurface = sur; }
  }
  if (!Number.isFinite(first)) continue;
  const occurrences = info.surfaces.reduce((n, sur) => n + chapterText.split(sur).length - 1, 0);
  const cell = cube.cellOf("SIG", "Figure");
  emit({
    schema: "EOTObservation@1", id: id("e"),
    at: rawAt(WIN[0] + first, WIN[0] + first + firstSurface.length),
    role: "entity",
    referent: refId,
    surfaces: info.surfaces,
    occurrences,
    operator: cell.op, grain: cell.grain, terrain: cell.terrain, stance: cell.stance,
    inferred: true,
    basis: `${info.provenance?.basis ?? "coreference"} (giver: ${info.provenance?.giver ?? "unknown"}) — the surfaces were clustered by name-variant coreference and this is the being that cluster asserts`,
  });
  // The reader's own act, kept as its own line in its own domain.
  const lens = cube.cellOf("DEF", "Figure");
  emit({
    schema: "EOTObservation@1", id: id("d"),
    at: rawAt(WIN[0] + first, WIN[0] + first + firstSurface.length),
    role: "admission", referent: refId,
    operator: lens.op, grain: lens.grain, terrain: lens.terrain, stance: lens.stance,
    basis: "DEF.admit — surfaces/discoverReferents judged these surfaces to name one being; revisable without the text changing",
  });
}

// SIG · Ground — the VOID. A pronoun reached for a being and the reading
// could not name it. This is not the absence of a record; it is a record of
// an absence, and it is measurable exactly: `bindNarrationFrames` refused
// these bindings at the declared recall floor, so the text points at someone
// and this reader cannot say who.
const voidCell = cube.cellOf("SIG", "Ground");
const boundRanges = new Set(boundSentences.map((b) => `${b.start}-${b.end}`));
for (const cs of chapterSentences) {
  const key = `${cs.offset}-${cs.offset + cs.text.length}`;
  if (boundRanges.has(key)) continue;
  if (!LANG_PRONOUNS[LANG].test(cs.text)) continue;
  emit({
    schema: "EOTObservation@1", id: id("v"),
    at: rawAt(WIN[0] + cs.offset, WIN[0] + cs.offset + cs.text.length),
    role: "void", operator: voidCell.op, grain: voidCell.grain,
    terrain: voidCell.terrain, stance: voidCell.stance,
    reached: "a third-person pronoun occurs here and no binding cleared the declared recall floor — the text points at a being this reading cannot name",
  });
}

// ENDS POINT AT REFERENTS, NOT AT STRINGS.
//
// User's question, verbatim: "we need it to be pointing at referents, is
// that happening in the json?" It was not. Every end was a bare surface, so
// "she" appearing in forty arrangements was forty unlinked strings rather
// than forty pointers to one being — and the binding that would have linked
// them was already being computed for the anchors above and then thrown
// away. A ledger of strings cannot answer "what did Alice do"; that is the
// whole point of the holograph, and it was missing.
//
// `pronounResolver` is the range join built for exactly this
// (perspective-claims.js): (surface, byteOffset) -> referentId, with every
// stage counted so a silent no-match is visible rather than reading as "no
// referent was there". Two ways an end resolves, in order:
//   1. the surface IS a known name — `surfaceToReferent`, an exact cast hit
//   2. the surface is a pronoun sitting inside a BOUND sentence range —
//      the range join, which is why an unbound pronoun still resolves to
//      nothing at all
// Anything else records NO referent field. An unresolved end is left as its
// surface and says so by omission — never guessed, and never quietly
// pointed at the nearest candidate (P38: an ambiguous bare form is a typed
// gap with candidates, never a third being).
const { resolve: resolveEnd, counters: refCounters } = pronounResolver(boundSentences);

// TIER 3, added after S104's field-lens-boost.mjs was found to be a
// complete no-op (READING-SPEC.md S104, "the 68 propositions are not
// new"). That script tried to recover under-covered referents by re-running
// extractRelations on Field-recalled sentences — but extractRelations is a
// pure function of (sentence text, vocabulary), and this driver's own main
// loop already runs it on every sentence in the chapter with identical
// vocabulary, so a Field-recalled candidate reproduces byte-identical
// output. There is no sentence the Field can find that this loop has not
// already read. Re-extraction was never going to find anything new; the
// gap was always downstream of extraction, in resolution.
//
// It IS downstream, and it is real: tiers 1 and 2 above only ever match a
// BARE surface (an exact cast name, or a single pronoun token). Neither
// attempts a captured phrase that CONTAINS a known name alongside other
// words — "our Dinah here", "poor Alice", "The White Rabbit" — which
// extractRelations produces constantly (subject/object groups keep their
// determiners and modifiers) and which nothing downstream has ever tried
// to unwrap. Confirmed directly: chapter 3's own ledger already carries
// `I | had | our Dinah here` with end1Ref/end2Ref both unset — the main
// pass already found and typed this clause; it just never looked inside
// the object phrase for the name it was carrying.
//
// Committed ONLY when exactly one referent's own surface (>=3 chars, whole
// word/phrase, case-sensitive against the raw capitalisation) is found
// inside the candidate text — the same "never guessed" floor as P38: two
// different referents' surfaces both matching is an ambiguous containment,
// left unresolved rather than pointed at either one.
const surfaceContainmentRef = (text) => {
  const s = String(text ?? "").trim();
  if (!s) return null;
  let hit = null;
  for (const [sur, ref] of surfaceToReferent) {
    if (!sur || sur.length < 3) continue;
    const re = new RegExp(`\\b${sur.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (!re.test(s)) continue;
    if (hit && hit !== ref) return null;
    hit = ref;
  }
  return hit;
};
const endRef = (surface, chapterLocalOffset) => {
  const direct = surfaceToReferent.get(String(surface ?? "").trim());
  if (direct) return direct;
  const viaPronoun = Number.isFinite(chapterLocalOffset) ? resolveEnd(surface, chapterLocalOffset) : null;
  if (viaPronoun) return viaPronoun;
  return surfaceContainmentRef(surface);
};

// Vocabulary is earned from THIS CHAPTER's own text, not the whole book —
// the reading is scoped to the chapter, so what it has been able to learn
// must be too. Reading chapter 1 with a vocabulary earned from chapter 12
// would be lookahead, which is the one thing a causal reader may not do.
// THE POS PRIOR GATES THE ARRANGEMENT, NOT THE VOCABULARY — and getting
// this backwards deleted every Field.
//
// Measured, both ways. Wiring anchors WITHOUT any gate doubled the
// vocabulary (22 -> 43) and half of what it added was not a relation-heading
// word at all — `in`, `great`, `face`, `best`, `generally`, `very`, `eyes` —
// because a bound "she" anchors every one of its occurrences and the token
// after a pronoun is often not a predicate. But passing `posPrior` here, the
// way the production recipe does, gates the vocabulary to VERB-DOMINANT
// forms only, and that silently deletes the entire Ground grain: "with",
// "after" and "or" never enter the vocabulary, so they never become
// connectors, so `burning | with | curiosity` cannot be found at all.
// Measured: 84 arrangements, ALL Link, zero Field, zero Distinction.
//
// So `posPriorGate` — the production recipe's own vocabulary gate — encodes
// the Link-only assumption UPSTREAM of grain typing, and S95's rule cannot
// take effect behind it. The gate belongs on the arrangement's connector
// (see grainOf), where the same received prior types what was found instead
// of narrowing what may be found. Same evidence, same P56 asymmetry, one
// tier later.
const vocabReport = discoverRelationVocab(chapterText, { surfaces, minSurfaces: MIN_SURFACES_PER_VERB, anchorSpans });

const ownVerbs = vocabReport?.verbs instanceof Set ? vocabReport.verbs : new Set(vocabReport?.verbs ?? []);
const verbs = new Set(ownVerbs);
for (const pr of loadedPriors) for (const v of pr.verbs ?? []) verbs.add(v);
// Per-lexicon, not just aggregate: with a growing shelf of lexicons, one
// offered second may mostly overlap the first — its OWN marginal
// contribution is what's worth disclosing, not just the combined total.
const lexiconStats = lexicons.map((lx) => {
  let fresh = 0;
  for (const v of lx.verbs ?? []) { if (!verbs.has(v)) fresh += 1; verbs.add(v); }
  return { giver: lx.giver, verbsOffered: (lx.verbs ?? []).length, verbsNew: fresh };
});
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

function readClause(subject, objText, objStart, depth, subjectRef = null) {
  if (depth >= MAX_DEPTH || !carriesVerb(objText)) return;
  const inner = extractRelations(`${subject} ${objText}`, opts)[0];
  if (!inner?.object || inner.object === objText) return;
  const promoted = promoteLabel(inner.verb, inner.object);
  if (promoted) { inner.verb = promoted.label; inner.object = promoted.object; }
  const at = addressOf(inner.object, objText, objStart);
  if (!at) return;
  const gN = grainOf(inner.verb);
  if (gN.refused) {
    // A refusal is a line. One that leaves no trace reads as "nothing was
    // there", which is the exact failure this apparatus exists to stop.
    emit({ schema: "EOTRefusal@1", at: rawAt(at[0], at[1]), role: "proposition", reason: "connector_class_cannot_head_a_relation",
           label: inner.verb, settledAs: gN.settledAs });
    return null;
  }
  emit({
    schema: "EOTObservation@1", id: id("o"), at: rawAt(at[0], at[1]), role: "proposition",
    end1: subject, label: inner.verb, end2: inner.object,
    subjectBasis: "inherited", // controlled by the matrix subject; no subject of its own in the text
    // The inherited subject's referent is inherited with it — the nested
    // clause has no subject of its own to resolve independently.
    ...(subjectRef ? { end1Ref: subjectRef } : {}),
    ...gN,
  });
  readClause(subject, inner.object, at[0], depth + 1, subjectRef);
}

for (const sent of sentences) {
  const found = extractRelations(sent.text, opts);
  // A SENTENCE THAT YIELDED NOTHING SAYS SO, AND SAYS WHY.
  //
  // Regression caught by the user reading the projection: "why are we not
  // seeing content for these sentences?" — sentence lines were being emitted
  // with nothing beneath them and nothing explaining it. The flat form this
  // ledger replaces was BETTER here (LP10: "one entry per sentence, always —
  // a real proposition or a typed gap, never a silent absence"), and dropping
  // that was a loss, not a simplification. An absence with no reason on the
  // record is indistinguishable from a sentence nobody looked at.
  //
  // The two reasons are genuinely different and must not be collapsed:
  // a vocabulary that never nominated anything in this sentence is a fact
  // about what this reading has been able to LEARN so far (and is therefore
  // revisable by a later pass — see the revision lines at the end), whereas
  // an earned verb that still yields nothing is the extractor's own
  // mandatory-subject-and-object gate refusing (S90), which no amount of
  // further reading will change.
  if (!found.length) {
    const hasEarnedVerb = carriesVerb(sent.text);
    emit({
      schema: "EOTAbsence@1",
      at: rawAt(sent.offset, sent.offset + sent.text.length),
      role: "arrangement",
      reason: hasEarnedVerb ? "gate_refused_no_two_ends" : "no_earned_verb_in_this_sentence",
      detail: hasEarnedVerb
        ? "a verb this reading earned occurs here, but extractRelations requires BOTH a subject group and an object group (S90: `if (!subject || !object) continue`) — an exclamation, a bare predicate adjective, or an intransitive clause satisfies neither, and that is a property of the gate, not of the material"
        : `no token in this sentence was nominated by the ${verbs.size} verbs this reading earned from the chapter's own recurrence — revisable: a later pass carrying a wider vocabulary may find one, and would record it as a revision rather than a rewrite`,
    });
  }
  for (const e of found) {
    if (!e.subject || !e.object) continue;
    const at = addressOf(e.object, sent.text, sent.offset);
    if (!at) continue;
    const localBase = sent.offset - WIN[0];
    const ref1 = endRef(e.subject, localBase + (e.subjectOffset ?? NaN));
    const ref2 = endRef(e.object, localBase + (e.objectOffset ?? NaN));
    const g = grainOf(e.verb);
    if (g.refused) {
      emit({ schema: "EOTRefusal@1", at: rawAt(at[0], at[1]), role: "proposition", reason: "connector_class_cannot_head_a_relation",
             label: e.verb, settledAs: g.settledAs });
      continue;
    }
    emit({
      schema: "EOTObservation@1", id: id("o"), at: rawAt(at[0], at[1]), role: "proposition",
      end1: e.subject, label: e.verb, end2: e.object, subjectBasis: "stated",
      ...(ref1 ? { end1Ref: ref1 } : {}),
      ...(ref2 ? { end2Ref: ref2 } : {}),
      ...g,
    });
    readClause(e.subject, e.object, at[0], 1, ref1);
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

// ── SURPRISE, AT THE LEVEL OF MEANING: HOW NEW INFORMATION MOVES WHAT WE
//    THOUGHT ABOUT A BEING ────────────────────────────────────────────────
// User direction, verbatim: "surprise must exist on the level of meaning in
// this sense, how it moves the holograph" / "how new information changes
// what we thought about Alice for example" / "we;ve built all this before
// search harder."
//
// It was built. Nothing here is new machinery, and the searching is the
// point: `kernel/expectations.js` carries seven states (open, strengthened,
// weakened, fulfilled, violated, reframed, superseded) with the cube rows
// already assigned — opening is INS, a transition is EVA, and a REFRAME is
// REC. `kernel/identity.js::deriveIdentityRevision` already rides that
// lifecycle whenever a `canonicalizationFloor` is declared, and already
// SEG/DEFs a contradicted reading and REC-canonicalizes every relation that
// depended on the identity it just withdrew. Two tests in
// `tests/identity-revision.test.js` pin exactly that behaviour and predate
// this pass.
//
// So token-rarity was the wrong measure of surprise and is gone. Surprise
// here is an expectation VIOLATED; the holograph MOVING is one REFRAMED.
//
// READ CAUSALLY, one sentence at a time, because that is the only way the
// states mean anything: an expectation opened at sentence 12 and fulfilled
// at sentence 40 is a fact about the READING, and folding the whole chapter
// at once would collapse it into a verdict with no history.
//
// THE FLOOR IS DECLARED, never defaulted — the organ refuses a fraction or a
// guess. 2 is the value its own tests declare and the reason is structural,
// not tuned: one witness OPENS an identity as a live hypothesis, and a
// second, INDEPENDENT witness is what licenses projecting it into the
// relations that depend on it. Below the floor the identity is a prediction
// the reading is carrying, which is precisely what an open expectation is.
const CANONICALIZATION_FLOOR = 2;
{
  let fold = receivedGround({});
  let seen = new Map();
  for (const cs of chapterSentences) {
    const alternatives = fold.unresolvedAlternatives ?? [];
    const ev = textIdentityEvidence(cs.text, { alternatives, witness: `s:${cs.offset}` });
    if (!ev.supports.length && !ev.attacks.length) continue;
    const delta = deriveIdentityRevision({
      fold, supports: ev.supports, attacks: ev.attacks,
      witness: `s:${cs.offset}`, canonicalizationFloor: CANONICALIZATION_FLOOR,
    });
    fold = applyDelta(fold, delta);
    const at = rawAt(WIN[0] + cs.offset, WIN[0] + cs.offset + cs.text.length);
    for (const op of delta.operations ?? []) {
      const kind = op.consequence?.kind ?? null;
      const value = op.payload?.value;
      if (value?.schema !== "EOExpectation@1") continue;
      const prior = seen.get(value.id);
      seen.set(value.id, value.state);
      const cell = cube.cellOf(op.operator, op.grain ?? "Figure");
      emit({
        schema: "EOTObservation@1", id: id("x"), at,
        role: "expectation",
        expectation: value.id,
        hypothesis: value.hypothesis,
        state: value.state,
        movedFrom: prior ?? null,
        operator: op.operator, grain: cell.grain, terrain: cell.terrain, stance: cell.stance,
        consequence: kind,
        // The whole point, named on the line itself so no reader has to infer
        // it: a violated expectation is where this reading was surprised, and
        // a reframed one is where the holograph actually moved.
        movesHolograph: value.state === "reframed" || value.state === "violated",
        basis: `identity evidence in this sentence (${[...new Set([...ev.supports.map((x) => x.reason), ...ev.attacks.map((x) => x.reason)])].join(", ")}); canonicalizationFloor ${CANONICALIZATION_FLOOR}, declared`,
      });
    }
  }
}

// ── WE NEVER READ FROM NOWHERE ───────────────────────────────────────────
// User direction, verbatim: "we never read from nowhere, we read with priors
// loaded, thogh thats hard because this will technically be our first prior"
// — arriving with two questions the same minute: "and waht about surprise?"
// and "and strain".
//
// Those are one question. SURPRISE AND STRAIN ARE ONLY DEFINABLE AGAINST AN
// EXPECTATION. A reader that declares no prior cannot be surprised by
// anything, and a ledger that records no expectation cannot show where the
// material pushed back. So this line states what was brought, what was
// taken, and where the two disagreed — before any arrangement is read.
//
// THE THREE ARE DIFFERENT KINDS OF FACT and are kept apart:
//
//   RECEIVED — brought to the text, true before it was opened (a treebank,
//     a Unicode property table). S9's "high sets probability for low".
//   EARNED   — induced from THIS material and true only of it (the verb
//     vocabulary, the surfaces, the cast). S9's "low sets possible for high".
//     Never call this a prior: it is what the reading found, not what it knew.
//   SURPRISE — the material exceeding the received prior. Measured, not
//     asserted: tokens the treebank never attests at all.
//   STRAIN   — received and earned disagreeing about the same token.
//
// THE BOOTSTRAP, STATED RATHER THAN HIDDEN. Surprise against an ACCUMULATED
// READING prior is undefined here, because there is no prior reading — this
// is the first. Reporting that as zero surprise would be a lie of exactly
// the kind this ledger exists to prevent, so it is a typed gap. What this
// reading earns BECOMES the prior the next chapter is read against, and the
// day that comparison is possible is the day this field carries a number.
{
  const forms = POS_PRIOR.forms ?? POS_PRIOR;
  const tokens = [...new Set((chapterText.toLowerCase().match(/[\p{L}’']+/gu) ?? []))];
  const unattested = tokens.filter((t) => !forms[t]);
  const strain = [...verbs].filter((v) => {
    const t = thraxOf(v);
    return t && t !== "verb";
  });
  emit({
    schema: "EOTPriorState@1",
    received: [
      { name: `POSPrior@1 (${LANG})`, giver: POS_PRIOR.provenance?.giver ?? "unknown", brought: `${Object.keys(forms).length} attested word forms`, used: "types each arrangement's connector into a cube cell; REFUSES a settled non-relational class, never confirms" },
      { name: "Unicode UCD General_Category", giver: "Unicode Consortium", used: "cased vs caseless per sentence (S92)" },
      { name: "recall floor", giver: "organs/hypergraph.js PRONOUN_MIN_ACTIVATION / PRONOUN_MIN_MARGIN", used: "how faint a pronoun binding may be and still bind — disclosed by that file as unvalidated against a golden" },
    ],
    earned: {
      verbs: verbs.size,
      surfaces: surfaces.length,
      referents: byReferent.size,
      boundSentences: boundSentences.length,
      note: "induced from this chapter alone. Not a prior — what the reading found, and lookahead-free: nothing here was learned from a later chapter.",
    },
    surprise: {
      againstReceivedPrior: {
        distinctTokens: tokens.length,
        unattested: unattested.length,
        share: Number((unattested.length / tokens.length).toFixed(4)),
        sample: unattested.slice(0, 12),
        why_it_matters:
          "discoverRelationVocab's own gate is `verbDominant = !attested ? (lexiconKnows !== false) : verbShare > 0.5` — a witness cannot refuse what it never saw. So the gate FAILS OPEN on every one of these: the reading is least defended exactly where the material is most surprising.",
      },
      againstAccumulatedReadingPrior: null,
      accumulated_gap:
        "UNDEFINED, not zero. This is the first reading in this corpus, so there is no earlier reading to be surprised against. What this chapter earned becomes the prior the next is read against; this field carries a number the day that comparison exists.",
    },
    strain: {
      tokens: strain,
      what_it_is:
        "earned as a connector by this material's own recurrence, while the received prior settles the same token as a non-verb. Not an error and not noise — this is the tension the grain row resolves: `with`/`after` are Field (CON·Ground), `or`/`either` are Distinction (SEG·Figure), and what settles as a class that cannot head a relation at all is refused with its refusal on the record.",
    },
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
    .filter((l) => l.at && (l.schema === "EOTObservation@1" || l.schema === "EOTRevision@1" || l.schema === "EOTAbsence@1"))
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

emit({
  schema: "EOTReadingPass@1",
  pass: loadedPriors.length ? 2 : 1,
  chapter: READ_CHAPTER,
  priorsLoaded: loadedPriors.map((p) => ({ chapter: p.chapter, verbs: (p.verbs ?? []).length, cast: (p.cast ?? []).length })),
  lexiconsLoaded: lexiconStats.length ? lexiconStats : null,
  earnedHere: { verbs: ownVerbs.size, castSurfaces: surfaces.length },
  vocabularyAfterUnion: verbs.size,
  disclosure: loadedPriors.length
    ? "A REREAD. This pass legitimately knows what the loaded chapters contain because it has read them; that is rereading, not lookahead. Its reach must not be compared with a first pass's without saying so."
    : lexiconStats.length
      ? "A FIRST PASS ON THIS DOCUMENT, primed with one or more cross-document vocabulary priors. The cast is still earned from nothing but this chapter's own bytes — a lexicon carries no cast and could not leak one."
      : "A FIRST PASS. Nothing here was learned from any later chapter — the vocabulary and cast are earned from this chapter's own bytes.",
});

// ── SURPRISE IS GRADED, AND IT IS MEASURED AROUND THE BEING ──────────────
// User direction, verbatim: "yeah it should all be surprising to some degree
// to move our knowledge of what we learn about alice for example."
//
// Surprise is not a flag on the few observations that contradict something.
// EVERY arrangement moves what is known about the being it concerns, by some
// amount, and the amount is the point: the first thing said about Alice
// moves everything, the twentieth repetition of a relation already recorded
// moves almost nothing. A reading that cannot say which is which cannot say
// where it learned anything.
//
// IDENTITY IS A CENTRE OF EXPANSION, NOT A LABEL — `docs/THE-HOLOGRAPH.md`
// §1: an address expands to "the bytes, the claims around them, THE
// REFERENT'S WHOLE NEIGHBOURHOOD". So the honest denominator for surprise is
// that neighbourhood: what is already folded around this being at the moment
// the new observation arrives. This walks the arrangements in ADDRESS order,
// which is reading order, and asks of each what it added that the
// neighbourhood did not already hold.
//
// NOTHING IS THRESHOLDED. The measure is a count of what is new — a relation
// this being was never in before, a partner it was never joined to before —
// over the size of what was already there. No cutoff decides "surprising
// enough"; the number rides and a consumer decides. (`kernel/dynamics.js`
// ::deriveSurprise computes the same shape structurally over a fold delta,
// and is the organ this would use if the assembled reader were driving —
// see the disclosure line below for why it is not.)
{
  const known = new Map(); // referent -> {labels:Set, partners:Set, count}
  const arrangements = lines
    .filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && (l.end1Ref || l.end2Ref))
    .sort((a, b) => a.at[0] - b.at[0]);
  for (const a of arrangements) {
    // A PARTNER IS A REFERENT, NEVER A STRING. The first cut of this measure
    // used the other end's raw text, and it saturated instantly: novel-rate
    // 1.00 on both chapters, familiar 0, because a full object phrase almost
    // never repeats verbatim. That made every observation "novel" and the
    // decay untestable — the metric measured string variety, not knowledge.
    // This is the same defect one layer up from where it was already found
    // (ends that are strings are not a referent model), and it saturates a
    // measurement instead of merely thinning one.
    for (const [ref, mine, theirs] of [[a.end1Ref, a.end1, a.end2Ref], [a.end2Ref, a.end2, a.end1Ref]]) {
      if (!ref) continue;
      if (!known.has(ref)) known.set(ref, { labels: new Set(), partners: new Set(), count: 0 });
      const n = known.get(ref);
      const label = String(a.label ?? "").toLowerCase();
      const partner = String(theirs ?? "").toLowerCase();
      const novelLabel = !n.labels.has(label);
      const novelPartner = !n.partners.has(partner);
      const before = n.count;
      n.labels.add(label); if (partner) n.partners.add(partner); n.count += 1;
      emit({
        schema: "EOTSurprise@1",
        at: a.at,
        about: ref,
        arrangement: a.id,
        // What this observation added to the world folded around this being.
        novelRelation: novelLabel,
        novelPartner,
        partnerKnown: Boolean(partner),
        neighbourhoodBefore: before,
        // First mention moves everything: there was no neighbourhood to be
        // unsurprised by. Reported as its own case rather than as a large
        // number, because a ratio against an empty denominator is not a
        // measurement.
        firstOfItsBeing: before === 0,
      });
    }
  }
}

// ── A REREAD RECORDS ONLY WHAT MOVED ─────────────────────────────────────
// User direction, verbatim: "we should have it in general so that rereading
// only records DMD, no redundant information" / "rereading should make our
// understanding richer, and open opportunities to drill down on ambiguity".
//
// Three rules, and the first one is what makes the other two legible:
//
//   1. NO REDUNDANCY. An arrangement the earlier reading already recorded at
//      the same address, with the same ends and label, is NOT written again.
//      Re-stating it would not be a second observation; it would be the same
//      observation counted twice, and a ledger that inflates on every reread
//      cannot be read for what changed.
//   2. ONLY THE DYNAMICS. What the reread contributes is what MOVED — new
//      arrangements, and disagreements. That is the reading's own delta,
//      which is the term `kernel/dmd.js` decomposes: its eigenvalues are
//      estimated from how the reading EVOLVES, and READING-SPEC's standing
//      constraint (line ~274) is that a causal consumer streams prefixes
//      rather than batching a whole reading, because batch DMD over a
//      finished reading is S3's lookahead verbatim.
//   3. DISAGREEMENT IS AMBIGUITY, NOT CORRECTION. Where a reread reads the
//      same bytes differently, the honest record is not "the new one wins".
//      Both readings saw the same text; the text is ambiguous there, and
//      that is a place to drill down. It is emitted as a CONTEST carrying
//      both readings, deliberately UNTYPED — `kernel/notes.js` distinguishes
//      individuation / provenance / force / grain / contest, and its own
//      rule is that an untyped disagreement "needs typing, not a source".
//      Typing it here, automatically, would be inventing the very judgement
//      the contest exists to request.
//
// APPEND, NEVER OVERWRITE. The first cut of the reread replaced ch1's ledger
// outright — breaking S95's own law ("revisions are lines, not edits") in
// the very mechanism built to honour it. The pass-1 reading survived only
// because it had been copied aside by hand.
let priorLines = [];
const ledgerPath = path.join(HERE, "results", `${path.basename(sourcePath, ".txt")}-ch${READ_CHAPTER}.eot.jsonl`);
if (loadedPriors.length && fs.existsSync(ledgerPath)) {
  priorLines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}
if (priorLines.length) {
  // Case-folded, because "she" and "She" are the SAME reading of the same
  // bytes. The first cut compared them raw and reported a contest at every
  // sentence-initial pronoun — a disagreement that exists only in the
  // comparison, which would send a reader to drill into an ambiguity that
  // was never there. A contest has to cost something to be worth raising.
  const fold = (x) => String(x ?? "").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  const key = (l) => `${l.at?.[0]}-${l.at?.[1]}|${fold(l.end1)}|${fold(l.label)}|${fold(l.end2)}`;
  const atKey = (l) => `${l.at?.[0]}-${l.at?.[1]}`;
  const priorProps = priorLines.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1);
  const priorByKey = new Set(priorProps.map(key));
  const priorLineByKey = new Map(priorProps.map((l) => [key(l), l]));
  const priorByAt = new Map();
  for (const l of priorProps) (priorByAt.get(atKey(l)) ?? priorByAt.set(atKey(l), []).get(atKey(l))).push(l);

  const mine = lines.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1);
  const unchanged = mine.filter((l) => priorByKey.has(key(l)));
  const fresh = mine.filter((l) => !priorByKey.has(key(l)));

  // AN UNCHANGED CLAUSE CAN STILL CARRY NEW INFORMATION. "unchanged" above
  // means the SAME key — same address, same end1/label/end2 text — so the
  // line kept on the record is the OLD priorLine, verbatim (see the push
  // below: `lines.push(...priorLines, ...)`). But a fuller resolver (this
  // pass's own vocabulary/prior union, or a later-added tier in `endRef`
  // itself) can bind a referent to an end the earlier pass's resolver left
  // bare, WITHOUT the clause's own text moving at all — and a same-key
  // comparison is blind to that by construction, since it never looks past
  // end1/label/end2. Found exactly this way: ch3's "I | had | our Dinah
  // here" kept end1Ref/end2Ref unset across a real regeneration with
  // `endRef`'s new surface-containment tier active, because the OLD line
  // (with no Dinah binding) was the one kept — the fresh extraction that
  // DID resolve it was silently discarded as "already recorded."
  //
  // The fix is not to overwrite the old line (S95's law, restated at the
  // top of this block) — it is to say so as its own kind of revision: same
  // clause, same bytes, a referent bound today that yesterday's resolver
  // could not reach. `EOTRevision@1` already carries exactly this shape
  // (`supersedes: <id>`, both kept) for the hand-checked corrections below;
  // this is the same schema, triggered mechanically instead of by hand.
  const rebound = [];
  for (const l of unchanged) {
    const prior = priorLineByKey.get(key(l));
    if (!prior) continue;
    const gained1 = l.end1Ref && !prior.end1Ref;
    const gained2 = l.end2Ref && !prior.end2Ref;
    if (!gained1 && !gained2) continue;
    rebound.push({
      supersedes: prior.id, at: prior.at, end1: prior.end1, label: prior.label, end2: prior.end2,
      ...(gained1 ? { end1Ref: l.end1Ref } : {}),
      ...(gained2 ? { end2Ref: l.end2Ref } : {}),
    });
  }

  const delta = [];
  let nextSeq = Math.max(...priorLines.map((l) => l.seq ?? 0)) + 1;
  const push = (o) => delta.push({ seq: nextSeq++, ...o });

  // `delta.new` is filled in AFTER the loop below, not here — filling it
  // with the raw `fresh.length` at push time was the pre-existing shape,
  // and it overcounted by exactly the contest count: every fresh candidate
  // that turns out to be a contest, or (below) one already settled, is a
  // candidate that COULD have been new, not one that was. The ledger's own
  // `delta` field must say what was actually written, the same standard
  // the disclosure line already claims for it.
  push({
    schema: "EOTReadingPass@1", pass: 2, chapter: READ_CHAPTER,
    priorsLoaded: loadedPriors.map((p) => ({ chapter: p.chapter, verbs: (p.verbs ?? []).length })),
    vocabularyAfterUnion: verbs.size,
    delta: { alreadyRecorded: unchanged.length, new: 0, contests: 0, alreadySettled: 0, rebound: rebound.length },
    disclosure: "A REREAD, appended. It legitimately knows the loaded chapters because it has read them; that is rereading, not lookahead. Only what MOVED is written — an arrangement identical to one already on the record is not restated. 'rebound' is the one exception to 'not restated': the SAME clause, kept, with a referent this pass's resolver newly bound — recorded as a revision, never by editing the old line. 'alreadySettled' is a candidate that reproduces a contest's own losing reading from an earlier pass — also not restated.",
  });

  for (const r of rebound) {
    push({
      schema: "EOTRevision@1", supersedes: r.supersedes, id: id("r"), at: r.at, role: "proposition",
      end1: r.end1, label: r.label, end2: r.end2,
      ...(r.end1Ref ? { end1Ref: r.end1Ref } : {}),
      ...(r.end2Ref ? { end2Ref: r.end2Ref } : {}),
      because: "the clause is unchanged from the prior pass, but this pass's resolver newly binds a referent the earlier pass's endRef left bare",
      witness: "eot-jsonl.mjs endRef, automatic reread rebinding",
    });
  }

  // A CONTEST, ONCE RECORDED, IS NOT RELITIGATED. Found running this same
  // pass a second time at the SAME prior depth (to measure this pass's own
  // fix in isolation, against a chapter that had already been reread once
  // before): 13 of ch2's contests came back as EXACT duplicates of ones
  // already on the record — the proposition dedup above only ever checks
  // `priorProps` (schema EOTObservation@1), so a contest's own losing-side
  // reading, which is never pushed as an observation, has nothing recorded
  // to match against and gets re-detected, and re-pushed, every time. Same
  // "not restated" discipline as propositions, extended to the one other
  // place a reread's own output can recur.
  const priorContestKeys = new Set(
    priorLines.filter((l) => l.schema === "EOTContest@1")
      .flatMap((l) => (l.readings ?? []).map((r) => key({ at: l.at, end1: r.end1, label: r.label, end2: r.end2 })))
  );

  let contests = 0, alreadySettled = 0, newCount = 0;
  for (const l of fresh) {
    if (priorContestKeys.has(key(l))) { alreadySettled += 1; continue; }
    const rivals = (priorByAt.get(atKey(l)) ?? []).filter((r) => fold(r.label) !== fold(l.label) || fold(r.end1) !== fold(l.end1) || fold(r.end2) !== fold(l.end2));
    if (rivals.length) {
      contests += 1;
      push({
        schema: "EOTContest@1", at: l.at, role: "proposition",
        kind: "untyped",
        readings: [
          { pass: 1, end1: rivals[0].end1, label: rivals[0].label, end2: rivals[0].end2 },
          { pass: 2, end1: l.end1, label: l.label, end2: l.end2 },
        ],
        needs: "typing — individuation, provenance, force or grain — before a source can settle it (kernel/notes.js). Both passes read the same bytes, so this address is ambiguous rather than one pass being wrong.",
      });
      continue;
    }
    newCount += 1;
    push({ ...l, seq: undefined, pass: 2, foundOnReread: true });
  }
  delta[0].delta.new = newCount;
  delta[0].delta.contests = contests;
  delta[0].delta.alreadySettled = alreadySettled;
  lines.length = 0;
  lines.push(...priorLines, ...delta.map((d) => (d.seq === undefined ? { ...d, seq: nextSeq++ } : d)));
  console.log(`reread delta: ${unchanged.length} already recorded (not restated), ${newCount} newly found, ${contests} contested addresses, ${alreadySettled} already-settled contests (not restated), ${rebound.length} rebound (same clause, newly resolved referent)`);
}

const outDir = path.join(HERE, "results");
fs.mkdirSync(outDir, { recursive: true });
const base = `${path.basename(sourcePath, ".txt")}-ch${READ_CHAPTER}`; // a ledger per chapter — one file per reading, never overwritten by the next
const jsonlPath = path.join(outDir, `${base}.eot.jsonl`);
fs.writeFileSync(jsonlPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");

// This reading's own earned prior, for whatever reads next — including a
// reread of this same chapter.
fs.mkdirSync(path.join(HERE, "results"), { recursive: true });
fs.writeFileSync(
  path.join(HERE, "results", `${path.basename(sourcePath, ".txt")}-ch${READ_CHAPTER}.prior.json`),
  JSON.stringify({ chapter: READ_CHAPTER, verbs: [...ownVerbs], cast: [...surfaceToReferent] }, null, 1),
);

const tree = project(lines);
fs.writeFileSync(path.join(outDir, `${base}.projected.json`), JSON.stringify(tree, null, 1));

const count = (r) => lines.filter((l) => l.role === r && l.schema === "EOTObservation@1").length;
const depthOf = (n, d = 0) => (n.children.length ? Math.max(...n.children.map((c) => depthOf(c, d + 1))) : d);
console.log(`${lines.length} lines — ${count("section")} sections, ${count("paragraph")} paragraphs, ${count("sentence")} sentences, ${count("proposition")} propositions, ${lines.filter((l) => l.grain_gap).length} grain gaps, ${lines.filter((l) => l.schema === "EOTRefusal@1").length} refusals, ${lines.filter((l) => l.schema === "EOTAbsence@1").length} typed absences, ${lines.filter((l) => l.schema === "EOTRevision@1").length} revisions`);
console.log(`expectations: ${lines.filter((l) => l.role === "expectation").length} lines, ${lines.filter((l) => l.movesHolograph).length} of which move the holograph`);
console.log(`SIG row: ${lines.filter((l) => l.role === "entity").length} entities, ${lines.filter((l) => l.role === "void").length} voids, ${lines.filter((l) => l.role === "admission").length} lens acts`);
console.log(`referent join: ${lines.filter((l) => l.end1Ref || l.end2Ref).length} arrangements carry a referent id; join reach ${JSON.stringify(refCounters)}`);
console.log(`projection: ${tree.length} roots, max nesting depth ${Math.max(...tree.map((t) => depthOf(t)))}`);
console.log(`jsonl ${(fs.statSync(jsonlPath).size / 1024).toFixed(1)} KB against a source of ${(raw.length / 1024).toFixed(1)} KB`);
console.log(`-> ${path.relative(process.cwd(), jsonlPath)}`);
