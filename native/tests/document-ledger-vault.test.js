// document-ledger-vault.test.mjs — the sealed-line disk path (2026-09-16):
// a caller-supplied ciphertext line lands on disk verbatim, the in-memory
// ledger is unaffected, and projection skips a sealed row rather than
// crashing on it or guessing at its content.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createDocumentLedger,
  appendLedgerLine,
  ledgerFilePath,
  isSealedLine,
  projectLedgerFile,
} from "../the-fold/document-ledger.js";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "fold-vault-ledger-"));
}

test("isSealedLine: structural check, not an assumption about the whole file", () => {
  assert.equal(isSealedLine({ shape: "sealed-ledger-line", v: 1, env: "abc" }), true);
  assert.equal(isSealedLine({ id: "x", role: "revision" }), false);
  assert.equal(isSealedLine(null), false);
  assert.equal(isSealedLine({ shape: "sealed-ledger-line" }), false, "no env string: not sealed");
});

test("appendLedgerLine with sealedLine writes ciphertext to disk, plaintext in memory", () => {
  const dir = tmpDir();
  const ledger = createDocumentLedger({ docId: "doc:vault-test", title: "A Vaulted Essay" });
  const line = appendLedgerLine(
    ledger,
    { role: "part", title: "opening", text: "the plaintext the model actually wrote", giver: "model", supersedes: null },
    { dir, sealedLine: "AAAA-not-real-ciphertext-BBBB" }
  );
  // in-memory: ordinary plaintext line, unaffected by the on-disk sealing
  assert.equal(line.text, "the plaintext the model actually wrote");

  const onDisk = fs.readFileSync(ledgerFilePath(dir, ledger.docId), "utf8").trim();
  const row = JSON.parse(onDisk);
  assert.equal(isSealedLine(row), true);
  assert.equal(row.env, "AAAA-not-real-ciphertext-BBBB");
  // the plaintext text never reaches the disk row
  assert.equal(JSON.stringify(row).includes("plaintext the model actually wrote"), false);
});

test("projectLedgerFile skips a sealed row rather than crashing or guessing", () => {
  const dir = tmpDir();
  const ledger = createDocumentLedger({ docId: "doc:mixed", title: "Mixed Ledger" });
  appendLedgerLine(ledger, { role: "part", title: "s1", text: "plain paragraph one", giver: "model", supersedes: null }, { dir });
  appendLedgerLine(ledger, { role: "part", title: "s2", text: "REDACTED-BY-VAULT", giver: "model", supersedes: null }, { dir, sealedLine: "ciphertext-blob-2" });

  const filePath = ledgerFilePath(dir, ledger.docId);
  const projected = projectLedgerFile(filePath, { embedCitations: false });
  assert.ok(projected !== null, "projection does not crash on a mixed plain/sealed file");
  assert.ok(projected.includes("plain paragraph one"));
  assert.equal(projected.includes("REDACTED-BY-VAULT"), false, "a sealed line's plaintext never reached disk, so it cannot appear in the projection");
});
