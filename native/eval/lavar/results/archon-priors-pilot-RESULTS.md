# Archon priors pilot — Nietzsche (2026-09-17)

**Driver:** `../archon-priors-pilot.mjs nietzsche` (reproduces from the two
committed fixtures under `../fixtures/archon-priors/` — no network fetch).

**What this tests.** The user's own plan (2026-09-17, verbatim): ground a
swarm ant by priming it with a public-domain archon's own composition
*chemistry* — which relation-label pairs compose, never the archon's own
sentences or referents (`lib/archon-priors.mjs::stripArchonReferents`
enforces this: only `standing: "given"` rows survive, and `witnesses` are
always dropped before the file is ever written). The pipeline is the real
one: `lib/read-recipe.mjs::readMaterialText` — the SAME recipe
`chapter-swarm.mjs` and `cli/eoreader7.mjs` already run — over real fetched
Gutenberg text (Project Gutenberg #4363, *Beyond Good and Evil*, tr. Helen
Zimmern, 1907; #52263, *Twilight of the Idols* / *The Antichrist*, tr.
Anthony M. Ludovici, 1911 — both confirmed public domain by publication
date, not merely assumed from the author's era).

## Method

A single flat read over one whole book (389,072 chars) did not complete in
a multi-minute budget — measured live, killed after ~5 minutes with no
result. `chapter-swarm.mjs` already solves exactly this by reading per
CHAPTER and accumulating corroboration across chapters
(`nominationByPair`); `buildArchonPrior` generalizes that pattern one level
up, chunking each work into ~20,000-char paragraph-boundary chunks and
accumulating nominations **across every chunk of every work in an archon's
declared roster** (`ARCHON_ROSTER.nietzsche.works`, two entries). A pair
nominated by `minChunks` (default 2) or more **distinct chunks** — from the
same work or different works — is promoted to `given`; a promoted pair, and
only a promoted pair, survives `stripArchonReferents`'s wall into the
persisted prior.

## Result

| run | chars | works | chunks | encounters | relation edges | distinct nominated pairs | promoted (minChunks:2) |
|---|---|---|---|---|---|---|---|
| single work (BGE only) | 389,072 | 1 | 22 | 1,986 | 2,506 | 99 | **0** |
| both works pooled | 816,592 | 2 | 45 | 5,075 | 5,891 | 251 | **0** |

**Zero pairs corroborate at exact label-pair granularity, even pooled
across two full, independently-translated works totaling over 800K
characters and 5,891 extracted relation edges.**

## This is a real, disclosed finding, not a bug

It was checked, not assumed: the accumulator's own chunk-identity
(`w${w}c${i}`, unique per work and per chunk) was verified correct before
trusting the zero; a display-counter bug in the progress callback (fixed
the same pass) never touched the accumulation logic itself, only what was
printed.

The honest reading is that **exact relation-label-pair recurrence is rare
on real natural-language prose**, which is not a new finding for this
project — it is the SAME wall this codebase has measured and recorded
repeatedly elsewhere (the-fold's own P83: "not a weak witness but the
material"; this repo's `hyperlexicon-door-probe`/`admission-gate` results).
It is also the concrete, empirical justification for a mechanism that
already exists one level up: `kernel/hyperlexicon.js::compositionAffordance`
has a **structural fallback** keyed on GRAIN rather than the literal
label — "VERB/AUX are English lenses; the grain is not" — precisely because
exact-label chemistry this thin could never carry real composition
licensing on its own. An archon's prior, as built here, is real and
correctly wall-enforced; whether it is USEFUL to a grounded ant likely
depends on adding the same grain-level generalization this project's own
kernel already uses elsewhere, rather than tightening exact-label matching
further — named as the natural next measurement, not built here.

## What is verified and shipped

- `lib/archon-priors.mjs` — `buildArchonPrior`, `stripArchonReferents`,
  `compositionAffordanceWithArchon`, `chunkArchonText`; 7 conformance tests
  (`lib/archon-priors.test.mjs`), all against real kernel organs
  (`createHyperlexicon`/`giveHyperlexiconAffordance`/
  `admitHyperlexiconCandidates` from `kernel/hyperlexicon.js`).
- Two real, PD-confirmed Gutenberg texts committed as fixtures.
- `wilson.mjs`'s `recordBirth`/`preserveBreakthrough` gained an optional,
  additive `archon` parameter (defaults `null`/`"wilson"`) — ready to
  credit an archon as giver the moment an ant is actually primed by one,
  per the plan's own point 4. Verified: neither function is exported or
  imported elsewhere, so this is a fully isolated, backward-compatible
  change (confirmed by grep, not assumed).

## What is NOT done, disclosed rather than implied

**Wiring an archon's prior into an ant's own read (plan point 3)** — the
actual "priming" — requires editing `eot-jsonl.mjs` (1,631 lines, not read
in full this pass) to accept an archon parameter and thread it to wherever
that pipeline consults `compositionAffordance`. The real consumer of a
caller-supplied hyperlexicon already exists and has precedent:
`kernel/relation-composition.js::evaluateRelationCompositions(entries,
hyperlexicon)`, used today by `eval/experienced-new-book.mjs:177` — but
`eot-jsonl.mjs` does not call it today (confirmed by grep), so wiring
requires reading that file first, not guessing at it. Not attempted this
pass, given the real risk of an unverified change to a file with same-day
live commits already on `main`.

**Point 5 (cross-archon CON breeding, a CONTESTED dispute ledger via
`reasoning-lint.js::findClaimCycle`)** depends on point 3 existing first —
two archons cannot disagree about how to read a passage until an ant can
actually be grounded by one. Not attempted.

**A second, more repetitive archon or genre** (e.g. Homer's formulaic
epithets, which recur by design in a way philosophical aphorism does not)
is the more promising next test of whether `minChunks:2` is reachable at
all with exact-label matching, before concluding the grain-level fallback
is strictly required. Not attempted this pass.
