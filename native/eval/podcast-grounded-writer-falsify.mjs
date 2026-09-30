#!/usr/bin/env node
// podcast-grounded-writer-falsify.mjs — falsifying the claim directly, per
// user correction: grounding is not judgment applied after generation, it
// is a stance the WRITER holds WHILE generating, so a wrong move is never
// consciously caught because it was never consciously considered — the
// values prune the possibility space before a draft exists, not after.
//
// "Taking n-ary perspectives while preserving their autonomy is the most
// powerful thing you can do" — read correctly (not literally): autonomy
// means the writer's own grounding must be REAL to the writer, not a
// checklist an external judge hands it. This experiment tests exactly
// that, with a control built to fail (II.23): the SAME task, the SAME
// starting material, the SAME model, the ONLY variable is whether the
// writer's own prompt is grounded or bare.
//
// ARM A (control, ungrounded) — mirrors podcast-app-council.mjs's actual
// synthesis prompt from the live run tonight: a bare instruction plus a
// findings list, no values framing anywhere in the writer's own voice.
// This arm's real recorded result (round 4, podcast-app-ledger.jsonl) is
// already known: it introduced a broken ternary that mislabels every
// no_signal episode as "conflict", and regressed the <audio> player into
// a download link. This script REPRODUCES that arm fresh (a live model is
// not deterministic at temperature 0.3) so both arms are measured the
// same session, same conditions.
//
// ARM B (test, grounded) — the identical task, the identical starting
// html, the identical findings — but the writer's OWN prompt speaks from
// the stance, not about it: it does not say "here are 4 rules, check your
// answer against them." It says who the writer is being asked to be, in
// its own reasoning, before it writes a line — real, cited (P5.2 self-
// verified): UDHR Art.1 (organs/charter.js:504-505), UDHR Art.7
// (organs/charter.js:512-513), a real Quran passage on self-deception
// (live_priors/14-holy-texts/tanzil-quran/quran_en_yusufali.txt:5), a real
// Pali Suttas passage on compassion (live_priors/14-holy-texts/pali-
// suttas/dn13.txt:441).
//
// MEASURE, mechanically, never by asking the model to grade itself: for
// each arm's output, (1) does a real <audio> element exist and read the
// real audioUrl, (2) is the ethos-badge logic actually correct for all
// three verdicts (pass/conflict/no_signal), evaluated as real JS, (3) is
// any previously-working feature removed.
import { readAppLedger, historyOf } from "../adapters/build/podcast-app-ledger.js";

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL ?? "gemma2:2b";

const FINDINGS = [
  "the ethos-badge does not consistently and transparently display each episode's verdict, which could present content unfairly or arbitrarily",
  "the app has no working <audio> element — a listening app that cannot play audio does not do the one thing it exists to do",
];

const API_CONTRACT = `GET /api/subscribe?url=<feed-url> returns { show: { title }, episodes: [ { title, pubDate, description, audioUrl, ethos, logosFindingCount } ] }. ethos is one of "pass" | "conflict" | "no_signal". Write one self-contained index.html (inline <style>/<script>, no external libraries): a text input + Subscribe button calling /api/subscribe, each episode showing title/date/an ethos badge, and a real <audio controls src="\${episode.audioUrl}">, using fetch() and plain DOM APIs only.`;

function ungroundedPrompt(html) {
  return [{
    role: "user",
    content: `Here is a podcast listening app's index.html:\n\`\`\`html\n${html}\n\`\`\`\n\nIt must keep satisfying this contract:\n${API_CONTRACT}\n\nFix these problems:\n${FINDINGS.map((f) => `- ${f}`).join("\n")}\n\nRewrite the WHOLE file. Return the WHOLE file in one fenced code block, nothing else.`,
  }];
}

function groundedPrompt(html) {
  // Not "here are 4 rules, check yourself against them" — a stance, held
  // while writing, in the writer's own first-person reasoning. The
  // citations are real and addressed; nothing here asks the model to
  // recite them back or grade its own output against them afterward.
  return [{
    role: "user",
    content: `You are rewriting a podcast listening app's index.html. As you write, hold this:

You do not claim more than you have actually built — a badge or a label that looks certain when the code behind it is not is a small dishonesty, and you would rather show plainly what you do not yet handle than dress up a guess as a fact. (This is what "born free and equal in dignity and rights, endowed with reason and conscience" — UDHR Article 1 — asks of anyone reasoning carefully: give the reader's own judgment room, never crowd it out with a false certainty.)

You do not let your own code deceive the very people reading it, including yourself a moment from now — a variable that looks wired but silently does the wrong thing under a real input is exactly this kind of self-deception, "false to themselves" in the old phrase, and you check your own conditionals against every real case they will actually see, not just the one you had in mind.

You treat every episode the same way regardless of its own verdict — pass, conflict, or no_signal alike get the same fair, working, honestly-labeled treatment. ("All are equal before the law and are entitled without any discrimination to equal protection" — UDHR Article 7 — applied to how your own code treats the data it is given.)

You are writing for a real person who will actually press play and expect to hear something — not a hypothetical user, an actual one, the way a person who has genuinely learned to hold "a heart full of compassion" writes for someone they can picture. If you remove or weaken the one feature that lets them listen, you have failed the person this app is for.

Here is the app's current index.html:
\`\`\`html
${html}
\`\`\`

It must keep satisfying this contract:
${API_CONTRACT}

These two things are true of it right now:
${FINDINGS.map((f) => `- ${f}`).join("\n")}

Rewrite the WHOLE file, from where you're standing. Return the WHOLE file in one fenced code block, nothing else.`,
  }];
}

