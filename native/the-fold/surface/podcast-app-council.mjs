#!/usr/bin/env node
// podcast-app-council.mjs (v2) — the real production pipeline, rebuilt on
// what podcast-nary-autonomy-falsify.mjs and
// podcast-nary-structural-properties.mjs actually measured, not on the
// original council's own untested design.
//
// THE CORRECTION THIS FILE EXISTS TO CARRY (user, verbatim):
// "We definitely can't ground it so explicitly in the UDHR, it's more
// than the UDHR is the secret sauce to its complex, stigmergic reasoning.
// If we have a morality governor, people will turn it off. But we have a
// thesis: intelligence is always grounded in ethos. Our system is MORE
// intelligent for being more moral. And 'morality' is what you call it
// FROM THE POV OF AN INDIVIDUALIST VALUE SYSTEM."
//
// v1 of this file cited UDHR/Quran/Pali-Canon text as the OPERATIVE reason
// a writer had to act correctly, then funneled all four critiques into ONE
// synthesis call that rewrote the whole file. That funnel is exactly where
// both of v1's own live regressions landed (round 4: a broken ethos
// ternary, a lost <audio> tag) — measured, not assumed, by
// podcast-nary-autonomy-falsify.mjs, which then showed 3/3 vs 0/3 in favor
// of removing the funnel, and podcast-nary-structural-properties.mjs,
// which then showed the SAME 3/3 result with zero scripture in the
// writer's own prompt — the four properties are structurally load-bearing
// on their own; the citations were never the mechanism.
//
// v2, what actually changed:
//   1. Four READERS, each one structural-property lens (not a virtue,
//      not a citation) — CALIBRATION / CONSISTENCY / INVARIANCE /
//      OTHER-MODELING — reading the CURRENT html independently (real
//      Promise.all, genuinely stigmergic: none calls another, each writes
//      its own cell to the ledger via landCritique).
//   2. Each reader must quote the EXACT offending snippet, verbatim, from
//      the html it read — MECHANICALLY VERIFIED (html.includes(quote))
//      before it is trusted at all (P5.2: no hallucinated quote is ever
//      acted on; a reader whose quote does not verify is a typed gap on
//      the record, never silently guessed past).
//   3. Verified findings are grouped by byte-span OVERLAP (I-orthogonal:
//      "no two enzymes bind the same feature" — checked, not assumed).
//      Disjoint findings become independent WRITE tasks. Findings that DO
//      overlap are merged into one shared task, disclosed as
//      `sharedRegionCount` rather than silently forced apart.
//   4. Each write task is dispatched to its OWN writer, in ISOLATION —
//      it sees ONLY its own snippet plus the structural-property finding
//      that named it, never the whole file, never another task's snippet.
//      Real concurrency (Promise.all): no writer's prompt depends on
//      another's output.
//   5. Assembly is a DETERMINISTIC STRING SPLICE against the ORIGINAL
//      html, applied in reverse byte-order so earlier replacements never
//      invalidate later offsets. ZERO synthesis calls — there is no step
//      in this file's control-flow that reads the whole file and
//      regenerates it. This is the actual claim under test, made real in
//      production rather than left in eval/.
//   6. The wisdom-text citations are recorded on each critique's own
//      ledger entry (landCritique's existing giver/citation fields,
//      unchanged) as CONVERGENT VALIDATION — corroborating evidence a
//      property is independently attested, never content handed to any
//      model. No prompt in this file contains a scripture citation.
//
// HONEST CONSTRAINT, disclosed as in v1: OLLAMA_NUM_PARALLEL=1 serializes
// actual token generation even though every request here is genuinely
// architecturally independent (built and fired before any response
// arrives). The wall-clock savings this design already measured (4-8x in
// the eval, because most write tasks are short isolated snippets rather
// than a whole-file regeneration) are real regardless.
import { fileURLToPath } from "node:url";
import { readAppLedger, appendAppRound, landAppRound, landCritique, critiquesFor, projectApp } from "../../adapters/build/podcast-app-ledger.js";
import { coherenceGate } from "../../adapters/build/coherence-properties.mjs";

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.ER7_PODCAST_MODEL ?? process.env.ER7_NB_MODEL ?? "gemma2:2b";

