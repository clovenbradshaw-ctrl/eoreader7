// eoreader7 · build-proclitic-prior — Universal Dependencies CoNLL-U in,
// ProcliticPrior@1 out: which single-letter bound proclitics a language's
// own treebank shows fused onto a following word with no space, derived
// mechanically from the treebank's own multi-word-token (MWT) split
// convention — never a hand-typed list of "known articles/prepositions".
//
// WHY THIS EXISTS. heard-surfaces.js finds beings from company alone
// (Firth's before=/after= signal, kind-standing.js) — but a language that
// glues a determiner, conjunction or preposition directly onto the
// following word (Hebrew הפילוסופיות = ה + פילוסופיות, "the philosophies";
// Arabic وأرسطو = و + أرسطو, "and Aristotle") hides that company from the
// mechanism entirely: the glued word looks like it has NOTHING before it
// (a name's own signature, before=^), and a name's own occurrences
// fragment across every proclitic combination it happens to appear with,
// none of them individually recurring enough to register. Measured live,
// real material: a real Hebrew Wikipedia article surfaced "הפילוסופיות"
// (the philosophies) as a false being; a real Arabic Wikipedia article of
// comparable length recovered ZERO proper names at all, because "أرسطو"
// (Aristotle) never once reached minMentions on its own — every mention
// was fused to a different proclitic.
//
// THE GIVER. A UD treebank's own MWT convention IS the giver: when the
// treebank considers "1-2 הקהל" one written unit but annotates it as
// "1 ה (DET)" + "2 קהל (NOUN)", that split is a human annotator's decision
// about the language's own morphology, not an assumption of this script's.
// Reused unmodified for any language sharing UD's column layout — no
// language-specific code here, same discipline as build-pos-prior.mjs.
//
// DERIVATION, MECHANICAL: walk every MWT range line, record the FORM of
// the token immediately after it (the first half of the split), tally by
// raw character (not by UPOS — the same character can be tagged DET in
// one occurrence and SCONJ in another; it is still one proclitic
// character either way). Keep only candidates that are EXACTLY ONE
// Unicode letter (`\p{L}`) — a two-or-more-character MWT first-part
// ("في" "from", "بين" "between") is an ordinary short WORD that happens to
// sit in a rare MWT construction, not a bound clitic, and stripping it
// would risk mangling real words; a single bound letter is unambiguous by
// construction. Kept only above a declared minimum count (never a
// smaller number tuned to admit one specimen's own proclitic).
//
// SOURCE, FETCHED SEPARATELY (no ambient network I/O in a data-transform
// script — build-pos-prior.mjs's own discipline, matched here):
//   curl -sSL -o he_htb-ud-train.conllu \
//     https://raw.githubusercontent.com/UniversalDependencies/UD_Hebrew-HTB/master/he_htb-ud-train.conllu
//   curl -sSL -o ar_padt-ud-train.conllu \
//     https://raw.githubusercontent.com/UniversalDependencies/UD_Arabic-PADT/master/ar_padt-ud-train.conllu
// Both CC BY-SA 4.0 (Universal Dependencies' own stated licence) —
// attribution recorded in the output's own provenance, same treebanks
// pos-heb.json/pos-arb.json were already built from.
//
// Usage: node native/scripts/build-proclitic-prior.mjs <in.conllu> <out.json> <lang> <giver-url> [minCount=100]

import { readFileSync, writeFileSync } from "node:fs";

const IN = process.argv[2];
const OUT = process.argv[3];
const LANGUAGE = process.argv[4];
const GIVER_URL = process.argv[5];
const MIN_COUNT = Number(process.argv[6] ?? 100);
const TAB = String.fromCharCode(9);
const SINGLE_LETTER = /^\p{L}$/u;

if (!IN || !OUT || !LANGUAGE || !GIVER_URL) {
  console.error("usage: node build-proclitic-prior.mjs <in.conllu> <out.json> <lang> <giver-url> [minCount=100]");
  process.exit(1);
}

const raw = readFileSync(IN, "utf8");
const lines = raw.split("\n");

let mwtCount = 0;
const counts = new Map(); // character -> occurrences as an MWT first-part
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith("#") || line.trim() === "") continue;
  const cols = line.split(TAB);
  if (!/^[0-9]+-[0-9]+$/.test(cols[0])) continue; // only MWT range lines
  mwtCount += 1;
  // the very next non-comment data line is the first half of the split
  const next = lines[i + 1];
  if (!next) continue;
  const nextCols = next.split(TAB);
  const form = nextCols[1];
  if (!form) continue;
  counts.set(form, (counts.get(form) ?? 0) + 1);
}

const proclitics = [...counts.entries()]
  .filter(([ch, n]) => SINGLE_LETTER.test(ch) && n >= MIN_COUNT)
  .sort((a, b) => b[1] - a[1]);

const rejectedMultiChar = [...counts.entries()]
  .filter(([ch, n]) => !SINGLE_LETTER.test(ch) && n >= MIN_COUNT)
  .sort((a, b) => b[1] - a[1]);

writeFileSync(
  OUT,
  JSON.stringify({
    schema: "ProcliticPrior@1",
    language: LANGUAGE,
    provenance: {
      giver: `Universal Dependencies — ${GIVER_URL} (train split), human-annotated gold treebank — multi-word-token split convention`,
      license: "CC BY-SA 4.0",
      source: GIVER_URL,
      builder: "eoreader7 native/scripts/build-proclitic-prior.mjs",
      mwt_ranges_read: mwtCount,
      min_count: MIN_COUNT,
      note:
        "derived mechanically from the treebank's own multi-word-token split — each entry is a single letter the treebank annotates as its own token (DET/ADP/CCONJ/AUX/etc.) fused with no space onto the token that followed it in the source text, tallied by character across every UPOS role it was annotated with. Never a hand-typed list of articles/prepositions.",
      excluded_multichar_forms_at_or_above_min_count: rejectedMultiChar.map(([form, n]) => ({ form, n })),
    },
    proclitics: proclitics.map(([ch, n]) => ch),
    counts: Object.fromEntries(proclitics),
  }, null, 2),
);
console.error(
  `${LANGUAGE}: ${mwtCount} MWT ranges -> ${proclitics.length} single-letter proclitics (>= ${MIN_COUNT}x): ` +
    `${proclitics.map(([ch, n]) => `${ch}(${n})`).join(", ")} -> ${OUT}`,
);
