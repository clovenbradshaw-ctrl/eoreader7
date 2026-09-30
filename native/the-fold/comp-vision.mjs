// comp-vision.mjs — the VISION sense on a comp, through look.js (the pipeline's own looking seam).
//
// The measured read (comp-detect.py + comp-read.js) says where things are and how big; it reads no meaning.
// look.js sets a local vision model's impression beside it: the model describes the whole, a judge
// compares that to the mechanical facts, a real disagreement earns a second look. What this adds for a
// comp is one mechanical check of the subject — does the vision read name the thing this app is bound to
// (weather, fuel prices)? — and the wall-clock it cost, because on a CPU-only box that cost is the finding.
//
// The vision read is evidence about the comp, never the source of a field: the binding tables
// (app-bindings.mjs) are declared by the people who wired the sources, and nothing the model says
// reaches the page.
import { lookAtImage } from "../organs/look.js";

const words = (s) => String(s ?? "").toLowerCase().match(/[a-z]+/g) ?? [];

/**
 * visionOfComp({ imagePath, name, model, subject }) -> { model, ms, read, settled, turns, mechanicalBoxes, error, subject:{ wanted, hits, names } }
 *   subject: the words that would say this comp is what the app is bound to
 */
export async function visionOfComp({ imagePath, name, model, subject = [], look = lookAtImage }) {
  const t0 = Date.now();
  let r;
  try { r = await look(imagePath, { visionModel: model, name }); }
  catch (e) { return { model, ms: Date.now() - t0, read: null, settled: null, turns: 0, mechanicalBoxes: 0, error: String(e.message).slice(0, 200), subject: { wanted: subject, hits: [], names: false } }; }
  const read = r.visionRead ?? null;
  const have = new Set(words(read));
  const hits = subject.filter((w) => have.has(w));
  return { model: r.visionModelUsed ?? model, ms: Date.now() - t0, read, settled: r.visionSettled ?? null, turns: r.visionTurns ?? 0, mechanicalBoxes: r.boxCount ?? 0, error: r.visionError ?? null, unresolved: r.unresolvedReason ?? null, standing: r.standing ?? null, subject: { wanted: subject, hits, names: hits.length > 0 } };
}

/** The spec with its `vision` slot filled (the slot exists in EOCompSpec@2 and is null until a look ran). */
export const withVision = (spec, vision) => ({ ...spec, vision: { model: vision.model, ms: vision.ms, read: vision.read, settled: vision.settled, subject: vision.subject, error: vision.error } });
