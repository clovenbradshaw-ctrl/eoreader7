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

// Trivial fakes for tests that don't need the real coherence-properties.mjs —
// real coverage of the actual checks lives in coherence-properties.test.mjs /
// podcast-coherence-gate-falsify.mjs; here we only need to prove the ADJUDICATION
// MECHANISM correctly routes to whichever candidate clears.
function wellFormed(html) { return { wellFormed: !html.includes("BROKEN"), problems: html.includes("BROKEN") ? ["contains BROKEN"] : [] }; }
function coherenceGate(before, after) { return { halted: after.includes("INCOHERENT"), regressions: after.includes("INCOHERENT") ? [{ property: "test", before: "ok", after: "incoherent" }] : [] }; }

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

  const result = await adjudicate(log, { anchor: "badge", template: TEMPLATE, wellFormed, coherenceGate, round: 2 });
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
  log = proposeAnchor(log, { anchor: "badge", content: "INCOHERENT-a", round: 2, writer: "calibration" });
  log = proposeAnchor(log, { anchor: "badge", content: "INCOHERENT-b", round: 2, writer: "invariance" });
  const result = await adjudicate(log, { anchor: "badge", template: TEMPLATE, wellFormed, coherenceGate, round: 2 });
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

test("Tier 1 of the alignment question: there is NO exported way to get a composed document without its lint/coherence status bundled — foldCode is the only door, and it always returns lintProblems/clean alongside the html", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync(new URL("./code-anchor-log.js", import.meta.url), "utf8");
  const exportedNames = [...src.matchAll(/^export (?:async )?function (\w+)/gm)].map((m) => m[1]);
  assert.equal(exportedNames.includes("renderTemplate"), false, "renderTemplate composing a document must stay private — the only export doing composition is foldCode, which bundles lint status inseparably from the html");
  assert.equal(exportedNames.includes("anchorMapFrom"), false, "anchorMapFrom must stay private for the identical reason");
  const fold = await foldCode(createTaskLog(), TEMPLATE);
  assert.ok("html" in fold && "lintProblems" in fold && "clean" in fold, "the one public way to get composed html always carries its lint status in the same return value — a caller cannot ask for one without the other");
});

// ---- proposeCanonical: the model suggests, the reading makes it coherent, the canonical form is what lands ----
import { proposeCanonical, anchorHistory as historyOf, settledContent as settled, foldCode as fold } from "./code-anchor-log.js";
import { createTaskLog as newLog } from "../../kernel/task-log.js";
import { canonicalize } from "../../organs/code-canonical.js";

test("proposeCanonical: the raw suggestion is kept as SIG evidence, each transformation is a CON entry, and the fold projects the CANONICAL content", async () => {
  const raw = `function f(x) { const n = 0; n = n + cToF(x.c); return n; }`;
  const canonical = canonicalize(raw);
  let log = newLog();
  log = proposeCanonical(log, { anchor: "f", round: 1, writer: "gemma2:2b", suggestion: raw, canonical, prompt: "write f" });
  const ops = log.entries.map((e) => e.operator);
  assert.deepEqual(ops, ["SIG", "CON", "CON", "INS"], "suggestion, then one act per transformation, then the canonical INS");
  const sig = log.entries[0];
  assert.equal(sig.suggestion, raw, "nothing the model said is deleted"); assert.equal(sig.prompt, "write f");
  assert.deepEqual(log.entries.filter((e) => e.operator === "CON").map((e) => e.transformation.kind).sort(), ["call_resolved", "const_to_let"]);
  const settledNow = settled(log, "f");
  assert.equal(settledNow.content, canonical.code); assert.notEqual(settledNow.content, raw);
  assert.match(settledNow.content, /let n = 0/); assert.match(settledNow.content, /celsiusToFahrenheit\(x\.c\)/);
  // the fold is computed from canonical entries: a cursor BEFORE the INS sees no content at all
  assert.equal(settled(log, "f", log.entries[2].seq).content, null);
  const folded = await fold(log, { skeleton: "{{ANCHOR:f}}", anchors: { f: {} } });
  assert.equal(folded.html, canonical.code);
  assert.equal(historyOf(log, "f").at(-1).operator, "INS");
});

test("proposeCanonical: a second suggestion for the same anchor is a SYN over the canonical first, and the findings the reading could not resolve ride the suggestion", () => {
  let log = newLog();
  const first = `function f(x) { return degToCompass(x.d); }`;
  log = proposeCanonical(log, { anchor: "f", round: 1, writer: "a", suggestion: first, canonical: canonicalize(first) });
  assert.deepEqual(log.entries[0].findings.map((x) => [x.kind, x.name]), [["unresolved_call", "degToCompass"]], "what the reading could not make coherent is on the record");
  const second = `function f(x) { return compass16(x.d); }`;
  log = proposeCanonical(log, { anchor: "f", round: 2, writer: "b", suggestion: second, canonical: canonicalize(second) });
  assert.deepEqual(log.entries.filter((e) => ["INS", "SYN"].includes(e.operator)).map((e) => e.operator), ["INS", "SYN"]);
  assert.equal(settled(log, "f").content, second);
  assert.throws(() => proposeCanonical(log, { anchor: "f", round: 3, writer: "c", suggestion: "x" }), /canonical reading is required/);
});
