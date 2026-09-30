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
import { CARDS_SCHEMA, cardsDoc } from "../organs/cards.js";
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
  if (!out || typeof out !== "object" || Array.isArray(out)) return null;
  return `function ${contract.name}(${contract.params.join(", ")}) {\n  return {\n${Object.keys(out).map((k) => `    ${k}: ___,`).join("\n")}\n  };\n}`;
}

export function unitPrompt(contract, { failures = [], previous = null, skeleton = false, repair = "edit" } = {}) {
  // `shown` is what the mouth sees when the real sample is too long to show whole and the author knows which stretch carries the shape (an excerpt, cut with a marker — never rewritten)
  const sample = typeof contract.shown === "string" ? contract.shown.slice(0, SAMPLE_SHOWN_CHARS) : typeof contract.sampleText === "string" ? contract.sampleText.slice(0, SAMPLE_SHOWN_CHARS) : JSON.stringify(trimSample(contract.sampleJson), null, 1).slice(0, SAMPLE_SHOWN_CHARS);
  const lines = [
    `Write ONLY raw JavaScript (no markdown fences, no prose) for exactly one function: \`${contract.name}(${contract.params.join(", ")})\`.`,
    contract.doc,
    `It must return this shape:\n${contract.returns}`,
    contract.notes ? `Notes:\n${contract.notes}` : null,
    contract.cards === false ? null : `These functions already exist — call them, do not write them yourself, and do not declare them:\n${cardsDoc()}`,
    `Here is a real example of the ${contract.paramDoc ?? contract.params[0]} it receives (long lists are cut to their first items):\n${sample}`,
    workedExample(contract),
    skeleton && skeletonOf(contract) ? `Start from this skeleton — keep the keys and their order, replace every ___ with an expression (add any lines before the return that you need):\n${skeletonOf(contract)}` : null,
    "Use no imports, no network, no globals. Export nothing: just declare the function.",
  ];
  // "fresh": the failures come back as REQUIREMENTS and the previous code does not (a small model shown its own code beside its failures hands the same code back — measured 2026-09-30)
  if (failures.length && repair === "fresh") lines.push(`An earlier attempt was run against the real data and these checks failed. Write the function again from the start so that none of them fail:\n${failures.slice(0, 5).map((f) => `- ${f}`).join("\n")}`);
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

/**
 * Parameters the function never reads. A small model that has the right idea often writes the metric case and forgets the parameter that
 * selects the other (`units`); the oracle then says "imperial: temp is 17, the recorded data says 63", which names a value but not the
 * mistake. This names the mistake. Advisory: it is added to a FAILING verdict only, so a function that passes with a parameter unread
 * (legitimately) is never failed for it. Approximate (a regex over source): a name appearing anywhere after the signature counts as read.
 */
export function unusedParams(code, name, params) {
  const at = String(code).search(new RegExp(`(?:function\\s+${name}\\s*\\(|(?:const|let|var)\\s+${name}\\s*=)`));
  if (at < 0) return [];
  const close = String(code).indexOf(")", at); // the end of the signature; everything after it is the body (braced or an arrow expression)
  const body = close < 0 ? "" : String(code).slice(close + 1);
  return params.filter((p) => !new RegExp(`(^|[^\\w$.])${p}(?![\\w$])`).test(body));
}

/**
 * `const` names assigned again later (`const at = ...; at = ...; at += ...; at++`). The engine's own message ("Assignment to constant variable")
 * does not say WHICH variable, and a small model hands back byte-identical code after it (measured 2026-09-30, both mouths, two runs). Naming
 * the variable is the whole repair. Approximate (a regex, not a scope analysis): advisory, added to a FAILING verdict only.
 */
export function constReassigned(code) {
  const src = String(code ?? ""), out = [];
  for (const m of src.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    const name = m[1], after = src.slice(m.index + m[0].length);
    if (new RegExp(`(^|[^\\w$.])${name.replace(/\$/g, "\\$")}\\s*(?:=(?![=>])|[-+*/%&|^]=|\\+\\+|--)`).test(after) || new RegExp(`(?:\\+\\+|--)${name.replace(/\$/g, "\\$")}(?![\\w$])`).test(after)) out.push(name);
  }
  return [...new Set(out)];
}

/** A unit is tested BEHIND the key-referent layer: the idea (`tz`) resolves to the real key (`timezone`) when exactly one real key qualifies; the resolutions come back with the verdict. */
export function testUnit(code, contract) {
  let fn;
  const declared = declaredAliases(contract);
  try { fn = loadUnit(code, contract.name, { resolve: { declared } }); } catch (e) { return { ok: false, failures: [`does not compile or declare ${contract.name}: ${String(e.message).slice(0, 160)}`] }; }
  const r = testFunction(fn, contract);
  if (!r.ok) for (const v of constReassigned(code)) r.failures.unshift(`\`${v}\` is declared with const and assigned again — declare it with let`);
  if (!r.ok) for (const p of unusedParams(code, contract.name, contract.params)) r.failures.unshift(`the function never reads its parameter \`${p}\` — the result must depend on it`);
  return { ...r, declared, resolutions: fn.resolutions?.() ?? [] };
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

/** The oracle's runs against an already-loaded function — a drawn unit, or a COMPOSITION of drawn leaves. */
export function testFunction(fn, contract) {
  const failures = [];
  for (const run of contract.runs) {
    let out, args;
    try { args = run.args(contract.sampleJson ?? contract.sampleText); out = fn(...args); } catch (e) { failures.push(`${run.label}: threw ${String(e.message).slice(0, 140)}`); continue; }
    try { for (const f of run.check(out, contract.sampleJson ?? contract.sampleText)) failures.push(`${run.label}: ${pointed(f, args, contract.params)}`); } catch (e) { failures.push(`${run.label}: the oracle could not read the output (${String(e.message).slice(0, 100)})`); }
  }
  return { ok: failures.length === 0, failures };
}

/** The hash a verified unit is cached under: contract text + oracle source + sample. A changed contract, test or sample is a new unit. */
export function contractHash(contract) {
  return sha(JSON.stringify([contract.name, contract.params, contract.doc, contract.returns, contract.notes ?? "", contract.runs.map((r) => r.label + String(r.check)).join("|"), sha(contract.sampleText ?? JSON.stringify(contract.sampleJson ?? null)), contract.shown ?? "", workedExample(contract) ?? "", contract.salt ?? "", KEY_REFERENTS_SCHEMA, JSON.stringify(declaredAliases(contract)), contract.cards === false ? "" : sha(CARDS_SCHEMA + cardsDoc())]));
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

/**
 * makeUnit(contract, { mouths, mouth, trails, cache, see, now, rng }) → { ok, code, model, rounds, calls, ms, cached, failures }
 *   mouths   the models that may draw (the structural default order)
 *   trails   the stigmergy's trails (mutated by returning the new set in .trails)
 *   see      ledger writer: see(event, fields)
 */
export async function makeUnit(contract, { mouths, mouth, trails = {}, cache = null, see = () => {}, now = Date.now(), rng = Math.random, explore = 0.1, skeleton = false, repair = "edit" } = {}) {
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
  let calls = 0, lastFailures = [];
  for (const model of order) {
    let previous = null, failures = [];
    for (let round = 0; round <= REPAIR_ROUNDS; round++) {
      const prompt = unitPrompt(contract, { failures, previous, skeleton, repair });
      let r;
      try { r = await mouth(model, prompt); } catch (e) { see("unit-draw", { name: contract.name, model, round, refused: String(e.message).slice(0, 140) }); break; }
      calls++;
      const code = extractCode(r.text, contract.name);
      if (!code) { failures = ["the reply holds no function declaration"]; previous = r.text.slice(0, 600); see("unit-draw", { name: contract.name, model, round, ms: r.ms, tokens: r.outTokens, ok: false, failures }); continue; }
      const res = testUnit(code, contract);
      see("unit-draw", { name: contract.name, model, round, ms: r.ms, promptTokens: r.promptTokens, tokens: r.outTokens, ok: res.ok, failures: res.failures.slice(0, 4), resolved: (res.resolutions ?? []).filter((x) => !x.ambiguous), ambiguous: (res.resolutions ?? []).filter((x) => x.ambiguous), code: code.slice(0, 1500) });
      if (res.ok) {
        trails = deposit(trails, { head, route: model, ok: true, ms: r.ms, at: now });
        cache?.put(hash, { name: contract.name, model, code, hash, declared: res.declared ?? {}, resolutions: res.resolutions ?? [], verifiedAt: new Date(now).toISOString() });
        see("unit", { name: contract.name, hash, cached: false, model, calls, rounds: round, ms: Date.now() - t0 });
        return { ok: true, code, model, rounds: round, calls, ms: Date.now() - t0, cached: false, failures: [], declared: res.declared ?? {}, resolutions: res.resolutions ?? [], trails };
      }
      // a mouth that hands back the SAME code after being shown the failures has nothing more to give this unit: the rest of its rounds are skipped
      const unchanged = previous !== null && code.replace(/\s+/g, "") === String(previous).replace(/\s+/g, "");
      failures = res.failures; previous = code; lastFailures = res.failures;
      if (unchanged) { see("unit-draw", { name: contract.name, model, round, skipped: "the redraw is identical to the previous code; the mouth is spent for this unit" }); break; }
    }
  }
  see("unit", { name: contract.name, hash, ok: false, gap: "no mouth produced a function that passes its oracle", calls, failures: lastFailures.slice(0, 4) });
  return { ok: false, code: null, model: null, rounds: REPAIR_ROUNDS, calls, ms: Date.now() - t0, cached: false, failures: lastFailures, trails };
}
