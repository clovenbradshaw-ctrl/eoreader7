#!/usr/bin/env node
// podcast-nary-autonomy-falsify.mjs — the corrected experiment, after
// "stop and zoom out": the prior two attempts each solved half of one
// sentence and dropped the other half.
//
//   Attempt 1 (podcast-app-council.mjs): four grounded critics, genuinely
//   n-ary and stigmergic on the READ side — but then funneled into ONE
//   synthesis call that rewrites the WHOLE file. That funnel is where both
//   real regressions actually landed (round 4, podcast-app-ledger.jsonl):
//   the broken ternary and the lost <audio> tag. Autonomy was preserved
//   for reading, destroyed for writing.
//
//   Attempt 2 (podcast-grounded-writer-falsify.mjs): fixed "judge after"
//   by moving grounding into the writer's own stance — but collapsed back
//   to ONE writer rewriting the whole file, which isn't n-ary at all. It
//   solved "not a governor" and threw away "n-ary... while preserving
//   their autonomy."
//
// THIS FILE holds both halves of the sentence at once: n-ary grounded
// writers, each with GENUINE, STRUCTURAL autonomy over one orthogonal
// feature — not "please don't touch the other feature" as an instruction
// a model might ignore, but literal isolation: each agent's context IS
// its feature and nothing else, so it CANNOT touch what it cannot see.
// Assembly is a deterministic string splice, zero further model calls —
// there is no synthesis step in this file's control-flow at all. That is
// the falsifiable claim under test: that removing the funnel (not merely
// grounding the writer) is what prevents the two known regressions.
//
// ORTHOGONAL BINDING (I-orthogonal: "no two enzymes bind the same
// feature"), read off the app's own two real, disclosed defects:
//   FEATURE "audio"  — the <a href download> that should be <audio
//                       controls src="${episode.audioUrl}">.
//                       Grounded in HONESTY (a declared capability the
//                       code does not keep) + EMPATHY (a real listener
//                       who wants to press play), the same two citations
//                       podcast-app-council.mjs already verified (P5.2).
//   FEATURE "ethos"  — the broken three-way ternary that silently reads
//                       every no_signal episode as "conflict".
//                       Grounded in HUMILITY (never claim more certainty
//                       than earned) + JUSTICE (equal treatment
//                       regardless of verdict), the same two citations.
//
// ARM A (control) — one writer, the whole file, both findings named,
//   one shot. This is council.mjs's synthesis prompt shape exactly —
//   the funnel, reproduced fresh this session so both arms are measured
//   under identical live conditions.
//
// ARM B (test) — two independent writers. Each sees ONLY its own isolated
//   snippet (extracted verbatim from the SAME starting file) plus its own
//   grounding — never the whole file, never the other agent's snippet,
//   never told the other feature exists. Assembly is a literal string
//   splice against the original file. If either agent's fragment fails to
//   re-embed (wrong quoting, a broken template-literal boundary), that is
//   a real, disclosed cost of this design and is measured, not hidden —
//   the falsification is honest only if it can fail this way.
import { readAppLedger, historyOf } from "../adapters/build/podcast-app-ledger.js";

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL ?? "gemma2:2b";

const API_CONTRACT = `GET /api/subscribe?url=<feed-url> returns { show: { title }, episodes: [ { title, pubDate, description, audioUrl, ethos, logosFindingCount } ] }. ethos is one of "pass" | "conflict" | "no_signal".`;

// The two exact snippets, extracted verbatim from the live ledger's own
// round-4 fold (the same file both council.mjs and the prior falsify
// script drew from) — never retyped from memory, grepped against the
// real running fold at build time (P5.2).
const AUDIO_SNIPPET_RE = /<a href="\$\{episode\.audioUrl\}"[\s\S]*?<\/a>/;
const ETHOS_SNIPPET_RE = /\$\{episode\.ethos === 'pass' \? 'pass' : 'conflict' \? 'conflict' : 'no_signal'\}/;

