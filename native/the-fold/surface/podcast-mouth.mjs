// podcast-mouth.mjs — the ONE crossing a real podcast episode needs: a
// model call. Mirrors notebook-learn.mjs's own `ollamaMouth` (same
// endpoint, same `format` JSON-schema discipline, same env vars, same
// `options.temperature: 0`) rather than inventing a second convention —
// this file exists only because a podcast's mouth needs THREE different
// asks (propose / arbitrate / revise) where the notebook's needs one.
//
// adapters/build/podcast.js stays pure and never imports this file (or
// fetch, or anything network-shaped) — a caller wires the two together
// (see podcast-run.mjs). This is the same split the whole kernel already
// holds everywhere a model or a network is involved: web.js pure /
// explore-server.mjs owns the fetch; witness-sentences.js pure / its
// caller supplies `call`.
//
// THE SCHEMAS ARE THE WALL. `arbitrate`'s reply is constrained to the
// enum {"rival","claim","neither"} — the mouth POINTS at a candidate, it
// never writes a verdict in its own words (P32/P83's select protocol: a
// generated verdict from a small model is not trustworthy; a constrained
// pick from a real comparison is). `propose`/`revise` share one schema —
// a title, a speaker, a script, and a small list of claims each with the
// verbatim quote from the script that states it (so podcast.js's own
// P5.2 self-verified span can locate it; a claim with no real quote in
// its own script is refused there, never silently addressed).

const SEGMENT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    speaker: { type: "string" },
    script: { type: "string" },
    claims: {
      type: "array",
      items: {
        type: "object",
        properties: {
          end1: { type: "string" }, label: { type: "string" }, end2: { type: "string" },
          quote: { type: "string" },
        },
        required: ["end1", "label", "end2", "quote"],
      },
    },
  },
  required: ["title", "speaker", "script", "claims"],
};

const ARBITRATE_SCHEMA = { type: "object", properties: { pick: { type: "string", enum: ["rival", "claim", "neither"] } }, required: ["pick"] };

async function chat({ url, model, messages, schema }) {
  const r = await fetch(`${url}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ model, stream: false, format: schema, options: { temperature: 0 }, messages }),
  });
  if (!r.ok) throw new Error(`podcast mouth: ${url} answered ${r.status}`);
  const body = await r.json();
  return JSON.parse(body.message.content);
}

const describe = (v) => `${v.end1} ${v.label} ${v.end2}`;

/**
 * ollamaPodcastMouth({ url, model }) — the real mouth. `url`/`model`
 * default to the SAME env vars notebook-learn.mjs reads
 * (ER7_OLLAMA_URL/ER7_NB_MODEL); returns `null` when either is unset, so a
 * caller can fall back to a scripted mouth without a network the same way
 * notebookHandler already does for its own `mouth ?? L.ollamaMouth()`.
 */
export function ollamaPodcastMouth({ url = process.env.ER7_OLLAMA_URL, model = process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL } = {}) {
  if (!url || !model) return null;
  return {
    async propose({ n, beat, topic, voices }) {
      return chat({
        url, model, schema: SEGMENT_SCHEMA,
        messages: [{
          role: "user",
          content: `You are writing segment ${n + 1} of a spoken podcast episode on "${topic}"${voices?.length ? ` with voices: ${voices.join(", ")}` : ""}.\nThis segment's own beat: ${beat.beat ?? beat}\nWrite 2-4 sentences of natural spoken script for one speaker (name it in "speaker"). List every checkable factual claim the script makes as {end1, label, end2, quote}: end1/end2 are the two things related, label is a short snake_case relation name, and quote is the EXACT substring of your own script that states it (verbatim — this will be located by string search).`,
        }],
      });
    },
    async arbitrate({ rival, claim, topic }) {
      const out = await chat({
        url, model, schema: ARBITRATE_SCHEMA,
        messages: [{
          role: "user",
          content: `Podcast episode on "${topic}". Two claims conflict on the same fact:\n(rival, already established) ${describe(rival)}\n(claim, just proposed) ${describe(claim)}\nWhich is correct? Answer "rival" if the established claim is right, "claim" if the new one corrects it, or "neither" if you cannot tell.`,
        }],
      });
      return out.pick;
    },
    async revise({ n, beat, topic, priorScript, correction }) {
      return chat({
        url, model, schema: SEGMENT_SCHEMA,
        messages: [{
          role: "user",
          content: `Rewrite segment ${n + 1} of the podcast episode on "${topic}" (beat: ${beat.beat ?? beat}). The prior draft wrongly stated something the episode has since established is: ${describe(correction)}. Prior draft:\n${priorScript}\nWrite a corrected version, in full, in the same voice. List its claims the same way as before (only ones the corrected script actually makes — it may make none).`,
        }],
      });
    },
  };
}
