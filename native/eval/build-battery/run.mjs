// native/eval/build-battery/run.mjs — run every request in requests.json
// through eoreader7's own turn (runProxyTurn, the one the proxy and TUI share),
// answer the engine's ask-back with the request's supplied answers, find out
// what came back (a page, a program, or nothing), and score it with
// organs/build-check.js against checks written from the request's own words.
//
//   ER7_OLLAMA_URL=http://127.0.0.1:11434 node native/eval/build-battery/run.mjs \
//        [--model=qwen2.5-coder:1.5b] [--only=id,id] [--label=null-2026-09-27]
//
// Writes state/build-battery/<label>/<id>.json (the full trace + artifact +
// verdict) and state/build-battery/<label>/summary.json. No engine code is
// changed and nothing here is a regular expression: fences are cut by
// position, the artifact's kind is decided by Python's own parsers.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkBuild, factsOf } from "../../organs/build-check.js";
import { unfence, inspect } from "./inspect.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");
process.env.ER7_OLLAMA_URL ??= "http://127.0.0.1:11434";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const model = arg("model", "qwen2.5-coder:1.5b");
const only = new Set(arg("only", "").split(",").filter(Boolean));
const label = arg("label", `run-${new Date().toISOString().slice(0, 19).split(":").join("-")}`);
const OUT = path.join(ROOT, "state", "build-battery", label);
fs.mkdirSync(OUT, { recursive: true });

const battery = JSON.parse(fs.readFileSync(path.join(HERE, arg("battery", "requests.json")), "utf8"));
const { runProxyTurn } = await import(path.join(ROOT, "proxy-runner.mjs"));

async function build(request) {
  const t0 = Date.now();
  const events = [];
  const ev = (e) => events.push({ ms: Date.now() - t0, ...e });
  const sessionId = `battery-${label}-${request.id}`;
  const turn = async (task, resumeAnswered, turnLabel) => {
    ev({ kind: "turn_start", label: turnLabel, task, resumeAnswered });
    let chunk = "";
    const flush = () => { if (chunk) { ev({ kind: "tokens", text: chunk }); chunk = ""; } };
    try {
      const result = await runProxyTurn({ sessionId, model, task, mode: "auto", resumeAnswered },
        (t) => { chunk += String(t ?? ""); if (chunk.length > 400) flush(); },
        (n) => { flush(); ev({ kind: "note", note: n }); }, null);
      flush();
      const text = String(result?.text ?? result?.answer ?? "");
      ev({ kind: "turn_end", label: turnLabel, answerShape: result?.answerShape ?? null, usage: result?.usage ?? null, mechanical: result?.mechanical ?? null, text: text.slice(0, 60000) });
      return { result, text };
    } catch (err) {
      flush();
      ev({ kind: "turn_error", label: turnLabel, error: String(err?.stack ?? err).slice(0, 1500) });
      return null;
    }
  };
  let r = await turn(request.prompt, [], "the ask");
  for (let round = 1; r && round <= 4 && r.result?.answerShape === "needs-clarification"; round++) {
    const qs = r.result?.mechanical?.questions ?? [];
    const answers = qs.map((q) => ({ cell: q.cell, value: request.answers?.[q.cell] ?? "keep it simple" }));
    ev({ kind: "answers_supplied", round, questions: qs, answers });
    r = await turn(request.prompt, answers, `answer round ${round}`);
  }
  const code = unfence(r?.text ?? "");
  const seen = inspect(code);
  const facts = factsOf(seen);
  const verdict = checkBuild(request, facts, { cafe: battery.cafe });
  ev({ kind: "done", totalMs: Date.now() - t0, artifact: seen.kind });
  return { id: request.id, prompt: request.prompt, model, label, answerShape: r?.result?.answerShape ?? null, artifactKind: seen.kind, why: seen.why ?? null, code, run: seen.run ?? null, pageText: seen.page?.text ?? null, verdict, events, ms: Date.now() - t0 };
}

const rows = [];
for (const request of battery.requests.filter((q) => !only.size || only.has(q.id))) {
  const out = await build(request);
  fs.writeFileSync(path.join(OUT, `${request.id}.json`), JSON.stringify(out, null, 1));
  const v = out.verdict;
  rows.push({ id: out.id, pass: v.pass, passed: v.passed, total: v.total, artifact: out.artifactKind, answerShape: out.answerShape, ms: out.ms, failed: v.results.filter((x) => !x.pass).map((x) => `${x.id}: ${x.detail}`) });
  console.log(`${v.pass ? "PASS" : "FAIL"} ${out.id.padEnd(22)} ${String(v.passed).padStart(2)}/${v.total} ${out.artifactKind.padEnd(7)} ${Math.round(out.ms / 1000)}s  ${rows.at(-1).failed.slice(0, 3).join(" | ")}`);
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify({ label, model, at: new Date().toISOString(), rows }, null, 1));
}
const passed = rows.filter((r) => r.pass).length;
console.log(`\n${passed}/${rows.length} requests pass · ${rows.reduce((a, r) => a + r.passed, 0)}/${rows.reduce((a, r) => a + r.total, 0)} checks · ${OUT}`);
process.exit(0);
