// notebook-learn.mjs — HOW TO ANALYSE IS LEARNED, NEVER PRESET.
//
// Fold invariant: A METHOD ENTERS THE LIBRARY ONLY BY PASSING THE GATE, AND THE GATE IS THE SAME WHO WROTE IT.
// Nothing here knows how to analyse anything. A method arrives from one of two places —
//   a MOUTH (a language model, injected; it writes {name, desc, claim, check, control} for a question), or
//   a PERSON (`/learn`: their own check and control cells, generalised by swapping the file and column names
//   they used for placeholders) —
// and is admitted only if, on the real data:  it runs; it states its own #scope, #result and #finding; it gives the
// SAME answer twice (seeded); its CONTROL — the same claim aimed at data where it is false by construction — comes
// back false; and it does not hard-code the file or column it was learned on. A candidate that fails is refused with
// the reason (a mouth gets it back to repair, at most MAX_REPAIRS times). What is admitted is stored append-only, with
// its lineage and the runs that admitted it, and may be conceded later — never deleted.
//
// The store is one JSONL file (ER7_LEARNED_DIR, default ~/.er7/learned/analyses.jsonl), shared by every notebook.
import fs from "node:fs"; import path from "node:path";
import { createHash } from "node:crypto";
import { tokenize } from "../../organs/source.js";
import { runPython } from "./notebook-run.mjs";
import { parseRun } from "./bench.mjs";

export { ANALYSIS_SCHEMA, library, store, concede, recordUse, verify as verifyStore, switchAnalysis, switchAll, history, skillId } from "../../organs/analysis-store.js";
import { library, store } from "../../organs/analysis-store.js";
export const MAX_REPAIRS = 2; // declared: a mouth gets its refusal back this many times
const sha = (s) => createHash("sha256").update(s).digest("hex");
export const fill = (tpl, F, C) => String(tpl).replaceAll("{{FILE}}", F).replaceAll("{{COL}}", C);

// ── retrieval: which learned methods might answer this question ────────────
const stem = (w) => w.replace(/(ies|es|s)$/, "");
const toks = (s) => new Set(tokenize(String(s).replace(/[-\/_]/g, " ")).map(stem));
export function retrieve(lib, question) {
  const q = toks(question);
  return lib.map((s) => ({ skill: s, hit: [...toks(`${s.name} ${s.desc} ${s.claim}`)].filter((t) => q.has(t)) })).filter((x) => x.hit.length).sort((a, b) => b.hit.length - a.hit.length);
}

