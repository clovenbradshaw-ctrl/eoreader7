#!/usr/bin/env node
// podcast-anchor-log-revise-style.mjs — a real SYN through the real
// system: the "style" anchor's first proposal handled layout/overflow
// correctly but never carried the dark-theme background/text-color ask
// bundled into the same prompt (a genuine, disclosed finding — one
// isolated call asked for two things and only fully delivered one). This
// is the anchor-log's own REVISION path, not a redo: a second, narrower,
// isolated model call gets ONLY the dark-theme ask (no layout, no other
// anchor), and its output is mechanically merged into the CURRENT settled
// "style" content's existing `body { ... }` rule — a structural merge
// (finding and replacing one named rule), never a rewrite of the whole
// anchor, and disclosed exactly as that in the landed entry's own
// description.
import fs from "node:fs/promises";
import { readAnchorLog, appendAnchorLog, proposeAnchor, settledContent } from "../adapters/build/code-anchor-log.js";

const LEDGER_FILE = new URL("../the-fold/surface/podcast-anchor-log.jsonl", import.meta.url).pathname;

async function main() {
  let log = readAnchorLog(LEDGER_FILE);
  const from = log.nextSeq;

  const current = settledContent(log, "style").content;
  const newBodyRule = (await fs.readFile("/tmp/claude-0/-home-user/5004112f-59c6-522d-9b30-a83c787ae1ff/scratchpad/dark-body.txt", "utf8"));
  const extracted = /```(?:css)?\n([\s\S]*?)```/i.exec(newBodyRule)?.[1]?.trim() ?? newBodyRule.trim();
  const newDecls = [...extracted.matchAll(/^\s*([a-z-]+)\s*:\s*([^;]+);/gim)].map((m) => `  ${m[1]}: ${m[2].trim()};`);

  // Structural merge: find the EXISTING `body { ... }` rule in the
  // current settled style content and add the two new declarations to it,
  // rather than replacing the whole rule (its margin/overflow-x/
  // box-sizing declarations from the first round must survive).
  const bodyRuleRe = /body\s*\{([^}]*)\}/;
  const m = bodyRuleRe.exec(current);
  if (!m) throw new Error("no existing body rule found to merge into — the anchor's content shape changed unexpectedly");
  const mergedBody = `body {${m[1]}${newDecls.map((d) => `\n${d}`).join("")}\n}`;
  const mergedContent = current.replace(bodyRuleRe, mergedBody);

  console.log("merged body rule:\n", mergedBody);

  const round = 2;
  log = proposeAnchor(log, {
    anchor: "style", content: mergedContent, round, writer: "gemma2:2b+mechanical-merge",
    writerAudit: {
      request: "isolated ask: add background-color:#121212 and color:#ffffff to the body rule only",
      rawResponse: newBodyRule,
      durationMs: null, model: "gemma2:2b",
    },
  });
  appendAnchorLog(LEDGER_FILE, log, from);
  console.log("landed SYN revision for anchor 'style', round", round);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
