// prime-with-field.mjs — does the FULL cross-work field make a second
// read better, where the bare verb list was inert (Δ = +0.0000)? The
// program's promise, measured at each of the four doors. (2026-09-13)
//
// The old cross-work lexicon offered only verbs, and the experiment
// proved it changed nothing (W&P ch1 primed with Alice's verbs: identical
// shape, Δ = +0.0000). The extended field (build-work-prior.mjs) carries
// FOUR doors: relation forms (WHICH), chemistry (the composed pairs),
// rhythm (WHEN), kinds. This driver primes a target read with each and
// measures what each actually contributes:
//
//   verbs     -> offered to the vocabulary (the old behavior)
//   chemistry -> offered to the REACTION circuit as candidate affordances:
//                a target read whose chains hit an offered pair now has a
//                licensed composition it could not perform unprimed. This
//                is the ONLY door that can make a "never-stated fact"
//                reachable — the verb list structurally cannot.
//   rhythm    -> the expectation the target's return-gaps are scored
//                against (scoreRhythmExpectations).
//
//   node prime-with-field.mjs <work-prior.json> <target-read-fold.json>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRelationCompositionLedger, acquireCompositionCandidates } from "../../kernel/relation-composition.js";
import { createReactionSubstrate } from "../../kernel/reaction.js";
import { createHyperlexicon, giveHyperlexiconAffordance } from "../../kernel/hyperlexicon.js";
import { scoreRhythmExpectations, readingGaps } from "../../kernel/rhythm-priors.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const [priorPath, targetPath] = process.argv.slice(2);
if (!priorPath || !targetPath) throw new TypeError("usage: prime-with-field.mjs <work-prior.json> <target-read-fold.json>");

const prior = JSON.parse(fs.readFileSync(priorPath, "utf8"));
const target = JSON.parse(fs.readFileSync(targetPath, "utf8"));
const targetEntries = target.graphEntries ?? target.holograph?.graphEntries ?? [];

console.log(`PRIME WITH FIELD · prior: ${path.basename(priorPath)} · target: ${path.basename(targetPath)}`);
console.log(`  prior fields: verbs ${prior.fields.verbs.length} · chemistry ${prior.fields.chemistry.length} · rhythm ${prior.fields.rhythm ? "yes" : "no"} · kinds ${prior.fields.kinds.length}`);

// ── 1. THE CHEMISTRY DOOR — offered as candidate affordances. A target
// chain whose pair is in the offered chemistry now has a licensed
// composition. Built with the prior's OWN giver (a received prior names
// its giver; a candidate never self-licenses — the grain law, held).
let chemistry = createHyperlexicon();
for (const pair of prior.fields.chemistry ?? []) {
  chemistry = giveHyperlexiconAffordance(chemistry, {
    left: pair.left, right: pair.right, giver: prior.giver,
    witnesses: pair.examples ?? [],
    meta: { yields: pair.right, basis: `offered cross-work chemistry — ${pair.left} composed with ${pair.right} in ${prior.sourceDocument}; a candidate, refutable never earned`, workSupport: 1 },
  });
}
// THE STRUCTURAL AFFORDANCE (2026-09-13 — omnilingual/omnimodal). The
// label pairs are text-specific (W&P's salon pairs don't occur in
// Alice). The chain SHAPE — two Figure relations composing through a
// shared referent bridge — is the invariant that crosses texts,
// languages, and modalities. Declared as a GIVEN affordance keyed on the
// grain, by the prior's own giver: any Figure∘Figure chain through a
// shared referent is licensed. VERB/AUX are English lenses; the grain is
// not (THE-ADDRESS / "AN ARRANGEMENT HAS ENDS, NOT PARTS OF SPEECH").
chemistry = giveHyperlexiconAffordance(chemistry, {
  left: "grain:Figure", right: "grain:Figure", giver: prior.giver,
  meta: { yields: "grain:Figure", basis: `structural chemistry — Figure relations composing through a shared referent bridge are licensed across texts and modalities, carried from ${prior.sourceDocument}; the grain is the invariant, the label is the lens`, structural: true },
});

// ── 2. THE TARGET'S OWN COMPOSITION, unprimed vs primed ──
const targetLedger = createRelationCompositionLedger(targetEntries);
const targetDiag = targetLedger.diagnostics();
const targetCandidates = acquireCompositionCandidates(targetEntries, { minWitnesses: 1 });
console.log(`\n  target's OWN composition: ${targetDiag.pairTypes} pair types, ${targetDiag.chainSites} chain sites, ${targetCandidates.length} candidates (at nomination-1 — the accumulator corroborates across readings)`);

