# N-ary autonomy vs. the synthesis funnel — falsification, 3 live runs

Real `gemma2:2b`, real Ollama, real starting defects (round 4's ledger fold:
a broken 3-way ethos ternary and a download link instead of `<audio>`), 3
independent repetitions at temperature 0.3.

**What is actually under test here, stated precisely so it isn't confused
with the earlier attempts:** both arms are grounded (every writer, in both
arms, holds the same real UDHR/Quran/Pali-Canon stance). The ONLY variable
that differs between arms is whether the fix for two orthogonal, disjoint
features (audio playback; the ethos badge) is produced by ONE writer
seeing the whole file, or by TWO writers, each seeing ONLY its own isolated
snippet and nothing else — assembled by a deterministic string splice, with
ZERO further model calls. This isolates "n-ary, structurally autonomous"
from "grounded" — the two were conflated in both prior attempts.

## Results, per run

| run | audio wired (A / B) | ethos correct (A / B) | A wall-clock | B wall-clock |
|---|---|---|---|---|
| 1 | false / **true** | false / **true** | 80.5s | 12.3s |
| 2 | false / **true** | false / **true** | 51.1s | 6.3s |
| 3 | false / **true** | true / true (tied) | 50.3s | 8.0s |

**Audio: B wins 3/3, A wins 0/3, no ties.** The single whole-file writer
never once produced a working `<audio>` element across three independent
attempts, despite being told plainly, in its own grounded stance, that the
download link is the exact failure to fix. The isolated writer, seeing only
a 118-character fragment with one job, got it right every time.

**Ethos: B wins 2/3, ties 1/3, A wins 0/3.** The isolated writer never got
this wrong. The whole-file writer got it right once (run 3) and wrong twice.

**Structural integrity: tied every run.** Neither arm ever broke the basic
`/api/subscribe`/`fetch`/doctype contract — the splice in Arm B never
produced a malformed file across 3 runs, which is itself a real, disclosed
risk of this design that did not materialize here but is not guaranteed to
generalize.

**Speed: B was 4–8x faster wall-clock every single run**, not because of
model efficiency but structurally: two short, isolated prompts dispatched
concurrently, with no third "synthesis" call reading and re-generating the
whole file. This is the same real property `podcast-app-council.mjs`
already argued for on the READ side; this experiment shows it holds on the
WRITE side too, once the funnel is actually removed rather than merely
disclosed as a bottleneck.

## Why, mechanically — not just that, but why

The whole-file writer has to hold BOTH fixes in its head while re-generating
every line of a file it didn't write. Every one of its 3 failures on audio
is the same class of failure this session already found live at round 4:
fixing one named problem while silently reintroducing or leaving broken the
other, because the model's attention while regenerating ~2000 characters is
not evenly or reliably distributed across two unrelated concerns named in
one prompt.

The isolated writer literally cannot make that mistake with respect to the
OTHER feature — not because it was told not to, but because the other
feature's code was never in its context at all. Autonomy here isn't a
courtesy; it's a structural guarantee that one feature's fix cannot
interfere with another's, which is exactly what "I-orthogonal: no two
enzymes bind the same feature" was arguing for on paper before anything
measured it.

## Honest limits, not glossed over

- **n=3, one model (gemma2:2b), one task, one pair of pre-existing defects.**
  This is a real, live falsification attempt that survived — it is not yet
  a general law. A different model, a genuinely entangled pair of features
  (where the "orthogonal" split is itself wrong), or a task needing
  cross-feature coordination could all defeat this design differently.
- **The two features chosen here are genuinely disjoint in the underlying
  file** (different `<li>` sub-expressions, no shared variable, no shared
  control flow). The experiment does not test what happens when the
  orthogonal-binding assumption is wrong — that is a real, named, unbuilt
  next control (deliberately entangle two "features" and confirm the
  isolated-writer design correctly fails or degrades, rather than silently
  producing a broken splice it reports as clean).
- **Grounding's own separate contribution is NOT isolated by this run**
  (both arms are grounded) — that was `podcast-grounded-writer-falsify.mjs`'s
  question, run and reported separately, with its own script left on the
  record even though superseded in framing.
- This is still a two-writer case, not truly "n-ary" at scale (n=4, n=8).
  Whether the same win holds as the number of orthogonal writers grows, and
  where the splice-assembly approach itself starts to strain (features that
  are disjoint in text but not disjoint in behavior), is unmeasured.

Full raw output for each run: `podcast-nary-autonomy-falsify-result-run{1,2,3}.json`.
