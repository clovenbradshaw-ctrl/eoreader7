// adapters/build/code-anchor-log.js — code modification as one thing:
// typed acts on named anchors, on an append-only log, projected by a
// fold. Direct correction, verbatim, replacing podcast-app-council.mjs
// v2's byte-range splicing:
//
// "They should all be appending to a log, and the fold of the log should
// be the code linted, rational version of it, perhaps getting a manual
// INS. Individual writers MUST NOT be expected to know anything
// whatsoever about the whole. It is the unavoidable dependency order of
// reality and the stable basins of emergent structure that make it
// coherent... I don't like the current idea of a few different ways the
// code can be modified. [Use] the full power of the nine operators if
// there are contradictory statements made about a given anchor. The
// whole point is that the transformation IS the operation. If you replay
// the fold you go with the latest version, but you also have things like
// REC that can fundamentally re-zero what it means at that cursor, and
// many different versions of temporality to play with."
//
// WHY BYTE-RANGE SPLICING WAS THE WRONG UNIT, found live (podcast-app-
// council.mjs v2, rounds 7 and 9): an isolated writer given an arbitrary
// slice of the file has NOTHING structurally stopping it from emitting a
// document-closing tag it never should have touched, or leaving the
// original code's own tail dangling after a partial replacement. Both
// were caught only by POST-HOC checks I bolted on (fragmentOverstepsScope,
// documentWellFormed) — real, but reactive: the writer's ignorance of the
// whole was never structurally impossible, only usually-caught-after.
//
// THIS MODULE'S ANSWER: a TEMPLATE is a fixed skeleton with NAMED SLOTS
// (`{{ANCHOR:name}}`). A writer is handed ONLY an anchor's own declared
// CONTRACT and current content — never the skeleton, never another
// anchor's content, never the whole file. It is now STRUCTURALLY
// IMPOSSIBLE for a writer's output to touch document structure or another
// anchor's code, because that text is never in its context and the fold
// never asks the writer to reproduce it. This is "individual writers must
// not know about the whole" made true by construction, not by policy.
//
// CONTRADICTION, HANDLED BY THE OPERATOR ALGEBRA, NEVER BY MERGING TEXT:
// if two proposals land for the SAME anchor in one round, that is
// detected structurally (two PROPOSE/SUPERSEDE entries with no
// intervening settlement) and adjudicated MECHANICALLY (EVA — never by
// asking a model to referee, never by silently concatenating both):
// each candidate is folded into the WHOLE document in place of that one
// anchor, and scored by the same mechanical checks the prior pass
// already built (documentWellFormed, coherenceGate) against the CURRENT
// settled whole. A candidate that holds and whose sibling doesn't is
// EVA'd `holds`; the loser is DEF'd `refused`. If both hold or neither
// does, the contest is EVA'd `undetermined` — the anchor's settled value
// is left at whatever it already was (never guessed), and the fold
// discloses that a manual INS or REC is invited to break the tie.
//
// TEMPORALITY: `foldCode(log, {atSeq})` replays the log up to any cursor,
// not only the latest — "many different versions of temporality" in the
// literal cursor sense this codebase already uses elsewhere (grid.js's
// `foldGrid`, build-log.js's `foldBuild`). REC is a qualitatively
// different event than an ordinary SUPERSEDE: it does not merely replace
// an anchor's content with a newer value, it CONCEDES the anchor's own
// settled understanding — the anchor returns to an unsettled (NUL) state,
// a typed gap, until something INS-es it again. A cursor taken just
// before a REC and one taken just after can disagree about what the
// anchor even MEANS, not only what its latest value is.
//
// NAMED, NOT BUILT: CON (a genuine complementary merge of two contested
// candidates, rather than one replacing the other) and SEG (an anchor
// found too coarse, split into finer anchors) are real, legitimate uses
// of the remaining two operators this module does not yet reach — used
// where they naturally fit (SIG for a reader's own finding, INS/SYN/EVA/
// DEF/REC for everything else), not forced onto every act to claim "all
// nine" when only seven are genuinely earned here.
//
// TWO FURTHER CORRECTIONS, direct, both changing what an anchor IS:
//
// "It can point in addition to splice." An anchor's settled value is not
// always literal content to copy into its slot — it can instead be a
// POINTER to another anchor referent, the identical move `nesting.js`'s
// `claim:<assertionId>` end-slot already makes (an end pointing at
// another note rather than embedding text). Two anchors that must behave
// IDENTICALLY can now be one referent addressed twice, rather than two
// independent copies with nothing stopping them from silently drifting
// apart — an invariance guarantee the splice-only version could not
// express at all. `resolveAnchor` follows a pointer chain to its literal
// content, refusing a cycle rather than looping.
//
// "A codebase is not a series of bytes. It is a series of meaningful
// arrangements of functions that transform bytes that enter their
// periphery." This corrects the anchor model itself: even a NAMED anchor
// was still, in the first cut, a slot of TEXT — a better unit than a
// byte range, but still a textual view. An anchor's real identity is the
// FUNCTION it computes (`episode -> label`, for the ethos badge), not
// whatever markup happens to implement it today — exactly what
// coherence-properties.mjs's own scorers were already doing (executing a
// candidate and checking its OUTPUT, never its text) without this
// module having noticed that was the general model for every anchor.
// Each anchor may now declare a CONTRACT — its own input/output test,
// run by EXECUTING the candidate directly, in isolation, with no
// document composition needed at all. `adjudicate` tries contract-based
// discrimination FIRST (local, cheap, semantically exact); the
// whole-document lint (documentWellFormed/coherenceGate) is the second line
// of defense for cross-anchor problems no single contract could see, not
// the primary decider it was before.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTaskLog, append, ENTRY_KINDS, OPERATOR_BASIS } from "../../kernel/task-log.js";
import { cellOf } from "../../kernel/cube.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