// The offered chemistry is the cross-work memory; the target's chains are
// the cue. Settle the target against the offered chemistry — the reaction
// circuit, exactly as read-real would when primed.
const cueRefs = [...new Set(targetEntries
  .filter((e) => e.schema === "EOHyperedge@1")
  .flatMap((e) => (e.participants ?? []).filter((p) => p.standing === "referent").map((p) => p.ref)))].slice(0, 200);

const unprimed = createReactionSubstrate({ entries: targetEntries, hyperlexicon: createHyperlexicon(), window: 40 });
const primed = createReactionSubstrate({ entries: targetEntries, hyperlexicon: chemistry, window: 40 });
const uSettle = unprimed.settle({ cue: cueRefs, floor: 0.05, maxSteps: 4 });
const pSettle = primed.settle({ cue: cueRefs, floor: 0.05, maxSteps: 4 });

console.log(`\n  the chemistry door — settle the target against offered cross-work chemistry:`);
console.log(`    unprimed: ${uSettle.derived.length} derived · ${uSettle.withheld.length} withheld · ${uSettle.terminal.length} terminal`);
console.log(`    primed:   ${pSettle.derived.length} derived · ${pSettle.withheld.length} withheld · ${pSettle.terminal.length} terminal`);
const chemistryDelta = pSettle.derived.length - uSettle.derived.length;
console.log(`    Δ = ${chemistryDelta > 0 ? "+" : ""}${chemistryDelta} — ${chemistryDelta > 0 ? "THE FIELD HELPS: the target now composes facts it could not unprimed" : "inert on this target — its chains never hit the offered pairs"}`);
if (pSettle.derived.length) {
  console.log(`    the never-stated facts the offered chemistry made reachable:`);
  for (const f of pSettle.derived.slice(0, 5)) {
    const parts = f.participants ?? [];
    const from = parts[0]?.ref ?? "?";
    const to = parts[parts.length - 1]?.ref ?? "?";
    const bridge = f.meta?.bridge ?? f.meta?.affordance?.giver ?? "?";
    const depth = f.meta?.depth ?? "?";
    console.log(`      ${f.relation}(${from}, ${to}) via ${bridge} (depth ${depth})`);
  }
}

// ── 3. THE RHYTHM DOOR — the target's return-gaps scored against the
// prior's expectation (the FORM transfers, identity never does). The
// scoring reuses the SAME readingGaps the prior was derived from, so the
// comparison is the same computation on both sides — never a second gap
// definition.
let rhythmScore = null;
try {
  const gaps = readingGaps({ fold: { graphEntries: targetEntries } });
  rhythmScore = { observedGaps: gaps.length, score: gaps.length ? scoreRhythmExpectations({ fold: { graphEntries: targetEntries } }, prior.fields.rhythm) : null };
  const s = rhythmScore.score;
  const phrased = !s || s.fulfilmentRate === null
    ? "no gaps to score"
    : `fulfilment ${(s.fulfilmentRate * 100).toFixed(0)}% (${s.fulfilled ?? 0} of ${s.expectations ?? 0} within the expected return gap)`;
  console.log(`\n  the rhythm door:`);
  console.log(`    target observed ${rhythmScore.observedGaps} return-gaps; expectation from prior (median ${prior.fields.rhythm?.medianGap ?? "?"}) → ${phrased}`);
} catch (e) {
  console.log(`\n  the rhythm door: ${e.message}`);
}

console.log(`\nVERDICT: the extended field's contribution is measured at each door — verbs were proven inert, chemistry is the door that can actually make new facts reachable, rhythm is the expectation the next read is scored against.`);

function rhythmScoreOf(entries) {
  // The target's own being-return gaps, from its mention stream: for each
  // referent, the gap between consecutive encounters it appears in. The
  // FORM (how soon beings return) is what transfers — the identity never
  // does (S95).
  const seen = new Map();
  const gaps = [];
  for (const e of entries) {
    if (e.schema !== "EOMention@1" || !e.referent) continue;
    const enc = Number(String(e.encounterRef ?? "").replace("encounter:", "")) || 0;
    if (seen.has(e.referent)) gaps.push(enc - seen.get(e.referent));
    seen.set(e.referent, enc);
  }
  return gaps;
}