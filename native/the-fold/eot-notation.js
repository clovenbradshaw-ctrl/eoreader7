// eot-notation.js — THE DRAFT, WRITTEN IN EOT (2026-09-21).
//
// The user: "is there a version where it's actually written in EOT notation?"
// Until now the EOT draft held each statement as the material's own English
// sentence with its byte span: EOT was the envelope, not the content. The
// "EOT enrichement" session built an English parser trained in-house on the
// UD_English-EWT treebank (native/adapters/text/english-parser.js) and a
// one-call `eotFromText` that turns raw English into one EOTRich@1 record per
// sentence (native/kernel/eot-rich.js): content words as nodes, function words
// absorbed as markers, every feature and relation cube-addressed, word order
// deliberately not recoverable from the meaning layer, exact bytes kept in the
// surface layer.
//
// This module attaches those records to the draft's statements by span and
// renders each statement's meaning as a tree read from its root:
//
//   reach  CON·Figure  Tense=Past@REC·Pattern
//     nsubj @SEG·Figure   steamboat  SIG·Figure  Number=Plur@SIG·Pattern
//     obj   @SEG·Figure   Nashville  SIG·Figure
//     obl   @SEG·Ground   1819       DEF·Figure
//
// The parser is OPTIONAL. Without its model file the draft stands as spans and
// says so; the pipeline never depends on it to produce a piece.
//
// ITS LIMITS, STATED: held-out UPOS 95.2, UAS 81.2, LAS 77.0 (the other
// session's measurement). On the Cumberland ground "reached" was read as a
// passive, "tobacco" as a verb, and "New Orleans" split into an adjective and a
// name. The notation shows the parse the engine has, errors included; nothing
// downstream should treat a single arc as settled.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODEL = path.join(HERE, "..", "priors", "parser-eng-ewt.json");

let cached = null;
/** Load the parser and its record builder once, or return null with a reason. */
export async function loadEotParser() {
  if (cached) return cached;
  if (!fs.existsSync(MODEL)) return (cached = { ok: false, reason: `no parser model at ${path.relative(path.join(HERE, "..", ".."), MODEL)}` });
  try {
    const { loadModel, eotFromText } = await import("../adapters/text/english-parser.js");
    const { toEot, parseConllu } = await import("../kernel/eot-rich.js");
    const json = JSON.parse(fs.readFileSync(MODEL, "utf8"));
    const model = Object.assign(loadModel(json), { provenance: json.provenance });
    cached = { ok: true, parse: (text, source) => eotFromText(model, text, { source, toEot, parseConllu }), provenance: json.provenance ?? null };
  } catch (e) {
    cached = { ok: false, reason: `parser failed to load: ${String(e?.message ?? e).slice(0, 160)}` };
  }
  return cached;
}

/** Attach each draft statement's EOTRich record(s) by span: every record
 *  whose span lies inside the statement's span belongs to it. */
export function attachEot(points, records) {
  let exact = 0, split = 0, none = 0;
  for (const pt of points) {
    const mine = records.filter((r) => r.span?.[0] >= pt.span.start && r.span?.[1] <= pt.span.end);
    pt.eot = mine;
    if (mine.length === 1 && mine[0].span[0] === pt.span.start && mine[0].span[1] === pt.span.end) exact++;
    else if (mine.length) split++;
    else none++;
  }
  return { exact, split, none };
}

