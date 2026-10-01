// lib/name-forms-eval.mjs — the held-out audit of a name-form prior: type-level gold, the score, and the controls built to fail.
// Handle: LaVar (the held-out split discipline: tallies from TRAIN, the swarm scored on DEV, the report on TEST; a gold is a witness read
// after the model is fixed, never the fitness it is tuned on — sullivan-morph.mjs's header, the same law).
//
// THE UNIT IS A TYPE. A page meets "Bush's" and "Anna's" as written forms, not as tokens in a corpus, and a handful of frequent names must not
// be able to carry a rule: every distinct folded written word of a split is ONE scored item, with the gold stem its own tokens agree on (a
// type whose tokens disagree evenly is dropped and counted — `dropped.ambiguous` — never settled by a coin). The TALLIES are tokens (the
// treebank's own distribution, ambiguity preserved, as build-latin-case-prior.mjs and the POS prior hold it); what is scored is types.
//
// WHAT THE GOLD SAYS TO DO, and what it does not decide. A name's gold stem is the written word minus the exponent the treebank's own
// annotation gives it, and ONLY when that exponent's class keeps the referent — a clitic or a case ending. A plural ("Iraqis", lemma Iraqi,
// Number=Plur) is a group, not the individual, so its gold is "leave alone": stripping it would join a group to its member. That is a
// semantic declaration (name-forms.js: PRESERVING), made once with its reason, NOT a coordinate the swarm may search — the lemma of a plural
// IS its singular, so a fitness that scored stem recovery alone would reward the wrong choice and no amount of data could correct it.
//
// THE SCORE. A = of the types the prior changed, how many it changed to exactly the gold stem; C = of the types the gold changes, how many
// the prior changed to the gold stem; H = their harmonic mean (2AC/(A+C)) — no coverage gate to set, and no agreement-only degenerate (a
// prior that refuses everything scores ~0 through C), the contract sanskrit-swarm.mjs holds. The components ride every result and are never
// hidden inside the mean. `falseStrips` (the prior changed a word whose gold is to leave it) is a strip that would join what the gold keeps apart, and is
// reported apart from `wrongStrips` (changed, but not to the gold).
//
// THE CONTROLS ARE BUILT TO FAIL (eo-constitution II.23): a prior learned from SHUFFLED labels (the word-to-label pairing destroyed, label
// marginals kept) at the champion's own operating point must score ~0; "strip a final s" is a rule with no language in it and must be
// refused by the false strips it makes; and the typed English route this replaces (identity-routes.js, S137) is run as the incumbent on every language,
// so what was typed for English is measured as a special case of what is learned, not assumed to be the whole.
//
// PURE. Text in, numbers out; a driver reads the files.
import { parseConllu } from "../../../kernel/eot-rich.js";
import { nameWords } from "./ud-name-words.mjs";
import { foldWord, tallyForms, foldedStem, compile, ruleMap, PRESERVING } from "../../../adapters/text/name-forms.js";
import { stripPossessive, isRomanNumeral } from "../../../adapters/text/surfaces.js";
import { lastTokenFold } from "../../../organs/identity-routes.js";
import { mulberry32 } from "./swarm-search.mjs";

const cp = (s) => Array.from(s);

/** readTreebank(conlluText) → { rows, sentences, skipped } — every name word of a treebank (ud-name-words.mjs), and how many sentences would not align. */
export function readTreebank(text) {
  const sents = parseConllu(text);
  const rows = [];
  let skipped = 0;
  for (const s of sents) {
    const r = nameWords(s);
    if (!r) { skipped += 1; continue; }
    for (const x of r) rows.push(x);
  }
  return { rows, sentences: sents.length, skipped };
}

/**
 * explainRows(rows, classes) → { nameWords, preservingSuffix, preservingPrefix, number, other } — how much of a language's name inflection the
 * suffix-and-prefix account explains. `other` is inflection the account cannot express (a stem that alternates: Finnish "Helsingissä" /
 * "Helsinki"; a lemma the annotators normalised) — counted and kept out of the labels, never forced into one.
 */
export function explainRows(rows, classes = PRESERVING) {
  const e = { nameWords: rows.length, preservingSuffix: 0, preservingPrefix: 0, number: 0, other: 0 };
  for (const r of rows) {
    if (r.other) { e.other += 1; continue; }
    if (r.suffix) { if (classes.includes(r.klass)) e.preservingSuffix += 1; else e.number += 1; }
    if (r.prefix && classes.includes(r.prefixKlass)) e.preservingPrefix += 1;
  }
  return e;
}

