// holograph.mjs — the "full response" loader for the TUI's facing-page view.
//
// A full response is three connected layers, and this module knows how to
// pull all three out of one EOHolographOutput@1 artifact (the shape
// native/eval/lavar/holograph.mjs writes):
//
//   1. THE SOURCES   — what inspired it: inspiredBy.material facts and the
//                      direction, each resolved to its PERMANENT ADDRESS
//                      (source filename + byte offset, e.g. pg2600.txt#1627174)
//                      and its VERBATIM SNIP (the actual bytes at that
//                      address, read from the real source file when it can be
//                      found).
//   2. THE RESPONSE  — the prose, each sentence carrying its ground pointer
//                      (material -> which source fact / self:model -> the
//                      mouth's own), so the connection is explicit.
//   3. THE NOTES     — the reasoning and logic applied (the question, the
//                      verdict line, the tier breakdown, and — when a
//                      companion reading log sits next to the artifact — a
//                      digest of the reading that produced it).
//
// The `notes` layer is deliberately NOT fully rendered by default: a reading
// log can be a quarter-million entries. This module distills it; the TUI
// renders the digest and makes the fuller record reachable, never dumps it.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const HOLOGRAPH_SCHEMA = "EOHolographOutput@1";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");

/** Directories searched for a ref's source file (filename#bytes). The ref
 *  only names the file; where it actually lives is an environment concern.
 *  Default: this repo, its parent (the workspace), and the cwd. Overridable
 *  with ER7_SOURCES_DIRS (colon-separated) so tests and other layouts can
 *  point at their own material. */
export function sourceDirs(extra) {
  const env = (process.env.ER7_SOURCES_DIRS || "")
    .split(":")
    .map((d) => d.trim())
    .filter(Boolean);
  return [...env, ...(extra ?? []), REPO_ROOT, path.resolve(REPO_ROOT, ".."), process.cwd()];
}

/** "pg2600.txt#1627174" -> { file: "pg2600.txt", start: 1627174, end: null }
 *  "dhvanyaloka-locana-shankar.txt#102607-102685" -> { file, start, end } */
export function parseRef(ref) {
  if (!ref) return null;
  const m = /^(.*?)#(\d+)(?:-(\d+))?$/.exec(ref.trim());
  if (!m) return { file: ref, start: null, end: null };
  return { file: m[1], start: Number(m[2]), end: m[3] ? Number(m[3]) : null };
}

/** Snap the window around a byte address to a readable snip: for a bare
 *  start (facts point at their byte), begin at the start of that line and
 *  run to the end of the sentence (~SNIP_MAX chars); for a range, take the
 *  range verbatim. Never crosses a file boundary; null when out of range. */
const SNIP_MAX = 220;
export function snipAt(text, start, end) {
  if (start == null || start < 0 || start >= text.length) return null;
  let from = start;
  if (end == null) {
    const lineStart = text.lastIndexOf("\n", from) + 1;
    from = Math.min(lineStart, from);
    let to = from + SNIP_MAX;
    const nl = text.indexOf("\n", from);
    if (nl > -1 && nl < to) to = nl;
    const sentenceEnd = text.indexOf(". ", to);
    if (sentenceEnd > -1 && sentenceEnd < to + 120) to = sentenceEnd + 1;
    const slice = text.slice(from, to).replace(/\s+/g, " ").trim();
    return slice ? slice : null;
  }
  const to = Math.min(text.length, Math.max(end, start + 1));
  return text.slice(from, to).replace(/\s+/g, " ").trim() || null;
}

/** Find a ref's source file among sourceDirs and return its verbatim snip.
 *  Returns { file, address, path, verbatim } — verbatim null when the file
 *  isn't reachable or the address is out of range (never an error: the
 *  address is still shown, the snip is simply marked unresolvable). */
export function resolveSnippet(ref, dirs) {
  const parsed = parseRef(ref);
  if (!parsed) return null;
  const { file, start, end } = parsed;
  const match = dirs.map((d) => path.join(d, file)).find((p) => fs.existsSync(p));
  if (!match) {
    return { file, address: ref, path: null, verbatim: null, resolved: false };
  }
  const text = fs.readFileSync(match, "utf8");
  return {
    file,
    address: ref,
    path: match,
    verbatim: snipAt(text, start, end),
    resolved: true,
  };
}

/** Load a holograph artifact and attach the resolved source layer. `extra`
 *  source dirs are searched in addition to the defaults (the TUI passes the
 *  artifact's own directory first). */
