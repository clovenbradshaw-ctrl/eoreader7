// native/organs/claim-deriver.js — THE SECOND SONNET STARTS AS A LOOKUP,
// NOT A HUNT (2026-09-25). The user: "i want claude's model to be prompted
// with as little as possible with eoreader7 doing as much of the reasoning
// as possible" — and, on the mechanical-shortcuts design workflow's own
// synthesis, the one design that gives relief starting on a FIRST
// occurrence rather than after a corroboration history builds up (unlike
// extending native/kernel/corroboration.js's SIG/CON acts to claim shapes,
// deliberately deferred to a later slice — see this file's own git history
// / CODING-LESSONS.md for that design's full reasoning).
//
// This is a MECHANICAL CONSTRUCTOR, upstream of cli/reason.mjs's own
// reasoning core, never a replacement for it. Given an Edit's own
// old_string/new_string, it recognizes exactly two narrow, honestly-scoped
// diff shapes — a clean identifier rename, a clean literal-value change —
// by tokenizing both sides and diffing at the TOKEN level (never a line
// diff, never an AST: a bounded LCS over a hand-rolled lexer, see tokenize
// below). Recognized, it builds the claims JSON spec Claude would otherwise
// hand-author — always force:"default" (a descriptive, testimony-shaped
// claim; NEVER "strict", which is a semantic guarantee this mechanism has
// no basis to assert) — for cli/claude-code-steer.mjs to still run through
// cli/reason.mjs's REAL lintGfp+falsifyGfp, unchanged. Anything this file
// cannot cleanly classify returns status:"ambiguous" with a reason and
// falls straight through to today's hand-authoring flow — refusing to
// guess is the safety property this whole mechanism depends on; see
// tests/claim-deriver.test.mjs's own adversarial cases (a bundled
// rename+logic change, a multi-region diff, an oversized diff) for what
// "ambiguous" actually covers.
//
// fingerprintOf, below, is a SEPARATE, independent export: a stable digest
// over ANY claim's structural shape (rel, role names, polarity, force, its
// declared functional/symmetric/acyclic flags, a ground template) — never a
// role value or literal path. It is telemetry only in this first slice
// (cli/reason.mjs tags every persisted claim, derived or hand-authored,
// with it) — nothing reads it back yet to change any gate's behavior. A
// later, explicitly deferred slice would extend
// native/kernel/corroboration.js's already domain-blind SIG/CON acts (the
// same module native/the-fold/kind-memory.js already uses for poem forms)
// to this fingerprint, once real multi-session history exists to learn
// from — and even then, per the design's own stated constraint, that
// history should only ever inform a HUMAN adding a new template to
// classify() below via a normal reviewed, tested commit, never an
// autonomously-expanding runtime store.
import crypto from "node:crypto";

// ── TOKENIZE ─────────────────────────────────────────────────────────────
// A hand-rolled lexer, not a full parser: string literals (any of "/'/`,
// escape-aware), decimal numbers, identifiers, whitespace RUNS (one token,
// so reformatting inside a run still shows as a single changed token, not
// noise), and any other single character as its own token (operators,
// punctuation). `String.prototype.match` with a global flag never throws
// on unusual input — there is no "unparseable" input for this tokenizer;
// what can still be ambiguous is the SHAPE of the resulting diff, handled
// in classify() below.
const TOKEN_RE = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\d+\.\d+|\d+|[A-Za-z_$][A-Za-z0-9_$]*|\s+|./gs;
export function tokenize(str) {
  return String(str ?? "").match(TOKEN_RE) ?? [];
}

// ── DIFF ─────────────────────────────────────────────────────────────────
// A bounded LCS over the token arrays (classic O(n·m) DP + backtrace).
// BOUNDED: n·m above 4,000,000 (e.g. two ~2000-token sides) returns null
// rather than diffing — an engineering size guard against a pathological
// huge Edit, disclosed exactly like claude-code-ledger.mjs's own EXCERPT
// constant; not a scientific/similarity threshold this repo's "no hand-set
// thresholds" policy is aimed at (nothing here judges whether a pattern is
// REAL — it only bounds how much work one diff may do). A real Edit's
// old_string/new_string is ordinarily tens to a few hundred tokens, so this
// essentially never fires in practice.
export function diffTokens(oldToks, newToks) {
  const n = oldToks.length, m = newToks.length;
  if (n * m > 4_000_000) return null;
  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = oldToks[i] === newToks[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (oldToks[i] === newToks[j]) { ops.push({ type: "equal", old: oldToks[i], new: newToks[j] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: "delete", old: oldToks[i] }); i++; }
    else { ops.push({ type: "insert", new: newToks[j] }); j++; }
  }
  while (i < n) { ops.push({ type: "delete", old: oldToks[i] }); i++; }
  while (j < m) { ops.push({ type: "insert", new: newToks[j] }); j++; }
  return ops;
}

