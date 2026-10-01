// lib/sullivan-names-summary.mjs — the tables of eval/lavar/results/sullivan-names-RESULTS.md, as a pure function of the committed record.
// A committed result nothing reads is a report, not an enforcement (eo-constitution III.5; the-fold POLICIES.md P94): the document's generated
// block is regenerated from results/sullivan-names.json by this function, and tests/sullivan-names-results.test.js fails if the two differ.

const pct = (x) => (x == null ? "·" : `${(100 * x).toFixed(1)}%`);
const f3 = (x) => (x == null ? "·" : x.toFixed(3));
const cfgName = (c) => (c ? `share ${c.minShare} · count ${c.minCount} · k ${c.maxK}` : "·");

/** The one-line score cell: H (agreement / coverage) over issued/gold types. */
export const cell = (s) => (s ? `${f3(s.H)} (${pct(s.A)} / ${pct(s.C)}) ${s.issued}/${s.gold}` : "·");

const top = (rs, kind, n) => rs.filter((r) => r.kind === kind).slice(0, n);
const stripText = (r) => `\`${r.ending}\`→strip \`${r.exponent}\` (${r.class}, n ${r.n}, share ${r.share})`;
const noneText = (r) => `\`${r.ending}\` leaves alone (n ${r.n}, share ${r.share})`;
const ex = (xs, key) => (xs.length ? xs.map((x) => `\`${x.word}\`${key === "miss" ? ` (gold \`${x.gold}\`)` : ` → \`${x.predicted}\` (gold \`${x.gold}\`)`}`).join(", ") : "none");

/**
 * summarizeNames(record) → markdown. The record is the driver's SullivanNames@1 JSON. Every number printed is a field of it; nothing is
 * recomputed from anywhere else.
 */
export function summarizeNames(record) {
  const out = [];
  const L = record.languages;
  out.push(`fitness: ${record.fitness} · ${record.space.configs} operating points (${Object.entries(record.space.dimensions).map(([k, v]) => `${k} ${v.join("/")}`).join(" × ")}) · minStem fixed at ${record.space.minStem} (the consumer's floor, not the prior's) · tallies from TRAIN, the operating point chosen on DEV, the report on TEST · ship bar: TEST precision ≥ ${record.ship.minPrecision} on ≥ ${record.ship.minIssued} issued types and H above both controls built to fail · ${record.at}`);
  out.push("");
  out.push("**The result.** One row per treebank. H is the harmonic mean of agreement (of the types the prior changed, the share changed to the gold stem) and coverage (of the types the gold changes, the share the prior changed to it); issued/gold counts types.");
  out.push("");
  out.push("inflected = name words the treebank marks with a glued function word, a fused case or plural, or a lemma the written form does not begin with; explained = the first two kinds, not-by-a-suffix = the third (a stem that alternates, a normalised lemma), counted and kept out of the labels.");
  out.push("");
  out.push("| language | treebank | train name words | inflected (explained / not by a suffix) | DEV / TEST types | operating point | DEV H (A / C) issued/gold | TEST H (A / C) issued/gold | false strips on TEST | ships |");
  out.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const l of L) {
    const e = l.explains;
    const infl = e.preservingSuffix + e.preservingPrefix + e.number + e.other;
    const exp = e.preservingSuffix + e.preservingPrefix + e.number;
    const t = l.champion?.test;
    out.push(`| ${l.name} (${l.iso}) | ${l.treebank} | ${e.nameWords} | ${infl} (${exp} / ${e.other}) | ${l.types.dev} / ${l.types.test} | ${l.champion ? cfgName(l.champion.cfg) : "(none)"} | ${l.champion ? cell(l.champion.dev) : "·"} | ${l.champion ? cell(t) : "·"} | ${t ? t.falseStrips : "·"} | ${l.ship ? "**yes**" : "no"} |`);
  }
  out.push("");
  out.push("why each language ships or does not:");
  out.push("");
  for (const l of L) out.push(`- ${l.name}: ${l.ship ? l.shipWhy : (l.champion ? l.shipWhy : l.reason)}`);
  out.push("");
  out.push("**The controls, on TEST.** Built to fail: a prior learned from labels shuffled among the same words (at the champion's own operating point) must score about zero; \"strip a final s\" has no language in it and must be refused by the false strips it makes; the typed English route this replaces (identity-routes.js, S137: the engine's apostrophe strip on the last token) is run on every language as the incumbent.");
  out.push("");
  out.push("| language | learned | strip a final s | typed English route | shuffled labels |");
  out.push("|---|---|---|---|---|");
  for (const l of L) out.push(`| ${l.name} | ${l.champion ? `**${cell(l.champion.test)}**` : "·"} | ${cell(l.controls.finalS)} | ${cell(l.controls.apostrophe)} | ${cell(l.controls.shuffled)} |`);
  out.push("");
  const inc = L.filter((l) => l.incumbent);
  if (inc.length) {
    out.push("");
    out.push("**The incumbent, paired.** The typed English route is what a learned prior would REPLACE, so it is compared on the same types rather than by two scores a single type can flip: of the types where the two routes differ, how many each gets right (right = the gold stem), and the exact two-sided probability of a split at least that uneven if neither were better.");
    out.push("");
    out.push("| language | both right | neither | learned right, typed wrong | typed right, learned wrong | exact p |");
    out.push("|---|---|---|---|---|---|");
    for (const l of inc) { const q = l.incumbent.test; out.push(`| ${l.name} (TEST) | ${q.both} | ${q.neither} | ${q.aOnly} | ${q.bOnly} | ${q.p.toFixed(3)} |`); }
    for (const g of record.genre ?? []) if (g.incumbent) out.push(`| ${g.name.split(" (")[0]} (independent text) | ${g.incumbent.both} | ${g.incumbent.neither} | ${g.incumbent.aOnly} | ${g.incumbent.bOnly} | ${g.incumbent.p.toFixed(3)} |`);
  }
  out.push("");
  out.push("**The swarm against its control.** Wilson's colony (seeds at the corners and the centre, a random unseen point per generation, the best three bred and mutated, every observed improvement recorded in the gate's population before the candidate is judged) and a second colony that records only gains, each against the exhaustive sweep of every point. Each arm reports two numbers: the best point it MEASURED (its census plateau's least-claim member, the selector every arm shares) and the best point its gate KEPT. They differ where the gate refused a point the colony had just measured.");
  out.push("");
  out.push("DEV is what each arm optimised.");
  out.push("");
  out.push("| language | sweep DEV H | colony: best measured | colony: kept by the gate | colony: points measured / admitted | gains-only: best measured | gains-only: kept by the gate | gains-only: points measured / admitted |");
  out.push("|---|---|---|---|---|---|---|---|");
  for (const l of L) {
    const a = l.arms;
    out.push(`| ${l.name} | ${f3(a.sweep.devH)} | ${f3(a.swarm.devH)} | ${f3(a.swarm.gateH)} | ${a.swarm.evaluations} / ${a.swarm.admitted} | ${f3(a.gainsOnly.devH)} | ${f3(a.gainsOnly.gateH)} | ${a.gainsOnly.evaluations} / ${a.gainsOnly.admitted} |`);
  }
  out.push("");
  out.push("TEST is what no arm was tuned on. Each arm's point is its census plateau's least-claim member; the sweep's plateau shows how many points tie its DEV champion and the range of their TEST scores.");
  out.push("");
  out.push("| language | sweep TEST H | colony TEST H | gains-only TEST H | sweep plateau (points tied / TEST H range) |");
  out.push("|---|---|---|---|---|");
  for (const l of L) {
    const a = l.arms, sel = l.selection;
    out.push(`| ${l.name} | ${f3(a.sweep.testH)} | ${f3(a.swarm.testH)} | ${f3(a.gainsOnly.testH)} | ${sel ? `${sel.plateau} / ${f3(sel.testH[0])}–${f3(sel.testH[1])}` : "·"} |`);
  }
  const eq = (x, y) => x >= y - 1e-12;
  const count = (f) => L.filter(f).length;
  const measured = count((l) => eq(l.arms.swarm.devH, l.arms.sweep.devH)), kept = count((l) => eq(l.arms.swarm.gateH, l.arms.sweep.devH));
  const measuredG = count((l) => eq(l.arms.gainsOnly.devH, l.arms.sweep.devH)), keptG = count((l) => eq(l.arms.gainsOnly.gateH, l.arms.sweep.devH));
  const none = L.filter((l) => l.arms.swarm.admitted === 0);
  const noGain = none.filter((l) => l.arms.swarm.stall.gains === 0), refusedAll = none.filter((l) => l.arms.swarm.stall.gains > 0);
  const refused = count((l) => l.arms.swarm.gateH < l.arms.swarm.devH - 1e-12), refusedG = count((l) => l.arms.gainsOnly.gateH < l.arms.gainsOnly.devH - 1e-12);
  out.push("");
  out.push(`Against the sweep's DEV champion: the colony MEASURED it in ${measured} of ${L.length} languages and its gate KEPT it in ${kept}; the gains-only colony measured it in ${measuredG} and kept it in ${keptG}. The colony's gate admitted nothing in ${none.length} of ${L.length} languages: in ${noGain.length} (${noGain.map((l) => l.name).join(", ") || "none"}) it was shown no gain at all — a seed already sat on the sweep's top plateau — and in ${refusedAll.length} (${refusedAll.map((l) => l.name).join(", ") || "none"}) it was shown gains and refused every one. In ${refused} the point it kept scored below the best point the colony itself had measured (${refusedG} for the gains-only colony).`);
  out.push("");
  out.push("The stall in the colony's own genealogy. A gain is a birth that improved on the champion at the moment it was measured; a loss is one that did not. The gate squares every improvement on its record, losses included, and a candidate must clear the 95th percentile of those squares.");
  out.push("");
  out.push("| language | colony: gains seen / admitted | colony: largest gain seen | colony: largest loss on its record | gains-only: gains seen / admitted | gains-only: largest loss measured, not recorded |");
  out.push("|---|---|---|---|---|---|");
  for (const l of L) {
    const a = l.arms.swarm.stall, g = l.arms.gainsOnly.stall;
    out.push(`| ${l.name} | ${a.gains} / ${a.gainsAdmitted} | ${f3(a.largestGain)} | ${f3(a.largestLoss)} | ${g.gains} / ${g.gainsAdmitted} | ${f3(g.largestLoss)} |`);
  }
  out.push("");
  out.push("**What each prior learned** — the compiled rules a caller would load (a rule is kept only where it changes the answer of the longest shorter ending that speaks; `strip` removes the exponent from that edge of the name, `leaves alone` is a rule that overrides a shorter strip):");
  out.push("");
  for (const l of L) {
    const sx = l.rules.suffix, px = l.rules.prefix;
    out.push(`**${l.name}** — ${sx.length} suffix rules, ${px.length} prefix rules${l.ship ? "" : " (evaluated only: no prior shipped)"}`);
    if (sx.length) out.push(`- suffix: ${top(sx, "strip", 6).map(stripText).join(" · ") || "(no strip rule)"}${top(sx, "none", 3).length ? ` · ${top(sx, "none", 3).map(noneText).join(" · ")}` : ""}${sx.filter((r) => r.kind === "strip").length > 6 ? ` · … ${sx.filter((r) => r.kind === "strip").length - 6} more` : ""}`);
    if (px.length) out.push(`- prefix: ${top(px, "strip", 6).map(stripText).join(" · ") || "(no strip rule)"}${top(px, "none", 3).length ? ` · ${top(px, "none", 3).map(noneText).join(" · ")}` : ""}`);
    if (!sx.length && !px.length) out.push("- none: no ending or beginning spoke at the operating point");
    if (l.errors && l.champion) {
      out.push(`- TEST false strips: ${ex(l.errors.falseStrips, "false")} · wrong exponent: ${ex(l.errors.wrongStrips, "false")} · missed: ${ex(l.errors.misses, "miss")}`);
    }
  }
  if (record.transfer?.length) {
    out.push("");
    out.push("**Transfer.** A language's stored rules (at its own operating point) applied to another language's TEST types; H (A / C) issued/gold. Sullivan: a mark's meaning is earned per language, not assumed to carry over.");
    out.push("");
    const langs = L.map((l) => l.name);
    out.push(`| prior ↓ / test → | ${langs.join(" | ")} |`);
    out.push(`|---|${langs.map(() => "---").join("|")}|`);
    for (const row of record.transfer) out.push(`| ${row.from} | ${langs.map((to) => (to === row.from ? `**${cell(row.on[to])}**` : cell(row.on[to]))).join(" | ")} |`);
  }
  if (record.genre?.length) {
    out.push("");
    out.push("**Genre.** The English prior (learned on web text) on a second English treebank:");
    out.push("");
    for (const g of record.genre) out.push(`- ${g.name} (${g.types} types): learned ${cell(g.score)} · typed route ${cell(g.typed)}`);
  }
  out.push("");
  out.push("**Provenance of what taught each prior** (stored in the prior itself; a prior without these is refused at load). [verify] marks what only the builder declares, [measured] what was read off the files:");
  out.push("");
  const mark = (x) => (x.basis === "declared by the builder — verify" ? " [verify]" : x.basis === "measured from the file" ? " [measured]" : "");
  for (const l of L) {
    const p = l.provenance;
    out.push(`- **${l.name}** — giver: ${p.giver.value}${mark(p.giver)} · period: ${p.period.value}${mark(p.period)} · region: ${p.region.value}${mark(p.region)} · register: ${p.register.value}${mark(p.register)} · script: ${p.script.value}${mark(p.script)} · licence: ${p.license.value} · ${p.lemmas.value}`);
  }
  return out.join("\n");
}
