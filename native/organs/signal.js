// signal.js — try things, find signal, and be refused when there is none.
//
// User direction (2026-09-01): "let's have this enter our DNA and be useable
// for anything, trying things to find signal." Four media went through the
// pipeline by hand — text, music, video, turbulence — and each hand-rolled
// the same five steps. This is that shape as one organ, with the two things
// the hand-rolled versions got wrong now structural rather than remembered.
//
// THE SHAPE (what the four runs actually did):
//   1. an INSTRUMENT turns material into a stream of events
//   2. kinds are DISCOVERED from the stream's own company (taught nothing)
//   3. a CONTROL BUILT TO FAIL destroys the company and must dissolve them
//   4. findings are counted by SOURCE and by INSTRUMENT, never conflated
//   5. what survives is reported; what does not is typed, never silent
//
// TWO HAZARDS, BOTH LEARNED BY BEING BITTEN, BOTH STRUCTURAL HERE:
//
// (a) THE SEARCH INFLATES. This organ's whole purpose — try many
//     instruments — is also the classic way to manufacture a finding: at
//     alpha 0.05, one instrument in twenty passes on noise. So the null is
//     SEARCH-AWARE by construction: the ceiling a share must beat is the
//     distribution of the MAXIMUM share across every instrument tried, not
//     each instrument's own. Trying more instruments therefore RAISES the
//     bar rather than lowering it, which is the only honest way to search.
//     A caller cannot opt out; there is no parameter for it.
//
// (b) TWO SOURCES THROUGH ONE INSTRUMENT ARE ONE READING. Measured live
//     (eval/omnimodal-pipeline.mjs): one pitch tracker's systematic artifact
//     landed identically in two performances and a false kind corroborated
//     at "2 distinct sources". Every finding here reports sources AND
//     instruments apart, and `corroborated` requires both >= 2.
//
// PURE, ORGANS INJECTED (the cast.js posture). It reads no engine of its
// own: `discoverCompanyKinds` arrives as an argument, so this module has no
// opinion about what a "kind" is beyond the contract, and a caller may
// substitute a different discovery organ entirely.
//
// MEDIUM-BLIND BY CONSTRUCTION: material is opaque — only the caller's
// instruments ever look inside it. Nothing here parses, tokenizes, folds
// case, or knows what a word is.

/** Every parameter this organ will not default. P4/P9: numbers are declared. */
export const REQUIRED = Object.freeze(["draws", "seed", "alpha", "minMentions", "minShare", "minMembers"]);

export const REFUSALS = Object.freeze({
  no_instruments: "no instruments were offered — an instrument is what turns material into events, and this organ never invents one",
  no_sources: "no sources were offered",
  undeclared: "every number is the caller's (P4)",
  no_events: "every instrument produced too few events on every source to have company at all",
  control_survived: "the control built to fail did not fail: kinds formed on material whose company was destroyed, so the statistic does not resolve the claim (II.23)",
});

const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };

/** Destroy company, keep marginals: the one perturbation this organ spends. */
export function scramble(events, rnd) {
  return events.map((e) => {
    const w = String(e.text ?? e).split(/\s+/);
    for (let i = w.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [w[i], w[j]] = [w[j], w[i]]; }
    return { text: w.join(" ") };
  });
}

/**
 * findSignal(sources, { instruments, vocabulary, discoverKinds, ...numbers })
 *
 * `sources`     [{ ref, material }]      — material is opaque to this organ
 * `instruments` [{ recipe, discretize }] — discretize(material) -> [{text}]
 * `vocabulary`  the symbols worth asking about (the caller's declaration of
 *               what could possibly be an event kind — never inferred here,
 *               because inferring it from the data is a second search)
 * `discoverKinds` the discovery organ (kind-standing.js::discoverCompanyKinds)
 *
 * Returns { findings, tried, searchCeiling, control, gaps } — never a bare
 * list. A finding carries its sources, its instruments, its share, and the
 * search-aware ceiling it had to beat.
 */
