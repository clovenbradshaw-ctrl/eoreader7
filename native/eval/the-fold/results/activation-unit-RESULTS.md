# The reading unit was the wrong suspect: the witness's own ARM is the ceiling

Driver: `eval/the-fold/activation-unit-probe.mjs` (re-runnable; `MODE`, `BOOK`,
`LIMIT`). No model runs. Spec entry: S52.

`witness-paraphrase-corpus-RESULTS.md` measured the same protocol at 3/9 on a
9KB excerpt and 0/9 on the whole book, traced ONE item by hand, found
retrieval correct and the candidate correct, and diagnosed the reading UNIT —
"the fact sits inside a subordinate clause of a longer reported-speech
sentence". It named a wider reading unit as the next move and did not take it.
That move was about to be taken. This measurement says do not take it.

## How it asks

The REAL production path runs — real `chunkSource`, real `retrieve`, real
`witnessSentences` over the real joined source — with the model replaced by a
stand-in in two arms:

- **always-no** — answers no to everything, so nothing it says can move a
  verdict. What it captures is what the shipped path SHOWED it.
- **perfect reader** — answers yes, pointing at the most-entailing candidate,
  for the claim the battery declared entailed; no for anything else it is
  asked, which is the sibling-swapped claim the arm builds. It picks by the
  same both-ends-in-full rule used everywhere here, never by knowing which
  item it is, so a candidate list carrying no such sentence gets an honest no
  and the oracle cannot manufacture a landing.

Whatever a perfect reader still cannot land failed on the PROTOCOL — not on
the model, and not on the material. That is a bucket the shown-material
partition cannot see, and it is where the answer turned out to be.

The material is taken from the ORGANS' OWN ARGUMENTS (the slice handed to
`ask`, the candidate list handed to `buildSelectMessages`), never parsed back
out of a prompt.

## Arm 1 — corpus (War and Peace, 11,132 chunks, retrieval limit 3)

```
id  shape          reached   cands  adequate  arm-filler          end2-in-claim  PERFECT READER
1   role-reversed  generate  1      no        "Anatole Kurágin"   literal        refused — no-testimony
2   near-verbatim  select    2      yes       "Emperor's"         literal        states
4   near-verbatim  select    1      yes       "Borís"             literal        states
6   rearranged     select    1      yes       "French"            literal        states
8   near-verbatim  select    1      yes       "Russians"          PARAPHRASED    unarmed-select
10  passive        select    1      yes       — no competitor     literal        unarmed-select
12  near-verbatim  select    1      yes       — no competitor     literal        unarmed-select
14  rearranged     select    1      yes       — no competitor     literal        unarmed-select
16  role-reversed  select    1      yes       "Kutúzov"           literal        states

entailed items                                    9
died on a gate — model NEVER ASKED                0
material carried BOTH ends in full                8
material carried neither / one end only           1   (item 1: a retrieval miss)

with a PERFECT reader, same material, same protocol:
  landed `states`                                 4 of 9
  refused ANYWAY — the protocol, not the model    5
```

**8 of 9 reached the model already holding a single sentence that carries both
ends of the claim in full.** Item 10's candidate is *"And Prince Andrew, with
others fatally wounded, was left to the care of the inhabitants of the
district."* against the claim *"Prince Andrew was left in the care of the local
people after being fatally wounded."* Item 12's is *"Countess Hélène Bezúkhova
had suddenly died of that terrible malady…"* against *"Hélène Bezúkhova
suddenly died."* Nothing about a wider reading unit can improve material that
is already adequate at the sentence the protocol chose.

## The ceiling, and the two walls that set it

A perfect reader lands **4 of 9**. Five items cannot be landed by any model:

- **item 1 — a retrieval miss.** The generate fallback got a slice from the
  wrong chapter entirely (Weyrother's Austerlitz council of war, not the 1812
  committee). It refuses honestly; the material never arrived.
- **items 10, 12, 14 — no competing filler.** The arm swaps end2 for a
  competitor harvested from the candidate list's own capitalized surfaces
  (`corroboration.js::competingFiller`). With ONE candidate sentence, its only
  capitalized surfaces are usually the ends themselves, so the pool is empty,
  the arm cannot be built, and an unarmed yes is refused — however correct.
