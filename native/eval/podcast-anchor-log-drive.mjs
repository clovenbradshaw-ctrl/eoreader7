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

// THE PERSISTENT PLAYER AND ITS WIRING ARE FIXED SKELETON, NOT AN ANCHOR —
// the same precedent this file's own header already states for the
// doctype/title/input/button structure: this is pure structural boilerplate
// (a hidden bar, shown and filled by one small function) where a model's
// own creativity adds nothing and one more isolated call would only add
// one more chance to get the wiring wrong. `playEpisode` is declared BEFORE
// {{ANCHOR:renderEpisodes}} so a row's own onclick can call it.
//
// CLOSES TWO CONFIRMED GAPS, measured this session against a real Pocket
// Casts screenshot via the real kind-induction organs
// (eval/podcast-kind-discovery.mjs): our app had ZERO of "shows per-
// episode artwork" and "has a persistent player" — the two structural
// facts that most made it read as a generic list rather than a podcast
// app. `<img>` now carries the episode's own real itunes:image URL
// (adapters/build/podcast-feed.js's own real extraction, confirmed
// against a live NPR feed before this was written); the now-playing bar
// is real, fixed-position, and shared across every row.
// FIXED BASE STYLE, NEVER AN ANCHOR — L5 applied to CSS: a compliance-
// critical visual fact is never left to a small model's own instruction-
// following. Measured live (this pass, eval/_tmp-fresh.png): asked in the
// {{ANCHOR:style}} prompt below for an exact page background/text color,
// gemma2:2b's real, isolated response set every OTHER requested value
// correctly (accent, .episode background, border-radius, layout) but never
// once wrote body{background-color|color}, leaving the page rendering the
// browser's own default white-on-black-text regardless of what was asked.
// Separately, its #now-playing rule used plain `display:flex` with no
// `:not([hidden])` guard, and an ID selector's specificity beats the UA
// stylesheet's `[hidden]{display:none}`, so the persistent player bar was
// VISIBLE, empty, before any episode had ever played. Both are placed
// AFTER {{ANCHOR:style}} in cascade order so they always win regardless of
// what the model wrote, with `!important` only on the one property whose
// entire job is overriding a same-specificity author rule.
const BASE_STYLE = `body, html { background-color: #0d0f13; color: #ffffff; }
#now-playing[hidden] { display: none !important; }`;

