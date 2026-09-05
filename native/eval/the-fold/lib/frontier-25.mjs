// frontier-25.mjs — twenty-five tasks "you allegedly need a frontier model for",
// each claimed or witnessed by an organ this instrument ALREADY HAS.
//
// The user's ask (2026-09-05): come up with 25 tasks across coding, math,
// creative writing and the rest that supposedly need a frontier model, then
// test and build the capacities into the-fold and eoreader7 — and, on the
// redirect the same day, "we've done a lot of work already on these
// capacities so it shouldn't be net new." So every task below names the
// EXISTING organ that answers it or judges the mouth's answer, and the two
// arms measure two different things:
//
//   the zero-call arm (read by tests/frontier-25.test.js on every suite run)
//     · a task an organ CLAIMS outright is answered with no model at all —
//       arithmetic.js's pure door and its shaped questions and calendar
//       (the-fold), the product assay's reader over its built corpus, the
//       measuring door over decoded media
//     · a task an organ WITNESSES (the mouth writes, the machine judges) is
//       pinned by a CONTROL THAT CAN FAIL (II.23): a reference answer must
//       pass the witness and a deliberately wrong one must fail it, or the
//       witness measures nothing. The witnesses are skills.js/skill-runner
//       (a candidate skill is admitted only if the task's check passes in
//       the vm sandbox — P10 made mechanical), serve.mjs's recorded /api/run
//       for python, term.js's csvTable + sql.js for the sql counterpart,
//       shape.js's declared form, arithmetic.js's claimedValue for a number
//       the mouth states
//   the mouth arm (the driver, MODEL=…, a dated record)
//     · the same tasks through holon.js's real runHolonicTask, the witness
//       judging the draft, ONE retry with the witness's result line fed
//       back (the result, never the reasoning — the model is the mouth)
//
// A task the organ cannot claim and no witness can judge is not here —
// that is the honest edge of what "allegedly needs a frontier model" means
// for this instrument today, and the results doc names what was left out.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

export const NATIVE = new URL("../../../", import.meta.url).pathname;
export const FOLD = new URL("../../../../../the-fold/", import.meta.url).pathname;
const requireFold = createRequire(`${FOLD}package.json`);

// ── the fold's organs, lazily, so the fixture's TASKS can be read without them
let organsPromise = null;
export function foldOrgans() {
  if (!organsPromise) {
    organsPromise = (async () => {
      const math = requireFold("mathjs");
      const arithmetic = await import(`${FOLD}arithmetic.js`);
      const shape = await import(`${FOLD}shape.js`);
      const skills = await import(`${FOLD}skills.js`);
      const runner = await import(`${FOLD}skill-runner.mjs`);
      const term = await import(`${FOLD}term.js`);
      const SQL = await requireFold("sql.js")();
      return { math, arithmetic, shape, skills, runner, term, SQL };
    })();
  }
  return organsPromise;
}

// ── the material the assay tasks read: the product assay's own built corpus
let assayPromise = null;
export function assay() {
  if (!assayPromise) assayPromise = import("./product-assay.mjs").then(async (m) => ({ m, run: await m.runProductAssay() }));
  return assayPromise;
}

export const SALES_CSV = "city,amount\nAustin,10\nDenver,12\nAustin,20\n";
export const FIX = new URL("../fixtures/media/", import.meta.url).pathname;