/** Consecutive non-"equal" ops collapse into one changed REGION, pairing
 *  what was deleted against what was inserted at that position. Two
 *  regions separated by even one "equal" token stay two regions — this is
 *  deliberately strict: a rename bundled with an unrelated change two
 *  tokens away must read as MORE THAN ONE region, not get merged away. */
function groupOps(ops) {
  const groups = [];
  let i = 0;
  while (i < ops.length) {
    if (ops[i].type === "equal") { i++; continue; }
    const oldPart = [], newPart = [];
    while (i < ops.length && ops[i].type !== "equal") {
      if (ops[i].type === "delete") oldPart.push(ops[i].old); else newPart.push(ops[i].new);
      i++;
    }
    groups.push({ oldTokens: oldPart, newTokens: newPart });
  }
  return groups;
}

const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const STRING_RE = /^["'`]/;
const NUMBER_RE = /^\d/;
// FOUND BY ADVERSARIAL TESTING (2026-09-25, the falsification pass the
// user asked for after this file was built): true/false/null/undefined
// lex as bare identifiers under IDENT_RE — nothing distinguishes them from
// a real variable name at the regex level — so "if (x) return true;" -> "…
// return false;" was classifying as kind:"identifier-rename", producing a
// claim that literally SAID "true renamed to false". Nothing was renamed;
// a boolean return was flipped. Not a safety hole (force is still always
// "default", every derived claim still runs a real reason.mjs check, and
// this mechanism never claimed semantic safety for identifier-rename
// either — an "isValid" -> "isInvalid" rename is just as semantically
// loaded and was always allowed) — but the LABEL was dishonest, and this
// repo's own standing discipline is to disclose accurately, never round
// up. Fixed below: both sides being a keyword literal reclassifies as
// "literal-change" (an honest description); ONE side being a keyword
// literal and the other a real identifier — a true kind-crossing change,
// e.g. "x" -> "true" — is ambiguous, the same refusal already given to
// any other kind-crossing swap.
const KEYWORD_LITERALS = new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]);

/**
 * classify(oldString, newString) -> one of:
 *   {status:"derived", kind:"identifier-rename", oldToken, newToken}
 *   {status:"derived", kind:"literal-change", oldToken, newToken}
 *   {status:"ambiguous", reason, evidence}
 *
 * DERIVED only when the token-level diff has EXACTLY ONE changed region,
 * that region is exactly one token on each side, and both tokens are the
 * SAME kind (both bare identifiers, or both string literals, or both
 * number literals). Every other shape — zero regions (no real diff),
 * multiple regions (more than one thing changed), a multi-token region, a
 * kind-crossing change (e.g. a string literal replaced by an identifier) —
 * is ambiguous. This is a real structural equality test over the diff's
 * own shape, never a similarity score: there is nothing to tune.
 */
export function classify(oldString, newString) {
  const oldToks = tokenize(oldString), newToks = tokenize(newString);
  const ops = diffTokens(oldToks, newToks);
  if (ops === null) return { status: "ambiguous", reason: "too large to diff safely", evidence: { oldTokenCount: oldToks.length, newTokenCount: newToks.length } };
  const groups = groupOps(ops);
  if (groups.length === 0) return { status: "ambiguous", reason: "no token-level difference found", evidence: {} };
  if (groups.length > 1) return { status: "ambiguous", reason: `${groups.length} separate changed regions — more than one template can explain this edit`, evidence: { regions: groups.length } };
  const [g] = groups;
  if (g.oldTokens.length !== 1 || g.newTokens.length !== 1) {
    return { status: "ambiguous", reason: "the one changed region isn't a single token on each side", evidence: { oldTokens: g.oldTokens, newTokens: g.newTokens } };
  }
  const [oldTok] = g.oldTokens, [newTok] = g.newTokens;
  if (IDENT_RE.test(oldTok) && IDENT_RE.test(newTok)) {
    const oldKw = KEYWORD_LITERALS.has(oldTok), newKw = KEYWORD_LITERALS.has(newTok);
    if (oldKw && newKw) return { status: "derived", kind: "literal-change", oldToken: oldTok, newToken: newTok };
    if (oldKw || newKw) return { status: "ambiguous", reason: "one side is a keyword literal (true/false/null/undefined) and the other a real identifier — not a clean rename or a clean literal change", evidence: { oldToken: oldTok, newToken: newTok } };
    return { status: "derived", kind: "identifier-rename", oldToken: oldTok, newToken: newTok };
  }
  const bothStrings = STRING_RE.test(oldTok) && STRING_RE.test(newTok);
  const bothNumbers = NUMBER_RE.test(oldTok) && NUMBER_RE.test(newTok);
  if (bothStrings || bothNumbers) return { status: "derived", kind: "literal-change", oldToken: oldTok, newToken: newTok };
  return { status: "ambiguous", reason: "the single changed token isn't a clean identifier-to-identifier or literal-to-literal change", evidence: { oldToken: oldTok, newToken: newTok } };
}