/**
 * goldTypes(rows, classes) → { types, dropped, tokens } — the scored items. Each type: { folded, word, count, goldStem } with `goldStem` the
 * folded stem the gold leaves (the folded word itself when the gold says leave alone). A type is DROPPED, and counted, when its tokens split
 * evenly between two golds (`ambiguous`) or its exponent does not stand where the annotation says (`unreadable`); `other` rows never enter.
 */
export function goldTypes(rows, classes = PRESERVING) {
  const byWord = new Map();
  let tokens = 0;
  for (const r of rows) {
    if (r.other) continue;
    tokens += 1;
    const f = foldWord(r.word);
    let rec = byWord.get(f);
    if (!rec) byWord.set(f, (rec = { word: r.word, votes: new Map(), count: 0 }));
    const sx = r.suffix && classes.includes(r.klass) ? foldWord(r.suffix) : "";
    const px = r.prefix && classes.includes(r.prefixKlass) ? foldWord(r.prefix) : "";
    const key = `${px}\u0001${sx}`;
    rec.votes.set(key, (rec.votes.get(key) ?? 0) + 1);
    rec.count += 1;
  }
  const types = [];
  const dropped = { ambiguous: 0, unreadable: 0 };
  for (const [folded, rec] of byWord) {
    const ranked = [...rec.votes].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
    if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) { dropped.ambiguous += 1; continue; }
    const [px, sx] = ranked[0][0].split("\u0001");
    if ((sx && !folded.endsWith(sx)) || (px && !folded.startsWith(px)) || (sx && px && cp(folded).length <= cp(sx).length + cp(px).length)) { dropped.unreadable += 1; continue; }
    const w = cp(folded);
    const goldStem = w.slice(cp(px).length, w.length - cp(sx).length).join("");
    types.push({ folded, word: rec.word, count: rec.count, goldStem });
  }
  return { types, dropped, tokens };
}

/**
 * scoreWith(types, predict) → { H, A, C, issued, correct, gold, falseStrips, wrongStrips, types } — `predict(foldedWord)` returns the folded
 * stem a route leaves. A, C and H are null where undefined (nothing issued; nothing for the gold to change) — never 0 standing in for "not
 * measured". `fitness` below turns a null H into 0 for the colony, because a point that recovers nothing is a point that scores nothing.
 */
export function scoreWith(types, predict) {
  let issued = 0, correct = 0, gold = 0, falseStrips = 0, wrongStrips = 0;
  for (const t of types) {
    const pred = predict(t.folded);
    const goldChanges = t.goldStem !== t.folded;
    if (goldChanges) gold += 1;
    if (pred !== t.folded) {
      issued += 1;
      if (pred === t.goldStem) correct += 1;
      else if (!goldChanges) falseStrips += 1;
      else wrongStrips += 1;
    }
  }
  const A = issued ? correct / issued : null;
  const C = gold ? correct / gold : null;
  const H = A !== null && C !== null && A + C > 0 ? (2 * A * C) / (A + C) : gold ? 0 : null;
  return { H, A, C, issued, correct, gold, falseStrips, wrongStrips, types: types.length };
}

/** The score of a table pair at an operating point. */
export const scoreAt = (types, tables, op) => scoreWith(types, (w) => foldedStem(w, tables, op));

/** The colony's fitness over a split: H, with a null (no gold to recover) counted as 0. */
export const fitnessOf = (types, tables, classes = PRESERVING) => (cfg) => {
  const r = scoreAt(types, tables, { ...cfg, classes });
  return { f: r.H ?? 0, ...r };
};

// ── THE CONTROLS ──────────────────────────────────────────────────────────

/** "Strip a final s" — a rule with no language in it. */
export const finalSScore = (types) => scoreWith(types, (w) => (cp(w).length > 2 && w.endsWith("s") ? w.slice(0, -1) : w));

/**
 * The typed English route this prior replaces (identity-routes.js, S137): the engine's apostrophe strip on the LAST token, with its own
 * two-letter floor. Run on every language as the incumbent; on a language that writes no apostrophe clitic it simply never fires, which is
 * the measurement ("what was typed for English is a special case").
 */
