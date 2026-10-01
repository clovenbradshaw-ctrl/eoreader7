// ═══ LOVELACE · TEACH IT TO FISH ═══ Owner: Lovelace (archon-holocracy role:lovelace, Coding Capability Circle).
// STEERED BUILD: a person hand-built this so the system could do what the prompt asked. It is ledger row 5, 10 in
// TEACH-IT-TO-FISH.md, not the goal. Close the row (the prompt alone produces this); do not add more of it.
// app-units.mjs — the UNITS of a comp-driven app: the small pure functions a
// model writes, and everything around them that the model is never trusted with.
//
// The discipline is code-build.js's ("compute, don't generate"): the scaffold of
// an app — layout, routes, binding, the server's fetch glue — is COMPUTED from
// the comp's spec; what a model is asked for is the irreducible part, a pure
// function from a REAL recorded response to a declared shape. Each unit is:
//
//   contract   its name, parameters, the source it reads (with a trimmed REAL
//              sample shown to the mouth), the exact shape it returns — declared
//              by whoever wired the source, never by the mouth
//   oracle     an independent check of the unit's output against the FULL
//              recorded sample (paths read straight off the JSON, a haversine
//              written beside the test) — the test decides, not the prose
//   mouth      which local model draws it: the order is the STIGMERGY's —
//              kernel/stigmergy.js's learned order over the mouths, success
//              deposits a trail (with its latency), failure deposits nothing,
//              trails evaporate, a scout still tries the untried
//   cache      a verified unit is kept under the hash of its contract + its
//              sample + its oracle, so the same contract asked again costs zero
//              model calls (the "instantly" on the second build)
//
// A unit that fails its oracle is shown the failures and redrawn (bounded —
// REPAIR_ROUNDS), then the next mouth takes it; a unit no mouth can make pass is
// a typed gap in the build, never shipped.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { deposit, routeOrderFor } from "../kernel/stigmergy.js";
import { loadUnit, UNIT_RUN_TIMEOUT_MS } from "./unit-wall.mjs";
import { declaredFromExample, KEY_REFERENTS_SCHEMA } from "../organs/key-referents.js";
import { CARDS_SCHEMA, cardsDoc, cardsFor } from "../organs/cards.js";
import { constReassigned, canonicalize, adoptIf } from "../organs/code-canonical.js";
import { shapeRewrites, applyShapeRewrites } from "../organs/output-shape.js";
import { readSemantics, factsFrom } from "../organs/code-semantics.js";
import { createTaskLog } from "../kernel/task-log.js";
import { proposeCanonical, settledContent, readAnchorLog, appendAnchorLog } from "../adapters/build/code-anchor-log.js";
export { constReassigned };
export { loadUnit, UNIT_RUN_TIMEOUT_MS };

/** Redraws of one unit with one mouth, after the first, each carrying the oracle's failures. Set by hand 2026-09-30. */
export const REPAIR_ROUNDS = 2;
/** The reply budget of one unit draw, in tokens. */
export const UNIT_NUM_PREDICT = 900;
/** Most characters of a sample shown to the mouth — the prompt must fit the window the model is actually served at. */
export const SAMPLE_SHOWN_CHARS = 2600;

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

/** A JSON value cut to its shape: long arrays keep their first items, long strings are clipped — what a mouth needs to see the KEYS and one row. */
export function trimSample(value, { items = 2, str = 60, depth = 0 } = {}) {
  if (Array.isArray(value)) return [...value.slice(0, items).map((v) => trimSample(v, { items, str, depth: depth + 1 })), ...(value.length > items ? [`… ${value.length - items} more like these`] : [])];
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, trimSample(v, { items, str, depth: depth + 1 })]));
  if (typeof value === "string" && value.length > str) return value.slice(0, str) + "…";
  return value;
}

/** The prompt for one unit: one function, raw code, the shape it returns, the trimmed real sample. Plain words — no apparatus vocabulary. */
/** The return literal of a leaf, written out key by key from the WORKED example's keys (never its values): structure computed, each value left for the mouth. null when the answer is not a flat object. */
export function skeletonOf(contract) {
  let out;
  try { out = contract.example?.output(contract.sampleJson ?? contract.sampleText); } catch { return null; }
  // a field is ONE value: the skeleton is a function whose body is the expression that gives it
  if (contract.kind === "field") return `function ${contract.name}(${contract.params.join(", ")}) {\n  return ___;\n}`;
  if (!out || typeof out !== "object" || Array.isArray(out)) return null;
  return `function ${contract.name}(${contract.params.join(", ")}) {\n  return {\n${Object.keys(out).map((k) => `    ${k}: ___,`).join("\n")}\n  };\n}`;
}

