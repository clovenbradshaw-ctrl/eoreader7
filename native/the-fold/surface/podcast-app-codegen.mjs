#!/usr/bin/env node
// podcast-app-codegen.mjs — THE SYSTEM writes the podcast listening app's
// frontend, not the operator. This file's own job is the same one
// podcast-run.mjs already holds itself to: prompt the mouth, watch what it
// says, mechanically check it, and — bounded by the SAME DMD measured-loop
// stop podcast.js already uses for spoken segments — ask for a revision
// when the check finds something real. Every prompt and every raw model
// response is written to podcast-app-codegen-evidence.json, verbatim, so
// the claim "the model wrote this, not a person" can be checked against
// the actual bytes the model actually returned.
//
//   node podcast-app-codegen.mjs
//
// Reads ER7_OLLAMA_URL / ER7_NB_MODEL (or ER7_PODCAST_MODEL) the same way
// podcast-mouth.mjs does. The mechanical CHECK below is the code-artifact
// analogue of podcast.js's own evaluateSegment: it counts real, checkable
// defects (does it parse, does it wire the real API contract, does it
// actually play audio) as ONE issue count, and the SAME
// kernel/measured-loop.js streaming-DMD stop decides whether another
// revision round is worth asking for.
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { makeMeasuredLoop } from "../../kernel/measured-loop.js";

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL ?? "gemma2:2b";
const CEILING = 6; // the safety floor under the measured stop (P9) — small, because each round is a real ~1-3 minute CPU generation

// THE CONTRACT the generated page must speak — named here once so both the
// prompt and the mechanical check read the SAME facts, never two drifting
// copies of what the API looks like.
const API_CONTRACT = `
The backend already runs at the same origin as this page (relative URLs). It exposes:

  GET /api/subscribe?url=<feed-url>
    Fetches and parses that podcast's real RSS feed. Returns JSON:
    { show: { title }, episodes: [ { title, pubDate, description, audioUrl, ethos, logosFindingCount } ] }
    "ethos" is one of "pass" | "conflict" | "no_signal" (a real charter check already run server-side).

  GET /api/episodes?show=<show-title>
    Returns the same episodes array for a show already subscribed to (no re-fetch).

Write ONE self-contained index.html file (inline <style> and <script>, no external libraries, no build step) for a podcast LISTENING app:
- A text input + "Subscribe" button that calls /api/subscribe?url=... (URL-encode the value) and renders the returned episode list.
- Each episode shows its title, publish date, and an ethos badge (green if "pass"/"no_signal", red if "conflict").
- Each episode has a real HTML5 <audio controls> element whose src is that episode's own audioUrl, so clicking play actually streams and plays the real audio file.
- Use fetch() and plain DOM APIs only (no frameworks). Handle a fetch error by showing a message, never by throwing unhandled.
- Return ONLY the HTML file's contents in one fenced code block, nothing else.
`.trim();

async function callMouth(messages) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ model: MODEL, stream: false, options: { temperature: 0.2 }, messages }),
  });
  if (!res.ok) throw new Error(`mouth call failed: ${res.status}`);
  const body = await res.json();
  return body.message.content;
}

/** Extract the first fenced code block's contents, or the raw text if the mouth forgot the fence. */
function extractCode(text) {
  const m = /```(?:html)?\n([\s\S]*?)```/i.exec(text);
  return (m ? m[1] : text).trim();
}

/**
 * checkCode(html) — the mechanical evaluate step, code's analogue of
 * podcast.js::evaluateSegment. Every check is a real, checkable fact about
 * the bytes, never a style opinion. Returns { issues, findings }.
 */
