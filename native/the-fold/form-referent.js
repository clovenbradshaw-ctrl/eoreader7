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
// The ambiguity tier (built 2026-09-22, the user: "we may need a model call
// to even parse what the referent is sometimes"): when the ask's own words
// narrow the candidates to several prior asks, disambiguateFormReferent
// asks the mouth one yes/no per candidate and licenses the answer only when
// exactly one gets yes (steer.js's discipline — [[feedback_model_is_just_the_
// mouth]]); when the mechanics already decided, no call is made.

import fs from "node:fs";
import path from "node:path";
import { draftWords } from "./eot-draft.js";
import { isFunctionWord } from "./pos-prior.js";
import { yesNo } from "./steer.js";

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
  // LOW BAR, THEN HIGH BAR. Every ledger with a field is a candidate. The
  // ask's own content words ("another one about the river") narrow them to
  // the prior asks that share a word; exactly one sharing candidate is
  // resolved mechanically. Several sharing → the model may be asked, one
  // yes/no per candidate (disambiguateFormReferent); none sharing → recency,
  // disclosed as nothing better than recency.
  // The ask's words less the cue, the pronouns it rides on and the leading
  // verb — "write it again" shares nothing; "write another one about the
  // river" shares "river". (Every prior ask says "write": the verb would make
  // every candidate share, and the mechanics would never decide.)
  let stripped = String(task ?? "");
  for (const re of FORM_REFERENT_CUES) stripped = stripped.replace(new RegExp(re.source, "gi"), " ");
  stripped = stripped.replace(/\b(it|that|this|one|them|these|those)\b/gi, " ").trim().split(/\s+/).slice(1).join(" ");
  const askWords = new Set(draftWords(stripped).filter((w) => !isFunctionWord(w)));
  const candidates = shapes.map((s) => ({ docId: path.basename(s.path, ".jsonl"), prompt: s.prompt, field: s.field, mtimeMs: s.mtimeMs, shares: s.prompt ? [...new Set(draftWords(s.prompt).filter((w) => !isFunctionWord(w) && askWords.has(w)))] : [] }));
  const sharing = candidates.filter((c) => c.shares.length);
  const top = sharing.length ? sharing[0] : candidates[0];
  return {
    cue,
    resolved: { docId: top.docId, prompt: top.prompt, field: top.field },
    candidates, sharing: sharing.map((c) => c.docId),
    tier: sharing.length === 1 ? "mechanical" : sharing.length > 1 ? "ambiguous" : "recency",
    basis: sharing.length === 1
      ? `"${cue}" resolved to the one prior ask sharing "${top.shares.join(", ")}" with this one (${top.docId}), whose declared field is "${top.field}"`
      : `"${cue}" resolved to the most recently modified ledger this engine wrote (${top.docId}), whose declared field is "${top.field}"${sharing.length > 1 ? ` — ${sharing.length} prior asks share a word with this one and recency alone chose; a licensed question can decide` : candidates.length > 1 ? ` — ${candidates.length - 1} other candidate(s) existed and were not chosen by anything but recency` : ""}`,
  };
}

/**
 * disambiguateFormReferent(ref, { draw, task }) → ref, possibly re-resolved.
 * THE MODEL IS ONLY EVER A NARROW ORACLE (steer.js's discipline): asked once
 * per sharing candidate, yes or no, in recency order; licensed only when
 * exactly one candidate gets yes. Anything else leaves recency's pick and
 * says so. No call is made when the mechanics already decided.
 */
export async function disambiguateFormReferent(ref, { draw = null, task = "" } = {}) {
  if (!ref?.resolved || ref.tier !== "ambiguous" || typeof draw !== "function") return ref;
  const votes = [];
  for (const c of ref.candidates.filter((x) => x.shares.length)) {
    let reply = "";
    try { reply = String(await draw([{ role: "user", content: `A request says: "${task}". An earlier request in this conversation was: "${c.prompt}". Is the new request asking for the same kind of thing as that earlier one? Answer yes or no.` }], 12) ?? ""); } catch {}
    votes.push({ docId: c.docId, prompt: c.prompt, reply: reply.trim().slice(0, 80), vote: yesNo(reply) });
  }
  const yes = votes.filter((v) => v.vote === true);
  if (yes.length === 1) {
    const c = ref.candidates.find((x) => x.docId === yes[0].docId);
    return { ...ref, resolved: { docId: c.docId, prompt: c.prompt, field: c.field }, votes, tier: "licensed", basis: `"${ref.cue}" resolved by a licensed question: of ${votes.length} prior asks sharing a word with this one, the mouth said yes to ${c.docId} alone ("${c.prompt}"), whose declared field is "${c.field}"` };
  }
  return { ...ref, votes, tier: "recency", basis: `${ref.basis}; the mouth was asked about ${votes.length} candidate(s) and said yes to ${yes.length} — not licensed, recency's pick stands` };
}
