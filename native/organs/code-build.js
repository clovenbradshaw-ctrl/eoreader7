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

async function draw(model, prompt, { maxTokens = 220, timeoutMs = 90000 } = {}) {
  const r = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false, options: { num_predict: maxTokens, temperature: 0 } /* no num_ctx: the server owns the one window (2026-09-21 post-mortem) */ }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const j = await r.json();
  return { text: j.response ?? "", tokens: (j.prompt_eval_count ?? 0) + (j.eval_count ?? 0) };
}

const clean = (txt) => {
  const t = String(txt ?? "").replace(/```[a-z]*/gi, "");
  const m = /(?:def |function |const |class )[\s\S]*/.exec(t);
  return (m ? m[0] : t).trim();
};
// Keep EXACTLY the unit named — split on definition boundaries and take the
// chunk whose own name matches (the model often emits every function it sees).
function extractUnit(text, name) {
  const t = String(text ?? "").replace(/```[a-z]*/gi, "");
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const chunks = t.split(/\n(?=[ \t]*(?:def|async def|function|const|let|var|class)[ \t])/);
  const head = new RegExp(`^[ \\t]*(?:async[ \\t]+)?def[ \\t]+${esc}[ \\t]*\\(`);
  const jshead = new RegExp(`^[ \\t]*(?:function[ \\t]+${esc}[ \\t]*\\(|(?:const|let|var)[ \\t]+${esc}[ \\t]*=)`);
  const hit = chunks.find((c) => head.test(c) || jshead.test(c));
  return (hit || "").trim();
}

/** Build the file the NL task named: decompose → concurrent draws → assemble →
 *  validate. `testCommand` (optional) is the gate; without it the assembled
 *  file is written and disclosed as UNVERIFIED (never dressed as tested). */
export async function buildCodeTask({ task, model, testCommand = null, out = null, parallelism = 2 } = {}) {
  const started = Date.now();
  const units = planUnits(task);
  if (!units.length) return { ok: false, error: "no independent units found in the task — not a discrete build (defer to the normal turn)" };
  const draws = await pool(units, parallelism, (u) =>
    draw(model, `Write ONLY raw code (no prose, no markdown fences) for EXACTLY ONE function, named \`${u.name}\` — do NOT output any other function. It is one unit of this file: ${task}\nOutput only the single function \`${u.name}\`. Assume each function takes a string argument.`));
  const parts = draws.map((d, i) => extractUnit(d?.text || "", units[i].name)).filter(Boolean);
  const code = parts.join("\n\n") + "\n";
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
