// eval/the-fold/lib/alias-precision-summary.mjs — the tables of alias-precision-RESULTS.md as a PURE function of the raw record and the labels.
// One implementation for the driver (`alias-precision.mjs --summarize`) and for the test that reads the committed result
// (tests/alias-precision-results.test.js): a committed number nothing reads is a report, not an enforcement (eo-constitution III.5).

const pct = (a, b) => (b ? (100 * a / b).toFixed(1) + "%" : "n/a");

/** tallies(raw, labelsFile) → the confusion counts overall and per corpus for the unwalled organ and for licenseAliases. */
export function aliasTallies(raw, labelsFile) {
  const L = labelsFile?.labels ?? {};
  const D = new Map(raw.decisions.map((d) => [d.id, d]));
  const mk = () => ({ n: 0, T: 0, F: 0, U: 0, wTP: 0, wFP: 0, wU: 0 });
  const all = mk(), by = {};
  const refused = {};
  for (const x of raw.sample) {
    const lab = L[x.id], d = D.get(x.id);
    const t = (by[x.cat] ??= mk());
    for (const a of [all, t]) {
      a.n += 1;
      if (lab === "U") { a.U += 1; if (d.licensed) a.wU += 1; continue; }
      if (lab === "T") { a.T += 1; if (d.licensed) a.wTP += 1; } else if (lab === "F") { a.F += 1; if (d.licensed) a.wFP += 1; }
    }
    if (!d.licensed && lab && lab !== "U") {
      const r = (refused[d.why] ??= { T: 0, F: 0 });
      r[lab === "T" ? "T" : "F"] += 1;
    }
  }
  return { all, by, refused };
}

export function summarizeAliasPrecision(raw, labelsFile) {
  const { all, by, refused } = aliasTallies(raw, labelsFile);
  const out = [];
  const c = raw.config;
  out.push(`corpus ${c.root} · ${c.cats.length} categories · fresh files only (seed ${c.fileSeed}, none that the exploration seed ${c.devSeed} read) · first ${c.cap} chars · floors ${JSON.stringify(c.floors)} · stratified draw seed ${c.drawSeed}`);
  out.push("");
  out.push("| corpus | sample | true | false | unwalled precision | walled admits | walled true | walled false | walled precision | recall of true |");
  out.push("|---|---|---|---|---|---|---|---|---|---|");
  const row = (name, a) => out.push(`| ${name} | ${a.n} | ${a.T} | ${a.F} | ${pct(a.T, a.T + a.F)} | ${a.wTP + a.wFP} | ${a.wTP} | ${a.wFP} | ${pct(a.wTP, a.wTP + a.wFP)} | ${pct(a.wTP, a.T)} |`);
  for (const [cat, a] of Object.entries(by)) row(cat, a);
  row("**all**", all);
  out.push("");
  out.push("What the walls refused, by the wall that fired (labelled pairs only):");
  out.push("");
  out.push("| wall | refused a true alias | refused a false one |");
  out.push("|---|---|---|");
  for (const [why, r] of Object.entries(refused)) out.push(`| ${why} | ${r.T} | ${r.F} |`);
  out.push("");
  out.push(`population the sample was drawn from (distinct admitted / licensed, per corpus): ${JSON.stringify(raw.population)}`);
  const refusedTrue = raw.sample.filter((x) => labelsFile?.labels?.[x.id] === "T" && !raw.decisions.find((d) => d.id === x.id).licensed);
  out.push("");
  out.push(`true aliases the walls refused (${refusedTrue.length}):`);
  for (const x of refusedTrue) out.push(`  ${x.id}. "${x.full}" / "${x.alias}" — ${raw.decisions.find((d) => d.id === x.id).why}`);
  const keptFalse = raw.sample.filter((x) => labelsFile?.labels?.[x.id] === "F" && raw.decisions.find((d) => d.id === x.id).licensed);
  out.push("");
  out.push(`false aliases the walls kept (${keptFalse.length}):`);
  for (const x of keptFalse) out.push(`  ${x.id}. [${x.cat.slice(0, 5)}] "${x.full}" / "${x.alias}"`);
  return out.join("\n");
}