/** One record's meaning as a tree read from its root. */
export function notationOf(record) {
  const m = record?.meaning;
  if (!m?.nodes?.length) return "(no meaning layer)";
  const byKey = new Map(m.nodes.map((n) => [n.key, n]));
  const kids = new Map();
  let root = null;
  for (const a of m.arcs ?? []) {
    if (a.from == null) { root = a.to; continue; }
    if (!kids.has(a.from)) kids.set(a.from, []);
    kids.get(a.from).push(a);
  }
  const feats = (n) => (n.feats ?? []).filter((f) => f.cell).map((f) => `${f.name}=${f.value}@${f.cell}`).join(" ");
  const markers = (n) => (n.markers ?? []).map((k) => (m.markers ?? []).find((x) => x.key === k)).filter(Boolean).map((x) => `${x.lemma}@${x.cell}`).join(" ");
  const node = (n) => `${n.lemma}  ${n.uposCell ?? n.upos}${feats(n) ? `  ${feats(n)}` : ""}${markers(n) ? `  [${markers(n)}]` : ""}`;
  const out = [];
  const seen = new Set();
  const walk = (key, depth, via) => {
    const n = byKey.get(key);
    if (!n || seen.has(key)) return;
    seen.add(key);
    out.push(`${"  ".repeat(depth)}${via ? `${via.rel.padEnd(10)} @${via.cell.padEnd(12)} ` : ""}${node(n)}`);
    for (const a of kids.get(key) ?? []) walk(a.to, depth + 1, a);
  };
  if (root) walk(root, 0, null);
  for (const n of m.nodes) if (!seen.has(n.key)) out.push(`(unattached) ${node(n)}`);
  return out.join("\n");
}

/** Is this text ONE complete clause as the parser reads it: one sentence whose
 *  root has a subject (nsubj, csubj or expl)? Errors included — use it
 *  relatively (was complete → must stay complete), never as an absolute gate. */
export function clauseComplete(parser, text) {
  if (!parser?.ok) return null;
  const rs = parser.parse(String(text ?? ""), "clause");
  if (rs.length !== 1) return false;
  const m = rs[0].meaning;
  const root = (m?.arcs ?? []).find((a) => a.from == null);
  if (!root) return false;
  return (m.arcs ?? []).some((a) => a.from === root.to && /^(nsubj|csubj|expl)/.test(a.rel));
}

/** The CORE of one clause as the parser reads it: its root's lemma and its
 *  subject's lemma, "root|subject" — or null when the parse has no single
 *  root with a subject. A cut that changes the core changed what the
 *  sentence says, not how much. */
export function clauseCore(parser, text) {
  if (!parser?.ok) return null;
  const rs = parser.parse(String(text ?? ""), "clause");
  if (rs.length !== 1) return null;
  const m = rs[0].meaning;
  const root = (m?.arcs ?? []).find((a) => a.from == null);
  if (!root) return null;
  const by = new Map(m.nodes.map((n) => [n.key, n]));
  const subj = (m.arcs ?? []).find((a) => a.from === root.to && /^(nsubj|csubj|expl)/.test(a.rel));
  if (!subj) return null;
  // A PARTICIPLE SET OFF FROM ITS SUBJECT BY A COMMA IS AN APPOSITIVE, NOT A
  // PREDICATE ("Cheatham Dam, located below the city." — run 10). Read from
  // the parse's own token lines: a participial root with no auxiliary and a
  // comma between it and its subject has no finite core. (The parser's
  // VerbForm alone cannot decide it: it also reads "Donelson led a flotilla"
  // as a participle.)
  const root_ = by.get(root.to);
  const part = (root_?.feats ?? []).some((f) => f.name === "VerbForm" && f.value === "Part");
  const aux = (root_?.markers ?? []).some((k) => /^aux|^cop/.test((m.markers ?? []).find((x) => x.key === k)?.rel ?? ""));
  if (part && !aux) {
    const rows = (rs[0].surface?.lines ?? []).filter((l) => /^\d+\t/.test(l)).map((l) => l.split("\t"));
    const rootRow = rows.find((c) => c[7] === "root");
    const subjRow = rootRow && rows.find((c) => c[6] === rootRow[0] && /^nsubj/.test(c[7]));
    if (rootRow && subjRow) {
      const [a, b] = [Number(subjRow[0]), Number(rootRow[0])].sort((x, y) => x - y);
      if (rows.some((c) => Number(c[0]) > a && Number(c[0]) < b && c[1] === ",")) return null;
    }
  }
  return `${root_?.lemma}|${by.get(subj.to)?.lemma}`.toLowerCase();
}
