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
// "a must precede b" by exhaustive search (organs/reasoning-core.js solveCSP —
// refuted when a consistent order puts b first). Exit 1 when anything errs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { create, all } from "mathjs";
import { gfpClaim, claimFromTriple, claimKey, caselessIdentity, exactIdentity } from "../native/kernel/gfp-claim.js";
import { lintGfp, lintInferences, lintLedger } from "../native/organs/reasoning-lint.js";
import { finiteDomain, declareVariable, declareConstraint, makeCSP, solveCSP } from "../native/organs/reasoning-core.js";

const math = create(all);
const limitedEvaluate = math.evaluate;
math.import({ import: () => { throw new Error("disabled"); }, createUnit: () => { throw new Error("disabled"); }, parse: () => { throw new Error("disabled"); }, evaluate: () => { throw new Error("disabled"); } }, { override: true });

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const file = args.find((a) => !a.startsWith("--"));
const input = JSON.parse(file ? fs.readFileSync(file, "utf8") : fs.readFileSync(0, "utf8"));

const declared = (input.claims ?? []).map((c) => gfpClaim(c));
const decl = input.declare ?? {};
const text = input.text ?? (input.textFile ? fs.readFileSync(input.textFile, "utf8") : null);

// ── THE FULL MACHINERY, when the reasoning is given as TEXT ─────────────────
// read (the engine's own relation reader) → referents (the pipeline's own
// buildReferents) → hyperlexicon (every claim admitted with its witness:
// `reader:engine` for what the engine read, `testimony:claude` for what the
// reasoner only declared) → the holograph's fold → the GFP core. A sentence
// the reader could not read is an UNREAD STEP: the engine cannot vouch for it.
let read = [], unread = [], ledgerFindings = [], resolveName = null, sentencesTotal = 0;
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
  const hl = makeHyperlexicon(taskLog);
  let log = hl.createHyperlexicon({ frame: { reader: "cli/reason", giver: "eoreader7" } });
  log = hl.admit(log, edges.map((e) => ({ subject: e.end1, verb: e.label, object: e.end2, polarity: e.polarity, spans: (e.spans ?? []).map((sp) => ({ at: `reasoning#${sp.start}-${sp.end}`, ref: "reasoning", text: sp.text })) })), { witness: "reader:engine" }).log;
  log = hl.admit(log, declared.map((c, i) => ({ subject: c.roles.ARG0 ?? "", verb: c.rel, object: c.roles.ARG1 ?? "", spans: [{ at: `declared#${i}`, ref: "declared", text: input.claims[i].said ?? `${c.roles.ARG0} ${c.rel} ${c.roles.ARG1}` }] })), { witness: "testimony:claude" }).log;
  const lr = lintLedger(log, { door: hl, taskLog, strictness: "report", referentIndex: { referents: new Set(), resolve: R.resolveName, represent: R.represent } });
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

// Order claims: "a must precede b" is refuted by any consistent order with b first.
const orderFindings = [];
if (input.order?.items?.length && input.order.claims?.length) {
  const items = input.order.items;
  const base = [];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++)
    base.push(declareConstraint(`distinct:${items[i]}|${items[j]}`, [items[i], items[j]], (x) => x[items[i]] !== x[items[j]]));
  for (const [a, b] of input.order.before ?? []) base.push(declareConstraint(`before:${a}->${b}`, [a, b], (x) => x[a] < x[b]));
  const vars = items.map((n) => declareVariable(n, finiteDomain(items.map((_, i) => i + 1))));
  const all = solveCSP(makeCSP(vars, base));
  for (const c of input.order.claims) {
    const counter = all.solutions.find((s) => s[c.then] < s[c.first]);
    if (counter) {
      const seq = [...items].sort((x, y) => counter[x] - counter[y]).join(" → ");
      orderFindings.push({ kind: "order_not_entailed", severity: "error", at: c.ref ?? null, detail: `"${c.first} must precede ${c.then}" does not follow from the declared prerequisites — a consistent order puts ${c.then} first: ${seq} (${all.solutions.length} consistent orders searched)` });
    } else {
      orderFindings.push({ kind: "order_entailed", severity: "info", at: c.ref ?? null, detail: `"${c.first} must precede ${c.then}" holds in every one of ${all.solutions.length} consistent orders` });
    }
  }
}

const findings = [...gfp.findings, ...inf.findings, ...orderFindings, ...unread, ...ledgerFindings];
const errors = findings.filter((f) => f.severity === "error");
const vouched = text ? { sentences: sentencesTotal, read: sentencesTotal - unread.length, edges: read.length, declared: declared.length, corroborated } : null;
const out = { ok: errors.length === 0, errors: errors.length, findings, vouched, gfp: { counts: gfp.counts, unjudged: gfp.unjudged, apart: gfp.apart, holons: gfp.holons, basis: gfp.basis }, inference: inf.counts };

// The marker a hook reads: reasoning was handed to the engine this turn.
try {
  const dir = path.join(os.homedir(), ".claude", "eo-reason");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "last.json"), JSON.stringify({ at: new Date().toISOString(), cwd: process.cwd(), ok: out.ok, errors: out.errors, findings: findings.length, claims: claims.length, inferences: infs.length, vouched }, null, 1));
} catch { /* the marker is a convenience; the verdict above stands without it */ }

if (asJson) console.log(JSON.stringify(out, null, 1));
else {
  console.log(`eoreader7 reason · ${claims.length} claim(s) · ${infs.length} inference(s) · ${input.order?.claims?.length ?? 0} order claim(s) → ${out.ok ? "OK" : `${errors.length} ERROR(S)`}`);
  if (vouched) console.log(`  engine vouches for ${vouched.read}/${vouched.sentences} sentence(s) it could read · ${vouched.edges} relation(s) read · ${vouched.corroborated}/${vouched.declared} declared claim(s) independently read`);
  for (const f of findings) console.log(`  [${f.severity}] ${f.kind}${f.at ? ` @ ${f.at}` : ""}\n      ${f.detail}`);
  if (gfp.unjudged) console.log(`  (${gfp.unjudged} several-valued pair(s) of undeclared relations counted, not judged)`);
  if (gfp.apart) console.log(`  (${gfp.apart} pair(s) in sibling holons held apart)`);
}
process.exit(out.ok ? 0 : 1);
