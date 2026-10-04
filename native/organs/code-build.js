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
import { pathToFileURL } from "node:url";
import { execSync } from "node:child_process";
import { validatePython, validateHtml } from "../../postprocess.mjs";
import { MOUTH_URL, MOUTH_IDENTITY } from "../kernel/mouth.js";
import { mechanicalUnitBody } from "./mechanical-units.js";

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

/** A build INTENT: the task names a code-file target (file/module/script/
 *  library/utility/helper/class) — even when no unit is named yet. The
 *  tightened `listed` above excludes "write a module with a function" (no
 *  named list), but that is a BUILD intent and must be a typed refusal or a
 *  build, never a silent turn (the measured swallow at 2026-10-01, GL-BD-15).
 *  Prose that merely mentions "functions" ("a paper about the functions of
 *  memory") has no code-file target and stays a turn. */
export function detectCodeBuildIntent(task) {
  const t = String(task ?? "");
  if (t.length < 12) return false;
  const codeTarget = /\b(write|make|create|build|generate|implement|scaffold)\b[\s\S]{0,60}\b(file|module|script|library|utils?|helpers?|class)\b/i.test(t);
  return codeTarget || detectBuildTask(t);
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
function findName(text, name, lang = "js") {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = lang === "python"
    ? new RegExp(`def\\s+${esc}\\s*\\(`)
    : new RegExp(`(?:function\\s+${esc}\\s*\\(|(?:const|let|var)\\s+${esc}\\s*=)`);
  const m = re.exec(text);
  return m ? m.index : -1;
}
/** The python block's end: the first line after the def's body that returns to
 *  (or falls below) the body's own indent — indentation, never braces. */
function pyBlockEnd(src, from) {
  const n = src.length;
  let j = (src.indexOf("\n", from) < 0 ? n : src.indexOf("\n", from)) + 1;
  let bodyIndent = -1;
  while (j < n) {
    const e = src.indexOf("\n", j);
    const line = src.slice(j, e < 0 ? n : e);
    const trimmed = line.trim();
    if (!trimmed) { j = (e < 0 ? n : e) + 1; continue; }
    bodyIndent = line.length - line.trimStart().length;
    j = (e < 0 ? n : e) + 1;
    break;
  }
  if (bodyIndent < 0) return n;
  while (j < n) {
    const e = src.indexOf("\n", j);
    const line = src.slice(j, e < 0 ? n : e);
    const trimmed = line.trim();
    if (trimmed && line.length - line.trimStart().length <= bodyIndent) return j;
    j = (e < 0 ? n : e) + 1;
  }
  return n;
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
function extractUnit(text, name, lang = "js") {
  const t = String(text ?? "").replace(/```[a-z]*/gi, "");
  const at = findName(t, name, lang);
  if (at < 0) return "";
  const end = lang === "python" ? pyBlockEnd(t, at) : walkBraceEnd(t, at);
  return t.slice(at, end).trim();
}

/** The ask's medium, conservatively: only a task that names python is python;
 *  everything else is the js default (the current behavior, unchanged). */
function languageFromTask(task) {
  const t = String(task ?? "").toLowerCase();
  return /\bpython\b|\b\.py\b/i.test(t) ? "python" : "js";
}

/** Build the file the NL task named: decompose → concurrent draws → assemble →
 *  validate. `testCommand` (optional) is the gate; without it the assembled
 *  file is written and disclosed as UNVERIFIED (never dressed as tested). */
export async function buildCodeTask({ task, model, testCommand = null, out = null, parallelism = 2 } = {}) {
  const started = Date.now();
  const units = planUnits(task);
  if (!units.length) return { ok: false, error: "no independent units found in the task — a build ask must name its functions (typed gap, never a turn)" };
  // Gary-shaped draw (2026-10-01): the task's own words ride last, and the
  // unit's function head is the completion anchor — the small-model law (the
  // prompt is a completion anchor, the test decides) plus Gary's
  // information-not-prohibition (a prohibition aimed at the mouth is how a
  // small model learns to say it; the old "Write ONLY raw code… do NOT output
  // any other function" prompt measured 0 extracted units from both resident
  // mouths, GL-WV-08). The extractor keeps exactly the named unit; the
  // testCommand decides; never a steering instruction.
// The categories come first (Kant, GL-BD-12): a unit whose name legislates an
  // a priori shape is COMPUTED by the box, 0 draws — logic is the understanding's,
  // never the mouth's (the toCamelCase/toSnakeCase draw failed 4/10 golden pairs
  // at 2026-10-01; the same shape now computes). Only the residue — a unit no
  // category owns — is drawn, concurrently, with the fenced JS completion anchor
  // (GL-BD-09: a bare "function name(" let both resident mouths answer the TASK
  // as prose-Python; the fence is the anchor the small mouth completes). The
  // extractor strips the fence and keeps exactly the named unit; the testCommand
  // decides; never a steering instruction.
  const lang = languageFromTask(task);
  const computed = units.map((u) => mechanicalUnitBody(u.name, lang));
  const mouthUnits = units.filter((_, i) => !computed[i].ok);
  const mouthDraws = mouthUnits.length
    ? await pool(mouthUnits, parallelism, (u) => draw(model, `${task}\n\n\`\`\`${lang === "python" ? "python" : "javascript"}\n${lang === "python" ? "def" : "function"} ${u.name}(`, { maxTokens: 512 }))
    : [];
  const parts = [];
  const provenance = [];
  const drawErrors = [];
  let mi = 0;
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i];
    if (computed[i].ok) {
      parts.push(computed[i].body);
      provenance.push({ unit: u.name, source: "box", shape: computed[i].shape, lang, bytes: computed[i].body.length });
      continue;
    }
    const d = mouthDraws[mi++];
    const part = extractUnit(d?.text || "", u.name, lang);
    if (part) {
      parts.push(part);
      provenance.push({ unit: u.name, source: "mouth", lang, bytes: part.length });
    } else if (d?.error) drawErrors.push(d.error);
  }
  let code = parts.join("\n\n") + "\n";
  const boxUnits = provenance.filter((p) => p.source === "box");
  const mouthCount = provenance.filter((p) => p.source === "mouth").length;
  if (!parts.length) {
    // nothing assembled — a typed refusal, never an empty file the gate blames
    // (GL-WV-08). Box-computed units cannot empty the file; a refusal here means
    // every unit was the residue and the mouth produced nothing extractable.
    const errors = [...new Set(drawErrors)];
    return { ok: false, error: errors.length ? `draw failed: ${errors.join("; ")}` : "no units drawn — the mouth returned nothing extractable (named gap)" };
  }
  // THE EXPORT SURFACE (mirror of GL-CD-11 in penelope): the assembled file
  // must be a MODULE an importer can use — a bare `function name` file imports
  // as `{default, module.exports}` with every unit undefined. Append an
  // `export { a, b, c }` block for the units actually declared, so a strict
  // consumer's `import` sees them. Units already exported are left alone.
  const looksJs = /\b(function|=>|const |let |require\(|export )/.test(code) && !/^\s*def |^\s*import |^\s*from /m.test(code);
  if (looksJs) {
    const declaredUnits = units.filter((u) => new RegExp(`(?:export\\s+)?(?:async\\s+)?(?:function|class)\\s+${u.name}\\b|(?:export\\s+)?(?:const|let|var)\\s+${u.name}\\b`).test(code));
    const alreadyExported = (n) => new RegExp(`export\\s+(?:async\\s+)?(?:function|class)\\s+${n}\\b|export\\s*\\{[^}]*\\b${n}\\b|export\\s+(?:const|let|var)\\s+${n}\\b`).test(code);
    const toExport = declaredUnits.map((u) => u.name).filter((n) => !alreadyExported(n));
    if (toExport.length) code += `\nexport { ${toExport.join(", ")} };\n`;
  }
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
      // JS — THE EXPORT-SURFACE CHECK (mirror of GL-CD-11): write as a real
      // module (`.mjs`) and IMPORT it, then read each planned unit off the
      // exports — the same door a strict gate uses. `node --check` alone was
      // the vacuous pass: it parses CJS syntax and cannot see "exports
      // nothing". A module that does not import, or whose unit is not an
      // exported function, is refused with the reason the gate would give.
      try {
        const mjs = path.join(path.dirname(target), `${path.basename(target, path.extname(target))}.mjs`);
        fs.writeFileSync(mjs, code);
        const modUrl = pathToFileURL(mjs).href;
        const probe = `import * as __m from ${JSON.stringify(modUrl)};\nconst __out = [];\n${units.map((u) => `__out.push([${JSON.stringify(u.name)}, typeof __m[${JSON.stringify(u.name)}]]);`).join("\n")}\nglobalThis.__c = { exports: __out };`;
        const p = path.join(os.tmpdir(), `er7-build-probe-${Date.now()}.mjs`);
        fs.writeFileSync(p, probe);
        execSync(`node ${JSON.stringify(p)}`, { timeout: 15000, stdio: "pipe" });
        verified = "validated (module exports)";
      } catch (e) {
        verified = false;
        verifyError = String(e.stderr || e.message).slice(0, 220);
      }
    }
  }
  const tokens = mouthDraws.reduce((a, d) => a + (d?.tokens || 0), 0);
  const boxBytes = boxUnits.reduce((a, p) => a + (p.bytes || 0), 0);
  const mouthBytes = provenance.filter((p) => p.source === "mouth").reduce((a, p) => a + (p.bytes || 0), 0);
  return {
    ok: true, kind: "mechanical-code-build", units: units.map((u) => u.name),
    draws: mouthCount, tokens, wallMs: Date.now() - started, out: written,
    verified, verifyError, code, provenance, boxUnits: boxUnits.map((p) => p.unit), boxBytes, mouthBytes,
    disclosure: {
      giver: "heimdall", standing: "disclosed",
      rule: "a discrete multi-unit coding task is DECOMPOSED into independent units — an a priori unit (a category the box legislates) is COMPUTED, never drawn; only the irreducible residue is drawn from the mouth CONCURRENTLY (bounded by parallelism); then ASSEMBLED and VALIDATED mechanically — the structure and the logic are the understanding's, the matter is the mouth's, and the test (not the prose) decides (GL-BD-12). No testCommand ⇒ written and disclosed as UNVERIFIED.",
    },
  };
}
