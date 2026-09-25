import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createResourceLog, registerResource, reconfirmResource, reviseResource,
  foldRegistry, checkCubeProgression, CELL,
} from "../organs/data-integration.js";
import { cellOf } from "../kernel/cube.js";

const REPO_ROOT = "/Users/mlacy/Documents/3.0/eoreader7";

test("registers a URL resource and folds it", () => {
  const { log, refused } = registerResource(createResourceLog(), "ohs:ground-reading", {
    address: "https://github.com/clovenbradshaw-ctrl/ohs-custody/blob/main/ground-readings/f3affd2e.jsonl.zst",
    hash: "sha256:abc123", corpus: "OHS custody ground", recipe: "causalTextPerceiver+reviseTextFold@refresh25",
    giver: "michael", repoRoot: REPO_ROOT,
  });
  assert.equal(refused, null);
  const rows = foldRegistry(log);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].resourceId, "ohs:ground-reading");
  assert.deepEqual(rows[0].cell, cellOf(CELL.op, CELL.grain));
  assert.equal(rows[0].cell.terrain, "Entity", "a first-sighted resource lands on Entity, matching notes.js's own precedent");
});

test("registers a local path OUTSIDE repoRoot", () => {
  const { log, refused } = registerResource(createResourceLog(), "ohs:ground-reading", {
    address: "/Users/mlacy/Documents/3.0/ohs-custody/ground-readings/f3affd2e.jsonl.zst",
    hash: "sha256:abc123", corpus: "OHS custody ground", recipe: "causalTextPerceiver+reviseTextFold@refresh25",
    giver: "michael", repoRoot: REPO_ROOT,
  });
  assert.equal(refused, null);
  assert.equal(foldRegistry(log)[0].address, "/Users/mlacy/Documents/3.0/ohs-custody/ground-readings/f3affd2e.jsonl.zst");
});

test("THE WALL: refuses an address resolving inside repoRoot — the exact shape of this session's own mistake", () => {
  const before = createResourceLog();
  const { log, refused } = registerResource(before, "ohs:ground-reading", {
    address: "/Users/mlacy/Documents/3.0/eoreader7/native/eval/the-fold/results/readings/f3affd2e11370118-causalTextPerceiver_reviseTextFold_refresh25.jsonl.zst",
    hash: "sha256:abc123", corpus: "OHS custody ground", recipe: "causalTextPerceiver+reviseTextFold@refresh25",
    giver: "michael", repoRoot: REPO_ROOT,
  });
  assert.ok(refused);
  assert.equal(refused.reason, "resolves_inside_repo_root");
  assert.equal(log, before, "a refused registration must not append anything");
  assert.equal(foldRegistry(log).length, 0);
});

test("THE WALL: repoRoot itself, exactly, is also inside", () => {
  const { refused } = registerResource(createResourceLog(), "x", {
    address: REPO_ROOT, hash: "h", corpus: "c", recipe: "r", giver: "g", repoRoot: REPO_ROOT,
  });
  assert.equal(refused.reason, "resolves_inside_repo_root");
});

test("THE WALL: a sibling directory that merely shares a prefix is NOT inside", () => {
  const { refused } = registerResource(createResourceLog(), "x", {
    address: "/Users/mlacy/Documents/3.0/eoreader7-essay-prep.md", hash: "h", corpus: "c", recipe: "r", giver: "g",
    repoRoot: REPO_ROOT,
  });
  assert.equal(refused, null, "eoreader7-essay-prep.md is a different path, not inside eoreader7/ despite the shared prefix");
});

test("THE WALL applies to reviseResource too", () => {
  const { log } = registerResource(createResourceLog(), "x", {
    address: "https://example.com/data.jsonl", hash: "h1", corpus: "c", recipe: "r", giver: "g", repoRoot: REPO_ROOT,
  });
  const { refused } = reviseResource(log, "x", {
    address: "/Users/mlacy/Documents/3.0/eoreader7/scratch.jsonl", hash: "h2", corpus: "c", recipe: "r", giver: "g",
    repoRoot: REPO_ROOT, because: "moved",
  });
  assert.equal(refused.reason, "resolves_inside_repo_root");
});

