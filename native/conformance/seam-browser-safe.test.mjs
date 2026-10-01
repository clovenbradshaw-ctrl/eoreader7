// conformance/seam-browser-safe.test.mjs — the organs seam is the BROWSER PAGE's own import, so loading it must reach no node built-in.
//
// THE DEFECT CLASS, RECORDED THREE TIMES BEFORE THIS TEST. organs/index.js says in its own comments why look.js (2026-09-12), the what and
// anchors organs (2026-09-16) and kleene-up (2026-09-21) are not re-exported: each imports node:* at module load, so a static re-export "dragged
// node built-ins into every page import and killed the whole module graph" (found by driving the real page, then the real GitHub Pages build).
// The fix each time was a comment and a deleted line. Nothing read it. With the 2026-09-28 move down from the-fold, and the merge from main
// after it, solon.js, hard-read.js and ingest.js came back the same way — fifteen node: specifiers, three organs — and the-fold's page could not
// link in any browser; no node test notices, because a node test can import node:fs. A comment nobody's test reads is a report, not an
// enforcement (the rule of eo-constitution III.5, which says it of a typed gap).
//
// WHAT IS ASKED. Not "does the source contain the string node:" — that is a regex over formatting. The seam is imported in a CHILD process
// (lib/seam-reach.mjs) under a resolution hook (lib/seam-load-hooks.mjs) that records every built-in and every bare package the real resolver is
// asked for while the graph loads. An import that sits in a function and runs only when called is not recorded (a browser never runs it); one
// that runs at load is. The same helper serves the-fold's page-native-browser-safe.test.mjs, which asks it of every native module the page enters.
//
// THE CONTROLS ARE BUILT TO FAIL. A harness that reports "nothing" for every module proves nothing, so the same harness is run on a planted
// module that reaches node:fs through a relative child (it must be seen, with its parent), and on one that reaches node:fs only inside an
// uncalled function (it must not be).
//
// MOVED, NOT REMOVED. The three organs stay importable by path in node — the fix is where the page looks, not what the repo can do.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { reached, describeOffenders } from "./lib/seam-reach.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEAM = pathToFileURL(path.join(HERE, "..", "organs", "index.js")).href;

const plant = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seam-plant-"));
  for (const [name, src] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), src);
  return dir;
};

test("CONTROL BUILT TO FAIL — a node built-in reached through a relative child is seen, with the file that asked for it", () => {
  const dir = plant({
    "entry.mjs": `import { x } from "./child.mjs"; export const y = x;`,
    "child.mjs": `import fs from "node:fs"; export const x = typeof fs.readFileSync;`,
  });
  const r = reached(pathToFileURL(path.join(dir, "entry.mjs")).href);
  assert.deepEqual(r.failures, [], r.stderr);
  assert.ok(r.offenders.some((o) => o.specifier === "node:fs" && o.parent.endsWith("child.mjs")), `the planted node:fs was not seen: ${JSON.stringify(r.offenders)}`);
});

test("CONTROL — a node built-in imported only inside an uncalled function is not a load-time import, and is not reported", () => {
  const dir = plant({
    "entry.mjs": `export async function readIt() { const fs = await import("node:fs"); return fs.readFileSync; } export const ok = true;`,
  });
  const r = reached(pathToFileURL(path.join(dir, "entry.mjs")).href);
  assert.deepEqual(r.failures, [], r.stderr);
  assert.deepEqual(r.offenders, []);
});

test("CONTROL — a node-gated import (`typeof process` closes in a browser) is not reported, because the harness takes `process` away as a browser does", () => {
  const dir = plant({
    "entry.mjs": `const isNode = typeof process !== "undefined" && !!process.versions?.node;\nexport const ground = isNode ? (await import("node:fs")).readFileSync : null;`,
  });
  const r = reached(pathToFileURL(path.join(dir, "entry.mjs")).href);
  assert.deepEqual(r.failures, [], r.stderr);
  assert.deepEqual(r.offenders, []);
});

test("CONTROL — a browser global that node loads lazily (`fetch`) may be read at load: it is not a failure of the harness or of the module", () => {
  const dir = plant({ "entry.mjs": `export const kind = typeof fetch;\nexport const hasHeaders = typeof Headers;` });
  const r = reached(pathToFileURL(path.join(dir, "entry.mjs")).href);
  assert.deepEqual(r.failures, [], r.stderr);
  assert.deepEqual(r.offenders, []);
});

test("CONTROL — several entries are read in one child: the clean one loads, the bad one is named with its parent, and a missing one is a failure, not silence", () => {
  const dir = plant({
    "clean.mjs": `export const a = 1;`,
    "bad.mjs": `import { x } from "./bad-child.mjs"; export const b = x;`,
    "bad-child.mjs": `import os from "node:os"; export const x = typeof os.cpus;`,
  });
  const here = (n) => pathToFileURL(path.join(dir, n)).href;
  const r = reached([here("clean.mjs"), here("bad.mjs"), here("absent.mjs")]);
  assert.deepEqual(r.offenders.map((o) => `${o.specifier} <- ${path.basename(o.parent)}`), ["node:os <- bad-child.mjs"]);
  assert.equal(r.failures.length, 1);
  assert.equal(r.failures[0].entry, here("absent.mjs"));
});

test("CONTROL BUILT TO FAIL — a module that reads `process` unguarded at load does not survive the harness, as it would not survive the page", () => {
  const dir = plant({ "entry.mjs": `export const home = process.env.HOME;` });
  const r = reached(pathToFileURL(path.join(dir, "entry.mjs")).href);
  assert.equal(r.failures.length, 1);
  assert.match(r.failures[0].error, /ReferenceError: process is not defined/);
});

test("the organs seam loads reaching no node built-in and no bare package — it is what the browser page imports", () => {
  const r = reached(SEAM);
  // The offenders come first: they are what the resolver was asked for while the graph LINKED, so they are named even when the load then crashes
  // on a node-only line (an unguarded `process` read, say) — the crash is a symptom of them, never the news.
  const lines = describeOffenders(r.offenders);
  assert.deepEqual(lines, [],
    `organs/index.js reaches node-only code at load, so the page cannot import it in a browser:\n  ${lines.join("\n  ")}\n` +
    "Do not re-export the organ from the seam: import it by path from the server-side caller (see the comments on look.js, solon.js, hard-read.js and ingest.js in organs/index.js).");
  assert.deepEqual(r.failures, [], "the seam must load without `process` too (a browser has none)");
});

test("the organs kept out of the seam are moved, not removed — each still loads by path in node and keeps its API", async () => {
  const solon = await import("../organs/solon.js");
  const hardRead = await import("../organs/hard-read.js");
  const ingest = await import("../organs/ingest.js");
  assert.equal(typeof solon.createKeeper, "function");
  assert.equal(typeof solon.runSuite, "function");
  assert.equal(typeof hardRead.hardReadSource, "function");
  assert.equal(typeof hardRead.learnRules, "function");
  assert.equal(typeof ingest.ingest, "function");
  assert.equal(typeof ingest.readZip, "function");
});

test("and the seam does not hand them back out under any name", async () => {
  const seam = await import("../organs/index.js");
  for (const name of ["createKeeper", "startServer", "runSuite", "hardReadSource", "learnRules", "ingest", "readZip", "solon", "hardRead"]) {
    assert.equal(name in seam, false, `${name} is back on the seam`);
  }
});
