# MINE-1 with UniMorph + local disambiguation — "what about both?", tested

Run 2026-08-19. `node eval/mine-1-unimorph-disambiguated.mjs` reproduces
every number below. This answers the direct follow-up to
`mine-1-unimorph-RESULTS.md`'s disclosed quality cost (roughly half of
spot-checked `bound` triples had a genuine subject/verb boundary error,
traced to English's noun-verb conversion: many UniMorph-tagged "verbs"
— feed, play, serve, earth, understanding — are just as often nouns).
The question: does adding the material's own distributional evidence on
top of the received prior fix that, the way combining priors with
kind-induction seemed promising in principle?

**Answer: no. It trades recall for a marginal, not clearly real, precision
gain, and it introduces two new contradiction artifacts that never
appeared in any of this session's three prior runs.**

## The mechanism tried

`eval/mine-1-unimorph-disambiguated.mjs` (new; `hypergraph.js` itself is
UNCHANGED — `verbForms` was already just a Set the caller builds, so
building a smarter one per essay is the eval script's job, not the tier's).
UniMorph tags 25,031 English words as BOTH noun and verb
(`eval/fixtures/unimorph-eng-ambiguous-nv.json`, extracted the same way the
verb-forms fixture was). For an unambiguous UniMorph verb (never also
tagged N), admit it exactly as before. For an AMBIGUOUS one, ask the
essay's own local distribution: count how often the word is immediately
preceded by a determiner (`DEFINITE_DETERMINERS`/`INDEFINITE_DETERMINERS`,
received closed classes from `priors.js`, same giver as every other use
this session) versus not. Admit only if non-determiner-preceded occurrences
outnumber determiner-preceded ones in that essay — "the earth" votes noun,
a bare "roamed" votes verb. Computed PER ESSAY, not globally, since the
same word can lean either way in different material.

## The three numbers, UniMorph alone vs. UniMorph + disambiguation

| | UniMorph alone | + local disambiguation |
|---|---:|---:|
| headline (bound / all 1,575 facts) | 33.7% | 30.7% |
| headline (bound / examined) | 38.3% | **39.8%** |
| no_claims_extracted | 189 (12.0%) | **362 (23.0%)** |
| bound (absolute) | 531 | 483 |
| contradicted | 0 | **2 (0.2%)** |

The examined-denominator headline moves up by 1.5 points — genuinely
smaller than what a real disambiguation win should look like if it were
cleanly separating true boundary errors from correct triples, since it
comes packaged with losing 173 more facts to `no_claims_extracted` and
48 fewer `bound` facts outright. The filter is not surgically removing
bad triples and keeping good ones; it is refusing a large share of
AMBIGUOUS words altogether (an essay where the local vote goes the wrong
way on a word that actually was a verb there loses that word from the
vocabulary entirely, taking every relation anchored on it with it) —
recall drops nearly twice as fast as precision improves.

## The two new contradictions, traced by hand — not semantic, both parsing artifacts

Neither is a real disagreement between two claims about the world. Both
are the negation-scope / idiomatic-construct failure mode this session's
`relations.js`-adjacent work has repeatedly named as a real, disclosed gap
in the underlying clause extractor, now newly REACHABLE because
disambiguation happened to admit a function-like word into the vocabulary
as a "verb" in the specific essay where it broke:

```
Why Laughter is Contagious
FACT: Contagious laughter is not only enjoyable but also contagious.
  material's own edge:  "only enjoyable" —but→ "also contagious"  (+)
  answer's claim:       "only enjoyable" —but→ "also contagious"  (−)
```
"but" survived the local vote (it is UniMorph-ambiguous — "but" as a verb
is archaic/dialectal, essentially never the right reading here) and got
read as the verb of a "not only X but also Y" correlative construction —
the clause extractor split the negation onto the wrong side of the
"but" token, so the same underlying sentence produced one polarity when
read as the source and the opposite polarity when read as the answer's
own restatement of it.

```
The Rise of Cryptocurrencies
FACT: Decentralization provides users with more control over their funds
      in cryptocurrencies.
  material's own edge: "users with" —more→ "control over their funds but
                        also enhances security and privacy"  (−)
  answer's claim:       "users with" —more→ "control over their funds in
                        cryptocurrencies"  (+)
```
"more" survived the local vote and got read as the verb of a comparative
construction spanning a clause boundary the extractor doesn't model
("more control... but also enhances..." — two conjoined predicates, only
one of which "more" was ever meant to modify).

In both cases, the word admitted by disambiguation is grammatically real
(UniMorph is not wrong that "but" and "more" have attested verb readings
somewhere in the language) but wrong FOR THIS SENTENCE, and the vote that
was supposed to catch that — determiner-adjacency — has no signal to
offer on a conjunction or an intensifier, because neither is the kind of
noun/verb ambiguity the vote was built to resolve. It is a heuristic aimed
at "feed/play/serve"-style conversion nouns, applied indiscriminately to
every ambiguous UniMorph entry, including closed-class function words
UniMorph happens to also tag as rare verb senses.

## Verdict

The middle path does not win. It is not simply "worse" in a way that
closes the question either — it demonstrates something worth keeping: a
purely LOCAL, cheap distributional signal (determiner adjacency, no
parser, no POS tagger) is not the right tool for disambiguating UniMorph's
noun/verb ambiguity class, because that class mixes two genuinely
different problems (real noun-verb conversion vs. UniMorph's own overly
broad tagging of function words as rare verb senses) that need different
fixes, and a single vote conflates them. UniMorph alone — the plain,
unfiltered version — remains the better result of this session's three
runs: higher recall, zero contradictions, and a disclosed (not hidden)
boundary-quality cost that this experiment shows is NOT cheaply fixable
with the distributional signal tried here.

**Not attempted, and worth naming as the honest next step rather than
implying this experiment closes the door on combining the two:** a real
POS tagger, or a narrower ambiguity list that excludes UniMorph's
function-word verb senses before the vote ever runs, could plausibly do
better than a blanket determiner-adjacency heuristic. This result rules
out the specific cheap mechanism tried, not the general idea.

## Files

`eval/mine-1-unimorph-disambiguated.mjs` (new), `eval/fixtures/
unimorph-eng-ambiguous-nv.json` (new, 25,031 words), `eval/results/
mine-1-unimorph-disambiguated-run.json` (new, full per-essay breakdown).
`hypergraph.js` untouched — this experiment needed no engine change,
only a smarter caller-built `verbForms` Set.
