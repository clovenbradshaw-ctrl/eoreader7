#!/usr/bin/env node
// cli/reason.mjs — REASONING, DONE BY THE ENGINE, NOT THE MOUTH (2026-09-22).
//
// The user: "prove that it improves the reasoning of a lower level model — by
// not having the model do the reasoning. Wiring eoreader7 deeply into our
// Claude instance is what we're getting at." This is the door: any reasoner
// (Claude, gemma, a person) states its reasoning as claims, and eoreader7's
// own organs decide what holds. The reasoner never grades itself.
//
//   node cli/reason.mjs FILE.json [--json]      (or JSON on stdin)
//
// {
//   "claims":      [{ "ground": "/p3", "rel": "has-type", "roles": {"ARG0": "x", "ARG1": "int"},
//                     "polarity": "+", "force": "default"|"strict", "id": "c1", "said": "…" }],
//   "declare":     { "functional": [rel | {rel, role, giver}], "symmetric": [rel], "acyclic": [rel] },
//   "identity":    "exact" (default — code-safe) | "caseless" (prose),
//   "inferences":  [{ "kind": "same-reasoning"|"deduction"|"vacuous", "end1", "label", "end2", "relation", "yields", "ref" }],
//   "licenses":    ["relation→yields"]   — only a named giver licenses a step (R1),
//   "universals":  [{ "ref", "end1": "every …", "label", "end2", "tested": n, "counterexamples": ["measured …"] }],
//   "equations":   [{ "ref", "statement": "16:13:55 - 16:12:41 >= 600" }]   — hh:mm:ss read as seconds,
//   "order":       { "items": [..], "before": [[a, b], ..], "claims": [{ "ref", "first": a, "then": b }] }
// }
//
// Organs: GFP core (organs/reasoning-lint.js lintGfp), R1 inference licences
// (lintInferences), refutation by measured counterexample, equations by mathjs,
// "a must precede b" by the GFP core's cycle check (a cycle when "b before a"
// is added is the proof; otherwise a topological order is the counterexample).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { create, all } from "mathjs";
import { gfpClaim, claimFromTriple, claimKey, caselessIdentity, exactIdentity } from "../native/kernel/gfp-claim.js";
import { lintGfp, lintInferences, lintLedger } from "../native/organs/reasoning-lint.js";
import { citeGround, terminalLink } from "../native/organs/ground-cite.js";
import { writeReasoningRecord } from "../native/organs/reasoning-record.js";

const math = create(all);
const limitedEvaluate = math.evaluate;
math.import({ import: () => { throw new Error("disabled"); }, createUnit: () => { throw new Error("disabled"); }, parse: () => { throw new Error("disabled"); }, evaluate: () => { throw new Error("disabled"); } }, { override: true });

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const compact = args.includes("--compact");
const doAnts = args.includes("--ants");
const file = args.find((a) => !a.startsWith("--"));
const input = JSON.parse(file ? fs.readFileSync(file, "utf8") : fs.readFileSync(0, "utf8"));

const declared = (input.claims ?? []).map((c) => gfpClaim(c));
const decl = input.declare ?? {};
const text = input.text ?? (input.textFile ? fs.readFileSync(input.textFile, "utf8") : null);

