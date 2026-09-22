// form-referent.js — A FORM-WORD CAN BE A REFERENT INTO THIS CONVERSATION,
// NOT A GENRE TO LOOK UP (2026-09-22).
//
// The user, correcting the SURF design mid-build: "we dont want a set of
// shapes pre-set" (no FIELD_BY_NOUN-style table can ever be complete), and
// then: "remember its contextal to the convo. the prompt may say 'again' and
// that is a referent pointing to something that defines the shape." An ask
// like "write it again" or "do that once more but shorter" names no genre at
// all — its shape is whatever the LAST piece's shape already was, and that
// answer lives in this engine's own ledger (document-ledger.js), not on the
// web. This module is the FIRST, cheapest gate SURF must pass through, ahead
// of any external search: is the ask's form-word actually an anaphor?
//
// Two tiers, mechanical only (no model call — see CODING note below):
//   detectFormReferentCue(task)   a fixed, small set of anaphoric English
//                                 cues ("again", "another one", "the same
//                                 [kind]", "like [that/before]", "once more").
//                                 This is NOT a genre table — it is closed
//                                 grammar (English has a small, closed set of
//                                 anaphoric devices), the same distinction
//                                 kind-induction.js draws between grammar
//                                 (closed, may be listed) and content (open,
//                                 must be induced/looked up).
//   resolveFormReferent(task, …)  if a cue is found, reads this engine's own
//                                 ledger (documents/*.jsonl, via
//                                 document-ledger.js's own file convention)
//                                 for the most recent run's declared field —
//                                 never invents one, and states which run and
//                                 why (basis) so a wrong pick is visible.
//
// NOT YET BUILT (named, not faked): when the cue is ambiguous (which prior
// piece does "the same" mean, with several candidates), resolving it needs a
// narrow, mechanically-licensed model question over the actual candidates
// found here (steer.js's discipline — [[feedback_model_is_just_the_mouth]]),
// never a free-form guess. This module only ever returns a candidate list;
// it does not yet call the model to disambiguate one.

import fs from "node:fs";
import path from "node:path";

export const FORM_REFERENT_CUES = [
  /\bagain\b/i,
  /\bonce more\b/i,
  /\banother (?:one|piece|version|draft)\b/i,
  /\bthe same\b/i,
  /\blike (?:that|before|last time|the last one)\b/i,
  /\bas before\b/i,
  /\bone more time\b/i,
];

/** The ask's own words, checked for a closed set of anaphoric devices — NOT
 *  a genre table (that is the open, must-never-be-pre-set list the user
 *  rejected). Returns the matched phrase, or null. */
export function detectFormReferentCue(task) {
  const t = String(task ?? "");
  for (const re of FORM_REFERENT_CUES) {
    const m = t.match(re);
    if (m) return m[0].toLowerCase();
  }
  return null;
}

const FIELD_LINE = /admits\s+\[\w+\]\s+(\S+)/;

/** One ledger file's prompt and declared field, read off the plain lines
 *  document-ledger.js already writes (role "prompt", role "void") — no new
 *  storage, no new schema. Returns null if the file has neither. */
function readLedgerShape(filePath) {
  let text;
  try { text = fs.readFileSync(filePath, "utf8"); } catch { return null; }
  let prompt = null, field = null, mtimeMs = 0;
  try { mtimeMs = fs.statSync(filePath).mtimeMs; } catch {}
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.role === "prompt" && obj.text) prompt = obj.text;
    if (obj.role === "void" && obj.text) {
      const m = obj.text.match(FIELD_LINE);
      if (m) field = m[1];
    }
  }
  if (!prompt && !field) return null;
  return { path: filePath, prompt, field, mtimeMs };
}

/**
 * resolveFormReferent(task, { documentsDir, excludeDocId }) →
 *   null                          no anaphoric cue in the ask
 *   { cue, resolved: null, basis }        a cue was found, but the ledger
 *                                          directory holds nothing readable
 *   { cue, resolved: {docId, prompt, field}, basis }
 *                                          the most recently modified ledger
 *                                          this engine itself wrote, with a
 *                                          declared field — never a guess
 *                                          from outside this engine's own
 *                                          record of what it already made.
 * The "most recent" pick is a disclosed heuristic, not a silent one: when
 * more than one candidate ledger exists, which one is meant is exactly the
 * ambiguity the not-yet-built model-question tier above is for.
 */
export function resolveFormReferent(task, { documentsDir = "documents", excludeDocId = null } = {}) {
  const cue = detectFormReferentCue(task);
  if (!cue) return null;
  let files = [];
  try { files = fs.readdirSync(documentsDir).filter((f) => f.endsWith(".jsonl")); } catch {
    return { cue, resolved: null, basis: `no cue-resolution possible: "${documentsDir}" is not a readable ledger directory` };
  }
  const excludePrefix = excludeDocId ? String(excludeDocId).replace(/[^a-z0-9:_-]/gi, "_") : null;
  const shapes = files
    .filter((f) => !excludePrefix || !f.startsWith(excludePrefix))
    .map((f) => readLedgerShape(path.join(documentsDir, f)))
    .filter(Boolean)
    .filter((s) => s.field)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (!shapes.length) {
    return { cue, resolved: null, basis: `a referent cue ("${cue}") was found, but no ledger in "${documentsDir}" declares a field to point at` };
  }
  const top = shapes[0];
  const docId = path.basename(top.path, ".jsonl");
  return {
    cue,
    resolved: { docId, prompt: top.prompt, field: top.field },
    basis: `"${cue}" resolved to the most recently modified ledger this engine wrote (${docId}), whose declared field is "${top.field}"${shapes.length > 1 ? ` — ${shapes.length - 1} other candidate(s) existed and were not chosen by anything but recency` : ""}`,
  };
}
