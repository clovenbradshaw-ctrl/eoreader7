// occupancy-host-eval.mjs — occupancy testimony read THROUGH THE REAL
// PIPELINE: the constitutional host (legacy-ported/packages/host/corpus.js)
// admits each text, and an occupant is a MENTION the host made — a referent
// surface it admitted or a pronoun it bound — never a capitalised string.
// Zero model calls. No key from outside the material. (2026-09-28)
//
// WHY THIS RUN EXISTS. occupancy-eval.mjs (registered 2026-09-27) failed O1
// and O2 and read the failure off its own rows: occupants were capitalised
// runs ("He", "Several", "Claims"), definite descriptions were treated as
// positions, and a Wikidata key resolved people BY STRING. Directions since,
// in order: "more than just hyperlinks it should be a referent"; "run it
// through the real pipeline"; "for the capitalisation, use our trusted
// reading pipeline — stop focusing on Wikidata"; "prove what we can do now."
// A first draft of this driver grounded referents to Wikidata items through
// the page's links and scored P39 agreement; that half is withdrawn before
// any run (fetch-occupancy-pages.mjs no longer fetches items). What the
// material testifies is the ground; the pipeline's referents are the units.
//
// PRE-REGISTERED 2026-09-28, before the first run. The reader has read no
// text below through this driver. (Joachim Murat and Frankenstein — the
// latter not in this set — were opened by hand to learn the host's output
// shape and to smoke-test timing; no standing was inspected.)
//   Material A: 13 fresh Wikipedia pages across seven domains, fetched once
//     and committed (fixtures/occupancy-pages.json): politics (Hannibal
//     Hamlin, Andrew Johnson, Angela Merkel), military (Joachim Murat,
//     Mikhail Kutuzov), law (John Roberts, William Rehnquist), church (Pope
//     Benedict XVI), business (Tim Cook, Satya Nadella), sport (Alex
//     Ferguson, Pep Guardiola), academia (Lawrence Summers). Body prose only,
//     hyperlinks kept as spans (lib/wiki-body.mjs).
//   Material B: live_priors through the same host — War and Peace (Maude),
//     Middlemarch, Dracula, Great Expectations, Crime and Punishment, The
//     Federalist Papers, and the Immanuel_Kant and Cold_War digests.
//   Mentions (the reader's `mentions`): every occurrence of a host-admitted
//     referent's surface (`via: cast`) and every pronoun the host bound
//     (`via: pronoun`), in the sentence's own coordinates. A locus is the
//     page's own link title where a link starts in the complement (`link`),
//     else a host referent surface in it (`cast`), else the surface itself.
//   Ablation arm: the same texts with `mentions` omitted — the capitalised
//     run is the occupant, as in the 2026-09-27 run.
//
//   H1  the mentions arm admits >= 1 standing on at least 7 of the 13 pages
//       (the pipeline's referents reach the transitions at all)
//   H2  the wall: no admitted occupant's mention is a closed-class word
//       (POS prior UD_English-EWT) or determiner-led, pronoun tier aside;
//       the ablation arm admits at least one such occupant — the wall's
//       control, built to fail
//   H3  positionsByPattern over Material A admits at least one position with
//       two distinct occupant referents (Chief Justice across the two law
//       pages is the obvious candidate — declared, not required)
//   H4  War and Peace: a standing whose occupant is a host referent with a
//       surface containing "Pierre" and whose locus contains "Bezukhov"
//   H5  live_priors, each from ONE grep of the raw text, nothing computed by
//       the reader:
//       a  Immanuel_Kant digest: occupant a host referent with surface "Kant",
//          locus surface beginning "Full Professor"
//       b  Middlemarch: "Tyke became chaplain to the Infirmary" is REFUSED as
//          state_not_position — a bare-noun office the structural typing
//          cannot see; the reader's own predicted limit, not a pass
//       c  The Federalist Papers: zero standings (rules, not testimony)
//       d  Dracula, Great Expectations, Crime and Punishment: zero positions
//          by pattern — a novel's becomings are states, not offices
//       e  Cold_War digest: occupant a host referent with surface "Gorbachev";
//          the locus surface carries the digest's glued link label — the
//          material's defect, reported
//   Reported, not predicted: standings and refusals by reason per domain and
//   text; the tier each occupant resolved through; host cast sizes; timing.
//
// V2, PRE-REGISTERED 2026-09-28 after the v1 run (results/occupancy-host-
// eval-RESULTS.md; raw kept as occupancy-host-eval.json, v2 writes -v2.json).
// Three changes, each read off v1's own rows, none a word list:
//   walls   the reader refuses an UNBOUND PRONOUN between mention and
//           transition (received class: priors.js SUBJECT_PRONOUNS) and a
//           COMMA there (the phrase's own boundary) — 19 of v1's 26 Material
//           A standings were of those two shapes
//   native  a second mentions arm from the NATIVE reader (createRecursiveReader
//           + createCausalTextPerceiver, the assembly the page and the-fold
//           evals read with): a referent's surfaces matched case-insensitively
//           (the native normalises some to lowercase) plus its anchored
//           descriptors (EOAnchorEvidence@1) as `via: descriptor`; it binds no
//           pronouns, and says so. Reported BESIDE the host arm, never merged.
//   fold    the H4 predicate folds diacritics (v1's /bezukhov/ missed Bezúkhov)
// Predictions:
//   V1  host arm, Material A: standings whose occupant SURFACE is a month name
//       or a demonym-shaped adjective ending -an/-ish/-ese fall to ZERO (v1: 7
//       months, "German"); total standings fall (v1: 26) and no new occupant
//       shape appears that the wall was not built for — reported, the rows
//       listed
//   V2  native arm admits a standing on the Merkel page with occupant surface
//       "Merkel" (bare) — the host arm cannot (no bare-surname referent)
//   V3  H4 with the folded predicate HOLDS on the host arm (v1 found it twice)
//   V4  H5a on the native arm: if the native admits bare "kant" as a referent
//       the Kant appointment lands; declared as a test of the NATIVE's
//       surname coverage, either outcome reported
//   V5  H2 holds on both arms (the wall is the reader's, not the pipeline's)
//   V6  no arm's War and Peace run exceeds 10 minutes (the native's cost on a
//       3.3MB book is unmeasured; a timeout is a result)
//
// V3, PRE-REGISTERED 2026-09-28 in results/occupancy-host-eval-v2-RESULTS.md
// (W1-W5), after the surname fix (84182a6) and the refined comma wall; run
// with NATIVE_MAX_CHARS=150000, output -v3.json.
//
// V4, PRE-REGISTERED 2026-09-28 before the run (output -v4.json, same cap).
// The occupant slot is now an EOUndecided@1 record (kernel/undecided.js): every
// candidate kept with its evidence; the host's pronoun GAPS (top, runnerUp,
// margin — the evidence its floor discarded) ride in as unestablished
// candidates; the default rule NEAREST_ESTABLISHED reproduces v3's walls.
//   X1  host arm, Material A, default rule: the 37 v3 standings byte-identical
//       (address for address) — the superposition changes no default verdict
//   X2  of Material A's pronoun_unbound refusals whose unbound pronoun carries a
//       `top`, the top IS the page's own topic referent (the bare-surname
//       referent) in >= 50% — the evidence the floor discarded points at the
//       right being. Chance: a page has ~40-170 referents, so one of them by
//       luck is < 3%.
//   X3  a second, declared for-whom BIND_ON_TOP (an unbound pronoun collapses
//       to its top when margin > 0, else nearest-established) adds standings
//       whose occupants are BEINGS, never dates: month/demonym occupants under
//       it = 0; every added row listed
//
// V5, PRE-REGISTERED 2026-09-28 before the run (output -v5.json, same cap).
// v4 found the cast admits months, countries and demonyms as beings by a
// name's own evidence. The cut is COMPANY (P79, Firth), never a list: for every
// host referent, over its surface occurrences on the page, prepShare = the
// share whose previous token the received POS prior settles as ADP, verbShare
// = the share whose next token it settles as VERB or AUX. Both ride on every
// established candidate; BEING_KIND (a second declared for-whom) admits a
// candidate only when verbShare > prepShare — more often a subject than a
// preposition's object — else refuses `not_being_kind`.
//   Y1  under BEING_KIND, Material A's month/demonym occupants = 0 (v4 default: 1;
//       v4's loose arm: 9) and the rows lost against the default arm are LISTED
//   Y2  under BEING_KIND at least 25 of the default arm's 35 rows survive (the
//       cut removes dates, not careers): Murat, Kutuzov, Merkel x8, Ratzinger,
//       Summers all retained
//   Y3  reported: for each page, prepShare/verbShare of the topic referent and
//       of every month referent — the two populations should not overlap
//
// V6, PRE-REGISTERED 2026-09-28 before the run (output -v6.json, same cap).
// Three organs on the operators (e1f9a31): kernel/merge-standing.js turns the
// cast's merges into CON·Figure supports and a two-occupant locus into a
// SEG·Figure attack, judged by the real deriveIdentityRevision; every
// standing carries its phasepost act (adapters/text/phasepost.js, the real
// ActPrior@1 and cellOf injected); the binder's named-frame skip is a typed
// gap (pronoun_frame_named) riding in as an unestablished candidate with its
// contested set. nounBetween (b85f1db) reads the gap with the POS prior.
//   Z1  War and Peace, host arm: the identity revision emits >= 1 SEG·Figure
//       split whose alternative names "pierre bezúkhov" (the surface the cast
//       folded under the title) — the Bezúkhov merge conceded BY THE IDENTITY
//       ORGAN from the material's own testimony, on the fold
//   Z2  Material A: every SEG split emitted is listed with its locus and its
//       occupants; predicted <= 3 (positions with two occupants are rare on 13
//       pages — H3 found one)
//   Z3  phasepost: >= 80% of Material A's default-arm standings carry a typed
//       act (standing != "gap"); the acts of "became" and "appointed" reported
//   Z4  nounBetween: "Russian -> Kutuzovo" is refused as subject_unestablished
//       on the default arm (v5's one remaining month/demonym under the default)
//   Z5  named-frame pronouns: the count of pronoun_frame_named candidates that
//       reach a transition clause on Material A, and how many carry the page's
//       topic in their contested set — reported
// V7, PRE-REGISTERED 2026-09-28 after reading v6 (output -v7.json, same cap).
// v6: Z1, Z2, Z4 held; Z3 FAILED at 0 of 33 typed — every act "gap",
// "unattested in ActPrior@1 (and through the lemmatizer)". Diagnosed, not
// tuned: the prior holds become/appoint/elect/name/promote as BASE forms and
// the driver injected NO lemmatizer, so "became"/"appointed" never reached
// them. phasepost.js's own disclosed path is `lemmasOf` (its via reads
// "became->become"); the-fold's reader-bundle.js already builds it from the
// UniMorph MorphologyPrior@1 — the same construction is injected here. ONE
// change; every other prediction is expected byte-identical to v6.
//   Z3' >= 80% of Material A's default-arm standings carry a typed act;
//       predicted by lexicon: became/becoming -> INS·Figure (become-109.1),
//       appointed/elected/named -> DEF·Figure (appoint-29.1), promoted ->
//       SYN·Figure (promote-102) — the acts of the LEXICON, not chosen here
// V8, PRE-REGISTERED 2026-09-28 after v7 (output -v8.json, same cap). The
// v6 amendment to kernel/merge-standing.js (81e910b): a locus at the floor is
// an EOUndecided@1 (position | one_being), collapsed for the for-whom under
// NESTED_NAMES from the adapter's own nesting reading (namesNest: one name's
// tokens inside another's, diacritics folded). ONE change: `nested` declared
// to mergeEvidence; everything else expected byte-identical to v7.
//   Z6  War and Peace: the count_bezukhov locus collapses one_being (Monsieur
//       Pierre / Pierre nest); ZERO SEG splits on the fold; the occupants'
//       own alternative (monsieur_pierre <-> pierre) is opened live_hypothesis
//   Z7  Material A: the Guardiola `england` locus still collapses position
//       (FA Cup / Champions League do not nest) — its split stands as in v6/v7
//   Z8  every slot and collapse is reported per text: locus, verdict, rule
// V9, PRE-REGISTERED 2026-09-28 after v8 (output -v9.json, same cap). The
// state family (2e67c14): "all states are transitions, and NUL is the
// transition of non-transition" — a copula clause holds a locus as a
// NUL·Ground standing. ONE change: the register now carries `state` and the
// reader is handed cellOf. A raw grep of the 13 pages finds 23 copula
// clauses with a capitalised complement; the walls only remove, so:
//   Z9   Material A default arm: state standings <= 23, > 0; listed, with
//        the entry standings unchanged at 33 (no entry clause re-read)
//   Z10  War and Peace: NO state standing puts a non-nesting second occupant
//        on count_bezukhov — Cyril's holding is by NAMING, not predication —
//        so the locus still collapses one_being (the law's limit on this
//        material, predicted so it is on the record)
//   Z11  under BEING_KIND, month/demonym state occupants = 0 (Y1's wall holds
//        for the new family)
//   Z12  every state standing carries act NUL·Ground with the phasepost's own
//        copula reading as overlay (op SIG on the unique-role/property rules)
// V10, PRE-REGISTERED 2026-09-28 after v9 (output -v10.json, same cap). Two
// organ changes since v9, both read off structure: the complement's HEAD is
// what the cast is asked about (an adjunct place name is never the locus);
// nesting is read off name trees (name-spans.js — full / prefix / head /
// given / none; partial levels reach the kernel as ambiguous). No driver
// logic changes beyond the predictions below.
//   Z13  War and Peace: exactly ONE slot, collapsed one_being, zero splits —
//        the Moscow position of v9 is gone with the head fix
//   Z14  Material A: entry standings still 33, state standings still 24 (the
//        head fix moves locusVia, never admission); locusVia `cast` on
//        Material A falls below v9's count (Murat -> Berg becomes surface);
//        reported
//   Z15  Guardiola's england locus still a position (FA Cup / Champions
//        League read `none` under name-spans); ambiguous pairs on Material A
//        reported with their levels
//   Z16  War and Peace state rows whose locus resolved in the cast: fewer
//        than v9's 17; each remaining one listed
// V11, PRE-REGISTERED 2026-09-28 after v10 (output -v11.json, same cap). ONE
// change: the cast is asked about a head phrase only when it reads as a name
// (nameShaped, name-spans.js). Admission untouched.
//   Z17  War and Peace: exactly ONE slot, one_being, zero splits (napoleon gone)
//   Z18  Material A: entry 33, state 24; locusVia cast < 13 (v10's count)
//   Z19  WP state rows with a cast-resolved locus: < 13, each listed, each
//        head phrase name-shaped
// V12, PRE-REGISTERED 2026-09-28 after v11 (output -v12.json, same cap). Two
// organ changes, both from v11's five remaining rows: a copula clause whose
// pre-verbal material opens with a preposition is INVERTED (refused by name,
// the post-verbal subject carried); a title-less name as a copula complement
// that the cast resolves is an IDENTITY claim (the row carries `identity`,
// fed to the identity organ as a support, never a locus). Soft line breaks
// read as spaces (3697cc6). Admission of entry standings untouched.
//   Z20  War and Peace: state rows with a cast-resolved locus that are NOT
//        identity rows = 0; identity rows >= 2 (Circassian -> Sónya, twice);
//        inverted_subject refusals >= 2, naming Wolzogen and Pierre Bezúkhov
//   Z21  Material A: entry 33; state rows <= 24 (inversions only remove);
//        the removed ones listed
//   Z22  War and Peace: the identity support opens an alternative on the fold
//        (a live hypothesis naming sónya); the slot count stays 1, one_being
// V13, PRE-REGISTERED 2026-09-28 after v12 (output -v13.json, same cap). ONE
// change: the inversion rule reads both marks (no comma before the copula,
// a name-shaped displaced subject); the preposition class widened.
//   Z23  War and Peace: inverted_subject refusals < 30 (v12: 859), every
//        carried subject name-shaped; Wolzogen, Pierre Bezúkhov, Bennigsen
//        among them
//   Z24  War and Peace: identity claims are exactly the two Circassian = Sónya
//        rows — Kutúzov = Bennigsen is gone (it was an inversion)
//   Z25  Material A: entry 33, state 24 (v12's six stolen rows return to
//        state_not_position — none was ever a standing)
// V14, PRE-REGISTERED 2026-09-28 after v13 (output -v14.json, same cap). TWO
// organs, both opt-in by injection and both live here: (a) locus-side
// being-kind — a complement head the POS prior settles with NO noun/propn
// share names no position (`locus_not_nominal`, asymmetric veto); (b)
// naming as testimony — `namedOccupants`: a name carrying a locus's own
// title and head with givens no known occupant wears is a SIGNED occupant
// (SIG·Ground), patronymics typed by PATRONYMIC_RU. Predictions:
//   Z26  locus_not_nominal fires somewhere on Material A or the live texts;
//        every vetoed word has zero NOUN+PROPN share in POS_PRIOR (by
//        construction — reported, not the test); THE TEST: no vetoed
//        complement was a POSITION in v13 (a locus with two occupants or a
//        pointer in v13's standings) — the veto removes no real position
//   Z27  War and Peace: namedOccupants yields a row whose surface matches
//        /Cyril Vlad.*Bez[uú]khov/ at the locus matching /Count Bez[uú]khov/;
//        CONTROL BUILT TO FAIL: the same sentences with every "Count" written
//        "Prince" yield zero rows at that locus (the title is the lead)
//   Z28  War and Peace: the Bezúkhov slot, with Cyril's naming row added to
//        its occupants, collapses to `contested` under NESTED_NAMES (Pierre's
//        faces nest; Cyril's nests with none) — no longer `one_being`, and
//        never `position` from the names alone; the predicated-only slot
//        (v13's) still reads `one_being`
//   node occupancy-host-eval.mjs [out.json]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { readOccupancyTestimony, positionsByPattern, NEAREST_ESTABLISHED, nestedOccupants, nameShaped, namedOccupants } = await import(`${NATIVE}/adapters/text/occupancy-testimony.js`);
const { PATRONYMIC_RU } = await import(`${NATIVE}/adapters/text/name-spans.js`);
const { collapse } = await import(`${NATIVE}/kernel/undecided.js`);
const { mergeEvidence, occupantPairKey } = await import(`${NATIVE}/kernel/merge-standing.js`);
const { deriveIdentityRevision } = await import(`${NATIVE}/kernel/identity.js`);
const { applyDelta, receivedGround } = await import(`${NATIVE}/kernel/fold.js`);
const { cellOf } = await import(`${NATIVE}/kernel/cube.js`);
const { makePhasepost } = await import(`${NATIVE}/adapters/text/phasepost.js`);
const ACT_PRIOR = JSON.parse(readFileSync("/home/user/live_priors/derived-priors/act-priors/act-prior-en.json", "utf8"));
const { NEGATION_WORDS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, AUXILIARY_VERBS } = await import(`${NATIVE}/adapters/text/priors.js`);
const { COPULA_FORMS } = await import(`${NATIVE}/adapters/text/phasepost.js`);
const { morphologyFromPrior, createLemmatizer } = await import(`${NATIVE}/adapters/text/morphology.js`);
const MORPH = morphologyFromPrior(JSON.parse(readFileSync(`${NATIVE}/eval/the-fold/fixtures/unimorph-morphology-prior.json`, "utf8")));
const LEMMATIZER = createLemmatizer(MORPH.forms, { language: MORPH.language }); // the-fold/reader-bundle.js's own construction
const phasepostOrgan = makePhasepost({ actPrior: ACT_PRIOR, cellOf, definiteDeterminers: DEFINITE_DETERMINERS, indefiniteDeterminers: INDEFINITE_DETERMINERS, lemmasOf: (f) => [...LEMMATIZER.lemmasOf(f)] });
const phasepost = (edge) => phasepostOrgan.classify(edge);
const { createSession, admitChunked, sessionCast } = await import(`${NATIVE}/legacy-ported/packages/host/corpus.js`);
const { createRecursiveReader } = await import(new URL("../../../kernel.js", import.meta.url).pathname);
const { createCausalTextPerceiver, textEncounters } = await import(`${NATIVE}/adapters/text/recursive.js`);
const { reviseTextFold } = await import(`${NATIVE}/adapters/text/revision.js`);
const { SUBJECT_PRONOUNS } = await import(`${NATIVE}/adapters/text/priors.js`);
const { splitSentences } = await import(`${NATIVE}/adapters/text/spans.js`);
const POS_PRIOR = JSON.parse(readFileSync(`${NATIVE}/eval/the-fold/fixtures/pos-prior-eng.json`, "utf8"));
const fold = (x) => String(x ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const [OUT] = process.argv.slice(2);

const FIX = JSON.parse(readFileSync(new URL("./fixtures/occupancy-pages.json", import.meta.url), "utf8"));
const POS = POS_PRIOR.forms;
const CLOSED = new Set(["DET", "ADP", "PRON", "CCONJ", "SCONJ", "PART", "PUNCT", "AUX", "NUM", "INTJ", "SYM"]);
const closedClass = (w) => { const t = POS[w.toLowerCase()]; if (!t) return false; let top = null, n = -1; for (const [k, c] of Object.entries(t)) if (c > n) { top = k; n = c; } return CLOSED.has(top); };
const MODALS = new Set([...AUXILIARY_VERBS].filter((w) => !COPULA_FORMS.has(w) && !["have", "has", "had", "do", "does", "did"].includes(w)));
const DET = { definite: DEFINITE_DETERMINERS, indefinite: INDEFINITE_DETERMINERS };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (hay, surface) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(surface)}(?![\\p{L}\\p{N}])`, "u").test(hay);
const tally = (xs, f) => xs.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
const DOMAIN = { "Hannibal Hamlin": "politics", "Andrew Johnson": "politics", "Angela Merkel": "politics", "Joachim Murat": "military", "Mikhail Kutuzov": "military", "John Roberts": "law", "William Rehnquist": "law", "Pope Benedict XVI": "church", "Tim Cook": "business", "Satya Nadella": "business", "Alex Ferguson": "sport", "Pep Guardiola": "sport", "Lawrence Summers": "academia" };

// THE NATIVE ARM: the same reader the page reads with, driven over the text's
// sentences; mentions are the referents' surfaces (case-insensitive) and the
// descriptors anchoring bound; no pronoun bindings exist in this reader.
async function readNative({ name, text, links }) {
  const t0 = Date.now();
  const reader = createRecursiveReader({ seed: {}, perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, refreshEvery: 25, posPrior: POS_PRIOR, descriptorAnchoring: { minActivation: 0.05, minMargin: 0.2 } })],
    adapters: { revise: reviseTextFold, retrieve: (_f, evidence) => Object.freeze({ schema: "EORelevantFold@1", witnessed: Object.freeze([...evidence]), provisional: Object.freeze([]), expectations: Object.freeze([]), obligations: Object.freeze([]), exclusions: Object.freeze([]), unresolvedAlternatives: Object.freeze([]), activeFrames: Object.freeze([]), receivedPriors: Object.freeze([]) }) } });
  const encs = [...textEncounters(text, { source: name, offset: 0 })];
  let seq = 0; for (const e of encs) await reader.step({ ...e, sequencePosition: seq++ });
  const ge = reader.getLog().filter((e) => e.schema === "Observation@1").flatMap((o) => o.graphEntries ?? []);
  const referents = [...new Map(ge.filter((e) => e.schema === "EOReferent@1").map((r) => [r.id, r])).values()];
  const anchors = ge.filter((e) => e.schema === "EOAnchorEvidence@1" && e.referent);
  const display = new Map(referents.map((r) => [r.id, [...r.surfaces].sort((a, b) => b.length - a.length)[0]]));
  const key = (id) => `${name}/${id}`;
  const owner = new Map(); for (const r of referents) for (const x of r.surfaces) if (!owner.has(x.toLowerCase())) owner.set(x.toLowerCase(), key(r.id));
  const allRe = new RegExp(`(?<![\\p{L}\\p{N}])(${[...owner.keys()].sort((x, y) => y.length - x.length).map(esc).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  const sentences = encs.map((e, at) => ({ text: e.material, at, offset: e.anchor?.start ?? 0 }));
  const mentions = (sentence) => {
    const out = [];
    if (owner.size) for (const m of sentence.text.matchAll(allRe)) out.push({ start: m.index, end: m.index + m[0].length, referent: owner.get(m[1].toLowerCase()), via: "cast" });
    for (const a of anchors) if (a.sentenceOrder === sentence.at && a.descriptor) { const i = sentence.text.toLowerCase().indexOf(a.descriptor.toLowerCase()); if (i >= 0) out.push({ start: i, end: i + a.descriptor.length, referent: key(a.referent), via: "descriptor" }); }
    return out;
  };
  const resolveLocus = (sentence, span) => {
    const a = { start: sentence.offset + span.start, end: sentence.offset + span.end };
    const l = links.find((x) => x.start >= a.start && x.start < a.end);
    if (l) return { referent: l.title, via: "link" };
    const surf = sentence.text.slice(span.start, span.end);
    const hit = referents.find((r) => r.surfaces.some((s) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(s)}(?![\\p{L}\\p{N}])`, "iu").test(surf)));
    if (hit) return { referent: display.get(hit.id), via: "cast" };
    return null;
  };
  const opts = { source: name, determiners: DET, modals: MODALS, negation: NEGATION_WORDS };
  const real = readOccupancyTestimony(sentences, { ...opts, mentions, pronouns: SUBJECT_PRONOUNS, resolveLocus });
  const face = (id) => display.get(id.replace(`${name}/`, "")) ?? id;
  const rows = real.candidates.map((c) => ({ text: name, occupant: face(c.occupant), occupantId: c.occupant, via: c.occupantVia, surface: c.occupantSurface, locus: c.locus, locusVia: c.locusVia, predecessor: c.predecessor ? face(c.predecessor) : null, pattern: c.pattern, year: c.year, address: c.address, clause: c.clause }));
  return { name, rows, real, ablation: { candidates: [] }, cast: { referents: referents.length, anchoredDescriptors: anchors.length, sentences: sentences.length }, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
}

/** A second, declared for-whom: an unbound pronoun collapses to its top when its margin is positive. */
const BIND_ON_TOP = Object.freeze({ name: "bind-on-top", giver: "eval/identity/occupancy-host-eval.mjs v4, declared", params: { marginAbove: 0 },
  decide(cands, record) {
    const pron = cands.filter((c) => c.via === "pronoun-unbound" && c.value && (c.features.margin ?? 0) > 0);
    const est = cands.filter((c) => c.features.established);
    const last = est.length ? est.reduce((a, b) => (b.features.end > a.features.end ? b : a)) : null;
    const nearest = [...pron, ...(last ? [last] : [])].reduce((a, b) => (!a || b.features.end > a.features.end ? b : a), null);
    if (!nearest || nearest.features.distanceWords > 2) return { reason: "occupant_not_a_referent" };
    if (nearest.features.subjectShapedAfterPunct) return { reason: "occupant_not_a_referent" };
    return { chosen: nearest.index };
  } });

/** v5's second declared for-whom: nearest-established, and the chosen candidate must be more often a subject than a preposition's object. */
const BEING_KIND = Object.freeze({ name: "being-kind", giver: "eval/identity/occupancy-host-eval.mjs v5, declared: company read with the UD_English-EWT POS prior", params: { requires: "verbShare > prepShare" },
  decide(cands, record) {
    const base = NEAREST_ESTABLISHED.decide(cands, record);
    if (!Number.isInteger(base.chosen)) return base;
    const c = cands[base.chosen];
    if (c.features.verbShare == null || c.features.prepShare == null) return { contested: [c.index], reason: "company_unmeasured" };
    return c.features.verbShare > c.features.prepShare ? base : { contested: [c.index], reason: "not_being_kind" };
  } });

function readText({ name, text, links }) {
  const t0 = Date.now();
  const session = createSession();
  admitChunked(session, { text, sourceId: name, language: "en" });
  const cast = sessionCast(session, { sourceId: name });
  const shift = cast.body === text ? 0 : text.indexOf(cast.body);
  const display = new Map(cast.referents.map((r) => [r.id, [...r.surfaces].sort((a, b) => b.length - a.length)[0]]));
  const key = (r) => `${name}/${r.id}`;
  // COMPANY (v5): for every referent, over its occurrences in the text, the
  // share preceded by a settled ADP and the share followed by a settled
  // VERB/AUX — read with the received POS prior, never a word list.
  const settled = (w) => { const t = POS[String(w ?? "").toLowerCase()]; if (!t) return null; let top = null, n = -1; for (const [k, c] of Object.entries(t)) if (c > n) { top = k; n = c; } return top; };
  const company = new Map();
  const words = [...text.matchAll(/[\p{L}\p{N}'’.-]+/gu)];
  for (const r of cast.referents) {
    const rx = new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...r.surfaces].sort((x, y) => y.length - x.length).map(esc).join("|")})(?![\\p{L}\\p{N}])`, "gu");
    let n = 0, prep = 0, verb = 0;
    for (const m of text.matchAll(rx)) { n += 1; let i = words.findIndex((w) => w.index >= m.index); const before = words[i - 1]?.[0], after = words.find((w) => w.index >= m.index + m[0].length)?.[0]; if (settled(before) === "ADP") prep += 1; const a = settled(after); if (a === "VERB" || a === "AUX") verb += 1; }
    company.set(r.id, { occurrences: n, prepShare: n ? +(prep / n).toFixed(3) : null, verbShare: n ? +(verb / n).toFixed(3) : null });
  }
  // THE PIPELINE'S OWN MENTIONS, in the sentence's coordinates. Nothing here
  // reads capitalisation; the ablation arm does.
  // ONE combined alternation, longest surface first, so a position yields one
  // mention (the longest surface there) — measured on War and Peace: 884
  // per-referent regexes over 34k sentences cost 18.8s, one regex 0.6s.
  const owner = new Map(); for (const r of cast.referents) for (const x of r.surfaces) if (!owner.has(x)) owner.set(x, key(r));
  const allRe = new RegExp(`(?<![\\p{L}\\p{N}])(${[...owner.keys()].sort((x, y) => y.length - x.length).map(esc).join("|")})(?![\\p{L}\\p{N}])`, "gu");
  const mentions = (sentence) => {
    const out = [];
    if (owner.size) for (const m of sentence.text.matchAll(allRe)) { const rid = owner.get(m[1]); out.push({ start: m.index, end: m.index + m[0].length, referent: rid, via: "cast", features: company.get(rid.replace(`${name}/`, "")) ?? {} }); }
    for (const b of cast.pronounBindings) if (b.sentenceOrder === sentence.at) { const st = b.offset - sentence.offset; if (st >= 0 && st < sentence.text.length) out.push({ start: st, end: st + b.pronoun.length, referent: `${name}/${b.referentId}`, via: "pronoun" }); }
    // the binder's refusals, with the evidence its floor discarded
    for (const g of cast.pronounGaps ?? []) if (g.sentenceOrder === sentence.at && Number.isFinite(g.offset) && g.pronoun) { const st = g.offset - sentence.offset; if (st >= 0 && st < sentence.text.length) out.push({ start: st, end: st + g.pronoun.length, referent: g.top ? `${name}/${g.top}` : null, via: "pronoun-unbound", established: false, features: { reason: g.reason, activation: g.activation ?? null, margin: g.margin ?? null, runnerUp: g.runnerUp ? `${name}/${g.runnerUp}` : null, contested: (g.contested ?? []).map((id) => `${name}/${id}`) } }); }
    return out;
  };
  const resolveLocus = (sentence, span) => {
    const a = { start: shift + sentence.offset + span.start, end: shift + sentence.offset + span.end };
    const l = links.find((x) => x.start >= a.start && x.start < a.end);
    if (l) return { referent: l.title, via: "link" };
    const surf = sentence.text.slice(span.start, span.end);
    const hit = cast.referents.find((r) => r.surfaces.some((s) => has(surf, s)));
    if (hit) return { referent: display.get(hit.id), via: "cast", id: key(hit) };
    return null;
  };
  const sentences = cast.sentences.map((s) => ({ text: s.text, at: s.order, offset: s.offset }));
  const opts = { source: name, determiners: DET, modals: MODALS, negation: NEGATION_WORDS, posPrior: POS_PRIOR, phasepost, cellOf };
  const real = readOccupancyTestimony(sentences, { ...opts, mentions, pronouns: SUBJECT_PRONOUNS, resolveLocus });
  // THE MERGE AS A HYPOTHESIS (v6): every surface the cast admitted into a
  // referent is a merge into that referent; a locus (by referent id) with two
  // occupant referents attacks it; the identity organ judges on a fresh fold.
  const merges = cast.referents.flatMap((r) => r.surfaces.map((surface) => ({ surface, into: key(r), witness: `${name}#cast`, basis: "name-variant coreference" })));
  const face = (id) => { const r = cast.referents.find((x) => `${name}/${x.id}` === id); return r ? display.get(r.id) : id; };
  const identityStandings = real.candidates.filter((c) => c.locusId && !c.identity).map((c) => ({ locus: c.locusId, occupant: c.occupant, witness: c.address }));
  // COPULA IDENTITY (v12): "that Circassian was Sónya" is the material's own merge evidence — a support, never a locus
  const identityClaims = real.candidates.filter((c) => c.identity).map((c) => ({ surface: c.occupant, into: c.identity.into, witness: c.address, basis: c.identity.basis }));
  const nested = nestedOccupants(identityStandings, (id) => face(id), occupantPairKey);
  const evidence = mergeEvidence({ merges: [...merges, ...identityClaims], standings: identityStandings, witness: `${name}#cast`, minOccupants: 2, nested });
  // NAMING AS TESTIMONY (v14): the signed occupants, and the slot re-collapsed with them among the occupants
  const nameOpts = { patronymic: PATRONYMIC_RU };
  const named = namedOccupants(sentences, real.candidates, { source: name, mentions, nameOpts, cellOf });
  const namedStandings = [...identityStandings, ...named.filter((n) => n.locusId).map((n) => ({ locus: n.locusId, occupant: n.occupant, witness: n.address }))];
  const nestedNamed = nestedOccupants(namedStandings, (id) => face(id), occupantPairKey, nameOpts);
  const evidenceNamed = mergeEvidence({ merges: [...merges, ...identityClaims], standings: namedStandings, witness: `${name}#cast`, minOccupants: 2, nested: nestedNamed, ambiguous: nestedNamed.ambiguous });
  const namedControl = namedOccupants(sentences.map((x) => ({ ...x, text: x.text.replace(/\bCount\b/g, "Prince") })), real.candidates, { source: name, mentions, nameOpts, cellOf });
  const naming = { rows: named.map((n) => ({ occupant: face(n.occupant), via: n.occupantVia, surface: n.occupantSurface, locus: n.locus, locusId: n.locusId, at: n.at, clause: n.clause.slice(0, 120) })), controlRows: namedControl.length, slots: evidenceNamed.collapses.map((c) => ({ locus: c.of, verdict: c.verdict, chosen: c.chosen?.value ?? null, rule: c.rule.name, reason: c.reason })) };
  const revision = deriveIdentityRevision({ fold: receivedGround(), supports: evidence.supports, attacks: evidence.attacks, giver: "occupancy testimony via kernel/merge-standing.js" });
  const splits = revision.operations.filter((o) => o.operator === "SEG").map((o) => ({ identity: o.consequence?.identity, reason: o.consequence?.reason, witness: o.witness }));
  const identity = { merges: merges.length, positions: evidence.positions.map((p) => ({ locus: p.locus, occupants: p.occupants })), attacks: evidence.attacks.length, splits, slots: evidence.collapses.map((c) => ({ locus: c.of, verdict: c.verdict, chosen: c.chosen?.value ?? null, rule: c.rule.name, reason: c.reason })), withheld: evidence.withheld, occupantHypotheses: evidence.supports.filter((x) => /one_being_under_names/.test(x.reason)).map((x) => `${x.left} <-> ${x.right}`), foldAlternatives: applyDelta(receivedGround(), revision).unresolvedAlternatives.filter((x) => x.schema === "EOIdentityAlternative@1" && x.standing === "distinct").map((x) => `${x.left} <-> ${x.right}`), liveAlternatives: applyDelta(receivedGround(), revision).unresolvedAlternatives.filter((x) => x.schema === "EOIdentityAlternative@1" && x.standing === "live_hypothesis" && x.supportRefs?.some?.((w) => !/#cast$/.test(String(w)))).map((x) => `${x.left} <-> ${x.right}`), identityClaims: identityClaims.map((x) => `${face(x.surface)} = ${face(x.into)} @${x.witness}`) };
  const loose = readOccupancyTestimony(sentences, { ...opts, mentions, pronouns: SUBJECT_PRONOUNS, resolveLocus, forWhom: { id: "reader:being-kind" }, occupantRule: BEING_KIND });
  const ablation = readOccupancyTestimony(sentences, opts);
  const rowOf = (c) => ({ text: name, occupant: face(c.occupant), occupantId: c.occupant, via: c.occupantVia, surface: c.occupantSurface, locus: c.locus, locusId: c.locusId, locusVia: c.locusVia, verb: c.verb, act: c.act ? { op: c.act.op, grain: c.act.grain, standing: c.act.standing, overlay: c.act.overlay ? { op: c.act.overlay.op, grain: c.act.overlay.grain, standing: c.act.overlay.standing } : undefined } : null, predecessor: c.predecessor ? face(c.predecessor) : null, pattern: c.pattern, identity: c.identity ? { into: c.identity.into, basis: c.identity.basis } : null, year: c.year, address: c.address, clause: c.clause });
  const rows = real.candidates.map(rowOf);
  const surname = name ? name.replace(/\s*\(.*\)$/, "").split(/\s+/).at(-1) : null;
  const topic = surname ? cast.referents.find((r) => r.surfaces.includes(surname) || r.surfaces.includes(name)) : null;
  const months = cast.referents.filter((r) => r.surfaces.some((x) => /^(January|February|March|April|May|June|July|August|September|October|November|December)$/.test(x)));
  return { name, identity, naming, rows, looseRows: loose.candidates.map(rowOf), real, loose, ablation, topicRef: topic ? `${name}/${topic.id}` : null, companyTopic: topic ? company.get(topic.id) : null, companyMonths: months.map((r) => ({ surface: r.surfaces[0], ...company.get(r.id) })), cast: { referents: cast.referents.length, pronounBindings: cast.pronounBindings.length, pronounGaps: (cast.pronounGaps ?? []).length, sentences: cast.sentences.length, gaps: cast.gaps.map((g) => g.reason ?? g) }, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
}

// ── Material A ────────────────────────────────────────────────────────────
const pages = Object.entries(FIX.pages).map(([name, { text, links }]) => ({ domain: DOMAIN[name], ...readText({ name, text, links }) }));
const A = pages.flatMap((p) => p.rows);
const pagesN = []; for (const [name, { text, links }] of Object.entries(FIX.pages)) pagesN.push({ domain: DOMAIN[name], ...(await readNative({ name, text, links })) });
const AN = pagesN.flatMap((p) => p.rows);

// ── H1 ────────────────────────────────────────────────────────────────────
const perPage = pages.map((p) => ({ page: p.name, standings: p.rows.length, ablation: p.ablation.candidates.length, refused: tally(p.real.refused, (x) => x.reason), cast: p.cast, seconds: p.seconds }));
const H1 = { admitted: A.length, pagesWithStanding: perPage.filter((x) => x.standings >= 1).length, perPage, held: perPage.filter((x) => x.standings >= 1).length >= 7 };
// ── H2 ────────────────────────────────────────────────────────────────────
const badOccupant = (surface) => { const first = surface.split(/\s+/)[0]; return closedClass(first) || DEFINITE_DETERMINERS.has(first.toLowerCase()) || INDEFINITE_DETERMINERS.has(first.toLowerCase()); };
const realBad = A.filter((c) => c.via !== "pronoun" && badOccupant(c.surface));
const ablBad = pages.flatMap((p) => p.ablation.candidates).filter((c) => badOccupant(c.occupant));
const H2 = { realClosedOrDescription: realBad.map((c) => `${c.surface} @${c.address}`), ablationClosedOrDescription: ablBad.length, ablationSample: [...new Set(ablBad.map((c) => c.occupant))].slice(0, 15), held: realBad.length === 0 && ablBad.length >= 1 };
// ── H3 ────────────────────────────────────────────────────────────────────
const patA = positionsByPattern(pages.flatMap((p) => p.real.candidates));
const faceOf = new Map(A.map((r) => [r.occupantId, r.occupant]));
const H3 = { positions: patA.positions.map((p) => ({ locus: p.locus, occupants: p.occupants.map((o) => faceOf.get(o) ?? o), standings: p.standings, evidence: p.evidence })), descriptions: patA.descriptions.length, held: patA.positions.some((p) => p.evidence === "two_occupants") };

// ── Material B ────────────────────────────────────────────────────────────
const LP = "/home/user/live_priors";
const B_PATHS = {
  "War and Peace": `${LP}/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt`,
  "Immanuel_Kant": `${LP}/02-encyclopedic/wikipedia/Immanuel_Kant.txt`,
  "Cold_War": `${LP}/02-encyclopedic/wikipedia/Cold_War.txt`,
  "Middlemarch": `${LP}/01-literature-books/gutenberg/pg145_Middlemarch-George-Eliot.txt`,
  "Federalist": `${LP}/01-literature-books/gitenberg/pg1404_The-Federalist-Papers.txt`,
  "Dracula": `${LP}/01-literature-books/gutenberg/pg345_Dracula.txt`,
  "Great_Expectations": `${LP}/01-literature-books/gitenberg/pg1400_Great-Expectations.txt`,
  "Crime_and_Punishment": `${LP}/01-literature-books/gitenberg/pg2554_Crime-and-Punishment.txt`,
};
const B = {}, BN = {};
const cap = Number(process.env.NATIVE_MAX_CHARS) || Infinity;
const withTimeout = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res({ timedOut: true }), ms).unref?.())]);
for (const [name, path] of Object.entries(B_PATHS)) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  // NATIVE_MAX_CHARS (amendment, 2026-09-28, after the first v2 attempt ran
  // 75 minutes without finishing): the native reader's per-reprojection
  // rescan is superlinear, and a Promise.race wall cannot pre-empt
  // synchronous work — so a text over the declared size is SKIPPED on the
  // native arm and reported as over budget with its size, never silently
  // absent. Unset = no cap (the registered v2 shape).
  { const t0 = Date.now(); const rn = text.length > cap ? { overBudget: true, chars: text.length, cap } : await withTimeout(readNative({ name, text, links: [] }), 600000);
    BN[name] = rn.overBudget ? { overBudget: true, chars: rn.chars, cap: rn.cap } : rn.timedOut ? { timedOut: true, seconds: +((Date.now() - t0) / 1000).toFixed(1) } : { standings: rn.rows.length, refused: tally(rn.real.refused, (x) => x.reason), via: tally(rn.rows, (x) => x.via), cast: rn.cast, seconds: rn.seconds, rows: rn.rows.slice(0, 60), refusedNamed: rn.real.refused.filter((x) => /chaplain|Professor|Gorbachev|Bez[uú]khov/i.test(`${x.clause ?? ""} ${x.complement ?? ""}`)).slice(0, 8) }; }
  const r = readText({ name, text, links: [] });
  const pat = positionsByPattern(r.real.candidates);
  const faces = new Map(r.rows.map((x) => [x.occupantId, x.occupant]));
  B[name] = { identity: r.identity, naming: r.naming, notNominal: r.real.refused.filter((x) => x.reason === "locus_not_nominal").map((x) => ({ word: x.word, complement: x.complement, classes: x.classes })), invertedNamed: r.real.refused.filter((x) => x.reason === "inverted_subject").map((x) => x.subject), standings: r.rows.length, positions: pat.positions.map((p) => ({ locus: p.locus, occupants: p.occupants.map((o) => faces.get(o) ?? o), evidence: p.evidence })), refused: tally(r.real.refused, (x) => x.reason), via: tally(r.rows, (x) => x.via), ablationStandings: r.ablation.candidates.length, cast: r.cast, seconds: r.seconds, rows: r.rows, refusedNamed: r.real.refused.filter((x) => /chaplain|Professor|Gorbachev|Bez[uú]khov/i.test(`${x.clause ?? ""} ${x.complement ?? ""}`)).slice(0, 8) };
}
const H4 = { standings: B["War and Peace"].standings, bezukhov: B["War and Peace"].rows.filter((r) => /bezukhov/.test(fold(r.locus))), refusedNamed: B["War and Peace"].refusedNamed, held: B["War and Peace"].rows.some((r) => /bezukhov/.test(fold(r.locus)) && /pierre/.test(fold(r.occupant))) };
const H5 = {
  a: { held: B.Immanuel_Kant.rows.some((r) => /Kant/.test(r.occupant) && /^Full Professor/.test(r.locus)), rows: B.Immanuel_Kant.rows.filter((r) => /Professor/.test(`${r.locus} ${r.clause}`)), refusedNamed: B.Immanuel_Kant.refusedNamed },
  b: { held: !B.Middlemarch.rows.some((r) => /chaplain/.test(r.locus)) && B.Middlemarch.refusedNamed.some((x) => x.reason === "state_not_position" && /chaplain/.test(`${x.complement ?? ""}${x.clause ?? ""}`)), refusedNamed: B.Middlemarch.refusedNamed },
  c: { held: B.Federalist.standings === 0, standings: B.Federalist.standings, refused: B.Federalist.refused, rows: B.Federalist.rows.slice(0, 10) },
  d: { held: ["Dracula", "Great_Expectations", "Crime_and_Punishment"].every((n) => B[n].positions.length === 0), positions: Object.fromEntries(["Dracula", "Great_Expectations", "Crime_and_Punishment"].map((n) => [n, B[n].positions])) },
  e: { held: B.Cold_War.rows.some((r) => /Gorbachev/.test(r.occupant)), rows: B.Cold_War.rows.filter((r) => /Gorbachev/.test(`${r.occupant} ${r.clause}`)), refusedNamed: B.Cold_War.refusedNamed },
};
H5.held = ["a", "b", "c", "d", "e"].every((k) => H5[k].held);

