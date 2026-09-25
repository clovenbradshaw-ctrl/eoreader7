// native/organs/text-shape.test.mjs — conformance for sniffText's closed
// list, checked against synthetic structural cases AND real material, the
// same discipline measure.test.mjs holds sniffContainer to ("container
// sniffing: magic first, text heuristic never consulted"), one level down
// from bytes to text.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sniffText, looksJson, looksCode, CODE_SIGNAL_KEYWORDS } from "./text-shape.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");

// ── the closed list itself ──────────────────────────────────────────────

test("whitespace-only or absent input is its own typed empty, never silent prose", () => {
  assert.equal(sniffText(""), "empty");
  assert.equal(sniffText("   \n\t  \n  "), "empty");
  assert.equal(sniffText(undefined), "empty");
  assert.equal(sniffText(null), "empty");
});

test("sniffText never returns anything outside the closed four-value list", () => {
  const specimens = ["", "{}", "prose here.", "const x = 1;\n", "not json { at all", "[1,2,3]"];
  for (const s of specimens) assert.ok(["json", "code", "prose", "empty"].includes(sniffText(s)), s);
});

// ── JSON leg: magic first, structure over strict parse ─────────────────

test("full, valid JSON is json, object or array", () => {
  assert.equal(sniffText("{}"), "json");
  assert.equal(sniffText("[]"), "json");
  assert.equal(sniffText(JSON.stringify({ a: 1, b: [1, 2, 3], c: { d: "x" } })), "json");
});

test("truncated JSON is still json when the truncation is repairable: an unterminated string, a dangling trailing comma, or an unclosed nesting", () => {
  // Mid-string cut — the shape this repo's own ledger observations take when
  // a byte-limited write lands inside a value (task's own framing).
  assert.equal(sniffText('{"a": "value that got cut off becau'), "json");
  // Dangling trailing comma — cut immediately before the next field.
  assert.equal(sniffText('{"a":1,"b":2,'), "json");
  // Unclosed nesting, several levels.
  assert.equal(sniffText('{"a":{"b":[1,2,'), "json");
  assert.equal(looksJson('{"a":{"b":[1,2,'), true);
});

test("a real structural violation is never repaired into json, whatever it starts with", () => {
  // Closer does not match its own opener — this is not truncation, it is
  // broken, and no amount of appending closers fixes a wrong closer type.
  assert.notEqual(sniffText('{"a":1]'), "json");
  assert.equal(looksJson('{"a":1]'), false);
});

test("starting with a brace is not enough on its own — balanced-but-not-JSON stays off the json leg", () => {
  // No structural violation, nothing truncated, and it still is not JSON
  // (unquoted content, no colons) — a real syntax error, not a cut-off.
  assert.notEqual(sniffText("{ hello world this is not json at all }"), "json");
});

test("CSV and prose sniff as neither json nor code, same text-path precedent measure.test.mjs states for sniffContainer", () => {
  assert.equal(sniffText("time,latitude,longitude\n2026-08-17,36.0,-117.8\n"), "prose");
  assert.equal(sniffText("It was a bright cold day in April"), "prose");
});

// ── CODE leg: two declared signals per line, never one alone ───────────

test("a shebang line is code on its own, no second signal required", () => {
  assert.equal(sniffText("#!/usr/bin/env node\nrest of the file"), "code");
});

test("a markdown fenced code block marker is code on its own", () => {
  assert.equal(sniffText("some notes\n```js\nlet x = 1\n```\nmore notes"), "code");
});

test("one code-shaped word alone in a real sentence is refused — isCodeHunk's own named false positives, held to the same bar here", () => {
  // encounters.js's own header names these two exact sentences as the false
  // positive its multi-condition combination exists to guard against.
  assert.equal(sniffText("def poetry is not code at all"), "prose");
  assert.equal(sniffText("class struggle shapes history"), "prose");
  assert.equal(looksCode("def poetry is not code at all"), false);
  assert.equal(looksCode("class struggle shapes history"), false);
});

test("two declared signals co-occurring on one line is code", () => {
  assert.equal(sniffText("function isCodeHunk(text) {"), "code"); // KEYWORD + BRACE
  assert.equal(sniffText("const x = compute(); // done"), "code"); // KEYWORD + SEMI
  assert.equal(sniffText("const next = () => state + 1"), "code"); // KEYWORD + ARROW
});

