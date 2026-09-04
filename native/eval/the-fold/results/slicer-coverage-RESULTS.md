# The zero-call pass, run before the budget was spent (2026-09-02)

**Driver:** `eval/the-fold/slicer-coverage.mjs`. **Subject:** the same 162
object-missing `partial` notes. **Model calls: 0.** **Wall time: 6 seconds.**

## Why this runs first

Every model call in `ranke-slicers.mjs` asks a witness to POINT at which of
K candidate sentences states the proposition. That call can only succeed if
the slicer's top-K *contains* such a sentence, and whether it does is a
property of the ranking alone. So the arms can be examined without a
witness, and P85's own rule says they must be: a call that cannot move a
standing is waste regardless of price.

**Declared budget for this pass: 0 model calls.** It reads the same pool
through the same rankings — `ranke-slicers.mjs` now exports `poolOf`,
`candidatesFor` and the row sets, and guards its own run behind
`import.meta.main`, so this measures the instrument and not a copy of it.
The driver's own output is unchanged: re-running `N=2 SLICERS=random` gives
the identical table it gave before the refactor.

## Two findings, both of which change the design

### 1. `stating` is NOT structurally inert on this class — the premise was pinned on a fixture, not on the population

`slicer-licensing-RESULTS.md` states that `statingCandidates`' both-ends
gate can never fire here — "on an object-missing partial end2 never fires,
by definition of the class", so "the armed select protocol… has never once
run on this material". The supporting test is real and still passes:
`statingCandidates` returns zero on a synthetic paraphrase fixture.

On the real 162 it fires on **64**, a median of 2 candidates each. The class
label `missingSide: "object"` was assigned by the backwards walk's matcher;
`statingCandidates` applies a different, looser content-word gate, and the
two disagree on 40% of the population. Example, host `collectspace.com`:

    note   A special display of Armstrong's suit —was→ unveiled for the
           50th anniversary of Apollo 11 in July 2019
    cand   "We will have Neil Armstrong's spacesuit opening [on display…

The fixture test pinned a fixture. The generalisation from it to the
population was never measured, and is wrong.

### 2. `activation`'s II.23 control is not a control — it is structurally incapable of differing

`rankActivation(face, ends)` reads `ends.end1` only:

    const f1 = featWords(ends.end1);          // end2 is never consulted

The II.23 control rotates **end2**. So the control cannot change what this
arm ranks, and the measurement confirms it exactly: the rotated top-K is
**identical on 69 of 69** notes where the arm offered anything (mean Jaccard
1.00). Any separation the activation arm showed against its control would
have been witness sampling noise across two identical candidate sets, and
any control landing was guaranteed the same eight sentences as the real one.

L3 — "it beats a control built to fail" — could not have been evaluated for
this arm as constructed, in either direction. The n=2 synthetic run that
"validated the mechanism" did not catch this because it did not compare the
control's candidates to the real ones.

The other arms do move under the control: `random` 0.04 mean (identical on
1/162), `containment` 0.32 (8/152), `stating` 0.39 (6/22).

## The rest of the table

**Silence** — how often an arm hands the witness nothing at all, and what
the arm would actually cost at 2 calls per offered note per side:

| arm | silent | offered | median K | calls |
|---|---|---|---|---|
| `stating` | 98 | 64 | 2 | 212 |
| `random` | 0 | 162 | 8 | 648 |
| `containment` | 6 | 156 | 8 | 622 |
| `activation` | 93 | 69 | 8 | 276 |
| | | | **total** | **1758** |

The 2,592 figure priced arms as if they always offer. They do not: `stating`
and `activation` are silent on well over half the population.

**Distinctness** — mean Jaccard between arms' top-K, real side. Every pair
is low (0.01 to 0.23), so no arm is a duplicate of another and none is
removable on redundancy grounds. This is the one part of the design the pass
vindicates as built.

**Embedder:** not run here (`EMB=0`). Typed absence under L5, not a no-op arm.

## What this does not settle

Coverage in the sense that matters — does an arm's top-K contain a sentence
that *actually states the proposition* — still needs labels, and these 162
are object-missing partials precisely because no mechanical organ picks that
sentence out. That is the next cost, and it is one-time and reusable across
every future slicer, against a per-run cost that nothing reuses.

## Consequence for the re-run

Do not spend the licensing budget on the design as it stands. `activation`
needs a control that rotates something it reads, or it needs to consult
end2; until then its L3 line is unmeasurable. And `stating` must be
reported as a live arm on 64 notes rather than as the structurally-inert
baseline the previous doc describes.

