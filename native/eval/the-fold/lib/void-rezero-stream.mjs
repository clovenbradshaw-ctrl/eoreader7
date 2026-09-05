// void-rezero-stream.mjs — Pass 24 of the null experiments (the-fold
// NEXT-PASSES): RE-ZERO UNDER A STREAM. Voids are declared BEFORE reading
// (questions before material), the corpus is streamed through the door one
// passage at a time, and the cursor at which each void fills is recorded.
//
// Claims read by tests/void-rezero-stream.test.js:
//   1. a void fills at the first passage stating its arrangement, and never
//      on a denial — the cut is not an arrival of the thing;
//   2. the fill cursor depends on order; the FINAL open set does not (prefix
//      invariance, read at the void);
//   3. a void over ends the corpus never states stays open with the search
//      REACHED — a finding, distinct by type from a void left open by a
//      truncated read (`reached: false`, a fact about the reader);
//   4. control built to fail (II.23): the object-deranged corpus fills a
//      different set; truncating the stream turns a finding into a reader
//      fact, never the other way.
// Zero model calls. Configuration printed with the numbers (P41/P90).
import { organs, CORPUS, CORPUS_SHUFFLED } from "./product-assay.mjs";

/** One passage per arrival, in the order given — the stream is the corpus's own sentences. */
export function streamOf(corpus) {
  const out = [];
  for (const [name, text] of Object.entries(corpus)) {
    const parts = String(text).split(/(?<=\.)\s+/).filter(Boolean);
    parts.forEach((t, i) => out.push({ name: `${name.replace(/\.txt$/, "")}#s${i + 1}`, text: t }));
  }
  return out;
}

/** The voids declared before any reading: act-shaped, some exact, one never stated. */
export const VOIDS_BEFORE_READING = Object.freeze([
  { key: "opened-any", end1: "the Northgate Observatory", label: "opened" },
  { key: "repaired-any", end1: "Owen Blythe", label: "repaired" },
  { key: "opened-1889", end1: "the Northgate Observatory", label: "opened", end2: "in 1889" },
  { key: "closed-never", end1: "the Northgate Observatory", label: "closed" },
]);

