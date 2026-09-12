// illustration-rec.mjs — detect a Gutenberg `[Illustration...]` block,
// mechanically, no model needed. The image-CAPTION sibling of
// table-rec.mjs (a table has no pixels either; both are text-transcribed
// placeholders for something the plain-text file cannot itself show).
//
// User direction, verbatim: "try to 'see' the illustrations in pride and
// prejudice" — checked first, honestly, before writing anything: this
// corpus holds no actual image bytes for this book, only OHCHR-style
// bracketed transcriber's notes (`pg1342_Pride_and_Prejudice.txt`, Hugh
// Thomson's 1894 illustrated edition). There is nothing for a vision
// model to look AT here; what the reader can genuinely do is recognize
// the bracket as its own structural unit — table-rec.mjs's own precedent
// for "safe but blind" applies identically: `extractRelations` run on an
// illustration caption does not crash or fabricate a fact (a caption has
// no earned verb either), but nothing on the record says WHY, and the
// bracket's own text can corrupt an unrelated detector that has no reason
// to expect it (see the chapter-numbering collision below).
//
// THE SHAPE, confirmed against the real file, not assumed from one
// example: `[Illustration` opens (with or without a following `:` and
// caption on the SAME line — some are bare `[Illustration]`, self-closing
// immediately); the block may run several lines, including blank ones and
// a NESTED `[_Copyright 1894 by George Allen._]` bracket, closing with
// either a single `]` alone or `]]` (the copyright's own close immediately
// followed by the outer one, on the same line — line 699 of the real
// file: "[_Copyright 1894 by George Allen._]]"). A fixed-lookahead regex
// cannot tell a bare close from a nested one apart; a DEPTH COUNTER can,
// uniformly, with no special-casing per shape — the same reason JSON
// parsers track bracket depth instead of regexing for the first `}`.
//
// THE COLLISION THIS CLOSES, found by reading the real file (not
// hypothesized): P&P's real "Chapter I." is not printed as its own plain
// line at all — it is the LAST fragment of the book's own illustrated
// title block, `[Illustration: ·PRIDE AND PREJUDICE·\n\n\n\n\nChapter
// I.]` (line 665-670) — Hugh Thomson's decorative chapter-opener, title
// and chapter number drawn as one piece of art, transcribed as one
// bracket. `structure-rec.mjs`'s own candidate/heading regexes require a
// heading LINE, blank-bounded — "Chapter I.]" is neither blank-bounded
// (four blank lines precede it, but the line itself ends in a stray `]`,
// not a clean line) nor a bare heading (the trailing bracket is not part
// of any known convention). So the REAL first heading is never matched at
// all, and whatever the detector finds next (Chapter II's own plain
// heading, printed normally, no illustration) becomes "chapter 1" —
// silently off by one for the whole book. `detectIllustrations`, run
// BEFORE heading detection, lets a caller answer a different, narrower
// question honestly instead of guessing text out of an illustration's own
// caption (judged, and refused, as too edition-specific to patch text-side
// — see eot-jsonl.mjs's own use of this file): "is the numeral sequence
// missing its expected first member, and does a known illustration block
// sit where that member should be" — a typed, disclosed gap, not a
// fabricated heading.
//
// usage: node illustration-rec.mjs <path-to-document.txt>
import fs from "node:fs";

const OPEN_RE = /\[Illustration\b/g;

export function detectIllustrations(raw) {
  const illustrations = [];
  OPEN_RE.lastIndex = 0;
  let m;
  while ((m = OPEN_RE.exec(raw))) {
    const openAt = m.index;
    let depth = 0;
    let i = openAt;
    let closedAt = -1;
    for (; i < raw.length; i += 1) {
      if (raw[i] === "[") depth += 1;
      else if (raw[i] === "]") {
        depth -= 1;
        if (depth === 0) { closedAt = i + 1; break; }
      }
    }
    if (closedAt === -1) {
      // Depth never returned to zero before EOF — a real, typed gap
      // (an unterminated bracket, or this file's own scan logic meeting a
      // shape it doesn't know), never a silent guess at where it "should"
      // end.
      illustrations.push({ start: openAt, end: raw.length, closed: false });
      OPEN_RE.lastIndex = raw.length;
      continue;
    }
    // Capture the caption text for disclosure: everything between the
    // opening bracket and either a `:` (if present, same line) and the
    // first non-blank content line, trimmed — best-effort, never load-
    // bearing for the span itself, which is address-verified below.
    const inner = raw.slice(openAt, closedAt);
    const captionMatch = inner.match(/\[Illustration:?\s*([^\n]*)/);
    illustrations.push({ start: openAt, end: closedAt, closed: true, captionFirstLine: (captionMatch?.[1] ?? "").trim() });
    OPEN_RE.lastIndex = closedAt;
  }
  return illustrations;
}

/** missingLeadingOrdinal(numerals) → the expected-but-absent first member
 * of an otherwise-monotonic numeral sequence, or null. Pure arithmetic —
 * "2,3,4,5..." is missing "1" the same way any arithmetic sequence with a
 * gap at its own start is; not a guess, not a model call. Used to decide
 * WHETHER to even look for an illustration-swallowed heading before
 * bothering to look, per this repo's own "never spend a check you have no
 * reason to run" discipline. */
export function missingLeadingOrdinal(numerals) {
  const nums = numerals.map(Number).filter((n) => Number.isFinite(n));
  if (nums.length < 2) return null;
  const [first, second] = nums;
  if (second - first === 1 && first > 1) return first - 1;
  return null;
}

// ── standalone report ─────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const bookPath = process.argv[2];
  if (!bookPath) { console.error("usage: node illustration-rec.mjs <path-to-document.txt>"); process.exit(1); }
  const raw = fs.readFileSync(bookPath, "utf8");
  const found = detectIllustrations(raw);
  if (!found.length) {
    console.log("No [Illustration...] block found.");
  } else {
    console.log(`${found.length} illustration block(s) found:`);
    for (const b of found) console.log(`  [${b.start}, ${b.end}]${b.closed ? "" : " UNCLOSED"} — "${(b.captionFirstLine ?? "").slice(0, 60)}"`);
  }
}
