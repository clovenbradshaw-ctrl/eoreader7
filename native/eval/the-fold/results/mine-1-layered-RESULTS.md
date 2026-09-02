# MINE-1 layered (UniMorph recall minus resolveSpanRole veto) — a net loss, root cause found

Run 2026-08-19. `node eval/mine-1-layered.mjs` reproduces the numbers below.
Tried as a "proper layering" of the night's two strongest sub-assemblies —
UniMorph's recall (L2, 33.7%/38.3%, 0 contradictions but real boundary
errors) and `resolveSpanRole`'s instance-level precision (L3, 22.4%/42.7%,
0 contradictions but heavy recall loss) — on the theory that L3's real
signal isn't "which words are verbs" (too sparse to answer on essay-scale
material, `mine-1-span-role-RESULTS.md`'s own finding) but "which words
this essay's own structure actively argues AGAINST," used as a targeted
veto over L2's permissive default rather than a gate.

## Result: worse than either layer alone on recall, no better than L2 on precision

| | headline (bound/all) | headline (bound/examined) | no_claims_extracted | contradicted |
|---|---:|---:|---:|---:|
| L2 — UniMorph unfiltered | 33.7% | 38.3% | 12.0% | 0 |
| L3 — resolveSpanRole gate | 22.4% | 42.7% | 47.5% | 0 |
| **L2 minus L3 veto (this file)** | **31.1%** | **39.2%** | **20.6%** | **0** |

63/105 essays had at least one word vetoed; 5,034 word-occurrences were
removed from vocabulary across the corpus. Sample vetoes from the
butterfly essay: `have, while, others, mimic, leaves, camouflage, as, it,
reaches, point, stops, eating, and, begins, prepare, ...` — real verbs
("reaches," "stops," "begins," "eating") vetoed alongside genuine function
words, which is the tell that something is wrong with the veto's own
evidence, not just its aggressiveness.

## Root cause, found by inspecting the bindings directly, not assumed

`resolveSpanRole` computes ONE recall pass per SENTENCE and shares it
across every unknown occurrence in that sentence — correct for
`pronouns.js`'s actual question (which single referent does THIS sentence's
pronoun mean — a genuinely sentence-level question) but wrong for word-role
resolution, where several different words in one sentence can have
different true roles. Checked directly: six different words in one
sentence of the butterfly essay ("have," "while," "others," "mimic,"
"leaves," "camouflage") all carry the IDENTICAL margin (0.265) and
activation (12.918) — because they were never scored individually at all;
the sentence's own vocabulary was scored once against prior evidence, and
every ambiguous word in it inherited that one verdict. This is sentence-
topic classification wearing per-occurrence clothes, not the instance-level
resolution the mechanism's own design intends.

This also explains `mine-1-span-role-RESULTS.md`'s "verb: 0 resolved
essay-wide" finding more precisely than "verb evidence is sparse" alone
did: it is not merely that unambiguous-verb sentences are rare — every
ambiguous word in a NON-verb-flavored sentence is dragged to "non-verb"
together, and every ambiguous word in a verb-flavored sentence would be
dragged to "verb" together, but verb-flavored sentences essentially never
win the sentence-level contest against noun-flavored ones on this material
(the same topic-noun-recurrence-vs-scattered-verb-vocabulary imbalance),
so the shared verdict is non-verb almost everywhere a verdict forms at all.

## What a real fix would need, not attempted here

Occurrence-LOCAL cues (a window of tokens around the specific ambiguous
word, or clause-level segmentation) instead of whole-sentence cues shared
across every occurrence in it — a real, scoped change to `roles.js`'s
calling convention (still general, still no verb-specific content in the
organ itself — the caller would supply narrower "sentences," e.g.
per-clause frames, not literally sentence-level ones). Not built tonight;
named as the concrete next step if this line of work continues.

## Where this leaves the 90% target

Not reachable through vocabulary/verb-classification refinement alone,
independent of this specific veto's failure. Two structural floors,
measured earlier this session: `unbound` (facts phrased differently
enough from source text that independent extractions don't converge on
identical triple shape) sits at 35-39% of examined facts in every variant
tried tonight and is untouched by ANY vocabulary change — it is a
paraphrase-tolerance gap, not a discovery gap. And `bound` itself requires
exact structural convergence between two independent extractions, which
even a perfect vocabulary oracle cannot guarantee for genuinely equivalent
but differently-phrased text. The realistic ceiling under this verdict
criterion, estimated earlier and not contradicted by anything measured
tonight, is well under 90% — reaching it would need a different verdict
criterion (semantic entailment) rather than a better vocabulary layer.
