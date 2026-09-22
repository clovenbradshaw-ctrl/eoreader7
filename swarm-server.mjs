// swarm-server.mjs — the chat wire-up for capacity-swarm.
//
// NL in a chat names the pointing; this module does the rest with the REAL
// organs (never stubs): makeCapacityRunner over cast.js's makeReferentIndex
// + reader-bundle.js's engineRelationsFor, the same reader the proxy turn
// feeds its own reading surface from. No model call, no hand-set threshold:
// the bar is measured per turn (seed-best yield rerun RERUN_NULL.draws
// times through elenchusBar — deterministic yields collapse it to epsilon,
// a measured nonzero floor would be honored).
//
// Entry points:
//   runSwarmTurn({ task, texts, history, name, query, claim, force })
//     task    — the raw NL chat string (the pointing)
//     texts   — [{ name, text }] material the person pointed at
//               (attachments; absent material yields 0 everywhere and the
//               gate honestly refuses it all)
//     history — [{ name, text }] the conversation's prior turns: read by
//               a swarm the NL or `force` routed, NEVER by the hard-meaning
//               trigger (prior answers' citation marks are not garble)
//     force   — true from the explicit POST /v1/swarm endpoint (run the
//               pointing even when the auto-route phrasing is absent);
//               false from the chat auto-route (only swarm phrasing routes)
// Returns a JSON-safe report (no functions, no Maps) + `answer` prose.
import { makeCapacityRunner } from "./native/organs/capacity-runner.js";
import { makeReferentIndex } from "./native/organs/cast.js";
import { engineRelationsFor } from "./native/the-fold/reader-bundle.js";
import { splitSentences } from "./native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents, namesCorefer, diaNorm } from "./native/adapters/text/surfaces.js";
import { elenchusBar, RERUN_NULL } from "./native/eval/lavar/elenchus-bar.mjs";
import { detectSwarmIntent, pointCapacities, swarmCapacities } from "./native/eval/lavar/capacity-swarm.mjs";
import { detectHardMeaning, signalControl } from "./native/eval/lavar/hard-meaning.mjs";
import { contentRuleFor, preserveContentRule } from "./content-rules.mjs";
import { TERRAINS } from "./native/kernel/terrain-state.js";
import { cellOf } from "./native/kernel/cube.js";
import { renderAntimatterLine } from "./native/kernel/antimatter.js";

let _runCapacity = null;
/** The proxy's own capacity dispatch — built once, same organs as the turn. */
export function swarmRunCapacity() {
  if (!_runCapacity) {
    const referentIndexFor = makeReferentIndex({
      splitSentences, extractSurfaces, discoverReferents, namesCorefer, diaNorm,
    });
    const relationsFor = (chunks) => engineRelationsFor(chunks);
    _runCapacity = makeCapacityRunner({ referentIndexFor, relationsFor });
  }
  return _runCapacity;
}

/** The terrain of a framing — its OWN cube cell first (derived from its
 * op+grain, the same inverse capacityAnt used to derive grain from the row's
 * terrain; never a guess — a derivation that fails is a typed absence), the
 * carried label only as fallback. FALSIFIED 2026-09-19, twice: (1) the seed
 * census dropped terrain and the residue once reported the whole cube
 * untouched while framings demonstrably occupied terrains; (2) carried-wins
 * made a differentiated ant report its parent's terrain label against its
 * own cell — a report contradicting its own persona. The cell is the
 * framing's own record; the carried label is the registry's claim, and the
 * cell wins when both exist. */
export function antTerrain(a) {
  const cell = a?.op && a?.grain ? cellOf(a.op, a.grain) : null;
  const derived = cell && !cell.gap ? cell.terrain : null;
  return derived ?? a?.terrain ?? null;
}

/** Measured bar for this turn's material: the seed-best yield, rerun the
 * declared draws times, through elenchusBar. Deterministic organ yields
 * rerun identically, so the floor collapses to epsilon — measured, not set. */
export function measuredBar(runCapacity, seeds, text, name) {
  const yields = seeds.map((s) => {
    try {
      const r = runCapacity(s.capacity, { text, name });
      return r?.gap ? 0 : (r?.referents?.length ?? r?.edges?.length ?? r?.fillers?.length ?? r?.count ?? 0);
    } catch { return 0; }
  });
  const best = Math.max(0, ...yields);
  return elenchusBar(Array.from({ length: RERUN_NULL.draws }, () => best));
}

