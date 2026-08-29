// native/conformance/assembly-registry.test.mjs — spec test 1
// (ASSEMBLIES-AND-ARTIFACTS.md §7.1): every eval result carries a registered
// assembly id+version (A2.1); the registry is append-only (A2.2); contracts
// are checkable (A2.3); dials carry givers (S16).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembly, createAssemblyRegistry, registerAssembly, resolveAssembly, registeredAssemblies, stampResult, absentAssemblies, contractViolations } from "../kernel/assembly.js";
import { eoOperation } from "../kernel/fold.js";
import { nativeRegistry, ENTITY } from "../assemblies.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const resultsDir = path.resolve(here, "../eval/results");

const minimal = (over = {}) => assembly({ id: "assembly:x", version: 1, organs: ["native/kernel/fold.js"], ...over });

test("A2: an Assembly@1 derives its contract from declared cells — ops/terrains/stances are read off cellOf, never hand-typed", () => {
  const asm = minimal({ cells: [["SIG", "Ground"], ["CON", "Figure"]], terrains: ["Entity"] });
  assert.deepEqual([...asm.contract.ops], ["CON", "SIG"]);
  assert.deepEqual([...asm.contract.terrains], ["Entity", "Link", "Void"]);
  assert.deepEqual([...asm.contract.stances], ["Binding", "Tending"]);
});

test("S16: a regime dial without { value, giver, basis } is refused — the giver field is mandatory", () => {
  assert.throws(() => minimal({ regimes: { floor: { value: 2 } } }), /giver/);
  assert.throws(() => minimal({ regimes: { floor: { value: 2, giver: "x" } } }), /giver|basis/);
  const ok = minimal({ regimes: { floor: { value: 2, giver: "binding.js structural minimum", basis: "one arrival has no co-arrival to test" } } });
  assert.equal(ok.regimes.floor.value, 2);
});

test("§4: a consumed artifact kind is tagged prior|witness — witness is only lawful from the same read", () => {
  assert.throws(() => minimal({ consumes: [{ kind: "CastLedger@1" }] }), /prior.*witness|witness.*prior/);
  assert.throws(() => minimal({ consumes: [{ kind: "CastLedger@1", as: "oracle" }] }), /prior.*witness|witness.*prior/);
  const ok = minimal({ consumes: [{ kind: "CastLedger@1", as: "prior" }] });
  assert.equal(ok.consumes[0].as, "prior");
});

test("A2.2: the registry is append-only — a version never re-registers, never moves backward, and supersession keeps the past", () => {
  let reg = createAssemblyRegistry();
  reg = registerAssembly(reg, minimal());
  assert.throws(() => registerAssembly(reg, minimal()), /append-only/);
  assert.throws(() => registerAssembly(reg, minimal({ version: 1 })), /append-only/);
  reg = registerAssembly(reg, minimal({ version: 2, note: "organ change" }));
  assert.equal(resolveAssembly(reg, "assembly:x").version, 2, "resolve returns the latest");
  assert.equal(reg.entries.length, 2, "the superseded version stays on the list — nothing is edited in place");
});

test("A2.1: a stamp resolves through the register — a result stamped with an unregistered assembly is refused, not discovered later", () => {
  const reg = nativeRegistry();
  const stamped = stampResult(reg, { n: 1 }, "assembly:entity");
  assert.deepEqual(stamped.assembly, { id: "assembly:entity", version: 1 });
  assert.throws(() => stampResult(reg, {}, "assembly:never-registered"), /quotable as nothing/);
});

test("A4.2: absentAssemblies types absence over LATTICE rows only — a baseline reader and a projection are not absent layers", () => {
  const reg = nativeRegistry();
  const absent = absentAssemblies(reg, ["assembly:entity", "assembly:link"]);
  assert.deepEqual([...absent], ["assembly:atmosphere", "assembly:kind", "assembly:lens", "assembly:network", "assembly:sequence"]);
  assert.ok(!absent.includes("assembly:constitutional-host"), "the baseline is a measuring stick, not a missing layer");
  assert.ok(!absent.includes("assembly:dynamics"), "P-a: dynamics is a projection, not an assembly");
});

test("A2.3: contractViolations flags an operation outside the declared contract and passes one inside it", () => {
  const inside = eoOperation({ op: "SIG", grain: "Ground", payload: null });
  const outside = eoOperation({ op: "SYN", grain: "Pattern", payload: null });
  const violations = contractViolations(ENTITY, [inside, outside]);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].operator, "SYN");
  assert.equal(violations[0].reason, "operator_outside_contract");
});

test("the starting registry holds §2's rows, each resolvable, the dynamics row typed as a projection (P-a)", () => {
  const reg = nativeRegistry();
  for (const id of ["assembly:entity", "assembly:link", "assembly:network", "assembly:kind", "assembly:lens", "assembly:atmosphere", "assembly:sequence", "assembly:dynamics", "assembly:constitutional-host"]) {
    assert.ok(resolveAssembly(reg, id), `${id} is registered`);
  }
  assert.equal(resolveAssembly(reg, "assembly:dynamics").layer, "projection");
  assert.equal(resolveAssembly(reg, "assembly:constitutional-host").layer, "baseline");
});

// ── A2.1 over the results directory: stamped at run time, or reconstructed
// and recorded — a result named by neither is quotable as nothing ─────────
test("A2.1: every file in eval/results is stamped by its driver or carried by the reconstruction record, and every named assembly resolves", () => {
  const reg = nativeRegistry();
  const record = JSON.parse(fs.readFileSync(path.join(resultsDir, "assembly-reconstruction.json"), "utf8"));
  assert.equal(record.schema, "AssemblyReconstruction@1");
  for (const name of fs.readdirSync(resultsDir)) {
    if (name === "assembly-reconstruction.json") continue;
    const row = record.entries[name];
    let stamp = null;
    if (name.endsWith(".json")) {
      try {
        stamp = JSON.parse(fs.readFileSync(path.join(resultsDir, name), "utf8"))?.assembly ?? null;
      } catch { stamp = null; }
    }
    if (stamp && typeof stamp === "object" && stamp.id) {
      const resolved = resolveAssembly(reg, stamp.id);
      assert.ok(resolved, `${name}: stamped assembly ${stamp.id} resolves on the register`);
      assert.ok(Number.isInteger(stamp.version), `${name}: stamp carries a version`);
      continue;
    }
    assert.ok(row, `${name}: no run-time stamp and no reconstruction row — quotable as nothing (A2.1)`);
    if (row.assembly != null) {
      assert.ok(resolveAssembly(reg, row.assembly), `${name}: reconstructed assembly ${row.assembly} resolves on the register`);
      assert.ok(Number.isInteger(row.version), `${name}: reconstruction names the version`);
    } else {
      assert.ok(typeof row.gap === "string" && row.gap, `${name}: an assembly-less row carries a typed gap, never a bare null`);
      assert.ok(row.gap === "not_a_result" || (Array.isArray(row.organs) && row.organs.length), `${name}: a no-boundary gap names the organs it measured`);
    }
    assert.equal(row.reconstructed, true, `${name}: a record row is reconstruction, never a claim the driver stamped it`);
  }
});

test("A2.1: the three drivers §0.3 names construct their stamp from the register at run time", () => {
  for (const driver of ["constitutional-read.mjs", "causal-extraction.mjs", "understanding-scoreboard.mjs"]) {
    const src = fs.readFileSync(path.resolve(here, "../eval", driver), "utf8");
    assert.match(src, /nativeRegistry|stampResult/, `${driver} resolves its assembly through the register`);
    assert.match(src, /assembly:/, `${driver} names a registered assembly id`);
  }
});
