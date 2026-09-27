// native/eval/build-battery/run-talk.mjs — the talk arm: every page request in
// the chosen battery built as a conversation (organs/talk-build.js): the model
// only talks, organs/talk-reader.js reads the talk into claims, the kernel's
// notes ledger types and folds them, adapters/build/belief-page.js draws the
// belief. Scored by the same checker as every other arm; every ask, reply,
// claim and typed op kept in the trace. No regex anywhere.
//
//   node native/eval/build-battery/run-talk.mjs [--model=qwen2.5-coder:1.5b] [--battery=ladder.json] [--only=id,id] [--label=talk-1.5b]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkBuild, factsOf } from "../../organs/build-check.js";
import { makeTalkBuild, completeness } from "../../organs/talk-build.js";
import { renderBelief } from "../../adapters/build/belief-page.js";
import { loadModel, sentences, tokenize, analyse } from "../../adapters/text/english-parser.js";
import { inspect } from "./inspect.mjs";
import { makeWikiSummary } from "../../adapters/sources/wiki-summary.js";
import { makeNpmParts } from "../../adapters/sources/npm-parts.js";
import { sourcePart, provenanceComment } from "../../organs/part-source.js";
import { RENDERED_ELEMENTS } from "../../adapters/build/belief-page.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const model = arg("model", "qwen2.5-coder:1.5b");
const label = arg("label", `talk-${model.split(":").join("-")}`);
const only = new Set(arg("only", "").split(",").filter(Boolean));
const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const OUT = path.join(ROOT, "state", "build-battery", label);
fs.mkdirSync(OUT, { recursive: true });

const parser = loadModel(JSON.parse(fs.readFileSync(path.join(ROOT, "native", "priors", "parser-eng-ewt.json"), "utf8")));
const parse = (text) => analyse(parser, tokenize(text).map((t) => t.form));

// a retry of the same gap is sampled warmer, so it is not the same answer again
async function ask(prompt, { attempt = 0 } = {}) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, prompt, stream: false, options: { temperature: Math.min(1, 0.4 + 0.3 * attempt), num_predict: 160 } }), signal: AbortSignal.timeout(180000) });
  return String((await r.json()).response ?? "");
}
const verify = async (kind, text) => { const v = inspect(text); return { ok: v.kind === "page", checks: [`the page parses (${v.kind})`] }; };

// what a named thing is, from a cached encyclopedia lead (organs/kind-read.js reads it)
const lookup = makeWikiSummary({ dir: path.join(ROOT, "state", "sources", "wikipedia") });
// the page's stylesheet, snipped from a licensed published package (organs/part-source.js), once
const part = arg("parts", "on") === "off" ? null : await sourcePart({ need: "stylesheet", elements: RENDERED_ELEMENTS, npm: makeNpmParts({ dir: path.join(ROOT, "state", "sources", "npm") }) });
const style = part?.css ? { css: part.css, comment: provenanceComment(part.provenance) } : null;
console.log(part?.css ? `stylesheet: ${part.provenance.package}@${part.provenance.version}${part.provenance.path} (${part.provenance.license}), ${part.provenance.reached.length}/${RENDERED_ELEMENTS.length} elements` : `stylesheet: ${part?.refused ?? "none found"} — the engine's fallback`);
const render = (belief, o) => renderBelief(belief, { ...o, style });
const rows = [];
for (const file of arg("battery", "ladder.json").split(",")) {
  const battery = JSON.parse(fs.readFileSync(path.join(HERE, file), "utf8"));
  for (const q of battery.requests.filter((r) => (r.kind === "page" || r.kind === "any") && (!only.size || only.has(r.id)))) {
    const t0 = Date.now();
    const events = [];
    const tb = makeTalkBuild({ ask, parse, sentences, render, verify, mouth: model, frame: arg("frame", "task"), lookup: arg("sources", "on") === "off" ? null : lookup, log: (e) => events.push({ ms: Date.now() - t0, ...e }) });
    let out, error = null;
    try { out = await tb.build({ what: q.prompt, forWhom: q.answers?.anchor ?? null }); } catch (err) { error = String(err?.stack ?? err).slice(0, 1500); out = { artifact: "", asks: 0, belief: [] }; }
    const seen = out.artifact ? inspect(out.artifact) : { kind: "none", why: error ?? "nothing built" };
    const verdict = checkBuild(q, factsOf(seen), { cafe: battery.cafe });
    const whole = out.spec ? completeness(out.spec, out.belief) : { want: 0, have: 0, ratio: 0, byPart: [] };
    const rec = { id: q.id, ladder: q.ladder ?? null, rung: q.rung ?? null, set: file, prompt: q.prompt, model, label, arm: "talk", artifactKind: seen.kind, why: seen.why ?? null, code: out.artifact ?? "", pageText: seen.page?.text ?? null, verdict, asks: out.asks, things: out.belief?.length ?? 0, completeness: whole, error, events, ms: Date.now() - t0 };
    fs.writeFileSync(path.join(OUT, `${q.id}.json`), JSON.stringify(rec, null, 1));
    rows.push({ id: q.id, ladder: rec.ladder, rung: rec.rung, pass: verdict.pass, passed: verdict.passed, total: verdict.total, asks: rec.asks, things: rec.things, whole: `${whole.have}/${whole.want}`, ms: rec.ms, failed: verdict.results.filter((x) => !x.pass).map((x) => `${x.id}: ${x.detail}`) });
    console.log(`${verdict.pass ? "PASS" : "FAIL"} ${q.id.padEnd(22)} ${String(verdict.passed).padStart(2)}/${verdict.total} asks ${String(rec.asks).padStart(3)} things ${String(rec.things).padStart(3)} whole ${String(rows.at(-1).whole).padStart(7)} ${Math.round(rec.ms / 1000)}s  ${rows.at(-1).failed.slice(0, 3).join(" | ")}`);
    fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify({ label, model, arm: "talk", at: new Date().toISOString(), rows }, null, 1));
  }
}
console.log(`\n${rows.filter((r) => r.pass).length}/${rows.length} page requests pass · ${rows.reduce((a, r) => a + r.passed, 0)}/${rows.reduce((a, r) => a + r.total, 0)} checks · ${OUT}`);
