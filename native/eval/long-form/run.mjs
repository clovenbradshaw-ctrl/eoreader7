// native/eval/long-form/run.mjs — a long work through the one pipeline, and
// its controls. The outline is built once by organs/talk-build.js (prose
// medium) and frozen; every arm writes the SAME outline's parts:
//
//   ledger      organs/long-form.js: each ask a working note from the ledger
//   lines-only  the ablation: the same, with no facts about the people
//   window      the bare model: the cast header, the part's lines, and as
//               much of the text so far as fits in the window
//   summary     the bare model keeping its own running summary: the cast
//               header, its summary, the part's lines, the last text
//
// Every ask's real prompt size (Ollama's prompt_eval_count) is kept. No regex.
//
//   node native/eval/long-form/run.mjs --request="…" [--arms=ledger,window] [--seed=1] [--label=x] [--model=qwen2.5-coder:1.5b] [--ctx=4096]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, sentences, tokenize, analyse } from "../../adapters/text/english-parser.js";
import { makeTalkBuild } from "../../organs/talk-build.js";
import { makeLongForm, makeTextStore, outlineOf, linesOfBody, bodyOfReply, TAIL_SENTENCES } from "../../organs/long-form.js";
import { PROSE_MEDIUM } from "../../adapters/build/prose-medium.js";
import { makeNotes } from "../../kernel/notes.js";
import { makeBookEditor } from "../../organs/book-editor.js";
import { loadEotParser } from "../../the-fold/eot-notation.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const model = arg("model", "qwen2.5-coder:1.5b");
const request = arg("request", "a story with 3 characters, each with an age and a job, in 2 chapters of 2 scenes each, about a lighthouse keeper's daughter");
const arms = arg("arms", "ledger").split(",");
const seed = Number(arg("seed", "1"));
const ctx = Number(arg("ctx", "4096"));
const label = arg("label", "long-smoke");
// sampling the bare arms may be given (a falsification control: does a
// window that loops stop looping under the usual anti-repetition sampling?)
const repeatPenalty = arg("repeat-penalty", null), repeatLastN = arg("repeat-last-n", null);
const outlineFrom = arg("outline", null);
// the bare arms may stop early at scale: their prompt fills the window by then
const bareParts = Number(arg("bare-parts", "0")) || Infinity;
const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
const OUT = path.join(ROOT, "state", "long-form", label);
fs.mkdirSync(OUT, { recursive: true });

const parser = loadModel(JSON.parse(fs.readFileSync(path.join(ROOT, "native", "priors", "parser-eng-ewt.json"), "utf8")));
const parse = (text) => analyse(parser, tokenize(text).map((t) => t.form));

// the window is the server's: num_ctx sent with every ask, and the prompt's
// real size read back (panel, Simon: Ollama drops the front of an over-long prompt)
async function ask(prompt, { attempt = 0, numPredict = 160 } = {}) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, prompt, stream: false, options: { temperature: Math.min(1, 0.7 + 0.15 * attempt), seed: seed * 1000 + attempt, num_predict: numPredict, num_ctx: ctx, ...(repeatPenalty ? { repeat_penalty: Number(repeatPenalty) } : {}), ...(repeatLastN ? { repeat_last_n: Number(repeatLastN) } : {}) } }), signal: AbortSignal.timeout(600000) });
  const j = await r.json();
  // a server error is an error, never an empty reply read as silence (F1 lost 63 asks that way)
  if (j.error) throw new Error(`ollama: ${String(j.error).slice(0, 200)}`);
  return { response: String(j.response ?? ""), prompt_eval_count: j.prompt_eval_count ?? null, eval_count: j.eval_count ?? null };
}
const logTo = (file) => { const f = path.join(OUT, file); fs.writeFileSync(f, ""); return (x) => fs.appendFileSync(f, JSON.stringify(x) + "\n"); };

// ── the outline: built once, frozen, shared ─────────────────────────────
let outline;
const outlineFile = path.join(OUT, "outline.json");
if (outlineFrom) outline = JSON.parse(fs.readFileSync(outlineFrom, "utf8"));
else if (fs.existsSync(outlineFile)) outline = JSON.parse(fs.readFileSync(outlineFile, "utf8"));
else {
  const t0 = Date.now();
  const log = logTo("outline.log.jsonl");
  const talk = makeTalkBuild({ ask: async (p, o) => (await ask(p, { ...o, numPredict: 200 })).response, parse, sentences, log, medium: PROSE_MEDIUM, mouth: model, maxAsks: Number(arg("outline-asks", "200")) });
  const out = await talk.build({ what: request });
  outline = { request, topic: out.spec.topic, castDetails: out.spec.counted.find((c) => c.kind === PROSE_MEDIUM.castKind)?.details ?? [], spec: { counted: out.spec.counted, topic: out.spec.topic }, notes: out.notes, asks: out.asks, sealed: !!out.sealed, outline: out.artifact, ms: Date.now() - t0 };
  fs.writeFileSync(outlineFile, JSON.stringify(outline));
  console.log(`outline: ${out.asks} asks, sealed ${!!out.sealed}, ${Math.round((Date.now() - t0) / 1000)}s`);
  console.log(out.artifact);
}

