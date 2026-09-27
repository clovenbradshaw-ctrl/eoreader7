// native/eval/coding-policy-learn.mjs — run one cycle of the coding-policy
// learner (organs/coding-policy-learner.js) against a real local mouth:
//
//   node native/eval/coding-policy-learn.mjs --model=qwen2.5-coder:1.5b --reps=3
//        [--sealed-reps=3] [--survey-reps=3] [--lever=k --dir=1] [--min-effect=1] [--language=python]
//
// Each (policy, rep) pass is one lang-competency-run.mjs invocation over the
// split's tasks, tagged with the trial id and policy version, so the ledger
// rows it appends are the trial's evidence. The policy pointer and the trial
// log are scoped to (model, language): a policy held for one mouth in one
// language says nothing about another (Greenberg / Ostrom). A stand-down file
// (state/coding-policy-standdown) abandons the battery between passes.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TASKS, specHash, readRows } from "../organs/lang-competency.js";
import { runCycle } from "../organs/coding-policy-learner.js";
import { policyVersion } from "../organs/coding-policy.js";
import { CODING_TRIAL_ACTIVE, HEIMDALL_TRIALS_FILE } from "../organs/coding-policy-trial.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "..", "..");
const LEDGER = path.join(ROOT, "state", "lang-competency.jsonl");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const model = arg("model", "qwen2.5-coder:1.5b");
const language = arg("language", "python");
const reps = Number(arg("reps", "3"));
const sealedReps = Number(arg("sealed-reps", String(reps)));
const minEffect = Number(arg("min-effect", "1"));
const surveyReps = Number(arg("survey-reps", String(reps)));
const lever = arg("lever", null);
const override = lever ? { lever, dir: Number(arg("dir", "1")) } : null;
const slug = `${model}-${language}`.replace(/[^a-zA-Z0-9.-]+/g, "_");
const files = {
  pointer: path.join(ROOT, "state", `coding-policy.${slug}.json`),
  log: path.join(ROOT, "state", `coding-policy-trials.${slug}.jsonl`),
  active: CODING_TRIAL_ACTIVE,
  heimdall: HEIMDALL_TRIALS_FILE,
};
const STANDDOWN = path.join(ROOT, "state", "coding-policy-standdown");

function runBattery({ policy, tasks, trial, repTag }) {
  const argv = [path.join(here, "lang-competency-run.mjs"), `--models=${model}`, `--languages=${language}`, `--arms=${policy.arm}`,
    `--tasks=${tasks.map((t) => t.id).join(",")}`, `--k=${policy.k}`, `--boktemp=${policy.temperature}`, `--rounds=${policy.rounds}`,
    `--rep=${repTag}`, `--trial-id=${trial.trialId}`, `--policy-version=${policyVersion(policy)}`];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argv, { stdio: ["ignore", "pipe", "pipe"] });
    let tail = "";
    child.stdout.on("data", (b) => { const s = String(b); tail = (tail + s).slice(-2000); for (const line of s.split("\n")) if (/heldOut=|draw failed/.test(line)) console.log(`  [${policyVersion(policy).slice(0, 6)} k=${policy.k} t=${policy.temperature}] ${line.trim()}`); });
    child.stderr.on("data", (b) => { tail = (tail + String(b)).slice(-2000); });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`lang-competency-run exited ${code}: ${tail.slice(-300)}`))));
  });
}

const tasks = TASKS.map((t) => ({ id: t.id, spec: specHash(t) }));
const started = Date.now();
const out = await runCycle({ tasks, readRows: () => readRows(LEDGER), runBattery, reps, sealedReps, surveyReps, minEffect, override, files, standDown: () => fs.existsSync(STANDDOWN) });

console.log(`\ncycle: ${out.outcome}${out.refusal ? ` (${out.refusal})` : ""} in ${Math.round((Date.now() - started) / 1000)}s`);
if (out.proposal) console.log(`proposal: ${out.proposal.ok ? `${out.proposal.lever} ${out.proposal.dir > 0 ? "up" : "down"} from ${out.proposal.signature}${out.proposal.count ? ` x${out.proposal.count}` : ""}` : out.proposal.refusal}`);
if (out.settled?.paired) {
  console.log(`validate: gain ${out.settled.gain.toFixed(2)} tasks, p=${out.settled.p.toFixed(4)} (alpha/look ${out.settled.alpha}), twin p=${out.settled.twin.p.toFixed(4)}`);
  for (const x of out.settled.paired) console.log(`  ${x.task.padEnd(26)} incumbent ${x.incumbent.toFixed(2)}  candidate ${x.candidate.toFixed(2)}`);
}
if (out.sealed) console.log(`sealed (reported, never decides): ${out.sealed.complete ? `gain ${out.sealed.gain.toFixed(2)}, p=${out.sealed.p.toFixed(4)}` : out.sealed.reason ?? "incomplete"}`);
console.log(`pointer: ${files.pointer}\nlog: ${files.log}`);
