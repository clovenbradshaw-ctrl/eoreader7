#!/usr/bin/env node
// podcast-anchor-log-refold.mjs — re-project the anchor log's CURRENT
// settled state into the final document, reusing the exact TEMPLATE/
// wellFormed the drive script built (never a second, drifting copy).
import fs from "node:fs/promises";
import { readAnchorLog, foldCode } from "../adapters/build/code-anchor-log.js";
import { coherenceGate } from "../adapters/build/coherence-properties.mjs";
import { TEMPLATE, wellFormed } from "./podcast-anchor-log-drive.mjs";

const LEDGER_FILE = new URL("../the-fold/surface/podcast-anchor-log.jsonl", import.meta.url).pathname;
const OUT_FILE = new URL("../the-fold/surface/podcast-app-from-anchors.html", import.meta.url).pathname;

async function main() {
  const log = readAnchorLog(LEDGER_FILE);
  const fold = await foldCode(log, TEMPLATE, { wellFormed, coherenceGate });
  console.log("clean:", fold.clean, "unsettled:", fold.unsettled, "lintProblems:", fold.lintProblems);
  await fs.writeFile(OUT_FILE, fold.html);
  console.log("written to", OUT_FILE);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
