#!/usr/bin/env node
// podcast-run.mjs — drive the real pipeline end to end and print what it
// did: the transcript, the healing report, and the SAME episode read back
// at two different cursors, to show it is genuinely a fold at any given
// cursor rather than a single accumulated state.
//
//   node podcast-run.mjs [--topic "..."] [--cursor N]
//
// With ER7_OLLAMA_URL and ER7_NB_MODEL (or ER7_PODCAST_MODEL) set, this
// drives a real model as the mouth (podcast-mouth.mjs's `ollamaPodcastMouth`
// — same env vars and `/api/chat` convention as notebook-learn.mjs's own
// mouth). Without them, it falls back to a SCRIPTED mouth that plants one
// deliberate contradiction (segment 2 restates segment 0's own fact
// wrongly) so the self-heal loop can be watched firing for real, not just
// claimed — the same falsify-first discipline this whole tree holds
// everywhere (P71's generality gate, refutation.js's own veto). No TTS:
// this kernel has no speech synthesiser (see adapters/build/podcast.js's
// header); the output is the checked SCRIPT, ready for one to be bolted on.
import { makePodcast, segmentTaskId } from "../../adapters/build/podcast.js";
import { ollamaPodcastMouth } from "./podcast-mouth.mjs";

function scriptedMouth(topic) {
  // A planted, KNOWN contradiction: segment 0 states the founding year as
  // 1965; segment 2 (deliberately, to prove the loop) restates it as 1971.
  // Segment 1 makes an unrelated, uncontested claim.
  const beats = [
    { speaker: "Nia", text: `Welcome back — today we're talking about ${topic}. It all started when the collective first met in 1965, in a rented room above a print shop.` , claims: [{ end1: topic, label: "founded_in", end2: "1965", quote: "met in 1965" }] },
    { speaker: "Theo", text: `Right, and the print shop itself is still standing — it's a bookstore now, on the same corner it always was.`, claims: [{ end1: topic, label: "print_shop_status", end2: "still standing", quote: "still standing" }] },
    { speaker: "Nia", text: `People forget how young it was, actually — I've seen it written that ${topic} got going in 1971, which always surprises people.`, claims: [{ end1: topic, label: "founded_in", end2: "1971", quote: "in 1971" }] },
    { speaker: "Theo", text: `And by the end of that first decade there were three chapters, not just the one.`, claims: [{ end1: topic, label: "chapters_by_first_decade", end2: "three", quote: "three chapters" }] },
  ];
  let i = 0;
  return {
    async propose({ n }) {
      const b = beats[i++] ?? beats[beats.length - 1];
      return { speaker: b.speaker, title: `beat ${n}`, script: b.text, claims: b.claims };
    },
    async arbitrate({ rival }) {
      // the FIRST-established fact is trusted over a later loose recollection
      return rival.end2 === "1965" ? "rival" : "neither";
    },
    async revise({ priorScript, correction }) {
      return {
        speaker: "Nia",
        title: "corrected",
        script: `${priorScript} — actually, scratch that: it was ${correction.end2}, not what I just said.`,
        claims: [],
      };
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
  const topic = flag("topic", "the founding of the collective");
  const cursorArg = flag("cursor", null);

  const api = makePodcast();
  const mouth = ollamaPodcastMouth() ?? scriptedMouth(topic);
  const live = ollamaPodcastMouth() != null;
  console.log(`# mouth: ${live ? `live (${process.env.ER7_OLLAMA_URL}, ${process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL})` : "scripted (no ER7_OLLAMA_URL/ER7_NB_MODEL set — falling back)"}\n`);

  const plan = [{ beat: "opening" }, { beat: "an aside" }, { beat: "a recollection" }, { beat: "growth" }];
  const { log, report } = await api.produceEpisode({
    topic, voices: ["Nia", "Theo"], format: "two-host retrospective",
    plan, mouth,
    declaredFunctional: new Set(["founded_in"]),
    maxRepairsPerSegment: 2,
  });

  console.log("## final transcript\n");
  console.log(api.transcriptOf(api.renderEpisodeAt(log)));

  console.log("\n## what the self-heal loop did\n");
  for (const seg of report.segments) {
    for (const h of seg.heals) console.log(`- segment ${seg.n}: ${h.outcome} (dispute ${h.disputeId ?? "n/a"}, rival ${h.rival}, claim ${h.claim})`);
  }
  if (!report.segments.some((s) => s.heals.length)) console.log("(no conflicts arose)");
  console.log(`\nalgebra self-check: ${report.algebraFlags.length ? `${report.algebraFlags.length} FLAG(S) — ${JSON.stringify(report.algebraFlags)}` : "clean — every thread ran the operators forward"}`);
  console.log(`open gaps left on the record: ${report.openGaps.length}`);

  const cursor = cursorArg != null ? Number(cursorArg) : log.entries.find((e) => e.task_id === segmentTaskId(1))?.seq;
  console.log(`\n## the episode as a fold at cursor=${cursor} (mid-episode)\n`);
  const mid = api.renderEpisodeAt(log, cursor);
  console.log(`frame: ${JSON.stringify(mid.frame.declared)}`);
  console.log(`segments landed so far: ${mid.segments.length}`);
  console.log(`facts standing so far: ${mid.standing.map((n) => `${n.end1} ${n.label} ${n.end2} (${n.standing})`).join("; ") || "(none yet)"}`);
  console.log(`open disputes at this cursor: ${mid.openDisputes.length}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