// ── the gate ───────────────────────────────────────────────────────────────
const FORBIDDEN = /\b(subprocess|socket|shutil|os\.system|os\.popen|__import__|importlib|ctypes)\b|\b(eval|exec)\s*\(|\bopen\s*\([^)]*['"][wa]/;
const GENERIC = (c) => ["file", "data", "x", "u"].includes(c);
/** admit(cand, { file, cols, files, dir? }) -> { ok:true, evidence } | { ok:false, reason }
 *  `cols` are the numeric columns available: the first is what the candidate is run on, the rest test generalisation. */
export function admit(cand, { file: F, cols, files }) {
  const need = ["name", "desc", "claim", "check", "control"]; for (const k of need) if (!String(cand?.[k] ?? "").trim()) return { ok: false, reason: `the candidate has no ${k}` };
  for (const k of ["check", "control"]) {
    if (!cand[k].includes("{{FILE}}") || !cand[k].includes("{{COL}}")) return { ok: false, reason: `the ${k} must use {{FILE}} and {{COL}} placeholders so it can be applied to other columns and files` };
    if (FORBIDDEN.test(cand[k])) return { ok: false, reason: `the ${k} uses something a notebook cell does not need (${cand[k].match(FORBIDDEN)[0]})` };
    const bare = cand[k].replaceAll("{{FILE}}", "").replaceAll("{{COL}}", "");
    if (bare.includes(F) || cols.some((c) => !GENERIC(c) && c.length > 2 && bare.includes(`"${c}"`))) return { ok: false, reason: `the ${k} hard-codes the file or a column name; use the placeholders` };
  }
  if (!cand.claim.includes("{{COL}}")) return { ok: false, reason: "the claim must mention {{COL}}" };
  const [c0, ...rest] = cols; const runs = [];
  const go = (role, code, col) => { const r = runPython(fill(code, F, col), files); const p = parseRun(r.output); runs.push({ role, col, ok: r.ok, result: p.result, scope: p.scope.kind, codeSha: sha(code).slice(0, 12), ms: r.ms }); return { ...r, ...p }; };
  const a = go("check", cand.check, c0);
  if (!a.ok) return { ok: false, reason: `the check did not run: ${a.output.split("\n").filter(Boolean).slice(-2).join(" | ").slice(0, 300)}` };
  if (a.scope.kind === "undeclared") return { ok: false, reason: "the check must print its own #scope (scope_range / scope_sample / scope_instance)" };
  if (a.result === null) return { ok: false, reason: "the check must print its own #result (result(True/False))" };
  if (!/^#finding /m.test(a.output)) return { ok: false, reason: 'the check must print a line starting "#finding " saying what it measured, in numbers' };
  const b = go("check-again", cand.check, c0);
  if (b.result !== a.result || (b.output.match(/^#finding .*$/m) ?? [])[0] !== (a.output.match(/^#finding .*$/m) ?? [])[0]) return { ok: false, reason: "the check gave a different answer the second time — seed everything (numpy default_rng(seed), a fixed seed in scope_sample)" };
  const c = go("control", cand.control, c0);
  if (!c.ok) return { ok: false, reason: `the control did not run: ${c.output.split("\n").filter(Boolean).slice(-2).join(" | ").slice(0, 300)}` };
  if (c.scope.kind === "undeclared" || c.result === null) return { ok: false, reason: "the control must print its own #scope and #result too" };
  if (c.result !== false) return { ok: false, reason: "the control did NOT fail: it says the claim holds on data where it is false by construction (shuffle in time, phase-randomise, swap labels…), so the check cannot tell a real effect from its own artefact" };
  let general = "untested: only one numeric column was available";
  if (rest.length) { const d = go("other-column", cand.check, rest[0]); if (!d.ok) return { ok: false, reason: `the check ran on ${c0} but failed on ${rest[0]}: ${d.output.split("\n").filter(Boolean).slice(-1)[0]?.slice(0, 200)}` }; if (d.scope.kind === "undeclared" || d.result === null) return { ok: false, reason: `on ${rest[0]} the check did not state its scope and result` }; const fnd = (d.output.match(/^#finding .*$/m) ?? [""])[0]; if (!/^#finding /.test(fnd)) return { ok: false, reason: `on ${rest[0]} the check printed no #finding` }; if (new RegExp(`\\b${c0.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(fnd)) return { ok: false, reason: `on ${rest[0]} the finding still names ${c0} — a method that reports the column it was learned on says something false about every other; use {{COL}} in the text it prints too` }; general = `ran on ${rest[0]} too`; }
  return { ok: true, evidence: { runs, generalisation: general, finding: (a.output.match(/^#finding (.*)$/m) ?? [])[1] } };
}

/** generate — ask the mouth for a method, run it through the gate, hand the refusal back to be repaired. */
export async function generate({ question, cols, file: F, files, mouth, dir, tools = "", examples = [] }) {
  const attempts = []; let feedback = null, prev = null;
  for (let i = 0; i <= MAX_REPAIRS; i++) {
    const cand = await mouth({ question, columns: cols, file: F, tools, examples, feedback, previous: prev });
    const g = admit(cand, { file: F, cols, files });
    attempts.push({ name: cand?.name ?? null, ok: g.ok, reason: g.ok ? null : g.reason });
    if (g.ok) { const st = store(dir, cand, { question, mouth: cand.by ?? "model", file: F }, g.evidence); return { ok: true, id: st.id, existing: st.existing, cand, evidence: g.evidence, attempts }; }
    feedback = g.reason; prev = cand;
  }
  return { ok: false, attempts, reason: attempts.at(-1).reason };
}

/** learnFrom — the person's own check + control cells become a method. `names` are the literal file and column strings
 *  their cells used; they are swapped for placeholders, then the result must pass the SAME gate. */
export function learnFrom({ name, desc, claim, checkCode, controlCode, usedFile, usedCol, cols, files, dir, by }) {
  const word = new RegExp(`(?<![\\w.])${usedCol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "g");
  // the file name only inside quotes; the column name ANYWHERE it stands as a word (a printed sentence that says "u_mps" would lie on another column)
  const sw = (s) => s.replaceAll(`"${usedFile}"`, `"{{FILE}}"`).replaceAll(`'${usedFile}'`, `'{{FILE}}'`).replace(word, "{{COL}}");
  const cand = { name, desc, claim: claim.replaceAll(usedCol, "{{COL}}"), check: sw(checkCode), control: sw(controlCode), by };
  const g = admit(cand, { file: usedFile, cols: [usedCol, ...cols.filter((c) => c !== usedCol)], files });
  if (!g.ok) return g;
  const st = store(dir, cand, { question: desc, mouth: by, file: usedFile }, g.evidence);
  return { ok: true, id: st.id, existing: st.existing, evidence: g.evidence };
}

// ── the mouth: Ollama, pointing nowhere — it WRITES, so everything it writes goes through the gate ──
export function ollamaMouth({ url = process.env.ER7_MOUTH_URL ?? process.env.ER7_OLLAMA_URL, model = process.env.ER7_NB_MODEL } = {}) {
  if (!url || !model) return null;
  const schema = { type: "object", properties: Object.fromEntries(["name", "desc", "claim", "check", "control"].map((k) => [k, { type: "string" }])), required: ["name", "desc", "claim", "check", "control"] };
  return async ({ question, columns, file: F, tools, examples, feedback, previous }) => {
    const msg = `You write a small, auditable python analysis for a scientist's notebook. Answer the question about a column of a data file.
Rules: use the placeholders {{FILE}} and {{COL}} (never the real names). Seed every random draw. The check must print a line starting "#finding " with the numbers it measured, then call scope_range/scope_sample/scope_instance and result(True/False). The claim is a sentence with {{COL}} in it that result(True) would support. The control is the SAME test aimed at a version of the data where the claim is false by construction (shuffle in time, phase-randomise, …), and it must print its own scope and result(False).
Tools available in every cell:\n${tools}
${examples.length ? `Methods already learned here (style reference):\n${examples.map((e) => `--- ${e.name}\n${e.check}`).join("\n")}\n` : ""}
Question: ${question}\nFile: ${F}; numeric columns: ${columns.join(", ")}
${feedback ? `Your previous attempt was refused: ${feedback}\nPrevious attempt:\n${JSON.stringify(previous)}\n` : ""}`;
    const r = await fetch(`${url}/api/chat`, { method: "POST", body: JSON.stringify({ model, stream: false, format: schema, options: { temperature: 0 }, messages: [{ role: "user", content: msg }] }) });
    return { ...JSON.parse((await r.json()).message.content), by: `model:${model}` };
  };
}
export function toolDocs() {
  const here = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../organs/er7py");
  return ["er7.py", "turb.py"].map((f) => (fs.readFileSync(path.join(here, f), "utf8").match(/"""([\s\S]*?)"""/) ?? [])[1]?.trim() ?? "").join("\n\n");
}
