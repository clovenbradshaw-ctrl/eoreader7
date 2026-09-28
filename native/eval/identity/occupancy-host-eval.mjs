// occupancy-host-eval.mjs — occupancy testimony read THROUGH THE REAL
// PIPELINE: the constitutional host (legacy-ported/packages/host/corpus.js)
// admits each page, and an occupant must be a REFERENT that pipeline reached,
// never a capitalised string. Zero model calls. (2026-09-28)
//
// WHY THIS RUN EXISTS. occupancy-eval.mjs (registered 2026-09-27) failed O1
// and O2, and read the failure off its own rows: occupants were capitalised
// runs ("He", "Several", "Claims"), definite descriptions were treated as
// positions, and the key resolved people BY STRING (Katherine Johnson became
// Boris Johnson, "confirmed" by the shared word "State"). Direction: "more
// than just hyperlinks it should be a referent"; "run it through the real
// pipeline". So both halves change: the reader's occupant is a referent, and
// the key is item-to-item, never word overlap.
//
// PRE-REGISTERED 2026-09-28, before the first run. The reader has not read
// any page below. (One page, Joachim Murat, was opened by hand to learn the
// host's output SHAPE; its standings were not computed.)
//   Material: 13 fresh held-out pages across seven domains, fetched once and
//     committed (fixtures/occupancy-pages.json, fetch-occupancy-pages.mjs):
//     politics (Hannibal Hamlin, Andrew Johnson, Angela Merkel), military
//     (Joachim Murat, Mikhail Kutuzov), law (John Roberts, William Rehnquist),
//     church (Pope Benedict XVI), business (Tim Cook, Satya Nadella), sport
//     (Alex Ferguson, Pep Guardiola), academia (Lawrence Summers). Plus War
//     and Peace (Maude, live_priors) through the same host, unkeyed.
//   Body: rest_v1 Parsoid HTML, top-level <p> prose only, hyperlinks kept as
//     spans (lib/wiki-body.mjs). The host reads exactly that text.
//   Occupant resolver, tiers in order, each named on the standing as `via`:
//     cast     a host-admitted referent's surface occurs, word-bounded, in the
//              occupant slot (the host's own identity; L2 is the host's)
//     pronoun  a host pronoun binding whose offset lies in the slot
//     topic    the slot's name IS the page's title, or its surname form —
//              the medium's own convention, received: Wikipedia MOS:SURNAME
//              ("after the initial mention … referred to by surname only");
//              an article's title names its topic
//     link     a hyperlink whose span lies in the slot (ostension)
//     none of these -> refused, occupant_not_a_referent
//   Grounding a referent to an item (never by spelling a search): a host
//     referent whose surface is the visible text of a link on the page takes
//     that link's item (the majority item if several); a topic referent takes
//     the page's own item.
//   Locus resolver: a link starting inside the complement span -> its item;
//     else a host referent surface inside it -> that referent's item; else the
//     locus stays a surface and is unkeyed.
//   Key, item level: a standing is CONFIRMED when the occupant item is a
//     human (P31 Q5) and one of its P39 statements has position == locus
//     item, or P642 ("of") == locus item, or the position's P1001 (applies
//     to jurisdiction) == locus item. KEYED = occupant human with >= 1 P39
//     AND locus has an item. An unconfirmed keyed standing is "not in the
//     key", never "wrong" — P39 is incomplete by construction.
//
//   H1  >= 50% of keyed standings are confirmed, AND the control built to
//       fail — locus items permuted among the keyed standings (seed 7, 40
//       draws) — confirms at median <= half the real rate
//   H2  the wall: no admitted occupant's first token is one the POS prior
//       (UD_English-EWT, fixtures pos-prior-eng.json) settles as closed-class,
//       and none is determiner-led; the ABLATION arm (no resolver: the
//       capitalised run is the occupant, as in the 2026-09-27 run) admits at
//       least one such occupant — the wall's control, built to fail
//   H3  positionsByPattern over locus ITEMS admits at least one position with
//       two distinct occupant ITEMS
//   H4  War and Peace: a standing whose occupant is a host referent with a
//       surface containing "Pierre" and whose locus contains "Bezukhov"
//   H5  live_priors, through the same host, no key (added 2026-09-28 before
//       the run, on the direction "various things in live priors AND
//       wikidata and wikipedia, but only wikidata makes it too specific" —
//       Wikidata is the KEY, never material). Each prediction was written
//       from ONE grep of the raw text, nothing computed by the reader:
//       a  Immanuel_Kant (live_priors wikipedia digest): a standing whose
//          occupant is a host referent with surface "Kant" and whose locus
//          surface begins "Full Professor"
//       b  Middlemarch: "Tyke became chaplain to the Infirmary" is REFUSED
//          as state_not_position — a bare-noun complement the structural
//          typing cannot see as a position; registered as the reader's own
//          predicted limit, not a hypothesis it should pass
//       c  The Federalist Papers: zero standings (rules and hypotheticals,
//          not testimony)
//       d  Dracula, Great Expectations, Crime and Punishment: zero positions
//          by pattern — a novel's becomings are states, not offices
//       e  Cold_War (digest): a standing with occupant a host referent with
//          surface "Gorbachev"; its locus surface will carry the digest's
//          glued link label — reported as the material's defect, not the
//          reader's
//   Reported, not predicted: standings and refusals by reason per domain,
//   resolution tiers by `via`, and — where a pronoun-tier occupant is keyed —
//   whether its item is the page topic.
//   node occupancy-host-eval.mjs [out.json]
import { readFileSync, writeFileSync } from "node:fs";
const NATIVE = new URL("../..", import.meta.url).pathname;
const { readOccupancyTestimony, positionsByPattern } = await import(`${NATIVE}/adapters/text/occupancy-testimony.js`);
const { NEGATION_WORDS, DEFINITE_DETERMINERS, INDEFINITE_DETERMINERS, AUXILIARY_VERBS } = await import(`${NATIVE}/adapters/text/priors.js`);
const { COPULA_FORMS } = await import(`${NATIVE}/adapters/text/phasepost.js`);
const { createSession, admitChunked, sessionCast } = await import(`${NATIVE}/legacy-ported/packages/host/corpus.js`);
const { createSeededRng, shuffled } = await import(`${NATIVE}/kernel/rng.js`);
const [OUT] = process.argv.slice(2);

