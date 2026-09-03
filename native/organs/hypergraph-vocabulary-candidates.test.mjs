// hypergraph-vocabulary-candidates.test.mjs — vocabulary.candidates, a
// SEPARATE file on purpose: hypergraph.test.mjs reaches the engine through
// ../eoreader7/legacy-eoreader6.1, an uninitialised submodule in this
// checkout, so a case appended there would silently never execute (the same
// precedent hyperlexicon-stance.test.mjs already established). This tests
// against eoreader7's real NATIVE organs instead — a real sibling here.
//
// WHY THIS FIELD EXISTS. Found by an adversarial audit of a real reading
// anomaly (live_priors' scripts/eot-sidecar.mjs, the SBLGNT — Greek New
// Testament critical-apparatus format — reading `edgesFound: 0`):
// `vocabulary.verbs: 0` reads IDENTICALLY whether `discoverRelationVocab`
// nominated genuinely ZERO candidates (an apparatus/table/record-block
// shape, no token ever recurring after a surface) or nominated real
// candidates that simply never cleared `minSurfaces` — two different facts
// about the material a caller could not previously tell apart from
// `vocabulary` alone. `candidates` is `discovered.candidates.length`,
// carried onto BOTH the early-return/empty shapes and the real outer return
// of `relationsFor` — purely additive, no change to `edges`/`examined`/any
// admission-path logic.
//
// AN HONEST RESIDUE, MEASURED HERE RATHER THAN ASSUMED: under
// live_priors' own eot-sidecar.mjs recipe (MIN_SURFACES_PER_VERB = 1, no
// classifyConnector/posPrior injected), `discoverRelationVocab`'s own
// `verbDominant` gate defaults to `true` whenever no posPrior is supplied
// (relations.js: `!posPrior || ...`), and every nominated candidate has
// `seenAfter.size >= 1` by construction — so under THAT exact
// configuration `candidates.length === verbs.size` ALWAYS, and this field
// does not, by itself, distinguish the SBLGNT case from ordinary prose at
// the sidecar's own gate. The general mechanism is still real (a caller
// with a higher `minSurfaces` or a real posPrior DOES see divergence — the
// last case below proves it directly against `discoverRelationVocab` itself),
// and
// the field is honest and harmless either way — this file pins BOTH the
// real divergent case and the no-divergence-under-this-recipe fact, so a
// future reader does not have to re-discover either.
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeRelationReader, MIN_SURFACES_PER_VERB } from "./hypergraph.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NATIVE = path.join(HERE, "..");

async function loadOrgans() {
  const spans = await import(path.join(NATIVE, "adapters/text/spans.js"));
  const surfaces = await import(path.join(NATIVE, "adapters/text/surfaces.js"));
  const relations = await import(path.join(NATIVE, "adapters/text/relations.js"));
  const material = await import(path.join(NATIVE, "adapters/text/material.js"));
  const priors = await import(path.join(NATIVE, "adapters/text/priors.js"));
  const determiners = new Set([...priors.DEFINITE_DETERMINERS, ...priors.INDEFINITE_DETERMINERS]);
  const relationsFor = makeRelationReader({
    splitSentences: spans.splitSentences,
    extractSurfaces: surfaces.extractSurfaces,
    discoverReferents: surfaces.discoverReferents,
    namesCorefer: surfaces.namesCorefer,
    diaNorm: surfaces.diaNorm,
    discoverRelationVocab: relations.discoverRelationVocab,
    extractRelations: relations.extractRelations,
    tokenize: material.tokenize,
    determiners,
    negationWords: priors.NEGATION_WORDS,
  });
  return { relationsFor, discoverRelationVocab: relations.discoverRelationVocab, surfaces, spans };
}

test("vocabulary.candidates: present and equal to verbs on ordinary prose (real engine organs)", async () => {
  const { relationsFor } = await loadOrgans();
  const p = { ref: "prose", text: "Pierre Bezukhov walked to the market. Pierre Bezukhov bought bread. Natasha Rostova sang a song. Natasha Rostova danced with joy." };
  const report = relationsFor([p], { pool: [p] });
  assert.equal(report.examined, true);
  assert.ok(report.vocabulary.candidates > 0, "real prose must nominate real candidates");
  assert.equal(report.vocabulary.candidates, report.vocabulary.verbs, "under MIN_SURFACES_PER_VERB=1 with no posPrior, every candidate clears the floor");
  assert.ok(report.edges.length > 0);
});

