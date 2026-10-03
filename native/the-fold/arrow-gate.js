// Failure-directed selection over the caller's past record. No model verdicts.
import { createHash } from "node:crypto";

const escaped = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const bodyHashOf = (body) => createHash("sha256").update(String(body)).digest("hex");
export const namedInOutput = (output, name) => new RegExp(`(?<![\\w$])${escaped(name)}(?![\\w$])`, "u").test(String(output));
export const namedInTraceback = (output, name) => new RegExp(`(?:\\bin |\\bat )${escaped(name)}(?![\\w$])`, "u").test(String(output));

export function inForceVerdicts(history = []) {
  const latest = new Map();
  for (const row of history) {
    if (row.target && row.applied && Number.isInteger(row.testExitCode)) latest.set(row.target, row);
  }
  return [...latest.values()];
}

export function consecutiveReverts(history = [], target) {
  let n = 0;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const row = history[i];
    if (row.target !== target || !row.applied || !Number.isInteger(row.testExitCode)) continue;
    if (!row.reverted || row.testExitCode === 0) break;
    n += 1;
  }
  return n;
}

export function arrowCycle({ history = [], target, bodyHash }) {
  return history.find((r) => r.target === target && r.bodyHash === bodyHash && r.reverted && r.testExitCode !== 0)?.round ?? null;
}

export function arrowGate({ units = [], history = [], skip = new Set() } = {}) {
  const candidates = units.filter((u) => u.isStub && !skip.has(u.name));
  const last = [...history].reverse().find((r) => Number.isInteger(r.testExitCode));
  const named = candidates.filter((u) => namedInTraceback(last?.testOutput ?? "", u.name));
  const mentioned = candidates.filter((u) => namedInOutput(last?.testOutput ?? "", u.name));
  const pool = named.length ? named : mentioned.length ? mentioned : candidates;
  const target = pool[0] ?? null;
  const by = named.length ? "failure-frame" : mentioned.length ? "failure-named" : "field-order";
  return { ok: !!target, target, by, tied: pool.length > 1, basis: target ? `${by}: ${target.name}` : "no open, unwalled void" };
}
