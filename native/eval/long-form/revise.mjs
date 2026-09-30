// native/eval/long-form/revise.mjs — iterating a long work that no ask ever
// sees whole. Takes a book written by the ledger arm (run.mjs) and makes the
// person's changes to it, one after another, then checks the text:
//
//   1. rename the first person                     (mechanical: no asks)
//   2. change the second person's job              (only the lines that say it)
//   3. change the third person's age               (only the lines that say it)
//
// Each change is measured: asks spent, lines edited, lines untouched and
// byte-identical, old values left (read from the text), parts the record
// still holds stale. The control is how a bare local model revises a work it
// cannot hold: a chunked rewrite — every part, with the change stated, asked
// to be written again — scored the same way.
//
//   node native/eval/long-form/revise.mjs <dir> [--seed=1] [--control=1]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadModel, sentences, tokenize, analyse } from "../../adapters/text/english-parser.js";
import { makeLongForm, makeTextStore, outlineOf, wordAt, linesOfBody, bodyOfReply, readChange } from "../../organs/long-form.js";
import { PROSE_MEDIUM } from "../../adapters/build/prose-medium.js";
import { makeNotes } from "../../kernel/notes.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..", "..");
void ROOT; void loadModel; void tokenize; void analyse;
const dir = process.argv[2];
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const seed = Number(arg("seed", "1"));
const control = arg("control", "1") === "1";
const model = arg("model", "qwen2.5-coder:1.5b");
const ctx = Number(arg("ctx", "4096"));
const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://127.0.0.1:11434";
async function ask(prompt, { attempt = 0, numPredict = 160 } = {}) {
  const r = await fetch(`${OLLAMA}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, prompt, stream: false, options: { temperature: Math.min(1, 0.7 + 0.15 * attempt), seed: seed * 1000 + attempt, num_predict: numPredict, num_ctx: ctx } }), signal: AbortSignal.timeout(600000) });
  const j = await r.json();
  // a server error is an error, never an empty reply read as silence (F1 lost 63 asks that way)
  if (j.error) throw new Error(`ollama: ${String(j.error).slice(0, 200)}`);
  return { response: String(j.response ?? ""), prompt_eval_count: j.prompt_eval_count ?? null };
}
const logFile = path.join(dir, `revise.seed${seed}.log.jsonl`);
fs.writeFileSync(logFile, "");
const log = (x) => fs.appendFileSync(logFile, JSON.stringify(x) + "\n");

const outline = JSON.parse(fs.readFileSync(path.join(dir, "outline.json"), "utf8"));
// the book as it stands: edited by the archons when that stage ran, else as written
const stateFile = arg("state", null) ? `${arg("state", null)}.state.json` : fs.existsSync(path.join(dir, "ledger-edited.state.json")) ? "ledger-edited.state.json" : "ledger.state.json";
console.log("revising", stateFile);
const state = JSON.parse(fs.readFileSync(path.join(dir, stateFile), "utf8"));
const lf = makeLongForm({ ask, sentences, medium: PROSE_MEDIUM, mouth: model, log, castDetails: outline.castDetails, spec: outline.spec ?? null });
let notes = state.notes, store = makeTextStore(state.store);
const N = makeNotes();
const cast = outlineOf(N.fold(notes), PROSE_MEDIUM).cast;
const detail = (c, label) => c.props.find((p) => p.label === label)?.value ?? null;

// what the text still says of an old value, read from the text alone
const bodyLines = (book) => String(book).split("\n").filter((l) => l.trim() && !l.startsWith("#") && l.trim() !== "* * *");
const oldLeft = (book, { who, word }) => bodyLines(book).filter((l) => (who ? wordAt(l, who).length : true) && wordAt(l.toLowerCase(), String(word).toLowerCase()).length).length;
const diff = (a, b) => { const A = bodyLines(a), B = bodyLines(b); let same = 0; const n = Math.min(A.length, B.length); for (let i = 0; i < n; i++) if (A[i] === B[i]) same++; return { lines: B.length, same, changed: B.length - same }; };

const report = [];
let book = lf.seal({ notes, store, request: outline.request }).artifact;
const start = book;
// the person's changes, said in plain words and read against the record
// (readChange) — chosen where the book says the value, so a change has
// something to reach: the detail whose value the most lines state beside the
// person's name (a change to a value the book never states costs nothing and
// shows nothing)
const bookNow = lf.seal({ notes, store, request: outline.request }).artifact.split("\n");
const stated = (c, label) => { const v = detail(c, label); return v ? bookNow.filter((l) => wordAt(l, c.name).length && wordAt(l.toLowerCase(), String(v).toLowerCase()).length).length : 0; };
const byStated = (label, not = []) => cast.filter((c) => !not.includes(c) && detail(c, label)).sort((a, b) => stated(b, label) - stated(a, label))[0] ?? null;
// the details on whoever the book states them of; the rename on the most-named other person
const jobOf = byStated("job"), ageOf = byStated("age");
const mentions = (c) => bookNow.filter((l) => wordAt(l, c.name).length).length;
const renamed = [...cast].sort((a, b) => mentions(b) - mentions(a))[0] ?? cast[0];
console.log("stated in the book:", cast.map((c) => `${c.name} job ${stated(c, "job")} age ${stated(c, "age")}`).join("; "));
// the rename last, so it also reaches the lines the detail changes wrote
const said = [
  jobOf && `${jobOf.name} is a ferry pilot now.`,
  ageOf && `${ageOf.name} is ${Number(detail(ageOf, "age")) + 31}.`,
  renamed && `Rename ${renamed.name} to Wren.`,
].filter(Boolean);
const plan = [];
for (const words of said) {
  const c = readChange(words, { cast: cast.map((x) => ({ name: x.name })), details: outline.castDetails ?? [], numericDetails: PROSE_MEDIUM.numericDetails });
  console.log(`"${words}" ->`, JSON.stringify(c));
  if (!c.refused) plan.push(c);
}
for (const change of plan) {
  const before = book;
  const t0 = Date.now();
  const was = change.kind === "rename" ? change.who : detail(cast.find((c) => c.name === change.who), change.label);
  const r = change.kind === "rename" ? lf.rename({ notes, store, who: change.who, to: change.to }) : await lf.changeDetail({ notes, store, who: change.who, label: change.label, to: change.to });
  notes = r.notes; store = r.store;
  const s = lf.seal({ notes, store, request: outline.request });
  notes = s.notes; book = s.artifact;
  const left = change.kind === "rename" ? oldLeft(book, { who: null, word: was }) : oldLeft(book, { who: change.who, word: was });
  const d = diff(before, book);
  const row = { change: `${change.kind} ${change.who}${change.label ? ` ${change.label}` : ""}: ${was} -> ${change.to}`, asks: r.asks ?? 0, edits: r.edits, parts: r.parts?.length ?? 0, linesChanged: d.changed, linesSame: d.same, oldLeft: left, stale: lf.stale(notes).length, sealed: !!s.sealed, provenance: s.provenance.ok, helix: s.helix.ok, ms: Date.now() - t0 };
  report.push(row);
  console.log(JSON.stringify(row));
  if (change.kind === "rename") for (const c of cast) if (c.name === change.who) c.name = change.to;
}
fs.writeFileSync(path.join(dir, `ledger.revised.seed${seed}.book.md`), book);

// ── the control: a chunked rewrite, every part asked again with the changes stated ──
if (control) {
  const facts = plan.map((c) => (c.kind === "rename" ? `${c.who} is now called ${c.to}.` : `${c.who}'s ${c.label} is ${c.to}.`)).join(" ");
  const parts = start.split("\n* * *\n").flatMap((chunk) => chunk.split("\n## "));
  const out = [];
  let asks = 0;
  const t0 = Date.now();
  for (const chunk of parts) {
    const lines = chunk.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    const heading = chunk.split("\n")[0];
    const text = lines.filter((l) => l !== heading || chunk.startsWith("#")).join(" ");
    if (!text.trim()) { out.push(chunk); continue; }
    asks++;
    const got = await ask(`${facts}\n\nWrite this passage again with those changes, keeping everything else the same:\n\n${text}`, { numPredict: PROSE_MEDIUM.bodyTokens + 80 });
    const body = bodyOfReply(got.response, sentences);
    log({ kind: "control_turn", prompt: text.slice(0, 200), reply: got.response, promptTokens: got.prompt_eval_count });
    out.push(linesOfBody(body, sentences).map((l) => l.text).join("\n"));
  }
  const cbook = `# control\n\n${out.join("\n\n* * *\n\n")}\n`;
  fs.writeFileSync(path.join(dir, `control.revised.seed${seed}.book.md`), cbook);
  const renamed = plan.find((c) => c.kind === "rename");
  const lefts = plan.map((c) => (c.kind === "rename" ? oldLeft(cbook, { who: null, word: c.who }) : oldLeft(cbook, { who: c.who === renamed?.who ? renamed.to : c.who, word: detail(cast.find((x) => x.name === (c.who === renamed?.who ? renamed.to : c.who)) ?? {}, c.label) ?? "" })));
  const d = diff(start, cbook);
  const row = { change: "control: chunked rewrite of every part with all three changes stated", asks, linesChanged: d.changed, linesSame: d.same, oldLeft: lefts, ms: Date.now() - t0 };
  report.push(row);
  console.log(JSON.stringify(row));
}
fs.writeFileSync(path.join(dir, `revise.seed${seed}.json`), JSON.stringify(report, null, 1));
console.log("REVISE-DONE");
