// citation-falsify.test.js — the stale-citation fix, PROVEN BY ATTACK.
// The task: make the measured bug happen again. Measured 2026-09-17:
// "write a haiku about debugging code" surfaced and cited a Wikisource
// gun-legislation page admitted turns earlier — six near-identical title
// variants, `&#160;` intact, in the poem's Sources appendix.
//
// The harness rebuilds the sweep EXACTLY as proxy-runner.mjs now composes
// it (pool → membership → relevance → snips), and then tries to defeat
// every gate: stale-but-on-topic pages, an empty used-set, ignored pages
// that live only in webSources, entity-encoded headings, and a mid-message
// appendix. The CONTROL first proves the harness reproduces the bug when
// the gates are absent — the attack must fail against the real pipeline.
import test from "node:test";
import assert from "node:assert/strict";
import { salientDocsForTask } from "../../proxy-runner.mjs";
import { relevantSources, snipsFromSources, cleanSpan } from "../the-fold/document-ledger.js";
import { stripCitationAppendix } from "../../cli/tui.mjs";

// The REAL measured bytes (from the poem's own appendix).
const GUN_TEXT = [
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns ( 2013 ) by&#160; Steven J.",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns .",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns 2013 Steven J.",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns (January 16, 2013) Rep.",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns HON.",
  "Israel to Introduce Legislation to Prohibit 3-D Printed High-Capacity Magazines Along with Plastic Guns.",
].join(" ");
const DEBUG_TEXT = "Debugging code demands patience: reproduce the bug, bisect the change, read the stack trace. A haiku about debugging honors the struggle of finding the fault. The crack in the code is a reflection of the human condition. Write a haiku about debugging code and its quiet craft.";
const HAIKU_TASK = "write a haiku about debugging code";

// The sweep, byte-for-byte the sequence the runner now performs:
//   pool → MEMBERSHIP (turn-used only) → RELEVANCE → snips.
function sweep({ webSources, corpusDocs, turnUsed, task }) {
  const citationSources = new Map();
  for (const [u, t] of webSources) if (t) citationSources.set(u, t);
  for (const [sid, doc] of corpusDocs) {
    if (String(sid).startsWith("chat:")) continue;
    if (citationSources.has(sid)) continue;
    if (doc?.text && String(doc.text).trim().length > 40) citationSources.set(sid, String(doc.text));
  }
  for (const k of [...citationSources.keys()]) if (!turnUsed.has(k)) citationSources.delete(k);
  const gated = relevantSources(citationSources, task);
  return { sources: gated.kept, snips: snipsFromSources(gated.kept) };
}

// CONTROL — the pipeline WITHOUT the gates leaks exactly as measured. The
// original snipsFromSources had NO dedup and NO entity decoding — rebuilt
// verbatim from the pre-fix diff so the harness can prove the failure mode
// is real before attacking the fixed pipeline.
const oldSnipsFromSources = (map, { maxSnips = 6, maxChars = 240 } = {}) => {
  const out = [];
  for (const [url, text] of map) {
    if (out.length >= maxSnips) break;
    if (!text) continue;
    const sentences = String(text).replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter((s) => s.length > 40 && s.length <= maxChars);
    for (const s of sentences) {
      if (out.length >= maxSnips) break;
      out.push({ url, snip: s });
    }
  }
  return out;
};

test("CONTROL: the un-gated pipeline reproduces the measured leak", () => {
  const raw = oldSnipsFromSources(new Map([["wikisource:tui-1-62188-c935458b:prohibit", GUN_TEXT]]));
  assert.equal(raw.length, 6, "the measured 6-variant dump");
  assert.ok(raw.some((s) => s.snip.includes("&#")), "control carries raw entities");
  assert.ok(raw.every((s) => s.snip.includes("Plastic Guns")), "control is all gun");
});

// ATTACK 1 — the measured scenario, through the real gates. The stale gun
// page is in the pool (webSources AND corpus, exactly as the old intake
// left it); the turn surfaced only the debugging page.
test("ATTACK 1: the measured scenario does not leak through the real gates", () => {
  const surf = salientDocsForTask(new Map([
    ["wikisource:tui-1-62188-c935458b:prohibit", { text: GUN_TEXT }],
    ["web:1:https://debug.example", { text: DEBUG_TEXT }],
  ]), HAIKU_TASK);
  assert.deepEqual(surf.map((s) => s.sourceId), ["web:1:https://debug.example"], "surf surfaces only the salient doc");
  const turnUsed = new Set(surf.map((s) => s.sourceId));
  const { sources, snips } = sweep({
    webSources: [["https://en.wikisource.org/wiki/Israel", GUN_TEXT]],
    corpusDocs: [["wikisource:tui-1-62188-c935458b:prohibit", { text: GUN_TEXT }], ["web:1:https://debug.example", { text: DEBUG_TEXT }]],
    turnUsed,
    task: HAIKU_TASK,
  });
  assert.ok(sources.size === 1 && sources.has("web:1:https://debug.example"), "only the used source survives membership+relevance");
  for (const s of snips) {
    assert.ok(!s.snip.includes("Plastic"), "no gun text reaches a snip");
    assert.ok(!s.snip.includes("&#"), "no raw entities reach a snip");
  }
  assert.ok(snips.length > 0, "the genuinely used source is still cited");
});

