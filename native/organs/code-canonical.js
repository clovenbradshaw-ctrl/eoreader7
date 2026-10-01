// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace; read as LaVar reads — the model suggests, the reading pipeline makes it coherent.
// code-canonical.js — a model's draw is a SUGGESTION; the canonical form is what the log keeps.
//
// "The model is giving ideas, the system is making them coherent." (the operator, 2026-09-30)
//
// A small model writing a function has the idea and gets the spelling, the scoping and the operation names wrong. The wrong way to
// deal with that is a repair loop that explains the mistake back to the model: measured, it hands the same code back. The right way
// is the one this codebase already holds for every other source — READ the suggestion, resolve what it points at against what is
// really there, and record the resolution as a typed transformation:
//
//   const_to_let      a `const` assigned again later. The program throws as written, so the only reading is the one the model meant.
//   redeclared_to_assignment  a `const`/`let` declared twice in one scope — a SyntaxError the engine itself names ("Identifier 'x' has already been declared"); the later
//                     declaration is the assignment it was meant to be. Kept only if re-compiling shows that error gone.
//   call_resolved     a call to a name nothing declares, which the referent rules resolve to exactly ONE verified card (cards.js):
//                     `cToF(` is `celsiusToFahrenheit(`. Ambiguous and unknown names are FINDINGS, never guessed (`mph` starts three).
//   key_resolved      a read of a key the received object lacks, which the wall resolved to exactly one real key (key-referents.js):
//                     `.tz` is `.timezone`. The evidence (tier, basis) rides the transformation.
//
// What goes on the log (adapters/build/code-anchor-log.js `proposeCanonical`) is: the raw suggestion as SIG evidence (nothing the model
// said is deleted — it is the mistake corpus LAVAR.md §3 asks for), each transformation as typed evidence with its basis, and the
// canonical content as the INS/SYN. The fold is computed from canonical entries only. A transformation is never trusted on its own
// say: the caller re-tests the canonical code and adopts it only where it does at least as well as the suggestion did (`adoptIf`).
//
// Pure. The scan is a regex over source, not a parser (cards.js `freeCalls`, the same disclosed approximation): it can MISS a
// transformation (the suggestion stays as written, the honest outcome) and the re-test is what catches a wrong one.
import { freeCalls, declaredIn, resolveCard, CARD_NAMES } from "./cards.js";

export const CANONICAL_SCHEMA = "EOCanonicalCode@1";

/** the engine's own message for source that does not compile, or null; `Function` compiles without running, in a browser as in node */
const syntaxError = (src) => { try { new Function(String(src).replace(/^\s*export\s+(?:default\s+)?/gm, "")); return null; } catch (e) { return e instanceof SyntaxError ? e.message : null; } };

/** the index just past the statement that starts at `from`: the `}` that closes its first `{`, or the end of an arrow-expression body; strings, template literals and comments are skipped */
export function jsUnitEnd(src, from) {
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
export 
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The operations a unit was GIVEN (named in its prompt) and then declared again itself — `const parseMoney = x => parseFloat(...)` — are dropped: the model named the operation
 * it meant, and its own version is the re-implementation the card exists to replace (measured: a hand-written `parseMoney` that could not read "$1,234.50"). A removal is kept only
 * if the rest still compiles.
 */
export function dropShadowedCards(code, offered = []) {
  let out = String(code ?? ""); const names = [];
  for (const n of offered) {
    const head = new RegExp(`(^|\\n)([ \\t]*)((?:async[ \\t]+)?function[ \\t]*\\*?[ \\t]*${esc(n)}[ \\t]*\\(|(?:const|let|var)[ \\t]+${esc(n)}[ \\t]*=)`);
    let m, guard = 0;
    while ((m = head.exec(out)) && guard++ < 4) {
      const start = m.index + m[1].length, end = jsUnitEnd(out, start + m[2].length), candidate = (out.slice(0, start) + out.slice(end).replace(/^[ \t]*\n?/, "")).replace(/\n{3,}/g, "\n\n");
      if (syntaxError(out) === null && syntaxError(candidate) !== null) break; // dropping it would break a program that compiled
      out = candidate; if (!names.includes(n)) names.push(n);
    }
  }
  return { code: out, names };
}

/**
 * Names the ENGINE says are declared twice in one scope, and the code with each later declaration read as an assignment. The engine names the identifier; the rewrite is
 * tried one declaration at a time and kept only if the error for that name is gone after re-compiling — never by guessing which scope two declarations share.
 */
export function redeclaredToAssignment(code) {
  let out = String(code ?? ""); const names = [];
  for (let guard = 0; guard < 12; guard++) {
    const m = /Identifier '([^']+)' has already been declared/.exec(syntaxError(out) ?? "");
    if (!m) break;
    const name = m[1], hits = [...out.matchAll(new RegExp(`\\b(?:const|let|var)\\s+${esc(name)}(\\s*=)`, "g"))];
    let fixed = false;
    for (let i = hits.length > 1 ? 1 : 0; i < hits.length && !fixed; i++) {
      const h = hits[i], candidate = out.slice(0, h.index) + name + h[1] + out.slice(h.index + h[0].length), again = syntaxError(candidate);
      // progress is: it compiles, or the only thing left is ANOTHER name declared twice. A rewrite that trades this error for a different kind is not kept.
      const other = again === null || (/has already been declared/.test(again) && !again.includes(`'${name}'`));
      if (other) { out = candidate; names.push(name); fixed = true; }
    }
    if (!fixed) break;
  }
  return { code: out, names };
}

