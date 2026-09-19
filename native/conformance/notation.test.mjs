// notation.test.mjs — the EO Operator Notation parser (adapters/text/notation.js)
// against the EOT wire format it emits. The surface is wiki:eo-notation's Polish
// operator syntax; the records it yields must be exactly the EOTObservation@1
// shape the reader already consumes, addressed into the notation line by bytes.
import test from "node:test";
import assert from "node:assert/strict";
import { parseNotationLine } from "../adapters/text/notation.js";

const bytes = (s) => Buffer.byteLength(s, "utf8");

test("two-arg greek operator with type markers → the cell the reader consumes", () => {
  const line = "ε(Maria+, program−)";
  const { records, diagnostics } = parseNotationLine(line);
  assert.equal(records.length, 1);
  assert.deepEqual(diagnostics, []);
  const r = records[0];
  assert.equal(r.schema, "EOTObservation@1");
  assert.equal(r.role, "proposition");
  assert.equal(r.label, "ε");
  assert.equal(r.end1, "Maria+");
  assert.equal(r.end2, "program−");
  assert.equal(r.subjectBasis, "stated");
  assert.equal(r.operator, "CON");
  assert.equal(r.grain, "Figure");
  assert.equal(r.terrain, "Link");
  assert.equal(r.stance, "Binding");
  assert.equal(r.settledAs, "notation-marker");
  assert.deepEqual(r.at, [0, bytes(line)]);
  assert.equal(r.grain_gap, undefined);
  assert.equal(r.register, undefined);
});

test("three-letter codes and practitioner glyphs resolve to the same operator", () => {
  for (const op of ["CON", "⋈", "ε"]) {
    const { records } = parseNotationLine(`${op}(Maria+, program−)`);
    assert.equal(records[0].operator, "CON", `${op} should resolve to CON`);
    assert.equal(records[0].grain, "Figure");
  }
});

test("an end typed from the operand (target unmarked) resolves the cell", () => {
  const { records } = parseNotationLine("ε(Maria, program−)");
  assert.equal(records[0].grain, "Ground");
  assert.equal(records[0].terrain, "Field");
  assert.equal(records[0].stance, "Tending");
  assert.equal(records[0].settledAs, "notation-marker");
});

test("unmarked ends → grain_gap, never a guessed grain (unmarked is full, not empty)", () => {
  const { records } = parseNotationLine("ε(Maria, program)");
  const r = records[0];
  assert.equal(r.operator, "CON");
  assert.equal(r.end1, "Maria");
  assert.equal(r.end2, "program");
  assert.equal(r.grain, undefined);
  assert.equal(r.terrain, undefined);
  assert.equal(r.stance, undefined);
  assert.equal(r.grain_gap, "unmarked_end");
  assert.match(r.basis, /superposition/);
});

test("register marker rides on the record (the reader does not yet consume it)", () => {
  const { records } = parseNotationLine("σ−(patient+, diabetic*)");
  const r = records[0];
  assert.equal(r.operator, "SIG");
  assert.equal(r.register, "Ground");
  assert.equal(r.grain, "Figure");
  assert.equal(r.terrain, "Entity");
  assert.equal(r.stance, "Binding");
});

test("∥-superposed register is surfaced, not dropped", () => {
  const { records } = parseNotationLine("σ−∥*(patient+, diabetic*)");
  assert.deepEqual(records[0].register, { superposition: ["Ground", "Pattern"], surface: "−∥*" });
});

test("∥-superposed end: markers stay verbatim, and no single grain is claimed", () => {
  const { records } = parseNotationLine("ε(Maria+∥−, program)");
  const r = records[0];
  assert.equal(r.end1, "Maria+∥−");
  assert.deepEqual(r.superposition, { end1: ["Figure", "Ground"] });
  assert.equal(r.grain, undefined);
  assert.equal(r.grain_gap, "end_typed_superposed");
});

test("nested wrap: two records, containment by address, outer inherits the child's altitude", () => {
  const line = "Ω(δ(道−, 反*))";
  const { records } = parseNotationLine(line);
  assert.equal(records.length, 2);
  const [outer, inner] = records;
  // inner is the wrapped act: DEF from δ, ground from 道−
  assert.equal(inner.label, "δ");
  assert.equal(inner.operator, "DEF");
  assert.equal(inner.grain, "Ground");
  assert.equal(inner.end1, "道−");
  assert.equal(inner.end2, "反*");
  // outer is REC wrapping it; its end1 is the inner expression as written
  assert.equal(outer.label, "Ω");
  assert.equal(outer.operator, "REC");
  assert.equal(outer.end1, "δ(道−, 反*)");
  assert.equal(outer.end2, undefined);
  assert.equal(outer.grain, "Ground", "wrapping inherits the wrapped act's cell grain");
  assert.equal(outer.terrain, "Atmosphere");
  assert.equal(outer.stance, "Cultivating");
  // byte addressing: outer spans the whole line, inner sits inside it — and
  // containment is COMPUTED from the numbers, never declared.
  assert.deepEqual(outer.at, [0, bytes(line)]);
  assert.deepEqual(inner.at, [bytes("Ω("), bytes("Ω(") + bytes("δ(道−, 反*)")]);
  assert.ok(outer.at[0] <= inner.at[0] && inner.at[1] <= outer.at[1], "at-spans nest by construction");
});

