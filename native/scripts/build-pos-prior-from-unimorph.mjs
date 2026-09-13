// eoreader7 · build-pos-prior-from-unimorph — UniMorph's raw
// lemma/form/features TSV in, POSPrior@1 out: the SAME schema and the SAME
// consumer (native/adapters/text/wordclass.js::classifyWord,
// `posPrior.forms[lower] -> {UPOS: count}`) build-pos-prior.mjs already
// feeds from a Universal Dependencies treebank. This is a second BUILDER
// for the identical artifact, not a new mechanism — chosen over a
// treebank build for languages where a UD treebank is comparatively small
// (a treebank's coverage is bounded by whatever word forms happened to
// occur in its own finite annotated sentences) while UniMorph's paradigm
// tables enumerate every inflected form of every lemma in its dictionary,
// independent of any one corpus — the same reasoning already measured and
// shipped once in this project family for a directly analogous problem
// (the-fold CLAUDE.md, "Closing more of the MINE-1 gap — a received prior
// beats induction, tested": UniMorph-derived verb forms beat both a
// treebank-vocabulary gate AND a witness/model-inference alternative,
// on real material, by a wide margin — a received lexicon over induction
// or a live judgment call, wherever one already exists and covers the
// need).
//
// LANGUAGE-GENERAL BY CONSTRUCTION, same as build-pos-prior.mjs: UniMorph
// publishes one 3-column TSV layout (LEMMA  FORM  FEATURES, tab-separated,
// FEATURES a `;`-joined bundle whose first slot is the POS) per language
// repo at github.com/unimorph/<iso-639-3>, so this script has no
// per-language code, only a CLI argument.
//
// THE POS MAPPING IS DECLARED AND DELIBERATELY NARROW — read this before
// trusting the output on a language not yet checked by hand. UniMorph's
// POS tags are V (verb), N (noun), ADJ (adjective) at the bare level, plus
// DOTTED SUBTYPES for non-finite verb forms that some language datasets
// carry (observed here: V.PTCP participle, V.CVB converb, V.MSDR
// masdar/verbal noun — Korean and Hebrew both carry these; Greek, Turkish,
// Farsi do not in the files this script was built against). A participle,
// converb or masdar is NOT a finite clause-level predicate — mapping any
// of them to UD's VERB would silently readmit exactly the failure mode
// this whole prior exists to close (a non-finite form standing in for a
// sentence's main verb). So ONLY THE BARE TAGS MAP: V -> VERB, N -> NOUN,
// ADJ -> ADJ. Every dotted subtype, and every other bare tag this file
// does not name (PRO, DET, ADP, CONJ, ADV, ...), is DROPPED — not guessed,
// not forced into the nearest category — which is the safe direction by
// this project's own P56 asymmetric rule: an out-of-vocabulary connector
// is never refused, only a SETTLED non-verb is, so a dropped row costs
// nothing but a missed refusal, never a false one.
//
// SOURCE, FETCHED SEPARATELY (no ambient network I/O in a data-transform
// script, build-construction-prior.mjs's own discipline):
//   curl -sSL -o ell.tsv https://raw.githubusercontent.com/unimorph/ell/master/ell
// (one file per language; Hebrew ships several — heb, heb_voc, heb_unvoc,
// from_UD_unvoc — this script takes exactly the file path it is given and
// makes no choice among them; the caller states which one).
//
// Usage: node native/scripts/build-pos-prior-from-unimorph.mjs <in.tsv> <out.json> <lang-iso3> <giver-url>

import { readFileSync, writeFileSync } from "node:fs";

const IN = process.argv[2];
const OUT = process.argv[3];
const LANGUAGE = process.argv[4];
const GIVER_URL = process.argv[5];
const TAB = String.fromCharCode(9);

if (!IN || !OUT || !LANGUAGE || !GIVER_URL) {
  console.error("usage: node build-pos-prior-from-unimorph.mjs <in.tsv> <out.json> <lang-iso3> <giver-url>");
  process.exit(1);
}

// The declared, narrow mapping — see the header for why dotted subtypes
// and every other bare tag are intentionally absent rather than guessed.
const UNIMORPH_TO_UPOS = Object.freeze({ V: "VERB", N: "NOUN", ADJ: "ADJ" });

const raw = readFileSync(IN, "utf8");

let rowsRead = 0;
let rowsMapped = 0;
let rowsDroppedTag = new Map(); // which POS-ish first token was seen and dropped, with a count — disclosed, not silent
const forms = new Map();

for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  const cols = line.split(TAB);
  if (cols.length < 3) continue;
  rowsRead += 1;
  const form = cols[1]?.toLowerCase();
  const featBundle = cols[2] ?? "";
  const pos = featBundle.split(";")[0]?.trim();
  if (!form || !pos) continue;
  const upos = UNIMORPH_TO_UPOS[pos];
  if (!upos) {
    rowsDroppedTag.set(pos, (rowsDroppedTag.get(pos) ?? 0) + 1);
    continue;
  }
  rowsMapped += 1;
  if (!forms.has(form)) forms.set(form, {});
  const row = forms.get(form);
  row[upos] = (row[upos] ?? 0) + 1;
}

const out = {};
for (const [form, row] of forms) out[form] = row;
const ambiguousForms = [...forms.values()].filter((row) => Object.keys(row).length > 1).length;
const droppedTags = Object.fromEntries([...rowsDroppedTag.entries()].sort((a, b) => b[1] - a[1]));

writeFileSync(
  OUT,
  JSON.stringify({
    schema: "POSPrior@1",
    language: LANGUAGE,
    provenance: {
      giver: `UniMorph — ${GIVER_URL} (inflectional paradigm table, not a treebank)`,
      license: "CC BY-SA 3.0 (UniMorph's stated project licence; verify per-language repo before redistribution)",
      source: GIVER_URL,
      builder: "eoreader7 native/scripts/build-pos-prior-from-unimorph.mjs",
      sentences_read: null,
      tokens_read: rowsMapped,
      rows_read: rowsRead,
      distinct_forms: forms.size,
      ambiguous_forms: ambiguousForms,
      dropped_tags: droppedTags,
      note:
        "built from UniMorph inflectional paradigms, not a UD treebank — coverage is every attested inflected " +
        "form of every lemma in UniMorph's dictionary for this language, not bounded by one corpus's own sentences. " +
        "Only bare V/N/ADJ map to VERB/NOUN/ADJ; every dotted subtype (participle, converb, masdar, ...) and every " +
        "other UniMorph tag is DROPPED rather than guessed — see dropped_tags for what and how much. " +
        "Ambiguity preserved, never resolved: a form keeps every UPOS tag it was ever mapped to, with real counts.",
    },
    forms: out,
  }),
);
console.error(
  `${LANGUAGE}: ${rowsRead} rows read, ${rowsMapped} mapped (V/N/ADJ), ${forms.size} distinct forms ` +
    `(${ambiguousForms} ambiguous), dropped tags: ${JSON.stringify(droppedTags)} -> ${OUT}`,
);
