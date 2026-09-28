// native/eval/code-task/run.mjs — a complex, net-new coding task (a tiny
// spreadsheet engine: 9 functions in 3 modules with real cross-module
// dependencies) through three arms, scored by the same hidden suite
// (engine.test.js, 16 tests, satisfiable: reference/index.js passes 16/16):
//
//   whole    the bare mouth: the whole design in one prompt, the whole
//            program in one draw (the control for decomposition)
//   units    one function per draw from its own signature and line only —
//            no callees carried, no calls asked, no revision (the control for
//            the carried ground and for EVA→REC; organs/code-build.js's own
//            posture, which its header says must defer when units depend on
//            each other — these do)
//   record   organs/code-form.js: calls asked (CON), bodies from bounded
//            notes carrying the callees' signatures, the suite as EVA, failing
//            functions written again with the failure in hand (REC), kept only
//            if the tests naming them fail less. Round 0 is the record before
//            any test is fed back.
//
//   node native/eval/code-task/run.mjs [--model=qwen2.5-coder:1.5b] [--arms=whole,units,record] [--seed=1] [--label=code1]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeCodeForm, makeTextStore, extractFunction } from "../../organs/code-form.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const model = arg("model", "qwen2.5-coder:1.5b");
const arms = arg("arms", "whole,units,record").split(",");
const seed = Number(arg("seed", "1"));
const label = arg("label", "code1");
const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const OUT = path.join(ROOT, "state", "code-task", label);
fs.mkdirSync(OUT, { recursive: true });
const spec = JSON.parse(fs.readFileSync(path.join(HERE, "spec.json"), "utf8"));
const testFile = path.join(HERE, "engine.test.js");
const logTo = (file) => { const f = path.join(OUT, file); fs.writeFileSync(f, ""); return (x) => fs.appendFileSync(f, JSON.stringify(x) + "\n"); };

async function ask(prompt, { attempt = 0, numPredict = 400 } = {}) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, prompt, stream: false, options: { temperature: Math.min(1, 0.2 + 0.2 * attempt), seed: seed * 1000 + attempt, num_predict: numPredict, num_ctx: 4096 } }), signal: AbortSignal.timeout(600000) });
  const j = await r.json();
  if (j.error) throw new Error(`ollama: ${String(j.error).slice(0, 200)}`);
  return { response: String(j.response ?? ""), prompt_eval_count: j.prompt_eval_count ?? null };
}

const fns = spec.modules.flatMap((m) => m.functions.map((f) => ({ ...f, module: m.name })));
const design = spec.modules.map((m) => `Module ${m.name}:\n${m.functions.map((f) => `  ${f.signature} — ${f.says}`).join("\n")}`).join("\n");
const results = [];
const cf0 = makeCodeForm({ ask, mouth: model, spec, testFile });

