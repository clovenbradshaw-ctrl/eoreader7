// ═══ LOVELACE · TEACH IT TO FISH ═══ THE CHEAP SPECIES, POINTED AT THE REAL APP'S HOLES.
//
// The operator, 2026-10-01: "Are these every math shaped holes? What about just building app, go back to the original idea." The species (copy, compose, decide, template, ...) were measured on invented
// diverse tasks. This points them at the weather + fuel app's own nine leaf contracts and says, per hole, who fills it with NO model:
//   copy / compose / decide / template ...   cheapFill (fielded-swarm.mjs) — the slot's value is a function of the input and the person's words
//   none of them                             the hole is not a value computed from a row: it is a TEXT SEARCH (an HTML scrape) or a list/null shape the species do not read
//
// STEERED, said once: the species need the expected value for >= 3 runs (a bare prompt has none, ledger row 5). The app's oracles check with `check` closures, not `want`, so `want` is read off the REFERENCE leaves
// (app-weather-fuel.reference.mjs — proven against the same oracles by app-fields.test.mjs). That is the answer key handed to the species, exactly as it is handed to the model's worked example today.
//
//   node native/the-fold/app-species.mjs [--leaf name]
import { LEAF_CONTRACTS } from "./app-leaves.mjs";
import { REFERENCE_LEAVES } from "./app-weather-fuel.reference.mjs";
import { loadUnit, testUnit, composeFieldCode, fieldsOf } from "./app-units.mjs";
import { cheapFill } from "./fielded-swarm.mjs";

/** a leaf contract the species can read: every run also carries the value the reference leaf returns for it */
export function speciesContract(c) {
  const ref = loadUnit(REFERENCE_LEAVES[c.name], c.name);
  return { ...c, runs: c.runs.map((r) => ({ ...r, want: () => ref(...r.args()) })) };
}

/** what the species can do for one leaf with no model -> { leaf, shape, slots, filled, unit, passes, failures } */
export function fillLeaf(c) {
  const sc = speciesContract(c), wants = sc.runs.map((r) => r.want());
  const shape = wants.every((w) => w && typeof w === "object" && !Array.isArray(w)) ? "object" : wants.some((w) => w && typeof w === "object" && !Array.isArray(w)) ? "object-or-null" : typeof wants[0] === "string" ? "string" : typeof wants[0] === "number" ? "number" : "other";
  const row = { leaf: c.name, shape, slots: [], filled: {}, unit: null, passes: false, failures: [] };
  if (shape !== "object" && shape !== "object-or-null") { row.note = "not a flat object of fields: the species read fields, not a scraped value"; return row; }
  row.slots = [...new Set(wants.flatMap((w) => Object.keys(w ?? {})))];
  if (shape === "object-or-null") row.note = "a leaf that may answer null: its null-guard is the model's; the slots are counted from the runs that answer an object";
  let cheap = {}; try { cheap = cheapFill({ ...sc, runs: sc.runs.filter((r) => r.want() !== null) }); } catch (e) { row.error = String(e.message).slice(0, 120); }
  row.filled = Object.fromEntries(Object.entries(cheap).map(([k, v]) => [k, v.species]));
  if (row.slots.length && row.slots.every((k) => cheap[k])) {
    const codes = Object.fromEntries(row.slots.map((k) => [k, `function ${k}Of(${c.params.join(", ")}) { return ${cheap[k].js}; }`]));
    row.unit = composeFieldCode(c, row.slots, codes);
    const r = testUnit(row.unit, c); row.passes = !!r.ok; row.failures = (r.failures ?? []).slice(0, 3);
  }
  return row;
}

/** the hook makeFieldedUnit takes (opts.species): (contract, key) -> { species, js } | null, the cheap fill computed once per leaf */
export function speciesHook() {
  const memo = new Map();
  return (c, key) => {
    if (!memo.has(c.name)) { let r = {}; try { const sc = speciesContract(c); r = cheapFill({ ...sc, runs: sc.runs.filter((x) => x.want() !== null) }); } catch { r = {}; } memo.set(c.name, r); }
    return memo.get(c.name)[key] ?? null;
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const only = process.argv.includes("--leaf") ? process.argv[process.argv.indexOf("--leaf") + 1] : null;
  const rows = LEAF_CONTRACTS.filter((c) => !only || c.name === only).map(fillLeaf);
  for (const r of rows) console.log(JSON.stringify({ ...r, unit: r.unit ? "…" : null }));
  const slots = rows.reduce((a, r) => a + r.slots.length, 0), filled = rows.reduce((a, r) => a + Object.keys(r.filled).length, 0);
  console.log(`\n${rows.length} leaves: ${rows.filter((r) => r.passes).length} filled whole with no model; ${filled} of ${slots} object slots filled by a species; ${rows.filter((r) => r.shape !== "object" && r.shape !== "object-or-null").length} are not field-shaped (scrapes)`);
}