export function loadHolograph(filePath, extra = []) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    const err = new Error(`no such holograph file: ${filePath}`);
    err.code = "ENOENT";
    throw err;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    throw new Error(`not valid JSON: ${filePath}`);
  }
  if (data.schema !== HOLOGRAPH_SCHEMA) {
    throw new Error(`${filePath} is not an ${HOLOGRAPH_SCHEMA} artifact (schema: ${data.schema ?? "none"})`);
  }
  const dirs = sourceDirs([path.dirname(abs), ...extra]);
  const material = (data.inspiredBy?.material ?? []).map((fact, i) => ({
    ...fact,
    index: i + 1,
    snip: resolveSnippet(fact.ref, dirs),
  }));
  const direction = data.inspiredBy?.direction
    ? { ...data.inspiredBy.direction, snip: resolveSnippet(data.inspiredBy.direction.source, dirs) }
    : null;
  // Fact index by ref AND by groundedOn text, so a prose sentence's pointer
  // resolves to a numbered source fact on the facing left page.
  const byRef = new Map();
  const byText = new Map();
  for (const f of material) {
    if (f.ref) byRef.set(f.ref, f.index);
    if (f.fact) byText.set(f.fact.toLowerCase().replace(/\s+/g, " "), f.index);
  }
  const prose = (data.prose ?? []).map((s) => {
    const factIndex =
      byRef.get(s.ref) ?? byText.get(String(s.groundedOn ?? "").toLowerCase().replace(/\s+/g, " "));
    return { ...s, factIndex: factIndex ?? null };
  });
  return {
    path: abs,
    question: data.question ?? null,
    inspiredBy: { material, direction },
    prose,
    tiers: data.tiers ?? null,
    verdict: data.verdict ?? null,
    notes: loadNotesDigest(abs),
  };
}

/** The notes layer. A holograph artifact's reasoning lives in companions: a
 *  `.notes.json` next to it (explicit notes) or a sibling `*-real-log.json`
 *  (the fold reading log — Encounter/Observation/graph records). Distilled
 *  here to digest lines; the TUI shows them collapsed. Never reads the
 *  quarter-million-line ledgers fully — only their headers and counts. */
export function loadNotesDigest(abs) {
  const dir = path.dirname(abs);
  const base = path.basename(abs, path.extname(abs));
  const out = [];

  const explicit = path.join(dir, `${base}.notes.json`);
  if (fs.existsSync(explicit)) {
    try {
      const n = JSON.parse(fs.readFileSync(explicit, "utf8"));
      const entries = n.notes ?? n.entries ?? n;
      if (Array.isArray(entries)) {
        out.push({ kind: "header", text: `reasoning notes (${entries.length}): ${path.basename(explicit)}` });
        for (const e of entries.slice(0, 40)) {
          const line = typeof e === "string" ? e : e.text ?? e.note ?? e.move ?? JSON.stringify(e).slice(0, 120);
          if (line) out.push({ kind: "note", text: `  ${line}` });
        }
        if (entries.length > 40) out.push({ kind: "note", text: `  … ${entries.length - 40} more in the file` });
      }
    } catch {
      out.push({ kind: "note", text: `  (could not parse ${path.basename(explicit)})` });
    }
  }

  // A sibling fold reading log: same basename under the `-real-log` / `-log`
  // suffix convention the lavar results use. Distill schema counts + the
  // first/last few records — the "logic applied" without the dump.
  const candidates = fs.existsSync(path.join(dir, `${base}-real-log.json`))
    ? [path.join(dir, `${base}-real-log.json`)]
    : fs.readdirSync(dir)
        .filter((f) => f.startsWith(base.split("-")[0]) && /-real-log\.json$/.test(f))
        .sort()
        .slice(0, 1)
        .map((f) => path.join(dir, f));
  for (const logPath of candidates) {
    try {
      const raw = fs.readFileSync(logPath, "utf8");
      const first = raw.indexOf("[");
      const last = raw.lastIndexOf("]");
      const head = JSON.parse(raw.slice(first, first + 200000) + (last > first ? "]" : ""));
      const counts = {};
      for (const e of head) if (e?.schema) counts[e.schema] = (counts[e.schema] ?? 0) + 1;
      const entries = first >= 0 ? (raw.match(/"schema"\s*:\s*"/g) ?? []).length : 0;
      out.push({
        kind: "header",
        text: `reading log: ${path.basename(logPath)} — ${entries} records (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")})`,
      });
      const survivors = head.filter((e) => e?.schema === "Observation@1").slice(0, 6);
      for (const o of survivors) {
        const surfaces = (o.distinctions ?? []).slice(0, 4).map((d) => d.surfaceKey).join(", ");
        const rel = (o.hyperedges ?? []).slice(0, 2).map((h) => h.kind ?? h.type ?? "edge").join(", ");
        out.push({ kind: "note", text: `  ${o.witness ?? "?"} — ${surfaces || "no surfaces"}${rel ? ` · ${rel}` : ""}` });
      }
      if (entries > head.length) out.push({ kind: "note", text: `  … full ledger is ${entries} records; digest above` });
    } catch {
      out.push({ kind: "note", text: `  (reading log ${path.basename(logPath)} not distilled)` });
    }
  }
  return out;
}