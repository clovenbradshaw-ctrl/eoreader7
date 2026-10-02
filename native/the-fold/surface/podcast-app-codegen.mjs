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
import { readAppLedger, landAppRound, appendAppRound, projectApp } from "../../adapters/build/podcast-app-ledger.js";
import { extractPlaceholders } from "../../adapters/build/coherence-properties.mjs";

const OLLAMA_URL = process.env.ER7_MOUTH_URL ?? process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11439";
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
 * templateLiteralAssignments(html, prop) — every `<expr>.<prop> = \`...\`;`
 * block in the source, matched by hand-walking `${...}` nesting rather than
 * a single regex (a naive `[\s\S]*?\`` non-greedy match stops at the FIRST
 * closing backtick, which can sit inside an unrelated nested `${...}` —
 * this walks depth so a real backtick terminates the block only outside any
 * open `${`). Returns the RAW block text (including the backticks) for each
 * assignment found, oldest first.
 */
export function templateLiteralAssignments(html, prop) {
  const assignRe = new RegExp(`\\.${prop}\\s*=\\s*\``, "g");
  const blocks = [];
  let m;
  while ((m = assignRe.exec(html))) {
    const start = m.index + m[0].length - 1; // the opening backtick's own index
    let i = start + 1;
    let depth = 0;
    while (i < html.length) {
      if (html[i] === "\\") { i += 2; continue; }
      if (depth === 0 && html[i] === "`") break;
      if (html[i] === "$" && html[i + 1] === "{") { depth += 1; i += 2; continue; }
      if (depth > 0 && html[i] === "{") { depth += 1; i += 1; continue; }
      if (depth > 0 && html[i] === "}") { depth -= 1; i += 1; continue; }
      i += 1;
    }
    blocks.push(html.slice(start, i + 1));
    assignRe.lastIndex = i;
  }
  return blocks;
}

/**
 * checkCode(html) — the mechanical evaluate step, code's analogue of
 * podcast.js::evaluateSegment. Every check is a real, checkable fact about
 * the bytes, never a style opinion. Returns { issues, findings }.
 *
 * FOUND LIVE, ADDED HERE (2026-09-30): every prior version of this check
 * was PURELY TEXTUAL — regex presence tests against the raw source — and a
 * real e2e run found exactly the gap that shape always has (the same one
 * coherence-properties.mjs's consistencyScore/otherModelingScore already had to
 * be rewritten away from, this session): a round that swapped
 * `.innerHTML =` for `.textContent =` on the IDENTICAL raw-markup template
 * string scored "0 mechanical issues" here, because `/<audio[\s>]/i` still
 * matched the literal substring "<audio" sitting inert inside a
 * `.textContent` assignment — verified live, in real Chrome, that the
 * resulting page has NO real <audio> element at all; the whole episode
 * markup renders as literal escaped text on screen. Two checks below are
 * the fix, both real structural facts about the bytes, neither requiring a
 * live DOM to compute (a live-browser behavioral check, the more general
 * fix, is real future work — see the podcast-cv-checkpoint-demo.mjs /
 * escapingScore precedent this session already built for that shape):
 *
 * (1) episodeDataInInnerHtml — the SPECIFIC, already-proven-exploitable
 *     pattern (a real NPR title containing a quote broke exactly this
 *     shape): episode.title/pubDate/ethos interpolated directly into a
 *     `.innerHTML = \`...\`` template literal. This is not a style
 *     opinion; it is the literal bytes of a real, demonstrated injection.
 * (2) markupSunkIntoTextContent — the NEW regression this e2e run found:
 *     a `.textContent = \`...\`` assignment whose string contains what
 *     look like HTML tags (`<h3`, `<audio`, `<div`, etc.) is a tell that
 *     markup meant to be REAL elements got assigned as inert text instead
 *     — exactly the round-15 defect, structurally.
 */