// ── the arms ───────────────────────────────────────────────────────────
const N = makeNotes();
const frozen = outlineOf(N.fold(outline.notes), PROSE_MEDIUM);
const castHeader = frozen.cast.map((c) => [`${c.name} is one of the people in the story.`, ...c.props.filter((p) => (outline.castDetails ?? []).includes(p.label)).map((p) => `${c.name}'s ${p.label} is ${p.value}.`)].join(" ")).join("\n");
const linesFor = (leaf) => [...leaf.within, leaf.part].map((t) => t.props.find((p) => p.label === "says")?.value).filter(Boolean).map((v) => (v.trim().endsWith(".") ? v.trim() : `${v.trim()}.`));
// ~4 characters to a token, a measured ratio kept only for the budget below:
// the window arm is filled up to the window minus the reply and a margin
const CHARS_PER_TOKEN = 4;   // set by hand 2026-09-27 (English prose, qwen tokenizer, rough)
const MARGIN = 200;          // set by hand 2026-09-27: tokens left free in the window

async function bareArm(name) {
  const log = logTo(`${name}.log.jsonl`);
  const bodies = [];
  let summary = "", asks = 0;
  const prompts = [];
  for (const leaf of frozen.leaves.slice(0, bareParts)) {
    const head = `${castHeader}\n${topicLine}\n${linesFor(leaf).join("\n")}`;
    const room = (ctx - PROSE_MEDIUM.bodyTokens - MARGIN) * CHARS_PER_TOKEN - head.length - 200;
    const soFar = bodies.map((b) => b.text).join("\n\n");
    let prompt;
    if (name === "window") prompt = `${head}\n\nThe story so far:\n${soFar.slice(Math.max(0, soFar.length - room))}\n\nContinue the story.`;
    else prompt = `${head}\n\nWhat has happened so far: ${summary || "nothing yet."}\n\n${bodies.length ? `Continue the story.\n\n${linesOfBody(bodies.at(-1).text, sentences).slice(-TAIL_SENTENCES).map((l) => l.text).join(" ")}` : "Begin the story."}`;
    let text = "", tries = 0;
    while (tries < 3 && linesOfBody(text, sentences).length < 3) { asks++; tries++; const got = await ask(prompt, { attempt: tries - 1, numPredict: PROSE_MEDIUM.bodyTokens }); prompts.push({ part: leaf.part.id, chars: prompt.length, promptTokens: got.prompt_eval_count }); text = bodyOfReply(got.response, sentences); log({ kind: "body_turn", part: leaf.part.id, prompt, reply: got.response, promptTokens: got.prompt_eval_count }); }
    bodies.push({ part: leaf.part.id, text });
    if (name === "summary") { asks++; const got = await ask(`${summary ? `What had happened: ${summary}\n\n` : ""}What happened next:\n${text}\n\nSay what has happened in the story so far in five short sentences.`, { numPredict: 200 }); summary = got.response.trim(); prompts.push({ part: `${leaf.part.id}:summary`, chars: summary.length, promptTokens: got.prompt_eval_count }); }
    fs.writeFileSync(path.join(OUT, `${name}.bodies.json`), JSON.stringify(bodies));
  }
  const book = [`# ${frozen.whole?.name ?? "Untitled"}`, ...bodies.flatMap((b) => ["", ...linesOfBody(b.text, sentences).map((l) => l.text)])].join("\n") + "\n";
  fs.writeFileSync(path.join(OUT, `${name}.book.md`), book);
  return { name, asks, prompts, book };
}
const topicLine = outline.topic ? `The story is ${outline.topic}.` : "";

