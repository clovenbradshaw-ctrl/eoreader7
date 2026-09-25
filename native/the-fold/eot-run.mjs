// eot-run.mjs — an EOT ledger AS THE BUILD. A reader's append-only record is
// no longer just an account of a code loop; it IS the executable. An EOT file
// carries a base manifest plus patch ops (path + find/add bytes, the same raw
// bytes a model was asked for), and this executor replays them mechanically
// (patch.js's readOps/applyOps — op labels derived from the bytes, never taken
// from anyone) against the base to reproduce the program, then runs the real
// test command. Replaying the ledger is compiling it.
//
// usage:
//   node eot-run.mjs <ledger.jsonl> <workspace> <testCommand> [--base <dir>]
//   --base DIR  copy the base manifest into the workspace before replay
//   --keep      leave the replayed files on disk (default: restore first)
//
// Ledger schema (append-only, one JSON per line):
//   {"schema":"EOTBase@1","at":...,"files":{"app.js":"...","index.html":"..."}}
//   {"schema":"EOTCodeOp@1","at":...,"sessionId":...,"model":...,"round":1,
//    "path":"app.js","find":"...","add":"..."}     // add omitted => SEG

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { readOps, applyOps } from "./patch.js";

function fail(msg) { console.error("eot-run: " + msg); process.exit(1); }

const [ledgerFile, ws, testCommand, ...flags] = process.argv.slice(2);
const baseDir = flags[flags.indexOf("--base") + 1];
const keep = flags.includes("--keep");
if (!ledgerFile || !ws || !testCommand) {
  fail("usage: node eot-run.mjs <ledger.jsonl> <workspace> <testCommand> [--base <dir>] [--keep]");
}
if (!fs.existsSync(ws)) fs.mkdirSync(ws, { recursive: true });

const lines = fs.readFileSync(ledgerFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

// ── 1. THE BASE MANIFEST (the seed the ops replay on) ─────────────────────
const base = lines.find((e) => e.schema === "EOTBase@1");
if (!base) fail("no EOTBase@1 entry — a build must begin from a declared base");

const snapshot = {};
for (const rel of Object.keys(base.files)) {
  const abs = path.join(ws, rel);
  if (fs.existsSync(abs)) snapshot[rel] = fs.readFileSync(abs, "utf8");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, base.files[rel]);
}
if (baseDir) {
  for (const f of fs.readdirSync(baseDir)) fs.copyFileSync(path.join(baseDir, f), path.join(ws, f));
}

// ── 2. REPLAY THE OPS — the ledger is the build script ────────────────────
const ops = lines.filter((e) => e.schema === "EOTCodeOp@1");
let kept = 0, refused = 0;
for (let i = 0; i < ops.length; i++) {
  const e = ops[i];
  const abs = path.join(ws, e.path);
  if (!fs.existsSync(abs)) { refused += 1; console.error(`  [${i + 1}] ${e.path}: no such file — skipped`); continue; }
  const code = fs.readFileSync(abs, "utf8");
  const derived = readOps([{ find: e.find, add: e.add ?? "" }]);
  const applied = derived ? applyOps(code, derived) : { ok: false, gap: { kind: "malformed", reason: "find/add did not resolve to a real op" } };
  if (!applied.ok) {
    refused += 1;
    console.error(`  [${i + 1}] ${e.op ?? derived?.[0]?.op ?? "?"} ${e.path}: ${applied.gap?.reason ?? "no-op"}`);
    continue;
  }
  fs.writeFileSync(abs, applied.code);
  kept += 1;
  console.log(`  [${i + 1}] ${derived[0].op} ${e.path} (${e.round ?? "-"}) kept`);
}

// ── 3. THE ELENCHUS — the caller's own command decides pass/fail ──────────
let exit = 1, out = "";
try {
  out = execSync(testCommand, { cwd: ws, encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"] });
  exit = 0;
} catch (err) {
  out = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  exit = typeof err.status === "number" ? err.status : 1;
}

console.log(`\nreplay: ${ops.length} ops, ${kept} kept, ${refused} refused — test exited ${exit}`);
console.log(out.split("\n").filter((l) => l.trim()).slice(0, 12).join("\n"));

if (!keep) {
  for (const [rel, bytes] of Object.entries(snapshot)) fs.writeFileSync(path.join(ws, rel), bytes);
}
process.exit(exit === 0 ? 0 : 1);