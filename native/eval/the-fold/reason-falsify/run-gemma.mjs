// Does eoreader7 improve a small model's reasoning — by not having the model
// reason? Three arms over the same items, gemma2:2b through the engine's own
// gated wire (streamOllamaChat), N runs each (the wire exposes no temperature).
//   A1  gemma judges the PROSE                       (the baseline)
//   A2  gemma judges the ENGINE'S STRUCTURED INPUT   (reading taken away; reasoning left to gemma)
//   A3  the ENGINE judges; gemma only SAYS it        (the model is the mouth)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { ITEMS, PROBES } from "./items.mjs";
const { streamOllamaChat } = await import("../../../../proxy-runner.mjs");
const CLI = new URL("../../../../cli/reason.mjs", import.meta.url).pathname;
const MODEL = process.env.MODEL ?? "gemma2:2b";
const N = Number(process.env.RUNS ?? 3);
const all = [...ITEMS, ...PROBES];

async function ask(content) {
  let out = "";
  for await (const ch of streamOllamaChat(MODEL, [{ role: "user", content }], { maxTokens: 120 })) if (typeof ch === "string") out += ch;
  return out.trim();
}
const verdictOf = (t) => { const m = /\b(ERROR|SOUND)\b/i.exec(t); return m ? m[1].toLowerCase() : "unparsed"; };
const QUESTION = "Does this reasoning contain an error — a contradiction between its own claims, a false number or time, a conclusion that does not follow from what it states, or a general claim its own evidence contradicts? Start your answer with ERROR or SOUND, then give one sentence.";

// The engine's input, said plainly — the same facts, no prose around them.
function structured(spec) {
  const L = [];
  for (const d of spec.declare?.functional ?? []) L.push(`"${typeof d === "string" ? d : d.rel}" has exactly one value for a given subject in a given scope.`);
  for (const d of spec.declare?.acyclic ?? []) L.push(`"${d}" must never form a cycle.`);
  for (const c of spec.claims ?? []) L.push(`In scope ${c.ground}: ${c.roles.ARG0} ${c.polarity === "-" ? "NOT " : ""}${c.rel} ${c.roles.ARG1}${c.force === "strict" ? " (holds throughout this scope, including every scope nested inside it)" : ""}.`);
  L.push("Scopes are nested by path: /a/b is inside /a; /a and /b are separate.");
  for (const e of spec.equations ?? []) L.push(`Claim: ${e.statement} (times are hh:mm:ss).`);
  if (spec.order) {
    L.push(`Required orderings: ${spec.order.before.map(([a, b]) => `${a} before ${b}`).join("; ")}. Nothing else is constrained.`);
    for (const c of spec.order.claims) L.push(`Claim: ${c.first} must come before ${c.then} in every valid ordering.`);
  }
  for (const i of spec.inferences ?? []) L.push(`Claim: ${i.end1} ${i.label} ${i.end2}, concluded by chaining several separately observed cause-and-effect steps.`);
  for (const u of spec.universals ?? []) L.push(`Claim: ${u.end1} ${u.label} ${u.end2}. Evidence: ${u.tested} tested, counterexamples observed: ${u.counterexamples.join(", ")}.`);
  return L.join("\n");
}
function engine(spec) {
  const f = path.join(os.tmpdir(), `reason-g-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(f, JSON.stringify(spec));
  try { return JSON.parse(execFileSync("node", [CLI, f, "--json"], { encoding: "utf8" })); }
  catch (e) { return JSON.parse(e.stdout); }
}

const rows = [];
for (const it of all) {
  const eng = engine(it.spec);
  const engVerdict = eng.ok ? "sound" : "error";
  const top = eng.findings.find((x) => x.severity === "error") ?? eng.findings[0] ?? null;
  const row = { id: it.id, source: it.source, truth: it.truth, engine: engVerdict, A1: [], A2: [], A3: [] };
  for (let r = 0; r < N; r++) {
    row.A1.push(verdictOf(await ask(`Here is a short piece of reasoning:\n\n${it.prose}\n\n${QUESTION}`)));
    row.A2.push(verdictOf(await ask(`Here are the facts of a piece of reasoning, stated plainly:\n\n${structured(it.spec)}\n\n${QUESTION}`)));
    const said = await ask(`A checker examined a piece of reasoning. Its verdict: ${engVerdict.toUpperCase()}. ${top ? `Its finding: ${top.detail}` : "It found nothing wrong."}\n\nTell the user the verdict in one sentence. Start with ${engVerdict.toUpperCase()}.`);
    row.A3.push(verdictOf(said));
  }
  rows.push(row);
  const maj = (xs) => { const c = {}; for (const x of xs) c[x] = (c[x] ?? 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
  console.log(`${it.id.padEnd(3)} truth=${it.truth.padEnd(5)} A1=${row.A1.join("/").padEnd(20)} A2=${row.A2.join("/").padEnd(20)} engine=${engVerdict.padEnd(5)} A3=${row.A3.join("/")}  [A1 ${maj(row.A1) === it.truth ? "✓" : "✗"} A2 ${maj(row.A2) === it.truth ? "✓" : "✗"} A3 ${maj(row.A3) === it.truth ? "✓" : "✗"}]`);
  fs.writeFileSync(new URL(`./gemma-results-${MODEL.replace(/[^a-z0-9]/gi, "_")}.json`, import.meta.url), JSON.stringify(rows, null, 1));
}
const score = (arm) => {
  const perRun = rows.reduce((s, r) => s + r[arm].filter((v) => v === r.truth).length, 0) / (rows.length * N);
  const maj = rows.filter((r) => { const c = {}; for (const x of r[arm]) c[x] = (c[x] ?? 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0] === r.truth; }).length;
  const split = rows.filter((r) => new Set(r[arm]).size > 1).length;
  return `${arm}: majority ${maj}/${rows.length} · per-run ${(perRun * 100).toFixed(0)}% · ${split} item(s) with split votes`;
};
console.log(`\n${MODEL}, ${N} runs per arm`);
for (const a of ["A1", "A2", "A3"]) console.log("  " + score(a));
console.log(`  engine alone: ${rows.filter((r) => r.engine === r.truth).length}/${rows.length}`);
process.exit(0);
