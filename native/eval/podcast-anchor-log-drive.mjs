#!/usr/bin/env node
// podcast-anchor-log-drive.mjs — the podcast app driven through
// code-anchor-log.js FOR REAL, correcting a real mistake made earlier in
// this same session: podcast-app-codegen.mjs's whole-file-rewrite harness
// was used instead, hit exactly the failure mode the anchor-log was BUILT
// to correct (a small model asked to reproduce a whole ~2500-char file
// verbatim while fixing one thing, instead echoing it unchanged six times
// running), and was then "fixed" with ad-hoc one-off splicing scripts
// rather than the real system already sitting in this repo. This file is
// that correction: NAMED ANCHORS, each proposed by an ISOLATED model call
// that never sees the skeleton, another anchor's content, or the whole
// file — structurally, not by policy, the way code-anchor-log.js's own
// header states the design.
//
// The SKELETON (doctype, title, input/button markup, div structure) is a
// fixed template here, NOT an anchor — disclosed plainly rather than
// implied otherwise: across ~20 real gemma2:2b rounds in this same
// session (podcast-app-ledger.jsonl), this exact skeleton shape is what
// the model itself consistently produced unprompted, so templating it is
// not inventing app structure, it is fixing what was already the model's
// own converged output as the given the anchors compose into. The four
// LOGIC anchors below — style, escapeHtml, renderEpisodes, subscribe —
// are each genuinely, individually, isolated-model-authored this run.
import { proposeAnchor, foldCode, readAnchorLog, appendAnchorLog } from "../adapters/build/code-anchor-log.js";
import { createTaskLog } from "../kernel/task-log.js";
import { checkCode } from "../the-fold/surface/podcast-app-codegen.mjs";
import { coherenceGate } from "../adapters/build/coherence-properties.mjs";

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.ER7_PODCAST_MODEL ?? "gemma2:2b";
const LEDGER_FILE = new URL("../the-fold/surface/podcast-anchor-log.jsonl", import.meta.url).pathname;

const SKELETON = `<!DOCTYPE html>
<html>
<head>
  <title>Podcast List</title>
  <style>
{{ANCHOR:style}}
  </style>
</head>
<body>
  <div class="container">
    <h1>Podcast List</h1>
    <input type="text" placeholder="Enter feed URL" />
    <button onclick="subscribe()">Subscribe</button>
  </div>
  <div id="episodes"></div>
  <script>
{{ANCHOR:escapeHtml}}

{{ANCHOR:renderEpisodes}}

{{ANCHOR:subscribe}}
  </script>
</body>
</html>`;

function extractFence(text, lang) {
  const re = new RegExp("```(?:" + lang + ")?\\n([\\s\\S]*?)```", "i");
  const m = re.exec(text);
  return (m ? m[1] : text).trim();
}

async function callMouth(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ model: MODEL, stream: false, options: { temperature: 0.3 }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`mouth call failed: ${res.status}`);
  const body = await res.json();
  return body.message.content;
}

// escapeHtml gets a REAL CONTRACT — a pure-function input/output test,
// executed directly, no document composition needed at all. This is the
// module's OWN preferred adjudication path (adjudicate() tries this
// first); for a single, uncontested first proposal it is not needed for
// a VERDICT, but it is real, cheap, decisive evidence recorded on every
// round regardless, so let's compute and log it even on the happy path.
async function escapeHtmlContract(content) {
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(`${content}\nreturn typeof escapeHtml === "function" ? escapeHtml : null;`)();
    if (!fn) return { tested: true, ok: false, detail: "no function named escapeHtml was declared" };
    const out = fn(`<script>alert(1)</script> "quoted" 'and' & more`);
    const safe = typeof out === "string" && !/[<>]/.test(out) && !out.includes('"') && !out.includes("'");
    return { tested: true, ok: safe, detail: safe ? `escapes correctly: ${JSON.stringify(out)}` : `unsafe output: ${JSON.stringify(out)}` };
  } catch (e) {
    return { tested: true, ok: false, detail: `threw: ${String(e?.message ?? e)}` };
  }
}

export const TEMPLATE = {
  skeleton: SKELETON,
  anchors: {
    style: { default: "", contract: null },
    escapeHtml: { default: "", contract: escapeHtmlContract },
    renderEpisodes: { default: "", contract: null },
    subscribe: { default: "", contract: null },
  },
};

export const wellFormed = (html) => {
  const c = checkCode(html);
  return { wellFormed: c.issues === 0, problems: c.findings };
};

