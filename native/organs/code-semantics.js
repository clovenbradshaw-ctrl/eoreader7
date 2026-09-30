// ═══ LOVELACE · LAVAR ═══ Owner: Lovelace; the reading that deals with MEANING, where code-canonical.js deals with spelling.
// code-semantics.js — what does a suggestion's function actually DEPEND on, and does the contract say it should?
//
// "We should be able to deal with semantic issues via reasoning in the holograph." (the operator, 2026-09-30)
//
// Measured (2026-09-30, 69 distinct failed draws): about half are referent-shaped — the function points at the wrong thing or at nothing — and
// the largest single group is a parameter that SELECTS a referent (`units` picks temp_C or temp_F) being ignored. Spelling and scoping slips are
// read by code-canonical.js and recover little; these are what is left. They are not found by running an oracle (there may be none) but by two
// readings held against each other:
//
//   OBSERVED   what each output key depends on, found by INTERVENTION: change one input and see which outputs move (Bateson: a difference
//              that makes a difference). Language-agnostic, needs no parser, and cannot be argued with — it is what the function DID.
//   DECLARED   what the contract's own words say about that output: the clause of its notes that defines it, read for the input keys and
//              the parameters it names (key-referents.js tokens — `occupied beds` is `occupied_beds`).
//
// Their disagreement is a typed finding, in the vocabulary reasoning-lint.js already uses for any record (contested, unlicensed, missing):
//
//   parameter_insensitive   the clause for K names a parameter, and K does not move when that parameter does       (the `units` slips)
//   output_independent      K does not move under ANY input: the function returned an answer it did not compute     (the copied example)
//   missing_referent        the clause for K names an input key and K never reads it
//   unlicensed_referent     K reads an input key no word of K's clause, and not K's own name, licenses             (`free` from `patients_waiting`)
//
// THE WALL. A finding is a READING, not a conviction: absence of a license is not proof of error, so `unlicensed_referent` requires that NO word
// of the key's name appears in the clause (a shared word such as `beds` licenses), and nothing is reported for an output the contract says
// nothing about. Every finding carries its evidence. The observed reads are also landed as EOGfpClaims (`reads`, at the holon /anchor/output)
// so the holograph can project them at a cursor and reasoning-lint's GFP core can judge them beside any other claim.
//
// Pure: the function under reading arrives as `call`. No model, no IO.
import { keyTokens, foldKey, keyTier } from "./key-referents.js";
import { gfpClaim } from "../kernel/gfp-claim.js";

export const SEMANTICS_SCHEMA = "EOCodeSemantics@1";