const SKELETON = `<!DOCTYPE html>
<html>
<head>
  <title>Podcast List</title>
  <style>
{{ANCHOR:style}}
${BASE_STYLE}
  </style>
</head>
<body>
  <div class="container">
    <h1>Podcast List</h1>
    <input type="text" id="feed-url" placeholder="Enter feed URL" />
    <button onclick="subscribe()">Subscribe</button>
  </div>
  <div id="episodes"></div>
  <div id="now-playing" class="now-playing" hidden>
    <img id="now-playing-art" alt="">
    <div class="now-playing-info">
      <div id="now-playing-title"></div>
      <audio id="now-playing-audio" controls></audio>
    </div>
  </div>
  <script>
    function playEpisode(url, title, art) {
      const bar = document.getElementById("now-playing");
      const audio = document.getElementById("now-playing-audio");
      const titleEl = document.getElementById("now-playing-title");
      const artEl = document.getElementById("now-playing-art");
      audio.src = url;
      titleEl.textContent = title;
      if (art) artEl.src = art;
      bar.hidden = false;
      audio.play();
    }

    // CLICK-TO-PLAY IS FIXED SKELETON TOO, NOT LEFT TO renderEpisodes —
    // found live this pass: asking the model to wire an inline
    // onclick="playEpisode(...)" string risked an unescaped-interpolation
    // vulnerability (a real gemma2:2b round shipped exactly that,
    // correctly caught by this file's own coherenceGate lint); asking it
    // to instead call addEventListener itself, in the SAME prompt turn,
    // measurably cost the wiring entirely — the very next round's
    // renderEpisodes rendered a clean, fully escaped row with no play
    // wiring at all. One delegated listener here removes BOTH hazards:
    // renderEpisodes only ever needs to set three plain DOM properties
    // (data-audio/data-title/data-art), which — like .textContent — is a
    // property assignment with no escaping question to get right, ever.
    document.getElementById("episodes").addEventListener("click", (e) => {
      const el = e.target.closest("[data-audio]");
      if (el) playEpisode(el.dataset.audio, el.dataset.title, el.dataset.art);
    });

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

// A real, if narrow, contract: static-text presence of the three things
// this pass's own confirmed gaps require — an <img>, a reference to the
// episode's real artwork field, and a call into the fixed skeleton's own
// playEpisode wiring. Cannot verify BEHAVIOR (that needs a real DOM this
// module has no dependency on) — disclosed as exactly that, same posture
// escapeHtmlContract's own comment already holds for its own narrower
// check.
function renderEpisodesContract(content) {
  // Two genuinely equivalent ways to build an <img>: an innerHTML template
  // literal (what the prompt above shows as an example) and imperative
  // document.createElement("img") + .src assignment (arguably safer — no
  // innerHTML injection surface at all). Measured live this pass: a real
  // gemma2:2b run chose the createElement form unprompted, and the
  // literal-string-only check below reported a false FAIL on genuinely
  // correct, functioning code — confirmed by reading the actual generated
  // content directly, not assumed. Both forms are now recognized.
  const hasImg = /<img\b/i.test(content) || /createElement\s*\(\s*["']img["']\s*\)/i.test(content);
  const hasImageUrl = /episode\.imageUrl\b/.test(content);
  // Click-to-play moved to a fixed skeleton delegated listener this pass
  // (see the ANCHOR_PROMPTS.renderEpisodes comment) — renderEpisodes no
  // longer calls playEpisode itself, it only needs to set the data-*
  // attributes that listener reads. Checked either spelling (dataset
  // property assignment or setAttribute), for audio specifically since
  // that is the one the listener cannot function without.
  const hasDataAudio = /\.dataset\.audio\s*=/.test(content) || /setAttribute\s*\(\s*["']data-audio["']/.test(content);
  // A real, checkable defect class, found live this pass (see the
  // ANCHOR_PROMPTS.renderEpisodes comment above): escapeHtml(...) piped
  // straight into .textContent displays literal HTML-entity text
  // ("&quot;") on screen, because .textContent never decodes entities.
  // A static scan can't prove the ABSENCE of this bug in general (the
  // assignment could be indirect), but it CAN catch the direct, common
  // shape mechanically, which is worth recording even on an uncontested
  // single-candidate round.
  const textContentEscapeMisuse = /\.textContent\s*=\s*escapeHtml\s*\(/.test(content);
  // Another real, checkable defect, found live this pass DESPITE the
  // prompt saying explicitly "escapeHtml before a data-* attribute/dataset
  // assignment — never": a real gemma2:2b round called it anyway. Verified
  // live it genuinely breaks the app, not just cosmetically — a real NPR
  // audio URL's query string ("...?a=1&b=2") got its "&" characters turned
  // into the five literal characters "&amp;" (dataset values are plain
  // strings, never HTML-decoded), so the eventual audio.src the click
  // handler sets is a URL that no longer parses the same way to the real
  // server, and the now-playing title bar showed literal `&quot;...&quot;`
  // around a real episode's title instead of real quote marks. A prompt
  // sentence saying "never" was not enough on its own; this makes it a
  // contract failure so an uncontested round at least surfaces the defect.
  const dataEscapeMisuse = /dataset\.(?:audio|title|art)\s*=\s*escapeHtml\s*\(/.test(content) || /setAttribute\s*\(\s*["']data-(?:audio|title|art)["']\s*,\s*escapeHtml\s*\(/.test(content);
  const ok = hasImg && hasImageUrl && hasDataAudio && !textContentEscapeMisuse && !dataEscapeMisuse;
  const missing = [!hasImg && "<img>", !hasImageUrl && "episode.imageUrl", !hasDataAudio && "data-audio (dataset.audio or setAttribute)"].filter(Boolean);
  return {
    tested: true, ok,
    detail: ok ? "renders an <img> sourced from episode.imageUrl and carries data-audio for the fixed click handler"
      : dataEscapeMisuse
        ? "escapeHtml(...) is applied to a data-audio/data-title/data-art value — this corrupts a real audio URL's own \"&\"-joined query string into literal \"&amp;\" text, breaking playback, and shows a garbled title (literal &quot;) in the now-playing bar"
        : textContentEscapeMisuse
        ? "escapeHtml(...) is assigned directly to .textContent — this will display literal HTML entities (e.g. \"&quot;\") on screen instead of the real character"
        : `missing: ${missing.join(", ")}`,
  };
}

export const TEMPLATE = {
  skeleton: SKELETON,
  anchors: {
    style: { default: "", contract: null },
    escapeHtml: { default: "", contract: escapeHtmlContract },
    renderEpisodes: { default: "", contract: renderEpisodesContract },
    subscribe: { default: "", contract: null },
  },
};

export const wellFormed = (html) => {
  const c = checkCode(html);
  return { wellFormed: c.issues === 0, problems: c.findings };
};

// THIS PASS'S OWN REAL, MEASURED CONVENTIONS, BAKED IN AT THE SOURCE — not
// discovered again by a repair loop after the fact. Every number below was
// independently measured this session, never picked to "look nice":
//   - #0d0f13 background: reference-fit.js's own 9-EO-operator ledger,
//     landed as the DERIVED median of the-fold's #0f0f12 and heimdall's
//     #0b0e14 once a THIRD, divergent reference (a real Pocket Casts
//     screenshot, #303030) was correctly excluded as CONTESTED rather
//     than blended in.
//   - color-scheme: dark: makes native <audio>/<input> controls render in
//     dark chrome instead of a jarring light bar — organs/girard.js-
//     adjacent, caught live watching the app's own audio players.
//   - a system sans-serif stack: the browser-default serif was reading as
//     unstyled next to a deliberately dark, modern theme.
//   - border-radius 8px on .episode: girard.js's dominantConvention,
//     median across the-fold and heimdall (n>=50 real declarations).
//   - .episode background one step lighter than the page (ELEVATION_STEP,
//     +2.7 points of HSL lightness, exact agreement between those same
//     two real local systems) — makes a card read as a card.
//   - a 56px rounded thumbnail + a two-row layout (title full-width, then
//     meta+controls): real, measured absence — eval/podcast-kind-
//     discovery.mjs found our app matched ZERO of the ten structural
//     concepts a real Pocket Casts screenshot and a real Grafana
//     dashboard were independently, visually confirmed to use; artwork
//     and a persistent player were the two the null actually licensed
//     (induceEntityKindCandidates correctly refused to invent a "kind"
//     from a 2-entity population, but the per-entity feature list itself
//     is a real, disclosed observation, not a guess).
const ANCHOR_PROMPTS = {
  style: `Write ONE <style> block's INNER CSS RULES ONLY (no <style> tags themselves) for a podcast listening web app. Use these EXACT measured values, not your own choices: page background #0d0f13, body text color #ffffff, one accent color #1DB954 used for the Subscribe button and the first episode's title, .episode background #191919 (one step lighter than the page), .episode border-radius 8px. Set body { margin:0; overflow-x:hidden; box-sizing:border-box; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color-scheme:dark } and html { box-sizing:border-box }. Layout: .container is a centered flex column, max-width 640px, padding 24px 16px. .episode is a flex ROW with a fixed 56px-by-56px rounded (border-radius 8px) cover-art <img> on the left (object-fit:cover, flex-shrink:0), and a column to its right containing the title (full width, no truncation, margin-bottom 4px), then a row with the episode's date (small, gray, #b3b3b3) and its ethos-badge dot (10px circle) side by side. #now-playing is FIXED to the bottom of the viewport (position:fixed, bottom:0, left:0, right:0), a flex row with padding, background #191919, containing a 48px rounded now-playing-art image and a now-playing-title next to its audio element; #now-playing[hidden] must stay hidden (display:none). Style these exact selectors, and do not invent any others: body, html, h1, .container, input[type="text"], button, .episode, .episode img, .episode h3, .episode p, .ethos-badge, #now-playing, #now-playing img, #now-playing-title, #now-playing audio. Return ONLY the CSS rules, no <style> tags, no explanation, no markdown fence label other than css.`,
  escapeHtml: `Write ONE JavaScript function named escapeHtml(str) that takes a string and returns it with the five HTML-special characters replaced by their entities so it is safe to insert into an innerHTML template literal: & becomes &amp;, < becomes &lt;, > becomes &gt;, " becomes &quot;, and ' (single quote) becomes &#39;. Return ONLY that one function, in a fenced javascript code block, nothing else.`,
  // Rewritten this pass — a real, live gemma2:2b run against the OLD
  // version of this prompt (which only showed an innerHTML-template-literal
  // example) chose an equally valid createElement()+textContent approach
  // instead, and correctly kept the "always escapeHtml a real-feed field"
  // instruction while doing so — but .textContent never interprets HTML
  // entities, so `title.textContent = escapeHtml(episode.title)` displayed
  // the literal five characters "&quot;" on screen around a quoted episode
  // title, confirmed live (eval/_tmp-fresh.png, this pass). The old prompt
  // never said escapeHtml is innerHTML-specific; this one does, explicitly,
  // for whichever DOM-building approach the model picks.
  // "escapeHtml MUST wrap episode.title/pubDate" (this prompt's own earlier
  // wording) turned out ambiguous about WHERE: a real gemma2:2b run this
  // pass escaped it correctly inside <h2>/<p> text content but left it
  // RAW inside alt="${episode.title}" and an inline onClick='...' string —
  // caught mechanically by this file's own coherenceGate/checkCode lint,
  // which correctly refused the round (clean: false) rather than shipping
  // it. Fixed two ways: the rule now says "every interpolation site",
  // named explicitly including attribute values; and inline
  // onclick="...('${field}')" attribute strings are forbidden outright,
  // since interpolating a value into a JS-string-inside-an-HTML-attribute
  // needs BOTH JS-string escaping AND HTML-attribute escaping at once,
  // which escapeHtml alone cannot satisfy — addEventListener sidesteps the
  // whole class of bug rather than asking a small model to get a harder
  // double-escaping case right.
  // Simplified again this pass: the previous version asked the model to
  // both AVOID an inline onclick string AND instead call
  // addEventListener(...playEpisode...) itself — a real gemma2:2b round
  // correctly avoided the unsafe pattern and then silently dropped the
  // click wiring entirely (a clean, fully escaped row, but nothing
  // happened when clicked). Click-to-play is now fixed skeleton (a single
  // delegated listener on #episodes, declared once above, reused
  // unconditionally — the same "one more isolated call is one more chance
  // to get shared wiring wrong" reasoning this file's header already
  // states for the persistent player itself). renderEpisodes' own job is
  // now only to set three data-* attributes, which — like .textContent —
  // is a plain DOM property/attribute assignment with no escaping
  // question to ever get right or wrong.
  renderEpisodes: `Write ONE JavaScript function named renderEpisodes(episodes) for a podcast app's frontend. There is ALREADY a function named escapeHtml(str) declared elsewhere in the same file — you may call it, you do not need to define it. There is ALREADY a click handler wired on the #episodes container that reads data-audio/data-title/data-art attributes off whatever element was clicked and plays it — you do NOT need to call any play function or attach any click listener yourself. renderEpisodes must: find document.getElementById("episodes"), clear it, then for each episode object ({title, pubDate, audioUrl, imageUrl, ethos}) build one row element with className (or class, if using an HTML string) set to the EXACT literal string "episode" — this exact class name, no other, since a separate stylesheet already targets .episode and a different class name on the row means none of that styling applies — and append it to the container. The row must contain an <img> whose src is episode.imageUrl and whose alt is "" (a decorative image, not a text alternative — do not put episode.title in alt); the episode's title; a line reading "Published: " followed by episode.pubDate; and a small <span class="ethos-badge"> whose background color is green if episode.ethos === "pass", red if episode.ethos === "conflict", otherwise gray. On the SAME row element (not just the image), set three data attributes carrying the values the existing click handler needs: data-audio = episode.audioUrl, data-title = episode.title, data-art = episode.imageUrl — set these with row.dataset.audio = episode.audioUrl (etc.), or row.setAttribute("data-audio", episode.audioUrl) — do NOT call escapeHtml on any of these three values, and never write them into an HTML string. Concretely: a real audio URL looks like "https://example.com/ep.mp3?id=1&size=200" — if you called escapeHtml on it, the "&" would become the five literal characters "&amp;" in the stored value, and the episode would fail to play because that is no longer the real URL's own query string. You may build the visible row content EITHER by setting innerHTML to a template literal, OR by using document.createElement plus property assignment — both are fine, pick either. CRITICAL RULE about escapeHtml, whichever approach you pick for the visible content: escapeHtml(str) converts special characters into HTML entities (like &quot; for a quote mark) so they render as literal text instead of being parsed as markup — this is needed for EVERY interpolation site inside an innerHTML string, including inside attribute values, not only where the text is visibly displayed. It is ONLY needed for innerHTML, though: if you set an element's .textContent property instead, pass episode.title/episode.pubDate DIRECTLY, with NO escapeHtml call at all — .textContent already displays text safely on its own and does NOT interpret HTML entities, so escapeHtml("that's it") assigned to .textContent would show the reader the literal, wrong text "that&#39;s it" instead of "that's it". In short: escapeHtml at every innerHTML interpolation site — yes; escapeHtml before .textContent, or before a data-* attribute/dataset assignment — never. Return ONLY that one function, in a fenced javascript code block, nothing else.`,
  // Pinned to id="feed-url" — a live gemma2:2b run against the old,
  // selector-vague version of this prompt ("the page's <input type=\"text\">
  // element") independently guessed document.getElementById("url"), which
  // does not exist on this fixed skeleton (the earlier run of the same
  // pipeline had independently guessed document.querySelector('input[type=
  // "text"]'), which DOES work — the ambiguity itself is the bug, not
  // either guess). Confirmed live: the id-less version threw synchronously
  // ("Cannot read properties of null (reading 'value')") before the fetch
  // was ever made, silently — a synchronous throw from an inline
  // onclick="subscribe()" handler bypasses subscribe()'s own internal
  // .catch(), so nothing in #episodes ever changed and no console error
  // was visible without instrumenting window.onerror directly. The
  // skeleton's <input> now carries id="feed-url" precisely so this prompt
  // never has to describe the element by an ambiguous selector again.
  subscribe: `Write ONE JavaScript function named subscribe() for a podcast app's frontend. There is ALREADY a function named renderEpisodes(episodes) declared elsewhere in the same file — you may call it, you do not need to define it. subscribe() must: read the feed URL from document.getElementById("feed-url").value (that exact id, already present in the page's HTML), fetch \`/api/subscribe?url=\${encodeURIComponent(url)}\`, and if the response is ok, parse its JSON body (shaped { show: {title}, episodes: [...] }) and call renderEpisodes(data.episodes); if the response is not ok, or the fetch itself throws, show a plain error message inside the #episodes container instead (using textContent, not innerHTML, since an error message string should never be parsed as markup). Return ONLY that one function, in a fenced javascript code block, nothing else.`,
};

