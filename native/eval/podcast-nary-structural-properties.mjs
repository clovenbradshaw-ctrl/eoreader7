#!/usr/bin/env node
// podcast-nary-structural-properties.mjs — the third and load-bearing
// correction, direct from the user, verbatim: "We definitely can't ground
// it so explicitly in the UDHR, it's more than the UDHR... If we have a
// morality governor, people will turn it off. But we have a thesis:
// intelligence is always grounded in ethos. Our system is MORE intelligent
// for being more moral. And 'morality' is what you call it FROM THE POV OF
// AN INDIVIDUALIST VALUE SYSTEM."
//
// podcast-app-council.mjs and podcast-nary-autonomy-falsify.mjs both cited
// the UDHR/Quran/Pali Canon as the OPERATIVE content of the writer's own
// prompt — "you do not claim more than you've earned... UDHR Article 1
// says..." That is a morality module wearing an engineering costume, and
// it is exactly the thing this project's own P32/P86/Ranke epistemics
// already have a name for doing wrong: trusting a claim because ONE
// authority states it, rather than because independent witnesses converge
// on it. Citing scripture as the reason a variable must be correct is bad
// TRIANGULATION even when the citations are real.
//
// The correction, applied structurally: the four things previously called
// "humility / honesty / justice / empathy" are not moral add-ons to
// correct reasoning — they are the STRUCTURAL PROPERTIES correct,
// generalizing, multi-agent reasoning already requires, under names an
// individualist ethical framework happens to have given them from the
// outside. Renamed to their operative, engineering form:
//
//   CALIBRATION      (was "humility")  — a label must never assert more
//     certainty than the evidence distinguishes. This is not modesty; an
//     overconfident, uncalibrated label is simply WRONG more often.
//   CONSISTENCY      (was "honesty")   — a declared capability (a link
//     that looks like a play control) must match what is actually wired.
//     This is not candor; a component that claims one behavior and
//     performs another is a BUG, the same bug class this repo already
//     calls self-deception in provenance.js.
//   INVARIANCE       (was "justice")   — the same input SHAPE must be
//     handled the same way regardless of its particular value. This is
//     not fairness-as-virtue; it is the literal definition of a
//     generalizing rule vs. one that overfits to a special case.
//   OTHER-MODELING   (was "empathy")   — reasoning is checked against the
//     ACTUAL state/need of the entity it is for (a real listener under
//     real conditions), never against the writer's own default assumption
//     of what "should" be true. This is not compassion; it is accurate
//     modeling of the actual task, the same property theory-of-mind names
//     in multi-agent coordination.
//
// The wisdom texts move from OPERATIVE PROMPT to CONVERGENT VALIDATION
// APPENDIX — recorded on the audit record as corroborating evidence that
// each property is independently attested across traditions with no
// contact with each other, never injected into the writer's own working
// context. A future reader auditing WHY these four properties were chosen
// (not an in-context reason the writer needed) finds the corroboration;
// the writer itself is never handed a scripture citation to reason FROM.
//
// SAME two orthogonal features as the prior falsification (audio playback;
// the ethos badge), same isolated-snippet/no-synthesis-funnel design —
// the mechanism under test there (structural autonomy prevents
// cross-feature interference) should not depend on whether the prompt
// wording is scriptural or engineering-native. If removing the scripture
// framing DEGRADES the result, that is itself a real, disclosed finding
// worth reporting, not something to paper over.
import { readAppLedger, historyOf } from "../adapters/build/podcast-app-ledger.js";

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL ?? "gemma2:2b";

const AUDIO_SNIPPET_RE = /<a href="\$\{episode\.audioUrl\}"[\s\S]*?<\/a>/;
const ETHOS_SNIPPET_RE = /\$\{episode\.ethos === 'pass' \? 'pass' : 'conflict' \? 'conflict' : 'no_signal'\}/;

