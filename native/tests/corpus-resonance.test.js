// tests/corpus-resonance.test.js — requires a real, local mouth (Penelope,
// with nomic-embed-text pulled on the bridge behind her; this file makes no
// non-embedding fallback, on purpose — see corpus-resonance.js's own header).
// Skips cleanly, same pattern this repo already uses for the legacy-eoreader6.1
// submodule, when that real dependency is not present rather than failing the
// run. The probe hits the MOUTH — the engine's draws never touch the channel
// or the daemon past her (2026-10-01).
import test from "node:test";
import assert from "node:assert/strict";
import { resonantPrinciple, _resetCacheForTests } from "../the-fold/corpus-resonance.js";
import { ARCHONS } from "../organs/archon-compendium.js";
import { MOUTH_URL, MOUTH_IDENTITY } from "../kernel/mouth.js";

let embeddingAvailable = false;
try {
  const res = await fetch(`${MOUTH_URL}/api/embed`, {
    method: "POST",
    headers: { "content-type": "application/json", ...MOUTH_IDENTITY },
    body: JSON.stringify({ model: "nomic-embed-text", input: "ping" }),
  });
  embeddingAvailable = res.ok;
} catch { /* no mouth reachable — skip below */ }

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
