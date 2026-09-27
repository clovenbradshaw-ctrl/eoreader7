// native/eval/build-battery/run-raw.mjs — the no-pipeline arm: the same
// requests and the same supplied answers, sent straight to the model in one
// ask, scored by the same checker. If the bare model beats runProxyTurn on
// this battery, the pipeline is subtracting value, and by how much.
//
//   node native/eval/build-battery/run-raw.mjs [--model=qwen2.5-coder:1.5b] [--label=raw-1.5b]
//
// The one ask gives the model the request, who it is for, how many, and lets
// it choose the kind (a page or a program) — the same freedom the pipeline's
// own language detection has. No regex anywhere: the reply is unfenced by
// position and judged by Python's parsers (inspect.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkBuild, factsOf } from "../../organs/build-check.js";
import { unfence, inspect } from "./inspect.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const model = arg("model", "qwen2.5-coder:1.5b");
const label = arg("label", `raw-${model.split(":").join("-")}`);
const OLLAMA = (process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434");
const OUT = path.join(ROOT, "state", "build-battery", label);
fs.mkdirSync(OUT, { recursive: true });
const battery = JSON.parse(fs.readFileSync(path.join(HERE, arg("battery", "requests.json")), "utf8"));
// the output budget: generous by default, so a big build is never cut short by
// a limit this arm set (the ladder's claim is about the model, not the budget)
const numPredict = Number(arg("num-predict", "2048"));

const askFor = (q) => `${q.prompt}\n\nWho it is for: ${q.answers?.anchor ?? "me"}.\nHow many: ${q.answers?.cardinality ?? "a few"}.\n\nWrite it as one complete file: a single HTML page (with its CSS and JavaScript inside) if it is something people open in a browser, or a single Python program that runs with no input if it is something run at the command line. Reply with the file only.`;

const rows = [];
for (const q of battery.requests) {
  const t0 = Date.now();
  // streamed, so a long generation is never cut off by the client's header
  // timeout (a page that takes the model five minutes still comes back whole)
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, prompt: askFor(q), stream: true, options: { temperature: 0.2, num_predict: numPredict } }) });
  const body = { response: "" };
  let buf = "";
  const take = (line) => { if (!line.trim()) return; const o = JSON.parse(line); body.response += o.response ?? ""; if (o.done) Object.assign(body, { done_reason: o.done_reason, prompt_eval_count: o.prompt_eval_count, eval_count: o.eval_count }); };
  for await (const chunk of r.body) { buf += Buffer.from(chunk).toString("utf8"); let nl; while ((nl = buf.indexOf("\n")) >= 0) { take(buf.slice(0, nl)); buf = buf.slice(nl + 1); } }
  take(buf);
  const reply = String(body.response ?? "");
  const code = unfence(reply);
  const seen = inspect(code);
  const verdict = checkBuild(q, factsOf(seen), { cafe: battery.cafe });
  const out = { id: q.id, ladder: q.ladder ?? null, rung: q.rung ?? null, numPredict, doneReason: body.done_reason ?? null, prompt: q.prompt, model, label, arm: "raw", ask: askFor(q), reply, answerShape: "raw", artifactKind: seen.kind, why: seen.why ?? null, code, run: seen.run ?? null, pageText: seen.page?.text ?? null, verdict, events: [{ ms: Date.now() - t0, kind: "turn_end", text: reply.slice(0, 60000), usage: { promptTokens: body.prompt_eval_count ?? null, completionTokens: body.eval_count ?? null } }], ms: Date.now() - t0 };
  fs.writeFileSync(path.join(OUT, `${q.id}.json`), JSON.stringify(out, null, 1));
  rows.push({ id: q.id, ladder: q.ladder ?? null, rung: q.rung ?? null, doneReason: body.done_reason ?? null, pass: verdict.pass, passed: verdict.passed, total: verdict.total, artifact: seen.kind, ms: out.ms, failed: verdict.results.filter((x) => !x.pass).map((x) => `${x.id}: ${x.detail}`) });
  console.log(`${verdict.pass ? "PASS" : "FAIL"} ${q.id.padEnd(22)} ${String(verdict.passed).padStart(2)}/${verdict.total} ${seen.kind.padEnd(7)} ${Math.round(out.ms / 1000)}s  ${rows.at(-1).failed.slice(0, 3).join(" | ")}`);
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify({ label, model, arm: "raw", at: new Date().toISOString(), rows }, null, 1));
}
console.log(`\n${rows.filter((r) => r.pass).length}/${rows.length} requests pass · ${rows.reduce((a, r) => a + r.passed, 0)}/${rows.reduce((a, r) => a + r.total, 0)} checks · ${OUT}`);