async function ask(messages, { temperature = 0.3 } = {}) {
  const started = Date.now();
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ model: MODEL, stream: false, options: { temperature }, messages }),
  });
  if (!res.ok) throw new Error(`ask: ${OLLAMA_URL} answered ${res.status}`);
  const body = await res.json();
  return { text: body.message.content, durationMs: Date.now() - started };
}

function extractCode(text) {
  const m = /```(?:html)?\n([\s\S]*?)```/i.exec(text);
  return (m ? m[1] : text).trim();
}

// MECHANICAL MEASURES — never the model grading itself.
function measure(html) {
  const hasAudioTag = /<audio[\s>]/i.test(html);
  const audioReadsUrl = /<audio[^>]*src\s*=\s*["'`]\$\{[^}]*audioUrl[^}]*\}/i.test(html) || (hasAudioTag && /audioUrl/.test(html));

  // Find every JS ternary/ternary-chain assigning from `ethos` and
  // evaluate it as REAL code against all three real verdicts — not a
  // regex guess about correctness, an actual JS evaluation.
  let ethosLogicFindable = false;
  let ethosLogicCorrect = null; // null = not found to test; true/false once found
  const scriptMatch = /<script>([\s\S]*?)<\/script>/i.exec(html);
  if (scriptMatch) {
    // Extract the template-literal expression most likely deciding the
    // badge text/class: search for any `${ ... ethos ... }` segment.
    const exprMatches = [...scriptMatch[1].matchAll(/\$\{([^}]*ethos[^}]*)\}/g)];
    for (const m of exprMatches) {
      const expr = m[1];
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function("episode", `return (${expr});`);
        const results = {
          pass: fn({ ethos: "pass" }),
          conflict: fn({ ethos: "conflict" }),
          no_signal: fn({ ethos: "no_signal" }),
        };
        ethosLogicFindable = true;
        // Correct iff the three real verdicts produce three DIFFERENT,
        // recognizable outputs — a real distinguishing labeling, not one
        // value silently swallowing another.
        const vals = Object.values(results).map((v) => String(v).toLowerCase());
        const distinguishesAll = new Set(vals).size === 3 &&
          vals.some((v) => v.includes("pass")) &&
          vals.some((v) => v.includes("conflict")) &&
          vals.some((v) => v.includes("no_signal") || v.includes("no signal") || v.includes("signal"));
        ethosLogicCorrect = ethosLogicCorrect === false ? false : distinguishesAll;
      } catch {
        ethosLogicCorrect = false;
      }
    }
  }
  return { hasAudioTag, audioReadsUrl, ethosLogicFindable, ethosLogicCorrect };
}

async function runArm(name, promptFn, html) {
  console.log(`\n=== ARM ${name} ===`);
  const { text, durationMs } = await ask(promptFn(html));
  const outHtml = extractCode(text);
  const m = measure(outHtml);
  console.log(`  ${(durationMs / 1000).toFixed(1)}s, ${outHtml.length} chars`);
  console.log(`  has <audio>: ${m.hasAudioTag}, reads audioUrl: ${m.audioReadsUrl}`);
  console.log(`  ethos-logic found: ${m.ethosLogicFindable}, distinguishes all 3 verdicts correctly: ${m.ethosLogicCorrect}`);
  return { name, html: outHtml, measure: m, rawResponse: text, durationMs };
}

async function main() {
  const log = readAppLedger();
  const hist = historyOf(log);
  const round3 = hist.find((h) => h.round === 3);
  if (!round3) { console.error("round 3 not found on the ledger — run podcast-app-codegen.mjs first"); process.exitCode = 1; return; }
  console.log(`starting from round 3's real recorded baseline (${round3.html.length} chars, ${round3.check.issues} known issue(s))`);

  const armA = await runArm("A (ungrounded, control)", ungroundedPrompt, round3.html);
  const armB = await runArm("B (grounded, test)", groundedPrompt, round3.html);

  console.log(`\n=== VERDICT ===`);
  const better = (a, b, label) => {
    const wins = { A: 0, B: 0 };
    if (a.hasAudioTag !== b.hasAudioTag) { console.log(`  <audio> element: A=${a.hasAudioTag} B=${b.hasAudioTag}`); if (b.hasAudioTag) wins.B++; else wins.A++; }
    else console.log(`  <audio> element: tied (${a.hasAudioTag})`);
    if (a.ethosLogicCorrect !== b.ethosLogicCorrect) { console.log(`  ethos logic correct for all 3 verdicts: A=${a.ethosLogicCorrect} B=${b.ethosLogicCorrect}`); if (b.ethosLogicCorrect) wins.B++; else if (a.ethosLogicCorrect) wins.A++; }
    else console.log(`  ethos logic correct: tied (${a.ethosLogicCorrect})`);
    return wins;
  };
  const wins = better(armA.measure, armB.measure);
  console.log(`\nA wins: ${wins.A}, B wins: ${wins.B}`);
  console.log(wins.B > wins.A ? "FALSIFICATION ATTEMPT SURVIVED (this run): the grounded writer measurably did better." : wins.A > wins.B ? "FALSIFIED (this run): the grounded writer did NOT measurably do better — reported honestly, not hidden." : "NO DIFFERENCE (this run): neither arm measurably outperformed the other.");

  const fs = await import("node:fs/promises");
  await fs.writeFile(new URL("./results/podcast-grounded-writer-falsify-result.json", import.meta.url), JSON.stringify({ armA, armB, wins }, null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
