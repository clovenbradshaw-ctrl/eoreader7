#!/usr/bin/env node
// podcast-app-council.mjs — n-ary stigmergic agents, grounded, on the SAME
// shared ledger. Direct user direction, verbatim: "Not just an append only
// log, but n-ary agents working stigmergistically on different parts of
// the code... You HAVE to have all the agents grounded deep in our ethos
// and be more powerful because of their grounding in the UDHR and our
// wisdom texts, not as a governor but because humility and honesty,
// justice and empathy make things more intelligent."
//
// FOUR CRITICS, ONE FEATURE EACH (orthogonal binding — THE-ENZYME-
// PIPELINE.md's I-orthogonal: no two enzymes bind the same feature).
// Each is grounded in a REAL citation, never a bare adjective — a real
// UDHR article (organs/charter.js's own proven text) PLUS a real passage
// from live_priors/14-holy-texts/, addressed to its own file:line, the
// same self-verified-address discipline (P5.2) this whole tree holds
// everywhere else. The grounding is NOT a governor bolted on after
// generation — it is the LENS each critic reads the app through, on the
// premise (the user's own, stated directly) that humility, honesty,
// justice and empathy are what makes a reading MORE perceptive, not a
// restriction on it:
//
//   HUMILITY — UDHR Art.1 ("born free and equal in dignity") — reads for
//     overclaimed certainty: a badge, a label, a claim the app has not
//     actually earned.
//   HONESTY  — Quran (tanzil-quran/quran_en_yusufali.txt:5, "they only
//     deceive themselves... false to themselves") — reads for a declared
//     capability the code does not actually keep (a wired-looking button
//     that does nothing, a claim with nothing behind it).
//   JUSTICE  — UDHR Art.7 ("equal protection of the law... without any
//     discrimination") — reads for unequal or arbitrary treatment across
//     episodes or users.
//   EMPATHY  — Pali Suttas (pali-suttas/dn13.txt:441, "a heart full of
//     compassion") — reads for what a real listener, under real
//     conditions (slow network, a screen reader, a shaky hand), actually
//     needs that the app does not give them.
//
// STIGMERGY, LITERALLY (THE-STIGMERGIC-PIPELINE.md §2): the four critics
// never call each other and never call the writer. Each reads the CURRENT
// html (the shared environment) and writes its OWN cell to the SAME
// ledger (podcast-app-ledger.js::landCritique) — proven by test that no
// critique entry ever references a sibling's task_id. The synthesis step
// is the only thing that reads multiple critics, and it reads them by
// FOLDING THE LOG (critiquesFor), never by being handed them directly.
//
// HONEST CONSTRAINT, DISCLOSED: this Ollama install reports
// OLLAMA_NUM_PARALLEL=1 at boot (checked live, see the server's own startup
// log). The four critics are dispatched with a real Promise.all — the
// ARCHITECTURE is n-ary and none of them waits on another's result before
// starting — but the underlying inference engine serializes the actual
// token generation. The concurrency this buys is real (no critic's PROMPT
// depends on another's OUTPUT — a genuine architectural property, checked
// by the fact that all four requests are built and fired before any
// response arrives) even though today's single-model-instance wall-clock
// is not parallel. A second Ollama instance or OLLAMA_NUM_PARALLEL>1 would
// realize the wall-clock savings without changing one line of this file.
import { fileURLToPath } from "node:url";
import { readAppLedger, appendAppRound, landAppRound, landCritique, critiquesFor, projectApp } from "../../adapters/build/podcast-app-ledger.js";

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL ?? "gemma2:2b";

