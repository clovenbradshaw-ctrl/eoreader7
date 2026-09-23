// english-ladder.mjs — the curriculum, declared. Handle: Sullivan.
//
// A DIFFERENT axis from this file's own sibling. LAVAR.md's ladder (§4)
// grades DIFFICULTY: McGuffey's Readers → Aesop/Grimm/Andersen/Potter/Alice
// → short stories → novels — how sophisticated a reading needs to be. This
// ladder grades PERIOD AND REGION: when and where the English was written,
// which is a fact about the LANGUAGE, not about how hard the material is.
// Wyatt's sonnets are not "difficult" by McGuffey's own scale; they are
// FOUR HUNDRED YEARS OLD, in an English whose spelling, morphology and
// borrowed vocabulary (French "hélas", Latin "Noli me tangere") are not
// today's. A reader fluent in modern Wikipedia prose is not thereby fluent
// in 1557's English, and the two ladders answer two different questions.
//
// LEARN AS A PERSON DOES — LAYER BY LAYER, NO HACKS (user direction). A
// person does not acquire a language by running a capitalization regex.
// Four real layers, in acquisition order, each naming the real organ that
// carries it — no metaphor standing in for a mechanism:
//
//   L0  SOUND.        Handle: Tadoma. `live_priors/derived-priors/
//                      pronunciation-priors/pronunciation-eng.json` — a
//                      real, sound-first PronunciationPrior@1 (espeak-ng
//                      synthesis, IPA + sha256-pinned WAV per word).
//                      Measured this session, not assumed: its coverage
//                      is the ~504-word UDHR text ALONE (coverage("eng")
//                      = {total:504, missing:0}) — every content word in
//                      Wyatt's own sonnet (list, hunt, hind, wearied,
//                      diamonds, tame, caesar) and every word tried from
//                      the Lincoln article returns a typed word_gap
//                      refusal, not a fabricated guess. Extending it to
//                      any rung's own vocabulary is real, named, unbuilt
//                      work (build-pronunciation-general.mjs). SECOND,
//                      DEEPER LIMIT, also measured directly this turn: a
//                      word is synthesized ALONE, no sentence around it —
//                      espeak-ng -v en-us --ipa on the real sentences "I
//                      read the book yesterday" and "I read books every
//                      day" returns the IDENTICAL IPA (ɹˈiːd) for both,
//                      because tense lives in the sentence, not the bare
//                      spelling. Every heteronym tried this way (lead,
//                      record, content, desert, close, tear, bow, wind)
//                      picked exactly one silent default. The manifest's
//                      own shape (one IPA per spelling) cannot represent
//                      this even once extended — a real fix needs
//                      sentence-context synthesis keyed by the actual
//                      grammatical reading (tense, or noun/verb stress
//                      shift), pointed at `native/priors/parser-eng-
//                      ewt.json` (a real, already-on-disk full dependency
//                      parser carrying tense/role PER TOKEN IN CONTEXT,
//                      unlike the bare per-form POS prior L2 uses, which
//                      cannot see tense for "read" at all — both readings
//                      share one spelling). Named here as unbuilt, never
//                      implied solved by vocabulary breadth alone. Any
//                      specimen genuinely spoken/recorded is heard
//                      through real transcription instead (`transcribe.js`,
//                      real Whisper, fixed under P183 this session — wasm
//                      + fp32, not the silently-wrong GPU/fp16 default) —
//                      real recorded speech carries its own true reading
//                      and needs no disambiguation at all.
//   L1  SCRIPT.        The raw bytes, unjudged — no admission decision yet.
//   L2  HEARD PATTERN.  `adapters/text/nominal-beings.js` — a being is a
//                      recurring NOUN/PROPN-typed stem via a RECEIVED POS
//                      prior, with NO capitalization dependency at all.
//                      This is the genuinely heard-rule-compliant layer
//                      (LEVELS.md's own S2): a listener with no written
//                      form still has word-class regularities from
//                      company and recurrence.
//   L3  SCRIPT REFINEMENT. Capitalization (`surfaces.js::extractSurfaces`)
//                      — an ADDITIVE layer on top of L2, consulted only
//                      where the script actually carries case, NEVER a
//                      substitute for L2 and never consulted first. The
//                      additive-layers rule this codebase already holds:
//                      the base layer (L2) must be a fine reading alone;
//                      every layer above only adds, never degrades it —
//                      the identical shape Chomsky's own organ already
//                      proves (relations-language.js: no declared
//                      RoleConfig, a universal GFP base runs; a config
//                      brings a specialized mode online, never replacing
//                      the base for a language that lacks one).
//
// EVERY RUNG IS DECLARED, NOT MEASURED (LAVAR.md's own rule, applied to
// this axis): a period boundary and a region are historical facts about
// the author, cited with real dates, never inferred from the text. What
// IS measured is a separate, later step — running each rung's specimens
// through L0-L3 in order and recording what holds and what breaks, the
// same way greek-competence.test.mjs/sanskrit-competence.test.mjs already
// measure Greek and Sanskrit. This file is the declared ladder; measuring
// it layer by layer is real, separate, unbuilt work except where noted —
// "measured" stays null until a real run has actually happened.
//
// SOURCES ARE NAMED, NEVER ASSUMED PUBLIC DOMAIN BY GUESS. Every author
// below died well over 70 years ago (US/UK terms both satisfied many
// times over except where noted); every corpus path either already
// exists in this checkout (verified this session) or names the Project
// Gutenberg id it would be fetched from, never a vague "the collected
// works."