// The convergent-validation appendix: recorded on the audit record for
// anyone asking WHY these four properties, never handed to the writer.
// Each entry names its independent tradition and its address (P5.2) —
// unchanged from the prior scripts, just relocated off the writer's path.
const VALIDATION_APPENDIX = {
  calibration: [{ tradition: "Universal Declaration of Human Rights, Art. 1", source: "organs/charter.js:504-505" }],
  invariance: [{ tradition: "Universal Declaration of Human Rights, Art. 7", source: "organs/charter.js:512-513" }],
  consistency: [{ tradition: "Quran (Yusuf Ali), Surah 2", source: "live_priors/14-holy-texts/tanzil-quran/quran_en_yusufali.txt:5" }],
  "other-modeling": [{ tradition: "Dīgha Nikāya 13, Pali Canon (trans. Sujato)", source: "live_priors/14-holy-texts/pali-suttas/dn13.txt:441" }],
};

// The writer's own operative stance — engineering-native, no citation,
// no appeal to any authority. A property is stated as what it structurally
// IS, not as a rule handed down.
const PROPERTY = {
  audio: `Two structural properties govern this fragment. CONSISTENCY: a control that visually claims to play audio must actually play audio — a download link labeled as a play control is a bug, a mismatch between declared and actual behavior, not merely a missing feature. OTHER-MODELING: the code is checked against what the actual listener needs under actual conditions (they want to press play now, on this page, not download a file and find a separate player) — never against a guess about what "should" be enough.`,
  ethos: `Two structural properties govern this fragment. CALIBRATION: the label shown must never assert more or different certainty than the underlying value actually distinguishes — three real, distinct verdicts exist (pass, conflict, no_signal) and the label must resolve to the correct one of exactly three, never silently collapse two into one. INVARIANCE: every one of the three verdicts is handled by the SAME rule, applied uniformly — no verdict may fall through and borrow another's label as a side effect of how the expression happens to be written.`,
};

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

function extractCode(text, lang = "js") {
  const re = new RegExp("```(?:" + lang + ")?\\n([\\s\\S]*?)```", "i");
  const m = re.exec(text);
  return (m ? m[1] : text).trim();
}

function snippetPrompt(feature, snippet) {
  const task = feature === "audio"
    ? `Here is one small fragment of a podcast app's template. It builds a link for one episode, but it downloads the file instead of playing it:\n\`\`\`js\n${snippet}\n\`\`\`\nRewrite ONLY this fragment so it plays the audio with a real <audio controls src="\${episode.audioUrl}"> element. You have no other context about the surrounding file — just make this one fragment correct and self-contained; it sits inside a template literal that already has \`episode\` in scope.`
    : `Here is one small fragment of a podcast app's template. It is supposed to show one of three labels depending on \`episode.ethos\` (which is always exactly "pass", "conflict", or "no_signal"), but it has a bug:\n\`\`\`js\n${snippet}\n\`\`\`\nRewrite ONLY this fragment (a single JS expression inside a \${...} template placeholder) so it correctly shows a distinct label for all three real values. You have no other context about the surrounding file — just make this one expression correct and self-contained.`;
  return [{ role: "user", content: `${PROPERTY[feature]}\n\n${task}\n\nReturn ONLY the rewritten fragment in one fenced code block, nothing else — no explanation, no surrounding HTML.` }];
}

function measure(html) {
  const hasAudioTag = /<audio[\s>]/i.test(html);
  const audioReadsUrl = /<audio[^>]*src\s*=\s*["'`]\$\{[^}]*audioUrl[^}]*\}/i.test(html) || (hasAudioTag && /audioUrl/.test(html));
  let ethosLogicFindable = false;
  let ethosLogicCorrect = null;
  for (const m of html.matchAll(/\$\{([^}]*ethos[^}]*)\}/g)) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("episode", `return (${m[1]});`);
      const results = { pass: fn({ ethos: "pass" }), conflict: fn({ ethos: "conflict" }), no_signal: fn({ ethos: "no_signal" }) };
      ethosLogicFindable = true;
      const vals = Object.values(results).map((v) => String(v).toLowerCase());
      const distinguishesAll = new Set(vals).size === 3 &&
        vals.some((v) => v.includes("pass")) && vals.some((v) => v.includes("conflict")) &&
        vals.some((v) => v.includes("no_signal") || v.includes("no signal") || v.includes("signal"));
      ethosLogicCorrect = ethosLogicCorrect === false ? false : distinguishesAll;
    } catch { ethosLogicCorrect = false; }
  }
  return { hasAudioTag, audioReadsUrl, ethosLogicFindable, ethosLogicCorrect };
}