- **item 8 — end2 paraphrased in the claim.** The swap is a literal string
  replacement of end2 in the claim sentence. The claim says *"the people who
  had abandoned it"* where end2 is *"inhabitants"*, so the replacement is a
  no-op, the arm equals the claim, and `unarmed-select` fires again for an
  entirely different reason.

Those two walls are measured apart because they need different fixes. Both
were found by asking the arm's own organ what it would have found, not by
reasoning about it: item 8 HAS a filler ("Russians") and still refuses, which
is what forced the second wall into view.

## Arm 2 — excerpt (borodino-excerpt.txt, 9KB, one passage, no retrieval)

```
entailed items                                    9
reached the armed SELECT protocol                 9
material carried BOTH ends in full                8
with a PERFECT reader: landed `states`            8 of 9
  refused ANYWAY                                  1   (item 13, no competitor)
arm buildable                                     8 of 9
```

**The ceiling halves with scale: 8/9 on the excerpt, 4/9 on the corpus.** The
excerpt hands the whole 9KB as one source, so `statingCandidates` returns 1–3
candidates rich in capitalized surfaces and the arms build. The corpus
retrieves three narrow passages, most items get ONE candidate, and that
candidate's only names are the claim's own ends.

So the excerpt/corpus gap is substantially a PROTOCOL ceiling that narrows as
retrieval narrows — not evidence about reading units at all.

**And the comparison was never as clean as it read.** The two drivers use
DIFFERENT batteries over DIFFERENT material; "3/9 vs 0/9" compares two item
sets, not one item set at two scales. Each arm's own ceiling is the only thing
comparable between them. Against those ceilings: the real gemma2:2b scored
3 of 8 reachable on the excerpt and 0 of 4 reachable on the corpus.

## What this does and does not license

It does NOT say the model is fine: 0 of 4 reachable is a real reading failure
on material that plainly states the claim, and closing the protocol ceiling
would expose more of it, not less.

It does NOT say the arm is wrong. The arm exists because unarmed select
measured p(states|fabricated) = 1/8 live (P32) — a pointer that says yes is not
yet a vote. Refusing an unarmed yes is the correct posture. What is measured
here is that its AMMUNITION runs out exactly where retrieval is narrowest, so
the refusal rate carries a scale artifact nobody declared.

It does not establish that any collapsed item is true, only that the material
shown could support a yes.

## Where the activation lever actually is

"Read with the reader's own activation" was the direction this probe was taken
under, and the measurement moves it one layer: not the reading UNIT (already
adequate 8/9), but the ARM'S SIBLING POOL. A competing filler is currently
harvested by capitalization from one sentence. The reader's own referent state
already knows who else was live and could have filled that slot —
`makeReferentIndex` and the surfaces the reader resolved — which is a pool that
does not shrink when retrieval narrows. Same for item 8's wall: a swap through
the referent/lemma the end resolves to, rather than a literal string replace,
survives a claim that paraphrases its own end.

Both are named, not built. Neither may relax the arm itself: the swap, the
indiscriminate check and the typed refusals decide what a yes is worth, and a
richer pool only changes what the picker is asked to confuse the end WITH.

## Four probe bugs, kept because each produced a confident wrong number

1. **Reimplementing the path instead of running it.** The first version rebuilt
   candidate discovery by hand and modelled neither `witnessSlice`'s hard gate
   nor the passage JOIN. It reported "0 of 9 adequate"; the real path reports 8.
2. **Reading a prompt to find out what was shown.** Candidates were regexed out
   of the message body; on the generate path (no numbered list) it fell back to
   the whole message, which contains the claim sentence, so every item scored
   "carries both ends" for free.
3. **Wrong field name.** `statingCandidates` returns `shown`, not `text` — every
   candidate read as the empty string and the partition inverted.
4. **Wrong schema.** The generate protocol's own schema is
   `{answer:"yes"|"no", because}`; a stand-in answering `{states}` read
   `unreadable`, which looks exactly like a protocol finding.

Every one of them produced a plausible table. The measurement only became
trustworthy once each arm was read against the organ's own source.

## Reproduction

```
cd native/eval/the-fold
BOOK=/path/to/pg2600.txt node activation-unit-probe.mjs   # arm 1 (corpus)
MODE=excerpt node activation-unit-probe.mjs               # arm 2 (excerpt)
```