const cellFields = (op, grain) => {
  const c = cellOf(op, grain);
  if (!c || c.gap) return { cell_gap: c?.gap ?? "no_cell" };
  return { cell: `${c.op}·${c.grain}`, stance: c.stance, terrain: c.terrain, mode: c.mode, domain: c.domain };
};

/** kindForOperator — the kernel's own `kind` field is structural plumbing
 * (append() validates it against a small closed set so the fold knows
 * whether an entry starts a task, revises it, or merely evidences it) —
 * it is NOT a second, independently-chosen classification sitting beside
 * the operator. "The transformation IS the operation": `kind` is DERIVED
 * from the operator, mechanically, here, exactly once — never re-typed by
 * hand at each call site the way this file's own first cut did (six
 * separate `kind: ENTRY_KINDS.X` literals, one of them silently wrong).
 * Matches the one other consumer in this tree that already lands EVA/REC-
 * shaped acts (interpretation/declarations.js): an affirmative act is
 * PROPOSE/SUPERSEDE by INS/SYN; everything else an operator can do to an
 * anchor without re-founding it (SIG's own reading, EVA's judgment, DEF's
 * refusal, REC's concession) is EVIDENCE — evidence ABOUT the anchor,
 * never a new proposal for its content. */
function kindForOperator(operator) {
  if (operator === "INS") return ENTRY_KINDS.PROPOSE;
  if (operator === "SYN") return ENTRY_KINDS.SUPERSEDE;
  return ENTRY_KINDS.EVIDENCE; // SIG, EVA, DEF, REC
}

export function readAnchorLog(file) {
  let log = createTaskLog();
  if (!file || !fs.existsSync(file)) return log;
  const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    const { seq: _seq, ...rest } = entry;
    log = append(log, rest);
  }
  return log;
}

export function appendAnchorLog(file, log, fromSeq) {
  if (!file) return;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const lines = log.entries.slice(fromSeq).map((e) => JSON.stringify(e)).join("\n");
  if (lines) fs.appendFileSync(file, `${lines}\n`, "utf8");
}

const anchorTaskId = (anchor) => `anchor:${anchor}`;

/** proposeAnchor — lands INS (the anchor's first-ever content, or its
 * first content since a REC re-zeroed it to a gap) or SYN (an ordinary
 * revision of an already-settled anchor). The decision is read straight
 * off `settledContent`'s own round-aware fold — never off the kernel's
 * generic PROPOSE/RETRACT projector, which knows nothing about this
 * module's own REC-as-re-zero or same-round-contest semantics. */