/** the cards a task's prompt offers: those its own words name (organs/cards.js cardsFor). The wall still has ALL of them, so a near name still resolves. */
export function cardsShown(contract) { return contract.cards === false ? [] : cardsFor(contract).map((c) => c.name); }

export function unitPrompt(contract, { failures = [], previous = null, skeleton = false, repair = "edit", facts = [] } = {}) {
  // `shown` is what the mouth sees when the real sample is too long to show whole and the author knows which stretch carries the shape (an excerpt, cut with a marker — never rewritten)
  const sample = typeof contract.shown === "string" ? contract.shown.slice(0, SAMPLE_SHOWN_CHARS) : typeof contract.sampleText === "string" ? contract.sampleText.slice(0, SAMPLE_SHOWN_CHARS) : JSON.stringify(trimSample(contract.sampleJson), null, 1).slice(0, SAMPLE_SHOWN_CHARS);
  const lines = [
    `Write ONLY raw JavaScript (no markdown fences, no prose) for exactly one function: \`${contract.name}(${contract.params.join(", ")})\`.`,
    contract.doc,
    `It must return this shape:\n${contract.returns}`,
    contract.notes ? `Notes:\n${contract.notes}` : null,
    cardsShown(contract).length ? `These functions already exist — call them, do not write them yourself, and do not declare them:\n${cardsDoc(cardsShown(contract))}` : null,
    `Here is a real example of the ${contract.paramDoc ?? contract.params[0]} it receives (long lists are cut to their first items):\n${sample}`,
    workedExample(contract),
    (skeleton || contract.skeleton === true) && skeletonOf(contract) ? `Start from this skeleton — keep the keys and their order, replace every ___ with an expression (add any lines before the return that you need):\n${skeletonOf(contract)}` : null,
    "Use no imports, no network, no globals. Export nothing: just declare the function.",
  ];
  // "fresh": the failures come back as REQUIREMENTS and the previous code does not (a small model shown its own code beside its failures hands the same code back — measured 2026-09-30)
  // "fold": the prompt is built from the FOLD — the canonical current version and what the reading established about it — not from the model's own words
  // back at it. A slip the reading already closed (a const, a slipped key, a near-named call) is closed in what the model is shown, so it cannot be copied forward.
  if (repair === "fold" && previous) {
    lines.push(`Current version of the function:\n${String(previous).slice(0, 1800)}`);
    if (facts.length) lines.push(`What is known about it:\n${facts.map((f) => `- ${f}`).join("\n")}`);
    if (failures.length) lines.push(`Run against the real data, it gave:\n${failures.slice(0, 3).map((f) => `- ${f}`).join("\n")}`);
    lines.push("Write the corrected function.");
  } else if (failures.length && repair === "fresh") lines.push(`An earlier attempt was run against the real data and these checks failed. Write the function again from the start so that none of them fail:\n${failures.slice(0, 5).map((f) => `- ${f}`).join("\n")}`);
  else if (failures.length) lines.push(`Your previous version was run against the real data and failed:\n${failures.slice(0, 5).map((f) => `- ${f}`).join("\n")}\nPrevious version:\n${String(previous ?? "").slice(0, 1800)}\nWrite the corrected function.`);
  return lines.filter(Boolean).join("\n\n");
}

/** The answer for the shown example, read off the same bytes by the oracle's own paths and cut the same way the sample is: a worked example, never the code. */
export function workedExample(contract) {
  if (!contract.example) return null;
  let out;
  try { out = contract.example.output(contract.sampleJson ?? contract.sampleText); } catch { return null; }
  return `For that example${contract.example.args ? ` ${contract.example.args}` : ""} the function must return (long lists cut to their first items):\n${JSON.stringify(trimSample(out, { items: 2, str: 80 }), null, 1).slice(0, 1800)}`;
}

