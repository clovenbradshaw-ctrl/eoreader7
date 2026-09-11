// field-lens-improvement-test.mjs — does the-fold's relative.js Field
// (the resemblance/"attention" lens) actually recover gold content the
// address-based ledger currently misses, more than a random cue would?
//
// Method, kept mechanical throughout (no model, no judgment call):
// 1. For each golden chapter, find "weak" referents — cast beings whose
//    gold-proposition mentions the ledger mostly fails to resolve (the
//    same class of gap drill.mjs found for Dinah, generalized and
//    re-derived per chapter rather than assumed from one specimen).
// 2. Build a Field over that chapter's own sentences (the-fold/relative.js,
//    unmodified — only the stream is new, same posture this session's
//    other Field test already held).
// 3. recall() the referent's name; check whether each UNRESOLVED gold
//    proposition's own quote-anchor appears in the top-K settled
//    sentences.
// 4. Control: repeat with random-word cues (drawn the same way nullBand
//    draws its own null) and compare hit RATE, not raw hits — a small
//    chapter Field's top-K is a big fraction of all sentences, so a
//    control is mandatory, not optional (S79/S99's own lesson).
//
// usage: node field-lens-improvement-test.mjs [ch1,ch2,...] [topKFraction]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FOLD_PATH = path.join(HERE, "..", "..", "..", "..", "the-fold") + path.sep;
const FOLD_OK = fs.existsSync(FOLD_PATH) && fs.existsSync(path.join(FOLD_PATH, "package.json"));