// ── V1–V6 ─────────────────────────────────────────────────────────────────
const MONTH = /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i;
const shapeBad = (surface) => { const w = surface.split(/\s+/); return MONTH.test(w[0]) || (w.length === 1 && /^\p{Lu}/u.test(w[0]) && /(an|ish|ese)$/i.test(w[0])); };
const V1 = { standings: A.length, v1Standings: 26, monthOrDemonym: A.filter((c) => shapeBad(c.surface)).map((c) => `${c.surface} @${c.address}`), held: A.filter((c) => shapeBad(c.surface)).length === 0 && A.length < 26 };
const merkelN = AN.filter((c) => c.text === "Angela Merkel" && /^merkel$/i.test(c.surface));
const V2 = { nativeMerkel: merkelN.map((c) => `${c.surface} -> ${c.locus} :: ${c.clause.slice(0, 100)}`), hostMerkel: A.filter((c) => c.text === "Angela Merkel" && /^merkel$/i.test(c.surface)).length, held: merkelN.length >= 1 };
const V3 = { held: H4.held, rows: H4.bezukhov.length };
const kantN = BN.Immanuel_Kant?.rows?.filter((r) => /kant/i.test(r.surface) && /^Full Professor/.test(r.locus)) ?? [];
const V4 = { nativeKantMentioned: !BN.Immanuel_Kant?.timedOut && ((BN.Immanuel_Kant?.rows ?? []).some((r) => /kant/i.test(r.surface)) || (BN.Immanuel_Kant?.refusedNamed ?? []).some((x) => /kant/i.test(x.occupant ?? ""))), landed: kantN.map((r) => `${r.surface} -> ${r.locus}`), refusedNamed: BN.Immanuel_Kant?.refusedNamed, held: kantN.length >= 1 };
const realBadN = AN.filter((c) => c.via !== "pronoun" && badOccupant(c.surface));
const V5 = { hostBad: realBad.length, nativeBad: realBadN.map((c) => `${c.surface} @${c.address}`), held: realBad.length === 0 && realBadN.length === 0 };
const V6 = { hostSeconds: B["War and Peace"].seconds, nativeSeconds: BN["War and Peace"].seconds ?? null, nativeTimedOut: !!BN["War and Peace"].timedOut, nativeOverBudget: !!BN["War and Peace"].overBudget, nativeCap: cap, firstAttempt: "2026-09-28: the uncapped v2 run was killed at 75 minutes without finishing — the native arm on the whole book did not fit any wall", held: !BN["War and Peace"].timedOut && !BN["War and Peace"].overBudget && B["War and Peace"].seconds < 600 };

