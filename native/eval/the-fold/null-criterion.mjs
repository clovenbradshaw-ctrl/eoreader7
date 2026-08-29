// eval/null-criterion.mjs — does replacing the constant margin with the
// material's own permutation null make binding evidence of reading?
//
// Success is ONE number per material: lift = (bindings per adjudicated
// frame, real order) / (same, frames shuffled). The constant-margin
// criterion measured 0.25x-1.06x — scrambled material bound as easily as
// coherent. The fix stands only if the null criterion pushes lift decisively
// above 1 on the materials with power, and it is judged on the SAME
// denominator (regime.framesAdjudicated) both ways.
import fs from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripContainer, splitSentences } from "../../eoreader7/native/adapters/text/spans.js";
import { extractSurfaces, discoverReferents } from "../../eoreader7/native/adapters/text/surfaces.js";
import { resolvePronouns } from "../../eoreader7/native/adapters/text/pronouns.js";
import { extractReadable } from "../web.js";

const HERE = dirname(fileURLToPath(import.meta.url));

const FLOOR = { minActivation: 0.05, minMargin: 0.2 };
const NULLTEST = { draws: 49, seed: 20260829, alpha: 0.05 }; // declared; one setting, judged, not tuned (49 draws -> p floor 0.02 < alpha)
function rng(s){let x=s>>>0;return()=>((x=(x*1664525+1013904223)>>>0)/4294967296);}
function shuf(a,s){const r=rng(s),i=a.map((_,k)=>k);for(let k=i.length-1;k>0;k--){const j=Math.floor(r()*(k+1));[i[k],i[j]]=[i[j],i[k]];}return i.map((k,n)=>({...a[k],order:n}));}

// MATERIAL. Four of the five are read straight out of the sibling
// live_priors corpus at its own paths — the run this driver reports read the
// same four files from a session-local copy of that repo. Borodino is not in
// live_priors; the run read a plain-text extract from a session's /tmp, which
// is gone, so it reads the article from the fixture this repo already commits,
// through the extractor mhc-battery.mjs already uses for it. Disclosed rather
// than smoothed: a different extraction gives a different frame count, so the
// Borodino row is not byte-identical to the RESULTS document's, and that
// document carries the reproduction note. Both encyclopedic rows report zero
// under the null criterion either way, which is the row's finding.
const LP = join(HERE, "..", "..", "live_priors");
const FIXTURE = join(HERE, "fixtures", "wikipedia-battle-of-borodino.html");

const MATS = [
  ["Frankenstein",  () => fs.readFileSync(join(LP, "01-literature-books/gutenberg/pg84_Frankenstein.txt"), "utf8")],
  ["Pride",         () => fs.readFileSync(join(LP, "01-literature-books/gutenberg/pg1342_Pride_and_Prejudice.txt"), "utf8")],
  ["Aristotle",     () => fs.readFileSync(join(LP, "02-encyclopedic/wikipedia/Aristotle.txt"), "utf8")],
  ["Cold War",      () => fs.readFileSync(join(LP, "02-encyclopedic/wikipedia/Cold_War.txt"), "utf8")],
  ["Borodino",      () => extractReadable(fs.readFileSync(FIXTURE, "utf8")).text],
];

console.log("criterion         material       adjudicated  real-binds  shuf-binds  real-rate  shuf-rate   LIFT");
const rows = [];
for (const [label, read] of MATS) {
  const text = stripContainer(read()).text;
  let sentences = splitSentences(text);
  if (sentences.length > 2000) { // disclosed cost cap: the leading 2000 frames, not a sample
    sentences = sentences.slice(0, 2000).map((s, i) => ({ ...s, order: i }));
  }
  const presence = extractSurfaces(sentences);
  const { events } = discoverReferents(presence, {});
  const map = new Map(); for (const e of events) map.set(e.surface, e.referent_id);
  const shuffled = shuf(sentences, 20260829);
  for (const [crit, opts] of [["constant-margin", { ...FLOOR }], ["permutation-null", { ...FLOOR, nullTest: NULLTEST }]]) {
    const real = resolvePronouns(sentences, map, opts);
    const nul  = resolvePronouns(shuffled, map, opts);
    const rr = real.bindings.length / Math.max(1, real.regime.framesAdjudicated);
    const nr = nul.bindings.length / Math.max(1, nul.regime.framesAdjudicated);
    const lift = nr > 0 ? rr / nr : (rr > 0 ? Infinity : 0);
    rows.push({ label, crit, real, lift });
    console.log(
      `${crit.padEnd(17)} ${label.padEnd(13)} ${String(real.regime.framesAdjudicated).padStart(11)}  ${String(real.bindings.length).padStart(10)}  ${String(nul.bindings.length).padStart(10)}  ${rr.toFixed(3).padStart(9)}  ${nr.toFixed(3).padStart(9)}  ${(lift===Infinity?"∞":lift.toFixed(2)+"x").padStart(6)}`,
    );
  }
}

console.log("\nsample bindings under the null criterion (Frankenstein):");
const fk = rows.find((r) => r.label === "Frankenstein" && r.crit === "permutation-null").real;
for (const b of fk.bindings.slice(0, 5)) console.log(`  "${b.pronoun}" → ${b.referentId}  (p=${b.p?.toFixed(3)}, margin ${(b.margin*100).toFixed(0)}%)`);