// GROUNDING: does each declared claim's own `ground` correspond to real
// material? The GFP core below checks whether claims agree with EACH OTHER;
// it never checks whether one holds against the bytes it names — this file's
// own header disclosed that gap from the start. citeGround earns a real
// citation the same way cite.js earns one for a model's prose (statistical
// attribution against the file's own chunks, never a bare keyword match).
// Only STRUCTURE (ground/file/line/url/ref/verdict/score) ever leaves this
// process — no excerpt is printed or persisted anywhere below
// (native/organs/reasoning-record.js's own header says why: the one honest
// verbatim home for a citation is the real file at its own line, opened
// live, never a copy that could drift and never a copy the model reads).
const sources = declared.map((c, i) => citeGround(c, input.claims[i]?.said ?? input.claims[i]?.text));
// Only "missing" (looks like a real path, nothing there) and "unattributed"
// (the file is real, the claim's own words don't beat chance against it) are
// worth a finding. "unaddressed" (a non-filesystem ground, e.g. text-mode's
// own "/p3") is not a failure of anything and stays out of `findings`
// entirely. Always `warn`, never `error`: an error flips `ok` to false, and
// `ok:false` is exactly what coverageOf (claude-code-state.mjs) reads as
// "not covered" — a claim grounded at a file THIS TURN IS CREATING would
// then be unable to ever pass, permanently blocking the steer gate for new
// files. Disclosed, not silent: the "missing" detail says so.
const groundFindings = sources
  .filter((s) => s.verdict === "missing" || s.verdict === "unattributed")
  .map((s) => ({
    kind: `ground_${s.verdict}`,
    severity: "warn",
    at: s.ground,
    detail: s.verdict === "missing"
      ? `no file exists at this ground — expected if this turn is CREATING ${s.ground}; otherwise the address may be wrong`
      : `${s.file} is real, but this claim's own words do not beat chance against it (score ${s.score ?? 0} vs floor ${s.floor ?? 0}) — the address exists; nothing here confirms this claim's content is actually there`,
  }));

// ── THE FULL MACHINERY, when the reasoning is given as TEXT ─────────────────
// read (the engine's own relation reader) → referents (the pipeline's own
// buildReferents) → hyperlexicon (every claim admitted with its witness:
// `reader:engine` for what the engine read, `testimony:claude` for what the
// reasoner only declared) → the holograph's fold → the GFP core. A sentence
// the reader could not read is an UNREAD STEP: the engine cannot vouch for it.
let read = [], unread = [], ledgerFindings = [], resolveName = null, sentencesTotal = 0;
// hl/hlLog: the hyperlexicon and its door, hoisted out of the `if (text)`
// block below (2026-09-22, additive) so the durable-feed integration point
// near the end of this file — after `out` is computed, changing nothing
// about it — can fold the SAME ledger this block already builds, instead of
// letting it be discarded when the block ends. See cli/reasoning-ledger.mjs's
// own header for why: today this hyperlexicon is admitted (both
// reader:engine and testimony:claude witnesses) only to compute this run's
// own lint findings, then thrown away — nothing about it reaches eoreader7's
// accumulated knowledge. Both stay null when `text` is absent, exactly as
// every other name in the hoist above already does.
let hl = null, hlLog = null;
if (text) {
  const { engineRelationsFor } = await import("../native/the-fold/reader-bundle.js");
  const { buildReferents } = await import("../native/the-fold/referents.js");
  const { splitSentences } = await import("../native/adapters/text/spans.js");
  const TL = await import("../native/kernel/task-log.js");
  const cube = await import("../native/kernel/cube.js");
  const { makeHyperlexicon } = await import("../native/organs/hyperlexicon.js");

  // Holons from the text's own seams: each blank-line paragraph is /pN.
  const paras = [];
  { let at = 0; for (const block of text.split(/\n\s*\n/)) { const start = text.indexOf(block, at); paras.push({ start, end: start + block.length }); at = start + block.length; } }
  const groundAt = (off) => { const i = paras.findIndex((p) => off >= p.start && off < p.end); return i >= 0 ? `/p${i + 1}` : "/"; };

  const edges = engineRelationsFor([text]).edges ?? [];
  read = edges.map((e, i) => claimFromTriple(e.end1, e.label, e.end2, { ground: groundAt(e.spans?.[0]?.start ?? 0), polarity: e.polarity === "-" ? "-" : "+", id: `read:${i}` }));

  // Unread steps: a sentence no read edge touches.
  const sents = splitSentences(text);
  sentencesTotal = sents.length;
  for (const { text: s, offset: start } of sents) {
    const end = start + s.length;
    const touched = edges.some((e) => (e.spans ?? []).some((sp) => sp.start < end && sp.end > start));
    if (!touched) unread.push({ kind: "unread_step", severity: "warn", at: groundAt(start), detail: `the engine read nothing in "${s.slice(0, 90)}${s.length > 90 ? "…" : ""}" — anything this step asserts rests on the reasoner alone` });
  }

  const R = buildReferents(text);
  resolveName = R.resolveName;

  // The ledger: both voices, each with its witness and its spans.
  const taskLog = { ...TL, cellOf: cube.cellOf };
  hl = makeHyperlexicon(taskLog);
  hlLog = hl.createHyperlexicon({ frame: { reader: "cli/reason", giver: "eoreader7" } });
  hlLog = hl.admit(hlLog, edges.map((e) => ({ subject: e.end1, verb: e.label, object: e.end2, polarity: e.polarity, spans: (e.spans ?? []).map((sp) => ({ at: `reasoning#${sp.start}-${sp.end}`, ref: "reasoning", text: sp.text })) })), { witness: "reader:engine" }).log;
  hlLog = hl.admit(hlLog, declared.map((c, i) => ({ subject: c.roles.ARG0 ?? "", verb: c.rel, object: c.roles.ARG1 ?? "", spans: [{ at: `declared#${i}`, ref: "declared", text: input.claims[i].said ?? `${c.roles.ARG0} ${c.rel} ${c.roles.ARG1}` }] })), { witness: "testimony:claude" }).log;
  const lr = lintLedger(hlLog, { door: hl, taskLog, strictness: "report", referentIndex: { referents: new Set(), resolve: R.resolveName, represent: R.represent } });
  ledgerFindings = lr.findings.filter((f) => f.kind === "testimony_only");
}