const FIX = JSON.parse(readFileSync(new URL("./fixtures/occupancy-pages.json", import.meta.url), "utf8"));
const POS = JSON.parse(readFileSync(`${NATIVE}/eval/the-fold/fixtures/pos-prior-eng.json`, "utf8")).forms;
const CLOSED = new Set(["DET", "ADP", "PRON", "CCONJ", "SCONJ", "PART", "PUNCT", "AUX", "NUM", "INTJ", "SYM"]);
const closedClass = (w) => { const t = POS[w.toLowerCase()]; if (!t) return false; let top = null, n = -1; for (const [k, c] of Object.entries(t)) if (c > n) { top = k; n = c; } return CLOSED.has(top); };
const MODALS = new Set([...AUXILIARY_VERBS].filter((w) => !COPULA_FORMS.has(w) && !["have", "has", "had", "do", "does", "did"].includes(w)));
const DET = { definite: DEFINITE_DETERMINERS, indefinite: INDEFINITE_DETERMINERS };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (hay, surface) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(surface)}(?![\\p{L}\\p{N}])`, "u").test(hay);
const tally = (xs, f) => xs.reduce((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {});
const DOMAIN = { "Hannibal Hamlin": "politics", "Andrew Johnson": "politics", "Angela Merkel": "politics", "Joachim Murat": "military", "Mikhail Kutuzov": "military", "John Roberts": "law", "William Rehnquist": "law", "Pope Benedict XVI": "church", "Tim Cook": "business", "Satya Nadella": "business", "Alex Ferguson": "sport", "Pep Guardiola": "sport", "Lawrence Summers": "academia" };

function readPage({ title, text, links, pageItem, itemOf }) {
  const session = createSession();
  admitChunked(session, { text, sourceId: title, language: "en" });
  const cast = sessionCast(session, { sourceId: title });
  const shift = cast.body === text ? 0 : text.indexOf(cast.body);
  const absLinks = links.map((l) => ({ ...l, item: itemOf(l.title) })).filter((l) => l.item);
  // ground host referents to items through the page's own links
  const anchorItems = new Map(); for (const l of absLinks) { const k = l.text.trim(); if (!anchorItems.has(k)) anchorItems.set(k, []); anchorItems.get(k).push(l.item); }
  const titleName = title ? title.replace(/\s*\(.*\)$/, "") : null;
  const surname = titleName ? titleName.split(/\s+/).at(-1) : null;
  const itemOfRef = new Map();
  for (const r of cast.referents) {
    const votes = r.surfaces.flatMap((s) => anchorItems.get(s) ?? []);
    if (titleName && r.surfaces.includes(titleName)) votes.push(pageItem, pageItem);
    if (votes.length) itemOfRef.set(r.id, Object.entries(tally(votes, (x) => x)).sort((a, b) => b[1] - a[1])[0][0]);
  }
  const keyOfRef = (r) => itemOfRef.get(r.id) ?? `host:${r.id}`;
  const sentences = cast.sentences.map((s) => ({ text: s.text, at: s.order, offset: s.offset }));
  const abs = (sentence, span) => ({ start: shift + sentence.offset + span.start, end: shift + sentence.offset + span.end });
  const resolveOccupant = (sentence, slot) => {
    const surf = sentence.text.slice(slot.start, slot.end).trim();
    const hit = cast.referents.find((r) => r.surfaces.some((s) => has(surf, s)));
    if (hit) return { referent: keyOfRef(hit), via: "cast" };
    const a = abs(sentence, slot);
    const pb = cast.pronounBindings.find((b) => shift + b.offset >= a.start && shift + b.offset < a.end);
    if (pb) { const r = cast.referents.find((x) => x.id === pb.referentId); return { referent: r ? keyOfRef(r) : `host:${pb.referentId}`, via: "pronoun" }; }
    const name = surf.replace(/[’']s$/u, "");
    if (titleName && pageItem && (name === titleName || name === surname)) return { referent: pageItem, via: "topic" };
    const l = absLinks.find((x) => x.start >= a.start && x.end <= a.end);
    if (l) return { referent: l.item, via: "link" };
    return null;
  };
  const resolveLocus = (sentence, span) => {
    const a = abs(sentence, span);
    const l = absLinks.find((x) => x.start >= a.start && x.start < a.end);
    if (l) return { referent: l.item, via: "link" };
    const surf = sentence.text.slice(span.start, span.end);
    const hit = cast.referents.find((r) => r.surfaces.some((s) => has(surf, s)));
    if (hit && itemOfRef.has(hit.id)) return { referent: itemOfRef.get(hit.id), via: "cast" };
    return null;
  };
  const opts = { source: title ?? "war-and-peace", determiners: DET, modals: MODALS, negation: NEGATION_WORDS };
  const real = readOccupancyTestimony(sentences, { ...opts, resolveOccupant, resolveLocus });
  const ablation = readOccupancyTestimony(sentences, opts);
  return { real, ablation, cast: { referents: cast.referents.length, pronounBindings: cast.pronounBindings.length, grounded: itemOfRef.size }, shift, cast0: cast };
}

// ── the thirteen pages ────────────────────────────────────────────────────
const itemOf = (t) => FIX.titleItem[t] ?? null;
const pages = Object.entries(FIX.pages).map(([title, { text, links }]) => ({ title, domain: DOMAIN[title], ...readPage({ title, text, links, pageItem: itemOf(title), itemOf }) }));
const all = pages.flatMap((p) => p.real.candidates.map((c) => ({ ...c, page: p.title, domain: p.domain })));
const isItem = (x) => typeof x === "string" && /^Q\d+$/.test(x);

// ── H1: item-level key ────────────────────────────────────────────────────
const confirmed = (occ, loc) => {
  const it = FIX.items[occ]; if (!it?.human) return false;
  return (it.P39 ?? []).some((s) => s.position === loc || s.of.includes(loc) || (FIX.positions[s.position]?.P1001 ?? []).includes(loc));
};
const keyed = all.filter((c) => isItem(c.occupant) && FIX.items[c.occupant]?.human && (FIX.items[c.occupant].P39 ?? []).length && isItem(c.locus));
const rate = (xs, locs) => xs.length ? xs.filter((c, i) => confirmed(c.occupant, locs ? locs[i] : c.locus)).length / xs.length : null;
const realRate = rate(keyed);
const draws = []; for (let d = 0; d < 40; d += 1) draws.push(rate(keyed, shuffled(keyed.map((c) => c.locus), createSeededRng({ seed: 7, purpose: `occupancy-host-control-${d}` }))));
draws.sort((a, b) => a - b);
const controlMedian = keyed.length ? (draws[19] + draws[20]) / 2 : null;
const H1 = { admitted: all.length, keyed: keyed.length, confirmed: keyed.filter((c) => confirmed(c.occupant, c.locus)).length, confirmedRate: realRate, controlMedian, held: realRate != null && realRate >= 0.5 && controlMedian <= realRate / 2 };

// ── H2: the referent wall and its ablation control ───────────────────────
const badOccupant = (surface) => { const first = surface.split(/\s+/)[0]; return closedClass(first) || DEFINITE_DETERMINERS.has(first.toLowerCase()) || INDEFINITE_DETERMINERS.has(first.toLowerCase()); };
const realBad = all.filter((c) => badOccupant(c.occupantSurface) && c.occupantVia !== "pronoun");
const ablBad = pages.flatMap((p) => p.ablation.candidates).filter((c) => badOccupant(c.occupant));
const H2 = { realClosedOrDescription: realBad.map((c) => `${c.occupantSurface} (${c.occupantVia}) @${c.address}`), ablationClosedOrDescription: ablBad.length, ablationSample: ablBad.slice(0, 12).map((c) => c.occupant), held: realBad.length === 0 && ablBad.length >= 1,
  note: "a pronoun-tier occupant is a pronoun by construction and is a referent only through the host's binding; it is reported by tier, not counted against the wall" };

// ── H3: positions by pattern over items ──────────────────────────────────
const pat = positionsByPattern(all.filter((c) => isItem(c.locus) && isItem(c.occupant)));
const lab = (q) => FIX.items[q]?.label ?? FIX.positions[q]?.label ?? q;
const twoItems = pat.positions.filter((p) => p.evidence === "two_occupants");
const H3 = { positions: pat.positions.map((p) => ({ locus: `${lab(p.locus.toUpperCase())} (${p.locus.toUpperCase()})`, occupants: p.occupants.map(lab), evidence: p.evidence })), descriptions: pat.descriptions.length, held: twoItems.length >= 1 };

// ── H4: War and Peace through the host ───────────────────────────────────
const wpText = readFileSync("/home/user/live_priors/11-multi-language/war-and-peace/en/pg2600_War_and_Peace_Tolstoy_Maude.txt", "utf8").replace(/\r\n/g, "\n");
const t0 = Date.now();
const wp = readPage({ title: null, text: wpText, links: [], pageItem: null, itemOf: () => null });
const wpRefs = new Map(wp.cast0.referents.map((r) => [`host:${r.id}`, r]));
const wpRows = wp.real.candidates.map((c) => ({ occupant: wpRefs.get(c.occupant)?.surfaces.slice(0, 4).join("|") ?? c.occupant, via: c.occupantVia, surface: c.occupantSurface, locus: c.locus, clause: c.clause }));
const H4 = { standings: wpRows.length, seconds: Math.round((Date.now() - t0) / 1000), bezukhov: wpRows.filter((r) => /bezukhov/i.test(r.locus)), refused: tally(wp.real.refused, (r) => r.reason), held: wp.real.candidates.some((c) => /bezukhov/i.test(c.locus) && (wpRefs.get(c.occupant)?.surfaces ?? []).some((s) => /Pierre/.test(s))) };

// ── H5: live_priors through the host, unkeyed ─────────────────────────────
const LP = "/home/user/live_priors";
const LIVE = {
  "Immanuel_Kant": `${LP}/02-encyclopedic/wikipedia/Immanuel_Kant.txt`,
  "Cold_War": `${LP}/02-encyclopedic/wikipedia/Cold_War.txt`,
  "Middlemarch": `${LP}/01-literature-books/gutenberg/pg145_Middlemarch-George-Eliot.txt`,
  "Federalist": `${LP}/01-literature-books/gitenberg/pg1404_The-Federalist-Papers.txt`,
  "Dracula": `${LP}/01-literature-books/gutenberg/pg345_Dracula.txt`,
  "Great_Expectations": `${LP}/01-literature-books/gitenberg/pg1400_Great-Expectations.txt`,
  "Crime_and_Punishment": `${LP}/01-literature-books/gitenberg/pg2554_Crime-and-Punishment.txt`,
};
const live = {};
for (const [name, path] of Object.entries(LIVE)) {
  const t1 = Date.now();
  const r = readPage({ title: null, text: readFileSync(path, "utf8").replace(/\r\n/g, "\n"), links: [], pageItem: null, itemOf: () => null });
  const refs = new Map(r.cast0.referents.map((x) => [`host:${x.id}`, x]));
  const rows = r.real.candidates.map((c) => ({ occupant: refs.get(c.occupant)?.surfaces.slice(0, 4).join("|") ?? c.occupant, via: c.occupantVia, surface: c.occupantSurface, locus: c.locus, clause: c.clause }));
  const pat = positionsByPattern(r.real.candidates);
  live[name] = { standings: rows.length, positions: pat.positions.map((p) => ({ locus: p.locus, occupants: p.occupants.map((o) => refs.get(o)?.surfaces[0] ?? o), evidence: p.evidence })), refused: tally(r.real.refused, (x) => x.reason), via: tally(r.real.candidates, (c) => c.occupantVia), cast: r.cast, seconds: Math.round((Date.now() - t1) / 1000), rows, refusedSample: r.real.refused.filter((x) => /chaplain|Professor|Gorbachev/.test(x.clause ?? "") || /chaplain|Professor|Gorbachev/.test(x.complement ?? "")).slice(0, 6) };
}
const H5 = {
  a: { held: live.Immanuel_Kant.rows.some((r) => /Kant/.test(r.occupant) && /^Full Professor/.test(r.locus)), rows: live.Immanuel_Kant.rows.filter((r) => /Professor/.test(r.locus) || /Professor/.test(r.clause)) },
  b: { held: live.Middlemarch.rows.every((r) => !/chaplain/.test(r.locus)) && (live.Middlemarch.refusedSample.some((x) => x.reason === "state_not_position" && /chaplain/.test(x.complement ?? x.clause ?? ""))), evidence: live.Middlemarch.refusedSample },
  c: { held: live.Federalist.standings === 0, standings: live.Federalist.standings, refused: live.Federalist.refused, rows: live.Federalist.rows.slice(0, 10) },
  d: { held: ["Dracula", "Great_Expectations", "Crime_and_Punishment"].every((n) => live[n].positions.length === 0), positions: Object.fromEntries(["Dracula", "Great_Expectations", "Crime_and_Punishment"].map((n) => [n, live[n].positions])) },
  e: { held: live.Cold_War.rows.some((r) => /Gorbachev/.test(r.occupant)), rows: live.Cold_War.rows.filter((r) => /Gorbachev/.test(r.occupant) || /Gorbachev/.test(r.clause)) },
};
H5.held = ["a", "b", "c", "d", "e"].every((k) => H5[k].held);

const out = {
  declared: { pages: pages.length, fixture: { retrievedAt: FIX.retrievedAt, giver: FIX.giver } },
  H1, H2, H3, H4, H5,
  live: Object.fromEntries(Object.entries(live).map(([k, v]) => [k, { ...v, rows: v.rows.slice(0, 40) }])),
  byDomain: Object.fromEntries([...new Set(pages.map((p) => p.domain))].map((d) => { const ps = pages.filter((p) => p.domain === d); return [d, { pages: ps.map((p) => p.title), standings: ps.reduce((n, p) => n + p.real.candidates.length, 0), refused: tally(ps.flatMap((p) => p.real.refused), (r) => r.reason), ablationStandings: ps.reduce((n, p) => n + p.ablation.candidates.length, 0) }]; })),
  via: tally(all, (c) => c.occupantVia), locusVia: tally(all, (c) => c.locusVia),
  pronounTier: all.filter((c) => c.occupantVia === "pronoun").map((c) => ({ page: c.page, occupant: lab(c.occupant), isTopic: c.occupant === FIX.titleItem[c.page], clause: c.clause })),
  hostCast: Object.fromEntries(pages.map((p) => [p.title, { ...p.cast, shift: p.shift }])),
  standings: all.map((c) => ({ page: c.page, occupant: isItem(c.occupant) ? `${lab(c.occupant)} (${c.occupant})` : c.occupant, via: c.occupantVia, surface: c.occupantSurface, locus: isItem(c.locus) ? `${lab(c.locus)} (${c.locus})` : c.locus, locusVia: c.locusVia, keyed: keyed.includes(c), confirmed: keyed.includes(c) ? confirmed(c.occupant, c.locus) : null, pattern: c.pattern, clause: c.clause })),
  warAndPeace: { ...H4, sample: wpRows.slice(0, 40) },
};
for (const k of ["H1", "H2", "H3", "H4", "H5"]) console.log(k, out[k].held === true ? "HELD" : out[k].held === false ? "FAILED" : "GAP", JSON.stringify(out[k]).slice(0, 400));
console.log("via", out.via, "locusVia", out.locusVia);
if (OUT) writeFileSync(OUT, JSON.stringify(out, null, 1));
