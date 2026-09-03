# The hypergraph made rich by default (2026-09-02, S50)

User: *"I think the hypergraph should be this rich ALWAYS."* Said after
`reading-wall-RESULTS.md`'s last section showed both sides' notes folding
to `subject —were→ the rest of the sentence`.

## Where the grain was gated — found at zero calls, one gate at a time

`note-match-zero.mjs` folds each labeled cited face with the article's own
reader and dumps the edges the stating sentences yield. Each switch below
was turned on alone and the dump re-read; edges per face at each step:

| reader | edges on the six labeled faces (12 labeled notes) | what changed |
|---|---|---|
| as the walk had it | 6 · 9 · 5 · 9 · 13 · 3 · 57 | `were→placed…`, `was→still steaming… had launched…` |
| + `phrasalPredicates` (DR5, existed, off) | same counts | `had served`, `were examining` — only where the head verb was already in the vocabulary |
| + article passages in the pool | same counts | the pool feeds the closed-class measure, not the verb vocabulary |
| + UniMorph `verbForms` (existed, unwired here) | 7 · 9 · 5 · 13 · 17 · 3 · 67 | `they —flew→`; `were flown` on the article side |
| + `attestedVerbs` (new, declared, default off in the organ) | 14 · 13 · 7 · 14 · 25 · 5 · 76 | first-arrival prior verbs admitted; UniMorph lacks *placed, retrieved, launched, announced, added* |
| + UD English-EWT verb-dominant forms ∪ UniMorph | 18 · 18 · 15 · 22 · 47 · 8 · 115 | `the two containers —were placed→`, `The recovery helicopter one by one —retrieved→ the three astronauts`, `the astronauts —removed→ their BIGs`, `Apollo 11 —launched→ from Cape Kennedy on July 16`, `it —contained→ the 16mm data acquisition camera…` |

Three gates, then: the recurrence floor (`FORM_MIN_ARRIVALS` — right for
unsupervised discovery, wrong for a form a received prior already
attests: on a one-page face *placed* arrives once and could never be an
act), the prior's coverage (UniMorph English is a 10k-form sample; the POS
prior attests what it lacks), and the auxiliary chain (DR5, built, never
wired into the walk). None is a threshold; the share floor on the POS
prior (verb-dominant > 0.5) is declared at the caller, the same floor
`nonverbDominant` already used.

**One leak the richer vocabulary opened, closed the same hour:** UD attests
*buzz* as a verb and *Buzz* recurs in every Apollo passage, so the widening
read `Armstrong and —buzz→ Aldrin`. A form that occurs capitalised away
from a sentence start more often than lowercase in the passage is a
surface, not an act — the passage's own casing decides; no name list. Both
widening paths carry it. 0 such edges after; `hypergraph.test.mjs` 58/58,
`relations.test.js` 48/48, the organ byte-identical with the option off.

## The walk-level null: the whole article, offline, 0 calls, real against rotated control

`OFFLINE=1 MAXF=300 WITNESS=0`, the same 150 cached faces (the live archive
walk had just filled them — below), `RICH=0` against the default.

| | plain reader | rich reader |
|---|---|---|
| notes read from the article | 524 | **674** |
| act is a bare auxiliary (*was, were, had…*) | 245 | **131** |
| notes with a readable cited face | 435 | 552 |
| same-sentence, real | 31 | **57** |
| same-sentence, control | 21 | 31 |
| same-sentence through the note's OWN footnote, real | 8 | **17** |
| same-sentence through the note's own footnote, control | 2 | 5 |
| window, real vs control | 11 vs 9 | 12 vs 15 |

The separation on the proposition-measuring class grows from 10 to 26; on
the citation-bound subset from 6 to 12. The window class is not
proposition-measuring (a word bag over three sentences) and the control
overtakes it under either reader.

**Said against it, so it is not oversold.** Median note length is 5
content tokens under both readers, but notes of ≤3 tokens go 119 → 193
and the same-sentence hits among them 20 → 40: half the same-sentence
gain is short notes, and a three-word note is stated by many sentences.
Specimens from the new same-sentence set include real ones — *"500
samples —are prepared→ and sent to investigators every year"* against the
curator's page — and coincidences: *"a program —developed→ by NASA"*
against a biography sentence carrying all three words. The class needs a
length-aware null before its count is quoted alone; the control already
says the rich reader is not merely making more matchable noise (31 of 552
against 21 of 435 is the same rate), but the short-note share is the
honest caveat.

**Three labels lost their key.** The 12 labeled-stated notes are keyed by
id, and the rich reader re-cuts three of them (149 `They —were found→`,
42, 150), so `slicer-labels.json` needs those three re-keyed on their
`article` sentence before the coverage and reading-wall scripts run
against the rich walk. Not done here.

## What the rich hypergraph still does not carry

Read straight off the probe: coordination stays one edge (*placed aboard …
and flown directly to Ellington* — the article's *were flown* never meets
it); a passive is not turned (*the helicopter retrieved the astronauts*
does not become *the astronauts were retrieved*); the object is the whole
predicate, not its head; and the vocabulary gap (*winched / retrieved*,
*capture images / film footage*, *worn / removed*) is untouched. The
structural matcher still lands 1 of 12 for exactly these reasons — now
named one at a time instead of hidden under `were→`.

## Calls, honestly

This pass was designed at zero calls and its measurement is zero calls.
But two runs spent model calls I had not declared: the live archive walk
(`ranke-backwards.mjs` without `OFFLINE=1`, 295 fetches, 151 network)
runs the walk's own witness under its default cap and spent **50**; the
first offline base/rich pair ran under the default cap too and spent
**23 + 38**. The walk's witness is now off (`WITNESS=0`) on every
measurement run here. **111 undeclared calls**, recorded.

## The live archive walk (VPN off, same day)

web.archive.org answers from this box without the VPN. 295 fetches, 151
over the network, faces read 166 (was 72 offline): readable notes 305 →
437, same-sentence 18 → 31 (control 21), object-missing partials through a
citation 30 → 49, hub gaps 287 → 81 consults, 294 consults read through
the archive copy. Kept as `ranke-backwards-live-base.json` (plain reader);
the canonical `ranke-backwards.json` is now the rich reader over the same
cache.

## Files
`organs/hypergraph.js` (`attestedVerbs`, surface guard on both widening
paths), `ranke-backwards.mjs` (rich default, `RICH=0`, `OUT=`),
`note-match-zero.mjs` (`FINE`, `VERBS=prior|both`, `ATTEST`, `POOL`),
`results/ranke-backwards-{base,rich,live-base,live-maxf40,run5-offline}.json`
and logs, `results/note-match-zero*.json`.
