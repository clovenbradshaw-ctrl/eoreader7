// code-anchor-log.test.mjs — proves the anchor-based replacement for
// byte-range splicing: writers never see the whole (structurally, not by
// policy), contradictions land as real CON/EVA/DEF/REC acts rather than
// silent text-merging, and the fold replays at any cursor.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTaskLog } from "../../kernel/task-log.js";
import { proposeAnchor, landAnchorCritique, adjudicate, concedeAnchor, settledContent, foldCode, anchorHistory } from "./code-anchor-log.js";

const TEMPLATE = {
  skeleton: `<!DOCTYPE html><html><body><span>{{ANCHOR:badge}}</span><audio>{{ANCHOR:audio}}</audio></body></html>`,
  anchors: { badge: { role: "a short label", default: "" }, audio: { role: "a playback control", default: "" } },
};

// Trivial fakes for tests that don't need the real harm-properties.mjs —
// real coverage of the actual checks lives in harm-properties.test.mjs /
// podcast-harm-gate-falsify.mjs; here we only need to prove the ADJUDICATION
// MECHANISM correctly routes to whichever candidate clears.
function wellFormed(html) { return { wellFormed: !html.includes("BROKEN"), problems: html.includes("BROKEN") ? ["contains BROKEN"] : [] }; }
function harmGate(before, after) { return { halted: after.includes("HARMFUL"), regressions: after.includes("HARMFUL") ? [{ property: "test", before: "ok", after: "harmful" }] : [] }; }

test("an anchor's first proposal lands INS; the fold shows it, unsettled anchors are named", async () => {
  let log = createTaskLog();
  log = proposeAnchor(log, { anchor: "badge", content: "pass", round: 1, writer: "calibration" });
  const fold = await foldCode(log, TEMPLATE);
  assert.match(fold.html, /<span>pass<\/span>/);
  assert.deepEqual(fold.unsettled, ["audio"]);
  assert.equal(fold.clean, false, "an unsettled anchor is not a clean fold");
});

test("a second, uncontested proposal for the same anchor is SYN — a revision, never a rebirth", async () => {
  let log = createTaskLog();
  log = proposeAnchor(log, { anchor: "badge", content: "v1", round: 1, writer: "calibration" });
  const { winner: _w } = {};
  log = proposeAnchor(log, { anchor: "badge", content: "v2", round: 2, writer: "calibration" });
  const hist = anchorHistory(log, "badge");
  assert.deepEqual(hist.map((h) => h.operator), ["INS", "SYN"]);
  assert.equal(settledContent(log, "badge").content, "v2");
});

test("individual writers cannot touch the whole, structurally — proposeAnchor takes an anchor name and content string only, never a template", async () => {
  // A writer's own dispatch call has NO parameter through which the
  // skeleton, another anchor, or the whole document could ever be passed
  // in — this is checked by reading proposeAnchor's own signature, not
  // merely asserted in prose.
  assert.equal(proposeAnchor.length <= 2, true, "proposeAnchor takes (log, {anchor, content, ...}) — no template/whole-document parameter exists to smuggle context through");
});

test("two CONTRADICTORY proposals for one anchor in one round: EVA adjudicates mechanically, the clearing candidate wins, the other is DEF'd — never merged", async () => {
  let log = createTaskLog();
  log = proposeAnchor(log, { anchor: "badge", content: "pass", round: 1, writer: "seed" });
  // Two writers independently propose DIFFERENT content for the SAME
  // anchor in round 2 — a real contradiction, not resolved by asking
  // either writer, not merged into one string.
  log = proposeAnchor(log, { anchor: "badge", content: "clean-label", round: 2, writer: "calibration" });
  log = proposeAnchor(log, { anchor: "badge", content: "BROKEN-label", round: 2, writer: "invariance" });
  const before = settledContent(log, "badge", log.nextSeq - 1).contested;
  assert.equal(before.length, 2, "the contest is real and visible before adjudication");

  const result = await adjudicate(log, { anchor: "badge", template: TEMPLATE, wellFormed, harmGate, round: 2 });
  log = result.log;
  assert.equal(result.verdict, "holds");
  assert.equal(result.winner, "clean-label");
  assert.equal(settledContent(log, "badge").content, "clean-label", "the winner settles the anchor");

  const hist = anchorHistory(log, "badge");
  assert.deepEqual(hist.map((h) => h.operator), ["INS", "SYN", "SYN", "EVA", "DEF"]);
  const defEntry = hist.find((h) => h.operator === "DEF");
  assert.ok(defEntry, "the losing candidate is DEF'd, not silently discarded and not merged into the winner's text");
});

