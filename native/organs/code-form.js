// Handle: Hora — Simon's watchmaker who built in stable sub-assemblies, so an
// interruption cost him one part and never the watch. A program the mouth
// cannot hold is built one function at a time from a record that holds the
// design, and tested as a whole.
//
// code-form.js — CODE THROUGH THE ONE PIPELINE, the way prose runs through
// long-form.js. The universe is a WORKSPACE (organs/universe.js): a claim is
// known by the tests it passes. In dependency order:
//
//   INS   the design on the record — modules and functions, each with a
//         signature and one line of what it does (the person's stipulation,
//         witness "request"), or the mouth's if a talk build made it
//   CON   which function calls which, asked of the mouth one function at a
//         time and heard as bonds ("calls": a relation between two things on
//         the record, typed CON by claim-acts)
//   DEF   a body per function, written from a BOUNDED working note: the
//         program, the module, the function's own line, the signatures and
//         first lines of the functions it calls — the carried ground — and
//         never the rest of the program
//   SYN   the files assembled from the parts: a module per module, imports
//         derived from the bonds, an index re-exporting all
//   EVA   the test suite run for real; a failing test names the functions it
//         holds to account in its title; a module that will not parse names
//         the function whose lines hold the error
//   REC   a failing function is written again with the failure in its note,
//         callees first; the new body is kept only if the tests it is named
//         in fail less, else conceded — one revision at a time, tested alone
//
// The mouth never sees the tests. Every ask is bounded; every body is a claim
// with its premises; every revision is on the record. No regular expressions.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { makeNotes } from "../kernel/notes.js";
import { jsCheckSyntax } from "../adapters/code/py-engine.js";

export const CODE_FORM_SCHEMA = "CodeForm@1";
/** Draws for one body before the part is declared void — set by hand
 *  2026-09-28, long-form's own BODY_TRIES. */
export const BODY_TRIES = 3;
/** Revision rounds after the first build — set by hand 2026-09-28: the
 *  code loop's own DEFAULT_MAX_ROUNDS. */
export const ROUNDS = 3;
/** Tokens a body may run to — set by hand 2026-09-28: the longest reference
 *  function (parse) is ~330 tokens. */
export const BODY_TOKENS = 450;
/** How much of a callee's line the note carries — set by hand 2026-09-28:
 *  its first sentence, so the note stays bounded whatever the design says. */
const firstSentence = (s) => { const t = String(s); const i = t.indexOf(". "); return i > 0 ? t.slice(0, i + 1) : t; };
const sha8 = (t) => createHash("sha256").update(String(t)).digest("hex").slice(0, 8);

export function makeTextStore(init = {}) {
  const m = new Map(Object.entries(init));
  return { put: (t) => { const a = `sha:${sha8(t)}`; m.set(a, t); return a; }, get: (a) => m.get(a) ?? null, toJSON: () => Object.fromEntries(m) };
}

/** The balanced function declaration named `name` in `text`, or null. */
export function extractFunction(text, name) {
  const t = String(text);
  const heads = [`function ${name}(`, `async function ${name}(`];
  let at = -1;
  for (const h of heads) { const i = t.indexOf(h); if (i >= 0 && (at < 0 || i < at)) at = i; }
  if (at < 0) return null;
  const open = t.indexOf("{", at);
  if (open < 0) return null;
  let depth = 0, i = open, str = null;
  while (i < t.length) {
    const c = t[i], n = t[i + 1];
    if (str) { if (c === "\\") { i += 2; continue; } if (c === str) str = null; i++; continue; }
    if (c === "\"" || c === "'" || c === "`") { str = c; i++; continue; }
    if (c === "/" && n === "/") { while (i < t.length && t[i] !== "\n") i++; continue; }
    if (c === "/" && n === "*") { const e = t.indexOf("*/", i + 2); i = e < 0 ? t.length : e + 2; continue; }
    if (c === "{") depth++;
    if (c === "}") { depth--; if (depth === 0) return t.slice(at, i + 1); }
    i++;
  }
  return null;
}

