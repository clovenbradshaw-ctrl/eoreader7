#!/usr/bin/env node
// podcast-visual-polish.mjs — a real, decisive visual-design pass, landed
// through the SAME code-anchor-log SYN-revision path every other repair in
// this app uses. Not another mechanical repair strategy — this is a
// designed pass (a real person's design judgment, disclosed as exactly
// that), fixing concrete problems found by looking at the live app rather
// than measuring a property against a reference corpus:
//
//   1. .ethos-badge had NO width/height — with only flex centering and an
//      inline background-color, it rendered at 0x0 and was invisible on
//      every screenshot taken this whole session. A real, disclosed bug,
//      not a taste call: fixed with an explicit 10px circular dot.
//   2. Native <audio> controls render in their LIGHT browser chrome
//      inside a dark theme — a bright white bar clashing badly with
//      every dark surface this app has. `color-scheme: dark` is a real,
//      well-supported CSS property Chromium/WebKit use to draw native
//      form/media controls (audio, input, scrollbars) in dark mode —
//      zero JS, zero custom player, a standard mechanism used for
//      exactly this.
//   3. The page's font stack was the browser default (a serif on most
//      platforms) — "Podcast List" and every episode title rendered in
//      Times-like serif, which reads as unstyled/dated next to a
//      deliberately dark, modern theme. Replaced with a standard system
//      sans-serif stack (-apple-system/Segoe UI/Roboto/...) — the same
//      stack used across this project's own the-fold/heimdall systems.
//   4. .episode was a single flex ROW with the title capped at
//      max-width:150px — a real podcast's title (often 40-80 characters)
//      wraps into 4-6 short, ragged lines in that column, reading like a
//      cramped data-table cell rather than a list item. Restructured to
//      a two-row layout: the title full-width on its own line (a real,
//      common podcast-list convention — Pocket Casts, Apple Podcasts,
//      and Spotify all give the title its own line), metadata + audio
//      below it.
//   5. No spacing SCALE — 8px/10px/20px mixed ad hoc. Adopted one 8px-
//      based scale (8/16/24) throughout the touched rules.
//   6. No reading measure — a single-column list stretched to the full
//      viewport width reads badly past ~640px. Capped .container at a
//      real, common list-reading width (640px) and centered it.
//   7. CAUGHT LIVE, not assumed: `.episode audio { flex: 1 }` was written
//      for the OLD row layout, where audio was a flex item growing
//      HORIZONTALLY. Moving .episode to a column layout made audio a
//      flex item growing VERTICALLY instead — `flex:1`'s own default
//      flex-basis (0%) collapsed the audio element's height to exactly
//      0px (measured: getBoundingClientRect() returned {w:300, h:0}),
//      making every audio player invisible despite `display:block` and
//      `visibility:visible`. Fixed by dropping flex entirely — audio is
//      no longer sharing a row with other flex items, so `width:100%`
//      is the right rule, not flex-grow.
//
// Landed as ONE SYN revision per touched anchor (style, renderEpisodes),
// through the exact proposeAnchor/appendAnchorLog/foldCode path the
// repair loop's own mechanical strategies already use — never a second,
// informal way of editing this app's code.
import fs from "node:fs";
import fsp from "node:fs/promises";
import { readAnchorLog, appendAnchorLog, proposeAnchor, foldCode, settledContent } from "../adapters/build/code-anchor-log.js";
import { checkCode } from "../the-fold/surface/podcast-app-codegen.mjs";
import { coherenceGate } from "../adapters/build/coherence-properties.mjs";
import { TEMPLATE } from "./podcast-anchor-log-drive.mjs";

const LEDGER_FILE = new URL("../the-fold/surface/podcast-anchor-log.jsonl", import.meta.url).pathname;
const HTML_FILE = new URL("../the-fold/surface/podcast-app-from-anchors.html", import.meta.url).pathname;
const wellFormed = (html) => { const c = checkCode(html); return { wellFormed: c.issues === 0, problems: c.findings }; };

function nextRoundFor(log, anchor) {
  const rounds = log.entries.filter((e) => e.anchor === anchor && Number.isInteger(e.round)).map((e) => e.round);
  return (rounds.length ? Math.max(...rounds) : 0) + 1;
}

