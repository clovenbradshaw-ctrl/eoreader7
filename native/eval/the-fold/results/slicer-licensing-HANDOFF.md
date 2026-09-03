# Handoff: take the slicer licensing measurement (2026-09-03)

Paste the block below into a fresh local session. Everything it needs is on
`claude/latest-music-additions-t2s2nt` in both repos.

---

Two sibling repos, `eoreader7` (engine) and `the-fold` (surface). Read
`eoreader7/native/eval/the-fold/results/slicer-licensing-RESULTS.md` first,
then `the-fold/POLICIES.md` P85 and `eoreader7/native/READING-SPEC.md` S47.
The driver, the seam and the tests are landed and green. **The measurement
was never taken** — two passes were launched on a CPU-only box and neither
finished. Take it.

**The question.** 162 notes on the Apollo 11 backwards walk are
object-missing partials: the article states a proposition, the cited source
is readable and genuinely states it, and the source says it in other words.
Every mechanical instrument measured at parity with its own control on them.
`statingCandidates`' gate requires BOTH ends to fire literally, so the armed
select protocol has never once run on this class. Does a better choice of
WHERE to look let the witness cross paraphrase, and has any learned
component earned its slot by P85's five conditions?

**Before running anything, do the thing the last pass failed to do: declare
the budget and justify each arm against what it can move.** The last pass
queued 2,592 model calls without that argument. The minimum design that
answers the licensing question is the `random` confound control plus ONE
candidate slicer over a declared sample of notes. Add arms only with a
reason. Write the budget and the reason into the results doc before the
first call, not after.

**Run it.**

    cd eoreader7/native/eval/the-fold
    # needs: ollama with gemma2:2b; the-fold/node_modules for the embedder
    # (@huggingface/transformers, already a declared dependency there);
    # NODE_USE_ENV_PROXY=1 if egress is proxied
    NODE_USE_ENV_PROXY=1 SLICERS=random,activation N=60 node ranke-slicers.mjs

Each arm checkpoints to `results/ranke-slicers.json` as it lands and a
re-run skips what is there. `results/slicer-analyze.mjs` prints the license
table and cross-arm overlap. Env: `N` notes, `K` candidates, `SLICERS`,
`SEED`, `OUT`, `FRESH=1`, `FROM` for another page's walk.

**On a GPU, three things become affordable that were not.** In order of
value: (1) the rotated-end2 control is currently ONE draw, and this project's
own P66 rule is that a null drawn once is a null drawn zero times — run 20
to 50 seeded rotations and report a band, which turns "the arm separated
from its control" into "the arm sits outside its control's spread"; (2)
witness size is presently confounded with hardware, so "paraphrase is not
crossable" and "paraphrase is not crossable by a 2B model" are the same
measurement — run the identical protocol at 7B and 14B; (3) the population
can be all 226 partials across several pages rather than one page's 162.
None of this buys corroboration: calls through one model are one instrument.

**Report honestly.** An arm that lands rotated claims as often as real ones
is REFUSED, and say so. If every arm sits at parity, the finding is that
paraphrase is a reading problem rather than a slicing problem, and the next
move is the ledger-side hypothesis in P84's own next-step note, not a sixth
slicer. A negative result here is worth as much as a positive one and must
be written up the same way.

**Two operational traps this pass hit.** A `pgrep -f '<script>.mjs'` waiter
matches its own command line and can never fire — watch a PID. A pipe
ending in `tail` shows nothing until the process exits, so an empty log is
not evidence of a slow run.
