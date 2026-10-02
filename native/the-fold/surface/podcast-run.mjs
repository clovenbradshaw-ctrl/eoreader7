#!/usr/bin/env node
// podcast-run.mjs — the podcast app's CLI: subscribe to a REAL feed, read
// what it published, watch what a real mouth says about it.
//
// "No — you're supposed to only prompt it and watch. We are teaching it to
// fish." This file's own job stops there: it composes prompts
// (podcast-mouth.mjs) and reads back what comes of them. It does NOT
// contain a hand-written stand-in for what a model would say — a mouth
// that is not reachable produces an honest, typed gap here, never
// fabricated content. The mechanical parts of this app (fetching and
// parsing a real feed, the ethos/charter check, the logos/rhetorical
// probes, the append-only ledger, the measured-loop stop) need no model at
// all and run exactly the same whether one is configured or not — that is
// the whole point of building them as real organs rather than as glue
// around a model call.
//
//   node podcast-run.mjs subscribe <feed-url>
//   node podcast-run.mjs episodes <feed-url>
//   node podcast-run.mjs extract <feed-url> <episode-index>
//   node podcast-run.mjs generate ["<topic>"] [--cursor N]
//
// `subscribe`/`episodes`/`extract` persist nothing between runs (this is a
// CLI demonstration of the organs, not a daemon with a database) — each
// invocation re-fetches and re-syncs the feed into a fresh ledger. That is
// disclosed, not silently implied otherwise.
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { makeNotes } from "../../kernel/notes.js";
import { makeLibrary, parseFeed } from "../../adapters/build/podcast-feed.js";
import { makePodcast, segmentTaskId } from "../../adapters/build/podcast.js";
import { ollamaPodcastMouth } from "./podcast-mouth.mjs";
import { armCharter } from "../../organs/arm-charter.js";
import { constitution } from "../../organs/ethos.js";
import { charterGate } from "../../organs/charter.js";
import { cellsByGrain, GRAINS as SPIRAL_GRAINS, APPEALS } from "../../the-fold/revision-spiral.js";

function rhetoricalFindings(text, appeal) {
  const out = [];
  for (const cell of cellsByGrain(SPIRAL_GRAINS.MICRO)) {
    if (cell.appeal !== appeal || typeof cell.probe !== "function") continue;
    for (const f of cell.probe(text) ?? []) out.push({ ...f, cell: f.cell ?? cell.cell, editor: cell.editor });
  }
  return out;
}

/** The mechanical read every episode gets, model-free: is its own description a licensed generation under the charter, and what do the real rhetorical probes find. Never gated on a mouth being reachable. */
function assessText(text) {
  armCharter();
  const ethos = charterGate(constitution().charter, text);
  const logos = rhetoricalFindings(text, APPEALS.LOGOS);
  const ethosStyle = rhetoricalFindings(text, APPEALS.ETHOS);
  return { ethos, logos, ethosStyle };
}

async function fetchFeed(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url}: ${res.status}`);
  return res.text();
}

async function cmdSubscribe(url) {
  console.log(`# fetching ${url}`);
  const xml = await fetchFeed(url);
  const notes = makeNotes();
  const lib = makeLibrary({ notes });
  let log = notes.createNotes();
  const { log: log2, show, added } = lib.syncFeed(log, { url, xml });
  log = log2;
  console.log(`subscribed: ${show.title} (${show.episodeCount} episode(s) heard, ${added} new)`);
  console.log("\n## mechanical assessment of each episode (no model — ethos + logos, real organs)\n");
  for (const ep of lib.episodesOf(log, show.title)) {
    const feed = parseFeed(xml);
    const item = feed.items.find((i) => i.title === ep.end2);
    const assessed = assessText(item?.description ?? "");
    console.log(`- "${ep.end2}"`);
    console.log(`  ethos (charter): ${assessed.ethos.verdict}${assessed.ethos.verdict === "conflict" ? ` — ${assessed.ethos.basis}` : ""}`);
    console.log(`  logos findings: ${assessed.logos.length}${assessed.logos.length ? ` (${assessed.logos.map((f) => f.kind).join(", ")})` : ""}`);
    console.log(`  ethos-of-style findings: ${assessed.ethosStyle.length}`);
  }
}

async function cmdEpisodes(url) {
  const xml = await fetchFeed(url);
  const feed = parseFeed(xml);
  console.log(`# ${feed.title}\n`);
  feed.items.forEach((it, i) => console.log(`[${i}] ${it.title}${it.pubDate ? ` (${it.pubDate})` : ""}`));
}

