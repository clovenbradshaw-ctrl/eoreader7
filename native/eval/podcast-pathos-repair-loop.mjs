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
// enough to attempt each currently-implemented repair strategy once,
// plus one retry round, before reporting honestly rather than looping
// forever chasing a condition this loop has no strategy for."
//
// FOUR REPAIR STRATEGIES ARE IMPLEMENTED: contrast (mechanical, WCAG),
// differentiate (one isolated model call, Girard-checked), retaste (a
// later Girard-only re-check of an already-landed differentiation that
// pathos itself structurally cannot judge), and roundness (mechanical,
// Girard-measured corner radius). A finding this loop has no strategy
// for (a strain contradiction, a real claim cycle) is named and left
// unrepaired, NEVER silently skipped without saying so — the same "a
// gap is never a verdict" rule pathos.js itself holds.
import fs from "node:fs";
import fsp from "node:fs/promises";
import { extractElements } from "./podcast-cdp-lib.mjs";
import { establishElementReferents, bridgeElementReferents } from "../organs/element-referents.js";
import { visualPathosOf } from "../organs/visual-pathos.js";
import { contrastRatio, wcagFloorFor } from "../organs/contrast.js";
import { proposeAnchor, foldCode, readAnchorLog, appendAnchorLog, settledContent } from "../adapters/build/code-anchor-log.js";
import { checkMimicry, resolveToHex, dominantConvention, stepLightness, ELEVATION_STEP } from "../organs/girard.js";
import { proposeReference, signMeasurement, bindCorrespondence, synthesizeCandidate, defineCandidate, evaluateCandidate, fitStatus, needsReopen, latestRound } from "../organs/reference-fit.js";
import { createTaskLog, append as appendTaskEntry } from "../kernel/task-log.js";
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
//
// FOUND LIVE, FIXED HERE: the first version of this ask had no notion of
// TASTE at all — the model returned a well-formed rule (bold, larger,
// RED) that cleared the plain "is this real and different" contract and
// was genuinely tasteless anyway, because red shares nothing with the
// app's own established Spotify-green accent (#1DB954). Per
// organs/girard.js (Handle: Girard — mimetic desire, "man does not know
// what to desire, and turns to others to make up his mind"): a design
// choice asked for with nothing real to imitate produces arbitrary
// output. Attempt 1 still asks freely, unprompted — the mimicry contract
// below is the actual MEASUREMENT of whether the model converged on a
// real pattern by itself; attempt 2, if attempt 1 fails that check, is
// told explicitly what real, established color to imitate.
const DIFFERENTIATE_PROMPT = `Write ONE CSS rule, and only one, that makes the FIRST episode in a list of many identical "<div class=\\"episode\\"><h3>...</h3>..." entries visually stand out from the rest — e.g. an accent color, a bolder weight, or a larger size for its title. Use exactly the selector ".episode:first-of-type h3". Return ONLY that one rule, in a fenced css code block, nothing else, no explanation.`;

const DIFFERENTIATE_PROMPT_MIMETIC = (accentHex) => `Write ONE CSS rule, and only one, that makes the FIRST episode in a list of many identical "<div class=\\"episode\\"><h3>...</h3>..." entries visually stand out from the rest. This app's own established accent color is ${accentHex} — reuse it (or a lighter/darker shade of the SAME hue) for the emphasis, the way real, well-designed interfaces reuse their own accent color rather than introducing an unrelated one. Use exactly the selector ".episode:first-of-type h3". Return ONLY that one rule, in a fenced css code block, nothing else, no explanation.`;

// The two real, measured local design systems girard.js's own header
// cites — this dial is not invented, it is the max of the two.
const MIMICRY_DIAL = { value: 15, giver: "organs/girard.js — the-fold (#6d28d9→#f3eeff, 5.7°) and heimdall (#63d9a8→2a7a5e, 3.9°), the two real local design systems measured", basis: "comfortably above both real observed values (a few degrees, from sRGB rounding across a lightness shift), firmly below an unrelated hue (a red departs a green accent by ~141°)" };

