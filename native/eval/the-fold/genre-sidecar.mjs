#!/usr/bin/env node
// genre-sidecar.mjs — populate FortunePrior@1 (the append-only genre
// sidecar) from real stories. For each story: read it through the recursive
// reader, compute its fortune curve, cut its movements at its OWN surprise
// seams (Halliday: genre is a staged process — the stages are the seams),
// and append one entry. After the batch, the sidecar answers: what does a
// compelling <genre> look like, in shape and staging?
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCausalTextPerceiver, textEncounters, surfaceIndex, surfacesIn } from "../../adapters/text/recursive.js";
import { diaNorm, namesCorefer } from "../../adapters/text/surfaces.js";
import { reviseTextFold } from "../../adapters/text/revision.js";
import { reconstruct } from "../../kernel/fold.js";
import { createRecursiveReader } from "../../kernel/reading.js";
import { readingIndexFromLog } from "../../the-fold/reading-log.js";
import { segmentBySurprise } from "../../kernel/surprise-segments.js";
import { appendFortune, classifyFortuneShape, fortuneSummary, filterFortune } from "../../kernel/fortune-prior.js";
import crypto from "node:crypto";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const POS = path.resolve(HERE, "../../../legacy-eoreader6.1/bin/priors/pos/en-ud-ewt.json");
const PRIOR = path.resolve(HERE, "../../../../live_priors/derived-priors/arc-priors/fortune-prior-v1.json");
const GB = path.resolve(HERE, "../../../../live_priors/01-literature-books/gutenberg");

const STORIES = [
  ["pg11_Alice_s_Adventures_in_Wonderland.txt", "narrative prose", "fantasy"],
  ["pg768_The_Adventures_of_Sherlock_Holmes.txt", "narrative prose", "mystery"],
  ["pg84_Frankenstein.txt", "narrative prose", "gothic"],
  ["pg345_Dracula.txt", "narrative prose", "gothic"],
];
const CHARS = Number(process.argv.find((a) => a.startsWith("--chars="))?.slice(8) ?? 60000);

function readStory(file) {
  const t = fs.readFileSync(path.join(GB, file), "utf8").slice(0, CHARS);
  const sents = t.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter((s) => s.length > 30);
  return { t, sents };
}

let prior = null;
try { prior = JSON.parse(fs.readFileSync(PRIOR, "utf8")); } catch {}