// RE-PINNED 2026-09-01 — a moved number from a real fix, not a regression.
// This case originally pinned edges:0 / candidates:0 on the SBLGNT Greek
// excerpt as "genuinely candidate-less." That zero was itself a SYMPTOM of
// the script-blindness bug eoreader7 S34 later closed (JS's \b is
// ASCII-only, so a surface written in Greek could never be located at
// all). With Greek reachable, the same bytes nominate real candidates and
// extract real edges (12 measured on merge day) — so the specimen this
// field was "built for" turns out to have been mis-diagnosed by the very
// blindness it exposed. The case now pins S34's effect from THIS repo's
// consumer side; the zero-candidates meaning is pinned on a fixture that
// is candidate-less by construction, below, rather than by a bug.
test("vocabulary.candidates: the SBLGNT Greek excerpt NOMINATES candidates now — the old zero was S34's script-blindness, re-pinned as the fix's consumer-side witness", async () => {
  const { relationsFor } = await loadOrgans();
  const fs = await import("node:fs");
  const sblgntPath = path.join(HERE, "..", "live_priors", "14-holy-texts", "sblgnt", "John.txt");
  let raw;
  try { raw = fs.readFileSync(sblgntPath, "utf8"); }
  catch { return; } // sibling corpus not present in this checkout — skip rather than fail
  const excerpt = raw.slice(0, 8000);
  const p = { ref: "sblgnt", text: excerpt };
  const report = relationsFor([p], { pool: [p] });
  assert.equal(report.examined, true);
  assert.ok(report.vocabulary.candidates > 0, "Greek surfaces are locatable now (S34) — candidates are nominated");
  assert.ok(report.edges.length > 0, "and real edges extract from the once-blind script");
});

test("vocabulary.candidates: zero on material candidate-less BY CONSTRUCTION — no token ever recurs after a surface", async () => {
  const { relationsFor } = await loadOrgans();
  // A record-block shape: surfaces exist (capitalised, recurring) but every
  // following token is unique punctuation-adjacent data — nothing for
  // discoverRelationVocab to nominate as a connector candidate.
  const text = "Alpha 17:04. Alpha 18:22. Alpha 19:56. Alpha 20:11. Alpha 21:47.";
  const p = { ref: "records", text };
  const report = relationsFor([p], { pool: [p] });
  assert.equal(report.examined, true);
  assert.equal(report.vocabulary.candidates, 0, "genuinely zero candidates were nominated — not merely zero that cleared a floor");
  assert.equal(report.vocabulary.verbs, 0);
  assert.equal(report.edges.length, 0);
});

test("vocabulary.candidates: the empty/no-passages shape carries candidates:0 too — additive, not a hole in the early-return", async () => {
  const { relationsFor } = await loadOrgans();
  const report = relationsFor([], {});
  assert.deepEqual(report.vocabulary, { verbs: 0, minSurfaces: MIN_SURFACES_PER_VERB, grammarPrior: false, candidates: 0 });
  const emptyText = relationsFor([{ ref: "blank", text: "" }], {});
  assert.equal(emptyText.vocabulary.candidates, 0);
});

test("vocabulary.candidates: the general mechanism genuinely diverges from verbs when minSurfaces > 1 — proving the field means something beyond this recipe's own default configuration", async () => {
  // Direct against discoverRelationVocab itself (not relationsFor, which
  // hardcodes MIN_SURFACES_PER_VERB=1) — a candidate seen after exactly ONE
  // surface stays a candidate but is excluded from `verbs` once the floor
  // is raised to 2, which is exactly the distinction this field exists to
  // preserve for a caller who DOES use a stricter floor or a real posPrior.
  const { discoverRelationVocab } = await loadOrgans();
  const text = "Pierre walked home. Natasha sang a song.";
  const surfaces = ["Pierre", "Natasha"];
  const looseFloor = discoverRelationVocab(text, { surfaces, minSurfaces: 1 });
  const strictFloor = discoverRelationVocab(text, { surfaces, minSurfaces: 2 });
  assert.ok(looseFloor.candidates.length > 0);
  assert.equal(looseFloor.candidates.length, strictFloor.candidates.length, "the CANDIDATE list itself does not depend on minSurfaces — only which ones clear the floor does");
  assert.ok(strictFloor.verbs.size < looseFloor.verbs.size, "raising the floor drops real verbs from `verbs` while `candidates` still names them — the exact divergence this field preserves for callers who need it");
});
