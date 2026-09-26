#!/usr/bin/env node
// fiction-pipeline.mjs — A SEPARATE, STANDALONE ENTRY POINT FOR FICTION MODE
// (2026-09-26). Intended integration path: native/the-fold/fiction-pipeline.mjs,
// beside pipeline-run.mjs. pipeline-run.mjs's runPipeline is NOT edited and is
// not even imported here — this is a deliberately separate pathway, not a
// mode flag threaded through runPipeline's own prosify.js/flesh2.js calls.
//
// WHY A SEPARATE ENTRY POINT RATHER THAN A MODE FLAG INSIDE runPipeline:
// admit() is called deep inside prosify.js and flesh2.js, not in
// pipeline-run.mjs itself — runPipeline only wires WHICH flesh function runs
// ("prosify" vs "flesh2"), never admit() directly (checked by reading
// pipeline-run.mjs's own imports and spiral() body before writing this file).
// Threading a fiction mode flag into admission's actual call sites would mean
// editing prosify.js AND flesh2.js AND archon-rules.js's readAll()/
// gebserArrival() wiring inside runPipeline's own pathos loop — a much larger
// blast radius against a pipeline this session was told is "real, working,
// and verified this session," for a FIRST increment the task's own brief
// explicitly permits scoping down. This file is the honest, scoped-down
// choice: a real, separate, end-to-end path that reuses the SAME gated model
// wire and the SAME sentence segmentation, admits through
// fiction-admission.js's admitFiction (never admit()), and reports
// fiction-admission.js's fictionArrival (never gebserArrival()) — provably
// zero new surface area on the tested non-fiction pipeline, at the cost of
// not (yet) sharing runPipeline's nine-stage ledger, archon revision passes,
// or arrangement/outline machinery. Left unbuilt, disclosed: wiring THIS
// pathway into runPipeline's own prosify/flesh2 call sites as a real mode
// flag, once this standalone pathway itself is proven.
//
//   node native/the-fold/fiction-pipeline.mjs --task "…" --ground FILE [--model gemma2:2b] [--pick 0] [--retries 2]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEotParser } from "./eot-notation.js";
import { segmentSentences } from "./admission.js";
import { stipulateFromGround, fictionInstruction, admitFiction, fictionArrival } from "./fiction-admission.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt = null) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : dflt; };

/**
 * runFictionSeed({ task, groundFiles, model, pick, retries, draw }) -> {
 *   ok, stipulation, instruction, piece, admitted, refused, arrival, raw
 * }
 *
 * Reads the ground, builds ONE stipulation (fiction-admission.js's
 * stipulateFromGround), prompts the mouth once through the SAME gated wire
 * pipeline-run.mjs already uses (dynamic import of proxy-runner.mjs's
 * streamOllamaChat — the safety-and-ethics gate sees this call exactly as it
 * sees every other one in this repo; `draw` may be injected for tests, the
 * same pattern pipeline-run.mjs's own `draw` parameter already uses), admits
 * each generated sentence through admitFiction, and reports fictionArrival
 * over the admitted piece. Bounded retries (default 2 EXTRA generations,
 * matching this project's own convention of a small bounded budget rather
 * than an unbounded loop — pipeline-run.mjs's own pathosBudget) re-prompt,
 * restating what fictionArrival found missing, only until it arrives or the
 * budget is spent; a run that never arrives still returns its best piece and
 * says exactly what fictionArrival found missing, never silently upgraded to
 * "arrived."
 */
export async function runFictionSeed({ task, groundFiles = [], model = "gemma2:2b", pick = 0, retries = 2, draw = null } = {}) {
  const ground = groundFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n\n");
  const parser = await loadEotParser();
  const stipulation = stipulateFromGround(ground, { parser, pick });
  if (!stipulation.ok) return { ok: false, reason: stipulation.reason, stipulation };

  const gatedDraw = draw ?? (async (messages, maxTokens) => {
    const { streamOllamaChat } = await import("../../proxy-runner.mjs");
    let out = "";
    for await (const chunk of streamOllamaChat(model, messages, { maxTokens })) if (typeof chunk === "string") out += chunk;
    return out;
  });

  let instruction = fictionInstruction({ task, stipulation });
  let bestPiece = [], bestArrival = null, bestAdmitted = [], bestRefused = [], bestRaw = "";
  const registry = new Set();
  const attempts = Math.max(1, 1 + retries);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const raw = await gatedDraw([{ role: "user", content: instruction }], 500);
    const sentences = segmentSentences(raw);
    const admitted = [], refused = [];
    for (const s of sentences) {
      const v = admitFiction(s, { ground, stipulation, instruction: task, registry, parser });
      if (v.admit) admitted.push(s); else refused.push({ sentence: s, ...v.refused[0] });
    }
    const arrival = fictionArrival({ piece: admitted, stipulation, ground, parser });
    // HORA, NOT TEMPUS (the same rule pipeline-run.mjs's own spiral() names):
    // an attempt that admits MORE sentences than the best so far stands, even
    // when it still has not arrived — never discard real, admitted content
    // for a later attempt that admits less.
    if (admitted.length >= bestAdmitted.length) { bestPiece = admitted; bestArrival = arrival; bestAdmitted = admitted; bestRefused = refused; bestRaw = raw; }
    if (arrival.arrived || attempt === attempts) break;
    // A bounded retry restates exactly what arrival found missing — real
    // feedback from a real check, never a vaguer "try again."
    instruction = `${fictionInstruction({ task, stipulation })}\n\nYour last attempt did not yet work: ${arrival.missing.join("; ")}. Try again, keeping the stipulated change and adding real invented scene, action, or dialogue.`;
  }
  return { ok: true, stipulation, instruction, piece: bestPiece, admitted: bestAdmitted, refused: bestRefused, arrival: bestArrival, raw: bestRaw };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const task = arg("task");
  const groundArg = arg("ground");
  if (!task || !groundArg) { console.error('usage: fiction-pipeline.mjs --task "…" --ground FILE[,FILE] [--model gemma2:2b] [--pick 0] [--retries 2]'); process.exit(1); }
  const out = await runFictionSeed({ task, groundFiles: groundArg.split(","), model: arg("model", "gemma2:2b"), pick: Number(arg("pick", "0")), retries: Number(arg("retries", "2")) });
  if (!out.ok) { console.error(`not run: ${out.reason}`); process.exit(1); }
  console.log(`stipulation (${out.stipulation.mode}): ${out.stipulation.basis}`);
  console.log(`\n--- piece (${out.admitted.length} sentence(s) admitted, ${out.refused.length} refused) ---\n`);
  console.log(out.piece.join(" "));
  console.log(`\n--- arrival ---\n${out.arrival.basis}`);
  process.exitCode = out.arrival.arrived ? 0 : 1;
}