export function proposeAnchor(log, { anchor, content = null, pointsTo = null, round, writer, writerAudit = null }) {
  if (content != null && pointsTo != null) throw new TypeError("proposeAnchor: a proposal that both splices content AND points elsewhere is two proposals wearing one — pick one");
  if (content == null && pointsTo == null) throw new TypeError("proposeAnchor: a proposal with neither content nor a pointer is not a proposal");
  if (content != null && (typeof content !== "string" || !content.trim())) throw new TypeError("proposeAnchor: an anchor proposal with blank content is not a proposal");
  if (pointsTo === anchor) throw new TypeError("proposeAnchor: an anchor cannot point at itself — that is a cycle of length one");
  const taskId = anchorTaskId(anchor);
  const before = settledContent(log, anchor);
  const isFirst = before.content === null && before.pointsTo === null && !before.contested;
  const op = isFirst ? "INS" : "SYN";
  const entry = {
    kind: kindForOperator(op),
    task_id: taskId, operator: op, operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Figure",
    ...cellFields(op, "Figure"),
    description: isFirst
      ? `anchor "${anchor}" first proposed (round ${round}, ${writer})${pointsTo ? ` — points at "${pointsTo}"` : ""}`
      : `anchor "${anchor}" revision proposed (round ${round}, ${writer})${pointsTo ? ` — points at "${pointsTo}"` : ""}`,
    anchor, round, writer, content, pointsTo,
  };
  log = append(log, entry);
  if (writerAudit) {
    log = append(log, {
      kind: kindForOperator("SIG"), task_id: `audit:${taskId}:${round}:${writer}:${log.nextSeq}`, operator: "SIG", operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Ground",
      ...cellFields("SIG", "Ground"),
      description: `${writer}'s own prompt/response for anchor "${anchor}", round ${round}`,
      anchor, round, ...writerAudit,
    });
  }
  return log;
}

/** landCritique — a reader's own finding, naming which anchor it
 * concerns and why, grounded in a structural property (never a citation
 * handed to a writer — see coherence-properties.mjs's own header for why).
 * Stigmergic: a critique is a read of the shared material, never a call
 * to another reader or to a writer. */
export function landAnchorCritique(log, { round, anchor, property, problem, readerAudit = null }) {
  if (!anchor || !property || !problem) throw new TypeError("landAnchorCritique: a critique naming no anchor, property, and problem is not a finding");
  const entry = {
    kind: kindForOperator("SIG"), task_id: `critique:${anchorTaskId(anchor)}:${round}:${property}:${log.nextSeq}`, operator: "SIG", operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Ground",
    ...cellFields("SIG", "Ground"),
    description: `${property} reading of anchor "${anchor}", round ${round}`,
    round, anchor, property, problem,
  };
  log = append(log, entry);
  if (readerAudit) {
    log = append(log, {
      kind: kindForOperator("SIG"), task_id: `audit:critique:${anchorTaskId(anchor)}:${round}:${property}:${log.nextSeq}`, operator: "SIG", operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Ground",
      ...cellFields("SIG", "Ground"),
      description: `${property} reader's own prompt/response, round ${round}`,
      round, anchor, property, ...readerAudit,
    });
  }
  return log;
}

/** anchorEntries(log, anchor) — the raw PROPOSE/SUPERSEDE/EVA/DEF/REC
 * history for one anchor, in landing order. */
function anchorEntries(log, anchor, atSeq = Infinity) {
  const taskId = anchorTaskId(anchor);
  return log.entries.filter((e) => e.task_id === taskId && e.seq <= atSeq);
}

/**
 * settledContent(log, anchor, atSeq) — the anchor's own fold, replaying
 * its entries up to a cursor. An ordinary chain of INS then SYN just
 * returns the latest. A REC entry re-zeros: everything before it is
 * conceded, and the anchor reads as an unsettled gap (NUL) until the
 * next INS after the REC. A CONTEST (two live proposals with no EVA
 * between them yet) reads as unsettled UNTIL an EVA entry lands — the
 * fold never guesses between undecided candidates.
 */