// Four structural-property lenses. Renamed from v1's virtues to what each
// one structurally IS (see this file's own header) — no citation, no
// authority, in the text a reader model ever sees.
const LENSES = [
  {
    property: "calibration",
    read: "Read for a label or claim that asserts MORE OR DIFFERENT CERTAINTY than the underlying value actually distinguishes — a badge that silently collapses two real, distinct states into one, or states something as settled when nothing in the code has actually established it.",
  },
  {
    property: "consistency",
    read: "Read for a DECLARED CAPABILITY THAT DOES NOT MATCH ACTUAL WIRING — an element that looks like a working control (a play button, a link, an interactive-looking span) but whose actual behavior is something else entirely, or does nothing at all.",
  },
  {
    property: "invariance",
    read: "Read for a rule that does NOT apply the SAME way to every value of the same shape — one case silently falling through and inheriting another case's treatment, or one input type handled differently from a structurally identical one for no stated reason.",
  },
  {
    property: "other-modeling",
    read: "Read as an ACTUAL person who will use this — a slow connection, a screen reader, a shaky hand, a quiet room. What does the app fail to give them that a person who had actually pictured their real situation would have noticed?",
  },
];

// Convergent-validation appendix — recorded on the LEDGER as corroborating
// evidence, never handed to any model. Each is the same real, addressed
// citation v1 used (P5.2, unchanged), now attached to the record rather
// than the prompt.
const VALIDATION = {
  calibration: { giver: "Universal Declaration of Human Rights, Article 1", citation: "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience." },
  consistency: { giver: "Quran (Yusuf Ali translation), Surah 2", citation: "they only deceive themselves, and realise it not! ... they are false to themselves" },
  invariance: { giver: "Universal Declaration of Human Rights, Article 7", citation: "All are equal before the law and are entitled without any discrimination to equal protection of the law." },
  "other-modeling": { giver: "Dīgha Nikāya 13 (Pali Canon, trans. Bhikkhu Sujato)", citation: "a mendicant meditates spreading a heart full of compassion" },
};

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

// SELECT, NEVER GENERATE (this codebase's own already-validated fix for
// exactly this failure — P32/P83's witness protocol: a small model asked
// to reproduce text verbatim will often paraphrase; asked to pick from a
// numbered list, it reliably picks). Line ranges are mechanically
// extracted from the REAL html afterward, so a hallucinated quote is not
// merely caught (v2's first cut) — it is now STRUCTURALLY IMPOSSIBLE,
// because the reader never generates the text it points at.
function numberedLines(html) {
  return html.split("\n").map((line, i) => `${i + 1}: ${line}`).join("\n");
}

/** lineByteOffsets(html) — offsets[i] = the byte index where line i (0-based)
 * begins in the original string. split("\n") + join("\n") always exactly
 * reproduces the source (Node's own guarantee for this separator), so this
 * mapping is exact, not approximate. */
function lineByteOffsets(lines) {
  const offsets = [];
  let pos = 0;
  for (const line of lines) { offsets.push(pos); pos += line.length + 1; }
  return offsets;
}

function readerPrompt(lens, html) {
  return [{
    role: "user",
    content: `You are reading a podcast listening app's index.html with one specific lens. Each line is numbered.

Your lens: ${lens.read}

The app's current index.html:
\`\`\`
${numberedLines(html)}
\`\`\`

If this lens reveals a real, specific problem, answer in EXACTLY this shape:
PROBLEM: <one sentence naming the problem>
LINES: <the line number, or a range like 12-14, that needs to change>

If this lens reveals nothing real, answer with exactly: NOTHING FOUND`,
  }];
}