for (const [file, genre, subgenre] of STORIES) {
  console.error(`\n── ${file} (${genre}/${subgenre}) ──`);
  const { t, sents } = readStory(file);
  const pos = JSON.parse(fs.readFileSync(POS, "utf8"));
  const reader = createRecursiveReader({ perceivers: [createCausalTextPerceiver({ minRelationSurfaces: 2, posPrior: pos, reprojectEvery: 10 })], adapters: { revise: (a) => reviseTextFold({ ...a, canonicalizationFloor: 2 }), retrieve: () => [] } });
  const turns = [];
  for (const e of textEncounters(t, { source: `gutenberg:${file}`, offset: 0 })) turns.push(await reader.step(e));
  const log = reader.getLog();
  // THE FELT DIMENSION (conviction-as-feeling): every turn carries the
  // reader's own surprise/tension/release (dynamics.js). The felt fortune is
  // the CUMULATIVE RELEASES — each release is a witnessed transformation, a
  // beat that lands on the reader. A compelling story's felt curve is where
  // the releases climb; the fact-curve (below) is where propositions climb.
  const felt = [];
  {
    let cumRelease = 0, tensionPeak = 0, surpriseSpikes = 0;
    for (const turn of turns) {
      const rel = Array.isArray(turn?.release) ? turn.release.length : 0;
      cumRelease += rel;
      const ten = turn?.tension?.obligations?.length ?? 0; if (ten > tensionPeak) tensionPeak = ten;
      if ((turn?.surprise?.operations?.length ?? 0) > 0) surpriseSpikes++;
      felt.push({ rel, cum: cumRelease, tension: ten });
    }
    felt._shape = classifyFortuneShape(felt.map((f) => f.rel), { flatlineFloor: 0 });
    felt._peak = cumRelease; felt._tensionPeak = tensionPeak; felt._spikes = surpriseSpikes;
  }
  const idx = readingIndexFromLog(log, { reconstruct, diaNorm, namesCorefer, surfaceIndex, surfacesIn });
  const ge = reader.getFold()?.graphEntries ?? [];
  const notes = (arr) => { const out = []; for (const e of arr ?? []) { const r = e?.relation && Array.isArray(e?.participants); if (e?.schema !== "EOHyperedge@1" && !r) continue; if (!e?.relation) continue; const end = (p) => p?.surface ?? p?.ref ?? p?.surfaceKey ?? null; const s = end(e.participants?.[0]); if (!s) continue; const o = end(e.participants?.[e.participants.length - 1]) ?? "?"; out.push({ end1: s, label: e.relation, end2: o }); } return out; };
  const props = notes(ge);
  const norm = (x) => String(x ?? "").toLowerCase().split(/\s+/).join(" ");

  // fortune curve: first sentence where a prop's subject/object/act appears
  const propTerms = props.map((p, i) => ({ i, terms: [norm(p.end1), norm(p.end2), norm(p.label)].filter((t) => t.length > 2) }));
  const firstCover = new Array(props.length).fill(-1);
  for (let si = 0; si < sents.length; si++) { const s = norm(sents[si]); for (const pt of propTerms) { if (firstCover[pt.i] >= 0) continue; if (pt.terms.some((x) => s.includes(x))) firstCover[pt.i] = si; } }
  const fortune = []; let cum = 0; for (let si = 0; si < sents.length; si++) { cum += firstCover.filter((c) => c === si).length; fortune.push(cum); }

  // movements at the record's OWN seams (Halliday's staging)
  let seamBoundaries = [];
  try { const sb = segmentBySurprise(sents.map((x) => x.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 2)).flat(), { order: 3, alpha: 0.7, draws: 64, seed: 7, minLength: 160 }); seamBoundaries = sb?.boundaries ?? []; } catch { seamBoundaries = []; }
  const starts = []; let tok = 0; for (const s of sents) { starts.push(tok); tok += s.toLowerCase().split(/[^\p{L}\p{N}']+/u).filter((w) => w.length >= 2).length; }
  const boundaries = [0];
  for (const sb of seamBoundaries) for (let i = 1; i < starts.length; i++) { if (sb >= starts[i - 1] && sb < starts[i]) { if (!boundaries.includes(i)) boundaries.push(i); break; } }
  if (boundaries[boundaries.length - 1] !== sents.length - 1) boundaries.push(sents.length - 1);
  boundaries.sort((a, b) => a - b);
  const uniq = [...new Set(boundaries)];

  const movements = [];
  for (let m = 0; m < uniq.length - 1; m++) {
    const lo = uniq[m], hi = uniq[m + 1];
    const claimIdx = firstCover.map((c, i) => (c >= lo && c < hi ? i : -1)).filter((i) => i >= 0);
    const claims = claimIdx.map((i) => props[i]);
    const counts = new Map(); for (const c of claims) for (const x of [norm(c.end1), norm(c.end2)]) if (x.length > 3) counts.set(x, (counts.get(x) ?? 0) + 1);
    const focus = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)[0] ?? "the subject";
    movements.push({ focus, from: lo, to: hi, freshClaims: claims.length, gain: claims.length });
  }
  const gains = movements.map((m) => m.gain);
  const shape = classifyFortuneShape(gains);
  const entry = { source: { file, sha: crypto.createHash("sha256").update(t).digest("hex").slice(0, 16), chars: t.length }, readAt: new Date().toISOString(), recipe: "recursive reader + fortune curve + seam-staging + felt dimension", genre, medium: "text", subgenre, movements, gains, fortunePeak: fortune[fortune.length - 1] ?? 0, felt: { shape: felt._shape, releases: felt._peak, tensionPeak: felt._tensionPeak, surpriseSpikes: felt._spikes } };
  prior = appendFortune(prior, entry);
  console.error(`  ${sents.length} sentences, ${props.length} props, ${movements.length} movements, facts=${shape}, FELT=${felt._shape} (${felt._peak} releases, tension peak ${felt._tensionPeak})`);
  fs.writeFileSync(PRIOR, JSON.stringify(prior, null, 2));
}
fs.mkdirSync(path.dirname(PRIOR), { recursive: true });
console.log(`\n═══ GENRE SIDECAR (FortunePrior@1) ═══`);
console.log(JSON.stringify(fortuneSummary(prior), null, 2));
console.log(`\n═══ WHAT COMPELS, BY GENRE ═══`);
for (const genre of ["narrative prose"]) {
  const es = filterFortune(prior, { genre, medium: "text" });
  for (const e of es) console.log(`  ${e.subgenre ?? "?"} · FACTS:${e.shape}(${e.fortunePeak}) · FELT:${e.felt?.shape ?? "?"}(${e.felt?.releases ?? 0} releases, t${e.felt?.tensionPeak ?? 0}) · ${e.movements.length} mvmt · ${e.source.file.slice(0, 30)}`);
}
console.log(`\nprior: ${PRIOR} (${prior.entries.length} entries)`);