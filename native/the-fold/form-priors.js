// form-priors.js — LEARNED PRIORS FOR THE SHAPE OF COMMON THINGS, FOLDED
// FROM AN APPEND-ONLY LOG (2026-09-24).
//
// The user: "no hardcoding of output formats, though we can learn in priors
// the shape of common things so we dont have to learn again on the fly,
// similar to a claude skill, but ours are folded from an append-only log so
// they're revisable." No form's shape is hand-typed anywhere in this file —
// contrast canonical-sections.js's own WHITE_PAPER_SECTIONS, which is a
// DECLARED prior and says so in its own header. Every line this module ever
// writes is a real, dated observation some other organ actually MEASURED
// (today: huntDeclaredStructure's own live, host-corroborated hunt) — never
// a guess, never typed by a person. The log is never overwritten or pruned:
// a fold is always re-derived from the WHOLE history on every call, so a
// prior that turns out wrong is outvoted by better evidence over time,
// never silently deleted — the same "supersedes, never edits" discipline
// document-ledger.js uses for a piece's own drafts, applied here to what the
// engine knows about a FORM across every run that ever measured one.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FORM_PRIORS_LOG = process.env.ER7_FORM_PRIORS_LOG ?? path.join(HERE, "form-priors.jsonl");

const normForm = (form) => String(form ?? "").trim().toLowerCase();

/**
 * appendFormObservation({ form, vocabulary, pagesUsed, hostsUsed, sources,
 *   basis, giver }) — one real, dated measurement of a form's structure,
 * appended as a new JSONL line. Never overwrites a prior line for the same
 * form; two observations of "white paper" are two lines, not one mutated
 * record. Swallows a write failure (never crashes the caller's turn — same
 * discipline as content-rules.mjs). Returns the entry written, or null if
 * there was nothing real to log.
 */
export function appendFormObservation({ form, vocabulary = null, pagesUsed = null, hostsUsed = null, sources = null, basis = null, giver = "huntDeclaredStructure" } = {}) {
  if (!form || !vocabulary || !vocabulary.length) return null;
  const entry = { form: normForm(form), vocabulary, pagesUsed, hostsUsed, sources, basis, giver, at: Date.now() };
  try { fs.appendFileSync(FORM_PRIORS_LOG, JSON.stringify(entry) + "\n"); } catch { /* never crashes the turn */ }
  return entry;
}

/** readFormObservations(form) — every real observation on record for this
 *  form, oldest first, the complete unpruned history. A fold's own input;
 *  callers needing the raw evidence (not just the fold) read this. */
export function readFormObservations(form) {
  const key = normForm(form);
  let lines;
  try { lines = fs.readFileSync(FORM_PRIORS_LOG, "utf8").split("\n").filter(Boolean); }
  catch { return []; }
  const out = [];
  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch { continue; } // a corrupt line is skipped, never fatal
    if (e?.form === key) out.push(e);
  }
  return out;
}

/**
 * foldFormPrior(form, { minObservations = 1 } = {}) — the current
 * best-supported structure for a form, folded from EVERY observation on
 * record, recomputed fresh every call (never a cached snapshot). A role
 * that recurs across multiple SEPARATE observations outranks one seen in a
 * single observation; support accumulates, it is never averaged away. null
 * when fewer than `minObservations` real observations exist — an unfolded
 * form states its own absence, it is never guessed into existing.
 */
export function foldFormPrior(form, { minObservations = 1 } = {}) {
  const obs = readFormObservations(form);
  if (obs.length < minObservations) return null;
  const byRole = new Map();
  for (const o of obs) {
    for (const v of o.vocabulary ?? []) {
      if (v.role === "title") continue;
      const s = byRole.get(v.role) ?? { role: v.role, observations: 0, hostSupport: 0, order: v.order, lastSeenAt: 0, exampleText: v.exampleText ?? v.role };
      s.observations += 1;
      s.hostSupport += Number(v.corroboratedBy ?? 1);
      if (o.at >= s.lastSeenAt) { s.order = v.order; s.lastSeenAt = o.at; s.exampleText = v.exampleText ?? s.exampleText; }
      byRole.set(v.role, s);
    }
  }
  const roles = [...byRole.values()].sort((a, b) => a.order - b.order);
  return {
    form: normForm(form),
    vocabulary: [{ role: "title", order: 0 }, ...roles.map((r) => ({ role: r.role, order: r.order, patterns: [], exampleText: r.exampleText }))],
    roles,
    observationCount: obs.length,
    firstObservedAt: obs[0].at,
    lastObservedAt: obs[obs.length - 1].at,
    basis: `folded from ${obs.length} real observation(s) of "${form}" (${[...new Set(obs.map((o) => o.giver))].join(", ")}); ${roles.length} role(s) with support; no hand-typed vocabulary`,
  };
}

/** formPriorsCount() — how many distinct forms have ever been observed. */
export function formPriorsCount() {
  let lines;
  try { lines = fs.readFileSync(FORM_PRIORS_LOG, "utf8").split("\n").filter(Boolean); }
  catch { return 0; }
  const forms = new Set();
  for (const line of lines) { try { forms.add(JSON.parse(line).form); } catch { /* skip */ } }
  return forms.size;
}