// ── THE TASKS ──────────────────────────────────────────────────────────────
// claim: which organ claims (answers) or witnesses (judges) the task.
export const TASKS = Object.freeze([
  // math — arithmetic.js claims these outright: computed, never generated
  { id: "m1", category: "math", claim: "arithmetic", prompt: "What is 17 times 24?", expected: 408 },
  { id: "m2", category: "math", claim: "arithmetic", prompt: "What is 15 percent of 240?", expected: 36 },
  { id: "m3", category: "math", claim: "arithmetic", prompt: "Convert 5 miles to km", expected: 8.04672 },
  { id: "m4", category: "math", claim: "arithmetic", prompt: "Solve 3x + 5 = 20", expected: 5 },
  { id: "m5", category: "math", claim: "arithmetic", prompt: "What is 10 choose 3?", expected: 120 },
  { id: "m6", category: "math", claim: "arithmetic", prompt: "What is the median of 3, 9, 1, 7, 5?", expected: 5 },
  { id: "m7", category: "math", claim: "arithmetic", prompt: "What is the derivative of x^3 + 2x at x = 2?", expected: 14 },
  { id: "m8", category: "math", claim: "arithmetic", prompt: "How many days are there between 2026-01-01 and 2026-09-05?", expected: 247 },
  { id: "m9", category: "math", claim: "arithmetic", prompt: "What day of the week was July 4, 1776?", expected: "Thursday" },
  // a number the mouth must state, witnessed by claimedValue against the engine's own computation
  { id: "n1", category: "math", claim: "numeric", prompt: "1000 dollars is invested at 5% annual interest, compounded annually, for 3 years. What is it worth at the end? Give the amount to the cent.", expression: "1000 * 1.05^3", cents: true },
  // coding — a candidate skill, admitted only if the task's own check passes in the sandbox
  {
    id: "c1", category: "coding", claim: "skill", fn: "isPalindrome",
    prompt: "Write a JavaScript function isPalindrome(s) that returns true when s reads the same forwards and backwards, ignoring case and any character that is not a letter or digit. Return only the code in a ```js fence.",
    check: `async (run, organs, assert) => { assert((await run({ args: ["A man, a plan, a canal: Panama"] })) === true, "panama"); assert((await run({ args: ["hello"] })) === false, "hello"); assert((await run({ args: [""] })) === true, "empty"); assert((await run({ args: ["No 'x' in Nixon"] })) === true, "nixon"); }`,
    reference: "function isPalindrome(s) { const t = String(s).toLowerCase().replace(/[^a-z0-9]/g, \"\"); return t === t.split(\"\").reverse().join(\"\"); }",
    wrong: "function isPalindrome(s) { return s === s.split(\"\").reverse().join(\"\"); }",
  },
  {
    id: "c2", category: "coding", claim: "skill", fn: "sumRange",
    prompt: "This JavaScript function is meant to return the sum of every integer from a to b INCLUSIVE, but it has a bug. Fix it and return only the corrected code in a ```js fence.\n\n```js\nfunction sumRange(a, b) { let s = 0; for (let i = a; i < b; i++) s += i; return s; }\n```",
    check: `async (run, organs, assert) => { assert((await run({ args: [1, 5] })) === 15, "1..5"); assert((await run({ args: [3, 3] })) === 3, "3..3"); assert((await run({ args: [-2, 2] })) === 0, "-2..2"); }`,
    reference: "function sumRange(a, b) { let s = 0; for (let i = a; i <= b; i++) s += i; return s; }",
    wrong: "function sumRange(a, b) { let s = 0; for (let i = a; i < b; i++) s += i; return s; }",
  },
  {
    id: "c3", category: "coding", claim: "skill", fn: "groupBy",
    prompt: "Write a JavaScript function groupBy(items, key) that groups an array of objects by the value of the given key and returns an object whose keys are the distinct values and whose values are arrays of the items in their original order. Return only the code in a ```js fence.",
    check: `async (run, organs, assert) => { const out = await run({ args: [[{ t: "a", n: 1 }, { t: "b", n: 2 }, { t: "a", n: 3 }], "t"] }); assert(JSON.stringify(out) === '{"a":[{"t":"a","n":1},{"t":"a","n":3}],"b":[{"t":"b","n":2}]}', "grouped in order: " + JSON.stringify(out)); }`,
    reference: "function groupBy(items, key) { const out = {}; for (const it of items) { (out[it[key]] ??= []).push(it); } return out; }",
    wrong: "function groupBy(items, key) { const out = {}; for (const it of items) { out[it[key]] = it; } return out; }",
  },
  {
    id: "c4", category: "coding", claim: "skill", fn: "isIsoDate",
    prompt: "Write a JavaScript function isIsoDate(s) that returns true only when s is a date in the form YYYY-MM-DD with a month from 01 to 12 and a day from 01 to 31. Use a regular expression. Return only the code in a ```js fence.",
    check: `async (run, organs, assert) => { assert((await run({ args: ["2026-09-05"] })) === true, "valid"); assert((await run({ args: ["2026-13-01"] })) === false, "month 13"); assert((await run({ args: ["26-09-05"] })) === false, "two-digit year"); assert((await run({ args: ["2026-00-10"] })) === false, "month 00"); assert((await run({ args: ["2026-09-32"] })) === false, "day 32"); }`,
    reference: "function isIsoDate(s) { return /^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/.test(String(s)); }",
    wrong: "function isIsoDate(s) { return /^\\d{4}-\\d{2}-\\d{2}$/.test(String(s)); }",
  },
  // python — serve.mjs's recorded /api/run is the runner; the witness is the exact stdout
  {
    id: "p1", category: "coding", claim: "run", lang: "python",
    prompt: "Write a Python script that prints FizzBuzz for the numbers 1 to 15, one per line: Fizz for multiples of 3, Buzz for multiples of 5, FizzBuzz for multiples of both, otherwise the number. Return only the code in a ```python fence.",
    expectStdout: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
    reference: "for i in range(1, 16):\n    print('FizzBuzz' if i % 15 == 0 else 'Fizz' if i % 3 == 0 else 'Buzz' if i % 5 == 0 else i)",
    wrong: "for i in range(1, 16):\n    print('Fizz' if i % 3 == 0 else 'Buzz' if i % 5 == 0 else i)",
  },
  {
    id: "p2", category: "coding", claim: "run", lang: "python",
    prompt: `Here is a CSV:\n\ncity,amount\nAustin,10\nDenver,12\nAustin,20\n\nWrite a Python script (standard library only) that has this CSV text in a string, totals the amount per city, and prints one line per city as city,total, sorted by total descending. Return only the code in a \`\`\`python fence.`,
    expectStdout: "Austin,30\nDenver,12",
    reference: "import csv, io\ndata = 'city,amount\\nAustin,10\\nDenver,12\\nAustin,20\\n'\ntotals = {}\nfor row in csv.DictReader(io.StringIO(data)):\n    totals[row['city']] = totals.get(row['city'], 0) + int(row['amount'])\nfor city, total in sorted(totals.items(), key=lambda kv: -kv[1]):\n    print(f'{city},{total}')",
    wrong: "print('Denver,12')\nprint('Austin,30')",
  },
  // sql — the terminal's .load walk (term.js csvTable) and the same sql.js the sql worker runs
  {
    id: "s1", category: "data", claim: "sql", source: "sales.csv",
    prompt: `A table named sales is loaded with columns city and amount from this CSV:\n\n${SALES_CSV}\nWrite one SQL query that returns the city with the highest total amount and that total, as two columns city and total. Return only the SQL in a \`\`\`sql fence.`,
    expectRows: [["Austin", 30]],
    reference: "select city, sum(amount) as total from sales group by city order by total desc limit 1",
    wrong: "select city, amount as total from sales order by amount desc limit 1",
  },
  // reading — the product assay's reader over its built corpus, one record per question before any mouth speaks
  { id: "a1", category: "reading", claim: "assay", question: 0, prompt: "Who founded the Northgate Observatory?", expects: { end1: "Amelia Hartley", label: "founded" } },
  { id: "a2", category: "reading", claim: "assay", question: 1, prompt: "Did Rowan Vale precede Owen Blythe?", expects: { derived: ["Rowan Vale", "Owen Blythe"] } },
  { id: "a3", category: "reading", claim: "assay", question: 2, prompt: "When did the Northgate Observatory open?", expects: { end2: "in 1889", label: "opened", contested: true } },
  { id: "a4", category: "reading", claim: "void", prompt: "Who catalogued the comets?", verb: "catalogued", names: ["Amelia Hartley", "Rowan Vale", "Marta Quill", "Owen Blythe"] },
  // creative — the form the task declares, checked mechanically (shape.js), the content the mouth's
  { id: "f1", category: "creative", claim: "form", prompt: "Write a four-line acrostic poem spelling FOLD about dawn.", reference: "Fires low\nOver ash\nLight returns\nDawn again", wrong: "The sun comes up\nOver the hill\nLight everywhere\nDay begins" },
  { id: "f2", category: "creative", claim: "form", prompt: "Write one sentence of at least 10 words without the letter e.", reference: "A calm wind drifts by, low and soft, until dark falls on all of us.", wrong: "The evening wind drifts by, low and soft, until the dark settles over everyone." },
  { id: "f3", category: "creative", claim: "form", prompt: "Write a haiku with exactly 3 lines that includes the word river and never uses the word the.", reference: "A river runs cold\nunder a sky of thin light\nstones hold its silence", wrong: "The river runs cold\nunder the sky of thin light\nstones hold the silence" },
  { id: "f4", category: "creative", claim: "form", prompt: "Rewrite 'It rained, so the match was cancelled.' in at most 8 words, using the word because, and end with the word rain.", reference: "The match was cancelled because of rain.", wrong: "The match was cancelled, so it rained all day." },
]);