/** Names from a "calls" reply: the known names it mentions, in order. */
export function namesIn(reply, known) {
  const words = String(reply).split("\n")[0].split(" ").flatMap((w) => w.split(",")).map((w) => { let x = w.trim(); while (x && !((x.at(-1) >= "a" && x.at(-1) <= "z") || (x.at(-1) >= "A" && x.at(-1) <= "Z") || (x.at(-1) >= "0" && x.at(-1) <= "9") || x.at(-1) === "_")) x = x.slice(0, -1); while (x && !((x[0] >= "a" && x[0] <= "z") || (x[0] >= "A" && x[0] <= "Z") || x[0] === "_")) x = x.slice(1); return x; }).filter(Boolean);
  const out = [];
  for (const w of words) { const hit = known.find((k) => k === w || k.toLowerCase() === w.toLowerCase()); if (hit && !out.includes(hit)) out.push(hit); }
  return out;
}

/** TAP from node --test: which tests passed, which failed and whom they name. */
export function readTap(out) {
  const lines = String(out).split("\n");
  const passed = [], failed = [];
  let cur = null;
  for (const l of lines) {
    const s = l.trimStart();
    if (s.startsWith("ok ") || s.startsWith("not ok ")) {
      const title = s.slice(s.indexOf(" - ") + 3).trim();
      const parts = []; let i = title.indexOf("["); while (i >= 0) { const j = title.indexOf("]", i); if (j < 0) break; parts.push(...title.slice(i + 1, j).split(",").map((x) => x.trim()).filter(Boolean)); i = title.indexOf("[", j); }
      cur = { title, parts, detail: [] };
      (s.startsWith("ok ") ? passed : failed).push(cur);
      if (s.startsWith("ok ")) cur = null;
      continue;
    }
    if (cur && (s.startsWith("error:") || s.startsWith("expected") || s.startsWith("actual") || s.startsWith("+ ") || s.startsWith("- ") || s.includes("Error") || s.startsWith("message:"))) { if (cur.detail.length < 6) cur.detail.push(s.slice(0, 160)); }
  }
  // the whole suite failing to load leaves no ok lines at all
  const loaded = passed.length + failed.length > 0;
  return { passed, failed, loaded, total: passed.length + failed.length };
}

/**
 * makeCodeForm({ ask, mouth, log, spec, testFile })
 *   ask(prompt, { stage, attempt, numPredict }) -> string | { response, prompt_eval_count }
 *   spec  { program, modules: [{ name, functions: [{ name, signature, says }] }] }
 *   testFile  the suite's path (copied into the workspace; its imports name ./index.js)
 */