export const SCHEMA = "EnglishLadder@1";
export const GIVER = "eoreader7:native/eval/lavar/english-ladder.mjs";

/** The four acquisition layers, in order — named here once so a rung's own
 * `measured` field can cite which layer(s) a real run actually covered,
 * rather than a bare "it worked." */
export const LAYERS = Object.freeze(["L0-sound", "L1-script", "L2-heard-pattern", "L3-script-refinement"]);

/**
 * One rung: a period, a region (where the English itself was shaped — not
 * merely where the author was born), representative authors/works with
 * real dates, a corpus pointer (existing path or a named Gutenberg id to
 * fetch), and `measured` — null until a real competence run has recorded
 * real numbers here, exactly as `chomsky.test.mjs`'s own header already
 * discloses "measured 2026-09-20: 0" rather than asserting success.
 */
export const RUNGS = Object.freeze([
  {
    id: "old-english",
    period: "c. 450 – 1150",
    region: "Anglo-Saxon England (Wessex, Mercia, Northumbria — dialects, not one language)",
    representative: [
      { author: "Unknown (Beowulf poet)", work: "Beowulf", date: "composed c. 700–1000, MS c. 1000" },
      { author: "Unknown (Exeter Book scribes)", work: "The Wanderer, The Seafarer", date: "MS c. 960–990" },
    ],
    corpus: { status: "not fetched", note: "Gutenberg holds facing-page Old English/modern-English editions (e.g. pg16328, Beowulf, Clark Hall trans.) — the OLD ENGLISH text itself is what this rung needs, not the translation." },
    note: "Not intelligible to a modern-English reading pipeline at all without a dedicated Old English tokenizer/prior — a different script-era problem than case or diacritics, closer to reading a different language that happens to share an alphabet. L0 is also honestly unavailable in the SAME way: pronunciation-eng.json is a MODERN English prior — synthesising Old English through it would render modern sounds for medieval spellings, a real, disclosed mismatch, not usable as L0 without a dedicated Old English pronunciation reconstruction.",
    measured: null,
  },
  {
    id: "middle-english",
    period: "c. 1150 – 1500",
    region: "England, regionally split (Chaucer: London/East Midland; the Gawain-poet: Northwest Midland — the SAME period, genuinely different dialects)",
    representative: [
      { author: "Geoffrey Chaucer", work: "The Canterbury Tales", date: "c. 1387–1400" },
      { author: "Unknown (Gawain-poet)", work: "Sir Gawain and the Green Knight", date: "c. 1375–1400" },
    ],
    corpus: { status: "not fetched", note: "Gutenberg pg2383 (Canterbury Tales, Middle English text, ed. Skeat) already exists as a real, freely available edition." },
    note: "Readable-with-effort by a modern eye; morphology (final -e, verb endings) and orthography both differ sharply from Early Modern English below. The same L0 mismatch as Old English applies, smaller in degree — Chaucer's Middle English pronunciation is reconstructed by specialists, not something pronunciation-eng.json's modern prior can honestly stand in for.",
    measured: null,
  },
  {
    id: "early-modern-verse",
    period: "1503 – 1616",
    region: "England (London and the court — Wyatt at Henry VIII's court; Marlowe and Shakespeare, the London stage)",
    representative: [
      { author: "Sir Thomas Wyatt", work: "“Whoso List to Hunt, I Know Where Is an Hind”", date: "1503–1542 (published posthumously, Tottel's Miscellany, 1557)" },
      { author: "Christopher Marlowe", work: "Doctor Faustus; Tamburlaine; Hero and Leander", date: "1564–1593" },
      { author: "William Shakespeare", work: "the plays and sonnets", date: "1564–1616" },
    ],
    corpus: {
      status: "partial — real material already on disk, verified this session",
      onDisk: [
        "01-literature-books/renaissance-poetry/wyatt-whoso-list-to-hunt.txt (fetched and saved this session, provenance in the file's own header)",
        "eval/lavar/results/lp-shakespeare.* (source: 01-literature-books/gutenberg/pg100_Complete_Works_of_Shakespeare.txt, a 55KB SAMPLE of the complete works, not the whole 5MB+ text)",
        "eval/lavar/results/lp-othello.* (source: 15-western-canon/folger-shakespeare/Othello.txt, the full Folger edition)",
        "eval/lavar/results/lp-kinglear.* (source: 15-western-canon/folger-shakespeare/King_Lear.txt, the full Folger edition)",
      ],
      missing: [
        "Marlowe: nothing on disk anywhere in this checkout. Gutenberg pg1094 (The Works of Christopher Marlowe) is the named next fetch — not yet done.",
        "The rest of Shakespeare beyond the 55KB sample and the two Folger plays (37 plays, 154 sonnets total) — a real, large, multi-session fetch-and-read job, not attempted here.",
      ],
    },
    note: "‘Sithens’, ‘list’ (= wishes), ‘hath’/‘doth’ endings, and an embedded French phrase (‘hélas’) and a Latin one (‘Noli me tangere’) inside one 14-line English sonnet — real material for testing whether nominal-beings.js's L2 admission survives archaic inflection and code-switched foreign phrases, or honestly drops them as unattested (the expected outcome for the Latin/French spans, since pos-prior-eng.json was built from a modern English treebank). L0 is CLOSER to honest here than for Old/Middle English — Early Modern English's own sounds are well-studied (“Original Pronunciation” reconstructions exist), but pronunciation-eng.json is still a MODERN synthesis; using it for L0 on this rung must be labelled as modern pronunciation of period spelling, never as OP itself.",
    measured: {
      date: "2026-09-22",
      layers: ["L0-sound", "L2-heard-pattern", "L3-script-refinement"],
      driver: "a direct run over the real Wyatt corpus file (see corpus.onDisk above)",
      result: "L0: 55 of the sonnet's own words synthesized this session (list, hunt, hind, wearied, diamonds, tame, caesars, noli, tangere all now resolve — 0 refused of the sonnet's own vocabulary after the run, up from 100% refused before it). L2 (minOccurrences 2): exactly 2 beings, ‘list’ and ‘hunt’ — both real, both the poem's own central motif, ZERO false positives; sparse by construction, a 14-line poem rarely repeats a word twice. L3 (capitalisation): 7 candidates (And, Caesar, Draw, Fainting, Noli, Sithens, There) — 5 of 7 are pure Renaissance verse-line-initial capitalisation noise (every line opens capitalized regardless of grammar), only ‘Caesar’ is a genuine proper noun; L3 alone would be actively misleading on this specimen. A real, measured period sense-shift: nominalClass(‘hind’) reads ADJ in the modern treebank (surviving mainly in ‘hind legs’), though Wyatt uses it as the poem's own noun (the deer) — not a bug, a fact about how the word moved in 500 years.",
    },
  },
  {
    id: "18th-19th-century-branching",
    period: "1660 – 1900",
    region: "British English (England) diverging from American English (the United States) as a real, distinct regional split — not a period split alone",
    representative: [
      { author: "Jane Austen", work: "Pride and Prejudice", date: "1813", region: "England" },
      { author: "Charles Dickens", work: "Great Expectations", date: "1861", region: "England" },
      { author: "Mark Twain", work: "The Adventures of Huckleberry Finn", date: "1884", region: "United States (Missouri vernacular, deliberately non-standard)" },
      { author: "Nathaniel Hawthorne", work: "The Scarlet Letter", date: "1850", region: "United States (New England)" },
    ],
    corpus: { status: "likely already present", note: "live_priors/01-literature-books/gutenberg/ holds 56 entries as of this session; Austen/Dickens/Twain are exactly the kind of canonical PD text that corpus already tends to carry — not individually verified here, named as the first check before any fetch." },
    note: "By this rung, pronunciation-eng.json's modern synthesis is honestly usable as real L0 sound with no period caveat needed — 19th-century English pronunciation is close enough to today's that the disclosed mismatch above has genuinely closed. Twain's own deliberate regional-dialect spelling (‘gwyne’, dropped g's) is still a real, separate L2 question: does nominal-beings.js's stem-grouping fold a dialectal spelling to its standard-English being, or correctly refuse to (the POS prior was never built from dialect transcription)? An honest open question, not yet run.",
    measured: null,
  },
  {
    id: "contemporary-encyclopedic",
    period: "2000s – present",
    region: "Global written English (Wikipedia's own house style, transnational)",
    representative: [
      { author: "Wikipedia contributors", work: "Abraham Lincoln; Alan Turing (English-language articles)", date: "current revision as fetched" },
    ],
    corpus: { status: "already measured this session", note: "eval/the-fold/fixtures/wikipedia-abraham-lincoln.html, wikipedia-alan-turing.html — real committed fixtures." },
    measured: {
      date: "2026-09-22",
      layers: ["L2-heard-pattern"],
      driver: "adapters/text/nominal-beings.test.mjs (the flagship English case)",
      result: "546 beings on the Lincoln article via extractReadable, top “lincoln” at 529 occurrences; 168 of 546 are recurring lowercase content (election, lawyer, career, conviction) the capitalisation-anchored referent index's 1,448 candidates (L3 alone, no L2) never surface.",
    },
  },
  {
    id: "contemporary-bureaucratic",
    period: "2000s – present",
    region: "Government registers — deliberately plural: US federal (Federal Register, CRS reports), UK (Hansard, white papers proper — the term's own origin, a British Parliamentary policy document), and international (UN/EU English, its own genuinely distinct register)",
    representative: [
      { author: "U.S. Government Publishing Office", work: "a Congressional Research Service report or Federal Register notice (both U.S. Government works, public domain by 17 U.S.C. §105, never merely PD by age)", date: "current" },
      { author: "UK Government", work: "an actual White Paper (Crown copyright, NOT public domain the way a US federal work is — the Open Government Licence permits reuse but is a DIFFERENT legal basis and must be named as such if fetched)", date: "current" },
    ],
    corpus: { status: "not fetched", note: "Nothing in this checkout yet. The two named sources have DIFFERENT copyright bases (US federal work: no copyright at all; UK Crown copyright under OGL: copyright exists, reuse is licensed) — a real distinction to get right before fetching either, not a detail to skip." },
    note: "The register this whole ladder was asked to end at, and the one furthest from anything built so far — no corpus, no prior work, named here as the explicit next step rather than attempted under this session's own time pressure. L0 is trivially available (modern pronunciation, no period mismatch); L2/L3 are entirely unrun.",
    measured: null,
  },
]);

/** rungFor(id) — one rung by id, or null. */
export function rungFor(id) {
  return RUNGS.find((r) => r.id === id) ?? null;
}

/** A rung is MEASURED only once a real run recorded real numbers on it —
 * never inferred from the corpus merely existing on disk. */
export function isMeasured(id) {
  return Boolean(rungFor(id)?.measured);
}
