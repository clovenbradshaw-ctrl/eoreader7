# The permutation-null criterion — what it fixed, and the ceiling it exposed

Run 2026-08-29. Organ: `eoreader7/native/kernel/contest.js::nullAdjudicate`,
wired into `resolvePronouns` behind a declared `nullTest: {draws, seed,
alpha}`; absent, shipped behaviour is byte-identical. Tests 27/27
(`contest.test.js` 18, `pronouns.test.js` 9 unchanged). Driver:
`eval/null-criterion.mjs` — five live_priors materials, real vs shuffled,
both criteria, same denominator. Cost cap disclosed: novels read at their
leading 2,000 frames; draws 49, alpha 0.05, seed 20260829, all declared.

## Why the constant bar had to go (measured, again, with power)

Constant-margin lift (real binding rate / shuffled binding rate):
Frankenstein 1.31x, Pride 1.03x, Aristotle 1.17x, Cold War 1.00x, Borodino
0.00x (bound only on the shuffled text). A criterion that scrambled
material clears about as often as coherent material is measuring field
sparsity, not evidence. Confirmed at 453/347 and 186/180 bindings — not a
small-sample artifact.

## What the null criterion fixed

| material | constant lift | null lift | null binds (real/shuf) |
|---|---|---|---|
| Frankenstein | 1.31x | 1.24x | 51 / 41 |
| Pride | 1.03x | **0.56x** | 5 / 9 |
| Aristotle | 1.17x | **∞** | 3 / 0 |
| Cold War | 1.00x | 0/0 | 0 / 0 |
| Borodino | **0.00x** (shuffled-only bind) | 0/0 | 0 / 0 |

Fixed: **the criterion no longer rewards incoherence.** Borodino's
constant-bar pathology — binding on the scrambled text and not the real one
— is gone; the encyclopedic zeros are now honest zeros; Aristotle separates
cleanly (3 real, 0 shuffled). A one-member world and a lonely sparse-field
winner are refused with p = 1 — the exact cases the constant bar bound at
margin 1.0 (both are unit tests now). The trio-vs-ensemble pair shows the
statistic doing what no constant can: surprise depends on how many ways the
world could have been.

## What it did not fix — the honest ceiling

Novel lift did not rise (1.31→1.24; Pride 1.03→**0.56**), and the surviving
Frankenstein bindings include visible errors ("his" → `america`, "he" → a
female referent with no gender evidence, one rare uncle triple-counted).
The passers are rare-referent self-echo — a member mentioned twice owning
its own two frames — which clears a permutation null without being
comprehension.

So the bottleneck is not the criterion. It is the SIGNAL: one-hop lexical
recall at sentence grain carries too little identity information for any
verdict rule over it to turn into reading. This is the third independent
measurement to land on that line — eoreader5's dead-ends log recorded
distributional coref failing twice, and `surfaces.js` fenced pronoun
binding as MODEL tier ("not retried here") on that evidence. The tier line
is confirmed, not challenged.

## Disposition

- LAND `nullAdjudicate` + tests. It is the null-safe verdict layer any
  future signal will need, it is medium-general (ensemble/trio cases run on
  bars of music), and it converts false confidence into typed refusal today.
- KEEP the shipped default (`nullTest` absent). Do not claim reading.
- The next fix is signal-tier and the policy already names its two legal
  doors: a per-text coref prior (P3.2), or a new engine-tier evidence
  channel that has to survive exactly this eval before it earns a cell.

## Reproduction note (added on landing, 2026-08-29)

The driver was rewired from the originating session's absolute paths to the
repos themselves before it was committed: the organs come from
`../../eoreader7/native/adapters/text/`, and four of the five materials from
the sibling `live_priors` checkout at its own paths — the same four files the
run read.

Re-run that way, **the four live_priors rows reproduce exactly**: 453/347 and
186/180 under the constant bar, 51/41, 5/9, 3/0 and 0/0 under the null, every
lift to the digit, and the same three visible errors named above ("his" →
`america`, "he" → `margaret` with no gender evidence, `uncle_thomas`
triple-counted).

**The Borodino row does not, and the reason is material, not criterion.** That
run read a plain-text extract from a session's `/tmp` that no longer exists.
The only Borodino this repo commits is the raw article HTML
(`eval/fixtures/wikipedia-battle-of-borodino.html`), read here through
`web.js::extractReadable` — the same extractor `mhc-battery.mjs` already uses
for it. That extraction carries the page's navigation, category and reference
chrome as well as its body: 1,493 frames against the run's 305. Under it,
Borodino adjudicates 5 frames rather than 6 and binds nothing under either
criterion, so the row reads `0/0` both ways and the specific constant-bar
pathology it was cited for — binding on the scrambled text and not the real
one — is not visible on this material. The row above stands as the record of
what was measured; it is not reproducible from this repo alone, and that is
stated here rather than left for a reader to discover.

Nothing in the disposition moves. The four reproducing materials carry the
finding on their own, and `nullTest` remains absent by default either way.