function establishedAccentFrom(styleContent) {
  const m = /button\s*\{[^}]*background-color\s*:\s*([^;]+);/.exec(styleContent);
  return m ? resolveToHex(m[1].trim()) : null;
}

// ── strategy 3: ROUNDNESS — mechanical, measured from real local systems ──
// "have it improve until it looks like real ones" named a real, visible gap
// pathos/pop-out/contrast structurally cannot see (none of them measure
// corner radius at all): the .episode row is a hard rectangle, and every
// real local reference this repo can measure rounds its card-like
// containers. This is a computable convention, not a judgment call — no
// model asked, exactly like the contrast fix.
let ROUNDNESS_CONVENTION = null;
function roundnessConvention() {
  if (ROUNDNESS_CONVENTION) return ROUNDNESS_CONVENTION;
  const refs = [];
  for (const [giver, path] of [
    ["the-fold/index.html", new URL("../../../the-fold-legacy/index.html", import.meta.url)],
    ["heimdall/src/style.css", new URL("../../../heimdall/src/style.css", import.meta.url)],
  ]) {
    try { refs.push({ giver, cssText: fs.readFileSync(path, "utf8") }); } catch { /* sibling checkout not present here — disclosed via n:0 below, never a crash */ }
  }
  ROUNDNESS_CONVENTION = dominantConvention(refs, "border-radius");
  return ROUNDNESS_CONVENTION;
}

function flatEpisodeRow(styleContent) {
  const { match } = ruleBlock(styleContent, ".episode");
  if (!match) return false;
  return !/(?<![\w-])border-radius\s*:/.test(match[1]);
}

function applyRoundness(styleContent, radiusPx) {
  const { re, match } = ruleBlock(styleContent, ".episode");
  if (!match) return { ok: false, detail: "no .episode rule found to round" };
  const decls = match[1].trim();
  const newBlock = `.episode {\n${decls}\n  border-radius: ${radiusPx}px;\n}`;
  return { ok: true, content: styleContent.replace(re, newBlock) };
}

// ── strategy 4: ELEVATION — mechanical, measured from real local systems ──
// A rounded corner on a box that shares its background with the page is
// invisible — verified live: the roundness fix alone produced NO visible
// change, because .episode has no background-color of its own at all. Two
// real, independently-built local systems agree EXACTLY (+2.7 points of
// HSL lightness, same hue) on the first surface-elevation step above a
// page background (girard.js::ELEVATION_STEP) — the real convention that
// makes a "card" read as a card at all.
function pageBackgroundFrom(styleContent) {
  const m = /body\s*\{[^}]*background-color\s*:\s*([^;]+);/.exec(styleContent);
  return m ? resolveToHex(m[1].trim()) : null;
}

function flatEpisodeBackground(styleContent) {
  const { match } = ruleBlock(styleContent, ".episode");
  if (!match) return false;
  return !/(?<![\w-])background(-color)?\s*:/.test(match[1]);
}

