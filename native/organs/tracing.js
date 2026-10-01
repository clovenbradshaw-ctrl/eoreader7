// ═══ TRACING — a stance, not a domain (Tracing = Relate · Pattern: SIG·P, CON·P, EVA·P) ═══
//
// What the stance does: follow a CLAIMED thing back along the line it says it came from, to where it is first
// found in the bytes, and report that line — or refuse, by name, at the first place the line breaks. It reads no
// subject matter. A claim here is { path, value }: "this value sits at this address". The ground is the bytes
// something actually returned. Tracing answers one question: is the claimed pairing of address and value found
// there? It does not say the value is TRUE (coherence is never correspondence); it says it is not INVENTED.
//
// Why it exists (found 2026-10-01): asked to find a sample of an air-quality API, the pipeline searched and then
// SHOWED a sample it had written itself (`pm2_5: 10 …`) with nothing fetched. A link or a sample handed to a
// reader is checked against real bytes first (P20's rule); this is that check as a stance, so it serves a
// sample, a quoted field, a figure in an answer — anything that says "this was there".
//
// The control built to fail (II.23, A10): the same sample with its values REDEALT across its own addresses has
// every value present somewhere in the bytes and every address too — only the pairing is destroyed. A tracer that
// admits it is checking presence, not provenance, and `licensed` says so. A tracer that cannot tell the real
// sample from that redeal is not used.

export const TRACING_SCHEMA = "EOTracing@1";

const isObj = (x) => x && typeof x === "object";
/** every leaf of a parsed document as { path, value } — arrays index as [i], so the path is an exact address */
export function leavesOf(doc, base = "") {
  if (!isObj(doc)) return [{ path: base, value: doc }];
  const out = [];
  if (Array.isArray(doc)) doc.forEach((x, i) => out.push(...leavesOf(x, `${base}[${i}]`)));
  else for (const [k, v] of Object.entries(doc)) out.push(...leavesOf(v, base ? `${base}.${k}` : k));
  return out;
}
/** the same leaf in any document: numbers compare as numbers, everything else exactly */
const same = (a, b) => (typeof a === "number" && typeof b === "number" ? a === b : a === b);
const parsed = (bytes) => { try { return JSON.parse(bytes); } catch { return undefined; } };
/** a path with its array indices made general, so "hourly.temp[3]" and "hourly.temp[0]" are the same address-kind */
const kindOf = (p) => p.replace(/\[\d+\]/g, "[]");

/**
 * indexGround — read each document once. ground: [{ id, bytes }] -> { docs:[{id, bytes, leaves}] }
 */
export function indexGround(ground) {
  return { docs: ground.map(({ id, bytes }) => { const doc = parsed(bytes); return { id, bytes, leaves: doc === undefined ? null : leavesOf(doc) }; }) };
}

/**
 * traceClaim — find where one { path, value } is first found.
 *   traced      the value sits at that exact address in a document (the pairing holds)
 *   same-kind   the value sits at the same address-kind with a different index (an array position moved) — named, never counted as traced
 *   value-only  the value is somewhere in the bytes under another address (presence without the pairing)
 *   refused     nothing in the bytes holds it
 */
export function traceClaim(claim, index) {
  const { path, value } = claim;
  let kind = null, only = null;
  for (const d of index.docs) {
    if (d.leaves) {
      for (const l of d.leaves) {
        if (!same(l.value, value)) continue;
        if (l.path === path) return { claim, status: "traced", origin: { doc: d.id, path: l.path } };
        if (!kind && kindOf(l.path) === kindOf(path)) kind = { doc: d.id, path: l.path };
        else if (!only && value !== null && value !== "" && typeof value !== "boolean") only = { doc: d.id, path: l.path };
      }
    } else if (typeof value === "string" && value.length >= 3 && d.bytes.includes(value) && !only) only = { doc: d.id, path: null, at: d.bytes.indexOf(value) };
  }
  if (kind) return { claim, status: "same-kind", origin: kind, why: "the value is there at this kind of address but not this position" };
  if (only) return { claim, status: "value-only", origin: only, why: "the value is in the bytes, but not at the address the claim gives it" };
  return { claim, status: "refused", why: "nothing in the bytes holds this value" };
}

/**
 * traceSample — a whole shown sample against the ground: every leaf must trace. -> { verdict, traced, failures }
 *   grounded  every leaf traced (and there is at least one)
 *   invented  one or more leaves are not found at all
 *   unpaired  every value is somewhere in the bytes, but at least one is not at its address (the redealt shape)
 */
export function traceSample(sample, ground) {
  const index = indexGround(ground), leaves = leavesOf(sample), results = leaves.map((l) => traceClaim(l, index));
  const traced = results.filter((r) => r.status === "traced"), failures = results.filter((r) => r.status !== "traced");
  const verdict = !leaves.length ? "invented" : !failures.length ? "grounded" : failures.some((f) => f.status === "refused") ? "invented" : "unpaired";
  return { schema: TRACING_SCHEMA, verdict, leaves: leaves.length, traced: traced.length, failures: failures.map((f) => ({ path: f.claim.path, value: f.claim.value, status: f.status, why: f.why })) };
}

/** a sample with its values dealt across its own addresses (same multiset, pairing destroyed); seeded so the control repeats */
export function redeal(sample, seed = 1) {
  const leaves = leavesOf(sample); let s = seed >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const vals = leaves.map((l) => l.value);
  for (let i = vals.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [vals[i], vals[j]] = [vals[j], vals[i]]; }
  if (vals.length > 1 && vals.every((v, i) => same(v, leaves[i].value))) vals.push(vals.shift());
  const out = Array.isArray(sample) ? [] : {};
  leaves.forEach((l, i) => { const keys = l.path.match(/[^.[\]]+/g) ?? []; let cur = out; keys.forEach((k, ki) => { const last = ki === keys.length - 1, nextIsIdx = !last && /^\d+$/.test(keys[ki + 1]); if (last) cur[k] = vals[i]; else cur = cur[k] ??= nextIsIdx ? [] : {}; }); });
  return out;
}

/**
 * licensed — the control. A tracer is licensed on a real sample only if it grounds the sample AND refuses its
 * redeal AND refuses an invented value. Anything else is a presence check wearing provenance's name.
 */
export function licensed(realSample, ground, { seed = 1 } = {}) {
  const real = traceSample(realSample, ground), dealt = traceSample(redeal(realSample, seed), ground);
  const invented = traceSample({ ...(isObj(realSample) && !Array.isArray(realSample) ? realSample : {}), __invented: "no such value in any byte " + seed }, ground);
  return { licensed: real.verdict === "grounded" && dealt.verdict !== "grounded" && invented.verdict !== "grounded", real: real.verdict, redealt: dealt.verdict, invented: invented.verdict };
}