/**
 * deriveClaimSpec(filePath, oldString, newString) -> classify()'s own
 * ambiguous shape unchanged, or {status:"derived", kind, spec} where `spec`
 * is a ready-to-run cli/reason.mjs input: one claim, ground = filePath,
 * force ALWAYS "default" (a hard invariant — see tests/claim-deriver.test.mjs
 * for the explicit check that no classify() outcome can ever produce
 * "strict" here), tagged `derivedBy:"claim-deriver"` so cli/reason.mjs can
 * record its real provenance in the durable ledger.
 */
export function deriveClaimSpec(filePath, oldString, newString) {
  const c = classify(oldString, newString);
  if (c.status !== "derived") return c;
  const said = c.kind === "identifier-rename"
    ? `${filePath}: ${c.oldToken} renamed to ${c.newToken} — a clean identifier-only change; nothing else in this edit differs at the token level`
    : `${filePath}: literal value ${c.oldToken} changed to ${c.newToken} — a clean literal-only change; nothing else in this edit differs at the token level`;
  return {
    status: "derived",
    kind: c.kind,
    spec: {
      claims: [{ ground: filePath, rel: c.kind, roles: { ARG0: c.oldToken, ARG1: c.newToken }, polarity: "+", force: "default", said, derivedBy: "claim-deriver" }],
      text: said,
    },
  };
}

// ── FINGERPRINT (telemetry only in this slice) ──────────────────────────
/** True iff `declare`'s functional/symmetric/acyclic entry list names
 *  `rel` — an entry is either a bare rel string, or {rel, role, giver} per
 *  cli/reason.mjs's own documented input shape (its header comment: "declare":
 *  { "functional": [rel | {rel, role, giver}], ... }). */
function declaresRel(list, rel) {
  return (list ?? []).some((entry) => (typeof entry === "string" ? entry === rel : entry?.rel === rel));
}

/**
 * fingerprintOf(claim, declare) -> a 16-hex-char sha1 digest over the
 * claim's STRUCTURAL shape: rel, sorted role NAMES (never values),
 * polarity, force, whether THIS rel is declared functional/symmetric/
 * acyclic (booleans, not which role — a coarser but honest first cut), and
 * a ground TEMPLATE (every path segment replaced by one placeholder, so
 * depth is part of the shape but the literal path is not). Two claims for
 * different files, or with different role VALUES, but the same shape,
 * fingerprint identically; a different rel, a different role-name set, a
 * different force, or a different declared property changes it. Exact
 * structural equality, never a similarity score — there is nothing to
 * tune, so this needs no measured null the way a real detection threshold
 * would.
 */
export function fingerprintOf(claim, declare = {}) {
  const rel = String(claim?.rel ?? "");
  const roleNames = Object.keys(claim?.roles ?? {}).sort();
  const groundTemplate = "/" + String(claim?.ground ?? "/").split("/").filter(Boolean).map(() => "*").join("/");
  const shape = JSON.stringify({
    rel, roleNames, polarity: claim?.polarity ?? "+", force: claim?.force ?? "default",
    functional: declaresRel(declare.functional, rel),
    symmetric: declaresRel(declare.symmetric, rel),
    acyclic: declaresRel(declare.acyclic, rel),
    groundTemplate,
  });
  return crypto.createHash("sha1").update(shape).digest("hex").slice(0, 16);
}