function applyElevation(styleContent, pageBgHex) {
  const { re, match } = ruleBlock(styleContent, ".episode");
  if (!match) return { ok: false, detail: "no .episode rule found to elevate" };
  const surface = stepLightness(pageBgHex, ELEVATION_STEP.value);
  const decls = match[1].trim();
  const newBlock = `.episode {\n${decls}\n  background-color: ${surface};\n}`;
  return { ok: true, content: styleContent.replace(re, newBlock), surface };
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

function extractFence(text) {
  const m = /```(?:css)?\n([\s\S]*?)```/i.exec(text);
  return (m ? m[1] : text).trim();
}

// The contract: a real, distinct rule — not empty, not silently identical
// to the existing .episode h3 rule it must differ FROM — AND, if it
// declares any color at all, one that MIMICS the app's own established
// accent (girard.js) rather than an arbitrary, unrelated hue. Never
// verifies the design is GOOD beyond that (whether it's tasteful in any
// deeper sense is what the next loop round's real re-measurement is for)
// — only that the model did not return garbage, a no-op, or an invented
// color with nothing real behind it.
function differentiationContract(cssText, existingEpisodeH3Rule, establishedAccentHex) {
  const m = /^\s*([^{]+)\{([^}]*)\}\s*$/.exec(cssText);
  if (!m) return { ok: false, detail: `not a single well-formed CSS rule: ${JSON.stringify(cssText.slice(0, 120))}` };
  const [, selector, decls] = m;
  if (!selector.trim() || !decls.trim()) return { ok: false, detail: "empty selector or empty declaration block" };
  const normalized = decls.replace(/\s+/g, " ").trim();
  const existingNormalized = (existingEpisodeH3Rule ?? "").replace(/\s+/g, " ").trim();
  if (normalized === existingNormalized) return { ok: false, detail: "identical to the existing .episode h3 rule — differentiates nothing" };
  if (establishedAccentHex) {
    const colorDecls = [...decls.matchAll(/(?<![\w-])(color|background-color|border-color)\s*:\s*([^;]+)/g)];
    for (const [, prop, value] of colorDecls) {
      const hex = resolveToHex(value.trim());
      if (!hex) continue; // a value this can't resolve (a var(), a keyword outside the received subset) is a disclosed gap, never a guessed failure
      const mimicry = checkMimicry(hex, establishedAccentHex, MIMICRY_DIAL);
      if (!mimicry.mimetic) return { ok: false, detail: `${prop}: ${value.trim()} — ${mimicry.detail}`, mimicryFailure: true };
    }
  }
  return { ok: true, selector: selector.trim(), decls: decls.trim() };
}

async function proposeDifferentiation(styleContent, round) {
  const existing = ruleBlock(styleContent, ".episode h3").match?.[1] ?? "";
  const accentHex = establishedAccentFrom(styleContent);
  let lastMimicryFailure = false;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    // Girard's own point, made mechanical: attempt 1 asks freely — this IS
    // the measurement of whether the model converges on a real pattern
    // unprompted. Only once that measurement FAILS (a real mimicry
    // failure, not any other contract failure) does attempt 2 name the
    // real model to imitate, rather than retrying the identical blind ask.
    const prompt = (attempt === 2 && lastMimicryFailure && accentHex) ? DIFFERENTIATE_PROMPT_MIMETIC(accentHex) : DIFFERENTIATE_PROMPT;
    const raw = await callMouth(prompt);
    const css = extractFence(raw);
    const contract = differentiationContract(css, existing, accentHex);
    if (contract.ok) {
      const newContent = `${styleContent}\n\n${contract.selector} {\n  ${contract.decls}\n}`;
      return { ok: true, content: newContent, raw, prompt, attempt, mimicryChecked: Boolean(accentHex) };
    }
    lastMimicryFailure = Boolean(contract.mimicryFailure);
    if (attempt === 2) return { ok: false, detail: contract.detail, raw };
  }
}

// A taste failure pathos structurally cannot see (P: "does it look nice"
// is a category error for the re-ground ladder itself) but Girard's
// contract can: an ALREADY-LANDED differentiation whose color never
// imitated the app's own established accent. Checked independent of the
// pathos condition — pop-out reads ground_holds correctly (the rule DOES
// differentiate), and this is a separate, later-earned finding on top.
function tastelessDifferentiation(styleContent) {
  const accentHex = establishedAccentFrom(styleContent);
  if (!accentHex) return null;
  const existing = ruleBlock(styleContent, ".episode:first-of-type h3").match;
  if (!existing) return null;
  const colorDecls = [...existing[1].matchAll(/(?<![\w-])(color|background-color|border-color)\s*:\s*([^;]+)/g)];
  for (const [, prop, value] of colorDecls) {
    const hex = resolveToHex(value.trim());
    if (!hex) continue;
    const mimicry = checkMimicry(hex, accentHex, MIMICRY_DIAL);
    if (!mimicry.mimetic) return { prop, value: value.trim(), mimicry };
  }
  return null;
}