const GROUNDING = {
  audio: {
    virtues: "honesty and empathy",
    givers: [
      { giver: "Quran (Yusuf Ali translation), Surah 2", source: "organs/../../live_priors/14-holy-texts/tanzil-quran/quran_en_yusufali.txt:5", citation: "they only deceive themselves, and realise it not! ... they are false to themselves" },
      { giver: "Dīgha Nikāya 13 (Pali Canon, trans. Bhikkhu Sujato)", source: "live_priors/14-holy-texts/pali-suttas/dn13.txt:441", citation: "a mendicant meditates spreading a heart full of compassion" },
    ],
    stance: `You do not let your own code deceive the very people reading it — a link labeled as the episode that silently downloads a file instead of playing it is exactly this kind of self-deception ("false to themselves," in the old phrase): it claims to be a listening control while doing something else. And you are writing for a real person who will actually press play, under real conditions — a slow connection, a shared room, a person who wants to hear the show right now, not download a file and go find a player for it.`,
  },
  ethos: {
    virtues: "humility and justice",
    givers: [
      { giver: "Universal Declaration of Human Rights, Article 1", source: "organs/charter.js:504-505 (UDHR_FALLBACK_EXCERPT)", citation: "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience." },
      { giver: "Universal Declaration of Human Rights, Article 7", source: "organs/charter.js:512-513 (UDHR_FALLBACK_EXCERPT)", citation: "All are equal before the law and are entitled without any discrimination to equal protection of the law." },
    ],
    stance: `You do not claim more certainty than you have earned — a label that silently collapses a real, distinct verdict into a different one is a small dishonesty dressed as a badge, and every listener deserves to see which of the three real verdicts (pass, conflict, no_signal) actually applies, not a guess disguised as a fact. And every episode gets the same fair, correct treatment regardless of its own verdict — none of the three may silently borrow another's label.`,
  },
};

