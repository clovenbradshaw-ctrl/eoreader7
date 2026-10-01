// ═══ LOVELACE · LAVAR ═══ The semantic reading measured offline — no model is called.
//
//   node native/the-fold/semantics-offline.mjs <suggestions.jsonl>...
//
// Two questions, and the first is the one that decides whether the second means anything:
//   CONTROL     on the REFERENCE implementation of every flat-answer contract (code that passes its whole oracle), how many findings does the
//               reading raise? Every one is a false alarm. A reading that cries wolf on correct code is not a reading.
//   PREDICTION  on the saved FAILED suggestions, does a finding name an output key the oracle actually marked wrong (precision), and of the keys
//               the oracle marked wrong how many did a finding name (recall)?
import fs from "node:fs";
import { LEAF_CONTRACTS } from "./app-leaves.mjs";
import { REFERENCE_LEAVES } from "./app-weather-fuel.reference.mjs";
import { DIVERSE, DIVERSE_REFERENCE } from "./diverse-tasks.mjs";
import { fieldsOf, loadUnit } from "./app-units.mjs";
import { readSemantics, ALL_KINDS, PRECISE_KINDS } from "../organs/code-semantics.js";
const KINDS = process.env.KINDS === "all" ? ALL_KINDS : PRECISE_KINDS;

const contracts = new Map([...LEAF_CONTRACTS, ...DIVERSE.map((d) => d.contract)].map((c) => [c.name, c]));
const refs = { ...REFERENCE_LEAVES, ...DIVERSE_REFERENCE };

/** parameters that take more than one primitive value across the contract's own runs: the selectors */
const alternativesOf = (c) => {
  const vals = {};
  for (const r of c.runs) r.args().forEach((a, i) => { if (["string", "number", "boolean"].includes(typeof a)) (vals[i] ??= []).push(a); });
  return Object.fromEntries(Object.entries(vals).map(([i, v]) => [i, [...new Set(v)]]).filter(([, v]) => v.length > 1 && v.length <= 4));
};
const read = (code, c) => {
  let fn; try { fn = loadUnit(code, c.name, { resolve: null, cards: "exact" }); } catch { return null; }
  return readSemantics({ call: (argv) => fn(...argv), argv: c.runs[0].args(), params: c.params, contract: c, alternatives: alternativesOf(c), anchor: c.name, kinds: KINDS });
};

// ---- CONTROL ----
console.log("CONTROL — findings on code that passes its whole oracle (every one is a false alarm)");
let fa = 0, ctl = 0;
for (const c of contracts.values()) {
  if (!fieldsOf(c).length || !refs[c.name]) continue;
  const r = read(refs[c.name], c); if (!r) continue;
  ctl++; fa += r.findings.length;
  console.log(`  ${c.name.padEnd(16)} read=${r.read} findings=${r.findings.length}${r.findings.length ? "  " + r.findings.map((f) => `${f.kind}(${f.key}${f.refers ? "←" + f.refers : f.param ? "/" + f.param : ""})`).join(" ") : ""}`);
}
console.log(`  ${ctl} reference implementations, ${fa} findings\n`);

// ---- PREDICTION ----
const seen = new Set(); let n = 0, withFinding = 0, hitKeys = 0, findingKeys = 0, wrongKeys = 0, coveredWrong = 0;
const byKind = {}; const rows = [];
for (const f of process.argv.slice(2)) for (const line of fs.readFileSync(f, "utf8").split("\n").filter(Boolean)) {
  let r; try { r = JSON.parse(line); } catch { continue; }
  const name = r.name ?? r.task; const c = contracts.get(name);
  if (!c || !r.code || r.code.length >= 1500 || (r.event && r.event !== "unit-draw") || r.ok !== false || !fieldsOf(c).length) continue;
  const key = `${name}\u0000${r.code}`; if (seen.has(key)) continue; seen.add(key);
  const sem = read(r.code, c); if (!sem || !sem.read) continue;
  n++;
  // the keys the oracle marked wrong: failure lines are `<label>: <key> is ...`
  let fn; try { fn = loadUnit(r.code, c.name, { resolve: null, cards: "exact" }); } catch { continue; }
  const wrong = new Set();
  for (const run of c.runs) { let out; try { out = fn(...run.args()); } catch { continue; } for (const m of run.check(out, c.sampleJson ?? c.sampleText)) { const k = String(m).match(/^([A-Za-z_$][\w$]*)(?: is |\.length |\[)/)?.[1]; if (k) wrong.add(k); } }
  const fk = new Set(sem.findings.map((x) => x.key));
  if (sem.findings.length) withFinding++;
  for (const x of sem.findings) byKind[x.kind] = (byKind[x.kind] ?? 0) + 1;
  findingKeys += fk.size; hitKeys += [...fk].filter((k) => wrong.has(k)).length; wrongKeys += wrong.size; coveredWrong += [...wrong].filter((k) => fk.has(k)).length;
  if (sem.findings.length) rows.push(`  ${name.padEnd(16)} ${String(r.model).padEnd(20)} wrong=[${[...wrong].join(",")}] found=[${sem.findings.map((x) => `${x.kind}:${x.key}${x.refers ? "←" + x.refers : x.param ? "/" + x.param : ""}`).join(" ")}]`);
}
console.log(`PREDICTION — ${n} distinct failed flat-answer suggestions, ${withFinding} raised at least one finding   ${JSON.stringify(byKind)}`);
console.log(`  precision: ${hitKeys} of ${findingKeys} keys named by a finding are keys the oracle marked wrong`);
console.log(`  recall:    ${coveredWrong} of ${wrongKeys} keys the oracle marked wrong were named by a finding`);
for (const l of rows.slice(0, 40)) console.log(l);
