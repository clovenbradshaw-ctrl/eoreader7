// organs/correction-rule.js — stir the nest through natural language.
//
// Renamed from hive.js (2026-09-17, LAVAR.md's Wilson reconciliation): this
// organ mints ONE falsifiable rule from ONE correction and files it in ONE
// ledger — no multiplicity, no walled standpoints, no corroboration. It was
// never a hive; the old name was a metaphor ("stir the nest") that collided
// with the stack's actual multi-instrument mechanisms and cost a session an
// hour of confusion. See LAVAR.md 2026-09-17 for the full count.
//
// A correction is not another task. When a person says the machine's own
// answer was wrong — "you wrote an essay, not a sonnet", "that was too
// long", "don't put footnotes in a poem" — this organ recognizes the
// corrective register, names the declared and rejected forms, and authors a
// falsifiable rule. The rule is discovered from the person's words, not from
// a hardcoded genre table, and every rule carries the observation that would
// falsify it.
//
// PURE except for the optional rule ledger. No model, no network.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CORRECTION_SCHEMA = "Correction@1";
export const CORRECTION_RULE_SCHEMA = "CorrectionRule@1";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RULES_FILE = path.join(HERE, "correction-rules.jsonl");

export function correctionRulesFile(explicit) {
  return explicit ?? process.env.ER7_CORRECTION_RULES ?? DEFAULT_RULES_FILE;
}

export const NATURAL_SIZE_MAX_TOKENS = Number(process.env.ER7_CORRECTION_NATURAL_SIZE_MAX ?? 320);

// The register this organ hears. These are structural English frames for a
// correction, not a list of genres, topics, lengths, or forbidden words.
const SELF_REFERENCE = "(?:you|your\\s+(?:answer|response|output|reply|message)|that\\s+(?:answer|response|output|reply|message|one)|this\\s+(?:answer|response|output|reply|message|one)|it)";
const PRODUCTION_VERB = "(?:wrote|written|write|gave|give|given|produced|produce|returned|return|sent|send|showed|show|answered|answer|generated|generate|made|make|drafted|draft|composed|compose|provided|provide)";
const REQUEST_VERB = "(?:wanted|asked\\s+for|requested|expected|meant)";
const WORD = "[^\\s,;:.!?()\\[\\]\"“”‘’]+";
const FORM = `(${WORD}(?:\\s+${WORD}){0,3})`;
const NOISE_WORDS = new Set([
  "a", "an", "the", "this", "that", "these", "those", "my", "your",
  "answer", "response", "output", "reply", "message", "version", "thing",
  "kind", "form", "one", "write", "compose", "generate", "produce", "make",
]);

const normalizeText = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