function parseReading(text, html) {
  if (/NOTHING FOUND/i.test(text) && !/PROBLEM:/i.test(text)) return null;
  const problemMatch = /PROBLEM:\s*(.+)/i.exec(text);
  const linesMatch = /LINES:\s*(\d+)\s*(?:-\s*(\d+))?/i.exec(text);
  if (!problemMatch || !linesMatch) return null;
  const lines = html.split("\n");
  const offsets = lineByteOffsets(lines);
  let startLine = Number(linesMatch[1]) - 1;
  let endLine = linesMatch[2] ? Number(linesMatch[2]) - 1 : startLine;
  if (endLine < startLine) [startLine, endLine] = [endLine, startLine];
  startLine = Math.max(0, Math.min(startLine, lines.length - 1));
  endLine = Math.max(0, Math.min(endLine, lines.length - 1));
  const quote = lines.slice(startLine, endLine + 1).join("\n");
  const start = offsets[startLine];
  return { problem: problemMatch[1].trim(), quote, start, end: start + quote.length };
}

function writerPrompt(property, problem, snippet) {
  return [{
    role: "user",
    content: `Here is one small, isolated fragment of a podcast app's template:
\`\`\`
${snippet}
\`\`\`

The problem with it (property: ${property}): ${problem}

Rewrite ONLY this fragment so the problem is fixed. You have no other context about the surrounding file — make this fragment correct and self-contained on its own; assume it sits inside a template literal that already has \`episode\`/\`show\` in scope where relevant.

Return ONLY the rewritten fragment in one fenced code block, nothing else.`,
  }];
}

function extractCode(text) {
  const m = /```(?:[a-z]*)?\n([\s\S]*?)```/i.exec(text);
  return (m ? m[1] : text).trim();
}

/** Group verified findings by byte-span overlap. Disjoint findings become
 * independent groups (the common case — genuine I-orthogonal binding);
 * overlapping findings merge into one group covering their union, and the
 * merge is counted so it is disclosed, never silently assumed away. */
