// ═══ CULTIVATING — a stance, not a domain (Cultivating = Generate · Ground: INS·G, SYN·G, REC·G) ═══
//
// What the stance does: grow the GROUND something will stand on. Where Tracing asks "is what was said found in
// the bytes", Cultivating goes and gets bytes worth standing on: it takes candidates in the order the caller
// ranks them, spends a DECLARED budget finding which ones hold up under a check, keeps those, and stops when what
// it has settles the need — never when it merely runs out of patience and calls the leftovers good.
//
// Domain-blind: a candidate is { id, get() } (get returns bytes, or throws); the check is a function the caller
// supplies (Tracing is one; a license check, a schema check, a freshness check are others). Cultivating owns the
// loop, the budget, the keeping of LOSERS (a trail records what failed as typed data, not only the winners — the
// slot-colony finding of 2026-10-01), and the verdict:
//   settled     `need` candidates passed within the budget
//   unsettled   the budget ran out first; what passed is returned with that said, and never as enough
//
// The control built to fail (II.23): `licensedCheck` runs the caller's check on good bytes and on a REDEAL of
// them; a check that admits the redeal admits anything, and cultivating with it would be harvesting noise.

export const CULTIVATING_SCHEMA = "EOCultivating@1";
const sameBytes = (a, b) => a === b;

/**
 * cultivate({ candidates, check, need, budget }) -> { status, kept:[{id, bytes, evidence}], losers:[{id, why}], spent, budget, need }
 * budget counts GETs (each fetch is a crossing); a candidate whose get throws is a loser with the error named.
 */
export async function cultivate({ candidates, check, need = 1, budget = 8 } = {}) {
  if (!Array.isArray(candidates)) throw new TypeError("cultivate needs a ranked candidate list");
  if (typeof check !== "function") throw new TypeError("cultivate needs a check; a harvest with no check keeps everything");
  if (!(budget >= 1) || !(need >= 1)) throw new RangeError("budget and need are declared, and at least 1");
  const kept = [], losers = []; let spent = 0;
  for (const c of candidates) {
    if (kept.length >= need) break;
    if (spent >= budget) { losers.push({ id: c.id, why: "not tried: the budget was spent" }); continue; }
    spent += 1;
    let bytes;
    try { bytes = await c.get(); } catch (e) { losers.push({ id: c.id, why: `get failed: ${String(e?.message ?? e).slice(0, 120)}` }); continue; }
    let r;
    try { r = await check(bytes, c); } catch (e) { losers.push({ id: c.id, why: `check threw: ${String(e?.message ?? e).slice(0, 120)}` }); continue; }
    const twin = r?.ok ? kept.find((k) => sameBytes(k.bytes, bytes)) : null;
    if (twin) { losers.push({ id: c.id, why: `same bytes as ${twin.id}: a second copy is not a second ground` }); continue; }
    if (r?.ok) kept.push({ id: c.id, bytes, evidence: r.evidence ?? null }); else losers.push({ id: c.id, why: r?.why ?? "failed the check", evidence: r?.evidence ?? null });
  }
  const left = candidates.length - spent - losers.filter((l) => l.why.startsWith("not tried")).length;
  void left;
  return { schema: CULTIVATING_SCHEMA, status: kept.length >= need ? "settled" : "unsettled", kept, losers, spent, budget, need };
}

const redealBytes = (bytes, seed = 1) => { let s = seed >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; const ch = [...String(bytes)]; for (let i = ch.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ch[i], ch[j]] = [ch[j], ch[i]]; } return ch.join(""); };
/** the control: a check is licensed only if it passes the good bytes and refuses their redeal */
export async function licensedCheck(check, goodBytes, { seed = 1 } = {}) {
  const good = await check(goodBytes, { id: "control:good" }), dealt = await check(redealBytes(goodBytes, seed), { id: "control:redealt" });
  return { licensed: !!good?.ok && !dealt?.ok, good: !!good?.ok, redealt: !!dealt?.ok };
}
