# Select vs generate on one real ledger — the paraphrase wall measured with both witness protocols — 2026-09-02

*Driver: `eval/corroboration-select-vs-generate.mjs` (BUDGET env, default 30). Live
gemma2:2b at temperature 0 against the two committed Borodino fixtures
(`wikipedia-battle-of-borodino.html`, `wikipedia-war-and-peace.html`), read
by the production reader bundle (native provider, POS prior lit,
determiners/negation injected). Two runs, byte-identical numbers.*

## Design

One ledger, heard from BOTH pages (87 notes: 83 heard, 4 PLANTED
fabrications — real notes with the object swapped for another note's
object). Zero notes at the >=2-distinct-source gate before the walk. The
SAME `corroborateLedger` walk with the SAME 30-ask budget, twice:

- **GENERATE** — the model writes a `because`; armed by sibling swap (P32).
- **SELECT** — the model points at a mechanically gathered stating sentence
  by index; armed by the same-index rule (reading-recall addendum 7).

Precision guard: an attest on any planted note is a lie, and disqualifies
the arm regardless of recall.

## Result

| arm | asks | model calls | wall time | attested | at gate after | lied on planted | refusals (typed) |
|---|---|---|---|---|---|---|---|
| GENERATE | 30/30 | 40 | 164s | **7** | 7 | **0** | unarmed 16 · decider_unrelated 4 · no-testimony 3 |
| SELECT | 30/30 | 50 | 84s | **6** | 6 | **0** | indiscriminate 13 · no-testimony 6 · unarmed-select 2 · unarmed 1 · other 2 |

Both arms: 46 candidate pairs **skipped for no co-presence** — the other
source shares no end-word with the note, so the walk never asks.

## Reading

1. **The two protocols are equivalent in recall on real encyclopedic prose**
   (7 vs 6 of the same budget) and equal in precision (0 lies each). Select
   is twice as fast per ask (shorter prompts, no free-text generation) but
   spends 25% more calls (the arm is always paid). Neither buys the wall.
   The calibration difference measured on War and Peace (0.33 vs 2/6) does
   not separate them at ledger scale.

2. **CORRECTED (same day, by `eval/copresence-audit.mjs`): the 46 skips are
   of 166 note×source PAIRS, not "more than half the ledger" — 119 pairs
   WERE feasible at ±400 and the 30-ask budget asked a quarter of them.
   The first reading mistook a budget cap for a gate.** Of the 47 skipped:
   18 have an end with no content word at all (debris — lever 3), 14 have
   an end absent from the whole other page (genuine paraphrase, no window
   helps), 15 are recoverable only by widening the window (±800: 3, ±1600:
   5, ±3200: 10, whole page: 15). The full-budget run below is the real
   measure. That is the
   paraphrase wall in its exact shape: *Imperial Russian forces* vs *the
   Russian army* fail the gate before any witness is consulted. Identity
   folding (addendum 6) was refuted at the note-key; this run shows the
   same wall standing one step earlier, at the ask gate. The walk cannot
   corroborate what it will not ask about.

3. **Where the walk DOES ask, the model answers well under either
   protocol** — 7 of ~40 asked pairs attested at zero lies, with the arms
   doing visible work (16 `unarmed` in generate; 13 `indiscriminate` in
   select — the model picking the same sentence for the claim and its
   swapped twin, refused rather than counted).

4. **One attested note is subject-span debris**: `of Moscow —took→ place on
   the outskirts…` — a true statement with a broken end. Corroboration is
   real; the end is P74's lever 3, still upstream and still the biggest.

## What this licenses next

- Loosen the co-presence gate under a control, not by hand: the gate's
  job is to avoid spending asks on pages that cannot state the note. A
  loosened gate (e.g. one shared end-word OR a shared referent face) is
  judged by LP11's rule — on its MARGINAL asks' attest/lie rate, never on
  aggregate — and the planted-fabrication guard is the control.
- Fix the ends before the identity: an attested note with `of Moscow` as
  a subject is corroborating debris.

## Repair the run made to the walk

`corroborateLedger`'s refusal tally had no rows for the select path's own
two typed refusals (`unarmed-select`, `indiscriminate`); the first run
counted 17 of them as `other` — a typed refusal reported as a wildcard.
Tallied by name now. 2 `other` remain in select (foldSelect's own index
refusals), disclosed rather than folded in.

## Full budget (partial — run killed at a 10-minute tool limit, reported as it stood)

`BUDGET=200`, window ±400. Only the GENERATE arm completed before the
harness killed the process; SELECT at ±400 and both arms at the
whole-page window (the 15 marginal pairs) did NOT run and carry no number.

| arm | asks | model calls | wall time | attested | at gate after | lied on planted | refusals |
|---|---|---|---|---|---|---|---|
| GENERATE, ±400 | **119/119 feasible** | 140 | 532s | **13** | 13 | **0** | no-testimony 46 · unarmed 49 · decider_unrelated 10 · uncontained 1 |

So the walk's own stop fired at 119 — every feasible pair asked — and 13
of 119 attested (11%) at zero lies. The remaining 106 are typed refusals,
dominated by `unarmed` (49: the sibling-swap arm said yes to the twin too)
and `no-testimony` (46). That is the paraphrase wall in the WITNESS's own
vocabulary: the pages are co-present on the end-words but the model, asked
under the armed protocol, cannot honestly say the second page states the
note. The SELECT full-budget and whole-page arms are the next run, with a
longer harness budget.