export async function findSignal(sources, {
  instruments, vocabulary, discoverKinds,
  draws, seed, alpha, minMentions, minShare, minMembers,
  clean = null, onProgress = null,
} = {}) {
  if (typeof discoverKinds !== "function") throw new TypeError("findSignal: discoverKinds is injected — required, never defaulted");
  if (!Array.isArray(sources) || !sources.length) return { refused: "no_sources", detail: REFUSALS.no_sources };
  if (!Array.isArray(instruments) || !instruments.length) return { refused: "no_instruments", detail: REFUSALS.no_instruments };
  for (const k of REQUIRED) if (!Number.isFinite({ draws, seed, alpha, minMentions, minShare, minMembers }[k]))
    return { refused: "undeclared", what: k, detail: REFUSALS.undeclared };

  const floors = { minMentions, minShare, minMembers, ...(clean ? { clean } : {}) };
  const gaps = [];

  // 1. every (source, instrument) pair becomes a stream, once.
  const streams = [];
  for (const src of sources) for (const inst of instruments) {
    let events = [];
    try { events = inst.discretize(src.material) ?? []; }
    catch (err) { gaps.push({ type: "instrument_threw", ref: src.ref, recipe: inst.recipe, detail: String(err?.message ?? err) }); continue; }
    if (!events.length) { gaps.push({ type: "no_events", ref: src.ref, recipe: inst.recipe }); continue; }
    streams.push({ ref: src.ref, recipe: inst.recipe, events });
    onProgress?.({ step: "discretized", ref: src.ref, recipe: inst.recipe, events: events.length });
  }
  if (!streams.length) return { refused: "no_events", detail: REFUSALS.no_events, gaps };

  // 2. THE SEARCH-AWARE NULL, computed BEFORE anything is believed.
  // Per draw: scramble every stream, discover the best share each word
  // reaches ANYWHERE in the search, and keep that maximum. The ceiling is
  // the (1-alpha) quantile of those maxima — so a finding must beat not
  // "what chance does here" but "the best chance does anywhere I looked".
  const rnd = lcg(seed);
  const maxima = [];
  for (let d = 0; d < draws; d++) {
    let best = 0;
    for (const st of streams) {
      const kinds = discoverKinds(scramble(st.events, rnd), vocabulary, { ...floors, minShare: 0 });
      for (const k of kinds) for (const share of k.share.values()) if (share > best) best = share;
    }
    maxima.push(best);
    if (d % 25 === 0) onProgress?.({ step: "null", draw: d, of: draws });
  }
  maxima.sort((a, b) => a - b);
  const idx = Math.min(maxima.length - 1, Math.max(0, Math.ceil((1 - alpha) * maxima.length) - 1));
  const searchCeiling = maxima[idx];

  // 3. the observed search, same organ, same floors.
  const observed = new Map(); // `${word}|${signature}` -> {shares, refs, recipes}
  for (const st of streams) {
    for (const kind of discoverKinds(st.events, vocabulary, floors)) {
      for (const [word, share] of kind.share) {
        const key = `${word}|${kind.signature}`;
        if (!observed.has(key)) observed.set(key, { word, signature: kind.signature, shares: [], refs: new Set(), recipes: new Set() });
        const rec = observed.get(key);
        rec.shares.push(share);
        rec.refs.add(st.ref);
        rec.recipes.add(st.recipe);
      }
    }
  }

  // 4. THE CONTROL BUILT TO FAIL, reported whatever it says. It is the same
  // scramble the null spends, run once at the shipped floors: if kinds form
  // on scrambled company, this search decided nothing and says so.
  const controlRnd = lcg(seed ^ 0x5eed);
  let controlSurvivors = 0;
  for (const st of streams) {
    for (const kind of discoverKinds(scramble(st.events, controlRnd), vocabulary, floors))
      for (const share of kind.share.values()) if (share > searchCeiling) controlSurvivors += 1;
  }

  // 5. what beat the search-aware ceiling, with both counts kept apart.
  const findings = [];
  for (const rec of observed.values()) {
    const share = Math.max(...rec.shares);
    if (!(share > searchCeiling)) continue;
    findings.push({
      subject: rec.word,
      kind: `kind:${rec.signature}`,
      share,
      searchCeiling,
      sources: [...rec.refs],
      instruments: [...rec.recipes],
      corroborated: rec.refs.size >= 2 && rec.recipes.size >= 2,
      note: rec.refs.size < 2 ? "one source only" : rec.recipes.size < 2 ? "one instrument only — a systematic error of that instrument is invisible here" : null,
    });
  }
  findings.sort((a, b) => b.share - a.share || a.subject.localeCompare(b.subject));

  const control = { survivors: controlSurvivors, passed: controlSurvivors === 0 };
  if (!control.passed) return { refused: "control_survived", detail: REFUSALS.control_survived, control, searchCeiling, tried: streams.length, gaps };
  return { findings, tried: streams.length, instrumentsTried: instruments.length, sourcesTried: sources.length, searchCeiling, control, gaps };
}

/** A one-line honest reading of a result — counts and limits, never a verdict. */
export function phrase(result) {
  if (result.refused) return `refused: ${result.refused} — ${result.detail}`;
  if (!result.findings.length)
    return `nothing beat the search-aware ceiling (${result.searchCeiling.toFixed(3)}) across ${result.tried} stream(s) from ${result.sourcesTried} source(s) × ${result.instrumentsTried} instrument(s). The control passed, so this is a measured absence, not a failure to look.`;
  const corr = result.findings.filter((f) => f.corroborated).length;
  return `${result.findings.length} finding(s) beat the search-aware ceiling ${result.searchCeiling.toFixed(3)}; ${corr} corroborated by ≥2 sources AND ≥2 instruments, ${result.findings.length - corr} standing on one source or one instrument.`;
}
