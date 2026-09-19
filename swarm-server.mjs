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
//   runSwarmTurn({ task, texts, name, query, claim, force })
//     task   — the raw NL chat string (the pointing)
//     texts  — [{ name, text }] material the ants read (attachments and/or
//              chat history; absent material yields 0 everywhere and the
//              gate honestly refuses it all)
//     force  — true from the explicit POST /v1/swarm endpoint (run the
//              pointing even when the auto-route phrasing is absent);
//              false from the chat auto-route (only swarm phrasing routes)
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

export function runSwarmTurn({ task, texts = [], name = "chat-material", query, claim, force = false } = {}) {
  const intent = detectSwarmIntent(task);
  // THE HARD-MEANING TRIGGER (the protocol's trigger half): a turn pointed at
  // material whose meaning a plain reading cannot hold (garble, truncation,
  // density, a pointed-at void) routes to the swarm even when the NL never
  // names swarming. The detector is mechanical and conservative — ordinary
  // chat with clean material never fires (measured guard, 2026-09-19). The
  // ledger is consulted first: a content type with a standing rule is applied
  // by naming it, not re-derived from scratch.
  const meaning = detectHardMeaning({ task, texts });
  const standing = meaning.hard ? contentRuleFor(meaning.type) : null;
  if (!intent.swarm && !force && !meaning.hard) return { routed: false, reason: intent.reason };
  const pointing = pointCapacities(task);
  if (pointing.gap) {
    return {
      routed: true, mode: "gap", answer: `Swarm: ${pointing.reason}.`,
      pointed: [], best: null, ants: [],
      meaning, standing,
    };
  }
  const text = (texts ?? []).map((t) => (typeof t === "string" ? t : t?.text ?? "")).join("\n\n");
  const runCapacity = swarmRunCapacity();
  const bar = measuredBar(runCapacity, pointing.ants, text, name);
  const out = swarmCapacities({ nl: task, runCapacity, material: { text, name }, bar, query, claim });
  if (out.gap) {
    return { routed: true, mode: "gap", answer: `Swarm: ${out.reason}.`, pointed: [], best: null, ants: [], meaning, standing };
  }
  // reports[] (per-seed yield + raw result/gap) joined onto the census:
  // an executable capacity that measured zero is "measured nothing", a
  // gapped one is "reference-only" — conflating them would misreport noise
  // as incapacity and vice versa.
  const bySeed = new Map(out.reports.map((r) => [r.capacity, r]));
  const ants = out.swarm.ants.map((a) => {
    const rep = a.ids.length === 1 ? bySeed.get(a.ids[0]) : null;
    const gap = rep?.result?.gap ?? null;
    return {
      ids: a.ids, kind: a.kind, f: a.f, admitted: a.admitted,
      stance: a.stance ?? null,
      ...(rep ? { yield: rep.yield, ...(gap ? { gap } : { executable: true }) } : {}),
      persona: a.persona?.gap ? { gap: a.persona.gap } : { archon: a.persona.archon, label: a.persona.label },
      ...(a.terrain ? { terrain: a.terrain } : {}),
    };
  });
  const report = {
    routed: true, mode: out.mode, bar,
    pointed: out.pointed,
    best: { ids: out.swarm.best.ids, f: out.swarm.best.f },
    ants,
    answer: renderSwarmAnswer(out, bar, { meaning, standing }),
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
export function renderSwarmAnswer(out, bar, { meaning = null, standing = null } = {}) {
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
  return lines.join("\n");
}
