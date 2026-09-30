#!/usr/bin/env node
// podcast-pathos-repair-loop.mjs — "teach it to fish." Not one more hand-
// written fix: a general, bounded, RECORDED loop that reads the real app's
// pathos condition (organs/visual-pathos.js, the real reGroundCondition,
// on real CDP-extracted bytes), diagnoses which of its named findings are
// repairable, and repairs each the way its OWN nature demands — a
// COMPUTABLE defect (WCAG contrast) gets a MECHANICAL, contract-verified
// fix with no model call at all; a JUDGMENT defect (pop-out flatline —
// "how should this stand out") gets ONE isolated model call, landed
// through the SAME code-anchor-log SYN-revision path every prior anchor
// revision in this session already used. Every round is recorded,
// append-only, to podcast-pathos-repair-log.jsonl — "recorded, not idle"
// (organs/pathos.js's own reGround discipline, held here for repairs too).
//
// THE BUDGET IS DECLARED, NEVER OPEN-ENDED (this project's own standing
// P9 discipline): MAX_ROUNDS = 3, giver "this driver," basis "generous
// enough to attempt each of the two currently-implemented repair
// strategies (contrast, differentiate) once, plus one retry round, before
// reporting honestly rather than looping forever chasing a condition this
// loop has no strategy for."
//
// TWO REPAIR STRATEGIES ARE IMPLEMENTED. A finding this loop has no
// strategy for (a strain contradiction, a real claim cycle) is named and
// left unrepaired, NEVER silently skipped without saying so — the same
// "a gap is never a verdict" rule pathos.js itself holds.
import fs from "node:fs";
import fsp from "node:fs/promises";
import { extractElements } from "./podcast-cdp-lib.mjs";
import { visualPathosOf } from "../organs/visual-pathos.js";
import { contrastRatio, wcagFloorFor } from "../organs/contrast.js";
import { proposeAnchor, foldCode, readAnchorLog, appendAnchorLog, settledContent } from "../adapters/build/code-anchor-log.js";
import { checkCode } from "../the-fold/surface/podcast-app-codegen.mjs";
import { coherenceGate } from "../adapters/build/coherence-properties.mjs";
import { TEMPLATE } from "./podcast-anchor-log-drive.mjs";

const OLLAMA_URL = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const MODEL = process.env.ER7_PODCAST_MODEL ?? "gemma2:2b";
const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:8940/";
const CDP_URL = process.env.CDP_URL ?? "http://127.0.0.1:9222";
const FEED_URL = process.env.FEED_URL ?? "https://feeds.npr.org/510289/podcast.xml";
const LEDGER_FILE = new URL("../the-fold/surface/podcast-anchor-log.jsonl", import.meta.url).pathname;
const HTML_FILE = new URL("../the-fold/surface/podcast-app-from-anchors.html", import.meta.url).pathname;
const REPAIR_LOG = new URL("../the-fold/surface/podcast-pathos-repair-log.jsonl", import.meta.url).pathname;

// P9: a declared, disclosed budget — see this file's own header.
const MAX_ROUNDS = { value: 3, giver: "this driver", basis: "one attempt per implemented strategy plus one retry, never unbounded" };

const wellFormed = (html) => { const c = checkCode(html); return { wellFormed: c.issues === 0, problems: c.findings }; };

function appendRecord(entry) {
  fs.mkdirSync(new URL("../the-fold/surface/", import.meta.url).pathname, { recursive: true });
  fs.appendFileSync(REPAIR_LOG, `${JSON.stringify(entry)}\n`, "utf8");
}

function nextRoundFor(log, anchor) {
  const rounds = log.entries.filter((e) => e.anchor === anchor && Number.isInteger(e.round)).map((e) => e.round);
  return (rounds.length ? Math.max(...rounds) : 0) + 1;
}