export function settledContent(log, anchor, atSeq = Infinity) {
  const entries = anchorEntries(log, anchor, atSeq);
  let content = null;
  let pointsTo = null;
  let batch = []; // proposals accumulated for the CURRENT round, not yet resolved
  let batchRound = null;

  const closeBatch = () => {
    // A round that ended with exactly one proposal is an ORDINARY
    // revision (the common case: one writer per anchor per round) — it
    // auto-settles with no EVA needed. Two or more sharing a round is a
    // genuine concurrent contradiction, left open for adjudicate().
    if (batch.length === 1) { content = batch[0].content; pointsTo = batch[0].pointsTo ?? null; }
  };

  for (const e of entries) {
    if (e.operator === "REC") { closeBatch(); content = null; pointsTo = null; batch = []; batchRound = null; continue; }
    if (e.kind === ENTRY_KINDS.PROPOSE || e.kind === ENTRY_KINDS.SUPERSEDE) {
      if (e.round !== batchRound) { closeBatch(); batch = [e]; batchRound = e.round; }
      else batch.push(e);
    } else if (e.kind === "EVA" || e.operator === "EVA") {
      // An adjudicated round is CLOSED by the EVA itself, regardless of
      // how many candidates were in the batch — never re-derived by
      // closeBatch's own single-candidate rule.
      if (e.verdict === "holds" && (e.winner != null || e.winnerPointsTo != null)) { content = e.winner ?? null; pointsTo = e.winnerPointsTo ?? null; }
      // undetermined: content/pointsTo stay whatever they already were.
      batch = [];
      batchRound = null;
    }
  }
  closeBatch();
  const contested = batch.length > 1 ? batch.map((c) => ({ writer: c.writer, content: c.content, pointsTo: c.pointsTo ?? null, seq: c.seq })) : null;
  return { content, pointsTo, contested };
}

/** resolveAnchor(log, anchor, atSeq) — follows a settled POINTER chain to
 * its literal content, the way a referent index follows a mention to the
 * being it names. A cycle (A points at B, B points at A) is refused as a
 * typed result, never an infinite loop — the same "coherent" discipline
 * this module's whole design exists to hold, applied to pointers too. */
export function resolveAnchor(log, anchor, atSeq = Infinity, seen = new Set()) {
  if (seen.has(anchor)) return { content: null, cycle: [...seen, anchor] };
  const { content, pointsTo } = settledContent(log, anchor, atSeq);
  if (pointsTo == null) return { content, cycle: null };
  return resolveAnchor(log, pointsTo, atSeq, new Set([...seen, anchor]));
}

/**
 * adjudicate(log, { anchor, template, wellFormed, coherenceGate, round }) —
 * EVA, mechanical, never a model asked to referee. Only called when
 * `settledContent` reports more than one live candidate for an anchor.
 * Each candidate is folded into the WHOLE document (every other anchor at
 * its own current settlement) and scored against the CURRENT settled
 * whole by the SAME two checks already built (documentWellFormed,
 * coherenceGate) — never by reading either candidate's own writer-authored
 * prose. Exactly one candidate clearing both where its sibling(s) do not
 * is declared the winner (EVA·Figure, verdict holds); every other
 * candidate is DEF'd refused. If zero or more than one candidate clears
 * both, the contest is EVA'd undetermined and the anchor's PRIOR settled
 * value (before this round's proposals) is what the fold keeps — a tie
 * or a universal failure is disclosed, never silently broken by picking
 * one arbitrarily.
 */
