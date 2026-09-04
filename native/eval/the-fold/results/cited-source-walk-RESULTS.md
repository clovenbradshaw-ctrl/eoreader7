# The walk, run on a corpus that CAN corroborate: 0.033 — identical, and both votes fail inspection (2026-09-04)

`node native/eval/the-fold/cited-source-walk.mjs`. **gemma2:2b, 71 model
calls, 288s.** The budget and the bar were declared in the driver's header
before the first call.

## Why this run existed

Every clean-votes-per-ask figure this project has published was measured on
material that could not corroborate — a novel that restates nothing (0.017),
and two encyclopedia pages one of which copies the other verbatim (0.033) —
and the denominator was corrected three separate times. The standing
hypothesis was therefore: **the corpus, not the mechanism, is the binding
constraint.**

`cited-source-independence-RESULTS.md` found and verified a corpus that
survives the independence question: an article measured against the sources it
**cites**, 89 independent texts among 106 faces, real collapse outside every
one of 40 redeals. The walk had never been run on it. This is that run.

## The declared bar, and the result against it

> *What moves the standing: clean votes per ask **above 0.033** — the best
> number from a corpus that could not corroborate — with 0 lies. At or below
> it, the corpus was never the binding constraint and the memory floor's
> design is what gets re-examined.*

| corpus | independent? | asks | attested | **clean votes / ask** | lies |
|---|---|---|---|---|---|
| a novel, six chapter-parts | no | 60 | 1 | 0.017 | 0 |
| two encyclopedia pages | **no** (one copies the other) | 30 | 1 | 0.033 | 0 |
| **16 cited sources, 6 hosts** | **yes** | 60 | 2 | **0.033** | 0 |

**Identical. The hypothesis is refused by its own bar.** Given sixteen
genuinely independent publishers writing about one mission — NASA, the
Smithsonian, arXiv, NTRS, the JSC curator, and the Internet Archive's copies
of others — the rate does not move.

**And the ledger began at zero.** 919 notes read from sixteen independent
sources, **0** standing at two distinct sources before the walk. Mechanical
identity found no cross-source agreement at all, on material chosen for its
independence.

## Both attested votes fail inspection

The precision guard passed — 0 of 4 planted fabrications attested — but the
guard only tests fabrications. It does not test whether a *true-ish* note was
attested on a decider that does not state it. Read them:

**1.** `the lunar module —was→ on the lunar surface`
decider: *"The camera was mounted behind the right forward window of the lunar
module and was used to film the final phase of the descent to the lunar
surface"*
→ names both ends and states **neither the claim nor anything like it**. It is
about a camera mount. Topic adjacency, not entailment.

**2.** `Armstrong and Aldrin —returned→ to the CSM with Collins`
decider: *"The prime crew for the mission; astronauts Neil Armstrong, Michael
Collins, and Edwin Aldrin; on the way to the launch pad in their transfer
van"*
→ a photo caption about travelling **to the launch pad before launch**. It
cannot state a return to the CSM after a lunar landing. **This is a false
attestation.**

So the honest reading of this run is **2 attested, 0 clean.** The rate that
survives inspection is **0.000**, and the 0.033 above is the instrument's
number, not the material's.

The per-end company wall (P31, aimed at the decider) passed both, because both
deciders genuinely carry both ends' features. Byte containment is not
entailment, and per-end company is not either — that limit has now been
measured three times, on three corpora, and it produced a live false
attestation here rather than a marginal one.

## Where the asks went

| | |
|---|---|
| asks spent | 60 of 60 |
| `no-testimony` | **56** |
| `uncontained` | 1 |
| `decider_unrelated` | 1 |
| attested | 2 |
| **skipped without an ask (`no-copresence`)** | **6,483** |

The prefilter refused 6,483 note–source pairs for free — the ends never
co-occur anywhere in the other source, so no stating sentence could exist. The
witness saw only the 60 pairs where one could.

## What this settles

1. **The corpus was not the binding constraint.** This was the last live
   explanation for the ~2% wall that did not implicate the mechanism, and it
   is now refused on material built specifically to test it.
2. **`NEXT-PASSES`' own rule now applies**, quoted in the declaration above:
   at or below 0.033, the memory floor's DESIGN is what gets re-examined,
   not tuned. That call is now due.
3. **The decider gap is the live defect**, not a disclosed residue. It
   produced a false attestation on a real note, and no existing wall catches
   it: containment checks bytes, company checks features, and a launch-pad
   caption passes both while stating the opposite of the claim.

## Said against it

- One arm (select), one budget, one model, one mission's citation set.
- 16 of 89 available independent texts, chosen by note count, not sampled.
- The two failing votes are my reading of the deciders, not a labelled set;
  anyone can re-read them above and disagree.
- `sharedTextGroups` is absent from `organs/index.js`'s export list and was
  imported from its own module here.

## Files
`cited-source-walk.mjs`, `results/cited-source-walk.json`.