const results = [];
for (const name of arms.filter((a) => a !== "edit")) {
  const t0 = Date.now();
  if (name === "ledger" || name === "lines-only") {
    const log = logTo(`${name}.log.jsonl`);
    const lf = makeLongForm({ ask, sentences, medium: PROSE_MEDIUM, mouth: model, log, recipe: name === "ledger" ? "ledger" : "lines-only", castDetails: outline.castDetails, persist: ({ notes, store }) => fs.writeFileSync(path.join(OUT, `${name}.state.json`), JSON.stringify({ notes, store })) });
    const w = await lf.writeBodies({ notes: outline.notes, store: makeTextStore(), topic: outline.topic });
    const s = lf.seal({ notes: w.notes, store: w.store, request, regime: { arm: name, seed, ctx } });
    fs.writeFileSync(path.join(OUT, `${name}.book.md`), s.artifact);
    results.push({ name, asks: w.asks, voids: w.voids.length, prompts: w.prompts, sealed: !!s.sealed, provenance: { covered: s.provenance.covered, uncovered: s.provenance.uncovered.length, unresolved: s.provenance.unresolved.length }, helix: s.helix.ok, ms: Date.now() - t0 });
    // EVA -> REC: the pathos archons read the book against its universe's
    // record and each licensed revision is tried alone (organs/book-editor.js)
    if (name === "ledger" && arms.includes("edit")) {
      const t1 = Date.now();
      const parser = await loadEotParser();
      const elog = logTo("ledger-edited.log.jsonl");
      const ed = makeBookEditor({ lf, ask, parser, medium: PROSE_MEDIUM, mouth: model, castDetails: outline.castDetails, log: elog });
      // macro to micro: the pathos pass on the book as written, then the editors
      // where the being is, before the archons: Gebser's and the being's findings
      const arcRow = (label, r) => { const a = r.findings.filter((x) => ["Jean Gebser", "Odysseus (the being)"].includes(x.editor)); console.log(`arc ${label.padEnd(7)} ${r.frame?.p ? `${r.frame.p}: home ${r.path.filter((x) => x.at === "home").length}, away ${r.path.filter((x) => x.at === "away").length}, unseen ${r.path.filter((x) => !x.seen).length}, changed ${r.path.filter((x) => x.changed).length} of ${r.path.length} parts · ${a.map((x) => x.kind).join(", ") || "no findings"}` : "no being"}`); return a.map((x) => x.kind); };
      const arcBefore = arcRow("written", ed.readBook({ notes: s.notes, store: w.store, task: request }));
      const pp = await ed.pathosPass({ notes: s.notes, store: w.store, task: request, budget: 3 * frozen.leaves.length, topic: outline.topic });
      console.log(`pathos     ${pp.targets} flat parts, ${pp.tried} tried, ${pp.kept} rewritten, ${pp.asks} asks`);
      const e = await ed.editBook({ notes: pp.notes, store: pp.store, task: request, budget: 2 * frozen.leaves.length });
      e.asks += pp.asks;
      const arcAfter = arcRow("edited", ed.readBook({ notes: e.notes, store: e.store, task: request }));
      const s2 = lf.seal({ notes: e.notes, store: e.store, request, regime: { arm: "ledger-edited", seed, ctx } });
      fs.writeFileSync(path.join(OUT, "ledger-edited.book.md"), s2.artifact);
      fs.writeFileSync(path.join(OUT, "ledger-edited.state.json"), JSON.stringify({ notes: e.notes, store: e.store }));
      results.push({ name: "ledger-edited", arc: { written: arcBefore, edited: arcAfter }, asks: e.asks, passes: e.passes.map((p) => ({ pass: p.pass, findings: p.findings, licensed: p.licensed, lines: p.lines, carrying: p.carrying, kept: p.kept, undone: p.undone, refused: p.refused })), final: e.final, prompts: [], sealed: !!s2.sealed, provenance: { covered: s2.provenance.covered, uncovered: s2.provenance.uncovered.length, unresolved: s2.provenance.unresolved.length }, helix: s2.helix.ok, ms: Date.now() - t1 });
      console.log(`edited     asks ${e.asks} · ${e.passes.map((p) => `pass ${p.pass}: ${p.licensed} licensed, kept ${JSON.stringify(p.kept)}, undone ${JSON.stringify(p.undone)}`).join(" | ")} · final ${e.final.licensed} licensed, ${e.final.lines} lines · sealed ${!!s2.sealed} · helix ${s2.helix.ok} · ${Math.round((Date.now() - t1) / 1000)}s`);
    }
  } else {
    const r = await bareArm(name);
    results.push({ name, asks: r.asks, prompts: r.prompts, ms: Date.now() - t0 });
  }
  const last = results.find((r) => r.name === name) ?? results.at(-1);
  const toks = last.prompts.map((p) => p.promptTokens ?? 0);
  console.log(`${name.padEnd(10)} asks ${last.asks} · prompt tokens max ${Math.max(...toks)} mean ${Math.round(toks.reduce((a, b) => a + b, 0) / Math.max(1, toks.length))}${last.sealed != null ? ` · sealed ${last.sealed} · lines covered ${last.provenance.covered}, uncovered ${last.provenance.uncovered}, unresolved ${last.provenance.unresolved} · helix ${last.helix}` : ""} · ${Math.round(last.ms / 1000)}s`);
}
fs.writeFileSync(path.join(OUT, `results-seed${seed}.json`), JSON.stringify(results, null, 1));
console.log("LONG-DONE", OUT);
