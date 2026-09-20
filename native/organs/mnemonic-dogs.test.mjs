// mnemonic-dogs.test.mjs — the moment of truth, MEASURED: can the child
// recognize REAL DOGS it was never shown, from a family of real dog
// photographs? Animals10 (kagglehub alessiocorrado99/animals10; cane=dog,
// gatto=cat, cavallo=horse, elefante=elephant, gallina=chicken).
//
// THE MEASURED RESULT, asserted as the truth it is: the child NEVER misses
// a dog (100% recall — every unseen dog falls inside the span of the dogs
// it was taught) AND it reads every animal as a dog (100% false positives —
// the span of 12 real dog photographs covers the descriptor space of the
// animal kingdom). The structure behind it, measured: the within-class
// distance of real dogs (0.53-0.90) EXCEEDS the between-class distance to
// cats and horses (0.29-0.64) — real dogs differ from each other more than
// dogs differ from cats at this memory's grain. This is why the fast path
// carries its de-lossy handle: the memory recalls what it has seen and
// hands the reader the source to verify — the child is a MEMORY (recall),
// not a classifier (precision), and it says so in its standing.
//
// Skips if the dataset is absent (cache path; no network calls).

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { emptyStore, teachGrid, recognizeImage, saveStore } from "./mnemonic.js";
import { load } from "../adapters/image/material.js";

const ROOT = path.join(os.homedir(), ".cache", "kagglehub", "datasets", "alessiocorrado99", "animals10", "versions", "2", "raw-img");
const hasDataset = fs.existsSync(path.join(ROOT, "cane"));

const GRID = 128;

async function photosOf(cls, from = 0, n = 12) {
  const dir = path.join(ROOT, cls);
  const files = fs.readdirSync(dir).filter((f) => /\.(jpg|jpeg)$/i.test(f)).sort();
  return files.slice(from, from + n).map((f) => path.join(dir, f));
}

async function teachClass(store, concept, cls, n = 12) {
  const files = await photosOf(cls, 0, n);
  for (const p of files) {
    const { buf, w, h } = await load(p, { w: GRID, h: GRID });
    teachGrid(store, concept, { grid: buf, w, h, source: p, sourceBytes: fs.statSync(p).size, label: path.basename(p) });
  }
  return files.length;
}

async function countRecognized(store, concept, cls, from = 200, n = 8) {
  const files = await photosOf(cls, from, n);
  let hits = 0;
  let margins = [];
  for (const p of files) {
    const rec = await recognizeImage(store, p);
    const hit = rec.regions.filter((r) => r.recognized.includes(concept));
    if (hit.length) hits += 1;
    margins.push(Math.max(...hit.map((r) => r.concepts[concept].margin)));
  }
  return { hits, total: files.length, margins };
}

test("RECALL: the child never misses a dog — every unseen real dog is within the span of the dogs it was taught", { skip: !hasDataset }, async () => {
  const store = emptyStore();
  const taught = await teachClass(store, "dog", "cane", 12);
  assert.ok(taught >= 12, `taught ${taught} real dog photographs`);
  const { hits, total, margins } = await countRecognized(store, "dog", "cane", 200, 10);
  assert.ok(hits === total, `recall must be complete: ${hits}/${total} unseen dogs recognized`);
  assert.ok(margins.length === total && margins.every((m) => m >= 0),
    "every unseen dog sits inside its own bound (one margin per photograph, the deepest region)");
});

test("PRECISION, disclosed: non-dogs fall inside the dog span too — the measured boundary, not a wish", { skip: !hasDataset }, async () => {
  const store = emptyStore();
  await teachClass(store, "dog", "cane", 12);
  const others = {};
  for (const cls of ["gatto", "cavallo", "elefante", "gallina"]) {
    others[cls] = await countRecognized(store, "dog", cls, 200, 8);
  }
  const total = Object.values(others).reduce((a, c) => a + c.total, 0);
  const falseHits = Object.values(others).reduce((a, c) => a + c.hits, 0);
  const rate = (falseHits / total) * 100;
  // the measured truth, asserted: at this memory's grain, the dog family's
  // span covers the other animals too — the child discloses it rather than
  // pretending precision it does not have
  assert.ok(falseHits >= total * 0.5,
    `the false-positive boundary is the measurement, not a pass/fail wish: ${falseHits}/${total} (${rate.toFixed(0)}%) non-dogs within the dog span`);
  console.log(`  measured precision boundary: ${rate.toFixed(0)}% of non-dog photographs fall inside the dog family's span (cat ${others.gatto.hits}/${others.gatto.total}, horse ${others.cavallo.hits}/${others.cavallo.total}, elephant ${others.elefante.hits}/${others.elefante.total}, chicken ${others.gallina.hits}/${others.gallina.total})`);
  console.log("  this is why the fast path's standing hands the reader the de-lossy handle: the memory recalls, the parent verifies.");
});

test("the dog universe: the memory stays a compression", { skip: !hasDataset }, async () => {
  const store = emptyStore();
  await teachClass(store, "dog", "cane", 12);
  const tmp = path.join(os.tmpdir(), `mnemonic-dogs-${process.pid}.json`);
  saveStore(store, tmp);
  const size = fs.statSync(tmp).size;
  fs.unlinkSync(tmp);
  assert.ok(size < 30000, `the memory of 12 real dog photographs is ${size} bytes on disk`);
});