test("registers on every level of a fully-marked wrap", () => {
  const { records } = parseNotationLine("Ω+(δ*(道−, 反*))");
  const [outer, inner] = records;
  assert.equal(outer.register, "Figure");
  assert.equal(inner.register, "Pattern");
  assert.equal(outer.operator, "REC");
  assert.equal(inner.operator, "DEF");
});

test("dot paths are preserved verbatim and decoded into grain segments", () => {
  const line = "ε(customer.*.email, program+)";
  const { records, tree } = parseNotationLine(line);
  const r = records[0];
  assert.equal(r.end1, "customer.*.email");
  assert.equal(r.grain, "Figure", "program+ (end2) resolves the act cell");
  assert.equal(r.terrain, "Link");
  const end1 = tree.args[0];
  assert.equal(end1.kind, "path");
  assert.deepEqual(end1.segments.map((s) => s.kind), ["ident", "pattern", "ident"]);
});

test("non-participation '_' and ground '−' grain segments parse", () => {
  const { tree } = parseNotationLine("ε(customer._.email, customer.−.email)");
  const [end1, end2] = tree.args;
  assert.deepEqual(end1.segments.map((s) => s.kind), ["ident", "nonparticipating", "ident"]);
  assert.deepEqual(end2.segments.map((s) => s.kind), ["ident", "ground", "ident"]);
});

test("`customer*` (typed end) and `customer.*` (Pattern grain segment) are different expressions", () => {
  const typed = parseNotationLine("ε(customer*, program)");
  assert.equal(typed.records[0].end1, "customer*");
  assert.deepEqual(typed.tree.args[0].segments.map((s) => s.kind), ["ident"]);
  assert.deepEqual(typed.tree.args[0].type.names, ["Pattern"]);

  const segmented = parseNotationLine("ε(customer.*, program)");
  assert.equal(segmented.records[0].end1, "customer.*");
  assert.deepEqual(segmented.tree.args[0].segments.map((s) => s.kind), ["ident", "pattern"]);
  assert.equal(segmented.tree.args[0].type, null);
});

test("superposition inside a path segment (123∥456)", () => {
  const { tree } = parseNotationLine("ε(customer.123∥456.email, program)");
  const seg = tree.args[0].segments[1];
  assert.equal(seg.kind, "ident");
  assert.equal(seg.surface, "123∥456");
});

test("ASCII '-' is accepted as the ground marker", () => {
  const { records } = parseNotationLine("ε(Maria, program-)");
  assert.equal(records[0].grain, "Ground");
  assert.equal(records[0].end2, "program-");
  assert.equal(records[0].terrain, "Field");
  assert.equal(records[0].stance, "Tending");
});

test("trailing content becomes a diagnostic, never a dropped fact", () => {
  const { records, diagnostics } = parseNotationLine("ε(Maria+, program−) garbage");
  assert.equal(records.length, 1);
  assert.equal(diagnostics.length, 1);
  assert.match(diagnostics[0].reason, /trailing/);
  assert.equal(typeof diagnostics[0].at[0], "number");
  assert.equal(typeof diagnostics[0].at[1], "number");
});

test("a malformed line yields no record and a byte-addressed diagnostic", () => {
  const { records, diagnostics } = parseNotationLine("ε(Maria+, program−");
  assert.equal(records.length, 0);
  assert.ok(diagnostics.length >= 1, "unclosed '(' is diagnosed");
  assert.equal(typeof diagnostics[0].at[0], "number");
});

test("an empty line is diagnosed", () => {
  const { records, diagnostics } = parseNotationLine("");
  assert.equal(records.length, 0);
  assert.equal(diagnostics.length, 1);
  assert.match(diagnostics[0].reason, /empty/);
});

test("a degenerate empty arg list is diagnosed and not emitted silently", () => {
  const { records, diagnostics } = parseNotationLine("ε()");
  assert.equal(records.length, 1);
  assert.ok(diagnostics.some((d) => /target/.test(d.reason)));
  assert.equal(records[0].end1, undefined);
});