export async function adjudicate(log, { anchor, template, wellFormed, coherenceGate, round }) {
  const { contested } = settledContent(log, anchor, log.nextSeq - 1);
  if (!contested) return { log, verdict: "not_contested" };

  const cursor = contested[0].seq - 1;
  const priorSettled = settledContent(log, anchor, cursor).content;
  const contract = template.anchors[anchor]?.contract ?? null;

  // PRIMARY, LOCAL CHECK — "a codebase is a series of functions, not
  // bytes": if this anchor declares its own input/output contract, test
  // each candidate by EXECUTING it directly, resolved through any
  // pointer it names, with no document composition at all. This is
  // exact where the whole-document check is only structural, and it is
  // cheap — no template rendering, no coherence-gate walk over the whole file.
  let scored;
  let via = "whole-document";
  if (contract) {
    const contractScored = await Promise.all(contested.map(async (c) => {
      const resolved = c.pointsTo != null ? resolveAnchor(log, c.pointsTo, cursor) : { content: c.content, cycle: null };
      if (resolved.cycle) return { ...c, clears: false, contractDetail: `points into a cycle: ${resolved.cycle.join(" -> ")}` };
      const result = await contract(resolved.content);
      return { ...c, contractTested: result.tested !== false, clears: result.tested !== false && result.ok, contractDetail: result.detail ?? null };
    }));
    const allTested = contractScored.every((s) => s.contractTested !== false);
    const clearingByContract = contractScored.filter((s) => s.clears);
    if (allTested && clearingByContract.length === 1) {
      // The contract alone discriminates — decisive, no fallback needed.
      scored = contractScored.map((s) => ({ ...s, wellFormedProblems: [], coherenceRegressions: [] }));
      via = "contract";
    }
  }

  // FALLBACK — the contract is absent, or could not discriminate (all
  // candidates passed it, none did, or it was inconclusive). Compose the
  // WHOLE document per candidate and run the structural/coherence checks
  // already built — the second line of defense for cross-anchor problems
  // no single anchor's own contract could ever see.
  if (!scored) {
    const currentWhole = renderTemplate(template, anchorMapFrom(log, template, cursor));
    scored = await Promise.all(contested.map(async (c) => {
      const resolved = c.pointsTo != null ? resolveAnchor(log, c.pointsTo, cursor) : { content: c.content, cycle: null };
      if (resolved.cycle) return { ...c, clears: false, wellFormedProblems: [`points into a cycle: ${resolved.cycle.join(" -> ")}`], coherenceRegressions: [] };
      const candidateWhole = renderTemplate(template, { ...anchorMapFrom(log, template, cursor), [anchor]: resolved.content });
      const wf = wellFormed(candidateWhole);
      const hg = wf.wellFormed ? await coherenceGate(currentWhole, candidateWhole) : { halted: true, regressions: [{ property: "well-formedness", before: "n/a", after: "n/a" }] };
      return { ...c, clears: wf.wellFormed && !hg.halted, wellFormedProblems: wf.problems, coherenceRegressions: hg.regressions ?? [] };
    }));
  }

  const clearing = scored.filter((s) => s.clears);
  let verdict; let winner = null; let winnerPointsTo = null;
  if (clearing.length === 1) { verdict = "holds"; winner = clearing[0].content ?? null; winnerPointsTo = clearing[0].pointsTo ?? null; }
  else verdict = "undetermined";

  const entry = {
    kind: kindForOperator("EVA"), task_id: anchorTaskId(anchor), operator: "EVA", operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Figure",
    ...cellFields("EVA", "Figure"),
    description: `adjudicating ${contested.length} contested proposal(s) for anchor "${anchor}", round ${round}: ${verdict} (via ${via})`,
    anchor, round, verdict, winner, winnerPointsTo, via,
    candidates: scored.map((s) => ({ writer: s.writer, seq: s.seq, pointsTo: s.pointsTo ?? null, clears: s.clears, wellFormedProblems: s.wellFormedProblems ?? [], coherenceRegressions: s.coherenceRegressions ?? [], contractDetail: s.contractDetail ?? null })),
  };
  log = append(log, entry);

  for (const s of scored) {
    if (s.clears && verdict === "holds" && s.seq === contested.find((c) => (c.content ?? null) === (winner ?? null) && (c.pointsTo ?? null) === (winnerPointsTo ?? null))?.seq) continue;
    log = append(log, {
      kind: kindForOperator("DEF"), task_id: anchorTaskId(anchor), operator: "DEF", operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Figure",
      ...cellFields("DEF", "Figure"),
      description: `refusing ${s.writer}'s proposal for anchor "${anchor}", round ${round} (${s.clears ? "tied with another clearing candidate" : "did not clear checks"}, via ${via})`,
      anchor, round, writer: s.writer, reason: s.clears ? "tied_with_clearing_sibling" : "failed_checks",
    });
  }

  return { log, verdict, winner, winnerPointsTo, via, priorSettled, scored };
}

