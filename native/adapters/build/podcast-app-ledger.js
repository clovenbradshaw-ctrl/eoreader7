// adapters/build/podcast-app-ledger.js — the UI-codegen artifact's own
// append-only ledger, closing a real gap found live: podcast-app-codegen.mjs
// was overwriting podcast-app-generated.html on disk on every single round
// (mechanical-repair AND --improve steering alike), destroying every prior
// round's artifact with no record — a genuine violation of I-append (THE-
// ENZYME-PIPELINE.md §1: "the artifact only grows. Nothing is deleted in
// place; release is a recorded act, never an erasure"), and the exact
// discipline podcast.js already holds itself to for spoken segments
// (landSegment: PROPOSE then SUPERSEDE, same task_id, never destroyed).
//
// ONE artifact, ONE task_id ("podcast-app"): the very first round lands
// INS·Figure (a birth); every later round — whether the DMD loop's own
// mechanical repair or a person's --improve steering ask — lands SYN·Figure
// (a revision of the SAME standing thing), matching podcast.js's own
// landSegment convention exactly rather than inventing a second one.
// projectTasks(log) folds this into the CURRENT html; log.entries keeps
// every version that ever existed, forever, queryable by seq.
//
// PURE except for the optional JSONL persistence (fs), the same posture
// correction-rule.js already holds for its own ledger.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTaskLog, append, projectTasks, ENTRY_KINDS, OPERATOR_BASIS } from "../../kernel/task-log.js";
import { cellOf } from "../../kernel/cube.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LEDGER_FILE = path.join(HERE, "..", "..", "the-fold", "surface", "podcast-app-ledger.jsonl");

export function podcastAppLedgerFile(explicit) {
  return explicit ?? process.env.ER7_PODCAST_APP_LEDGER ?? DEFAULT_LEDGER_FILE;
}

const TASK_ID = "podcast-app";

const cellFields = (op, grain) => {
  const c = cellOf(op, grain);
  if (!c || c.gap) return { cell_gap: c?.gap ?? "no_cell" };
  return { cell: `${c.op}·${c.grain}`, stance: c.stance, terrain: c.terrain, mode: c.mode, domain: c.domain };
};

/** readAppLedger(file) — replay the persisted JSONL into a real task-log,
 * exactly the append-only resumption property this codebase's other ledgers
 * already hold ("a re-append from the serialized record lines alone
 * reproduces the same log, byte-for-byte"). Each persisted line is a sealed
 * entry; `seq` is stripped and let `append()` re-derive it, since replaying
 * in original order reproduces the identical sequence. */
export function readAppLedger(file) {
  const f = podcastAppLedgerFile(file);
  let log = createTaskLog();
  if (!fs.existsSync(f)) return log;
  const lines = fs.readFileSync(f, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const { seq: _seq, ...rest } = entry;
    log = append(log, rest);
  }
  return log;
}

/**
 * landAppRound(log, {round, mode, instruction, html, check, audit, fresh}) —
 * lands one round of the UI-codegen loop as an entry on the SAME standing
 * task. `round === 1` (nothing yet in the log for this task) is INS·Figure
 * (a birth, matching podcast.js's landSegment); every later round is
 * SYN·Figure (a revision), whether it came from the mechanical DMD-bounded
 * repair loop or a person's --improve steering ask — both are the operator
 * judging the standing artifact and asking for a new version, the same act
 * either way. Nothing is ever removed; `projectTasks` gives the fold.
 */
export function landAppRound(log, { round, mode, instruction = null, html, check, audit = null, fresh = false }) {
  if (typeof html !== "string" || !html.trim()) throw new TypeError("landAppRound: a round with no html is not a round");
  const existing = projectTasks(log).find((t) => t.task_id === TASK_ID);
  const isFirst = !existing || existing.operator_basis === OPERATOR_BASIS.ABSENT;
  const op = isFirst ? "INS" : "SYN";
  const entry = {
    kind: isFirst ? ENTRY_KINDS.PROPOSE : ENTRY_KINDS.SUPERSEDE,
    task_id: TASK_ID, operator: op, operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Figure",
    ...cellFields(op, "Figure"),
    description: isFirst
      ? `podcast app first generated (round ${round}, mode ${mode})`
      : `podcast app revised (round ${round}, mode ${mode}${instruction ? `: ${instruction}` : ""}${fresh ? ", fresh restart" : ""})`,
    round, mode, instruction, html, check, fresh,
  };
  log = append(log, entry);
  if (audit) {
    const auditEntry = {
      kind: ENTRY_KINDS.EVIDENCE, task_id: `audit:${TASK_ID}:${round}:${log.nextSeq}`, operator: "SIG", operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Ground",
      ...cellFields("SIG", "Ground"),
      description: `codegen prompt to the mouth for round ${round} — recorded verbatim for audit`,
      round, request: audit.request, rawResponse: audit.rawResponse, durationMs: audit.durationMs ?? null, model: audit.model ?? null,
    };
    log = append(log, auditEntry);
  }
  return log;
}