function resolveBook() {
  const candidates = [
    process.env.EOREADER7_ALICE_FIXTURE,
    path.join(HERE, "..", "..", "..", "..", "live_priors", "01-literature-books", "gutenberg", "pg11_Alice_s_Adventures_in_Wonderland.txt"),
    "/Users/mlacy/Documents/3.0/live_priors/01-literature-books/gutenberg/pg11_Alice_s_Adventures_in_Wonderland.txt",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}
const BOOK = resolveBook();

// A DRIVER REFUSES WHAT ITS CHECKOUT LACKS (S65/P95): this is a standalone
// eval script (no node:test test()), so under `node --test` (which globs
// *-test.mjs) it must not crash the whole run when the-fold or the
// live_priors book fixture is absent — print a typed skip and exit 0.
if (!FOLD_OK || !BOOK) {
  console.log(
    !FOLD_OK
      ? `SKIP: the sibling the-fold checkout is not available (looked for ${FOLD_PATH}) — this driver needs relative.js.`
      : "SKIP: live_priors Alice fixture not found in any known candidate location — set EOREADER7_ALICE_FIXTURE or check out a sibling live_priors repo"
  );
  process.exitCode = 0;
} else {

const { Field } = await import(`${FOLD_PATH}relative.js`);
const raw = fs.readFileSync(BOOK, "utf8");
const heads = [...raw.matchAll(/^CHAPTER ([IVXLC]+)\.\s*\r?\n([^\r\n]*)\r?\n/gm)];

const norm = (t) => String(t ?? "").split(/\s+/).join(" ").toLowerCase().trim();

function chapterSentences(ch) {
  const lo = heads[ch - 1].index + heads[ch - 1][0].length;
  const hi = ch < heads.length ? heads[ch].index : raw.length;
  const flat = raw.slice(lo, hi).split(/\s+/).join(" ").trim();
  return flat.split(/(?<=[.!?”])\s+/).map((s) => s.trim()).filter((s) => s.length > 4);
}

function loadGolden(ch) {
  return JSON.parse(fs.readFileSync(path.join(HERE, "goldens", `aiw-ch${ch}.json`), "utf8"));
}
function loadLedgerProps(ch) {
  const p = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${ch}.eot.jsonl`);
  return fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    .filter((l) => l.role === "proposition" && l.schema === "EOTObservation@1" && l.end1);
}
function isResolved(gp, ledgerProps) {
  const lab = norm(gp.label), e2 = norm(gp.end2);
  if (!lab) return false;
  return ledgerProps.some((x) => norm(x.label).includes(lab) && (!e2 || norm(x.end2).slice(0, 20).includes(e2.slice(0, 20)) || e2.includes(norm(x.end2).slice(0, 20))));
}
function castSurfaces(ch) {
  const p = path.join(HERE, "results", `pg11_Alice_s_Adventures_in_Wonderland-ch${ch}.eot.jsonl`);
  const lines = fs.readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const out = new Map();
  for (const l of lines) if (l.role === "entity") out.set(l.referent, l.surfaces ?? []);
  return out;
}

const chapters = (process.argv[2] ?? "1,2,3,4").split(",").map(Number);
const TOPK_FRACTION = Number(process.argv[3] ?? 0.1);
const RANDOM_DRAWS = 15;

let totalWeakReferents = 0, totalUnresolvedAnchors = 0, cueHits = 0, cueSignificantHits = 0;
let controlHitsSum = 0;
const perReferentRows = [];

for (const ch of chapters) {
  const golden = loadGolden(ch);
  const ledgerProps = loadLedgerProps(ch);
  const surfacesByRef = castSurfaces(ch);
  const sentences = chapterSentences(ch);

  // Group gold propositions per referent by simple surface-substring match
  // on end1/end2 text — mechanical, same spirit as golden-tool's own norm.
  const byRef = new Map();
  for (const [refId, surfaces] of surfacesByRef) {
    if (!surfaces.length) continue;
    const primary = [...surfaces].sort((a, b) => b.length - a.length)[0];
    const mentions = golden.propositions.filter((gp) =>
      surfaces.some((s) => (gp.end1 ?? "").toLowerCase().includes(s.toLowerCase()) || (gp.end2 ?? "").toLowerCase().includes(s.toLowerCase())));
    if (mentions.length < 3) continue;
    const resolved = mentions.filter((gp) => isResolved(gp, ledgerProps));
    const unresolved = mentions.filter((gp) => !isResolved(gp, ledgerProps));
    const resolvedFrac = resolved.length / mentions.length;
    if (resolvedFrac < 0.3) byRef.set(refId, { primary, mentions, unresolved });
  }

  const field = new Field();
  for (const s of sentences) field.admit(s, {});
  const topK = Math.max(3, Math.round(field.size * TOPK_FRACTION));

  for (const [refId, { primary, mentions, unresolved }] of byRef) {
    totalWeakReferents += 1;
    totalUnresolvedAnchors += unresolved.length;
    const ranked = field.recall(primary);
    const band = field.nullBand(primary.split(/\s+/).length, { draws: 100 });
    const topSet = ranked.slice(0, topK).map((r) => r.node.text);
    const topSetSignificant = ranked.slice(0, topK).filter((r) => r.activation > band.hi).map((r) => r.node.text);

    let hits = 0, sigHits = 0;
    for (const gp of unresolved) {
      const anchor = gp.quote?.toLowerCase() ?? "";
      if (!anchor) continue;
      const inTop = topSet.some((t) => t.toLowerCase().includes(anchor.slice(0, Math.min(30, anchor.length))));
      const inSig = topSetSignificant.some((t) => t.toLowerCase().includes(anchor.slice(0, Math.min(30, anchor.length))));
      if (inTop) hits += 1;
      if (inSig) sigHits += 1;
    }
    cueHits += hits; cueSignificantHits += sigHits;

    // Control: random-word cues, same draws nullBand uses, same hit test.
    const vocabWords = [...field.vocab.keys()];
    let controlHitsForRef = 0;
    for (let d = 0; d < RANDOM_DRAWS; d++) {
      const w = vocabWords[Math.floor(Math.random() * vocabWords.length)];
      const rr = field.recall(w).slice(0, topK).map((r) => r.node.text.toLowerCase());
      let h = 0;
      for (const gp of unresolved) {
        const anchor = gp.quote?.toLowerCase() ?? "";
        if (anchor && rr.some((t) => t.includes(anchor.slice(0, Math.min(30, anchor.length))))) h += 1;
      }
      controlHitsForRef += h;
    }
    const controlAvg = controlHitsForRef / RANDOM_DRAWS;
    controlHitsSum += controlAvg;

    perReferentRows.push({ ch, refId, primary, mentions: mentions.length, unresolved: unresolved.length, hits, sigHits, controlAvg: +controlAvg.toFixed(2), topK, fieldSize: field.size });
    console.log(`ch${ch} ${refId} ("${primary}"): ${unresolved.length} unresolved gold anchors, cue hits ${hits} (${sigHits} above null band), control avg ${controlAvg.toFixed(2)}/${unresolved.length}`);
  }
}

console.log(`\n=== TOTALS ===`);
console.log(`weak referents examined: ${totalWeakReferents}`);
console.log(`unresolved gold anchors: ${totalUnresolvedAnchors}`);
console.log(`recovered in top-K by the real cue: ${cueHits} (${(100 * cueHits / totalUnresolvedAnchors).toFixed(1)}%)`);
console.log(`...of which cleared the null band: ${cueSignificantHits} (${(100 * cueSignificantHits / totalUnresolvedAnchors).toFixed(1)}%)`);
console.log(`recovered by an average random-word cue: ${controlHitsSum.toFixed(1)} (${(100 * controlHitsSum / totalUnresolvedAnchors).toFixed(1)}%)`);
console.log(cueHits > controlHitsSum ? "REAL CUE BEATS THE RANDOM-WORD CONTROL" : "REAL CUE DOES NOT CLEARLY BEAT THE CONTROL");

fs.writeFileSync(path.join(HERE, "results", "field-lens-improvement-test.json"), JSON.stringify({ perReferentRows, totals: { totalWeakReferents, totalUnresolvedAnchors, cueHits, cueSignificantHits, controlHitsSum } }, null, 1));

}
