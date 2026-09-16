// native/organs/aristotle.js — Aristotle: the entrance to the reasoning
// organs. `puzzle-templates.js` already says the honest thing about
// reading a riddle mechanically: a closed regex signature either matches
// a registered shape or it doesn't, and a text that doesn't match is a
// typed refusal, never a guessed formalization. That is correct as far
// as it goes, but it leaves a real gap: a riddle that IS Boolos-shaped
// but phrased in words the regex signature never anticipated (a
// paraphrase, a translation, a renamed connective) fails the mechanical
// signature and is refused — even though a reader would recognize the
// shape at a glance.
//
// Aristotle is the organ that closes that gap WITHOUT weakening the
// refusal discipline: it tries the mechanical signature first, exactly as
// `matchTemplate` already does (this stays free of any model call for
// every riddle the regex already reaches). Only when the mechanical
// signature fails does it optionally consult an INJECTED model call —
// never to answer the riddle, never to invent a solution, but to do one
// narrow, checkable thing: extract the same closed-schema parameters
// (agents, role words, the yes/no word pair, the query budget) the
// regex signature would have extracted itself, had the wording matched.
// The model's extraction is never trusted on its own: every field it
// returns is re-validated against the template's own closed vocabulary
// (`classifyRoleWord`'s ROLE_SYNONYMS table) before formalization ever
// runs, and if any field fails that check the whole classification is
// rejected — a rejected extraction is a disclosed refusal, the same
// posture `REFUSALS.no_match` already takes, never a silent guess
// promoted to a fact.
//
// This is why the model call is INJECTED (`modelCall`), never imported:
// the same I/O-at-the-caller split `organs/look.js`'s header already
// states for this codebase — a pure organ never owns a network call, a
// caller hands it one. Aristotle itself makes no request and reaches no
// network; it only knows how to BUILD the request (`buildClassificationRequest`)
// and how to CHECK the response (`acceptClassification`) — the boundary
// `reasoning-lint.js` draws around "no model call anywhere" stays true of
// this module's own logic, it is only the orchestrator (`solve`) that, if
// handed a `modelCall`, calls it and mechanically checks what comes back.
//
// "Translate into the holograph": `toHolograph` renders whatever entrance
// succeeded — mechanical or model-assisted — as the same note-shaped
// records (`{subject, verb, object}`, the shape `organs/hyperlexicon.js`'s
// `hear` already takes) the rest of this codebase reasons over. Aristotle
// itself never writes to a live ledger (no `door`/`log` is injected here
// either); it returns the notes a caller may `hear` into one.

import { matchTemplate, PUZZLE_TEMPLATES, REFUSALS as TEMPLATE_REFUSALS, classifyRoleWord } from "./puzzle-templates.js";
import { planDistinguishingQueries, executePlan } from "./distinguishing-plan.js";

export const ENTRANCES = Object.freeze({
  mechanical: "mechanical_signature", // matchTemplate's own regex signature hit
  modelAssisted: "model_assisted_extraction", // model extracted params, then mechanically re-validated
});

export const REFUSALS = Object.freeze({
  no_entrance: "neither the mechanical signature nor a model-assisted extraction (if attempted) produced a validated match against any registered template — a disclosed absence, never a guessed formalization",
  model_extraction_invalid: "a model call was made, but its extracted params failed the template's own closed-vocabulary checks and were rejected — the model's output is never trusted past that check",
  no_plan_within_budget: "a template matched and formalized, but no query plan distinguishes every hypothesis within the puzzle's own declared budget",
});

/**
 * buildClassificationRequest(text, template) — the exact, closed question
 * to hand a model: extract THIS template's declared param shape, nothing
 * else. Pure data — no call is made here.
 */
export function buildClassificationRequest(text, template) {
  return Object.freeze({
    templateId: template.id,
    text: String(text ?? ""),
    instruction:
      `Does the text below describe a puzzle of exactly this shape: three ` +
      `agents, each secretly and permanently one of {true-telling, false-telling, ` +
      `random}, one of each; a yes/no word pair whose mapping to yes/no is ` +
      `unknown; and a stated number of yes/no questions allowed? Never solve ` +
      `the puzzle. If the shape matches, return ONLY this JSON shape: ` +
      `{"matches": true, "agents": [a,b,c], "roleWords": {"true": w, "false": w, "random": w}, ` +
      `"yesOrNoWords": [w1, w2], "budget": n}. If it does not match, return ` +
      `{"matches": false}.`,
    schema: Object.freeze({ matches: "boolean", agents: "string[3]?", roleWords: "object?", yesOrNoWords: "string[2]?", budget: "integer?" }),
  });
}

/**
 * acceptClassification(raw, template) — the mechanical check on whatever a
 * model returned: every field is re-validated against the SAME closed
 * vocabulary the regex signature itself enforces (never a looser check
 * just because a model produced it). Returns the same `params` shape
 * `template.signature` would have, or `null` on any failure.
 */
