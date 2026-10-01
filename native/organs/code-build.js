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
import { execSync } from "node:child_process";
import { validatePython, validateHtml } from "../../postprocess.mjs";
import { MOUTH_URL, MOUTH_IDENTITY } from "../kernel/mouth.js";

// The mouth (Penelope) is the only draw entry — never ollama, never the
// channel, past her. code-build's draws go through her /api/generate wire.
const OLLAMA = MOUTH_URL;

/** A discrete multi-unit coding task, from plain language: an ask to WRITE a
 *  file/module/script that (names|lists) MORE THAN ONE function/unit. */
export function detectBuildTask(task) {
  const t = String(task ?? "");
  if (t.length < 12) return false;
  const makesFile = /\b(write|make|create|build|generate|implement|scaffold)\b[\s\S]{0,60}\b(file|module|script|library|utils?|helpers?|functions?|methods?|class)\b/i.test(t);
  if (!makesFile) return false;
  // listed must be a NAMED list, never a bare mention of "functions" — prose
  // like "a paper about the functions of memory" must not open the build door
  // (a false positive would refuse a turn with a build gap).
  const listed =
    (t.match(/,/g) || []).length >= 2
    || /\b(?:functions?|methods?|helpers?)\s*[:：]/i.test(t)
    || /\b(?:functions?|methods?|helpers?)\s+[a-z_][a-zA-Z0-9_]+\s*\(/i.test(t)
    || /\b(?:functions?|methods?|helpers?)\s+[a-z_][a-zA-Z0-9_]+\s+and\s+[a-z_][a-zA-Z0-9_]+/i.test(t)
    || /\b(?:each|following|named)\b/i.test(t);
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
  // also accept an and-separated list: "two functions clamp and lerp",
  // "functions, isOdd and isEven". Gated by a plural unit-noun and a
  // stop-word check so prose ("the functions of memory and thought") never
  // parses as units.
  const STOP = new Set(["and", "or", "the", "each", "with", "from", "for", "use", "of", "to", "in", "on", "a", "an", "that", "which", "this", "is", "are", "was"]);
  const andList = /\b(?:named|functions?|methods?|helpers?)\s*[:：,]?\s*([a-z_][a-zA-Z0-9_]+)(?:\s+and\s+([a-z_][a-zA-Z0-9_]+))+/i.exec(t);
  if (andList) {
    for (let k = 1; k < andList.length; k += 1) {
      const n = andList[k];
      if (!STOP.has(n) && !names.includes(n)) names.push(n);
    }
  }
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

async function draw(model, prompt, { maxTokens = 220, timeoutMs = 90000 } = {}) {
  let r = null;
  try {
    r = await fetch(`${OLLAMA}/api/generate`, {
      method: "POST", headers: { "content-type": "application/json", ...MOUTH_IDENTITY, "x-er7-kind": "code" },
      body: JSON.stringify({ model, prompt, stream: false, options: { num_predict: maxTokens, temperature: 0 } /* no num_ctx: the server owns the one window (2026-09-21 post-mortem) */ }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    // a typed refusal, never a silent empty (the house's 429 discipline — a
    // draw that dies must name the reason; a silent "" became "0 extracted
    // units" and then an empty file the gate blamed, GL-WV-08)
    return { text: "", tokens: 0, error: `draw failed: ${String(e.message ?? e).slice(0, 120)}` };
  }
  const j = await r.json();
  if (j.error) return { text: "", tokens: 0, error: `model ${model}: ${String(j.error).slice(0, 120)}` };
  return { text: j.response ?? "", tokens: (j.prompt_eval_count ?? 0) + (j.eval_count ?? 0) };
}

const clean = (txt) => {
  const t = String(txt ?? "").replace(/```[a-z]*/gi, "");
  const m = /(?:def |function |const |class )[\s\S]*/.exec(t);
  return (m ? m[0] : t).trim();
};
// Keep EXACTLY the unit named, WHOLE — Kleeneup's law (a thing is found at its
// byte address, never by a pattern) applied to extraction: a string/comment-
// aware brace walk from the named head to its matching close (GL-EN-09), so a
// draw that emits several functions yields each complete. The old line-boundary
// split truncated every unit at the next function's head — measured, GL-WV-09.
function findName(text, name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:function\\s+${esc}\\s*\\(|(?:const|let|var)\\s+${esc}\\s*=)`);
  const m = re.exec(text);
  return m ? m.index : -1;
}
function walkBraceEnd(src, from) {
  let depth = 0, i = from, seen = false, mode = "code";
  const n = src.length;
  while (i < n) {
    const ch = src[i], nx = src[i + 1];
    if (mode === "line") { if (ch === "\n") mode = "code"; i++; continue; }
    if (mode === "block") { if (ch === "*" && nx === "/") { mode = "code"; i += 2; } else i++; continue; }
    if (mode === "squote" || mode === "dquote" || mode === "tick") {
      if (ch === "\\") i += 2;
      else if ((mode === "squote" && ch === "'") || (mode === "dquote" && ch === '"') || (mode === "tick" && ch === "`")) { mode = "code"; i++; }
      else i++;
      continue;
    }
    if (ch === "/" && nx === "/") { mode = "line"; i += 2; }
    else if (ch === "/" && nx === "*") { mode = "block"; i += 2; }
    else if (ch === "'") { mode = "squote"; i++; }
    else if (ch === '"') { mode = "dquote"; i++; }
    else if (ch === "`") { mode = "tick"; i++; }
    else if (ch === "{") { depth++; seen = true; i++; }
    else if (ch === "}") { depth--; i++; if (seen && depth === 0) break; }
    else i++;
  }
  return i;
}
function extractUnit(text, name) {
  const t = String(text ?? "").replace(/```[a-z]*/gi, "");
  const at = findName(t, name);
  if (at < 0) return "";
  return t.slice(at, walkBraceEnd(t, at)).trim();
}

/** Build the file the NL task named: decompose → concurrent draws → assemble →
 *  validate. `testCommand` (optional) is the gate; without it the assembled
 *  file is written and disclosed as UNVERIFIED (never dressed as tested). */
export async function buildCodeTask({ task, model, testCommand = null, out = null, parallelism = 2 } = {}) {
  const started = Date.now();
  const units = planUnits(task);
  if (!units.length) return { ok: false, error: "no independent units found in the task — not a discrete build (defer to the normal turn)" };
  // Gary-shaped draw (2026-10-01): the task's own words ride last, and the
  // unit's function head is the completion anchor — the small-model law (the
  // prompt is a completion anchor, the test decides) plus Gary's
  // information-not-prohibition (a prohibition aimed at the mouth is how a
  // small model learns to say it; the old "Write ONLY raw code… do NOT output
  // any other function" prompt measured 0 extracted units from both resident
  // mouths, GL-WV-08). The extractor keeps exactly the named unit; the
  // testCommand decides; never a steering instruction.
  const draws = await pool(units, parallelism, (u) =>
    // The completion anchor holds the small mouth in the target language: a
    // bare "function name(" let both resident mouths answer the TASK as prose
    // and drift to Python ("Certainly! Below is a Python module..."), measured
    // 2026-10-01 on gemma2:2b and qwen2.5-coder:1.5b. The fenced JS head is
    // the anchor the small model completes — the extractor strips the fence
    // and keeps exactly the named unit (GL-BD-09, the small-model law).
    draw(model, `${task}\n\n\`\`\`javascript\nfunction ${u.name}(`, { maxTokens: 512 }));
  const parts = draws.map((d, i) => extractUnit(d?.text || "", units[i].name)).filter(Boolean);
  const code = parts.join("\n\n") + "\n";
  if (!parts.length) {
    // the mouth produced nothing extractable — a typed refusal, never an empty
    // file the gate then blames (GL-WV-08)
    const errors = [...new Set(draws.map((d) => d?.error).filter(Boolean))];
    return { ok: false, error: errors.length ? `draw failed: ${errors.join("; ")}` : "no units drawn — the mouth returned nothing extractable (named gap)" };
  }
  const looksJs = /\b(function|=>|const |let |require\(|export )/.test(code) && !/^\s*def |^\s*import |^\s*from /m.test(code);
  const looksPy = /^\s*(def |import |from |class )/m.test(code);
  const ext = looksJs ? "js" : "py";
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
    disclosure: {
      giver: "heimdall", standing: "disclosed",
      rule: "a discrete multi-unit coding task is DECOMPOSED into independent units, each drawn from the model CONCURRENTLY (bounded by parallelism), then ASSEMBLED and VALIDATED mechanically — the structure is computed, only the units are generated, and the test (not the prose) decides. No testCommand ⇒ written and disclosed as UNVERIFIED.",
    },
  };
}