async function main() {
  let log = readAnchorLog(LEDGER_FILE);
  const fromStart = log.nextSeq;
  const round = 1;
  const timings = {};

  // Bounded contract-failure retry — closes a real gap found live this
  // pass: a mechanical contract (escapeHtmlContract, renderEpisodesContract)
  // was computed and LOGGED on every round, but nothing acted on a FAIL —
  // an uncontested single candidate was accepted regardless, so a prompt
  // sentence alone ("never call escapeHtml on a data-* value") was not
  // enough to stop a real, functionally-broken round (a corrupted audio
  // URL) from shipping. This is the same lesson the model-proxy section of
  // this repo's own CLAUDE.md states for a different layer: "a compliance-
  // critical fact is never left to the model's own instruction-following" —
  // here, a MECHANICAL check exists but had no mechanical consequence. Up
  // to MAX_CONTRACT_RETRIES extra isolated calls are made, each handed the
  // exact contract failure detail as concrete feedback (this session's own
  // earlier finding, elsewhere in this repo: a concrete worked example or
  // failure reason outperforms an abstract rule for a small model). If
  // every attempt still fails, the LAST attempt ships anyway (never
  // silently discarding real content) with the failure disclosed on the
  // console and left on the record via writerAudit — an honest limit of a
  // 2B model's reliability, not hidden.
  const MAX_CONTRACT_RETRIES = 2;

  for (const anchor of Object.keys(TEMPLATE.anchors)) {
    console.log(`# proposing anchor "${anchor}" — isolated call, no skeleton, no other anchor's content in context`);
    const basePrompt = ANCHOR_PROMPTS[anchor];
    const contractFn = TEMPLATE.anchors[anchor].contract;
    let prompt = basePrompt;
    let content, raw, ms, contractResult = null;
    for (let attempt = 0; attempt <= MAX_CONTRACT_RETRIES; attempt++) {
      const started = Date.now();
      raw = await callMouth(prompt);
      ms = Date.now() - started;
      const lang = anchor === "style" ? "css" : "javascript";
      content = extractFence(raw, lang);
      console.log(`  attempt ${attempt + 1}: got ${content.length} chars in ${(ms / 1000).toFixed(1)}s`);
      if (contractFn) {
        contractResult = await contractFn(content);
        console.log(`  contract check: ${contractResult.ok ? "PASS" : "FAIL"} — ${contractResult.detail}`);
        if (contractResult.ok || attempt === MAX_CONTRACT_RETRIES) break;
        prompt = `${basePrompt}\n\nYour previous attempt failed a mechanical check: ${contractResult.detail}. Write it again from scratch, fixing exactly that, and keeping everything else the same.`;
      } else {
        break;
      }
    }
    timings[anchor] = ms;
    if (contractFn && !contractResult.ok) {
      console.log(`  WARNING: shipping "${anchor}" despite a failing contract after ${MAX_CONTRACT_RETRIES + 1} attempts — ${contractResult.detail}`);
    }
    log = proposeAnchor(log, {
      anchor, content, round, writer: MODEL,
      writerAudit: { request: prompt, rawResponse: raw, durationMs: ms, model: MODEL, contract: contractResult },
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