// ── diagnosis: which findings are repairable, and by which strategy ────────
// ── strategy 5: REFERENCE-FIT — "grow the organs so the pipeline naturally
// tries to fit toward a real reference, always revisable." organs/
// reference-fit.js's own kernel-task-log ledger, persisted here (the pure
// module holds no disk I/O — this is the one crossing). Unlike the other
// four strategies, this one's own EVA can refuse to ever apply anything —
// a CONTESTED reference corpus is a named, disclosed finding, not
// something this loop forces a compromise value out of.
const REFERENCE_FIT_LEDGER = new URL("../the-fold/surface/podcast-reference-fit-log.jsonl", import.meta.url).pathname;

// Real, measured background values — the-fold and heimdall cited exactly
// as girard.js's own ELEVATION_STEP header already cites them; Pocket
// Casts measured live from the real downloaded screenshot's status-bar
// band (eval/extract-image-palette.mjs, eval/reference-images/pocket-
// casts-podcast-tab.png — a real, freely-licensed image, not invented).
const BACKGROUND_REFERENCES = Object.freeze([
  { name: "the-fold", giver: "the-fold/index.html (--bg)", hex: "#0f0f12" },
  { name: "heimdall", giver: "heimdall/src/style.css (--bg)", hex: "#0b0e14" },
  { name: "pocket-casts", giver: "Wikimedia Commons, freely-licensed screenshot, status-bar band (96.3% of sampled pixels)", hex: "#303030" },
]);

function loadReferenceFitLog() {
  let log = createTaskLog();
  if (!fs.existsSync(REFERENCE_FIT_LEDGER)) return log;
  const lines = fs.readFileSync(REFERENCE_FIT_LEDGER, "utf8").split("\n").filter(Boolean);
  for (const line of lines) log = appendTaskEntry(log, JSON.parse(line));
  return log;
}

function persistReferenceFitLog(log, fromSeq) {
  const newEntries = log.entries.slice(fromSeq);
  if (!newEntries.length) return;
  fs.appendFileSync(REFERENCE_FIT_LEDGER, newEntries.map((e) => JSON.stringify(e)).join("\n") + "\n");
}

function pageTextColorFrom(styleContent) {
  const m = /body\s*\{[^}]*color\s*:\s*([^;]+);/.exec(styleContent);
  return m ? resolveToHex(m[1].trim()) : null;
}

/**
 * runReferenceFit(log, styleContent) — the nine-operator cycle, run once
 * per property per repair-loop invocation. INS proposes each reference
 * (idempotent); SIG signs its measured value (idempotent when unchanged);
 * CON declares the correspondence (idempotent). If no round has been
 * defined yet for this property (fitStatus "open"), SYN synthesizes a
 * candidate, DEF cuts it out as a clause, and EVA checks it — against the
 * corpus's own agreement first (a CONTESTED synthesis is refused before
 * any check runs), then against a real WCAG contrast floor against the
 * page's own actual text color. A property already landed, refused, or
 * conceded is NOT re-litigated automatically every run — reopening it is
 * an explicit act (retractFinding + a fresh round), never a loop that
 * keeps re-asking a question the ledger already answered.
 */