const W = {
  W1: { rows: H4.bezukhov.map((r) => `${r.occupant} -> ${r.locus} :: ${r.clause.slice(0, 80)}`), held: H4.held },
  W2: { merkelHost: A.filter((c) => c.text === "Angela Merkel" && /^merkel$/i.test(c.surface)).map((c) => `${c.surface} -> ${c.locus}`), kantHost: H5.a.held, held: A.filter((c) => c.text === "Angela Merkel" && /^merkel$/i.test(c.surface)).length >= 3 && H5.a.held },
  W3: { standings: A.length, monthOrDemonym: A.filter((c) => shapeBad(c.surface)).length, held: A.length >= 12 && A.filter((c) => shapeBad(c.surface)).length === 0 },
  W4: { theTerm: AN.filter((c) => /^the term$/i.test(c.surface)).length, held: AN.some((c) => /^the term$/i.test(c.surface)) },
  W5: { federalist: B.Federalist.standings, held: B.Federalist.standings === 0 },
};
// ── X1–X3 ─────────────────────────────────────────────────────────────────
const v3 = existsSync(new URL("./results/occupancy-host-eval-v3.json", import.meta.url)) ? JSON.parse(readFileSync(new URL("./results/occupancy-host-eval-v3.json", import.meta.url), "utf8")) : null;
const addrs = (rows) => rows.map((r) => `${r.address}|${r.occupantId}|${r.locus}`).sort();
const X1 = { v3: v3 ? v3.standingsA.length : null, now: A.length, identical: v3 ? JSON.stringify(addrs(v3.standingsA)) === JSON.stringify(addrs(A)) : null, held: v3 ? JSON.stringify(addrs(v3.standingsA)) === JSON.stringify(addrs(A)) : null };
const pronRefusals = pages.flatMap((p) => p.real.events.filter((e) => e.collapse.verdict !== "chosen" && e.collapse.reason === "pronoun_unbound").map((e) => ({ page: p.name, topic: p.topicRef, top: e.undecided.candidates.find((c) => c.via === "pronoun-unbound" && c.value)?.value ?? null, clause: e.undecided.at.clause.slice(0, 100) })));
const withTop = pronRefusals.filter((x) => x.top);
const X2 = { pronounRefusals: pronRefusals.length, withTop: withTop.length, topIsTopic: withTop.filter((x) => x.top === x.topic).length, rows: withTop.map((x) => `${x.page}: top=${x.top.split("/").pop()} topic=${x.topic?.split("/").pop()} :: ${x.clause}`), held: withTop.length ? withTop.filter((x) => x.top === x.topic).length / withTop.length >= 0.5 : null };
const looseA = pages.flatMap((p) => p.looseRows);
const added = looseA.filter((r) => !A.some((a) => a.address === r.address && a.locus === r.locus));
const X3 = { looseStandings: looseA.length, added: added.map((r) => `${r.text} | ${r.occupant} (${r.via}) -> ${r.locus} :: ${r.clause.slice(0, 90)}`), monthOrDemonymUnderLoose: looseA.filter((c) => shapeBad(c.surface)).map((c) => c.surface), held: added.length >= 1 && looseA.filter((c) => shapeBad(c.surface)).length === 0 };

