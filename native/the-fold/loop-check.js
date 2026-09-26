// loop-check.js — EVERY LOOP OF THE SPIRAL MUST LEAVE SOMETHING USEFUL
// (2026-09-21). The user: "every loop of the spiral, let's check that we're
// creating something useful." The ledger is append-only; the PIECE is not
// allowed to get worse. Each loop's piece is measured against the last one's,
// and a loop that lost ground is undone — the additive-layers rule: the floor
// is already a fine piece, and every layer above must beat or match it.
//
// Measured, in order of precedence:
//   carried    statements of the (selected) draft whose anchors the piece
//              still carries — truth first;
//   answered   the ask's questions that some part still answers;
//   licensed   archon findings still licensing a revision;
//   size       sentences and words, reported, never judged.

import { drawnParts } from "./eot-draft.js";
import { anchorsFor, carries } from "./prosify.js";
import { readPiece } from "./revision-spiral.js";
import { askQuestions } from "./steer.js";

export const LOOP_SCHEMA = "EOLoopCheck@1";

/** The piece as the floor: every selected statement as its own source
 *  sentence, in outline order. True by construction; loop zero. */
export function floorPiece(draft) {
  return drawnParts(draft).map((p) => ({ id: p.id, pieces: p.children.map((pt) => ({ text: pt.text, carries: [pt.id] })) }));
}

export function measurePiece(piece, { draft, ground = "", task = "", parse = null, loadBearing = null } = {}) {
  const A = anchorsFor(draft);
  const said = piece.flatMap((p) => (p.pieces ?? []).map((pc) => pc.text));
  const ids = drawnParts(draft).flatMap((p) => p.children.map((pt) => pt.id));
  const carried = ids.filter((id) => carries(A.get(id), said).ok).length;
  // The ASK's questions, not the ones some section happened to be placed
  // under (measured: OHS read "answers 2 of 2" with no section placed under
  // "what the audit found").
  const asked = askQuestions(task);
  const questions = asked.length > 1 ? asked : [];
  const present = new Set(piece.filter((p) => (p.pieces ?? []).length).map((p) => drawnParts(draft).find((d) => d.id === p.id)?.answers).filter(Boolean));
  const read = readPiece({ piece, draft, ground, task, parse });
  const licensed = read.findings.filter((f) => f.licenses).length;
  return {
    carried, of: ids.length,
    answered: questions.length ? questions.filter((q) => present.has(q)).length : null, questions: questions.length,
    licensed,
    sentences: said.length, words: said.join(" ").split(/\s+/).filter(Boolean).length,
    // PASSTHROUGH ONLY (2026-09-26): the caller's own already-computed
    // arrangeEssay loadBearing value, carried through to this measurement
    // and its ledger line so it is visible at the loop-quality stage --
    // never computed here, never read by judgeLoop's decision below, and
    // null (the existing default) on every caller that does not supply it.
    loadBearing,
  };
}

/** Did this loop leave the piece at least as useful as the last one? Truth
 *  first: fewer facts carried, or fewer questions answered, is worse whatever
 *  else improved; then more findings licensing a revision is worse. */
//  Each loop is judged on ITS OWN charge (measured: judging the prose loop
//  against the floor's zero findings undid every prose pass, and the pipeline
//  fell back to the source sentences). The prose loop's charge is voice, so
//  new findings are its expected work for the loops after it; it may not lose
//  facts or questions. Every later loop exists to reduce findings, so it may
//  not add any either.
export function judgeLoop(prev, now, { addsFindings = false } = {}) {
  if (!prev) return { verdict: "first", keep: true, why: "loop zero: the floor, true by construction" };
  if (now.carried < prev.carried) return { verdict: "worse", keep: false, why: `carries ${now.carried} of ${now.of} facts, the last loop carried ${prev.carried}` };
  if (now.answered != null && prev.answered != null && now.answered < prev.answered) return { verdict: "worse", keep: false, why: `answers ${now.answered} of ${now.questions} questions, the last loop answered ${prev.answered}` };
  if (now.licensed > prev.licensed && addsFindings) return { verdict: "kept", keep: true, why: `loses nothing it may not; ${now.licensed - prev.licensed} new finding(s) are for the loops after it to read` };
  if (now.licensed > prev.licensed) return { verdict: "worse", keep: false, why: `${now.licensed} findings still license a revision, the last loop left ${prev.licensed}` };
  const better = now.carried > prev.carried || now.licensed < prev.licensed || (now.answered ?? 0) > (prev.answered ?? 0);
  return { verdict: better ? "better" : "same", keep: true, why: better ? "gains on truth or findings, loses nothing" : "loses nothing" };
}

export function loopLine(name, m, j) {
  const loadBearingNote = m.loadBearing != null ? ` · thesis load-bearing: ${m.loadBearing}` : "";
  return `${name}: ${j.verdict}${j.keep ? "" : " — UNDONE"}\ncarries ${m.carried} of ${m.of} facts${m.questions ? ` · answers ${m.answered} of ${m.questions} questions` : ""} · ${m.licensed} finding(s) licensing a revision · ${m.sentences} sentences, ${m.words} words${loadBearingNote}\n${j.why}`;
}