function checkCode(html) {
  const findings = [];
  const has = (re, why) => { if (!re.test(html)) findings.push(why); };
  has(/<!doctype html>/i, "missing a <!doctype html> declaration");
  has(/<script[\s>]/i, "no <script> block at all — the app cannot call the API without one");
  has(/<\/script>/i, "a <script> tag is opened but never closed — the file is truncated or malformed");
  has(/\/api\/subscribe/, "never calls /api/subscribe — the real backend contract this app is wired to");
  has(/fetch\s*\(/, "no fetch() call found — the page cannot reach the backend at all");
  has(/<audio[\s>]/i, "no <audio> element — this is a LISTENING app; it must be able to play the real enclosure audio");
  has(/audioUrl/, "never reads audioUrl from the API response — an <audio> tag with no real source plays nothing");
  has(/<input[\s>]/i, "no <input> element — there is no way to type a feed URL to subscribe to");
  // A crude but real balance check: an HTML file whose script braces don't
  // balance is very likely truncated or syntactically broken.
  const opens = (html.match(/\{/g) ?? []).length;
  const closes = (html.match(/\}/g) ?? []).length;
  if (opens !== closes) findings.push(`unbalanced braces (${opens} "{" vs ${closes} "}") — likely truncated or malformed script`);
  return { issues: findings.length, findings };
}

/**
 * A STEERING round (user direction, verbatim: "steer it to vastly improve
 * the UX and see what it does"), same discipline as an ordinary generation
 * round: one real, person-like instruction, the mechanical check still
 * runs (the UX ask must not be allowed to break the API contract this app
 * depends on), and the FULL prompt + raw response is recorded — no
 * different from any other steering prompt this file, or podcast.js's own
 * `landMouthAudit`, records verbatim.
 */
async function loadCurrentHtml(outDir) {
  const fs2 = await import("node:fs/promises");
  return fs2.readFile(`${outDir}podcast-app-generated.html`, "utf8");
}

async function main() {
  const args = process.argv.slice(2);
  const improveIdx = args.indexOf("--improve");
  const improveInstruction = improveIdx >= 0 ? (args[improveIdx + 1] ?? "vastly improve the UX") : null;

  const outDir = fileURLToPath(new URL(".", import.meta.url));
  const evidence = { generatedAt: new Date().toISOString(), model: MODEL, mouthUrl: OLLAMA_URL, mode: improveInstruction ? "improve" : "generate", steeringInstruction: improveInstruction, apiContract: API_CONTRACT, rounds: [] };
  const measured = makeMeasuredLoop({ ceiling: CEILING });

  let messages;
  if (improveInstruction) {
    const currentHtml = await loadCurrentHtml(outDir);
    evidence.startingHtml = currentHtml;
    messages = [{
      role: "user",
      content: `Here is a working podcast listening app's index.html:\n\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nIt already satisfies this contract, which you must keep satisfying:\n${API_CONTRACT}\n\nNow: ${improveInstruction}. Keep every API call and the <audio> playback working exactly as before — improve the layout, styling, and interaction, not the data contract. Return the WHOLE improved file in one fenced code block, nothing else.`,
    }];
  } else {
    messages = [{ role: "user", content: `You are writing a small web app.\n\n${API_CONTRACT}` }];
  }
  let html = "";
  let round = 0;
  let stop = null;

  while (true) {
    round += 1;
    console.log(`# round ${round}: asking ${MODEL} at ${OLLAMA_URL} ...`);
    const started = Date.now();
    const raw = await callMouth(messages);
    const ms = Date.now() - started;
    html = extractCode(raw);
    const check = checkCode(html);
    console.log(`  got ${html.length} chars in ${(ms / 1000).toFixed(1)}s; ${check.issues} mechanical issue(s): ${check.findings.join("; ") || "(none)"}`);

    evidence.rounds.push({ round, request: messages, rawResponse: raw, extractedHtml: html, check, durationMs: ms });
    measured.push(check.issues);
    stop = measured.verdict();
    if (!stop.continue) break;

    messages = [
      ...messages,
      { role: "assistant", content: raw },
      { role: "user", content: `Your last answer has real problems: ${check.findings.join("; ")}. Rewrite the WHOLE file, fixing exactly these, in the same fenced code block format.` },
    ];
  }

  evidence.stop = stop;
  const evidenceFile = improveInstruction ? "podcast-app-improve-evidence.json" : "podcast-app-codegen-evidence.json";
  // The improved file lands at its OWN name — the original
  // podcast-app-generated.html (and the model's OWN first attempt) stays
  // on disk untouched, exactly like a ledger's SUPERSEDE keeps the prior
  // entry rather than overwriting it. Both are real, inspectable artifacts.
  const htmlFile = improveInstruction ? "podcast-app-improved.html" : "podcast-app-generated.html";
  await fs.writeFile(`${outDir}${evidenceFile}`, JSON.stringify(evidence, null, 2));
  await fs.writeFile(`${outDir}${htmlFile}`, html);
  console.log(`\nstopped: ${stop.verdict} after ${stop.rounds} round(s)${Number.isFinite(stop.growth) ? ` (growth ${stop.growth.toFixed(4)})` : ""}`);
  console.log(`wrote ${outDir}${htmlFile} and ${evidenceFile}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
