// The pure SHA-256 must be byte-identical to node:crypto, or every seal written before it stops verifying.
import test from "node:test"; import assert from "node:assert/strict"; import { createHash } from "node:crypto";
import { sha256 } from "../kernel/sha256.js";
import { seal, verifyChain, emptyBench, addCard } from "../the-fold/surface/bench.mjs";

const ref = (s) => createHash("sha256").update(s).digest("hex");

test("sha256 equals node:crypto on empty, ASCII, block edges, multi-byte, astral and long input", () => {
  const cases = ["", "abc", "a".repeat(55), "a".repeat(56), "a".repeat(63), "a".repeat(64), "a".repeat(119), "Natásha — Bezúkhov", "𝔸𝔹 emoji 🎉 שלום 北京", "x".repeat(200003)];
  let r = 7; for (let i = 0; i < 40; i++) { let s = ""; const n = (r = (r * 1103515245 + 12345) >>> 0) % 300; for (let j = 0; j < n; j++) s += String.fromCodePoint(((r = (r * 1103515245 + 12345) >>> 0) % 0xd000) + 1); cases.push(s); }
  for (const s of cases) assert.equal(sha256(s), ref(s), JSON.stringify(s.slice(0, 20)));
});

test("a chain sealed before the switch still verifies after it (the hash did not change)", () => {
  let log = emptyBench(); log = addCard(log, { id: "k", text: "claim — ünïcode", author: "human:me" }).log;
  const e = log.entries[0]; const { hash, ...rest } = e;
  const canon = (v) => Array.isArray(v) ? `[${v.map(canon).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}` : JSON.stringify(v ?? null);
  assert.equal(hash, ref(canon(rest)));
  assert.ok(verifyChain(seal(log, { kind: "note", x: 1 })).ok);
});