test("CODE_SIGNAL_KEYWORDS is the one declared, closed list this leg reads — never invented ad hoc mid-check", () => {
  assert.ok(CODE_SIGNAL_KEYWORDS.includes("function"));
  assert.ok(CODE_SIGNAL_KEYWORDS.includes("def"));
  assert.ok(Object.isFrozen(CODE_SIGNAL_KEYWORDS));
});

// ── real specimens, pulled off disk, not invented fixtures ─────────────
// The same convention measure.test.mjs's own "container sniffing" suite
// uses for real files: read real bytes/text off a real path, skip silently
// when the machine-dependent fixture is absent, never fabricate a stand-in.

test("a real prompt-role ledger line — a person's own typed words — sniffs as prose", () => {
  // documents/claude-code-25b724c7-30cc-4d4d-8204-5785609e217b:1.jsonl,
  // obs:dc00489adfc5a8f5, role:"prompt" — read verbatim off this repo's own
  // ledger on 2026-09-22, not retyped or paraphrased.
  const text = "think deeply if this is the best way to do it";
  assert.equal(sniffText(text), "prose");
});

test("a real tool-role ledger line's OWN embedded JSON payloads sniff as json", () => {
  // The same observation's `input:`/`result:` values, each JSON on its own —
  // the leg this module exists to get right, tested on genuine content.
  const inputPayload = '{"command":"grep -n \\"export.*engineRelationsFor\\\\|function engineRelationsFor\\" /Users/mlacy/Documents/3.0/eoreader7/native/the-fold/reader-bundle.js | head -5"}';
  const resultPayload = '{"stdout":"104:export function engineRelationsFor(list, extra = {}) {","stderr":"","interrupted":false,"isImage":false,"noOutputExpected":false}';
  assert.equal(sniffText(inputPayload), "json");
  assert.equal(sniffText(resultPayload), "json");
});

test("a real tool-role line's FULL text — the label-prefixed compound `input: {...}\\nresult: {...}` this repo's own hooks actually log — does not start with a brace, so it never reaches the json leg; it reads as code here because the quoted command and stdout genuinely name `export`/`function`, a disclosed, honest result, not a forced match", () => {
  const fullText =
    'input: {"command":"grep -n \\"export.*engineRelationsFor\\\\|function engineRelationsFor\\" /Users/mlacy/Documents/3.0/eoreader7/native/the-fold/reader-bundle.js | head -5"}\n' +
    'result: {"stdout":"104:export function engineRelationsFor(list, extra = {}) {","stderr":"","interrupted":false,"isImage":false,"noOutputExpected":false}';
  assert.equal(sniffText(fullText), "code");
});

test("a real ~10-line code snippet off disk (native/adapters/code/encounters.js's own isCodeHunk) sniffs as code", () => {
  const p = path.join(REPO, "native/adapters/code/encounters.js");
  if (!existsSync(p)) return; // machine-dependent path; skip absent silently, same as measure.test.mjs's own convention
  const lines = readFileSync(p, "utf8").split("\n");
  const start = lines.findIndex((l) => l.includes("export function isCodeHunk"));
  assert.ok(start >= 0, "isCodeHunk not found — fixture moved");
  const snippet = lines.slice(start, start + 10).join("\n");
  assert.equal(sniffText(snippet), "code");
});

// ── a live sweep over every real ledger file this repo actually holds ──
// Structural invariants only (never an exact count another concurrent
// session could change): closed list always, prompt-role text is never
// silently empty, and the great majority of real prompt-role lines — a
// person's own typed words — read as prose.

test("every documents/claude-code-*.jsonl this repo holds: real prompt/tool text stays inside the closed list, and prompt text is dominantly prose", () => {
  const dir = path.join(REPO, "documents");
  if (!existsSync(dir)) return;
  const files = readdirSync(dir).filter((f) => /^claude-code-.*\.jsonl$/.test(f));
  if (!files.length) return;
  let prompts = 0, promptsProse = 0, examined = 0;
  for (const f of files) {
    const lines = readFileSync(path.join(dir, f), "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      if (!o.text) continue;
      const shape = sniffText(o.text);
      assert.ok(["json", "code", "prose", "empty"].includes(shape), `${f} ${o.id}: ${shape}`);
      if (o.role === "prompt") {
        prompts++;
        assert.notEqual(shape, "empty", `${f} ${o.id}: a real typed prompt sniffed as empty`);
        if (shape === "prose") promptsProse++;
      }
      examined++;
    }
  }
  if (prompts > 0) assert.ok(promptsProse / prompts > 0.5, `only ${promptsProse}/${prompts} real prompt-role lines read as prose`);
  assert.ok(examined > 0);
});