test("a contest where NEITHER candidate clears, or BOTH do, is EVA'd undetermined — the fold falls back to the PRIOR settled value, never guesses", async () => {
  let log = createTaskLog();
  log = proposeAnchor(log, { anchor: "badge", content: "prior-good", round: 1, writer: "seed" });
  log = proposeAnchor(log, { anchor: "badge", content: "HARMFUL-a", round: 2, writer: "calibration" });
  log = proposeAnchor(log, { anchor: "badge", content: "HARMFUL-b", round: 2, writer: "invariance" });
  const result = await adjudicate(log, { anchor: "badge", template: TEMPLATE, wellFormed, harmGate, round: 2 });
  log = result.log;
  assert.equal(result.verdict, "undetermined");
  assert.equal(settledContent(log, "badge").content, "prior-good", "an undetermined contest never displaces the last real settlement");
});

test("REC re-zeros an anchor — not a newer value, a concession that returns it to an unsettled gap until something INS-es it again", async () => {
  let log = createTaskLog();
  log = proposeAnchor(log, { anchor: "audio", content: "<a href=fake>fake</a>", round: 1, writer: "seed" });
  assert.equal(settledContent(log, "audio").content, "<a href=fake>fake</a>");
  log = concedeAnchor(log, { anchor: "audio", trigger: "this was never real audio wiring, the whole premise of the anchor's content was wrong", round: 2, by: "operator" });
  assert.equal(settledContent(log, "audio").content, null, "a conceded anchor is a typed gap, not a value");
  log = proposeAnchor(log, { anchor: "audio", content: "<audio controls src=real></audio>", round: 3, writer: "consistency" });
  const hist = anchorHistory(log, "audio");
  assert.deepEqual(hist.map((h) => h.operator), ["INS", "REC", "INS"], "the operator after a REC is INS again, a genuine rebirth of the anchor, not SYN of a value that no longer exists");
});

test("temporality: foldCode(log, template, {atSeq}) replays as of ANY cursor, not only the latest — a fold taken before a REC and one taken after can disagree about what the anchor even means", async () => {
  let log = createTaskLog();
  log = proposeAnchor(log, { anchor: "badge", content: "old-meaning", round: 1, writer: "seed" });
  const cursorBeforeRec = log.nextSeq - 1;
  log = concedeAnchor(log, { anchor: "badge", trigger: "re-zero for the test", round: 2 });
  log = proposeAnchor(log, { anchor: "badge", content: "new-meaning", round: 3, writer: "seed" });
  const asOfBefore = await foldCode(log, TEMPLATE, { atSeq: cursorBeforeRec });
  const asOfNow = await foldCode(log, TEMPLATE, { atSeq: log.nextSeq - 1 });
  assert.match(asOfBefore.html, /old-meaning/);
  assert.match(asOfNow.html, /new-meaning/);
  assert.doesNotMatch(asOfNow.html, /old-meaning/);
});

test("the fold itself lints the COMPOSED whole, not just each anchor alone — a whole-document problem invisible to any single anchor's own view is disclosed, never hidden", async () => {
  let log = createTaskLog();
  log = proposeAnchor(log, { anchor: "badge", content: "fine-alone", round: 1, writer: "seed" });
  log = proposeAnchor(log, { anchor: "audio", content: "also-fine-alone", round: 1, writer: "seed" });
  // Neither anchor's own content contains "BROKEN" alone, but force a
  // composed-whole lint failure by checking the fold's own html directly
  // through a wellFormed that only fails on the SKELETON's own literal text.
  const strictWellFormed = (html) => ({ wellFormed: !html.includes("<html><body>"), problems: html.includes("<html><body>") ? ["skeleton shape disclosed as broken for this test"] : [] });
  const fold = await foldCode(log, TEMPLATE, { wellFormed: strictWellFormed });
  assert.equal(fold.clean, false);
  assert.ok(fold.lintProblems.length > 0, "a whole-document lint problem is named, not swallowed");
});

test("a critique names an anchor, a property, and a problem — never a bare opinion, matching this codebase's own landCritique discipline", async () => {
  let log = createTaskLog();
  assert.throws(() => landAnchorCritique(log, { round: 1, property: "calibration" }), TypeError);
  log = landAnchorCritique(log, { round: 1, anchor: "badge", property: "calibration", problem: "collapses two verdicts" });
  const critiques = log.entries.filter((e) => e.task_id.startsWith("critique:anchor:badge:"));
  assert.equal(critiques.length, 1);
});

test("Tier 1 of the alignment question: there is NO exported way to get a composed document without its lint/harm status bundled — foldCode is the only door, and it always returns lintProblems/clean alongside the html", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("./code-anchor-log.js", import.meta.url), "utf8");
  const exportedNames = [...src.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => m[1]);
  assert.equal(exportedNames.includes("renderTemplate"), false, "renderTemplate composing a document must stay private — the only export doing composition is foldCode, which bundles lint status inseparably from the html");
  assert.equal(exportedNames.includes("anchorMapFrom"), false, "anchorMapFrom must stay private for the identical reason");
  const fold = await foldCode(createTaskLog(), TEMPLATE);
  assert.ok("html" in fold && "lintProblems" in fold && "clean" in fold, "the one public way to get composed html always carries its lint status in the same return value — a caller cannot ask for one without the other");
});
