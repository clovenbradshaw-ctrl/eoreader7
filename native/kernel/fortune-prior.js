// kernel/fortune-prior.js — FortunePrior@1: the record's OWN conviction
// structure, accumulated over time, filterable by genre, medium, and shape.
//
// Vonnegut sent OUT to extract the record's organic movements (the fortune
// curve: cumulative propositions established per position; the movements are
// where conviction climbs). Each extraction is one ENTRY, appended with its
// provenance (source, readAt, recipe) and its declared genre/medium tags. The
// prior accumulates: N records read → N entries → queries over them answer
// "what does a rising historical-text arc look like?" or "how do narrative
// prose arcs differ from technical ones?"
//
// The shape is CLASSIFIED, never tuned: from the movement gains alone, by a
// declared rule (rising / man-in-hole / decaying / flatline). A quantity may
// not be named after a state its measurement does not establish — the class
// is a description of the gains sequence, nothing more.
//
// MEDIUM-BLIND: an entry's `movements` are the caller's (vonnegut-extract
// reads text today; a score, a shot-list, a flight would render the same
// way). This file holds the ledger algebra, not any medium's grammar.
//
// GENRE IS REGISTER (Halliday — Systemic Functional Linguistics): an entry's
// `genre` is not a declared label but the FIELD (what is going on — the
// social activity), `medium` is the MODE (how the message is carried), and
// `tenor` is who takes part. Genre as a STAGED, goal-oriented social process
// (Martin on Halliday) is the movements themselves: the fortune curve's
// organic phases are the genre's schematic structure — orientation,
// complication, resolution, read off the record's own conviction curve.

export const FORTUNE_PRIOR_SCHEMA = "FortunePrior@1";

/** The declared shape classifier — from the movement GAINS alone. */
export function classifyFortuneShape(gains = [], { flatlineFloor = 0.01 } = {}) {
  const g = (gains ?? []).filter((n) => Number.isFinite(n));
  if (!g.length) return "unknown";
  const sum = g.reduce((a, b) => a + b, 0);
  const peak = Math.max(...g);
  if (sum <= flatlineFloor) return "flatline";        // nothing accumulates — argues nothing
  if (g[0] > 0 && g[g.length - 1] > 0 && peak > g[0]) return "rising"; // conviction climbs to a peak
  if (g[0] > peak * 0.7 && g[g.length - 1] < peak * 0.3) return "decaying"; // opens strong, fades
  if (g[0] < peak * 0.4 && g[g.length - 1] > g[0]) return "man-in-hole"; // weak open, recovers past it
  return "variable";
}

/**
 * appendFortune(prior, entry) → the prior with the entry appended and its
 * genre/medium/shape indexes updated. The ledger is append-only: an entry is
 * never edited, only superseded by a later reading of the same source.
 */
export function appendFortune(prior, entry) {
  const base = prior ?? { schema: FORTUNE_PRIOR_SCHEMA, standing: "received", giver: null, compiledAt: null, entries: [], byGenre: {}, byMedium: {}, byShape: {} };
  if (base.schema !== FORTUNE_PRIOR_SCHEMA) throw new TypeError(`appendFortune: schema must be ${FORTUNE_PRIOR_SCHEMA}`);
  if (!entry?.source?.file || !Array.isArray(entry.movements)) throw new TypeError("appendFortune: an entry names its source and carries movements");
  const shape = entry.shape ?? classifyFortuneShape(entry.gains ?? entry.movements.map((m) => m.gain));
  const e = { ...entry, shape, appendedAt: entry.appendedAt ?? new Date().toISOString() };
  const next = { ...base, entries: [...base.entries, e] };
  const idx = (key) => {
    const genre = String(e.genre ?? "unclassified"); next.byGenre[genre] = [...(next.byGenre[genre] ?? []), key];
    const medium = String(e.medium ?? "unclassified"); next.byMedium[medium] = [...(next.byMedium[medium] ?? []), key];
    next.byShape[shape] = [...(next.byShape[shape] ?? []), key];
  };
  idx(next.entries.length - 1);
  return next;
}

/**
 * filterFortune(prior, { genre, medium, shape }) → the entries matching ALL
 * declared filters (the intersection), each with its movements intact. No
 * filter declared = everything.
 */
export function filterFortune(prior, { genre = null, medium = null, shape = null } = {}) {
  if (!prior?.entries) return [];
  let keys = prior.entries.map((_, i) => i);
  for (const [tag, value] of Object.entries({ genre, medium, shape })) {
    if (value == null) continue;
    const wanted = new Set(prior[`by${tag[0].toUpperCase() + tag.slice(1)}`]?.[value] ?? []);
    keys = keys.filter((k) => wanted.has(k));
  }
  return keys.map((k) => ({ ...prior.entries[k], index: k }));
}

