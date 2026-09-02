# Music and video through the pipeline — measured 2026-09-01

*Driver: `eval/omnimodal-pipeline.mjs` (re-runnable; fixtures synthesized
in-run from declared grammars, so ground truth is by construction and the
whole thing reproduces from the repos plus a local ffmpeg). The claim
under test is NOT that the adapters are good instruments — they are the
crudest honest ones — but that the pipeline's organs are medium-blind in
fact: the SAME `discoverCompanyKinds` / `frameWords` / `kindNotes` /
`hear` / `foldHyperlexicon` / `distinctSources` code, unmodified, over
event streams decoded from REAL media bytes.*

## What ran

**Music** (S2-NATIVE — audio has no script stratum; a score would be its
S1, and this pipeline never sees one). Two real RIFF/WAVE files
synthesized as two performances of one declared piece (different tempo
and loudness — genuinely different byte streams stating one structure):
theme notes phrase-initial, ornaments d5/f5 always preceded by the drone
a3. Decoded by `measure.js`'s own `wavSamples` (the existing organ) plus
an autocorrelation pitch tracker written in the driver. Discovered,
taught nothing: **`kind:before=a3`** — the ornament kind, named by its
own signature, exactly the declared grammar. II.23 shuffle control
dissolves it. Both performances land their kinds through the real
hyperlexicon door; `d5|keeps-company|kind:before=a3` folds to ONE note
with TWO distinct sources.

**Video.** Two real H.264 MP4s (local ffmpeg) as two cuts of one film at
different frame rates and sizes: scene shots sequence-initial, insert
shots always preceded by a near-black SLATE. Frames decoded to rawvideo,
mean-color-snapped to shot tokens. Discovered: **`kind:before=slate` =
yellow, cyan** — the frame-shot kind. Shuffle control dissolves it. Two
cuts corroborate: `cyan|keeps-company|kind:before=slate`, 2 distinct
sources. One ledger holds the music and video notes side by side —
media never mixed, addresses shared.

## Three findings, each paid for by a failure in the run

1. **The one text prior hiding in the organ, found by music.** `d5`
   discovered nothing on the first run: `contextVectors`' default token
   cleaner strips non-letter edges, so "d5" silently became "d" and no
   vocabulary word ever matched. The fix made the cleaner INJECTABLE
   (`discoverCompanyKinds` forwards `clean`), not wider — text callers
   keep their hygiene, music declares identity. The organ was
   medium-blind by assertion and is now medium-blind by measurement.

2. **A noisy stream refuses honestly.** The first pitch tracker
   (zero-crossing) misread attack/decay transients at the faster tempo;
   the kinds CORRECTLY refused to form on the noisy stream rather than
   discovering garbage. Autocorrelation (amplitude-immune) fixed the
   instrument, not the organ.

3. **THE SHARED-INSTRUMENT LIMIT, demonstrated live — keep this one.**
   The final decode still inserts a spurious `a3` at the f5→g4
   transition, IDENTICALLY in both performances (same tracker), so `g4`
   lands in the a3-kind — a false membership per the declared grammar —
   with "2 distinct sources." This is MINE-1's own lesson ("a systematic
   mis-parse lands identically on both sides") surfacing in audio: two
   witnesses that share one decoder are not two perspectives.
   `distinctSources` bounds SOURCE variance only, never instrument
   error; the field that must carry the difference is P68's recipe
   identity — witnesses whose recipes share a decoder should not count
   as independent for instrument-sensitive claims. Deliberately left in
   the output rather than patched away: it is the measured argument for
   wiring recipeId into the witness string, which is real, named,
   unbuilt work.

## Strata, generalized per medium (LEVELS.md companion)

S1/S2 are not text-specific: each medium has its own "script" (the
notation someone wrote — a score, captions, chyrons) and its own native
stream (audio, frames). Music through this pipeline is the heard rule
satisfied by construction — there was never anything to read.
