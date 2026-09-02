# Turbulence through the pipeline — measured 2026-09-01

*Driver: `eval/turbulence-pipeline.mjs`, re-runnable, ground truth declared
before the run. Companion to `omnimodal-pipeline-RESULTS.md` (music and
video). The medium is hard in a NEW way: text, music and video arrive as
discrete events already (words, notes, shots). **A turbulent field has no
events until an instrument decides what an event IS** — the discretizer
does not decode pre-existing units, it constitutes them. That makes this
the sharpest test of the shared-instrument law, and it found a real defect
in the kind organ that no earlier medium could expose.*

## Strata

Turbulence has **no S1 at all** — no notation, no score, no captions;
nobody writes turbulence down. Its S2 is the sampled field itself. A
pipeline that works here works with no human-authored layer anywhere in
the stack.

## The declared grammar (fixed before the run)

The **ejection–sweep cycle** of a turbulent boundary layer, in quadrant
analysis of the (u′, v′) fluctuation pair: Q2 = ejection (u′<0, v′>0), Q4
= sweep (u′>0, v′<0), Q1/Q3 the weak interaction quadrants. The generator
plants Q2 → Q4 → Q2 → Q1 bursts on a Kolmogorov-ish background (40 Fourier
modes, amplitude ∝ k^−5/6). Scored claim: a discovered `kind:before=q2`
containing q4 and/or q1 is a hit.

## Result

- **F0, the licensed statistical door** (`measure.js` + the real `nul`,
  declaration through `parseMeasure`, `windowMean/shuffle` — a pair `nul`
  itself licenses; window 8, draws 200, seed 0): **censored above** —
  real temporal structure, confirmed before any kind discovery ran.
- **Both instruments independently discover `kind:before=q2` = {q1, q4}**
  — the planted grammar, taught nothing.
- **Score: 2 matching memberships, 0 spurious**, each corroborated by
  independent RUNS *and* independent INSTRUMENTS.

## Three defects the run found, in the order they bit

**1. The generator was unphysical, and the data said so.** The first
version ADDED a coherent structure to the background as an offset, so an
event's stress magnitude depended on background *phase*: the same planted
ejection read |u′v′| = 0.8 in one place and 7.3 in another, and the hole
filter deleted half the grammar. Found by printing one burst's quadrants
and stresses side by side — not reasoned about. A real coherent structure
ORGANIZES the local flow (damps the background, imposes its own motion),
which is what the shipped generator does.

**2. A grammar can be invisible to a legitimate instrument.** The first
declared grammar was about Q1/Q3 interaction events, which are physically
WEAK — weaker than the background. The hole filter correctly deletes
them, so that grammar is unmeasurable through that instrument, and no
threshold nudge fixes it honestly. The grammar was moved to the strong
pair the literature actually names (ejection→sweep). **An instrument's
scope is a fact about the instrument, not a failure of the material.**

**3. THE ONE THAT MATTERS — the share floor was UNLICENSED on a small
alphabet, and the II.23 control caught it.** With four symbols and q2 at
~50% marginal frequency, "has a dominant predecessor" is achievable BY
CHANCE: the within-phrase shuffle control SURVIVED, meaning the statistic
did not resolve the claim. Text, music and video never exposed this —
their alphabets are large and no symbol dominates. The fix is the control
promoted to a null: `discoverCompanyKinds` gained an optional, fully
declared `nullArm: {draws, seed, alpha}` that redraws shares under the
same within-phrase shuffle (marginals kept exactly, company destroyed) and
admits a kind only when its observed share beats the (1−alpha) quantile.
With it, **the control dissolves and the real kind survives**. Optional so
no existing caller moves; a caller that omits it owes its own control,
which every current caller already runs.

## What this says about the pipeline

The organs are medium-blind in fact, now across four media — but each new
medium has found exactly one thing the previous ones could not:

| medium | what it exposed |
|---|---|
| text | (the baseline) |
| music | a text prior hiding in the organ (token cleaner ate "d5") |
| music | the shared-instrument limit (two sources, one decoder = one reading) |
| video | (confirmed both, no new defect) |
| turbulence | the share floor is unlicensed on a small alphabet — the null arm |

**A medium that finds nothing new is the first real evidence of
generality; four media in, we are not there yet.**
