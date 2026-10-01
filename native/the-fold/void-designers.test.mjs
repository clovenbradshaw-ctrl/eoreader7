// ═══ LOVELACE · TEACH IT TO FISH ═══ the census of who designs each void is itself tested: a table nobody reads is a report, not an enforcement.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { VOIDS, KINDS, BASES, tally } from "./void-designers.mjs";

const native = fileURLToPath(new URL("..", import.meta.url));
const ledger = fs.readFileSync(fileURLToPath(new URL("../../TEACH-IT-TO-FISH.md", import.meta.url)), "utf8");
const ledgerRows = new Set([...ledger.matchAll(/^\| (\d+) \|/gm)].map((m) => Number(m[1])));
const read = (at) => fs.readFileSync(`${native}/${at.split("#")[0]}`, "utf8");

test("every void names a designer of a known kind, a basis, and evidence — measured with its date, or exactly 'unmeasured'", () => {
  const ids = new Set();
  for (const v of VOIDS) {
    assert.ok(!ids.has(v.id), `${v.id}: duplicate`); ids.add(v.id);
    assert.ok(KINDS.includes(v.kind), `${v.id}: kind ${v.kind}`); assert.ok(BASES.includes(v.basis), `${v.id}: basis ${v.basis}`);
    assert.ok(v.designer && v.asks && v.limit, `${v.id}: designer, asks and limit are all stated`);
    assert.ok(typeof v.evidence === "string" && v.evidence.length > 0, `${v.id}: evidence is never blank`);
  }
});

test("kind and basis agree: a person's hand is `supplied`; a mechanical designer never is; nothing-designs-it is `assumed` or the prompt's own words passed through `asked`", () => {
  for (const v of VOIDS) {
    if (v.kind === "person") assert.equal(v.basis, "supplied", v.id);
    if (v.kind === "mechanical" || v.kind === "mouth") assert.notEqual(v.basis, "supplied", v.id);
    if (v.kind === "none") assert.ok(["assumed", "asked"].includes(v.basis), v.id);
  }
});

test("every named file exists and every named export is still exported — a designer renamed or removed fails here, not silently", () => {
  for (const v of VOIDS) {
    const [file, name] = v.at.split("#");
    assert.ok(fs.existsSync(`${native}/${file}`), `${v.id}: ${file} does not exist`);
    if (name) assert.match(read(v.at), new RegExp(`export (?:async )?(?:function|const) ${name}\\b`), `${v.id}: ${file} no longer exports ${name}`);
  }
});

test("every void a person designed, or nothing does, is a row on the steering ledger (R2: a steer not on the ledger is hiding a gap)", () => {
  for (const v of VOIDS) if (v.kind === "person" || v.kind === "none") assert.ok(ledgerRows.has(v.ledger), `${v.id}: ledger row ${v.ledger} is not in TEACH-IT-TO-FISH.md §3`);
});

test("a stand-in sentence is quoted and must still be in its file: when someone deletes the assumption, the census has to change with it", () => {
  for (const v of VOIDS.filter((x) => x.standIn)) assert.ok(read(v.at).includes(v.standIn), `${v.id}: the file no longer contains ${JSON.stringify(v.standIn)} — the designer changed; update the census`);
});

test("the build door's census cannot lose a void: units, signature, returns, examples, the check and the helpers are each accounted for", () => {
  const build = new Set(VOIDS.filter((v) => v.path === "build").map((v) => v.id));
  for (const id of ["units", "signature", "returns", "examples", "check", "helpers", "keys"]) assert.ok(build.has(id), `build door void ${id} has no designer on the census`);
});

test("the tally says how many voids each kind designs, per path", () => {
  const t = tally();
  assert.equal(Object.values(t).flatMap((x) => Object.values(x)).reduce((a, b) => a + b, 0), VOIDS.length);
  assert.ok(t.build && t.app && t.program);
});
