// analysis-store.js — LEARNED ANALYSES AS SKILLS: an append-only, hash-chained log, and the switches that govern it.
//
// Fold invariant: A LEARNED METHOD IS A SKILL, AND A SKILL CAN BE TURNED OFF AND AUDITED. Every entry (learn, use,
// concede) is sealed by a SHA-256 chained to the one before, so an edit anywhere breaks every later hash and
// `verify` says where. The switches are NOT a second mechanism: they are skill-toggles.js's own ledger (a person's
// recorded decision; a parent switched off silences everything under it), keyed `learned:analysis/<id>` with the parent
// `route:analysis`. A method that is off is never retrieved, never run, and says so.
import fs from "node:fs"; import path from "node:path";
import { createHash } from "node:crypto";
import { foldToggles, loadToggles, stateOf, setToggle } from "./skill-toggles.js";
import { recordUse as recordSkillUse } from "./skill-usage.js";

export const ANALYSIS_SCHEMA = "EOAnalysis@2";
export const ANALYSIS_FILE = "analyses.jsonl";
export const ANALYSIS_ROUTE = "route:analysis";
export const skillId = (id) => `learned:analysis/${id}`;
const sha = (s) => createHash("sha256").update(s).digest("hex");
const canon = (v) => Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}` : JSON.stringify(v ?? null);
const file = (dir) => path.join(dir, ANALYSIS_FILE);

export function readLog(dir) {
  if (!fs.existsSync(file(dir))) return [];
  return fs.readFileSync(file(dir), "utf8").split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return [{ kind: "corrupt", raw: l.slice(0, 80) }]; } });
}
/** verify(dir) -> { ok, entries, head } | { ok:false, at, reason } — re-derives every seal. */
export function verify(dir) {
  let prev = null, n = 0;
  for (const e of readLog(dir)) {
    const { hash, ...rest } = e;
    if (e.kind === "corrupt") return { ok: false, at: n, reason: "an unreadable line" };
    if (e.prev !== prev) return { ok: false, at: e.seq ?? n, reason: "prev does not match" };
    if (sha(canon(rest)) !== hash) return { ok: false, at: e.seq ?? n, reason: "entry was altered" };
    prev = hash; n++;
  }
  return { ok: true, entries: n, head: prev };
}
export function append(dir, body, now = Date.now()) {
  fs.mkdirSync(dir, { recursive: true });
  const log = readLog(dir), prev = log.length ? log[log.length - 1].hash ?? null : null;
  const e = { schema: ANALYSIS_SCHEMA, ...body, seq: log.length, prev, at: now }; e.hash = sha(canon(e));
  fs.appendFileSync(file(dir), JSON.stringify(e) + "\n"); return e;
}

/** library(dir) -> methods with uses, concession, and the switch: { …, uses, conceded, on, switch:{by,why,seq}, flags, effectiveOn } */
export function library(dir) {
  const m = new Map();
  for (const e of readLog(dir)) {
    if (e.kind === "learn") m.set(e.id, { ...e, uses: 0, conceded: null, learnedAt: e.at });
    else if (e.kind === "use" && m.has(e.id)) m.get(e.id).uses++;
    else if (e.kind === "concede" && m.has(e.id)) m.get(e.id).conceded = { because: e.because, at: e.at };
  }
  const folded = foldToggles(loadToggles(dir)), parentOf = (id) => (id.startsWith("learned:analysis/") ? ANALYSIS_ROUTE : null);
  return [...m.values()].map((s) => { const st = stateOf(folded, skillId(s.id), { parentOf }); return { ...s, effectiveOn: st.effectiveOn && !s.conceded, switch: { decided: st.decided, on: st.on, by: st.by, why: st.why, seq: st.seq, offBecause: st.offBecause }, flags: st.flags }; });
}
export function store(dir, cand, lineage, evidence) {
  const id = sha(cand.check + "\u0000" + cand.control).slice(0, 12);
  if (library(dir).some((s) => s.id === id)) return { id, existing: true };
  append(dir, { kind: "learn", id, name: cand.name.trim(), desc: cand.desc.trim(), claim: cand.claim.trim(), check: cand.check, control: cand.control, codeSha: sha(cand.check + cand.control), lineage, evidence });
  return { id, existing: false };
}
export function recordUse(dir, id, context) { append(dir, { kind: "use", id, context }); recordSkillUse(dir, { skill: skillId(id), source: context?.file ?? null }); }
export function concede(dir, id, because) { if (!library(dir).some((s) => s.id === id)) return false; append(dir, { kind: "concede", id, because }); return true; }
/** switchAnalysis(dir, id, on, by, why) — a named person's recorded decision, in the shared skill-toggles ledger. Off needs a reason. */
export function switchAnalysis(dir, id, on, by, why) {
  if (!library(dir).some((s) => s.id === id)) return { error: `no learned method ${id}` };
  if (!on && !String(why ?? "").trim()) return { error: "switching a method off needs a reason — it is what the next person reads" };
  return setToggle(dir, { skill: skillId(id), on, by, why });
}
export const switchAll = (dir, on, by, why) => setToggle(dir, { skill: ANALYSIS_ROUTE, on, by, why });
/** history(dir, id) — every switch and flag ever made on a method, oldest first. */
export const history = (dir, id) => loadToggles(dir).filter((e) => e.skill === skillId(id) || e.skill === ANALYSIS_ROUTE);
