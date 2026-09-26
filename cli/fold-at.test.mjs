// cli/fold-at.test.mjs -- the actual CLI interface, tested end to end by
// spawning the real process against a real, embedded public-domain excerpt
// (same text as native/the-fold/claims-from-feat-real.test.mjs, for
// consistency), not by importing its internals -- this locks in the thing a
// person actually runs, not just the library functions underneath it.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(HERE, "fold-at.mjs");

const GROUND = `One dollar and eighty-seven cents. That was all, and sixty cents of it was in pennies.
Pennies saved one and two at a time by bulldozing the grocer and the vegetable man and the
butcher until one's cheeks burned with the silent imputation of parsimony that such close
dealing implied. Three times Della counted it. One dollar and eighty-seven cents. And the
next day would be Christmas.

There was clearly nothing to do but flop down on the shabby little couch and howl. So Della
did it. Which instigates the moral reflection that life is made up of sobs, sniffles, and
smiles, with sniffles predominating.`;

function withFixture(fn) {
  const file = path.join(os.tmpdir(), `fold-at-cli-test-${process.pid}.md`);
  fs.writeFileSync(file, GROUND);
  try { return fn(file); } finally { fs.unlinkSync(file); }
}

test("with no arguments, the CLI prints usage and exits 2", () => {
  const r = spawnSync(process.execPath, [CLI], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /usage: node cli\/fold-at\.mjs/);
});

test("list mode prints real, distinct addresses from a real file, never a guess", () => {
  withFixture((file) => {
    const r = spawnSync(process.execPath, [CLI, file, "list"], { encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\d+ real claim\(s\), \d+ distinct address\(es\)/);
    assert.match(r.stdout, /\/whole\/p\d+\/\d+/);
  });
});

test("querying a real address returns real here/siblings content and honest gap reasons for unwired layers", () => {
  withFixture((file) => {
    const list = spawnSync(process.execPath, [CLI, file, "list"], { encoding: "utf8" });
    const firstAddress = list.stdout.match(/\/whole\/p\d+\/\d+/)[0];
    const r = spawnSync(process.execPath, [CLI, file, firstAddress], { encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.match(r.stdout, new RegExp(`fold at ${firstAddress.replace(/\//g, "\\/")}`));
    assert.match(r.stdout, /here \(\d+\):/);
    assert.match(r.stdout, /siblings \(\d+\):/);
    assert.match(r.stdout, /paradigm: gap: /, "an unwired layer must print its real, honest gap reason, never a fabricated value");
  });
});

test("significance is a real, document-derived number, not the old 'no holograph supplied' gap", () => {
  withFixture((file) => {
    const list = spawnSync(process.execPath, [CLI, file, "list"], { encoding: "utf8" });
    const firstAddress = list.stdout.match(/\/whole\/p\d+\/\d+/)[0];
    const r = spawnSync(process.execPath, [CLI, file, firstAddress], { encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /significance: \d+\.\d+ bits/);
  });
});