// ── Y1–Y3 ─────────────────────────────────────────────────────────────────
const lost = A.filter((a) => !looseA.some((r) => r.address === a.address && r.locus === a.locus));
const Y1 = { beingKindStandings: looseA.length, monthOrDemonym: looseA.filter((c) => shapeBad(c.surface)).map((c) => `${c.surface} @${c.address}`), lost: lost.map((r) => `${r.text} | ${r.occupant} -> ${r.locus} :: ${r.clause.slice(0, 80)}`), held: looseA.filter((c) => shapeBad(c.surface)).length === 0 };
const keep = (re) => looseA.some((r) => re.test(r.occupant));
const Y2 = { survived: looseA.filter((r) => A.some((a) => a.address === r.address && a.locus === r.locus)).length, of: A.length, retained: { Murat: keep(/Murat/), Kutuzov: keep(/Kutuzov/), Merkel: looseA.filter((r) => /Merkel/.test(r.occupant)).length, Ratzinger: keep(/Ratzinger/), Summers: keep(/Summers/) }, held: looseA.filter((r) => A.some((a) => a.address === r.address && a.locus === r.locus)).length >= 25 && keep(/Murat/) && keep(/Kutuzov/) && looseA.filter((r) => /Merkel/.test(r.occupant)).length >= 8 && keep(/Ratzinger/) && keep(/Summers/) };
const Y3 = { pages: pages.map((p) => ({ page: p.name, topic: p.companyTopic, months: p.companyMonths })), held: null };

