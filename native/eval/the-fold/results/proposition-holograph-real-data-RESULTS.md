# The proposition holograph on a real, uncurated source (2026-09-28)

`the-fold/proposition-holograph.js` ("PURE: no fetch, no DOM, no model call")
had never been run against anything but hand-built single-clause corpora
(`product-assay.mjs`'s `CORPUS`: "Amelia Hartley founded the Northgate
Observatory in 1887."). This driver
(`eval/the-fold/proposition-holograph-real-data.mjs`) points it at a real
Wikipedia article instead, to see whether the entail/derive/invent typing
holds up against real syntax — and it does not, cleanly, in one specific and
useful way.

## Setup

- **Source**: the first ~9000 bytes of Wikipedia's ["The
  X-Files"](https://en.wikipedia.org/wiki/The_X-Files) article, fetched live
  via the MediaWiki API on 2026-09-28
  (`fixtures/xfiles-wikipedia-excerpt.txt`). Wikipedia text is **CC BY-SA
  4.0** — this fixture and anything derived from it carry that share-alike
  term; it is not public domain.
- **Real, unmodified code**: `organs/hypergraph.js` (relation extraction,
  mechanical, POS-prior-based), `organs/cast.js` (referent index),
  `organs/run-dmca.js` (`chaseParaphrase` — the paraphrase chase that types
  each proposition), `organs/creativity-table.js` (`artifactCell`), and
  `the-fold/proposition-holograph.js` itself. None of these reach into the
  sibling `the-fold` checkout this repo's CI never checks out (unlike
  `product-assay.mjs::organs()`, which needs `grid.js`/`reader-frame.js`
  from it and so cannot run here at all).
- **Substituted, disclosed**: the "mouth" that writes the five test
  propositions is a Claude session, not a live model call — no Ollama or
  Anthropic backend was reachable from the sandbox this first ran in. The
  propositions are real prose composed after reading the fetched article,
  not copied from it and not fabricated.

## What the mechanical extractor did with real prose

51 "bound" relation claims came out of the excerpt. It handles a clean
predicative sentence correctly — `Fox Mulder —is portrayed by→ David
Duchovny`, `Mulder —is an Oxford-educated→ FBI Special Agent` — but real
Wikipedia prose is not all predicative sentences, and roughly a third of the
51 are noise: parenthetical asides and comma-separated lists read as if they
were subject-verb-object relations (`The Twilight Zone —,→ Night Gallery`,
`David Duchovny —) and→ Dana Scully`, `Cigarette Smoking Man —(→ William
B`). Full list in the driver's own output and the dated JSON it writes to
`results/`.

## Finding 1 — a recall gap: a true, prominent fact never got extracted

The excerpt's first sentence states outright that "The X-Files is an
American science fiction drama television series **created by Chris
Carter**." No ground fact anywhere in the 51 carries "Chris Carter" — the
construction is a passive participle modifying "series," not a finite
verb clause, and the extractor's grammar didn't catch it. Feeding the
proposition *"The X-Files was created by Chris Carter"* through the chase
therefore typed it **Invent**, not Entail — an honest, checkable artifact of
extractor coverage on real syntax, not the holograph mechanism failing at
its own job (it correctly reports what it can trace to *this run's*
extracted facts, and discloses `chase.basis` naming exactly why:
"0 of 1 candidate span(s)... equated").

## Finding 2 — a precision gap: invented commentary typed as Entail

More interesting: *"The Cigarette Smoking Man functions less as a person
than as the series' recurring proof that institutions outlast any single
villain"* — pure editorial interpretation, stated nowhere in the source —
typed **Entail** (`derivation: Reproduce`), not Invent.

Cause, traced directly in `proposition-holograph.js`'s own `entailHits`
logic: entailment requires only that **2+ tokens** from some ground fact's
`{end1, end2}` also appear in the proposition's own tokens. The sentence
names "Cigarette Smoking Man" — three tokens that also make up the *end1* of
the noisy, mis-parsed ground fact `Cigarette Smoking Man —(→ William B`. That
alone clears the `>= 2` bar. The check cannot tell "this sentence restates
what the fact asserts" from "this sentence merely names the same proper
noun a fact happens to mention" — and a mis-parsed ground fact (the real `(`
"relation" above is a parenthetical, not a claim) makes the confusion worse,
since there is no real assertion here to have been reproduced at all.

This is not a defect introduced by this driver — it is the real,
unmodified `captureProposition` logic, exercised on real enough prose to
expose it. On the hand-built `CORPUS` fixture every other eval in this
directory uses, ground facts are clean and few, so two shared proper-noun
tokens are a much stronger signal; at real-document scale, with real
extractor noise, they are not.

## What this shows and does not show

**Shown.** The holograph's bookkeeping (append-only atom history,
frame-bearing identity, recombination filtered and ordered by typing) ran
correctly end to end on real data with no code changes. The two failure
modes above are real and independently traceable to named, specific
mechanisms — not a vague "it's not perfect."

**Not shown.** Whether typing precision holds up at document scale (this
excerpt produced 51 ground facts and tested 5 propositions by hand); whether
Finding 2 recurs when ground facts come from clean, correctly-parsed claims
rather than mis-parsed parentheticals; whether the "chase" path (the
non-verbatim derive/invent split via `run-dmca.js`) itself ever fires
correctly here — in every row above `chase.basis` reports 0-of-1 candidate
spans equated, so this run exercised the verbatim `entailHits` path almost
exclusively, not the paraphrase chase the "derive" tier depends on.

## Reproduce

```
node eval/the-fold/proposition-holograph-real-data.mjs
node eval/the-fold/proposition-holograph-real-data.mjs --source <path> [--limit <bytes>]
```

Dated JSON (ground facts, per-proposition typing, the recombined and
projected atoms) lands in `results/`.