export function acceptClassification(raw, template) {
  if (template.id !== "boolos-liar-truthteller-random") return null; // only template this organ knows how to re-validate today
  if (!raw || raw.matches !== true) return null;
  const { agents, roleWords, yesOrNoWords, budget } = raw;
  if (!Array.isArray(agents) || agents.length !== 3 || agents.some((a) => typeof a !== "string" || !a)) return null;
  if (new Set(agents).size !== 3) return null;
  if (!roleWords || typeof roleWords !== "object") return null;
  const roleEntries = ["true", "false", "random"].map((honesty) => {
    const word = roleWords[honesty];
    if (typeof word !== "string" || classifyRoleWord(word) !== honesty) return null; // re-checked against ROLE_SYNONYMS, never trusted as-is
    return [honesty, word];
  });
  if (roleEntries.some((e) => e === null)) return null;
  if (!Array.isArray(yesOrNoWords) || yesOrNoWords.length !== 2 || yesOrNoWords.some((w) => typeof w !== "string" || !w)) return null;
  if (!Number.isInteger(budget) || budget < 1) return null;

  return Object.freeze({
    agents: Object.freeze([...agents]),
    roleWordFor: Object.freeze(Object.fromEntries(roleEntries)),
    yesOrNoWords: Object.freeze([...yesOrNoWords]),
    budget,
  });
}

/**
 * classifyEntrance(text, { modelCall }) — mechanical signature first; a
 * model-assisted extraction only if the mechanical signature fails AND a
 * `modelCall` was injected. `modelCall(request)` must return a plain
 * object (already JSON, not a string this organ would need to parse) —
 * the caller owns talking to whatever model it chose; this organ never
 * assumes a transport.
 */
export function classifyEntrance(text, { modelCall = null, template = null } = {}) {
  const mechanical = matchTemplate(text);
  if (!mechanical.refused) return Object.freeze({ entrance: ENTRANCES.mechanical, template: mechanical.template, params: mechanical.params });

  if (typeof modelCall !== "function") return Object.freeze({ refused: REFUSALS.no_entrance, tried: Object.freeze([TEMPLATE_REFUSALS.no_match]) });

  // A caller may name which registered template to attempt model-assisted
  // extraction against; otherwise every registered template is tried in
  // turn (today there is exactly one).
  const candidates = template ? [template] : PUZZLE_TEMPLATES;
  let request = null, raw = null, params = null, matchedTemplate = null;
  for (const candidateTemplate of candidates) {
    request = buildClassificationRequest(text, candidateTemplate);
    raw = modelCall(request);
    params = acceptClassification(raw, candidateTemplate);
    if (params) { matchedTemplate = candidateTemplate; break; }
  }
  if (!matchedTemplate) return Object.freeze({ refused: REFUSALS.model_extraction_invalid, tried: Object.freeze([TEMPLATE_REFUSALS.no_match]), raw });

  return Object.freeze({ entrance: ENTRANCES.modelAssisted, template: matchedTemplate, params });
}

/**
 * toHolograph(text, classified) — render a successful classification (of
 * either entrance) as the note-shaped records `organs/hyperlexicon.js`'s
 * `hear` takes (`{subject, verb, object}`), plus the raw span this organ
 * itself never has (no witness text-offsets are invented — `spans` is
 * left for a caller who has the real source text to fill in). Never
 * writes to a ledger; a caller `hear`s these into one if it wants them on
 * the record.
 */
export function toHolograph(text, classified) {
  if (!classified || classified.refused) return Object.freeze({ notes: Object.freeze([]) });
  const { entrance, template, params } = classified;
  const notes = [];
  for (const agent of params.agents) {
    notes.push(Object.freeze({ subject: agent, verb: "is-one-of", object: "true|false|random" }));
  }
  notes.push(Object.freeze({ subject: "yes/no word mapping", verb: "is-unknown-over", object: params.yesOrNoWords.join("/") }));
  notes.push(Object.freeze({ subject: "query budget", verb: "is", object: String(params.budget) }));
  return Object.freeze({ entrance, templateId: template.id, notes: Object.freeze(notes) });
}

/**
 * solve(text, { modelCall }) — the full entrance: classify (mechanical,
 * then model-assisted if injected and needed), formalize, build the
 * embedding-lemma candidate queries, and synthesize a distinguishing plan
 * within the puzzle's own declared budget. Never guesses past a failed
 * check at any step — each step's own typed refusal is returned as-is.
 */
export function solve(text, { modelCall = null } = {}) {
  const classified = classifyEntrance(text, { modelCall });
  if (classified.refused) return classified;

  const { template, params, entrance } = classified;
  const formalized = template.formalize(params);
  const queries = template.candidateQueries(formalized);
  const plan = planDistinguishingQueries(formalized.hypotheses, queries, { budget: formalized.budget });
  if (!plan.done) return Object.freeze({ refused: REFUSALS.no_plan_within_budget, undetermined: plan.undetermined });

  const holograph = toHolograph(text, classified);
  return Object.freeze({ entrance, template: template.id, params, hypotheses: formalized.hypotheses, plan, holograph, execute: (answerFn) => executePlan(plan, answerFn) });
}