test("required fields are declared, never defaulted (P9)", () => {
  assert.throws(() => registerResource(createResourceLog(), "x", {
    address: "https://example.com/d", hash: "h", corpus: "c", recipe: "r", giver: "g", // repoRoot omitted
  }), TypeError);
  assert.throws(() => registerResource(createResourceLog(), "", {
    address: "https://example.com/d", hash: "h", corpus: "c", recipe: "r", giver: "g", repoRoot: REPO_ROOT,
  }), TypeError);
});

test("reconfirmResource: matching hash lands evidence, never a second birth", () => {
  const { log: l1 } = registerResource(createResourceLog(), "x", {
    address: "https://example.com/d", hash: "sha256:same", corpus: "c", recipe: "r", giver: "alice", repoRoot: REPO_ROOT,
  });
  const { log: l2, refused } = reconfirmResource(l1, "x", { address: "https://example.com/d", hash: "sha256:same", giver: "bob" });
  assert.equal(refused, null);
  const rows = foldRegistry(l2);
  assert.equal(rows.length, 1, "still one resource, not two");
  assert.deepEqual(rows[0].witnesses, ["bob@https://example.com/d"]);
});

test("reconfirmResource: a different hash is refused — that is a revision, not a reconfirm", () => {
  const { log: l1 } = registerResource(createResourceLog(), "x", {
    address: "https://example.com/d", hash: "sha256:v1", corpus: "c", recipe: "r", giver: "alice", repoRoot: REPO_ROOT,
  });
  const { log: l2, refused } = reconfirmResource(l1, "x", { address: "https://example.com/d", hash: "sha256:v2", giver: "bob" });
  assert.equal(refused.reason, "hash_mismatch");
  assert.equal(foldRegistry(l2)[0].hash, "sha256:v1", "the registered hash is unchanged by a refused reconfirm");
});

test("reviseResource folds to the new state; every prior entry stays on the log (append-only)", () => {
  const { log: l1 } = registerResource(createResourceLog(), "x", {
    address: "https://example.com/v1.jsonl", hash: "sha256:v1", corpus: "c", recipe: "r", giver: "alice", repoRoot: REPO_ROOT,
  });
  const { log: l2, refused } = reviseResource(l1, "x", {
    address: "https://example.com/v2.jsonl", hash: "sha256:v2", corpus: "c", recipe: "r", giver: "alice",
    repoRoot: REPO_ROOT, because: "the corpus grew by 4 documents; re-read in full",
  });
  assert.equal(refused, null);
  const rows = foldRegistry(l2);
  assert.equal(rows.length, 1, "one resource thread, not a second registration");
  assert.equal(rows[0].address, "https://example.com/v2.jsonl");
  assert.equal(l2.entries.length, 2, "both the original propose and the supersede are on the log");
  assert.equal(l2.entries[0].address, "https://example.com/v1.jsonl", "the first entry is untouched");
});

test("reviseResource against an unregistered id is refused", () => {
  const { refused } = reviseResource(createResourceLog(), "never-registered", {
    address: "https://example.com/d", hash: "h", corpus: "c", recipe: "r", giver: "g", repoRoot: REPO_ROOT, because: "x",
  });
  assert.equal(refused.reason, "no_such_resource");
});

test("checkCubeProgression stays clean across register then revise (INS then SYN is forward)", () => {
  const { log: l1 } = registerResource(createResourceLog(), "x", {
    address: "https://example.com/v1", hash: "h1", corpus: "c", recipe: "r", giver: "g", repoRoot: REPO_ROOT,
  });
  const { log: l2 } = reviseResource(l1, "x", {
    address: "https://example.com/v2", hash: "h2", corpus: "c", recipe: "r", giver: "g", repoRoot: REPO_ROOT, because: "y",
  });
  assert.deepEqual(checkCubeProgression(l2), []);
});

test("createResourceLog admits only INS and SYN — the registry has no DEF/EVA/REC of its own", async () => {
  const { append } = await import("../kernel/task-log.js");
  const log = createResourceLog();
  const { refused } = registerResource(log, "x", {
    address: "https://x", hash: "h", corpus: "c", recipe: "r", giver: "g", repoRoot: REPO_ROOT,
  });
  assert.equal(refused, null, "registerResource's own INS is admitted");
  assert.throws(() => append(log, {
    kind: "propose", task_id: "y", operator: "DEF", operator_basis: "produced", grain: "Figure",
  }), TypeError, "a raw append() attempting an operator this narrower log never admitted is refused by task-log.js itself");
});
