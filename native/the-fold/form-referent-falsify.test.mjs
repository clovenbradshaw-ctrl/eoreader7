// form-referent-falsify.test.mjs — THE FIRST TEST OF form-referent.js
// (2026-09-22), the shape-referent gate the user asked for mid-build: "the
// prompt may say 'again' and that is a referent pointing to something that
// defines the shape." Built against this engine's REAL ledger directory
// (documents/*.jsonl, real runs from this session's own flesh-arm chase),
// not a stand-in fixture — verified against actual output before any
// assertion was written, per [[feedback_verify_gates_against_real_organs]].
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { detectFormReferentCue, resolveFormReferent } from "./form-referent.js";

// The real ledger directory, found relative to this file (not process.cwd(),
// which the test may be run from at either the repo root or native/).
const REAL_DOCUMENTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../documents");

test("detectFormReferentCue finds a closed set of anaphoric devices, and nothing else", () => {
  assert.equal(detectFormReferentCue("write it again"), "again");
  assert.equal(detectFormReferentCue("give me another one"), "another one");
  assert.equal(detectFormReferentCue("the same thing but about dogs"), "the same");
  assert.equal(detectFormReferentCue("do that once more but shorter"), "once more");
  // An ordinary genre ask has no anaphor — this is grammar detection, not a
  // genre table, and must not fire on real genre words.
  assert.equal(detectFormReferentCue("write a sonnet"), null);
  assert.equal(detectFormReferentCue("write an essay about dogs"), null);
});

test("resolveFormReferent on a real ledger directory: 'again' resolves to the most recently modified run this engine actually wrote", () => {
  const r = resolveFormReferent("write it again", { documentsDir: REAL_DOCUMENTS_DIR });
  assert.ok(r, "documents/ is this repo's real ledger directory and holds real runs");
  assert.equal(r.cue, "again");
  assert.ok(r.resolved, "at least one real ledger declares a field");
  assert.ok(r.resolved.field, "a field was read off a real void-observation line, not invented");
  assert.ok(r.resolved.docId);
  assert.match(r.basis, /resolved to the most recently modified ledger/);
});

test("no anaphoric cue means no referent lookup at all — a genre ask never touches the ledger", () => {
  assert.equal(resolveFormReferent("write a sonnet", { documentsDir: REAL_DOCUMENTS_DIR }), null);
});

test("an honest null when the ledger directory itself doesn't exist — never a silent guess", () => {
  const r = resolveFormReferent("do that again", { documentsDir: path.join(os.tmpdir(), "no-such-ledger-dir-" + Date.now()) });
  assert.equal(r.cue, "again");
  assert.equal(r.resolved, null);
  assert.match(r.basis, /not a readable ledger directory/);
});

test("an honest null when the directory exists but holds no ledger declaring a field", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "empty-ledger-"));
  try {
    fs.writeFileSync(path.join(dir, "noise.jsonl"), JSON.stringify({ role: "prompt", text: "hi" }) + "\n");
    const r = resolveFormReferent("do that again", { documentsDir: dir });
    assert.equal(r.cue, "again");
    assert.equal(r.resolved, null, "a prompt line with no matching void/field line resolves nothing");
    assert.match(r.basis, /no ledger.*declares a field/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("excludeDocId keeps a run from resolving against its own still-being-written ledger", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "self-exclude-"));
  try {
    const selfId = "current-run:1";
    fs.writeFileSync(path.join(dir, `${selfId.replace(/[^a-z0-9:_-]/gi, "_")}.jsonl`), [
      JSON.stringify({ role: "prompt", text: "write a sonnet" }),
      JSON.stringify({ role: "void", text: "  admits       [declared] lyric   ← x" }),
    ].join("\n") + "\n");
    fs.writeFileSync(path.join(dir, "older-run_1.jsonl"), [
      JSON.stringify({ role: "prompt", text: "write an essay" }),
      JSON.stringify({ role: "void", text: "  admits       [declared] exposition   ← x" }),
    ].join("\n") + "\n");
    const r = resolveFormReferent("do it again", { documentsDir: dir, excludeDocId: selfId });
    assert.equal(r.resolved.field, "exposition", "the current run's own ledger is excluded, so the OTHER real run is found");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
