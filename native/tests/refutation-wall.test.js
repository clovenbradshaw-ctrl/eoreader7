// The wall: structure does not license composition — held by executable checks.
//
// refutation.test.js already pins that the twin corpora both clear every scan
// this organ can run. That is the FINDING. This file guards the CONSEQUENCE:
// that no code path can turn "not refuted" into "admitted". The finding was
// prose and a passing scan; without these, the obvious optimization (let a
// refutation-cleared candidate license itself) can be re-added and every test
// still passes.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hyperedge } from "../kernel/hypergraph.js";
import { refuteRelation, afterVeto } from "../kernel/refutation.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const KERNEL = path.join(HERE, "..", "kernel");

const edge = (n, from, rel, to) => hyperedge({
  id: `e${n}`, relation: rel,
  participants: [{ ref: from, standing: "referent" }, { ref: to, standing: "referent" }],
  witness: `text:${n}`,
});
const SUCCESSION = [edge(1, "b", "replaces", "a"), edge(2, "c", "replaces", "b"), edge(3, "d", "replaces", "c")];
const DOMINANCE = [edge(1, "q", "defeated", "p"), edge(2, "r", "defeated", "q"), edge(3, "s", "defeated", "r")];

test("the twins are indistinguishable: neither is refuted, and that is not a licence for either", () => {
  const a = refuteRelation(SUCCESSION, "replaces", { expectUnique: true });
  const b = refuteRelation(DOMINANCE, "defeated", { expectUnique: true });
  assert.equal(a.refuted, false);
  assert.equal(b.refuted, false);
  // the disclosure must ride on both, or a caller can read silence as consent
  assert.match(JSON.stringify(a), /licence|not a licence/i);
  assert.match(JSON.stringify(b), /licence|not a licence/i);
});

test("afterVeto never returns a key no giver licensed, however clean its scan", () => {
  const clean = refuteRelation(DOMINANCE, "defeated", { expectUnique: true });
  assert.equal(clean.refuted, false);
  // "defeated" scans clean, but no giver licensed it
  const out = afterVeto([], { defeated: clean });
  assert.deepEqual([...out.survivors], [],
    "a relation absent from licensedByGiver was admitted because its scan was clean — that is self-individuation, which the twin corpora refute");
});

test("afterVeto removes what the material refutes, and keeps the rest of the giver's set", () => {
  const cyclic = [edge(1, "x", "r", "y"), edge(2, "y", "r", "x")];
  const bad = refuteRelation(cyclic, "r", { expectUnique: true });
  assert.equal(bad.refuted, true);
  const good = refuteRelation(SUCCESSION, "replaces", { expectUnique: true });
  const out = afterVeto(["r", "replaces"], { r: bad, replaces: good });
  assert.deepEqual([...out.survivors], ["replaces"]);
  assert.deepEqual(out.vetoed.map((v) => v.key), ["r"]);
});

test("no kernel source turns absence-of-refutation into admission", () => {
  const offenders = [];
  for (const f of fs.readdirSync(KERNEL).filter((n) => n.endsWith(".js"))) {
    const src = fs.readFileSync(path.join(KERNEL, f), "utf8");
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;                 // prose may discuss it
      const at = line.indexOf(".refuted");
      // any NEGATED read counts, however the value was obtained; the earlier
      // narrow `!ident.refuted` pattern let a call expression through.
      if (at < 0 || !line.slice(0, at).includes("!")) return;
      if (/^\s*([:?]|&&|\|\||\.)/.test(line)) return;   // continuation of an already-judged expression
      // Reading a negated refusal to REPORT is legitimate; reading it to ADMIT
      // is the wall, and the token alone cannot tell them apart — so intent is
      // declared with a `veto-report:` marker or the line counts as admission.
      let marked = /veto-report:/.test(line);
      for (let j = i - 1; j >= 0 && !marked && /^\s*(\/\/|\*)/.test(lines[j]); j -= 1) {
        if (/veto-report:/.test(lines[j])) marked = true;
      }
      if (marked) return;
      offenders.push(`${f}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, [],
    "a kernel source branches on !x.refuted. Absence of refutation is not a licence — pass what a named giver licensed to afterVeto() instead.");
});
