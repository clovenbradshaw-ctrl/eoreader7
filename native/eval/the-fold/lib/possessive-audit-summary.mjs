// eval/the-fold/lib/possessive-audit-summary.mjs — the tables of possessive-audit-RESULTS.md as a PURE function of the raw record and the
// labels. One implementation for the driver (`possessive-audit.mjs --summarize`) and for the test that reads the committed result
// (tests/possessive-audit-results.test.js): a committed number nothing reads is a report, not an enforcement (eo-constitution III.5).
const JOIN_VARIANTS = ["R", "T-only", "E-only"];

export function summarizeAudit(raw, labelsFile) {
  const labels = labelsFile?.labels ?? {};
  const out = [];
  const c = raw.config;
  out.push(`corpus ${c.root} · categories ${c.cats.join(", ")} · ${c.n} files each (seed ${c.seed}) · first ${c.cap} chars · language ${c.language}`);
  out.push("");
  out.push("| corpus | docs | referents | surfaces | end in the mark | F3 asked | F3 gained (R) | F3 answered before | …of which ≠ the bare name's | F2 recovered (R) | exact answers R changed | spelling guesses R pre-empted | R joins | T joins | E joins |");
  out.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  const tot = { docs: 0, refs: 0, surf: 0, mark: 0, f3q: 0, f3gain: 0, f3had: 0, f3hadDiff: 0, f2rec: 0, f2q: 0, changedExact: 0, preempted: 0, rj: 0, tj: 0, ej: 0 };
  for (const [cat, a] of Object.entries(raw.perCorpus)) {
    out.push(`| ${cat} | ${a.docs} | ${a.referents} | ${a.surfaces} | ${a.markTerminal} | ${a.F3.q} | ${a.F3.gainR} | ${a.F3.hadAnswer} | ${a.F3.hadAnswerDiffers} | ${a.F2.recoveredR}/${a.F2.q} | ${a.changedExactByR} | ${a.preemptedGuessByR} | ${a.joins.R} | ${a.joins.T} | ${a.joins.E} |`);
    tot.docs += a.docs; tot.refs += a.referents; tot.surf += a.surfaces; tot.mark += a.markTerminal;
    tot.f3q += a.F3.q; tot.f3gain += a.F3.gainR; tot.f3had += a.F3.hadAnswer; tot.f3hadDiff += a.F3.hadAnswerDiffers;
    tot.f2rec += a.F2.recoveredR; tot.f2q += a.F2.q; tot.changedExact += a.changedExactByR; tot.preempted += a.preemptedGuessByR; tot.rj += a.joins.R; tot.tj += a.joins.T; tot.ej += a.joins.E;
  }
  out.push(`| **all** | ${tot.docs} | ${tot.refs} | ${tot.surf} | ${tot.mark} | ${tot.f3q} | ${tot.f3gain} | ${tot.f3had} | ${tot.f3hadDiff} | ${tot.f2rec}/${tot.f2q} | ${tot.changedExact} | ${tot.preempted} | ${tot.rj} | ${tot.tj} | ${tot.ej} |`);
  out.push("");
  out.push("(joins are query-level counts: a query that made the variant reach a referent the baseline did not. R's are answers where the index had none.)");
  out.push("");
  // A join is a PAIR; the same pair reached by more than one query family or query is one join, judged once.
  const judged = (variant) => { const seen = new Map(); for (const x of raw.extras) if (x.variant === variant && !seen.has(x.id)) seen.set(x.id, x); return [...seen.values()]; };
  const rate = (xs) => {
    const k = { y: 0, n: 0, u: 0, unlabelled: 0 };
    for (const x of xs) { const l = labels[x.id]; if (l === "y" || l === "n" || l === "u") k[l] += 1; else k.unlabelled += 1; }
    const d = k.y + k.n;
    return { ...k, total: xs.length, falseRate: d ? k.n / d : null };
  };
  const what = { R: "reached by the shipped route (R)", "T-only": "reached by the always-on fold and NOT by the route (T-only)", "E-only": "reached by the every-token control and NOT by the always-on fold (E-only)" };
  for (const v of JOIN_VARIANTS) {
    const all = judged(v);
    out.push(`${v}: ${all.length} distinct pairs ${what[v]} — ${all.filter((x) => x.relation === "same-name").length} same-name (a fragment wearing the mark joined to its bare fragment), ${all.filter((x) => x.relation === "partial").length} partial (the engine's own sub-form rule reaching the marked form)`);
  }
  for (const v of JOIN_VARIANTS) for (const rel of ["same-name", "partial"]) {
    const r = rate(judged(v).filter((x) => x.relation === rel));
    if (!r.total) continue;
    out.push(`  ${v} / ${rel}: ${r.total} · same-being ${r.y} · different ${r.n} · cannot tell ${r.u} · unlabelled ${r.unlabelled}` + (r.falseRate === null ? "" : ` · false-join rate ${(100 * r.falseRate).toFixed(1)}% of ${r.y + r.n} decided`));
  }
  for (const v of JOIN_VARIANTS) {
    const r = rate(judged(v));
    out.push(`${v} all: ${r.total} · same-being ${r.y} · different ${r.n} · cannot tell ${r.u} · unlabelled ${r.unlabelled}` + (r.falseRate === null ? "" : ` · false-join rate ${(100 * r.falseRate).toFixed(1)}% of ${r.y + r.n} decided`));
  }
  if (raw.changed?.length) {
    out.push("");
    const exact = raw.changed.filter((x) => x.kind === "exact-answer-changed");
    out.push(`answers R changed although the index had answered: ${raw.changed.length} — ${exact.length} where the index had answered by an exact match (the fold promises none), ${raw.changed.length - exact.length} where it had answered only by the one-edit spelling guess`);
    for (const x of exact.slice(0, 40)) out.push(`  EXACT [${x.cat.slice(0, 5)}] "${x.q}"  before ${JSON.stringify(x.before)}  after ${JSON.stringify(x.after)}`);
    const guesses = raw.changed.filter((x) => x.kind !== "exact-answer-changed");
    out.push(`first ${Math.min(12, guesses.length)} of the pre-empted spelling guesses:`);
    for (const x of guesses.slice(0, 12)) out.push(`  guess [${x.cat.slice(0, 5)}] "${x.q}"  was ${JSON.stringify(x.before)}  now ${JSON.stringify(x.after).slice(0, 160)}`);
  }
  return out.join("\n");
}