function ruleBlock(styleContent, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`);
  return { re, match: re.exec(styleContent) };
}

// ── strategy 1: CONTRAST — mechanical, verified, no model call ─────────────
// A WCAG floor is a computable target, not a judgment call: pick whichever
// of black/white text clears the floor against the REAL background (higher
// ratio wins if both clear), and verify the result numerically before ever
// proposing it — the same contract discipline escapeHtmlContract already
// holds for a pure function, applied here to a design decision that turns
// out to have exactly one objectively correct answer.
function mechanicalContrastFix(el) {
  const floor = wcagFloorFor(el);
  const black = [0, 0, 0];
  const white = [255, 255, 255];
  const rb = contrastRatio(black, el.backgroundColor);
  const rw = contrastRatio(white, el.backgroundColor);
  const color = rb >= rw ? black : white;
  const ratio = Math.max(rb, rw);
  return { color, ratio: Math.round(ratio * 100) / 100, floor, clears: ratio >= floor };
}

function applyContrastFix(styleContent, el, fix) {
  const { re, match } = ruleBlock(styleContent, el.selector);
  if (!match) return { ok: false, detail: `no existing rule found for selector "${el.selector}" to merge a color fix into` };
  // (?<![\w-]) — a real word-boundary-on-the-left check that ALSO excludes
  // a hyphen, catching a bug found live: a bare `color\s*:` regex matches
  // the "color:" tail of "background-color:" too (a plain \b boundary
  // sits between "-" and "c" just as validly as between a space and "c"),
  // which corrupted the button's own background declaration into
  // "background-" the first time this ran against the real settled style.
  const decls = match[1].replace(/(?<![\w-])color\s*:[^;]*;?/g, "").trim();
  const newBlock = `${el.selector} {\n${decls ? `${decls}\n` : ""}  color: rgb(${fix.color.join(", ")});\n}`;
  return { ok: true, content: styleContent.replace(re, newBlock) };
}

// ── strategy 2: DIFFERENTIATE — one isolated model call, contract-checked ──
// pop-out's own flatline finding names WHAT is wrong (nothing differs from
// its neighbors); it cannot name HOW to differentiate it tastefully — that
// is a real judgment call, asked of the model in complete isolation (no
// existing style content in its context, matching this session's own
// anchor-log discipline throughout).
const DIFFERENTIATE_PROMPT = `Write ONE CSS rule, and only one, that makes the FIRST episode in a list of many identical "<div class=\\"episode\\"><h3>...</h3>..." entries visually stand out from the rest — e.g. an accent color, a bolder weight, or a larger size for its title. Use exactly the selector ".episode:first-of-type h3". Return ONLY that one rule, in a fenced css code block, nothing else, no explanation.`;

async function callMouth(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify({ model: MODEL, stream: false, options: { temperature: 0.3 }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`mouth call failed: ${res.status}`);
  const body = await res.json();
  return body.message.content;
}

function extractFence(text) {
  const m = /```(?:css)?\n([\s\S]*?)```/i.exec(text);
  return (m ? m[1] : text).trim();
}

// The contract: a real, distinct rule — not empty, not silently identical
// to the existing .episode h3 rule it must differ FROM. Never verifies the
// design is GOOD (that is what the next loop round's real re-measurement
// is for) — only that the model did not return garbage or a no-op.
function differentiationContract(cssText, existingEpisodeH3Rule) {
  const m = /^\s*([^{]+)\{([^}]*)\}\s*$/.exec(cssText);
  if (!m) return { ok: false, detail: `not a single well-formed CSS rule: ${JSON.stringify(cssText.slice(0, 120))}` };
  const [, selector, decls] = m;
  if (!selector.trim() || !decls.trim()) return { ok: false, detail: "empty selector or empty declaration block" };
  const normalized = decls.replace(/\s+/g, " ").trim();
  const existingNormalized = (existingEpisodeH3Rule ?? "").replace(/\s+/g, " ").trim();
  if (normalized === existingNormalized) return { ok: false, detail: "identical to the existing .episode h3 rule — differentiates nothing" };
  return { ok: true, selector: selector.trim(), decls: decls.trim() };
}

async function proposeDifferentiation(styleContent, round) {
  const existing = ruleBlock(styleContent, ".episode h3").match?.[1] ?? "";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const raw = await callMouth(DIFFERENTIATE_PROMPT);
    const css = extractFence(raw);
    const contract = differentiationContract(css, existing);
    if (contract.ok) {
      const newContent = `${styleContent}\n\n${contract.selector} {\n  ${contract.decls}\n}`;
      return { ok: true, content: newContent, raw, prompt: DIFFERENTIATE_PROMPT, attempt };
    }
    if (attempt === 2) return { ok: false, detail: contract.detail, raw };
  }
}

// ── diagnosis: which findings are repairable, and by which strategy ────────
function diagnose(report) {
  const tasks = [];
  for (const c of report.contrast) {
    if (!c.clears) tasks.push({ kind: "contrast", id: c.id });
  }
  if (report.condition.kind === "stale" && report.read.rhythm.flatline) {
    tasks.push({ kind: "differentiate" });
  } else if (report.condition.kind === "collapse") {
    tasks.push({ kind: "unrepaired", detail: `condition "collapse" fired (${report.condition.basis}) — no repair strategy exists for the curve axis yet (see native/docs/THE-THEORY-OF-PATHOS.md, slot 4: no incremental visual reader to re-read against)` });
  } else if (report.condition.kind === "contested") {
    tasks.push({ kind: "unrepaired", detail: `condition "contested" fired (${report.condition.basis}) — no repair strategy exists for a strict-strain visual claim cycle yet` });
  }
  if (report.strainState.contradictions.length && report.condition.kind !== "stale") {
    for (const c of report.strainState.contradictions) tasks.push({ kind: "unrepaired", detail: `strain contradiction [${c.kind}]: ${c.detail} — no repair strategy exists for grouping/regime contradictions yet` });
  }
  return tasks;
}

async function readReport(elements) {
  const firstH3 = elements.find((e) => e.tag === "h3");
  const firstP = elements.find((e) => e.tag === "p");
  return visualPathosOf({
    experiencer: { who: "a first-time visitor scanning for one episode to play, on a laptop, ordinary indoor lighting", read: `${APP_URL} (subscribed to ${FEED_URL})` },
    elements,
    focalId: firstH3.id,
    popOutThreshold: { value: 0.15, giver: "this driver's own declared regime dial", basis: "same disclosed starting point as the other podcast pathos drivers" },
    groups: firstP ? [{ id: "episode-1", memberIds: [firstH3.id, firstP.id] }] : [],
    groupingMargin: { value: 8, giver: "this driver's own declared regime dial", basis: "same disclosed starting point as the other podcast pathos drivers" },
    regime: "grid-systematic",
    tokenUsage: elements.map((e) => ({
      value: `rgb(${e.backgroundColor.join(",")})`,
      role: e.tag === "button" ? "button-bg" : e.tag === "input" ? "form-field-bg" : (e.className && e.className.includes("ethos-badge")) ? "badge-bg" : "container-bg",
    })),
  });
}

async function main() {
  console.log(`# pathos repair loop — budget ${MAX_ROUNDS.value} rounds (${MAX_ROUNDS.basis})\n`);

  for (let round = 1; round <= MAX_ROUNDS.value; round += 1) {
    console.log(`## round ${round}`);
    const elements = await extractElements({ appUrl: APP_URL, cdpUrl: CDP_URL, feedUrl: FEED_URL });
    const before = await readReport(elements);
    console.log(`  read: condition=${before.condition.kind}, contrast fails=${before.contrast.filter((c) => !c.clears).length}, strain=${before.read.strain}`);

    const tasks = diagnose(before);
    const repairable = tasks.filter((t) => t.kind !== "unrepaired");
    const unrepaired = tasks.filter((t) => t.kind === "unrepaired");
    for (const u of unrepaired) console.log(`  NAMED, NOT REPAIRED: ${u.detail}`);

    if (!repairable.length) {
      const done = before.condition.kind === "ground_holds" && before.contrast.every((c) => c.clears);
      console.log(done ? "  DONE — condition is ground_holds and every contrast finding clears." : "  no repairable task this round.");
      appendRecord({ round, before: { condition: before.condition, contrastFails: before.contrast.filter((c) => !c.clears).map((c) => c.id) }, tasks, applied: [], stoppedBecause: done ? "ground_holds" : "no_repairable_task" });
      break;
    }

    let log = readAnchorLog(LEDGER_FILE);
    const fromStart = log.nextSeq;
    let styleContent = settledContent(log, "style").content;
    const applied = [];

    for (const task of repairable) {
      if (task.kind === "contrast") {
        const el = elements.find((e) => e.id === task.id);
        const fix = mechanicalContrastFix(el);
        console.log(`  [contrast/mechanical] ${el.selector}: trying rgb(${fix.color.join(",")}) → ratio ${fix.ratio} vs floor ${fix.floor} (clears: ${fix.clears})`);
        if (!fix.clears) { applied.push({ task, ok: false, detail: "neither black nor white clears the floor against this background — no mechanical fix available" }); continue; }
        const merged = applyContrastFix(styleContent, el, fix);
        if (!merged.ok) { applied.push({ task, ok: false, detail: merged.detail }); continue; }
        styleContent = merged.content;
        applied.push({ task, ok: true, detail: `merged color: rgb(${fix.color.join(", ")}) into "${el.selector}", verified ${fix.ratio}:1 >= ${fix.floor}:1`, writer: "mechanical" });
      } else if (task.kind === "differentiate") {
        console.log(`  [differentiate/model] isolated ask to ${MODEL}: distinguish the first episode's title...`);
        const result = await proposeDifferentiation(styleContent, round);
        if (!result.ok) { applied.push({ task, ok: false, detail: `model's proposal failed its own contract after retry: ${result.detail}` }); continue; }
        console.log(`    got: ${result.selector ? "" : "(fenced content)"} — attempt ${result.attempt}`);
        styleContent = result.content;
        applied.push({ task, ok: true, detail: "appended a new, contract-checked .episode:first-of-type h3 rule", writer: MODEL, prompt: result.prompt, rawResponse: result.raw });
      }
    }

    const anyApplied = applied.some((a) => a.ok);
    if (anyApplied) {
      const round_ = nextRoundFor(log, "style");
      log = proposeAnchor(log, {
        anchor: "style", content: styleContent, round: round_, writer: "pathos-repair-loop",
        writerAudit: { request: `round ${round} repairs: ${applied.filter((a) => a.ok).map((a) => a.task.kind).join(", ")}`, rawResponse: JSON.stringify(applied.filter((a) => a.ok).map((a) => a.detail)), durationMs: null, model: MODEL },
      });
      appendAnchorLog(LEDGER_FILE, log, fromStart);
      const fold = await foldCode(log, TEMPLATE, { wellFormed, coherenceGate });
      console.log(`  folded — clean: ${fold.clean}, lintProblems: ${fold.lintProblems}`);
      await fsp.writeFile(HTML_FILE, fold.html);
    } else {
      console.log("  no repair actually applied this round.");
    }

    const elementsAfter = await extractElements({ appUrl: APP_URL, cdpUrl: CDP_URL, feedUrl: FEED_URL });
    const after = await readReport(elementsAfter);
    console.log(`  after: condition=${after.condition.kind}, contrast fails=${after.contrast.filter((c) => !c.clears).length}, strain=${after.read.strain}\n`);

    appendRecord({
      round,
      before: { condition: before.condition, contrastFails: before.contrast.filter((c) => !c.clears).map((c) => c.id), strain: before.read.strain },
      tasks,
      applied: applied.map(({ task, ok, detail, writer }) => ({ task, ok, detail, writer })),
      after: { condition: after.condition, contrastFails: after.contrast.filter((c) => !c.clears).map((c) => c.id), strain: after.read.strain },
    });

    if (after.condition.kind === "ground_holds" && after.contrast.every((c) => c.clears)) {
      console.log(`# DONE after round ${round} — ground_holds, all contrast clears.`);
      return;
    }
  }
  console.log(`# budget exhausted (${MAX_ROUNDS.value} rounds) — reporting honestly, not claiming success it did not earn.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exitCode = 1; });
}
