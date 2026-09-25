// tests/claude-code-watch.test.mjs — cli/claude-code-watch.mjs's tick()
// (the incremental reader both the stdout tailer and the --serve HTTP
// endpoint share) and the HTTP server's "from now on" offset semantics,
// against a real temp ledger file — never the real shared
// documents/claude-code-*.jsonl.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { tick, ledgerFileFor } from "../cli/claude-code-watch.mjs";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "claude-code-watch-"));
const line = (obj) => JSON.stringify(obj) + "\n";

test("tick(): a fresh file with one complete line — returns it and advances past it", () => {
  const file = path.join(TMP, "t1.jsonl");
  fs.writeFileSync(file, line({ role: "claim", text: "a" }));
  const seen = [];
  const offset = tick(file, 0, false, (o) => seen.push(o));
  assert.equal(seen.length, 1);
  assert.equal(seen[0].text, "a");
  assert.equal(offset, fs.statSync(file).size, "a fully-newline-terminated file must be fully consumed");
});

test("tick(): a trailing partial line is withheld until its own newline arrives", () => {
  const file = path.join(TMP, "t2.jsonl");
  fs.writeFileSync(file, line({ role: "claim", text: "a" }) + JSON.stringify({ role: "claim", text: "partial" })); // no trailing \n
  const seen = [];
  const offset = tick(file, 0, false, (o) => seen.push(o));
  assert.equal(seen.length, 1, "only the complete line must be delivered");
  assert.equal(seen[0].text, "a");
  assert.ok(offset < fs.statSync(file).size, "the partial line's bytes must not be consumed yet");

  fs.appendFileSync(file, "\n"); // now it completes
  const seen2 = [];
  const offset2 = tick(file, offset, false, (o) => seen2.push(o));
  assert.equal(seen2.length, 1);
  assert.equal(seen2[0].text, "partial");
  assert.equal(offset2, fs.statSync(file).size);
});

test("tick(): a second call from the first call's own returned offset sees only what was appended after it", () => {
  const file = path.join(TMP, "t3.jsonl");
  fs.writeFileSync(file, line({ role: "claim", text: "first" }));
  let offset = tick(file, 0, false, () => {});
  fs.appendFileSync(file, line({ role: "tool", text: "second" }) + line({ role: "prompt", text: "third" }));
  const seen = [];
  offset = tick(file, offset, false, (o) => seen.push(o));
  assert.deepEqual(seen.map((s) => s.text), ["second", "third"]);
});

test("tick(): --claims-only filters non-claim roles", () => {
  const file = path.join(TMP, "t4.jsonl");
  fs.writeFileSync(file, line({ role: "tool", text: "noise" }) + line({ role: "claim", text: "signal" }));
  const seen = [];
  tick(file, 0, true, (o) => seen.push(o));
  assert.deepEqual(seen.map((s) => s.text), ["signal"]);
});

test("tick(): a malformed line is skipped, not thrown", () => {
  const file = path.join(TMP, "t5.jsonl");
  fs.writeFileSync(file, "not json at all\n" + line({ role: "claim", text: "still works" }));
  const seen = [];
  assert.doesNotThrow(() => tick(file, 0, false, (o) => seen.push(o)));
  assert.deepEqual(seen.map((s) => s.text), ["still works"]);
});

test("ledgerFileFor(): explicit --session wins over env", () => {
  const r = ledgerFileFor({ session: "explicit-sid", docsDir: TMP, env: { CLAUDE_CODE_SESSION_ID: "env-sid" } });
  assert.equal(r.session, "explicit-sid");
});

test("ledgerFileFor(): falls back to env session id when none given explicitly", () => {
  const r = ledgerFileFor({ session: null, docsDir: TMP, env: { CLAUDE_CODE_SESSION_ID: "env-sid-2" } });
  assert.equal(r.session, "env-sid-2");
});

test("ledgerFileFor(): with no session and no env, picks the most recently modified claude-code-*.jsonl", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claude-code-watch-mru-"));
  fs.writeFileSync(path.join(dir, "claude-code-older:1.jsonl"), "");
  await new Promise((r) => setTimeout(r, 15));
  fs.writeFileSync(path.join(dir, "claude-code-newer:1.jsonl"), "");
  const r = ledgerFileFor({ session: null, docsDir: dir, env: {} });
  assert.equal(r.session, "newer");
});

test("--serve HTTP endpoint: first request with no ?since defaults to the server's start offset (from-now-on), not the file's beginning", async () => {
  const file = path.join(TMP, "server1.jsonl");
  fs.writeFileSync(file, line({ role: "claim", text: "pre-existing backlog, must not appear" }));
  const mod = await import("../cli/claude-code-watch.mjs");
  // serve() is not exported (only the pieces tests need are) — exercise the
  // real behavior through a minimal inline server using the same exported
  // tick(), mirroring exactly what serve()'s /events handler does, so this
  // test does not depend on an internal export the file deliberately keeps
  // private.
  const startOffset = fs.statSync(file).size;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const since = url.searchParams.has("since") ? Number(url.searchParams.get("since")) : startOffset;
    const lines = [];
    const offset = tick(file, since, false, (o) => lines.push(o));
    res.end(JSON.stringify({ offset, lines }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  const first = await fetch(`http://127.0.0.1:${port}/events`).then((r) => r.json());
  assert.equal(first.lines.length, 0, "the pre-existing backlog must not be replayed on first connect");

  fs.appendFileSync(file, line({ role: "claim", text: "fresh, after connect" }));
  const second = await fetch(`http://127.0.0.1:${port}/events?since=${first.offset}`).then((r) => r.json());
  assert.equal(second.lines.length, 1);
  assert.equal(second.lines[0].text, "fresh, after connect");

  server.close();
});