// ── Z1–Z5 ─────────────────────────────────────────────────────────────────
const wpId = B["War and Peace"].identity ?? null;
const Z1 = { splits: wpId?.splits ?? [], distinct: wpId?.foldAlternatives ?? [], positions: wpId?.positions ?? [], held: (wpId?.foldAlternatives ?? []).some((x) => /pierre bez[uú]khov/i.test(x)) };
const Z2 = { perPage: pages.filter((p) => p.identity.splits.length).map((p) => ({ page: p.name, positions: p.identity.positions, distinct: p.identity.foldAlternatives })), total: pages.reduce((n, p) => n + p.identity.splits.length, 0), held: pages.reduce((n, p) => n + p.identity.splits.length, 0) <= 3 };
const acts = A.map((r) => r.act).filter(Boolean);
const Z3 = { standings: A.length, typed: acts.filter((a) => a.standing !== "gap").length, byVerb: Object.fromEntries([...new Set(A.map((r) => r.verb))].map((v) => [v, tally(A.filter((r) => r.verb === v && r.act), (r) => `${r.act.op ?? "?"}·${r.act.grain ?? "?"}`)])), held: A.length ? acts.filter((a) => a.standing !== "gap").length / A.length >= 0.8 : null };
const kutuzovo = pages.find((p) => p.name === "Mikhail Kutuzov")?.real.refused.find((x) => /Kutuzovo/.test(x.clause ?? ""));
const Z4 = { refused: kutuzovo ? { reason: kutuzovo.reason, clause: kutuzovo.clause.slice(0, 80) } : null, stillAdmitted: A.some((r) => /Kutuzovo/.test(r.locus)), held: kutuzovo?.reason === "subject_unestablished" && !A.some((r) => /Kutuzovo/.test(r.locus)) };
const framed = pages.flatMap((p) => p.real.events.flatMap((e) => e.undecided.candidates.filter((c) => c.via === "pronoun-unbound" && c.features.reason === "pronoun_frame_named").map((c) => ({ page: p.name, topicInContested: (c.features.contested ?? []).includes(p.topicRef) }))));
const Z5 = { inTransitionClauses: framed.length, withTopic: framed.filter((x) => x.topicInContested).length, held: null };
const Z6 = { slots: wpId?.slots ?? [], splits: wpId?.splits?.length ?? null, occupantHypotheses: wpId?.occupantHypotheses ?? [], held: !!wpId && wpId.splits.length === 0 && (wpId.slots ?? []).some((s) => s.chosen === "one_being") && (wpId.occupantHypotheses ?? []).some((x) => /monsieur_pierre/.test(x) && /pierre/.test(x)) };
const guard = pages.find((p) => /Guardiola/.test(p.name));
const Z7 = { slots: guard?.identity.slots ?? [], splits: guard?.identity.splits.length ?? null, held: !!guard && guard.identity.splits.length >= 1 && guard.identity.slots.some((s) => s.chosen === "position") };
const stateA = A.filter((r) => r.pattern === "state"), entryA = A.filter((r) => r.pattern !== "state");
const Z9 = { state: stateA.length, entry: entryA.length, rows: stateA.map((r) => `${r.text} | ${r.occupant} -> ${r.locus} :: ${(r.clause ?? "").slice(0, 90)}`), held: stateA.length > 0 && stateA.length <= 23 && entryA.length === 33 };
const wpRows = B["War and Peace"].rows ?? [];
const wpStateOnBez = wpRows.filter((r) => r.pattern === "state" && /bezukhov/.test(fold(r.locus)));
const Z10 = { stateOnBezukhov: wpStateOnBez.map((r) => `${r.occupant} :: ${(r.clause ?? "").slice(0, 90)}`), bezukhovSlot: (wpId?.slots ?? []).map((s) => s.chosen), held: (wpId?.slots ?? []).some((s) => s.chosen === "one_being") && (wpId?.splits?.length ?? 0) === 0 };
const stateLoose = pages.flatMap((p) => p.looseRows.filter((r) => r.pattern === "state"));
const Z11 = { beingKindState: stateLoose.length, monthOrDemonym: stateLoose.filter((c) => shapeBad(c.surface)).map((c) => `${c.surface} @${c.address}`), held: stateLoose.filter((c) => shapeBad(c.surface)).length === 0 };
const Z12 = { acts: tally(stateA, (r) => `${r.act?.op}·${r.act?.grain}`), overlays: tally(stateA, (r) => `${r.act?.overlay?.op ?? "?"}·${r.act?.overlay?.grain ?? "?"}·${r.act?.overlay?.standing ?? "?"}`), held: stateA.length > 0 && stateA.every((r) => r.act?.op === "NUL" && r.act?.grain === "Ground" && r.act?.overlay) };
const Z13 = { slots: wpId?.slots ?? [], splits: wpId?.splits?.length ?? null, held: (wpId?.slots?.length ?? 0) === 1 && wpId.slots[0].chosen === "one_being" && wpId.splits.length === 0 };
const castViaA = A.filter((r) => r.locusVia === "cast").length;
const Z14 = { entry: entryA.length, state: stateA.length, locusVia: tally(A, (r) => r.locusVia), held: entryA.length === 33 && stateA.length === 24 && castViaA < 13 };
const Z15 = { guardiola: guard?.identity.slots ?? [], ambiguousPairs: pages.flatMap((p) => (p.identity.slots ?? []).filter((s) => /partially/.test(s.reason ?? "")).map((s) => ({ page: p.name, ...s }))), held: !!guard && guard.identity.slots.some((s) => s.chosen === "position") };
const wpStateCast = wpRows.filter((r) => r.pattern === "state" && r.locusVia === "cast");
const Z16 = { count: wpStateCast.length, rows: wpStateCast.map((r) => `${r.occupant} -> ${r.locus} :: ${(r.clause ?? "").replace(/\n/g, " ").slice(0, 90)}`), held: wpStateCast.length < 17 };
const Z17 = { slots: wpId?.slots ?? [], splits: wpId?.splits?.length ?? null, held: (wpId?.slots?.length ?? 0) === 1 && wpId.slots[0].chosen === "one_being" && wpId.splits.length === 0 };
const Z18 = { entry: entryA.length, state: stateA.length, locusVia: tally(A, (r) => r.locusVia), held: entryA.length === 33 && stateA.length === 24 && A.filter((r) => r.locusVia === "cast").length < 13 };
const Z19 = { count: wpStateCast.length, rows: wpStateCast.map((r) => `${r.occupant} -> ${r.locus} :: ${(r.clause ?? "").replace(/\n/g, " ").slice(0, 90)}`), held: wpStateCast.length < 13 };
const wpIdentityRows = wpRows.filter((r) => r.identity);
const wpInverted = (B["War and Peace"].refused ?? {}).inverted_subject ?? 0;
const wpInvertedNamed = (B["War and Peace"].invertedNamed ?? []);
const Z20 = { castLociNotIdentity: wpRows.filter((r) => r.pattern === "state" && r.locusVia === "cast" && !r.identity).map((r) => `${r.occupant} -> ${r.locus}`), identityRows: wpIdentityRows.map((r) => `${r.occupant} = ${r.locus} :: ${(r.clause ?? "").slice(0, 80)}`), inverted: wpInverted, invertedNamed: wpInvertedNamed, held: wpRows.filter((r) => r.pattern === "state" && r.locusVia === "cast" && !r.identity).length === 0 && wpIdentityRows.length >= 2 && wpInverted >= 2 && ["Wolzogen", "Pierre Bezúkhov"].every((n) => wpInvertedNamed.some((s) => s.includes(n))) };
const Z21 = { entry: entryA.length, state: stateA.length, removed: pages.flatMap((p) => p.real.refused.filter((x) => x.reason === "inverted_subject").map((x) => `${p.name} | ${x.subject} :: ${x.clause.slice(0, 80)}`)), held: entryA.length === 33 && stateA.length <= 24 };
const Z22 = { slots: wpId?.slots ?? [], alternatives: wpId?.liveAlternatives ?? [], held: (wpId?.slots?.length ?? 0) === 1 && wpId.slots[0].chosen === "one_being" && (wpId?.liveAlternatives ?? []).some((x) => /s[oó]nya/i.test(x)) };
const Z23 = { inverted: wpInverted, named: wpInvertedNamed.slice(0, 40), allNameShaped: wpInvertedNamed.every((s) => nameShaped(s)), held: wpInverted < 30 && wpInvertedNamed.every((s) => nameShaped(s)) && ["Wolzogen", "Pierre Bezúkhov", "Bennigsen"].every((n) => wpInvertedNamed.some((s) => s.includes(n))) };
const Z24 = { identityClaims: wpId?.identityClaims ?? [], held: (wpId?.identityClaims ?? []).length === 2 && (wpId?.identityClaims ?? []).every((x) => /Circassian = S[oó]nya/.test(x)) };
const Z25 = { entry: entryA.length, state: stateA.length, held: entryA.length === 33 && stateA.length === 24 };
// V14
const V13 = existsSync(`${NATIVE}/eval/identity/results/occupancy-host-eval-v13.json`) ? JSON.parse(readFileSync(`${NATIVE}/eval/identity/results/occupancy-host-eval-v13.json`, "utf8")) : null;
const v13Positions = new Set([...(V13 ? Object.values(V13.live).flatMap((v) => v.positions ?? []) : []), ...(V13 ? (() => { const by = new Map(); for (const r of V13.standingsA) { const k = String(r.locus).toLowerCase(); if (!by.has(k)) by.set(k, new Set()); by.get(k).add(r.occupantId ?? r.occupant); } return [...by].filter(([, o]) => o.size >= 2).map(([locus]) => ({ locus })); })() : [])].map((p) => String(p.locus).toLowerCase()));
const vetoed = [...pages.flatMap((p) => p.real.refused.filter((x) => x.reason === "locus_not_nominal").map((x) => ({ text: p.name, ...x }))), ...Object.entries(B).flatMap(([k, v]) => (v.notNominal ?? []).map((x) => ({ text: k, ...x })))];
const vetoedLoci = vetoed.map((x) => String(x.complement ?? "").toLowerCase().replace(/^(?:the|a|an)\s+/, "").replace(/[.,;”"’']+$/u, ""));
const Z26 = { count: vetoed.length, byWord: tally(vetoed, (x) => x.word), sample: vetoed.slice(0, 20).map((x) => `${x.text} | ${x.word} [${(x.classes ?? []).join(",")}] :: ${x.complement}`), allZeroNominal: vetoed.every((x) => { const t = POS_PRIOR.forms?.[String(x.word).toLowerCase()]; return t && !((t.NOUN ?? 0) + (t.PROPN ?? 0) > 0); }), wasPosition: vetoedLoci.filter((l) => v13Positions.has(l)), held: vetoed.length > 0 && !vetoedLoci.some((l) => v13Positions.has(l)) };
const wpNaming = B["War and Peace"]?.naming ?? { rows: [], controlRows: null, slots: [] };
const cyril = wpNaming.rows.filter((r) => /Cyril Vlad.*Bez[uú]khov/i.test(r.surface) && /Count Bez[uú]khov/i.test(r.locus));
const Z27 = { rows: wpNaming.rows.slice(0, 20), cyril: cyril.map((r) => `${r.surface} -> ${r.locus} (${r.via}) @s${r.at}`), controlRows: wpNaming.controlRows, held: cyril.length >= 1 && wpNaming.controlRows === 0 };
const Z28 = { namedSlots: wpNaming.slots, predicatedSlots: wpId?.slots ?? [], held: wpNaming.slots.some((s) => s.verdict === "contested") && !wpNaming.slots.some((s) => s.chosen === "position") && (wpId?.slots ?? []).some((s) => s.chosen === "one_being") };
const Z8 = { perText: [...pages.map((p) => ({ text: p.name, slots: p.identity.slots })), ...Object.entries(B).map(([k, v]) => ({ text: k, slots: v.identity?.slots ?? [] }))].filter((x) => x.slots.length), held: null };

const out = {
  Z1, Z2, Z3, Z4, Z5, Z6, Z7, Z8, Z9, Z10, Z11, Z12, Z13, Z14, Z15, Z16, Z17, Z18, Z19, Z20, Z21, Z22, Z23, Z24, Z25, Z26, Z27, Z28, Y1, Y2, Y3, X1, X2, X3,
  ...W, V1, V2, V3, V4, V5, V6,
  nativeA: { standings: AN.length, perPage: pagesN.map((p) => ({ page: p.name, standings: p.rows.length, refused: tally(p.real.refused, (x) => x.reason), cast: p.cast, seconds: p.seconds })), via: tally(AN, (c) => c.via), rows: AN },
  nativeB: BN,
  declared: { pages: pages.length, fixture: { retrievedAt: FIX.retrievedAt, giver: FIX.giver }, liveTexts: Object.keys(B_PATHS) },
  H1, H2, H3, H4, H5,
  byDomain: Object.fromEntries([...new Set(pages.map((p) => p.domain))].map((d) => { const ps = pages.filter((p) => p.domain === d); return [d, { pages: ps.map((p) => p.name), standings: ps.reduce((n, p) => n + p.rows.length, 0), refused: tally(ps.flatMap((p) => p.real.refused), (r) => r.reason), ablationStandings: ps.reduce((n, p) => n + p.ablation.candidates.length, 0) }]; })),
  via: tally(A, (c) => c.via), locusVia: tally(A, (c) => c.locusVia),
  standingsA: A,
  live: Object.fromEntries(Object.entries(B).map(([k, v]) => [k, { ...v, rows: v.rows.slice(0, 60) }])),
};
for (const k of ["H1", "H2", "H3", "H4", "H5", "V1", "V2", "V3", "V4", "V5", "V6", "W1", "W2", "W3", "W4", "W5", "X1", "X2", "X3", "Y1", "Y2", "Y3", "Z1", "Z2", "Z3", "Z4", "Z5", "Z6", "Z7", "Z8", "Z9", "Z10", "Z11", "Z12", "Z13", "Z14", "Z15", "Z16", "Z17", "Z18", "Z19", "Z20", "Z21", "Z22", "Z23", "Z24", "Z25", "Z26", "Z27", "Z28"]) console.log(k, out[k].held === true ? "HELD" : out[k].held === false ? "FAILED" : "GAP", JSON.stringify(out[k]).slice(0, 300));
console.log("via", out.via, "locusVia", out.locusVia);
for (const [k, v] of Object.entries(B)) console.log(k, v.standings, "standings", v.ablationStandings, "ablation", v.seconds, "s", JSON.stringify(v.refused));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
