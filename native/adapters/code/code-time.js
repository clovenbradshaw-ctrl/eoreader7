// adapters/code/code-time.js — PARTEE'S ORGAN OVER CODE. The same kernel
// competency built for narrative (kernel/temporal-reference.js: a time
// individuated, a reference ground advanced, a tense resolved back to the
// ground that precedes it) reads a program: a DECLARATION establishes a
// binding's time and advances that name's ground; a REFERENCE resolves
// against the name's live grounds through resolveAnaphoricTense; a use
// before its declaration is the organ's own typed `no_candidate` — the
// program's pluperfect with nothing to reach back to.
//
// WHY THIS EXISTS (user, 2026-09-25): "be sure that our competency in
// ANYTHING can help us comprehend ANYTHING regardless of modality." The
// referred-time organ was wired into text three times today and never
// moved under sentence reversal: too few pluperfects survive a parser, and
// a reversed narrative still binds every past to the ground before it.
// Code is the modality where the same move is unmissable. Definition
// precedes use; reverse the statements and the organ must land gaps.
// Nothing in kernel/temporal-reference.js is changed or specialised here;
// this adapter only says what a statement, a declaration and a reference
// are in JavaScript.
//
// WHAT IS SAID PLAINLY. Statements are lines (a disclosed, coarse cut —
// no parser); a declaration is `let|const|var|function|class <name>` or a
// named import; a reference is any later identifier equal to a declared
// name that is not a keyword (the keyword list is a received prior,
// priors/code-kw-js.json, never a list of this file's own). Hoisting
// (function declarations usable before their line) is real JavaScript and
// would make some forward gaps legitimate; this walk reads source ORDER,
// as a reader does, and says so — a hoisted use counts as a gap here,
// which is a fact about reading order, not a claim about the runtime.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { establishTime, advanceReferenceGround, resolveAnaphoricTense } from "../../kernel/temporal-reference.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SCHEMA = "EOCodeTime@1";

/** The received JavaScript keyword prior, whatever shape it ships in — refused if none is found. */
export function loadKeywords(p = path.join(HERE, "..", "..", "priors", "code-kw-js.json")) {
  const raw = JSON.parse(readFileSync(p, "utf8"));
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.keywords) ? raw.keywords : raw.forms ? Object.keys(raw.forms) : raw.words ? Object.keys(raw.words) : null;
  if (!list || !list.length) throw new TypeError(`loadKeywords: no keyword list found in ${p} — a keyword class from nowhere is a guess`);
  return new Set(list.map((k) => String(k).toLowerCase()));
}

const IDENT = /[A-Za-z_$][\w$]*/g;
const DECL = /\b(?:let|const|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/g;
const IMPORT = /\bimport\s*\{([^}]*)\}|\bimport\s+([A-Za-z_$][\w$]*)\s+from/g;

/** statementsOf(text) → [{ id, at: [start, end], text, declares: [names], mentions: [names] }] — one per non-empty line. */
export function statementsOf(text, keywords) {
  const out = [];
  let off = 0, n = 0;
  for (const line of String(text ?? "").split("\n")) {
    const start = off; off += line.length + 1;
    const t = line.replace(/\/\/.*$/, "");
    if (!t.trim()) continue;
    const declares = new Set();
    for (const m of t.matchAll(DECL)) declares.add(m[1]);
    for (const m of t.matchAll(IMPORT)) {
      if (m[1]) for (const part of m[1].split(",")) { const name = part.trim().split(/\s+as\s+/).pop(); if (name) declares.add(name); }
      if (m[2]) declares.add(m[2]);
    }
    const mentions = [];
    for (const m of t.matchAll(IDENT)) if (!keywords.has(m[0].toLowerCase()) && !declares.has(m[0])) mentions.push({ name: m[0], at: start + m.index });
    out.push({ id: `s${++n}`, at: [start, start + line.length], text: line, declares: [...declares], mentions });
  }
  return out;
}

/**
 * codeTime(statements, { names })
 *   statements  in the order to be read (forward, reversed, shuffled — the
 *               caller's arrangement; `at` stays the source's own address,
 *               the CLOCK is the reading position)
 *   names       the set of names declared anywhere in the file — a mention
 *               of any other identifier is not a reference to a binding
 * Returns frozen { times, grounds, resolutions, counts } — every object
 * inside is temporal-reference.js's own, untouched.
 */
export function codeTime(statements, { names } = {}) {
  const declared = names ?? new Set(statements.flatMap((s) => s.declares));
  const groundsBy = new Map(); // name → [grounds], each name its own referent chain
  const currentBy = new Map();
  const times = [], grounds = [], resolutions = [];
  const counts = { declarations: 0, references: 0, bound: 0, no_candidate: 0, adjudicated: 0, superseded: 0 };
  let clock = 0, n = 0;
  for (const s of statements) {
    clock += 1;
    // references first: a use on the same line as its declaration (`const x = x`) is a use before
    for (const m of s.mentions) {
      if (!declared.has(m.name)) continue;
      counts.references += 1;
      const r = resolveAnaphoricTense(clock, groundsBy.get(m.name) ?? []);
      resolutions.push(Object.freeze({ ...r, name: m.name, statement: s.id, at: m.at, clock }));
      counts[r.verdict === "bound" ? "bound" : r.verdict === "no_candidate" ? "no_candidate" : "adjudicated"] += 1;
    }
    for (const name of s.declares) {
      counts.declarations += 1;
      n += 1;
      const t = establishTime({ id: `t${n}`, at: clock, key: `${name}@${s.id}` });
      const from = currentBy.get(name) ?? null;
      const g = advanceReferenceGround({ id: `g${n}`, at: clock, timeId: t.id, from });
      if (from) counts.superseded += 1;
      times.push(Object.freeze({ ...t, name, statement: s.id, sourceAt: s.at }));
      grounds.push(g);
      if (!groundsBy.has(name)) groundsBy.set(name, []);
      groundsBy.get(name).push(g);
      currentBy.set(name, g);
    }
  }
  return Object.freeze({ schema: SCHEMA, times: Object.freeze(times), grounds: Object.freeze(grounds), resolutions: Object.freeze(resolutions), counts: Object.freeze(counts), names: [...declared].sort() });
}
