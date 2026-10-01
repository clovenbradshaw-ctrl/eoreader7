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

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
 *   declared     names declared OUTSIDE this suggestion that it may call (the other units of the same file): a call to one is never a free call, so it is neither resolved to a card nor a finding
 * Nothing is deleted from the suggestion that the transformations do not name.
 */
export function canonicalize(suggestion, { resolutions = [], cardNames = CARD_NAMES, declared: elsewhere = [] } = {}) {
  const input = String(suggestion ?? "");
  let code = input;
  const transformations = [], findings = [];

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