// Identity: through the referent organ when there is text (prose), else as declared.
const baseIdentity = input.identity === "caseless" ? caselessIdentity : exactIdentity;
const identity = resolveName && input.identity !== "exact"
  ? (s) => { const ids = resolveName(s); return ids.size ? [...ids].sort().join("|") : caselessIdentity(s); }
  : baseIdentity;
const claims = [...read, ...declared];
const gfp = lintGfp(claims, { ...decl, identity, strictness: "strict" });

// Corroboration: a declared claim the engine also READ is no longer testimony.
const readKeys = new Set(read.map((c) => claimKey(c, { identity })));
const corroborated = declared.filter((c) => readKeys.has(claimKey(c, { identity }))).length;

// Equations: a claim a model states about a quantity, checked, never trusted.
const secondsOf = (s) => String(s).replace(/\b(\d{1,2}):(\d{2}):(\d{2})\b/g, (_, h, m, x) => String(+h * 3600 + +m * 60 + +x));
const verify = (inf) => {
  try {
    const v = limitedEvaluate(secondsOf(inf.statement));
    if (typeof v !== "boolean") return { verdict: "unchecked", detail: `evaluates to ${v}, not a truth value` };
    return v ? { verdict: "holds", detail: "mathjs" } : { verdict: "false", detail: `mathjs: ${secondsOf(inf.statement)} is false` };
  } catch (e) { return { verdict: "unchecked", detail: e.message }; }
};
// Universals: a measured counterexample is a veto.
const refute = (inf) => (inf.counterexamples?.length
  ? { refuted: true, detail: `${inf.counterexamples.length} counterexample(s) in ${inf.tested ?? "?"} tested: ${inf.counterexamples[0]}` }
  : { refuted: false, detail: `no counterexample in ${inf.tested ?? "?"} tested` });

const infs = [
  ...(input.inferences ?? []),
  ...(input.universals ?? []).map((u) => ({ ...u, kind: "universal" })),
  ...(input.equations ?? []).map((e) => ({ ...e, kind: "equation" })),
];
const inf = await lintInferences(infs, { licenses: new Set(input.licenses ?? []), verify, refute, strictness: "strict" });