export function makeCodeForm({ ask, mouth = "mouth", log = () => {}, spec, testFile }) {
  const N = makeNotes();
  let asks = 0;
  const say = async (prompt, opts) => {
    asks++;
    const r = await ask(prompt, { ...opts, attempt: opts.attempt ?? 0 });
    return typeof r === "string" ? { text: r, promptTokens: null } : { text: String(r?.response ?? ""), promptTokens: r?.prompt_eval_count ?? null };
  };
  const fns = spec.modules.flatMap((m, mi) => m.functions.map((f, fi) => ({ ...f, module: m.name, id: `function#${10 + mi * 20 + fi}`, moduleId: `module#${2 + mi}`, position: fi + 1 })));
  const byName = new Map(fns.map((f) => [f.name, f]));

  /** INS — the design on the record, the person's own words. */
  function stipulate() {
    let notes = N.createNotes({});
    const h = (end1, label, end2, because = "the design") => { notes = N.hear(notes, { end1, label, end2, witness: "request", because }); };
    h("program#1", "exists", "program"); h("program#1", "named", spec.program);
    spec.modules.forEach((m, mi) => { const id = `module#${2 + mi}`; h(id, "exists", "module"); h("program#1", "has", id); h(id, "position", String(mi + 1)); h(id, "named", m.name); });
    for (const f of fns) { h(f.id, "exists", "function"); h(f.moduleId, "has", f.id); h(f.id, "position", String(f.position)); h(f.id, "named", f.name); h(f.id, "signature", f.signature); h(f.id, "says", f.says); }
    return notes;
  }
  const noteId = (notes, end1, label) => N.fold(notes).find((n) => n.end1 === end1 && n.label === label)?.id ?? null;

  /** CON — which function calls which, asked one function at a time. */
  async function askCalls({ notes }) {
    const listed = fns.map((f) => `${f.signature} — ${firstSentence(f.says)}`).join("\n");
    for (const f of fns) {
      const others = fns.filter((x) => x !== f).map((x) => x.name);
      const prompt = `The program is ${spec.program}. Its functions:\n${listed}\n\nWhich of the other functions does ${f.name} call? Answer with their names separated by commas, or "none".\n\n${f.name} calls:`;
      const got = await say(prompt, { stage: `calls:${f.name}`, numPredict: 40 });
      let reply = got.text.trim();
      if (reply.toLowerCase().startsWith(`${f.name.toLowerCase()} calls:`)) reply = reply.slice(f.name.length + 7).trim();
      const names = namesIn(reply, others);
      for (const n of names) notes = N.hear(notes, { end1: f.id, label: "calls", end2: byName.get(n).id, witness: `talk:${mouth}#ask${asks}`, because: `${f.name} calls: ${reply.split("\n")[0].slice(0, 80)}` });
      log({ kind: "calls", fn: f.name, reply: reply.slice(0, 120), names, promptTokens: got.promptTokens });
    }
    return { notes, asks };
  }
  const calleesOf = (notes, f) => N.fold(notes).filter((n) => n.end1 === f.id && n.label === "calls").map((n) => fns.find((x) => x.id === n.end2)).filter(Boolean);

  /** DEF — the bounded working note for one function. */
  function workingNote(notes, f, failures = []) {
    const lines = [`The program is ${spec.program}.`, `This is the module ${f.module}.`, `${f.signature} — ${f.says}`];
    const callees = calleesOf(notes, f);
    for (const c of callees) lines.push(`It may call ${c.signature} — ${firstSentence(c.says)}${c.module !== f.module ? " (already imported)" : ""}`);
    for (const x of failures) lines.push(`A test failed: ${x}`);
    const anchor = `function ${f.name}(`;
    return { prompt: `${lines.join("\n")}\n\nWrite the function ${f.name} in JavaScript, as a plain function declaration. Write only the code.\n\n${anchor}`, anchor, premises: [noteId(notes, f.id, "signature"), noteId(notes, f.id, "says"), ...N.fold(notes).filter((n) => n.end1 === f.id && n.label === "calls").map((n) => n.id)].filter(Boolean) };
  }
  const bodyOf = (notes, store, f) => { const n = N.fold(notes).find((x) => x.end1 === f.id && x.label === "body"); return n ? { note: n, text: store.get(n.end2) } : null; };

  /** One body drawn, checked for syntax, heard. Returns notes, or null. */
  async function drawBody({ notes, store, f, failures = [], round = 0 }) {
    const note = workingNote(notes, f, failures);
    for (let t = 0; t < BODY_TRIES; t++) {
      const got = await say(note.prompt, { stage: `body:${f.name}`, attempt: t, numPredict: BODY_TOKENS });
      let reply = got.text.trim();
      const text = reply.startsWith("function") || reply.startsWith("async function") || reply.startsWith("export") ? reply.split("export function").join("function") : `${note.anchor}${reply}`;
      const body = extractFunction(text, f.name);
      const syntax = body ? jsCheckSyntax(`${body}\n`, "check.mjs") : null;
      log({ kind: "body_turn", fn: f.name, round, attempt: t, prompt: note.prompt, reply: got.text, extracted: !!body, syntaxOk: syntax?.ok ?? null, promptTokens: got.promptTokens });
      if (!body || (syntax && !syntax.ok)) continue;
      const prev = bodyOf(notes, store, f);
      if (prev) { const d = N.concede(notes, prev.note.id, { trigger: `written again in round ${round}: ${failures[0] ?? "a failing test"}` }); if (!d.refused) notes = d.log; }
      notes = N.hear(notes, { end1: f.id, label: "body", end2: store.put(body), witness: `talk:${mouth}#body${asks}`, because: `${failures.length ? `after ${failures.length} failure(s) ` : ""}[premises: ${JSON.stringify(note.premises)}]` });
      return { notes, promptTokens: got.promptTokens };
    }
    return null;
  }

  async function writeBodies({ notes, store = makeTextStore() }) {
    const voids = [], prompts = [];
    for (const f of fns) {
      if (bodyOf(notes, store, f)) continue;
      const r = await drawBody({ notes, store, f });
      if (r) { notes = r.notes; prompts.push(r.promptTokens); }
      else { const v = N.declareVoid(notes, { end1: f.id, label: "body", scope: { sources: [`talk:${mouth}`], read: BODY_TRIES }, because: `asked ${BODY_TRIES} times, no function ${f.name} heard` }); if (!v.refused) notes = v.log; voids.push(f.name); }
    }
    return { notes, store, voids, prompts, asks };
  }

  /** SYN — the files from the parts, imports from the bonds. */
  function assemble({ notes, store, dir }) {
    fs.mkdirSync(dir, { recursive: true });
    // the workspace is an ES-module package of its own, wherever it sits
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module" }));
    const map = [];
    for (const m of spec.modules) {
      const here = fns.filter((f) => f.module === m.name);
      const imports = new Map();
      for (const f of here) for (const c of calleesOf(notes, f)) if (c.module !== m.name) imports.set(c.module, [...new Set([...(imports.get(c.module) ?? []), c.name])]);
      const head = [...imports].map(([mod, names]) => `import { ${names.join(", ")} } from "./${mod}.js";`);
      const chunks = [];
      let line = head.length + (head.length ? 2 : 1);
      for (const f of here) {
        const b = bodyOf(notes, store, f);
        const text = b ? `export ${b.text}` : `export function ${f.name}() { throw new Error("${f.name}: no body on the record"); }`;
        const n = text.split("\n").length;
        map.push({ module: m.name, fn: f.name, from: line, to: line + n - 1, note: b?.note.id ?? null });
        chunks.push(text); line += n + 1;
      }
      fs.writeFileSync(path.join(dir, `${m.name}.js`), `${head.length ? `${head.join("\n")}\n\n` : ""}${chunks.join("\n\n")}\n`);
    }
    fs.writeFileSync(path.join(dir, "index.js"), spec.modules.map((m) => `export { ${m.functions.map((f) => f.name).join(", ")} } from "./${m.name}.js";`).join("\n") + "\n");
    fs.copyFileSync(testFile, path.join(dir, path.basename(testFile)));
    return { map };
  }

  /** EVA — the suite run for real; failures attributed to functions. */
  function test({ dir, map }) {
    // a child of node's own test runner would report to its parent, not in TAP:
    // the runner's context is dropped and the reporter named
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const r = spawnSync("node", ["--test", "--test-reporter=tap", path.basename(testFile)], { cwd: dir, encoding: "utf8", timeout: 60000, env });
    const tap = readTap(`${r.stdout}\n${r.stderr}`);
    const blame = new Map();
    if (!tap.loaded) {
      // a module that will not load: node --check each, and the function whose lines hold the error is to blame
      for (const m of spec.modules) {
        const c = spawnSync("node", ["--check", `${m.name}.js`], { cwd: dir, encoding: "utf8", timeout: 15000 });
        if (c.status === 0) continue;
        const err = String(c.stderr);
        const first = err.split("\n")[0];
        const at = first.lastIndexOf(":");
        const ln = Number(first.slice(at + 1));
        const hit = map.find((x) => x.module === m.name && Number.isFinite(ln) && ln >= x.from && ln <= x.to) ?? map.find((x) => x.module === m.name);
        if (hit) blame.set(hit.fn, [...(blame.get(hit.fn) ?? []), `the module ${m.name} does not parse: ${err.split("\n").slice(1, 4).join(" ").trim().slice(0, 140)}`]);
      }
      // a runtime error at load (a bad import) blames the importer's module's functions
      if (!blame.size) { const err = String(r.stderr).split("\n").filter((l) => l.includes("Error") || l.includes("does not provide")).slice(0, 2).join(" "); for (const f of fns) blame.set(f.name, [`the program does not load: ${err.slice(0, 140)}`]); }
    }
    for (const t of tap.failed) for (const p of t.parts) blame.set(p, [...(blame.get(p) ?? []), `${t.title.slice(t.title.indexOf("]") + 1).trim()}: ${t.detail.filter((d) => !d.startsWith("error:")).slice(0, 3).join("; ") || t.detail[0] || "failed"}`]);
    return { passed: tap.passed.length, failed: tap.failed.length, total: tap.total, loaded: tap.loaded, blame, titles: tap.failed.map((t) => t.title) };
  }

  /** REC — failing functions written again, callees first, each kept only if
   *  the tests naming it fail less. */
  async function revise({ notes, store, dir, rounds = ROUNDS }) {
    const history = [];
    let { map } = assemble({ notes, store, dir });
    let now = test({ dir, map });
    history.push({ round: 0, passed: now.passed, total: now.total, loaded: now.loaded, failing: [...now.blame.keys()] });
    log({ kind: "test", round: 0, ...history[0], titles: now.titles });
    for (let round = 1; round <= rounds && now.blame.size; round++) {
      // callees first: a caller's failure may be its callee's
      const order = fns.filter((f) => now.blame.has(f.name)).sort((a, b) => (calleesOf(notes, b).includes(a) ? -1 : calleesOf(notes, a).includes(b) ? 1 : 0));
      const kept = [], undone = [];
      for (const f of order) {
        const failures = now.blame.get(f.name) ?? [];
        if (!failures.length) continue;
        const before = bodyOf(notes, store, f);
        const r = await drawBody({ notes, store, f, failures, round });
        if (!r) { undone.push(f.name); continue; }
        const trialMap = assemble({ notes: r.notes, store, dir }).map;
        const after = test({ dir, map: trialMap });
        const mine = (t) => (t.blame.get(f.name) ?? []).length;
        const keep = after.loaded && (after.passed > now.passed || (after.passed === now.passed && mine(after) < mine(now)));
        log({ kind: keep ? "revision_kept" : "revision_undone", fn: f.name, round, before: { passed: now.passed, mine: mine(now) }, after: { passed: after.passed, mine: mine(after), loaded: after.loaded } });
        if (keep) { notes = r.notes; map = trialMap; now = after; kept.push(f.name); }
        else {
          // the new body conceded, the old one heard again (never resurrected: a fresh claim with the same text)
          const fresh = N.fold(r.notes).find((x) => x.end1 === f.id && x.label === "body");
          let back = r.notes;
          if (fresh) { const d = N.concede(back, fresh.id, { trigger: `undone: the tests naming ${f.name} did not fail less` }); if (!d.refused) back = d.log; }
          if (before) back = N.hear(back, { end1: f.id, label: "body", end2: before.note.end2, witness: before.note.witnesses?.[0] ?? `talk:${mouth}`, because: `kept after round ${round}: the revision was undone` });
          notes = back; map = assemble({ notes, store, dir }).map; now = test({ dir, map }); undone.push(f.name);
        }
      }
      history.push({ round, passed: now.passed, total: now.total, loaded: now.loaded, failing: [...now.blame.keys()], kept, undone });
      log({ kind: "test", round, ...history.at(-1), titles: now.titles });
      if (!kept.length) break;
    }
    return { notes, store, history, asks };
  }

  return { schema: CODE_FORM_SCHEMA, fns, stipulate, askCalls, workingNote, writeBodies, assemble, test, revise, N, asksSoFar: () => asks };
}
