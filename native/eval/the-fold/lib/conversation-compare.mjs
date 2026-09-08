// lib/conversation-compare.mjs — the numbers a conversation run is judged by,
// computed ONCE here from its rows so a test can read the computation (S64,
// S65: a committed result is enforcement only when a test reads its lib) and
// a results doc can transcribe it. Every figure is read off the rows the
// driver wrote (eval/the-fold/conversation.mjs); nothing is a model's
// opinion. `compareRuns` puts two or more summaries side by side.
//
// What is counted, by name:
//   tokPerCall     prompt tokens / model calls (the compression axis)
//   callsPerTurn   model calls / turns
//   sPerTurn       wall seconds / turns (contended — a ratio, not a claim)
//   reasked        address re-asks (turnAddressed[].reasked)
//   allNamed       address checks whose asked-about referents were all named
//   absences       typed absences the record stated (resolvedOn === "absence")
//   voids          voids the turn declared on the ledger (voidsDeclared)
//   positions      turns where the record took a position on a restatement
//   authorship     mean authorship over turns where one was measurable (an
//                  expectation existed); null when none — never 0
//   unsupported    sentences the walls marked unsupported, summed
//   learned/owned  corrections learned / owned on the record
//   retrieval      rows by retrieval basis (activation / surface / none)
//   handed         rows by what the mouth was handed
//   moves          per move: n, addressed (the driver's own measure), resolved
//   recordBacked   claims bound to the material per turn (the row's
//                  boundClaims), and the mouth's additions — claims the
//                  expectation did not hold (expectation.novel) plus sentences
//                  the walls marked unsupported — which is what a model swap
//                  compares (S68), never prose.
export function summarizeRows(rows = []) {
  const rs = rows.filter(Boolean);
  const n = rs.length;
  if (!n) return { turns: 0 };
  const sum = (f) => rs.reduce((a, r) => a + (Number(f(r)) || 0), 0);
  const calls = sum((r) => r.calls);
  const ta = rs.flatMap((r) => r.turnAddressed ?? []);
  const ex = rs.map((r) => r.expectation).filter(Boolean);
  const auth = ex.map((e) => e.authorship).filter((a) => a != null);
  const moves = {};
  for (const r of rs) { const m = r.move ?? "?"; moves[m] ??= { n: 0, addressed: 0, resolved: 0 }; moves[m].n += 1; if (r.addressed === true) moves[m].addressed += 1; if (r.resolved) moves[m].resolved += 1; }
  const count = (f) => { const out = {}; for (const r of rs) for (const k of f(r)) out[k] = (out[k] ?? 0) + 1; return out; };
  // The driver's row carries counts, never the sections themselves (conversation.mjs: `sections` is a length, `boundClaims` the bound claims it put on the transcript); read the row's own fields, never a shape remembered from the turn's return (P96).
  const boundClaims = rs.map((r) => Number(r.boundClaims) || 0);
  return {
    turns: n,
    tokPerCall: calls ? Math.round(sum((r) => r.promptTokens) / calls) : null,
    callsPerTurn: Number((calls / n).toFixed(2)),
    sPerTurn: Number((sum((r) => r.ms) / 1000 / n).toFixed(1)),
    reasked: ta.filter((a) => a?.reasked).length,
    allNamed: ta.filter((a) => a?.all === true).length,
    addressChecks: ta.length,
    absences: ta.filter((a) => a?.resolvedOn === "absence").length,
    voids: sum((r) => (r.voidsDeclared ?? r.voids ?? []).length),
    positions: rs.filter((r) => r.position).length,
    authorship: auth.length ? Number((auth.reduce((a, b) => a + b, 0) / auth.length).toFixed(2)) : null,
    authorshipTurns: auth.length,
    unsupported: sum((r) => r.unsupported),
    learned: sum((r) => r.learnedAdded),
    owned: sum((r) => r.owned),
    retrieval: count((r) => (r.retrieval ?? []).map((x) => x.basis ?? "?")),
    handed: count((r) => (r.resolutions ?? []).map((x) => x.handed ?? "passages")),
    moves,
    recordBacked: { perTurn: Number((boundClaims.reduce((a, b) => a + b, 0) / n).toFixed(2)), additions: sum((r) => (r.expectation?.novel ?? 0)) + sum((r) => r.unsupported) },
  };
}

/** compareRuns([{label, rows}, …]) → rows of a table, one per figure, in label order. */
export function compareRuns(runs = []) {
  const sums = runs.map((r) => ({ label: r.label, s: summarizeRows(r.rows) }));
  const keys = ["turns", "tokPerCall", "callsPerTurn", "sPerTurn", "reasked", "allNamed", "addressChecks", "absences", "voids", "positions", "authorship", "authorshipTurns", "unsupported", "learned", "owned"];
  const table = keys.map((k) => ({ figure: k, ...Object.fromEntries(sums.map(({ label, s }) => [label, s[k] ?? null])) }));
  return { labels: sums.map((x) => x.label), table, summaries: Object.fromEntries(sums.map(({ label, s }) => [label, s])) };
}

/** A markdown table of compareRuns' output. */
export function renderComparison(cmp) {
  const head = `| figure | ${cmp.labels.join(" | ")} |\n|---|${cmp.labels.map(() => "---").join("|")}|`;
  const body = cmp.table.map((row) => `| ${row.figure} | ${cmp.labels.map((l) => (row[l] == null ? "—" : String(row[l]))).join(" | ")} |`).join("\n");
  return `${head}\n${body}`;
}