Arm 1 is ~2 minutes, nearly all of it chunking the book; arm 2 is instant.

---

# Amendment — the two walls widened, and the ceiling measured again

The section above named two levers and did not build them. Built here, both
DECLARED and both OFF by default, so every existing caller is byte-identical.

- **`fillerPool`** (`competingFiller`, threaded through `witnessNote` /
  `witnessSentences`) — a second source of competitors, searched only when the
  candidates offer none. Callers pass the surfaces their own reader actually
  established (`discoverReferents`' `DEF.admit` events), a pool that does not
  shrink when retrieval narrows. Candidates are still searched FIRST and win:
  a competitor the picker has just read is the strongest thing to confuse an
  end with; a pool surface it has not read is weaker ammunition, not better.
- **`armEitherEnd`** — when the literal swap of end2 is a no-op, swap end1
  instead. Which end a claim states literally is an accident of wording, not a
  fact about whether it can be tested: an arm that swaps end1 asks the picker
  the same question ("is this sentence about THIS one, or that one").

## The ceiling, re-measured — and it becomes scale-invariant

```
                       perfect reader, arm as shipped    both widenings ON
excerpt (9KB, 1 source)              8 of 9                   8 of 9
corpus  (3.3MB, limit 3)             4 of 9                   8 of 9
```

**4/9 → 8/9 on the corpus; unchanged on the excerpt.** That is the shape the
diagnosis predicted: the widening closes a scale artifact and adds nothing
where there was no artifact. The one item still unlandable in each arm is the
same in both — a retrieval miss whose slice genuinely does not state the claim,
which is the honest refusal, not a wall.

The reader-resolved pool has a median size of 6 surfaces on the corpus's three
retrieved passages and 23 on the excerpt — so it is thinnest exactly where it
is needed, and still enough.

## The control, built to fail (II.23)

A widening that raises the ceiling for true claims **and** for false ones has
weakened the protocol, not fixed it. Two adversaries, both with the widenings
on, run over all sixteen battery items rather than the nine entailed ones:

```
FALSE twins landed `states`, arm as shipped            2 of 7
FALSE twins landed `states`, widenings ON              2 of 7
ADDED by the widening (the number that must be 0)      0
indiscriminate picker got through, any item            0 of 16   (must be 0)
```

**Zero added.** The two false landings are the *oracle's* own construction and
pre-date the change: it answers on both-ends-in-full, so a false claim whose
two ends both occur ("Kutúzov"/"commander in chief"; "Moscow"/"French") gets a
yes from it by definition. A real model is what has to catch those, and the
live gemma2:2b run recorded **zero lies** across the FALSE set. Naming which
leaks are the measuring instrument's and which are the protocol's is the whole
reason the shipped and widened columns are reported side by side.

**And the arm still works.** The indiscriminate picker — yes to everything,
pointing at the same index whatever it is asked, which is precisely what the
arm exists to catch — is refused on all sixteen items with the widenings on. A
widened arm that let it through would have made the ceiling number worthless.

## What is still not established

**No model ran.** This measures the CEILING moving — what a flawless reader
could land — which needs no model. Whether a real model then lands more of it
is the separate question this environment cannot ask (no Ollama). The honest
prediction, stated so it can be checked and be wrong: the real run scored 0 of
4 reachable on the corpus, so a ceiling of 8 does not become a score of 8; it
becomes 8 chances at a reading the model was failing 4 of 4 times.

The widenings are **off by default** and no production caller passes either.
Turning them on in the live app is a separate decision on the same terms
`verbForms` and `createLemmatizer` already carry, and P43's distinguishing
test says which way it leans: this WIDENS what can be heard rather than
closing a false binding, so it does not ship on by itself.

## Files

`organs/corroboration.js` (`competingFiller` gains `pool`; `witnessNote` gains
`fillerPool` / `armEitherEnd`), `organs/witness-sentences.js` (threads both),
`organs/corroboration.test.mjs` (+3 cases: each wall with its own control that
the default is untouched, plus the indiscriminate-picker case proving the
widened arm still refuses), `eval/the-fold/activation-unit-probe.mjs` (the
widened arm and both controls). Full native suite: 24 failures before and
after, identical by name — zero regressions.