// ── THE SWARM'S ANTI-MATTER (the essay "The anti-matter of every terrain",
// section six: the swarm is the collision chamber, and the surviving read
// carries its named holes). Derived from the framings' OWN records — the
// terrains the ants occupied against the nine, and the ants that could not
// read (their typed gaps ARE the questions this chain cannot answer). The
// residue is the anti-matter of the swarm: matter (the admitted framings)
// meets anti-matter (the gapped and silent framings), and what survives is a
// question, not an answer — a gap is a result, and the swarm's holes ride
// with its findings.
//
// FALSIFIED 2026-09-19 (three holes found, closed):
//   1. a framing's persona gap (a row with no cube coordinates — the
//      capacity's own typed hole) was dropped; it is a question the chain
//      cannot answer and is now carried;
//   2. a framing's terrain was trusted unvalidated — a "Bogus" terrain would
//      break the closure (touched ∩ untouched ≠ ∅) silently; terrains are
//      now checked against the cube's own nine;
//   3. a framing with no terrain is counted unplaced, never guessed into a
//      terrain — and when NO framing carries a terrain, the line reports all
//      nine untouched: honest (the swarm's records back it), and the unplaced
//      count is what makes the vacuity checkable. */
export function swarmResidue(ants = [], { question = null } = {}) {
  const list = Array.isArray(ants) ? ants : [];
  const touched = new Set();
  const questions = [];
  let unplaced = 0;
  let personaGaps = 0;
  for (const a of list) {
    // THE TERRAIN IS NEVER TRUSTED UNRESOLVED: a framing's own cell (op+grain,
    // antTerrain) is its record — a carried label that contradicts it is the
    // parent's, never the framing's (falsified 2026-09-19); a framing with
    // neither is unplaced, never guessed.
    const terrain = antTerrain(a);
    if (terrain && TERRAINS.includes(terrain)) touched.add(terrain);
    else if (a) unplaced += 1;
    if (typeof a?.gap === "string") questions.push(a.gap);
    if (typeof a?.persona?.gap === "string") {
      questions.push(a.persona.gap);
      personaGaps += 1;
    }
  }
  if (typeof question === "string" && question) questions.push(question);
  const untouched = TERRAINS.filter((t) => !touched.has(t));
  const unique = [...new Set(questions)];
  // THE SWARM'S CLAUSE IS ITS OWN CATEGORY: these questions are the
  // FRAMINGS' typed holes (machinery gaps), never the material's claims —
  // the essay's "holes of the framings", kept apart from the kernel's
  // "questions this chain cannot answer" (which are the material's own).
  const line = renderAntimatterLine({ untouched, questions: unique, clause: "holes of the framings" });
  return {
    schema: "EOSwarmAntimatter@1",
    touchedTerrains: [...touched],
    untouchedTerrains: untouched,
    questions: unique,
    line,
    counted: { touched: touched.size, untouched: untouched.length, questions: unique.length, unplaced, personaGaps },
    recordBound: true,
    disclosure: "the record of holes is itself a hole — the terrains no framing was pointed at are not on this list, and the questions the organs never raised are not among these questions; the residue is the swarm's own, derived from the framings' records, never guessed",
  };
}

