// eval/reopen-null.mjs — NULL BEFORE NUMBER for /reopen. The one number the
// door could be tempted to report — "how often would the last open be the
// thing the person opened next?" — is a PREDICTION (the last open at cursor
// i vs the actual open at i). Judged against a REDEAL_SEED null: the same
// score over the record's open rows in shuffled order. A real rate at the
// null median is chance-level and is said so.
import { readFileSync } from "node:fs";
import { lastOpened, OPEN_EVENTS } from "../reopen.js";
const rows = readFileSync(new URL("../record/explore-record.jsonl", import.meta.url), "utf8").split("\n").filter(Boolean)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter((r) => r && OPEN_EVENTS[r.event]);
const score = (rs) => { let hit = 0, n = 0; for (let i = 1; i < rs.length; i++) { const p = lastOpened(rs, { before: i }); if (p.refused) continue; n++; const cur = lastOpened(rs, { before: i + 1 }); if (cur.kind === p.kind && cur.address === p.address) hit++; } return { hit, n, rate: n ? hit / n : 0 }; };
const mulberry = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (xs, seed) => { const r = mulberry(seed), a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const real = score(rows);
const SEEDS = Number(process.env.SEEDS ?? 50), base = Number(process.env.REDEAL_SEED ?? 0);
const nulls = Array.from({ length: SEEDS }, (_, k) => score(shuffle(rows, base + k)).rate).sort((a, b) => a - b);
const med = nulls[Math.floor(SEEDS / 2)], atOrAbove = nulls.filter((r) => r >= real.rate).length;
console.log(`open rows on the record: ${rows.length} (${Object.entries(rows.reduce((m, r) => (m[OPEN_EVENTS[r.event].kind] = (m[OPEN_EVENTS[r.event].kind] ?? 0) + 1, m), {})).map(([k, v]) => `${k} ${v}`).join(", ")})`);
console.log(`"the last open is the next open": ${real.hit}/${real.n} = ${real.rate.toFixed(3)}`);
console.log(`null (rows redealt, ${SEEDS} seeds from REDEAL_SEED=${base}): median ${med.toFixed(3)} · range ${nulls[0].toFixed(3)}–${nulls[SEEDS - 1].toFixed(3)} · shuffles at or above the real rate: ${atOrAbove}/${SEEDS}`);
console.log(atOrAbove / SEEDS <= 0.05 ? "→ above the null: the record's order carries a real re-open signal" : atOrAbove / SEEDS >= 0.5 ? "→ AT THE NULL MEDIAN: chance-level — reopen's pick is a restore, not a prediction, and no hit rate is claimed" : "→ below α=0.05 not reached: not claimed");