export function checkCode(html) {
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

  // FOUND LIVE, FIXED HERE (2026-09-30, second occurrence): the first cut
  // of this check flagged ${escapeHtml(episode.title)} exactly the same
  // as raw ${episode.title} — it pattern-matched the SPAN's text for the
  // property name, never checking what actually mediates it. This is the
  // referents-vs-spans mistake this whole session's own design correction
  // already named for code anchors, showing up again one register down:
  // a property access is not unsafe or safe by its own text, it is safe
  // or unsafe depending on whether it is REACHED THROUGH the escapeHtml
  // referent. Each interpolation is now extracted and judged on its own
  // (extractPlaceholders, reused from coherence-properties.mjs rather than a
  // second nested-brace walker) — .ethos is exempt because every real
  // prompt and every real generated round uses it only in a strict `===`
  // comparison to choose a hardcoded color, never as raw inserted text;
  // .title/.pubDate must be wrapped in a call whose own name resolves to
  // escapeHtml specifically, not merely "some function or other".
  const injected = templateLiteralAssignments(html, "innerHTML")
    .flatMap((block) => extractPlaceholders(block))
    .filter((expr) => /\.(title|pubDate)\b/.test(expr) && !/escapeHtml\s*\(\s*[\w.]*\.(title|pubDate)\b/.test(expr));
  if (injected.length) {
    findings.push(`episode data (.title/.pubDate) is interpolated into an innerHTML template literal without being wrapped in escapeHtml(...) first — a title containing a quote or HTML tag can break the markup or inject a script (this exact bug broke a real NPR episode title this session); found: ${injected.slice(0, 3).join(", ")}`);
  }
  const stranded = templateLiteralAssignments(html, "textContent")
    .filter((block) => /<(h[1-6]|div|span|p|a|audio|img|button|li|ul)[\s>]/i.test(block));
  if (stranded.length) {
    findings.push(`a .textContent assignment contains what looks like real HTML markup (a <${/<([a-z0-9]+)/i.exec(stranded[0])?.[1] ?? "tag"}> tag) inside the string — .textContent always renders its whole argument as literal visible text, never as real elements, so this will show angle-bracket text on the page instead of a working episode list; build real elements with document.createElement(...) and appendChild(...) instead`);
  }
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
// FOUND LIVE, FIXED HERE: this always re-read podcast-app-generated.html
// (the model's very first, unedited output), so every --improve round
// re-reviewed the SAME original code and threw away whatever the
// previous round had built — a real code reviewer reviews the CURRENT
// state, not the original PR diff, on every pass. Discovered because a
// second consecutive --improve round (targeting a specific bug in the
// FIRST round's own now-playing wiring) silently reverted the whole
// app's styling back to its pre-styled original — losing real, wanted
// work rather than building on it. `--fresh` is the escape hatch for
// the rare case a reviewer genuinely wants to start over from scratch.
//
// APPEND-ONLY, FOUND LIVE AND FIXED (2026-09-30): this used to read (and
// the caller below used to WRITE) one mutable file on disk, overwritten in
// place on every single round — mechanical-repair rounds AND --improve
// steering rounds alike. Every prior round's artifact was destroyed with
// no record: a real, direct violation of the append-only discipline this
// whole codebase holds everywhere else (podcast.js's own landSegment:
// "same task_id, PROPOSE then SUPERSEDE, never destroyed" — THE-ENZYME-
// PIPELINE.md's I-append: "nothing deleted in place; release is a recorded
// act, never an erasure"). "Current" now means the LEDGER's fold
// (podcast-app-ledger.js, the same task-log kernel every other ledger in
// this tree already uses) — every round lands as its own entry, forever,
// and the mutable file is gone.
async function loadCurrentHtml(outDir, { fresh } = {}) {
  if (!fresh) {
    const fold = projectApp(readAppLedger());
    if (fold?.html) return fold.html;
    // The ledger is empty (a fresh checkout, before any round has ever
    // landed on it) — read the PR's own already-committed first-round
    // artifact ONCE as the seed. This is a READ, never a write: nothing
    // downstream touches this file again.
  }
  try { return await fs.readFile(`${outDir}podcast-app-generated.html`, "utf8"); } catch { return null; }
}

async function main() {
  // No "--improve" flag: a review instruction is just an ordinary
  // argument. `--improve` presupposed every steering ask is an
  // "improvement" (a bug report, a correction, or a redesign ask all
  // qualify equally) and forced a caller to spell a flag name to say
  // what a bare instruction string already says on its own. Bare
  // `node podcast-app-codegen.mjs` (no args) still means "build it
  // fresh"; any other argument text means "steer the current app with
  // this instruction" — `--fresh` is the one real flag left, since
  // "start over from scratch" is a genuinely distinct request from the
  // instruction itself.
  const args = process.argv.slice(2);
  const fresh = args.includes("--fresh");
  const instructionWords = args.filter((a) => a !== "--fresh");
  const improveInstruction = instructionWords.length > 0 ? instructionWords.join(" ") : null;

  const outDir = fileURLToPath(new URL(".", import.meta.url));
  const evidence = { generatedAt: new Date().toISOString(), model: MODEL, mouthUrl: OLLAMA_URL, mode: improveInstruction ? "improve" : "generate", steeringInstruction: improveInstruction, apiContract: API_CONTRACT, rounds: [] };
  const measured = makeMeasuredLoop({ ceiling: CEILING });

  let messages;
  if (improveInstruction) {
    const currentHtml = await loadCurrentHtml(outDir, { fresh });
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

  // APPEND-ONLY, EVERY ROUND (2026-09-30): a mechanical-repair round that
  // is STILL broken is real, valuable fiber — "everything the collapse
  // could have been but wasn't" (THE-ENZYME-PIPELINE.md §6) — not
  // something to discard the moment a later round supersedes it. Every
  // internal round of THIS invocation's own DMD loop lands as its own
  // entry on the ledger, not only the one the loop finally settles on;
  // `settled` distinguishes the one the loop actually stopped at.
  // `ledgerRound` keeps incrementing across separate script invocations
  // (never resets to 1), so the ledger's own round numbering is a true,
  // monotonic history of every codegen run ever made, not per-process.
  let log = readAppLedger();
  let ledgerRound = (projectApp(log)?.round ?? 0);

  while (true) {
    round += 1;
    ledgerRound += 1;
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

    const from = log.nextSeq;
    log = landAppRound(log, {
      round: ledgerRound, mode: improveInstruction ? "improve" : "generate", instruction: improveInstruction, html, check, fresh,
      audit: { request: messages, rawResponse: raw, durationMs: ms, model: MODEL },
    });
    appendAppRound(undefined, log, from);

    if (!stop.continue) break;

    messages = [
      ...messages,
      { role: "assistant", content: raw },
      { role: "user", content: `Your last answer has real problems: ${check.findings.join("; ")}. Rewrite the WHOLE file, fixing exactly these, in the same fenced code block format.` },
    ];
  }

  evidence.stop = stop;
  const evidenceFile = improveInstruction ? "podcast-app-improve-evidence.json" : "podcast-app-codegen-evidence.json";
  // This per-invocation evidence file stays (a convenient snapshot of THIS
  // run's own rounds, for quick human inspection) — the ledger, not this
  // file, is now the authoritative cross-invocation record; nothing reads
  // this file back as input to a later run.
  await fs.writeFile(`${outDir}${evidenceFile}`, JSON.stringify(evidence, null, 2));
  console.log(`\nstopped: ${stop.verdict} after ${stop.rounds} round(s)${Number.isFinite(stop.growth) ? ` (growth ${stop.growth.toFixed(4)})` : ""}`);
  console.log(`landed on the ledger at round ${ledgerRound} (podcast-app-ledger.jsonl); snapshot written to ${evidenceFile}`);
}

// Guarded: importing this module for its exported checkCode/
// templateLiteralAssignments (for testing, or for a sibling script) must
// NEVER also trigger a real, live, multi-minute model generation as a side
// effect — found live, the hard way, when a plain import() during testing
// silently kicked off a real round against the local model. `main()` only
// runs when this file is the process's own entry point.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exitCode = 1; });
}