function runReferenceFit(log, styleContent) {
  for (const ref of BACKGROUND_REFERENCES) log = proposeReference(log, { name: ref.name, giver: ref.giver });
  for (const ref of BACKGROUND_REFERENCES) log = signMeasurement(log, { property: "background", reference: ref.name, hex: ref.hex });
  for (const ref of BACKGROUND_REFERENCES) log = bindCorrespondence(log, { property: "background", reference: ref.name });

  let status = fitStatus(log, "background");
  // "Always revisable" as an automatic property of the pipeline: a
  // retraction or a genuinely new measurement changes the live evidence
  // out from under a refused/conceded round, and needsReopen catches
  // that mismatch — the next round opens on its own, no one has to
  // remember to re-run anything by hand.
  const reopen = status.status !== "open" && needsReopen(log, "background");
  if (status.status === "open" || reopen) {
    const round = latestRound(log, "background") + 1;
    const syn = synthesizeCandidate(log, { property: "background", round });
    log = syn.log;
    log = defineCandidate(log, { property: "background", round });
    const textHex = pageTextColorFrom(styleContent);
    log = evaluateCandidate(log, {
      property: "background", round, candidateHex: syn.candidateHex, contested: syn.contested,
      check: (hex) => {
        if (!textHex) return { holds: false, detail: "no page text color found to check contrast against" };
        const toRgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1).slice(i, i + 2), 16));
        const ratio = contrastRatio(toRgb(hex), toRgb(textHex));
        const floor = wcagFloorFor("normal");
        return { holds: ratio >= floor, detail: `${hex} vs page text ${textHex}: ${ratio.toFixed(2)}:1 (floor ${floor}:1)` };
      },
    });
    status = fitStatus(log, "background");
  }
  return { log, status };
}

function applyReferenceFit(styleContent, hex) {
  const re = /(body\s*\{[^}]*background-color\s*:\s*)([^;]+)(;)/;
  if (!re.test(styleContent)) return { ok: false, detail: "no body background-color declaration found to fit" };
  return { ok: true, content: styleContent.replace(re, `$1${hex}$3`) };
}