/** The code a reply holds: the first fenced block if any, else the text from the first `function`/`const`/`async` — never a sentence of prose. */
export function extractCode(reply, name) {
  const text = String(reply ?? "");
  const fence = text.indexOf("```");
  let body = text;
  if (fence >= 0) { const start = text.indexOf("\n", fence) + 1; const end = text.indexOf("```", start); body = text.slice(start, end < 0 ? undefined : end); }
  const decl = [`function ${name}`, `const ${name}`, `async function ${name}`, `let ${name}`].map((d) => body.indexOf(d)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  if (decl === undefined) return null;
  return body.slice(decl).trim();
}

/** Run a unit against its contract's oracle. -> { ok, failures:[string] } — every failure names the path and what was expected. */
/** The contract's own vocabulary bound to the input's keys by where the worked example's values sit (organs/key-referents.js). {} when the contract shows no example input. */
export function declaredAliases(contract) {
  try { const args = contract.example?.input?.(); return args ? declaredFromExample(args, contract.example.output(contract.sampleJson ?? contract.sampleText)) : {}; } catch { return {}; }
}

/** A unit is tested BEHIND the key-referent layer: the idea (`tz`) resolves to the real key (`timezone`) when exactly one real key qualifies; the resolutions come back with the verdict. */
export function testUnit(code, contract) {
  let fn;
  const declared = declaredAliases(contract);
  // each mechanism is a per-contract switch so it can be ablated on identical tasks: resolve === false (no key resolution), cards === false (no cards), hints === false (no repair hints)
  try { fn = loadUnit(code, contract.name, { resolve: contract.resolve === false ? null : { declared }, cards: contract.cards === false ? false : contract.cards === "exact" ? "exact" : true }); } catch (e) { return { ok: false, failures: [`does not compile or declare ${contract.name}: ${String(e.message).slice(0, 160)}`] }; }
  const r = testFunction(fn, contract);
  if (!r.ok && contract.hints !== false) for (const v of constReassigned(code)) r.failures.unshift(`\`${v}\` is declared with const and assigned again — declare it with let`);
  if (contract.hints !== false && r.constant) r.failures.unshift(`the function returns the identical result for different inputs (${r.constant.runs.map((l) => `"${l}"`).join(", ")}) — compute the result from the input; do not copy the example's answer`);
  if (contract.hints !== false) for (const g of r.ignored ?? []) r.failures.unshift(`the function gives the same result for ${g.param} = ${g.values.map((v) => JSON.stringify(v)).join(" and ")}, but the recorded data differs — the result must depend on \`${g.param}\``);
  return { ...r, declared, resolutions: fn.resolutions?.() ?? [], fn };
}

/** parameters that take more than one primitive value across a contract's runs — the SELECTORS (`units`): the semantic reading probes them with their other values */
export function selectorAlternatives(contract) {
  const vals = {};
  for (const r of contract.runs) { let a; try { a = r.args(); } catch { continue; } a.forEach((x, i) => { if (["string", "number", "boolean"].includes(typeof x)) (vals[i] ??= []).push(x); }); }
  return Object.fromEntries(Object.entries(vals).map(([i, v]) => [i, [...new Set(v)]]).filter(([, v]) => v.length > 1 && v.length <= 4));
}

/**
 * Where does an expected value sit in the input? A slip a small model makes over and over is reading the
 * wrong FIELD (`tz` for `timezone`); the oracle knows the value the recorded row must give, so the runner
 * can point at the path in the ARGUMENTS where that very value lives. It points; it never writes code.
 * Reported only when the value is found in at most two places (a number that equals ten fields points at none).
 */
export function locate(args, params, want, { max = 2 } = {}) {
  const hits = [];
  const target = typeof want === "string" || typeof want === "number" ? String(want) : null;
  if (target === null || target === "" || target.length > 80) return [];
  const walk = (v, p, depth) => {
    if (hits.length > max || depth > 7) return;
    if (v !== null && typeof v === "object") { for (const [k, x] of Array.isArray(v) ? v.map((x, i) => [i, x]) : Object.entries(v)) walk(x, Array.isArray(v) ? `${p}[${k}]` : `${p}.${k}`, depth + 1); return; }
    if ((typeof v === "string" || typeof v === "number") && String(v) === target) hits.push(p);
  };
  args.forEach((a, i) => walk(a, params?.[i] ?? `arg${i}`, 0));
  return hits.length && hits.length <= max ? hits : [];
}
const pointed = (msg, args, params) => {
  const cut = msg.indexOf("\u0001");
  if (cut < 0) return msg;
  const head = msg.slice(0, cut);
  let want; try { want = JSON.parse(msg.slice(cut + 1)); } catch { return head; }
  const where = locate(args, params, want);
  return where.length ? `${head} — that value is at ${where.map((w) => "`" + w + "`").join(" or ")} in what the function receives` : head;
};

/**
 * The parameters a function IGNORES, found by behaviour rather than by reading its source. Two runs that differ only in one primitive
 * argument (`units`: "metric" / "imperial") and get the SAME result, while the oracle passes one and fails the other, cannot both be right:
 * the result must depend on that parameter. Silent on a parameter that is legitimately unused (same result, same verdict) — so, unlike a
 * scan for unread names, it cannot misfire on a field that does not depend on `units`.
 */
export function ignoredParams(seen, params) {
  const out = [];
  params.forEach((p, i) => {
    const groups = new Map();
    for (const r of seen) {
      if (!r.args || !["string", "number", "boolean"].includes(typeof r.args[i])) continue;
      const k = JSON.stringify(r.args.filter((_, j) => j !== i));
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }
    for (const rs of groups.values()) {
      const values = new Set(rs.map((r) => JSON.stringify(r.args[i])));
      if (values.size < 2) continue;
      const same = new Set(rs.map((r) => JSON.stringify(r.out))).size === 1, mixed = rs.some((r) => r.failed) && rs.some((r) => !r.failed);
      if (same && mixed && !out.some((o) => o.param === p)) out.push({ param: p, values: [...values].map((v) => JSON.parse(v)) });
    }
  });
  return out;
}

/**
 * A function that returns the SAME result for different inputs while the oracle fails one of them is copying an answer, not computing one
 * (measured 2026-09-30: gemma2:2b wrote `const times = [0, 330, ...]; return { stop, route: "14", times }` — the shown example as a literal —
 * and handed the identical code back after "times.length is 5, the recorded data says 4"). The oracle's own message names a LENGTH; this names the
 * mistake. Found by behaviour, so it cannot fire on a function that legitimately gives two inputs one answer and passes both.
 */
export function constantOutput(seen) {
  const byOut = new Map();
  for (const r of seen) {
    if (!r.args || r.out === undefined) continue;
    const k = JSON.stringify(r.out);
    if (!byOut.has(k)) byOut.set(k, []);
    byOut.get(k).push(r);
  }
  for (const rs of byOut.values()) {
    const inputs = new Set(rs.map((r) => JSON.stringify(r.args)));
    if (inputs.size >= 2 && rs.some((r) => r.failed)) return { runs: rs.map((r) => r.label).filter(Boolean).slice(0, 3) };
  }
  return null;
}

/** The oracle's runs against an already-loaded function — a drawn unit, or a COMPOSITION of drawn leaves. */
export function testFunction(fn, contract) {
  const failures = [], seen = [];
  for (const run of contract.runs) {
    let out, args;
    try { args = run.args(contract.sampleJson ?? contract.sampleText); out = fn(...args); } catch (e) { failures.push(`${run.label}: threw ${String(e.message).slice(0, 140)}`); seen.push({ label: run.label, args, out: undefined, failed: true }); continue; }
    let f = [];
    try { f = run.check(out, contract.sampleJson ?? contract.sampleText); for (const m of f) failures.push(`${run.label}: ${pointed(m, args, contract.params)}`); } catch (e) { failures.push(`${run.label}: the oracle could not read the output (${String(e.message).slice(0, 100)})`); f = ["unreadable"]; }
    seen.push({ label: run.label, args, out, failed: f.length > 0 });
  }
  const ignored = failures.length ? ignoredParams(seen, contract.params) : [];
  const constant = failures.length ? constantOutput(seen) : null;
  return { ok: failures.length === 0, failures, ignored, constant };
}

/** The hash a verified unit is cached under: contract text + oracle source + sample. A changed contract, test or sample is a new unit. */
export function contractHash(contract) {
  return sha(JSON.stringify([contract.name, contract.params, contract.doc, contract.returns, contract.notes ?? "", contract.runs.map((r) => r.label + String(r.check)).join("|"), sha(contract.sampleText ?? JSON.stringify(contract.sampleJson ?? null)), contract.shown ?? "", workedExample(contract) ?? "", contract.salt ?? "", KEY_REFERENTS_SCHEMA, JSON.stringify(declaredAliases(contract)), contract.cards === false ? "" : sha(CARDS_SCHEMA + cardsDoc(cardsShown(contract))), contract.resolve === false, contract.hints === false]));
}

export function openUnitCache(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const f = (h) => path.join(dir, `${h.slice(0, 24)}.json`);
  return { get: (h) => { try { return JSON.parse(fs.readFileSync(f(h), "utf8")); } catch { return null; } }, put: (h, rec) => fs.writeFileSync(f(h), JSON.stringify(rec, null, 1)) };
}

export function loadTrails(file) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return {}; } }
export function saveTrails(file, t) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file + ".tmp", JSON.stringify(t)); fs.renameSync(file + ".tmp", file); }

