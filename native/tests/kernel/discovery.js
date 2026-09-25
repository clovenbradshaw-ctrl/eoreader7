// kernel/discovery.js — THE DISCOVERY (the LLM's proper place: proposing,
// never measuring). When a genre is registered and the meaning potential
// holds no discovered framing for it yet, the LLM is TASKED to "go find
// what makes a good <genre>": its staging (the phases a <genre> is made of),
// its write voice (the prompt that would produce one), its felt target.
// The trajectory through meaning space is REC'd as footprints (appendFraming)
// so the next request starts from where this one landed — easier next time.
//
// The LLM proposes; the structural organs (satisfaction, the wheel's EVA)
// dispose. Nothing the LLM writes here is a measurement.
import { appendFraming, framingFor } from "./fortune-prior.js";

export const DISCOVERY_SCHEMA = "EODiscovery@1";

/**
 * discoveredFramingFor(prior, { genre, medium }) → the latest footprint, or
 * null when this genre has never been discovered.
 */
export function discoveredFramingFor(prior, { genre, medium = "text" } = {}) {
  return framingFor(prior, { genre, medium });
}

/**
 * discoverFraming({ register, impression, prior, upstream, model, draw }) →
 * { framing, appended, from } — the LLM's proposal, REC'd onto the sidecar.
 * `draw` is the caller's model call: (msgs, maxTokens) → text. The framing
 * must be JSON; a malformed proposal is refused, never half-adopted (III.3).
 */
