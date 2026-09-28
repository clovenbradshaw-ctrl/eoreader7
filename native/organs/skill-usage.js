// organs/skill-usage.js — THE MONITORING RECORD (Ostrom 4): every time a skill fires, and what came of it.
//
// Fold invariant: MONITORS ARE ACCOUNTABLE TO THE PEOPLE WHO RELY ON THE THING MONITORED. The record is
// append-only and shown on the same surface as the switch, so the person deciding whether to keep a skill on
// reads the same numbers the pipeline wrote. It also answers Ostrom's second principle (congruence): a
// skill built elsewhere is tested against THIS instance's content by its own hit rate here, not by where it
// came from. Entries are counts, never content: nothing read is copied into it.
import fs from "node:fs";
import path from "node:path";

export const USAGE_FILE = "skill-usage.jsonl";

export function recordUse(dir, { skill, fired = 1, accepted = 0, refused = 0, judged = 0, source = null, now = Date.now() }) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, USAGE_FILE), JSON.stringify({ skill, fired, accepted, refused, judged, source, at: now }) + "\n");
    return { ok: true };
  } catch (e) { return { error: e.code ?? e.message }; }
}
export function loadUsage(dir) {
  try { return fs.readFileSync(path.join(dir, USAGE_FILE), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
  catch { return []; }
}
/** foldUsage(entries) -> Map(skill -> { fired, accepted, refused, judged, sources, lastAt, hitRate }) */
export function foldUsage(entries) {
  const m = new Map();
  for (const e of entries) {
    const c = m.get(e.skill) ?? { fired: 0, accepted: 0, refused: 0, judged: 0, sources: new Set(), lastAt: null };
    c.fired += e.fired ?? 0; c.accepted += e.accepted ?? 0; c.refused += e.refused ?? 0; c.judged += e.judged ?? 0; if (e.source) c.sources.add(e.source); c.lastAt = e.at; m.set(e.skill, c);
  }
  for (const c of m.values()) { c.hitRate = c.accepted + c.refused ? c.accepted / (c.accepted + c.refused) : null; c.sources = [...c.sources]; }
  return m;
}

// ── linking a use to the skill that made it: the disclosure JSONs point at the skills surface ──
export const SKILL_SURFACE = "skills-surface.html";
/** The skills whose firing the pipeline actually reports. A skill NOT in this list may still have run: absence from
 *  a disclosure means "not reported", never "not used" — and the disclosure says which set it can speak for. */
export const INSTRUMENTED = Object.freeze(["route:hard-read", "route:look"]);
export const skillRef = (id) => ({ id, ref: `skill:${id}`, href: `${SKILL_SURFACE}#${encodeURIComponent(id)}` });
/** linkSkills(events) -> one linked entry per skill: how many times it fired this turn, over which sources, with what result. */
export function linkSkills(events = []) {
  const by = new Map();
  for (const e of events) {
    const c = by.get(e.skill) ?? { ...skillRef(e.skill), fired: 0, accepted: 0, refused: 0, judged: 0, sources: [] };
    c.fired += e.fired ?? 1; c.accepted += e.accepted ?? 0; c.refused += e.refused ?? 0; c.judged += e.judged ?? 0;
    if (e.source && !c.sources.includes(e.source)) c.sources.push(e.source);
    by.set(e.skill, c);
  }
  return [...by.values()];
}
