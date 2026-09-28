# Occupancy through the pipeline, v5 — registered run, 2026-09-28

Driver at f2e8028; Y1–Y3 pre-registered in the header before the run;
`NATIVE_MAX_CHARS=150000`. Raw: `occupancy-host-eval-v5.json`. New since
v4: every established candidate carries COMPANY — `prepShare` (share of the
referent's occurrences whose previous token the received POS prior settles
as ADP) and `verbShare` (share whose next token it settles as VERB/AUX),
computed by the supplier over the page; `BEING_KIND`, a second declared
for-whom, admits a candidate only when `verbShare > prepShare`.

| | prediction | result |
|---|---|---|
| Y1 | under BEING_KIND, month/demonym occupants = 0; rows lost listed | **held** — 0 (default arm: 1; v4's loose arm: 9). Lost, all seven: `Russian → Kutuzovo`, `Whig → Republicans`, `Manuel → Dorados` (Juan Manuel Lillo, the host's referent is "Manuel"), `FA Cup → England`, `UEFA Super Cup → first-ever manager…`, `Arsenal → English`, `George → President` (George W. Bush). Every one is a misread; no career was lost |
| Y2 | ≥ 25 of 35 default rows survive; Murat, Kutuzov, Merkel ×8, Ratzinger, Summers retained | **held** — 28 of 35, all named careers retained |
| Y3 | reported: topic vs month company | topic `verbShare` 0.40–0.72 on 12 of 13 pages (Murat .55, Kutuzov .48, Hamlin .40, Johnson .46, Merkel .57, Roberts .55, Rehnquist .55, Cook .72, Nadella .65, Ferguson .59, Guardiola .56, Summers .62); months ≈ 0 everywhere (largest .25 at n = 4). `prepShare` is the noisy axis (months 0–1, driven by "25 March 1767" where the previous token is a number). Benedict's topic unmeasured: the title's last token is "XVI" |
| H1 / H2 / V5 | | held — 35 default standings on 11 pages; 0 closed-class occupants on either arm |

## What this settles

The bucket under the pronoun floor was surface admission, and it did not
need a veto. The cast may keep admitting `November` and `Ukraine` as
beings — the extractor's evidence is a name's evidence — because the
collapse now asks the question the extractor cannot: is this candidate the
kind of thing that does things? Company answers it from the material, with
one received class (the POS prior) and no list. The record keeps the month
as a candidate with its company; a for-whom that does not care about
being-kind still sees it.

`verbShare` alone is the separating measure; the `>` against `prepShare` is
a comparison, not a threshold, and it held. A stricter reader could ask
`verbShare` against the page's own population (kind-standing's null) — not
done; the comparison was pre-registered and it was enough.

## Recommendation, not enacted here

`BEING_KIND` is now exported from the reader beside `NEAREST_ESTABLISHED`
(pinned: a preposition's companion refused by name, a subject kept,
unmeasured company contested). It is NOT made the default: the default
must hold for a supplier that measures no company, and "unmeasured" is
contested, never refused. A consumer that measures company should declare
the being-kind for-whom — the eval now reports both arms.

## Still open, named

- `Russian towns have been named Kutuzovo` was refused for the right reason
  by the wrong route (the demonym's company). The true subject, "towns", is
  a lowercase noun between the mention and the transition; reading that
  needs the POS prior inside the reader's gap check — a `noun_between`
  feature, not yet carried.
- Benedict's topic: a title whose last token is a numeral. The topic
  referent should come from the page's own first sentence, not the title's
  last word — the eval's convenience, not the reader's.
- The native arm remains over budget on every novel; the per-reprojection
  rescan is the reader's next cut.