/** The figures the route stands on, as data, for a test to assert and a document to quote. */
export function auditFigures(raw, labelsFile) {
  const labels = labelsFile?.labels ?? {};
  const tot = { docs: 0, referents: 0, surfaces: 0, f3Asked: 0, f3Gained: 0, f3Lost: 0, f3Answered: 0, f2Recovered: 0, f2Asked: 0, exactChanged: 0, guessPreempted: 0 };
  for (const a of Object.values(raw.perCorpus)) {
    tot.docs += a.docs; tot.referents += a.referents; tot.surfaces += a.surfaces; tot.f3Asked += a.F3.q; tot.f3Gained += a.F3.gainR; tot.f3Lost += a.F3.lossR;
    tot.f3Answered += a.F3.hadAnswer; tot.f2Recovered += a.F2.recoveredR; tot.f2Asked += a.F2.q; tot.exactChanged += a.changedExactByR; tot.guessPreempted += a.preemptedGuessByR;
  }
  const byVariant = {};
  for (const v of JOIN_VARIANTS) {
    const seen = new Map();
    for (const x of raw.extras) if (x.variant === v && !seen.has(x.id)) seen.set(x.id, x);
    const k = { pairs: seen.size, y: 0, n: 0, u: 0, unlabelled: 0 };
    for (const x of seen.values()) { const l = labels[x.id]; if (l === "y" || l === "n" || l === "u") k[l] += 1; else k.unlabelled += 1; }
    k.falseRate = k.y + k.n ? k.n / (k.y + k.n) : null;
    byVariant[v] = k;
  }
  return { ...tot, byVariant };
}