// Order claims: "a must precede b in every consistent order" holds exactly when
// adding "b before a" to the declared prerequisites closes a cycle. The GFP
// core's own cycle check decides it (linear, any size): a cycle is the proof;
// no cycle, and a topological order of the extended prerequisites is the
// counterexample, shown. (An exhaustive search over orders — the first form —
// cannot finish past ~10 items; a satisfiability question needs one witness.)
const orderFindings = [];
if (input.order?.items?.length && input.order.claims?.length) {
  const items = input.order.items;
  const before = input.order.before ?? [];
  const declared = new Set(items);
  // Every id `before`/`claims` depends on must be in `items`, or `topo`'s
  // indegree/adjacency maps (built from `items` alone) silently miscount an
  // edge touching an undeclared id — an id that can never reach indegree 0
  // by construction, not because the graph truly has no valid order. That
  // used to surface as `topo` returning null on a perfectly acyclic graph
  // and a crash at the `.join` below; it is now a disclosed finding instead.
  const used = new Set();
  for (const [a, b] of before) { used.add(a); used.add(b); }
  for (const c of input.order.claims) { used.add(c.first); used.add(c.then); }
  const undeclared = [...used].filter((id) => !declared.has(id));
  if (undeclared.length) {
    orderFindings.push({ kind: "order_item_undeclared", severity: "error", at: "/order", detail: `${undeclared.length} id(s) appear in "before" or a claim but were never declared in order.items: ${undeclared.join(", ")} — every id an order claim depends on must be in the declared universe, or no order (valid or counterexample) can be built over it` });
  } else {
    const topo = (edges) => {
      const indeg = new Map(items.map((n) => [n, 0])), adj = new Map(items.map((n) => [n, []]));
      for (const [a, b] of edges) { adj.get(a)?.push(b); indeg.set(b, (indeg.get(b) ?? 0) + 1); }
      const ready = items.filter((n) => indeg.get(n) === 0), out = [];
      while (ready.length) { const n = ready.shift(); out.push(n); for (const m of adj.get(n) ?? []) { indeg.set(m, indeg.get(m) - 1); if (indeg.get(m) === 0) ready.push(m); } }
      return out.length === items.length ? out : null;
    };
    const precedes = (a, b, extra = {}) => gfpClaim({ ground: "/order", rel: "precedes", roles: { ARG0: a, ARG1: b }, ...extra });
    const base = lintGfp(before.map(([a, b]) => precedes(a, b)), { acyclic: ["precedes"], strictness: "strict" });
    if (base.findings.some((f) => f.kind === "circular")) {
      orderFindings.push({ kind: "order_prerequisites_circular", severity: "error", at: "/order", detail: `the declared prerequisites themselves close a cycle — ${base.findings.find((f) => f.kind === "circular").detail}` });
    } else {
      for (const c of input.order.claims) {
        // A reflexive claim ("X must precede X") is never a genuine order
        // constraint — no prerequisite graph can make an item precede
        // itself. Left unguarded, `precedes(c.then, c.first)` builds a bare
        // self-loop, which the cycle check always reports as a cycle
        // (correctly, in isolation), so every reflexive claim would read as
        // "entailed" regardless of the declared prerequisites — a
        // content-independent false positive, not a witnessed proof.
        if (c.first === c.then) {
          orderFindings.push({ kind: "order_reflexive_claim", severity: "error", at: c.ref ?? null, detail: `"${c.first} must precede ${c.then}" is not a coherent order constraint — an item cannot precede itself, so this is never entailed by any set of prerequisites (a bare self-loop is not a proof)` });
          continue;
        }
        const withCounter = lintGfp([...before.map(([a, b]) => precedes(a, b)), precedes(c.then, c.first)], { acyclic: ["precedes"], strictness: "strict" });
        const cycle = withCounter.findings.find((f) => f.kind === "circular");
        if (cycle) {
          orderFindings.push({ kind: "order_entailed", severity: "info", at: c.ref ?? null, detail: `"${c.first} must precede ${c.then}" holds in every consistent order: putting ${c.then} first closes a cycle (${cycle.detail.replace(/^.*returns to its start: /, "").replace(/ — .*$/, "")})` });
        } else {
          const seq = topo([...before, [c.then, c.first]]);
          orderFindings.push({ kind: "order_not_entailed", severity: "error", at: c.ref ?? null, detail: `"${c.first} must precede ${c.then}" does not follow from the declared prerequisites — a consistent order puts ${c.then} first: ${seq.join(" → ")}` });
        }
      }
    }
  }
}

