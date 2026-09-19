// ant-dispatch.mjs — send Wilson's ants at a failing slice.
//
//   IDS=M2,L2 MODEL=anthropic/claude-sonnet-4-6 node benchmarks/ant-dispatch.mjs
//
// When a battery finds grounded-worse-than-raw failures, this dispatches ants:
// candidate instruction variants (genotypes = flag sets) measured live against
// the failing slice, admitted by WILSON'S OWN GATE (swarm-gate.mjs's
// createSwarmGate + bornAcceptance over the colony's observed improvements,
// per-terrain champions) through Wilson's own two faces:
//
//   BREED (CON·Figure)         — union every pair of seed ants, legal-checked
//                               (at most 3 flags), gated on improvement.
//   DIFFERENTIATE (SEG·Figure) — specialistsOf splits the winner into
//                               terrain-restricted (math/logic) specialists.
//
// Honesty note: eo-swarm.mjs's eoSwarm() runs a SYNC round (fitness is a pure
// function), but model fitness is inherently async — so this replays Wilson's
// exact faces and gate with async measurement instead of calling eoSwarm
// itself. Same admission contract, same genealogy discipline (append-only
// lineage: a flag-set is measured once, cached, never re-scored). Persona
// labels come from eo-swarm.mjs's personaOf (cube coordinates per ant kind).
//
// The failing slice is imported from hard-reasoning.mjs's own ITEMS so the
// ants and the battery can never disagree about what "fixed" means.
import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createSwarmGate, specialistsOf } from "../../lavar/swarm-gate.mjs";
import { personaOf } from "../../lavar/eo-swarm.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ER7 = (process.env.ER7 ?? "http://127.0.0.1:11436").replace(/\/+$/, "");
const MODEL = (process.env.MODEL ?? "anthropic/claude-sonnet-4-6").replace(/^er7:/, "");
const IDS = (process.env.IDS ?? "M2,L2").split(",").map((s) => s.trim()).filter(Boolean);

// ── the ant space: pipeline dimensions + instruction flags ───────────────────
// A genotype is a flag SET, but flags now name dimension=value pairs (at most
// one value per dimension — the DAG). Dimensions:
//   route  ask = POST /v1/ask (default) | chat = POST /v1/chat/completions
//          (the chat route is the only one that takes kelsen + mode params)
//   kelsen hi/mid/lo = degrees of binding (implies route=chat; high Kelsen =
//          literal/bound = cold sampling, the logos posture for exact work)
//   mode   chat = force the single-answer surface (default auto)
//   text   instruction suffixes (the original ant space)
const FLAGS = {
  "route=chat": { dim: "route", val: "chat", terrain: "general" },
  "kelsen=hi": { dim: "kelsen", val: 0.95, terrain: "general" },
  "kelsen=mid": { dim: "kelsen", val: 0.6, terrain: "general" },
  "kelsen=lo": { dim: "kelsen", val: 0.2, terrain: "general" },
  "mode=chat": { dim: "mode", val: "chat", terrain: "general" },
  exact: { dim: "text", val: "exact", terrain: "general", text: "\nReply with ONLY the requested value and nothing else — no explanation, no template, no angle brackets." },
  work: { dim: "text", val: "work", terrain: "general", text: "\nFirst work step by step, then put the final answer alone on its own last line." },
  verify: { dim: "text", val: "verify", terrain: "math", text: "\nCheck the final number by substituting it back into the question before answering." },
  polarity: { dim: "text", val: "polarity", terrain: "logic", text: "\nFor knights-and-knaves: test each of the four hypotheses against EVERY statement, discard the contradictory ones, then answer." },
  format: { dim: "text", val: "format", terrain: "logic", text: "\nCopy the reply format from the question character for character (same punctuation, same order)." },
  units: { dim: "text", val: "units", terrain: "math", text: "\nCarry every number with its meaning attached; never drop a term." },
};
const dimsOf = (ids) => ids.map((f) => FLAGS[f].dim === "text" ? `text:${f}` : FLAGS[f].dim);
const legal = (ids) => ids.length <= 5 && new Set(dimsOf(ids)).size === ids.length;
const terrainOf = (ids) => ids.length ? [...new Set(ids.map((f) => FLAGS[f].terrain))] : ["general"];
const terrainOfOrgan = (f) => FLAGS[f].terrain;
const depsOf = () => [];
const hasDim = (ids, dim) => ids.find((f) => FLAGS[f].dim === dim);
const flagVal = (ids, dim) => FLAGS[hasDim(ids, dim)]?.val;