function diagnose(report, styleContent, refFit) {
  const tasks = [];
  for (const c of report.contrast) {
    if (!c.clears) tasks.push({ kind: "contrast", id: c.id });
  }
  if (report.condition.kind === "stale" && report.read.rhythm.flatline) {
    tasks.push({ kind: "differentiate" });
  } else {
    const tasteless = tastelessDifferentiation(styleContent);
    if (tasteless) tasks.push({ kind: "retaste", tasteless });
  }
  if (report.condition.kind === "collapse") {
    tasks.push({ kind: "unrepaired", detail: `condition "collapse" fired (${report.condition.basis}) — no repair strategy exists for the curve axis yet (see native/docs/THE-THEORY-OF-PATHOS.md, slot 4: no incremental visual reader to re-read against)` });
  } else if (report.condition.kind === "contested") {
    tasks.push({ kind: "unrepaired", detail: `condition "contested" fired (${report.condition.basis}) — no repair strategy exists for a strict-strain visual claim cycle yet` });
  }
  if (report.strainState.contradictions.length && report.condition.kind !== "stale") {
    for (const c of report.strainState.contradictions) tasks.push({ kind: "unrepaired", detail: `strain contradiction [${c.kind}]: ${c.detail} — no repair strategy exists for grouping/regime contradictions yet` });
  }
  const convention = roundnessConvention();
  if (convention.median != null && flatEpisodeRow(styleContent)) {
    tasks.push({ kind: "roundness", convention });
  }
  const pageBg = pageBackgroundFrom(styleContent);
  if (pageBg && flatEpisodeBackground(styleContent)) {
    tasks.push({ kind: "elevation", pageBg });
  }
  if (refFit) {
    if (refFit.status.status === "landed" && pageBg !== refFit.status.candidateHex) {
      tasks.push({ kind: "reference-fit", property: "background", candidateHex: refFit.status.candidateHex, round: refFit.status.round });
    } else if (refFit.status.status === "refused" || refFit.status.status === "conceded") {
      tasks.push({ kind: "unrepaired", detail: `reference-fit on background: ${refFit.status.detail} — always revisable (retract a reference, or corroborate with a new one, to reopen)` });
    }
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

function bridgeSummary(bridge) {
  const named = (list, label) => list.length
    ? `${label} ${list.length} (${list.slice(0, 4).map((x) => (x.ref ?? x.after?.ref ?? x.before?.ref)).join(", ")}${list.length > 4 ? ", ..." : ""})`
    : `${label} 0`;
  return `${named(bridge.persisted, "persisted")}; ${named(bridge.changed, "changed")}; ${named(bridge.appeared, "appeared")}; ${named(bridge.vanished, "vanished")}`;
}

async function main() {
  console.log(`# pathos repair loop — budget ${MAX_ROUNDS.value} rounds (${MAX_ROUNDS.basis})\n`);

  // The auto-generated artifact's elements are connected to REFERENTS here
  // (organs/element-referents.js) so the rest of this loop, and anything
  // reading its record, can address "episode 1's title" or "the subscribe
  // button" as a THING that persists (or changes, or vanishes) across
  // rounds — never a scan-order id or a shared CSS rule name, neither of
  // which survives a repair. `priorReferents` carries the LAST round's
  // referents forward so a fresh round's own extraction can be bridged
  // against what came before it, not just against itself mid-round.
  let priorReferents = null;

  for (let round = 1; round <= MAX_ROUNDS.value; round += 1) {
    console.log(`## round ${round}`);
    const elements = await extractElements({ appUrl: APP_URL, cdpUrl: CDP_URL, feedUrl: FEED_URL });
    const before = await readReport(elements);
    console.log(`  read: condition=${before.condition.kind}, contrast fails=${before.contrast.filter((c) => !c.clears).length}, strain=${before.read.strain}`);
    const beforeReferents = establishElementReferents(elements);
    if (priorReferents) {
      const acrossRounds = bridgeElementReferents(priorReferents, beforeReferents);
      console.log(`  referents (vs. prior round's after-state): ${bridgeSummary(acrossRounds)}`);
    } else {
      console.log(`  referents established this round: ${beforeReferents.length} (${beforeReferents.map((r) => r.kind).join(", ")})`);
    }

    let log = readAnchorLog(LEDGER_FILE);
    const fromStart = log.nextSeq;
    let styleContent = settledContent(log, "style").content;

    let refLog = loadReferenceFitLog();
    const refFromSeq = refLog.nextSeq;
    const ref = runReferenceFit(refLog, styleContent);
    persistReferenceFitLog(ref.log, refFromSeq);
    console.log(`  reference-fit (background): ${ref.status.status}${ref.status.round ? ` (round ${ref.status.round})` : ""} — ${ref.status.detail ?? ""}`);

    const tasks = diagnose(before, styleContent, ref);
    const repairable = tasks.filter((t) => t.kind !== "unrepaired");
    const unrepaired = tasks.filter((t) => t.kind === "unrepaired");
    for (const u of unrepaired) console.log(`  NAMED, NOT REPAIRED: ${u.detail}`);

    if (!repairable.length) {
      const done = before.condition.kind === "ground_holds" && before.contrast.every((c) => c.clears);
      console.log(done ? "  DONE — condition is ground_holds and every contrast finding clears." : "  no repairable task this round.");
      priorReferents = beforeReferents;
      appendRecord({ round, before: { condition: before.condition, contrastFails: before.contrast.filter((c) => !c.clears).map((c) => c.id) }, tasks, applied: [], stoppedBecause: done ? "ground_holds" : "no_repairable_task", referents: { establishedThisRound: beforeReferents.map((r) => ({ ref: r.ref, kind: r.kind, keyedBy: r.keyedBy })) } });
      break;
    }

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
      } else if (task.kind === "retaste") {
        console.log(`  [retaste/model, Girard] an already-landed differentiation (${task.tasteless.prop}: ${task.tasteless.value}) is arbitrary — ${task.tasteless.mimicry.detail}`);
        const { re: oldRuleRe, match: oldRuleMatch } = ruleBlock(styleContent, ".episode:first-of-type h3");
        if (!oldRuleMatch) { applied.push({ task, ok: false, detail: "the tasteless rule vanished between diagnosis and repair — nothing to concede" }); continue; }
        const withoutOldRule = styleContent.replace(oldRuleRe, "").replace(/\n{3,}/g, "\n\n").trim();
        const result = await proposeDifferentiation(withoutOldRule, round);
        if (!result.ok) { applied.push({ task, ok: false, detail: `redo failed its own contract after retry: ${result.detail}` }); continue; }
        console.log(`    redone — attempt ${result.attempt}, mimicry checked: ${result.mimicryChecked}`);
        styleContent = result.content;
        applied.push({ task, ok: true, detail: `conceded the arbitrary ${task.tasteless.prop}: ${task.tasteless.value} and re-proposed under Girard's mimicry contract`, writer: MODEL, prompt: result.prompt, rawResponse: result.raw });
      } else if (task.kind === "roundness") {
        console.log(`  [roundness/mechanical, Girard] .episode is a hard rectangle; real local systems measure ${task.convention.detail}`);
        const applied_ = applyRoundness(styleContent, task.convention.median);
        if (!applied_.ok) { applied.push({ task, ok: false, detail: applied_.detail }); continue; }
        styleContent = applied_.content;
        applied.push({ task, ok: true, detail: `applied border-radius: ${task.convention.median}px to .episode — the real median across ${task.convention.n} declarations in ${task.convention.perReference.length} local design system(s)`, writer: "mechanical" });
      } else if (task.kind === "elevation") {
        console.log(`  [elevation/mechanical, Girard] .episode shares the page background (${task.pageBg}); real local systems agree on +${ELEVATION_STEP.value} lightness for the first surface`);
        const applied_ = applyElevation(styleContent, task.pageBg);
        if (!applied_.ok) { applied.push({ task, ok: false, detail: applied_.detail }); continue; }
        styleContent = applied_.content;
        applied.push({ task, ok: true, detail: `applied background-color: ${applied_.surface} to .episode — ${ELEVATION_STEP.value} points of HSL lightness above the page's own ${task.pageBg}, the exact step both real local design systems measure`, writer: "mechanical" });
      } else if (task.kind === "reference-fit") {
        console.log(`  [reference-fit/mechanical, EVA·Figure held] round ${task.round}'s corroborated background ${task.candidateHex} clears its WCAG check — landing it (REC always revisable)`);
        const applied_ = applyReferenceFit(styleContent, task.candidateHex);
        if (!applied_.ok) { applied.push({ task, ok: false, detail: applied_.detail }); continue; }
        styleContent = applied_.content;
        applied.push({ task, ok: true, detail: `applied background-color: ${task.candidateHex} to body — round ${task.round}'s corroborated, WCAG-checked reference-fit candidate (see podcast-reference-fit-log.jsonl for the full nine-operator record)`, writer: "mechanical" });
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
    console.log(`  after: condition=${after.condition.kind}, contrast fails=${after.contrast.filter((c) => !c.clears).length}, strain=${after.read.strain}`);
    const afterReferents = establishElementReferents(elementsAfter);
    const withinRoundBridge = bridgeElementReferents(beforeReferents, afterReferents);
    console.log(`  referents (this round's own repair): ${bridgeSummary(withinRoundBridge)}\n`);
    priorReferents = afterReferents;

    appendRecord({
      round,
      before: { condition: before.condition, contrastFails: before.contrast.filter((c) => !c.clears).map((c) => c.id), strain: before.read.strain },
      tasks,
      applied: applied.map(({ task, ok, detail, writer }) => ({ task, ok, detail, writer })),
      after: { condition: after.condition, contrastFails: after.contrast.filter((c) => !c.clears).map((c) => c.id), strain: after.read.strain },
      referents: {
        establishedThisRound: afterReferents.map((r) => ({ ref: r.ref, kind: r.kind, keyedBy: r.keyedBy })),
        withinRoundBridge: {
          persisted: withinRoundBridge.persisted.map((x) => x.before.ref),
          changed: withinRoundBridge.changed.map((x) => ({ ref: x.before.ref, confidence: x.confidence })),
          appeared: withinRoundBridge.appeared.map((r) => r.ref),
          vanished: withinRoundBridge.vanished.map((r) => r.ref),
        },
      },
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