// Wilson's ants: falsification by edge-case testing on high-force claims.
let antFindings = [];
if (doAnts) {
  const strict = declared.filter((c) => c.force === "strict");
  const tough = gfp.findings.filter((f) => f.severity === "error" || (f.severity === "warn" && f.kind === "several-valued"));
  for (const claim of strict) {
    const roles = Object.values(claim.roles ?? {}).filter(Boolean);
    if (roles.length >= 2) {
      const antTests = [
        { variant: "empty_string", roles: roles.map(() => "") },
        { variant: "null_role", roles: roles.map((r, i) => i === 0 ? null : r) },
        { variant: "recursive", roles: roles.map((r) => `${r}(${r})`) },
        { variant: "self_ref", roles: roles.map((r) => r === roles[0] ? `${r} = ${r}` : r) },
      ];
      for (const test of antTests) {
        try {
          const testClaim = gfpClaim({ ...claim, roles: Object.fromEntries(Object.keys(claim.roles ?? {}).map((k, i) => [k, test.roles[i]])), id: `ant_${claim.id}_${test.variant}`, ground: claim.ground });
          const testResult = lintGfp([testClaim], { ...decl, identity, strictness: "strict" });
          if (testResult.findings.some((f) => f.severity === "error")) {
            antFindings.push({ kind: "ant_falsified", severity: "info", at: claim.ground, detail: `ant test "${test.variant}" falsifies: ${claim.roles.ARG0} ${claim.rel} ${claim.roles.ARG1}`, variant: test.variant });
          }
        } catch (e) { /* test variant produced exception: also a probe result */ }
      }
    }
  }
}

const findings = [...gfp.findings, ...inf.findings, ...orderFindings, ...unread, ...ledgerFindings, ...antFindings, ...groundFindings];
const errors = findings.filter((f) => f.severity === "error");
const vouched = text ? { sentences: sentencesTotal, read: sentencesTotal - unread.length, edges: read.length, declared: declared.length, corroborated } : null;
// The grounds this run checked — the hooks read them to know which files the
// reasoning covered (cli/claude-code-state.mjs coverageOf).
const grounds = [...new Set(declared.map((c) => c.ground))];
// declaredClaims: the input's own claims, verbatim, no transformation — the
// durable-log content Part B of the reason-claims design (2026-09-22) reads
// back out of a Bash tool_response. Only ever emitted by the asJson branch
// below (JSON.stringify(out, ...)); --compact and plain-text mode print their
// own separate formatted output and never touch this field.
// sources, stripped of `excerpt`: this is the --json payload a caller (this
// process's own invoker, and claude-code-ledger.mjs reading the same Bash
// tool_response) receives, so it is held to the same rule as the console
// output below — structure only, never a copied verbatim byte.
const sourcesOut = sources.map(({ excerpt, ...structural }) => structural);
const out = { ok: errors.length === 0, errors: errors.length, grounds, findings, vouched, gfp: { counts: gfp.counts, unjudged: gfp.unjudged, apart: gfp.apart, holons: gfp.holons, basis: gfp.basis }, inference: inf.counts, declaredClaims: input.claims ?? [], sources: sourcesOut };

// DURABLE FEED (2026-09-22, additive): when this run was given BOTH `text`
// and at least one declared claim, fold the hyperlexicon built above (both
// reader:engine and testimony:claude witnesses — neither dropped) and
// append it to eoreader7's own document space, durably, so ongoing
// reasoning feeds the engine's accumulated knowledge and not only this run's
// own lint findings above. This runs regardless of `out.ok` — a failed run's
// reasoning is still real reasoning worth keeping — and it never touches
// `out` itself (computed above already) or throws past this file: a write
// failure here must never change --json/--compact/plain output or the exit
// code below. See cli/reasoning-ledger.mjs for what gets written and where,
// and cli/claude-code-ledger.mjs for the OTHER, separate durable feed
// (per-session declared claims only) this is deliberately additive beside.
if (text && declared.length && hl && hlLog) {
  try {
    const { appendReasoningLedger } = await import("./reasoning-ledger.mjs");
    appendReasoningLedger({ hl, log: hlLog, runAt: new Date().toISOString(), cwd: process.cwd(), grounds, ok: out.ok, errors: out.errors });
  } catch { /* additive only; the verdict and every field of `out` above stand without it */ }
}

