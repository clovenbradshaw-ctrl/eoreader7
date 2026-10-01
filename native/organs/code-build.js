// native/organs/code-build.js — the mechanical code build (2026-09-21)
//
// The lesson, tested: for a DISCRETE coding task, structure is COMPUTED
// (decomposition, assembly, validation) and only the irreducible unit logic is
// GENERATED — and the units, being independent, are drawn from the model
// CONCURRENTLY. This is the "compute, don't generate" discipline applied to
// code: the box computes the scaffold; the model fills the units; the test
// decides. It is driven by a REGULAR NL PROMPT — the caller does not build a
// harness; the system recognizes the shape.
//
// Falsifying control: a unit that depends on another unit's text (so the draws
// are NOT independent) would make concurrent assembly incoherent — if a build
// task's units reference each other, this path is the wrong one and must defer.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { execSync } from "node:child_process";
import { validatePython, validateHtml } from "../../postprocess.mjs";
import { CARD_NAMES, cardsFor, cardsDoc, cardSource } from "./cards.js";
import { canonicalize, adoptIf } from "./code-canonical.js";
import { proposeCanonical, readAnchorLog, appendAnchorLog } from "../adapters/build/code-anchor-log.js";

const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";

/** A discrete multi-unit coding task, from plain language: an ask to WRITE a
 *  file/module/script that (names|lists) MORE THAN ONE function/unit. */
export function detectBuildTask(task) {
  const t = String(task ?? "");
  if (t.length < 12) return false;
  const makesFile = /\b(write|make|create|build|generate|implement|scaffold)\b[\s\S]{0,60}\b(file|module|script|library|utils?|helpers?|functions?|methods?|class)\b/i.test(t);
  if (!makesFile) return false;
  const listed = (t.match(/,/g) || []).length >= 2 || /\b(functions?|methods?|each|following)\b/i.test(t);
  return listed;
}

/** Plan the INDEPENDENT units: the function names the task lists. Conservative:
 *  only names that look like calls/definitions (`foo(`), deduped, capped.
 *  CamelCase names (fmtTime, newSession) are legitimate JS unit names — the
 *  leading-lowercase rule must still hold (a name starting with an uppercase
 *  is prose, not a definition), but the BODY may carry capitals. */
export function planUnits(task) {
  const t = String(task ?? "");
  const names = [];
  // A real call/definition has NO space before the paren — this keeps prose
  // like "the number of vowels (aeiou)" from being parsed as a unit.
  for (const m of t.matchAll(/\b([a-z_][a-zA-Z0-9_]{2,})\(/g)) {
    const n = m[1];
    if (!names.includes(n) && !["and", "or", "the", "each", "with", "from", "for", "use"].includes(n)) names.push(n);
  }
  // also accept "named: a, b, c" / "functions: a, b, c"
  const list = /\b(?:named|functions?|methods?)\s*[:：]\s*([a-zA-Z_][a-zA-Z0-9_]+(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]+)+)/i.exec(t);
  if (list) for (const n of list[1].split(/\s*,\s*/)) if (!names.includes(n)) names.push(n);
  return names.slice(0, 12).map((name) => ({ name, spec: t }));
}

