#!/usr/bin/env node
// TheFold — load The Fold (the local browser surface on EOReader 7) with one
// command, the same as `eoreader7 -browser`. This is a thin alias: it runs
// the eoreader7 CLI's -browser launcher (cli/browser.mjs), which boots the
// er7 proxy and brings The Fold up on http://localhost:8811, then opens the
// browser.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const result = spawnSync(
  process.execPath,
  [path.join(HERE, "eoreader7.mjs"), "-browser", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);