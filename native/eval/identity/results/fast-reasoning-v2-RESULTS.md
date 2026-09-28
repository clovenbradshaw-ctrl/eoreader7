# The ladder as a reasoner, v2 — registered run, 2026-09-28

Driver at 43781a7 (P1–P9 in its header); same model, key, retrieval as v1.
255 model calls, 774 s model time, 803 s wall. Two changes from v1: the
control rebuilt (sentences' TEXT, re-paragraphed six to a paragraph), and
the judge's ask numbering the section's sentences so a one-word judge can
point (`organs/judgment-reader.js::pointedDecider`).

| | prediction | result |
|---|---|---|
| P1–P3 | ON fewer calls than OFF; ON's correct ≥ OFF's; zero fabrications | **held** — 30 vs 34; 4 vs 0; 0 and 0 (the mechanical rung's four, v1's same four) |
| P4 | rebuilt control: the mechanical rung binds fewer true claims on the shuffled book | **held** — 4 real vs 1 shuffled, with every control claim now retrieving passages (34/34). The one shuffled bind is honest: a shuffle keeps each SENTENCE whole, and a claim the reader binds inside one sentence survives it. |
| P5, P7 | habits reduce judge calls; injected negations concede | **failed / vacuous** — no habit learned (below) |
| P8 | shipped prompt best | **vacuous** — all three arms `none` on 34/34 |
| P9 | the judge lands ≥ 1 chosen | **failed** — 0 of 30 |

## What the run found

**The example number was copied.** The ask said "names the number of the
sentence that decides the claim, like [3]" — and the 0.5B judge answered
`3` on every claim (probe: prose was literally "3"), then stopped, no
verdict word. Pointed index 3 carried the claim's words on none of them,
so every judgment read `none`: the reader again refused correctly, and
again nothing landed. Two lessons for a prompt to a very small model,
both Gary's business: a concrete number in an instruction is an answer
the model will give back (P53 measured that worked examples HELP a 0.5B —
they help by being copied, which is the same fact), and one answer cannot
carry two parts.

**A two-ask probe shows the model CAN point, asked for only that.** On the
same claims: "which sentence speaks to the claim?" → `[19]`, the right
sentence, for both Mina (true) and Harker (false); then "does this one
sentence settle the claim?" over the pointed sentence alone → `holds` for
Mina, `refused` for Harker — a correct refusal of a false claim, from the
pointed bytes. On Carfax it pointed wrong (`[3]`, the right one was 4),
which the company wall would hold as contested. So v3's judge is the
select protocol split in two: POINT (a number, no example), then the WORD
over the pointed sentence only. Two calls per judged claim, declared.

Everything else stands: the mechanical rung's 4/34 at zero cost and zero
error; 22 claims the extractor reads no relation from (copula + adjective
or number complements); the wall refusing every unanchored verdict.