/** Bounded concurrency over the unit draws — the parallelism the model server
 *  allows, applied to genuinely independent work. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const n = Math.max(1, Math.min(limit || 1, items.length));
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const idx = i++; try { out[idx] = await fn(items[idx], idx); } catch (e) { out[idx] = { error: e.message }; } }
  }));
  return out;
}

/** What the task's own words say the language is: "js", "py", or null when it does not say. The cards are JavaScript, so they are only offered to a task that asks for it. */
export function taskLanguage(task) {
  const t = String(task ?? "");
  const js = /\b(javascript|typescript|node(?:\.?js)?|ecmascript|js)\b|\.m?js\b|=>/i.test(t);
  const py = /\b(python|py|pytest)\b|\.py\b|\bdef\s+\w+\s*\(/i.test(t);
  return js && !py ? "js" : py && !js ? "py" : null;
}

const looksJs = (code) => /\b(function|=>|const |let |require\(|export )/.test(code) && !/^\s*def |^\s*import |^\s*from /m.test(code);
const parses = (code) => { try { new vm.Script(String(code).replace(/^\s*export\s+(?:default\s+)?/, "")); return true; } catch { return false; } };

/** Calls the host environment provides, so a call to one is not "a name nothing declares" (cards.js GLOBALS holds the language's own; these are the platform's). */
const ENVIRONMENT_CALLS = new Set(["require", "fetch", "setTimeout", "setInterval", "clearTimeout", "clearInterval", "queueMicrotask", "structuredClone", "Buffer", "URL", "URLSearchParams", "TextEncoder", "TextDecoder", "AbortController", "atob", "btoa", "alert", "prompt", "confirm", "readFileSync", "writeFileSync", "test", "describe", "it", "expect", "assert"]);

/** The part of the task that describes ONE unit: from where its name is called out to where the next unit's is (or the end). A unit is offered the operations ITS words name, not the whole file's. */
export function clauseOf(task, units, i) {
  const t = String(task ?? ""), at = t.indexOf(`${units[i].name}(`);
  if (at < 0) return t;
  const ends = units.map((u) => t.indexOf(`${u.name}(`)).filter((j) => j > at);
  return t.slice(at, ends.length ? Math.min(...ends) : t.length);
}

/** The one-unit prompt. A JavaScript task is shown the operations its own words name (cards.js cardsFor): the model CALLS them instead of re-deriving them. */
export function unitPrompt(task, name, offered = []) {
  const base = `Write ONLY raw code (no prose, no markdown fences) for EXACTLY ONE function, named \`${name}\` — do NOT output any other function. It is one unit of this file: ${task}\nOutput only the single function \`${name}\`. Assume each function takes a string argument.`;
  return offered.length ? `${base}\nThese functions already exist — call them, do not write them yourself, and do not declare them:\n${cardsDoc(offered)}` : base;
}

async function draw(model, prompt, { maxTokens = 220, timeoutMs = 90000 } = {}) {
  const r = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, options: { num_predict: maxTokens, temperature: 0 } /* no num_ctx: the server owns the one window (2026-09-21 post-mortem) */ }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const j = await r.json();
  return { text: j.response ?? "", tokens: (j.prompt_eval_count ?? 0) + (j.eval_count ?? 0), truncated: j.done_reason === "length" };
}

const clean = (txt) => {
  const t = String(txt ?? "").replace(/```[a-z]*/gi, "");
  const m = /(?:def |function |const |class )[\s\S]*/.exec(t);
  return (m ? m[0] : t).trim();
};
// Keep EXACTLY the unit named (the model often emits every function it sees). The END of a unit is where its own body ends — braces for
// JavaScript, indentation for Python — never "the next line that starts with const": a body is full of lines that do, and splitting there shipped
// every JavaScript unit with a local variable cut off at its first one (measured 2026-10-01: windLabel and legMiles came back as a bare signature).
const indentOf = (line) => line.match(/^[ \t]*/)[0].replace(/\t/g, "    ").length;
/** the index just past the statement that starts at `from`: the `}` that closes its first `{`, or the end of an arrow-expression body; strings, template literals and comments are skipped */
function jsUnitEnd(src, from) {
  let depth = 0, seen = false;
  for (let i = from; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (c === "/" && n === "/") { while (i < src.length && src[i] !== "\n") i++; i--; continue; }
    if (c === "/" && n === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 1; continue; }
    if (c === "'" || c === '"' || c === "`") { for (i++; i < src.length && src[i] !== c; i++) if (src[i] === "\\") i++; continue; }
    if (c === "{" || c === "(" || c === "[") { depth++; if (c === "{") seen = true; continue; }
    if (c === "}" || c === ")" || c === "]") { depth--; if (depth <= 0 && c === "}" && seen) return src[i + 1] === ";" ? i + 2 : i + 1; continue; }
    if (depth === 0 && !seen && (c === ";" || (c === "\n" && /=>\s*[^\s=]/.test(src.slice(from, i)) && !/[=>,+\-*/&|?:(]\s*$/.test(src.slice(from, i))))) return c === ";" ? i + 1 : i;
  }
  return src.length;
}
export function extractUnit(text, name) {
  const t = String(text ?? "").replace(/```[a-z]*/gi, "");
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pyHead = new RegExp(`^[ \\t]*(?:async[ \\t]+)?def[ \\t]+${esc}[ \\t]*\\(`);
  const jsHead = new RegExp(`^[ \\t]*(?:(?:export[ \\t]+)?(?:async[ \\t]+)?function[ \\t]*\\*?[ \\t]*${esc}[ \\t]*\\(|(?:export[ \\t]+)?(?:const|let|var)[ \\t]+${esc}[ \\t]*=)`);
  const lines = t.split("\n");
  const at = lines.findIndex((l) => pyHead.test(l) || jsHead.test(l));
  if (at < 0) return "";
  if (pyHead.test(lines[at])) {
    const base = indentOf(lines[at]);
    let end = at + 1;
    while (end < lines.length && (lines[end].trim() === "" || indentOf(lines[end]) > base)) end++;
    return lines.slice(at, end).join("\n").trim();
  }
  const from = lines.slice(0, at).reduce((n, l) => n + l.length + 1, 0);
  return t.slice(from, jsUnitEnd(t, from)).trim();
}

/** Build the file the NL task named: decompose → concurrent draws → assemble →
 *  validate. `testCommand` (optional) is the gate; without it the assembled
 *  file is written and disclosed as UNVERIFIED (never dressed as tested).
 *  `read: false` is the falsification control: no operations offered, no canonical stage. */
export async function buildCodeTask({ task, model, testCommand = null, out = null, parallelism = 2, drawFn = draw, anchorDir = null, read = true } = {}) {
  const started = Date.now();
  const units = planUnits(task);
  if (!units.length) return { ok: false, error: "no independent units found in the task — not a discrete build (defer to the normal turn)" };
  const unitNames = units.map((u) => u.name);
  // the operations the task's own words name (JavaScript tasks only), never one the file itself is asked to define
  const js = read && taskLanguage(task) === "js";
  const offeredFor = (i) => (js ? cardsFor({ doc: clauseOf(task, units, i) }).map((c) => c.name).filter((n) => !unitNames.includes(n)) : []);
  const offered = [...new Set(units.flatMap((_, i) => offeredFor(i)))];
  // A draw the server cut off at its token cap is not a different answer, it is half of one: that unit is asked again ONCE with twice the room (and named if it is cut again).
  const ask = async (u, i) => {
    let d = await drawFn(model, unitPrompt(task, u.name, offeredFor(i)));
    if (d?.truncated) { const again = await drawFn(model, unitPrompt(task, u.name, offeredFor(i)), { maxTokens: 440 }); d = { ...again, tokens: (d.tokens || 0) + (again?.tokens || 0), retried: true }; }
    return d;
  };
  const draws = await pool(units, parallelism, ask);
  // A draw is a SUGGESTION. What it means is read, resolved against what really exists (the card library; the file's own units), and the
  // reading is recorded as typed transformations (code-canonical.js). Adopted only where the code still parses: a rewrite that breaks it is refused.
  const cardPool = CARD_NAMES.filter((n) => !unitNames.includes(n));
  const transformations = [], unresolved = [], ambiguous = [];
  const parts = draws.map((d, i) => {
    const raw = extractUnit(d?.text || "", units[i].name);
    if (!read || !raw || !looksJs(raw)) return raw; // read:false is the control arm — the draw is shipped as said, which is what this door did before it read anything
    const can = canonicalize(raw, { cardNames: cardPool, declared: unitNames.filter((n) => n !== units[i].name) });
    const adopted = can.changed && adoptIf(parses(raw) ? 1 : 0, parses(can.code) ? 1 : 0);
    const code = adopted ? can.code : raw;
    if (adopted) for (const t of can.transformations) transformations.push({ unit: units[i].name, ...t });
    if (draws[i]?.truncated) unresolved.push({ unit: units[i].name, kind: "truncated", name: "the draw was cut off at the token cap, twice" });
    else if (!parses(code)) unresolved.push({ unit: units[i].name, kind: "does_not_parse", name: "the unit does not parse" });
    for (const f of can.findings) {
      if (f.kind === "unresolved_call" && ENVIRONMENT_CALLS.has(f.name)) continue;
      (f.kind === "ambiguous_call" ? ambiguous : unresolved).push({ unit: units[i].name, ...f });
    }
    if (anchorDir) { // the record outlives the run: what was suggested, what was read of it, what stands
      const file = path.join(anchorDir, `${units[i].name}.jsonl`), log = readAnchorLog(file), before = log.entries.length;
      appendAnchorLog(file, proposeCanonical(log, { anchor: units[i].name, round: before, writer: model, suggestion: raw, canonical: { ...can, code } }), before);
    }
    return code;
  }).filter(Boolean);
  // the file carries the operations it calls, verbatim, once: a unit that names a card is whole without asking the reader for a library
  const used = CARD_NAMES.filter((n) => !unitNames.includes(n) && parts.some((p) => new RegExp(`(^|[^.\\w$])${n}\\s*\\(`).test(p)));
  const code = (used.length ? `// the operations below are written and checked once (organs/cards.js); the units call them\n${cardSource(used)}\n\n` : "") + parts.join("\n\n") + "\n";
  const looksJsFile = /\b(function|=>|const |let |require\(|export )/.test(code) && !/^\s*def |^\s*import |^\s*from /m.test(code);
  const looksPy = /^\s*(def |import |from |class )/m.test(code);
  const ext = looksJsFile ? "js" : "py";
  const target = out || path.join(os.tmpdir(), `er7-build-${Date.now()}.${ext}`);
  let written = null, verified = null, verifyError = null;
  try { fs.writeFileSync(target, code); written = target; } catch (e) { verifyError = e.message; }
  if (written) {
    if (testCommand) {
      try { execSync(testCommand, { timeout: 30000, stdio: "pipe" }); verified = true; }
      catch (e) { verified = false; verifyError = String(e.stderr || e.message).slice(0, 220); }
    } else if (looksPy) {
      // THE REAL GATE (not syntax): pyodide compile + AST undefined-name scan +
      // exec — the same validator the code path uses. "validated", or the
      // findings; never dressed as tested when only parsed.
      try {
        const v = await validatePython(code);
        verified = v.ok ? "validated (compile+exec)" : false;
        if (!v.ok) verifyError = (v.findings || []).map((f) => `${f.kind}: ${f.detail}`).join("; ").slice(0, 220);
      } catch (e) { verified = false; verifyError = `validator error: ${e.message}`.slice(0, 220); }
    } else if (/<!doctype html|<html/i.test(code)) {
      try {
        const v = await validateHtml(code);
        verified = v.ok ? "validated (html structure)" : false;
        if (!v.ok) verifyError = (v.findings || []).map((f) => `${f.kind}: ${f.detail}`).join("; ").slice(0, 220);
      } catch (e) { verified = false; verifyError = `validator error: ${e.message}`.slice(0, 220); }
    } else {
      // no hard validator for this language — a syntax parse only, disclosed.
      try { execSync(`node --check ${JSON.stringify(target)}`, { timeout: 15000, stdio: "pipe" }); verified = "syntax_only"; }
      catch (e) { verified = false; verifyError = String(e.stderr || e.message).slice(0, 220); }
    }
  }
  const tokens = draws.reduce((a, d) => a + (d?.tokens || 0), 0);
  return {
    ok: true, kind: "mechanical-code-build", units: units.map((u) => u.name),
    draws: parts.length, tokens, wallMs: Date.now() - started, out: written,
    verified, verifyError, code,
    // what the suggestion was read as: the operations offered and called, the typed rewrites made, and what nothing in the file declares
    canonical: { offered, cards: used, transformations, unresolved, ambiguous },
    disclosure: {
      giver: "heimdall", standing: "disclosed",
      rule: "a discrete multi-unit coding task is DECOMPOSED into independent units, each drawn from the model CONCURRENTLY (bounded by parallelism), then ASSEMBLED and VALIDATED mechanically — the structure is computed, only the units are generated, and the test (not the prose) decides. No testCommand ⇒ written and disclosed as UNVERIFIED.",
    },
  };
}