export function runSwarmTurn({ task, texts = [], history = [], name = "chat-material", query, claim, force = false } = {}) {
  const intent = detectSwarmIntent(task);
  // THE HARD-MEANING TRIGGER (the protocol's trigger half): a turn pointed at
  // material whose meaning a plain reading cannot hold (garble, truncation,
  // density, a pointed-at void) routes to the swarm even when the NL never
  // names swarming. The detector is mechanical and conservative — ordinary
  // chat with clean material never fires (measured guard, 2026-09-19). The
  // ledger is consulted first: a content type with a standing rule is applied
  // by naming it, not re-derived from scratch. It reads the pointed-at texts
  // (else the task), never the history (falsified 2026-09-22: prior answers'
  // citation marks swarmed plain follow-up questions with no model call).
  const meaning = detectHardMeaning({ task, texts, history });
  const standing = meaning.hard ? contentRuleFor(meaning.type) : null;
  if (!intent.swarm && !force && !meaning.hard) return { routed: false, reason: intent.reason };
  const pointing = pointCapacities(task);
  if (pointing.gap) {
    const residue = swarmResidue([], { question: pointing.reason });
    return {
      routed: true, mode: "gap", answer: `Swarm: ${pointing.reason}.\nAnti-matter: ${residue.line}.`,
      pointed: [], best: null, ants: [],
      meaning, standing, residue,
    };
  }
  // The swarm reads what routed it. A trigger measured over the TASK (a blob
  // pasted as the message, nothing attached) makes the task the material —
  // else the swarm would answer about the history while its basis names the
  // task. Otherwise: the pointed texts, then the conversation, as before.
  const taskIsMaterial = meaning.hard && meaning.read === "task" && meaning.type !== "pointed_at_nothing";
  const text = taskIsMaterial
    ? String(task ?? "")
    : [...(texts ?? []), ...(history ?? [])].map((t) => (typeof t === "string" ? t : t?.text ?? "")).join("\n\n");
  const runCapacity = swarmRunCapacity();
  const bar = measuredBar(runCapacity, pointing.ants, text, name);
  const out = swarmCapacities({ nl: task, runCapacity, material: { text, name }, bar, query, claim });
  if (out.gap) {
    const residue = swarmResidue([], { question: out.reason });
    return { routed: true, mode: "gap", answer: `Swarm: ${out.reason}.\nAnti-matter: ${residue.line}.`, pointed: [], best: null, ants: [], meaning, standing, residue };
  }
  // reports[] (per-seed yield + raw result/gap) joined onto the census:
  // an executable capacity that measured zero is "measured nothing", a
  // gapped one is "reference-only" — conflating them would misreport noise
  // as incapacity and vice versa.
  const bySeed = new Map(out.reports.map((r) => [r.capacity, r]));
  const ants = out.swarm.ants.map((a) => {
    const rep = a.ids.length === 1 ? bySeed.get(a.ids[0]) : null;
    const gap = rep?.result?.gap ?? null;
    // THE TERRAIN, DERIVED WHEN THE CENSUS DROPPED IT (falsified 2026-09-19):
    // eoSwarm's seed census carries op+grain but not terrain — only bred and
    // differentiated ants do — so the residue once reported the whole cube
    // untouched while the framings demonstrably occupied terrains (their
    // stances resolved from those very op+grain pairs). antTerrain is the
    // SAME arithmetic capacityAnt used to derive grain from the row's
    // terrain — an inverse, never a guess; a carried terrain wins.
    const terrain = antTerrain(a);
    return {
      ids: a.ids, kind: a.kind, f: a.f, admitted: a.admitted,
      stance: a.stance ?? null,
      ...(rep ? { yield: rep.yield, ...(gap ? { gap } : { executable: true }) } : {}),
      // The persona gap carries its reason — "no_cube_coordinates" alone
      // tells a caller nothing about why (falsified 2026-09-19: the guard
      // was asymmetric — a missing persona dereferenced undefined).
      persona: a.persona?.gap
        ? { gap: a.persona.gap, ...(typeof a.persona.reason === "string" ? { reason: a.persona.reason } : {}) }
        : { archon: a.persona?.archon, label: a.persona?.label },
      ...(terrain ? { terrain } : {}),
    };
  });
  // THE SWARM'S ANTI-MATTER — the surviving read carries its named holes
  // (the essay's collision chamber, wired): the terrains no framing touched
  // and the typed gaps the framings could not read, on the record with the
  // swarm's findings. A gap is a result; the residue is a question.
  const residue = swarmResidue(ants);
  const report = {
    routed: true, mode: out.mode, bar,
    pointed: out.pointed,
    best: { ids: out.swarm.best.ids, f: out.swarm.best.f },
    ants,
    residue,
    answer: renderSwarmAnswer(out, bar, { meaning, standing, residue }),
    meaning, standing,
  };
  // THE RULE-AUTHOR HALF (the protocol's preserve half): a swarm that RAN on
  // hard material has just measured what the material holds. When the swarm
  // converged on signal — or failed in a way that is a property of the
  // content type, not this instance — the surviving read is written to the
  // ledger so the next turn pointed at the same type applies it instead of
  // re-deriving. Deterministic organ yields make the read reproducible.
  preserveHardMeaningRule({ meaning, out, bar });
  return report;
}

