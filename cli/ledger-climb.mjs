#!/usr/bin/env node
// cli/ledger-climb.mjs — run the ledger up the grain axis, mechanically.
//
// The Interpretation domain's Pattern-grain (Paradigm) is where cli/reason.
// mjs's own pipeline stopped: it lints one run's claims for coherence
// (Figure grain) and, narrowly, tests a declared functional/acyclic property
// against a synthetic counterexample (Pattern grain, but scoped to that one
// run's own claim set, never the accumulated ledger). Nothing in cli/ ever
// composed the ACCUMULATED ledger into a Kind, a Network, or a cross-session
// Paradigm standing — confirmed by grep before this file existed (see
// native/eval/the-fold/ledger-kind-induction.mjs's own header).
//
// This is a NEW, standalone entry point rather than an edit to reason.mjs,
// reasoning-ledger.mjs, or claude-code-context.mjs — all three were already
// modified/untracked from concurrent work on this shared checkout when this
// file was written (2026-09-23), and editing a file mid-flight elsewhere is
// exactly the hazard this repo's own convention (check `git status`/`git
// diff --cached` before touching a shared file) warns against. This file
// only READS documents/eoreader7-reasoning:1.jsonl and calls the two real,
// already-falsified eval scripts; it writes nothing to the ledger itself.
//
// Every step here is mechanical: no model call, no LLM judgment, anywhere in
// this file or in either script it runs. Structure is computed; nothing is
// asked of a mouth.
//
//   node cli/ledger-climb.mjs [kind|paradigm|all] [--json] [-- <script args>]
//
// `kind`     runs native/eval/the-fold/ledger-kind-induction.mjs
// `paradigm` runs native/eval/the-fold/ledger-paradigm-testimony.mjs
// `all` (default) runs both, in that order, and reports both verdicts.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KIND_SCRIPT = path.join(HERE, "..", "native", "eval", "the-fold", "ledger-kind-induction.mjs");
const PARADIGM_SCRIPT = path.join(HERE, "..", "native", "eval", "the-fold", "ledger-paradigm-testimony.mjs");

const argv = process.argv.slice(2);
const passThroughIdx = argv.indexOf("--");
const passThrough = passThroughIdx >= 0 ? argv.slice(passThroughIdx + 1) : [];
const own = passThroughIdx >= 0 ? argv.slice(0, passThroughIdx) : argv;
const step = own.find((a) => !a.startsWith("--")) ?? "all";
const asJson = own.includes("--json");

function runScript(scriptPath, label) {
  const scriptArgs = asJson ? [...passThrough, "--json"] : passThrough;
  const res = spawnSync(process.execPath, [scriptPath, ...scriptArgs], { encoding: "utf8" });
  if (res.error) return { label, ok: false, error: res.error.message, stdout: "", stderr: "" };
  return { label, ok: res.status === 0, exitCode: res.status, stdout: res.stdout, stderr: res.stderr };
}

const results = [];
if (step === "kind" || step === "all") results.push(runScript(KIND_SCRIPT, "kind-grain (SIG·Pattern, Existence×Pattern — sibling terrain)"));
if (step === "paradigm" || step === "all") results.push(runScript(PARADIGM_SCRIPT, "paradigm-grain (EVA·Pattern, Interpretation×Pattern)"));

if (!results.length) {
  console.error(`unknown step "${step}" — expected kind, paradigm, or all`);
  process.exit(2);
}

if (asJson) {
  console.log(JSON.stringify(results.map((r) => ({ label: r.label, ok: r.ok, ...(r.ok ? JSON.parse(r.stdout) : { error: r.error ?? r.stderr }) })), null, 1));
} else {
  for (const r of results) {
    console.log(`\n=== ${r.label} ===`);
    if (r.ok) console.log(r.stdout.trim());
    else console.error(`FAILED (exit ${r.exitCode}): ${r.error ?? r.stderr}`);
  }
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