---

# The labeled pass (2026-09-02, same day)

**Sample:** 30 notes on 21 faces, seeded, restricted to pools ≤250 so every
face could be read in full (`slicer-labels-sample.mjs`). **Labels:**
`results/slicer-labels.json` — every face read whole, never a slicer's
shortlist. **Model calls so far: still 0.**

## The population is not what the class definition says it is

| label | notes |
|---|---|
| stated (source asserts it, in other words) | **4** |
| stated-prospective / stated-partial | 2 |
| not-stated (a real page that does not say it) | 7 |
| **wrong-document** (index, landing, stub, metadata page) | **17** |

Seventeen of thirty faces are not the cited document at all: the Apollo
Lunar Surface Journal *landing page* where a journal page was cited (10),
NSSDCA "temporarily offline for maintenance" (2), NTRS metadata with "No
Preview Available" where a PDF was cited (2), a missions index, a photo
page, a videos page. Fingerprinting all 162 mechanically: **47 notes on 15
faces are definitively wrong-document**, and 19 of the 52 faces carry the
identical 156-sentence nasa.gov navigation chrome, so for 80 notes most of
the candidate pool is a menu.

The class was described as "the cited source is readable and genuinely
states it, and says it in other words". On this sample roughly one note in
five is that. The rest is a fetch-route failure of the same family run 3
found for archive copies — not fixed for nasa.gov — and it was invisible
because `partial` was assigned by token overlap, and a nav menu that says
"Lunar Surface Technology" overlaps "descent to the lunar surface".

One extraction fault surfaced in passing: note 104 reads "such site —was→
found"; the article says "no such site was found". The negation was dropped.

## Coverage@8 on the six notes the source does state

| note | status | stating | random | containment | activation |
|---|---|---|---|---|---|
| 42 | stated | HIT | miss | HIT | silent |
| 45 | stated | HIT | miss | HIT | silent |
| 54 | stated | miss | miss | HIT | silent |
| 149 | stated | miss | miss | HIT | silent |
| 3 | prospective | HIT | miss | HIT | HIT |
| 136 | partial | empty | miss | HIT | HIT |
| | **total** | **3/6** | **0/6** | **6/6** | **2/6** |

Six is a small number and is reported as one. But it is not ambiguous:
wherever the source states the proposition, the plain containment ranking
already hands the witness a sentence that states it. There is nothing for a
better slicer to add on this sample. If the witness does not land these,
that is a reading problem, not a slicing problem — the finding the handoff
named as the parity outcome, reached here without spending the parity run.

## Declared budget — written before the first call

**Question:** given that a stating sentence IS among the eight, does the
witness point at it, and does it refuse the same eight under a rotated end2?

**Arms and why each can move the standing:**
- `containment` — coverage 6/6. The only arm whose eight can contain the
  answer on every labeled note; the only arm a landing can be attributed to.
- `random` — coverage 0/6. The confound control. A landing here is a
  landing on topic, and convicts the witness rather than crediting a slicer.
- `stating` (3/6, a subset of containment's hits), `activation` (2/6, and
  its control is inert — above), `embedding` (nothing left to earn where
  containment already saturates coverage; typed absence under L5): **not run.**

**Notes:** the six labeled stated notes only. **Sides:** real + rotated
control. **Calls:** 2 arms × 2 sides × 6 notes × ≤2 calls = **≤48**, about
two minutes on this box. Checkpoint file `results/slicer-licensing-labeled.json`.

## First spend: 33 calls on the six labeled notes (checkpoint `slicer-licensing-labeled.json`)

| slicer | offered | real states | control states | verdict |
|---|---|---|---|---|
| `containment` | 6 | **1** | 0 | separates from control |
| `random` | 6 | 1 | 1 | REFUSED by its own control |

The one containment landing is note 149 and it is the labeled sentence
exactly: *"the five engines were found using advanced sonar scanning some
14,000ft below the Atlantic Ocean's surface"* for *"found on the Atlantic
seabed using advanced sonar scanning"*, at `bbc.co.uk#130-276`. The witness
crossed a paraphrase, once, when handed the right eight. On the other five
it had the stating sentence in front of it and returned `indiscriminate` (2)
or `no-testimony` (3). Random landed a headline on note 3 and its control
landed the real prospective sentence for a rotated claim — II.23 convicted
it in the same run.

## Extension: 34 more notes labeled, 12 stated in all