// Real citations, self-addressed (P5.2): each `citation` is the ACTUAL
// substring found at `source` when this council was built (2026-09-30),
// checked live against the real files, never composed from memory.
const COUNCIL = [
  {
    virtue: "humility",
    giver: "Universal Declaration of Human Rights, Article 1",
    source: "organs/charter.js:504-505 (UDHR_FALLBACK_EXCERPT)",
    citation: "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience.",
    lens: "Read for OVERCLAIMED CERTAINTY: a badge, a label, or a sentence that states something as settled when the app has not actually earned that certainty. Humility here means the app should never claim to know more than it does — every listener's own judgment deserves room, not a false verdict dressed as fact.",
  },
  {
    virtue: "honesty",
    giver: "Quran (Yusuf Ali translation), Surah 2",
    source: "live_priors/14-holy-texts/tanzil-quran/quran_en_yusufali.txt:5",
    citation: "they only deceive themselves, and realise it not! ... they are false to themselves",
    lens: "Read for a DECLARED CAPABILITY THE CODE DOES NOT ACTUALLY KEEP: a button, an element, or a variable that LOOKS wired but does nothing when used — the app deceiving whoever reads its own markup as much as whoever clicks it. Honesty here means never letting the app's surface claim more than its own wiring delivers.",
  },
  {
    virtue: "justice",
    giver: "Universal Declaration of Human Rights, Article 7",
    source: "organs/charter.js:512-513 (UDHR_FALLBACK_EXCERPT)",
    citation: "All are equal before the law and are entitled without any discrimination to equal protection of the law.",
    lens: "Read for UNEQUAL OR ARBITRARY TREATMENT: does every episode, regardless of its own content or ethos verdict, get the same fair presentation and the same functional controls? Justice here means the app must never silently favor or disadvantage one piece of content over another for no stated reason.",
  },
  {
    virtue: "empathy",
    giver: "Dīgha Nikāya 13 (Pali Canon, trans. Bhikkhu Sujato)",
    source: "live_priors/14-holy-texts/pali-suttas/dn13.txt:441",
    citation: "a mendicant meditates spreading a heart full of compassion",
    lens: "Read as an actual LISTENER, under real conditions — a slow connection, a screen reader, a shaky hand, a quiet room at night. What does this app fail to give them that a person who genuinely cared about their experience would have noticed? Empathy here means reading the app from outside itself, as the person who will actually use it.",
  },
];

async function ask(messages, { temperature = 0.3 } = {}) {
  const started = Date.now();
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ model: MODEL, stream: false, options: { temperature }, messages }),
  });
  if (!res.ok) throw new Error(`council: ${OLLAMA_URL} answered ${res.status}`);
  const body = await res.json();
  return { text: body.message.content, audit: { request: messages, rawResponse: body.message.content, durationMs: Date.now() - started, model: MODEL } };
}

function critiquePrompt(member, html) {
  return [{
    role: "user",
    content: `You are reading a podcast listening app's own index.html with one specific lens.

Your ground, cited so it is never a bare opinion — ${member.giver} (${member.source}):
"${member.citation}"

Your lens: ${member.lens}

The app's current index.html:
\`\`\`html
${html}
\`\`\`

In 1-3 sentences, name the ONE most important thing this lens reveals — a real, specific problem with THIS code, not a generic principle. If you genuinely find nothing this lens reveals, say so plainly in one sentence. Do not write code. Do not discuss any other lens.`,
  }];
}

function synthesisPrompt({ html, critiques, apiContract }) {
  const notes = critiques.map((c) => `- [${c.virtue}, grounded in ${c.giver}]: ${c.note}`).join("\n");
  return [{
    role: "user",
    content: `Here is a podcast listening app's index.html:\n\`\`\`html\n${html}\n\`\`\`\n\nIt must keep satisfying this contract:\n${apiContract}\n\nFour independent readings of this app, each from a different, real, cited ground, found:\n${notes}\n\nRewrite the WHOLE file, genuinely addressing every finding above that names a real problem (a finding that says "nothing found" needs no change). Keep every API call and the <audio> playback working. Return the WHOLE file in one fenced code block, nothing else.`,
  }];
}

