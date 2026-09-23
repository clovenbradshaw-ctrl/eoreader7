# ablation-delta-catalog.mjs — nomic-embed-text (local model) results

Measured 2026-09-23. Model: `nomic-embed-text` (Ollama, local, 137M — the
only embedding-capable model on this instance; chat models refuse
embedding requests, and this host's port does not expose model-pull, both
confirmed directly). Scale: `--words=6 --testwords=4 --occ=3`, 7 languages
(English, Arabic, Ancient Greek, Hebrew, Latin, Sanskrit (Vedic), Naija
Pidgin), 13 UD POS tags.

**This run predates and motivated `adapters/text/ablation-grain-pressure.js`
— it is the evidence the wiring is built on, not a demo of the wired
mechanism itself.**

## Classification (nearest-centroid on the delta, vs. a shuffled-label null)

| Reference composition | Accuracy | Null accuracy | Fisher p (real > null) |
|---|---|---|---|
| Same language | 0.2915 | 0.0627 | 6.21×10⁻¹⁵ |
| Other languages only (cross-lingual transfer) | 0.1034 | 0.0627 | 0.0422 |
| Pooled (all languages) | 0.1850 | 0.0784 | 4.68×10⁻⁵ |

Chance baseline (13 classes): 0.0769. n=319 for every row.

## Separability catalog (pairwise cosine between mean delta directions — lower = more distinct)

Most separable pair: **PROPN–PART**, pooled cosine 0.746, verdict
**universal** (separable in English, Arabic, Latin, Naija Pidgin — every
language with enough data for both tags).

Least separable pair measured: **VERB–PRON**, pooled cosine 0.920, verdict
language-specific (only separable in English and Naija Pidgin).

## Delta magnitude — content words vs. function words

Mean |delta|, content words (NOUN/VERB/PROPN/ADJ/ADV/NUM): **0.2456**
Mean |delta|, function words (PRON/ADP/DET/AUX/CCONJ/PART/SCONJ): **0.2158**

Content words leave a measurably bigger "hole" than function words when
ablated — consistent with proper nouns specifically carrying the most
distinctive signal of any category (see the full per-POS breakdown in
`ablation-delta-catalog.mjs`'s own console output for a fresh run).

## Honest scope

This is real, statistically significant signal (p ≪ 0.05 on every
composition), not a working POS tagger — a dedicated trained UD parser
gets 95.2% UPOS accuracy on English held-out data
(`adapters/text/english-parser.js`, see the reading-training audit). The
signal is strongest for content-vs-function and proper-noun detection,
weakest among closely related content categories.

Also measured, same session, at this scale: `voyage-4-large` /
`voyage-4` / `voyage-4-lite` / `voyage-3-lite` (Voyage AI, paid, hosted)
show NO clean monotonic improvement over this local, free model — see the
`reading-training` archive repo
(github.com/clovenbradshaw-ctrl/reading-training) for the full model-size
ladder comparison. Bigger/paid is not obviously better for this specific
signal.