const ANCHOR_PROMPTS = {
  style: `Write ONE <style> block's INNER CSS RULES ONLY (no <style> tags themselves) for a podcast listening web app, in the visual style of Spotify: a near-black background (#121212), white and light-gray text, one bright green accent color (#1DB954) used for buttons, a bold sans-serif app title, and episode entries (class "episode") styled as clean horizontal flex ROWS with generous padding — but make sure the row's children (an h3 title, a p date, a span.ethos-badge, and an audio element) never overflow the page horizontally: give the title/date/badge a max-width around 150px with flex:1 and min-width:0, and give audio flex:1 with min-width:0 and box-sizing:border-box too. Also set body { margin:0; overflow-x:hidden; box-sizing:border-box } and html { box-sizing:border-box }. Style these exact existing selectors, and do not invent any others: body, html, h1, .container, input[type="text"], button, .episode, .episode h3, .episode p, .ethos-badge, .episode audio. Return ONLY the CSS rules, no <style> tags, no explanation, no markdown fence label other than css.`,
  escapeHtml: `Write ONE JavaScript function named escapeHtml(str) that takes a string and returns it with the five HTML-special characters replaced by their entities so it is safe to insert into an innerHTML template literal: & becomes &amp;, < becomes &lt;, > becomes &gt;, " becomes &quot;, and ' (single quote) becomes &#39;. Return ONLY that one function, in a fenced javascript code block, nothing else.`,
  renderEpisodes: `Write ONE JavaScript function named renderEpisodes(episodes) for a podcast app's frontend. There is ALREADY a function named escapeHtml(str) declared elsewhere in the same file — you may call it, you do not need to define it. renderEpisodes must: find document.getElementById("episodes"), clear it, then for each episode object ({title, pubDate, audioUrl, ethos}) build one <div class="episode"> using innerHTML with a template literal shaped like this: \`<h3>\${escapeHtml(episode.title)}</h3><p>Published: \${escapeHtml(episode.pubDate)}</p><span class="ethos-badge" style="background-color: \${episode.ethos === "pass" ? "green" : episode.ethos === "conflict" ? "red" : "gray"}"></span><audio controls src="\${episode.audioUrl}"></audio>\` — escapeHtml MUST wrap episode.title and episode.pubDate specifically, since those come from a real RSS feed and can contain quote characters or HTML tags. Append each built div to the container. Return ONLY that one function, in a fenced javascript code block, nothing else.`,
  subscribe: `Write ONE JavaScript function named subscribe() for a podcast app's frontend. There is ALREADY a function named renderEpisodes(episodes) declared elsewhere in the same file — you may call it, you do not need to define it. subscribe() must: read the feed URL from the page's <input type="text"> element, fetch \`/api/subscribe?url=\${encodeURIComponent(url)}\`, and if the response is ok, parse its JSON body (shaped { show: {title}, episodes: [...] }) and call renderEpisodes(data.episodes); if the response is not ok, or the fetch itself throws, show a plain error message inside the #episodes container instead (using textContent, not innerHTML, since an error message string should never be parsed as markup). Return ONLY that one function, in a fenced javascript code block, nothing else.`,
};

async function main() {
  let log = readAnchorLog(LEDGER_FILE);
  const fromStart = log.nextSeq;
  const round = 1;
  const timings = {};

  for (const anchor of Object.keys(TEMPLATE.anchors)) {
    console.log(`# proposing anchor "${anchor}" — isolated call, no skeleton, no other anchor's content in context`);
    const prompt = ANCHOR_PROMPTS[anchor];
    const started = Date.now();
    const raw = await callMouth(prompt);
    const ms = Date.now() - started;
    timings[anchor] = ms;
    const lang = anchor === "style" ? "css" : "javascript";
    const content = extractFence(raw, lang);
    console.log(`  got ${content.length} chars in ${(ms / 1000).toFixed(1)}s`);
    if (anchor === "escapeHtml") {
      const contractResult = await escapeHtmlContract(content);
      console.log(`  contract check: ${contractResult.ok ? "PASS" : "FAIL"} — ${contractResult.detail}`);
    }
    log = proposeAnchor(log, {
      anchor, content, round, writer: MODEL,
      writerAudit: { request: prompt, rawResponse: raw, durationMs: ms, model: MODEL },
    });
  }

  appendAnchorLog(LEDGER_FILE, log, fromStart);

  console.log("\n# folding the anchor log into the final document");
  const fold = await foldCode(log, TEMPLATE, { wellFormed, coherenceGate });
  console.log("clean:", fold.clean, "unsettled:", fold.unsettled, "lintProblems:", fold.lintProblems);

  const outFile = new URL("../the-fold/surface/podcast-app-from-anchors.html", import.meta.url).pathname;
  await (await import("node:fs/promises")).writeFile(outFile, fold.html);
  console.log(`\nwritten to ${outFile}`);
  console.log(`total model time: ${(Object.values(timings).reduce((a, b) => a + b, 0) / 1000).toFixed(1)}s across ${Object.keys(timings).length} isolated calls`);
}

// Guarded, the same lesson learned the hard way earlier this session with
// podcast-app-codegen.mjs: importing this module for its exported TEMPLATE
// / wellFormed (so a re-fold script can share them rather than duplicate)
// must never also trigger four real, live model calls as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exitCode = 1; });
}
