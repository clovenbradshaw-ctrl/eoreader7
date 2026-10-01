// ═══ LOVELACE · TEACH IT TO FISH ═══ THE FOLD OF AN APP — an append-only log the app is a PROJECTION of.
// The operator, 2026-10-01: "render what we have and watch it evolve in real time." A leaf that passes its checks LANDS as an entry; a leaf that does not is an OPEN entry naming why; nothing is rewritten — a better
// version of a landed leaf lands as a SUPERSEDE and the old one stays. The app at any cursor is `project(entries, cursor)`: the landed leaves at that point, the open ones as visible gaps.
//
// In GitHub's words: the log is the branch's history, a landed leaf is a passing required check, an open entry is a failing one, and the projection is the preview of the branch — the merge (the app ships) waits on
// every required check. This is the app's own small log (JSONL, hash-chained), NOT yet the engine's build-log.js: it is shaped like it (propose / land / supersede / open, seq not clock, the past kept) so it can move there.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
export const KINDS = Object.freeze(["propose", "land", "open", "supersede", "note", "project"]);

export function openFold(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const read = () => (fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
  return {
    file,
    entries: read,
    /** append one entry: seq is the next integer, `prev` the hash of the line before — a hole or an edit breaks the chain and `verify` says where */
    append(kind, fields = {}) {
      if (!KINDS.includes(kind)) throw new Error(`unknown fold entry kind: ${kind}`);
      const all = read(), prev = all.length ? all[all.length - 1].hash : null, body = { seq: all.length, kind, ...fields, at: new Date().toISOString(), prev };
      const entry = { ...body, hash: sha(JSON.stringify(body)) };
      fs.appendFileSync(file, JSON.stringify(entry) + "\n");
      return entry;
    },
  };
}

/** the chain still reads: every entry's prev is the hash of the one before and every hash is the hash of its body -> { ok, brokenAt } */
export function verify(entries) {
  let prev = null;
  for (const e of entries) {
    const { hash, ...body } = e;
    if (e.prev !== prev || sha(JSON.stringify(body)) !== hash) return { ok: false, brokenAt: e.seq };
    prev = hash;
  }
  return { ok: true, brokenAt: null };
}

/** the fold as of a cursor (the last seq included; default the head) -> { cursor, landed:{leaf: entry}, open:{leaf: entry}, passing, total, required, needs, history } */
export function project(entries, cursor = null, required = []) {
  const upto = cursor == null ? entries.length - 1 : cursor, landed = {}, open = {}, history = [];
  let needs = null;
  for (const e of entries) {
    if (e.seq > upto) break;
    if (e.kind === "propose") needs = e.needs ?? needs;
    if (e.kind === "land" || e.kind === "supersede") { landed[e.leaf] = e; delete open[e.leaf]; }
    if (e.kind === "open" && !landed[e.leaf]) open[e.leaf] = e; // a leaf that has landed is not reopened by a later failed retry: the past stands
    history.push({ seq: e.seq, kind: e.kind, leaf: e.leaf ?? null });
  }
  const need = required.length ? required : [...new Set([...Object.keys(landed), ...Object.keys(open)])];
  return { cursor: upto, landed, open, passing: need.filter((l) => landed[l]).length, total: need.length, required: need, needs, history };
}