async function cmdExtract(url, indexArg) {
  const index = Number(indexArg);
  if (!Number.isInteger(index)) throw new Error("extract needs an episode index — see `episodes <feed-url>` for the list");
  const xml = await fetchFeed(url);
  const feed = parseFeed(xml);
  const item = feed.items[index];
  if (!item) throw new Error(`no episode at index ${index}`);

  const mouth = ollamaPodcastMouth();
  console.log(`# episode: ${item.title}`);
  if (!mouth) {
    console.log("# no mouth configured (set ER7_OLLAMA_URL and ER7_NB_MODEL / ER7_PODCAST_MODEL) — reporting the mechanical read only, never a fabricated one");
    const assessed = assessText(item.description ?? "");
    console.log(JSON.stringify(assessed, null, 2));
    return;
  }
  console.log(`# asking the mouth (${process.env.ER7_OLLAMA_URL}, ${process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL}) to read this episode's own real description and name its claims — watching what it says, not writing it for it`);
  const { claims } = await mouth.extractClaims({ showTitle: feed.title, episodeTitle: item.title, description: item.description ?? "" });
  console.log(`\n${claims.length} claim(s) found:`);
  for (const c of claims) console.log(`  ${c.end1} —${c.label}→ ${c.end2}   ("${c.quote}")`);

  // Cross-check against every OTHER episode of the same show already
  // heard on the ledger. A real disagreement between two published
  // episodes is DISCLOSED, never silently resolved by this app on a
  // listener's behalf — that is a human decision, not this pipeline's to
  // make for real, already-aired content.
  const notes = makeNotes();
  const lib = makeLibrary({ notes });
  let log = notes.createNotes();
  ({ log } = lib.syncFeed(log, { url, xml }));
  const norm = (v) => String(v ?? "").trim().toLowerCase();
  let conflicts = 0;
  for (const claim of claims) {
    const folded = notes.fold(log);
    const rival = folded.find((n) => norm(n.end1) === norm(claim.end1) && norm(n.label) === norm(claim.label) && norm(n.end2) !== norm(claim.end2));
    const heard = notes.hear(log, { end1: claim.end1, label: claim.label, end2: claim.end2, witness: `${url}#${item.title}` });
    log = heard;
    if (rival) {
      conflicts += 1;
      console.log(`\n  ⚠ disagrees with an earlier note: "${rival.end1} ${rival.label} ${rival.end2}" (witnessed by ${rival.witnesses.join(", ")})`);
      console.log(`    left OPEN on the record — a disagreement between two real episodes is for a listener to weigh, not for this app to settle`);
    }
  }
  if (!conflicts) console.log("\n  no disagreement with any other episode of this show heard so far");

  const evidencePath = new URL("./podcast-extract-evidence.json", import.meta.url);
  await fs.writeFile(evidencePath, JSON.stringify({
    generatedAt: new Date().toISOString(), feedUrl: url, episodeTitle: item.title, episodeDescription: item.description,
model: process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL, mouthUrl: process.env.ER7_MOUTH_URL ?? process.env.ER7_OLLAMA_URL,
    claims, conflictsFound: conflicts, finalNotes: notes.fold(log),
  }, null, 2));
  console.log(`\n(claims + cross-check evidence written to ${fileURLToPath(evidencePath)})`);
}

async function cmdGenerate(topicArg, cursorArg) {
  const topic = topicArg ?? "the founding of the collective";
  const mouth = ollamaPodcastMouth();
  if (!mouth) {
    console.log("# no mouth configured (set ER7_OLLAMA_URL and ER7_NB_MODEL / ER7_PODCAST_MODEL) — a generated episode needs a real mouth to propose it, and this app does not write one for it");
    return;
  }
  const api = makePodcast();
  const plan = [{ beat: "opening" }, { beat: "an aside" }, { beat: "a recollection" }, { beat: "growth" }];
  const { log, report } = await api.produceEpisode({
    topic, voices: ["Nia", "Theo"], format: "two-host retrospective",
    plan, mouth, declaredFunctional: new Set(["founded_in"]), repairCeiling: 20,
  });
  console.log("## final transcript\n");
  console.log(api.transcriptOf(api.renderEpisodeAt(log)));
  console.log("\n## measured stops (the DMD-bounded self-heal loop)\n");
  for (const seg of report.segments) console.log(`- segment ${seg.n}: ${seg.stop.verdict} after ${seg.stop.rounds} round(s)${Number.isFinite(seg.stop.growth) ? ` (growth ${seg.stop.growth.toFixed(4)})` : ""}`);
  for (const w of report.warnings) console.log(`  ! ${w.warning}`);
  console.log(`\nalgebra self-check: ${report.algebraFlags.length ? `${report.algebraFlags.length} FLAG(S)` : "clean"}`);
  const cursor = cursorArg != null ? Number(cursorArg) : log.entries.find((e) => e.task_id === segmentTaskId(1))?.seq;
  console.log(`\n## the episode as a fold at cursor=${cursor} (mid-episode)\n`);
  const mid = api.renderEpisodeAt(log, cursor);
  console.log(`segments landed so far: ${mid.segments.length}; facts standing: ${mid.standing.map((n) => `${n.end1} ${n.label} ${n.end2}`).join("; ") || "(none yet)"}`);

  // EVIDENCE, not assertion: the whole append-only ledger this run produced
  // plus the run's own report, dumped verbatim so what the mouth actually
  // said (and what the ledger actually did with it) can be checked
  // directly rather than taken on this script's own printed word.
  const evidencePath = new URL("./podcast-generate-evidence.json", import.meta.url);
  await fs.writeFile(evidencePath, JSON.stringify({ generatedAt: new Date().toISOString(), topic, model: process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL, mouthUrl: process.env.ER7_OLLAMA_URL, log, report, finalRender: mid }, null, 2));
  console.log(`\n(full ledger + report written to ${fileURLToPath(evidencePath)})`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "subscribe") return cmdSubscribe(rest[0]);
  if (cmd === "episodes") return cmdEpisodes(rest[0]);
  if (cmd === "extract") return cmdExtract(rest[0], rest[1]);
  if (cmd === "generate") {
    const flag = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
    return cmdGenerate(rest.find((a) => !a.startsWith("--")), flag("cursor"));
  }
  console.log(`usage:
  node podcast-run.mjs subscribe <feed-url>
  node podcast-run.mjs episodes <feed-url>
  node podcast-run.mjs extract <feed-url> <episode-index>
  node podcast-run.mjs generate ["<topic>"] [--cursor N]`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
