// job-workspace.test.mjs — a surface that holds its sources in memory (holodeck's browser workspace) hands them to a
// document job as `documents: [{ name, text }]`; the proxy writes them to a per-job directory the job then reads as
// its workspace. Measured gap (2026-09-30): POST /v1/documents accepted only a filesystem path, so a browser
// workspace could never become a job's ground. Names come from outside the machine: a name is data, never a path.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeJobWorkspace, JobWorkspaceError, safeName } from "../job-workspace.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "er7-jw-"));
const root = () => path.join(tmp(), "ws");

test("documents become files named for their sources, readable as a workspace", () => {
  const dir = root();
  const r = writeJobWorkspace({ dir, documents: [{ name: "Budget audit 2024", text: "The audit found gaps in the budget records." }, { name: "Notes", text: "Police department notes, long enough to keep." }] });
  assert.equal(r.files.length, 2);
  assert.deepEqual(fs.readdirSync(dir).sort(), ["Budget_audit_2024.txt", "Notes.txt"]);
  assert.equal(fs.readFileSync(path.join(dir, "Notes.txt"), "utf8"), "Police department notes, long enough to keep.");
});

test("a name is never a path: traversal, separators and dots cannot leave the directory", () => {
  const dir = root();
  const hostile = ["../../../etc/passwd", "/etc/hosts", "a/b/c.txt", "..", ".", "..\\..\\win.ini", "\u0000evil", "x".repeat(400)];
  const r = writeJobWorkspace({ dir, documents: hostile.map((name, i) => ({ name, text: "body " + i })) });
  for (const f of fs.readdirSync(dir)) assert.ok(!/[\\/]/.test(f) && f !== "." && f !== "..", f);
  for (const f of r.files) assert.equal(path.dirname(path.join(dir, f.file)), dir);
  assert.ok(r.files.every((f) => f.file.length <= 100));
  assert.equal(fs.readdirSync(dir).length, hostile.length, "every hostile name still produced its own file, inside the directory");
});

test("two documents with the same name both survive, in order, neither overwriting the other", () => {
  const dir = root();
  const r = writeJobWorkspace({ dir, documents: [{ name: "Report", text: "first body" }, { name: "Report", text: "second body" }] });
  assert.deepEqual(r.files.map((f) => f.file), ["Report.txt", "Report_2.txt"]);
  assert.equal(fs.readFileSync(path.join(dir, "Report_2.txt"), "utf8"), "second body");
});

test("the limits are typed refusals, never a silent truncation", () => {
  const big = "x".repeat(50);
  assert.throws(() => writeJobWorkspace({ dir: root(), documents: [{ name: "a", text: big }], limits: { maxDocs: 0 } }), (e) => e instanceof JobWorkspaceError && e.type === "too_many_documents");
  assert.throws(() => writeJobWorkspace({ dir: root(), documents: [{ name: "a", text: big }], limits: { maxDocChars: 10 } }), (e) => e.type === "document_too_large");
  assert.throws(() => writeJobWorkspace({ dir: root(), documents: [{ name: "a", text: big }, { name: "b", text: big }], limits: { maxTotalChars: 80 } }), (e) => e.type === "documents_too_large");
});

test("malformed input is refused with a type, and nothing is written", () => {
  for (const [documents, type] of [["nope", "documents_not_a_list"], [[{ name: "a" }], "document_without_text"], [[{ name: 7, text: "body" }], "document_without_name"], [[], "no_documents"]]) {
    const dir = root();
    assert.throws(() => writeJobWorkspace({ dir, documents }), (e) => e.type === type, type);
    assert.equal(fs.existsSync(dir), false, "refused before anything was written: " + type);
  }
});

test("safeName: stable, printable, never empty", () => {
  assert.equal(safeName("Budget audit, 2024 (draft).pdf"), "Budget_audit_2024_draft_.pdf");
  assert.equal(safeName("   "), "document");
  assert.equal(safeName("../.."), "document");
});
