// null-census.mjs — Pass 26 of the null experiments (the-fold NEXT-PASSES):
// A CENSUS OF NULLS THROUGH TIME. The built corpus is streamed one passage
// at a time; at every cursor the same fixed set of draft sentences is read
// against what has been read so far, and every typed null is logged with
// its lifetime: `unread_extent` (the cursor's own gap), `unheard` /
// `unbound` / `beyond-reach` verdicts, the cut and its contest, the void,
// and the derived fact that exists only once its premises and a giver do.
//
// Claim under test — THE-NULL-STATES law 5, nulls compose downward: while
// the unread extent is open, a later-stated sentence's verdict is a fact
// about the READER (unread > 0), and it moves exactly at the cursor its
// passage arrives; the cut's contest lands the cursor the cut meets its
// link; the derived fact appears the cursor its second premise lands.
// Controls (II.23): a shuffled order changes every closing cursor and none
// of the final census; a truncated read leaves the not-yet-stated sentences
// at their reader-fact verdicts with unread > 0, never as findings.
// Zero model calls. Configuration printed beside the numbers.
import { organs, CORPUS, GIVER } from "./product-assay.mjs";
import { streamOf, shuffled } from "./void-rezero-stream.mjs";

/** The drafts read at every cursor, each with the null it is expected to carry until its passage arrives. */
export const DRAFTS = Object.freeze([
  { key: "founded", text: "Amelia Hartley founded the Northgate Observatory in 1887.", statedAt: "founded the Northgate" },
  { key: "opened", text: "The Northgate Observatory opened in 1889.", statedAt: "Observatory opened in 1889" },
  { key: "repaired", text: "Owen Blythe repaired the great refractor.", statedAt: "repaired the great refractor" },
  { key: "bakery", text: "Amelia Hartley founded a bakery.", statedAt: null },            // never stated: a fabrication
  { key: "comets", text: "Marta Quill catalogued nine comets.", statedAt: null },         // a verb the corpus never uses
  { key: "derivedOnly", text: "Rowan Vale preceded Owen Blythe.", statedAt: null },      // true by derivation, stated nowhere
]);

const NULL_VERDICTS = new Set(["unbound", "unheard", "beyond-reach"]);

export function runCensus(O, stream, { truncateAt = null, declarations } = {}) {
  const total = stream.length;
  const passages = stream.map((p) => ({ ref: `${p.name}#0-${Buffer.byteLength(p.text, "utf8")}`, source: p.name, text: p.text }));
  let log = O.hl.createHyperlexicon({ frame: O.frame });
  const rows = [];
  const verdictAt = {}; // key -> [{cursor, verdict}] (transitions only)
  const closing = {};   // key -> cursor at which the draft first read `bound`
  let contestAt = null, cutAt = null, derivedAt = null;
  const read = [];
  for (let k = 0; k < passages.length; k += 1) {
    if (truncateAt != null && k >= truncateAt) break;
    const p = passages[k];
    read.push(p);
    const cursor = k + 1;
    const rel = O.relationsFor(read, { pool: read });
    const claims = rel.read(p.text)?.claims ?? [];
    const edges = claims.filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, polarity: c.polarity ?? "+", spans: c.spans ?? [] }));
    if (edges.length) {
      const r = O.hl.admit(log, edges, { witness: `${p.ref}~${O.recipe}`, classifyConnector: null });
      log = r.log;
      if (cutAt == null && r.heard.some((h) => h.cut)) cutAt = cursor;
      if (contestAt == null && (r.contests ?? []).length) contestAt = cursor;
    }
    // derivation at this cursor, under the declared giver
    const dv = O.D.derive(log, { declarations, floor: { sources: 1, instruments: 0 }, carry: true, maxSteps: 4 });
    const derived = O.D.foldDerived(dv.log);
    if (derivedAt == null && derived.some((d) => /rowan vale/i.test(d.subject) && /owen blythe/i.test(d.object))) derivedAt = cursor;
    const row = { cursor, unread: total - cursor, verdicts: {}, cuts: O.hl.foldCuts(log).length, contests: O.hl.disputesOf(log).size, derived: derived.length };
    for (const d of DRAFTS) {
      const cs = rel.read(d.text)?.claims ?? [];
      const v = cs.some((c) => c.verdict === "bound") ? "bound" : cs.some((c) => c.verdict === "contradicted") ? "contradicted" : (cs.map((c) => c.verdict).find((x) => NULL_VERDICTS.has(x)) ?? (cs.length ? cs[0].verdict : "unheard"));
      row.verdicts[d.key] = v;
      const prev = verdictAt[d.key]?.at(-1)?.verdict ?? null;
      if (prev !== v) (verdictAt[d.key] ??= []).push({ cursor, verdict: v });
      if (v === "bound" && closing[d.key] == null) closing[d.key] = cursor;
    }
    rows.push(row);
  }
  const last = rows.at(-1);
  const census = { unread: last?.unread ?? total, verdicts: last?.verdicts ?? {}, cuts: last?.cuts ?? 0, contests: last?.contests ?? 0, derived: last?.derived ?? 0 };
  return { rows, verdictAt, closing, cutAt, contestAt, derivedAt, census, total, read: read.length };
}

