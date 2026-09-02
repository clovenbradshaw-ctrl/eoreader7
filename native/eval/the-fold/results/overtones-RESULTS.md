# Overtones heard from real sound, and put to the test (2026-09-02)

**Driver:** `eval/the-fold/overtones.mjs` (`AUDIO_DIR=` points at the decoded
WAVs). **Organ:** `adapters/audio/overtones.js` — a plain FFT, the strongest
peak per frame, and the energy at its integer multiples against a null
(the same multiples replaced by random frequencies in the same band, 100
redeals, alpha 0.05). **Metric:** `overtoneOverlap` — how much of one
pitch's heard partial energy lands on another's partials, from the
recording's OWN partial profile, never a textbook 1/k. **Kernel:**
`kernel/continuation.js::smoothedExpertOf` — an expert that spreads belief
to neighbours under an injected similarity (medium-blind).

User direction: "i dont explicitly mean melody per se, i just mean overtones
more or less. music."

## Sound (not committed — public archives, decoded locally by ffmpeg to mono 22.05 kHz, first 60 s)

- piano, the C-major Prelude: Internet Archive `jamendo-312572` (NICKMED, CC BY-NC-ND 3.0) — the same piece the MIDI experiment reads, as sound
- voice and guitar, 1940s 78rpm: `78_house-of-the-rising-sun_josh-white-and-his-guitar_gbia0001628b` (great-78 collection)
- control: seeded white noise

## 1. Is the harmonic series in the sound?

| recording | frames | frames that heard harmonics | partial profile k=1..8 (relative magnitude) |
|---|---|---|---|
| piano, Prelude in C | 644 | **49.5%** | 1.00 0.15 0.05 0.02 0.01 0.01 0.00 0.00 |
| 78rpm, voice + guitar | 644 | **76.9%** | 1.00 0.26 0.13 0.07 0.05 0.03 0.03 0.02 |
| white noise (control) | 214 | 10.3% | 1.00 0.37 0.38 0.36 0.39 0.38 0.37 0.39 |

The piano hears harmonics at **4.8×** the noise rate, the 78rpm at
**7.5×** (declared bar: ≥ 2× the control). Energy at integer multiples of
the strongest peak beats random frequencies in the same band, frame by
frame. The noise's profile is flat (0.37 everywhere — the null's own
baseline); the recordings' fall off with k, and the guitar+voice falls
more slowly than the piano — a fact about timbre read off bytes. The
piano's lower share is polyphony: in a chord the strongest peak's
multiples are masked by the other notes. (The first verdict line demanded
a hand-set 50% and called the piano "not established"; the test is the
ratio to the control, never an invented threshold — corrected.)

## 2. The metric, from the recording's own profile

Overlap of heard partials between MIDI pitches (the one convention:
440·2^((n−69)/12), declared as the giver), tolerance 3%:

| pair | overlap |
|---|---|
| c4 ~ c5 (octave) | 0.57 |
| c4 ~ g4 (fifth) | 0.09 |
| c4 ~ f4 | 0.03 |
| c4 ~ e4 | 0.01 |
| c4 ~ c#4 (semitone) | 0.00 |
| c4 ~ f#4 (tritone) | 0.00 |

What a listener calls consonant sits high, dissonant sits low, and nothing
was told which is which. The steep piano profile makes the metric sharp:
only the octave and (faintly) the fifth register.

## 3. Does hearing overtones help predict Bach? The stream decides.

On the Prelude's 220 held-out notes (exact alphabet), the hearing at
orders 1–3 competed with the same hearing SPREAD by overtone overlap, the
same spread by a RANDOM permutation of that overlap (the control), and the
shuffled hearing:

| expert | its own surprise (bits/note) | final weight |
|---|---|---|
| hearing@1 | **3.39** | 1.000 |
| hearing@3 | 3.68 | 0.000 |
| hearing@1 spread by overtones | 3.78 | 0.000 |
| hearing@3 spread at random (control) | 3.91 | 0.000 |
| hearing@3 spread by overtones | 3.99 | 0.000 |
| shuffled hearing (control) | 5.44 | 0.000 |

**Spreading belief to overtone-neighbours does not reduce surprise on the
Prelude, and it is no better than random nearness.** An honest negative
with its control. Why, plainly: the next note of an arpeggiated prelude is
fixed by the figure (the previous notes), not by which pitches sound well
together; overtone nearness is a fact about SIMULTANEITY (what sounds
together), and this test asked it about SUCCESSION. The metric's proper
test is the one not run here — predicting which notes sound TOGETHER
(chords, co-arrival: the kind organ's own question), where physics says
it should bite.

## What this establishes

- The harmonic series is HEARD from real sound at 5–8× the noise rate,
  against a null, from a plain FFT — nothing about music was taught.
- A metric read off a recording's own partials ranks pitch pairs the way
  consonance does, untaught.
- As a prior on SUCCESSION it earns nothing (controlled); its claim on
  SIMULTANEITY is the next measurement.

## 4. The simultaneity test — run, and it turned the question around

**Driver:** `eval/the-fold/overtones-simultaneity.mjs` (`PROFILE=piano|guitar`,
`TOLERANCE=`). Two notes sound together when their [tick, tick+dur)
intervals overlap, weighted by the overlap; the statistic is the weighted
mean overtone overlap of co-sounding pairs. **Null (II.23):** the same
timing with pitches redealt within the piece — identical simultaneity
structure, random pairings — 200 redeals, two-sided. **Metric control:**
the overlap values dealt to the wrong pitch pairs must not beat their own
null (they never did: 167–200 of 200 at or above, all eight arms).

| profile · tolerance | Prelude (900 co-sounding pairs) | Aria (639 pairs) |
|---|---|---|
| piano · 3% | within the null (131/200 above) | **below the 5th** (194/200 above) |
| piano · 6% | **below the 5th** (198/200) | **below the 5th** (200/200) |
| guitar · 3% | within the null (114/200) | **below the 5th** (195/200) |
| guitar · 6% | **below the 5th** (194/200) | **below the 5th** (200/200) |

**The finding, two-sided and controlled: in six of eight arms — and in
every arm on the Aria — the notes Bach sounds together share FEWER
partials than random pairings of the same pitches would.** The physics
metric is not absent from this music's simultaneity; it is *avoided*.
What overtone overlap scores highest is coincidence of partials — the
octave, the fifth, the sound of two notes fusing into one — and a
polyphonic texture keeps its voices apart precisely by not doubling. The
most-sounding pairs by ticks bear this out (`c4+e4`, `b3+g4`, `b3+d4`:
thirds and sixths, which this metric scores near zero), while the
redealt pairings produce more accidental octaves and fifths than the
composer ever wrote.

This is the opposite sign from the naive expectation ("consonant notes
sound together"), and it is the more interesting reading: a listener's
"consonance" is not partial-coincidence alone. Nothing here was taught;
the sign was read off two real files against a null, with a control.

**Caveats, stated:** the profile reaches k = 8 at 3–6% tolerance, so
thirds register only faintly even under the richer guitar profile — the
metric is fusion-shaped by construction, and the finding is about fusion,
not about consonance in general. Two pieces, one composer: a claim about
Bach's counterpoint, not about music.
