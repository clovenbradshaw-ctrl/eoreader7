# "Feed the cast into the extractor" — measured, and the lever as named does not exist

`node native/eval/the-fold/cast-headroom.mjs` — two real Wikipedia pages, zero
model calls.

**Generality: universal.** A negative result about a proposed intervention,
replayed on two pages, with the inflating bug in the first measurement found
and fixed before the number was reported.

## What was checked

Three documents in this project — `WHAT-IS-BEING-BORN.md`, `NEXT-PASSES.md`
and `WHERE-WE-ARE.md` — name the same intervention as **"the single
highest-leverage unbuilt wire"**: feed station 3's earned referent index into
station 4's extraction, so ends anchor on beings instead of fragments.

**It is genuinely unbuilt**, and not ambiguously. `extractRelations` accepts
seventeen options — `verbs`, `functionWords`, `negationWords`,
`phrasalPredicates`, `auxiliaryVerbs`, `nounPhraseSubjects`, `subjectWalls`,
`verbWall`, `adpositions`, `subjectPronouns`, `clauseOpeners`, the three
determiner classes, `npCoordinators`, `objectBoundary`, `limit` — and every
one is a closed word class or a boolean. There is no referent index among
them, and none of the four call sites in `hypergraph.js` passes one. The
extractor decides where a subject span starts and stops from word classes and
punctuation alone.

`relations.js` also carries heavily pinned boundary behaviour — its own header
records an attempted widening that took edge count on 400 Dracula passages
from 1644 to 2647, because a shorter match lets the scan resume inside the
truncated adjunct. So the headroom was measured before the organ was touched.

## The partition, and the bug in its first version

For every extracted edge, against the document's own cast:

- **anchored** — the subject span IS a known referent surface. Nothing to fix.
- **trimmable** — the span CONTAINS a known surface plus extra words. The only
  bucket this lever can reach.
- **castless** — no known surface in the span at all. Beyond this lever.

The first run reported **47.2%** trimmable — on matches like cast surface
`art` inside "a quarter of a million soldiers" and `russian` inside "Prussian
Baltic". Substring matching ignoring word boundaries: the same bug this repo
has already caught twice (P22's `synthesize` matching `zone` inside `zone-99`).
Fixed to word-boundary matching before any number was reported.

| | Borodino | Austerlitz |
|---|---|---|
| edges | 792 | 679 |
| cast surfaces | 180 | 205 |
| anchored | 136 (17.2%) | 162 (23.9%) |
| trimmable | 347 (43.8%) | 288 (42.4%) |
| castless | 309 (39.0%) | 229 (33.7%) |

## Reading the trims, not counting them — and the lever dissolves

Splitting `trimmable` by where the cast surface sits: **trailing** (the words
before it leaked in) 31.8% / 32.8%; **interior** 6.2% / 5.7%; **leading**
5.8% / 3.8%. Only trailing could be a safe cut.

Then reading the trailing bucket. It has three kinds in it, and only one is a
repair:

**Genuine repairs — a leaked verb or leaked furniture before the being:**

```
replace Barclay                       -> barclay
trap Napoleon                         -> napoleon
Aftermath Territorial changes French  -> french     (infobox labels)
1812 battle of the French             -> the french (infobox caption)
```

**Determiner stripping — the trim is the span minus "the", and buys nothing:**

```
the Russian      -> russian        The Austrians -> austrians
The Grande Armée -> grande armee   the Allies    -> allies
```

**Actively harmful — the longer span was the better referent, and the cast has
only a fragment of it:**

```
The Battle of Austerlitz        -> austerlitz     (loses "The Battle of")
The main results of the battle  -> the battle     (a different subject entirely)
The military victory of Napoleon-> napoleon       (a different subject entirely)
an imperial Russian             -> russian        (loses "imperial")
Advance Guard of General        -> general
```

**So the 43.8% is not headroom.** It is how often a cast fragment happens to
appear inside a subject span — which is high precisely because the cast is
full of one-word adjectival surfaces (`french`, `russian`, `austrian`,
`world`, `alexander`). Trimming subjects to cast surfaces would, on this
material, mostly strip determiners and sometimes destroy a correct longer noun
phrase.

**The intervention as named does not exist.** The claim that this is the
single highest-leverage unbuilt wire is not supported by measurement, and the
three documents carrying it should be amended rather than left standing.

## A second hypothesis, also refuted

The trailing sample is full of noun-shaped labels — `--generals→`, `--army→`,
`--forces→` — which suggests the subject is truncated because the extractor
took a head noun as the connector. That predicts subject debris and non-verb
labels co-occur. Measured, per edge, against the POS prior:

| | verb-dominant | never-a-verb | verb-minority | unknown |
|---|---|---|---|---|
| Borodino, subject IS a known being | 42% | 38% | 14% | 7% |
| Borodino, subject is not | 46% | 26% | 15% | 12% |
| Austerlitz, subject IS a known being | 49% | 30% | 16% | 5% |
| Austerlitz, subject is not | 48% | 28% | 17% | 7% |

Essentially identical either way. **Subject debris and label misclassification
are independent problems**, and fixing one will not move the other.

## One observation this raises, flagged as an observation

On this driver's own reading of the POS prior, **26–38% of all edges carry a
label with zero VERB or AUX mass in the treebank** — including 38% of the
edges whose subject resolves cleanly. The vocabulary gate exists to remove
exactly those. Whether the gate disagrees with this driver's reading, or is
running and not catching them, is not established here: this computes its own
verdict from `posPrior.forms` and the gate may use a different field or
threshold. Named as a thing to check, not as a finding.

## Disclosed

- Two pages, one site, one language.
- `discoverReferents` is run here with no options, which is how
  `bridge-audit.mjs` runs it and how the reader's own cast is built. A
  differently-parameterised cast would give different fragments and a
  different trimmable share.
- The three trim categories above were separated by reading the sample, not by
  a mechanical rule. The counts per category are therefore not reported —
  only the position split, which is mechanical.
- No claim is made that the `anchored` edges are TRUE. This measures what a
  proposed intervention could reach.

## What this saves

A change to a core organ with pinned boundary behaviour, made on the strength
of a number that three documents assert and none had measured.