export async function runNullCensus({ seeds = 12 } = {}) {
  const O = await organs();
  let declarations = O.decl.createDeclarationLog();
  const proposed = O.decl.proposeCandidate(declarations, { kind: "transitive", rel: "preceded", acquisition: "declared", source: "null-census (built corpus)" });
  declarations = O.decl.promote(proposed.log, proposed.id, { giver: GIVER }).log;
  const forward = streamOf(CORPUS);
  const lines = []; const say = (s) => lines.push(s);
  say(`configuration: production reader (${Object.keys(O.frame.organs).length} organs declared, recipe ${O.recipe.slice(0, 12)}); stream ${forward.length} passage(s); ${DRAFTS.length} drafts read at every cursor; giver declared for "preceded"; ${seeds} seeded shuffles; 0 model calls`);
  const fwd = runCensus(O, forward, { declarations });
  // where each draft's passage sits in the forward stream
  const statedCursor = Object.fromEntries(DRAFTS.map((d) => [d.key, d.statedAt ? forward.findIndex((p) => p.text.includes(d.statedAt)) + 1 : null]));
  say(`forward: ${DRAFTS.map((d) => `${d.key} → ${fwd.census.verdicts[d.key]}${fwd.closing[d.key] ? ` (bound@${fwd.closing[d.key]}, stated@${statedCursor[d.key]})` : ""}`).join(" · ")}`);
  say(`forward: cut@${fwd.cutAt} contest@${fwd.contestAt} derived@${fwd.derivedAt}; final census unread ${fwd.census.unread}, cuts ${fwd.census.cuts}, contests ${fwd.census.contests}, derived ${fwd.census.derived}`);
  const trunc = runCensus(O, forward, { declarations, truncateAt: 2 });
  say(`truncated at 2: unread ${trunc.census.unread}; ${DRAFTS.map((d) => `${d.key} ${trunc.census.verdicts[d.key]}`).join(" · ")}; contests ${trunc.census.contests}, derived ${trunc.census.derived}`);
  const orders = [];
  for (let s = 1; s <= seeds; s += 1) { const r = runCensus(O, shuffled(forward, s), { declarations }); orders.push({ seed: s, census: r.census, closing: r.closing, contestAt: r.contestAt, derivedAt: r.derivedAt }); }
  const censusKey = (c) => JSON.stringify([c.unread, c.verdicts, c.cuts, c.contests, c.derived]);
  const distinctCensus = new Set([censusKey(fwd.census), ...orders.map((o) => censusKey(o.census))]).size;
  const spread = (f) => new Set([f(fwd), ...orders.map(f)]).size;
  say(`${seeds} shuffles: final census ${distinctCensus === 1 ? "identical" : `DIFFERS (${distinctCensus} distinct)`}; distinct closing cursors — founded ${spread((r) => r.closing.founded ?? "open")}, opened ${spread((r) => r.closing.opened ?? "open")}, repaired ${spread((r) => r.closing.repaired ?? "open")}; contest cursor ${spread((r) => r.contestAt ?? "none")}, derived cursor ${spread((r) => r.derivedAt ?? "none")}`);
  const numbers = {
    forward: { census: fwd.census, closing: fwd.closing, statedCursor, cutAt: fwd.cutAt, contestAt: fwd.contestAt, derivedAt: fwd.derivedAt, transitions: Object.fromEntries(Object.entries(fwd.verdictAt).map(([k, v]) => [k, v.map((x) => `${x.verdict}@${x.cursor}`)])) },
    truncated: { unread: trunc.census.unread, verdicts: trunc.census.verdicts, contests: trunc.census.contests, derived: trunc.census.derived },
    shuffles: { seeds, distinctCensus, closingSpread: { founded: spread((r) => r.closing.founded ?? "open"), opened: spread((r) => r.closing.opened ?? "open"), repaired: spread((r) => r.closing.repaired ?? "open") }, contestSpread: spread((r) => r.contestAt ?? "none"), derivedSpread: spread((r) => r.derivedAt ?? "none") },
  };
  return { lines, numbers };
}