The three faces the seeded sample excluded (pool >250) were read whole. The
archive-route face — 15 notes — is the *wrong chapter* of SP-4223 (Glynn
Lunney's oral history); none of its 15 propositions are on it. The two big
nasa.gov faces are real articles and yield 5 stated + 1 partial. Over 64
labeled notes: **12 stated (any grade), 32 wrong-document, 20 not-stated.**

**Declared extension budget:** the six new stated notes, `containment` +
`random`, both sides, ≤48 calls, separate checkpoint
`slicer-licensing-labeled-2.json` so the first 33 are not re-spent. Same
justification as above; no arm added.

## The measurement, taken: 60 calls on 12 labeled notes

Both checkpoints together (`slicer-licensing-labeled.json`, `-2.json`):

| slicer | coverage@8 (label in the eight) | offered | real states | control states | wrong landings |
|---|---|---|---|---|---|
| `containment` | **11/12** | 12 | **4** | **0** | 0 |
| `random` | 0/12 | 12 | 1 | 1 | 1 (a headline; convicted by its own control) |

Every containment landing is a labeled sentence, at a byte address in the
source: 149 (`bbc.co.uk#130-276`), 12 (`nasa.gov#19017-19203`), 113
(`nasa.gov#14533-14686`), 61 (`nasa.gov#9468-9610`). No landing was wrong.
No landing was on a rotated claim. One landing (61) signed a sentence that
states *less* than the claim — "had launched recovery helicopters" for
"launched four Sea King helicopters and three Grumman E-1 Tracers" — which
the label already grades `stated-partial`; the witness does not distinguish
a partial statement from a full one, and the byte span is what lets a
reader see that it didn't.

On the seven notes where the stating sentence was among the eight and the
witness did not land: `no-testimony` 5, `indiscriminate` 2. That is the
wall, and it is now a measured number rather than a suspicion: **given the
answer in front of it, gemma2:2b points at it 4 times in 11, and never
points at the wrong thing.**

## Answers to the handoff's two questions

**Does a better choice of where to look let the witness cross paraphrase?**
Where to look is not the wall. Plain containment already covers 11 of 12,
and it did so at zero model calls. There is no slicer to add. The witness
crosses paraphrase — "seabed" for "below the surface", "winched" for
"retrieved using a Billy Pugh net" — on roughly a third of the notes where
it can, and refuses the rest. Paraphrase is a reading problem, which is the
outcome the handoff named as the parity outcome, reached without the
parity run.

**Has any learned component earned a slot by P85's five conditions?**
- The **embedder**: no. L1 requires the mechanical organ at parity with its
  control. Containment is not at parity — it separates 4 to 0 and carries
  11/12 coverage — so there is nothing on the slicing side for a learned
  ranker to earn. Not run; typed absence under L5, not a no-lift arm.
- The **reading witness** (the existing gemma2:2b select protocol): it
  POINTS and never writes (L4 — every landing is source bytes); it beats
  random 4 to 1 (L2); it beats its rotated control 4 to 0 (L3); its absences
  are typed (L5). It holds its slot at 4/11 recall and 0 false positives on
  this class. That is the component already in the tree, not a new one.

## What the population actually is, and what to do about it

Of 64 labeled notes, **32 are wrong-document**: the fetched face is not the
cited document. ALSJ landing page for a journal page (10), the Lunney
chapter of SP-4223 for a different chapter (15), NTRS metadata for a PDF
(2), NSSDCA offline (2), indexes and photo pages (3). Twenty more are real
pages that do not state the proposition. Twelve state it. The "162
object-missing partials where the source says it in other words" is, by
this sample, about 30 notes — and the rest is the archive-route failure
run 3 found, not fixed for nasa.gov and not fixed for multi-chapter
documents.

So the next move is not on the witness at all. It is the fetch route: a
citation to a page inside the ALSJ, a chapter inside SP-4223, or a PDF
behind NTRS must reach *that* document, and a token-overlap `partial`
against a navigation menu must not be admitted as a partial. When the
population is real, the reading wall — 7 refusals in 11 with the answer
present — is where P84's ledger-side next step applies.

## Budget, reconciled

| | calls |
|---|---|
| pricing probes before the coverage idea (a fault, recorded) | 7 |
| post-refactor identity check | 4 |
| measurement, 12 notes, 2 arms, 2 sides | 60 |
| post-repair driver identity check (N=2 random) | 4 |
| **session total** | **75** |
| the cross-product as queued before | 2,592 |

Zero-call passes did the rest: silence, distinctness, control divergence,
face fingerprints, coverage against labels. The labels are the one-time
cost — 64 notes, every face read whole — and they are the reusable part.

## Files
`slicer-coverage.mjs`, `slicer-coverage-score.mjs`, `slicer-labels-sample.mjs`,
`results/slicer-coverage.json`, `results/slicer-labels-sample.json`,
`results/slicer-labels.json`, `results/slicer-licensing-labeled{,-2}.json`.
`ranke-slicers.mjs` gained exports, an `import.meta.main` guard, `ONLY=`,
per-arm `candKeys`, and a license verdict that says when the control saw
the identical candidates.

---

# Making the population real (2026-09-02, later the same day)

**Re-walk:** `OFFLINE=1 WITNESS=0 MAXF=100000 node ranke-backwards.mjs` — the
run-4 cache read again through four new rules, **0 network, 0 model calls,
10 seconds.** Run 4's rows are kept as `results/ranke-backwards-run4.json`.

## Four rules, each measured, none a threshold

**1. A hub is none of the documents it answers for** (`ranke.js
redirectHubs`). From the face index alone: a final address that more than
one *distinct* cited path resolved to. Seventeen ALSJ transcripts answered
from `nasa.gov/history/alsj-and-afj`, six NSSDCA pages from
`nasa.gov/nssdc`, two Smithsonian pages from one program page. Every one
had passed `documentMatches` because the portal's title carries the
journal's name. A face read from a hub is a typed gap `redirect-hub`
carrying the archive address of the cited URL. An archive copy is
normalised to its target — any snapshot, any timestamp, either scheme — so
snapshots of one document are never counted as two citations (this bit
once: three same-sentence hits went `unreadable` before the fix).

**2. On a hub gap, the citation's own archive wrapper is the route** (P84).
The walk used to give up on any gap; run 4 had only reached the archive
through the `wrong-document` branch. Now `redirect-hub` → the wrapper the
footnote carried, else `web.archive.org/web/2/<url>`. Offline, this reads
what run 4 kept: 81 consults now read through the archive copy.

**3. Chrome is what a host says on every page** (`ranke.js stripChrome`).
The leading and trailing lines a face shares verbatim with a *sibling* face
of the same host — a sibling being a different final address; the same page
fetched under `http://` and `https://` is a duplicate, and a face compared
with its own duplicate is all chrome by construction (this bit once too:
90 false `all-chrome` gaps, now 4). The stripped body is written beside the
raw face as `<key>.body.txt` and the row's `facePath` points at it, so the
slicers read what the walk classified. A face with no sibling keeps its
chrome, typed as zero removed.

**4. A ranked link is a guess, not a citation.** Rows now carry
`lead: "citation" | "guess"`. 131 of the original 162 object-missing
partials came through a link the page merely contained, chosen by word
overlap, never through the note's own footnote.

**Also landed, untestable here:** `application/pdf` faces go through
`pdftotext`; the NTRS download API answered 429 on this box and
web.archive.org resets the connection, so both stay typed gaps. A redirect
that drops the cited path segment tries the archive copy first and, failing
that, keeps the live face with `lostPath: true` for the hub rule to convict
later.

## Before and after, zero calls both sides

| | run 4 | now |
|---|---|---|
| same-sentence (real / control) | 18 / 10 | **18 / 14** — nothing lost |
| object-missing partials | 162 | **127** — 30 citations, 97 guesses |
| faces by fingerprint: wrong-document | 15 faces, 47 notes | **1 face, 3 notes** (a missions index only one citation hit; the hub rule needs two) |
| faces carrying nasa.gov nav chrome | 19 faces, 80 notes | **1 face, 3 notes** |
| median candidate pool per face | 191 sentences | **74** |
| `redirect-hub` consults | — | 287, each with its archive address |
| labeled-stated notes still in class | 12 | **12 of 12** |
| coverage@8, containment / random | 11/12 / 0/12 | **11/12 / 2/12** |

Random's coverage rose from 0 to 2 because the haystack is a third the
size — the honest effect of removing the menu, and the reason the random
arm exists.

## What the fixture now says the class is

Of 127 object-missing partials, 30 are footnote-bound. The labeled sample
(64 notes, read whole) found 12 stated, of which 6 were citations and 6
were guesses that happened to be right. So the paraphrase population — the
cited source, readable, saying it in other words — is on the order of
thirty notes on this page, not 162, and the honest measurement of the
reading wall is the one already taken: 4 landings in 11 with 0 wrong.

## Not done

Live archive fetches (network blocked here); the NTRS PDF (429); the
missions-index hub that only one citation reached. Each is a typed gap with
its route recorded, and a box that can reach the archive will fill them
by re-running the same command without `OFFLINE=1`.
