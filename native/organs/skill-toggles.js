// organs/skill-toggles.js — WHICH PATHS THE PIPELINE MAY TAKE, AS DECISIONS PEOPLE MAKE (Ostrom, applied).
//
// Fold invariant: A SWITCH IS A RECORDED DECISION, NEVER A HIDDEN DEFAULT. The ledger is append-only (seq, not
// clock, orders it). Two kinds of entry, because Ostrom's fifth principle is GRADUATED sanctions — on/off alone
// is one crude step:
//   toggle  { skill, on, by, why }   turn a path on or off
//   flag    { skill, by, why }       raise a concern without turning anything off (the first rung)
// The standing LADDER is a fold over them: earned/received → flagged → conceded (the rule file's own
// concession) → off. Every rung is a person's recorded act; the instrument never climbs it on its own — a
// sanction applied by the thing being sanctioned would be no sanction.
// A skill with no entry is in its DEFAULT state (on) and is reported as `default`, not as decided.
// Recognition of the right to organise (principle 7): this ledger is LOCAL. A received update (a new
// live_priors) never touches it, so a person's decision is never reset by whoever supplied the skill.
// NESTING (principle 8): a skill may name a `parent`; a parent that is off switches off everything under it.

import fs from "node:fs";
import path from "node:path";

export const TOGGLES_SCHEMA = "EOSkillToggles@2";
export const TOGGLES_FILE = "skill-toggles.jsonl";
const human = (by) => /^human:\S+/i.test(String(by ?? ""));

/** foldToggles(entries) -> Map(skillId -> { on, by, why, seq, at, flags:[…] }) — latest toggle wins; flags accumulate. */
export function foldToggles(entries) {
  const m = new Map();
  for (const e of entries) {
    if (!e?.skill) continue;
    const cur = m.get(e.skill) ?? { on: true, decided: false, by: null, why: null, seq: null, at: null, flags: [] };
    if (e.kind === "flag") cur.flags = [...cur.flags, { by: e.by, why: e.why, seq: e.seq, at: e.at }];
    else Object.assign(cur, { on: Boolean(e.on), decided: true, by: e.by ?? null, why: e.why ?? null, seq: e.seq, at: e.at });
    m.set(e.skill, cur);
  }
  return m;
}

/** stateOf(folded, id, { parentOf }) -> the skill's own switch, the rung it stands on, and the EFFECTIVE state
 *  once a parent's switch is taken into account. */
export function stateOf(folded, id, { parentOf = null } = {}) {
  const s = folded.get(id) ?? { on: true, decided: false, by: null, why: null, flags: [] };
  const parent = parentOf ? parentOf(id) : null;
  const p = parent ? folded.get(parent) : null;
  const parentOff = Boolean(p && p.on === false);
  return { on: s.on, decided: s.decided, by: s.by, why: s.why, seq: s.seq ?? null, flags: s.flags, effectiveOn: s.on && !parentOff, offBecause: !s.on ? "switched off" : parentOff ? `its parent ${parent} is switched off` : null };
}

export function loadToggles(dir) {
  try { return fs.readFileSync(path.join(dir, TOGGLES_FILE), "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean); }
  catch { return []; }
}

function append(dir, body) {
  fs.mkdirSync(dir, { recursive: true });
  const seq = loadToggles(dir).length;
  const entry = { schema: TOGGLES_SCHEMA, seq, ...body };
  fs.appendFileSync(path.join(dir, TOGGLES_FILE), JSON.stringify(entry) + "\n");
  return { entry };
}

/** setToggle — `by` is a named person (never a model). */
export function setToggle(dir, { skill, on, by, why = null, now = Date.now() }) {
  if (!skill) return { error: "which skill?" };
  if (typeof on !== "boolean") return { error: "on must be true or false" };
  if (!human(by)) return { error: 'a switch is flipped by a named person: "human:<name>"' };
  return append(dir, { kind: "toggle", skill, on, by, why, at: now });
}

/** flagSkill — the first rung: a recorded concern, nothing switched. A reason is required: a flag with no
 *  reason is noise, and the reason is what the next person reads. */
export function flagSkill(dir, { skill, by, why, now = Date.now() }) {
  if (!skill) return { error: "which skill?" };
  if (!human(by)) return { error: 'a flag is raised by a named person: "human:<name>"' };
  if (!String(why ?? "").trim()) return { error: "a flag needs a reason" };
  return append(dir, { kind: "flag", skill, by, why, at: now });
}

/** disabledSet(dir, { parentOf, ids }) -> Set of skill ids that are EFFECTIVELY off (parent cascade included). */
export function disabledSet(dir, { parentOf = null, ids = [] } = {}) {
  const f = foldToggles(loadToggles(dir));
  const out = new Set();
  for (const id of new Set([...f.keys(), ...ids])) if (!stateOf(f, id, { parentOf }).effectiveOn) out.add(id);
  return out;
}

/** ladderOf(state, conceded) -> the rung a skill stands on. Fixed order; each rung is a person's recorded act. */
export function ladderOf(st, { conceded = false, earned = true } = {}) {
  if (!st.effectiveOn) return { rung: "off", n: 4 };
  if (conceded) return { rung: "conceded", n: 3 };
  if (st.flags.length) return { rung: "flagged", n: 2 };
  return { rung: earned ? "standing" : "provisional", n: earned ? 0 : 1 };
}