function wholeFileGroundedStance() {
  return `${GROUNDING.audio.stance}\n\n${GROUNDING.ethos.stance}`;
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

function extractCode(text, lang = "html") {
  const re = new RegExp("```(?:" + lang + ")?\\n([\\s\\S]*?)```", "i");
  const m = re.exec(text);
  return (m ? m[1] : text).trim();
}

// ---- ARM A: single writer, whole file, one funnel ----
function wholeFilePrompt(html) {
  return [{
    role: "user",
    content: `You are rewriting a podcast listening app's index.html. As you write, hold this:\n\n${wholeFileGroundedStance()}\n\nHere is the app's current index.html:\n\`\`\`html\n${html}\n\`\`\`\n\nIt must keep satisfying this contract:\n${API_CONTRACT}\n\nThese two things are true of it right now:\n- the audio link downloads a file instead of playing it — a listening app that cannot play audio\n- the ethos badge does not correctly distinguish all three verdicts (pass, conflict, no_signal)\n\nRewrite the WHOLE file, from where you're standing. Return the WHOLE file in one fenced code block, nothing else.`,
  }];
}

// ---- ARM B: two writers, each sees ONLY its own snippet ----
function snippetPrompt(feature, snippet) {
  const g = GROUNDING[feature];
  const task = feature === "audio"
    ? `Here is one small fragment of a podcast app's template. It builds a link for one episode, but it downloads the file instead of playing it:\n\`\`\`js\n${snippet}\n\`\`\`\nRewrite ONLY this fragment so it plays the audio with a real <audio controls src="\${episode.audioUrl}"> element. You have no other context about the surrounding file — just make this one fragment correct and self-contained; it sits inside a template literal that already has \`episode\` in scope.`
    : `Here is one small fragment of a podcast app's template. It is supposed to show one of three labels depending on \`episode.ethos\` (which is always exactly "pass", "conflict", or "no_signal"), but it has a bug:\n\`\`\`js\n${snippet}\n\`\`\`\nRewrite ONLY this fragment (a single JS expression inside a \${...} template placeholder) so it correctly shows a distinct, honest label for all three real values. You have no other context about the surrounding file — just make this one expression correct and self-contained.`;
  return [{
    role: "user",
    content: `As you write, hold this:\n\n${g.stance}\n\n${task}\n\nReturn ONLY the rewritten fragment in one fenced code block, nothing else — no explanation, no surrounding HTML.`,
  }];
}

// MECHANICAL MEASURES — identical to the prior script, never self-graded.
function measure(html) {
  const hasAudioTag = /<audio[\s>]/i.test(html);
  const audioReadsUrl = /<audio[^>]*src\s*=\s*["'`]\$\{[^}]*audioUrl[^}]*\}/i.test(html) || (hasAudioTag && /audioUrl/.test(html));

  let ethosLogicFindable = false;
  let ethosLogicCorrect = null;
  const exprMatches = [...html.matchAll(/\$\{([^}]*ethos[^}]*)\}/g)];
  for (const m of exprMatches) {
    const expr = m[1];
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("episode", `return (${expr});`);
      const results = { pass: fn({ ethos: "pass" }), conflict: fn({ ethos: "conflict" }), no_signal: fn({ ethos: "no_signal" }) };
      ethosLogicFindable = true;
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
  return { hasAudioTag, audioReadsUrl, ethosLogicFindable, ethosLogicCorrect };
}

function structurallyIntact(html) {
  // The basic contract checks council.mjs's checkCode already runs —
  // reused here so a splice that breaks the file structurally is caught,
  // not just the two features under direct test.
  const findings = [];
  const has = (re, why) => { if (!re.test(html)) findings.push(why); };
  has(/<!doctype html>/i, "missing <!doctype html>");
  has(/\/api\/subscribe/, "lost the /api/subscribe call");
  has(/fetch\s*\(/, "lost the fetch() call");
  return { issues: findings.length, findings };
}

async function runArmA(html) {
  console.log(`\n=== ARM A (control, whole-file funnel) ===`);
  const { text, durationMs } = await ask(wholeFilePrompt(html));
  const outHtml = extractCode(text);
  const m = measure(outHtml);
  const s = structurallyIntact(outHtml);
  console.log(`  ${(durationMs / 1000).toFixed(1)}s, ${outHtml.length} chars, 1 model call`);
  console.log(`  audio: tag=${m.hasAudioTag} readsUrl=${m.audioReadsUrl} | ethos: findable=${m.ethosLogicFindable} correct=${m.ethosLogicCorrect}`);
  console.log(`  structurally intact: ${s.issues === 0} ${s.findings.join("; ")}`);
  return { name: "A", html: outHtml, measure: m, structural: s, calls: 1, totalMs: durationMs };
}

async function runArmB(html) {
  console.log(`\n=== ARM B (test, n-ary autonomous, no synthesis funnel) ===`);
  const audioSnippet = AUDIO_SNIPPET_RE.exec(html)?.[0];
  const ethosSnippet = ETHOS_SNIPPET_RE.exec(html)?.[0];
  if (!audioSnippet || !ethosSnippet) {
    throw new Error(`could not isolate both snippets from the starting file (audio found: ${!!audioSnippet}, ethos found: ${!!ethosSnippet}) — the orthogonal-binding extraction itself failed, disclosed rather than faked`);
  }
  console.log(`  isolated audio snippet (${audioSnippet.length} chars) and ethos snippet (${ethosSnippet.length} chars) — genuinely disjoint regions of the SAME file`);

  const started = Date.now();
  // REAL structural autonomy: each call is built with ONLY its own
  // snippet in scope. Promise.all so neither's prompt depends on the
  // other's output — the same architectural property council.mjs already
  // proved, but this time the OUTPUT never funnels through a third call.
  const [audioResult, ethosResult] = await Promise.all([
    ask(snippetPrompt("audio", audioSnippet)).then((r) => ({ ...r, feature: "audio" })),
    ask(snippetPrompt("ethos", ethosSnippet)).then((r) => ({ ...r, feature: "ethos" })),
  ]);
  console.log(`  [audio] ${(audioResult.durationMs / 1000).toFixed(1)}s   [ethos] ${(ethosResult.durationMs / 1000).toFixed(1)}s   (dispatched concurrently, wall clock ${((Date.now() - started) / 1000).toFixed(1)}s)`);

  const newAudioFragment = extractCode(audioResult.text, "js");
  const newEthosFragment = extractCode(ethosResult.text, "js");

  // ZERO further model calls. Assembly is a literal, deterministic
  // splice against the ORIGINAL file — there is no synthesis step in
  // this control-flow at all, which is the exact claim under test.
  let outHtml = html.replace(AUDIO_SNIPPET_RE, () => newAudioFragment);
  outHtml = outHtml.replace(ETHOS_SNIPPET_RE, () => newEthosFragment);

  const splicedCleanly = outHtml !== html && outHtml.includes(newAudioFragment.length > 0 ? newAudioFragment.slice(0, 20) : "\0impossible");
  const m = measure(outHtml);
  const s = structurallyIntact(outHtml);
  console.log(`  spliced ${outHtml.length} chars, 2 model calls, 0 synthesis calls`);
  console.log(`  audio: tag=${m.hasAudioTag} readsUrl=${m.audioReadsUrl} | ethos: findable=${m.ethosLogicFindable} correct=${m.ethosLogicCorrect}`);
  console.log(`  structurally intact: ${s.issues === 0} ${s.findings.join("; ")}`);
  return {
    name: "B",
    html: outHtml,
    measure: m,
    structural: s,
    calls: 2,
    totalMs: Date.now() - started,
    fragments: { audio: newAudioFragment, ethos: newEthosFragment },
    rawResponses: { audio: audioResult.text, ethos: ethosResult.text },
  };
}

async function main() {
  const log = readAppLedger();
  const hist = historyOf(log);
  const baseline = hist.find((h) => h.round === 4) ?? hist[hist.length - 1];
  if (!baseline) { console.error("no round on the ledger — run podcast-app-codegen.mjs / podcast-app-council.mjs first"); process.exitCode = 1; return; }
  console.log(`starting from round ${baseline.round}'s real recorded baseline (${baseline.html.length} chars) — carries BOTH known live defects (broken ethos ternary, download link instead of <audio>)`);

  const armA = await runArmA(baseline.html);
  const armB = await runArmB(baseline.html);

  console.log(`\n=== VERDICT ===`);
  const wins = { A: 0, B: 0 };
  const compare = (label, av, bv, better = (x) => x === true) => {
    if (av === bv) { console.log(`  ${label}: tied (${av})`); return; }
    console.log(`  ${label}: A=${av} B=${bv}`);
    if (better(bv) && !better(av)) wins.B++;
    else if (better(av) && !better(bv)) wins.A++;
  };
  compare("audio actually wired", armA.measure.hasAudioTag && armA.measure.audioReadsUrl, armB.measure.hasAudioTag && armB.measure.audioReadsUrl);
  compare("ethos logic correct for all 3 verdicts", armA.measure.ethosLogicCorrect, armB.measure.ethosLogicCorrect);
  compare("structurally intact", armA.structural.issues === 0, armB.structural.issues === 0);

  console.log(`\nA wins: ${wins.A}, B wins: ${wins.B}`);
  console.log(`A: ${armA.calls} model call(s), ${(armA.totalMs / 1000).toFixed(1)}s | B: ${armB.calls} model call(s) (concurrent), ${(armB.totalMs / 1000).toFixed(1)}s wall-clock, 0 synthesis calls`);
  const verdict = wins.B > wins.A
    ? "FALSIFICATION ATTEMPT SURVIVED (this run): removing the synthesis funnel — n-ary autonomous writers over disjoint features — measurably outperformed the single whole-file writer."
    : wins.A > wins.B
      ? "FALSIFIED (this run): the whole-file writer did NOT do worse — reported honestly, not hidden. The funnel may not be the actual cause of the two known regressions."
      : "NO DIFFERENCE (this run): both arms tied on every mechanical measure.";
  console.log(verdict);

  const fs = await import("node:fs/promises");
  await fs.writeFile(new URL("./results/podcast-nary-autonomy-falsify-result.json", import.meta.url), JSON.stringify({ baseline: { round: baseline.round, html: baseline.html }, armA, armB, wins, verdict }, null, 2));
  console.log(`\nfull result written to eval/results/podcast-nary-autonomy-falsify-result.json`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
