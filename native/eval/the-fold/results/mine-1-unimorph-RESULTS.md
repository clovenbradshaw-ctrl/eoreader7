# MINE-1 with UniMorph-widened vocabulary — the winner of tonight's bake-off

Run 2026-08-19. `node eval/mine-1-unimorph.mjs` reproduces every number
below. This closes out the comparison `mine-1-next-steps.md` opened:
kind-induction over `live_priors`, tried honestly (see that file's
addendum) and not yet a working answer; a received morphological prior
(UniMorph), tried second, and it is — by a wide margin — the strongest
result of the night.

## The three numbers, side by side

| | headline (bound / all facts) | headline (bound / examined) | no_claims_extracted | essays w/ ≥1 bound |
|---|---:|---:|---:|---:|
| baseline (name-only) | 5.8% | 17.1% | 1,038 (65.9%) | 37/105 |
| + recurring forms | 14.1% | 41.3% | 1,038 (65.9%) | 52/105 |
| **+ UniMorph vocabulary** | **33.7%** | 38.3% | **189 (12.0%)** | **100/105** |

Bound facts: 92 → 222 → **531**. Essays with zero measurable vocabulary at
all: 29/105 → 29/105 → **0/105**. `no_claims_extracted` — the bucket the
recurring-form fix explicitly could NOT touch (`mine-1-forms-RESULTS.md`
named it "the dominant, larger bottleneck") — collapsed from 1,038 to 189.
Zero contradictions across all three runs, on 1,575 facts drawn from their
own essays.

## What changed, mechanically

`hypergraph.js` gained an optional `verbForms` organ (backward compatible
— omitted, behavior is byte-identical to before; all 13 existing tests
pass unchanged): a Set of known verb surface forms from UniMorph's English
paradigm table (github.com/unimorph/eng, Kirov et al. — a received
resource with its own giver, vendored as `eval/fixtures/
unimorph-eng-verb-forms.json`, 103,318 forms). Every word in an essay that
is BOTH a recurring form (the same `FORM_MIN_ARRIVALS`-gated set the
subject-identity fix already computes — one recurrence measure, not two)
AND a known verb form joins the essay's vocabulary directly.

**Why this works where the two anchor-widening attempts in
`mine-1-next-steps.md` failed.** Both rejected attempts (recurring forms,
then determiner phrases) tried to feed a wider candidate set INTO
`discoverRelationVocab`'s own anchoring step, which assumes its anchors are
SPARSE — that assumption is what keeps its candidate nomination clean, and
feeding it dense anchors flooded it with determiners and prepositions
nominated as "verbs." UniMorph sidesteps the anchoring step entirely: it
never nominates a candidate near an anchor, it answers a direct, per-word
question — "is this word ever a verb form" — that needs no textual anchor
at all.

## The honest quality cost — read before trusting the headline number

Twenty `bound` triples were spot-checked by hand across essays, not just
counted. Roughly HALF are clean and correct:

```
Female butterflies —lay→ their eggs on specific host plants
the caterpillar —undergoes→ metamorphosis
Urban legends —serve→ as cautionary tales reflecting society's fears and anxieties
Dinosaurs —fascinate→ us due to their immense size
Dinosaurs —captivate→ us with their diverse range of adaptations
```

The other half have a genuine subject/verb boundary error — usually
because a NOUN immediately after the real verb is ALSO a known UniMorph
verb form (English's deep noun-verb conversion, the same ambiguity that
made a strict "verb-only" filter unworkable when checked: even "feed",
"play", "serve", "gain" are tagged both N and V):

```
The adult —butterfly→ emerges from the chrysalis after metamorphosis is complete
[should read: "The adult butterfly" —emerges→ "from the chrysalis..."]

Dinosaurs roamed the —earth→ millions of years ago
[should read: "Dinosaurs" —roamed→ "the earth millions of years ago"]

Dinosaurs challenge our —understanding→ of the natural world
[should read: "Dinosaurs" —challenge→ "our understanding of the natural world"]
```

**Why this still mostly lands on the RIGHT verdict despite the wrong
boundary, and why that's worth stating plainly rather than treated as a
free pass.** A `bound` verdict requires the SAME subject+verb+object shape
to appear in both the material's own edges and the answer being read —
and since MINE-1's facts are drawn near-verbatim from their own essay, a
systematic mis-parse (e.g., always splitting "Dinosaurs challenge our
understanding" the same wrong way) happens IDENTICALLY on both sides, so
the match is still a genuine textual correspondence, not a hallucinated
one — the reader is finding a real repeated pattern, just describing its
boundary inconsistently. That is a real, load-bearing distinction (no
claim here rests on an invented edge), but it is NOT the same as every
`bound` triple being a clean, human-readable SVO statement, and a reader
consuming the `subject`/`verb`/`object` fields directly (not just the
verdict) should know that roughly half the time, on this material, the
boundary drawn is wrong even when the verdict is right.

## Decision this doesn't make on its own — flagged, not resolved here

`hypergraph.js` is not an eval-only module — it is the SAME organ the live
app uses to ground a fold answer against attached material. This pass adds
`verbForms` as an OPT-IN organ (nothing wires it by default; the app's own
callers are untouched), which is the safe, reversible thing to ship
tonight. Whether the app's real callers should start passing UniMorph by
default is a separate decision this file does not make: the recall gain is
large and real, but so is the boundary-quality cost measured above, and
unlike MINE-1's own facts (drawn from the same essay, so a shared mis-parse
still corresponds to real repeated text), a live chat answer's own wording
will not always mirror the material's wording as closely — the same
boundary error could land a real answer's claim as `bound` on a coincidental
partial match rather than a genuine repeated pattern. Worth testing against
this repo's OWN grounding fixtures (the `wp.txt`/`letters.txt` material in
`hypergraph.test.mjs`, or a live turn) before deciding, not assumed either
way here.

## Numbers this session's own three passes, compared honestly

1. **Priors** (`mine-1-priors-RESULTS.md`) — 0/1,575, wrong corpus, ruled
   out by running it.
2. **Kind-induction over `live_priors`** (`mine-1-next-steps.md`'s
   addendum) — architecturally sound, real clustering structure found, but
   the tried feature set doesn't isolate verb-hood; genuinely unproven,
   more engineering needed.
3. **UniMorph** (this file) — the clear winner: 33.7% headline, essentially
   closes the `no_claims_extracted` bottleneck, at a disclosed, real
   boundary-quality cost on about half of what it recovers.

Nothing here was tuned by checking what value moved this run's own score:
`FORM_MIN_ARRIVALS` is unchanged from the prior pass, the UniMorph lookup
is a flat membership test with no threshold to tune, and the recurrence
gate on `verbForms` admission was decided (for consistency with the
identity fix's own reasoning) BEFORE this run, not adjusted after seeing
the number.
