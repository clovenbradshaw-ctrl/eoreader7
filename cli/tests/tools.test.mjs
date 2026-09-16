import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readFile, listDir, grep, proposeWrite, commitWrite, proposeRun, commitRun, diffLines } from "../tools.mjs";

function tmpWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "er7-tui-test-"));
  fs.writeFileSync(path.join(dir, "hello.txt"), "line one\nline two\nline three\n");
  fs.mkdirSync(path.join(dir, "sub"));
  fs.writeFileSync(path.join(dir, "sub", "nested.txt"), "needle here\nnothing\n");
  return dir;
}

test("readFile reads a real file", () => {
  const dir = tmpWorkspace();
  const r = readFile(dir, { path: "hello.txt" });
  assert.equal(r.ok, true);
  assert.match(r.content, /line one/);
});

test("readFile reports a typed error for a missing file, never throws", () => {
  const dir = tmpWorkspace();
  const r = readFile(dir, { path: "nope.txt" });
  assert.equal(r.ok, false);
  assert.match(r.error, /no such file/);
});

test("readFile requires a path", () => {
  const r = readFile(tmpWorkspace(), {});
  assert.equal(r.ok, false);
});

test("listDir lists real entries, dirs first", () => {
  const dir = tmpWorkspace();
  const r = listDir(dir, { path: "." });
  assert.equal(r.ok, true);
  const names = r.entries.map((e) => e.name);
  assert.ok(names.includes("hello.txt"));
  assert.ok(names.includes("sub"));
  assert.equal(r.entries[0].type, "dir");
});

test("grep finds a real match across a real directory tree", () => {
  const dir = tmpWorkspace();
  const r = grep(dir, { pattern: "needle" });
  assert.equal(r.ok, true);
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].file, path.join("sub", "nested.txt"));
  assert.equal(r.matches[0].line, 1);
});

test("grep on a single file", () => {
  const dir = tmpWorkspace();
  const r = grep(dir, { pattern: "two", path: "hello.txt" });
  assert.equal(r.ok, true);
  assert.equal(r.matches.length, 1);
});

test("grep rejects an invalid regex as a typed error", () => {
  const dir = tmpWorkspace();
  const r = grep(dir, { pattern: "(unclosed" });
  assert.equal(r.ok, false);
});

test("proposeWrite computes a diff without touching disk (new file)", () => {
  const dir = tmpWorkspace();
  const target = path.join(dir, "new.txt");
  const r = proposeWrite(dir, { path: "new.txt", content: "hi\n" });
  assert.equal(r.ok, true);
  assert.equal(r.isNew, true);
  assert.equal(fs.existsSync(target), false, "propose must not write");
});

test("proposeWrite computes a diff for an existing file", () => {
  const dir = tmpWorkspace();
  const r = proposeWrite(dir, { path: "hello.txt", content: "line one\nCHANGED\nline three\n" });
  assert.equal(r.ok, true);
  assert.equal(r.isNew, false);
  const kinds = r.diff.map((d) => d.kind);
  assert.ok(kinds.includes("remove"));
  assert.ok(kinds.includes("add"));
});

test("commitWrite actually writes what was proposed", () => {
  const dir = tmpWorkspace();
  const proposal = proposeWrite(dir, { path: "new.txt", content: "committed\n" });
  commitWrite(proposal.abs, proposal.content);
  assert.equal(fs.readFileSync(path.join(dir, "new.txt"), "utf8"), "committed\n");
});

test("diffLines collapses an unchanged prefix/suffix to context", () => {
  const d = diffLines("a\nb\nc\nd", "a\nX\nc\nd");
  const removed = d.filter((l) => l.kind === "remove").map((l) => l.text);
  const added = d.filter((l) => l.kind === "add").map((l) => l.text);
  assert.deepEqual(removed, ["b"]);
  assert.deepEqual(added, ["X"]);
});

test("proposeRun computes the command without spawning anything", () => {
  const dir = tmpWorkspace();
  const r = proposeRun(dir, { command: "echo hi" });
  assert.equal(r.ok, true);
  assert.equal(r.command, "echo hi");
});

test("proposeRun rejects a missing command", () => {
  const r = proposeRun(tmpWorkspace(), {});
  assert.equal(r.ok, false);
});

test("commitRun actually executes and captures real stdout/exit code", async () => {
  const dir = tmpWorkspace();
  const r = await commitRun(dir, "echo hello-from-real-process");
  assert.equal(r.exitCode, 0);
  assert.match(r.stdout, /hello-from-real-process/);
});

test("commitRun captures a nonzero real exit code", async () => {
  const dir = tmpWorkspace();
  const r = await commitRun(dir, "exit 7");
  assert.equal(r.exitCode, 7);
});