// media — the measuring door over decoded media: a declaration answered with a placement and an address
export const MEDIA_TASKS = Object.freeze([
  { id: "v1", medium: "image", file: "gradient.png", prompt: "/measure gradient.png", expect: /channels: luminance/ },
  { id: "v2", medium: "image", file: "gradient.png", prompt: "/measure gradient.png channel:luminance frame:1 as:burstiness broken:shuffle draws:200 window:8", expect: /sits above every one of the 200 broken copies/ },
  { id: "v3", medium: "video", file: "cut.mp4", prompt: "/measure cut.mp4 channel:motion frame:1 as:burstiness broken:shuffle draws:200 window:5", expect: /degenerate_ground/, locate: { transition: 19, seconds: 2 } },
  { id: "v4", medium: "pcm", file: "real-60s.wav", prompt: "/measure real-60s.wav channel:rms frame:400 as:burstiness broken:shuffle draws:200 window:20", expect: /sits above every one of the 200 broken copies/ },
  { id: "v5", medium: "wav", file: "tone.wav", prompt: "/measure tone.wav channel:rms frame:400 as:burstiness broken:shuffle draws:200 window:10", expect: /broken copies/, silence: { frames: [40, 59], seconds: [2, 3] } },
]);

// ── helpers ─────────────────────────────────────────────────────────────────
const FENCE_RE = /```([A-Za-z0-9_+-]*)[^\n]*\n([\s\S]*?)```/g;
const LANG_ALIAS = { javascript: "js", js: "js", node: "js", python: "python", py: "python", python3: "python", sql: "sql", sqlite: "sql" };

