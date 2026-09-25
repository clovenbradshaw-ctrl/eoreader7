// tests/proxy-notes.test.js — the admission pass's rendered notes
// (proxy-api.mjs::humanizeNote). The giant-code admission path (S128) is the
// only new note shape; this pins that it renders as prose and that the
// existing shapes it sits beside still render unchanged.

import { test } from "node:test";
import assert from "node:assert/strict";
import { humanizeNote } from "../../proxy-api.mjs";

test("humanizeNote: a giant code file's admission is rendered with its disclosed skip", () => {
  const line = humanizeNote({ move: "giant_code_admitted", rel: "index-px14EQkj.js", bytes: 3_198_051, scannedChars: 40_000, skippedChars: 3_158_051 });
  assert.match(line, /giant code file index-px14EQkj\.js/);
  assert.match(line, /3,198,051 bytes/);
  assert.match(line, /3,158,051 skipped, disclosed/);
});

test("humanizeNote: reading notes still render as before", () => {
  assert.equal(humanizeNote({ move: "reading", count: 2_721, chars: 3_198_051 }), "Reading: 2721 encounter(s) across 3198051 chars.");
  assert.equal(humanizeNote({ move: "scanning", root: "/tmp/ws" }), "Scanning workspace: /tmp/ws");
});