export async function discoverFraming({ register, impression = null, prior = null, upstream = null, model = null, draw = null }) {
  const genre = register?.field?.field ?? register?.genre ?? "the genre";
  const mode = register?.mode ?? "text";
  const tenor = register?.tenor?.tenor ?? "general";
  const evidence = impression?.evidence ?? [];
  const footprints = evidence.map((e) => `- ${e.from}: ${e.basis}`).join("\n") || "- none yet";
  // THE POSSIBILITY SPACE (the low level — the machine's own footprint):
  // the phases and shapes it has ACTUALLY seen. The high level (the LLM) may
  // only propose a PROBABILITY over this space — rank/select/name within it,
  // or supply the generic arc only when the space is empty. A proposal is a
  // probability distribution, never a free invention.
  const possiblePhases = [...new Set(evidence.flatMap((e) => e.phases ?? []).filter(Boolean))].slice(0, 10);
  const possibleShapes = [...new Set(evidence.flatMap((e) => e.shapes ?? []).filter(Boolean))].slice(0, 5);
  const possibility = [
    possiblePhases.length ? `the phases the machine has actually seen (possibility): ${possiblePhases.join(" | ")}` : "the machine has seen no phases yet — supply the genre's generic arc as a fallback, but name the beat of each phase",
    possibleShapes.length ? `the shapes the machine has actually measured: ${possibleShapes.join(" | ")}` : "no measured shape yet",
  ].join("; ");

  const ask = (refusal = null) => [
    `You are discovering what makes a good ${genre} carried in ${mode} for ${tenor}.`,
    `The LOW level sets the possibility; YOU set the probability. ${possibility}.`,
    `Here is what the machine already knows (footprints):`,
    footprints,
    ``,
    `Go find what makes a good ${genre}: its SHAPE (the arc its fortune takes), its STAGING (the phases a ${genre} is made of, in order), its WRITE VOICE, and its FELT TARGET (what the reader should feel by the end).`,
    ``,
    `CRITICAL — write INSTRUCTIONS, never examples. Do not write any story prose. Every field is an imperative command to a writer, not a sample of what to write.`,
    ``,
    `- "staging": the phases a ${genre} is made of, as concrete beats, not abstract labels. If the honest answer is an arc label ("rising action"), say what HAPPENS in that phase ("the moment of no return").`,
    `- "writeVoice.opening": the command that starts a ${genre} — e.g. "Begin in the middle of a concrete moment, in a real place, showing the senses; never a thesis, never a summary, never name the genre or the structure."`,
    `- "writeVoice.body": the command that continues each phase as a ${genre} — e.g. "Write the scene: what happens, who acts, what changes, what is felt. Never name the phase or the structure, never analyze, never comment on the writing."`,
    `- "feltTarget": a JSON object {shape: "the arc's shape in one phrase", releases: N (how many felt releases a ${genre} delivers), tension: "what the tension is and how it is released"}.`,
    ``,
    refusal ? `YOUR LAST REPLY WAS REFUSED: ${refusal}. Respond again, correct this time.` : "",
    `Respond with JSON only, no commentary, no prose outside the JSON, no markdown fences:`,
    `{"staging": ["...", "..."], "writeVoice": {"opening": "...", "body": "..."}, "feltTarget": {"shape": "...", "releases": N, "tension": "..."}}`,
  ].filter(Boolean).join("\n");

  const propose = async (refusal = null) => {
    let text = null;
    if (draw) {
      try { text = await draw([{ role: "user", content: ask(refusal) }], 600, {}); } catch {}
    } else if (upstream && model) {
      try {
        const r = await fetch(`${upstream}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model, messages: [{ role: "user", content: ask(refusal) }], stream: false, options: { temperature: 0.4, num_predict: 600 } }),
        });
        if (r.ok) { const d = await r.json(); text = d?.message?.content ?? null; }
      } catch {}
    }
    return text;
  };

  // THE LOOP (loops on loops): the low level refuses what is outside its
  // possibility space and feeds the refusal back down; the high level
  // re-proposes a probability within it. Bounded — a loop that never lands
  // is a gap, never an infinite climb.
  let framing = null;
  let basis = "the LLM's trajectory, REC'd as footprints for next time";
  let from = "discovery";
  let refusal = null;
  for (let attempt = 1; attempt <= 3 && !framing; attempt += 1) {
    const text = await propose(refusal);
    if (!text) { from = "refused"; basis = "no model proposal — the discovery could not run"; break; }
    let parsed = null;
    try {
      const stripped = String(text).replace(/```(?:json)?/gi, "").trim();
      const m = stripped.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch (e) { parsed = null; refusal = `invalid JSON (${e?.message ?? "could not parse"})`; }
    if (!parsed || !Array.isArray(parsed.staging) || !parsed.staging.length || !parsed.writeVoice || !parsed.writeVoice.opening) {
      refusal = refusal ?? "missing a required field — staging must be a non-empty array and writeVoice.opening must be a command";
      framing = null; from = "refused"; basis = `refused (attempt ${attempt}): ${refusal}`;
      continue;
    }
    framing = parsed;
  }
  if (!framing) return { framing: null, appended: false, from, basis };

  framing.staging = framing.staging.map((s) => String(s).trim()).filter((s) => s && s.length > 2).slice(0, 7);

  const appended = prior ? appendFraming(prior, { genre, medium: mode, framing, basis: `discovered by the LLM over the possibility space: ${evidence.length} footprints consulted`, giver: `model:${model ?? "draw"}` }) : false;
  return { framing, appended, from, basis };
}

/**
 * The discovery proposal APPLIED: staging replaces the meaning potential's
 * phases when the discovery is fresh; the write voice overrides the register
 * table when the discovery names one. The register tables are the fallback
 * for an empty meaning potential — never the first answer.
 */
export function applyDiscovered({ framing = null, sections = [], questionFor = null, topic = "" } = {}) {
  if (!framing) return { sections, voice: null, basis: "no framing — the register's own staging stands" };
  const staged = [...new Set(framing.staging ?? [])].slice(0, 7);
  const nextSections = staged.length >= 2
    ? staged.map((f) => (questionFor ? questionFor(f, topic) : f))
    : sections;
  return { sections: nextSections, voice: framing.writeVoice ?? null, basis: "the discovery's staging and voice applied" };
}