/** The mouth: one chat call to the local daemon's channel, raw code wanted. Injectable, so the walk runs offline in tests. */
export function makeMouth({ base = process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434", temperature = 0, timeoutMs = 240000 } = {}) {
  return async function mouth(model, prompt) {
    const t0 = Date.now();
    const r = await fetch(`${base}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({ model, stream: false, messages: [{ role: "user", content: prompt }], options: { temperature, num_predict: UNIT_NUM_PREDICT } }) });
    if (!r.ok) throw new Error(`mouth ${model} answered ${r.status}`);
    const d = await r.json();
    return { text: d.message?.content ?? "", ms: Date.now() - t0, promptTokens: d.prompt_eval_count ?? 0, outTokens: d.eval_count ?? 0 };
  };
}

// ---- field decomposition (ledger row 7: the system decomposes a wide leaf itself) ----
// A leaf whose answer is a flat object — { temp, feels, condition, windSpeed, ... } — is ten small decisions in one draw, and a 1.5B-2B coder
// gets one of them wrong every time (measured 2026-09-30, 1 of 9 leaves). The contract already says what the keys are (its worked example's output)
// and the oracle already reports per key (`temp is 17, the recorded data says 63`). So the wide draw is split MECHANICALLY: one draw per key, each shown
// that key's expected value for the shown example, each checked by the parent's own oracle filtered to that key; the answer object is then computed
// from the verified parts and tested against the parent's whole oracle. Nothing here knows what a temperature is.

/** The pseudo-field that decides whether the whole answer is null (a leaf whose oracle accepts null for some arguments). */
export const ABSENT = "absent";

/** Is `null` what this run's oracle expects? Read off the oracle itself: a check that accepts null says the leaf may answer nothing for these arguments. */
function nullExpected(run, sample) { try { return run.check(null, sample).length === 0; } catch { return false; } }

/** The keys of a leaf's answer when it is a flat object of at least two keys (a single key IS the leaf); [] otherwise. */
export function fieldsOf(contract) {
  try {
    const out = contract.example?.output(contract.sampleJson ?? contract.sampleText);
    if (!out || typeof out !== "object" || Array.isArray(out)) return [];
    const keys = Object.keys(out);
    return keys.length >= 2 && keys.every((k) => /^[A-Za-z_$][\w$]*$/.test(k)) ? keys : [];
  } catch { return []; }
}

/** The clauses of a leaf's notes that mention this key (split on `;` and sentence ends); all of the notes when none does. The others are other fields' business, and a small model shown them writes them. */
export function notesFor(notes, key) {
  const text = String(notes ?? "").trim();
  if (!text) return "";
  const want = key.toLowerCase();
  const kept = text.split(/(?<=[.;])\s+/).filter((c) => c.toLowerCase().includes(want));
  return kept.length ? kept.join(" ") : text;
}

/** The contract for ONE key of a leaf: the same parameters, samples and notes; a worked example that shows only this key's value; the parent's runs, their failures filtered to this key. */
export function fieldContract(contract, key, { style = "narrow" } = {}) {
  const sample0 = contract.sampleJson ?? contract.sampleText;
  if (key === ABSENT) return {
    ...contract,
    name: `${ABSENT}Of`, kind: "field", parent: contract.name, key,
    doc: `${contract.doc} You write ONE part of it: \`${ABSENT}Of\` answers whether that function has NOTHING to return for these arguments (true) or an object (false).`,
    returns: `true when the whole answer is null, false otherwise — another function writes the fields\n${contract.returns}`,
    example: contract.example && { ...contract.example, output: () => false },
    runs: contract.runs.map((r) => ({ label: r.label, args: r.args, check: (o, sample) => { const want = nullExpected(r, sample); return o === want ? [] : [`${ABSENT} is ${JSON.stringify(o)}, the recorded data says ${want}`]; } })),
  };
  const only = (m) => new RegExp(`^${key}(?![\\w$]) `).test(m);
  return {
    ...contract,
    name: `${key}Of`, kind: "field", parent: contract.name, key,
    doc: `${contract.doc} You write ONE part of it: \`${key}Of\` returns just the value of the \`${key}\` field of that object — not the object.`,
    // the leading "an object { a, b, c }" is what a small model copies: a field's answer is one value, and the rest of the text (units, rounding) still applies
    returns: style === "wide"
      ? `just the value of \`${key}\` — another function writes the other fields\n${contract.returns}`
      : `just the value of \`${key}\`, not an object — another function writes the other fields${String(contract.returns).replace(/^an object \{[^}]*\}(, or null)?/, "").replace(/^\s*/, "\n")}`,
    notes: style === "wide" ? contract.notes : notesFor(contract.notes, key),
    skeleton: style === "narrow",
    example: contract.example && { ...contract.example, output: (...a) => contract.example.output(...a)[key] },
    // a run whose oracle expects null is the absent-guard's; the field's function is never asked there
    runs: contract.runs.filter((r) => !nullExpected(r, sample0)).map((r) => ({ label: r.label, args: r.args, check: (o, sample) => { let f; try { f = r.check({ [key]: o }, sample); } catch (e) { return [`${key} could not be checked: ${String(e.message).slice(0, 80)}`]; } return f.filter(only); } })),
  };
}

/** Every field to draw: the answer's keys, preceded by the absent-guard when some run's oracle accepts null. */
export function fieldPlan(contract) {
  const keys = fieldsOf(contract);
  if (!keys.length) return [];
  const sample = contract.sampleJson ?? contract.sampleText;
  return contract.runs.some((r) => nullExpected(r, sample)) ? [ABSENT, ...keys] : keys;
}

/** The leaf's code from its verified field functions: each inside its own scope (two fields may each write a helper of the same name), then the computed answer object. */
export function composeFieldCode(contract, plan, codes) {
  const args = contract.params.join(", "), guard = plan.includes(ABSENT), keys = plan.filter((k) => k !== ABSENT);
  const parts = plan.map((k) => `const ${k}Of = (() => {\n${codes[k]}\nreturn ${k}Of;\n})();`);
  return `${parts.join("\n\n")}\n\nfunction ${contract.name}(${args}) {\n${guard ? `  if (${ABSENT}Of(${args})) return null;\n` : ""}  return {\n${keys.map((k) => `    ${k}: ${k}Of(${args}),`).join("\n")}\n  };\n}`;
}

/**
 * makeFieldedUnit — the leaf drawn one field at a time (each field through makeUnit: its own stigmergy head, cache, repair), composed, and tested against the
 * parent's whole oracle. A field no mouth can make pass is named in the gap (`failedFields`), so what is left to learn is a KEY, not a whole leaf.
 */
export async function makeFieldedUnit(contract, opts = {}) {
  const keys = fieldPlan(contract);
  if (!keys.length) return makeUnit(contract, opts);
  const t0 = Date.now(), { see = () => {}, cache = null } = opts;
  const hash = contractHash(contract), hit = cache?.get(hash);
  if (hit) { // the whole leaf was verified before: re-tested on this run's sample, never trusted on the hash alone
    const again = testUnit(hit.code, contract);
    if (again.ok) { see("unit", { name: contract.name, hash, cached: true, model: hit.model, calls: 0, ms: Date.now() - t0 }); return { ok: true, code: hit.code, model: hit.model, rounds: 0, calls: 0, ms: Date.now() - t0, cached: true, failures: [], declared: again.declared ?? {}, resolutions: again.resolutions ?? [], fields: keys, trails: opts.trails ?? {} }; }
  }
  let trails = opts.trails ?? {}, calls = 0;
  const codes = {}, models = new Set(), declared = {}, resolutions = [], failedFields = [];
  for (const key of keys) {
    const r = await makeUnit(fieldContract(contract, key), { ...opts, trails });
    trails = r.trails ?? trails; calls += r.calls;
    if (r.ok) { codes[key] = r.code; if (r.model) models.add(r.model); resolutions.push(...(r.resolutions ?? [])); Object.assign(declared, r.declared ?? {}); }
    else failedFields.push({ key, failures: r.failures.slice(0, 2) });
  }
  if (failedFields.length) {
    see("unit", { name: contract.name, ok: false, gap: "a field no mouth could make pass", failedFields: failedFields.map((f) => f.key), calls });
    return { ok: false, code: null, model: null, rounds: 0, calls, ms: Date.now() - t0, cached: false, failures: failedFields.flatMap((f) => f.failures.map((m) => `${f.key}: ${m}`)), failedFields, trails };
  }
  const code = composeFieldCode(contract, keys, codes);
  const res = testUnit(code, contract);
  see("unit", { name: contract.name, ok: res.ok, composedFrom: keys, calls, ms: Date.now() - t0, ...(res.ok ? {} : { gap: "the fields each passed but the composed leaf failed the whole oracle", failures: res.failures.slice(0, 4) }) });
  if (res.ok) cache?.put(hash, { name: contract.name, model: [...models].join("+"), code, hash, declared: res.declared ?? declared, resolutions: res.resolutions ?? [], fields: keys, verifiedAt: new Date().toISOString() });
  return { ok: res.ok, code: res.ok ? code : null, model: [...models].join("+"), rounds: 0, calls, ms: Date.now() - t0, cached: false, failures: res.ok ? [] : res.failures, declared: res.declared ?? declared, resolutions: [...resolutions, ...(res.resolutions ?? [])], fields: keys, trails };
}

/** How many of a contract's runs fail: a failure line starts with its run's label (`testFunction`). Hint lines have no label and are not counted. */
export function failedRuns(contract, failures) {
  return contract.runs.filter((run) => failures.some((f) => f.startsWith(`${run.label}:`))).length;
}

/**
 * The reading stage between a draw and the log (ledger row 14; the operator: "the model is giving ideas, the system is making them coherent").
 * The suggestion is run behind the wall (which resolves what it can at run time and RECORDS what it resolved), read by code-canonical.js, and the
 * canonical form is re-tested with no run-time help; it is adopted only where it does at least as well as the suggestion did.
 * -> { res, code, canonical }  res: the verdict on the code adopted; canonical: what the reading made (transformations it kept, findings it could not close)
 */
export function readSuggestion(suggestion, contract) {
  const raw = testUnit(suggestion, contract);
  const withMeaning = (res, code, canonical) => {
    // the second reading: what the function DEPENDS on, held against what the contract says (code-semantics.js). Only when the answer is a flat object of fields.
    let sem = null;
    if (contract.semantics !== false && res.fn && fieldsOf(contract).length) {
      try { sem = readSemantics({ call: (argv) => res.fn(...argv), argv: contract.runs[0].args(), params: contract.params, contract, alternatives: selectorAlternatives(contract), anchor: contract.name }); } catch { sem = null; }
    }
    return { res, code, canonical: { ...canonical, findings: [...(canonical.findings ?? []), ...(sem?.findings ?? [])], claims: sem?.claims ?? [] }, semantics: sem };
  };
  // the third reading: the answer's TYPES, held against the worked example's (organs/output-shape.js). Adopted only where the whole oracle does at least as well.
  const shaped = (chosen) => {
    if (contract.shape === false || !chosen.res.fn || !contract.example?.input) return chosen;
    let got, want;
    try { want = contract.example.output(); got = chosen.res.fn(...contract.example.input()); } catch { return chosen; }
    const rewrites = shapeRewrites(got, want);
    if (!rewrites.length) return chosen;
    const code = applyShapeRewrites(chosen.code, rewrites);
    if (code === chosen.code) return chosen;
    const t = testUnit(code, { ...contract, resolve: false, cards: contract.cards === false ? false : "exact" });
    if (!adoptIf(-failedRuns(contract, chosen.res.failures), -failedRuns(contract, t.failures))) return { ...chosen, canonical: { ...chosen.canonical, refused: chosen.canonical.refused ?? "the output-shape reading did worse than the draw" } };
    const how = { length: "an array where the example shows a number: its length", number: "a numeric string where the example shows a number", project: "an object where the example shows one of its values" };
    return { res: { ...t, resolutions: chosen.res.resolutions, declared: chosen.res.declared }, code, canonical: { ...chosen.canonical, code, changed: true, transformations: [...(chosen.canonical.transformations ?? []), ...rewrites.map((r) => ({ kind: "output_coerced", name: r.key, how: r.kind, prop: r.prop ?? null, basis: `${r.key} came back as ${how[r.kind]}${r.prop ? ` (.${r.prop})` : ""}` }))] } };
  };
  let chosen;
  if (contract.canonical === false) chosen = { res: raw, code: suggestion, canonical: { code: suggestion, transformations: [], findings: [] } };
  else {
    const reading = canonicalize(suggestion, { resolutions: raw.resolutions ?? [], offered: cardsShown(contract) });
    if (!reading.changed) chosen = { res: raw, code: suggestion, canonical: { ...reading, code: suggestion, transformations: [] } };
    else {
      const can = testUnit(reading.code, { ...contract, resolve: false, cards: contract.cards === false ? false : "exact" });
      chosen = adoptIf(-failedRuns(contract, raw.failures), -failedRuns(contract, can.failures))
        ? { res: { ...can, resolutions: raw.resolutions, declared: raw.declared }, code: reading.code, canonical: reading }
        : { res: raw, code: suggestion, canonical: { ...reading, code: suggestion, transformations: [], refused: "the canonical form did worse than the suggestion" } };
    }
  }
  chosen = shaped(chosen);
  return withMeaning(chosen.res, chosen.code, chosen.canonical);
}

/**
 * makeUnit(contract, { mouths, mouth, trails, cache, see, now, rng }) → { ok, code, model, rounds, calls, ms, cached, failures }
 *   mouths   the models that may draw (the structural default order)
 *   trails   the stigmergy's trails (mutated by returning the new set in .trails)
 *   see      ledger writer: see(event, fields)
 */
export async function makeUnit(contract, { mouths, mouth, trails = {}, cache = null, see = () => {}, now = Date.now(), rng = Math.random, explore = 0.1, skeleton = false, repair = "edit", carry = false, anchorDir = null } = {}) {
  const hash = contractHash(contract);
  const t0 = Date.now();
  const hit = cache?.get(hash);
  if (hit) {
    // a cached unit is RE-TESTED on this run's sample before it is trusted: the cache keys a contract, the oracle still decides
    const again = testUnit(hit.code, contract);
    if (again.ok) { see("unit", { name: contract.name, hash, cached: true, model: hit.model, calls: 0, ms: Date.now() - t0 }); return { ok: true, code: hit.code, model: hit.model, rounds: 0, calls: 0, ms: Date.now() - t0, cached: true, failures: [], declared: again.declared ?? {}, resolutions: again.resolutions ?? [], trails }; }
    see("unit-cache-stale", { name: contract.name, hash, failures: again.failures.slice(0, 3) });
  }
  const head = `unit:${contract.kind ?? "parse"}`;
  const order = routeOrderFor(trails, head, { routes: mouths, rng, explore });
  see("unit-order", { name: contract.name, head, order, trails: Object.fromEntries(Object.entries(trails[head] ?? []).length ? [[head, (trails[head] ?? []).length]] : []) });
  // the record: every draw lands on it as a suggestion and a canonical entry (adapters/build/code-anchor-log.js). With an anchorDir the record OUTLIVES the run:
  // a later build of the same unit starts from what the fold settled, not from nothing ("future versions"), and the mistakes that were read are not made again.
  const anchorFile = anchorDir ? path.join(anchorDir, `${contract.name}.jsonl`) : null;
  let log = anchorFile ? readAnchorLog(anchorFile) : createTaskLog(), persisted = log.entries.length;
  let calls = 0, lastFailures = [];
  const seeded = anchorFile ? settledContent(log, contract.name).content : null;
  let carried = { previous: seeded, failures: [], facts: [] };
  for (const model of order) {
    let previous = carry || seeded ? carried.previous : null, failures = carry ? carried.failures : [], facts = carry ? carried.facts : [];
    for (let round = 0; round <= REPAIR_ROUNDS; round++) {
      const prompt = unitPrompt(contract, { failures, previous, skeleton, repair, facts });
      let r;
      try { r = await mouth(model, prompt); } catch (e) { see("unit-draw", { name: contract.name, model, round, refused: String(e.message).slice(0, 140) }); break; }
      calls++;
      const suggestion = extractCode(r.text, contract.name);
      if (!suggestion) { failures = ["the reply holds no function declaration"]; previous = r.text.slice(0, 600); see("unit-draw", { name: contract.name, model, round, ms: r.ms, tokens: r.outTokens, ok: false, failures }); continue; }
      const { res, code, canonical } = readSuggestion(suggestion, contract);
      log = proposeCanonical(log, { anchor: contract.name, round: calls, writer: model, suggestion, canonical, prompt: null });
      if (anchorFile) { appendAnchorLog(anchorFile, log, persisted); persisted = log.entries.length; }
      facts = factsFrom(canonical.findings ?? []);
      if (canonical.transformations.length) see("canonical", { name: contract.name, model, round, transformations: canonical.transformations.map((t) => `${t.kind}:${t.name ?? `${t.from}→${t.to}`}`), findings: canonical.findings });
      see("unit-draw", { name: contract.name, model, round, ms: r.ms, promptTokens: r.promptTokens, tokens: r.outTokens, ok: res.ok, failedRuns: res.ok ? 0 : failedRuns(contract, res.failures), failures: res.failures.slice(0, 4), resolved: (res.resolutions ?? []).filter((x) => !x.ambiguous), ambiguous: (res.resolutions ?? []).filter((x) => x.ambiguous), code: code.slice(0, 1500) });
      if (res.ok) {
        trails = deposit(trails, { head, route: model, ok: true, ms: r.ms, at: now });
        cache?.put(hash, { name: contract.name, model, code, hash, declared: res.declared ?? {}, resolutions: res.resolutions ?? [], verifiedAt: new Date(now).toISOString() });
        see("unit", { name: contract.name, hash, cached: false, model, calls, rounds: round, ms: Date.now() - t0 });
        return { ok: true, code: settledContent(log, contract.name).content ?? code, model, rounds: round, calls, ms: Date.now() - t0, cached: false, failures: [], declared: res.declared ?? {}, resolutions: res.resolutions ?? [], trails, log };
      }
      // a mouth that hands back the SAME code after being shown the failures has nothing more to give this unit: the rest of its rounds are skipped
      const unchanged = previous !== null && code.replace(/\s+/g, "") === String(previous).replace(/\s+/g, "");
      failures = res.failures; previous = code; lastFailures = res.failures; carried = { previous, failures, facts };
      if (unchanged) { see("unit-draw", { name: contract.name, model, round, skipped: "the redraw is identical to the previous code; the mouth is spent for this unit" }); break; }
    }
  }
  see("unit", { name: contract.name, hash, ok: false, gap: "no mouth produced a function that passes its oracle", calls, failures: lastFailures.slice(0, 4) });
  return { ok: false, code: null, model: null, rounds: REPAIR_ROUNDS, calls, ms: Date.now() - t0, cached: false, failures: lastFailures, trails, log };
}