/** preserveHardMeaningRule — after a swarm runs on hard material, write the
 *  standing rule for that content type. Converged (best cleared the bar):
 *  the surviving capacities are the read. Failed with no material anywhere:
 *  the typed gap itself is the rule. Never called when meaning held. */
export function preserveHardMeaningRule({ meaning = null, out = null, bar = 0 } = {}) {
  if (!meaning?.hard || !meaning.type) return null;
  const falsifying = signalControl(meaning.type);
  const best = out?.swarm?.best ?? null;
  const converged = best && Number.isFinite(best.f) && best.f > bar && best.f > 0;
  const noMaterial = (out?.reports ?? []).every((r) => r?.result?.gap === "no_material");
  // A type that DEFEATED every executable capacity — material present, but
  // every seed measured zero — is a type-level finding: the plain capacities
  // cannot bind it, so the read must be a restoration first, never a trust.
  const materialPresent = (out?.reports ?? []).some((r) => r?.result?.gap !== "no_material");
  const defeatedEveryCapacity = materialPresent && (out?.reports ?? []).every((r) => {
    if (r?.result?.gap === "not_yet_executable") return true; // reference-only rows are not a defeat
    return (r?.yield ?? 0) === 0;
  });
  let read = null;
  if (converged) {
    read = `swarm converged: capacities ${best.ids.join("+")} measured signal ${best.f} on ${meaning.type} material — the surviving read is the capacities that bound the signal, not a single-pass guess`;
  } else if (noMaterial) {
    read = `swarm ran and every capacity measured "no_material" — the ${meaning.type} material has no readable ground; report the typed gap, never a confident reading`;
  } else if (defeatedEveryCapacity) {
    read = `swarm ran and every executable capacity measured zero on ${meaning.type} material — the plain capacities cannot bind it; restore the likely intended text first (${meaning.type}), then re-read, and report only meaning the restored reading and the literal both survive`;
  }
  if (!read) return null; // a non-converging swarm on hard material is a case to study, not a rule yet
  return preserveContentRule({
    type: meaning.type,
    signal: meaning.type,
    read,
    falsifying,
    basis: `hard meaning auto-routed this turn (${meaning.basis ?? meaning.type})`,
  });
}

/** Plain-prose answer — measured counts only, no model verdicts. */
export function renderSwarmAnswer(out, bar, { meaning = null, standing = null, residue = null } = {}) {
  const bySeed = new Map((out.reports ?? []).map((r) => [r.capacity, r]));
  const lines = [];
  if (meaning?.hard) {
    const applied = standing ? ` — applying the standing rule for ${meaning.type}: ${standing.read}` : "";
    lines.push(`Hard meaning (${meaning.type}): ${meaning.signals[0]?.detail ?? ""}${applied}.`);
  }
  lines.push(`Swarm (${out.mode === "all" ? "all capacities" : "pointed capacities"}): ${out.pointed.join(", ")}.`);
  const seeds = out.swarm.ants.filter((a) => a.kind !== "bred" && a.kind !== "differentiated");
  for (const sd of seeds) {
    const name = sd.ids.join("+");
    const rep = sd.ids.length === 1 ? bySeed.get(sd.ids[0]) : null;
    const gap = rep?.result?.gap ?? null;
    if (sd.f > 0) lines.push(`· ${name}: signal ${sd.f}`);
    else if (gap === "no_material") lines.push(`· ${name}: no signal — empty ground`);
    else if (gap) lines.push(`· ${name}: no signal — reference-only (${gap}, not wired to run)`);
    else lines.push(`· ${name}: measured nothing on this ground (executable, zero yield)`);
  }
  const bred = out.swarm.ants.filter((a) => (a.kind === "bred" || a.kind === "differentiated") && a.admitted);
  if (bred.length) lines.push(`Kept combinations: ${bred.map((b) => `${b.ids.join("+")} (${b.f})`).join("; ")}.`);
  else lines.push(`No combination beat its ground (bar ${bar}).`);
  lines.push(`Best so far: ${out.swarm.best.ids.join("+")} at ${out.swarm.best.f}.`);
  if (residue?.line) lines.push(`Anti-matter: ${residue.line}.`);
  return lines.join("\n");
}
