// frontier-25.mjs — twenty-five "frontier" tasks, two arms (lib/frontier-25.mjs).
//
//   node frontier-25.mjs                       zero-call arm + media door (no model)
//   MODEL=gemma2:2b node frontier-25.mjs       + the mouth arm through holon.js's real turn
//   MODELS=gemma2:2b,qwen2.5-coder:1.5b …      several mouths, one table
//
// The zero-call arm is read by tests/frontier-25.test.js on every suite run;
// the mouth arm is a dated record written to results/frontier-25-model-arm.json
// and transcribed in results/frontier-25-RESULTS.md. serve.mjs is booted as
// a child (an ephemeral port, a throwaway record dir — serve-run.test.mjs's
// own way) so the python tasks run through the sanctioned, recorded /api/run.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TASKS, MEDIA_TASKS, FOLD, NATIVE, runFrontier25, runMediaTasks, witness, assay } from "./lib/frontier-25.mjs";

const OLLAMA = process.env.OLLAMA ?? "http://127.0.0.1:11434";
const MODELS = (process.env.MODELS ?? process.env.MODEL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const RETRIES = Number(process.env.RETRIES ?? 1);

export async function bootServer() {
  const recordRoot = mkdtempSync(join(tmpdir(), "fold-frontier-"));
  const proc = spawn("node", [join(FOLD, "serve.mjs"), "0"], { cwd: FOLD, env: { ...process.env, THE_FOLD_RECORD_DIR: join(recordRoot, "record") }, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  proc.stderr.on("data", (b) => (stderr += b.toString()));
  const port = await new Promise((resolve, reject) => {
    let out = "";
    const onData = (b) => { out += b.toString(); const m = out.match(/localhost:(\d+)/); if (m) { proc.stdout.off("data", onData); resolve(Number(m[1])); } };
    proc.stdout.on("data", onData);
    proc.on("error", reject);
    proc.on("exit", (code) => reject(new Error(`serve.mjs exited ${code} before listening: ${stderr}`)));
    setTimeout(() => reject(new Error("serve.mjs did not listen within 20 s")), 20_000);
  });
  const base = `http://127.0.0.1:${port}`;
  const runPython = async (code) => {
    const res = await fetch(`${base}/api/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: "python", code }) });
    const body = await res.json();
    if (!res.ok) return { code: null, stdout: "", stderr: body.error ?? res.statusText, timedOut: false };
    return body;
  };
  return { base, runPython, recordPath: join(recordRoot, "record", "build-record.jsonl"), stop: () => { proc.kill("SIGKILL"); rmSync(recordRoot, { recursive: true, force: true }); } };
}

const pad = (s, n) => String(s ?? "").padEnd(n).slice(0, n);

async function main() {
  let server = null;
  try { server = await bootServer(); } catch (e) { console.log(`serve.mjs not booted (${e.message.split("\n")[0]}) — python tasks will read did_not_run`); }
  const runPython = server?.runPython ?? null;

  console.log("── FRONTIER-25 · zero-call arm: what an organ claims, and whether each witness can fail ──\n");
  const zero = await runFrontier25({ runPython });
  for (const r of zero.rows) {
    const m = r.mechanical;
    const c = r.control;
    const line = m ? `${m.ok ? "CLAIMED" : "MISSED "} ${m.detail}` : c ? (c.skipped ? `SKIPPED ${c.skipped}` : `${c.ok ? "WITNESS" : "BROKEN "} ref ${c.refPassed ? "passes" : "FAILS"} · wrong ${c.wrongFailed ? "fails" : "PASSES"} · ${c.wrong.detail.slice(0, 90)}`) : "—";
    console.log(`${pad(r.id, 3)} ${pad(r.category, 9)} ${pad(r.claim, 11)} ${line}`);
  }
  console.log(`\n${zero.numbers.claimedOk}/${zero.numbers.claimed} claimed outright; ${zero.numbers.controlsOk}/${zero.numbers.witnessed} witnesses proven able to fail${zero.numbers.controlsSkipped ? ` (${zero.numbers.controlsSkipped} skipped: no runner)` : ""}`);

  console.log("\n── the measuring door over decoded media (0 calls) ──\n");
  let media = null;
  try {
    media = await runMediaTasks();
    for (const r of media.rows) console.log(`${pad(r.id, 3)} ${pad(r.medium, 6)} ${r.ok ? "HELD  " : "BREACH"} ${r.prompt}\n    → ${r.text.split("\n")[0].slice(0, 150)}${r.address ? `\n    address ${JSON.stringify(r.address)}` : ""}`);
    console.log(`\n${media.numbers.ok}/${media.numbers.tasks} media declarations answered as expected`);
  } catch (e) {
    console.log(`media arm did not run: ${e.message}`);
  }

  const byModel = {};
  if (MODELS.length) {
    const { runHolonicTask } = await import(`${FOLD}holon.js`);
    const { chunkSource } = await import(`${NATIVE}organs/source.js`);
    const { m: A } = await assay();
    const passages = Object.entries(A.CORPUS).flatMap(([name, text]) => chunkSource(name, text));
    for (const model of MODELS) {
      let calls = 0;
      const call = async (messages, opts = {}) => {
        calls += 1;
        const body = { model, stream: false, options: { temperature: 0, num_predict: opts.maxTokens ?? 400 }, messages };
        if (opts.json) body.format = opts.json;
        const res = await fetch(`${OLLAMA}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(`ollama ${res.status}`);
        return (await res.json())?.message?.content ?? "";
      };
      console.log(`\n── the mouth arm · ${model} · the real turn (holon.js), the witness judging, ${RETRIES} retry with the result fed back ──\n`);
      const rows = [];
      for (const task of TASKS) {
        const t0 = Date.now();
        const c0 = calls;
        const chunks = task.claim === "assay" || task.claim === "void" ? passages : [];
        let prompt = task.prompt;
        let attempt = 0;
        let w = null;
        let answer = "";
        const attempts = [];
        while (attempt <= RETRIES) {
          let r;
          try {
            r = await runHolonicTask({ task: prompt, chunks, call, foldedRefs: [], makeNameResolver: null, makeRelationReader: null, checkLink: null, planMode: false, chatHistory: [], discourse: "" });
            answer = String(r.output ?? "");
          } catch (e) {
            answer = "";
            attempts.push({ attempt, error: e.message });
            break;
          }
          w = await witness(task, answer, { runPython });
          attempts.push({ attempt, verdict: w.verdict, detail: w.detail, answer: answer.slice(0, 600) });
          if (w.ok) break;
          attempt += 1;
          prompt = `${task.prompt}\n\nYour previous answer was checked mechanically: ${w.detail}. Answer again.`;
        }
        const row = { id: task.id, category: task.category, claim: task.claim, verdict: w?.verdict ?? "error", ok: Boolean(w?.ok), detail: w?.detail ?? "", organ: w?.organ ?? null, attempts, calls: calls - c0, ms: Date.now() - t0 };
        rows.push(row);
        console.log(`${pad(task.id, 3)} ${pad(task.category, 9)} ${pad(task.claim, 11)} ${pad(row.verdict, 11)} ${row.calls} call(s) ${Math.round(row.ms / 1000)}s · ${row.detail.slice(0, 110)}`);
      }
      const ok = rows.filter((r) => r.ok).length;
      const firstTry = rows.filter((r) => r.attempts[0]?.verdict === "passed").length;
      console.log(`\n[${model}] ${ok}/${rows.length} passed the witness (${firstTry} on the first draft, ${ok - firstTry} after the result was fed back) · ${calls} model call(s)`);
      byModel[model] = { rows, calls, ok, firstTry };
    }
    writeFileSync(new URL("./results/frontier-25-model-arm.json", import.meta.url), JSON.stringify({ ran: new Date().toISOString().slice(0, 10), retries: RETRIES, models: byModel, note: "one run, dated; the zero-call arm is the enforcement (tests/frontier-25.test.js)" }, null, 2));
    console.log("\nmodel arm written: results/frontier-25-model-arm.json");
  }
  if (server) {
    try { const n = readFileSync(server.recordPath, "utf8").split("\n").filter(Boolean).length; console.log(`\nbuild record: ${n} row(s) landed on ${server.recordPath.replace(/^.*fold-frontier-[^/]+/, "<tmp>")} (build-run / build-run-result, per P16)`); } catch { /* no python ran */ }
    server.stop();
  }
  const breached = (zero.rows.filter((r) => (r.mechanical && !r.mechanical.ok) || (r.control && !r.control.ok && !r.control.skipped))).length + (media ? media.rows.filter((r) => !r.ok).length : 0);
  if (breached) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