const clone = (v) => JSON.parse(JSON.stringify(v));
const prim = (v) => ["string", "number", "boolean"].includes(typeof v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** scalar leaves of the arguments: [{ path: [argIndex, ...keys], value }] — at most `items` elements of a list, so a long list does not make a long probe. */
export function leavesOf(argv, { items = 2, max = 200 } = {}) {
  const out = [];
  const walk = (v, path) => {
    if (out.length >= max) return;
    if (v !== null && typeof v === "object") { for (const [k, x] of Array.isArray(v) ? v.slice(0, items).map((x, i) => [i, x]) : Object.entries(v)) walk(x, [...path, k]); return; }
    if (prim(v)) out.push({ path, value: v });
  };
  argv.forEach((a, i) => walk(a, [i]));
  return out;
}

const setAt = (argv, path, value) => { const c = clone(argv); let o = c; for (let i = 0; i < path.length - 1; i++) o = o[path[i]]; o[path[path.length - 1]] = value; return c; };

/** A different value for a leaf: a selector takes the OTHER values it is known to take (`imperial` for `metric`); anything else is changed unmistakably. */
const changed = (v, alts) => {
  const other = (alts ?? []).filter((a) => !same(a, v));
  if (other.length) return other;
  if (typeof v === "number") return [v * 7 + 13];
  if (typeof v === "boolean") return [!v];
  return [`§${v}`, `${v} zzqx`, `zzqx ${v}`, `${v} ${"zzqxwv".repeat(6)}`]; // the last is LONG: a "longest word" only moves for a longer one; a tokenizer ignores a symbol prefix, a selector ignores an appended word: any of the three moving the output is a dependence
};

const nameOf = (path, params) => (path.length === 1 ? params[path[0]] : [params[path[0]], ...path.slice(1).map((k) => (typeof k === "number" ? `[${k}]` : k))].join(".").replace(/\.\[/g, "["));
const terminalOf = (path, params) => { const t = path[path.length - 1]; return typeof t === "number" ? (path.length > 2 ? String(path[path.length - 2]) : params[path[0]]) : String(t); };

/**
 * observedDependencies({ call, argv, params, alternatives }) -> { keys, deps: { K: [{ name, terminal, param }] }, threw } | null
 *   call          (argv) => value (throws allowed)
 *   alternatives  { [paramIndex]: [values the parameter is known to take] } — a selector must be probed with its OTHER values, or
 *                 flipping `metric` to `§metric` lands in the same branch and reads as "no dependence"
 * The probe runs at the example arguments AND at each alternative value of each selector, so a dependency that exists only in the
 * other branch (`temp_F` under "imperial") is found.
 */
export function observedDependencies({ call, argv, params, alternatives = {} }) {
  const points = [argv];
  for (const [i, vals] of Object.entries(alternatives)) for (const v of vals) if (!same(v, argv[i])) points.push(setAt(argv, [Number(i)], v));
  const deps = new Map(); let keys = null, threw = false;
  for (const point of points) {
    let base; try { base = call(clone(point)); } catch { continue; }
    if (!base || typeof base !== "object" || Array.isArray(base)) continue;
    keys ??= Object.keys(base);
    for (const k of Object.keys(base)) if (!deps.has(k)) deps.set(k, new Map());
    for (const leaf of leavesOf(point)) {
      const alts = leaf.path.length === 1 ? alternatives[leaf.path[0]] : null;
      for (const v of changed(leaf.value, alts)) {
        let out; try { out = call(setAt(point, leaf.path, v)); } catch { threw = true; continue; }
        if (!out || typeof out !== "object") continue;
        for (const k of Object.keys(base)) if (!same(out[k], base[k])) deps.get(k).set(nameOf(leaf.path, params), { name: nameOf(leaf.path, params), terminal: terminalOf(leaf.path, params), param: leaf.path.length === 1 ? params[leaf.path[0]] : null });
      }
    }
  }
  if (!keys) return null;
  return { keys, deps: Object.fromEntries(keys.map((k) => [k, [...(deps.get(k)?.values() ?? [])]])), threw };
}

// ---- the contract's own words about an output ----
const words = (s) => (String(s).match(/[A-Za-z_$][\w$]*/g) ?? []);
/** tokens of everything said in a clause: every word, and every camelCase / snake_case piece of it */
const tokensOf = (clauses) => new Set(clauses.flatMap((c) => words(c).flatMap((w) => [w.toLowerCase(), ...keyTokens(w)])));
const near = (a, b) => a === b || (a.length >= 3 && b.startsWith(a)) || (b.length >= 3 && a.startsWith(b));

/** the segments of the contract's text that DEFINE or describe output key K: split on `;`, sentence ends, lines and `, key =` boundaries, kept where K is a whole word */
export function clausesFor(contract, key) {
  const text = `${contract.returns ?? ""}\n${contract.notes ?? ""}`;
  const segs = text.split(/(?<=[.;])\s+|\n|,\s+(?=[A-Za-z_$][\w$]*\s*=)/);
  const want = foldKey(key);
  return segs.filter((s) => words(s).some((w) => foldKey(w) === want || keyTokens(w).map(foldKey).includes(want)));
}

const baseValue = (call, argv, k) => { try { return call(clone(argv))?.[k]; } catch { return undefined; } };

/**
 * The kinds that are shipped by default. Measured offline (native/the-fold/semantics-offline.mjs) on 12 reference implementations — code that
 * passes its whole oracle, so every finding is a false alarm: parameter_insensitive and output_independent raise none; missing_referent and
 * unlicensed_referent read PROSE clauses and cried wolf (67 false alarms before the fixes below, `km` depends on latitude though no clause says so),
 * so they are opt-in (`kinds`), never on the path a model is prompted from.
 */
export const PRECISE_KINDS = Object.freeze(["parameter_insensitive", "output_independent"]);
export const ALL_KINDS = Object.freeze([...PRECISE_KINDS, "missing_referent", "unlicensed_referent"]);

/**
 * readSemantics({ call, argv, params, contract, alternatives, anchor }) ->
 *   { schema, deps, findings, claims, read: boolean }   read: false when nothing could be observed (the function threw everywhere, or answers no object)
 */
export function readSemantics({ call, argv, params, contract, alternatives = {}, anchor = "anchor", kinds = PRECISE_KINDS }) {
  const obs = observedDependencies({ call, argv, params, alternatives });
  if (!obs) return { schema: SEMANTICS_SCHEMA, deps: {}, findings: [], claims: [], read: false };
  const findings = [], claims = [];
  const paramSet = new Set(params.map((p) => p.toLowerCase()));
  for (const k of obs.keys) {
    const deps = obs.deps[k];
    for (const d of deps) claims.push(gfpClaim({ ground: `/${anchor}/${k}`, rel: "reads", roles: { ARG0: k, ARG1: d.name }, basis: "observed by intervention: changing it changes this output" }));
    const clauses = clausesFor(contract, k);
    if (!deps.length) {
      // an empty answer (null, "", 0, false, []) at the example legitimately depends on nothing there: a station with no address tags has no address
      const v = baseValue(call, argv, k);
      if (kinds.includes("output_independent") && !(v === null || v === undefined || v === "" || v === 0 || v === false || (Array.isArray(v) && !v.length))) findings.push({ kind: "output_independent", key: k, detail: `\`${k}\` does not change whatever the input is`, evidence: { clauses } });
      continue;
    }
    if (!clauses.length) continue; // the contract says nothing about K: nothing to hold the reading against
    const toks = tokensOf(clauses);
    // a parameter the clause names, and K does not follow
    for (const p of params) {
      if (![...toks].some((t) => near(t, p.toLowerCase()))) continue;
      const i = params.indexOf(p);
      if (!alternatives[i]?.length) continue;
      if (kinds.includes("parameter_insensitive") && !deps.some((d) => d.param === p)) findings.push({ kind: "parameter_insensitive", key: k, param: p, detail: `\`${k}\` gives the same value whatever \`${p}\` is, and its description names \`${p}\``, evidence: { clauses, values: alternatives[i] } });
    }
    // input keys the clause names outright and K never reads
    const inputKeys = [...new Set(leavesOf(argv).map((l) => terminalOf(l.path, params)).filter((t) => !paramSet.has(t.toLowerCase())))];
    for (const ik of kinds.includes("missing_referent") ? inputKeys : []) {
      const kt = keyTokens(ik).filter((t) => t.length >= 3);
      if (kt.length >= 2 && kt.every((t) => [...toks].some((x) => near(t, x))) && !deps.some((d) => d.terminal === ik) && ![...deps].some((d) => foldKey(d.terminal) === foldKey(ik))) {
        findings.push({ kind: "missing_referent", key: k, refers: ik, detail: `the description of \`${k}\` names \`${ik}\` and \`${k}\` never reads it`, evidence: { clauses } });
      }
    }
    // keys K reads that nothing in the clause, and not K's own name, licenses. A clause that names ANOTHER OUTPUT (`tax = subtotal × tax_rate`)
    // carries that output's own reads with it: `tax` is licensed to read what `subtotal` reads.
    const viaOutputs = new Set(obs.keys.filter((o) => o !== k && [...toks].includes(o.toLowerCase())).flatMap((o) => obs.deps[o].map((d) => d.terminal)));
    for (const d of kinds.includes("unlicensed_referent") ? deps : []) {
      if (d.param) continue;
      const tt = keyTokens(d.terminal);
      const licensed = tt.some((t) => [...toks].some((x) => near(t, x))) || keyTier(k, d.terminal) !== null || foldKey(k) === foldKey(d.terminal) || viaOutputs.has(d.terminal);
      if (!licensed) findings.push({ kind: "unlicensed_referent", key: k, refers: d.terminal, detail: `\`${k}\` reads \`${d.terminal}\`, and nothing in the description of \`${k}\` involves it`, evidence: { clauses, read: d.name } });
    }
  }
  return { schema: SEMANTICS_SCHEMA, deps: Object.fromEntries(obs.keys.map((k) => [k, obs.deps[k].map((d) => d.name)])), findings, claims, read: true };
}

/**
 * The findings as plain facts for the NEXT prompt — about the thing, never about the machinery or the model: the description of the output,
 * and what the function did. (P55: nothing in a model-facing line names the apparatus; a fact, not a prohibition.)
 */
export function factsFrom(findings, { max = 6 } = {}) {
  const seen = new Set(), out = [];
  for (const f of findings) {
    const clause = (f.evidence?.clauses ?? []).join(" ").replace(/\s+/g, " ").trim().slice(0, 240);
    let line;
    if (f.kind === "parameter_insensitive") line = `\`${f.key}\` has to follow \`${f.param}\` (it takes the values ${(f.evidence.values ?? []).map((v) => JSON.stringify(v)).join(" and ")}); in your version it is the same for both. What is said of it: ${clause}`;
    else if (f.kind === "output_independent") line = `\`${f.key}\` came out the same whatever the input was; it has to be worked out from the input. What is said of it: ${clause || "(nothing more)"}`;
    else if (f.kind === "missing_referent") line = `\`${f.key}\` is described in terms of \`${f.refers}\`, which your version does not use. What is said of it: ${clause}`;
    else if (f.kind === "unlicensed_referent") line = `\`${f.key}\` is described as: ${clause} — that does not involve \`${f.refers}\`.`;
    else if (f.kind === "ambiguous_call") line = `\`${f.name}\` could mean any of ${f.candidates.map((c) => `\`${c}\``).join(", ")} — say which one you mean.`;
    else if (f.kind === "unresolved_call") line = `There is no function called \`${f.name}\` here.`;
    else continue;
    if (!seen.has(line)) { seen.add(line); out.push(line); }
    if (out.length >= max) break;
  }
  return out;
}
