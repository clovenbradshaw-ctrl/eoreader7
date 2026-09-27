// native/eval/build-battery/run-hora.mjs — the Hora arm: every page request
// (kind page or any) from requests.json and requests-fresh.json, built by
// organs/hora.js walking the void holarchy with small, specific asks to the
// model, scored by the same checker as every other arm.
//
//   node native/eval/build-battery/run-hora.mjs [--model=qwen2.5-coder:1.5b] [--label=hora-1.5b]
//
// Program requests are not Hora's (organs/code-build.js builds programs) and
// are skipped here; a page request the model calls a program is handed back
// and scores as nothing built. Every ask and every verdict is kept in the
// trace. No regex anywhere.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkBuild, factsOf } from "../../organs/build-check.js";
import { makeHora } from "../../organs/hora.js";
import { renderPage } from "../../adapters/build/page.js";
import { inspect } from "./inspect.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const model = arg("model", "qwen2.5-coder:1.5b");
const label = arg("label", `hora-${model.split(":").join("-")}`);
const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const OUT = path.join(ROOT, "state", "build-battery", label);
fs.mkdirSync(OUT, { recursive: true });

const sets = ["requests.json", "requests-fresh.json"].map((f) => ({ file: f, battery: JSON.parse(fs.readFileSync(path.join(HERE, f), "utf8")) }));

async function ask(prompt, { temperature = 0.3, maxTokens = 120 } = {}) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, prompt, stream: false, options: { temperature, num_predict: maxTokens } }), signal: AbortSignal.timeout(180000) });
  return String((await r.json()).response ?? "");
}
const verify = async (kind, text) => { const v = inspect(text); return { ok: v.kind === "page", checks: [`the page parses (${v.kind})`], detail: v.kind }; };

const rows = [];
for (const { file, battery } of sets) {
  for (const q of battery.requests.filter((r) => r.kind === "page" || r.kind === "any")) {
    const t0 = Date.now();
    const events = [];
    const hora = makeHora({ ask, renderers: { page: renderPage }, verify, log: (e) => events.push({ ms: Date.now() - t0, ...e }) });
    const whole = { slot: q.prompt, anchor: q.answers?.anchor ?? null, cardinality: q.answers?.cardinality ?? null };
    let out, error = null;
    try { out = await hora.build(whole); } catch (err) { error = String(err?.stack ?? err).slice(0, 1500); out = { kind: "none", artifact: null, asks: 0 }; }
    const code = out.artifact ?? "";
    const seen = code ? inspect(code) : { kind: "none", why: out.handedTo ? `handed to ${out.handedTo}` : error ?? "nothing built" };
    const verdict = checkBuild(q, factsOf(seen), { cafe: battery.cafe });
    const rec = { id: q.id, set: file, prompt: q.prompt, model, label, arm: "hora", artifactKind: seen.kind, why: seen.why ?? null, code, run: null, pageText: seen.page?.text ?? null, verdict, asks: out.asks, sealed: !!out.sealed, handedTo: out.handedTo ?? null, error, events, ms: Date.now() - t0 };
    fs.writeFileSync(path.join(OUT, `${q.id}.json`), JSON.stringify(rec, null, 1));
    rows.push({ id: q.id, set: file, pass: verdict.pass, passed: verdict.passed, total: verdict.total, artifact: seen.kind, asks: out.asks, sealed: rec.sealed, ms: rec.ms, failed: verdict.results.filter((x) => !x.pass).map((x) => `${x.id}: ${x.detail}`) });
    console.log(`${verdict.pass ? "PASS" : "FAIL"} ${q.id.padEnd(22)} ${String(verdict.passed).padStart(2)}/${verdict.total} ${seen.kind.padEnd(7)} asks ${String(out.asks).padStart(3)} ${rec.sealed ? "sealed " : "       "}${Math.round(rec.ms / 1000)}s  ${rows.at(-1).failed.slice(0, 3).join(" | ")}`);
    fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify({ label, model, arm: "hora", at: new Date().toISOString(), rows }, null, 1));
  }
}
const pass = rows.filter((r) => r.pass).length;
console.log(`\n${pass}/${rows.length} page requests pass · ${rows.reduce((a, r) => a + r.passed, 0)}/${rows.reduce((a, r) => a + r.total, 0)} checks · ${OUT}`);