export function typedRoutePredict() {
  const fold = lastTokenFold(stripPossessive, { isNumeral: isRomanNumeral });
  return (w) => foldWord(fold(w));
}
export const typedRouteScore = (types) => scoreWith(types, typedRoutePredict());

/**
 * shuffledTables(rows, { maxK, seed }) → tables — the tallies of the same rows with the word-to-label pairing destroyed (label tuples
 * permuted among the readable rows, marginals kept). A prior learned from these must score ~0 at any operating point: if it does not, the
 * score is reading something other than the pairing and no number here means what it says.
 */
export function shuffledTables(rows, { maxK = 4, seed = 42 } = {}) {
  const readable = rows.filter((r) => !r.other);
  const labels = readable.map((r) => ({ suffix: r.suffix, klass: r.klass, prefix: r.prefix, prefixKlass: r.prefixKlass }));
  const rng = mulberry32(seed);
  for (let i = labels.length - 1; i > 0; i -= 1) { const j = Math.floor(rng() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; }
  return tallyForms(readable.map((r, i) => ({ word: r.word, other: false, ...labels[i] })), { maxK });
}

/**
 * compileCheck(types, tables, op) → { equivalent, types, differing } — the compiled rule lists must answer every type the way the full table
 * does (compile() drops only rules that repeat their parent). The prior stores the rules, so this is what makes a stored prior the thing
 * that was measured.
 */
export function compileCheck(types, tables, op) {
  const rules = compile(tables, op);
  const compiled = { suffix: ruleMap(rules.suffix), prefix: ruleMap(rules.prefix) };
  let differing = 0;
  for (const t of types) if (foldedStem(t.folded, tables, op) !== foldedStem(t.folded, compiled, op)) differing += 1;
  return { equivalent: differing === 0, types: types.length, differing, rules };
}

/**
 * errorsAt(types, predict, limit) → { falseStrips, wrongStrips, misses } — the most frequent items of each kind of error, so a reader sees WHAT
 * is wrong and not only how often. falseStrip: changed a word the gold leaves alone; wrongStrip: changed it to something else; miss: left a
 * word the gold changes.
 */
export function errorsAt(types, predict, limit = 6) {
  const falseStrips = [], wrongStrips = [], misses = [];
  for (const t of types) {
    const pred = predict(t.folded);
    const goldChanges = t.goldStem !== t.folded;
    if (pred !== t.folded) {
      if (pred === t.goldStem) continue;
      (goldChanges ? wrongStrips : falseStrips).push({ word: t.word, predicted: pred, gold: t.goldStem, count: t.count });
    } else if (goldChanges) misses.push({ word: t.word, gold: t.goldStem, count: t.count });
  }
  const top = (a) => a.sort((x, y) => y.count - x.count || (x.word < y.word ? -1 : 1)).slice(0, limit);
  return { falseStrips: top(falseStrips), wrongStrips: top(wrongStrips), misses: top(misses) };
}

/**
 * pairedOutcomes(types, predictA, predictB) → { aOnly, bOnly, both, neither, p } — on the SAME types, where two routes agree and where they
 * differ. A route is right on a type when it leaves the gold stem (changing a word the gold changes, leaving one it leaves). `aOnly` is the
 * types A gets right and B wrong; `p` is the exact two-sided McNemar probability of a split at least this uneven among the types they
 * disagree on, if neither route were better (a sign test, the binomial at one half). A decision to REPLACE an incumbent rests on this, not on a
 * difference of two scores that a single type can flip.
 */
export function pairedOutcomes(types, predictA, predictB) {
  let aOnly = 0, bOnly = 0, both = 0, neither = 0;
  for (const t of types) {
    const a = predictA(t.folded) === t.goldStem, b = predictB(t.folded) === t.goldStem;
    if (a && b) both += 1; else if (a) aOnly += 1; else if (b) bOnly += 1; else neither += 1;
  }
  const n = aOnly + bOnly, k = Math.min(aOnly, bOnly);
  let tail = 0, c = 1;
  for (let i = 0; i <= k; i += 1) { tail += c; c = (c * (n - i)) / (i + 1); }
  const p = n === 0 ? 1 : Math.min(1, (2 * tail) / 2 ** n);
  return { aOnly, bOnly, both, neither, p };
}