async function runOne(html) {
  const audioSnippet = AUDIO_SNIPPET_RE.exec(html)?.[0];
  const ethosSnippet = ETHOS_SNIPPET_RE.exec(html)?.[0];
  if (!audioSnippet || !ethosSnippet) throw new Error("could not isolate both snippets");

  const [audioResult, ethosResult] = await Promise.all([
    ask(snippetPrompt("audio", audioSnippet)).then((r) => ({ ...r, feature: "audio" })),
    ask(snippetPrompt("ethos", ethosSnippet)).then((r) => ({ ...r, feature: "ethos" })),
  ]);
  const newAudioFragment = extractCode(audioResult.text);
  const newEthosFragment = extractCode(ethosResult.text);
  let outHtml = html.replace(AUDIO_SNIPPET_RE, () => newAudioFragment);
  outHtml = outHtml.replace(ETHOS_SNIPPET_RE, () => newEthosFragment);
  const m = measure(outHtml);
  return { m, audioMs: audioResult.durationMs, ethosMs: ethosResult.durationMs, fragments: { audio: newAudioFragment, ethos: newEthosFragment } };
}

async function main() {
  const log = readAppLedger();
  const hist = historyOf(log);
  const baseline = hist.find((h) => h.round === 4) ?? hist[hist.length - 1];
  if (!baseline) { console.error("no round on the ledger"); process.exitCode = 1; return; }
  console.log(`baseline: round ${baseline.round} (${baseline.html.length} chars), both known defects present`);
  console.log(`\nOperative prompts carry NO scripture, NO named authority — structural-property language only.`);
  console.log(`Convergent-validation appendix (recorded, never handed to the writer):`);
  for (const [prop, evidence] of Object.entries(VALIDATION_APPENDIX)) console.log(`  ${prop}: ${evidence.map((e) => e.tradition).join("; ")}`);

  const REPS = 3;
  const runs = [];
  for (let i = 1; i <= REPS; i += 1) {
    console.log(`\n--- run ${i}/${REPS} ---`);
    const r = await runOne(baseline.html);
    console.log(`  audio: tag=${r.m.hasAudioTag} readsUrl=${r.m.audioReadsUrl} (${(r.audioMs / 1000).toFixed(1)}s)  |  ethos: findable=${r.m.ethosLogicFindable} correct=${r.m.ethosLogicCorrect} (${(r.ethosMs / 1000).toFixed(1)}s)`);
    runs.push(r);
  }

  const audioWins = runs.filter((r) => r.m.hasAudioTag && r.m.audioReadsUrl).length;
  const ethosWins = runs.filter((r) => r.m.ethosLogicCorrect === true).length;
  console.log(`\n=== VERDICT, ${REPS} runs, structural-property prompts (no scripture in the writer's context) ===`);
  console.log(`  audio wired:   ${audioWins}/${REPS}`);
  console.log(`  ethos correct: ${ethosWins}/${REPS}`);
  console.log(audioWins === REPS && ethosWins === REPS
    ? "MATCHES the scripture-grounded arm's own 3/3-3/3 result: the win is structural (isolation + no synthesis funnel), not an artifact of citing scripture in the prompt."
    : "DIVERGES from the scripture-grounded arm's result — reported honestly: removing the citation language may have cost something the scripture-flavored wording was actually contributing, which would itself be a real, disclosed finding.");

  const fs = await import("node:fs/promises");
  await fs.writeFile(new URL("./results/podcast-nary-structural-properties-result.json", import.meta.url), JSON.stringify({ baseline: { round: baseline.round }, runs, audioWins, ethosWins, validationAppendix: VALIDATION_APPENDIX }, null, 2));
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
