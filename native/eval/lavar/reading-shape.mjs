// reading-shape.mjs — the GOLDEN-FREE shape of a reading (2026-09-12).
//
// A good reading is knowable WITHOUT a hand-built golden, from its own
// structure. This is the fitness function the variant battles chase. Five
// axes, each self-measured from the ledger + origin bytes (never a golden):
//
//   1. RECOVERABILITY   every sentence byte addressed (the S101 gate).
//   2. REFERENT PURITY  share of referents that are REAL beings — a being
//      whose surface recurs >=2 times AND at least once NOT sentence-
//      initial (the S88 lesson: capitalization-only admission is the junk
//      factory — i'll/latitude/longitude/oh all fail this).
//   3. VOID RATE        share of sentences carrying an unbound pronoun.
//   4. EMITTED-VS-CLAUSE  arrangements per sentence — a shape signal (a
//      very thin reading emits near zero; a greedy one floods).
//
// usage: node reading-shape.mjs <ledgerPath> <bookPath>
import fs from "node:fs";

export function shapeOf(ledgerPath, bookPath) {
  const raw = fs.readFileSync(bookPath, "utf8");
  const lines = fs.readFileSync(ledgerPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const props = lines.filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1);
  const prodrop = lines.filter((l) => l.role === "proposition" && l.schema === "EOTProdrop@1" && l.object);
  const sentences = lines.filter((l) => l.role === "sentence" && Array.isArray(l.at));
  const voids = lines.filter((l) => l.role === "void");

  const tiles = sentences.map((l) => l.at).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [s, e] of tiles) { const last = merged[merged.length - 1]; if (last && s <= last[1]) last[1] = Math.max(last[1], e); else merged.push([s, e]); }
  const lo = tiles.length ? Math.min(...tiles.map((t) => t[0])) : 0;
  const hi = tiles.length ? Math.max(...tiles.map((t) => t[1])) : 0;
  let gapBytes = 0;
  let cursor = lo;
  for (const [s, e] of merged) { if (s > cursor && raw.slice(cursor, s).trim()) gapBytes += s - cursor; cursor = Math.max(cursor, e); }
  if (cursor < hi && raw.slice(cursor, hi).trim()) gapBytes += hi - cursor;

  const entities = lines.filter((l) => l.role === "entity" && l.referent);
  let pure = 0, totalRef = 0;
  for (const e of entities) {
    totalRef += 1;
    const surfaces = (e.surfaces ?? []).filter((s) => s && s.length >= 3);
    let real = false;
    for (const s of surfaces) {
      // UNICODE-AWARE WORD BOUNDARY (2026-09-17): the ASCII `\b` treats Greek
      // (and every non-Latin) letter as a non-word character, so `\bὁ\b` never
      // matched and referentPurity was silently 0 for all non-Latin material
      // — a measurement bug, not a property of the text. Lookarounds on the
      // Unicode letter/number classes are the boundary Greek needs.
      const re = new RegExp(`(?<![\\p{L}\\p{N}])${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "giu");
      const m = [...raw.matchAll(re)];
      if (m.length >= 2 && m.some((mm) => { const lineStart = raw.lastIndexOf("\n", mm.index) + 1; return raw.slice(lineStart, mm.index).trim() !== ""; })) { real = true; break; }
    }
    if (real) pure += 1;
  }

  return {
    recoverability: gapBytes === 0 ? 1 : 0,
    gapBytes,
    referentPurity: totalRef ? pure / totalRef : 1,
    referents: totalRef,
    pureReferents: pure,
    voidRate: sentences.length ? voids.length / sentences.length : 0,
    voids: voids.length,
    sentences: sentences.length,
    emitted: props.length + prodrop.length,
    prodrop: prodrop.length,
    perSentence: sentences.length ? (props.length + prodrop.length) / sentences.length : 0,
    // ── THE HOLOGRAPH ITSELF (2026-09-12): the reading's own internal
    // findings are the error-correction signal — the record already names
    // its own gaps. A healthy holograph has: zero SELF-REFERENT folds (the
    // reader never folds a being into itself, Holmes), RESOLVED expectations
    // (the dynamics actually moved), few untyped CONTESTS (ambiguity is
    // rare), and honest typed ABSENCES (gaps are results, never silence).
    selfReferentFolds: lines.filter((l) => l.selfReferent).length,
    movesHolograph: lines.filter((l) => l.movesHolograph).length,
    contests: lines.filter((l) => l.schema === "EOTContest@1").length,
    typedAbsences: lines.filter((l) => l.schema === "EOTAbsence@1").length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [ledgerPath, bookPath] = process.argv.slice(2);
  if (ledgerPath && bookPath) console.log(JSON.stringify(shapeOf(ledgerPath, bookPath), null, 1));
}