/** appendAppRound(file, log, fromSeq) — persist every entry from `fromSeq`
 * onward, append-only (never rewrites a prior line), so a crash mid-run
 * leaves whatever landed intact rather than corrupting a rewritten file. */
export function appendAppRound(file, log, fromSeq) {
  const f = podcastAppLedgerFile(file);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const lines = log.entries.slice(fromSeq).map((e) => JSON.stringify(e)).join("\n");
  if (lines) fs.appendFileSync(f, `${lines}\n`, "utf8");
}

/** projectApp(log) — the fold: the CURRENT html/check/round, derived from
 * the whole history without ever mutating or discarding it. */
export function projectApp(log) {
  return projectTasks(log).find((t) => t.task_id === TASK_ID) ?? null;
}

/** historyOf(log) — every round that ever landed, oldest first, for a
 * reader who wants the full history rather than only the current fold. */
export function historyOf(log) {
  return log.entries.filter((e) => e.task_id === TASK_ID).map((e) => ({
    seq: e.seq, kind: e.kind, round: e.round, mode: e.mode, instruction: e.instruction ?? null,
    fresh: e.fresh ?? false, html: e.html, check: e.check,
  }));
}

/**
 * landCritique — an n-ary agent's own reading of the CURRENT app, grounded
 * in a real citation (a giver, never a bare adjective), landed as its own
 * EVIDENCE entry on the SAME shared ledger. Stigmergic by construction: a
 * critic never calls the writer and never calls another critic — it only
 * writes its own cell to the shared environment. The synthesis step (the
 * one thing that DOES read multiple critics) finds them the same way any
 * enzyme reads the environment: by folding the log, not by being handed
 * them directly.
 */
export function landCritique(log, { round, virtue, giver, citation, note, audit = null }) {
  if (!virtue || !giver || !citation) throw new TypeError("landCritique: a critique with no giver is an opinion wearing a citation's clothes");
  if (typeof note !== "string" || !note.trim()) throw new TypeError("landCritique: a critique that says nothing is not a critique");
  const op = "SIG";
  const entry = {
    kind: ENTRY_KINDS.EVIDENCE, task_id: `critique:${TASK_ID}:${round}:${virtue}:${log.nextSeq}`, operator: op, operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Ground",
    ...cellFields(op, "Ground"),
    description: `${virtue} critique of round ${round}, grounded in ${giver}`,
    round, virtue, giver, citation, note,
  };
  log = append(log, entry);
  if (audit) {
    const auditEntry = {
      kind: ENTRY_KINDS.EVIDENCE, task_id: `audit:critique:${TASK_ID}:${round}:${virtue}:${log.nextSeq}`, operator: "SIG", operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Ground",
      ...cellFields("SIG", "Ground"),
      description: `${virtue} critic's own prompt/response for round ${round} — recorded verbatim`,
      round, virtue, request: audit.request, rawResponse: audit.rawResponse, durationMs: audit.durationMs ?? null, model: audit.model ?? null,
    };
    log = append(log, auditEntry);
  }
  return log;
}

/** critiquesFor(log, round) — the environment a synthesis step reads: every
 * critique landed for a given round, in the order they arrived. Never a
 * direct call to whatever produced them — the fold IS the read. */
export function critiquesFor(log, round) {
  return log.entries
    .filter((e) => e.task_id?.startsWith(`critique:${TASK_ID}:${round}:`) && !e.task_id.startsWith(`audit:`))
    .map((e) => ({ virtue: e.virtue, giver: e.giver, citation: e.citation, note: e.note }));
}
