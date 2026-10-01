// ═══ LOVELACE · TEACH IT TO FISH ═══ HOW MUCH DO WE NEED THE MODEL TO GET THE KEYS?
//
// The operator, 2026-10-01: "if the IRS already knows how much I owe, why are they testing me?" The input's real keys are KNOWN — they are the data. A draw that reads a key the data does not have has
// told the system it is wrong, with no oracle at all (a GHOST read), and the closed set of real keys holds most of the answer. This measures what a draw needs from the model and what the system can supply:
//
//   P0  nothing resolves: a read of an absent key is undefined, as it is in production
//   P1  key-referents.js as it ships: exact, declared, fold, truncation of the first word, abbreviation — only when ONE real key qualifies
//   P2  P1, and where it finds nothing: a ghost read with exactly ONE real key sharing a word with it (`total` -> `total_beds`, `name` -> `ward_name`) binds to that key
//
// The inputs are wrapped, so a draw is run UNCHANGED on the real data and every read of an absent key is recorded and answered by the policy. Control for a false bind: draws that already pass under P0
// must still pass under P2 (a draw that legitimately reads an optional key and defaults it must not be rebound onto a neighbour).
//   node native/the-fold/key-need.mjs --frontier DIR [--qwen] [--model m]
import fs from "node:fs";
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";
import { loadUnit } from "./unit-wall.mjs";
import { rungPrompt, RUNGS } from "./context-dose.mjs";

export const POLICIES = Object.freeze({ P0: "nothing resolves", P1: "key-referents.js as it ships", P2: "P1, then every ghost read with exactly one real key sharing a word with it is bound to that key" });

/** the wall runs a unit on a JSON copy of its input, so the resolver lives INSIDE the vm (unit-wall.mjs `resolve`); its log of reads is the ghost record: resolved / ambiguous / unresolved(near) */
const attempt = (code, contract, resolve) => {
  let call; try { call = loadUnit(code, contract.name, { cards: false, resolve }); } catch { return { pass: contract.runs.map(() => false), log: [], loads: false }; }
  const pass = contract.runs.map((run) => { try { return run.check(call(...run.args())).length === 0; } catch { return false; } });
  return { pass, log: call.resolutions(), loads: true };
};
/** run a draw on every run of the contract under a policy -> { pass:[bool], ghosts:[{asked, real|null, near}] } */
export function runUnder(code, contract, policy) {
  if (policy === "P0") { const r = attempt(code, contract, null); return { pass: r.pass, ghosts: [] }; }
  const dry = attempt(code, contract, { declared: {} });
  const ghosts = dry.log.map((l) => ({ asked: l.asked, real: l.real ?? null, near: l.near ?? l.candidates ?? [] }));
  if (policy === "P1") return { pass: dry.pass, ghosts };
  const declared = Object.fromEntries(dry.log.filter((l) => l.unresolved && l.near.length === 1).map((l) => [l.asked, l.near[0]]));
  const second = Object.keys(declared).length ? attempt(code, contract, { declared }) : dry;
  return { pass: second.pass, ghosts: [...ghosts, ...Object.entries(declared).map(([asked, real]) => ({ asked, real, bound: "unique near key" }))] };
}
const uniq = (gs) => [...new Map(gs.map((g) => [`${g.asked}>${g.real}`, g])).values()];

export function measure(rows) {
  const out = { n: rows.length };
  for (const P of Object.keys(POLICIES)) out[P] = rows.filter((r) => r[P].pass.every(Boolean)).length;
  const ghostly = (r) => r.P1.ghosts.some((g) => !g.real || g.real);
  out.withGhosts = rows.filter(ghostly).length;
  out.ghostPass = rows.filter((r) => ghostly(r) && !r.P0.pass.every(Boolean) && r.P2.pass.every(Boolean)).length;
  out.broken = rows.filter((r) => r.P0.pass.every(Boolean) && !r.P2.pass.every(Boolean)).length;
  return out;
}

async function qwenDraws(model, tasks) {
  const base = process.env.ER7_CHANNEL_URL ?? "http://127.0.0.1:11434", out = {};
  for (const d of tasks) {
    const c = d.contract, p = rungPrompt(c, RUNGS.D1);
    const r = await fetch(`${base}/api/generate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ model, prompt: p, raw: true, stream: false, options: { temperature: 0, num_predict: 450, stop: ["\n}"] } }) });
    out[c.name] = `function ${c.name}(${c.params.join(", ")}) {${(await r.json()).response ?? ""}\n}`;
  }
  return out;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : null; };
  const tasks = [...DIVERSE, ...HELDOUT], sources = {};
  if (arg("frontier")) sources.frontier = Object.fromEntries(tasks.map((d) => [d.contract.name, fs.readFileSync(`${arg("frontier")}/D1-${d.contract.name}.js`, "utf8")]));
  if (process.argv.includes("--qwen")) sources.qwen = await qwenDraws(arg("model") ?? "qwen2.5-coder:1.5b", tasks);
  for (const [who, codes] of Object.entries(sources)) {
    const rows = tasks.map((d) => ({ task: d.contract.name, ...Object.fromEntries(Object.keys(POLICIES).map((P) => [P, runUnder(codes[d.contract.name], d.contract, P)])) }));
    console.log(`\n=== ${who} — the person's words only (no data shown)`);
    for (const r of rows) console.log(r.task.padEnd(14), `P0 ${r.P0.pass.every(Boolean) ? "PASS" : "fail"}  P1 ${r.P1.pass.every(Boolean) ? "PASS" : "fail"}  P2 ${r.P2.pass.every(Boolean) ? "PASS" : "fail"}`, uniq(r.P2.ghosts).length ? `reads: ${uniq(r.P2.ghosts).map((g) => `${g.asked}${g.real ? `→${g.real}${g.bound ? "*" : ""}` : "→∅"}`).join(" ")}` : "");
    const m = measure(rows);
    console.log(`full pass: P0 ${m.P0}/${m.n}  P1 ${m.P1}/${m.n}  P2 ${m.P2}/${m.n}   draws that read a key the data does not carry: ${m.withGhosts}   failing under P0 and fixed by P2: ${m.ghostPass}   passing under P0 but broken by P2 (false binds): ${m.broken}`);
  }
}