/** The code a draft carries: the first fence whose tag matches, else the first fence, else the draft when it has no prose sentence. */
export function extractCode(text, lang) {
  const s = String(text ?? "");
  const want = LANG_ALIAS[String(lang ?? "").toLowerCase()] ?? lang;
  const fences = [...s.matchAll(FENCE_RE)].map((m) => ({ tag: LANG_ALIAS[m[1].toLowerCase()] ?? (m[1] || null), code: m[2].trim() }));
  const exact = fences.find((f) => f.tag === want);
  if (exact) return exact.code;
  if (fences.length) return fences[0].code;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const prose = trimmed.split("\n").filter((l) => /^[A-Z][a-z]+(?: [a-z']+){3,}.*[.!?]\s*$/.test(l.trim()));
  return prose.length ? null : trimmed;
}

const near = (a, b) => typeof a === "number" && typeof b === "number" && Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));

/** A candidate skill from the mouth's code: the task's own check is the admission test. */
export function candidateFromCode(task, code) {
  return {
    name: `frontier-${task.id}-${task.fn}`,
    description: `${task.fn} as authored for task ${task.id}; admitted only if the task's check passes`,
    anchors: [`frontier-${task.id}`],
    slots: [{ name: "args", type: "json", required: true }],
    needs: [],
    body: `(slots) => {\n${code}\nreturn (${task.fn})(...slots.args);\n}`,
    check: task.check,
  };
}

// ── the witnesses ───────────────────────────────────────────────────────────
/**
 * Judge an answer to a task. {ok, verdict, detail, organ}. `runPython` is
 * injected by the driver (a POST to serve.mjs's /api/run); without it a
 * python task's witness is `did_not_run`, never a pass.
 */
export async function witness(task, answer, { runPython = null } = {}) {
  const O = await foldOrgans();
  const text = String(answer ?? "");
  switch (task.claim) {
    case "arithmetic": {
      const claimed = O.arithmetic.claimedValue(text);
      const ok = typeof task.expected === "string" ? new RegExp(`\\b${task.expected}\\b`, "i").test(text) : near(claimed, task.expected);
      return { ok, verdict: ok ? "passed" : "failed", detail: `mouth claimed ${typeof task.expected === "string" ? JSON.stringify(text.slice(0, 60)) : claimed}, expected ${task.expected}`, organ: "arithmetic.js::claimedValue" };
    }
    case "numeric": {
      const expected = Math.round(O.math.evaluate(task.expression) * 100) / 100;
      const claimed = O.arithmetic.claimedValue(text);
      const got = claimed == null ? null : Math.round(claimed * 100) / 100;
      const ok = got === expected;
      return { ok, verdict: ok ? "passed" : "failed", detail: `mouth claimed ${got}, engine computes ${task.expression} = ${expected}`, organ: "arithmetic.js::claimedValue vs mathjs" };
    }
    case "skill": {
      const code = extractCode(text, "js");
      if (!code) return { ok: false, verdict: "did_not_run", detail: "no code in the draft", organ: "skill-runner.mjs::admitSkill" };
      const r = await O.runner.admitSkill(O.skills.createSkillLog(), candidateFromCode(task, code), { organs: {}, library: [] });
      return { ok: r.admitted, verdict: r.admitted ? "passed" : "failed", detail: r.admitted ? `admitted ${r.digest?.slice(0, 12)}` : r.reason, organ: "skill-runner.mjs::admitSkill (the task's check in the vm sandbox)" };
    }
    case "run": {
      const code = extractCode(text, task.lang);
      if (!code) return { ok: false, verdict: "did_not_run", detail: "no code in the draft", organ: "serve.mjs /api/run" };
      if (typeof runPython !== "function") return { ok: false, verdict: "did_not_run", detail: "no python runner offered (serve.mjs not booted)", organ: "serve.mjs /api/run" };
      const r = await runPython(code);
      if (r.timedOut) return { ok: false, verdict: "did_not_run", detail: "timed out", organ: "serve.mjs /api/run" };
      const norm = (s) => String(s ?? "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();
      const ok = r.code === 0 && norm(r.stdout) === norm(task.expectStdout);
      return { ok, verdict: r.code === 0 ? (ok ? "passed" : "failed") : "did_not_run", detail: r.code === 0 ? `stdout ${JSON.stringify(norm(r.stdout).slice(0, 80))}` : `exit ${r.code}: ${String(r.stderr).split("\n").filter(Boolean).slice(-1)[0] ?? ""}`, organ: "serve.mjs /api/run (recorded)" };
    }
    case "sql": {
      const code = extractCode(text, "sql");
      if (!code) return { ok: false, verdict: "did_not_run", detail: "no SQL in the draft", organ: "term.js csvTable + sql.js" };
      const table = O.term.csvTable(SALES_CSV);
      const db = new O.SQL.Database();
      try {
        const tname = task.source.replace(/\.[^.]+$/, "");
        db.run(`CREATE TABLE "${tname}" (${table.columns.map((c) => `"${c.name}" ${c.type}`).join(", ")})`);
        const stmt = db.prepare(`INSERT INTO "${tname}" VALUES (${table.columns.map(() => "?").join(", ")})`);
        for (const row of table.rows) stmt.run(row);
        stmt.free();
        const res = db.exec(code.replace(/;\s*$/, ""));
        const rows = res.flatMap((r) => r.values);
        const ok = JSON.stringify(rows) === JSON.stringify(task.expectRows);
        return { ok, verdict: ok ? "passed" : "failed", detail: `rows ${JSON.stringify(rows).slice(0, 80)}, expected ${JSON.stringify(task.expectRows)}`, organ: "term.js csvTable + sql.js (the sql worker's own walk, headless)" };
      } catch (e) {
        return { ok: false, verdict: "did_not_run", detail: e.message, organ: "term.js csvTable + sql.js" };
      } finally {
        db.close();
      }
    }
    case "form": {
      const form = O.shape.declaredForm(task.prompt);
      const f = O.shape.checkForm(O.shape.draftText(text), form);
      return { ok: f.ok, verdict: f.examined.length ? (f.ok ? "passed" : "failed") : "did_not_run", detail: O.shape.formLine(f), organ: "shape.js::declaredForm/checkForm", form: form.form, unexamined: f.unexamined };
    }
    case "assay": {
      const { m, run } = await assay();
      const q = m.QUESTIONS[task.question];
      const want = task.expects.end1 ?? task.expects.end2 ?? task.expects.derived?.[0];
      const ok = new RegExp(want.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(text) && (!task.expects.derived || new RegExp(task.expects.derived[1], "i").test(text) || /\byes\b/i.test(text));
      return { ok, verdict: ok ? "passed" : "failed", detail: `answer ${ok ? "names" : "does not name"} ${want}; the record for "${q.question}" carries ${run.records[task.question].claims.length} claim(s)`, organ: "product-assay record (the reader's own claims)" };
    }
    case "void": {
      const named = task.names.filter((n) => new RegExp(n.split(" ")[1] ?? n, "i").test(text));
      const refuses = /\b(not|no|never|unknown|doesn'?t|does not|cannot|can'?t|isn'?t|nothing|unsupported|absent)\b/i.test(text);
      const ok = named.length === 0 && refuses;
      return { ok, verdict: ok ? "passed" : "failed", detail: named.length ? `names ${named.join(", ")} for a link the material never states` : refuses ? "declares the absence" : "neither names nor refuses", organ: "the void: no note with that verb on the ledger" };
    }
    default:
      return { ok: false, verdict: "did_not_run", detail: `no witness for claim ${task.claim}`, organ: null };
  }
}

// ── the zero-call arm ───────────────────────────────────────────────────────
/** What an organ answers outright, with no mouth. Null for a witnessed task. */
export async function mechanical(task) {
  const O = await foldOrgans();
  if (task.claim === "arithmetic") {
    const r = O.arithmetic.checkQuantity(task.prompt, { math: O.math });
    if (!r) return { ok: false, detail: "arithmetic.js did not claim the question", organ: "arithmetic.js::checkQuantity" };
    if (r.gap) return { ok: false, detail: `${r.expression} — ${r.gap}`, organ: "arithmetic.js::checkQuantity" };
    const ok = typeof task.expected === "string" ? r.value === task.expected : near(r.value, task.expected);
    return { ok, detail: `${r.expression} = ${r.display} — computed, not generated${r.kind ? ` (${r.kind})` : ""}`, organ: "arithmetic.js::checkQuantity", value: r.value };
  }
  if (task.claim === "assay") {
    const { run } = await assay();
    const rec = run.records[task.question];
    const e = task.expects;
    let ok = false;
    let detail = "";
    if (e.derived) {
      const d = (rec.derived ?? []).find((x) => new RegExp(e.derived[0], "i").test(x.subject ?? x.end1 ?? "") && new RegExp(e.derived[1], "i").test(x.object ?? x.end2 ?? ""));
      ok = Boolean(d);
      detail = d ? `derived ${e.derived[0]} —${d.verb ?? d.label}→ ${e.derived[1]} at depth ${d.depth}, resting on ${d.premises?.length ?? "?"} premises` : "not derived";
    } else {
      const c = rec.claims.find((x) => (!e.end1 || x.end1 === e.end1) && (!e.label || x.label === e.label) && (!e.end2 || x.end2 === e.end2));
      ok = Boolean(c) && (!e.contested || (rec.contests?.length ?? 0) > 0);
      detail = c ? `${c.end1} —${c.label}→ ${c.end2} · ${c.spans.length} byte-addressed span(s)${e.contested ? ` · ${rec.contests?.length ?? 0} contest(s) on the record` : ""}` : "no such claim in the record";
    }
    return { ok, detail, organ: "product-assay.mjs record (hypergraph + derivation + contest, 0 calls)" };
  }
  if (task.claim === "void") {
    const { m } = await assay();
    const Or = await m.organs();
    const reading = m.readCorpus(Or, m.CORPUS);
    const notes = Or.hl.foldWithStanding(reading.log);
    const hits = notes.filter((n) => n.verb === task.verb);
    const scope = { sources: [...new Set(notes.flatMap((n) => String(n.sources ?? "").split(/\s*,\s*/)))].filter(Boolean) };
    let declared = null;
    try {
      const d = Or.hl.declareVoid(reading.log, { end1: "?", label: task.verb, end2: "the comets", scope, because: "no note with this verb on the ledger" });
      declared = d?.refused ? null : d;
    } catch { declared = null; }
    const ok = hits.length === 0;
    return { ok, detail: `${hits.length} note(s) with verb "${task.verb}" among ${notes.length}; ${declared ? "void declared with scope " + JSON.stringify(scope) : "void not declared (declareVoid refused or absent) — reported as the count alone"}`, organ: "hyperlexicon fold + notes.declareVoid (P105)" };
  }
  return null;
}

/** The control that can fail: the reference passes the witness, the wrong answer fails it. */
export async function control(task, { runPython = null } = {}) {
  if (!("reference" in task)) return null;
  const wrap = (code) => (task.claim === "skill" ? `\`\`\`js\n${code}\n\`\`\`` : task.claim === "run" ? `\`\`\`python\n${code}\n\`\`\`` : task.claim === "sql" ? `\`\`\`sql\n${code}\n\`\`\`` : code);
  const ref = await witness(task, wrap(task.reference), { runPython });
  const wrong = await witness(task, wrap(task.wrong), { runPython });
  return { refPassed: ref.ok, wrongFailed: !wrong.ok, ref, wrong, ok: ref.ok && !wrong.ok, skipped: ref.verdict === "did_not_run" && wrong.verdict === "did_not_run" ? ref.detail : null };
}

export async function runFrontier25({ runPython = null } = {}) {
  const rows = [];
  for (const task of TASKS) {
    const mech = await mechanical(task);
    const ctrl = await control(task, { runPython });
    rows.push({ id: task.id, category: task.category, claim: task.claim, prompt: task.prompt, mechanical: mech, control: ctrl });
  }
  const claimed = rows.filter((r) => r.mechanical);
  const witnessed = rows.filter((r) => r.control);
  const numbers = {
    tasks: rows.length,
    claimed: claimed.length,
    claimedOk: claimed.filter((r) => r.mechanical.ok).length,
    witnessed: witnessed.length,
    controlsOk: witnessed.filter((r) => r.control.ok).length,
    controlsSkipped: witnessed.filter((r) => r.control.skipped).length,
  };
  return { rows, numbers };
}

// ── media: the measuring door over decoded media ────────────────────────────
export async function runMediaTasks() {
  const nul = await import(`${NATIVE}../nul/index.js`);
  const M = await import(`${NATIVE}organs/measure.js`);
  const img = await import(`${NATIVE}adapters/image/material.js`);
  const vid = await import(`${NATIVE}adapters/video/material.js`);
  const aud = await import(`${NATIVE}adapters/audio/material.js`);
  const reduce = { audio: aud.reduce, image: img.reduce, video: vid.reduce };
  const decoded = {};
  const media = async (t) => {
    if (decoded[t.file]) return decoded[t.file];
    let m;
    if (t.medium === "image") m = { kind: "image", ...(await img.load(FIX + t.file, { w: 64, h: 64 })) };
    else if (t.medium === "video") m = { kind: "video", frames: await vid.load(FIX + t.file, { fps: 10, w: 32, h: 18 }), w: 32, h: 18, fps: 10 };
    else if (t.medium === "pcm") m = { kind: "pcm", samples: await aud.load(FIX + t.file, { sampleRate: 8000 }), sampleRate: 8000, container: "wav" };
    else m = { kind: "wav", bytes: new Uint8Array(readFileSync(FIX + t.file)) };
    decoded[t.file] = m;
    return m;
  };
  const rows = [];
  for (const t of MEDIA_TASKS) {
    const m = await media(t);
    const decl = M.parseMeasure(t.prompt).decl;
    const r = M.runMeasurement(decl, m, { nul, bindLinks: null, reduce });
    const text = r.kind === "probe" ? r.lines.join("\n") : r.refused ? `refused (${r.refused.type}): ${r.refused.detail}` : M.phrase(r);
    let address = null;
    if (t.locate) {
      const s = M.seriesFromMedia(m, decl, reduce).series;
      const top = s.indexOf(Math.max(...s));
      address = { transition: top, seconds: (top + 1) / m.fps, ok: top === t.locate.transition && (top + 1) / m.fps === t.locate.seconds };
    }
    if (t.silence) {
      const s = M.seriesFromMedia(m, decl, reduce).series;
      const zeros = s.map((v, i) => [v, i]).filter(([v]) => v === 0).map(([, i]) => i);
      const [a, b] = [Math.min(...zeros), Math.max(...zeros)];
      const loc = aud.locate(a, { frameSamples: decl.frame, sampleRate: 8000 });
      const locEnd = aud.locate(b, { frameSamples: decl.frame, sampleRate: 8000 });
      address = { frames: [a, b], seconds: [loc.timeStart, locEnd.timeEnd], ok: a === t.silence.frames[0] && b === t.silence.frames[1] && loc.timeStart === t.silence.seconds[0] && locEnd.timeEnd === t.silence.seconds[1] };
    }
    rows.push({ id: t.id, medium: t.medium, prompt: t.prompt, ok: t.expect.test(text) && (address ? address.ok : true), text, address });
  }
  return { rows, numbers: { tasks: rows.length, ok: rows.filter((r) => r.ok).length } };
}