// ATTACK 2 — a stale-but-on-topic page: shares the task's words (passes
// relevance) but was NOT used this turn. Membership alone must stop it.
test("ATTACK 2: a stale page sharing the task's vocabulary is still inadmissible", () => {
  const staleOnTopic = "Debugging the legal code: a code of debugging, code as code. A haiku about debugging code and code. Code debugging haiku code code code.";
  const { sources, snips } = sweep({
    webSources: [],
    corpusDocs: [["wikisource:s1:stale-code", { text: staleOnTopic }], ["web:1:https://debug.example", { text: DEBUG_TEXT }]],
    turnUsed: new Set(["web:1:https://debug.example"]),
    task: HAIKU_TASK,
  });
  assert.ok(sources.has("web:1:https://debug.example"));
  assert.ok(!sources.has("wikisource:s1:stale-code"), "relevance alone would keep it — membership is what drops it");
  for (const s of snips) assert.ok(!s.snip.includes("legal"));
});

// ATTACK 3 — the EMPTY used-set: a turn that used nothing must cite
// nothing, not skip the gate and cite the whole pool.
test("ATTACK 3: a turn that used nothing cites nothing", () => {
  const { sources, snips } = sweep({
    webSources: [["https://en.wikisource.org/wiki/Israel", GUN_TEXT]],
    corpusDocs: [["chat:s1:turn-1:response", { text: "hello" }]],
    turnUsed: new Set(),
    task: HAIKU_TASK,
  });
  assert.equal(sources.size, 0, "empty used-set drops the whole pool");
  assert.equal(snips.length, 0);
});

// ATTACK 4 — an ignored web page (RESOLUTION_NONE → shadow/webSources only,
// never corpus, never surfaced). It must be unciteable.
test("ATTACK 4: a retained-but-ignored page is unciteable", () => {
  const { sources, snips } = sweep({
    webSources: [["https://stale.example/ignored", GUN_TEXT]],
    corpusDocs: [["chat:s1:turn-1:response", { text: "hello" }]],
    turnUsed: new Set(["web:1:https://debug.example"]), // this turn used a DIFFERENT page
    task: HAIKU_TASK,
  });
  assert.equal(sources.size, 0);
  assert.equal(snips.length, 0);
});

// ATTACK 5 — the TUI tripwire under adversarial headings.
test("ATTACK 5: the tripwire drops every appendix shape, keeps real prose", () => {
  const poem = "Cracks in the quiet code.\nA stack trace like a river.\nFix, and it flows again.";
  // The producer's own shapes (## / ###) and tougher ones (#, lowercase).
  for (const head of ["## Sources (verbatim)", "### Sources (verbatim)", "# Sources (verbatim)", "## sources (verbatim)", "### Footnotes (APA)"]) {
    const out = stripCitationAppendix(`${poem}\n\n${head}\n\n- "junk" — url\n- "junk 2" — url2`);
    assert.ok(!out.includes("junk"), `appendix under "${head}" must be gone`);
    assert.ok(out.includes("Cracks"), "the poem survives");
  }
  // Mid-message appendix: everything until the next heading is dropped.
  const mid = `${poem}\n\n## Sources (verbatim)\n\n- "junk" — url\n\n## Next Steps\n\nKeep debugging.`;
  const out = stripCitationAppendix(mid);
  assert.ok(!out.includes("junk"));
  assert.ok(out.includes("## Next Steps") && out.includes("Keep debugging"), "the real section after the appendix survives");
  // Clean prose is untouched.
  assert.equal(stripCitationAppendix(poem), poem);
});

// ATTACK 6 — hygiene: near-duplicate variants collapse, entities decode,
// even when the used page IS the gun page (the honest case: the artifact
// is genuinely about the legislation).
test("ATTACK 6: even a legitimate gun-page cite is hygienic", () => {
  const legitTask = "summarize the Israeli legislation to prohibit 3-D printed high-capacity magazines along with plastic guns";
  const { sources, snips } = sweep({
    webSources: [],
    corpusDocs: [["wikisource:tui-1-62188-c935458b:prohibit", { text: GUN_TEXT }]],
    turnUsed: new Set(["wikisource:tui-1-62188-c935458b:prohibit"]),
    task: legitTask,
  });
  assert.equal(sources.size, 1, "the on-topic used page is kept");
  assert.ok(snips.length < 6, "one page's title variants collapse");
  for (const s of snips) assert.ok(!s.snip.includes("&#"), "entities decoded");
  assert.ok(snips.every((s) => cleanSpan(s.snip) === s.snip), "snips are already clean");
});