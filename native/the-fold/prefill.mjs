// ═══ LOVELACE · TEACH IT TO FISH ═══ THE PRE-FILLED RETURN. WHAT THE SYSTEM ALREADY KNOWS OF A UNIT, SO THE MODEL IS ASKED ONLY FOR THE REST.
//
// The operator, 2026-10-01: "I have to do all my taxes — if the IRS already knows how much I owe, why are they testing me to see if I get that wrong?" The system holds the real input keys (the data),
// the output's field names (the person's words), and, in the worked examples, the value of every field that is simply COPIED from the input. Asking the model to spell those back is a test of
// something already known. A field is COPIED when, in every shown example, its value sits at exactly one input path and the same path holds it in all of them; everything else is COMPUTED — the part only
// the model can propose. Read off the examples; nothing here is typed by hand and nothing calls a model.
import { DIVERSE } from "./diverse-tasks.mjs";
import { HELDOUT } from "./diverse-heldout.mjs";

const isScalar = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);
/** every path in `v` holding a scalar equal to `target` */
export function pathsHolding(v, target, path = "") {
  if (isScalar(v)) return Object.is(v, target) ? [path] : [];
  if (Array.isArray(v)) return v.flatMap((x, i) => pathsHolding(x, target, `${path}[${i}]`));
  return Object.entries(v ?? {}).flatMap(([k, x]) => pathsHolding(x, target, path ? `${path}.${k}` : k));
}
/** a value that can be COPIED rather than coincide: a string of 3+ characters, or a number with a fraction or 4+ digits (`17` sits under many keys and binds none) */
export const copyable = (v) => (typeof v === "string" ? v.length >= 3 : typeof v === "number" ? !Number.isInteger(v) || Math.abs(v) >= 1000 : false);

/** for one contract: each output field is `copy` (one consistent input path across the shown examples) or `computed` */
export function readPrefill(contract, shown = 3, { strict = true } = {}) {
  const runs = contract.runs.slice(0, shown), wants = runs.map((r) => r.want());
  if (!wants.every((w) => w && typeof w === "object" && !Array.isArray(w))) return { shape: "not-an-object", fields: [] };
  const keys = [...new Set(wants.flatMap(Object.keys))], fields = [];
  for (const k of keys) {
    const per = runs.map((r, i) => ((strict ? copyable(wants[i][k]) : isScalar(wants[i][k])) ? pathsHolding(r.args(), wants[i][k]) : null));
    if (per.every((p) => p && p.length)) { const common = per.reduce((a, b) => a.filter((x) => b.includes(x))); if (common.length === 1) { fields.push({ key: k, kind: "copy", from: common[0] }); continue; } }
    fields.push({ key: k, kind: "computed" });
  }
  return { shape: "object", fields };
}

/** does the copy path predict the held-out runs? (the check that a consistent path across the shown examples is a copy and not a coincidence) */
export function heldOutAgreement(contract, fields, shown = 3) {
  let right = 0, total = 0;
  const get = (v, path) => path.split(/\.|\[(\d+)\]/).filter((x) => x !== undefined && x !== "").reduce((a, k) => a?.[k], v);
  for (const r of contract.runs.slice(shown)) for (const f of fields.filter((x) => x.kind === "copy")) { total++; if (Object.is(get(r.args(), f.from), r.want()[f.key])) right++; }
  return { right, total };
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  let copy = 0, comp = 0, objs = 0;
  for (const d of [...DIVERSE, ...HELDOUT]) {
    const r = readPrefill(d.contract);
    if (r.shape !== "object") { console.log(d.contract.name.padEnd(14), "(output is not a flat object: nothing to pre-fill by field)"); continue; }
    objs++; copy += r.fields.filter((f) => f.kind === "copy").length; comp += r.fields.filter((f) => f.kind === "computed").length;
    console.log(d.contract.name.padEnd(14), r.fields.map((f) => f.kind === "copy" ? `${f.key}<-${f.from}` : `${f.key}=?`).join("  "));
  }
  for (const strict of [true, false]) {
    let c = 0, k = 0, hr = 0, ht = 0;
    for (const d of [...DIVERSE, ...HELDOUT]) { const r = readPrefill(d.contract, 3, { strict }); if (r.shape !== "object") continue; c += r.fields.filter((f) => f.kind === "copy").length; k += r.fields.length; const h = heldOutAgreement(d.contract, r.fields); hr += h.right; ht += h.total; }
    console.log(`${strict ? "strict (value must be 3+ characters or 4+ digits)" : "relaxed (any scalar, one consistent path across the three examples)"}: ${c} of ${k} fields are copies; on the held-out runs those paths predicted ${hr} of ${ht} values`);
  }
  console.log(`\n${objs} tasks with an object result: ${copy} fields the system already knows (copied from a known input path), ${comp} only the model can propose`);
}
