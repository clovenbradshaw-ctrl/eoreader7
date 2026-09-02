// speaker.js — the speaker boundary (Tier 4 #11): epistolary "I" bound to
// its section's DECLARED author, as a binding table beside immutable text.
//
// THE DEFECT (pinned as future work since the Dracula cast cleanup, user
// direction verbatim: "yeah we need the activation of who is speaking as a
// boundary, pin that"): in an epistolary novel every "I" is a different
// person depending on which journal the sentence sits in, and a reader
// with no section boundary either drops all of them or binds them to
// whoever is textually nearest — both wrong. The material DECLARES its
// speakers, in headings ("JONATHAN HARKER'S JOURNAL", "_Letter, Lucy
// Westenra to Mina Murray_", "DR. SEWARD'S DIARY"), and this module reads
// those declarations rather than inferring anything.
//
// WHAT IS RECEIVED AND WHAT IS READ. The document-kind words (journal,
// diary, letter, log, memorandum, telegram) are a RECEIVED closed class
// with a named giver — the same standing honorifics/determiners already
// have (priors.js's discipline): a short English genre lexicon is
// received vocabulary, not a rule invented per book. Everything else is
// read from the material's own bytes: the heading shapes are structural
// (an isolated line, set apart by blank lines, carrying a kind-word), the
// author is the possessive or from-phrase INSIDE that heading, and the
// section is simply the span until the next heading.
//
// A BINDING TABLE, NEVER A REWRITE — P56's own named absence
// ("resolvePronounSubjects still rewrites text instead of holding an
// {occurrence -> referent} binding beside immutable edges"): sections and
// speakers are returned as spans + names; no byte of the material moves.
//
// WHAT THIS UNLOCKS, named: per-narrator testimony (a journal's "I" is a
// WITNESS with a name — the crown can attribute a section's claims to
// Jonathan Harker rather than to "dracula.txt"), and first-person pronoun
// binding at the section grain. Neither is wired here; this is the
// boundary itself.

/** The received genre lexicon. Giver: ordinary English epistolary-novel
 *  furniture (journal/diary/letter/log/memorandum/telegram/phonograph),
 *  the same received-closed-class standing as HONORIFIC_TITLES. */
export const DOCUMENT_KINDS = Object.freeze([
  "journal", "diary", "letter", "log", "memorandum", "telegram", "phonograph",
]);
export const DOCUMENT_KINDS_META = Object.freeze({
  giver: "lang/en epistolary furniture — received closed class, the HONORIFIC_TITLES posture",
});

const fold = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[‘’]/g, "'");

const KIND_RE = new RegExp(`\\b(${DOCUMENT_KINDS.join("|")})\\b`, "i");
// the author inside a heading: a possessive before the kind-word
// ("JONATHAN HARKER'S JOURNAL"), or a from-phrase ("Letter from Miss Mina
// Murray to ..."), or the letter-comma form ("Letter, Lucy Westenra to ...")
const POSSESSIVE_RE = /([\p{Lu}][\p{L}.\s]*?)'s\s+\p{L}/iu;
// from-phrase and letter-comma authors run to the " to " that names the
// RECIPIENT, or to the heading's end — never to an internal period or
// comma, because names carry both ("Quincey P. Morris", "Samuel F.
// Billington & Son, Solicitors, Whitby" — a firm IS the letter's writer).
// Measured on the real book: the [,.]-terminated first cut produced
// "Quincey P" and "Samuel F".
const authorSpan = (str) => {
  const cut = str.search(/\s+to\b/i);
  const span = (cut >= 0 ? str.slice(0, cut) : str).trim().replace(/[.,\s]+$/u, "");
  return /^\p{Lu}/u.test(span) ? span : null;
};
const FROM_RE = /\bfrom\s+(.+)$/iu;
const COMMA_RE = /^[^,]*,\s*(.+)$/u;

/** Is this line a section heading, and who does it declare? */
export function readHeading(line) {
  const original = String(line ?? "").trim();
  const raw = original.replace(/^_+|_+\.?$/g, "").replace(/--.*$/, "").trim();
  if (!raw || raw.length > 120) return null;
  // THE STRUCTURAL GATE, first: a heading is typographically set apart —
  // underscore-wrapped (Gutenberg's italics: "_Letter, Lucy Westenra..._")
  // or an all-caps line ("JONATHAN HARKER'S JOURNAL") — and ordinary prose
  // that merely CONTAINS a kind-word ("I wrote in my journal all evening")
  // is neither. This is structure, not vocabulary: the kind-word only says
  // WHAT the section is once the line's own typography says it IS one.
  const wrapped = /^_/.test(original);
  const hasLower = /\p{Ll}/u.test(raw);
  if (!wrapped && hasLower) return null;
  if (!KIND_RE.test(raw)) return null;
  const f = fold(raw);
  const kind = f.match(KIND_RE)[1].toLowerCase();
  let m = f.match(POSSESSIVE_RE);
  if (m) return { kind, speaker: m[1].trim(), how: "possessive" };
  m = f.match(FROM_RE);
  if (m) { const a = authorSpan(m[1]); if (a) return { kind, speaker: a, how: "from-phrase" }; }
  m = f.match(COMMA_RE);
  if (m && new RegExp(`^\\s*${kind}`, "i").test(f)) { const a = authorSpan(m[1]); if (a) return { kind, speaker: a, how: "letter-comma" }; }
  // a kind-word with no readable author ("LOG OF THE DEMETER" names a
  // ship's log whose writer is inside the section, not the heading) is a
  // BOUNDARY WITHOUT A SPEAKER — typed, never guessed
  return { kind, speaker: null, how: "kind-only" };
}

/**
 * speakerSections(text) — the binding table: every declared section as
 * { start, end, heading, kind, speaker, how }, byte offsets into the text
 * AS GIVEN (nothing normalized before offsets are computed — P5.2).
 * Text before the first heading is front matter, deliberately unclaimed.
 */
export function speakerSections(text) {
  const src = String(text ?? "");
  const sections = [];
  // a plain offset walk, not a /^.*$/gm exec loop — a zero-length match on
  // an empty line never advances lastIndex, and the first cut hung on the
  // real 850KB book exactly that way (found by the timeout, not by review)
  let at = 0;
  for (const line of src.split("\n")) {
    const start = at;
    at += line.length + 1;
    if (!line.trim()) continue;
    const h = readHeading(line);
    if (!h) continue;
    sections.push({ start, headingEnd: start + line.length, heading: line.trim(), ...h });
  }
  for (let i = 0; i < sections.length; i++) sections[i].end = i + 1 < sections.length ? sections[i + 1].start : src.length;
  return sections;
}

/** Who speaks at a byte offset? null before the first heading and inside
 *  speakerless sections — a typed absence, never a nearest-guess. */
export function speakerAt(sections, offset) {
  for (const s of sections) if (offset >= s.start && offset < s.end) return s.speaker;
  return null;
}