const NEW_STYLE = `body {
  margin: 0;
  overflow-x: hidden;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  /* Real, well-supported CSS: tells the browser to draw its NATIVE form
     and media controls (audio, input, scrollbars) in dark mode, so
     <audio controls> doesn't render as a bright white bar in a dark app. */
  color-scheme: dark;

  background-color: #0d0f13;
  color: #ffffff;
}

html {
  box-sizing: border-box;
}

h1 {
  font-weight: bold;
}

.container {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px;
  box-sizing: border-box;
}

input[type="text"] {
  padding: 10px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
background-color: #1DB954;

  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  color: rgb(0, 0, 0);
}

.episode {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  background-color: #191919;
}

.episode-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.episode h3 {
  width: 100%;
  text-align: left;
  margin: 0 0 4px;
  font-size: 16px;
}

.episode p {
  margin: 0;
  text-align: left;
  color: #b3b3b3;
  font-size: 13px;
  white-space: nowrap;
}

.ethos-badge {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.episode audio {
  width: 100%;
  box-sizing: border-box;
}

.episode:first-of-type h3 {
  color: #1db954;
}`;

const NEW_RENDER_EPISODES = `function renderEpisodes(episodes) {
  const episodesContainer = document.getElementById("episodes");
  episodesContainer.innerHTML = ""; // Clear the container

  episodes.forEach(episode => {
    const episodeDiv = document.createElement("div");
    episodeDiv.className = "episode";
    const ethosLabel = episode.ethos === "pass" ? "clears the ethos check" : episode.ethos === "conflict" ? "flagged by the ethos check" : "ethos check not run";
    episodeDiv.innerHTML = \`<h3>\${escapeHtml(episode.title)}</h3><div class="episode-meta"><span class="ethos-badge" title="\${escapeHtml(ethosLabel)}" style="background-color: \${episode.ethos === "pass" ? "green" : episode.ethos === "conflict" ? "red" : "gray"}"></span><p>Published: \${escapeHtml(episode.pubDate)}</p></div><audio controls src="\${episode.audioUrl}"></audio>\`;
    episodesContainer.appendChild(episodeDiv);
  });
  return episodesContainer;
}`;

async function main() {
  let log = readAnchorLog(LEDGER_FILE);
  const fromSeq = log.nextSeq;

  const currentStyle = settledContent(log, "style").content;
  const currentRender = settledContent(log, "renderEpisodes").content;

  if (currentStyle.trim() === NEW_STYLE.trim() && currentRender.trim() === NEW_RENDER_EPISODES.trim()) {
    console.log("already applied — nothing to do.");
    return;
  }

  const styleRound = nextRoundFor(log, "style");
  log = proposeAnchor(log, {
    anchor: "style", content: NEW_STYLE, round: styleRound, writer: "podcast-visual-polish",
    writerAudit: { request: "visual polish pass: dark-mode native controls, system font, two-row episode layout, 8px spacing scale, reading-width container, visible ethos badge", rawResponse: "(designed, not model-generated — see this file's own header for the six concrete problems this closes)", durationMs: null, model: "human-designed" },
  });
  const renderRound = nextRoundFor(log, "renderEpisodes");
  log = proposeAnchor(log, {
    anchor: "renderEpisodes", content: NEW_RENDER_EPISODES, round: renderRound, writer: "podcast-visual-polish",
    writerAudit: { request: "restructure .episode markup: title on its own row, ethos badge + date in a meta row, badge now gets a real title= for accessibility", rawResponse: "(designed, not model-generated)", durationMs: null, model: "human-designed" },
  });

  appendAnchorLog(LEDGER_FILE, log, fromSeq);
  const fold = await foldCode(log, TEMPLATE, { wellFormed, coherenceGate });
  console.log(`folded — clean: ${fold.clean}, lintProblems: ${JSON.stringify(fold.lintProblems)}`);
  if (!fold.clean) { console.error("REFUSING to write: the folded page did not clear its own wellFormed/coherence checks."); process.exitCode = 1; return; }
  await fsp.writeFile(HTML_FILE, fold.html);
  console.log(`wrote ${HTML_FILE}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