/**
 * `const` names assigned again later (`const at = ...; at = ...; at += ...; at++`). The engine's own message ("Assignment to constant variable")
 * does not say WHICH variable. The scan stops at the next declaration of the same name (another variable in another scope).
 */
export function constReassigned(code) {
  const src = String(code ?? ""), out = [];
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    const name = m[1], e = esc(name);
    let after = src.slice(m.index + m[0].length);
    const again = after.search(new RegExp(`\\b(?:const|let|var|function|class)\\s+${e}(?![\\w$])`));
    if (again >= 0) after = after.slice(0, again);
    if (new RegExp(`(^|[^\\w$.])${e}\\s*(?:=(?![=>])|[-+*/%&|^]=|\\+\\+|--)`).test(after) || new RegExp(`(?:\\+\\+|--)${e}(?![\\w$])`).test(after)) out.push(name);
  }
  return [...new Set(out)];
}

/**
 * Rewrite READS of `asked` to `real` where the code receives an object: `.asked`, `["asked"]`, and a destructuring pattern (`const { asked } = x`
 * becomes `const { real: asked } = x`, keeping the local name). Never an object LITERAL (`return { asked }` names an output key, not an input read)
 * and never an assignment target (`result.asked = v`).
 */
export function rewriteKey(code, asked, real) {
  const a = esc(asked);
  let out = String(code);
  out = out.replace(new RegExp(`(\\?\\.|\\.)${a}(?![\\w$])(?!\\s*=(?!=))`, "g"), `$1${real}`);
  out = out.replace(new RegExp(`\\[\\s*(["'\`])${a}\\1\\s*\\](?!\\s*=(?!=))`, "g"), `[$1${real}$1]`);
  const fixPattern = (body) => body.split(",").map((part) => {
    const t = part.trim();
    if (t === asked) return part.replace(asked, `${real}: ${asked}`);
    const k = t.match(/^([A-Za-z_$][\w$]*)\s*:\s*(.+)$/s);
    if (k && k[1] === asked) return part.replace(new RegExp(`${a}(\\s*:)`), `${real}$1`);
    return part;
  }).join(",");
  out = out.replace(/\b(const|let|var)(\s*)\{([^{}]*)\}(\s*=)/g, (m, kw, sp, body, eq) => `${kw}${sp}{${fixPattern(body)}}${eq}`);
  out = out.replace(/(function\s+[A-Za-z_$][\w$]*\s*\(\s*)\{([^{}]*)\}/g, (m, head, body) => `${head}{${fixPattern(body)}}`);
  return out;
}

/**
 * canonicalize(suggestion, { resolutions, cardNames, declared }) -> { schema, code, changed, transformations, findings }
 *   resolutions  what the wall recorded when it READ the suggestion against the received object ({ asked, real, basis, tier }); key-referents.js
 *   offered      the operations the prompt gave the model: a unit that declares one of them again has its own version dropped (dropShadowedCards)
 *   declared     names declared OUTSIDE this suggestion that it may call (the other units of the same file): a call to one is never a free call, so it is neither resolved to a card nor a finding
 * Nothing is deleted from the suggestion that the transformations do not name.
 */
export function canonicalize(suggestion, { resolutions = [], cardNames = CARD_NAMES, declared: elsewhere = [], offered = [] } = {}) {
  const input = String(suggestion ?? "");
  let code = input;
  const transformations = [], findings = [];

  const sh = dropShadowedCards(code, offered);
  for (const name of sh.names) transformations.push({ kind: "card_shadow_dropped", name, basis: `the unit declared its own \`${name}\`, an operation it was given; the given one is written and checked once` });
  code = sh.code;

  const re = redeclaredToAssignment(code);
  for (const name of re.names) transformations.push({ kind: "redeclared_to_assignment", name, basis: "declared twice in one scope, which does not compile; the later declaration is read as the assignment it was meant to be" });
  code = re.code;

  for (const v of constReassigned(code)) {
    const re = new RegExp(`\\bconst(\\s+${esc(v)}\\s*=)`, "g");
    if (re.test(code)) { code = code.replace(new RegExp(`\\bconst(\\s+${esc(v)}\\s*=)`, "g"), "let$1"); transformations.push({ kind: "const_to_let", name: v, basis: "assigned again later in the function; the program throws as written" }); }
  }

  const declared = new Set([...declaredIn(code), ...elsewhere]), present = cardNames.filter((n) => !declared.has(n));
  for (const asked of freeCalls(code)) {
    if (declared.has(asked)) continue;
    const r = resolveCard(asked, present);
    if (r.resolved) {
      code = code.replace(new RegExp(`(?<![.\\w$])${esc(asked)}(?=\\s*\\()`, "g"), r.real);
      transformations.push({ kind: "call_resolved", from: asked, to: r.real, tier: r.tier, basis: r.basis });
    } else if (r.ambiguous) findings.push({ kind: "ambiguous_call", name: asked, candidates: r.candidates });
    else findings.push({ kind: "unresolved_call", name: asked, near: r.near ?? [] });
  }

  for (const r of resolutions) {
    if (!r || r.kind === "card" || !r.real || r.ambiguous || r.asked === r.real) continue;
    const before = code;
    code = rewriteKey(code, r.asked, r.real);
    if (code !== before) transformations.push({ kind: "key_resolved", from: r.asked, to: r.real, tier: r.tier ?? null, basis: r.basis ?? null });
  }

  return { schema: CANONICAL_SCHEMA, code, changed: code !== input, transformations, findings };
}

/** A transformation is adopted only where the canonical code does at least as well as the suggestion did. `score` = runs passed (higher is better). */
export function adoptIf(rawScore, canonicalScore) {
  return canonicalScore >= rawScore;
}