/** concedeAnchor — REC·Figure. Not a newer value; a re-zero of what the
 * anchor even means. After this, the anchor reads as an unsettled gap
 * (NUL) until something proposes into it again. Mirrors grid.js's own
 * concedeEvaluation exactly, one register over (code anchors instead of
 * evaluated claims). */
export function concedeAnchor(log, { anchor, trigger, by, round }) {
  if (!trigger) throw new TypeError("concedeAnchor: a concession with no stated trigger is not a concession");
  return append(log, {
    kind: kindForOperator("REC"), task_id: anchorTaskId(anchor), operator: "REC", operator_basis: OPERATOR_BASIS.PRODUCED, grain: "Figure",
    ...cellFields("REC", "Figure"),
    description: `anchor "${anchor}" conceded, round ${round}: ${trigger}`,
    anchor, round, trigger, by: by ?? null,
  });
}

function anchorMapFrom(log, template, atSeq) {
  const map = {};
  for (const anchor of Object.keys(template.anchors)) {
    const { content, cycle } = resolveAnchor(log, anchor, atSeq);
    // A cycle is disclosed via the default, never a crash and never a
    // silent empty string masquerading as "nothing to say" — foldCode's
    // own lint pass is where a caller actually sees this named.
    map[anchor] = cycle ? (template.anchors[anchor].default ?? "") : (content ?? template.anchors[anchor].default ?? "");
  }
  return map;
}

function renderTemplate(template, anchorMap) {
  let out = template.skeleton;
  for (const [anchor, content] of Object.entries(anchorMap)) {
    out = out.split(`{{ANCHOR:${anchor}}}`).join(content);
  }
  return out;
}

/**
 * foldCode(log, template, { atSeq, wellFormed, coherenceGate } = {}) — THE
 * FOLD. Composes the current (or as-of-cursor) settled content of every
 * anchor into the template's fixed skeleton. This is "the fold of the
 * log is the code, linted, rational version of it": if `wellFormed`/
 * `coherenceGate` are supplied, the COMPOSED WHOLE is checked one more time
 * (anchors that individually looked fine can still compose into a
 * problem no single anchor's own view could see) and the result is
 * disclosed as `lintProblems` rather than silently returned as if clean
 * — the honest invitation for a manual INS is exactly this: a fold that
 * cannot compose cleanly from settled anchors alone names what broke,
 * rather than guessing or crashing.
 */
export async function foldCode(log, template, { atSeq = Infinity, wellFormed = null, coherenceGate = null, priorHtml = null } = {}) {
  const anchorMap = anchorMapFrom(log, template, atSeq);
  const cycles = [];
  const unsettled = Object.keys(template.anchors).filter((a) => {
    const s = settledContent(log, a, atSeq);
    if (s.content === null && s.pointsTo === null) return !template.anchors[a].default;
    if (s.pointsTo != null) {
      const r = resolveAnchor(log, a, atSeq);
      if (r.cycle) { cycles.push({ anchor: a, cycle: r.cycle }); return !template.anchors[a].default; }
    }
    return false;
  });
  const html = renderTemplate(template, anchorMap);
  const lintProblems = cycles.map((c) => `anchor "${c.anchor}" points in a cycle: ${c.cycle.join(" -> ")}`);
  if (wellFormed) {
    const wf = wellFormed(html);
    if (!wf.wellFormed) lintProblems.push(...wf.problems);
  }
  if (coherenceGate && priorHtml) {
    const hg = await coherenceGate(priorHtml, html);
    if (hg.halted) lintProblems.push(...hg.regressions.map((r) => `${r.property} regressed ${r.before} -> ${r.after} in the composed whole`));
  }
  return { html, unsettled, lintProblems, clean: unsettled.length === 0 && lintProblems.length === 0 };
}

export function anchorHistory(log, anchor) {
  return anchorEntries(log, anchor).map((e) => ({ seq: e.seq, kind: e.kind, operator: e.operator, round: e.round, writer: e.writer ?? null, content: e.content ?? null, verdict: e.verdict ?? null, trigger: e.trigger ?? null }));
}