for (const arm of arms) {
  const t0 = Date.now();
  const dir = path.join(OUT, arm);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const log = logTo(`${arm}.log.jsonl`);
  if (arm === "whole") {
    /** Tokens for the whole program in one draw — set by hand 2026-09-28: the reference is ~2,000 tokens. */
    const WHOLE_TOKENS = 2600;
    const prompt = `The program is ${spec.program}.\n${design}\n\nWrite the whole program as ONE JavaScript ES module that exports all ${fns.length} functions by these names. Write only the code.\n\n`;
    const got = await ask(prompt, { numPredict: WHOLE_TOKENS });
    let code = got.response.split("```javascript").join("").split("```js").join("").split("```").join("").trim();
    // every function the draw did write, exported; the ones it did not, declared missing
    const bodies = fns.map((f) => extractFunction(code, f.name));
    const file = bodies.map((b, i) => (b ? `export ${b}` : `export function ${fns[i].name}() { throw new Error("${fns[i].name}: not written"); }`)).join("\n\n") + "\n";
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module" }));
    fs.writeFileSync(path.join(dir, "index.js"), file);
    fs.writeFileSync(path.join(dir, "raw.js"), code);
    fs.copyFileSync(testFile, path.join(dir, "engine.test.js"));
    const r = cf0.test({ dir, map: [] });
    log({ kind: "whole", prompt, reply: got.response, promptTokens: got.prompt_eval_count, written: bodies.filter(Boolean).length });
    results.push({ arm, model, passed: r.passed, total: 16, loaded: r.loaded, written: bodies.filter(Boolean).length, asks: 1, promptTokens: got.prompt_eval_count, ms: Date.now() - t0 });
  } else if (arm === "units") {
    const cf = makeCodeForm({ ask, mouth: model, spec, testFile, log });
    // the record without its carried ground: no calls asked, each body from its own line alone
    const notes = cf.stipulate();
    const w = await cf.writeBodies({ notes, store: makeTextStore() });
    // imports are the engine's: without bonds, every other module's functions are imported (the only way independent units can link)
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module" }));
    for (const m of spec.modules) {
      const others = spec.modules.filter((x) => x !== m);
      const head = others.map((o) => `import { ${o.functions.map((f) => f.name).join(", ")} } from "./${o.name}.js";`).join("\n");
      const chunks = m.functions.map((f) => { const b = cf.N.fold(w.notes).find((n) => n.end1 === cf.fns.find((x) => x.name === f.name).id && n.label === "body"); return b ? `export ${w.store.get(b.end2)}` : `export function ${f.name}() { throw new Error("${f.name}: no body"); }`; });
      fs.writeFileSync(path.join(dir, `${m.name}.js`), `${head}\n\n${chunks.join("\n\n")}\n`);
    }
    fs.writeFileSync(path.join(dir, "index.js"), spec.modules.map((m) => `export { ${m.functions.map((f) => f.name).join(", ")} } from "./${m.name}.js";`).join("\n") + "\n");
    fs.copyFileSync(testFile, path.join(dir, "engine.test.js"));
    const r = cf.test({ dir, map: [] });
    const toks = w.prompts.filter(Boolean);
    results.push({ arm, model, passed: r.passed, total: 16, loaded: r.loaded, voids: w.voids, asks: w.asks, promptMean: toks.length ? Math.round(toks.reduce((a, b) => a + b, 0) / toks.length) : null, promptMax: toks.length ? Math.max(...toks) : null, ms: Date.now() - t0 });
  } else if (arm === "record") {
    const cf = makeCodeForm({ ask, mouth: model, spec, testFile, log });
    let notes = cf.stipulate();
    ({ notes } = await cf.askCalls({ notes }));
    const bonds = cf.N.fold(notes).filter((n) => n.label === "calls").length;
    const w = await cf.writeBodies({ notes, store: makeTextStore() });
    const rv = await cf.revise({ notes: w.notes, store: w.store, dir });
    fs.writeFileSync(path.join(OUT, "record.state.json"), JSON.stringify({ notes: rv.notes, store: rv.store }));
    const toks = fs.readFileSync(path.join(OUT, "record.log.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.kind === "body_turn" && x.promptTokens).map((x) => x.promptTokens);
    results.push({ arm, model, passed: rv.history.at(-1).passed, total: 16, round0: rv.history[0].passed, rounds: rv.history, bonds, voids: w.voids, asks: rv.asks, promptMean: toks.length ? Math.round(toks.reduce((a, b) => a + b, 0) / toks.length) : null, promptMax: toks.length ? Math.max(...toks) : null, ms: Date.now() - t0 });
  }
  const last = results.at(-1);
  console.log(`${arm.padEnd(7)} ${model} · passed ${last.passed}/16${last.round0 != null ? ` (round 0: ${last.round0}; ${last.rounds.map((h) => `r${h.round} ${h.passed}${h.kept ? ` kept ${h.kept.join(",") || "-"} undone ${h.undone.join(",") || "-"}` : ""}`).join(" | ")})` : ""}${last.loaded === false ? " · did not load" : ""} · asks ${last.asks}${last.promptMean ? ` · prompt mean ${last.promptMean} max ${last.promptMax}` : last.promptTokens ? ` · prompt ${last.promptTokens}` : ""}${last.bonds != null ? ` · bonds ${last.bonds}` : ""}${last.voids?.length ? ` · voids ${last.voids.join(",")}` : ""} · ${Math.round(last.ms / 1000)}s`);
}
fs.writeFileSync(path.join(OUT, `results-seed${seed}.json`), JSON.stringify(results, null, 1));
console.log("CODE-DONE", OUT);
