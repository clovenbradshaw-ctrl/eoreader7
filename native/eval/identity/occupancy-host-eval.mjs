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
//   node occupancy-host-eval.mjs [out.json]
import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { readOccupancyTestimony, positionsByPattern } = await import(`${NATIVE}/adapters/text/occupancy-testimony.js`);
const { NEGATION_WORDS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, AUXILIARY_VERBS } = await import(`${NATIVE}/adapters/text/priors.js`);
const { COPULA_FORMS } = await import(`${NATIVE}/adapters/text/phasepost.js`);
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
  const surfRe = new Map(referents.map((r) => [r.id, new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...r.surfaces].sort((x, y) => y.length - x.length).map(esc).join("|")})(?![\\p{L}\\p{N}])`, "giu")]));
  const sentences = encs.map((e, at) => ({ text: e.material, at, offset: e.anchor?.start ?? 0 }));
  const mentions = (sentence) => {
    const out = [];
    for (const r of referents) for (const m of sentence.text.matchAll(surfRe.get(r.id))) out.push({ start: m.index, end: m.index + m[0].length, referent: key(r.id), via: "cast" });
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

function readText({ name, text, links }) {
  const t0 = Date.now();
  const session = createSession();
  admitChunked(session, { text, sourceId: name, language: "en" });
  const cast = sessionCast(session, { sourceId: name });
  const shift = cast.body === text ? 0 : text.indexOf(cast.body);
  const display = new Map(cast.referents.map((r) => [r.id, [...r.surfaces].sort((a, b) => b.length - a.length)[0]]));
  const key = (r) => `${name}/${r.id}`;
  // THE PIPELINE'S OWN MENTIONS, in the sentence's coordinates. Nothing here
  // reads capitalisation; the ablation arm does.
  const surfRe = new Map(cast.referents.map((r) => [r.id, new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...r.surfaces].sort((x, y) => y.length - x.length).map(esc).join("|")})(?![\\p{L}\\p{N}])`, "gu")]));
  const mentions = (sentence) => {
    const out = [];
    for (const r of cast.referents) for (const m of sentence.text.matchAll(surfRe.get(r.id))) out.push({ start: m.index, end: m.index + m[0].length, referent: key(r), via: "cast" });
    for (const b of cast.pronounBindings) if (b.sentenceOrder === sentence.at) { const st = b.offset - sentence.offset; if (st >= 0 && st < sentence.text.length) out.push({ start: st, end: st + b.pronoun.length, referent: `${name}/${b.referentId}`, via: "pronoun" }); }
    return out;
  };
  const resolveLocus = (sentence, span) => {
    const a = { start: shift + sentence.offset + span.start, end: shift + sentence.offset + span.end };
    const l = links.find((x) => x.start >= a.start && x.start < a.end);
    if (l) return { referent: l.title, via: "link" };
    const surf = sentence.text.slice(span.start, span.end);
    const hit = cast.referents.find((r) => r.surfaces.some((s) => has(surf, s)));
    if (hit) return { referent: display.get(hit.id), via: "cast" };
    return null;
  };
  const sentences = cast.sentences.map((s) => ({ text: s.text, at: s.order, offset: s.offset }));
  const opts = { source: name, determiners: DET, modals: MODALS, negation: NEGATION_WORDS };
  const real = readOccupancyTestimony(sentences, { ...opts, mentions, pronouns: SUBJECT_PRONOUNS, resolveLocus });
  const ablation = readOccupancyTestimony(sentences, opts);
  const face = (id) => { const r = cast.referents.find((x) => `${name}/${x.id}` === id); return r ? display.get(r.id) : id; };
  const rows = real.candidates.map((c) => ({ text: name, occupant: face(c.occupant), occupantId: c.occupant, via: c.occupantVia, surface: c.occupantSurface, locus: c.locus, locusVia: c.locusVia, predecessor: c.predecessor ? face(c.predecessor) : null, pattern: c.pattern, year: c.year, address: c.address, clause: c.clause }));
  return { name, rows, real, ablation, cast: { referents: cast.referents.length, pronounBindings: cast.pronounBindings.length, sentences: cast.sentences.length, gaps: cast.gaps.map((g) => g.reason ?? g) }, seconds: +((Date.now() - t0) / 1000).toFixed(1) };
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
const withTimeout = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(() => res({ timedOut: true }), ms).unref?.())]);
for (const [name, path] of Object.entries(B_PATHS)) {
  const text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  { const t0 = Date.now(); const rn = await withTimeout(readNative({ name, text, links: [] }), 600000);
    BN[name] = rn.timedOut ? { timedOut: true, seconds: +((Date.now() - t0) / 1000).toFixed(1) } : { standings: rn.rows.length, refused: tally(rn.real.refused, (x) => x.reason), via: tally(rn.rows, (x) => x.via), cast: rn.cast, seconds: rn.seconds, rows: rn.rows.slice(0, 60), refusedNamed: rn.real.refused.filter((x) => /chaplain|Professor|Gorbachev|Bez[uú]khov/i.test(`${x.clause ?? ""} ${x.complement ?? ""}`)).slice(0, 8) }; }
  const r = readText({ name, text, links: [] });
  const pat = positionsByPattern(r.real.candidates);
  const faces = new Map(r.rows.map((x) => [x.occupantId, x.occupant]));
  B[name] = { standings: r.rows.length, positions: pat.positions.map((p) => ({ locus: p.locus, occupants: p.occupants.map((o) => faces.get(o) ?? o), evidence: p.evidence })), refused: tally(r.real.refused, (x) => x.reason), via: tally(r.rows, (x) => x.via), ablationStandings: r.ablation.candidates.length, cast: r.cast, seconds: r.seconds, rows: r.rows, refusedNamed: r.real.refused.filter((x) => /chaplain|Professor|Gorbachev|Bez[uú]khov/i.test(`${x.clause ?? ""} ${x.complement ?? ""}`)).slice(0, 8) };
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
const V6 = { hostSeconds: B["War and Peace"].seconds, nativeSeconds: BN["War and Peace"].seconds, nativeTimedOut: !!BN["War and Peace"].timedOut, held: !BN["War and Peace"].timedOut && B["War and Peace"].seconds < 600 };

const out = {
  V1, V2, V3, V4, V5, V6,
  nativeA: { standings: AN.length, perPage: pagesN.map((p) => ({ page: p.name, standings: p.rows.length, refused: tally(p.real.refused, (x) => x.reason), cast: p.cast, seconds: p.seconds })), via: tally(AN, (c) => c.via), rows: AN },
  nativeB: BN,
  declared: { pages: pages.length, fixture: { retrievedAt: FIX.retrievedAt, giver: FIX.giver }, liveTexts: Object.keys(B_PATHS) },
  H1, H2, H3, H4, H5,
  byDomain: Object.fromEntries([...new Set(pages.map((p) => p.domain))].map((d) => { const ps = pages.filter((p) => p.domain === d); return [d, { pages: ps.map((p) => p.name), standings: ps.reduce((n, p) => n + p.rows.length, 0), refused: tally(ps.flatMap((p) => p.real.refused), (r) => r.reason), ablationStandings: ps.reduce((n, p) => n + p.ablation.candidates.length, 0) }]; })),
  via: tally(A, (c) => c.via), locusVia: tally(A, (c) => c.locusVia),
  standingsA: A,
  live: Object.fromEntries(Object.entries(B).map(([k, v]) => [k, { ...v, rows: v.rows.slice(0, 60) }])),
};
for (const k of ["H1", "H2", "H3", "H4", "H5", "V1", "V2", "V3", "V4", "V5", "V6"]) console.log(k, out[k].held === true ? "HELD" : out[k].held === false ? "FAILED" : "GAP", JSON.stringify(out[k]).slice(0, 300));
console.log("via", out.via, "locusVia", out.locusVia);
for (const [k, v] of Object.entries(B)) console.log(k, v.standings, "standings", v.ablationStandings, "ablation", v.seconds, "s", JSON.stringify(v.refused));
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