function groupByOverlap(findings) {
  const sorted = [...findings].sort((a, b) => a.start - b.start);
  const groups = [];
  for (const f of sorted) {
    const last = groups[groups.length - 1];
    if (last && f.start < last.end) {
      last.end = Math.max(last.end, f.end);
      last.findings.push(f);
    } else {
      groups.push({ start: f.start, end: f.end, findings: [f] });
    }
  }
  return groups;
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

// STRUCTURAL-INTEGRITY GUARD — found necessary live, not designed in
// advance: round 7 of this exact pipeline had a writer given a small
// fragment INSIDE the <style> block emit `</style></head><body></body>
// </html>` as part of "fixing" its own tiny piece, and a second writer
// given a fragment inside the fetch handler leave a dangling, unmatched
// closing backtick behind — both silently landed, because checkCode's own
// presence-only regexes (does <audio> appear ANYWHERE) cannot detect
// document-structure corruption or duplication at all. Two checks, at two
// different points, closing the actual gap that let it through:
//
//   1. FORBIDDEN_TOP_LEVEL_TAGS — a fragment isolated to one small region
//      of the body/style/script should NEVER need to emit a document's own
//      top-level structural tags. If it does, that is the writer
//      overstepping the boundary of what it was actually shown, and the
//      fragment is refused before it ever reaches the splice — the region
//      is left UNCHANGED rather than corrupted.
//   2. documentWellFormed(html) — checked on the FINAL assembled document,
//      after every patch has been applied: each of html/head/body's open
//      and close tags must appear EXACTLY ONCE. A round that fails this
//      is refused ENTIRELY (nothing lands on the ledger for it but the
//      readers' own critiques, for audit) rather than shipping a broken
//      file — the prior round remains current.
const FORBIDDEN_TOP_LEVEL_TAGS = [/<!doctype/i, /<html[\s>]/i, /<\/html>/i, /<head[\s>]/i, /<\/head>/i, /<body[\s>]/i, /<\/body>/i];

function fragmentOverstepsScope(fragment) {
  return FORBIDDEN_TOP_LEVEL_TAGS.filter((re) => re.test(fragment));
}

function documentWellFormed(html) {
  const count = (re) => (html.match(re) || []).length;
  const checks = { "<html>": count(/<html[\s>]/gi), "</html>": count(/<\/html>/gi), "<head>": count(/<head[\s>]/gi), "</head>": count(/<\/head>/gi), "<body>": count(/<body[\s>]/gi), "</body>": count(/<\/body>/gi) };
  const problems = Object.entries(checks).filter(([, n]) => n !== 1).map(([tag, n]) => `${tag} appears ${n} time(s), expected exactly 1`);

  // FOUND LIVE, round 9 (2026-09-30): even with every document-structure
  // tag exactly balanced, a writer given only PART of a JS logical block
  // (here: half of a try/catch inside an addEventListener callback) can
  // leave the ORIGINAL block's own tail dangling right after its own
  // replacement — two closing braces/backticks with no matching opens.
  // documentWellFormed's tag-count check cannot see this; it is a defect
  // in the SCRIPT, not the HTML shell. The one honest, mechanical check
  // available without a real JS parser: the extracted <script> content
  // must actually PARSE. `new Function(...)` never executes the code
  // (Function's own body is only compiled, not called), so this is a
  // syntax check, not a live-code-execution risk.
  const scriptMatch = /<script>([\s\S]*?)<\/script>/i.exec(html);
  if (scriptMatch) {
    try {
      // eslint-disable-next-line no-new-func
      new Function(scriptMatch[1]);
    } catch (e) {
      problems.push(`the assembled <script> does not parse as valid JavaScript: ${e.message} — a writer's fragment almost certainly left a dangling, unmatched piece of syntax from the ORIGINAL code it only partially replaced`);
    }
  }

  return { wellFormed: problems.length === 0, problems };
}

const API_CONTRACT = `GET /api/subscribe?url=<feed-url> returns { show: { title }, episodes: [ { title, pubDate, description, audioUrl, ethos, logosFindingCount } ] }. GET /api/episodes?show=<title> returns the same shape for an already-subscribed show. Write one self-contained index.html (inline <style>/<script>, no external libraries): a text input + Subscribe button calling /api/subscribe, each episode showing title/date/ethos badge and a real <audio controls src="\${episode.audioUrl}">, using fetch() and plain DOM APIs only.`;

async function main() {
  fileURLToPath(new URL(".", import.meta.url));
  let log = readAppLedger();
  const fold = projectApp(log);
  const currentHtml = fold?.html;
  if (!currentHtml) {
    console.error("no app exists yet on the ledger — run podcast-app-codegen.mjs first, then run the council on what it produced");
    process.exitCode = 1;
    return;
  }
  const round = (fold?.round ?? 0) + 1;

  console.log(`council round ${round}: dispatching ${LENSES.length} structural-property readers concurrently (no citation, no authority, in any prompt)`);
  const started = Date.now();
  const readings = await Promise.all(LENSES.map(async (lens) => {
    const t0 = Date.now();
    const { text, audit } = await ask(readerPrompt(lens, currentHtml));
    console.log(`  [${lens.property}] answered at +${((Date.now() - started) / 1000).toFixed(1)}s`);
    const parsed = parseReading(text, currentHtml);
    return { lens, text, audit, parsed };
  }));

  // SELECT, NEVER GENERATE closed the hallucination hole structurally: a
  // reader names a LINE RANGE, never text, so the "quote" is mechanically
  // sliced straight from the real html — it cannot fail to verify the way
  // v2's first cut sometimes did. The one thing still checked is that the
  // slice is genuinely non-empty (an out-of-range or degenerate range is a
  // typed gap, never silently acted on).
  const verified = [];
  const refused = [];
  for (const r of readings) {
    if (!r.parsed) { console.log(`  [${r.lens.property}] nothing found`); continue; }
    if (!r.parsed.quote.trim()) {
      console.log(`  [${r.lens.property}] REFUSED — selected line range was empty/degenerate`);
      refused.push({ property: r.lens.property, problem: r.parsed.problem, quote: r.parsed.quote });
      continue;
    }
    // Belt-and-suspenders (P5.2): confirm the mechanically sliced text
    // really is a substring at the claimed offset — this can only fail if
    // lineByteOffsets itself has a bug, never on account of the model.
    if (currentHtml.slice(r.parsed.start, r.parsed.end) !== r.parsed.quote) {
      console.log(`  [${r.lens.property}] REFUSED — internal offset mismatch (a bug in lineByteOffsets, not the model — disclosed rather than silently spliced)`);
      refused.push({ property: r.lens.property, problem: r.parsed.problem, quote: r.parsed.quote });
      continue;
    }
    console.log(`  [${r.lens.property}] verified — "${r.parsed.problem}"`);
    verified.push({ property: r.lens.property, problem: r.parsed.problem, quote: r.parsed.quote, start: r.parsed.start, end: r.parsed.end, readerAudit: r.audit });
  }

  for (const f of verified) {
    log = landCritique(log, { round, virtue: f.property, giver: VALIDATION[f.property].giver, citation: VALIDATION[f.property].citation, note: f.problem, audit: f.readerAudit });
  }

  if (verified.length === 0) {
    console.log(`\nno reader found a real, verified problem — nothing to write. Ledger unchanged.`);
    appendAppRound(undefined, log, log.nextSeq - (verified.length + refused.length));
    return;
  }

  const groups = groupByOverlap(verified);
  const sharedRegionCount = groups.filter((g) => g.findings.length > 1).length;
  console.log(`\n${verified.length} verified finding(s) grouped into ${groups.length} disjoint write task(s)${sharedRegionCount ? ` (${sharedRegionCount} shared region(s), disclosed not hidden)` : ""}`);

  // ORTHOGONALITY IS A PROPERTY OF THE MATERIAL, NOT SOMETHING THIS DESIGN
  // CAN GUARANTEE ON ITS OWN — checked and disclosed every round, never
  // assumed. If several lenses converge on one large, overlapping region,
  // the "isolated write" for that group is not meaningfully different in
  // kind from the whole-file synthesis funnel this design exists to avoid
  // — that must be said plainly, on the record, not discovered later by
  // diffing rounds by hand.
  const BROAD_MERGE_FRACTION = 0.4;
  const broadMerges = groups.filter((g) => g.findings.length > 1 && (g.end - g.start) / currentHtml.length > BROAD_MERGE_FRACTION);
  if (broadMerges.length) {
    for (const g of broadMerges) {
      console.log(`  ORTHOGONALITY NOT ACHIEVED this round: [${g.findings.map((f) => f.property).join("+")}] converged on one region spanning ${Math.round(((g.end - g.start) / currentHtml.length) * 100)}% of the file — this is a single coordinated fix for that region, not a genuinely isolated per-property write. Disclosed, not hidden as if it were the isolated case.`);
    }
  }

  // REAL n-ary autonomy: one writer per group, dispatched concurrently, no
  // writer sees the whole file or any other group's snippet. Zero
  // synthesis calls anywhere in this control-flow.
  const writeStarted = Date.now();
  const written = await Promise.all(groups.map(async (g) => {
    const snippet = currentHtml.slice(g.start, g.end);
    const combinedProblem = g.findings.map((f) => `[${f.property}] ${f.problem}`).join(" ");
    const { text, audit } = await ask(writerPrompt(g.findings.map((f) => f.property).join("+"), combinedProblem, snippet));
    const fragment = extractCode(text);
    console.log(`  wrote fragment for [${g.findings.map((f) => f.property).join("+")}] region (${snippet.length} -> ${fragment.length} chars)`);
    return { start: g.start, end: g.end, fragment, audit, properties: g.findings.map((f) => f.property) };
  }));
  console.log(`all ${written.length} isolated writer(s) done in ${((Date.now() - writeStarted) / 1000).toFixed(1)}s wall-clock, 0 synthesis calls`);

  // STRUCTURAL GUARD, per fragment (found necessary live, round 7): a
  // fragment isolated to one small region should never need to emit a
  // top-level document tag. One that does is refused before it ever
  // reaches the splice — that region is left UNCHANGED, disclosed as a
  // refusal, never silently corrupted.
  const patches = [];
  const overstepped = [];
  for (const p of written) {
    const violations = fragmentOverstepsScope(p.fragment);
    if (violations.length) {
      console.log(`  REFUSED [${p.properties.join("+")}] fragment — it emitted a top-level document tag it had no business touching (${violations.map((re) => re.source).join(", ")}); region left unchanged`);
      overstepped.push(p);
      continue;
    }
    patches.push(p);
  }

  // Deterministic splice, reverse byte-order so earlier replacements never
  // invalidate later offsets — the assembly step this whole design's
  // falsification measured to beat a whole-file synthesis rewrite.
  let html = currentHtml;
  for (const p of [...patches].sort((a, b) => b.start - a.start)) {
    html = html.slice(0, p.start) + p.fragment + html.slice(p.end);
  }

  // WHOLE-DOCUMENT GUARD, on the assembled result: even with every
  // individual fragment clean, a writer can still leave behind a dangling,
  // unmatched piece of syntax (round 7's second failure — an orphaned
  // closing backtick+semicolon from a fragment that replaced only PART of
  // a JS logical block). This cannot be caught per-fragment, only on the
  // whole. A round that fails this is refused ENTIRELY — nothing but the
  // readers' own critiques lands on the ledger; the prior round stays
  // current, exactly like a database transaction that never committed.
  const wellFormed = documentWellFormed(html);
  if (!wellFormed.wellFormed) {
    console.log(`\nROUND REFUSED — the assembled document is not well-formed: ${wellFormed.problems.join("; ")}`);
    console.log(`the prior round remains current; this round's critiques are still landed on the ledger for audit, but no html is.`);
    appendAppRound(undefined, log, log.nextSeq - (verified.length));
    return;
  }

  // COHERENCE GATE — mechanical, not narrated (adapters/build/coherence-properties.mjs).
  // Every patch's own reader-named `problem` and writer-produced prose is
  // logged for audit above; NONE of it is read here. The only question
  // this asks is whether the ASSEMBLED RESULT scores lower than the
  // CURRENT FOLD on any of the four structural properties — calibration,
  // consistency, invariance, other-modeling — computed by executing and
  // measuring the real bytes both times. A property regression is what
  // this design treats incoherence as meaning: the artifact's own
  // reasoning got objectively worse, whatever a writer's fragment claims
  // it did. A round that regresses ANY property is refused entirely, the
  // same way a structurally malformed one already is.
  const coherence = await coherenceGate(currentHtml, html);
  if (coherence.halted) {
    console.log(`\nROUND REFUSED — coherence gate: this round would REGRESS the artifact's own reasoning, mechanically measured, regardless of how any writer described its own change:`);
    for (const r of coherence.regressions) console.log(`  ${r.property}: ${r.before} -> ${r.after}`);
    console.log(`the prior round remains current; this round's critiques are still landed on the ledger for audit, but no html is.`);
    appendAppRound(undefined, log, log.nextSeq - (verified.length));
    return;
  }

  const check = checkCode(html);
  console.log(`\nfinal spliced app: ${check.issues} mechanical issue(s): ${check.findings.join("; ") || "(none)"}`);

  const instruction = `${patches.length}-writer council (properties: ${[...new Set(patches.flatMap((p) => p.properties))].join(", ")}); ${refused.length ? `${refused.length} reading(s) refused; ` : ""}${overstepped.length ? `${overstepped.length} writer fragment(s) refused for overstepping scope; ` : ""}${broadMerges.length ? `orthogonality NOT achieved for ${broadMerges.length} region(s) (>${Math.round(BROAD_MERGE_FRACTION * 100)}% of file each) — coordinated fix, not isolated` : `${groups.filter((g) => g.findings.length === 1).length} genuinely isolated region(s)`}`;
  const fromSeq = log.nextSeq;
  log = landAppRound(log, { round, mode: "council", instruction, html, check, audit: { request: [{ role: "system", content: "n-ary isolated council, no synthesis call — see per-patch audits landed separately" }], rawResponse: `${patches.length} isolated patches spliced`, durationMs: Date.now() - started, model: MODEL } });
  appendAppRound(undefined, log, fromSeq);

  console.log(`\nlanded round ${round} on the ledger (podcast-app-ledger.jsonl): mode=council(v2, n-ary isolated, no synthesis funnel), ${check.issues} mechanical issue(s)`);
}

// ENTRY-POINT GUARD — found necessary live, twice: importing this module
// for inspection (e.g. `node -e "import('./podcast-app-council.mjs')"`
// during debugging) used to trigger a REAL production round unconditionally
// on import, with no way to inspect any of this file's pure functions
// without also spending real Ollama calls and touching the live ledger.
// The identical gap was already disclosed for podcast-app-codegen.mjs;
// closed here the standard way — main() runs only when this file is the
// process's own entry point, never merely imported.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exitCode = 1; });
}
