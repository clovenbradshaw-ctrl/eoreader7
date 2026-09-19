// content-rules.mjs — the standing rules the ant-swarm preserves for hard
// content types, so future sessions handle that type immediately instead of
// re-deriving the read from scratch.
//
// The preserve-half of the protocol ("preserve rules for that type of content
// globally moving forward"): every time a turn swarms on hard meaning and the
// swarm converges (or fails in a way that is a property of the content TYPE),
// the surviving read is written here as a standing rule for that type — keyed
// by the signal that made meaning hard (hard-meaning.mjs's `type`), carrying
// the falsifying control that would concede it (the wall II.23). The next
// turn pointed at the same type reads the ledger first and applies the rule
// without re-deriving: the ant-swarm becomes literate about its own material.
//
// Persistence mirrors heimdall-derived-rules.json exactly (append-only JSON
// map, save swallows failure, a recurring type never re-writes every turn).
// This file lives beside swarm-server.mjs; the proxy serves it as
// GET /content-rules so every surface attached to eoreader7 reads the same
// standing rules.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONTENT_RULES_FILE = process.env.ER7_CONTENT_RULES_FILE ?? path.join(HERE, "content-rules.json");

let contentRules = loadContentRules();
function loadContentRules() {
  try {
    const d = JSON.parse(fs.readFileSync(CONTENT_RULES_FILE, "utf8"));
    return new Map(Object.entries(d));
  } catch { return new Map(); }
}
function saveContentRules() {
  try { fs.writeFileSync(CONTENT_RULES_FILE, JSON.stringify(Object.fromEntries(contentRules))); } catch { /* never crashes the turn */ }
}

/** contentRuleFor(type) — the standing rule for a content type, or null.
 *  The swarm's first move: apply the existing rule before re-deriving. */
export function contentRuleFor(type) {
  if (!type) return null;
  return contentRules.get(String(type)) ?? null;
}

/** preserveContentRule({ type, signal, read, falsifying, basis }) — write a
 *  standing rule for a hard content type. Append-only, keyed by type: a rule
 *  that already stands is only SHARPENED when the new read is more specific
 *  (the new detail replaces the old) — never duplicated, never deleted. The
 *  falsifying control rides every rule. Returns the standing rule. */
export function preserveContentRule({ type, signal = null, read = null, falsifying = null, basis = null, giver = "ant-swarm" } = {}) {
  if (!type) return null;
  const key = String(type);
  const now = Date.now();
  const prior = contentRules.get(key);
  const rule = {
    type: key,
    signal: signal ?? prior?.signal ?? null,
    read: read ?? prior?.read ?? null,
    falsifying: falsifying ?? prior?.falsifying ?? null,
    basis: basis ?? prior?.basis ?? null,
    giver: prior?.giver ?? giver,
    standing: "disclosed",
    firstAdoptedAt: prior?.firstAdoptedAt ?? now,
    lastSharpenAt: now,
  };
  // A rule that already stands is sharpened only by a MORE specific read:
  // the new read replaces the old only when the new detail names the signal
  // that made meaning hard (never a weaker, blunter statement).
  if (prior && prior.read && read) {
    rule.read = read.length >= prior.read.length ? read : prior.read;
  }
  contentRules.set(key, rule);
  saveContentRules();
  return rule;
}

/** contentRulesStore() — the whole ledger as a list, newest-sharpened first. */
export function contentRulesStore() {
  return [...contentRules.entries()]
    .map(([type, r]) => ({ type, ...r }))
    .sort((a, b) => (b.lastSharpenAt ?? 0) - (a.lastSharpenAt ?? 0));
}

/** contentRulesCount() — how many standing rules the swarm has preserved. */
export function contentRulesCount() {
  return contentRules.size;
}