const lcg = (seed) => { let s = (seed >>> 0) || 1; return () => (s = (Math.imul(1664525, s) + 1013904223) >>> 0) / 4294967296; };
export function shuffled(items, seed) {
  const r = lcg(seed); const a = items.slice();
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * runStream(O, stream, { truncateAt }) — declare every void with scope
 * {sources: all names, read: 0, total: n}, then feed the stream one passage
 * at a time through the door; record per void the cursor it filled at and
 * by what; at the end redeclare every still-open void with read = cursor so
 * `reached` says whether the search got to the end.
 */
export function runStream(O, stream, { truncateAt = null } = {}) {
  const names = stream.map((p) => p.name);
  const total = stream.length;
  let log = O.hl.createHyperlexicon({ frame: O.frame });
  const ids = {};
  for (const v of VOIDS_BEFORE_READING) {
    const r = O.hl.declareVoid(log, { end1: v.end1, label: v.label, end2: v.end2 ?? null, scope: { sources: names, read: 0, total }, because: "declared before reading" });
    if (r.refused) throw new Error(`declareVoid refused ${v.key}: ${r.refused.type}`);
    log = r.log; ids[v.key] = r.id;
  }
  const passages = stream.map((p) => ({ ref: `${p.name}#0-${Buffer.byteLength(p.text, "utf8")}`, source: p.name, text: p.text }));
  const rel = O.relationsFor(passages, { pool: passages });
  const fills = {};
  const cuts = [];
  let cursor = 0;
  for (const p of passages) {
    if (truncateAt != null && cursor >= truncateAt) break;
    cursor += 1;
    const claims = rel.read(p.text)?.claims ?? [];
    const edges = claims.filter((c) => c.verdict === "bound").map((c) => ({ subject: c.end1, verb: c.label, object: c.end2, polarity: c.polarity ?? "+", spans: c.spans ?? [] }));
    if (!edges.length) continue;
    const r = O.hl.admit(log, edges, { witness: `${p.ref}~${O.recipe}`, classifyConnector: null });
    log = r.log;
    for (const h of r.heard) if (h.cut) cuts.push({ cursor, id: h.id });
    for (const z of r.rezeroed ?? []) { const key = Object.keys(ids).find((k) => ids[k] === z.void); if (key && fills[key] == null) fills[key] = { cursor, by: z.by, passage: p.source }; }
  }
  // Law 3: say whether the search reached the end, on every still-open void.
  const open = {};
  for (const [key, id] of Object.entries(ids)) {
    if (fills[key]) continue;
    const r = O.hl.declareVoid(log, { end1: VOIDS_BEFORE_READING.find((v) => v.key === key).end1, label: VOIDS_BEFORE_READING.find((v) => v.key === key).label, end2: VOIDS_BEFORE_READING.find((v) => v.key === key).end2 ?? null, scope: { sources: names, read: cursor, total }, because: cursor >= total ? "the whole stream was read and nothing stated it" : "the stream was cut short" });
    if (!r.refused) log = r.log;
    open[key] = { reached: cursor >= total, read: cursor, total };
  }
  const timelines = Object.fromEntries(Object.entries(ids).map(([k, id]) => [k, O.hl.voidTimeline(log, id).events.map((e) => e.act)]));
  return { ids, fills, open, cuts, timelines, cursor, total, log };
}

export async function runVoidRezeroStream({ seeds = 20 } = {}) {
  const O = await organs();
  const forward = streamOf(CORPUS);
  const lines = [];
  const say = (s) => lines.push(s);
  say(`configuration: reader ${Object.keys(O.frame.organs).length} organ(s) declared, recipe ${O.recipe.slice(0, 12)}; stream ${forward.length} passage(s); ${VOIDS_BEFORE_READING.length} void(s) declared before reading; ${seeds} seeded shuffles; 0 model calls`);
  const fwd = runStream(O, forward);
  say(`forward: ${VOIDS_BEFORE_READING.map((v) => `${v.key} ${fwd.fills[v.key] ? `filled@${fwd.fills[v.key].cursor} by ${fwd.fills[v.key].by}` : `open (reached ${fwd.open[v.key].reached})`}`).join(" · ")}; cuts heard at ${fwd.cuts.map((c) => c.cursor).join(",") || "none"}`);
  // Denial first: the passage carrying the cut moved to the front.
  const denialIdx = forward.findIndex((p) => /never opened/.test(p.text));
  const denialFirst = [forward[denialIdx], ...forward.filter((_, i) => i !== denialIdx)];
  const df = runStream(O, denialFirst);
  say(`denial-first: opened-1889 ${df.fills["opened-1889"] ? `filled@${df.fills["opened-1889"].cursor}` : "open"}; the cut was heard at cursor ${df.cuts[0]?.cursor ?? "?"} and did not fill it`);
  const orders = [];
  for (let s = 1; s <= seeds; s += 1) { const run = runStream(O, shuffled(forward, s)); orders.push({ seed: s, fills: Object.fromEntries(Object.entries(run.fills).map(([k, f]) => [k, f.cursor])), open: Object.keys(run.open).sort() }); }
  const openSets = new Set(orders.map((o) => o.open.join(",")));
  const cursorSpread = Object.fromEntries(VOIDS_BEFORE_READING.map((v) => [v.key, new Set(orders.map((o) => o.fills[v.key] ?? "open")).size]));
  say(`${seeds} shuffles: final open set ${openSets.size === 1 ? `identical (${[...openSets][0]})` : `DIFFERS (${[...openSets].join(" | ")})`}; distinct fill cursors per void ${JSON.stringify(cursorSpread)}`);
  const trunc = runStream(O, forward, { truncateAt: 2 });
  say(`truncated at 2: ${Object.entries(trunc.open).map(([k, o]) => `${k} open (reached ${o.reached}, ${o.read} of ${o.total})`).join(" · ")}`);
  const der = runStream(O, streamOf(CORPUS_SHUFFLED));
  const realSet = Object.keys(fwd.fills).sort().join(","), derSet = Object.keys(der.fills).sort().join(",");
  say(`deranged corpus: filled {${derSet}} vs real {${realSet}} — ${realSet === derSet ? "SAME (the control failed to fail)" : "different"}`);
  const numbers = {
    forward: { fills: Object.fromEntries(Object.entries(fwd.fills).map(([k, f]) => [k, f.cursor])), open: fwd.open, cuts: fwd.cuts.map((c) => c.cursor), timelines: fwd.timelines },
    denialFirst: { opened1889: df.fills["opened-1889"]?.cursor ?? null, cutAt: df.cuts[0]?.cursor ?? null },
    shuffles: { seeds, openSetsDistinct: openSets.size, openSet: [...openSets][0], cursorSpread },
    truncated: Object.fromEntries(Object.entries(trunc.open).map(([k, o]) => [k, o.reached])),
    deranged: { real: realSet, deranged: derSet, differs: realSet !== derSet },
  };
  return { lines, numbers };
}