// The marker a hook reads: reasoning was handed to the engine this turn.
try {
  const dir = path.join(os.homedir(), ".claude", "eo-reason");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "last.json"), JSON.stringify({ at: new Date().toISOString(), cwd: process.cwd(), ok: out.ok, errors: out.errors, findings: findings.length, claims: claims.length, inferences: infs.length, vouched }, null, 1));
} catch { /* the marker is a convenience; the verdict above stands without it */ }

// THE REASONING RECORD: claims in real GFP notation + findings + grounding
// verdicts, written straight to a file — never printed, never held only in
// this process's stdout — so it is reviewable directly (Claude Code's own
// show_pane, a person's editor) rather than through whatever a caller might
// paraphrase it as. See native/organs/reasoning-record.js's own header.
const recordPath = writeReasoningRecord({ claims: declared, findings, sources: sourcesOut });
const cited = sources.filter((s) => s.verdict === "cited");
const citationLine = (s) => `    ${s.verdict === "cited" ? "✓ cited" : s.verdict === "unattributed" ? "? unattributed" : s.verdict === "missing" ? "✗ missing" : "· " + s.verdict}  ${s.ground}${s.file ? `  →  ${terminalLink(`${s.file}:${s.line ?? "?"}`, s.url)}` : ""}`;

if (asJson) console.log(JSON.stringify(out, null, 1));
else if (compact) {
  const header = `eoreader7 reason · ${claims.length} claim(s) · ${infs.length} inference(s) · ${input.order?.claims?.length ?? 0} order claim(s) → ${out.ok ? "✓ OK" : `✗ ${errors.length} ERROR(S)`}`;
  console.log(header);
  if (!out.ok) {
    for (const f of errors) console.log(`  ✗ ${f.kind}${f.at ? ` @ ${f.at}` : ""}: ${f.detail.split("\n")[0]}`);
  }
  if (antFindings.length) console.log(`  ⚠ ${antFindings.length} falsification(s) from ants`);
  if (sources.length) console.log(`  sources: ${cited.length}/${sources.length} cited — open a file:line above, or the record, to see the real bytes (never printed here)`);
  console.log(`  grounds: ${JSON.stringify(grounds)}`);
  if (recordPath) console.log(`  reasoning record (real GFP notation, never prose): ${recordPath}`);
  console.log(`  (details hidden; pass --json for full report)`);
} else {
  console.log(`eoreader7 reason · ${claims.length} claim(s) · ${infs.length} inference(s) · ${input.order?.claims?.length ?? 0} order claim(s) → ${out.ok ? "OK" : `${errors.length} ERROR(S)`}`);
  if (vouched) console.log(`  engine vouches for ${vouched.read}/${vouched.sentences} sentence(s) it could read · ${vouched.edges} relation(s) read · ${vouched.corroborated}/${vouched.declared} declared claim(s) independently read`);
  for (const f of findings) console.log(`  [${f.severity}] ${f.kind}${f.at ? ` @ ${f.at}` : ""}\n      ${f.detail}`);
  if (gfp.unjudged) console.log(`  (${gfp.unjudged} several-valued pair(s) of undeclared relations counted, not judged)`);
  if (gfp.apart) console.log(`  (${gfp.apart} pair(s) in sibling holons held apart)`);
  console.log(`  grounds: ${JSON.stringify(grounds)}`);
  if (sources.length) {
    console.log(`  sources (${cited.length}/${sources.length} cited — the real bytes live only at the address; never copied here):`);
    for (const s of sources) console.log(citationLine(s));
  }
  if (recordPath) console.log(`  reasoning record (claims in real GFP case-marked notation, findings, source verdicts — never prose): ${recordPath}`);
}
process.exit(out.ok ? 0 : 1);