/** The compiled summary: what has the accumulated prior LEARNED? */
export function fortuneSummary(prior) {
  if (!prior?.entries?.length) return { entries: 0, byShape: {}, byGenre: {}, byMedium: {} };
  const shapeCount = {}; for (const s of prior.entries) shapeCount[s.shape] = (shapeCount[s.shape] ?? 0) + 1;
  return { entries: prior.entries.length, byShape: shapeCount, byGenre: Object.fromEntries(Object.entries(prior.byGenre ?? {}).map(([k, v]) => [k, v.length])), byMedium: Object.fromEntries(Object.entries(prior.byMedium ?? {}).map(([k, v]) => [k, v.length])) };
}

/**
 * THE FOOTPRINTS (discovered framing). A framing is the LLM's trajectory
 * through meaning space REC'd as a prior: what it found a <genre> is made of
 * — staging (phases), write voice (the prompt that produces one), felt
 * target — so the NEXT request for the genre starts from the footprints
 * instead of rediscovering from zero.
 */
export function framingFor(prior, { genre = null, medium = null } = {}) {
  if (!prior?.entries) return null;
  let latest = null;
  for (const e of prior.entries) {
    if (!e.framing) continue;
    if (genre && e.genre !== genre) continue;
    if (medium && e.medium !== medium) continue;
    // THE OMNILINGUAL READ GATE (2026-09-20, Chomsky — the universal over the
    // lexical): a STORED framing must pass the same admission test as a LIVE
    // proposal. A staging phase is a genre beat ("the moment of no return"),
    // never the machine's own words about the hunt. The sidecar once REC'd an
    // exposition framing whose staging was "The web is hunted and appended."
    // and "The genre material is hunted and appended, never assumed." —
    // machinery prose echoed from the discovery prompt's old basis footprints.
    // That stored framing was then read back and planned a five-page paper
    // around machinery prose, run after run, because append-only never forgets.
    // The universal rule: the presence of the machine's own sentence is
    // detected by its SOURCE, not its language — a stored framing is admitted
    // only when its staging was genuinely proposed (giver is a model), and a
    // framing whose staging carries the instrument's own operations (a hunt
    // disclosure, an evidence count, an egress note) is refused at read. This
    // is structural: no language list could catch the German, Chinese, or
    // Arabic restatement, but refusing the recorded footprint of a machinery
    // echo works in every language the instrument speaks. A refused framing
    // leaves `latest` at the previous clean one; an empty read is the honest
    // "no discovered framing" the register's own staging stands for.
    if (stagingIsMachinery(e.framing?.staging ?? [])) continue;
    latest = e; // append-only: the last footprint wins, never a merge
  }
  return latest ? { framing: latest.framing, basis: latest.basis, giver: latest.giver, readAt: latest.readAt } : null;
}

/** The omnilingual admission test for a discovered framing's staging. A phase
 *  is the genre's beat, never the machine's own sentence. Two layers:
 *
 *  (1) THE LIVE GATE IS STRUCTURAL AND OMNILINGUAL — in discovery.js, the
 *      machine's basis prose is never offered to the LLM, so a staging cannot
 *      echo it in ANY language. No language list lives there.
 *
 *  (2) THIS READ GATE is the HISTORICAL PURGE: the sidecar once REC'd a
 *      framing whose staging WAS the instrument's own self-account ("The web
 *      is hunted and appended.", "The genre material is hunted and appended,
 *      never assumed.") — recorded before the live gate existed, and read
 *      back on every essay run after. A stored framing is admitted only when
 *      its staging is not the machine's self-account. The markers are the
 *      instrument's OWN fixed self-description phrases (the language the
 *      instrument writes its account in — English today), so a genuine genre
 *      beat ("the moment of no return", a real chase scene) is never refused.
 *      The falsifying control: a staging that names a hunt AS CONTENT (a
 *      story beat about pursuit, under a clean discovery) must pass — the
 *      markers are multi-word self-account phrases, not the word "hunt".
 */
export function stagingIsMachinery(staging) {
  const phases = Array.isArray(staging) ? staging : [];
  if (!phases.length) return false;
  // The instrument's self-account, as recorded: multi-word, distinctive,
  // describing ITS OWN operations — never a genre's beat.
  const SELF_ACCOUNT = /\b(?:is hunted and appended|hunted and appended,? never assumed|the egress is open|coverage fragment|recency.?frequency cells|meaning-options?|genre material is hunted)\b/i;
  return phases.some((p) => SELF_ACCOUNT.test(String(p ?? "")));
}

export function appendFraming(prior, { genre, medium = "text", framing, basis = null, giver = null } = {}) {
  if (!framing || typeof framing !== "object") throw new TypeError("appendFraming: a framing object is required");
  const entry = {
    source: { file: `framing:${genre}:${medium}`, sha: `framing-${genre}-${medium}`.slice(0, 16), chars: JSON.stringify(framing).length },
    readAt: new Date().toISOString(),
    recipe: "discovered framing — the LLM's trajectory through meaning space, REC'd as footprints",
    genre, medium, subgenre: null,
    movements: [{ focus: "framing", from: 0, to: 1, freshClaims: 1, gain: 1 }],
    gains: [1], shape: "framing",
    framing, basis, giver,
  };
  return appendFortune(prior, entry);
}