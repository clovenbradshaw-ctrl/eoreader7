// swarm-things.test.mjs — the promotion ladder and the multi-surface finder,
// falsified. A breakthrough is a nominee at one site; it hardens into a
// SELF-NAMED thing only when corroborated on >=2 independent materials; a
// rerun is not a second witness; names are derived by consequence, stable and
// recomputable; the label is the dominant cell's stance.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { thingName, harden, findThings, labelOf, dominantCell } from "./swarm-things.mjs";

const at = "2026-09-17";
const breakthrough = (variant, pointer, extra = {}) => ({
  schema: "SwarmBreakthrough@1", at, gen: 1, echo: "r111",
  shadow: { pointer }, variant, mhc: 7, terrain: ["Link"], shape: 0.574,
  mass: 0.5, delta: 0, ...extra,
});

test("a single breakthrough is a NOMINEE, never a thing — nomination is not licensing", () => {
  const { things, nominees } = harden([breakthrough("nps", "/book-a-ch1")]);
  assert.equal(things.length, 0);
  assert.equal(nominees.length, 1);
  assert.equal(nominees[0].corroborations, 1);
});

test("the same variant winning on 2 independent materials hardens into a THING", () => {
  const { things, nominees } = harden([
    breakthrough("nps", "/book-a-ch1"),
    breakthrough("nps", "/book-b-ch1"),
  ]);
  assert.equal(things.length, 1);
  assert.equal(nominees.length, 0);
  const t = things[0];
  assert.equal(t.schema, "SwarmThing@1");
  assert.equal(t.witnesses, 2);
  assert.deepEqual(t.independentSources, ["/book-a-ch1", "/book-b-ch1"]);
  assert.ok(t.name.startsWith("ref:auto:swarm:"), "the thing is self-named, never hand-named");
});

test("a rerun of the SAME material is the same witness re-testifying — not a second corroboration", () => {
  const { things, nominees } = harden([
    breakthrough("nps", "/book-a-ch1"),
    breakthrough("nps", "/book-a-ch1", { at: "2026-09-18" }),
  ]);
  assert.equal(things.length, 0, "two reads of one chapter are one chapter");
  assert.equal(nominees[0].corroborations, 1);
});

test("the self-name is derived by consequence: stable under reruns and across material; echoes are witness history, not identity", () => {
  const a = thingName({ variant: "nps", echo: "r111", terrain: ["Link"], mhc: 7 });
  const b = thingName({ variant: "nps", echo: "r111", terrain: ["Link"], mhc: 7 });
  assert.equal(a, b, "same consequence, same name — recomputable anywhere");
  const c = thingName({ variant: "deep", echo: "r111", terrain: ["Field"], mhc: 6 });
  assert.notEqual(a, c, "a different KIND of consequence hardens into a different self-named thing");
  // The same genotype winning DIFFERENT material (different realized echo) is
  // ONE thing: it makes the same kind of difference on a different ground.
  const ch2 = thingName({ variant: "nps", echo: "r110", terrain: ["Link"], mhc: 7 });
  assert.equal(a, ch2, "echo is witness history, not identity — the same variant on another ground is the same thing");
});

test("the label is a consequence report — the dominant cell's stance and terrain", () => {
  assert.equal(labelOf(["deep"]), "Field·Dissecting");
  assert.equal(labelOf(["nps"]), "Link·Making");
  assert.equal(labelOf(["reread"]), "Atmosphere·Tending");
  const { op, grain, terrain } = dominantCell(["nps"]);
  assert.equal([op, grain, terrain].join(" "), "INS Figure Link");
});

test("findThings fans out across surfaces and tags each match with its surface", () => {
  const device = { name: "device", breakthroughs: "/tmp/device-swarm-bt.jsonl", lineage: () => [] };
  const github = { name: "github", breakthroughs: "/tmp/github-swarm-bt.jsonl", lineage: () => [] };
  fs.writeFileSync("/tmp/device-swarm-bt.jsonl", JSON.stringify(breakthrough("nps", "/a-ch1")) + "\n");
  fs.writeFileSync("/tmp/github-swarm-bt.jsonl", [
    JSON.stringify(breakthrough("nps", "/a-ch1")),
    JSON.stringify(breakthrough("nps", "/b-ch1")),
  ].join("\n") + "\n");
  const found = findThings({}, [device, github]);
  assert.deepEqual(new Set(found.surfaces), new Set(["device", "github"]));
  // The device store alone corroborates nothing (1 material); the shared
  // store corroborates nps on 2 materials -> one thing, tagged github.
  assert.equal(found.nominees.length, 1);
  assert.equal(found.things.length, 1);
  assert.equal(found.things[0].surface, "github");
  const byTerrain = findThings({ terrain: "Field" }, [device, github]);
  assert.equal(byTerrain.things.length, 0);
  assert.equal(byTerrain.nominees.length, 0);
  fs.unlinkSync("/tmp/device-swarm-bt.jsonl");
  fs.unlinkSync("/tmp/github-swarm-bt.jsonl");
});