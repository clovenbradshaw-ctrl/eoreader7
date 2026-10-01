// ═══ SAMPLE GROUND — the stances, as one handle every generation door can use ═══
//
// PURE (no fetch, no model, no files). The crossing that goes and gets the bytes is native/the-fold/find-samples.mjs (Cultivating); this is the rest:
//   needsSample(task)            does this task ask for something that reads an outside service's data, with no sample of it in the task itself?
//   needOf(task)                 the words to search for — the task with its code scaffolding (signatures, quotes) taken out
//   jsonBlocksIn(text)           every parseable JSON object/array an answer SHOWS (fenced, or a balanced literal)
//   traceShown(text, ground)     each shown block traced to the fetched bytes (Tracing): grounded / invented / unpaired — a block that claims to be a sample and is not found is named
//   hardcodedFrom(code, ground)  literals in generated CODE that appear in the sample only as values (a unit that returns the example) — Tracing's `value-only`, read the other way
//   sampleBlock(ground)          the trimmed, real view of the sample a unit prompt may show (arrays cut to 2; never a rewrite)
// Why one handle: the app door, the build door and a plain chat turn all generate from a prompt, and all three had the same hole — a sample nobody fetched, shown as if it were
// real. Each door asks this module the same questions, so the stance is applied the same way everywhere and refused the same way.
import { traceSample, leavesOf } from "./tracing.js";

const OUTSIDE = /\b(api|apis|endpoint|endpoints|rest|webhook|feed|json response|response from|returned by|returns json|open[- ]?meteo|openweather|github api|http|https)\b/i;
const READS = /\b(parse|read|fetch|call|consume|show|display|handle|extract|decode|wrap|client for)\b/i;

export function needsSample(task) {
  const t = String(task ?? "");
  if (t.length < 12 || !OUTSIDE.test(t) || !READS.test(t)) return false;
  // a task that already quotes a JSON literal has its sample; it is not asked to find one
  return !jsonBlocksIn(t).length;
}

/** the task with signatures `name(args)` and quoted strings taken out: what is left names the service and the data */
export function needOf(task) {
  return String(task ?? "").replace(/`[^`]*`/g, " ").replace(/\b[a-z_][A-Za-z0-9_]*\([^)]*\)/g, " ").replace(/["'][^"']{0,80}["']/g, " ").replace(/\b(write|make|create|build|generate|implement|a|an|the|file|module|script|function|functions|that|which|each|named|using|use|only|local|models?)\b/gi, " ").replace(/\s+/g, " ").trim().slice(0, 140);
}

/** every parseable JSON object or array an answer shows: fenced blocks first, then balanced literals in the prose. Each is { text, value, start }. */
export function jsonBlocksIn(text) {
  const s = String(text ?? ""), out = [], seen = new Set();
  const take = (raw, start) => { const t = raw.trim(); if (t.length < 12 || seen.has(t)) return; try { const v = JSON.parse(t); if (v && typeof v === "object") { seen.add(t); out.push({ text: t, value: v, start }); } } catch { /* not JSON */ } };
  for (const m of s.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/gi)) take(m[1], m.index);
  for (let i = 0; i < s.length; i++) {
    const open = s[i]; if (open !== "{" && open !== "[") continue;
    const close = open === "{" ? "}" : "]"; let depth = 0, inStr = false, esc = false, j = i;
    for (; j < s.length; j++) { const c = s[j]; if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; } else if (c === '"') inStr = true; else if (c === open) depth++; else if (c === close && --depth === 0) break; }
    if (depth === 0 && j > i) { take(s.slice(i, j + 1), i); i = j; }
  }
  return out;
}

/** every block an answer shows, traced to the fetched bytes: ground = [{ id, bytes }] -> [{ start, verdict, leaves, traced, failures }] */
export function traceShown(text, ground) {
  return jsonBlocksIn(text).map((b) => ({ start: b.start, ...traceSample(b.value, ground) }));
}

/** literals in code that are values of the sample (and not ordinary small numbers or short words): a unit that hard-codes what it should read. -> [{ literal, path, doc }] */
export function hardcodedFrom(code, ground, { minString = 4 } = {}) {
  const lits = new Set();
  for (const m of String(code ?? "").matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])+)\1/g)) if (m[2].length >= minString) lits.add(m[2]);
  for (const m of String(code ?? "").matchAll(/(?<![\w.])-?\d+\.\d+|(?<![\w.])-?\d{3,}(?![\w.])/g)) lits.add(Number(m[0]));
  const hits = [];
  for (const d of ground) { let doc; try { doc = JSON.parse(d.bytes); } catch { continue; } for (const l of leavesOf(doc)) if (lits.has(l.value) && !(typeof l.value === "string" && /^[a-z_][a-z0-9_]*$/i.test(l.value) && String(code).includes(`.${l.value}`))) hits.push({ literal: l.value, path: l.path, doc: d.id }); }
  return hits.filter((h, i, a) => a.findIndex((x) => x.literal === h.literal) === i);
}

const trim = (v, n) => (Array.isArray(v) ? v.slice(0, n).map((x) => trim(x, n)) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trim(x, n)])) : v);
/** the real view a prompt may show: the first kept document, arrays cut to `n` items, capped in characters (cut at a line, never mid-token) */
export function sampleBlock(ground, { n = 2, maxChars = 900 } = {}) {
  for (const d of ground) { let doc; try { doc = JSON.parse(d.bytes); } catch { continue; } const text = JSON.stringify(trim(doc, n), null, 1); return { id: d.id, text: text.length <= maxChars ? text : text.slice(0, text.lastIndexOf("\n", maxChars)) + "\n…" }; }
  return null;
}