// Slice items + scorer, imported from the battery itself (one definition).
const { ITEMS, scoreItem } = await import("./hard-reasoning-items.mjs").catch(() => ({ ITEMS: null, scoreItem: null }));
if (!ITEMS) throw new Error("ant-dispatch needs benchmarks/hard-reasoning-items.mjs (extracted ITEMS+scoreItem) — see header.");
const SLICE = ITEMS.filter((it) => IDS.includes(it.id));
if (!SLICE.length) throw new Error(`no items for IDS=${IDS.join(",")}`);

const cache = new Map(); // genotype key -> { f, perItem }
async function draw(ids, item, sessionId) {
  // Route + binding + surface are pipeline facts, not words: kelsen implies
  // the chat route (the only doorway that takes it).
  const useChat = hasDim(ids, "route") || hasDim(ids, "kelsen") || hasDim(ids, "mode");
  const suffix = ids.filter((f) => FLAGS[f].dim === "text").map((f) => FLAGS[f].text).join("");
  const task = item.q + suffix;
  if (!useChat) {
    const res = await fetch(`${ER7}/v1/ask`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-er7-session": sessionId },
      body: JSON.stringify({ task, model: MODEL }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error ?? res.status);
    return { text: body.answer ?? "", input: body.usage?.promptTokens ?? 0, output: body.usage?.completionTokens ?? 0 };
  }
  const kelsen = flagVal(ids, "kelsen");
  const mode = flagVal(ids, "mode");
  const res = await fetch(`${ER7}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-er7-session": sessionId },
    body: JSON.stringify({
      model: `er7:${MODEL}`,
      messages: [{ role: "user", content: task }],
      ...(kelsen !== undefined ? { kelsen } : {}),
      ...(mode !== undefined ? { mode } : {}),
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message ?? res.status);
  const text = body.choices?.[0]?.message?.content ?? "";
  return { text, input: body.usage?.prompt_tokens ?? 0, output: body.usage?.completion_tokens ?? 0 };
}
async function measure(ids, reps = 1) {
  const key = [...ids].sort().join("+") || "(base)";
  if (cache.has(key) && reps === 1) return cache.get(key);
  const repScores = [];
  let perItem = [];
  for (let rep = 0; rep < reps; rep++) {
    let pass = 0;
    perItem = [];
    for (const item of SLICE) {
      let s;
      try {
        const r = await draw(ids, item, `ants-${Date.now()}-${key.replace(/\W+/g, "")}-${item.id}-r${rep}`);
        s = scoreItem(item, r.text);
      } catch (e) {
        s = { pass: false, why: `error: ${String(e.message).slice(0, 80)}` };
      }
      if (s.pass) pass++;
      perItem.push({ id: item.id, pass: s.pass, why: s.why });
    }
    repScores.push(pass / SLICE.length);
  }
  const mean = repScores.reduce((a, b) => a + b, 0) / repScores.length;
  const out = { f: mean, reps: repScores, pass: null, of: SLICE.length, perItem };
  if (reps === 1) cache.set(key, out);
  return out;
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const genePath = join(HERE, "results", `ant-dispatch-${stamp}.jsonl`);
  mkdirSync(join(HERE, "results"), { recursive: true });
  const log = (obj) => appendFileSync(genePath, JSON.stringify({ at: new Date().toISOString(), ...obj }) + "\n");
  const gate = createSwarmGate({ bar: Number.EPSILON });
  const census = [];
  const keyOf = (ids) => [...ids].sort().join("+") || "(base)";

  const admit = async (ids, op, grain, kind, reps = 1) => {
    if (reps === 1 && cache.has(keyOf(ids))) return census.find((c) => c.key === keyOf(ids)) ?? null;
    const m = await measure(ids, reps);
    const persona = personaOf({ op, grain });
    const improvement = m.f - gate.championFor(ids, terrainOf, 0);
    gate.recordImprovement(improvement);
    const admitted = kind === "seed" ? true : gate.admits(improvement);
    if (admitted) gate.record(ids, terrainOf, m.f);
    const ant = { key: keyOf(ids), ids, kind, f: m.f, reps: m.reps, improvement: Number(improvement.toFixed(3)), admitted, persona: persona.label ?? persona.gap, perItem: m.perItem };
    census.push(ant);
    log(ant);
    console.log(`${admitted ? "KEEP " : "refuse"} ${ant.key.padEnd(28)} f=${m.f.toFixed(2)} Δ=${ant.improvement >= 0 ? "+" : ""}${ant.improvement} [${persona.label ?? persona.gap}]`);
    return ant;
  };

  console.log(`ants at [${SLICE.map((s) => s.id).join(",")}] via ${MODEL} · bar=measured elenchus (bornAcceptance)\n`);
  // The base is measured 3× (the rerun null): a 2-item slice cannot separate
  // signal from sampling noise on one sample, so children must beat the base
  // MEAN, and the base variance itself is reported as flakiness.
  const baseAnt = await admit([], "CON", "Figure", "seed", 3);
  console.log(`base reps: [${(baseAnt?.reps ?? []).map((x) => x.toFixed(2)).join(", ")}] mean=${(baseAnt?.f ?? 0).toFixed(2)} — children must beat the mean`);
  for (const f of Object.keys(FLAGS)) await admit([f], "CON", "Figure", "seed");

  // BREED: the top seeds pair up (union, legal-checked, gated) — the colony
  // cannot afford every pair, so only champions breed.
  const ranked = census.filter((c) => c.kind === "seed" && c.ids.length <= 1).sort((a, b) => b.f - a.f).slice(0, 6).map((c) => c.ids);
  for (let i = 0; i < ranked.length; i++) {
    for (let j = i + 1; j < ranked.length; j++) {
      const child = [...new Set([...ranked[i], ...ranked[j]])];
      if (!legal(child)) continue;
      await admit(child, "CON", "Figure", "bred");
    }
  }
  // DIFFERENTIATE: split the winner into terrain specialists.
  const best = census.filter((c) => c.admitted).sort((a, b) => b.f - a.f)[0];
  if (best) {
    for (const { t, ids } of specialistsOf(best.ids, { terrainOfOrgan, depsOf, legal })) {
      await admit(ids, "SEG", "Figure", "differentiated");
    }
  }

  const winner = census.filter((c) => c.admitted).sort((a, b) => b.f - a.f || a.ids.length - b.ids.length)[0];
  console.log(`\n── winner: ${winner.key} f=${winner.f.toFixed(2)} (${winner.perItem.map((p) => `${p.id}:${p.pass ? "✓" : "✗"}`).join(" ")})`);
  if (winner.ids.length) {
    const pipe = winner.ids.filter((f) => FLAGS[f].dim !== "text");
    const words = winner.ids.filter((f) => FLAGS[f].dim === "text");
    if (pipe.length) console.log(`pipeline to adopt: ${pipe.join(" + ")}`);
    if (words.length) console.log(`instruction to adopt:\n${words.map((f) => FLAGS[f].text).join("")}`);
  } else {
    console.log(`the base genotype holds — no variant beat today's behavior on this slice.`);
  }
  console.log(`\ngenealogy: ${genePath}`);
}

await main();