function cleanForm(raw) {
  let s = normalizeText(raw).toLowerCase();
  s = s.replace(/^["'“”‘’(\[]+|["'“”‘’) \].,!?;:—–-]+$/g, "").trim();
  s = s.replace(/\s+(about|on|covering|addressing|instead of|rather than)\b[\s\S]*$/, "").trim();
  s = s.replace(/^(?:a|an|the|this|that|these|those|my|your|some|any)\s+/i, "").trim();
  s = s.replace(/^(?:please\s+)?(?:write|compose|generate|produce|make|give|provide|draft)\s+/i, "").trim();
  const words = s.split(/\s+/).filter(Boolean).slice(0, 4);
  if (!words.length) return null;
  if (words.length === 1 && (NOISE_WORDS.has(words[0]) || words[0].length < 3)) return null;
  return words.join(" ");
}

function headword(form) {
  const words = String(form ?? "").split(/\s+/).filter((w) => w && !NOISE_WORDS.has(w));
  return words.at(-1) ?? null;
}

function productionMismatch(text) {
  const m = new RegExp(
    `\\b${SELF_REFERENCE}\\b[^.?;!]{0,220}?\\b${PRODUCTION_VERB}\\b\\s+${FORM}\\s*(?:,|—|–|:)?\\s*(?:not|instead of|rather than)\\s+${FORM}`,
    "i",
  ).exec(text);
  if (!m) return null;
  const actual = cleanForm(m[1]);
  const expected = cleanForm(m[2]);
  if (!actual || !expected) return null;
  return { actual, expected, basis: "produced-form contrast" };
}

function requestedMismatch(text) {
  const m = new RegExp(
    `\\b(?:i|we)\\b[^.?;!]{0,220}?\\b${REQUEST_VERB}\\b\\s+${FORM}\\s*(?:,|—|–|:)?\\s*(?:not|instead of|rather than)\\s+${FORM}`,
    "i",
  ).exec(text);
  if (!m) return null;
  const expected = cleanForm(m[1]);
  const actual = cleanForm(m[2]);
  if (!actual || !expected) return null;
  return { actual, expected, basis: "requested-form contrast" };
}

function obligatoryMismatch(text) {
  const m = new RegExp(
    `\\b(?:should(?:\\s+have\\s+been|\\s+be)?|ought\\s+to\\s+be|was\\s+supposed\\s+to\\s+be)\\b\\s+${FORM}\\s*(?:,|—|–|:)?\\s*(?:not|instead of|rather than)\\s+${FORM}`,
    "i",
  ).exec(text);
  if (!m) return null;
  const expected = cleanForm(m[1]);
  const actual = cleanForm(m[2]);
  if (!actual || !expected) return null;
  return { actual, expected, basis: "obligatory-form contrast" };
}

function lengthVerdict(text) {
  const m = /\b(too\s+(long|short|wordy|verbose|terse|brief)|shorten(?:\s+it)?|expand(?:\s+it)?|be\s+(?:more\s+)?concise|keep\s+it\s+(?:short|brief|tight))\b/i.exec(text);
  if (!m) return null;
  const marker = m[1].toLowerCase();
  const direction = /too\s+long|shorten|concise|brief|tight/.test(marker) ? "shorten" : "lengthen";
  if (!new RegExp(`\\b${SELF_REFERENCE}\\b`, "i").test(text) && !/\b(answer|response|output|reply|message)\b/i.test(text)) return null;
  return { direction, marker, basis: "answer-length verdict" };
}

function prohibition(text) {
  const m = /^(?:please\s+)?(don't|do not|stop|never|next time,?)\s+([^.?;!]{2,120})/i.exec(text.trim());
  if (!m) return null;
  const action = normalizeText(m[2]).toLowerCase();
  const target = /(?:in|on|for|to)\s+(?:a|an|the|this|that)?\s*([^.?;!]{2,60})$/.exec(action)?.[1] ?? null;
  if (!action || action.split(/\s+/).length > 12) return null;
  return { action, target: target ? cleanForm(target) : null, basis: "direct prohibition" };
}

/**
 * detectCorrection(text) — hear whether NL is correcting the machine's own
 * answer. It returns a structured, falsifiable correction, never a new task.
 */
export function detectCorrection(text) {
  const statement = normalizeText(text);
  if (!statement) return null;
  const lowered = statement.toLowerCase();
  const mismatch = productionMismatch(lowered) ?? requestedMismatch(lowered) ?? obligatoryMismatch(lowered);
  if (mismatch) {
    return {
      schema: CORRECTION_SCHEMA,
      kind: "output-form-mismatch",
      statement,
      actual: mismatch.actual,
      expected: mismatch.expected,
      actualHead: headword(mismatch.actual),
      expectedHead: headword(mismatch.expected),
      dimension: "output-form",
      actionable: true,
      basis: mismatch.basis,
    };
  }
  const length = lengthVerdict(lowered);
  if (length) {
    return {
      schema: CORRECTION_SCHEMA,
      kind: "answer-length",
      statement,
      actual: null,
      expected: null,
      dimension: "answer-length",
      direction: length.direction,
      marker: length.marker,
      actionable: true,
      basis: length.basis,
    };
  }
  const ban = prohibition(statement);
  if (ban) {
    return {
      schema: CORRECTION_SCHEMA,
      kind: "prohibition",
      statement,
      actual: null,
      expected: ban.target,
      dimension: "output-apparatus",
      action: ban.action,
      actionable: true,
      basis: ban.basis,
    };
  }
  return null;
}

function ruleId(parts) {
  const record = parts.join("|").toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < record.length; i += 1) {
    h ^= record.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `ref:correction:${(h >>> 0).toString(36)}`;
}

/**
 * falsifiableRule(correction) — turn a heard correction into a standing rule.
 * Every rule names the future observation that would falsify it. The rule is
 * discovered from the correction's own forms; no genre table is consulted.
 */
export function falsifiableRule(correction, { at = new Date().toISOString(), source = "user-correction" } = {}) {
  if (!correction?.actionable) return null;
  if (correction.kind === "output-form-mismatch") {
    return {
      schema: CORRECTION_RULE_SCHEMA,
      id: ruleId(["form", correction.expected, correction.actual]),
      at,
      source,
      giver: "correction:mint",
      standing: "disclosed",
      kind: correction.kind,
      dimension: correction.dimension,
      statement: correction.statement,
      expected: correction.expected,
      rejected: correction.actual,
      maxTokens: NATURAL_SIZE_MAX_TOKENS,
      principle: "Produce the declared output form as that form; do not substitute the rejected form.",
      claim: `A later request invoking "${correction.expected}" is answered as "${correction.expected}", not as "${correction.actual}".`,
      falsifier: `A later "${correction.expected}" request classified as answer shape "composition", answered in mode "projection", or returned as "${correction.actual}" falsifies this rule.`,
      check: {
        seam: "answer-shape",
        requested: correction.expected,
        requestedHead: correction.expectedHead,
        rejectedForms: [correction.actual, correction.actualHead].filter(Boolean),
        forbiddenShapes: ["composition"],
        forbiddenModes: ["projection"],
      },
    };
  }
  if (correction.kind === "answer-length") {
    return {
      schema: CORRECTION_RULE_SCHEMA,
      id: ruleId(["length", correction.direction, correction.marker]),
      at,
      source,
      giver: "correction:mint",
      standing: "disclosed",
      kind: correction.kind,
      dimension: correction.dimension,
      statement: correction.statement,
      direction: correction.direction,
      principle: "A length verdict controls the next answer to the same task: shorten means shorter, lengthen means longer.",
      claim: `The next answer to the same task moves in the "${correction.direction}" direction relative to the rejected answer.`,
      falsifier: `A later answer to the same task that is equally long or moves opposite to "${correction.direction}" falsifies this rule.`,
      check: { seam: "answer-length", direction: correction.direction, requires: "same-task prior answer" },
    };
  }
  return {
    schema: CORRECTION_RULE_SCHEMA,
    id: ruleId(["prohibition", correction.action ?? "", correction.expected ?? ""]),
    at,
    source,
    giver: "correction:mint",
    standing: "disclosed",
    kind: correction.kind,
    dimension: correction.dimension,
    statement: correction.statement,
    action: correction.action,
    target: correction.expected,
    principle: "A direct prohibition about the machine's output governs later answers in the same scope.",
    claim: `Later answers do not perform the prohibited action${correction.expected ? ` in "${correction.expected}"` : ""}: ${correction.action}.`,
    falsifier: `A later answer that performs "${correction.action}"${correction.expected ? ` in "${correction.expected}"` : ""} falsifies this rule.`,
    check: { seam: "output-apparatus", action: correction.action, target: correction.expected },
  };
}

export function readCorrectionRules(rulesFile) {
  const file = correctionRulesFile(rulesFile);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter((rule) => rule?.schema === CORRECTION_RULE_SCHEMA);
}

function termPattern(term) {
  return String(term ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean).map((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return word.length > 3 ? `${escaped}s?` : escaped;
  }).join("\\s+");
}

export function correctionApplies(rule, task) {
  const terms = [rule?.expected, rule?.check?.requestedHead].filter(Boolean);
  const text = String(task ?? "").toLowerCase();
  return terms.some((term) => new RegExp(`\\b${termPattern(term)}\\b`).test(text));
}

/** The natural-size rule, if any, that a discovered correction imposes on a task. */
export function naturalSizeRuleForTask(task, { rulesFile } = {}) {
  // Correction turns themselves only mint rules; a later producing ask is
  // steered by them. This keeps “you wrote an essay, not a sonnet” from
  // reshaping ordinary questions that merely mention a sonnet.
  if (!/\b(?:write|compose|draft|prepare|generate|produce|make|tell|build|create|implement|code)\b/i.test(String(task ?? ""))) return null;
  const rules = readCorrectionRules(rulesFile).filter((rule) => rule?.kind === "output-form-mismatch");
  for (let i = rules.length - 1; i >= 0; i -= 1) {
    const rule = rules[i];
    if (correctionApplies(rule, task)) {
      return { id: rule.id, expected: rule.expected, maxTokens: Number(rule.maxTokens) || NATURAL_SIZE_MAX_TOKENS };
    }
  }
  return null;
}

/** Does an observed answer route falsify a form-mismatch rule? */
export function falsifiesFormRule(rule, { shape = null, mode = null, text = "" } = {}) {
  if (rule?.kind !== "output-form-mismatch") return false;
  if (rule.check?.forbiddenShapes?.includes(shape)) return true;
  if (rule.check?.forbiddenModes?.includes(mode)) return true;
  const answer = String(text ?? "").toLowerCase();
  const rejected = rule.check?.rejectedForms ?? [];
  const requested = [rule.expected, rule.check?.requestedHead].filter(Boolean);
  const hasRejected = rejected.some((form) => new RegExp(`\\b${termPattern(form)}\\b`).test(answer));
  const hasRequested = requested.some((form) => new RegExp(`\\b${termPattern(form)}\\b`).test(answer));
  return hasRejected && !hasRequested;
}

/**
 * authorCorrectionRule(text) — hear NL, mint its falsifiable rule, and append
 * it to the correction ledger. A repeated identical correction reaffirms the
 * existing rule rather than duplicating it.
 */
export function authorCorrectionRule(text, { now = new Date().toISOString(), source = "user-correction", rulesFile, persist = true } = {}) {
  const correction = detectCorrection(text);
  if (!correction) return { correction: null, rule: null, persisted: false, reason: "no correction heard" };
  const rule = falsifiableRule(correction, { at: now, source });
  if (!rule) return { correction, rule: null, persisted: false, reason: "correction not actionable" };
  if (!persist) return { correction, rule, persisted: false, reason: "persistence disabled" };
  const file = correctionRulesFile(rulesFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = readCorrectionRules(file).some((entry) => entry.id === rule.id);
  if (existing) return { correction, rule, persisted: false, reason: "rule already standing" };
  fs.appendFileSync(file, `${JSON.stringify(rule)}\n`, "utf8");
  return { correction, rule, persisted: true, reason: "rule authored" };
}
