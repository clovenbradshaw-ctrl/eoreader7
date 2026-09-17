// swarm-priors.test.mjs — the device->shared promotion path, falsified. Only
// a hardened Thing (>=2 independent materials) is promoted; a nominee stays
// on the device; the breakthrough union merges without clobbering; the
// prior file carries the corroboration bar it was admitted under.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promote } from "./swarm-priors.mjs";
import { harden } from "./swarm-things.mjs";

const at = "2026-09-17";
const bt = (variant, pointer) => ({
  schema: "SwarmBreakthrough@1", at, gen: 1, echo: "r111",
  shadow: { pointer }, variant, mhc: 7, terrain: ["Link"], shape: 0.574,
  mass: 0.5, delta: 0,
});

test("only a hardened thing (>=2 independent materials) is promoted; nominees stay on the device", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-priors-"));
  const { things, nominees, files } = promote({ entries: [bt("nps", "/a-ch1")], sharedDir: dir });
  assert.equal(things.length, 0, "one material is a nominee, not a thing — nothing promoted");
  assert.equal(nominees.length, 1);
  assert.equal(files.length, 0);
  // Now the second independent material corroborates nps -> it promotes.
  const { things: t2, files: f2 } = promote({ entries: [bt("nps", "/a-ch1"), bt("nps", "/b-ch1")], sharedDir: dir });
  assert.equal(t2.length, 1);
  assert.equal(f2.length, 1);
  assert.ok(fs.existsSync(path.join(dir, `${t2[0].name}.json`)));
  const prior = JSON.parse(fs.readFileSync(path.join(dir, `${t2[0].name}.json`), "utf8"));
  assert.equal(prior.schema, "SwarmThingPrior@1");
  assert.ok(prior.name.startsWith("ref:auto:swarm:"));
  assert.ok(prior.declared.corroborationRule.includes(">=2 independent materials"));
  assert.deepEqual(prior.independentSources.sort(), ["/a-ch1", "/b-ch1"]);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("the breakthrough union merges across promotions — never clobbers, never duplicates", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-priors-"));
  promote({ entries: [bt("nps", "/a-ch1")], sharedDir: dir });
  promote({ entries: [bt("nps", "/a-ch1"), bt("deep", "/c-ch1")], sharedDir: dir });
  const union = fs.readFileSync(path.join(dir, "swarm-breakthroughs.jsonl"), "utf8").trim().split("\n");
  assert.equal(union.length, 2, "nps kept once, deep added once — the merge dedupes by line");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a rerun (same material, later day) never promotes a thing", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "swarm-priors-"));
  const { things } = promote({
    entries: [bt("nps", "/a-ch1"), bt("nps", "/a-ch1", { at: "2026-09-18" })], sharedDir: dir,
  });
  assert.equal(things.length, 0, "two reads of one chapter are one chapter");
  fs.rmSync(dir, { recursive: true, force: true });
});