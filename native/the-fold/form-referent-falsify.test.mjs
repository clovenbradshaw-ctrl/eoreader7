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
import { detectFormReferentCue, resolveFormReferent, disambiguateFormReferent } from "./form-referent.js";
import { declareFormAsync } from "./void-spec.js";

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

const ledgerDir = (runs) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "form-amb-"));
  runs.forEach(([id, prompt, field], i) => {
    const p = path.join(dir, `${id}.jsonl`);
    fs.writeFileSync(p, [JSON.stringify({ role: "prompt", text: prompt }), JSON.stringify({ role: "void", text: `  admits       [declared] ${field}   ← x` })].join("\n") + "\n");
    const t = new Date(Date.now() - (runs.length - i) * 60000); fs.utimesSync(p, t, t);
  });
  return dir;
};

test("THE AMBIGUITY TIER, mechanical first: the ask's own words narrow the candidates; one sharing candidate is resolved without a call; none sharing is recency, disclosed", async () => {
  const dir = ledgerDir([["river_1", "write an essay on the river", "exposition"], ["sea_1", "write a sonnet about the sea", "lyric"], ["dogs_1", "write a limerick about dogs", "lyric"]]);
  try {
    const one = resolveFormReferent("write another one about the sea", { documentsDir: dir });
    assert.equal(one.tier, "mechanical");
    assert.equal(one.resolved.docId, "sea_1", "the only prior ask sharing 'sea'");
    assert.match(one.basis, /the one prior ask sharing "sea"/);
    const none = resolveFormReferent("write it again", { documentsDir: dir });
    assert.equal(none.tier, "recency", "'write' is the verb, not a shared word — nothing narrows, recency decides");
    assert.equal(none.resolved.docId, "dogs_1", "the most recent");
    assert.match(none.basis, /not chosen by anything but recency/);
    let calls = 0;
    const r = await disambiguateFormReferent(one, { draw: async () => { calls++; return "yes"; }, task: "write another one about the sea" });
    assert.equal(calls, 0, "the mechanics decided: no call is made");
    assert.equal(r, one);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("THE AMBIGUITY TIER, the mouth as a narrow oracle: several sharing candidates → one yes/no each, licensed only when exactly one gets yes", async () => {
  const dir = ledgerDir([["river_1", "write an essay on the river's floods", "exposition"], ["river_2", "write a poem about the river at night", "lyric"], ["dogs_1", "write a limerick about dogs", "lyric"]]);
  try {
    const amb = resolveFormReferent("write another one about the river", { documentsDir: dir });
    assert.equal(amb.tier, "ambiguous");
    assert.deepEqual(amb.sharing, ["river_2", "river_1"], "two prior asks share 'river', most recent first");
    assert.equal(amb.resolved.docId, "river_2", "recency's pick until a question decides");
    const asked = [];
    const yesToFloods = async (msgs) => { asked.push(msgs[0].content); return /floods/.test(msgs[0].content) ? "Yes." : "No."; };
    const lic = await disambiguateFormReferent(amb, { draw: yesToFloods, task: "write another one about the river" });
    assert.equal(asked.length, 2, "one question per sharing candidate, and only those");
    assert.ok(asked.every((q) => /Answer yes or no\.$/.test(q)));
    assert.equal(lic.tier, "licensed");
    assert.equal(lic.resolved.docId, "river_1");
    assert.equal(lic.resolved.field, "exposition");
    assert.match(lic.basis, /said yes to river_1 alone/);
    const both = await disambiguateFormReferent(amb, { draw: async () => "yes", task: "write another one about the river" });
    assert.equal(both.tier, "recency", "yes to both licenses nothing");
    assert.equal(both.resolved.docId, "river_2");
    assert.match(both.basis, /said yes to 2 — not licensed/);
    const hedge = await disambiguateFormReferent(amb, { draw: async () => "Yes and no.", task: "x" });
    assert.equal(hedge.tier, "recency", "a hedge is no answer");
    const gate = await declareFormAsync("write another one about the river", { documentsDir: dir, draw: yesToFloods });
    assert.equal(gate.field, "exposition");
    assert.equal(gate.tier, "licensed");
    assert.equal(gate.votes.length, 2);
    assert.equal((await declareFormAsync("write another one about the river", { documentsDir: dir })).tier, "ambiguous", "no draw: the mechanics' pick stands, stated as ambiguous");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
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
