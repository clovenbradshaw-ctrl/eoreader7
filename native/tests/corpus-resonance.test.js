// tests/corpus-resonance.test.js — requires a real, local Ollama with
// nomic-embed-text pulled (this file makes no non-embedding fallback, on
// purpose — see corpus-resonance.js's own header). Skips cleanly, same
// pattern this repo already uses for the legacy-eoreader6.1 submodule,
// when that real dependency is not present rather than failing the run.
import test from "node:test";
import assert from "node:assert/strict";
import { resonantPrinciple, _resetCacheForTests } from "../the-fold/corpus-resonance.js";
import { ARCHONS } from "../organs/archon-compendium.js";

const OLLAMA = process.env.ER7_OLLAMA_URL ?? "http://localhost:11434";
let embeddingAvailable = false;
try {
  const res = await fetch(`${OLLAMA}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", input: "ping" }),
  });
  embeddingAvailable = res.ok;
} catch { /* no local Ollama reachable — skip below */ }

test("corpus-resonance: declared deps required, never silently substituted", async () => {
  await assert.rejects(() => resonantPrinciple("x", {}), /ARCHONS array/);
});

test(
  "corpus-resonance: an off-topic task clears no null ceiling, gets nothing",
  { skip: !embeddingAvailable && "no local Ollama + nomic-embed-text reachable" },
  async () => {
    _resetCacheForTests();
    const r = await resonantPrinciple("how do I reset my password", { archons: ARCHONS });
    assert.equal(r, null);
  },
);

test(
  "corpus-resonance: a task near-quoting an archon's own role resonates with THAT archon",
  { skip: !embeddingAvailable && "no local Ollama + nomic-embed-text reachable" },
  async () => {
    _resetCacheForTests();
    const r = await resonantPrinciple("a word designates by exclusion or by hypothesis, which is it here", { archons: ARCHONS });
    assert.ok(r);
    assert.equal(r.handle, "dignaga");
    assert.ok(r.similarity > r.ceiling);
  },
);