function extractCode(text) {
  const m = /```(?:html)?\n([\s\S]*?)```/i.exec(text);
  return (m ? m[1] : text).trim();
}

function checkCode(html) {
  const findings = [];
  const has = (re, why) => { if (!re.test(html)) findings.push(why); };
  has(/<!doctype html>/i, "missing a <!doctype html> declaration");
  has(/\/api\/subscribe/, "never calls /api/subscribe");
  has(/fetch\s*\(/, "no fetch() call found");
  has(/<audio[\s>]/i, "no <audio> element");
  has(/audioUrl/, "never reads audioUrl from the API response");
  return { issues: findings.length, findings };
}

const API_CONTRACT = `GET /api/subscribe?url=<feed-url> returns { show: { title }, episodes: [ { title, pubDate, description, audioUrl, ethos, logosFindingCount } ] }. GET /api/episodes?show=<title> returns the same shape for an already-subscribed show. Write one self-contained index.html (inline <style>/<script>, no external libraries): a text input + Subscribe button calling /api/subscribe, each episode showing title/date/ethos badge and a real <audio controls src="\${episode.audioUrl}">, using fetch() and plain DOM APIs only.`;

async function main() {
  const outDir = fileURLToPath(new URL(".", import.meta.url));
  let log = readAppLedger();
  const fold = projectApp(log);
  const currentHtml = fold?.html;
  if (!currentHtml) {
    console.error("no app exists yet on the ledger — run podcast-app-codegen.mjs first, then run the council on what it produced");
    process.exitCode = 1;
    return;
  }
  const round = (fold?.round ?? 0) + 1;

  console.log(`council round ${round}: dispatching ${COUNCIL.length} critics concurrently (real Promise.all — no critic's prompt depends on another's output)`);
  const started = Date.now();
  // REAL CONCURRENCY, ARCHITECTURALLY: every request is built and fired
  // here, before any response has arrived. Promise.all, not a for-loop of
  // awaits — checked live by the interleaved timestamps this prints.
  const results = await Promise.all(COUNCIL.map(async (member) => {
    const t0 = Date.now();
    console.log(`  [${member.virtue}] dispatched at +${((t0 - started) / 1000).toFixed(1)}s`);
    const { text, audit } = await ask(critiquePrompt(member, currentHtml));
    console.log(`  [${member.virtue}] answered at +${((Date.now() - started) / 1000).toFixed(1)}s (${text.length} chars)`);
    return { member, note: text.trim(), audit };
  }));

  for (const { member, note, audit } of results) {
    log = landCritique(log, { round, virtue: member.virtue, giver: member.giver, citation: member.citation, note, audit });
  }
  appendAppRound(undefined, log, log.nextSeq - results.length * 2);

  const critiques = critiquesFor(log, round);
  console.log(`\nall ${critiques.length} critiques landed on the ledger (stigmergic — none of them called each other):`);
  for (const c of critiques) console.log(`  [${c.virtue}] ${c.note}`);

  console.log(`\nsynthesis: one model call reading the current app + all ${critiques.length} critiques together...`);
  const synStarted = Date.now();
  const { text: rawSyn, audit: synAudit } = await ask(synthesisPrompt({ html: currentHtml, critiques, apiContract: API_CONTRACT }));
  const html = extractCode(rawSyn);
  const check = checkCode(html);
  console.log(`  synthesis done in ${((Date.now() - synStarted) / 1000).toFixed(1)}s; ${check.issues} mechanical issue(s): ${check.findings.join("; ") || "(none)"}`);

  const fromSeq = log.nextSeq;
  log = landAppRound(log, { round, mode: "council", instruction: `${critiques.length}-agent grounded council`, html, check, audit: synAudit });
  appendAppRound(undefined, log, fromSeq);

  console.log(`\nlanded round ${round} on the ledger (podcast-app-ledger.jsonl): mode=council, ${check.issues} mechanical issue(s)`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
